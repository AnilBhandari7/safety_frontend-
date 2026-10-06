import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildWarehouse, buildWarehouse002, collidesAt } from "./warehouseBuilder";

/*
  WarehouseScene — first-person 3D warehouse (GLB model version).

  Props
  -----
  onHotspotClick(id)  called when a hotspot is clicked
  onReady()           called once all models + sounds are loaded
  phase               current game phase from InvestigationScreen
  feedback            current feedback object from useGameSession (for sound triggers)

  Phase gating
  ------------
  "briefing"          scene visible; controls, pointer-lock, hover ALL disabled
  "exploring"         full gameplay: WASD, pointer-lock, hover, footsteps
  "clue-complete"     pointer-lock already released by InvestigationScreen; no footsteps
  "why-chain"         scene stays mounted; controls disabled
  "finished"          scene stays mounted briefly before navigate()

  Loading
  -------
  A DOM overlay progress bar is shown inside the mount div while models + sounds load.
  The BriefingOverlay in InvestigationScreen is gated on onReady() firing.
*/

export default function WarehouseScene({ onHotspotClick, onReady, phase, feedback, caseId = "case001" }) {
  const mountRef      = useRef(null);
  const onClickRef    = useRef(onHotspotClick);
  const onReadyRef    = useRef(onReady);
  const phaseRef      = useRef(phase);
  const feedbackRef   = useRef(feedback);

  // Keep refs current without restarting the effect
  useEffect(() => { onClickRef.current  = onHotspotClick; }, [onHotspotClick]);
  useEffect(() => { onReadyRef.current  = onReady;        }, [onReady]);
  useEffect(() => { phaseRef.current    = phase;          }, [phase]);

  // Play click sounds when feedback changes
  const playSoundRef = useRef(null); // set inside main effect; called from this effect
  useEffect(() => {
    if (!feedback || !playSoundRef.current) return;
    if (feedback.alreadyFound) return; // no sound for repeat clicks
    playSoundRef.current(feedback.isDecoy ? 'decoy' : 'clue');
  }, [feedback]);

  // ── Main effect (runs once — Three.js owns this DOM node) ─────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let mounted = true;
    let animId;

    // ── Renderer ────────────────────────────────────────────────────────────
    const W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled   = false;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.07;  // toned-down: bright but not washed out
    el.style.position = 'relative';
    el.appendChild(renderer.domElement);

    // ── Scene + camera ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdfe6ee);

    // near = 0.04: prevents near-plane clipping of floor-level geometry (puddle)
    // when the player walks directly onto it. Far = 60 covers full hall length.
    const camera = new THREE.PerspectiveCamera(72, W / H, 0.04, 60);
    camera.position.set(0, 1.7, 20);

    // ── Loading overlay ───────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,15,19,0.97)',
      zIndex: '100',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#f0f0f0',
      pointerEvents: 'none',
    });
    overlay.innerHTML = `
      <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;
                  color:#f5c518;text-transform:uppercase;margin-bottom:18px">
        Loading Investigation
      </div>
      <div style="width:220px;height:3px;background:rgba(255,255,255,0.08);
                  border-radius:2px;overflow:hidden">
        <div id="wb-bar"
             style="height:100%;width:0%;background:#f5c518;
                    border-radius:2px;transition:width 0.12s ease"></div>
      </div>
      <div id="wb-err"
           style="display:none;margin-top:28px;font-size:13px;
                  color:#ef4444;max-width:320px;text-align:center;
                  line-height:1.5"></div>
    `;
    el.appendChild(overlay);
    const progressBar = overlay.querySelector('#wb-bar');
    const errMsg      = overlay.querySelector('#wb-err');

    // ── LoadingManager — tracks ALL items (models + sounds registered manually) ─
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      if (progressBar) progressBar.style.width = `${(loaded / total) * 100}%`;
    };
    manager.onLoad = () => {
      if (!mounted) return;
      if (progressBar) progressBar.style.width = '100%';
      if (el.contains(overlay)) el.removeChild(overlay);
      if (onReadyRef.current) onReadyRef.current();
    };
    manager.onError = (url) => {
      console.error('[WarehouseScene] Asset load error:', url);
    };

    // ── Audio (Web Audio API) ─────────────────────────────────────────────────
    let audioCtx = null;
    const snd = {
      footstepBuf: null, clueBuf: null, decoyBuf: null,
      footstepNode: null, isMoving: false,
    };

    // Register sound items with the manager BEFORE starting model loading,
    // so the total count includes them and onLoad fires only when all are done.
    const soundUrls = [
      '/assets/sounds/footstep.mp3',
      '/assets/sounds/clue-found.mp3',
      '/assets/sounds/decoy-wrong.mp3',
    ];
    for (const u of soundUrls) manager.itemStart(u);

    async function loadAudioBuf(url) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const res  = await fetch(url);
        const data = await res.arrayBuffer();
        const buf  = await audioCtx.decodeAudioData(data);
        manager.itemEnd(url);
        return buf;
      } catch (err) {
        console.error('[WarehouseScene] Audio load failed:', url, err);
        manager.itemError(url);
        return null;
      }
    }

    function playOneShot(buf, vol = 0.7) {
      if (!audioCtx || !buf) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const src  = audioCtx.createBufferSource();
      src.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.value = vol;
      src.connect(gain).connect(audioCtx.destination);
      src.start();
    }

    function startFootstep() {
      if (!audioCtx || !snd.footstepBuf || snd.footstepNode) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      snd.footstepNode = audioCtx.createBufferSource();
      snd.footstepNode.buffer = snd.footstepBuf;
      snd.footstepNode.loop   = true;
      const gain = audioCtx.createGain();
      gain.gain.value = 0.4;
      snd.footstepNode.connect(gain).connect(audioCtx.destination);
      snd.footstepNode.start();
    }

    function stopFootstep() {
      if (!snd.footstepNode) return;
      try { snd.footstepNode.stop(); snd.footstepNode.disconnect(); } catch (_) {}
      snd.footstepNode = null;
    }

    // Expose playOneShot for the feedback useEffect above
    playSoundRef.current = (type) => {
      if (type === 'clue')  playOneShot(snd.clueBuf,  0.7);
      if (type === 'decoy') playOneShot(snd.decoyBuf, 0.6);
    };

    // Start sound loading concurrently with model loading
    loadAudioBuf('/assets/sounds/footstep.mp3').then(b  => { snd.footstepBuf = b; });
    loadAudioBuf('/assets/sounds/clue-found.mp3').then(b => { snd.clueBuf    = b; });
    loadAudioBuf('/assets/sounds/decoy-wrong.mp3').then(b => { snd.decoyBuf  = b; });

    // ── Async scene build ─────────────────────────────────────────────────────
    // state.glowPlanes: THREE.Mesh[] — billboard planes returned by buildWarehouse,
    // pulsed every frame in the render loop (opacity only, independent of interaction).
    const state = { interactiveMeshes: [], colliders: [], glowPlanes: [], isBuilt: false };

    // Select the builder function based on the active case
    const builder = caseId === "case002" ? buildWarehouse002 : buildWarehouse;

    builder(scene, manager).then(result => {
      if (!mounted) return;
      state.interactiveMeshes = result.interactiveMeshes;
      state.colliders         = result.colliders;
      state.glowPlanes        = result.glowPlanes;
      state.isBuilt           = true;
      camera.position.copy(result.spawnPoint);

      if (result.failedModels.length > 0 && errMsg) {
        errMsg.textContent = `Note: some models failed to load — ${result.failedModels.join(', ')}`;
        errMsg.style.display = 'block';
      }
    }).catch(err => {
      if (!mounted) return;
      console.error('[WarehouseScene] builder failed:', err);
      if (errMsg) {
        errMsg.textContent = 'Failed to load the investigation scene. Please reload.';
        errMsg.style.display = 'block';
      }
    });

    // Dual-stroke crosshair: dark outline behind white foreground — visible on
    // both the light concrete floor and any darker props in the scene.
    const SVG_CROSS = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <line x1="12" y1="2"  x2="12" y2="22" stroke="rgba(0,0,0,0.70)" stroke-width="3.6" stroke-linecap="round"/>
      <line x1="2"  y1="12" x2="22" y2="12" stroke="rgba(0,0,0,0.70)" stroke-width="3.6" stroke-linecap="round"/>
      <line x1="12" y1="2"  x2="12" y2="22" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="2"  y1="12" x2="22" y2="12" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

    // Hand cursor: dark shadow layer + white layer on top
    const SVG_HAND = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <rect x="6.5" y="10.5" width="13" height="12" rx="2.5" fill="rgba(0,0,0,0.55)"/>
      <rect x="6.5" y="3.5"  width="3.5" height="10" rx="1.7" fill="rgba(0,0,0,0.55)"/>
      <rect x="10"  y="1.5"  width="3.5" height="12" rx="1.7" fill="rgba(0,0,0,0.55)"/>
      <rect x="13.5" y="1.5" width="3.5" height="12" rx="1.7" fill="rgba(0,0,0,0.55)"/>
      <rect x="17"  y="3.5"  width="3.5" height="10" rx="1.7" fill="rgba(0,0,0,0.55)"/>
      <rect x="7" y="11" width="12" height="11" rx="2" fill="white"/>
      <rect x="7"   y="4"  width="2.5" height="9"  rx="1.2" fill="white"/>
      <rect x="10.5" y="2" width="2.5" height="11" rx="1.2" fill="white"/>
      <rect x="14"  y="2"  width="2.5" height="11" rx="1.2" fill="white"/>
      <rect x="17.5" y="4" width="2.5" height="9"  rx="1.2" fill="white"/>
      <rect x="3" y="12" width="5" height="2.5" rx="1.2" fill="white" transform="rotate(-15 3 12)"/>
    </svg>`;

    const crosshairEl = document.createElement('div');
    Object.assign(crosshairEl.style, {
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)',
      pointerEvents: 'none', userSelect: 'none',
      // Dual drop-shadow: crisp dark halo so the cursor is visible on any surface colour
      filter: 'drop-shadow(0 0 1px rgba(0,0,0,1)) drop-shadow(0 0 3px rgba(0,0,0,0.7))',
      zIndex: '20', lineHeight: '0', display: 'none',
    });
    crosshairEl.innerHTML = SVG_CROSS;
    el.appendChild(crosshairEl);

    const labelEl = document.createElement('div');
    Object.assign(labelEl.style, {
      position: 'absolute', top: 'calc(50% + 20px)', left: '50%',
      transform: 'translateX(-50%)',
      color: '#f0f0f0', fontSize: '13px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '600', letterSpacing: '0.04em',
      pointerEvents: 'none', userSelect: 'none',
      textShadow: '0 1px 3px rgba(0,0,0,1)',
      background: 'rgba(0,0,0,0.65)', padding: '3px 10px',
      borderRadius: '4px', display: 'none', zIndex: '20',
    });
    el.appendChild(labelEl);

    // Neutral hover labels — no hint whether an object is a clue or decoy
    const LABELS = {
      // Case 001
      'wet-patch':          'Oil puddle',
      'cracked-container':  'Leaking drum',
      'hazard-log':         'Incident log',
      'fire-extinguisher':  'Fire extinguisher',
      'overhanging-boxes':  'Stacked boxes',
      'safety-gloves':      'Worker figure',
      'wet-floor-sign':     'Wet floor sign',

      // Case 002
      'blocked-exit-door':  'Blocked fire exit',
      'hidden-extinguisher':'Fire extinguisher',
      'inspection-log':     'Inspection log',
      'ppe-figure':         'Worker figure',
      'loose-box':          'Misplaced box',
      'parked-forklift':    'Forklift',
    };

    // ── Pointer-lock controls ─────────────────────────────────────────────────
    const keys    = {};
    const euler   = new THREE.Euler(0, 0, 0, 'YXZ');
    let isLocked  = false;
    const raycaster = new THREE.Raycaster();
    const CENTER    = new THREE.Vector2(0, 0);

    // ── Hover tracking (halo-based — no material cloning) ────────────────────
    let hoveredId = null;

    function findHotspotId(mesh) {
      let obj = mesh;
      while (obj) {
        if (obj.userData?.hotspotId) return obj.userData.hotspotId;
        obj = obj.parent;
      }
      return null;
    }

    // ── Event handlers ────────────────────────────────────────────────────────
    const onKeyDown = e => { keys[e.code] = true; };
    const onKeyUp   = e => { keys[e.code] = false; };

    const onMouseMove = e => {
      if (!isLocked) return;
      const sens = 0.002;
      euler.y -= e.movementX * sens;
      euler.x -= e.movementY * sens;
      euler.x  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));
      camera.quaternion.setFromEuler(euler);
    };

    const onLockChange = () => {
      isLocked = document.pointerLockElement === renderer.domElement;
      if (!isLocked) {
        crosshairEl.innerHTML = SVG_CROSS;
        labelEl.style.display = 'none';
        hoveredId = null;
        stopFootstep();
        snd.isMoving = false;
      }
    };

    const onCanvasClick = () => {
      const ph = phaseRef.current;
      if (!isLocked) {
        if (ph === 'exploring') {
          if (audioCtx?.state === 'suspended') audioCtx.resume();
          renderer.domElement.requestPointerLock();
        }
        return;
      }
      raycaster.setFromCamera(CENTER, camera);
      const hits = raycaster.intersectObjects(state.interactiveMeshes, false);
      if (hits.length > 0 && hits[0].distance < 7) {
        const hitId = hits[0].object.userData.hotspotId;
        if (hitId) onClickRef.current(hitId);
      }
    };

    renderer.domElement.addEventListener('click',         onCanvasClick);
    document.addEventListener('pointerlockchange',        onLockChange);
    document.addEventListener('mousemove',                onMouseMove);
    document.addEventListener('keydown',                  onKeyDown);
    document.addEventListener('keyup',                    onKeyUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ────────────────────────────────────────────────────────
    const SPEED   = 5;
    const moveDir = new THREE.Vector3();
    const clock   = new THREE.Clock();
    let elapsed   = 0;


    const animate = () => {
      animId  = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      elapsed += dt;

      const ph        = phaseRef.current;
      const exploring = ph === 'exploring';
      const canMove   = isLocked && state.isBuilt && exploring;

      crosshairEl.style.display = canMove ? 'block' : 'none';

      if (!exploring && snd.isMoving) { stopFootstep(); snd.isMoving = false; }

      if (canMove) {
        // ── WASD movement ─────────────────────────────────────────────────
        const fwd  = (keys['KeyW'] || keys['ArrowUp'])    ? 1 : 0;
        const back = (keys['KeyS'] || keys['ArrowDown'])  ? 1 : 0;
        const left = (keys['KeyA'] || keys['ArrowLeft'])  ? 1 : 0;
        const rgt  = (keys['KeyD'] || keys['ArrowRight']) ? 1 : 0;
        const moving = !!(fwd || back || left || rgt);

        if (moving) {
          moveDir.set(rgt - left, 0, back - fwd).normalize().multiplyScalar(SPEED * dt);
          moveDir.applyEuler(new THREE.Euler(0, euler.y, 0, 'YXZ'));
          const nx = camera.position.x + moveDir.x;
          const nz = camera.position.z + moveDir.z;
          if (!collidesAt(state.colliders, nx, camera.position.z)) camera.position.x = nx;
          if (!collidesAt(state.colliders, camera.position.x, nz)) camera.position.z = nz;
        }
        camera.position.y = 1.7;

        if ( moving && !snd.isMoving) { startFootstep(); snd.isMoving = true;  }
        if (!moving &&  snd.isMoving) { stopFootstep();  snd.isMoving = false; }

        // ── Per-frame hover raycast ────────────────────────────────────────
        raycaster.setFromCamera(CENTER, camera);
        const hits  = raycaster.intersectObjects(state.interactiveMeshes, false);
        const newId = (hits.length > 0 && hits[0].distance < 7)
          ? findHotspotId(hits[0].object) : null;

        if (newId !== hoveredId) {
          hoveredId = newId;
          if (newId) {
            crosshairEl.innerHTML = SVG_HAND;
            labelEl.textContent   = LABELS[newId] ?? newId;
            labelEl.style.display = 'block';
          } else {
            crosshairEl.innerHTML = SVG_CROSS;
            labelEl.style.display = 'none';
          }
        }
      } else if (hoveredId) {
        hoveredId = null;
        labelEl.style.display = 'none';
        crosshairEl.innerHTML = SVG_CROSS;
      }

      // ── 3-D glow box shells — always-on opacity pulse, fixed world orientation ─
      // Opacity: sine wave with exact 5-second full cycle.
      //   max = 0.45 (sin = +1), min = 0.12 (sin = -1)
      // The boxes are placed in world space and do NOT rotate — no quaternion update.
      const glowOp = 0.12 + 0.33 * (0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2 / 5));
      for (const p of state.glowPlanes) {
        p.material.opacity = glowOp;
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      stopFootstep();
      playSoundRef.current = null;
      if (audioCtx) { try { audioCtx.close(); } catch (_) {} }
      document.exitPointerLock();
      // Dispose glow plane materials (geometries are small and GC'd)
      for (const p of state.glowPlanes) p.material.dispose();
      renderer.domElement.removeEventListener('click',         onCanvasClick);
      document.removeEventListener('pointerlockchange',        onLockChange);
      document.removeEventListener('mousemove',                onMouseMove);
      document.removeEventListener('keydown',                  onKeyDown);
      document.removeEventListener('keyup',                    onKeyUp);
      window.removeEventListener('resize',                     onResize);
      if (el.contains(crosshairEl)) el.removeChild(crosshairEl);
      if (el.contains(labelEl))     el.removeChild(labelEl);
      if (el.contains(overlay))     el.removeChild(overlay);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100vh', cursor: 'none', background: '#dfe6ee' }}
    />
  );
}
