import "server-only";
import { prisma } from "@/server/db";
import { parseExamInfo, type ExamInfo } from "./exam-info";

export type GuideLevel = { id: string; code: string; name: string; info: ExamInfo | null };
export type GuideProgram = { id: string; slug: string; name: string; shortName: string; awardingBody: string; family: string; country: string; officialUrl: string | null; levels: GuideLevel[] };

/** Every active program with its levels' researched exam facts. */
export async function getExamGuide(): Promise<GuideProgram[]> {
  const programs = await prisma.examProgram.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true, slug: true, name: true, shortName: true, awardingBody: true, family: true, country: true, officialUrl: true,
      levels: { orderBy: { order: "asc" }, select: { id: true, code: true, name: true, info: true } },
    },
  });
  return programs.map((p) => ({ ...p, levels: p.levels.map((l) => ({ ...l, info: parseExamInfo(l.info) })) }));
}

export async function getGuideLevel(levelId: string) {
  const level = await prisma.examLevel.findUnique({
    where: { id: levelId },
    select: { id: true, code: true, name: true, info: true, program: { select: { name: true, shortName: true, awardingBody: true, slug: true } } },
  });
  return level ? { ...level, info: parseExamInfo(level.info) } : null;
}
