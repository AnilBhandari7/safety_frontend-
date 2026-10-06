import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

// Simple inline SVG eye icons — no dependency needed
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

// Digits-only, 7–15 characters
const PHONE_RE = /^\d{7,15}$/;

// Top-level component so its identity is stable across SignupPage re-renders.
// If declared inside SignupPage, React creates a new type on every keystroke
// and unmounts/remounts the input — dropping the typed value and focus.
function PwField({ name, placeholder, show, onToggle, value, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        className="form-input"
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        required
        autoComplete="new-password"
        onChange={onChange}
        style={{ paddingRight: "44px" }}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{
          position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: "4px",
          display: "flex", alignItems: "center",
          lineHeight: 0,
        }}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOpen /> : <EyeOff />}
      </button>
    </div>
  );
}

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [error,       setError]       = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Phone — digits only, 7–15 digits
    const digitsOnly = formData.phone.replace(/\D/g, "");
    if (formData.phone !== digitsOnly) {
      return setError("Phone number must contain digits only");
    }
    if (!PHONE_RE.test(digitsOnly)) {
      return setError("Phone number must be 7–15 digits");
    }

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    try {
      const res = await client.post("/auth/signup", { ...formData, phone: digitsOnly });
      login(res.data.user, res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
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
            <Link to="/login" className="btn-secondary" style={{ padding: "8px 18px", fontSize: "14px" }}>Log In</Link>
          </div>
        </div>
      </nav>

      {/* Centered form */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px var(--pg-pad)",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Create account</h1>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "32px" }}>
            Join Safety Detective and start your training.
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input className="form-input" name="name"  type="text"  placeholder="Full name"     required autoComplete="name"  onChange={handleChange} />
            <input className="form-input" name="email" type="email" placeholder="Email address" required autoComplete="email" onChange={handleChange} />

            {/* Phone — validated on submit only */}
            <input
              className="form-input"
              name="phone"
              type="tel"
              placeholder="Phone number"
              required
              autoComplete="tel"
              onChange={handleChange}
            />

            <PwField
              name="password"
              placeholder="Password (min. 6 characters)"
              show={showPw}
              onToggle={() => setShowPw(v => !v)}
              value={formData.password}
              onChange={handleChange}
            />
            <PwField
              name="confirmPassword"
              placeholder="Confirm password"
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <button type="submit" className="btn-primary" style={{ marginTop: "4px", padding: "13px", fontSize: "16px", width: "100%" }}>
              Sign Up
            </button>
          </form>

          <p style={{ marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)", textAlign: "center" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--accent-safety)", textDecoration: "underline" }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
