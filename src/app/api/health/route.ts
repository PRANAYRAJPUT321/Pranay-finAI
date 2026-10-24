import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ status: "setup_required", database: "not_configured", hint: "Set DATABASE_URL (PostgreSQL) in the hosting environment and redeploy." }, { status: 503 });
  }
  try {
    const [, programs] = await Promise.all([prisma.$queryRaw`SELECT 1`, prisma.examProgram.count()]);
    return NextResponse.json({ status: programs > 0 ? "ok" : "needs_seed", database: "ok", programs, time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unreachable_or_not_migrated" }, { status: 503 });
  }
}
