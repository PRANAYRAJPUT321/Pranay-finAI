import Link from "next/link";
import { BookOpen, FileDown, FileText, FunctionSquare, Landmark, Package, PlayCircle } from "lucide-react";
import { Card, CardTitle, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { getRootTopics } from "@/server/catalog/service";
import { prisma } from "@/server/db";

export const metadata = { title: "Study Materials" };

function Download({ href, label, meta, icon: Icon = FileDown, featured = false }: { href: string; label: string; meta?: string; icon?: typeof FileDown; featured?: boolean }) {
  return (
    <a
      href={href}
      download
      className={`group flex items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${featured ? "bg-ink border-transparent text-white shadow-xl shadow-black/20" : "border-slate-200 bg-white hover:border-gold-400"}`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition group-hover:scale-110 ${featured ? "bg-gold-500 text-white" : "bg-navy-950 text-gold-500"}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-semibold ${featured ? "text-white" : "text-navy-950"}`}>{label}</span>
        {meta && <span className={`block text-xs ${featured ? "text-navy-100" : "text-slate-500"}`}>{meta}</span>}
      </span>
      <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] ${featured ? "text-gold-500" : "text-slate-400 group-hover:text-gold-600"}`}>PDF ↓</span>
    </a>
  );
}

export default async function MaterialsPage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to see its study materials" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const sv = enrollment.syllabusVersionId;
  const [topics, levels, formulaCount] = await Promise.all([
    getRootTopics(sv),
    prisma.examLevel.findMany({ where: { programId: enrollment.programId }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.formula.count({ where: { topics: { some: { topic: { syllabusVersionId: sv } } } } }),
  ]);
  const allLessons = topics.flatMap((t) => [...t.lessons, ...t.children.flatMap((c) => c.lessons)]);
  const label = `${enrollment.program.shortName} ${enrollment.level.name}`;
  return (
    <>
      <PageHeader
        eyebrow="Study / Downloads"
        title="Study Materials"
        description="Printable PDF notes generated from PD FinPrep's original lessons: full study packs, topic packs, formula sheets and exam fact sheets. Read offline, annotate, print."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Reveal className="min-w-0"><Download featured href={`/api/materials/pack/${sv}`} icon={Package} label={`${label} — complete study pack`} meta={`${allLessons.length} lessons + formula sheet`} /></Reveal>
        <Reveal delay={80} className="min-w-0"><Download featured href={`/api/materials/formulas?syllabus=${sv}`} icon={FunctionSquare} label={`${label} formula sheet`} meta={`${formulaCount} formulas with worked examples`} /></Reveal>
        <Reveal delay={160} className="min-w-0"><Download featured href={`/api/materials/exam-guide/${enrollment.levelId}`} icon={Landmark} label={`${label} exam fact sheet`} meta="Dates, fees, format, difficulty, links" /></Reveal>
      </div>

      <h2 className="font-display mt-10 text-2xl font-black uppercase tracking-tight text-navy-950">By topic</h2>
      <span className="rule-red mt-2" aria-hidden />
      <div className="mt-5 space-y-4">
        {topics.map((t) => {
          const lessons = [...t.lessons, ...t.children.flatMap((c) => c.lessons)];
          return (
            <Card key={t.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{t.name}</CardTitle>
                {lessons.length > 0 && (
                  <a href={`/api/materials/pack/${sv}?topic=${t.id}`} download className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-gold-600">
                    <Package className="h-3.5 w-3.5" aria-hidden /> Topic pack
                  </a>
                )}
              </div>
              {lessons.length === 0 ? (
                <p className="text-sm text-slate-500">Lessons for this topic are coming soon. Practice questions and the formula sheet already cover it where available.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {lessons.map((l) => (
                    <li key={l.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-gold-600" aria-hidden />
                      <Link href={`/learn/${l.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-navy-950 hover:underline">{l.title}</Link>
                      <Link href={`/videos/${l.id}`} className="rounded-full p-1.5 text-navy-700 hover:bg-navy-50" title="Watch the video explainer" aria-label={`Watch ${l.title} explainer`}><PlayCircle className="h-4 w-4" aria-hidden /></Link>
                      <a href={`/api/materials/lesson/${l.id}`} download className="rounded-full p-1.5 text-navy-700 hover:bg-navy-50" title="Download PDF" aria-label={`Download ${l.title} as PDF`}><FileDown className="h-4 w-4" aria-hidden /></a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <h2 className="font-display mt-10 text-2xl font-black uppercase tracking-tight text-navy-950">Exam fact sheets</h2>
      <span className="rule-red mt-2" aria-hidden />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((l) => <Download key={l.id} href={`/api/materials/exam-guide/${l.id}`} icon={BookOpen} label={`${enrollment.program.shortName} ${l.name}`} meta="Dates · fees · difficulty" />)}
      </div>
      <p className="mt-6 text-xs text-slate-500">PDFs are educational summaries of PD FinPrep original content, not official curriculum text. Official past papers are linked from <Link href="/past-papers" className="underline">Past Papers</Link>.</p>
    </>
  );
}
