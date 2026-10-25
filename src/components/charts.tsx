"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

const NAVY = "#0e211c";
const GOLD = "#e3262e";
const GRID = "#e3e9e6";
const shortWeek = (w: string) => new Date(`${w}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function AccuracyTrend({ data }: { data: { week: string; accuracy: number | null; questions: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Weekly practice accuracy for the last 12 weeks">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tickFormatter={shortWeek} fontSize={11} stroke="#64748b" />
          <YAxis domain={[0, 100]} fontSize={11} stroke="#64748b" unit="%" />
          <Tooltip labelFormatter={(w) => `Week of ${shortWeek(String(w))}`} formatter={(v, n) => (n === "accuracy" ? [`${Math.round(Number(v))}%`, "Accuracy"] : [v, n])} />
          <Line type="monotone" dataKey="accuracy" stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HoursChart({ data, target }: { data: { week: string; hours: number }[]; target?: number }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Weekly study hours for the last 12 weeks">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tickFormatter={shortWeek} fontSize={11} stroke="#64748b" />
          <YAxis fontSize={11} stroke="#64748b" />
          <Tooltip labelFormatter={(w) => `Week of ${shortWeek(String(w))}`} formatter={(v) => [`${Number(v).toFixed(1)} h`, "Study time"]} />
          {target ? <ReferenceLine y={target} stroke={GOLD} strokeDasharray="4 4" label={{ value: "Target", fontSize: 10, fill: "#9c141a", position: "insideTopRight" }} /> : null}
          <Bar dataKey="hours" fill={NAVY} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RetentionTrend({ data }: { data: { week: string; retention: number | null }[] }) {
  return (
    <div className="h-48 w-full" role="img" aria-label="Weekly flashcard retention">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tickFormatter={shortWeek} fontSize={11} stroke="#64748b" />
          <YAxis domain={[0, 100]} fontSize={11} stroke="#64748b" unit="%" />
          <Tooltip formatter={(v) => [`${Math.round(Number(v))}%`, "Recalled"]} labelFormatter={(w) => `Week of ${shortWeek(String(w))}`} />
          <Line type="monotone" dataKey="retention" stroke={GOLD} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MockTrend({ data }: { data: { label: string; scorePct: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Mock exam scores over time">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" fontSize={11} stroke="#64748b" />
          <YAxis domain={[0, 100]} fontSize={11} stroke="#64748b" unit="%" />
          <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Raw score"]} />
          <Line type="monotone" dataKey="scorePct" stroke={NAVY} strokeWidth={2} dot={{ r: 4, fill: GOLD }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
