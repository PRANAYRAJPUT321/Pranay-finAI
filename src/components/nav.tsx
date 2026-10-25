"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3, Bell, BookOpen, Bot, CalendarDays, ClipboardCheck, Compass, FileDown, FileStack, FunctionSquare, GraduationCap, Layers,
  LayoutDashboard, NotebookPen, PlayCircle, Settings, Shield, Smartphone, Timer, Users,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/exams", label: "My Exams", icon: GraduationCap },
      { href: "/guide", label: "Exam Guide", icon: Compass },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Study",
    items: [
      { href: "/plan", label: "Study Plan", icon: CalendarDays },
      { href: "/learn", label: "Learn", icon: BookOpen },
      { href: "/videos", label: "Video Lessons", icon: PlayCircle },
      { href: "/materials", label: "Study Materials", icon: FileDown },
      { href: "/formulas", label: "Formula Library", icon: FunctionSquare },
      { href: "/flashcards", label: "Flashcards", icon: Layers },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/practice", label: "Practice", icon: ClipboardCheck },
      { href: "/mocks", label: "Mock Exams", icon: Timer },
      { href: "/past-papers", label: "Past Papers", icon: FileStack },
      { href: "/tutor", label: "AI Tutor", icon: Bot },
    ],
  },
  {
    label: "Progress",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/notes", label: "Notes", icon: NotebookPen },
      { href: "/groups", label: "Study Groups", icon: Users },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/get-app", label: "Get the App", icon: Smartphone },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV = NAV_GROUPS.flatMap((g) => g.items);

export function NavLinks({ showAdmin, onNavigate }: { showAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = showAdmin ? [...NAV_GROUPS, { label: "Admin", items: [{ href: "/admin", label: "Admin Console", icon: Shield }] }] : NAV_GROUPS;
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="eyebrow mb-2 px-3 text-[0.6rem] text-navy-300/80">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      active ? "bg-white/[0.07] text-white ring-1 ring-white/10" : "text-navy-100/85 hover:translate-x-1 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {active && <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold-500 shadow-[0_0_14px_rgb(227_38_46)]" />}
                    <Icon aria-hidden className={clsx("h-4 w-4 transition-transform group-hover:scale-110", active ? "text-gold-500" : "text-mint-300/70 group-hover:text-mint-200")} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
