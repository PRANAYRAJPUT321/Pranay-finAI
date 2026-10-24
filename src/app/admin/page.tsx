import Link from "next/link";
import { Card, CardTitle, PageHeader, Progress, Stat } from "@/components/ui";
import { platformAnalytics } from "@/server/admin/content";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const a = await platformAnalytics();
  return (
    <>
      <PageHeader title="Admin overview" description="Aggregated, non-identifying usage and content-quality metrics." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered users" value={a.users} />
        <Stat label="Active (7 days)" value={a.active7d} />
        <Stat label="Assessments submitted" value={a.submitted} hint={`${a.attempts} started`} />
        <Stat label="Open content reports" value={<Link href="/admin/reports" className="underline">{a.openReports}</Link>} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Question bank by status</CardTitle>
          <ul className="space-y-1 text-sm">{Object.entries(a.questionsByStatus).map(([k, v]) => <li key={k} className="flex justify-between"><Link href={`/admin/questions?status=${k}`} className="underline">{k.replace("_", " ").toLowerCase()}</Link><span>{v}</span></li>)}</ul>
        </Card>
        <Card>
          <CardTitle>Learner accuracy by topic (all users)</CardTitle>
          {a.topicAccuracy.length === 0 ? <p className="text-sm text-slate-600">No responses yet.</p> : (
            <ul className="space-y-2 text-sm">{a.topicAccuracy.map((t) => <li key={t.name}><div className="flex justify-between"><span>{t.name}</span><span className="text-slate-500">{Math.round(t.accuracy * 100)}% of {t.answered}</span></div><Progress value={t.accuracy * 100} label={t.name} /></li>)}</ul>
          )}
          <p className="mt-2 text-xs text-slate-500">Unusually low accuracy can indicate a flawed question — check reports and item statistics.</p>
        </Card>
      </div>
    </>
  );
}
