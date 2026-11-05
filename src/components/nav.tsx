"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3, Bell, BookA, BookOpen, Bot, Box, CalendarDays, ClipboardCheck, Compass, FileDown, FileStack, FunctionSquare, Globe2, GraduationCap, Headphones, Hourglass, Layers,
  LayoutDashboard, NotebookPen, Orbit, PlayCircle, Settings, Shield, Smartphone, Sparkles, Timer, Users, Zap,
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
      { href: "/galaxy", label: "Concept Galaxy", icon: Orbit, badge: "3D" },
      { href: "/labs", label: "3D Formula Labs", icon: Box, badge: "3D" },
      { href: "/materials", label: "Study Materials", icon: FileDown },
      { href: "/hub", label: "Resource Hub", icon: Globe2, badge: "New" },
      { href: "/formulas", label: "Formula Library", icon: FunctionSquare },
      { href: "/flashcards", label: "Flashcards", icon: Layers },
      { href: "/glossary", label: "Glossary", icon: BookA },
      { href: "/focus", label: "Focus Timer", icon: Hourglass },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/daily", label: "Daily Challenge", icon: Sparkles },
      { href: "/practice", label: "Practice", icon: ClipboardCheck },
      { href: "/rapid-fire", label: "Rapid Fire", icon: Zap },
      { href: "/voice-drill", label: "Voice Drill", icon: Headphones, badge: "New" },
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
          <p className="eyebrow mb-2 px-3 text-[0.58rem] text-navy-300/70">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon, ...rest }) => {
              const badge = "badge" in rest ? (rest as { badge?: string }).badge : undefined;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      active ? "bg-gradient-to-r from-gold-600/35 via-gold-500/15 to-transparent text-white ring-1 ring-gold-400/30 shadow-[0_8px_30px_-12px_rgba(139,92,246,0.8)]" : "text-navy-100/80 hover:translate-x-1 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {active && <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-gold-400 to-mint-400 shadow-[0_0_14px_rgb(139_92_246)]" />}
                    <Icon aria-hidden className={clsx("h-4 w-4 transition-transform group-hover:scale-110", active ? "text-mint-300" : "text-gold-300/70 group-hover:text-mint-200")} />
                    {label}
                    {badge && <span className="ml-auto rounded-full bg-gradient-to-r from-fuchsia-500 to-mint-500 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-white">{badge}</span>}
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
