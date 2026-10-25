import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, BookmarkCheck, Bot, FileDown, PlayCircle } from "lucide-react";
import { Alert, Badge, Card, CardTitle, LinkButton, PageHeader, TabLinks } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { CalculatorWidget } from "@/components/calculator";
import { NoteForm } from "@/components/note-form";
import { ReportIssue } from "@/components/attempt/feedback";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { lessonContentSchema } from "@/server/content/lesson-schema";
import { isBookmarked } from "@/server/learning/notes";
import { bookmarkAction, completeLessonAction, knowledgeCheckAction, suggestCardsAction } from "@/app/actions/content";

export const metadata = { title: "Lesson" };

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export default async function LessonPage({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<{ level?: string }> }) {
  const user = await requireUser();
  const { lessonId } = await params;
  const sp = await searchParams;
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, status: "PUBLISHED" },
    include: { topic: { include: { parent: true, syllabus: { include: { level: { include: { program: true } } } }, outcomes: true } }, source: true },
  });
  if (!lesson) notFound();
  const content = lessonContentSchema.parse(lesson.content);
  const level = (LEVELS as readonly string[]).includes(sp.level ?? "") ? (sp.level as (typeof LEVELS)[number]) : ((LEVELS as readonly string[]).includes(user.explanationLevel) ? (user.explanationLevel as (typeof LEVELS)[number]) : "intermediate");
  const [progress, bookmarked, formulas, notes] = await Promise.all([
    prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: { userId: user.id, lessonId },
      update: {},
    }),
    isBookmarked(user.id, { lessonId }),
    prisma.formula.findMany({ where: { slug: { in: content.formulaSlugs } } }),
    prisma.note.findMany({ where: { userId: user.id, lessonId }, orderBy: { createdAt: "desc" } }),
  ]);
  const program = lesson.topic.syllabus.level.program;
  const completed = progress.status === "completed";
  const path = `/learn/${lessonId}`;

  return (
    <article className="mx-auto max-w-4xl">
      <nav className="mb-2 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/learn" className="underline">Learn</Link> / {lesson.topic.parent?.name ?? lesson.topic.name}{lesson.topic.parent ? ` / ${lesson.topic.name}` : ""}
      </nav>
      <PageHeader
        title={lesson.title}
        description={`${program.shortName} ${lesson.topic.syllabus.level.name} · ${lesson.topic.syllabus.versionLabel} · about ${lesson.estimatedMinutes} minutes`}
        actions={
          <>
            <form action={bookmarkAction.bind(null, { lessonId }, path)}>
              <SubmitButton variant="secondary" size="sm" aria-pressed={bookmarked}>
                {bookmarked ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />} {bookmarked ? "Bookmarked" : "Bookmark"}
              </SubmitButton>
            </form>
            <LinkButton href={`/videos/${lessonId}`} variant="gold" size="sm"><PlayCircle className="h-4 w-4" aria-hidden /> Watch explainer</LinkButton>
            <a href={`/api/materials/lesson/${lessonId}`} download className="btn-secondary inline-flex items-center gap-2 rounded-full border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white hover:text-navy-950"><FileDown className="h-4 w-4" aria-hidden /> PDF</a>
            <LinkButton href={`/tutor?lesson=${lessonId}`} variant="secondary" size="sm"><Bot className="h-4 w-4" aria-hidden /> Ask the tutor</LinkButton>
          </>
        }
      />
      <Alert tone="info" className="mb-6">
        <Badge tone="gold" className="mr-2">{lesson.origin === "ORIGINAL" ? "PD FinPrep original" : lesson.origin === "AI_GENERATED" ? "AI-assisted, human-reviewed" : "Licensed"}</Badge>
        This is an educational explanation, not official curriculum text from {program.awardingBody}. Use the official curriculum as the authoritative source.
      </Alert>

      <div className="space-y-6">
        <Card>
          <CardTitle>1. Learning objectives</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">{content.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
          {lesson.topic.outcomes.length > 0 && <p className="mt-2 text-xs text-slate-500">Related outcomes: {lesson.topic.outcomes.map((o) => o.statement).join(" · ")}</p>}
        </Card>
        {content.prerequisites.length > 0 && (
          <Card>
            <CardTitle>2. Prerequisite concepts</CardTitle>
            <ul className="list-disc space-y-1 pl-5 text-sm">{content.prerequisites.map((o) => <li key={o}>{o}</li>)}</ul>
          </Card>
        )}
        <Card>
          <CardTitle>3. Plain-language explanation</CardTitle>
          <TabLinks active={level} tabs={LEVELS.map((l) => ({ key: l, label: l[0].toUpperCase() + l.slice(1), href: `${path}?level=${l}` }))} />
          <p className="text-sm leading-relaxed text-slate-800">{content.explanations[level]}</p>
        </Card>
        <Card>
          <CardTitle>4. Formal definition</CardTitle>
          <p className="text-sm leading-relaxed text-slate-800">{content.formal}</p>
        </Card>
        {content.workedExamples.length > 0 && (
          <Card>
            <CardTitle>5. Worked examples</CardTitle>
            <div className="space-y-4">
              {content.workedExamples.map((ex) => (
                <div key={ex.title} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-navy-900">{ex.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{ex.problem}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{ex.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                  <p className="mt-2 text-sm"><strong>Answer:</strong> {ex.answer}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
        {content.table && (
          <Card>
            <CardTitle>{content.table.caption}</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-slate-500">{content.table.headers.map((h) => <th key={h} className="py-1.5 pr-3 font-medium">{h}</th>)}</tr></thead>
                <tbody>{content.table.rows.map((r, i) => <tr key={i} className="border-b last:border-0">{r.map((c, j) => <td key={j} className="py-1.5 pr-3">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </Card>
        )}
        {content.journalEntries && (
          <Card>
            <CardTitle>Journal entries</CardTitle>
            {content.journalEntries.map((je) => (
              <div key={je.description} className="mb-3">
                <p className="text-sm font-medium">{je.description}</p>
                <table className="mt-1 w-full max-w-lg text-sm">
                  <thead><tr className="border-b text-left text-slate-500"><th className="py-1 font-medium">Account</th><th className="py-1 text-right font-medium">Debit</th><th className="py-1 text-right font-medium">Credit</th></tr></thead>
                  <tbody>{je.lines.map((l) => <tr key={l.account} className="border-b last:border-0"><td className={`py-1 ${l.credit ? "pl-6" : ""}`}>{l.account}</td><td className="py-1 text-right font-mono">{l.debit ?? ""}</td><td className="py-1 text-right font-mono">{l.credit ?? ""}</td></tr>)}</tbody>
                </table>
              </div>
            ))}
          </Card>
        )}
        {formulas.length > 0 && (
          <Card>
            <CardTitle>6. Formulas and assumptions</CardTitle>
            <div className="space-y-3">
              {formulas.map((f) => (
                <div key={f.id}>
                  <Link href={`/formulas/${f.slug}`} className="text-sm font-medium text-navy-800 underline">{f.name}</Link>
                  <p className="formula mt-1 text-sm">{f.expression}</p>
                  <p className="mt-1 text-xs text-slate-600">Assumes: {f.assumptions}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
        {content.calculatorKeys.length > 0 && (
          <section aria-labelledby="calc-h">
            <h2 id="calc-h" className="mb-3 text-base font-semibold text-navy-900">Interactive calculators</h2>
            <div className="grid gap-4 md:grid-cols-2">{content.calculatorKeys.map((k) => <CalculatorWidget key={k} calcKey={k} />)}</div>
          </section>
        )}
        {content.applications.length > 0 && (
          <Card>
            <CardTitle>7. Applications</CardTitle>
            <ul className="list-disc space-y-1 pl-5 text-sm">{content.applications.map((a) => <li key={a}>{a}</li>)}</ul>
          </Card>
        )}
        {content.examExamples.length > 0 && (
          <Card>
            <CardTitle>8. Exam-style patterns</CardTitle>
            <ul className="space-y-2 text-sm">{content.examExamples.map((e) => <li key={e.prompt}><strong>{e.prompt}</strong> {e.insight}</li>)}</ul>
          </Card>
        )}
        {content.misconceptions.length > 0 && (
          <Card>
            <CardTitle>9. Common misconceptions and traps</CardTitle>
            <ul className="space-y-2 text-sm">{content.misconceptions.map((m) => <li key={m.myth}><span className="text-red-700">✗ {m.myth}</span><br /><span className="text-emerald-800">✓ {m.reality}</span></li>)}</ul>
          </Card>
        )}
        <Card>
          <CardTitle>10. Summary and key takeaways</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">{content.summary.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
        <Card>
          <CardTitle>11. Knowledge check</CardTitle>
          <p className="text-sm text-slate-600">{content.knowledgeCheck.length} short questions with instant feedback. Results count towards your topic proficiency.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {content.knowledgeCheck.length > 0 && <form action={knowledgeCheckAction.bind(null, lessonId)}><SubmitButton pendingLabel="Preparing…">Start knowledge check</SubmitButton></form>}
            {!completed ? (
              <form action={completeLessonAction.bind(null, lessonId)} className="flex items-center gap-2">
                <input type="hidden" name="minutes" value={lesson.estimatedMinutes} />
                <SubmitButton variant="secondary">Mark lesson complete</SubmitButton>
              </form>
            ) : (
              <Badge tone="green">Lesson completed</Badge>
            )}
            <form action={suggestCardsAction.bind(null, lessonId)}><SubmitButton variant="ghost">Suggest flashcards from this lesson</SubmitButton></form>
          </div>
          <p className="mt-2 text-xs text-slate-500">Completing a lesson marks it as covered. Mastery requires evidence from practice across sessions.</p>
        </Card>
        {content.references.length > 0 && (
          <Card>
            <CardTitle>12. Further reading and references</CardTitle>
            <ul className="space-y-1 text-sm">
              {content.references.map((r) => (
                <li key={r.title}>
                  {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-navy-800 underline">{r.title}</a> : <span className="font-medium">{r.title}</span>} — {r.publisher}{r.note ? `. ${r.note}` : ""}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <CardTitle>My notes on this lesson</CardTitle>
          {notes.length > 0 && (
            <ul className="mb-4 space-y-2">
              {notes.map((n) => <li key={n.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">{n.title}{n.highlight && <Badge tone="gold" className="ml-2">Pinned</Badge>}</p><p className="whitespace-pre-line text-slate-700">{n.body}</p></li>)}
            </ul>
          )}
          <NoteForm lessonId={lessonId} topicId={lesson.topic.parentId ?? lesson.topicId} path={path} defaultTitle={lesson.title} />
        </Card>
        <div className="flex justify-end"><ReportIssue lessonId={lessonId} /></div>
      </div>
    </article>
  );
}
