import { runCalculator } from "@/lib/finance/registry";
import {
  calcSpecSchema,
  choicePayloadSchema,
  numericPayloadSchema,
  writtenPayloadSchema,
  type QType,
} from "./question-schema";

export type Response =
  | { selected: string[] }
  | { value: number | null }
  | { text: string };

export interface GradeResult {
  isCorrect: boolean;
  score: number; // 0..1
  indicative?: boolean; // true when grading is heuristic (written responses)
  matchedCriteria?: string[];
}

export function isAnswered(type: QType, response: unknown): boolean {
  if (!response || typeof response !== "object") return false;
  const r = response as Record<string, unknown>;
  if (type === "MCQ" || type === "MULTI_SELECT") return Array.isArray(r.selected) && r.selected.length > 0;
  if (type === "NUMERIC") return typeof r.value === "number" && Number.isFinite(r.value);
  return typeof r.text === "string" && r.text.trim().length > 0;
}

/** Deterministic grading of objective questions. No language model is involved. */
export function gradeResponse(type: QType, payload: unknown, response: unknown): GradeResult {
  if (!isAnswered(type, response)) return { isCorrect: false, score: 0 };
  const r = response as Record<string, unknown>;
  switch (type) {
    case "MCQ": {
      const p = choicePayloadSchema.parse(payload);
      const selected = r.selected as string[];
      const correctId = p.options.find((o) => o.correct)!.id;
      const ok = selected.length === 1 && selected[0] === correctId;
      return { isCorrect: ok, score: ok ? 1 : 0 };
    }
    case "MULTI_SELECT": {
      // All-or-nothing: exam formats that use multiple-select rarely give partial credit.
      const p = choicePayloadSchema.parse(payload);
      const selected = new Set(r.selected as string[]);
      const correct = new Set(p.options.filter((o) => o.correct).map((o) => o.id));
      const ok = selected.size === correct.size && [...correct].every((id) => selected.has(id));
      return { isCorrect: ok, score: ok ? 1 : 0 };
    }
    case "NUMERIC": {
      const p = numericPayloadSchema.parse(payload);
      const ok = withinTolerance(r.value as number, p.answer, p.tolerance, p.toleranceType);
      return { isCorrect: ok, score: ok ? 1 : 0 };
    }
    case "WRITTEN": {
      const p = writtenPayloadSchema.parse(payload);
      const text = (r.text as string).toLowerCase();
      const total = p.rubric.reduce((a, c) => a + c.points, 0);
      const matched = p.rubric.filter((c) => c.keywords.length > 0 && c.keywords.some((k) => text.includes(k.toLowerCase())));
      const earned = matched.reduce((a, c) => a + c.points, 0);
      const score = total > 0 ? earned / total : 0;
      return { isCorrect: score >= 0.6, score, indicative: true, matchedCriteria: matched.map((m) => m.criterion) };
    }
  }
}

export function withinTolerance(value: number, answer: number, tolerance: number, type: "absolute" | "relative") {
  const diff = Math.abs(value - answer);
  const allowed = type === "relative" ? Math.abs(answer) * tolerance : tolerance;
  return diff <= allowed + 1e-12;
}

export interface KeyCheck {
  ok: boolean;
  computed?: number;
  expected?: number;
  message: string;
}

/**
 * Re-computes a numeric answer key with the deterministic calculator named in
 * calcSpec. For MCQs, the correct option text must contain the computed value
 * (rounded to the precision written in the option).
 */
export function verifyAnswerKey(type: QType, payload: unknown, calcSpec: unknown): KeyCheck {
  if (calcSpec === null || calcSpec === undefined) return { ok: true, message: "No calculation to verify" };
  const spec = calcSpecSchema.parse(calcSpec);
  let computed: number;
  try {
    computed = runCalculator(spec.fn, spec.args) * spec.scale;
  } catch (e) {
    return { ok: false, message: `Calculator error: ${(e as Error).message}` };
  }
  if (type === "NUMERIC") {
    const p = numericPayloadSchema.parse(payload);
    const ok = withinTolerance(computed, p.answer, p.tolerance, p.toleranceType);
    return { ok, computed, expected: p.answer, message: ok ? "Answer key matches calculation" : "Answer key does not match calculation" };
  }
  if (type === "MCQ") {
    const p = choicePayloadSchema.parse(payload);
    const correct = p.options.find((o) => o.correct);
    const value = correct ? extractNumber(correct.text) : null;
    if (value === null) return { ok: false, computed, message: "Correct option has no numeric value to compare" };
    const decimals = decimalsIn(correct!.text);
    const ok = Math.abs(roundTo(computed, decimals) - value) <= Math.pow(10, -decimals) / 2 + 1e-9;
    // Distractors must not also match the computed value.
    const clash = p.options.some((o) => !o.correct && extractNumber(o.text) !== null && Math.abs(roundTo(computed, decimalsIn(o.text)) - extractNumber(o.text)!) < 1e-9);
    return {
      ok: ok && !clash,
      computed,
      expected: value,
      message: !ok ? "Correct option does not match calculation" : clash ? "A distractor also matches the calculation" : "Answer key matches calculation",
    };
  }
  return { ok: true, message: "Calculation check not applicable to this type" };
}

function extractNumber(text: string): number | null {
  const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function decimalsIn(text: string): number {
  const m = text.replace(/,/g, "").match(/-?\d+(?:\.(\d+))?/);
  return m?.[1]?.length ?? 0;
}

function roundTo(v: number, d: number) {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}
