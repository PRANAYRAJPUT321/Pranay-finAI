import Anthropic from "@anthropic-ai/sdk";
import { executeTool, toolSpecs } from "./tools";
import { ProviderError, type AIProvider, type ProviderReply, type ToolCallRecord, type TutorPrompt } from "./types";

const MAX_TOOL_ROUNDS = 6;

export class AnthropicProvider implements AIProvider {
  readonly name: string;
  readonly generative = true;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-opus-5-5") {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
    this.model = model;
    this.name = `anthropic:${model}`;
  }

  async respond(prompt: TutorPrompt): Promise<ProviderReply> {
    const tools: Anthropic.Beta.BetaTool[] = prompt.useCalculators
      ? toolSpecs.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema }))
      : [];
    const messages: Anthropic.Beta.BetaMessageParam[] = prompt.history.map((t) => ({ role: t.role, content: t.content }));
    const toolCalls: ToolCallRecord[] = [];
    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const response = await this.client.beta.messages.create({
          model: this.model,
          max_tokens: 16000,
          system: [{ type: "text", text: prompt.system, cache_control: { type: "ephemeral" } }],
          messages,
          ...(tools.length ? { tools } : {}),
          output_config: { effort: "medium" },
          // Route policy declines to a fallback model chosen by the API.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        if (response.stop_reason === "refusal") {
          return { text: "I can't help with that request. Try rephrasing it as a question about your exam syllabus.", toolCalls, refused: true };
        }
        const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        const uses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
        if (response.stop_reason !== "tool_use" || uses.length === 0) {
          if (response.stop_reason === "max_tokens" && !text) throw new ProviderError("The response was cut off", true);
          return { text: text || "(No answer was produced.)", toolCalls };
        }
        messages.push({ role: "assistant", content: response.content });
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = uses.map((u) => {
          const rec = executeTool(u.name, u.input);
          toolCalls.push(rec);
          return { type: "tool_result", tool_use_id: u.id, content: rec.output, is_error: rec.isError };
        });
        messages.push({ role: "user", content: results });
      }
      throw new ProviderError("Too many calculation steps; please simplify the question");
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if (e instanceof Anthropic.RateLimitError) throw new ProviderError("The AI provider is rate limiting requests", true);
      if (e instanceof Anthropic.AuthenticationError) throw new ProviderError("The AI provider credentials are invalid");
      if (e instanceof Anthropic.APIError) throw new ProviderError(`AI provider error (${e.status ?? "network"})`, (e.status ?? 500) >= 500);
      throw new ProviderError((e as Error).message, true);
    }
  }
}
