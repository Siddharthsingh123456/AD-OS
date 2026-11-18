const env = require("../config/env");
const { httpError } = require("../utils/http");

const API = "https://api.anthropic.com/v1/messages";
const RETRYABLE = new Set([429, 500, 502, 503, 529]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const model = () => env.model();
/** A key pasted by the user in Settings takes priority over the server key. */
const keyFrom = (req) => {
  const own = req.headers["x-user-api-key"];
  return (typeof own === "string" && own.length < 400 ? own.trim() : "") || env.anthropicKey();
};

function explain(status, providerMessage) {
  if (status === 401 || status === 403)
    return httpError(401, "The AI provider rejected the API key. Check it in Settings.");
  if (status === 429) return httpError(429, "The AI provider is rate limiting requests. Wait a moment and try again.");
  if (status >= 500) return httpError(503, "The AI provider is temporarily unavailable. Try again shortly.");
  return httpError(502, providerMessage || `LLM request failed (${status})`);
}

/** POSTs to the Messages API, retrying transient failures with backoff before any bytes are streamed. */
async function request(apiKey, payload, { signal, timeoutMs = 50000, retries = 2 } = {}) {
  if (!apiKey)
    throw httpError(
      401,
      "No LLM API key configured. Set ANTHROPIC_API_KEY on the server or add your own key in Settings.",
    );
  const body = JSON.stringify({ model: model(), ...payload });
  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(timeoutMs);
    let res;
    try {
      res = await fetch(API, {
        method: "POST",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body,
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw httpError(
        503,
        e.name === "TimeoutError"
          ? "The AI provider took too long to respond. Try again."
          : "Could not reach the AI provider.",
      );
    }
    if (res.ok) return res;
    if (RETRYABLE.has(res.status) && attempt < retries) {
      const wait = Math.min(3000, Number(res.headers.get("retry-after")) * 1000 || 500 * 2 ** attempt);
      await sleep(wait);
      continue;
    }
    let msg;
    try {
      msg = (await res.json()).error?.message;
    } catch {
      /* body was not JSON */
    }
    throw explain(res.status, msg);
  }
}

/** Non-streaming completion -> string */
async function complete({ apiKey, system, messages, maxTokens = 2500 }) {
  const r = await request(apiKey, { max_tokens: maxTokens, system, messages });
  const data = await r.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Streaming completion: writes text deltas to `res`, returns the full text. */
async function stream({ apiKey, system, messages, maxTokens = 4096, webSearch, res, signal }) {
  const payload = { max_tokens: maxTokens, system, messages, stream: true };
  if (webSearch && env.webSearch()) payload.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
  const r = await request(apiKey, payload, { signal, timeoutMs: 58000 });
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  const emit = (text) => {
    full += text;
    res.write(text);
  };
  try {
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const evt = JSON.parse(line.slice(5).trim());
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") emit(evt.delta.text);
          else if (evt.type === "error") emit(`\n\n[Error: ${evt.error?.message || "stream error"}]`);
        } catch {
          /* ignore keep-alive and partial lines */
        }
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") emit("\n\n[Stream interrupted]");
  }
  return full;
}

module.exports = { complete, stream, keyFrom, model };
