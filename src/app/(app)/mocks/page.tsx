import Link from "next/link";
import { Alert, Card, CardTitle, EmptyState, LinkButton, PageHeader, fmtDate, fmtMinutes } from "@/components/ui";
import { MockForm } from "@/components/practice-form";
import { MockTrend } from "@/components/charts";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { listAttempts, type AttemptConfig } from "@/server/assessment/service";
import { getSyllabus } from "@/server/catalog/service";
import { prisma } from "@/server/db";

export const metadata = { title: "Mock Exams" };

export default async function MocksPage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam first" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const sv = enrollment.syllabusVersionId;
  const [syllabus, topics, history, bank] = await Promise.all([
    getSyllabus(sv),
    prisma.topic.findMany({ where: { syllabusVersionId: sv, parentId: null }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    listAttempts(user.id, { kind: "MOCK", syllabusVersionId: sv, take: 30 }),
    prisma.question.count({ where: { syllabusVersionId: sv, status: "PUBLISHED" } }),
  ]);
  const st = syllabus.parsedStructure;
  const submitted = history.filter((h) => h.status === "SUBMITTED").reverse();
  const total = st.sections.reduce((a, s) => a + s.questionCount, 0);
  return (
    <>
      <PageHeader title="Mock Exam Center" description="Timed simulations that follow the configured structure of your exam as closely as verified information allows." />
      <Alert tone="warning" className="mb-6">
        Unofficial practice simulations written by PD FinPrep — not affiliated with {syllabus.level.program.awardingBody}. Scores are raw percentages; official scoring {st.scoring.passingScoreVerified ? "information is shown in the catalog" : "is not reproduced and no passing score is assumed"}.
      </Alert>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Start a mock</CardTitle>
          <MockForm syllabusVersionId={sv} enrollmentId={enrollment.id} topics={topics} />
        </Card>
        <Card>
          <CardTitle>Configured structure</CardTitle>
          <p className="text-xs text-slate-500">{syllabus.versionLabel} · {syllabus.verificationStatus === "VERIFIED" ? "verified" : "unverified"}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {st.sections.map((s) => <li key={s.name} className="flex justify-between gap-2"><span>{s.name}</span><span className="text-slate-600">{s.questionCount} Q{s.minutes ? ` · ${fmtMinutes(s.minutes)}` : ""}</span></li>)}
          </ul>
          <p className="mt-3 text-sm text-slate-600">Navigation: {st.navigation === "within_section" ? "free within a section; finished sections close" : "free across the exam"}.</p>
          <p className="mt-2 text-sm text-slate-600">Calculator: {st.calculatorPolicy}</p>
          {bank < total && <p className="mt-3 text-xs text-amber-800">The question bank has {bank} questions, fewer than the {total} in the real format. Full mocks are scaled proportionally and say so.</p>}
        </Card>
      </div>
      <Card className="mt-6">
        <CardTitle>Mock history</CardTitle>
        {history.length === 0 ? <p className="text-sm text-slate-600">No mocks yet.</p> : (
          <>
            {submitted.length > 1 && <MockTrend data={submitted.map((m, i) => ({ label: `#${i + 1}`, scorePct: m.scorePct ?? 0 }))} />}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-slate-500"><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Type</th><th className="py-1.5 font-medium">Score (raw)</th><th className="py-1.5 font-medium">Time used</th><th /></tr></thead>
                <tbody>
                  {history.map((m) => {
                    const cfg = m.config as unknown as AttemptConfig;
                    return (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-1.5">{fmtDate(m.startedAt)}</td>
                        <td className="py-1.5 capitalize">{cfg.mockType ?? "full"}</td>
                        <td className="py-1.5">{m.status === "SUBMITTED" ? `${m.correctCount}/${m.totalCount} (${(m.scorePct ?? 0).toFixed(1)}%)` : "In progress"}</td>
                        <td className="py-1.5">{m.status === "SUBMITTED" ? `${fmtMinutes(m.elapsedSeconds / 60)}${m.timeLimitSeconds ? ` of ${fmtMinutes(m.timeLimitSeconds / 60)}` : ""}` : "—"}</td>
                        <td className="py-1.5 text-right"><Link href={m.status === "SUBMITTED" ? `/attempt/${m.id}/results` : `/attempt/${m.id}`} className="text-navy-800 underline">{m.status === "SUBMITTED" ? "Report" : "Resume"}</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
