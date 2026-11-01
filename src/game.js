/* ============================================================
   ECHO — a spider thief who steals from the past
   Version 1, Room 1: "The Echo"

   The mechanic: you record your movements. Press R to rewind —
   your run becomes a glowing ECHO of your past self that replays
   forever. Echoes can hold plates, so you cooperate with your
   own past to solve a room you could never beat alone.

   Controls:
     WASD / Arrow keys .... move the spider
     R .................... rewind (your run becomes an echo)
     Backspace ............ reset the whole room
   ============================================================ */

const W = 900;          // room width
const H = 600;          // room height
const SPEED = 230;      // spider move speed (pixels/sec)
const SPIDER_R = 14;    // spider body radius
const MAX_ECHOES = 4;   // how many past-selves you're allowed

// ---- Colours (creepy-cool anime palette) ----
const COL = {
  bg:        0x0a0a14,
  wall:      0x1b1b30,
  wallGlow:  0x2a2a4a,
  player:    0x05060d,
  playerEye: 0x00e5ff,   // teal = the real you
  echoEye:   0xb14dff,   // purple = your ghosts
  trail:     0x00e5ff,
  plateOff:  0x3a1030,
  plateOn:   0x00ff9d,
  gate:      0xff3366,
  gem:       0xffcf3f,
  text:      0xafc7ff,
};

class Room extends Phaser.Scene {
  constructor() { super('Room'); }

  create() {
    this.cameras.main.setBackgroundColor(COL.bg);

    // --- Room geometry ---
    this.start = { x: 110, y: H - 110 };

    // Pressure plate (hold it down to open the gate)
    this.plate = { x: 150, y: 130, w: 90, h: 90, active: false };

    // Gate blocks the only path to the gem
    this.gate = { x: 440, y: 180, w: 26, h: 260, open: false };

    // The gem (the loot) sits behind the gate
    this.gem = { x: 760, y: 150, taken: false, r: 16 };

    // The exit — get the gem back here to win
    this.exit = { x: 110, y: H - 110, r: 36 };

    // --- State ---
    this.player = { x: this.start.x, y: this.start.y, carrying: false };
    this.recording = [];      // current live run: array of {x,y,carrying}
    this.echoes = [];         // committed past-selves
    this.runCount = 1;
    this.won = false;
    this.legPhase = 0;

    // --- Graphics layers ---
    this.gTrail  = this.add.graphics();   // fading web-trails (drawn, never cleared fully)
    this.gWorld  = this.add.graphics();   // walls, plate, gate, gem, exit
    this.gActors = this.add.graphics();   // spiders (redrawn each frame)

    // --- Input ---
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      rewind: 'R', reset: 'BACKSPACE',
    });
    this.input.keyboard.on('keydown-R', () => this.rewind());
    this.input.keyboard.on('keydown-BACKSPACE', () => this.scene.restart());

    // --- HUD ---
    this.hud = this.add.text(16, 14, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#afc7ff',
    }).setDepth(10);

    this.banner = this.add.text(W / 2, H / 2, '', {
      fontFamily: 'monospace', fontSize: '34px', color: '#00ff9d',
      align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.hint = this.add.text(W / 2, H - 34,
      'The gate needs the plate held down. You can\'t hold it AND reach the gem...  press R and let your past self help.',
      { fontFamily: 'monospace', fontSize: '14px', color: '#6f7fb0' })
      .setOrigin(0.5).setDepth(10);
  }

  // Commit the current run as an echo, then rewind to the start.
  rewind() {
    if (this.won) return;
    if (this.recording.length > 8) {
      this.echoes.push({ frames: this.recording, i: 0 });
      if (this.echoes.length > MAX_ECHOES) this.echoes.shift();
    }
    this.recording = [];
    this.player.x = this.start.x;
    this.player.y = this.start.y;
    this.player.carrying = false;
    this.gem.taken = false;
    this.runCount++;
    this.flash();
  }

  flash() {
    this.cameras.main.flash(260, 120, 80, 255);
  }

  // Axis-aligned overlap of a point (with radius) against a rect
  inRect(px, py, r, rect) {
    return px + r > rect.x && px - r < rect.x + rect.w &&
           py + r > rect.y && py - r < rect.y + rect.h;
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.legPhase += delta * 0.02;

    if (!this.won) this.movePlayer(dt);

    // Record the live run
    this.recording.push({ x: this.player.x, y: this.player.y, carrying: this.player.carrying });

    // Advance echoes (they replay, then freeze on their last frame)
    for (const e of this.echoes) {
      if (e.i < e.frames.length - 1) e.i++;
    }

    this.updatePuzzle();
    this.draw();
    this.updateHud();
  }

  movePlayer(dt) {
    const k = this.keys;
    let vx = 0, vy = 0;
    if (k.left.isDown  || k.left2.isDown)  vx -= 1;
    if (k.right.isDown || k.right2.isDown) vx += 1;
    if (k.up.isDown    || k.up2.isDown)    vy -= 1;
    if (k.down.isDown  || k.down2.isDown)  vy += 1;

    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
    }

    const nx = this.player.x + vx * SPEED * dt;
    const ny = this.player.y + vy * SPEED * dt;

    // Walls (room bounds)
    const margin = SPIDER_R + 20;
    let fx = Phaser.Math.Clamp(nx, margin, W - margin);
    let fy = Phaser.Math.Clamp(ny, margin, H - margin);

    // Closed gate blocks movement
    if (!this.gate.open && this.inRect(fx, fy, SPIDER_R, this.gate)) {
      // stop at the gate: revert the axis that would cross it
      if (!this.inRect(this.player.x, fy, SPIDER_R, this.gate)) {
        // vertical move is fine, horizontal is not
        fx = this.player.x;
      } else if (!this.inRect(fx, this.player.y, SPIDER_R, this.gate)) {
        fy = this.player.y;
      } else {
        fx = this.player.x; fy = this.player.y;
      }
    }

    this.player.x = fx;
    this.player.y = fy;

    // Trail dab
    if (vx || vy) this.dab(fx, fy, COL.trail, 0.5);
  }

  updatePuzzle() {
    // Plate is active if the real player OR any echo stands on it
    let on = this.inRect(this.player.x, this.player.y, SPIDER_R, this.plate);
    for (const e of this.echoes) {
      const f = e.frames[e.i];
      if (f && this.inRect(f.x, f.y, SPIDER_R, this.plate)) { on = true; break; }
    }
    this.plate.active = on;
    this.gate.open = on;

    // Gem pickup (only the real spider can carry)
    if (!this.gem.taken &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gem.x, this.gem.y) < SPIDER_R + this.gem.r) {
      this.gem.taken = true;
      this.player.carrying = true;
      this.dab(this.gem.x, this.gem.y, COL.gem, 1);
    }

    // Win: carry the gem back to the exit
    if (this.player.carrying && !this.won &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exit.x, this.exit.y) < this.exit.r) {
      this.win();
    }
  }

  win() {
    this.won = true;
    this.banner.setText('STOLEN.\nYou and your echo pulled it off.\n\nBackspace to play again');
    this.cameras.main.flash(500, 0, 255, 150);
  }

  // ---------- Rendering ----------

  dab(x, y, color, alpha) {
    // a soft glowing dot that slowly fades (web-trail)
    this.gTrail.fillStyle(color, alpha * 0.5);
    this.gTrail.fillCircle(x, y, 5);
  }

  draw() {
    // Fade the trail layer a touch each frame for a glowing-decay look
    this.gTrail.fillStyle(COL.bg, 0.06);
    this.gTrail.fillRect(0, 0, W, H);

    const g = this.gWorld;
    g.clear();

    // Room border glow
    g.lineStyle(3, COL.wallGlow, 1);
    g.strokeRect(14, 14, W - 28, H - 28);
    g.lineStyle(1, COL.wall, 1);
    g.strokeRect(20, 20, W - 40, H - 40);

    // Exit (a dark web-draped doorway)
    g.fillStyle(0x101830, 1);
    g.fillCircle(this.exit.x, this.exit.y, this.exit.r);
    g.lineStyle(2, 0x2e4a7a, 0.9);
    g.strokeCircle(this.exit.x, this.exit.y, this.exit.r);
    g.lineStyle(1, 0x2e4a7a, 0.5);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      g.lineBetween(this.exit.x, this.exit.y,
        this.exit.x + Math.cos(ang) * this.exit.r,
        this.exit.y + Math.sin(ang) * this.exit.r);
    }

    // Pressure plate
    const p = this.plate;
    g.fillStyle(p.active ? COL.plateOn : COL.plateOff, p.active ? 0.35 : 0.5);
    g.fillRect(p.x, p.y, p.w, p.h);
    g.lineStyle(2, p.active ? COL.plateOn : 0x6a2a50, 1);
    g.strokeRect(p.x, p.y, p.w, p.h);
    g.lineBetween(p.x + 12, p.y + 12, p.x + p.w - 12, p.y + p.h - 12);
    g.lineBetween(p.x + p.w - 12, p.y + 12, p.x + 12, p.y + p.h - 12);

    // Gate
    const ga = this.gate;
    if (!ga.open) {
      g.fillStyle(COL.gate, 0.9);
      g.fillRect(ga.x, ga.y, ga.w, ga.h);
      g.lineStyle(2, 0xff6688, 1);
      g.strokeRect(ga.x, ga.y, ga.w, ga.h);
    } else {
      g.lineStyle(2, 0x00ff9d, 0.3);
      g.strokeRect(ga.x, ga.y, ga.w, ga.h);
    }

    // Gem
    if (!this.gem.taken) {
      const gx = this.gem.x, gy = this.gem.y, r = this.gem.r;
      const pulse = 0.6 + 0.4 * Math.sin(this.legPhase * 3);
      g.fillStyle(COL.gem, 0.2 * pulse);
      g.fillCircle(gx, gy, r + 10);
      g.fillStyle(COL.gem, 1);
      g.beginPath();
      g.moveTo(gx, gy - r);
      g.lineTo(gx + r, gy);
      g.lineTo(gx, gy + r);
      g.lineTo(gx - r, gy);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xfff3c0, 1);
      g.strokePath();
    }

    // Actors (echoes first, real spider on top)
    const a = this.gActors;
    a.clear();
    for (const e of this.echoes) {
      const f = e.frames[e.i];
      if (f) this.drawSpider(a, f.x, f.y, COL.echoEye, 0.55, f.carrying);
    }
    this.drawSpider(a, this.player.x, this.player.y, COL.playerEye, 1, this.player.carrying);
  }

  drawSpider(g, x, y, eyeColor, alpha, carrying) {
    const r = SPIDER_R;
    // legs
    g.lineStyle(2, COL.wallGlow, alpha);
    for (let i = 0; i < 4; i++) {
      const base = (i / 4) * Math.PI - Math.PI / 2;
      const wiggle = Math.sin(this.legPhase * 4 + i) * 0.18;
      for (const side of [1, -1]) {
        const ang = base * side + wiggle * side;
        const kx = x + Math.cos(ang) * r * 1.5;
        const ky = y + Math.sin(ang) * r * 1.5;
        g.lineBetween(x, y, kx, ky);
        g.lineBetween(kx, ky, kx + Math.cos(ang) * 6, ky + Math.sin(ang) * 6 + 4);
      }
    }
    // body
    g.fillStyle(COL.player, alpha);
    g.fillCircle(x, y, r);
    g.fillCircle(x, y - r * 0.7, r * 0.6);
    g.lineStyle(1.5, eyeColor, alpha * 0.5);
    g.strokeCircle(x, y, r);
    // glowing eyes
    g.fillStyle(eyeColor, alpha);
    g.fillCircle(x - 4, y - r * 0.7, 2.6);
    g.fillCircle(x + 4, y - r * 0.7, 2.6);
    g.fillStyle(eyeColor, alpha * 0.25);
    g.fillCircle(x, y - r * 0.7, 10);
    // carried gem sparkle
    if (carrying) {
      g.fillStyle(COL.gem, alpha);
      g.fillCircle(x, y + 2, 4);
      g.fillStyle(COL.gem, alpha * 0.3);
      g.fillCircle(x, y + 2, 9);
    }
  }

  updateHud() {
    this.hud.setText(
      `ECHO  ·  Room 1\n` +
      `Run ${this.runCount}   Echoes ${this.echoes.length}/${MAX_ECHOES}\n` +
      `[WASD] move   [R] rewind   [Backspace] reset`
    );
  }
}

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  scene: [Room],
  pixelArt: false,
  render: { antialias: true },
};

new Phaser.Game(config);
