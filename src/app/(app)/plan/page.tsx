import Link from "next/link";
import { Alert, Badge, Card, CardTitle, EmptyState, LinkButton, PageHeader, Progress, Stat, TabLinks, fmtDate, fmtMinutes } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { LogStudyForm, RescheduleForm } from "@/components/plan-forms";
import { StartAttemptButton } from "@/components/start-attempt";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { getActivePlan, getTasks, overdueCount } from "@/server/planner/service";
import { addDays, toDateKey, utcDay, type PlanResult, type PlanWarning } from "@/server/planner/generate";
import { rebuildPlanAction, recoverMissedAction, taskStatusAction } from "@/app/actions/learning";
import { prisma } from "@/server/db";

export const metadata = { title: "Study Plan" };

const KIND_TONE = { LEARN: "navy", PRACTICE: "blue", REVISION: "gold", MOCK: "red", REVIEW_MOCK: "amber" } as const;
const KIND_LABEL = { LEARN: "Learn", PRACTICE: "Practice", REVISION: "Revision", MOCK: "Mock", REVIEW_MOCK: "Mock review" } as const;

type View = "day" | "week" | "month";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="No exam selected" action={<LinkButton href="/onboarding">Set up a plan</LinkButton>} />;
  const plan = await getActivePlan(enrollment.id);
  if (!plan) {
    return (
      <>
        <PageHeader title="Study Plan" />
        <EmptyState title="No plan yet" description="Build a plan from your exam date and availability." action={<form action={rebuildPlanAction.bind(null, enrollment.id)}><SubmitButton>Build my plan</SubmitButton></form>} />
      </>
    );
  }
  const view: View = sp.view === "week" || sp.view === "month" ? sp.view : "day";
  const anchor = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? new Date(`${sp.date}T00:00:00Z`) : utcDay(new Date());
  let from = anchor;
  let to = anchor;
  if (view === "week") {
    from = addDays(anchor, -((anchor.getUTCDay() + 6) % 7));
    to = addDays(from, 6);
  } else if (view === "month") {
    from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  }
  const step = view === "day" ? 1 : view === "week" ? 7 : 31;
  const prev = toDateKey(view === "month" ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1)) : addDays(anchor, -step));
  const next = toDateKey(view === "month" ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1)) : addDays(anchor, step));
  const [tasks, overdue, totals] = await Promise.all([
    getTasks(plan.id, from, to),
    overdueCount(plan.id),
    prisma.studyTask.groupBy({ by: ["status"], where: { planId: plan.id }, _count: true, _sum: { estimatedMinutes: true } }),
  ]);
  const warnings = (plan.warnings as unknown as PlanWarning[]) ?? [];
  const summary = plan.summary as unknown as PlanResult["summary"] | null;
  const doneCount = totals.find((t) => t.status === "DONE")?._count ?? 0;
  const totalCount = totals.reduce((a, t) => a + t._count, 0);
  const todayKey = toDateKey(utcDay(new Date()));
  const byDate = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const k = toDateKey(t.date);
    byDate.set(k, [...(byDate.get(k) ?? []), t]);
  }
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(toDateKey(d));
  const sv = enrollment.syllabusVersionId;

  return (
    <>
      <PageHeader
        title="Study Plan"
        description={`${enrollment.program.shortName} ${enrollment.level.name} · ${fmtDate(plan.startDate)} → exam ${fmtDate(plan.examDate)} · ${plan.weeklyHours.toFixed(1)} h/week`}
        actions={
          <>
            {overdue > 0 && <form action={recoverMissedAction.bind(null, enrollment.id)}><SubmitButton variant="gold" pendingLabel="Rescheduling…">Recover {overdue} missed task{overdue > 1 ? "s" : ""}</SubmitButton></form>}
            <form action={rebuildPlanAction.bind(null, enrollment.id)}><SubmitButton variant="secondary" pendingLabel="Rebuilding…">Rebuild from latest results</SubmitButton></form>
            <a href="/api/calendar" download className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-navy-950">Add to calendar (.ics)</a>
          </>
        }
      />
      {warnings.map((w) => <Alert key={w.code} tone={w.code === "OVERLOADED" || w.code === "TOO_SHORT" ? "warning" : "info"} className="mb-3" title={w.code === "OVERLOADED" ? "Realistic workload warning" : undefined}>{w.message}</Alert>)}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Plan progress" value={`${doneCount}/${totalCount}`} hint={<Progress value={(doneCount / Math.max(1, totalCount)) * 100} label="Tasks completed" tone="green" />} />
        <Stat label="Study days" value={summary?.studyDays ?? "—"} hint={`${summary?.revisionDays ?? 0} reserved for final revision`} />
        <Stat label="Estimated need" value={`${summary?.requiredHours ?? "—"} h`} hint={`${summary?.availableHours ?? "—"} h available`} />
        <Stat label="Mocks scheduled" value={summary?.mocks ?? 0} hint="In the final revision window" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TabLinks
            active={view}
            tabs={[
              { key: "day", label: "Daily", href: `/plan?view=day&date=${toDateKey(anchor)}` },
              { key: "week", label: "Weekly", href: `/plan?view=week&date=${toDateKey(anchor)}` },
              { key: "month", label: "Monthly", href: `/plan?view=month&date=${toDateKey(anchor)}` },
            ]}
          />
          <div className="mb-4 flex items-center justify-between gap-2 text-sm">
            <Link href={`/plan?view=${view}&date=${prev}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-navy-50">← Previous</Link>
            <span className="font-medium text-navy-900">{view === "day" ? fmtDate(from, { weekday: "long", day: "numeric", month: "long" }) : view === "week" ? `${fmtDate(from)} – ${fmtDate(to)}` : fmtDate(from, { month: "long", year: "numeric" })}</span>
            <Link href={`/plan?view=${view}&date=${next}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-navy-50">Next →</Link>
          </div>
          {view === "month" ? (
            <div className="grid grid-cols-7 gap-1 text-xs" role="grid" aria-label="Monthly plan">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1 text-center font-medium text-slate-500" role="columnheader">{d}</div>)}
              {Array.from({ length: (from.getUTCDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map((d) => {
                const list = byDate.get(d) ?? [];
                const mins = list.reduce((a, t) => a + t.estimatedMinutes, 0);
                const done = list.filter((t) => t.status === "DONE").length;
                return (
                  <Link key={d} href={`/plan?view=day&date=${d}`} role="gridcell" className={`min-h-16 rounded-lg border p-1.5 hover:bg-navy-50 ${d === todayKey ? "border-gold-500" : "border-slate-200"} ${list.length ? "bg-white" : "bg-slate-50"}`}>
                    <span className="font-medium text-navy-900">{Number(d.slice(8))}</span>
                    {list.length > 0 && <span className="mt-1 block text-slate-600">{fmtMinutes(mins)}</span>}
                    {list.some((t) => t.kind === "MOCK") && <Badge tone="red" className="mt-1">Mock</Badge>}
                    {list.length > 0 && <span className="block text-slate-400">{done}/{list.length} done</span>}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {days.map((d) => {
                const list = byDate.get(d) ?? [];
                if (view === "week" && list.length === 0) return <p key={d} className="text-sm text-slate-400">{fmtDate(d, { weekday: "short", day: "numeric", month: "short" })} — rest day</p>;
                return (
                  <Card key={d} className={d === todayKey ? "border-gold-400" : ""}>
                    <CardTitle>{fmtDate(d, { weekday: "long", day: "numeric", month: "short" })}{d === todayKey ? " · Today" : ""}{d < todayKey && list.some((t) => t.status === "PENDING") ? " · missed" : ""}</CardTitle>
                    {list.length === 0 ? <p className="text-sm text-slate-500">No tasks — rest day.</p> : (
                      <ul className="divide-y divide-slate-100">
                        {list.map((t) => (
                          <li key={t.id} className="py-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`text-sm font-medium ${t.status === "DONE" ? "text-slate-400 line-through" : "text-navy-900"}`}>
                                  <Badge tone={KIND_TONE[t.kind]} className="mr-2">{KIND_LABEL[t.kind]}</Badge>{t.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">{t.objective}</p>
                                <p className="text-xs text-slate-500">{t.activity} · {fmtMinutes(t.estimatedMinutes)}{t.practiceTarget ? ` · target ${t.practiceTarget} questions` : ""}{t.revisionDate && t.kind === "LEARN" ? ` · first review ${fmtDate(t.revisionDate)}` : ""}{t.rescheduledFrom ? ` · moved from ${fmtDate(t.rescheduledFrom)}` : ""}</p>
                              </div>
                              <Badge tone={t.status === "DONE" ? "green" : t.status === "SKIPPED" ? "slate" : "navy"}>{t.status.toLowerCase()}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {t.kind === "LEARN" && t.topicId && <LinkButton size="sm" variant="secondary" href={`/learn?topic=${t.topicId}`}>Open lessons</LinkButton>}
                              {(t.kind === "PRACTICE" || t.kind === "REVISION") && t.topicId && (
                                <StartAttemptButton variant="secondary" fields={{ syllabusVersionId: sv, enrollmentId: enrollment.id, kind: t.kind === "REVISION" ? "REVISION" : "TOPIC_QUIZ", count: Math.min(20, Math.max(5, t.practiceTarget)), topicIds: [t.topicId] }}>
                                  Start {t.kind === "REVISION" ? "revision" : "practice"}
                                </StartAttemptButton>
                              )}
                              {t.kind === "MOCK" && <LinkButton size="sm" variant="secondary" href="/mocks">Go to mock center</LinkButton>}
                              {t.kind === "REVIEW_MOCK" && <LinkButton size="sm" variant="secondary" href="/mocks">Mock reports</LinkButton>}
                              {t.status !== "DONE" ? (
                                <form action={taskStatusAction.bind(null, t.id, "DONE")} className="flex items-center gap-1">
                                  <label className="sr-only" htmlFor={`m-${t.id}`}>Minutes spent</label>
                                  <input id={`m-${t.id}`} name="minutes" type="number" min={0} max={600} defaultValue={t.estimatedMinutes} className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs" title="Minutes spent (logged to your study time)" />
                                  <SubmitButton size="sm">Mark done</SubmitButton>
                                </form>
                              ) : (
                                <form action={taskStatusAction.bind(null, t.id, "PENDING")}><SubmitButton size="sm" variant="ghost">Undo</SubmitButton></form>
                              )}
                              {t.status === "PENDING" && <form action={taskStatusAction.bind(null, t.id, "SKIPPED")}><SubmitButton size="sm" variant="ghost">Skip</SubmitButton></form>}
                              {t.status === "PENDING" && <RescheduleForm taskId={t.id} current={toDateKey(t.date)} />}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardTitle>Log study time</CardTitle>
            <p className="mb-3 text-xs text-slate-500">Record study done outside PD FinPrep so weekly targets stay accurate.</p>
            <LogStudyForm enrollmentId={enrollment.id} />
          </Card>
          <Card>
            <CardTitle>How this plan was built</CardTitle>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>Hours per topic follow syllabus weightings, editorial difficulty and your measured proficiency.</li>
              <li>Prerequisite topics are scheduled before the topics that depend on them.</li>
              <li>Each topic gets spaced reviews about 1, 7 and 21 days after you first study it.</li>
              <li>The final ~20% of study days are reserved for cumulative revision and full-length mocks.</li>
              <li>Missed tasks can be redistributed without restarting; completed work is never lost.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
