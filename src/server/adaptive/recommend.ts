/**
 * Rule-based next-step recommendations, in the documented priority order:
 *  1. foundational topics blocking others
 *  2. heavily weighted topics with persistent weakness
 *  3. concepts repeatedly answered incorrectly
 *  4. items due for spaced revision
 *  5. timed practice where speed is the problem
 *  6. maintenance of strong topics
 * Topics never attempted are suggested for learning in syllabus order.
 */
import type { Mastery } from "@prisma/client";

export interface TopicSignal {
  topicId: string;
  name: string;
  weight: number; // percent midpoint, 0 if unknown
  prerequisiteOf: string[]; // topic ids that depend on this one
  mastery: Mastery;
  estimate: number;
  attempts: number;
  avgTimeRatio: number | null;
  recentWrong: number; // wrong answers in the last 14 days
  dueReviews: number; // questions + flashcards due
  lastPracticedAt: Date | null;
  lessonCompleted: boolean;
}

export type RecommendationKind = "learn" | "practice" | "revise" | "timed_practice" | "maintain";

export interface Recommendation {
  topicId: string;
  topicName: string;
  kind: RecommendationKind;
  priority: number; // 1 (highest) .. 7
  reason: string;
}

const WEAK: Mastery[] = ["NEEDS_WORK", "DEVELOPING"];

export function recommend(signals: TopicSignal[], now: Date, limit = 6): Recommendation[] {
  const recs: Recommendation[] = [];
  const weakIds = new Set(signals.filter((s) => s.attempts > 0 && s.estimate < 0.6).map((s) => s.topicId));
  for (const s of signals) {
    const blocking = s.prerequisiteOf.length > 0 && (s.mastery === "NOT_STARTED" || weakIds.has(s.topicId));
    if (blocking) {
      recs.push({
        topicId: s.topicId,
        topicName: s.name,
        kind: s.lessonCompleted ? "practice" : "learn",
        priority: 1,
        reason: `Foundation for ${s.prerequisiteOf.length} other topic${s.prerequisiteOf.length > 1 ? "s" : ""}; ${s.mastery === "NOT_STARTED" ? "not yet studied" : `current estimate ${Math.round(s.estimate * 100)}%`}.`,
      });
      continue;
    }
    if (s.weight >= 10 && WEAK.includes(s.mastery) && s.attempts >= 5) {
      recs.push({ topicId: s.topicId, topicName: s.name, kind: "practice", priority: 2, reason: `High-weight topic (~${s.weight}% of the exam) with a persistent weakness (${Math.round(s.estimate * 100)}%).` });
      continue;
    }
    if (s.recentWrong >= 3) {
      recs.push({ topicId: s.topicId, topicName: s.name, kind: "practice", priority: 3, reason: `${s.recentWrong} incorrect answers in the last 14 days — revisit the concept and retry similar questions.` });
      continue;
    }
    if (s.dueReviews > 0) {
      recs.push({ topicId: s.topicId, topicName: s.name, kind: "revise", priority: 4, reason: `${s.dueReviews} item${s.dueReviews > 1 ? "s" : ""} due for spaced revision.` });
      continue;
    }
    if (s.avgTimeRatio !== null && s.avgTimeRatio > 1.3 && s.attempts >= 5 && s.estimate >= 0.6) {
      recs.push({ topicId: s.topicId, topicName: s.name, kind: "timed_practice", priority: 5, reason: `Accurate but slow: averaging ${s.avgTimeRatio.toFixed(1)}x the target time per question.` });
      continue;
    }
    if (s.mastery === "NOT_STARTED") {
      recs.push({ topicId: s.topicId, topicName: s.name, kind: "learn", priority: 6, reason: "Not yet started." });
      continue;
    }
    if (WEAK.includes(s.mastery) || s.mastery === "INSUFFICIENT_EVIDENCE") {
      recs.push({ topicId: s.topicId, topicName: s.name, kind: "practice", priority: 6, reason: s.mastery === "INSUFFICIENT_EVIDENCE" ? "More practice needed before we can estimate proficiency." : `Developing (${Math.round(s.estimate * 100)}%).` });
      continue;
    }
    const idleDays = s.lastPracticedAt ? (now.getTime() - s.lastPracticedAt.getTime()) / 86_400_000 : Infinity;
    if ((s.mastery === "PROFICIENT" || s.mastery === "MASTERED") && idleDays > 14) {
      recs.push({ topicId: s.topicId, topicName: s.name, kind: "maintain", priority: 7, reason: `Strong topic not practised for ${Math.floor(idleDays)} days — a short maintenance set keeps it fresh.` });
    }
  }
  return recs.sort((a, b) => a.priority - b.priority || weightOf(signals, b.topicId) - weightOf(signals, a.topicId)).slice(0, limit);
}

function weightOf(signals: TopicSignal[], id: string) {
  return signals.find((s) => s.topicId === id)?.weight ?? 0;
}
