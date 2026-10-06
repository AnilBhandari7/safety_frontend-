import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import EmployeeResults from "./EmployeeResults";
import EmployeeList from "./EmployeeList";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("results");
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const tabs = [
    { id: "results", label: "Employee Results" },
    { id: "list",    label: "Employee List"    },
  ];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>

      {/* Nav: full-width bg, content constrained */}
      <nav style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", height: "60px" }}>
        <div className="pg-nav-inner">
          <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.04em" }}>
            Safety<span style={{ color: "var(--accent-safety)" }}> Detective</span>
            <span style={{ marginLeft: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase" }}>Admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{user?.name}</span>
            <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary" style={{ padding: "7px 16px", fontSize: "13px" }}>Log Out</button>
          </div>
        </div>
      </nav>

      <div className="pg-body">
        {/* Page header */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Admin Dashboard</div>
          <h1 style={{ fontSize: "26px", fontWeight: 700 }}>Welcome, {user?.name}</h1>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "0" }}>
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "12px 20px",
                  fontSize: "14px", fontWeight: active ? 700 : 500,
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottom: active ? "2px solid var(--accent-safety)" : "2px solid transparent",
                  marginBottom: "-1px",
                  transition: "color 0.15s",
                  fontFamily: "inherit",
                  letterSpacing: active ? "0.01em" : "0",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content card */}
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          {activeTab === "results" ? <EmployeeResults /> : <EmployeeList />}
        </div>
      </div>
    </div>
  );
}
