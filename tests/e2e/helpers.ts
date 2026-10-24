import { expect, type Page } from "@playwright/test";

export async function register(page: Page, name = "E2E Student") {
  const email = `e2e${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password1234");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/onboarding");
  return { email, password: "Password1234" };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

/** Answers every question shown in the runner (first option / a number) and submits. */
export async function answerAllAndSubmit(page: Page) {
  for (let guard = 0; guard < 200; guard++) {
    const radio = page.locator("article input[type=radio]");
    const box = page.locator("article input[type=checkbox]");
    const num = page.locator("article input[type=number]");
    const text = page.locator("article textarea");
    if (await radio.count()) await radio.first().check();
    else if (await box.count()) await box.first().check();
    else if (await num.count()) await num.fill("1");
    else if (await text.count()) await text.fill("cite the source and verify accuracy");
    const next = page.getByRole("button", { name: /^Next/ });
    const finish = page.getByRole("button", { name: "Finish section" });
    if (await next.count()) {
      await next.click();
    } else if (await finish.count()) {
      page.once("dialog", (d) => d.accept());
      await finish.click();
      await expect(page.getByText(/Question 1 of/)).toBeVisible();
    } else break;
  }
  await page.getByRole("button", { name: "Review & submit" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/results");
}
