const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { CORE } = require("../data/agents");
const { Usage } = require("../models");
const llm = require("../services/llm");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

router.use(
  requireAuth,
  rateLimit({
    name: "tasks",
    by: "user",
    windowMs: 60 * 1000,
    max: 20,
    message: "Too many AI requests. Wait a few seconds and try again.",
  }),
);

const TASKS = {
  summarize: "Summarize the text in 3-5 crisp sentences, then list 3 key takeaways as bullets.",
  keypoints: "Extract the key points as a tight bulleted list grouped by theme.",
  actions: "Extract concrete action items as a checklist with owner and deadline if mentioned. If none, say so.",
  improve:
    "Rewrite the text to be clearer, more concise and better structured while preserving meaning. Output only the rewritten text.",
  tags: "Return 3-6 short lowercase topic tags as a single comma-separated line. No other text.",
  explain_code: "Explain what this code does step by step, note complexity, pitfalls and edge cases.",
  refactor:
    "Refactor this code for readability, correctness and performance. Show the full improved code in a fenced block, then bullet the changes and why.",
  tests:
    "Write a thorough automated test suite for this code using the most common framework for the language. Cover edge cases and errors.",
  bugs: "Audit this code for bugs, security issues and bad practices. List findings by severity with line references and fixes.",
  docs: "Write clear documentation: overview, parameters/returns, usage example, and notes. Add doc comments suggestions.",
  resume_summary:
    "Write a strong 2-3 sentence professional resume summary from the details given. Quantify impact where the input allows; never invent facts. Output only the summary.",
  resume_bullets:
    "Rewrite these experience notes as 3-5 achievement-focused resume bullets starting with strong verbs, quantifying only facts present. Output only bullets, one per line, each starting with '- '.",
  ats: "Act as an ATS and recruiter. Compare the resume to the job description: give a match score out of 100, missing keywords, weak sections, and 5 prioritized edits.",
  github_review:
    "You review developer portfolios. From this GitHub profile data give: strengths, gaps, 5 actionable improvements (pinned repos, READMEs, project ideas, consistency), and a short recruiter-style impression.",
};

router.post(
  "/run",
  h(async (req, res) => {
    const { task } = req.body;
    if (typeof task !== "string" || !Object.hasOwn(TASKS, task)) throw httpError(400, "Unknown task.");
    const input = v.text(req.body.input, { min: 1, max: 60000, label: "Input", trim: false });
    if (!input.trim()) throw httpError(400, "Nothing to process.");
    const context = req.body.context ? v.text(req.body.context, { max: 300, label: "Context" }) : "";
    const output = await llm.complete({
      apiKey: llm.keyFrom(req),
      system: CORE + TASKS[task],
      messages: [{ role: "user", content: (context ? `Context: ${context}\n\n` : "") + input }],
    });
    Usage.create({ user: req.user._id, kind: "task:" + task, chars: output.length }).catch(() => {});
    res.json({ output });
  }),
);

module.exports = router;
