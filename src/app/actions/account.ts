"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { requireUser, endSession } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { AccountError, changePassword, deleteAccount } from "@/server/auth/service";
import type { ActionState } from "@/components/forms";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  explanationLevel: z.enum(["beginner", "intermediate", "advanced"]),
  timezone: z.string().max(64),
});

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: form.get("name"), explanationLevel: form.get("explanationLevel"), timezone: form.get("timezone") || "UTC" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...parsed.data,
      gamificationEnabled: form.get("gamificationEnabled") === "on",
      inAppReminders: form.get("inAppReminders") === "on",
      emailReminders: form.get("emailReminders") === "on",
    },
  });
  revalidatePath("/", "layout");
  return { message: "Settings saved." };
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get("next") !== form.get("confirm")) return { error: "New passwords do not match" };
  try {
    await changePassword(user.id, String(form.get("current") ?? ""), String(form.get("next") ?? ""));
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0].message };
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
  return { message: "Password changed." };
}

export async function deleteAccountAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm" };
  try {
    await deleteAccount(user.id, String(form.get("password") ?? ""));
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
  await endSession().catch(() => undefined);
  redirect("/?deleted=1");
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function createGroupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = z.string().trim().min(2, "Name the group").max(60).safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const owned = await prisma.studyGroup.count({ where: { ownerId: user.id } });
  if (owned >= 10) return { error: "You can own up to 10 groups" };
  await prisma.studyGroup.create({
    data: { name: name.data, ownerId: user.id, inviteCode: randomBytes(5).toString("hex").toUpperCase(), members: { create: { userId: user.id } } },
  });
  revalidatePath("/groups");
  return { message: "Group created. Share the invite code with study partners." };
}

export async function joinGroupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const group = await prisma.studyGroup.findUnique({ where: { inviteCode: code }, include: { _count: { select: { members: true } } } });
  if (!group) return { error: "No group found for that code" };
  if (group._count.members >= 30) return { error: "This group is full" };
  await prisma.studyGroupMember.upsert({ where: { groupId_userId: { groupId: group.id, userId: user.id } }, create: { groupId: group.id, userId: user.id }, update: {} });
  revalidatePath("/groups");
  return { message: `Joined ${group.name}.` };
}

export async function leaveGroupAction(groupId: string) {
  const user = await requireUser();
  await prisma.studyGroupMember.deleteMany({ where: { groupId, userId: user.id } });
  const remaining = await prisma.studyGroupMember.count({ where: { groupId } });
  if (remaining === 0) await prisma.studyGroup.deleteMany({ where: { id: groupId } });
  revalidatePath("/groups");
}

export async function toggleShareAction(groupId: string, share: boolean) {
  const user = await requireUser();
  await prisma.studyGroupMember.updateMany({ where: { groupId, userId: user.id }, data: { shareProgress: share } });
  revalidatePath("/groups");
}
