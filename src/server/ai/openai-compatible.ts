/**
 * Generic OpenAI-compatible chat-completions provider (for non-Anthropic
 * models served behind that API shape). Uses the same calculator tools.
 */
import { executeTool, toolSpecs } from "./tools";
import { ProviderError, type AIProvider, type ProviderReply, type ToolCallRecord, type TutorPrompt } from "./types";

type Msg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  readonly generative = true;

  constructor(private apiKey: string, private baseUrl: string, private model: string) {
    this.name = `openai-compatible:${model}`;
  }

  async respond(prompt: TutorPrompt): Promise<ProviderReply> {
    const messages: Msg[] = [{ role: "system", content: prompt.system }, ...prompt.history.map((h) => ({ role: h.role, content: h.content }) as Msg)];
    const tools = prompt.useCalculators ? toolSpecs.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.schema } })) : undefined;
    const toolCalls: ToolCallRecord[] = [];
    for (let round = 0; round < 6; round++) {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, messages, ...(tools ? { tools } : {}) }),
        signal: AbortSignal.timeout(120_000),
      }).catch((e: Error) => {
        throw new ProviderError(`AI provider unreachable: ${e.message}`, true);
      });
      if (!res.ok) throw new ProviderError(`AI provider error (${res.status})`, res.status >= 500 || res.status === 429);
      const data = (await res.json()) as { choices?: { message: { content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] } }[] };
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new ProviderError("Empty response from AI provider", true);
      if (!msg.tool_calls?.length) return { text: (msg.content ?? "").trim() || "(No answer was produced.)", toolCalls };
      messages.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let input: unknown;
        try {
          input = JSON.parse(call.function.arguments);
        } catch {
          input = null;
        }
        const rec = executeTool(call.function.name, input);
        toolCalls.push(rec);
        messages.push({ role: "tool", tool_call_id: call.id, content: rec.output });
      }
    }
    throw new ProviderError("Too many calculation steps; please simplify the question");
  }
}
