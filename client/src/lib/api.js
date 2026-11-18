// The session itself lives in an httpOnly cookie that scripts cannot read. A second, readable cookie carries the CSRF
// token, which we echo back in a header on every request. Its presence also tells us whether a session may exist.
const CSRF = "aidos_csrf";
export const readCookie = (name) => {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
};
export const hasSession = () => !!readCookie(CSRF);

// ---- Preview ("Skip for now" without a working server) ------------------------------------------------------------
// When the API or its database is not available, "Skip for now" still opens the whole workspace, but view-only: there
// is no server session, reads resolve to the same empty state a brand-new account would see, and every write is
// refused. The flag lives in sessionStorage, so a refresh keeps the preview and closing the tab ends it.
import CATALOG from "./agentCatalog.json";
const PREVIEW = "aidos_preview";
export const isPreview = () => {
  try {
    return sessionStorage.getItem(PREVIEW) === "1" && !hasSession();
  } catch {
    return false;
  }
};
export const setPreview = (on) => {
  try {
    if (on) sessionStorage.setItem(PREVIEW, "1");
    else sessionStorage.removeItem(PREVIEW);
  } catch {
    /* storage unavailable (private mode): the preview just won't survive a refresh */
  }
};
export const PREVIEW_MESSAGE =
  "This is a view-only preview. Start the API with a database (or add MONGODB_URI) to use this feature.";
export class PreviewLockedError extends Error {
  constructor(message = PREVIEW_MESSAGE) {
    super(message);
    this.name = "PreviewLockedError";
    this.preview = true;
  }
}
export const PREVIEW_USER = { id: "preview", name: "Guest", email: "", role: "admin", plan: "starter", preview: true };
const EMPTY_OVERVIEW = {
  counts: {
    users: 0,
    conversations: 0,
    notes: 0,
    docs: 0,
    chunks: 0,
    projects: 0,
    agents: 0,
    memories: 0,
    requests: 0,
  },
  daily: [],
  topFeatures: [],
  system: {
    llm: false,
    model: "",
    ml: false,
    webSearch: false,
    githubToken: false,
    jwtSecret: false,
    version: "",
    warnings: [],
  },
};
const PREVIEW_READS = [
  ["/chat/agents", () => ({ builtin: CATALOG, custom: [] })],
  ["/chat/catalog", () => ({ builtin: CATALOG })],
  ["/chat/recent", () => []],
  ["/chat/conversations", () => []],
  ["/auth/stats", () => ({})],
  ["/notes", () => []],
  ["/memory", () => []],
  ["/projects", () => []],
  ["/resume", () => ({})],
  ["/quiz/attempts", () => []],
  ["/rag/docs", () => []],
  ["/marketplace", () => ({ templates: [], community: [] })],
  ["/admin/overview", () => EMPTY_OVERVIEW],
  ["/admin/users", () => []],
  ["/billing/status", () => ({ enabled: false, plan: "starter", status: "" })],
];
const previewRead = (path) =>
  PREVIEW_READS.find(([p]) => path === p || path.startsWith(p + "?") || path.startsWith(p + "/"));

export const getSettings = () => {
  try {
    return JSON.parse(localStorage.getItem("aidos_settings") || "{}");
  } catch {
    return {};
  }
};
export const saveSettings = (s) => localStorage.setItem("aidos_settings", JSON.stringify(s));

function headers(extra = {}) {
  const s = getSettings();
  return {
    ...(hasSession() ? { "x-csrf-token": readCookie(CSRF) } : {}),
    ...(s.apiKey ? { "x-user-api-key": s.apiKey } : {}),
    ...(s.githubToken ? { "x-github-token": s.githubToken } : {}),
    ...extra,
  };
}

/** Clears the server-side cookies (best effort; the UI signs out regardless). */
export function endSession() {
  return fetch("/api/auth/logout", { method: "POST", headers: headers() }).catch(() => {});
}

async function fail(res) {
  let msg = `Request failed (${res.status})`;
  try {
    msg = (await res.json()).error || msg;
  } catch {
    /* keep the default message */
  }
  if (res.status === 401 && hasSession()) {
    endSession();
    window.dispatchEvent(new Event("aidos-logout"));
  }
  throw new Error(msg);
}

export async function api(path, { method = "GET", body, form } = {}) {
  if (isPreview()) {
    const hit = method === "GET" && previewRead(path);
    if (hit) return hit[1]();
    throw new PreviewLockedError();
  }
  const res = await fetch("/api" + path, {
    method,
    headers: headers(body ? { "Content-Type": "application/json" } : {}),
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  if (!res.ok) await fail(res);
  return res.json();
}

/** Streams plain-text tokens from the chat endpoint. Returns { text, conversationId, sources }. */
export async function streamChat(body, { onToken, signal } = {}) {
  if (isPreview()) throw new PreviewLockedError();
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    signal,
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) await fail(res);
  let sources = [];
  try {
    sources = JSON.parse(decodeURIComponent(res.headers.get("X-Sources") || "[]"));
  } catch {
    /* header was not valid JSON */
  }
  const conversationId = res.headers.get("X-Conversation-Id");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onToken?.(text);
  }
  return { text, conversationId, sources };
}

export const runTask = (task, input, context) =>
  api("/tasks/run", { method: "POST", body: { task, input, context } }).then((r) => r.output);
export const download = (name, content, type = "text/plain") => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
