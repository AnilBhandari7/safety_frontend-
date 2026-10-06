import { useEffect, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";

/*
  ScoreFeedback
  Result screen after a completed game attempt.
  Data: result = { score, passed, timeTakenSeconds, timedOut, feedback }
  caseId: from location.state — selects the causal chain display and navigation targets.

  GUARD: if caseId or result is absent (stale history / direct URL), redirect to /dashboard.
*/

// Causal chains — exact text per case
const CHAIN_001 = [
  { indent: 0, text: "Slip on wet floor",                                              isRoot: false },
  { indent: 1, text: "Floor was wet from a leaking container",                         isRoot: false },
  { indent: 2, text: "Leak was never reported",                                        isRoot: false },
  { indent: 3, text: "Staff didn\u2019t know how to report a hazard",                  isRoot: false },
  { indent: 4, text: "Safety training wasn\u2019t effectively delivered or reinforced", isRoot: true  },
];

const CHAIN_002 = [
  { indent: 0, text: "Worker couldn\u2019t evacuate through nearest exit",              isRoot: false },
  { indent: 1, text: "Exit door was blocked by stacked boxes and pallets",             isRoot: false },
  { indent: 2, text: "Boxes were stored there as overflow — never moved",              isRoot: false },
  { indent: 3, text: "No one was checking fire-exit clearance regularly",              isRoot: false },
  { indent: 4, text: "Fire exits were never included in routine safety checks",        isRoot: true  },
];

export default function ScoreFeedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const caseId = location.state?.caseId;   // intentionally NO default

  // Guard: redirect to dashboard if either piece of state is missing.
  // Covers: stale history, browser back/forward, or direct URL navigation.
  if (!result || !caseId) {
    return <Navigate to="/dashboard" replace />;
  }

  const CHAIN  = caseId === "case002" ? CHAIN_002 : CHAIN_001;
  const caseNum = caseId === "case002" ? "002" : "001";

  // Drive the sequential reveal: one line every 350ms after mount
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let i = 0;
    const step = () => {
      i += 1;
      setVisibleCount(i);
      if (i < CHAIN.length) setTimeout(step, 350);
    };
    // Small initial delay so the score is read first
    const t = setTimeout(step, 600);
    return () => clearTimeout(t);
  }, [CHAIN.length]);

  const passed = result.passed;
  const mins   = Math.floor((result.timeTakenSeconds || 0) / 60);
  const secs   = (result.timeTakenSeconds || 0) % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;
  const gotSpeedBonus = result.timeTakenSeconds < 120 && !result.timedOut;

  return (
    <>
      {/* Keyframe animation injected once */}
      <style>{`
        @keyframes chainReveal {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}>
        <div className="pg-body-narrow" style={{
          display: "flex", flexDirection: "column", gap: "24px",
        }}>

          {/* ── Score card ── */}
          <div style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px", padding: "48px 48px 36px",
            textAlign: "center",
          }}>
            {/* Pass / fail pill */}
            <div style={{
              display: "inline-block", padding: "7px 24px", borderRadius: "999px",
              fontWeight: 700, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase",
              background: passed ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
              color:      passed ? "var(--accent-success)"  : "var(--accent-danger)",
              border: `1px solid ${passed ? "rgba(74,222,128,0.32)" : "rgba(239,68,68,0.32)"}`,
              marginBottom: "24px",
            }}>
              {passed ? "✓  Investigation Passed" : "✗  Investigation Failed"}
            </div>

            {/* Score number */}
            <div style={{
              fontSize: "96px", fontWeight: 800, lineHeight: 1,
              color: passed ? "var(--accent-safety)" : "var(--accent-danger)",
              letterSpacing: "-0.02em",
            }}>
              {result.score}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "8px" }}>
              out of 100 &nbsp;·&nbsp; pass threshold 60
            </div>

            {/* Time row */}
            <div style={{
              marginTop: "20px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "14px",
              fontSize: "14px", color: "var(--text-muted)",
              flexWrap: "wrap",
            }}>
              <span>Time: {timeStr}</span>
              {gotSpeedBonus && (
                <span style={{
                  color: "var(--accent-success)", fontWeight: 600,
                  background: "rgba(74,222,128,0.10)",
                  border: "1px solid rgba(74,222,128,0.25)",
                  borderRadius: "999px", padding: "2px 10px", fontSize: "13px",
                }}>
                  ⚡ Speed bonus +10
                </span>
              )}
              {result.timedOut && (
                <span style={{
                  color: "var(--accent-warning)",
                  background: "rgba(249,115,22,0.10)",
                  border: "1px solid rgba(249,115,22,0.28)",
                  borderRadius: "999px", padding: "2px 10px", fontSize: "13px",
                }}>
                  ⚠ Time expired
                </span>
              )}
            </div>
          </div>

          {/* ── Causal chain card ── */}
          <div style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px", padding: "36px 44px",
          }}>
            <div style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "var(--accent-safety)",
              marginBottom: "28px",
            }}>
              The Real Causal Chain
            </div>

            {/* Sequential animated chain */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {CHAIN.map((item, i) => {
                const visible = i < visibleCount;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "0",
                      opacity: visible ? 1 : 0,
                      animation: visible ? `chainReveal 0.30s ease both` : "none",
                      paddingLeft: `${item.indent * 22}px`,
                      marginBottom: i < CHAIN.length - 1 ? "0" : "0",
                    }}
                  >
                    {/* Connector line + arrow */}
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      marginRight: "12px", flexShrink: 0,
                    }}>
                      {i > 0 && (
                        <div style={{
                          width: "1px", height: "20px",
                          background: item.isRoot ? "var(--accent-safety)" : "var(--border-strong)",
                          marginBottom: "2px",
                        }} />
                      )}
                      <div style={{
                        width: item.isRoot ? "10px" : "8px",
                        height: item.isRoot ? "10px" : "8px",
                        borderRadius: "50%",
                        background: item.isRoot ? "var(--accent-safety)" : "var(--border-strong)",
                        flexShrink: 0,
                        marginTop: i === 0 ? "8px" : "0",
                      }} />
                      {i < CHAIN.length - 1 && (
                        <div style={{
                          width: "1px", flex: 1, minHeight: "20px",
                          background: "var(--border-strong)",
                          marginTop: "2px",
                        }} />
                      )}
                    </div>

                    {/* Text */}
                    <div style={{
                      paddingTop: i === 0 ? "4px" : "0",
                      paddingBottom: "20px",
                      flex: 1,
                    }}>
                      {item.isRoot ? (
                        <div style={{
                          display: "inline-block",
                          background: "rgba(245,197,24,0.10)",
                          border: "1px solid rgba(245,197,24,0.32)",
                          borderRadius: "8px",
                          padding: "10px 16px",
                        }}>
                          <div style={{
                            fontSize: "10px", fontWeight: 800, letterSpacing: "0.16em",
                            color: "var(--accent-safety)", textTransform: "uppercase",
                            marginBottom: "5px",
                          }}>
                            Root Cause
                          </div>
                          <div style={{
                            color: "var(--accent-safety)", fontWeight: 700,
                            fontSize: "15px", lineHeight: 1.45,
                          }}>
                            {item.text}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          color: "var(--text-secondary)", fontSize: "15px",
                          lineHeight: 1.5, paddingTop: "2px",
                        }}>
                          {item.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Backend feedback text */}
            {result.feedback && visibleCount >= CHAIN.length && (
              <div style={{
                marginTop: "8px",
                paddingTop: "20px",
                borderTop: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                fontSize: "14px", lineHeight: 1.7,
                animation: "chainReveal 0.35s ease both",
              }}>
                {result.feedback}
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", paddingBottom: "32px" }}>
            <button
              onClick={() => navigate(`/dashboard/case/${caseNum}`)}
              className="btn-primary"
              style={{ padding: "13px 32px", fontSize: "16px" }}
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate("/game/intro", { state: { caseId } })}
              className="btn-secondary"
              style={{ padding: "12px 24px", fontSize: "15px" }}
            >
              Try Again
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
