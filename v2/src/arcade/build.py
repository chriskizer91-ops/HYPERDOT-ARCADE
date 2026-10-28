"""Hyperdot Arcade V2: shell.html (the engine, the room's renderer and the pinball intro) with the modules
in src/ dropped in at its markers. Writes v2/index.html, and the intro test pages v2/intro-a.html, -b, -c.

shell.html started as V1's intro with V1's build patches already applied, so V2 edits it directly.
The games themselves are shared with V1 and live one folder up (../games, ../attract); only the
games that are V2's alone (Shiftlight 3) sit in v2/games.

The intro test pages are the same arcade with a different way into it (src/intro_variants.js). Nothing
links to them: v2/index.html keeps the intro that's live until one of them is picked."""
import os
D=os.path.dirname(os.path.abspath(__file__));V2=os.path.dirname(os.path.dirname(D))
rd=lambda n:open(os.path.join(D,'src',n),encoding='utf-8').read()
def build(intro,out):
    s=open(os.path.join(D,'shell.html'),encoding='utf-8').read()
    def put(marker,text):
        nonlocal s
        assert s.count(marker)==1,('marker',marker,s.count(marker))
        s=s.replace(marker,text)
    put('/*@@ROOM@@*/',rd('m0_room.js'))
    put('/*@@MACHINES@@*/','\n'.join(rd(n) for n in ['m1_host.js','m2_cabinets.js','m2b_simpod.js','m3_tables.js','m4_floor.js','m5_prizes.js']))
    put("/*@@INTRO@@*/'live'","'"+intro+"'")
    put('/*@@INTROS@@*/',rd('intro_variants.js') if intro!='live' else '')
    if intro!='live':put('<title>Hyperdot Arcade</title>','<title>Hyperdot Arcade · intro '+intro.upper()+'</title>')
    open(os.path.join(V2,out),'w',encoding='utf-8').write(s)
    print('v2/'+out,len(s.encode()),'bytes')
build('live','index.html')
for v in 'abc':build(v,'intro-'+v+'.html')
