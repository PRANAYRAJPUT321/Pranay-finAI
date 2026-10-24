import Link from "next/link";
import { Card, EmptyState, PageHeader, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { markNotificationsReadAction } from "@/app/actions/account";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" description="Reminders and milestones. Control them in Settings." actions={items.some((i) => !i.readAt) ? <form action={markNotificationsReadAction}><SubmitButton variant="secondary" size="sm">Mark all read</SubmitButton></form> : undefined} />
      {items.length === 0 ? <EmptyState title="No notifications" /> : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={`p-4 ${n.readAt ? "" : "border-gold-300"}`}>
              <div className="flex justify-between gap-2"><p className="font-medium text-navy-900">{n.title}</p><span className="text-xs text-slate-500">{fmtDate(n.createdAt)}</span></div>
              <p className="text-sm text-slate-600">{n.body}</p>
              {n.link && <Link href={n.link} className="text-sm text-navy-800 underline">Open</Link>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
