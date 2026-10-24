"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { recordActivity } from "@/server/learning/gamification";
import { createNote, deleteNote, toggleBookmark, toggleHighlight, updateNote } from "@/server/learning/notes";
import { createCard, deleteCard, reviewCard, setSuspended, suggestFromLesson, verifyCard } from "@/server/learning/flashcards";
import { createAttempt } from "@/server/assessment/service";
import type { ActionState } from "@/components/forms";
import type { Rating } from "@/server/adaptive/srs";

export async function completeLessonAction(lessonId: string, form: FormData) {
  const user = await requireUser();
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, status: "PUBLISHED" }, include: { topic: { select: { syllabusVersionId: true } } } });
  if (!lesson) return;
  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  if (existing?.status === "completed") return;
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId, status: "completed", completedAt: new Date() },
    update: { status: "completed", completedAt: new Date() },
  });
  const enrollment = await prisma.enrollment.findFirst({ where: { userId: user.id, syllabusVersionId: lesson.topic.syllabusVersionId } });
  const minutes = Math.min(240, Math.max(1, Number(form.get("minutes") ?? lesson.estimatedMinutes) || lesson.estimatedMinutes));
  await recordActivity(user.id, { enrollmentId: enrollment?.id, minutes, activity: "lesson", meaningful: true, event: { type: "lesson_completed" } });
  revalidatePath(`/learn/${lessonId}`);
  revalidatePath("/learn");
}

export async function knowledgeCheckAction(lessonId: string) {
  const user = await requireUser();
  const lesson = await prisma.lesson.findFirstOrThrow({ where: { id: lessonId, status: "PUBLISHED" }, include: { topic: true } });
  const keys = (lesson.content as { knowledgeCheck?: string[] }).knowledgeCheck ?? [];
  const questions = await prisma.question.findMany({ where: { externalKey: { in: keys }, status: "PUBLISHED" }, select: { id: true } });
  const enrollment = await prisma.enrollment.findFirst({ where: { userId: user.id, syllabusVersionId: lesson.topic.syllabusVersionId } });
  const attempt = await createAttempt(user.id, {
    enrollmentId: enrollment?.id,
    syllabusVersionId: lesson.topic.syllabusVersionId,
    kind: "KNOWLEDGE_CHECK",
    mode: "UNTIMED",
    feedback: "immediate",
    questionIds: questions.map((q) => q.id),
    count: questions.length || 1,
    title: `Knowledge check — ${lesson.title}`,
  });
  redirect(`/attempt/${attempt.id}`);
}

export async function bookmarkAction(target: { lessonId?: string; formulaId?: string; questionId?: string }, path: string) {
  const user = await requireUser();
  await toggleBookmark(user.id, target);
  revalidatePath(path);
  revalidatePath("/notes");
}

export async function createNoteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await createNote(user.id, {
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
      lessonId: (form.get("lessonId") as string) || null,
      topicId: (form.get("topicId") as string) || null,
      formulaId: (form.get("formulaId") as string) || null,
      highlight: form.get("highlight") === "on",
    });
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0].message };
    throw e;
  }
  revalidatePath("/notes");
  const back = form.get("path");
  if (typeof back === "string" && back.startsWith("/")) revalidatePath(back);
  return { message: "Note saved." };
}

export async function updateNoteAction(noteId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await updateNote(user.id, noteId, { title: String(form.get("title") ?? ""), body: String(form.get("body") ?? ""), highlight: form.get("highlight") === "on" });
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : (e as Error).message };
  }
  revalidatePath("/notes");
  return { message: "Saved." };
}

export async function deleteNoteAction(noteId: string) {
  const user = await requireUser();
  await deleteNote(user.id, noteId);
  revalidatePath("/notes");
}

export async function toggleHighlightAction(noteId: string) {
  const user = await requireUser();
  await toggleHighlight(user.id, noteId);
  revalidatePath("/notes");
}

export async function suggestCardsAction(lessonId: string) {
  const user = await requireUser();
  await suggestFromLesson(user.id, lessonId);
  redirect("/flashcards?tab=suggested");
}

export async function reviewCardAction(flashcardId: string, rating: number) {
  const user = await requireUser();
  await reviewCard(user.id, flashcardId, rating as Rating);
  revalidatePath("/flashcards");
}

export async function createCardAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await createCard(user.id, { front: String(form.get("front") ?? ""), back: String(form.get("back") ?? ""), topicId: (form.get("topicId") as string) || null });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/flashcards");
  return { message: "Card added to your review queue." };
}

export async function deleteCardAction(flashcardId: string) {
  const user = await requireUser();
  await deleteCard(user.id, flashcardId);
  revalidatePath("/flashcards");
}

export async function verifyCardAction(flashcardId: string) {
  const user = await requireUser();
  await verifyCard(user.id, flashcardId);
  revalidatePath("/flashcards");
}

export async function suspendCardAction(flashcardId: string, suspended: boolean) {
  const user = await requireUser();
  await setSuspended(user.id, flashcardId, suspended);
  revalidatePath("/flashcards");
}
