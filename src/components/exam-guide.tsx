import Link from "next/link";
import { CalendarClock, ExternalLink, FileDown, Gauge, Landmark, Percent, Receipt, Timer, TriangleAlert } from "lucide-react";
import { Reveal } from "@/components/motion";
import { DIFFICULTY_LABEL, daysUntil, type ExamInfo } from "@/server/catalog/exam-info";
import type { GuideProgram } from "@/server/catalog/guide";

function fmtIso(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function DifficultyMeter({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Difficulty ${value} of 5: ${DIFFICULTY_LABEL[value]}`}>
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2.5 w-5 rounded-sm ${i <= value ? (value >= 4 ? "bg-gold-500" : "bg-mint-500") : "bg-slate-200"}`} />
        ))}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-navy-800">{DIFFICULTY_LABEL[value]}</span>
    </span>
  );
}

function Countdown({ days, label }: { days: number; label: string }) {
  return (
    <div className="bg-ink relative overflow-hidden rounded-xl px-3 py-2 text-white">
      <p className="font-display text-2xl font-black leading-none text-gold-500">{days}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-navy-100">{label}</p>
    </div>
  );
}

function LevelCard({ name, code, levelId, info, now }: { name: string; code: string; levelId: string; info: ExamInfo | null; now: Date }) {
  if (!info) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <p className="font-display text-lg font-bold text-navy-950">{name}</p>
        <p className="mt-2 text-sm text-slate-600">Dates and fees for this level have not been added yet. Check the official website.</p>
      </div>
    );
  }
  const next = info.upcoming.find((u) => daysUntil(u.end ?? u.start, now) !== null) ?? info.upcoming[0];
  const toExam = daysUntil(next?.start, now);
  const deadline = info.upcoming.map((u) => u.deadline).filter(Boolean).map((d) => ({ d: d!, n: daysUntil(d, now) })).find((x) => x.n !== null);
  return (
    <article id={`level-${code}`} className="glass-card card-hover flex flex-col rounded-2xl p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-[0.6rem] text-gold-600">{code}</p>
          <h3 className="font-display text-xl font-bold text-navy-950">{name}</h3>
          <p className="mt-1 text-xs text-slate-600">{info.format}{info.delivery ? ` · ${info.delivery}` : ""}</p>
        </div>
        <div className="flex gap-2">
          {toExam !== null && <Countdown days={toExam} label="days to exam" />}
          {deadline?.n != null && <Countdown days={deadline.n} label="to deadline" />}
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2"><Gauge className="h-4 w-4 text-navy-700" aria-hidden /><DifficultyMeter value={info.difficulty} /></span>
        {info.passRate && (
          <span className="inline-flex items-center gap-1.5 text-navy-900">
            <Percent className="h-4 w-4 text-navy-700" aria-hidden /> Pass rate <strong>{info.passRate.value}</strong>
            <span className="text-xs text-slate-500">({info.passRate.period}{info.passRate.official ? ", official" : ", reported"})</span>
          </span>
        )}
        {info.studyHours && <span className="inline-flex items-center gap-1.5 text-navy-900"><Timer className="h-4 w-4 text-navy-700" aria-hidden /> {info.studyHours}</span>}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{info.difficultyNote}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section>
          <h4 className="eyebrow mb-2 flex items-center gap-1.5 text-[0.6rem] text-navy-700"><CalendarClock className="h-3.5 w-3.5" aria-hidden /> Upcoming dates</h4>
          <ul className="space-y-1.5">
            {info.upcoming.length === 0 && <li className="text-sm text-slate-500">Not announced yet.</li>}
            {info.upcoming.map((u) => (
              <li key={u.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="font-semibold text-navy-950">{u.label}</p>
                <p className="text-slate-700">{u.dates}</p>
                {u.registration && <p className="text-xs text-slate-500">{u.registration}</p>}
                {u.deadline && <p className="text-xs font-medium text-gold-700">Registration deadline: {fmtIso(u.deadline)}</p>}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="eyebrow mb-2 flex items-center gap-1.5 text-[0.6rem] text-navy-700"><Receipt className="h-3.5 w-3.5" aria-hidden /> Fees</h4>
          <table className="w-full text-sm">
            <tbody>
              {info.fees.map((f) => (
                <tr key={f.label} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-2 text-slate-700">{f.label}{f.note && <span className="block text-xs text-slate-500">{f.note}</span>}</td>
                  <td className="py-1.5 text-right font-semibold whitespace-nowrap text-navy-950">{f.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {info.feeNote && <p className="mt-1 text-xs text-slate-500">{info.feeNote}</p>}
          {info.passingStandard && <p className="mt-3 text-xs text-slate-700"><strong>Passing standard:</strong> {info.passingStandard}</p>}
        </section>
      </div>

      {info.notes.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-600">{info.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <a href={info.officialUrl} target="_blank" rel="noopener noreferrer" className="pill-outline pill-outline-dark !px-4 !py-1.5 !text-[0.65rem]">Official site <ExternalLink className="h-3 w-3" aria-hidden /></a>
        {info.registrationUrl && <a href={info.registrationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gold-600">Register <ExternalLink className="h-3 w-3" aria-hidden /></a>}
        <a href={`/api/materials/exam-guide/${levelId}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-navy-800 hover:bg-navy-50"><FileDown className="h-3.5 w-3.5" aria-hidden /> PDF</a>
        <details className="w-full text-xs text-slate-500">
          <summary className="cursor-pointer select-none">Sources · as of {fmtIso(info.asOf)}{info.verified ? " · verified" : " · not yet verified"}</summary>
          <ul className="mt-1 space-y-0.5">{info.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-navy-900">{s.title}</a></li>)}</ul>
        </details>
      </footer>
    </article>
  );
}

/** Dates, fees, difficulty and official links for every program and level. */
export function ExamGuide({ programs, selected, basePath }: { programs: GuideProgram[]; selected?: string; basePath: string }) {
  const now = new Date();
  const shown = selected ? programs.filter((p) => p.slug === selected) : programs;
  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Dates, fees and pass rates change. Figures were collected from official and reputable sources on the date shown on each card and have not all been verified
          by an administrator yet. <strong>Always confirm on the official website before registering or paying.</strong> Difficulty is an editorial rating, not an official statistic.
        </p>
      </div>
      <nav aria-label="Programs" className="mb-6 flex flex-wrap gap-2">
        <Link href={basePath} className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${!selected ? "bg-navy-950 text-white" : "border border-slate-300 text-navy-900 hover:border-navy-900"}`}>All</Link>
        {programs.map((p) => (
          <Link key={p.slug} href={`${basePath}?program=${p.slug}`} className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${selected === p.slug ? "bg-gold-500 text-white" : "border border-slate-300 text-navy-900 hover:border-gold-500 hover:text-gold-600"}`}>
            {p.shortName}
          </Link>
        ))}
      </nav>
      <div className="space-y-10">
        {shown.map((p, i) => (
          <Reveal key={p.id} as="section">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-navy-950/10 pb-3">
              <div>
                <p className="eyebrow text-[0.6rem] text-slate-500"><span className="text-gold-600">{String(i + 1).padStart(2, "0")}</span> · {p.awardingBody} · {p.country}</p>
                <h2 id={`prog-${p.slug}`} className="font-display text-3xl font-black uppercase tracking-tight text-navy-950">{p.shortName} <span className="text-lg font-semibold normal-case text-slate-500">{p.name}</span></h2>
              </div>
              {p.officialUrl && <a href={p.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-navy-800 hover:text-gold-600"><Landmark className="h-3.5 w-3.5" aria-hidden /> {p.awardingBody} <ExternalLink className="h-3 w-3" aria-hidden /></a>}
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {p.levels.map((l) => <LevelCard key={l.id} levelId={l.id} code={l.code} name={l.name} info={l.info} now={now} />)}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
