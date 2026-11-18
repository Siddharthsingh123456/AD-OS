// Lightweight local NLP used when the optional Python ML service is not configured.
const STOP = new Set(
  "a an and are as at be but by for from has have he her his i if in into is it its of on or our she so that the their them then there these they this to was we were what when which who will with you your not can do does did about also than more most other some such only very just how all any each been being over under again here out up down off".split(
    " ",
  ),
);
const POS = new Set(
  "good great excellent amazing love loved best happy fast easy useful helpful clean powerful improved success successful win works working perfect awesome nice stable reliable smooth brilliant solved fixed progress".split(
    " ",
  ),
);
const NEG = new Set(
  "bad poor terrible hate hated worst sad slow hard broken bug bugs error errors fail failed failing crash crashed confusing difficult painful awful problem problems issue issues buggy unstable blocked stuck".split(
    " ",
  ),
);

const tokenize = (s) =>
  String(s)
    .toLowerCase()
    .match(/[a-z][a-z0-9_'-]{1,}/g) || [];

function analyze(text) {
  const toks = tokenize(text);
  let pos = 0,
    neg = 0;
  const freq = new Map();
  for (const t of toks) {
    if (POS.has(t)) pos++;
    if (NEG.has(t)) neg++;
    if (!STOP.has(t) && t.length > 2) freq.set(t, (freq.get(t) || 0) + 1);
  }
  const score = pos + neg ? (pos - neg) / (pos + neg) : 0;
  const words = (String(text).match(/\S+/g) || []).length;
  return {
    source: "local",
    sentiment: {
      label: score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral",
      score: Math.round(score * 100) / 100,
    },
    keywords: [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k),
    words,
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}
module.exports = { analyze, tokenize };
