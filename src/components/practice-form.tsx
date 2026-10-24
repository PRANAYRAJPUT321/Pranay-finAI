"use client";

import { useActionState, useState } from "react";
import { startAttemptAction } from "@/app/actions/learning";
import { Alert, Field, Input, Select } from "./ui";
import { SubmitButton } from "./forms";

export function PracticeForm({ syllabusVersionId, enrollmentId, topics }: { syllabusVersionId: string; enrollmentId: string; topics: { id: string; name: string; available: number }[] }) {
  const [state, action] = useActionState(startAttemptAction, {});
  const [mode, setMode] = useState("UNTIMED");
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="syllabusVersionId" value={syllabusVersionId} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Topics (leave empty for a mixed set weighted by the syllabus)</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {topics.map((t) => (
            <label key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
              <span className="flex items-center gap-2"><input type="checkbox" name="topicIds" value={t.id} disabled={t.available === 0} />{t.name}</span>
              <span className="text-xs text-slate-500">{t.available} Q</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="count" label="Number of questions">
          <Input id="count" name="count" type="number" min={1} max={60} defaultValue={10} />
        </Field>
        <Field id="difficulty" label="Difficulty">
          <Select id="difficulty" name="difficulty" defaultValue="">
            <option value="">Mixed</option>
            <option value="1">Easier</option>
            <option value="2">Medium</option>
            <option value="3">Harder</option>
          </Select>
        </Field>
        <Field id="mode" label="Timing">
          <Select id="mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="UNTIMED">Untimed</option>
            <option value="TIMED">Timed (target pace)</option>
          </Select>
        </Field>
        <Field id="feedback" label="Feedback">
          <Select id="feedback" name="feedback" defaultValue="immediate">
            <option value="immediate">After each question</option>
            <option value="end">At the end</option>
          </Select>
        </Field>
      </div>
      <input type="hidden" name="kind" value="PRACTICE" />
      <SubmitButton pendingLabel="Building your set…">Start practice</SubmitButton>
      <p className="text-xs text-slate-500">Unseen questions are prioritised. No question repeats within a set.</p>
    </form>
  );
}

export function MockForm({ syllabusVersionId, enrollmentId, topics }: { syllabusVersionId: string; enrollmentId: string; topics: { id: string; name: string }[] }) {
  const [state, action] = useActionState(startAttemptAction, {});
  const [type, setType] = useState("full");
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="syllabusVersionId" value={syllabusVersionId} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="kind" value="MOCK" />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Mock type</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { v: "full", l: "Full-length", d: "Configured exam structure and timing" },
            { v: "half", l: "Half-length", d: "Half the questions and time" },
            { v: "sectional", l: "Sectional", d: "One topic, exam pacing" },
            { v: "custom", l: "Custom", d: "Choose topics, size and time" },
          ].map((o) => (
            <label key={o.v} className={`cursor-pointer rounded-lg border p-3 text-sm ${type === o.v ? "border-navy-700 bg-navy-50" : "border-slate-200"}`}>
              <span className="flex items-center gap-2 font-medium text-navy-900"><input type="radio" name="mockType" value={o.v} checked={type === o.v} onChange={() => setType(o.v)} />{o.l}</span>
              <span className="mt-1 block text-xs text-slate-500">{o.d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {(type === "sectional" || type === "custom") && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">{type === "sectional" ? "Topic" : "Topics"}</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {topics.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                <input type={type === "sectional" ? "radio" : "checkbox"} name="topicIds" value={t.id} required={type === "sectional"} />{t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {(type === "sectional" || type === "custom") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="m-count" label="Questions"><Input id="m-count" name="count" type="number" min={5} max={120} defaultValue={type === "sectional" ? 10 : 30} /></Field>
          <Field id="m-min" label="Time limit (minutes)" hint="Leave blank to use each question's target time."><Input id="m-min" name="minutes" type="number" min={1} max={600} /></Field>
          <input type="hidden" name="mode" value="TIMED" />
        </div>
      )}
      <SubmitButton variant="gold" pendingLabel="Preparing mock…">Start mock</SubmitButton>
      <p className="text-xs text-slate-500">Exam simulation: answers are hidden until you submit and pausing is disabled. The timer keeps running if you leave the page.</p>
    </form>
  );
}
