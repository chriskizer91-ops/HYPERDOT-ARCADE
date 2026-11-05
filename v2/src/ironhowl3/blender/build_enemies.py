"""FORGE machines: skitter, hound, gunner, lancer. Run: <venv>/python build_enemies.py OUTDIR
Dark metal with red eyes and FORGE's gear emblem. Materials: egrey egun edark esteel ered emblem.
Joints the game moves: skitter body leg0..leg3 | hound body head legFL legFR legBL legBR (+ kneeXX) | gunner hips thigh_L/R knee_L/R ankle_L/R torso armL armR mzL mzR."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def mats():
    return dict(g=mat('egrey', (.34, .3, .3), rough=.5, metal=.45), k=mat('egun', (.16, .16, .18), rough=.45, metal=.7),
                d=mat('edark', (.05, .05, .055), rough=.7, metal=.4), s=mat('esteel', (.6, .6, .62), rough=.3, metal=.9),
                r=mat('ered', (1, .12, .06), emit=8), e=mat('emblem', (1, 1, 1)))

def skitter():
    reset(); M = mats(); root = node('skitter'); b = node('body', (0, 0, .95), root)
    box('shell', (1.0, 1.3, .42), (0, 0, 0), b, M['g'], .12, top=(.72, .78))
    box('belly', (.78, 1.0, .26), (0, 0, -.26), b, M['k'], .06)
    box('hd', (.56, .42, .3), (0, .74, -.06), b, M['k'], .06, top=(.8, .8))
    for i, x in enumerate((-.13, 0, .13)): box('eye%d' % i, (.08, .04, .08), (x, .96, -.02 + (.05 if x == 0 else 0)), b, M['r'], .015)
    for x in (-.15, .15): strut('prong%s' % x, (x, .9, -.16), (x * 1.3, 1.35, -.22), .03, b, M['s'], seg=6)
    slats('ridge', 3, (.5, .1, .06), .3, (0, -.05, .24), b, M['k'], axis='y')
    for i, (sx, sy) in enumerate([(-1, 1), (1, 1), (-1, -1), (1, -1)]):
        L = node('leg%d' % i, (sx * .42, sy * .38, -.05), b)
        k = (sx * .62, sy * .18, .42); f = (sx * .95, sy * .3, -.93)
        strut('up%d' % i, (0, 0, 0), k, .075, L, M['k'], sq=True); ball('kj%d' % i, .1, k, L, M['d'], 10)
        strut('lo%d' % i, k, f, .06, L, M['g'], sq=True); strut('tip%d' % i, (f[0], f[1], f[2] + .25), f, .035, L, M['s'], seg=6)
    bake_ao(.35, 16); return stats()

def hound():
    reset(); M = mats(); root = node('hound'); b = node('body', (0, 0, 1.75), root)
    box('torso', (1.2, 2.5, .9), (0, 0, 0), b, M['g'], .14, top=(.85, .9))
    slats('spine', 5, (.46, .26, .14), .42, (0, -.1, .5), b, M['k'], axis='y')
    box('chest', (1.0, .5, .7), (0, 1.15, -.15), b, M['k'], .1)
    box('hips', (1.05, .5, .65), (0, -1.15, -.1), b, M['k'], .1)
    for sd in (-1, 1): box('flank%d' % sd, (.1, 1.6, .55), (sd * .6, 0, -.05), b, M['k'], .03)
    strut('tail', (0, -1.3, .15), (0, -2.1, .55), .07, b, M['s'], seg=8); box('tailfin', (.08, .4, .3), (0, -2.1, .62), b, M['r'], .02)
    h = node('head', (0, 1.45, .15), b)
    box('skull', (.7, .95, .55), (0, .25, 0), h, M['k'], .1, top=(.75, .7), shift=(0, .08))
    box('jaw', (.55, .6, .2), (0, .45, -.32), h, M['d'], .05, rot=(.12, 0, 0))
    box('visor', (.52, .06, .09), (0, .7, .06), h, M['r'], .02, rot=(-.35, 0, 0))
    for sd in (-1, 1): box('horn%d' % sd, (.08, .42, .14), (sd * .26, -.1, .32), h, M['g'], .03, top=(.4, .5), rot=(.5, 0, 0))
    for nm, sx, sy, kz in [('FL', -1, 1, .25), ('FR', 1, 1, .25), ('BL', -1, -1, -.25), ('BR', 1, -1, -.25)]:
        L = node('leg' + nm, (sx * .56, sy * .95, -.25), b)
        box('th' + nm, (.32, .42, .85), (sx * .04, 0, -.38), L, M['g'], .08, bot=(.75, .8))
        k = node('knee' + nm, (0, -kz * .5, -.8), L)
        ball('kb' + nm, .14, (0, 0, 0), k, M['d'], 10)
        strut('sh' + nm, (0, 0, 0), (0, kz * .5, -.68), .1, k, M['k'], sq=True)
        box('paw' + nm, (.3, .42, .14), (0, kz * .5 + .1, -.72), k, M['d'], .04)
    bake_ao(.45, 16); return stats()

def gunner():
    reset(); M = mats(); root = node('gunner'); hp = node('hips', (0, 0, 1.9), root)
    box('pelvis', (1.0, .7, .45), (0, 0, 0), hp, M['k'], .07)
    legs = []
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        t = node('thigh_' + s, (sd * .58, 0, -.05), hp)
        box('th' + s, (.46, .52, .95), (0, 0, -.5), t, M['k'], .07, bot=(.85, .85))
        box('thp' + s, (.08, .4, .6), (sd * .26, 0, -.45), t, M['g'], .02)
        k = node('knee_' + s, (0, 0, -1.0), t)
        cyl('kj' + s, .2, .44, (0, 0, 0), k, M['d'], seg=14, axis='x')
        box('sh' + s, (.4, .46, .95), (0, 0, -.52), k, M['g'], .07, bot=(.8, .8)); box('kc' + s, (.34, .16, .3), (0, .24, 0), k, M['g'], .04)
        a = node('ankle_' + s, (0, 0, -1.0), k)
        box('ft' + s, (.5, .85, .2), (0, .14, -.16), a, M['k'], .05)
        legs.append((t, k, a))
    to = node('torso', (0, 0, 1.9), root)
    box('hull', (1.6, 1.3, 1.1), (0, 0, .78), to, M['g'], .14, top=(.9, .85))
    box('chestP', (1.2, .2, .7), (0, .64, .78), to, M['k'], .05, top=(.9, 1))
    ball('dome', .36, (0, .2, 1.42), to, M['k'], 16)
    box('eyeV', (.42, .06, .1), (0, .53, 1.48), to, M['r'], .02)
    box('pack', (1.1, .5, .8), (0, -.85, .85), to, M['k'], .08)
    slats('vents', 4, (.8, .04, .08), .16, (0, -1.11, .85), to, M['r'], axis='z')
    decal('emb', .62, .62, (0, 0, 1, 1), (0, .75, .82), to, M['e'], (0, 0, math.pi))
    ar = node('armR', (.98, .1, .95), to)
    cyl('shR', .26, .4, (0, 0, 0), ar, M['d'], seg=14, axis='x')
    box('canR', (.52, 1.6, .52), (0, .45, -.15), ar, M['k'], .07)
    cyl('brR', .14, 1.0, (0, 1.6, -.15), ar, M['s'], seg=14, axis='y'); cyl('mbR', .19, .25, (0, 2.1, -.15), ar, M['d'], seg=14, axis='y')
    node('mzR', (0, 2.25, -.15), ar)
    al = node('armL', (-.98, .1, .95), to)
    cyl('shL', .24, .4, (0, 0, 0), al, M['d'], seg=14, axis='x')
    box('canL', (.44, 1.2, .44), (0, .35, -.12), al, M['k'], .06)
    for x in (-.09, .09): cyl('brL%s' % x, .065, .8, (x, 1.25, -.12), al, M['s'], seg=10, axis='y')
    node('mzL', (0, 1.68, -.12), al)
    for t, k, a in legs:
        t.rotation_euler.x = .35; k.rotation_euler.x = -.7; a.rotation_euler.x = .35
    bake_ao(.45, 16); return stats()

def lancer():
    """tall sniper walker with a rail gun; same joints as the gunner, knees bend backward"""
    reset(); M = mats(); root = node('lancer'); hp = node('hips', (0, 0, 3.0), root)
    box('pelvis', (.8, .6, .4), (0, 0, 0), hp, M['k'], .06)
    legs = []
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        t = node('thigh_' + s, (sd * .48, 0, -.05), hp)
        box('th' + s, (.3, .36, 1.55), (0, 0, -.78), t, M['k'], .06, bot=(.7, .8))
        box('thp' + s, (.07, .32, .9), (sd * .18, 0, -.6), t, M['g'], .02)
        box('ths' + s, (.08, .05, .7), (sd * .19, .17, -.6), t, M['r'], .01)
        k = node('knee_' + s, (0, 0, -1.55), t)
        cyl('kj' + s, .17, .4, (0, 0, 0), k, M['d'], seg=12, axis='x')
        box('sh' + s, (.24, .28, 1.55), (0, 0, -.78), k, M['g'], .05, bot=(.75, .75))
        strut('pis' + s, (0, -.2, -.15), (0, -.12, -1.2), .05, k, M['s'], seg=6)
        a = node('ankle_' + s, (0, 0, -1.55), k)
        box('ft' + s, (.42, .95, .16), (0, .2, -.1), a, M['k'], .04)
        for x in (-.12, .12): box('toe%s%s' % (s, x), (.1, .32, .12), (x, .78, -.12), a, M['d'], .02, top=(.6, .8))
        box('heel' + s, (.16, .3, .12), (0, -.36, -.1), a, M['d'], .02)
        legs.append((t, k, a))
    to = node('torso', (0, 0, 3.0), root)
    box('hull', (1.1, 1.3, .75), (0, 0, .5), to, M['g'], .1, top=(.85, .8))
    box('pack', (.9, .6, .6), (0, -.85, .55), to, M['k'], .06)
    slats('vents', 3, (.6, .04, .07), .14, (0, -1.16, .55), to, M['r'], axis='z')
    box('head', (.66, .95, .32), (0, .45, 1.05), to, M['k'], .06, top=(.8, .75), shift=(0, .08))
    box('visor', (.5, .06, .07), (0, .93, 1.07), to, M['r'], .015)
    box('brow', (.72, .3, .08), (0, .7, 1.25), to, M['g'], .02)
    strut('ant', (-.25, -.1, 1.2), (-.3, -.25, 2.1), .025, to, M['s'], seg=5)
    decal('emb', .5, .5, (0, 0, 1, 1), (0, .66, .6), to, M['e'], (0, 0, math.pi))
    ar = node('armR', (.72, .15, .55), to)
    cyl('shR', .22, .34, (0, 0, 0), ar, M['d'], seg=12, axis='x')
    box('rail', (.28, 3.4, .34), (.14, 1.4, -.12), ar, M['k'], .05)
    box('railTop', (.2, 2.8, .1), (.14, 1.6, .1), ar, M['g'], .02)
    box('railGlow', (.05, 2.8, .07), (.3, 1.5, -.08), ar, M['r'], .01)
    box('scope', (.14, .6, .16), (.14, .5, .24), ar, M['d'], .02)
    cyl('brR', .09, 1.3, (.14, 3.7, -.1), ar, M['s'], seg=10, axis='y'); cyl('mbR', .15, .3, (.14, 4.35, -.1), ar, M['d'], seg=10, axis='y')
    node('mzR', (.14, 4.55, -.1), ar)
    al = node('armL', (-.72, .15, .55), to)
    cyl('shL', .2, .3, (0, 0, 0), al, M['d'], seg=12, axis='x')
    box('pod', (.34, .7, .34), (0, .3, -.1), al, M['k'], .04)
    box('podEye', (.2, .04, .1), (0, .66, -.06), al, M['r'], .01)
    node('mzL', (0, .7, -.1), al)
    for t, k, a in legs:
        t.rotation_euler.x = -.45; k.rotation_euler.x = .9; a.rotation_euler.x = -.45
    bake_ao(.5, 16); return stats()

if __name__ == '__main__':
    import lib; lib.AUTO = {'detail': ('egrey',), 'wear': ('egrey',)}
    out = sys.argv[-1]
    for fn in ([globals()[a] for a in sys.argv[1:-1] if a in globals()] or (skitter, hound, gunner, lancer)):
        t = fn(); p = os.path.join(out, fn.__name__ + '.glb'); export(p); print(fn.__name__, 'tris', t, 'KB', os.path.getsize(p) // 1024)
