const test = require("node:test");
const assert = require("node:assert/strict");
const { start, json } = require("./helpers");

let srv;
test.before(async () => {
  srv = await start();
});
test.after(async () => {
  await srv.close();
});

test("GET /api/health reports status without leaking secrets", async () => {
  const r = await fetch(srv.base + "/api/health");
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.version, "string");
  assert.ok(!JSON.stringify(body).includes("test-secret"));
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("responses carry strict security headers and a request id", async () => {
  const r = await fetch(srv.base + "/api/health");
  const csp = r.headers.get("content-security-policy");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-powered-by"), null);
  assert.match(r.headers.get("x-request-id"), /^[\w-]{8,64}$/);
});

test("CORS: foreign origins get no allow header, listed origins do", async () => {
  const foreign = await fetch(srv.base + "/api/health", { headers: { origin: "https://evil.example" } });
  assert.equal(foreign.headers.get("access-control-allow-origin"), null);
  process.env.CORS_ORIGIN = "https://app.example.com";
  const ok = await fetch(srv.base + "/api/health", { headers: { origin: "https://app.example.com" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://app.example.com");
  delete process.env.CORS_ORIGIN;
});

test("unknown API routes return JSON 404 with a request id", async () => {
  const r = await fetch(srv.base + "/api/nope");
  assert.equal(r.status, 404);
  const body = await r.json();
  assert.equal(body.error, "Not found");
  assert.ok(body.requestId);
});

test("malformed JSON is a 400, not a crash", async () => {
  const r = await fetch(srv.base + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{oops",
  });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /not valid JSON/);
});

test("protected routes require a valid token", async () => {
  for (const path of [
    "/api/auth/me",
    "/api/chat/agents",
    "/api/notes",
    "/api/memory",
    "/api/admin/overview",
    "/api/projects",
    "/api/resume",
  ]) {
    const r = await fetch(srv.base + path);
    assert.equal(r.status, 401, path);
  }
  const bad = await fetch(srv.base + "/api/auth/me", { headers: { authorization: "Bearer not.a.jwt" } });
  assert.equal(bad.status, 401);
});

test("registration validates input before touching the database", async () => {
  const post = (b) => fetch(srv.base + "/api/auth/register", json(b));
  assert.equal((await post({ name: "", email: "a@b.co", password: "longenough" })).status, 400);
  const email = await post({ name: "Ada", email: "not-an-email", password: "longenough" });
  assert.equal(email.status, 400);
  assert.match((await email.json()).error, /valid email/);
  const pw = await post({ name: "Ada", email: "ada@example.com", password: "short" });
  assert.match((await pw.json()).error, /at least 8/);
  // Objects are rejected outright rather than coerced (operator-injection guard).
  const inj = await post({ name: "Ada", email: { $gt: "" }, password: "longenough" });
  assert.equal(inj.status, 400);
});

test("login is rate limited", async () => {
  let last;
  for (let i = 0; i < 20; i++) last = await fetch(srv.base + "/api/auth/login", json({ email: {}, password: "y" }));
  assert.equal(last.status, 429);
  assert.ok(last.headers.get("retry-after"));
});
