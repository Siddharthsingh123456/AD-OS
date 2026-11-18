// Sample data for demos and local development. The demo account is the only account this touches.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { User, Conversation, Note, Project, Memory } = require("../models");
const purgeUser = require("./purge");

const DEMO_EMAIL = "demo@ai-developer-os.local";
const GUEST_EMAIL = "guest@ai-developer-os.local";
const env = require("../config/env");

const SAMPLE = {
  memories: [
    "I deploy on Vercel with MongoDB Atlas",
    "Prefer TypeScript, named exports and small pure functions",
    "My API runs on Node 20 behind Express 4",
  ],
  notes: [
    {
      title: "Q3 report summary",
      content:
        "Revenue grew 12% quarter over quarter. Churn fell to 2.1%. Main risk: support backlog in the EU region.",
      tags: ["finance", "report"],
    },
    {
      title: "Mongo cold start",
      content: "Cold starts exceed 10s because the client reconnects on every invocation. Cache it on global.",
      tags: ["backend", "performance"],
    },
  ],
  project: {
    name: "api-service",
    files: [
      { path: "index.js", content: 'const app = require("./app");\napp.listen(3000);\n' },
      {
        path: "app.js",
        content:
          'const express = require("express");\nconst app = express();\napp.get("/health", (_req, res) => res.json({ ok: true }));\nmodule.exports = app;\n',
      },
    ],
  },
  conversation: {
    agent: "debugging",
    title: "Why is my Mongo cold start slow?",
    messages: [
      { role: "user", content: "Why does my cold start exceed 10s on Vercel?" },
      {
        role: "assistant",
        content:
          "Your connection is opened on every invocation, so each cold start pays for a fresh TLS handshake to Atlas. Cache the client on `global` so warm lambdas reuse it. Since you deploy on Vercel with MongoDB Atlas, this is the first fix to try.",
        sources: ["vercel.json", "api/index.js"],
      },
    ],
  },
};

/** Creates (or resets) the demo account with sample content. Returns the user document. */
async function seedDemoUser() {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) await purgeUser(existing._id);
  // Nobody ever signs in with this password: demo sessions are issued by POST /api/auth/demo.
  const password = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const user = await User.create({ name: "Demo User", email: DEMO_EMAIL, password, role: "user" });
  const owner = { user: user._id };
  await Promise.all([
    Memory.insertMany(SAMPLE.memories.map((text) => ({ ...owner, text }))),
    Note.insertMany(SAMPLE.notes.map((n) => ({ ...owner, ...n }))),
    Project.create({ ...owner, ...SAMPLE.project }),
    Conversation.create({ ...owner, ...SAMPLE.conversation }),
  ]);
  return user;
}

/** The shared account behind "Skip for now". Created once with sample content, then left alone so work persists. */
async function ensureGuestUser() {
  const role = env.guestAdmin() ? "admin" : "user";
  let user = await User.findOne({ email: GUEST_EMAIL });
  if (user) {
    if (user.role !== role) {
      user.role = role;
      await user.save();
    }
    return user;
  }
  const password = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  user = await User.create({ name: "Guest", email: GUEST_EMAIL, password, role });
  const owner = { user: user._id };
  await Promise.all([
    Memory.insertMany(SAMPLE.memories.map((text) => ({ ...owner, text }))),
    Note.insertMany(SAMPLE.notes.map((n) => ({ ...owner, ...n }))),
    Project.create({ ...owner, ...SAMPLE.project }),
    Conversation.create({ ...owner, ...SAMPLE.conversation }),
  ]);
  return user;
}

// Shared accounts (demo and guest) cannot change their password or be deleted by whoever happens to be using them.
const isDemoUser = (u) => !!u && (u.email === DEMO_EMAIL || u.email === GUEST_EMAIL);

module.exports = { seedDemoUser, ensureGuestUser, isDemoUser, DEMO_EMAIL, GUEST_EMAIL, SAMPLE };
