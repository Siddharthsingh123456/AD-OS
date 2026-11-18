const router = require("express").Router();
const { Agent } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { TEMPLATES } = require("../data/agents");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(requireAuth);

router.get(
  "/",
  h(async (req, res) => {
    const community = await Agent.find({ isPublic: true })
      .sort({ installs: -1 })
      .limit(60)
      .populate("owner", "name")
      .lean();
    res.json({
      // Template system prompts stay server-side until a user installs one.
      templates: TEMPLATES.map(({ system, ...t }) => t), // eslint-disable-line no-unused-vars
      community: community.map((a) => ({
        id: String(a._id),
        name: a.name,
        icon: a.icon,
        tagline: a.tagline,
        category: a.category,
        installs: a.installs,
        author: a.owner?.name || "Community",
        mine: String(a.owner?._id) === String(req.user._id),
      })),
    });
  }),
);

router.post(
  "/install",
  h(async (req, res) => {
    const { id } = req.body;
    let src = TEMPLATES.find((t) => t.id === id);
    if (!src && v.isId(id)) {
      src = await Agent.findOne({ _id: id, isPublic: true });
      if (src) await Agent.updateOne({ _id: id }, { $inc: { installs: 1 } });
    }
    if (!src) throw httpError(404, "Agent not found.");
    if ((await Agent.countDocuments({ owner: req.user._id })) >= 50)
      throw httpError(400, "You can keep up to 50 agents.");
    const a = await Agent.create({
      owner: req.user._id,
      name: src.name,
      icon: src.icon,
      tagline: src.tagline,
      system: src.system,
      category: src.category,
      isPublic: false,
    });
    res.status(201).json({ id: a._id });
  }),
);

module.exports = router;
