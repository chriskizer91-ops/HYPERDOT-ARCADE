"""Hyperdot Arcade V2: shell.html (the engine, the room's renderer and the pinball intro) with the modules
in src/ dropped in at its markers. Writes v2/index.html, and the intro test pages v2/intro-a.html, -b, -c.

shell.html started as V1's intro with V1's build patches already applied, so V2 edits it directly.
The games themselves are shared with V1 and live one folder up (../games, ../attract); only the
games that are V2's alone (Shiftlight 3) sit in v2/games.

The intro test pages are the same arcade with a different way into it (src/intro_variants.js). Nothing
links to them: v2/index.html keeps the intro that's live until one of them is picked.

    python3 build.py --demo DIR   also writes a stand-alone demo of the intros to DIR (the chooser as index.html,
                                  intro-a/b/c.html and live.html), looking for the attract loops and the pinball
                                  art beside it rather than one folder up, with the machines' games switched off."""
import os,sys
D=os.path.dirname(os.path.abspath(__file__));V2=os.path.dirname(os.path.dirname(D))
rd=lambda n:open(os.path.join(D,'src',n),encoding='utf-8').read()
def build(intro,out,root='../',demo=False,outdir=None):
    s=open(os.path.join(D,'shell.html'),encoding='utf-8').read()
    def put(marker,text):
        nonlocal s
        assert s.count(marker)==1,('marker',marker,s.count(marker))
        s=s.replace(marker,text)
    put('/*@@ROOM@@*/',rd('m0_room.js'))
    put('/*@@MACHINES@@*/','\n'.join(rd(n) for n in ['m1_host.js','m2_cabinets.js','m2b_simpod.js','m3_tables.js','m4_floor.js','m5_prizes.js']))
    put("/*@@INTRO@@*/'live'","'"+intro+"'")
    put("/*@@ROOT@@*/'../'","'"+root+"'")
    put("/*@@DEMO@@*/false",'true' if demo else 'false')
    put('/*@@INTROS@@*/',rd('intro_variants.js') if intro!='live' else '')
    if intro!='live':put('<title>Hyperdot Arcade</title>','<title>Hyperdot Arcade · intro '+intro.upper()+'</title>')
    open(os.path.join(outdir or V2,out),'w',encoding='utf-8').write(s)
    print(os.path.join(outdir or 'v2',out),len(s.encode()),'bytes')
build('live','index.html')
for v in 'abc':build(v,'intro-'+v+'.html')
if '--demo' in sys.argv:
    dd=sys.argv[sys.argv.index('--demo')+1];os.makedirs(dd,exist_ok=True)
    build('live','live.html','',True,dd)
    for v in 'abc':build(v,'intro-'+v+'.html','',True,dd)
    # the demo's front page is written for the artifact host, which wraps it in its own document
    c=open(os.path.join(D,'demo_index.html'),encoding='utf-8').read()
    open(os.path.join(dd,'index.html'),'w',encoding='utf-8').write(c);print(os.path.join(dd,'index.html'))
