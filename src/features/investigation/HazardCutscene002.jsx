import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildWarehouse002 } from "./warehouseBuilder";

// ── Low-poly worker — identical rig to HazardCutscene ────────────────────────
function buildWorker() {
  const root = new THREE.Group();

  const flatMat = (color) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mkBox = (w, h, d, color, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };
  const mkCyl = (rt, rb, h, segs, color, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, segs),
      flatMat(color),
    );
    m.position.set(x, y, z);
    return m;
  };

  const SKIN = 0xd4956a, TROUSER = 0x3a4a5a, BOOT = 0x2a2820;
  const VEST = 0xf5a623, HELMET = 0xf5c518, SHIRT = 0xd0d0d0;

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.92;
  torso.add(mkBox(0.38, 0.50, 0.24, SHIRT));
  torso.add(mkBox(0.38, 0.50, 0.02, VEST, 0, 0, 0.13));
  torso.add(mkBox(0.05, 0.50, 0.24, VEST, -0.165, 0, 0));
  torso.add(mkBox(0.05, 0.50, 0.24, VEST,  0.165, 0, 0));
  torso.add(mkBox(0.38, 0.055, 0.26, 0xf0e040, 0, 0.10, 0));
  root.add(torso);

  // Head
  const head = new THREE.Group();
  head.position.y = 0.46;
  head.add(mkBox(0.30, 0.28, 0.26, SKIN));
  head.add(mkCyl(0.22, 0.22, 0.04, 8, HELMET, 0, 0.17, 0));
  head.add(mkCyl(0.14, 0.21, 0.14, 8, HELMET, 0, 0.27, 0));
  torso.add(head);

  // Arms
  const makeArm = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.28, 0.18, 0);
    g.add(mkBox(0.11, 0.30, 0.12, VEST, 0, -0.15, 0));
    const forearm = new THREE.Group();
    forearm.position.y = -0.32;
    forearm.add(mkBox(0.10, 0.27, 0.10, SKIN, 0, -0.13, 0));
    g.add(forearm);
    return { g, forearm };
  };
  const { g: leftArmGrp, forearm: leftForearm }  = makeArm(-1);
  const { g: rightArmGrp, forearm: rightForearm } = makeArm(1);
  torso.add(leftArmGrp, rightArmGrp);

  // Legs
  const makeLeg = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.11, 0.90, 0);
    g.add(mkBox(0.16, 0.36, 0.16, TROUSER, 0, -0.18, 0));
    const shin = new THREE.Group();
    shin.position.y = -0.38;
    shin.add(mkBox(0.14, 0.32, 0.14, TROUSER, 0, -0.16, 0));
    shin.add(mkBox(0.16, 0.10, 0.22, BOOT, 0, -0.35, 0.03));
    g.add(shin);
    return { g, shin };
  };
  const { g: leftLegGrp, shin: leftShin }   = makeLeg(-1);
  const { g: rightLegGrp, shin: rightShin } = makeLeg(1);
  root.add(leftLegGrp, rightLegGrp);

  return {
    root, torso, head,
    leftArmGrp, rightArmGrp, leftForearm, rightForearm,
    leftLegGrp, rightLegGrp, leftShin, rightShin,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HazardCutscene002({ onComplete, onReady }) {
  const mountRef = useRef(null);
  const doneRef  = useRef(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let mounted   = true;
    let animId;
    let audioCtx  = null;
    let alarmNode = null;
    let alarmBuf  = null;
    let alarmGain = null;
    let audioUnlockHandler = null;   // silent resume listener for fresh-reload path

    const W = window.innerWidth;
    const H = window.innerHeight;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.07;
    renderer.shadowMap.enabled   = false;
    el.appendChild(renderer.domElement);

    // ── Scene + camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdfe6ee);

    const camera = new THREE.PerspectiveCamera(62, W / H, 0.04, 80);

    // ── Black fade overlay ────────────────────────────────────────────────────
    const fadeEl = document.createElement('div');
    Object.assign(fadeEl.style, {
      position: 'absolute', inset: '0',
      background: '#000',
      opacity: '1',
      pointerEvents: 'none',
      transition: 'opacity 0.5s ease',
      zIndex: '10',
    });
    el.style.position = 'relative';
    el.appendChild(fadeEl);

    // ── Skip button ───────────────────────────────────────────────────────────
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip ›';
    Object.assign(skipBtn.style, {
      position: 'absolute', top: '24px', right: '28px',
      background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)',
      color: '#fff', padding: '8px 18px', fontSize: '13px',
      fontWeight: 600, letterSpacing: '0.08em', borderRadius: '6px',
      cursor: 'pointer', zIndex: '20', fontFamily: 'system-ui, sans-serif',
    });
    el.appendChild(skipBtn);

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      // Fade alarm out if playing
      if (alarmGain && audioCtx) {
        try { alarmGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3); } catch (_) {}
      }
      cancelAnimationFrame(animId);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      if (el.contains(fadeEl))   el.removeChild(fadeEl);
      if (el.contains(skipBtn))  el.removeChild(skipBtn);
      renderer.dispose();
      if (onComplete) onComplete();
    };
    skipBtn.addEventListener('click', finish);

    // ── Audio — fire-alarm.mp3 ────────────────────────────────────────────────
    async function loadAlarm() {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const res  = await fetch('/assets/sounds/fire-alarm.mp3');
        const data = await res.arrayBuffer();
        alarmBuf   = await audioCtx.decodeAudioData(data);
      } catch (err) {
        console.warn('[HazardCutscene002] Alarm audio load failed:', err);
      }
    }

    function startAlarm() {
      if (!audioCtx || !alarmBuf) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      alarmNode = audioCtx.createBufferSource();
      alarmNode.buffer = alarmBuf;
      alarmNode.loop   = true;
      alarmGain = audioCtx.createGain();
      alarmGain.gain.value = 0.0;
      alarmNode.connect(alarmGain).connect(audioCtx.destination);
      alarmNode.start();
      // Abrupt ramp-up
      alarmGain.gain.setTargetAtTime(0.55, audioCtx.currentTime, 0.05);
    }

    // Load alarm concurrently with scene build
    loadAlarm();

    // ── Worker ────────────────────────────────────────────────────────────────
    const worker = buildWorker();
    scene.add(worker.root);

    // Timeline (seconds)
    // 0.0 – 0.5   fade-in from black
    // 0.5 – 3.0   calm walk from spawn toward aisle (south)
    // 3.0          alarm starts abruptly
    // 3.0 – 5.2   worker jogs/runs toward fire exit (right wall, x≈8.3, z=-3)
    // 5.2 – 7.0   at exit: pull handle (lean back, brace, door doesn't open)
    // 7.0 – 7.5   worker steps back, pauses
    // 7.5 – 8.5   fade to silhouette then full black; alarm fades
    const T_FADE_IN    = 0.5;
    const T_WALK_END   = 3.0;
    const T_ALARM      = 3.0;
    const T_RUN_END    = 5.2;
    const T_PULL_END   = 7.0;
    const T_PAUSE_END  = 7.5;
    const T_FADE_OUT   = 8.5;

    // Walk start / end positions
    const WALK_START = new THREE.Vector3(0, 0, 16);
    const WALK_END   = new THREE.Vector3(0, 0,  2); // mid-aisle, then turns left toward exit

    // Run target: handle (south) side of the door, well clear of the box pile.
    // Door centre DZ=-3.0; handle side is south (z < -3.0); pile collider clears at z≈-3.40.
    // Worker stops at z=-3.3 so they're in front of the push-bar with no clipping.
    const RUN_END = new THREE.Vector3(6.0, 0, -3.3);

    // Camera positions — all on the SOUTH side so the camera frames the worker
    // pulling the handle on the accessible (handle) side of the door.
    const CAM_WALK  = new THREE.Vector3(2.5,  1.8, 16);   // east side during calm walk
    const CAM_ALARM = new THREE.Vector3(2.5,  1.8,  5);   // east, after alarm fires
    const CAM_RUN   = new THREE.Vector3(1.0,  2.6,  2);   // overhead pull-back showing run
    const CAM_PULL  = new THREE.Vector3(4.0,  1.7, -6.0); // SOUTH of door, framing handle side
    const CAM_PAUSE = new THREE.Vector3(4.2,  1.7, -5.8); // same south side, settle

    // Look-at targets
    const LOOK_PULL = new THREE.Vector3(7.5, 1.3, -3.0);  // toward door face from south

    // ── Build warehouse scene (so exit door is visible) ───────────────────────
    let glowPlanes = [];
    buildWarehouse002(scene, new THREE.LoadingManager()).then(result => {
      if (!mounted) return;
      glowPlanes = result.glowPlanes;

      // ── Perf: strip objects not needed in the cutscene ────────────────────
      // Glow planes — remove from scene entirely (not just hide) → fewer draw calls.
      for (const gp of glowPlanes) {
        if (gp.parent) gp.parent.remove(gp);
        if (gp.geometry) gp.geometry.dispose();
      }
      glowPlanes = [];
      // Hitbox meshes — only used for gameplay raycasting, not needed here.
      const toRemove = [];
      scene.traverse(obj => {
        if (obj.isMesh && obj.userData.isHitBox) toRemove.push(obj);
      });
      for (const obj of toRemove) {
        if (obj.parent) obj.parent.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
      }

      // Pre-compile shaders so the first rendered frame doesn't stutter.
      renderer.compileAsync(scene, camera).then(() => {
        if (!mounted) return;
        renderer.render(scene, camera);   // warm render frame

        // ── ALWAYS show cutscene immediately — never blocked by audio state ──
        // onReady() signals the loading screen to unmount and the cutscene to
        // appear.  This must be unconditional so the loading bar never stalls.
        fadeEl.style.opacity = '0';
        if (onReady) onReady();

        // ── Silent audio unlock (fresh-reload path only) ──────────────────
        // On a hard reload the browser suspends AudioContext until a user gesture.
        // We listen for the first pointer/key event and attempt resume() silently —
        // no visible prompt, no overlay.  If it succeeds before t=3 s the alarm
        // plays normally; if not (e.g. the cutscene ends first), nothing is shown.
        try {
          if (audioCtx && audioCtx.state === 'suspended') {
            audioUnlockHandler = () => {
              try { audioCtx.resume().catch(() => {}); } catch (_) {}
            };
            document.addEventListener('pointerdown', audioUnlockHandler, { once: true, passive: true });
            document.addEventListener('keydown',     audioUnlockHandler, { once: true, passive: true });
          }
        } catch (_) {}
      }).catch(() => {
        if (!mounted) return;
        fadeEl.style.opacity = '0';
        if (onReady) onReady();
      });
    }).catch(err => {
      console.error('[HazardCutscene002] buildWarehouse002 failed:', err);
      fadeEl.style.opacity = '0';
      if (onReady) onReady();
    });



    // ── Helpers ───────────────────────────────────────────────────────────────
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const lerp    = (a, b, t) => a + (b - a) * t;
    const ease    = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out

    let alarmStarted = false;
    let silhouetteApplied = false;

    // ── Render loop ───────────────────────────────────────────────────────────
    let startTime = null;

    const tick = (ts) => {
      animId = requestAnimationFrame(tick);
      if (!startTime) startTime = ts;
      const t = (ts - startTime) * 0.001; // seconds

      if (t >= T_FADE_OUT + 0.2) { finish(); return; }

      // ── PHASE: Calm walk (0 → T_WALK_END) ──────────────────────────────────
      if (t < T_WALK_END) {
        const pct = clamp01(t / T_WALK_END);
        worker.root.position.lerpVectors(WALK_START, WALK_END, ease(pct));
        worker.root.rotation.y = Math.PI; // facing south (toward -z)

        // Gentle walk animation
        const stride = Math.sin(t * 3.0) * 0.22;
        worker.leftLegGrp.rotation.x  =  stride;
        worker.rightLegGrp.rotation.x = -stride;
        worker.leftShin.rotation.x    = Math.max(0, -stride) * 0.4;
        worker.rightShin.rotation.x   = Math.max(0, stride) * 0.4;
        worker.leftArmGrp.rotation.x  = -stride * 0.5;
        worker.rightArmGrp.rotation.x =  stride * 0.5;

        // Camera follows worker from left side
        const camT = clamp01(t / T_WALK_END);
        const camZ = lerp(CAM_WALK.z, CAM_ALARM.z, camT);
        camera.position.set(CAM_WALK.x, CAM_WALK.y, camZ);
        camera.lookAt(worker.root.position.x, 1.2, worker.root.position.z);
      }

      // ── PHASE: Alarm + run (T_ALARM → T_RUN_END) ───────────────────────────
      if (t >= T_ALARM && t < T_RUN_END) {
        if (!alarmStarted) { alarmStarted = true; startAlarm(); }

        const pct = clamp01((t - T_ALARM) / (T_RUN_END - T_ALARM));
        // Turn LEFT (toward east / +x), where the exit is.
        // rotation.y: π (south/−z) → π/2 (east/+x)  — corrects wrong west turn.
        const turnPct = clamp01(pct / 0.15); // first 15% of run phase = turn
        worker.root.rotation.y = lerp(Math.PI, Math.PI * 0.5, ease(turnPct));

        worker.root.position.lerpVectors(WALK_END, RUN_END, ease(pct));

        // Fast run animation
        const stride = Math.sin(t * 8.0) * 0.38;
        worker.leftLegGrp.rotation.x  =  stride;
        worker.rightLegGrp.rotation.x = -stride;
        worker.leftShin.rotation.x    = Math.max(0, -stride) * 0.5;
        worker.rightShin.rotation.x   = Math.max(0, stride) * 0.5;
        worker.leftArmGrp.rotation.x  = -stride * 0.6;
        worker.rightArmGrp.rotation.x =  stride * 0.6;

        // Camera: overhead pull-back showing the diagonal run toward the exit
        const camPct = ease(pct);
        camera.position.set(
          lerp(CAM_ALARM.x, CAM_RUN.x, camPct),
          lerp(CAM_ALARM.y, CAM_RUN.y, camPct),
          lerp(CAM_ALARM.z, CAM_RUN.z, camPct),
        );
        camera.lookAt(worker.root.position.x, 1.2, worker.root.position.z);
      }

      // ── PHASE: Pull handle (T_RUN_END → T_PULL_END) ────────────────────────
      if (t >= T_RUN_END && t < T_PULL_END) {
        const pct = clamp01((t - T_RUN_END) / (T_PULL_END - T_RUN_END));

        // Worker faces the door (east, toward +x)
        worker.root.rotation.y = Math.PI * 0.5;
        worker.root.position.copy(RUN_END);

        // Stop leg animation
        worker.leftLegGrp.rotation.x  = 0;
        worker.rightLegGrp.rotation.x = 0;
        worker.leftShin.rotation.x    = 0;
        worker.rightShin.rotation.x   = 0;

        // Pulling pose: lean torso back, arms reach forward then pull
        const pullCycle = Math.sin(pct * Math.PI * 2.5); // 2.5 pull attempts
        worker.torso.rotation.x       = lerp(0, -0.35, clamp01(pct * 3)) + pullCycle * 0.10;
        worker.leftArmGrp.rotation.x  = -0.60 + pullCycle * 0.25;
        worker.rightArmGrp.rotation.x = -0.60 + pullCycle * 0.25;
        worker.leftArmGrp.rotation.z  =  0.18;
        worker.rightArmGrp.rotation.z = -0.18;
        // Brace feet
        worker.leftLegGrp.rotation.x  = 0.12;
        worker.rightLegGrp.rotation.x = 0.12;

        // Camera sweeps in from south to a close shot showing worker + door
        const camPct = ease(clamp01(pct * 2));
        camera.position.set(
          lerp(CAM_RUN.x, CAM_PULL.x, camPct),
          lerp(CAM_RUN.y, CAM_PULL.y, camPct),
          lerp(CAM_RUN.z, CAM_PULL.z, camPct),
        );
        camera.lookAt(LOOK_PULL.x, LOOK_PULL.y, LOOK_PULL.z);
      }

      // ── PHASE: Step back, pause (T_PULL_END → T_PAUSE_END) ─────────────────
      if (t >= T_PULL_END && t < T_PAUSE_END) {
        const pct = clamp01((t - T_PULL_END) / (T_PAUSE_END - T_PULL_END));
        // Worker steps back from door
        worker.root.position.set(
          lerp(RUN_END.x, RUN_END.x - 0.5, ease(pct)),
          0,
          RUN_END.z,
        );
        // Upright again
        worker.torso.rotation.x       = lerp(-0.35, 0, ease(pct));
        worker.leftArmGrp.rotation.x  = lerp(-0.60, 0, ease(pct));
        worker.rightArmGrp.rotation.x = lerp(-0.60, 0, ease(pct));
        worker.leftArmGrp.rotation.z  = lerp( 0.18, 0, ease(pct));
        worker.rightArmGrp.rotation.z = lerp(-0.18, 0, ease(pct));
        worker.leftLegGrp.rotation.x  = lerp(0.12,  0, ease(pct));
        worker.rightLegGrp.rotation.x = lerp(0.12,  0, ease(pct));

        // Camera holds south-side view, settles slightly
        const camPct = ease(pct);
        camera.position.set(
          lerp(CAM_PULL.x, CAM_PAUSE.x, camPct),
          lerp(CAM_PULL.y, CAM_PAUSE.y, camPct),
          lerp(CAM_PULL.z, CAM_PAUSE.z, camPct),
        );
        camera.lookAt(LOOK_PULL.x, LOOK_PULL.y, LOOK_PULL.z);
      }

      // ── PHASE: Fade out (T_FADE_OUT - 1.0 → T_FADE_OUT) ────────────────────
      if (t >= T_FADE_OUT - 1.0) {
        const fadePct = clamp01((t - (T_FADE_OUT - 1.0)) / 1.0);

        // Step 1: Darken worker to silhouette (0 → 0.5 of fade)
        if (fadePct < 0.5 && !silhouetteApplied) {
          const darkPct = clamp01(fadePct / 0.5);
          worker.root.traverse(c => {
            if (c.isMesh && c.material) {
              const m = c.material;
              const dark = 1 - darkPct * 0.95;
              if (!m._origColor) m._origColor = m.color.clone();
              m.color.set(m._origColor.r * dark, m._origColor.g * dark, m._origColor.b * dark);
            }
          });
          if (darkPct >= 0.99) silhouetteApplied = true;
        }

        // Step 2: Full screen black (0.4 → 1.0 of fade)
        if (fadePct >= 0.4) {
          const blackPct = clamp01((fadePct - 0.4) / 0.6);
          fadeEl.style.opacity = String(blackPct);
        }

        // Fade alarm audio
        if (alarmGain && audioCtx) {
          try {
            const vol = 0.55 * (1 - fadePct);
            alarmGain.gain.setTargetAtTime(Math.max(0, vol), audioCtx.currentTime, 0.08);
          } catch (_) {}
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      // Remove silent audio-unlock listeners if they haven't fired yet
      if (audioUnlockHandler) {
        document.removeEventListener('pointerdown', audioUnlockHandler);
        document.removeEventListener('keydown',     audioUnlockHandler);
      }
      skipBtn.removeEventListener('click', finish);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      if (el.contains(fadeEl))  el.removeChild(fadeEl);
      if (el.contains(skipBtn)) el.removeChild(skipBtn);
      try { if (alarmNode) { alarmNode.stop(); alarmNode.disconnect(); } } catch (_) {}
      try { if (audioCtx)  audioCtx.close(); } catch (_) {}

      // Dispose scene
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m.map)          m.map.dispose();
            if (m.normalMap)    m.normalMap.dispose();
            if (m.roughnessMap) m.roughnessMap.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000" }}
    />
  );
}
