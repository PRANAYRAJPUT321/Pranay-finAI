import { after } from "next/server";
import { prisma } from "@/server/db";
import { utcDay } from "@/server/planner/generate";
import { sendPush } from "./push";
import { DEADLINE_MILESTONES, EXAM_MILESTONES, daysBetween, examCountdownMessage, reachedMilestone } from "./reminders";

type NewNotification = { type: string; title: string; body: string; link?: string };

/** Creates an in-app notification and, when web push is configured, delivers it to the learner's devices. */
export async function notify(userId: string, n: NewNotification) {
  const created = await prisma.notification.create({ data: { userId, ...n } });
  const push = () => sendPush(userId, { title: n.title, body: n.body, url: n.link }).catch((e) => console.warn("[push]", e));
  try {
    after(push);
  } catch {
    void push(); // outside a request (scripts, tests)
  }
  return created;
}

async function once(userId: string, n: NewNotification, since?: Date) {
  const exists = await prisma.notification.count({ where: { userId, type: n.type, ...(since ? { createdAt: { gte: since } } : {}) } });
  if (!exists) await notify(userId, n);
}

// Per-instance memo so the reminder queries run at most once per user per day per server instance.
const checked = new Map<string, string>();

/**
 * Informational reminders only — no streak-loss threats or other pressure tactics.
 * Learners can switch them off in Settings. Each reminder is created at most once
 * (daily ones once per day, milestones once per milestone).
 */
export async function ensureReminders(userId: string, now = new Date()) {
  const today = utcDay(now);
  const key = today.toISOString();
  if (checked.get(userId) === key) return;
  checked.set(userId, key);
  if (checked.size > 5000) checked.clear();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { inAppReminders: true } });
  if (!user?.inAppReminders) return;

  const [tasks, dueCards, enrollments] = await Promise.all([
    prisma.studyTask.findMany({
      where: { date: today, status: "PENDING", plan: { status: "active", enrollment: { userId, isPrimary: true } } },
      select: { estimatedMinutes: true },
    }),
    prisma.cardState.count({ where: { userId, suspended: false, dueAt: { lte: now } } }),
    prisma.enrollment.findMany({
      where: { userId, status: "active" },
      select: {
        id: true,
        targetExamDate: true,
        program: { select: { shortName: true } },
        level: { select: { name: true } },
        syllabus: { select: { windows: { where: { registrationDeadline: { gte: today } }, orderBy: { registrationDeadline: "asc" }, take: 1 } } },
      },
    }),
  ]);

  if (tasks.length) {
    const minutes = tasks.reduce((a, t) => a + t.estimatedMinutes, 0);
    await once(userId, { type: "daily_plan", title: "Today's plan", body: `${tasks.length} task${tasks.length > 1 ? "s" : ""} planned (about ${Math.round(minutes)} minutes).`, link: "/plan" }, today);
  }
  if (dueCards >= 5) {
    await once(userId, { type: "flashcards_due", title: `${dueCards} flashcards due`, body: "A short review now keeps them in long-term memory.", link: "/flashcards" }, today);
  }
  for (const e of enrollments) {
    const label = `${e.program.shortName} ${e.level.name}`;
    if (e.targetExamDate) {
      const days = daysBetween(now, e.targetExamDate);
      const m = days === 0 ? 0 : reachedMilestone(days, EXAM_MILESTONES);
      if (m !== null) await once(userId, { type: `exam_countdown:${e.id}:${m}`, ...examCountdownMessage(days, label), link: "/dashboard" });
    }
    const w = e.syllabus.windows[0];
    if (w?.registrationDeadline) {
      const days = daysBetween(now, w.registrationDeadline);
      const m = reachedMilestone(days, DEADLINE_MILESTONES);
      if (m !== null)
        await once(userId, {
          type: `registration_deadline:${w.id}:${m}`,
          title: `${label}: registration closes in ${days} day${days === 1 ? "" : "s"}`,
          body: `${w.label} — confirm the deadline and fees on the official website before paying.`,
          link: "/guide",
        });
    }
  }
}
