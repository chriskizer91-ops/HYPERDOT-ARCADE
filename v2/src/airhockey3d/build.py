#!/usr/bin/env python3
"""Build Air Hockey 3D: shell.html + three.js (vendor/) + js/*.js -> v2/games/airhockey3d.html

  python3 build.py              writes ../../games/airhockey3d.html (the published game, test hook stripped)
  python3 build.py --dev PATH   also writes PATH with the window.__game test hook kept (for test/*.py)
"""
import os, re, sys, glob
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(D, '..', '..', 'games', 'airhockey3d.html'))

def three_iife_body():
    src = open(os.path.join(D, 'vendor', 'three.module.min.js'), encoding='utf-8').read()
    m = re.search(r'export\{([^}]*)\};?\s*$', src)
    assert m, 'export list not found'
    pairs = []
    for item in m.group(1).split(','):
        item = item.strip()
        a, b = (item.split(' as ') + [None])[:2] if ' as ' in item else (item, item)
        pairs.append('%s:%s' % (b.strip(), a.strip()))
    body = src[:m.start()] + '\nreturn {' + ','.join(pairs) + '};'
    assert 'import.meta' not in body and not re.search(r'^\s*import\s', body, re.M)
    return body

def build(dev_path=None):
    shell = open(os.path.join(D, 'shell.html'), encoding='utf-8').read()
    parts = []
    for f in sorted(glob.glob(os.path.join(D, 'js', '*.js'))):
        parts.append('/* ---- %s ---- */\n' % os.path.basename(f) + open(f, encoding='utf-8').read().rstrip('\n'))
    game = '\n'.join(parts)
    assert shell.count('/*@@THREE@@*/') == 1 and shell.count('/*@@GAME@@*/') == 1
    doc = shell.replace('/*@@THREE@@*/', lambda_safe(three_iife_body())).replace('/*@@GAME@@*/', lambda_safe(game))
    pub = re.sub(r'/\*@@HOOK\*/.*?/\*HOOK@@\*/\n?', '', doc, flags=re.S)
    assert '__game' not in pub
    open(OUT, 'w', encoding='utf-8').write(pub)
    print('wrote', os.path.relpath(OUT, os.getcwd()), '%.0f KB' % (len(pub.encode()) / 1024))
    if dev_path:
        open(dev_path, 'w', encoding='utf-8').write(doc)
        print('wrote', dev_path, '(dev, with the test hook)')

def lambda_safe(s):
    return s  # str.replace takes the text literally

if __name__ == '__main__':
    dev = sys.argv[sys.argv.index('--dev') + 1] if '--dev' in sys.argv else None
    build(dev)
