import { Badge, Card, CardTitle, LinkButton, PageHeader, Stat, TabLinks, pct } from "@/components/ui";
import { FlashcardReview } from "@/components/flashcard-review";
import { CardForm } from "@/components/card-form";
import { SubmitButton } from "@/components/forms";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { dueQueue, revisionStats } from "@/server/learning/flashcards";
import { previewIntervals } from "@/server/adaptive/srs";
import { deleteCardAction, suspendCardAction, verifyCardAction } from "@/app/actions/content";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";

export const metadata = { title: "Flashcards" };

export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ tab?: string; topic?: string; weak?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = ["review", "mine", "suggested", "stats"].includes(sp.tab ?? "") ? sp.tab! : "review";
  const enrollment = await getPrimaryEnrollment(user.id);
  const topics = enrollment ? await prisma.topic.findMany({ where: { syllabusVersionId: enrollment.syllabusVersionId, parentId: null }, orderBy: { order: "asc" }, select: { id: true, name: true } }) : [];
  const now = new Date();
  const topicName = sp.topic ? topics.find((t) => t.id === sp.topic)?.name : null;

  return (
    <>
      <PageHeader title="Flashcards" description="Spaced repetition for formulas, definitions and your own mistakes. Intervals adapt to how well you recall each card." />
      <TabLinks
        active={tab}
        tabs={[
          { key: "review", label: "Review due", href: "/flashcards" },
          { key: "mine", label: "My cards", href: "/flashcards?tab=mine" },
          { key: "suggested", label: "Suggested (verify)", href: "/flashcards?tab=suggested" },
          { key: "stats", label: "Revision stats", href: "/flashcards?tab=stats" },
        ]}
      />
      {tab === "review" && <ReviewTab userId={user.id} topicId={sp.topic} topicName={topicName ?? null} weak={sp.weak === "1"} now={now} topics={topics} />}
      {tab === "mine" && <MineTab userId={user.id} topics={topics} />}
      {tab === "suggested" && <SuggestedTab userId={user.id} />}
      {tab === "stats" && <StatsTab userId={user.id} />}
    </>
  );
}

async function ReviewTab({ userId, topicId, topicName, weak, now, topics }: { userId: string; topicId?: string; topicName: string | null; weak: boolean; now: Date; topics: { id: string; name: string }[] }) {
  const due = await dueQueue(userId, { topicId, weakOnly: weak, limit: 30 });
  const cards = due.map((d) => ({
    id: d.flashcardId,
    front: d.flashcard.front,
    back: d.flashcard.back,
    topic: d.flashcard.topic?.name ?? null,
    kind: d.flashcard.kind,
    previews: previewIntervals(d, now),
  }));
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {(topicName || weak) && <p className="mb-3 text-sm text-slate-600">Filtered: {weak ? "weak topics" : topicName} · <a className="underline" href="/flashcards">show all</a></p>}
        <FlashcardReview key={`${topicId}-${weak}-${cards.length}`} cards={cards} />
      </div>
      <Card>
        <CardTitle>Focus a session</CardTitle>
        <div className="flex flex-col gap-2">
          <LinkButton href="/flashcards?weak=1" variant="secondary" size="sm">Weak-topic revision</LinkButton>
          {topics.map((t) => <a key={t.id} href={`/flashcards?topic=${t.id}`} className="text-sm text-navy-800 underline">{t.name}</a>)}
        </div>
      </Card>
    </div>
  );
}

async function MineTab({ userId, topics }: { userId: string; topics: { id: string; name: string }[] }) {
  const cards = await prisma.flashcard.findMany({ where: { ownerId: userId, verified: true }, orderBy: { createdAt: "desc" }, include: { topic: { select: { name: true } }, states: { where: { userId } } }, take: 200 });
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {cards.length === 0 && <p className="text-sm text-slate-600">You have no personal cards yet. Mistake cards are created automatically when you miss practice questions.</p>}
        {cards.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs"><Badge tone={c.kind === "MISTAKE" ? "red" : "navy"}>{c.kind.toLowerCase()}</Badge>{c.topic && <Badge>{c.topic.name}</Badge>}{c.states[0]?.suspended && <Badge tone="amber">Suspended</Badge>}{c.states[0] && <span className="text-slate-500">next review {c.states[0].dueAt.toISOString().slice(0, 10)} · lapses {c.states[0].lapses}</span>}</div>
            <p className="mt-2 whitespace-pre-line text-sm font-medium text-navy-900">{c.front}</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600">{c.back}</p>
            <div className="mt-2 flex gap-2">
              <form action={suspendCardAction.bind(null, c.id, !c.states[0]?.suspended)}><SubmitButton size="sm" variant="ghost">{c.states[0]?.suspended ? "Resume" : "Suspend"}</SubmitButton></form>
              <form action={deleteCardAction.bind(null, c.id)}><SubmitButton size="sm" variant="ghost">Delete</SubmitButton></form>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardTitle>Create a card</CardTitle>
        <CardForm topics={topics} />
      </Card>
    </div>
  );
}

async function SuggestedTab({ userId }: { userId: string }) {
  const cards = await prisma.flashcard.findMany({ where: { ownerId: userId, verified: false }, orderBy: { createdAt: "desc" }, include: { topic: { select: { name: true } } } });
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Suggested cards are drafted automatically from lessons. Check each one is accurate before adding it to your reviews — suggestions are not authoritative until you verify them.</p>
      {cards.length === 0 && <p className="text-sm text-slate-500">No suggestions waiting. Use “Suggest flashcards” on any lesson.</p>}
      {cards.map((c) => (
        <Card key={c.id} className="p-4">
          <p className="text-sm font-medium text-navy-900">{c.front}</p>
          <p className="mt-1 text-sm text-slate-700">{c.back}</p>
          <div className="mt-2 flex gap-2">
            <form action={verifyCardAction.bind(null, c.id)}><SubmitButton size="sm">Verify and add</SubmitButton></form>
            <form action={deleteCardAction.bind(null, c.id)}><SubmitButton size="sm" variant="ghost">Discard</SubmitButton></form>
          </div>
        </Card>
      ))}
    </div>
  );
}

async function StatsTab({ userId }: { userId: string }) {
  const [s, lapsed] = await Promise.all([
    revisionStats(userId),
    prisma.cardState.findMany({ where: { userId, lapses: { gt: 0 } }, orderBy: { lapses: "desc" }, take: 8, include: { flashcard: { select: { front: true } } } }),
  ]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reviews (30 days)" value={s.reviews30d} />
        <Stat label="Recall rate (30 days)" value={pct(s.retention30d)} hint="Share of reviews not rated 'Again'" />
        <Stat label="Forgotten (30 days)" value={s.forgotten30d} />
        <Stat label="Revision days (30 days)" value={s.reviewDays30d} />
      </div>
      <Card>
        <CardTitle>Most-forgotten cards</CardTitle>
        {lapsed.length === 0 ? <p className="text-sm text-slate-600">No forgotten cards yet.</p> : <ul className="space-y-1 text-sm">{lapsed.map((l) => <li key={l.id} className="flex justify-between gap-2"><span className="truncate">{l.flashcard.front.split("\n")[0]}</span><Badge tone="red">{l.lapses}×</Badge></li>)}</ul>}
      </Card>
    </div>
  );
}
