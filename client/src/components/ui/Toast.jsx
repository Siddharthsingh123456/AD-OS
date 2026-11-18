import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

const Ctx = createContext(null);
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

/** Non-blocking feedback. `const toast = useToast(); toast.success("Saved")`. */
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind, text, ms) => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-3), { id, kind, text }]);
      setTimeout(() => dismiss(id), ms ?? (kind === "error" ? 7000 : 3500));
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (t, ms) => push("success", t, ms),
      error: (t, ms) => push("error", t, ms),
      info: (t, ms) => push("info", t, ms),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications">
        {items.map((t) => {
          const Glyph = ICONS[t.kind];
          return (
            <div key={t.id} className={"toast " + t.kind} role={t.kind === "error" ? "alert" : "status"}>
              <Glyph size={18} aria-hidden="true" />
              <span>{t.text}</span>
              <button aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
