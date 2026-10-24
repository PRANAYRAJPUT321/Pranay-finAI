import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// "server-only" throws outside the Next.js server bundle; tests run server code directly.
const alias = { "server-only": path.resolve(__dirname, "tests/stubs/empty.ts") };
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://finprep:finprep@localhost:5432/finprep_test";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        plugins: [tsconfigPaths()],
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL, TEST_DATABASE_URL, EMAIL_PROVIDER: "console", AI_PROVIDER: "offline" },
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30000,
          hookTimeout: 120000,
        },
      },
    ],
  },
});
