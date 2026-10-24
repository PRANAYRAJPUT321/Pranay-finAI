/**
 * Idempotent demonstration seed. Validates every question payload and checks
 * every numerical answer key against the deterministic calculators; the seed
 * aborts if any key is wrong.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { programs } from "./seed/catalog";
import { formulas } from "./seed/formulas";
import { cfaL1 } from "./seed/cfa-l1";
import { cpaFar, frmP1, nismVA } from "./seed/other-curricula";
import type { CurriculumSeed } from "./seed/types";
import { examStructureSchema } from "../src/server/catalog/structure";
import { lessonContentSchema } from "../src/server/content/lesson-schema";
import { validatePayload } from "../src/server/assessment/question-schema";
import { verifyAnswerKey } from "../src/server/assessment/grading";

const prisma = new PrismaClient();
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

async function seedSources() {
  const original = await prisma.contentSource.findFirst({ where: { title: "PD FinPrep original content" } });
  return (
    original ??
    prisma.contentSource.create({
      data: {
        title: "PD FinPrep original content",
        publisher: "PD FinPrep editorial team",
        licenseType: "ORIGINAL",
        licenseNotes: "Written for PD FinPrep. Not official exam material; not affiliated with any awarding body.",
      },
    })
  );
}

async function seedCatalog() {
  for (const p of programs) {
    const { levels, ...programData } = p;
    const program = await prisma.examProgram.upsert({ where: { slug: p.slug }, create: programData, update: programData });
    for (const l of levels) {
      const { syllabus, ...levelData } = l;
      const level = await prisma.examLevel.upsert({
        where: { programId_code: { programId: program.id, code: l.code } },
        create: { ...levelData, programId: program.id },
        update: levelData,
      });
      if (!syllabus) continue;
      const structure = examStructureSchema.parse(syllabus.structure);
      const sData = {
        status: "CURRENT" as const,
        effectiveFrom: syllabus.effectiveFrom ? new Date(syllabus.effectiveFrom) : null,
        verificationStatus: "UNVERIFIED" as const,
        sourceUrl: syllabus.sourceUrl,
        structure: json(structure),
        recommendedHours: syllabus.recommendedHours,
        notes: syllabus.notes,
      };
      const sv = await prisma.syllabusVersion.upsert({
        where: { levelId_versionLabel: { levelId: level.id, versionLabel: syllabus.versionLabel } },
        create: { ...sData, levelId: level.id, versionLabel: syllabus.versionLabel },
        update: sData,
      });
      const codeToId = new Map<string, string>();
      for (const [i, t] of syllabus.topics.entries()) {
        const tData = { name: t.name, order: i + 1, weightMin: t.weightMin ?? null, weightMax: t.weightMax ?? null, difficulty: t.difficulty ?? 2, description: t.description ?? null, parentId: null };
        const topic = await prisma.topic.upsert({
          where: { syllabusVersionId_code: { syllabusVersionId: sv.id, code: t.code } },
          create: { ...tData, syllabusVersionId: sv.id, code: t.code },
          update: tData,
        });
        codeToId.set(t.code, topic.id);
        for (const [j, c] of (t.children ?? []).entries()) {
          const child = await prisma.topic.upsert({
            where: { syllabusVersionId_code: { syllabusVersionId: sv.id, code: c.code } },
            create: { syllabusVersionId: sv.id, code: c.code, name: c.name, order: j + 1, parentId: topic.id },
            update: { name: c.name, order: j + 1, parentId: topic.id },
          });
          codeToId.set(c.code, child.id);
          for (const o of c.outcomes ?? []) {
            await prisma.learningOutcome.upsert({
              where: { topicId_code: { topicId: child.id, code: o.code } },
              create: { topicId: child.id, code: o.code, statement: o.statement },
              update: { statement: o.statement },
            });
          }
        }
      }
      for (const t of syllabus.topics) {
        for (const pre of t.prereqs ?? []) {
          const topicId = codeToId.get(t.code)!;
          const prerequisiteId = codeToId.get(pre);
          if (!prerequisiteId) throw new Error(`Unknown prerequisite ${pre} for ${t.code}`);
          await prisma.topicPrerequisite.upsert({ where: { topicId_prerequisiteId: { topicId, prerequisiteId } }, create: { topicId, prerequisiteId }, update: {} });
        }
      }
    }
  }
}

async function topicByRef(ref: string) {
  const [slug, levelCode, code] = ref.split(":");
  return prisma.topic.findFirst({
    where: { code, syllabus: { status: "CURRENT", level: { code: levelCode, program: { slug } } } },
  });
}

async function seedFormulas() {
  for (const f of formulas) {
    const { topics, ...data } = f;
    const formula = await prisma.formula.upsert({
      where: { slug: f.slug },
      create: { ...data, variables: json(data.variables), example: json(data.example) },
      update: { ...data, variables: json(data.variables), example: json(data.example) },
    });
    for (const ref of topics) {
      const topic = await topicByRef(ref);
      if (!topic) throw new Error(`Formula ${f.slug}: unknown topic ${ref}`);
      await prisma.formulaTopic.upsert({ where: { formulaId_topicId: { formulaId: formula.id, topicId: topic.id } }, create: { formulaId: formula.id, topicId: topic.id }, update: {} });
    }
  }
}

async function seedCurriculum(c: CurriculumSeed, sourceId: string, reviewerId: string) {
  const sv = await prisma.syllabusVersion.findFirstOrThrow({ where: { status: "CURRENT", level: { code: c.levelCode, program: { slug: c.programSlug } } } });
  const topics = await prisma.topic.findMany({ where: { syllabusVersionId: sv.id }, include: { outcomes: true } });
  const topicId = (code: string) => {
    const t = topics.find((x) => x.code === code);
    if (!t) throw new Error(`${c.programSlug}/${c.levelCode}: unknown topic ${code}`);
    return t.id;
  };
  const itemSetIds = new Map<string, string>();
  for (const s of c.itemSets ?? []) {
    const existing = await prisma.itemSet.findFirst({ where: { syllabusVersionId: sv.id, title: s.title } });
    const data = { syllabusVersionId: sv.id, topicId: topicId(s.topic), title: s.title, vignette: s.vignette };
    const set = existing ? await prisma.itemSet.update({ where: { id: existing.id }, data }) : await prisma.itemSet.create({ data });
    itemSetIds.set(s.key, set.id);
  }
  const formulaIds = new Map((await prisma.formula.findMany({ select: { id: true, slug: true } })).map((f) => [f.slug, f.id]));
  const failures: string[] = [];
  for (const q of c.questions) {
    const payload =
      q.type === "MCQ" || q.type === "MULTI_SELECT"
        ? { options: q.options!.map(([text, correct, rationale], i) => ({ id: String.fromCharCode(97 + i), text, correct, rationale })) }
        : q.type === "NUMERIC"
          ? { toleranceType: "absolute", decimals: 2, ...q.numeric }
          : q.written;
    const valid = validatePayload(q.type, payload);
    const check = verifyAnswerKey(q.type, valid, q.calc ?? null);
    if (!check.ok) failures.push(`${q.key}: ${check.message} (computed ${check.computed}, expected ${check.expected})`);
    let learningOutcomeId: string | null = null;
    if (q.lo) {
      const [sub, code] = q.lo.split(":");
      learningOutcomeId = topics.find((t) => t.code === sub)?.outcomes.find((o) => o.code === code)?.id ?? null;
      if (!learningOutcomeId) throw new Error(`${q.key}: unknown outcome ${q.lo}`);
    }
    const data = {
      syllabusVersionId: sv.id,
      topicId: topicId(q.topic),
      learningOutcomeId,
      itemSetId: q.itemSet ? itemSetIds.get(q.itemSet)! : null,
      formulaId: q.formula ? (formulaIds.get(q.formula) ?? null) : null,
      type: q.type,
      difficulty: q.difficulty,
      stem: q.stem,
      payload: json(valid),
      calcSpec: q.calc ? json({ scale: 1, ...q.calc }) : undefined,
      explanation: q.explanation,
      steps: q.steps ?? [],
      conceptTested: q.concept,
      commonMistake: q.mistake ?? null,
      estimatedSeconds: q.seconds ?? 90,
      context: q.context ?? null,
      status: "PUBLISHED" as const,
      origin: "ORIGINAL" as const,
      sourceId,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    };
    const question = await prisma.question.upsert({ where: { externalKey: q.key }, create: { ...data, externalKey: q.key }, update: data });
    await prisma.questionVersion.upsert({
      where: { questionId_version: { questionId: question.id, version: question.version } },
      create: { questionId: question.id, version: question.version, snapshot: json(data), reason: "Initial seed", changedById: reviewerId },
      update: {},
    });
  }
  if (failures.length) throw new Error(`Answer-key verification failed:\n${failures.join("\n")}`);

  for (const l of c.lessons) {
    const content = lessonContentSchema.parse(l.content);
    const tId = topicId(l.subtopic ?? l.topic);
    const data = { title: l.title, content: json(content), estimatedMinutes: l.minutes, status: "PUBLISHED" as const, origin: "ORIGINAL" as const, sourceId, reviewedById: reviewerId, reviewedAt: new Date() };
    await prisma.lesson.upsert({ where: { topicId_slug: { topicId: tId, slug: l.slug } }, create: { ...data, topicId: tId, slug: l.slug }, update: data });
  }
  for (const f of c.flashcards) {
    const tId = topicId(f.topic);
    const exists = await prisma.flashcard.findFirst({ where: { ownerId: null, topicId: tId, front: f.front } });
    if (!exists) await prisma.flashcard.create({ data: { ownerId: null, topicId: tId, kind: f.kind, front: f.front, back: f.back, verified: true } });
  }
  return c.questions.length;
}

async function seedPastPapers() {
  const entries: { program: string; level?: string; title: string; kind: "OFFICIAL_PAST_PAPER" | "OFFICIAL_SAMPLE" | "ORIGINAL_MOCK"; url: string; note: string; answers?: boolean }[] = [
    { program: "cfa", level: "L1", title: "Official practice questions and mock exams (candidate resources)", kind: "OFFICIAL_SAMPLE", url: "https://www.cfainstitute.org", note: "CFA Institute provides practice material to registered candidates. Actual exam questions are confidential and are never reproduced here." },
    { program: "frm", level: "PART1", title: "GARP practice exams (candidate resources)", kind: "OFFICIAL_SAMPLE", url: "https://www.garp.org/frm", note: "GARP publishes practice exams for candidates. Linked only; not re-hosted." },
    { program: "acca", level: "FR", title: "ACCA past exams and specimen exams", kind: "OFFICIAL_PAST_PAPER", url: "https://www.accaglobal.com", note: "ACCA publishes selected past exams and specimen exams with answers on its website. Linked only; copyright remains with ACCA.", answers: true },
    { program: "ca-india", level: "FND", title: "ICAI Board of Studies — previous question papers and suggested answers", kind: "OFFICIAL_PAST_PAPER", url: "https://www.icai.org", note: "ICAI's Board of Studies publishes previous papers and suggested answers. Linked only; copyright remains with ICAI.", answers: true },
    { program: "ea-us", level: "P1", title: "IRS Special Enrollment Examination information and sample questions", kind: "OFFICIAL_SAMPLE", url: "https://www.irs.gov/tax-professionals/enrolled-agents", note: "US government publication. Check the tax year of any sample material." },
    { program: "cpa-us", level: "FAR", title: "AICPA CPA Exam sample tests and blueprints", kind: "OFFICIAL_SAMPLE", url: "https://www.aicpa-cima.com", note: "Official blueprints and sample tests. Linked only." },
    { program: "nism", level: "VA", title: "NISM workbook and exam details", kind: "OFFICIAL_SAMPLE", url: "https://www.nism.ac.in", note: "Official workbook and exam information. Linked only." },
    { program: "cfa", level: "L1", title: "PD FinPrep original full-length mock (unofficial)", kind: "ORIGINAL_MOCK", url: "/mocks", note: "Original PD FinPrep questions in the exam's format. Not an official or past exam paper." },
    { program: "frm", level: "PART1", title: "PD FinPrep original mock (unofficial)", kind: "ORIGINAL_MOCK", url: "/mocks", note: "Original PD FinPrep questions. Not an official or past exam paper." },
  ];
  for (const e of entries) {
    const program = await prisma.examProgram.findUniqueOrThrow({ where: { slug: e.program } });
    const level = e.level ? await prisma.examLevel.findFirst({ where: { programId: program.id, code: e.level } }) : null;
    const existing = await prisma.pastPaper.findFirst({ where: { programId: program.id, title: e.title } });
    const data = { programId: program.id, levelId: level?.id ?? null, title: e.title, kind: e.kind, url: e.url, licenseNote: e.note, hasSuggestedAnswers: !!e.answers, verificationStatus: "UNVERIFIED" as const };
    if (existing) await prisma.pastPaper.update({ where: { id: existing.id }, data });
    else await prisma.pastPaper.create({ data });
  }
}

async function seedUsers() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@finprep.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Admin123";
  const users = [
    { email: adminEmail, name: "PD FinPrep Admin", role: "ADMIN" as const, password: adminPassword },
    { email: "editor@finprep.local", name: "Content Editor (demo)", role: "CONTENT_MANAGER" as const, password: "ChangeMe!Editor123" },
    { email: "student@finprep.local", name: "Demo Student", role: "STUDENT" as const, password: "ChangeMe!Student123" },
  ];
  const created = [];
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    created.push(
      existing ??
        (await prisma.user.create({ data: { email: u.email, name: u.name, role: u.role, passwordHash: await bcrypt.hash(u.password, 12), emailVerifiedAt: new Date() } })),
    );
  }
  return created[0];
}

async function main() {
  const source = await seedSources();
  await seedCatalog();
  const admin = await seedUsers();
  await seedFormulas();
  let questions = 0;
  for (const c of [cfaL1, frmP1, cpaFar, nismVA]) questions += await seedCurriculum(c, source.id, admin.id);
  await seedPastPapers();
  console.log(`Seed complete: ${programs.length} programs, ${formulas.length} formulas, ${questions} questions (all answer keys verified).`);
  console.log("Demo accounts (development only): admin from SEED_ADMIN_EMAIL, editor@finprep.local, student@finprep.local — see README.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
