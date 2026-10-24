import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { VerificationBadge } from "@/components/verification";
import { listPrograms } from "@/server/catalog/service";
import { Reveal } from "@/components/motion";

export const metadata = { title: "Exam catalog" };
export const dynamic = "force-dynamic";

const FAMILY: Record<string, string> = {
  FINANCE_INVESTMENT: "Finance & investment",
  ACCOUNTING_AUDIT: "Accounting & audit",
  TAXATION: "Taxation",
  BANKING_MARKETS: "Banking & markets",
  FINANCIAL_PLANNING: "Financial planning",
  RISK: "Risk management",
};

export default async function CatalogPage() {
  const programs = await listPrograms();
  const families = [...new Set(programs.map((p) => p.family))];
  return (
    <>
      <PageHeader title="Exam catalog" description="Programs, levels and syllabus versions configured in PD FinPrep. Structures marked unverified have not yet been checked against the official source." />
      {families.map((f) => (
        <section key={f} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{FAMILY[f]}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {programs.filter((p) => p.family === f).map((p, i) => (
              <Reveal key={p.id} delay={(i % 2) * 90}>
              <Link href={`/catalog/${p.slug}`} className="card-hover group block h-full rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy-900">{p.name}</p>
                    <p className="text-sm text-slate-600">{p.awardingBody} · {p.country}</p>
                  </div>
                  <span className="bg-gradient-gold rounded-lg px-2 py-1 text-xs font-bold text-navy-950 shadow-sm transition-transform group-hover:scale-110">{p.shortName}</span>
                </div>
                <ul className="mt-3 space-y-1">
                  {p.levels.map((l) => {
                    const s = l.syllabi[0];
                    return (
                      <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>{l.name}</span>
                        {s ? (
                          <>
                            <VerificationBadge status={s.verificationStatus} verifiedAt={s.verifiedAt} />
                            <Badge tone={s._count.questions > 0 ? "green" : "slate"}>{s._count.questions > 0 ? `${s._count.questions} questions` : "Structure only"}</Badge>
                          </>
                        ) : (
                          <Badge>Not configured</Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
