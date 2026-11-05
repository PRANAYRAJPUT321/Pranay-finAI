import { ResourceHub } from "@/components/resource-hub";
import { TalkCard } from "@/components/talk-card";
import { RESOURCES, RESOURCES_CHECKED } from "@/content/resources";
import { LECTURES, TALKS } from "@/content/talks";

/** Shared body of the public /resources page and the in-app /hub page. */
export function ResourcePageBody({ programs, defaultProgram }: { programs: { slug: string; shortName: string }[]; defaultProgram?: string }) {
  const used = new Set(RESOURCES.flatMap((r) => r.programs));
  return (
    <>
      <ResourceHub resources={RESOURCES} programs={programs.filter((p) => used.has(p.slug))} defaultProgram={defaultProgram} checked={RESOURCES_CHECKED} />
      <section className="mt-10" aria-labelledby="theatre-title">
        <p className="eyebrow text-fuchsia-300">Lecture theatre</p>
        <h2 id="theatre-title" className="font-display mt-1 text-2xl font-bold text-navy-950">Watch without leaving PD FinPrep</h2>
        <p className="mt-1 text-sm text-slate-600">Hand-picked talks and lectures, played through YouTube&apos;s privacy-enhanced player only when you press play.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...LECTURES, ...TALKS].map((t) => <TalkCard key={t.id} talk={t} />)}
        </div>
      </section>
    </>
  );
}
