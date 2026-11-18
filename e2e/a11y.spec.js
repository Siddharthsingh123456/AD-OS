const { test, expect } = require("@playwright/test");
const fs = require("fs");
const { mockApi, signedIn } = require("./helpers");

const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function violations(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] });
    return r.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(" ")}`);
  });
}

for (const theme of ["dark", "light"]) {
  for (const path of [
    "/",
    "/pricing",
    "/features",
    "/about",
    "/privacy",
    "/login",
    "/app",
    "/app/settings",
    "/app/memory",
  ]) {
    test(`no axe violations on ${path} (${theme})`, async ({ page, context }) => {
      await mockApi(context);
      await page.addInitScript((t) => localStorage.setItem("aidos_theme", t), theme);
      if (path.startsWith("/app")) await signedIn(context);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await violations(page)).toEqual([]);
    });
  }
}
