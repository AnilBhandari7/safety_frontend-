import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

// ── Eye icons — module-level so identity never changes across re-renders ──────
const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Password-field-with-toggle — module-level for the same reason ─────────────
// Must NOT be declared inside LoginPage: React would create a new component
// type on every keystroke → unmount/remount → wiped value and lost focus.
function PwField({ value, onChange, show, onToggle }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        className="form-input"
        type={show ? "text" : "password"}
        placeholder="Password"
        value={value}
        onChange={onChange}
        required
        autoComplete="current-password"
        style={{ paddingRight: "44px" }}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: "4px",
          display: "flex", alignItems: "center", lineHeight: 0,
        }}
      >
        {show ? <EyeOpen /> : <EyeOff />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [email,   setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await client.post("/auth/login", { email, password });
      login(res.data.user, res.data.token);
      if (res.data.user.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>

      {/* Nav */}
      <nav style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", height: "60px", flexShrink: 0 }}>
        <div className="pg-nav-inner">
          <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.04em" }}>
            Safety<span style={{ color: "var(--accent-safety)" }}> Detective</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button onClick={() => navigate("/")} className="btn-secondary" style={{ padding: "7px 16px", fontSize: "13px" }}>← Back</button>
            <Link to="/signup" className="btn-primary" style={{ padding: "8px 18px", fontSize: "14px" }}>Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Centered form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px var(--pg-pad)" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Welcome back</h1>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "32px" }}>
            Log in to continue your safety training.
          </p>

          {error && (
            <div style={{
              color: "var(--accent-danger)", fontSize: "14px",
              padding: "11px 14px", marginBottom: "16px",
              background: "rgba(239,68,68,0.10)", borderRadius: "6px",
              border: "1px solid rgba(239,68,68,0.28)",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              className="form-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <PwField
              value={password}
              onChange={e => setPassword(e.target.value)}
              show={showPw}
              onToggle={() => setShowPw(v => !v)}
            />

            <button type="submit" className="btn-primary" style={{ marginTop: "4px", padding: "13px", fontSize: "16px", width: "100%" }}>
              Log In
            </button>
          </form>

          <p style={{ marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)", textAlign: "center" }}>
            Don&apos;t have an account?{" "}
            <Link to="/signup" style={{ color: "var(--accent-safety)", textDecoration: "underline" }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
