"use client";

import { useActionState, useState } from "react";
import { updateNoteAction } from "@/app/actions/content";
import { Alert, Button, Input, Textarea } from "./ui";
import { SubmitButton } from "./forms";

export function NoteEdit({ note }: { note: { id: string; title: string; body: string; highlight: boolean } }) {
  const [editing, setEditing] = useState(false);
  const [s, action] = useActionState(updateNoteAction.bind(null, note.id), {});
  if (!editing) return <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>;
  return (
    <form action={action} className="mt-2 w-full space-y-2">
      {s.error && <Alert tone="error">{s.error}</Alert>}
      <label className="sr-only" htmlFor={`t-${note.id}`}>Title</label>
      <Input id={`t-${note.id}`} name="title" defaultValue={note.title} maxLength={160} />
      <label className="sr-only" htmlFor={`b-${note.id}`}>Note</label>
      <Textarea id={`b-${note.id}`} name="body" defaultValue={note.body} rows={4} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="highlight" defaultChecked={note.highlight} /> Pinned to revision notebook</label>
      <div className="flex gap-2"><SubmitButton size="sm">Save</SubmitButton><Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>Close</Button></div>
      {s.message && <p className="text-xs text-emerald-700">{s.message}</p>}
    </form>
  );
}
