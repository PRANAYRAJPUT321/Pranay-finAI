import { z } from "zod";

/** Researched, dated exam facts stored on ExamLevel.info. Always displayed with asOf + sources. */
export const examInfoSchema = z.object({
  asOf: z.string(), // YYYY-MM-DD the facts were collected
  officialUrl: z.string().url(),
  registrationUrl: z.string().url().optional(),
  format: z.string(),
  delivery: z.string().optional(), // e.g. "Computer-based at test centres", "On demand"
  fees: z.array(z.object({ label: z.string(), amount: z.string(), note: z.string().optional() })).default([]),
  feeNote: z.string().optional(),
  upcoming: z
    .array(
      z.object({
        label: z.string(),
        dates: z.string(), // human-readable, e.g. "22–28 Feb 2027" or "To be announced"
        start: z.string().optional(), // ISO date for countdowns
        end: z.string().optional(),
        registration: z.string().optional(),
        deadline: z.string().optional(), // ISO date of the next registration deadline
      }),
    )
    .default([]),
  passRate: z.object({ value: z.string(), period: z.string(), official: z.boolean() }).optional(),
  difficulty: z.number().int().min(1).max(5), // editorial 1 (accessible) .. 5 (very demanding)
  difficultyNote: z.string(),
  studyHours: z.string().optional(),
  passingStandard: z.string().optional(),
  notes: z.array(z.string()).default([]),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).min(1),
  verified: z.boolean().default(false), // true only once checked against the official page
});

export type ExamInfo = z.infer<typeof examInfoSchema>;

export function parseExamInfo(value: unknown): ExamInfo | null {
  const r = examInfoSchema.safeParse(value);
  return r.success ? r.data : null;
}

export const DIFFICULTY_LABEL = ["", "Accessible", "Moderate", "Challenging", "Demanding", "Very demanding"];

/** Days from today (UTC) until an ISO date; null when unknown or past. */
export function daysUntil(iso: string | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const d = Math.round((t - today) / 86_400_000);
  return d >= 0 ? d : null;
}
