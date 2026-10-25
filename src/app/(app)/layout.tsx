import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav";
import { MobileNav } from "@/components/mobile-nav";
import { CommandPalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notification-bell";
import { requireUser } from "@/server/auth/current";
import { hasRole, CONTENT_ROLES } from "@/server/auth/guards";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/server/db";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { ensureReminders } from "@/server/notifications/service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureReminders(user.id).catch((e) => console.warn("[reminders]", e));
  const [unread, enrollment] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    getPrimaryEnrollment(user.id),
  ]);
  const showAdmin = hasRole(user, CONTENT_ROLES);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-ink sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-white/5 lg:flex">
        <span aria-hidden className="red-beam left-[85%] opacity-40" />
        <div className="relative px-5 py-5">
          <Link href="/dashboard" aria-label="PD FinPrep dashboard"><Logo inverted /></Link>
        </div>
        <nav aria-label="Main" className="relative flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks showAdmin={showAdmin} />
        </nav>
        <div className="relative border-t border-white/10 px-5 py-4">
          <span aria-hidden className="rule-red mb-3" />
          <p className="text-[11px] leading-snug text-navy-200/80">Unofficial preparation platform. Not affiliated with any examination body.</p>
        </div>
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <header className="bg-ink sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/10 px-4 text-white shadow-lg shadow-black/20 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="lg:hidden" aria-label="Dashboard"><Logo compact /></Link>
            {enrollment ? (
              <Link href="/exams" className="truncate rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-gold-500 hover:text-white" title="Switch exam">
                <span className="text-gold-500">{enrollment.program.shortName}</span> · {enrollment.level.name}
              </Link>
            ) : (
              <Link href="/onboarding" className="rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">Choose an exam</Link>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <CommandPalette />
            <NotificationBell initialUnread={unread} />
            <Link href="/settings" className="hidden items-center gap-2 text-sm text-white/90 hover:text-white sm:inline-flex" title="Settings">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gold-500 to-gold-700 text-xs font-bold text-white ring-2 ring-white/20">{initials}</span>
              <span className="hidden md:inline">{user.name}</span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out">
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileNav showAdmin={showAdmin} />
    </div>
  );
}
