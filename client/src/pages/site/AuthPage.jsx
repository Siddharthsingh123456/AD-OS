import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth.jsx";
import { MODULE_WORD } from "../../lib/site";
import { useTitle } from "../../hooks/useTitle";

function strength(p) {
  let n = 0;
  if (p.length >= 8) n++;
  if (p.length >= 12) n++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) n++;
  return n;
}
const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

export default function AuthPage({ mode }) {
  const { user, login, register, demo, skip } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || "/app";
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [demoOn, setDemoOn] = useState(false);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => {
        setDemoOn(!!h.demo);
      })
      .catch(() => {});
  }, []);
  async function tryDemo() {
    setErr("");
    setBusy(true);
    try {
      await demo();
      nav(from, { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }
  async function skipForNow() {
    setErr("");
    setBusy(true);
    try {
      await skip();
      nav("/app", { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }
  const isReg = mode === "register";
  useTitle(isReg ? "Create account" : "Sign in");
  const sc = strength(f.password);
  if (user) return <Navigate to={from} replace />;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await (isReg ? register(f) : login(f));
      nav(from, { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" className="brand" style={{ padding: 0 }}>
          <span className="logo" />
          AI Developer OS
        </Link>
        <h2>Pick up where your last agent left off.</h2>
        <ul>
          <li>{MODULE_WORD[0].toUpperCase() + MODULE_WORD.slice(1)} modules behind one login</li>
          <li>A memory every agent reads</li>
          <li>Search across your PDFs, docs and repos</li>
        </ul>
      </aside>
      <main className="auth-main" id="main">
        <form className="stack" onSubmit={submit} style={{ gap: 14 }}>
          <Link to="/" className="brand auth-brand" style={{ padding: 0 }}>
            <span className="logo" />
            AI Developer OS
          </Link>
          <div>
            <h1>{isReg ? "Create your account" : "Welcome back"}</h1>
            <p className="muted">
              {isReg ? "The first account on a new deployment becomes the admin." : "Sign in to your workspace."}
            </p>
          </div>
          {err && (
            <div className="notice err" role="alert">
              {err}
            </div>
          )}
          {isReg && (
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                required
                autoComplete="name"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="pw">
              <input
                className="input"
                type={show ? "text" : "password"}
                required
                minLength={isReg ? 8 : 1}
                autoComplete={isReg ? "new-password" : "current-password"}
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
              />
              <button
                type="button"
                className="pw-btn"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            {isReg && f.password && (
              <div className="meter" aria-live="polite">
                <div className={"meter-bar s" + sc}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <small className="muted">
                  {LABELS[sc]}
                  {sc < 3 ? " — add length, mixed case, numbers or symbols" : ""}
                </small>
              </div>
            )}
            {isReg && !f.password && <small className="muted">At least 8 characters.</small>}
          </label>
          <button className="btn primary lg block" disabled={busy}>
            {busy ? "Please wait…" : isReg ? "Create account" : "Sign in"}
          </button>
          {demoOn && (
            <button type="button" className="btn block" disabled={busy} onClick={tryDemo}>
              Try the demo with sample data
            </button>
          )}
          <div className="skip-login">
            <button type="button" className="btn ghost block" disabled={busy} onClick={skipForNow}>
              Skip for now
            </button>
            <small className="muted">
              Opens the workspace without an account. If guest sign-in is unavailable, a view-only preview opens instead.
            </small>
          </div>
          <div className="small muted">
            {isReg ? (
              <>
                Already have an account?{" "}
                <Link to="/login" style={{ color: "var(--amber)" }}>
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/register" style={{ color: "var(--amber)" }}>
                  Create an account
                </Link>
              </>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
