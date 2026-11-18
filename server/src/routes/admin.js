const router = require("express").Router();
const env = require("../config/env");
const { User, Conversation, Note, Doc, Chunk, Project, Memory, Agent, Usage } = require("../models");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const ml = require("../services/ml");
const purgeUser = require("../services/purge");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(requireAuth, requireAdmin);

router.get(
  "/overview",
  h(async (req, res) => {
    const since = new Date(Date.now() - 14 * 864e5);
    const [users, conversations, notes, docs, chunks, projects, agents, memories, requests, daily, topFeatures] =
      await Promise.all([
        User.countDocuments(),
        Conversation.countDocuments(),
        Note.countDocuments(),
        Doc.countDocuments(),
        Chunk.countDocuments(),
        Project.countDocuments(),
        Agent.countDocuments(),
        Memory.countDocuments(),
        Usage.countDocuments(),
        Usage.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Usage.aggregate([{ $group: { _id: "$kind", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
      ]);
    res.json({
      counts: { users, conversations, notes, docs, chunks, projects, agents, memories, requests },
      daily: daily.map((d) => ({ day: d._id, n: d.n })),
      topFeatures: topFeatures.map((d) => ({ kind: d._id, n: d.n })),
      system: {
        llm: !!env.anthropicKey(),
        model: env.model(),
        ml: ml.configured(),
        webSearch: env.webSearch(),
        githubToken: !!env.githubToken(),
        jwtSecret: env.jwtConfigured(),
        version: env.version,
        warnings: env.warnings(),
      },
    });
  }),
);

router.get(
  "/users",
  h(async (req, res) => res.json(await User.find().sort({ createdAt: -1 }).limit(500).select("-password").lean())),
);

router.patch(
  "/users/:id",
  h(async (req, res) => {
    v.id(req.params.id, "user id");
    if (!["user", "admin"].includes(req.body.role)) throw httpError(400, "Invalid role.");
    if (String(req.params.id) === String(req.user._id) && req.body.role !== "admin")
      throw httpError(400, "You cannot remove your own admin role.");
    const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("-password");
    if (!u) throw httpError(404, "User not found.");
    res.json(u);
  }),
);

router.delete(
  "/users/:id",
  h(async (req, res) => {
    v.id(req.params.id, "user id");
    if (String(req.params.id) === String(req.user._id))
      throw httpError(400, "You cannot delete your own account here.");
    await purgeUser(req.params.id);
    res.json({ ok: true });
  }),
);

module.exports = router;
