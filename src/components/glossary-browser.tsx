"use client";

import { useMemo, useState, useTransition } from "react";
import { BookmarkPlus, Check, Search, X } from "lucide-react";
import type { GlossaryTerm } from "@/content/glossary";
import { addGlossaryCardAction } from "@/app/actions/glossary";

type Program = { slug: string; shortName: string };

function TermCard({ t, programNames }: { t: GlossaryTerm; programNames: Map<string, string> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <article className="card-hover flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5" id={`term-${t.term.replace(/\W+/g, "-").toLowerCase()}`}>
      <p className="eyebrow text-[0.55rem] text-gold-600">{t.category}</p>
      <h3 className="font-display mt-1 text-lg font-bold text-navy-950">{t.term}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{t.definition}</p>
      {t.formula && <p className="mt-3 rounded-lg bg-mint-50 px-3 py-2 font-mono text-xs text-navy-900">{t.formula}</p>}
      {t.related && t.related.length > 0 && <p className="mt-2 text-xs text-slate-500">See also: {t.related.join(", ")}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <span className="flex flex-wrap gap-1">
          {t.programs.slice(0, 4).map((p) => (
            <span key={p} className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-700">{programNames.get(p) ?? p}</span>
          ))}
        </span>
        <button
          type="button"
          disabled={pending || !!msg}
          onClick={() => start(async () => setMsg((await addGlossaryCardAction(t.term)).message))}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-navy-900 transition hover:border-gold-500 hover:text-gold-600 disabled:opacity-70"
          title="Add this term to your flashcards"
        >
          {msg ? <Check className="h-3.5 w-3.5 text-mint-600" aria-hidden /> : <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />}
          {msg ? "Added" : pending ? "Adding…" : "Flashcard"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-slate-500" role="status">{msg}</p>}
    </article>
  );
}

export function GlossaryBrowser({ terms, programs, defaultProgram }: { terms: GlossaryTerm[]; programs: Program[]; defaultProgram?: string }) {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState<string | undefined>(defaultProgram);
  const [category, setCategory] = useState<string | undefined>();
  const programNames = useMemo(() => new Map(programs.map((p) => [p.slug, p.shortName])), [programs]);
  const categories = useMemo(() => Array.from(new Set(terms.map((t) => t.category))).sort(), [terms]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return terms
      .filter((t) => (!program || t.programs.includes(program)) && (!category || t.category === category))
      .filter((t) => !s || t.term.toLowerCase().includes(s) || t.definition.toLowerCase().includes(s) || (t.formula ?? "").toLowerCase().includes(s))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [terms, q, program, category]);

  const letters = useMemo(() => Array.from(new Set(shown.map((t) => t.term[0].toUpperCase()))), [shown]);
  const byLetter = useMemo(() => {
    const m = new Map<string, GlossaryTerm[]>();
    for (const t of shown) {
      const l = t.term[0].toUpperCase();
      m.set(l, [...(m.get(l) ?? []), t]);
    }
    return m;
  }, [shown]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] transition ${active ? "bg-navy-950 text-white" : "border border-slate-300 text-navy-900 hover:border-navy-900"}`;

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-6 space-y-3 border-b border-slate-200 bg-[#f4f6f4]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${terms.length} terms, definitions and formulas…`}
            aria-label="Search the glossary"
            className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200"
          />
          {q && <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Clear search"><X className="h-4 w-4" aria-hidden /></button>}
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by exam">
          <button type="button" className={chip(!program)} onClick={() => setProgram(undefined)} aria-pressed={!program}>All exams</button>
          {programs.map((p) => (
            <button key={p.slug} type="button" className={chip(program === p.slug)} onClick={() => setProgram(p.slug)} aria-pressed={program === p.slug}>{p.shortName}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          <select value={category ?? ""} onChange={(e) => setCategory(e.target.value || undefined)} aria-label="Category" className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-navy-900">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <nav aria-label="Jump to letter" className="flex flex-wrap gap-1">
            {letters.map((l) => <a key={l} href={`#letter-${l}`} className="grid h-6 w-6 place-items-center rounded text-[11px] font-bold text-navy-700 hover:bg-gold-500 hover:text-white">{l}</a>)}
          </nav>
          <span className="ml-auto text-xs text-slate-500">{shown.length} term{shown.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No terms match. Try a different word or clear the filters.</p>
      ) : (
        <div className="space-y-8">
          {[...byLetter.entries()].map(([letter, list]) => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-48">
              <h2 className="font-display text-4xl font-black text-gold-500">{letter}</h2>
              <span className="rule-red mt-1" aria-hidden />
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((t) => <TermCard key={t.term} t={t} programNames={programNames} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
