import { describe, expect, it } from "vitest";
import { highlight } from "./highlight";

const types = (code, lang) =>
  highlight(code, lang)
    .filter(([t]) => t)
    .map(([t, v]) => `${t}:${v}`);

describe("highlight", () => {
  it("reassembles to exactly the original code", () => {
    const code = 'const a = "x"; // note\nfunction f(n) { return n * 2 }';
    expect(
      highlight(code, "js")
        .map(([, v]) => v)
        .join(""),
    ).toBe(code);
  });

  it("finds keywords, strings, numbers, comments and calls in JavaScript", () => {
    expect(types('const n = 42; // hi\nlog("ok")', "javascript")).toEqual([
      "keyword:const",
      "number:42",
      "comment:// hi",
      "fn:log",
      'string:"ok"',
    ]);
  });

  it("is case-insensitive for SQL keywords", () => {
    expect(types("SELECT name FROM users", "sql")).toEqual(["keyword:SELECT", "keyword:FROM"]);
  });

  it("handles Python comments and triple-quoted strings", () => {
    expect(types('def f():\n    """doc"""  # c', "python")).toEqual([
      "keyword:def",
      "fn:f",
      'string:"""doc"""',
      "comment:# c",
    ]);
  });

  it("still highlights an unterminated string while streaming", () => {
    expect(types('const s = "partial', "js")).toEqual(["keyword:const", 'string:"partial']);
  });

  it("highlights HTML tags and attributes", () => {
    expect(types('<a href="/x">hi</a>', "html")).toEqual(["tag:<a", "attr:href", 'string:"/x"', "tag:</a"]);
  });

  it("falls back to a generic family for unknown languages and skips huge input", () => {
    expect(types("return 1", "madeup")).toEqual(["keyword:return", "number:1"]);
    expect(highlight("x".repeat(30000), "js")).toHaveLength(1);
  });
});
