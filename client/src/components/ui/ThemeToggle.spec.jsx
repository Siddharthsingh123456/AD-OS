import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThemeToggle from "./ThemeToggle.jsx";

describe("ThemeToggle", () => {
  it("cycles dark, light and system, applying and remembering each choice", () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAccessibleName(/Dark theme/);
    fireEvent.click(btn);
    expect(btn).toHaveAccessibleName(/Light theme/);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("aidos_theme")).toBe("light");
    fireEvent.click(btn);
    expect(btn).toHaveAccessibleName(/system/i);
    fireEvent.click(btn);
    expect(btn).toHaveAccessibleName(/Dark theme/);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("keeps two toggles on the page in sync", () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    const [a, b] = screen.getAllByRole("button");
    fireEvent.click(a);
    expect(b).toHaveAccessibleName(/Light theme/);
  });
});
