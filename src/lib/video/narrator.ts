/**
 * Browser narration for generated videos. Speaks lines with the device's
 * speech synthesis, reports sentence and word progress (for karaoke
 * captions), and falls back to a timer when speech is muted, unsupported or
 * fails — so scenes always advance at a readable pace.
 */

const WORDS_PER_SECOND = 2.5;

export interface NarrationOptions {
  rate?: number;
  voiceURI?: string | null;
  muted?: boolean;
  /** Keep the scene on screen for at least this long (seconds at 1x). */
  minSeconds?: number;
  onSentence?: (index: number) => void;
  onWord?: (sentence: number, word: number) => void;
  onDone?: () => void;
}

export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("en"));
}

export function pickVoice(voiceURI?: string | null): SpeechSynthesisVoice | undefined {
  const voices = englishVoices();
  if (voiceURI) {
    const chosen = voices.find((v) => v.voiceURI === voiceURI);
    if (chosen) return chosen;
  }
  return (
    voices.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ??
    voices.find((v) => /google/i.test(v.name) && /en-(GB|US|IN)/i.test(v.lang)) ??
    voices.find((v) => /en-(GB|IN|US)/i.test(v.lang)) ??
    voices[0]
  );
}

/** Index of the word containing character `charIndex` in `text`. */
export function wordAt(text: string, charIndex: number) {
  return text.slice(0, Math.max(0, charIndex)).split(/\s+/).filter(Boolean).length - (/\s$/.test(text.slice(0, charIndex)) || charIndex === 0 ? 0 : 1);
}

/** Speaks `lines` in order. Returns a cancel function. */
export function narrate(lines: string[], o: NarrationOptions = {}): () => void {
  const rate = o.rate ?? 1;
  const start = performance.now();
  const minMs = ((o.minSeconds ?? 0) * 0.75 * 1000) / rate;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;
  let finished = false;
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

  const done = () => {
    if (cancelled || finished) return;
    finished = true;
    const wait = Math.max(500, minMs - (performance.now() - start));
    timers.push(setTimeout(() => !cancelled && o.onDone?.(), wait));
  };

  // Timer-driven captions: used when muted, unsupported, or after a speech error.
  const runTimed = (fromSentence: number) => {
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

  if (!synth || o.muted || lines.length === 0) {
    runTimed(0);
  } else {
    synth.cancel();
    const voice = pickVoice(o.voiceURI);
    let fellBack = false;
    lines.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      if (voice) u.voice = voice;
      u.onstart = () => {
        if (!cancelled && !fellBack) {
          o.onSentence?.(i);
          o.onWord?.(i, 0);
        }
      };
      u.onboundary = (e) => {
        if (!cancelled && !fellBack && e.name === "word") o.onWord?.(i, Math.max(0, wordAt(text, e.charIndex)));
      };
      u.onend = () => {
        if (!cancelled && !fellBack && i === lines.length - 1) done();
      };
      u.onerror = (e) => {
        if (cancelled || fellBack || e.error === "interrupted" || e.error === "canceled") return;
        fellBack = true;
        synth.cancel();
        runTimed(i);
      };
      synth.speak(u);
    });
  }

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    synth?.cancel();
  };
}
