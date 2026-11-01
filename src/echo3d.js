/* ============================================================
   ECHO 3D — a spider thief who steals from the past
   Version 1 (3D, FIRST PERSON), Room 1: "The Echo"

   You ARE the spider. Look around with the mouse (click the
   screen first), crawl with WASD, and use REWIND (R): your past
   run becomes a glowing ghost-spider that keeps replaying — and
   it can hold the pressure plate so the real you slips through
   the gate to the gem. Watch the guard's red vision cone.

   Controls:
     Click the screen .... lock the mouse so you can look around
     Mouse ............... look
     W / S ............... walk forward / back (where you look)
     A / D ............... step left / right
     Left / Right arrow .. turn
     R ................... rewind (your run becomes an echo)
     V ................... toggle first-person / look-at-yourself
     Backspace ........... reset the room
     Esc ................. release the mouse
   ============================================================ */

/* global THREE */

// ---------- Tunables ----------
const ROOM = { x: 18, z: 12 };
const SPEED = 8;
const TURN = 1.8;              // arrow-key turn speed (rad/sec)
const MOUSE_SENS = 0.0022;
const MAX_ECHOES = 4;
const GUARD_RANGE = 11;
const GUARD_FOV = (55 * Math.PI) / 180;

// ---------- Colours ----------
const C = {
  bg: 0x07070f,
  floor: 0x12122a,
  wall: 0x1c1c38,
  netherite: 0x2b2730,   // dark netherite body
  netherite2: 0x3a3340,  // lighter facets
  playerEye: 0xff5a1f,   // glowing red-orange eyes
  echoBody: 0x3a2a55,
  echoEye: 0xb14dff,     // purple ghost
  guard: 0x2a0d14,
  guardEye: 0xff2d55,
  cone: 0xff3366,
  plateOff: 0x5a1038,
  plateOn: 0x00ff9d,
  gate: 0xff3366,
  gem: 0xffcf3f,
  exit: 0x1b3a6a,
};

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.Fog(C.bg, 22, 58);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
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

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0x4466aa, 0.4));
const keyL = new THREE.DirectionalLight(0x88aaff, 0.5);
keyL.position.set(10, 20, 10); scene.add(keyL);
const g1 = new THREE.PointLight(0xff6a2a, 0.5, 40); g1.position.set(-12, 6, 8); scene.add(g1);
const g2 = new THREE.PointLight(0xb14dff, 0.4, 40); g2.position.set(13, 6, -8); scene.add(g2);

// ---------- Room ----------
(function buildRoom() {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.x * 2, 1, ROOM.z * 2),
    new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.95 })
  );
  floor.position.y = -0.5; scene.add(floor);

  const grid = new THREE.GridHelper(ROOM.x * 2, 24, 0x2a2a55, 0x1a1a3a);
  grid.position.y = 0.02; scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({ color: C.wall, roughness: 1 });
  const wh = 4;
  const walls = [
    [ROOM.x * 2, wh, 0.6, 0, wh / 2, -ROOM.z],
    [ROOM.x * 2, wh, 0.6, 0, wh / 2, ROOM.z],
    [0.6, wh, ROOM.z * 2, -ROOM.x, wh / 2, 0],
    [0.6, wh, ROOM.z * 2, ROOM.x, wh / 2, 0],
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z); scene.add(m);
  }
})();

// ---------- Netherite spider factory ----------
// A blocky, low-poly spider: angular body + 8 long splayed legs,
// glowing eyes. ghost=true makes a translucent purple echo.
function makeLimb(sx, sy, sz, ex, ey, ez, thick, mat) {
  const start = new THREE.Vector3(sx, sy, sz);
  const end = new THREE.Vector3(ex, ey, ez);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const box = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, len), mat);
  box.position.copy(start).addScaledVector(dir, 0.5);
  box.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  return box;
}

function makeSpider(ghost) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: ghost ? C.echoBody : C.netherite,
    roughness: 0.45, metalness: 0.55, flatShading: true,
    transparent: ghost, opacity: ghost ? 0.5 : 1,
  });
  const facetMat = new THREE.MeshStandardMaterial({
    color: ghost ? C.echoBody : C.netherite2,
    roughness: 0.4, metalness: 0.6, flatShading: true,
    transparent: ghost, opacity: ghost ? 0.5 : 1,
  });
  const eyeMat = new THREE.MeshBasicMaterial({
    color: ghost ? C.echoEye : C.playerEye,
    transparent: ghost, opacity: ghost ? 0.6 : 1,
  });

  const bodyY = 1.6; // body rides this high on its legs

  // abdomen (big rear block), slightly raised and angular
  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 2.1), bodyMat);
  abdomen.position.set(0, bodyY + 0.15, 0.9);
  abdomen.rotation.x = -0.12;
  g.add(abdomen);
  // a smaller facet block on top for the chiselled netherite look
  const hump = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.3), facetMat);
  hump.position.set(0, bodyY + 0.75, 0.9); hump.rotation.x = -0.12;
  g.add(hump);

  // cephalothorax (front/head block)
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 1.25), bodyMat);
  head.position.set(0, bodyY, -0.75);
  g.add(head);

  // glowing eyes — a cluster on the front face of the head
  const eyePositions = [
    [-0.32, bodyY + 0.18, -1.4], [0.32, bodyY + 0.18, -1.4],
    [-0.15, bodyY - 0.05, -1.42], [0.15, bodyY - 0.05, -1.42],
  ];
  for (const [ex, ey, ez] of eyePositions) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.08), eyeMat);
    eye.position.set(ex, ey, ez); g.add(eye);
  }
  // eye glow halo
  const halo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.1),
    new THREE.MeshBasicMaterial({ color: ghost ? C.echoEye : C.playerEye, transparent: true, opacity: 0.12 }));
  halo.position.set(0, bodyY + 0.06, -1.45); g.add(halo);

  // 8 legs — 4 per side, long and splayed: up to a high knee, then down to the floor
  const legMat = bodyMat;
  g.legGroups = [];
  const attachZ = [-1.0, -0.3, 0.5, 1.3];  // front -> back
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      g.add(pivot);
      const az = attachZ[i];
      const ax = side * 0.7;
      // knee: out and UP from the body
      const kx = side * 2.4, ky = bodyY + 1.0, kz = az + side * 0.1;
      // foot: further out and DOWN to the floor
      const fx = side * 3.1, fy = 0.05, fz = az + side * 0.2;
      const upper = makeLimb(ax, bodyY + 0.2, az, kx, ky, kz, 0.26, legMat);
      const lower = makeLimb(kx, ky, kz, fx, fy, fz, 0.2, legMat);
      pivot.add(upper); pivot.add(lower);
      g.legGroups.push({ pivot, phase: i * 0.8 + (side > 0 ? Math.PI : 0) });
    }
  }

  // carried-gem sparkle (shown when carrying)
  g.spark = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshBasicMaterial({ color: C.gem }));
  g.spark.position.set(0, bodyY + 1.3, 0.9);
  g.spark.visible = false; g.add(g.spark);

  scene.add(g);
  return g;
}

// ---------- Puzzle objects ----------
const start = new THREE.Vector3(-14, 0, 9);

const plate = { x: -12, z: -7, half: 2.4, active: false };
const plateMesh = new THREE.Mesh(
  new THREE.BoxGeometry(plate.half * 2, 0.15, plate.half * 2),
  new THREE.MeshStandardMaterial({ color: C.plateOff, emissive: C.plateOff, emissiveIntensity: 0.3 })
);
plateMesh.position.set(plate.x, 0.08, plate.z); scene.add(plateMesh);

const gate = { x: 0, zMin: -2, zMax: 12, open: false };
const gateMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 3, gate.zMax - gate.zMin),
  new THREE.MeshStandardMaterial({ color: C.gate, emissive: C.gate, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
);
gateMesh.position.set(gate.x, 1.5, (gate.zMin + gate.zMax) / 2); scene.add(gateMesh);

const gem = { x: 13, z: -8, taken: false, r: 1.3 };
const gemMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.8),
  new THREE.MeshStandardMaterial({ color: C.gem, emissive: C.gem, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.2 })
);
gemMesh.position.set(gem.x, 1.3, gem.z); scene.add(gemMesh);

const exit = { x: start.x, z: start.z, r: 2.6 };
const exitMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(exit.r, exit.r, 0.1, 24),
  new THREE.MeshStandardMaterial({ color: C.exit, emissive: C.exit, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 })
);
exitMesh.position.set(exit.x, 0.06, exit.z); scene.add(exitMesh);

// ---------- Guard + vision cone ----------
const guard = {
  group: new THREE.Group(),
  waypoints: [new THREE.Vector3(6, 0, -8), new THREE.Vector3(6, 0, 8)],
  target: 1, speed: 5, heading: 0,
};
(function buildGuard() {
  const mat = new THREE.MeshStandardMaterial({ color: C.guard, roughness: 0.6, metalness: 0.3, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2.6, 8), mat);
  body.position.y = 1.3; guard.group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  head.position.y = 3; guard.group.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.guardEye });
  for (const sx of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.08), eyeMat);
    eye.position.set(sx, 3.05, -0.5); guard.group.add(eye);
  }
  const range = GUARD_RANGE, rad = Math.tan(GUARD_FOV) * range;
  const coneGeo = new THREE.ConeGeometry(rad, range, 24, 1, true);
  coneGeo.translate(0, -range / 2, 0);
  coneGeo.rotateX(-Math.PI / 2);
  guard.coneMat = new THREE.MeshBasicMaterial({ color: C.cone, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(coneGeo, guard.coneMat);
  cone.position.y = 1.6; guard.group.add(cone);
  scene.add(guard.group);
})();

// ---------- Actors / state ----------
const player = { pos: start.clone(), carrying: false, yaw: 0, pitch: 0 };
const playerSpider = makeSpider(false);
let echoes = [];     // { frames:[{x,z,yaw}], i, spider }
let recording = [];
let runCount = 1;
let won = false, caught = 0;
let legPhase = 0;
let firstPerson = true;

// ---------- Input ----------
const keyDown = {};
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'r') rewind();
  else if (k === 'backspace') resetRoom();
  else if (k === 'v') firstPerson = !firstPerson;
  else keyDown[k] = true;
});
window.addEventListener('keyup', (e) => { keyDown[e.key.toLowerCase()] = false; });

// mouse look (pointer lock)
canvas.addEventListener('click', () => { if (firstPerson) canvas.requestPointerLock(); });
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    player.yaw += e.movementX * MOUSE_SENS;
    player.pitch -= e.movementY * MOUSE_SENS;
    player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch));
  }
});

function rewind() {
  if (won) return;
  if (recording.length > 10) {
    const spider = makeSpider(true);
    echoes.push({ frames: recording, i: 0, spider });
    if (echoes.length > MAX_ECHOES) scene.remove(echoes.shift().spider);
  }
  recording = [];
  player.pos.copy(start); player.carrying = false;
  gem.taken = false; gemMesh.visible = true;
  runCount++; flashScreen('#ff6a2a');
}

function resetRoom() {
  for (const e of echoes) scene.remove(e.spider);
  echoes = []; recording = [];
  player.pos.copy(start); player.carrying = false;
  gem.taken = false; gemMesh.visible = true;
  runCount = 1; won = false; banner('');
}

// ---------- Helpers ----------
function onPlate(x, z) { return Math.abs(x - plate.x) < plate.half && Math.abs(z - plate.z) < plate.half; }
function crossesGate(x, z) { return !gate.open && Math.abs(x - gate.x) < 0.9 && z > gate.zMin && z < gate.zMax; }
function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

// ---------- Loop ----------
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  legPhase += dt * 9;

  if (!won) movePlayer(dt);
  recording.push({ x: player.pos.x, z: player.pos.z, yaw: player.yaw });
  for (const e of echoes) if (e.i < e.frames.length - 1) e.i++;

  updatePuzzle();
  updateGuard(dt);
  render();
  requestAnimationFrame(tick);
}

function movePlayer(dt) {
  // arrow turn
  if (keyDown['arrowleft']) player.yaw -= TURN * dt;
  if (keyDown['arrowright']) player.yaw += TURN * dt;

  // forward (ground) + right vectors from yaw
  const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const rx = -fz, rz = fx;

  let mx = 0, mz = 0;
  if (keyDown['w'] || keyDown['arrowup']) { mx += fx; mz += fz; }
  if (keyDown['s'] || keyDown['arrowdown']) { mx -= fx; mz -= fz; }
  if (keyDown['d']) { mx += rx; mz += rz; }
  if (keyDown['a']) { mx -= rx; mz -= rz; }

  if (mx || mz) {
    const L = Math.hypot(mx, mz); mx /= L; mz /= L;
  }
  let nx = player.pos.x + mx * SPEED * dt;
  let nz = player.pos.z + mz * SPEED * dt;
  const m = 1.2;
  nx = Math.max(-ROOM.x + m, Math.min(ROOM.x - m, nx));
  nz = Math.max(-ROOM.z + m, Math.min(ROOM.z - m, nz));
  if (crossesGate(nx, player.pos.z)) nx = player.pos.x;
  if (crossesGate(player.pos.x, nz)) nz = player.pos.z;
  if (crossesGate(nx, nz)) { nx = player.pos.x; nz = player.pos.z; }
  player.pos.x = nx; player.pos.z = nz;
}

function updatePuzzle() {
  let on = onPlate(player.pos.x, player.pos.z);
  for (const e of echoes) { const f = e.frames[e.i]; if (f && onPlate(f.x, f.z)) { on = true; break; } }
  plate.active = on; gate.open = on;
  plateMesh.material.color.setHex(on ? C.plateOn : C.plateOff);
  plateMesh.material.emissive.setHex(on ? C.plateOn : C.plateOff);
  plateMesh.material.emissiveIntensity = on ? 0.8 : 0.3;
  gateMesh.visible = !on;

  gemMesh.rotation.y += 0.03;
  gemMesh.position.y = 1.3 + Math.sin(legPhase * 0.4) * 0.15;
  if (!gem.taken && dist2(player.pos.x, player.pos.z, gem.x, gem.z) < (1.2 + gem.r) ** 2) {
    gem.taken = true; player.carrying = true; gemMesh.visible = false; flashScreen('#ffcf3f');
  }
  playerSpider.spark.visible = player.carrying;

  if (player.carrying && !won && dist2(player.pos.x, player.pos.z, exit.x, exit.z) < exit.r ** 2) {
    won = true;
    banner('STOLEN.\nYou and your echo pulled it off.\n(Backspace to replay)');
    flashScreen('#00ff9d');
  }
}

function updateGuard(dt) {
  const tgt = guard.waypoints[guard.target];
  const dir = new THREE.Vector3(tgt.x - guard.group.position.x, 0, tgt.z - guard.group.position.z);
  const d = dir.length();
  if (d < 0.3) { guard.target = (guard.target + 1) % guard.waypoints.length; }
  else {
    dir.normalize();
    guard.group.position.x += dir.x * guard.speed * dt;
    guard.group.position.z += dir.z * guard.speed * dt;
    guard.heading = Math.atan2(dir.x, dir.z);
    guard.group.rotation.y = guard.heading;
  }

  const toP = new THREE.Vector3(player.pos.x - guard.group.position.x, 0, player.pos.z - guard.group.position.z);
  const dp = toP.length();
  let spotted = false;
  if (!won && dp < GUARD_RANGE) {
    const fwd = new THREE.Vector3(Math.sin(guard.heading), 0, Math.cos(guard.heading));
    const ang = Math.acos(THREE.MathUtils.clamp(toP.normalize().dot(fwd), -1, 1));
    if (ang < GUARD_FOV) spotted = true;
  }
  guard.coneMat.opacity = spotted ? 0.4 : 0.16;
  guard.coneMat.color.setHex(spotted ? 0xff0033 : C.cone);
  if (spotted) {
    caught++; flashScreen('#ff0033');
    player.pos.copy(start); player.carrying = false;
    gem.taken = false; gemMesh.visible = true; recording = [];
  }
}

// ---------- Render ----------
function placeSpider(spider, x, z, yaw) {
  spider.position.set(x, 0, z);
  spider.rotation.y = yaw;
  // gentle leg sway so it feels alive
  for (const lg of spider.legGroups) {
    lg.pivot.rotation.z = Math.sin(legPhase + lg.phase) * 0.06;
    lg.pivot.position.y = Math.sin(legPhase + lg.phase) * 0.05;
  }
  // body bob
  spider.position.y = Math.sin(legPhase * 1.0) * 0.06;
}

function render() {
  placeSpider(playerSpider, player.pos.x, player.pos.z, player.yaw);
  playerSpider.visible = !firstPerson || true; // keep visible; FP camera sits above head
  for (const e of echoes) {
    const f = e.frames[e.i];
    if (f) { placeSpider(e.spider, f.x, f.z, f.yaw); e.spider.spark.visible = false; }
  }

  const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  if (firstPerson) {
    // eyes of the spider: just above & slightly ahead of the head
    const eyeH = 2.3;
    camera.position.set(player.pos.x + fx * 0.5, eyeH, player.pos.z + fz * 0.5);
    const look = new THREE.Vector3(
      camera.position.x + fx * Math.cos(player.pitch),
      camera.position.y + Math.sin(player.pitch),
      camera.position.z + fz * Math.cos(player.pitch)
    );
    camera.lookAt(look);
  } else {
    // pull back to admire the spider
    camera.position.set(player.pos.x - fx * 9, 6, player.pos.z - fz * 9);
    camera.lookAt(player.pos.x, 1.6, player.pos.z);
  }

  updateHud();
  renderer.render(scene, camera);
}

// ---------- HUD ----------
const hudEl = document.getElementById('hud');
const bannerEl = document.getElementById('banner');
function updateHud() {
  hudEl.textContent =
    `ECHO 3D  ·  Room 1  ·  ${firstPerson ? 'first person' : 'look at yourself'}\n` +
    `Run ${runCount}   Echoes ${echoes.length}/${MAX_ECHOES}   Caught ${caught}\n` +
    `Click to look · WASD move · arrows turn · R rewind · V view`;
}
function banner(t) { bannerEl.textContent = t; bannerEl.style.opacity = t ? 1 : 0; }
function flashScreen(color) {
  const f = document.getElementById('flash');
  f.style.background = color; f.style.opacity = 0.5;
  setTimeout(() => { f.style.opacity = 0; }, 180);
}

requestAnimationFrame(tick);
