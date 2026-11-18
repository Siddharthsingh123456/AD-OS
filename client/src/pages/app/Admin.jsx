import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth.jsx";
import { useDialog } from "../../components/ui/Dialog.jsx";
import { useTitle } from "../../hooks/useTitle";

export default function Admin() {
  const { user } = useAuth();
  const dialog = useDialog();
  useTitle("Admin");
  const [o, setO] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const load = useCallback(
    () =>
      Promise.all([api("/admin/overview"), api("/admin/users")])
        .then(([a, b]) => {
          setO(a);
          setUsers(b);
        })
        .catch((e) => setErr(e.message)),
    [],
  );
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);
  if (user?.role !== "admin") return <Navigate to="/app" replace />;
  const act = async (fn) => {
    setErr("");
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };
  const max = Math.max(1, ...(o?.daily || []).map((d) => d.n));
  const maxKind = Math.max(1, ...(o?.topFeatures || []).map((d) => d.n));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Admin Dashboard</h1>
        <p>Usage, users and system health.</p>
      </div>
      {err && (
        <div className="notice err" style={{ marginBottom: 14 }}>
          {err}
        </div>
      )}
      {!o ? (
        <div className="spinner" />
      ) : (
        <div className="stack" style={{ gap: 18 }}>
          <div className="strip" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {[
              ["Users", "users"],
              ["Conversations", "conversations"],
              ["AI requests", "requests"],
              ["Notes", "notes"],
              ["Sources", "docs"],
              ["Chunks", "chunks"],
              ["Projects", "projects"],
              ["Agents", "agents"],
            ].map(([l, k]) => (
              <div key={k}>
                <b>{o.counts[k]}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="split" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="panel">
              <div className="panel-title">AI requests · last 14 days</div>
              {o.daily.length === 0 ? (
                <div className="muted small">No activity yet.</div>
              ) : (
                <div className="cols">
                  {o.daily.map((d) => (
                    <div key={d.day} title={d.day}>
                      <span>{d.n}</span>
                      <i style={{ height: `${(d.n / max) * 100}%` }} />
                      <span>{d.day.slice(8)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel">
              <div className="panel-title">Most used features</div>
              <div className="bars">
                {o.topFeatures.length === 0 && <div className="muted small">No activity yet.</div>}
                {o.topFeatures.map((k) => (
                  <div className="bar" key={k.kind}>
                    <span>{k.kind}</span>
                    <div className="track">
                      <i style={{ width: `${(k.n / maxKind) * 100}%` }} />
                    </div>
                    <span>{k.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {o.system.warnings?.length > 0 && (
            <div className="notice warn stack" style={{ gap: 4 }}>
              {o.system.warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          )}
          <div className="panel">
            <div className="panel-title">System health</div>
            <div className="row wrap">
              <span className={"chip " + (o.system.llm ? "ok" : "bad")}>
                LLM key {o.system.llm ? "configured" : "missing"}
              </span>
              <span className="chip">model: {o.system.model}</span>
              <span className="chip">v{o.system.version}</span>
              <span className={"chip " + (o.system.ml ? "ok" : "")}>
                ML service {o.system.ml ? "connected" : "not set (local NLP + BM25)"}
              </span>
              <span className={"chip " + (o.system.webSearch ? "ok" : "")}>
                web search {o.system.webSearch ? "on" : "off"}
              </span>
              <span className={"chip " + (o.system.githubToken ? "ok" : "")}>
                GitHub token {o.system.githubToken ? "set" : "not set"}
              </span>
              <span className={"chip " + (o.system.jwtSecret ? "ok" : "amber")}>
                JWT_SECRET {o.system.jwtSecret ? "set" : "derived — set one"}
              </span>
            </div>
          </div>
          <div className="panel flush scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <b>{u.name}</b>
                      <div className="small muted">{u.email}</div>
                    </td>
                    <td>
                      <select
                        className="select"
                        aria-label={`Role for ${u.name}`}
                        style={{ width: 110 }}
                        value={u.role}
                        disabled={u._id === user.id}
                        onChange={(e) =>
                          act(() => api(`/admin/users/${u._id}`, { method: "PATCH", body: { role: e.target.value } }))
                        }
                      >
                        <option>user</option>
                        <option>admin</option>
                      </select>
                    </td>
                    <td className="muted small">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: "right" }}>
                      {u._id !== user.id && (
                        <button
                          className="btn sm danger"
                          onClick={async () =>
                            (await dialog.confirm({
                              title: `Delete ${u.name}?`,
                              message: "Their account and all of their data will be permanently removed.",
                              confirmLabel: "Delete user",
                              danger: true,
                            })) && act(() => api(`/admin/users/${u._id}`, { method: "DELETE" }))
                          }
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
