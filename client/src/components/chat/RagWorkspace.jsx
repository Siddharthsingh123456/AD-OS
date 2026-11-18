import { useCallback, useEffect, useRef, useState } from "react";
import ChatWorkspace from "./ChatWorkspace.jsx";
import { api } from "../../lib/api";

const TEXT_EXT =
  /\.(txt|md|mdx|json|js|jsx|ts|tsx|py|java|go|rs|rb|php|c|cpp|h|cs|sql|sh|yml|yaml|html|css|csv|log|toml|ini)$/i;
const readText = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsText(f);
  });

/** Knowledge-base panel (upload / paste / GitHub import) + grounded chat for a RAG collection. */
export default function RagWorkspace({ agent }) {
  const collection = agent.collection;
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [paste, setPaste] = useState({ name: "", text: "" });
  const [repo, setRepo] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(
    () =>
      api(`/rag/docs?collection=${collection}`)
        .then(setDocs)
        .catch((e) => setMsg({ err: e.message })),
    [collection],
  );
  useEffect(() => {
    load();
    setHits(null);
  }, [load]);

  async function run(label, fn) {
    setBusy(label);
    setMsg(null);
    try {
      const r = await fn();
      await load();
      return r;
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setBusy("");
    }
  }

  const upload = (e) =>
    run("Indexing files…", async () => {
      const files = [...e.target.files].filter((f) => TEXT_EXT.test(f.name) && f.size < 600000);
      if (!files.length) throw new Error("Choose text, markdown or source-code files (under 600 KB each).");
      const items = [];
      for (const f of files) items.push({ name: f.webkitRelativePath || f.name, text: await readText(f) });
      let added = 0;
      for (let i = 0; i < items.length; i += 10)
        added += (await api("/rag/docs/batch", { method: "POST", body: { collection, files: items.slice(i, i + 10) } }))
          .added;
      setMsg({ ok: `Indexed ${added} file${added === 1 ? "" : "s"}.` });
      e.target.value = "";
    });
  const addPaste = () =>
    run("Indexing…", async () => {
      await api("/rag/docs", {
        method: "POST",
        body: { collection, name: paste.name || "Pasted text", text: paste.text },
      });
      setPaste({ name: "", text: "" });
      setMsg({ ok: "Indexed." });
    });
  const importRepo = () =>
    run("Importing repository…", async () => {
      const r = await api("/rag/github", { method: "POST", body: { repo } });
      setMsg({ ok: `Indexed ${r.added} files from ${r.repo}@${r.branch}.` });
      setRepo("");
    });
  const remove = (id) => run("", () => api(`/rag/docs/${id}`, { method: "DELETE" }));
  const search = async () => {
    if (!query.trim()) return;
    setBusy("Searching…");
    try {
      setHits((await api("/rag/search", { method: "POST", body: { collection, query } })).hits);
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="rag-grid">
      <aside>
        <div>
          <div className="panel-title" style={{ marginBottom: 4 }}>
            Knowledge base
          </div>
          <div className="small muted">
            {docs.length} source{docs.length === 1 ? "" : "s"} · {docs.reduce((a, d) => a + (d.chunks || 0), 0)} chunks
            indexed
          </div>
        </div>
        {busy && (
          <div className="notice row">
            <span className="spinner" />
            {busy}
          </div>
        )}
        {msg?.err && <div className="notice err">{msg.err}</div>}
        {msg?.ok && <div className="notice ok">{msg.ok}</div>}

        <input ref={fileRef} type="file" multiple hidden onChange={upload} />
        <button className="btn block" onClick={() => fileRef.current.click()}>
          Upload files
        </button>
        {collection === "codebase" && (
          <div className="stack" style={{ gap: 8 }}>
            <input
              className="input"
              placeholder="owner/repo (public GitHub)"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
            <button className="btn block" disabled={!repo.trim() || !!busy} onClick={importRepo}>
              Import repository
            </button>
          </div>
        )}
        <details>
          <summary className="small muted" style={{ cursor: "pointer" }}>
            Paste text
          </summary>
          <div className="stack" style={{ marginTop: 8, gap: 8 }}>
            <input
              className="input"
              placeholder="Title"
              value={paste.name}
              onChange={(e) => setPaste({ ...paste, name: e.target.value })}
            />
            <textarea
              className="textarea"
              placeholder="Paste content to index"
              value={paste.text}
              onChange={(e) => setPaste({ ...paste, text: e.target.value })}
            />
            <button className="btn" disabled={!paste.text.trim() || !!busy} onClick={addPaste}>
              Index text
            </button>
          </div>
        </details>

        <div className="stack" style={{ gap: 4 }}>
          {docs.map((d) => (
            <div key={d._id} className="conv" style={{ cursor: "default" }}>
              <span title={d.name}>{d.name}</span>
              <span className="small muted" style={{ flex: "none" }}>
                {d.chunks}
              </span>
              <button style={{ opacity: 1 }} aria-label={`Remove ${d.name}`} onClick={() => remove(d._id)}>
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>
            Semantic search (no LLM)
          </div>
          <div className="row">
            <input
              className="input"
              value={query}
              placeholder="Search passages…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button className="btn sm" onClick={search}>
              Go
            </button>
          </div>
          {hits && (
            <div className="stack" style={{ marginTop: 10, gap: 8 }}>
              {hits.length === 0 && <div className="small muted">No matches.</div>}
              {hits.map((h, i) => (
                <div key={i} className="small">
                  <b>{h.name}</b> <span className="muted">· {h.score}</span>
                  <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                    {h.text.slice(0, 220)}…
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
      <div className="rag-chat">
        <ChatWorkspace
          agent={agent}
          convKey={`rag:${collection}`}
          collection={collection}
          blocked={docs.length === 0}
          blockedMsg="Add a source on the left to start asking questions"
        />
      </div>
    </div>
  );
}
