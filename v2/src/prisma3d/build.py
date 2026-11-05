"""Build Prisma 3D: shell.html + js/*.js + art/ -> v2/games/prisma3d.html (one self-contained file).
Run from anywhere:  python3 v2/src/prisma3d/build.py

art/*.webp are Christopher's images, processed for the game (see art/README.md). They're embedded as data URIs,
so the page still works as a single file inside the arcade's cabinet.
"""
import glob, os, json, base64

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'games', 'prisma3d.html'))
ART = os.path.join(HERE, 'art')

shell = open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
files = sorted(glob.glob(os.path.join(HERE, 'js', '[0-9]*_*.js')))
art = {}
for p in sorted(glob.glob(os.path.join(ART, '*.webp'))):
    art[os.path.splitext(os.path.basename(p))[0]] = 'data:image/webp;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
signs = json.load(open(os.path.join(ART, 'signs.json')))
veh = json.load(open(os.path.join(ART, 'vehicles.json')))
head = ('/* ---- the art: processed from Christopher\'s images, embedded so the game stays one file ---- */\n'
        'const ART=' + json.dumps(art, separators=(',', ':')) + ';\n'
        'const SIGNS=' + json.dumps(signs, separators=(',', ':')) + ';\n'
        'const VEHDATA=' + json.dumps(veh, separators=(',', ':')) + ';\n')
code = head + '\n'.join(open(f, encoding='utf-8').read() for f in files)
assert '/*@@CODE@@*/' in shell
out = shell.replace('/*@@CODE@@*/', code)
open(OUT, 'w', encoding='utf-8').write(out)
print('built', OUT, f'{len(out.encode()) / 1e6:.2f} MB ({len(art)} images)', [os.path.basename(f) for f in files])
