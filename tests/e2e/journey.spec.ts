import { expect, test } from "@playwright/test";
import { answerAllAndSubmit, login, register } from "./helpers";

test("a student can complete the core preparation journey and resume later", async ({ page }) => {
  // 1. Create an account and sign in.
  const creds = await register(page);

  // 2. Select a certification and level.
  await page.locator("label", { hasText: "Level I" }).filter({ has: page.locator('input[name="levelId"]') }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  const examDate = new Date(Date.now() + 160 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Planned exam date").fill(examDate);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // 3. Complete the diagnostic.
  await page.getByRole("button", { name: "Start diagnostic" }).click();
  await page.waitForURL("**/attempt/**");
  await expect(page.getByText("answers revealed after submission")).toBeVisible();
  await answerAllAndSubmit(page);
  await expect(page.getByRole("heading", { name: "Diagnostic results" })).toBeVisible();
  await expect(page.getByText("Performance by topic")).toBeVisible();

  // 4. Personalised study plan.
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "Study Plan" })).toBeVisible();
  await page.getByRole("link", { name: "Monthly" }).click();
  await expect(page.getByRole("grid", { name: "Monthly plan" })).toBeVisible();

  // 5. Study a lesson and bookmark it.
  await page.goto("/learn");
  await page.getByRole("link", { name: /Time Value of Money/ }).click();
  await expect(page.getByRole("heading", { name: "Time Value of Money" })).toBeVisible();
  await page.getByRole("button", { name: /^Bookmark/ }).click();
  await expect(page.getByRole("button", { name: /Bookmarked/ })).toBeVisible();
  await page.getByRole("link", { name: "Advanced" }).click();
  await expect(page.getByText(/Every fixed-income price/)).toBeVisible();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await expect(page.getByText("Lesson completed")).toBeVisible();

  // 6. Practice with explanations.
  await page.goto("/practice");
  await page.getByLabel("Number of questions").fill("2");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL("**/attempt/**");
  const radio = page.locator("article input[type=radio]");
  if (await radio.count()) await radio.first().check();
  else await page.locator("article input[type=number], article textarea, article input[type=checkbox]").first().fill?.("1").catch(() => undefined);
  if (await page.locator("article input[type=checkbox]").count()) await page.locator("article input[type=checkbox]").first().check();
  if (await page.locator("article input[type=number]").count()) await page.locator("article input[type=number]").fill("1");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Correct answer|Model answer/).first()).toBeVisible();
  await expect(page.getByText("Concept tested")).toBeVisible();

  // 7. Results saved (practice list shows diagnostic).
  await page.goto("/practice");
  await expect(page.getByRole("cell", { name: /Diagnostic assessment/ })).toBeVisible();

  // 8. Flashcards: review a due card.
  await page.goto("/flashcards");
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByText(/Card 2 of|Session complete/)).toBeVisible();

  // 9. Timed mock exam.
  await page.goto("/mocks");
  await page.getByLabel(/Sectional/).check();
  await page.locator('input[name="topicIds"]').first().check();
  await page.getByLabel("Questions").fill("5");
  await page.getByRole("button", { name: "Start mock" }).click();
  await page.waitForURL("**/attempt/**");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
  await answerAllAndSubmit(page);
  await expect(page.getByText(/raw percentage score/)).toBeVisible();

  // 10–11. Analytics and recommendations.
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Exam readiness assessment" })).toBeVisible();
  await expect(page.getByText("Limitations")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Recommended next steps" })).toBeVisible();

  // 12. Resume after logging out and back in.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await login(page, creds.email, creds.password);
  await expect(page.getByText(/CFA Level I · exam/)).toBeVisible();
  await page.goto("/notes?tab=bookmarks");
  await expect(page.getByRole("link", { name: "Time Value of Money" })).toBeVisible();
});

test("the AI tutor answers in offline mode with citations", async ({ page }) => {
  await register(page);
  await page.goto("/tutor");
  await expect(page.getByText("Offline mode")).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForURL(/\/tutor\/.+/);
  await page.getByLabel("Message the tutor").fill("Explain the time value of money");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/assembled directly from PD FinPrep course material/)).toBeVisible();
  await expect(page.getByText("Sources:")).toBeVisible();
});
