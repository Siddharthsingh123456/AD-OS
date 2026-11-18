import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth.jsx";
import { openPalette } from "../system/CommandPalette.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";

const LINKS = [
  ["Features", "/features"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
];

export const Brand = ({ to = "/" }) => (
  <Link to={to} className="brand" style={{ padding: 0 }}>
    <span className="logo" />
    AI Developer OS
  </Link>
);

export default function SiteLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    setOpen(false);
  }, [pathname]);
  const signOut = () => {
    logout();
    nav("/");
  };

  const actions = user ? (
    <>
      <Link className="btn primary" to="/app">
        Open workspace
      </Link>
      <button className="btn" onClick={signOut}>
        Sign out
      </button>
    </>
  ) : (
    <>
      <Link className="btn" to="/login">
        Sign in
      </Link>
      <Link className="btn primary" to="/register">
        Get started
      </Link>
    </>
  );

  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className={"s-head" + (scrolled ? " scrolled" : "")}>
        <div className="s-wrap">
          <Brand />
          <nav className="s-links" aria-label="Main">
            {LINKS.map(([l, to]) => (
              <NavLink key={to} to={to}>
                {l}
              </NavLink>
            ))}
          </nav>
          <div className="s-actions hide-sm">
            <button className="kbd-btn" onClick={openPalette} aria-label="Open command palette">
              <span>Search</span>
              <kbd>Ctrl K</kbd>
            </button>
            <ThemeToggle />
            {actions}
          </div>
          <button className="s-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
        {open && (
          <div className="s-mobile">
            {LINKS.map(([l, to]) => (
              <NavLink key={to} to={to}>
                {l}
              </NavLink>
            ))}
            <div className="row" style={{ paddingTop: 8 }}>
              <ThemeToggle />
              {actions}
            </div>
          </div>
        )}
      </header>
      <div id="main" tabIndex={-1} style={{ outline: "none" }}>
        <Outlet />
      </div>
      <Footer user={user} />
    </div>
  );
}

function Footer({ user }) {
  return (
    <footer className="s-foot">
      <div className="s-wrap">
        <div className="foot-grid">
          <div>
            <Brand />
            <p className="muted" style={{ maxWidth: 320, margin: "14px 0 18px" }}>
              One workspace. Every developer tool. One AI brain. Chat, code, search and ship from a single login.
            </p>
            <Link className="btn primary sm" to={user ? "/app" : "/register"}>
              {user ? "Open workspace" : "Create free account"}
            </Link>
          </div>
          <div>
            <h2>Product</h2>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to={user ? "/app" : "/login"}>Workspace</Link>
          </div>
          <div>
            <h2>Company</h2>
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            {!user && <Link to="/login">Sign in</Link>}
            {!user && <Link to="/register">Create account</Link>}
          </div>
          <div>
            <h2>Under the hood</h2>
            <span>MongoDB and Express</span>
            <span>React and Node</span>
            <span>Claude API</span>
            <span>FastAPI ML service</span>
          </div>
        </div>
        <div className="foot-mark" aria-hidden="true">
          AI Developer OS
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} AI Developer OS. All rights reserved.</span>
          <span>Made for people who ship.</span>
        </div>
      </div>
    </footer>
  );
}
