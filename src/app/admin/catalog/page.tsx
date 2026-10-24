import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { VerificationBadge } from "@/components/verification";
import { prisma } from "@/server/db";

export const metadata = { title: "Exams · Admin" };

export default async function AdminCatalog() {
  const programs = await prisma.examProgram.findMany({ orderBy: { name: "asc" }, include: { levels: { orderBy: { order: "asc" }, include: { syllabi: { orderBy: { createdAt: "desc" }, include: { _count: { select: { questions: true, enrollments: true, attempts: true } } } } } } } });
  return (
    <>
      <PageHeader title="Exams and syllabus versions" description="Verify structures against official sources, edit weightings, and version syllabi. Historical attempts keep their original syllabus version." />
      <div className="space-y-4">
        {programs.map((p) => (
          <Card key={p.id}>
            <p className="font-semibold text-navy-900">{p.name} <span className="text-sm font-normal text-slate-500">· {p.awardingBody}</span></p>
            <ul className="mt-2 space-y-2">
              {p.levels.map((l) => (
                <li key={l.id} className="text-sm">
                  <span className="font-medium">{l.name}</span>
                  {l.syllabi.length === 0 ? <span className="ml-2 text-slate-500">no syllabus</span> : (
                    <ul className="ml-4 mt-1 space-y-1">
                      {l.syllabi.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-2">
                          <Link className="text-navy-800 underline" href={`/admin/catalog/${s.id}`}>{s.versionLabel}</Link>
                          <Badge tone={s.status === "CURRENT" ? "green" : s.status === "DRAFT" ? "amber" : "slate"}>{s.status.toLowerCase()}</Badge>
                          <VerificationBadge status={s.verificationStatus} verifiedAt={s.verifiedAt} />
                          <span className="text-xs text-slate-500">{s._count.questions} Q · {s._count.enrollments} learners · {s._count.attempts} attempts</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
