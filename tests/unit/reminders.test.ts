import { describe, expect, it } from "vitest";
import { DEADLINE_MILESTONES, EXAM_MILESTONES, daysBetween, examCountdownMessage, reachedMilestone } from "@/server/notifications/reminders";
import { daysUntil, parseExamInfo } from "@/server/catalog/exam-info";
import { examInfo } from "../../prisma/seed/exam-info";

describe("reminder rules", () => {
  it("counts whole UTC days", () => {
    expect(daysBetween(new Date("2026-10-24T23:59:00Z"), new Date("2026-10-25T00:01:00Z"))).toBe(1);
    expect(daysBetween(new Date("2026-10-24T10:00:00Z"), new Date("2026-10-24T20:00:00Z"))).toBe(0);
  });

  it("picks the tightest milestone reached", () => {
    expect(reachedMilestone(90, EXAM_MILESTONES)).toBeNull();
    expect(reachedMilestone(60, EXAM_MILESTONES)).toBe(60);
    expect(reachedMilestone(25, EXAM_MILESTONES)).toBe(30);
    expect(reachedMilestone(7, EXAM_MILESTONES)).toBe(7);
    expect(reachedMilestone(1, DEADLINE_MILESTONES)).toBe(1);
    expect(reachedMilestone(-1, DEADLINE_MILESTONES)).toBeNull();
  });

  it("writes calm, informational countdown messages", () => {
    expect(examCountdownMessage(0, "CFA Level I").title).toBe("CFA Level I is today");
    expect(examCountdownMessage(1, "FRM Part I").title).toBe("1 day to FRM Part I");
    expect(examCountdownMessage(45, "CPA FAR").body).not.toMatch(/fail|lose|streak/i);
  });
});

describe("exam facts data", () => {
  it("every researched entry validates and cites at least one source", () => {
    const entries = Object.entries(examInfo);
    expect(entries.length).toBeGreaterThanOrEqual(25);
    for (const [key, value] of entries) {
      const info = parseExamInfo(value);
      expect(info, key).not.toBeNull();
      expect(info!.sources.length, key).toBeGreaterThan(0);
      for (const u of info!.upcoming) {
        if (u.start) expect(Number.isNaN(Date.parse(u.start)), `${key} ${u.label}`).toBe(false);
        if (u.deadline) expect(Number.isNaN(Date.parse(u.deadline)), `${key} ${u.label}`).toBe(false);
      }
    }
  });

  it("daysUntil ignores past dates", () => {
    const now = new Date("2026-10-24T12:00:00Z");
    expect(daysUntil("2026-10-31", now)).toBe(7);
    expect(daysUntil("2026-10-01", now)).toBeNull();
    expect(daysUntil(undefined, now)).toBeNull();
  });
});
