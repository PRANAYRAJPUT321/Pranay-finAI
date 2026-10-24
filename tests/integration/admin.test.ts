import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AuthError } from "@/server/auth/guards";
import { AdminError, createQuestion, importQuestions, setQuestionStatus, setUserRole, updateQuestion, verifySyllabus, makeSyllabusCurrent, cloneSyllabus } from "@/server/admin/content";
import { createAttempt, saveResponse, submitAttempt } from "@/server/assessment/service";
import { cfaLevel1, makeUser } from "./helpers";

async function draftInput() {
  const { syllabus } = await cfaLevel1();
  const topic = await prisma.topic.findFirstOrThrow({ where: { syllabusVersionId: syllabus.id, code: "FI" } });
  return {
    syllabusVersionId: syllabus.id,
    topicId: topic.id,
    type: "MCQ" as const,
    difficulty: 2,
    stem: "A 4-year 5% annual coupon bond yields 6%. Its price per 1,000 par is closest to:",
    payload: { options: [
      { id: "a", text: "965.35", correct: true, rationale: "PV at 6%." },
      { id: "b", text: "1,000.00", correct: false, rationale: "Par only if coupon = yield." },
      { id: "c", text: "1,034.65", correct: false, rationale: "Premium is wrong direction." },
    ] },
    calcSpec: { fn: "bondPrice", args: { face: 1000, couponRate: 0.05, ytm: 0.06, years: 4, frequency: 1 } },
    explanation: "Discount coupons and principal at the market yield.",
    steps: [],
    conceptTested: "Bond pricing",
    estimatedSeconds: 90,
  };
}

describe("authorization", () => {
  it("rejects students from content administration", async () => {
    const student = await makeUser("STUDENT");
    await expect(createQuestion(student, await draftInput())).rejects.toBeInstanceOf(AuthError);
  });
  it("allows content managers to edit content but not roles", async () => {
    const editor = await makeUser("CONTENT_MANAGER");
    const target = await makeUser();
    await expect(createQuestion(editor, await draftInput())).resolves.toBeTruthy();
    await expect(setUserRole(editor, target.id, "ADMIN")).rejects.toBeInstanceOf(AuthError);
  });
  it("prevents removing the last administrator", async () => {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await prisma.user.updateMany({ where: { role: "ADMIN" }, data: { role: "STUDENT" } });
    const admin = await makeUser("ADMIN");
    await expect(setUserRole(admin, admin.id, "STUDENT")).rejects.toBeInstanceOf(AdminError);
    await prisma.user.updateMany({ where: { id: { in: admins.map((a) => a.id) } }, data: { role: "ADMIN" } });
  });
});

describe("review workflow and answer keys", () => {
  it("blocks publishing when the answer key fails the deterministic check", async () => {
    const editor = await makeUser("CONTENT_MANAGER");
    const input = await draftInput();
    input.payload.options = input.payload.options.map((o) => ({ ...o, correct: o.id === "b" }));
    const { question, check } = await createQuestion(editor, input);
    expect(check.ok).toBe(false);
    await setQuestionStatus(editor, question.id, "IN_REVIEW");
    await expect(setQuestionStatus(editor, question.id, "PUBLISHED")).rejects.toThrow(/verification failed/);
    await expect(setQuestionStatus(editor, question.id, "ARCHIVED")).rejects.toThrow(/Cannot move/);
  });

  it("versions edits, audits them and re-grades past responses after a key correction", async () => {
    const editor = await makeUser("CONTENT_MANAGER");
    const student = await makeUser();
    const { question } = await createQuestion(editor, await draftInput());
    await setQuestionStatus(editor, question.id, "IN_REVIEW");
    await setQuestionStatus(editor, question.id, "PUBLISHED");
    const { syllabus } = await cfaLevel1();
    const attempt = await createAttempt(student.id, { syllabusVersionId: syllabus.id, kind: "PRACTICE", feedback: "end", questionIds: [question.id], count: 1 });
    const item = await prisma.attemptItem.findFirstOrThrow({ where: { attemptId: attempt.id } });
    await saveResponse(student.id, attempt.id, { itemId: item.id, response: { selected: ["b"] } });
    await submitAttempt(student.id, attempt.id);
    expect((await prisma.attempt.findUniqueOrThrow({ where: { id: attempt.id } })).correctCount).toBe(0);

    // A wrong "correction" is refused because the question is live and the check fails.
    const bad = await draftInput();
    bad.payload.options = bad.payload.options.map((o) => ({ ...o, correct: o.id === "b" }));
    await expect(updateQuestion(editor, question.id, bad, "test")).rejects.toThrow(/fails verification/);

    // A legitimate key change (here: making the stem ask for the par case) re-grades.
    const fixed = await draftInput();
    fixed.stem = "A 4-year 6% annual coupon bond yields 6%. Its price per 1,000 par is closest to:";
    fixed.calcSpec = { fn: "bondPrice", args: { face: 1000, couponRate: 0.06, ytm: 0.06, years: 4, frequency: 1 } };
    fixed.payload.options = fixed.payload.options.map((o) => ({ ...o, correct: o.id === "b" }));
    const res = await updateQuestion(editor, question.id, fixed, "Reworded stem; key now par");
    expect(res.regrade?.responsesRegraded).toBe(1);
    expect((await prisma.attempt.findUniqueOrThrow({ where: { id: attempt.id } })).correctCount).toBe(1);
    expect(await prisma.questionVersion.count({ where: { questionId: question.id } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { entityId: question.id, action: "answerKey.correct" } })).toBe(1);
  });
});

describe("bulk import", () => {
  const header = "externalKey,programSlug,levelCode,topicCode,type,difficulty,stem,optionA,optionB,optionC,correct,rationaleA,rationaleB,rationaleC,explanation,concept,seconds,calcFn,calcArgs";
  it("validates rows and imports nothing when any row is invalid", async () => {
    const editor = await makeUser("CONTENT_MANAGER");
    const key = `imp-${Date.now()}`;
    const good = `${key}-1,cfa,L1,QM,MCQ,1,"5,000 at 7% for 8 years grows to:",8590.93,7800.00,9192.30,A,FV formula,Simple interest,Nine periods,Compound growth explanation here,Compounding,75,futureValue,"{""pv"":5000,""rate"":0.07,""periods"":8}"`;
    const wrongKey = `${key}-2,cfa,L1,QM,MCQ,1,"5,000 at 7% for 8 years grows to:",8590.93,7800.00,9192.30,B,FV formula,Simple interest,Nine periods,Compound growth explanation here,Compounding,75,futureValue,"{""pv"":5000,""rate"":0.07,""periods"":8}"`;
    const badTopic = `${key}-3,cfa,L1,NOPE,MCQ,1,"Stem text here",x,y,z,A,r,r,r,Explanation text here,Concept,60,,`;
    const res = await importQuestions(editor, [header, good, wrongKey, badTopic].join("\n"), "csv", true);
    expect(res.allOk).toBe(false);
    expect(res.imported).toBe(0);
    expect(res.results[0].ok).toBe(true);
    expect(res.results[1].errors.join(" ")).toMatch(/Answer key/);
    expect(res.results[2].errors.join(" ")).toMatch(/Unknown topic/);
    const ok = await importQuestions(editor, [header, good].join("\n"), "csv", true);
    expect(ok.imported).toBe(1);
    expect((await prisma.question.findUniqueOrThrow({ where: { externalKey: `${key}-1` } })).status).toBe("IN_REVIEW");
  });
});

describe("syllabus versioning", () => {
  it("verifies, clones and switches the current version while keeping history", async () => {
    const editor = await makeUser("CONTENT_MANAGER");
    const frm = await prisma.syllabusVersion.findFirstOrThrow({ where: { status: "CURRENT", level: { code: "PART2", program: { slug: "frm" } } } });
    await expect(verifySyllabus(editor, frm.id, "not a url", "")).rejects.toThrow();
    await verifySyllabus(editor, frm.id, "https://www.garp.org/frm", "Checked weights");
    expect((await prisma.syllabusVersion.findUniqueOrThrow({ where: { id: frm.id } })).verificationStatus).toBe("VERIFIED");
    const clone = await cloneSyllabus(editor, frm.id, `2027 test ${Date.now()}`);
    expect(await prisma.topic.count({ where: { syllabusVersionId: clone.id } })).toBe(await prisma.topic.count({ where: { syllabusVersionId: frm.id } }));
    await makeSyllabusCurrent(editor, clone.id);
    expect((await prisma.syllabusVersion.findUniqueOrThrow({ where: { id: frm.id } })).status).toBe("ARCHIVED");
    expect((await prisma.syllabusVersion.findUniqueOrThrow({ where: { id: clone.id } })).status).toBe("CURRENT");
    await makeSyllabusCurrent(editor, frm.id);
  });
});
