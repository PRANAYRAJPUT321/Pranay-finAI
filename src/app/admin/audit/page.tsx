import { Button, Input, PageHeader } from "@/components/ui";
import { prisma } from "@/server/db";

export const metadata = { title: "Audit log · Admin" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const logs = await prisma.auditLog.findMany({
    where: q ? { OR: [{ action: { contains: q } }, { entityType: { contains: q } }, { entityId: q }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });
  return (
    <>
      <PageHeader title="Audit log" description="Changes to questions, answer keys, scoring rules, syllabus content, roles and entitlements." />
      <form className="mb-4 flex gap-2"><label htmlFor="aq" className="sr-only">Filter</label><Input id="aq" name="q" defaultValue={q} placeholder="Filter by action, entity type or id" /><Button type="submit" variant="secondary">Filter</Button></form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left text-slate-500"><th className="p-2 font-medium">When (UTC)</th><th className="p-2 font-medium">Actor</th><th className="p-2 font-medium">Action</th><th className="p-2 font-medium">Entity</th><th className="p-2 font-medium">Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b align-top last:border-0">
                <td className="whitespace-nowrap p-2">{l.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                <td className="p-2">{l.actor?.name ?? "system"}</td>
                <td className="p-2 font-mono">{l.action}</td>
                <td className="p-2">{l.entityType} <span className="font-mono text-slate-400">{l.entityId.slice(0, 10)}</span></td>
                <td className="max-w-md p-2">{l.note && <p>{l.note}</p>}<details><summary className="cursor-pointer text-slate-500">before / after</summary><pre className="whitespace-pre-wrap break-all">{JSON.stringify({ before: l.before, after: l.after }, null, 1)}</pre></details></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
