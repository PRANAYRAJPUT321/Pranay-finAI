"use client";

import { useActionState, useState } from "react";
import { logStudyAction, rescheduleAction } from "@/app/actions/learning";
import { Alert, Button, Field, Input, Select } from "./ui";
import { SubmitButton } from "./forms";

export function RescheduleForm({ taskId, current }: { taskId: string; current: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(rescheduleAction.bind(null, taskId), {});
  const today = new Date().toISOString().slice(0, 10);
  if (!open) return <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>Move</Button>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`d-${taskId}`}>New date</label>
      <Input id={`d-${taskId}`} name="date" type="date" min={today} defaultValue={current < today ? today : current} className="w-auto" />
      <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
      {state.error && <span className="text-xs text-red-700" role="alert">{state.error}</span>}
    </form>
  );
}

export function LogStudyForm({ enrollmentId }: { enrollmentId: string }) {
  const [state, action] = useActionState(logStudyAction, {});
  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <div className="grid grid-cols-2 gap-3">
        <Field id="log-min" label="Minutes"><Input id="log-min" name="minutes" type="number" min={1} max={600} defaultValue={30} /></Field>
        <Field id="log-act" label="Activity">
          <Select id="log-act" name="activity" defaultValue="other">
            <option value="lesson">Reading / lessons</option>
            <option value="practice">Practice questions</option>
            <option value="flashcards">Flashcards</option>
            <option value="mock">Mock exam</option>
            <option value="other">Other study (books, classes)</option>
          </Select>
        </Field>
      </div>
      <Field id="log-note" label="Note (optional)"><Input id="log-note" name="note" maxLength={300} /></Field>
      <SubmitButton size="sm">Log time</SubmitButton>
    </form>
  );
}
