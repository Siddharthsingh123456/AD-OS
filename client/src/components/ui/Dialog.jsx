import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";

const Ctx = createContext(null);

/**
 * Promise-based replacements for window.confirm / window.prompt that match the app and are keyboard accessible.
 *   const dialog = useDialog();
 *   if (await dialog.confirm({ title: "Delete note?", danger: true })) …
 *   const name = await dialog.prompt({ title: "New project", label: "Name" }); // null when cancelled
 */
export const useDialog = () => useContext(Ctx);

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function DialogProvider({ children }) {
  const [state, setState] = useState(null);

  const open = useCallback((spec) => new Promise((resolve) => setState({ ...spec, resolve })), []);
  const api = useMemo(
    () => ({
      confirm: (o) => open({ kind: "confirm", confirmLabel: "Confirm", cancelLabel: "Cancel", ...o }),
      prompt: (o) => open({ kind: "prompt", confirmLabel: "Save", cancelLabel: "Cancel", ...o }),
    }),
    [open],
  );

  const close = (value) => {
    state.resolve(value);
    setState(null);
  };
  return (
    <Ctx.Provider value={api}>
      {children}
      {state && <DialogView key={state.title} spec={state} onClose={close} />}
    </Ctx.Provider>
  );
}

function DialogView({ spec, onClose }) {
  const box = useRef(null);
  const [value, setValue] = useState(spec.initial || "");
  const titleId = useId();
  const descId = useId();
  const isPrompt = spec.kind === "prompt";
  const cancelValue = isPrompt ? null : false;

  // Focus moves into the dialog, Tab stays inside it, and focus returns to where it came from on close.
  useEffect(() => {
    const before = document.activeElement;
    const first = box.current.querySelector("input, textarea") || box.current.querySelector(".btn:last-child");
    first?.focus();
    return () => before?.focus?.();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose(cancelValue);
    }
    if (e.key !== "Tab") return;
    const nodes = [...box.current.querySelectorAll(FOCUSABLE)];
    if (!nodes.length) return;
    const [a, z] = [nodes[0], nodes[nodes.length - 1]];
    if (e.shiftKey && document.activeElement === a) {
      e.preventDefault();
      z.focus();
    } else if (!e.shiftKey && document.activeElement === z) {
      e.preventDefault();
      a.focus();
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (isPrompt && !value.trim()) return;
    onClose(isPrompt ? value.trim() : true);
  };

  return (
    <div className="dlg-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose(cancelValue)}>
      <form
        ref={box}
        className="dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={spec.message ? descId : undefined}
        onKeyDown={onKeyDown}
        onSubmit={submit}
      >
        <h2 id={titleId}>{spec.title}</h2>
        {spec.message && (
          <p id={descId} className="muted">
            {spec.message}
          </p>
        )}
        {isPrompt && (
          <label className="field">
            <span>{spec.label}</span>
            <input
              className="input"
              value={value}
              placeholder={spec.placeholder}
              maxLength={spec.maxLength || 200}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        )}
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={() => onClose(cancelValue)}>
            {spec.cancelLabel}
          </button>
          <button
            type="submit"
            className={"btn " + (spec.danger ? "danger-solid" : "primary")}
            disabled={isPrompt && !value.trim()}
          >
            {spec.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
