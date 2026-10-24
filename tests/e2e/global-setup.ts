import { PrismaClient } from "@prisma/client";

/** Clears rate-limit counters in the dedicated test database so repeated runs can register users. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://finprep:finprep@localhost:5432/finprep_test";
  if (!/test/.test(url)) throw new Error("Refusing to modify a database whose URL does not contain 'test'");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await prisma.rateLimit.deleteMany({});
  await prisma.$disconnect();
}
