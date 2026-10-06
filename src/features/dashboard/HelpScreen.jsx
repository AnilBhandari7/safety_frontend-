import { useNavigate } from "react-router-dom";

export default function HelpScreen() {
  const navigate = useNavigate();

  const S = {
    page:    { background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)", display: "flex", flexDirection: "column" },
    nav:     { background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", height: "60px", flexShrink: 0 },
    navLogo: { fontSize: "16px", fontWeight: 700, letterSpacing: "0.04em" },
    navAmt:  { color: "var(--accent-safety)" },
    card:    { background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "40px" },
    h1:      { fontSize: "28px", fontWeight: 800, marginBottom: "32px" },
    steps:   { display: "flex", flexDirection: "column", gap: "28px" },
    step:    { display: "flex", gap: "18px" },
    num:     { flexShrink: 0, width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "var(--accent-safety)" },
    stepB:   { flex: 1 },
    stepH:   { fontSize: "16px", fontWeight: 700, marginBottom: "8px" },
    stepP:   { fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 },
    kbd:     { background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "4px", padding: "1px 6px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" },
    rule:    { border: "none", borderTop: "1px solid var(--border-subtle)", margin: "32px 0" },
    pass:    { background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px 20px", display: "flex", gap: "12px", alignItems: "center" },
    passLbl: { fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" },
    passVal: { fontSize: "18px", fontWeight: 700, color: "var(--accent-safety)" },
    btnRow:  { marginTop: "36px" },
  };

  const steps = [
    {
      title: "Explore",
      body: <>
        Walk through the 3D warehouse using <span style={S.kbd}>W</span> <span style={S.kbd}>A</span> <span style={S.kbd}>S</span> <span style={S.kbd}>D</span> keys to move.
        Click the scene to lock your cursor, then move the mouse to look around.
      </>,
    },
    {
      title: "Investigate",
      body: "Click objects in the scene to investigate them. Real clues give +10 points; decoys cost −10 points on your first click (re-clicking the same decoy has no further penalty).",
    },
    {
      title: "Answer the 5 Whys",
      body: "After finding all 3 clues, answer five sequential \"Why?\" questions to trace the root cause. Points per correct answer: Why 1 +5, Why 2 +5, Why 3 +10, Why 4 +10. Wrong answers cost −10 each.",
    },
    {
      title: "Identify Root Cause",
      body: "Identify the correct root cause on the fifth Why for +30 points.",
    },
    {
      title: "Speed Bonus",
      body: "Finish in under 2 minutes for a +10 speed bonus.",
    },
  ];

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div className="pg-nav-inner">
          <div style={S.navLogo}>Safety<span style={S.navAmt}> Detective</span></div>
          <button onClick={() => navigate("/game/intro")} className="btn-secondary" style={{ padding: "7px 16px", fontSize: "13px" }}>← Back to Case File</button>
        </div>
      </nav>

      <div className="pg-body-narrow">
        <div style={S.card}>
          <h1 style={S.h1}>How to Play</h1>

          <div style={S.steps}>
            {steps.map(({ title, body }, i) => (
              <div key={title} style={S.step}>
                <div style={S.num}>{i + 1}</div>
                <div style={S.stepB}>
                  <div style={S.stepH}>{title}</div>
                  <div style={S.stepP}>{body}</div>
                </div>
              </div>
            ))}
          </div>

          <hr style={S.rule} />

          <div style={S.pass}>
            <div>
              <div style={S.passLbl}>Pass Threshold</div>
              <div style={S.passVal}>60 / 100 points</div>
            </div>
          </div>

          <div style={S.btnRow}>
            <button onClick={() => navigate("/game/intro")} className="btn-primary" style={{ padding: "12px 28px" }}>
              Back to Case File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
