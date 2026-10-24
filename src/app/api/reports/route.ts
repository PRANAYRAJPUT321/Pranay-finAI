import { z } from "zod";
import { withUser, readJson, ApiError } from "@/server/api";
import { prisma } from "@/server/db";
import { checkRateLimit } from "@/server/auth/rate-limit";

const schema = z
  .object({
    questionId: z.string().optional(),
    lessonId: z.string().optional(),
    formulaId: z.string().optional(),
    category: z.enum(["wrong_answer", "unclear", "outdated", "typo", "other"]),
    message: z.string().trim().min(5, "Please describe the problem").max(2000),
  })
  .refine((d) => [d.questionId, d.lessonId, d.formulaId].filter(Boolean).length === 1, "Report exactly one item");

export const POST = withUser(async ({ req, user }) => {
  const rl = await checkRateLimit(`report:${user.id}`, 20, 3600);
  if (!rl.allowed) throw new ApiError("Too many reports — please try again later", 429);
  const data = schema.parse(await readJson(req));
  const exists = data.questionId
    ? await prisma.question.count({ where: { id: data.questionId } })
    : data.lessonId
      ? await prisma.lesson.count({ where: { id: data.lessonId } })
      : await prisma.formula.count({ where: { id: data.formulaId } });
  if (!exists) throw new ApiError("Item not found", 404);
  await prisma.contentReport.create({ data: { ...data, userId: user.id } });
  return { ok: true };
});
