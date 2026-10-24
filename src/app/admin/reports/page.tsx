import Link from "next/link";
import { Badge, Card, EmptyState, Input, PageHeader, TabLinks, fmtDate } from "@/components/ui";
import { StateForm } from "@/components/state-form";
import { SubmitButton } from "@/components/forms";
import { prisma } from "@/server/db";
import { reportAction } from "@/app/actions/admin";

export const metadata = { title: "Reports · Admin" };

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status === "resolved" || sp.status === "rejected" ? sp.status : "open";
  const reports = await prisma.contentReport.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100, include: { question: { select: { id: true, stem: true } }, lesson: { select: { id: true, title: true } }, formula: { select: { slug: true, name: true } } } });
  return (
    <>
      <PageHeader title="Content reports" description="Learner-reported issues. Fix the content (answer-key corrections automatically re-grade past responses), then resolve the report." />
      <TabLinks active={status} tabs={[{ key: "open", label: "Open", href: "/admin/reports" }, { key: "resolved", label: "Resolved", href: "/admin/reports?status=resolved" }, { key: "rejected", label: "Rejected", href: "/admin/reports?status=rejected" }]} />
      {reports.length === 0 ? <EmptyState title="No reports" /> : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm"><Badge tone="red">{r.category.replace("_", " ")}</Badge><span className="text-xs text-slate-500">{fmtDate(r.createdAt)}</span>
                {r.question && <Link className="underline" href={`/admin/questions/${r.question.id}`}>Question: {r.question.stem.slice(0, 80)}…</Link>}
                {r.lesson && <Link className="underline" href={`/admin/lessons/${r.lesson.id}`}>Lesson: {r.lesson.title}</Link>}
                {r.formula && <Link className="underline" href={`/formulas/${r.formula.slug}`}>Formula: {r.formula.name}</Link>}
              </div>
              <p className="mt-2 text-sm">{r.message}</p>
              {r.status === "open" ? (
                <StateForm action={reportAction.bind(null, r.id)} className="mt-3 flex flex-wrap gap-2">
                  <Input name="resolution" placeholder="Resolution (what was changed, or why no change)" className="min-w-64 flex-1" aria-label="Resolution" />
                  <SubmitButton size="sm" name="op" value="resolve">Resolve</SubmitButton>
                  <SubmitButton size="sm" variant="ghost" name="op" value="reject">Reject</SubmitButton>
                </StateForm>
              ) : <p className="mt-2 text-xs text-slate-500">Resolution: {r.resolution}</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
