import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, Bot, CalendarDays, CheckCircle2, Layers, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { CountUp, Reveal } from "@/components/motion";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

const CYCLE = [
  { t: "Diagnostic", d: "A baseline across the whole syllabus." },
  { t: "Personal plan", d: "Day-by-day, built around your calendar." },
  { t: "Learn", d: "Structured lessons at your level." },
  { t: "Practice", d: "Exam-style questions, full explanations." },
  { t: "Spaced revision", d: "Flashcards timed to your memory." },
  { t: "Mock exams", d: "Timed, sectioned simulations." },
  { t: "Analysis", d: "Topic mastery and error patterns." },
  { t: "Remediation", d: "Targeted fixes for weak spots." },
  { t: "Readiness", d: "An honest, evidence-based review." },
];

const FEATURES = [
  { icon: CalendarDays, title: "Adaptive study plans", body: "Built from your exam date, availability, topic weights and diagnostic — with honest workload warnings and one-click recovery from missed days." },
  { icon: BookOpen, title: "Structured lessons", body: "Objectives, intuition, formal definitions, worked examples, traps and knowledge checks — in beginner, intermediate and advanced modes." },
  { icon: CheckCircle2, title: "Verified answer keys", body: "Every numerical answer is recomputed by decimal-safe calculators before it is published. Never left to a language model." },
  { icon: Timer, title: "Mock exam simulator", body: "Section timers, closed sections, autosave and full reports — modelled on each exam's configured structure." },
  { icon: Layers, title: "Spaced repetition", body: "Formula, concept and mistake flashcards scheduled from your own honest recall ratings." },
  { icon: Bot, title: "AI tutor", body: "Teach Me, Test My Thinking and Find My Mistake — grounded in course material, with deterministic calculators." },
  { icon: BarChart3, title: "Transparent analytics", body: "Mastery separated from coverage, mock trends, error types and a readiness summary that states its limits." },
  { icon: ShieldCheck, title: "Built with integrity", body: "Original questions only. Official past papers are linked at the source. No guaranteed-pass promises." },
];

const FALLBACK_EXAMS = ["CFA", "FRM", "CAIA", "CPA", "ACCA", "CMA", "CA (India)", "EA", "NISM", "CFP", "CTA"];

async function loadStats() {
  try {
    const [programs, questions, lessons, formulas] = await Promise.all([
      prisma.examProgram.findMany({ where: { isActive: true }, select: { slug: true, shortName: true }, orderBy: { name: "asc" } }),
      prisma.question.count({ where: { status: "PUBLISHED" } }),
      prisma.lesson.count({ where: { status: "PUBLISHED" } }),
      prisma.formula.count(),
    ]);
    return { programs, questions, lessons, formulas };
  } catch {
    return null; // database not reachable: render the marketing page without live counts
  }
}

export default async function LandingPage() {
  const stats = await loadStats();
  const exams = stats?.programs.length ? stats.programs : FALLBACK_EXAMS.map((s) => ({ slug: "", shortName: s }));
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-navy relative overflow-hidden text-white">
          <div className="aurora" aria-hidden />
          <div className="bg-grid-dark absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
            <div>
              <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-white/5 px-3 py-1 text-xs font-medium text-gold-200 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-gold-400" aria-hidden /> Finance, accounting, tax &amp; risk certifications
              </p>
              <h1 className="animate-fade-up mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl" style={{ "--delay": "80ms" } as React.CSSProperties}>
                Your exam. Your plan. <span className="text-gradient-gold">Your evidence.</span>
              </h1>
              <p className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-navy-100" style={{ "--delay": "160ms" } as React.CSSProperties}>
                PD FinPrep is a study coach that turns your syllabus, schedule and practice results into exactly what to do next — for CFA, FRM, CPA, ACCA, CMA, CA, EA, NISM, CFP and more.
              </p>
              <div className="animate-fade-up mt-9 flex flex-wrap gap-3" style={{ "--delay": "240ms" } as React.CSSProperties}>
                <Link href="/register" className="btn-shine bg-gradient-gold group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-navy-950 shadow-xl shadow-gold-500/30 transition hover:-translate-y-0.5 hover:shadow-gold-500/50">
                  Start free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link href="/catalog" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-white/10">
                  Browse exams
                </Link>
              </div>
              <p className="animate-fade-up mt-5 text-xs text-navy-300" style={{ "--delay": "320ms" } as React.CSSProperties}>No payment details. We never promise a pass — we show you the evidence.</p>
            </div>

            {/* Illustrative product preview (static UI, not real user data) */}
            <div className="animate-fade-up relative" style={{ "--delay": "200ms" } as React.CSSProperties} aria-hidden>
              <div className="float glass-dark relative rounded-3xl p-5 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Today&apos;s plan</p>
                  <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300">Illustrative preview</span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {[
                    ["Learn", "Bond valuation & yield", "45 min", "from-navy-400 to-navy-600"],
                    ["Practice", "Fixed income — 12 questions", "30 min", "from-sky-400 to-sky-600"],
                    ["Revise", "Due flashcards · duration", "15 min", "from-gold-300 to-gold-600"],
                  ].map(([k, t, m, g]) => (
                    <li key={t} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${g} text-[10px] font-bold`}>{k.slice(0, 2).toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm text-white">{t}</span><span className="text-xs text-navy-300">{k} · {m}</span></span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[["Coverage", 62], ["Accuracy", 74], ["Retention", 81]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-[10px] uppercase tracking-wider text-navy-300">{l}</p>
                      <p className="mt-1 text-lg font-bold text-white">{v}%</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="bar-fill h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500" style={{ width: `${v}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="float glass-dark absolute -bottom-20 -left-8 hidden w-56 rounded-2xl p-4 shadow-xl sm:block" style={{ animationDelay: "1.5s" }}>
                <p className="text-[11px] font-semibold text-gold-300">✓ Answer key verified</p>
                <p className="mt-1 text-xs text-navy-100">Price = 965.35 — recomputed by the bond calculator before publishing.</p>
              </div>
            </div>
          </div>

          {/* Exam marquee */}
          <div className="relative border-t border-white/10 bg-white/[0.03] py-4">
            <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <div className="marquee gap-10 pr-10">
                {[...exams, ...exams].map((e, i) => (
                  <span key={`${e.shortName}-${i}`} className="whitespace-nowrap text-sm font-semibold tracking-wide text-navy-200/80">{e.shortName}<span className="ml-10 text-gold-500/60">◆</span></span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live content counts (real data from the catalog) */}
        {stats && (
          <section className="relative -mt-px bg-white">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 md:grid-cols-4">
              {[
                ["Exam programs", stats.programs.length],
                ["Original questions", stats.questions],
                ["Structured lessons", stats.lessons],
                ["Formulas with calculators", stats.formulas],
              ].map(([l, v], i) => (
                <Reveal key={l as string} delay={i * 80}>
                  <p className="text-gradient-navy text-4xl font-black"><CountUp value={v as number} /></p>
                  <p className="mt-1 text-sm text-slate-500">{l}</p>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Features */}
        <section className="relative overflow-hidden bg-slate-50">
          <div className="aurora aurora-light opacity-70" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-gold-600">Everything in one workflow</p>
              <h2 className="text-gradient-navy mt-2 text-3xl font-bold sm:text-4xl">Study smarter, measure honestly</h2>
              <p className="mt-4 text-slate-600">Each part feeds the next, so your plan keeps adapting to real evidence instead of guesswork.</p>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={(i % 4) * 90}>
                  <div className="card-hover group h-full rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-navy-800 to-navy-950 text-gold-400 shadow-lg shadow-navy-900/20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-gold-600">How it works</p>
              <h2 className="text-gradient-navy mt-2 text-3xl font-bold sm:text-4xl">A complete preparation cycle</h2>
            </Reveal>
            <ol className="relative mt-12 grid gap-4 sm:grid-cols-3">
              {CYCLE.map((c, i) => (
                <Reveal as="li" key={c.t} delay={(i % 3) * 100}>
                  <div className="card-hover group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5">
                    <span className="absolute -right-3 -top-5 text-7xl font-black text-navy-900/5 transition-colors group-hover:text-gold-500/15">{i + 1}</span>
                    <span className="bg-gradient-gold grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30">{i + 1}</span>
                    <p className="mt-3 font-semibold text-navy-900">{c.t}</p>
                    <p className="text-sm text-slate-600">{c.d}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-navy relative overflow-hidden">
          <div className="aurora" aria-hidden />
          <Reveal className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Start with a free diagnostic today</h2>
            <p className="mx-auto mt-4 max-w-xl text-navy-100">Choose your exam, tell us your schedule, and get a personalised plan in minutes.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-shine bg-gradient-gold pulse-ring inline-flex items-center gap-2 rounded-xl px-7 py-3 font-semibold text-navy-950 shadow-xl shadow-gold-500/30 transition hover:-translate-y-0.5">Create free account <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/catalog" className="inline-flex items-center rounded-xl border border-white/20 px-7 py-3 font-semibold text-white transition hover:bg-white/10">See supported exams</Link>
            </div>
          </Reveal>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
