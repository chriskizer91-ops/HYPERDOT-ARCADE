"""Build Lantern: The Long Night: python3 build.py  ->  ../../games/lanternr.html

The numbered modules are joined in order into shell.html. The published file has the test
hooks taken out (window.__la, the autopilot switch window.__auto), the same way the original
Lantern's build does it. `python3 build.py --dev OUT.html` also writes a copy that keeps them,
for headless tests.
"""
import base64, glob, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)
shell = open('shell.html', encoding='utf-8').read()
files = sorted(glob.glob('[0-9][0-9]_*.js'))
code = '\n'.join(open(f, encoding='utf-8').read() for f in files)
out = shell.replace('/*@@CODE@@*/', code)
# Studio's pictures: img/<image list number>.jpg|png|webp, e.g. img/1.1.jpg for the cobbles, go in as data URLs
MIME = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'}
imgs = {}
for f in sorted(glob.glob('img/*')):
    k, ext = os.path.splitext(os.path.basename(f))
    if ext.lower() in MIME:
        imgs[k] = 'data:' + MIME[ext.lower()] + ';base64,' + base64.b64encode(open(f, 'rb').read()).decode()
assert '/*@@IMGS@@*/{}' in out
out = out.replace('/*@@IMGS@@*/{}', json.dumps(imgs))
if '--dev' in sys.argv:
    open(sys.argv[sys.argv.index('--dev') + 1], 'w', encoding='utf-8').write(out)
pub = re.sub(r"  window\.__la=\{.*?\};\n", "", out, flags=re.S)
for a, b in [("let ctl=c;if(window.__auto){ctl=autopilot();if(ctl.b)fireFlare();}else if(e.b)fireFlare();", "let ctl=c;if(e.b)fireFlare();"),
             ("(e.ok||tap||window.__auto&&S.t>6)", "(e.ok||tap)"),
             ("if(en.t>30||window.__auto)commitEntry();", "if(en.t>30)commitEntry();"),
             ("if(m==='demo'||window.__auto){", "if(m==='demo'){"),
             ("if(playing()&&!window.__auto)camInput", "if(playing())camInput")]:
    assert a in pub, a
    pub = pub.replace(a, b)
assert '__la' not in pub and '__auto' not in pub
dst = os.path.normpath(os.path.join(here, '..', '..', 'games', 'lanternr.html'))
open(dst, 'w', encoding='utf-8').write(pub)
print('built', dst, len(pub), 'bytes from', len(files), 'modules and', len(imgs), 'pictures')
