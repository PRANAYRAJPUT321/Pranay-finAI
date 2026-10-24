"use client";

import { useMemo, useState } from "react";
import { createCardAction } from "@/app/actions/content";
import { Button, Card } from "./ui";

export function FormulaDrill({ formulas }: { formulas: { id: string; name: string; expression: string; category: string; assumptions: string }[] }) {
  const deck = useMemo(() => [...formulas].sort(() => Math.random() - 0.5), [formulas]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [missed, setMissed] = useState<string[]>([]);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const f = deck[i];
  if (!f) {
    return (
      <Card>
        <p className="font-medium text-navy-900">Drill complete — you recalled {deck.length - missed.length} of {deck.length}.</p>
        {missed.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {deck.filter((d) => missed.includes(d.id)).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
                <span>{d.name}</span>
                {added[d.id] ? <span className="text-xs text-emerald-700">Added to flashcards</span> : (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    const fd = new FormData();
                    fd.set("front", `Formula: ${d.name}?`);
                    fd.set("back", `${d.expression}\n\nAssumptions: ${d.assumptions}`);
                    await createCardAction({}, fd);
                    setAdded((a) => ({ ...a, [d.id]: true }));
                  }}>Add to my flashcards</Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-4" onClick={() => { setI(0); setMissed([]); setShown(false); }}>Start again</Button>
      </Card>
    );
  }
  return (
    <Card>
      <p className="text-xs text-slate-500">{i + 1} of {deck.length} · {f.category}</p>
      <p className="mt-2 text-lg font-semibold text-navy-900">{f.name}</p>
      <p className="mt-1 text-sm text-slate-600">Write the formula from memory, then reveal it.</p>
      {shown ? <p className="formula mt-4">{f.expression}</p> : <Button className="mt-4" onClick={() => setShown(true)}>Reveal formula</Button>}
      {shown && (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => { setMissed((m) => [...m, f.id]); setShown(false); setI(i + 1); }}>I didn&apos;t recall it</Button>
          <Button onClick={() => { setShown(false); setI(i + 1); }}>I recalled it</Button>
        </div>
      )}
    </Card>
  );
}
