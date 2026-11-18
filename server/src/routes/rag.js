const router = require("express").Router();
const multer = require("multer");
const { Doc, Chunk } = require("../models");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { indexDoc, retrieve } = require("../services/rag");
const env = require("../config/env");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });
const COLLECTIONS = ["general", "codebase", "docs", "pdf"];
const col = (c) => (COLLECTIONS.includes(c) ? c : "general");
const MAX_DOCS_PER_USER = 500;

router.use(requireAuth);
const heavy = rateLimit({
  name: "rag-write",
  by: "user",
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: "You have indexed a lot in the last hour. Try again a little later.",
});

async function assertRoom(user, adding = 1) {
  if ((await Doc.countDocuments({ user })) + adding > MAX_DOCS_PER_USER)
    throw httpError(400, `You can keep up to ${MAX_DOCS_PER_USER} indexed sources. Delete some to add more.`);
}

/** Runs `fn` over `items` with at most `limit` in flight. */
async function pool(items, limit, fn) {
  const out = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

router.get(
  "/docs",
  h(async (req, res) => {
    res.json(
      await Doc.find({ user: req.user._id, collection_: col(req.query.collection) })
        .sort({ createdAt: -1 })
        .select("name source size chunks createdAt")
        .lean(),
    );
  }),
);

router.post(
  "/docs",
  heavy,
  h(async (req, res) => {
    const name = v.text(req.body.name, { min: 1, max: 200, label: "Name" });
    const text = v.text(req.body.text, { min: 1, max: 400000, label: "Text", trim: false });
    await assertRoom(req.user._id);
    const d = await indexDoc({ user: req.user._id, collection: col(req.body.collection), name, source: "text", text });
    res.status(201).json({ id: d._id, name: d.name, chunks: d.chunks });
  }),
);

// Batch import of already-read text files (used by the browser for multi-file uploads).
router.post(
  "/docs/batch",
  heavy,
  h(async (req, res) => {
    const files = v
      .array(req.body.files, { max: 60, label: "Files" })
      .filter((f) => f && typeof f.name === "string" && typeof f.text === "string" && f.text.trim());
    await assertRoom(req.user._id, files.length);
    let budget = 1500000;
    const accepted = files.filter((f) => (budget -= f.text.length) >= 0);
    await pool(accepted, 4, (f) =>
      indexDoc({
        user: req.user._id,
        collection: col(req.body.collection),
        name: f.name.slice(0, 200),
        source: "upload",
        text: f.text,
      }),
    );
    res.status(201).json({ added: accepted.length, skipped: files.length - accepted.length });
  }),
);

router.post(
  "/pdf",
  heavy,
  upload.single("file"),
  h(async (req, res) => {
    if (!req.file) throw httpError(400, "Attach a PDF file.");
    if (req.file.buffer.slice(0, 5).toString("latin1") !== "%PDF-") throw httpError(400, "That file is not a PDF.");
    await assertRoom(req.user._id);
    let parse;
    try {
      parse = require("pdf-parse/lib/pdf-parse.js");
    } catch {
      throw httpError(500, "PDF parser unavailable.");
    }
    let data;
    try {
      data = await parse(req.file.buffer);
    } catch {
      throw httpError(400, "Could not read this PDF (it may be encrypted or corrupted).");
    }
    if (!data.text?.trim()) throw httpError(400, "No selectable text found. Scanned PDFs need OCR first.");
    const d = await indexDoc({
      user: req.user._id,
      collection: "pdf",
      name: req.file.originalname.slice(0, 200),
      source: `pdf · ${data.numpages} pages`,
      text: data.text,
    });
    res.status(201).json({ id: d._id, name: d.name, pages: data.numpages, chunks: d.chunks });
  }),
);

// Index a GitHub repository (public, or private with a token) into the codebase collection.
const EXT =
  /\.(js|jsx|ts|tsx|mjs|cjs|py|java|go|rs|rb|php|c|cc|cpp|h|cs|swift|kt|sql|sh|json|yml|yaml|toml|md|mdx|txt|html|css|scss|vue|svelte|ipynb)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|vendor|\.next|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)/;
router.post(
  "/github",
  heavy,
  h(async (req, res) => {
    const repoInput = v.text(req.body.repo, { min: 1, max: 200, label: "Repository" });
    const m = repoInput
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .match(/^([\w.-]+)\/([\w.-]+)/);
    if (!m) throw httpError(400, "Enter a repository as owner/name.");
    const [, owner, repo] = m;
    const token =
      (typeof req.body.token === "string" && req.body.token) || req.headers["x-github-token"] || env.githubToken();
    const gh = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-developer-os",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const info = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: gh,
      signal: AbortSignal.timeout(15000),
    });
    if (!info.ok)
      throw httpError(
        info.status === 404 ? 404 : 502,
        info.status === 404
          ? "Repository not found (private repos need a token)."
          : "GitHub API error. You may have hit the rate limit: add a token in Settings.",
      );
    const branch = (await info.json()).default_branch;
    const tree = await (
      await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
        headers: gh,
        signal: AbortSignal.timeout(15000),
      })
    ).json();
    const files = (tree.tree || [])
      .filter((f) => f.type === "blob" && EXT.test(f.path) && f.size < 120000 && !SKIP.test(f.path))
      .slice(0, 80);
    await assertRoom(req.user._id, files.length);

    let total = 0;
    const fetched = await pool(files, 8, async (f) => {
      const r = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(f.path)}?ref=${branch}`,
        { headers: { ...gh, Accept: "application/vnd.github.raw+json" }, signal: AbortSignal.timeout(15000) },
      ).catch(() => null);
      return r?.ok ? { path: f.path, text: await r.text() } : null;
    });
    const keep = fetched.filter((f) => f && f.text.trim() && (total += f.text.length) <= 900000);
    await pool(keep, 4, (f) =>
      indexDoc({
        user: req.user._id,
        collection: "codebase",
        name: `${repo}/${f.path}`,
        source: "github",
        text: f.text,
      }),
    );
    res.status(201).json({ added: keep.length, repo: `${owner}/${repo}`, branch });
  }),
);

router.delete(
  "/docs/:id",
  h(async (req, res) => {
    const id = v.id(req.params.id, "document id");
    await Promise.all([
      Doc.deleteOne({ _id: id, user: req.user._id }),
      Chunk.deleteMany({ doc: id, user: req.user._id }),
    ]);
    res.json({ ok: true });
  }),
);

router.post(
  "/search",
  h(async (req, res) => {
    const query = v.text(req.body.query, { min: 1, max: 500, label: "Search" });
    const r = await retrieve({
      user: req.user._id,
      collection: req.body.collection ? col(req.body.collection) : undefined,
      query,
      k: 8,
    });
    res.json({ hits: r.hits || [] });
  }),
);

module.exports = router;
