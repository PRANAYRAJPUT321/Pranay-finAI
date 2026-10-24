/** Deterministic calculators exposed to language models as tools. */
import { calculators, runCalculator } from "@/lib/finance/registry";
import type { ToolCallRecord } from "./types";

export interface ToolSpec {
  name: string;
  description: string;
  schema: { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false };
}

export const toolSpecs: ToolSpec[] = calculators.map((c) => ({
  name: `calc_${c.key}`,
  description: `${c.label}: ${c.description} Decimal-safe, deterministic. Rates are decimals (0.05 = 5%). Output format: ${c.output}.`,
  schema: {
    type: "object",
    properties: Object.fromEntries(
      c.params.map((p) => [p.name, p.kind === "list" ? { type: "array", items: { type: "number" }, description: p.label } : { type: "number", description: p.label }]),
    ),
    required: c.params.filter((p) => !p.optional).map((p) => p.name),
    additionalProperties: false,
  },
}));

/** Executes a tool call; never throws (errors are returned to the model). */
export function executeTool(name: string, input: unknown): ToolCallRecord {
  const key = name.replace(/^calc_/, "");
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Tool input must be an object");
    const value = runCalculator(key, input as Record<string, number | number[]>);
    return { name, input, output: JSON.stringify({ result: value }), isError: false };
  } catch (e) {
    return { name, input, output: JSON.stringify({ error: (e as Error).message }), isError: true };
  }
}
