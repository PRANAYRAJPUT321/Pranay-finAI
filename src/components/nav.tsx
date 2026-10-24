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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-navy-800 text-white" : "text-navy-100 hover:bg-navy-800/60 hover:text-white",
              )}
            >
              <Icon aria-hidden className={clsx("h-4 w-4", active ? "text-gold-400" : "text-navy-300")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
