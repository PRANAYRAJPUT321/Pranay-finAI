/** Lightweight keyword retrieval over PD FinPrep's own reviewed content. */
import { prisma } from "@/server/db";
import { lessonContentSchema } from "@/server/content/lesson-schema";
import type { Citation, GroundingItem } from "./types";

const STOP = new Set("the and for with that this what how why are was were from into your you can does about which when then than have has had not but its it's use using explain please tell me give show between".split(" "));

export function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9%\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)))];
}

export function scoreText(tokens: string[], weighted: [string, number][]) {
  let score = 0;
  for (const [text, w] of weighted) {
    const t = text.toLowerCase();
    for (const tok of tokens) if (t.includes(tok)) score += w;
  }
  return score;
}

export async function retrieve(query: string, opts: { syllabusVersionId?: string | null; focusLessonId?: string | null; focusTopicId?: string | null; limit?: number }): Promise<GroundingItem[]> {
  const tokens = tokenize(query);
  const lessons = await prisma.lesson.findMany({
    where: { status: "PUBLISHED", ...(opts.syllabusVersionId ? { topic: { syllabusVersionId: opts.syllabusVersionId } } : {}) },
    include: { topic: { select: { id: true, parentId: true } } },
  });
  const formulas = await prisma.formula.findMany({
    where: opts.syllabusVersionId ? { topics: { some: { topic: { syllabusVersionId: opts.syllabusVersionId } } } } : {},
  });
  type Scored = { score: number; item: GroundingItem };
  const scored: Scored[] = [];
  for (const l of lessons) {
    const c = lessonContentSchema.safeParse(l.content);
    if (!c.success) continue;
    const content = c.data;
    let score = scoreText(tokens, [
      [l.title, 4],
      [content.objectives.join(" "), 2],
      [content.summary.join(" "), 2],
      [content.explanations.intermediate, 1],
      [content.formal, 1],
      [content.misconceptions.map((m) => `${m.myth} ${m.reality}`).join(" "), 1],
    ]);
    if (opts.focusLessonId === l.id) score += 10;
    if (opts.focusTopicId && (l.topicId === opts.focusTopicId || l.topic.parentId === opts.focusTopicId)) score += 4;
    if (score <= 0) continue;
    const citation: Citation = { ref: "", type: "lesson", id: l.id, title: l.title, href: `/learn/${l.id}` };
    scored.push({
      score,
      item: {
        citation,
        excerpt: `${content.explanations.intermediate}\n\nFormal: ${content.formal}`.slice(0, 1800),
        objectives: content.objectives,
        misconceptions: content.misconceptions,
        example: content.workedExamples[0],
        summary: content.summary,
      },
    });
  }
  for (const f of formulas) {
    const score = scoreText(tokens, [
      [f.name, 4],
      [f.category, 2],
      [f.expression, 2],
      [f.assumptions, 1],
      [f.mistakes.join(" "), 1],
    ]);
    if (score <= 0) continue;
    const ex = f.example as { problem: string; steps: string[]; answer: string };
    scored.push({
      score,
      item: {
        citation: { ref: "", type: "formula", id: f.id, title: f.name, href: `/formulas/${f.slug}` },
        excerpt: `${f.name}: ${f.expression}\nAssumptions: ${f.assumptions}${f.conventions ? `\nConventions: ${f.conventions}` : ""}${f.appliesTo ? `\nApplies to: ${f.appliesTo}` : ""}`,
        mistakes: f.mistakes,
        example: { title: `${f.name} example`, problem: ex.problem, steps: ex.steps, answer: ex.answer },
      },
    });
  }
  const top = scored.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 4).map((s) => s.item);
  let l = 0;
  let f = 0;
  for (const it of top) it.citation.ref = it.citation.type === "lesson" ? `L${++l}` : `F${++f}`;
  return top;
}
