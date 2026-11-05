"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, CaptionsOff, Music, Music2, Pause, Play, RotateCcw, SkipForward, Sparkles, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";
import { SceneGate } from "@/components/three/gate";
import { AiPresenter } from "@/components/ai-presenter";
import { CountUp } from "@/components/motion";
import { narrate, prefetchClips, primeNarration } from "@/lib/video/narrator";
import { startPad, type AudioEngine } from "@/lib/audio/ambient";
import type { BriefingScene } from "@/lib/video/briefing";

const WarpScene = dynamic(() => import("@/components/three/warp-scene"), { ssr: false });

const COLORS: Record<BriefingScene["kind"], string> = {
  greeting: "#8b5cf6",
  countdown: "#22d3ee",
  momentum: "#34d399",
  mission: "#fbbf24",
  mindset: "#e879f9",
  launch: "#8b5cf6",
};

function Words({ text, base = 0, className }: { text: string; base?: number; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="word-pop mr-[0.25em]" style={{ "--delay": `${base + i * 70}ms` } as React.CSSProperties}>
          {w}
        </span>
      ))}
    </span>
  );
}

function Ring({ value, label, display, color, delay }: { value: number; label: string; display: string; color: string; delay: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(Math.max(0, Math.min(1, value))), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  const C = 2 * Math.PI * 42;
  return (
    <div className="flip-in text-center" style={{ "--delay": `${delay}ms` } as React.CSSProperties}>
      <svg viewBox="0 0 100 100" className="mx-auto h-24 w-24 -rotate-90 sm:h-28 sm:w-28">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - shown)} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <p className="font-display -mt-[4.4rem] text-xl font-bold text-white sm:-mt-[4.9rem] sm:text-2xl">{display}</p>
      <p className="mt-9 text-[10px] uppercase tracking-[0.18em] text-navy-100 sm:mt-11">{label}</p>
    </div>
  );
}

function SceneView({ s, firstTask }: { s: BriefingScene; firstTask: string | null }) {
  switch (s.kind) {
    case "countdown":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-mint-300">{s.eyebrow}</p>
          <p className="headline-xl slide-in mt-3 text-7xl text-gradient-brand sm:text-8xl" style={{ "--delay": "120ms" } as React.CSSProperties}>
            {/^\d+$/.test(s.big ?? "") ? <CountUp value={Number(s.big)} duration={1400} /> : s.big}
          </p>
          <p className="font-display slide-in text-xl font-bold text-white sm:text-2xl" style={{ "--delay": "260ms" } as React.CSSProperties}>{s.title}</p>
          <p className="slide-in mt-3 max-w-xl text-sm text-navy-100 sm:text-lg" style={{ "--delay": "400ms" } as React.CSSProperties}>{s.lines[0]}</p>
        </div>
      );
    case "momentum":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-mint-300">{s.eyebrow}</p>
          <p className="font-display slide-in mt-2 text-2xl font-bold text-white sm:text-3xl">{s.title}</p>
          <div className="mt-6 grid max-w-xl grid-cols-3 gap-2 sm:gap-5">
            {(s.stats ?? []).map((st, i) => <Ring key={st.label} value={st.value} label={st.label} display={st.display} color={["#22d3ee", "#e879f9", "#34d399"][i]} delay={200 + i * 220} />)}
          </div>
          <p className="slide-in mt-6 text-sm text-navy-100 sm:text-base" style={{ "--delay": "800ms" } as React.CSSProperties}>{s.lines[0]}</p>
        </div>
      );
    case "mission":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-amber-300">{s.eyebrow}</p>
          <p className="font-display slide-in mt-2 text-2xl font-bold text-white sm:text-3xl">{s.title}</p>
          <ol className="mt-5 max-w-xl space-y-2.5">
            {s.lines.map((l, i) => (
              <li key={l} className="flip-in flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white backdrop-blur sm:text-base" style={{ "--delay": `${250 + i * 260}ms` } as React.CSSProperties}>
                <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-sm font-black text-black">{i + 1}</span>
                {l}
              </li>
            ))}
          </ol>
        </div>
      );
    case "mindset":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-fuchsia-300">{s.eyebrow}</p>
          <div className="conic-border flip-in mt-4 max-w-2xl rounded-3xl bg-black/35 p-6 backdrop-blur sm:p-8" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <p className="font-display text-2xl font-bold text-white sm:text-3xl">{s.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-navy-100 sm:text-base">{s.lines[0]}</p>
          </div>
        </div>
      );
    case "launch":
      return (
        <div className="flex h-full flex-col items-start justify-center">
          <p className="eyebrow slide-in text-mint-300">{s.eyebrow}</p>
          <p className="headline-xl mt-3 max-w-xl text-4xl text-white sm:text-5xl"><Words text={s.title} base={100} /></p>
          <div className="slide-in mt-7 flex flex-wrap gap-3" style={{ "--delay": "700ms" } as React.CSSProperties}>
            <Link href="/plan" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-fuchsia-500/30">
              <Play className="h-4 w-4 fill-white" aria-hidden /> {firstTask ? `Start: ${firstTask}` : "Open today's plan"}
            </Link>
            <Link href="/daily" className="pill-outline">Daily challenge</Link>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-mint-300">{s.eyebrow}</p>
          <h3 className="headline-xl mt-4 max-w-xl text-4xl text-white sm:text-[3.4rem]"><Words text={s.title} base={150} /></h3>
          <p className="slide-in mt-5 max-w-lg text-base text-navy-100 sm:text-lg" style={{ "--delay": "650ms" } as React.CSSProperties}>{s.lines[0]}</p>
        </div>
      );
  }
}

/** The personalised daily briefing film shown at the top of the dashboard. */
export function BriefingPlayer({ scenes, firstName, firstTask }: { scenes: BriefingScene[]; firstName: string; firstTask: string | null }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [muted, setMuted] = useState(false);
  const [music, setMusic] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [sentence, setSentence] = useState(0);
  const [word, setWord] = useState(-1);
  const audio = useRef<AudioEngine | null>(null);
  const mini = useRef<HTMLDivElement>(null);
  const s = scenes[idx];
  const total = scenes.reduce((a, x) => a + x.seconds, 0);

  const next = useCallback(() => {
    setSentence(0);
    setWord(-1);
    setIdx((i) => {
      if (i + 1 >= scenes.length) {
        setPlaying(false);
        setFinished(true);
        return i;
      }
      return i + 1;
    });
  }, [scenes.length]);

  useEffect(() => {
    if (!playing) return;
    return narrate(s.narration, {
      muted,
      minSeconds: s.seconds,
      audio: s.audio,
      onSentence: (i) => {
        setSentence(i);
        setWord(-1);
        if (i >= s.narration.length - 2) prefetchClips(scenes[idx + 1]?.audio?.slice(0, 2) ?? []);
      },
      onWord: (_, w) => setWord(w),
      onLevel: (l) => mini.current?.style.setProperty("--mouth", l.toFixed(3)),
      onDone: next,
    });
  }, [playing, idx, muted, s, scenes, next]);

  useEffect(() => {
    if (playing && music && !audio.current) audio.current = startPad("uplift", 0.22);
    if ((!playing || !music) && audio.current) {
      audio.current.stop();
      audio.current = null;
    }
  }, [playing, music]);

  useEffect(() => () => {
    audio.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const play = () => {
    primeNarration();
    if (finished) {
      setFinished(false);
      setIdx(0);
    }
    setStarted(true);
    setPlaying((p) => !p);
  };

  const caption = s.narration[sentence] ?? "";
  const words = caption.split(/\s+/);

  return (
    <section className="bg-ink relative flex h-full flex-col overflow-hidden rounded-[1.75rem] text-white shadow-[0_40px_120px_-50px_rgba(124,58,237,0.9)] ring-1 ring-white/10" aria-label="Your daily briefing video">
      <div className="relative min-h-[460px] w-full flex-1 sm:min-h-[500px]">
        <div className="absolute inset-0">
          {started ? (
            <SceneGate className="h-full w-full" fallback={<div className="aurora" />}>
              {(visible) => <WarpScene color={finished ? "#8b5cf6" : COLORS[s.kind]} energy={playing ? 1 : 0} active={visible && (playing || !finished)} />}
            </SceneGate>
          ) : (
            <div className="aurora" />
          )}
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#06071a]/90 via-[#06071a]/55 to-transparent" />

        <div className="relative h-full px-6 pb-32 pt-10 sm:px-10 sm:pb-36">
          {!started ? (
            <div className="flex h-full flex-col justify-center">
              <p className="eyebrow flex items-center gap-2 text-mint-300"><Sparkles className="h-3.5 w-3.5" aria-hidden /> Made for you today</p>
              <h2 className="headline-xl mt-4 text-4xl sm:text-[3.4rem]">Your daily <span className="text-gradient-brand">briefing</span></h2>
              <p className="mt-4 max-w-lg text-sm text-navy-100 sm:text-base">A {Math.round(total / 5) * 5}-second film generated from your plan, progress and exam countdown, {firstName}. Press play — sound on.</p>
              <span aria-hidden className="mt-7 inline-flex w-fit items-center gap-3 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 py-2 pl-2 pr-6 text-sm font-semibold text-white shadow-xl shadow-gold-500/40">
                <span className="pulse-ring grid h-11 w-11 place-items-center rounded-full bg-white/20"><Play className="ml-0.5 h-5 w-5 fill-white" /></span>
                Play my briefing
              </span>
            </div>
          ) : finished ? (
            <div className="flex h-full flex-col justify-center">
              <p className="eyebrow text-mint-300">Briefing complete</p>
              <p className="headline-xl mt-3 text-4xl sm:text-5xl">Now go <span className="text-gradient-brand">make progress.</span></p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/plan" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-6 py-3 text-sm font-semibold text-white"><Play className="h-4 w-4 fill-white" aria-hidden /> {firstTask ? `Start: ${firstTask}` : "Open today's plan"}</Link>
                <button type="button" onClick={play} className="pill-outline"><RotateCcw className="h-4 w-4" aria-hidden /> Replay</button>
              </div>
            </div>
          ) : (
            <div key={idx} className="scene-enter h-full">
              <SceneView s={s} firstTask={firstTask} />
            </div>
          )}
        </div>

        {!playing && !finished && (
          <button type="button" onClick={play} className="group absolute inset-x-0 top-0 bottom-16 z-20 grid place-items-center" aria-label={started ? "Resume briefing" : "Play your daily briefing"}>
            {started && (
              <span className="pulse-ring grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-gold-500 to-mint-500 shadow-2xl shadow-gold-500/50 transition group-hover:scale-110 sm:h-24 sm:w-24">
                <Play className="ml-1 h-9 w-9 fill-white text-white" aria-hidden />
              </span>
            )}
          </button>
        )}

        {captions && playing && caption && (
          <p className="absolute inset-x-4 bottom-[4.5rem] z-10 mx-auto max-w-2xl rounded-xl bg-black/60 px-4 py-2 text-center text-sm backdrop-blur sm:text-[0.95rem]" aria-hidden>
            {words.map((w, i) => (
              <span key={i} className={clsx("transition-colors", i <= word ? "text-white" : "text-white/45", i === word && "text-mint-200")}>{w} </span>
            ))}
          </p>
        )}

        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 sm:px-6">
          <AiPresenter ref={mini} speaking={playing && !muted} size={40} label={false} />
          <div className="flex flex-1 gap-1" aria-hidden>
            {scenes.map((_, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <span className={clsx("block h-full bg-gradient-to-r from-gold-400 to-mint-400 transition-all duration-700", i < idx || finished ? "w-full" : i === idx && started ? "w-1/2" : "w-0")} />
              </span>
            ))}
          </div>
          <button type="button" onClick={play} className="rounded-full p-2 hover:bg-white/15" aria-label={playing ? "Pause briefing" : "Play briefing"}>{playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}</button>
          <button type="button" onClick={next} disabled={!started || finished} className="rounded-full p-2 hover:bg-white/15 disabled:opacity-40" aria-label="Next scene"><SkipForward className="h-5 w-5" aria-hidden /></button>
          <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-full p-2 hover:bg-white/15" aria-label={muted ? "Unmute narration" : "Mute narration"}>{muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}</button>
          <button type="button" onClick={() => setMusic((m) => !m)} className="rounded-full p-2 hover:bg-white/15" aria-label={music ? "Turn soundtrack off" : "Turn soundtrack on"}>{music ? <Music className="h-5 w-5" aria-hidden /> : <Music2 className="h-5 w-5 opacity-50" aria-hidden />}</button>
          <button type="button" onClick={() => setCaptions((c) => !c)} className="hidden rounded-full p-2 hover:bg-white/15 sm:block" aria-label={captions ? "Hide captions" : "Show captions"}>{captions ? <Captions className="h-5 w-5" aria-hidden /> : <CaptionsOff className="h-5 w-5" aria-hidden />}</button>
        </div>
      </div>
    </section>
  );
}
