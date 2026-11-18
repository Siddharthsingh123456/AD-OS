import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "../../components/chat/Markdown.jsx";
import { api, download, runTask } from "../../lib/api";
import { useDialog } from "../../components/ui/Dialog.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { useTitle } from "../../hooks/useTitle";

const ACTIONS = [
  ["explain_code", "Explain"],
  ["refactor", "Refactor"],
  ["tests", "Write tests"],
  ["bugs", "Find bugs"],
  ["docs", "Document"],
];

export default function Files() {
  const dialog = useDialog();
  const toast = useToast();
  useTitle("Project Manager");
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(null);
  const [fid, setFid] = useState(null);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);
  const upRef = useRef(null);

  const load = useCallback(
    () =>
      api("/projects")
        .then((p) => {
          setProjects(p);
          return p;
        })
        .catch((e) => setErr(e.message)),
    [],
  );
  useEffect(() => {
    load().then((p) => p?.[0] && setPid(p[0]._id));
  }, [load]);
  const project = projects.find((p) => p._id === pid);
  const file = project?.files.find((f) => f._id === fid);

  const patchLocal = (files) => {
    setProjects((ps) => ps.map((p) => (p._id === pid ? { ...p, files } : p)));
    setDirty(true);
  };
  async function save() {
    try {
      const p = await api(`/projects/${pid}`, { method: "PUT", body: { name: project.name, files: project.files } });
      setProjects((ps) => ps.map((x) => (x._id === pid ? p : x)));
      setDirty(false);
      toast.success("Project saved.");
    } catch (e) {
      setErr(e.message);
    }
  }
  async function newProject() {
    const name = await dialog.prompt({
      title: "New project",
      label: "Project name",
      placeholder: "e.g. billing-service",
      confirmLabel: "Create project",
    });
    if (!name) return;
    const p = await api("/projects", { method: "POST", body: { name } });
    await load();
    setPid(p._id);
    setFid(null);
  }
  async function delProject() {
    if (
      !(await dialog.confirm({
        title: `Delete “${project.name}”?`,
        message: "The project and all of its files will be permanently removed.",
        confirmLabel: "Delete project",
        danger: true,
      }))
    )
      return;
    await api(`/projects/${pid}`, { method: "DELETE" });
    setPid(null);
    setFid(null);
    load().then((p) => p?.[0] && setPid(p[0]._id));
  }
  async function newFile() {
    const path = await dialog.prompt({
      title: "New file",
      label: "File path",
      placeholder: "src/index.js",
      confirmLabel: "Add file",
      maxLength: 200,
    });
    if (!path) return;
    patchLocal([...project.files, { path, content: "" }]);
  }
  async function addFiles(e) {
    const added = [];
    for (const f of [...e.target.files].slice(0, 40))
      if (f.size < 300000) added.push({ path: f.webkitRelativePath || f.name, content: await f.text() });
    patchLocal([...project.files, ...added]);
    e.target.value = "";
  }
  async function act(task, label) {
    setBusy(label);
    setErr("");
    try {
      setOut({ label: `${label} — ${file.path}`, text: await runTask(task, file.content, `File: ${file.path}`) });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="page-head row wrap">
        <div className="grow">
          <h1>Project Manager</h1>
          <p>
            Keep project files in the cloud and run AI actions on any file. Index a project in Codebase RAG to chat with
            it.
          </p>
        </div>
        <button className="btn primary" onClick={newProject}>
          New project
        </button>
      </div>
      {err && (
        <div className="notice err" style={{ marginBottom: 14 }}>
          {err}
        </div>
      )}
      <div className="split" style={{ gridTemplateColumns: "280px 1fr" }}>
        <div className="panel stack" style={{ padding: 12 }}>
          <select
            className="select"
            value={pid || ""}
            onChange={(e) => {
              setPid(e.target.value);
              setFid(null);
              setOut(null);
            }}
          >
            {!projects.length && <option value="">No projects yet</option>}
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          {project && (
            <>
              <div className="row">
                <button className="btn sm grow" onClick={newFile}>
                  New file
                </button>
                <input ref={upRef} type="file" multiple hidden onChange={addFiles} />
                <button className="btn sm grow" onClick={() => upRef.current.click()}>
                  Upload
                </button>
              </div>
              <div>
                {project.files.length === 0 && <div className="small muted">No files yet.</div>}
                {[...project.files]
                  .sort((a, b) => a.path.localeCompare(b.path))
                  .map((f) => (
                    <div
                      key={f._id || f.path}
                      className={"list-item" + (f._id && f._id === fid ? " active" : "")}
                      onClick={() => {
                        if (!f._id) {
                          setErr("Save the project first to open new files.");
                          return;
                        }
                        setFid(f._id);
                        setOut(null);
                      }}
                    >
                      <b className="mono" style={{ fontSize: 13 }}>
                        {f.path}
                      </b>
                    </div>
                  ))}
              </div>
              <div className="row">
                <button className="btn sm primary grow" disabled={!dirty} onClick={save}>
                  {dirty ? "Save changes" : "Saved"}
                </button>
                <button className="btn sm danger" onClick={delProject}>
                  Delete
                </button>
              </div>
              <button
                className="btn sm"
                onClick={() =>
                  download(`${project.name}.json`, JSON.stringify(project.files, null, 2), "application/json")
                }
              >
                Export JSON
              </button>
            </>
          )}
        </div>
        {!file ? (
          <div className="panel muted">
            {project ? "Select a file to edit it." : "Create a project to get started."}
          </div>
        ) : (
          <div className="stack">
            <div className="panel stack">
              <div className="row">
                <b className="mono grow">{file.path}</b>
                <button
                  className="btn sm danger"
                  onClick={() => {
                    patchLocal(project.files.filter((f) => f._id !== fid));
                    setFid(null);
                  }}
                >
                  Delete file
                </button>
                <button className="btn sm" onClick={() => download(file.path.split("/").pop(), file.content)}>
                  Download
                </button>
              </div>
              <textarea
                className="textarea code"
                style={{ minHeight: 340 }}
                spellCheck={false}
                value={file.content}
                onChange={(e) =>
                  patchLocal(project.files.map((f) => (f._id === fid ? { ...f, content: e.target.value } : f)))
                }
              />
            </div>
            <div className="row wrap">
              {ACTIONS.map(([k, l]) => (
                <button key={k} className="btn" disabled={!!busy || !file.content.trim()} onClick={() => act(k, l)}>
                  {busy === l ? "Working…" : l}
                </button>
              ))}
            </div>
            {out && (
              <div className="panel">
                <div className="panel-title">{out.label}</div>
                <Markdown text={out.text} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
