import { expect, test } from "@playwright/test";
import { register } from "./helpers";

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("landing, catalog and app pages fit a phone screen", async ({ page }) => {
  for (const path of ["/", "/catalog", "/catalog/cfa", "/login"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await register(page, "Mobile Student");
  await page.locator("label", { hasText: "Level I" }).filter({ has: page.locator('input[name="levelId"]') }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now and build my plan" }).click();
  await page.waitForURL("**/dashboard**");
  for (const path of ["/dashboard", "/plan", "/learn", "/practice", "/analytics", "/formulas"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  for (const path of ["/guide", "/materials", "/videos", "/get-app"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await page.getByRole("navigation", { name: "Quick" }).getByRole("link", { name: "Practice" }).click();
  await expect(page).toHaveURL(/\/practice/);
  await page.getByRole("button", { name: "More" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "Flashcards" })).toBeVisible();
  await menu.getByRole("link", { name: "Flashcards" }).click();
  await expect(page).toHaveURL(/\/flashcards/);
});
