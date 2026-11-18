// Cookie helpers for browser sessions: an httpOnly session cookie (unreadable by scripts) plus a readable CSRF cookie
// that the SPA echoes back in the `x-csrf-token` header (double-submit pattern).
const crypto = require("crypto");
const env = require("../config/env");

const SESSION = "aidos_session";
const CSRF = "aidos_csrf";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* ignore malformed cookie values */
    }
  }
  return out;
}

const base = () => ({ sameSite: "lax", secure: env.isProd(), path: "/", maxAge: MAX_AGE });

function ensureCsrf(req, res) {
  const have = parseCookies(req.headers.cookie)[CSRF];
  if (have) return have;
  const t = crypto.randomBytes(24).toString("hex");
  res.cookie(CSRF, t, { ...base(), httpOnly: false });
  return t;
}

function setSession(res, token) {
  res.cookie(SESSION, token, { ...base(), httpOnly: true });
  res.cookie(CSRF, crypto.randomBytes(24).toString("hex"), { ...base(), httpOnly: false });
}

function clearSession(res) {
  const o = { sameSite: "lax", secure: env.isProd(), path: "/" };
  res.clearCookie(SESSION, { ...o, httpOnly: true });
  res.clearCookie(CSRF, { ...o, httpOnly: false });
}

module.exports = { SESSION, CSRF, parseCookies, ensureCsrf, setSession, clearSession };
