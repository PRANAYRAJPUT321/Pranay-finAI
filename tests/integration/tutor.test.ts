import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createTutorSession, sendTutorMessage, TutorError } from "@/server/ai/tutor";
import { OfflineProvider } from "@/server/ai/offline";
import { retrieve } from "@/server/ai/grounding";
import { ProviderError, type AIProvider } from "@/server/ai/types";
import { upsertEnrollment } from "@/server/learning/enrollment";
import { cfaLevel1, makeUser } from "./helpers";

const failing: AIProvider = { name: "failing", generative: true, respond: async () => { throw new ProviderError("upstream 503", true); } };

async function learner() {
  const user = await makeUser();
  const { level } = await cfaLevel1();
  await upsertEnrollment(user.id, { levelId: level.id, priorKnowledge: "none", hoursPerDay: 1, studyDaysPerWeek: 5, preferredFormat: "mixed" });
  return user;
}

describe("AI tutor", () => {
  it("retrieves relevant course material for a question", async () => {
    const { syllabus } = await cfaLevel1();
    const items = await retrieve("How does modified duration estimate bond price changes?", { syllabusVersionId: syllabus.id });
    expect(items.length).toBeGreaterThan(0);
    expect(items.map((i) => i.citation.title).join(" ")).toMatch(/Duration/i);
  });

  it("falls back to the offline tutor when the provider fails, and stores citations", async () => {
    const user = await learner();
    const session = await createTutorSession(user.id, { mode: "TEACH" });
    const reply = await sendTutorMessage(user.id, session.id, "Explain modified duration", failing, { hourlyLimit: 10 });
    expect(reply.provider).toMatch(/fallback/);
    expect(reply.content).toMatch(/temporarily unavailable/);
    expect((reply.citations as unknown[]).length).toBeGreaterThan(0);
    expect(await prisma.tutorMessage.count({ where: { sessionId: session.id } })).toBe(2);
  });

  it("enforces per-user rate limits and ownership", async () => {
    const user = await learner();
    const other = await makeUser();
    const session = await createTutorSession(user.id, { mode: "FIND_MISTAKE" });
    await expect(sendTutorMessage(other.id, session.id, "hi", new OfflineProvider(), { hourlyLimit: 10 })).rejects.toBeInstanceOf(TutorError);
    await sendTutorMessage(user.id, session.id, "PV = 1000 / 1.06 * 5", new OfflineProvider(), { hourlyLimit: 1 });
    await expect(sendTutorMessage(user.id, session.id, "again", new OfflineProvider(), { hourlyLimit: 1 })).rejects.toThrow(/limit/);
  });
});
