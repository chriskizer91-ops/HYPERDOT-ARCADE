"""Build Voltfist 3D into one self-contained page.

    python3 build.py                  writes ../../games/voltfist3d.html
    python3 build.py --debug OUT.html  also writes a test build with the window.__vf3 test handle (99_debug.js)

The game is every NN_*.js module in this folder, in order, inside one closure, plus the vendored three.js bundle.
02-07 are copied unchanged from the original game (src/voltfist/), so the fight plays exactly the same; this script
says so, or warns if the original has changed since they were copied.
"""
import glob, os, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ORIG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'src', 'voltfist'))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'games', 'voltfist3d.html'))
VERBATIM = {'02_rig.js': '2_rig.js', '03_looks.js': '3_looks.js', '04_moves.js': '4_moves.js',
            '05_fight.js': '5_fight.js', '06_fx.js': '6_fx.js', '07_ai.js': '7_ai.js'}


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def main():
    debug = None
    if '--debug' in sys.argv:
        debug = sys.argv[sys.argv.index('--debug') + 1]
    os.chdir(HERE)
    for mine, theirs in VERBATIM.items():
        op = os.path.join(ORIG, theirs)
        if os.path.exists(op):
            same = read(mine) == read(op)
            print(('same as original  ' if same else 'WARNING: differs from original  ') + mine + ' = src/voltfist/' + theirs)
    shell = read('shell.html')
    three = read(os.path.join('vendor', 'three.vf.js'))
    mods = sorted(f for f in glob.glob('[0-9][0-9]_*.js') if not f.startswith('99_'))
    code = '\n'.join(read(f) for f in mods)
    page = shell.replace('/*@@THREE@@*/', three).replace('/*@@CODE@@*/', code)
    assert '/*@@' not in page
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(page)
    print('built', OUT, len(page.encode('utf-8')), 'bytes from', mods)
    if debug:
        dpage = shell.replace('/*@@THREE@@*/', three).replace('/*@@CODE@@*/', code + '\n' + read('99_debug.js'))
        with open(debug, 'w', encoding='utf-8') as f:
            f.write(dpage)
        print('debug build', debug, hashlib.md5(dpage.encode()).hexdigest()[:8])


if __name__ == '__main__':
    main()
