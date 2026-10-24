import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { upsertEnrollment } from "@/server/learning/enrollment";
import {
  AttemptError, advanceSection, checkItem, createAttempt, getAttemptView, pauseAttempt, resumeAttempt, saveResponse, submitAttempt,
} from "@/server/assessment/service";
import { buildPlan, recoverMissed, setTaskStatus } from "@/server/planner/service";
import { dueQueue, reviewCard } from "@/server/learning/flashcards";
import { getAnalytics } from "@/server/analytics/service";
import { cfaLevel1, correctResponse, makeUser, wrongResponse } from "./helpers";

async function enrolledStudent() {
  const user = await makeUser();
  const { level } = await cfaLevel1();
  const exam = new Date(Date.now() + 150 * 86_400_000).toISOString().slice(0, 10);
  const enrollment = await upsertEnrollment(user.id, { levelId: level.id, targetExamDate: exam, priorKnowledge: "some", hoursPerDay: 2, studyDaysPerWeek: 5, preferredFormat: "mixed", confidentTopicIds: [], difficultTopicIds: [] });
  return { user, enrollment };
}

describe("onboarding", () => {
  it("creates one enrollment per level and marks the first as primary", async () => {
    const { user, enrollment } = await enrolledStudent();
    expect(enrollment.isPrimary).toBe(true);
    const frm = await prisma.examLevel.findFirstOrThrow({ where: { code: "PART1", program: { slug: "frm" } } });
    const second = await upsertEnrollment(user.id, { levelId: frm.id, priorKnowledge: "none", hoursPerDay: 1, studyDaysPerWeek: 4, preferredFormat: "practice" });
    expect(second.isPrimary).toBe(false);
    expect(await prisma.enrollment.count({ where: { userId: user.id } })).toBe(2);
  });
  it("rejects exam dates in the past", async () => {
    const user = await makeUser();
    const { level } = await cfaLevel1();
    await expect(upsertEnrollment(user.id, { levelId: level.id, targetExamDate: "2020-01-01", priorKnowledge: "none", hoursPerDay: 1, studyDaysPerWeek: 5, preferredFormat: "mixed" })).rejects.toThrow(/past/);
  });
});

describe("diagnostic, practice and results", () => {
  it("builds a 20-question diagnostic with no duplicates across topics", async () => {
    const { user, enrollment } = await enrolledStudent();
    const a = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "DIAGNOSTIC", count: 20 });
    const items = await prisma.attemptItem.findMany({ where: { attemptId: a.id }, include: { question: true } });
    expect(items).toHaveLength(20);
    expect(new Set(items.map((i) => i.questionId)).size).toBe(20);
    expect(new Set(items.map((i) => i.question.topicId)).size).toBeGreaterThanOrEqual(8);
    const view = await getAttemptView(user.id, a.id);
    expect(view.config.feedback).toBe("end");
    expect(JSON.stringify(view.items.map((i) => i.question.payload))).not.toContain("rationale");
    expect(view.items.every((i) => i.feedback === null)).toBe(true);
  });

  it("autosaves, resumes after reload, grades on submit and updates learning state", async () => {
    const { user, enrollment } = await enrolledStudent();
    const a = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "DIAGNOSTIC", count: 10 });
    const items = await prisma.attemptItem.findMany({ where: { attemptId: a.id }, orderBy: { position: "asc" } });
    for (const [i, it] of items.entries()) {
      const response = i < 6 ? await correctResponse(it.questionId) : await wrongResponse(it.questionId);
      await saveResponse(user.id, a.id, { itemId: it.id, response, timeSpentDelta: 30, confidence: 3 });
    }
    // Resume: a fresh view (e.g. after logging back in) contains the saved answers.
    const resumed = await getAttemptView(user.id, a.id);
    expect(resumed.items.filter((i) => i.response !== null)).toHaveLength(10);
    await submitAttempt(user.id, a.id);
    const done = await prisma.attempt.findUniqueOrThrow({ where: { id: a.id } });
    expect(done.status).toBe("SUBMITTED");
    expect(done.correctCount).toBe(6);
    expect(done.scorePct).toBeCloseTo(60);
    expect(await prisma.topicProficiency.count({ where: { userId: user.id } })).toBeGreaterThan(0);
    expect(await prisma.questionReviewState.count({ where: { userId: user.id } })).toBe(10);
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).diagnosticAttemptId).toBe(a.id);
    // Answers are revealed after submission, and submitting twice is harmless.
    const view = await getAttemptView(user.id, a.id);
    expect(view.items.every((i) => i.feedback !== null)).toBe(true);
    await submitAttempt(user.id, a.id);
    expect((await prisma.attempt.findUniqueOrThrow({ where: { id: a.id } })).correctCount).toBe(6);
    await expect(saveResponse(user.id, a.id, { itemId: items[0].id, response: { selected: ["a"] } })).rejects.toBeInstanceOf(AttemptError);
  });

  it("validates responses and prevents other users from touching an attempt", async () => {
    const { user, enrollment } = await enrolledStudent();
    const other = await makeUser();
    const a = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "PRACTICE", count: 3 });
    const item = (await prisma.attemptItem.findMany({ where: { attemptId: a.id }, include: { question: true } })).find((i) => i.question.type === "MCQ")!;
    await expect(saveResponse(user.id, a.id, { itemId: item.id, response: { selected: ["zzz"] } })).rejects.toThrow(/Invalid option/);
    await expect(getAttemptView(other.id, a.id)).rejects.toBeInstanceOf(AttemptError);
    await expect(saveResponse(other.id, a.id, { itemId: item.id, response: { selected: ["a"] } })).rejects.toBeInstanceOf(AttemptError);
  });

  it("gives immediate feedback in practice and locks checked answers", async () => {
    const { user, enrollment } = await enrolledStudent();
    const a = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "PRACTICE", count: 2 });
    const [item] = await prisma.attemptItem.findMany({ where: { attemptId: a.id }, orderBy: { position: "asc" } });
    await saveResponse(user.id, a.id, { itemId: item.id, response: await correctResponse(item.questionId) });
    await checkItem(user.id, a.id, item.id);
    const view = await getAttemptView(user.id, a.id);
    const checked = view.items.find((i) => i.id === item.id)!;
    expect(checked.feedback?.isCorrect).toBe(true);
    expect(checked.feedback?.explanation.length).toBeGreaterThan(10);
    await expect(saveResponse(user.id, a.id, { itemId: item.id, response: await wrongResponse(item.questionId) })).rejects.toThrow(/already been checked/);
  });

  it("supports pause/resume in practice but not in exam simulation", async () => {
    const { user, enrollment } = await enrolledStudent();
    const practice = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "PRACTICE", mode: "TIMED", count: 3 });
    const paused = await pauseAttempt(user.id, practice.id);
    expect(paused.status).toBe("PAUSED");
    expect(paused.resumedAt).toBeNull();
    expect((await resumeAttempt(user.id, practice.id)).status).toBe("IN_PROGRESS");
    const mock = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "MOCK", mockType: "full" });
    await expect(pauseAttempt(user.id, mock.id)).rejects.toThrow(/not permitted/);
  });

  it("follows the configured mock structure, closes sections and auto-submits on expiry", async () => {
    const { user, enrollment } = await enrolledStudent();
    const mock = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "MOCK", mockType: "full" });
    const view = await getAttemptView(user.id, mock.id);
    expect(view.mode).toBe("EXAM_SIM");
    expect(view.config.sections).toHaveLength(2);
    expect(view.config.scaledNote).toMatch(/180 questions/);
    expect(view.remainingSeconds).toBeGreaterThan(0);
    // Section 2 questions are closed while in section 1.
    const s2 = view.items.find((i) => i.section === 1)!;
    await expect(saveResponse(user.id, mock.id, { itemId: s2.id, response: { selected: ["a"] } })).rejects.toThrow(/section is closed/);
    await advanceSection(user.id, mock.id);
    const s1 = view.items.find((i) => i.section === 0)!;
    await expect(saveResponse(user.id, mock.id, { itemId: s1.id, response: { selected: ["a"] } })).rejects.toThrow(/section is closed/);
    // Simulate the clock running out.
    await prisma.attempt.update({ where: { id: mock.id }, data: { resumedAt: new Date(Date.now() - 10 * 3600_000) } });
    const after = await getAttemptView(user.id, mock.id);
    expect(after.status).toBe("SUBMITTED");
    expect(after.autoSubmitted).toBe(true);
  });

  it("creates mistake flashcards for missed practice questions and schedules reviews", async () => {
    const { user, enrollment } = await enrolledStudent();
    const a = await createAttempt(user.id, { enrollmentId: enrollment.id, syllabusVersionId: enrollment.syllabusVersionId, kind: "PRACTICE", feedback: "end", count: 3 });
    const items = await prisma.attemptItem.findMany({ where: { attemptId: a.id } });
    for (const it of items) await saveResponse(user.id, a.id, { itemId: it.id, response: await wrongResponse(it.questionId) });
    await submitAttempt(user.id, a.id);
    expect(await prisma.flashcard.count({ where: { ownerId: user.id, kind: "MISTAKE" } })).toBe(3);
    const due = await dueQueue(user.id, { limit: 100 });
    expect(due.length).toBeGreaterThan(3);
    const card = due[0];
    const next = await reviewCard(user.id, card.flashcardId, 3);
    expect(next.dueAt.getTime()).toBeGreaterThan(Date.now());
    expect(await prisma.reviewLog.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe("study plan", () => {
  it("builds a plan, logs completed time and recovers missed sessions", async () => {
    const { user, enrollment } = await enrolledStudent();
    const plan = await buildPlan(user.id, enrollment.id);
    const tasks = await prisma.studyTask.findMany({ where: { planId: plan.id }, orderBy: [{ date: "asc" }, { order: "asc" }] });
    expect(tasks.length).toBeGreaterThan(20);
    expect(tasks.some((t) => t.kind === "MOCK")).toBe(true);
    await setTaskStatus(user.id, tasks[0].id, "DONE", 45);
    expect(await prisma.studyLog.count({ where: { userId: user.id, taskId: tasks[0].id } })).toBe(1);
    // Simulate two missed tasks in the past.
    const pending = tasks.filter((t) => t.kind !== "MOCK").slice(1, 3);
    for (const t of pending) await prisma.studyTask.update({ where: { id: t.id }, data: { date: new Date(Date.now() - 5 * 86_400_000) } });
    expect(await recoverMissed(user.id, enrollment.id)).toBe(2);
    const moved = await prisma.studyTask.findMany({ where: { id: { in: pending.map((t) => t.id) } } });
    expect(moved.every((t) => t.date.getTime() >= new Date(new Date().toISOString().slice(0, 10)).getTime() && t.rescheduledFrom !== null)).toBe(true);
    // Rebuilding supersedes the old plan rather than deleting history.
    await buildPlan(user.id, enrollment.id);
    expect(await prisma.studyPlan.count({ where: { enrollmentId: enrollment.id, status: "superseded" } })).toBe(1);
  });
  it("refuses to act on another learner's tasks", async () => {
    const { user, enrollment } = await enrolledStudent();
    const other = await makeUser();
    const plan = await buildPlan(user.id, enrollment.id);
    const task = await prisma.studyTask.findFirstOrThrow({ where: { planId: plan.id } });
    await expect(setTaskStatus(other.id, task.id, "DONE")).rejects.toThrow(/not found/);
  });
});

describe("analytics", () => {
  it("separates coverage from mastery and reports readiness limitations", async () => {
    const { user, enrollment } = await enrolledStudent();
    const lesson = await prisma.lesson.findFirstOrThrow({ where: { status: "PUBLISHED", topic: { syllabusVersionId: enrollment.syllabusVersionId } } });
    await prisma.lessonProgress.create({ data: { userId: user.id, lessonId: lesson.id, status: "completed", completedAt: new Date() } });
    const a = await getAnalytics(user.id, enrollment);
    expect(a.overall.coverage).toBeGreaterThan(0);
    expect(a.overall.masteredOrProficient).toBe(0);
    expect(a.readiness.category).toBe("INSUFFICIENT_EVIDENCE");
    expect(a.readiness.limitations.join(" ")).toMatch(/not a prediction/);
  });
});
