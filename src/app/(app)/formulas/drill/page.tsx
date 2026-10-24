import { FormulaDrill } from "@/components/formula-drill";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";

export const metadata = { title: "Formula recall drill" };

export default async function DrillPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const user = await requireUser();
  const { category } = await searchParams;
  const syllabi = (await prisma.enrollment.findMany({ where: { userId: user.id, status: "active" }, select: { syllabusVersionId: true } })).map((e) => e.syllabusVersionId);
  const formulas = await prisma.formula.findMany({
    where: { ...(category ? { category } : {}), ...(syllabi.length ? { topics: { some: { topic: { syllabusVersionId: { in: syllabi } } } } } : {}) },
    select: { id: true, name: true, expression: true, category: true, assumptions: true },
  });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Formula recall drill" description="Active recall of formulas for your exams. Missed formulas can be added to your spaced-repetition flashcards. To practise applying formulas, use the practice buttons on each formula page." />
      <FormulaDrill formulas={formulas} />
    </div>
  );
}
