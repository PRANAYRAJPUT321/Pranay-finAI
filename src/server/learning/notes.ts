import { z } from "zod";
import { prisma } from "@/server/db";

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(160),
  body: z.string().trim().min(1, "Write something").max(20000),
  topicId: z.string().optional().nullable(),
  lessonId: z.string().optional().nullable(),
  formulaId: z.string().optional().nullable(),
  highlight: z.boolean().default(false),
});

export async function createNote(userId: string, raw: z.input<typeof noteSchema>) {
  const data = noteSchema.parse(raw);
  return prisma.note.create({ data: { ...data, topicId: data.topicId || null, lessonId: data.lessonId || null, formulaId: data.formulaId || null, userId } });
}

export async function updateNote(userId: string, noteId: string, raw: z.input<typeof noteSchema>) {
  const data = noteSchema.parse(raw);
  const res = await prisma.note.updateMany({ where: { id: noteId, userId }, data: { title: data.title, body: data.body, highlight: data.highlight } });
  if (res.count === 0) throw new Error("Note not found");
}

export async function deleteNote(userId: string, noteId: string) {
  await prisma.note.deleteMany({ where: { id: noteId, userId } });
}

export async function toggleHighlight(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new Error("Note not found");
  await prisma.note.update({ where: { id: noteId }, data: { highlight: !note.highlight } });
}

type Target = { lessonId?: string; formulaId?: string; questionId?: string };

export async function toggleBookmark(userId: string, target: Target, label?: string) {
  const keys = Object.entries(target).filter(([, v]) => v);
  if (keys.length !== 1) throw new Error("Bookmark exactly one item");
  const where = { userId, lessonId: target.lessonId ?? null, formulaId: target.formulaId ?? null, questionId: target.questionId ?? null };
  const existing = await prisma.bookmark.findFirst({ where });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.bookmark.create({ data: { ...where, label: label?.slice(0, 160) } });
  return true;
}

export async function isBookmarked(userId: string, target: Target) {
  return !!(await prisma.bookmark.findFirst({ where: { userId, lessonId: target.lessonId ?? null, formulaId: target.formulaId ?? null, questionId: target.questionId ?? null } }));
}
