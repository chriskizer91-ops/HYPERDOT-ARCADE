# Molten II: The Rime Queen

The sequel to Molten, and the 3D version for the V2 arcade. The original stays at `games/molten.html` as the cabinet's "Retro 2D" choice; this is its "3D" choice, at `v2/games/molten3d.html`.

## Build

```
python3 v2/src/molten3d/build.py             # writes v2/games/molten3d.html
python3 v2/src/molten3d/build.py --dev OUT   # also writes OUT, a test build with the window.__mo hooks
python3 v2/src/molten3d/prep_art.py SRC      # remakes art/ from the original generated images in SRC
```

The game is still one file: `build.py` packs every picture in `art/` into it.

## What's what

- `3_sim.js`, `4_world.js`, `4b_rime.js`, `5_game.js` are the original's simulation, stages, Rime, Hoar King and game flow, copied from `src/molten/`. Gameplay is unchanged. The only additions are visual: each flying particle gets a depth (taken from `Math.random`, so the simulation's own random stream is untouched), stamped particles are flagged so they aren't drawn as walls, and the pointer steers by where it meets the play plane.
- `4c_sequel.js` is Part II: skaters, spitters and their frost bolts, bulwarks and their ice roofs, the Caldera's lava vents, three new stages after the Hoar King (the Caldera, the Obsidian Deep, the Winter Throne), the Rime Queen, and the Anvil, where you keep one of three upgrades after each stage.
- `sculpt.glsl` is the renderer on MED and HIGH. Four jump floods measure how far every cell is from the edge of the rock, the matter (iron, lava, ice), the Rime and the water. A smooth 3D distance field built from those is sphere-traced, which gives rounded rock with crags and magma veins, cast iron that crazes as it cools, lava with a drifting crust, crystal Rime, see-through water, soft shadows from the heart and the lava (HIGH), and light shafts in the steam. A far magma chamber sits behind the cave.
- `2_gl.js` and `march.glsl` are the first 3D renderer, now the LOW setting. The original's 2D light (radiance cascades) still lights everything. A jump flood gives every cell a depth: rock juts toward you, and open cave recedes behind the play channel. One ray per pixel then walks the grid cell by cell. The crucible, its trolley and the furnace are meshes, and flying matter is drawn as streaks in 3D.
- `art/` holds the painted surfaces (17 tiles: rock, metal, ice, snow, water) and one backdrop per stage, made from generated images by `prep_art.py` (flattened, made to repeat without a seam, shrunk, saved as WebP). `2b_art.js` decodes them, works out the bumps from each tile's shading, and puts them on the GPU; both renderers paint the cave with them (each stage picks its own stones in `STAGE_ART`), and the deepest part of the cave opens onto the stage's backdrop. Until the art is ready the cave is drawn the old way.
- `2c_models.js` builds the forge and the Rime in 3D from the model sheets: the crucible (riveted, painted), the furnace hanging on its chains, the forge heart's pedestal, and all nine kinds of Rime, each with legs that walk, a drill that spins, a staff, tendrils. The Hoar King and the Rime Queen are built part by part on their cell grids; where lava melts their cells away, holes open in the models. The Rime are drawn as models, so only the slag bombs are still voxels, and the heart's pedestal is no longer part of the matter field.
- `2d_fx.js` draws the painted effects (a bomb's blast, sparks and smoke; a Rime bursting; the pour splashing where it lands) and the four cards: the title painting that opens the game, the Anvil, the Rime Queen's arrival, and the ending.
- `6_view.js` holds the sprites, the LED-dot HUD (anything tied to a place in the cave is projected there), the camera and the frame loop.

## Cabinet

The id is `molten3d`, and it speaks the cabinet contract in the root README (`ready`, `score`, `over`, `exit`; `start`, `pause`, `resume`, `attract`, `mute`, `unmute`). Saves go under `hd-molten3d-hi`, `hd-molten3d-q`, `hd-molten3d-dots` and `hd-molten3d-mute`.

## Quality

HIGH renders the sculpted cave at full resolution, with soft shadows and a light probe per cell. MED renders it at 50% without the soft shadows, with a probe per 2×2 cells. LOW uses the first, blockier renderer at 42%, with a soft glow and no shadows. A phone starts on MED and a desktop on HIGH, and either steps down by itself if the frame rate can't hold. `?q=low|med|high` pins a level. G (or DOTS in the title menu) shows the view through an LED dot screen: off, fine (640 across) or classic (320, the original's grid).
