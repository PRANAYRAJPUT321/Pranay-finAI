import { OnboardingForm, type OnboardingProgram } from "@/components/onboarding-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { weightLabel } from "@/server/catalog/service";

export const metadata = { title: "Set up your preparation" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  await requireUser();
  const { level } = await searchParams;
  const programs = await prisma.examProgram.findMany({
    where: { isActive: true, levels: { some: { syllabi: { some: { status: "CURRENT" } } } } },
    orderBy: { name: "asc" },
    include: {
      levels: {
        where: { syllabi: { some: { status: "CURRENT" } } },
        orderBy: { order: "asc" },
        include: {
          syllabi: {
            where: { status: "CURRENT" },
            take: 1,
            include: { topics: { where: { parentId: null }, orderBy: { order: "asc" } }, _count: { select: { questions: { where: { status: "PUBLISHED" } } } } },
          },
        },
      },
    },
  });
  const data: OnboardingProgram[] = programs
    .map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      awardingBody: p.awardingBody,
      levels: p.levels.map((l) => {
        const s = l.syllabi[0];
        return {
          id: l.id,
          name: l.name,
          syllabusLabel: s.versionLabel,
          verified: s.verificationStatus === "VERIFIED",
          questionCount: s._count.questions,
          topics: s.topics.map((t) => ({ id: t.id, name: t.name, weight: weightLabel(t) })),
        };
      }),
    }))
    .sort((a, b) => Math.max(...b.levels.map((l) => l.questionCount)) - Math.max(...a.levels.map((l) => l.questionCount)));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Set up your preparation" description="A few questions so we can build a realistic plan. You can change any of this later in My Exams." />
      <OnboardingForm programs={data} defaults={{ levelId: level }} />
    </div>
  );
}
