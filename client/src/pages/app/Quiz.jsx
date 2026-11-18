import { useEffect, useState } from "react";
import ChatWorkspace from "../../components/chat/ChatWorkspace.jsx";
import { api } from "../../lib/api";
import { useAgents } from "../../hooks/useAgents";

function QuizTab() {
  const [cfg, setCfg] = useState({ topic: "", difficulty: "medium", count: 5 });
  const [quiz, setQuiz] = useState(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState([]);
  const loadHistory = () =>
    api("/quiz/attempts")
      .then(setHistory)
      .catch(() => {});
  useEffect(() => {
    loadHistory();
  }, []);

  async function start() {
    setBusy(true);
    setErr("");
    try {
      setQuiz(await api("/quiz/generate", { method: "POST", body: cfg }));
      setI(0);
      setPicked(null);
      setScore(0);
      setDone(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  const q = quiz?.questions[i];
  async function next() {
    if (i + 1 >= quiz.questions.length) {
      setDone(true);
      api("/quiz/attempts", {
        method: "POST",
        body: { topic: quiz.topic, difficulty: quiz.difficulty, score, total: quiz.questions.length },
      })
        .then(loadHistory)
        .catch(() => {});
    } else {
      setI(i + 1);
      setPicked(null);
    }
  }

  if (quiz && !done)
    return (
      <div className="panel stack" style={{ maxWidth: 720 }}>
        <div className="row">
          <span className="chip">{quiz.topic}</span>
          <span className="chip">{quiz.difficulty}</span>
          <div className="grow" />
          <span className="small muted">
            Question {i + 1} of {quiz.questions.length}
          </span>
        </div>
        <h2 style={{ fontSize: 22 }}>{q.q}</h2>
        {q.options.map((o, k) => (
          <button
            key={k}
            disabled={picked !== null}
            className={"opt" + (picked !== null ? (k === q.answer ? " correct" : k === picked ? " wrong" : "") : "")}
            onClick={() => {
              setPicked(k);
              if (k === q.answer) setScore(score + 1);
            }}
          >
            {o}
          </button>
        ))}
        {picked !== null && <div className="notice">{q.explanation}</div>}
        {picked !== null && (
          <button className="btn primary" onClick={next}>
            {i + 1 >= quiz.questions.length ? "Finish" : "Next question"}
          </button>
        )}
      </div>
    );
  if (quiz && done)
    return (
      <div className="panel stack" style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 28 }}>
          {score} / {quiz.questions.length}
        </h2>
        <p className="muted">
          {score === quiz.questions.length
            ? "Perfect score."
            : score >= quiz.questions.length / 2
              ? "Solid. Review the ones you missed and go again."
              : "Keep going — try an easier level or a narrower topic."}
        </p>
        <div className="row">
          <button className="btn primary" onClick={start}>
            New quiz on same topic
          </button>
          <button className="btn" onClick={() => setQuiz(null)}>
            Change topic
          </button>
        </div>
      </div>
    );
  return (
    <div className="split" style={{ gridTemplateColumns: "minmax(300px, 420px) 1fr" }}>
      <div className="panel stack">
        {err && <div className="notice err">{err}</div>}
        <label className="field">
          <span>Topic</span>
          <input
            className="input"
            placeholder="e.g. MongoDB indexing, React hooks, transformers"
            value={cfg.topic}
            onChange={(e) => setCfg({ ...cfg, topic: e.target.value })}
          />
        </label>
        <div className="row">
          <label className="field grow">
            <span>Difficulty</span>
            <select
              className="select"
              value={cfg.difficulty}
              onChange={(e) => setCfg({ ...cfg, difficulty: e.target.value })}
            >
              <option>easy</option>
              <option>medium</option>
              <option>hard</option>
            </select>
          </label>
          <label className="field grow">
            <span>Questions</span>
            <select className="select" value={cfg.count} onChange={(e) => setCfg({ ...cfg, count: +e.target.value })}>
              {[3, 5, 8, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn primary" disabled={!cfg.topic.trim() || busy} onClick={start}>
          {busy ? "Generating…" : "Generate quiz"}
        </button>
      </div>
      <div className="panel">
        <div className="panel-title">Recent attempts</div>
        {history.length === 0 ? (
          <div className="muted small">Your scores will appear here.</div>
        ) : (
          <table className="table">
            <tbody>
              {history.map((h) => (
                <tr key={h._id}>
                  <td>{h.topic}</td>
                  <td className="muted">{h.difficulty}</td>
                  <td>
                    <b>
                      {h.score}/{h.total}
                    </b>
                  </td>
                  <td className="muted small">{new Date(h.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function Quiz() {
  const [tab, setTab] = useState("quiz");
  const { builtin } = useAgents();
  const interview = builtin.find((a) => a.id === "interview");
  return (
    <div className={tab === "quiz" ? "page" : "fill-col"}>
      <div
        className={tab === "quiz" ? "page-head" : "toolbar"}
        style={tab === "quiz" ? {} : { paddingBottom: 0, borderBottom: 0 }}
      >
        {tab === "quiz" && (
          <>
            <h1>Quiz & Interview Simulator</h1>
            <p>Test yourself with generated quizzes or rehearse a live mock interview.</p>
          </>
        )}
      </div>
      <div className="tabs" style={{ margin: tab === "quiz" ? "0 0 20px" : "0 22px" }}>
        <button className={"tab" + (tab === "quiz" ? " active" : "")} onClick={() => setTab("quiz")}>
          Quiz
        </button>
        <button className={"tab" + (tab === "interview" ? " active" : "")} onClick={() => setTab("interview")}>
          Interview simulator
        </button>
      </div>
      {tab === "quiz" ? (
        <QuizTab />
      ) : interview ? (
        <ChatWorkspace agent={interview} />
      ) : (
        <div className="splash">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
