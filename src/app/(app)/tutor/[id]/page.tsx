import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { TutorChat } from "@/components/tutor-chat";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { providerStatus } from "@/server/ai/provider";
import { deleteTutorSessionAction } from "@/app/actions/tutor";

export const metadata = { title: "Tutor conversation" };

const LABEL = { TEACH: "Teach Me", TEST_THINKING: "Test My Thinking", FIND_MISTAKE: "Find My Mistake" } as const;
const PLACEHOLDER = {
  TEACH: "e.g. Explain modified duration with an example",
  TEST_THINKING: "e.g. Help me work out how to value a bond paying semi-annual coupons",
  FIND_MISTAKE: "Paste your working, e.g. 'PV = 1000 / 1.06 × 5 = …'",
} as const;

export default async function TutorSessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { lesson } = await searchParams;
  const session = await prisma.tutorSession.findFirst({ where: { id, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" } }, topic: true } });
  if (!session) notFound();
  const status = providerStatus();
  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-2 text-xs text-slate-500"><Link href="/tutor" className="underline">AI Tutor</Link></nav>
      <PageHeader
        title={session.title}
        description={<span className="flex flex-wrap gap-2"><Badge tone="gold">{LABEL[session.mode]}</Badge>{session.topic && <Badge>{session.topic.name}</Badge>}<Badge tone={status.generative ? "green" : "amber"}>{status.generative ? status.name : "offline mode"}</Badge></span>}
        actions={<form action={deleteTutorSessionAction.bind(null, session.id)}><SubmitButton variant="ghost" size="sm">Delete conversation</SubmitButton></form>}
      />
      <TutorChat
        sessionId={session.id}
        lessonId={lesson ?? null}
        placeholder={PLACEHOLDER[session.mode]}
        initial={session.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, citations: m.citations as { ref: string; title: string; href: string }[] | null, provider: m.provider }))}
      />
      <p className="mt-4 text-xs text-slate-500">The tutor gives educational explanations, not official curriculum statements. Verify exam rules on the awarding body&apos;s website.</p>
    </div>
  );
}
