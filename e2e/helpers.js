const fs = require("fs");
const path = require("path");

const user = { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "user", plan: "starter" };

/** Mocks the API in the browser. Pass overrides as { "/path-fragment": body }. */
async function mockApi(context, overrides = {}) {
  const agents = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/agents.json"), "utf8"));
  await context.route("**/api/**", async (route) => {
    const url = route.request().url();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    for (const [frag, body] of Object.entries(overrides)) if (url.includes(frag)) return json(body);
    if (url.includes("/auth/login")) {
      await context.addCookies([
        { name: "aidos_csrf", value: "csrf-token", url: "http://localhost:4173" },
        { name: "aidos_session", value: "s", url: "http://localhost:4173", httpOnly: true },
      ]);
      return json({ user });
    }
    if (url.includes("/auth/me")) return json({ user });
    if (url.includes("/auth/stats")) return json({ chats: 3, notes: 2, docs: 1, projects: 1, memories: 2 });
    if (url.includes("/chat/agents")) return json({ builtin: agents, custom: [] });
    if (url.includes("/chat/recent")) return json([]);
    if (url.includes("/health")) return json({ ok: true, db: true, llm: true, demo: false });
    return json([]);
  });
}

async function signedIn(context) {
  await context.addCookies([{ name: "aidos_csrf", value: "csrf-token", url: "http://localhost:4173" }]);
}

module.exports = { mockApi, signedIn, user };
