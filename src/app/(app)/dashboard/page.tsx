import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { AccuracyTrend } from "@/components/charts";
import { StartAttemptButton } from "@/components/start-attempt";
import { Alert, Badge, Card, CardTitle, EmptyState, LinkButton, MASTERY_TONE, PageHeader, Progress, Stat, fmtDate, fmtMinutes, pct } from "@/components/ui";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { getAnalytics } from "@/server/analytics/service";
import { getActivePlan, getTasks, overdueCount } from "@/server/planner/service";
import { dueCount } from "@/server/learning/flashcards";
import { currentStreak, weeklyMinutes } from "@/server/learning/gamification";
import { MASTERY_LABEL } from "@/server/adaptive/proficiency";
import { utcDay } from "@/server/planner/generate";

export const metadata = { title: "Dashboard" };

const KIND_LABEL = { learn: "Learn", practice: "Practise", revise: "Revise", timed_practice: "Timed practice", maintain: "Maintain" } as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) {
    return (
      <>
        <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} />
        {sp.denied && <Alert tone="error" className="mb-4">You do not have permission to open that page.</Alert>}
        <EmptyState title="Choose your first certification" description="Tell us which exam you are preparing for and how much time you have. We will set up a diagnostic and a personalised plan." action={<LinkButton href="/onboarding">Get started</LinkButton>} />
      </>
    );
  }
  const today = utcDay(new Date());
  const plan = await getActivePlan(enrollment.id);
  const [analytics, todayTasks, overdue, cardsDue, questionsDue, streak, weekMin, inProgress, lastLesson, notifications] = await Promise.all([
    getAnalytics(user.id, enrollment),
    plan ? getTasks(plan.id, today, today) : Promise.resolve([]),
    plan ? overdueCount(plan.id) : Promise.resolve(0),
    dueCount(user.id),
    prisma.questionReviewState.count({ where: { userId: user.id, dueAt: { lte: new Date() }, question: { syllabusVersionId: enrollment.syllabusVersionId } } }),
    currentStreak(user.id),
    weeklyMinutes(user.id),
    prisma.attempt.findFirst({ where: { userId: user.id, status: { in: ["IN_PROGRESS", "PAUSED"] } }, orderBy: { updatedAt: "desc" } }),
    prisma.lessonProgress.findFirst({ where: { userId: user.id, status: "in_progress" }, orderBy: { startedAt: "desc" }, include: { lesson: true } }),
    prisma.notification.findMany({ where: { userId: user.id, readAt: null }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);
  const weeklyTarget = enrollment.hoursPerDay * enrollment.studyDaysPerWeek * 60;
  const weakest = analytics.topics.filter((t) => t.attempts > 0).sort((a, b) => a.estimate - b.estimate).slice(0, 4);
  const sv = enrollment.syllabusVersionId;
  const daysLeft = analytics.overall.daysToExam;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={
          <>
            {enrollment.program.shortName} {enrollment.level.name}
            {enrollment.targetExamDate ? ` · exam ${fmtDate(enrollment.targetExamDate)} (${daysLeft} days)` : " · no exam date set"}
          </>
        }
        actions={
          <>
            <LinkButton href="/plan" variant="secondary">Full plan</LinkButton>
            <StartAttemptButton fields={{ syllabusVersionId: sv, enrollmentId: enrollment.id, kind: "PRACTICE", count: 10 }} size="md">Quick practice (10 Q)</StartAttemptButton>
          </>
        }
      />
      {sp.denied && <Alert tone="error" className="mb-4">You do not have permission to open that page.</Alert>}
      {sp.welcome && <Alert tone="success" className="mb-4" title="Your plan is ready">Start with today&apos;s tasks below. Estimates will sharpen as you practise.</Alert>}
      {!enrollment.diagnosticAttemptId && (
        <Alert tone="info" className="mb-4" title="Take the diagnostic for a sharper plan">
          <div className="flex flex-wrap items-center gap-3">
            <span>A 20-question baseline across the syllabus. Untimed; answers are shown at the end.</span>
            <StartAttemptButton fields={{ syllabusVersionId: sv, enrollmentId: enrollment.id, kind: "DIAGNOSTIC", count: 20 }}>Start diagnostic</StartAttemptButton>
          </div>
        </Alert>
      )}
      {overdue > 0 && (
        <Alert tone="warning" className="mb-4">
          {overdue} planned task{overdue > 1 ? "s are" : " is"} overdue. <Link href="/plan" className="font-medium underline">Recover missed sessions</Link> to spread them over upcoming days without restarting your plan.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Syllabus coverage" value={pct(analytics.overall.coverage)} hint="Topics studied or practised (not mastery)" />
        <Stat label="Practice accuracy" value={pct(analytics.overall.accuracy)} hint={`${analytics.overall.questionsAnswered} questions answered`} />
        <Stat label="Due for revision" value={cardsDue + questionsDue} hint={`${cardsDue} flashcards · ${questionsDue} questions`} />
        <Stat
          label="This week"
          value={fmtMinutes(weekMin)}
          hint={
            <span className="block">
              <Progress value={(weekMin / Math.max(1, weeklyTarget)) * 100} label="Weekly study target" tone="gold" />
              <span className="mt-1 block">Target {fmtMinutes(weeklyTarget)}</span>
            </span>
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle action={<Link href="/plan" className="text-sm text-navy-700 underline">Open plan</Link>}>Today&apos;s study plan</CardTitle>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-slate-600">{plan ? "Nothing scheduled today — a rest day, or use it for revision." : "No active plan yet."}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {todayTasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${t.status === "DONE" ? "text-slate-400 line-through" : "text-navy-900"}`}>{t.title}</p>
                      <p className="text-xs text-slate-500">{t.activity} · {fmtMinutes(t.estimatedMinutes)}</p>
                    </div>
                    <Badge tone={t.status === "DONE" ? "green" : t.status === "SKIPPED" ? "slate" : "navy"}>{t.status.toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle>Recommended next steps</CardTitle>
            {analytics.recommendations.length === 0 ? (
              <p className="text-sm text-slate-600">Complete the diagnostic or a practice set to receive recommendations.</p>
            ) : (
              <ul className="space-y-3">
                {analytics.recommendations.slice(0, 4).map((r) => (
                  <li key={`${r.topicId}-${r.kind}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900">
                        <Badge tone="gold" className="mr-2">{KIND_LABEL[r.kind]}</Badge>
                        {r.topicName}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{r.reason}</p>
                    </div>
                    {r.kind === "learn" ? (
                      <LinkButton href={`/learn?topic=${r.topicId}`} size="sm" variant="secondary">Open lessons <ArrowRight className="h-3.5 w-3.5" aria-hidden /></LinkButton>
                    ) : r.kind === "revise" ? (
                      <LinkButton href={`/flashcards?topic=${r.topicId}`} size="sm" variant="secondary">Revise</LinkButton>
                    ) : (
                      <StartAttemptButton fields={{ syllabusVersionId: sv, enrollmentId: enrollment.id, kind: "TOPIC_QUIZ", count: 8, topicIds: [r.topicId], mode: r.kind === "timed_practice" ? "TIMED" : "UNTIMED" }} variant="secondary">
                        {r.kind === "timed_practice" ? "Timed set" : "Practise"}
                      </StartAttemptButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle action={<Link href="/analytics" className="text-sm text-navy-700 underline">Analytics</Link>}>Practice accuracy (12 weeks)</CardTitle>
            {analytics.overall.questionsAnswered === 0 ? <p className="text-sm text-slate-600">Your trend appears after your first practice set.</p> : <AccuracyTrend data={analytics.accuracyByWeek} />}
          </Card>
        </div>

        <div className="space-y-6">
          {(inProgress || lastLesson) && (
            <Card>
              <CardTitle>Continue learning</CardTitle>
              <div className="space-y-2">
                {inProgress && (
                  <Link href={`/attempt/${inProgress.id}`} className="block rounded-lg border border-slate-200 p-3 text-sm hover:bg-navy-50">
                    <span className="font-medium text-navy-900">{inProgress.title}</span>
                    <span className="block text-xs text-slate-500">{inProgress.status === "PAUSED" ? "Paused" : "In progress"} · resume</span>
                  </Link>
                )}
                {lastLesson && (
                  <Link href={`/learn/${lastLesson.lessonId}`} className="block rounded-lg border border-slate-200 p-3 text-sm hover:bg-navy-50">
                    <span className="font-medium text-navy-900">{lastLesson.lesson.title}</span>
                    <span className="block text-xs text-slate-500">Lesson in progress</span>
                  </Link>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardTitle action={<Link href="/flashcards" className="text-sm text-navy-700 underline">Review</Link>}>Due flashcards</CardTitle>
            <p className="text-3xl font-semibold text-navy-900">{cardsDue}</p>
            <p className="text-xs text-slate-500">cards due now</p>
            {questionsDue > 0 && (
              <StartAttemptButton className="mt-3" fields={{ syllabusVersionId: sv, enrollmentId: enrollment.id, kind: "REVISION", count: Math.min(15, questionsDue) }} variant="secondary">
                Revise {Math.min(15, questionsDue)} due questions
              </StartAttemptButton>
            )}
          </Card>

          <Card>
            <CardTitle>Weakest topics</CardTitle>
            {weakest.length === 0 ? <p className="text-sm text-slate-600">Not enough evidence yet.</p> : (
              <ul className="space-y-2">
                {weakest.map((t) => (
                  <li key={t.topicId} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-navy-900">{t.name}</span>
                      <Badge tone={MASTERY_TONE[t.mastery]} className="shrink-0 whitespace-nowrap">{MASTERY_LABEL[t.mastery]}</Badge>
                    </div>
                    <Progress value={t.estimate * 100} label={`${t.name} estimate`} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle action={<Link href="/mocks" className="text-sm text-navy-700 underline">Mock center</Link>}>Recent mocks</CardTitle>
            {analytics.mocks.length === 0 ? <p className="text-sm text-slate-600">No mocks yet. Plan your first one once most topics are covered.</p> : (
              <ul className="space-y-1 text-sm">
                {analytics.mocks.slice(-3).reverse().map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <Link href={`/attempt/${m.id}/results`} className="truncate text-navy-800 underline">{fmtDate(m.submittedAt)}</Link>
                    <span className="font-medium">{m.scorePct.toFixed(0)}% raw</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {user.gamificationEnabled && (
            <Card>
              <CardTitle>Consistency</CardTitle>
              <p className="flex items-center gap-2 text-sm text-navy-900"><Flame className="h-4 w-4 text-gold-600" aria-hidden /> {streak}-day study streak</p>
              <p className="mt-1 text-xs text-slate-500">Counts days with real learning activity. Rest days are part of a healthy plan.</p>
            </Card>
          )}

          {notifications.length > 0 && (
            <Card>
              <CardTitle action={<Link href="/notifications" className="text-sm text-navy-700 underline">All</Link>}>Notifications</CardTitle>
              <ul className="space-y-2 text-sm">
                {notifications.map((n) => <li key={n.id}><p className="font-medium text-navy-900">{n.title}</p><p className="text-xs text-slate-600">{n.body}</p></li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
