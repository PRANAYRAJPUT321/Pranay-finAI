/**
 * Streaks, achievements and study logging. Only meaningful learning actions
 * (completed lessons, submitted practice, flashcard reviews, mocks, logged study)
 * count — time merely spent in the app does not. Learners can disable all of it.
 */
import { prisma } from "@/server/db";
import { notify } from "@/server/notifications/service";
import { utcDay, toDateKey, addDays } from "@/server/planner/generate";

export const ACHIEVEMENTS: Record<string, { title: string; description: string }> = {
  first_diagnostic: { title: "Baseline set", description: "Completed your first diagnostic assessment." },
  first_lesson: { title: "First lesson", description: "Completed your first lesson." },
  lessons_10: { title: "Ten lessons", description: "Completed ten lessons." },
  first_practice: { title: "First practice set", description: "Submitted your first practice set." },
  questions_100: { title: "100 questions", description: "Answered 100 practice questions." },
  questions_500: { title: "500 questions", description: "Answered 500 practice questions." },
  first_mock: { title: "First mock", description: "Completed your first mock exam." },
  mock_80: { title: "Strong mock", description: "Scored 80% or more on a mock exam (practice simulation)." },
  streak_7: { title: "7-day streak", description: "Studied on 7 consecutive days." },
  streak_30: { title: "30-day streak", description: "Studied on 30 consecutive days." },
  cards_100: { title: "100 reviews", description: "Completed 100 flashcard reviews." },
  first_proficient: { title: "Topic proficient", description: "Reached 'Proficient' in a topic with enough evidence." },
};

export interface ActivityEvent {
  type: "attempt_submitted" | "lesson_completed" | "cards_reviewed" | "manual_log";
  kind?: string;
  scorePct?: number;
  total?: number;
  correct?: number;
}

export async function recordActivity(
  userId: string,
  input: { enrollmentId?: string | null; minutes: number; activity: string; meaningful: boolean; taskId?: string | null; note?: string; event: ActivityEvent },
) {
  if (input.minutes > 0 && input.meaningful) {
    await prisma.studyLog.create({
      data: {
        userId,
        enrollmentId: input.enrollmentId ?? null,
        taskId: input.taskId ?? null,
        date: utcDay(new Date()),
        minutes: Math.min(input.minutes, 600),
        activity: input.activity,
        note: input.note,
      },
    });
  }
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  return awardAchievements(userId, input.event);
}

async function grant(userId: string, key: string, meta?: object) {
  const res = await prisma.achievement.createMany({ data: [{ userId, key, meta }], skipDuplicates: true });
  if (res.count === 0) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { gamificationEnabled: true, inAppReminders: true } });
  if (user?.gamificationEnabled && user.inAppReminders) {
    const a = ACHIEVEMENTS[key];
    await notify(userId, { type: "achievement", title: `Milestone: ${a.title}`, body: a.description, link: "/analytics#achievements" });
  }
  return key;
}

export async function awardAchievements(userId: string, event: ActivityEvent) {
  const earned: string[] = [];
  const add = async (key: string, cond: boolean | (() => Promise<boolean>), meta?: object) => {
    const ok = typeof cond === "boolean" ? cond : await cond();
    if (ok) {
      const k = await grant(userId, key, meta);
      if (k) earned.push(k);
    }
  };
  if (event.type === "attempt_submitted") {
    if (event.kind === "DIAGNOSTIC") await add("first_diagnostic", true);
    if (event.kind === "PRACTICE" || event.kind === "TOPIC_QUIZ" || event.kind === "REVISION") await add("first_practice", true);
    if (event.kind === "MOCK") {
      await add("first_mock", true);
      await add("mock_80", (event.scorePct ?? 0) >= 80 && (event.total ?? 0) >= 20, { scorePct: event.scorePct });
    }
    const answered = await prisma.attemptItem.count({ where: { attempt: { userId }, isCorrect: { not: null } } });
    await add("questions_100", answered >= 100);
    await add("questions_500", answered >= 500);
    await add("first_proficient", async () => (await prisma.topicProficiency.count({ where: { userId, mastery: { in: ["PROFICIENT", "MASTERED"] } } })) > 0);
  }
  if (event.type === "lesson_completed") {
    const done = await prisma.lessonProgress.count({ where: { userId, status: "completed" } });
    await add("first_lesson", done >= 1);
    await add("lessons_10", done >= 10);
  }
  if (event.type === "cards_reviewed") {
    await add("cards_100", async () => (await prisma.reviewLog.count({ where: { userId } })) >= 100);
  }
  const streak = await currentStreak(userId);
  await add("streak_7", streak >= 7);
  await add("streak_30", streak >= 30);
  return earned;
}

/** Consecutive days (ending today or yesterday) with at least one meaningful study log. */
export async function currentStreak(userId: string, today = new Date()): Promise<number> {
  const logs = await prisma.studyLog.findMany({
    where: { userId, date: { gte: addDays(utcDay(today), -400) } },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
  });
  return streakFromDates(logs.map((l) => toDateKey(l.date)), today);
}

export function streakFromDates(dateKeys: string[], today: Date): number {
  const set = new Set(dateKeys);
  let d = utcDay(today);
  if (!set.has(toDateKey(d))) d = addDays(d, -1); // today not yet studied: streak continues from yesterday
  let streak = 0;
  while (set.has(toDateKey(d))) {
    streak += 1;
    d = addDays(d, -1);
  }
  return streak;
}

export async function weeklyMinutes(userId: string, today = new Date()) {
  const day = utcDay(today);
  const monday = addDays(day, -((day.getUTCDay() + 6) % 7));
  const agg = await prisma.studyLog.aggregate({ where: { userId, date: { gte: monday } }, _sum: { minutes: true } });
  return agg._sum.minutes ?? 0;
}
