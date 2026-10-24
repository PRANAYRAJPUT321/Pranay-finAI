import { notFound } from "next/navigation";
import { Alert, Badge, Card, CardTitle, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { VerificationBadge } from "@/components/verification";
import { StateForm } from "@/components/state-form";
import { SubmitButton } from "@/components/forms";
import { prisma } from "@/server/db";
import { cloneSyllabusAction, makeCurrentAction, structureAction, topicAction, verifySyllabusAction } from "@/app/actions/admin";

export default async function AdminSyllabus({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await prisma.syllabusVersion.findUnique({ where: { id }, include: { level: { include: { program: true } }, topics: { where: { parentId: null }, orderBy: { order: "asc" } } } });
  if (!s) notFound();
  const audits = await prisma.auditLog.findMany({ where: { entityType: "SyllabusVersion", entityId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } });
  return (
    <>
      <PageHeader title={`${s.level.program.shortName} ${s.level.name} — ${s.versionLabel}`} description={<span className="flex flex-wrap gap-2"><Badge tone={s.status === "CURRENT" ? "green" : "amber"}>{s.status.toLowerCase()}</Badge><VerificationBadge status={s.verificationStatus} verifiedAt={s.verifiedAt} /></span>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>Topics and official weightings</CardTitle>
            <p className="mb-3 text-xs text-slate-500">Editing weights marks the syllabus unverified until it is re-checked.</p>
            <div className="space-y-3">
              {s.topics.map((t) => (
                <StateForm key={t.id} action={topicAction.bind(null, t.id, s.id)} className="grid items-end gap-2 sm:grid-cols-[1fr_5rem_5rem_6rem_auto]">
                  <Field id={`n-${t.id}`} label={t.code}><Input id={`n-${t.id}`} name="name" defaultValue={t.name} /></Field>
                  <Field id={`min-${t.id}`} label="Min %"><Input id={`min-${t.id}`} name="weightMin" type="number" step="0.5" defaultValue={t.weightMin ?? ""} /></Field>
                  <Field id={`max-${t.id}`} label="Max %"><Input id={`max-${t.id}`} name="weightMax" type="number" step="0.5" defaultValue={t.weightMax ?? ""} /></Field>
                  <Field id={`d-${t.id}`} label="Difficulty"><Select id={`d-${t.id}`} name="difficulty" defaultValue={String(t.difficulty)}><option value="1">1</option><option value="2">2</option><option value="3">3</option></Select></Field>
                  <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                </StateForm>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Exam structure</CardTitle>
            <StateForm action={structureAction.bind(null, s.id)} className="space-y-3">
              <Field id="structure" label="Structure JSON (sections, timing, formats, scoring, calculator policy)"><Textarea id="structure" name="structure" rows={18} className="font-mono text-xs" defaultValue={JSON.stringify(s.structure, null, 2)} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="recommendedHours" label="Indicative study hours"><Input id="recommendedHours" name="recommendedHours" type="number" defaultValue={s.recommendedHours ?? 150} /></Field>
              </div>
              <Field id="notes" label="Notes shown to learners"><Textarea id="notes" name="notes" rows={3} defaultValue={s.notes ?? ""} /></Field>
              <Alert tone="warning">Only enter a passing score with <code>passingScoreVerified: true</code> when the awarding body publishes one and you have checked it.</Alert>
              <SubmitButton>Save structure</SubmitButton>
            </StateForm>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardTitle>Verification</CardTitle>
            <StateForm action={verifySyllabusAction.bind(null, s.id)} className="space-y-3">
              <Field id="sourceUrl" label="Official source URL"><Input id="sourceUrl" name="sourceUrl" type="url" defaultValue={s.sourceUrl ?? ""} /></Field>
              <Field id="vnote" label="What did you check?"><Textarea id="vnote" name="note" rows={2} /></Field>
              <div className="flex gap-2"><SubmitButton size="sm" name="op" value="verify">Mark verified today</SubmitButton>{s.verificationStatus === "VERIFIED" && <SubmitButton size="sm" variant="ghost" name="op" value="unverify">Mark unverified</SubmitButton>}</div>
            </StateForm>
          </Card>
          <Card>
            <CardTitle>Versioning</CardTitle>
            {s.status !== "CURRENT" && <form action={makeCurrentAction.bind(null, s.id)} className="mb-3"><SubmitButton size="sm" variant="gold">Make this the current version</SubmitButton></form>}
            <StateForm action={cloneSyllabusAction.bind(null, s.id)} className="space-y-2">
              <Field id="label" label="New version label"><Input id="label" name="label" placeholder="e.g. 2027 curriculum" /></Field>
              <SubmitButton size="sm" variant="secondary">Clone as new draft version</SubmitButton>
            </StateForm>
            <p className="mt-2 text-xs text-slate-500">Questions remain attached to their original version so historical results stay interpretable.</p>
          </Card>
          <Card>
            <CardTitle>Change history</CardTitle>
            {audits.length === 0 ? <p className="text-sm text-slate-600">No changes recorded.</p> : <ul className="space-y-1 text-xs">{audits.map((a) => <li key={a.id}>{a.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {a.actor?.name ?? "system"} · {a.action}{a.note ? ` — ${a.note}` : ""}</li>)}</ul>}
          </Card>
        </div>
      </div>
    </>
  );
}
