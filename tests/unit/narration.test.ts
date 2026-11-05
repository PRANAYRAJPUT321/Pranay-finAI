import { describe, expect, it } from "vitest";
import { NarrationUnavailableError, clipHash, gatewayAuth, monthlyCharBudget, narrationCandidates, narrationEnabled, narrationUrls, narratorId, signNarration, synthesize, verifyNarration } from "@/server/speech/narration";

const ENV = { DATABASE_URL: "postgresql://x/y", VERCEL: "1" };

describe("neural narration configuration", () => {
  it("is enabled on Vercel or with a gateway key, and can be switched off", () => {
    expect(narrationEnabled({})).toBe(false);
    expect(narrationEnabled({ VERCEL: "1" })).toBe(true);
    expect(narrationEnabled({ AI_GATEWAY_API_KEY: "k" })).toBe(true);
    expect(narrationEnabled({ VERCEL: "1", NARRATION_TTS: "off" })).toBe(false);
    expect(narrationEnabled({ NARRATION_TTS: "on" })).toBe(true);
  });

  it("tries a steerable natural voice first, then older models", () => {
    const c = narrationCandidates({});
    expect(c.map((x) => x.model)).toEqual(["openai/gpt-4o-mini-tts", "openai/tts-1-hd", "openai/tts-1"]);
    expect(c[0].instructions).toMatch(/warm, friendly/);
    expect(narrationCandidates({ NARRATION_TTS_MODEL: "elevenlabs/eleven-flash-v2.5" })).toEqual([expect.objectContaining({ model: "elevenlabs/eleven-flash-v2.5", voice: "hpp4J3VqNfWAUOO0d1Us" })]);
  });

  it("changes the narrator id when the voice is reconfigured, so old clips are not reused", () => {
    expect(narratorId({})).toBe("nova-v1");
    const custom = narratorId({ NARRATION_TTS_MODEL: "openai/tts-1", NARRATION_TTS_VOICE: "alloy" });
    expect(custom).toMatch(/^nova-[0-9a-f]{8}$/);
    expect(custom).not.toBe(narratorId({ NARRATION_TTS_MODEL: "openai/tts-1", NARRATION_TTS_VOICE: "nova" }));
  });

  it("reads the monthly character budget", () => {
    expect(monthlyCharBudget({})).toBe(400_000);
    expect(monthlyCharBudget({ NARRATION_TTS_MONTHLY_CHARS: "1000" })).toBe(1000);
    expect(monthlyCharBudget({ NARRATION_TTS_MONTHLY_CHARS: "nope" })).toBe(400_000);
  });
});

describe("signed narration links", () => {
  it("only verifies text the server signed", () => {
    const sig = signNarration("nova-v1", "Hello there.", ENV);
    expect(verifyNarration("nova-v1", "Hello there.", sig, ENV)).toBe(true);
    expect(verifyNarration("nova-v1", "Hello there!", sig, ENV)).toBe(false);
    expect(verifyNarration("nova-v2", "Hello there.", sig, ENV)).toBe(false);
    expect(verifyNarration("nova-v1", "Hello there.", sig, { ...ENV, DATABASE_URL: "postgresql://other" })).toBe(false);
    expect(verifyNarration("nova-v1", "Hello there.", "short", ENV)).toBe(false);
  });

  it("builds one URL per line, or nulls when disabled or too long", () => {
    expect(narrationUrls(["Hi."], {}, { DATABASE_URL: "x" })).toEqual([null]);
    const [url, long, empty] = narrationUrls(["Compounding means interest on interest.", "x".repeat(601), " "], {}, ENV);
    expect(long).toBeNull();
    expect(empty).toBeNull();
    const q = new URL(url!, "http://localhost").searchParams;
    expect(q.get("v")).toBe("nova-v1");
    expect(Buffer.from(q.get("t")!, "base64url").toString("utf8")).toBe("Compounding means interest on interest.");
    expect(verifyNarration("nova-v1", "Compounding means interest on interest.", q.get("s")!, ENV)).toBe(true);
    expect(q.get("p")).toBeNull();
    expect(new URL(narrationUrls(["Good morning, Asha."], { personal: true }, ENV)[0]!, "http://localhost").searchParams.get("p")).toBe("1");
  });

  it("hashes clips by voice and text", () => {
    expect(clipHash("nova-v1", "a")).toBe(clipHash("nova-v1", "a"));
    expect(clipHash("nova-v1", "a")).not.toBe(clipHash("nova-v2", "a"));
    expect(clipHash("nova-v1", "a")).toHaveLength(40);
  });
});

describe("AI Gateway speech call", () => {
  const candidate = { model: "openai/tts-1", voice: "nova" };
  const auth = { token: "tok", method: "api-key" };

  it("sends the speech request and decodes the audio", async () => {
    const audio = Buffer.alloc(400, 7);
    let seen: { url: string; init: RequestInit } | null = null;
    const fetcher = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ audio: audio.toString("base64") }), { status: 200 });
    }) as unknown as typeof fetch;
    const out = await synthesize("Hello.", candidate, auth, fetcher);
    expect(out.mime).toBe("audio/mpeg");
    expect(out.audio.equals(audio)).toBe(true);
    expect(seen!.url).toBe("https://ai-gateway.vercel.sh/v4/ai/speech-model");
    const h = seen!.init.headers as Record<string, string>;
    expect(h["ai-model-id"]).toBe("openai/tts-1");
    expect(h["ai-speech-model-specification-version"]).toBe("4");
    expect(h.Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(seen!.init.body))).toEqual({ text: "Hello.", voice: "nova", outputFormat: "mp3" });
  });

  it("reports gateway errors with their status", async () => {
    const notFound = (async () => new Response(JSON.stringify({ error: { type: "model_not_found", message: "no" } }), { status: 404 })) as unknown as typeof fetch;
    await expect(synthesize("Hi.", candidate, auth, notFound)).rejects.toMatchObject({ status: 404 });
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(synthesize("Hi.", candidate, auth, down)).rejects.toBeInstanceOf(NarrationUnavailableError);
    const empty = (async () => new Response(JSON.stringify({ audio: "AAAA" }), { status: 200 })) as unknown as typeof fetch;
    await expect(synthesize("Hi.", candidate, auth, empty)).rejects.toMatchObject({ status: 502 });
  });

  it("prefers an explicit gateway key, then the deployment's OIDC token", () => {
    expect(gatewayAuth(null, { AI_GATEWAY_API_KEY: "key" })).toEqual({ token: "key", method: "api-key" });
    expect(gatewayAuth(new Headers({ "x-vercel-oidc-token": "oidc" }), {})).toEqual({ token: "oidc", method: "oidc" });
  });
});
