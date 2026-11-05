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
- Models: `blender/build_howler.py` (the player's mech) and `blender/build_enemies.py` (skitter, hound, gunner) build the GLBs in `games/ironhowl3/models/mech/`. They use the small kit in `blender/lib.py` (chamfered boxes, cylinders, struts, slats, hoses, decal quads, ambient-occlusion bake into vertex colours, glTF export).
  - Blender's Python module: `python3.13 -m venv bvenv && bvenv/bin/pip install bpy==5.2.3`, then `bvenv/bin/python blender/build_howler.py <repo>/v2/games/ironhowl3/models/mech/howler07.glb` and `bvenv/bin/python blender/build_enemies.py <repo>/v2/games/ironhowl3/models/mech`.
  - `blender/render_preview.py build_howler out.png` renders four quick views.
  - Empties are the joints. Their rotations are zeroed at export (the bake pose is only for the shading).
  - Material names are matched in the game (`MECH_MAT` in 05_mech, `EMAT` in 06c).
  - Decals do not use the baked shading (they would bake black), and textures used on Blender models load with `flipY:false` (`tex(name,{glb:true})`).
- Art: `tools/process_art.py` rebuilds `games/ironhowl3/art/` from the original PNGs. Full-size masters are in `src/ironhowl3/art/masters/`.

## Code map (game/)

| File | What it holds |
|---|---|
| 01_base | Helpers, noise, `store` (keys `hd-ironhowl3-*`), the `ARC` cabinet bridge. Axes are three.js: y up, yaw 0 faces north (-z), forward = (-sin yaw, 0, -cos yaw). |
| 02_input | Keyboard, mouse lock, touch (left 45% of the screen = floating stick, rest = drag to aim, JET button), gamepad → `readCtl(dt)`. `turn` plus = right. |
| 03_render | Renderer, `QUAL` table, sun and hemisphere light, shadow box that follows the mech (snapped to texels), sky dome (gradient, sun, clouds from `34-fog`), `hookWorld(mat,{fade,leaf,ground})` (cloud shadows on the sun light, dither fade per instance, leaf lighting, forest-floor tint). |
| 04_world | Map-neutral world code.<br>`pickMap()` (`?map=` or the saved `hd-ironhowl3-map`) and `hgt()` calls `MAPDEF.h`.<br>`buildGround()` blends three textures in world space (base, b by `aMix`, c by `aTrail`), and `ribbon()` drapes a road over the ground.<br>Vegetation instancing, and colliders: trunks (`addCol`) and boxes (`addBox`), with `collide()` handling both. |
| 04b_maps | `MAPS.woods`, `MAPS.field` and `MAPS.docks`. Each has `h`, `ground`, `look` (sun, sky colours, fog, painted sky `pano`, horizon `ring`), `layout` (plants), `build` (structures), spawn, trail, route and bounds.<br>Shared builders: `tmat`, `sbox` (per-face metre repeats), `put`, `gable`, `boulders`.<br>`mergeStatic()` joins fixed map pieces per material. `BND()` gives the walkable bounds and `boxAt()` the box test used by the camera. |
| 05_mech | Loads `models/mech/howler07.glb`, swaps in the game materials, `mergeParts` (about 170 pieces become about 60 draw calls), `setTier` (shows one of four barrel sets), 2-bone leg IK (`rev` = knee bends backwards), walk cycle with foot planting, jets. |
| 06b_weapons | Autocannon tiers I–IV, heat and overheat, VENT (dumps heat, shoves enemies), missiles (salvo of 2, homing), bolts, hit tests (`segSphere`, `treeAt`, ground), crosshair ray with aim assist (`rayAim`), sparks and explosions. |
| 06c_enemies | Loads the three enemy GLBs, flow-field path-finding on a 2 m grid (`navBuild`/`navDir`), line-of-sight test, brains (skitter swarms and zaps, hound aims then charges, gunner keeps 24–42 m, strafes and fires bursts), waves spawned 55–80 m ahead with red beacons, damage, score with combo, pickups. |
| 06_player | Hull 100 and shield 60 (back after 3 s, 22/s). Movement: walk 7.5 m/s, jet hop (vh 21 m/s, vy 9.5 m/s, hold to float, 2 fuel cells, 3.6 s per cell), tree collision, map edge, legs face the walking direction (backwards when walking back). |
| 07_fx | One particle system (smoke blends, glow adds, using premultiplied alpha). Sounds made on the fly: steps, jet, landing, no-fuel click, birds, wind. |
| 08_camera | The two follow cameras (see below), portrait step-back, camera stays above the terrain, shake, FOV kick on hops. |
| 09_hud | DOM HUD. Top left: shield, hull, jets, gun tier, missiles. Top middle: score and combo. Crosshair with heat bar, hit marker, messages, wave banner, damage arcs, edge arrows for unseen machines (60 m). Phone: FIRE (hold and drag to aim), JET, MSL, VENT. Pause menu. |
| 10_main | Game flow (load → title → play, attract demo), auto quality, events → effects and sound, cabinet commands, the dev handle. |

## Numbers that matter

- Mech (session 4 model, after his turnaround sheet `art/masters/47-howler-07-turnaround.webp` and 48):
  - About 6 m tall to the ear tips, with dog-like legs in three parts (`legIK3`).
  - Hip 3.2 m, thigh 1.05 m (knee forward), shin 1.0 m back to the hock, foot bone 0.9 m at a fixed 15° forward lean (PHI 0.26), ankle 0.36 m.
  - Three steel claws and a rear spur on each foot.
  - 27k triangles, 1.3 MB GLB.
  - Collision radius 1.35 m. The stride grows from 1.0 m to 2.4 m with speed.
- Enemies: about 1.9k, 2.9k and 3.4k triangles. Shown at 1.4×, 1.15× and 1.05× scale.

  | Enemy | HP | Speed | Attack | Score |
  |---|---|---|---|---|
  | skitter | 30 | 9.5 m/s | zap for 4 every 1 s | 50 |
  | hound | 95 | 8.2 m/s | aims 0.75 s, then charges at 26 m/s for 18 (hop over it) | 150 |
  | gunner | 230 | 4.6 m/s | 3-round bursts every 2.4–3.4 s, bolts 30 m/s for 8 each | 400 |

- Guns: 6/7/8/9 volleys a second with 1/2/3/4 barrels. Damage per bolt 11/8.5/7.2/6.6. Bolts 150 m/s.
  - Heat: 2.3 per volley, cooling 30/s after 0.45 s. Overheat locks the gun until it cools to 38.
  - VENT: 8 s cooldown, 15 damage and a shove within 10 m.
- Missiles: 12 to start, 24 max, 2 per salvo, 75 splash damage within 4.8 m.
- SALVO (added after Christopher's feedback):
  - Q or E on laptop, the X button on a gamepad, SALVO on phones.
  - Fires 14 auto-aimed rounds (16 damage each, 170 m/s) from the shoulder pods at the machines within 48 m, all around, even behind. No targets means a ring around you.
  - Spreads its rounds so it doesn't overkill. Measured: 6 of 6 Skitters in a ring killed, on the ground and mid-hop.
  - Its own 12 s cooldown. No gun heat. Works in the air.
- Aim reaches 0.85 rad (49°) down so you can shoot at your feet. The camera slides right (up to about 2 m more) when looking down, to see past the mech.
- Jet hop (after feedback): tap is about 30 m and 0.95 s in the air; hold is about 58 m and 1.8 s. Each hop uses 1 cell plus about 0.5 when held. Refill 3.2 s per cell.
- Pickups:
  - chip: gun tier +1, to IV
  - repair: +35 hull
  - shield: full
  - missiles: +6
  - fuel: full
  - Drop chance: skitter 12%, hound 40%, gunner always (55% of those are chips).
- Waves loop through 6 mixes, then come back with 30% more HP. A new wave starts 4 s after a clear.
- Tickets on 'over': floor(score/400) + waves, capped at 60. The best score is saved as `hd-ironhowl3-best`.
- **Close camera:** 5.0 m back, 7.4 m up, 1.3 m to the right, looking 26 m ahead at 5.8 m, FOV 64. This is "just behind the mech, first person" (his words).
- **Far camera:** 14 m back, 10.9 m up, 2.8 m to the right, looking 24 m ahead at 6.2 m, FOV 58. This is "lifted about one mech height and further back, still behind the neck" (his words).
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
- Session 3:
  - Christopher says his phone handles 1–1.5 million triangles, so the budget is relaxed.
  - The mech is rebuilt in Blender with wolf-like reverse knees (fits the Howler name), a wolf-head sensor with ears, and the wolf emblem on the jet pack.
  - Both cameras sit a little to the right so the crosshair is never behind the mech.
  - Enemies are scaled up so they read at 50 m.
  - On phones, FIRE also works as the aim drag.

## Session log

- **Session 1 (5 Nov 2026):**
  - Art processed (46 images → 49 files, 8.2 MB).
  - Forest pack stored with its catalog, three.js bundle built.
  - `DESIGN.md` written; `preview.html` is the first look.
- **Session 4b (5 Nov 2026):** after his playtest: longer jet hops, aim down at your feet, the SALVO auto-aim burst. Q and E no longer turn (the arrows still do).
- **Session 4 (5 Nov 2026):** image set 2 processed, Howler 07 rebuilt from his turnaround sheet, and the woods, field and docks maps with a map picker.
- **Session 3 (5 Nov 2026):** combat core.
  - New Howler 07 model from Blender, with 4 barrel sets shown by gun tier.
  - Skitter, Hound and Gunner models.
  - Autocannon tiers, heat, vent, missiles, aim assist.
  - Flow-field path-finding, waves from the front with beacons.
  - Shield and hull, damage arcs, edge arrows.
  - Pickups, score with combo, down screen and retry.
  - Cabinet bridge checked: ready, score, over with tickets, exit.
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

- Real phone speed is unknown. In a fight the draw calls rise to about 300–390 (each enemy is about 10 pieces). If phones struggle, instance the enemies.
- The dither fade shows a fine dot pattern on faded trees.
- Enemy hit flash turns the armour pink-white. A rim flash might look better.
- The leaves of the broad trees still look blocky up close.
- No wreck is left behind after a kill (only smoke).
- Missiles fire at once, with no lock-on markers yet.
- The jet flames are plain cones.
- The autopilot test (`AUTO` in the shot steps) does not dodge, so it loses. A human hopping over Hound charges should do far better.

## Image set 2 (arrived 5 Nov 2026)

- Numbers 47–86 (prompts in `IMAGES-SET2.md`) are processed: masters are in `src/ironhowl3/art/masters/`, game files in `games/ironhowl3/art/`.
- 47–52 are reference sheets (mech turnaround and details, enemies, bosses, Rook's truck). They stay masters only, as modelling guides.
- 85 was split into 5 icons (`85-pickup-icons-1..5`: chip, wrench, shield, missile, flame).
- `showcase({a,d,h,ly})` in the dev handle puts the camera around the mech for model shots (a = angle from behind; pass null to go back).

## Done in session 4

- Three maps, chosen on the title screen (the WOODS, FIELD and DOCKS buttons reload the page with `?map=`):
  - **Woods:** forest-floor and mossy-roots ground, a draped farm-track trail, 16 mossy boulders.
  - **Field:** rolling meadow with ploughed and wheat patches, the farm track with fences, a red barn, a farmhouse and a silo, round hay bales, 3 relay masts with red lights, hedgerow trees, the summer sky panorama (69) and a ring of distant hills (70).
  - **Docks:** Harbor 9 at sunset.
    - 4×4 blocks of container stacks 1–3 high (red HYPR LINE, blue KESTREL, teal and yellow), with lanes at x = -43, -9, 25 and 59 and cross lanes at z = -30, -6 and 18.
    - Two ship-to-shore cranes, the quay wall with fenders over animated water, a moored ship, three warehouses with roller doors.
    - The HARBOR 9 neon, a Hyperdot billboard on the east wall, lamp posts and bollards.
    - Sunset sky panorama (80), harbour skyline ring (33). The walkable area is z -58..58, x -82..82.
- The camera pulls in when a container or building would block it. Enemies path around boxes.
- Measured at the start, on High:
  - Woods: about 680k triangles, about 240 calls.
  - Field: about 360k triangles, about 240 calls.
  - Docks: about 100k triangles, about 240 calls.
  - Each enemy adds about 25 calls, counting its shadow.

## Next: session 5 (missions)

- Mission system: objectives, fight zones, 2–3 checkpoints, briefing and results screens, radio lines (Rook and FORGE).
- Missions 1–4:
  1. Sunline: field, destroy the 3 relay masts.
  2. Night Shift: docks at night.
  3. Pinewall: woods, Hornets and Hounds.
  4. Hold the Farm: field at dusk, defend the farmhouse.
- New enemies: Hornet (flying), Tank. Night lighting for the docks (lamp light pools). Instance enemy parts if draw calls get high.

## (old) session 4 plan

- Field map: meadow and dry mixes, open hills, sun, cloud shadows, wind in the grass, farm props.
- Docks map: container stacks (11, 10, 12), cranes, quay, water, the HARBOR 9 neon (44), rain, night sky (31) and harbour skyline (33).
- Woods polish: light shafts, softer canopy fade.
- One test map of each kind, chosen from the title screen.
