import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { StateForm } from "@/components/state-form";
import { SubmitButton } from "@/components/forms";
import { QuestionFields } from "@/components/admin/question-fields";
import { prisma } from "@/server/db";
import { editorLookups } from "@/server/admin/question-form-data";
import { saveQuestionAction } from "@/app/actions/admin";

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ syllabus?: string }> }) {
  const { syllabus } = await searchParams;
  const syllabi = await prisma.syllabusVersion.findMany({ where: { status: { not: "ARCHIVED" } }, include: { level: { include: { program: true } } } });
  if (!syllabus) {
    return (
      <>
        <PageHeader title="New question" description="Choose the syllabus version the question belongs to." />
        <Card><ul className="space-y-1 text-sm">{syllabi.map((s) => <li key={s.id}><Link className="underline" href={`/admin/questions/new?syllabus=${s.id}`}>{s.level.program.shortName} {s.level.name} — {s.versionLabel}</Link></li>)}</ul></Card>
      </>
    );
  }
  const lookups = await editorLookups(syllabus);
  return (
    <>
      <PageHeader title="New question" description="New questions start as drafts. Submit for review, then a reviewer publishes after the answer-key check passes." />
      <Card>
        <StateForm action={saveQuestionAction.bind(null, null)}>
          <QuestionFields d={{ syllabusVersionId: syllabus }} {...lookups} editing={false} />
          <SubmitButton className="mt-4">Create draft</SubmitButton>
        </StateForm>
      </Card>
    </>
  );
}
