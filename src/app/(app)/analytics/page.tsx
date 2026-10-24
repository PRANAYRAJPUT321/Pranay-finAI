import Link from "next/link";
import { Alert, Badge, Card, CardTitle, EmptyState, LinkButton, MASTERY_TONE, PageHeader, Progress, Stat, fmtDate, pct } from "@/components/ui";
import { AccuracyTrend, HoursChart, MockTrend, RetentionTrend } from "@/components/charts";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { getAnalytics } from "@/server/analytics/service";
import { MASTERY_LABEL, MASTERY_RULES } from "@/server/adaptive/proficiency";
import { ERROR_CATEGORIES } from "@/server/assessment/summary";
import { ACHIEVEMENTS } from "@/server/learning/gamification";
import { prisma } from "@/server/db";

export const metadata = { title: "Analytics" };

const STATUS_TONE = { good: "green", watch: "amber", gap: "red", unknown: "slate" } as const;

export default async function AnalyticsPage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to see analytics" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const [a, achievements] = await Promise.all([getAnalytics(user.id, enrollment), prisma.achievement.findMany({ where: { userId: user.id }, orderBy: { earnedAt: "desc" } })]);
  const r = a.readiness;
  const best = a.mocks.length ? Math.max(...a.mocks.map((m) => m.scorePct)) : null;
  const weeklyTarget = enrollment.hoursPerDay * enrollment.studyDaysPerWeek;
  return (
    <>
      <PageHeader title="Performance analytics" description={`${enrollment.program.shortName} ${enrollment.level.name}. Coverage (what you have studied) is reported separately from mastery (what practice shows you can do).`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Syllabus coverage" value={pct(a.overall.coverage)} hint="Studied or ≥5 questions practised" />
        <Stat label="Topics proficient+" value={`${a.overall.masteredOrProficient}/${a.topics.length}`} hint="Requires sufficient evidence" />
        <Stat label="Practice accuracy" value={pct(a.overall.accuracy)} hint={`${a.overall.questionsAnswered} answers`} />
        <Stat label="Avg solving time" value={a.overall.avgSeconds ? `${Math.round(a.overall.avgSeconds)}s` : "—"} hint={a.overall.avgTarget ? `target ${Math.round(a.overall.avgTarget)}s` : undefined} />
        <Stat label="Study hours (total)" value={a.overall.studyHours.toFixed(1)} />
        <Stat label="Plan compliance" value={pct(a.overall.planCompliance)} hint="Tasks done of tasks due so far" />
        <Stat label="Revision compliance" value={pct(a.overall.revisionCompliance)} hint="Revision tasks done of those due" />
        <Stat label="Remaining planned study" value={a.overall.remainingStudyHours === null ? "—" : `${a.overall.remainingStudyHours.toFixed(0)} h`} hint={a.overall.daysToExam !== null ? `${a.overall.daysToExam} days to exam` : "No exam date"} />
      </div>

      <Card className="mt-6" id="readiness">
        <CardTitle>Exam readiness assessment</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={r.category === "CONSISTENTLY_STRONG" ? "green" : r.category === "APPROACHING" ? "blue" : r.category === "BUILDING" ? "amber" : "slate"} className="text-sm">{r.label}</Badge>
          <p className="text-sm text-slate-700">{r.description}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {r.components.map((c) => (
            <div key={c.key} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-navy-900">{c.label}</p><Badge tone={STATUS_TONE[c.status]}>{c.status === "unknown" ? "no data" : c.status}</Badge></div>
              <p className="mt-1 text-lg font-semibold">{c.value}</p>
              <p className="text-xs text-slate-500">{c.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
          <div><p className="font-medium text-navy-900">Strengths</p><p className="text-slate-700">{r.strengths.join(", ") || "Not enough evidence yet"}</p></div>
          <div><p className="font-medium text-navy-900">Critical gaps</p><p className="text-slate-700">{r.criticalGaps.join(", ") || "None identified"}</p></div>
          <div><p className="font-medium text-navy-900">Revise next</p><p className="text-slate-700">{r.reviseTopics.join(", ") || "—"}</p></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
          <div><p className="font-medium text-navy-900">Recommended mocks</p><p className="text-slate-700">{r.recommendedMocks}</p></div>
          <div><p className="font-medium text-navy-900">Suggested final revision</p><ul className="list-disc pl-5 text-slate-700">{r.finalRevision.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
        <Alert tone="warning" className="mt-4" title="Limitations">
          <ul className="list-disc pl-5">{r.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </Alert>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardTitle>Practice accuracy by week</CardTitle><AccuracyTrend data={a.accuracyByWeek} /></Card>
        <Card><CardTitle>Study hours by week</CardTitle><HoursChart data={a.hoursByWeek} target={weeklyTarget} /></Card>
        <Card><CardTitle>Flashcard retention by week</CardTitle><RetentionTrend data={a.retentionByWeek} /></Card>
        <Card>
          <CardTitle action={<Link href="/mocks" className="text-sm text-navy-700 underline">Mock center</Link>}>Mock exam history</CardTitle>
          {a.mocks.length === 0 ? <p className="text-sm text-slate-600">No mocks yet.</p> : (
            <>
              <MockTrend data={a.mocks.map((m, i) => ({ label: `#${i + 1}`, scorePct: m.scorePct }))} />
              <p className="mt-2 text-xs text-slate-500">Personal best: {best?.toFixed(1)}% (raw, unofficial practice).</p>
            </>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>Topic-level mastery and coverage</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-2 font-medium">Topic</th><th className="py-2 pr-2 font-medium">Weight</th><th className="py-2 pr-2 font-medium">Lessons</th><th className="py-2 pr-2 font-medium">Answers</th><th className="py-2 pr-2 font-medium">Estimate</th><th className="py-2 pr-2 font-medium">Status</th><th className="py-2 font-medium">Pace</th></tr></thead>
            <tbody>
              {a.topics.map((t) => (
                <tr key={t.topicId} className="border-b last:border-0">
                  <td className="py-2 pr-2 font-medium text-navy-900">{t.name}</td>
                  <td className="py-2 pr-2">{t.weight ? `~${t.weight}%` : "—"}</td>
                  <td className="py-2 pr-2">{t.lessonsTotal ? `${t.lessonsCompleted}/${t.lessonsTotal}` : "—"}</td>
                  <td className="py-2 pr-2">{t.correct}/{t.attempts}</td>
                  <td className="w-32 py-2 pr-2">{t.attempts > 0 ? <><Progress value={t.estimate * 100} label={`${t.name} estimate`} /><span className="text-xs text-slate-500">{Math.round(t.estimate * 100)}%</span></> : "—"}</td>
                  <td className="py-2 pr-2"><Badge tone={MASTERY_TONE[t.mastery]} className="whitespace-nowrap">{MASTERY_LABEL[t.mastery]}</Badge></td>
                  <td className="py-2">{t.avgTimeRatio ? `${t.avgTimeRatio.toFixed(2)}×` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Estimates are a transparent heuristic: recency-weighted accuracy (30-day half-life), adjusted for difficulty and shrunk toward 50% for small samples. “Mastered” requires an estimate ≥ {MASTERY_RULES.masteredMinEstimate * 100}%, at least {MASTERY_RULES.masteredMinAttempts} answers over {MASTERY_RULES.masteredMinSessions}+ sessions and acceptable delayed recall. This model has not been statistically validated.
        </p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Recurring mistakes</CardTitle>
          {Object.keys(a.errorCounts).length === 0 && a.wrongByTopic.length === 0 ? <p className="text-sm text-slate-600">No mistakes recorded yet.</p> : (
            <>
              <div className="flex flex-wrap gap-2">{Object.entries(a.errorCounts).sort((x, y) => y[1] - x[1]).map(([k, v]) => <Badge key={k} tone="red">{ERROR_CATEGORIES[k] ?? k}: {v}</Badge>)}</div>
              <ul className="mt-3 space-y-1 text-sm">{a.wrongByTopic.map((w) => <li key={w.name} className="flex justify-between"><span>{w.name}</span><span className="text-slate-600">{w.wrong} wrong</span></li>)}</ul>
            </>
          )}
        </Card>
        <Card>
          <CardTitle>Areas requiring attention</CardTitle>
          {a.recommendations.length === 0 ? <p className="text-sm text-slate-600">Nothing urgent.</p> : <ul className="space-y-2 text-sm">{a.recommendations.map((x) => <li key={x.topicId + x.kind}><strong>{x.topicName}</strong> — {x.reason}</li>)}</ul>}
        </Card>
      </div>

      {user.gamificationEnabled && (
        <Card className="mt-6" id="achievements">
          <CardTitle>Milestones</CardTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(ACHIEVEMENTS).map(([key, def]) => {
              const got = achievements.find((x) => x.key === key);
              return (
                <div key={key} className={`rounded-lg border p-3 text-sm ${got ? "border-gold-300 bg-gold-50" : "border-slate-200 opacity-60"}`}>
                  <p className="font-medium text-navy-900">{def.title}</p>
                  <p className="text-xs text-slate-600">{def.description}</p>
                  {got && <p className="mt-1 text-xs text-gold-700">Earned {fmtDate(got.earnedAt)}</p>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Milestones reward learning actions (lessons, practice, revision, mocks), not time spent in the app. Turn them off in Settings.</p>
        </Card>
      )}
    </>
  );
}
