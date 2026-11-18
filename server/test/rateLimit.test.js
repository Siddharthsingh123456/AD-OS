const test = require("node:test");
const assert = require("node:assert/strict");
const rateLimit = require("../src/middleware/rateLimit");

const run = (mw, req) => {
  const res = {
    headers: {},
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(c) {
      this.code = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  let called = false;
  mw({ headers: {}, ip: "1.2.3.4", baseUrl: "/x", path: "/y", ...req }, res, () => (called = true));
  return { res, called };
};

test("allows up to max requests then answers 429 with Retry-After", () => {
  const mw = rateLimit({ max: 2, windowMs: 1000, message: "slow down" });
  assert.equal(run(mw, {}).called, true);
  assert.equal(run(mw, {}).called, true);
  const blocked = run(mw, {});
  assert.equal(blocked.called, false);
  assert.equal(blocked.res.code, 429);
  assert.equal(blocked.res.body.error, "slow down");
  assert.ok(Number(blocked.res.headers["Retry-After"]) >= 1);
});

test("counts clients separately and exposes RateLimit headers", () => {
  const mw = rateLimit({ max: 1, windowMs: 1000 });
  assert.equal(run(mw, { ip: "a" }).called, true);
  const other = run(mw, { ip: "b" });
  assert.equal(other.called, true);
  assert.equal(other.res.headers["RateLimit-Remaining"], "0");
});

test("by:user keys on the signed-in user instead of the IP", () => {
  const mw = rateLimit({ max: 1, by: "user", name: "t" });
  assert.equal(run(mw, { ip: "a", user: { _id: "u1" } }).called, true);
  assert.equal(run(mw, { ip: "b", user: { _id: "u1" } }).called, false);
  assert.equal(run(mw, { ip: "a", user: { _id: "u2" } }).called, true);
});

test("trusts the first X-Forwarded-For hop", () => {
  const mw = rateLimit({ max: 1 });
  assert.equal(run(mw, { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }).called, true);
  assert.equal(run(mw, { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.2" } }).called, false);
});
