const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const env = require("../config/env");
const { h, httpError } = require("../utils/http");

router.use(
  requireAuth,
  rateLimit({
    name: "github",
    by: "user",
    windowMs: 60 * 1000,
    max: 20,
    message: "Too many GitHub lookups. Try again in a minute.",
  }),
);

const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

router.get(
  "/:username",
  h(async (req, res) => {
    const name = String(req.params.username);
    if (!USERNAME.test(name)) throw httpError(400, "That is not a valid GitHub username.");
    const token = req.headers["x-github-token"] || env.githubToken();
    const gh = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-developer-os",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const get = (url) => fetch(url, { headers: gh, signal: AbortSignal.timeout(15000) });

    const u = await get(`https://api.github.com/users/${name}`);
    if (u.status === 404) throw httpError(404, "GitHub user not found.");
    if (!u.ok) throw httpError(502, "GitHub API error. You may have hit the rate limit: add a token in Settings.");
    const user = await u.json();

    let repos = [];
    for (let p = 1; p <= 3; p++) {
      const r = await get(`https://api.github.com/users/${name}/repos?per_page=100&page=${p}&sort=pushed`);
      if (!r.ok) break;
      const page = await r.json();
      repos = repos.concat(page);
      if (page.length < 100) break;
    }
    const own = repos.filter((r) => !r.fork);
    const langs = {};
    const years = {};
    for (const r of own) {
      if (r.language) langs[r.language] = (langs[r.language] || 0) + 1;
      const y = new Date(r.created_at).getFullYear();
      years[y] = (years[y] || 0) + 1;
    }
    res.json({
      user: {
        login: user.login,
        name: user.name,
        avatar: user.avatar_url,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        publicRepos: user.public_repos,
        createdAt: user.created_at,
        url: user.html_url,
      },
      totals: {
        repos: repos.length,
        original: own.length,
        forks: repos.length - own.length,
        stars: own.reduce((a, r) => a + r.stargazers_count, 0),
        forksReceived: own.reduce((a, r) => a + r.forks_count, 0),
      },
      languages: Object.entries(langs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([n, count]) => ({ name: n, count })),
      years: Object.entries(years)
        .sort()
        .map(([year, count]) => ({ year, count })),
      topRepos: [...own]
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 6)
        .map((r) => ({
          name: r.name,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          description: r.description,
          url: r.html_url,
        })),
      recent: own
        .slice(0, 6)
        .map((r) => ({ name: r.name, pushedAt: r.pushed_at, language: r.language, url: r.html_url })),
    });
  }),
);

module.exports = router;
