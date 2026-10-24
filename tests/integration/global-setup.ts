import { execSync } from "node:child_process";

/**
 * Prepares the dedicated test database without destroying data: applies any
 * pending migrations and runs the idempotent seed. Tests create uniquely named
 * users, so they do not depend on an empty database.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://finprep:finprep@localhost:5432/finprep_test";
  if (!/test/.test(url)) throw new Error("Refusing to use a database whose URL does not contain 'test'");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
}
