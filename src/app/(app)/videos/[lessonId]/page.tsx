import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, FileDown, Info } from "lucide-react";
import { LinkButton, PageHeader } from "@/components/ui";
import { VideoPlayer } from "@/components/video-player";
import { StartAttemptButton } from "@/components/start-attempt";
import { requireUser } from "@/server/auth/current";
import { getLessonExplainer } from "@/server/learning/videos";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { totalSeconds } from "@/lib/video/script";
import { prisma } from "@/server/db";

export const metadata = { title: "Video explainer" };

export default async function VideoPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await requireUser();
  const { lessonId } = await params;
  const [data, enrollment] = await Promise.all([getLessonExplainer(lessonId), getPrimaryEnrollment(user.id)]);
  if (!data) notFound();
  const { lesson, scenes } = data;
  const sameSyllabus = enrollment?.syllabusVersionId === lesson.topic.syllabusVersionId;
  const topicId = lesson.topic.parentId ?? lesson.topicId;
  const hasQuestions = sameSyllabus && (await prisma.question.count({ where: { status: "PUBLISHED", topic: { OR: [{ id: topicId }, { parentId: topicId }] } } })) > 0;
  const mins = Math.max(1, Math.round(totalSeconds(scenes) / 60));
  const quiz = hasQuestions && enrollment ? (
    <StartAttemptButton fields={{ syllabusVersionId: enrollment.syllabusVersionId, enrollmentId: enrollment.id, kind: "TOPIC_QUIZ", count: 8, topicIds: [topicId] }} variant="gold">Topic quiz</StartAttemptButton>
  ) : undefined;
  return (
    <div className="mx-auto max-w-5xl">
      <nav className="mb-2 text-xs text-slate-500" aria-label="Breadcrumb"><Link href="/videos" className="underline">Video lessons</Link> / {lesson.topic.name}</nav>
      <PageHeader
        eyebrow={`Video lesson · about ${mins} min · ${scenes.length} chapters`}
        title={lesson.title}
        actions={
          <>
            <LinkButton href={`/learn/${lesson.id}`} variant="secondary" size="sm"><BookOpen className="h-4 w-4" aria-hidden /> Lesson</LinkButton>
            <a href={`/api/materials/lesson/${lesson.id}`} download className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white hover:text-navy-950"><FileDown className="h-4 w-4" aria-hidden /> PDF notes</a>
          </>
        }
      />
      <VideoPlayer scenes={scenes} title={lesson.title} lessonHref={`/learn/${lesson.id}`} quizSlot={quiz} />
      <p className="mt-5 flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Generated explainer: scenes and narration are produced automatically from this lesson&apos;s reviewed content (nothing is added beyond it). Narration uses your device&apos;s text-to-speech voice — if you hear nothing, check your volume or turn on captions. Keyboard: Space play/pause · ← → chapters · M mute · C captions.
      </p>
    </div>
  );
}
