// Runs the real Express app against a real MongoDB. Skipped unless MONGODB_URI_TEST is set:
//   MONGODB_URI_TEST=mongodb://127.0.0.1:27017/aidos_test npm run test:integration
// WARNING: the database named in the URI is dropped before and after the run. Use a throwaway one.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");

const URI = process.env.MONGODB_URI_TEST;
const skip = URI ? false : "MONGODB_URI_TEST is not set";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-secret-integration-secret-123456";
if (URI) process.env.MONGODB_URI = URI;

let base, server, mongoose;

/** Tiny cookie-aware client so the tests exercise the same flow a browser does. */
function client() {
  const jar = {};
  const call = async (method, path, body, { csrf = true, headers = {} } = {}) => {
    const h = { "content-type": "application/json", ...headers };
    const cookie = Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    if (cookie) h.cookie = cookie;
    if (csrf && jar.aidos_csrf) h["x-csrf-token"] = jar.aidos_csrf;
    const res = await fetch(base + "/api" + path, {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i);
      const val = pair.slice(i + 1);
      if (/Expires=Thu, 01 Jan 1970/.test(c) || val === "") delete jar[name];
      else jar[name] = val;
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data };
  };
  return { call, jar };
}

test.before(async () => {
  if (!URI) return;
  const { connectDB } = require("../src/config/db");
  mongoose = require("mongoose");
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  server = http.createServer(require("../src/app"));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!URI) return;
  await new Promise((r) => server.close(r));
  await mongoose.connection.dropDatabase();
  await require("../src/config/db").disconnectDB();
});

const ada = { name: "Ada", email: "ada@example.com", password: "correct horse battery" };
const bob = { name: "Bob", email: "bob@example.com", password: "another long password" };

test("the first account becomes admin, the second does not, duplicates are rejected", { skip }, async () => {
  const a = client();
  const r1 = await a.call("POST", "/auth/register", ada);
  assert.equal(r1.status, 201);
  assert.equal(r1.data.user.role, "admin");
  assert.ok(a.jar.aidos_session && a.jar.aidos_csrf);
  const r2 = await client().call("POST", "/auth/register", bob);
  assert.equal(r2.data.user.role, "user");
  const dup = await client().call("POST", "/auth/register", ada);
  assert.equal(dup.status, 409);
});

test("sign-in works with the right password only, and /me follows the cookie", { skip }, async () => {
  const c = client();
  assert.equal((await c.call("POST", "/auth/login", { email: ada.email, password: "wrong password!" })).status, 401);
  assert.equal(
    (await c.call("POST", "/auth/login", { email: ada.email.toUpperCase(), password: ada.password })).status,
    200,
  );
  const me = await c.call("GET", "/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, ada.email);
  assert.equal((await client().call("GET", "/auth/me")).status, 401);
});

test("writes with a session cookie need the CSRF header", { skip }, async () => {
  const c = client();
  await c.call("POST", "/auth/login", { email: ada.email, password: ada.password });
  const blocked = await c.call("POST", "/notes", { title: "x" }, { csrf: false });
  assert.equal(blocked.status, 403);
  assert.equal((await c.call("POST", "/notes", { title: "x" })).status, 201);
});

test("notes and memory are saved, listed, updated and deleted per user", { skip }, async () => {
  const c = client();
  await c.call("POST", "/auth/login", { email: ada.email, password: ada.password });
  const made = await c.call("POST", "/notes", { title: "Q3 report", content: "Revenue grew 12%.", tags: ["finance"] });
  assert.equal(made.status, 201);
  const id = made.data._id;
  const upd = await c.call("PUT", `/notes/${id}`, { title: "Q3 report (final)" });
  assert.equal(upd.data.title, "Q3 report (final)");
  const list = await c.call("GET", "/notes");
  assert.ok(list.data.some((n) => n._id === id));

  const mem = await c.call("POST", "/memory", { text: "I deploy on Vercel" });
  assert.equal(mem.status, 201);
  assert.equal((await c.call("GET", "/memory")).data.length >= 1, true);
  assert.equal((await c.call("DELETE", `/memory/${mem.data._id}`)).status, 200);

  // Bob cannot see or touch Ada's note.
  const b = client();
  await b.call("POST", "/auth/login", { email: bob.email, password: bob.password });
  assert.equal(
    (await b.call("GET", "/notes")).data.some((n) => n._id === id),
    false,
  );
  assert.ok([403, 404].includes((await b.call("DELETE", `/notes/${id}`)).status));
  assert.equal((await c.call("DELETE", `/notes/${id}`)).status, 200);
});

test("changing the password signs out older sessions", { skip }, async () => {
  const old = client();
  const login = await old.call("POST", "/auth/login?token=1", { email: bob.email, password: bob.password });
  const oldToken = login.data.token;
  await new Promise((r) => setTimeout(r, 1100)); // token timestamps have one-second resolution
  const c = client();
  await c.call("POST", "/auth/login", { email: bob.email, password: bob.password });
  const changed = await c.call("POST", "/auth/password", { current: bob.password, next: "a brand new password" });
  assert.equal(changed.status, 200);
  const stale = await fetch(base + "/api/auth/me", { headers: { authorization: "Bearer " + oldToken } });
  assert.equal(stale.status, 401);
  assert.equal((await c.call("GET", "/auth/me")).status, 200);
  bob.password = "a brand new password";
});

test("deleting an account removes its data and ends the session", { skip }, async () => {
  const c = client();
  await c.call("POST", "/auth/login", { email: bob.email, password: bob.password });
  await c.call("POST", "/notes", { title: "to be purged" });
  const del = await c.call("POST", "/auth/delete-account", { password: bob.password });
  assert.equal(del.status, 200);
  assert.equal(c.jar.aidos_session, undefined);
  const { Note, User } = require("../src/models");
  assert.equal(await User.countDocuments({ email: bob.email }), 0);
  assert.equal(await Note.countDocuments({ title: "to be purged" }), 0);
});
