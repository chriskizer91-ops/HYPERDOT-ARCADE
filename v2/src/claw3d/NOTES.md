# Plush Panic 3D (claw3d): build log

The plan lives in the claude.ai project as `claude/claw3d-design.md`. This file says what is built, how to rebuild it, and what comes next.

## Status

| Session | What | State |
|---|---|---|
| 1 | Christopher's 67 images processed; all 20 plush built as 3D models and painted | done |
| 2 | Soft-body physics in 3D, the claw rig, Wildwood playable (case, glass, lights, LED HUD, touch) | done |
| 3 | The three machines (Sugar Claw, Wildwood, Titan): cabinets, claws, lights, cameras, the machine picker; all three playable | done |
| 4 | Each machine's rules (keyrings; Titan's grab-then-loosen claw and CLOSER!), final odds, the win close-up, the collection | done |
| 5 | Polish: fabric fuzz, sound, phone performance pass, known fixes | next |

The game page is `v2/games/claw3d.html` (built by `python3 build.py`). Nothing else in the repo has been touched.

## The game

```
shell.html            the page: canvas, HUD canvas, GO/DROP buttons, picker arrows, pause menu, loading screen
js/00_base.js         fonts, audio synth, input, the cabinet contract (from Strike Night 3D, input reworked)
js/01_models.js       decodePlush(): the model format
js/02_sfx.js          the original Plush Panic's sound effects and music
js/03_assets.js       unpacks the art and models build.py packed into the page
js/10_phys.js         soft bodies in 3D: shape matching + springs, ball contacts with friction, the case and chute, sleep
js/11_claw.js         the claw: winch, pendulum head, geared prong servos, honest friction grip, the carriage
js/12_rings.js        Sugar Claw's keyrings: a ring on a chain per keychain; a prong through it lifts the keychain by its ring
js/20_machine.js      MACHINES (sugar, wild, titan): case, claw, odds, prizes; the credit sequence, wins, tickets,
                      the stock, the demo pilot; saveWorld/loadWorld keep each machine's pile while you look at another
js/30_gfx.js          three.js: the room, a Kit that merges parts per material, plush skinned on the GPU, the camera
js/31_hud.js          the LED dot HUD, the picker's name panel
js/32_cab.js          the three cabinets, bulbs and glows (over the marquees' painted bulbs), the three claws, keyring drawing
js/33_show.js         the win close-up: out of the prize door, the camera comes close, one turn, off to the collection
js/34_coll.js         the collection screen; each plush's picture is rendered from its model once (silhouettes for the rest)
js/40_play.js         aiming input, the picker, title/play/over, pause, frame loop, boot, the test hook
build.py              -> ../../games/claw3d.html (+ --dev PATH with the test hook)
art/machine/bulbs.json where the painted bulbs are on each marquee (found once by brightness; 34 / 7 / 33)
tools/bake_piles.js   settles three piles per machine ahead of time -> models/piles.json (build.py re-bakes it when
                      10_phys, 11_claw, 20_machine or the models change; --bake forces it). The page picks one at random.
test/picker.py        swipes, arrow taps, a tap on the machine and the arrow keys on the picker
test/show.py          the win close-up on each machine (drops a plush into the chute), screenshots as it runs
test/coll.py          the collection opened by the star button (phone) and C (laptop), and the game-over haul
test/machines.js      every machine's logic, no graphics: pile | grip | aim | play  (see the top of the file)
test/look.py          screenshots of the picker and one credit on each machine, laptop/phone; boot time, triangles, errors
test/touch.py         drags, taps and GO holds on a phone-sized screen, on each machine
test/embed.py         the published file in an iframe: ready, pause, resume, mute, no console errors
test/ptest.js, autoplay.js   the session-2 harnesses (Wildwood only)
```

How the three machines fit together:
- They stand in a row in a small room (MPOS in 30_gfx.js): Sugar Claw, Wildwood in the middle, Titan. Each is a three.js group; everything in it uses that machine's own coordinates, the same ones the physics uses (case floor y=0).
- Only the machine in front of you is simulated. Switching saves its whole world (every ball, the claw, the credit) and loads the other's; the other machines' plush stay drawn exactly as they were left.
- `UNIT` (10_phys.js) is the machine's size relative to Wildwood (Sugar .45, Titan 2.2). Distances in the rules that are not part of a toy (sleep speeds, slack, slip, carriage margins) scale with it.
- In play only the machine you are at is drawn (the side camera would be inside the next cabinet). One spotlight per machine; only the one you are at casts shadows.

Each machine's rules (session 4):
- Sugar Claw: every keychain has a ring on a ball chain (12_rings.js). The ring is a small weight on a chain: it flops,
  lies beside its keychain and swings. If a prong passes through it while the claw closes, it hooks; the keychain then
  hangs from its ring however weak the grip, until the claw opens. The claw itself is weak (IPI 8000), so the ring is
  the way to win: in simulated games about 3 wins in 4 came through a ring.
- Wildwood: plays like the original.
- Titan: like a real giant machine, the claw picks up at the credit's strength and loosens to 55% of it over the carry
  (carryK, carryT), so a giant often slips part-way, nearer the chute. Giants stay where they land between credits and
  games. A credit that moves a giant 26 cm or more toward the chute shows CLOSER! and pays 3 extra tickets. The demo
  pilot goes for the giant nearest the chute. The Star Dragon is heavier and slipperier than the others.

Measured in session 4 with the corrected harness (it restocks between games, as the machine does, and lets the pilot
aim at jackpots; session 3's numbers came from a case that emptied as the test went on):

| | Sugar Claw | Wildwood | Titan |
|---|---|---|---|
| Strength roll | 70-100% | 42-100% | 25-70% (55% of it while carrying) |
| Demo pilot, whole games | 96 of 180 credits (53%) | 59 of 240 (25%) | 32 of 360 (9%, about 1 in 11) |
| Target | 1 in 2 | 1 in 4 | 1 in 12 |
| Rule shows up | 71 of 96 wins through a ring | | CLOSER! in 49 of 360 credits |

The win close-up: SH in 33_show.js sets its times (out of the door 0.8 s, up 0.6 s, one turn 2.2 s, off 0.6 s). It waits
for its turn if two plush are won at once; the credit's result waits for it; a tap or any button skips to the end.
It is only in real games, not in the demo. The claw's own little spotlight lights it.

The collection: `hd-claw3d-prizes` (per plush: n, first, machine, and fresh until the collection has been opened).
The star button on the title screen shows how many of 20 and glows while something is new.

Numbers measured in session 3 (node / headless Chrome on this machine):

| | Sugar Claw | Wildwood | Titan |
|---|---|---|---|
| Case (inside) | 50 x 38 x 54 cm | 90 x 70 x 100 cm | 190 x 130 x 155 cm |
| Prizes in the case | 30 keychains | 22 plush | the 4 giants |
| Strength roll | 70-100% | 42-100% | 25-70% |
| Demo pilot, whole games | 41 of 80 credits (51%) | 25 of 110 (23%) | 7 of 180 (4%) |
| Good aim at one chosen prize, fresh case | about 1 in 3 (Gold Donut 0 of 18) | | about 1 in 5 (Star Dragon 0 of 16) |
| Triangles / draw calls in play | 83k / 72 | 89k / 74 | 48k / 67 |

The picker (all three drawn) is about 200-220k triangles. Physics: 0.3-2 ms a tick.

Loading (headless Chrome, software graphics): unpack 0.5 s, build the three machines 0.3 s, place the baked piles 0.8 s,
compile shaders 1.3 s. With the processor slowed 4x: 1.4 / 0.6 / 0.8 / 1.7 s. (Settling the piles while loading took
1.9 s, and 5.1 s slowed, before they were baked.)

Touch on a phone-sized screen, each machine: drags at 0.15 / 0.4 / 1 s and taps set the claw within 1% of the case's
width (Sugar 0.2-0.4 cm, Wildwood 0.5-0.8 cm, Titan 1.0-1.7 cm). The picker: a swipe of 60 px or more slides to the
next machine at any speed, 25 px does nothing, a tap on the machine plays it; arrows and keys stop at the ends. Target win rates were 1 in 2, 1 in 4 and 1 in 12; Titan's final tuning waits for session 4's rule (giants stay where you drop them, so a player can drag one closer each credit).

Tuning knobs: `IPI` per machine's claw in js/20_machine.js sets how hard a credit can squeeze (higher = weaker: Sugar 8000, Wildwood 1030, Titan 48); `RING.cap` in 12_rings.js how easily a prong catches a ring; `carryK`/`carryT` how much Titan loosens while carrying; `roll` sets the strength range; `PHMAX` how wide the claw opens (Titan 1.35 so a giant falls free); `ks`/`beta`/`ke` per plush type set squishiness.

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

- The camera swing to the side view takes about half a second; dragging during the swing works but the mapping moves with the camera.
- Whale: its tail is a block when seen from in front. The side photo shows it raised, the back photo shows the flukes flat.
- A thin dark line under some chins (fox, owl, hare, red panda, sloth). Hardly visible from the game's camera, which looks down.
- Red panda's tail is rough from directly behind.
