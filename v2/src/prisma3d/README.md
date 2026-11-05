# Prisma 3D

The 3D version of Prisma, the night pursuit on a hover-bike. The original (`games/prisma.html`, `src/prisma/`) stays as it is, as the cabinet's "Retro 2D" choice. This version is `v2/games/prisma3d.html`, one self-contained file.

## Build

```
python3 v2/src/prisma3d/build.py
```

The build joins `shell.html`, `js/*.js` (in name order) and the art in `art/` into `v2/games/prisma3d.html`. The file is about 8.4 MB; the art is most of it.

## What's in it

| File | What it does |
|---|---|
| `js/1_core.js` | Fonts, sound, input. The touch stick jumps to wherever your thumb lands on the left side. |
| `js/2a_gl.js` | WebGL2 setup, render targets, and the mesh builder (boxes, lofts, tubes, rings). |
| `js/2b_engine.js` | The Shiftlight Engine Lab synth, copied unchanged from the original. |
| `js/2c_shaders.js` | The world shader (city, vehicles, wet road), the sky, the light streaks, and the post passes (glow, prism trails, the final picture with the dot HUD). |
| `js/2d_city.js` | The city, built in 96 m chunks: blocks, signs, lamps, lanterns, the skyway and the tunnel. |
| `js/2e_models.js` | The vehicles, built in code: bike and rider, the gold van, five traffic shapes, drones and ramps. |
| `js/2f_render.js` | The frame: the mirror pass, the scene, glow, prism trails, the final picture, and quality levels. |
| `js/3_world.js` | The original's game world (road curve, bike, traffic, van, drones). Only the save key changed. |
| `js/4_game.js` | The original's game flow and scoring, plus the new superbike engine tuning. |
| `js/5_view.js` | Cameras (chase and helmet) and the dot-matrix HUD. |
| `js/6_main.js` | The frame loop, the pause menu and boot. |
| `js/2g_art.js` | Loads Christopher's images onto the GPU, and builds the carved vehicles. The code-made look stays as the fallback until each picture is decoded. |
| `art/` | The processed images (see `art/README.md`). |
| `tools/` | The scripts that made `art/` from the original images. |

## How it works

- **Track space.** The city is built in the same coordinates the game logic uses: across the road, height, and distance along it. The vertex shader bends everything onto the road's curve, so plain boxes follow every bend and hill.
- **Wet road.** The city is drawn a second time, mirrored under the road, into a small picture. The road reads that picture back, with puddles sharp and dry patches smeared into streaks.
- **Prism trails.** Each frame's brightest light is fed back into itself, pushed out from the point you're flying toward. Red is pushed a little further than blue, so streaks split into colour. The faster you go, the longer they get. Nitro adds a ring of spectrum.
- **Engine.** A 1.0 L superbike four that revs to 14,000 rpm. It cruises at about 72% of redline in sixth gear, and boost pads lift it to about 90%. Only nitro reaches the limiter. When nitro ends, the overrun pops on the way back down. On jumps, the revs flare, then pop while the rider is off the throttle in the air.

## Quality

Pick Low, Medium or High in the pause menu. Auto is the default: High on a laptop, Medium on a phone, and it steps down if the frame rate can't hold.

| | Pixels drawn | Antialiasing | Mirror | Speed-blur taps | Rain drops | Lights |
|---|---|---|---|---|---|---|
| Low | 0.55 M | off | off | 4 | 450 | 6 |
| Medium | 1.1 M | 2× | 42% size | 6 | 850 | 10 |
| High | 2.4 M | 4× | 50% size | 10 | 1400 | 14 |

## Cabinet contract

The id is `prisma3d`. It speaks the cabinet contract from the main README:
- **Sends:** `ready`, `score` and `over` (tickets are the score divided by 2,500), plus `exit` from the pause menu's EXIT.
- **Obeys:** `start`, `pause`, `resume`, `attract`, `mute` and `unmute`.

Saves use only `hd-prisma3d-` keys: `hi`, `assist`, `mute`, `view`, `q` and `voice`.

## Testing

Add `?test=1` to the address to get the `window.__pr` hooks the headless tests use:
- `ff(seconds)` runs the game forward without drawing.
- `stats()` reports chunks, triangles, render size and quality.
- `cam(fn)` overrides the camera.
- `setView(m)` and `setQuality(i, auto)` change the view and quality.

Without `?test=1` none of this is exposed.
