import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, download, getSettings, saveSettings } from "../../lib/api";
import { THEMES, useTheme } from "../../lib/theme";
import { useToast } from "../../components/ui/Toast.jsx";
import { useTitle } from "../../hooks/useTitle";
import { useAuth } from "../../lib/auth.jsx";

export default function Settings() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  useTitle("Settings");
  const [s, setS] = useState(getSettings());
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [del, setDel] = useState({ open: false, password: "", err: "", busy: false });

  const { pref, set: setTheme } = useTheme();
  const [bill, setBill] = useState(null);
  useEffect(() => {
    api("/billing/status")
      .then(setBill)
      .catch(() => setBill({ enabled: false, plan: user.plan || "starter" }));
  }, [user.plan]);
  async function goBilling(path, body) {
    try {
      const r = await api(path, { method: "POST", body });
      window.location.assign(r.url);
    } catch (x) {
      toast.error(x.message);
    }
  }

  const save = () => {
    saveSettings(s);
    setSaved(true);
    toast.success("Settings saved in this browser.");
    setTimeout(() => setSaved(false), 2000);
  };
  async function exportData() {
    try {
      download("ai-developer-os-export.json", JSON.stringify(await api("/auth/export"), null, 2), "application/json");
      toast.success("Your data export has downloaded.");
    } catch (x) {
      toast.error(x.message);
    }
  }
  async function changePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    try {
      await api("/auth/password", { method: "POST", body: pw });
      setPw({ current: "", next: "" });
      setPwMsg({ ok: true, text: "Password updated. Other devices have been signed out." });
    } catch (x) {
      setPwMsg({ ok: false, text: x.message });
    }
  }
  async function deleteAccount(e) {
    e.preventDefault();
    setDel({ ...del, busy: true, err: "" });
    try {
      await api("/auth/delete-account", { method: "POST", body: { password: del.password } });
      logout();
      nav("/");
    } catch (x) {
      setDel({ ...del, busy: false, err: x.message });
    }
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Settings</h1>
        <p>
          Signed in as {user.name} ({user.email}).
        </p>
      </div>
      <div className="stack" style={{ gap: 18 }}>
        <div className="panel stack">
          <div className="panel-title">Appearance</div>
          <p className="muted small">Choose how the workspace looks. System follows your device setting.</p>
          <div className="seg" role="group" aria-label="Theme">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                className={pref === t ? "on" : ""}
                aria-pressed={pref === t}
                onClick={() => setTheme(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="panel stack">
          <div className="panel-title">Plan</div>
          <p className="muted small">
            You are on the{" "}
            <b style={{ color: "var(--text)", textTransform: "capitalize" }}>{bill?.plan || user.plan || "starter"}</b>{" "}
            plan. {bill && !bill.enabled && "Billing is not enabled on this deployment, so every feature is available."}
          </p>
          {bill?.enabled && (
            <div className="row wrap">
              {bill.plan === "starter" ? (
                <>
                  <button
                    className="btn primary"
                    onClick={() => goBilling("/billing/checkout", { plan: "pro", interval: "monthly" })}
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    className="btn"
                    onClick={() => goBilling("/billing/checkout", { plan: "team", interval: "monthly" })}
                  >
                    Choose Team
                  </button>
                </>
              ) : (
                <button className="btn" onClick={() => goBilling("/billing/portal")}>
                  Manage subscription
                </button>
              )}
            </div>
          )}
        </div>

        <div className="panel stack">
          <div className="panel-title">Bring your own keys</div>
          <p className="muted small">
            Optional. Keys are stored only in this browser and sent with your requests; they take priority over the
            server's keys.
          </p>
          <label className="field">
            <span>Anthropic API key</span>
            <input
              className="input mono"
              type="password"
              autoComplete="off"
              placeholder="sk-ant-…"
              value={s.apiKey || ""}
              onChange={(e) => setS({ ...s, apiKey: e.target.value.trim() })}
            />
          </label>
          <label className="field">
            <span>GitHub token (raises rate limits for Analytics)</span>
            <input
              className="input mono"
              type="password"
              autoComplete="off"
              placeholder="ghp_…"
              value={s.githubToken || ""}
              onChange={(e) => setS({ ...s, githubToken: e.target.value.trim() })}
            />
          </label>
          <div className="row">
            <button className="btn primary" onClick={save}>
              Save settings
            </button>
            {saved && <span className="chip ok">Saved</span>}
          </div>
        </div>

        <form className="panel stack" onSubmit={changePassword}>
          <div className="panel-title">Change password</div>
          {pwMsg && (
            <div className={"notice " + (pwMsg.ok ? "ok" : "err")} role="status">
              {pwMsg.text}
            </div>
          )}
          <label className="field">
            <span>Current password</span>
            <input
              className="input"
              type="password"
              required
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </label>
          <label className="field">
            <span>New password (at least 8 characters)</span>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </label>
          <div>
            <button className="btn primary">Update password</button>
          </div>
        </form>

        <div className="panel stack">
          <div className="panel-title">Your data</div>
          <p className="muted small">
            Download your conversations, notes, memory, projects, resume and quiz scores as one JSON file.
          </p>
          <div>
            <button className="btn" onClick={exportData}>
              Export my data
            </button>
          </div>
        </div>

        <div className="panel stack danger-zone">
          <div className="panel-title">Delete account</div>
          <p className="muted small">
            Permanently removes your account, chats, notes, memory, documents, projects, resume and published agents.
            This cannot be undone.
          </p>
          {!del.open ? (
            <div>
              <button className="btn danger" onClick={() => setDel({ ...del, open: true })}>
                Delete my account…
              </button>
            </div>
          ) : (
            <form className="stack" onSubmit={deleteAccount}>
              {del.err && (
                <div className="notice err" role="alert">
                  {del.err}
                </div>
              )}
              <label className="field">
                <span>Enter your password to confirm</span>
                <input
                  className="input"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={del.password}
                  onChange={(e) => setDel({ ...del, password: e.target.value })}
                />
              </label>
              <div className="row">
                <button className="btn danger" disabled={del.busy}>
                  {del.busy ? "Deleting…" : "Delete everything"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDel({ open: false, password: "", err: "", busy: false })}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
