import { notFound, redirect } from "next/navigation";
import { AttemptRunner } from "@/components/attempt/runner";
import { UnofficialNotice } from "@/components/ui";
import { requireUser } from "@/server/auth/current";
import { AttemptError, getAttemptView } from "@/server/assessment/service";
import { prisma } from "@/server/db";

export const metadata = { title: "Assessment" };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let view;
  try {
    view = await getAttemptView(user.id, id);
  } catch (e) {
    if (e instanceof AttemptError) notFound();
    throw e;
  }
  if (view.status === "SUBMITTED") redirect(`/attempt/${id}/results`);
  const attempt = await prisma.attempt.findUnique({ where: { id }, select: { enrollmentId: true } });
  return (
    <>
      <AttemptRunner initial={view} enrollmentId={attempt?.enrollmentId ?? null} />
      <UnofficialNotice className="mt-6" />
    </>
  );
}
