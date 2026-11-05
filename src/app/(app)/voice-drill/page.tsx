import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { VoiceDrill } from "@/components/voice-drill";
import { requireUser } from "@/server/auth/current";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";
import { rapidFireDeck } from "@/server/engagement/service";

export const metadata = { title: "Voice Drill" };
export const dynamic = "force-dynamic";

export default async function VoiceDrillPage() {
  const user = await requireUser();
  const enrollment = await getPrimaryEnrollment(user.id);
  if (!enrollment) return <EmptyState title="Choose an exam to start a voice drill" action={<LinkButton href="/onboarding">Get started</LinkButton>} />;
  const deck = await rapidFireDeck(enrollment.syllabusVersionId, 12);
  return (
    <>
      <PageHeader eyebrow="Practice / Hands-free" title="Voice Drill" description="Revise with your eyes off the screen. Nova reads short exam-style questions aloud and listens for your answer — perfect for a walk, a commute or a break from the desk." />
      <VoiceDrill deck={deck} />
    </>
  );
}
