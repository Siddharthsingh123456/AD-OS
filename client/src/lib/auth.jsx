import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, endSession, hasSession, isPreview, setPreview, PREVIEW_USER } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (isPreview() ? PREVIEW_USER : null));
  const [loading, setLoading] = useState(hasSession());

  useEffect(() => {
    if (!hasSession()) return;
    api("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener("aidos-logout", out);
    return () => window.removeEventListener("aidos-logout", out);
  }, []);

  const authenticate = useCallback(async (mode, payload) => {
    setPreview(false);
    const r = await api(`/auth/${mode}`, { method: "POST", body: payload });
    setUser(r.user);
    return r.user;
  }, []);
  const logout = useCallback(() => {
    setPreview(false);
    endSession();
    setUser(null);
  }, []);
  const value = useMemo(
    () => ({
      user,
      loading,
      login: (p) => authenticate("login", p),
      register: (p) => authenticate("register", p),
      demo: () => authenticate("demo", undefined),
      // "Skip for now": a real session on the shared guest account, so every page works without registering.
      // Tries a real guest session first. If the server or its database is unreachable, falls back to a view-only
      // preview so every page can still be seen.
      skip: async () => {
        try {
          return await authenticate("guest", undefined);
        } catch {
          setPreview(true);
          setUser(PREVIEW_USER);
          return PREVIEW_USER;
        }
      },
      logout,
    }),
    [user, loading, authenticate, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
