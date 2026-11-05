import { PageHeader } from "@/components/ui";
import { ResourcePageBody } from "@/components/resource-page";
import { RESOURCES } from "@/content/resources";
import { prisma } from "@/server/db";

export const metadata = { title: "Free resources for finance exams", description: "Curated free textbooks, university courses, official exam resources, standards and data for CFA, FRM, CPA, ACCA, CMA, CA, NISM, CFP and more." };
export const dynamic = "force-dynamic";

export default async function PublicResourcesPage() {
  const programs = await prisma.examProgram.findMany({ where: { isActive: true }, select: { slug: true, shortName: true }, orderBy: { name: "asc" } }).catch(() => []);
  return (
    <>
      <PageHeader eyebrow="Free resources" title="Best Of The Web" description={`${RESOURCES.length} hand-picked free resources for finance, accounting, tax and risk exams — every link checked and explained.`} />
      <ResourcePageBody programs={programs} />
    </>
  );
}
