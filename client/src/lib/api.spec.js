import { afterEach, describe, expect, it, vi } from "vitest";
import { api, hasSession, readCookie, streamChat } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("session cookies", () => {
  it("reads cookies and reports a session only when the CSRF cookie exists", () => {
    expect(hasSession()).toBe(false);
    document.cookie = "aidos_csrf=abc%20123; path=/";
    expect(readCookie("aidos_csrf")).toBe("abc 123");
    expect(hasSession()).toBe(true);
  });

  it("sends the CSRF token header with requests", async () => {
    document.cookie = "aidos_csrf=tok; path=/";
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    await api("/notes", { method: "POST", body: { a: 1 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/notes");
    expect(init.headers["x-csrf-token"]).toBe("tok");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("surfaces the server's error message", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 400, json: async () => ({ error: "Nope" }) }));
    await expect(api("/x")).rejects.toThrow("Nope");
  });
});

describe("view-only preview", () => {
  afterEach(() => sessionStorage.clear());

  it("renders every page's reads from bundled data without touching the network", async () => {
    sessionStorage.setItem("aidos_preview", "1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await api("/notes")).toEqual([]);
    expect((await api("/chat/agents")).builtin.length).toBeGreaterThan(5);
    expect((await api("/admin/overview")).counts.users).toBe(0);
    expect(await api("/admin/users")).toEqual([]);
    expect((await api("/billing/status")).enabled).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses writes, tasks and chat", async () => {
    sessionStorage.setItem("aidos_preview", "1");
    vi.stubGlobal("fetch", vi.fn());
    await expect(api("/notes", { method: "POST", body: {} })).rejects.toThrow("view-only");
    await expect(api("/tasks/run", { method: "POST", body: {} })).rejects.toThrow("view-only");
    await expect(streamChat({ message: "hi" })).rejects.toThrow("view-only");
  });
});
