const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { personalize } = require("../../scripts/personalize");

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pers-"));
  fs.mkdirSync(path.join(dir, "client/public"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "README.md"),
    "[![CI](https://github.com/OWNER/ai-developer-os/actions)](x) by OWNER",
  );
  fs.writeFileSync(path.join(dir, "client/index.html"), '<link href="https://your-domain.example/">');
  fs.writeFileSync(path.join(dir, "client/public/sitemap.xml"), "<loc>https://your-domain.example/pricing</loc>");
  return dir;
}

test("replaces the owner and domain placeholders and is idempotent", () => {
  const dir = sandbox();
  const changed = personalize(dir, { owner: "ada", domain: "app.ada.dev", repo: "dev-os" });
  assert.equal(changed.length, 3);
  assert.match(
    fs.readFileSync(path.join(dir, "README.md"), "utf8"),
    /github\.com\/ada\/dev-os\/actions\)\]\(x\) by ada/,
  );
  assert.match(fs.readFileSync(path.join(dir, "client/index.html"), "utf8"), /https:\/\/app\.ada\.dev\//);
  assert.deepEqual(personalize(dir, { owner: "ada", domain: "app.ada.dev", repo: "dev-os" }), []);
});

test("rejects values that are not a username or a bare domain", () => {
  const dir = sandbox();
  assert.throws(() => personalize(dir, { owner: "bad name!" }), /GitHub username/);
  assert.throws(() => personalize(dir, { domain: "https://x.com" }), /app\.example\.com/);
});
