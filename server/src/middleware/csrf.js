const crypto = require("crypto");
const env = require("../config/env");
const { SESSION, CSRF, parseCookies } = require("./session");

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

/**
 * Cookie-authenticated, state-changing requests must prove they came from our own page:
 *   1. a same-site Origin (when the browser sends one), and
 *   2. an `x-csrf-token` header equal to the readable CSRF cookie.
 * Requests that carry an Authorization header are not affected (browsers never attach that header by themselves).
 */
module.exports = function csrf(req, res, next) {
  if (SAFE.has(req.method) || req.headers.authorization) return next();
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies[SESSION]) return next();

  const origin = req.headers.origin;
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host;
    } catch {
      /* treated as foreign below */
    }
    if (host !== req.headers.host && !env.corsOrigins().includes(origin)) {
      return res.status(403).json({ error: "Cross-site request blocked.", requestId: req.id });
    }
  }
  if (!same(req.headers["x-csrf-token"] || "", cookies[CSRF] || "")) {
    return res.status(403).json({ error: "Security check failed. Reload the page and try again.", requestId: req.id });
  }
  next();
};
