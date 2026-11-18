#!/usr/bin/env node
// Replaces the template placeholders with your real values.
//   npm run personalize -- --owner=your-github-user --domain=app.example.com [--repo=ai-developer-os]
// Safe to run more than once with the same values. Prints what it changed.
const fs = require("fs");
const path = require("path");

const FILES = [
  "README.md",
  "client/index.html",
  "client/public/sitemap.xml",
  "client/public/robots.txt",
  "SECURITY.md",
  "CONTRIBUTING.md",
];

function personalize(root, { owner, domain, repo = "ai-developer-os" } = {}) {
  if (owner && !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner))
    throw new Error("--owner must be a GitHub username.");
  if (domain && !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain))
    throw new Error("--domain must look like app.example.com (no https://).");
  if (!/^[\w.-]+$/.test(repo)) throw new Error("--repo has invalid characters.");
  const changed = [];
  for (const rel of FILES) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, "utf8");
    const before = text;
    if (owner) text = text.replace(/OWNER\/ai-developer-os/g, `${owner}/${repo}`).replace(/\bOWNER\b/g, owner);
    if (domain) text = text.replace(/your-domain\.example/g, domain);
    if (text !== before) {
      fs.writeFileSync(file, text);
      changed.push(rel);
    }
  }
  return changed;
}

module.exports = { personalize };

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => a.slice(2).split("=")),
  );
  if (!args.owner && !args.domain) {
    console.log("Usage: npm run personalize -- --owner=<github-user> --domain=<app.example.com> [--repo=<name>]");
    process.exit(1);
  }
  try {
    const changed = personalize(path.join(__dirname, ".."), args);
    console.log(changed.length ? "Updated:\n  " + changed.join("\n  ") : "Nothing to change (already personalized).");
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
