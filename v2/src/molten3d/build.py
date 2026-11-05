"""Build Molten 3D.

  python3 build.py            writes ../../games/molten3d.html (the published game)
  python3 build.py --dev OUT  also writes OUT, a test build that keeps the window.__mo test hooks
"""
import glob,re,sys,os
here=os.path.dirname(os.path.abspath(__file__));os.chdir(here)
shell=open('shell.html').read()
code='\n'.join(open(f).read() for f in sorted(glob.glob('[0-9]*_*.js')))
for name in sorted(glob.glob('*.glsl')):
    src=open(name).read()
    assert '`' not in src,name
    tag='/*@@'+os.path.splitext(name)[0].upper()+'@@*/'
    assert tag in code,tag
    code=code.replace(tag,src)
# the art: every prepared picture in art/, as data the page can decode itself
import base64,json
art={os.path.splitext(os.path.basename(f))[0]:'data:image/webp;base64,'+base64.b64encode(open(f,'rb').read()).decode() for f in sorted(glob.glob('art/*.webp'))}
assert '/*@@ART@@*/{}' in code
code=code.replace('/*@@ART@@*/{}',json.dumps(art,separators=(',',':')))
out=shell.replace('/*@@CODE@@*/',code)
pub=re.sub(r"  window\.__mo=\{.*?\};\n","",out,flags=re.S)
pub=pub.replace("    if(window.__auto)Object.assign(ctl,autopilot());\n","")
assert '__mo' not in pub and '__auto' not in pub
dst=os.path.join('..','..','games','molten3d.html')
open(dst,'w').write(pub)
if '--dev' in sys.argv:
    open(sys.argv[sys.argv.index('--dev')+1],'w').write(out)
print('built',dst,len(pub),'bytes',len(art),'pictures')
