import { Badge, Card, CardTitle, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { VerificationBadge } from "@/components/verification";
import { StateForm } from "@/components/state-form";
import { SubmitButton } from "@/components/forms";
import { prisma } from "@/server/db";
import { pastPaperAction, verifyPastPaperAction } from "@/app/actions/admin";

export const metadata = { title: "Past papers · Admin" };

export default async function AdminPastPapers() {
  const [papers, programs] = await Promise.all([
    prisma.pastPaper.findMany({ orderBy: { createdAt: "desc" }, include: { program: true, level: true } }),
    prisma.examProgram.findMany({ orderBy: { name: "asc" }, include: { levels: { orderBy: { order: "asc" } } } }),
  ]);
  return (
    <>
      <PageHeader title="Past papers and official resources" description="Link to officially published past papers and samples, or record licensed papers. Never upload recalled or confidential exam questions." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ul className="divide-y divide-slate-100 text-sm">
            {papers.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><span className="font-medium">{p.title}</span> <span className="text-xs text-slate-500">· {p.program.shortName}{p.level ? ` ${p.level.name}` : ""}{p.year ? ` · ${p.year}` : ""}</span></span>
                <span className="flex items-center gap-2"><Badge>{p.kind.toLowerCase().replaceAll("_", " ")}</Badge><VerificationBadge status={p.verificationStatus} verifiedAt={p.verifiedAt} />{p.verificationStatus !== "VERIFIED" && <form action={verifyPastPaperAction.bind(null, p.id)}><SubmitButton size="sm" variant="ghost">Mark link verified</SubmitButton></form>}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Add a resource</CardTitle>
          <StateForm action={pastPaperAction} className="space-y-3">
            <Field id="programId" label="Exam">
              <Select id="programId" name="programId" required>{programs.map((p) => <option key={p.id} value={p.id}>{p.shortName}</option>)}</Select>
            </Field>
            <Field id="levelId" label="Level (optional)">
              <Select id="levelId" name="levelId" defaultValue=""><option value="">Any level</option>{programs.flatMap((p) => p.levels.map((l) => <option key={l.id} value={l.id}>{p.shortName} — {l.name}</option>))}</Select>
            </Field>
            <Field id="title" label="Title"><Input id="title" name="title" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="year" label="Year"><Input id="year" name="year" type="number" /></Field>
              <Field id="sessionLabel" label="Session"><Input id="sessionLabel" name="sessionLabel" placeholder="e.g. May" /></Field>
            </div>
            <Field id="kind" label="Kind">
              <Select id="kind" name="kind"><option value="OFFICIAL_PAST_PAPER">Official past paper (link)</option><option value="OFFICIAL_SAMPLE">Official sample (link)</option><option value="LICENSED">Licensed</option><option value="ORIGINAL_MOCK">PD FinPrep original mock</option></Select>
            </Field>
            <Field id="url" label="URL (https:// or internal path)"><Input id="url" name="url" /></Field>
            <Field id="licenseNote" label="Licence / source terms"><Textarea id="licenseNote" name="licenseNote" rows={2} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hasSuggestedAnswers" /> Suggested answers published</label>
            <SubmitButton size="sm">Add</SubmitButton>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
