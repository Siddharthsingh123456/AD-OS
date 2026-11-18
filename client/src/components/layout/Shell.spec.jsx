import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MODULES } from "../../lib/modules";

let auth = {};
vi.mock("../../lib/auth.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../hooks/useAgents", () => ({ useAgents: () => ({ builtin: [], custom: [], loading: false }) }));
vi.mock("../ui/ThemeToggle.jsx", () => ({ default: () => null }));
const { default: Shell } = await import("./Shell.jsx");

const mount = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/app" element={<Shell />}>
          <Route index element={<button>dash</button>} />
          <Route path="chat" element={<button>chat page</button>} />
          <Route path="settings" element={<button>settings page</button>} />
          <Route path="admin" element={<button>admin page</button>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("Shell for the guest account (Skip for now)", () => {
  it("is a normal, fully interactive workspace with every page in the sidebar", () => {
    auth = { user: { name: "Guest", role: "admin" }, loading: false, logout: vi.fn() };
    mount("/app/admin");
    expect(screen.getByText("admin page")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    for (const m of MODULES) {
      expect(screen.getByRole("link", { name: m.name })).toBeInTheDocument();
    }
  });
});

describe("Shell in the view-only preview", () => {
  it("shows every page, locked, with a clear banner", () => {
    auth = { user: { name: "Guest", role: "admin", preview: true }, loading: false, logout: vi.fn() };
    mount("/app/admin");
    expect(screen.getByRole("status")).toHaveTextContent(/preview mode/i);
    expect(screen.getByTestId("guest-lock")).toHaveAttribute("inert");
    expect(screen.getByText("admin page")).toBeInTheDocument();
    for (const m of MODULES) expect(screen.getByRole("link", { name: m.name })).toBeInTheDocument();
  });
});

describe("Shell for everyone else", () => {
  it("redirects visitors who are not signed in to the login page", () => {
    auth = { user: null, loading: false, logout: vi.fn() };
    mount("/app/chat");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("leaves a signed-in user's workspace fully interactive", () => {
    auth = { user: { name: "Ada Lovelace", role: "user" }, loading: false, logout: vi.fn() };
    mount("/app/settings");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("settings page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
