"use client";

import { useActionState, useMemo, useState } from "react";
import { onboardingAction } from "@/app/actions/learning";
import { Alert, Badge, Button, Field, Input, Select, cx } from "./ui";
import { SubmitButton } from "./forms";

export interface OnboardingProgram {
  id: string;
  name: string;
  shortName: string;
  awardingBody: string;
  levels: { id: string; name: string; syllabusLabel: string; verified: boolean; questionCount: number; topics: { id: string; name: string; weight: string }[] }[];
}

const STEPS = ["Exam", "Schedule", "Background", "Topics", "Review"];

export function OnboardingForm({ programs, defaults }: { programs: OnboardingProgram[]; defaults?: { levelId?: string } }) {
  const [state, action] = useActionState(onboardingAction, {});
  const [step, setStep] = useState(0);
  const [levelId, setLevelId] = useState(defaults?.levelId ?? "");
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState("2");
  const [days, setDays] = useState("5");
  const [confident, setConfident] = useState<string[]>([]);
  const [difficult, setDifficult] = useState<string[]>([]);
  const level = useMemo(() => programs.flatMap((p) => p.levels.map((l) => ({ ...l, program: p }))).find((l) => l.id === levelId), [programs, levelId]);
  const today = new Date().toISOString().slice(0, 10);
  const weekly = Number(hours) * Number(days);

  const canNext = step === 0 ? !!levelId : step === 1 ? Number(hours) > 0 : true;
  const toggle = (list: string[], set: (v: string[]) => void, id: string, other: string[], setOther: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    if (other.includes(id)) setOther(other.filter((x) => x !== id));
  };

  return (
    <form action={action} className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Onboarding steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <span aria-current={i === step ? "step" : undefined} className={cx("rounded-full px-3 py-1 text-xs font-medium", i === step ? "bg-navy-900 text-white" : i < step ? "bg-navy-100 text-navy-800" : "bg-slate-100 text-slate-500")}>
              {i + 1}. {s}
            </span>
          </li>
        ))}
      </ol>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <fieldset hidden={step !== 0} className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-navy-900">Which exam are you preparing for?</legend>
        <p className="text-sm text-slate-600">You can add more certifications later; each keeps its own plan.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-navy-900">{p.shortName} <span className="font-normal text-slate-500">· {p.awardingBody}</span></p>
              <div className="mt-2 space-y-1.5">
                {p.levels.map((l) => (
                  <label key={l.id} className={cx("flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", levelId === l.id ? "border-navy-700 bg-navy-50" : "border-slate-200 hover:bg-slate-50")}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="levelId" value={l.id} checked={levelId === l.id} onChange={() => setLevelId(l.id)} />
                      {l.name}
                    </span>
                    <span className="flex gap-1">
                      {!l.verified && <Badge tone="amber">Unverified</Badge>}
                      <Badge tone={l.questionCount ? "green" : "slate"}>{l.questionCount ? `${l.questionCount} Q` : "Structure only"}</Badge>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset hidden={step !== 1} className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-navy-900">When is your exam, and how much time can you study?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="targetExamDate" label="Planned exam date" hint="Leave blank if you only know an approximate window.">
            <Input id="targetExamDate" name="targetExamDate" type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </Field>
          <Field id="targetWindowLabel" label="Approximate window (optional)">
            <Input id="targetWindowLabel" name="targetWindowLabel" placeholder="e.g. May 2027 window" maxLength={80} />
          </Field>
          <Field id="hoursPerDay" label="Hours per study day">
            <Input id="hoursPerDay" name="hoursPerDay" type="number" min={0.25} max={12} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
          <Field id="studyDaysPerWeek" label="Study days per week">
            <Select id="studyDaysPerWeek" name="studyDaysPerWeek" value={days} onChange={(e) => setDays(e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
        </div>
        <p className="text-sm text-slate-600">That is about <strong>{Number.isFinite(weekly) ? weekly.toFixed(1) : "—"} hours per week</strong>. We recommend including at least one rest day.</p>
      </fieldset>

      <fieldset hidden={step !== 2} className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-navy-900">Your background and preferences</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="priorKnowledge" label="Previous preparation for this exam">
            <Select id="priorKnowledge" name="priorKnowledge" defaultValue="none">
              <option value="none">None — starting fresh</option>
              <option value="some">Some — studied parts before</option>
              <option value="strong">Strong — relevant degree, work or a previous attempt</option>
            </Select>
          </Field>
          <Field id="preferredFormat" label="Preferred learning format">
            <Select id="preferredFormat" name="preferredFormat" defaultValue="mixed">
              <option value="mixed">A mix of reading and practice</option>
              <option value="reading">Mostly reading and worked examples</option>
              <option value="practice">Mostly practice questions</option>
              <option value="video">Video (not yet available — we will use lessons for now)</option>
            </Select>
          </Field>
          <Field id="accessTier" label="Access tier" hint="Billing is not integrated yet; all features are available during development.">
            <Select id="accessTier" name="accessTier" defaultValue="FREE">
              <option value="FREE">Free</option>
              <option value="PLUS">Plus (planned)</option>
              <option value="PREMIUM">Premium (planned)</option>
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset hidden={step !== 3} className="space-y-3">
        <legend className="mb-2 text-lg font-semibold text-navy-900">Where do you feel confident, and where do you expect difficulty?</legend>
        <p className="text-sm text-slate-600">Optional. Self-assessments only nudge the initial plan; measured results from the diagnostic and practice take priority.</p>
        {!level ? <p className="text-sm text-slate-500">Choose an exam first.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-2 font-medium">Topic</th><th className="py-2 pr-2 font-medium">Weight</th><th className="py-2 pr-2 text-center font-medium">Confident</th><th className="py-2 text-center font-medium">Difficult</th></tr></thead>
              <tbody>
                {level.topics.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">{t.name}</td>
                    <td className="py-2 pr-2 text-slate-500">{t.weight}</td>
                    <td className="py-2 pr-2 text-center"><input type="checkbox" name="confidentTopicIds" value={t.id} aria-label={`Confident in ${t.name}`} checked={confident.includes(t.id)} onChange={() => toggle(confident, setConfident, t.id, difficult, setDifficult)} /></td>
                    <td className="py-2 text-center"><input type="checkbox" name="difficultTopicIds" value={t.id} aria-label={`Expect difficulty in ${t.name}`} checked={difficult.includes(t.id)} onChange={() => toggle(difficult, setDifficult, t.id, confident, setConfident)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </fieldset>

      <section hidden={step !== 4} className="space-y-4" aria-labelledby="review-h">
        <h2 id="review-h" className="text-lg font-semibold text-navy-900">Review and start</h2>
        {level && (
          <dl className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Exam</dt><dd className="font-medium">{level.program.shortName} {level.name} — {level.syllabusLabel}</dd></div>
            <div><dt className="text-slate-500">Exam date</dt><dd className="font-medium">{examDate || "Not set (plan assumes 120 days)"}</dd></div>
            <div><dt className="text-slate-500">Weekly time</dt><dd className="font-medium">{weekly.toFixed(1)} hours</dd></div>
            <div><dt className="text-slate-500">Self-assessed</dt><dd className="font-medium">{confident.length} confident · {difficult.length} difficult</dd></div>
          </dl>
        )}
        <Alert tone="info" title="About the diagnostic">
          A short, untimed test across the syllabus (up to 20 questions). Answers are revealed at the end. Results are preliminary estimates that improve as you practise — they are not a prediction of your exam result.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <SubmitButton name="next" value="diagnostic" pendingLabel="Preparing…">Start diagnostic</SubmitButton>
          <SubmitButton name="next" value="skip" variant="secondary" pendingLabel="Building plan…">Skip for now and build my plan</SubmitButton>
        </div>
      </section>

      <div className="flex justify-between border-t border-slate-200 pt-4">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
        {step < STEPS.length - 1 && <Button type="button" onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext}>Continue</Button>}
      </div>
    </form>
  );
}
