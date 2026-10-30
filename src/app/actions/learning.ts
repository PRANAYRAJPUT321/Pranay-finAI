"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/current";
import { archiveEnrollment, setPrimaryEnrollment, upsertEnrollment } from "@/server/learning/enrollment";
import { createAttempt, AttemptError } from "@/server/assessment/service";
import { buildPlan, logStudy, recoverMissed, rescheduleTask, setTaskStatus } from "@/server/planner/service";
import type { ActionState } from "@/components/forms";

const DIAGNOSTIC_SIZE = 20;

export async function onboardingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  let enrollment;
  try {
    enrollment = await upsertEnrollment(user.id, {
      levelId: String(form.get("levelId") ?? ""),
      targetExamDate: String(form.get("targetExamDate") ?? "") || undefined,
      targetWindowLabel: String(form.get("targetWindowLabel") ?? "") || undefined,
      priorKnowledge: String(form.get("priorKnowledge") ?? "none") as "none",
      hoursPerDay: Number(form.get("hoursPerDay") ?? 2),
      studyDaysPerWeek: Number(form.get("studyDaysPerWeek") ?? 5),
      preferredFormat: String(form.get("preferredFormat") ?? "mixed") as "mixed",
      confidentTopicIds: form.getAll("confidentTopicIds").map(String),
      difficultTopicIds: form.getAll("difficultTopicIds").map(String),
      accessTier: String(form.get("accessTier") ?? "FREE") as "FREE",
    });
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0].message };
    return { error: (e as Error).message };
  }
  if (form.get("next") === "diagnostic") {
    try {
      const attempt = await createAttempt(user.id, {
        enrollmentId: enrollment.id,
        syllabusVersionId: enrollment.syllabusVersionId,
        kind: "DIAGNOSTIC",
        mode: "UNTIMED",
        count: DIAGNOSTIC_SIZE,
      });
      revalidatePath("/", "layout"); // the app header shows the newly chosen exam
      redirect(`/attempt/${attempt.id}`);
    } catch (e) {
      if (!(e instanceof AttemptError)) throw e;
      // No questions yet for this syllabus: fall through to a self-assessment-based plan.
    }
  }
  await buildPlan(user.id, enrollment.id);
  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}

export async function setPrimaryAction(enrollmentId: string) {
  const user = await requireUser();
  await setPrimaryEnrollment(user.id, enrollmentId);
  revalidatePath("/", "layout");
}

export async function archiveEnrollmentAction(enrollmentId: string) {
  const user = await requireUser();
  await archiveEnrollment(user.id, enrollmentId);
  revalidatePath("/", "layout");
}

export async function rebuildPlanAction(enrollmentId: string) {
  const user = await requireUser();
  await buildPlan(user.id, enrollmentId);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function recoverMissedAction(enrollmentId: string) {
  const user = await requireUser();
  await recoverMissed(user.id, enrollmentId);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function taskStatusAction(taskId: string, status: "PENDING" | "DONE" | "SKIPPED", form: FormData) {
  const user = await requireUser();
  const minutes = Number(form.get("minutes") ?? 0);
  await setTaskStatus(user.id, taskId, status, Number.isFinite(minutes) ? minutes : 0);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function rescheduleAction(taskId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await rescheduleTask(user.id, taskId, String(form.get("date") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/plan");
  return { message: "Task moved." };
}

export async function logStudyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await logStudy(user.id, {
      enrollmentId: String(form.get("enrollmentId") ?? "") || null,
      minutes: Number(form.get("minutes")),
      activity: String(form.get("activity") ?? "other"),
      note: String(form.get("note") ?? "").slice(0, 300) || undefined,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { message: "Study time logged." };
}

/** Starts a practice/mock/revision attempt from a form and opens it. */
export async function startAttemptAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  let id: string;
  try {
    const attempt = await createAttempt(user.id, {
      enrollmentId: String(form.get("enrollmentId") ?? "") || undefined,
      syllabusVersionId: String(form.get("syllabusVersionId") ?? ""),
      kind: String(form.get("kind") ?? "PRACTICE") as "PRACTICE",
      mode: String(form.get("mode") ?? "UNTIMED") as "UNTIMED",
      topicIds: form.getAll("topicIds").map(String).filter(Boolean),
      count: Number(form.get("count") ?? 10),
      difficulty: form.get("difficulty") ? Number(form.get("difficulty")) : null,
      feedback: (String(form.get("feedback") ?? "") || undefined) as "immediate" | undefined,
      mockType: (String(form.get("mockType") ?? "") || undefined) as "full" | undefined,
      minutes: form.get("minutes") ? Number(form.get("minutes")) : undefined,
      similarToQuestionId: String(form.get("similarToQuestionId") ?? "") || undefined,
      formulaId: String(form.get("formulaId") ?? "") || undefined,
    });
    id = attempt.id;
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0].message };
    if (e instanceof AttemptError) return { error: e.message };
    throw e;
  }
  redirect(`/attempt/${id}`);
}
