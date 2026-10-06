import { Link } from 'react-router-dom';

export default function LandingPage() {
  const S = {
    page:    { background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
    // nav bar: full-width bg; content constrained via pg-nav-inner class
    nav:     { background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)', height: '60px', flexShrink: 0 },
    navLogo: { fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em' },
    navAmt:  { color: 'var(--accent-safety)' },
    navBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
    main:    { flex: 1, display: 'flex', flexDirection: 'column' },
    // hero: genuinely centered content — full-bleed bg, inner content centered
    hero: {
      flex: 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px var(--pg-pad) 60px',
      textAlign: 'center',
      background: 'linear-gradient(180deg, rgba(245,197,24,0.04) 0%, transparent 60%)',
      borderBottom: '1px solid var(--border-subtle)',
    },
    eyebrow: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--accent-safety)', textTransform: 'uppercase', marginBottom: '20px' },
    h1:      { fontSize: 'clamp(38px,5vw,64px)', fontWeight: 800, lineHeight: 1.08, marginBottom: '8px' },
    h1sub:   { fontSize: 'clamp(38px,5vw,64px)', fontWeight: 800, lineHeight: 1.08, color: 'var(--accent-safety)', marginBottom: '24px' },
    desc:    { fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.65, marginBottom: '40px' },
    ctaRow:  { display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' },
    howTitle:{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '40px' },
    grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
    fCard:   { background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '28px 24px' },
    fIcon:   { width: '40px', height: '40px', marginBottom: '16px', color: 'var(--accent-safety)' },
    fTitle:  { fontSize: '17px', fontWeight: 700, marginBottom: '10px' },
    fBody:   { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 },
    // footer: full-width bg; text centered within same margin boundary
    footer:  { borderTop: '1px solid var(--border-subtle)', flexShrink: 0 },
    footInner:{ maxWidth: 'var(--pg-max)', margin: '0 auto', padding: '20px var(--pg-pad)', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' },
  };

  const features = [
    {
      title: 'Enter the Scene',
      body: 'Move through a first-person 3D warehouse using WASD and mouse-look. The environment is drawn from a real incident — every object placed deliberately.',
      icon: <svg style={S.fIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      title: 'Investigate Evidence',
      body: 'Click objects in the scene to examine them. Three real clues link back to the incident — four decoys test whether you can read the scene, not just click everything.',
      icon: <svg style={S.fIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    },
    {
      title: 'Trace the Root Cause',
      body: 'Answer five sequential "Why?" questions to go beyond surface symptoms. The chain ends at the systemic cause — not the worker, not the puddle.',
      icon: <svg style={S.fIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
  ];

  return (
    <div style={S.page}>
      {/* Nav: full-width bar, content constrained to container */}
      <nav style={S.nav}>
        <div className="pg-nav-inner">
          <div style={S.navLogo}>Safety<span style={S.navAmt}> Detective</span></div>
          <div style={S.navBtns}>
            <Link to="/login"  className="btn-secondary" style={{ padding: '8px 18px', fontSize: '14px' }}>Log In</Link>
            <Link to="/signup" className="btn-primary"   style={{ padding: '8px 18px', fontSize: '14px' }}>Sign Up</Link>
          </div>
        </div>
      </nav>

      <main style={S.main}>
        {/* Hero: genuinely centered — stays centered within full-bleed section */}
        <section style={S.hero}>
          <div style={S.eyebrow}>Safety Training Simulation</div>
          <h1 style={S.h1}>Investigate.</h1>
          <div style={S.h1sub}>Find the root cause.</div>
          <p style={S.desc}>
            Walk a first-person 3D warehouse, uncover evidence from a real workplace slip incident,
            and use the 5 Whys to trace what actually caused it — not just what's on the surface.
          </p>
          <div style={S.ctaRow}>
            <Link to="/signup" className="btn-primary"   style={{ padding: '14px 36px', fontSize: '16px' }}>Get Started</Link>
            <Link to="/login"  className="btn-secondary" style={{ padding: '13px 28px', fontSize: '15px' }}>Log In</Link>
          </div>
        </section>

        {/* "How it works": body content aligned to the same container margin */}
        <section className="pg-body">
          <div style={S.howTitle}>How it works</div>
          <div style={S.grid}>
            {features.map(({ title, body, icon }) => (
              <div key={title} style={S.fCard}>
                {icon}
                <h3 style={S.fTitle}>{title}</h3>
                <p  style={S.fBody}>{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={S.footer}>
        <div style={S.footInner}>© 2026 Safety Detective</div>
      </footer>
    </div>
  );
}
