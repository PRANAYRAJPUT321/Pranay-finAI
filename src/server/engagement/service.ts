import "server-only";
import { prisma } from "@/server/db";
import { addDays, toDateKey, utcDay } from "@/server/planner/generate";
import { choicePayloadSchema } from "@/server/assessment/question-schema";
import { createRng, randomShuffle, shuffle } from "@/server/assessment/selection";
import { recordActivity, streakFromDates } from "@/server/learning/gamification";

export class EngagementError extends Error {}

/** FNV-1a hash: a stable seed for per-user, per-day choices. */
export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic choice: prefer questions the learner has not seen, then fall back to the whole bank. */
export function pickDailyQuestion(candidateIds: string[], seenIds: Set<string>, seed: number): string | null {
  if (candidateIds.length === 0) return null;
  const unseen = candidateIds.filter((id) => !seenIds.has(id));
  const pool = unseen.length ? unseen : candidateIds;
  return pool[seed % pool.length];
}

const questionSelect = {
  id: true, stem: true, context: true, type: true, payload: true, explanation: true, steps: true, conceptTested: true, estimatedSeconds: true,
  topic: { select: { name: true } },
} as const;

type ChallengeRow = NonNullable<Awaited<ReturnType<typeof loadChallenge>>>;

function loadChallenge(userId: string, date: Date) {
  return prisma.dailyChallenge.findUnique({ where: { userId_date: { userId, date } }, include: { question: { select: questionSelect } } });
}

function toView(c: ChallengeRow) {
  const payload = choicePayloadSchema.parse(c.question.payload);
  const answered = c.answeredAt !== null;
  const options = shuffle(payload.options, createRng(hashSeed(c.id))).map((o) => ({
    id: o.id,
    text: o.text,
    ...(answered ? { correct: o.correct, rationale: o.rationale ?? null } : {}),
  }));
  return {
    id: c.id,
    date: toDateKey(c.date),
    topic: c.question.topic.name,
    stem: c.question.stem,
    context: c.question.context,
    concept: c.question.conceptTested,
    options,
    answered,
    selectedOptionId: c.selectedOptionId,
    correct: c.correct,
    explanation: answered ? c.question.explanation : null,
    steps: answered ? c.question.steps : [],
  };
}

export type DailyChallengeView = ReturnType<typeof toView>;

export async function getDailyChallenge(userId: string, syllabusVersionId: string, now = new Date()): Promise<DailyChallengeView | null> {
  const date = utcDay(now);
  const existing = await loadChallenge(userId, date);
  if (existing) return toView(existing);
  const [candidates, attempted, past] = await Promise.all([
    prisma.question.findMany({ where: { syllabusVersionId, status: "PUBLISHED", type: "MCQ", itemSetId: null }, select: { id: true }, orderBy: { id: "asc" } }),
    prisma.attemptItem.findMany({ where: { attempt: { userId } }, select: { questionId: true }, distinct: ["questionId"] }),
    prisma.dailyChallenge.findMany({ where: { userId }, select: { questionId: true } }),
  ]);
  const seen = new Set([...attempted.map((a) => a.questionId), ...past.map((p) => p.questionId)]);
  const questionId = pickDailyQuestion(candidates.map((c) => c.id), seen, hashSeed(`${userId}:${toDateKey(date)}`));
  if (!questionId) return null;
  try {
    await prisma.dailyChallenge.create({ data: { userId, date, questionId } });
  } catch {
    // Created concurrently by another request: fall through and read it.
  }
  const row = await loadChallenge(userId, date);
  return row ? toView(row) : null;
}

export async function answerDailyChallenge(userId: string, optionId: string, now = new Date()) {
  const date = utcDay(now);
  const row = await loadChallenge(userId, date);
  if (!row) throw new EngagementError("Today's challenge has not been set yet.");
  if (row.answeredAt) return toView(row);
  const payload = choicePayloadSchema.parse(row.question.payload);
  const option = payload.options.find((o) => o.id === optionId);
  if (!option) throw new EngagementError("Choose one of the options.");
  // Conditional update so a double submit cannot overwrite the first answer.
  const res = await prisma.dailyChallenge.updateMany({
    where: { id: row.id, answeredAt: null },
    data: { selectedOptionId: optionId, correct: option.correct, answeredAt: new Date() },
  });
  if (res.count === 1) {
    await recordActivity(userId, { minutes: Math.max(1, Math.round(row.question.estimatedSeconds / 60)), activity: "practice", meaningful: true, note: "Daily challenge", event: { type: "manual_log" } });
  }
  return toView((await loadChallenge(userId, date))!);
}

export async function dailyChallengeStats(userId: string, now = new Date()) {
  const rows = await prisma.dailyChallenge.findMany({
    where: { userId, answeredAt: { not: null }, date: { gte: addDays(utcDay(now), -365) } },
    select: { date: true, correct: true },
    orderBy: { date: "desc" },
  });
  const streak = streakFromDates(rows.map((r) => toDateKey(r.date)), now);
  const last14 = rows.filter((r) => r.date >= addDays(utcDay(now), -13));
  return { streak, answered: rows.length, correct: rows.filter((r) => r.correct).length, last14: last14.map((r) => ({ date: toDateKey(r.date), correct: !!r.correct })) };
}

// ---------------------------------------------------------------------------
// Rapid fire
// ---------------------------------------------------------------------------

export const RAPID_FIRE_SECONDS = 60;

/** Short, quick MCQs for a 60-second round. Correct answers are not sent to the browser. */
export async function rapidFireDeck(syllabusVersionId: string, size = 30) {
  const questions = await prisma.question.findMany({
    where: { syllabusVersionId, status: "PUBLISHED", type: "MCQ", itemSetId: null, estimatedSeconds: { lte: 90 }, difficulty: { lte: 2 } },
    select: { id: true, stem: true, payload: true, topic: { select: { name: true } } },
  });
  return randomShuffle(questions.filter((q) => q.stem.length <= 320))
    .slice(0, size)
    .map((q) => ({
      id: q.id,
      topic: q.topic.name,
      stem: q.stem,
      options: randomShuffle(choicePayloadSchema.parse(q.payload).options).map((o) => ({ id: o.id, text: o.text })),
    }));
}

export async function checkRapidAnswer(questionId: string, optionId: string) {
  const q = await prisma.question.findFirst({ where: { id: questionId, status: "PUBLISHED", type: "MCQ" }, select: { payload: true } });
  if (!q) throw new EngagementError("Question not found.");
  const correctId = choicePayloadSchema.parse(q.payload).options.find((o) => o.correct)!.id;
  return { correct: correctId === optionId, correctOptionId: correctId };
}

/** Score: 10 points per correct answer, −3 per wrong answer, never below zero. */
export function rapidFireScore(answered: number, correct: number) {
  return Math.max(0, correct * 10 - (answered - correct) * 3);
}

export async function saveRapidFireRun(userId: string, syllabusVersionId: string, answered: number, correct: number) {
  if (!Number.isInteger(answered) || !Number.isInteger(correct) || answered < 0 || correct < 0 || correct > answered || answered > 120) {
    throw new EngagementError("Invalid round result.");
  }
  const previousBest = await prisma.rapidFireRun.aggregate({ where: { userId, syllabusVersionId }, _max: { score: true } });
  const score = rapidFireScore(answered, correct);
  await prisma.rapidFireRun.create({ data: { userId, syllabusVersionId, answered, correct, score } });
  if (answered > 0) await recordActivity(userId, { minutes: 1, activity: "practice", meaningful: true, note: "Rapid fire", event: { type: "manual_log" } });
  const best = Math.max(score, previousBest._max.score ?? 0);
  return { score, best, isNewBest: answered > 0 && score > (previousBest._max.score ?? -1) };
}

export async function rapidFireHistory(userId: string, syllabusVersionId: string) {
  const [best, recent] = await Promise.all([
    prisma.rapidFireRun.aggregate({ where: { userId, syllabusVersionId }, _max: { score: true }, _count: true }),
    prisma.rapidFireRun.findMany({ where: { userId, syllabusVersionId }, orderBy: { createdAt: "desc" }, take: 5, select: { score: true, answered: true, correct: true, createdAt: true } }),
  ]);
  return { best: best._max.score ?? 0, rounds: best._count, recent };
}
