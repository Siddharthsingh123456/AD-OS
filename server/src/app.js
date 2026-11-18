const express = require("express");
const env = require("./config/env");
const { connectDB } = require("./config/db");
const { securityHeaders, corsPolicy } = require("./middleware/security");
const requestContext = require("./middleware/requestContext");
const rateLimit = require("./middleware/rateLimit");
const csrf = require("./middleware/csrf");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const llm = require("./services/llm");
const ml = require("./services/ml");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestContext);
app.use(securityHeaders);
app.use(corsPolicy);
// Stripe signs the raw bytes, so this route must be parsed as a Buffer before express.json sees it.
app.use("/api/billing/webhook", express.raw({ type: "*/*", limit: "1mb" }));
app.use(express.json({ limit: "4mb" }));
app.use("/api", csrf);

// Cheap liveness/readiness probe. Reveals only booleans and the version, never secrets.
app.get("/api/health", async (req, res) => {
  let db = false;
  try {
    await connectDB();
    db = true;
  } catch {
    /* reported as db:false */
  }
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    db,
    llm: !!env.anthropicKey(),
    ml: ml.configured(),
    limiter: env.limiterBackend(),
    billing: env.billingEnabled(),
    demo: env.demoMode(),
    guest: env.guestLogin(),
    embeddedDb: env.embeddedDb(),
    model: llm.model(),
    version: env.version,
    uptime: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    time: new Date().toISOString(),
  });
});

// Broad safety net for the whole API; sensitive and costly routes add tighter limits of their own.
app.use(
  "/api",
  rateLimit({ name: "api", windowMs: 60 * 1000, max: 300, message: "Too many requests. Slow down a little." }),
);

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    res.status(503).json({
      error: "Database unavailable. Set MONGODB_URI (MongoDB Atlas) and allow network access, or check the API log.",
      requestId: req.id,
    });
  }
});

app.use("/api/telemetry", require("./routes/telemetry"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/billing", require("./routes/billing"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/rag", require("./routes/rag"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/quiz", require("./routes/quiz"));
app.use("/api/github", require("./routes/github"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/resume", require("./routes/resume"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/memory", require("./routes/memory"));
app.use("/api/agents", require("./routes/agents"));
app.use("/api/marketplace", require("./routes/marketplace"));

app.use("/api", notFound);
app.use(errorHandler);

module.exports = app;
