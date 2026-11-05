import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { charsUsedThisMonth, gatewayAuth, getOrCreateClip, monthlyCharBudget, narrationEnabled, narratorId } from "@/server/speech/narration";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROBE = "Hi, I'm Nova, your study buddy. Let's learn something great today.";

/**
 * Narration diagnostics: whether natural narration is on, how it
 * authenticates and how much of the monthly budget is used. `?probe=1` speaks
 * one fixed sentence end to end (generated once, then served from the cache).
 */
export async function GET(req: NextRequest) {
  const enabled = narrationEnabled();
  const [used, clips] = await Promise.all([charsUsedThisMonth(), prisma.narrationClip.count()]);
  const body: Record<string, unknown> = {
    enabled,
    voice: narratorId(),
    auth: gatewayAuth(req.headers)?.method ?? null,
    monthlyCharBudget: monthlyCharBudget(),
    charsUsedLast30Days: used,
    cachedClips: clips,
  };
  if (enabled && req.nextUrl.searchParams.get("probe") === "1") {
    try {
      const clip = await getOrCreateClip(narratorId(), PROBE, { headers: req.headers });
      body.probe = { ok: true, cached: clip.cached, bytes: clip.audio.length };
    } catch (e) {
      body.probe = { ok: false, error: e instanceof Error ? e.message : "failed" };
    }
  }
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}
