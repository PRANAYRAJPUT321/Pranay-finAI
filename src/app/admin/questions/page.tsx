import Link from "next/link";
import { Badge, Button, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { prisma } from "@/server/db";
import type { ContentStatus, Prisma } from "@prisma/client";

export const metadata = { title: "Questions · Admin" };

const TONE: Record<ContentStatus, "green" | "amber" | "slate" | "red" | "navy"> = { PUBLISHED: "green", IN_REVIEW: "amber", DRAFT: "slate", REJECTED: "red", ARCHIVED: "navy" };

export default async function AdminQuestions({ searchParams }: { searchParams: Promise<{ status?: string; syllabus?: string; q?: string }> }) {
  const sp = await searchParams;
  const syllabi = await prisma.syllabusVersion.findMany({ include: { level: { include: { program: true } } }, orderBy: { createdAt: "asc" } });
  const where: Prisma.QuestionWhereInput = {
    ...(sp.status ? { status: sp.status as ContentStatus } : {}),
    ...(sp.syllabus ? { syllabusVersionId: sp.syllabus } : {}),
    ...(sp.q ? { OR: [{ stem: { contains: sp.q, mode: "insensitive" } }, { externalKey: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [questions, total] = await Promise.all([
    prisma.question.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100, include: { topic: { select: { name: true } }, syllabus: { include: { level: { include: { program: true } } } }, _count: { select: { reports: { where: { status: "open" } }, attemptItems: true } } } }),
    prisma.question.count({ where }),
  ]);
  const withQuestions = syllabi.filter((s) => s.status !== "ARCHIVED");
  return (
    <>
      <PageHeader title="Question bank" description={`${total} matching questions. Publishing requires schema validation and a passing answer-key check.`} actions={<LinkButton href={`/admin/questions/new${sp.syllabus ? `?syllabus=${sp.syllabus}` : ""}`}>New question</LinkButton>} />
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_14rem_10rem_auto]">
        <label className="sr-only" htmlFor="q">Search</label><Input id="q" name="q" defaultValue={sp.q} placeholder="Search stem or key" />
        <label className="sr-only" htmlFor="syllabus">Syllabus</label>
        <Select id="syllabus" name="syllabus" defaultValue={sp.syllabus ?? ""}><option value="">All syllabi</option>{withQuestions.map((s) => <option key={s.id} value={s.id}>{s.level.program.shortName} {s.level.name} — {s.versionLabel}</option>)}</Select>
        <label className="sr-only" htmlFor="status">Status</label>
        <Select id="status" name="status" defaultValue={sp.status ?? ""}><option value="">Any status</option>{Object.keys(TONE).map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}</Select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="p-2 font-medium">Question</th><th className="p-2 font-medium">Exam / topic</th><th className="p-2 font-medium">Type</th><th className="p-2 font-medium">Status</th><th className="p-2 font-medium">Responses</th><th className="p-2 font-medium">Reports</th></tr></thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-b align-top last:border-0">
                <td className="max-w-md p-2"><Link href={`/admin/questions/${q.id}`} className="line-clamp-2 text-navy-800 underline">{q.stem}</Link><span className="text-xs text-slate-400">{q.externalKey} · v{q.version}</span></td>
                <td className="p-2 text-xs">{q.syllabus.level.program.shortName} {q.syllabus.level.name}<br />{q.topic.name}</td>
                <td className="p-2 text-xs">{q.type} · D{q.difficulty}</td>
                <td className="p-2"><Badge tone={TONE[q.status]}>{q.status.replace("_", " ").toLowerCase()}</Badge>{q.origin === "AI_GENERATED" && <Badge tone="blue" className="ml-1">AI</Badge>}</td>
                <td className="p-2">{q._count.attemptItems}</td>
                <td className="p-2">{q._count.reports > 0 ? <Badge tone="red">{q._count.reports} open</Badge> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
