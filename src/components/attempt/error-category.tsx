"use client";

import { useState } from "react";
import { Select } from "../ui";

const OPTIONS: Record<string, string> = {
  "": "Classify this error…",
  conceptual: "Concept not understood",
  calculation: "Calculation error",
  misread: "Misread the question",
  careless: "Careless / rushed",
  time_pressure: "Ran short of time",
  not_attempted: "Not attempted",
};

export function ErrorCategorySelect({ attemptId, itemId, initial }: { attemptId: string; itemId: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [status, setStatus] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Error type"
        className="max-w-xs"
        value={value}
        onChange={async (e) => {
          const v = e.target.value;
          setValue(v);
          setStatus("Saving…");
          const res = await fetch(`/api/attempts/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "error_category", itemId, category: v || null }) });
          setStatus(res.ok ? "Saved" : "Could not save");
        }}
      >
        {Object.entries(OPTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </Select>
      <span className="text-xs text-slate-500" aria-live="polite">{status}</span>
    </div>
  );
}
