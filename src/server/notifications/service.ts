import { prisma } from "@/server/db";
import { utcDay } from "@/server/planner/generate";

/**
 * Creates at most one plan reminder per day, only for learners who enabled
 * in-app reminders. Reminders are informational; there are no streak-loss
 * threats or other pressure tactics.
 */
export async function ensureDailyReminder(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { inAppReminders: true } });
  if (!user?.inAppReminders) return;
  const today = utcDay(new Date());
  const already = await prisma.notification.count({ where: { userId, type: "daily_plan", createdAt: { gte: today } } });
  if (already) return;
  const tasks = await prisma.studyTask.findMany({
    where: { date: today, status: "PENDING", plan: { status: "active", enrollment: { userId, isPrimary: true } } },
    select: { estimatedMinutes: true },
  });
  if (tasks.length === 0) return;
  const minutes = tasks.reduce((a, t) => a + t.estimatedMinutes, 0);
  await prisma.notification.create({
    data: { userId, type: "daily_plan", title: "Today's plan", body: `${tasks.length} task${tasks.length > 1 ? "s" : ""} planned (about ${Math.round(minutes)} minutes).`, link: "/plan" },
  });
}
