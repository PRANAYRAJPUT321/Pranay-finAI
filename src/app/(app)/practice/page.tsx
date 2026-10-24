import Link from "next/link";
import { Badge, Card, CardTitle, EmptyState, LinkButton, PageHeader, fmtDate } from "@/components/ui";
import { PracticeForm } from "@/components/practice-form";
import { StartAttemptButton } from "@/components/start-attempt";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { listAttempts } from "@/server/assessment/service";
import { prisma } from "@/server/db";

export const metadata = { title: "Practice" };

export default async function PracticePage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to practise" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const sv = enrollment.syllabusVersionId;
  const [topics, counts, open, recent, due] = await Promise.all([
    prisma.topic.findMany({ where: { syllabusVersionId: sv, parentId: null }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.question.groupBy({ by: ["topicId"], where: { syllabusVersionId: sv, status: "PUBLISHED" }, _count: true }),
    prisma.attempt.findMany({ where: { userId: user.id, status: { in: ["IN_PROGRESS", "PAUSED"] } }, orderBy: { updatedAt: "desc" }, take: 10 }),
    listAttempts(user.id, { status: "SUBMITTED", syllabusVersionId: sv, take: 10 }),
    prisma.questionReviewState.count({ where: { userId: user.id, dueAt: { lte: new Date() }, question: { syllabusVersionId: sv } } }),
  ]);
  const countOf = new Map(counts.map((c) => [c.topicId, c._count]));
  return (
    <>
      <PageHeader title="Practice" description={`${enrollment.program.shortName} ${enrollment.level.name} — original exam-style questions with detailed explanations.`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Build a practice set</CardTitle>
          <PracticeForm syllabusVersionId={sv} enrollmentId={enrollment.id} topics={topics.map((t) => ({ ...t, available: countOf.get(t.id) ?? 0 }))} />
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitle>Spaced revision</CardTitle>
            <p className="text-sm text-slate-600">{due} previously seen question{due === 1 ? " is" : "s are"} due for review.</p>
            {due > 0 && <StartAttemptButton className="mt-3" fields={{ syllabusVersionId: sv, enrollmentId: enrollment.id, kind: "REVISION", count: Math.min(due, 15) }}>Start revision set</StartAttemptButton>}
          </Card>
          <Card>
            <CardTitle>Resume</CardTitle>
            {open.length === 0 ? <p className="text-sm text-slate-600">No assessments in progress.</p> : (
              <ul className="space-y-2 text-sm">
                {open.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <Link href={`/attempt/${a.id}`} className="truncate text-navy-800 underline">{a.title}</Link>
                    <Badge tone={a.status === "PAUSED" ? "amber" : "navy"}>{a.status === "PAUSED" ? "paused" : "in progress"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <Card className="mt-6">
        <CardTitle>Recent results</CardTitle>
        {recent.length === 0 ? <p className="text-sm text-slate-600">Your submitted sets will appear here.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="py-1.5 font-medium">Assessment</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Score</th><th /></tr></thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-1.5">{a.title}</td>
                    <td className="py-1.5 text-slate-600">{fmtDate(a.submittedAt)}</td>
                    <td className="py-1.5">{a.correctCount}/{a.totalCount} ({(a.scorePct ?? 0).toFixed(0)}%)</td>
                    <td className="py-1.5 text-right"><Link className="text-navy-800 underline" href={`/attempt/${a.id}/results`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
