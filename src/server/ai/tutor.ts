import type { Prisma, TutorMode } from "@prisma/client";
import { prisma } from "@/server/db";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { parseStructure } from "@/server/catalog/structure";
import { recordActivity } from "@/server/learning/gamification";
import { retrieve } from "./grounding";
import { OfflineProvider } from "./offline";
import { ProviderError, type AIProvider, type ChatTurn, type GroundingItem, type TutorPrompt } from "./types";

export class TutorError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const MODE_GUIDE: Record<TutorMode, string> = {
  TEACH:
    "Mode: Teach Me. Explain the concept clearly for the learner's level, starting with intuition, then the precise definition, then one worked example. Finish with a one-line check question so the learner can confirm understanding.",
  TEST_THINKING:
    "Mode: Test My Thinking. Act as a Socratic coach. Do not give the final answer straight away. Ask one or two guiding questions at a time, offer a hint when the learner is stuck, and only reveal the full solution if they ask for it or have made a genuine attempt. Acknowledge correct reasoning specifically.",
  FIND_MISTAKE:
    "Mode: Find My Mistake. The learner will share their working. Identify the exact step where the reasoning or arithmetic first goes wrong, explain why it is wrong, and show the corrected step. If their working is correct, say so and point out any fragile assumptions.",
};

export function buildSystemPrompt(ctx: {
  mode: TutorMode;
  level: string;
  examLabel: string | null;
  syllabusLabel: string | null;
  verified: boolean;
  jurisdiction: string | null;
  calculatorPolicy: string | null;
  topicName: string | null;
}) {
  return [
    "You are the PD FinPrep tutor, helping a learner prepare for professional finance, accounting, investment, tax and risk examinations.",
    ctx.examLabel
      ? `The learner is preparing for ${ctx.examLabel} using the PD FinPrep syllabus configuration "${ctx.syllabusLabel}" (${ctx.verified ? "verified against the official source" : "not yet verified against the official source"}).${ctx.jurisdiction ? ` Jurisdiction and standards context: ${ctx.jurisdiction}.` : ""}${ctx.calculatorPolicy ? ` Exam calculator policy: ${ctx.calculatorPolicy}` : ""}`
      : "The learner has not selected an exam yet.",
    ctx.topicName ? `The current topic is ${ctx.topicName}.` : "",
    `Pitch explanations at the ${ctx.level} level.`,
    MODE_GUIDE[ctx.mode],
    "Ground factual claims in the PD FinPrep course material supplied with each message inside <course_material> tags, and cite it with its reference label, for example [L1] or [F2]. When the material does not cover something, say that it is outside the provided material and flag any uncertainty rather than guessing.",
    "Never invent official exam rules, syllabus requirements, passing scores, citations or statistics. If the learner asks about them, explain that they should be confirmed on the awarding body's official website. If an answer depends on a jurisdiction, tax year, accounting standard or syllabus version, state that context explicitly.",
    "For any numerical calculation, use the provided calculator tools rather than doing arithmetic yourself, and show the inputs you used. Rates are entered as decimals.",
    "PD FinPrep is not affiliated with any examination body, and your explanations are educational, not official curriculum statements. Do not promise that the learner will pass.",
    "Write in plain, well-structured prose with short paragraphs; use a numbered list for calculation steps.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function materialBlock(items: GroundingItem[]) {
  if (items.length === 0) return "<course_material>No matching PD FinPrep material was found.</course_material>";
  return `<course_material>\n${items.map((i) => `[${i.citation.ref}] ${i.citation.title}\n${i.excerpt}`).join("\n\n")}\n</course_material>`;
}

export async function createTutorSession(userId: string, input: { mode: TutorMode; topicId?: string | null; lessonId?: string | null }) {
  const enrollment = await prisma.enrollment.findFirst({ where: { userId, status: "active" }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });
  let topicId = input.topicId ?? null;
  let title = "New conversation";
  if (input.lessonId) {
    const lesson = await prisma.lesson.findFirst({ where: { id: input.lessonId, status: "PUBLISHED" }, include: { topic: true } });
    if (lesson) {
      topicId = lesson.topic.parentId ?? lesson.topicId;
      title = lesson.title;
    }
  }
  return prisma.tutorSession.create({ data: { userId, enrollmentId: enrollment?.id ?? null, topicId, mode: input.mode, title } });
}

/**
 * Sends a learner message and stores the reply. Provider failures fall back to
 * the offline, material-only tutor so the learner always gets a useful answer.
 */
export async function sendTutorMessage(userId: string, sessionId: string, text: string, provider: AIProvider, opts: { hourlyLimit: number; focusLessonId?: string | null }) {
  const content = text.trim();
  if (!content) throw new TutorError("Write a message first");
  if (content.length > 4000) throw new TutorError("Messages are limited to 4,000 characters");
  const session = await prisma.tutorSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 40 },
      topic: true,
      enrollment: { include: { syllabus: { include: { level: { include: { program: true } } } } } },
      user: { select: { explanationLevel: true } },
    },
  });
  if (!session) throw new TutorError("Conversation not found", 404);
  const rl = await checkRateLimit(`tutor:${userId}`, opts.hourlyLimit, 3600);
  if (!rl.allowed) throw new TutorError(`You have reached the tutor limit of ${opts.hourlyLimit} messages per hour. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.`, 429);

  await prisma.tutorMessage.create({ data: { sessionId, role: "user", content } });
  const sv = session.enrollment?.syllabus ?? null;
  const structure = sv ? parseStructure(sv.structure) : null;
  const grounding = await retrieve(`${content} ${session.topic?.name ?? ""}`, { syllabusVersionId: sv?.id ?? null, focusLessonId: opts.focusLessonId, focusTopicId: session.topicId });
  const system = buildSystemPrompt({
    mode: session.mode,
    level: session.user.explanationLevel,
    examLabel: sv ? `${sv.level.program.name} — ${sv.level.name} (awarded by ${sv.level.program.awardingBody})` : null,
    syllabusLabel: sv?.versionLabel ?? null,
    verified: sv?.verificationStatus === "VERIFIED",
    jurisdiction: sv?.level.program.jurisdiction ?? null,
    calculatorPolicy: structure?.calculatorPolicy ?? null,
    topicName: session.topic?.name ?? null,
  });
  const history: ChatTurn[] = session.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  history.push({ role: "user", content: `${materialBlock(grounding)}\n\n${content}` });
  const prompt: TutorPrompt = { system, history, useCalculators: true, mode: session.mode, grounding };

  let reply;
  let providerName = provider.name;
  try {
    reply = await provider.respond(prompt);
  } catch (e) {
    const reason = e instanceof ProviderError ? e.message : "The AI provider failed unexpectedly";
    console.error("[tutor] provider failure, using offline fallback:", reason);
    const fallback = new OfflineProvider(`The AI tutor is temporarily unavailable (${reason})`);
    reply = await fallback.respond(prompt);
    providerName = `${fallback.name} (fallback)`;
  }
  const cited = grounding.filter((g) => reply.text.includes(`[${g.citation.ref}]`) || !provider.generative || providerName.startsWith("offline"));
  const toolNote = reply.toolCalls.length
    ? `\n\n_Calculations performed with PD FinPrep's deterministic calculators: ${reply.toolCalls.map((t) => `${t.name.replace(/^calc_/, "")}${t.isError ? " (input error)" : ""}`).join(", ")}._`
    : "";
  const message = await prisma.tutorMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: reply.text + toolNote,
      citations: cited.map((g) => g.citation) as unknown as Prisma.InputJsonValue,
      provider: providerName,
    },
  });
  await prisma.tutorSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date(), ...(session.title === "New conversation" ? { title: content.slice(0, 60) } : {}) },
  });
  await recordActivity(userId, { enrollmentId: session.enrollmentId, minutes: 2, activity: "tutor", meaningful: true, event: { type: "manual_log" } });
  return message;
}
