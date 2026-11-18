const test = require("node:test");
const assert = require("node:assert/strict");
require("./helpers");
const jwt = require("jsonwebtoken");
const env = require("../src/config/env");
const { User } = require("../src/models");
const { requireAuth, requireAdmin } = require("../src/middleware/auth");

const call = (token) =>
  new Promise((resolve) => {
    const req = { headers: { authorization: token ? "Bearer " + token : "" } };
    requireAuth(req, {}, (err) => resolve({ err, req }));
  });
const stubUser = (u) => {
  User.findById = () => ({ select: async () => u });
};
const tokenAt = (iatSecondsAgo) =>
  jwt.sign({ id: "u1", iat: Math.floor(Date.now() / 1000) - iatSecondsAgo }, env.jwtSecret(), { expiresIn: "7d" });

test("a valid token authenticates", async () => {
  stubUser({ _id: "u1", role: "user" });
  const { err, req } = await call(tokenAt(5));
  assert.equal(err, undefined);
  assert.equal(req.user._id, "u1");
});

test("tokens issued before a password change are rejected", async () => {
  stubUser({ _id: "u1", role: "user", passwordChangedAt: new Date() });
  const { err } = await call(tokenAt(60));
  assert.equal(err.status, 401);
  assert.match(err.message, /password was changed/);
});

test("tokens issued after a password change still work", async () => {
  stubUser({ _id: "u1", role: "user", passwordChangedAt: new Date(Date.now() - 60000) });
  assert.equal((await call(tokenAt(5))).err, undefined);
});

test("missing, forged and orphaned tokens are rejected", async () => {
  assert.equal((await call("")).err.status, 401);
  assert.equal((await call(jwt.sign({ id: "u1" }, "wrong-secret"))).err.status, 401);
  stubUser(null);
  assert.match((await call(tokenAt(1))).err.message, /Account not found/);
});

test("requireAdmin gates on role", () => {
  let e1, e2;
  requireAdmin({ user: { role: "user" } }, {}, (e) => (e1 = e));
  requireAdmin({ user: { role: "admin" } }, {}, (e) => (e2 = e));
  assert.equal(e1.status, 403);
  assert.equal(e2, undefined);
});
