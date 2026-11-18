import { useCallback, useEffect, useState } from "react";

export const THEMES = ["dark", "light", "system"];
const KEY = "aidos_theme";

export const readTheme = () => {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v) ? v : "dark";
  } catch {
    return "dark";
  }
};

/** Resolves a preference ("dark" | "light" | "system") to the concrete theme to paint. */
export const resolveTheme = (pref, prefersLight) => (pref === "system" ? (prefersLight ? "light" : "dark") : pref);

export function applyTheme(pref) {
  const light = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  const theme = resolveTheme(pref, light);
  document.documentElement.setAttribute("data-theme", theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#eef5f4" : "#060e13");
  return theme;
}

export function useTheme() {
  const [pref, setPref] = useState(readTheme);
  const set = useCallback((next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the choice just will not persist */
    }
    setPref(next);
    window.dispatchEvent(new CustomEvent("aidos-theme", { detail: next }));
  }, []);
  // Keep every toggle on the page in sync.
  useEffect(() => {
    const on = (e) => setPref(e.detail);
    window.addEventListener("aidos-theme", on);
    return () => window.removeEventListener("aidos-theme", on);
  }, []);
  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);
  const cycle = useCallback(() => set(THEMES[(THEMES.indexOf(pref) + 1) % THEMES.length]), [pref, set]);
  return { pref, set, cycle };
}
