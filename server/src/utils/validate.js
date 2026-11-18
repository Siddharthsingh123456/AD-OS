// Small input validators. They throw 400s with messages that are safe to show to end users.
const { httpError } = require("./http");

const OID = /^[a-f0-9]{24}$/i;
const isId = (v) => typeof v === "string" && OID.test(v);

function id(v, label = "id") {
  if (!isId(v)) throw httpError(400, `Invalid ${label}.`);
  return v;
}

/** Validates a string. Non-strings are rejected (never coerced), which also blocks operator-injection objects. */
function text(v, { max = 1000, min = 0, label = "Value", trim = true } = {}) {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw httpError(400, `${label} must be text.`);
  const s = trim ? v.trim() : v;
  if (s.length < min)
    throw httpError(400, min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`);
  if (s.length > max) throw httpError(400, `${label} must be ${max} characters or fewer.`);
  return s;
}

function int(v, { min = 0, max = Number.MAX_SAFE_INTEGER, label = "Value", fallback } = {}) {
  if ((v === undefined || v === null || v === "") && fallback !== undefined) return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    throw httpError(400, `${label} must be a whole number between ${min} and ${max}.`);
  return n;
}

const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

function array(v, { max = 100, label = "List" } = {}) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw httpError(400, `${label} must be a list.`);
  return v.slice(0, max);
}

module.exports = { isId, id, text, int, oneOf, array };
