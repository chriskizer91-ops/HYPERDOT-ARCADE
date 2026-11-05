# Plush Panic 3D (claw3d): build log

The plan lives in the claude.ai project as `claude/claw3d-design.md`. This file says what is built, how to rebuild it, and what comes next.

## Status

| Session | What | State |
|---|---|---|
| 1 | Christopher's 67 images processed; all 20 plush built as 3D models and painted | done |
| 2 | Soft-body physics in 3D, the claw rig, Wildwood playable in a plain box | next |
| 3 | The three machines (cabinets, glass, lights, camera), the machine picker | |
| 4 | Each machine's rules, tickets, the collection, the win close-up | |
| 5 | Sound, phone performance, touch tests, cabinet contract, publish `v2/games/claw3d.html` | |

The game page `v2/games/claw3d.html` does not exist yet. Nothing outside `v2/src/claw3d/` has been touched.

## Folders

```
art/plush/<id>_{front,side,back}.webp   cut-out views of each plush (inputs to build_plush.py)
art/plush/meta.json                     sizes of each view and of the original sheets
art/machine/<m>_{marquee,wall,side}.webp the marquee, back wall and side art (m = sugar, wild, titan)
art/fabric/*.webp                       512 px seamless fabrics: minky, longfur, sherpa, felt, velvet, satin
art/extra/reflect.webp, cover.webp      the arcade (for reflections) and the cover art
models/<id>.bin + <id>.webp             each plush: mesh, paint coordinates, physics points, skin weights + its texture
models/index.json                       counts and sizes
ref/                                    small copies of the machine and claw pictures and the full sheets (not shipped)
tools/process_art.py                    67 originals -> art/
tools/build_plush.py                    art/plush -> models/   (the shape rules per plush are in PARTS at the top)
tools/preview.html, tools/shot_plush.py look at the models in headless Chrome
vendor/three.module.min.js              three.js r170 (same copy as bowl3d)
```

## Rebuild

```
pip install --break-system-packages rembg onnxruntime trimesh fast-simplification xatlas scikit-image
python3 tools/process_art.py /path/to/originals          # the 67 PNGs from Christopher's zips (not in the repo)
python3 tools/build_plush.py                             # all 20, or name some: build_plush.py fox dino
python3 tools/shot_plush.py out.jpg fox dino --pitch=26  # four sides each; --grid=5 --yaws=22 for one view each
```

`process_art.py` needs the isnet-general-use model in `~/.u2net/` (rembg fetches it from its GitHub releases).

## How a plush is made (build_plush.py)

1. The front photo gives the outline left to right, the side photo gives the depth. Each height is a rounded slice: `|u|^2.2 + |v|^2.2 <= 1`.
2. Outlines are smoothed first (small bumps would become rings round the whole toy).
3. Rules per plush in `PARTS`: `thin` colour ranges become flat slabs (moth and dragon wings, placed where the side photo shows them); `feat` makes snouts and tails round features down the middle instead of shelves across the toy; `sopen`/`ssmooth`/`fsmooth` set how much the outlines are smoothed; `p` is roundness.
4. Marching cubes, Taubin smoothing, decimation to the budget (Sugar 2,400 triangles, Wildwood 3,600, Titan 7,000), normals from the volume.
5. xatlas unwraps it; every texel takes its colour from the front, side and back photos that can see it. The back photo is first lined up with the model's outline. Texels under chins are lifted a little, because the photos already hold that shadow.
6. Physics points: k-means through the inside, each a ball reaching the skin (Sugar 28, Wildwood 40, Titan 64). Each vertex follows its 4 nearest points.

Model format: see `write_bin()` in build_plush.py; the matching decoder is `decodePlush()` in tools/preview.html.

## Known things to fix

- Whale: its tail is a block when seen from in front. The side photo shows it raised, the back photo shows the flukes flat.
- A thin dark line under some chins (fox, owl, hare, red panda, sloth). Hardly visible from the game's camera, which looks down.
- Red panda's tail is rough from directly behind.
