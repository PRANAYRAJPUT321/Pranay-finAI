"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Captions, CaptionsOff, Check, ChevronLeft, ChevronRight, Loader2, Maximize, Minimize, Pause, Play, RotateCcw, Settings2, Sparkles, Trophy, Volume2, VolumeX, X } from "lucide-react";
import clsx from "clsx";
import { AiPresenter } from "@/components/ai-presenter";
import { Confetti } from "@/components/motion";
import { Nova, type NovaPose } from "@/components/cartoon/nova";
import { Burst, ToonIllustration } from "@/components/cartoon/illustrations";
import { englishVoices, narrate, neuralAvailable, onNeuralStatus, prefetchClips, primeNarration, type VoiceSource } from "@/lib/video/narrator";
import { startPad, type AudioEngine } from "@/lib/audio/ambient";
import { primeSfx, setSfxEnabled, sfx } from "@/lib/audio/sfx";
import { keyNumbers, type ToonTheme } from "@/lib/video/themes";
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
const NOTE_COLORS = ["bg-[#fde68a]", "bg-[#a7f3d0]", "bg-[#f9a8d4]", "bg-[#c4b5fd]"];
const BUBBLE_COLORS = ["bg-[#fde047]", "bg-[#67e8f9]", "bg-[#f9a8d4]", "bg-[#a7f3d0]", "bg-[#c4b5fd]"];

type QuizState = { picked: string | null; result: { correct: boolean; correctOptionId: string } | null };
type V = React.CSSProperties & Record<`--${string}`, string>;

const problemCount = (s: Scene) => Math.max(0, s.narration.length - s.lines.length - 1);

/** Words that pop in one by one. Gradient text must be applied per word (wordClassName): background-clip text does not paint into animated children. */
function Pop({ text, base = 0, step = 60, wordClassName }: { text: string; base?: number; step?: number; wordClassName?: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className={clsx("word-pop mr-[0.25em]", wordClassName)} style={{ "--delay": `${base + i * step}ms` } as V}>{w}</span>
      ))}
    </>
  );
}

/** Cartoon chalkboard with a wooden frame. */
function Board({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("relative rounded-[18px] border-[6px] border-[#8b5a2b] bg-[#12302a] px-4 py-3 shadow-[inset_0_0_40px_rgba(0,0,0,0.55),0_18px_40px_-18px_rgba(0,0,0,0.9)] sm:px-5", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[12px] opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:7px_7px]" />
      <div className="relative">{children}</div>
      <div aria-hidden className="absolute -bottom-[13px] left-8 flex h-[7px] w-28 items-center gap-1.5 rounded-full bg-[#8b5a2b] px-2">
        <span className="h-[5px] w-6 rounded-full bg-white/90" />
        <span className="h-[5px] w-4 rounded-full bg-[#fde047]" />
      </div>
    </div>
  );
}

function poseFor(scene: Scene, sentence: number, finished: boolean, quiz: QuizState): NovaPose {
  if (finished) return "cheer";
  switch (scene.kind) {
    case "title":
      return "wave";
    case "objectives":
    case "formula":
      return "point";
    case "example": {
      if (sentence >= scene.narration.length - 1) return "cheer";
      return sentence >= problemCount(scene) ? "write" : "present";
    }
    case "quiz":
      return quiz.result ? (quiz.result.correct ? "cheer" : "alert") : "think";
    case "trap":
      return sentence === 0 ? "alert" : "point";
    case "outro":
      return "cheer";
    default:
      return "present";
  }
}

function SceneView({ scene, sentence, playing, chapters, quiz, onAnswer, quizBusy, theme, minutes, sceneIndex }: { scene: Scene; sentence: number; playing: boolean; chapters: string[]; quiz: QuizState; onAnswer: (id: string) => void; quizBusy: boolean; theme: ToonTheme; minutes: number; sceneIndex: number }) {
  switch (scene.kind) {
    case "title": {
      const words = scene.heading.split(" ");
      const cut = Math.max(1, Math.ceil(words.length / 2));
      return (
        <div className="grid h-full items-center gap-4 md:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
            <h2 className="headline-xl mt-3">
              <span className="block text-[clamp(1.5rem,4.5cqw,3.2rem)]"><Pop text={words.slice(0, cut).join(" ")} base={150} wordClassName="text-gradient-brand" /></span>
              {words.length > 1 && <span className="block text-[clamp(1.1rem,3.2cqw,2.3rem)] text-white"><Pop text={words.slice(cut).join(" ")} base={420} /></span>}
            </h2>
            <span className="rule-red slide-in mt-4" style={{ "--delay": "700ms" } as V} />
            <p className="slide-in mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-[11px]" style={{ "--delay": "900ms" } as V}>
              <Sparkles className="h-3.5 w-3.5 text-gold-300" aria-hidden /> {chapters.length} chapters · about {minutes} min
            </p>
          </div>
          <div className="toon-in relative hidden md:block">
            <div aria-hidden className="absolute inset-x-6 bottom-0 h-8 rounded-[50%] bg-black/40 blur-md" />
            <ToonIllustration theme={theme} className="relative drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]" />
          </div>
        </div>
      );
    }
    case "objectives":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-[clamp(1.3rem,3.6cqw,2.4rem)] font-black text-white">{scene.heading}</h3>
          <ul className="mt-4 space-y-2.5">
            {scene.lines.map((l, i) => {
              const done = sentence > i;
              const current = sentence === i + 1;
              return (
                <li key={l} className={clsx("note-in flex items-start gap-3 rounded-2xl border px-3 py-2 text-[clamp(0.8rem,1.9cqw,1.15rem)] text-white transition-all duration-500", current ? "border-mint-300/70 bg-mint-400/10 shadow-[0_0_30px_-12px_rgba(34,211,238,0.9)]" : "border-white/10 bg-white/[0.04]")} style={{ "--delay": `${200 + i * 220}ms` } as V}>
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0" aria-hidden>
                    <circle cx="12" cy="12" r="10" fill={done ? "#22d3ee" : "none"} stroke={done ? "#22d3ee" : "rgba(255,255,255,0.3)"} strokeWidth="2" style={{ transition: "fill 0.4s ease" }} />
                    <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke={done ? "#0b1026" : "#22d3ee"} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="16" strokeDashoffset={done ? 0 : 16} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                  </svg>
                  <span className={clsx("transition-opacity duration-500", current || done ? "opacity-100" : "opacity-70")}>{l}</span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    case "intuition": {
      const bubble = scene.heading !== "Intuition";
      const text = (
        <div className="space-y-3">
          {scene.lines.map((l, i) => (
            <p key={l} className={clsx("slide-in font-display leading-snug transition-all duration-500", bubble ? "text-[clamp(0.85rem,2.1cqw,1.35rem)]" : "text-[clamp(0.85rem,2.05cqw,1.35rem)]", bubble ? (i === sentence ? "text-[#1e1b4b]" : i < sentence ? "text-[#1e1b4b]/65" : "text-[#1e1b4b]/40") : i === sentence ? "text-white" : i < sentence ? "text-white/55" : "text-white/30")} style={{ "--delay": `${150 + i * 120}ms` } as V}>
              {i === sentence ? <span className={clsx("bg-no-repeat [background-position:0_88%] [background-size:100%_38%]", bubble ? "bg-gradient-to-r from-[#fde047] to-[#fde047]" : "bg-gradient-to-r from-gold-500/35 to-mint-500/25")}>{l}</span> : l}
            </p>
          ))}
        </div>
      );
      if (bubble) {
        return (
          <div className="flex h-full flex-col justify-center">
            <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
            <h3 className="font-display slide-in mt-1 text-[clamp(1.2rem,3.2cqw,2.2rem)] font-black text-white">{scene.heading}</h3>
            <div className="note-in relative mt-4 rounded-[28px] border-[3px] border-[#1e1b4b] bg-white px-5 py-4 shadow-[6px_8px_0_rgba(0,0,0,0.35)]" style={{ "--delay": "150ms" } as V}>
              <span aria-hidden className="absolute -left-[18px] bottom-8 hidden h-0 w-0 border-y-[12px] border-r-[18px] border-y-transparent border-r-[#1e1b4b] md:block" />
              <span aria-hidden className="absolute -left-[13px] bottom-[34px] hidden h-0 w-0 border-y-[10px] border-r-[15px] border-y-transparent border-r-white md:block" />
              {text}
            </div>
          </div>
        );
      }
      return (
        <div className="grid h-full items-center gap-5 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
            <h3 className="font-display slide-in mt-1 mb-3 text-[clamp(1.1rem,3cqw,2rem)] font-black text-white">{scene.heading}</h3>
            {text}
          </div>
          <div className="toon-in relative hidden md:block">
            <ToonIllustration theme={theme} className="drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]" />
          </div>
        </div>
      );
    }
    case "formula": {
      const vars = scene.lines;
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-1 text-[clamp(1.05rem,2.8cqw,1.9rem)] font-bold text-white">{scene.heading}</h3>
          <Board className="mt-3">
            <p className="font-hand text-[clamp(1.25rem,3.6cqw,2.6rem)] font-bold leading-tight text-white [text-shadow:0_0_2px_rgba(255,255,255,0.5)]">
              {(scene.highlight ?? "").split(" ").map((t, i) => (
                <span key={i} className="word-pop mr-2 inline-block" style={{ "--delay": `${300 + i * 120}ms` } as V}>{t}</span>
              ))}
            </p>
            <svg viewBox="0 0 300 12" className="toon mt-1 h-3 w-2/3" aria-hidden>
              <path className="t-draw" style={{ "--len": "320", "--d": "0.9s", animationIterationCount: 1, animationFillMode: "forwards" } as V} d="M4 8 C 60 2, 120 11, 180 5 S 270 4, 296 7" fill="none" stroke="#fde047" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </Board>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {vars.map((l, i) => {
              const [sym, ...rest] = l.split(" — ");
              return (
                <li key={l} className={clsx("note-in flex items-center gap-3 rounded-xl border px-3 py-1.5 text-[clamp(0.72rem,1.6cqw,0.95rem)] text-white transition", sentence >= i + 2 ? "border-mint-400/60 bg-mint-400/10" : "border-white/10 bg-white/5")} style={{ "--delay": `${900 + i * 200}ms` } as V}>
                  <span className="grid h-7 min-w-7 shrink-0 place-items-center whitespace-nowrap rounded-lg bg-gradient-to-br from-gold-500 to-mint-500 px-2 font-mono text-xs font-bold">{sym}</span>
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
      const pc = problemCount(scene);
      const active = sentence - pc;
      const answered = sentence >= scene.narration.length - 1;
      const nums = keyNumbers(scene.body ?? scene.narration.slice(0, pc).join(" "));
      const activeText = steps[active] ?? "";
      return (
        <div className="flex h-full flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow slide-in text-[0.6rem] text-amber-300 sm:text-xs">{scene.eyebrow}</p>
            <div className="flex flex-wrap gap-1.5" aria-hidden>
              {nums.map((n, i) => (
                <span key={`${n}-${activeText.includes(n) ? active : "x"}`} className={clsx("grid h-7 min-w-7 place-items-center rounded-full border-2 border-[#1e1b4b] px-2 font-display text-[11px] font-black text-[#1e1b4b] shadow-[2px_3px_0_rgba(0,0,0,0.4)]", BUBBLE_COLORS[i % BUBBLE_COLORS.length], activeText.includes(n) ? "bubble-hop ring-2 ring-white" : "note-in")} style={{ "--delay": `${300 + i * 140}ms` } as V}>{n}</span>
              ))}
            </div>
          </div>
          <h3 className="font-display slide-in mt-1 text-[clamp(0.95rem,2.5cqw,1.7rem)] font-bold text-white">{scene.heading}</h3>
          <Board className="mt-2.5">
            {scene.body && <p className="font-hand text-[clamp(0.95rem,2.2cqw,1.45rem)] leading-snug text-[#fef3c7]">{scene.body}</p>}
            <ol className="mt-1.5 space-y-0.5">
              {steps.map((l, i) => {
                const shown = !playing || i <= active;
                return (
                  <li key={l} className={clsx("flex gap-2 font-hand text-[clamp(0.95rem,2.2cqw,1.45rem)] leading-snug", shown ? "write-on" : "invisible", i === active ? "text-[#fde047]" : "text-white/90")}>
                    <span className="w-5 shrink-0 font-bold">{i === active && !answered ? "➜" : `${i + 1}.`}</span>
                    <span className={clsx(i === active && "underline decoration-[#fde047]/70 decoration-wavy underline-offset-4")}>{l}</span>
                  </li>
                );
              })}
            </ol>
          </Board>
          {answered && scene.highlight && (
            <div className="relative mt-4 w-fit">
              <Burst className="burst-spin absolute -left-7 -top-7 h-20 w-20" />
              <p className="stamp-in relative inline-flex items-center gap-2 rounded-xl border-[3px] border-rose-400 bg-[#0b1026]/90 px-4 py-1.5 font-display text-[clamp(0.95rem,2.6cqw,1.6rem)] font-black text-rose-200 shadow-xl">
                <span className="text-[10px] uppercase tracking-[0.3em] text-rose-300">Answer</span>
                {scene.highlight}
              </p>
            </div>
          )}
        </div>
      );
    }
    case "quiz": {
      const q = scene.quiz!;
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in flex items-center gap-2 text-[0.6rem] text-fuchsia-300 sm:text-xs"><Sparkles className="h-3.5 w-3.5" aria-hidden /> {scene.eyebrow} · the video waits for you</p>
          <p className="slide-in mt-3 max-w-3xl text-[clamp(0.8rem,2cqw,1.15rem)] leading-relaxed text-white">{q.stem}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const right = quiz.result && o.id === quiz.result.correctOptionId;
              const wrong = quiz.result && quiz.picked === o.id && !quiz.result.correct;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={!!quiz.result || quizBusy}
                  onClick={() => onAnswer(o.id)}
                  className={clsx("note-in flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[clamp(0.75rem,1.7cqw,0.95rem)] transition", right ? "border-green-400 bg-green-500/20 text-white" : wrong ? "border-rose-400 bg-rose-500/20 text-white" : quiz.picked === o.id ? "border-white/60 bg-white/10 text-white" : "border-white/15 bg-white/5 text-white hover:-translate-y-0.5 hover:border-fuchsia-300/70 hover:bg-white/10")}
                  style={{ "--delay": `${300 + i * 120}ms` } as V}
                >
                  <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#1e1b4b] bg-[#fde047] text-xs font-black text-[#1e1b4b]">{String.fromCharCode(65 + i)}</span>
                  {o.text}
                </button>
              );
            })}
          </div>
          {quiz.result && <p className="stamp-in mt-4 w-fit rounded-xl bg-black/40 px-3 py-1.5 text-sm font-semibold text-white sm:text-base" role="status">{quiz.result.correct ? "Correct! Locked in." : "Not quite. The highlighted answer is right; review it in the lesson."}</p>}
        </div>
      );
    }
    case "trap": {
      const flipped = sentence >= 1;
      return (
        <div className="flex h-full flex-col justify-center">
          <div className="flex items-center gap-3">
            <span className="stamp-in inline-flex items-center rounded-lg border-2 border-[#1e1b4b] bg-[repeating-linear-gradient(135deg,#fde047_0_12px,#1e1b4b_12px_24px)] px-1.5 py-1" aria-hidden>
              <span className="rounded bg-[#fde047] px-2 py-0.5 font-display text-[11px] font-black uppercase tracking-[0.2em] text-[#1e1b4b]">Watch out</span>
            </span>
            <p className="eyebrow slide-in text-[0.6rem] text-rose-300 sm:text-xs">{scene.eyebrow}</p>
          </div>
          <h3 className="font-display slide-in mt-2 text-[clamp(1.1rem,3cqw,2rem)] font-bold text-white">{scene.heading}</h3>
          <div className="perspective mt-4 h-[clamp(7rem,22cqw,12rem)] max-w-2xl">
            <div className="preserve-3d relative h-full w-full transition-transform duration-700" style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
              <div className="backface-hidden absolute inset-0 flex items-start gap-3 rounded-3xl border-[3px] border-rose-400/70 bg-rose-500/15 p-5">
                <X className="mt-1 h-7 w-7 shrink-0 text-rose-300" aria-hidden />
                <p className="text-[clamp(0.85rem,2.3cqw,1.5rem)] text-white line-through decoration-rose-300/70">{scene.lines[0]}</p>
              </div>
              <div className="backface-hidden absolute inset-0 flex items-start gap-3 rounded-3xl border-[3px] border-green-400/70 bg-green-500/15 p-5" style={{ transform: "rotateY(180deg)" }}>
                <Check className="mt-1 h-7 w-7 shrink-0 text-green-300" aria-hidden />
                <p className="text-[clamp(0.85rem,2.3cqw,1.5rem)] text-white">{scene.lines[1]}</p>
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
          <h3 className="font-display slide-in mt-1 text-[clamp(1.3rem,3.6cqw,2.4rem)] font-black text-white">{scene.heading}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {scene.lines.map((l, i) => {
              const current = sentence === i + 1;
              return (
                <div key={l} className={clsx("note-in relative rounded-md px-4 pb-3 pt-4 font-hand text-[clamp(0.95rem,2.2cqw,1.4rem)] font-bold leading-snug text-[#1e1b4b] shadow-[4px_6px_0_rgba(0,0,0,0.35)] transition-transform duration-500", NOTE_COLORS[i % NOTE_COLORS.length], current && "z-10 scale-[1.06]")} style={{ "--delay": `${200 + i * 220}ms`, "--r": `${[-2.5, 2, 1.5, -1.8][i % 4]}deg` } as V}>
                  <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-3deg] rounded-sm bg-white/60 shadow-sm" />
                  {l}
                </div>
              );
            })}
          </div>
        </div>
      );
    case "outro":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="stamp-in relative mb-2" aria-hidden>
            <Burst className="burst-spin absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] opacity-90" />
            <span className="relative grid h-16 w-16 place-items-center rounded-full border-[3px] border-[#1e1b4b] bg-gradient-to-br from-amber-300 to-orange-500 shadow-xl sm:h-20 sm:w-20">
              <Trophy className="h-8 w-8 text-[#1e1b4b] sm:h-10 sm:w-10" />
            </span>
          </div>
          <p className="eyebrow slide-in mt-3 text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="headline-xl mt-2 text-[clamp(2rem,6.5cqw,4.4rem)] text-white"><Pop text="Now practise" base={100} step={120} /></h3>
          <span className="rule-red slide-in mt-4" style={{ "--delay": "500ms" } as V} />
          <span className="sr-only">Scene {sceneIndex + 1}</span>
        </div>
      );
    default:
      return null;
  }
}

/**
 * Generated video explainer: Nova, a cartoon robot presenter, narrates
 * animated scenes built from the lesson with a natural AI voice (or the best
 * device voice), word-by-word captions, cartoon illustrations for the topic,
 * a chalkboard worked example, sound effects, chapters, an optional soundtrack
 * and an interactive checkpoint question.
 */
export function VideoPlayer({ scenes, title, lessonHref, quizSlot, theme = "calculator" }: { scenes: Scene[]; title: string; lessonHref: string; quizSlot?: React.ReactNode; theme?: ToonTheme }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [music, setMusic] = useState(false);
  const [effects, setEffects] = useState(true);
  const [rate, setRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [voices, setVoices] = useState<{ uri: string; name: string }[]>([]);
  const [sentence, setSentence] = useState(0);
  const [word, setWord] = useState(-1);
  const [source, setSource] = useState<VoiceSource | null>(null);
  const [voiceWaiting, setVoiceWaiting] = useState(false);
  const [hasNeural, setHasNeural] = useState(() => scenes.some((s) => s.audio?.some(Boolean)));
  const [settings, setSettings] = useState(false);
  const [full, setFull] = useState(false);
  const [quiz, setQuiz] = useState<QuizState>({ picked: null, result: null });
  const [quizBusy, startQuiz] = useTransition();
  const [celebrate, setCelebrate] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const novaRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioEngine | null>(null);
  const sentenceRef = useRef(0);
  const playingRef = useRef(false);
  const scene = scenes[idx];
  const chapters = scenes.map((s) => s.heading);
  const minutes = Math.max(1, Math.round(scenes.reduce((a, s) => a + s.seconds, 0) / 60));

  useEffect(() => {
    playingRef.current = playing;
  });

  const go = useCallback((i: number) => {
    setFinished(false);
    sentenceRef.current = 0;
    setSentence(0);
    setWord(-1);
    setQuiz({ picked: null, result: null });
    setIdx(Math.max(0, Math.min(scenes.length - 1, i)));
  }, [scenes.length]);

  const next = useCallback(() => {
    sentenceRef.current = 0;
    setSentence(0);
    setWord(-1);
    setQuiz({ picked: null, result: null });
    setIdx((i) => {
      if (i + 1 >= scenes.length) {
        setPlaying(false);
        setFinished(true);
        setCelebrate((c) => c + 1);
        return i;
      }
      return i + 1;
    });
  }, [scenes.length]);

  // Narration for the current scene, resuming from the current sentence after a pause. Quiz scenes wait for an answer.
  useEffect(() => {
    if (!playing) return;
    const setMouth = (l: number) => {
      const v = l.toFixed(3);
      novaRef.current?.style.setProperty("--mouth", v);
      miniRef.current?.style.setProperty("--mouth", v);
    };
    return narrate(scene.narration, {
      rate,
      voiceURI,
      preferDevice: !!voiceURI,
      muted,
      minSeconds: scene.seconds,
      audio: scene.audio,
      startAt: sentenceRef.current,
      onSentence: (i) => {
        sentenceRef.current = i;
        setSentence(i);
        setWord(-1);
        if (i >= scene.narration.length - 2) prefetchClips(scenes[idx + 1]?.audio?.slice(0, 2) ?? []);
      },
      onWord: (_, w) => setWord(w),
      onLevel: setMouth,
      onSource: setSource,
      onWaiting: setVoiceWaiting,
      onDone: () => {
        if (scene.kind !== "quiz") next();
      },
    });
  }, [playing, idx, muted, rate, voiceURI, scene, scenes, next]);

  useEffect(() => onNeuralStatus((ok) => setHasNeural((h) => h && ok)), []);

  useEffect(() => {
    setSfxEnabled(effects && !muted);
  }, [effects, muted]);

  // Cartoon sound effects.
  useEffect(() => {
    if (!playingRef.current) return;
    sfx.whoosh();
    if (scenes[idx].kind === "outro") setTimeout(sfx.chime, 450);
  }, [idx, scenes]);

  useEffect(() => {
    if (!playingRef.current || sentence === 0) return;
    const s = scenes[idx];
    if (s.kind === "objectives") sfx.tick();
    else if (s.kind === "summary") sfx.pop();
    else if (s.kind === "trap" && sentence === 1) sfx.ding();
    else if (s.kind === "example") {
      if (sentence === s.narration.length - 1) {
        sfx.stamp();
        setTimeout(sfx.ding, 260);
      } else if (sentence >= problemCount(s)) sfx.pop();
    }
  }, [sentence, idx, scenes]);

  useEffect(() => {
    if (finished) sfx.chime();
  }, [finished]);

  useEffect(() => {
    if (playing && music && !audio.current) audio.current = startPad("focus", 0.1);
    if ((!playing || !music) && audio.current) {
      audio.current.stop();
      audio.current = null;
    }
  }, [playing, music]);

  useEffect(() => {
    const load = () => setVoices(englishVoices().map((v) => ({ uri: v.voiceURI, name: `${v.name} (${v.lang})` })));
    const t = setTimeout(() => {
      load();
      setHasNeural((h) => h && neuralAvailable());
      try {
        setVoiceURI(localStorage.getItem("pdfp-voice") || null);
        const r = Number(localStorage.getItem("pdfp-rate"));
        if (RATES.includes(r)) setRate(r);
        setEffects(localStorage.getItem("pdfp-sfx") !== "0");
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

  const prime = () => {
    primeNarration();
    primeSfx();
  };

  const toggle = () => {
    prime();
    if (finished) {
      go(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const answer = (optionId: string) => {
    if (!scene.quiz || quiz.result) return;
    prime();
    setQuiz({ picked: optionId, result: null });
    startQuiz(async () => {
      try {
        const res = await rapidFireAnswerAction(scene.quiz!.id, optionId);
        setQuiz({ picked: optionId, result: res });
        if (res.correct) {
          setCelebrate((c) => c + 1);
          sfx.chime();
        } else sfx.bonk();
      } catch {
        setQuiz({ picked: null, result: null });
      }
    });
  };

  const store = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
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
    else if (e.key === "Escape") setSettings(false);
  };

  const caption = scene.narration[sentence] ?? "";
  const capWords = caption.split(/\s+/);
  const waitingForQuiz = scene.kind === "quiz" && playing;
  const speaking = playing && !muted && !waitingForQuiz && !voiceWaiting && source !== "timer";
  const pose: NovaPose = !playing && !finished && idx === 0 ? "wave" : poseFor(scene, playing || idx > 0 ? sentence : scene.narration.length, finished, quiz);
  const voiceLabel = voiceWaiting ? "Preparing voice…" : voiceURI ? "Device voice" : hasNeural && source !== "device" ? "Natural AI voice" : "Device voice";

  return (
    <div className="space-y-4">
      <div
        ref={stage}
        tabIndex={0}
        onKeyDown={onKey}
        role="region"
        aria-label={`Video explainer: ${title}`}
        className="bg-ink group relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] sm:aspect-[16/11] md:aspect-video text-white shadow-[0_40px_120px_-50px_rgba(124,58,237,0.9)] outline-none ring-1 ring-white/10 [container-type:inline-size] focus-visible:ring-2 focus-visible:ring-gold-400 [&:fullscreen]:rounded-none"
      >
        {celebrate > 0 && <Confetti key={celebrate} pieces={48} />}
        {/* Layered backdrop: synthwave floor, accent glow, drifting orbs and a stage spotlight */}
        <div aria-hidden className="floor-3d" />
        <div aria-hidden className="absolute inset-0 transition-colors duration-1000" style={{ background: `radial-gradient(60% 70% at 80% 10%, ${ACCENT[scene.kind]}44, transparent 60%)` }} />
        <div aria-hidden className="absolute bottom-0 left-0 hidden h-3/4 w-[34%] bg-[radial-gradient(50%_55%_at_45%_85%,rgba(167,139,250,0.35),transparent_70%)] md:block" />
        <span aria-hidden className="orb orb-violet float absolute -right-10 -top-12 h-40 w-40 opacity-60" />
        <span aria-hidden className="orb orb-cyan float absolute bottom-24 right-[12%] h-12 w-12 opacity-70" style={{ animationDelay: "1.5s" }} />
        <div className="absolute left-4 top-3 z-10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60 sm:left-6 sm:top-5">
          <div className="md:hidden"><AiPresenter ref={miniRef} speaking={speaking} size={30} label={false} /></div>
          <span className="font-display text-sm text-white">{String(idx + 1).padStart(2, "0")}</span>/ {String(scenes.length).padStart(2, "0")}
        </div>
        <div className="absolute right-4 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75 backdrop-blur sm:right-6 sm:top-5">
          {voiceWaiting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <span className={clsx("h-1.5 w-1.5 rounded-full", voiceLabel === "Natural AI voice" ? "bg-mint-400 shadow-[0_0_8px_#22d3ee]" : "bg-amber-300")} />}
          {voiceLabel}
        </div>

        {/* Nova on stage (tablet and up) */}
        <Nova ref={novaRef} pose={pose} speaking={speaking} className="absolute bottom-[11%] left-[1.5%] z-10 hidden aspect-[4/5] h-[58%] md:block" />

        <div key={`${idx}-${finished}`} className="scene-enter relative h-full px-5 pb-24 pt-12 sm:px-10 sm:pb-28 sm:pt-14 md:pl-[30%] md:pr-8">
          {finished ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="eyebrow text-mint-300">Explainer complete</p>
              <h3 className="headline-xl text-[clamp(2rem,6cqw,4rem)]"><span className="text-gradient-brand">Well</span> done</h3>
              <div className="on-dark flex flex-wrap justify-center gap-3">
                <button type="button" onClick={toggle} className="pill-outline"><RotateCcw className="h-4 w-4" aria-hidden /> Replay</button>
                <Link href={lessonHref} className="pill-outline">Read the lesson</Link>
                {quizSlot}
              </div>
            </div>
          ) : (
            <SceneView scene={scene} sentence={playing || idx > 0 ? sentence : scene.narration.length} playing={playing} chapters={chapters} quiz={quiz} onAnswer={answer} quizBusy={quizBusy} theme={theme} minutes={minutes} sceneIndex={idx} />
          )}
        </div>

        {waitingForQuiz && quiz.result && (
          <button type="button" onClick={() => { prime(); next(); }} className="absolute bottom-24 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-5 py-2.5 text-sm font-semibold text-white shadow-xl sm:bottom-28">
            Continue <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        )}

        {!playing && !finished && (
          <button type="button" onClick={toggle} className="absolute inset-0 z-20 grid place-items-end justify-items-center bg-black/20 pb-[13%] transition hover:bg-black/10 md:pl-[30%]" aria-label="Play explainer">
            <span className="pulse-ring grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-gold-500 to-mint-500 shadow-2xl shadow-gold-500/50 transition group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-white text-white" aria-hidden />
            </span>
          </button>
        )}

        {captions && playing && caption && (
          <p className="absolute inset-x-4 bottom-[4.5rem] z-10 mx-auto max-w-3xl rounded-xl bg-black/65 px-4 py-1.5 text-center text-xs backdrop-blur sm:bottom-[5.5rem] sm:text-base md:left-[31%] md:right-6 md:mx-0 md:max-w-none" aria-hidden>
            {capWords.map((w, i) => (
              <span key={i} className={clsx("transition-colors duration-150", i === word ? "text-mint-200" : i < word ? "text-white" : "text-white/50")}>{w} </span>
            ))}
          </p>
        )}

        {settings && (
          <div className="absolute bottom-16 right-3 z-40 w-72 rounded-2xl bg-[#0b1026]/95 p-4 text-sm shadow-2xl ring-1 ring-white/15 backdrop-blur sm:bottom-20 sm:right-5" role="dialog" aria-label="Video settings">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60" htmlFor="vp-voice">Narrator voice</label>
            <select
              id="vp-voice"
              value={voiceURI ?? ""}
              onChange={(e) => {
                setVoiceURI(e.target.value || null);
                store("pdfp-voice", e.target.value);
              }}
              className="mt-1.5 w-full rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white"
            >
              <option value="">{hasNeural ? "Natural AI voice (Nova)" : "Best voice on this device"}</option>
              {voices.map((v) => <option key={v.uri} value={v.uri}>{v.name}</option>)}
            </select>
            <p className="mt-1.5 text-[11px] leading-snug text-white/55">
              {hasNeural ? "Studio-quality neural voice, generated once and cached." : "For the most natural built-in voices use Microsoft Edge (\"Natural\" voices) or an Apple device with an Enhanced voice."}
            </p>
            <div className="mt-3 space-y-2">
              {[
                { label: "Background music", on: music, set: () => setMusic((m) => !m) },
                {
                  label: "Sound effects",
                  on: effects,
                  set: () =>
                    setEffects((x) => {
                      store("pdfp-sfx", x ? "0" : "1");
                      return !x;
                    }),
                },
              ].map((t) => (
                <button key={t.label} type="button" onClick={t.set} className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-white hover:bg-white/5" aria-pressed={t.on}>
                  {t.label}
                  <span className={clsx("relative h-5 w-9 rounded-full transition", t.on ? "bg-gradient-to-r from-gold-500 to-mint-500" : "bg-white/20")}>
                    <span className={clsx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", t.on ? "left-[18px]" : "left-0.5")} />
                  </span>
                </button>
              ))}
            </div>
          </div>
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
            <button type="button" onClick={() => go(idx - 1)} className="rounded-full p-2 hover:bg-white/15" aria-label="Previous scene"><ChevronLeft className="h-5 w-5" aria-hidden /></button>
            <button type="button" onClick={toggle} className="rounded-full p-2 hover:bg-white/15" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => { prime(); go(idx + 1); }} className="rounded-full p-2 hover:bg-white/15" aria-label="Next scene"><ChevronRight className="h-5 w-5" aria-hidden /></button>
            <span className="ml-1 hidden truncate text-xs text-white/70 md:inline">{scene.heading}</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() =>
                setRate((r) => {
                  const n = RATES[(RATES.indexOf(r) + 1) % RATES.length];
                  store("pdfp-rate", String(n));
                  return n;
                })
              }
              className="rounded-full px-2 py-1 text-xs font-semibold hover:bg-white/15"
              aria-label={`Speed ${rate}×`}
            >
              {rate}×
            </button>
            <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-full p-2 hover:bg-white/15" aria-label={muted ? "Unmute narration" : "Mute narration"}>{muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => setCaptions((c) => !c)} className="rounded-full p-2 hover:bg-white/15" aria-label={captions ? "Hide captions" : "Show captions"}>{captions ? <Captions className="h-5 w-5" aria-hidden /> : <CaptionsOff className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => setSettings((o) => !o)} className={clsx("rounded-full p-2 hover:bg-white/15", settings && "bg-white/15")} aria-label="Video settings" aria-expanded={settings}><Settings2 className="h-5 w-5" aria-hidden /></button>
            <button type="button" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())} className="rounded-full p-2 hover:bg-white/15" aria-label={full ? "Exit full screen" : "Full screen"}>
              {full ? <Minimize className="h-5 w-5" aria-hidden /> : <Maximize className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chapters">
        {scenes.map((s, i) => (
          <li key={i}>
            <button type="button" onClick={() => { prime(); go(i); setPlaying(true); }} className={clsx("surface spotlight flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition", i === idx && !finished && "ring-1 ring-gold-400/60")}>
              <span className="font-display text-lg font-black" style={{ color: ACCENT[s.kind] }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium text-navy-950">{s.heading}</span><span className="text-xs text-slate-500">{s.eyebrow}{s.kind === "quiz" ? " · interactive" : ` · ${s.seconds}s`}</span></span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
