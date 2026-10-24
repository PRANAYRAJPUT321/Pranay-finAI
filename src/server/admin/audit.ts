import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function audit(
  tx: Tx,
  entry: { actorId: string | null; action: string; entityType: string; entityId: string; before?: unknown; after?: unknown; note?: string },
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before === undefined ? undefined : (JSON.parse(JSON.stringify(entry.before)) as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (JSON.parse(JSON.stringify(entry.after)) as Prisma.InputJsonValue),
      note: entry.note,
    },
  });
}
