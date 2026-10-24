import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { VerificationBadge } from "@/components/verification";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";

export const metadata = { title: "Past Papers" };

const KIND = {
  OFFICIAL_PAST_PAPER: { label: "Official past paper (linked)", tone: "navy" },
  OFFICIAL_SAMPLE: { label: "Official sample / practice (linked)", tone: "blue" },
  LICENSED: { label: "Licensed", tone: "green" },
  ORIGINAL_MOCK: { label: "PD FinPrep original mock", tone: "gold" },
} as const;

export default async function PastPapersPage() {
  const user = await requireUser();
  const enrolledPrograms = (await prisma.enrollment.findMany({ where: { userId: user.id, status: "active" }, select: { programId: true } })).map((e) => e.programId);
  const papers = await prisma.pastPaper.findMany({ orderBy: [{ program: { name: "asc" } }, { year: "desc" }], include: { program: true, level: true } });
  const sorted = [...papers].sort((a, b) => Number(enrolledPrograms.includes(b.programId)) - Number(enrolledPrograms.includes(a.programId)));
  const byProgram = new Map<string, typeof papers>();
  for (const p of sorted) byProgram.set(p.program.name, [...(byProgram.get(p.program.name) ?? []), p]);
  return (
    <>
      <PageHeader title="Past papers and official practice" description="Where to find previous examination papers and official practice material for each exam, plus PD FinPrep's own original mocks." />
      <Alert tone="info" className="mb-6" title="How we handle previous-year papers">
        Some awarding bodies publish past papers and suggested answers (for example ICAI and ACCA); others keep exam questions confidential and only release practice material to registered candidates (for example CFA Institute and GARP). PD FinPrep links to official sources and never copies protected papers or recalled exam questions. Licensed papers can be added by an administrator when a licence exists.
      </Alert>
      <div className="space-y-6">
        {[...byProgram.entries()].map(([name, list]) => (
          <Card key={name}>
            <h2 className="mb-3 font-semibold text-navy-900">{name}{enrolledPrograms.includes(list[0].programId) && <Badge tone="gold" className="ml-2">Your exam</Badge>}</h2>
            <ul className="space-y-3">
              {list.map((p) => (
                <li key={p.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.url?.startsWith("/") ? (
                      <Link href={p.url} className="font-medium text-navy-800 underline">{p.title}</Link>
                    ) : (
                      <a href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-navy-800 underline">{p.title} <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
                    )}
                    <Badge tone={KIND[p.kind].tone}>{KIND[p.kind].label}</Badge>
                    {p.level && <Badge>{p.level.name}</Badge>}
                    {p.year && <Badge>{p.year}{p.sessionLabel ? ` ${p.sessionLabel}` : ""}</Badge>}
                    {p.hasSuggestedAnswers && <Badge tone="green">Suggested answers published</Badge>}
                    {p.kind !== "ORIGINAL_MOCK" && <VerificationBadge status={p.verificationStatus} verifiedAt={p.verifiedAt} />}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{p.licenseNote}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
