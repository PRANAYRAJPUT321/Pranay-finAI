/**
 * Build entry point used by Vercel (`npm run vercel-build`).
 * When a database is configured it applies pending migrations (non-destructive)
 * and runs the idempotent seed, then builds Next.js. Without a database it
 * still builds, so the site can show a clear "setup required" message.
 */
import { execSync } from "node:child_process";

const run = (cmd, env = process.env) => execSync(cmd, { stdio: "inherit", env });

// Prefer a direct (non-pooled) connection for migrations when the provider offers one.
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

run("npx prisma generate");
if (migrationUrl) {
  run("npx prisma migrate deploy", { ...process.env, DATABASE_URL: migrationUrl });
  run("npx tsx prisma/seed.ts", { ...process.env, DATABASE_URL: migrationUrl });
} else {
  console.warn("\n[vercel-build] DATABASE_URL is not set: skipping migrations and seed. The site will show a setup notice until a database is connected.\n");
}
run("npx next build");
