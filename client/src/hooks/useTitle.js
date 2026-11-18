import { useEffect } from "react";

const BASE = "AI Developer OS";
const DEFAULT_DESC =
  "One workspace. Every developer tool. One AI brain. Chat, code, research, query, test, debug and deploy with agents that share one memory.";

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/** Sets the tab title, meta description, canonical URL and Open Graph tags for the current page. */
export function useTitle(title, description) {
  useEffect(() => {
    const full = title ? `${title} · ${BASE}` : `${BASE}: One workspace. Every developer tool. One AI brain.`;
    const desc = description || DEFAULT_DESC;
    const url = window.location.origin + window.location.pathname;
    document.title = full;
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", full);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('link[rel="canonical"]', "href", url);
  }, [title, description]);
}
