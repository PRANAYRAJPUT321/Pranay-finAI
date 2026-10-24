/**
 * Account lifecycle: registration, credential checks, email verification,
 * password reset, data export and deletion. Framework-agnostic (no cookies),
 * so it is unit/integration-testable; cookie handling lives in current.ts.
 */
import { z } from "zod";
import { prisma } from "@/server/db";
import { generateToken, sha256 } from "./crypto";
import { hashPassword, passwordSchema, verifyAgainstDummy, verifyPassword } from "./password";
import { invalidateAllUserSessions } from "./session";
import { sendEmail } from "@/server/notifications/email";

const HOUR = 60 * 60 * 1000;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(128),
});

export class AccountError extends Error {}

export async function registerUser(input: z.infer<typeof registerSchema>, appUrl: string) {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AccountError("An account with this email already exists");
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) },
  });
  await sendVerificationEmail(user.id, appUrl);
  return user;
}

export async function authenticate(input: z.infer<typeof loginSchema>) {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) return verifyAgainstDummy(data.password).then(() => null);
  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  return user;
}

async function issueToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", ttlMs: number) {
  const token = generateToken();
  // Only one live token of each type per user.
  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await prisma.authToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function consumeToken(token: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt.getTime() < Date.now()) return null;
  const updated = await prisma.authToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return updated.count === 1 ? record : null;
}

export async function sendVerificationEmail(userId: string, appUrl: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return;
  const token = await issueToken(userId, "EMAIL_VERIFICATION", 48 * HOUR);
  await sendEmail({
    to: user.email,
    subject: "Verify your PD FinPrep email",
    text: `Hi ${user.name},\n\nConfirm your email address: ${appUrl}/verify-email?token=${token}\n\nThis link expires in 48 hours.`,
  });
}

export async function verifyEmail(token: string) {
  const record = await consumeToken(token, "EMAIL_VERIFICATION");
  if (!record) return false;
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  return true;
}

/** Always resolves the same way whether or not the email exists (no account enumeration). */
export async function requestPasswordReset(email: string, appUrl: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return;
  const token = await issueToken(user.id, "PASSWORD_RESET", 1 * HOUR);
  await sendEmail({
    to: user.email,
    subject: "Reset your PD FinPrep password",
    text: `Hi ${user.name},\n\nReset your password: ${appUrl}/reset-password?token=${token}\n\nThis link expires in 1 hour. If you did not request it, ignore this email.`,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const password = passwordSchema.parse(newPassword);
  const record = await consumeToken(token, "PASSWORD_RESET");
  if (!record) throw new AccountError("This reset link is invalid or has expired");
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } });
  await invalidateAllUserSessions(record.userId);
  return record.userId;
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(current, user.passwordHash))) throw new AccountError("Current password is incorrect");
  const password = passwordSchema.parse(next);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
}

/** Everything we store about a learner, as JSON (GDPR-style access request). */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, tier: true, createdAt: true, emailVerifiedAt: true,
      gamificationEnabled: true, inAppReminders: true, emailReminders: true, explanationLevel: true, timezone: true,
      enrollments: { include: { plans: { include: { tasks: true } } } },
      attempts: { include: { items: true } },
      proficiencies: true,
      lessonProgress: true,
      flashcards: true,
      cardStates: true,
      reviewLogs: true,
      questionReviews: true,
      bookmarks: true,
      notes: true,
      studyLogs: true,
      tutorSessions: { include: { messages: true } },
      reports: true,
      notifications: true,
      achievements: true,
    },
  });
  return { exportedAt: new Date().toISOString(), user };
}

export async function deleteAccount(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(password, user.passwordHash))) throw new AccountError("Password is incorrect");
  await prisma.user.delete({ where: { id: userId } });
}
