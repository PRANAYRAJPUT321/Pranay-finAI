import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { GroupForms } from "@/components/account-forms";
import { SubmitButton } from "@/components/forms";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { addDays, utcDay } from "@/server/planner/generate";
import { leaveGroupAction, toggleShareAction } from "@/app/actions/account";

export const metadata = { title: "Study Groups" };

export default async function GroupsPage() {
  const user = await requireUser();
  const memberships = await prisma.studyGroupMember.findMany({
    where: { userId: user.id },
    include: { group: { include: { members: { include: { user: { select: { id: true, name: true } } } } } } },
  });
  const day = utcDay(new Date());
  const monday = addDays(day, -((day.getUTCDay() + 6) % 7));
  const memberIds = [...new Set(memberships.flatMap((m) => m.group.members.filter((x) => x.shareProgress).map((x) => x.userId)))];
  const minutes = await prisma.studyLog.groupBy({ by: ["userId"], where: { userId: { in: memberIds }, date: { gte: monday } }, _sum: { minutes: true } });
  const minOf = new Map(minutes.map((m) => [m.userId, m._sum.minutes ?? 0]));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Study groups" description="Optional. Share weekly study time with a small group or an accountability partner. Only members who opt in share their progress — there are no public leaderboards." />
      <Card><GroupForms /></Card>
      {memberships.map((m) => {
        const me = m.group.members.find((x) => x.userId === user.id)!;
        return (
          <Card key={m.groupId}>
            <CardTitle action={<Badge tone="navy">Invite code: {m.group.inviteCode}</Badge>}>{m.group.name}</CardTitle>
            <ul className="divide-y divide-slate-100 text-sm">
              {m.group.members.map((x) => (
                <li key={x.userId} className="flex justify-between py-2">
                  <span>{x.user.name}{x.userId === user.id ? " (you)" : ""}</span>
                  <span className="text-slate-600">{x.shareProgress ? `${Math.round((minOf.get(x.userId) ?? 0) / 6) / 10} h this week` : "not sharing"}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <form action={toggleShareAction.bind(null, m.groupId, !me.shareProgress)}><SubmitButton size="sm" variant="secondary">{me.shareProgress ? "Stop sharing my progress" : "Share my progress"}</SubmitButton></form>
              <form action={leaveGroupAction.bind(null, m.groupId)}><SubmitButton size="sm" variant="ghost">Leave group</SubmitButton></form>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
