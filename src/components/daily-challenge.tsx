"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Flame, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import { answerDailyAction } from "@/app/actions/engagement";
import { Confetti } from "@/components/motion";
import type { DailyChallengeView } from "@/server/engagement/service";

export function DailyChallengeCard({ initial, streak, compact = false }: { initial: DailyChallengeView; streak: number; compact?: boolean }) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const answer = (optionId: string) => {
    if (view.answered || pending) return;
    setPicked(optionId);
    setError(null);
    start(async () => {
      const res = await answerDailyAction(optionId);
      if (res.ok) {
        setView(res.view);
        if (res.view.correct) setCelebrate(true);
      } else setError(res.error);
    });
  };

  const shownStreak = streak + (view.answered && !initial.answered ? 1 : 0);

  return (
    <section className="bg-ink relative overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-black/20 sm:p-7" aria-labelledby="daily-title">
      {celebrate && <Confetti pieces={50} />}
      <span aria-hidden className="red-beam left-[75%] opacity-60" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2 text-mint-300"><Sparkles className="h-3.5 w-3.5" aria-hidden /> Daily challenge · {view.topic}</p>
          <h2 id="daily-title" className="font-display mt-2 text-2xl font-black uppercase tracking-tight">Question <span className="text-gold-500">of the day</span></h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold" title="Consecutive days you answered the daily challenge">
          <Flame className="h-4 w-4 text-gold-500" aria-hidden /> {shownStreak} day{shownStreak === 1 ? "" : "s"}
        </span>
      </div>
      {view.context && <p className="relative mt-3 text-xs uppercase tracking-widest text-navy-200">{view.context}</p>}
      <p className={clsx("relative mt-3 leading-relaxed text-navy-50", compact ? "text-sm" : "text-base")}>{view.stem}</p>
      <ul className="relative mt-4 grid gap-2">
        {view.options.map((o, i) => {
          const isSel = (view.selectedOptionId ?? picked) === o.id;
          const showCorrect = view.answered && o.correct;
          const showWrong = view.answered && isSel && !o.correct;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => answer(o.id)}
                disabled={view.answered || pending}
                aria-pressed={isSel}
                className={clsx(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                  showCorrect ? "border-mint-400 bg-mint-400/15" : showWrong ? "border-gold-500 bg-gold-500/15" : isSel ? "border-white/60 bg-white/10" : "border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10",
                )}
              >
                <span className="font-display grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/30 text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">
                  {o.text}
                  {view.answered && "rationale" in o && o.rationale && (showCorrect || showWrong) && <span className="mt-1 block text-xs text-navy-100">{o.rationale}</span>}
                </span>
                {showCorrect && <Check className="h-5 w-5 shrink-0 text-mint-300" aria-label="Correct answer" />}
                {showWrong && <X className="h-5 w-5 shrink-0 text-gold-500" aria-label="Your answer" />}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="relative mt-3 text-sm text-gold-300" role="alert">{error}</p>}
      {view.answered && (
        <div className="relative mt-4 rounded-xl bg-white/5 p-4 text-sm ring-1 ring-white/10" role="status">
          <p className="font-semibold">{view.correct ? "Correct — nicely done." : "Not this time — here's why."}</p>
          {view.explanation && <p className="mt-1 text-navy-100">{view.explanation}</p>}
          {view.steps.length > 0 && <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-navy-100">{view.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
          <p className="mt-3 text-xs text-navy-200">A new question unlocks tomorrow. Want more? <Link href="/rapid-fire" className="underline hover:text-white">Try a 60-second rapid-fire round</Link>.</p>
        </div>
      )}
    </section>
  );
}
