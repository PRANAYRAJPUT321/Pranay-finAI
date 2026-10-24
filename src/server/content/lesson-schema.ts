import { z } from "zod";

/** Structured lesson content stored in Lesson.content. */
export const lessonContentSchema = z.object({
  objectives: z.array(z.string()).min(1),
  prerequisites: z.array(z.string()).default([]),
  explanations: z.object({ beginner: z.string(), intermediate: z.string(), advanced: z.string() }),
  formal: z.string(),
  workedExamples: z.array(z.object({ title: z.string(), problem: z.string(), steps: z.array(z.string()), answer: z.string() })).default([]),
  formulaSlugs: z.array(z.string()).default([]),
  applications: z.array(z.string()).default([]),
  examExamples: z.array(z.object({ prompt: z.string(), insight: z.string() })).default([]),
  misconceptions: z.array(z.object({ myth: z.string(), reality: z.string() })).default([]),
  summary: z.array(z.string()).min(1),
  knowledgeCheck: z.array(z.string()).default([]), // question externalKeys
  references: z.array(z.object({ title: z.string(), publisher: z.string(), url: z.string().optional(), note: z.string().optional() })).default([]),
  table: z.object({ caption: z.string(), headers: z.array(z.string()), rows: z.array(z.array(z.string())) }).optional(),
  journalEntries: z
    .array(z.object({ description: z.string(), lines: z.array(z.object({ account: z.string(), debit: z.string().optional(), credit: z.string().optional() })) }))
    .optional(),
  calculatorKeys: z.array(z.string()).default([]),
});

export type LessonContent = z.infer<typeof lessonContentSchema>;
