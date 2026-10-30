import { PageHeader } from "@/components/ui";
import { FocusTimer } from "@/components/focus-timer";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { utcDay } from "@/server/planner/generate";

export const metadata = { title: "Focus Timer" };

export default async function FocusPage() {
  const user = await requireUser();
  const today = await prisma.studyLog.aggregate({ where: { userId: user.id, date: utcDay(new Date()) }, _sum: { minutes: true } });
  return (
    <>
      <PageHeader eyebrow="Study / Deep work" title="Focus Timer" description="Pomodoro-style focus sessions with automatic breaks. Every completed session is logged as study time, so it counts towards your streak and weekly target." />
      <FocusTimer todayMinutes={today._sum.minutes ?? 0} />
    </>
  );
}
