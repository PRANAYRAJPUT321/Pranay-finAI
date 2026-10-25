import { z } from "zod";
import { withUser, readJson } from "@/server/api";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { pushConfigured } from "@/server/notifications/push";

export const dynamic = "force-dynamic";

/** Public VAPID key (or null when web push is not configured). */
export const GET = withUser(async ({ user }) => ({
  publicKey: pushConfigured() ? env.vapidPublicKey : null,
  devices: await prisma.pushSubscription.count({ where: { userId: user.id } }),
}));

const subscription = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "Push endpoint must use HTTPS"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export const POST = withUser(async ({ req, user }) => {
  const s = subscription.parse(await readJson(req));
  const ua = req.headers.get("user-agent")?.slice(0, 200) ?? null;
  await prisma.pushSubscription.upsert({
    where: { endpoint: s.endpoint },
    create: { userId: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: ua },
    update: { userId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: ua },
  });
  return { ok: true };
});

export const DELETE = withUser(async ({ req, user }) => {
  const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(await readJson(req));
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
  return { ok: true };
});
