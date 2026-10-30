"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, SkipForward, Target } from "lucide-react";
import clsx from "clsx";
import { logFocusSessionAction } from "@/app/actions/engagement";

const PRESETS = [
  { label: "Classic", focus: 25, rest: 5 },
  { label: "Deep work", focus: 50, rest: 10 },
  { label: "Sprint", focus: 15, rest: 3 },
];
const ACTIVITIES = [
  { value: "lesson", label: "Reading lessons" },
  { value: "practice", label: "Practice questions" },
  { value: "flashcards", label: "Flashcards" },
  { value: "mock", label: "Mock exam" },
  { value: "other", label: "Other study" },
];

/** Soft two-tone chime with the Web Audio API (no audio files needed). */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.25 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 0.65);
    });
  } catch {
    /* audio unavailable */
  }
}

function notify(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState === "hidden") {
    navigator.serviceWorker?.getRegistration().then((r) => {
      if (r) void r.showNotification(title, { body, icon: "/icons/icon-192.png" });
      else new Notification(title, { body });
    });
  }
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function FocusTimer({ todayMinutes }: { todayMinutes: number }) {
  const [preset, setPreset] = useState(0);
  const [mode, setMode] = useState<"focus" | "rest">("focus");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(PRESETS[0].focus * 60);
  const [activity, setActivity] = useState("practice");
  const [sessions, setSessions] = useState(0);
  const [logged, setLogged] = useState(todayMinutes);
  const [msg, setMsg] = useState<string | null>(null);
  const endsAt = useRef(0);
  const total = (mode === "focus" ? PRESETS[preset].focus : PRESETS[preset].rest) * 60;

  const complete = useCallback(async () => {
    setRunning(false);
    chime();
    if (mode === "focus") {
      const minutes = PRESETS[preset].focus;
      const res = await logFocusSessionAction(minutes, activity);
      if (res.ok) {
        setSessions((n) => n + 1);
        setLogged((m) => m + minutes);
        setMsg(`${minutes} minutes logged. Take a break.`);
      } else setMsg(res.error);
      notify("Focus session complete", `${minutes} minutes logged — time for a ${PRESETS[preset].rest}-minute break.`);
      setMode("rest");
      setLeft(PRESETS[preset].rest * 60);
    } else {
      notify("Break over", "Ready for the next focus session?");
      setMsg("Break over — start your next session when ready.");
      setMode("focus");
      setLeft(PRESETS[preset].focus * 60);
    }
  }, [mode, preset, activity]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        complete();
      }
    }, 250);
    return () => clearInterval(t);
  }, [running, complete]);

  useEffect(() => {
    document.title = running ? `${fmt(left)} · ${mode === "focus" ? "Focus" : "Break"} · PD FinPrep` : "Focus Timer · PD FinPrep";
  }, [left, running, mode]);

  const toggle = () => {
    if (running) setRunning(false);
    else {
      endsAt.current = Date.now() + left * 1000;
      setMsg(null);
      setRunning(true);
    }
  };
  const reset = () => {
    setRunning(false);
    setLeft(total);
  };
  const choose = (i: number) => {
    setPreset(i);
    setRunning(false);
    setMode("focus");
    setLeft(PRESETS[i].focus * 60);
  };
  const skip = () => {
    setRunning(false);
    const next = mode === "focus" ? "rest" : "focus";
    setMode(next);
    setLeft((next === "focus" ? PRESETS[preset].focus : PRESETS[preset].rest) * 60);
  };

  const R = 120;
  const C = 2 * Math.PI * R;
  const progress = 1 - left / total;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="bg-ink relative overflow-hidden rounded-3xl p-6 text-center text-white shadow-2xl shadow-black/30 sm:p-10">
        <span aria-hidden className={clsx("red-beam left-[65%]", mode === "rest" && "opacity-30")} />
        <span aria-hidden className="floor-glow" />
        <div className="relative flex flex-wrap justify-center gap-2" role="group" aria-label="Session length">
          {PRESETS.map((p, i) => (
            <button key={p.label} type="button" onClick={() => choose(i)} aria-pressed={preset === i} className={clsx("rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition", preset === i ? "bg-white text-navy-950" : "border border-white/25 text-white hover:border-white/60")}>
              {p.label} {p.focus}/{p.rest}
            </button>
          ))}
        </div>
        <div className="relative mx-auto mt-8 aspect-square w-full max-w-[300px]">
          <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="10" />
            <circle cx="140" cy="140" r={R} fill="none" stroke={mode === "focus" ? "#e3262e" : "#6cbfa3"} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} className="transition-[stroke-dashoffset] duration-300 ease-linear" />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <p className="eyebrow flex items-center justify-center gap-1.5 text-mint-300">{mode === "focus" ? <><Target className="h-3.5 w-3.5" aria-hidden /> Focus</> : <><Coffee className="h-3.5 w-3.5" aria-hidden /> Break</>}</p>
              <p className="font-display mt-2 text-6xl font-black tabular-nums" role="timer" aria-live="off">{fmt(left)}</p>
            </div>
          </div>
        </div>
        <div className="relative mt-8 flex items-center justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-full border border-white/25 p-3 hover:bg-white/10" aria-label="Reset timer"><RotateCcw className="h-5 w-5" aria-hidden /></button>
          <button type="button" onClick={toggle} className="btn-shine inline-flex items-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.25em] shadow-xl shadow-gold-500/40 transition hover:-translate-y-0.5">
            {running ? <><Pause className="h-5 w-5" aria-hidden /> Pause</> : <><Play className="h-5 w-5 fill-white" aria-hidden /> {left === total ? "Start" : "Resume"}</>}
          </button>
          <button type="button" onClick={skip} className="rounded-full border border-white/25 p-3 hover:bg-white/10" aria-label={mode === "focus" ? "Skip to break" : "Skip break"}><SkipForward className="h-5 w-5" aria-hidden /></button>
        </div>
        {msg && <p className="relative mt-5 text-sm text-navy-100" role="status">{msg}</p>}
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <label htmlFor="focus-activity" className="eyebrow text-[0.6rem] text-navy-700">What are you working on?</label>
          <select id="focus-activity" value={activity} onChange={(e) => setActivity(e.target.value)} disabled={running} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {ACTIVITIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">Completed focus sessions are logged as study time and count towards your streak and weekly target. Paused or skipped sessions are not logged.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center"><p className="font-display text-3xl font-black text-navy-950">{sessions}</p><p className="text-[10px] uppercase tracking-widest text-slate-500">sessions now</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center"><p className="font-display text-3xl font-black text-gold-500">{logged}</p><p className="text-[10px] uppercase tracking-widest text-slate-500">minutes today</p></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <p className="font-semibold text-navy-950">Tips for a good session</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Pick one task before you start.</li>
            <li>Silence your phone; keep this tab open.</li>
            <li>In breaks, stand up and look away from the screen.</li>
            <li>After four sessions, take a longer 15–30 minute break.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
