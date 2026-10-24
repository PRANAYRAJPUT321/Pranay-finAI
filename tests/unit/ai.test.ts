import { describe, expect, it } from "vitest";
import { executeTool, toolSpecs } from "@/server/ai/tools";
import { OfflineProvider } from "@/server/ai/offline";
import { buildSystemPrompt } from "@/server/ai/tutor";
import { scoreText, tokenize } from "@/server/ai/grounding";
import type { TutorPrompt } from "@/server/ai/types";

describe("calculator tools", () => {
  it("exposes every calculator with a JSON schema", () => {
    expect(toolSpecs.length).toBeGreaterThan(20);
    const fv = toolSpecs.find((t) => t.name === "calc_futureValue")!;
    expect(fv.schema.required).toEqual(["pv", "rate", "periods"]);
  });
  it("returns deterministic results and never throws on bad input", () => {
    const ok = executeTool("calc_capmRequiredReturn", { riskFree: 0.03, beta: 1.2, marketReturn: 0.08 });
    expect(JSON.parse(ok.output).result).toBeCloseTo(0.09, 10);
    const bad = executeTool("calc_npv", { rate: "x" });
    expect(bad.isError).toBe(true);
    expect(executeTool("calc_unknown", {}).isError).toBe(true);
    expect(executeTool("calc_npv", null).isError).toBe(true);
  });
});

const prompt = (mode: TutorPrompt["mode"], grounding: TutorPrompt["grounding"]): TutorPrompt => ({ system: "", history: [{ role: "user", content: "duration?" }], useCalculators: false, mode, grounding });
const item = {
  citation: { ref: "L1", type: "lesson" as const, id: "x", title: "Duration and Convexity", href: "/learn/x" },
  excerpt: "Duration measures price sensitivity.",
  objectives: ["Interpret modified duration."],
  misconceptions: [{ myth: "Duration equals maturity.", reality: "Only for zero-coupon bonds." }],
  summary: ["Use modified duration."],
};

describe("offline tutor", () => {
  it("labels itself and cites material in every mode", async () => {
    const p = new OfflineProvider();
    for (const mode of ["TEACH", "TEST_THINKING", "FIND_MISTAKE"] as const) {
      const r = await p.respond(prompt(mode, [item]));
      expect(r.text).toMatch(/not a generated/);
      expect(r.text).toContain("[L1]");
    }
    expect((await p.respond(prompt("TEST_THINKING", [item]))).text).toContain("True or false");
  });
  it("handles missing material honestly", async () => {
    const r = await new OfflineProvider().respond(prompt("TEACH", []));
    expect(r.text).toMatch(/couldn't find course material/);
  });
});

describe("tutor prompt and retrieval", () => {
  it("includes grounding, honesty and calculator rules plus syllabus context", () => {
    const s = buildSystemPrompt({ mode: "FIND_MISTAKE", level: "beginner", examLabel: "CFA Level I", syllabusLabel: "2026", verified: false, jurisdiction: null, calculatorPolicy: null, topicName: "Fixed Income" });
    expect(s).toMatch(/Find My Mistake/);
    expect(s).toMatch(/not yet verified/);
    expect(s).toMatch(/Never invent official exam rules/);
    expect(s).toMatch(/calculator tools/);
  });
  it("tokenizes and scores keyword matches", () => {
    const t = tokenize("Explain the modified duration of a bond!");
    expect(t).toEqual(expect.arrayContaining(["modified", "duration", "bond"]));
    expect(t).not.toContain("the");
    expect(scoreText(t, [["Duration and convexity", 4]])).toBe(4);
  });
});
