/*
  BriefingOverlay
  Shows the case briefing before the timer starts.
  Timer MUST NOT begin until the player clicks "Begin Investigation".
*/
export default function BriefingOverlay({ briefing, onBegin }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 500,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "14px",
        padding: "44px 52px",
        maxWidth: "620px",
        width: "90%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
      }}>
        {/* Case file header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <div style={{
            background: "var(--accent-safety)", color: "#0f0f13",
            padding: "4px 12px", borderRadius: "4px",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
          }}>CASE FILE #001</div>
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>Warehouse Slip Incident</span>
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>
          Incident Briefing
        </h2>

        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "16px", marginBottom: "28px" }}>
          {briefing}
        </p>

        {/* Objectives */}
        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px", padding: "18px 22px", marginBottom: "32px",
        }}>
          <div style={{
            fontSize: "11px", fontWeight: 700, color: "var(--text-muted)",
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px",
          }}>
            Objectives
          </div>
          {[
            "Find the 3 pieces of physical evidence",
            "Answer the 5 Whys chain to trace the root cause",
            "Finish in under 3 minutes (under 2 minutes for speed bonus)",
          ].map((obj, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              marginBottom: i < 2 ? "10px" : 0,
              fontSize: "14px", color: "var(--text-secondary)",
            }}>
              <span style={{ color: "var(--accent-safety)", fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>→</span>
              {obj}
            </div>
          ))}
        </div>

        <button
          onClick={onBegin}
          className="btn-primary"
          style={{ width: "100%", padding: "15px", fontSize: "16px" }}
        >
          Begin Investigation
        </button>

        <p style={{ marginTop: "14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
          Timer starts when you click Begin
        </p>
      </div>
    </div>
  );
}
