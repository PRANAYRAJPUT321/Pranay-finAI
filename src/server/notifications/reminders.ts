/** Pure reminder rules (no I/O) so they can be unit tested. */

export const EXAM_MILESTONES = [60, 30, 14, 7, 3, 1] as const;
export const DEADLINE_MILESTONES = [14, 7, 3, 1] as const;

const DAY = 86_400_000;

/** Whole days from `now` to `date`, counted in UTC calendar days. */
export function daysBetween(now: Date, date: Date) {
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const b = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((b - a) / DAY);
}

/**
 * The tightest milestone that `daysLeft` has reached, or null. Using "reached"
 * rather than "equals" means a learner who was away on the exact day still gets
 * the most relevant reminder once (callers dedupe per milestone).
 */
export function reachedMilestone(daysLeft: number, milestones: readonly number[]) {
  if (daysLeft < 0) return null;
  const sorted = [...milestones].sort((x, y) => x - y);
  return sorted.find((m) => daysLeft <= m) ?? null;
}

export function examCountdownMessage(daysLeft: number, examLabel: string) {
  if (daysLeft === 0) return { title: `${examLabel} is today`, body: "Trust your preparation. Read every question carefully and manage your time." };
  if (daysLeft <= 7)
    return { title: `${daysLeft} day${daysLeft === 1 ? "" : "s"} to ${examLabel}`, body: "Final stretch: focus on formula review, weak topics and a timed mock. Avoid starting brand-new topics." };
  if (daysLeft <= 30) return { title: `${daysLeft} days to ${examLabel}`, body: "Your plan now shifts towards revision and full mock exams." };
  return { title: `${daysLeft} days to ${examLabel}`, body: "A good moment to check coverage and adjust your weekly hours if needed." };
}
