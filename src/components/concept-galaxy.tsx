"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { BookOpen, ClipboardCheck, Orbit, PlayCircle, X } from "lucide-react";
import { SceneGate } from "@/components/three/gate";
import { MASTERY_COLOR, type GalaxyTopic } from "@/components/three/galaxy-scene";

const GalaxyScene = dynamic(() => import("@/components/three/galaxy-scene"), { ssr: false });

const MASTERY_NAME: Record<string, string> = {
  NOT_STARTED: "Not started",
  INSUFFICIENT_EVIDENCE: "Not enough evidence",
  NEEDS_WORK: "Needs work",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  MASTERED: "Mastered",
};

export type GalaxyTopicLinks = GalaxyTopic & { lessonId: string | null; questions: number };

/** 3D map of the syllabus: topics are planets sized by exam weight and coloured by mastery. */
export function ConceptGalaxy({ topics, examLabel }: { topics: GalaxyTopicLinks[]; examLabel: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = useMemo(() => topics.find((t) => t.id === selected) ?? null, [topics, selected]);
  const names = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="bg-ink relative h-[62vh] min-h-[420px] overflow-hidden rounded-[1.75rem] ring-1 ring-white/10">
        <SceneGate
          className="absolute inset-0"
          allowReducedMotion
          fallback={
            <ul className="grid h-full content-center gap-2 overflow-y-auto p-6 sm:grid-cols-2">
              {topics.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setSelected(t.id)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white">
                    <span className="h-3 w-3 rounded-full" style={{ background: MASTERY_COLOR[t.mastery] }} /> {t.name}
                  </button>
                </li>
              ))}
            </ul>
          }
        >
          {() => <GalaxyScene topics={topics} examLabel={examLabel} selected={selected} onSelect={setSelected} />}
        </SceneGate>
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
          <Orbit className="h-3.5 w-3.5 text-mint-300" aria-hidden /> Drag to orbit · scroll to zoom · click a planet
        </div>
      </div>
      <aside className="space-y-4">
        {sel ? (
          <div className="surface relative p-5">
            <button type="button" onClick={() => setSelected(null)} className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 hover:bg-white/10" aria-label="Close details"><X className="h-4 w-4" aria-hidden /></button>
            <p className="eyebrow text-[0.6rem]" style={{ color: MASTERY_COLOR[sel.mastery] }}>{MASTERY_NAME[sel.mastery] ?? sel.mastery}</p>
            <h2 className="font-display mt-1 text-xl font-bold text-navy-950">{sel.name}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-white/5 p-2.5"><dt className="text-[10px] uppercase tracking-widest text-slate-500">Exam weight</dt><dd className="font-display text-lg font-bold text-navy-900">{sel.weight ? `${sel.weight}%` : "—"}</dd></div>
              <div className="rounded-xl bg-white/5 p-2.5"><dt className="text-[10px] uppercase tracking-widest text-slate-500">Estimate</dt><dd className="font-display text-lg font-bold text-navy-900">{sel.estimate === null ? "—" : `${Math.round(sel.estimate * 100)}%`}</dd></div>
            </dl>
            {sel.children.length > 0 && <p className="mt-3 text-xs text-slate-500">Moons (subtopics): {sel.children.map((c) => c.name).join(" · ")}</p>}
            {sel.prereqs.length > 0 && <p className="mt-2 text-xs text-slate-500">Built on: {sel.prereqs.map((p) => names.get(p)).filter(Boolean).join(", ")}</p>}
            <div className="mt-4 grid gap-2">
              {sel.lessonId && <Link href={`/learn/${sel.lessonId}`} className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-navy-900 ring-1 ring-white/10 hover:bg-white/10"><BookOpen className="h-4 w-4 text-gold-300" aria-hidden /> Open the lesson</Link>}
              {sel.lessonId && <Link href={`/videos/${sel.lessonId}`} className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-navy-900 ring-1 ring-white/10 hover:bg-white/10"><PlayCircle className="h-4 w-4 text-mint-300" aria-hidden /> Watch the explainer</Link>}
              <Link href={`/learn?topic=${sel.id}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-600 to-mint-600 px-3 py-2 text-sm font-semibold text-white"><ClipboardCheck className="h-4 w-4" aria-hidden /> Practise this topic ({sel.questions} questions)</Link>
            </div>
          </div>
        ) : (
          <div className="surface p-5 text-sm text-slate-600">
            <p className="font-display text-lg font-bold text-navy-950">Your syllabus as a solar system</p>
            <p className="mt-2">Each planet is a topic. Bigger planets carry more exam weight; colours show your mastery from practice. Dashed beams connect prerequisites. Moons are subtopics.</p>
          </div>
        )}
        <div className="surface p-4">
          <p className="eyebrow text-[0.6rem] text-slate-500">Legend</p>
          <ul className="mt-2 grid gap-1.5 text-xs text-slate-600">
            {Object.entries(MASTERY_NAME).map(([k, v]) => (
              <li key={k} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: MASTERY_COLOR[k], boxShadow: `0 0 8px ${MASTERY_COLOR[k]}` }} /> {v}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
