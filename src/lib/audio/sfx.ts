/**
 * Soft cartoon sound effects synthesised with the Web Audio API (no files):
 * scene whooshes, pops for things appearing, a ding for answers. Quiet by
 * design; call primeSfx() from a click so browsers allow audio.
 */

let ctx: AudioContext | null = null;
let enabled = true;
let noise: AudioBuffer | null = null;
const VOLUME = 0.5;

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** Call synchronously inside a user gesture (click/tap). */
export function primeSfx() {
  audio();
}

function noiseBuffer(c: AudioContext) {
  if (!noise) {
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function tone(type: OscillatorType, from: number, to: number, start: number, length: number, peak: number) {
  const c = audio();
  if (!c || !enabled) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak * VOLUME, t + Math.min(0.02, length / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + length + 0.05);
}

function swish(from: number, to: number, length: number, peak: number, type: BiquadFilterType = "bandpass") {
  const c = audio();
  if (!c || !enabled) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + length);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak * VOLUME, t + length * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + length + 0.05);
}

export const sfx = {
  whoosh: () => swish(300, 2600, 0.42, 0.16),
  pop: () => tone("sine", 520, 1250, 0, 0.09, 0.16),
  tick: () => tone("triangle", 1900, 1500, 0, 0.05, 0.08),
  ding: () => {
    tone("sine", 1318, 1318, 0, 0.9, 0.12);
    tone("sine", 1976, 1976, 0.02, 0.6, 0.05);
  },
  chime: () => [784, 988, 1175, 1568].forEach((f, i) => tone("sine", f, f, i * 0.09, 0.7, 0.09)),
  stamp: () => {
    tone("sine", 160, 60, 0, 0.22, 0.32);
    swish(900, 300, 0.18, 0.12, "lowpass");
  },
  bonk: () => tone("triangle", 260, 140, 0, 0.22, 0.12),
};
