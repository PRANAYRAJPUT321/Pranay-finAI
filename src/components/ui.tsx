import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { CountUp } from "./motion";

export { clsx as cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
const variants: Record<Variant, string> = {
  primary:
    "btn-primary btn-shine bg-gradient-to-br from-gold-400 via-gold-600 to-mint-600 text-white shadow-lg shadow-gold-600/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gold-500/40 disabled:from-navy-600 disabled:via-navy-600 disabled:to-navy-600 disabled:shadow-none disabled:translate-y-0",
  secondary:
    "btn-secondary border border-white/15 bg-white/[0.04] text-navy-900 backdrop-blur hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-white/[0.08] disabled:opacity-50 disabled:translate-y-0",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger: "btn-shine bg-rose-600 text-white hover:bg-rose-500 disabled:bg-rose-900",
  gold: "btn-shine bg-gradient-to-r from-fuchsia-500 via-gold-500 to-mint-500 bg-[length:200%_auto] text-white shadow-lg shadow-fuchsia-500/30 hover:-translate-y-0.5 hover:bg-right hover:shadow-xl hover:shadow-fuchsia-500/40 disabled:opacity-50 disabled:translate-y-0",
};
const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <button
      className={clsx("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function LinkButton({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={clsx("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300 active:scale-[0.98]", variants[variant], sizes[size], className)} {...props} />;
}

/** Glass card with a gradient border and a cursor-following spotlight. */
export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={clsx("surface spotlight card-hover p-5", className)} {...props}>
      {children}
    </section>
  );
}

export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("mb-3 flex items-start justify-between gap-3", className)}>
      <h2 className="font-display flex items-center gap-2.5 text-lg font-bold text-navy-900">
        <span aria-hidden className="h-5 w-1.5 rounded-full bg-gradient-to-b from-gold-400 to-mint-400 shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
        {children}
      </h2>
      {action}
    </div>
  );
}

type Tone = "navy" | "gold" | "green" | "red" | "amber" | "slate" | "blue";
const tones: Record<Tone, string> = {
  navy: "bg-white/[0.06] text-navy-800 ring-1 ring-white/10",
  gold: "bg-gold-500/15 text-gold-300 ring-1 ring-gold-400/30",
  green: "bg-green-500/15 text-green-300 ring-1 ring-green-400/30",
  red: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
  amber: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-400/30",
  slate: "bg-white/[0.05] text-slate-600 ring-1 ring-white/10",
  blue: "bg-mint-500/15 text-mint-300 ring-1 ring-mint-400/30",
};

export function Badge({ tone = "slate", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Floating glossy spheres that give banners depth (pure CSS, decorative). */
export function Orbs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <span className="orb orb-violet float absolute -right-12 -top-16 h-36 w-36 opacity-90 sm:h-48 sm:w-48" />
      <span className="orb orb-cyan float absolute right-[17%] top-6 h-10 w-10 sm:h-14 sm:w-14" style={{ animationDelay: "1.2s" }} />
      <span className="orb orb-pink float absolute right-[30%] -top-4 h-7 w-7" style={{ animationDelay: "2.4s" }} />
    </div>
  );
}

/** Banner at the top of every page: deep-space gradient, glossy orbs and a gradient headline. */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  const words = title.split(" ");
  const cut = words.length > 1 ? Math.ceil(words.length / 2) : words.length;
  const first = words.slice(0, cut).join(" ");
  const rest = words.slice(cut).join(" ");
  return (
    <div className="bg-ink on-dark animate-fade-up relative mb-6 overflow-hidden rounded-[1.75rem] px-6 py-8 text-white shadow-[0_30px_90px_-45px_rgba(124,58,237,0.9)] ring-1 ring-white/10 sm:px-9 sm:py-10">
      <div aria-hidden className="bg-grid-dark absolute inset-0 opacity-70" />
      <span aria-hidden className="red-beam left-[60%] opacity-60" />
      <Orbs />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.6rem] text-mint-200 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-mint-400 shadow-[0_0_10px_#22d3ee]" />
            {eyebrow ?? "PD FinPrep"}
          </p>
          <h1 className="font-display mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl" aria-label={title}>
            <span className="text-gradient-brand">{first}</span>
            {rest && <span className="text-white"> {rest}</span>}
          </h1>
          <span aria-hidden className="rule-red mt-4" />
          {description && <div className="mt-4 max-w-3xl text-sm leading-relaxed text-navy-100 sm:text-[0.95rem]">{description}</div>}
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

const inputCls = "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-slate-900 shadow-inner shadow-black/20 placeholder:text-slate-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 disabled:opacity-60";

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
    info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-50",
    warning: "border-yellow-400/30 bg-yellow-500/10 text-yellow-50",
    error: "border-rose-400/30 bg-rose-500/10 text-rose-50",
    success: "border-green-400/30 bg-green-500/10 text-green-50",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={clsx("rounded-2xl border px-4 py-3 text-sm backdrop-blur", map[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export function Progress({ value, label, tone = "navy" }: { value: number; label?: string; tone?: "navy" | "gold" | "green" }) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = tone === "gold" ? "from-fuchsia-500 via-gold-500 to-mint-400" : tone === "green" ? "from-emerald-400 to-mint-400" : "from-gold-500 to-mint-400";
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div className={clsx("bar-fill h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_rgba(139,92,246,0.7)]", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="surface animate-fade-up relative overflow-hidden px-6 py-12 text-center">
      <span aria-hidden className="orb orb-violet orb-pulse mx-auto mb-5 block h-16 w-16" />
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
    <div className="surface spotlight card-hover animate-fade-up group relative overflow-hidden p-4">
      <span aria-hidden className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
      <span aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gold-500/20 blur-2xl transition-opacity duration-500 group-hover:bg-mint-400/25" />
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="font-display mt-1.5 text-3xl font-bold text-navy-900">{animatedValue(value)}</p>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function TabLinks({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1" aria-label="Views">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={clsx("whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition", t.key === active ? "bg-gradient-to-r from-gold-600/80 to-mint-600/70 text-white shadow-lg shadow-gold-600/20" : "text-slate-500 hover:bg-white/5 hover:text-navy-800")}
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
