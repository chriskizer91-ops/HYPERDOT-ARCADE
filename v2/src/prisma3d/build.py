"""Build Prisma 3D: shell.html + js/*.js -> v2/games/prisma3d.html (one self-contained file).
Run from anywhere:  python3 v2/src/prisma3d/build.py
"""
import glob, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'games', 'prisma3d.html'))

shell = open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
files = sorted(glob.glob(os.path.join(HERE, 'js', '[0-9]*_*.js')))
code = '\n'.join(open(f, encoding='utf-8').read() for f in files)
assert '/*@@CODE@@*/' in shell
out = shell.replace('/*@@CODE@@*/', code)
open(OUT, 'w', encoding='utf-8').write(out)
print('built', OUT, f'{len(out.encode()) / 1024:.0f} KB', [os.path.basename(f) for f in files])
