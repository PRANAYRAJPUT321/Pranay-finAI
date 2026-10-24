import { describe, expect, it } from "vitest";
import { initialState, previewIntervals, ratingFromResult, review, MIN_EASE } from "@/server/adaptive/srs";
import { classify, summarize, type Evidence } from "@/server/adaptive/proficiency";
import { recommend, type TopicSignal } from "@/server/adaptive/recommend";
import { assessReadiness, type ReadinessInput } from "@/server/analytics/readiness";

const now = new Date("2026-06-01T12:00:00Z");
const DAY = 86_400_000;

describe("spaced repetition", () => {
  it("grows intervals with successful recall", () => {
    let s = { ...initialState(), dueAt: now };
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      s = review(s, 3, now);
      intervals.push(s.intervalDays);
    }
    expect(intervals[0]).toBe(1);
    expect(intervals[1]).toBe(3);
    expect(intervals[2]).toBeCloseTo(7.5);
    expect(intervals[3]).toBeGreaterThan(intervals[2]);
  });
  it("resets on a lapse and lowers ease, never below the minimum", () => {
    let s = review(review(initialState(), 3, now), 3, now);
    s = review(s, 1, now);
    expect(s.repetitions).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.dueAt.getTime() - now.getTime()).toBe(10 * 60_000);
    for (let i = 0; i < 20; i++) s = review(s, 1, now);
    expect(s.easeFactor).toBe(MIN_EASE);
  });
  it("easy > good > hard", () => {
    const st = review(review(initialState(), 3, now), 3, now);
    expect(review(st, 4, now).intervalDays).toBeGreaterThan(review(st, 3, now).intervalDays);
    expect(review(st, 3, now).intervalDays).toBeGreaterThan(review(st, 2, now).intervalDays);
    expect(previewIntervals(initialState(), now)[1]).toBe("10m");
  });
  it("maps question results to ratings", () => {
    expect(ratingFromResult(false, 3, 0.5)).toBe(1);
    expect(ratingFromResult(true, 1, 0.5)).toBe(2);
    expect(ratingFromResult(true, 3, 0.5)).toBe(4);
    expect(ratingFromResult(true, null, null)).toBe(3);
  });
});

function ev(correct: boolean, daysAgo: number, attemptId = "a1", difficulty = 2): Evidence {
  return { correct, difficulty, timeRatio: 1, answeredAt: new Date(now.getTime() - daysAgo * DAY), attemptId, delayed: false };
}

describe("proficiency heuristic", () => {
  it("starts at the prior with no evidence", () => {
    const s = summarize([], now);
    expect(s.estimate).toBe(0.5);
    expect(s.mastery).toBe("NOT_STARTED");
  });
  it("requires minimum evidence before labelling", () => {
    expect(summarize([ev(true, 0), ev(true, 0)], now).mastery).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("does not award mastery from a single session", () => {
    const s = summarize(Array.from({ length: 15 }, () => ev(true, 0)), now);
    expect(s.estimate).toBeGreaterThan(0.85);
    expect(s.mastery).toBe("PROFICIENT");
    const multi = summarize(Array.from({ length: 15 }, (_, i) => ev(true, 0, `a${i % 3}`)), now);
    expect(multi.mastery).toBe("MASTERED");
  });
  it("weights recent evidence more heavily", () => {
    const improving = summarize([...Array.from({ length: 6 }, () => ev(false, 60)), ...Array.from({ length: 6 }, () => ev(true, 1))], now);
    const declining = summarize([...Array.from({ length: 6 }, () => ev(true, 60)), ...Array.from({ length: 6 }, () => ev(false, 1))], now);
    expect(improving.estimate).toBeGreaterThan(declining.estimate);
  });
  it("blocks mastery when delayed retention is poor", () => {
    expect(classify(0.9, 20, 3, 0.5)).toBe("PROFICIENT");
    expect(classify(0.9, 20, 3, 0.8)).toBe("MASTERED");
    expect(classify(0.4, 20, 3, null)).toBe("NEEDS_WORK");
  });
});

function sig(p: Partial<TopicSignal> & { topicId: string }): TopicSignal {
  return { name: p.topicId, weight: 10, prerequisiteOf: [], mastery: "PROFICIENT", estimate: 0.8, attempts: 10, avgTimeRatio: 1, recentWrong: 0, dueReviews: 0, lastPracticedAt: now, lessonCompleted: true, ...p };
}

describe("recommendations", () => {
  it("orders by the documented priorities", () => {
    const recs = recommend(
      [
        sig({ topicId: "maintain", lastPracticedAt: new Date(now.getTime() - 30 * DAY) }),
        sig({ topicId: "slow", avgTimeRatio: 1.6 }),
        sig({ topicId: "due", dueReviews: 4 }),
        sig({ topicId: "wrong", recentWrong: 5, mastery: "PROFICIENT" }),
        sig({ topicId: "weak", weight: 15, mastery: "NEEDS_WORK", estimate: 0.4 }),
        sig({ topicId: "found", prerequisiteOf: ["x"], mastery: "NOT_STARTED", attempts: 0, lessonCompleted: false }),
      ],
      now,
      10,
    );
    expect(recs.map((r) => r.topicId)).toEqual(["found", "weak", "wrong", "due", "slow", "maintain"]);
    expect(recs[0].kind).toBe("learn");
    expect(recs[4].kind).toBe("timed_practice");
  });
});

describe("readiness", () => {
  const base: ReadinessInput = {
    mocks: [],
    topics: [{ topicId: "t", name: "T", weight: 20, estimate: 0.5, mastery: "INSUFFICIENT_EVIDENCE", attempts: 2, covered: false }],
    totalAttempts: 5,
    delayedAccuracy: null,
    hardAccuracy: null,
    avgTimeRatio: null,
    remainingStudyHours: null,
    daysToExam: 90,
    verifiedBenchmark: null,
  };
  it("reports insufficient evidence instead of a guess", () => {
    const r = assessReadiness(base);
    expect(r.category).toBe("INSUFFICIENT_EVIDENCE");
    expect(r.limitations.join(" ")).toMatch(/not a prediction/);
  });
  it("never outputs a probability", () => {
    const r = assessReadiness({
      ...base,
      totalAttempts: 400,
      mocks: [
        { scorePct: 80, submittedAt: now, representative: true, overtime: false },
        { scorePct: 78, submittedAt: new Date(now.getTime() - 7 * DAY), representative: true, overtime: false },
      ],
      topics: [{ topicId: "t", name: "T", weight: 20, estimate: 0.85, mastery: "MASTERED", attempts: 40, covered: true }],
    });
    expect(r.category).toBe("CONSISTENTLY_STRONG");
    expect(JSON.stringify(r)).not.toMatch(/probability of passing \d|chance of passing/i);
  });
});
