# ECHO 🕷️

*A creepy-cool spider thief who robs impossible places by stealing from the past.*

You crawl a dark vault as a spider, sneak past a **guard with a vision cone**,
and use the **rewind** power: your past run becomes a glowing ghost (an *echo*)
that keeps replaying. Your echo can hold a pressure plate so the real you slips
through the gate to the gem.

This repo is **Version 1** — the start of the real game.

---

## ▶️ How to play

**Just open `index.html` in a web browser.** No install, no build.

> Double-click `index.html`, or right-click → Open With → your browser.

| Key | Action |
| --- | --- |
| **W A S D** or **Arrow keys** | Move the spider |
| **R** | Rewind — your run becomes an echo that replays |
| **Backspace** | Reset the room |

### The goal of Room 1
Steal the gold gem and bring it back to the glowing pad.

1. The gem sits behind a gate. The gate only opens while something holds the plate.
2. Walk onto the plate, press **R** — your past self freezes there, holding it.
3. The gate opens. Grab the gem and get back to the pad.
4. **Watch the guard.** Stay out of its red vision cone, or you get sent back to the start.

- **`index.html`** is the **3D version** (built with Three.js).
- **`game2d.html`** is the original 2D version (built with Phaser), kept as a simpler fallback.

Both load their engine from the internet the first time, so be online when you open them.

---

## 🗂️ What's in here

```
echo-game/
├── index.html      ← the 3D game (open this)
├── game2d.html     ← the original 2D version
├── src/
│   ├── echo3d.js   ← the 3D game (Three.js)
│   └── game.js     ← the 2D game (Phaser)
├── assets/         ← art & sound go here later
├── DESIGN.md       ← the design bible (what the full game is)
└── README.md       ← you are here
```

---

## 🧭 The plan

- **Version 1 (now):** real 3D, a guard with a vision cone, the rewind/echo mechanic. ← we are here
- **Version 2:** polish the look toward the creepy-cool anime style — a properly
  modeled spider, better lighting, glowing web-trails, more rooms and guards.
- **Version 3:** full depth in Godot once the game is proven fun.

See **DESIGN.md** for the full vision.

---

*Built with Claude Code. Part of the CrayzboutAI project series.*
