import { z } from "zod";
import { withUser, readJson } from "@/server/api";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export const GET = withUser(async ({ user }) => {
  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
    }),
  ]);
  return { unread, items };
});

const body = z.object({ id: z.string().max(64).optional() });

/** Marks one notification (or all) as read. */
export const POST = withUser(async ({ req, user }) => {
  const { id } = body.parse(await readJson(req));
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
  return { ok: true };
});
