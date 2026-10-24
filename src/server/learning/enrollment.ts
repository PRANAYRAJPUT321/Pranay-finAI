import { z } from "zod";
import { prisma } from "@/server/db";

export const onboardingSchema = z.object({
  levelId: z.string().min(1, "Choose an exam level"),
  targetExamDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date"),
  targetWindowLabel: z.string().max(80).optional().transform((v) => v || null),
  priorKnowledge: z.enum(["none", "some", "strong"]),
  hoursPerDay: z.coerce.number().min(0.25, "At least 15 minutes a day").max(12, "Plan at most 12 hours a day"),
  studyDaysPerWeek: z.coerce.number().int().min(1).max(7),
  preferredFormat: z.enum(["reading", "practice", "mixed", "video"]),
  confidentTopicIds: z.array(z.string()).default([]),
  difficultTopicIds: z.array(z.string()).default([]),
  accessTier: z.enum(["FREE", "PLUS", "PREMIUM"]).default("FREE"),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;

export async function upsertEnrollment(userId: string, raw: OnboardingInput) {
  const input = onboardingSchema.parse(raw);
  const level = await prisma.examLevel.findUniqueOrThrow({
    where: { id: input.levelId },
    include: { syllabi: { where: { status: "CURRENT" }, take: 1 } },
  });
  const syllabus = level.syllabi[0];
  if (!syllabus) throw new Error("This exam level has no current syllabus configured yet");
  if (input.targetExamDate && input.targetExamDate.getTime() < Date.now() - 86_400_000) {
    throw new Error("The exam date is in the past");
  }
  const hasPrimary = await prisma.enrollment.count({ where: { userId, isPrimary: true, status: "active" } });
  const data = {
    programId: level.programId,
    syllabusVersionId: syllabus.id,
    targetExamDate: input.targetExamDate,
    targetWindowLabel: input.targetWindowLabel,
    priorKnowledge: input.priorKnowledge,
    hoursPerDay: input.hoursPerDay,
    studyDaysPerWeek: input.studyDaysPerWeek,
    preferredFormat: input.preferredFormat,
    confidentTopicIds: input.confidentTopicIds,
    difficultTopicIds: input.difficultTopicIds,
    accessTier: input.accessTier,
    status: "active",
  };
  return prisma.enrollment.upsert({
    where: { userId_levelId: { userId, levelId: level.id } },
    create: { userId, levelId: level.id, ...data, isPrimary: hasPrimary === 0, onboardedAt: new Date() },
    update: data,
  });
}

export async function listEnrollments(userId: string) {
  return prisma.enrollment.findMany({
    where: { userId, status: "active" },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { program: true, level: true, syllabus: { select: { id: true, versionLabel: true, verificationStatus: true, verifiedAt: true, recommendedHours: true } } },
  });
}

export async function getPrimaryEnrollment(userId: string) {
  const list = await listEnrollments(userId);
  return list.find((e) => e.isPrimary) ?? list[0] ?? null;
}

export async function getEnrollmentForUser(userId: string, enrollmentId: string) {
  const e = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, userId },
    include: { program: true, level: true, syllabus: true },
  });
  if (!e) throw new Error("Exam plan not found");
  return e;
}

export async function setPrimaryEnrollment(userId: string, enrollmentId: string) {
  await getEnrollmentForUser(userId, enrollmentId);
  await prisma.$transaction([
    prisma.enrollment.updateMany({ where: { userId }, data: { isPrimary: false } }),
    prisma.enrollment.update({ where: { id: enrollmentId }, data: { isPrimary: true } }),
  ]);
}

export async function archiveEnrollment(userId: string, enrollmentId: string) {
  const e = await getEnrollmentForUser(userId, enrollmentId);
  await prisma.enrollment.update({ where: { id: e.id }, data: { status: "archived", isPrimary: false } });
  const next = await prisma.enrollment.findFirst({ where: { userId, status: "active" }, orderBy: { createdAt: "asc" } });
  if (e.isPrimary && next) await prisma.enrollment.update({ where: { id: next.id }, data: { isPrimary: true } });
}
