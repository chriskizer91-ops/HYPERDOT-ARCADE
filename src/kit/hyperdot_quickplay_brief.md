# Hyperdot Arcade — Quick-Play Cabinets: Build Brief

This brief lets a fresh conversation (or a helper agent) build the "arcade standards" for the Hyperdot Arcade without having seen any earlier work. Read it all once before writing code. The companion file **`hyperdot_cabinet_starter.html`** is a complete, working cabinet (a tiny demo game called STARCATCH) that already contains the house LED display, fonts, synth audio, music sequencer, input handling, phone layout and the arcade bridge. **Start every cabinet by copying it.**

---

## 1. The project in one paragraph

Hyperdot Arcade is a walkable, low-poly 3D arcade (one HTML page, WebGL). You stroll between cabinets, step up to one, and play the game on its screen. Every game in the arcade is a **dot-matrix / LED-matrix game**: the picture is a grid of round glowing dots, like a scoreboard or a pinball DMD, rendered through a WebGL "LED" shader with bloom. The centrepiece is the owner's own 3D pinball table, ULTRAMASSIVE. The video cabinets built so far are HYPERDOT (a 128×32 DMD shooter), REDLINE (LED racer), VOLTFIST (a 2D fighting game with skeletal-IK fighters), IRONHOWL (a top-down mech arena with per-dot lighting) and VOIDLANCE (a first-person space dogfight with a software 3D renderer). The arcade is also meant to be **an exploration of coding and animation styles**: some cabinets are super-classic monochrome DMD, some are full-colour LED sprite work, some are CPU software-3D, and some push per-dot rendering on the graphics card — but every one of them still reads as dots on a lit panel.

## 2. The bar

The owner's words: they want each game to *demonstrate coding sophistication*, the kind of work that makes another engineer ask "who made this?". Not rushed, not a template with a theme pasted on. Concretely, every cabinet must have:

- **A real physical or animation idea at its heart** (soft bodies, rim physics, rigid-body pins, lamp filament lag, squash-and-stretch…) — see each game's "the hard part" below. This is the point of the cabinet; spend the effort there.
- **Juice everywhere:** hit-stop on big moments, particles, flashes, screen shake (respect `prefers-reduced-motion`), score pop-ups, chase lights, satisfying sound on every action, a musical track per mode.
- **The full cabinet loop:** title screen with a self-playing **attract mode** (the game plays itself convincingly behind the logo), a how-to screen or on-screen hints, play, a results screen with score + tickets, high score saved in `localStorage`, pause, mute.
- **All input methods:** keyboard, mouse, touch (phone upright and sideways), gamepad. Physical games should feel natural with a mouse *drag/flick* and a touch *swipe*, and still be playable with keys/gamepad.
- **Self-contained, procedural, small:** one HTML file, no image or audio files, no libraries. Everything drawn by code, all sound synthesized. Typical size 60–200 KB. Google Fonts for the page chrome is the only network request, and the game must work if it fails.
- **Runs at 60 fps on an ordinary laptop** at the default resolution. Fixed 60 Hz simulation (already in the starter).
- **Tested** with screenshots of every screen and an automated soak (see §8) before handing over.

Write the code densely but readably: section banners, short comments on anything non-obvious (physics, maths, shader tricks). Avoid giant frameworks of your own; prefer clear functions over classes-for-everything.

## 3. The LED display (house style) — already in the starter

**How a frame is made.** The game draws into an offscreen canvas of `W×H` matrix pixels — either with the 2D context `g`, or by writing packed pixels into `RBUF` (a `Uint32Array` view of an `ImageData`, ABGR order, use `pack(r,g,b)`), then `commit()` copies `RBUF` onto the canvas. Text and HUD go on top through `g` with the bitmap fonts. `present()` uploads the canvas as a texture and runs the LED pass.

**The LED pass.** One fragment shader turns each matrix pixel into a round dot (`r≈.43` of the cell), with an "unlit dot" floor so dark areas still show the grid, a hot centre, and anti-aliased edges; then a two-level bloom (bright-pass → separable gaussian at ¼ and ⅛ resolution), ACES tonemap and a soft vignette. Bright colours bloom; pure black stays black.

**Three looks** (set `CAB.style`; preview any page with `?style=amber` or `?style=lamp`):

| style | what it is | use it for |
|---|---|---|
| `color` | full-colour LED | most cabinets |
| `amber` | classic 1990s pinball DMD: the game's colours are reduced to brightness and shown in 16 amber steps | anything that should feel vintage; draw in greys and let the shader tint it |
| `lamp` | big incandescent bulbs with a glass highlight | very low matrix sizes (e.g. 24×14) where each "dot" is a bulb |

**Resolution.** 16:9 matrices. The starter cycles `192×108 / 256×144 / 320×180` with the Dots chip; choose your own list in `CAB.res`. Wide DMD sizes like `256×64` also work (the layout letterboxes any aspect). Lower is more "dot-matrix", higher is more detail; pick per game, then design pixel art and fonts for that size.

**Fonts.** `txt5(g,s,x,y,col,scale,align,italic)` is 5×7, `txt3(...)` is 3×5, `otxt5/otxt3` add a 1-px outline. `col` can be a 7-entry array for a vertical gradient (`GR.volt`, `GR.cyan`, `GR.red`, `GR.green`, `GR.steel`, `GR.pink`, `GR.violet`). Supported characters: txt5 has A–Z, 0–9 and `! . , : - + ? ' / > < x` and space; txt3 adds `% # ( )`. Lowercase letters are drawn as capitals, except a lowercase `x`, which renders as ×. **Use no other characters** (no `&`, no `·`, no `%` in txt5).

**Drawing helpers** on `RBUF`: `clear`, `rect`, `px`, `addPx` (additive), `disc` (dithered soft edge), `glow` (additive radial light), `line`, and `BAY4` (a 4×4 Bayer matrix for ordered dithering). Ordered dithering between two tones is the signature way to show gradients on a dot grid; use it instead of smooth alpha.

**Going heavier: per-dot rendering on the GPU.** For a cabinet that renders its scene in a fragment shader (ray-marched SDF scene, fluids, reflections): render into a `W×H` framebuffer with your own shader, read it back with `gl.readPixels` into `RBUF` (at 256×144 that is ~150 KB and costs a millisecond or two), then continue with the normal `commit()` → HUD → `present()` path. This keeps the LED look and HUD identical across cabinets. Flip Y on readback (GL origin is bottom-left). Keep the shader's per-dot work generous — you have one invocation per dot, not per screen pixel, so you can afford far more than usual.

## 4. The arcade bridge (contract — do not change)

Each cabinet is a **complete HTML document** (with `<!doctype html>`, charset and viewport metas) because the arcade loads it as a separate file: `games/<id>.html`, inside an `<iframe>`, with `?embed=1`.

- In embed mode the page hides its top bar and key hints and the matrix fills the frame (the starter does this via `body.embed`).
- **Game → arcade** (`window.parent.postMessage`, all objects carry `src:'hyperdot'` and `id`):
  - `{type:'ready', title, w, h, tickets}` once booted
  - `{type:'score', score}` while playing (throttled, the starter's `ARC.score(s)`)
  - `{type:'over', score, tickets}` when a game ends (`ARC.over(score,tickets)`)
  - `{type:'exit'}` when the player backs out of the title screen with Esc / B (`ARC.exit()`)
- **Arcade → game** (`{src:'hyperdot-arcade', cmd}`): `start`, `pause`, `resume`, `attract`, `mute`, `unmute`. The starter wires these to `APP_start`, `setPause`, `APP_attract` and the master gain.
- Set `window.HYPERDOT_GAME = {id, title, tickets, version}`.
- The arcade may read your `#gl` canvas directly (same origin) to show live attract mode on the cabinet screen, so the title/attract screen should look great on its own.

**Tickets.** Arcade standards pay tickets into the arcade's prize counter. Aim for **3–40 tickets for a typical game, a rare jackpot of 100–500**. Show tickets spitting out on the results screen (a counter with a chattering sound). Tickets are reported once, in `ARC.over`.

**Storage keys** are namespaced `hd-<id>-…` (high score, resolution). Always go through the `store` helper (it survives private windows).

## 5. Controls & layout

- Keyboard: arrows/WASD to move, Space/Z/J = **A** (primary), Shift/X/K = **B** (secondary), Enter = start, Esc/P = pause.
- Mouse/touch on the matrix itself: `PTR` gives `x,y` in **matrix pixels**, `down`, and one-tick `pressed`/`released` flags. Build drags and flicks from it (track the last ~100 ms of samples for flick velocity).
- Phones: the starter shows a stick and A/B buttons under the matrix when held upright, and floating over the bottom corners when held sideways. For drag/flick games you can hide the stick (`$('stL').hidden=true`) and let players touch the matrix directly.
- Gamepad: left stick/d-pad move, A/RT primary, B/LT secondary, Start pause.
- Menus: arrows + Enter, mouse hover + click, or tap. Never require a keyboard.

## 6. Pitfalls already paid for (read these)

1. Any 2D canvas you read back every frame must be created with `getContext('2d',{willReadFrequently:true})`, otherwise a frame can cost 100–270 ms.
2. Keep everything inside one closure and **never declare two top-level functions with the same name** — the later one silently replaces the earlier one. (A HUD helper named `tri` once replaced the triangle rasterizer and every 3D mesh vanished.)
3. Quick key taps: keydown goes into `LATCH`, which is cleared **only after a simulation tick has run** (the starter's loop does this). Detect button *edges* per tick (`e.ok = c.ok && !prev.ok`).
4. CSS `display` rules beat the `hidden` attribute unless you keep `[hidden]{display:none!important}`.
5. `AudioContext` only starts after a user gesture: call `audioInit()` on the first pointer/key. Rate-limit SFX so 20 simultaneous impacts don't clip (starter does this).
6. When you sample a pre-baked buffer with a camera offset, keep the offset an **integer**.
7. Don't allocate in hot loops (60 Hz × hundreds of objects). Reuse arrays; avoid `filter/map` per particle per frame where it matters.
8. In headless test browsers (SwiftShader) `present()` is slow; measure `tick()` and `render()` time separately from `present()`.
9. Pointer coordinates must be converted through `RECT` (the starter's `toM`) — the matrix is letterboxed and scaled.
10. Text: only the glyphs listed in §3.

## 7. The cabinets

Each cabinet below names its **style tier** so the set covers the range: classic DMD, colour sprite/animation, CPU software 3D, GPU per-dot. Names are working titles (they avoid real trademarks such as Skee-Ball, Whac-A-Mole and Stacker). Adjust numbers freely; keep the hard part.

### 7.1 PLUSH PANIC — claw machine · tier: colour LED + soft-body physics · id `claw`

- **What you see:** the inside of a glass claw cabinet, side-on with depth: a heap of plushies in the pit, a prize chute in the front-left corner, chasing lights around the frame, the claw hanging from its gantry on a cable. A small top-down inset shows the claw's position over the pit so the player can judge depth.
- **Play:** 30-second timer per credit. Move the claw left/right then in/out (two phases, like the real machine — first press locks X, second locks Z, or hold-and-release), then it drops, closes, lifts and carries to the chute. 3 credits per game.
- **The hard part: plushies are soft bodies.** Each plush is a ring of 12–20 verlet points with distance constraints plus a pressure or shape-matching term so it squashes and recovers; ears/limbs as short chains. They pile, slump and tangle; the claw prongs are rigid capsules that collide with plush points; grip is a friction/clamp model with an honest "claw strength" that varies per credit (as real machines do — show a strength meter, so it never feels like cheating). A plush can slip out mid-carry, swing on the claw, or drag a neighbour along.
- **Characters:** 6–8 plush designs drawn from coloured shapes with faces (bear, bunny, octopus with tentacle chains, star, slime, cat), each with a rarity and ticket value. A rare golden plush = jackpot.
- **Juice:** cable sway, claw rattle, prize-chute fanfare, the plush bouncing out of the chute toward the player, a "WINNER" lamp sequence.
- **Tickets:** consolation 2–5 per credit; plush won = 15–60 by rarity; golden = 300.

### 7.2 RING ROLLER — alley roller (skee-style) · tier: CPU software 3D + amber DMD inset · id `roll`

- **What you see:** looking up an inclined lane from the player's end: the ramp hump, the ring targets (10–50) and the two 100 pockets in the top corners, under a **separate amber DMD score panel** drawn at the top of the matrix (hybrid style: colour 3D lane, classic DMD scoreboard).
- **Play:** 9 balls. Drag back and flick (mouse/touch) — direction = aim, speed = power, a curved flick adds spin. Keyboard: left/right aim, hold A to charge, release to roll; gamepad likewise.
- **The hard part: real ball physics.** A sphere rolling on an inclined plane with rolling friction, a parabolic hump that launches it, flight under gravity, collision with the ring lips (tori approximated as circles of segments) and the back wall, rattling around a ring before dropping into a pocket. Render with a small flat-shaded software rasterizer and z-buffer (or ray-cast the few primitives directly — the lane is simple). Ball rolling must *look* rolling: a texture/stripe on the ball rotating with travel.
- **Juice:** ball rumble sound tied to speed, the clack of the hump, ring "dunk", the DMD panel playing a short animation for each score (classic DMD style: chunky "40!" zooms, sparkles), a final-ball lamp chase.
- **Tickets:** score/30, plus bonus for 400+ and a jackpot for a perfect 900.

### 7.3 BUCKET BLITZ — basketball pop-a-shot · tier: classic amber DMD · id `hoops`

- **What you see:** a monochrome amber DMD (try `256×96` or `192×64`, `style:'amber'`): hoop, backboard, net, a shot clock and score in big DMD numerals. Everything drawn in 16 brightness levels, chunky and vintage.
- **Play:** 3 rounds (40 / 30 / 30 s). Flick the ball up (mouse/touch) or aim with left/right and time a power bar (keys/pad). Round 2 the hoop slides side to side; round 3 it moves faster and 3-pointers score double near the end ("HOT SHOT" last 10 s).
- **The hard part: rim, backboard and net physics in 2.5D.** The ball is a sphere moving in depth (perspective scaling on a DMD); the rim is a ring of collision points so shots can rattle, roll around the rim and drop or spin out; the backboard bounces; the **net is a verlet cloth** (a small grid of points) that the ball pushes through and that swishes afterwards.
- **DMD animation craft:** between rounds, play hand-crafted-feeling DMD cut-scenes like 1990s pinball — big dithered "ROUND 2" wipes, a cartoon ball with eyes, score tallies that count up. This is the cabinet that shows off *animation in the classic DMD idiom*.
- **Tickets:** baskets/3, bonus tiers at 40/60/80 baskets.

### 7.4 WHACK SHACK — whack-the-critter · tier: colour LED character animation · id `whack`

- **What you see:** a 3×3 field of burrows in a garden, critters popping up, a big padded mallet that follows the cursor and swings with a satisfying arc.
- **Play:** 45 seconds. Click/tap a critter, or map 1–9 / numpad / a 3×3 cursor with keys or stick. Kinds: normal (1 hit), helmet (2 hits, sparks), golden (fast, big points), bomb (don't hit it — it flashes red), and a king critter that appears in the last 10 s for a combo frenzy.
- **The hard part: character animation.** This cabinet demonstrates the classic principles — anticipation (a rustle and dirt puff before the pop), squash and stretch on the pop and the bonk, follow-through (ears and whiskers on springs), overshoot easing, a dizzy-stars stun, blinking and looking around while idle, distinct personalities per type. Critters are built from rigged shapes (body, head, ears, eyes, mouth) with procedural poses, not flipbooks. The mallet has motion blur smears and a cartoon impact frame (a one-frame white silhouette + hit-stop).
- **Juice:** combo meter, escalating pitch on consecutive hits, critters laughing when missed, dirt clods and stars as particles.
- **Tickets:** score/250, bonus for 10+ combos.

### 7.5 SKY STACK — the stacking prize game · tier: lamp matrix · id `stack`

- **What you see:** a tall tower of **big incandescent lamps** (`style:'lamp'`, a low matrix such as `28×16`), a row of lit blocks sliding back and forth, the "MINOR PRIZE" line two-thirds up and the "MAJOR PRIZE" line at the top, and a chasing-light marquee frame. Use a second small amber area or the frame lamps for messages (text needs pixels — design for the low resolution, use 3×5 glyphs scaled or lamp patterns).
- **Play:** one button. Stop the moving row so it lands on the row below; overhanging lamps fall off (animate them dropping and going dark); the row speeds up as you climb. Reaching the minor line offers *take the minor prize or keep going*.
- **The hard part: lamp physics, not pixels.** Simulate each bulb's filament: brightness follows the drive signal with a warm-up and cool-down lag (first-order thermal model, faster up than down), colour temperature shifts from dim orange to warm white with brightness, and a faint afterglow when a bulb switches off. Chase patterns on the frame (marquee runners, bounce, sparkle). This is the cabinet that shows *the beauty of the hardware itself*.
- **Tickets:** 5 per row reached, minor prize 60, major prize 500.

### 7.6 STRIKE NIGHT — bowling · tier: GPU per-dot rendering · id `bowl`

- **What you see:** a glossy oiled lane under blacklight, seen from behind the bowler: reflections of the pins and the lane lights in the lane surface, the pin deck, gutters, the ball's swirl pattern. Rendered **per dot on the GPU** (ray-marched signed-distance scene or analytic ray tracing of planes, spheres and capsule-stack pins) at the matrix resolution, then shown through the LED pass (see §3, "Going heavier").
- **Play:** a full 10-frame game with correct scoring (strikes, spares, the 10th frame bonus balls). Position left/right, then aim and power with a drag-and-release (or a swinging arrow + power bar on keys/pad); a sideways component on release adds hook spin that curves the ball late.
- **The hard part: 10 rigid-body pins.** Pins as capsule stacks with mass and inertia, ball–pin and pin–pin impulses, pins toppling, sliding, spinning and bouncing off the side walls; realistic pin action (the 7-10 split should be possible). The physics runs on the CPU at 120–240 Hz substeps; the GPU only draws. Pinsetter sweep animation between balls.
- **Classic DMD moment:** strikes, spares, turkeys and gutter balls trigger short **amber DMD cartoon animations** across the top band (the bowling-alley tradition), switching style for a beat.
- **Tickets:** score/10, jackpot for 200+, and a big one for a perfect 300.

### 7.7 COIN CASCADE — coin pusher · tier: CPU mass simulation · id `pusher`

- **What you see:** a three-quarter view of the pusher shelves heaped with coins, the sliding pusher, the drop edge, prize tokens and a bonus wheel.
- **Play:** drop coins from a sliding chute at the top (time the drop); coins land, settle, stack, and the pusher shoves the pile toward the edge. Special coins trigger the bonus wheel; coin "showers" drop 20 at once.
- **The hard part: hundreds of coins as rigid discs** with friction, stacking in 2–3 layers (approximate as discs on a heightfield with per-coin height and tilt), being shoved, tipping over the edge in clumps. Spatial hashing for contacts. Coin rims glint when they catch the light.
- **Tickets:** per coin over the edge, with jackpots from the wheel.

### 7.8 CYCLONE — the ticket wheel · tier: lamp ring + timing · id `cyclone`

- **What you see:** a big ring of lamps with one light racing around it, a jackpot lamp at the top with a rolling jackpot counter.
- **Play:** one button stops the light. Land on the jackpot for the big payout; neighbouring lamps pay small amounts.
- **The hard part:** lamp filament simulation shared with SKY STACK, a convincing "speed" feel through motion trails on the lamps, and an honest timing window. Small and polished; can be the quickest cabinet.
- **Tickets:** 1–10 per stop; jackpot is a progressive counter saved in `localStorage`.

## 8. Testing (do this, then show screenshots)

Use Playwright with its bundled Chromium in headless mode with software GL flags (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Load the file with `page.goto('file:///…/<id>.html')`, abort external requests (Google Fonts) with `page.route`, then drive the game through the test hook the starter exposes (`window.__game`: `ff(seconds)` fast-forwards the fixed-step simulation; `start()`, `attract()`, `setRes(i)`; poke `KEY`, `PTR`, `TS`). For each cabinet:

1. Screenshots of title/attract, play (several moments), results, pause, at every resolution, and on a phone viewport upright (390×844, touch) and sideways (844×390).
2. A soak: an autopilot that plays 20+ complete games via the hook, asserting no page errors, sensible scores and ticket counts, and that `tick()` stays well under 4 ms and `render()` under 8 ms at the default size.
3. `?embed=1`: chrome hidden, matrix fills the frame, `ready`/`score`/`over` messages arrive (listen on the parent via `window.addEventListener('message',…)` in a small wrapper page, or stub `window.parent`).
4. `?style=` previews if you rely on a style.

## 9. Delivery

- One file per cabinet: `<id>.html` (complete document). Keep the `window.__game` hook out of the published copy if you like (a one-line strip in your build script).
- Publish it as an artifact so the owner can play it, and save the file to this project as `hyperdot/games/<id>.html` so the arcade build can collect it.
- Report: what the hard part is and how you solved it, the controls, what you tested, and anything you could not verify (real-GPU frame rate cannot be confirmed in a headless browser).
