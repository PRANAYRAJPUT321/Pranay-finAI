import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { MAX_CLIP_CHARS, NarrationUnavailableError, getOrCreateClip, narrationEnabled, narratorId, verifyNarration } from "@/server/speech/narration";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });

/**
 * Neural narration audio for one sentence of a generated video. The URL is
 * signed by the page that rendered the sentence; responses are immutable
 * (the URL contains the text and voice), so browsers and the CDN cache them.
 */
export async function GET(req: NextRequest) {
  if (!narrationEnabled()) return fail(404, "Natural narration is not enabled on this server.");
  const p = req.nextUrl.searchParams;
  const voice = p.get("v") ?? "";
  const sig = p.get("s") ?? "";
  let text = "";
  try {
    text = Buffer.from(p.get("t") ?? "", "base64url").toString("utf8").trim();
  } catch {
    return fail(400, "Bad request.");
  }
  if (!text || text.length > MAX_CLIP_CHARS) return fail(400, "Bad request.");
  if (voice !== narratorId()) return fail(410, "This narration voice has been replaced. Reload the page.");
  if (!verifyNarration(voice, text, sig)) return fail(403, "Invalid narration link.");

  try {
    const clip = await getOrCreateClip(voice, text, {
      headers: req.headers,
      // Only cache misses cost anything, so only they count towards the per-visitor limit.
      beforeGenerate: async () => {
        const rl = await checkRateLimit(`narration:${clientIp(req)}`, 600, 600);
        if (!rl.allowed) throw new RateLimitedError();
      },
    });
    const body = new Uint8Array(clip.audio);
    return new NextResponse(body, {
      headers: {
        "content-type": clip.mime,
        "content-length": String(body.byteLength),
        "cache-control": p.get("p") === "1" ? "private, max-age=604800" : "public, max-age=31536000, immutable",
        "x-narration-cache": clip.cached ? "hit" : "miss",
      },
    });
  } catch (e) {
    if (e instanceof RateLimitedError) return fail(429, "Too many narration requests. Try again shortly.");
    if (e instanceof NarrationUnavailableError) {
      console.warn(`[narration] ${e.message}`);
      return fail(503, "Natural narration is unavailable right now.");
    }
    throw e;
  }
}

class RateLimitedError extends Error {}

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
