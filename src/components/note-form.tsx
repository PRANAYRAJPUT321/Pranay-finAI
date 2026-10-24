"use client";

import { useActionState, useRef, useEffect } from "react";
import { createNoteAction } from "@/app/actions/content";
import { Alert, Field, Input, Textarea } from "./ui";
import { SubmitButton } from "./forms";

export function NoteForm({ lessonId, topicId, formulaId, path, defaultTitle }: { lessonId?: string; topicId?: string; formulaId?: string; path: string; defaultTitle?: string }) {
  const [state, action] = useActionState(createNoteAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}
      {topicId && <input type="hidden" name="topicId" value={topicId} />}
      {formulaId && <input type="hidden" name="formulaId" value={formulaId} />}
      <input type="hidden" name="path" value={path} />
      <Field id="note-title" label="Title"><Input id="note-title" name="title" defaultValue={defaultTitle} maxLength={160} /></Field>
      <Field id="note-body" label="Note"><Textarea id="note-body" name="body" rows={4} maxLength={20000} /></Field>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="highlight" /> Pin to my revision notebook</label>
      <SubmitButton size="sm">Save note</SubmitButton>
    </form>
  );
}
