import { EmptyState, LinkButton, PageHeader, fmtDate } from "@/components/ui";
import { RapidFire } from "@/components/rapid-fire";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { RAPID_FIRE_SECONDS, rapidFireDeck, rapidFireHistory } from "@/server/engagement/service";

export const metadata = { title: "Rapid Fire" };
export const dynamic = "force-dynamic";

export default async function RapidFirePage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to play rapid fire" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const [deck, history] = await Promise.all([rapidFireDeck(enrollment.syllabusVersionId), rapidFireHistory(user.id, enrollment.syllabusVersionId)]);
  return (
    <>
      <PageHeader eyebrow="Practice / 60-second drill" title="Rapid Fire" description={`A fast, game-style round of short questions from ${enrollment.program.shortName} ${enrollment.level.name}. Great for a warm-up before a study session or a quick win on a busy day. Your scores are private — there are no public leaderboards.`} />
      <RapidFire deck={deck} best={history.best} seconds={RAPID_FIRE_SECONDS} />
      {history.recent.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-xl font-black uppercase text-navy-950">Recent rounds</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {history.recent.map((r, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-display text-2xl font-black text-navy-950">{r.score}</p>
                <p className="text-xs text-slate-500">{r.correct}/{r.answered} correct · {fmtDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
