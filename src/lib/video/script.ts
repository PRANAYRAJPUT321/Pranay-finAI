/**
 * Turns structured lesson content into a short scene-by-scene explainer
 * (on-screen text + narration). Pure and deterministic, so it can run on the
 * server and be unit tested. Narration is spoken in the browser with the
 * device's speech synthesis; nothing here is invented beyond the lesson.
 */

export type SceneKind = "title" | "objectives" | "intuition" | "formula" | "example" | "trap" | "summary" | "outro";

export type Scene = {
  kind: SceneKind;
  eyebrow: string;
  heading: string;
  lines: string[];
  /** Highlighted text, e.g. a formula expression or an answer. */
  highlight?: string;
  narration: string[]; // sentences, spoken in order
  seconds: number; // estimated duration at 1× speed
};

type LessonInput = {
  title: string;
  programLabel: string;
  topic: string;
  content: {
    objectives: string[];
    explanations: { beginner: string; intermediate: string };
    workedExamples: { title: string; problem: string; steps: string[]; answer: string }[];
    misconceptions: { myth: string; reality: string }[];
    summary: string[];
  };
  formulas: { name: string; expression: string; variables: { symbol?: string; meaning?: string }[] }[];
};

const WORDS_PER_SECOND = 2.5;

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(“"])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** First n sentences of a passage, trimmed to a narration-friendly length. */
export function firstSentences(text: string, n: number, maxChars = 420) {
  const out: string[] = [];
  let len = 0;
  for (const s of splitSentences(text)) {
    if (out.length >= n || (out.length > 0 && len + s.length > maxChars)) break;
    out.push(s);
    len += s.length;
  }
  return out;
}

/** Makes symbols readable for text-to-speech (σ → sigma, × → times, …). */
export function speakable(text: string) {
  return text
    .replace(/σ²/g, "sigma squared")
    .replace(/σ/g, "sigma")
    .replace(/β/g, "beta")
    .replace(/μ/g, "mu")
    .replace(/ρ/g, "rho")
    .replace(/Σ/g, "the sum of")
    .replace(/√/g, "square root of ")
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/≈/g, " approximately ")
    .replace(/≥/g, " at least ")
    .replace(/≤/g, " at most ")
    .replace(/−/g, " minus ")
    .replace(/\^2\b/g, " squared")
    .replace(/\^/g, " to the power ")
    .replace(/₹\s?/g, "rupees ")
    .replace(/\be\.g\./gi, "for example")
    .replace(/\bi\.e\./gi, "that is")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function seconds(narration: string[], extra = 0) {
  const words = narration.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.round(words / WORDS_PER_SECOND) + extra);
}

function scene(s: Omit<Scene, "seconds" | "narration"> & { narration: string[]; extra?: number }): Scene {
  const narration = s.narration.map(speakable).filter(Boolean);
  const { extra, ...rest } = s;
  return { ...rest, narration, seconds: seconds(narration, extra ?? 0) };
}

export function buildExplainer(input: LessonInput): Scene[] {
  const c = input.content;
  const scenes: Scene[] = [];
  scenes.push(
    scene({
      kind: "title",
      eyebrow: `${input.programLabel} · ${input.topic}`,
      heading: input.title,
      lines: [],
      narration: [`${input.title}.`, `In the next few minutes we will build the intuition, look at the key formula, work through an example and flag the most common exam trap.`],
    }),
  );
  const objectives = c.objectives.slice(0, 4);
  scenes.push(scene({ kind: "objectives", eyebrow: "By the end you can", heading: "Objectives", lines: objectives, narration: ["By the end of this explainer you should be able to:", ...objectives.map((o) => `${o.replace(/\.$/, "")}.`)], extra: 1 }));

  const intuition = firstSentences(c.explanations.beginner, 3);
  if (intuition.length) scenes.push(scene({ kind: "intuition", eyebrow: "The big idea", heading: "Intuition", lines: intuition, narration: intuition, extra: 1 }));
  const deeper = firstSentences(c.explanations.intermediate, 2, 320);
  if (deeper.length) scenes.push(scene({ kind: "intuition", eyebrow: "A level deeper", heading: "How it works", lines: deeper, narration: deeper, extra: 1 }));

  for (const f of input.formulas.slice(0, 2)) {
    const vars = f.variables.filter((v) => v.symbol && v.meaning).slice(0, 5).map((v) => `${v.symbol} — ${v.meaning}`);
    scenes.push(
      scene({
        kind: "formula",
        eyebrow: "Key formula",
        heading: f.name,
        highlight: f.expression,
        lines: vars,
        narration: [`The key formula is ${f.name}.`, `${f.expression}.`, ...f.variables.filter((v) => v.symbol && v.meaning).slice(0, 4).map((v) => `${v.symbol} is ${v.meaning}.`)],
        extra: 2,
      }),
    );
  }

  const ex = c.workedExamples[0];
  if (ex) {
    const steps = ex.steps.slice(0, 5);
    scenes.push(
      scene({
        kind: "example",
        eyebrow: "Worked example",
        heading: ex.title,
        lines: steps,
        highlight: ex.answer,
        narration: [...firstSentences(ex.problem, 3, 360), ...steps.map((s, i) => `Step ${i + 1}. ${s}`), `So the answer is ${ex.answer}.`],
        extra: 3,
      }),
    );
  }

  const trap = c.misconceptions[0];
  if (trap) scenes.push(scene({ kind: "trap", eyebrow: "Exam trap", heading: "Don't fall for this", lines: [trap.myth, trap.reality], narration: [`A common trap: ${trap.myth}`, `In fact, ${trap.reality}`], extra: 1 }));

  const summary = c.summary.slice(0, 4);
  scenes.push(scene({ kind: "summary", eyebrow: "Remember", heading: "Summary", lines: summary, narration: ["To summarise.", ...summary], extra: 1 }));
  scenes.push(scene({ kind: "outro", eyebrow: "Next step", heading: "Now practise it", lines: [], narration: ["Now lock it in with a short topic quiz, and review the full lesson notes for the details."] }));
  return scenes;
}

export const totalSeconds = (scenes: Scene[]) => scenes.reduce((a, s) => a + s.seconds, 0);
