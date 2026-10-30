"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Flame, Play, RotateCcw, Timer, Trophy, X, Zap } from "lucide-react";
import clsx from "clsx";
import { rapidFireAnswerAction, rapidFireFinishAction } from "@/app/actions/engagement";
import { Confetti } from "@/components/motion";

type Q = { id: string; topic: string; stem: string; options: { id: string; text: string }[] };
type Missed = { stem: string; picked: string; correct: string };
type Phase = "ready" | "countdown" | "playing" | "done";

export function RapidFire({ deck, best: initialBest, seconds }: { deck: Q[]; best: number; seconds: number }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(3);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(seconds);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [flash, setFlash] = useState<{ id: string; ok: boolean; correctId: string } | null>(null);
  const [missed, setMissed] = useState<Missed[]>([]);
  const [result, setResult] = useState<{ score: number; best: number; isNewBest: boolean } | null>(null);
  const [best, setBest] = useState(initialBest);
  const busy = useRef(false);
  const endsAt = useRef(0);
  const tally = useRef({ answered: 0, correct: 0 });

  const finish = useCallback(async () => {
    setPhase("done");
    const res = await rapidFireFinishAction(tally.current.answered, tally.current.correct);
    if (res.ok) {
      setResult({ score: res.score, best: res.best, isNewBest: res.isNewBest });
      setBest(res.best);
    }
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    const t = setTimeout(() => {
      if (count > 1) setCount(count - 1);
      else {
        endsAt.current = Date.now() + seconds * 1000;
        setPhase("playing");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [phase, count, seconds]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        finish();
      }
    }, 200);
    return () => clearInterval(t);
  }, [phase, finish]);

  const begin = () => {
    tally.current = { answered: 0, correct: 0 };
    setI(0);
    setAnswered(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setMissed([]);
    setResult(null);
    setLeft(seconds);
    setCount(3);
    setPhase("countdown");
  };

  const q = deck[i % Math.max(deck.length, 1)];

  const pick = async (optionId: string) => {
    if (busy.current || phase !== "playing" || !q) return;
    busy.current = true;
    try {
      const res = await rapidFireAnswerAction(q.id, optionId);
      tally.current.answered += 1;
      setAnswered((a) => a + 1);
      if (res.correct) {
        tally.current.correct += 1;
        setCorrect((c) => c + 1);
        setStreak((s) => {
          const n = s + 1;
          setBestStreak((b) => Math.max(b, n));
          return n;
        });
      } else {
        setStreak(0);
        setMissed((m) => [...m, { stem: q.stem, picked: q.options.find((o) => o.id === optionId)?.text ?? "", correct: q.options.find((o) => o.id === res.correctOptionId)?.text ?? "" }]);
      }
      setFlash({ id: optionId, ok: res.correct, correctId: res.correctOptionId });
      setTimeout(() => {
        setFlash(null);
        if (tally.current.answered >= deck.length) finish();
        else setI((n) => n + 1);
        busy.current = false;
      }, res.correct ? 350 : 900);
    } catch {
      busy.current = false;
    }
  };

  if (deck.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">There are not enough short questions for your exam yet. Try the daily challenge or a practice set instead.</p>;
  }

  return (
    <div className="bg-ink relative overflow-hidden rounded-3xl p-5 text-white shadow-2xl shadow-black/30 sm:p-8">
      <span aria-hidden className="red-beam left-[70%]" />
      <span aria-hidden className="floor-glow" />
      {result?.isNewBest && <Confetti />}

      {phase === "ready" && (
        <div className="relative py-8 text-center">
          <Zap className="mx-auto h-10 w-10 text-gold-500" aria-hidden />
          <h2 className="headline-xl mt-4 text-5xl uppercase sm:text-6xl"><span className="text-gold-500">60</span> seconds</h2>
          <p className="mx-auto mt-4 max-w-md text-navy-100">Answer as many quick questions from your syllabus as you can. +10 for a correct answer, −3 for a wrong one. Accuracy beats guessing.</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-navy-100"><Trophy className="h-4 w-4 text-gold-500" aria-hidden /> Your best: <strong className="text-white">{best}</strong></p>
          <div className="mt-8"><button type="button" onClick={begin} className="btn-shine inline-flex items-center gap-2 rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-xl shadow-gold-500/40 transition hover:-translate-y-0.5"><Play className="h-4 w-4 fill-white" aria-hidden /> Start</button></div>
        </div>
      )}

      {phase === "countdown" && (
        <div className="relative grid h-72 place-items-center" aria-live="assertive">
          <span key={count} className="headline-xl slide-in text-9xl text-gold-500">{count}</span>
        </div>
      )}

      {phase === "playing" && q && (
        <div className="relative">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className={clsx("inline-flex items-center gap-1.5 font-display text-2xl font-black", left <= 10 ? "text-gold-500" : "text-white")} aria-label={`${left} seconds left`}><Timer className="h-5 w-5" aria-hidden /> {left}s</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs"><Flame className="h-4 w-4 text-gold-500" aria-hidden /> Streak {streak}</span>
            <span className="text-xs text-navy-100">{correct}/{answered} correct</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden><div className="h-full bg-gold-500 transition-[width] duration-200 ease-linear" style={{ width: `${(left / seconds) * 100}%` }} /></div>
          <div key={q.id} className="slide-in mt-6">
            <p className="eyebrow text-[0.6rem] text-mint-300">{q.topic}</p>
            <p className="mt-2 text-base leading-relaxed sm:text-lg">{q.stem}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => {
                const isPicked = flash?.id === o.id;
                const isRight = flash && o.id === flash.correctId;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => pick(o.id)}
                    disabled={!!flash}
                    className={clsx(
                      "rounded-xl border px-4 py-3 text-left text-sm transition",
                      isRight ? "border-mint-400 bg-mint-400/20" : isPicked ? "border-gold-500 bg-gold-500/20" : "border-white/15 bg-white/5 hover:border-white/50 hover:bg-white/10",
                    )}
                  >
                    {o.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="relative py-4">
          <p className="eyebrow text-center text-mint-300">Round complete</p>
          <p className="headline-xl mt-3 text-center text-7xl text-gold-500">{result?.score ?? "…"}</p>
          <p className="mt-1 text-center text-sm text-navy-100">points{result?.isNewBest ? " — a new personal best!" : result ? ` · best ${result.best}` : ""}</p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-center">
            <div className="glass-dark rounded-2xl p-3"><p className="font-display text-2xl font-black">{answered}</p><p className="text-[10px] uppercase tracking-widest text-navy-200">answered</p></div>
            <div className="glass-dark rounded-2xl p-3"><p className="font-display text-2xl font-black">{answered ? Math.round((correct / answered) * 100) : 0}%</p><p className="text-[10px] uppercase tracking-widest text-navy-200">accuracy</p></div>
            <div className="glass-dark rounded-2xl p-3"><p className="font-display text-2xl font-black">{bestStreak}</p><p className="text-[10px] uppercase tracking-widest text-navy-200">best streak</p></div>
          </div>
          {missed.length > 0 && (
            <div className="mx-auto mt-6 max-w-2xl">
              <p className="text-sm font-semibold">Review your misses</p>
              <ul className="mt-2 space-y-2">
                {missed.map((m, k) => (
                  <li key={k} className="rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10">
                    <p className="text-navy-50">{m.stem}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-gold-300"><X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {m.picked}</p>
                    <p className="flex items-start gap-1.5 text-xs text-mint-200"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {m.correct}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 text-center"><button type="button" onClick={() => location.reload()} className="pill-outline"><RotateCcw className="h-4 w-4" aria-hidden /> Play again</button></div>
        </div>
      )}
    </div>
  );
}
