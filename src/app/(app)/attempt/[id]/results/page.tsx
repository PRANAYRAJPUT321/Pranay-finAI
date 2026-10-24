import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, Badge, Card, CardTitle, LinkButton, PageHeader, Stat, UnofficialNotice, fmtDate, fmtMinutes } from "@/components/ui";
import { FeedbackPanel, type FeedbackData } from "@/components/attempt/feedback";
import { ErrorCategorySelect } from "@/components/attempt/error-category";
import { StartAttemptButton } from "@/components/start-attempt";
import { MockTrend } from "@/components/charts";
import { requireUser } from "@/server/auth/current";
import { AttemptError, getAttemptView, listAttempts } from "@/server/assessment/service";
import { ERROR_CATEGORIES } from "@/server/assessment/summary";
import { prisma } from "@/server/db";

export const metadata = { title: "Results" };

const DIFF = ["", "Easier", "Medium", "Harder"];

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let view;
  try {
    view = await getAttemptView(user.id, id);
  } catch (e) {
    if (e instanceof AttemptError) notFound();
    throw e;
  }
  if (view.status !== "SUBMITTED" || !view.summary) redirect(`/attempt/${id}`);
  const s = view.summary;
  const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id }, select: { enrollmentId: true } });
  const priorMocks = view.kind === "MOCK" ? (await listAttempts(user.id, { kind: "MOCK", status: "SUBMITTED", syllabusVersionId: view.syllabusVersionId, take: 10 })).reverse() : [];
  const errorCounts: Record<string, number> = {};
  for (const it of view.items) if (it.errorCategory && !it.feedback?.isCorrect) errorCounts[it.errorCategory] = (errorCounts[it.errorCategory] ?? 0) + 1;
  const weakTopics = s.byTopic.filter((t) => t.pct < 70).slice(0, 3);
  const topicIdByName = new Map((await prisma.topic.findMany({ where: { syllabusVersionId: view.syllabusVersionId, parentId: null }, select: { id: true, name: true } })).map((t) => [t.name, t.id]));

  return (
    <>
      <PageHeader
        title={view.kind === "DIAGNOSTIC" ? "Diagnostic results" : "Results"}
        description={`${view.title} · submitted ${fmtDate(view.submittedAt)}${view.autoSubmitted ? " automatically when time ran out" : ""}`}
        actions={
          <>
            <LinkButton href="/dashboard" variant="secondary">Dashboard</LinkButton>
            {view.kind === "DIAGNOSTIC" ? <LinkButton href="/plan">View my updated plan</LinkButton> : <LinkButton href={view.kind === "MOCK" ? "/mocks" : "/practice"}>Another set</LinkButton>}
          </>
        }
      />
      {view.kind === "DIAGNOSTIC" && (
        <Alert tone="info" className="mb-4" title="Preliminary estimate">
          A diagnostic is a small sample. Treat these results as a starting point; your topic estimates will update as you practise. Your study plan has been rebuilt using these results.
        </Alert>
      )}
      {view.kind === "MOCK" && (
        <Alert tone="warning" className="mb-4">
          Unofficial practice simulation. This is a <strong>raw percentage score</strong> on PD FinPrep questions — it is not an official scaled score and does not predict your exam result.
          {view.config.scaledNote ? ` ${view.config.scaledNote}` : ""}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Raw score" value={`${s.scorePct.toFixed(1)}%`} hint={`${s.correct} of ${s.total} correct`} />
        <Stat label="Answered" value={`${s.answered}/${s.total}`} />
        <Stat label="Time used" value={fmtMinutes(view.elapsedSeconds / 60)} hint={`${Math.round(s.time.avgSecondsPerQuestion)}s per question (target ${Math.round(s.time.targetSecondsPerQuestion)}s)`} />
        <Stat label="Confidence check" value={s.confidence.confidentWrong} hint={`confident but wrong · ${s.confidence.guessedRight} lucky guesses`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Performance by topic</CardTitle>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500"><th className="py-1.5 font-medium">Topic</th><th className="py-1.5 font-medium">Score</th><th className="py-1.5 font-medium">Avg time</th><th /></tr></thead>
            <tbody>
              {s.byTopic.map((t) => (
                <tr key={t.topicId} className="border-b last:border-0">
                  <td className="py-1.5">{t.topicName}</td>
                  <td className="py-1.5"><span className={t.pct >= 70 ? "text-emerald-700" : t.pct >= 50 ? "text-amber-700" : "text-red-700"}>{t.correct}/{t.total}</span></td>
                  <td className="py-1.5 text-slate-600">{Math.round(t.avgSeconds)}s</td>
                  <td className="py-1.5 text-right">{t.total > 0 && t.pct < 100 && <StartAttemptButton fields={{ syllabusVersionId: view.syllabusVersionId, enrollmentId: attempt.enrollmentId, kind: "TOPIC_QUIZ", count: 6, topicIds: [t.topicId] }} variant="ghost">Practise</StartAttemptButton>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardTitle>Difficulty, sections and time</CardTitle>
          <ul className="space-y-1 text-sm">
            {s.byDifficulty.map((d) => <li key={d.difficulty} className="flex justify-between"><span>{DIFF[d.difficulty]} questions</span><span>{d.correct}/{d.total}</span></li>)}
          </ul>
          {s.bySection.length > 1 && (
            <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
              {s.bySection.map((x) => <li key={x.section} className="flex justify-between"><span>{view.config.sections[x.section]?.name}</span><span>{x.correct}/{x.total}</span></li>)}
            </ul>
          )}
          <ul className="mt-3 space-y-1 border-t pt-3 text-sm text-slate-700">
            <li>{s.time.slowQuestions} question{s.time.slowQuestions === 1 ? "" : "s"} took more than 1.5× the target time.</li>
            <li>{s.time.rushedQuestions} wrong answer{s.time.rushedQuestions === 1 ? "" : "s"} given in under 30% of the target time (possible rushing).</li>
          </ul>
          {Object.keys(errorCounts).length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="text-sm font-medium text-navy-900">Error types</p>
              <div className="mt-1 flex flex-wrap gap-2">{Object.entries(errorCounts).map(([k, v]) => <Badge key={k} tone="red">{ERROR_CATEGORIES[k] ?? k}: {v}</Badge>)}</div>
            </div>
          )}
        </Card>
      </div>

      {weakTopics.length > 0 && (
        <Card className="mt-6">
          <CardTitle>What to do next</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {weakTopics.map((t) => <li key={t.topicId}>Review <strong>{t.topicName}</strong> ({t.correct}/{t.total}) — revisit the lesson, then take a short topic quiz.{topicIdByName.has(t.topicName) && <> <Link className="underline" href={`/learn?topic=${t.topicId}`}>Open lessons</Link></>}</li>)}
            <li>Classify each mistake below — patterns in error types guide your revision.</li>
            <li>Missed questions have been added to your spaced-revision queue and mistake flashcards.</li>
          </ul>
        </Card>
      )}

      {priorMocks.length > 1 && (
        <Card className="mt-6">
          <CardTitle>Comparison across mocks</CardTitle>
          <MockTrend data={priorMocks.map((m, i) => ({ label: `#${i + 1}`, scorePct: m.scorePct ?? 0 }))} />
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-navy-900">Question review</h2>
      <div className="space-y-4">
        {view.items.map((it, i) => (
          <Card key={it.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <Badge tone={it.feedback?.isCorrect ? "green" : "red"}>Q{i + 1} · {it.feedback?.isCorrect ? "Correct" : (it.response ? "Incorrect" : "Not answered")}</Badge>
              <Badge tone="navy">{it.question.topicName}</Badge>
              <Badge>{DIFF[it.question.difficulty]}</Badge>
              <Badge>{it.timeSpentSeconds}s / target {it.question.estimatedSeconds}s</Badge>
              {it.flagged && <Badge tone="gold">Flagged</Badge>}
            </div>
            {it.question.itemSet && <p className="mb-2 rounded bg-navy-50 p-2 text-xs text-slate-700"><strong>{it.question.itemSet.title}:</strong> {it.question.itemSet.vignette}</p>}
            <p className="whitespace-pre-line text-sm text-slate-900">{it.question.stem}</p>
            {it.response && "value" in it.response && <p className="mt-2 text-sm">Your answer: <strong>{String(it.response.value)}</strong></p>}
            {it.response && "text" in it.response && <p className="mt-2 whitespace-pre-line rounded bg-slate-50 p-2 text-sm">Your answer: {String(it.response.text)}</p>}
            {!it.feedback?.isCorrect && <div className="mt-3"><ErrorCategorySelect attemptId={view.id} itemId={it.id} initial={it.errorCategory} /></div>}
            {it.feedback && (
              <details className="mt-2" open={!it.feedback.isCorrect}>
                <summary className="cursor-pointer text-sm font-medium text-navy-800">Explanation</summary>
                <FeedbackPanel
                  feedback={it.feedback as unknown as FeedbackData}
                  selected={(it.response as { selected?: string[] } | null)?.selected ?? []}
                  questionId={it.question.id}
                  type={it.question.type}
                  context={it.question.context}
                  similar={{ syllabusVersionId: view.syllabusVersionId, enrollmentId: attempt.enrollmentId }}
                />
              </details>
            )}
          </Card>
        ))}
      </div>
      <UnofficialNotice className="mt-6" />
    </>
  );
}
