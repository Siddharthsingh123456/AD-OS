import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

/** Loads built-in + the user's custom agents. `refresh` re-fetches (also triggered globally after marketplace changes). */
export function useAgents() {
  const [data, setData] = useState({ builtin: [], custom: [] });
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(
    () =>
      api("/chat/agents")
        .then((d) => setData({ builtin: d?.builtin || [], custom: d?.custom || [] }))
        .catch(() => {})
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    refresh();
    window.addEventListener("aidos-agents", refresh);
    return () => window.removeEventListener("aidos-agents", refresh);
  }, [refresh]);
  return { ...data, loading, refresh };
}
export const notifyAgents = () => window.dispatchEvent(new Event("aidos-agents"));
