import { useState, useEffect } from "react";
import client from "../../api/client";

/*
  EmployeeResults — admin view of employee training progress.

  Data shape from GET /admin/results (one row per employee × case):
    { userId, name, email, incidentId, incidentTitle,
      attempts, bestScore, passed, lastAttempt }

  With one case today this renders as one row per employee.
  When a second case is added, each employee automatically gets a
  second row — no structural change needed here.
*/
export default function EmployeeResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/admin/results")
      .then(res => {
        // Sort by employee name, then by case title within each employee
        const sorted = res.data.sort((a, b) => {
          const nameCmp = a.name.localeCompare(b.name);
          if (nameCmp !== 0) return nameCmp;
          return (a.incidentTitle || "").localeCompare(b.incidentTitle || "");
        });
        setResults(sorted);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const th = {
    padding: "13px 18px",
    fontSize: "11px", fontWeight: 700,
    letterSpacing: "0.10em", textTransform: "uppercase",
    color: "var(--text-muted)",
    background: "var(--bg-elevated)",
    borderBottom: "1px solid var(--border-subtle)",
    textAlign: "left",
  };
  const td = {
    padding: "15px 18px",
    fontSize: "14px",
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--border-subtle)",
    verticalAlign: "middle",
  };
  const tdBold = { ...td, fontWeight: 700, color: "var(--text-primary)" };

  const Avatar = ({ name }) => {
    const initials = name
      ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
      : "?";
    return (
      <div style={{
        width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
        background: "rgba(245,197,24,0.15)", border: "1px solid rgba(245,197,24,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", fontWeight: 800, color: "var(--accent-safety)",
      }}>
        {initials}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
        Loading…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
        No employees result found.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
      <thead>
        <tr>
          <th style={th}>Employee</th>
          <th style={th}>Case</th>
          <th style={th}>Attempts</th>
          <th style={th}>Best Score</th>
          <th style={th}>Status</th>
          <th style={th}>Last Attempt</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => {
          // r.attempts is the correct field name returned by the backend
          const hasDone  = r.attempts > 0;
          // Use r.passed computed server-side (accounts for actual pass threshold)
          const scoreCol = !hasDone          ? "var(--text-muted)"
                         : r.passed          ? "var(--accent-success)"
                         :                     "var(--accent-danger)";

          return (
            <tr key={`${r.userId}-${r.incidentId}`}>

              {/* Employee: avatar + name + email */}
              <td style={{ ...td, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Avatar name={r.name} />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px", marginBottom: "2px" }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{r.email}</div>
                  </div>
                </div>
              </td>

              {/* Case — incidentTitle from backend; extensible to multiple cases */}
              <td style={td}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {r.incidentTitle || "—"}
                </span>
              </td>

              {/* Attempts count */}
              <td style={td}>{hasDone ? r.attempts : "—"}</td>

              {/* Best score — colored by pass/fail */}
              <td style={{ ...tdBold, color: scoreCol }}>
                {hasDone ? `${r.bestScore}` : "—"}
              </td>

              {/* Status badge */}
              <td style={td}>
                {!hasDone ? (
                  <span style={{
                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                    color: "var(--text-muted)", textTransform: "uppercase",
                  }}>Not started</span>
                ) : (
                  <span className={r.passed ? "badge-pass" : "badge-fail"}>
                    {r.passed ? "Passed" : "Failed"}
                  </span>
                )}
              </td>

              {/* Last attempt date */}
              <td style={td}>
                {r.lastAttempt
                  ? new Date(r.lastAttempt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
              </td>

            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
