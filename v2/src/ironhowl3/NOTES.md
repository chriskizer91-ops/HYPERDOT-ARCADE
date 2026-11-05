# Ironhowl 3 — build log and working notes

This file is the memory between sessions. Read it, together with `DESIGN.md`, before changing anything, and update it at the end of every push: what was built, the decisions made, the numbers, the known problems and what comes next.

## How to build and test

- Source: `v2/src/ironhowl3/game/*.js`. Run `python3 v2/src/ironhowl3/build.py` to join the files in name order into `v2/games/ironhowl3/js/ironhowl3.js`. The page is `v2/games/ironhowl3/index.html`. It loads `js/three-ih3.min.js` (three.js r187 plus GLTFLoader and mergeGeometries), then the game.
- Never edit `js/ironhowl3.js` by hand.
- Serve the repo root: `cd <repo> && python3 -m http.server 8000`.
- `?dev` adds a stats line and the `window.__ih3` test handle. `?noaa` turns off anti-aliasing, which headless Chrome needs to stay usable. `?touch` forces phone controls, and `?embed=1` runs it as the cabinet would.
- Screenshots: `SHOTS=/some/dir python3 v2/src/ironhowl3/tools/shot.py W H "steps" name [touch] [extra-query]`.
  - Steps are separated by `%%` and are either JS to evaluate, `wait:ms` or `shot:name`.
  - `__ih3.ctl({mx,my,turn,pitch,jet,jetHit,turnOnce})` holds the controls, and `__ih3.ff(sec)` runs the game forward at 60 steps a second without drawing.
  - Headless Chrome here takes about a second per drawn frame, so always move time with `ff()` and only wait for screenshots.
  - `__ih3.info()` returns calls, triangles, position, fuel and hops. `__ih3.VEGN.by` gives triangles per vegetation kind and level of detail.
- Cabinet check: `python3 v2/src/ironhowl3/tools/embed_check.py`. It uses `tools/embed_check.html`, loads the game in an iframe and sends start, pause, resume, mute, unmute and attract.
- Art: `tools/process_art.py` rebuilds `games/ironhowl3/art/` from the original PNGs. Full-size masters are in `src/ironhowl3/art/masters/`.

## Code map (game/)

| File | What it holds |
|---|---|
| 01_base | Helpers, noise, `store` (keys `hd-ironhowl3-*`), the `ARC` cabinet bridge. Axes are three.js: y up, yaw 0 faces north (-z), forward = (-sin yaw, 0, -cos yaw). |
| 02_input | Keyboard, mouse lock, touch (left 45% of the screen = floating stick, rest = drag to aim, JET button), gamepad → `readCtl(dt)`. `turn` plus = right. |
| 03_render | Renderer, `QUAL` table, sun and hemisphere light, shadow box that follows the mech (snapped to texels), sky dome (gradient, sun, clouds from `34-fog`), `hookWorld(mat,{fade,leaf,ground})` (cloud shadows on the sun light, dither fade per instance, leaf lighting, forest-floor tint). |
| 04_world | Woods test map: `hgt(x,z)` terrain (rises into ridges past ±80 m), trail polyline, clearings, layout from the catalog biome mix, vegetation instancing, tree colliders `collide()`. |
| 05_mech | Howler 07 model (chamfered boxes plus the textures), `mergeParts` (fewer draw calls), 2-bone leg IK, walk cycle with foot planting on the terrain, jets (flames, light). |
| 06_player | Movement: walk 7.5 m/s, jet hop (vh 21 m/s, vy 9.5 m/s, hold to float, 2 fuel cells, 3.6 s per cell), tree collision, map edge, legs face the walking direction (backwards when walking back). |
| 07_fx | One particle system (smoke blends, glow adds, using premultiplied alpha). Sounds made on the fly: steps, jet, landing, no-fuel click, birds, wind. |
| 08_camera | The two follow cameras (see below), portrait step-back, camera stays above the terrain, shake, FOV kick on hops. |
| 09_hud | DOM HUD: jet fuel cells, VIEW and pause buttons, stick, JET button, pause menu (view, quality, sound, look speed, exit when embedded). |
| 10_main | Game flow (load → title → play, attract demo), auto quality, events → effects and sound, cabinet commands, the dev handle. |

## Numbers that matter

- Mech: 4.5 m tall, hip 2.25 m, thigh and shin 1.25 m each, collision radius 1.35 m. The stride grows from 1.0 m to 2.5 m with speed.
- **Close camera:** 3.5 m back, 5.75 m up, looking 24 m ahead at 4.25 m, FOV 64. This is "just behind the mech, first person" (his words).
- **Far camera:** 13 m back, 9.6 m up, looking 18 m ahead at 3.3 m, FOV 58. This is "lifted about one mech height and further back, still behind the neck" (his words).
- Portrait screens step both cameras back and widen the FOV.
- Quality levels (draw distances in metres):

  | Level | Pixel budget | Shadows | Grass | Trees near / far | Fog |
  |---|---|---|---|---|---|
  | low | 0.75 MP | off | 24 (8 near) | 24 / 115 | 100 |
  | med | 1.35 MP | 1024 | 36 (12 near) | 32 / 165 | 140 |
  | high | 3.4 MP | 2048 | 52 (18 near) | 48 / 230 | 185 |

  Auto starts on Medium for phones and High for laptops. It lowers the render scale to 0.66, then the level, if frames run slower than 40 fps.
- Measured at the spawn point, shadows included:
  - Medium: about 230–400k triangles and 120–150 draw calls.
  - High: about 600–670k triangles and 135–155 draw calls.
  - Game logic: about 1 ms per frame.
- Woods map: about 2,000 trees (inner area sparse, ridges dense), 11,000 grass tufts, 330 bushes, 6 props. Tree models are 4–7.5k triangles near and 76–844 far.

## Decisions

- Session 1:
  - Ironhowl 3 is its own folder game, not a single file.
  - Version 2 (`games/ironhowl3d.html`) stays locked.
- Session 2:
  - Top-down view left out (Ironhowl 3D covers it).
  - The pack's far models are painted darker than the near ones, so far leaves are brightened 1.8× and near leaves 1.2×.
  - Leaf normals are bent outward from the crown and back faces are not flipped, which removes the black specks.
  - Trees between the camera and the mech dither out to about 80%.
  - Cloud texture must load as plain data (not sRGB) or the clouds vanish.
  - Ground cloud shadow scale is 1/420, and the sky uses the matching projection.
  - Hints sit at the top of the screen so the thumbs never cover them.

## Session log

- **Session 1 (5 Nov 2026):**
  - Art processed (46 images → 49 files, 8.2 MB).
  - Forest pack stored with its catalog, three.js bundle built.
  - `DESIGN.md` written; `preview.html` is the first look.
- **Session 2 (5 Nov 2026):** engine core in `index.html`.
  - Terrain with ridges and a trail.
  - Woods from the pack with near/far swap, colliders and see-through trees.
  - Sky with drifting clouds whose shadows slide over the ground.
  - The mech walks with planted feet, turns its legs and torso separately, and jet hops (hold to float) with flames, dust and sound.
  - Both cameras.
  - Phone stick, aim drag and JET button; laptop WASD, mouse and Space; gamepad.
  - Pause menu with quality, plus auto quality.
  - Cabinet bridge checked: ready, start, pause, resume, mute, unmute, attract and exit all work.
  - No score yet, so no `score` or `over` messages.

## Known problems and loose ends

- Real phone speed is unknown. The headless browser is far too slow to judge it, so check on the Pixel 7a and look at the stats line with `?dev`.
- The leaves of the broad trees (oak, cottonwood) still look blocky up close. That is the pack's style. It could get a soft leaf texture later.
- The dither fade shows a fine dot pattern on faded trees.
- The jet flames are plain cones. They could use a texture (`38-muzzle-flash`) later.
- The mech is boxy. Session 3 adds the gun tiers (barrels per tier), so revisit the shape then.
- The title screen camera is static.

## Next: session 3 (combat core)

- Autocannon tiers I–IV: barrel meshes per tier, fire rates 6/7/8/9 per second, heat and VENT.
- Shields with recharge, hull, damage direction indicator.
- Missiles with lock-on.
- The first enemies (Skitter, Gunner, Hound) with path-finding around trees.
- Pickups (power chip, repair, shield, missile, fuel), a FIRE button on phones (hold) and a MISSILE button, the crosshair with aim assist.
- Score, plus `score` and `over` messages to the cabinet.
