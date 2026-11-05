#!/usr/bin/env python3
"""Build Plush Panic 3D: shell.html + three.js (vendor/) + the art and models + js/*.js -> v2/games/claw3d.html

  python3 build.py              writes ../../games/claw3d.html (the published game, test hook stripped)
  python3 build.py --dev PATH   also writes PATH with the window.__game test hook kept (for test/*.py)
"""
import os, re, sys, glob, json, base64
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(D, '..', '..', 'games', 'claw3d.html'))
MACHINES = {'sugar': ['mochi', 'berry', 'toast', 'onigiri', 'pudding', 'boba', 'cupcake', 'donut'],
            'wild': ['frog', 'hedgehog', 'toadstool', 'fox', 'redpanda', 'owl', 'moth', 'hare'],
            'titan': ['whale', 'dino', 'sloth', 'dragon']}
ART = ['machine/%s_%s.webp' % (m, k) for m in MACHINES for k in ('wall', 'marquee', 'side')] + \
      ['fabric/felt.webp', 'fabric/minky.webp', 'fabric/velvet.webp', 'extra/reflect.webp']

def three_iife_body():
    src = open(os.path.join(D, 'vendor', 'three.module.min.js'), encoding='utf-8').read()
    m = re.search(r'export\{([^}]*)\};?\s*$', src)
    pairs = []
    for item in m.group(1).split(','):
        item = item.strip()
        a, b = (item.split(' as ') + [None])[:2] if ' as ' in item else (item, item)
        pairs.append('%s:%s' % (b.strip(), a.strip()))
    body = src[:m.start()] + '\nreturn {' + ','.join(pairs) + '};'
    assert 'import.meta' not in body and not re.search(r'^\s*import\s', body, re.M)
    return body

def piles():
    """the settled piles (tools/bake_piles.js); baked again when the physics, claw or machines have changed"""
    out = os.path.join(D, 'models', 'piles.json')
    deps = [os.path.join(D, 'js', f) for f in ('10_phys.js', '11_claw.js', '20_machine.js')] + [os.path.join(D, 'models', 'index.json')]
    if not os.path.exists(out) or os.path.getmtime(out) < max(os.path.getmtime(f) for f in deps) or '--bake' in sys.argv:
        import subprocess
        txt = subprocess.run(['node', os.path.join(D, 'tools', 'bake_piles.js'), '3'], check=True, capture_output=True, text=True).stdout
        json.loads(txt); open(out, 'w').write(txt); print('baked the piles ->', os.path.relpath(out, os.getcwd()))
    return open(out).read().strip()

def assets():
    idx = json.load(open(os.path.join(D, 'models', 'index.json')))
    data, sizes, n = {}, {}, 0
    for ids in MACHINES.values():
        for pid in ids:
            data['bin/m/' + pid] = base64.b64encode(open(os.path.join(D, 'models', pid + '.bin'), 'rb').read()).decode()
            data['img/p/' + pid] = base64.b64encode(open(os.path.join(D, 'models', pid + '.webp'), 'rb').read()).decode()
            sizes[pid] = {'size': idx[pid]['size']}
    for a in ART:
        key = 'img/' + a.split('/')[0].replace('machine', 'mach').replace('fabric', 'fab') + '/' + os.path.splitext(os.path.basename(a))[0]
        data[key] = base64.b64encode(open(os.path.join(D, 'art', a), 'rb').read()).decode()
    raw = sum(len(v) for v in data.values()) * 3 // 4
    bulbs = open(os.path.join(D, 'art', 'machine', 'bulbs.json')).read().strip()
    js = 'const ASSET_DATA=' + json.dumps(data, separators=(',', ':')) + ';\nconst PLUSHIDX=' + json.dumps(sizes) + ';\nconst MBULBS=' + bulbs + ';\nconst PILES=' + piles() + ';'
    return js, raw

def build(dev_path=None):
    shell = open(os.path.join(D, 'shell.html'), encoding='utf-8').read()
    parts = []
    for f in sorted(glob.glob(os.path.join(D, 'js', '*.js'))):
        parts.append('/* ---- %s ---- */\n' % os.path.basename(f) + open(f, encoding='utf-8').read().rstrip('\n'))
    game = '\n'.join(parts)
    a, raw = assets()
    for tag in ('/*@@THREE@@*/', '/*@@GAME@@*/', '/*@@ASSETS@@*/'):
        assert shell.count(tag) == 1, tag
    doc = shell.replace('/*@@THREE@@*/', three_iife_body()).replace('/*@@ASSETS@@*/', a).replace('/*@@GAME@@*/', game)
    pub = re.sub(r'/\*@@HOOK\*/.*?/\*HOOK@@\*/\n?', '', doc, flags=re.S)
    assert '__game' not in pub
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(pub)
    print('wrote', os.path.relpath(OUT, os.getcwd()), '%.2f MB (art and models %.2f MB before packing)' % (len(pub.encode()) / 1e6, raw / 1e6))
    if dev_path:
        open(dev_path, 'w', encoding='utf-8').write(doc)
        print('wrote', dev_path, '(dev, with the test hook)')

if __name__ == '__main__':
    build(sys.argv[sys.argv.index('--dev') + 1] if '--dev' in sys.argv else None)
