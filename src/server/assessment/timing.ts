/** Server-authoritative timing for attempts. Pure functions of attempt state and "now". */

export interface TimedState {
  status: "IN_PROGRESS" | "PAUSED" | "SUBMITTED";
  timeLimitSeconds: number | null;
  elapsedSeconds: number;
  resumedAt: Date | null;
  currentSection: number;
  sectionElapsed: number; // total elapsed at the moment the current section started
  sections: { name: string; seconds: number | null; itemCount: number }[];
}

export function totalElapsed(s: TimedState, now: Date): number {
  const live = s.status === "IN_PROGRESS" && s.resumedAt ? Math.max(0, (now.getTime() - s.resumedAt.getTime()) / 1000) : 0;
  return Math.floor(s.elapsedSeconds + live);
}

export function remainingSeconds(s: TimedState, now: Date): number | null {
  if (s.timeLimitSeconds === null) return null;
  return Math.max(0, s.timeLimitSeconds - totalElapsed(s, now));
}

export function sectionRemaining(s: TimedState, now: Date): number | null {
  const section = s.sections[s.currentSection];
  if (!section || section.seconds === null) return remainingSeconds(s, now);
  return Math.max(0, section.seconds - (totalElapsed(s, now) - s.sectionElapsed));
}

export type TimeVerdict = { kind: "ok" } | { kind: "advance_section"; to: number } | { kind: "expired" };

/** What must happen because of the clock, evaluated on every request touching the attempt. */
export function evaluateClock(s: TimedState, now: Date): TimeVerdict {
  if (s.status === "SUBMITTED") return { kind: "ok" };
  const total = remainingSeconds(s, now);
  if (total !== null && total <= 0) return { kind: "expired" };
  const section = s.sections[s.currentSection];
  if (section?.seconds != null && (sectionRemaining(s, now) ?? 1) <= 0) {
    if (s.currentSection + 1 >= s.sections.length) return { kind: "expired" };
    return { kind: "advance_section", to: s.currentSection + 1 };
  }
  return { kind: "ok" };
}
