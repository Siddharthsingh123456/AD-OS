import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const skip = vi.fn(async () => {});
vi.mock("../../lib/auth.jsx", () => ({
  useAuth: () => ({ user: null, login: vi.fn(), register: vi.fn(), demo: vi.fn(), skip }),
}));
const { default: AuthPage } = await import("./AuthPage.jsx");

const mount = (mode) =>
  render(
    <MemoryRouter initialEntries={["/x"]}>
      <Routes>
        <Route path="/x" element={<AuthPage mode={mode} />} />
        <Route path="/app" element={<div>workspace</div>} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => vi.unstubAllGlobals());

describe("AuthPage Skip for now", () => {
  it("starts a real guest session and opens the workspace", async () => {
    mount("login");
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(await screen.findByText("workspace")).toBeInTheDocument();
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it("is also offered on the registration screen", () => {
    mount("register");
    expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument();
  });

  it("is hidden when the server has guest login switched off", async () => {
    vi.stubGlobal("fetch", async () => ({ json: async () => ({ guest: false }) }));
    mount("login");
    await vi.waitFor(() => expect(screen.queryByRole("button", { name: "Skip for now" })).toBeNull());
  });
});
