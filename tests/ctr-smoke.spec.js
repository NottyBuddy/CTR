const { test, expect } = require("@playwright/test");

test("CTR public page, assets and sign-in form load without JavaScript errors", async ({ page, request }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  const response = await page.goto("./");
  expect(response && response.status()).toBe(200);
  await expect(page).toHaveTitle(/CTR — Calling Team Records/);
  await expect(page.locator("#authView")).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.locator("#authSubmit")).toBeEnabled();
  const assets = await Promise.all(["./styles.css?v=ctr-full-audit-20261124-3", "./app.js?v=ctr-direct-stability-20261124-7"].map(url => request.get(new URL(url, "https://nottybuddy.github.io/CTR/").toString())));
  expect(assets.map(x => x.status())).toEqual([200, 200, 200, 200, 200]);
  expect(pageErrors, "Uncaught JavaScript errors").toEqual([]);
});

test("authenticated agent can use all workspace sections and open Direct Chat", async ({ page }) => {
  const email = process.env.CTR_TEST_EMAIL;
  const password = process.env.CTR_TEST_PASSWORD;
  test.skip(!email || !password, "Set CTR_TEST_EMAIL and CTR_TEST_PASSWORD GitHub Actions secrets for authenticated checks.");
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("./");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#authSubmit").click();
  await expect(page.locator("#appView")).toBeVisible({ timeout: 30000 });

  const sections = [
    ["group", "#groupView"],
    ["personal", "#personalView"],
    ["direct", "#directView"],
    ["followups", "#followupsView"],
    ["dashboard", "#dashboardView"],
  ];
  for (const [view, selector] of sections) {
    await page.locator('[data-view="' + view + '"]').click();
    await expect(page.locator(selector)).toBeVisible();
  }

  await expect(page.locator("#directInboxList")).toBeVisible();
  await expect(page.locator("#directForm")).toBeVisible();
  await expect(page.locator("#dmNewRecipient")).toBeAttached();
  await expect(page.locator("#directInboxList")).not.toContainText("Chats could not be loaded", { timeout: 20000 });
  const firstContact = page.locator("#directInboxList button.dm-conversation").first();
  await expect(firstContact).toBeVisible({ timeout: 20000 });
  await firstContact.click();
  await expect(page.locator("#directInput")).toBeEnabled();
  await expect(page.locator("#directForm button[type=submit]")).toBeEnabled();

  // Mobile: selecting a contact must reveal the thread pane, and the header must return to the inbox.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#directInboxList button.dm-conversation").first().click();
  await expect(page.locator("#directView .dm-inbox")).toHaveClass(/mobile-thread-open/);
  await expect(page.locator("#dmThreadHeader")).toBeVisible();
  await page.locator("#dmThreadHeader").click();
  await expect(page.locator("#directView .dm-inbox")).not.toHaveClass(/mobile-thread-open/);
  expect(pageErrors, "Uncaught JavaScript errors during workspace navigation").toEqual([]);
});

test("authenticated admin can inspect agent conversations and activity", async ({ page }) => {
  const email = process.env.CTR_ADMIN_TEST_EMAIL;
  const password = process.env.CTR_ADMIN_TEST_PASSWORD;
  test.skip(!email || !password, "Set CTR_ADMIN_TEST_EMAIL and CTR_ADMIN_TEST_PASSWORD GitHub Actions secrets for admin checks.");
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("./");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#authSubmit").click();
  await expect(page.locator("#appView")).toBeVisible({ timeout: 30000 });
  await page.locator('[data-view="dashboard"]').click();
  await expect(page.locator("#dashboardView")).toBeVisible();
  await expect(page.locator("#agentDashboard")).toBeVisible();
  const agent = page.locator("#agentDashboard [data-audit-agent]").first();
  await expect(agent).toBeVisible({ timeout: 20000 });
  await agent.click();
  await expect(page.locator("#agentChatAudit")).toBeVisible();
  await expect(page.locator("#agentChatAuditSearch")).toBeVisible();
  await expect(page.locator("#agentChatAuditDate")).toBeVisible();
  const conversation = page.locator("#agentChatAudit [data-audit-pair]").first();
  if (await conversation.count()) {
    await conversation.click();
    await expect(page.locator(".agent-audit-thread")).toBeVisible();
    await page.locator("[data-audit-back-list]").click();
  }
  expect(pageErrors, "Uncaught JavaScript errors in admin audit").toEqual([]);
});

test("CTR layout fits desktop and mobile viewports without horizontal overflow", async ({ page }) => {
  await page.goto("./");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth, "Horizontal overflow at viewport " + viewport.width).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
});
