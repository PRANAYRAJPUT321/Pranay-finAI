import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, MASTERY_TONE, PageHeader } from "@/components/ui";
import { StartAttemptButton } from "@/components/start-attempt";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { getRootTopics, weightLabel } from "@/server/catalog/service";
import { MASTERY_LABEL } from "@/server/adaptive/proficiency";
import { prisma } from "@/server/db";

export const metadata = { title: "Learn" };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const user = await requireUser();
  const { topic: focus } = await searchParams;
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to see its lessons" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const [topics, progress, profs, qCounts] = await Promise.all([
    getRootTopics(enrollment.syllabusVersionId),
    prisma.lessonProgress.findMany({ where: { userId: user.id }, select: { lessonId: true, status: true } }),
    prisma.topicProficiency.findMany({ where: { userId: user.id } }),
    prisma.question.groupBy({ by: ["topicId"], where: { syllabusVersionId: enrollment.syllabusVersionId, status: "PUBLISHED" }, _count: true }),
  ]);
  const status = new Map(progress.map((p) => [p.lessonId, p.status]));
  const prof = new Map(profs.map((p) => [p.topicId, p]));
  const qc = new Map(qCounts.map((q) => [q.topicId, q._count]));
  return (
    <>
      <PageHeader title="Learn" description="Structured lessons by syllabus topic. Completing a lesson counts towards coverage — mastery is measured separately through practice." />
      <div className="space-y-4">
        {topics.map((t) => {
          const lessons = [...t.lessons.map((l) => ({ ...l, sub: null as string | null })), ...t.children.flatMap((c) => c.lessons.map((l) => ({ ...l, sub: c.name })))];
          const p = prof.get(t.id);
          const done = lessons.filter((l) => status.get(l.id) === "completed").length;
          return (
            <Card key={t.id} id={`topic-${t.id}`} className={focus === t.id ? "border-gold-400 ring-2 ring-gold-200" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-navy-900">{t.name}</h2>
                  <p className="text-xs text-slate-500">Weight {weightLabel(t)} · {lessons.length} lesson{lessons.length === 1 ? "" : "s"} · {qc.get(t.id) ?? 0} questions{t.prerequisites.length ? " · has prerequisites" : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={MASTERY_TONE[p?.mastery ?? "NOT_STARTED"]}>{MASTERY_LABEL[p?.mastery ?? "NOT_STARTED"]}</Badge>
                  {lessons.length > 0 && <Badge tone={done === lessons.length ? "green" : "slate"}>{done}/{lessons.length} lessons done</Badge>}
                  {(qc.get(t.id) ?? 0) > 0 && <StartAttemptButton fields={{ syllabusVersionId: enrollment.syllabusVersionId, enrollmentId: enrollment.id, kind: "TOPIC_QUIZ", count: 8, topicIds: [t.id] }} variant="secondary">Topic quiz</StartAttemptButton>}
                </div>
              </div>
              {lessons.length > 0 ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {lessons.map((l) => (
                    <li key={l.id}>
                      <Link href={`/learn/${l.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-navy-50">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900">{l.title}</span>
                          <span className="block text-xs text-slate-500">{l.sub ? `${l.sub} · ` : ""}{l.estimatedMinutes} min</span>
                        </span>
                        {status.get(l.id) === "completed" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Completed" /> : status.get(l.id) ? <Badge>In progress</Badge> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Lessons for this topic are not available yet. {t.children.length ? `Covers: ${t.children.map((c) => c.name).join(", ")}.` : ""}</p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
