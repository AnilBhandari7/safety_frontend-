import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

/*
  CaseDetail — /dashboard/case/:id
  Shows all stats and attempt history for a specific case.
  id = "001" | "002" …
  caseId = "case001" | "case002" …
*/

const CASE_INFO = {
  "001": {
    eyebrow:     "Case File #001",
    title:       "Warehouse Slip Incident",
    description: "A worker slips near the loading dock. Investigate the scene, find the evidence, and trace the root cause using the 5 Whys.",
    tags:        ["3D Investigation", "5 Whys", "Workplace Safety"],
  },
  "002": {
    eyebrow:     "Case File #002",
    title:       "Blocked Fire Exit Incident",
    description: "An alarm sounded during a routine shift. A worker tried to leave through the nearest emergency exit — it wouldn't open. Investigate the scene and trace the root cause.",
    tags:        ["3D Investigation", "5 Whys", "Fire Safety"],
  },
};

export default function CaseDetail() {
  const { user, logout } = useAuth();
  const { id }           = useParams();
  const navigate         = useNavigate();
  const [data, setData]  = useState(null);
  const [loading, setLoading] = useState(true);

  const caseId   = `case${id}`;
  const caseInfo = CASE_INFO[id] || CASE_INFO["001"];

  useEffect(() => {
    client.get("/employee/history")
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  // Filter attempts to only those belonging to THIS case
  const allAttempts       = data?.attempts || [];
  const attempts          = allAttempts.filter(a => a.incidentId?.caseId === caseId);
  const completedAttempts = attempts.filter(a => a.status === "completed");
  const bestScore         = completedAttempts.length > 0 ? Math.max(...completedAttempts.map(a => a.score)) : null;
  const everPassed        = completedAttempts.some(a => a.passed);
  const hasPlayed         = completedAttempts.length > 0;

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const formatTime = (s) => {
    if (!s && s !== 0) return "—";
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };
  const scoreColor = (s) => s >= 60 ? "var(--accent-success)" : "var(--accent-danger)";

  const S = {
    nav:      { background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", height: "60px" },
    sectionH: { fontSize: "13px", fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "16px" },
    statRow:  { display: "flex", gap: "16px", marginBottom: "40px", flexWrap: "wrap" },
    statCard: { flex: 1, minWidth: "160px", background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "24px", textAlign: "center" },
    statLbl:  { fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" },
    statBig:  { fontSize: "48px", fontWeight: 800, lineHeight: 1 },
    statSub:  { fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" },
    tableCard:{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "10px", overflow: "hidden" },
    thead:    { background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" },
    th:       { padding: "14px 18px", fontWeight: 600, fontSize: "12px", letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase", textAlign: "left" },
    td:       { padding: "14px 18px", fontSize: "14px", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)" },
    tdBold:   { padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", borderBottom: "1px solid var(--border-subtle)" },
    empty:    { background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "48px", textAlign: "center", color: "var(--text-muted)" },
    tag:      { background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 500 },
  };

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>

      {/* Nav */}
      <nav style={S.nav}>
        <div className="pg-nav-inner">
          <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.04em" }}>
            Safety<span style={{ color: "var(--accent-safety)" }}>Detective</span>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{user?.name}</span>
            <button onClick={() => navigate("/dashboard")} className="btn-secondary" style={{ padding: "7px 16px", fontSize: "13px" }}>← Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="pg-body">

        {/* Case header */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-safety)", textTransform: "uppercase", marginBottom: "8px" }}>
            {caseInfo.eyebrow}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>{caseInfo.title}</h1>
              <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "560px", lineHeight: 1.55, marginBottom: "14px" }}>
                {caseInfo.description}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {caseInfo.tags.map(t => <span key={t} style={S.tag}>{t}</span>)}
              </div>
            </div>

            {/* Action column */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px", flexShrink: 0 }}>
              {hasPlayed && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  <span className={everPassed ? "badge-pass" : "badge-fail"}>
                    {everPassed ? "Passed" : "Failed"}
                  </span>
                  {bestScore !== null && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Best: {bestScore}/100</div>
                  )}
                </div>
              )}
              <button
                onClick={() => navigate("/game/intro", { state: { caseId } })}
                className="btn-primary"
                style={{ padding: "12px 24px" }}
              >
                {hasPlayed ? "Replay Investigation" : "Start Investigation"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={S.sectionH}>Progress</div>
        <div style={S.statRow}>
          <div style={S.statCard}>
            <div style={S.statLbl}>Best Score</div>
            <div style={{ ...S.statBig, color: bestScore === null ? "var(--text-muted)" : scoreColor(bestScore) }}>
              {bestScore !== null ? bestScore : "—"}
            </div>
            {bestScore !== null && (
              <div style={{ marginTop: "10px" }}>
                <span className={bestScore >= 60 ? "badge-pass" : "badge-fail"}>
                  {bestScore >= 60 ? "Passed" : "Failed"}
                </span>
              </div>
            )}
          </div>

          <div style={S.statCard}>
            <div style={S.statLbl}>Total Attempts</div>
            <div style={{ ...S.statBig, color: "var(--text-primary)" }}>{completedAttempts.length}</div>
            <div style={S.statSub}>completed investigations</div>
          </div>

          <div style={S.statCard}>
            <div style={S.statLbl}>Training Status</div>
            <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "8px" }}>
              {completedAttempts.length === 0
                ? <span style={{ color: "var(--text-muted)" }}>Not started</span>
                : everPassed
                  ? <span style={{ color: "var(--accent-success)" }}>✓ Complete</span>
                  : <span style={{ color: "var(--accent-warning)" }}>In progress</span>}
            </div>
          </div>
        </div>

        {/* Attempt history */}
        <div style={S.sectionH}>Attempt History</div>
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : completedAttempts.length > 0 ? (
          <div style={S.tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={S.thead}>
                  {["Date", "Score", "Status", "Time Taken"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedAttempts.map((a, i) => (
                  <tr key={i}>
                    <td style={S.td}>{formatDate(a.createdAt || a.startedAt)}</td>
                    <td style={{ ...S.tdBold, color: scoreColor(a.score) }}>{a.score}/100</td>
                    <td style={S.td}>
                      <span className={a.passed ? "badge-pass" : "badge-fail"}>{a.passed ? "Pass" : "Fail"}</span>
                      {a.timedOut && <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>timed out</span>}
                    </td>
                    <td style={S.td}>{formatTime(a.timeTakenSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={S.empty}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
            <p>No attempts yet. Ready to investigate?</p>
          </div>
        )}
      </div>
    </div>
  );
}
