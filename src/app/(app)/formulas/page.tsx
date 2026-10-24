import Link from "next/link";
import { Badge, Card, Input, LinkButton, PageHeader, Select, Button } from "@/components/ui";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";

export const metadata = { title: "Formula Library" };

export default async function FormulasPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; exam?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const [formulas, categories, programs, bookmarks] = await Promise.all([
    prisma.formula.findMany({
      where: {
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { expression: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }, { assumptions: { contains: q, mode: "insensitive" } }] } : {}),
        ...(sp.category ? { category: sp.category } : {}),
        ...(sp.exam ? { topics: { some: { topic: { syllabus: { level: { program: { slug: sp.exam } } } } } } } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { topics: { include: { topic: { include: { syllabus: { include: { level: { include: { program: true } } } } } } } } },
    }),
    prisma.formula.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.examProgram.findMany({ where: { levels: { some: { syllabi: { some: { topics: { some: { formulas: { some: {} } } } } } } } }, select: { slug: true, shortName: true } }),
    prisma.bookmark.findMany({ where: { userId: user.id, formulaId: { not: null } }, select: { formulaId: true } }),
  ]);
  const marked = new Set(bookmarks.map((b) => b.formulaId));
  const grouped = new Map<string, typeof formulas>();
  for (const f of formulas) grouped.set(f.category, [...(grouped.get(f.category) ?? []), f]);
  return (
    <>
      <PageHeader title="Formula Library" description="Formulas with variable definitions, conventions, assumptions, worked examples and calculators. Conventions can differ between exams and jurisdictions — check the 'applies to' note." actions={<LinkButton href="/formulas/drill" variant="gold">Formula recall drill</LinkButton>} />
      <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_12rem_10rem_auto]" role="search">
        <label className="sr-only" htmlFor="fq">Search formulas</label>
        <Input id="fq" name="q" placeholder="Search by name, symbol or topic" defaultValue={q} />
        <label className="sr-only" htmlFor="fc">Category</label>
        <Select id="fc" name="category" defaultValue={sp.category ?? ""}><option value="">All categories</option>{categories.map((c) => <option key={c.category}>{c.category}</option>)}</Select>
        <label className="sr-only" htmlFor="fe">Exam</label>
        <Select id="fe" name="exam" defaultValue={sp.exam ?? ""}><option value="">All exams</option>{programs.map((p) => <option key={p.slug} value={p.slug}>{p.shortName}</option>)}</Select>
        <Button type="submit">Search</Button>
      </form>
      {formulas.length === 0 && <p className="text-sm text-slate-600">No formulas match your search.</p>}
      {[...grouped.entries()].map(([cat, list]) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{cat}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((f) => (
              <Card key={f.id}>
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/formulas/${f.slug}`} className="font-semibold text-navy-900 underline-offset-2 hover:underline">{f.name}</Link>
                  {marked.has(f.id) && <Badge tone="gold">Bookmarked</Badge>}
                </div>
                <p className="formula mt-2 text-sm">{f.expression}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[...new Set(f.topics.map((t) => `${t.topic.syllabus.level.program.shortName} ${t.topic.syllabus.level.name}: ${t.topic.name}`))].map((l) => <Badge key={l}>{l}</Badge>)}
                  {f.calculatorKey && <Badge tone="green">Calculator</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
