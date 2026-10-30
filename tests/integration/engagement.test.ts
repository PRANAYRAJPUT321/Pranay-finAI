import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { answerDailyChallenge, checkRapidAnswer, dailyChallengeStats, getDailyChallenge, rapidFireDeck, saveRapidFireRun } from "@/server/engagement/service";
import { cfaLevel1, makeUser } from "./helpers";

describe("daily challenge", () => {
  it("gives one stable, redacted question per day and records a single answer", async () => {
    const user = await makeUser();
    const { syllabus } = await cfaLevel1();
    const first = await getDailyChallenge(user.id, syllabus.id);
    expect(first).not.toBeNull();
    const again = await getDailyChallenge(user.id, syllabus.id);
    expect(again!.id).toBe(first!.id);
    expect(first!.answered).toBe(false);
    expect(first!.options.every((o) => !("correct" in o))).toBe(true);
    expect(first!.explanation).toBeNull();

    const q = await prisma.dailyChallenge.findUniqueOrThrow({ where: { id: first!.id }, include: { question: true } });
    const options = (q.question.payload as { options: { id: string; correct: boolean }[] }).options;
    const right = options.find((o) => o.correct)!.id;
    const wrong = options.find((o) => !o.correct)!.id;

    const answered = await answerDailyChallenge(user.id, right);
    expect(answered.correct).toBe(true);
    expect(answered.explanation).toBeTruthy();
    // A second answer cannot overwrite the first.
    const repeat = await answerDailyChallenge(user.id, wrong);
    expect(repeat.correct).toBe(true);
    expect(repeat.selectedOptionId).toBe(right);

    const stats = await dailyChallengeStats(user.id);
    expect(stats).toMatchObject({ streak: 1, answered: 1, correct: 1 });
    expect(await prisma.studyLog.count({ where: { userId: user.id, note: "Daily challenge" } })).toBe(1);
  });

  it("prefers questions the learner has not seen", async () => {
    const user = await makeUser();
    const { syllabus } = await cfaLevel1();
    const today = await getDailyChallenge(user.id, syllabus.id);
    const yesterday = new Date(Date.now() - 86_400_000);
    const prev = await getDailyChallenge(user.id, syllabus.id, yesterday);
    expect(prev!.id).not.toBe(today!.id);
    const ids = await prisma.dailyChallenge.findMany({ where: { userId: user.id }, select: { questionId: true } });
    expect(new Set(ids.map((i) => i.questionId)).size).toBe(2);
  });
});

describe("rapid fire", () => {
  it("serves decks without answers, checks answers server-side and keeps the best score", async () => {
    const user = await makeUser();
    const { syllabus } = await cfaLevel1();
    const deck = await rapidFireDeck(syllabus.id, 10);
    expect(deck.length).toBeGreaterThan(0);
    expect(JSON.stringify(deck)).not.toContain('"correct"');
    const payload = (await prisma.question.findUniqueOrThrow({ where: { id: deck[0].id } })).payload as { options: { id: string; correct: boolean }[] };
    const right = payload.options.find((o) => o.correct)!.id;
    expect(await checkRapidAnswer(deck[0].id, right)).toEqual({ correct: true, correctOptionId: right });

    const a = await saveRapidFireRun(user.id, syllabus.id, 10, 8);
    expect(a).toEqual({ score: 74, best: 74, isNewBest: true });
    const b = await saveRapidFireRun(user.id, syllabus.id, 6, 2);
    expect(b).toEqual({ score: 8, best: 74, isNewBest: false });
    await expect(saveRapidFireRun(user.id, syllabus.id, 3, 5)).rejects.toThrow();
  });
});
