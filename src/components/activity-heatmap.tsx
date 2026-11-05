import { addDays, toDateKey, utcDay } from "@/server/planner/generate";

const LEVELS = ["bg-white/[0.05]", "bg-gold-700/70", "bg-gold-500/80", "bg-fuchsia-400/90", "bg-mint-300"];

function level(minutes: number) {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 45) return 2;
  if (minutes < 90) return 3;
  return 4;
}

/** GitHub-style grid of study minutes for the last `weeks` weeks (Monday-first columns). */
export function ActivityHeatmap({ minutesByDay, weeks = 26, today = new Date() }: { minutesByDay: Record<string, number>; weeks?: number; today?: Date }) {
  const end = utcDay(today);
  const dow = (end.getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(end, -(weeks - 1) * 7 - dow);
  const cols: { key: string; minutes: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      const key = toDateKey(day);
      col.push({ key, minutes: minutesByDay[key] ?? 0, future: day > end });
    }
    cols.push(col);
  }
  const total = Object.values(minutesByDay).reduce((a, b) => a + b, 0);
  const active = Object.values(minutesByDay).filter((m) => m > 0).length;
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]" role="img" aria-label={`Study activity: ${active} active days, ${Math.round(total / 60)} hours in the last ${weeks} weeks`}>
          {cols.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((c) => (
                <span key={c.key} title={c.future ? "" : `${c.key}: ${c.minutes} min`} className={`h-3 w-3 rounded-[3px] ${c.future ? "opacity-0" : LEVELS[level(c.minutes)]} ${level(c.minutes) >= 3 ? "shadow-[0_0_6px_rgba(232,121,249,0.6)]" : ""}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{active} active day{active === 1 ? "" : "s"} · {Math.round(total / 60)} h logged</span>
        <span className="flex items-center gap-1">Less {LEVELS.map((c, i) => <span key={i} className={`h-3 w-3 rounded-[3px] ${c}`} />)} More</span>
      </div>
    </div>
  );
}
