/**
 * Topic proficiency heuristic. Transparent by design:
 *   estimate = (prior * k + sum(w_i * correct_i)) / (k + sum(w_i))
 * with recency weight 0.5^(age/30 days), difficulty weight {0.8, 1.0, 1.2},
 * prior 0.5 and pseudo-count k = 2 (shrinks small samples toward 50%).
 * Mastery labels require minimum evidence. This is a heuristic, not a
 * validated psychometric model.
 */
import type { Mastery } from "@prisma/client";

export interface Evidence {
  correct: boolean;
  difficulty: number;
  timeRatio: number | null; // time spent / estimated time
  answeredAt: Date;
  attemptId: string;
  delayed: boolean; // answered >= 7 days after the learner first saw this topic
}

export interface ProficiencySummary {
  estimate: number;
  attempts: number;
  correct: number;
  recentAccuracy: number | null;
  avgTimeRatio: number | null;
  sessions: number;
  delayedAccuracy: number | null;
  mastery: Mastery;
}

export const PRIOR = 0.5;
export const PSEUDO_COUNT = 2;
export const HALF_LIFE_DAYS = 30;
export const MASTERY_RULES = {
  minEvidence: 5,
  masteredMinAttempts: 12,
  masteredMinSessions: 2,
  masteredMinEstimate: 0.85,
  proficientMinEstimate: 0.7,
  developingMinEstimate: 0.5,
  masteredMinDelayedAccuracy: 0.7,
};

const DIFFICULTY_WEIGHT: Record<number, number> = { 1: 0.8, 2: 1.0, 3: 1.2 };

export function summarize(evidence: Evidence[], now: Date): ProficiencySummary {
  if (evidence.length === 0) {
    return { estimate: PRIOR, attempts: 0, correct: 0, recentAccuracy: null, avgTimeRatio: null, sessions: 0, delayedAccuracy: null, mastery: "NOT_STARTED" };
  }
  const sorted = [...evidence].sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime());
  let num = PRIOR * PSEUDO_COUNT;
  let den = PSEUDO_COUNT;
  for (const e of sorted) {
    const ageDays = Math.max(0, (now.getTime() - e.answeredAt.getTime()) / 86_400_000);
    const w = Math.pow(0.5, ageDays / HALF_LIFE_DAYS) * (DIFFICULTY_WEIGHT[e.difficulty] ?? 1);
    num += w * (e.correct ? 1 : 0);
    den += w;
  }
  const estimate = num / den;
  const correct = sorted.filter((e) => e.correct).length;
  const recent = sorted.slice(-10);
  const recentAccuracy = recent.filter((e) => e.correct).length / recent.length;
  const timed = sorted.filter((e) => e.timeRatio !== null && e.timeRatio > 0);
  const avgTimeRatio = timed.length ? timed.reduce((a, e) => a + (e.timeRatio as number), 0) / timed.length : null;
  const sessions = new Set(sorted.map((e) => e.attemptId)).size;
  const delayed = sorted.filter((e) => e.delayed);
  const delayedAccuracy = delayed.length >= 3 ? delayed.filter((e) => e.correct).length / delayed.length : null;
  return {
    estimate,
    attempts: sorted.length,
    correct,
    recentAccuracy,
    avgTimeRatio,
    sessions,
    delayedAccuracy,
    mastery: classify(estimate, sorted.length, sessions, delayedAccuracy),
  };
}

export function classify(estimate: number, attempts: number, sessions: number, delayedAccuracy: number | null): Mastery {
  const r = MASTERY_RULES;
  if (attempts === 0) return "NOT_STARTED";
  if (attempts < r.minEvidence) return "INSUFFICIENT_EVIDENCE";
  if (estimate < r.developingMinEstimate) return "NEEDS_WORK";
  if (estimate < r.proficientMinEstimate) return "DEVELOPING";
  const masteredEvidence =
    estimate >= r.masteredMinEstimate &&
    attempts >= r.masteredMinAttempts &&
    sessions >= r.masteredMinSessions &&
    (delayedAccuracy === null || delayedAccuracy >= r.masteredMinDelayedAccuracy);
  return masteredEvidence ? "MASTERED" : "PROFICIENT";
}

export const MASTERY_LABEL: Record<Mastery, string> = {
  NOT_STARTED: "Not started",
  INSUFFICIENT_EVIDENCE: "Not enough evidence yet",
  NEEDS_WORK: "Needs work",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  MASTERED: "Mastered",
};
