const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/utils/validate");

test("text trims, enforces limits and rejects non-strings", () => {
  assert.equal(v.text("  hi  ", { max: 5 }), "hi");
  assert.throws(() => v.text("", { min: 1, label: "Name" }), /Name is required/);
  assert.throws(() => v.text("abcdef", { max: 5, label: "Title" }), /5 characters or fewer/);
  assert.throws(() => v.text({ $gt: "" }, { label: "Email" }), /must be text/);
  assert.equal(v.text(undefined), "");
});

test("text can preserve whitespace", () => {
  assert.equal(v.text("  keep  ", { trim: false }), "  keep  ");
});

test("int validates range and supports a fallback", () => {
  assert.equal(v.int("7", { min: 1, max: 10 }), 7);
  assert.equal(v.int(undefined, { fallback: 5 }), 5);
  assert.throws(() => v.int(11, { min: 1, max: 10, label: "Count" }), /Count must be a whole number/);
  assert.throws(() => v.int(1.5, { min: 1, max: 10 }), /whole number/);
});

test("id accepts only 24-char hex ObjectIds", () => {
  assert.equal(v.isId("507f1f77bcf86cd799439011"), true);
  assert.equal(v.isId("nope"), false);
  assert.equal(v.isId({ $ne: null }), false);
  assert.throws(() => v.id("x", "note id"), /Invalid note id/);
});

test("oneOf and array", () => {
  assert.equal(v.oneOf("hard", ["easy", "hard"], "easy"), "hard");
  assert.equal(v.oneOf("x", ["easy", "hard"], "easy"), "easy");
  assert.deepEqual(v.array([1, 2, 3], { max: 2 }), [1, 2]);
  assert.deepEqual(v.array(undefined), []);
  assert.throws(() => v.array("nope"), /must be a list/);
});
