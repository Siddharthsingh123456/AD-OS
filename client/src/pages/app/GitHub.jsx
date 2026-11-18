import { useState } from "react";
import Markdown from "../../components/chat/Markdown.jsx";
import { api, runTask } from "../../lib/api";

export default function GitHub() {
  const [name, setName] = useState("");
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [review, setReview] = useState("");

  async function load(e) {
    e?.preventDefault();
    if (!name.trim()) return;
    setBusy("load");
    setErr("");
    setReview("");
    try {
      setD(await api(`/github/${encodeURIComponent(name.trim())}`));
    } catch (x) {
      setErr(x.message);
      setD(null);
    } finally {
      setBusy("");
    }
  }
  async function aiReview() {
    setBusy("review");
    setErr("");
    try {
      setReview(
        await runTask(
          "github_review",
          JSON.stringify({
            user: d.user,
            totals: d.totals,
            languages: d.languages,
            topRepos: d.topRepos,
            years: d.years,
          }),
        ),
      );
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy("");
    }
  }
  const maxLang = Math.max(1, ...(d?.languages || []).map((l) => l.count));
  const maxYear = Math.max(1, ...(d?.years || []).map((y) => y.count));

  return (
    <div className="page">
      <div className="page-head">
        <h1>GitHub Analytics</h1>
        <p>Enter any public username for repository stats, language mix and an AI portfolio review.</p>
      </div>
      <form className="row" onSubmit={load} style={{ marginBottom: 20 }}>
        <input
          className="input"
          style={{ maxWidth: 360 }}
          placeholder="GitHub username"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn primary" disabled={busy === "load"}>
          {busy === "load" ? "Loading…" : "Analyze"}
        </button>
      </form>
      {err && (
        <div className="notice err" style={{ marginBottom: 16 }}>
          {err}
        </div>
      )}
      {d && (
        <div className="stack" style={{ gap: 18 }}>
          <div className="panel row wrap gap-lg">
            <img src={d.user.avatar} alt="" width="64" height="64" style={{ borderRadius: 10 }} />
            <div className="grow">
              <h2 style={{ fontSize: 22 }}>{d.user.name || d.user.login}</h2>
              <div className="muted">{d.user.bio || "No bio"}</div>
            </div>
            <a className="btn" href={d.user.url} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </div>
          <div className="strip">
            {[
              ["Followers", d.user.followers],
              ["Repositories", d.totals.original],
              ["Stars earned", d.totals.stars],
              ["Forks received", d.totals.forksReceived],
              ["Forked repos", d.totals.forks],
            ].map(([l, v]) => (
              <div key={l}>
                <b>{v}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="split" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="panel">
              <div className="panel-title">Languages (by repo count)</div>
              <div className="bars">
                {d.languages.map((l) => (
                  <div className="bar" key={l.name}>
                    <span>{l.name}</span>
                    <div className="track">
                      <i style={{ width: `${(l.count / maxLang) * 100}%` }} />
                    </div>
                    <span>{l.count}</span>
                  </div>
                ))}
                {!d.languages.length && <div className="muted small">No language data.</div>}
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">Repos created per year</div>
              <div className="cols">
                {d.years.map((y) => (
                  <div key={y.year}>
                    <span>{y.count}</span>
                    <i style={{ height: `${(y.count / maxYear) * 100}%` }} />
                    <span>{String(y.year).slice(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel flush scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Top repositories</th>
                  <th>Language</th>
                  <th>Stars</th>
                  <th>Forks</th>
                </tr>
              </thead>
              <tbody>
                {d.topRepos.map((r) => (
                  <tr key={r.name}>
                    <td>
                      <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "var(--amber)" }}>
                        {r.name}
                      </a>
                      <div className="small muted">{r.description}</div>
                    </td>
                    <td>{r.language || "—"}</td>
                    <td>{r.stars}</td>
                    <td>{r.forks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel stack">
            <div className="row">
              <div className="panel-title grow" style={{ margin: 0 }}>
                AI portfolio review
              </div>
              <button className="btn primary" disabled={busy === "review"} onClick={aiReview}>
                {busy === "review" ? "Reviewing…" : "Generate review"}
              </button>
            </div>
            {review ? (
              <Markdown text={review} />
            ) : (
              <div className="muted small">Get strengths, gaps and concrete improvements from the data above.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
