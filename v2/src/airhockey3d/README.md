# Air Hockey 3D

The arcade's air hockey table, rebuilt from the ground up. The original is the small table built into V1 and V2's floor (`AirHockey()` in the arcade's shell), and it stays there, untouched. This is a separate game: `v2/games/airhockey3d.html`, one self-contained file of about 820 KB. It plays in the back room's Workshop, on a real air hockey table.

## What it is

- **A real table.** A 2 × 1 m deck with rounded corners, 2.2 m long over the rails. The rails are brushed aluminium over a black rubber bumper. The goals are slots cut into the foot of each end rail: the puck slides in under the rail, drops down a lit chute and rattles away. The puck is 81 mm across and the mallets are 100 mm, the sizes of real ones.
- **Real air.** The puck rides on air: a little drag that grows with speed and almost no friction, so it glides and keeps bouncing. It spins, and spin bends its bounces off the rails. A glancing hit puts spin on it. A puck pinned between a mallet and a rail stops the mallet, so you can't shove it through.
- **Physics you can trust.** Eight substeps per tick (480 a second). The mallet's contact with the puck is a swept test, so even a full-speed flick can't pass through the puck. Tested on 3,000 random shots (no escapes, every goal through the mouth) and 500 full-speed flicks (no misses).
- **Full-resolution 3D in three.js** (r170, vendored in `vendor/`). The deck is glossy, with a grid of air holes drawn by its shader so they stay sharp, true planar reflections of the mallets, puck and scoreboard, and a light show that rings out from the goal when someone scores. An LED strip on the rails shows each player's colour. A lamp casts the shadows. The cabinet has neon side art and an underglow on blacklight carpet. A two-sided LED scoreboard hangs over the table.
- **The dots stay.** The HUD (score, GOAL!, the shot's speed, serves, MATCH POINT, REPLAY) is drawn as LED dots over the 3D picture, the house look. **Dots** in the menu runs the whole picture through the LED filter.
- **Two tables.** *Classic*: a white deck, red and blue lines, a red puck. *Neon*: a black deck with glowing lines and a glowing puck.

## How to play

| | Laptop | Phone / tablet | Gamepad |
|---|---|---|---|
| Move your mallet | the mouse (it goes where you point), or arrows / WASD | drag anywhere: the mallet stays just ahead of your finger | left stick / d-pad |
| Two players | P1: mouse or arrows (right side), P2: WASD (left side) | each player drags on their own half of the screen (a phone flat on a table works) | pad 1 and pad 2 |
| Pause | Esc, or the Pause chip | the round II button | Start |
| Skip a replay | click or Space | tap | A |

Your mallet stays on your half. The player who was scored on gets the puck.

**One player** plays a ladder of five rivals. Each one you beat unlocks the next:

| Rival | Style |
|---|---|
| PIXEL, rookie | slow hands, soft shots |
| BLITZ, the slammer | hits everything hard, leaves the goal open |
| BRICK, the wall | plays deep, hard to score on, waits for your mistake |
| RICO, bank shots | plays the rails |
| APEX, champion | fast, sharp, no wasted moves |

A CPU player moves its hand the way a person does: it has a top speed and an acceleration, sees the puck a moment late and guesses ahead, and its aim wavers. Each rival has its own numbers for all of these (`RIVALS` in `js/02_ai.js`). It reads the puck's bounces to block, gets behind the puck to shoot (straight, or off a rail by aiming at the goal's mirror image), meets slow pucks with a counter-hit, and digs pucks out of corners. A CPU that's far ahead eases off a little; one that's behind digs in.

Round-robin on autopilot (8 matches each, first to 7): APEX beats everyone; RICO and BRICK beat BLITZ and PIXEL; BLITZ beats PIXEL 7 of 8. A match against the CPU takes about 1½ to 4 minutes.

**Match settings** on the title: first to 5, 7 or 9. *Classic* rules, or *Frenzy*: every third point two pucks drop at the centre line at once, and each one that goes in counts.

**Instant replay.** A rocket (12 mph and up), a bank shot or the winning goal gets a slow-motion replay from low beside the goal. There's never one on two points in a row. Tap to skip.

## Arcade contract

The id is `airhockey3d`. With `?embed=1` the page drops its top bar and keeps a small pause button. It sends:
- `ready` after the first frame
- `score` (your goals) when you score
- `over` with `score` and `tickets` when a match ends
- `exit` on Esc from the title screen, or from **Exit to arcade** in the pause menu or on the result card

It obeys `start` (a one-player match against the last rival you picked), `pause`, `resume`, `attract`, `mute` and `unmute`.

Tickets: beat a rival and you get 15, plus 8 for each step up the ladder, plus your winning margin (a 7–0 win over APEX pays 54). Lose and you get 2 per goal you scored (at least 2). A two-player match pays 8.

Saves use only `hd-airhockey3d-…` keys: `-beat` (the highest rival beaten), `-rival` (the last one picked), `-wins-<rival>` and `-wins-2p`, `-to`, `-rules`, `-theme`, `-mute`, `-voice`, `-dots`, and `-q` (a pinned graphics level).

## Quality

There are three levels:
- **High:** for laptops. 2× pixels, 4× MSAA, reflections at 60% size, 2048 px shadows.
- **Medium:** for phones. 1.5× pixels, 4× MSAA, reflections at 42% size, 1024 px shadows.
- **Low:** 1× pixels, no MSAA, no reflections or shadow maps (soft blob shadows stay).

If frames take longer than 24 ms for a couple of seconds, the game steps down a level by itself. It steps back up, but never above where it started. `?q=low|med|high` pins a level, and so does **Graphics** in the pause menu.

## Build and check

```
python3 v2/src/airhockey3d/build.py                    # writes v2/games/airhockey3d.html
python3 v2/src/airhockey3d/build.py --dev /tmp/a.html  # a test copy that keeps the window.__game hook
node v2/src/airhockey3d/test/check.js [OUTDIR]         # headless Chromium: console, whole matches on autopilot at laptop
                                                       # and phone sizes, the controls, and the cabinet contract
```

## Sources

| File | What's in it |
|---|---|
| `shell.html` | the page, CSS, the menus, and markers for three.js and the game |
| `js/00_base.js` | helpers, bitmap fonts and the synth (from the house cabinet starter), input (every pointer, keys, gamepads), the arcade bridge |
| `js/01_phys.js` | the table, the puck and the mallets: air, rails, goal slots, spin, swept contacts, the predictor the CPU uses |
| `js/02_ai.js` | the five rivals and how a CPU plays |
| `js/03_sfx.js` | the sounds: the clack, the rails, the drop and rattle, the horns, the blower, the music |
| `js/10_gfx.js` | renderer, quality levels, bloom, the LED HUD layer, the Dots filter (the house renderer from Strike Night 3D) |
| `js/11_table.js` | the table, the deck's shader, the mirror, the rails and goal chutes, the cabinet, the scoreboard, the pieces, the room, the lights, the two looks |
| `js/20_game.js` | the match: serving, goals, frenzy, the hands (pointer and stick), replays, tickets, unlocks |
| `js/21_cam.js` | the camera director: the fitted player view, two-player top view, attract orbit, replay angle |
| `js/22_fx.js` | sparks, the puck's light trail, confetti |
| `js/23_hud.js` | the HUD in dots, and the overhead scoreboard's face |
| `js/24_ui.js` | the title, the rival select, the result card, the pause menu, keyboard and gamepad focus |
| `js/30_loop.js` | the frame loop, the frame-rate watch, boot |
| `test/check.js` | the headless check |
