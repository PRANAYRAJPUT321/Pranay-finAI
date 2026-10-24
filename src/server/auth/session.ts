import { prisma } from "@/server/db";
import { generateToken, sha256 } from "./crypto";

export const SESSION_COOKIE = "finprep_session";
const SESSION_DAYS = 30;
const REFRESH_THRESHOLD_DAYS = 15;
const DAY = 24 * 60 * 60 * 1000;

export async function createSession(userId: string, userAgent?: string | null) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await prisma.session.create({
    data: { id: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 255) ?? null },
  });
  return { token, expiresAt };
}

export async function validateSessionToken(token: string) {
  const id = sha256(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true, role: true, tier: true, emailVerifiedAt: true, gamificationEnabled: true, explanationLevel: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  // Sliding expiry: extend active sessions that are past the halfway point.
  if (session.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_DAYS * DAY) {
    session.expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
    await prisma.session.update({ where: { id }, data: { expiresAt: session.expiresAt } });
  }
  return session;
}

export async function invalidateSession(token: string) {
  await prisma.session.deleteMany({ where: { id: sha256(token) } });
}

export async function invalidateAllUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof validateSessionToken>>>["user"];
