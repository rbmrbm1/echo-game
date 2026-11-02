/* ============================================================
   SPIDER HUNT — stealth camp hunt (3D, first person, dark anime)

   You are a spider in a big dark forest at night. Campers are
   dotted around the map, each watching the area in front of them
   (red vision cone). Sneak through the greenery and kill every
   camper — but if ANY camper sees you, your HP drains fast and
   the level restarts. Hide in bushes to break their line of sight.

   Controls:
     Click the screen .... lock the mouse to look around
     Mouse ............... look
     W A S D ............. crawl (relative to where you look)
     Left / Right arrow .. turn
     SPACE ............... pounce (lunge to reach & kill a camper)
     V ................... toggle first-person / see your spider
     Backspace ........... restart the level
   ============================================================ */

/* global THREE */

// ---------- Tunables ----------
const ROOM = { x: 60, z: 60 };        // BIG map
const SPEED = 11;
const TURN = 1.8;
const MOUSE_SENS = 0.0022;
const POUNCE_SPEED = 24;
const HUMAN_COUNT = 5;                // fewer entities
const VISION_RANGE = 34;              // big, invisible vision range
const VISION_HALF = (45 * Math.PI) / 180;
const HP_MAX = 100;

// ---------- Dark anime palette ----------
const C = {
  sky: 0x0b0a1a, fog: 0x100d24,
  ground: 0x16301f, ground2: 0x11271a,
  grass: 0x2f5a3a, bush: 0x1b3a26,
  spider: 0x16131c, spiderEye: 0xff5a1f,
  trunk: 0x241a2a, blossom: 0xb14dff,
  skin: 0xc9a98a, cloth: [0x4a5a7a, 0x6a4a5a, 0x5a5a3a, 0x3a5a5a],
  cone: 0xff3b3b, fire: 0xff7a1a,
  petal: 0x9ad8ff, moon: 0xf4f0ff, outline: 0x05040a,
};

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.fog, 34, 115);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const canvas = renderer.domElement;
document.getElementById('game').appendChild(canvas);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0x33427f, 0x070710, 0.5));
const moonLight = new THREE.DirectionalLight(0xbcd0ff, 0.6);
moonLight.position.set(-20, 30, -14); scene.add(moonLight);
scene.add(new THREE.AmbientLight(0x1c2240, 0.45));

(function sky() {
  const moon = new THREE.Mesh(new THREE.CircleGeometry(10, 32), new THREE.MeshBasicMaterial({ color: C.moon }));
  moon.position.set(-60, 60, -110); moon.lookAt(0, 0, 0); scene.add(moon);
  const N = 500, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 220, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.5;
    p[i * 3] = Math.cos(th) * Math.sin(ph) * r; p[i * 3 + 1] = Math.cos(ph) * r + 12; p[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.9 })));
})();

// ---------- Helpers ----------
function toonMat(color) { return new THREE.MeshToonMaterial({ color }); }
function addOutline(group, s = 1.08) {
  const mat = new THREE.MeshBasicMaterial({ color: C.outline, side: THREE.BackSide });
  const extra = [];
  group.children.forEach((ch) => {
    if (ch.isMesh && ch.geometry) {
      const o = new THREE.Mesh(ch.geometry, mat);
      o.position.copy(ch.position); o.quaternion.copy(ch.quaternion);
      o.scale.copy(ch.scale).multiplyScalar(s); extra.push(o);
    }
  });
  extra.forEach((o) => group.add(o));
}
function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
// distance from point C to segment AB
function segDist(ax, az, bx, bz, cx, cz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  let t = ((cx - ax) * dx + (cz - az) * dz) / l2; t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx, pz = az + t * dz;
  return Math.hypot(cx - px, cz - pz);
}

// ---------- World: ground, grass, bushes (cover), trees, tents ----------
const bushes = [];   // {x, z, r} — hiding spots that also block sight
const blockers = []; // {x, z, r} — trees/tents: block sight only
(function buildWorld() {
  const ground = new THREE.Mesh(new THREE.BoxGeometry(ROOM.x * 2, 1, ROOM.z * 2), toonMat(C.ground));
  ground.position.y = -0.5; scene.add(ground);
  // a few big darker patches for variation
  for (let k = 0; k < 14; k++) {
    const s = 14 + Math.random() * 20;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(s, 1.02, s), toonMat(C.ground2));
    patch.position.set((Math.random() * 2 - 1) * ROOM.x, -0.49, (Math.random() * 2 - 1) * ROOM.z);
    scene.add(patch);
  }
  // grass tufts for texture
  const grassMat = toonMat(C.grass);
  for (let k = 0; k < 140; k++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 5), grassMat);
    t.position.set((Math.random() * 2 - 1) * ROOM.x, 0.3, (Math.random() * 2 - 1) * ROOM.z);
    scene.add(t);
  }
  // walls
  const wallMat = toonMat(0x0f1626); const wh = 6;
  for (const [w, h, d, x, y, z] of [
    [ROOM.x * 2, wh, 1, 0, wh / 2, -ROOM.z], [ROOM.x * 2, wh, 1, 0, wh / 2, ROOM.z],
    [1, wh, ROOM.z * 2, -ROOM.x, wh / 2, 0], [1, wh, ROOM.z * 2, ROOM.x, wh / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); scene.add(m);
  }
  // bushes = hiding cover that blocks vision — slightly see-through
  const bushMat = new THREE.MeshToonMaterial({ color: C.bush, transparent: true, opacity: 0.78, depthWrite: true });
  for (let k = 0; k < 55; k++) {
    const g = new THREE.Group();
    const r = 2.4 + Math.random() * 1.6;
    for (let b = 0; b < 5; b++) {
      const s = r * (0.6 + Math.random() * 0.5);
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), bushMat);
      blob.position.set((Math.random() * 2 - 1) * r, s * 0.7 + Math.random() * 0.6, (Math.random() * 2 - 1) * r);
      blob.rotation.set(Math.random(), Math.random(), Math.random());
      g.add(blob);
    }
    const x = (Math.random() * 2 - 1) * (ROOM.x - 4), z = (Math.random() * 2 - 1) * (ROOM.z - 4);
    if (Math.hypot(x, z - 50) < 8) continue; // keep start area clearish
    g.position.set(x, 0, z); scene.add(g);
    bushes.push({ x, z, r });
  }

  // trees (tall cover, block sight)
  const trunkMat = toonMat(C.trunk), leafMat = toonMat(0x14331f);
  for (let k = 0; k < 22; k++) {
    const t = new THREE.Group();
    const h = 7 + Math.random() * 4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, h, 6), trunkMat); trunk.position.y = h / 2; t.add(trunk);
    for (let c = 0; c < 4; c++) {
      const s = 2.4 + Math.random() * 1.4;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat);
      leaf.position.set((Math.random() * 2 - 1) * 2, h + (Math.random() * 2 - 1) * 1.5, (Math.random() * 2 - 1) * 2);
      t.add(leaf);
    }
    const x = (Math.random() * 2 - 1) * (ROOM.x - 5), z = (Math.random() * 2 - 1) * (ROOM.z - 5);
    if (Math.hypot(x, z - 50) < 7) continue;
    t.position.set(x, 0, z); scene.add(t);
    blockers.push({ x, z, r: 1.4 });
  }
})();

// a canvas tent near each camp (also blocks sight)
function makeTent(x, z) {
  const g = new THREE.Group();
  const canvas = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 4), toonMat(0x3a4a6a));
  canvas.rotation.y = Math.PI / 4; canvas.position.y = 1.5; g.add(canvas);
  const door = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4), toonMat(0x11161f));
  door.rotation.y = Math.PI / 4; door.position.set(0, 0.8, 1.6); g.add(door);
  addOutline(g, 1.04);
  g.position.set(x, 0, z); scene.add(g);
  blockers.push({ x, z, r: 2.0 });
  return g;
}

// ---------- Netherite spider (player) ----------
function makeLimb(sx, sy, sz, ex, ey, ez, thick, mat) {
  const s = new THREE.Vector3(sx, sy, sz), e = new THREE.Vector3(ex, ey, ez);
  const dir = new THREE.Vector3().subVectors(e, s);
  const box = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, dir.length()), mat);
  box.position.copy(s).addScaledVector(dir, 0.5);
  box.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  return box;
}
function makeSpider() {
  const g = new THREE.Group();
  const body = toonMat(C.spider);
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.spiderEye });
  const bodyY = 1.6;
  const abd = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 2.1), body); abd.position.set(0, bodyY + 0.15, 0.9); abd.rotation.x = -0.12; g.add(abd);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 1.25), body); head.position.set(0, bodyY, -0.75); g.add(head);
  for (const [ex, ey] of [[-0.32, 0.18], [0.32, 0.18], [-0.15, -0.05], [0.15, -0.05]]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.08), eyeMat); e.position.set(ex, bodyY + ey, -1.4); g.add(e);
  }
  g.legGroups = [];
  const az4 = [-1.1, -0.35, 0.45, 1.3];
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    const pv = new THREE.Group(); g.add(pv);
    // longer, taller, spindlier legs: high knee then a long reach to the floor
    const az = az4[i];
    const kx = side * 3.1, ky = bodyY + 1.6, kz = az + side * 0.15;   // knee, higher & wider
    const fx = side * 4.7, fy = 0.05, fz = az + side * 0.35;           // foot, far out
    pv.add(makeLimb(side * 0.7, bodyY + 0.2, az, kx, ky, kz, 0.24, body));
    pv.add(makeLimb(kx, ky, kz, fx, fy, fz, 0.18, body));
    g.legGroups.push({ pivot: pv, phase: i * 0.8 + (side > 0 ? Math.PI : 0) });
  }
  // the front pair (i = 0) stays visible even in first person, like forelegs in view
  g.frontPivots = [g.legGroups[0].pivot, g.legGroups[1].pivot];
  scene.add(g); return g;
}

// ---------- Vision fan (flat on the ground) ----------
function makeFan(R, H) {
  const seg = 26, verts = [0, 0.08, 0], idx = [];
  for (let i = 0; i <= seg; i++) { const a = -H + 2 * H * (i / seg); verts.push(Math.sin(a) * R, 0.08, Math.cos(a) * R); }
  for (let i = 1; i <= seg; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx);
  const m = new THREE.MeshBasicMaterial({ color: C.cone, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
  return new THREE.Mesh(g, m);
}

// ---------- Camper ----------
function makeHuman() {
  const g = new THREE.Group();
  const col = C.cloth[(Math.random() * C.cloth.length) | 0];
  const skin = toonMat(C.skin), cloth = toonMat(col), dark = toonMat(0x14161f);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), cloth); torso.position.y = 1.3; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin); head.position.y = 2.1; g.add(head);
  for (const sx of [-0.22, 0.22]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.28), dark); l.position.set(sx, 0.45, 0); g.add(l); }
  for (const sx of [-0.52, 0.52]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.22), cloth); a.position.set(sx, 1.35, 0); g.add(a); }
  // eyes (front = -z of body, but fan points +z, so face +z: put eyes on +z)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat); e.position.set(sx, 2.14, 0.29); g.add(e); }
  addOutline(g, 1.08);
  // stationary camper that does small idle activities, facing stays mostly fixed (no spinning)
  g.userData = { alive: true, home: new THREE.Vector3(), heading: 0, targetHeading: 0, moving: false, idle: 1 + Math.random() * 3 };
  scene.add(g); return g;
}
function makeCampfire(x, z) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const log = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.2), toonMat(0x3a2a20)); log.position.y = 0.1; log.rotation.y = i * 0.8; g.add(log); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 6), new THREE.MeshBasicMaterial({ color: C.fire })); flame.position.y = 0.7; g.add(flame);
  const light = new THREE.PointLight(C.fire, 1.1, 18); light.position.set(0, 1.2, 0); g.add(light);
  g.userData = { flame, light }; g.position.set(x, 0, z); scene.add(g); return g;
}

// ---------- Spawn ----------
const start = new THREE.Vector3(0, 0, 50);
function randSpot(minFromStart, others, minFromOthers) {
  for (let t = 0; t < 60; t++) {
    const x = (Math.random() * 2 - 1) * (ROOM.x - 6), z = (Math.random() * 2 - 1) * (ROOM.z - 6);
    if (Math.hypot(x - start.x, z - start.z) < minFromStart) continue;
    let ok = true;
    for (const o of others) if (Math.hypot(x - o.position.x, z - o.position.z) < minFromOthers) { ok = false; break; }
    if (ok) return { x, z };
  }
  return { x: 0, z: 0 };
}

const player = { pos: start.clone(), yaw: Math.PI, pitch: 0, hp: HP_MAX, pounceT: 0, pounceCd: 0 };
const playerSpider = makeSpider();
let humans = [], fires = [], tents = [], killed = 0, won = false, legPhase = 0, seen = false, hidden = false;
let caught = false, caughtT = 0;
let treeBlockerCount = -1;

function spawnLevel() {
  if (treeBlockerCount < 0) treeBlockerCount = blockers.length; // trees are permanent
  humans.forEach((h) => scene.remove(h)); fires.forEach((f) => scene.remove(f)); tents.forEach((t) => scene.remove(t));
  blockers.length = treeBlockerCount; // drop last level's tent blockers
  humans = []; fires = []; tents = []; killed = 0; won = false;
  for (let i = 0; i < HUMAN_COUNT; i++) {
    const s = randSpot(24, humans, 18);
    const h = makeHuman(); h.position.set(s.x, 0, s.z);
    const face = Math.random() * Math.PI * 2;
    h.userData.home.set(s.x, 0, s.z);
    h.userData.heading = face; h.userData.targetHeading = face; h.rotation.y = face;
    humans.push(h);
    const fx = s.x + Math.cos(face) * 2.4, fz = s.z + Math.sin(face) * 2.4;
    fires.push(makeCampfire(fx, fz));
    tents.push(makeTent(s.x - Math.cos(face) * 3, s.z - Math.sin(face) * 3));
  }
}
spawnLevel();

// ---------- Input ----------
const key = {};
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === ' ') { if (!e.repeat) pounce(); }
  else if (k === 'backspace') restartLevel();
  else if (k === 'v') firstPerson = !firstPerson;
  else if (k === 'c') { if (!e.repeat) sneakToggle = !sneakToggle; } // tap C to toggle sneak
  else key[k] = true;
});
let sneakToggle = false;
function isSneaking() { return key['shift'] || sneakToggle; }
addEventListener('keyup', (e) => { key[e.key.toLowerCase()] = false; });
canvas.addEventListener('click', () => { if (firstPerson) canvas.requestPointerLock(); });
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    player.yaw += e.movementX * MOUSE_SENS;
    player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch - e.movementY * MOUSE_SENS));
    // forelegs lean toward wherever the mouse is moving (both sides follow the screen)
    legAimX = Math.max(-0.75, Math.min(0.75, legAimX + e.movementX * 0.006));
    legAimY = Math.max(-0.75, Math.min(0.75, legAimY + e.movementY * 0.006));
  }
});
let legAimX = 0, legAimY = 0;
let firstPerson = true;
function pounce() { if (player.pounceCd <= 0) { player.pounceT = 0.3; player.pounceCd = 0.85; } }
function restartLevel() { caught = false; caughtT = 0; player.pos.copy(start); player.hp = HP_MAX; player.yaw = Math.PI; player.pitch = 0; banner(''); spawnLevel(); }

// ---------- Loop ----------
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  // CAUGHT: freeze the action, zoom out, then restart
  if (caught) {
    caughtT += dt;
    render();
    if (caughtT > 2.6) { restartLevel(); }
    requestAnimationFrame(tick); return;
  }
  legPhase += dt * 9;
  legAimX *= 0.86; legAimY *= 0.86;   // forelegs ease back to rest when the mouse stops
  if (player.pounceCd > 0) player.pounceCd -= dt;
  if (player.pounceT > 0) player.pounceT -= dt;
  if (!won) movePlayer(dt);
  updateHidden();
  updateHumans(dt);
  updateFires();
  render();
  requestAnimationFrame(tick);
}

function clampField(p) { const m = 2; p.x = Math.max(-ROOM.x + m, Math.min(ROOM.x - m, p.x)); p.z = Math.max(-ROOM.z + m, Math.min(ROOM.z - m, p.z)); }
function movePlayer(dt) {
  if (key['arrowleft']) player.yaw -= TURN * dt;
  if (key['arrowright']) player.yaw += TURN * dt;
  const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = -fz, rz = fx;
  let mx = 0, mz = 0;
  if (key['w'] || key['arrowup']) { mx += fx; mz += fz; }
  if (key['s'] || key['arrowdown']) { mx -= fx; mz -= fz; }
  if (key['d']) { mx += rx; mz += rz; }
  if (key['a']) { mx -= rx; mz -= rz; }
  if (mx || mz) { const L = Math.hypot(mx, mz); mx /= L; mz /= L; }
  let sp = isSneaking() ? SPEED * 0.45 : SPEED;
  if (player.pounceT > 0) { mx += fx; mz += fz; sp = POUNCE_SPEED; }
  player.pos.x += mx * sp * dt; player.pos.z += mz * sp * dt;
  clampField(player.pos);
}

function updateHidden() {
  hidden = false;
  for (const b of bushes) if (dist2(player.pos.x, player.pos.z, b.x, b.z) < (b.r * 0.9) ** 2) { hidden = true; break; }
}

function losBlocked(ax, az, bx, bz) {
  for (const b of bushes) if (segDist(ax, az, bx, bz, b.x, b.z) < b.r * 0.85) return true;
  for (const b of blockers) if (segDist(ax, az, bx, bz, b.x, b.z) < b.r) return true;
  return false;
}

const catchReach = () => (player.pounceT > 0 ? 3.6 : 2.2);

function updateHumans(dt) {
  seen = false;
  for (const h of humans) {
    const u = h.userData; if (!u.alive) continue;

    // --- idle activities: small moves around camp, slow turns, never spinning ---
    u.idle -= dt;
    if (!u.moving && u.idle <= 0) {
      if (Math.random() < 0.5) { // take a short stroll around camp
        const a = Math.random() * Math.PI * 2, rr = 1 + Math.random() * 2.4;
        u.tx = u.home.x + Math.cos(a) * rr; u.tz = u.home.z + Math.sin(a) * rr; u.moving = true;
      } else { // just look somewhere new (slow turn)
        u.targetHeading = Math.random() * Math.PI * 2; u.idle = 2.5 + Math.random() * 3;
      }
    }
    if (u.moving) {
      const tx = u.tx - h.position.x, tz = u.tz - h.position.z, dd = Math.hypot(tx, tz);
      if (dd < 0.2) { u.moving = false; u.idle = 2.5 + Math.random() * 3; }
      else { const sp2 = 1.7; h.position.x += (tx / dd) * sp2 * dt; h.position.z += (tz / dd) * sp2 * dt; u.targetHeading = Math.atan2(tx, tz); }
    }
    // ease the facing toward the target heading (slow, never a spin)
    let da = u.targetHeading - u.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    u.heading += da * Math.min(1, dt * 2.2);
    h.rotation.y = u.heading;
    h.position.y = Math.abs(Math.sin(legPhase * 1.5 + u.home.x)) * 0.04; // tiny idle bob

    // --- detection (big, invisible cone) ---
    const dx = player.pos.x - h.position.x, dz = player.pos.z - h.position.z, d = Math.hypot(dx, dz) || 1;
    const range = isSneaking() ? VISION_RANGE * 0.5 : VISION_RANGE;
    if (!hidden && d < range) {
      const fwdx = Math.sin(u.heading), fwdz = Math.cos(u.heading);
      const ang = Math.acos(THREE.MathUtils.clamp((dx / d) * fwdx + (dz / d) * fwdz, -1, 1));
      if (ang < VISION_HALF && !losBlocked(h.position.x, h.position.z, player.pos.x, player.pos.z)) {
        seen = true;
        if (!caught && !won) triggerCaught();
      }
    }
    // kill by pouncing within reach (only if not already caught)
    if (!caught && d < catchReach()) {
      u.alive = false; scene.remove(h);
      poof(h.position.x, h.position.z, 0xff6a6a);
      killed++;
      if (killed >= HUMAN_COUNT && !won) { won = true; banner('CAMP CLEARED.\nEvery camper, unseen.\n(Backspace to play again)'); }
    }
  }
}

function triggerCaught() {
  caught = true; caughtT = 0;
  banner('CAUGHT!\nA camper spotted you.\nRestarting...');
  if (document.exitPointerLock) document.exitPointerLock();
}

function updateFires() {
  const f = 0.8 + Math.sin(legPhase * 3) * 0.2 + Math.random() * 0.1;
  for (const c of fires) { c.userData.flame.scale.y = f; c.userData.light.intensity = 0.9 + f * 0.4; }
}

// ---------- fx ----------
function poof(x, z, color) {
  const n = 16, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = x; arr[i * 3 + 1] = 1.4; arr[i * 3 + 2] = z; }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.6, transparent: true, opacity: 1 }));
  const vel = []; for (let i = 0; i < n; i++) vel.push([(Math.random() * 2 - 1) * 5, Math.random() * 6 + 2, (Math.random() * 2 - 1) * 5]);
  scene.add(pts); let life = 0.7;
  (function anim() {
    const d = 0.016; life -= d; const pos = geo.attributes.position.array;
    for (let i = 0; i < n; i++) { pos[i * 3] += vel[i][0] * d; pos[i * 3 + 1] += vel[i][1] * d; pos[i * 3 + 2] += vel[i][2] * d; vel[i][1] -= 9 * d; }
    geo.attributes.position.needsUpdate = true; pts.material.opacity = Math.max(0, life / 0.7);
    if (life > 0) requestAnimationFrame(anim); else scene.remove(pts);
  })();
}

// ---------- Render ----------
function placeSpider(sp) {
  for (const lg of sp.legGroups) { lg.pivot.rotation.z = Math.sin(legPhase + lg.phase) * 0.06; lg.pivot.position.y = Math.sin(legPhase + lg.phase) * 0.05; }
  sp.position.y = Math.sin(legPhase) * 0.06;
}
function render() {
  playerSpider.position.set(player.pos.x, 0, player.pos.z);
  playerSpider.rotation.y = player.yaw;
  placeSpider(playerSpider);
  // show the whole spider in third-person or during the caught zoom-out; only forelegs in first person
  const showFull = !firstPerson || caught;
  playerSpider.visible = true;
  for (const ch of playerSpider.children) ch.visible = showFull;
  if (!showFull) {
    // forelegs lead the view: sweep forward into frame and tilt with where you look
    const fp = playerSpider.frontPivots;
    for (let i = 0; i < fp.length; i++) {
      const pv = fp[i];
      pv.visible = true;
      pv.rotation.y = (i === 0 ? -0.55 : 0.55) + legAimX;   // both lean toward mouse (left/right)
      pv.rotation.x = -player.pitch * 0.9 + legAimY;         // follow look + mouse (up/down)
    }
  } else {
    for (const pv of playerSpider.frontPivots) { pv.rotation.y = 0; pv.rotation.x = 0; }
  }

  const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  if (caught) {
    // freeze-frame: pull the camera up and back for a "you've been caught" reveal
    const t = Math.min(1, caughtT / 1.2);
    const target = new THREE.Vector3(player.pos.x + 3, 18 + 26 * t, player.pos.z + 16 + 14 * t);
    camera.position.lerp(target, 0.1);
    camera.lookAt(player.pos.x, 1.2, player.pos.z);
  } else if (firstPerson) {
    camera.position.set(player.pos.x + fx * 0.6, 2.3, player.pos.z + fz * 0.6);
    camera.lookAt(camera.position.x + fx * Math.cos(player.pitch), camera.position.y + Math.sin(player.pitch), camera.position.z + fz * Math.cos(player.pitch));
  } else {
    camera.position.set(player.pos.x - fx * 11, 8, player.pos.z - fz * 11);
    camera.lookAt(player.pos.x, 1.6, player.pos.z);
  }
  updateHud();
  renderer.render(scene, camera);
}

// ---------- HUD ----------
const hudEl = document.getElementById('hud');
const bannerEl = document.getElementById('banner');
const hpFill = document.getElementById('hpfill');
const hpText = document.getElementById('hptext');
function updateHud() {
  hudEl.textContent =
    `SPIDER HUNT  ·  stealth\n` +
    `Campers left: ${HUMAN_COUNT - killed} / ${HUMAN_COUNT}` +
    `${isSneaking() ? '    [SNEAKING]' : ''}${hidden ? '    [HIDDEN]' : ''}${seen ? '    ⚠ SPOTTED!' : ''}\n` +
    `WASD move · Shift/C sneak · SPACE pounce · V view`;
  if (hpFill) {
    const pct = Math.max(0, player.hp) / HP_MAX;
    hpFill.style.width = (pct * 100) + '%';
    hpFill.style.background = seen ? '#ff2a4d' : (pct > 0.4 ? '#00e5a0' : '#ffb020');
    if (hpText) hpText.textContent = seen ? 'SPOTTED — HIDE!' : 'HP';
  }
}
function banner(t) { bannerEl.textContent = t; bannerEl.style.opacity = t ? 1 : 0; }
let flashT = 0;
function flashScreen(color) { const f = document.getElementById('flash'); if (performance.now() - flashT < 120) return; flashT = performance.now(); f.style.background = color; f.style.opacity = 0.35; setTimeout(() => { f.style.opacity = 0; }, 160); }

requestAnimationFrame(tick);
