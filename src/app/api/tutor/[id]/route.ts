import { z } from "zod";
import { NextResponse } from "next/server";
import { withUser, readJson } from "@/server/api";
import { getProvider } from "@/server/ai/provider";
import { TutorError, sendTutorMessage } from "@/server/ai/tutor";
import { env } from "@/server/env";

const schema = z.object({ message: z.string().max(4000), lessonId: z.string().optional().nullable() });

export const POST = withUser<{ id: string }>(async ({ req, user, params }) => {
  const body = schema.parse(await readJson(req));
  try {
    const msg = await sendTutorMessage(user.id, params.id, body.message, getProvider(), { hourlyLimit: env.tutorHourlyLimit, focusLessonId: body.lessonId });
    return { message: { id: msg.id, role: msg.role, content: msg.content, citations: msg.citations, provider: msg.provider } };
  } catch (e) {
    if (e instanceof TutorError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
});
