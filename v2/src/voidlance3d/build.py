"""Builds Voidlance 3D into one self-contained page.

    python3 build.py              writes ../../games/voidlance3d.html (the published game)
    python3 build.py --dev OUT    writes OUT with a window.__vl3 test handle, for headless testing
"""
import glob, os, sys

here = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(here, 'shell.html')).read()
files = sorted(glob.glob(os.path.join(here, '[a-z]_*.js')))
code = '\n'.join(open(f).read() for f in files)

TEST = '''window.__vl3={G,get PL(){return PL},PLS,ENT,FX,BOLTS,CAM,MISSIONS,ARC,GLX,PERF,QL,KEY,MOUSE,TS,LATCH,
  startDemo,newCampaign,brief,launch,tick,draw,renderFrame,setQuality,openOptions,setPause,endMission,afterDebrief,damage,useTheme,
  get qI(){return qI},get NI(){return NI},get RW(){return RW},get RH(){return RH},get DOTF(){return DOTF},set DOTF(v){DOTF=v},
  ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();}};'''

dev = '--dev' in sys.argv
code = code.replace('/*@@TEST@@*/', TEST if dev else '')
out = shell.replace('/*@@CODE@@*/', code)
dest = sys.argv[sys.argv.index('--dev') + 1] if dev else os.path.normpath(os.path.join(here, '..', '..', 'games', 'voidlance3d.html'))
if not dev:
    assert '__vl3' not in out
open(dest, 'w').write(out)
print('built', dest, len(out), 'bytes from', [os.path.basename(f) for f in files])
