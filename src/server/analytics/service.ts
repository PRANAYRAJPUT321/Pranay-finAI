import { prisma } from "@/server/db";
import { weightMid } from "@/server/catalog/service";
import { parseStructure } from "@/server/catalog/structure";
import { getRecommendations } from "@/server/adaptive/service";
import { addDays, toDateKey, utcDay } from "@/server/planner/generate";
import { assessReadiness } from "./readiness";
import type { AttemptConfig } from "@/server/assessment/service";

const DAY = 86_400_000;

function weekKey(d: Date) {
  const day = utcDay(d);
  return toDateKey(addDays(day, -((day.getUTCDay() + 6) % 7)));
}

function lastWeeks(n: number) {
  const keys: string[] = [];
  const thisWeek = new Date(`${weekKey(new Date())}T00:00:00Z`);
  for (let i = n - 1; i >= 0; i--) keys.push(toDateKey(addDays(thisWeek, -7 * i)));
  return keys;
}

export async function getAnalytics(userId: string, enrollment: { id: string; syllabusVersionId: string; targetExamDate: Date | null; hoursPerDay: number; studyDaysPerWeek: number }) {
  const now = new Date();
  const syllabusId = enrollment.syllabusVersionId;
  const [topics, items, mocks, logs, plan, reviewLogs, lessonDone, syllabus] = await Promise.all([
    prisma.topic.findMany({
      where: { syllabusVersionId: syllabusId, parentId: null },
      orderBy: { order: "asc" },
      include: {
        proficiencies: { where: { userId } },
        lessons: { where: { status: "PUBLISHED" }, select: { id: true } },
        children: { select: { lessons: { where: { status: "PUBLISHED" }, select: { id: true } } } },
      },
    }),
    prisma.attemptItem.findMany({
      where: { attempt: { userId, syllabusVersionId: syllabusId }, isCorrect: { not: null } },
      select: { isCorrect: true, timeSpentSeconds: true, answeredAt: true, errorCategory: true, response: true, question: { select: { topicId: true, difficulty: true, estimatedSeconds: true } } },
    }),
    prisma.attempt.findMany({
      where: { userId, syllabusVersionId: syllabusId, kind: "MOCK", status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      select: { id: true, title: true, scorePct: true, submittedAt: true, config: true, autoSubmitted: true, correctCount: true, totalCount: true, summary: true },
    }),
    prisma.studyLog.findMany({ where: { userId, OR: [{ enrollmentId: enrollment.id }, { enrollmentId: null }] }, select: { date: true, minutes: true, activity: true } }),
    prisma.studyPlan.findFirst({ where: { enrollmentId: enrollment.id, status: "active" }, include: { tasks: { select: { date: true, status: true, kind: true, estimatedMinutes: true } } } }),
    prisma.reviewLog.findMany({ where: { userId, reviewedAt: { gte: new Date(now.getTime() - 84 * DAY) } }, select: { rating: true, reviewedAt: true } }),
    prisma.lessonProgress.findMany({ where: { userId, status: "completed" }, select: { lessonId: true } }),
    prisma.syllabusVersion.findUniqueOrThrow({ where: { id: syllabusId } }),
  ]);

  const done = new Set(lessonDone.map((l) => l.lessonId));
  const topicRows = topics.map((t) => {
    const p = t.proficiencies[0];
    const lessonIds = [...t.lessons, ...t.children.flatMap((c) => c.lessons)].map((l) => l.id);
    const lessonsCompleted = lessonIds.filter((id) => done.has(id)).length;
    return {
      topicId: t.id,
      code: t.code,
      name: t.name,
      weight: weightMid(t),
      estimate: p?.estimate ?? 0.5,
      attempts: p?.attempts ?? 0,
      correct: p?.correct ?? 0,
      mastery: p?.mastery ?? ("NOT_STARTED" as const),
      avgTimeRatio: p?.avgTimeRatio ?? null,
      delayedAccuracy: p?.delayedAccuracy ?? null,
      lessonsCompleted,
      lessonsTotal: lessonIds.length,
      // Coverage = studied or practised; deliberately separate from mastery.
      covered: lessonsCompleted > 0 || (p?.attempts ?? 0) >= 5,
    };
  });

  const answered = items.filter((i) => i.response !== null);
  const correct = items.filter((i) => i.isCorrect).length;
  const timed = answered.filter((i) => i.timeSpentSeconds > 0);
  const avgSeconds = timed.length ? timed.reduce((a, i) => a + i.timeSpentSeconds, 0) / timed.length : null;
  const avgTarget = timed.length ? timed.reduce((a, i) => a + i.question.estimatedSeconds, 0) / timed.length : null;
  const hard = items.filter((i) => i.question.difficulty === 3);

  const weeks = lastWeeks(12);
  const accuracyByWeek = weeks.map((w) => {
    const inWeek = items.filter((i) => i.answeredAt && weekKey(i.answeredAt) === w);
    return { week: w, questions: inWeek.length, accuracy: inWeek.length ? (inWeek.filter((i) => i.isCorrect).length / inWeek.length) * 100 : null };
  });
  const hoursByWeek = weeks.map((w) => ({ week: w, hours: logs.filter((l) => weekKey(l.date) === w).reduce((a, l) => a + l.minutes, 0) / 60 }));
  const retentionByWeek = weeks.map((w) => {
    const inWeek = reviewLogs.filter((r) => weekKey(r.reviewedAt) === w);
    return { week: w, reviews: inWeek.length, retention: inWeek.length ? (inWeek.filter((r) => r.rating > 1).length / inWeek.length) * 100 : null };
  });

  const errorCounts: Record<string, number> = {};
  for (const i of items) if (!i.isCorrect && i.errorCategory) errorCounts[i.errorCategory] = (errorCounts[i.errorCategory] ?? 0) + 1;
  const wrongByTopic = topicRows
    .map((t) => ({ name: t.name, wrong: items.filter((i) => !i.isCorrect && i.question.topicId === t.topicId).length }))
    .filter((t) => t.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 5);

  const todayKey = toDateKey(utcDay(now));
  const dueTasks = plan?.tasks.filter((t) => toDateKey(t.date) <= todayKey) ?? [];
  const revisionDue = dueTasks.filter((t) => t.kind === "REVISION");
  const planCompliance = dueTasks.length ? dueTasks.filter((t) => t.status === "DONE").length / dueTasks.length : null;
  const revisionCompliance = revisionDue.length ? revisionDue.filter((t) => t.status === "DONE").length / revisionDue.length : null;
  const remainingMinutes = plan?.tasks.filter((t) => t.status === "PENDING" && toDateKey(t.date) >= todayKey).reduce((a, t) => a + t.estimatedMinutes, 0) ?? null;

  const delayedList = topicRows.filter((t) => t.delayedAccuracy !== null);
  const delayedAccuracy = delayedList.length ? delayedList.reduce((a, t) => a + (t.delayedAccuracy as number), 0) / delayedList.length : null;
  const structure = parseStructure(syllabus.structure);
  const verifiedBenchmark = structure.scoring.passingScoreVerified && structure.scoring.passingScore && syllabus.verificationStatus === "VERIFIED" ? structure.scoring.passingScore : null;
  const daysToExam = enrollment.targetExamDate ? Math.ceil((utcDay(enrollment.targetExamDate).getTime() - utcDay(now).getTime()) / DAY) : null;

  const mockRows = mocks.map((m) => {
    const cfg = m.config as unknown as AttemptConfig;
    return {
      id: m.id,
      title: m.title,
      scorePct: m.scorePct ?? 0,
      submittedAt: m.submittedAt!,
      mockType: cfg.mockType ?? "full",
      representative: (cfg.mockType === "full" || cfg.mockType === "half") && (m.totalCount ?? 0) >= 10,
      overtime: m.autoSubmitted,
      correct: m.correctCount ?? 0,
      total: m.totalCount ?? 0,
    };
  });

  const readiness = assessReadiness({
    mocks: mockRows.map((m) => ({ scorePct: m.scorePct, submittedAt: m.submittedAt, representative: m.representative, overtime: m.overtime })),
    topics: topicRows.map((t) => ({ topicId: t.topicId, name: t.name, weight: t.weight, estimate: t.estimate, mastery: t.mastery, attempts: t.attempts, covered: t.covered })),
    totalAttempts: items.length,
    delayedAccuracy,
    hardAccuracy: hard.length >= 5 ? hard.filter((i) => i.isCorrect).length / hard.length : null,
    avgTimeRatio: avgSeconds && avgTarget ? avgSeconds / avgTarget : null,
    remainingStudyHours: remainingMinutes === null ? null : remainingMinutes / 60,
    daysToExam,
    verifiedBenchmark,
  });

  const { recommendations } = await getRecommendations(userId, syllabusId, 6);

  return {
    topics: topicRows,
    overall: {
      questionsAnswered: items.length,
      accuracy: items.length ? correct / items.length : null,
      avgSeconds,
      avgTarget,
      studyHours: logs.reduce((a, l) => a + l.minutes, 0) / 60,
      coverage: topicRows.length ? topicRows.filter((t) => t.covered).length / topicRows.length : 0,
      masteredOrProficient: topicRows.filter((t) => t.mastery === "PROFICIENT" || t.mastery === "MASTERED").length,
      planCompliance,
      revisionCompliance,
      remainingStudyHours: remainingMinutes === null ? null : remainingMinutes / 60,
      daysToExam,
    },
    accuracyByWeek,
    hoursByWeek,
    retentionByWeek,
    mocks: mockRows,
    errorCounts,
    wrongByTopic,
    readiness,
    recommendations,
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
