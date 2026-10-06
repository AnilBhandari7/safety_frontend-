import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

/*
  EmployeeDashboard — case list screen.
  Shows one tile per case. Clicking a tile navigates to /dashboard/case/:id.
  case002 is locked until the player has a passed attempt on case001.
  Locked case002 title/description text is blurred; lock badge and status are crisp.
*/
export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [data, setData]   = useState(null);
  const navigate           = useNavigate();

  useEffect(() => {
    client.get("/employee/history")
      .then(res => setData(res.data))
      .catch(console.error);
  }, []);

  const attempts = data?.attempts || [];

  // Per-case derived stats
  const case001Attempts = attempts.filter(a => a.incidentId?.caseId === "case001");
  const case002Attempts = attempts.filter(a => a.incidentId?.caseId === "case002");

  const completedCase001 = case001Attempts.filter(a => a.status === "completed");
  const completedCase002 = case002Attempts.filter(a => a.status === "completed");

  const case001Passed = completedCase001.some(a => a.passed);
  const case002Passed = completedCase002.some(a => a.passed);

  // case002 is locked until case001 has been passed
  const case002Locked = !case001Passed;

  // Legacy single-case status (for case001 tile badge — unchanged)
  const case001Status = () => {
    if (completedCase001.length === 0) return { label: "Not started", color: "var(--text-muted)", cls: null };
    if (case001Passed)                 return { label: "Passed",       color: "var(--accent-success)", cls: "badge-pass" };
    return                               { label: "In progress",   color: "var(--accent-warning)", cls: null };
  };
  const case002Status = () => {
    if (case002Locked)                 return { label: "Locked",       color: "var(--text-muted)", cls: null };
    if (completedCase002.length === 0) return { label: "Not started",  color: "var(--text-muted)", cls: null };
    if (case002Passed)                 return { label: "Passed",       color: "var(--accent-success)", cls: "badge-pass" };
    return                               { label: "In progress",   color: "var(--accent-warning)", cls: null };
  };

  const cases = [
    {
      id:          "001",
      seq:         1,
      eyebrow:     "Case File #001",
      title:       "Warehouse Slip Incident",
      description: "A worker slips near the loading dock. Investigate the scene, find the evidence, and trace the root cause using the 5 Whys.",
      tags:        ["3D Investigation", "5 Whys", "Workplace Safety"],
      locked:      false,
      status:      case001Status(),
    },
    {
      id:          "002",
      seq:         2,
      eyebrow:     "Case File #002",
      title:       "Blocked Fire Exit Incident",
      description: "An alarm sounded during a routine shift. A worker tried to leave through the nearest emergency exit — it wouldn't open. Investigate the scene and trace the root cause.",
      tags:        ["3D Investigation", "5 Whys", "Fire Safety"],
      locked:      case002Locked,
      status:      case002Status(),
    },
  ];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>

      {/* Nav */}
      <nav style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", height: "60px" }}>
        <div className="pg-nav-inner">
          <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.04em" }}>
            Safety<span style={{ color: "var(--accent-safety)" }}>Detective</span>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "14px", color: "var(--text-secondary)" }}>
            <span>{user?.name}</span>
            <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary" style={{ padding: "7px 16px", fontSize: "13px" }}>Log Out</button>
          </div>
        </div>
      </nav>

      <div className="pg-body">
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
          Employee Dashboard
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "40px" }}>
          Welcome back, {user?.name}
        </h1>

        {/* Case list */}
        <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "16px" }}>
          Your Cases
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {cases.map(c => {
            const isLocked = c.locked;
            const st       = c.status;

            return (
              <div
                key={c.id}
                onClick={() => !isLocked && navigate(`/dashboard/case/${c.id}`)}
                style={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  padding: "28px 32px",
                  cursor: isLocked ? "not-allowed" : "pointer",
                  opacity: isLocked ? 0.6 : 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "24px",
                  flexWrap: "wrap",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={ev => {
                  if (!isLocked) ev.currentTarget.style.borderColor = "var(--border-strong)";
                }}
                onMouseLeave={ev => {
                  ev.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              >
                {/* Left: case info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Eyebrow — always crisp, even when locked */}
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-safety)", textTransform: "uppercase", marginBottom: "6px" }}>
                    {isLocked ? "🔒 Locked" : c.eyebrow}
                  </div>

                  {/* Title — blurred when locked */}
                  <div style={{
                    fontSize: "20px", fontWeight: 700, marginBottom: "6px",
                    filter: isLocked ? "blur(4px)" : "none",
                    userSelect: isLocked ? "none" : "auto",
                    transition: "filter 0.2s",
                  }}>
                    {c.title}
                  </div>

                  {/* Description — blurred when locked */}
                  <p style={{
                    fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.55,
                    marginBottom: "14px", maxWidth: "560px",
                    filter: isLocked ? "blur(4px)" : "none",
                    userSelect: isLocked ? "none" : "auto",
                    transition: "filter 0.2s",
                  }}>
                    {c.description}
                  </p>

                  {/* Tags — blurred when locked */}
                  <div style={{
                    display: "flex", gap: "8px", flexWrap: "wrap",
                    filter: isLocked ? "blur(3px)" : "none",
                    transition: "filter 0.2s",
                  }}>
                    {c.tags.map(t => (
                      <span key={t} style={{
                        background: "var(--bg-elevated)", color: "var(--text-secondary)",
                        border: "1px solid var(--border-subtle)", padding: "3px 10px",
                        borderRadius: "999px", fontSize: "12px", fontWeight: 500,
                      }}>{t}</span>
                    ))}
                  </div>
                </div>

                {/* Right: status + chevron — always crisp */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                  {st.cls ? (
                    <span className={st.cls}>{st.label}</span>
                  ) : (
                    <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: st.color, textTransform: "uppercase" }}>
                      {st.label}
                    </span>
                  )}
                  {!isLocked && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
