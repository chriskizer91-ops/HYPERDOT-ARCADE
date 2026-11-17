# Hyperdot Arcade: the back room

The rooms behind the main floor of [Hyperdot Arcade](../README.md). You get here through the BACK ROOM door on V2's back wall, or by opening `backroom/` directly.

It runs on V2's engine: the same renderer, the same walking, the same cabinets. It has no pinball intro. You start just inside the door from the main floor.

## The rooms

| Room | What's in it |
|---|---|
| **The main room** (18 × 22 m) | The 3D rebuilds of the arcade's games, under the BACK ROOM · 3D REBUILDS sign, and the gallery by the door. |
| **The Workshop** (18 × 12 m), through the doorway in the far wall | The unfinished games. All of them play. |
| **The X Room**, a closet on the right | Five lit panels about what this place is. |
| **The empty room** (10 × 10 m), through the doorway in the left wall | Nothing yet. It's lit and dressed like the rest. |
| **The endless room** | A secret. See below. |

### The main room

| Where | What |
|---|---|
| Front wall | **The door to the main floor**: frosted glass under a MAIN FLOOR sign. ENTER takes you back to V2, in front of its BACK ROOM door. |
| By the door | **The gallery.** Three pictures from Envoi on the left wall, with a bench. Two from What the Map Forgot and the Jester from Moon Faire on the X Room's outside wall. |
| Right wall, by the door | **Molten**, a brick forge with a glowing mouth, and **Plush Panic**, a tall candy-pink claw machine. |
| Middle of the floor | **Air Hockey 3D** (a full-size table under a hanging scoreboard), **Voltfist** (two cabinets back to back with a championship belt on top), **Voidlance** (a starfighter's cockpit, its lance pointed at the sign) and **Prisma** (a hover-bike over a glowing pad). |
| Left wall, at the far end | **Strike Night**, a short blacklight lane with its pins at the far wall. |
| Far wall | **Lantern**, an iron street lamp. **What the Map Forgot**, a giant handheld on a pedestal under the sign. The doorway to the Workshop is on the right. |
| The nook behind the X Room | **The Howler**, Ironhowl's mech, kneeling with its chest hatch open. |

Each rebuild's cabinet offers the new version and the Retro 2D original. They play the arcade's own builds from one folder up (`../v2/games/`, `../games/`), so they're always the newest.

### The Workshop

**Envoi on the Longest Night** (a moonlit gothic shrine) and **Moon Faire** (a booth at a night faire) stand on the far wall under THE WORKSHOP · UNFINISHED GAMES. **Redline County** is the front half of the game's SUV on a patch of dirt; climb in and the windshield is the screen. Along the left wall are the workbench and a cabinet that's still being built.

Three newer cabinets stand round them. **Ironhowl 4** plays on the Wraith. The other two are ready for games that aren't in yet: their button says LOOK and opens a card about the game.

| Cabinet | For | What it is |
|---|---|---|
| **The Wraith**, right wall | Ironhowl 4 (plays) | The recon mech from the game: orange over gunmetal, a wolf's head, bent-back legs on clawed feet, a jet pack, the Lance on its right arm. It crouches on a timber skid with its chest hatch dropped as a ramp. |
| **The bogged Rock & Mud**, left of the SUV | Mud Lab (card) | The front half of the Rock & Mud, sunk to its axles in a patch of mud, with its winch line run out to the pull-test post, a field table of soil jars and the game's title board. |
| **The Showroom**, back right | Salt & Sand Showroom (card) | A black backdrop and a turntable. A model of the stock SUV turns on it under two spots, then the Rock & Mud takes its place. |

### The endless room

A stretch of the X Room's far wall, in the corner to the left of the panels, looks like wall and isn't. Walk into it and you come out in a hall that never ends: a polished black floor, and an arch of chrome and LED every 6 m, pink and then cyan. The line at the top of the screen shows how far you've walked. From inside, the way back is marked X ROOM.

How it never ends: the hall is built 144 m long and repeats every 12 m. Once you're 66 m in, every time you walk out of a 12 m window you and the camera are put back 12 m, onto a spot that looks the same. Walking back undoes it, so the door is always as far behind you as you walked. The camera sees 60 m, so neither end of the hall is in view from the window. The numbers are `EN` at the top of `src/arcade/src/m0_backroom.js`.

## The games

`games/envoi.html`, `games/moonfaire.html`, `games/mapforgot.html`, `games/roadnotfound.html`, `games/saltsand.html` and `games/airhockey3d.html` are the builds as Christopher shared them, unchanged. The rebuilds aren't copied here: their cabinets open them from the arcade's own folders.

Air Hockey 3D speaks the cabinet contract. The other five don't yet: their cabinets are told so (`bridge:false`) and lift the loading screen as soon as the game's page has loaded, and they don't award tickets. Leaving works as for any game: hold Esc, or the ← Arcade pill.

`games/ironhowl4/` is Ironhowl 4, the build of 15 Nov 2026 (the game's commit `e3fe25c`). It is a folder, not one file, so a phone only downloads what it uses: the page and its scripts, `art/`, `models/`, and the kit and foe models in `m4/`. It is about 136 MB, 85 MB of that the full-detail models the mod bay shows on a laptop. It speaks the cabinet contract and awards tickets.

To update a game, replace its file in `games/`. To update Ironhowl 4:

```
python3 backroom/src/ironhowl4/bring_in.py <a clone of the iron-howler-4 repo> <branch or commit>
```

That rewrites `games/ironhowl4/` from the game's repo. Its one change to the game is a line in `index.html` saying where the kit and foe models are.

## Changing things

- **Where a machine stands**: `src/arcade/src/m4_backroom.js`, one line per machine, with its `x`, `z` and the way it faces (`ry`).
- **The walls and doorways**: the top of `src/arcade/src/m0_backroom.js`. `ZB` is the wall between the main room and the Workshop, `WD` the doorway in it, `CL` the X Room, `ER` the empty room, `EN` the endless room.
- **The words on the panels**: the bottom of `m4_backroom.js`, one `Panel({...})` each. They were drafted from Christopher's own words and are his to rewrite.
- **A picture**: put the image in `art/` and add an `ArtFrame({...})` line in the same file, with its width and height in metres.
- **A cabinet with more than one game**: a machine's `game` can be `{title, choices:[{title, sub, src}, ...]}`. Sitting down then shows a choice between them.
- **A themed cabinet** for another game: the builders are in `m7_workshop.js`, `m8_upgrades.js` and `m9_next.js`, one function per cabinet. Copy the nearest one and change it.
- **Putting a finished game on a cabinet that shows a card**: put the game's file in `games/`, then in `m4_backroom.js` replace that cabinet's `game:soon(...)` with `game:G_('<id>','<TITLE>',{deluxe:true})`. Add `bridge:false` if the game doesn't speak the cabinet contract. The button then says PLAY.

Then build:

```
python3 backroom/src/arcade/build.py
```

That writes `backroom/index.html` from V2's `shell.html` and these modules:

| Module | What it is |
|---|---|
| `m0_backroom.js` | the rooms: walls, doorways, ceilings, lights, signs, and the endless room |
| `m1_host.js` | V2's game host, plus reading cards (panels, pictures) and the chooser for a cabinet with more than one game |
| `m6_parts.js` | the giant handheld, the panels, the picture frames |
| `m7_workshop.js` | Envoi's shrine, Moon Faire's booth, the Howler, the Redline County SUV, the half-built cabinet, the workbench |
| `m8_upgrades.js` | the rebuilds' cabinets: the lane, the cockpit, the versus cabinets, the hover-bike, the forge, the claw machine, the lamp post, the air hockey table |
| `m9_next.js` | the newest cabinets, for games still being built: the Wraith, the bogged Rock & Mud, the Showroom |
| `m4_backroom.js` | the floor plan |

The shell, `m2_cabinets.js`, `m3_tables.js` and `m6_doors.js` are read from `v2/src/arcade/`, so there is one copy of each. A change to V2's shell reaches the back room the next time it's built.

`build.py` also makes a few small changes to the shell, and checks that each one matches exactly once:
- the size of the box round all the rooms
- where you start
- no intro
- the camera stays on your side of the walls between rooms
- the air thickens in the endless room

## Run it

Serve the repo's top folder over HTTP and open `/backroom/`:

```
python3 -m http.server 8000
# then open http://localhost:8000/backroom/
```

It has to be served from inside the repo, because the rebuilds' games are one folder up.

## Tickets

The back room shares V2's wallet (`arcade2-tickets`), so whatever you win in one is there in the other.
