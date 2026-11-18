const router = require("express").Router();
const { Note } = require("../models");
const { requireAuth } = require("../middleware/auth");
const nlp = require("../services/nlp");
const ml = require("../services/ml");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(requireAuth);
const MAX_NOTES = 1000;

const fields = (b, { partial }) => {
  const out = {};
  if (!partial || b.title !== undefined)
    out.title = v.text(b.title ?? "Untitled", { max: 200, label: "Title" }) || "Untitled";
  if (!partial || b.content !== undefined)
    out.content = v.text(b.content ?? "", { max: 200000, label: "Note", trim: false });
  if (b.summary !== undefined) out.summary = v.text(b.summary, { max: 20000, label: "Summary", trim: false });
  if (b.tags !== undefined)
    out.tags = v
      .array(b.tags, { max: 10, label: "Tags" })
      .map((t) => v.text(t, { max: 40, label: "Tag" }))
      .filter(Boolean);
  return out;
};

router.get(
  "/",
  h(async (req, res) =>
    res.json(await Note.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(MAX_NOTES).lean()),
  ),
);

router.post(
  "/",
  h(async (req, res) => {
    if ((await Note.countDocuments({ user: req.user._id })) >= MAX_NOTES)
      throw httpError(400, `You can keep up to ${MAX_NOTES} notes.`);
    res.status(201).json(await Note.create({ user: req.user._id, ...fields(req.body, { partial: false }) }));
  }),
);

router.put(
  "/:id",
  h(async (req, res) => {
    const n = await Note.findOneAndUpdate(
      { _id: v.id(req.params.id, "note id"), user: req.user._id },
      { $set: fields(req.body, { partial: true }) },
      { new: true },
    );
    if (!n) throw httpError(404, "Note not found.");
    res.json(n);
  }),
);

router.delete(
  "/:id",
  h(async (req, res) => {
    await Note.deleteOne({ _id: v.id(req.params.id, "note id"), user: req.user._id });
    res.json({ ok: true });
  }),
);

// NLP analysis: transformer model via the ML service when configured, otherwise local lexicon + TF keywords.
router.post(
  "/analyze",
  h(async (req, res) => {
    const text = v.text(req.body.text, { min: 1, max: 20000, label: "Text", trim: false });
    if (!text.trim()) throw httpError(400, "Nothing to analyze.");
    res.json((await ml.analyze(text)) || nlp.analyze(text));
  }),
);

module.exports = router;
