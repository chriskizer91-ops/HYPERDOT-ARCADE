"""Session 7 models, after his sheets 50 (enemies) and 51 (bosses).
Run: <venv>/python build_set7.py [names...] OUTDIR   (names: hornet tank mortar bulwark stag maw forge)
All face +Y in Blender (-Z in three.js). Materials: egrey egun edark esteel ered emblem, like the other FORGE machines.
Joint names used by the game are listed in each builder's docstring."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def M():
    return dict(g=mat('egrey', (.34, .3, .3), rough=.5, metal=.45), k=mat('egun', (.16, .16, .18), rough=.45, metal=.7),
                d=mat('edark', (.05, .05, .055), rough=.7, metal=.4), s=mat('esteel', (.6, .6, .62), rough=.3, metal=.9),
                r=mat('ered', (1, .12, .06), emit=8), e=mat('emblem', (1, 1, 1)))

def hornet():
    """body (root of the moving part), rot0..3 (spinning blades), mz (stinger muzzle). About 3.4 m across."""
    reset(); m = M(); root = node('hornet'); b = node('body', (0, 0, 0), root)
    box('core', (1.0, 1.7, .62), (0, 0, 0), b, m['g'], .1, top=(.8, .75))
    box('nose', (.7, .6, .4), (0, 1.05, -.05), b, m['k'], .08, top=(.6, .6))
    box('eye', (.5, .06, .1), (0, 1.36, 0), b, m['r'], .02)
    box('tail', (.16, .7, .5), (0, -1.1, .15), b, m['k'], .03, top=(.5, 1))
    box('belly', (.6, 1.0, .25), (0, 0, -.4), b, m['d'], .05)
    decal('emb', .45, .45, (0, 0, 1, 1), (0, .2, .32), b, m['e'], (math.pi / 2, 0, 0))
    for i, (x, y) in enumerate([(-1.35, 1.0), (1.35, 1.0), (-1.35, -1.0), (1.35, -1.0)]):
        strut('arm%d' % i, (math.copysign(.4, x), y * .4, 0), (x, y, .05), .08, b, m['k'], sq=True)
        cyl('duct%d' % i, .78, .24, (x, y, .08), b, m['k'], seg=20, thick=.1, cap=False)
        cyl('rim%d' % i, .8, .06, (x, y, .2), b, m['r'], seg=20, thick=.04, cap=False)
        cyl('hub%d' % i, .12, .3, (x, y, .08), b, m['d'], seg=8)
        rt = node('rot%d' % i, (x, y, .12), b)
        for a in (0, math.pi / 2): box('bl%d_%d' % (i, a > 0), (1.35, .14, .03), (0, 0, 0), rt, m['d'], .01, rot=(0, 0, a + .3))
    strut('gunarm', (0, .3, -.4), (0, .7, -.75), .07, b, m['k'], seg=8)
    cyl('gun', .1, 1.0, (0, 1.1, -.78), b, m['s'], seg=10, axis='y'); box('gunb', (.24, .4, .2), (0, .7, -.78), b, m['d'], .03)
    node('mz', (0, 1.65, -.78), b)
    for sd in (-1, 1): strut('skid%d' % sd, (sd * .35, .4, -.45), (sd * .45, -.3, -.75), .03, b, m['d'], seg=5)
    bake_ao(.4, 12); return stats()

def tank():
    """turret (yaws), gun (pitches, child of turret), mz (muzzle, child of gun), wL0..5/wR0..5 (road wheels). About 7 x 3.8 x 2.5 m."""
    reset(); m = M(); root = node('tank')
    box('hull', (3.2, 6.4, 1.0), (0, 0, 1.0), root, m['g'], .12, top=(.9, .8), shift=(0, .2))
    box('glacis', (3.1, 1.2, .5), (0, 3.25, .85), root, m['g'], .08, top=(1, .3))
    box('rear', (2.8, .6, .8), (0, -3.3, 1.0), root, m['k'], .05)
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        box('track' + s, (.85, 6.9, 1.0), (sd * 1.95, 0, .55), root, m['d'], .2)
        for i in range(6):
            w = node('w%s%d' % (s, i), (sd * 1.95, -2.5 + i, .45), root)
            cyl('rw%s%d' % (s, i), .38, .9, (0, 0, 0), w, m['k'], seg=12, axis='x')
        box('skirt' + s, (.12, 6.2, .62), (sd * 2.42, 0, .82), root, m['g'], .03)
        for j in range(2): box('str%s%d' % (s, j), (.03, .35, .7), (sd * 2.49, 1.6 + j * .5, .82), root, m['r'], .01, rot=(-.6, 0, 0))
        box('fender' + s, (.9, 6.8, .1), (sd * 1.95, 0, 1.12), root, m['k'], .02)
    t = node('turret', (0, -.4, 1.5), root)
    box('tur', (2.4, 2.9, .78), (0, 0, .39), t, m['g'], .12, top=(.82, .8))
    box('turback', (2.0, .8, .6), (0, -1.75, .38), t, m['k'], .06)
    cyl('hatch', .38, .2, (.5, -.4, .85), t, m['k'], seg=12)
    box('lamp', (.3, .14, .12), (-.6, .7, .86), t, m['r'], .02)
    strut('ant', (-.8, -1.6, .7), (-.85, -1.8, 2.4), .02, t, m['s'], seg=4)
    decal('emb', .7, .7, (0, 0, 1, 1), (1.13, -.3, .45), t, m['e'], (math.pi / 2, 0, math.pi / 2))
    gn = node('gun', (0, 1.3, .38), t)
    box('mantlet', (.8, .6, .5), (0, 0, 0), gn, m['k'], .06)
    cyl('barrel', .14, 4.0, (0, 2.2, 0), gn, m['s'], seg=12, axis='y')
    box('brake', (.36, .55, .36), (0, 4.35, 0), gn, m['d'], .04)
    slats('brakeglow', 2, (.38, .08, .1), .2, (0, 4.35, 0), gn, m['r'], axis='y')
    node('mz', (0, 4.7, 0), gn)
    bake_ao(.5, 12); return stats()

def mortar():
    """body (bobs), leg0..5 (swing), tube (pitches), mz (muzzle, child of tube). Six legs, about 6 m wide, 5 m tall with the tube."""
    reset(); m = M(); root = node('mortar'); b = node('body', (0, 0, 1.7), root)
    box('chassis', (2.4, 3.6, .9), (0, 0, 0), b, m['g'], .12, top=(.85, .9))
    box('deck', (1.8, 2.4, .3), (0, -.3, .6), b, m['k'], .05)
    for sd in (-1, 1):
        box('panel%d' % sd, (.12, 2.6, .6), (sd * 1.25, 0, 0), b, m['g'], .03)
        box('pstripe%d' % sd, (.03, .5, .2), (sd * 1.32, .8, .1), b, m['r'], .01)
    box('head', (1.0, .6, .5), (0, 1.9, .05), b, m['k'], .06); box('heye', (.6, .05, .08), (0, 2.21, .1), b, m['r'], .01)
    strut('ant', (-.6, -1.4, .4), (-.7, -1.6, 1.8), .02, b, m['s'], seg=4)
    decal('emb', .6, .6, (0, 0, 1, 1), (0, -1.81, .05), b, m['e'], (math.pi / 2, 0, math.pi))
    for i, (sx, y) in enumerate([(-1, 1.3), (1, 1.3), (-1, 0), (1, 0), (-1, -1.3), (1, -1.3)]):
        lg = node('leg%d' % i, (sx * 1.15, y, -.1), b)
        ball('lj%d' % i, .25, (0, 0, 0), lg, m['d'], 10)
        strut('lu%d' % i, (0, 0, 0), (sx * 1.2, 0, .55), .14, lg, m['k'], sq=True)
        box('la%d' % i, (.5, .32, .5), (sx * 1.2, 0, .55), lg, m['g'], .06)
        strut('ll%d' % i, (sx * 1.2, 0, .55), (sx * 1.7, 0, -1.55), .11, lg, m['g'], sq=True)
        box('lr%d' % i, (.06, .2, .3), (sx * 1.5, .13, -.4), lg, m['r'], .01)
        box('ft%d' % i, (.3, .3, .2), (sx * 1.72, 0, -1.6), lg, m['d'], .04)
    tb = node('tube', (0, -.5, .75), b)
    cyl('tbase', .6, .4, (0, 0, .1), tb, m['k'], seg=16)
    cyl('tube', .42, 2.6, (0, 0, 1.5), tb, m['d'], seg=16, thick=.12)
    cyl('tband', .47, .2, (0, 0, 2.5), tb, m['r'], seg=16, thick=.05)
    cyl('tring', .5, .3, (0, 0, .7), tb, m['k'], seg=16)
    node('mz', (0, 0, 2.85), tb)
    bake_ao(.5, 12); return stats()

def bulwark():
    """hips, thigh/knee/ankle_L/R (gunner-style legs, knees bend forward), torso, armL (shield arm), armR (gun arm), mzR. About 4.6 m tall."""
    reset(); m = M(); root = node('bulwark'); hp = node('hips', (0, 0, 2.0), root)
    box('pelvis', (1.3, .8, .55), (0, 0, 0), hp, m['k'], .08)
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        t = node('thigh_' + s, (sd * .62, 0, -.05), hp)
        box('th' + s, (.55, .6, 1.05), (0, 0, -.52), t, m['g'], .08, bot=(.8, .8))
        k = node('knee_' + s, (0, 0, -1.05), t)
        box('kp' + s, (.6, .55, .5), (0, .12, 0), k, m['k'], .08)
        box('sh' + s, (.48, .5, 1.05), (0, 0, -.52), k, m['g'], .07, bot=(1.15, 1.1))
        a = node('ankle_' + s, (0, 0, -1.05), k)
        box('ft' + s, (.75, 1.15, .28), (0, .15, -.2), a, m['d'], .06, top=(.85, .8))
    to = node('torso', (0, 0, 2.0), root)
    box('chest', (2.1, 1.5, 1.4), (0, .15, 1.0), to, m['g'], .16, top=(1.1, .9), shift=(0, .15))
    box('back', (1.6, .7, 1.0), (0, -.85, 1.1), to, m['k'], .08)
    slats('vent', 3, (1.1, .05, .1), .22, (0, -1.21, 1.15), to, m['r'], axis='z')
    box('head', (.7, .7, .45), (0, .55, 1.82), to, m['k'], .08, top=(.8, .8))
    box('visor', (.5, .05, .08), (0, .91, 1.85), to, m['r'], .01)
    for sd in (-1, 1): box('pad%d' % sd, (.8, 1.0, .45), (sd * 1.25, 0, 1.7), to, m['g'], .1, top=(.8, .8))
    decal('emb', .7, .7, (0, 0, 1, 1), (.4, .91, 1.0), to, m['e'], (0, 0, math.pi))
    al = node('armL', (-1.3, .25, 1.3), to)
    box('ual', (.5, .5, 1.0), (0, 0, -.4), al, m['k'], .06)
    box('shield', (1.7, .26, 3.0), (.5, 1.05, -.7), al, m['g'], .08)
    box('shrim', (1.8, .14, 3.1), (.5, .9, -.7), al, m['d'], .04)
    for i in range(4):
        for j in range(2): cyl('riv%d%d' % (i, j), .06, .06, (-.15 + j * 1.3, 1.19, -1.9 + i * .8), al, m['s'], seg=6, axis='y')
    box('shstripe', (.12, .03, 1.6), (.95, 1.19, -.4), al, m['r'], .01)
    decal('semb', .9, .9, (0, 0, 1, 1), (.45, 1.19, -.4), al, m['e'], (0, 0, math.pi))
    ar = node('armR', (1.3, .15, 1.25), to)
    box('uar', (.5, .55, 1.0), (0, 0, -.4), ar, m['k'], .06)
    box('gunb', (.45, 1.2, .45), (0, .5, -.95), ar, m['g'], .06)
    for x in (-.1, .1): cyl('brl%s' % x, .07, .7, (x, 1.35, -.95), ar, m['s'], seg=8, axis='y')
    node('mzR', (0, 1.75, -.95), ar)
    node('armL_mz', (0, 0, 0), al)
    bake_ao(.5, 14); return stats()

def stag():
    """body, head, antL/antR (antler weak points), guns (twin artillery), mzA/mzB, chest (furnace), plate (chest armour, opens), hipFL/FR/BL/BR, kneeXX.
    About 15 m to the antler tips."""
    reset(); m = M(); root = node('stag'); b = node('body', (0, 0, 8.6), root)
    box('torso', (2.6, 7.0, 2.3), (0, 0, 0), b, m['g'], .25, top=(.8, .9), bot=(.85, .95))
    box('spine', (1.2, 6.0, .4), (0, -.2, 1.3), b, m['k'], .06)
    slats('ribs', 5, (2.7, .2, 1.4), .9, (0, -.5, -.2), b, m['k'], axis='y')
    for sd in (-1, 1):
        box('banner%d' % sd, (.06, 1.2, 2.6), (sd * 1.42, -.8, -1.4), b, m['r'], .01)
        decal('bemb%d' % sd, .9, .9, (0, 0, 1, 1), (sd * 1.46, -.8, -1.0), b, m['e'], (math.pi / 2, 0, sd * math.pi / 2))
    strut('neck', (0, 3.0, .5), (0, 4.4, 3.0), .55, b, m['g'], sq=True)
    h = node('head', (0, 4.6, 3.3), b)
    box('skull', (1.0, 2.1, 1.0), (0, .5, 0), h, m['g'], .12, top=(.7, .8), shift=(0, .1))
    box('snout', (.6, .9, .55), (0, 1.75, -.15), h, m['k'], .08)
    for sd in (-1, 1): box('eye%d' % sd, (.06, .3, .12), (sd * .51, .9, .15), h, m['r'], .01)
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        an = node('ant' + s, (sd * .4, .1, .55), h)
        ball('apod' + s, .42, (0, 0, 0), an, m['r'], 12)
        cyl('acol' + s, .5, .3, (0, 0, -.05), an, m['k'], seg=12)
        def branch(nm, p0, p1, r, lvl):
            strut(nm, p0, p1, r, an, m['k'] if lvl < 2 else m['s'], seg=6)
            if lvl >= 3: return
            d = [p1[i] - p0[i] for i in range(3)]
            for k_, (fx, fz) in enumerate([(.45, .55), (-.15, .8)]):
                q = (p1[0] + sd * abs(d[2]) * fx * .5 + d[0] * .3, p1[1] + d[1] * .2 - .15 * k_, p1[2] + abs(d[2]) * fz * .7)
                branch(nm + str(k_), p1, q, r * .7, lvl + 1)
        branch('a' + s, (0, 0, .2), (sd * .9, -.3, 1.8), .13, 0)
    g = node('guns', (0, -1.2, 1.4), b)
    box('gbase', (1.8, 1.8, .7), (0, 0, .2), g, m['k'], .1)
    for sd, nm in ((-1, 'mzA'), (1, 'mzB')):
        strut('gb%d' % sd, (sd * .55, -.4, .5), (sd * .55, 4.4, 1.7), .3, g, m['d'], seg=12)
        cyl('gbr%d' % sd, .4, .6, (sd * .55, .3, .65), g, m['r'], seg=12, axis='y', thick=.08)
        node(nm, (sd * .55, 4.6, 1.75), g)
    ch = node('chest', (0, 3.4, -.5), b)
    slats('furn', 5, (.14, .1, 1.3), .32, (0, 0, 0), ch, m['r'], axis='x')
    box('furnback', (1.8, .3, 1.5), (0, -.25, 0), ch, m['d'], .04)
    pl = node('plate', (0, 3.75, .3), b)
    box('platep', (2.2, .3, 1.8), (0, 0, -.85), pl, m['g'], .08)
    for nm, sx, sy in [('FL', -1, 1), ('FR', 1, 1), ('BL', -1, -1), ('BR', 1, -1)]:
        hp = node('hip' + nm, (sx * 1.1, sy * 2.7, -.9), b)
        ball('hb' + nm, .55, (0, 0, 0), hp, m['d'], 10)
        kz = (sx * .25, -.55 if sy > 0 else .7, -3.9)
        strut('th' + nm, (0, 0, 0), kz, .32, hp, m['g'], sq=True)
        kn = node('knee' + nm, kz, hp); ball('kb' + nm, .38, (0, 0, 0), kn, m['k'], 10)
        fz = (sx * .3, .2 if sy > 0 else -.3, -7.7)
        strut('sh' + nm, kz, fz, .22, hp, m['k'], sq=True)
        strut('shp' + nm, (kz[0], kz[1], kz[2] - .4), (fz[0], fz[1], fz[2] + 1.4), .08, hp, m['s'], seg=6)
        box('hoof' + nm, (.6, .8, .4), (fz[0], fz[1] + .1, -7.75), hp, m['d'], .06, top=(.7, .8))
    bake_ao(1.0, 12); return stats()

def maw():
    """body, jaw (lower jaw, opens), mouth (weak point inside), turL/turR (side guns, mzL/mzR), hipFL/FR/BL/BR. About 11 m tall, 15 m long."""
    reset(); m = M(); root = node('maw'); b = node('body', (0, 0, 6.2), root)
    box('hull', (8.4, 9.0, 5.6), (0, -.6, .4), b, m['g'], .4, top=(.78, .85), bot=(.9, .9))
    box('back', (6.0, 5.0, 1.4), (0, -1.8, 3.6), b, m['k'], .2, top=(.8, .8))
    for i in range(4): box('plate%d' % i, (6.6 - i * .4, 1.4, .5), (0, 1.5 - i * 1.6, 3.4 + (i % 2) * .2), b, m['g'], .1, rot=(.15, 0, 0))
    for sd in (-1, 1):
        slats('sv%d' % sd, 4, (.1, .9, .2), .45, (sd * 4.25, -1.0, 1.6), b, m['r'], axis='z')
        box('cheek%d' % sd, (1.2, 3.2, 3.4), (sd * 3.7, 3.6, -.2), b, m['k'], .2)
        st = node('tur' + ('L' if sd < 0 else 'R'), (sd * 4.6, 1.0, 2.4), b)
        box('tb%d' % sd, (1.2, 1.6, .9), (0, 0, 0), st, m['k'], .1)
        for x in (-.2, .2): cyl('tbr%d%s' % (sd, x), .1, 1.6, (x, 1.4, 0), st, m['s'], seg=8, axis='y')
        box('tl%d' % sd, (.6, .05, .14), (0, .81, .2), st, m['r'], .01)
        node('mz' + ('L' if sd < 0 else 'R'), (0, 2.25, 0), st)
    for i, (x, y) in enumerate([(-2.0, -4.6), (0, -5.2), (2.0, -4.6)]): cyl('stack%d' % i, .45, 3.0, (x, y, 4.6), b, m['k'], seg=12); cyl('stb%d' % i, .5, .25, (x, y, 5.6), b, m['r'], seg=12)
    decal('emb', 2.0, 2.0, (0, 0, 1, 1), (0, 1.0, 3.1), b, m['e'], (0, 0, math.pi))
    box('ujaw', (6.4, 2.6, 2.0), (0, 4.6, .9), b, m['g'], .2, top=(.9, .85))
    for i in range(9):
        x = -2.8 + i * .7; box('ut%d' % i, (.45, .5, 1.0), (x, 5.6, -.4), b, m['s'], .03, bot=(.2, .3))
    mo = node('mouth', (0, 3.6, -.6), b)
    ball('mcore', 1.1, (0, 0, 0), mo, m['r'], 16)
    box('mthroat', (4.6, 1.6, 2.2), (0, -.6, 0), mo, m['d'], .1)
    jw = node('jaw', (0, 2.6, -1.5), b)
    box('ljaw', (6.0, 3.6, 1.3), (0, 1.8, -.4), jw, m['g'], .18, top=(.95, .9))
    for i in range(8):
        x = -2.45 + i * .7; box('lt%d' % i, (.42, .45, .9), (x, 3.3, .55), jw, m['s'], .03, top=(.2, .3))
    box('chin', (3.0, .8, .8), (0, 3.3, -1.0), jw, m['k'], .08)
    for nm, sx, sy in [('FL', -1, 1), ('FR', 1, 1), ('BL', -1, -1), ('BR', 1, -1)]:
        hp = node('hip' + nm, (sx * 4.0, sy * 2.6 - .6, -1.8), b)
        box('th' + nm, (1.8, 2.2, 2.8), (sx * .6, 0, -1.2), hp, m['k'], .2)
        box('arm' + nm, (2.0, 2.4, 1.0), (sx * .8, .1, .1), hp, m['g'], .15)
        box('sh' + nm, (1.6, 1.8, 2.4), (sx * .9, sy * .2, -3.2), hp, m['g'], .18, bot=(1.1, 1.2))
        box('ft' + nm, (2.0, 2.6, .7), (sx * .9, sy * .2 + .3, -4.4), hp, m['d'], .12)
        for t in (-.6, 0, .6): box('cl%s%s' % (nm, t), (.36, .7, .5), (sx * .9 + t, sy * .2 + 1.8, -4.45), hp, m['s'], .03, top=(.4, .5))
    bake_ao(1.1, 12); return stats()

def forge():
    """The factory core, standing still. gear (spins, around the eye), eye (weak point, phase 3), furnace (weak point, phase 2), doorL/doorR (slide open).
    About 19 m tall and 24 m wide. Front faces +Y."""
    reset(); m = M(); root = node('forge')
    box('base', (24, 18, 1.6), (0, 0, .8), root, m['d'], .2)
    for sx in (-1, 1):
        for sy in (-1, 1): box('foot%d%d' % (sx, sy), (4.5, 4.5, 2.6), (sx * 9.5, sy * 6.5, 1.3), root, m['k'], .3, top=(.8, .8))
    box('block', (14, 10, 11), (0, 0, 7.1), root, m['g'], .4, top=(.85, .85))
    box('roof', (11, 8, 1.5), (0, -.5, 13.3), root, m['k'], .2)
    box('front', (10, .6, 8), (0, 5.2, 6.6), root, m['k'], .1)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * 7.6, sy * 4.6
            cyl('tow%d%d' % (sx, sy), 1.6, 15, (x, y, 9.1), root, m['g'], seg=16)
            cyl('towb%d%d' % (sx, sy), 1.7, .5, (x, y, 12.5), root, m['r'], seg=16)
            cyl('towt%d%d' % (sx, sy), 1.2, 3.0, (x, y, 18), root, m['d'], seg=14)
            cyl('towc%d%d' % (sx, sy), 1.35, .4, (x, y, 16.6), root, m['k'], seg=14)
        box('banner%d' % sx, (1.6, .08, 5.5), (sx * 4.2, 5.55, 8.0), root, m['r'], .01)
        decal('bemb%d' % sx, 1.2, 1.2, (0, 0, 1, 1), (sx * 4.2, 5.6, 9.2), root, m['e'], (0, 0, math.pi))
        strut('pipe%d' % sx, (sx * 7.6, 3.0, 11), (sx * 3, 3.6, 12.9), .45, root, m['s'], seg=10)
        strut('pipe2%d' % sx, (sx * 7.6, -3, 6), (sx * 7.6, 3, 6), .38, root, m['s'], seg=10)
    for x in (-3, 0, 3): cyl('ch%s' % x, .7, 6, (x, -2.5, 17), root, m['k'], seg=12); cyl('chb%s' % x, .75, .3, (x, -2.5, 19.5), root, m['r'], seg=12)
    for x in (-4.5, 4.5): strut('rail%s' % x, (x, -4, 14.4), (x, 3, 14.4), .06, root, m['s'], seg=5)
    gr = node('gear', (0, 5.6, 9.6), root)
    cyl('gring', 3.2, .8, (0, 0, 0), gr, m['k'], seg=28, axis='y', thick=.9)
    for i in range(12):
        a = i / 12 * 2 * math.pi
        box('gt%d' % i, (.9, .8, .8), (math.cos(a) * 3.55, 0, math.sin(a) * 3.55), gr, m['k'], .06, rot=(0, -a, 0))
    for i in range(6):
        a = i / 6 * 2 * math.pi
        strut('gs%d' % i, (math.cos(a) * 1.4, 0, math.sin(a) * 1.4), (math.cos(a) * 2.6, 0, math.sin(a) * 2.6), .22, gr, m['g'], sq=True)
    ey = node('eye', (0, 5.9, 9.6), root)
    ball('eyeb', 1.5, (0, 0, 0), ey, m['r'], 18)
    fu = node('furnace', (0, 5.4, 3.6), root)
    box('fback', (5.4, .4, 3.8), (0, -.3, 0), fu, m['d'], .05)
    slats('fbars', 7, (.3, .25, 3.4), .72, (0, .05, 0), fu, m['r'], axis='x')
    for sd in (-1, 1):
        d = node('door' + ('L' if sd < 0 else 'R'), (sd * 1.4, 5.85, 3.6), root)
        box('dp%d' % sd, (2.9, .4, 4.2), (0, 0, 0), d, m['g'], .08)
        for j in range(3): box('dr%d%d' % (sd, j), (2.6, .08, .16), (0, .22, -1.3 + j * 1.3), d, m['s'], .01)
    bake_ao(1.4, 10); return stats()

if __name__ == '__main__':
    import lib; lib.AUTO = {'detail': ('egrey',), 'wear': ('egrey',)}
    out = sys.argv[-1]
    for fn in ([globals()[a] for a in sys.argv[1:-1] if a in globals()] or (hornet, tank, mortar, bulwark, stag, maw, forge)):
        t = fn(); p = os.path.join(out, fn.__name__ + '.glb'); export(p); print(fn.__name__, 'tris', t, 'KB', os.path.getsize(p) // 1024)
