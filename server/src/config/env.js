// Single place that reads process.env. Getters (not constants) so tests and late-loaded .env files work.
const crypto = require("crypto");
const pkg = require("../../../package.json");

const flag = (v) => String(v || "").toLowerCase() === "true";
const list = (v) =>
  String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const env = {
  version: pkg.version,
  isProd: () => process.env.NODE_ENV === "production" || !!process.env.VERCEL,
  isTest: () => process.env.NODE_ENV === "test",
  port: () => Number(process.env.PORT) || 5000,
  mongoUri: () => process.env.MONGODB_URI || "",
  anthropicKey: () => process.env.ANTHROPIC_API_KEY || "",
  model: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  webSearch: () => flag(process.env.ENABLE_WEB_SEARCH),
  githubToken: () => process.env.GITHUB_TOKEN || "",
  mlUrl: () => (process.env.ML_SERVICE_URL || "").replace(/\/$/, ""),
  mlKey: () => process.env.ML_SERVICE_KEY || "",
  corsOrigins: () => list(process.env.CORS_ORIGIN),
  upstashUrl: () => (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, ""),
  upstashToken: () => process.env.UPSTASH_REDIS_REST_TOKEN || "",
  limiterBackend: () => (env.upstashUrl() && env.upstashToken() ? "redis" : "memory"),
  errorWebhook: () => process.env.ERROR_WEBHOOK_URL || "",
  stripeKey: () => process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET || "",
  stripePrice: (plan, interval) =>
    process.env[`STRIPE_PRICE_${String(plan).toUpperCase()}_${String(interval).toUpperCase()}`] || "",
  billingEnabled: () => !!(env.stripeKey() && env.stripeWebhookSecret()),
  demoMode: () => flag(process.env.DEMO_MODE),
  // "Skip for now" on the sign-in page opens a real session on a shared guest account. On by default for local use,
  // opt-in (GUEST_LOGIN=true) on a production host. GUEST_LOGIN=false turns it off everywhere.
  guestLogin: () => {
    const v = String(process.env.GUEST_LOGIN || "").toLowerCase();
    if (v === "false") return false;
    return v === "true" || !env.isProd();
  },
  // The guest sees every page, Admin included, locally. In production it is a normal user unless GUEST_ADMIN=true.
  guestAdmin: () => {
    const v = String(process.env.GUEST_ADMIN || "").toLowerCase();
    if (v === "false") return false;
    return v === "true" || !env.isProd();
  },
  // With no MONGODB_URI outside production, the API starts a small embedded MongoDB so the app works out of the box.
  embeddedDb: () =>
    !env.mongoUri() &&
    !env.isProd() &&
    !env.isTest() &&
    String(process.env.EMBEDDED_DB || "").toLowerCase() !== "false",
  dataDir: () => process.env.DATA_DIR || require("path").join(__dirname, "../../../.data"),
  publicUrl: () => (process.env.PUBLIC_URL || "").replace(/\/$/, ""),
  jwtConfigured: () => !!process.env.JWT_SECRET,
  // JWT_SECRET is strongly recommended. Without it a stable secret is derived from the DB URI so zero-config deploys still work.
  jwtSecret: () =>
    process.env.JWT_SECRET ||
    crypto
      .createHash("sha256")
      .update("aidos:" + (process.env.MONGODB_URI || "dev"))
      .digest("hex"),

  /** Human-readable problems worth surfacing at boot and on the admin dashboard. */
  warnings() {
    const w = [];
    if (!env.mongoUri() && env.embeddedDb())
      w.push("MONGODB_URI is not set: using an embedded local MongoDB stored in .data/mongo (fine for local use).");
    else if (!env.mongoUri()) w.push("MONGODB_URI is not set: the API cannot store data.");
    if (!env.anthropicKey()) w.push("ANTHROPIC_API_KEY is not set: users must paste their own key in Settings.");
    if (env.isProd() && !env.jwtConfigured())
      w.push("JWT_SECRET is not set: a secret is being derived from MONGODB_URI. Set a long random value.");
    if (env.isProd() && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 24)
      w.push("JWT_SECRET is short. Use at least 32 random characters.");
    if (env.isProd() && !env.upstashUrl())
      w.push(
        "UPSTASH_REDIS_REST_URL is not set: rate limits are per instance. Add Upstash Redis for a strict global cap.",
      );
    if (flag(process.env.STRIPE_SECRET_KEY ? "true" : "") && !env.stripeWebhookSecret())
      w.push("STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing: billing stays disabled.");
    return w;
  },
};

module.exports = env;
