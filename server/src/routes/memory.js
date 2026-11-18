const router = require("express").Router();
const { Memory } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(requireAuth);
const MAX_MEMORIES = 200;

router.get(
  "/",
  h(async (req, res) => res.json(await Memory.find({ user: req.user._id }).sort({ createdAt: -1 }).lean())),
);

router.post(
  "/",
  h(async (req, res) => {
    const text = v.text(req.body.text, { min: 1, max: 500, label: "Memory" });
    if ((await Memory.countDocuments({ user: req.user._id })) >= MAX_MEMORIES)
      throw httpError(400, `You can keep up to ${MAX_MEMORIES} memories. Delete some to add more.`);
    res.status(201).json(await Memory.create({ user: req.user._id, text }));
  }),
);

router.put(
  "/:id",
  h(async (req, res) => {
    const text = v.text(req.body.text, { min: 1, max: 500, label: "Memory" });
    const m = await Memory.findOneAndUpdate(
      { _id: v.id(req.params.id, "memory id"), user: req.user._id },
      { text },
      { new: true },
    );
    if (!m) throw httpError(404, "Memory not found.");
    res.json(m);
  }),
);

router.delete(
  "/:id",
  h(async (req, res) => {
    await Memory.deleteOne({ _id: v.id(req.params.id, "memory id"), user: req.user._id });
    res.json({ ok: true });
  }),
);

router.delete(
  "/",
  h(async (req, res) => {
    await Memory.deleteMany({ user: req.user._id });
    res.json({ ok: true });
  }),
);

module.exports = router;
