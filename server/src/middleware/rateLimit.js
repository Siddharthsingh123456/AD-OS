// Rate limiter with no required dependency.
// Default: in-memory and per instance (every warm serverless instance counts separately, which still blunts brute force
// and runaway scripts). Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for one strict, shared counter.
// If Redis is unreachable the limiter fails open to the in-memory counter instead of taking the API down.
const env = require("../config/env");

const clientIp = (req) =>
  String(req.headers["x-forwarded-for"] || req.ip || "")
    .split(",")[0]
    .trim() || "unknown";

function memoryStore() {
  const hits = new Map();
  return {
    hit(key, windowMs) {
      const now = Date.now();
      let e = hits.get(key);
      if (!e || e.reset < now) e = { n: 0, reset: now + windowMs };
      e.n += 1;
      hits.set(key, e);
      if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return { n: e.n, reset: e.reset };
    },
  };
}

/** One round trip: INCR, set the expiry only on the first hit, read the remaining TTL. */
async function redisHit(key, windowMs) {
  const res = await fetch(env.upstashUrl() + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.upstashToken(), "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", "rl:" + key],
      ["PEXPIRE", "rl:" + key, String(windowMs), "NX"],
      ["PTTL", "rl:" + key],
    ]),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error("rate limit store returned " + res.status);
  const out = await res.json();
  const n = Number(out?.[0]?.result);
  const ttl = Number(out?.[2]?.result);
  if (!Number.isFinite(n)) throw new Error("unexpected rate limit store reply");
  return { n, reset: Date.now() + (ttl > 0 ? ttl : windowMs) };
}

/**
 * @param {object} o
 * @param {number} [o.windowMs]  length of the counting window
 * @param {number} [o.max]       requests allowed per window and key
 * @param {string} [o.message]   error text for the 429 response
 * @param {"ip"|"user"} [o.by]   count by client IP, or by signed-in user (falls back to IP)
 * @param {string} [o.name]      namespace so two limiters never share counters
 */
module.exports = function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = "Too many attempts. Try again in a few minutes.",
  by = "ip",
  name = "",
} = {}) {
  const local = memoryStore();
  return (req, res, next) => {
    const who = by === "user" && req.user ? "u:" + req.user._id : "ip:" + clientIp(req);
    const key = name + "|" + who + (name ? "" : "|" + req.baseUrl + req.path);

    const finish = (e) => {
      const now = Date.now();
      res.set("RateLimit-Limit", String(max));
      res.set("RateLimit-Remaining", String(Math.max(0, max - e.n)));
      res.set("RateLimit-Reset", String(Math.max(0, Math.ceil((e.reset - now) / 1000))));
      if (e.n > max) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((e.reset - now) / 1000))));
        return res.status(429).json({ error: message });
      }
      next();
    };

    if (env.limiterBackend() === "redis") {
      redisHit(key, windowMs).then(finish, (err) => {
        if (!env.isTest()) console.warn("[ratelimit] redis unavailable, using memory: " + err.message);
        finish(local.hit(key, windowMs));
      });
    } else {
      finish(local.hit(key, windowMs));
    }
  };
};

module.exports.redisHit = redisHit;
