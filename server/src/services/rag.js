const { Doc, Chunk } = require("../models");
const { tokenize } = require("./nlp");
const ml = require("./ml");

function chunkText(text, size = 1200, overlap = 150) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      if (nl > i + size * 0.5) end = nl;
    }
    const piece = text.slice(i, end).trim();
    if (piece) out.push(piece);
    if (end >= text.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return out;
}

/** Index a document: chunk it, (optionally) embed chunks with the ML service, store in MongoDB. */
async function indexDoc({ user, collection, name, source, text }) {
  text = String(text || "")
    // eslint-disable-next-line no-control-regex
    .replace(/\u0000/g, "")
    .slice(0, 400000);
  if (!text.trim()) throw Object.assign(new Error("Document is empty."), { status: 400 });
  const pieces = chunkText(text);
  const doc = await Doc.create({
    user,
    collection_: collection,
    name,
    source,
    size: text.length,
    text,
    chunks: pieces.length,
  });
  let vectors = null;
  if (ml.configured()) {
    vectors = [];
    for (let i = 0; i < Math.min(pieces.length, 320); i += 64) {
      const v = await ml.embed(pieces.slice(i, i + 64));
      if (!v) {
        vectors = null;
        break;
      }
      vectors.push(...v);
    }
  }
  await Chunk.insertMany(
    pieces.map((t, idx) => ({
      user,
      doc: doc._id,
      collection_: collection,
      name,
      idx,
      text: t,
      ...(vectors && vectors[idx] ? { embedding: vectors[idx] } : {}),
    })),
    { ordered: false },
  );
  return doc;
}

const cosine = (a, b) => {
  let d = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return d / (Math.sqrt(x * y) || 1);
};

/** Hybrid retrieval: BM25 keyword score + dense cosine similarity when embeddings exist. */
async function retrieve({ user, collection, docId, query, k = 6 }) {
  if (docId) {
    const d = await Doc.findOne({ _id: docId, user }).lean();
    if (d && d.size <= 60000) return { context: `Full document "${d.name}":\n\n${d.text}`, sources: [d.name] };
  }
  const filter = { user };
  if (collection) filter.collection_ = collection;
  if (docId) filter.doc = docId;
  const chunks = await Chunk.find(filter).select("name text embedding").limit(4000).lean();
  if (!chunks.length) return { context: "", sources: [] };

  const q = [...new Set(tokenize(query))];
  const N = chunks.length;
  const toks = chunks.map((c) => tokenize(c.text));
  const avg = toks.reduce((a, t) => a + t.length, 0) / N || 1;
  const df = Object.fromEntries(q.map((t) => [t, 0]));
  const tfs = toks.map((ts) => {
    const m = {};
    for (const t of ts) if (t in df) m[t] = (m[t] || 0) + 1;
    for (const t in m) df[t]++;
    return m;
  });
  let bm = chunks.map((c, i) => {
    let s = 0;
    for (const t of q) {
      const f = tfs[i][t] || 0;
      if (!f) continue;
      s +=
        (Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5)) * (f * 2.2)) /
        (f + 1.2 * (0.25 + (0.75 * toks[i].length) / avg));
    }
    return s;
  });
  const max = Math.max(...bm, 1e-9);
  bm = bm.map((s) => s / max);

  let dense = null;
  if (chunks.some((c) => c.embedding?.length)) {
    const qv = (await ml.embed([query]))?.[0];
    if (qv) dense = chunks.map((c) => (c.embedding?.length ? Math.max(0, cosine(qv, c.embedding)) : 0));
  }
  const ranked = chunks
    .map((c, i) => ({ ...c, score: dense ? 0.45 * bm[i] + 0.55 * dense[i] : bm[i] }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return {
    context: ranked.map((c) => `--- [${c.name}] ---\n${c.text}`).join("\n\n"),
    sources: [...new Set(ranked.map((c) => c.name))],
    hits: ranked.map((c) => ({ name: c.name, text: c.text, score: Math.round(c.score * 1000) / 1000 })),
  };
}
module.exports = { indexDoc, retrieve, chunkText };
