import { describe, expect, it } from "vitest";
import { gradeResponse, isAnswered, verifyAnswerKey, withinTolerance } from "@/server/assessment/grading";
import { redactPayload, validatePayload } from "@/server/assessment/question-schema";
import { allocate, createRng, selectQuestions, shuffle, type PoolQuestion } from "@/server/assessment/selection";
import { evaluateClock, remainingSeconds, sectionRemaining, totalElapsed, type TimedState } from "@/server/assessment/timing";

const mcq = {
  options: [
    { id: "a", text: "1,043.76", correct: true, rationale: "PV of coupons and face at 2.5% per half-year." },
    { id: "b", text: "1,000.00", correct: false, rationale: "Par only if coupon = yield." },
    { id: "c", text: "1,086.59", correct: false, rationale: "Uses annual periods." },
  ],
};

describe("question payload validation", () => {
  it("requires exactly one correct option for MCQ", () => {
    expect(() => validatePayload("MCQ", { options: mcq.options.map((o) => ({ ...o, correct: true })) })).toThrow();
    expect(validatePayload("MCQ", mcq)).toBeTruthy();
  });
  it("requires rationales on every option", () => {
    expect(() => validatePayload("MCQ", { options: [{ ...mcq.options[0], rationale: "" }, mcq.options[1]] })).toThrow();
  });
  it("redacts correctness and rationales before sending to the browser", () => {
    const red = redactPayload("MCQ", mcq) as { options: Record<string, unknown>[] };
    expect(red.options[0]).toEqual({ id: "a", text: "1,043.76" });
    expect(JSON.stringify(red)).not.toContain("correct");
    expect(JSON.stringify(redactPayload("NUMERIC", { answer: 5, tolerance: 0.1 }))).not.toContain("5,");
  });
});

describe("grading", () => {
  it("grades MCQ deterministically", () => {
    expect(gradeResponse("MCQ", mcq, { selected: ["a"] }).isCorrect).toBe(true);
    expect(gradeResponse("MCQ", mcq, { selected: ["b"] }).isCorrect).toBe(false);
    expect(gradeResponse("MCQ", mcq, { selected: ["a", "b"] }).isCorrect).toBe(false);
    expect(gradeResponse("MCQ", mcq, null).isCorrect).toBe(false);
  });
  it("grades multiple-select all-or-nothing", () => {
    const p = { options: [{ id: "a", text: "A", correct: true, rationale: "x" }, { id: "b", text: "B", correct: true, rationale: "x" }, { id: "c", text: "C", correct: false, rationale: "x" }] };
    expect(gradeResponse("MULTI_SELECT", p, { selected: ["b", "a"] }).isCorrect).toBe(true);
    expect(gradeResponse("MULTI_SELECT", p, { selected: ["a"] }).isCorrect).toBe(false);
    expect(gradeResponse("MULTI_SELECT", p, { selected: ["a", "b", "c"] }).isCorrect).toBe(false);
  });
  it("grades numeric answers with absolute and relative tolerance", () => {
    const p = { answer: 1043.76, tolerance: 0.5, toleranceType: "absolute" as const, decimals: 2 };
    expect(gradeResponse("NUMERIC", p, { value: 1044.1 }).isCorrect).toBe(true);
    expect(gradeResponse("NUMERIC", p, { value: 1045 }).isCorrect).toBe(false);
    expect(withinTolerance(101, 100, 0.01, "relative")).toBe(true);
    expect(withinTolerance(102, 100, 0.01, "relative")).toBe(false);
  });
  it("marks written-response grading as indicative", () => {
    const p = { rubric: [{ criterion: "Mentions duration", points: 2, keywords: ["duration"] }, { criterion: "Mentions convexity", points: 1, keywords: ["convexity"] }], modelAnswer: "..." };
    const g = gradeResponse("WRITTEN", p, { text: "Use duration to estimate the change" });
    expect(g.indicative).toBe(true);
    expect(g.score).toBeCloseTo(2 / 3);
  });
  it("detects unanswered responses", () => {
    expect(isAnswered("NUMERIC", { value: null })).toBe(false);
    expect(isAnswered("MCQ", { selected: [] })).toBe(false);
    expect(isAnswered("WRITTEN", { text: "  " })).toBe(false);
  });
});

describe("answer-key verification", () => {
  const spec = { fn: "bondPrice", args: { face: 1000, couponRate: 0.06, ytm: 0.05, years: 5, frequency: 2 } };
  it("accepts a correct MCQ key", () => expect(verifyAnswerKey("MCQ", mcq, spec).ok).toBe(true));
  it("rejects a wrong MCQ key", () => {
    const wrong = { options: mcq.options.map((o) => ({ ...o, correct: o.id === "b" })) };
    expect(verifyAnswerKey("MCQ", wrong, spec).ok).toBe(false);
  });
  it("verifies numeric keys with scaling", () => {
    const capm = { fn: "capmRequiredReturn", args: { riskFree: 0.03, beta: 1.2, marketReturn: 0.08 }, scale: 100 };
    expect(verifyAnswerKey("NUMERIC", { answer: 9, tolerance: 0.01 }, capm).ok).toBe(true);
    expect(verifyAnswerKey("NUMERIC", { answer: 9.5, tolerance: 0.01 }, capm).ok).toBe(false);
  });
});

describe("question selection", () => {
  const pool: PoolQuestion[] = [];
  for (const t of ["t1", "t2", "t3"]) for (let i = 0; i < 10; i++) pool.push({ id: `${t}-${i}`, topicId: t, difficulty: (i % 3) + 1, itemSetId: null });
  pool.push({ id: "set-1", topicId: "t1", difficulty: 2, itemSetId: "S" }, { id: "set-2", topicId: "t1", difficulty: 2, itemSetId: "S" });

  it("is reproducible for a seed and varies across seeds", () => {
    const a = selectQuestions(pool, { count: 10, seed: 42 });
    expect(selectQuestions(pool, { count: 10, seed: 42 })).toEqual(a);
    expect(selectQuestions(pool, { count: 10, seed: 7 })).not.toEqual(a);
  });
  it("never selects duplicates and honours exclusions", () => {
    for (let seed = 1; seed < 50; seed++) {
      const ids = selectQuestions([...pool, ...pool], { count: 20, seed, excludeIds: new Set(["t1-0"]) });
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain("t1-0");
      expect(ids.length).toBe(20);
    }
  });
  it("distributes by topic weight", () => {
    const ids = selectQuestions(pool, { count: 10, seed: 3, weights: [{ topicId: "t1", weight: 50 }, { topicId: "t2", weight: 30 }, { topicId: "t3", weight: 20 }] });
    const count = (t: string) => ids.filter((id) => id.startsWith(t)).length;
    expect(count("t2")).toBe(3);
    expect(count("t3")).toBe(2);
    expect(ids.length).toBe(10);
  });
  it("keeps item sets together", () => {
    for (let seed = 1; seed < 30; seed++) {
      const ids = selectQuestions(pool, { count: 32, seed });
      const i = ids.indexOf("set-1");
      expect(Math.abs(ids.indexOf("set-2") - i)).toBe(1);
    }
  });
  it("returns everything available when the pool is smaller than requested", () => {
    expect(selectQuestions(pool.slice(0, 5), { count: 20, seed: 1 }).length).toBe(5);
  });
  it("allocates with capacity limits", () => {
    const a = allocate(10, [{ topicId: "x", weight: 90 }, { topicId: "y", weight: 10 }], { x: 3, y: 20 });
    expect(a).toEqual({ x: 3, y: 7 });
  });
  it("shuffle is a permutation", () => {
    const s = shuffle([1, 2, 3, 4, 5], createRng(1));
    expect([...s].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("timing", () => {
  const base: TimedState = {
    status: "IN_PROGRESS",
    timeLimitSeconds: 600,
    elapsedSeconds: 0,
    resumedAt: new Date("2026-01-01T10:00:00Z"),
    currentSection: 0,
    sectionElapsed: 0,
    sections: [
      { name: "Session 1", seconds: 300, itemCount: 5 },
      { name: "Session 2", seconds: 300, itemCount: 5 },
    ],
  };
  const at = (s: number) => new Date(base.resumedAt!.getTime() + s * 1000);
  it("counts elapsed time only while running", () => {
    expect(totalElapsed(base, at(120))).toBe(120);
    expect(totalElapsed({ ...base, status: "PAUSED", resumedAt: null, elapsedSeconds: 50 }, at(999))).toBe(50);
    expect(remainingSeconds(base, at(120))).toBe(480);
  });
  it("advances sections when section time runs out", () => {
    expect(sectionRemaining(base, at(200))).toBe(100);
    expect(evaluateClock(base, at(301))).toEqual({ kind: "advance_section", to: 1 });
  });
  it("expires at the total limit", () => {
    expect(evaluateClock({ ...base, currentSection: 1, sectionElapsed: 300 }, at(601))).toEqual({ kind: "expired" });
    expect(evaluateClock({ ...base, timeLimitSeconds: null, sections: [{ name: "All", seconds: null, itemCount: 5 }] }, at(99999))).toEqual({ kind: "ok" });
  });
});
