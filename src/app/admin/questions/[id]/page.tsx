import Link from "next/link";
import { notFound } from "next/navigation";
import type { ContentStatus } from "@prisma/client";
import { Alert, Badge, Card, CardTitle, Input, PageHeader, fmtDate } from "@/components/ui";
import { StateForm } from "@/components/state-form";
import { SubmitButton } from "@/components/forms";
import { QuestionFields } from "@/components/admin/question-fields";
import { prisma } from "@/server/db";
import { editorLookups } from "@/server/admin/question-form-data";
import { verifyAnswerKey } from "@/server/assessment/grading";
import { choicePayloadSchema, numericPayloadSchema, writtenPayloadSchema, type QType } from "@/server/assessment/question-schema";
import { questionStatusAction, saveQuestionAction } from "@/app/actions/admin";

const NEXT: Record<ContentStatus, { to: ContentStatus; label: string }[]> = {
  DRAFT: [{ to: "IN_REVIEW", label: "Submit for review" }, { to: "ARCHIVED", label: "Archive" }],
  IN_REVIEW: [{ to: "PUBLISHED", label: "Approve & publish" }, { to: "REJECTED", label: "Reject" }, { to: "DRAFT", label: "Back to draft" }],
  REJECTED: [{ to: "DRAFT", label: "Reopen as draft" }, { to: "ARCHIVED", label: "Archive" }],
  PUBLISHED: [{ to: "IN_REVIEW", label: "Withdraw to review" }, { to: "ARCHIVED", label: "Archive" }],
  ARCHIVED: [{ to: "DRAFT", label: "Restore as draft" }],
};

export default async function AdminQuestionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      syllabus: { include: { level: { include: { program: true } } } },
      versions: { orderBy: { version: "desc" }, include: { changedBy: { select: { name: true } } } },
      reports: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!q) notFound();
  const [lookups, stats] = await Promise.all([
    editorLookups(q.syllabusVersionId),
    prisma.attemptItem.groupBy({ by: ["isCorrect"], where: { questionId: id, isCorrect: { not: null } }, _count: true }),
  ]);
  const type = q.type as QType;
  const check = verifyAnswerKey(type, q.payload, q.calcSpec);
  const answered = stats.reduce((a, s) => a + s._count, 0);
  const correct = stats.find((s) => s.isCorrect)?._count ?? 0;
  const d = {
    syllabusVersionId: q.syllabusVersionId,
    topicId: q.topicId,
    learningOutcomeId: q.learningOutcomeId,
    formulaId: q.formulaId,
    type: q.type,
    difficulty: q.difficulty,
    stem: q.stem,
    options: type === "MCQ" || type === "MULTI_SELECT" ? choicePayloadSchema.parse(q.payload).options : undefined,
    numeric: type === "NUMERIC" ? numericPayloadSchema.parse(q.payload) : undefined,
    written: type === "WRITTEN" ? writtenPayloadSchema.parse(q.payload) : undefined,
    calcSpec: q.calcSpec,
    explanation: q.explanation,
    steps: q.steps,
    conceptTested: q.conceptTested,
    commonMistake: q.commonMistake,
    estimatedSeconds: q.estimatedSeconds,
    context: q.context,
    origin: q.origin,
    externalKey: q.externalKey,
  };
  return (
    <>
      <PageHeader title={`Question ${q.externalKey ?? q.id.slice(0, 8)}`} description={`${q.syllabus.level.program.shortName} ${q.syllabus.level.name} · ${q.syllabus.versionLabel} · version ${q.version}`} actions={<Link href="/admin/questions" className="text-sm underline">All questions</Link>} />
      {sp.created && <Alert tone="success" className="mb-4">Draft created.</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>Edit</CardTitle>
            {q.status === "PUBLISHED" && <Alert tone="warning" className="mb-4">This question is live. Changing the answer key re-grades every recorded response and updates affected results and proficiency estimates. All changes are versioned and audited.</Alert>}
            <StateForm action={saveQuestionAction.bind(null, q.id)}>
              <QuestionFields d={d} {...lookups} editing />
              <SubmitButton className="mt-4">Save new version</SubmitButton>
            </StateForm>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardTitle>Review workflow</CardTitle>
            <p className="text-sm">Status: <Badge tone={q.status === "PUBLISHED" ? "green" : q.status === "IN_REVIEW" ? "amber" : "slate"}>{q.status.replace("_", " ").toLowerCase()}</Badge> · origin {q.origin.toLowerCase()}</p>
            {q.reviewedAt && <p className="mt-1 text-xs text-slate-500">Last approved {fmtDate(q.reviewedAt)}</p>}
            <Alert tone={check.ok ? "success" : "error"} className="mt-3">Answer key: {check.message}{check.computed !== undefined ? ` (calculator: ${check.computed})` : ""}</Alert>
            <div className="mt-3 space-y-2">
              {NEXT[q.status].map((n) => (
                <StateForm key={n.to} action={questionStatusAction.bind(null, q.id, n.to)} className="flex gap-2">
                  {(n.to === "REJECTED" || n.to === "ARCHIVED") && <Input name="note" placeholder="Note (optional)" aria-label="Note" />}
                  <SubmitButton size="sm" variant={n.to === "PUBLISHED" ? "gold" : "secondary"}>{n.label}</SubmitButton>
                </StateForm>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Item statistics</CardTitle>
            <p className="text-sm">{answered} graded responses · {answered ? Math.round((correct / answered) * 100) : 0}% correct</p>
            {answered >= 20 && correct / answered < 0.25 && <p className="mt-1 text-xs text-red-700">Very low accuracy — check the key and wording.</p>}
          </Card>
          <Card>
            <CardTitle>Open reports</CardTitle>
            {q.reports.length === 0 ? <p className="text-sm text-slate-600">None.</p> : <ul className="space-y-2 text-sm">{q.reports.map((r) => <li key={r.id}><Badge tone={r.status === "open" ? "red" : "slate"}>{r.category}</Badge> {r.message}</li>)}</ul>}
            <Link href="/admin/reports" className="mt-2 inline-block text-sm underline">Manage reports</Link>
          </Card>
          <Card>
            <CardTitle>Version history</CardTitle>
            <ul className="space-y-1 text-sm">{q.versions.map((v) => <li key={v.id}>v{v.version} · {fmtDate(v.createdAt)} · {v.changedBy?.name ?? "system"} — {v.reason}</li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
