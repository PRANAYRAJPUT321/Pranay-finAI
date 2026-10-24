/** Result report computation for a submitted attempt (pure). */

export interface SummaryItem {
  questionId: string;
  topicId: string;
  topicName: string;
  difficulty: number;
  isCorrect: boolean;
  answered: boolean;
  timeSpentSeconds: number;
  estimatedSeconds: number;
  confidence: number | null;
  section: number;
}

export interface TopicResult {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
  pct: number;
  avgSeconds: number;
}

export interface AttemptSummary {
  correct: number;
  total: number;
  answered: number;
  scorePct: number;
  byTopic: TopicResult[];
  byDifficulty: { difficulty: number; correct: number; total: number }[];
  bySection: { section: number; correct: number; total: number }[];
  time: {
    totalSeconds: number;
    avgSecondsPerQuestion: number;
    targetSecondsPerQuestion: number;
    slowQuestions: number; // > 1.5x estimate
    rushedQuestions: number; // < 0.3x estimate and wrong
  };
  confidence: { confidentWrong: number; guessedRight: number };
  suggestedErrors: Record<string, string>; // questionId -> category
}

export function suggestErrorCategory(item: SummaryItem): string | null {
  if (item.isCorrect) return null;
  if (!item.answered) return "not_attempted";
  const ratio = item.estimatedSeconds > 0 ? item.timeSpentSeconds / item.estimatedSeconds : 1;
  if (item.confidence === 3) return "conceptual";
  if (ratio < 0.3) return "careless";
  if (ratio > 1.5) return "time_pressure";
  return null; // left for the learner to classify
}

export function summarizeAttempt(items: SummaryItem[]): AttemptSummary {
  const total = items.length;
  const correct = items.filter((i) => i.isCorrect).length;
  const answered = items.filter((i) => i.answered).length;
  const topics = new Map<string, TopicResult & { time: number }>();
  for (const i of items) {
    const t = topics.get(i.topicId) ?? { topicId: i.topicId, topicName: i.topicName, correct: 0, total: 0, pct: 0, avgSeconds: 0, time: 0 };
    t.total += 1;
    t.correct += i.isCorrect ? 1 : 0;
    t.time += i.timeSpentSeconds;
    topics.set(i.topicId, t);
  }
  const byTopic = [...topics.values()]
    .map(({ time, ...t }) => ({ ...t, pct: t.total ? (t.correct / t.total) * 100 : 0, avgSeconds: t.total ? time / t.total : 0 }))
    .sort((a, b) => a.pct - b.pct);
  const group = <K extends "difficulty" | "section">(key: K) => {
    const m = new Map<number, { correct: number; total: number }>();
    for (const i of items) {
      const g = m.get(i[key]) ?? { correct: 0, total: 0 };
      g.total += 1;
      g.correct += i.isCorrect ? 1 : 0;
      m.set(i[key], g);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  };
  const totalSeconds = items.reduce((a, i) => a + i.timeSpentSeconds, 0);
  const targetSeconds = items.reduce((a, i) => a + i.estimatedSeconds, 0);
  const suggestedErrors: Record<string, string> = {};
  for (const i of items) {
    const c = suggestErrorCategory(i);
    if (c) suggestedErrors[i.questionId] = c;
  }
  return {
    correct,
    total,
    answered,
    scorePct: total ? (correct / total) * 100 : 0,
    byTopic,
    byDifficulty: group("difficulty").map(([difficulty, g]) => ({ difficulty, ...g })),
    bySection: group("section").map(([section, g]) => ({ section, ...g })),
    time: {
      totalSeconds,
      avgSecondsPerQuestion: total ? totalSeconds / total : 0,
      targetSecondsPerQuestion: total ? targetSeconds / total : 0,
      slowQuestions: items.filter((i) => i.timeSpentSeconds > 1.5 * i.estimatedSeconds).length,
      rushedQuestions: items.filter((i) => !i.isCorrect && i.answered && i.timeSpentSeconds < 0.3 * i.estimatedSeconds).length,
    },
    confidence: {
      confidentWrong: items.filter((i) => !i.isCorrect && i.confidence === 3).length,
      guessedRight: items.filter((i) => i.isCorrect && i.confidence === 1).length,
    },
    suggestedErrors,
  };
}

export const ERROR_CATEGORIES: Record<string, string> = {
  conceptual: "Concept not understood",
  calculation: "Calculation error",
  misread: "Misread the question",
  careless: "Careless / rushed",
  time_pressure: "Ran short of time",
  not_attempted: "Not attempted",
};
