import Link from "next/link";
import { Bell } from "lucide-react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav";
import { MobileNav } from "@/components/mobile-nav";
import { requireUser } from "@/server/auth/current";
import { hasRole, CONTENT_ROLES } from "@/server/auth/guards";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/server/db";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { ensureDailyReminder } from "@/server/notifications/service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureDailyReminder(user.id);
  const [unread, enrollment] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    getPrimaryEnrollment(user.id),
  ]);
  const showAdmin = hasRole(user, CONTENT_ROLES);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-950 lg:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="PD FinPrep dashboard"><Logo inverted /></Link>
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks showAdmin={showAdmin} />
        </nav>
        <p className="px-5 pb-4 text-[11px] leading-snug text-navy-300">Unofficial preparation platform. Not affiliated with any examination body.</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNav showAdmin={showAdmin} />
            <Link href="/dashboard" className="lg:hidden" aria-label="Dashboard"><Logo compact /></Link>
            {enrollment ? (
              <Link href="/exams" className="truncate rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-navy-800 hover:bg-navy-50" title="Switch exam">
                {enrollment.program.shortName} · {enrollment.level.name}
              </Link>
            ) : (
              <Link href="/onboarding" className="rounded-lg bg-gold-100 px-2.5 py-1 text-sm font-medium text-gold-700">Choose an exam</Link>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/notifications" className="relative rounded-lg p-2 text-navy-800 hover:bg-navy-50" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <Bell className="h-5 w-5" aria-hidden />
              {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-950">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-2.5 py-1.5 text-sm text-navy-800 hover:bg-navy-50">Sign out</button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
