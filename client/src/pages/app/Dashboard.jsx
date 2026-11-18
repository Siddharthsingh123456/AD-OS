import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth.jsx";
import { GROUPS, MODULES, modulesFor } from "../../lib/modules";
import { Icon } from "../../components/ui/Icon.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useTitle } from "../../hooks/useTitle";
import { ago } from "../../lib/format";

const RAG_MODULE = { general: "rag", codebase: "codebase", docs: "docs" };

/** Maps a stored conversation key (e.g. "code", "rag:docs", "pdf:<id>", "<agentId>") to the page that reopens it. */
function destination(key = "") {
  if (key.startsWith("rag:")) return RAG_MODULE[key.slice(4)] || "rag";
  if (key.startsWith("pdf")) return "pdf";
  if (key === "interview") return "quiz";
  if (/^[a-f0-9]{24}$/i.test(key)) return null;
  return MODULES.some((m) => m.id === key) ? key : "chat";
}

export default function Dashboard() {
  useTitle("Dashboard");
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [health, setHealth] = useState(null);
  useEffect(() => {
    api("/auth/stats")
      .then(setStats)
      .catch(() => setStats({}));
    api("/chat/recent")
      .then(setRecent)
      .catch(() => setRecent([]));
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const empty = stats && stats.chats + stats.notes + stats.docs + stats.memories === 0;

  return (
    <div className="page">
      <div className="page-head">
        <h1>{user ? `${hello}, ${user.name.split(" ")[0]}.` : "Welcome to AI Developer OS."}</h1>
        <p>
          {user
            ? "Pick an agent, or open a knowledge base and ask it anything."
            : "Every agent and knowledge base is shown below. Sign in to start using them."}
        </p>
      </div>
      {health && (!health.ok || !health.llm) && (
        <div className="notice warn" style={{ marginBottom: 18 }}>
          {!health.ok ? "Cannot reach the API." : "No server-side LLM key is configured."} Set{" "}
          <span className="mono">ANTHROPIC_API_KEY</span> in your environment, or paste your own key in{" "}
          <Link to="/app/settings" style={{ textDecoration: "underline" }}>
            Settings
          </Link>
          .
        </div>
      )}
      {user && empty && (
        <div className="panel onboard">
          <div className="panel-title">Get started in three steps</div>
          <div className="onboard-steps">
            <Link to="/app/memory">
              <b>1. Tell it about you</b>
              <span>Save your stack and habits once. Every agent reads them.</span>
            </Link>
            <Link to="/app/rag">
              <b>2. Add something to search</b>
              <span>Upload a PDF or paste docs, then ask questions with sources.</span>
            </Link>
            <Link to="/app/chat">
              <b>3. Ask your first question</b>
              <span>Open AI Chat and see your memory at work.</span>
            </Link>
          </div>
        </div>
      )}
      <div className="strip">
        {[
          ["chats", "Conversations"],
          ["notes", "Notes"],
          ["docs", "Indexed sources"],
          ["projects", "Projects"],
          ["memories", "Memories"],
        ].map(([k, l]) => (
          <div key={k}>
            <b>{stats ? (stats[k] ?? 0) : <Skeleton h={28} w={36} />}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>

      {recent && recent.length > 0 && (
        <div className="index-group">
          <h2>Continue where you left off</h2>
          <div className="recent-list">
            {recent.map((c) => {
              const to = destination(c.agent);
              const mod = MODULES.find((m) => m.id === to);
              return (
                <Link
                  key={c._id}
                  to={mod ? mod.path : to ? `/app/${to}` : `/app/agents/${c.agent}`}
                  className="recent-row"
                >
                  <span className="ico">
                    <Icon name={to || "marketplace"} size={16} />
                  </span>
                  <b>{c.title || "Untitled conversation"}</b>
                  <small>{ago(c.updatedAt)}</small>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {GROUPS.map((g) => {
        const mods = modulesFor(user).filter((m) => m.group === g);
        return (
          <div className="index-group" key={g}>
            <h2>{g}</h2>
            <div className="tiles" data-n={mods.length}>
              {mods.map((m) => (
                <Link to={m.path} key={m.id} className="index-row">
                  <span className="ico">
                    <Icon name={m.id} />
                  </span>
                  <b>{m.name}</b>
                  <span>{m.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
