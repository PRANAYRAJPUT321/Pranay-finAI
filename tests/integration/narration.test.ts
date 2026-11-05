import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { NarrationUnavailableError, clipHash, getOrCreateClip, narrationUrls, resetNarrationState } from "@/server/speech/narration";
import { GET } from "@/app/api/narration/route";

const AUDIO = Buffer.alloc(1200, 3);
const ok = () => new Response(JSON.stringify({ audio: AUDIO.toString("base64") }), { status: 200 });
const KEY_ENV = { ...process.env, AI_GATEWAY_API_KEY: "test-key", NARRATION_TTS_MONTHLY_CHARS: "400000" };

function uniqueText(label: string) {
  return `${label} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}.`;
}

beforeEach(() => resetNarrationState());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("narration clips", () => {
  it("generates a clip once and serves it from the cache afterwards", async () => {
    const text = uniqueText("Compounding means interest on interest");
    const fetcher = vi.fn(async () => ok()) as unknown as typeof fetch;
    const first = await getOrCreateClip("nova-v1", text, { fetcher, env: KEY_ENV });
    expect(first.cached).toBe(false);
    expect(first.audio.equals(AUDIO)).toBe(true);
    const second = await getOrCreateClip("nova-v1", text, { fetcher, env: KEY_ENV });
    expect(second.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const row = await prisma.narrationClip.findUnique({ where: { hash: clipHash("nova-v1", text) } });
    expect(row).toMatchObject({ voice: "nova-v1", model: "openai/gpt-4o-mini-tts", chars: text.length, mime: "audio/mpeg" });
  });

  it("falls back to the next model when one is not available", async () => {
    const text = uniqueText("Bonds pay coupons");
    const models: string[] = [];
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      const model = (init.headers as Record<string, string>)["ai-model-id"];
      models.push(model);
      return model === "openai/gpt-4o-mini-tts" ? new Response(JSON.stringify({ error: { type: "model_not_found" } }), { status: 404 }) : ok();
    }) as unknown as typeof fetch;
    await getOrCreateClip("nova-v1", text, { fetcher, env: KEY_ENV });
    expect(models).toEqual(["openai/gpt-4o-mini-tts", "openai/tts-1-hd"]);
    expect((await prisma.narrationClip.findUnique({ where: { hash: clipHash("nova-v1", text) } }))?.model).toBe("openai/tts-1-hd");
  });

  it("refuses to generate beyond the monthly budget or without credentials", async () => {
    const fetcher = vi.fn(async () => ok()) as unknown as typeof fetch;
    await expect(getOrCreateClip("nova-v1", uniqueText("Over budget"), { fetcher, env: { ...KEY_ENV, NARRATION_TTS_MONTHLY_CHARS: "5" } })).rejects.toBeInstanceOf(NarrationUnavailableError);
    await expect(getOrCreateClip("nova-v1", uniqueText("No key"), { fetcher, env: { DATABASE_URL: process.env.DATABASE_URL } })).rejects.toThrow(/credentials/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("pauses after an authentication or credit failure instead of retrying every sentence", async () => {
    const denied = vi.fn(async () => new Response(JSON.stringify({ error: { type: "authentication_error" } }), { status: 401 })) as unknown as typeof fetch;
    await expect(getOrCreateClip("nova-v1", uniqueText("Denied"), { fetcher: denied, env: KEY_ENV })).rejects.toMatchObject({ status: 401 });
    await expect(getOrCreateClip("nova-v1", uniqueText("Still paused"), { fetcher: denied, env: KEY_ENV })).rejects.toThrow(/paused/);
    expect(denied).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/narration", () => {
  const call = (url: string) => GET(new NextRequest(new URL(url, "http://localhost:3000"), { headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200)}` } }));

  it("serves signed sentences as cacheable audio and rejects tampered links", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
    const fetchMock = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchMock);
    const text = uniqueText("Retrieval practice builds memory");
    const [url] = narrationUrls([text]);
    expect(url).toBeTruthy();

    const res = await call(url!);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(res.headers.get("x-narration-cache")).toBe("miss");
    expect(Buffer.from(await res.arrayBuffer()).equals(AUDIO)).toBe(true);

    const again = await call(url!);
    expect(again.headers.get("x-narration-cache")).toBe("hit");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const tampered = new URL(url!, "http://localhost");
    tampered.searchParams.set("t", Buffer.from("Say something else entirely.").toString("base64url"));
    expect((await call(tampered.pathname + tampered.search)).status).toBe(403);
    const stale = new URL(url!, "http://localhost");
    stale.searchParams.set("v", "nova-v0");
    expect((await call(stale.pathname + stale.search)).status).toBe(410);
  });

  it("marks personal briefing lines as private and is off without credentials", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => ok()));
    const [url] = narrationUrls([uniqueText("Good morning, Asha")], { personal: true });
    expect((await call(url!)).headers.get("cache-control")).toBe("private, max-age=604800");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL", "");
    expect((await call(url!)).status).toBe(404);
  });
});
