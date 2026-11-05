"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, Play, Square } from "lucide-react";
import clsx from "clsx";
import { AiPresenter } from "@/components/ai-presenter";
import { narrate } from "@/lib/video/narrator";
import { speakable } from "@/lib/video/script";
import { parseSpokenAnswer } from "@/lib/video/answer-parse";
import { rapidFireAnswerAction } from "@/app/actions/engagement";

type Q = { id: string; topic: string; stem: string; options: { id: string; text: string }[] };

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LETTERS = ["A", "B", "C", "D", "E"];

/**
 * Hands-free revision: Nova reads each question and its options aloud, then
 * listens for "A", "B", "C" (or "repeat", "skip", "stop"). Answers are graded
 * on the server. Works by tapping too, for browsers without voice input.
 */
export function VoiceDrill({ deck }: { deck: Q[] }) {
  const [phase, setPhase] = useState<"idle" | "reading" | "listening" | "feedback" | "done">("idle");
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState<{ correct: boolean; correctOptionId: string; picked: string } | null>(null);
  const [score, setScore] = useState({ answered: 0, correct: 0 });
  const [pulse, setPulse] = useState(0);
  const [canListen, setCanListen] = useState(false);
  const listenOk = useRef(false);
  const cancelSpeech = useRef<() => void>(() => {});
  const rec = useRef<Recognition | null>(null);
  const q = deck[i];

  useEffect(() => {
    const t = setTimeout(() => {
      listenOk.current = !!recognitionCtor();
      setCanListen(listenOk.current);
    }, 0);
    return () => {
      clearTimeout(t);
      cancelSpeech.current();
      rec.current?.abort();
    };
  }, []);

  const say = useCallback((lines: string[], onDone?: () => void) => {
    cancelSpeech.current();
    cancelSpeech.current = narrate(lines.map(speakable), { onWord: () => setPulse((p) => p + 1), onDone });
  }, []);

  const finish = useCallback(() => {
    cancelSpeech.current();
    rec.current?.abort();
    setPhase("done");
  }, []);

  // The three steps reference each other, so they live in refs and always take an explicit question index.
  const steps = useRef<{ read: (k: number) => void; listen: (k: number) => void; grade: (k: number, optionId: string) => void }>({ read: () => {}, listen: () => {}, grade: () => {} });

  const readFn = (k: number) => {
    const qq = deck[k];
    if (!qq) return finish();
    rec.current?.abort();
    setI(k);
    setResult(null);
    setHeard("");
    setPhase("reading");
    const opts = qq.options.map((o, n) => `Option ${LETTERS[n]}: ${o.text}.`);
    say([`Question ${k + 1}. ${qq.stem}`, ...opts, listenOk.current ? "Say your answer." : "Tap your answer."], () => {
      if (listenOk.current) steps.current.listen(k);
    });
  };

  const listenFn = (k: number) => {
    const Ctor = recognitionCtor();
    const qq = deck[k];
    if (!Ctor || !qq) return;
    const r = new Ctor();
    rec.current = r;
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 3;
    setPhase("listening");
    r.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      setHeard(alts[0] ?? "");
      const letters = LETTERS.slice(0, qq.options.length);
      for (const alt of alts) {
        const intent = parseSpokenAnswer(alt, letters);
        if (intent.kind === "answer") return steps.current.grade(k, qq.options[letters.indexOf(intent.letter)].id);
        if (intent.kind === "repeat") return steps.current.read(k);
        if (intent.kind === "skip") return steps.current.read(k + 1);
        if (intent.kind === "stop") return finish();
      }
      say(["Sorry, I did not catch that. Say A, B or C."], () => steps.current.listen(k));
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        listenOk.current = false;
        setCanListen(false);
        setPhase("reading");
      }
    };
    try {
      r.start();
    } catch {
      setPhase("reading");
    }
  };

  const gradeFn = async (k: number, optionId: string) => {
    const qq = deck[k];
    if (!qq) return;
    rec.current?.abort();
    const res = await rapidFireAnswerAction(qq.id, optionId);
    setResult({ ...res, picked: optionId });
    setScore((s) => ({ answered: s.answered + 1, correct: s.correct + (res.correct ? 1 : 0) }));
    setPhase("feedback");
    const right = qq.options.findIndex((o) => o.id === res.correctOptionId);
    say(res.correct ? ["Correct. Nice work."] : [`Not quite. The answer is ${LETTERS[right]}: ${qq.options[right]?.text ?? ""}.`], () => steps.current.read(k + 1));
  };

  useEffect(() => {
    steps.current = { read: readFn, listen: listenFn, grade: gradeFn };
  });

  const read = () => steps.current.read(i);
  const grade = (optionId: string) => steps.current.grade(i, optionId);

  if (deck.length === 0) return <p className="surface p-8 text-center text-sm text-slate-600">Not enough short questions for your exam yet.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="bg-ink relative overflow-hidden rounded-[1.75rem] p-6 text-white ring-1 ring-white/10 sm:p-9">
        <div aria-hidden className="floor-3d opacity-60" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AiPresenter speaking={phase === "reading" || phase === "feedback"} pulse={pulse} />
            <span className={clsx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", phase === "listening" ? "border-mint-300 bg-mint-400/15 text-mint-200" : "border-white/15 text-white/70")}>
              {phase === "listening" ? <Mic className="h-4 w-4 animate-pulse" aria-hidden /> : <MicOff className="h-4 w-4" aria-hidden />}
              {phase === "listening" ? "Listening…" : canListen ? "Voice answers on" : "Tap to answer"}
            </span>
          </div>

          {phase === "idle" ? (
            <div className="py-10 text-center">
              <Headphones className="mx-auto h-12 w-12 text-mint-300" aria-hidden />
              <h2 className="headline-xl mt-4 text-4xl sm:text-5xl">Hands-free <span className="text-gradient-brand">revision</span></h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-navy-100">Nova reads each question and its options aloud. Answer by saying &ldquo;A&rdquo;, &ldquo;B&rdquo; or &ldquo;C&rdquo; — or say &ldquo;repeat&rdquo;, &ldquo;skip&rdquo; or &ldquo;stop&rdquo;. Ideal for walks and commutes.</p>
              <button type="button" onClick={read} className="btn-shine mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-xl shadow-gold-500/40"><Play className="h-4 w-4 fill-white" aria-hidden /> Start the drill</button>
              {!canListen && <p className="mt-3 text-xs text-navy-200">This browser has no voice input, so you will tap your answers while Nova reads.</p>}
            </div>
          ) : phase === "done" ? (
            <div className="py-10 text-center">
              <p className="eyebrow text-mint-300">Drill complete</p>
              <p className="headline-xl mt-3 text-6xl text-gradient-brand">{score.correct}/{score.answered}</p>
              <p className="mt-2 text-sm text-navy-100">correct answers</p>
              <button type="button" onClick={() => location.reload()} className="pill-outline mt-6">Go again</button>
            </div>
          ) : (
            q && (
              <div key={q.id} className="scene-enter mt-6">
                <p className="eyebrow text-[0.6rem] text-mint-300">Question {i + 1} of {deck.length} · {q.topic}</p>
                <p className="mt-2 text-base leading-relaxed sm:text-xl">{q.stem}</p>
                <div className="mt-5 grid gap-2">
                  {q.options.map((o, k) => {
                    const right = result && o.id === result.correctOptionId;
                    const wrong = result && result.picked === o.id && !result.correct;
                    return (
                      <button key={o.id} type="button" disabled={!!result} onClick={() => grade(o.id)} className={clsx("flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition sm:text-base", right ? "border-green-400 bg-green-500/20" : wrong ? "border-rose-400 bg-rose-500/20" : "border-white/15 bg-white/5 hover:border-white/40")}>
                        <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-bold">{LETTERS[k]}</span>
                        {o.text}
                      </button>
                    );
                  })}
                </div>
                {heard && <p className="mt-3 text-xs text-navy-200">Heard: &ldquo;{heard}&rdquo;</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={read} className="pill-outline !py-2">Repeat</button>
                  <button type="button" onClick={finish} className="pill-outline !py-2"><Square className="h-3.5 w-3.5" aria-hidden /> Stop</button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="surface p-5 text-center">
          <p className="eyebrow text-[0.6rem] text-slate-500">Score</p>
          <p className="font-display mt-1 text-4xl font-black text-navy-950">{score.correct}<span className="text-slate-500">/{score.answered}</span></p>
        </div>
        <div className="surface p-5 text-sm text-slate-600">
          <p className="font-semibold text-navy-950">Voice commands</p>
          <ul className="mt-2 space-y-1">
            <li><strong className="text-navy-900">&ldquo;A&rdquo;, &ldquo;B&rdquo;, &ldquo;C&rdquo;</strong> — answer</li>
            <li><strong className="text-navy-900">&ldquo;Repeat&rdquo;</strong> — hear it again</li>
            <li><strong className="text-navy-900">&ldquo;Skip&rdquo;</strong> — next question</li>
            <li><strong className="text-navy-900">&ldquo;Stop&rdquo;</strong> — end the drill</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">Voice input uses your browser&apos;s speech recognition and needs microphone permission. Answers are checked on our server.</p>
        </div>
      </aside>
    </div>
  );
}
