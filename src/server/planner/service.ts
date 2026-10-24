import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { weightMid } from "@/server/catalog/service";
import { parseStructure, totalMinutes } from "@/server/catalog/structure";
import { recordActivity } from "@/server/learning/gamification";
import { addDays, generatePlan, rebalance, toDateKey, utcDay, type PlanTopic } from "./generate";

export class PlanError extends Error {}

const DEFAULT_WINDOW_DAYS = 120;

/** Builds (or rebuilds) the active plan for an enrollment, keeping history of completed work. */
export async function buildPlan(userId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findFirst({ where: { id: enrollmentId, userId }, include: { syllabus: true } });
  if (!enrollment) throw new PlanError("Exam plan not found");
  const topics = await prisma.topic.findMany({
    where: { syllabusVersionId: enrollment.syllabusVersionId, parentId: null },
    include: {
      prerequisites: true,
      proficiencies: { where: { userId } },
      lessons: { where: { status: "PUBLISHED" }, select: { id: true } },
      children: { select: { lessons: { where: { status: "PUBLISHED" }, select: { id: true } } } },
    },
  });
  const confident = new Set(enrollment.confidentTopicIds);
  const difficult = new Set(enrollment.difficultTopicIds);
  const priorBoost = enrollment.priorKnowledge === "strong" ? 0.15 : enrollment.priorKnowledge === "some" ? 0.05 : 0;
  const planTopics: PlanTopic[] = topics.map((t) => {
    const p = t.proficiencies[0];
    // Measured evidence wins; otherwise use self-reported confidence as a weak prior.
    let proficiency: number | null = p && p.attempts > 0 ? p.estimate : null;
    if (proficiency === null && (confident.has(t.id) || difficult.has(t.id) || priorBoost > 0)) {
      proficiency = 0.35 + priorBoost + (confident.has(t.id) ? 0.15 : 0) - (difficult.has(t.id) ? 0.15 : 0);
    }
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      weight: weightMid(t),
      difficulty: t.difficulty,
      prerequisiteIds: t.prerequisites.map((x) => x.prerequisiteId),
      proficiency,
      hasLesson: t.lessons.length + t.children.reduce((a, c) => a + c.lessons.length, 0) > 0,
    };
  });
  const today = utcDay(new Date());
  const examDate = enrollment.targetExamDate ?? addDays(today, DEFAULT_WINDOW_DAYS);
  const structure = parseStructure(enrollment.syllabus.structure);
  const result = generatePlan({
    topics: planTopics,
    startDate: today,
    examDate,
    hoursPerDay: enrollment.hoursPerDay,
    studyDaysPerWeek: enrollment.studyDaysPerWeek,
    recommendedHours: enrollment.syllabus.recommendedHours ?? 150,
    mockMinutes: totalMinutes(structure) || 180,
  });
  if (!enrollment.targetExamDate) {
    result.warnings.unshift({ code: "NO_DATE", message: `No exam date set — this plan assumes ${DEFAULT_WINDOW_DAYS} days. Set a date in My Exams for a precise schedule.` });
  }
  return prisma.$transaction(async (tx) => {
    await tx.studyPlan.updateMany({ where: { enrollmentId, status: "active" }, data: { status: "superseded" } });
    return tx.studyPlan.create({
      data: {
        enrollmentId,
        startDate: today,
        examDate,
        weeklyHours: enrollment.hoursPerDay * enrollment.studyDaysPerWeek,
        warnings: result.warnings as unknown as Prisma.InputJsonValue,
        summary: result.summary as unknown as Prisma.InputJsonValue,
        tasks: {
          create: result.tasks.map((t) => ({
            date: new Date(`${t.date}T00:00:00Z`),
            order: t.order,
            kind: t.kind,
            topicId: t.topicId,
            title: t.title,
            objective: t.objective,
            activity: t.activity,
            estimatedMinutes: t.estimatedMinutes,
            practiceTarget: t.practiceTarget,
            revisionDate: t.revisionDate ? new Date(`${t.revisionDate}T00:00:00Z`) : null,
          })),
        },
      },
    });
  });
}

export async function getActivePlan(enrollmentId: string) {
  return prisma.studyPlan.findFirst({ where: { enrollmentId, status: "active" }, orderBy: { createdAt: "desc" } });
}

export async function getTasks(planId: string, from: Date, to: Date) {
  return prisma.studyTask.findMany({
    where: { planId, date: { gte: utcDay(from), lte: utcDay(to) } },
    orderBy: [{ date: "asc" }, { order: "asc" }],
    include: { topic: { select: { id: true, name: true, code: true } } },
  });
}

async function ownedTask(userId: string, taskId: string) {
  const task = await prisma.studyTask.findFirst({ where: { id: taskId, plan: { enrollment: { userId } } }, include: { plan: { select: { enrollmentId: true } } } });
  if (!task) throw new PlanError("Task not found");
  return task;
}

export async function setTaskStatus(userId: string, taskId: string, status: "PENDING" | "DONE" | "SKIPPED", minutesSpent?: number) {
  const task = await ownedTask(userId, taskId);
  await prisma.studyTask.update({ where: { id: taskId }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
  if (status === "DONE" && minutesSpent && minutesSpent > 0) {
    await recordActivity(userId, {
      enrollmentId: task.plan.enrollmentId,
      minutes: minutesSpent,
      activity: task.kind === "MOCK" ? "mock" : task.kind === "LEARN" ? "lesson" : "practice",
      meaningful: true,
      taskId,
      event: { type: "manual_log" },
    });
  }
}

export async function rescheduleTask(userId: string, taskId: string, newDate: string) {
  const task = await ownedTask(userId, taskId);
  const date = new Date(`${newDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new PlanError("Invalid date");
  if (toDateKey(date) < toDateKey(utcDay(new Date()))) throw new PlanError("Choose today or a future date");
  await prisma.studyTask.update({ where: { id: taskId }, data: { date, rescheduledFrom: task.rescheduledFrom ?? task.date } });
}

/** Missed-session recovery: shift overdue pending tasks into upcoming capacity. */
export async function recoverMissed(userId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findFirst({ where: { id: enrollmentId, userId } });
  if (!enrollment) throw new PlanError("Exam plan not found");
  const plan = await getActivePlan(enrollmentId);
  if (!plan) throw new PlanError("No active plan");
  const tasks = await prisma.studyTask.findMany({ where: { planId: plan.id } });
  const moves = rebalance(
    tasks.map((t) => ({ id: t.id, date: toDateKey(t.date), estimatedMinutes: t.estimatedMinutes, status: t.status, kind: t.kind })),
    new Date(),
    plan.examDate,
    enrollment.hoursPerDay,
    enrollment.studyDaysPerWeek,
  );
  for (const m of moves) {
    const t = tasks.find((x) => x.id === m.id)!;
    await prisma.studyTask.update({ where: { id: m.id }, data: { date: new Date(`${m.newDate}T00:00:00Z`), rescheduledFrom: t.rescheduledFrom ?? t.date } });
  }
  return moves.length;
}

export async function overdueCount(planId: string) {
  return prisma.studyTask.count({ where: { planId, status: "PENDING", date: { lt: utcDay(new Date()) }, kind: { not: "MOCK" } } });
}

export async function logStudy(userId: string, input: { enrollmentId: string | null; minutes: number; activity: string; note?: string }) {
  if (!Number.isFinite(input.minutes) || input.minutes <= 0 || input.minutes > 600) throw new PlanError("Log between 1 and 600 minutes");
  if (input.enrollmentId) {
    const e = await prisma.enrollment.findFirst({ where: { id: input.enrollmentId, userId } });
    if (!e) throw new PlanError("Exam plan not found");
  }
  return recordActivity(userId, { ...input, meaningful: true, event: { type: "manual_log" } });
}
