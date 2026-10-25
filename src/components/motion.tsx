"use client";

import { createElement, useEffect, useState, type ReactNode } from "react";

/** Fades content in as it scrolls into view. */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  return createElement(Tag, { ref: setEl, className: `reveal ${visible ? "is-visible" : ""} ${className}`, style: { "--delay": `${delay}ms` } as React.CSSProperties }, children);
}

/** Counts up to a number when first shown. Non-numeric values render as-is. */
export function CountUp({ value, suffix = "", decimals = 0, duration = 900 }: { value: number; suffix?: string; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !Number.isFinite(value);
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown.toFixed(decimals)}{suffix}</>;
}

const COLORS = ["#e3262e", "#ff8f89", "#0e211c", "#8fd3bb", "#ffffff", "#4ea688"];

/** A short celebratory burst (respecting reduced-motion via the global CSS rule). */
export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const [items] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: `${(i * 37) % 100}%`,
      color: COLORS[i % COLORS.length],
      delay: `${(i * 23) % 600}ms`,
      dur: `${2.2 + ((i * 13) % 14) / 10}s`,
      rotate: `${(i * 47) % 360}deg`,
    })),
  );
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 4500);
    return () => clearTimeout(t);
  }, []);
  if (done) return null;
  return (
    <div aria-hidden>
      {items.map((p, i) => (
        <span key={i} className="confetti-piece" style={{ left: p.left, background: p.color, transform: `rotate(${p.rotate})`, "--delay": p.delay, "--dur": p.dur } as React.CSSProperties} />
      ))}
    </div>
  );
}
