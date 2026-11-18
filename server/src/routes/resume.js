const router = require("express").Router();
const { Resume } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { h, httpError } = require("../utils/http");

router.use(requireAuth);

router.get(
  "/",
  h(async (req, res) => res.json((await Resume.findOne({ user: req.user._id }).lean())?.data || null)),
);

router.put(
  "/",
  h(async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw httpError(400, "Resume data must be an object.");
    if (JSON.stringify(body).length > 200000) throw httpError(413, "That resume is too large.");
    await Resume.findOneAndUpdate({ user: req.user._id }, { data: body }, { upsert: true, new: true });
    res.json({ ok: true });
  }),
);

module.exports = router;
