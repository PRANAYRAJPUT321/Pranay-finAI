import { z } from "zod";
import { withUser, readJson } from "@/server/api";
import {
  AttemptError,
  advanceSection,
  checkItem,
  getAttemptView,
  pauseAttempt,
  resumeAttempt,
  saveResponse,
  setErrorCategory,
  submitAttempt,
} from "@/server/assessment/service";
import { buildPlan } from "@/server/planner/service";
import { prisma } from "@/server/db";

export const GET = withUser<{ id: string }>(async ({ user, params }) => getAttemptView(user.id, params.id), [AttemptError]);

const bodySchema = z.object({ action: z.enum(["save", "check", "pause", "resume", "advance", "submit", "error_category"]) }).passthrough();

export const POST = withUser<{ id: string }>(async ({ req, user, params }) => {
  const body = await readJson(req);
  const { action } = bodySchema.parse(body);
  switch (action) {
    case "save":
      return saveResponse(user.id, params.id, body as never);
    case "check":
      await checkItem(user.id, params.id, z.string().parse(body.itemId));
      return getAttemptView(user.id, params.id);
    case "pause":
      await pauseAttempt(user.id, params.id);
      return getAttemptView(user.id, params.id);
    case "resume":
      await resumeAttempt(user.id, params.id);
      return getAttemptView(user.id, params.id);
    case "advance":
      await advanceSection(user.id, params.id);
      return getAttemptView(user.id, params.id);
    case "submit": {
      const attempt = await submitAttempt(user.id, params.id);
      // A finished diagnostic immediately refreshes the study plan with measured evidence.
      if (attempt.kind === "DIAGNOSTIC" && attempt.enrollmentId) {
        const e = await prisma.enrollment.findFirst({ where: { id: attempt.enrollmentId, userId: user.id } });
        if (e) await buildPlan(user.id, e.id);
      }
      return { ok: true, redirect: `/attempt/${params.id}/results` };
    }
    case "error_category":
      await setErrorCategory(user.id, params.id, z.string().parse(body.itemId), body.category === null ? null : z.string().parse(body.category));
      return { ok: true };
  }
}, [AttemptError]);
