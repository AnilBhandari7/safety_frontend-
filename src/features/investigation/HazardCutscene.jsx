import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildWarehouse } from "./warehouseBuilder";

// ── Low-poly worker — MeshStandardMaterial flatShading, pivot joints ──────────
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

  // Torso (hip pivot, y=0.92 above root/feet)
  const torso = new THREE.Group();
  torso.position.y = 0.92;
  torso.add(mkBox(0.38, 0.50, 0.24, SHIRT));
  torso.add(mkBox(0.38, 0.50, 0.02, VEST, 0, 0, 0.13));
  torso.add(mkBox(0.05, 0.50, 0.24, VEST, -0.165, 0, 0));
  torso.add(mkBox(0.05, 0.50, 0.24, VEST,  0.165, 0, 0));
  torso.add(mkBox(0.38, 0.055, 0.26, 0xf0e040, 0, 0.10, 0));
  root.add(torso);

  // Head (child of torso)
  const head = new THREE.Group();
  head.position.y = 0.46;
  head.add(mkBox(0.30, 0.28, 0.26, SKIN));
  head.add(mkCyl(0.22, 0.22, 0.04, 8, HELMET, 0, 0.17, 0));
  head.add(mkCyl(0.14, 0.21, 0.14, 8, HELMET, 0, 0.27, 0));
  torso.add(head);

  // Arms — shoulder pivots, child of torso
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

  // Legs — hip pivots, child of root
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

  // Carried box (chest, child of torso)
  const carriedBox = mkBox(0.28, 0.22, 0.22, 0x8b6f47, 0, 0.05, 0.30);
  torso.add(carriedBox);

  return {
    root, torso, head,
    leftArmGrp, rightArmGrp, leftForearm, rightForearm,
    leftLegGrp, rightLegGrp, leftShin, rightShin,
    carriedBox,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function HazardCutscene({ onComplete, onReady }) {
  const mountRef = useRef(null);
  const doneRef  = useRef(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let mounted      = true;
    let animId;
    let audioCtx     = null;
    let footstepNode = null;
    let footstepBuf  = null;

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

    // near=0.04 matches gameplay so no geometry clips on close shots
    const camera = new THREE.PerspectiveCamera(62, W / H, 0.04, 80);

    // Walk path constants ─────────────────────────────────────────────────────
    // Worker walks in the left-centre aisle, clearly west of the centre island
    // (which spans x ≈ -3.25 to +3.25 at z ≈ 5.4–6.6).
    // x=-4.5 gives 1.25 m clearance from the island's visual left edge.
    // Start z=3 is already north of the centre island's north face (z≈5.4),
    // so the worker NEVER passes through it.
    // The path veers gently from x=-4.5 to x=-3.6 (puddle x) over 2.5 s.
    const WLK_DUR   = 2.5;
    const WLK_SX    = -4.5;      // start x  (clear of centre island)
    const WLK_EX    = -3.6;      // end   x  (puddle centre x)
    const WLK_SZ    = 3.0;       // start z  (north of centre island — no clip)
    const WLK_EZ    = -6.6;      // end   z  (puddle centre z)
    const SLIP_AT   = WLK_DUR;                      // 2.5 s
    const SLIP_DUR  = 1.5;
    const HOLD_AT   = SLIP_AT + SLIP_DUR;            // 4.0 s
    const HOLD_DUR  = 1.5;
    const FADE_AT   = HOLD_AT + HOLD_DUR;            // 5.5 s
    const DONE_AT   = FADE_AT + 0.7;                 // 6.2 s

    // Quaternions for the full-body fall ──────────────────────────────────────
    // qStand: upright, facing north (rotation.y = π, XYZ Euler order)
    const qStand = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, Math.PI, 0),
    );
    // qFallen: lying flat on back, head toward south (+Z world), feet at root.
    // Euler(+π/2, π, 0) maps local +Y → world +Z (body extends southward at y=0).
    // Verified: M = Rx(π/2)·Ry(π) → col[1] = [0,0,1]ᵀ (world +Z). ✓
    const qFallen = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.PI / 2, Math.PI, 0),
    );

    // ── DOM overlays ──────────────────────────────────────────────────────────
    const fadeEl = document.createElement("div");
    Object.assign(fadeEl.style, {
      position: "absolute", inset: "0",
      background: "#000", opacity: "1",
      pointerEvents: "none", zIndex: "10",
      transition: "opacity 0.55s ease",
    });
    el.appendChild(fadeEl);

    const captionEl = document.createElement("div");
    Object.assign(captionEl.style, {
      position: "absolute", bottom: "18%", left: "50%",
      transform: "translateX(-50%)",
      color: "#f0f0f0", fontSize: "18px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: "600", letterSpacing: "0.12em",
      textTransform: "uppercase",
      textShadow: "0 2px 8px rgba(0,0,0,0.9)",
      opacity: "0", pointerEvents: "none", zIndex: "20",
      transition: "opacity 0.8s ease", whiteSpace: "nowrap",
    });
    captionEl.textContent = "Warehouse Slip Incident";
    el.appendChild(captionEl);

    const skipBtn = document.createElement("button");
    Object.assign(skipBtn.style, {
      position: "absolute", top: "16px", right: "20px", zIndex: "50",
      background: "rgba(0,0,0,0.45)",
      border: "1px solid rgba(255,255,255,0.25)",
      color: "rgba(255,255,255,0.75)", fontSize: "12px",
      fontFamily: "system-ui, sans-serif", letterSpacing: "0.08em",
      padding: "6px 14px", borderRadius: "4px", cursor: "pointer",
    });
    skipBtn.textContent = "Skip";
    el.appendChild(skipBtn);

    // ── complete ──────────────────────────────────────────────────────────────
    function complete() {
      if (doneRef.current) return;
      doneRef.current = true;
      onComplete();
    }
    skipBtn.addEventListener("click", () => {
      fadeEl.style.transition = "opacity 0.3s ease";
      fadeEl.style.opacity    = "1";
      setTimeout(complete, 340);
    });

    // ── Worker ────────────────────────────────────────────────────────────────
    const worker = buildWorker();
    worker.root.position.set(WLK_SX, 0, WLK_SZ);
    worker.root.rotation.y = Math.PI; // face north (−z)
    scene.add(worker.root);

    // ── Thrown box ────────────────────────────────────────────────────────────
    const thrownBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.22, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x8b6f47, flatShading: true }),
    );
    thrownBox.visible    = false;
    thrownBox.castShadow = true;
    scene.add(thrownBox);
    const boxVel     = new THREE.Vector3();
    let   boxBounced = false;
    let   boxSettled = false;

    // ── Camera starting position (INSIDE warehouse, walk-follow angle) ────────
    // Camera offset: right of worker (+X), chest height, behind (+Z)
    const camTgt = new THREE.Vector3(WLK_SX, 1.2, WLK_SZ - 0.5);
    camera.position.set(WLK_SX + 2.5, 1.5, WLK_SZ + 4.5);
    camera.lookAt(camTgt);

    // ── Animation state ───────────────────────────────────────────────────────
    const clock   = new THREE.Clock(false);
    let elapsed   = 0;
    let phase     = "walk";

    let fadeInTriggered = false;
    let footstepStarted = false;
    let slipStarted     = false;
    let captionShown    = false;
    let captionHidden   = false;
    let fadeoutStarted  = false;

    // Slip-start state (captured once)
    let slipQStart      = new THREE.Quaternion();
    let slipLegR        = 0;
    let slipLegL        = 0;
    let slipArmR        = 0;
    let slipArmL        = 0;

    // ── Audio ─────────────────────────────────────────────────────────────────
    async function loadFootstep() {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const res  = await fetch("/assets/sounds/footstep.mp3");
        const data = await res.arrayBuffer();
        footstepBuf = await audioCtx.decodeAudioData(data);
      } catch (e) {
        console.warn("[HazardCutscene] footstep load failed:", e);
      }
    }
    function startFootstep() {
      if (!audioCtx || !footstepBuf || footstepNode) return;
      if (audioCtx.state === "suspended") audioCtx.resume();
      footstepNode = audioCtx.createBufferSource();
      footstepNode.buffer = footstepBuf;
      footstepNode.loop   = true;
      const gain = audioCtx.createGain();
      gain.gain.value = 0.40;
      footstepNode.connect(gain).connect(audioCtx.destination);
      footstepNode.start();
    }
    function stopFootstep() {
      if (!footstepNode) return;
      try { footstepNode.stop(); footstepNode.disconnect(); } catch (_) {}
      footstepNode = null;
    }

    // ── Render loop ───────────────────────────────────────────────────────────
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;

      // Kick fade-in from black on the very first frame
      if (!fadeInTriggered) {
        fadeInTriggered = true;
        fadeEl.style.opacity = "0";
      }

      // ─── WALK  0 – 2.5 s ─────────────────────────────────────────────────
      if (phase === "walk") {
        const wT = Math.min(elapsed / WLK_DUR, 1.0);

        // Gently diagonal path: x lerps from -4.5 to -3.6, z from 3 to -6.6
        worker.root.position.x = WLK_SX + wT * (WLK_EX - WLK_SX);
        worker.root.position.z = WLK_SZ + wT * (WLK_EZ - WLK_SZ);

        // Walk cycle: opposite-phase legs & arms + vertical bob
        const stepFreq = 3.2;
        const swing    = Math.sin(elapsed * stepFreq * Math.PI * 2) * 0.50;
        worker.leftLegGrp.rotation.x   =  swing;
        worker.rightLegGrp.rotation.x  = -swing;
        worker.leftArmGrp.rotation.x   = -swing * 0.38;
        worker.rightArmGrp.rotation.x  =  swing * 0.38;
        worker.root.position.y = Math.abs(Math.sin(elapsed * stepFreq * Math.PI)) * 0.04;
        worker.torso.rotation.x = 0.12; // forward lean while walking

        if (!footstepStarted) { footstepStarted = true; startFootstep(); }

        // Follow camera (behind + right, at chest height)
        const wx = worker.root.position.x;
        const wz = worker.root.position.z;
        camera.position.lerp(new THREE.Vector3(wx + 2.5, 1.5, wz + 4.5), 0.10);
        camTgt.lerp(new THREE.Vector3(wx, 1.2, wz - 0.5), 0.10);
        camera.lookAt(camTgt);

        if (elapsed >= SLIP_AT) {
          phase = "slip";
          // Snap worker to exact puddle position for the slip
          worker.root.position.x = WLK_EX;
          worker.root.position.z = WLK_EZ;
          worker.root.position.y = 0;
        }
      }

      // ─── SLIP  2.5 – 4.0 s ───────────────────────────────────────────────
      if (phase === "slip") {
        const sE = elapsed - SLIP_AT;
        const st = Math.min(sE / SLIP_DUR, 1.0);
        const e  = st * st * (3 - 2 * st); // smoothstep

        // ── Initialise once at slip start ──────────────────────────────────
        if (!slipStarted) {
          slipStarted = true;
          stopFootstep();

          // Capture current limb angles for smooth lerp FROM walk pose
          slipLegR = worker.rightLegGrp.rotation.x;
          slipLegL = worker.leftLegGrp.rotation.x;
          slipArmR = worker.rightArmGrp.rotation.x;
          slipArmL = worker.leftArmGrp.rotation.x;
          slipQStart.copy(worker.root.quaternion);

          // Release carried box from its actual world position (hands/chest area).
          // carriedBox sits at torso-local (0, 0.05, 0.30) = the carrying arms;
          // calling getWorldPosition on it gives the exact held position.
          const releasePos = new THREE.Vector3();
          worker.carriedBox.getWorldPosition(releasePos);
          thrownBox.position.copy(releasePos);
          thrownBox.visible         = true;
          worker.carriedBox.visible = false;
          // Throw forward-left (in front of worker), slightly up
          boxVel.set(-0.8, 3.6, -1.4);
          boxBounced = false;
          boxSettled = false;
        }

        // ── Step a: leading foot slides FORWARD along the floor ────────────
        // Root (foot pivot) stays at puddle but right leg swings forward aggressively.
        // Also slide root itself 0.4 m north over 0.3 s (feels like foot skidding).
        if (sE < 0.30) {
          worker.root.position.z -= dt * 1.5; // skid north (−z world)
        }

        // ── Step b: legs go forward, arms flail upward and outward ─────────
        // Right leg kicks forward (large positive rotation in root-local frame
        // rotated by π means negative world-x rotation, but visually it swings toward
        // the direction of travel = forward).
        worker.rightLegGrp.rotation.x = THREE.MathUtils.lerp(slipLegR, -1.0, e);
        worker.leftLegGrp.rotation.x  = THREE.MathUtils.lerp(slipLegL,  0.25, e);

        // Arms fly UP (large negative rotation.x) and OUT (rotation.z)
        worker.leftArmGrp.rotation.x  = THREE.MathUtils.lerp(slipArmL, -1.5, e);
        worker.rightArmGrp.rotation.x = THREE.MathUtils.lerp(slipArmR, -1.5, e);
        worker.leftArmGrp.rotation.z  = THREE.MathUtils.lerp(0, 0.85, e);
        worker.rightArmGrp.rotation.z = THREE.MathUtils.lerp(0, -0.85, e);
        worker.leftForearm.rotation.x  = THREE.MathUtils.lerp(0, -0.5, e);
        worker.rightForearm.rotation.x = THREE.MathUtils.lerp(0, -0.5, e);

        // ── Step c: whole body rotates BACKWARD onto the floor ────────────
        // Quaternion slerp: standing → lying flat on back (head toward south).
        // This keeps feet at y=0 and arcs the body to horizontal at floor level.
        worker.root.quaternion.slerpQuaternions(slipQStart, qFallen, e);

        // Torso adds a little extra backward articulation (spine curling back)
        worker.torso.rotation.x = THREE.MathUtils.lerp(0.12, -0.3, e);

        // Small settle bounce at impact (e ≈ 0.85–1.0)
        if (e > 0.85) {
          const bounce = Math.sin((e - 0.85) / 0.15 * Math.PI) * 0.025;
          worker.root.position.y = bounce;
        }

        // Continuous per-frame floor clamp — runs every frame of the slip phase.
        // After all rotation/position updates for this frame are applied, compute
        // the world-space bounding box of the entire worker and lift root.position.y
        // so the lowest point is exactly at y=0. This prevents any frame from showing
        // body parts below the floor and means there is nothing to "snap" at the end.
        scene.updateMatrixWorld(true);
        const workerBox = new THREE.Box3().setFromObject(worker.root);
        if (workerBox.min.y < 0) {
          worker.root.position.y += -workerBox.min.y;
        }


        // ── Thrown box physics ─────────────────────────────────────────────
        if (!boxSettled) {
          boxVel.y -= 9.8 * dt;
          thrownBox.position.addScaledVector(boxVel, dt);
          thrownBox.rotation.x += dt * 3.0;
          thrownBox.rotation.z += dt * 2.0;
          if (thrownBox.position.y < 0.11) {
            if (!boxBounced) {
              thrownBox.position.y = 0.11;
              boxVel.y *= -0.28;
              boxVel.x *= 0.55;
              boxVel.z *= 0.55;
              boxBounced = true;
            } else {
              thrownBox.position.y = 0.11;
              boxVel.set(0, 0, 0);
              boxSettled = true;
            }
          }
        }

        // ── Camera: shake at impact then push-in to fallen worker ─────────
        if (sE < 0.30 && sE > 0.0) {
          const mag = 0.065 * (1 - sE / 0.30);
          camera.position.x += (Math.random() - 0.5) * mag;
          camera.position.y += (Math.random() - 0.5) * mag * 0.4;
        }
        // Push-in: tight low angle looking along the floor
        const wx2 = worker.root.position.x;
        const wz2 = worker.root.position.z;
        camera.position.lerp(new THREE.Vector3(wx2 + 1.5, 1.3, wz2 + 3.5), 0.04);
        camTgt.lerp(new THREE.Vector3(wx2 - 0.5, 0.3, wz2 - 1.0), 0.04);
        camera.lookAt(camTgt);

        if (elapsed >= HOLD_AT) phase = "hold";
      }

      // ─── HOLD  4.0 – 5.5 s ───────────────────────────────────────────────
      if (phase === "hold") {
        // Show caption
        if (!captionShown) {
          captionShown = true;
          captionEl.style.opacity = "1";
        }

        // Slow pan: pull back and drift toward the leaking barrel + puddle
        camera.position.lerp(new THREE.Vector3(-1.8, 2.0, -2.0), 0.014);
        camTgt.lerp(new THREE.Vector3(-4.1, 0.2, -7.6), 0.014);
        camera.lookAt(camTgt);

        if (elapsed >= FADE_AT && !captionHidden) {
          captionHidden = true;
          captionEl.style.transition = "opacity 0.6s ease";
          captionEl.style.opacity    = "0";
        }
        if (elapsed >= FADE_AT) phase = "fadeout";
      }

      // ─── FADEOUT  5.5 – 6.2 s ────────────────────────────────────────────
      if (phase === "fadeout") {
        if (!fadeoutStarted) {
          fadeoutStarted = true;
          fadeEl.style.transition = "opacity 0.7s ease";
          fadeEl.style.opacity    = "1";
        }
        if (elapsed >= DONE_AT) complete();
      }

      renderer.render(scene, camera);
    };

    // ── Load warehouse + audio, then compile shaders, then start ─────────────
    // buildWarehouse uses _gltfCache — GLTFs are already decoded; this call
    // clones geometry/materials and populates the scene in ~1 tick.
    // After that, renderer.compileAsync forces GPU shader compilation to happen
    // NOW (while the loading screen in InvestigationScreen is still visible),
    // rather than on the first animation frame (which is what causes the blank gap).
    // One warm render() follows to confirm everything is on the GPU, then onReady()
    // signals InvestigationScreen to unmount the loading screen — at which point
    // the very next frame the user sees is the already-rendered cutscene.
    const manager = new THREE.LoadingManager();
    Promise.all([
      buildWarehouse(scene, manager),
      loadFootstep(),
    ]).then(async ([result]) => {
      if (!mounted) return;
      for (const p of result.glowPlanes) p.visible = false;

      // ── Shader compilation (keeps loading screen up for the full GPU cost) ──
      try {
        if (typeof renderer.compileAsync === 'function') {
          await renderer.compileAsync(scene, camera);
        } else {
          renderer.compile(scene, camera);   // synchronous fallback (Three < r155)
        }
      } catch (e) {
        console.warn('[HazardCutscene] compileAsync failed, using sync compile:', e);
        try { renderer.compile(scene, camera); } catch (_) {}
      }

      if (!mounted) return;

      // Warm the pipeline: one silent render so the GPU is fully ready.
      // fadeEl is still opacity:1 (black) so nothing is visible yet.
      renderer.render(scene, camera);

      // Signal InvestigationScreen: shaders compiled, first frame ready.
      // This unmounts the loading overlay — the NEXT thing the user sees is
      // the cutscene's fade-in from black (no blank gap possible).
      if (onReady) onReady();

      clock.start();
      animate();
    }).catch((err) => {
      console.error("[HazardCutscene] setup failed:", err);
      if (!mounted) return;
      complete();
    });

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      stopFootstep();
      if (audioCtx) { try { audioCtx.close(); } catch (_) {} }
      window.removeEventListener("resize", onResize);
      if (el.contains(fadeEl))              el.removeChild(fadeEl);
      if (el.contains(captionEl))           el.removeChild(captionEl);
      if (el.contains(skipBtn))             el.removeChild(skipBtn);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        width: "100vw", height: "100vh", overflow: "hidden",
      }}
    />
  );
}
