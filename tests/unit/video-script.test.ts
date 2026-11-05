import { describe, expect, it } from "vitest";
import { buildExplainer, firstSentences, speakable, splitSentences, totalSeconds } from "@/lib/video/script";

const lesson = {
  title: "Bond pricing",
  programLabel: "CFA Level I",
  topic: "Fixed Income",
  content: {
    objectives: ["Price a bond from its cash flows.", "Explain the price–yield relationship."],
    explanations: { beginner: "A bond is a loan. Its price is the present value of what it pays. Higher yields mean lower prices.", intermediate: "Discount each coupon and the principal at the market yield. Sum them." },
    workedExamples: [{ title: "Annual coupon bond", problem: "A 3-year 5% bond yields 6%.", steps: ["Discount each coupon.", "Discount the principal.", "Add them."], answer: "97.33" }],
    misconceptions: [{ myth: "Coupon rate equals yield.", reality: "only when the bond trades at par." }],
    summary: ["Price = PV of cash flows.", "Price and yield move inversely."],
  },
  formulas: [{ name: "Bond price", expression: "P = Σ C/(1+r)^t + F/(1+r)^N", variables: [{ symbol: "C", meaning: "coupon" }, { symbol: "r", meaning: "yield per period" }] }],
};

describe("video explainer script", () => {
  it("splits sentences without breaking decimals", () => {
    expect(splitSentences("Price is 97.33 today. Yield is 6%.")).toEqual(["Price is 97.33 today.", "Yield is 6%."]);
  });

  it("limits intro passages", () => {
    expect(firstSentences("One. Two. Three. Four.", 2)).toEqual(["One.", "Two."]);
  });

  it("makes symbols speakable", () => {
    expect(speakable("σ × β ≥ 1")).toBe("sigma times beta at least 1");
  });

  it("builds scenes in teaching order from lesson content only", () => {
    const scenes = buildExplainer(lesson);
    expect(scenes.map((s) => s.kind)).toEqual(["title", "objectives", "intuition", "intuition", "formula", "example", "trap", "summary", "outro"]);
    const ex = scenes.find((s) => s.kind === "example")!;
    expect(ex.highlight).toBe("97.33");
    expect(ex.narration.at(-1)).toContain("97.33");
    expect(scenes.find((s) => s.kind === "formula")!.narration.join(" ")).toContain("the sum of");
    expect(totalSeconds(scenes)).toBeGreaterThan(30);
    scenes.forEach((s) => expect(s.seconds).toBeGreaterThanOrEqual(5));
  });

  it("adds an interactive checkpoint after the worked example when a quiz is supplied", () => {
    const scenes = buildExplainer({ ...lesson, quiz: { id: "q1", stem: "What is the price?", options: [{ id: "a", text: "97.33" }, { id: "b", text: "100" }] } });
    const kinds = scenes.map((s) => s.kind);
    expect(kinds.indexOf("quiz")).toBe(kinds.indexOf("example") + 1);
    expect(scenes.find((s) => s.kind === "quiz")?.quiz?.options).toHaveLength(2);
  });

  it("skips optional scenes when content is missing", () => {
    const scenes = buildExplainer({ ...lesson, formulas: [], content: { ...lesson.content, workedExamples: [], misconceptions: [] } });
    expect(scenes.some((s) => s.kind === "formula" || s.kind === "example" || s.kind === "trap")).toBe(false);
  });
});

import { wordAt } from "@/lib/video/narrator";

describe("narrator word tracking", () => {
  it("maps character offsets to word indexes", () => {
    const t = "Bond prices fall when yields rise";
    expect(wordAt(t, 0)).toBe(0);
    expect(wordAt(t, 5)).toBe(1);
    expect(wordAt(t, 12)).toBe(2);
    expect(wordAt(t, t.indexOf("rise"))).toBe(5);
  });
});
