import { Component } from "react";

/*
  ErrorBoundary — catches render errors anywhere in the wrapped subtree.

  React requires a class component for componentDidCatch / getDerivedStateFromError.
  This is a permanent diagnostic safety net: if the 3D scene, any screen, or any
  component crashes during rendering, the error becomes visible on screen instead
  of silently producing a blank black page.
*/
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;

    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f0f13",
        color: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          maxWidth: "680px",
          width: "100%",
          background: "#1a1a22",
          border: "1px solid rgba(239,68,68,0.30)",
          borderRadius: "12px",
          padding: "40px 36px",
        }}>
          <div style={{
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em",
            color: "#ef4444", textTransform: "uppercase", marginBottom: "14px",
          }}>
            Render Error
          </div>

          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#f0f0f0" }}>
            Something went wrong
          </h2>

          <p style={{ fontSize: "15px", color: "#9aa0b0", marginBottom: "24px", lineHeight: 1.55 }}>
            {error?.message || "An unexpected error occurred."}
          </p>

          {info?.componentStack && (
            <details style={{ marginBottom: "28px" }}>
              <summary style={{
                cursor: "pointer", fontSize: "12px", fontWeight: 600,
                color: "#5a6070", letterSpacing: "0.06em", textTransform: "uppercase",
                marginBottom: "8px", userSelect: "none",
              }}>
                Component stack
              </summary>
              <pre style={{
                fontSize: "11px", color: "#5a6070", lineHeight: 1.6,
                overflowX: "auto", whiteSpace: "pre-wrap",
                background: "#23232e", borderRadius: "6px", padding: "12px 14px",
                marginTop: "8px", border: "1px solid rgba(255,255,255,0.07)",
              }}>
                {info.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px", fontSize: "15px", fontWeight: 700,
              background: "#f5c518", color: "#0f0f13",
              border: "none", borderRadius: "6px", cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
