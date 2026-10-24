import { z } from "zod";

/**
 * Configurable examination structure stored on SyllabusVersion.structure.
 * Nothing here is assumed to be shared between programs: each syllabus version
 * declares its own sections, timing, formats and scoring notes.
 */
export const examSectionSchema = z.object({
  name: z.string(),
  minutes: z.number().int().positive().nullable(),
  questionCount: z.number().int().positive(),
  formats: z.array(z.string()).default([]),
});

export const examStructureSchema = z.object({
  durationMinutes: z.number().int().positive().nullable(),
  sections: z.array(examSectionSchema).min(1),
  questionFormats: z.array(z.string()).min(1),
  scoring: z.object({
    method: z.string(),
    // Only populated when an official, verified passing standard exists.
    passingScore: z.string().nullable(),
    passingScoreVerified: z.boolean().default(false),
    notes: z.string().default(""),
  }),
  calculatorPolicy: z.string(),
  formulaSheet: z.string(),
  navigation: z.enum(["free", "within_section"]).default("within_section"),
  notes: z.string().optional(),
});

export type ExamStructure = z.infer<typeof examStructureSchema>;
export type ExamSection = z.infer<typeof examSectionSchema>;

export function parseStructure(value: unknown): ExamStructure {
  return examStructureSchema.parse(value);
}

export function totalQuestions(structure: ExamStructure) {
  return structure.sections.reduce((a, s) => a + s.questionCount, 0);
}

export function totalMinutes(structure: ExamStructure) {
  return structure.sections.reduce((a, s) => a + (s.minutes ?? 0), 0);
}
