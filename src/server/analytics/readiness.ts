/**
 * Transparent readiness assessment (pure).
 *
 * Produces a descriptive category, never a probability of passing. The bands
 * below are PD FinPrep's internal, unvalidated heuristics. They are not
 * official passing standards, and the UI states this next to the result.
 * An exam-specific benchmark is shown only if the syllabus marks it verified.
 */
import type { Mastery } from "@prisma/client";

export interface ReadinessInput {
  mocks: { scorePct: number; submittedAt: Date; representative: boolean; overtime: boolean }[];
  topics: { topicId: string; name: string; weight: number; estimate: number; mastery: Mastery; attempts: number; covered: boolean }[];
  totalAttempts: number;
  delayedAccuracy: number | null;
  hardAccuracy: number | null;
  avgTimeRatio: number | null;
  remainingStudyHours: number | null;
  daysToExam: number | null;
  verifiedBenchmark: string | null;
}

export type ReadinessCategory = "INSUFFICIENT_EVIDENCE" | "EARLY" | "BUILDING" | "APPROACHING" | "CONSISTENTLY_STRONG";

export interface ReadinessComponent {
  key: string;
  label: string;
  value: string;
  status: "good" | "watch" | "gap" | "unknown";
  detail: string;
}

export interface ReadinessResult {
  category: ReadinessCategory;
  label: string;
  description: string;
  components: ReadinessComponent[];
  strengths: string[];
  criticalGaps: string[];
  reviseTopics: string[];
  recommendedMocks: string;
  finalRevision: string[];
  limitations: string[];
}

export const CATEGORY_LABEL: Record<ReadinessCategory, string> = {
  INSUFFICIENT_EVIDENCE: "Not enough evidence yet",
  EARLY: "Early preparation",
  BUILDING: "Building foundations",
  APPROACHING: "Approaching readiness",
  CONSISTENTLY_STRONG: "Consistently strong in practice",
};

const WEAK: Mastery[] = ["NEEDS_WORK", "DEVELOPING"];

export function assessReadiness(input: ReadinessInput): ReadinessResult {
  const reps = input.mocks.filter((m) => m.representative).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  const recent = reps.slice(0, 3);
  const mockAvg = recent.length ? recent.reduce((a, m) => a + m.scorePct, 0) / recent.length : null;
  const mockMin = recent.length ? Math.min(...recent.map((m) => m.scorePct)) : null;
  const spread = recent.length >= 2 ? Math.max(...recent.map((m) => m.scorePct)) - (mockMin as number) : null;

  const totalWeight = input.topics.reduce((a, t) => a + (t.weight || 1), 0) || 1;
  const weightedEstimate = input.topics.reduce((a, t) => a + (t.weight || 1) * (t.attempts > 0 ? t.estimate : 0), 0) / totalWeight;
  const coverage = input.topics.length ? input.topics.filter((t) => t.covered).length / input.topics.length : 0;
  const highWeightWeak = input.topics.filter((t) => t.weight >= 10 && (t.mastery === "NEEDS_WORK" || t.mastery === "NOT_STARTED"));

  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const components: ReadinessComponent[] = [
    {
      key: "mocks",
      label: "Recent representative mocks",
      value: mockAvg === null ? "None yet" : `${mockAvg.toFixed(0)}% avg of ${recent.length}`,
      status: mockAvg === null ? "unknown" : mockAvg >= 75 ? "good" : mockAvg >= 60 ? "watch" : "gap",
      detail: "Average raw score on your last three full- or half-length mocks.",
    },
    {
      key: "proficiency",
      label: "Weighted topic proficiency",
      value: pct(weightedEstimate),
      status: weightedEstimate >= 0.75 ? "good" : weightedEstimate >= 0.55 ? "watch" : "gap",
      detail: "Heuristic topic estimates weighted by syllabus weighting; unpractised topics count as 0.",
    },
    {
      key: "coverage",
      label: "Syllabus coverage",
      value: pct(coverage),
      status: coverage >= 0.9 ? "good" : coverage >= 0.6 ? "watch" : "gap",
      detail: "Share of topics studied or practised with at least 5 questions. Coverage is not mastery.",
    },
    {
      key: "retention",
      label: "Retention on delayed questions",
      value: pct(input.delayedAccuracy),
      status: input.delayedAccuracy === null ? "unknown" : input.delayedAccuracy >= 0.7 ? "good" : input.delayedAccuracy >= 0.55 ? "watch" : "gap",
      detail: "Accuracy on topics revisited 7+ days after first study.",
    },
    {
      key: "consistency",
      label: "Consistency across mocks",
      value: spread === null ? "—" : `${spread.toFixed(0)} pt spread`,
      status: spread === null ? "unknown" : spread <= 10 ? "good" : spread <= 20 ? "watch" : "gap",
      detail: "Range between your best and worst recent mock scores.",
    },
    {
      key: "time",
      label: "Time management",
      value: input.avgTimeRatio === null ? "—" : `${input.avgTimeRatio.toFixed(2)}x target`,
      status:
        input.avgTimeRatio === null ? "unknown" : input.avgTimeRatio <= 1.05 && !reps.some((m) => m.overtime) ? "good" : input.avgTimeRatio <= 1.3 ? "watch" : "gap",
      detail: "Average time per question relative to its estimated solving time.",
    },
    {
      key: "hard",
      label: "Higher-difficulty questions",
      value: pct(input.hardAccuracy),
      status: input.hardAccuracy === null ? "unknown" : input.hardAccuracy >= 0.65 ? "good" : input.hardAccuracy >= 0.45 ? "watch" : "gap",
      detail: "Accuracy on questions rated hard.",
    },
  ];

  let category: ReadinessCategory;
  if (recent.length === 0 && input.totalAttempts < 40) category = "INSUFFICIENT_EVIDENCE";
  else if (recent.length >= 2 && (mockAvg as number) >= 75 && (mockMin as number) >= 70 && weightedEstimate >= 0.75 && coverage >= 0.9 && highWeightWeak.length === 0)
    category = "CONSISTENTLY_STRONG";
  else if (recent.length >= 1 && (mockAvg as number) >= 65 && coverage >= 0.75 && weightedEstimate >= 0.65) category = "APPROACHING";
  else if (weightedEstimate >= 0.45 || coverage >= 0.5) category = "BUILDING";
  else category = "EARLY";

  const descriptions: Record<ReadinessCategory, string> = {
    INSUFFICIENT_EVIDENCE: "Complete more practice and at least one representative mock before drawing conclusions.",
    EARLY: "Most of the syllabus is still ahead. Focus on structured learning and topic practice.",
    BUILDING: "Foundations are forming. Close high-weight gaps and start timed practice.",
    APPROACHING: "Practice performance is solid in many areas. Use mocks to confirm consistency and fix remaining gaps.",
    CONSISTENTLY_STRONG: "Recent practice evidence is consistently strong. Maintain retention and exam timing.",
  };

  const sortedByStrength = [...input.topics].filter((t) => t.attempts >= 5).sort((a, b) => b.estimate - a.estimate);
  const strengths = sortedByStrength.filter((t) => t.mastery === "PROFICIENT" || t.mastery === "MASTERED").slice(0, 5).map((t) => t.name);
  const criticalGaps = input.topics
    .filter((t) => (t.weight >= 10 && (WEAK.includes(t.mastery) || t.mastery === "NOT_STARTED")) || t.mastery === "NEEDS_WORK")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((t) => t.name);
  const reviseTopics = input.topics
    .filter((t) => WEAK.includes(t.mastery) || t.mastery === "INSUFFICIENT_EVIDENCE")
    .sort((a, b) => a.estimate - b.estimate)
    .slice(0, 6)
    .map((t) => t.name);

  const days = input.daysToExam;
  const recommendedMocks =
    days === null
      ? "Set an exam date to get a mock schedule."
      : days > 60
        ? "Take sectional mocks for completed topics now; plan 3–4 full-length mocks in the final 6 weeks."
        : days > 21
          ? `Plan ${Math.max(2, 3 - recent.length)} more full-length mock${3 - recent.length === 1 ? "" : "s"}, at least a week apart, with a review day after each.`
          : "Take 1–2 more full-length mocks, leaving the last 2–3 days for light review and rest.";

  const finalRevision = [
    ...(criticalGaps.length ? [`Prioritise: ${criticalGaps.slice(0, 3).join(", ")}.`] : []),
    "Daily due flashcards and formula recall.",
    "Redo every question you missed in mocks; record the error type.",
    "Keep timed mixed sets to maintain pace.",
    "Final 1–2 days: light review only, rest, logistics check.",
  ];

  const limitations = [
    "This is a descriptive summary of your practice evidence on PD FinPrep, not a prediction or probability of passing.",
    "Category bands are internal heuristics that have not been validated against real exam outcomes.",
    "PD FinPrep questions and mocks are unofficial; real exam difficulty and scoring may differ.",
    input.verifiedBenchmark
      ? `Verified exam benchmark: ${input.verifiedBenchmark}.`
      : "No verified official passing benchmark is configured for this exam, so none is used.",
  ];
  if (recent.length < 2) limitations.push("Fewer than two representative mocks: consistency cannot be judged yet.");

  return {
    category,
    label: CATEGORY_LABEL[category],
    description: descriptions[category],
    components,
    strengths,
    criticalGaps,
    reviseTopics,
    recommendedMocks,
    finalRevision,
    limitations,
  };
}
