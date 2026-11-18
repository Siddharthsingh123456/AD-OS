const test = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "test";
const { chunkText } = require("../src/services/rag");
const nlp = require("../src/services/nlp");
const { BUILTIN, builtinList, TEMPLATES } = require("../src/data/agents");

test("chunkText splits long text with overlap and never loses content", () => {
  const text = Array.from({ length: 400 }, (_, i) => `Line ${i} has some words in it.`).join("\n");
  const chunks = chunkText(text, 1200, 150);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every((c) => c.length <= 1200));
  assert.ok(chunks[0].startsWith("Line 0"));
  assert.ok(chunks.at(-1).includes("Line 399"));
});

test("chunkText handles short and empty input", () => {
  assert.deepEqual(chunkText("hello"), ["hello"]);
  assert.deepEqual(chunkText("   "), []);
});

test("nlp.analyze scores sentiment and extracts keywords", () => {
  const good = nlp.analyze("This is great, fast and reliable. Works perfectly and the team loved it.");
  assert.equal(good.sentiment.label, "positive");
  const bad = nlp.analyze("Terrible crash, broken build, and confusing errors everywhere.");
  assert.equal(bad.sentiment.label, "negative");
  const keywords = nlp.analyze("mongodb indexing mongodb queries mongodb performance").keywords;
  assert.equal(keywords[0], "mongodb");
  assert.ok(nlp.analyze("one two three").readingMinutes >= 1);
});

test("the public agent catalogue never exposes system prompts", () => {
  const list = builtinList();
  assert.equal(list.length, Object.keys(BUILTIN).length);
  for (const a of list) {
    assert.ok(a.name && a.icon && a.tagline, `${a.id} has display fields`);
    assert.equal("system" in a, false, `${a.id} leaks its system prompt`);
  }
});

test("every built-in agent and template has instructions", () => {
  for (const [id, a] of Object.entries(BUILTIN)) assert.ok(a.system.length > 40, id);
  assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, TEMPLATES.length);
  for (const t of TEMPLATES) assert.ok(t.system && t.name && t.category, t.id);
});
