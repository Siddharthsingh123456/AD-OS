const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { start, json } = require("./helpers");
const { User } = require("../src/models");
const { sign } = require("../src/middleware/auth");

const user = {
  _id: "u1",
  name: "Ada",
  email: "ada@example.com",
  role: "user",
  plan: "starter",
  password: bcrypt.hashSync("correct horse", 4),
};
User.findOne = async () => user;
User.findById = () => ({ select: async () => user });

let srv;
test.before(async () => {
  srv = await start();
});
test.after(async () => {
  await srv.close();
});

const cookiesFrom = (res) => res.headers.getSetCookie();
const pick = (list, name) => list.find((c) => c.startsWith(name + "="));
const value = (c) => c.split(";")[0].split("=")[1];

async function login() {
  const res = await fetch(srv.base + "/api/auth/login", json({ email: "ada@example.com", password: "correct horse" }));
  const set = cookiesFrom(res);
  return { res, set, session: value(pick(set, "aidos_session")), csrf: value(pick(set, "aidos_csrf")) };
}

test("login sets an httpOnly session cookie and a readable CSRF cookie, and keeps the token out of the body", async () => {
  const { res, set } = await login();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.token, undefined);
  assert.equal(body.user.email, "ada@example.com");
  const session = pick(set, "aidos_session");
  assert.match(session, /HttpOnly/i);
  assert.match(session, /SameSite=Lax/i);
  assert.doesNotMatch(pick(set, "aidos_csrf"), /HttpOnly/i);
});

test("scripts can still ask for a bearer token with ?token=1", async () => {
  const res = await fetch(
    srv.base + "/api/auth/login?token=1",
    json({ email: "ada@example.com", password: "correct horse" }),
  );
  const body = await res.json();
  assert.equal(typeof body.token, "string");
  const me = await fetch(srv.base + "/api/auth/me", { headers: { authorization: "Bearer " + body.token } });
  assert.equal(me.status, 200);
});

test("the session cookie authenticates GET requests", async () => {
  const { session } = await login();
  const me = await fetch(srv.base + "/api/auth/me", { headers: { cookie: "aidos_session=" + session } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.id, "u1");
});

test("cookie-authenticated writes need the CSRF header", async () => {
  const { session, csrf } = await login();
  const cookie = `aidos_session=${session}; aidos_csrf=${csrf}`;
  const missing = await fetch(srv.base + "/api/auth/logout", { method: "POST", headers: { cookie } });
  assert.equal(missing.status, 403);
  const wrong = await fetch(srv.base + "/api/auth/logout", {
    method: "POST",
    headers: { cookie, "x-csrf-token": "nope" },
  });
  assert.equal(wrong.status, 403);
  const ok = await fetch(srv.base + "/api/auth/logout", { method: "POST", headers: { cookie, "x-csrf-token": csrf } });
  assert.equal(ok.status, 200);
  const cleared = cookiesFrom(ok);
  assert.match(pick(cleared, "aidos_session"), /Expires=Thu, 01 Jan 1970/);
});

test("a foreign Origin is rejected even with a valid CSRF token", async () => {
  const { session, csrf } = await login();
  const res = await fetch(srv.base + "/api/auth/logout", {
    method: "POST",
    headers: {
      cookie: `aidos_session=${session}; aidos_csrf=${csrf}`,
      "x-csrf-token": csrf,
      origin: "https://evil.example",
    },
  });
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /Cross-site/);
});

test("Bearer requests are not subject to CSRF checks", async () => {
  const res = await fetch(srv.base + "/api/auth/logout", {
    method: "POST",
    headers: { authorization: "Bearer " + sign(user) },
  });
  assert.equal(res.status, 200);
});

test("anonymous writes are not blocked by the CSRF check", async () => {
  const res = await fetch(srv.base + "/api/auth/login", json({ email: "ada@example.com", password: "wrong password" }));
  assert.equal(res.status, 401);
});

test("demo sign-in is hidden unless DEMO_MODE is on, then issues a session", async () => {
  const off = await fetch(srv.base + "/api/auth/demo", { method: "POST" });
  assert.equal(off.status, 404);
  process.env.DEMO_MODE = "true";
  try {
    const demoUser = { ...user, _id: "d1", email: "demo@ai-developer-os.local" };
    const was = User.findOne;
    User.findOne = async () => demoUser;
    const on = await fetch(srv.base + "/api/auth/demo", { method: "POST" });
    assert.equal(on.status, 200);
    const set = on.headers.getSetCookie();
    assert.ok(pick(set, "aidos_session"));
    // The shared demo account cannot change its password.
    User.findById = () => ({ select: async () => demoUser });
    const pw = await fetch(srv.base + "/api/auth/password", {
      ...json({ current: "x", next: "longenough1" }),
      headers: { "content-type": "application/json", authorization: "Bearer " + sign(demoUser) },
    });
    assert.equal(pw.status, 403);
    User.findOne = was;
    User.findById = () => ({ select: async () => user });
  } finally {
    delete process.env.DEMO_MODE;
  }
});
