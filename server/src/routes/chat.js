const router = require("express").Router();
const { Conversation, Memory, Agent, Usage } = require("../models");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { BUILTIN, builtinList } = require("../data/agents");
const { retrieve } = require("../services/rag");
const llm = require("../services/llm");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

// Public, read-only list of the built-in agents (names, icons, input fields; never system prompts). It lets the
// signed-out "Skip for now" preview draw the real agent pages. Everything below this line still requires a session.
router.get("/catalog", (req, res) => res.json({ builtin: builtinList() }));

router.use(requireAuth);
const aiLimit = rateLimit({
  name: "chat",
  by: "user",
  windowMs: 60 * 1000,
  max: 30,
  message: "You are sending messages very quickly. Wait a few seconds and try again.",
});

// Agent catalogue: built-ins (system prompts are never exposed) plus the user's own agents.
router.get(
  "/agents",
  h(async (req, res) => {
    const mine = await Agent.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({
      builtin: builtinList(),
      custom: mine.map((a) => ({
        id: String(a._id),
        name: a.name,
        icon: a.icon,
        tagline: a.tagline,
        category: a.category,
        isPublic: a.isPublic,
        custom: true,
        system: a.system,
      })),
    });
  }),
);

async function resolveAgent(id, userId) {
  if (BUILTIN[id]) return BUILTIN[id];
  if (!v.isId(id)) return null;
  return Agent.findOne({ _id: id, $or: [{ owner: userId }, { isPublic: true }] }).lean();
}

// Latest conversations across every agent: powers "continue where you left off" on the dashboard.
router.get(
  "/recent",
  h(async (req, res) => {
    res.json(
      await Conversation.find({ user: req.user._id })
        .sort({ updatedAt: -1 })
        .limit(6)
        .select("title agent updatedAt")
        .lean(),
    );
  }),
);

router.get(
  "/conversations",
  h(async (req, res) => {
    const key = v.text(req.query.key, { max: 80, label: "Conversation key" });
    res.json(
      await Conversation.find({ user: req.user._id, agent: key })
        .sort({ updatedAt: -1 })
        .limit(40)
        .select("title updatedAt")
        .lean(),
    );
  }),
);

router.get(
  "/conversations/:id",
  h(async (req, res) => {
    const c = await Conversation.findOne({ _id: v.id(req.params.id), user: req.user._id }).lean();
    if (!c) throw httpError(404, "Conversation not found.");
    res.json(c);
  }),
);

router.patch(
  "/conversations/:id",
  h(async (req, res) => {
    const title = v.text(req.body.title, { min: 1, max: 80, label: "Title" });
    const c = await Conversation.findOneAndUpdate(
      { _id: v.id(req.params.id), user: req.user._id },
      { title },
      { new: true },
    ).select("title");
    if (!c) throw httpError(404, "Conversation not found.");
    res.json(c);
  }),
);

router.delete(
  "/conversations/:id",
  h(async (req, res) => {
    await Conversation.deleteOne({ _id: v.id(req.params.id), user: req.user._id });
    res.json({ ok: true });
  }),
);

router.post(
  "/stream",
  aiLimit,
  h(async (req, res) => {
    const { agent: agentId, conversationId, collection, docId, regenerate } = req.body;
    const message = v.text(req.body.message, { min: 1, max: 20000, label: "Message" });
    const key = v.text(req.body.key || agentId, { max: 80, label: "Conversation key" });
    const fields =
      req.body.fields && typeof req.body.fields === "object" && !Array.isArray(req.body.fields) ? req.body.fields : {};
    const agent = await resolveAgent(typeof agentId === "string" ? agentId : "", req.user._id);
    if (!agent) throw httpError(404, "Agent not found.");

    let convo = v.isId(conversationId) ? await Conversation.findOne({ _id: conversationId, user: req.user._id }) : null;
    if (!convo) convo = new Conversation({ user: req.user._id, agent: key, title: message.slice(0, 60), messages: [] });
    // "Regenerate": drop the last answer and its question, then ask the same question again.
    if (regenerate && convo.messages.length >= 2 && convo.messages[convo.messages.length - 1].role === "assistant")
      convo.messages.splice(-2, 2);

    let system = agent.system;
    const ctx = Object.entries(fields)
      .filter(([, val]) => typeof val === "string" && val.trim())
      .slice(0, 8)
      .map(([k, val]) => `${String(k).slice(0, 60)}: ${val.slice(0, 4000)}`);
    if (ctx.length) system += "\n\nContext provided by the user:\n" + ctx.join("\n");
    const mem = await Memory.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    if (mem.length)
      system +=
        "\n\nPersistent memory (facts the user asked you to remember):\n" + mem.map((m) => "- " + m.text).join("\n");

    let sources = [];
    if (collection || docId) {
      const r = await retrieve({
        user: req.user._id,
        collection: typeof collection === "string" ? collection : undefined,
        docId: v.isId(docId) ? docId : undefined,
        query: message,
      });
      sources = r.sources;
      system += r.context
        ? `\n\nRetrieved context (cite source names in [brackets]):\n${r.context}`
        : "\n\nNo indexed material matched this question. Say so, and only offer general guidance clearly labeled as such.";
    }

    const history = convo.messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
    while (history.length && history[0].role !== "user") history.shift();
    history.push({ role: "user", content: message });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("X-Conversation-Id", String(convo._id));
    res.setHeader("X-Sources", encodeURIComponent(JSON.stringify(sources)));

    const ctrl = new AbortController();
    res.on("close", () => ctrl.abort());
    const full = await llm.stream({
      apiKey: llm.keyFrom(req),
      system,
      messages: history,
      webSearch: agent.webSearch,
      res,
      signal: ctrl.signal,
    });

    convo.messages.push({ role: "user", content: message }, { role: "assistant", content: full, sources });
    await convo.save();
    Usage.create({ user: req.user._id, kind: "chat:" + key.split(":")[0], chars: full.length }).catch(() => {});
    res.end();
  }),
);

module.exports = router;
