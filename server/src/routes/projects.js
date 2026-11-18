const router = require("express").Router();
const { Project } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(requireAuth);
const MAX_PROJECTS = 50;

router.get(
  "/",
  h(async (req, res) => res.json(await Project.find({ user: req.user._id }).sort({ updatedAt: -1 }).lean())),
);

router.post(
  "/",
  h(async (req, res) => {
    const name = v.text(req.body.name || "Untitled project", { min: 1, max: 80, label: "Project name" });
    if ((await Project.countDocuments({ user: req.user._id })) >= MAX_PROJECTS)
      throw httpError(400, `You can keep up to ${MAX_PROJECTS} projects.`);
    res.status(201).json(await Project.create({ user: req.user._id, name, files: [] }));
  }),
);

router.put(
  "/:id",
  h(async (req, res) => {
    const files = v.array(req.body.files, { max: 200, label: "Files" }).map((f) => ({
      path: v.text(f?.path, { min: 1, max: 200, label: "File path" }),
      content: v.text(f?.content, { max: 300000, label: "File content", trim: false }),
    }));
    const set = { files };
    if (req.body.name !== undefined) set.name = v.text(req.body.name, { min: 1, max: 80, label: "Project name" });
    const p = await Project.findOneAndUpdate(
      { _id: v.id(req.params.id, "project id"), user: req.user._id },
      { $set: set },
      { new: true },
    );
    if (!p) throw httpError(404, "Project not found.");
    res.json(p);
  }),
);

router.delete(
  "/:id",
  h(async (req, res) => {
    await Project.deleteOne({ _id: v.id(req.params.id, "project id"), user: req.user._id });
    res.json({ ok: true });
  }),
);

module.exports = router;
