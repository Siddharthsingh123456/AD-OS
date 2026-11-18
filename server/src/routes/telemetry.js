const router = require("express").Router();
const rateLimit = require("../middleware/rateLimit");
const monitor = require("../services/monitor");

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

// The React error boundary reports crashes here. Public (crashes can happen before sign-in), tightly limited and bounded.
router.post("/client-error", rateLimit({ name: "telemetry", windowMs: 60 * 1000, max: 10 }), (req, res) => {
  const b = req.body && typeof req.body === "object" ? req.body : {};
  monitor.report("client-error", {
    id: req.id,
    error: clip(b.message, 300),
    stack: clip(b.stack, 1200),
    component: clip(b.component, 600),
    path: clip(b.url, 300),
    ua: clip(req.headers["user-agent"], 200),
  });
  res.status(204).end();
});

module.exports = router;
