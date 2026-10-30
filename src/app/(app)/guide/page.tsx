import { ExamGuide } from "@/components/exam-guide";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/current";
import { getExamGuide } from "@/server/catalog/guide";
import { getPrimaryEnrollment } from "@/server/learning/enrollment";

export const metadata = { title: "Exam Guide" };

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const user = await requireUser();
  const [{ program }, programs, enrollment] = await Promise.all([searchParams, getExamGuide(), getPrimaryEnrollment(user.id)]);
  const selected = program === "all" ? undefined : (program ?? enrollment?.program.slug);
  return (
    <>
      <PageHeader
        eyebrow="Overview / Exam guide"
        title="Dates, Fees & Difficulty"
        description="Upcoming windows with countdowns, registration deadlines, fees, published pass rates, difficulty and official links. Reminders for your exam date and registration deadlines arrive in Notifications."
        actions={<a href="/api/calendar" download className="pill-outline">Add my dates to calendar</a>}
      />
      <ExamGuide programs={programs} selected={selected} basePath="/guide?program=all" />
    </>
  );
}
