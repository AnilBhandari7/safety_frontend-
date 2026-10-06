import { useState } from "react";

/*
  WhyChain — Why-chain question UI
  Props:
    question  : { order, question, options:[{id,text}], points }
    totalSteps: 5
    onSubmit(optionId) : async
    lastResult: null | { correct, pointDelta }

  Interaction: full-card click to select, no radio visible.
  Submission: single amber CTA, disabled until selection made.
  Content: question text and options rendered from props — never hardcoded.
*/
export default function WhyChain({ question, totalSteps = 5, onSubmit, lastResult }) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!question) return null;

  const isRoot = question.order === totalSteps;

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    await onSubmit(selected);
    setSelected(null);
    setSubmitting(false);
  };

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(5,5,8,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300,
      backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        padding: "40px 48px",
        maxWidth: "660px",
        width: "94%",
        boxShadow: "0 32px 100px rgba(0,0,0,0.85)",
      }}>

        {/* ── Header row: step label + points ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Dot indicators */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              {Array.from({ length: totalSteps }).map((_, i) => {
                const isDone    = i < question.order - 1;
                const isCurrent = i === question.order - 1;
                return (
                  <div key={i} style={{
                    width:  isCurrent ? "22px" : "8px",
                    height: "8px",
                    borderRadius: "999px",
                    background: isDone    ? "var(--accent-success)" :
                                isCurrent ? "var(--accent-safety)"  : "var(--bg-elevated)",
                    border: isCurrent ? "none" : `1px solid ${isDone ? "transparent" : "var(--border-strong)"}`,
                    transition: "width 0.2s, background 0.2s",
                  }} />
                );
              })}
            </div>
            <span style={{
              fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em",
              color: "var(--text-muted)", textTransform: "uppercase",
            }}>
              {isRoot ? "Root Cause" : `Step ${question.order} of ${totalSteps}`}
            </span>
          </div>
          <div style={{
            fontSize: "12px", color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "999px", padding: "3px 10px",
          }}>
            {`+${question.points} / −10`}
          </div>
        </div>

        {/* ── Thin progress track ── */}
        <div style={{ display: "flex", gap: "3px", marginBottom: "28px" }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: "2px", borderRadius: "1px",
              background: i < question.order - 1 ? "var(--accent-success)"
                        : i === question.order - 1 ? "var(--accent-safety)"
                        : "var(--border-subtle)",
              transition: "background 0.25s",
            }} />
          ))}
        </div>

        {/* ── Last answer feedback ── */}
        {lastResult && (
          <div style={{
            padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
            background: lastResult.correct ? "rgba(74,222,128,0.09)" : "rgba(239,68,68,0.09)",
            border: `1px solid ${lastResult.correct ? "rgba(74,222,128,0.28)" : "rgba(239,68,68,0.28)"}`,
            color: lastResult.correct ? "var(--accent-success)" : "var(--accent-danger)",
            fontSize: "14px", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontSize: "16px" }}>{lastResult.correct ? "✓" : "✗"}</span>
            <span>
              {lastResult.correct
                ? `Correct — +${lastResult.pointDelta} pts. Keep digging.`
                : `Incorrect — ${lastResult.pointDelta} pts. Let's keep going.`}
            </span>
          </div>
        )}

        {/* ── Question text ── */}
        <h2 style={{
          fontSize: "20px", fontWeight: 700,
          color: "var(--text-primary)", marginBottom: "24px", lineHeight: 1.45,
        }}>
          {question.question}
        </h2>

        {/* ── Option cards (full-card click, no visible radio) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
          {question.options.map((opt, idx) => {
            const isSelected   = selected === opt.id;
            // Display letter comes from position in the (already shuffled) array,
            // not from opt.id — so it always reads A, B, C, D top-to-bottom.
            const displayLetter = String.fromCharCode(65 + idx); // 0→A, 1→B, 2→C, 3→D
            return (
              <button
                key={opt.id}
                onClick={() => !submitting && setSelected(opt.id)}
                disabled={submitting}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "14px",
                  padding: "16px 18px",
                  border: `1px solid ${isSelected ? "var(--accent-safety)" : "var(--border-subtle)"}`,
                  borderRadius: "10px",
                  cursor: submitting ? "default" : "pointer",
                  background: isSelected ? "rgba(245,197,24,0.09)" : "var(--bg-elevated)",
                  transition: "border-color 0.12s, background 0.12s",
                  textAlign: "left",
                  width: "100%",
                  outline: "none",
                  fontFamily: "inherit",
                }}>
                {/* Letter badge: position-derived, not content-id */}
                <div style={{
                  flexShrink: 0,
                  width: "26px", height: "26px",
                  borderRadius: "6px",
                  background: isSelected ? "var(--accent-safety)" : "var(--bg-primary)",
                  border: `1px solid ${isSelected ? "var(--accent-safety)" : "var(--border-strong)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 800,
                  color: isSelected ? "#0f0f13" : "var(--text-muted)",
                  transition: "background 0.12s, color 0.12s",
                }}>
                  {displayLetter}
                </div>
                <span style={{
                  color: "var(--text-primary)", fontSize: "15px",
                  lineHeight: 1.5, paddingTop: "2px",
                }}>
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="btn-primary"
          style={{
            width: "100%", padding: "15px", fontSize: "16px",
            opacity: (!selected || submitting) ? 0.38 : 1,
            transition: "opacity 0.15s",
            letterSpacing: "0.02em",
          }}
        >
          {submitting ? "Submitting…" : isRoot ? "Submit Root Cause" : "Submit Answer"}
        </button>
      </div>
    </div>
  );
}
