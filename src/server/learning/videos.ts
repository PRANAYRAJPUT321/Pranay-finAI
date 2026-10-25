import "server-only";
import { prisma } from "@/server/db";
import { lessonContentSchema } from "@/server/content/lesson-schema";
import { buildExplainer } from "@/lib/video/script";

/** Builds the explainer scenes for a published lesson. */
export async function getLessonExplainer(lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, status: "PUBLISHED" },
    include: { topic: { include: { parent: true, syllabus: { include: { level: { include: { program: true } } } } } } },
  });
  if (!lesson) return null;
  const content = lessonContentSchema.parse(lesson.content);
  const formulas = await prisma.formula.findMany({ where: { slug: { in: content.formulaSlugs } }, select: { name: true, expression: true, variables: true } });
  const lvl = lesson.topic.syllabus.level;
  const scenes = buildExplainer({
    title: lesson.title,
    programLabel: `${lvl.program.shortName} ${lvl.name}`,
    topic: lesson.topic.parent?.name ?? lesson.topic.name,
    content,
    formulas: formulas.map((f) => ({ ...f, variables: Array.isArray(f.variables) ? (f.variables as { symbol?: string; meaning?: string }[]) : [] })),
  });
  return { lesson, scenes };
}
