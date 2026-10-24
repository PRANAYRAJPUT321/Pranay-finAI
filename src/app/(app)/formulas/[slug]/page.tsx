import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Alert, Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { CalculatorWidget } from "@/components/calculator";
import { NoteForm } from "@/components/note-form";
import { StartAttemptButton } from "@/components/start-attempt";
import { ReportIssue } from "@/components/attempt/feedback";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { isBookmarked } from "@/server/learning/notes";
import { bookmarkAction } from "@/app/actions/content";

export default async function FormulaPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const formula = await prisma.formula.findUnique({
    where: { slug },
    include: { topics: { include: { topic: { include: { syllabus: { include: { level: { include: { program: true } } } } } } } }, _count: { select: { questions: { where: { status: "PUBLISHED" } } } } },
  });
  if (!formula) notFound();
  const [bookmarked, enrollments, questionSyllabi] = await Promise.all([
    isBookmarked(user.id, { formulaId: formula.id }),
    prisma.enrollment.findMany({ where: { userId: user.id, status: "active" }, select: { id: true, syllabusVersionId: true } }),
    prisma.question.groupBy({ by: ["syllabusVersionId"], where: { formulaId: formula.id, status: "PUBLISHED" }, _count: true }),
  ]);
  const practice = enrollments.find((e) => questionSyllabi.some((q) => q.syllabusVersionId === e.syllabusVersionId));
  const variables = formula.variables as { symbol: string; meaning: string; unit?: string }[];
  const example = formula.example as { problem: string; steps: string[]; answer: string };
  const path = `/formulas/${slug}`;
  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-2 text-xs text-slate-500"><Link href="/formulas" className="underline">Formula Library</Link> / {formula.category}</nav>
      <PageHeader
        title={formula.name}
        actions={
          <form action={bookmarkAction.bind(null, { formulaId: formula.id }, path)}>
            <SubmitButton variant="secondary" size="sm" aria-pressed={bookmarked}>{bookmarked ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />} {bookmarked ? "Bookmarked" : "Bookmark"}</SubmitButton>
          </form>
        }
      />
      <div className="space-y-6">
        <Card>
          <p className="formula text-base">{formula.expression}</p>
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Variables</caption>
            <thead><tr className="border-b text-left text-slate-500"><th className="py-1.5 font-medium">Symbol</th><th className="py-1.5 font-medium">Meaning</th><th className="py-1.5 font-medium">Unit</th></tr></thead>
            <tbody>{variables.map((v) => <tr key={v.symbol} className="border-b last:border-0"><td className="py-1.5 font-mono">{v.symbol}</td><td className="py-1.5">{v.meaning}</td><td className="py-1.5 text-slate-500">{v.unit ?? "—"}</td></tr>)}</tbody>
          </table>
          {formula.conventions && <p className="mt-3 text-sm"><strong>Conventions:</strong> {formula.conventions}</p>}
          <p className="mt-2 text-sm"><strong>Assumptions and applicability:</strong> {formula.assumptions}</p>
          {formula.appliesTo && <Alert tone="info" className="mt-3">Applies to: {formula.appliesTo}</Alert>}
        </Card>
        <Card>
          <CardTitle>Worked example</CardTitle>
          <p className="text-sm">{example.problem}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{example.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="mt-2 text-sm"><strong>Answer:</strong> {example.answer}</p>
          {formula.calculatorGuidance && <p className="mt-3 text-xs text-slate-600"><strong>Calculator guidance:</strong> {formula.calculatorGuidance}</p>}
        </Card>
        {formula.calculatorKey && <CalculatorWidget calcKey={formula.calculatorKey} />}
        <Card>
          <CardTitle>Common calculation mistakes</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">{formula.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
        </Card>
        <Card>
          <CardTitle>Syllabus topics and practice</CardTitle>
          <div className="flex flex-wrap gap-1">{formula.topics.map((t) => <Badge key={t.topicId}>{t.topic.syllabus.level.program.shortName} {t.topic.syllabus.level.name}: {t.topic.name}</Badge>)}</div>
          {practice ? (
            <StartAttemptButton className="mt-3" fields={{ syllabusVersionId: practice.syllabusVersionId, enrollmentId: practice.id, kind: "PRACTICE", count: 5, formulaId: formula.id }}>Practise questions using this formula</StartAttemptButton>
          ) : (
            <p className="mt-3 text-sm text-slate-600">{formula._count.questions > 0 ? "Questions using this formula belong to an exam you have not added." : "No practice questions linked yet."}</p>
          )}
        </Card>
        <Card>
          <CardTitle>Add to my revision notebook</CardTitle>
          <NoteForm formulaId={formula.id} path={path} defaultTitle={formula.name} />
        </Card>
        <div className="flex justify-end"><ReportIssue formulaId={formula.id} /></div>
      </div>
    </div>
  );
}
