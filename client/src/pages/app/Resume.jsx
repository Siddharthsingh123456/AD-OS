import { useEffect, useRef, useState } from "react";
import Markdown from "../../components/chat/Markdown.jsx";
import { api, runTask } from "../../lib/api";

const blank = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  links: "",
  summary: "",
  skills: "",
  experience: [],
  education: [],
  projects: [],
};
const id = () => Math.random().toString(36).slice(2, 9);

export default function Resume() {
  const [r, setR] = useState(blank);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  const [jd, setJd] = useState("");
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    api("/resume")
      .then((d) => setR({ ...blank, ...(d || {}) }))
      .catch((e) => setErr(e.message))
      .finally(() => setLoaded(true));
  }, []);
  const set = (patch) => {
    setR((p) => ({ ...p, ...patch }));
    setSaved(false);
  };
  useEffect(() => {
    if (!loaded || saved) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        api("/resume", { method: "PUT", body: r })
          .then(() => setSaved(true))
          .catch((e) => setErr(e.message)),
      900,
    );
    return () => clearTimeout(timer.current);
  }, [r, loaded, saved]);

  const upd = (key, i, patch) => set({ [key]: r[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const del = (key, i) => set({ [key]: r[key].filter((_, j) => j !== i) });
  async function ai(label, fn) {
    setBusy(label);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }
  const profile = () =>
    `Name: ${r.name}\nTitle: ${r.title}\nSkills: ${r.skills}\nExperience: ${r.experience.map((e) => `${e.role} at ${e.company}: ${e.bullets}`).join(" | ")}\nProjects: ${r.projects.map((p) => `${p.name}: ${p.desc}`).join(" | ")}`;
  const lines = (t) =>
    String(t || "")
      .split("\n")
      .map((x) => x.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

  if (!loaded)
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    );
  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="page-head row wrap">
        <div className="grow">
          <h1>Resume Builder</h1>
          <p>Edit on the left, preview on the right. Autosaves as you type.</p>
        </div>
        <span className="chip">{saved ? "Saved" : "Saving…"}</span>
        <button className="btn primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
      {err && (
        <div className="notice err" style={{ marginBottom: 14 }}>
          {err}
        </div>
      )}
      <div
        style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 22 }}
        className="resume-grid"
      >
        <div className="stack">
          <div className="panel stack">
            <div className="panel-title">Basics</div>
            <div className="row wrap">
              {[
                ["name", "Full name"],
                ["title", "Job title"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["location", "Location"],
                ["links", "Links (GitHub, LinkedIn)"],
              ].map(([k, l]) => (
                <label key={k} className="field grow" style={{ minWidth: 200 }}>
                  <span>{l}</span>
                  <input className="input" value={r[k]} onChange={(e) => set({ [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <label className="field">
              <span>Summary</span>
              <textarea className="textarea" value={r.summary} onChange={(e) => set({ summary: e.target.value })} />
            </label>
            <button
              className="btn sm"
              style={{ alignSelf: "flex-start" }}
              disabled={!!busy}
              onClick={() => ai("sum", async () => set({ summary: await runTask("resume_summary", profile()) }))}
            >
              {busy === "sum" ? "Writing…" : "Write summary with AI"}
            </button>
            <label className="field">
              <span>Skills (comma separated)</span>
              <input className="input" value={r.skills} onChange={(e) => set({ skills: e.target.value })} />
            </label>
          </div>

          <div className="panel stack">
            <div className="row">
              <div className="panel-title grow" style={{ margin: 0 }}>
                Experience
              </div>
              <button
                className="btn sm"
                onClick={() =>
                  set({ experience: [...r.experience, { id: id(), role: "", company: "", period: "", bullets: "" }] })
                }
              >
                Add
              </button>
            </div>
            {r.experience.map((x, i) => (
              <div key={x.id} className="stack" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <div className="row wrap">
                  {[
                    ["role", "Role"],
                    ["company", "Company"],
                    ["period", "Period"],
                  ].map(([k, l]) => (
                    <input
                      key={k}
                      className="input grow"
                      style={{ minWidth: 140 }}
                      placeholder={l}
                      value={x[k]}
                      onChange={(e) => upd("experience", i, { [k]: e.target.value })}
                    />
                  ))}
                </div>
                <textarea
                  className="textarea"
                  placeholder="What did you do? Rough notes are fine — one bullet per line."
                  value={x.bullets}
                  onChange={(e) => upd("experience", i, { bullets: e.target.value })}
                />
                <div className="row">
                  <button
                    className="btn sm"
                    disabled={!!busy || !x.bullets.trim()}
                    onClick={() =>
                      ai("b" + i, async () =>
                        upd("experience", i, {
                          bullets: await runTask("resume_bullets", x.bullets, `${x.role} at ${x.company}`),
                        }),
                      )
                    }
                  >
                    {busy === "b" + i ? "Rewriting…" : "Polish bullets with AI"}
                  </button>
                  <button className="btn sm danger" onClick={() => del("experience", i)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel stack">
            <div className="row">
              <div className="panel-title grow" style={{ margin: 0 }}>
                Projects
              </div>
              <button
                className="btn sm"
                onClick={() => set({ projects: [...r.projects, { id: id(), name: "", desc: "" }] })}
              >
                Add
              </button>
            </div>
            {r.projects.map((x, i) => (
              <div key={x.id} className="stack" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <input
                  className="input"
                  placeholder="Project name"
                  value={x.name}
                  onChange={(e) => upd("projects", i, { name: e.target.value })}
                />
                <textarea
                  className="textarea"
                  style={{ minHeight: 60 }}
                  placeholder="One line per achievement or feature"
                  value={x.desc}
                  onChange={(e) => upd("projects", i, { desc: e.target.value })}
                />
                <button
                  className="btn sm danger"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => del("projects", i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="panel stack">
            <div className="row">
              <div className="panel-title grow" style={{ margin: 0 }}>
                Education
              </div>
              <button
                className="btn sm"
                onClick={() => set({ education: [...r.education, { id: id(), school: "", degree: "", period: "" }] })}
              >
                Add
              </button>
            </div>
            {r.education.map((x, i) => (
              <div key={x.id} className="row wrap" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                {[
                  ["degree", "Degree"],
                  ["school", "School"],
                  ["period", "Period"],
                ].map(([k, l]) => (
                  <input
                    key={k}
                    className="input grow"
                    style={{ minWidth: 140 }}
                    placeholder={l}
                    value={x[k]}
                    onChange={(e) => upd("education", i, { [k]: e.target.value })}
                  />
                ))}
                <button className="btn sm danger" onClick={() => del("education", i)}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="panel stack">
            <div className="panel-title">ATS check</div>
            <textarea
              className="textarea"
              placeholder="Paste a job description to compare your resume against it"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
            <button
              className="btn"
              style={{ alignSelf: "flex-start" }}
              disabled={!jd.trim() || !!busy}
              onClick={() =>
                ai("ats", async () =>
                  setReport(
                    await runTask("ats", `RESUME:\n${profile()}\nSummary: ${r.summary}\n\nJOB DESCRIPTION:\n${jd}`),
                  ),
                )
              }
            >
              {busy === "ats" ? "Analyzing…" : "Score against job"}
            </button>
            {report && <Markdown text={report} />}
          </div>
        </div>

        <div>
          <div className="paper" style={{ position: "sticky", top: 0 }}>
            <h1>{r.name || "Your Name"}</h1>
            <div className="sub">{[r.title, r.location, r.email, r.phone].filter(Boolean).join("  |  ")}</div>
            {r.links && <div className="sub">{r.links}</div>}
            {r.summary && (
              <>
                <h2>Summary</h2>
                <p>{r.summary}</p>
              </>
            )}
            {r.skills && (
              <>
                <h2>Skills</h2>
                <p>{r.skills}</p>
              </>
            )}
            {r.experience.length > 0 && <h2>Experience</h2>}
            {r.experience.map((x) => (
              <div key={x.id} style={{ marginBottom: 8 }}>
                <b>{x.role}</b>
                {x.company && ` — ${x.company}`}
                <span className="sub" style={{ float: "right" }}>
                  {x.period}
                </span>
                <ul>
                  {lines(x.bullets).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
            {r.projects.length > 0 && <h2>Projects</h2>}
            {r.projects.map((x) => (
              <div key={x.id} style={{ marginBottom: 8 }}>
                <b>{x.name}</b>
                <ul>
                  {lines(x.desc).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
            {r.education.length > 0 && <h2>Education</h2>}
            {r.education.map((x) => (
              <div key={x.id}>
                <b>{x.degree}</b>
                {x.school && ` — ${x.school}`}
                <span className="sub" style={{ float: "right" }}>
                  {x.period}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
