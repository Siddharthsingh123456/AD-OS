# Security

## Reporting a vulnerability

Please do not open a public issue. Email the maintainer (or use GitHub's private "Report a vulnerability" button on the repository's Security tab) with steps to reproduce. Expect an acknowledgement within a few days.

## What the app does today

- Passwords: bcrypt (cost 11). Login takes the same time whether or not the email exists.
- Sessions: a signed JWT in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production), 7 days, so page scripts cannot read it. State-changing requests that use the cookie also need a matching `x-csrf-token` header and a same-site `Origin`. Changing a password invalidates every older session. Scripts can use `?token=1` at sign-in and send the token as a `Bearer` header instead.
- Rate limits: sign-in, sign-up, password, deletion, export, every AI route (per user), and a global API limit. In-memory per instance by default; set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for one shared counter (it fails open to in-memory if Redis is unreachable).
- Headers: strict Content-Security-Policy, `frame-ancestors 'none'`, `nosniff`, HSTS, referrer policy. CORS is closed to other origins unless listed in `CORS_ORIGIN`.
- Input: every route validates type and length. Objects are rejected rather than coerced (operator-injection guard). Per-user quotas cap notes, memories, projects, agents and indexed sources.
- Data: users can export or delete everything from Settings. Usage logs expire after 90 days.

## Known trade-offs

- Cross-origin API callers (listed in `CORS_ORIGIN`) do not get cookies and must use bearer tokens.
- The Stripe integration is tested against mocks only. Verify it in Stripe test mode before taking real payments.
- The shared demo account (`DEMO_MODE=true`) can spend your server-side AI key. Keep rate limits on and leave `ANTHROPIC_API_KEY` unset on public demos so visitors bring their own.
- A key a user pastes into Settings is sent with their requests (over HTTPS) and stored only in their browser.
- Set `JWT_SECRET`. Without it a secret is derived from `MONGODB_URI`, which still works but is weaker.
