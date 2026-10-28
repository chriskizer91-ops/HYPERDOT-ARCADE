"""Hyperdot Arcade V2: shell.html (the engine, the room's renderer and the pinball intro) with the modules
in src/ dropped in at its two markers. Writes v2/index.html.

shell.html started as V1's intro with V1's build patches already applied, so V2 edits it directly.
The games themselves are shared with V1 and live one folder up (../games, ../attract); only the
games that are V2's alone (Shiftlight 3) sit in v2/games."""
import os
D=os.path.dirname(os.path.abspath(__file__));V2=os.path.dirname(os.path.dirname(D))
s=open(os.path.join(D,'shell.html'),encoding='utf-8').read()
rd=lambda n:open(os.path.join(D,'src',n),encoding='utf-8').read()
def put(marker,text):
    global s
    assert s.count(marker)==1,('marker',marker,s.count(marker))
    s=s.replace(marker,text)
put('/*@@ROOM@@*/',rd('m0_room.js'))
put('/*@@MACHINES@@*/','\n'.join(rd(n) for n in ['m1_host.js','m2_cabinets.js','m2b_simpod.js','m3_tables.js','m4_floor.js','m5_prizes.js']))
out=os.path.join(V2,'index.html');open(out,'w',encoding='utf-8').write(s)
print('v2/index.html',len(s.encode()),'bytes')
