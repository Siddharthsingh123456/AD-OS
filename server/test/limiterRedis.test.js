const test = require("node:test");
const assert = require("node:assert/strict");
require("./helpers");
const rateLimit = require("../src/middleware/rateLimit");

const makeRes = () => ({
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
    this.done?.();
    return this;
  },
});
const run = (mw) =>
  new Promise((resolve) => {
    const res = makeRes();
    res.done = () => resolve({ res, called: false });
    mw({ headers: {}, ip: "5.5.5.5", baseUrl: "/x", path: "/y" }, res, () => resolve({ res, called: true }));
  });

const realFetch = global.fetch;
test.afterEach(() => {
  global.fetch = realFetch;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
const enable = () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.io/";
  process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
};

test("uses one shared Redis counter when Upstash is configured", async () => {
  enable();
  const calls = [];
  let n = 0;
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    n += 1;
    return { ok: true, json: async () => [{ result: n }, { result: 1 }, { result: 45000 }] };
  };
  const mw = rateLimit({ max: 2, windowMs: 60000, name: "t" });
  assert.equal((await run(mw)).called, true);
  assert.equal((await run(mw)).called, true);
  const blocked = await run(mw);
  assert.equal(blocked.called, false);
  assert.equal(blocked.res.code, 429);
  assert.equal(blocked.res.headers["Retry-After"], "45");
  assert.equal(calls[0].url, "https://redis.example.io/pipeline");
  assert.equal(calls[0].init.headers.Authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(calls[0].init.body)[0], ["INCR", "rl:t|ip:5.5.5.5"]);
});

test("fails open to the in-memory counter when Redis is down", async () => {
  enable();
  global.fetch = async () => {
    throw new Error("network down");
  };
  const mw = rateLimit({ max: 1, windowMs: 60000, name: "down" });
  assert.equal((await run(mw)).called, true);
  assert.equal((await run(mw)).res.code, 429);
});
