"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { logStudy } from "@/server/planner/service";
import { EngagementError, answerDailyChallenge, checkRapidAnswer, saveRapidFireRun } from "@/server/engagement/service";

const id = z.string().min(1).max(64);

export async function answerDailyAction(optionId: string) {
  const user = await requireUser();
  try {
    const view = await answerDailyChallenge(user.id, id.parse(optionId));
    revalidatePath("/dashboard");
    return { ok: true as const, view };
  } catch (e) {
    return { ok: false as const, error: e instanceof EngagementError ? e.message : "Could not save your answer. Please try again." };
  }
}

export async function rapidFireAnswerAction(questionId: string, optionId: string) {
  await requireUser();
  return checkRapidAnswer(id.parse(questionId), id.parse(optionId));
}

export async function rapidFireFinishAction(answered: number, correct: number) {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return { ok: false as const, error: "Choose an exam first." };
  try {
    return { ok: true as const, ...(await saveRapidFireRun(user.id, enrollment.syllabusVersionId, answered, correct)) };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

const focusInput = z.object({ minutes: z.number().int().min(1).max(180), activity: z.enum(["lesson", "practice", "flashcards", "mock", "tutor", "other"]) });

/** Logs a completed focus session as study time (counts towards streaks and weekly targets). */
export async function logFocusSessionAction(minutes: number, activity: string) {
  const user = await requireUser();
  const input = focusInput.safeParse({ minutes, activity });
  if (!input.success) return { ok: false as const, error: "Invalid session." };
  const enrollment = await getPrimaryEnrollment(user.id);
  try {
    await logStudy(user.id, { enrollmentId: enrollment?.id ?? null, minutes: input.data.minutes, activity: input.data.activity, note: "Focus timer session" });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
  revalidatePath("/dashboard");
  return { ok: true as const };
}
