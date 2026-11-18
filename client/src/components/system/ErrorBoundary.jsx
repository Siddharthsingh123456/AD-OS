import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Best-effort crash report; the server logs it and can forward it to ERROR_WEBHOOK_URL.
    try {
      fetch("/api/telemetry/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          message: String(error?.message || error),
          stack: String(error?.stack || ""),
          component: String(info?.componentStack || ""),
          url: window.location.pathname,
        }),
      }).catch(() => {});
    } catch {
      /* reporting must never throw */
    }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="splash" style={{ padding: 24 }}>
        <div className="panel stack" style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 26 }}>Something went wrong</h1>
          <p className="muted">
            The page hit an unexpected error. Reloading usually fixes it. If it keeps happening, sign out and back in.
          </p>
          <div className="row">
            <button className="btn primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className="btn" href="/">
              Go to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
