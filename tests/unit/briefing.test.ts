import { describe, expect, it } from "vitest";
import { briefingSeconds, buildBriefing, greetingFor, type BriefingInput } from "@/lib/video/briefing";

const base: BriefingInput = {
  firstName: "Asha",
  examLabel: "CFA Level I",
  daysLeft: 120,
  streak: 4,
  weekMinutes: 300,
  weeklyTargetMinutes: 600,
  accuracy: 0.68,
  coverage: 0.42,
  weakestTopic: "Fixed Income",
  todayTasks: [{ title: "Learn: Bond valuation", minutes: 45 }],
  cardsDue: 12,
  dailyAnswered: false,
  hour: 8,
  dayIndex: 3,
};

describe("daily briefing", () => {
  it("greets by time of day", () => {
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(14)).toBe("Good afternoon");
    expect(greetingFor(21)).toBe("Good evening");
    expect(greetingFor(2)).toBe("Burning the midnight oil");
  });

  it("personalises every scene from the learner's data", () => {
    const s = buildBriefing(base);
    expect(s.map((x) => x.kind)).toEqual(["greeting", "countdown", "momentum", "mission", "mindset", "launch"]);
    expect(s[0].title).toBe("Good morning, Asha.");
    expect(s[1].big).toBe("120");
    expect(s[2].stats?.map((x) => x.display)).toEqual(["42%", "68%", "50%"]);
    expect(s[3].lines).toContain("Answer today's daily challenge");
    expect(s[3].lines.some((l) => l.includes("Fixed Income"))).toBe(true);
    expect(briefingSeconds(s)).toBeGreaterThan(30);
  });

  it("handles a missing exam date and an unanswered history honestly", () => {
    const s = buildBriefing({ ...base, daysLeft: null, accuracy: null, streak: 0, todayTasks: [], cardsDue: 0, weakestTopic: null, dailyAnswered: true });
    expect(s[1].title).toBe("Set your exam date");
    expect(s[2].stats?.[1].display).toBe("—");
    expect(s[3].lines).toEqual(["Take a short timed quiz to keep your edge"]);
    const text = JSON.stringify(s).toLowerCase();
    expect(text).not.toMatch(/guarantee|you will pass|certain to pass/);
  });
});
