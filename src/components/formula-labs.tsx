"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Box, Crosshair } from "lucide-react";
import clsx from "clsx";
import { SceneGate } from "@/components/three/gate";
import type { SurfaceGrid } from "@/components/three/surface-scene";
import { bondPrice, futureValue, twoAssetStdDev } from "@/lib/finance/core";

const SurfaceScene = dynamic(() => import("@/components/three/surface-scene"), { ssr: false });

const range = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const money = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

type Lab = {
  key: string;
  title: string;
  blurb: string;
  insight: string;
  params: { key: string; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[];
  defaults: Record<string, number>;
  build: (p: Record<string, number>) => SurfaceGrid;
  labels: { x: string; y: string; z: string };
  ticks: (grid: SurfaceGrid) => { x: string[]; y: string[]; z: string[] };
  readout: (x: number, y: number, p: Record<string, number>) => string;
};

const N = 46;

// Plain floating-point versions keep the surface fast; the hover readout uses the exact decimal library.
const priceFloat = (c: number, y: number, t: number) => (y === 0 ? c * 100 * t + 100 : c * 100 * ((1 - Math.pow(1 + y, -t)) / y) + 100 * Math.pow(1 + y, -t));

const LABS: Lab[] = [
  {
    key: "bond",
    title: "Bond price surface",
    blurb: "Price of a 100-face annual-coupon bond as yield and maturity change.",
    insight: "Prices fall as yields rise, and the slope is steeper for long maturities: that steepness is duration. The surface bends (convexity), so a yield fall raises price more than the same rise lowers it.",
    params: [{ key: "coupon", label: "Coupon rate", min: 0, max: 0.12, step: 0.005, fmt: (v) => pct(v) }],
    defaults: { coupon: 0.05 },
    build: (p) => {
      const xs = range(0.005, 0.12, N);
      const ys = range(1, 30, N);
      return { xs, ys, z: ys.map((t) => xs.map((y) => priceFloat(p.coupon, y, t))) };
    },
    labels: { x: "Yield", y: "Years to maturity", z: "Price" },
    ticks: (g) => ({ x: ["0.5%", "6%", "12%"], y: ["1y", "15y", "30y"], z: zTicks(g, (v) => v.toFixed(0)) }),
    readout: (x, y, p) => {
      const years = Math.max(1, Math.round(y));
      const price = bondPrice({ face: 100, couponRate: p.coupon, ytm: x, years, frequency: 1 }).toNumber();
      return `Yield ${pct(x, 2)} · ${years} years → price ${money(price)}`;
    },
  },
  {
    key: "tvm",
    title: "Compounding surface",
    blurb: "Future value of 1,000 invested today at different rates and horizons.",
    insight: "Time and rate multiply each other: the surface curls upward because growth compounds. Doubling the horizon at a high rate does far more than doubling it at a low rate.",
    params: [{ key: "pv", label: "Amount invested", min: 100, max: 10000, step: 100, fmt: (v) => money(v) }],
    defaults: { pv: 1000 },
    build: (p) => {
      const xs = range(0, 0.12, N);
      const ys = range(0, 30, N);
      return { xs, ys, z: ys.map((n) => xs.map((r) => p.pv * Math.pow(1 + r, n))) };
    },
    labels: { x: "Annual rate", y: "Years", z: "Future value" },
    ticks: (g) => ({ x: ["0%", "6%", "12%"], y: ["0", "15", "30"], z: zTicks(g, (v) => `${Math.round(v / 1000)}k`) }),
    readout: (x, y, p) => {
      const years = Math.max(0, Math.round(y));
      const fv = futureValue(p.pv, x, years).toNumber();
      return `${pct(x, 2)} for ${years} years → ${money(fv)}`;
    },
  },
  {
    key: "portfolio",
    title: "Diversification surface",
    blurb: "Risk of a two-asset portfolio by weight and correlation.",
    insight: "The lower the correlation, the deeper the valley: mixing assets that do not move together cuts risk below either asset alone. At correlation +1 there is no diversification benefit at all.",
    params: [
      { key: "sd1", label: "Volatility of asset A", min: 0.05, max: 0.4, step: 0.01, fmt: (v) => pct(v, 0) },
      { key: "sd2", label: "Volatility of asset B", min: 0.05, max: 0.4, step: 0.01, fmt: (v) => pct(v, 0) },
    ],
    defaults: { sd1: 0.2, sd2: 0.12 },
    build: (p) => {
      const xs = range(0, 1, N);
      const ys = range(-1, 1, N);
      return { xs, ys, z: ys.map((rho) => xs.map((w) => Math.sqrt(Math.max(0, w * w * p.sd1 * p.sd1 + (1 - w) * (1 - w) * p.sd2 * p.sd2 + 2 * w * (1 - w) * rho * p.sd1 * p.sd2)))) };
    },
    labels: { x: "Weight in A", y: "Correlation", z: "Portfolio risk" },
    ticks: (g) => ({ x: ["0%", "50%", "100%"], y: ["−1", "0", "+1"], z: zTicks(g, (v) => pct(v, 0)) }),
    readout: (x, y, p) => {
      const sd = twoAssetStdDev(x, p.sd1, p.sd2, y).toNumber();
      return `${pct(x, 0)} in A, correlation ${y.toFixed(2)} → risk ${pct(sd, 2)}`;
    },
  },
];

function zTicks(g: SurfaceGrid, f: (v: number) => string) {
  const flat = g.z.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  return [f(lo), f((lo + hi) / 2), f(hi)];
}

export function FormulaLabs() {
  const [key, setKey] = useState(LABS[0].key);
  const lab = LABS.find((l) => l.key === key)!;
  const [params, setParams] = useState<Record<string, Record<string, number>>>(() => Object.fromEntries(LABS.map((l) => [l.key, { ...l.defaults }])));
  const p = params[key];
  const grid = useMemo(() => lab.build(p), [lab, p]);
  const ticks = useMemo(() => lab.ticks(grid), [lab, grid]);
  const [readout, setReadout] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="bg-ink relative h-[60vh] min-h-[420px] overflow-hidden rounded-[1.75rem] ring-1 ring-white/10">
        <SceneGate className="absolute inset-0" allowReducedMotion fallback={<p className="grid h-full place-items-center p-6 text-center text-sm text-navy-100">3D labs need WebGL, which this browser does not provide. The readouts on the right still work.</p>}>
          {() => <SurfaceScene grid={grid} labels={lab.labels} ticks={ticks} onHover={(x, y) => setReadout(lab.readout(x, y, p))} />}
        </SceneGate>
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
          <p className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-xs text-white backdrop-blur" role="status" aria-live="polite">
            <Crosshair className="h-3.5 w-3.5 text-mint-300" aria-hidden /> {readout ?? "Move over the surface to read exact values · drag to rotate"}
          </p>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="surface p-2" role="tablist" aria-label="Labs">
          {LABS.map((l) => (
            <button key={l.key} type="button" role="tab" aria-selected={l.key === key} onClick={() => { setKey(l.key); setReadout(null); }} className={clsx("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition", l.key === key ? "bg-gradient-to-r from-gold-600/40 to-mint-600/25 ring-1 ring-gold-400/30" : "hover:bg-white/5")}>
              <Box className={clsx("mt-0.5 h-4 w-4 shrink-0", l.key === key ? "text-mint-300" : "text-gold-300")} aria-hidden />
              <span><span className="block text-sm font-semibold text-navy-900">{l.title}</span><span className="block text-xs text-slate-500">{l.blurb}</span></span>
            </button>
          ))}
        </div>
        <div className="surface p-5">
          <p className="eyebrow text-[0.6rem] text-slate-500">Parameters</p>
          {lab.params.map((q) => (
            <label key={q.key} className="mt-3 block text-sm">
              <span className="flex justify-between text-slate-600"><span>{q.label}</span><strong className="text-navy-900">{q.fmt(p[q.key])}</strong></span>
              <input type="range" min={q.min} max={q.max} step={q.step} value={p[q.key]} onChange={(e) => setParams((s) => ({ ...s, [key]: { ...s[key], [q.key]: Number(e.target.value) } }))} className="mt-2 w-full accent-[#8b5cf6]" />
            </label>
          ))}
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{lab.insight}</p>
          <p className="mt-3 text-[11px] text-slate-500">Surface drawn from the formula; the readout uses PD FinPrep&apos;s exact decimal calculators.</p>
        </div>
      </aside>
    </div>
  );
}
