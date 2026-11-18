import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary.jsx";

afterEach(() => vi.unstubAllGlobals());

const Boom = () => {
  throw new Error("kaboom");
};

describe("ErrorBoundary", () => {
  it("shows a recovery screen and reports the crash without throwing", () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    // React re-throws render errors to the window in dev; the boundary handles it, so keep the runner quiet.
    const quiet = (e) => e.preventDefault();
    window.addEventListener("error", quiet);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/telemetry/client-error");
    expect(JSON.parse(init.body).message).toBe("kaboom");
    window.removeEventListener("error", quiet);
  });
});
