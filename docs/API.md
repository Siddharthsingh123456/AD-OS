# API reference

All routes are under `/api`, return JSON (except the chat stream, which is plain text), and need a signed-in session unless marked public. Browsers use the httpOnly `aidos_session` cookie and must echo the `aidos_csrf` cookie in an `x-csrf-token` header on writes. Scripts can sign in with `?token=1` and send `Authorization: Bearer <token>` instead (no CSRF header needed). Errors look like `{ "error": "message", "requestId": "…" }`.

| Method and path                                                             | Purpose                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /health` (public)                                                      | `{ ok, db, llm, ml, limiter, billing, demo, model, version, uptime, memoryMb }`                          |
| `POST /auth/register`, `/auth/login` (public)                               | Sets the session cookies and returns `{ user }` (plus `token` with `?token=1`). First account is admin   |
| `POST /auth/logout`, `POST /auth/demo`                                      | Clear the session; start the demo session (only when `DEMO_MODE=true`)                                   |
| `GET /auth/me`, `/auth/stats`                                               | Current user, dashboard counts                                                                           |
| `POST /auth/password`                                                       | Change password; refreshes this device's session and signs out other devices                             |
| `GET /auth/export`                                                          | Download all of the user's data                                                                          |
| `POST /auth/delete-account`                                                 | Delete the account and everything it owns                                                                |
| `GET /chat/agents`, `/chat/recent`                                          | Agent catalogue, latest conversations                                                                    |
| `GET/PATCH/DELETE /chat/conversations[/:id]`                                | List, open, rename, delete conversations                                                                 |
| `POST /chat/stream`                                                         | Streams a reply. Body: `agent, key, message, conversationId?, fields?, collection?, docId?, regenerate?` |
| `GET/POST/DELETE /rag/docs…`, `POST /rag/pdf`, `/rag/github`, `/rag/search` | Knowledge base                                                                                           |
| `/notes`, `/memory`, `/projects`, `/resume`                                 | CRUD for personal data                                                                                   |
| `POST /tasks/run`                                                           | One-shot AI tasks (summarize, refactor, ATS check…)                                                      |
| `POST /quiz/generate`, `GET/POST /quiz/attempts`                            | Quizzes                                                                                                  |
| `GET /github/:username`                                                     | Profile analytics                                                                                        |
| `GET /marketplace`, `POST /marketplace/install`, `/agents`                  | Templates, community agents, own agents                                                                  |
| `GET /billing/status`, `POST /billing/checkout`, `/billing/portal`          | Plan and Stripe Checkout/portal links (503 until billing is configured)                                  |
| `POST /billing/webhook` (Stripe)                                            | Signature-verified plan updates                                                                          |
| `POST /telemetry/client-error` (public)                                     | Browser crash reports (rate limited)                                                                     |
| `/admin/*` (admin)                                                          | Overview, users                                                                                          |

Rate limits return `429` with `Retry-After`; every response carries `RateLimit-*` headers where a limit applies.
