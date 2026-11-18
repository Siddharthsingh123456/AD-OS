const router = require("express").Router();
const { QuizAttempt } = require("../models");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const llm = require("../services/llm");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(requireAuth);

router.post(
  "/generate",
  rateLimit({
    name: "quiz",
    by: "user",
    windowMs: 60 * 1000,
    max: 8,
    message: "Slow down: you can generate 8 quizzes per minute.",
  }),
  h(async (req, res) => {
    const topic = v.text(req.body.topic, { min: 1, max: 200, label: "Topic" });
    const difficulty = v.oneOf(req.body.difficulty, ["easy", "medium", "hard"], "medium");
    const count = v.int(req.body.count, { min: 3, max: 10, fallback: 5, label: "Question count" });
    const text = await llm.complete({
      apiKey: llm.keyFrom(req),
      maxTokens: 3500,
      system:
        "You write high-quality technical multiple-choice quizzes. Respond with ONLY a JSON array, no prose or markdown fences.",
      messages: [
        {
          role: "user",
          content: `Create ${count} ${difficulty} multiple-choice questions about: ${topic}. Each item: {"q": string, "options": [4 strings], "answer": index 0-3, "explanation": string}. Exactly one correct option; plausible distractors.`,
        },
      ],
    });
    let arr;
    try {
      arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    } catch {
      throw httpError(502, "The model returned an invalid quiz. Try again.");
    }
    const questions = (Array.isArray(arr) ? arr : [])
      .filter(
        (x) =>
          x?.q &&
          Array.isArray(x.options) &&
          x.options.length === 4 &&
          Number.isInteger(x.answer) &&
          x.answer >= 0 &&
          x.answer < 4,
      )
      .slice(0, count);
    if (!questions.length) throw httpError(502, "The model returned an invalid quiz. Try again.");
    res.json({ topic, difficulty, questions });
  }),
);

router.post(
  "/attempts",
  h(async (req, res) => {
    const total = v.int(req.body.total, { min: 1, max: 20, label: "Total" });
    const score = v.int(req.body.score, { min: 0, max: total, label: "Score" });
    const topic = v.text(req.body.topic, { min: 1, max: 200, label: "Topic" });
    const difficulty = v.oneOf(req.body.difficulty, ["easy", "medium", "hard"], "medium");
    res.status(201).json(await QuizAttempt.create({ user: req.user._id, topic, difficulty, score, total }));
  }),
);

router.get(
  "/attempts",
  h(async (req, res) =>
    res.json(await QuizAttempt.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean()),
  ),
);

module.exports = router;
