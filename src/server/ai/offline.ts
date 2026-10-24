/**
 * Offline tutor: no generative model. Assembles a grounded answer directly from
 * PD FinPrep content, clearly labelled, so the tutor degrades gracefully when no
 * AI provider is configured or the provider fails.
 */
import type { AIProvider, ProviderReply, TutorPrompt } from "./types";

export class OfflineProvider implements AIProvider {
  readonly name = "offline";
  readonly generative = false;
  constructor(private reason = "No AI provider is configured") {}

  async respond(prompt: TutorPrompt): Promise<ProviderReply> {
    const g = prompt.grounding;
    const header = `${this.reason}, so this reply is assembled directly from PD FinPrep course material — it is not a generated, personalised answer.`;
    if (g.length === 0) {
      return {
        text: `${header}\n\nI couldn't find course material matching your question. Try naming the concept or formula (for example "modified duration" or "put-call parity"), or open the relevant lesson and use “Ask the tutor” from there.`,
        toolCalls: [],
      };
    }
    const lines: string[] = [header, ""];
    const main = g[0];
    if (prompt.mode === "TEACH") {
      lines.push(`**${main.citation.title}** [${main.citation.ref}]`, main.excerpt);
      if (main.example) lines.push("", `**Worked example — ${main.example.title}:** ${main.example.problem}`, ...main.example.steps.map((s, i) => `${i + 1}. ${s}`), `Answer: ${main.example.answer}`);
      if (main.summary?.length) lines.push("", "**Key takeaways:**", ...main.summary.map((s) => `- ${s}`));
    } else if (prompt.mode === "TEST_THINKING") {
      lines.push(`Let's reason it through using **${main.citation.title}** [${main.citation.ref}]. Try answering these before checking the lesson:`);
      const qs = [
        ...(main.objectives ?? []).slice(0, 2).map((o) => `Can you ${o.charAt(0).toLowerCase()}${o.slice(1).replace(/\.$/, "")}?`),
        ...(main.misconceptions ?? []).slice(0, 2).map((m) => `True or false — and why: “${m.myth}”`),
      ];
      lines.push(...(qs.length ? qs : ["Which formula applies here, and what does each variable represent?", "What assumptions does that formula make?"]).map((q, i) => `${i + 1}. ${q}`));
      if (main.example) lines.push("", `Hint: compare your approach with the setup of “${main.example.problem}” before computing anything.`);
    } else {
      lines.push(`Check your working against the most common errors for **${main.citation.title}** [${main.citation.ref}]:`);
      const mistakes = [...(main.mistakes ?? []), ...(main.misconceptions ?? []).map((m) => `${m.myth} → ${m.reality}`)];
      lines.push(...(mistakes.length ? mistakes : ["Check that rate and period units match.", "Check the sign convention and whether values are discounted."]).slice(0, 5).map((m) => `- ${m}`));
      if (main.example) lines.push("", `Then re-run the reference example step by step: ${main.example.steps.join(" → ")} (answer: ${main.example.answer}).`);
    }
    if (g.length > 1) lines.push("", "**Related material:**", ...g.slice(1).map((x) => `- ${x.citation.title} [${x.citation.ref}]`));
    return { text: lines.join("\n"), toolCalls: [] };
  }
}
