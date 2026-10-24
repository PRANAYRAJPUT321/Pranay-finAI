import { prisma } from "@/server/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limiter persisted in Postgres so limits hold across server
 * instances and restarts. Suitable for auth and AI endpoints (low volume).
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = new Date();
  const windowMs = windowSeconds * 1000;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ where: { key } });
    if (!existing || now.getTime() - existing.windowStart.getTime() >= windowMs) {
      await tx.rateLimit.upsert({
        where: { key },
        create: { key, windowStart: now, count: 1 },
        update: { windowStart: now, count: 1 },
      });
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }
    const retryAfterSeconds = Math.ceil((existing.windowStart.getTime() + windowMs - now.getTime()) / 1000);
    if (existing.count >= limit) return { allowed: false, remaining: 0, retryAfterSeconds };
    await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return { allowed: true, remaining: limit - existing.count - 1, retryAfterSeconds };
  });
}
