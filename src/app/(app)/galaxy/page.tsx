import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ConceptGalaxy } from "@/components/concept-galaxy";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { getRootTopics, weightMid } from "@/server/catalog/service";
import { prisma } from "@/server/db";

export const metadata = { title: "Concept Galaxy" };

export default async function GalaxyPage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to explore its galaxy" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const [topics, profs, qCounts] = await Promise.all([
    getRootTopics(enrollment.syllabusVersionId),
    prisma.topicProficiency.findMany({ where: { userId: user.id } }),
    prisma.question.groupBy({ by: ["topicId"], where: { syllabusVersionId: enrollment.syllabusVersionId, status: "PUBLISHED" }, _count: true }),
  ]);
  const prof = new Map(profs.map((p) => [p.topicId, p]));
  const qc = new Map(qCounts.map((q) => [q.topicId, q._count]));
  const data = topics.map((t) => {
    const p = prof.get(t.id);
    const lesson = t.lessons[0] ?? t.children.flatMap((c) => c.lessons)[0] ?? null;
    return {
      id: t.id,
      name: t.name,
      weight: Math.round(weightMid(t) * 10) / 10,
      mastery: p?.mastery ?? "NOT_STARTED",
      estimate: p && p.attempts > 0 ? p.estimate : null,
      children: t.children.map((c) => ({ id: c.id, name: c.name })),
      prereqs: t.prerequisites.map((x) => x.prerequisiteId),
      lessonId: lesson?.id ?? null,
      questions: (qc.get(t.id) ?? 0) + t.children.reduce((a, c) => a + (qc.get(c.id) ?? 0), 0),
    };
  });
  return (
    <>
      <PageHeader eyebrow="Study / 3D syllabus map" title="Concept Galaxy" description={`Your whole ${enrollment.program.shortName} ${enrollment.level.name} syllabus as a living solar system. Planet size is exam weight, colour is your mastery, beams are prerequisites. Click any planet to jump into its lesson, explainer or practice.`} />
      <ConceptGalaxy topics={data} examLabel={`${enrollment.program.shortName} ${enrollment.level.name}`} />
    </>
  );
}
