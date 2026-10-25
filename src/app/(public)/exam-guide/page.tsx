import { ExamGuide } from "@/components/exam-guide";
import { PageHeader } from "@/components/ui";
import { getExamGuide } from "@/server/catalog/guide";

export const metadata = { title: "Exam dates, fees & difficulty", description: "Upcoming exam windows, registration deadlines, fees, pass rates and difficulty for CFA, FRM, CAIA, CPA, ACCA, CMA, CA India, EA, NISM and CFP." };
export const dynamic = "force-dynamic";

export default async function PublicExamGuidePage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const { program } = await searchParams;
  const programs = await getExamGuide();
  return (
    <>
      <PageHeader eyebrow="Exam guide / Dates · Fees · Difficulty" title="Know Your Exam" description="Every level of every certification we cover: upcoming windows with countdowns, registration deadlines, fees, published pass rates, difficulty and links to the official sites." />
      <ExamGuide programs={programs} selected={program} basePath="/exam-guide" />
    </>
  );
}
