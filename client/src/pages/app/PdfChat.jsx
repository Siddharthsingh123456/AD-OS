import { useCallback, useEffect, useRef, useState } from "react";
import ChatWorkspace from "../../components/chat/ChatWorkspace.jsx";
import { api } from "../../lib/api";
import { useAgents } from "../../hooks/useAgents";

export default function PdfChat() {
  const { builtin } = useAgents();
  const agent = builtin.find((a) => a.id === "pdf");
  const [docs, setDocs] = useState([]);
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const load = useCallback(
    () =>
      api("/rag/docs?collection=pdf")
        .then((d) => {
          setDocs(d);
          setSel((s) => s || d[0]?._id || "");
        })
        .catch((e) => setErr(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErr("PDF must be 4 MB or smaller.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api("/rag/pdf", { method: "POST", form });
      await load();
      setSel(r.id);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  async function remove() {
    if (!sel) return;
    await api(`/rag/docs/${sel}`, { method: "DELETE" });
    setSel("");
    await load();
  }

  if (!agent)
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    );
  const current = docs.find((d) => d._id === sel);
  return (
    <div className="fill-col">
      <div className="toolbar">
        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={upload} />
        <button className="btn primary" disabled={busy} onClick={() => fileRef.current.click()}>
          {busy ? "Reading PDF…" : "Upload PDF"}
        </button>
        <select
          className="select"
          style={{ maxWidth: 360 }}
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          disabled={!docs.length}
        >
          {!docs.length && <option>No PDFs yet</option>}
          {docs.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
        {current && <span className="chip">{current.source?.replace("pdf · ", "")}</span>}
        {sel && (
          <button className="btn sm danger" onClick={remove}>
            Delete
          </button>
        )}
        {err && <span className="notice err small">{err}</span>}
      </div>
      <ChatWorkspace
        agent={agent}
        convKey={`pdf:${sel || "none"}`}
        collection="pdf"
        docId={sel || undefined}
        blocked={!sel}
        blockedMsg="Upload a PDF to start chatting"
      />
    </div>
  );
}
