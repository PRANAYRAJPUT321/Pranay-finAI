"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { CalendarDays, ClipboardCheck, LayoutDashboard, Menu, PlayCircle, X } from "lucide-react";
import { NavLinks } from "./nav";
import { Logo } from "./logo";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/practice", label: "Practice", icon: ClipboardCheck },
  { href: "/videos", label: "Videos", icon: PlayCircle },
];

/** Phone navigation: a bottom tab bar plus a full-screen menu drawer. */
export function MobileNav({ showAdmin }: { showAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-white" : "text-navy-200")}>
                  <Icon className={clsx("h-5 w-5", active ? "text-gold-500" : "text-mint-300/80")} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-menu" className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-navy-200">
              <Menu className="h-5 w-5 text-mint-300/80" aria-hidden /> More
            </button>
          </li>
        </ul>
      </nav>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="bg-ink fixed inset-0 z-50 overflow-y-auto p-5 lg:hidden">
          <span aria-hidden className="red-beam left-[70%]" />
          <div className="relative mb-6 flex items-center justify-between">
            <Logo inverted />
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/30 p-2 text-white" aria-label="Close menu">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="relative"><NavLinks showAdmin={showAdmin} onNavigate={() => setOpen(false)} /></div>
        </div>
      )}
    </>
  );
}
