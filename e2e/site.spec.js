const { test, expect } = require("@playwright/test");
const { mockApi, signedIn } = require("./helpers");

test.beforeEach(async ({ context }) => mockApi(context));

test("landing page shows the hero, stats and product tour", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One workspace.");
  await expect(page.getByText("modules behind one login")).toBeVisible();
  await page.locator("#tour").scrollIntoViewIfNeeded();
  const tour = page.locator(".tour-frame img");
  await expect(tour).toHaveAttribute("src", /dashboard\.jpg/);
  await page.getByRole("tab", { name: "Shared memory" }).click();
  await expect(tour).toHaveAttribute("src", /memory\.jpg/);
});

test("theme choice switches the page and survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: /Dark theme/ })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("pricing toggles between monthly and yearly", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("Recommended")).toBeVisible();
  const before = await page.locator(".plan.featured").innerText();
  await page.getByRole("button", { name: /Monthly/ }).click();
  expect(await page.locator(".plan.featured").innerText()).not.toBe(before);
});

test("FAQ items open and close", async ({ page }) => {
  await page.goto("/");
  const first = page.locator(".faq details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
});

test("unknown pages show the not-found screen", async ({ page }) => {
  await page.goto("/definitely-not-here");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("signed-out visitors are sent to sign in, then land on the dashboard", async ({ page, context }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill("ada@example.com");
  await page.locator("input[autocomplete=current-password]").fill("correct horse battery");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ada");
  const names = (await context.cookies()).map((c) => c.name);
  expect(names).toContain("aidos_csrf");
});

test("registration shows live password strength", async ({ page }) => {
  await page.goto("/register");
  await page.locator("input[autocomplete=new-password]").fill("abc");
  await expect(page.getByText("Too short")).toBeVisible();
  await page.locator("input[autocomplete=new-password]").fill("Sup3r!secret-passphrase");
  await expect(page.getByText("Strong")).toBeVisible();
});

test("the dashboard lists every module and the command palette opens with Ctrl+K", async ({ page, context }) => {
  await signedIn(context);
  await page.goto("/app");
  await expect(page.locator(".tiles .index-row").first()).toBeVisible();
  expect(await page.locator(".tiles .index-row").count()).toBeGreaterThanOrEqual(15);
  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeHidden();
});

test("an expired session signs the user out", async ({ page, context }) => {
  await signedIn(context);
  await mockApi(context, { "/auth/me": {} });
  await context.route("**/api/auth/me", (r) =>
    r.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Session expired." }) }),
  );
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
});
