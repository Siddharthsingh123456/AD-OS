const test = require("node:test");
const assert = require("node:assert/strict");
const { start } = require("./helpers");

let srv;
test.before(async () => {
  srv = await start();
});
test.after(async () => {
  await srv.close();
});

test("GET /api/chat/catalog is public and never exposes system prompts", async () => {
  const r = await fetch(srv.base + "/api/chat/catalog");
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(Array.isArray(body.builtin) && body.builtin.length > 0);
  assert.deepEqual(Object.keys(body), ["builtin"]);
  for (const a of body.builtin) {
    assert.ok(a.id && a.name);
    assert.equal(a.system, undefined);
  }
});

test("skipping login unlocks nothing: protected chat routes still require a session", async () => {
  for (const path of ["/api/chat/agents", "/api/chat/recent", "/api/chat/conversations?key=chat"]) {
    const r = await fetch(srv.base + path);
    assert.equal(r.status, 401, path);
  }
  const send = await fetch(srv.base + "/api/chat/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agent: "chat", message: "hi" }),
  });
  assert.ok([401, 403].includes(send.status));
});
