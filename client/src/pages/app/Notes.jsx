import { useCallback, useEffect, useState } from "react";
import Markdown from "../../components/chat/Markdown.jsx";
import { api, runTask } from "../../lib/api";
import { useDialog } from "../../components/ui/Dialog.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { useTitle } from "../../hooks/useTitle";

const ACTIONS = [
  ["summarize", "Summarize"],
  ["keypoints", "Key points"],
  ["actions", "Action items"],
  ["improve", "Improve writing"],
];

export default function Notes() {
  const dialog = useDialog();
  const toast = useToast();
  useTitle("Notes & Summarizer");
  const [notes, setNotes] = useState([]);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [out, setOut] = useState(null);
  const [nlp, setNlp] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(
    () =>
      api("/notes")
        .then(setNotes)
        .catch((e) => setErr(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const current = notes.find((n) => n._id === sel);
  const dirty = current && (current.title !== draft.title || current.content !== draft.content);

  async function guarded(fn) {
    if (
      dirty &&
      !(await dialog.confirm({
        title: "Discard unsaved changes?",
        message: "This note has edits you have not saved.",
        confirmLabel: "Discard",
        danger: true,
      }))
    )
      return;
    fn();
  }
  const pick = (n) => {
    setSel(n._id);
    setDraft({ title: n.title, content: n.content });
    setOut(n.summary ? { key: "saved", label: "Saved summary", text: n.summary } : null);
    setNlp(null);
    setErr("");
  };
  async function create() {
    guarded(async () => {
      const n = await api("/notes", { method: "POST", body: { title: "Untitled note" } });
      await load();
      pick(n);
    });
  }
  async function save(extra = {}) {
    try {
      const n = await api(`/notes/${sel}`, { method: "PUT", body: { ...draft, ...extra } });
      await load();
      toast.success("Note saved.");
      return n;
    } catch (e) {
      toast.error(e.message);
    }
  }
  async function remove() {
    if (
      !(await dialog.confirm({
        title: "Delete this note?",
        message: `“${draft.title || "Untitled"}” will be permanently removed.`,
        confirmLabel: "Delete note",
        danger: true,
      }))
    )
      return;
    await api(`/notes/${sel}`, { method: "DELETE" });
    setSel(null);
    setOut(null);
    load();
    toast.success("Note deleted.");
  }
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && sel && dirty) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function ai(task, label) {
    if (!draft.content.trim()) {
      setErr("Write something in the note first.");
      return;
    }
    setBusy(label);
    setErr("");
    try {
      setOut({ key: task, label, text: await runTask(task, draft.content) });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }
  async function analyze() {
    setBusy("Analyzing");
    setErr("");
    try {
      setNlp(await api("/notes/analyze", { method: "POST", body: { text: draft.content } }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }
  async function suggestTags() {
    setBusy("Tagging");
    setErr("");
    try {
      const t = await runTask("tags", draft.content);
      await save({
        tags: t
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 6),
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  const shown = notes.filter((n) =>
    (n.title + n.content + (n.tags || []).join(" ")).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="page-head row">
        <div className="grow">
          <h1>Notes & Summarizer</h1>
          <p>Capture ideas, then summarize, extract actions and analyze them with NLP.</p>
        </div>
        <button className="btn primary" onClick={create}>
          New note
        </button>
      </div>
      <div className="split">
        <div className="panel" style={{ padding: 12 }}>
          <input
            className="input"
            placeholder="Search notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {shown.length === 0 && (
            <div className="small muted" style={{ padding: 8 }}>
              {notes.length ? "No matches." : "No notes yet. Create your first one."}
            </div>
          )}
          {shown.map((n) => (
            <div
              key={n._id}
              className={"list-item" + (n._id === sel ? " active" : "")}
              onClick={() => n._id !== sel && guarded(() => pick(n))}
            >
              <b>{n.title || "Untitled"}</b>
              <span className="small muted">
                {new Date(n.updatedAt).toLocaleDateString()}
                {n.tags?.length ? " · " + n.tags.slice(0, 3).join(", ") : ""}
              </span>
            </div>
          ))}
        </div>
        {!sel ? (
          <div className="panel muted">Select a note or create a new one.</div>
        ) : (
          <div className="stack">
            {err && <div className="notice err">{err}</div>}
            <div className="panel stack">
              <input
                className="input"
                style={{ fontSize: 18, fontWeight: 600 }}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Title"
              />
              <textarea
                className="textarea"
                style={{ minHeight: 260 }}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="Write or paste text…"
              />
              <div className="row wrap">
                <button className="btn primary" disabled={!dirty} onClick={() => save()}>
                  {dirty ? "Save (Ctrl+S)" : "Saved"}
                </button>
                {current?.tags?.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
                <div className="grow" />
                <button className="btn sm danger" onClick={remove}>
                  Delete
                </button>
              </div>
            </div>
            <div className="row wrap">
              {ACTIONS.map(([k, l]) => (
                <button key={k} className="btn" disabled={!!busy} onClick={() => ai(k, l)}>
                  {busy === l ? "Working…" : l}
                </button>
              ))}
              <button className="btn" disabled={!!busy} onClick={analyze}>
                {busy === "Analyzing" ? "Working…" : "NLP analysis"}
              </button>
              <button className="btn" disabled={!!busy} onClick={suggestTags}>
                {busy === "Tagging" ? "Working…" : "Suggest tags"}
              </button>
            </div>
            {nlp && (
              <div className="panel">
                <div className="panel-title">
                  NLP analysis{" "}
                  <span className="chip" style={{ marginLeft: 8 }}>
                    {nlp.source === "ml-service" ? "transformer model" : "local lexicon"}
                  </span>
                </div>
                <div className="row wrap">
                  <span
                    className={
                      "chip " +
                      (nlp.sentiment.label === "positive" ? "ok" : nlp.sentiment.label === "negative" ? "bad" : "")
                    }
                  >
                    sentiment: {nlp.sentiment.label} ({nlp.sentiment.score})
                  </span>
                  <span className="chip">{nlp.words} words</span>
                  <span className="chip">~{nlp.readingMinutes} min read</span>
                  {nlp.keywords.map((k) => (
                    <span key={k} className="chip amber">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {out && (
              <div className="panel">
                <div className="panel-title">{out.label}</div>
                <Markdown text={out.text} />
                <div className="row" style={{ marginTop: 12 }}>
                  {out.key === "summarize" && (
                    <button className="btn sm" onClick={() => save({ summary: out.text })}>
                      Save as note summary
                    </button>
                  )}
                  {out.key === "improve" && (
                    <button className="btn sm" onClick={() => setDraft({ ...draft, content: out.text })}>
                      Replace note text
                    </button>
                  )}
                  <button
                    className="btn sm"
                    onClick={() =>
                      navigator.clipboard?.writeText(out.text).then(() => toast.success("Copied to clipboard."))
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
