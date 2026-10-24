"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Pause, Play, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { AttemptView } from "@/server/assessment/service";
import { Alert, Badge, Button, Input, Textarea, cx } from "../ui";
import { FeedbackPanel, type FeedbackData } from "./feedback";

type Item = AttemptView["items"][number];
type Resp = { selected?: string[]; value?: number | null; text?: string } | null;

function fmtClock(s: number | null) {
  if (s === null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

function answered(item: Item, r: Resp) {
  if (!r) return false;
  if (item.question.type === "NUMERIC") return typeof r.value === "number";
  if (item.question.type === "WRITTEN") return !!r.text?.trim();
  return (r.selected?.length ?? 0) > 0;
}

export function AttemptRunner({ initial, enrollmentId }: { initial: AttemptView; enrollmentId: string | null }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const sectionItems = useMemo(() => (view.config.sections.length > 1 ? view.items.filter((i) => i.section === view.currentSection) : view.items), [view]);
  const [index, setIndex] = useState(() => {
    const firstOpen = sectionItems.findIndex((i) => !answered(i, i.response as Resp));
    return Math.max(0, firstOpen);
  });
  const [responses, setResponses] = useState<Record<string, Resp>>(() => Object.fromEntries(initial.items.map((i) => [i.id, i.response as Resp])));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(initial.sectionRemainingSeconds);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeSince = useRef<number>(Date.now());
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = sectionItems[Math.min(index, sectionItems.length - 1)];
  const paused = view.status === "PAUSED";

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/attempts/${view.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status });
      return data;
    },
    [view.id],
  );

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/attempts/${view.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const fresh = (await res.json()) as AttemptView;
    if (fresh.status === "SUBMITTED") {
      router.push(`/attempt/${view.id}/results`);
      return;
    }
    setView(fresh);
    setRemaining(fresh.sectionRemainingSeconds);
  }, [router, view.id]);

  const takeTime = () => {
    const now = Date.now();
    const delta = Math.round((now - activeSince.current) / 1000);
    activeSince.current = now;
    return paused ? 0 : Math.min(delta, 3600);
  };

  const save = useCallback(
    async (itemId: string, patch: Record<string, unknown>) => {
      setSaveState("saving");
      try {
        await call({ action: "save", itemId, timeSpentDelta: takeTime(), ...patch });
        setSaveState("saved");
        setError(null);
      } catch (e) {
        const err = e as Error & { status?: number };
        setSaveState("error");
        setError(err.message);
        if (err.status === 409) await refresh();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [call, refresh, paused],
  );

  // Countdown display; the server remains the source of truth.
  useEffect(() => {
    if (remaining === null || paused) return;
    const t = setInterval(() => setRemaining((r) => (r === null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(t);
  }, [remaining === null, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (remaining === 0) void refresh();
  }, [remaining, refresh]);

  // Warn before leaving with an unsaved change.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (saveState === "saving" || pendingSave.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [saveState]);

  if (!item) return <Alert tone="error">This assessment has no questions.</Alert>;
  const r = responses[item.id] ?? null;
  const locked = item.locked;
  const timed = view.remainingSeconds !== null;

  function setResponse(next: Resp, debounce = 0) {
    setResponses((prev) => ({ ...prev, [item.id]: next }));
    if (pendingSave.current) clearTimeout(pendingSave.current);
    const id = item.id;
    pendingSave.current = setTimeout(() => {
      pendingSave.current = null;
      void save(id, { response: next });
    }, debounce);
  }

  async function go(to: number) {
    if (pendingSave.current) {
      clearTimeout(pendingSave.current);
      pendingSave.current = null;
      await save(item.id, { response: responses[item.id] });
    } else {
      await save(item.id, {});
    }
    setIndex(Math.max(0, Math.min(sectionItems.length - 1, to)));
  }

  async function act(action: "check" | "pause" | "resume" | "advance") {
    setBusy(true);
    try {
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
        pendingSave.current = null;
      }
      if (action === "check" || action === "advance" || action === "pause") await save(item.id, { response: responses[item.id] });
      const fresh = (await call({ action, itemId: item.id })) as AttemptView;
      setView(fresh);
      setRemaining(fresh.sectionRemainingSeconds);
      if (action === "advance") setIndex(0);
      if (action === "resume") activeSince.current = Date.now();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    try {
      if (pendingSave.current) clearTimeout(pendingSave.current);
      await save(item.id, { response: responses[item.id] });
      const data = await call({ action: "submit" });
      router.push(data.redirect);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const unanswered = view.items.filter((i) => !answered(i, responses[i.id] ?? null)).length;
  const flagged = view.items.filter((i) => i.flagged).length;
  const section = view.config.sections[view.currentSection];
  const lastSection = view.currentSection >= view.config.sections.length - 1;
  const lowTime = remaining !== null && remaining < 300;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy-900">{view.title}</p>
            <p className="text-xs text-slate-500">
              {view.config.sections.length > 1 ? `${section.name} · ` : ""}Question {index + 1} of {sectionItems.length}
              {view.config.feedback === "end" ? " · answers revealed after submission" : " · instant feedback"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {timed && (
              <span role="timer" aria-live={lowTime ? "assertive" : "off"} className={cx("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-sm", lowTime ? "bg-red-100 text-red-800" : "bg-navy-50 text-navy-900")}>
                <Clock className="h-4 w-4" aria-hidden /> {fmtClock(remaining)}
                <span className="sr-only">remaining{view.config.sections.length > 1 ? " in this section" : ""}</span>
              </span>
            )}
            <span className="text-xs text-slate-500" aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : saveState === "error" ? "Not saved" : ""}</span>
          </div>
        </div>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}
        {view.config.scaledNote && <Alert tone="info" className="mb-4">{view.config.scaledNote}</Alert>}
        {paused ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-medium text-navy-900">Paused</p>
            <p className="mt-1 text-sm text-slate-600">The clock is stopped. Questions are hidden while paused.</p>
            <Button className="mt-4" onClick={() => act("resume")} disabled={busy}><Play className="h-4 w-4" aria-hidden /> Resume</Button>
          </div>
        ) : (
          <article className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="q-stem">
            {item.question.itemSet && (
              <details open className="mb-4 rounded-lg border border-navy-100 bg-navy-50 p-3 text-sm">
                <summary className="cursor-pointer font-medium text-navy-900">Case: {item.question.itemSet.title}</summary>
                <p className="mt-2 whitespace-pre-line text-slate-800">{item.question.itemSet.vignette}</p>
              </details>
            )}
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="navy">{item.question.topicName}</Badge>
              <Badge>{["", "Easier", "Medium", "Harder"][item.question.difficulty]}</Badge>
              <Badge>~{Math.round(item.question.estimatedSeconds / 60 * 10) / 10} min</Badge>
              {item.question.context && <Badge tone="blue">{item.question.context}</Badge>}
              {item.question.type === "MULTI_SELECT" && <Badge tone="gold">Select all that apply</Badge>}
            </div>
            <p id="q-stem" className="whitespace-pre-line text-base leading-relaxed text-slate-900">{item.question.stem}</p>

            <div className="mt-4">
              {(item.question.type === "MCQ" || item.question.type === "MULTI_SELECT") && (
                <fieldset>
                  <legend className="sr-only">Answer options</legend>
                  <div className="space-y-2">
                    {(item.question.payload as { options: { id: string; text: string }[] }).options.map((o, i) => {
                      const multi = item.question.type === "MULTI_SELECT";
                      const checked = r?.selected?.includes(o.id) ?? false;
                      return (
                        <label key={o.id} className={cx("flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm", checked ? "border-navy-700 bg-navy-50" : "border-slate-200 hover:bg-slate-50", locked && "cursor-default opacity-90")}>
                          <input
                            type={multi ? "checkbox" : "radio"}
                            name={`q-${item.id}`}
                            className="mt-0.5"
                            checked={checked}
                            disabled={locked}
                            onChange={() => {
                              const sel = r?.selected ?? [];
                              setResponse({ selected: multi ? (checked ? sel.filter((s) => s !== o.id) : [...sel, o.id]) : [o.id] });
                            }}
                          />
                          <span><span className="mr-2 font-semibold text-slate-500">{String.fromCharCode(65 + i)}.</span>{o.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              {item.question.type === "NUMERIC" && (
                <div className="max-w-xs">
                  <label htmlFor={`num-${item.id}`} className="mb-1 block text-sm font-medium text-slate-700">Your answer{(item.question.payload as { unit?: string }).unit ? ` (${(item.question.payload as { unit?: string }).unit})` : ""}</label>
                  <Input
                    id={`num-${item.id}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    disabled={locked}
                    defaultValue={typeof r?.value === "number" ? r.value : ""}
                    key={item.id}
                    onChange={(e) => setResponse({ value: e.target.value === "" ? null : Number(e.target.value) }, 700)}
                  />
                  <p className="mt-1 text-xs text-slate-500">Enter a number without units or commas.</p>
                </div>
              )}
              {item.question.type === "WRITTEN" && (
                <Textarea key={item.id} rows={7} disabled={locked} defaultValue={r?.text ?? ""} aria-label="Your written answer" onChange={(e) => setResponse({ text: e.target.value }, 900)} />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">Confidence:</span>
              {[{ v: 1, l: "Guess" }, { v: 2, l: "Unsure" }, { v: 3, l: "Confident" }].map((c) => (
                <button
                  key={c.v}
                  type="button"
                  aria-pressed={item.confidence === c.v}
                  disabled={locked}
                  onClick={() => {
                    setView((v) => ({ ...v, items: v.items.map((x) => (x.id === item.id ? { ...x, confidence: c.v } : x)) }));
                    void save(item.id, { confidence: c.v });
                  }}
                  className={cx("rounded-full border px-2.5 py-0.5 text-xs", item.confidence === c.v ? "border-navy-700 bg-navy-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50")}
                >
                  {c.l}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={item.flagged}
                onClick={() => {
                  const f = !item.flagged;
                  setView((v) => ({ ...v, items: v.items.map((x) => (x.id === item.id ? { ...x, flagged: f } : x)) }));
                  void save(item.id, { flagged: f });
                }}
                className={cx("ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs", item.flagged ? "border-gold-500 bg-gold-100 text-gold-700" : "border-slate-300 text-slate-700 hover:bg-slate-50")}
              >
                <Flag className="h-3 w-3" aria-hidden /> {item.flagged ? "Marked for review" : "Mark for review"}
              </button>
            </div>

            {view.config.feedback === "immediate" && !item.feedback && (
              <Button className="mt-4" onClick={() => act("check")} disabled={busy || !answered(item, r)}>Check answer</Button>
            )}
            {item.feedback && (
              <FeedbackPanel
                feedback={item.feedback as unknown as FeedbackData}
                selected={r?.selected ?? []}
                questionId={item.question.id}
                type={item.question.type}
                context={item.question.context}
                similar={{ syllabusVersionId: view.syllabusVersionId, enrollmentId }}
              />
            )}
          </article>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0 || paused}><ChevronLeft className="h-4 w-4" aria-hidden /> Previous</Button>
          <div className="flex flex-wrap gap-2">
            {view.config.allowPause && !paused && <Button variant="ghost" onClick={() => act("pause")} disabled={busy}><Pause className="h-4 w-4" aria-hidden /> Pause</Button>}
            {index < sectionItems.length - 1 ? (
              <Button onClick={() => go(index + 1)} disabled={paused}>Next <ChevronRight className="h-4 w-4" aria-hidden /></Button>
            ) : !lastSection ? (
              <Button variant="gold" onClick={() => confirm("Finish this section? You cannot return to it, and any unused section time is forfeited.") && act("advance")} disabled={busy}>Finish section</Button>
            ) : (
              <Button variant="gold" onClick={() => dialogRef.current?.showModal()} disabled={busy}>Review & submit</Button>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4" aria-label="Question navigator">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-navy-900">Questions{view.config.sections.length > 1 ? ` — ${section.name}` : ""}</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
            {sectionItems.map((it, i) => {
              const done = answered(it, responses[it.id] ?? null);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Question ${i + 1}${done ? ", answered" : ""}${it.flagged ? ", marked for review" : ""}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cx(
                    "relative h-8 rounded-md text-xs font-medium",
                    i === index ? "ring-2 ring-gold-500" : "",
                    it.feedback ? (it.feedback.isCorrect ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : done ? "bg-navy-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  )}
                >
                  {i + 1}
                  {it.flagged && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold-500" aria-hidden />}
                </button>
              );
            })}
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            <li><span className="mr-1 inline-block h-2 w-2 rounded bg-navy-700" />answered · <span className="mr-1 inline-block h-2 w-2 rounded bg-slate-200" />open · <span className="mr-1 inline-block h-2 w-2 rounded-full bg-gold-500" />flagged</li>
          </ul>
        </div>
        <Button variant="secondary" className="w-full" onClick={() => dialogRef.current?.showModal()} disabled={busy || !lastSection}>Submit {lastSection ? "" : "(after final section)"}</Button>
        <p className="text-xs text-slate-500">Answers save automatically. {view.config.allowPause ? "You can pause and resume later, even after signing out." : "Exam simulation: the clock keeps running if you leave."}</p>
      </aside>

      <dialog ref={dialogRef} className="w-[min(28rem,calc(100vw-2rem))] rounded-xl p-0 backdrop:bg-navy-950/60" aria-labelledby="submit-title">
        <div className="p-5">
          <h2 id="submit-title" className="text-lg font-semibold text-navy-900">Submit your answers?</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>{view.items.length - unanswered} of {view.items.length} answered</li>
            {unanswered > 0 && <li className="text-red-700">{unanswered} unanswered — they will be marked incorrect</li>}
            {flagged > 0 && <li className="text-gold-700">{flagged} marked for review</li>}
          </ul>
          <p className="mt-3 text-xs text-slate-500">You cannot change answers after submitting.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>Keep working</Button>
            <Button variant="gold" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit"}</Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
