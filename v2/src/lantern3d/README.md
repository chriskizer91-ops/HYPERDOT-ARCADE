# Lantern 3D

The 3D choice for Lantern's cabinet. The original stays at `games/lantern.html` as the "Retro 2D" choice and is not touched.

Build: `python3 build.py` here writes `v2/games/lantern3d.html` (one self-contained file, about 210 KB). `python3 build.py --dev OUT.html` also writes a copy with the test hooks (`window.__la`, the autopilot switch `window.__auto`).

## What comes from the original

Modules `01`–`07` are the original Lantern's `src/lantern/` files with the few changes a 3D view needs, each marked `3D:`. The nights, the maps, the shades, moths, snuffers, the Long Night, oil, flares, the scoring, the dawn tally and the tickets (score ÷ 2,500) are the original's code. The sound is the original's FM soundboard, unchanged.

## What is new

| Module | What it does |
|---|---|
| `08_math.js` | 4x4 matrices |
| `09_gl.js` | WebGL2 helpers and the mesh builder |
| `10_town.js` | builds each night's town in 3D from the same map cells, with the original's own dice, and stamps every solid thing into a height map |
| `11_hz.js` | shadows: each light keeps a "horizon" per direction, cast from the height map (the lantern every frame, the lamps once a night) |
| `12_shaders.js` | lighting (the same falloffs the rules use, so a lit pool is a pool that freezes a shade), the procedural town, water, mist, glow, the finish, the amber dots |
| `13_render.js` | the frame, the camera, quality levels |
| `14_actors3d.js` | the lamplighter, shades, snuffers, the Long Night, moths, flares, sprites |
| `15_hud.js` | the HUD and screens, in the original's dot-matrix lettering |
| `16_flow.js` | the frame loop, chrome and boot |

## Cabinet contract

Id `lantern3d`. Sends `ready`, `score`, `over` (score, tickets), `exit` (EXIT in its pause menu when embedded). Obeys `start`, `pause`, `resume`, `attract`, `mute`, `unmute`. Saves only `hd-lantern3d-*` keys (`-table`, `-mute`, `-dots`).

## Quality

High on a desktop, medium on a phone. If the frame rate can't hold, it lowers the resolution, then the quality. `?q=low`, `?q=med` or `?q=high` pins a level.

## Controls

Keyboard and mouse: WASD walk, the mouse aims, hold click or Space for the beam, right click or X for a flare, G for the dot-matrix view, Esc pause, M mute. Touch: stick, BEAM and FLARE, or hold a finger on the town to aim and open the beam there. Gamepad: left stick walks, right stick aims, A/RT beam, X/LT flare.
