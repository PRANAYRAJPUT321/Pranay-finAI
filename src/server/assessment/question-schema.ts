import { z } from "zod";

export const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  correct: z.boolean(),
  rationale: z.string().min(1, "Every option needs a rationale explaining why it is right or wrong"),
});

export const choicePayloadSchema = z.object({ options: z.array(optionSchema).min(2).max(8) });

export const numericPayloadSchema = z.object({
  answer: z.number(),
  tolerance: z.number().nonnegative(),
  toleranceType: z.enum(["absolute", "relative"]).default("absolute"),
  unit: z.string().optional(),
  decimals: z.number().int().min(0).max(8).default(2),
});

export const writtenPayloadSchema = z.object({
  rubric: z.array(z.object({ criterion: z.string(), points: z.number().positive(), keywords: z.array(z.string()).default([]) })).min(1),
  modelAnswer: z.string(),
});

export const calcSpecSchema = z.object({
  fn: z.string(),
  args: z.record(z.string(), z.union([z.number(), z.array(z.number())])),
  // Transform from calculator output to the answer key (e.g. percent display).
  scale: z.number().default(1),
});

export type ChoicePayload = z.infer<typeof choicePayloadSchema>;
export type NumericPayload = z.infer<typeof numericPayloadSchema>;
export type WrittenPayload = z.infer<typeof writtenPayloadSchema>;
export type CalcSpec = z.infer<typeof calcSpecSchema>;

export const questionTypes = ["MCQ", "MULTI_SELECT", "NUMERIC", "WRITTEN"] as const;
export type QType = (typeof questionTypes)[number];

/** Validates a payload for its question type, including answer-key invariants. */
export function validatePayload(type: QType, payload: unknown) {
  switch (type) {
    case "MCQ": {
      const p = choicePayloadSchema.parse(payload);
      const correct = p.options.filter((o) => o.correct).length;
      if (correct !== 1) throw new Error("A multiple-choice question must have exactly one correct option");
      assertUniqueIds(p.options.map((o) => o.id));
      return p;
    }
    case "MULTI_SELECT": {
      const p = choicePayloadSchema.parse(payload);
      if (p.options.filter((o) => o.correct).length < 1) throw new Error("A multiple-select question needs at least one correct option");
      assertUniqueIds(p.options.map((o) => o.id));
      return p;
    }
    case "NUMERIC":
      return numericPayloadSchema.parse(payload);
    case "WRITTEN":
      return writtenPayloadSchema.parse(payload);
  }
}

function assertUniqueIds(ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new Error("Option ids must be unique");
}

/** Shape sent to the browser during an attempt: never includes correctness or rationales. */
export function redactPayload(type: QType, payload: unknown) {
  if (type === "MCQ" || type === "MULTI_SELECT") {
    const p = choicePayloadSchema.parse(payload);
    return { options: p.options.map((o) => ({ id: o.id, text: o.text })) };
  }
  if (type === "NUMERIC") {
    const p = numericPayloadSchema.parse(payload);
    return { unit: p.unit ?? null, decimals: p.decimals };
  }
  return {};
}
