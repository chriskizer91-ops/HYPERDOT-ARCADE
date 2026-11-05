# Lantern: The Long Night

A remake of Lantern, played at street level. It is a separate game from the original (`games/lantern.html`) and from Lantern 3D (`v2/games/lantern3d.html`); neither is touched.

Build: `python3 build.py` here writes `v2/games/lanternr.html` (one self-contained file, about 4.5 MB with Studio's pictures). `python3 build.py --dev OUT.html` also writes a copy with the test hooks (`window.__la`, the autopilot switch `window.__auto`).

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

## The Look switch: Classic and Studio

The **Look** chip (also the pause menu and the L key) switches how the same game is drawn, saved as `hd-lanternr-look` (default `studio`). The rules never change.

- **Classic** is the remake as it first shipped: its programs (`FS_WORLD`, `FS_VOID`, `FS_SKY`, `FS_COMP`) and models (`AM`) are unchanged.
- **Studio** (`12_studio.js`, `14_models.js`) adds:
  - **Texture pack:** 20 layers (cobbles, grass, dirt, sand, plaster, brick, oak, planks, clay and slate tiles, stone, paint, iron, canvas, bark, leaves, rock, wool, leather, brass). Each is painted by code on the GPU at start-up into two texture arrays: albedo + gloss, and slope + height + cavity. Every pattern repeats exactly over its tile.
  - **Studio town shader (`FS_WORLDS`):** the same plan of windows, doors and beams as Classic, read from the pack, kept at Classic's brightness by each layer's measured mean. Wet stone and glass mirror the lamps, the lantern, the moon and the sky. Lit rooms have curtains.
  - **Models (`AM2`):** the lamplighter rebuilt (caped greatcoat whose skirts swing with the legs, satchel and strap, scarf with a trailing end, face, top hat, gloves, brass lantern, pole with a hook). The shade is hunched with clawed arms, the snuffer is a hooded robe with a torn hem and both hands on its pole, and the Long Night has a crown of spines and curling arms. The same joints and sizes are used.
  - **Darkness (`FS_VOIDS`):** smoke curling up through the body. It is drawn depth-first and then blended, so its edges fray into the light.
  - **Also:** the lamplighter's shadows on the street, the Milky Way and coloured stars, a colour grade for each night, and a slight colour fringe at the screen edge (high quality only).
- **Pictures (in, Nov 2026):** `img/` holds the image list's pictures (project doc `claude/lantern-long-night-image-list.md`), named by number, e.g. `img/1.1.jpg` for the cobbles. `python3 prep_images.py FOLDER` makes them from the generator's originals; the build embeds them (about 4 MB).
  - Surfaces `1.1`–`4.8` replace their code layer. The colour is brought to the code layer's mean brightness, and the bumps come from the picture's fine shading (inverted for brick, whose mortar is light).
  - The sky takes `5.1` night sky and `5.3` dawn (mapped from the horizon up), `5.2` moon and `5.4` skyline.
  - Story cards `7.1`–`7.5` sit behind the chapter text, and `7.6` fades in behind the final score.
  - The model sheets `6.1`–`6.4` were the blueprints for the Studio models and are not embedded.
  - Classic uses none of the pictures, and they are only loaded once Studio is on.

## Cabinet contract

Id `lanternr`. Sends `ready`, `score`, `over` (score, tickets), and `exit` (EXIT in its pause menu when embedded). Obeys `start`, `pause`, `resume`, `attract`, `mute`, `unmute`. Saves only `hd-lanternr-*` keys (`-table`, `-mute`, `-dots`, `-look`).

## Quality

High on a desktop, medium on a phone (half the screen's pixel density). If the frame rate can't hold, it lowers the resolution, then the quality. `?q=low`, `?q=med` or `?q=high` pins a level. Studio's wet reflections are off at low. `?tex=256` makes the texture pack smaller (for slow test machines).
