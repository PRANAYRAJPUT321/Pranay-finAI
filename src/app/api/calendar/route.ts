import { NextResponse } from "next/server";
import { withUser } from "@/server/api";
import { prisma } from "@/server/db";
import { buildIcs, type CalendarEvent } from "@/server/engagement/calendar";
import { parseExamInfo } from "@/server/catalog/exam-info";
import { addDays, toDateKey, utcDay } from "@/server/planner/generate";

export const dynamic = "force-dynamic";

/** Study plan tasks (next 90 days), target exam dates, exam windows and registration deadlines as an .ics file. */
export const GET = withUser(async ({ user }) => {
  const today = utcDay(new Date());
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: "active" },
    include: {
      program: { select: { shortName: true } },
      level: { select: { name: true, info: true } },
      plans: { where: { status: "active" }, include: { tasks: { where: { date: { gte: today, lte: addDays(today, 90) }, status: "PENDING" }, orderBy: [{ date: "asc" }, { order: "asc" }] } } },
    },
  });
  const events: CalendarEvent[] = [];
  for (const e of enrollments) {
    const label = `${e.program.shortName} ${e.level.name}`;
    if (e.targetExamDate) events.push({ uid: `exam-${e.id}`, date: toDateKey(e.targetExamDate), title: `${label} exam day`, description: "Your target exam date in PD FinPrep. Confirm the date with the examining body." });
    for (const t of e.plans.flatMap((p) => p.tasks)) {
      events.push({ uid: `task-${t.id}`, date: toDateKey(t.date), title: `${label}: ${t.title}`, description: `${t.objective} (about ${t.estimatedMinutes} min)`});
    }
    const info = parseExamInfo(e.level.info);
    for (const [i, w] of (info?.upcoming ?? []).entries()) {
      if (w.start && w.start >= toDateKey(today)) events.push({ uid: `window-${e.id}-${i}`, date: w.start, endDate: w.end, title: `${label}: ${w.label} exam window`, description: `${w.dates}. Dates as of ${info!.asOf} — confirm on ${info!.officialUrl}` });
      if (w.deadline && w.deadline >= toDateKey(today)) events.push({ uid: `deadline-${e.id}-${i}`, date: w.deadline, title: `${label}: registration deadline (${w.label})`, description: `Confirm fees and deadline on ${info!.registrationUrl ?? info!.officialUrl}` });
    }
  }
  const ics = buildIcs(events, new Date(), "PD FinPrep study plan");
  return new NextResponse(ics, {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="pd-finprep-study-calendar.ics"', "cache-control": "private, no-store" },
  });
});
