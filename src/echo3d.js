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
const VISION_RANGE = 17;
const VISION_HALF = (30 * Math.PI) / 180;
const HP_MAX = 100;
const HP_DRAIN = 70;                  // per second while seen
const HP_REGEN = 16;                  // per second while safe

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

// ---------- World: ground, grass, bushes (cover) ----------
const bushes = []; // {x, z, r}
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
  // bushes = hiding cover that blocks vision
  const bushMat = toonMat(C.bush);
  for (let k = 0; k < 60; k++) {
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
})();

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
  const fan = makeFan(VISION_RANGE, VISION_HALF); g.add(fan);
  g.userData = { fan, base: 0, scanAmp: 0.3 + Math.random() * 0.5, scanSpd: 0.4 + Math.random() * 0.6, phase: Math.random() * 6, alive: true };
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
let humans = [], fires = [], killed = 0, won = false, legPhase = 0, seen = false, hidden = false;

function spawnLevel() {
  humans.forEach((h) => scene.remove(h)); fires.forEach((f) => scene.remove(f));
  humans = []; fires = []; killed = 0; won = false;
  for (let i = 0; i < HUMAN_COUNT; i++) {
    const s = randSpot(20, humans, 16);
    const h = makeHuman(); h.position.set(s.x, 0, s.z);
    h.userData.base = Math.random() * Math.PI * 2;
    humans.push(h);
    const fx = s.x + Math.cos(h.userData.base + 0.4) * 2.2, fz = s.z + Math.sin(h.userData.base + 0.4) * 2.2;
    fires.push(makeCampfire(fx, fz));
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
  }
});
let firstPerson = true;
function pounce() { if (player.pounceCd <= 0) { player.pounceT = 0.3; player.pounceCd = 0.85; } }
function restartLevel() { player.pos.copy(start); player.hp = HP_MAX; player.yaw = Math.PI; banner(''); spawnLevel(); }
function softRestart() { // when seen: restart positions but keep nothing
  player.pos.copy(start); player.hp = HP_MAX; spawnLevel();
}

// ---------- Loop ----------
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  legPhase += dt * 9;
  if (player.pounceCd > 0) player.pounceCd -= dt;
  if (player.pounceT > 0) player.pounceT -= dt;
  if (!won) movePlayer(dt);
  updateHidden();
  updateHumans(dt);
  updateFires();
  updateHP(dt);
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
  return false;
}

const catchReach = () => (player.pounceT > 0 ? 3.6 : 2.2);

function updateHumans(dt) {
  seen = false;
  for (const h of humans) {
    const u = h.userData; if (!u.alive) continue;
    // scan: sweep the facing around the base heading
    const heading = u.base + Math.sin(legPhase * u.scanSpd + u.phase) * u.scanAmp;
    h.rotation.y = heading;
    // detection
    const dx = player.pos.x - h.position.x, dz = player.pos.z - h.position.z, d = Math.hypot(dx, dz) || 1;
    const range = isSneaking() ? VISION_RANGE * 0.5 : VISION_RANGE; // sneaking = much harder to spot
    let sees = false;
    if (!hidden && d < range) {
      const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      const ang = Math.acos(THREE.MathUtils.clamp((dx / d) * fwd.x + (dz / d) * fwd.z, -1, 1));
      if (ang < VISION_HALF && !losBlocked(h.position.x, h.position.z, player.pos.x, player.pos.z)) sees = true;
    }
    if (sees) seen = true;
    u.fan.material.opacity = sees ? 0.42 : 0.14;
    u.fan.material.color.setHex(sees ? 0xff0022 : C.cone);
    // kill by pouncing within reach
    if (d < catchReach()) {
      u.alive = false; scene.remove(h);
      poof(h.position.x, h.position.z, 0xff6a6a);
      killed++;
      if (killed >= HUMAN_COUNT && !won) { won = true; banner('CAMP CLEARED.\nEvery camper, unseen.\n(Backspace to play again)'); }
    }
  }
}

function updateHP(dt) {
  if (won) return;
  if (seen) { player.hp -= HP_DRAIN * dt; flashScreen('#ff0033'); }
  else player.hp = Math.min(HP_MAX, player.hp + HP_REGEN * dt);
  if (player.hp <= 0) { banner('SPOTTED!\nThe camp saw you — restarting.'); setTimeout(() => banner(''), 1200); softRestart(); }
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
  // first person: hide the body but keep the two front legs in view
  playerSpider.visible = true;
  for (const ch of playerSpider.children) ch.visible = !firstPerson;
  if (firstPerson) for (const pv of playerSpider.frontPivots) pv.visible = true;
  const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  if (firstPerson) {
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
