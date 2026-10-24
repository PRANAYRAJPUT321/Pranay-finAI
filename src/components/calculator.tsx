"use client";

import { useState } from "react";
import { calculatorMap, formatOutput } from "@/lib/finance/registry";
import { Button, Input } from "./ui";

/** Interactive deterministic calculator backed by the same code that verifies answer keys. */
export function CalculatorWidget({ calcKey }: { calcKey: string }) {
  const calc = calculatorMap[calcKey];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((calc?.params ?? []).map((p) => [p.name, Array.isArray(p.example) ? p.example.join(", ") : String(p.example)])),
  );
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!calc) return null;
  function run() {
    try {
      const args: Record<string, number | number[]> = {};
      for (const p of calc.params) {
        const raw = values[p.name]?.trim() ?? "";
        if (p.kind === "list") args[p.name] = raw.split(/[,\s]+/).filter(Boolean).map(Number);
        else if (raw !== "") args[p.name] = Number(raw);
      }
      setResult(formatOutput(calc.compute(args), calc.output));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-medium text-navy-900">{calc.label}</p>
      <p className="text-xs text-slate-500">{calc.description}</p>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        {calc.params.map((p) => (
          <div key={p.name}>
            <label htmlFor={`${calcKey}-${p.name}`} className="mb-1 block text-xs font-medium text-slate-700">{p.label}</label>
            <Input id={`${calcKey}-${p.name}`} value={values[p.name] ?? ""} inputMode={p.kind === "list" ? "text" : "decimal"} onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))} />
          </div>
        ))}
        <div className="flex items-end gap-3 sm:col-span-2">
          <Button type="submit" size="sm">Calculate</Button>
          <output aria-live="polite" className="font-mono text-sm text-navy-900">{result !== null ? `= ${result}` : ""}</output>
        </div>
        {error && <p className="text-xs text-red-700 sm:col-span-2" role="alert">{error}</p>}
      </form>
    </div>
  );
}
