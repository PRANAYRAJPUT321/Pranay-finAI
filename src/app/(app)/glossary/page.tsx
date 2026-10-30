import { PageHeader } from "@/components/ui";
import { GlossaryBrowser } from "@/components/glossary-browser";
import { GLOSSARY } from "@/content/glossary";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { prisma } from "@/server/db";

export const metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  const user = await requireUser();
  const [enrollment, programs] = await Promise.all([
    getPrimaryEnrollment(user.id),
    prisma.examProgram.findMany({ where: { isActive: true }, select: { slug: true, shortName: true }, orderBy: { name: "asc" } }),
  ]);
  const used = new Set(GLOSSARY.flatMap((t) => t.programs));
  return (
    <>
      <PageHeader
        eyebrow="Study / Key terms"
        title="Finance Glossary"
        description={`${GLOSSARY.length} key terms across accounting, audit, corporate finance, economics, investments, risk, alternatives, personal finance, ethics and law — in plain English, with formulas. Add any term to your flashcards in one tap.`}
      />
      <GlossaryBrowser terms={GLOSSARY} programs={programs.filter((p) => used.has(p.slug))} defaultProgram={enrollment?.program.slug} />
    </>
  );
}
