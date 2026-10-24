import { Field, Input, Select, Textarea } from "../ui";

interface Opt { id: string; text: string; correct: boolean; rationale: string }

export interface QuestionFormData {
  syllabusVersionId: string;
  topicId?: string;
  learningOutcomeId?: string | null;
  formulaId?: string | null;
  type?: string;
  difficulty?: number;
  stem?: string;
  options?: Opt[];
  numeric?: { answer: number; tolerance: number; toleranceType: string; unit?: string; decimals: number };
  written?: { rubric: unknown; modelAnswer: string };
  calcSpec?: unknown;
  explanation?: string;
  steps?: string[];
  conceptTested?: string;
  commonMistake?: string | null;
  estimatedSeconds?: number;
  context?: string | null;
  origin?: string;
  externalKey?: string | null;
}

/** Server-rendered question editor fields (works without client JS). */
export function QuestionFields({ d, topics, outcomes, formulas, editing }: { d: QuestionFormData; topics: { id: string; name: string }[]; outcomes: { id: string; label: string }[]; formulas: { id: string; name: string }[]; editing: boolean }) {
  const opts: Opt[] = [...(d.options ?? [])];
  while (opts.length < 5) opts.push({ id: String.fromCharCode(97 + opts.length), text: "", correct: false, rationale: "" });
  return (
    <div className="space-y-4">
      <input type="hidden" name="syllabusVersionId" value={d.syllabusVersionId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="topicId" label="Topic"><Select id="topicId" name="topicId" defaultValue={d.topicId ?? ""} required><option value="">Choose…</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field id="type" label="Type"><Select id="type" name="type" defaultValue={d.type ?? "MCQ"}><option value="MCQ">Multiple choice</option><option value="MULTI_SELECT">Multiple select</option><option value="NUMERIC">Numerical</option><option value="WRITTEN">Written response</option></Select></Field>
        <Field id="difficulty" label="Difficulty"><Select id="difficulty" name="difficulty" defaultValue={String(d.difficulty ?? 2)}><option value="1">1 — easier</option><option value="2">2 — medium</option><option value="3">3 — harder</option></Select></Field>
        <Field id="estimatedSeconds" label="Estimated seconds"><Input id="estimatedSeconds" name="estimatedSeconds" type="number" min={15} max={1800} defaultValue={d.estimatedSeconds ?? 90} /></Field>
        <Field id="learningOutcomeId" label="Learning outcome"><Select id="learningOutcomeId" name="learningOutcomeId" defaultValue={d.learningOutcomeId ?? ""}><option value="">None</option>{outcomes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select></Field>
        <Field id="formulaId" label="Formula tested"><Select id="formulaId" name="formulaId" defaultValue={d.formulaId ?? ""}><option value="">None</option>{formulas.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        <Field id="origin" label="Origin"><Select id="origin" name="origin" defaultValue={d.origin ?? "ORIGINAL"}><option value="ORIGINAL">Original</option><option value="AI_GENERATED">AI-generated (needs review)</option><option value="LICENSED">Licensed</option></Select></Field>
        <Field id="externalKey" label="External key (optional)"><Input id="externalKey" name="externalKey" defaultValue={d.externalKey ?? ""} maxLength={80} /></Field>
      </div>
      <Field id="stem" label="Question stem"><Textarea id="stem" name="stem" rows={4} defaultValue={d.stem ?? ""} /></Field>
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Options (multiple choice / select)</legend>
        <div className="space-y-3">
          {opts.map((o, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[2rem_1fr_1fr_auto] sm:items-start">
              <span className="pt-2 text-sm font-semibold text-slate-500">{String.fromCharCode(65 + i)}</span>
              <input type="hidden" name={`opt_id_${i}`} value={o.id} />
              <Textarea aria-label={`Option ${i + 1} text`} name={`opt_text_${i}`} rows={2} defaultValue={o.text} placeholder="Option text" />
              <Textarea aria-label={`Option ${i + 1} rationale`} name={`opt_rationale_${i}`} rows={2} defaultValue={o.rationale} placeholder="Why it is right / wrong" />
              <label className="flex items-center gap-1 pt-2 text-sm"><input type="checkbox" name={`opt_correct_${i}`} defaultChecked={o.correct} /> Correct</label>
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-5">
        <legend className="px-1 text-sm font-medium text-slate-700">Numerical answer</legend>
        <Field id="num_answer" label="Answer"><Input id="num_answer" name="num_answer" type="number" step="any" defaultValue={d.numeric?.answer ?? ""} /></Field>
        <Field id="num_tolerance" label="Tolerance"><Input id="num_tolerance" name="num_tolerance" type="number" step="any" defaultValue={d.numeric?.tolerance ?? ""} /></Field>
        <Field id="num_tolerance_type" label="Tolerance type"><Select id="num_tolerance_type" name="num_tolerance_type" defaultValue={d.numeric?.toleranceType ?? "absolute"}><option value="absolute">Absolute</option><option value="relative">Relative</option></Select></Field>
        <Field id="num_unit" label="Unit"><Input id="num_unit" name="num_unit" defaultValue={d.numeric?.unit ?? ""} /></Field>
        <Field id="num_decimals" label="Display decimals"><Input id="num_decimals" name="num_decimals" type="number" min={0} max={8} defaultValue={d.numeric?.decimals ?? 2} /></Field>
      </fieldset>
      <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Written response</legend>
        <Field id="written_rubric" label='Rubric JSON — [{"criterion":"…","points":2,"keywords":["…"]}]'><Textarea id="written_rubric" name="written_rubric" rows={3} className="font-mono text-xs" defaultValue={d.written ? JSON.stringify(d.written.rubric, null, 1) : ""} /></Field>
        <Field id="written_model" label="Model answer"><Textarea id="written_model" name="written_model" rows={3} defaultValue={d.written?.modelAnswer ?? ""} /></Field>
      </fieldset>
      <Field id="calcSpec" label='Deterministic check (JSON) — e.g. {"fn":"bondPrice","args":{"face":1000,"couponRate":0.05,"ytm":0.06,"years":4,"frequency":1},"scale":1}' hint="Required for calculation questions: the answer key must match the calculator before publishing.">
        <Textarea id="calcSpec" name="calcSpec" rows={2} className="font-mono text-xs" defaultValue={d.calcSpec ? JSON.stringify(d.calcSpec) : ""} />
      </Field>
      <Field id="explanation" label="Detailed explanation"><Textarea id="explanation" name="explanation" rows={4} defaultValue={d.explanation ?? ""} /></Field>
      <Field id="steps" label="Calculation steps (one per line)"><Textarea id="steps" name="steps" rows={4} defaultValue={(d.steps ?? []).join("\n")} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="conceptTested" label="Concept tested"><Input id="conceptTested" name="conceptTested" defaultValue={d.conceptTested ?? ""} /></Field>
        <Field id="commonMistake" label="Common mistake"><Input id="commonMistake" name="commonMistake" defaultValue={d.commonMistake ?? ""} /></Field>
        <Field id="context" label="Context (jurisdiction / standard / tax year)"><Input id="context" name="context" defaultValue={d.context ?? ""} /></Field>
      </div>
      {editing && <Field id="reason" label="Reason for change (required, stored in version history)"><Input id="reason" name="reason" required /></Field>}
    </div>
  );
}
