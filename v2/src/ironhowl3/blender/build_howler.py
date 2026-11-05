"""Howler 07, the player's mech. Run:  <venv with bpy>/python build_howler.py OUT.glb
Reverse-joint (wolf-like) legs, wolf-head sensor, missile pods, autocannon arms with 4 barrel tiers, jet pack.
Joint empties (the game moves these): hips, thigh_L/R, knee_L/R, ankle_L/R, torso, head, arm_L/R, gun_L/R, brl_L/R,
tier1_L..tier4_R (one is shown at a time), muzzle_L/R, pod_L/R, jet_L/R.
Material names are matched in the game: org grey gun steel trim dark eye glass jetcore decal.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

HIP, L1, L2, ANK = 2.4, 1.35, 1.45, .32

def build():
    reset()
    org = mat('org', (.85, .42, .1), rough=.5, metal=.3); grey = mat('grey', (.55, .56, .58), rough=.5, metal=.4)
    gun = mat('gun', (.25, .26, .28), rough=.45, metal=.7); steel = mat('steel', (.7, .7, .72), rough=.3, metal=.9)
    trim = mat('trim', (.8, .7, .1)); dark = mat('dark', (.06, .065, .07), rough=.7, metal=.5)
    eye = mat('eye', (1, .6, .2), emit=6); glass = mat('glass', (.02, .03, .04), rough=.15, metal=.2)
    core = mat('jetcore', (1, .5, .15), emit=4); dec = mat('decal', (1, 1, 1))
    root = node('howler')
    # ---------------- hips and legs ----------------
    hips = node('hips', (0, 0, HIP), root)
    box('pelvis', (1.5, 1.0, .6), (0, 0, 0), hips, gun, .08)
    cyl('hipaxle', .4, 2.15, (0, 0, -.05), hips, dark, seg=18, axis='x')
    box('skirtF', (1.25, .12, .55), (0, .56, -.22), hips, org, .04, rot=(.28, 0, 0))
    box('skirtB', (1.1, .12, .5), (0, -.56, -.2), hips, org, .04, rot=(-.28, 0, 0))
    def leg(sd):
        s = 'L' if sd < 0 else 'R'
        th = node('thigh_' + s, (sd * 1.02, 0, -.05), hips)
        box('thighA_' + s, (.72, .9, 1.15), (0, .04, -.62), th, org, .1, top=(1.05, 1.05), bot=(.82, .78))
        box('thighP_' + s, (.1, .72, .82), (sd * .41, 0, -.56), th, grey, .03)
        box('thighT_' + s, (.12, .5, .2), (sd * .47, 0, -.2), th, trim, .02)
        cyl('thighRod_' + s, .065, 1.05, (0, -.44, -.62), th, steel, seg=10)
        cyl('thighCyl_' + s, .1, .5, (0, -.44, -.32), th, gun, seg=12)
        kn = node('knee_' + s, (0, 0, -L1), th)
        cyl('kneeJ_' + s, .3, .58, (0, 0, 0), kn, gun, seg=18, axis='x')
        box('kneeG_' + s, (.52, .32, .48), (0, -.3, .06), kn, grey, .05, rot=(.35, 0, 0))
        box('shin_' + s, (.5, .54, 1.25), (0, 0, -.74), kn, org, .08, bot=(.8, .78))
        box('shinP_' + s, (.38, .1, .9), (0, .3, -.72), kn, grey, .03)
        for x in (-.17, .17): cyl('shinRod_' + s + str(x), .05, 1.1, (x, -.31, -.72), kn, steel, seg=10)
        hose('shinHose_' + s, [(sd * .24, -.22, -.1), (sd * .34, -.3, -.6), (sd * .26, -.2, -1.25)], .045, kn, dark)
        an = node('ankle_' + s, (0, 0, -L2), kn)
        ball('ankleJ_' + s, .23, (0, 0, 0), an, dark)
        box('ankleA_' + s, (.52, .42, .3), (0, .12, -.02), an, org, .05)
        box('sole_' + s, (.74, .98, .24), (0, .18, -.2), an, grey, .05)
        for x in (-.27, 0, .27): box('toe_' + s + str(x), (.2, .62, .2), (x, .86, -.24), an, gun, .05, top=(.7, .75), rot=(-.08, 0, x * .3))
        box('heel_' + s, (.24, .52, .22), (0, -.46, -.23), an, gun, .05, top=(.6, .6))
        return th, kn, an
    legs = [leg(-1), leg(1)]
    # ---------------- torso ----------------
    to = node('torso', (0, 0, HIP), root)
    cyl('waist', .52, .5, (0, 0, .22), to, gun, seg=20)
    box('hullLow', (1.85, 1.5, .55), (0, 0, .62), to, gun, .08)
    box('hull', (2.3, 1.75, 1.15), (0, -.05, 1.42), to, org, .12, top=(.94, .9), shift=(0, -.05))
    box('prow', (1.7, .62, 1.0), (0, .96, 1.25), to, grey, .08, top=(.86, .45), shift=(0, -.14))
    box('glass', (1.05, .06, .36), (0, 1.17, 1.32), to, glass, .02, rot=(-.32, 0, 0))
    box('visor', (.95, .05, .07), (0, 1.15, 1.52), to, eye, .02, rot=(-.32, 0, 0))
    box('spine', (.56, 1.3, .28), (0, -.18, 2.06), to, org, .06)
    slats('spineVents', 5, (.42, .06, .1), .2, (0, -.2, 2.24), to, dark, axis='y')
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        box('sideP_' + s, (.12, 1.2, .8), (sd * 1.18, 0, 1.33), to, grey, .03)
        box('trimS_' + s, (.24, 1.45, .1), (sd * .95, -.06, 2.0), to, trim, .03)
        # missile pod
        box('podMount_' + s, (.4, .6, .3), (sd * 1.38, -.05, 1.75), to, gun, .04)
        box('pod_' + s, (.86, 1.25, .72), (sd * 1.45, -.05, 2.08), to, grey, .07)
        box('podFace_' + s, (.68, .05, .52), (sd * 1.45, .58, 2.08), to, dark, .02)
        for r in range(2):
            for c in range(3):
                cyl('tube_%s%d%d' % (s, r, c), .085, .1, (sd * 1.45 + (c - 1) * .2, .6, 1.97 + r * .22), to, gun, seg=10, axis='y', bev=.01)
        box('podTrim_' + s, (.06, 1.0, .18), (sd * 1.89, -.05, 2.08), to, trim, .02)
        node('pod_' + s + '_mz', (sd * 1.45, .7, 2.08), to)
    # arms with autocannons
    def arm(sd):
        s = 'L' if sd < 0 else 'R'
        a = node('arm_' + s, (sd * 1.45, .1, 1.18), to)
        cyl('shJ_' + s, .36, .52, (0, 0, 0), a, dark, seg=18, axis='x')
        box('shA_' + s, (.72, .82, .45), (sd * .05, 0, .26), a, org, .07, top=(.9, .9))
        box('upper_' + s, (.5, .56, .7), (0, 0, -.4), a, gun, .05)
        g = node('gun_' + s, (0, .1, -.8), a)
        box('housing_' + s, (.62, 1.7, .62), (0, .45, 0), g, org, .08, top=(.9, 1))
        box('housTop_' + s, (.5, 1.1, .12), (0, .4, .36), g, grey, .03)
        slats('fins_' + s, 6, (.06, .12, .42), .17, (sd * .35, .4, 0), g, dark, axis='y')
        cyl('drum_' + s, .26, .3, (sd * .46, -.12, -.05), g, gun, seg=18, axis='x')
        hose('feed_' + s, [(sd * .46, .05, -.2), (sd * .4, .35, -.32), (sd * .2, .6, -.3)], .05, g, dark)
        b = node('brl_' + s, (0, 1.28, 0), g)
        t1 = node('tier1_' + s, (0, 0, 0), b)
        cyl('t1s_' + s, .17, .5, (0, .2, 0), t1, gun, seg=14, axis='y')
        cyl('t1b_' + s, .1, 1.3, (0, .7, 0), t1, steel, seg=14, axis='y')
        cyl('t1m_' + s, .15, .3, (0, 1.35, 0), t1, dark, seg=14, axis='y')
        t2 = node('tier2_' + s, (0, 0, 0), b)
        box('t2s_' + s, (.46, .5, .26), (0, .2, 0), t2, gun, .05)
        for x in (-.11, .11): cyl('t2b_%s%s' % (s, x), .085, 1.35, (x, .72, 0), t2, steel, seg=12, axis='y')
        box('t2m_' + s, (.44, .26, .2), (0, 1.36, 0), t2, dark, .04)
        t3 = node('tier3_' + s, (0, 0, 0), b)
        cyl('t3s_' + s, .25, .45, (0, .2, 0), t3, gun, seg=18, axis='y')
        for i, (x, z) in enumerate([(-.12, -.07), (.12, -.07), (0, .13)]): cyl('t3b_%s%d' % (s, i), .075, 1.4, (x, .75, z), t3, steel, seg=12, axis='y')
        cyl('t3r_' + s, .25, .08, (0, .95, 0), t3, dark, seg=18, axis='y')
        cyl('t3m_' + s, .26, .12, (0, 1.42, 0), t3, dark, seg=18, axis='y')
        t4 = node('tier4_' + s, (0, 0, 0), b)
        cyl('t4s_' + s, .27, .5, (0, .2, 0), t4, gun, seg=20, axis='y')
        for i in range(4):
            an = i * math.pi / 2 + math.pi / 4; cyl('t4b_%s%d' % (s, i), .07, 1.5, (math.cos(an) * .14, .8, math.sin(an) * .14), t4, steel, seg=12, axis='y')
        for y in (.55, 1.1): cyl('t4r_%s%s' % (s, y), .25, .07, (0, y, 0), t4, dark, seg=20, axis='y')
        cyl('t4m_' + s, .26, .14, (0, 1.5, 0), t4, gun, seg=20, axis='y')
        cyl('t4g_' + s, .2, .03, (0, 1.58, 0), t4, core, seg=20, axis='y')
        node('muzzle_' + s, (0, 1.65, 0), b)
        return a, g
    arms = [arm(-1), arm(1)]
    # head: a wolf-shaped sensor turret
    hd = node('head', (0, .5, 2.12), to); hd.scale = (1.3, 1.3, 1.3)
    cyl('neck', .22, .3, (0, 0, -.05), hd, dark, seg=14)
    box('headB', (.86, .95, .42), (0, 0, .2), hd, grey, .07, top=(.86, .86))
    box('snout', (.56, .58, .3), (0, .6, .12), hd, grey, .05, top=(.8, .7), shift=(0, -.05))
    box('brow', (.8, .45, .08), (0, .28, .44), hd, org, .03, rot=(.15, 0, 0))
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        box('eye_' + s, (.18, .04, .06), (sd * .16, .89, .2), hd, eye, .015, rot=(0, 0, sd * .18))
        box('ear_' + s, (.1, .34, .44), (sd * .3, -.18, .52), hd, org, .03, top=(.4, .45), shift=(0, -.16), rot=(-.32, 0, -sd * .16))
    cyl('antenna', .02, .9, (.32, -.32, .78), hd, steel, seg=6, bev=0)
    # back: jet pack
    box('pack', (1.6, .62, 1.02), (0, -1.2, 1.3), to, gun, .08)
    slats('radiator', 7, (.05, .34, .76), .2, (0, -1.56, 1.4), to, dark, axis='x')
    box('packTrim', (1.3, .1, .14), (0, -1.22, 1.87), to, trim, .03)
    jets = []
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        j = node('jet_' + s, (sd * .5, -1.42, .72), to)
        cyl('collar_' + s, .24, .16, (0, 0, .1), j, gun, seg=18)
        cyl('bell_' + s, .2, .55, (0, 0, -.22), j, dark, seg=20, r2=.3, cap=False, thick=.04, bev=0)
        cyl('core_' + s, .19, .02, (0, 0, -.06), j, core, seg=18, bev=0)
        jets.append(j)
    # decals: 07 on both flanks, the howling wolf on the pack
    decal('dec07_L', .82, .66, (.06, .65, .44, .96), (-1.243, .12, 1.36), to, dec, (0, 0, -math.pi / 2))
    decal('dec07_R', .82, .66, (.06, .65, .44, .96), (1.243, .12, 1.36), to, dec, (0, 0, math.pi / 2))
    decal('decWolf', 1.0, .82, (.52, .58, .98, .96), (0, -1.515, 1.3), to, dec, (0, 0, 0))
    # ---- pose for the shading bake: knees bent back, arms forward, jets angled; reset before export ----
    for th, kn, an in legs:
        d = HIP - .05 - ANK; al = math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)); ga = math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))
        t1 = -al; k = math.pi - ga
        th.rotation_euler.x = t1; kn.rotation_euler.x = k; an.rotation_euler.x = -(t1 + k)
    for j in jets: j.rotation_euler.x = -.55
    for o in bpy.context.scene.objects:
        if o.name.startswith('tier') and o.name[4] in '234':
            o.location.x += 30   # move spare barrel sets away so they do not shade each other
    bpy.context.view_layer.update()
    bake_ao(.55, 20)
    for o in bpy.context.scene.objects:
        if o.name.startswith('tier') and o.name[4] in '234': o.location.x -= 30
    return stats()

if __name__ == '__main__':
    out = sys.argv[-1]
    t = build(); export(out); print('howler tris', t, 'size KB', os.path.getsize(out) // 1024)
