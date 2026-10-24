"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ContentStatus, Role, Tier } from "@prisma/client";
import { requireRole } from "@/server/auth/current";
import { ADMIN_ROLES, AuthError, CONTENT_ROLES } from "@/server/auth/guards";
import {
  AdminError, cloneSyllabus, createPastPaper, createQuestion, grantTier, importQuestions, makeSyllabusCurrent, resolveReport,
  setLessonStatus, setQuestionStatus, setUserRole, unverifySyllabus, updateLesson, updateQuestion, updateStructure, updateTopic,
  verifyPastPaper, verifySyllabus, type ImportRowResult, type QuestionInput,
} from "@/server/admin/content";
import type { ActionState } from "@/components/forms";

function message(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
  if (e instanceof AdminError || e instanceof AuthError) return e.message;
  if (e instanceof Error && /Unique constraint/.test(e.message)) return "That key or label already exists";
  throw e;
}

function questionFromForm(form: FormData): QuestionInput {
  const type = String(form.get("type")) as QuestionInput["type"];
  let payload: unknown;
  if (type === "MCQ" || type === "MULTI_SELECT") {
    const options = [];
    for (let i = 0; i < 6; i++) {
      const text = String(form.get(`opt_text_${i}`) ?? "").trim();
      if (!text) continue;
      options.push({ id: String(form.get(`opt_id_${i}`) || String.fromCharCode(97 + i)), text, correct: form.get(`opt_correct_${i}`) === "on", rationale: String(form.get(`opt_rationale_${i}`) ?? "").trim() });
    }
    payload = { options };
  } else if (type === "NUMERIC") {
    payload = { answer: Number(form.get("num_answer")), tolerance: Number(form.get("num_tolerance") || 0), toleranceType: String(form.get("num_tolerance_type") || "absolute"), unit: String(form.get("num_unit") || "") || undefined, decimals: Number(form.get("num_decimals") || 2) };
  } else {
    let rubric: unknown = [];
    try {
      rubric = JSON.parse(String(form.get("written_rubric") || "[]"));
    } catch {
      throw new AdminError("Rubric must be valid JSON");
    }
    payload = { rubric, modelAnswer: String(form.get("written_model") ?? "") };
  }
  let calcSpec: unknown = null;
  const calcRaw = String(form.get("calcSpec") ?? "").trim();
  if (calcRaw) {
    try {
      calcSpec = JSON.parse(calcRaw);
    } catch {
      throw new AdminError("Calculation spec must be valid JSON");
    }
  }
  return {
    syllabusVersionId: String(form.get("syllabusVersionId")),
    topicId: String(form.get("topicId")),
    learningOutcomeId: (form.get("learningOutcomeId") as string) || null,
    formulaId: (form.get("formulaId") as string) || null,
    type,
    difficulty: Number(form.get("difficulty")),
    stem: String(form.get("stem") ?? ""),
    payload,
    calcSpec,
    explanation: String(form.get("explanation") ?? ""),
    steps: String(form.get("steps") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    conceptTested: String(form.get("conceptTested") ?? ""),
    commonMistake: String(form.get("commonMistake") ?? "") || null,
    estimatedSeconds: Number(form.get("estimatedSeconds") || 90),
    context: String(form.get("context") ?? "") || null,
    origin: String(form.get("origin") || "ORIGINAL") as "ORIGINAL",
    externalKey: String(form.get("externalKey") ?? "") || null,
  };
}

export async function saveQuestionAction(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  let newId: string | null = null;
  try {
    const input = questionFromForm(form);
    if (id) {
      const { check, regrade } = await updateQuestion(actor, id, input, String(form.get("reason") ?? ""));
      revalidatePath(`/admin/questions/${id}`);
      return { message: `Saved. Answer key: ${check.message}.${regrade ? ` Re-graded ${regrade.responsesRegraded} responses across ${regrade.attemptsUpdated} attempts (${regrade.learnersAffected} learners).` : ""}` };
    }
    const { question } = await createQuestion(actor, input);
    newId = question.id;
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/admin/questions/${newId}?created=1`);
}

export async function questionStatusAction(id: string, status: ContentStatus, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  try {
    await setQuestionStatus(actor, id, status, String(form.get("note") ?? "") || undefined);
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/admin/questions");
  return { message: `Status changed to ${status.toLowerCase().replace("_", " ")}.` };
}

export interface ImportState extends ActionState {
  results?: ImportRowResult[];
}

export async function importAction(_: ImportState, form: FormData): Promise<ImportState> {
  const actor = await requireRole(CONTENT_ROLES);
  const file = form.get("file");
  let text = String(form.get("text") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2_000_000) return { error: "File is larger than 2 MB" };
    text = await file.text();
  }
  if (!text.trim()) return { error: "Paste content or choose a file" };
  const format = String(form.get("format")) === "json" ? "json" : "csv";
  try {
    const res = await importQuestions(actor, text, format, form.get("commit") === "1");
    if (form.get("commit") === "1" && res.allOk) {
      revalidatePath("/admin/questions");
      return { message: `Imported ${res.imported} questions into the review queue.`, results: res.results };
    }
    return { message: res.allOk ? `All ${res.results.length} rows are valid. Choose “Import” to add them to the review queue.` : undefined, error: res.allOk ? undefined : "Some rows have errors; nothing was imported.", results: res.results };
  } catch (e) {
    if (e instanceof SyntaxError) return { error: "The JSON could not be parsed" };
    return { error: message(e) };
  }
}

export async function verifySyllabusAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  try {
    if (form.get("op") === "unverify") await unverifySyllabus(actor, id, String(form.get("note") ?? ""));
    else await verifySyllabus(actor, id, String(form.get("sourceUrl") ?? ""), String(form.get("note") ?? ""));
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath(`/admin/catalog/${id}`);
  return { message: "Verification status updated." };
}

export async function structureAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  try {
    await updateStructure(actor, id, String(form.get("structure") ?? ""), Number(form.get("recommendedHours") || 0), String(form.get("notes") ?? ""));
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath(`/admin/catalog/${id}`);
  return { message: "Structure saved. The syllabus is now marked unverified until re-checked." };
}

export async function topicAction(topicId: string, syllabusId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  const num = (k: string) => (form.get(k) === "" || form.get(k) === null ? null : Number(form.get(k)));
  try {
    await updateTopic(actor, topicId, { name: String(form.get("name") ?? ""), weightMin: num("weightMin"), weightMax: num("weightMax"), difficulty: Number(form.get("difficulty") || 2) });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath(`/admin/catalog/${syllabusId}`);
  return { message: "Saved." };
}

export async function cloneSyllabusAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  let newId: string;
  try {
    newId = (await cloneSyllabus(actor, id, String(form.get("label") ?? ""))).id;
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/admin/catalog/${newId}`);
}

export async function makeCurrentAction(id: string) {
  const actor = await requireRole(CONTENT_ROLES);
  await makeSyllabusCurrent(actor, id);
  revalidatePath(`/admin/catalog/${id}`);
  revalidatePath("/admin/catalog");
}

export async function lessonAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  try {
    await updateLesson(actor, id, { title: String(form.get("title") ?? ""), estimatedMinutes: Number(form.get("estimatedMinutes") || 30), contentJson: String(form.get("content") ?? ""), reason: String(form.get("reason") ?? "") });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath(`/admin/lessons/${id}`);
  return { message: "Lesson saved." };
}

export async function lessonStatusAction(id: string, status: ContentStatus) {
  const actor = await requireRole(CONTENT_ROLES);
  await setLessonStatus(actor, id, status);
  revalidatePath(`/admin/lessons/${id}`);
  revalidatePath("/admin/lessons");
}

export async function reportAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  try {
    await resolveReport(actor, id, form.get("op") === "reject" ? "rejected" : "resolved", String(form.get("resolution") ?? ""));
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/admin/reports");
  return { message: "Report updated." };
}

export async function userRoleAction(userId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(ADMIN_ROLES);
  try {
    const role = z.enum(["STUDENT", "CONTENT_MANAGER", "ADMIN"]).parse(form.get("role")) as Role;
    await setUserRole(actor, userId, role);
    const tier = form.get("tier");
    if (tier) await grantTier(actor, userId, z.enum(["FREE", "PLUS", "PREMIUM"]).parse(tier) as Tier, "Manual grant from admin console");
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/admin/users");
  return { message: "User updated." };
}

export async function pastPaperAction(_: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole(CONTENT_ROLES);
  try {
    await createPastPaper(actor, {
      programId: String(form.get("programId") ?? ""),
      levelId: (form.get("levelId") as string) || null,
      title: String(form.get("title") ?? ""),
      year: form.get("year") ? Number(form.get("year")) : null,
      sessionLabel: (form.get("sessionLabel") as string) || null,
      kind: String(form.get("kind")) as "OFFICIAL_PAST_PAPER",
      url: (form.get("url") as string) || null,
      licenseNote: String(form.get("licenseNote") ?? ""),
      hasSuggestedAnswers: form.get("hasSuggestedAnswers") === "on",
    });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/admin/past-papers");
  revalidatePath("/past-papers");
  return { message: "Resource added (unverified until checked)." };
}

export async function verifyPastPaperAction(id: string) {
  const actor = await requireRole(CONTENT_ROLES);
  await verifyPastPaper(actor, id);
  revalidatePath("/admin/past-papers");
}
