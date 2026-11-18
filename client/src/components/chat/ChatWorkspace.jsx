import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, Copy, Download, History, RefreshCw, Send, Square, Trash2 } from "lucide-react";
import Markdown from "./Markdown.jsx";
import { AgentIcon } from "../ui/Icon.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useDialog } from "../ui/Dialog.jsx";
import { api, download, streamChat } from "../../lib/api";
import { useAuth } from "../../lib/auth.jsx";

const NEAR_BOTTOM = 120;

export default function ChatWorkspace({ agent, convKey, collection, docId, blocked, blockedMsg }) {
  const { user } = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const key = convKey || agent.id;
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [fields, setFields] = useState({});
  const [input, setInput] = useState("");
  const [live, setLive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showList, setShowList] = useState(false);
  const [away, setAway] = useState(false);
  const abort = useRef(null);
  const liveRef = useRef("");
  const scroller = useRef(null);
  const stick = useRef(true);
  const box = useRef(null);

  const loadList = useCallback(
    () =>
      api(`/chat/conversations?key=${encodeURIComponent(key)}`)
        .then((l) => {
          setConvos(l);
          return l;
        })
        .catch(() => []),
    [key],
  );
  const open = useCallback(
    (id) =>
      api(`/chat/conversations/${id}`)
        .then((c) => {
          setActive(c._id);
          setMessages(c.messages || []);
          setShowList(false);
          stick.current = true;
        })
        .catch((e) => setError(e.message)),
    [],
  );

  useEffect(() => {
    setActive(null);
    setMessages([]);
    setError("");
    loadList().then((l) => {
      if (l[0]) open(l[0]._id);
    });
  }, [key, loadList, open]);
  useEffect(() => {
    const d = {};
    (agent.fields || []).forEach((f) => {
      d[f.label] = f.options ? f.options[0] : "";
    });
    setFields(d);
  }, [agent.id, agent.fields]);

  // Follow new text only while the reader is at the bottom; otherwise offer a "Jump to latest" button.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, live]);
  const onScroll = () => {
    const el = scroller.current;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    stick.current = near;
    setAway(!near);
  };
  const jump = () => {
    const el = scroller.current;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // The composer grows with its content, up to a limit.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const newChat = () => {
    setActive(null);
    setMessages([]);
    setError("");
    setShowList(false);
  };

  async function send(text, { regenerate = false } = {}) {
    const content = (text ?? input).trim();
    if (!content || busy || blocked) return;
    setError("");
    if (/^\/remember\s+/i.test(content)) {
      setInput("");
      try {
        await api("/memory", { method: "POST", body: { text: content.replace(/^\/remember\s+/i, "") } });
        toast.success("Saved to memory.");
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    const history = regenerate ? messages.slice(0, -1) : [...messages, { role: "user", content }];
    const shown = regenerate ? history : history;
    setMessages(shown);
    setInput("");
    setBusy(true);
    liveRef.current = "";
    setLive("");
    stick.current = true;
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const r = await streamChat(
        { agent: agent.id, key, conversationId: active, message: content, regenerate, fields, collection, docId },
        {
          signal: ctrl.signal,
          onToken: (t) => {
            liveRef.current = t;
            setLive(t);
          },
        },
      );
      setActive(r.conversationId);
      setMessages([...shown, { role: "assistant", content: r.text, sources: r.sources }]);
      loadList();
    } catch (e) {
      if (e.name === "AbortError") {
        if (liveRef.current)
          setMessages([...shown, { role: "assistant", content: liveRef.current + "\n\n*(stopped)*" }]);
        loadList();
      } else setError(e.message);
    } finally {
      setLive(null);
      setBusy(false);
      abort.current = null;
    }
  }

  // Regenerating re-asks the last question. The server drops the stored answer first.
  const regenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser)
      send(lastUser.content, { regenerate: messages[messages.length - 1]?.role === "assistant" && !!active });
  };
  const retry = () => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (last) {
      setMessages((m) => m.slice(0, -1));
      send(last.content);
    }
  };

  async function removeConvo(c, e) {
    e.stopPropagation();
    if (
      !(await dialog.confirm({
        title: "Delete this conversation?",
        message: `“${c.title}” will be permanently removed.`,
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    await api(`/chat/conversations/${c._id}`, { method: "DELETE" }).catch((x) => toast.error(x.message));
    if (c._id === active) newChat();
    loadList();
  }

  const copy = (t) =>
    navigator.clipboard?.writeText(t).then(
      () => toast.success("Copied to clipboard."),
      () => toast.error("Could not access the clipboard."),
    );
  const initial = (user?.name || "U")[0].toUpperCase();
  const keyProblem = /API key/i.test(error);
  const lastIsAnswer = messages.length > 0 && messages[messages.length - 1].role === "assistant";
  const lastIsQuestion = messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <div className="chat">
      <aside className={"chat-side" + (showList ? " open" : "")} aria-label="Conversation history">
        <button className="btn primary block" onClick={newChat}>
          + New chat
        </button>
        <div className="nav-label">History</div>
        {convos.length === 0 && (
          <div className="small muted" style={{ padding: "4px 10px" }}>
            No conversations yet.
          </div>
        )}
        {convos.map((c) => (
          <div key={c._id} className={"conv" + (c._id === active ? " active" : "")} onClick={() => open(c._id)}>
            <span>{c.title}</span>
            <button aria-label={`Delete conversation ${c.title}`} onClick={(e) => removeConvo(c, e)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </aside>

      <section className="chat-main">
        <header className="chat-head">
          <span className="ico">
            <AgentIcon agent={agent} />
          </span>
          <div className="grow">
            <h1>{agent.name}</h1>
            <div className="small muted">{agent.tagline}</div>
          </div>
          <button className="btn sm hist-btn" onClick={() => setShowList((s) => !s)}>
            <History size={15} />
            History
          </button>
          {messages.length > 0 && (
            <button
              className="btn sm"
              onClick={() =>
                download(
                  `${agent.name}.md`,
                  messages
                    .map((m) => `**${m.role === "user" ? "You" : agent.name}**\n\n${m.content}`)
                    .join("\n\n---\n\n"),
                )
              }
            >
              <Download size={15} />
              Export
            </button>
          )}
        </header>

        {agent.fields?.length > 0 && (
          <div className="fields">
            {agent.fields.map((f) => (
              <label className="field" key={f.label}>
                <span>{f.label}</span>
                {f.type === "select" ? (
                  <select
                    className="select"
                    value={fields[f.label] ?? ""}
                    onChange={(e) => setFields({ ...fields, [f.label]: e.target.value })}
                  >
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    className="textarea code"
                    style={{ minHeight: 64 }}
                    placeholder={f.placeholder}
                    value={fields[f.label] ?? ""}
                    onChange={(e) => setFields({ ...fields, [f.label]: e.target.value })}
                  />
                ) : (
                  <input
                    className="input"
                    placeholder={f.placeholder}
                    value={fields[f.label] ?? ""}
                    onChange={(e) => setFields({ ...fields, [f.label]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
        )}

        <div
          className="chat-scroll"
          ref={scroller}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.length === 0 && live === null ? (
            <div className="empty">
              <div className="empty-ico">
                <AgentIcon agent={agent} size={34} />
              </div>
              <h2>{blocked ? blockedMsg : "What should we work on?"}</h2>
              <p className="muted">{agent.tagline}</p>
              {!blocked && (
                <div className="row wrap" style={{ justifyContent: "center" }}>
                  {(agent.suggestions || []).map((s) => (
                    <button key={s} className="chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="msgs">
              {messages.map((m, i) => (
                <div key={i} className={"msg " + m.role}>
                  <div className="avatar">{m.role === "user" ? initial : <AgentIcon agent={agent} size={18} />}</div>
                  <div className="bubble">
                    {m.role === "assistant" ? <Markdown text={m.content} /> : m.content}
                    {m.sources?.length > 0 && (
                      <div className="sources">
                        {m.sources.map((s) => (
                          <span className="chip amber" key={s}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && (
                      <div className="actions">
                        <button onClick={() => copy(m.content)}>
                          <Copy size={13} /> Copy
                        </button>
                        {i === messages.length - 1 && !busy && active && (
                          <button onClick={regenerate}>
                            <RefreshCw size={13} /> Regenerate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {live !== null && (
                <div className="msg assistant">
                  <div className="avatar">
                    <AgentIcon agent={agent} size={18} />
                  </div>
                  <div className="bubble">
                    {live ? (
                      <Markdown text={live} />
                    ) : (
                      <span className="typing" role="status" aria-label="Thinking">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {away && (
            <button className="btn sm jump-latest" onClick={jump}>
              <ArrowDown size={14} />
              Jump to latest
            </button>
          )}
        </div>

        <div className="composer">
          {error && (
            <div
              className="notice err"
              role="alert"
              style={{ maxWidth: 820, margin: "0 auto 10px", display: "flex", gap: 10, alignItems: "center" }}
            >
              <span style={{ flex: 1 }}>
                {error}{" "}
                {keyProblem && (
                  <Link to="/app/settings" style={{ textDecoration: "underline" }}>
                    Open Settings
                  </Link>
                )}
              </span>
              {lastIsQuestion && !keyProblem && (
                <button className="btn sm" onClick={retry}>
                  <RefreshCw size={13} />
                  Retry
                </button>
              )}
            </div>
          )}
          <div className="box">
            <textarea
              ref={box}
              className="textarea"
              rows={1}
              value={input}
              disabled={blocked}
              aria-label={`Message ${agent.name}`}
              placeholder={blocked ? blockedMsg : `Message ${agent.name}…`}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                } else if (e.key === "Escape" && busy) abort.current?.abort();
              }}
            />
            {busy ? (
              <button className="btn" onClick={() => abort.current?.abort()} aria-label="Stop generating">
                <Square size={14} />
                Stop
              </button>
            ) : (
              <button
                className="btn primary"
                disabled={!input.trim() || blocked}
                onClick={() => send()}
                aria-label="Send message"
              >
                <Send size={14} />
                Send
              </button>
            )}
          </div>
          <div className="hint">
            Enter to send · Shift+Enter for a new line · <span className="mono">/remember …</span> saves a fact to
            memory{lastIsAnswer ? "" : ""}
          </div>
        </div>
      </section>
    </div>
  );
}
