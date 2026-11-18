const cors = require("cors");
const helmet = require("helmet");
const env = require("../config/env");

// The SPA ships no inline scripts and loads nothing from third parties, so the policy can be strict.
// (style-src allows inline because React renders `style=""` attributes.)
const directives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com"],
  fontSrc: ["'self'", "data:"],
  connectSrc: ["'self'"],
  manifestSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
};

const securityHeaders = helmet({
  contentSecurityPolicy: { useDefaults: false, directives },
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

// Same-origin requests need no CORS headers. Cross-origin callers must be listed in CORS_ORIGIN (comma separated).
const corsPolicy = cors((req, cb) => {
  const allowed = env.corsOrigins();
  const origin = req.headers.origin;
  cb(null, {
    origin: !origin || allowed.includes(origin),
    exposedHeaders: ["X-Conversation-Id", "X-Sources", "X-Request-Id", "RateLimit-Remaining"],
    maxAge: 600,
  });
});

module.exports = { securityHeaders, corsPolicy, directives };
