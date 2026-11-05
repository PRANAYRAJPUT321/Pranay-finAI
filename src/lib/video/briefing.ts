/**
 * Builds the dashboard's personalised daily briefing film from the learner's
 * own data. Pure and deterministic (unit tested). Lines are original
 * PD FinPrep writing; learning tips are well-established study techniques.
 * Nothing here promises a pass.
 */
import { speakable } from "./script";

export interface BriefingInput {
  firstName: string;
  examLabel: string;
  daysLeft: number | null;
  streak: number;
  weekMinutes: number;
  weeklyTargetMinutes: number;
  accuracy: number | null; // 0..1
  coverage: number; // 0..1
  weakestTopic: string | null;
  todayTasks: { title: string; minutes: number }[];
  cardsDue: number;
  dailyAnswered: boolean;
  hour: number; // learner's local hour 0..23
  dayIndex: number; // e.g. days since epoch, to rotate lines
}

export type BriefingKind = "greeting" | "countdown" | "momentum" | "mission" | "mindset" | "launch";

export interface BriefingScene {
  kind: BriefingKind;
  eyebrow: string;
  title: string;
  big?: string;
  lines: string[];
  stats?: { label: string; value: number; display: string }[];
  narration: string[];
  seconds: number;
  /** Natural-voice clip URL for each narration sentence (added on the server when available). */
  audio?: (string | null)[];
}

const MINDSET = [
  { title: "Test yourself, don't reread", line: "Retrieval practice — answering questions from memory — builds stronger memories than rereading notes. Every question you attempt today is doing real work." },
  { title: "Space it out", line: "Short reviews spread over days beat one long cram. That is exactly why your flashcards come back on a schedule." },
  { title: "Mix your topics", line: "Interleaving different topics feels harder, but it trains you to choose the right method — which is what the exam actually asks." },
  { title: "Mistakes are data", line: "A wrong answer today is a lesson the exam will never get to teach you. Read the explanation, then try a similar question." },
  { title: "Protect your sleep", line: "Memory consolidates while you sleep. A rested hour of study is worth more than a tired three." },
  { title: "Start small, start now", line: "Motivation often follows action. Twenty-five focused minutes is enough to get the flywheel turning." },
  { title: "Explain it simply", line: "If you can explain a concept in plain words, you understand it. If you cannot, that is your next lesson." },
];

const OPENERS = [
  "Every expert in this field once sat exactly where you are.",
  "Consistency beats intensity. Show up again today.",
  "Small, deliberate steps compound — just like interest.",
  "You are building a skill, not just preparing for a test.",
];

const WORDS_PER_SECOND = 2.4;

function seconds(narration: string[], extra = 1.5) {
  const words = narration.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.round(words / WORDS_PER_SECOND + extra));
}

function scene(s: Omit<BriefingScene, "seconds" | "narration"> & { narration: string[] }): BriefingScene {
  const narration = s.narration.map(speakable);
  return { ...s, narration, seconds: seconds(narration) };
}

export function greetingFor(hour: number) {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function buildBriefing(d: BriefingInput): BriefingScene[] {
  const scenes: BriefingScene[] = [];
  const opener = OPENERS[d.dayIndex % OPENERS.length];
  scenes.push(
    scene({
      kind: "greeting",
      eyebrow: `Your daily briefing · ${d.examLabel}`,
      title: `${greetingFor(d.hour)}, ${d.firstName}.`,
      lines: [opener],
      narration: [`${greetingFor(d.hour)}, ${d.firstName}.`, opener],
    }),
  );

  if (d.daysLeft !== null && d.daysLeft >= 0) {
    const weeks = Math.floor(d.daysLeft / 7);
    const line =
      d.daysLeft === 0
        ? "It is exam day. Trust the work you have done."
        : d.daysLeft <= 14
          ? "The final stretch. Revision and timed mocks matter most now."
          : `That is about ${weeks} week${weeks === 1 ? "" : "s"} — plenty of chances to improve one percent at a time.`;
    scenes.push(
      scene({
        kind: "countdown",
        eyebrow: "Countdown",
        title: d.daysLeft === 0 ? "Exam day" : "days to your exam",
        big: String(d.daysLeft),
        lines: [line],
        narration: [d.daysLeft === 0 ? "Today is exam day." : `You have ${d.daysLeft} days until your ${d.examLabel} exam.`, line],
      }),
    );
  } else {
    scenes.push(
      scene({
        kind: "countdown",
        eyebrow: "Countdown",
        title: "Set your exam date",
        big: "?",
        lines: ["A date turns a wish into a plan. Add yours in My Exams to unlock a full countdown."],
        narration: ["You have not set an exam date yet.", "A date turns a wish into a plan. Add yours in My Exams."],
      }),
    );
  }

  const weekPct = d.weeklyTargetMinutes > 0 ? Math.min(1, d.weekMinutes / d.weeklyTargetMinutes) : 0;
  const momentumLine =
    d.streak >= 7
      ? `A ${d.streak}-day streak. That kind of consistency is rare — keep it alive.`
      : d.streak > 0
        ? `${d.streak} day${d.streak === 1 ? "" : "s"} in a row. Today makes it ${d.streak + 1}.`
        : "Today is a perfect day to start a streak.";
  scenes.push(
    scene({
      kind: "momentum",
      eyebrow: "Your momentum",
      title: "Where you stand",
      lines: [momentumLine],
      stats: [
        { label: "Syllabus covered", value: d.coverage, display: `${Math.round(d.coverage * 100)}%` },
        { label: "Practice accuracy", value: d.accuracy ?? 0, display: d.accuracy === null ? "—" : `${Math.round(d.accuracy * 100)}%` },
        { label: "Weekly target", value: weekPct, display: `${Math.round(weekPct * 100)}%` },
      ],
      narration: [
        momentumLine,
        `You have covered ${Math.round(d.coverage * 100)} percent of the syllabus${d.accuracy === null ? "." : `, with ${Math.round(d.accuracy * 100)} percent accuracy in practice.`}`,
      ],
    }),
  );

  const mission: string[] = [];
  for (const t of d.todayTasks.slice(0, 3)) mission.push(`${t.title} · ${t.minutes} min`);
  if (!d.dailyAnswered) mission.push("Answer today's daily challenge");
  if (d.cardsDue > 0) mission.push(`Review ${d.cardsDue} due flashcard${d.cardsDue === 1 ? "" : "s"}`);
  if (d.weakestTopic) mission.push(`Strengthen your weakest topic: ${d.weakestTopic}`);
  if (mission.length === 0) mission.push("Take a short timed quiz to keep your edge");
  scenes.push(
    scene({
      kind: "mission",
      eyebrow: "Today's mission",
      title: "Three moves for today",
      lines: mission.slice(0, 4),
      narration: ["Here is your mission for today.", ...mission.slice(0, 3).map((m) => `${m.replace(/ · (\d+) min$/, ", about $1 minutes")}.`)],
    }),
  );

  const tip = MINDSET[d.dayIndex % MINDSET.length];
  scenes.push(scene({ kind: "mindset", eyebrow: "Learning science", title: tip.title, lines: [tip.line], narration: [`${tip.title}.`, tip.line] }));

  scenes.push(
    scene({
      kind: "launch",
      eyebrow: "Let's go",
      title: "Your future self is watching.",
      lines: ["Press start on your first task. You have got this."],
      narration: ["Your future self is watching.", "Press start on your first task."],
    }),
  );
  return scenes;
}

export const briefingSeconds = (s: BriefingScene[]) => s.reduce((a, x) => a + x.seconds, 0);
