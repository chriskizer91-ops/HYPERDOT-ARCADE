# Strike Night 3D

The 3D version of Strike Night, the bowling game in the redemption corner. The original stays as the cabinet's "Retro 2D" choice (`games/bowl.html`). This build is the "3D" choice: `v2/games/bowl3d.html`, one self-contained file of about 810 KB.

## What it is

- **The same game.** The physics is the original's, copied over unchanged in `js/01_core.js`: a 15 lb ball and ten rigid pins, stepped 240 times a second. So are the scoring, the AI bowler that plays the attract mode, the pinsetter's timing and the sounds.
- **Full-resolution 3D in three.js (r170, vendored in `vendor/`).** Seven lanes of oiled boards that mirror the room, with gutters, neon capping, kickbacks, the pin deck and the pit. A hooded pin light casts the only shadows. Blacklight tubes and three roving colour spots with visible beams light the room.
- **The dots stay.** The HUD (the score sheet, hints and cards) is drawn as LED dots over the 3D picture. The masking unit over the pins is a 192 × 82 dot screen: it shows the original's strike, spare, turkey, split and gutter cartoons in amber, and the pin count after every ball. An overhead monitor (160 × 50 dots) hangs over the approach. The **Dots** button runs the whole picture through an LED filter.

## Controls

| | Laptop | Phone | Gamepad |
|---|---|---|---|
| Move the ball | drag sideways, or ← → | drag sideways | stick / d-pad |
| Bowl | swipe up (curve the end of the swipe to hook), or Space three times: line, aim, power | swipe up, curve it to hook | A three times |
| Spin (keys) | Shift | (from the swipe) | B |
| Skip the pin action | Space or click | tap | A |
| Pause | Esc, or the Pause chip | the round II button | Start |

## Arcade contract

The id is `bowl3d`. With `?embed=1` the page drops its top bar and keeps only a small pause button. It sends:
- `ready` after the first frame
- `score` as the score changes
- `over` with `score` and `tickets` when a game ends
- `exit` on Esc from the title screen, or from **Exit to arcade** in the pause menu

It obeys `start`, `pause`, `resume`, `attract`, `mute` and `unmute`.

Tickets are the original's formula: score ÷ 10 (at least 3), plus 80 for a 200+ game, and 500 for a 300.

Saves use only `hd-bowl3d-…` keys: `-hi` (high score), `-mute`, `-dots`, `-q` (a pinned graphics level) and `-voice`.

## Quality

There are three levels:
- **High:** for laptops. 2× pixels, 4× MSAA, half-resolution lane reflections, 2048 px shadows, the pin-cam inset.
- **Medium:** for phones. 1.5× pixels, 4× MSAA, reflections at 38 % size, 1024 px shadows, the pin cam.
- **Low:** 1× pixels, no MSAA, no reflections or shadows, no pin cam.

If frames take longer than 24 ms for a couple of seconds, the game steps down a level by itself. It steps back up, but never above where it started. `?q=low|med|high` pins a level, and so does **Graphics** in the pause menu.

## Build and check

```
python3 v2/src/bowl3d/build.py                 # writes v2/games/bowl3d.html
python3 v2/src/bowl3d/build.py --dev /tmp/b.html   # a test copy that keeps the window.__game hook
python3 v2/src/bowl3d/test/check.py [OUTDIR]   # headless Chrome: console, a full autopilot game at laptop
                                               # and phone sizes, and the cabinet contract
```

## Sources

| File | What's in it |
|---|---|
| `shell.html` | the page, CSS, the pause menu, and markers for three.js and the game |
| `js/00_base.js` | helpers, bitmap fonts, synth, input, the arcade bridge (from the house cabinet starter) |
| `js/01_core.js` | physics and scoring (the original's, unchanged) |
| `js/02_sfx.js` | the original's sound effects, rolling rumble and music |
| `js/10_gfx.js` | renderer, quality levels, bloom, the LED HUD layer, the Dots filter |
| `js/11_world.js` | the alley: lanes, pins, ball, neon, lights, LED screens, reflections |
| `js/12_led.js` | what the masking unit and the overhead monitor show, and the amber cartoons |
| `js/20_game.js` | frames and balls, the pinsetter, the AI bowler, gestures (from the original) |
| `js/21_cam.js` | the camera director |
| `js/22_fx.js` | sparks, confetti, the ball's trail |
| `js/23_hud.js` | the score sheet and cards, drawn as dots |
| `js/30_loop.js` | the frame loop, the quality watch, the pause menu, boot |
