/**
 * Study-plan generator (pure). Produces a day-by-day schedule from:
 *  - time until the exam and the learner's weekly availability,
 *  - official topic weightings and editorial difficulty,
 *  - diagnostic/practice proficiency,
 *  - prerequisite relationships (topological order),
 *  - reserved time for spaced revision and full-length mocks.
 *
 * Algorithm (documented so learners and reviewers can reason about it):
 *  1. Required hours per topic = recommendedHours x weightShare x difficultyFactor x (1.15 - proficiency).
 *  2. The final ~20% of study days (min 3, max 21) are reserved for cumulative
 *     revision and mocks; mocks are scheduled at the start of that window and
 *     spaced every few days.
 *  3. Topics are ordered by prerequisites, then by priority (weight x weakness).
 *  4. Each topic gets a LEARN block followed by PRACTICE, spread over study days
 *     at the daily capacity; REVISION tasks are placed at +1, +7 and +21 days
 *     after a topic is first learned (if before the exam).
 *  5. If required hours exceed available hours, every topic is scaled down
 *     proportionally and a workload warning is returned.
 */

export interface PlanTopic {
  id: string;
  code: string;
  name: string;
  weight: number; // percent midpoint (0 if not published)
  difficulty: number; // 1..3
  prerequisiteIds: string[];
  proficiency: number | null; // 0..1, null when unknown
  hasLesson: boolean;
}

export interface PlanInput {
  topics: PlanTopic[];
  startDate: Date; // first study day (local date, time ignored)
  examDate: Date;
  hoursPerDay: number;
  studyDaysPerWeek: number; // 1..7
  recommendedHours: number; // indicative total for the syllabus
  mockCount?: number;
  mockMinutes?: number;
}

export interface PlannedTask {
  date: string; // YYYY-MM-DD
  order: number;
  kind: "LEARN" | "PRACTICE" | "REVISION" | "MOCK" | "REVIEW_MOCK";
  topicId: string | null;
  title: string;
  objective: string;
  activity: string;
  estimatedMinutes: number;
  practiceTarget: number;
  revisionDate: string | null;
}

export interface PlanWarning {
  code: "OVERLOADED" | "TOO_SHORT" | "NO_DATE" | "PAST_DATE";
  message: string;
}

export interface PlanResult {
  tasks: PlannedTask[];
  warnings: PlanWarning[];
  summary: {
    studyDays: number;
    availableHours: number;
    requiredHours: number;
    coverageRatio: number; // available / required (capped display in UI)
    revisionDays: number;
    mocks: number;
  };
}

const MINUTES_PER_QUESTION = 2.5;
const DIFFICULTY_FACTOR: Record<number, number> = { 1: 0.85, 2: 1, 3: 1.2 };

export function toDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/**
 * Study days between start (inclusive) and the day before the exam. With fewer
 * than 7 study days per week, rest days fall at the end of each week (e.g. 5 =>
 * Mon-Fri relative to the start weekday pattern used by most learners).
 */
export function studyDays(start: Date, exam: Date, perWeek: number): Date[] {
  const days: Date[] = [];
  const days7 = Math.min(7, Math.max(1, Math.round(perWeek)));
  // Pick rest days by ISO weekday: Sunday rests first, then Saturday, Wednesday, ...
  const restOrder = [0, 6, 3, 5, 2, 4, 1];
  const rest = new Set(restOrder.slice(0, 7 - days7));
  for (let d = utcDay(start); d < utcDay(exam); d = addDays(d, 1)) {
    if (!rest.has(d.getUTCDay())) days.push(d);
  }
  return days;
}

/** Kahn's algorithm with a priority tie-breaker; cycles are broken by priority. */
export function orderTopics(topics: PlanTopic[]): PlanTopic[] {
  const priority = (t: PlanTopic) => (t.weight || 5) * (1.15 - (t.proficiency ?? 0.4));
  const ids = new Set(topics.map((t) => t.id));
  const indegree = new Map(topics.map((t) => [t.id, t.prerequisiteIds.filter((p) => ids.has(p)).length]));
  const result: PlanTopic[] = [];
  const remaining = new Map(topics.map((t) => [t.id, t]));
  while (remaining.size > 0) {
    let ready = [...remaining.values()].filter((t) => (indegree.get(t.id) ?? 0) === 0);
    if (ready.length === 0) ready = [...remaining.values()]; // cycle: fall back to priority
    ready.sort((a, b) => priority(b) - priority(a) || a.code.localeCompare(b.code));
    const next = ready[0];
    result.push(next);
    remaining.delete(next.id);
    for (const t of remaining.values()) {
      if (t.prerequisiteIds.includes(next.id)) indegree.set(t.id, Math.max(0, (indegree.get(t.id) ?? 0) - 1));
    }
  }
  return result;
}

export function requiredHours(topics: PlanTopic[], recommendedHours: number): Map<string, number> {
  const totalWeight = topics.reduce((a, t) => a + (t.weight || 0), 0);
  const result = new Map<string, number>();
  for (const t of topics) {
    const share = totalWeight > 0 ? (t.weight || 0) / totalWeight : 1 / topics.length;
    const prof = t.proficiency ?? 0.3;
    const hours = recommendedHours * share * (DIFFICULTY_FACTOR[t.difficulty] ?? 1) * Math.max(0.25, 1.15 - prof);
    result.set(t.id, Math.max(1, hours));
  }
  return result;
}

export function generatePlan(input: PlanInput): PlanResult {
  const warnings: PlanWarning[] = [];
  const start = utcDay(input.startDate);
  const exam = utcDay(input.examDate);
  if (exam <= start) {
    return {
      tasks: [],
      warnings: [{ code: "PAST_DATE", message: "The exam date must be after today to build a plan." }],
      summary: { studyDays: 0, availableHours: 0, requiredHours: 0, coverageRatio: 0, revisionDays: 0, mocks: 0 },
    };
  }
  const days = studyDays(start, exam, input.studyDaysPerWeek);
  const dailyMinutes = Math.round(Math.max(0.25, input.hoursPerDay) * 60);
  if (days.length < 7) {
    warnings.push({ code: "TOO_SHORT", message: `Only ${days.length} study day${days.length === 1 ? "" : "s"} remain. The plan focuses on the highest-weight weaknesses and a final review; full syllabus coverage is not realistic.` });
  }

  const revisionDays = days.length < 7 ? Math.min(1, days.length) : Math.min(21, Math.max(3, Math.round(days.length * 0.2)));
  const learningDays = days.slice(0, days.length - revisionDays);
  const finalDays = days.slice(days.length - revisionDays);

  const ordered = orderTopics(input.topics);
  const req = requiredHours(input.topics, input.recommendedHours);
  const totalRequired = [...req.values()].reduce((a, h) => a + h, 0);
  const availableLearningHours = (learningDays.length * dailyMinutes) / 60;
  const availableHours = (days.length * dailyMinutes) / 60;
  const scale = availableLearningHours >= totalRequired ? 1 : availableLearningHours / Math.max(1, totalRequired);
  if (scale < 0.85) {
    warnings.push({
      code: "OVERLOADED",
      message: `About ${Math.round(totalRequired)} hours of topic study is estimated, but only ${Math.round(availableLearningHours)} hours are available before the revision period. Consider adding study time, moving the exam date, or accepting reduced depth on lower-weight topics (scaled to ${Math.round(scale * 100)}%).`,
    });
  }

  // Day buckets with remaining capacity.
  const capacity = new Map<string, number>(days.map((d) => [toDateKey(d), dailyMinutes]));
  const tasks: PlannedTask[] = [];
  const orderOn = new Map<string, number>();
  const push = (t: Omit<PlannedTask, "order">) => {
    const order = (orderOn.get(t.date) ?? 0) + 1;
    orderOn.set(t.date, order);
    tasks.push({ ...t, order });
    capacity.set(t.date, (capacity.get(t.date) ?? 0) - t.estimatedMinutes);
  };

  // Sequentially fill learning days.
  let dayIdx = 0;
  const firstLearned = new Map<string, Date>();
  const take = (minutesWanted: number): { date: Date; minutes: number } | null => {
    while (dayIdx < learningDays.length) {
      const key = toDateKey(learningDays[dayIdx]);
      const left = capacity.get(key) ?? 0;
      if (left >= Math.min(20, minutesWanted)) return { date: learningDays[dayIdx], minutes: Math.min(left, minutesWanted) };
      dayIdx += 1;
    }
    return null;
  };

  for (const topic of ordered) {
    let minutes = Math.round((req.get(topic.id) ?? 1) * scale * 60);
    const learnShare = topic.proficiency !== null && topic.proficiency >= 0.75 ? 0.3 : 0.55;
    let learnMinutes = Math.round(minutes * learnShare);
    let part = 1;
    while (minutes > 0) {
      const slot = take(Math.min(minutes, 90));
      if (!slot) break;
      const isLearn = learnMinutes > 0 && topic.hasLesson;
      const chunk = Math.max(15, Math.min(slot.minutes, minutes));
      const key = toDateKey(slot.date);
      if (!firstLearned.has(topic.id)) firstLearned.set(topic.id, slot.date);
      if (isLearn) {
        push({
          date: key,
          kind: "LEARN",
          topicId: topic.id,
          title: `Learn: ${topic.name}${part > 1 ? ` (part ${part})` : ""}`,
          objective: `Understand the core concepts and learning outcomes of ${topic.name}.`,
          activity: "Read the lesson, work through the examples, and complete the knowledge check.",
          estimatedMinutes: chunk,
          practiceTarget: 0,
          revisionDate: null,
        });
        learnMinutes -= chunk;
      } else {
        const questions = Math.max(5, Math.round(chunk / MINUTES_PER_QUESTION));
        push({
          date: key,
          kind: "PRACTICE",
          topicId: topic.id,
          title: `Practice: ${topic.name}`,
          objective: `Apply ${topic.name} concepts to exam-style questions and review every explanation.`,
          activity: `Topic quiz of ${questions} questions, then review mistakes.`,
          estimatedMinutes: chunk,
          practiceTarget: questions,
          revisionDate: null,
        });
      }
      minutes -= chunk;
      part += 1;
    }
  }

  // Spaced revision: +1, +7, +21 days after first study, if it fits before the exam.
  for (const topic of ordered) {
    const first = firstLearned.get(topic.id);
    if (!first) continue;
    for (const offset of [1, 7, 21]) {
      const target = addDays(first, offset);
      // The final window has its own cumulative revision, so spaced reviews stay in learning days.
      const day = learningDays.find((d) => d >= target && (capacity.get(toDateKey(d)) ?? 0) >= 15);
      if (!day) continue;
      const key = toDateKey(day);
      push({
        date: key,
        kind: "REVISION",
        topicId: topic.id,
        title: `Revise: ${topic.name}`,
        objective: `Retrieve key ideas and formulas of ${topic.name} from memory (spaced review, day +${offset}).`,
        activity: "Due flashcards and a short mixed set of previously missed questions.",
        estimatedMinutes: 15,
        practiceTarget: 5,
        revisionDate: key,
      });
    }
    // Back-fill the revision date on the first learning task for display.
    const firstTask = tasks.find((t) => t.topicId === topic.id && t.kind === "LEARN");
    if (firstTask) firstTask.revisionDate = toDateKey(addDays(first, 1));
  }

  // Final period: mocks + targeted cumulative revision.
  const mockMinutes = input.mockMinutes ?? 180;
  const mockCount = Math.min(input.mockCount ?? (finalDays.length >= 10 ? 3 : finalDays.length >= 4 ? 2 : finalDays.length >= 1 ? 1 : 0), Math.ceil(finalDays.length / 2));
  const mockDayIdx = new Set<number>();
  if (mockCount > 0) {
    const gap = Math.max(2, Math.floor(finalDays.length / mockCount));
    for (let i = 0; i < mockCount; i++) mockDayIdx.add(Math.min(finalDays.length - 1, i * gap));
  }
  const byWeakness = [...ordered].sort((a, b) => (a.proficiency ?? 0.4) - (b.proficiency ?? 0.4) || b.weight - a.weight);
  let revCursor = 0;
  finalDays.forEach((d, i) => {
    const key = toDateKey(d);
    if (mockDayIdx.has(i)) {
      push({
        date: key,
        kind: "MOCK",
        topicId: null,
        title: "Full-length mock exam",
        objective: "Sit a timed, exam-format practice simulation under realistic conditions.",
        activity: "Take the mock in one sitting; do not pause or look up answers.",
        estimatedMinutes: Math.min(mockMinutes, Math.max(dailyMinutes, mockMinutes)),
        practiceTarget: 0,
        revisionDate: null,
      });
      return;
    }
    if (i > 0 && mockDayIdx.has(i - 1)) {
      push({
        date: key,
        kind: "REVIEW_MOCK",
        topicId: null,
        title: "Review mock results",
        objective: "Analyse every error by topic and error type; schedule fixes.",
        activity: "Review the results report, then redo incorrect questions.",
        estimatedMinutes: Math.min(90, dailyMinutes),
        practiceTarget: 0,
        revisionDate: null,
      });
    }
    while ((capacity.get(key) ?? 0) >= 20 && byWeakness.length > 0) {
      const topic = byWeakness[revCursor % byWeakness.length];
      revCursor += 1;
      const mins = Math.min(45, capacity.get(key) ?? 0);
      push({
        date: key,
        kind: "REVISION",
        topicId: topic.id,
        title: `Cumulative revision: ${topic.name}`,
        objective: `Consolidate ${topic.name} with mixed, timed questions.`,
        activity: `Timed mixed set (${Math.round(mins / MINUTES_PER_QUESTION)} questions) and formula recall.`,
        estimatedMinutes: mins,
        practiceTarget: Math.round(mins / MINUTES_PER_QUESTION),
        revisionDate: key,
      });
    }
  });

  tasks.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  return {
    tasks,
    warnings,
    summary: {
      studyDays: days.length,
      availableHours: Math.round(availableHours),
      requiredHours: Math.round(totalRequired),
      coverageRatio: totalRequired > 0 ? availableLearningHours / totalRequired : 1,
      revisionDays,
      mocks: mockCount,
    },
  };
}

/**
 * Recover from missed sessions without restarting: pending tasks dated before
 * `today` are moved onto upcoming study days with spare capacity (or appended
 * to the least-loaded upcoming days). Completed tasks are untouched.
 */
export interface ExistingTask {
  id: string;
  date: string;
  estimatedMinutes: number;
  status: "PENDING" | "DONE" | "SKIPPED";
  kind: PlannedTask["kind"];
}

export function rebalance(
  tasks: ExistingTask[],
  today: Date,
  examDate: Date,
  hoursPerDay: number,
  studyDaysPerWeek: number,
): { id: string; newDate: string }[] {
  const todayKey = toDateKey(utcDay(today));
  const overdue = tasks.filter((t) => t.status === "PENDING" && t.date < todayKey && t.kind !== "MOCK");
  if (overdue.length === 0) return [];
  const upcoming = studyDays(today, examDate, studyDaysPerWeek).map(toDateKey);
  if (upcoming.length === 0) return [];
  const daily = Math.round(hoursPerDay * 60);
  const load = new Map<string, number>(upcoming.map((d) => [d, 0]));
  for (const t of tasks) if (t.status === "PENDING" && load.has(t.date)) load.set(t.date, (load.get(t.date) ?? 0) + t.estimatedMinutes);
  const moves: { id: string; newDate: string }[] = [];
  for (const t of overdue.sort((a, b) => a.date.localeCompare(b.date))) {
    let target = upcoming.find((d) => (load.get(d) ?? 0) + t.estimatedMinutes <= daily);
    if (!target) target = [...load.entries()].sort((a, b) => a[1] - b[1])[0][0];
    load.set(target, (load.get(target) ?? 0) + t.estimatedMinutes);
    moves.push({ id: t.id, newDate: target });
  }
  return moves;
}
