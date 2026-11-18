// Optional Stripe billing (Checkout + customer portal + webhook), implemented with plain fetch so no SDK is needed.
// Everything is disabled until STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set. Plans are recorded on the user;
// usage quotas are not yet tied to the plan.
const crypto = require("crypto");
const router = require("express").Router();
const env = require("../config/env");
const { User } = require("../models");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { h, httpError } = require("../utils/http");

const PLANS = ["pro", "team"];
const INTERVALS = ["monthly", "yearly"];

async function stripe(path, params) {
  const res = await fetch("https://api.stripe.com/v1" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + env.stripeKey(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(502, body?.error?.message || "Billing provider error.");
  return body;
}

/** Verifies a `Stripe-Signature` header (t=…,v1=…) against the raw request body. */
function verifySignature(raw, header, secret, toleranceSec = 300, now = Date.now()) {
  const parts = Object.fromEntries(
    String(header || "")
      .split(",")
      .map((p) => p.split("=")),
  );
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.`).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(parts.v1));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const origin = (req) => env.publicUrl() || `${req.protocol}://${req.get("host")}`;

router.get("/status", requireAuth, (req, res) =>
  res.json({ enabled: env.billingEnabled(), plan: req.user.plan || "starter", status: req.user.planStatus || "" }),
);

router.post(
  "/checkout",
  requireAuth,
  rateLimit({ name: "checkout", by: "user", windowMs: 60 * 60 * 1000, max: 20 }),
  h(async (req, res) => {
    if (!env.billingEnabled()) throw httpError(503, "Billing is not configured on this deployment.");
    const plan = String(req.body.plan || "");
    const interval = String(req.body.interval || "monthly");
    if (!PLANS.includes(plan) || !INTERVALS.includes(interval)) throw httpError(400, "Choose a valid plan.");
    const price = env.stripePrice(plan, interval);
    if (!price) throw httpError(503, "That plan has no price configured.");
    const params = {
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: `${origin(req)}/app/settings?billing=success`,
      cancel_url: `${origin(req)}/pricing`,
      client_reference_id: String(req.user._id),
      "metadata[user]": String(req.user._id),
      "metadata[plan]": plan,
      "subscription_data[metadata][user]": String(req.user._id),
      "subscription_data[metadata][plan]": plan,
    };
    if (req.user.stripeCustomerId) params.customer = req.user.stripeCustomerId;
    else params.customer_email = req.user.email;
    const session = await stripe("/checkout/sessions", params);
    res.json({ url: session.url });
  }),
);

router.post(
  "/portal",
  requireAuth,
  rateLimit({ name: "portal", by: "user", windowMs: 60 * 60 * 1000, max: 20 }),
  h(async (req, res) => {
    if (!env.billingEnabled()) throw httpError(503, "Billing is not configured on this deployment.");
    if (!req.user.stripeCustomerId) throw httpError(400, "No subscription to manage yet.");
    const session = await stripe("/billing_portal/sessions", {
      customer: req.user.stripeCustomerId,
      return_url: `${origin(req)}/app/settings`,
    });
    res.json({ url: session.url });
  }),
);

/** Applies a verified Stripe event to the matching user. Unknown events are ignored. */
async function applyEvent(event) {
  const obj = event.data?.object || {};
  if (event.type === "checkout.session.completed") {
    const id = obj.client_reference_id || obj.metadata?.user;
    const plan = PLANS.includes(obj.metadata?.plan) ? obj.metadata.plan : null;
    if (!id || !plan) return;
    await User.findByIdAndUpdate(id, {
      plan,
      planStatus: "active",
      stripeCustomerId: obj.customer || "",
      stripeSubscriptionId: obj.subscription || "",
    });
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const ended = event.type === "customer.subscription.deleted" || ["canceled", "unpaid"].includes(obj.status);
    const plan = PLANS.includes(obj.metadata?.plan) ? obj.metadata.plan : undefined;
    const update = ended ? { plan: "starter", planStatus: obj.status || "canceled" } : { planStatus: obj.status };
    if (!ended && plan) update.plan = plan;
    await User.findOneAndUpdate({ stripeCustomerId: obj.customer }, update);
  }
}

// Receives the raw body (see app.js). Stripe retries non-2xx replies, so unknown events still answer 200.
router.post(
  "/webhook",
  h(async (req, res) => {
    if (!env.billingEnabled()) throw httpError(503, "Billing is not configured.");
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!verifySignature(raw, req.headers["stripe-signature"], env.stripeWebhookSecret()))
      throw httpError(400, "Invalid signature.");
    let event;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      throw httpError(400, "Invalid payload.");
    }
    await applyEvent(event);
    res.json({ received: true });
  }),
);

module.exports = router;
module.exports.verifySignature = verifySignature;
