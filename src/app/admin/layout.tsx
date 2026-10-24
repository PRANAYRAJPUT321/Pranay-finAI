import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireRolePage } from "@/server/auth/current";
import { CONTENT_ROLES } from "@/server/auth/guards";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/lessons", label: "Lessons" },
  { href: "/admin/catalog", label: "Exams & syllabi" },
  { href: "/admin/past-papers", label: "Past papers" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users", admin: true },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side authorization for every admin page.
  const user = await requireRolePage(CONTENT_ROLES);
  return (
    <div className="min-h-screen">
      <header className="bg-navy-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2"><Logo inverted compact /><span className="font-semibold text-white">Admin console</span></Link>
          <nav aria-label="Admin" className="flex flex-1 flex-wrap gap-1">
            {LINKS.filter((l) => !l.admin || user.role === "ADMIN").map((l) => <Link key={l.href} href={l.href} className="rounded px-2 py-1 text-sm text-navy-100 hover:bg-navy-800 hover:text-white">{l.label}</Link>)}
          </nav>
          <Link href="/dashboard" className="text-sm text-gold-400 hover:underline">Back to app</Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
