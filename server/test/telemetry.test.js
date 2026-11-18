const test = require("node:test");
const assert = require("node:assert/strict");
const { start, json } = require("./helpers");
const monitor = require("../src/services/monitor");

let srv;
const realFetch = global.fetch;
test.before(async () => {
  srv = await start();
});
test.after(async () => {
  global.fetch = realFetch;
  await srv.close();
});

test("client crash reports are accepted without auth", async () => {
  const r = await realFetch(
    srv.base + "/api/telemetry/client-error",
    json({ message: "boom", stack: "at x", url: "/app" }),
  );
  assert.equal(r.status, 204);
});

test("monitor forwards to the webhook when configured and stays quiet otherwise", async () => {
  const calls = [];
  global.fetch = async (url, init) => (calls.push({ url, body: JSON.parse(init.body) }), { ok: true });
  assert.equal(monitor.report("server-error", { error: "x" }), false);
  process.env.ERROR_WEBHOOK_URL = "https://hooks.example.com/abc";
  assert.equal(monitor.report("server-error", { error: "db exploded", path: "/api/x" }), true);
  delete process.env.ERROR_WEBHOOK_URL;
  assert.equal(calls.length, 1);
  assert.match(calls[0].body.text, /db exploded/);
});

test("health reports limiter backend, billing and demo flags", async () => {
  const b = await (await realFetch(srv.base + "/api/health")).json();
  assert.equal(b.limiter, "memory");
  assert.equal(b.billing, false);
  assert.equal(typeof b.memoryMb, "number");
});
