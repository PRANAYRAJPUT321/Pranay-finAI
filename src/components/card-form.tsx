"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCardAction } from "@/app/actions/content";
import { Alert, Field, Select, Textarea } from "./ui";
import { SubmitButton } from "./forms";

export function CardForm({ topics }: { topics: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createCardAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Field id="front" label="Front (question or prompt)"><Textarea id="front" name="front" rows={2} maxLength={2000} /></Field>
      <Field id="back" label="Back (answer)"><Textarea id="back" name="back" rows={3} maxLength={4000} /></Field>
      <Field id="card-topic" label="Topic">
        <Select id="card-topic" name="topicId" defaultValue=""><option value="">No topic</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
      </Field>
      <SubmitButton size="sm">Add card</SubmitButton>
    </form>
  );
}
