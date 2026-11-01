# ECHO — Game Design Doc

*The design bible. The live version lives as a Claude doc; this is the repo copy.*

## The pitch

**You are a creepy-cool anime spider who robs impossible places by stealing from the past.**

You crawl walls and ceilings to sneak through guarded rooms. But you don't just dodge guards — you **rewind time and change what happened**, so the present rearranges itself around you.

Take the key off the hook five seconds ago, and the locked door is already open now. Snatch the painting a guard always stops to admire, and his patrol route changes — he walks right past the spot you're hiding. Every room is a tiny time-travel puzzle: *what do I change in the past to make the present possible?*

The fresh combo nobody has quite nailed: **rewind + enemy memory + changing the past to reshape the future.** Most "rewind" games only let you undo mistakes. In Echo, rewinding is how you *solve* the level.

## The spider

The spider is the whole identity of the game — the logo, the thumbnail, the thing people recognize instantly.

- **Look:** creepy-cool, anime-styled. Sleek black body, glowing eyes (maybe one accent color — electric purple or teal), sharp elegant legs. Not a cute cartoon bug and not gross-realistic — something between a shadow and a ninja. Cool enough that a kid wants it on a hoodie.
- **Movement:** crawls on floors, walls, and ceilings freely. This is the part a normal thief game can't do, and it's why the rewind puzzles get interesting — you can hide *above* a guard.
- **Web-trails:** every path you crawl leaves a faint glowing thread for a moment. When you rewind, your old path lingers as a ghost-web. It looks beautiful and it's also a gameplay signal — you can see where "past you" went.
- **Signature move:** shoot a web-line to zip to a far wall or dangle from the ceiling to grab something below.

## How a level plays

One level is one guarded space — a vault, a museum wing, a lab. Your job: get the target and get out without being caught.

1. **Scout.** Crawl the walls and ceiling, watch the guards walk their routes, spot the cameras, lasers, and locked doors.
2. **Plan the theft.** Figure out what's in your way and what you'd need to change to clear it.
3. **Act in the present.** Grab stuff, trip something, get spotted — whatever happens.
4. **Rewind.** Pull time back a few seconds (or to a set "checkpoint" moment). Everything you did un-happens... except the knowledge you gained.
5. **Change the past.** This time, do it differently — take the object earlier, move something, be somewhere else — so the present comes out the way you need.
6. **Escape.** Reach the exit with the loot before the guards close in.

The tension: every rewind leaves a ghost-trail, and guards slowly learn your old routes. Rewind too much and you tangle yourself in your own web. So you can't just brute-force it — you have to be *clever*.

## The time mechanic (the heart of the game)

Rewinding doesn't just undo — it lets you **rewrite one moment**, and the whole room recalculates from there. Here are three puzzles that show the idea:

**Puzzle 1 — The locked door.** A guard holds the only key. In the present, the door is locked and he's standing in front of it. Rewind to before he picked up the key, crawl along the ceiling, and take it first. Now, in the present, the door was never locked — because the key was never there.

**Puzzle 2 — The patrol you can't pass.** A guard always pauses to look at a painting, which blocks the hallway at the exact wrong second. Rewind and steal the painting early. Now he has nothing to stop for, his timing shifts, and a gap opens in his route for you to slip through.

**Puzzle 3 — Fighting past you.** You grabbed the gem and ran, but tripped an alarm. Rewind. Now "past you" replays that exact run as a ghost — alarm and all — pulling every guard toward it. While they chase your ghost, the real you takes a calm path to the exit. You used your own mistake as bait.

That last one is the signature move, and it's incredibly clippable for YouTube: *"I let my past self get caught on purpose."*

> **Room 1 (built in this repo)** is a friendly first taste of the "past you helps you" idea: your echo holds a pressure plate so the real you can reach the gem behind a gate.

## Goals and levels

Each level is **both** a heist and a puzzle box, exactly like you wanted:

- **The heist layer:** there's a target to steal and an exit to reach. Stealth, timing, staying unseen.
- **The puzzle layer:** you literally cannot win by sneaking alone. At least one obstacle *requires* a rewind-and-change to get past. That's what makes every level a little brain-teaser instead of a reflex test.

Difficulty grows naturally:

- **Early levels:** one guard, one locked door, one rewind to figure out. Teaches the idea.
- **Mid levels:** cameras, lasers, two guards whose routes depend on each other, timed vaults.
- **Late levels:** multiple things you must change *in the right order*, and guards who've learned so many of your trails that the room is a minefield of your own ghosts.

A score or star rating (stole it clean? fewest rewinds? fastest time?) gives replay value and leaderboard potential later.

## Art and vibe

**Creepy-cool, anime-flavored, high contrast.** The goal is a thumbnail that stops the scroll.

- **Palette:** deep dark rooms (near-black, deep blue), lit by a few neon accents — the spider's glowing eyes, laser beams, web-trails. Darkness with pops of color reads great on a small YouTube thumbnail.
- **The ghost-trails:** glowing threads and a faint see-through "past you" are the signature visual. They make screenshots look like nothing else.
- **Mood:** tense and sneaky, with cool-not-scary menace. Think elegant assassin, not horror.
- **Anime touch:** sharp lighting, a little motion-blur on dashes, maybe a stylized eye-glint when you lock onto a target. A short slow-mo flourish on the rewind.

Logo idea: the spider silhouette where the web forms a little clock or rewind arrow — ties the two ideas together in one mark.

## How it makes money

Real talk: games rarely make money from day one, and that's fine — the point is to ship something real and build an audience. Here are the honest paths, easiest first:

- **itch.io — "pay what you want":* free to publish, people can tip or pay what they choose. Best first home for a browser game. Zero gatekeeping.
- **Your YouTube channel:** honestly the biggest near-term earner. Devlogs of building Echo + the game itself being clippable = views, and views are the engine for everything else.
- **Newgrounds / web portals:** some share ad revenue on web games.
- **Steam (later, bigger step):** costs a one-time ~$100 fee and needs a polished, finished game, but it's where paid indie games actually sell. A realistic *goal*, not a starting point.
- **Cosmetics / level packs (much later):** extra spider skins or bonus heist levels once there's an audience who wants more.

**The realistic money plan:** build it → release free on itch.io → make devlogs and clips for your channel → if people love it, polish it and put a price on it (itch or Steam). The channel and the game feed each other.

## Build plan (honest version)

**Full 3D anime spider is a huge project.** 3D models, animation, lighting, cameras — that's the kind of thing studios do with teams. If we start there, there's a real risk we never finish, and an unfinished game can't make money or get watched.

**The smart move: build the game in a shape we can actually finish, then make it fancier.** The time-rewrite mechanic is the special part — and that works in *any* art style. So:

- **Version 1 (the one we build first):** a clean top-down or side view, simple but stylish spider, the full rewind-and-change mechanic working on 2–3 real levels. This is a *complete, playable, shareable game*. Phaser (which you already know) is perfect for it, or Godot.
- **Version 2:** polish the art toward that creepy-cool anime look — lighting, the glowing web-trails, better animation. Still 2D/2.5D, but it *looks* premium.
- **Version 3 (dream version):** real 3D in Godot, once the game is proven fun and you've leveled up. This is a real goal to work toward — just not level one.

The mechanic is what makes Echo special, not the polygon count. Let's get *that* fun first.

### Next steps

1. ✅ Engine chosen: **Phaser** for Version 1.
2. ✅ Repo set up with this doc as the design bible.
3. ✅ First playable room: the echo-holds-the-plate puzzle.
4. ✅ Add a guard with a vision cone (Version 1 is now 3D with a guard!).
5. ⬜ Build the "rewind to steal the key early" puzzle (Puzzle 1 above).
6. ⬜ Start the creepy-cool anime art pass (a properly modeled spider).
