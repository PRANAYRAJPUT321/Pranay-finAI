"use client";

import { useEffect } from "react";

/**
 * Drives the `.spotlight` hover glow: one passive pointer listener sets the
 * cursor position as CSS variables on the hovered element.
 */
export function SpotlightTracker() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let last: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".spotlight") as HTMLElement | null;
      if (last && last !== el) last.style.setProperty("--spot", "0");
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      el.style.setProperty("--spot", "1");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
