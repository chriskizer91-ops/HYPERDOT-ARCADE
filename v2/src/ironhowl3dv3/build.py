"""Builds Ironhowl V3 into one self-contained page.

    python3 build.py              writes ../../games/ironhowl3dv3.html
    python3 build.py --dev PATH   also writes a copy that keeps the test handle (window.__ih3) at PATH

The page inlines vendor/three.min.js (three.js r187, bundled once with esbuild as an IIFE that sets window.THREE)
and the game modules 01_*.js ... 10_*.js in order, inside shell.html.
"""
import glob, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)
shell = open('shell.html', encoding='utf-8').read()
three = open('vendor/three.min.js', encoding='utf-8').read()
files = sorted(glob.glob('[0-9][0-9]_*.js'))
code = '\n'.join(open(f, encoding='utf-8').read() for f in files)
assert '</script' not in three and '</script' not in code
out = shell.replace('/*@@THREE@@*/', three, 1).replace('/*@@CODE@@*/', code, 1)
if '--dev' in sys.argv:
    dev = sys.argv[sys.argv.index('--dev') + 1]
    open(dev, 'w', encoding='utf-8').write(out)
    print('dev', dev, len(out))
pub = re.sub(r"  window\.__ih3=\{.*?\}\};\n", "", out, flags=re.S)
assert '__ih3' not in pub
dst = os.path.normpath(os.path.join(here, '..', '..', 'games', 'ironhowl3dv3.html'))
os.makedirs(os.path.dirname(dst), exist_ok=True)
open(dst, 'w', encoding='utf-8').write(pub)
print('built', dst, len(pub), 'bytes from', files)
