import Link from "next/link";
import { Alert, Card, CardTitle, PageHeader, Select, fmtDate, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { providerStatus } from "@/server/ai/provider";
import { newTutorSessionAction } from "@/app/actions/tutor";

export const metadata = { title: "AI Tutor" };

const MODES = [
  { key: "TEACH", label: "Teach Me", d: "Clear explanations with examples, at your level." },
  { key: "TEST_THINKING", label: "Test My Thinking", d: "Guiding questions and hints before the answer." },
  { key: "FIND_MISTAKE", label: "Find My Mistake", d: "Paste your working; find the exact error." },
];

export default async function TutorPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const user = await requireUser();
  const { lesson } = await searchParams;
  const [sessions, enrollment] = await Promise.all([
    prisma.tutorSession.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 30, include: { _count: { select: { messages: true } } } }),
    getPrimaryEnrollment(user.id),
  ]);
  const topics = enrollment ? await prisma.topic.findMany({ where: { syllabusVersionId: enrollment.syllabusVersionId, parentId: null }, orderBy: { order: "asc" }, select: { id: true, name: true } }) : [];
  const lessonRow = lesson ? await prisma.lesson.findFirst({ where: { id: lesson, status: "PUBLISHED" }, select: { id: true, title: true } }) : null;
  const status = providerStatus();
  return (
    <>
      <PageHeader title="AI Tutor" description="Grounded in PD FinPrep course material for your exam, with deterministic calculators for every number." />
      {!status.generative ? (
        <Alert tone="warning" className="mb-6" title="Offline mode">
          No AI provider is configured on this server, so the tutor answers by assembling the most relevant course material (no generative model). An administrator can enable a provider by setting <code>ANTHROPIC_API_KEY</code> (or <code>OPENAI_API_KEY</code>) on the server.
        </Alert>
      ) : (
        <Alert tone="info" className="mb-6">Connected to {status.name}. Answers can contain mistakes — check them against the cited lessons and official material.</Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Start a conversation{lessonRow ? ` about “${lessonRow.title}”` : ""}</CardTitle>
          <form action={newTutorSessionAction} className="space-y-4">
            {lessonRow && <input type="hidden" name="lessonId" value={lessonRow.id} />}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Mode</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {MODES.map((m, i) => (
                  <label key={m.key} className="cursor-pointer rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-navy-700 has-[:checked]:bg-navy-50">
                    <span className="flex items-center gap-2 font-medium text-navy-900"><input type="radio" name="mode" value={m.key} defaultChecked={i === 0} />{m.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{m.d}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {!lessonRow && topics.length > 0 && (
              <div className="max-w-sm">
                <label htmlFor="topicId" className="mb-1 block text-sm font-medium text-slate-700">Topic (optional)</label>
                <Select id="topicId" name="topicId" defaultValue=""><option value="">Any topic</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
              </div>
            )}
            <SubmitButton>Start</SubmitButton>
          </form>
        </Card>
        <Card>
          <CardTitle>Previous conversations</CardTitle>
          {sessions.length === 0 ? <p className="text-sm text-slate-600">None yet.</p> : (
            <ul className="space-y-2 text-sm">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/tutor/${s.id}`} className="block rounded-lg border border-slate-200 p-2 hover:bg-navy-50">
                    <span className="block truncate font-medium text-navy-900">{s.title}</span>
                    <span className="text-xs text-slate-500"><Badge className="mr-1">{MODES.find((m) => m.key === s.mode)?.label}</Badge>{s._count.messages} messages · {fmtDate(s.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
