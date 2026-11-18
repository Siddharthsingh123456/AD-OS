// The signed-in user's own custom agents (create, publish, delete). Browsing and installing lives in marketplace.js.
const router = require("express").Router();
const { Agent } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(requireAuth);
const MAX_AGENTS = 50;

router.post(
  "/",
  h(async (req, res) => {
    const name = v.text(req.body.name, { min: 1, max: 60, label: "Name" });
    const system = v.text(req.body.system, { min: 1, max: 6000, label: "Instructions" });
    const tagline = v.text(req.body.tagline, { max: 120, label: "Tagline" });
    const icon = v.text(req.body.icon, { max: 8, label: "Icon" }) || "🤖";
    const category = v.text(req.body.category, { max: 40, label: "Category" }) || "Custom";
    if ((await Agent.countDocuments({ owner: req.user._id })) >= MAX_AGENTS)
      throw httpError(400, `You can keep up to ${MAX_AGENTS} agents.`);
    const a = await Agent.create({ owner: req.user._id, name, icon, tagline, system, category });
    res.status(201).json({ id: a._id });
  }),
);

router.patch(
  "/:id",
  h(async (req, res) => {
    const a = await Agent.findOneAndUpdate(
      { _id: v.id(req.params.id, "agent id"), owner: req.user._id },
      { $set: req.body.isPublic !== undefined ? { isPublic: !!req.body.isPublic } : {} },
      { new: true },
    );
    if (!a) throw httpError(404, "Agent not found.");
    res.json({ ok: true, isPublic: a.isPublic });
  }),
);

router.delete(
  "/:id",
  h(async (req, res) => {
    await Agent.deleteOne({ _id: v.id(req.params.id, "agent id"), owner: req.user._id });
    res.json({ ok: true });
  }),
);

module.exports = router;
