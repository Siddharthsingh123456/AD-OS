import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth.jsx";
import { Icon } from "../ui/Icon.jsx";
import { modulesFor } from "../../lib/modules";

export const openPalette = () => window.dispatchEvent(new Event("aidos-palette"));

export default function CommandPalette() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  const items = useMemo(() => {
    const go = (to) => () => nav(to);
    const site = [
      { g: "Website", icon: "website", name: "Home", run: go("/") },
      { g: "Website", icon: "marketplace", name: "Features", run: go("/features") },
      { g: "Website", icon: "github", name: "Pricing", run: go("/pricing") },
      { g: "Website", icon: "docs", name: "About", run: go("/about") },
      { g: "Website", icon: "admin", name: "Privacy", run: go("/privacy") },
      { g: "Website", icon: "pdf", name: "Terms", run: go("/terms") },
    ];
    if (!user)
      return [
        { g: "Account", icon: "settings", name: "Sign in", run: go("/login") },
        { g: "Account", icon: "deployment", name: "Create account", run: go("/register") },
        ...site,
      ];
    return [
      { g: "Workspace", icon: "dashboard", name: "Dashboard", hint: "Overview of everything", run: go("/app") },
      ...modulesFor(user).map((m) => ({
        g: m.group,
        icon: m.id,
        name: m.name,
        hint: m.desc,
        run: go(m.path),
      })),
      ...site,
      {
        g: "Account",
        icon: "website",
        name: "Sign out",
        run: () => {
          logout();
          nav("/");
        },
      },
    ];
  }, [user, nav, logout]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter((x) => (x.name + " " + (x.hint || "") + " " + x.g).toLowerCase().includes(t)) : items;
  }, [items, q]);

  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const ext = () => setOpen(true);
    window.addEventListener("keydown", key);
    window.addEventListener("aidos-palette", ext);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("aidos-palette", ext);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement;
    setQ("");
    setI(0);
    setTimeout(() => input.current?.focus(), 0);
    // Escape closes the palette even before focus has moved into it.
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("keydown", onEsc);
      before?.focus?.();
    };
  }, [open]);
  useEffect(() => {
    setI(0);
  }, [q]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [i]);

  if (!open) return null;
  const pick = (x) => {
    setOpen(false);
    x?.run();
  };
  const onKey = (e) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setI((n) => Math.min(shown.length - 1, n + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setI((n) => Math.max(0, n - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(shown[i]);
    }
  };

  return (
    <div className="pal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
        <input
          ref={input}
          className="pal-input"
          placeholder={user ? "Jump to an agent, tool or page…" : "Jump to a page…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          role="combobox"
          aria-expanded="true"
          aria-controls="pal-list"
          aria-activedescendant={shown[i] ? "pal-" + i : undefined}
        />
        <div className="pal-list" id="pal-list" role="listbox" ref={list}>
          {shown.length === 0 && <div className="pal-empty">Nothing matches “{q}”.</div>}
          {shown.map((x, n) => (
            <div
              key={x.g + x.name}
              id={"pal-" + n}
              role="option"
              aria-selected={n === i}
              className={"pal-item" + (n === i ? " on" : "")}
              onMouseMove={() => setI(n)}
              onClick={() => pick(x)}
            >
              <span className="pal-ico">
                <Icon name={x.icon} size={17} />
              </span>
              <span className="pal-name">
                {x.name}
                {x.hint && <small>{x.hint}</small>}
              </span>
              <span className="pal-g">{x.g}</span>
            </div>
          ))}
        </div>
        <div className="pal-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
