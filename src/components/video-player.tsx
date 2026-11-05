"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Captions, CaptionsOff, Check, ChevronLeft, ChevronRight, Maximize, Minimize, Music, Music2, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import clsx from "clsx";
import { AiPresenter } from "@/components/ai-presenter";
import { Confetti } from "@/components/motion";
import { englishVoices, narrate } from "@/lib/video/narrator";
import { startPad, type AudioEngine } from "@/lib/audio/ambient";
import { rapidFireAnswerAction } from "@/app/actions/engagement";
import type { Scene } from "@/lib/video/script";

const RATES = [0.75, 1, 1.25, 1.5];
const ACCENT: Record<Scene["kind"], string> = {
  title: "#8b5cf6",
  objectives: "#22d3ee",
  intuition: "#a78bfa",
  formula: "#22d3ee",
  example: "#fbbf24",
  quiz: "#e879f9",
  trap: "#fb7185",
  summary: "#34d399",
  outro: "#8b5cf6",
};

type QuizState = { picked: string | null; result: { correct: boolean; correctOptionId: string } | null };

/** Words that pop in one by one. Gradient text must be applied per word (wordClassName): background-clip text does not paint into animated children. */
function Pop({ text, base = 0, step = 60, wordClassName }: { text: string; base?: number; step?: number; wordClassName?: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className={clsx("word-pop mr-[0.25em]", wordClassName)} style={{ "--delay": `${base + i * step}ms` } as React.CSSProperties}>{w}</span>
      ))}
    </>
  );
}

function SceneView({ scene, sentence, chapters, quiz, onAnswer, quizBusy }: { scene: Scene; sentence: number; chapters: string[]; quiz: QuizState; onAnswer: (id: string) => void; quizBusy: boolean }) {
  switch (scene.kind) {
    case "title": {
      const words = scene.heading.split(" ");
      const cut = Math.max(1, Math.ceil(words.length / 2));
      return (
        <div className="grid h-full items-center gap-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
            <h2 className="headline-xl mt-4">
              <span className="block text-[clamp(1.9rem,6.5vw,4.6rem)]"><Pop text={words.slice(0, cut).join(" ")} base={150} wordClassName="text-gradient-brand" /></span>
              {words.length > 1 && <span className="block text-[clamp(1.5rem,4.6vw,3.4rem)] text-white"><Pop text={words.slice(cut).join(" ")} base={420} /></span>}
            </h2>
            <span className="rule-red slide-in mt-5" style={{ "--delay": "700ms" } as React.CSSProperties} />
          </div>
          <div className="perspective relative hidden h-56 md:block" aria-hidden>
            {chapters.slice(1, 5).map((c, i) => (
              <div key={c} className="flip-in absolute right-0 w-64 rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-sm text-white shadow-2xl backdrop-blur" style={{ top: i * 44, transform: `translateX(${-i * 26}px) rotateY(-18deg) rotateX(6deg) translateZ(${-i * 40}px)`, "--delay": `${300 + i * 160}ms` } as React.CSSProperties}>
                <span className="font-display mr-2 text-gold-300">{String(i + 2).padStart(2, "0")}</span>{c}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "objectives":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-2xl font-black text-white sm:text-4xl">{scene.heading}</h3>
          <ul className="mt-5 space-y-3">
            {scene.lines.map((l, i) => {
              const done = sentence > i;
              return (
                <li key={l} className="flip-in flex items-start gap-3 text-sm text-white sm:text-lg" style={{ "--delay": `${200 + i * 240}ms` } as React.CSSProperties}>
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0" aria-hidden>
                    <circle cx="12" cy="12" r="10" fill="none" stroke={done ? "#22d3ee" : "rgba(255,255,255,0.25)"} strokeWidth="2" />
                    <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="16" strokeDashoffset={done ? 0 : 16} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                  </svg>
                  <span className={clsx("transition-opacity duration-500", sentence === i + 1 || done ? "opacity-100" : "opacity-60")}>{l}</span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    case "formula": {
      const vars = scene.lines;
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-xl font-bold text-white sm:text-3xl">{scene.heading}</h3>
          <div className="conic-border mt-5 rounded-2xl bg-black/35 px-5 py-5 font-mono text-[clamp(0.95rem,2.4vw,1.75rem)] text-white shadow-[0_0_80px_-20px_rgba(34,211,238,0.6)] backdrop-blur">
            {(scene.highlight ?? "").split(" ").map((t, i) => (
              <span key={i} className="word-pop mr-2 inline-block" style={{ "--delay": `${300 + i * 110}ms` } as React.CSSProperties}>{t}</span>
            ))}
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {vars.map((l, i) => {
              const [sym, ...rest] = l.split(" — ");
              return (
                <li key={l} className={clsx("flip-in flex items-center gap-3 rounded-xl border px-3 py-2 text-sm text-white transition", sentence >= i + 2 ? "border-mint-400/60 bg-mint-400/10" : "border-white/10 bg-white/5")} style={{ "--delay": `${900 + i * 200}ms` } as React.CSSProperties}>
                  <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-gradient-to-br from-gold-500 to-mint-500 px-2 font-mono text-sm font-bold">{sym}</span>
                  <span className="text-navy-100">{rest.join(" — ")}</span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    case "example": {
      const steps = scene.lines;
      const problemCount = Math.max(0, scene.narration.length - steps.length - 1);
      const active = sentence - problemCount;
      const answered = sentence >= scene.narration.length - 1;
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-amber-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-xl font-bold text-white sm:text-3xl">{scene.heading}</h3>
          <ol className="mt-4 space-y-2">
            {steps.map((l, i) => (
              <li key={l} className={clsx("flip-in flex gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-500 sm:text-base", i === active ? "border-amber-300/70 bg-amber-300/15 text-white shadow-[0_0_30px_-10px_rgba(251,191,36,0.8)]" : i < active ? "border-white/10 bg-white/5 text-white/80" : "border-white/5 bg-white/[0.02] text-white/40")} style={{ marginLeft: `${i * 18}px`, "--delay": `${200 + i * 160}ms` } as React.CSSProperties}>
                <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-xs font-black text-black">{i + 1}</span>
                <span className="pt-0.5">{l}</span>
              </li>
            ))}
          </ol>
          {answered && scene.highlight && (
            <p className="flip-in mt-5 inline-flex w-fit items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-base font-black text-black shadow-2xl shadow-amber-500/40 sm:text-xl">
              <Check className="h-5 w-5" aria-hidden /> {scene.highlight}
            </p>
          )}
        </div>
      );
    }
    case "quiz": {
      const q = scene.quiz!;
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in flex items-center gap-2 text-[0.6rem] text-fuchsia-300 sm:text-xs"><Sparkles className="h-3.5 w-3.5" aria-hidden /> {scene.eyebrow} · the video waits for you</p>
          <p className="slide-in mt-3 max-w-3xl text-sm leading-relaxed text-white sm:text-lg">{q.stem}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options.map((o) => {
              const right = quiz.result && o.id === quiz.result.correctOptionId;
              const wrong = quiz.result && quiz.picked === o.id && !quiz.result.correct;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={!!quiz.result || quizBusy}
                  onClick={() => onAnswer(o.id)}
                  className={clsx("rounded-xl border px-4 py-3 text-left text-sm transition", right ? "border-green-400 bg-green-500/20 text-white" : wrong ? "border-rose-400 bg-rose-500/20 text-white" : quiz.picked === o.id ? "border-white/60 bg-white/10 text-white" : "border-white/15 bg-white/5 text-white hover:border-fuchsia-300/70 hover:bg-white/10")}
                >
                  {o.text}
                </button>
              );
            })}
          </div>
          {quiz.result && <p className="flip-in mt-4 text-sm font-semibold text-white sm:text-base" role="status">{quiz.result.correct ? "Correct — locked in." : "Not quite — the highlighted answer is right. Review it in the lesson."}</p>}
        </div>
      );
    }
    case "trap": {
      const flipped = sentence >= 1;
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-rose-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-xl font-bold text-white sm:text-3xl">{scene.heading}</h3>
          <div className="perspective mt-5 h-44 max-w-2xl sm:h-48">
            <div className="preserve-3d relative h-full w-full transition-transform duration-700" style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
              <div className="backface-hidden absolute inset-0 flex items-start gap-3 rounded-3xl border border-rose-400/40 bg-rose-500/15 p-6">
                <X className="mt-1 h-7 w-7 shrink-0 text-rose-300" aria-hidden />
                <p className="text-base text-white line-through decoration-rose-300/70 sm:text-2xl">{scene.lines[0]}</p>
              </div>
              <div className="backface-hidden absolute inset-0 flex items-start gap-3 rounded-3xl border border-green-400/40 bg-green-500/15 p-6" style={{ transform: "rotateY(180deg)" }}>
                <Check className="mt-1 h-7 w-7 shrink-0 text-green-300" aria-hidden />
                <p className="text-base text-white sm:text-2xl">{scene.lines[1]}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    case "summary":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-green-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-2xl font-black text-white sm:text-4xl">{scene.heading}</h3>
          <div className="perspective mt-5 grid gap-3 sm:grid-cols-2">
            {scene.lines.map((l, i) => (
              <div key={l} className={clsx("flip-in rounded-2xl border p-4 text-sm transition-all duration-500 sm:text-base", sentence === i + 1 ? "border-green-300/70 bg-green-400/15 text-white [transform:translateZ(30px)]" : "border-white/10 bg-white/5 text-white/85")} style={{ "--delay": `${200 + i * 200}ms` } as React.CSSProperties}>
                <span className="mr-2 text-green-300">✓</span>{l}
              </div>
            ))}
          </div>
        </div>
      );
    case "outro":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="headline-xl mt-3 text-[clamp(2.2rem,7vw,4.8rem)] text-white"><Pop text="Now practise" base={100} step={120} /></h3>
          <span className="rule-red slide-in mt-5" style={{ "--delay": "500ms" } as React.CSSProperties} />
        </div>
      );
    default:
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-2xl font-black text-white sm:text-4xl">{scene.heading}</h3>
          <div className="mt-5 space-y-4">
            {scene.lines.map((l, i) => (
              <p key={l} className={clsx("slide-in font-display max-w-3xl text-lg leading-snug transition-all duration-500 sm:text-2xl", i === sentence ? "text-white" : i < sentence ? "text-white/55" : "text-white/30")} style={{ "--delay": `${150 + i * 120}ms` } as React.CSSProperties}>
                {i === sentence ? <span className="bg-gradient-to-r from-gold-500/30 to-mint-500/20 bg-no-repeat [background-size:100%_40%] [background-position:0_88%]">{l}</span> : l}
              </p>
            ))}
          </div>
        </div>
      );
  }
}

/**
 * Generated video explainer: Nova (the AI presenter) narrates animated
 * scenes built from the lesson, with word-by-word captions, chapters, an
 * optional generative soundtrack and an interactive checkpoint question.
 */
export function VideoPlayer({ scenes, title, lessonHref, quizSlot }: { scenes: Scene[]; title: string; lessonHref: string; quizSlot?: React.ReactNode }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [music, setMusic] = useState(false);
  const [rate, setRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [voices, setVoices] = useState<{ uri: string; name: string }[]>([]);
  const [sentence, setSentence] = useState(0);
  const [word, setWord] = useState(-1);
  const [pulse, setPulse] = useState(0);
  const [full, setFull] = useState(false);
  const [quiz, setQuiz] = useState<QuizState>({ picked: null, result: null });
  const [quizBusy, startQuiz] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioEngine | null>(null);
  const scene = scenes[idx];
  const chapters = scenes.map((s) => s.heading);

  const go = useCallback((i: number) => {
    setFinished(false);
    setSentence(0);
    setWord(-1);
    setQuiz({ picked: null, result: null });
    setIdx(Math.max(0, Math.min(scenes.length - 1, i)));
  }, [scenes.length]);

  const next = useCallback(() => {
    setSentence(0);
    setWord(-1);
    setQuiz({ picked: null, result: null });
    setIdx((i) => {
      if (i + 1 >= scenes.length) {
        setPlaying(false);
        setFinished(true);
        return i;
      }
      return i + 1;
    });
  }, [scenes.length]);

  // Narration and timing for the current scene. Quiz scenes wait for an answer.
  useEffect(() => {
    if (!playing) return;
    return narrate(scene.narration, {
      rate,
      voiceURI,
      muted,
      minSeconds: scene.seconds,
      onSentence: (i) => {
        setSentence(i);
        setWord(-1);
      },
      onWord: (_, w) => {
        setWord(w);
        setPulse((p) => p + 1);
      },
      onDone: () => {
        if (scene.kind !== "quiz") next();
      },
    });
  }, [playing, idx, muted, rate, voiceURI, scene, next]);

  useEffect(() => {
    if (playing && music && !audio.current) audio.current = startPad("focus", 0.14);
    if ((!playing || !music) && audio.current) {
      audio.current.stop();
      audio.current = null;
    }
  }, [playing, music]);

  useEffect(() => {
    const load = () => setVoices(englishVoices().map((v) => ({ uri: v.voiceURI, name: `${v.name} (${v.lang})` })));
    const t = setTimeout(() => {
      load();
      try {
        setVoiceURI(localStorage.getItem("pdfp-voice"));
        const r = Number(localStorage.getItem("pdfp-rate"));
        if (RATES.includes(r)) setRate(r);
      } catch {
        /* storage unavailable */
      }
    }, 0);
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    const onFs = () => setFull(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearTimeout(t);
      window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
      document.removeEventListener("fullscreenchange", onFs);
      window.speechSynthesis?.cancel();
      audio.current?.stop();
    };
  }, []);

  const toggle = () => {
    if (finished) {
      go(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const answer = (optionId: string) => {
    if (!scene.quiz || quiz.result) return;
    setQuiz({ picked: optionId, result: null });
    startQuiz(async () => {
      try {
        const res = await rapidFireAnswerAction(scene.quiz!.id, optionId);
        setQuiz({ picked: optionId, result: res });
        if (res.correct) setCelebrate(true);
      } catch {
        setQuiz({ picked: null, result: null });
      }
    });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLSelectElement) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") go(idx + 1);
    else if (e.key === "ArrowLeft") go(idx - 1);
    else if (e.key === "m") setMuted((m) => !m);
    else if (e.key === "c") setCaptions((c) => !c);
  };

  const caption = scene.narration[sentence] ?? "";
  const capWords = caption.split(/\s+/);
  const waitingForQuiz = scene.kind === "quiz" && playing;

  return (
    <div className="space-y-4">
      <div
        ref={stage}
        tabIndex={0}
        onKeyDown={onKey}
        role="region"
        aria-label={`Video explainer: ${title}`}
        className="bg-ink group relative aspect-video w-full overflow-hidden rounded-[1.75rem] text-white shadow-[0_40px_120px_-50px_rgba(124,58,237,0.9)] outline-none ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-gold-400 [&:fullscreen]:rounded-none"
      >
        {celebrate && <Confetti pieces={40} />}
        {/* Layered backdrop: synthwave floor, accent glow and drifting orbs */}
        <div aria-hidden className="floor-3d" />
        <div aria-hidden className="absolute inset-0 transition-colors duration-1000" style={{ background: `radial-gradient(60% 70% at 80% 10%, ${ACCENT[scene.kind]}44, transparent 60%)` }} />
        <span aria-hidden className="orb orb-violet float absolute -right-10 -top-12 h-40 w-40 opacity-60" />
        <span aria-hidden className="orb orb-cyan float absolute bottom-24 right-[12%] h-12 w-12 opacity-70" style={{ animationDelay: "1.5s" }} />
        <div className="absolute left-4 top-3 z-10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60 sm:left-6 sm:top-5">
          <span className="font-display text-sm text-white">{String(idx + 1).padStart(2, "0")}</span>/ {String(scenes.length).padStart(2, "0")}
        </div>
        <div className="absolute right-4 top-3 z-10 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur sm:right-6 sm:top-5">AI explainer</div>

        <div key={`${idx}-${finished}`} className="scene-enter relative h-full px-6 pb-24 pt-12 sm:px-14 sm:pb-28 sm:pt-16">
          {finished ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="eyebrow text-mint-300">Explainer complete</p>
              <h3 className="headline-xl text-4xl sm:text-6xl"><span className="text-gradient-brand">Well</span> done</h3>
              <div className="on-dark flex flex-wrap justify-center gap-3">
                <button type="button" onClick={toggle} className="pill-outline"><RotateCcw className="h-4 w-4" aria-hidden /> Replay</button>
                <Link href={lessonHref} className="pill-outline">Read the lesson</Link>
                {quizSlot}
              </div>
            </div>
          ) : (
            <SceneView scene={scene} sentence={playing || idx > 0 ? sentence : scene.narration.length} chapters={chapters} quiz={quiz} onAnswer={answer} quizBusy={quizBusy} />
          )}
        </div>

        {waitingForQuiz && quiz.result && (
          <button type="button" onClick={next} className="absolute bottom-24 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-5 py-2.5 text-sm font-semibold text-white shadow-xl sm:bottom-28">
            Continue <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        )}

        {!playing && !finished && (
          <button type="button" onClick={toggle} className="absolute inset-0 z-20 grid place-items-center bg-black/25 transition hover:bg-black/15" aria-label="Play explainer">
            <span className="pulse-ring grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-gold-500 to-mint-500 shadow-2xl shadow-gold-500/50 transition group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-white text-white" aria-hidden />
            </span>
          </button>
        )}

        {captions && playing && caption && (
          <p className="absolute inset-x-4 bottom-[4.5rem] z-10 mx-auto max-w-3xl rounded-xl bg-black/65 px-4 py-1.5 text-center text-xs backdrop-blur sm:bottom-[5.5rem] sm:text-base" aria-hidden>
            {capWords.map((w, i) => (
              <span key={i} className={clsx("transition-colors duration-150", i === word ? "text-mint-200" : i < word ? "text-white" : "text-white/50")}>{w} </span>
            ))}
          </p>
        )}

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-3 pt-10 sm:px-5">
          <div className="mb-2 flex gap-1" aria-hidden>
            {scenes.map((s, i) => (
              <button key={i} type="button" tabIndex={-1} onClick={() => go(i)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15" title={s.heading}>
                <span className="block h-full rounded-full transition-all duration-500" style={{ width: i < idx || finished ? "100%" : i === idx ? `${Math.min(100, ((sentence + 1) / Math.max(1, s.narration.length)) * 100)}%` : "0%", background: `linear-gradient(90deg, #8b5cf6, ${ACCENT[s.kind]})` }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-white sm:gap-2">
            <div className="mr-1 hidden sm:block"><AiPresenter speaking={playing && !muted && !waitingForQuiz} pulse={pulse} size={38} label={false} /></div>
            <button type="button" onClick={() => go(idx - 1)} className="rounded-full p-2 hover:bg-white/15" aria-label="Previous scene"><ChevronLeft className="h-5 w-5" aria-hidden /></button>
            <button type="button" onClick={toggle} className="rounded-full p-2 hover:bg-white/15" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => go(idx + 1)} className="rounded-full p-2 hover:bg-white/15" aria-label="Next scene"><ChevronRight className="h-5 w-5" aria-hidden /></button>
            <span className="ml-1 hidden truncate text-xs text-white/70 md:inline">{scene.heading}</span>
            <span className="flex-1" />
            {voices.length > 1 && (
              <select
                aria-label="Narrator voice"
                value={voiceURI ?? ""}
                onChange={(e) => {
                  setVoiceURI(e.target.value || null);
                  try {
                    localStorage.setItem("pdfp-voice", e.target.value);
                  } catch {
                    /* storage unavailable */
                  }
                }}
                className="hidden max-w-[10rem] rounded-full border border-white/20 bg-black/40 px-2 py-1 text-xs text-white lg:block"
              >
                <option value="">Auto voice</option>
                {voices.map((v) => <option key={v.uri} value={v.uri}>{v.name}</option>)}
              </select>
            )}
            <button
              type="button"
              onClick={() =>
                setRate((r) => {
                  const n = RATES[(RATES.indexOf(r) + 1) % RATES.length];
                  try {
                    localStorage.setItem("pdfp-rate", String(n));
                  } catch {
                    /* storage unavailable */
                  }
                  return n;
                })
              }
              className="rounded-full px-2 py-1 text-xs font-semibold hover:bg-white/15"
              aria-label={`Speed ${rate}×`}
            >
              {rate}×
            </button>
            <button type="button" onClick={() => setMusic((m) => !m)} className="rounded-full p-2 hover:bg-white/15" aria-label={music ? "Turn soundtrack off" : "Turn soundtrack on"}>{music ? <Music className="h-5 w-5" aria-hidden /> : <Music2 className="h-5 w-5 opacity-50" aria-hidden />}</button>
            <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-full p-2 hover:bg-white/15" aria-label={muted ? "Unmute narration" : "Mute narration"}>{muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => setCaptions((c) => !c)} className="rounded-full p-2 hover:bg-white/15" aria-label={captions ? "Hide captions" : "Show captions"}>{captions ? <Captions className="h-5 w-5" aria-hidden /> : <CaptionsOff className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())} className="rounded-full p-2 hover:bg-white/15" aria-label={full ? "Exit full screen" : "Full screen"}>
              {full ? <Minimize className="h-5 w-5" aria-hidden /> : <Maximize className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chapters">
        {scenes.map((s, i) => (
          <li key={i}>
            <button type="button" onClick={() => { go(i); setPlaying(true); }} className={clsx("surface spotlight flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition", i === idx && !finished && "ring-1 ring-gold-400/60")}>
              <span className="font-display text-lg font-black" style={{ color: ACCENT[s.kind] }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium text-navy-950">{s.heading}</span><span className="text-xs text-slate-500">{s.eyebrow}{s.kind === "quiz" ? " · interactive" : ` · ${s.seconds}s`}</span></span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
