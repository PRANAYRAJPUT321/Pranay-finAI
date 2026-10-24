/**
 * Content administration. Every function takes the acting principal and
 * re-checks authorization server-side, then records an audit entry.
 */
import type { ContentStatus, Prisma, Role, Tier } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { ADMIN_ROLES, CONTENT_ROLES, assertRole, type Principal } from "@/server/auth/guards";
import { validatePayload, calcSpecSchema, type QType } from "@/server/assessment/question-schema";
import { verifyAnswerKey } from "@/server/assessment/grading";
import { regradeQuestion } from "@/server/assessment/service";
import { examStructureSchema } from "@/server/catalog/structure";
import { lessonContentSchema } from "@/server/content/lesson-schema";
import { audit } from "./audit";

export class AdminError extends Error {}

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const questionInputSchema = z.object({
  syllabusVersionId: z.string().min(1),
  topicId: z.string().min(1, "Choose a topic"),
  learningOutcomeId: z.string().nullable().optional(),
  formulaId: z.string().nullable().optional(),
  type: z.enum(["MCQ", "MULTI_SELECT", "NUMERIC", "WRITTEN"]),
  difficulty: z.coerce.number().int().min(1).max(3),
  stem: z.string().trim().min(10, "The stem is too short"),
  payload: z.unknown(),
  calcSpec: z.unknown().nullable().optional(),
  explanation: z.string().trim().min(10, "Add a detailed explanation"),
  steps: z.array(z.string().trim().min(1)).default([]),
  conceptTested: z.string().trim().min(2, "Name the concept tested"),
  commonMistake: z.string().trim().nullable().optional(),
  estimatedSeconds: z.coerce.number().int().min(15).max(1800),
  context: z.string().trim().nullable().optional(),
  origin: z.enum(["ORIGINAL", "AI_GENERATED", "LICENSED"]).default("ORIGINAL"),
  sourceId: z.string().nullable().optional(),
  externalKey: z.string().trim().max(80).nullable().optional(),
});

export type QuestionInput = z.input<typeof questionInputSchema>;

function prepareQuestion(raw: QuestionInput) {
  const input = questionInputSchema.parse(raw);
  const payload = validatePayload(input.type as QType, input.payload);
  const calcSpec = input.calcSpec ? calcSpecSchema.parse(input.calcSpec) : null;
  const check = verifyAnswerKey(input.type as QType, payload, calcSpec);
  return { input, payload, calcSpec, check };
}

async function snapshot(questionId: string, version: number, reason: string, actorId: string, data: unknown, tx: Prisma.TransactionClient) {
  await tx.questionVersion.create({ data: { questionId, version, snapshot: json(data), reason, changedById: actorId } });
}

export async function createQuestion(actor: Principal, raw: QuestionInput) {
  assertRole(actor, CONTENT_ROLES);
  const { input, payload, calcSpec, check } = prepareQuestion(raw);
  const topic = await prisma.topic.findFirst({ where: { id: input.topicId, syllabusVersionId: input.syllabusVersionId } });
  if (!topic) throw new AdminError("Topic does not belong to this syllabus");
  return prisma.$transaction(async (tx) => {
    const q = await tx.question.create({
      data: {
        ...input,
        payload: json(payload),
        calcSpec: calcSpec ? json(calcSpec) : undefined,
        externalKey: input.externalKey || null,
        status: "DRAFT",
      },
    });
    await snapshot(q.id, 1, "Created", actor.id, { ...input, payload, calcSpec }, tx);
    await audit(tx, { actorId: actor.id, action: "question.create", entityType: "Question", entityId: q.id, after: { stem: q.stem, keyCheck: check } });
    return { question: q, check };
  });
}

/**
 * Updates a question. Changes to a published question's answer key trigger a
 * re-grade of every recorded response so historical results stay correct.
 */
export async function updateQuestion(actor: Principal, id: string, raw: QuestionInput, reason: string) {
  assertRole(actor, CONTENT_ROLES);
  if (!reason.trim()) throw new AdminError("Give a reason for the change (kept in the version history)");
  const existing = await prisma.question.findUniqueOrThrow({ where: { id } });
  const { input, payload, calcSpec, check } = prepareQuestion(raw);
  if (existing.status === "PUBLISHED" && !check.ok) throw new AdminError(`Cannot save a published question whose answer key fails verification: ${check.message}`);
  const keyChanged = JSON.stringify(existing.payload) !== JSON.stringify(payload) || existing.type !== input.type;
  const updated = await prisma.$transaction(async (tx) => {
    const q = await tx.question.update({
      where: { id },
      data: {
        ...input,
        payload: json(payload),
        calcSpec: calcSpec ? json(calcSpec) : undefined,
        externalKey: input.externalKey || existing.externalKey,
        version: existing.version + 1,
        // Published questions stay live only because the key check above passed.
        status: existing.status,
      },
    });
    await snapshot(id, q.version, reason, actor.id, { ...input, payload, calcSpec }, tx);
    await audit(tx, {
      actorId: actor.id,
      action: keyChanged ? "answerKey.correct" : "question.update",
      entityType: "Question",
      entityId: id,
      before: { version: existing.version, payload: existing.payload },
      after: { version: q.version, payload, keyCheck: check },
      note: reason,
    });
    return q;
  });
  const regrade = keyChanged && existing.status === "PUBLISHED" ? await regradeQuestion(id) : null;
  if (regrade) await audit(prisma, { actorId: actor.id, action: "question.regrade", entityType: "Question", entityId: id, after: regrade });
  return { question: updated, check, regrade };
}

const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ["IN_REVIEW", "ARCHIVED"],
  IN_REVIEW: ["PUBLISHED", "REJECTED", "DRAFT"],
  REJECTED: ["DRAFT", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED", "IN_REVIEW"],
  ARCHIVED: ["DRAFT"],
};

export async function setQuestionStatus(actor: Principal, id: string, status: ContentStatus, note?: string) {
  assertRole(actor, CONTENT_ROLES);
  const q = await prisma.question.findUniqueOrThrow({ where: { id } });
  if (!TRANSITIONS[q.status].includes(status)) throw new AdminError(`Cannot move a question from ${q.status} to ${status}`);
  if (status === "PUBLISHED") {
    validatePayload(q.type as QType, q.payload);
    const check = verifyAnswerKey(q.type as QType, q.payload, q.calcSpec);
    if (!check.ok) throw new AdminError(`Answer key verification failed: ${check.message}`);
  }
  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id },
      data: { status, ...(status === "PUBLISHED" ? { reviewedById: actor.id, reviewedAt: new Date() } : {}) },
    });
    await audit(tx, { actorId: actor.id, action: `question.status.${status.toLowerCase()}`, entityType: "Question", entityId: id, before: { status: q.status }, after: { status }, note });
  });
}

// ---------------------------------------------------------------------------
// Bulk import (CSV or JSON)
// ---------------------------------------------------------------------------

export const IMPORT_COLUMNS = [
  "externalKey", "programSlug", "levelCode", "topicCode", "type", "difficulty", "stem",
  "optionA", "optionB", "optionC", "optionD", "optionE", "correct",
  "rationaleA", "rationaleB", "rationaleC", "rationaleD", "rationaleE",
  "numericAnswer", "tolerance", "unit", "explanation", "steps", "concept", "mistake", "seconds", "context", "origin", "calcFn", "calcArgs", "calcScale",
] as const;

/** RFC 4180-style CSV parser (quoted fields, escaped quotes, newlines in quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export interface ImportRowResult {
  row: number;
  key: string | null;
  ok: boolean;
  errors: string[];
  keyCheck?: string;
}

/** Converts an import row into a validated QuestionInput, or returns errors. */
export async function rowToQuestion(r: Record<string, string>): Promise<{ input?: QuestionInput; errors: string[]; keyCheck?: string }> {
  const errors: string[] = [];
  const topic = await prisma.topic.findFirst({
    where: { code: r.topicCode, syllabus: { status: "CURRENT", level: { code: r.levelCode, program: { slug: r.programSlug } } } },
  });
  if (!topic) errors.push(`Unknown topic ${r.programSlug}/${r.levelCode}/${r.topicCode} (must exist in the current syllabus)`);
  const type = (r.type || "MCQ").toUpperCase();
  if (!["MCQ", "MULTI_SELECT", "NUMERIC"].includes(type)) errors.push("type must be MCQ, MULTI_SELECT or NUMERIC (use the editor for written questions)");
  let payload: unknown = null;
  if (type === "MCQ" || type === "MULTI_SELECT") {
    const letters = ["A", "B", "C", "D", "E"];
    const correct = new Set((r.correct ?? "").toUpperCase().split(/[^A-E]+/).filter(Boolean));
    payload = {
      options: letters
        .filter((l) => r[`option${l}`])
        .map((l) => ({ id: l.toLowerCase(), text: r[`option${l}`], correct: correct.has(l), rationale: r[`rationale${l}`] ?? "" })),
    };
  } else if (type === "NUMERIC") {
    payload = { answer: Number(r.numericAnswer), tolerance: Number(r.tolerance || 0), toleranceType: "absolute", unit: r.unit || undefined, decimals: 2 };
  }
  let calcSpec: unknown = null;
  if (r.calcFn) {
    try {
      calcSpec = { fn: r.calcFn, args: JSON.parse(r.calcArgs || "{}"), scale: r.calcScale ? Number(r.calcScale) : 1 };
    } catch {
      errors.push("calcArgs must be valid JSON");
    }
  }
  if (errors.length) return { errors };
  const input: QuestionInput = {
    syllabusVersionId: topic!.syllabusVersionId,
    topicId: topic!.id,
    type: type as "MCQ",
    difficulty: Number(r.difficulty || 2),
    stem: r.stem,
    payload,
    calcSpec,
    explanation: r.explanation,
    steps: (r.steps ?? "").split("|").map((s) => s.trim()).filter(Boolean),
    conceptTested: r.concept,
    commonMistake: r.mistake || null,
    estimatedSeconds: Number(r.seconds || 90),
    context: r.context || null,
    origin: (["ORIGINAL", "AI_GENERATED", "LICENSED"].includes((r.origin || "").toUpperCase()) ? r.origin.toUpperCase() : "ORIGINAL") as "ORIGINAL",
    externalKey: r.externalKey || null,
  };
  try {
    const { check } = prepareQuestion(input);
    if (!check.ok) return { errors: [`Answer key check failed: ${check.message}`] };
    return { input, errors: [], keyCheck: check.message };
  } catch (e) {
    if (e instanceof z.ZodError) return { errors: e.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`) };
    return { errors: [(e as Error).message] };
  }
}

export function parseImport(text: string, format: "csv" | "json"): Record<string, string>[] {
  if (format === "csv") return parseCsv(text);
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new AdminError("JSON import must be an array of row objects");
  return data.map((r) => Object.fromEntries(Object.entries(r as object).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])));
}

/** Validates all rows; when commit is true and every row is valid, imports them as IN_REVIEW drafts. */
export async function importQuestions(actor: Principal, text: string, format: "csv" | "json", commit: boolean) {
  assertRole(actor, CONTENT_ROLES);
  const rows = parseImport(text, format);
  if (rows.length === 0) throw new AdminError("No rows found");
  if (rows.length > 500) throw new AdminError("Import at most 500 rows at a time");
  const results: ImportRowResult[] = [];
  const prepared: QuestionInput[] = [];
  const keys = new Set<string>();
  for (const [i, r] of rows.entries()) {
    const res = await rowToQuestion(r);
    const key = r.externalKey || null;
    if (key && keys.has(key)) res.errors.push("Duplicate externalKey within this file");
    if (key) {
      keys.add(key);
      if (await prisma.question.findUnique({ where: { externalKey: key } })) res.errors.push("externalKey already exists");
    }
    results.push({ row: i + 2, key, ok: res.errors.length === 0, errors: res.errors, keyCheck: res.keyCheck });
    if (res.input && res.errors.length === 0) prepared.push(res.input);
  }
  const allOk = results.every((r) => r.ok);
  let imported = 0;
  if (commit && allOk) {
    for (const input of prepared) {
      const { question } = await createQuestion(actor, input);
      await prisma.question.update({ where: { id: question.id }, data: { status: "IN_REVIEW" } });
      imported++;
    }
    await audit(prisma, { actorId: actor.id, action: "question.import", entityType: "Question", entityId: "bulk", after: { count: imported, format } });
  }
  return { results, allOk, imported };
}

// ---------------------------------------------------------------------------
// Syllabus and catalog
// ---------------------------------------------------------------------------

export async function verifySyllabus(actor: Principal, syllabusId: string, sourceUrl: string, note: string) {
  assertRole(actor, CONTENT_ROLES);
  const url = z.string().url("Enter the official source URL").parse(sourceUrl);
  const before = await prisma.syllabusVersion.findUniqueOrThrow({ where: { id: syllabusId } });
  await prisma.$transaction(async (tx) => {
    await tx.syllabusVersion.update({ where: { id: syllabusId }, data: { verificationStatus: "VERIFIED", verifiedAt: new Date(), sourceUrl: url } });
    await audit(tx, { actorId: actor.id, action: "syllabus.verify", entityType: "SyllabusVersion", entityId: syllabusId, before: { status: before.verificationStatus, sourceUrl: before.sourceUrl }, after: { status: "VERIFIED", sourceUrl: url }, note });
  });
}

export async function unverifySyllabus(actor: Principal, syllabusId: string, note: string) {
  assertRole(actor, CONTENT_ROLES);
  await prisma.$transaction(async (tx) => {
    await tx.syllabusVersion.update({ where: { id: syllabusId }, data: { verificationStatus: "UNVERIFIED", verifiedAt: null } });
    await audit(tx, { actorId: actor.id, action: "syllabus.unverify", entityType: "SyllabusVersion", entityId: syllabusId, note });
  });
}

export async function updateStructure(actor: Principal, syllabusId: string, structureJson: string, recommendedHours: number, notes: string) {
  assertRole(actor, CONTENT_ROLES);
  let parsed: unknown;
  try {
    parsed = JSON.parse(structureJson);
  } catch {
    throw new AdminError("Structure must be valid JSON");
  }
  const structure = examStructureSchema.parse(parsed);
  const before = await prisma.syllabusVersion.findUniqueOrThrow({ where: { id: syllabusId } });
  await prisma.$transaction(async (tx) => {
    // Changing exam rules invalidates any previous verification.
    await tx.syllabusVersion.update({ where: { id: syllabusId }, data: { structure: json(structure), recommendedHours, notes, verificationStatus: "UNVERIFIED", verifiedAt: null } });
    await audit(tx, { actorId: actor.id, action: "syllabus.structure.update", entityType: "SyllabusVersion", entityId: syllabusId, before: before.structure, after: structure });
  });
}

export async function updateTopic(actor: Principal, topicId: string, data: { name: string; weightMin: number | null; weightMax: number | null; difficulty: number }) {
  assertRole(actor, CONTENT_ROLES);
  const schema = z.object({ name: z.string().trim().min(1), weightMin: z.number().min(0).max(100).nullable(), weightMax: z.number().min(0).max(100).nullable(), difficulty: z.number().int().min(1).max(3) });
  const d = schema.parse(data);
  if (d.weightMin !== null && d.weightMax !== null && d.weightMin > d.weightMax) throw new AdminError("Minimum weight cannot exceed maximum");
  const before = await prisma.topic.findUniqueOrThrow({ where: { id: topicId } });
  await prisma.$transaction(async (tx) => {
    await tx.topic.update({ where: { id: topicId }, data: d });
    await tx.syllabusVersion.update({ where: { id: before.syllabusVersionId }, data: { verificationStatus: "UNVERIFIED", verifiedAt: null } });
    await audit(tx, { actorId: actor.id, action: "topic.update", entityType: "Topic", entityId: topicId, before: { name: before.name, weightMin: before.weightMin, weightMax: before.weightMax, difficulty: before.difficulty }, after: d });
  });
}

/** Copies a syllabus (topics, outcomes, prerequisites) into a new DRAFT version. Questions stay with the old version. */
export async function cloneSyllabus(actor: Principal, syllabusId: string, versionLabel: string) {
  assertRole(actor, CONTENT_ROLES);
  const label = z.string().trim().min(2).max(80).parse(versionLabel);
  const src = await prisma.syllabusVersion.findUniqueOrThrow({ where: { id: syllabusId }, include: { topics: { include: { outcomes: true, prerequisites: true } } } });
  return prisma.$transaction(async (tx) => {
    const sv = await tx.syllabusVersion.create({
      data: { levelId: src.levelId, versionLabel: label, status: "DRAFT", structure: json(src.structure), recommendedHours: src.recommendedHours, sourceUrl: src.sourceUrl, notes: `Cloned from "${src.versionLabel}". Verify against the official source before publishing.` },
    });
    const idMap = new Map<string, string>();
    const roots = src.topics.filter((t) => !t.parentId);
    const children = src.topics.filter((t) => t.parentId);
    for (const t of [...roots, ...children]) {
      const created = await tx.topic.create({
        data: { syllabusVersionId: sv.id, parentId: t.parentId ? idMap.get(t.parentId)! : null, code: t.code, name: t.name, order: t.order, weightMin: t.weightMin, weightMax: t.weightMax, difficulty: t.difficulty, description: t.description, outcomes: { create: t.outcomes.map((o) => ({ code: o.code, statement: o.statement })) } },
      });
      idMap.set(t.id, created.id);
    }
    for (const t of src.topics) for (const p of t.prerequisites) await tx.topicPrerequisite.create({ data: { topicId: idMap.get(t.id)!, prerequisiteId: idMap.get(p.prerequisiteId)! } });
    await audit(tx, { actorId: actor.id, action: "syllabus.clone", entityType: "SyllabusVersion", entityId: sv.id, after: { from: src.id, label } });
    return sv;
  });
}

/**
 * Makes a version CURRENT and archives the previous current version. Existing
 * enrollments and historical attempts keep pointing at the version they used,
 * so past results remain interpretable.
 */
export async function makeSyllabusCurrent(actor: Principal, syllabusId: string) {
  assertRole(actor, CONTENT_ROLES);
  const sv = await prisma.syllabusVersion.findUniqueOrThrow({ where: { id: syllabusId } });
  await prisma.$transaction(async (tx) => {
    await tx.syllabusVersion.updateMany({ where: { levelId: sv.levelId, status: "CURRENT", id: { not: sv.id } }, data: { status: "ARCHIVED", effectiveTo: new Date() } });
    await tx.syllabusVersion.update({ where: { id: sv.id }, data: { status: "CURRENT", effectiveFrom: sv.effectiveFrom ?? new Date() } });
    await audit(tx, { actorId: actor.id, action: "syllabus.make_current", entityType: "SyllabusVersion", entityId: sv.id });
  });
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export async function updateLesson(actor: Principal, id: string, data: { title: string; estimatedMinutes: number; contentJson: string; reason: string }) {
  assertRole(actor, CONTENT_ROLES);
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.contentJson);
  } catch {
    throw new AdminError("Lesson content must be valid JSON");
  }
  const content = lessonContentSchema.parse(parsed);
  const before = await prisma.lesson.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({
      where: { id },
      data: { title: z.string().trim().min(3).parse(data.title), estimatedMinutes: Math.max(5, Math.min(240, data.estimatedMinutes)), content: json(content), version: before.version + 1, ...(before.status === "PUBLISHED" && before.origin === "AI_GENERATED" ? { status: "IN_REVIEW" as const } : {}) },
    });
    await audit(tx, { actorId: actor.id, action: "lesson.update", entityType: "Lesson", entityId: id, before: { version: before.version, title: before.title }, after: { version: before.version + 1, title: data.title }, note: data.reason });
  });
}

export async function setLessonStatus(actor: Principal, id: string, status: ContentStatus) {
  assertRole(actor, CONTENT_ROLES);
  const l = await prisma.lesson.findUniqueOrThrow({ where: { id } });
  if (!TRANSITIONS[l.status].includes(status)) throw new AdminError(`Cannot move a lesson from ${l.status} to ${status}`);
  if (status === "PUBLISHED") lessonContentSchema.parse(l.content);
  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({ where: { id }, data: { status, ...(status === "PUBLISHED" ? { reviewedById: actor.id, reviewedAt: new Date() } : {}) } });
    await audit(tx, { actorId: actor.id, action: `lesson.status.${status.toLowerCase()}`, entityType: "Lesson", entityId: id, before: { status: l.status }, after: { status } });
  });
}

// ---------------------------------------------------------------------------
// Reports, users, past papers
// ---------------------------------------------------------------------------

export async function resolveReport(actor: Principal, id: string, status: "resolved" | "rejected", resolution: string) {
  assertRole(actor, CONTENT_ROLES);
  const r = z.string().trim().min(3, "Describe the resolution").max(2000).parse(resolution);
  await prisma.$transaction(async (tx) => {
    await tx.contentReport.update({ where: { id }, data: { status, resolution: r, resolvedById: actor.id, resolvedAt: new Date() } });
    await audit(tx, { actorId: actor.id, action: `report.${status}`, entityType: "ContentReport", entityId: id, note: r });
  });
}

export async function setUserRole(actor: Principal, userId: string, role: Role) {
  assertRole(actor, ADMIN_ROLES);
  if (userId === actor.id && role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) throw new AdminError("You are the only administrator; promote someone else first");
  }
  const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role } });
    await tx.session.deleteMany({ where: { userId } }); // force re-login with new privileges
    await audit(tx, { actorId: actor.id, action: "user.role.change", entityType: "User", entityId: userId, before: { role: before.role }, after: { role } });
  });
}

/** Manual entitlement grant (billing is not integrated); fully audited. */
export async function grantTier(actor: Principal, userId: string, tier: Tier, note: string) {
  assertRole(actor, ADMIN_ROLES);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { tier } });
    await tx.entitlement.create({ data: { userId, tier, source: "manual_admin_grant" } });
    await audit(tx, { actorId: actor.id, action: "user.tier.grant", entityType: "User", entityId: userId, after: { tier }, note });
  });
}

export const pastPaperSchema = z.object({
  programId: z.string().min(1),
  levelId: z.string().nullable().optional(),
  title: z.string().trim().min(3).max(200),
  year: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
  sessionLabel: z.string().trim().max(40).nullable().optional(),
  kind: z.enum(["OFFICIAL_PAST_PAPER", "OFFICIAL_SAMPLE", "LICENSED", "ORIGINAL_MOCK"]),
  url: z.string().trim().refine((u) => u.startsWith("/") || /^https:\/\//.test(u), "Use an https:// URL or an internal path").nullable().optional(),
  licenseNote: z.string().trim().min(10, "Describe the licence or source terms"),
  hasSuggestedAnswers: z.boolean().default(false),
});

export async function createPastPaper(actor: Principal, raw: z.input<typeof pastPaperSchema>) {
  assertRole(actor, CONTENT_ROLES);
  const d = pastPaperSchema.parse(raw);
  const p = await prisma.pastPaper.create({ data: { ...d, levelId: d.levelId || null } });
  await audit(prisma, { actorId: actor.id, action: "pastpaper.create", entityType: "PastPaper", entityId: p.id, after: d });
  return p;
}

export async function verifyPastPaper(actor: Principal, id: string) {
  assertRole(actor, CONTENT_ROLES);
  await prisma.pastPaper.update({ where: { id }, data: { verificationStatus: "VERIFIED", verifiedAt: new Date() } });
  await audit(prisma, { actorId: actor.id, action: "pastpaper.verify", entityType: "PastPaper", entityId: id });
}

/** Aggregated, non-identifying platform analytics. */
export async function platformAnalytics() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [users, active, attempts, submitted, questionsByStatus, openReports, topicAcc] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: since } } }),
    prisma.attempt.count(),
    prisma.attempt.count({ where: { status: "SUBMITTED" } }),
    prisma.question.groupBy({ by: ["status"], _count: true }),
    prisma.contentReport.count({ where: { status: "open" } }),
    prisma.$queryRaw<{ name: string; answered: bigint; correct: bigint }[]>`
      SELECT t.name, COUNT(*)::bigint AS answered, SUM(CASE WHEN ai."isCorrect" THEN 1 ELSE 0 END)::bigint AS correct
      FROM "AttemptItem" ai JOIN "Question" q ON q.id = ai."questionId" JOIN "Topic" t ON t.id = q."topicId"
      WHERE ai."isCorrect" IS NOT NULL GROUP BY t.name ORDER BY answered DESC LIMIT 15`,
  ]);
  return {
    users,
    active7d: active,
    attempts,
    submitted,
    questionsByStatus: Object.fromEntries(questionsByStatus.map((q) => [q.status, q._count])),
    openReports,
    topicAccuracy: topicAcc.map((t) => ({ name: t.name, answered: Number(t.answered), accuracy: Number(t.answered) ? Number(t.correct) / Number(t.answered) : 0 })),
  };
}
