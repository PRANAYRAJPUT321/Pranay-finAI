"use client";

import { forwardRef, useId } from "react";
import clsx from "clsx";

export type NovaPose = "idle" | "wave" | "point" | "present" | "write" | "think" | "alert" | "cheer";

const INK = "#1e1b4b";

/**
 * Nova, the cartoon robot presenter of generated videos. Hovers on a little
 * jet, blinks, gestures per scene (`pose`) and lip-syncs: the parent sets the
 * CSS variable `--mouth` (0..1) on the forwarded element every animation
 * frame, so speech never re-renders React.
 */
export const Nova = forwardRef<HTMLDivElement, { pose: NovaPose; speaking: boolean; className?: string }>(function Nova({ pose, speaking, className }, ref) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `${n}-${id}`;
  return (
    <div ref={ref} className={clsx("nova pointer-events-none select-none", `pose-${pose}`, speaking && "is-speaking", className)} aria-hidden>
      <svg viewBox="0 0 240 300" className="h-full w-full">
        <defs>
          <linearGradient id={g("shell")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ddd6fe" />
          </linearGradient>
          <linearGradient id={g("body")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5f3ff" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id={g("screen")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e1065" />
            <stop offset="1" stopColor="#0b1026" />
          </linearGradient>
          <linearGradient id={g("eye")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cffafe" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id={g("jet")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a5f3fc" />
            <stop offset="0.5" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        <ellipse className="nova-shadow" cx="120" cy="290" rx="56" ry="8" fill="#000" />

        <g className="nova-float">
          <g className="nova-body">
            {/* Hover jet */}
            <path className="nova-jet" d="M104 250 Q120 298 136 250 Z" fill={`url(#${g("jet")})`} />
            <rect x="102" y="244" width="36" height="12" rx="6" fill="#7c3aed" stroke={INK} strokeWidth="3.5" />

            {/* Left arm (behind body) */}
            <g className="arm arm-l">
              <rect x="76" y="176" width="16" height="50" rx="8" fill="#c4b5fd" stroke={INK} strokeWidth="3.5" />
              <circle cx="84" cy="232" r="12" fill="#f5f3ff" stroke={INK} strokeWidth="3.5" />
            </g>

            {/* Torso */}
            <rect x="80" y="160" width="80" height="94" rx="34" fill={`url(#${g("body")})`} stroke={INK} strokeWidth="4" />
            <rect x="96" y="182" width="48" height="34" rx="10" fill="#0b1026" stroke={INK} strokeWidth="3" />
            {[0, 1, 2, 3, 4].map((k) => (
              <rect key={k} className="eq-bar" x={101 + k * 8} y={188} width="5" height="22" rx="2.5" fill={k % 2 ? "#e879f9" : "#22d3ee"} style={{ animationDelay: `${k * 0.09}s` }} />
            ))}
            <path d="M92 232 Q120 242 148 232" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
            <circle cx="120" cy="226" r="3" fill="#7c3aed" />

            {/* Right arm (in front) with props */}
            <g className="arm arm-r">
              <g className="prop prop-pointer">
                <rect x="153" y="236" width="6" height="38" rx="3" fill="#fbbf24" stroke={INK} strokeWidth="2.5" />
                <path d="M156 268 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-10 6 l3 -11 l-8 -7 l11 -1 z" fill="#fde047" stroke={INK} strokeWidth="2.5" />
              </g>
              <g className="prop prop-marker">
                <rect x="150" y="238" width="12" height="30" rx="4" fill="#22d3ee" stroke={INK} strokeWidth="2.5" />
                <rect x="152" y="266" width="8" height="8" rx="2" fill={INK} />
              </g>
              <rect x="148" y="176" width="16" height="50" rx="8" fill="#c4b5fd" stroke={INK} strokeWidth="3.5" />
              <circle cx="156" cy="232" r="12" fill="#f5f3ff" stroke={INK} strokeWidth="3.5" />
            </g>

            {/* Head */}
            <g className="head">
              <rect x="110" y="146" width="20" height="18" rx="4" fill="#a78bfa" stroke={INK} strokeWidth="3" />
              <line x1="120" y1="58" x2="120" y2="36" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              <circle className="antenna-tip" cx="120" cy="30" r="8" fill="#e879f9" stroke={INK} strokeWidth="3" />
              <circle cx="56" cy="106" r="15" fill="#8b5cf6" stroke={INK} strokeWidth="3.5" />
              <circle cx="184" cy="106" r="15" fill="#8b5cf6" stroke={INK} strokeWidth="3.5" />
              <circle cx="56" cy="106" r="5" fill="#22d3ee" />
              <circle cx="184" cy="106" r="5" fill="#22d3ee" />
              <rect x="60" y="56" width="120" height="100" rx="40" fill={`url(#${g("shell")})`} stroke={INK} strokeWidth="4" />
              <rect x="73" y="71" width="94" height="68" rx="28" fill={`url(#${g("screen")})`} stroke={INK} strokeWidth="3" />
              <path d="M84 84 Q96 76 112 77" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
              <g className="eyes">
                <rect className="brow brow-l" x="92" y="84" width="16" height="4" rx="2" fill="#67e8f9" />
                <rect className="brow brow-r" x="132" y="84" width="16" height="4" rx="2" fill="#67e8f9" />
                <g className="eye-open">
                  <g className="blink">
                    <rect x="94" y="92" width="13" height="20" rx="6.5" fill={`url(#${g("eye")})`} />
                    <rect x="133" y="92" width="13" height="20" rx="6.5" fill={`url(#${g("eye")})`} />
                    <circle cx="99" cy="98" r="2.6" fill="#fff" />
                    <circle cx="138" cy="98" r="2.6" fill="#fff" />
                  </g>
                </g>
                <g className="happy-eyes" fill="none" stroke="#67e8f9" strokeWidth="4" strokeLinecap="round">
                  <path d="M93 104 q7 -10 14 0" />
                  <path d="M132 104 q7 -10 14 0" />
                </g>
              </g>
              <ellipse cx="88" cy="121" rx="7" ry="4" fill="#f472b6" opacity="0.45" />
              <ellipse cx="152" cy="121" rx="7" ry="4" fill="#f472b6" opacity="0.45" />
              <path className="mouth-closed" d="M110 121 Q120 129 130 121" fill="none" stroke="#f0abfc" strokeWidth="3.5" strokeLinecap="round" />
              <g className="mouth-open">
                <ellipse cx="120" cy="124" rx="10" ry="9" fill="#831843" stroke="#f0abfc" strokeWidth="2.5" />
                <ellipse cx="120" cy="128" rx="5.5" ry="3.5" fill="#f472b6" />
              </g>
            </g>

            {/* Speech props */}
            <g className="bubble bubble-think">
              <circle cx="186" cy="62" r="5" fill="#fff" stroke={INK} strokeWidth="2.5" />
              <circle cx="198" cy="44" r="8" fill="#fff" stroke={INK} strokeWidth="2.5" />
              <ellipse cx="218" cy="18" rx="24" ry="19" fill="#fff" stroke={INK} strokeWidth="3" />
              <text x="218" y="28" textAnchor="middle" fontSize="28" fontWeight="900" fill="#7c3aed" fontFamily="Sora, sans-serif">?</text>
            </g>
            <g className="bubble bubble-alert">
              <path d="M196 6 l8 14 l16 -6 l-6 16 l14 8 l-16 4 l2 16 l-13 -9 l-10 12 l-3 -16 l-16 -1 l12 -11 l-8 -14 l16 3 z" fill="#fde047" stroke={INK} strokeWidth="3" />
              <text x="205" y="38" textAnchor="middle" fontSize="26" fontWeight="900" fill="#be123c" fontFamily="Sora, sans-serif">!</text>
            </g>
            <g className="prop prop-stars" fill="#fde047" stroke={INK} strokeWidth="2">
              <path className="t-twinkle" d="M40 50 l4 9 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -1 z" />
              <path d="M206 120 l3 7 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 z" />
              <path d="M30 150 l3 6 l7 1 l-5 4 l2 7 l-7 -4 l-6 4 l2 -7 l-5 -4 l7 -1 z" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
});
