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
- Models: `blender/build_howler.py` (the player's mech) `blender/build_enemies.py` (skitter, hound, gunner, lancer) `blender/build_set6.py` (truck, thresher) and `blender/build_set7.py` (hornet, tank, mortar, bulwark, stag, maw, forge) build the GLBs in `games/ironhowl3/models/mech/`. They use the small kit in `blender/lib.py` (chamfered boxes, cylinders, struts, slats, hoses, decal quads, ambient-occlusion bake into vertex colours, glTF export).
  - Blender's Python module: `python3.13 -m venv bvenv && bvenv/bin/pip install bpy==5.2.3`, then `bvenv/bin/python blender/build_howler.py <repo>/v2/games/ironhowl3/models/mech/howler07.glb` and `bvenv/bin/python blender/build_enemies.py [names...] <repo>/v2/games/ironhowl3/models/mech` (give names such as `lancer` to rebuild only those; same for `build_set6.py truck`).
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
| 04c_foundry | `MAPS.foundry` (Foundry 4 at night): blast walls, yard buildings, the main hall with the FOUNDRY 4 neon, FORGE's platform and collider (`FORGE_AT`), molten channels, furnace stacks with smoke, cover, lamp pools. |
| 05_mech | Loads `models/mech/howler07.glb`, swaps in the game materials, `mergeParts` (about 170 pieces become about 60 draw calls), `setTier` (shows one of four barrel sets), 2-bone leg IK (`rev` = knee bends backwards), walk cycle with foot planting, jets. |
| 06b_weapons | Autocannon tiers I–IV, heat and overheat, VENT (dumps heat, shoves enemies), missiles (salvo of 2, homing), bolts, hit tests (`segSphere`, `treeAt`, ground), crosshair ray with aim assist (`rayAim`), sparks and explosions. |
| 06c_enemies | Loads the three enemy GLBs, flow-field path-finding on a 2 m grid (`navBuild`/`navDir`), line-of-sight test, brains (skitter swarms and zaps, hound aims then charges, gunner keeps 24–42 m, strafes and fires bursts), waves spawned 55–80 m ahead with red beacons, damage, score with combo, pickups. |
| 06_player | Hull 100 and shield 60 (back after 3 s, 22/s). Movement: walk 7.5 m/s, jet hop (vh 21 m/s, vy 9.5 m/s, hold to float, 2 fuel cells, 3.6 s per cell), tree collision, map edge, legs face the walking direction (backwards when walking back). |
| 06d_missions | Mission list and looks (`NIGHT_DOCKS`, `DUSK_FIELD`, `RAIN_DOCKS`, `FOG_CREEK`, `HAZE_DRY`), steps, targets, checkpoints, radio, results. What a step builds is kept in `MS.built[step]`, so a repair does not rebuild (or bring back) what you already destroyed. |
| 06e_hangar | Six upgrade tracks (`UPG`), costs 150/300/500/800/1200 scrap, `applyUpgrades()` (called at the start of a run and after a repair), the hangar screen. |
| 06f_more | Session 6 pieces: spawner pods, the Lancer brain, rain, Rook's truck (`loadSet6`, `truckModel`, escort), the Thresher boss (`makeThresher`, `bossStep`, `bossIdle`, mortar warning discs). |
| 06g_set7 | Session 7 pieces. Enemies Hornet, Tank, Mortar crawler and Bulwark use hooks in `EDEF`: `init`, `brain`, `pose`, `armor` and `fly`. Also: shared artillery marks (`mortarAt`, `volley`, `updMarks`), fire, lightning, searchlights, capture points, and the Stag, Maw and FORGE (`BOSS_DEF`: make, step and idle for each boss). |
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
- **Session 7 (5 Nov 2026):** missions 9–12, four new enemies, the Stag, the Maw and FORGE, the Foundry 4 map, difficulty across the campaign.
- **Session 6 (5 Nov 2026):** hangar and scrap, missions 5–8, spawner pods, the Lancer, rain, Rook's truck model and escort, the Thresher boss.
- **Session 5 (5 Nov 2026):** arenas 1.6× bigger, mission system and missions 1–4.
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

## Arenas (session 5 start)

- Every arena grew 1.6× because Christopher wanted room to back off. `PLAY` is 130, so you can walk 260 × 260 m, and `WORLD` is 225 (terrain 450 m, 2 m grid).
- `K=1.6` with `kp`/`kc`/`kr` scales the woods and field layouts.
- Docks: bounds x ±128, z ±96, with the quay at z -100.
  - 7×7 container blocks: x centres -110..94 step 34, lanes at x -93, -59, -25, 9, 43, 77, 111; z rows -80..64 step 24.
  - 3 cranes and 5 warehouses at z 99..117. Spawn at (9, 88).
- Field: farm at (67, 54), masts at (-64, -32), (77, -83), (-51, 83). Spawn at (0, 115).
- Woods spawn at (0, 112).
- Logic cost per frame: woods 1.4 ms, field 0.5 ms, docks 0.2 ms.

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

## Done in session 5 (missions)

- `06d_missions.js`. `?mission=N` loads that mission's map and look. The title screen becomes a briefing card (TAP TO DEPLOY, MENU). In the sandbox the title has a MISSIONS button: a list with locks and best scores.
- Steps:
  - `destroy`: field radio masts (`MAPS.field.mastObjs`, they topple) or docks gate control boxes (`makeConsole`).
  - `reach`: a blue ring.
  - `clear`: kill everything.
  - `hold`: an orange ring; the timer runs only while you are inside, and waves arrive every N seconds from 70 m away.
- A step with `cp:1` saves a checkpoint (position and gun tier) when it starts. Falling costs a repair (3 per mission): back to the checkpoint, gun one tier down. With none left the mission fails.
- HUD:
  - Objective line under the score.
  - Radio strip (ROOK amber, FORGE red, 3.8 s each).
  - Waypoint diamond with distance, pinned to the edge when off screen.
  - Results screen: score, time, kills, repairs, tickets; NEXT MISSION, PLAY AGAIN, MENU.
- Scoring: +300 per target, +500 per step, and on a win +2000 plus a time bonus (5 per second under 10 minutes) and +400 per repair left.
- Tickets: floor(score/400), +10 on a win, capped at 80. `ARC.over` is sent once, at the results.
- Save: `hd-ironhowl3-save` = {unlocked, best:{id:score}}.
- Missions:
  1. Sunline: field, day. 3 masts, then the truck by the barn.
  2. Night Shift: docks, night. Night look `NIGHT_DOCKS`, fake lamp light pools, a mech headlight `SpotLight`.
  3. Pinewall: woods. Find the burnt convoy, guard Rook for 60 s, reach the north ridge.
  4. Hold the Farm: field, dusk. `DUSK_FIELD` uses the procedural sky; defend the farmhouse for 150 s.
- Tested: mission 1 played through in fast-forward (all steps, a fall and checkpoint repair, the results screen); mission 3's guard step finishes after 60 s.
- Not done yet: the Hornet and Tank enemies from the plan, a real model for Rook's truck (a box stand-in for now), a storm or rain effect for mission 4.

## Done in session 6 (hangar, missions 5–8, the Thresher)

- **Scrap and hangar** (`06e_hangar.js`). Scrap only counts in missions: Skitter 5, Hound 15, Gunner 35, Lancer 40, each target 40, a win 150 + 25 per repair left. It is banked at the results screen (`SAVE.scrap`).
  - Tracks, 5 levels each, cost 150 / 300 / 500 / 800 / 1200:
    - GUN: start tier II, III, IV, then +15% and +30% damage.
    - COOLING: less heat per shot, faster cooling, a shorter vent wait.
    - SHIELD: 80 → 160, faster recharge.
    - MISSILES: bigger salvo (3 → 8) and more ammo.
    - JETS: 3 cells, faster refill, stomp landing, 4 cells, SALVO every 8 s.
    - HULL: 120 → 200, bigger repairs.
  - Save: `hd-ironhowl3-save` = {unlocked, best, scrap, upg:{id:level}}. HANGAR is on the title screen and the results screen.
- **New pieces:**
  - **Spawner pods:** targets with 320 HP that print 2 Skitters every 8.5 s, with no more than 16 machines alive at once.
  - **Lancer** (`models/mech/lancer.glb`, from sheet 50):
    - 170 HP. It stays 46–85 m away.
    - It paints you with a red line for 1.6 s, and the line locks 0.3 s before the shot. The shot does 26 damage, but you dodge it by moving about 3 m, hopping, or breaking line of sight, which drains the charge.
    - Tested: standing still takes 26, moving 5 m at the end takes 0.
  - **Rain:** 3,000 thin crossed strips in two stacked layers that follow the camera.
  - **Rook's truck** (`models/mech/truck.glb`, from sheet 52): 7.6k triangles, 6 spinning wheels and a crane. It is also used for missions 1 and 3; mission 3 uses a burnt version.
  - **The Thresher** (`models/mech/thresher.glb`, from sheet 51):
    - 13.8k triangles, about 16 m tall.
    - Four red knees (420 HP each) are the weak points. Each knee lost lowers it; with all four gone it drops, the hatch opens and the core (1400 HP) shows.
    - The blade drum hurts anything in front of it. Mortar volleys put red discs on the ground, and the shells land 1.7 s later. It adds Skitters every 14–20 s.
    - The feet push you away, but you can walk under its belly.
- **Missions:**
  5. Container Maze: docks in rain (`RAIN_DOCKS`, fog at 150 m). Destroy 4 spawner pods, then reach the crane.
  6. Creekbed: woods with willows and reeds (mix `creek`), fog at 105 m.
     - Escort the truck along a 9-point route, about 290 m. The truck has 700 HP.
     - The truck drives only while you are within 35 m and nothing is within 9 m of it.
     - About half of each wave goes for the truck unless you are within 16 m of them.
     - A repair puts you 10 m behind the truck and patches it to at least 50%.
  7. Dust Devil: field in dry country (ground `61-dry-prairie-ground`, mesquite and dry grass, sun behind you). Find the Thresher, then bring it down.
  8. Tanker Run: docks at sunset. Cut 3 mooring winches within 4:00, with Lancers and Skitters in the way. The timer shows on the objective line; out of time means the mission is lost.
- **Fixes:**
  - A repair used to rebuild the step's targets, which brought destroyed gate controls and masts back. They now stay destroyed.
  - Hangar and mission list backgrounds are near-opaque, and the mission list scrolls.
  - On phones the objective line sits on its own row under the top bar.
- **Tested headless** (fast-forward):
  - Hangar purchases and their effects: GUN 2 means start at tier III, SHIELD 1 gives shield 80, JETS 1 gives 3 cells.
  - Mission 5: the pods print Skitters, and destroying them moves to the next step.
  - Mission 6: the truck drives to the end and the mission completes (79 s with the waves cleared).
  - Mission 7: knees → core → MISSION COMPLETE.
  - Mission 8: the Lancer shot hits or is dodged, and running out of time fails the mission.
  - Mission 2 repair: a destroyed console stays destroyed.
  - Cabinet check passes.
- **Numbers (High, headless):**
  - Mission 5: about 210–340 draw calls with 12–16 machines.
  - Mission 7 with the boss: about 190–280 calls and 290k triangles.
  - Game logic per tick: 0.26 ms (mission 5) and 0.81 ms (mission 7).
- **Not done:** Hornet, Tank, Mortar crawler and Bulwark (sheet 50) are still to come. There is no lightning or storm in mission 4 yet. The tanker does not visibly sail away.

## Done in session 7 (missions 9–12, the campaign is complete)

- **New enemies** (from sheet 50, models in `build_set7.py`):
  - **Hornet:** 45 HP, flies about 11 m up and circles at 24 m. It dives to 4.5 m, fires 3 stinger shots, then climbs away. It ignores trees, and the salvo locks on to it.
  - **Tank:** 420 HP. Its turret turns on its own at 1.1 rad/s and fires a lobbed shell (24 damage) every 4.4–5.4 s. Damage depends on where you hit it: front ×0.33, side ×1, back ×1.5.
  - **Mortar crawler:** 260 HP, six legs, stays 46–92 m away. Every 7–9 s it lobs 3 shells onto red discs, and they land 2.2 s later. It needs no line of sight.
  - **Bulwark:** 380 HP. Shots on its shield from the front do ×0.1. It bashes up close (18 damage and a shove) and fires a 5-pellet shotgun at 8–30 m.
- **Bosses** (sheet 51):
  - **The Stag:** 15 m tall.
    - Phase 1: two antler pods, 600 HP each. Twin artillery fires volleys of 6. It stomps if you are within 18 m (warned by a red ring 1.1 s ahead) and calls Hornets.
    - Phase 2: the chest plate opens on the furnace (1500 HP). Volleys of 8, and a charge every 9 s after it lowers its head for 1 s.
  - **The Maw:**
    - Its mouth core (2400 HP) only takes damage while the jaw is open: 3.6 s out of every 8.5, and every 6 s once both side guns (450 HP each) are gone.
    - While open it sprays fans of 9 bolts. It lunges and bites within 15 m (36 damage) and calls Hounds every 22 s.
  - **FORGE:** stands still.
    - Phase 1: four pylons (500 HP) hold a shield dome. It fires spiral bolt bursts and sends waves through the yard gates.
    - Phase 2: the doors slide open on the furnace (2000 HP), and shells are added.
    - Phase 3: the eye (2200 HP). Lava bursts, faster spirals, and a red beam that sweeps 160° at hip height. Hop over the beam: it does 30 damage.
- **Missions:**
  9. Burning Pines: woods at night (conifer mix), 80 burning trees with glow and smoke, embers. Ridge, clear, then the Stag.
  10. Storm Front: field, rain and lightning. Every 6–13 s a strike lands 18–70 m away and does 140 damage to machines within 7 m. Capture 3 relays (25 s each inside a 13 m ring), with waves every 20 s (tanks, bulwarks, mortars, hornets).
  11. Lockdown: docks at night with the middle blocks removed to make a crane yard (`yard:true`). Destroy 3 searchlight towers: if a beam stays on you for 0.6 s, a volley of shells follows. Then the Maw.
  12. Heart of the Forge: the new Foundry 4 map. Enter the yard, then FORGE in 3 phases.
- **Difficulty (`DIFF`):** enemy damage runs ×0.8 in mission 1 up to ×1.25 in mission 12, and toughness ×0.85 up to ×1.15.
- **Smaller changes:**
  - Enemy bolts can fall with gravity and have their own size. Up to 220 are drawn.
  - `hurtTarget` respects `immune()`.
  - Bosses glow faintly at night.
  - The enemy red is less washed out.
  - FOUNDRY joins the map buttons for free play.
- **Tested headless** (fast-forward):
  - Each new enemy spawns and attacks. 4 of them together took 154 HP off me in 10 s.
  - Armour: tank front 0.33, side 1, back 1.5; Bulwark front 0.1.
  - Mission 9: Stag antlers → chest → MISSION COMPLETE.
  - Mission 10: 3 relays captured → complete.
  - Mission 11: searchlights → Maw. A closed jaw took 0 damage, an open one 500 → complete.
  - Mission 12: pylons → furnace → beam → eye → complete. The spiral fired 70 bolts in 1.6 s.
  - Missions 1 and 7 still work. The cabinet check passes.
- **Numbers (High, headless):**
  - Mission 9: 175–280 draw calls and 380–460k triangles.
  - Mission 11: 300–450 calls (searchlights and lanes).
  - Mission 12: 250–275 calls and 145–175k triangles.
  - The 4 new enemies together: 260→405 calls.
- **Not done:** lightning only lights the scene with the hemisphere light, no real shadows. The Stag walks through trees. The Maw can clip containers at the edge of the yard.

## Detail pass (after session 7, 5 Nov 2026)

- **Lighting and effects** (`03b_post.js`):
  - Bloom: an EffectComposer with RenderPass, UnrealBloomPass and OutputPass, on High and Medium. The high-pass uses the brightest channel above 1.7, so red lights glow but lit ground does not.
  - Reflections: a small gradient sky per map goes through PMREM into `ENV`, applied to every material with metalness 0.3 or more.
  - Normal maps from `tools/make_normals.py`: 28 textures, `<name>-n.webp` at 512 px (2.3 MB). Used by the mech, the machines, `tmat` props and the ground. The ground shader blends three normal maps.
  - Effect art: `tools/make_fx_atlas.py` packs explosions, muzzle flash, sparks and steam into `fx-atlas.webp`. Particles with `img:0..4` use it.
  - Decals: scorch marks where explosions land, claw prints on soft ground.
  - The shield hex bubble flashes when the shield takes a hit, and shadows are now PCF soft.
  - `?nobloom` turns bloom off.
- **Models:**
  - The detail kit in `blender/lib.py`: `bolts`, `bolt_grid`, `piston`, `seam`, `edge_wear` (worn paint in the vertex-colour alpha) and `auto_detail` (bolts and seams on large flat faces).
  - Build scripts set `lib.AUTO` so `bake_ao` adds the detail and the wear.
  - Howler 07 has a hand-placed `details()`: skirts, layered plates, rams, cables, pod skins, heat sinks, glowing vents, teeth, lenses and fuel lines. It went from 27k to 50k triangles.
  - The shader's `wear` option turns worn edges into bare steel (lower roughness, higher metalness).
- **Set dressing** (`04d_props.js`, `MAPDEF.dress()`): walk-through clutter, so paths are unchanged.
  - Woods: 900 stones, 90 logs, 150 stumps, leaf litter.
  - Field: rocks, pallets, drums, posts, scrap, puddles.
  - Docks: 110–170 puddles that mirror the sky, cracks, oil, pallets, cones, drums, hoses.
  - Foundry: puddles, cracks, scorch, hazard paint, scrap, pipes, cones.
  - `?nodress` turns it off.

## Next: session 8 (polish)

- Sound pass, more radio lines, a phone performance pass (instancing enemies if draw calls are a problem), attract demo, Endless mode, final balance after his playtest.

## (old) session 7 plan

- Missions 9–12: Burning Pines (woods at night, fire, the Stag), Storm Front (field, lightning, hold 3 points), Lockdown (docks crane yard at night, the Maw), Heart of the Forge (Foundry 4, FORGE).
- Enemies from sheet 50: Hornet (flying), Tank, Mortar crawler, Bulwark (shield). Bosses from sheet 51: the Stag, the Maw, FORGE.
- Difficulty tuning across all 12 missions.

## (old) session 6 plan

- Hangar between missions: scrap from wrecks, six upgrade tracks, saves.
- Missions 5–8, and the Thresher boss.
- New enemies: Hornet (flying), Tank, Mortar crawler, Spawner pods, Lancer. Models via the Blender kit, from his sheets 50 and 51.
- Rook's truck model from sheet 52.

## (old) session 5 plan

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
