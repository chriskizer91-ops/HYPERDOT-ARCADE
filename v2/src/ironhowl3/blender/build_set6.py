"""Session 6 models: Rook's salvage truck and the Thresher boss. Run: <venv>/python build_set6.py OUTDIR
Truck: forward is +Y (three.js -Z). Materials use the mech names (org grey gun steel trim dark glass eye glow). Wheels w0..w5 spin.
Thresher: body (moves up/down), drum (spins), hatch (opens), core, hipFL/FR/BL/BR (swing), kneeFL.. (red weak points).
Materials: egrey egun edark esteel ered emblem (same as the other FORGE machines)."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def truck():
    reset(); root = node('truck')
    O = mat('org', (.8, .4, .12), rough=.5); G = mat('grey', (.4, .4, .4)); K = mat('gun', (.2, .2, .22), metal=.7); S = mat('steel', (.6, .6, .62), metal=.9)
    T = mat('trim', (.9, .7, .1)); D = mat('dark', (.05, .05, .06)); W = mat('glass', (.02, .03, .04)); E = mat('eye', (1, .8, .5), emit=6); A = mat('glow', (1, .5, .1), emit=6)
    box('frame', (1.3, 7.4, .32), (0, -.3, 1.0), root, D, .04)
    box('hood', (2.3, 1.6, .95), (0, 2.55, 1.75), root, O, .1, top=(.9, .92))
    box('grill', (1.5, .08, .6), (0, 3.36, 1.7), root, K, .02)
    box('cab', (2.4, 1.85, 1.55), (0, 1.0, 2.5), root, O, .1, top=(.93, .9))
    box('roofc', (2.2, 1.6, .12), (0, 1.0, 3.33), root, K, .03)
    box('wsh', (2.05, .06, .62), (0, 1.94, 2.82), root, W, .01)
    for sd in (-1, 1):
        box('swin%d' % sd, (.06, .9, .55), (sd * 1.21, 1.05, 2.8), root, W, .01)
        box('fend%d' % sd, (.5, 1.7, .25), (sd * 1.15, 2.5, 1.35), root, O, .05)
        box('mirror%d' % sd, (.1, .2, .4), (sd * 1.42, 1.85, 2.75), root, D, .02)
        box('lamp%d' % sd, (.4, .08, .3), (sd * .78, 3.36, 1.95), root, E, .02)
        box('step%d' % sd, (.3, .8, .08), (sd * 1.2, 1.1, 1.05), root, K, .02)
        box('tank%d' % sd, (.4, .9, .45), (sd * 1.0, -.6, 1.15), root, K, .05)
        box('rail%d' % sd, (.08, 4.6, .45), (sd * 1.22, -2.1, 1.95), root, G, .02)
        box('stripe%d' % sd, (.03, 1.0, .18), (sd * 1.27, -3.6, 1.95), root, T, .01)
        box('tail%d' % sd, (.3, .05, .16), (sd * .9, -4.42, 1.5), root, mat('red', (1, .1, .05), emit=4), .01)
    strut('bar0', (-1.0, 3.55, 1.2), (1.0, 3.55, 1.2), .07, root, D, seg=8)
    for x in (-1.0, -.35, .35, 1.0): strut('barv%s' % x, (x, 3.55, 1.0), (x, 3.45, 2.1), .06, root, D, seg=8)
    strut('bar1', (-1.0, 3.45, 2.1), (1.0, 3.45, 2.1), .06, root, D, seg=8)
    cyl('winch', .18, 1.0, (0, 3.6, 1.15), root, S, seg=10, axis='x')
    strut('stack', (-1.15, 1.95, 1.6), (-1.15, 1.95, 3.6), .12, root, D, seg=10)
    for sd in (-1, 1): strut('rackp%d' % sd, (sd * 1.0, 1.75, 3.35), (sd * 1.0, 1.75, 3.7), .04, root, D, seg=6)
    strut('rack', (-1.0, 1.75, 3.7), (1.0, 1.75, 3.7), .05, root, D, seg=6)
    for i, x in enumerate((-.75, -.25, .25, .75)): box('rl%d' % i, (.32, .2, .28), (x, 1.82, 3.78), root, E, .03)
    box('rbox', (1.3, .8, .4), (0, .7, 3.6), root, K, .04)
    cyl('beacon', .14, .22, (.8, .4, 3.55), root, A, seg=10)
    strut('aerial', (-.9, .3, 3.4), (-.9, .3, 5.0), .015, root, S, seg=4)
    box('bed', (2.5, 4.7, .22), (0, -2.1, 1.6), root, G, .03)
    box('tailg', (2.5, .1, .5), (0, -4.4, 1.95), root, G, .02)
    box('bedfront', (2.5, .12, .9), (0, .25, 2.15), root, K, .02)
    for i, y in enumerate((-.4, -1.0)): cyl('spare%d' % i, .58, .42, (-.5 + i * 1.0 * 0, y, 2.3), root, D, seg=16, axis='y', thick=.25)
    box('crateA', (.9, .7, .6), (.65, -.7, 2.0), root, K, .04)
    box('crateB', (.7, .9, .5), (-.7, -2.4, 1.95), root, K, .04)
    box('can', (.25, .4, .5), (.9, -2.4, 1.95), root, mat('red', (1, .1, .05), emit=4) if False else T, .03)
    cyl('cbase', .45, .6, (0, -3.5, 2.0), root, O, seg=14)
    strut('boom', (0, -3.5, 2.3), (0, -1.6, 4.6), .2, root, O, sq=True)
    strut('jib', (0, -1.6, 4.6), (0, -.4, 3.9), .14, root, O, sq=True)
    strut('ram', (0, -3.2, 2.2), (0, -2.3, 3.6), .08, root, S, seg=8)
    strut('cable', (0, -.4, 3.9), (0, -.4, 2.9), .02, root, D, seg=4)
    box('hook', (.2, .14, .3), (0, -.4, 2.8), root, T, .03)
    for i, (y, sd) in enumerate([(2.5, -1), (2.5, 1), (-1.6, -1), (-1.6, 1), (-3.0, -1), (-3.0, 1)]):
        w = node('w%d' % i, (sd * 1.2, y, .62), root)
        cyl('ty%d' % i, .62, .52, (0, 0, 0), w, D, seg=18, axis='x')
        cyl('hub%d' % i, .3, .54, (0, 0, 0), w, K, seg=10, axis='x')
    bake_ao(.5, 16); return stats()

def thresher():
    reset(); root = node('thresher')
    g = mat('egrey', (.34, .3, .3), rough=.5, metal=.45); k = mat('egun', (.16, .16, .18), rough=.45, metal=.7)
    d = mat('edark', (.05, .05, .055), rough=.7, metal=.4); s = mat('esteel', (.6, .6, .62), rough=.3, metal=.9)
    r = mat('ered', (1, .12, .06), emit=8); e = mat('emblem', (1, 1, 1))
    b = node('body', (0, 0, 9), root)
    box('hull', (8, 11, 4.2), (0, 0, 0), b, g, .35, top=(.92, .9), bot=(.85, .9))
    box('belly', (6, 9, 1), (0, 0, -2.4), b, k, .2)
    box('cabin', (5, 4.2, 2.6), (0, -.8, 3.4), b, k, .25, top=(.85, .8))
    slats('cwin', 4, (.7, .06, .4), 1.0, (0, 1.32, 3.6), b, r, axis='x')
    box('grille', (4, .2, 1.4), (0, 5.55, .6), b, k, .05)
    for sd in (-1, 1):
        box('side%d' % sd, (.3, 9, 1.6), (sd * 4.1, 0, .2), b, k, .05)
        slats('sglow%d' % sd, 5, (.08, .8, .14), 1.6, (sd * 4.27, 0, .9), b, r, axis='y')
        strut('arm%d' % sd, (sd * 3.4, 4.6, -1.6), (sd * 4.4, 7.6, -5.6), .45, b, k, sq=True)
        strut('armb%d' % sd, (sd * 3.4, 2.5, -2.0), (sd * 4.4, 7.4, -5.8), .25, b, s, seg=8)
    for i, (x, y, h) in enumerate([(-2.2, -3.6, 3.4), (0, -4.2, 4.2), (2.2, -3.6, 3.0)]):
        cyl('chim%d' % i, .5, h, (x, y, 2.1 + h / 2), b, k, seg=12)
        cyl('band%d' % i, .55, .3, (x, y, 2.1 + h * .7), b, r, seg=12)
    for x in (-2.4, 2.4): strut('rail%s' % x, (x, -3.2, 4.9), (x, 1.2, 4.9), .05, b, s, seg=5)
    for y in (-3.2, -1, 1.2):
        for x in (-2.4, 2.4): strut('post%s%s' % (x, y), (x, y, 4.7), (x, y, 5.4), .04, b, s, seg=5)
    decal('emb', 2.2, 2.2, (0, 0, 1, 1), (2.2, 5.56, 1.2), b, e, (0, 0, math.pi))
    cr = node('core', (0, 5.5, -.6), b)
    ball('coreb', 1.15, (0, 0, 0), cr, r, 18)
    cyl('ring', 1.6, .5, (0, .1, 0), cr, k, seg=18, axis='y', thick=.4)
    h = node('hatch', (0, 5.9, .55), b)
    box('hatchp', (3.2, .35, 2.6), (0, 0, -1.3), h, g, .1)
    dr = node('drum', (0, 7.6, -6.0), b)
    cyl('drumc', 1.7, 9.4, (0, 0, 0), dr, k, seg=20, axis='x')
    for sd in (-1, 1): cyl('drumcap%d' % sd, 1.95, .35, (sd * 4.8, 0, 0), dr, d, seg=20, axis='x')
    for i in range(10):
        a = i / 10 * 2 * math.pi
        for j, x in enumerate((-3.6, -1.8, 0, 1.8, 3.6)):
            off = (math.pi / 10) if j % 2 else 0
            ca, sa = math.cos(a + off), math.sin(a + off)
            box('t%d_%d' % (i, j), (.5, .35, .9), (x, ca * 2.1, sa * 2.1), dr, g if j % 2 else s, .04, top=(.4, .5), rot=(a + off - math.pi / 2, 0, 0))
    for nm, sx, sy in [('FL', -1, 1), ('FR', 1, 1), ('BL', -1, -1), ('BR', 1, -1)]:
        hp = node('hip' + nm, (sx * 3.9, sy * 3.6, -1.8), b)
        ball('hipb' + nm, .9, (0, 0, 0), hp, d, 12)
        kp = (sx * 3.2, 0, -3.4)
        strut('th' + nm, (0, 0, 0), kp, .55, hp, k, sq=True)
        box('thp' + nm, (.25, 1.2, 2.6), (sx * 1.9, 0, -1.6), hp, g, .06, rot=(0, -sx * .76, 0))
        kn = node('knee' + nm, kp, hp)
        ball('kball' + nm, 1.05, (0, 0, 0), kn, r, 14)
        cyl('kcol' + nm, 1.25, .5, (0, 0, 0), kn, k, seg=14, axis='y', thick=.3)
        strut('sh' + nm, kp, (sx * 4.0, 0, -8.4), .5, hp, g, sq=True)
        strut('shp' + nm, (sx * 3.4, .5, -4.4), (sx * 3.9, .45, -7.6), .12, hp, s, seg=6)
        box('foot' + nm, (1.8, 2.4, .6), (sx * 4.0, .2, -8.6), hp, d, .12, top=(.7, .7))
        for t in (-.6, 0, .6): box('claw%s%s' % (nm, t), (.3, .6, .4), (sx * 4.0 + t, 1.5, -8.7), hp, s, .04, top=(.5, .6))
    bake_ao(1.2, 12); return stats()

if __name__ == '__main__':
    out = sys.argv[-1]
    for fn in ([globals()[a] for a in sys.argv[1:-1] if a in globals()] or (truck, thresher)):
        t = fn(); p = os.path.join(out, fn.__name__ + '.glb'); export(p); print(fn.__name__, 'tris', t, 'KB', os.path.getsize(p) // 1024)
