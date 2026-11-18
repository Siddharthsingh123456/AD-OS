import { describe, expect, it } from "vitest";
import { applyTheme, readTheme, resolveTheme } from "./theme";

describe("theme", () => {
  it("resolves system to the OS preference and leaves explicit choices alone", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });

  it("defaults to dark and ignores junk in storage", () => {
    expect(readTheme()).toBe("dark");
    localStorage.setItem("aidos_theme", "neon");
    expect(readTheme()).toBe("dark");
    localStorage.setItem("aidos_theme", "light");
    expect(readTheme()).toBe("light");
  });

  it("writes the resolved theme onto the document", () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    expect(applyTheme("light")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
