# Voltfist 3D

The "3D" choice for the Voltfist cabinet. The original LED-matrix game (`games/voltfist.html`, built from `src/voltfist/`) stays as the "Retro 2D" choice and is not changed.

The fight is the original's. Only the drawing is new: the fighters are real 3D figures on 3D stages, and the HUD and menus are drawn as LED dots over the 3D picture.

## Build

```
python3 build.py                     # writes ../../games/voltfist3d.html (one self-contained file, about 0.95 MB)
python3 build.py --debug OUT.html    # also writes a test build with the window.__vf3 handle (99_debug.js)
```

`build.py` joins every `NN_*.js` file in this folder, in order, inside one closure, and puts the vendored three.js bundle in front.

## What comes from the original

These files are byte-for-byte copies of `src/voltfist/`, so every move, combo, block, throw, the CPU and the rounds work exactly the same. `build.py` checks them against the original on every build and warns if they drift.

| File | Original | What it is |
|---|---|---|
| `02_rig.js` | `2_rig.js` | the flat skeleton: poses, IK, cloth chains (its 2D drawing code is simply unused) |
| `03_looks.js` | `3_looks.js` | costumes and colours |
| `04_moves.js` | `4_moves.js` | every move's frames and hits, the roster |
| `05_fight.js` | `5_fight.js` | the combat engine (fixed 60 steps a second) |
| `06_fx.js` | `6_fx.js` | sparks, rings, flashes and dust, in metres on the fight plane |
| `07_ai.js` | `7_ai.js` | the CPU opponent and the practice dummy |

`01_core.js` is the original `1_core.js` (fonts, audio, input) without its LED-matrix display. It has two changes: saves go under `hd-voltfist3d-` keys, and the cabinet id is `voltfist3d`.

`16_ui.js` keeps the original `9_ui.js` flow (round logic, arcade ladder, continue, versus, practice, scores, tickets, the arcade bridge) and redraws the screens.

A side-by-side test ran the original and this build on the same random seed: five CPU-vs-CPU matchups, 2 minutes each, checked every half second. All 1,200 checkpoints were identical. Anything random that is only visual uses its own generator (`VR` in `13_fx3d.js`), so the picture never changes how a fight goes.

## The new files

| File | What it does |
|---|---|
| `10_gfx.js` | Renderer, quality levels and the picture pipeline: dual-filter bloom, light shafts from the stage's sun or moon, an anamorphic lens streak, depth of field, and the final pass (impact shockwaves, lensing, chromatic split, super zoom blur, impact frames, colour grade, film grain, vignette). The final pass lays the HUD over the picture as round LEDs; with the Dots filter on, the 3D picture itself becomes LEDs. |
| `11_art.js` | The painted fighters. Each body is rebuilt from measurements of Christopher's character sheets (front T-pose widths, turnaround side-view depths, face-sheet front and side outlines) and painted with those same pictures. Every vertex looks up two pictures (front and back for the body, face front and face side for the head) and blends them by which way it faces, so there are no seams. The shading painted into the pictures becomes relief: broad shapes move the surface a few millimetres, fine detail bends the lighting per pixel (from the atlas's alpha channel). About 60,000 triangles per fighter, with curled fingers and Kai's hair spikes in 3D; Low quality builds them about 40% lighter. The moves still come from the original skeleton. Add `?classic=1` to the address to see the old code-built bodies. |
| `11_fighter.js` | The flat skeleton lifted into 3D, with smooth skinned joints, shaped limbs, faces, hair, belts and cloth. Near and far limbs get depth, the chest and head turn toward the camera, and arms and legs are solved again in 3D. Each fighter is one mesh with up to 20 parts, moved by a shader, so it is one draw call. Costume patterns are the original's own colour functions. Toon shading with real metal reflections and glossy highlights, rim light from the stage, electric and plasma auras, outlines, afterimages. |
| `12_scene.js` | Camera, key light and shadows, a pool of moving lights that effects ask for each frame, and smoothing between fight steps (the fight runs at 60 Hz; a Pixel 7a screen at 90). |
| `13_fx3d.js` | The engine's particles, drawn as glowing quads with depth (sparks burst toward the camera too), curved sword arcs, and projectiles with real light. |
| `13_supers.js` | The super moves' own shows, visual only: Kai's beam with streaming energy and lightning strikes across the stage, Nova's boiling plasma star that bends the picture, Echo's rainbow beam, Runa's petal storm, Magnus's cracked floor and flying rocks, and auras crawling over the body. |
| `14_stages.js` | The five stages, made from code, with mirror-wet floors (a real reflection pass), rain ripples and puddles. Neon Rooftop is a night city: towers with lit windows, a cloud deck lit by lightning, traffic, searchlights, neon tubes, steam, a scrolling LED ad and a billboard with a live LED feed of the fight. The others are Blossom Shrine, Ironworks, Orbit Nine and The Core. |
| `15_view.js` | The camera director, the post-effect state and the studio. The camera sweeps in for supers. A K.O. by a super gets longer slow motion with the camera circling. The round-one intro and round wins have their own shots. The studio is a dark room with an LED wall, used for select, VS, continue and ending. |
| `16_ui.js` | Flow (from the original) and the LED-dot screens. |
| `art/` | One 2048 x 2048 WebP atlas per fighter (front T-pose, mirrored back view, face front, face side) and `meta.json` with the joints and measurements. The build embeds them. |
| `tools/art_prep.py` | Makes `art/` from the character-sheet PNGs: `python3 tools/art_prep.py RAW_DIR art`, where RAW_DIR holds the folders from the zips (Kai-Volta/1.3-Kai-Volta-Front-T-Pose.png and so on). The original PNGs are not kept in the repo. |
| `vendor/three.vf.js` | three.js r170 core (MIT), bundled with `esbuild` from `npm i three@0.170.0`: `export * from 'three'` as an IIFE named `THREE`. |

## In the arcade

It follows the cabinet contract in the repo's README. Open it with `?embed=1`.

Game to arcade:
- `ready` once it can take input.
- `score` while a credit runs.
- `over` with score and tickets when the credit ends. Tickets use the original's formula: 4 per rival, 1 per 4,000 points, 20 for clearing the ladder, at least 3 for a credit that runs its course, at most 120.
- `exit` on Esc, or pad B, from the title.

Arcade to game: `start`, `pause`, `resume`, `attract`, `mute`, `unmute`.

Saves live only under `hd-voltfist3d-`: `hi`, `beat`, `mute`, `voice`, `dots`, `quality`.

## Quality

There are three levels.

| Level | Starts on | Shadows | Mirror floors | Light shafts, lens streak | Depth of field | Anti-aliasing | Moving lights | Afterimages |
|---|---|---|---|---|---|---|---|---|
| High | laptops | 2048 | yes | yes | yes | 4x | 4 | 8 |
| Medium | phones | 1024 | yes, smaller | yes | no | none | 3 | 5 |
| Low | when Auto steps down, or picked in Options | none | no | no | no | none | 2 | 3 |

On Auto, if a fight can't hold about 45 frames a second for three seconds, it steps down one level. `?q=low|med|high` pins a level. Options in the main menu has the announcer, the Dots filter and quality; the pause menu has Dots too.
