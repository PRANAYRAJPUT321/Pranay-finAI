import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import type { Role } from "@prisma/client";

let n = 0;
export async function makeUser(role: Role = "STUDENT") {
  n += 1;
  return prisma.user.create({
    data: { email: `user${Date.now()}${n}@test.local`, name: `Test ${n}`, role, passwordHash: await hashPassword("Password1234") },
  });
}

export async function cfaLevel1() {
  const level = await prisma.examLevel.findFirstOrThrow({ where: { code: "L1", program: { slug: "cfa" } }, include: { syllabi: { where: { status: "CURRENT" } } } });
  return { level, syllabus: level.syllabi[0] };
}

export async function correctResponse(questionId: string) {
  const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  const p = q.payload as { options?: { id: string; correct: boolean }[]; answer?: number; modelAnswer?: string };
  if (q.type === "MCQ" || q.type === "MULTI_SELECT") return { selected: p.options!.filter((o) => o.correct).map((o) => o.id) };
  if (q.type === "NUMERIC") return { value: p.answer! };
  return { text: "cite the source and verify accuracy" };
}

export async function wrongResponse(questionId: string) {
  const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  const p = q.payload as { options?: { id: string; correct: boolean }[]; answer?: number };
  if (q.type === "MCQ" || q.type === "MULTI_SELECT") return { selected: [p.options!.find((o) => !o.correct)!.id] };
  if (q.type === "NUMERIC") return { value: p.answer! * 3 + 100 };
  return { text: "no idea" };
}
