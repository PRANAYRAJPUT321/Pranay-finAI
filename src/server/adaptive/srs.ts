/**
 * Spaced repetition: a documented SM-2 variant with four honest recall ratings.
 * This is a rule-based scheduler; intervals adapt to each learner's observed
 * recall through the ease factor. It has not been statistically validated for
 * this product and is not described as such in the UI.
 */

export type Rating = 1 | 2 | 3 | 4; // again | hard | good | easy

export interface SrsState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export const RATING_LABELS: Record<Rating, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 365;
const RELEARN_MINUTES = 10;
const DAY_MS = 86_400_000;

export function initialState(): SrsState {
  return { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
}

export function review(state: SrsState, rating: Rating, now: Date): SrsState & { dueAt: Date } {
  let { easeFactor, intervalDays, repetitions, lapses } = state;
  if (rating === 1) {
    lapses += 1;
    repetitions = 0;
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    intervalDays = 0;
    return { easeFactor, intervalDays, repetitions, lapses, dueAt: new Date(now.getTime() + RELEARN_MINUTES * 60_000) };
  }
  if (rating === 2) {
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    intervalDays = repetitions === 0 ? 1 : Math.max(1, intervalDays * 1.2);
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = rating === 4 ? 4 : 3;
    else intervalDays = intervalDays * easeFactor;
    if (rating === 4) {
      easeFactor += 0.15;
      intervalDays *= 1.3;
    }
  }
  repetitions += 1;
  intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.round(intervalDays * 100) / 100);
  return { easeFactor, intervalDays, repetitions, lapses, dueAt: new Date(now.getTime() + intervalDays * DAY_MS) };
}

/** Maps an objective question result to a recall rating for question-level spaced review. */
export function ratingFromResult(correct: boolean, confidence: number | null, timeRatio: number | null): Rating {
  if (!correct) return 1;
  if (confidence === 1) return 2; // correct but a guess: review soon
  if (confidence === 3 && timeRatio !== null && timeRatio < 0.8) return 4;
  return 3;
}

/** Preview the next interval for each rating (shown on rating buttons). */
export function previewIntervals(state: SrsState, now: Date): Record<Rating, string> {
  const fmt = (s: SrsState & { dueAt: Date }) => {
    const mins = (s.dueAt.getTime() - now.getTime()) / 60_000;
    if (mins < 60) return `${Math.round(mins)}m`;
    const days = mins / 1440;
    return days < 30 ? `${Math.round(days)}d` : `${Math.round(days / 30)}mo`;
  };
  return {
    1: fmt(review(state, 1, now)),
    2: fmt(review(state, 2, now)),
    3: fmt(review(state, 3, now)),
    4: fmt(review(state, 4, now)),
  };
}
