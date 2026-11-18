import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MODULES } from "../../lib/modules";

let role = "admin";
let signedIn = true;
vi.mock("../../lib/auth.jsx", () => ({ useAuth: () => ({ user: signedIn ? { name: "Ada Lovelace", role } : null }) }));
vi.mock("../../lib/api", () => ({
  api: vi.fn(async (p) => (p.includes("stats") ? { chats: 3, notes: 2, docs: 1, projects: 1, memories: 2 } : [])),
}));
const { default: Dashboard } = await import("./Dashboard.jsx");

const tiles = () => [...document.querySelectorAll(".tiles")];

describe("Dashboard", () => {
  it("greets the user and lists every module in balanced groups", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Ada");
    await waitFor(() => expect(tiles().length).toBeGreaterThan(0));
    for (const t of tiles()) expect(t.dataset.n).toBe(String(t.children.length));
    const total = tiles().reduce((n, t) => n + t.children.length, 0);
    expect(total).toBe(MODULES.length);
  });

  it("hides admin-only modules from regular users", async () => {
    role = "user";
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await waitFor(() => expect(tiles().length).toBeGreaterThan(0));
    const total = tiles().reduce((n, t) => n + t.children.length, 0);
    expect(total).toBe(MODULES.filter((m) => !m.admin).length);
  });
});
