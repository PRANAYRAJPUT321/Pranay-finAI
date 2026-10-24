import Link from "next/link";
import { notFound } from "next/navigation";
import type { ContentStatus } from "@prisma/client";
import { Badge, Card, CardTitle, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { StateForm } from "@/components/state-form";
import { SubmitButton } from "@/components/forms";
import { prisma } from "@/server/db";
import { lessonAction, lessonStatusAction } from "@/app/actions/admin";

const NEXT: Record<ContentStatus, ContentStatus[]> = { DRAFT: ["IN_REVIEW", "ARCHIVED"], IN_REVIEW: ["PUBLISHED", "REJECTED", "DRAFT"], REJECTED: ["DRAFT", "ARCHIVED"], PUBLISHED: ["ARCHIVED", "IN_REVIEW"], ARCHIVED: ["DRAFT"] };

export default async function AdminLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id }, include: { topic: true, reports: { where: { status: "open" } } } });
  if (!lesson) notFound();
  return (
    <>
      <PageHeader title={lesson.title} description={`${lesson.topic.name} · v${lesson.version}`} actions={<Link href={`/learn/${lesson.id}`} className="text-sm underline">View as learner</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <StateForm action={lessonAction.bind(null, lesson.id)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="title" label="Title"><Input id="title" name="title" defaultValue={lesson.title} /></Field>
              <Field id="estimatedMinutes" label="Estimated minutes"><Input id="estimatedMinutes" name="estimatedMinutes" type="number" defaultValue={lesson.estimatedMinutes} /></Field>
            </div>
            <Field id="content" label="Content (JSON, validated against the lesson schema)"><Textarea id="content" name="content" rows={28} className="font-mono text-xs" defaultValue={JSON.stringify(lesson.content, null, 2)} /></Field>
            <Field id="reason" label="Reason for change"><Input id="reason" name="reason" required /></Field>
            <SubmitButton>Save new version</SubmitButton>
          </StateForm>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitle>Status</CardTitle>
            <p className="text-sm"><Badge>{lesson.status.toLowerCase()}</Badge> <Badge>{lesson.origin.toLowerCase()}</Badge></p>
            <div className="mt-3 flex flex-wrap gap-2">{NEXT[lesson.status].map((s) => <form key={s} action={lessonStatusAction.bind(null, lesson.id, s)}><SubmitButton size="sm" variant={s === "PUBLISHED" ? "gold" : "secondary"}>{s.replace("_", " ").toLowerCase()}</SubmitButton></form>)}</div>
          </Card>
          <Card>
            <CardTitle>Open reports</CardTitle>
            {lesson.reports.length === 0 ? <p className="text-sm text-slate-600">None.</p> : <ul className="space-y-1 text-sm">{lesson.reports.map((r) => <li key={r.id}>{r.category}: {r.message}</li>)}</ul>}
          </Card>
        </div>
      </div>
    </>
  );
}
