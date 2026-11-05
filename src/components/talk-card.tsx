"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { Talk } from "@/content/talks";

/** Click-to-load YouTube embed (privacy-enhanced): nothing loads from YouTube until the learner presses play. */
export function TalkCard({ talk }: { talk: Talk }) {
  const [on, setOn] = useState(false);
  return (
    <article className="surface spotlight card-hover overflow-hidden">
      <div className="relative aspect-video overflow-hidden rounded-t-[1.2rem] bg-black">
        {on ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${talk.id}?autoplay=1&rel=0`}
            title={`${talk.title} — ${talk.speaker}`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setOn(true)} className="group absolute inset-0" aria-label={`Play ${talk.title} by ${talk.speaker}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${talk.id}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-tr from-[#0b0b2a] via-[#0b0b2a]/40 to-gold-600/30" />
            <span className="absolute left-4 top-4 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">{talk.source} · {talk.minutes} min</span>
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-gold-500 to-mint-500 shadow-xl shadow-gold-500/40 transition group-hover:scale-110"><Play className="ml-0.5 h-6 w-6 fill-white text-white" aria-hidden /></span>
            </span>
          </button>
        )}
      </div>
      <div className="p-4">
        <p className="font-display text-base font-bold text-navy-950">{talk.title}</p>
        <p className="text-xs text-slate-500">{talk.speaker}</p>
        <p className="mt-2 text-sm text-slate-600">{talk.why}</p>
        <a href={talk.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-mint-300 hover:underline">Watch on {talk.source} <ExternalLink className="h-3 w-3" aria-hidden /></a>
      </div>
    </article>
  );
}
