"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3, BookOpen, Bot, CalendarDays, ClipboardCheck, FileStack, FunctionSquare, GraduationCap, Layers, LayoutDashboard, NotebookPen, Settings, Shield, Timer, Users,
} from "lucide-react";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exams", label: "My Exams", icon: GraduationCap },
  { href: "/plan", label: "Study Plan", icon: CalendarDays },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: ClipboardCheck },
  { href: "/mocks", label: "Mock Exams", icon: Timer },
  { href: "/past-papers", label: "Past Papers", icon: FileStack },
  { href: "/tutor", label: "AI Tutor", icon: Bot },
  { href: "/formulas", label: "Formula Library", icon: FunctionSquare },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/groups", label: "Study Groups", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks({ showAdmin, onNavigate }: { showAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = showAdmin ? [...NAV, { href: "/admin", label: "Admin Console", icon: Shield }] : NAV;
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                active ? "bg-white/10 text-white shadow-inner shadow-black/20 ring-1 ring-white/10" : "text-navy-100 hover:translate-x-1 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold-400 shadow-[0_0_12px_rgb(212_173_54)]" />}
              <Icon aria-hidden className={clsx("h-4 w-4 transition-transform group-hover:scale-110", active ? "text-gold-400" : "text-navy-300 group-hover:text-gold-300")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
