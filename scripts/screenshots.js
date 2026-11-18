#!/usr/bin/env node
// Regenerates the README screenshots and the landing-page product tour from the built app, using a mocked API with sample data.
//   npm run build && npm run screenshots        (needs `npx playwright install chromium` once)
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const ROOT = path.join(__dirname, "..");
const PORT = 4174;
const BASE = `http://localhost:${PORT}`;
const DOCS = path.join(ROOT, "docs/screenshots");
const TOUR = path.join(ROOT, "client/public/tour");
const agents = JSON.parse(fs.readFileSync(path.join(ROOT, "e2e/fixtures/agents.json"), "utf8"));

const user = { id: "1", name: "Siddharth Kumar", email: "s@example.dev", role: "admin", plan: "starter" };
const conversation = {
  _id: "c1",
  title: "Why is my Mongo cold start slow?",
  agent: "debugging",
  messages: [
    { role: "user", content: "Why does my cold start exceed 10s on Vercel?" },
    {
      role: "assistant",
      content:
        "Your connection is opened on every invocation, so each cold start pays for a fresh TLS handshake to Atlas.\n\n**Cache the client** on `global` so warm lambdas reuse it:\n\n```js\nlet cached = global._mongo;\nif (!cached) cached = global._mongo = { conn: null, promise: null };\n```\n\nSince you told me you deploy on Vercel with MongoDB Atlas, this is the fix to try first.",
      sources: ["vercel.json", "api/index.js"],
    },
  ],
};
const memories = [
  { _id: "m1", text: "I deploy on Vercel with MongoDB Atlas", createdAt: "2026-10-01T00:00:00Z" },
  { _id: "m2", text: "Prefer TypeScript, named exports and small pure functions", createdAt: "2026-10-02T00:00:00Z" },
  { _id: "m3", text: "My API runs on Node 20 behind Express 4", createdAt: "2026-10-03T00:00:00Z" },
];

function route(page) {
  return page.route("**/api/**", (r) => {
    const u = r.request().url();
    const send = (body) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (u.includes("/auth/me")) return send({ user });
    if (u.includes("/auth/stats")) return send({ chats: 12, notes: 5, docs: 3, projects: 2, memories: 3 });
    if (u.includes("/chat/agents")) return send({ builtin: agents, custom: [] });
    if (u.includes("/chat/conversations/c1")) return send(conversation);
    if (u.includes("/chat/conversations"))
      return send([{ _id: "c1", title: conversation.title, updatedAt: new Date().toISOString() }]);
    if (u.includes("/chat/recent"))
      return send([{ _id: "c1", agent: "debugging", title: conversation.title, updatedAt: new Date().toISOString() }]);
    if (u.includes("/memory")) return send(memories);
    if (u.includes("/billing/status")) return send({ enabled: false, plan: "starter", status: "" });
    if (u.includes("/health")) return send({ ok: true, db: true, llm: true, demo: false });
    return send([]);
  });
}

async function main() {
  fs.mkdirSync(DOCS, { recursive: true });
  fs.mkdirSync(TOUR, { recursive: true });
  const server = spawn(
    "npx",
    ["vite", "preview", "--config", "client/vite.config.mjs", "--port", String(PORT), "--strictPort"],
    {
      cwd: ROOT,
      stdio: "ignore",
    },
  );
  try {
    for (let i = 0; i < 40; i++) {
      if (
        await fetch(BASE).then(
          (r) => r.ok,
          () => false,
        )
      )
        break;
      await new Promise((r) => setTimeout(r, 500));
    }
    const browser = await chromium.launch(
      process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    );
    const open = async (signedIn) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await ctx.addInitScript(() => localStorage.setItem("aidos_theme", "dark"));
      if (signedIn) await ctx.addCookies([{ name: "aidos_csrf", value: "x", url: BASE }]);
      const page = await ctx.newPage();
      await route(page);
      return page;
    };
    const snap = async (page, file, opts) => {
      await page.waitForTimeout(1600);
      await page.screenshot({ path: file, ...opts });
      console.log("wrote", path.relative(ROOT, file));
    };

    const anon = await open(false);
    await anon.goto(BASE);
    await snap(anon, path.join(DOCS, "landing.png"));

    const app = await open(true);
    await app.goto(BASE + "/app");
    await snap(app, path.join(DOCS, "dashboard.png"));
    await snap(app, path.join(TOUR, "dashboard.jpg"), { type: "jpeg", quality: 82 });
    await app.goto(BASE + "/app/debugging");
    await app.getByText(conversation.title).first().click();
    await snap(app, path.join(DOCS, "chat.png"));
    await snap(app, path.join(TOUR, "chat.jpg"), { type: "jpeg", quality: 82 });
    await app.goto(BASE + "/app/memory");
    await snap(app, path.join(TOUR, "memory.jpg"), { type: "jpeg", quality: 82 });
    await browser.close();
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
