import Link from "next/link";
import { ArrowRight, BellRing, BookOpen, Bot, Box, CalendarDays, CheckCircle2, Clapperboard, Globe2, Headphones, Orbit, PlayCircle, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { CountUp, Reveal } from "@/components/motion";
import { Hero3D } from "@/components/three";
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
  { icon: Clapperboard, title: "Your daily briefing film", body: "Every morning a short, narrated film made from your own plan, progress and countdown — with a generated soundtrack.", span: "lg:col-span-2", tint: "from-fuchsia-500 to-gold-600" },
  { icon: Orbit, title: "Concept Galaxy", body: "Your syllabus as a 3D solar system: planet size is exam weight, colour is your mastery.", span: "", tint: "from-mint-500 to-gold-600" },
  { icon: Box, title: "3D formula labs", body: "Rotate living surfaces for bond prices, compounding and diversification — read exact values anywhere.", span: "", tint: "from-sky-400 to-gold-600" },
  { icon: PlayCircle, title: "AI video lessons with Nova", body: "Animated, narrated explainers with word-by-word captions and checkpoint questions that wait for your answer.", span: "lg:col-span-2", tint: "from-gold-500 to-mint-500" },
  { icon: Headphones, title: "Hands-free voice drill", body: "Nova reads questions aloud and listens for “A”, “B” or “C”. Revise on a walk.", span: "", tint: "from-emerald-400 to-mint-500" },
  { icon: Globe2, title: "Best of the web", body: "Free MIT and Yale courses, open textbooks, official exam resources and live data — curated and checked.", span: "", tint: "from-amber-400 to-fuchsia-500" },
  { icon: CalendarDays, title: "Adaptive study plan", body: "Built from your exam date, availability, topic weights and diagnostic, with honest workload warnings.", span: "", tint: "from-gold-500 to-sky-400" },
  { icon: CheckCircle2, title: "Verified answer keys", body: "Every numerical answer is recomputed by decimal-safe calculators before it is published.", span: "", tint: "from-emerald-400 to-gold-500" },
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
          <div className="bg-grid-dark absolute inset-0 opacity-50" aria-hidden />
          <Hero3D className="absolute inset-0 opacity-60 lg:left-[38%] lg:opacity-100" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#06071a] from-20% via-[#06071a]/80 via-45% to-transparent to-75%" />
          <div className="relative mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-16">
            <div>
              <p className="eyebrow animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.62rem] text-mint-200 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-mint-300" aria-hidden /> Exam prep, from the future
              </p>
              <h1 className="headline-xl animate-fade-up mt-6 text-[clamp(2.6rem,6.2vw,4.9rem)]" style={{ "--delay": "80ms" } as React.CSSProperties}>
                Master finance exams in a <span className="text-gradient-brand">whole new dimension.</span>
              </h1>
              <p className="animate-fade-up mt-6 max-w-xl text-base leading-relaxed text-navy-100 sm:text-lg" style={{ "--delay": "160ms" } as React.CSSProperties}>
                A personal AI study coach for CFA, FRM, CPA, ACCA, CMA, CA, EA, NISM, CFP and CAIA — with a daily briefing film made for you, 3D concept maps, narrated video lessons and a plan that adapts to every answer.
              </p>
              <div className="animate-fade-up mt-9 flex flex-wrap items-center gap-4" style={{ "--delay": "240ms" } as React.CSSProperties}>
                <Link href="/register" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_-12px_rgba(139,92,246,0.9)] transition hover:-translate-y-0.5">
                  Start free <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/exam-guide" className="pill-outline">Exam dates &amp; fees</Link>
              </div>
              <p className="animate-fade-up mt-5 text-xs text-navy-200" style={{ "--delay": "320ms" } as React.CSSProperties}>Free to start · no payment details · we never promise a pass — we show you the evidence.</p>
            </div>
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
                  <h2 className="headline-xl mt-3 text-4xl text-navy-950 sm:text-6xl">Next <span className="text-gradient-brand">exams</span></h2>
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
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <Reveal className="max-w-3xl">
              <p className="eyebrow text-fuchsia-300">Things no other prep platform does</p>
              <h2 className="headline-xl mt-3 text-4xl text-navy-950 sm:text-6xl">Study <span className="text-gradient-brand">smarter.</span><span className="block">Measure honestly.</span></h2>
              <span className="rule-red mt-5" aria-hidden />
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body, span, tint }, i) => (
                <Reveal key={title} delay={(i % 4) * 90} className={`h-full ${span}`}>
                  <div className="surface spotlight tilt-hover group h-full p-7">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tint} text-white shadow-lg transition duration-500 group-hover:rotate-6 group-hover:scale-110`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="font-display mt-5 text-xl font-bold text-navy-950">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
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
              <h2 className="headline-xl mt-3 text-5xl sm:text-7xl"><span className="text-gradient-brand">Install</span><span className="block">the app</span></h2>
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
              <h2 className="headline-xl mt-3 text-4xl text-navy-950 sm:text-6xl">The <span className="text-gradient-brand">cycle</span></h2>
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
            <h2 className="headline-xl mt-4 text-5xl text-white sm:text-7xl">Start <span className="text-gradient-brand">today</span></h2>
            <p className="mx-auto mt-5 max-w-xl text-navy-100">Choose your exam, tell us your schedule and get a personalised plan in minutes. No payment details. We never promise a pass — we show you the evidence.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_-12px_rgba(139,92,246,0.9)] transition hover:-translate-y-0.5">Create free account <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/catalog" className="pill-outline">See supported exams</Link>
            </div>
          </Reveal>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
