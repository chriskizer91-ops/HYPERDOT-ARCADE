# Molten 3D

The 3D version of Molten for the V2 arcade. The original stays at `games/molten.html` as the cabinet's "Retro 2D" choice; this is its "3D" choice, at `v2/games/molten3d.html`.

## Build

```
python3 v2/src/molten3d/build.py             # writes v2/games/molten3d.html
python3 v2/src/molten3d/build.py --dev OUT   # also writes OUT, a test build with the window.__mo hooks
```

## What's what

- `3_sim.js`, `4_world.js`, `4b_rime.js`, `5_game.js` are the original's simulation, stages, Rime, Hoar King and game flow, copied from `src/molten/`. Gameplay is unchanged. The only additions are visual: each flying particle gets a depth (taken from `Math.random`, so the simulation's own random stream is untouched), stamped particles are flagged so they aren't drawn as walls, and the pointer steers by where it meets the play plane.
- `2_gl.js` and `march.glsl` are the new renderer. The original's 2D light (radiance cascades) still lights everything. A jump flood gives every cell a depth: rock juts toward you, and open cave recedes behind the play channel. One ray per pixel then walks the grid cell by cell. The crucible, its trolley and the furnace are meshes, and flying matter is drawn as streaks in 3D.
- `6_view.js` holds the sprites, the LED-dot HUD (anything tied to a place in the cave is projected there), the camera and the frame loop.

## Cabinet

The id is `molten3d`, and it speaks the cabinet contract in the root README (`ready`, `score`, `over`, `exit`; `start`, `pause`, `resume`, `attract`, `mute`, `unmute`). Saves go under `hd-molten3d-hi`, `hd-molten3d-q`, `hd-molten3d-dots` and `hd-molten3d-mute`.

## Quality

HIGH renders at full resolution with a light probe per cell, MED at 56% with a probe per 2×2 cells, and LOW at 42% with a soft glow and no shadows. A phone starts on MED and a desktop on HIGH, and either steps down by itself if the frame rate can't hold. `?q=low|med|high` pins a level. G (or DOTS in the title menu) shows the view through an LED dot screen: off, fine (640 across) or classic (320, the original's grid).
