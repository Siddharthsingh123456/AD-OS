import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import Reveal from "./Reveal.jsx";

afterEach(() => vi.unstubAllGlobals());

describe("Reveal", () => {
  it("is visible immediately when IntersectionObserver is unavailable", () => {
    render(<Reveal data-testid="r">hello</Reveal>);
    expect(screen.getByTestId("r")).toHaveClass("reveal", "in");
  });

  it("starts hidden and reveals once when scrolled into view", () => {
    let trigger;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb) {
          trigger = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    window.matchMedia = () => ({ matches: false });
    render(<Reveal data-testid="r">hello</Reveal>);
    expect(screen.getByTestId("r")).not.toHaveClass("in");
    act(() => trigger([{ isIntersecting: true }]));
    expect(screen.getByTestId("r")).toHaveClass("in");
    expect(disconnect).toHaveBeenCalled();
  });
});
