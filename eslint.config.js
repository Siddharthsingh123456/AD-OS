const js = require("@eslint/js");
const globals = require("globals");
const react = require("eslint-plugin-react");
const hooks = require("eslint-plugin-react-hooks");

module.exports = [
  { ignores: ["node_modules", "client/dist", "**/coverage", ".vercel", "test-results", "playwright-report"] },
  js.configs.recommended,
  {
    files: ["server/**/*.js", "api/**/*.js", "scripts/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "commonjs", globals: { ...globals.node } },
    rules: { "no-unused-vars": ["warn", { argsIgnorePattern: "^_|^(req|res|next)$", caughtErrors: "none" }] },
  },
  {
    files: ["client/**/*.{js,jsx,mjs}"],
    plugins: { react, "react-hooks": hooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: "18.3" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["e2e/**/*.js", "playwright.config.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "commonjs", globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["client/public/**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "script", globals: { ...globals.browser } },
  },
  { files: ["client/vite.config.mjs", "client/vitest.config.mjs"], languageOptions: { globals: { ...globals.node } } },
];
