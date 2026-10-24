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
      <aside className="bg-gradient-navy sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden lg:flex">
        <div aria-hidden className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="PD FinPrep dashboard"><Logo inverted /></Link>
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks showAdmin={showAdmin} />
        </nav>
        <p className="px-5 pb-4 text-[11px] leading-snug text-navy-300">Unofficial preparation platform. Not affiliated with any examination body.</p>
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div aria-hidden className="aurora aurora-light h-[28rem] opacity-60" />
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/60 bg-white/70 px-4 shadow-sm shadow-navy-900/5 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNav showAdmin={showAdmin} />
            <Link href="/dashboard" className="lg:hidden" aria-label="Dashboard"><Logo compact /></Link>
            {enrollment ? (
              <Link href="/exams" className="truncate rounded-full border border-gold-300/70 bg-gradient-to-r from-gold-50 to-white px-3 py-1 text-sm font-medium text-navy-800 shadow-sm transition hover:shadow-md" title="Switch exam">
                {enrollment.program.shortName} · {enrollment.level.name}
              </Link>
            ) : (
              <Link href="/onboarding" className="rounded-lg bg-gold-100 px-2.5 py-1 text-sm font-medium text-gold-700">Choose an exam</Link>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/notifications" className="relative rounded-lg p-2 text-navy-800 hover:bg-navy-50" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <Bell className="h-5 w-5" aria-hidden />
              {unread > 0 && <span className="pulse-ring absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-950">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <span className="hidden items-center gap-2 text-sm text-slate-700 sm:inline-flex">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-navy-700 to-navy-950 text-xs font-bold text-gold-300 ring-2 ring-gold-400/40">{user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
              {user.name}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-2.5 py-1.5 text-sm text-navy-800 hover:bg-navy-50">Sign out</button>
            </form>
          </div>
        </header>
        <main id="main" className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
