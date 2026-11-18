const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { start } = require("./helpers");
const { User } = require("../src/models");
const { sign } = require("../src/middleware/auth");
const { verifySignature } = require("../src/routes/billing");

const SECRET = "whsec_test_secret";
const signed = (payload, t = Math.floor(Date.now() / 1000), secret = SECRET) =>
  `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

test("verifySignature accepts valid, rejects tampered and stale signatures", () => {
  const body = Buffer.from('{"a":1}');
  assert.equal(verifySignature(body, signed(body.toString()), SECRET), true);
  assert.equal(verifySignature(Buffer.from('{"a":2}'), signed(body.toString()), SECRET), false);
  assert.equal(verifySignature(body, signed(body.toString(), 1000), SECRET), false);
  assert.equal(verifySignature(body, "garbage", SECRET), false);
  assert.equal(verifySignature(body, signed(body.toString(), undefined, "other"), SECRET), false);
});

let srv;
const realFetch = global.fetch;
test.before(async () => {
  srv = await start();
});
test.after(async () => {
  global.fetch = realFetch;
  await srv.close();
});
test.afterEach(() => {
  for (const k of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO_MONTHLY"]) delete process.env[k];
  global.fetch = realFetch;
});
const enable = () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
};

test("billing endpoints answer 503 until Stripe is configured", async () => {
  const r = await fetch(srv.base + "/api/billing/webhook", { method: "POST", body: "{}" });
  assert.equal(r.status, 503);
});

test("webhook rejects a bad signature and applies a signed checkout event", async () => {
  enable();
  let update;
  User.findByIdAndUpdate = async (id, u) => ((update = { id, ...u }), {});
  const payload = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: { client_reference_id: "u9", customer: "cus_1", subscription: "sub_1", metadata: { plan: "pro" } },
    },
  });
  const bad = await fetch(srv.base + "/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": signed(payload, undefined, "wrong"), "content-type": "application/json" },
    body: payload,
  });
  assert.equal(bad.status, 400);
  assert.equal(update, undefined);
  const ok = await fetch(srv.base + "/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": signed(payload), "content-type": "application/json" },
    body: payload,
  });
  assert.equal(ok.status, 200);
  assert.equal(update.id, "u9");
  assert.equal(update.plan, "pro");
  assert.equal(update.stripeCustomerId, "cus_1");
});

test("a deleted subscription drops the user back to starter", async () => {
  enable();
  let update;
  User.findOneAndUpdate = async (q, u) => ((update = { q, ...u }), {});
  const payload = JSON.stringify({
    type: "customer.subscription.deleted",
    data: { object: { customer: "cus_1", status: "canceled" } },
  });
  const r = await fetch(srv.base + "/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": signed(payload) },
    body: payload,
  });
  assert.equal(r.status, 200);
  assert.equal(update.plan, "starter");
});

test("checkout creates a Stripe session for a signed-in user", async () => {
  enable();
  const user = { _id: "u1", email: "a@b.co", role: "user", plan: "starter" };
  User.findById = () => ({ select: async () => user });
  let sent;
  global.fetch = async (url, init) => {
    if (String(url).startsWith("https://api.stripe.com")) {
      sent = { url, body: new URLSearchParams(init.body) };
      return { ok: true, json: async () => ({ url: "https://checkout.stripe.com/c/pay/cs_1" }) };
    }
    return realFetch(url, init);
  };
  const r = await realFetch(srv.base + "/api/billing/checkout", {
    method: "POST",
    headers: { authorization: "Bearer " + sign(user), "content-type": "application/json" },
    body: JSON.stringify({ plan: "pro", interval: "monthly" }),
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).url, "https://checkout.stripe.com/c/pay/cs_1");
  assert.equal(sent.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(sent.body.get("line_items[0][price]"), "price_pro_m");
  assert.equal(sent.body.get("client_reference_id"), "u1");
  const bad = await realFetch(srv.base + "/api/billing/checkout", {
    method: "POST",
    headers: { authorization: "Bearer " + sign(user), "content-type": "application/json" },
    body: JSON.stringify({ plan: "enterprise" }),
  });
  assert.equal(bad.status, 400);
});
