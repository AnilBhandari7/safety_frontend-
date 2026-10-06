import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Module-level GLB cache ───────────────────────────────────────────────────
const _gltfCache = {};

// ─── Collision constants ──────────────────────────────────────────────────────
export const PLAYER_RADIUS = 0.45;

export function addCollider(colliders, obj, padX = 0.12, padZ = 0.12) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  box.min.x -= padX + PLAYER_RADIUS;
  box.max.x += padX + PLAYER_RADIUS;
  box.min.z -= padZ + PLAYER_RADIUS;
  box.max.z += padZ + PLAYER_RADIUS;
  colliders.push(box);
}

function addBoxCollider(colliders, cx, cz, halfW, halfD) {
  colliders.push(new THREE.Box3(
    new THREE.Vector3(cx - halfW - PLAYER_RADIUS, -1, cz - halfD - PLAYER_RADIUS),
    new THREE.Vector3(cx + halfW + PLAYER_RADIUS,  6, cz + halfD + PLAYER_RADIUS),
  ));
}

export function collidesAt(colliders, x, z) {
  for (const b of colliders) {
    if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z) return true;
  }
  return false;
}

// ─── loadModel ────────────────────────────────────────────────────────────────
export async function loadModel(url, spec, loadingManager) {
  if (_gltfCache[url]) return _gltfCache[url].clone();

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader(loadingManager);
    loader.load(url, (gltf) => {
      const root = gltf.scene;
      if (spec.preRotateY) root.rotation.y = spec.preRotateY;
      root.updateMatrixWorld(true);

      const rawBox  = new THREE.Box3().setFromObject(root);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);

      const axis   = spec.axis ?? 'y';
      const rawDim = rawSize[axis];
      const scale  = rawDim > 0.0001 ? spec.target / rawDim : 1;
      root.scale.multiplyScalar(scale);
      root.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(root);
      const centre    = new THREE.Vector3();
      scaledBox.getCenter(centre);
      root.position.x -= centre.x;
      root.position.z -= centre.z;
      root.position.y -= scaledBox.min.y;

      root.traverse(child => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });

      const group = new THREE.Group();
      group.add(root);
      _gltfCache[url] = group;

      if (import.meta.env.DEV) {
        group.updateMatrixWorld(true);
        const fb = new THREE.Box3().setFromObject(group);
        const fs = new THREE.Vector3();
        fb.getSize(fs);
        console.log(`[loadModel] ${url.split('/').pop().replace('.glb','')}: ${fs.x.toFixed(3)}x${fs.y.toFixed(3)}x${fs.z.toFixed(3)} m`);
      }

      resolve(group.clone());
    }, undefined, (err) => {
      console.error(`[warehouseBuilder] Failed: ${url}`, err);
      reject(new Error(`${url.split('/').pop()}: ${err.message ?? 'load failed'}`));
    });
  });
}

// ─── Invisible hit-box (raycast target for thin/small objects) ────────────────
function makeHitBox(w, h, d) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  mesh.userData.isHitBox = true;
  return mesh;
}

// ─── Log-board canvas texture ─────────────────────────────────────────────────
function makeLogTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0ebe0';
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = '#2a2520';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.fillText('INCIDENT REPORT LOG', 18, 44);
  ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 54); ctx.lineTo(494, 54); ctx.stroke();
  ctx.fillStyle = '#4a3a28';
  ctx.font = '21px "Courier New", monospace';
  ctx.fillText('No entries recorded', 18, 86);
  ctx.fillStyle = '#888070';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('Date', 18, 114); ctx.fillText('Reported by', 118, 114); ctx.fillText('Description', 280, 114);
  ctx.strokeStyle = '#c8bca0'; ctx.lineWidth = 1;
  for (let y = 124; y < 370; y += 30) {
    ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(494, y); ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

// ─── Dark slab floor texture ──────────────────────────────────────────────────
function makeSlabFloorTexture() {
  const S = 512, SLABS = 4;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  const cellW = S / SLABS, cellH = S / SLABS;
  for (let row = 0; row < SLABS; row++) {
    for (let col = 0; col < SLABS; col++) {
      const seed = row * 7 + col * 13;
      const tone = 88 + ((seed * 37) % 14);
      ctx.fillStyle = `rgb(${tone},${tone - 2},${tone - 4})`;
      ctx.fillRect(col * cellW + 1, row * cellH + 1, cellW - 2, cellH - 2);
    }
  }
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const a = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${(a*0.4).toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = 'rgba(50,48,46,0.80)';
  for (let i = 1; i < SLABS; i++) {
    ctx.fillRect(i * cellW - 1, 0, 2, S);
    ctx.fillRect(0, i * cellH - 1, S, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 11);
  return tex;
}

// ─── 3-D glow shell (one BoxGeometry per hotspot) ────────────────────────────
// Creates a translucent box that wraps the object's bounding volume.
// The box is placed in world space and does NOT move or rotate with the camera.
// Opacity is animated in the render loop via glowPlanes[].material.opacity.
// Clicks pass straight through (raycast disabled).
//
// Wall-mounted objects: the shell is shrunk on the wall-axis so its back face
// sits flush with the wall surface, not behind it.
//
// Puddle: given a thin but non-zero y thickness so it reads as a 3-D volume.
function attachGlowBox(group, scene, opts = {}) {
  group.updateMatrixWorld(true);

  // Build a tight bounding box from VISIBLE geometry only.
  // Hitboxes (isHitBox=true) are large invisible click-targets that inflate the
  // shell far beyond the actual object.  skipGlowBB lets callers exclude
  // individual meshes (e.g. a sign added to the door group) from the shell.
  const bb = new THREE.Box3();
  group.traverse(child => {
    if (!child.isMesh) return;
    if (child.userData.isHitBox)   return;   // invisible click target — skip
    if (child.userData.skipGlowBB) return;   // explicitly excluded — skip
    bb.union(new THREE.Box3().setFromObject(child));
  });
  if (bb.isEmpty()) bb.setFromObject(group); // fallback: nothing visible found

  const sz  = new THREE.Vector3();
  bb.getSize(sz);
  const ctr = new THREE.Vector3();
  bb.getCenter(ctr);

  // Default: expand bounding box 1.12x in every axis
  const M    = opts.margin ?? 1.12;
  let gW = sz.x * M;
  let gH = sz.y * M;
  let gD = sz.z * M;

  // Puddle is nearly flat: enforce a minimum y thickness of 0.04 m so it's
  // clearly 3-D, and keep its centre at floor level.
  if (opts.flatFloor) {
    gH = Math.max(gH, 0.04);
  }

  // Wall-mounted objects: clamp the wall-axis depth so the back face sits
  // flush with the wall (not inside the wall mesh).
  // wallAxis: 'x' or 'z'; wallLimit: the world coordinate of the wall surface.
  // shellCentre on that axis is adjusted so back face == wallLimit.
  if (opts.wallAxis === 'x') {
    const sign = opts.wallDir ?? -1; // -1 = left wall (wall at x = -wallLimit)
    if (sign < 0) {
      // Back face must not go beyond x = opts.wallLimit (negative side)
      const backFace = ctr.x - gW / 2;
      if (backFace < opts.wallLimit) {
        const excess = opts.wallLimit - backFace;
        gW   -= excess;
        ctr.x += excess / 2;
      }
    } else {
      const backFace = ctr.x + gW / 2;
      if (backFace > opts.wallLimit) {
        const excess = backFace - opts.wallLimit;
        gW   -= excess;
        ctr.x -= excess / 2;
      }
    }
  }

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(gW, gH, gD),
    new THREE.MeshBasicMaterial({
      color:       0xd9b84a,
      transparent: true,
      opacity:     opts.glowIntensity ?? 0.45,   // per-hotspot intensity override
      depthWrite:  false,
      depthTest:   true,
      side:        THREE.DoubleSide,
    }),
  );
  box.position.copy(ctr);
  box.userData.isGlowBox = true;
  box.raycast = () => {};   // clicks pass through
  scene.add(box);
  return box;
}

// ─── buildWarehouse ───────────────────────────────────────────────────────────
// Returns { interactiveMeshes, glowPlanes, colliders, spawnPoint, failedModels }
// glowPlanes: THREE.Mesh[] — glow box shells, one per hotspot
export async function buildWarehouse(scene, loadingManager) {
  const interactiveMeshes = [];
  const glowPlanes        = [];
  const colliders         = [];
  const failedModels      = [];

  const SPECS = {
    shell:      { url: '/assets/models/warehouse/warehouse-shell.glb', axis: 'x', target: 16   },
    shelving:   { url: '/assets/models/warehouse/shelving.glb',        axis: 'x', target: 5.7  },
    box:        { url: '/assets/models/warehouse/cardboard_box.glb',   axis: 'x', target: 1.2  },
    pallet:     { url: '/assets/models/warehouse/pallet.glb',          axis: 'x', target: 1.2  },
    forklift:   { url: '/assets/models/warehouse/forklift.glb',        axis: 'y', target: 2.2  },
    cont20:     { url: '/assets/models/warehouse/container-20ft.glb',  axis: 'z', target: 6.1  },
    contSmall:  { url: '/assets/models/warehouse/container-small.glb', axis: 'x', target: 6.1  },
    bCluster:   { url: '/assets/models/case001/barrel-cluster.glb',    axis: 'y', target: 0.9  },
    bLeak:      { url: '/assets/models/case001/barrel-leaking.glb',    axis: 'y', target: 0.9  },
    puddle:     { url: '/assets/models/case001/puddle.glb',            axis: 'x', target: 1.4  },
    noteBoard:  { url: '/assets/models/case001/note-board.glb',        axis: 'x', target: 1.2  },
    extinguish: { url: '/assets/models/case001/fire-extinguisher.glb', axis: 'y', target: 0.7  },
    mannequin:  { url: '/assets/models/case001/ppe-mannequin.glb',     axis: 'y', target: 1.75 },
    wfSign:     { url: '/assets/models/case001/wet-floor-sign.glb',    axis: 'y', target: 1.3  },
  };

  const results = await Promise.allSettled(
    Object.entries(SPECS).map(([key, spec]) =>
      loadModel(spec.url, spec, loadingManager).then(g => ({ key, g })),
    ),
  );

  const M = {};
  for (const r of results) {
    if (r.status === 'fulfilled') M[r.value.key] = r.value.g;
    else {
      console.error('[warehouseBuilder] Load failed:', r.reason?.message);
      failedModels.push(r.reason?.message ?? 'unknown model');
    }
  }

  function groupHeight(g) {
    const b = new THREE.Box3().setFromObject(g);
    return b.max.y - b.min.y;
  }

  // sceneAdd: scene.add + auto-collider from real bounding box.
  function sceneAdd(obj, skipCollider = false, padX = 0.12, padZ = 0.12) {
    scene.add(obj);
    obj.updateMatrixWorld(true);
    if (!skipCollider) addCollider(colliders, obj, padX, padZ);
  }

  // placeInteractive: position + rotate, sceneAdd, register meshes, attach glow box.
  // glowOpts is forwarded to attachGlowBox for per-object shape tweaks.
  function placeInteractive(group, id, x, y, z, ry = 0, skipCollider = false, glowOpts = {}) {
    group.userData.hotspotId = id;
    group.position.set(x, y, z);
    group.rotation.y = ry;
    sceneAdd(group, skipCollider);
    group.traverse(child => {
      if (child.isMesh) child.userData.hotspotId = id;
      if (child.isMesh && !child.userData.isHitBox) interactiveMeshes.push(child);
    });
    glowPlanes.push(attachGlowBox(group, scene, glowOpts));
  }

  // ── Warehouse shell ────────────────────────────────────────────────────────
  if (M.shell) {
    M.shell.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = true; } });
    scene.add(M.shell);
    M.shell.updateMatrixWorld(true);

    const slabTex  = makeSlabFloorTexture();
    let   floorFound = false;
    M.shell.traverse(child => {
      if (!child.isMesh) return;
      child.updateMatrixWorld(true);
      const bb   = new THREE.Box3().setFromObject(child);
      const size = new THREE.Vector3();
      bb.getSize(size);
      const isFloor = size.y < 0.25 && bb.min.y < 0.3 && size.x * size.z > 30;

      if (isFloor) {
        floorFound = true;
        child.renderOrder = 0;
        child.material = new THREE.MeshStandardMaterial({
          map: slabTex, color: 0xb0adaa,
          roughness: 0.88, metalness: 0, envMapIntensity: 0,
        });
      } else {
        if (child.material) {
          child.material = child.material.clone();
          if (child.material.color) {
            const col = child.material.color;
            const L   = 0.78;
            col.setRGB(col.r + (L - col.r) * 0.42, col.g + (L - col.g) * 0.42, col.b + (L - col.b) * 0.42);
          }
          if (child.material.metalness     !== undefined) child.material.metalness     = Math.min(child.material.metalness, 0.10);
          if (child.material.envMapIntensity !== undefined) child.material.envMapIntensity = 0.05;
        }
      }
    });
    if (import.meta.env.DEV && !floorFound) {
      console.warn('[warehouseBuilder] Floor mesh not auto-detected in shell.');
    }
  }

  // Boundary colliders
  addBoxCollider(colliders,  0, -24, 10, 1);
  addBoxCollider(colliders,  0,  24, 10, 1);
  addBoxCollider(colliders, -9,   0,  1, 25);
  addBoxCollider(colliders,  9,   0,  1, 25);

  // ── Lights ────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ccd2, 1.0));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(2, 10, 14);
  dirLight.castShadow = false;
  scene.add(dirLight);

  for (const z of [18, 7, -5, -17]) {
    const pl = new THREE.PointLight(0xfff5e0, 1.5, 30);
    pl.position.set(0, 4.5, z);
    scene.add(pl);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  scene.fog = new THREE.Fog(0xdfe6ee, 35, 80);

  // ── Shelving (5.7 m per unit) ──────────────────────────────────────────────
  // Left wall z=7 removed (was blocking fire-extinguisher at z=5).
  // Right wall unchanged.
  function placeShelf(x, z, ry) {
    if (!M.shelving) return;
    const s = M.shelving.clone();
    s.position.set(x, 0, z);
    s.rotation.y = ry;
    s.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = true; } });
    sceneAdd(s);
  }

  const LW = -7.0, RW = 7.0, PI2 = Math.PI / 2;
  // Left wall: z=7 removed to clear sightline to fire-extinguisher (z=5)
  for (const z of [19, 13, 1, -6])     placeShelf(LW, z,  PI2);
  // Right wall: unchanged
  for (const z of [19, 13, -1, -8, -15])  placeShelf(RW, z, -PI2);
  // Centre island
  placeShelf(-0.4, 6,  0);
  placeShelf( 0.4, 6,  Math.PI);

  // ── Containers (north end) ─────────────────────────────────────────────────
  if (M.cont20) {
    M.cont20.position.set(-3.5, 0, -20);
    M.cont20.rotation.y = Math.PI / 2;
    sceneAdd(M.cont20, false, 0.05, 0.05);
  }
  if (M.contSmall) {
    M.contSmall.position.set(3.5, 0, -20);
    sceneAdd(M.contSmall, false, 0.05, 0.05);
  }

  // ── Forklift ──────────────────────────────────────────────────────────────
  if (M.forklift) {
    M.forklift.position.set(4.5, 0, 14);
    M.forklift.rotation.y = Math.PI / 8;
    sceneAdd(M.forklift, false, 0.1, 0.1);
  }

  // ── Pallets + box stacks (tidy, decorative) ────────────────────────────────
  const palH = M.pallet ? groupHeight(M.pallet) : 0.14;
  const bBox = M.box ? new THREE.Box3().setFromObject(M.box) : null;
  const bSz  = bBox ? new THREE.Vector3() : null;
  if (bBox && bSz) bBox.getSize(bSz);
  const boxH = bSz?.y ?? 0.40;
  const boxW = bSz?.x ?? 1.20;

  // Removed [-5.5, -2.5, 2] — was blocking hazard-log board at z=-2.5.
  const palletDefs = [
    [ 2.5,   2.0, 3],
    [-2.5,  10.5, 2],
    [ 5.5,  -3.0, 3],
    [ 2.0, -18.0, 3],
    [-2.0, -12.5, 2],
  ];

  for (const [px, pz, nBoxes] of palletDefs) {
    if (!M.pallet) break;
    const p = M.pallet.clone();
    p.position.set(px, 0, pz);
    sceneAdd(p);

    for (let i = 0; i < nBoxes; i++) {
      if (!M.box) break;
      const b = M.box.clone();
      const xOff = Math.sin(px * 2.1 + i * 1.7) * 0.02;
      const zOff = Math.cos(pz * 1.9 + i * 2.3) * 0.02;
      b.position.set(px + xOff, palH + i * boxH, pz + zOff);
      b.rotation.y = Math.sin(px + pz + i) * 0.06;
      sceneAdd(b);
    }
  }

  // Loose boxes — removed [-6.5, 3.5] which was blocking fire-extinguisher.
  const looseBoxDefs = [
    [ 6.5, -1.5],
    [-3.0, 14.5],
    [ 3.5, -14.0],
    [-1.5,  -3.5],
  ];
  for (const [bx, bz] of looseBoxDefs) {
    if (!M.box) break;
    const b = M.box.clone();
    b.position.set(bx, 0, bz);
    b.rotation.y = Math.sin(bx * 1.3 + bz * 0.9) * 0.8;
    sceneAdd(b);
  }

  // ── Barrel cluster (non-interactive) ──────────────────────────────────────
  if (M.bCluster) {
    M.bCluster.position.set(-6.0, 0, -9.0);
    sceneAdd(M.bCluster, false, 0.1, 0.1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── 7 Interactive objects ────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  // CLUE 1 — cracked-container (leaking barrel)
  // Rotated PI so the leak/drip side faces toward the puddle at (-3.6, -6.6).
  // Barrel is at (-4.1, -7.6); puddle is slightly north-east of it.
  // rotation.y = PI points the model's +z face southward, rotating the spout
  // toward the puddle. Adjust by eye if model's leak is on a different face.
  if (M.bLeak) {
    const hb = makeHitBox(1.1, 1.0, 1.1);
    hb.position.set(0, 0.5, 0);
    hb.userData.hotspotId = 'cracked-container';
    M.bLeak.add(hb);
    // rotation.y = PI rotates model 180 deg — leak face now points toward puddle
    placeInteractive(M.bLeak, 'cracked-container', -4.1, 0, -7.6, Math.PI);
  }

  // CLUE 2 — wet-patch (oil puddle)
  // Glow: flat box with 0.04 m y-thickness, sitting at floor level.
  if (M.puddle) {
    M.puddle.traverse(c => {
      if (!c.isMesh) return;
      c.frustumCulled = false;
      c.renderOrder   = 2;
      c.material = c.material.clone();
      c.material.depthWrite          = false;
      c.material.depthTest           = true;
      c.material.polygonOffset       = true;
      c.material.polygonOffsetFactor = -6;
      c.material.polygonOffsetUnits  = -6;
      c.material.transparent         = true;
      if (c.material.opacity < 0.1) c.material.opacity = 0.90;
    });

    const hb = makeHitBox(2.0, 0.12, 2.0);
    hb.position.set(0, 0.06, 0);
    hb.userData.hotspotId = 'wet-patch';
    M.puddle.add(hb);

    placeInteractive(M.puddle, 'wet-patch', -3.6, 0.045, -6.6, 0, true,
      { flatFloor: true });   // enforces minimum y-thickness = 0.04 m
  }

  // CLUE 3 — hazard-log (note board on left wall)
  // Glow: wall-mounted, back face flush with left wall at x ≈ -8.
  if (M.noteBoard) {
    M.noteBoard.updateMatrixWorld(true);
    const nb  = new THREE.Box3().setFromObject(M.noteBoard);
    const nbS = new THREE.Vector3();
    nb.getSize(nbS);
    const bW = nbS.x, bH = nbS.y, bD = nbS.z;

    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(bW * 0.78, bH * 0.72),
      new THREE.MeshStandardMaterial({ map: makeLogTexture(), side: THREE.DoubleSide }),
    );
    paper.position.set(0, bH / 2, bD / 2 + 0.007);
    paper.userData.hotspotId = 'hazard-log';
    M.noteBoard.add(paper);

    const hb = makeHitBox(bW + 0.4, bH + 0.3, 0.5);
    hb.position.set(0, bH / 2, 0);
    hb.userData.hotspotId = 'hazard-log';
    M.noteBoard.add(hb);

    placeInteractive(M.noteBoard, 'hazard-log', -7.8, 1.2, -2.5, Math.PI / 2,
      false,
      { wallAxis: 'x', wallDir: -1, wallLimit: -8.0 });
  }

  // DECOY 1 — fire-extinguisher (left wall, z=5)
  // Glow: wall-mounted, back face flush with left wall at x ≈ -8.
  if (M.extinguish) {
    placeInteractive(M.extinguish, 'fire-extinguisher', -7.6, 1.1, 5.0, Math.PI / 2,
      false,
      { wallAxis: 'x', wallDir: -1, wallLimit: -8.0 });
  }

  // DECOY 2 — safety-gloves (PPE mannequin)
  if (M.mannequin) {
    const hb = makeHitBox(0.6, 1.8, 0.6);
    hb.position.set(0, 0.9, 0);
    hb.userData.hotspotId = 'safety-gloves';
    M.mannequin.add(hb);
    placeInteractive(M.mannequin, 'safety-gloves', 5.5, 0, -11, 0);
  }

  // DECOY 3 — wet-floor-sign
  if (M.wfSign) {
    const hb = makeHitBox(1.0, 1.5, 1.0);
    hb.position.set(0, 0.75, 0);
    hb.userData.hotspotId = 'wet-floor-sign';
    M.wfSign.add(hb);
    placeInteractive(M.wfSign, 'wet-floor-sign', 3.5, 0, 9, 0.3);
  }

  // DECOY 4 — overhanging-boxes (risky stack)
  {
    const id  = 'overhanging-boxes';
    const grp = new THREE.Group();
    grp.userData.hotspotId = id;

    if (M.pallet) {
      const pal = M.pallet.clone();
      pal.traverse(c => { if (c.isMesh) c.userData.hotspotId = id; });
      grp.add(pal);
    }

    const stack = [
      [0,     0,    0   ],
      [0,     0,    0.02],
      [0.025, 0,    0.03],
      [0.28,  0,   -0.03],
      [0.43,  0,    0.04],
    ];

    for (let i = 0; i < stack.length; i++) {
      if (!M.box) break;
      const [xO, , zO] = stack[i];
      const b = M.box.clone();
      b.position.set(xO, palH + i * boxH, zO);
      b.rotation.y = stack[i][2] * 0.3;
      b.traverse(c => { if (c.isMesh) { c.userData.hotspotId = id; interactiveMeshes.push(c); } });
      grp.add(b);
    }

    grp.traverse(c => {
      if (c.isMesh && c.userData.hotspotId === id && !interactiveMeshes.includes(c)) {
        interactiveMeshes.push(c);
      }
    });

    const totalH = palH + stack.length * boxH;
    const hb = makeHitBox(boxW + 0.5, totalH + 0.1, boxW + 0.15);
    hb.position.set(0.2, totalH / 2, 0);
    hb.userData.hotspotId = id;
    hb.traverse(c => { if (c.isMesh) { c.userData.hotspotId = id; interactiveMeshes.push(c); } });
    grp.add(hb);

    grp.position.set(5.2, 0, -5);
    sceneAdd(grp, false, 0.1, 0.1);

    glowPlanes.push(attachGlowBox(grp, scene));
  }

  // ── Dev report ────────────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    scene.updateMatrixWorld(true);
    const report = Object.entries(M).map(([key, obj]) => {
      const b = new THREE.Box3().setFromObject(obj);
      const s = new THREE.Vector3(); b.getSize(s);
      return { model: key, x_m: +s.x.toFixed(3), y_m: +s.y.toFixed(3), z_m: +s.z.toFixed(3) };
    });
    console.table(report);
    const spawn = { x: 0, z: 20 };
    if (collidesAt(colliders, spawn.x, spawn.z)) {
      console.warn('[warehouseBuilder] SPAWN BLOCKED at', spawn.x, spawn.z);
    }
  }

  return { interactiveMeshes, glowPlanes, colliders, spawnPoint: new THREE.Vector3(0, 1.7, 20), failedModels };
}

// ─── Inspection-log canvas texture (larger / bolder than case001) ─────────────
function makeInspectionLogTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 384;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f0ebe0';
  ctx.fillRect(0, 0, 512, 384);

  // Title
  ctx.fillStyle = '#1a1008';
  ctx.font = 'bold 34px "Courier New", monospace';
  ctx.fillText('FIRE SAFETY', 18, 50);
  ctx.fillText('INSPECTION LOG', 18, 90);

  ctx.strokeStyle = '#7a6040'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(18, 104); ctx.lineTo(494, 104); ctx.stroke();

  // Status line — large and prominent
  ctx.fillStyle = '#c0392b';
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillText('No entries recorded', 18, 140);

  // Column headers
  ctx.fillStyle = '#666050';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText('Date', 18, 178);
  ctx.fillText('Inspector', 130, 178);
  ctx.fillText('Result', 320, 178);

  ctx.strokeStyle = '#c8bca0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 186); ctx.lineTo(494, 186); ctx.stroke();

  // Empty rows
  for (let y = 210; y < 370; y += 36) {
    ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(494, y); ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

// ─── buildWarehouse002 ────────────────────────────────────────────────────────
// Case002 — Blocked Fire Exit.
// Same warehouse structure as case001 (shell, lighting, shelving, containers,
// forklift, pallets).  Different interactive objects: 3 clues + 4 decoys.
// Returns the same shape as buildWarehouse().
export async function buildWarehouse002(scene, loadingManager) {
  const interactiveMeshes = [];
  const glowPlanes        = [];
  const colliders         = [];
  const failedModels      = [];

  const SPECS = {
    // ── shared structural models ──
    shell:      { url: '/assets/models/warehouse/warehouse-shell.glb', axis: 'x', target: 16   },
    shelving:   { url: '/assets/models/warehouse/shelving.glb',        axis: 'x', target: 5.7  },
    box:        { url: '/assets/models/warehouse/cardboard_box.glb',   axis: 'x', target: 1.2  },
    pallet:     { url: '/assets/models/warehouse/pallet.glb',          axis: 'x', target: 1.2  },
    forklift:   { url: '/assets/models/warehouse/forklift.glb',        axis: 'y', target: 2.2  },
    cont20:     { url: '/assets/models/warehouse/container-20ft.glb',  axis: 'z', target: 6.1  },
    contSmall:  { url: '/assets/models/warehouse/container-small.glb', axis: 'x', target: 6.1  },
    // ── case002-specific models ──
    exitSign:   { url: '/assets/models/case002/fire-exit-sign.glb',    axis: 'y', target: 0.45 },
    extinguish: { url: '/assets/models/case002/fire-extinguisher.glb', axis: 'y', target: 1.10 },
    noteBoard:  { url: '/assets/models/case002/note-board.glb',        axis: 'x', target: 1.2  },
    mannequin:  { url: '/assets/models/case002/ppe-mannequin.glb',     axis: 'y', target: 1.75 },
    wfSign:     { url: '/assets/models/case002/wet-floor-sign.glb',    axis: 'y', target: 1.3  },
    looseBox:   { url: '/assets/models/case002/cardboard_box.glb',     axis: 'x', target: 1.2  },
  };

  const results = await Promise.allSettled(
    Object.entries(SPECS).map(([key, spec]) =>
      loadModel(spec.url, spec, loadingManager).then(g => ({ key, g })),
    ),
  );

  const M = {};
  for (const r of results) {
    if (r.status === 'fulfilled') M[r.value.key] = r.value.g;
    else {
      console.error('[warehouseBuilder002] Load failed:', r.reason?.message);
      failedModels.push(r.reason?.message ?? 'unknown model');
    }
  }

  function groupHeight(g) {
    const b = new THREE.Box3().setFromObject(g);
    return b.max.y - b.min.y;
  }

  function sceneAdd(obj, skipCollider = false, padX = 0.12, padZ = 0.12) {
    scene.add(obj);
    obj.updateMatrixWorld(true);
    if (!skipCollider) addCollider(colliders, obj, padX, padZ);
  }

  function placeInteractive(group, id, x, y, z, ry = 0, skipCollider = false, glowOpts = {}) {
    group.userData.hotspotId = id;
    group.position.set(x, y, z);
    group.rotation.y = ry;
    sceneAdd(group, skipCollider);
    group.traverse(child => {
      if (child.isMesh) child.userData.hotspotId = id;
      if (child.isMesh && !child.userData.isHitBox) interactiveMeshes.push(child);
    });
    glowPlanes.push(attachGlowBox(group, scene, glowOpts));
  }

  // ── Warehouse shell ──────────────────────────────────────────────────────────
  if (M.shell) {
    M.shell.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = true; } });
    scene.add(M.shell);
    M.shell.updateMatrixWorld(true);

    const slabTex = makeSlabFloorTexture();
    let floorFound = false;
    M.shell.traverse(child => {
      if (!child.isMesh) return;
      child.updateMatrixWorld(true);
      const bb   = new THREE.Box3().setFromObject(child);
      const size = new THREE.Vector3();
      bb.getSize(size);
      const isFloor = size.y < 0.25 && bb.min.y < 0.3 && size.x * size.z > 30;

      if (isFloor) {
        floorFound = true;
        child.renderOrder = 0;
        child.material = new THREE.MeshStandardMaterial({
          map: slabTex, color: 0xb0adaa,
          roughness: 0.88, metalness: 0, envMapIntensity: 0,
        });
      } else {
        if (child.material) {
          child.material = child.material.clone();
          if (child.material.color) {
            const col = child.material.color;
            const L   = 0.78;
            col.setRGB(col.r + (L - col.r) * 0.42, col.g + (L - col.g) * 0.42, col.b + (L - col.b) * 0.42);
          }
          if (child.material.metalness     !== undefined) child.material.metalness     = Math.min(child.material.metalness, 0.10);
          if (child.material.envMapIntensity !== undefined) child.material.envMapIntensity = 0.05;
        }
      }
    });
    if (import.meta.env.DEV && !floorFound) {
      console.warn('[warehouseBuilder002] Floor mesh not auto-detected in shell.');
    }
  }

  // Boundary colliders
  addBoxCollider(colliders,  0, -24, 10, 1);
  addBoxCollider(colliders,  0,  24, 10, 1);
  addBoxCollider(colliders, -9,   0,  1, 25);
  addBoxCollider(colliders,  9,   0,  1, 25);

  // ── Lights ───────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ccd2, 1.0));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(2, 10, 14);
  dirLight.castShadow = false;
  scene.add(dirLight);

  for (const z of [18, 7, -5, -17]) {
    const pl = new THREE.PointLight(0xfff5e0, 1.5, 30);
    pl.position.set(0, 4.5, z);
    scene.add(pl);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  scene.fog = new THREE.Fog(0xdfe6ee, 35, 80);

  // ── Shelving ─────────────────────────────────────────────────────────────────
  function placeShelf(x, z, ry) {
    if (!M.shelving) return;
    const s = M.shelving.clone();
    s.position.set(x, 0, z);
    s.rotation.y = ry;
    s.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = true; } });
    sceneAdd(s);
  }

  const LW = -7.0, RW = 7.0, PI2 = Math.PI / 2;
  // Left wall shelving (same as case001)
  for (const z of [19, 13, 1, -6])    placeShelf(LW, z,  PI2);
  // Right wall shelving. Rack at z=−8.75 (0.75 m south of extinguisher at z=−8):
  // extinguisher sits just north of the rack's centre — fully within the rack's z-span
  // and behind its wall face (x=7.45) from the main aisle approach.
  for (const z of [19, 13, -15])  placeShelf(RW, z, -PI2);
  placeShelf(RW, -8.75, -PI2);    // 0.75 m south of extinguisher; extinguisher behind rack
  // Centre island
  placeShelf(-0.4, 6,  0);
  placeShelf( 0.4, 6,  Math.PI);

  // ── Containers (north end) ────────────────────────────────────────────────────
  if (M.cont20) {
    M.cont20.position.set(-3.5, 0, -20);
    M.cont20.rotation.y = Math.PI / 2;
    sceneAdd(M.cont20, false, 0.05, 0.05);
  }
  if (M.contSmall) {
    M.contSmall.position.set(3.5, 0, -20);
    sceneAdd(M.contSmall, false, 0.05, 0.05);
  }

  // ── Decorative forklift (north area — not interactive in case001, but here too) ─
  // NOTE: the INTERACTIVE parked-forklift decoy is placed separately below.
  // We DON'T add a decorative forklift here so there's only one copy.

  // ── Pallets + box stacks (decorative) ────────────────────────────────────────
  const palH = M.pallet ? groupHeight(M.pallet) : 0.14;
  const bBox = M.box ? new THREE.Box3().setFromObject(M.box) : null;
  const bSz  = bBox ? new THREE.Vector3() : null;
  if (bBox && bSz) bBox.getSize(bSz);
  const boxH = bSz?.y ?? 0.40;
  const boxW = bSz?.x ?? 1.20;

  const palletDefs = [
    [ 2.5,   2.0, 2],
    [-2.5,  10.5, 2],
    [ 2.0, -18.0, 3],
    [-2.0, -12.5, 2],
  ];

  for (const [px, pz, nBoxes] of palletDefs) {
    if (!M.pallet) break;
    const p = M.pallet.clone();
    p.position.set(px, 0, pz);
    sceneAdd(p);
    for (let i = 0; i < nBoxes; i++) {
      if (!M.box) break;
      const b = M.box.clone();
      const xOff = Math.sin(px * 2.1 + i * 1.7) * 0.02;
      const zOff = Math.cos(pz * 1.9 + i * 2.3) * 0.02;
      b.position.set(px + xOff, palH + i * boxH, pz + zOff);
      b.rotation.y = Math.sin(px + pz + i) * 0.06;
      sceneAdd(b);
    }
  }

  // Loose decorative boxes
  const looseBoxDefs = [
    [-3.0, 14.5],
    [ 3.5, -14.0],
    [-1.5,  -3.5],
  ];
  for (const [bx, bz] of looseBoxDefs) {
    if (!M.box) break;
    const b = M.box.clone();
    b.position.set(bx, 0, bz);
    b.rotation.y = Math.sin(bx * 1.3 + bz * 0.9) * 0.8;
    sceneAdd(b);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── 7 Interactive objects (3 clues + 4 decoys) ───────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Fire exit door geometry constants ────────────────────────────────────────
  // Door sits in the right wall.  DX=7.75 puts the panel face just in front of
  // the inner-wall surface (~x=8) so it is clearly visible from the main aisle.
  // Hinge = NORTH (+z from door centre).  Handle/push-bar = SOUTH (-z).
  // Box pile is dense on the hinge (north) side; the handle side is left clear
  // so the player / cutscene worker can stand in front of the push-bar.
  const DX    = 7.75;   // door centre x (world)
  const DZ    = -3.00;  // door centre z (world)
  const D_W   = 0.90;   // door width  (z-axis)
  const D_H   = 2.00;   // door height (y-axis)
  const D_D   = 0.15;   // door depth  (x-axis) — thicker for readability
  const FRAME = 0.10;   // frame tube thickness

  const doorMat  = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.70, metalness: 0.30 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4d6050, roughness: 0.55, metalness: 0.45 });
  const barMat   = new THREE.MeshStandardMaterial({ color: 0xb8c4b8, roughness: 0.38, metalness: 0.65 });
  const recessMat= new THREE.MeshStandardMaterial({ color: 0x22302a, roughness: 0.80, metalness: 0.10 });

  // CLUE 1 — blocked-exit-door ─────────────────────────────────────────────────
  // Group is placed at (DX, 0, DZ); all local coords relative to that origin.
  {
    const grp = new THREE.Group();
    grp.userData.hotspotId = 'blocked-exit-door';

    // ── Recessed wall inset (slightly behind door to give depth impression) ──
    const recess = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, D_H + FRAME * 2, D_W + FRAME * 2 + 0.04),
      recessMat.clone(),
    );
    recess.position.set(0.06, D_H / 2 + FRAME / 2, 0); // slightly east of door face
    grp.add(recess);

    // ── Door panel ───────────────────────────────────────────────────────────
    const panel = new THREE.Mesh(new THREE.BoxGeometry(D_D, D_H, D_W), doorMat.clone());
    panel.position.set(0, D_H / 2, 0);
    panel.userData.hotspotId = 'blocked-exit-door';
    grp.add(panel);

    // ── Frame — top bar ──────────────────────────────────────────────────────
    const fTop = new THREE.Mesh(
      new THREE.BoxGeometry(D_D + 0.02, FRAME, D_W + FRAME * 2),
      frameMat.clone(),
    );
    fTop.position.set(0, D_H + FRAME / 2, 0);
    grp.add(fTop);

    // Frame — hinge side (north, +z)
    const fNorth = new THREE.Mesh(
      new THREE.BoxGeometry(D_D + 0.02, D_H + FRAME, FRAME),
      frameMat.clone(),
    );
    fNorth.position.set(0, D_H / 2, D_W / 2 + FRAME / 2);
    grp.add(fNorth);

    // Frame — handle side (south, -z)
    const fSouth = new THREE.Mesh(
      new THREE.BoxGeometry(D_D + 0.02, D_H + FRAME, FRAME),
      frameMat.clone(),
    );
    fSouth.position.set(0, D_H / 2, -D_W / 2 - FRAME / 2);
    grp.add(fSouth);

    // ── Push bar — horizontal panic bar on handle (south) side ───────────────
    // Bar runs along z from door south edge inward ≈ 0.5 m.
    // Push-bar z centre in local coords: south half of the door = DZ - D_W/4 relative to DZ
    // In local space relative to group origin: z ≈ -D_W/4 = -0.225
    const pushBar = new THREE.Mesh(
      new THREE.BoxGeometry(D_D + 0.10, 0.07, 0.50),
      barMat.clone(),
    );
    pushBar.position.set(0, 1.10, -D_W / 4);   // centred on south half of door
    pushBar.userData.hotspotId = 'blocked-exit-door';
    grp.add(pushBar);

    // Push-bar bracket studs (decorative detail)
    for (const bz of [-0.18, 0.18]) {
      const stud = new THREE.Mesh(new THREE.BoxGeometry(D_D + 0.06, 0.09, 0.06), barMat.clone());
      stud.position.set(0, 1.10, -D_W / 4 + bz);
      grp.add(stud);
    }

    // ── Door handle (grab bar) — handle (south/accessible) side ──────────────
    // A horizontal grab bar protruding 0.07 m from the door's west face, at
    // standard handle height (1.0 m), centred on the south half of the door.
    // This is on the CLEAR side — no boxes south of z≈-3.12.
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8a9a8a, roughness: 0.22, metalness: 0.88 });
    // Horizontal grip bar (runs north-south, 0.28 m)
    const handleBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.04, 0.28),
      handleMat,
    );
    // local x: protrudes D_D/2+0.035 from door centre toward aisle (−x)
    handleBar.position.set(-(D_D / 2 + 0.035), 1.0, -D_W / 4);
    handleBar.userData.hotspotId = 'blocked-exit-door';
    grp.add(handleBar);

    // Two bracket arms connecting bar to door face
    for (const bz of [-0.10, 0.10]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(D_D / 2 + 0.05, 0.035, 0.035),
        handleMat.clone(),
      );
      arm.position.set(-(D_D / 4), 1.0, -D_W / 4 + bz);
      arm.userData.hotspotId = 'blocked-exit-door';
      grp.add(arm);
    }


    // ── Fire-exit sign — flush on flat wall segment LEFT (rack side) of door ──
    // "Left" when facing the door/east wall = south (-z direction).
    // Door frame south outer edge: z = DZ − D_W/2 − FRAME = −3.55.
    // Sign at z=−4.5: north edge ≈ −4.1 (0.55 m clear of frame) ✓, south edge ≈ −4.9
    // (north of rack north face ≈ −5.15 at current rack z) ✓ — clean flat wall segment.
    // x=7.8: same flush wall-mount distance as the note board. rotation.y=−PI/2: face west.
    // y=1.0: sign bottom at 1.0 m, centre ≈ 1.2 m (mid-height of the 2.0 m door).
    const SIGN_Z = -4.5;
    const SIGN_Y  = 1.0;
    if (M.exitSign) {
      M.exitSign.updateMatrixWorld(true);
      const signBB = new THREE.Box3().setFromObject(M.exitSign);
      const signSz = new THREE.Vector3();
      signBB.getSize(signSz);
      if (import.meta.env.DEV) {
        console.log(`[warehouseBuilder002] fire-exit-sign: ${signSz.x.toFixed(3)} x ${signSz.y.toFixed(3)} x ${signSz.z.toFixed(3)} m`);
      }
      const sign = M.exitSign.clone();
      sign.traverse(c => {
        if (c.isMesh && c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(m => { m.side = THREE.DoubleSide; m.needsUpdate = true; });
        }
      });
      sign.position.set(7.8, SIGN_Y, SIGN_Z);    // mid-height, left of door, flush on wall
      sign.rotation.y = -Math.PI / 2;             // face west (toward aisle)
      scene.add(sign);
    } else {
      console.error('[warehouseBuilder002] fire-exit-sign.glb failed to load — EXIT fallback shown');
      const fb = document.createElement('canvas');
      fb.width = 256; fb.height = 128;
      const fc = fb.getContext('2d');
      fc.fillStyle = '#008833'; fc.fillRect(0, 0, 256, 128);
      fc.fillStyle = '#ffffff'; fc.font = 'bold 68px Arial'; fc.textAlign = 'center';
      fc.fillText('EXIT', 128, 88);
      const fallbackMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.45, 0.80),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fb), side: THREE.DoubleSide }),
      );
      fallbackMesh.position.set(7.8, SIGN_Y + 0.225, SIGN_Z);  // centre at SIGN_Y + half-height
      fallbackMesh.rotation.y = -Math.PI / 2;
      scene.add(fallbackMesh);
    }

    // ── Box pile — asymmetric ─────────────────────────────────────────────────
    // P_X1 = -0.70 → world x = DX-0.70 = 7.05.  Box east edge = 7.05+0.60 = 7.65,
    // essentially flush against the door face (west face at DX-D_D/2 = 7.675).
    // Hinge z = 0.42 → box south edge = 0.42-0.60 = -0.18, north edge = 1.02.
    // Frame north inner edge is at local z = D_W/2 = 0.45 — boxes sit flush.
    // Handle side: ONE decorative box at z=-0.12 (world z=-3.12), well north of
    // the push-bar at z=-0.225 (world z=-3.225). Handle approach from z<-3.3 is clear.
    const P_X1 = -0.70;   // primary pile local x   → world x ≈ 7.05 (flush with door)
    const P_X2 = -1.70;   // secondary pile local x  → world x ≈ 6.05
    const PAL_H = M.pallet ? groupHeight(M.pallet) : 0.14;
    const BOX_BB = M.box ? new THREE.Box3().setFromObject(M.box) : null;
    const BOX_SZ = BOX_BB ? new THREE.Vector3() : null;
    if (BOX_BB && BOX_SZ) BOX_BB.getSize(BOX_SZ);
    const BOX_H = BOX_SZ?.y ?? 0.40;

    if (M.pallet) {
      const p1 = M.pallet.clone();
      p1.position.set(P_X1, 0, 0.42);
      grp.add(p1);
      const p2 = M.pallet.clone();
      p2.position.set(P_X2, 0, 0.38);
      grp.add(p2);
    }

    const pileBoxes = [
      // ── Hinge (north) side — 3-tall primary stack ──────────────────────────
      [P_X1,  PAL_H,              0.42],   // row 1 — south edge at z=-0.18 (world -3.18)
      [P_X1,  PAL_H + BOX_H,     0.40],   // row 2
      [P_X1,  PAL_H + BOX_H * 2, 0.38],   // row 3 (top)
      // ── Secondary west stack ───────────────────────────────────────────────
      [P_X2,  PAL_H,              0.38],
      [P_X2,  PAL_H + BOX_H,     0.35],
      // ── Handle (south) side — one decorative box, well north of push-bar ──
      [P_X1,  PAL_H,             -0.12],   // world z ≈ -3.12; push-bar at -3.225
    ];

    for (const [bx, by, bz] of pileBoxes) {
      if (!M.box) break;
      const b = M.box.clone();
      b.position.set(bx, by, bz);
      b.rotation.y = Math.sin(bx * 1.7 + bz * 2.3) * 0.12;
      b.userData.hotspotId = 'blocked-exit-door';
      b.traverse(c => { if (c.isMesh) c.userData.hotspotId = 'blocked-exit-door'; });
      grp.add(b);
    }

    // ── Large invisible hit-box ───────────────────────────────────────────────
    const hb = makeHitBox(2.6, 2.4, 1.6);
    hb.position.set(-0.90, 1.2, 0.15);
    hb.userData.hotspotId = 'blocked-exit-door';
    grp.add(hb);

    // ── Register all visible meshes as interactive ────────────────────────────
    grp.traverse(child => {
      if (child.isMesh) child.userData.hotspotId = 'blocked-exit-door';
      if (child.isMesh && !child.userData.isHitBox) interactiveMeshes.push(child);
    });

    // ── Place group in scene ─────────────────────────────────────────────────
    grp.position.set(DX, 0, DZ);
    scene.add(grp);
    grp.updateMatrixWorld(true);

    // Pile collider — recentred on new pile positions.
    // Centre at (DX+P_X1-0.50, DZ+0.30) = (6.55, -2.70).
    // halfW=0.95 covers pile west edge (6.05-0.60=5.45) → wall stop at ~8.
    // halfD=0.15 → min.z = -2.70-0.15-0.45 = -3.30; player cleared south of z=-3.30.
    // (Right-wall boundary collider at x=9 already stops wall walk-through.)
    addBoxCollider(colliders, DX + P_X1 - 0.50, DZ + 0.30, 0.95, 0.15);

    glowPlanes.push(attachGlowBox(grp, scene));
  }



  // Wall-mounted on the right wall behind the shifted z=-8 shelf.
  //
  // Shelf (moved to x=6.6) has its east face at world x ≈ 6.6+0.45 = 7.05.
  // Extinguisher at x=7.75 → gap from shelf east face: 7.75-0.14-7.05 ≈ 0.56 m (no clip).
  // Wall inner face ≈ x=8.0  → gap from extinguisher east edge: 8.0-7.75-0.14 ≈ 0.11 m (no clip).
  // y=0.9: bottom at 0.9 m, centre ≈ 1.45 m = believable chest-height wall bracket.
  // z=-8.0: directly behind shelf midpoint → rack occludes it from main aisle.
  // rotation.y=-PI/2: front/label faces west (−x, toward aisle), same as note board.
  // skipCollider=true: wall boundary stops player at x≈7.55 so no floor collider needed.
  // glowIntensity 0.78 — brighter than the standard 0.45.
  if (M.extinguish) {
    const hb = makeHitBox(0.9, 1.3, 0.9);
    hb.position.set(0, 0.55, 0);   // hitbox centre at mid-height of the model
    hb.userData.hotspotId = 'hidden-extinguisher';
    M.extinguish.add(hb);
    placeInteractive(
      M.extinguish, 'hidden-extinguisher',
      7.75, 0.9, -8.0,
      -Math.PI / 2,
      true,                          // skipCollider — wall boundary already covers this x
      { glowIntensity: 0.78 },
    );
  }

  // CLUE 3 — inspection-log ────────────────────────────────────────────────────
  // Note board on the RIGHT WALL, north of the exit (world z=-0.5).
  if (M.noteBoard) {
    M.noteBoard.updateMatrixWorld(true);
    const nb  = new THREE.Box3().setFromObject(M.noteBoard);
    const nbS = new THREE.Vector3();
    nb.getSize(nbS);
    const bW = nbS.x, bH = nbS.y, bD = nbS.z;

    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(bW * 0.78, bH * 0.72),
      new THREE.MeshStandardMaterial({ map: makeInspectionLogTexture(), side: THREE.DoubleSide }),
    );
    paper.position.set(0, bH / 2, bD / 2 + 0.007);
    paper.userData.hotspotId = 'inspection-log';
    M.noteBoard.add(paper);

    const hb = makeHitBox(bW + 0.4, bH + 0.3, 0.5);
    hb.position.set(0, bH / 2, 0);
    hb.userData.hotspotId = 'inspection-log';
    M.noteBoard.add(hb);

    placeInteractive(M.noteBoard, 'inspection-log', 7.8, 1.2, -0.5, -Math.PI / 2,
      false,
      { wallAxis: 'x', wallDir: 1, wallLimit: 8.5 },
    );
  }

  // DECOY 1 — wet-floor-sign ────────────────────────────────────────────────────
  // Moved from (-5.0, 0, 8.0) to (-4.2, 0, 7.0):
  //   • At z=7.0 the gap north to the left-wall z=13 shelf collider (south face ≈
  //     z=9.58) is 1.5 m — player passes through comfortably.
  //   • At x=-4.2 the sign's collider west edge (≈-4.2-0.32-0.45=-4.97) clears
  //     the left-wall shelf collider east edge (≈x=-5.53) by 0.56 m.
  //   • Hitbox shrunk to 0.65 m to match the visible model footprint more tightly.
  if (M.wfSign) {
    const hb = makeHitBox(0.65, 1.5, 0.65);
    hb.position.set(0, 0.75, 0);
    hb.userData.hotspotId = 'wet-floor-sign';
    M.wfSign.add(hb);
    placeInteractive(M.wfSign, 'wet-floor-sign', -4.2, 0, 7.0, 0.4);
  }

  // DECOY 2 — ppe-figure (mannequin, deep south) ────────────────────────────────
  if (M.mannequin) {
    const hb = makeHitBox(0.6, 1.8, 0.6);
    hb.position.set(0, 0.9, 0);
    hb.userData.hotspotId = 'ppe-figure';
    M.mannequin.add(hb);
    placeInteractive(M.mannequin, 'ppe-figure', -4.0, 0, -14.0, Math.PI * 0.1);
  }

  // DECOY 3 — loose-box (single box, south aisle) ───────────────────────────────
  if (M.looseBox) {
    const hb = makeHitBox(1.4, 1.4, 1.4);
    hb.position.set(0, 0.7, 0);
    hb.userData.hotspotId = 'loose-box';
    M.looseBox.add(hb);
    placeInteractive(M.looseBox, 'loose-box', 1.5, 0, -16.0, 0.6);
  }

  // DECOY 4 — parked-forklift (north area) ─────────────────────────────────────
  if (M.forklift) {
    placeInteractive(M.forklift, 'parked-forklift', 4.5, 0, 14.0, Math.PI / 8, false);
  }

  // ── Dev report ───────────────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    scene.updateMatrixWorld(true);
    const report = Object.entries(M).map(([key, obj]) => {
      const b = new THREE.Box3().setFromObject(obj);
      const s = new THREE.Vector3(); b.getSize(s);
      return { model: key, x_m: +s.x.toFixed(3), y_m: +s.y.toFixed(3), z_m: +s.z.toFixed(3) };
    });
    console.table(report);
  }

  return { interactiveMeshes, glowPlanes, colliders, spawnPoint: new THREE.Vector3(0, 1.7, 20), failedModels };
}

