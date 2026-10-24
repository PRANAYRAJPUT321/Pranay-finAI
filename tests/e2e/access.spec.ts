import { expect, test } from "@playwright/test";
import { login, register } from "./helpers";

test("protected pages redirect anonymous visitors to sign in", async ({ page }) => {
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/login\?next=%2Fplan/);
  const res = await page.request.get("/api/attempts/does-not-exist");
  expect(res.status()).toBe(401);
});

test("students cannot open the admin console", async ({ page }) => {
  await register(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard\?denied=1/);
  await expect(page.getByText("You do not have permission")).toBeVisible();
});

test("cross-origin API writes are rejected", async ({ page }) => {
  await register(page);
  const res = await page.request.post("/api/reports", { headers: { Origin: "https://evil.example" }, data: { category: "typo", message: "hello world", questionId: "x" } });
  expect(res.status()).toBe(403);
});

test("an administrator can review content and see the audit log", async ({ page }) => {
  await login(page, process.env.SEED_ADMIN_EMAIL ?? "admin@finprep.local", process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Admin123");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin overview" })).toBeVisible();
  await page.goto("/admin/questions");
  await page.getByRole("link", { name: /closest to/ }).first().click();
  await expect(page.getByText(/Answer key: Answer key matches calculation|Answer key: No calculation to verify/)).toBeVisible();
  await page.goto("/admin/catalog");
  await expect(page.getByRole("heading", { name: "Exams and syllabus versions" })).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
});
