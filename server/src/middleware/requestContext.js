const crypto = require("crypto");
const env = require("../config/env");

// Gives every request an id (returned as X-Request-Id and in error bodies) and writes one JSON access-log line.
module.exports = function requestContext(req, res, next) {
  const incoming = req.headers["x-request-id"];
  req.id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  const started = Date.now();
  res.on("finish", () => {
    if (env.isTest() || req.path === "/api/health") return;
    console.log(
      JSON.stringify({
        t: new Date().toISOString(),
        id: req.id,
        method: req.method,
        path: req.originalUrl.split("?")[0],
        status: res.statusCode,
        ms: Date.now() - started,
        user: req.user ? String(req.user._id) : undefined,
      }),
    );
  });
  next();
};
