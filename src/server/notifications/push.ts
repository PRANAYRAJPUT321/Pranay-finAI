import "server-only";
import webpush from "web-push";
import { prisma } from "@/server/db";
import { env } from "@/server/env";

export const pushConfigured = () => Boolean(env.vapidPublicKey && env.vapidPrivateKey);

let initialised = false;
function init() {
  if (!initialised) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    initialised = true;
  }
}

/** Sends a web push to every registered device of the user. Expired subscriptions are removed. */
export async function sendPush(userId: string, payload: { title: string; body: string; url?: string | null }) {
  if (!pushConfigured()) return;
  init();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...payload, url: payload.url ?? "/notifications" }), { TTL: 60 * 60 * 24 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.warn("[push] delivery failed", status ?? e);
      }
    }),
  );
}
