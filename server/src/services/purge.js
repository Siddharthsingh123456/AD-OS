const {
  User,
  Conversation,
  Note,
  Doc,
  Chunk,
  Project,
  Memory,
  Agent,
  Usage,
  Resume,
  QuizAttempt,
} = require("../models");

const OWNED = [Conversation, Note, Doc, Chunk, Project, Memory, Usage, Resume, QuizAttempt];

/** Deletes a user and everything they own. */
module.exports = async function purgeUser(id) {
  await Promise.all(OWNED.map((M) => M.deleteMany({ user: id })));
  await Agent.deleteMany({ owner: id });
  await User.deleteOne({ _id: id });
};
