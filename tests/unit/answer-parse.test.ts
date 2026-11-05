import { describe, expect, it } from "vitest";
import { parseSpokenAnswer } from "@/lib/video/answer-parse";

const L = ["A", "B", "C"];

describe("spoken answer parsing", () => {
  it("understands letters, sound-alikes and phrases", () => {
    expect(parseSpokenAnswer("B", L)).toEqual({ kind: "answer", letter: "B" });
    expect(parseSpokenAnswer("bee", L)).toEqual({ kind: "answer", letter: "B" });
    expect(parseSpokenAnswer("I think it's option C", L)).toEqual({ kind: "answer", letter: "C" });
    expect(parseSpokenAnswer("the answer is a", L)).toEqual({ kind: "answer", letter: "A" });
    expect(parseSpokenAnswer("see", L)).toEqual({ kind: "answer", letter: "C" });
  });
  it("recognises commands and rejects letters that are not options", () => {
    expect(parseSpokenAnswer("can you repeat that", L).kind).toBe("repeat");
    expect(parseSpokenAnswer("skip", L).kind).toBe("skip");
    expect(parseSpokenAnswer("stop", L).kind).toBe("stop");
    expect(parseSpokenAnswer("dee", L).kind).toBe("unknown");
    expect(parseSpokenAnswer("", L).kind).toBe("unknown");
  });
});
