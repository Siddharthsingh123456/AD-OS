const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { User } = require("../models");
const { httpError, h } = require("../utils/http");
const { SESSION, parseCookies } = require("./session");

const sign = (user) => jwt.sign({ id: user._id.toString() }, env.jwtSecret(), { expiresIn: "7d" });

const requireAuth = h(async (req, res, next) => {
  // A Bearer header (scripts, API clients) wins over the browser session cookie.
  const token =
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || parseCookies(req.headers.cookie)[SESSION] || "";
  if (!token) throw httpError(401, "Please sign in.");
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret());
  } catch {
    throw httpError(401, "Session expired. Please sign in again.");
  }
  const user = await User.findById(payload.id).select("-password");
  if (!user) throw httpError(401, "Account not found.");
  // A password change invalidates every token issued before it (1s of slack for clock rounding on `iat`).
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
    throw httpError(401, "Your password was changed. Please sign in again.");
  }
  req.user = user;
  next();
});

const requireAdmin = (req, res, next) =>
  req.user?.role === "admin" ? next() : next(httpError(403, "Admin access required."));

module.exports = { sign, requireAuth, requireAdmin };
