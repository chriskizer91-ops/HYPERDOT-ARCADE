# Prisma 3D art

These are Christopher's 38 images (Nov 2026, from `claude/prisma3d-image-list.md`), processed for the game. The originals aren't stored here. `build.py` embeds every `.webp` in the game file as a data URI.

To redo them from the original PNGs (one folder per zip, numbered 01–38):

```
python3 -I v2/src/prisma3d/tools/process_art.py   <folder with the zips unpacked> v2/src/prisma3d/art
python3 -I v2/src/prisma3d/tools/build_vehicles.py <same folder>                    v2/src/prisma3d/art
```

The tools need Pillow, numpy, scipy, scikit-image and pyfqmr.

| File | From image | Used for |
|---|---|---|
| `sky0`–`sky3` | 1–4 | Each stage's sky. Half a turn of the picture is ahead of you, and it mirrors itself behind you. |
| `moon` | 5 | The Skyway moon. |
| `skyline0`–`skyline2` | 6–8 | Far skylines. A mask cut along the rooftops lets the buildings hide the sky behind them. Two layers give depth. |
| `fac0`–`fac3` | 9–12 | Building fronts: office, glass, brick, and the market's upper floors. The seams are fixed so they repeat cleanly, and lit windows glow. |
| `shop0`, `shop1` | 13, 14 | The street-level shop fronts downtown and the market stalls. |
| `surf0`–`surf5` | 15, 16, 29, 30, 31, 32 | Tunnel tiles, concrete barrier, wet asphalt, pavement, the city below the skyway, and lantern paper. |
| `signs` + `signs.json` | 17–22 | All 38 signs cut out and packed into one atlas. The json gives each sign's place, shape and glow colour. |
| `ad0`–`ad5` | 23–28 | The giant video screens. |
| `veh_*` + `vehicles.json` | 33–36 | The vehicles, carved from the design sheets (see below). The alpha channel marks the parts that glow. |
| `decal` | 37 | The PRISMA logo on the bike's rear fairing. |
| `livery` | 38 | The GOLDLINE EXPRESS side of the van. |

**How the vehicles are carved.** Each view in a design sheet (side, back, front, or top) is cut out against the grey background. A point in 3D is part of the vehicle only if it falls inside every view's outline. That shape is smoothed, meshed, and simplified: 14,000 triangles for the bike, 10,000 for the van, about 4,200 per car and 5,000 for the drone. In the game, the sheet is projected back onto it: the side view onto the sides, the back view onto the back, and so on. Decals are placed in the vehicle's own coordinates, so text reads the right way round on both sides.
