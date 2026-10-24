"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current";
import { createTutorSession } from "@/server/ai/tutor";
import { prisma } from "@/server/db";

export async function newTutorSessionAction(form: FormData) {
  const user = await requireUser();
  const mode = String(form.get("mode") ?? "TEACH");
  const session = await createTutorSession(user.id, {
    mode: mode === "TEST_THINKING" || mode === "FIND_MISTAKE" ? mode : "TEACH",
    topicId: (form.get("topicId") as string) || null,
    lessonId: (form.get("lessonId") as string) || null,
  });
  const lesson = form.get("lessonId");
  redirect(`/tutor/${session.id}${lesson ? `?lesson=${lesson}` : ""}`);
}

export async function deleteTutorSessionAction(id: string) {
  const user = await requireUser();
  await prisma.tutorSession.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/tutor");
  redirect("/tutor");
}
