"""Hyperdot Arcade, the back room: V2's engine (shell.html, copied here unchanged) with the back room's own modules
dropped in at its markers, and a few small changes made at build time, each one checked to match exactly once.
The shell and the three modules the back room shares with V2 (m2_cabinets.js, m3_tables.js, m6_doors.js) are read from v2/src/arcade/,
so there is one copy of each. Writes backroom/index.html.

    python3 src/arcade/build.py

The modules:
  m0_backroom.js   the rooms: the main room, the Workshop, the X Room, the empty room; walls, doorways, ceiling, lights, signs
  m1_host.js       V2's game host, plus reading cards (panels, pictures) and a chooser for a cabinet with two games
  m2_cabinets.js   V2's cabinets, read from v2/src/arcade/src/
  m3_tables.js     V2's tables, read from v2/src/arcade/src/
  m6_doors.js      the door to the main floor, read from v2/src/arcade/src/
  m6_parts.js      the back room's own machines: the giant handheld, the X Room's panels, the gallery's frames
  m7_workshop.js   the Workshop's cabinets, and the Howler
  m8_upgrades.js   the 3D rebuilds' cabinets
  m9_next.js       the Workshop's newest cabinets, for games still being built: the Wraith, the bogged Rock & Mud, the Showroom
  m4_backroom.js   the floor plan: what stands where, and the words on the panels

The games, their attract loops and the gallery's pictures sit next to index.html, in games/, attract/ and art/."""
import os
D=os.path.dirname(os.path.abspath(__file__));OUT=os.path.dirname(os.path.dirname(D))
V2=os.path.join(os.path.dirname(OUT),'v2','src','arcade')
SHARED={'m2_cabinets.js','m3_tables.js','m6_doors.js'}
rd=lambda n:open(os.path.join(V2 if n in SHARED else D,'src',n),encoding='utf-8').read()
s=open(os.path.join(V2,'shell.html'),encoding='utf-8').read()
def put(old,new):
    global s
    assert s.count(old)==1,('expected once',old[:70],s.count(old))
    s=s.replace(old,new)
put('/*@@ROOM@@*/',rd('m0_backroom.js'))
put('/*@@MACHINES@@*/','\n'.join(rd(n) for n in ['m1_host.js','m2_cabinets.js','m3_tables.js','m6_doors.js','m6_parts.js','m7_workshop.js','m8_upgrades.js','m9_next.js','m4_backroom.js']))
put("/*@@INTRO@@*/'original'","'original'")
put("/*@@ROOT@@*/'../'","''")
put("/*@@DEMO@@*/false",'false')
put('/*@@INTROS@@*/','')
# ROOM is the box round every room here: the building (x -9..9, z -26..8) and the empty room off its left wall (x -19..-9).
# m0_backroom.js then stretches x1 to hold the endless room.
put('const ROOM={x0:-16,x1:16,z0:-12,z1:12,h:4.6};','const ROOM={x0:-19,x1:9,z0:-26,z1:8,h:4.0};')
# you start just inside the door from the main floor, facing into the room
put('CH_.x=2.4;CH_.z=5.2;','CH_.x=0;CH_.z=5.5;')
# the walking camera doesn't look through the walls between the rooms
put('eye[0]=clamp(eye[0],ROOM.x0+.3,ROOM.x1-.3);eye[2]=clamp(eye[2],ROOM.z0+.3,ROOM.z1-.3);',
    'eye[0]=clamp(eye[0],ROOM.x0+.3,ROOM.x1-.3);eye[2]=clamp(eye[2],ROOM.z0+.3,ROOM.z1-.3);eye=camPull(tg,eye);')
# the endless room thickens the air
put('gl.uniform1f(u.uFogD,.035)','gl.uniform1f(u.uFogD,EN.fog)')
# no pinball intro here: the room fades straight in
put('resize();buildFloorAO();','resize();buildFloorAO();PIN.skip();')
put('#skip{position:absolute;','#intro,#skip,#ihint{display:none!important}\n#skip{position:absolute;')
put('<title>Hyperdot Arcade</title>','<title>Hyperdot Arcade · Back Room</title>')
put('aria-label="Hyperdot Arcade 3D view. Power on the pinball machine to begin."','aria-label="Hyperdot Arcade, the back room, 3D view."')
open(os.path.join(OUT,'index.html'),'w',encoding='utf-8').write(s)
print(os.path.join(OUT,'index.html'),len(s.encode()),'bytes')
