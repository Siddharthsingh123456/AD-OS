import { useCallback, useEffect, useState } from "react";
import { api, download } from "../../lib/api";
import { useDialog } from "../../components/ui/Dialog.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { useTitle } from "../../hooks/useTitle";

export default function Memory() {
  const dialog = useDialog();
  const toast = useToast();
  useTitle("AI Memory");
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(
    () =>
      api("/memory")
        .then(setItems)
        .catch((e) => setErr(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const wrap = (fn) => async () => {
    setErr("");
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <h1>AI Memory</h1>
        <p>
          Everything here is shared with every agent, so you never repeat yourself. You can also type{" "}
          <span className="mono">/remember …</span> in any chat.
        </p>
      </div>
      {err && (
        <div className="notice err" style={{ marginBottom: 14 }}>
          {err}
        </div>
      )}
      <div className="row" style={{ marginBottom: 18 }}>
        <input
          className="input"
          placeholder="e.g. I prefer TypeScript and Tailwind; my API runs on Node 20"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            text.trim() &&
            wrap(async () => {
              await api("/memory", { method: "POST", body: { text } });
              setText("");
            })()
          }
        />
        <button
          className="btn primary"
          disabled={!text.trim()}
          onClick={wrap(async () => {
            await api("/memory", { method: "POST", body: { text } });
            setText("");
          })}
        >
          Remember
        </button>
      </div>
      <div className="panel flush">
        {items.length === 0 && (
          <div className="muted" style={{ padding: 18 }}>
            Nothing remembered yet.
          </div>
        )}
        {items.map((m) => (
          <div key={m._id} className="row" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            {edit?.id === m._id ? (
              <input
                className="input grow"
                autoFocus
                value={edit.text}
                onChange={(e) => setEdit({ ...edit, text: e.target.value })}
              />
            ) : (
              <span className="grow">{m.text}</span>
            )}
            {edit?.id === m._id ? (
              <button
                className="btn sm primary"
                onClick={wrap(async () => {
                  await api(`/memory/${m._id}`, { method: "PUT", body: { text: edit.text } });
                  setEdit(null);
                })}
              >
                Save
              </button>
            ) : (
              <button className="btn sm" onClick={() => setEdit({ id: m._id, text: m.text })}>
                Edit
              </button>
            )}
            <button className="btn sm danger" onClick={wrap(() => api(`/memory/${m._id}`, { method: "DELETE" }))}>
              Delete
            </button>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <div className="row" style={{ marginTop: 14 }}>
          <button
            className="btn sm"
            onClick={() =>
              download(
                "memory.json",
                JSON.stringify(
                  items.map((m) => m.text),
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            Export
          </button>
          <button
            className="btn sm danger"
            onClick={async () =>
              (await dialog.confirm({
                title: "Delete all memories?",
                message: "Every agent will forget these facts. This cannot be undone.",
                confirmLabel: "Delete all",
                danger: true,
              })) &&
              wrap(async () => {
                await api("/memory", { method: "DELETE" });
                toast.success("Memory cleared.");
              })()
            }
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
