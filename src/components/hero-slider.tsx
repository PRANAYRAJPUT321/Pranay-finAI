"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Layers, PlayCircle, Timer } from "lucide-react";

const SLIDES = [
  {
    eyebrow: ["Same syllabus", "New perspectives"],
    top: "Prepared",
    bottom: "Differently",
    body: "A study coach that turns your syllabus, calendar and results into exactly what to do next — for CFA, FRM, CPA, ACCA, CMA, CA, EA, NISM, CFP and more.",
    cta: { href: "/register", label: "Explore" },
  },
  {
    eyebrow: ["Exam-style questions", "Verified answers"],
    top: "Practise",
    bottom: "Deliberately",
    body: "Original questions with full explanations, timed mocks modelled on each exam, and every numerical answer recomputed by deterministic calculators.",
    cta: { href: "/catalog", label: "See exams" },
  },
  {
    eyebrow: ["Videos · PDFs · Reminders", "On every device"],
    top: "Revise",
    bottom: "Anywhere",
    body: "Narrated video explainers, downloadable PDF notes, spaced-repetition flashcards and exam-date reminders — install it on your phone like an app.",
    cta: { href: "/exam-guide", label: "Dates & fees" },
  },
];

const DURATION = 7000;

/** Editorial hero carousel: huge red serif word over a white serif line, numbered slides. */
export function HeroSlider() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), DURATION);
    return () => clearTimeout(t);
  }, [i, paused]);
  const s = SLIDES[i];
  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div key={i} aria-live="polite">
        <p className="eyebrow slide-in flex items-center gap-3 text-mint-300">
          <span>{s.eyebrow[0]}</span><span aria-hidden className="h-px w-8 bg-gold-500" /><span className="text-white/80">{s.eyebrow[1]}</span>
        </p>
        <h1 className="headline-xl mt-6 uppercase">
          <span className="slide-in block text-[clamp(3.4rem,11vw,9.5rem)] text-gold-500 drop-shadow-[0_8px_40px_rgb(227_38_46/0.35)]" style={{ "--delay": "80ms" } as React.CSSProperties}>{s.top}</span>
          <span className="slide-in block text-[clamp(2rem,6vw,5rem)] text-white" style={{ "--delay": "180ms" } as React.CSSProperties}>{s.bottom}</span>
        </h1>
        <span aria-hidden className="rule-red slide-in mt-7" style={{ "--delay": "260ms" } as React.CSSProperties} />
        <p className="slide-in mt-6 max-w-xl text-base leading-relaxed text-navy-100 sm:text-lg" style={{ "--delay": "320ms" } as React.CSSProperties}>{s.body}</p>
        <div className="slide-in mt-9 flex flex-wrap items-center gap-4" style={{ "--delay": "400ms" } as React.CSSProperties}>
          <Link href={s.cta.href} className="pill-outline group">{s.cta.label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></Link>
          <Link href="/register" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white shadow-xl shadow-gold-500/30 transition hover:-translate-y-0.5 hover:bg-gold-600">Start free</Link>
        </div>
      </div>
      <div className="mt-14 flex items-center gap-6" role="tablist" aria-label="Slides">
        {SLIDES.map((sl, n) => (
          <button key={sl.top} type="button" role="tab" aria-selected={n === i} aria-label={`Slide ${n + 1}: ${sl.top} ${sl.bottom}`} onClick={() => setI(n)} className="group flex flex-col items-start gap-2">
            <span className={`font-display text-lg font-bold transition ${n === i ? "text-white" : "text-white/35 group-hover:text-white/70"}`}>{String(n + 1).padStart(2, "0")}</span>
            <span className="block h-0.5 w-14 overflow-hidden bg-white/15">
              {n === i && <span key={`${i}-${paused}`} className={`block h-full bg-gold-500 ${paused ? "" : "slide-progress"}`} style={{ "--dur": `${DURATION}ms` } as React.CSSProperties} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Illustrative product composition for the hero (static UI, no user data). */
export function HeroVisual() {
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[520px]">
      <div className="spin-slow absolute inset-0 rounded-full border border-dashed border-mint-300/25" />
      <div className="absolute inset-[12%] rounded-full border border-white/10" />
      <div className="absolute inset-[24%] rounded-full bg-mint-400/10 blur-2xl" />
      <div className="float tilt-hover glass-dark absolute left-[8%] top-[16%] w-[70%] rounded-3xl p-5 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-[0.55rem] text-mint-300">Today&apos;s plan</p>
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white/60">Preview</span>
        </div>
        <ul className="mt-4 space-y-2">
          {[[BookOpen, "Bond valuation", "45 min"], [CheckCircle2, "Fixed income · 12 Q", "30 min"], [Layers, "Due flashcards", "15 min"]].map(([Icon, t, m]) => {
            const I = Icon as typeof BookOpen;
            return (
              <li key={t as string} className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint-400/20 text-mint-200"><I className="h-4 w-4" /></span>
                <span className="flex-1 text-sm text-white">{t as string}</span>
                <span className="text-[11px] text-navy-200">{m as string}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="float glass-dark absolute bottom-[14%] right-[4%] w-[52%] rounded-2xl p-4 shadow-2xl shadow-black/50" style={{ animationDelay: "1.2s" }}>
        <div className="flex items-center gap-2 text-gold-500"><PlayCircle className="h-5 w-5" /><span className="eyebrow text-[0.55rem]">Video explainer</span></div>
        <p className="font-display mt-2 text-lg font-bold leading-tight text-white">Duration &amp; convexity</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="bar-fill h-full w-2/3 bg-gold-500" /></div>
      </div>
      <div className="float absolute bottom-[34%] left-[2%] rounded-2xl bg-gold-500 px-4 py-3 text-white shadow-xl shadow-gold-500/40" style={{ animationDelay: "2.2s" }}>
        <div className="flex items-center gap-2"><Timer className="h-4 w-4" /><span className="text-[10px] font-semibold uppercase tracking-widest">Mock exam</span></div>
        <p className="font-display text-2xl font-black">2:15:00</p>
      </div>
    </div>
  );
}
