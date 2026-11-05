"use client";

import { useId } from "react";
import clsx from "clsx";
import type { ToonTheme } from "@/lib/video/themes";

/**
 * Animated cartoon illustrations for generated videos, one per topic theme
 * (see src/lib/video/themes.ts). Pure SVG + CSS animations from globals.css
 * (.toon .t-*), so they cost nothing to download and respect reduced motion.
 */

const INK = "#1e1b4b";
type V = React.CSSProperties & Record<`--${string}`, string>;
const d = (s: number, extra: Record<string, string> = {}): V => ({ "--d": `${s}s`, ...extra }) as V;

function Coin({ x, y, r = 14, className, style }: { x: number; y: number; r?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <g className={className} style={style}>
      <circle cx={x} cy={y} r={r} fill="#fcd34d" stroke={INK} strokeWidth="3" />
      <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      <path d={`M${x - r * 0.4} ${y - r * 0.35} q${r * 0.35} -${r * 0.3} ${r * 0.7} 0`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

function Star({ x, y, s = 1, fill = "#fde047", className, style }: { x: number; y: number; s?: number; fill?: string; className?: string; style?: React.CSSProperties }) {
  const p = (dx: number, dy: number) => `${x + dx * s} ${y + dy * s}`;
  return <path className={className} style={style} d={`M${p(0, -12)} L${p(3.5, -3.5)} L${p(12, 0)} L${p(3.5, 3.5)} L${p(0, 12)} L${p(-3.5, 3.5)} L${p(-12, 0)} L${p(-3.5, -3.5)} Z`} fill={fill} stroke={INK} strokeWidth="2" />;
}

const Ground = () => <path d="M8 198 H312" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.7" />;

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const rad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(a0));
  const y0 = cy + r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1));
  const y1 = cy + r * Math.sin(rad(a1));
  return `M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
}

function Growth() {
  const stacks = [3, 5, 8];
  return (
    <>
      <g className="t-spin">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1={52 + Math.cos(a) * 24} y1={46 + Math.sin(a) * 24} x2={52 + Math.cos(a) * 33} y2={46 + Math.sin(a) * 33} stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />;
        })}
      </g>
      <circle cx="52" cy="46" r="18" fill="#fde047" stroke={INK} strokeWidth="3" />
      <Ground />
      <path d="M58 150 h64 l-8 46 h-48 z" fill="#fb923c" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="52" y="142" width="76" height="14" rx="5" fill="#fdba74" stroke={INK} strokeWidth="3.5" />
      <path className="t-draw" style={{ "--len": "140" } as V} d="M90 142 C 88 115, 98 100, 92 70" fill="none" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
      <path className="t-pop" style={d(0.8)} d="M91 114 c-22 -4 -30 -20 -28 -26 c14 0 26 8 28 26z" fill="#4ade80" stroke={INK} strokeWidth="3" />
      <path className="t-pop" style={d(1.1)} d="M93 98 c20 -6 30 -22 28 -28 c-14 -1 -26 8 -28 28z" fill="#4ade80" stroke={INK} strokeWidth="3" />
      <Coin x={92} y={62} r={16} className="t-pop" style={d(1.4)} />
      {stacks.map((n, i) => {
        const cx = 172 + i * 46;
        return (
          <g key={i} className="t-grow" style={d(i * 0.45)}>
            {Array.from({ length: n }).map((_, k) => {
              const y = 190 - k * 10;
              return (
                <g key={k}>
                  <rect x={cx - 18} y={y - 6} width="36" height="8" fill="#f59e0b" stroke={INK} strokeWidth="2.5" />
                  <ellipse cx={cx} cy={y - 6} rx="18" ry="5.5" fill="#fde047" stroke={INK} strokeWidth="2.5" />
                </g>
              );
            })}
          </g>
        );
      })}
      <path className="t-draw" style={{ "--len": "220", "--d": "0.5s" } as V} d="M150 140 C 196 132, 236 104, 286 62" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
      <path className="t-pop" style={d(1.7)} d="M292 56 l-20 2 l11 15 z" fill="#22d3ee" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <g className="t-bob">
        <circle cx="250" cy="38" r="18" fill="#e879f9" stroke={INK} strokeWidth="3" />
        <text x="250" y="45" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" fontFamily="Sora, sans-serif">%</text>
      </g>
    </>
  );
}

function Timeline() {
  const xs = [40, 100, 160, 220, 280];
  return (
    <>
      <path d="M18 168 H300" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M306 168 l-13 -8 v16 z" fill={INK} />
      {xs.map((x, i) => (
        <g key={x}>
          <line x1={x} y1="160" x2={x} y2="176" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <text x={x} y="196" textAnchor="middle" fontSize="12" fontWeight="800" fill="#c4b5fd" fontFamily="Sora, sans-serif">{i === 0 ? "Today" : `Year ${i}`}</text>
        </g>
      ))}
      {xs.slice(1).map((x, i) => (
        <path key={x} className="t-draw" style={{ "--len": "260", "--d": `${0.9 + i * 0.35}s` } as V} d={`M${x} 136 Q ${(x + 40) / 2} ${70 - i * 10} 46 132`} fill="none" stroke="#a78bfa" strokeWidth="3" strokeDasharray="0" strokeLinecap="round" />
      ))}
      {xs.slice(1).map((x, i) => (
        <Coin key={x} x={x} y={146} r={13} className="t-drop" style={d(i * 0.35)} />
      ))}
      <Coin x={40} y={146} r={17} className="t-pulse" />
      <g className="t-bob">
        <rect x="104" y="14" width="112" height="32" rx="16" fill="#fff" stroke={INK} strokeWidth="3" />
        <text x="160" y="36" textAnchor="middle" fontSize="15" fontWeight="900" fill="#7c3aed" fontFamily="Sora, sans-serif">÷ (1 + r)ⁿ</text>
      </g>
      <circle cx="282" cy="44" r="20" fill="#f5f3ff" stroke={INK} strokeWidth="3" />
      <g className="t-spin">
        <line x1="282" y1="44" x2="282" y2="30" stroke="#e879f9" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="282" y1="44" x2="282" y2="58" stroke="transparent" strokeWidth="3.5" />
      </g>
      <circle cx="282" cy="44" r="3" fill={INK} />
    </>
  );
}

function Bond() {
  return (
    <>
      <rect x="22" y="38" width="172" height="120" rx="10" fill="#fefce8" stroke={INK} strokeWidth="3.5" />
      <rect x="31" y="47" width="154" height="102" rx="6" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
      <text x="48" y="76" fontSize="19" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">BOND</text>
      {[90, 104, 118].map((y, i) => <rect key={y} x="48" y={y} width={[104, 84, 94][i]} height="7" rx="3.5" fill="#c4b5fd" />)}
      <path d="M150 140 l-8 22 l10 -5 l6 9 l2 -22 z" fill="#fb7185" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M166 140 l8 22 l-10 -5 l-6 9 l-2 -22 z" fill="#f43f5e" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="158" cy="134" r="15" fill="#fb7185" stroke={INK} strokeWidth="3" className="t-pulse" />
      {[0, 1, 2, 3].map((k) => (
        <g key={k} className="t-fly" style={d(k * 0.7, { "--fx": "96px", "--fy": `${-34 + k * 12}px` })}>
          <rect x="198" y={48 + k * 26} width="48" height="20" rx="4" fill="#a7f3d0" stroke={INK} strokeWidth="2.5" />
          <text x="222" y={62 + k * 26} textAnchor="middle" fontSize="9.5" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">COUPON</text>
        </g>
      ))}
      <path d="M262 196 l-14 -24 h28 z" fill="#a78bfa" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g className="t-sway" style={{ transformOrigin: "262px 170px" }}>
        <rect x="212" y="166" width="100" height="8" rx="4" fill="#8b5cf6" stroke={INK} strokeWidth="2.5" />
        <rect x="214" y="142" width="28" height="24" rx="5" fill="#22d3ee" stroke={INK} strokeWidth="2.5" />
        <text x="228" y="159" textAnchor="middle" fontSize="11" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">P</text>
        <rect x="282" y="142" width="28" height="24" rx="5" fill="#e879f9" stroke={INK} strokeWidth="2.5" />
        <text x="296" y="159" textAnchor="middle" fontSize="11" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">Y</text>
      </g>
      <text x="262" y="214" textAnchor="middle" fontSize="11" fontWeight="800" fill="#c4b5fd" fontFamily="Sora, sans-serif">yield ↑  price ↓</text>
    </>
  );
}

function Scale() {
  return (
    <>
      <g className="t-bob">
        <rect x="102" y="8" width="116" height="30" rx="15" fill="#fff" stroke={INK} strokeWidth="3" />
        <text x="160" y="29" textAnchor="middle" fontSize="15" fontWeight="900" fill="#7c3aed" fontFamily="Sora, sans-serif">A = L + E</text>
      </g>
      <rect x="138" y="188" width="44" height="12" rx="5" fill="#8b5cf6" stroke={INK} strokeWidth="3" />
      <rect x="154" y="72" width="12" height="118" rx="5" fill="#c4b5fd" stroke={INK} strokeWidth="3" />
      <g className="t-sway" style={{ transformOrigin: "160px 72px", ...d(0.2) }}>
        <rect x="48" y="66" width="224" height="9" rx="4.5" fill="#a78bfa" stroke={INK} strokeWidth="3" />
        <path d="M66 75 L44 130 M66 75 L88 130 M254 75 L232 130 M254 75 L276 130" stroke={INK} strokeWidth="2.5" />
        <path d="M34 130 h64 q-32 26 -64 0z" fill="#f5f3ff" stroke={INK} strokeWidth="3" />
        <path d="M222 130 h64 q-32 26 -64 0z" fill="#f5f3ff" stroke={INK} strokeWidth="3" />
        <rect x="50" y="100" width="32" height="30" rx="5" fill="#22d3ee" stroke={INK} strokeWidth="3" />
        <text x="66" y="121" textAnchor="middle" fontSize="15" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">A</text>
        <rect x="226" y="106" width="26" height="24" rx="5" fill="#e879f9" stroke={INK} strokeWidth="3" />
        <text x="239" y="123" textAnchor="middle" fontSize="13" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">L</text>
        <rect x="254" y="102" width="28" height="28" rx="5" fill="#fbbf24" stroke={INK} strokeWidth="3" />
        <text x="268" y="121" textAnchor="middle" fontSize="13" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">E</text>
      </g>
      <circle cx="160" cy="70" r="8" fill="#fbbf24" stroke={INK} strokeWidth="3" />
    </>
  );
}

function Shield({ gid }: { gid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${gid}-sh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <g className="t-bob">
        <path d="M160 22 L228 48 V112 C228 158 196 188 160 202 C124 188 92 158 92 112 V48 Z" fill={`url(#${gid}-sh)`} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M160 38 L212 58 V110 C212 146 188 170 160 182" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" />
        <path className="t-draw" style={{ "--len": "120" } as V} d="M126 112 l22 22 l46 -50" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Star x={66} y={58} className="t-pop" style={d(0.3)} />
      <Star x={256} y={70} s={0.8} fill="#67e8f9" className="t-pop" style={d(0.9)} />
      <Star x={58} y={160} s={0.7} fill="#f9a8d4" className="t-pop" style={d(1.4)} />
      <path className="t-pulse" d="M262 140 c0 -9 -12 -12 -16 -4 c-4 -8 -16 -5 -16 4 c0 10 16 18 16 18 s16 -8 16 -18z" fill="#fb7185" stroke={INK} strokeWidth="2.5" />
    </>
  );
}

function Chart() {
  const bars = [40, 64, 52, 92, 122];
  const colors = ["#8b5cf6", "#22d3ee", "#e879f9", "#8b5cf6", "#22d3ee"];
  return (
    <>
      <path d="M40 18 V192 H302" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {bars.map((h, i) => <rect key={i} className="t-grow" style={d(i * 0.25)} x={58 + i * 46} y={190 - h} width="30" height={h} rx="5" fill={colors[i]} stroke={INK} strokeWidth="3" />)}
      <path className="t-draw" style={{ "--len": "300", "--d": "0.8s" } as V} d={`M73 ${150 - 40} L119 ${150 - 64} L165 ${150 - 52} L211 ${150 - 92} L257 ${150 - 122}`} fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <g className="t-bob" style={d(0.4)}>
        <path d="M276 38 c10 -16 22 -22 30 -24 c-2 8 -8 20 -24 30 z" fill="#f5f3ff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="292" cy="28" r="4" fill="#22d3ee" stroke={INK} strokeWidth="2" />
        <path d="M276 38 l-8 -2 l6 -8 z M282 44 l2 8 l8 -6 z" fill="#fb7185" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path className="t-pulse" d="M274 46 l-10 10 l4 -12 z" fill="#fbbf24" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      </g>
    </>
  );
}

function Bell() {
  const heights = [10, 24, 40, 52, 40, 24, 10];
  return (
    <>
      {[0, 1, 2, 3].map((row) =>
        Array.from({ length: row + 2 }).map((_, k) => <circle key={`${row}-${k}`} cx={160 - (row + 1) * 14 + k * 28} cy={22 + row * 18} r="3.5" fill="#c4b5fd" />),
      )}
      {[-28, -14, 0, 14, 28].map((x, i) => (
        <circle key={x} className="t-drop" style={d(i * 0.45)} cx={160 + x} cy="118" r="6" fill={["#22d3ee", "#e879f9", "#fbbf24", "#22d3ee", "#e879f9"][i]} stroke={INK} strokeWidth="2" />
      ))}
      {heights.map((h, i) => <rect key={i} className="t-grow" style={d(0.3 + Math.abs(3 - i) * 0.15)} x={58 + i * 30} y={194 - h} width="24" height={h} rx="3" fill="#8b5cf6" stroke={INK} strokeWidth="2.5" />)}
      {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={55 + i * 30} y1="140" x2={55 + i * 30} y2="196" stroke={INK} strokeWidth="2" opacity="0.5" />)}
      <path className="t-draw" style={{ "--len": "300", "--d": "0.6s" } as V} d="M52 192 C 110 192, 120 126, 160 126 C 200 126, 210 192, 268 192" fill="none" stroke="#22d3ee" strokeWidth="4.5" strokeLinecap="round" />
      <text x="160" y="214" textAnchor="middle" fontSize="11" fontWeight="800" fill="#c4b5fd" fontFamily="Sora, sans-serif">mean ± σ</text>
    </>
  );
}

function Pie() {
  const slices: [number, number, string][] = [
    [0, 125, "#8b5cf6"],
    [125, 215, "#22d3ee"],
    [215, 290, "#e879f9"],
    [290, 360, "#fbbf24"],
  ];
  const labels = ["Equity", "Bonds", "Cash", "Other"];
  return (
    <>
      <g className="t-spin" style={{ animationDuration: "30s" }}>
        {slices.map(([a0, a1, c], i) => (
          <path key={i} className={i === 2 ? "t-pulse" : undefined} d={arcPath(120, 112, 76, a0, a1)} fill={c} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        ))}
      </g>
      <circle cx="120" cy="112" r="24" fill="#0b1026" stroke={INK} strokeWidth="3" />
      <Coin x={120} y={112} r={13} className="t-pulse" />
      {labels.map((l, i) => (
        <g key={l} className="t-pop" style={d(0.3 + i * 0.25)}>
          <rect x="222" y={54 + i * 30} width="16" height="16" rx="4" fill={slices[i][2]} stroke={INK} strokeWidth="2.5" />
          <text x="244" y={67 + i * 30} fontSize="13" fontWeight="800" fill="#e9e5ff" fontFamily="Sora, sans-serif">{l}</text>
        </g>
      ))}
    </>
  );
}

function Handshake() {
  return (
    <>
      <rect x="28" y="22" width="122" height="168" rx="8" fill="#fefce8" stroke={INK} strokeWidth="3.5" />
      <text x="44" y="52" fontSize="15" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">CONTRACT</text>
      {[64, 78, 92, 106, 120].map((y, i) => <rect key={y} x="44" y={y} width={[90, 76, 88, 70, 82][i]} height="6" rx="3" fill="#c4b5fd" />)}
      <path className="t-draw" style={{ "--len": "160", "--d": "0.4s" } as V} d="M46 160 c10 -16 18 10 28 -4 s14 -10 22 2 s10 8 18 -6" fill="none" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="44" y1="168" x2="134" y2="168" stroke={INK} strokeWidth="2" opacity="0.5" />
      <g className="t-shake">
        <rect x="166" y="96" width="62" height="28" rx="13" fill="#8b5cf6" stroke={INK} strokeWidth="3" />
        <rect x="258" y="96" width="62" height="28" rx="13" fill="#22d3ee" stroke={INK} strokeWidth="3" />
        <ellipse cx="238" cy="110" rx="20" ry="16" fill="#fff" stroke={INK} strokeWidth="3" />
        <ellipse cx="254" cy="112" rx="20" ry="15" fill="#f5f3ff" stroke={INK} strokeWidth="3" />
        <path d="M236 104 q10 -6 22 0 M238 114 q10 -5 20 1" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="t-pop" style={d(0.6)}>
        <rect x="208" y="40" width="72" height="28" rx="14" fill="#fde047" stroke={INK} strokeWidth="3" />
        <text x="244" y="60" textAnchor="middle" fontSize="14" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">DEAL!</text>
      </g>
    </>
  );
}

function Umbrella() {
  const drops = [24, 52, 76, 238, 262, 290, 40, 280, 64, 250];
  return (
    <>
      {drops.map((x, i) => <line key={i} className="t-rain" style={d(i * 0.11)} x1={x} y1="10" x2={x - 4} y2="26" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />)}
      {[110, 140, 180, 210].map((x, i) => <line key={x} className="t-rain" style={{ ...d(i * 0.17), animationDuration: "0.6s" }} x1={x} y1="0" x2={x - 3} y2="12" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" opacity="0.6" />)}
      <g className="t-sway" style={{ transformOrigin: "160px 190px", animationDuration: "4s" }}>
        <path d="M86 112 Q160 22 234 112 Q216 98 197 112 Q178 98 160 112 Q142 98 123 112 Q104 98 86 112 Z" fill="#fb7185" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M160 34 Q142 70 123 112 M160 34 Q178 70 197 112" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.6" />
        <circle cx="160" cy="30" r="5" fill="#fbbf24" stroke={INK} strokeWidth="2.5" />
        <path d="M160 112 V176 q0 14 -13 14 q-11 0 -11 -11" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      </g>
      <rect x="182" y="152" width="58" height="40" rx="7" fill="#a78bfa" stroke={INK} strokeWidth="3" />
      <path d="M200 152 v-8 h22 v8" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M198 172 l8 8 l16 -16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <Ground />
    </>
  );
}

function Buildings() {
  const b: [number, number, number, string][] = [
    [26, 44, 108, "#8b5cf6"],
    [76, 40, 150, "#22d3ee"],
    [122, 52, 90, "#e879f9"],
    [180, 44, 130, "#a78bfa"],
  ];
  return (
    <>
      <g className="t-bob" style={{ animationDuration: "5s" }}>
        <path d="M222 40 a14 14 0 0 1 26 -6 a12 12 0 0 1 20 10 a10 10 0 0 1 -4 18 h-40 a11 11 0 0 1 -2 -22 z" fill="#f5f3ff" stroke={INK} strokeWidth="3" />
      </g>
      {b.map(([x, w, h, c], i) => (
        <g key={x} className="t-grow" style={d(i * 0.3)}>
          <rect x={x} y={196 - h} width={w} height={h} rx="4" fill={c} stroke={INK} strokeWidth="3" />
          {Array.from({ length: Math.floor((h - 20) / 22) }).map((_, r) =>
            [0, 1].map((k) => <rect key={`${r}-${k}`} className="t-blink" style={d((r + k + i) * 0.37)} x={x + 8 + k * (w / 2 - 4)} y={196 - h + 12 + r * 22} width={w / 2 - 14} height="10" rx="2" fill="#fef9c3" />),
          )}
        </g>
      ))}
      <rect x="270" y="44" width="8" height="152" fill="#fbbf24" stroke={INK} strokeWidth="2.5" />
      <g className="t-sway" style={{ transformOrigin: "274px 46px", animationDuration: "5s" }}>
        <rect x="212" y="40" width="96" height="7" rx="3" fill="#fbbf24" stroke={INK} strokeWidth="2.5" />
        <line x1="226" y1="47" x2="226" y2="96" stroke={INK} strokeWidth="2" />
        <rect x="214" y="96" width="24" height="16" rx="3" fill="#fb923c" stroke={INK} strokeWidth="2.5" />
      </g>
      <Ground />
    </>
  );
}

function Factory({ gid }: { gid: string }) {
  return (
    <>
      <defs>
        <clipPath id={`${gid}-belt`}>
          <rect x="166" y="120" width="146" height="70" />
        </clipPath>
      </defs>
      {[0, 1, 2].map((k) => <circle key={`a${k}`} className="t-rise" style={d(k * 1)} cx="68" cy="50" r="11" fill="#e2e8f0" stroke={INK} strokeWidth="2" opacity="0.9" />)}
      {[0, 1, 2].map((k) => <circle key={`b${k}`} className="t-rise" style={d(0.5 + k * 1)} cx="107" cy="60" r="9" fill="#e2e8f0" stroke={INK} strokeWidth="2" opacity="0.9" />)}
      <rect x="60" y="56" width="16" height="54" fill="#64748b" stroke={INK} strokeWidth="3" />
      <rect x="100" y="66" width="14" height="44" fill="#64748b" stroke={INK} strokeWidth="3" />
      <path d="M36 196 V122 L78 98 V122 L120 98 V122 L162 98 V196 Z" fill="#a78bfa" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      {[52, 94, 136].map((x, i) => <rect key={x} className="t-blink" style={d(i * 0.5)} x={x - 8} y="136" width="18" height="16" rx="3" fill="#fef9c3" stroke={INK} strokeWidth="2" />)}
      <rect x="86" y="164" width="26" height="32" rx="3" fill="#7c3aed" stroke={INK} strokeWidth="3" />
      <g clipPath={`url(#${gid}-belt)`}>
        {[0, 1, 2].map((k) => (
          <g key={k} className="t-slide" style={d(k * 1.33, { "--sx": "132px" })}>
            <rect x="152" y="144" width="24" height="22" rx="3" fill="#fbbf24" stroke={INK} strokeWidth="2.5" />
            <path d="M152 152 h24 M164 144 v8" stroke={INK} strokeWidth="2" />
          </g>
        ))}
      </g>
      <rect x="166" y="166" width="144" height="12" rx="6" fill="#334155" stroke={INK} strokeWidth="3" />
      {[180, 214, 248, 282].map((x) => <circle key={x} cx={x} cy="186" r="7" fill="#94a3b8" stroke={INK} strokeWidth="2.5" />)}
      <Coin x={298} y={124} r={13} className="t-pop" style={d(0.9)} />
      <Ground />
    </>
  );
}

function Magnifier() {
  return (
    <>
      <path d="M40 24 h132 l26 26 v150 h-158 z" fill="#f8fafc" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M172 24 v26 h26" fill="#e2e8f0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="56" y="42" width="76" height="10" rx="5" fill="#8b5cf6" />
      {[70, 92, 114, 136, 158].map((y, i) => (
        <g key={y}>
          <rect x="56" y={y} width={[110, 96, 104, 88, 100][i]} height="7" rx="3.5" fill="#c4b5fd" />
          <path className="t-pop" style={d(0.4 + i * 0.45)} d={`M176 ${y + 2} l6 6 l12 -12`} fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <g className="t-sweep">
        <line x1="118" y1="112" x2="152" y2="146" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" />
        <line x1="118" y1="112" x2="152" y2="146" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
        <circle cx="96" cy="90" r="31" fill="#cffafe" fillOpacity="0.35" stroke={INK} strokeWidth="6" />
        <path d="M80 76 q10 -8 22 -4" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </g>
      <Star x={262} y={60} className="t-pop" style={d(1.2)} />
      <Star x={252} y={150} s={0.7} fill="#67e8f9" className="t-pop" style={d(2)} />
    </>
  );
}

function Globe({ gid }: { gid: string }) {
  const syms = ["₹", "$", "€", "£"];
  return (
    <>
      <defs>
        <clipPath id={`${gid}-globe`}>
          <circle cx="130" cy="110" r="74" />
        </clipPath>
      </defs>
      <circle cx="130" cy="110" r="76" fill="#0ea5e9" stroke={INK} strokeWidth="4" />
      <g clipPath={`url(#${gid}-globe)`}>
        <g className="t-slide" style={{ "--sx": "-160px", animationDuration: "10s" } as V}>
          {[0, 160].map((o) => (
            <g key={o} fill="#4ade80" stroke={INK} strokeWidth="2.5">
              <path d={`M${70 + o} 70 c20 -12 40 -6 46 8 c4 12 -10 18 -6 30 c4 12 -14 22 -26 12 c-12 -10 -4 -22 -14 -28 c-10 -6 -12 -16 0 -22z`} />
              <path d={`M${140 + o} 120 c14 -6 30 0 34 12 c4 14 -8 30 -22 30 c-12 0 -20 -12 -18 -22 c2 -8 -4 -16 6 -20z`} />
              <path d={`M${178 + o} 66 c10 -6 22 -2 24 6 c2 8 -8 12 -16 10 c-8 -2 -14 -10 -8 -16z`} />
            </g>
          ))}
        </g>
        <ellipse cx="130" cy="110" rx="34" ry="76" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
        <line x1="54" y1="110" x2="206" y2="110" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
      </g>
      <g className="t-spin" style={{ animationDuration: "12s" }}>
        <circle cx="130" cy="110" r="100" fill="none" stroke="transparent" />
        {syms.map((s, i) => {
          const a = (i * Math.PI) / 2;
          const x = 130 + Math.cos(a) * 98;
          const y = 110 + Math.sin(a) * 98;
          return (
            <g key={s} className="t-spin-rev" style={{ animationDuration: "12s" }}>
              <circle cx={x} cy={y} r="15" fill="#fcd34d" stroke={INK} strokeWidth="3" />
              <text x={x} y={y + 6} textAnchor="middle" fontSize="17" fontWeight="900" fill={INK} fontFamily="Sora, sans-serif">{s}</text>
            </g>
          );
        })}
      </g>
      <g transform="translate(244 40)">
        <path d="M0 0 V90 H66" fill="none" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
        <path d="M8 12 L62 80" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <path d="M8 80 L62 12" stroke="#e879f9" strokeWidth="4" strokeLinecap="round" />
        <circle className="t-pulse" cx="35" cy="46" r="6" fill="#fde047" stroke={INK} strokeWidth="2.5" />
        <text x="62" y="8" fontSize="11" fontWeight="900" fill="#e879f9" fontFamily="Sora, sans-serif">S</text>
        <text x="62" y="100" fontSize="11" fontWeight="900" fill="#22d3ee" fontFamily="Sora, sans-serif">D</text>
      </g>
    </>
  );
}

function Piggy() {
  return (
    <>
      <Coin x={150} y={62} r={14} className="t-drop" />
      <g className="t-bob" style={{ animationDuration: "3.6s" }}>
        <path d="M70 128 c-16 -4 -22 10 -12 16 c8 4 14 -6 6 -10" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="150" cy="130" rx="80" ry="56" fill="#f9a8d4" stroke={INK} strokeWidth="4" />
        <path d="M112 84 l-6 -22 l22 12 z" fill="#f472b6" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="230" cy="130" rx="17" ry="14" fill="#f472b6" stroke={INK} strokeWidth="3" />
        <circle cx="225" cy="128" r="3" fill={INK} />
        <circle cx="236" cy="128" r="3" fill={INK} />
        <circle cx="200" cy="106" r="5" fill={INK} />
        <circle cx="202" cy="104" r="1.8" fill="#fff" />
        <rect x="130" y="76" width="40" height="7" rx="3.5" fill={INK} />
        {[104, 132, 170, 198].map((x) => <rect key={x} x={x - 9} y="176" width="18" height="20" rx="5" fill="#f472b6" stroke={INK} strokeWidth="3" />)}
        <ellipse cx="190" cy="120" rx="10" ry="6" fill="#fb7185" opacity="0.5" />
      </g>
      <path className="t-pop" style={d(0.8)} d="M66 56 c0 -9 -12 -12 -16 -4 c-4 -8 -16 -5 -16 4 c0 10 16 18 16 18 s16 -8 16 -18z" fill="#fb7185" stroke={INK} strokeWidth="2.5" />
      <Star x={268} y={56} s={0.8} className="t-pop" style={d(1.5)} />
      <Ground />
    </>
  );
}

function Calculator() {
  const pressed = new Set(["0-1", "2-3", "3-2", "1-0"]);
  return (
    <>
      <rect x="92" y="12" width="136" height="196" rx="18" fill="#a78bfa" stroke={INK} strokeWidth="4" />
      <rect x="106" y="28" width="108" height="40" rx="8" fill="#0b1026" stroke={INK} strokeWidth="3" />
      {["1,000", "× 1.08", "= 1,080"].map((t, i) => (
        <text key={t} className="t-cycle" style={d(i * 1.5)} x="206" y="56" textAnchor="end" fontSize="18" fontWeight="700" fill="#67e8f9" fontFamily="'JetBrains Mono', monospace">{t}</text>
      ))}
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 4 }).map((_, c) => (
          <rect key={`${r}-${c}`} className={pressed.has(`${r}-${c}`) ? "t-press" : undefined} style={d((r * 4 + c) * 0.15)} x={106 + c * 28} y={80 + r * 30} width="22" height="22" rx="6" fill={c === 3 ? "#22d3ee" : "#f5f3ff"} stroke={INK} strokeWidth="2.5" />
        )),
      )}
      <g className="t-bob" style={d(0.3)}>
        <text x="54" y="64" fontSize="30" fontWeight="900" fill="#fde047" stroke={INK} strokeWidth="1.5" fontFamily="Sora, sans-serif">%</text>
      </g>
      <g className="t-bob" style={d(1)}>
        <text x="252" y="80" fontSize="30" fontWeight="900" fill="#67e8f9" stroke={INK} strokeWidth="1.5" fontFamily="Sora, sans-serif">+</text>
      </g>
      <g className="t-bob" style={d(1.6)}>
        <text x="258" y="170" fontSize="26" fontWeight="900" fill="#f9a8d4" stroke={INK} strokeWidth="1.5" fontFamily="Sora, sans-serif">×</text>
      </g>
      <Star x={58} y={160} s={0.8} className="t-pop" style={d(0.6)} />
    </>
  );
}

export function ToonIllustration({ theme, className }: { theme: ToonTheme; className?: string }) {
  const gid = `toon-${useId().replace(/:/g, "")}`;
  const body = (() => {
    switch (theme) {
      case "growth":
        return <Growth />;
      case "timeline":
        return <Timeline />;
      case "bond":
        return <Bond />;
      case "scale":
        return <Scale />;
      case "shield":
        return <Shield gid={gid} />;
      case "chart":
        return <Chart />;
      case "bell":
        return <Bell />;
      case "pie":
        return <Pie />;
      case "handshake":
        return <Handshake />;
      case "umbrella":
        return <Umbrella />;
      case "buildings":
        return <Buildings />;
      case "factory":
        return <Factory gid={gid} />;
      case "magnifier":
        return <Magnifier />;
      case "globe":
        return <Globe gid={gid} />;
      case "piggy":
        return <Piggy />;
      default:
        return <Calculator />;
    }
  })();
  return (
    <svg viewBox="0 0 320 220" className={clsx("toon h-auto w-full", className)} aria-hidden>
      {body}
    </svg>
  );
}

/** Spiky "POW" burst used behind the answer stamp. */
export function Burst({ className, color = "#fde047" }: { className?: string; color?: string }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 ? 40 : 58;
    const a = (i * Math.PI) / 12;
    return `${(60 + Math.cos(a) * r).toFixed(1)},${(60 + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <polygon points={pts} fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
