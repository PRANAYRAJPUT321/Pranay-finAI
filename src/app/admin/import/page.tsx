import { Card, PageHeader } from "@/components/ui";
import { ImportForm } from "@/components/import-form";
import { IMPORT_COLUMNS } from "@/server/admin/content";

export const metadata = { title: "Import · Admin" };

const SAMPLE = `externalKey,programSlug,levelCode,topicCode,type,difficulty,stem,optionA,optionB,optionC,correct,rationaleA,rationaleB,rationaleC,explanation,steps,concept,mistake,seconds,calcFn,calcArgs,calcScale
demo-001,cfa,L1,QM,MCQ,1,"5,000 invested at 7% for 8 years grows to:",8590.93,7800.00,9192.30,A,"FV = 5000 x 1.07^8","Simple interest","Nine periods","Compound growth: FV = PV(1+r)^N","r = 0.07|N = 8|FV = 8,590.93",Compounding,Using simple interest,75,futureValue,"{""pv"":5000,""rate"":0.07,""periods"":8}",1`;

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Import questions" description="Validate CSV or JSON templates, then import valid rows into the review queue. Rows are rejected if the payload is invalid, the topic is unknown, the key is duplicated, or the deterministic answer check fails." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><ImportForm /></Card>
        <Card>
          <p className="text-sm font-medium text-navy-900">Columns</p>
          <p className="mt-1 break-words font-mono text-xs text-slate-600">{IMPORT_COLUMNS.join(", ")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li><code>correct</code>: letters, e.g. <code>A</code> or <code>A,C</code> for multiple select.</li>
            <li><code>steps</code>: separate with <code>|</code>.</li>
            <li><code>calcArgs</code>: JSON object for the named calculator.</li>
            <li><code>origin</code>: ORIGINAL, AI_GENERATED or LICENSED. AI-generated content always requires human review before publishing.</li>
            <li>Only original or properly licensed questions may be imported. Do not import recalled or confidential exam questions.</li>
          </ul>
          <p className="mt-3 text-sm font-medium text-navy-900">Example</p>
          <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-[11px]">{SAMPLE}</pre>
        </Card>
      </div>
    </>
  );
}
