/* ============================================================
   ECHO 3D — a spider thief who steals from the past
   Version 1 (3D), Room 1: "The Echo"

   Real 3D, built with Three.js. You crawl a dark vault as a
   spider, sneak past a GUARD with a vision cone, and use the
   REWIND power: your past run becomes a glowing echo that keeps
   replaying — and your echo can hold the pressure plate so the
   real you slips through the gate to the gem.

   Controls:
     W A S D / Arrows ... move the spider
     R .................. rewind (your run becomes an echo)
     Backspace .......... reset the room
   ============================================================ */

/* global THREE */

// ---------- Tunables ----------
const ROOM = { x: 18, z: 12 };      // half-extents of the floor
const SPEED = 9;                    // spider speed (units/sec)
const MAX_ECHOES = 4;
const GUARD_RANGE = 11;             // how far the guard can see
const GUARD_FOV = (55 * Math.PI) / 180; // half-angle of the vision cone

// ---------- Colours ----------
const C = {
  bg: 0x07070f,
  floor: 0x12122a,
  wall: 0x1c1c38,
  spider: 0x05060d,
  playerEye: 0x00e5ff,   // teal = the real you
  echoEye: 0xb14dff,     // purple = your ghosts
  guard: 0x2a0d14,
  guardEye: 0xff2d55,
  cone: 0xff3366,
  plateOff: 0x5a1038,
  plateOn: 0x00ff9d,
  gate: 0xff3366,
  gem: 0xffcf3f,
  exit: 0x1b3a6a,
};

// ---------- Scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.Fog(C.bg, 24, 60);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game').appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Lights (dark room, neon pops) ----------
scene.add(new THREE.AmbientLight(0x4466aa, 0.35));
const key = new THREE.DirectionalLight(0x88aaff, 0.5);
key.position.set(10, 20, 10);
scene.add(key);
const glow1 = new THREE.PointLight(0x00e5ff, 0.6, 40); glow1.position.set(-12, 6, 8); scene.add(glow1);
const glow2 = new THREE.PointLight(0xb14dff, 0.5, 40); glow2.position.set(13, 6, -8); scene.add(glow2);

// ---------- Room ----------
function buildRoom() {
  const floorMat = new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.9, metalness: 0.1 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM.x * 2, 1, ROOM.z * 2), floorMat);
  floor.position.y = -0.5;
  scene.add(floor);

  // grid lines for depth
  const grid = new THREE.GridHelper(ROOM.x * 2, 24, 0x2a2a55, 0x1a1a3a);
  grid.position.y = 0.02;
  scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({ color: C.wall, roughness: 1 });
  const wh = 3; // wall height
  const walls = [
    [ROOM.x * 2, wh, 0.6, 0, wh / 2, -ROOM.z], // back
    [ROOM.x * 2, wh, 0.6, 0, wh / 2, ROOM.z],  // front
    [0.6, wh, ROOM.z * 2, -ROOM.x, wh / 2, 0], // left
    [0.6, wh, ROOM.z * 2, ROOM.x, wh / 2, 0],  // right
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    scene.add(m);
  }
}
buildRoom();

// ---------- Spider factory ----------
function makeSpider(eyeColor, alpha) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: C.spider, roughness: 0.5, metalness: 0.3,
    transparent: alpha < 1, opacity: alpha,
  });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), bodyMat);
  abdomen.scale.set(1, 0.7, 1.2); abdomen.position.set(0, 0.55, 0.3);
  g.add(abdomen);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), bodyMat);
  head.position.set(0, 0.5, -0.55);
  g.add(head);

  // glowing eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor, transparent: alpha < 1, opacity: alpha });
  for (const sx of [-0.18, 0.18]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eye.position.set(sx, 0.6, -0.95);
    g.add(eye);
  }
  // a soft eye-glow sprite-ish ball
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10),
    new THREE.MeshBasicMaterial({ color: eyeColor, transparent: true, opacity: 0.18 * alpha }));
  glow.position.set(0, 0.6, -0.9);
  g.add(glow);

  // 8 legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x24244a, roughness: 0.8,
    transparent: alpha < 1, opacity: alpha });
  g.legs = [];
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 1.2, 6), legMat);
      const ang = (i - 1.5) * 0.5;
      leg.position.set(side * 0.6, 0.45, ang * 0.5);
      leg.rotation.z = side * (Math.PI / 2.6);
      leg.rotation.y = ang * 0.4;
      g.add(leg);
      g.legs.push({ mesh: leg, side, phase: i });
    }
  }
  // carried-gem sparkle (hidden until carrying)
  g.spark = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshBasicMaterial({ color: C.gem }));
  g.spark.position.set(0, 1.0, 0.3);
  g.spark.visible = false;
  g.add(g.spark);

  scene.add(g);
  return g;
}

// ---------- Puzzle objects ----------
const start = new THREE.Vector3(-14, 0, 9);

// plate (hold to open gate)
const plate = { x: -12, z: -7, half: 2.2, active: false };
const plateMesh = new THREE.Mesh(
  new THREE.BoxGeometry(plate.half * 2, 0.15, plate.half * 2),
  new THREE.MeshStandardMaterial({ color: C.plateOff, emissive: C.plateOff, emissiveIntensity: 0.3 })
);
plateMesh.position.set(plate.x, 0.08, plate.z);
scene.add(plateMesh);

// gate (a glowing barrier across the room)
const gate = { x: 0, zMin: -2, zMax: 12, open: false };
const gateMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 2.4, gate.zMax - gate.zMin),
  new THREE.MeshStandardMaterial({ color: C.gate, emissive: C.gate, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
);
gateMesh.position.set(gate.x, 1.2, (gate.zMin + gate.zMax) / 2);
scene.add(gateMesh);

// gem (the loot)
const gem = { x: 13, z: -8, taken: false, r: 1.1 };
const gemMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.7),
  new THREE.MeshStandardMaterial({ color: C.gem, emissive: C.gem, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.2 })
);
gemMesh.position.set(gem.x, 1, gem.z);
scene.add(gemMesh);

// exit (glowing pad at start)
const exit = { x: start.x, z: start.z, r: 2.4 };
const exitMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(exit.r, exit.r, 0.1, 24),
  new THREE.MeshStandardMaterial({ color: C.exit, emissive: C.exit, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 })
);
exitMesh.position.set(exit.x, 0.06, exit.z);
scene.add(exitMesh);

// ---------- Guard + vision cone ----------
const guard = {
  group: new THREE.Group(),
  waypoints: [new THREE.Vector3(6, 0, -8), new THREE.Vector3(6, 0, 8)],
  target: 1,
  speed: 5,
  heading: 0,
};
(function buildGuard() {
  const mat = new THREE.MeshStandardMaterial({ color: C.guard, roughness: 0.6, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 2.2, 10), mat);
  body.position.y = 1.1; guard.group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), mat);
  head.position.y = 2.5; guard.group.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.guardEye });
  for (const sx of [-0.2, 0.2]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eye.position.set(sx, 2.55, -0.45); guard.group.add(eye);
  }

  // vision cone: apex at guard, opening forward (+z within the group)
  const range = GUARD_RANGE;
  const rad = Math.tan(GUARD_FOV) * range;
  const coneGeo = new THREE.ConeGeometry(rad, range, 24, 1, true);
  coneGeo.translate(0, -range / 2, 0);   // apex to origin
  coneGeo.rotateX(-Math.PI / 2);          // open along +z
  guard.coneMat = new THREE.MeshBasicMaterial({
    color: C.cone, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  });
  const cone = new THREE.Mesh(coneGeo, guard.coneMat);
  cone.position.y = 1.4;
  guard.group.add(cone);

  scene.add(guard.group);
})();

// ---------- Actors ----------
const player = { pos: start.clone(), carrying: false };
const playerSpider = makeSpider(C.playerEye, 1);
let echoes = [];     // { frames:[Vector3...], carryAt:index|null, i, spider }
let recording = [];
let runCount = 1;
let won = false, caught = 0;
let legPhase = 0;

// ---------- Input ----------
const keyDown = {};
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'r') rewind();
  else if (k === 'backspace') resetRoom();
  else keyDown[k] = true;
});
window.addEventListener('keyup', (e) => { keyDown[e.key.toLowerCase()] = false; });

function rewind() {
  if (won) return;
  if (recording.length > 10) {
    const spider = makeSpider(C.echoEye, 0.5);
    echoes.push({ frames: recording, i: 0, spider });
    if (echoes.length > MAX_ECHOES) {
      const old = echoes.shift();
      scene.remove(old.spider);
    }
  }
  recording = [];
  player.pos.copy(start);
  player.carrying = false;
  gem.taken = false;
  gemMesh.visible = true;
  runCount++;
  flashScreen('#7850ff');
}

function resetRoom() {
  for (const e of echoes) scene.remove(e.spider);
  echoes = [];
  recording = [];
  player.pos.copy(start);
  player.carrying = false;
  gem.taken = false;
  gemMesh.visible = true;
  runCount = 1; won = false;
  banner('');
}

// ---------- Helpers ----------
function onPlate(x, z) {
  return Math.abs(x - plate.x) < plate.half && Math.abs(z - plate.z) < plate.half;
}
function crossesGate(x, z) {
  return !gate.open && Math.abs(x - gate.x) < 0.9 && z > gate.zMin && z < gate.zMax;
}

// ---------- Update ----------
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  legPhase += dt * 8;

  if (!won) movePlayer(dt);
  recording.push(player.pos.clone());

  for (const e of echoes) if (e.i < e.frames.length - 1) e.i++;

  updatePuzzle();
  updateGuard(dt);
  render();
  requestAnimationFrame(tick);
}

function movePlayer(dt) {
  let vx = 0, vz = 0;
  if (keyDown['a'] || keyDown['arrowleft']) vx -= 1;
  if (keyDown['d'] || keyDown['arrowright']) vx += 1;
  if (keyDown['w'] || keyDown['arrowup']) vz -= 1;
  if (keyDown['s'] || keyDown['arrowdown']) vz += 1;
  if (vx || vz) {
    const L = Math.hypot(vx, vz); vx /= L; vz /= L;
    // face movement direction
    playerSpider.rotation.y = Math.atan2(vx, vz);
  }

  let nx = player.pos.x + vx * SPEED * dt;
  let nz = player.pos.z + vz * SPEED * dt;
  const m = 1;
  nx = Math.max(-ROOM.x + m, Math.min(ROOM.x - m, nx));
  nz = Math.max(-ROOM.z + m, Math.min(ROOM.z - m, nz));

  // gate blocks by axis
  if (crossesGate(nx, player.pos.z)) nx = player.pos.x;
  if (crossesGate(player.pos.x, nz)) nz = player.pos.z;
  if (crossesGate(nx, nz)) { nx = player.pos.x; nz = player.pos.z; }

  player.pos.x = nx; player.pos.z = nz;
}

function updatePuzzle() {
  let on = onPlate(player.pos.x, player.pos.z);
  for (const e of echoes) {
    const f = e.frames[e.i];
    if (f && onPlate(f.x, f.z)) { on = true; break; }
  }
  plate.active = on;
  gate.open = on;

  // plate + gate visuals
  plateMesh.material.color.setHex(on ? C.plateOn : C.plateOff);
  plateMesh.material.emissive.setHex(on ? C.plateOn : C.plateOff);
  plateMesh.material.emissiveIntensity = on ? 0.8 : 0.3;
  gateMesh.visible = !on;

  // gem spin + pickup
  gemMesh.rotation.y += 0.03;
  gemMesh.position.y = 1 + Math.sin(legPhase * 0.4) * 0.15;
  if (!gem.taken && dist2(player.pos.x, player.pos.z, gem.x, gem.z) < (1 + gem.r) ** 2) {
    gem.taken = true; player.carrying = true; gemMesh.visible = false;
    flashScreen('#ffcf3f');
  }
  playerSpider.spark.visible = player.carrying;

  // win
  if (player.carrying && !won && dist2(player.pos.x, player.pos.z, exit.x, exit.z) < exit.r ** 2) {
    won = true;
    banner('STOLEN.\nYou and your echo pulled it off.\n(Backspace to replay)');
    flashScreen('#00ff9d');
  }
}

function updateGuard(dt) {
  // patrol between waypoints
  const tgt = guard.waypoints[guard.target];
  const dir = new THREE.Vector3(tgt.x - guard.group.position.x, 0, tgt.z - guard.group.position.z);
  const d = dir.length();
  if (d < 0.3) {
    guard.target = (guard.target + 1) % guard.waypoints.length;
  } else {
    dir.normalize();
    guard.group.position.x += dir.x * guard.speed * dt;
    guard.group.position.z += dir.z * guard.speed * dt;
    guard.heading = Math.atan2(dir.x, dir.z);
    guard.group.rotation.y = guard.heading;
  }

  // vision check: is the real player inside the cone?
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
    caught++;
    flashScreen('#ff0033');
    player.pos.copy(start);   // caught: back to the start of the run (echoes stay)
    player.carrying = false;
    gem.taken = false; gemMesh.visible = true;
    recording = [];
  }
}

function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

// ---------- Render ----------
function placeSpider(spider, p) {
  spider.position.set(p.x, 0, p.z);
  for (const leg of spider.legs) {
    leg.mesh.rotation.x = Math.sin(legPhase + leg.phase) * 0.25;
  }
}
function render() {
  placeSpider(playerSpider, player.pos);
  for (const e of echoes) {
    const f = e.frames[e.i];
    if (f) { placeSpider(e.spider, f); e.spider.spark.visible = false; }
  }
  // follow camera (3/4 view that trails the spider)
  const camT = new THREE.Vector3(player.pos.x - 2, 16, player.pos.z + 15);
  camera.position.lerp(camT, 0.08);
  camera.lookAt(player.pos.x, 1, player.pos.z);

  updateHud();
  renderer.render(scene, camera);
}

// ---------- HUD ----------
const hudEl = document.getElementById('hud');
const bannerEl = document.getElementById('banner');
function updateHud() {
  hudEl.textContent =
    `ECHO 3D  ·  Room 1\nRun ${runCount}   Echoes ${echoes.length}/${MAX_ECHOES}   Caught ${caught}\nWASD move · R rewind · Backspace reset`;
}
function banner(t) { bannerEl.textContent = t; bannerEl.style.opacity = t ? 1 : 0; }
function flashScreen(color) {
  const f = document.getElementById('flash');
  f.style.background = color;
  f.style.opacity = 0.5;
  setTimeout(() => { f.style.opacity = 0; }, 180);
}

requestAnimationFrame(tick);
