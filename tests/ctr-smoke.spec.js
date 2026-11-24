const { test, expect } = require("@playwright/test");

test("CTR public page loads and sign-in form is usable", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page).toHaveTitle(/CTR — Calling Team Records/);
  await expect(page.locator("#authView")).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.locator("#authSubmit")).toBeEnabled();

  expect(pageErrors, "Uncaught JavaScript errors").toEqual([]);
});

test("authenticated agent can open the Direct Chat workspace", async ({ page }) => {
  const email = process.env.CTR_TEST_EMAIL;
  const password = process.env.CTR_TEST_PASSWORD;
  test.skip(!email || !password, "Set CTR_TEST_EMAIL and CTR_TEST_PASSWORD GitHub Actions secrets for authenticated checks.");

  await page.goto("/");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#authSubmit").click();

  await expect(page.locator("#appView")).toBeVisible({ timeout: 30000 });
  await page.locator('[data-view="direct"]').click();
  await expect(page.locator("#directView")).toBeVisible();
  await expect(page.locator("#directInboxList")).toBeVisible();
  await expect(page.locator("#directForm")).toBeVisible();
  await expect(page.locator("#directInput")).toBeDisabled();
  await expect(page.locator("#dmNewRecipient")).toBeVisible();
  await expect(page.locator("#directInboxList")).not.toContainText("Chats could not be loaded", { timeout: 20000 });
  const firstContact = page.locator("#directInboxList button.dm-conversation").first();
  await expect(firstContact).toBeVisible({ timeout: 20000 });
  await firstContact.click();
  await expect(page.locator("#directInput")).toBeEnabled();
  await expect(page.locator("#directForm button[type=submit]")).toBeEnabled();
});

test("authenticated admin can open the Agents Dashboard", async ({ page }) => {
  const email = process.env.CTR_ADMIN_TEST_EMAIL;
  const password = process.env.CTR_ADMIN_TEST_PASSWORD;
  test.skip(!email || !password, "Set CTR_ADMIN_TEST_EMAIL and CTR_ADMIN_TEST_PASSWORD GitHub Actions secrets for admin checks.");

  await page.goto("/");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#authSubmit").click();

  await expect(page.locator("#appView")).toBeVisible({ timeout: 30000 });
  await page.locator('[data-view="dashboard"]').click();
  await expect(page.locator("#dashboardView")).toBeVisible();
  await expect(page.locator("#agentDashboard")).toBeVisible();
});

test("CTR layout fits a mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#authView")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
