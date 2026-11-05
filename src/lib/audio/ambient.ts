/**
 * Generative audio built with the Web Audio API — no audio files, nothing
 * downloaded. Used for the briefing soundtrack, video lessons and the focus
 * timer's soundscapes. Must be started from a user gesture (browser rule).
 */

export type Mood = "uplift" | "focus" | "calm";
export type Soundscape = "off" | "pad" | "rain" | "brown";

// Chord progressions as semitone offsets from the root (A3 = 220 Hz).
const PROGRESSIONS: Record<Mood, number[][]> = {
  uplift: [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 11, 14, 17]], // Imaj7 – vi – IV – V
  focus: [[0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9], [-5, -1, 2, 5]],
  calm: [[0, 7, 12, 16], [5, 9, 12, 17], [-3, 4, 9, 12], [2, 7, 9, 14]],
};

const freq = (semi: number) => 220 * Math.pow(2, semi / 12);

export interface AudioEngine {
  stop: () => void;
  setVolume: (v: number) => void;
}

function context(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return Ctx ? new Ctx() : null;
  } catch {
    return null;
  }
}

/** Soft evolving pad with a gentle arpeggio on top. */
export function startPad(mood: Mood = "uplift", volume = 0.35): AudioEngine | null {
  const ctx = context();
  if (!ctx) return null;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.5);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1100;
  filter.Q.value = 0.6;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 450;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  // Simple feedback delay for space.
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  delay.connect(fb).connect(delay);
  filter.connect(master);
  filter.connect(delay);
  delay.connect(master);
  master.connect(ctx.destination);

  const chords = PROGRESSIONS[mood];
  const barSeconds = mood === "focus" ? 6 : 4.5;
  let bar = 0;
  let stopped = false;
  const voices: OscillatorNode[] = [];

  const playBar = () => {
    if (stopped) return;
    const t0 = ctx.currentTime + 0.05;
    const chord = chords[bar % chords.length];
    chord.forEach((semi, i) => {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = freq(semi - (i === 0 ? 12 : 0));
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.05, t0 + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + barSeconds + 0.8);
        o.connect(g).connect(filter);
        o.start(t0);
        o.stop(t0 + barSeconds + 1);
        voices.push(o);
      }
    });
    // Arpeggio: chord tones an octave up, eighth notes.
    if (mood !== "calm") {
      const step = barSeconds / 8;
      for (let k = 0; k < 8; k++) {
        const semi = chord[[0, 1, 2, 3, 2, 1, 2, 3][k]] + 12;
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = freq(semi);
        const g = ctx.createGain();
        const ts = t0 + k * step;
        g.gain.setValueAtTime(0.0001, ts);
        g.gain.exponentialRampToValueAtTime(0.035, ts + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ts + step * 1.6);
        o.connect(g).connect(filter);
        o.start(ts);
        o.stop(ts + step * 1.8);
      }
    }
    bar += 1;
  };
  playBar();
  const timer = setInterval(playBar, barSeconds * 1000);

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => ctx.close().catch(() => {}), 1500);
    },
    setVolume: (v) => master.gain.setTargetAtTime(v, ctx.currentTime, 0.2),
  };
}

/** Continuous noise beds: brown noise (deep, steady) or rain (filtered, with drops). */
export function startNoise(kind: "rain" | "brown", volume = 0.4): AudioEngine | null {
  const ctx = context();
  if (!ctx) return null;
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white * 0.6;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = kind === "rain" ? "bandpass" : "lowpass";
  filter.frequency.value = kind === "rain" ? 1800 : 500;
  filter.Q.value = kind === "rain" ? 0.4 : 0.5;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
  src.connect(filter).connect(master).connect(ctx.destination);
  src.start();
  let drops: ReturnType<typeof setInterval> | undefined;
  if (kind === "rain") {
    drops = setInterval(() => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 2400 + Math.random() * 2600;
      g.gain.setValueAtTime(0.012, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      o.connect(g).connect(master);
      o.start();
      o.stop(ctx.currentTime + 0.06);
    }, 90);
  }
  return {
    stop: () => {
      if (drops) clearInterval(drops);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => ctx.close().catch(() => {}), 1200);
    },
    setVolume: (v) => master.gain.setTargetAtTime(v, ctx.currentTime, 0.2),
  };
}

export function startSoundscape(kind: Soundscape, volume?: number): AudioEngine | null {
  if (kind === "off") return null;
  if (kind === "pad") return startPad("focus", volume ?? 0.3);
  return startNoise(kind, volume);
}
