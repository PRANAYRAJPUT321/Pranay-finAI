import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { CountUp } from "./motion";

export { clsx as cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
const variants: Record<Variant, string> = {
  primary: "btn-primary btn-shine bg-gradient-to-br from-navy-800 to-navy-950 text-white shadow-md shadow-navy-900/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy-900/30 disabled:from-navy-300 disabled:to-navy-300 disabled:shadow-none disabled:translate-y-0",
  secondary: "btn-secondary bg-white/90 text-navy-900 border border-navy-200 shadow-sm hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md disabled:text-navy-300 disabled:translate-y-0",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger: "btn-shine bg-red-700 text-white hover:bg-red-800 disabled:bg-red-300",
  gold: "btn-shine bg-gradient-to-br from-gold-300 via-gold-500 to-gold-600 text-white shadow-md shadow-gold-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/40 disabled:from-gold-200 disabled:to-gold-200 disabled:translate-y-0",
};
const sizes = { sm: "px-2.5 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <button
      className={clsx("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function LinkButton({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={clsx("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]", variants[variant], sizes[size], className)} {...props} />;
}

export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={clsx("card-hover rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-navy-900/5 backdrop-blur-sm", className)} {...props}>
      {children}
    </section>
  );
}

export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("mb-3 flex items-start justify-between gap-3", className)}>
      <h2 className="font-display flex items-center gap-2 text-lg font-bold text-navy-900"><span aria-hidden className="h-5 w-1 rounded-full bg-gold-500" />{children}</h2>
      {action}
    </div>
  );
}

type Tone = "navy" | "gold" | "green" | "red" | "amber" | "slate" | "blue";
const tones: Record<Tone, string> = {
  navy: "bg-navy-100 text-navy-800",
  gold: "bg-gold-100 text-gold-700",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-sky-100 text-sky-800",
};

export function Badge({ tone = "slate", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Dark editorial banner used at the top of every page (green-black, red display type, white). */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  const words = title.split(" ");
  const first = words.length > 1 ? words.slice(0, Math.ceil(words.length / 2)).join(" ") : title;
  const rest = words.length > 1 ? words.slice(Math.ceil(words.length / 2)).join(" ") : "";
  return (
    <div className="bg-ink on-dark animate-fade-up relative mb-6 overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl shadow-black/20 sm:px-8 sm:py-9">
      <span aria-hidden className="red-beam left-[62%]" />
      <span aria-hidden className="floor-glow" />
      <div aria-hidden className="bg-grid-dark absolute inset-0 opacity-60" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-mint-300">{eyebrow ?? "PD FinPrep"}</p>
          <h1 className="headline-xl mt-3 text-4xl uppercase sm:text-5xl" aria-label={title}>
            <span className="text-gold-500">{first}</span>
            {rest && <span className="block text-white">{rest}</span>}
          </h1>
          <span aria-hidden className="rule-red mt-4" />
          {description && <div className="mt-3 max-w-3xl text-sm leading-relaxed text-navy-100">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:bg-slate-100";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(inputCls, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(inputCls, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx(inputCls, className)} {...props} />;
}

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "error" | "success"; title?: string; children: ReactNode; className?: string }) {
  const map = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={clsx("rounded-lg border px-4 py-3 text-sm", map[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export function Progress({ value, label, tone = "navy" }: { value: number; label?: string; tone?: "navy" | "gold" | "green" }) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = tone === "gold" ? "from-gold-300 to-gold-600" : tone === "green" ? "from-emerald-400 to-emerald-700" : "from-navy-500 to-navy-900";
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
      <div className={clsx("bar-fill h-full rounded-full bg-gradient-to-r", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-dashed border-navy-200 bg-white/80 px-6 py-12 text-center">
      <div aria-hidden className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-gold-100 to-gold-300 text-2xl shadow-inner">✦</div>
      <p className="font-medium text-navy-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Animates simple numeric strings such as "42", "63%" or "12.5 h" with a count-up. */
function animatedValue(value: ReactNode): ReactNode {
  if (typeof value === "number") return <CountUp value={value} />;
  if (typeof value === "string") {
    const m = value.match(/^(\d+(?:\.(\d+))?)(%|\s?h)?$/);
    if (m) return <CountUp value={Number(m[1])} decimals={m[2]?.length ?? 0} suffix={m[3] ?? ""} />;
  }
  return value;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card-hover animate-fade-up group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-navy-900/5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy-700 via-gold-500 to-navy-700 opacity-80" />
      <span aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold-200/30 blur-2xl transition-opacity group-hover:opacity-100" />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-900">{animatedValue(value)}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function TabLinks({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Views">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={clsx("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", t.key === active ? "border-gold-500 text-navy-900" : "border-transparent text-slate-500 hover:text-navy-800")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function UnofficialNotice({ className }: { className?: string }) {
  return (
    <p className={clsx("text-xs text-slate-500", className)}>
      Unofficial practice content written by PD FinPrep. Not affiliated with or endorsed by any examination body.
    </p>
  );
}

export const MASTERY_TONE: Record<string, Tone> = {
  NOT_STARTED: "slate",
  INSUFFICIENT_EVIDENCE: "slate",
  NEEDS_WORK: "red",
  DEVELOPING: "amber",
  PROFICIENT: "blue",
  MASTERED: "green",
};

export function fmtDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}

export function fmtMinutes(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function pct(v: number | null | undefined, digits = 0) {
  return v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;
}
