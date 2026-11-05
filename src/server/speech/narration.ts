import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getVercelOidcTokenSync } from "@vercel/oidc";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/**
 * Natural-sounding narration for generated videos.
 *
 * Sentences are synthesised once by a neural text-to-speech model through the
 * Vercel AI Gateway, stored in Postgres and reused by every learner, so a
 * lesson costs its narration only the first time anyone plays it. Pages hand
 * the browser signed URLs (the server wrote the text, the signature proves it),
 * so the endpoint can never be used to read out arbitrary text. A monthly
 * character budget caps spending; when the budget, the gateway or the network
 * is unavailable the player falls back to the device's own voice.
 */

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v4/ai/speech-model";
export const MAX_CLIP_CHARS = 600;
const DEFAULT_MONTHLY_CHARS = 400_000; // ≈ 7 hours of speech
const TIMEOUT_MS = 25_000;

const INSTRUCTIONS =
  "Voice: a warm, friendly and encouraging tutor speaking one-on-one with a student. Tone: upbeat but calm and confident. " +
  "Pacing: natural and conversational, with short pauses between ideas; slow down slightly on numbers, formulas and key terms. " +
  "Pronunciation: clear, neutral international English; read numbers, percentages and currency the way a person would say them.";

export interface Candidate {
  model: string;
  voice: string;
  instructions?: string;
}

type Env = Record<string, string | undefined>;

/** Models tried in order; the first one the gateway accepts is used. */
export function narrationCandidates(env: Env = process.env): Candidate[] {
  const model = env.NARRATION_TTS_MODEL?.trim();
  const voice = env.NARRATION_TTS_VOICE?.trim();
  if (model) return [{ model, voice: voice || (model.startsWith("openai/") ? "nova" : "hpp4J3VqNfWAUOO0d1Us"), instructions: INSTRUCTIONS }];
  return [
    { model: "openai/gpt-4o-mini-tts", voice: voice || "coral", instructions: INSTRUCTIONS },
    { model: "openai/tts-1-hd", voice: voice || "nova" },
    { model: "openai/tts-1", voice: voice || "nova" },
  ];
}

/**
 * Neural narration runs on Vercel (which authenticates to the AI Gateway with
 * its own OIDC token) or wherever AI_GATEWAY_API_KEY is set. NARRATION_TTS=off
 * disables it; NARRATION_TTS=on forces it (for example behind a proxy).
 */
export function narrationEnabled(env: Env = process.env) {
  const mode = (env.NARRATION_TTS ?? "auto").trim().toLowerCase();
  if (mode === "off" || mode === "false") return false;
  if (mode === "on" || mode === "true") return true;
  return Boolean(env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL === "1");
}

/** Identifies the narrator voice; changing the configured model or voice changes it, so old clips are not reused. */
export function narratorId(env: Env = process.env) {
  const c = narrationCandidates(env)[0];
  return env.NARRATION_TTS_MODEL?.trim() || env.NARRATION_TTS_VOICE?.trim() ? `nova-${createHash("sha256").update(`${c.model}|${c.voice}`).digest("hex").slice(0, 8)}` : "nova-v1";
}

export function monthlyCharBudget(env: Env = process.env) {
  const n = Number(env.NARRATION_TTS_MONTHLY_CHARS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MONTHLY_CHARS;
}

function signingKey(env: Env = process.env) {
  const secret = env.NARRATION_SIGNING_SECRET?.trim();
  if (secret) return secret;
  // Derived from a server-only credential so no extra secret has to be configured.
  return createHash("sha256").update(`pd-finprep-narration:${env.DATABASE_URL ?? "local"}`).digest("hex");
}

export function signNarration(voice: string, text: string, env: Env = process.env) {
  return createHmac("sha256", signingKey(env)).update(`${voice}\n${text}`).digest("base64url").slice(0, 22);
}

export function verifyNarration(voice: string, text: string, sig: string, env: Env = process.env) {
  const expected = Buffer.from(signNarration(voice, text, env));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function clipHash(voice: string, text: string) {
  return createHash("sha256").update(`${voice}\n${text}`).digest("hex").slice(0, 40);
}

/**
 * Signed narration URLs for each line (null when neural narration is off or a
 * line is too long). `personal` marks text that includes the learner's own
 * details, so it is cached privately in the browser only.
 */
export function narrationUrls(lines: string[], opts: { personal?: boolean } = {}, env: Env = process.env): (string | null)[] {
  if (!narrationEnabled(env)) return lines.map(() => null);
  const voice = narratorId(env);
  return lines.map((text) => {
    const t = text.trim();
    if (!t || t.length > MAX_CLIP_CHARS) return null;
    const q = new URLSearchParams({ v: voice, t: Buffer.from(t, "utf8").toString("base64url"), s: signNarration(voice, t, env) });
    if (opts.personal) q.set("p", "1");
    return `/api/narration?${q.toString()}`;
  });
}

export class NarrationUnavailableError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Per-instance circuit breaker: after an auth, credit or rate-limit failure, stop calling the gateway for a while.
let pausedUntil = 0;
let preferred = 0;

export function resetNarrationState() {
  pausedUntil = 0;
  preferred = 0;
}

export function gatewayAuth(headers?: Headers | null, env: Env = process.env): { token: string; method: "api-key" | "oidc" } | null {
  const key = env.AI_GATEWAY_API_KEY?.trim();
  if (key) return { token: key, method: "api-key" };
  const fromHeader = headers?.get("x-vercel-oidc-token");
  if (fromHeader) return { token: fromHeader, method: "oidc" };
  try {
    return { token: getVercelOidcTokenSync(), method: "oidc" };
  } catch {
    return null;
  }
}

const MIME: Record<string, string> = { mp3: "audio/mpeg" };

/** Calls the AI Gateway speech endpoint once. Throws with the HTTP status on failure. */
export async function synthesize(text: string, c: Candidate, auth: { token: string; method: string }, fetcher: typeof fetch = fetch) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(GATEWAY_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        "ai-gateway-protocol-version": "0.0.1",
        "ai-gateway-auth-method": auth.method,
        "ai-speech-model-specification-version": "4",
        "ai-model-id": c.model,
      },
      body: JSON.stringify({ text, voice: c.voice, outputFormat: "mp3", ...(c.instructions ? { instructions: c.instructions } : {}) }),
    });
    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { error?: { type?: string; message?: string } };
        detail = body.error?.type ?? body.error?.message ?? "";
      } catch {
        /* not JSON */
      }
      throw new NarrationUnavailableError(`gateway ${res.status}${detail ? ` ${detail}` : ""}`, res.status);
    }
    const body = (await res.json()) as { audio?: string };
    if (!body.audio) throw new NarrationUnavailableError("gateway returned no audio", 502);
    const audio = Buffer.from(body.audio, "base64");
    if (audio.length < 200) throw new NarrationUnavailableError("gateway returned empty audio", 502);
    return { audio, mime: MIME.mp3, model: c.model };
  } catch (e) {
    if (e instanceof NarrationUnavailableError) throw e;
    throw new NarrationUnavailableError(ctrl.signal.aborted ? "gateway timeout" : "gateway unreachable", 504);
  } finally {
    clearTimeout(timer);
  }
}

export async function charsUsedThisMonth() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const agg = await prisma.narrationClip.aggregate({ _sum: { chars: true }, where: { createdAt: { gte: since } } });
  return agg._sum.chars ?? 0;
}

/** Returns the cached clip, generating and storing it first if needed. */
export async function getOrCreateClip(voice: string, text: string, opts: { headers?: Headers | null; fetcher?: typeof fetch; env?: Env; beforeGenerate?: () => Promise<void> } = {}) {
  const env = opts.env ?? process.env;
  const hash = clipHash(voice, text);
  const cached = await prisma.narrationClip.findUnique({ where: { hash }, select: { audio: true, mime: true } });
  if (cached) return { audio: Buffer.from(cached.audio), mime: cached.mime, cached: true };

  if (Date.now() < pausedUntil) throw new NarrationUnavailableError("narration paused", 503);
  await opts.beforeGenerate?.();
  const auth = gatewayAuth(opts.headers, env);
  if (!auth) throw new NarrationUnavailableError("no AI Gateway credentials", 503);
  if ((await charsUsedThisMonth()) + text.length > monthlyCharBudget(env)) throw new NarrationUnavailableError("monthly narration budget reached", 503);

  const candidates = narrationCandidates(env);
  let lastError: NarrationUnavailableError | null = null;
  for (let k = 0; k < candidates.length; k++) {
    const i = (preferred + k) % candidates.length;
    try {
      const out = await synthesize(text, candidates[i], auth, opts.fetcher);
      preferred = i;
      try {
        await prisma.narrationClip.create({ data: { hash, voice, model: out.model, text, chars: text.length, mime: out.mime, audio: new Uint8Array(out.audio) } });
      } catch (e) {
        // Two requests generated the same clip at once: keep the stored one.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
      return { audio: out.audio, mime: out.mime, cached: false };
    } catch (e) {
      if (!(e instanceof NarrationUnavailableError)) throw e;
      lastError = e;
      // Model or voice not accepted: try the next candidate.
      if (e.status === 404 || e.status === 400) continue;
      if ([401, 402, 403].includes(e.status)) pausedUntil = Date.now() + 10 * 60_000;
      else if (e.status === 429) pausedUntil = Date.now() + 60_000;
      break;
    }
  }
  throw lastError ?? new NarrationUnavailableError("narration failed", 503);
}
