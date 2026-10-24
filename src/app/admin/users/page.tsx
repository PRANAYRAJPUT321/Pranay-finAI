import { Badge, Input, PageHeader, Select, Button, fmtDate } from "@/components/ui";
import { StateForm } from "@/components/state-form";
import { SubmitButton } from "@/components/forms";
import { requireRolePage } from "@/server/auth/current";
import { ADMIN_ROLES } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { userRoleAction } from "@/app/actions/admin";

export const metadata = { title: "Users · Admin" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRolePage(ADMIN_ROLES);
  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, name: true, role: true, tier: true, createdAt: true, lastActiveAt: true, emailVerifiedAt: true },
  });
  return (
    <>
      <PageHeader title="Users and roles" description="Role changes sign the user out everywhere so new permissions apply immediately. Tier grants are manual (billing is not integrated) and audited." />
      <form className="mb-4 flex gap-2"><label htmlFor="uq" className="sr-only">Search users</label><Input id="uq" name="q" defaultValue={q} placeholder="Search email or name" /><Button type="submit" variant="secondary">Search</Button></form>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="p-2 font-medium">User</th><th className="p-2 font-medium">Joined / active</th><th className="p-2 font-medium">Role and tier</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b align-top last:border-0">
                <td className="p-2"><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email} {u.emailVerifiedAt ? <Badge tone="green">verified</Badge> : null}</p></td>
                <td className="p-2 text-xs">{fmtDate(u.createdAt)}<br />{u.lastActiveAt ? fmtDate(u.lastActiveAt) : "—"}</td>
                <td className="p-2">
                  <StateForm action={userRoleAction.bind(null, u.id)} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`r-${u.id}`}>Role</label>
                    <Select id={`r-${u.id}`} name="role" defaultValue={u.role} className="w-auto"><option value="STUDENT">Student</option><option value="CONTENT_MANAGER">Content manager</option><option value="ADMIN">Admin</option></Select>
                    <label className="sr-only" htmlFor={`t-${u.id}`}>Tier</label>
                    <Select id={`t-${u.id}`} name="tier" defaultValue={u.tier} className="w-auto"><option value="FREE">Free</option><option value="PLUS">Plus</option><option value="PREMIUM">Premium</option></Select>
                    <SubmitButton size="sm" variant="secondary">Update</SubmitButton>
                  </StateForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
