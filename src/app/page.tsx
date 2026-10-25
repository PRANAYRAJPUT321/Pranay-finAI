import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, BookOpen, Bot, CalendarDays, CheckCircle2, FileDown, Layers, PlayCircle, ShieldCheck, Smartphone, Timer } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { CountUp, Reveal } from "@/components/motion";
import { HeroSlider, HeroVisual } from "@/components/hero-slider";
import { InstallAppButton } from "@/components/pwa";
import { prisma } from "@/server/db";
import { getExamGuide } from "@/server/catalog/guide";
import { daysUntil } from "@/server/catalog/exam-info";

export const dynamic = "force-dynamic";

const CYCLE = [
  { t: "Diagnostic", d: "A baseline across the whole syllabus." },
  { t: "Personal plan", d: "Day-by-day, built around your calendar." },
  { t: "Learn", d: "Lessons, videos and PDF notes at your level." },
  { t: "Practice", d: "Exam-style questions, full explanations." },
  { t: "Spaced revision", d: "Flashcards timed to your memory." },
  { t: "Mock exams", d: "Timed, sectioned simulations." },
  { t: "Analysis", d: "Topic mastery and error patterns." },
  { t: "Remediation", d: "Targeted fixes for weak spots." },
  { t: "Readiness", d: "An honest, evidence-based review." },
];

const FEATURES = [
  { icon: CalendarDays, title: "Adaptive study plans", body: "Built from your exam date, availability, topic weights and diagnostic — with workload warnings and one-click recovery from missed days." },
  { icon: PlayCircle, title: "Video explainers", body: "Short narrated, animated explainers generated from every lesson: intuition, formula, worked example, common trap, summary." },
  { icon: FileDown, title: "PDF study notes", body: "Download lessons, formula sheets, exam fact sheets and full topic packs to read offline or print." },
  { icon: CheckCircle2, title: "Verified answer keys", body: "Every numerical answer is recomputed by decimal-safe calculators before it is published. Never left to a language model." },
  { icon: Timer, title: "Mock exam simulator", body: "Section timers, closed sections, autosave and full reports — modelled on each exam's configured structure." },
  { icon: Layers, title: "Spaced repetition", body: "Formula, concept and mistake flashcards scheduled from your own honest recall ratings." },
  { icon: Bot, title: "AI tutor", body: "Teach Me, Test My Thinking and Find My Mistake — grounded in course material, with deterministic calculators." },
  { icon: BarChart3, title: "Transparent analytics", body: "Mastery separated from coverage, mock trends, error types and a readiness summary that states its limits." },
];

const FALLBACK_EXAMS = ["CFA", "FRM", "CAIA", "CPA", "ACCA", "CMA", "CA (India)", "EA", "NISM", "CFP"];

async function loadData() {
  try {
    const [programs, questions, lessons, formulas, guide] = await Promise.all([
      prisma.examProgram.findMany({ where: { isActive: true }, select: { slug: true, shortName: true }, orderBy: { name: "asc" } }),
      prisma.question.count({ where: { status: "PUBLISHED" } }),
      prisma.lesson.count({ where: { status: "PUBLISHED" } }),
      prisma.formula.count(),
      getExamGuide(),
    ]);
    const now = new Date();
    const upcoming = guide
      .flatMap((p) => p.levels.flatMap((l) => (l.info?.upcoming ?? []).map((u) => ({ program: p.shortName, slug: p.slug, level: l.name, label: u.label, dates: u.dates, days: daysUntil(u.start, now) }))))
      .filter((u): u is typeof u & { days: number } => u.days !== null)
      .sort((a, b) => a.days - b.days);
    // One entry per program so the strip shows variety.
    const seen = new Set<string>();
    const strip = upcoming.filter((u) => (seen.has(u.program) ? false : (seen.add(u.program), true))).slice(0, 8);
    return { programs, questions, lessons, formulas, strip };
  } catch {
    return null; // database not reachable: render the marketing page without live data
  }
}

export default async function LandingPage() {
  const data = await loadData();
  const exams = data?.programs.length ? data.programs : FALLBACK_EXAMS.map((s) => ({ slug: "", shortName: s }));
  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <PublicHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="bg-ink relative overflow-hidden text-white">
          <span className="red-beam left-[60%]" aria-hidden />
          <span className="red-beam left-[78%] opacity-50" style={{ animationDelay: "3s" }} aria-hidden />
          <span className="floor-glow" aria-hidden />
          <div className="bg-grid-dark absolute inset-0 opacity-50" aria-hidden />
          <div className="relative mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
            <HeroSlider />
            <div className="hidden lg:block"><HeroVisual /></div>
          </div>
          <div className="relative border-t border-white/10 bg-black/20 py-4">
            <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <div className="marquee gap-12 pr-12">
                {[...exams, ...exams].map((e, i) => (
                  <span key={`${e.shortName}-${i}`} className="font-display whitespace-nowrap text-xl font-bold uppercase tracking-wider text-white/70">
                    {e.shortName}<span className="ml-12 text-gold-500">◆</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming exam dates (researched facts, linked to the guide) */}
        {data && data.strip.length > 0 && (
          <section className="bg-white">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
              <Reveal className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-gold-600">Countdown / Upcoming windows</p>
                  <h2 className="headline-xl mt-3 text-4xl uppercase text-navy-950 sm:text-6xl">Next <span className="text-gold-500">Exams</span></h2>
                </div>
                <Link href="/exam-guide" className="pill-outline pill-outline-dark">All dates &amp; fees <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </Reveal>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.strip.map((u, i) => (
                  <Reveal key={`${u.program}-${u.label}`} delay={(i % 4) * 80}>
                    <Link href={`/exam-guide?program=${u.slug}`} className="card-hover group relative block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
                      <span className="absolute right-4 top-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                      <p className="font-display text-5xl font-black text-navy-950 transition-colors group-hover:text-gold-500"><CountUp value={u.days} /></p>
                      <p className="eyebrow mt-1 text-[0.55rem] text-slate-500">days to go</p>
                      <span className="rule-red mt-4" aria-hidden />
                      <p className="mt-3 font-semibold text-navy-950">{u.program} · {u.level}</p>
                      <p className="text-sm text-slate-600">{u.label}</p>
                      <p className="text-xs text-slate-500">{u.dates}</p>
                    </Link>
                  </Reveal>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">Dates are collected from official sources and can change — always confirm with the examining body.</p>
            </div>
          </section>
        )}

        {/* Live content counts */}
        {data && (
          <section className="bg-ink relative overflow-hidden text-white">
            <span className="red-beam left-[10%] opacity-40" aria-hidden />
            <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 md:grid-cols-4">
              {[
                ["Exam programs", data.programs.length],
                ["Original questions", data.questions],
                ["Structured lessons", data.lessons],
                ["Formulas with calculators", data.formulas],
              ].map(([l, v], i) => (
                <Reveal key={l as string} delay={i * 80} className="border-l border-white/15 pl-5">
                  <p className="font-display text-5xl font-black text-white"><CountUp value={v as number} /></p>
                  <p className="eyebrow mt-2 text-[0.6rem] text-mint-300">{l}</p>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Features */}
        <section className="relative overflow-hidden bg-[#f4f6f4]">
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <Reveal className="max-w-3xl">
              <p className="eyebrow text-gold-600">Everything in one workflow</p>
              <h2 className="headline-xl mt-3 text-4xl uppercase text-navy-950 sm:text-6xl">Study <span className="text-gold-500">Smarter</span><span className="block">Measure honestly</span></h2>
              <span className="rule-red mt-5" aria-hidden />
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-navy-950/10 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={(i % 4) * 90} className="h-full">
                  <div className="group h-full bg-white p-7 transition-colors duration-300 hover:bg-navy-950">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-full border border-navy-950/15 text-gold-500 transition group-hover:border-gold-500 group-hover:bg-gold-500 group-hover:text-white">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="font-display text-sm font-bold text-slate-300 group-hover:text-white/40">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="font-display mt-5 text-xl font-bold text-navy-950 group-hover:text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 group-hover:text-navy-100">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* App + notifications */}
        <section className="bg-ink relative overflow-hidden text-white">
          <span className="red-beam left-[70%]" aria-hidden />
          <span className="floor-glow" aria-hidden />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <Reveal>
              <p className="eyebrow text-mint-300">Phone · Tablet · Desktop</p>
              <h2 className="headline-xl mt-3 text-5xl uppercase sm:text-7xl"><span className="text-gold-500">Install</span><span className="block">the app</span></h2>
              <span className="rule-red mt-5" aria-hidden />
              <p className="mt-5 max-w-lg text-navy-100">Add PD FinPrep to your home screen for a full-screen app experience, offline access to recently opened pages and reminders for study sessions, exam countdowns and registration deadlines.</p>
              <InstallAppButton className="mt-8" />
            </Reveal>
            <Reveal delay={120} className="grid gap-4 sm:grid-cols-2">
              {[
                [Smartphone, "Works like an app", "Installs from the browser on Android, iPhone, Windows and macOS — no app store needed."],
                [BellRing, "Smart reminders", "Today's plan, due flashcards, exam countdown and registration deadlines."],
                [BookOpen, "Learn offline", "Download PDF notes and formula sheets for your commute."],
                [ShieldCheck, "Built with integrity", "Original questions only. Official past papers linked at the source."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Smartphone;
                return (
                  <div key={t as string} className="glass-dark tilt-hover rounded-2xl p-5">
                    <I className="h-5 w-5 text-gold-500" aria-hidden />
                    <p className="font-display mt-3 text-lg font-bold">{t as string}</p>
                    <p className="mt-1 text-sm text-navy-100">{d as string}</p>
                  </div>
                );
              })}
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <Reveal>
              <p className="eyebrow text-gold-600">How it works</p>
              <h2 className="headline-xl mt-3 text-4xl uppercase text-navy-950 sm:text-6xl">The <span className="text-gold-500">Cycle</span></h2>
            </Reveal>
            <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {CYCLE.map((c, i) => (
                <Reveal as="li" key={c.t} delay={(i % 3) * 100}>
                  <div className="group flex gap-5">
                    <span className="font-display text-5xl font-black leading-none text-slate-200 transition-colors group-hover:text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                    <div className="border-t border-navy-950/15 pt-3">
                      <p className="font-display text-xl font-bold text-navy-950">{c.t}</p>
                      <p className="text-sm text-slate-600">{c.d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-ink relative overflow-hidden">
          <span className="red-beam left-[45%]" aria-hidden />
          <span className="floor-glow" aria-hidden />
          <Reveal className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
            <p className="eyebrow text-mint-300">Free diagnostic</p>
            <h2 className="headline-xl mt-4 text-5xl uppercase text-white sm:text-7xl">Start <span className="text-gold-500">Today</span></h2>
            <p className="mx-auto mt-5 max-w-xl text-navy-100">Choose your exam, tell us your schedule and get a personalised plan in minutes. No payment details. We never promise a pass — we show you the evidence.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gold-500 px-7 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white shadow-xl shadow-gold-500/30 transition hover:-translate-y-0.5 hover:bg-gold-600">Create free account <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/catalog" className="pill-outline">See supported exams</Link>
            </div>
          </Reveal>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
