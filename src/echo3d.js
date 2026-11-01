/* ============================================================
   ECHO — Spider Hunt (3D, first person, anime toon style)

   You are a spider predator. Hunt the little people and critters
   to grow stronger — but bigger BEASTS roam the field and will
   hunt YOU. Eat enough prey and you grow powerful enough to turn
   the tables and hunt the beasts too.

   Controls:
     Click the screen .... lock the mouse to look around
     Mouse ............... look
     W / A / S / D ....... crawl (relative to where you look)
     Left / Right arrow .. turn
     SPACE ............... pounce! (a quick lunge to catch things)
     V ................... toggle first-person / see your spider
     Backspace ........... restart the hunt
   ============================================================ */

/* global THREE */

// ---------- Tunables ----------
const ROOM = { x: 30, z: 30 };
const SPEED = 9;
const TURN = 1.8;
const MOUSE_SENS = 0.0022;
const POUNCE_SPEED = 20;
const PREY_COUNT = 9;
const BEAST_COUNT = 2;

// ---------- Dark anime palette ----------
const C = {
  sky: 0x0d0b1f,        // deep night indigo
  fog: 0x14102a,
  ground: 0x1a2240,     // dark moonlit grass
  ground2: 0x141a33,
  spider: 0x1a1720,
  spiderEye: 0xff5a1f,  // glowing red-orange
  trunk: 0x2a2030,
  blossom: 0xb14dff,    // glowing violet blossoms
  rock: 0x2e3350,
  prey: [0x7fd8ff, 0xff8fd0, 0xffe07a, 0xb388ff, 0x8affc1], // glowy spirits
  beast: 0xff2e4d,
  beastEye: 0xffe14d,
  petal: 0x9ad8ff,      // drifting glow-spores
  moon: 0xf4f0ff,
  outline: 0x05040a,
};

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.fog, 26, 78);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const canvas = renderer.domElement;
document.getElementById('game').appendChild(canvas);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights (moonlit toon) ----------
scene.add(new THREE.HemisphereLight(0x3a4a8f, 0x0a0a14, 0.55)); // cool sky / dark ground
const moonLight = new THREE.DirectionalLight(0xbcd0ff, 0.7);
moonLight.position.set(-14, 22, -8); scene.add(moonLight);
scene.add(new THREE.AmbientLight(0x222a44, 0.4));
// a magenta rim light for the anime glow
const rim = new THREE.PointLight(0xb14dff, 0.5, 70); rim.position.set(0, 10, 0); scene.add(rim);

// the moon + stars
(function sky() {
  const moon = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: C.moon }));
  moon.position.set(-30, 34, -55); moon.lookAt(0, 0, 0); scene.add(moon);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0xbfa8ff, transparent: true, opacity: 0.18 }));
  halo.position.copy(moon.position); halo.lookAt(0, 0, 0); scene.add(halo);
  const N = 400, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 120, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.5;
    p[i * 3] = Math.cos(th) * Math.sin(ph) * r;
    p[i * 3 + 1] = Math.cos(ph) * r + 10;
    p[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.7 })));
})();

// ---------- Toon material helper + outline ----------
function toonMat(color) { return new THREE.MeshToonMaterial({ color }); }
function addOutline(group, s = 1.08) {
  const mat = new THREE.MeshBasicMaterial({ color: C.outline, side: THREE.BackSide });
  const extra = [];
  group.children.forEach((ch) => {
    if (ch.isMesh && ch.geometry) {
      const o = new THREE.Mesh(ch.geometry, mat);
      o.position.copy(ch.position); o.quaternion.copy(ch.quaternion);
      o.scale.copy(ch.scale).multiplyScalar(s);
      extra.push(o);
    }
  });
  extra.forEach((o) => group.add(o));
}

// ---------- World: ground, trees, rocks, petals ----------
(function buildWorld() {
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.x * 2, 1, ROOM.z * 2),
    toonMat(C.ground)
  );
  ground.position.y = -0.5; scene.add(ground);

  // checkered toon patches for a stylised field
  for (let i = -ROOM.x; i < ROOM.x; i += 6) {
    for (let j = -ROOM.z; j < ROOM.z; j += 6) {
      if (((i + j) / 6) % 2 === 0) continue;
      const patch = new THREE.Mesh(new THREE.BoxGeometry(6, 1.02, 6), toonMat(C.ground2));
      patch.position.set(i + 3, -0.5, j + 3); scene.add(patch);
    }
  }

  // sakura trees
  function tree(x, z) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4, 0.8), toonMat(C.trunk));
    trunk.position.y = 2; t.add(trunk);
    const glowMat = new THREE.MeshBasicMaterial({ color: C.blossom });
    for (const [ox, oy, oz, s] of [[0, 4.4, 0, 2.4], [1.4, 3.8, 0.6, 1.6], [-1.2, 3.9, -0.8, 1.6], [0.4, 5.2, -1.2, 1.4]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), glowMat);
      b.position.set(ox, oy, oz); b.rotation.set(0.3, 0.5, 0.2); t.add(b);
    }
    addOutline(t, 1.05);
    t.position.set(x, 0, z); scene.add(t);
  }
  for (let k = 0; k < 10; k++) {
    tree((Math.random() * 2 - 1) * (ROOM.x - 4), (Math.random() * 2 - 1) * (ROOM.z - 4));
  }
  // rocks
  for (let k = 0; k < 8; k++) {
    const r = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), toonMat(C.rock));
    rock.rotation.set(0.2, Math.random() * 3, 0.1); r.add(rock);
    addOutline(r, 1.08);
    r.position.set((Math.random() * 2 - 1) * ROOM.x, 0.4, (Math.random() * 2 - 1) * ROOM.z);
    scene.add(r);
  }

  // drifting sakura petals
  const N = 260;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * ROOM.x;
    pos[i * 3 + 1] = Math.random() * 30;
    pos[i * 3 + 2] = (Math.random() * 2 - 1) * ROOM.z;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const petals = new THREE.Points(geo, new THREE.PointsMaterial({ color: C.petal, size: 0.4, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
  scene.add(petals);
  window.__petals = petals;
})();

// ---------- Netherite spider (the player) ----------
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
  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 2.1), body);
  abdomen.position.set(0, bodyY + 0.15, 0.9); abdomen.rotation.x = -0.12; g.add(abdomen);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 1.25), body);
  head.position.set(0, bodyY, -0.75); g.add(head);
  for (const [ex, ey] of [[-0.32, 0.18], [0.32, 0.18], [-0.15, -0.05], [0.15, -0.05]]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.08), eyeMat);
    eye.position.set(ex, bodyY + ey, -1.4); g.add(eye);
  }
  g.legGroups = [];
  const attachZ = [-1.0, -0.3, 0.5, 1.3];
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); g.add(pivot);
    const az = attachZ[i];
    const kx = side * 2.4, ky = bodyY + 1.0, kz = az + side * 0.1;
    const fx = side * 3.1, fz = az + side * 0.2;
    pivot.add(makeLimb(side * 0.7, bodyY + 0.2, az, kx, ky, kz, 0.26, body));
    pivot.add(makeLimb(kx, ky, kz, fx, 0.05, fz, 0.2, body));
    g.legGroups.push({ pivot, phase: i * 0.8 + (side > 0 ? Math.PI : 0) });
  }
  scene.add(g);
  return g;
}

// ---------- Prey (little people + critters) ----------
function makePrey() {
  const g = new THREE.Group();
  const col = C.prey[(Math.random() * C.prey.length) | 0];
  const skin = toonMat(0xe8c6a0);
  const cloth = new THREE.MeshToonMaterial({ color: col, emissive: col, emissiveIntensity: 0.6 });
  const dark = toonMat(0x1d1f2e);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), cloth); torso.position.y = 1.2; g.add(torso);
  const headM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin); headM.position.y = 1.95; g.add(headM);
  for (const sx of [-0.18, 0.18]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.25), dark); l.position.set(sx, 0.4, 0); g.add(l); }
  for (const sx of [-0.45, 0.45]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.2), cloth); a.position.set(sx, 1.25, 0); g.add(a); }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222 });
  for (const sx of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), eyeMat); e.position.set(sx, 1.98, -0.26); g.add(e); }
  addOutline(g, 1.09);
  g.userData = { kind: 'prey', vx: 0, vz: 0, tx: 0, tz: 0, retarget: 0, flee: 0 };
  scene.add(g);
  return g;
}

// ---------- Beast (predator that hunts you) ----------
function makeBeast() {
  const g = new THREE.Group();
  const body = new THREE.MeshToonMaterial({ color: C.beast, emissive: 0x6a0012, emissiveIntensity: 0.5 });
  const dark = toonMat(0x4a0a16);
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.beastEye });
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 3.4), body); trunk.position.y = 2; g.add(trunk);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.4), body); head.position.set(0, 2.3, -2.2); g.add(head);
  // jaw + fangs
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.0), dark); jaw.position.set(0, 1.6, -2.4); g.add(jaw);
  for (const sx of [-0.4, 0.4]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), toonMat(0xffffff)); f.position.set(sx, 1.65, -2.9); g.add(f); }
  for (const sx of [-0.45, 0.45]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), eyeMat); e.position.set(sx, 2.6, -2.85); g.add(e); }
  for (const [sx, sz] of [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.0], [0.9, -1.0]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 0.5), dark); leg.position.set(sx, 1.0, sz); g.add(leg);
  }
  addOutline(g, 1.06);
  g.userData = { kind: 'beast', power: 2.4, tx: 0, tz: 0, retarget: 0, hitCd: 0, fleeing: false };
  scene.add(g);
  return g;
}

// ---------- Spawning ----------
const start = new THREE.Vector3(0, 0, 18);
function randSpot(minFromPlayer) {
  for (let t = 0; t < 30; t++) {
    const x = (Math.random() * 2 - 1) * (ROOM.x - 3);
    const z = (Math.random() * 2 - 1) * (ROOM.z - 3);
    if (Math.hypot(x - player.pos.x, z - player.pos.z) > minFromPlayer) return { x, z };
  }
  return { x: 0, z: 0 };
}

const player = { pos: start.clone(), yaw: 0, pitch: 0, health: 100, score: 0, power: 1, pounceT: 0, pounceCd: 0 };
const playerSpider = makeSpider();
let prey = [], beasts = [];
let firstPerson = true, legPhase = 0, danger = 0;

function spawnAll() {
  prey.forEach((p) => scene.remove(p)); beasts.forEach((b) => scene.remove(b));
  prey = []; beasts = [];
  for (let i = 0; i < PREY_COUNT; i++) { const p = makePrey(); const s = randSpot(8); p.position.set(s.x, 0, s.z); p.id = i * 1.7; prey.push(p); }
  for (let i = 0; i < BEAST_COUNT; i++) { const b = makeBeast(); const s = randSpot(22); b.position.set(s.x, 0, s.z); beasts.push(b); }
}
spawnAll();

// ---------- Input ----------
const keyDown = {};
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === ' ') { if (!e.repeat) pounce(); }
  else if (k === 'backspace') restart();
  else if (k === 'v') firstPerson = !firstPerson;
  else keyDown[k] = true;
});
window.addEventListener('keyup', (e) => { keyDown[e.key.toLowerCase()] = false; });
canvas.addEventListener('click', () => { if (firstPerson) canvas.requestPointerLock(); });
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    player.yaw += e.movementX * MOUSE_SENS;
    player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch - e.movementY * MOUSE_SENS));
  }
});

function pounce() { if (player.pounceCd <= 0) { player.pounceT = 0.28; player.pounceCd = 0.8; } }
function restart() {
  player.pos.copy(start); player.health = 100; player.score = 0; player.power = 1;
  banner(''); spawnAll();
}

// ---------- Update ----------
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  legPhase += dt * 9;
  if (player.pounceCd > 0) player.pounceCd -= dt;
  if (player.pounceT > 0) player.pounceT -= dt;
  danger = Math.max(0, danger - dt);

  movePlayer(dt);
  player.power = 1 + player.score * 0.2;
  updatePrey(dt);
  updateBeasts(dt);
  updatePetals(dt);
  render();
  requestAnimationFrame(tick);
}

function clampToField(p) {
  const m = 1.5;
  p.x = Math.max(-ROOM.x + m, Math.min(ROOM.x - m, p.x));
  p.z = Math.max(-ROOM.z + m, Math.min(ROOM.z - m, p.z));
}

function movePlayer(dt) {
  if (keyDown['arrowleft']) player.yaw -= TURN * dt;
  if (keyDown['arrowright']) player.yaw += TURN * dt;
  const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const rx = -fz, rz = fx;
  let mx = 0, mz = 0;
  if (keyDown['w'] || keyDown['arrowup']) { mx += fx; mz += fz; }
  if (keyDown['s'] || keyDown['arrowdown']) { mx -= fx; mz -= fz; }
  if (keyDown['d']) { mx += rx; mz += rz; }
  if (keyDown['a']) { mx -= rx; mz -= rz; }
  if (mx || mz) { const L = Math.hypot(mx, mz); mx /= L; mz /= L; }
  let sp = SPEED;
  if (player.pounceT > 0) { mx += fx; mz += fz; sp = POUNCE_SPEED; } // lunge forward
  player.pos.x += mx * sp * dt;
  player.pos.z += mz * sp * dt;
  clampToField(player.pos);
}

function wander(e, dt, speed) {
  const u = e.userData;
  u.retarget -= dt;
  if (u.retarget <= 0 || (u.tx === 0 && u.tz === 0)) {
    u.tx = (Math.random() * 2 - 1) * ROOM.x; u.tz = (Math.random() * 2 - 1) * ROOM.z;
    u.retarget = 2 + Math.random() * 3;
  }
  const dx = u.tx - e.position.x, dz = u.tz - e.position.z, d = Math.hypot(dx, dz) || 1;
  e.position.x += (dx / d) * speed * dt;
  e.position.z += (dz / d) * speed * dt;
  e.rotation.y = Math.atan2(dx, dz);
}

const catchReach = () => (player.pounceT > 0 ? 3.4 : 2.0);

function poof(x, z, color) {
  const n = 14, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = x; arr[i * 3 + 1] = 1.2; arr[i * 3 + 2] = z; }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.5, transparent: true, opacity: 1 }));
  const vels = []; for (let i = 0; i < n; i++) vels.push([(Math.random() * 2 - 1) * 4, Math.random() * 5 + 2, (Math.random() * 2 - 1) * 4]);
  scene.add(pts);
  let life = 0.6;
  const anim = () => {
    const d = 0.016; life -= d;
    const pos = geo.attributes.position.array;
    for (let i = 0; i < n; i++) { pos[i * 3] += vels[i][0] * d; pos[i * 3 + 1] += vels[i][1] * d; pos[i * 3 + 2] += vels[i][2] * d; vels[i][1] -= 9 * d; }
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = Math.max(0, life / 0.6);
    if (life > 0) requestAnimationFrame(anim); else scene.remove(pts);
  };
  anim();
}

function updatePrey(dt) {
  for (const p of prey) {
    const dx = player.pos.x - p.position.x, dz = player.pos.z - p.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 9) { // flee from the spider
      p.position.x -= (dx / d) * 6 * dt; p.position.z -= (dz / d) * 6 * dt;
      p.rotation.y = Math.atan2(-dx, -dz);
    } else {
      wander(p, dt, 2.5);
    }
    clampToField(p.position);
    // little hop
    p.position.y = Math.abs(Math.sin(legPhase * 1.5 + p.id)) * 0.12;
    if (d < catchReach()) { // caught!
      poof(p.position.x, p.position.z, 0xfff0a0);
      player.score += 1; player.health = Math.min(100, player.health + 12);
      const s = randSpot(10); p.position.set(s.x, 0, s.z);
    }
  }
}

function updateBeasts(dt) {
  for (const b of beasts) {
    const u = b.userData; u.hitCd -= dt;
    const dx = player.pos.x - b.position.x, dz = player.pos.z - b.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const outPowered = player.power >= u.power;
    if (outPowered && d < 22) {
      b.position.x -= (dx / d) * 7 * dt; b.position.z -= (dz / d) * 7 * dt;
      b.rotation.y = Math.atan2(-dx, -dz);
      if (d < catchReach() + 1) {
        poof(b.position.x, b.position.z, 0xffd14d);
        player.score += 4; player.health = Math.min(100, player.health + 25);
        const s = randSpot(24); b.position.set(s.x, 0, s.z);
      }
    } else if (!outPowered && d < 16) {
      b.position.x += (dx / d) * 6.5 * dt; b.position.z += (dz / d) * 6.5 * dt;
      b.rotation.y = Math.atan2(dx, dz);
      if (d < 3 && u.hitCd <= 0) {
        u.hitCd = 1; player.health -= 18; danger = 1; flashScreen('#ff0033');
        if (player.health <= 0) { player.health = 100; player.pos.copy(start); banner('DOWN!\nThe beast got you — back to the start.'); setTimeout(() => banner(''), 1400); }
      }
    } else {
      wander(b, dt, 3);
    }
    clampToField(b.position);
    b.position.y = Math.sin(legPhase * 1.2) * 0.1;
  }
}

function updatePetals(dt) {
  const p = window.__petals; if (!p) return;
  const pos = p.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] -= 2 * dt; pos[i] += Math.sin(legPhase + i) * 0.01;
    if (pos[i + 1] < 0) pos[i + 1] = 30;
  }
  p.geometry.attributes.position.needsUpdate = true;
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
  // hide your own spider in first person so the camera doesn't clip through it
  playerSpider.visible = !firstPerson;

  const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  if (firstPerson) {
    camera.position.set(player.pos.x + fx * 0.6, 2.3, player.pos.z + fz * 0.6);
    camera.lookAt(
      camera.position.x + fx * Math.cos(player.pitch),
      camera.position.y + Math.sin(player.pitch),
      camera.position.z + fz * Math.cos(player.pitch)
    );
  } else {
    camera.position.set(player.pos.x - fx * 10, 7, player.pos.z - fz * 10);
    camera.lookAt(player.pos.x, 1.6, player.pos.z);
  }
  updateHud();
  renderer.render(scene, camera);
}

// ---------- HUD ----------
const hudEl = document.getElementById('hud');
const bannerEl = document.getElementById('banner');
function bar(v, max, w) { const n = Math.round((v / max) * w); return '█'.repeat(Math.max(0, n)) + '░'.repeat(Math.max(0, w - n)); }
function updateHud() {
  const strong = player.power >= 2.4;
  hudEl.textContent =
    `SPIDER HUNT\n` +
    `HP   ${bar(player.health, 100, 14)} ${Math.max(0, player.health | 0)}\n` +
    `Prey hunted: ${player.score}    Power: ${player.power.toFixed(1)}${strong ? '  (you can hunt the beasts!)' : ''}\n` +
    `${danger > 0 ? '⚠ A BEAST IS HUNTING YOU\n' : ''}` +
    `Click to look · WASD move · SPACE pounce · V view`;
}
function banner(t) { bannerEl.textContent = t; bannerEl.style.opacity = t ? 1 : 0; }
function flashScreen(color) { const f = document.getElementById('flash'); f.style.background = color; f.style.opacity = 0.45; setTimeout(() => { f.style.opacity = 0; }, 180); }

requestAnimationFrame(tick);
