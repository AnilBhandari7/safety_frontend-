import { useState, useEffect, useCallback } from "react";
import client from "../../api/client";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEmployees = useCallback(() => {
    client.get("/admin/employees")
      .then(res => { setEmployees(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(
      `Delete "${employee.name}" (${employee.email})?\n\n` +
      `This will permanently remove the account and ALL their attempt records. ` +
      `Their email and phone will be free to re-register immediately.\n\n` +
      `This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(employee._id);
    try {
      await client.delete(`/admin/employees/${employee._id}`);
      setEmployees(prev => prev.filter(e => e._id !== employee._id));
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed — please try again.");
    } finally {
      setDeletingId(null);
    }
  };

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
  };

  // Initials avatar
  const Avatar = ({ name }) => {
    const initials = name
      ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
      : "?";
    return (
      <div style={{
        width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
        background: "rgba(245,197,24,0.12)", border: "1px solid rgba(245,197,24,0.25)",
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

  if (employees.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
        No employees registered yet.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
      <thead>
        <tr>
          <th style={th}>Employee</th>
          <th style={th}>Phone</th>
          <th style={th}>Role</th>
          <th style={th}>Joined</th>
          <th style={th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {employees.map(e => {
          const isDeleting = deletingId === e._id;
          return (
            <tr key={e._id}>
              {/* Name + email + avatar */}
              <td style={{ ...td, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Avatar name={e.name} />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px", marginBottom: "2px" }}>
                      {e.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{e.email}</div>
                  </div>
                </div>
              </td>

              <td style={td}>{e.phone || "—"}</td>

              <td style={td}>
                <span style={{
                  fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--text-muted)",
                }}>
                  {e.role}
                </span>
              </td>

              <td style={td}>
                {new Date(e.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </td>

              <td style={td}>
                <button
                  onClick={() => handleDelete(e)}
                  disabled={isDeleting}
                  style={{
                    padding: "6px 14px",
                    fontSize: "12px", fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: isDeleting ? "var(--text-muted)" : "var(--accent-danger)",
                    background: "transparent",
                    border: `1px solid ${isDeleting ? "var(--border-subtle)" : "rgba(239,68,68,0.40)"}`,
                    borderRadius: "6px",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    opacity: isDeleting ? 0.5 : 1,
                    transition: "background 0.15s, color 0.15s, border-color 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={ev => {
                    if (!isDeleting) {
                      ev.currentTarget.style.background = "rgba(239,68,68,0.12)";
                      ev.currentTarget.style.borderColor = "var(--accent-danger)";
                    }
                  }}
                  onMouseLeave={ev => {
                    ev.currentTarget.style.background = "transparent";
                    ev.currentTarget.style.borderColor = "rgba(239,68,68,0.40)";
                  }}
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
