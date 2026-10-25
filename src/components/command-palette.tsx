"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { NAV } from "./nav";

const EXTRA = [
  { href: "/practice", label: "Start a practice set", hint: "Practice" },
  { href: "/flashcards", label: "Review due flashcards", hint: "Flashcards" },
  { href: "/mocks", label: "Take a mock exam", hint: "Mock Exams" },
  { href: "/tutor", label: "Ask the AI tutor", hint: "AI Tutor" },
  { href: "/materials", label: "Download study material (PDF)", hint: "Materials" },
  { href: "/guide", label: "Exam dates, fees and difficulty", hint: "Exam Guide" },
  { href: "/onboarding", label: "Add another certification", hint: "Exams" },
];

/** Ctrl/⌘+K quick navigation. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => {
    const all = [...NAV.map((n) => ({ href: n.href, label: n.label, hint: "Go to" })), ...EXTRA];
    const s = q.trim().toLowerCase();
    return s ? all.filter((i) => i.label.toLowerCase().includes(s) || i.hint.toLowerCase().includes(s)) : all;
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-navy-100 transition hover:border-white/40 md:inline-flex"
      >
        <Search className="h-3.5 w-3.5" aria-hidden /> Search or jump to…
        <kbd className="rounded border border-white/20 px-1.5 text-[10px] text-navy-200">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-start bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Quick navigation" className="bg-ink animate-fade-up mx-auto w-full max-w-lg overflow-hidden rounded-2xl text-white shadow-2xl ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-4 w-4 text-mint-300" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(items.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter" && items[active]) go(items[active].href);
                }}
                placeholder="Where do you want to go?"
                aria-label="Search pages and actions"
                className="w-full bg-transparent py-4 text-sm text-white placeholder:text-navy-300 focus:outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
              {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-navy-200">No matches</li>}
              {items.map((i, idx) => (
                <li key={`${i.href}-${i.label}`} role="option" aria-selected={idx === active}>
                  <button type="button" onMouseEnter={() => setActive(idx)} onClick={() => go(i.href)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${idx === active ? "bg-white/10 text-white" : "text-navy-100"}`}>
                    <span>{i.label}</span>
                    <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-navy-300">{i.hint}{idx === active && <CornerDownLeft className="h-3 w-3 text-gold-500" aria-hidden />}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
