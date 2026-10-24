import { prisma } from "@/server/db";

export async function editorLookups(syllabusVersionId: string) {
  const [topics, outcomes, formulas] = await Promise.all([
    prisma.topic.findMany({ where: { syllabusVersionId, parentId: null }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.learningOutcome.findMany({ where: { topic: { syllabusVersionId } }, include: { topic: { select: { name: true } } } }),
    prisma.formula.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { topics, outcomes: outcomes.map((o) => ({ id: o.id, label: `${o.topic.name} — ${o.statement.slice(0, 70)}` })), formulas };
}
