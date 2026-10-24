import "server-only";
import { AnthropicProvider } from "./anthropic";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { OfflineProvider } from "./offline";
import type { AIProvider } from "./types";

/** Picks the configured provider. API keys stay on the server. */
export function getProvider(): AIProvider {
  const choice = (process.env.AI_PROVIDER ?? "").toLowerCase();
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  if ((choice === "anthropic" || (!choice && anthropicKey)) && anthropicKey) {
    return new AnthropicProvider(anthropicKey, process.env.ANTHROPIC_MODEL || "claude-opus-5-5");
  }
  if ((choice === "openai" || (!choice && openaiKey)) && openaiKey) {
    return new OpenAICompatibleProvider(openaiKey, process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", process.env.OPENAI_MODEL || "gpt-4o-mini");
  }
  return new OfflineProvider(choice && choice !== "offline" ? `AI provider "${choice}" is selected but its API key is missing` : "No AI provider is configured");
}

export function providerStatus() {
  const p = getProvider();
  return { name: p.name, generative: p.generative };
}
