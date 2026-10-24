/**
 * Attempt lifecycle: create -> answer/autosave -> (check | pause/resume |
 * advance section) -> submit -> results. All timing and grading happen here on
 * the server; the browser only renders and reports responses.
 */
import { Prisma, type AttemptKind, type AttemptMode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { weightMid } from "@/server/catalog/service";
import { parseStructure } from "@/server/catalog/structure";
import { createMistakeCards, recomputeProficiency, updateQuestionReviews } from "@/server/adaptive/service";
import { recordActivity } from "@/server/learning/gamification";
import { gradeResponse, isAnswered } from "./grading";
import { choicePayloadSchema, numericPayloadSchema, redactPayload, writtenPayloadSchema, type QType } from "./question-schema";
import { selectQuestions, type PoolQuestion } from "./selection";
import { summarizeAttempt, type AttemptSummary } from "./summary";
import { evaluateClock, remainingSeconds, sectionRemaining, totalElapsed, type TimedState } from "./timing";

export class AttemptError extends Error {}

export interface AttemptConfig {
  feedback: "immediate" | "end";
  allowPause: boolean;
  sections: { name: string; seconds: number | null; itemCount: number }[];
  topicIds: string[];
  mockType?: "full" | "half" | "sectional" | "custom";
  scaledNote?: string;
  unofficial: true;
}

export const createAttemptSchema = z.object({
  enrollmentId: z.string().optional(),
  syllabusVersionId: z.string(),
  kind: z.enum(["DIAGNOSTIC", "PRACTICE", "TOPIC_QUIZ", "MOCK", "REVISION", "KNOWLEDGE_CHECK"]),
  mode: z.enum(["UNTIMED", "TIMED", "EXAM_SIM"]).default("UNTIMED"),
  topicIds: z.array(z.string()).default([]),
  count: z.coerce.number().int().min(1).max(300).default(10),
  difficulty: z.coerce.number().int().min(1).max(3).nullable().optional(),
  feedback: z.enum(["immediate", "end"]).optional(),
  mockType: z.enum(["full", "half", "sectional", "custom"]).optional(),
  minutes: z.coerce.number().int().min(1).max(600).optional(),
  similarToQuestionId: z.string().optional(),
  title: z.string().max(120).optional(),
  seed: z.number().int().optional(),
});

export type CreateAttemptInput = z.input<typeof createAttemptSchema>;

const KIND_TITLE: Record<AttemptKind, string> = {
  DIAGNOSTIC: "Diagnostic assessment",
  PRACTICE: "Practice set",
  TOPIC_QUIZ: "Topic quiz",
  MOCK: "Mock exam",
  REVISION: "Spaced revision set",
  KNOWLEDGE_CHECK: "Knowledge check",
};

export async function createAttempt(userId: string, raw: CreateAttemptInput) {
  const input = createAttemptSchema.parse(raw);
  const syllabus = await prisma.syllabusVersion.findUniqueOrThrow({
    where: { id: input.syllabusVersionId },
    include: { topics: { where: { parentId: null } }, level: { include: { program: true } } },
  });
  if (input.enrollmentId) {
    const e = await prisma.enrollment.findFirst({ where: { id: input.enrollmentId, userId } });
    if (!e) throw new AttemptError("Exam plan not found");
  }
  const structure = parseStructure(syllabus.structure);
  const now = new Date();

  const topicFilter = input.topicIds.length ? { topicId: { in: input.topicIds } } : {};
  let similarOutcome: string | null = null;
  let similarTopic: string | null = null;
  if (input.similarToQuestionId) {
    const q = await prisma.question.findUnique({ where: { id: input.similarToQuestionId } });
    similarOutcome = q?.learningOutcomeId ?? null;
    similarTopic = q?.topicId ?? null;
  }
  const pool = await prisma.question.findMany({
    where: { syllabusVersionId: syllabus.id, status: "PUBLISHED", ...(similarTopic ? { topicId: similarTopic } : topicFilter) },
    select: { id: true, topicId: true, difficulty: true, itemSetId: true, learningOutcomeId: true, estimatedSeconds: true },
  });
  if (pool.length === 0) throw new AttemptError("No published questions are available for this selection yet");

  // Preferences: revision -> due/missed questions; practice -> unseen questions first.
  const prefer = new Set<string>();
  const exclude = new Set<string>();
  if (input.similarToQuestionId) {
    exclude.add(input.similarToQuestionId);
    for (const q of pool) if (similarOutcome && q.learningOutcomeId === similarOutcome) prefer.add(q.id);
  } else if (input.kind === "REVISION") {
    const due = await prisma.questionReviewState.findMany({ where: { userId, dueAt: { lte: now } }, select: { questionId: true } });
    for (const d of due) prefer.add(d.questionId);
  } else if (input.kind === "PRACTICE" || input.kind === "TOPIC_QUIZ") {
    const seen = await prisma.attemptItem.findMany({ where: { attempt: { userId }, questionId: { in: pool.map((p) => p.id) } }, select: { questionId: true }, distinct: ["questionId"] });
    const seenIds = new Set(seen.map((s) => s.questionId));
    for (const q of pool) if (!seenIds.has(q.id)) prefer.add(q.id);
  }

  const weights =
    input.kind === "TOPIC_QUIZ" || input.similarToQuestionId
      ? undefined
      : syllabus.topics
          .filter((t) => !input.topicIds.length || input.topicIds.includes(t.id))
          .map((t) => ({ topicId: t.id, weight: weightMid(t) || 1 }));

  // Mock sizing follows the configured exam structure, scaled to the bank.
  let sections: AttemptConfig["sections"];
  let count = input.count;
  let scaledNote: string | undefined;
  if (input.kind === "MOCK" && input.mockType !== "custom") {
    const factor = input.mockType === "half" ? 0.5 : 1;
    const official = structure.sections.map((s) => ({ ...s, questionCount: Math.max(1, Math.round(s.questionCount * factor)), minutes: s.minutes === null ? null : Math.round(s.minutes * factor) }));
    const wanted = official.reduce((a, s) => a + s.questionCount, 0);
    const available = Math.min(wanted, pool.length);
    const ratio = available / wanted;
    sections = official.map((s) => {
      const itemCount = Math.max(1, Math.floor(s.questionCount * ratio));
      return { name: s.name, itemCount, seconds: s.minutes === null ? null : Math.round(s.minutes * 60 * (itemCount / s.questionCount)) };
    });
    count = sections.reduce((a, s) => a + s.itemCount, 0);
    if (count < wanted) {
      scaledNote = `The real format has ${wanted} questions; this simulation uses ${count} because the current question bank is limited. Time per section is scaled proportionally to keep the same pace.`;
    }
  } else {
    const seconds =
      input.mode === "UNTIMED"
        ? null
        : input.minutes
          ? input.minutes * 60
          : null; // filled after selection from per-question estimates
    sections = [{ name: "All questions", seconds, itemCount: count }];
  }

  const poolQs: PoolQuestion[] = pool.map((q) => ({ id: q.id, topicId: q.topicId, difficulty: q.difficulty, itemSetId: q.itemSetId }));
  const ids = selectQuestions(poolQs, {
    count,
    weights,
    excludeIds: exclude,
    preferIds: prefer,
    difficulty: input.difficulty ?? null,
    seed: input.seed ?? Math.floor(Math.random() * 2 ** 31),
  });
  if (ids.length === 0) throw new AttemptError("Not enough questions available for this selection");

  // Re-split selected questions into sections according to section sizes.
  if (sections.length === 1) {
    sections[0].itemCount = ids.length;
    if (input.mode !== "UNTIMED" && sections[0].seconds === null) {
      const est = new Map(pool.map((q) => [q.id, q.estimatedSeconds]));
      sections[0].seconds = ids.reduce((a, id) => a + (est.get(id) ?? 90), 0);
    }
  } else {
    let remaining = ids.length;
    sections = sections.map((s, i) => {
      const itemCount = i === sections.length - 1 ? remaining : Math.min(s.itemCount, remaining);
      remaining -= itemCount;
      return { ...s, itemCount };
    });
  }
  const timeLimitSeconds = sections.every((s) => s.seconds === null) ? null : sections.reduce((a, s) => a + (s.seconds ?? 0), 0);

  const isExamLike = input.kind === "MOCK" || input.kind === "DIAGNOSTIC" || input.mode === "EXAM_SIM";
  const mode: AttemptMode = input.kind === "MOCK" ? "EXAM_SIM" : input.mode;
  const config: AttemptConfig = {
    feedback: isExamLike ? "end" : (input.feedback ?? "immediate"),
    allowPause: mode !== "EXAM_SIM",
    sections,
    topicIds: input.topicIds,
    mockType: input.kind === "MOCK" ? (input.mockType ?? "full") : undefined,
    scaledNote,
    unofficial: true,
  };

  const versions = await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true, version: true } });
  const versionOf = new Map(versions.map((v) => [v.id, v.version]));
  let cursor = 0;
  const sectionOf = (pos: number) => {
    let acc = 0;
    for (let i = 0; i < sections.length; i++) {
      acc += sections[i].itemCount;
      if (pos < acc) return i;
    }
    return sections.length - 1;
  };

  const mockLabel = input.kind === "MOCK" ? `${config.mockType === "half" ? "Half-length" : config.mockType === "sectional" ? "Sectional" : "Full-length"} ` : "";
  return prisma.attempt.create({
    data: {
      userId,
      enrollmentId: input.enrollmentId ?? null,
      syllabusVersionId: syllabus.id,
      kind: input.kind,
      mode,
      title: input.title ?? `${mockLabel}${KIND_TITLE[input.kind]} — ${syllabus.level.program.shortName} ${syllabus.level.name}`,
      config: config as unknown as Prisma.InputJsonValue,
      timeLimitSeconds,
      resumedAt: now,
      items: {
        create: ids.map((questionId) => ({ questionId, questionVersion: versionOf.get(questionId) ?? 1, position: cursor, section: sectionOf(cursor++) })),
      },
    },
  });
}

function timedState(a: { status: "IN_PROGRESS" | "PAUSED" | "SUBMITTED"; timeLimitSeconds: number | null; elapsedSeconds: number; resumedAt: Date | null; currentSection: number; sectionElapsed: number; config: unknown }): TimedState {
  return {
    status: a.status,
    timeLimitSeconds: a.timeLimitSeconds,
    elapsedSeconds: a.elapsedSeconds,
    resumedAt: a.resumedAt,
    currentSection: a.currentSection,
    sectionElapsed: a.sectionElapsed,
    sections: (a.config as AttemptConfig).sections,
  };
}

async function getOwnedAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId } });
  if (!attempt) throw new AttemptError("Assessment not found");
  return attempt;
}

/** Applies the clock: advances expired sections or auto-submits. Returns the fresh attempt. */
export async function applyClock(userId: string, attemptId: string) {
  let attempt = await getOwnedAttempt(userId, attemptId);
  const now = new Date();
  for (let guard = 0; guard < 10; guard++) {
    if (attempt.status === "SUBMITTED") return attempt;
    const verdict = evaluateClock(timedState(attempt), now);
    if (verdict.kind === "ok") return attempt;
    if (verdict.kind === "expired") {
      await submitAttempt(userId, attemptId, { auto: true });
      return getOwnedAttempt(userId, attemptId);
    }
    const sections = (attempt.config as unknown as AttemptConfig).sections;
    const prevSeconds = sections[attempt.currentSection].seconds ?? 0;
    attempt = await prisma.attempt.update({
      where: { id: attempt.id },
      data: { currentSection: verdict.to, sectionElapsed: attempt.sectionElapsed + prevSeconds },
    });
  }
  return attempt;
}

export type AttemptView = Awaited<ReturnType<typeof getAttemptView>>;

export async function getAttemptView(userId: string, attemptId: string) {
  const attempt = await applyClock(userId, attemptId);
  const config = attempt.config as unknown as AttemptConfig;
  const items = await prisma.attemptItem.findMany({
    where: { attemptId },
    orderBy: { position: "asc" },
    include: {
      question: {
        include: {
          itemSet: true,
          topic: { select: { id: true, name: true } },
          outcome: { select: { code: true, statement: true } },
          formula: { select: { slug: true, name: true, expression: true } },
        },
      },
    },
  });
  const submitted = attempt.status === "SUBMITTED";
  const now = new Date();
  const state = timedState(attempt);
  const lessons = submitted || config.feedback === "immediate" ? await lessonLinks(items.map((i) => i.question.topicId)) : new Map();

  return {
    id: attempt.id,
    title: attempt.title,
    kind: attempt.kind,
    mode: attempt.mode,
    status: attempt.status,
    syllabusVersionId: attempt.syllabusVersionId,
    config,
    currentSection: attempt.currentSection,
    remainingSeconds: remainingSeconds(state, now),
    sectionRemainingSeconds: sectionRemaining(state, now),
    elapsedSeconds: totalElapsed(state, now),
    submittedAt: attempt.submittedAt,
    autoSubmitted: attempt.autoSubmitted,
    summary: attempt.summary as unknown as AttemptSummary | null,
    scorePct: attempt.scorePct,
    items: items.map((it) => {
      const q = it.question;
      const type = q.type as QType;
      const revealed = submitted || (config.feedback === "immediate" && it.answeredAt !== null);
      return {
        id: it.id,
        position: it.position,
        section: it.section,
        flagged: it.flagged,
        confidence: it.confidence,
        timeSpentSeconds: it.timeSpentSeconds,
        response: it.response as Record<string, unknown> | null,
        locked: submitted || (config.feedback === "immediate" && it.answeredAt !== null),
        errorCategory: it.errorCategory,
        question: {
          id: q.id,
          type,
          stem: q.stem,
          difficulty: q.difficulty,
          estimatedSeconds: q.estimatedSeconds,
          topicName: q.topic.name,
          context: q.context,
          itemSet: q.itemSet ? { id: q.itemSet.id, title: q.itemSet.title, vignette: q.itemSet.vignette } : null,
          payload: redactPayload(type, q.payload),
        },
        feedback: revealed ? buildFeedback(it, lessons.get(q.topicId) ?? null) : null,
      };
    }),
  };
}

async function lessonLinks(topicIds: string[]) {
  const lessons = await prisma.lesson.findMany({
    where: { status: "PUBLISHED", OR: [{ topicId: { in: topicIds } }, { topic: { parentId: { in: topicIds } } }] },
    select: { slug: true, title: true, topicId: true, topic: { select: { parentId: true } } },
  });
  const map = new Map<string, { slug: string; title: string }>();
  for (const l of lessons) {
    const root = l.topic.parentId ?? l.topicId;
    if (!map.has(root)) map.set(root, { slug: l.slug, title: l.title });
  }
  return map;
}

type ItemWithQuestion = Prisma.AttemptItemGetPayload<{ include: { question: { include: { outcome: { select: { code: true; statement: true } }; formula: { select: { slug: true; name: true; expression: true } } } } } }>;

function buildFeedback(it: ItemWithQuestion, lesson: { slug: string; title: string } | null) {
  const q = it.question;
  const type = q.type as QType;
  const base = {
    isCorrect: it.isCorrect,
    score: it.score,
    explanation: q.explanation,
    steps: q.steps,
    conceptTested: q.conceptTested,
    commonMistake: q.commonMistake,
    outcome: q.outcome,
    formula: q.formula,
    lesson,
  };
  if (type === "MCQ" || type === "MULTI_SELECT") {
    const p = choicePayloadSchema.parse(q.payload);
    return { ...base, options: p.options, correctAnswer: p.options.filter((o) => o.correct).map((o) => o.text).join("; ") };
  }
  if (type === "NUMERIC") {
    const p = numericPayloadSchema.parse(q.payload);
    return { ...base, options: null, correctAnswer: `${p.answer.toFixed(p.decimals)}${p.unit ? ` ${p.unit}` : ""} (accepted within ±${p.toleranceType === "relative" ? `${p.tolerance * 100}%` : p.tolerance})` };
  }
  const p = writtenPayloadSchema.parse(q.payload);
  return { ...base, options: null, correctAnswer: p.modelAnswer, rubric: p.rubric.map((r) => ({ criterion: r.criterion, points: r.points })) };
}

export const saveSchema = z.object({
  itemId: z.string(),
  response: z.union([z.object({ selected: z.array(z.string()).max(8) }), z.object({ value: z.number().finite().nullable() }), z.object({ text: z.string().max(10000) })]).optional(),
  timeSpentDelta: z.number().int().min(0).max(3600).default(0),
  confidence: z.number().int().min(1).max(3).nullable().optional(),
  flagged: z.boolean().optional(),
});

function validateResponseShape(type: QType, response: unknown, payload: unknown) {
  const r = response as Record<string, unknown>;
  if (type === "MCQ" || type === "MULTI_SELECT") {
    if (!Array.isArray(r.selected)) throw new AttemptError("Invalid response");
    const ids = new Set(choicePayloadSchema.parse(payload).options.map((o) => o.id));
    if ((r.selected as string[]).some((s) => !ids.has(s))) throw new AttemptError("Invalid option");
    if (type === "MCQ" && (r.selected as string[]).length > 1) throw new AttemptError("Choose one option");
  } else if (type === "NUMERIC") {
    if (!("value" in r)) throw new AttemptError("Invalid response");
  } else if (typeof r.text !== "string") throw new AttemptError("Invalid response");
}

/** Autosave a single response. Rejected when time is up or the item is locked. */
export async function saveResponse(userId: string, attemptId: string, raw: z.input<typeof saveSchema>) {
  const input = saveSchema.parse(raw);
  const attempt = await applyClock(userId, attemptId);
  if (attempt.status === "SUBMITTED") throw new AttemptError("This assessment has already been submitted");
  if (attempt.status === "PAUSED") throw new AttemptError("Resume the assessment to continue answering");
  const config = attempt.config as unknown as AttemptConfig;
  const item = await prisma.attemptItem.findFirst({ where: { id: input.itemId, attemptId }, include: { question: true } });
  if (!item) throw new AttemptError("Question not found in this assessment");
  if (config.sections.length > 1 && item.section !== attempt.currentSection) {
    throw new AttemptError("This section is closed");
  }
  const locked = config.feedback === "immediate" && item.answeredAt !== null;
  const data: Prisma.AttemptItemUpdateInput = { timeSpentSeconds: { increment: input.timeSpentDelta } };
  if (input.flagged !== undefined) data.flagged = input.flagged;
  if (input.confidence !== undefined) data.confidence = input.confidence;
  if (input.response !== undefined) {
    if (locked) throw new AttemptError("This answer has already been checked");
    validateResponseShape(item.question.type as QType, input.response, item.question.payload);
    data.response = input.response as Prisma.InputJsonValue;
  }
  await prisma.attemptItem.update({ where: { id: item.id }, data });
  await prisma.attempt.update({ where: { id: attemptId }, data: { updatedAt: new Date() } });
  return { saved: true };
}

/** Practice mode with immediate feedback: grade one item and lock it. */
export async function checkItem(userId: string, attemptId: string, itemId: string) {
  const attempt = await applyClock(userId, attemptId);
  const config = attempt.config as unknown as AttemptConfig;
  if (config.feedback !== "immediate") throw new AttemptError("Answers are revealed only after submission in this mode");
  if (attempt.status !== "IN_PROGRESS") throw new AttemptError("This assessment is not active");
  const item = await prisma.attemptItem.findFirst({ where: { id: itemId, attemptId }, include: { question: true } });
  if (!item) throw new AttemptError("Question not found in this assessment");
  if (item.answeredAt) return { alreadyChecked: true };
  const type = item.question.type as QType;
  if (!isAnswered(type, item.response)) throw new AttemptError("Answer the question before checking");
  const g = gradeResponse(type, item.question.payload, item.response);
  await prisma.attemptItem.update({ where: { id: item.id }, data: { isCorrect: g.isCorrect, score: g.score, answeredAt: new Date() } });
  await recomputeProficiency(userId, [item.question.topicId]);
  await updateQuestionReviews(userId, [{ questionId: item.questionId, correct: g.isCorrect, confidence: item.confidence, timeRatio: item.timeSpentSeconds / item.question.estimatedSeconds }]);
  return { alreadyChecked: false };
}

export async function pauseAttempt(userId: string, attemptId: string) {
  const attempt = await applyClock(userId, attemptId);
  const config = attempt.config as unknown as AttemptConfig;
  if (!config.allowPause) throw new AttemptError("Pausing is not permitted in exam simulation mode");
  if (attempt.status !== "IN_PROGRESS") return attempt;
  return prisma.attempt.update({
    where: { id: attemptId },
    data: { status: "PAUSED", elapsedSeconds: totalElapsed(timedState(attempt), new Date()), resumedAt: null },
  });
}

export async function resumeAttempt(userId: string, attemptId: string) {
  const attempt = await getOwnedAttempt(userId, attemptId);
  if (attempt.status !== "PAUSED") return attempt;
  return prisma.attempt.update({ where: { id: attemptId }, data: { status: "IN_PROGRESS", resumedAt: new Date() } });
}

/** Learner finishes the current section early; earlier sections cannot be revisited. */
export async function advanceSection(userId: string, attemptId: string) {
  const attempt = await applyClock(userId, attemptId);
  if (attempt.status !== "IN_PROGRESS") throw new AttemptError("This assessment is not active");
  const config = attempt.config as unknown as AttemptConfig;
  if (attempt.currentSection + 1 >= config.sections.length) throw new AttemptError("This is the final section; submit instead");
  const state = timedState(attempt);
  const sectionSeconds = config.sections[attempt.currentSection].seconds;
  // Unused section time is forfeited, as in sectioned exams; the overall limit shrinks accordingly.
  const usedInSection = totalElapsed(state, new Date()) - attempt.sectionElapsed;
  const forfeited = sectionSeconds !== null ? Math.max(0, sectionSeconds - usedInSection) : 0;
  return prisma.attempt.update({
    where: { id: attemptId },
    data: {
      currentSection: attempt.currentSection + 1,
      sectionElapsed: totalElapsed(state, new Date()),
      timeLimitSeconds: attempt.timeLimitSeconds === null ? null : attempt.timeLimitSeconds - forfeited,
    },
  });
}

export async function submitAttempt(userId: string, attemptId: string, opts: { auto?: boolean } = {}) {
  const attempt = await getOwnedAttempt(userId, attemptId);
  if (attempt.status === "SUBMITTED") return attempt;
  const now = new Date();
  const items = await prisma.attemptItem.findMany({
    where: { attemptId },
    include: { question: { include: { topic: { select: { id: true, name: true } } } } },
  });

  const results = items.map((it) => {
    const type = it.question.type as QType;
    const g = gradeResponse(type, it.question.payload, it.response);
    return { it, g, answered: isAnswered(type, it.response) };
  });
  const summary = summarizeAttempt(
    results.map(({ it, g, answered }) => ({
      questionId: it.questionId,
      topicId: it.question.topicId,
      topicName: it.question.topic.name,
      difficulty: it.question.difficulty,
      isCorrect: g.isCorrect,
      answered,
      timeSpentSeconds: it.timeSpentSeconds,
      estimatedSeconds: it.question.estimatedSeconds,
      confidence: it.confidence,
      section: it.section,
    })),
  );
  const elapsed = totalElapsed(timedState(attempt), now);

  const updated = await prisma.$transaction(async (tx) => {
    // Guard against double submission (e.g. timer auto-submit racing a click).
    const claimed = await tx.attempt.updateMany({ where: { id: attemptId, status: { not: "SUBMITTED" } }, data: { status: "SUBMITTED" } });
    if (claimed.count === 0) return null;
    for (const { it, g, answered } of results) {
      await tx.attemptItem.update({
        where: { id: it.id },
        data: {
          isCorrect: g.isCorrect,
          score: g.score,
          answeredAt: it.answeredAt ?? now,
          errorCategory: it.errorCategory ?? summary.suggestedErrors[it.questionId] ?? null,
        },
      });
    }
    return tx.attempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: now,
        autoSubmitted: !!opts.auto,
        elapsedSeconds: elapsed,
        resumedAt: null,
        correctCount: summary.correct,
        totalCount: summary.total,
        scorePct: summary.scorePct,
        summary: summary as unknown as Prisma.InputJsonValue,
      },
    });
  });
  if (!updated) return getOwnedAttempt(userId, attemptId);

  const topicIds = [...new Set(items.map((i) => i.question.topicId))];
  await recomputeProficiency(userId, topicIds);
  const config = attempt.config as unknown as AttemptConfig;
  // Items already checked during immediate-feedback practice updated their review state then.
  await updateQuestionReviews(
    userId,
    results
      .filter(({ it, answered }) => answered && !(config.feedback === "immediate" && it.answeredAt))
      .map(({ it, g }) => ({ questionId: it.questionId, correct: g.isCorrect, confidence: it.confidence, timeRatio: it.timeSpentSeconds / it.question.estimatedSeconds })),
  );
  if (attempt.kind !== "DIAGNOSTIC") {
    await createMistakeCards(userId, results.filter(({ g, answered }) => answered && !g.isCorrect).map(({ it }) => it.questionId));
  }
  if (attempt.kind === "DIAGNOSTIC" && attempt.enrollmentId) {
    await prisma.enrollment.update({ where: { id: attempt.enrollmentId }, data: { diagnosticAttemptId: attempt.id } });
  }
  const minutes = Math.max(1, Math.round(elapsed / 60));
  await recordActivity(userId, {
    enrollmentId: attempt.enrollmentId,
    minutes,
    activity: attempt.kind === "MOCK" ? "mock" : "practice",
    meaningful: summary.answered > 0,
    event: { type: "attempt_submitted", kind: attempt.kind, scorePct: summary.scorePct, total: summary.total, correct: summary.correct },
  });
  return updated;
}

export async function setErrorCategory(userId: string, attemptId: string, itemId: string, category: string | null) {
  const attempt = await getOwnedAttempt(userId, attemptId);
  if (attempt.status !== "SUBMITTED") throw new AttemptError("Classify errors after submitting");
  const allowed = ["conceptual", "calculation", "misread", "careless", "time_pressure", "not_attempted"];
  if (category !== null && !allowed.includes(category)) throw new AttemptError("Unknown error category");
  await prisma.attemptItem.updateMany({ where: { id: itemId, attemptId }, data: { errorCategory: category } });
}

export async function listAttempts(userId: string, opts: { kind?: AttemptKind; status?: "IN_PROGRESS" | "PAUSED" | "SUBMITTED"; syllabusVersionId?: string; take?: number } = {}) {
  return prisma.attempt.findMany({
    where: {
      userId,
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.syllabusVersionId ? { syllabusVersionId: opts.syllabusVersionId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 20,
    select: { id: true, title: true, kind: true, mode: true, status: true, scorePct: true, correctCount: true, totalCount: true, startedAt: true, submittedAt: true, config: true, elapsedSeconds: true, timeLimitSeconds: true },
  });
}

/**
 * After an administrator corrects an answer key, re-grade every submitted
 * response to that question and refresh affected results and proficiency.
 */
export async function regradeQuestion(questionId: string) {
  const question = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  const items = await prisma.attemptItem.findMany({ where: { questionId, isCorrect: { not: null } }, select: { id: true, response: true, attemptId: true, attempt: { select: { userId: true, status: true } } } });
  let changed = 0;
  for (const it of items) {
    const g = gradeResponse(question.type as QType, question.payload, it.response);
    await prisma.attemptItem.update({ where: { id: it.id }, data: { isCorrect: g.isCorrect, score: g.score } });
    changed += 1;
  }
  const attemptIds = [...new Set(items.filter((i) => i.attempt.status === "SUBMITTED").map((i) => i.attemptId))];
  for (const attemptId of attemptIds) {
    const all = await prisma.attemptItem.findMany({ where: { attemptId }, include: { question: { include: { topic: { select: { name: true } } } } } });
    const summary = summarizeAttempt(
      all.map((it) => ({
        questionId: it.questionId,
        topicId: it.question.topicId,
        topicName: it.question.topic.name,
        difficulty: it.question.difficulty,
        isCorrect: !!it.isCorrect,
        answered: isAnswered(it.question.type as QType, it.response),
        timeSpentSeconds: it.timeSpentSeconds,
        estimatedSeconds: it.question.estimatedSeconds,
        confidence: it.confidence,
        section: it.section,
      })),
    );
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { correctCount: summary.correct, totalCount: summary.total, scorePct: summary.scorePct, summary: summary as unknown as Prisma.InputJsonValue },
    });
  }
  const users = [...new Set(items.map((i) => i.attempt.userId))];
  for (const u of users) await recomputeProficiency(u, [question.topicId]);
  return { responsesRegraded: changed, attemptsUpdated: attemptIds.length, learnersAffected: users.length };
}
