# Voidlance 3D

The "3D" choice for the Voidlance cabinet. The original (`games/voidlance.html`, built from `src/voidlance/`) stays the "Retro 2D" choice and is untouched.

It is the same game: six missions, the Lance, Juno and Rix, the Red Knives, the frigate Malice and the Leviathan, with the same flight model, AI, weapons, upgrades, scoring and tickets. The game logic is carried over from the original's modules. Only the drawing is new:

- **Real 3D in WebGL2** at full screen resolution. The ships are built from the original's primitives, with smoother round parts and real lighting: the sun, image-based light and reflections from the nebula, sun shadows, panel detail and lit windows on the big ships, and explosion flashes that light nearby hulls.
- **Effects:** engine plumes and trails, fireballs, smoke, sparks, shockwave rings, wreckage, shield domes, the Leviathan's beam, sun glare, and bloom.
- **Three views,** switched with C or in Options: Chase (the default), Cockpit (a real 3D dashboard and canopy) and HUD only.
- **The dots:** the whole HUD is the original's bitmap-font HUD, lit as LED dots over the 3D view. The briefing, ship-roster and target-screen holograms are real meshes rendered into that dot grid. Options also has a **Dot filter** that shows the whole 3D frame on an LED panel.
- **Quality:** Auto starts at High on a computer and Med on a phone, and steps down if the frame rate can't hold. Add `?q=low`, `?q=med` or `?q=high` to the address to pin it.

## Build

```
python3 build.py              # writes ../../games/voidlance3d.html
python3 build.py --dev OUT    # same page plus a window.__vl3 test handle
```

`build.py` puts the modules `a_core.js` … `j_ui.js` into `shell.html` in order:

| module | what it holds |
|---|---|
| `a_core.js` | basics, saves, the arcade bridge, bitmap fonts, the screen layout and HUD canvas, sound, input |
| `b_math.js` | vectors, quaternions, mesh primitives |
| `c_ships.js` | materials, every hull, ship classes |
| `d_game.js` | the world: flight, AI, weapons, damage, effects, the player |
| `e_missions.js` | the six missions |
| `f_gl.js` | the WebGL2 renderer: shaders, render targets, the nebula sky, mesh upload |
| `g_scene.js` | cameras, the 3D cockpit, lights, sprites and trails |
| `h_frame.js` | one frame: shadows, scene, bloom, tone map, dot filter, holograms, LED HUD |
| `i_hud.js` | the HUD and every screen, drawn in dots |
| `j_ui.js` | the simulation step, menus and flow, tickets, the loop and boot |

## Arcade contract

The id is `voidlance3d`. Opened with `?embed=1` it hides its own top bar. It sends `ready`, `score` and `over` (tickets as the original: 3 per mission won, 1 per 6,000 points, 20 for the victory, at least 3 for a credit that ends on its own, at most 150), and sends `exit` on Esc from the title. It obeys `start`, `pause`, `resume`, `attract`, `mute` and `unmute`.

Everything it saves is under `hd-voidlance3d-…` in `localStorage`, so the original's saves are never touched.
