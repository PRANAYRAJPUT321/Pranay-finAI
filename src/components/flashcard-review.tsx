"use client";

import { useState, useTransition } from "react";
import { reviewCardAction } from "@/app/actions/content";
import { Badge, Button, Card } from "./ui";

export interface ReviewCard {
  id: string;
  front: string;
  back: string;
  topic: string | null;
  kind: string;
  previews: Record<1 | 2 | 3 | 4, string>;
}

const RATINGS = [
  { v: 1 as const, label: "Again", hint: "Forgot", variant: "danger" as const },
  { v: 2 as const, label: "Hard", hint: "Recalled with effort", variant: "secondary" as const },
  { v: 3 as const, label: "Good", hint: "Recalled", variant: "primary" as const },
  { v: 4 as const, label: "Easy", hint: "Instant", variant: "gold" as const },
];

export function FlashcardReview({ cards: initial }: { cards: ReviewCard[] }) {
  // Snapshot the queue for this session: reviewing revalidates the page, which would otherwise shrink the list under us.
  const [cards] = useState(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, start] = useTransition();
  const [stats, setStats] = useState({ again: 0, done: 0 });
  const card = cards[i];
  if (!card) {
    return (
      <Card className="text-center">
        <p className="font-medium text-navy-900">{cards.length ? "Session complete" : "Nothing due right now"}</p>
        {cards.length > 0 && <p className="mt-1 text-sm text-slate-600">{stats.done} reviewed · {stats.again} to see again soon</p>}
        <p className="mt-2 text-xs text-slate-500">Rate honestly — the schedule only works if ratings reflect real recall.</p>
      </Card>
    );
  }
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Card {i + 1} of {cards.length}</span>
        <span className="flex gap-1">{card.topic && <Badge>{card.topic}</Badge>}<Badge tone={card.kind === "MISTAKE" ? "red" : card.kind === "FORMULA" ? "blue" : "navy"}>{card.kind.toLowerCase()}</Badge></span>
      </div>
      <div className="min-h-32 whitespace-pre-line rounded-lg bg-navy-50 p-4 text-base text-navy-950">{card.front}</div>
      {flipped ? (
        <>
          <div className="mt-3 min-h-20 whitespace-pre-line rounded-lg border border-slate-200 p-4 text-sm text-slate-800" aria-live="polite">{card.back}</div>
          <p className="mt-4 text-xs text-slate-500">How well did you recall it?</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((r) => (
              <Button
                key={r.v}
                variant={r.variant}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await reviewCardAction(card.id, r.v);
                    setStats((s) => ({ done: s.done + 1, again: s.again + (r.v === 1 ? 1 : 0) }));
                    setFlipped(false);
                    setI((x) => x + 1);
                  })
                }
                className="flex-col !gap-0"
              >
                <span>{r.label}</span>
                <span className="text-[11px] opacity-80">{card.previews[r.v]}</span>
              </Button>
            ))}
          </div>
        </>
      ) : (
        <Button className="mt-4 w-full" onClick={() => setFlipped(true)}>Show answer</Button>
      )}
    </Card>
  );
}
