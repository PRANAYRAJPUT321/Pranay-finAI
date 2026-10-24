import type { ExamFamily } from "@prisma/client";
import type { ExamStructure } from "../../src/server/catalog/structure";
import type { LessonContent } from "../../src/server/content/lesson-schema";

export interface OutcomeSeed {
  code: string;
  statement: string;
}

export interface SubtopicSeed {
  code: string;
  name: string;
  outcomes?: OutcomeSeed[];
}

export interface TopicSeed {
  code: string;
  name: string;
  weightMin?: number;
  weightMax?: number;
  difficulty?: number;
  prereqs?: string[];
  description?: string;
  children?: SubtopicSeed[];
}

export interface SyllabusSeed {
  versionLabel: string;
  effectiveFrom?: string;
  sourceUrl?: string;
  recommendedHours: number;
  structure: ExamStructure;
  notes: string;
  topics: TopicSeed[];
}

export interface LevelSeed {
  code: string;
  name: string;
  order: number;
  description?: string;
  syllabus?: SyllabusSeed;
}

export interface ProgramSeed {
  slug: string;
  name: string;
  shortName: string;
  awardingBody: string;
  family: ExamFamily;
  country: string;
  jurisdiction?: string;
  description: string;
  officialUrl: string;
  licensingNote: string;
  levels: LevelSeed[];
}

export interface QuestionSeed {
  key: string;
  topic: string; // root topic code
  lo?: string; // outcome code within a subtopic, "SUBCODE:LOCODE"
  type: "MCQ" | "MULTI_SELECT" | "NUMERIC" | "WRITTEN";
  difficulty: 1 | 2 | 3;
  stem: string;
  options?: [string, boolean, string][]; // text, correct, rationale
  numeric?: { answer: number; tolerance: number; toleranceType?: "absolute" | "relative"; unit?: string; decimals?: number };
  written?: { rubric: { criterion: string; points: number; keywords: string[] }[]; modelAnswer: string };
  explanation: string;
  steps?: string[];
  concept: string;
  mistake?: string;
  seconds?: number;
  calc?: { fn: string; args: Record<string, number | number[]>; scale?: number };
  formula?: string;
  context?: string;
  itemSet?: string;
}

export interface ItemSetSeed {
  key: string;
  topic: string;
  title: string;
  vignette: string;
}

export interface LessonSeed {
  topic: string; // root topic code
  subtopic?: string; // subtopic code
  slug: string;
  title: string;
  minutes: number;
  content: LessonContent;
}

export interface CurriculumSeed {
  programSlug: string;
  levelCode: string;
  questions: QuestionSeed[];
  itemSets?: ItemSetSeed[];
  lessons: LessonSeed[];
  flashcards: { topic: string; kind: "SYSTEM" | "DEFINITION" | "FORMULA"; front: string; back: string }[];
}
