import { describe, expect, it } from "vitest";
import { mouthLevel, rankVoice, speechChunks, wordIndexAt, wordTimings } from "@/lib/video/narrator";
import { keyNumbers, themeFor } from "@/lib/video/themes";
import { speakable } from "@/lib/video/script";

describe("device voice ranking", () => {
  const v = (name: string, lang = "en-US", localService = true) => ({ name, lang, localService });

  it("puts natural and neural voices first and robotic or novelty voices last", () => {
    const voices = [
      v("eSpeak English"),
      v("Microsoft David Desktop - English (United States)"),
      v("Samantha"),
      v("Google US English", "en-US", false),
      v("Microsoft Aria Online (Natural) - English (United States)", "en-US", false),
      v("Ava (Premium)"),
      v("Zarvox"),
    ];
    const order = [...voices].sort((a, b) => rankVoice(b) - rankVoice(a)).map((x) => x.name);
    expect(order[0]).toMatch(/Aria Online \(Natural\)/);
    expect(order[1]).toBe("Ava (Premium)");
    expect(order[2]).toBe("Google US English");
    expect(order.slice(-2).sort()).toEqual(["Zarvox", "eSpeak English"].sort());
  });

  it("ignores non-English voices", () => {
    expect(rankVoice(v("Amélie", "fr-CA"))).toBeLessThan(-500);
    expect(rankVoice(v("Microsoft Neerja Online (Natural) - English (India)", "en_IN", false))).toBeGreaterThan(100);
  });
});

describe("clip timing", () => {
  it("spreads words across the clip with pauses after punctuation", () => {
    const t = wordTimings("Money today, is worth more. Later less", 4);
    expect(t).toHaveLength(7);
    expect(t[0]).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    expect(t[t.length - 1]).toBeLessThan(4);
    // "today," and "more." are followed by a longer gap than plain words of similar length
    expect(t[2] - t[1]).toBeGreaterThan(t[1] - t[0]);
    expect(wordTimings("", 3)).toEqual([]);
    expect(wordTimings("one two", 0)).toEqual([0, 0]);
  });

  it("finds the word being spoken and animates the mouth within 0..1", () => {
    const words = ["Compounding", "is", "powerful."];
    const t = wordTimings(words.join(" "), 3);
    expect(wordIndexAt(t, 0)).toBe(0);
    expect(wordIndexAt(t, 2.9)).toBe(2);
    for (let x = 0; x <= 3; x += 0.05) {
      const m = mouthLevel(words, t, x, 3);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    }
  });

  it("splits long sentences for engines that stop on long utterances", () => {
    expect(speechChunks("Short sentence.")).toEqual(["Short sentence."]);
    const long = Array.from({ length: 12 }, (_, i) => `clause number ${i} keeps going`).join(", ") + ".";
    const parts = speechChunks(long, 120);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 160)).toBe(true);
    expect(parts.join(" ")).toBe(long);
  });
});

describe("speech-friendly text", () => {
  it("reads formulas and shorthand the way a person would", () => {
    expect(speakable("FV = PV × (1 + r)^n.")).toBe("future value equals present value times (1 plus r) to the power n.");
    expect(speakable("Equity & debt, e.g. bonds vs. stocks · 30 min")).toBe("Equity and debt, for example bonds versus stocks, 30 min");
    expect(speakable("Price ≈ 95 — below par")).toBe("Price approximately 95, below par");
  });
});

describe("cartoon themes", () => {
  it("picks an illustration from the lesson title and topic", () => {
    expect(themeFor("Time Value of Money")).toBe("growth");
    expect(themeFor("Net Present Value and IRR")).toBe("timeline");
    expect(themeFor("Bond pricing and yield")).toBe("bond");
    expect(themeFor("Professional Ethics: Foundations and Application", "Ethical and Professional Standards")).toBe("shield");
    expect(themeFor("Accounting Equation, Golden Rules and Depreciation")).toBe("scale");
    expect(themeFor("Hedge Fund Fees, Hurdles and High-Water Marks")).toBe("buildings");
    expect(themeFor("Indian Contract Act: Essentials of a Valid Contract")).toBe("handshake");
    expect(themeFor("Risk Management and Insurance Basics")).toBe("umbrella");
    expect(themeFor("Demand, Utility and Price Elasticity")).toBe("globe");
    expect(themeFor("Funding Retirement: Accumulation and Capital Needs")).toBe("piggy");
    expect(themeFor("Something unrelated")).toBe("calculator");
  });

  it("pulls the numbers worth animating out of a worked example", () => {
    expect(keyNumbers("Cost 80,000, salvage 8,000, life 5 years: DDB in year 2. Rate 40% and $1,200.5 then 80,000.")).toEqual(["80,000", "8,000", "40%", "$1,200.5"]);
    expect(keyNumbers("Deposit 5,000 at 7% annually for 8 years.")).toEqual(["5,000", "7%"]);
  });
});
