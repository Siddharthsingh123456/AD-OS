// Lightweight error reporting. Every report is one structured log line; set ERROR_WEBHOOK_URL (Slack, Discord or any
// endpoint that accepts JSON) to also receive it. Reports are throttled so an error storm cannot flood the webhook.
const env = require("../config/env");

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;
let windowStart = 0;
let sent = 0;

function report(kind, data = {}) {
  const event = { t: new Date().toISOString(), kind, version: env.version, ...data };
  if (!env.isTest()) console.error("[monitor] " + JSON.stringify(event));
  const url = env.errorWebhook();
  if (!url) return false;
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) ((windowStart = now), (sent = 0));
  if (++sent > MAX_PER_WINDOW) return false;
  const text = `[${kind}] ${data.error || data.message || "event"}${data.path ? " " + data.path : ""}`.slice(0, 500);
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text, ...event }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
  return true;
}

module.exports = { report };
