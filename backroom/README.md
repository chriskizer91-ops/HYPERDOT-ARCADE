# Hyperdot Arcade: the back room

The back room of [Hyperdot Arcade](https://github.com/chriskizer91-ops/HYPERDOT-ARCADE), in a repo of its own for now. The arcade itself (V1 and V2) is unchanged. When the door between them opens, this folder moves into the arcade's repo, next to `v2/`.

It runs on V2's engine: the same renderer, the same walking, the same cabinets. It has no pinball intro. You start just inside the door from the main floor.

## What's in it

| Where | What |
|---|---|
| Front wall | **The door to the main floor.** Frosted glass with the floor's neon behind it, under a MAIN FLOOR sign. It's sealed for now (CONNECTING SOON), and LOOK explains that. |
| Back wall, under BACK ROOM · GAMES IN PROGRESS | **What the Map Forgot**, a giant handheld on a pedestal, built after the game's own handheld. On the left, a doorway leads through to the Workshop. |
| Left wall, the GALLERY | Three framed pictures from Envoi. |
| Right wall | Two from What the Map Forgot. The Jester from Moon Faire hangs on the X Room's wall. |
| Through the doorway: **the Workshop**, under THE WORKSHOP · UNFINISHED GAMES | Unfinished games, each on a cabinet built to look like its game. **Envoi on the Longest Night** is a moonlit gothic shrine: a pointed arch with gilt trim, a stained-glass rose window, a crescent moon, candles on the steps, motes of magic drifting round it, and the key art on its front. **Moon Faire** is a booth at a night faire: a striped tent with a valance of chasing bulbs, a velvet curtain, a gilt playbill screen, a full moon on the peak, and the performers on cut-out boards either side. On the right wall, **the Howler**, Ironhowl's mech cockpit: a mech kneeling with its chest hatch open. Climbing in offers Ironhowl 3D or the Retro 2D original, both played from the main arcade's site, so it's always the newest build. In the middle, **Redline County**: the front half of the game's stock SUV (warm grey, chrome twin-bar grille, six-spoke wheels, mud up the sides) on a patch of the game's own tyre-tracked dirt. Climb into the driver's seat and the windshield is the screen, with a choice of *Road Not Found + Traffic* (heavy: best on a laptop) or *Salt & Sand* (runs well on phones). In the back corner is the next one, a cabinet still being built (NEXT UP), with a work light, sawhorses and paint. A workbench sits under a pegboard of tools. |
| The Workshop's middle and side walls: **the upgrades** | One cabinet for each game being rebuilt in V2, built like its game. Each one plays from the main arcade's site, so it's always the newest build, and offers the new version and the Retro 2D original. **Strike Night** is a short blacklight lane with ten pins and a ball return. **Voidlance** is a starfighter's cockpit on a docking cradle, its lance nose pointed at the wall. **Voltfist** is two cabinets back to back with a championship belt on top. **Prisma** is a hover-bike over a glowing pad, with light trails and rain. **Molten** is a brick forge with a glowing mouth, a crucible pouring and ice creeping in. **Plush Panic** is a tall candy-pink claw machine full of plushes. **Lantern** is an iron street lamp on cobbles, with moths round its flame (The Long Night, Lantern 3D, or Retro 2D). The Howler also offers Ironhowl 3. **Air Hockey 3D** gets a full-size table like the game's own Classic table (a white surface pricked with air holes, a pink-lit rim, blue creases), under a hanging scoreboard and lamp; a puck glides across it on its own while nobody's playing. |
| Back right corner | **The X Room**, a closet through its own door. It holds five lit panels: What this is, Collaboration + augmentation, The part that's mine, The future of media, and Open by design. |

Every picture and panel works like a machine. Walk up and press VIEW or READ (E or Enter). The picture or the words open full size, and ← Arcade (or Esc) brings you back.

## The games

`games/envoi.html`, `games/moonfaire.html`, `games/mapforgot.html`, `games/roadnotfound.html`, `games/saltsand.html` and `games/airhockey3d.html` are the builds as Christopher shared them, unchanged. The Howler's two games aren't copied here: it opens them from the main arcade's site (`../HYPERDOT-ARCADE/`). None of them speaks the cabinet contract yet. The cabinet is told so (`bridge:false`), and it lifts its loading screen as soon as the game's page has loaded. They don't award tickets. Leaving works as for any game: hold Esc, or the ← Arcade pill.

To update a game, replace its file in `games/`.

## Changing things

- **The words on the panels** are at the bottom of `src/arcade/src/m4_backroom.js`, one `Panel({...})` each. They were drafted from Christopher's own words and are his to rewrite.
- **A picture**: put the image in `art/` and add an `ArtFrame({...})` line in the same file, with its width and height in metres.
- **A cabinet with more than one game**: a machine's `game` can be `{title, choices:[{title, sub, src}, ...]}`. Sitting down then shows a choice between them.
- **A themed cabinet** for another unfinished game: the Workshop's builders are in `src/arcade/src/m7_workshop.js`, one function per cabinet. Copy the nearest one and change it.

Then build:

```
python3 src/arcade/build.py
```

That writes `index.html` from V2's `shell.html` (copied into `src/arcade/` unchanged) and the modules in `src/arcade/src/`:

| Module | What it is |
|---|---|
| `m0_backroom.js` | the room: the walls, the X Room's walls and door, the ceiling, the lights, the signs |
| `m1_host.js` | V2's game host, plus reading cards (panels, pictures, the door) and the chooser for a cabinet with more than one game |
| `m2_cabinets.js`, `m3_tables.js` | V2's cabinets and tables, unchanged |
| `m6_parts.js` | the back room's own machines: the giant handheld, the panels, the frames, the sealed door |
| `m7_workshop.js` | the Workshop's cabinets: Envoi's shrine, Moon Faire's booth, the Howler, the Redline County SUV, the half-built NEXT UP, the workbench |
| `m8_upgrades.js` | the upgrades' cabinets: the lane, the cockpit, the versus cabinets, the hover-bike, the forge, the claw machine, the lamp post, the air hockey table |
| `m4_backroom.js` | the floor plan |

`build.py` also makes a few small changes to the shell, and checks that each one matches exactly once:
- the room's size (the back room, the X Room and the Workshop)
- where you start
- no intro
- the camera stays on your side of the X Room's walls

## Run it

Serve the folder over HTTP (any static server works) and open it:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

GitHub Pages works as is. The `.nojekyll` file stops Pages from processing the folder.

## Tickets

The back room shares V2's wallet (`arcade2-tickets`), so whatever you win in one is there in the other once the door opens.
