import { prisma } from "@/server/db";
import { review, type Rating } from "@/server/adaptive/srs";
import { recordActivity } from "./gamification";

export class FlashcardError extends Error {}

/** Cards visible to a learner: their own plus verified system cards for their syllabi. */
function visibleWhere(userId: string, syllabusIds: string[]) {
  return {
    OR: [{ ownerId: userId }, { ownerId: null, verified: true, topic: { syllabusVersionId: { in: syllabusIds } } }],
  };
}

async function learnerSyllabi(userId: string) {
  const e = await prisma.enrollment.findMany({ where: { userId, status: "active" }, select: { syllabusVersionId: true } });
  return e.map((x) => x.syllabusVersionId);
}

/** Ensures every visible card has a schedule row; new cards are due immediately. */
async function ensureStates(userId: string, syllabusIds: string[], topicId?: string) {
  const cards = await prisma.flashcard.findMany({
    where: { ...visibleWhere(userId, syllabusIds), ...(topicId ? { topicId } : {}), states: { none: { userId } } },
    select: { id: true },
    take: 500,
  });
  if (cards.length) {
    await prisma.cardState.createMany({ data: cards.map((c) => ({ userId, flashcardId: c.id, dueAt: new Date() })), skipDuplicates: true });
  }
}

export async function dueQueue(userId: string, opts: { topicId?: string; limit?: number; weakOnly?: boolean } = {}) {
  const syllabi = await learnerSyllabi(userId);
  await ensureStates(userId, syllabi, opts.topicId);
  let topicFilter: string[] | undefined = opts.topicId ? [opts.topicId] : undefined;
  if (opts.weakOnly) {
    const weak = await prisma.topicProficiency.findMany({ where: { userId, mastery: { in: ["NEEDS_WORK", "DEVELOPING"] } }, select: { topicId: true } });
    topicFilter = weak.map((w) => w.topicId);
  }
  return prisma.cardState.findMany({
    where: {
      userId,
      suspended: false,
      dueAt: { lte: new Date() },
      flashcard: { ...visibleWhere(userId, syllabi), ...(topicFilter ? { topicId: { in: topicFilter } } : {}) },
    },
    orderBy: [{ lapses: "desc" }, { dueAt: "asc" }],
    take: opts.limit ?? 30,
    include: { flashcard: { include: { topic: { select: { name: true } } } } },
  });
}

export async function dueCount(userId: string) {
  const syllabi = await learnerSyllabi(userId);
  await ensureStates(userId, syllabi);
  return prisma.cardState.count({ where: { userId, suspended: false, dueAt: { lte: new Date() }, flashcard: visibleWhere(userId, syllabi) } });
}

export async function reviewCard(userId: string, flashcardId: string, rating: Rating) {
  if (![1, 2, 3, 4].includes(rating)) throw new FlashcardError("Invalid rating");
  const state = await prisma.cardState.findUnique({ where: { userId_flashcardId: { userId, flashcardId } } });
  if (!state) throw new FlashcardError("Card not found");
  const next = review(state, rating, new Date());
  await prisma.$transaction([
    prisma.cardState.update({
      where: { id: state.id },
      data: { easeFactor: next.easeFactor, intervalDays: next.intervalDays, repetitions: next.repetitions, lapses: next.lapses, dueAt: next.dueAt, lastReviewedAt: new Date() },
    }),
    prisma.reviewLog.create({ data: { userId, flashcardId, rating, prevInterval: state.intervalDays, newInterval: next.intervalDays } }),
  ]);
  const todayReviews = await prisma.reviewLog.count({ where: { userId, reviewedAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } } });
  // Log ~0.5 minute per review in blocks of ten so streaks reflect real revision.
  if (todayReviews % 10 === 0) {
    await recordActivity(userId, { minutes: 5, activity: "flashcards", meaningful: true, event: { type: "cards_reviewed" } });
  }
  return next;
}

export async function createCard(userId: string, input: { front: string; back: string; topicId?: string | null }) {
  const front = input.front.trim();
  const back = input.back.trim();
  if (!front || !back) throw new FlashcardError("Both sides are required");
  if (front.length > 2000 || back.length > 4000) throw new FlashcardError("Card text is too long");
  const card = await prisma.flashcard.create({ data: { ownerId: userId, topicId: input.topicId || null, kind: "USER", front, back } });
  await prisma.cardState.create({ data: { userId, flashcardId: card.id, dueAt: new Date() } });
  return card;
}

export async function deleteCard(userId: string, flashcardId: string) {
  const res = await prisma.flashcard.deleteMany({ where: { id: flashcardId, ownerId: userId } });
  if (res.count === 0) throw new FlashcardError("You can only delete your own cards");
}

export async function setSuspended(userId: string, flashcardId: string, suspended: boolean) {
  await prisma.cardState.updateMany({ where: { userId, flashcardId }, data: { suspended } });
}

/**
 * Suggest cards from a lesson's key takeaways and misconceptions. Suggestions
 * are saved unverified; the learner confirms each before it enters review.
 */
export async function suggestFromLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, status: "PUBLISHED" } });
  if (!lesson) throw new FlashcardError("Lesson not found");
  const content = lesson.content as { summary?: string[]; misconceptions?: { myth: string; reality: string }[]; title?: string };
  const suggestions = [
    ...(content.summary ?? []).slice(0, 5).map((s, i) => ({ front: `${lesson.title}: key takeaway ${i + 1}?`, back: s })),
    ...(content.misconceptions ?? []).slice(0, 3).map((m) => ({ front: `True or false: ${m.myth}`, back: `False. ${m.reality}` })),
  ];
  const existing = await prisma.flashcard.findMany({ where: { ownerId: userId, front: { in: suggestions.map((s) => s.front) } }, select: { front: true } });
  const have = new Set(existing.map((e) => e.front));
  const fresh = suggestions.filter((s) => !have.has(s.front));
  await prisma.flashcard.createMany({
    data: fresh.map((s) => ({ ownerId: userId, topicId: lesson.topicId, kind: "USER" as const, front: s.front, back: s.back, origin: "ORIGINAL" as const, verified: false })),
  });
  return fresh.length;
}

export async function verifyCard(userId: string, flashcardId: string) {
  const card = await prisma.flashcard.findFirst({ where: { id: flashcardId, ownerId: userId } });
  if (!card) throw new FlashcardError("Card not found");
  await prisma.flashcard.update({ where: { id: card.id }, data: { verified: true } });
  await prisma.cardState.upsert({ where: { userId_flashcardId: { userId, flashcardId } }, create: { userId, flashcardId, dueAt: new Date() }, update: {} });
}

export async function revisionStats(userId: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const logs = await prisma.reviewLog.findMany({ where: { userId, reviewedAt: { gte: since } }, select: { rating: true, reviewedAt: true } });
  const forgotten = logs.filter((l) => l.rating === 1).length;
  const days = new Set(logs.map((l) => l.reviewedAt.toISOString().slice(0, 10)));
  return { reviews30d: logs.length, forgotten30d: forgotten, retention30d: logs.length ? 1 - forgotten / logs.length : null, reviewDays30d: days.size };
}
