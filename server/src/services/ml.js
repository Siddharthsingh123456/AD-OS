// Client for the optional Python ML service (ml-service/): sentence embeddings + transformer NLP.
// Every call degrades to `null` so the app keeps working (BM25 + local NLP) when the service is down.
const env = require("../config/env");

const configured = () => !!env.mlUrl();

async function post(path, body, timeout = 20000) {
  if (!configured()) return null;
  try {
    const r = await fetch(env.mlUrl() + path, {
      method: "POST",
      headers: { "content-type": "application/json", ...(env.mlKey() ? { "x-api-key": env.mlKey() } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const embed = async (texts) => (await post("/embed", { texts }))?.embeddings || null;
const analyze = async (text) => post("/analyze", { text }, 15000);

module.exports = { configured, embed, analyze };
