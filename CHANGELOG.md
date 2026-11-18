# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.3.2] - 2026-11-07

### Fixed

- "Skip for now" no longer opens a locked, view-only preview that hid Admin, Settings and custom agents and failed with "Is the API running?". It now starts a real session on a shared guest account, so every page is visible and every feature works.
- The first real account on a deployment is still the admin: the guest account does not count.

### Added

- Skip for now falls back to a view-only preview (every page, Admin and Settings included, drawn from bundled data) when the API or its database is unavailable, so there are no "Database unavailable" or "Is the API running?" errors.
- Embedded local database: with no `MONGODB_URI` (outside production) the API starts a MongoDB that keeps its files in `.data/mongo`. No Atlas account is needed to try the app.
- `GUEST_LOGIN`, `GUEST_ADMIN` and `EMBEDDED_DB` settings. Guest login is off by default in production; set `GUEST_LOGIN=true` to allow it.

## [1.3.1] - 2026-10-12

### Added

- Integration tests that run the real API against a real MongoDB (`npm run test:integration`) and a matching CI job. They are skipped when `MONGODB_URI_TEST` is not set. Not run on the author's machine, which had no MongoDB: the CI job is their first real run.
- `npm run screenshots` regenerates the README screenshots and landing tour from the built app.
- More client tests: pricing, product tour, dashboard grid and derived copy.

### Changed

- Module counts in the hero, stats, pricing, sign-in and tour copy are derived from the module list instead of typed by hand.
- The "Most popular" badge now reads "Recommended", since there is no usage data behind a popularity claim.
- Tour screenshots are JPEGs produced by the screenshots script.

### Removed

- Unused `landing-light.png`.

## [1.3.0] - 2026-10-11

### Security

- Sessions moved from `localStorage` to an `httpOnly`, `SameSite=Lax` cookie with double-submit CSRF protection and a same-site `Origin` check. Scripts can still use bearer tokens (`?token=1`).
- Optional shared rate limiting through Upstash Redis; fails open to the in-memory limiter.
- Dependencies upgraded: multer 2, react-router 7, Vite 7, Vitest 4. `nodemon` replaced by `node --watch`. `npm audit` reports 0 vulnerabilities.
- The demo account cannot change its password or be deleted.

### Added

- Light theme with a header toggle, a Settings panel, system-preference support and no flash on load.
- Product tour section on the landing page using real screenshots (sample data).
- Optional Stripe billing: Checkout, customer portal and a signature-verified webhook. Tested against mocks only; quotas are not tied to plans yet.
- Error reporting: structured server logs, browser crash reports and an optional `ERROR_WEBHOOK_URL`. `/api/health` now reports limiter, billing, demo and memory.
- Demo mode (`DEMO_MODE=true`) and `npm run seed` with sample data.
- `npm run personalize` replaces the `OWNER` and `your-domain.example` placeholders.
- New social share image; generator source in `scripts/og-image.html`.
- Tests: 21 client tests (with coverage), 50+ server tests, 6 ML-service tests (pytest) and Playwright end-to-end plus axe accessibility checks in both themes.
- Low-power mode for the animated background (data saver, few cores, little memory or small screens).

### Changed

- Balanced dashboard grid: every row fills, whatever the number of tiles.
- Accessibility fixes found by axe: heading order, main landmark on auth pages, labelled admin controls, "Most popular" badge is real text.
- Canonical and social URLs are absolute, as Vite 7 and social crawlers require.
- CI runs coverage, end-to-end tests and the ML-service tests.

## [1.2.0] - 2026-10-11

### Added

- Polish stylesheet with a shared depth, motion and spacing system.
- Landing page: announcement pill, gradient headline accent, technology chips, section eyebrows and scroll-reveal animation (respects `prefers-reduced-motion`).
- Sticky site header gains a scrolled state.
- `CODE_OF_CONDUCT.md`, `CHANGELOG.md` and `.gitattributes`.

### Changed

- Capabilities, FAQ and module tiles are now cards with hover depth.
- Buttons use a gradient primary and a glass secondary.
- README rewritten with a centred header, highlights and architecture diagram.

### Removed

- A stray nested `.git` directory in `server/src` and a committed `__pycache__` folder.

## [1.1.0]

- Initial public structure: 20 modules, RAG engine, optional ML service, CI, Docker and Vercel configuration.
