import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Alert, Badge, Card, CardTitle, LinkButton, PageHeader, fmtDate } from "@/components/ui";
import { VerificationBadge } from "@/components/verification";
import { getProgramBySlug, weightLabel } from "@/server/catalog/service";
import { parseStructure } from "@/server/catalog/structure";

export const dynamic = "force-dynamic";

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) notFound();
  return (
    <>
      <PageHeader
        title={program.name}
        description={program.description}
        actions={
          <>
            {program.officialUrl && (
              <a href={program.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-800 hover:bg-navy-50">
                Official source <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            <LinkButton href="/onboarding">Prepare for this exam</LinkButton>
          </>
        }
      />
      <Alert tone="info" className="mb-6">
        <strong>{program.awardingBody}</strong> · {program.country}
        {program.jurisdiction ? ` · ${program.jurisdiction}` : ""}. {program.licensingNote}
      </Alert>
      <div className="space-y-6">
        {program.levels.map((level) => (
          <Card key={level.id}>
            <CardTitle>{level.name}</CardTitle>
            {level.description && <p className="-mt-2 mb-3 text-sm text-slate-600">{level.description}</p>}
            {level.syllabi.length === 0 && <p className="text-sm text-slate-500">No syllabus configured yet.</p>}
            {level.syllabi.map((s) => {
              const st = parseStructure(s.structure);
              return (
                <div key={s.id} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone="navy">{s.versionLabel}</Badge>
                    <Badge tone={s.status === "CURRENT" ? "green" : "slate"}>{s.status.toLowerCase()}</Badge>
                    <VerificationBadge status={s.verificationStatus} verifiedAt={s.verifiedAt} />
                    {s.effectiveFrom && <span className="text-slate-500">Effective {fmtDate(s.effectiveFrom)}</span>}
                    <span className="text-slate-500">{s._count.questions} published questions</span>
                  </div>
                  {s.notes && <p className="text-xs text-slate-500">{s.notes}</p>}
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-slate-500">Duration</dt><dd className="font-medium">{st.durationMinutes ? `${st.durationMinutes} min` : "Not configured"}</dd></div>
                    <div><dt className="text-slate-500">Sections</dt><dd className="font-medium">{st.sections.map((x) => `${x.name} (${x.questionCount} Q${x.minutes ? `, ${x.minutes} min` : ""})`).join("; ")}</dd></div>
                    <div><dt className="text-slate-500">Formats</dt><dd className="font-medium">{st.questionFormats.join(", ")}</dd></div>
                    <div><dt className="text-slate-500">Scoring</dt><dd className="font-medium">{st.scoring.passingScore && st.scoring.passingScoreVerified ? st.scoring.passingScore : "No verified passing score"}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-slate-500">Calculator</dt><dd>{st.calculatorPolicy}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-slate-500">Formula sheet</dt><dd>{st.formulaSheet}</dd></div>
                  </dl>
                  {s.topics.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <caption className="sr-only">Topics and weightings</caption>
                        <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3 font-medium">Topic</th><th className="py-2 pr-3 font-medium">Weight</th><th className="py-2 font-medium">Subtopics</th></tr></thead>
                        <tbody>
                          {s.topics.map((t) => (
                            <tr key={t.id} className="border-b last:border-0 align-top">
                              <td className="py-2 pr-3 font-medium text-navy-900">{t.name}</td>
                              <td className="whitespace-nowrap py-2 pr-3">{weightLabel(t)}</td>
                              <td className="py-2 text-slate-600">{t.children.map((c) => c.name).join(" · ") || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {s.windows.length > 0 && (
                    <p className="text-sm">Exam windows: {s.windows.map((w) => `${w.label} (${fmtDate(w.startDate)}–${fmtDate(w.endDate)}${w.verified ? "" : ", unverified"})`).join("; ")}</p>
                  )}
                </div>
              );
            })}
          </Card>
        ))}
        {program.pastPapers.length > 0 && (
          <Card>
            <CardTitle>Past papers and official practice resources</CardTitle>
            <ul className="space-y-2 text-sm">
              {program.pastPapers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  {p.url?.startsWith("/") ? <Link href={p.url} className="font-medium text-navy-800 underline">{p.title}</Link> : <a href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-800 underline">{p.title}</a>}
                  <Badge tone={p.kind === "ORIGINAL_MOCK" ? "gold" : "navy"}>{p.kind === "ORIGINAL_MOCK" ? "PD FinPrep original" : "Official (linked)"}</Badge>
                  <span className="text-xs text-slate-500">{p.licenseNote}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
