"use client";

import { useActionState } from "react";
import { importAction, type ImportState } from "@/app/actions/admin";
import { Alert, Badge, Field, Select, Textarea } from "./ui";
import { SubmitButton } from "./forms";

export function ImportForm() {
  const [state, action] = useActionState<ImportState, FormData>(importAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="format" label="Format">
          <Select id="format" name="format" defaultValue="csv"><option value="csv">CSV</option><option value="json">JSON (array of rows)</option></Select>
        </Field>
        <Field id="file" label="File (max 2 MB)"><input id="file" name="file" type="file" accept=".csv,.json,text/csv,application/json" className="block w-full text-sm" /></Field>
      </div>
      <Field id="text" label="…or paste content"><Textarea id="text" name="text" rows={8} className="font-mono text-xs" /></Field>
      <div className="flex gap-2">
        <SubmitButton name="commit" value="0" variant="secondary" pendingLabel="Validating…">Validate only</SubmitButton>
        <SubmitButton name="commit" value="1" pendingLabel="Importing…">Import (if all rows valid)</SubmitButton>
      </div>
      {state.results && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500"><th className="py-1.5 font-medium">Row</th><th className="py-1.5 font-medium">Key</th><th className="py-1.5 font-medium">Result</th></tr></thead>
            <tbody>
              {state.results.map((r) => (
                <tr key={r.row} className="border-b align-top last:border-0">
                  <td className="py-1.5">{r.row}</td>
                  <td className="py-1.5 font-mono text-xs">{r.key ?? "—"}</td>
                  <td className="py-1.5">{r.ok ? <Badge tone="green">Valid{r.keyCheck ? ` · ${r.keyCheck}` : ""}</Badge> : <ul className="list-disc pl-4 text-red-700">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
