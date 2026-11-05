"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** True when the browser can create a WebGL context. */
export function canUseWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Renders a 3D scene only when WebGL is available, the user has not asked
 * for reduced motion, and the element is near the viewport. Otherwise the
 * CSS fallback is shown, so pages never depend on WebGL.
 */
export function SceneGate({ children, fallback, className, allowReducedMotion = false }: { children: (visible: boolean) => ReactNode; fallback: ReactNode; className?: string; allowReducedMotion?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "3d" | "fallback">("pending");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ok = canUseWebGL() && (allowReducedMotion || !reduce);
    const t = setTimeout(() => setMode(ok ? "3d" : "fallback"), 0);
    return () => clearTimeout(t);
  }, [allowReducedMotion]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {mode === "3d" ? children(visible) : fallback}
    </div>
  );
}
