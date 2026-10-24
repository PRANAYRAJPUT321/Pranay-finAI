import { describe, expect, it } from "vitest";
import { generatePlan, orderTopics, rebalance, studyDays, toDateKey, type PlanTopic } from "@/server/planner/generate";

const topics: PlanTopic[] = [
  { id: "quant", code: "QM", name: "Quantitative Methods", weight: 8, difficulty: 2, prerequisiteIds: [], proficiency: 0.3, hasLesson: true },
  { id: "fi", code: "FI", name: "Fixed Income", weight: 12, difficulty: 3, prerequisiteIds: ["quant"], proficiency: 0.2, hasLesson: true },
  { id: "eq", code: "EQ", name: "Equity", weight: 12, difficulty: 2, prerequisiteIds: ["quant"], proficiency: 0.6, hasLesson: true },
  { id: "eth", code: "ETH", name: "Ethics", weight: 17, difficulty: 2, prerequisiteIds: [], proficiency: null, hasLesson: true },
];
const start = new Date("2026-01-05T00:00:00Z"); // Monday

describe("study days", () => {
  it("respects study days per week", () => {
    const days = studyDays(start, new Date("2026-01-19T00:00:00Z"), 5);
    expect(days.length).toBe(10);
    expect(days.every((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6)).toBe(true);
  });
});

describe("topic ordering", () => {
  it("places prerequisites first", () => {
    const order = orderTopics(topics).map((t) => t.id);
    expect(order.indexOf("quant")).toBeLessThan(order.indexOf("fi"));
    expect(order.indexOf("quant")).toBeLessThan(order.indexOf("eq"));
  });
  it("survives prerequisite cycles", () => {
    const cyclic = [
      { ...topics[0], prerequisiteIds: ["fi"] },
      { ...topics[1], prerequisiteIds: ["quant"] },
    ];
    expect(orderTopics(cyclic)).toHaveLength(2);
  });
});

describe("plan generation", () => {
  const exam = new Date("2026-05-30T00:00:00Z");
  const plan = generatePlan({ topics, startDate: start, examDate: exam, hoursPerDay: 2, studyDaysPerWeek: 6, recommendedHours: 300 });

  it("covers every topic with learning and practice before the exam", () => {
    for (const t of topics) {
      expect(plan.tasks.some((x) => x.topicId === t.id && x.kind === "LEARN")).toBe(true);
      expect(plan.tasks.some((x) => x.topicId === t.id && x.kind === "PRACTICE")).toBe(true);
    }
    expect(plan.tasks.every((t) => t.date < toDateKey(exam))).toBe(true);
  });
  it("never exceeds daily capacity by more than one minimum block", () => {
    const perDay = new Map<string, number>();
    for (const t of plan.tasks.filter((x) => x.kind !== "MOCK")) perDay.set(t.date, (perDay.get(t.date) ?? 0) + t.estimatedMinutes);
    for (const m of perDay.values()) expect(m).toBeLessThanOrEqual(120 + 15);
  });
  it("reserves a final revision window with mocks and review", () => {
    expect(plan.summary.revisionDays).toBeGreaterThanOrEqual(3);
    expect(plan.tasks.filter((t) => t.kind === "MOCK").length).toBeGreaterThanOrEqual(2);
    expect(plan.tasks.some((t) => t.kind === "REVIEW_MOCK")).toBe(true);
    const lastLearn = plan.tasks.filter((t) => t.kind === "LEARN").map((t) => t.date).sort().pop()!;
    const firstMock = plan.tasks.filter((t) => t.kind === "MOCK").map((t) => t.date).sort()[0];
    expect(lastLearn < firstMock).toBe(true);
  });
  it("schedules spaced revision after first study", () => {
    const fiFirst = plan.tasks.find((t) => t.topicId === "fi" && t.kind === "LEARN")!;
    expect(plan.tasks.some((t) => t.topicId === "fi" && t.kind === "REVISION" && t.date > fiFirst.date)).toBe(true);
    expect(fiFirst.revisionDate).not.toBeNull();
  });
  it("prerequisites are studied before dependants", () => {
    const first = (id: string) => plan.tasks.find((t) => t.topicId === id)!.date;
    expect(first("quant") <= first("fi")).toBe(true);
  });
  it("warns when the workload does not fit", () => {
    const tight = generatePlan({ topics, startDate: start, examDate: new Date("2026-01-30T00:00:00Z"), hoursPerDay: 1, studyDaysPerWeek: 5, recommendedHours: 300 });
    expect(tight.warnings.some((w) => w.code === "OVERLOADED")).toBe(true);
  });
  it("rejects past exam dates", () => {
    const p = generatePlan({ topics, startDate: start, examDate: new Date("2025-12-01T00:00:00Z"), hoursPerDay: 2, studyDaysPerWeek: 5, recommendedHours: 300 });
    expect(p.tasks).toHaveLength(0);
    expect(p.warnings[0].code).toBe("PAST_DATE");
  });
});

describe("missed-session recovery", () => {
  it("moves overdue pending tasks forward without touching completed ones", () => {
    const moves = rebalance(
      [
        { id: "done", date: "2026-01-05", estimatedMinutes: 60, status: "DONE", kind: "LEARN" },
        { id: "missed1", date: "2026-01-05", estimatedMinutes: 60, status: "PENDING", kind: "LEARN" },
        { id: "missed2", date: "2026-01-06", estimatedMinutes: 60, status: "PENDING", kind: "PRACTICE" },
        { id: "future", date: "2026-01-08", estimatedMinutes: 90, status: "PENDING", kind: "PRACTICE" },
      ],
      new Date("2026-01-08T00:00:00Z"),
      new Date("2026-03-01T00:00:00Z"),
      2,
      6,
    );
    expect(moves.map((m) => m.id).sort()).toEqual(["missed1", "missed2"]);
    expect(moves.every((m) => m.newDate >= "2026-01-08")).toBe(true);
    // 2026-01-08 already holds 90 of 120 minutes, so a 60-minute task cannot go there.
    expect(moves.find((m) => m.id === "missed1")!.newDate).not.toBe("2026-01-08");
  });
});
