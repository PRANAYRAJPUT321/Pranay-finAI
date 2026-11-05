import { PageHeader } from "@/components/ui";
import { ResourcePageBody } from "@/components/resource-page";
import { RESOURCES } from "@/content/resources";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { prisma } from "@/server/db";

export const metadata = { title: "Resource Hub" };

export default async function HubPage() {
  const user = await requireUser();
  const [enrollment, programs] = await Promise.all([
    getPrimaryEnrollment(user.id),
    prisma.examProgram.findMany({ where: { isActive: true }, select: { slug: true, shortName: true }, orderBy: { name: "asc" } }),
  ]);
  const slug = enrollment?.program.slug;
  const hasForProgram = slug ? RESOURCES.some((r) => r.programs.includes(slug)) : false;
  return (
    <>
      <PageHeader eyebrow="Study / Best of the web" title="Resource Hub" description={`${RESOURCES.length} of the best free resources on the internet — open textbooks, MIT and Yale courses, official exam bodies, accounting standards, real company filings and live economic data — curated for your exam and checked link by link.`} />
      <ResourcePageBody programs={programs} defaultProgram={hasForProgram ? slug : undefined} />
    </>
  );
}
