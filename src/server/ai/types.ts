export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  output: string;
  isError: boolean;
}

export interface Citation {
  ref: string; // e.g. "L1", "F2"
  type: "lesson" | "formula" | "outcome" | "question";
  id: string;
  title: string;
  href: string;
}

export interface GroundingItem {
  citation: Citation;
  excerpt: string;
  objectives?: string[];
  misconceptions?: { myth: string; reality: string }[];
  mistakes?: string[];
  example?: { title: string; problem: string; steps: string[]; answer: string };
  summary?: string[];
}

export type TutorModeKey = "TEACH" | "TEST_THINKING" | "FIND_MISTAKE";

export interface TutorPrompt {
  system: string;
  history: ChatTurn[]; // ends with the latest user turn
  useCalculators: boolean;
  mode: TutorModeKey;
  grounding: GroundingItem[];
}

export interface ProviderReply {
  text: string;
  toolCalls: ToolCallRecord[];
  refused?: boolean;
}

/** Provider abstraction: swap models/vendors without touching tutor logic. */
export interface AIProvider {
  readonly name: string;
  readonly generative: boolean;
  respond(prompt: TutorPrompt): Promise<ProviderReply>;
}

export class ProviderError extends Error {
  constructor(message: string, public retryable = false) {
    super(message);
  }
}
