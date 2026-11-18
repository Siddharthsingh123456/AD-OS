import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { notifyAgents, useAgents } from "../../hooks/useAgents";
import { useDialog } from "../../components/ui/Dialog.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { useTitle } from "../../hooks/useTitle";

export default function Marketplace() {
  const dialog = useDialog();
  const toast = useToast();
  useTitle("Agent Marketplace");
  const [mk, setMk] = useState({ templates: [], community: [] });
  const { custom, refresh } = useAgents();
  const [tab, setTab] = useState("templates");
  const [cat, setCat] = useState("All");
  const [form, setForm] = useState({ name: "", icon: "🤖", tagline: "", system: "" });
  const [msg, setMsg] = useState(null);
  const load = useCallback(
    () =>
      api("/marketplace")
        .then(setMk)
        .catch((e) => setMsg({ err: e.message })),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, ok) => {
    setMsg(null);
    try {
      await fn();
      toast.success(ok);
      notifyAgents();
      refresh();
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const install = (id, name) =>
    act(() => api("/marketplace/install", { method: "POST", body: { id } }), `${name} added to My agents.`);
  const cats = ["All", ...new Set(mk.templates.map((t) => t.category))];
  const Card = ({ a, action, extra }) => (
    <div className="panel stack" style={{ gap: 8 }}>
      <div className="row">
        <span style={{ fontSize: 26 }}>{a.icon}</span>
        <div className="grow">
          <b>{a.name}</b>
          <div className="small muted">
            {a.category}
            {a.author ? ` · by ${a.author}` : ""}
            {a.installs !== undefined ? ` · ${a.installs} installs` : ""}
          </div>
        </div>
      </div>
      <div className="muted small" style={{ flex: 1 }}>
        {a.tagline}
      </div>
      <div className="row">
        {action}
        {extra}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1>Agent Marketplace</h1>
        <p>Install specialist agents, or build and publish your own. Installed agents appear in the sidebar.</p>
      </div>
      {msg?.err && (
        <div className="notice err" style={{ marginBottom: 14 }}>
          {msg.err}
        </div>
      )}
      {msg?.ok && (
        <div className="notice ok" style={{ marginBottom: 14 }}>
          {msg.ok}
        </div>
      )}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          ["templates", "Templates"],
          ["community", "Community"],
          ["mine", `My agents (${custom.length})`],
          ["create", "Create"],
        ].map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <>
          <div className="row wrap" style={{ marginBottom: 16 }}>
            {cats.map((c) => (
              <button key={c} className={"chip" + (cat === c ? " amber" : "")} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {mk.templates
              .filter((t) => cat === "All" || t.category === cat)
              .map((t) => (
                <Card
                  key={t.id}
                  a={t}
                  action={
                    <button className="btn sm primary" onClick={() => install(t.id, t.name)}>
                      Install
                    </button>
                  }
                />
              ))}
          </div>
        </>
      )}

      {tab === "community" &&
        (mk.community.length === 0 ? (
          <div className="panel muted">No community agents yet. Publish one from “My agents”.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {mk.community.map((a) => (
              <Card
                key={a.id}
                a={a}
                action={
                  a.mine ? (
                    <span className="chip">Yours</span>
                  ) : (
                    <button className="btn sm primary" onClick={() => install(a.id, a.name)}>
                      Install
                    </button>
                  )
                }
              />
            ))}
          </div>
        ))}

      {tab === "mine" &&
        (custom.length === 0 ? (
          <div className="panel muted">You haven't added any agents yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {custom.map((a) => (
              <Card
                key={a.id}
                a={a}
                action={
                  <Link className="btn sm primary" to={`/app/agents/${a.id}`}>
                    Open
                  </Link>
                }
                extra={
                  <>
                    <button
                      className="btn sm"
                      onClick={() =>
                        act(
                          () => api(`/agents/${a.id}`, { method: "PATCH", body: { isPublic: !a.isPublic } }),
                          a.isPublic ? "Unpublished." : "Published to the community.",
                        )
                      }
                    >
                      {a.isPublic ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      className="btn sm danger"
                      onClick={async () =>
                        (await dialog.confirm({
                          title: `Delete ${a.name}?`,
                          message:
                            "This removes the agent from your workspace. If it is published, it leaves the marketplace too.",
                          confirmLabel: "Delete agent",
                          danger: true,
                        })) && act(() => api(`/agents/${a.id}`, { method: "DELETE" }), "Agent deleted.")
                      }
                    >
                      Delete
                    </button>
                  </>
                }
              />
            ))}
          </div>
        ))}

      {tab === "create" && (
        <div className="panel stack" style={{ maxWidth: 680 }}>
          <div className="row">
            <label className="field" style={{ width: 90 }}>
              <span>Icon</span>
              <input
                className="input"
                maxLength={4}
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
            </label>
            <label className="field grow">
              <span>Name</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Tagline</span>
            <input
              className="input"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Instructions (system prompt)</span>
            <textarea
              className="textarea"
              style={{ minHeight: 160 }}
              placeholder="You are an expert in… Always… Never…"
              value={form.system}
              onChange={(e) => setForm({ ...form, system: e.target.value })}
            />
          </label>
          <button
            className="btn primary"
            style={{ alignSelf: "flex-start" }}
            disabled={!form.name.trim() || !form.system.trim()}
            onClick={() =>
              act(async () => {
                await api("/agents", { method: "POST", body: form });
                setForm({ name: "", icon: "🤖", tagline: "", system: "" });
                setTab("mine");
              }, "Agent created.")
            }
          >
            Create agent
          </button>
        </div>
      )}
    </div>
  );
}
