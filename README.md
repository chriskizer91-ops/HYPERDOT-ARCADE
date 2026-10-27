# Hyperdot Arcade

A walkable low-poly 3D arcade. You start at a pinball machine that glitches, dive through it and fall through the ceiling. Then the lights come up on a floor of cabinets, and every one of them is a real game.

`index.html` is the arcade itself. It's one file, about 260 KB. Every game is a separate HTML file under `games/`. A game loads only when you sit down at its cabinet, and its memory is freed when you leave.

## Run it

Serve the folder over HTTP. Any static server works:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

Opening `index.html` straight from disk (`file://`) doesn't work, because cabinets load their games and attract loops with `fetch` and iframes. GitHub Pages works as is. The `.nojekyll` file stops Pages from processing the folder.

## Controls

| | Keyboard / mouse | Touch | Gamepad |
|---|---|---|---|
| Walk | WASD or arrows | left-thumb stick | — |
| Look | drag | drag on the right | — |
| Use a machine | E or Enter | tap the prompt | — |
| Leave a machine | hold Esc (0.9 s), or the ← Arcade pill | the ← Arcade pill | hold Back / View |
| Sound | M, or the Sound pill | Sound pill | — |

## The floor

| Zone | Machines |
|---|---|
| Video (left wall) | Star Vanguard (built into the arcade), Hyperdot, Voltfist, Ironhowl, Voidlance, Lantern, Molten |
| Deluxe (back left) | **Skies of Aethermoor**, a little airship. You climb into its gondola, and the full game runs with an optional LED-glass overlay (G toggles it, Shift+G changes the dot size). Next to it is **Ultramassive**, the deluxe pinball with its own side art, topper and DMD. |
| Back wall | Cyclone (ticket wheel), Sky Stack, Whack Shack |
| Racing (back right) | Redline and Shiftlight sit-down cabinets, Prisma ride-on hover bike |
| Pinball (right wall) | Supermassive, **The Hollow Crown** (a lantern-lit dungeon crawler, in a gilt cabinet with a crown on top), and one machine under a dust sheet (coming soon) |
| Redemption (middle) | Plush Panic (claw), Coin Cascade (pusher), Ring Roller, Bucket Blitz, Strike Night, Air Hockey (built in) |
| Prizes (front left) | The prize counter and **Your Shelf** |

## Tickets and prizes

Games award tickets when a run ends. The arcade keeps the total in `localStorage` (`arcade-tickets`).

At the prize counter you spend tickets on 12 prizes, from a 25-ticket bouncy ball to a 5,000-ticket golden token. Whatever you redeem appears on Your Shelf, next to the counter, and stays there between visits (`arcade-prizes`).

## The cabinet contract

Each game is a complete HTML document that runs standalone, and inside the arcade when it's loaded with `?embed=1`. The two sides talk with `postMessage`:

Game → arcade (`{src:'hyperdot', type, id, ...}`):

| type | when | fields |
|---|---|---|
| `ready` | the game can take input | |
| `score` | the score changed | `score` |
| `over` | a run ended | `score`, `tickets` |
| `exit` | the player chose to leave from the game's own menu | |

Arcade → game (`{src:'hyperdot-arcade', cmd}`): `start`, `pause`, `resume`, `attract`, `mute`, `unmute`. Aethermoor also takes `glass`.

Each game stores its own data under `hd-<id>-…` keys.

The big games (Ultramassive, Supermassive and Aethermoor) weren't written to this contract. Each one carries a small shim and bridge instead. The shim mutes and pauses the game from outside. The bridge reads its state and posts the messages above.

## Adding or updating a game

1. Drop the file into `games/`. Shiftlight is `games/shift.html`, so a new build of it just replaces that file.
2. Give it a cabinet in the floor plan (`src/m4_floor.js` in the build sources): `Upright`, `Racer`, `BikeRide`, `Pinball`, and so on, with `game:G_('<id>','<TITLE>')`.
3. Optionally, record an attract loop: `attract/<id>.webp` (a sprite sheet) and `attract/<id>.json` (`{w,h,n,cols,fps}`). Until a loop exists, the cabinet's screen scrolls the game's name.

The machine under the dust sheet on the right wall is a placeholder for the next game.

## Engines

Redline and Prisma get their engine sound from the **Shiftlight Engine Lab**. The Lab's synth and its engine catalogue are copied unchanged into `src/kit/hdlab.js`. That synth renders every cylinder firing, sample by sample, through waveguide pipes.

A small host runs several engines in one AudioWorklet. Next to each engine sits an ECU that handles:
- turbo spool and blow-off
- superchargers
- cam lope at idle
- the starter
- the two-step

Distance and Doppler come from the synth itself: it delays each car's sound by the time the sound takes to reach you.

To change an engine, edit the table at the top of `src/redline/6_audio.js` (`ENGINE_SPECS`) or the two lines near the top of `src/prisma/4_game.js` (`BIKE_ENG`, `TG_ENG`). Either use a Lab preset id (`v10`, `gp`, `v12`, `flat6`, `rotary3`, `muscle`, `flatplane`, `five`, `six`, `boxer`, `screamer`, `blown` and so on), or paste a spec from the Lab's **Copy engine spec** button. Then run `python3 build.py` in that folder and copy `<id>_pub.html` to `games/<id>.html`.

## Layout

```
index.html            the arcade
games/*.html          one file per game
games/ultramassive/   index.html + img/ + music/ (split out of the single-file build)
games/supermassive/   the same
attract/              recorded attract loops for the cabinet screens
src/arcade/           the arcade's build: intro_v2.html plus src/m0..m5 (room, host, cabinets, tables, floor plan, prizes)
                      python3 build.py writes index.html at the root
src/kit/              the Engine Lab kit (hdlab.js), the cabinet shim and bridge used by the big games,
                      Aethermoor's LED-glass layer, the cabinet starter and the quick-play brief
src/<game>/           the modular sources for the games that are built from modules (python3 build.py in each)
```

Shiftlight, Ultramassive, Supermassive, Skies of Aethermoor and The Hollow Crown were built separately and are included as finished builds, with no module sources here. Aethermoor and the two pinball games also carry the arcade shim and bridge, and the pinball games are split into a page plus their images and music.
