/** Maps a spoken reply ("bee", "option C", "the answer is a") to an option letter, or a command. */
export type SpokenIntent = { kind: "answer"; letter: string } | { kind: "repeat" } | { kind: "skip" } | { kind: "stop" } | { kind: "unknown" };

const SOUNDS: Record<string, string> = { a: "A", ay: "A", eh: "A", hey: "A", b: "B", be: "B", bee: "B", c: "C", see: "C", sea: "C", si: "C", d: "D", dee: "D", the: "" };

export function parseSpokenAnswer(transcript: string, letters: string[]): SpokenIntent {
  const t = transcript.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return { kind: "unknown" };
  if (/\b(repeat|again|say that again)\b/.test(t)) return { kind: "repeat" };
  if (/\b(skip|next|pass)\b/.test(t)) return { kind: "skip" };
  if (/\b(stop|quit|end|finish)\b/.test(t)) return { kind: "stop" };
  const words = t.split(" ");
  // Prefer the word after "option"/"answer"/"letter", then the last recognised letter sound.
  for (let i = 0; i < words.length - 1; i++) {
    if (["option", "answer", "letter", "is"].includes(words[i])) {
      const l = SOUNDS[words[i + 1]];
      if (l && letters.includes(l)) return { kind: "answer", letter: l };
    }
  }
  for (let i = words.length - 1; i >= 0; i--) {
    const l = SOUNDS[words[i]];
    if (l && letters.includes(l)) return { kind: "answer", letter: l };
  }
  return { kind: "unknown" };
}
