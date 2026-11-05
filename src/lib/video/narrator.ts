/**
 * Narration for generated videos.
 *
 * Prefers natural neural voice clips (signed URLs prepared by the server, see
 * src/server/speech/narration.ts). When a clip cannot be loaded it falls back
 * to the best voice installed on the device, and to a silent timer when speech
 * is muted or unavailable, so scenes always advance at a readable pace.
 * Reports sentence and word progress (karaoke captions) and a 0..1 mouth level
 * for the animated presenter.
 */

const WORDS_PER_SECOND = 2.5;
const SENTENCE_GAP_MS = 220;

export type VoiceSource = "neural" | "device" | "timer";

export interface NarrationOptions {
  rate?: number;
  voiceURI?: string | null;
  muted?: boolean;
  /** Keep the scene on screen for at least this long (seconds at 1x). */
  minSeconds?: number;
  /** Neural clip URL for each line (null where unavailable). */
  audio?: (string | null)[];
  /** Resume from this line (for example after a pause). */
  startAt?: number;
  /** Use the device voice even when neural clips are available. */
  preferDevice?: boolean;
  onSentence?: (index: number) => void;
  onWord?: (sentence: number, word: number) => void;
  /** Mouth openness for lip-sync, 0..1, called every animation frame while speaking. */
  onLevel?: (level: number) => void;
  onSource?: (source: VoiceSource) => void;
  /** True while waiting for the first neural clip to arrive. */
  onWaiting?: (waiting: boolean) => void;
  onDone?: () => void;
}

// ---------------------------------------------------------------------------
// Device voices
// ---------------------------------------------------------------------------

type VoiceLike = { name: string; lang: string; localService?: boolean; default?: boolean };

const NOVELTY = /\b(espeak|festival|mbrola|pico|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy)\b/;

/** Higher is more natural. Neural/"Natural" voices first, robotic and novelty voices last. */
export function rankVoice(v: VoiceLike): number {
  const name = v.name.toLowerCase();
  const lang = (v.lang || "").toLowerCase().replace("_", "-");
  if (!lang.startsWith("en")) return -1000;
  let score = 0;
  if (/natural|neural/.test(name)) score += 120; // e.g. Edge "Microsoft Aria Online (Natural)"
  if (/online/.test(name)) score += 20;
  if (/premium/.test(name)) score += 100; // Apple premium voices
  if (/enhanced/.test(name)) score += 80; // Apple enhanced voices
  if (/siri/.test(name)) score += 70;
  if (/^google /.test(name)) score += 60; // Chrome's network voices
  if (/\b(samantha|ava|allison|zoe|evan|nathan|joelle|noelle|tom|karen|daniel|moira|tessa|rishi|veena|serena|kate|oliver|aaron|nicky)\b/.test(name)) score += 25;
  if (v.localService === false) score += 15;
  if (NOVELTY.test(name)) score -= 200;
  if (/desktop|compact/.test(name)) score -= 40;
  if (/^microsoft (david|zira|mark|hazel|george|susan|heera|ravi)\b/.test(name) && !/natural|online/.test(name)) score -= 30;
  if (lang === "en-us") score += 12;
  else if (lang === "en-gb") score += 10;
  else if (lang === "en-in") score += 9;
  else if (/^en-(au|ca|ie|nz|za)/.test(lang)) score += 6;
  if (v.default) score += 2;
  return score;
}

export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith("en"))
    .sort((a, b) => rankVoice(b) - rankVoice(a));
}

export function pickVoice(voiceURI?: string | null): SpeechSynthesisVoice | undefined {
  const voices = englishVoices();
  if (voiceURI) {
    const chosen = voices.find((v) => v.voiceURI === voiceURI);
    if (chosen) return chosen;
  }
  return voices[0];
}

/** Index of the word containing character `charIndex` in `text`. */
export function wordAt(text: string, charIndex: number) {
  return text.slice(0, Math.max(0, charIndex)).split(/\s+/).filter(Boolean).length - (/\s$/.test(text.slice(0, charIndex)) || charIndex === 0 ? 0 : 1);
}

/** Splits long sentences at commas/semicolons: some engines stop or drift on very long utterances. */
export function speechChunks(text: string, max = 200): string[] {
  if (text.length <= max) return [text];
  const parts = text.split(/(?<=[,;:])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + " " + p).length > max) {
      out.push(cur);
      cur = p;
    } else cur = cur ? `${cur} ${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

// ---------------------------------------------------------------------------
// Timing helpers for neural clips (pure, unit tested)
// ---------------------------------------------------------------------------

/** Estimated start time (seconds) of each word in a clip of `duration` seconds, weighted by length and punctuation pauses. */
export function wordTimings(text: string, duration: number): number[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length || !(duration > 0)) return words.map(() => 0);
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.5 + (/[,;:]$/.test(w) ? 2 : 0) + (/[.!?]$/.test(w) ? 3 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  const lead = Math.min(0.15, duration * 0.04);
  const span = Math.max(0.1, duration - lead - Math.min(0.25, duration * 0.05));
  let t = lead;
  return weights.map((w) => {
    const at = t;
    t += (w / total) * span;
    return at;
  });
}

export function wordIndexAt(timings: number[], t: number) {
  let i = 0;
  while (i + 1 < timings.length && timings[i + 1] <= t) i++;
  return i;
}

function syllables(word: string) {
  return Math.max(1, (word.toLowerCase().match(/[aeiouy]+/g) ?? []).length);
}

/** Cartoon lip-sync: one mouth "flap" per syllable of the word being spoken. */
export function mouthLevel(words: string[], timings: number[], t: number, duration: number) {
  if (!words.length) return 0;
  const i = wordIndexAt(timings, t);
  const start = timings[i] ?? 0;
  const end = Math.min(timings[i + 1] ?? duration, start + 0.9);
  if (t < start || t > end) return 0.05;
  const x = (t - start) / Math.max(0.05, end - start);
  const flaps = syllables(words[i]);
  return 0.15 + 0.85 * Math.abs(Math.sin(Math.PI * x * flaps));
}

// ---------------------------------------------------------------------------
// Neural clips: loading, caching, playback
// ---------------------------------------------------------------------------

let neuralDisabled = false;
let failures = 0;
const statusListeners = new Set<(available: boolean) => void>();

export function neuralAvailable() {
  return !neuralDisabled;
}

export function onNeuralStatus(cb: (available: boolean) => void) {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

function reportClip(ok: boolean) {
  if (ok) {
    failures = 0;
    return;
  }
  failures += 1;
  if (failures >= 2 && !neuralDisabled) {
    neuralDisabled = true;
    statusListeners.forEach((l) => l(false));
  }
}

const clipCache = new Map<string, Promise<string | null>>();
let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= 3) await new Promise<void>((r) => waiting.push(r));
  inFlight += 1;
  try {
    return await fn();
  } finally {
    inFlight -= 1;
    waiting.shift()?.();
  }
}

export function loadClip(url: string): Promise<string | null> {
  let p = clipCache.get(url);
  if (!p) {
    p = withSlot(async () => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/")) return null;
        return URL.createObjectURL(await res.blob());
      } catch {
        return null;
      }
    });
    clipCache.set(url, p);
    p.then((v) => {
      if (!v) clipCache.delete(url);
    });
  }
  return p;
}

export function prefetchClips(urls: (string | null | undefined)[]) {
  if (neuralDisabled) return;
  for (const u of urls) if (u) void loadClip(u);
}

let audioEl: HTMLAudioElement | null = null;

function element() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
    (audioEl as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  }
  return audioEl;
}

/** A short silent WAV, used to unlock audio playback inside a user gesture (iOS/Safari rule). */
function silentWav() {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, samples * 2, true);
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/**
 * Call synchronously from a click/tap handler before playback starts: browsers
 * only allow audio that a user gesture started, and later clips reuse this element.
 */
export function primeNarration() {
  if (typeof window === "undefined") return;
  try {
    const a = element();
    if (!a.src || a.src.startsWith("data:")) {
      a.src = silentWav();
      a.muted = false;
      void a.play().catch(() => {});
    }
  } catch {
    /* audio unavailable */
  }
}

function playClip(src: string, o: { rate: number; onFrame: (t: number, d: number) => void; register: (stop: () => void) => void }): Promise<"ended" | "error" | "stopped"> {
  return new Promise((resolve) => {
    const a = element();
    let raf = 0;
    let settled = false;
    const finish = (r: "ended" | "error" | "stopped") => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(raf);
      a.onended = null;
      a.onerror = null;
      resolve(r);
    };
    const tick = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) o.onFrame(a.currentTime, a.duration);
      raf = requestAnimationFrame(tick);
    };
    a.onended = () => finish("ended");
    a.onerror = () => finish("error");
    o.register(() => {
      a.pause();
      finish("stopped");
    });
    a.src = src;
    a.muted = false;
    a.playbackRate = o.rate;
    a.play().then(
      () => (raf = requestAnimationFrame(tick)),
      () => finish("error"),
    );
  });
}

function timeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------

/** Speaks `lines` in order. Returns a cancel function. */
export function narrate(lines: string[], o: NarrationOptions = {}): () => void {
  const rate = o.rate ?? 1;
  const from = Math.min(Math.max(0, o.startAt ?? 0), Math.max(0, lines.length - 1));
  const start = performance.now();
  const share = lines.length ? (lines.length - from) / lines.length : 1;
  const minMs = (((o.minSeconds ?? 0) * 0.75 * 1000) / rate) * share;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;
  let finished = false;
  let stopClip: (() => void) | null = null;
  let raf = 0;
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

  const done = () => {
    if (cancelled || finished) return;
    finished = true;
    o.onLevel?.(0);
    const wait = Math.max(400, minMs - (performance.now() - start));
    timers.push(setTimeout(() => !cancelled && o.onDone?.(), wait));
  };

  const sleep = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));

  // Timer-driven captions: used when muted, unsupported, or after a speech error.
  const runTimed = (fromSentence: number) => {
    o.onSource?.("timer");
    let t = 0;
    for (let s = fromSentence; s < lines.length; s++) {
      const words = lines[s].split(/\s+/).filter(Boolean);
      const at = t;
      timers.push(setTimeout(() => !cancelled && o.onSentence?.(s), at));
      words.forEach((_, w) => timers.push(setTimeout(() => !cancelled && o.onWord?.(s, w), at + (w * 1000) / (WORDS_PER_SECOND * rate))));
      t += (Math.max(1, words.length) * 1000) / (WORDS_PER_SECOND * rate) + 350;
    }
    timers.push(setTimeout(done, t));
  };

  const runDevice = (fromSentence: number) => {
    if (!synth) return runTimed(fromSentence);
    o.onSource?.("device");
    synth.cancel();
    const voice = pickVoice(o.voiceURI);
    let fellBack = false;
    let lastBoundary = 0;
    const loop = () => {
      const since = performance.now() - lastBoundary;
      o.onLevel?.(since < 260 ? 0.2 + 0.8 * Math.abs(Math.sin((since / 260) * Math.PI)) : 0.05);
      raf = requestAnimationFrame(loop);
    };
    if (o.onLevel) raf = requestAnimationFrame(loop);
    for (let i = fromSentence; i < lines.length; i++) {
      const chunks = speechChunks(lines[i]);
      let offset = 0;
      chunks.forEach((chunk, c) => {
        const wordOffset = offset;
        offset += chunk.split(/\s+/).filter(Boolean).length;
        const u = new SpeechSynthesisUtterance(chunk);
        u.rate = rate;
        u.pitch = 1;
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        u.onstart = () => {
          if (cancelled || fellBack) return;
          lastBoundary = performance.now();
          if (c === 0) o.onSentence?.(i);
          o.onWord?.(i, wordOffset);
        };
        u.onboundary = (e) => {
          if (cancelled || fellBack || e.name !== "word") return;
          lastBoundary = performance.now();
          o.onWord?.(i, wordOffset + Math.max(0, wordAt(chunk, e.charIndex)));
        };
        u.onend = () => {
          if (!cancelled && !fellBack && i === lines.length - 1 && c === chunks.length - 1) {
            cancelAnimationFrame(raf);
            done();
          }
        };
        u.onerror = (e) => {
          if (cancelled || fellBack || e.error === "interrupted" || e.error === "canceled") return;
          fellBack = true;
          cancelAnimationFrame(raf);
          synth.cancel();
          runTimed(i);
        };
        synth.speak(u);
      });
    }
  };

  const runNeural = async (fromSentence: number) => {
    const urls = o.audio ?? [];
    o.onSource?.("neural");
    prefetchClips(urls.slice(fromSentence, fromSentence + 3));
    for (let i = fromSentence; i < lines.length; i++) {
      if (cancelled) return;
      const url = urls[i];
      const first = i === fromSentence;
      if (first) o.onWaiting?.(true);
      const src = url ? await timeout(loadClip(url), first ? 20_000 : 25_000) : null;
      if (first) o.onWaiting?.(false);
      if (cancelled) return;
      if (!src) {
        reportClip(false);
        return o.muted ? runTimed(i) : runDevice(i);
      }
      reportClip(true);
      prefetchClips(urls.slice(i + 1, i + 3));
      o.onSentence?.(i);
      o.onWord?.(i, 0);
      const words = lines[i].split(/\s+/).filter(Boolean);
      let timings: number[] = [];
      let lastWord = 0;
      const result = await playClip(src, {
        rate,
        register: (stop) => (stopClip = stop),
        onFrame: (t, d) => {
          if (!timings.length) timings = wordTimings(lines[i], d);
          const w = wordIndexAt(timings, t);
          if (w !== lastWord) {
            lastWord = w;
            o.onWord?.(i, w);
          }
          o.onLevel?.(mouthLevel(words, timings, t, d));
        },
      });
      stopClip = null;
      o.onLevel?.(0);
      if (cancelled || result === "stopped") return;
      if (result === "error") {
        reportClip(false);
        return runDevice(i);
      }
      if (i < lines.length - 1) await sleep(SENTENCE_GAP_MS / rate);
    }
    done();
  };

  if (lines.length === 0) runTimed(0);
  else if (o.muted) runTimed(from);
  else if (!o.preferDevice && !neuralDisabled && (o.audio ?? []).some(Boolean)) void runNeural(from);
  else runDevice(from);

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    stopClip?.();
    synth?.cancel();
    o.onLevel?.(0);
  };
}
