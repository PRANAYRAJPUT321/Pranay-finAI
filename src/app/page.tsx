import Link from "next/link";
import { BarChart3, BookOpen, Bot, CalendarDays, CheckCircle2, ShieldCheck, Timer, Layers } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { LinkButton } from "@/components/ui";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

const CYCLE = ["Diagnostic", "Personal plan", "Learn", "Practice", "Spaced revision", "Mock exams", "Analysis", "Remediation", "Readiness review"];

const FEATURES = [
  { icon: CalendarDays, title: "Adaptive study plans", body: "Day-by-day schedules built from your exam date, availability, topic weights and diagnostic results — with honest workload warnings and missed-session recovery." },
  { icon: BookOpen, title: "Structured lessons", body: "Objectives, plain-language and technical explanations at three levels, worked examples, misconceptions and knowledge checks." },
  { icon: CheckCircle2, title: "Verified answer keys", body: "Every numerical answer is re-computed by deterministic, decimal-safe calculators before publication — never left to a language model." },
  { icon: Timer, title: "Mock exam simulator", body: "Section timing, navigation rules and autosave modelled on each exam's configured structure, clearly labelled as unofficial practice." },
  { icon: Layers, title: "Spaced repetition", body: "Formula, concept and mistake flashcards scheduled from your own recall ratings." },
  { icon: Bot, title: "AI tutor", body: "Teach Me, Test My Thinking and Find My Mistake modes, grounded in course material and using validated calculation tools." },
  { icon: BarChart3, title: "Transparent analytics", body: "Topic mastery separated from syllabus coverage, mock trends, error patterns and a readiness summary that states its limits." },
  { icon: ShieldCheck, title: "Built with integrity", body: "Original questions only. Official past papers are linked at the source, never copied. No guaranteed-pass claims." },
];

export default async function LandingPage() {
  const programs = await prisma.examProgram.findMany({ where: { isActive: true }, select: { slug: true, shortName: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main id="main" className="flex-1">
        <section className="bg-navy-950 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-gold-400">Finance certification preparation</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">A study coach that shows you exactly what to do next.</h1>
              <p className="mt-5 max-w-xl text-lg text-navy-100">
                PD FinPrep turns your exam syllabus, schedule and practice evidence into a personalised plan — for CFA, FRM, CPA, ACCA, CMA, CA, EA, NISM, CFP and more.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/register" variant="gold" size="lg">Start free</LinkButton>
                <LinkButton href="/catalog" variant="secondary" size="lg">Browse exams</LinkButton>
              </div>
              <p className="mt-4 text-xs text-navy-300">No payment details required. We never promise a pass — we show you the evidence.</p>
            </div>
            <div className="rounded-2xl border border-navy-800 bg-navy-900 p-6">
              <p className="text-sm font-medium text-gold-400">Your preparation cycle</p>
              <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {CYCLE.map((step, i) => (
                  <li key={step} className="rounded-lg bg-navy-800/70 px-3 py-2 text-sm">
                    <span className="mr-2 text-gold-400">{i + 1}</span>{step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-navy-900">Everything you need, in one evidence-based workflow</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
                <Icon className="h-5 w-5 text-gold-600" aria-hidden />
                <h3 className="mt-3 font-semibold text-navy-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="text-xl font-semibold text-navy-900">Supported exam programs</h2>
            <p className="mt-1 text-sm text-slate-600">Each program has its own configurable structure, syllabus version and weightings. Content depth varies — the catalog shows what is available today.</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {programs.map((p) => (
                <li key={p.slug}>
                  <Link href={`/catalog/${p.slug}`} className="inline-block rounded-full border border-navy-200 px-3 py-1 text-sm text-navy-800 hover:bg-navy-50" title={p.name}>{p.shortName}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
