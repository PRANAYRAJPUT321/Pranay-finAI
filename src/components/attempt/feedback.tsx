"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, XCircle, Flag } from "lucide-react";
import { Badge, Button, Select, Textarea, cx } from "../ui";
import { StartAttemptButton } from "../start-attempt";

export interface FeedbackData {
  isCorrect: boolean | null;
  score: number | null;
  explanation: string;
  steps: string[];
  conceptTested: string;
  commonMistake: string | null;
  outcome: { code: string; statement: string } | null;
  formula: { slug: string; name: string; expression: string } | null;
  lesson: { id: string; slug: string; title: string } | null;
  options: { id: string; text: string; correct: boolean; rationale: string }[] | null;
  correctAnswer: string;
  rubric?: { criterion: string; points: number }[];
}

export function FeedbackPanel({
  feedback,
  selected,
  questionId,
  type,
  context,
  similar,
}: {
  feedback: FeedbackData;
  selected: string[];
  questionId: string;
  type: string;
  context?: string | null;
  similar?: { syllabusVersionId: string; enrollmentId?: string | null };
}) {
  const written = type === "WRITTEN";
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {written ? (
          <Badge tone="amber">Indicative score {Math.round((feedback.score ?? 0) * 100)}% — compare with the model answer</Badge>
        ) : feedback.isCorrect ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> Correct</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-red-700"><XCircle className="h-4 w-4" aria-hidden /> Incorrect</span>
        )}
        {context && <Badge tone="blue">Context: {context}</Badge>}
      </div>
      <div>
        <p className="font-medium text-navy-900">{written ? "Model answer" : "Correct answer"}</p>
        <p className="mt-1 text-slate-800">{feedback.correctAnswer}</p>
      </div>
      {feedback.rubric && (
        <div>
          <p className="font-medium text-navy-900">Marking guide</p>
          <ul className="mt-1 list-disc pl-5">{feedback.rubric.map((r) => <li key={r.criterion}>{r.criterion} ({r.points} pt{r.points > 1 ? "s" : ""})</li>)}</ul>
        </div>
      )}
      <div>
        <p className="font-medium text-navy-900">Why</p>
        <p className="mt-1 text-slate-800">{feedback.explanation}</p>
      </div>
      {feedback.steps.length > 0 && (
        <div>
          <p className="font-medium text-navy-900">Step by step</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">{feedback.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
      {feedback.options && (
        <div>
          <p className="font-medium text-navy-900">Each option</p>
          <ul className="mt-1 space-y-2">
            {feedback.options.map((o) => (
              <li key={o.id} className={cx("rounded-lg border p-2", o.correct ? "border-emerald-300 bg-emerald-50" : selected.includes(o.id) ? "border-red-300 bg-red-50" : "border-slate-200 bg-white")}>
                <p className="font-medium">
                  {o.text} {o.correct && <span className="text-emerald-700">✓ correct</span>} {selected.includes(o.id) && !o.correct && <span className="text-red-700">your answer</span>}
                </p>
                <p className="text-slate-700">{o.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="font-medium text-navy-900">Concept tested</dt><dd>{feedback.conceptTested}{feedback.outcome ? ` — ${feedback.outcome.statement}` : ""}</dd></div>
        {feedback.commonMistake && <div><dt className="font-medium text-navy-900">Common mistake to avoid</dt><dd>{feedback.commonMistake}</dd></div>}
        {feedback.formula && (
          <div className="sm:col-span-2">
            <dt className="font-medium text-navy-900">Formula</dt>
            <dd><Link href={`/formulas/${feedback.formula.slug}`} className="underline">{feedback.formula.name}</Link><p className="formula mt-1">{feedback.formula.expression}</p></dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        {feedback.lesson && <Link href={`/learn/${feedback.lesson.id}`} className="rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-sm text-navy-800 hover:bg-navy-50">Review lesson: {feedback.lesson.title}</Link>}
        {similar && <StartAttemptButton variant="secondary" fields={{ syllabusVersionId: similar.syllabusVersionId, enrollmentId: similar.enrollmentId ?? undefined, kind: "PRACTICE", count: 3, similarToQuestionId: questionId }}>Practise similar questions</StartAttemptButton>}
        <ReportIssue questionId={questionId} />
      </div>
      <p className="text-xs text-slate-500">Original PD FinPrep explanation. Numerical answers are checked with deterministic calculators.</p>
    </div>
  );
}

export function ReportIssue({ questionId, lessonId, formulaId }: { questionId?: string; lessonId?: string; formulaId?: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  async function submit(form: FormData) {
    setStatus("sending");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, lessonId, formulaId, category: form.get("category"), message: form.get("message") }),
    });
    if (res.ok) setStatus("sent");
    else {
      setStatus("error");
      setError((await res.json().catch(() => ({}))).error ?? "Could not send the report");
    }
  }
  if (status === "sent") return <span className="text-xs text-emerald-700">Thanks — our content team will review it.</span>;
  return (
    <div>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Flag className="h-3.5 w-3.5" aria-hidden /> Report an issue
      </Button>
      {open && (
        <form action={submit} className="mt-2 w-full max-w-md space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <label className="block text-xs font-medium text-slate-700" htmlFor={`cat-${questionId ?? lessonId ?? formulaId}`}>What is wrong?</label>
          <Select id={`cat-${questionId ?? lessonId ?? formulaId}`} name="category" defaultValue="wrong_answer">
            <option value="wrong_answer">The answer key looks wrong</option>
            <option value="unclear">Unclear or ambiguous</option>
            <option value="outdated">Outdated rule or syllabus</option>
            <option value="typo">Typo or formatting</option>
            <option value="other">Something else</option>
          </Select>
          <Textarea name="message" rows={3} required minLength={5} maxLength={2000} placeholder="Describe the problem" aria-label="Describe the problem" />
          {status === "error" && <p className="text-xs text-red-700" role="alert">{error}</p>}
          <Button type="submit" size="sm" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send report"}</Button>
        </form>
      )}
    </div>
  );
}
