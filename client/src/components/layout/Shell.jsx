import { useEffect, useState } from "react";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth.jsx";
import { GROUPS, modulesFor } from "../../lib/modules";
import { useAgents } from "../../hooks/useAgents";
import { useTitle } from "../../hooks/useTitle";
import { Menu, Search, WifiOff, LogOut, ExternalLink, Eye } from "lucide-react";
import { Icon } from "../ui/Icon.jsx";
import { openPalette } from "../system/CommandPalette.jsx";

export default function Shell() {
  const { user, loading, logout } = useAuth();
  const { custom } = useAgents();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const loc = useLocation();
  const nav = useNavigate();
  const signOut = () => {
    logout();
    nav("/");
  };
  const visible = modulesFor(user);
  const here = visible.find((m) => loc.pathname === m.path);
  useTitle(loc.pathname === "/app" ? "Dashboard" : here?.name || "Workspace");
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (loading)
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className={"scrim" + (open ? " show" : "")} onClick={() => setOpen(false)} />
      <aside className={"sidebar" + (open ? " open" : "")}>
        <Link to="/app" className="brand">
          <span className="logo" />
          AI Developer OS
        </Link>
        <NavLink end to="/app" className="nav-link">
          <span className="ico">
            <Icon name="dashboard" />
          </span>
          Dashboard
        </NavLink>
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="nav-label">{g}</div>
            {visible
              .filter((m) => m.group === g)
              .map((m) => (
                <NavLink key={m.id} to={m.path} className="nav-link">
                  <span className="ico">
                    <Icon name={m.id} />
                  </span>
                  {m.name}
                </NavLink>
              ))}
            {g === "Platform" && custom.length > 0 && (
              <>
                <div className="nav-label">My agents</div>
                {custom.map((a) => (
                  <NavLink key={a.id} to={`/app/agents/${a.id}`} className="nav-link">
                    <span className="ico emoji-ico">{a.icon}</span>
                    {a.name}
                  </NavLink>
                ))}
              </>
            )}
          </div>
        ))}
      </aside>
      <div className="main">
        {!online && (
          <div className="offline" role="alert">
            <WifiOff size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            You are offline. Changes will not save until the connection returns.
          </div>
        )}
        {user.preview && (
          <div className="guest-bar" role="status">
            <Eye size={15} aria-hidden="true" />
            <span>
              <b>Preview mode.</b> The server database is not available, so every feature is view-only. Start the API
              with a database to use them.
            </span>
            <Link to="/login" className="btn sm primary">
              Sign in
            </Link>
          </div>
        )}
        <header className="topbar">
          <button className="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <button className="kbd-btn grow-btn" onClick={openPalette} aria-label="Search agents and pages">
            <Search size={15} aria-hidden="true" />
            <span>Jump to an agent or page…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="grow" />
          <ThemeToggle />
          <Link to="/" className="btn sm hide-sm">
            <ExternalLink size={14} />
            Website
          </Link>
          <div className="usr">
            <span className="avatar-sm">{(user.name || "?")[0].toUpperCase()}</span>
            <span className="small hide-sm">{user.name}</span>
            {user.preview ? (
              <span className="chip amber">view only</span>
            ) : (
              user.role === "admin" && <span className="chip amber">admin</span>
            )}
          </div>
          <button className="btn sm" onClick={signOut}>
            <LogOut size={14} />
            {user.preview ? "Exit preview" : "Sign out"}
          </button>
        </header>
        <main className="content" id="main" tabIndex={-1}>
          {user.preview ? (
            // `inert` removes the whole subtree from clicking, typing and tabbing (React 18 needs it as a string
            // attribute). The API client refuses preview writes too, so this is a second layer, not the only one.
            <div className="guest-lock" data-testid="guest-lock" aria-disabled="true" {...{ inert: "" }}>
              <Outlet />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
