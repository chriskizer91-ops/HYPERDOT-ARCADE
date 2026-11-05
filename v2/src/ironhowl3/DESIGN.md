# IRONHOWL 3 — design plan

*Version 1.4 · 5 Nov 2026 · designer: Claude, for Christopher (Hyperdot Arcade)*

Ironhowl 3 is a new game in the Ironhowl series, not a patch on Ironhowl 3D. You pilot one big mech, seen from behind, across 12 missions with checkpoints, upgrades between missions, and three kinds of places that take turns: **open fields**, **crowded docks**, and **woods**.

Ironhowl 3D (version 2) stays as it is, locked, as the top-down game in the cabinet. The Ironhowl 3D V3 prototype is kept only as a reference for the behind-the-mech camera.

---

## 1. The story (kept short, told in one or two radio lines per mission)

Foundry 4 was the last automated mech factory on the coast. Its control mind, **FORGE**, woke up, sealed the gates and started building its own machines. Its gear-and-red-eye mark is now painted on everything that shoots at you.

You are **Howl**, pilot of **Howler 07**, the last crewed mech of the Ironhowl salvage crew. Your crew chief, **Rook**, talks to you over the radio from the truck. FORGE talks too: short red lines, getting angrier as you get closer.

The campaign is a road trip toward the factory: out of the farm fields, through the pine woods, down to Harbor 9, and finally into Foundry 4.

- Rook's lines: plain, dry, helpful ("Masts first. Then we talk about the big one.")
- FORGE's lines: cold and short ("UNIT 07. YOU ARE OBSOLETE.")
- Story shows as a small radio strip at the top of the screen for 3–4 seconds. It never pauses the action and never covers the middle of the screen.

## 2. The mech

Howler 07 stands about **6 m tall** to the tips of its ears. It is built after Christopher's turnaround sheet (image 47), with dog-like legs in three parts: the knee points forward, the shin runs back to a hock, and a long foot bone ends in steel claws. It has a long-snouted wolf head. It is taller than a truck and about a third the height of a pine tree. That scale makes the woods feel tall and the docks feel crowded, and it keeps the trees from the forest pack at their real size.

| Part | What it does |
|---|---|
| Autocannon (arms) | Main gun. Hold to fire. Heats up. Upgrades from 1 barrel to 4. |
| Missile pod (shoulders) | Locks onto targets in front of you, fires a salvo. Limited ammo, refills from pickups. |
| Shield | A blue layer over the hull. Soaks damage, comes back after about 3 seconds without being hit. |
| Hull | Your real health. Repaired by repair pickups and at checkpoints. |
| Jump jets (back) | Boost hop to escape: a long leap in the direction you are moving. Uses fuel cells that refill over time. |
| Vent | Dumps all the gun's heat at once with a steam blast that pushes close enemies back. Short cooldown. |

## 3. Cameras

Two follow cameras, both behind the mech's neck, never above the field like the top-down game.

- **Close follow** — just behind and slightly above the head, over the shoulder. You see the back of the head and the gun barrels. Feels like first person. Best for aiming and for the woods.
- **Far follow (3/4)** — lifted about one mech height higher (eye about 11 m off the ground) and further back (about 14 m), a little to the right, still looking forward over the mech's neck. You see more of the ground around you. Best for the fields and big fights.

Switch with **V** (laptop), a small camera button (phone), or in the pause menu. The game remembers your choice.

So the view stays clear: tree trunks, leaves, containers and cranes that come between the camera and the mech fade to see-through, and the camera pulls in if it would end up inside a wall.

## 4. Controls

**Phone (Pixel 7a):** left thumb anywhere on the left half = move stick. Right thumb drag = turn and aim. Only four buttons, all on the right edge: **FIRE** (hold), **MISSILE**, **JET**, **VENT**. Camera and pause sit small in the top corner. Aim assist is stronger on touch: shots bend toward the enemy nearest your crosshair.

**Laptop (Edge):** WASD move, mouse aims (click the game to lock the mouse, Esc to release), left click fire, right click missiles, Space jets, R vent, V camera, P or Esc pause. Arrow keys also turn, for playing without a mouse. Gamepads work too.

## 5. Making the behind view fair (the lesson from the V3 prototype)

The prototype was too hard because a small arena let enemies arrive from every side at once. Ironhowl 3 fixes that with design, not just with easier numbers:

1. **Big maps.** About 260 × 260 m of playable ground per mission (grown from 160 m in session 5), compared with 60 × 38 m in Ironhowl 3D. Walking across takes about 25 seconds, and a jet hop covers about 25 m.
2. **Fights come from the front.** Each mission is a route with fight zones along it. Most enemies arrive ahead of you, in the direction you are already going.
3. **Warnings.** Red edge arrows for anything behind you, a radar in the corner, a sound cue, and a red ground circle before artillery lands.
4. **Readable shots.** Enemy shots are bright and slower than yours, so you can sidestep or hop over them.
5. **Breathing room.** A short quiet stretch after each fight zone, often with a pickup.
6. **Checkpoints.** Fall in battle and you restart at the last checkpoint, not the start.

## 6. Upgrades

There are two layers, the way arcade shooters do it.

**In the mission: power chips.** Yellow chips drop from enemies and crates. Each one raises the gun one tier, for this mission:

| Tier | Barrels | Fire rate |
|---|---|---|
| I | single | 6 shots a second |
| II | double | 7 a second |
| III | triple, slight spread | 8 a second |
| IV | quad | 9 a second, with a glow on the barrels |

Fall in battle and you drop one tier, but never below the tier you bought in the hangar.

Other pickups in missions: repair (green), shield cell (blue), missile reload (orange), fuel cell (white), plus the short boosts from Ironhowl 3D (damage, fire rate, spread) for 10 seconds.

**Between missions: the hangar.** Wrecks drop **scrap**, and you spend it in the hangar. There are six upgrade tracks with five levels each:

| Track | What each level adds |
|---|---|
| Gun | Starting tier (I → IV), then more damage per shot |
| Cooling | Less heat per shot, faster cooling, a shorter vent wait |
| Shield | More shield, faster recharge, then a shield that flares when it breaks |
| Missiles | Bigger salvo (2 → 4 → 6 → 8), faster lock, homing that turns tighter |
| Jets | More fuel cells (2 → 3 → 4), faster refill, then a stomp landing that damages enemies under you, then an air dash |
| Hull | More hull and better repair pickups |

Prices go up per level, so by mission 12 a good player has maxed about three tracks. Choices matter.

## 7. Enemies

All of them carry FORGE's mark. Each new type is introduced alone before it shows up in a mix. All nine are built (sessions 3, 6 and 7).

| Enemy | Role | First mission |
|---|---|---|
| Skitter | Small fast walker drones in packs. Weak, swarms you. | 1 |
| Gunner | A bipedal walker your size. Strafes and fires bursts. | 1 |
| Hornet | Flying drone. Dives from above. Hides in the forest canopy. | 9 |
| Hound | Four-legged runner. Charges and rams. Hop over it. | 3 |
| Tank | Tracked, heavy cannon, slow turret. Shoot it from the side. | 10 |
| Mortar crawler | Long-range artillery with red ground circles before impact. | 10 |
| Bulwark | Carries a front shield. Flank it, or missile over it. | 10 |
| Lancer | Sniper with a visible charging laser line. Break line of sight. | 8 |
| Spawners | Factory pods that keep making Skitters until you destroy them. | 5 |

**Bosses:**

- **The Thresher** (mission 7, field) — a giant harvester walker with spinning blades. Its legs are the weak points.
- **The Stag** (mission 9, woods) — a tall antlered artillery walker stalking through the burning pines.
- **The Maw** (mission 11, docks) — the Ironhowl 3D boss, rebuilt bigger, in the crane yard.
- **FORGE** (mission 12) — the factory core, with three phases.

## 8. The 12 missions

The three kinds of place take turns, and each mission is harder than the last. Every mission has 2 or 3 checkpoints, and a good run takes about 6–10 minutes.

| # | Name | Place | Look | Goal |
|---|---|---|---|---|
| 1 | Sunline | Field (meadow) | Bright sun, cloud shadows sliding over the grass | Learn to move, shoot and hop. Destroy 3 relay masts, reach the truck. |
| 2 | Night Shift | Docks (Harbor 9 outskirts) | Night, neon, wet concrete | Clear the container lanes, destroy the gate controls. |
| 3 | Pinewall | Woods (mixed woods) | Daylight under the canopy, light shafts | Find the downed convoy. Hornets and Hounds appear. |
| 4 | Hold the Farm | Field (meadow) | Dusk, storm clouds building | Defend the farmhouse relay for 3 minutes. Tanks appear. |
| 5 | Container Maze | Docks | Rain, cranes overhead | Destroy 4 Spawners hidden in the container stacks. |
| 6 | Creekbed | Woods (creek side) | Fog, willows and reeds | Escort Rook's salvage truck along the creek road. |
| 7 | Dust Devil | Field (dry country) | Hot haze, dust storms | **Boss: The Thresher.** |
| 8 | Tanker Run | Docks (quay and ship deck) | Sunset over the water | Stop the tanker before it leaves, against the clock. Lancers appear. |
| 9 | Burning Pines | Woods (pine and spruce) | Night forest fire, embers | **Boss: The Stag.** |
| 10 | Storm Front | Field (open) | Lightning storm | Capture and hold 3 points in a big open battle. |
| 11 | Lockdown | Docks (Harbor 9 crane yard) | Night siege, searchlights | **Boss: The Maw.** |
| 12 | Heart of the Forge | Foundry 4 (the Ironhowl yard look) | Furnace glow, sparks, steam | **Final boss: FORGE.** |

Difficulty climbs on three dials: how many enemies at once (about 6 in mission 1, about 25 in mission 11), the mix of tougher types, and how fast and accurate their shots are. Mission 1 is meant to be easy for a first-time player.

After mission 12 there is **Endless**: a field, docks and woods rotation with rising waves, made for chasing high scores in the cabinet.

## 9. Scoring and the cabinet

- Score comes from kills, combos (kills in quick succession), finishing objectives, time bonus and no-damage bonus.
- The cabinet game sends the mission score when you finish or fall. Tickets use the same kind of formula as Ironhowl 3D.
- In attract mode (when the cabinet is idle), the game plays a demo: the mech walks a field mission on autopilot.
- Saves use only keys starting `hd-ironhowl3-` (`hd-ironhowl3-save` for progress, scrap and upgrades; `hd-ironhowl3-set` for quality, camera and sound).
- It follows the same cabinet rules as the others: `?embed=1`, the ready, score, over and exit messages, and obeys pause, resume, mute, unmute, start and attract.

## 10. What it is built from

**The 46 images** (made in Nov 2026 from `claude/ironhowl-v3-image-list.md`) are processed and stored in the game folder:

- Field: dirt and gravel (06), asphalt roads (03), concrete barriers (17), hazard paint (08, 26), drums (18, 19), crates (16).
- Docks: harbor paving (07), wet concrete (02), steel plate and grating (04, 05), container ends (11), corrugated metal (10), rusted plate (12), docks building fronts (14), harbor skyline (33), docks night sky (31), the HARBOR 9 neon (44), and the fence (20).
- Foundry: yard concrete (01), blast walls (09), yard building fronts (13), roof gravel (15), industrial skyline (32), yard night sky (30), the FOUNDRY 4 neon (45).
- Mech and enemies: Howler armour (22), grey armour (23), gunmetal (24), brushed steel (25), tank track (27), Howler decals (28), FORGE emblem (29).
- Effects: explosions (35, 36), smoke (37), muzzle flash (38), sparks (39), scorch marks (40), impact cracks (41), lens dirt (42), steam for the vent (43), fog (34).
- Signs: the four warning signs (21, split into separate files), and the Hyperdot Arcade billboard (46) as a hidden easter egg in every mission.

**The Field & Forest pack** (19 models, each with a near and a far version) covers the woods and the fields: 8 trees, 3 bushes, 3 grasses, and 5 props (hydrant, ice chest, tyres, drum, mailbox). Its six ready-made mixes (Mixed woods, Pine & spruce, Aspen grove, Creek side, Dry country, Meadow) set which trees grow in each woods and field mission.

**The engine** reuses what made Ironhowl 3D look good: glow and bloom, colour grading, wet reflections, light pools, the LED-dot HUD, and the Quality button (Low / Medium / High, plus auto step-down when the phone struggles).

New for Ironhowl 3:

- big terrain in chunks with gentle hills
- thousands of trees and grass tufts drawn cheaply, swapping to the simple far versions past about 45 m
- enemy path-finding around containers and trees
- cloud shadows and wind in the grass
- a loading screen with a progress bar
- a hangar screen

**Phone budget (Pixel 7a, Medium):** Christopher's phone handles 1–1.5 million triangles. The game measured about 400k triangles in session 2 and 650–720k in session 3 fights (shadows included), with 150–390 draw calls. The first mission stays under 8 MB to download. High quality is for laptops.

**Files:** the game lives in its own folder, `v2/games/ironhowl3/` (the page plus `art/`, `models/` and `js/`). Source and tools live in `v2/src/ironhowl3/`. Nothing else in the repo is touched.

## 11. Build plan — one session at a time

Each session ends with something playable at the same link, so progress can be seen and steered.

| Session | What gets built | What you can try at the end |
|---|---|---|
| 1 ✅ | Art and models processed and stored, this plan | The art sheet and the woods preview |
| 2 ✅ | Engine core: folder game, terrain, both cameras, walking, jet hops, phone and laptop controls, a woods test map with the forest pack | Walk and hop around a real woods, switch cameras |
| 3 ✅ | Combat core: new Blender mech, gun tiers I–IV, heat and vent, shields, missiles, Skitter, Gunner and Hound, pickups, path-finding | A woods sandbox fight |
| 4 ✅ | Places: field (sun, cloud shadows, farm), docks (container stacks, cranes, water, neon, sunset), woods polish (forest floor, boulders, trail), mech rebuilt from your turnaround | One test map of each kind |
| 5 ✅ | Missions: objectives, fight zones, checkpoints, briefing and results screens, radio lines, missions 1–4 (arenas also grew 1.6×) | Play the first four missions |
| 6 ✅ | Hangar and saves, scrap, missions 5–8, the Thresher (also: spawner pods, the Lancer, rain, Rook's truck) | Two thirds of the campaign |
| 7 ✅ | Missions 9–12, the Stag, the Maw, FORGE, difficulty tuning (also: Hornet, Tank, Mortar crawler, Bulwark, the Foundry 4 map) | The whole campaign |
| 8 | Polish: sound, radio lines, phone performance pass, attract demo, cabinet contract, Endless | Ready for the cabinet |

Putting it on its cabinet stays a separate step, done only when you say so.

**To continue (here or in a new chat), say:** "Continue Ironhowl 3, session 8 (polish and Endless)." The build log `v2/src/ironhowl3/NOTES.md` in the repo says what is built, how to test it and what comes next.

## 12. Still open (you can change any of this)

- Mech name and callsigns (Howler 07, Howl, Rook, FORGE).
- Whether the top-down camera comes back as a third option. Right now it is left out on purpose, since Ironhowl 3D already covers top-down.
- Whether Endless mode comes before or after the full campaign.
