# Lantern: The Long Night

A remake of Lantern, played at street level. It is a separate game from the original (`games/lantern.html`) and from Lantern 3D (`v2/games/lantern3d.html`); neither is touched.

Build: `python3 build.py` here writes `v2/games/lanternr.html` (one self-contained file, about 230 KB). `python3 build.py --dev OUT.html` also writes a copy with the test hooks (`window.__la`, the autopilot switch `window.__auto`).

## What is the same

The rules are the original's code (modules `01`–`07`, copied through Lantern 3D): the five nights and their maps, the shades, moths, snuffers, the Long Night, oil, flares, the scoring, the dawn tally and the tickets (score ÷ 2,500).

## What is new in the remake

- **Camera:** behind the lamplighter's right shoulder at street level. It never goes into a wall: it slides in, or rises over him. The lantern points where you look (`13_render.js`, `camSetup`, `posePlay`).
- **Controls:** W/S walk where the camera looks, A/D step sideways. The mouse turns the view (pointer lock after the first click), and so do Q/E or left/right. On a phone the left stick walks and a drag on the screen or on BEAM turns the view, with a little aim help while the beam is open (`07_game.js` `readCtl`, `13_render.js` `camInput`).
- **Story:** a chapter card before each night (`16_flow.js`, `CHAPTERS`). The title is Lamp Street itself, with the lamplighter waiting under a lit lamp.
- **Moments:** the last lamp of a night, the great lamp waking and the Long Night rising each get their own shot, with the night running slow. Dawn brings a sunrise in the east, and the shadows are cast again from the sun.
- **Town:** window sills, lintels, shutters, door frames, steps, shop signs, cornices and plinths. They come from the same integer hash the wall shader uses, so they line up with the painted windows (`10_town.js`, `wallPlan`). The sky has stars, the moon, clouds and a skyline of the rest of the town (`FS_SKY`).
- **The lamplighter:** a rig with a top hat and long coat, legs that bend at the knee, the lantern held out, and a lighting pole he raises to each lamp as it kindles (`14_actors3d.js`, `drawLamplighter`).
- **Effects:** smoke trailing off the shades, and dust that shows only inside the beam.
- **HUD:** oil, flares and wicks, a compass strip with every lamp on it, and marks at the screen edge for shades out of sight (`15_hud.js`).

## Cabinet contract

Id `lanternr`. Sends `ready`, `score`, `over` (score, tickets), and `exit` (EXIT in its pause menu when embedded). Obeys `start`, `pause`, `resume`, `attract`, `mute`, `unmute`. Saves only `hd-lanternr-*` keys (`-table`, `-mute`, `-dots`).

## Quality

High on a desktop, medium on a phone (half the screen's pixel density). If the frame rate can't hold, it lowers the resolution, then the quality. `?q=low`, `?q=med` or `?q=high` pins a level.
