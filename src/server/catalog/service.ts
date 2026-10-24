import { prisma } from "@/server/db";
import { parseStructure } from "./structure";

export function weightMid(t: { weightMin: number | null; weightMax: number | null }): number {
  if (t.weightMin === null && t.weightMax === null) return 0;
  return ((t.weightMin ?? t.weightMax ?? 0) + (t.weightMax ?? t.weightMin ?? 0)) / 2;
}

export function weightLabel(t: { weightMin: number | null; weightMax: number | null }): string {
  if (t.weightMin === null && t.weightMax === null) return "Not published";
  if (t.weightMin === t.weightMax || t.weightMax === null) return `${t.weightMin}%`;
  return `${t.weightMin}–${t.weightMax}%`;
}

export async function listPrograms() {
  return prisma.examProgram.findMany({
    where: { isActive: true },
    orderBy: [{ family: "asc" }, { name: "asc" }],
    include: {
      levels: {
        orderBy: { order: "asc" },
        include: {
          syllabi: {
            where: { status: "CURRENT" },
            select: { id: true, versionLabel: true, verificationStatus: true, verifiedAt: true, _count: { select: { questions: { where: { status: "PUBLISHED" } } } } },
          },
        },
      },
    },
  });
}

export async function getProgramBySlug(slug: string) {
  return prisma.examProgram.findUnique({
    where: { slug },
    include: {
      levels: {
        orderBy: { order: "asc" },
        include: {
          syllabi: {
            orderBy: { createdAt: "desc" },
            include: {
              windows: { orderBy: { startDate: "asc" } },
              topics: { where: { parentId: null }, orderBy: { order: "asc" }, include: { children: { orderBy: { order: "asc" } } } },
              _count: { select: { questions: { where: { status: "PUBLISHED" } } } },
            },
          },
        },
      },
      pastPapers: { orderBy: [{ year: "desc" }, { title: "asc" }], include: { level: true } },
    },
  });
}

/** Top-level, weighted topics of a syllabus with prerequisites and subtopics. */
export async function getRootTopics(syllabusVersionId: string) {
  return prisma.topic.findMany({
    where: { syllabusVersionId, parentId: null },
    orderBy: { order: "asc" },
    include: {
      prerequisites: { select: { prerequisiteId: true } },
      dependents: { select: { topicId: true } },
      children: { orderBy: { order: "asc" }, include: { lessons: { where: { status: "PUBLISHED" }, select: { id: true, slug: true, title: true, estimatedMinutes: true } } } },
      lessons: { where: { status: "PUBLISHED" }, select: { id: true, slug: true, title: true, estimatedMinutes: true } },
    },
  });
}

export async function getSyllabus(syllabusVersionId: string) {
  const s = await prisma.syllabusVersion.findUniqueOrThrow({
    where: { id: syllabusVersionId },
    include: { level: { include: { program: true } } },
  });
  return { ...s, parsedStructure: parseStructure(s.structure) };
}
