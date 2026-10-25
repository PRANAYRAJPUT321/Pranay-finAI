"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, CaptionsOff, Check, ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import type { Scene } from "@/lib/video/script";

const RATES = [0.75, 1, 1.25, 1.5];

function SceneView({ scene, progress }: { scene: Scene; progress: number }) {
  // Lines appear progressively across the scene.
  const shown = scene.lines.length ? Math.min(scene.lines.length, Math.floor(progress * (scene.lines.length + 0.6)) + 1) : 0;
  const answerShown = progress > 0.8;
  switch (scene.kind) {
    case "title": {
      const words = scene.heading.split(" ");
      const cut = Math.max(1, Math.ceil(words.length / 2));
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h2 className="headline-xl mt-4 uppercase">
            <span className="slide-in block text-[clamp(1.8rem,7vw,5rem)] text-gold-500" style={{ "--delay": "150ms" } as React.CSSProperties}>{words.slice(0, cut).join(" ")}</span>
            {words.length > 1 && <span className="slide-in block text-[clamp(1.4rem,5vw,3.6rem)] text-white" style={{ "--delay": "350ms" } as React.CSSProperties}>{words.slice(cut).join(" ")}</span>}
          </h2>
          <span className="rule-red slide-in mt-5" style={{ "--delay": "500ms" } as React.CSSProperties} />
        </div>
      );
    }
    case "formula":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-xl font-bold text-white sm:text-3xl">{scene.heading}</h3>
          <div className="slide-in mt-5 rounded-2xl border border-mint-400/30 bg-mint-400/10 px-5 py-4 font-mono text-base text-white shadow-[0_0_60px_-10px_rgb(108_191_163/0.5)] sm:text-2xl" style={{ "--delay": "250ms" } as React.CSSProperties}>{scene.highlight}</div>
          <ul className="mt-5 grid gap-1.5 text-sm text-navy-100 sm:grid-cols-2 sm:text-base">
            {scene.lines.slice(0, shown).map((l) => <li key={l} className="slide-in"><span className="font-mono text-gold-500">{l.split(" — ")[0]}</span> — {l.split(" — ").slice(1).join(" — ")}</li>)}
          </ul>
        </div>
      );
    case "example":
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-xl font-bold text-white sm:text-3xl">{scene.heading}</h3>
          <ol className="mt-4 space-y-2">
            {scene.lines.slice(0, shown).map((l, i) => (
              <li key={l} className="slide-in flex gap-3 text-sm text-navy-50 sm:text-base">
                <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold-500 text-xs font-bold text-gold-500">{i + 1}</span>
                <span className="pt-0.5">{l}</span>
              </li>
            ))}
          </ol>
          {answerShown && scene.highlight && <p className="slide-in mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-gold-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-gold-500/40 sm:text-lg"><Check className="h-4 w-4" aria-hidden /> {scene.highlight}</p>}
        </div>
      );
    case "trap":
      return (
        <div className="flex h-full flex-col justify-center gap-4">
          <p className="eyebrow slide-in text-[0.6rem] text-gold-500 sm:text-xs">{scene.eyebrow}</p>
          <div className="slide-in flex items-start gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-4">
            <X className="mt-0.5 h-6 w-6 shrink-0 text-gold-500" aria-hidden />
            <p className="text-base text-white line-through decoration-gold-500/70 sm:text-xl">{scene.lines[0]}</p>
          </div>
          {progress > 0.4 && (
            <div className="slide-in flex items-start gap-3 rounded-2xl border border-mint-400/40 bg-mint-400/10 p-4">
              <Check className="mt-0.5 h-6 w-6 shrink-0 text-mint-300" aria-hidden />
              <p className="text-base text-white sm:text-xl">{scene.lines[1]}</p>
            </div>
          )}
        </div>
      );
    case "outro":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="headline-xl slide-in mt-3 text-[clamp(2rem,7vw,4.5rem)] uppercase text-white">Now <span className="text-gold-500">practise</span></h3>
          <span className="rule-red slide-in mt-5" />
        </div>
      );
    default:
      return (
        <div className="flex h-full flex-col justify-center">
          <p className="eyebrow slide-in text-[0.6rem] text-mint-300 sm:text-xs">{scene.eyebrow}</p>
          <h3 className="font-display slide-in mt-2 text-2xl font-black uppercase text-white sm:text-4xl">{scene.heading}</h3>
          <span className="rule-red slide-in mt-3" />
          <ul className={`mt-5 space-y-3 ${scene.kind === "intuition" ? "font-display text-lg leading-snug text-white sm:text-2xl" : "text-sm text-navy-50 sm:text-lg"}`}>
            {scene.lines.slice(0, shown).map((l, i) => (
              <li key={l} className="slide-in flex gap-3">
                {scene.kind !== "intuition" && <span className="font-display text-gold-500">{scene.kind === "summary" ? "✓" : String(i + 1).padStart(2, "0")}</span>}
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

/**
 * Plays a generated explainer: animated scenes with narration from the
 * browser's speech synthesis (falls back to timed captions when muted or unsupported).
 */
export function VideoPlayer({ scenes, title, lessonHref, quizSlot }: { scenes: Scene[]; title: string; lessonHref: string; quizSlot?: React.ReactNode }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [rate, setRate] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [sentence, setSentence] = useState(0);
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const scene = scenes[idx];
  const duration = scene.seconds / rate;

  const next = useCallback(() => {
    setElapsed(0);
    setSentence(0);
    setIdx((i) => {
      if (i + 1 >= scenes.length) {
        setPlaying(false);
        setFinished(true);
        return i;
      }
      return i + 1;
    });
  }, [scenes.length]);

  const go = (i: number) => {
    setFinished(false);
    setElapsed(0);
    setSentence(0);
    setIdx(Math.max(0, Math.min(scenes.length - 1, i)));
  };

  // Narration / timing for the current scene.
  useEffect(() => {
    if (!playing) return;
    const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    const start = performance.now();
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let fellBack = false;
    const tick = () => {
      const s = (performance.now() - start) / 1000;
      setElapsed(s);
      if (!synth || muted || fellBack) setSentence(Math.min(scene.narration.length - 1, Math.floor((s / duration) * scene.narration.length)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if (synth && !muted) {
      synth.cancel();
      const voices = synth.getVoices();
      const voice = voices.find((v) => /en-(GB|IN|US)/i.test(v.lang) && /natural|google|neural|premium/i.test(v.name)) ?? voices.find((v) => v.lang?.startsWith("en"));
      scene.narration.forEach((text, i) => {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = rate;
        if (voice) u.voice = voice;
        u.onstart = () => !cancelled && !fellBack && setSentence(i);
        // Some devices finish (or skip) speech instantly; keep each scene on screen for most of its estimated time.
        if (i === scene.narration.length - 1)
          u.onend = () => {
            if (cancelled || fellBack) return;
            const spent = (performance.now() - start) / 1000;
            timer = setTimeout(next, Math.max(600, (duration * 0.75 - spent) * 1000));
          };
        u.onerror = (e) => {
          if (cancelled || fellBack || e.error === "interrupted" || e.error === "canceled") return;
          // Speech unavailable on this device: finish the scene on a timer with captions instead.
          fellBack = true;
          synth.cancel();
          if (timer) clearTimeout(timer);
          const spent = (performance.now() - start) / 1000;
          timer = setTimeout(next, Math.max(600, (duration - spent) * 1000));
        };
        synth.speak(u);
      });
    } else {
      timer = setTimeout(next, duration * 1000);
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      synth?.cancel();
    };
  }, [playing, idx, muted, rate, scene, duration, next]);

  useEffect(() => () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggle = () => {
    if (finished) {
      go(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") go(idx + 1);
    else if (e.key === "ArrowLeft") go(idx - 1);
    else if (e.key === "m") setMuted((m) => !m);
    else if (e.key === "c") setCaptions((c) => !c);
  };

  const progress = Math.min(0.999, elapsed / duration);
  const caption = scene.narration[sentence] ?? "";

  return (
    <div className="space-y-4">
      <div
        ref={stage}
        tabIndex={0}
        onKeyDown={onKey}
        role="region"
        aria-label={`Video explainer: ${title}`}
        className="bg-ink group relative aspect-video w-full overflow-hidden rounded-3xl text-white shadow-2xl shadow-black/30 outline-none ring-gold-500 focus-visible:ring-2 [&:fullscreen]:rounded-none"
      >
        <span aria-hidden className="red-beam left-[70%]" />
        <span aria-hidden className="floor-glow" />
        <div aria-hidden className="bg-grid-dark absolute inset-0 opacity-50" />
        <div className="absolute left-4 top-3 z-10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60 sm:left-6 sm:top-5">
          <span className="font-display text-sm text-white">{String(idx + 1).padStart(2, "0")}</span>/ {String(scenes.length).padStart(2, "0")}
        </div>
        <div className="absolute right-4 top-3 z-10 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50 sm:right-6 sm:top-5">PD FinPrep</div>

        <div key={`${idx}-${finished}`} className="relative h-full px-6 py-12 sm:px-14 sm:py-16">
          {finished ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="eyebrow text-mint-300">Explainer complete</p>
              <h3 className="headline-xl text-4xl uppercase sm:text-6xl"><span className="text-gold-500">Well</span> done</h3>
              <div className="on-dark flex flex-wrap justify-center gap-3">
                <button type="button" onClick={toggle} className="pill-outline"><RotateCcw className="h-4 w-4" aria-hidden /> Replay</button>
                <Link href={lessonHref} className="pill-outline">Read the lesson</Link>
                {quizSlot}
              </div>
            </div>
          ) : (
            <SceneView scene={scene} progress={playing ? progress : idx === 0 && elapsed === 0 ? 1 : progress} />
          )}
        </div>

        {!playing && !finished && (
          <button type="button" onClick={toggle} className="absolute inset-0 z-20 grid place-items-center bg-black/30 transition hover:bg-black/20" aria-label="Play explainer">
            <span className="pulse-ring grid h-20 w-20 place-items-center rounded-full bg-gold-500 shadow-2xl shadow-gold-500/50 transition group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-white text-white" aria-hidden />
            </span>
          </button>
        )}

        {captions && playing && caption && (
          <p className="absolute inset-x-4 bottom-16 z-10 mx-auto max-w-3xl rounded-lg bg-black/70 px-3 py-1.5 text-center text-xs text-white sm:bottom-20 sm:text-base" aria-live="off">{caption}</p>
        )}

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 sm:px-5">
          <div className="mb-2 flex gap-1" aria-hidden>
            {scenes.map((s, i) => (
              <button key={i} type="button" tabIndex={-1} onClick={() => go(i)} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20" title={s.heading}>
                <span className="block h-full bg-gold-500" style={{ width: i < idx || finished ? "100%" : i === idx ? `${progress * 100}%` : "0%" }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-white sm:gap-2">
            <button type="button" onClick={() => go(idx - 1)} className="rounded-full p-2 hover:bg-white/15" aria-label="Previous scene"><ChevronLeft className="h-5 w-5" aria-hidden /></button>
            <button type="button" onClick={toggle} className="rounded-full p-2 hover:bg-white/15" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => go(idx + 1)} className="rounded-full p-2 hover:bg-white/15" aria-label="Next scene"><ChevronRight className="h-5 w-5" aria-hidden /></button>
            <span className="ml-1 hidden truncate text-xs text-white/70 sm:inline">{scene.heading}</span>
            <span className="flex-1" />
            <button type="button" onClick={() => setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length])} className="rounded-full px-2 py-1 text-xs font-semibold hover:bg-white/15" aria-label={`Speed ${rate}×`}>{rate}×</button>
            <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-full p-2 hover:bg-white/15" aria-label={muted ? "Unmute narration" : "Mute narration"}>{muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}</button>
            <button type="button" onClick={() => setCaptions((c) => !c)} className="rounded-full p-2 hover:bg-white/15" aria-label={captions ? "Hide captions" : "Show captions"}>{captions ? <Captions className="h-5 w-5" aria-hidden /> : <CaptionsOff className="h-5 w-5" aria-hidden />}</button>
            <button
              type="button"
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())}
              className="rounded-full p-2 hover:bg-white/15"
              aria-label={full ? "Exit full screen" : "Full screen"}
            >
              {full ? <Minimize className="h-5 w-5" aria-hidden /> : <Maximize className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chapters">
        {scenes.map((s, i) => (
          <li key={i}>
            <button type="button" onClick={() => { go(i); setPlaying(true); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${i === idx && !finished ? "border-gold-500 bg-gold-50" : "border-slate-200 bg-white hover:border-navy-300"}`}>
              <span className="font-display text-lg font-black text-gold-500">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium text-navy-950">{s.heading}</span><span className="text-xs text-slate-500">{s.eyebrow} · {s.seconds}s</span></span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
