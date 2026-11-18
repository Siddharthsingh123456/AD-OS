# Contributing

```bash
npm install
cp .env.example .env     # MONGODB_URI is required; ANTHROPIC_API_KEY for AI features
npm run dev              # API on :5000, web on :5173
npm run check            # lint + format check + tests + build (what CI runs)
```

- Server code lives in `server/src` (`routes` → `services` → `models`; shared `middleware`, `utils`, `config`). Keep routes thin and validate input with `utils/validate.js`.
- Client code lives in `client/src` (`pages`, `components/{ui,layout,chat,site,effects,system}`, `hooks`, `lib`, `styles`). Use `useToast` and `useDialog` instead of `alert`/`confirm`/`prompt`.
- Add a test for new logic: `server/test/*.test.js` (node:test) or `client/src/**/*.spec.js` (Vitest).
- Do not invent product claims or fake metrics in marketing copy.
