import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("a video lesson plays with the cartoon presenter, voice status and settings", async ({ page }) => {
  await register(page, "Video Student");
  await page.locator("label", { hasText: "Level I" }).filter({ has: page.locator('input[name="levelId"]') }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now and build my plan" }).click();
  await page.waitForURL("**/dashboard**");

  await page.goto("/videos");
  await page.locator('a[href^="/videos/"]').first().click();
  const stage = page.getByRole("region", { name: /Video explainer/ });
  await expect(stage).toBeVisible();
  await page.getByRole("button", { name: "Play explainer" }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  // Without an AI Gateway in tests, the player uses the device voice and says so.
  await expect(stage.getByText(/Device voice|Natural AI voice/)).toBeVisible();
  await page.getByRole("button", { name: "Next scene" }).click();
  await expect(stage.getByRole("heading", { name: "Objectives" })).toBeVisible();
  await page.getByRole("button", { name: "Video settings" }).click();
  const settings = page.getByRole("dialog", { name: "Video settings" });
  await expect(settings.getByLabel("Narrator voice")).toBeVisible();
  await expect(settings.getByRole("button", { name: "Sound effects" })).toHaveAttribute("aria-pressed", "true");
});
