"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { createCard } from "@/server/learning/flashcards";
import { GLOSSARY } from "@/content/glossary";

/** Adds a glossary term to the learner's own flashcards (once). */
export async function addGlossaryCardAction(term: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const entry = GLOSSARY.find((t) => t.term === term);
  if (!entry) return { ok: false, message: "Unknown term." };
  const front = `${entry.term}?`;
  const exists = await prisma.flashcard.findFirst({ where: { ownerId: user.id, front } });
  if (exists) return { ok: true, message: "Already in your flashcards." };
  await createCard(user.id, { front, back: entry.formula ? `${entry.definition}\n\n${entry.formula}` : entry.definition });
  revalidatePath("/flashcards");
  return { ok: true, message: "Added to your flashcards — it's due for review now." };
}
