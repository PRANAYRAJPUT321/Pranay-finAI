import Link from "next/link";
import { Badge, Card, EmptyState, LinkButton, PageHeader, fmtDate } from "@/components/ui";
import { VerificationBadge } from "@/components/verification";
import { SubmitButton } from "@/components/forms";
import { requireUser } from "@/server/auth/current";
import { listEnrollments } from "@/server/learning/enrollment";
import { archiveEnrollmentAction, rebuildPlanAction, setPrimaryAction } from "@/app/actions/learning";

export const metadata = { title: "My Exams" };

export default async function ExamsPage() {
  const user = await requireUser();
  const enrollments = await listEnrollments(user.id);
  return (
    <>
      <PageHeader title="My Exams" description="Each certification keeps its own plan, diagnostic and progress. The active exam drives your dashboard." actions={<LinkButton href="/onboarding">Add a certification</LinkButton>} />
      {enrollments.length === 0 ? (
        <EmptyState title="No certifications yet" action={<LinkButton href="/onboarding">Choose an exam</LinkButton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enrollments.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-navy-900">{e.program.shortName} · {e.level.name}</p>
                  <p className="text-sm text-slate-600">{e.syllabus.versionLabel}</p>
                </div>
                {e.isPrimary && <Badge tone="gold">Active</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2"><VerificationBadge status={e.syllabus.verificationStatus} verifiedAt={e.syllabus.verifiedAt} /></div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-slate-500">Exam date</dt><dd>{e.targetExamDate ? fmtDate(e.targetExamDate) : (e.targetWindowLabel ?? "Not set")}</dd></div>
                <div><dt className="text-slate-500">Availability</dt><dd>{e.hoursPerDay} h × {e.studyDaysPerWeek} days/week</dd></div>
                <div><dt className="text-slate-500">Diagnostic</dt><dd>{e.diagnosticAttemptId ? <Link className="underline" href={`/attempt/${e.diagnosticAttemptId}/results`}>View results</Link> : "Not taken"}</dd></div>
                <div><dt className="text-slate-500">Catalog</dt><dd><Link className="underline" href={`/catalog/${e.program.slug}`}>Syllabus & structure</Link></dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {!e.isPrimary && <form action={setPrimaryAction.bind(null, e.id)}><SubmitButton size="sm">Make active</SubmitButton></form>}
                <LinkButton href={`/onboarding?level=${e.levelId}`} size="sm" variant="secondary">Edit details</LinkButton>
                <form action={rebuildPlanAction.bind(null, e.id)}><SubmitButton size="sm" variant="secondary" pendingLabel="Rebuilding…">Rebuild plan</SubmitButton></form>
                <form action={archiveEnrollmentAction.bind(null, e.id)}><SubmitButton size="sm" variant="ghost">Archive</SubmitButton></form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
