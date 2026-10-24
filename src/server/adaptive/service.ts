import type { Mastery } from "@prisma/client";
import { prisma } from "@/server/db";
import { weightMid } from "@/server/catalog/service";
import { summarize, type Evidence } from "./proficiency";
import { recommend, type TopicSignal } from "./recommend";
import { initialState, ratingFromResult, review } from "./srs";

const DAY = 86_400_000;

/** Rebuilds proficiency for the given topics from every graded response the learner has. */
export async function recomputeProficiency(userId: string, topicIds: string[]) {
  if (topicIds.length === 0) return;
  const now = new Date();
  const items = await prisma.attemptItem.findMany({
    where: {
      attempt: { userId },
      isCorrect: { not: null },
      answeredAt: { not: null },
      question: { topicId: { in: topicIds } },
    },
    select: {
      isCorrect: true,
      timeSpentSeconds: true,
      answeredAt: true,
      attemptId: true,
      attempt: { select: { status: true, config: true } },
      question: { select: { topicId: true, difficulty: true, estimatedSeconds: true } },
    },
    orderBy: { answeredAt: "asc" },
  });
  const byTopic = new Map<string, Evidence[]>();
  const firstSeen = new Map<string, number>();
  for (const it of items) {
    // Only count evidence that is final: submitted attempts or immediately-checked answers.
    const feedback = (it.attempt.config as { feedback?: string }).feedback;
    if (it.attempt.status !== "SUBMITTED" && feedback !== "immediate") continue;
    const t = it.question.topicId;
    const at = it.answeredAt!.getTime();
    if (!firstSeen.has(t)) firstSeen.set(t, at);
    const list = byTopic.get(t) ?? [];
    list.push({
      correct: !!it.isCorrect,
      difficulty: it.question.difficulty,
      timeRatio: it.timeSpentSeconds > 0 ? it.timeSpentSeconds / it.question.estimatedSeconds : null,
      answeredAt: it.answeredAt!,
      attemptId: it.attemptId,
      delayed: at - firstSeen.get(t)! >= 7 * DAY,
    });
    byTopic.set(t, list);
  }
  for (const topicId of topicIds) {
    const s = summarize(byTopic.get(topicId) ?? [], now);
    const last = byTopic.get(topicId)?.at(-1)?.answeredAt ?? null;
    await prisma.topicProficiency.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: { userId, topicId, ...s, lastPracticedAt: last },
      update: { ...s, lastPracticedAt: last },
    });
  }
}

/** Question-level spaced review: missed questions come back soon, known ones later. */
export async function updateQuestionReviews(
  userId: string,
  results: { questionId: string; correct: boolean; confidence: number | null; timeRatio: number | null }[],
) {
  const now = new Date();
  for (const r of results) {
    const existing = await prisma.questionReviewState.findUnique({ where: { userId_questionId: { userId, questionId: r.questionId } } });
    const state = existing ?? { ...initialState() };
    const next = review(state, ratingFromResult(r.correct, r.confidence, r.timeRatio), now);
    // Wrong answers are re-queued for the next day rather than 10 minutes later.
    const dueAt = r.correct ? next.dueAt : new Date(now.getTime() + DAY);
    const data = { easeFactor: next.easeFactor, intervalDays: next.intervalDays, repetitions: next.repetitions, lapses: next.lapses, dueAt, lastResult: r.correct };
    await prisma.questionReviewState.upsert({
      where: { userId_questionId: { userId, questionId: r.questionId } },
      create: { userId, questionId: r.questionId, ...data },
      update: data,
    });
  }
}

/** One mistake flashcard per missed question per learner. */
export async function createMistakeCards(userId: string, questionIds: string[]) {
  if (questionIds.length === 0) return 0;
  const existing = await prisma.flashcard.findMany({
    where: { ownerId: userId, kind: "MISTAKE", sourceQuestionId: { in: questionIds } },
    select: { sourceQuestionId: true },
  });
  const have = new Set(existing.map((e) => e.sourceQuestionId));
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds.filter((q) => !have.has(q)) } } });
  const now = new Date();
  for (const q of questions) {
    const stem = q.stem.length > 280 ? `${q.stem.slice(0, 277)}...` : q.stem;
    const card = await prisma.flashcard.create({
      data: {
        ownerId: userId,
        topicId: q.topicId,
        sourceQuestionId: q.id,
        kind: "MISTAKE",
        front: `You missed this question — what is the key idea?\n\n${stem}`,
        back: `${q.conceptTested}${q.commonMistake ? `\n\nAvoid: ${q.commonMistake}` : ""}\n\n${q.explanation}`,
        origin: "ORIGINAL",
        verified: true,
      },
    });
    await prisma.cardState.create({ data: { userId, flashcardId: card.id, dueAt: now } });
  }
  return questions.length;
}

/** Signals and recommendations for an enrollment's syllabus. */
export async function getTopicSignals(userId: string, syllabusVersionId: string): Promise<TopicSignal[]> {
  const now = new Date();
  const topics = await prisma.topic.findMany({
    where: { syllabusVersionId, parentId: null },
    orderBy: { order: "asc" },
    include: {
      dependents: { select: { topicId: true } },
      proficiencies: { where: { userId } },
      children: { select: { lessons: { where: { status: "PUBLISHED" }, select: { id: true } } } },
      lessons: { where: { status: "PUBLISHED" }, select: { id: true } },
    },
  });
  const topicIds = topics.map((t) => t.id);
  const [recentWrong, dueQuestions, dueCards, completedLessons] = await Promise.all([
    prisma.attemptItem.groupBy({
      by: ["questionId"],
      where: { attempt: { userId }, isCorrect: false, answeredAt: { gte: new Date(now.getTime() - 14 * DAY) }, question: { topicId: { in: topicIds } } },
      _count: true,
    }),
    prisma.questionReviewState.findMany({ where: { userId, dueAt: { lte: now }, question: { topicId: { in: topicIds } } }, select: { question: { select: { topicId: true } } } }),
    prisma.cardState.findMany({ where: { userId, suspended: false, dueAt: { lte: now }, flashcard: { topicId: { in: topicIds } } }, select: { flashcard: { select: { topicId: true } } } }),
    prisma.lessonProgress.findMany({ where: { userId, status: "completed" }, select: { lessonId: true } }),
  ]);
  const wrongQuestionTopics = await prisma.question.findMany({ where: { id: { in: recentWrong.map((r) => r.questionId) } }, select: { id: true, topicId: true } });
  const wrongByTopic = new Map<string, number>();
  for (const r of recentWrong) {
    const t = wrongQuestionTopics.find((q) => q.id === r.questionId)?.topicId;
    if (t) wrongByTopic.set(t, (wrongByTopic.get(t) ?? 0) + r._count);
  }
  const dueByTopic = new Map<string, number>();
  for (const d of dueQuestions) dueByTopic.set(d.question.topicId, (dueByTopic.get(d.question.topicId) ?? 0) + 1);
  for (const d of dueCards) if (d.flashcard.topicId) dueByTopic.set(d.flashcard.topicId, (dueByTopic.get(d.flashcard.topicId) ?? 0) + 1);
  const done = new Set(completedLessons.map((l) => l.lessonId));

  return topics.map((t) => {
    const p = t.proficiencies[0];
    const lessonIds = [...t.lessons, ...t.children.flatMap((c) => c.lessons)].map((l) => l.id);
    return {
      topicId: t.id,
      name: t.name,
      weight: weightMid(t),
      prerequisiteOf: t.dependents.map((d) => d.topicId),
      mastery: (p?.mastery ?? "NOT_STARTED") as Mastery,
      estimate: p?.estimate ?? 0.5,
      attempts: p?.attempts ?? 0,
      avgTimeRatio: p?.avgTimeRatio ?? null,
      recentWrong: wrongByTopic.get(t.id) ?? 0,
      dueReviews: dueByTopic.get(t.id) ?? 0,
      lastPracticedAt: p?.lastPracticedAt ?? null,
      lessonCompleted: lessonIds.length > 0 && lessonIds.some((id) => done.has(id)),
    };
  });
}

export async function getRecommendations(userId: string, syllabusVersionId: string, limit = 6) {
  const signals = await getTopicSignals(userId, syllabusVersionId);
  return { signals, recommendations: recommend(signals, new Date(), limit) };
}
