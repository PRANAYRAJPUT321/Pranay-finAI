"use client";

import { useMemo, useState } from "react";
import { BookOpen, Database, ExternalLink, GraduationCap, Landmark, Scale, Search, Users, Wrench } from "lucide-react";
import clsx from "clsx";
import type { Resource, ResourceKind } from "@/content/resources";

const KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  "Open textbook": BookOpen,
  "University course": GraduationCap,
  "Official exam resource": Landmark,
  "Standards & rules": Scale,
  "Data & research": Database,
  Tool: Wrench,
  "Investor education": Users,
};

const KIND_TINT: Record<ResourceKind, string> = {
  "Open textbook": "from-gold-500 to-fuchsia-500",
  "University course": "from-mint-500 to-gold-500",
  "Official exam resource": "from-amber-400 to-orange-500",
  "Standards & rules": "from-sky-400 to-gold-600",
  "Data & research": "from-emerald-400 to-mint-500",
  Tool: "from-fuchsia-500 to-rose-500",
  "Investor education": "from-teal-400 to-sky-500",
};

export function ResourceHub({ resources, programs, defaultProgram, checked }: { resources: Resource[]; programs: { slug: string; shortName: string }[]; defaultProgram?: string; checked: string }) {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState<string | undefined>(defaultProgram);
  const [kind, setKind] = useState<ResourceKind | undefined>();
  const kinds = useMemo(() => Array.from(new Set(resources.map((r) => r.kind))), [resources]);
  const names = useMemo(() => new Map(programs.map((p) => [p.slug, p.shortName])), [programs]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return resources.filter(
      (r) =>
        (!program || r.programs.includes(program)) &&
        (!kind || r.kind === kind) &&
        (!s || [r.title, r.provider, r.description, ...r.topics].some((x) => x.toLowerCase().includes(s))),
    );
  }, [resources, q, program, kind]);
  const chip = (active: boolean) => clsx("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition", active ? "bg-gradient-to-r from-gold-600 to-mint-600 text-white" : "border border-white/15 text-slate-600 hover:border-white/40 hover:text-navy-900");

  return (
    <div>
      <div className="surface mb-6 space-y-3 p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search textbooks, courses, standards, topics (e.g. duration, IFRS 16, SIP)…" aria-label="Search resources" className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-navy-900 placeholder:text-slate-400 focus:border-gold-400 focus:outline-none" />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by exam">
          <button type="button" className={chip(!program)} onClick={() => setProgram(undefined)} aria-pressed={!program}>All exams</button>
          {programs.map((p) => <button key={p.slug} type="button" className={chip(program === p.slug)} onClick={() => setProgram(p.slug)} aria-pressed={program === p.slug}>{p.shortName}</button>)}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          <button type="button" className={chip(!kind)} onClick={() => setKind(undefined)} aria-pressed={!kind}>All types</button>
          {kinds.map((k) => <button key={k} type="button" className={chip(kind === k)} onClick={() => setKind(k)} aria-pressed={kind === k}>{k}</button>)}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Nothing matches yet — try another word or clear the filters.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => {
            const Icon = KIND_ICON[r.kind];
            return (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="surface spotlight card-hover group flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition duration-500 group-hover:rotate-6 group-hover:scale-110", KIND_TINT[r.kind])}><Icon className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{r.kind} · {r.level}</p>
                    <p className="font-display mt-0.5 text-base font-bold leading-snug text-navy-950">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.provider}</p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{r.description}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-300 ring-1 ring-green-400/25">{r.cost}</span>
                    {r.programs.slice(0, 3).map((p) => <span key={p} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{names.get(p) ?? p}</span>)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-mint-300">Open <ExternalLink className="h-3 w-3" aria-hidden /></span>
                </div>
              </a>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-slate-500">Links checked {checked}. Materials stay with their owners and are subject to their licences and terms; PD FinPrep is not affiliated with these providers. Prices and access rules can change — check each site.</p>
    </div>
  );
}
