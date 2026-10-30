import { Check, Minus, X } from "lucide-react";
import { Card, CardTitle, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DailyChallengeCard } from "@/components/daily-challenge";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { dailyChallengeStats, getDailyChallenge } from "@/server/engagement/service";
import { addDays, toDateKey, utcDay } from "@/server/planner/generate";

export const metadata = { title: "Daily Challenge" };

export default async function DailyPage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to unlock the daily challenge" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const [challenge, stats] = await Promise.all([getDailyChallenge(user.id, enrollment.syllabusVersionId), dailyChallengeStats(user.id)]);
  const results = new Map(stats.last14.map((d) => [d.date, d.correct]));
  const today = utcDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  return (
    <>
      <PageHeader eyebrow="Practice / One a day" title="Daily Challenge" description={`One exam-style question from ${enrollment.program.shortName} ${enrollment.level.name} every day — chosen from questions you haven't seen yet. Answer it to keep your daily streak going.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {challenge ? <DailyChallengeCard initial={challenge} streak={stats.streak} /> : <EmptyState title="No questions available yet" description="The daily challenge needs published multiple-choice questions for your exam." />}
        <aside className="space-y-4">
          <Card>
            <CardTitle>Your record</CardTitle>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-[10px] uppercase tracking-widest text-slate-500">Streak</dt><dd className="font-display text-3xl font-black text-gold-500">{stats.streak}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-widest text-slate-500">Answered</dt><dd className="font-display text-3xl font-black text-navy-950">{stats.answered}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-widest text-slate-500">Correct</dt><dd className="font-display text-3xl font-black text-navy-950">{stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0}%</dd></div>
            </dl>
          </Card>
          <Card>
            <CardTitle>Last 14 days</CardTitle>
            <ol className="grid grid-cols-7 gap-1.5" aria-label="Daily challenge history">
              {days.map((d) => {
                const key = toDateKey(d);
                const r = results.get(key);
                return (
                  <li key={key} title={`${key}: ${r === undefined ? "not answered" : r ? "correct" : "incorrect"}`} className={`grid aspect-square place-items-center rounded-lg text-white ${r === undefined ? "bg-slate-100 text-slate-400" : r ? "bg-mint-500" : "bg-gold-500"}`}>
                    {r === undefined ? <Minus className="h-3 w-3" aria-label="not answered" /> : r ? <Check className="h-4 w-4" aria-label="correct" /> : <X className="h-4 w-4" aria-label="incorrect" />}
                  </li>
                );
              })}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
