const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { User, Conversation, Note, Doc, Project, Memory, Resume, QuizAttempt } = require("../models");
const { sign, requireAuth } = require("../middleware/auth");
const { setSession, clearSession, ensureCsrf } = require("../middleware/session");
const rateLimit = require("../middleware/rateLimit");
const purgeUser = require("../services/purge");
const env = require("../config/env");
const { seedDemoUser, ensureGuestUser, isDemoUser, DEMO_EMAIL, GUEST_EMAIL } = require("../services/seed");
const { h, httpError } = require("../utils/http");
const v = require("../utils/validate");

const COST = 11;
// Compared against when the email is unknown, so "no such user" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", COST);

const pub = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  plan: u.plan || "starter",
  createdAt: u.createdAt,
});
// Browsers get an httpOnly session cookie. Scripts can ask for the raw token too with ?token=1 (sent as a Bearer header).
const startSession = (req, res, user, status = 200) => {
  const token = sign(user);
  setSession(res, token);
  res.status(status).json({ user: pub(user), ...(req.query.token === "1" ? { token } : {}) });
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  "/register",
  rateLimit({ max: 10, message: "Too many sign-up attempts. Try again later." }),
  h(async (req, res) => {
    const name = v.text(req.body.name, { min: 1, max: 80, label: "Name" });
    const email = v.text(req.body.email, { max: 254, label: "Email" }).toLowerCase();
    const password = v.text(req.body.password, { max: 200, label: "Password", trim: false });
    if (!EMAIL.test(email)) throw httpError(400, "Enter a valid email address.");
    if (password.length < 8) throw httpError(400, "Password must be at least 8 characters.");
    if (await User.exists({ email })) throw httpError(409, "An account with this email already exists.");
    // The shared guest account never counts: the first *real* account on a deployment is still the admin.
    const first = (await User.countDocuments({ email: { $ne: GUEST_EMAIL } })) === 0;
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, COST),
      role: first ? "admin" : "user",
    });
    startSession(req, res, user, 201);
  }),
);

router.post(
  "/login",
  rateLimit({ max: 15 }),
  h(async (req, res) => {
    const email = v.text(req.body.email, { min: 1, max: 254, label: "Email" }).toLowerCase();
    const password = v.text(req.body.password, { min: 1, max: 200, label: "Password", trim: false });
    const user = await User.findOne({ email });
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) throw httpError(401, "Incorrect email or password.");
    startSession(req, res, user);
  }),
);

// One-click demo session. Only exists when DEMO_MODE=true. The shared demo account cannot change its password or be deleted.
router.post(
  "/demo",
  rateLimit({ name: "demo", windowMs: 60 * 60 * 1000, max: 30, message: "Too many demo sessions. Try again later." }),
  h(async (req, res) => {
    if (!env.demoMode()) throw httpError(404, "Not found");
    const user = (await User.findOne({ email: DEMO_EMAIL })) || (await seedDemoUser());
    startSession(req, res, user);
  }),
);

// "Skip for now": a real session on the shared guest account, so every page works without registering.
router.post(
  "/guest",
  rateLimit({ name: "guest", windowMs: 60 * 60 * 1000, max: 60, message: "Too many guest sessions. Try again later." }),
  h(async (req, res) => {
    if (!env.guestLogin()) throw httpError(404, "Not found");
    startSession(req, res, await ensureGuestUser());
  }),
);

router.get("/me", requireAuth, (req, res) => {
  ensureCsrf(req, res);
  res.json({ user: pub(req.user) });
});

router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get(
  "/stats",
  requireAuth,
  h(async (req, res) => {
    const user = req.user._id;
    const [chats, notes, docs, projects, memories] = await Promise.all([
      Conversation.countDocuments({ user }),
      Note.countDocuments({ user }),
      Doc.countDocuments({ user }),
      Project.countDocuments({ user }),
      Memory.countDocuments({ user }),
    ]);
    res.json({ chats, notes, docs, projects, memories });
  }),
);

// Changing the password signs out every other device, and returns a fresh token for this one.
router.post(
  "/password",
  requireAuth,
  rateLimit({ max: 10 }),
  h(async (req, res) => {
    if (isDemoUser(req.user))
      throw httpError(
        403,
        "This shared account is read-only for security settings. Create your own account to change it.",
      );
    const next = v.text(req.body.next, { max: 200, label: "New password", trim: false });
    if (next.length < 8) throw httpError(400, "New password must be at least 8 characters.");
    const user = await User.findById(req.user._id);
    if (!(await bcrypt.compare(v.text(req.body.current, { max: 200, trim: false }), user.password)))
      throw httpError(400, "Current password is incorrect.");
    user.password = await bcrypt.hash(next, COST);
    user.passwordChangedAt = new Date();
    await user.save();
    const token = sign(user);
    setSession(res, token);
    res.json({ ok: true, ...(req.query.token === "1" ? { token } : {}) });
  }),
);

// Download everything this account owns as JSON (conversation history, notes, memory, projects, resume, quiz scores).
router.get(
  "/export",
  requireAuth,
  rateLimit({ max: 5, windowMs: 60 * 60 * 1000, message: "You can export your data 5 times per hour." }),
  h(async (req, res) => {
    const user = req.user._id;
    const [conversations, notes, memories, projects, resume, quizzes, docs] = await Promise.all([
      Conversation.find({ user }).lean(),
      Note.find({ user }).lean(),
      Memory.find({ user }).lean(),
      Project.find({ user }).lean(),
      Resume.findOne({ user }).lean(),
      QuizAttempt.find({ user }).lean(),
      Doc.find({ user }).select("-text").lean(),
    ]);
    res.setHeader("Content-Disposition", 'attachment; filename="ai-developer-os-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: pub(req.user),
      conversations,
      notes,
      memories,
      projects,
      resume: resume?.data || null,
      quizAttempts: quizzes,
      indexedSources: docs,
    });
  }),
);

// Self-service account deletion: removes the account and everything it owns.
router.post(
  "/delete-account",
  requireAuth,
  rateLimit({ max: 5 }),
  h(async (req, res) => {
    if (isDemoUser(req.user)) throw httpError(403, "This shared account cannot be deleted.");
    const user = await User.findById(req.user._id);
    if (!(await bcrypt.compare(v.text(req.body.password, { max: 200, trim: false }), user.password)))
      throw httpError(400, "Password is incorrect.");
    if (user.role === "admin" && (await User.countDocuments({ role: "admin" })) <= 1) {
      throw httpError(400, "You are the only admin. Promote another user before deleting this account.");
    }
    await purgeUser(user._id);
    clearSession(res);
    res.json({ ok: true });
  }),
);

module.exports = router;
