# Hyperdot Arcade V2

A second, separate arcade in the same repo. V1 at the root (`index.html`) is untouched. V2 lives here in `v2/` and is published next to it, at `<your pages address>/v2/`.

V2 started as a copy of V1 and then got a new renderer, a rebuilt room and a reworked intro. It plays the same games as V1, loaded from the shared `../games/` and `../attract/` folders, plus **Shiftlight 3**, which is in V2 only.

## Run it

Serve the repo root over HTTP and open `/v2/`:

```
python3 -m http.server 8000
# then open http://localhost:8000/v2/
```

V2 has to be served from inside the repo, because the games and attract loops it shares with V1 are one folder up.

## What's different from V1

**The renderer**
- Haze: coloured lights glow in the air, and spotlights on the ceiling trusses throw visible beams onto the feature machines.
- Bloom: a wide mip-chain bloom, with a horizontal streak on the brightest neon.
- Contact shadows: a map of the floor darkens what stands close together and along the walls, so machines sit on the floor.
- Surfaces: every surface has a gloss and a metal value. Chrome, glossy black and satin cabinet paint reflect a neon environment.
- Floors: the landing pad, the mat at the doors, the chequered pit lane and the deluxe corner are polished, and show true reflections of the room.
- Finish: colour grading, film grain and a little colour fringe at the edges.

**The room**
- Walls: glossy black wainscot under a chrome rail, and ribbed upper walls washed by a cove of LED light.
- Ceiling: an open black ceiling with lighting trusses, a few soft house lights, and rows of blacklight tubes. The carpet glows in pools under them; the carpet itself is unchanged.
- Fixtures: a bigger main sign with chasing bulbs, and three neon rings turning over the front of the floor.
- Front wall: glass doors onto a rainy street, and a synthwave mural.
- Bare walls: backlit posters.
- The player: a new character, in a hoodie with headphones and light-up sneakers.

**The intro**
The pinball table is the same simple table, still the joke. Everything after "STEP INSIDE" is new:
1. You fall down a tunnel of LED dots and past the arcade's own games, playing their attract loops on screens on the tunnel walls.
2. The ceiling breaks. Tiles and bits of blacklight tube tumble in slow motion with sparks and dust, and a shaft of pink light pours through the hole into the dark room.
3. You land: a shockwave runs out across the screen, dust kicks up, and the landing pad lights first. The wave runs on across the floor and switches everything on as it reaches it: lights, beams, signs and screens.
4. The camera cranes up and back over your shoulder as the room lights, swings round behind the turning rings, and comes to rest on the main sign.
5. The debris comes apart into dots and floats back up to mend the ceiling, and the camera settles behind you as your character rezzes in.

Its beats are all timed from `TL` in `src/arcade/shell.html`. The crane's path is `CR`, and where it looks is `CRT`.

## Quality

V2 picks **high** on a desktop and **medium** on a phone or tablet. Medium draws the haze and the reflections at lower resolution. If the frame rate can't hold while you walk, or while the intro shows the room, it steps down by itself, to **low** at the bottom. Low drops the haze, the streaks and the reflections.

To pin a level, add `?q=low`, `?q=med` or `?q=high` to the address.

## Tickets and prizes

V2 has its own wallet and shelf: `arcade2-tickets` and `arcade2-prizes` in `localStorage`, and `arcade2-mute` for the sound switch. Tickets won in one arcade don't show up in the other.

The games still keep their own scores and settings under their `hd-<id>-…` keys, so those are shared.

## Shiftlight 3

The deluxe motion sim on the right wall now plays Shiftlight 3. Its prompt says Play, and climbing into the seat opens the game.

`games/shift3.html` is the finished build with a small arcade bridge added at the end, `src/shift3/bridge.js`. The bridge doesn't change the game; it talks to the arcade through the game's own `window.__game` handle:

| Direction | Message | When |
|---|---|---|
| game → arcade | `ready` | the title screen is up |
| game → arcade | `over` | any results screen: 40 tickets for 1st, 20 for 2nd, 10 for 3rd, 4 for finishing |
| arcade → game | `pause`, `resume`, `mute`, `unmute` | |

For a new build of the game:

```
python3 v2/src/shift3/add_bridge.py path/to/new-shiftlight3.html
```

That writes `v2/games/shift3.html` with the bridge in it. Running it again only replaces the bridge.

## Building

```
python3 v2/src/arcade/build.py
```

This writes `v2/index.html` from two sources:
- `src/arcade/shell.html`: the engine, the renderer and the intro. It began as V1's `intro_v2.html` with V1's build patches already applied, and V2 edits it directly.
- The modules in `src/arcade/src/`, put in at the shell's two markers:
  - `m0_room`: the room
  - `m1_host`: the game host
  - `m2_cabinets` and `m2b_simpod`: the cabinets and the sim pod
  - `m3_tables`: the tables and redemption games
  - `m4_floor`: the floor plan
  - `m5_prizes`: the prize counter

## Layout

```
v2/index.html          the V2 arcade (built)
v2/games/shift3.html   Shiftlight 3, with the arcade bridge
v2/src/arcade/         shell.html + src/m0..m5 + build.py
v2/src/shift3/         bridge.js + add_bridge.py
```
