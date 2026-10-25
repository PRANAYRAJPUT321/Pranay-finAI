import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { upsertEnrollment } from "@/server/learning/enrollment";
import { ensureReminders } from "@/server/notifications/service";
import { examGuidePdf, formulaSheetPdf, lessonPdf, studyPackPdf } from "@/server/materials/builders";
import { getLessonExplainer } from "@/server/learning/videos";
import { cfaLevel1, makeUser } from "./helpers";

describe("reminders", () => {
  it("creates an exam countdown once per milestone and respects the opt-out", async () => {
    const user = await makeUser();
    const { level } = await cfaLevel1();
    const exam = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await upsertEnrollment(user.id, { levelId: level.id, targetExamDate: exam, priorKnowledge: "some", hoursPerDay: 2, studyDaysPerWeek: 5, preferredFormat: "mixed" });

    await ensureReminders(user.id);
    const countdowns = await prisma.notification.findMany({ where: { userId: user.id, type: { startsWith: "exam_countdown:" } } });
    expect(countdowns).toHaveLength(1);
    expect(countdowns[0].type).toMatch(/:14$/);
    expect(countdowns[0].title).toContain("10 days");

    // A new day (different memo key) must not duplicate the same milestone.
    await ensureReminders(user.id, new Date(Date.now() + 86_400_000));
    expect(await prisma.notification.count({ where: { userId: user.id, type: { startsWith: "exam_countdown:" } } })).toBe(1);

    const other = await makeUser();
    await prisma.user.update({ where: { id: other.id }, data: { inAppReminders: false } });
    await upsertEnrollment(other.id, { levelId: level.id, targetExamDate: exam, priorKnowledge: "some", hoursPerDay: 2, studyDaysPerWeek: 5, preferredFormat: "mixed" });
    await ensureReminders(other.id);
    expect(await prisma.notification.count({ where: { userId: other.id } })).toBe(0);
  });
});

describe("study materials", () => {
  const isPdf = (b: Buffer) => b.subarray(0, 5).toString() === "%PDF-";

  it("generates lesson, formula, exam-fact and study-pack PDFs", async () => {
    const { level } = await cfaLevel1();
    const sv = await prisma.syllabusVersion.findFirstOrThrow({ where: { levelId: level.id, status: "CURRENT" } });
    const lesson = await prisma.lesson.findFirstOrThrow({ where: { status: "PUBLISHED", topic: { syllabusVersionId: sv.id } } });

    const l = await lessonPdf(lesson.id);
    expect(l && isPdf(l.buf)).toBe(true);
    expect(l!.filename).toMatch(/\.pdf$/);
    const f = await formulaSheetPdf(sv.id);
    expect(isPdf(f.buf)).toBe(true);
    const g = await examGuidePdf(level.id);
    expect(g && isPdf(g.buf)).toBe(true);
    const p = await studyPackPdf(sv.id);
    expect(p && isPdf(p.buf)).toBe(true);
    expect(p!.buf.length).toBeGreaterThan(l!.buf.length);

    expect(await lessonPdf("missing")).toBeNull();
    expect(await studyPackPdf(sv.id, "missing-topic")).toBeNull();
  });

  it("builds a video explainer from a published lesson", async () => {
    const lesson = await prisma.lesson.findFirstOrThrow({ where: { status: "PUBLISHED" } });
    const v = await getLessonExplainer(lesson.id);
    expect(v?.scenes[0].kind).toBe("title");
    expect(v?.scenes.at(-1)?.kind).toBe("outro");
    expect(await getLessonExplainer("missing")).toBeNull();
  });
});
