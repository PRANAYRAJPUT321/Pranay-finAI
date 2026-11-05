"use client";

import clsx from "clsx";

/**
 * "Nova", the animated AI presenter used in generated videos. Eyes blink on
 * their own; the mouth bar reacts to each spoken word (pass an incrementing
 * `pulse`) while `speaking` is true.
 */
export function AiPresenter({ speaking, pulse, size = 84, label = true }: { speaking: boolean; pulse: number; size?: number; label?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={clsx("conic-border relative grid shrink-0 place-items-center rounded-full", speaking && "orb-pulse")} style={{ width: size, height: size }} aria-hidden>
        <div className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#4c1d95,#0b0b2a_70%)] shadow-[inset_0_0_25px_rgba(167,139,250,0.6)]" />
        <svg viewBox="0 0 100 100" className="relative" style={{ width: size * 0.78, height: size * 0.78 }}>
          <defs>
            <linearGradient id="nova-eye" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#a5f3fc" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <g className="nova-blink" style={{ transformOrigin: "50px 42px" }}>
            <rect x="28" y="34" width="12" height="16" rx="6" fill="url(#nova-eye)" />
            <rect x="60" y="34" width="12" height="16" rx="6" fill="url(#nova-eye)" />
          </g>
          <rect key={pulse} x="38" y="64" width="24" height={speaking ? 9 : 3} rx="4" fill="#e879f9" className={speaking ? "nova-talk" : undefined} style={{ transformOrigin: "50px 68px" }} />
        </svg>
      </div>
      {label && (
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Nova</p>
          <p className="text-[11px] text-navy-200">{speaking ? "AI tutor · speaking" : "AI tutor"}</p>
        </div>
      )}
    </div>
  );
}
