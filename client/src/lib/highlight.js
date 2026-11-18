// A small dependency-free syntax highlighter for chat code blocks.
// It tokenizes with one regex per language family. Unterminated strings and comments still match, so code highlights
// correctly while it is still streaming in.

const KEYWORDS = {
  js: "const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of this super null undefined true false void delete yield static get set interface type enum implements public private protected readonly as",
  py: "def class return if elif else for while in not and or is import from as with try except finally raise lambda None True False pass break continue yield async await global nonlocal assert del self",
  sh: "if then else elif fi for while do done case esac function in echo export cd ls cat grep sudo npm npx git docker curl",
  sql: "select from where group by order having join left right inner outer on as and or not in is null insert into values update set delete create table alter drop index primary key foreign references limit offset union distinct count sum avg min max case when then else end like between exists with",
  go: "func package import return if else for range switch case break continue go defer chan select struct interface map type var const nil true false",
  java: "public private protected class interface extends implements static final void int long double float boolean char new return if else for while do switch case break continue try catch finally throw throws import package null true false this super",
  rust: "fn let mut pub struct enum impl trait use mod return if else match for while loop break continue as in ref self Self true false const static where async await move",
  yaml: "true false null yes no",
  css: "",
  html: "",
};
const SETS = Object.fromEntries(Object.entries(KEYWORDS).map(([k, v]) => [k, new Set(v.split(" ").filter(Boolean))]));

const ALIAS = {
  javascript: "js",
  jsx: "js",
  ts: "js",
  tsx: "js",
  typescript: "js",
  mjs: "js",
  cjs: "js",
  json: "js",
  jsonc: "js",
  node: "js",
  python: "py",
  bash: "sh",
  shell: "sh",
  zsh: "sh",
  console: "sh",
  golang: "go",
  rs: "rust",
  yml: "yaml",
  scss: "css",
  less: "css",
  xml: "html",
  vue: "html",
  svelte: "html",
  postgres: "sql",
  postgresql: "sql",
  mysql: "sql",
  sqlite: "sql",
  c: "java",
  cpp: "java",
  cs: "java",
  kotlin: "java",
  swift: "java",
  php: "java",
};

const COMMENT = {
  js: String.raw`\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)`,
  sql: String.raw`--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)`,
  html: String.raw`<!--[\s\S]*?(?:-->|$)`,
  hash: String.raw`#[^\n]*`,
};
const commentFor = (l) =>
  l === "py" || l === "sh" || l === "yaml"
    ? COMMENT.hash
    : l === "sql"
      ? COMMENT.sql
      : l === "html"
        ? COMMENT.html
        : COMMENT.js;
const STRING =
  String.raw`"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|` +
  "`(?:\\\\.|[^`\\\\])*`?";
const NUMBER = String.raw`\b0x[\da-fA-F]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b`;

const cache = {};
function matcher(lang) {
  if (cache[lang]) return cache[lang];
  const parts = [`(?<c>${commentFor(lang)})`, `(?<s>${STRING})`];
  if (lang === "html") parts.push(String.raw`(?<t><\/?[A-Za-z][\w:-]*)`, String.raw`(?<a>[\w:-]+(?==))`);
  if (lang === "css")
    parts.push(String.raw`(?<a>[a-z-]+(?=\s*:))`, String.raw`(?<k>@[\w-]+)`, String.raw`(?<x>#[\da-fA-F]{3,8}\b)`);
  parts.push(`(?<n>${NUMBER})`, String.raw`(?<w>[A-Za-z_$][\w$]*)`);
  return (cache[lang] = new RegExp(parts.join("|"), "g"));
}

const MAX = 20000;

/** Returns [type, text] pairs where type is one of comment | string | number | keyword | fn | tag | attr | null. */
export function highlight(code, lang = "") {
  const key = String(lang)
    .toLowerCase()
    .replace(/[^a-z+#]/g, "");
  const family = ALIAS[key] || (SETS[key] ? key : "js");
  if (code.length > MAX) return [[null, code]];
  const kw = SETS[family];
  const re = matcher(family);
  re.lastIndex = 0;
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[0] === "") {
      re.lastIndex++;
      continue;
    }
    if (m.index > last) out.push([null, code.slice(last, m.index)]);
    const g = m.groups;
    let type = null;
    if (g.c !== undefined) type = "comment";
    else if (g.s !== undefined) type = "string";
    else if (g.t !== undefined) type = "tag";
    else if (g.a !== undefined) type = "attr";
    else if (g.n !== undefined || g.x !== undefined) type = "number";
    else if (g.k !== undefined) type = "keyword";
    else if (g.w !== undefined) {
      const word = family === "sql" ? g.w.toLowerCase() : g.w;
      if (kw.has(word)) type = "keyword";
      else if (code[re.lastIndex] === "(") type = "fn";
    }
    out.push([type, m[0]]);
    last = re.lastIndex;
  }
  if (last < code.length) out.push([null, code.slice(last)]);
  return out;
}
