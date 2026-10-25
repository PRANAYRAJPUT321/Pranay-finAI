import Link from "next/link";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { getRootTopics } from "@/server/catalog/service";
import { prisma } from "@/server/db";

export const metadata = { title: "Video Lessons" };

export default async function VideosPage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to see its video lessons" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const [topics, progress] = await Promise.all([
    getRootTopics(enrollment.syllabusVersionId),
    prisma.lessonProgress.findMany({ where: { userId: user.id, status: "completed" }, select: { lessonId: true } }),
  ]);
  const done = new Set(progress.map((p) => p.lessonId));
  const groups = topics.map((t) => ({ topic: t, lessons: [...t.lessons, ...t.children.flatMap((c) => c.lessons)] })).filter((g) => g.lessons.length);
  let n = 0;
  return (
    <>
      <PageHeader
        eyebrow="Study / Watch"
        title="Video Lessons"
        description="Short animated, narrated explainers generated from every lesson: the big idea, the key formula, a worked example, the classic exam trap and a summary. Perfect for a first pass or a quick refresh."
      />
      {groups.length === 0 ? (
        <EmptyState title="No video lessons yet" description="Video explainers appear automatically as lessons are published for your exam." />
      ) : (
        <div className="space-y-10">
          {groups.map(({ topic, lessons }) => (
            <section key={topic.id}>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-navy-950">{topic.name}</h2>
              <span className="rule-red mt-2" aria-hidden />
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.map((l) => {
                  const i = n++;
                  const words = l.title.split(" ");
                  return (
                    <Reveal key={l.id} delay={(i % 3) * 80} className="min-w-0">
                      <Link href={`/videos/${l.id}`} className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
                        <div className="bg-ink relative aspect-video overflow-hidden p-5 text-white">
                          <span aria-hidden className="red-beam left-[65%] opacity-70" />
                          <span className="absolute left-4 top-3 font-display text-sm font-bold text-white/50">{String(i + 1).padStart(2, "0")}</span>
                          <p className="headline-xl relative mt-6 line-clamp-3 break-words text-2xl uppercase"><span className="text-gold-500">{words[0]}</span> {words.slice(1).join(" ")}</p>
                          <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                            <span className="grid h-14 w-14 place-items-center rounded-full bg-gold-500 shadow-xl shadow-gold-500/50"><PlayCircle className="h-7 w-7 text-white" aria-hidden /></span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-4 py-3">
                          <span className="truncate text-sm font-semibold text-navy-950">{l.title}</span>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                            {done.has(l.id) && <CheckCircle2 className="h-4 w-4 text-mint-600" aria-label="Lesson completed" />}
                            <Clock className="h-3.5 w-3.5" aria-hidden /> Explainer
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
