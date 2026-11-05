import "server-only";
import { prisma } from "@/server/db";
import { lessonContentSchema } from "@/server/content/lesson-schema";
import { buildExplainer } from "@/lib/video/script";
import { choicePayloadSchema } from "@/server/assessment/question-schema";
import { createRng, shuffle } from "@/server/assessment/selection";

function seed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Builds the explainer scenes for a published lesson. */
export async function getLessonExplainer(lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, status: "PUBLISHED" },
    include: { topic: { include: { parent: true, syllabus: { include: { level: { include: { program: true } } } } } } },
  });
  if (!lesson) return null;
  const content = lessonContentSchema.parse(lesson.content);
  const [formulas, check] = await Promise.all([
    prisma.formula.findMany({ where: { slug: { in: content.formulaSlugs } }, select: { name: true, expression: true, variables: true } }),
    content.knowledgeCheck.length
      ? prisma.question.findFirst({ where: { externalKey: { in: content.knowledgeCheck }, type: "MCQ", status: "PUBLISHED" }, select: { id: true, stem: true, payload: true } })
      : Promise.resolve(null),
  ]);
  // Options are shuffled and sent without the answer key; answers are checked by a server action.
  const quiz = check
    ? { id: check.id, stem: check.stem, options: shuffle(choicePayloadSchema.parse(check.payload).options, createRng(seed(check.id))).map((o) => ({ id: o.id, text: o.text })) }
    : null;
  const lvl = lesson.topic.syllabus.level;
  const scenes = buildExplainer({
    title: lesson.title,
    programLabel: `${lvl.program.shortName} ${lvl.name}`,
    topic: lesson.topic.parent?.name ?? lesson.topic.name,
    content,
    formulas: formulas.map((f) => ({ ...f, variables: Array.isArray(f.variables) ? (f.variables as { symbol?: string; meaning?: string }[]) : [] })),
    quiz,
  });
  return { lesson, scenes };
}
