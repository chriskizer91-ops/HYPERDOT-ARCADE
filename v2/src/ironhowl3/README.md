# Ironhowl 3 — source

The plan is in `DESIGN.md`. The game itself lives in `v2/games/ironhowl3/`.

- `art/masters/`: the 46 generated images at full size (WebP, quality 92), kept so the art can be processed again.
- `tools/process_art.py`: turns the original images into the game-ready files in `v2/games/ironhowl3/art/`. It resizes them, fixes tiling edges, and cuts out see-through parts. Run it with `python3 process_art.py <folder of NN-name.png>`.
- `vendor/three-ih3.min.js`: three.js r187 plus GLTFLoader and mergeGeometries, bundled with esbuild from `vendor/entry.js`. A copy sits in `v2/games/ironhowl3/js/`.
- `v2/games/ironhowl3/models/`: the Field & Forest pack, 19 models with near and far versions. `catalog.json` lists each model's size, collider, triangle count, where it belongs, and the six biome mixes.
- `v2/games/ironhowl3/preview.html`: the session 1 preview. It shows the forest models at game scale with a 4.5 m stand-in mech and both follow cameras.

Save keys: `hd-ironhowl3-` only.
