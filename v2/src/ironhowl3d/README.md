# Ironhowl 3D

The "3D" choice for the Ironhowl cabinet. You pilot the Howler mech through a real 3D arena, seen from a high three-quarter camera. The original stays as the "Retro 2D" choice, in `games/ironhowl.html`, built from `src/ironhowl/`. This build doesn't touch either of them.

```
python3 build.py              writes v2/games/ironhowl3d.html (one self-contained page)
python3 build.py --dev PATH   also writes a test copy that keeps the window.__ih3 handle
```

## What carried over unchanged

These rules are the original's code, copied across: the 12 waves, both arenas (with the same seeds, so the same layouts), every enemy's behaviour, the two bosses, the weapons, heat, missiles, dash, Howl, the 12 upgrades, scoring, tickets and endless mode. The music, sound effects and announcer are the original's too. Some sounds now come from where they happen on screen, and a few new heavy ones were added: big footsteps, crashes, splintering wood and lamp posts falling over.

The controls are the same: WASD and the mouse, the arrow keys, a gamepad, or two touch sticks and three buttons.

## What's new

- **Machines:** built from the original's own capsules and balls, plus armour boxes, as real 3D parts. Legs still walk with the original's IK. Every part of one kind shares one instanced mesh, so the whole cast of machines draws in a handful of calls.
- **Arenas:** walls and gates with beacons, buildings with lit windows, a skyline ringing the yard, harbour water and rain on the docks, and embers at the yard. Lamp light is painted into a light map on the ground.
- **Breakage:** containers crumple and burn, crates splinter into planks, and barriers break down to stumps. Red barrels explode and leave crushed drums. Lamp posts fall over and their light goes out. Scorch marks and footprints stay on the ground.
- **Weight:** every footstep thumps the camera, and the cannons recoil. Shell casings bounce, and the Howl kicks the camera's view outward. Goliath's steps shake the screen.
- **Light:** a key light with shadows, the mech's headlight, and a pool of point lights that goes to the brightest flashes near the action. Smaller lights glow on the ground instead.
- **The dots:**
  - The HUD and every menu are the original's LED screens, laid over the 3D view as dots.
  - **DOTS** (the chip at the top, or the pause menu) renders the whole 3D scene on that same dot grid.
  - **VIEW** in the pause menu switches between the high camera and a closer one.

## Look (round 2)

- **Night battle:** both arenas are darker now, lit by floodlight towers at the corners. Long beams reach through the haze, and the big north floodlight casts the shadows. Low haze drifts through the arena.
- **Wet ground:** the ground reflects the scene where it's wet, using a mirrored second camera. On the docks that's everywhere, and at the yard only in the puddles. Each frame is also colour-graded.
- **The Howler:**
  - Armoured thighs, and hydraulic pistons that slide as the knees bend.
  - Clawed feet and hip skirts.
  - A cockpit head with a visor slit, and a shoulder floodlight.
  - Three-barrel rotary cannons that spin up as you fire.
  - Missile-pod lids that flip open when a salvo is ready.
- **Heat:** the barrels glow dull red, then orange, as the heat bar fills. When the guns overheat, the back radiator fins swing open, glowing, and steam blasts out until they've vented.
- **Bosses:** when a boss drops in, the camera swings to the pod. The landing goes into slow motion, and the boss's name comes up.
- **Balance:** each cannon shot adds 2.5 heat instead of the original's 4.3. Non-stop fire now takes about 3.6 seconds to overheat instead of about 2.

## Quality

The game picks **high** on a desktop and **medium** on a phone. If the frame rate can't hold during play, it first lowers the render resolution, then steps down a level, to **low** at the bottom. Low has no shadow map, fewer lights and fewer particles. To pin a level, add `?q=low`, `?q=med` or `?q=high` to the address.

## Arcade contract

The game id is `ironhowl3d`. Opened with `?embed=1`, it posts:
- `ready` after its first frame
- `score` while you play
- `over` (with score and tickets) when a run ends
- `exit` from BACK TO ARCADE, or Esc, on the title screen

It obeys `start`, `pause`, `resume`, `attract`, `mute` and `unmute`. Saves live only under `hd-ironhowl3d-` keys (`hi`, `bw`, `mute`, `voice`, `dots`, `view`).

## Files

```
shell.html          the page: top bar, touch pad, styles
vendor/three.min.js three.js r187, bundled once with esbuild as an IIFE that sets window.THREE
01_core.js          basics, bitmap fonts, the arcade bridge, audio (synth, tracker, announcer), input
02_world.js         the arena layout (same as the original), collision, line of sight
03_units.js         the Howler and the enemies: stats and 3D drawing
04_combat.js        the original's rules: weapons, damage, enemy brains, waves, upgrades
05_gfx.js           renderer, quality, layout, instanced parts, camera, post (bloom, LED dots, HUD)
06_arena.js         the arena in 3D: ground, walls, gates, buildings, skyline, breakable props, water, sky
07_draw.js          what's drawn each frame, the roster page, the camera follow
08_fx.js            particles, ground decals, flashes, rain and embers, the light pool
09_hud.js           the LED HUD and screens
10_main.js          game step, run flow, menus, chrome, quality step-down, boot
```
