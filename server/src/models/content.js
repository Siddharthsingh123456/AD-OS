// Everything a user owns. Each model is keyed by `user` (or `owner` for agents) so purge and export stay trivial.
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userRef = { type: Schema.Types.ObjectId, ref: "User", index: true };
const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
const T = { timestamps: true };

const conversation = new Schema(
  {
    user: userRef,
    agent: { type: String, index: true },
    title: String,
    messages: [{ role: String, content: String, sources: [String] }],
  },
  T,
);
conversation.index({ user: 1, agent: 1, updatedAt: -1 });
conversation.index({ user: 1, updatedAt: -1 });

const memory = new Schema({ user: userRef, text: { type: String, required: true, maxlength: 500 } }, T);

const doc = new Schema(
  {
    user: userRef,
    collection_: { type: String, index: true },
    name: String,
    source: String,
    size: Number,
    text: String,
    chunks: Number,
  },
  T,
);
doc.index({ user: 1, collection_: 1, createdAt: -1 });

const chunk = new Schema({
  user: userRef,
  doc: { type: Schema.Types.ObjectId, index: true },
  collection_: String,
  name: String,
  idx: Number,
  text: String,
  embedding: { type: [Number], default: undefined },
});
chunk.index({ user: 1, collection_: 1 });

const note = new Schema(
  {
    user: userRef,
    title: { type: String, default: "Untitled", maxlength: 200 },
    content: { type: String, default: "", maxlength: 200000 },
    summary: { type: String, maxlength: 20000 },
    tags: [String],
    sentiment: String,
  },
  T,
);
note.index({ user: 1, updatedAt: -1 });

const quizAttempt = new Schema({ user: userRef, topic: String, difficulty: String, score: Number, total: Number }, T);

const resume = new Schema({ user: { ...userRef, unique: true }, data: Schema.Types.Mixed }, T);

const project = new Schema(
  { user: userRef, name: String, files: [{ path: String, content: { type: String, default: "" } }] },
  T,
);

const agent = new Schema(
  {
    owner: userRef,
    name: String,
    icon: { type: String, default: "🤖" },
    tagline: String,
    system: String,
    category: { type: String, default: "Custom" },
    isPublic: { type: Boolean, default: false, index: true },
    installs: { type: Number, default: 0 },
  },
  T,
);

// Usage rows only feed the admin charts, so they expire on their own after 90 days.
const usage = new Schema({ user: userRef, kind: String, chars: Number }, T);
usage.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = {
  Conversation: model("Conversation", conversation),
  Memory: model("Memory", memory),
  Doc: model("Doc", doc),
  Chunk: model("Chunk", chunk),
  Note: model("Note", note),
  QuizAttempt: model("QuizAttempt", quizAttempt),
  Resume: model("Resume", resume),
  Project: model("Project", project),
  Agent: model("Agent", agent),
  Usage: model("Usage", usage),
};
