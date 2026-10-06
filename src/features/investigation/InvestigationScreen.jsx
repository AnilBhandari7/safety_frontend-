import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import HazardCutscene    from "./HazardCutscene";
import HazardCutscene002 from "./HazardCutscene002";
import BriefingOverlay   from "./BriefingOverlay";
import WarehouseScene    from "./WarehouseScene";
import WhyChain          from "./WhyChain";
import useGameSession    from "./useGameSession";

/*
  Phase flow:
  "cutscene" → "briefing" → "exploring" → "clue-complete" → "why-chain" → "finished"

  caseId flows in from location.state (set by GameIntroScreen) and selects:
   - which incident data to load  (useGameSession)
   - which cutscene component to render
   - which 3D scene builder to use (WarehouseScene)

  GUARD: if caseId is absent from location.state (stale history, direct URL,
  or browser back/forward from a previous session), redirect to /dashboard
  immediately so the user never silently loads the wrong case.
*/
export default function InvestigationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const caseId   = location.state?.caseId;   // intentionally NO default — see guard below

  // ── Guard: missing state means stale history or direct URL navigation ─────
  // Return a redirect BEFORE any hooks that depend on caseId, so no attempt
  // is created and no wrong scene is loaded.
  if (!caseId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <InvestigationScreenInner caseId={caseId} navigate={navigate} location={location} />;
}

// Inner component receives a validated caseId — all hooks run unconditionally.
function InvestigationScreenInner({ caseId, navigate }) {

  const [phase,         setPhase]         = useState("cutscene");
  const [sceneReady,    setSceneReady]    = useState(false);
  const [cutsceneReady, setCutsceneReady] = useState(false); // true once shaders compiled
  const feedbackTimerRef  = useRef(null);
  const clueTransitionRef = useRef(false);

  const {
    attemptId, incident, cluesFound, runningScore,
    timeLeft, timerActive,
    feedback, clearFeedback,
    whyStep, whyDone, lastResult, currentWhyQuestion,
    startTimer, stopTimer,
    handleHotspotClick, submitWhyStep, finishGame,
    finishCalledRef,
    initLoading, initError, loadingProgress,
  } = useGameSession(caseId);


  // ── Briefing dismissed → start exploring + timer ──────────────────────────
  const onBeginInvestigation = useCallback(() => {
    setPhase("exploring");
    startTimer();
  }, [startTimer]);

  // ── Effect 1: enter clue-complete phase + release pointer lock ───────────
  // Depends on [cluesFound, phase] to detect the moment exploration ends.
  // Does NOT start the timer here — that lives in Effect 2, which has a
  // stable dependency array and won't be torn down by its own state change.
  useEffect(() => {
    if (cluesFound >= 3 && phase === "exploring" && !clueTransitionRef.current) {
      clueTransitionRef.current = true;
      setPhase("clue-complete");
      try { document.exitPointerLock(); } catch (_) {}
    }
  }, [cluesFound, phase]);

  // ── Effect 2: delayed advance from clue-complete → why-chain ─────────────
  // Depends ONLY on [phase]. When phase becomes "clue-complete", starts a
  // 2-second timer then flips to "why-chain". Because this effect's deps
  // don't change while the timer is running, React never cleans it up early.
  useEffect(() => {
    if (phase === "clue-complete") {
      const t = setTimeout(() => setPhase("why-chain"), 2000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // ── Timer expired ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && timerActive && !finishCalledRef.current) {
      stopTimer();
      finishGame(180, true).then(result => {
        if (result) navigate("/game/result", { state: { result, caseId } });
      });
    }
  }, [timeLeft, timerActive, finishCalledRef, stopTimer, finishGame, navigate, caseId]);

  // ── Why chain complete → finish ───────────────────────────────────────────
  useEffect(() => {
    if (whyDone && phase === "why-chain" && !finishCalledRef.current) {
      const elapsed = 180 - timeLeft;
      setTimeout(() => {
        finishGame(elapsed, false).then(result => {
          if (result) navigate("/game/result", { state: { result, caseId } });
        });
      }, 1800);
    }
  }, [whyDone, phase, timeLeft, finishCalledRef, finishGame, navigate, caseId]);

  // ── Auto-dismiss feedback panel ───────────────────────────────────────────
  useEffect(() => {
    if (feedback) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(clearFeedback, 3500);
    }
    return () => clearTimeout(feedbackTimerRef.current);
  }, [feedback, clearFeedback]);

  // ── Hotspot click (only active during exploring / why-chain) ─────────────
  const onHotspotClick = useCallback((id) => {
    if (phase !== "exploring" && phase !== "why-chain") return;
    handleHotspotClick(id);
  }, [phase, handleHotspotClick]);

  // ── Timer formatting ──────────────────────────────────────────────────────
  const formatTime    = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timerUrgent   = timeLeft <= 30;
  const timerWarning  = !timerUrgent && timeLeft <= 60;

  // ── Feedback panel content ────────────────────────────────────────────────
  const getFeedbackMeta = (fb) => {
    if (!fb) return null;
    if (fb.alreadyFound) {
      return { label: "ALREADY LOGGED", labelColor: "var(--text-muted)", accent: "var(--border-strong)", delta: null };
    }
    if (fb.isDecoy) {
      return {
        label: "IRRELEVANT EVIDENCE",
        labelColor: "var(--accent-danger)",
        accent: "rgba(239,68,68,0.25)",
        delta: fb.pointDelta !== 0 ? `${fb.pointDelta}` : null,
      };
    }
    return {
      label: "EVIDENCE LOGGED",
      labelColor: "var(--accent-success)",
      accent: "rgba(74,222,128,0.20)",
      delta: fb.pointDelta !== undefined ? `+${fb.pointDelta}` : null,
    };
  };

  const fbMeta = getFeedbackMeta(feedback);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "#0f0f13", overflow: "hidden" }}>

      {/* ── Loading screen ────────────────────────────────────────────────────── */}
      {/* Shown while:                                                             */}
      {/*   a) initLoading — backend API calls (0 % → 50 % → 100 %)              */}
      {/*   b) cutscene phase + !cutsceneReady — after download, while            */}
      {/*      HazardCutscene runs renderer.compileAsync (shader compilation).    */}
      {/* This guarantees the loading bar is visible for the ENTIRE wait before   */}
      {/* the first rendered cutscene frame, with no blank gap in between.        */}
      {(initLoading || (phase === "cutscene" && !cutsceneReady)) && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#0f0f13",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          <div style={{
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.20em",
            color: "#f5c518", textTransform: "uppercase", marginBottom: "18px",
          }}>
            Loading Investigation
          </div>

          {/* Track */}
          <div style={{
            width: "220px", height: "3px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${loadingProgress}%`,
              background: "#f5c518",
              borderRadius: "2px",
              transition: "width 0.18s ease",
            }} />
          </div>

          {/* Percentage only — no ETA */}
          <div style={{
            marginTop: "12px", fontSize: "11px",
            color: "rgba(255,255,255,0.30)", letterSpacing: "0.06em",
          }}>
            {loadingProgress}%
          </div>
        </div>
      )}

      {/* ── Cutscene — selected by caseId; signals onReady after shader compile ── */}
      {!initLoading && phase === "cutscene" && (
        caseId === "case002"
          ? <HazardCutscene002 onComplete={() => setPhase("briefing")} onReady={() => setCutsceneReady(true)} />
          : <HazardCutscene    onComplete={() => setPhase("briefing")} onReady={() => setCutsceneReady(true)} />
      )}

      {/* ── 3D Warehouse — pre-loads during cutscene; caseId selects the builder ── */}
      {!initLoading && phase !== "finished" && (
        <WarehouseScene
          caseId={caseId}
          phase={phase}
          feedback={feedback}
          onHotspotClick={onHotspotClick}
          onReady={() => setSceneReady(true)}
        />
      )}


      {/* ── Briefing overlay (only after scene + models are ready) ──────────── */}
      {phase === "briefing" && sceneReady && (
        incident ? (
          <BriefingOverlay briefing={incident.briefing} onBegin={onBeginInvestigation} />
        ) : initError ? (
          /* Init failed — show error + retry */
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-primary)", zIndex: 300,
          }}>
            <div style={{
              maxWidth: "420px", width: "90%", textAlign: "center",
              background: "var(--bg-panel)", border: "1px solid rgba(239,68,68,0.30)",
              borderRadius: "12px", padding: "40px 32px",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-danger)", textTransform: "uppercase", marginBottom: "14px" }}>
                Load Error
              </div>
              <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "28px", lineHeight: 1.5 }}>
                {initError}
              </p>
              <button
                className="btn-primary"
                onClick={() => window.location.reload()}
                style={{ padding: "12px 32px", fontSize: "15px" }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null  /* API always finishes before briefing — no loading race possible */
      )}

      {/* ── HUD ───────────────────────────────────────────────────────────── */}
      {(phase === "exploring" || phase === "clue-complete" || phase === "why-chain") && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          zIndex: 50,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)",
          pointerEvents: "none",
        }}>
          {/* Left: timer + score */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Timer chip */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: timerUrgent  ? "rgba(239,68,68,0.18)"  :
                          timerWarning ? "rgba(249,115,22,0.15)"  : "rgba(255,255,255,0.08)",
              border: `1px solid ${timerUrgent  ? "rgba(239,68,68,0.55)"  :
                                   timerWarning ? "rgba(249,115,22,0.45)" : "rgba(255,255,255,0.15)"}`,
              padding: "6px 14px", borderRadius: "999px",
              fontSize: "14px", fontWeight: 700,
              color: timerUrgent  ? "var(--accent-danger)"  :
                     timerWarning ? "var(--accent-warning)" : "var(--text-primary)",
              backdropFilter: "blur(4px)",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {formatTime(timeLeft)}
            </div>
            {/* Score chip */}
            <div style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "6px 14px", borderRadius: "999px",
              fontSize: "14px", fontWeight: 600,
              color: "var(--text-primary)",
              backdropFilter: "blur(4px)",
            }}>
              {runningScore} pts
            </div>
          </div>

          {/* Right: clue counter */}
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: cluesFound >= 3 ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)",
            border: `1px solid ${cluesFound >= 3 ? "rgba(74,222,128,0.40)" : "rgba(255,255,255,0.15)"}`,
            padding: "6px 14px", borderRadius: "999px",
            fontSize: "14px", fontWeight: 600,
            color: cluesFound >= 3 ? "var(--accent-success)" : "var(--text-primary)",
            backdropFilter: "blur(4px)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Evidence {cluesFound} / 3
          </div>
        </div>
      )}

      {/* ── Controls hint ─────────────────────────────────────────────────── */}
      {phase === "exploring" && !timerActive === false && (
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.62)", fontSize: "14px", pointerEvents: "none",
          zIndex: 50, letterSpacing: "0.04em",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}>
          Click to lock cursor · WASD to move · Mouse to look · Click objects to investigate
        </div>
      )}

      {/* ── Evidence feedback panel ───────────────────────────────────────── */}
      {feedback && fbMeta && (
        <div style={{
          position: "absolute",
          bottom: "72px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(420px, 90vw)",
          background: "rgba(15,15,19,0.94)",
          border: `1px solid ${fbMeta.accent}`,
          borderRadius: "10px",
          padding: "16px 20px",
          zIndex: 200,
          pointerEvents: "none",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
              color: fbMeta.labelColor, textTransform: "uppercase",
            }}>
              {fbMeta.label}
            </div>
            {fbMeta.delta && (
              <div style={{
                fontSize: "14px", fontWeight: 800,
                color: feedback.isPositive ? "var(--accent-success)" : "var(--accent-danger)",
              }}>
                {fbMeta.delta} pts
              </div>
            )}
          </div>
          {/* Message */}
          <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
            {feedback.message}
          </div>
        </div>
      )}

      {/* ── Clue-complete transition overlay ─────────────────────────────── */}
      {phase === "clue-complete" && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.65)",
          zIndex: 150,
          pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(15,15,19,0.92)",
            border: "1px solid rgba(74,222,128,0.30)",
            borderRadius: "12px",
            padding: "32px 48px",
            textAlign: "center",
            backdropFilter: "blur(16px)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
          }}>
            <div style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em",
              color: "var(--accent-success)", textTransform: "uppercase",
              marginBottom: "14px",
            }}>
              All Evidence Logged
            </div>
            <div style={{
              fontSize: "20px", fontWeight: 700,
              color: "var(--text-primary)", lineHeight: 1.4,
            }}>
              All clues found — preparing<br />your questions…
            </div>
          </div>
        </div>
      )}

      {/* ── 5-Why chain overlay ───────────────────────────────────────────── */}
      {phase === "why-chain" && currentWhyQuestion && (
        <WhyChain
          question={currentWhyQuestion}
          totalSteps={5}
          onSubmit={submitWhyStep}
          lastResult={lastResult}
        />
      )}

    </div>
  );
}
