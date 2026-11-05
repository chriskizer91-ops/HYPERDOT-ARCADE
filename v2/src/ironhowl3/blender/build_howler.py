"""Howler 07, the player's mech (version 2, modelled after Christopher's turnaround: art/masters/47-howler-07-turnaround.webp and 48).
Run:  <venv with bpy>/python build_howler.py OUT.glb
Dog-like three-part legs (thigh forward, shin back to the hock, long foot bone down to the clawed foot), long-snouted wolf head with
tall ears, angular shoulder plates, missile pods above the shoulders, forearm autocannons with 4 barrel sets, wolf-emblem jet pack with
two big thrusters.
Joint empties (the game moves these): hips, thigh_L/R, knee_L/R, hock_L/R, ankle_L/R, torso, head, arm_L/R, gun_L/R, brl_L/R,
tier1_L..tier4_R, muzzle_L/R, pod_L_mz/pod_R_mz, jet_L/R.  Materials: org grey gun steel trim dark eye glass jetcore decal.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

HIP, L1, L2, L3, ANK, PHI = 3.2, 1.05, 1.0, .9, .36, .26

def build():
    reset()
    org = mat('org', (.85, .42, .1), rough=.5, metal=.3); grey = mat('grey', (.5, .5, .52), rough=.5, metal=.45)
    gun = mat('gun', (.22, .23, .25), rough=.45, metal=.7); steel = mat('steel', (.7, .7, .72), rough=.3, metal=.9)
    trim = mat('trim', (.8, .7, .1)); dark = mat('dark', (.06, .065, .07), rough=.7, metal=.5)
    eye = mat('eye', (1, .6, .2), emit=6); core = mat('jetcore', (1, .5, .15), emit=4); dec = mat('decal', (1, 1, 1))
    root = node('howler')
    # ================= hips and legs =================
    hips = node('hips', (0, 0, HIP), root)
    box('pelvis', (1.3, .95, .55), (0, 0, 0), hips, gun, .08)
    box('cod', (.5, .25, .62), (0, .5, -.12), hips, org, .06, top=(1.2, 1), bot=(.45, 1), rot=(.12, 0, 0))
    box('codTri', (.18, .04, .16), (0, .64, -.02), hips, trim, .01, rot=(.12, 0, 0))
    box('rear', (1.0, .22, .45), (0, -.5, -.05), hips, org, .05, rot=(-.2, 0, 0))
    cyl('hipaxle', .34, 1.95, (0, 0, -.05), hips, dark, seg=18, axis='x')
    legs = []
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        th = node('thigh_' + s, (sd * .88, 0, -.05), hips)
        cyl('hipJ_' + s, .36, .3, (sd * .1, 0, 0), th, gun, seg=18, axis='x')
        box('thighA_' + s, (.72, .62, .98), (sd * .03, .12, -.5), th, org, .1, top=(1.08, 1.25), bot=(.75, .8))      # big front plate
        box('thighF_' + s, (.5, .5, .95), (0, -.08, -.52), th, gun, .06)                                                   # frame behind it
        box('thighS_' + s, (.08, .5, .62), (sd * .4, .05, -.5), th, grey, .02)
        box('thighT_' + s, (.12, .04, .14), (sd * .1, .45, -.38), th, trim, .01)
        cyl('thighRod_' + s, .055, .9, (0, -.34, -.6), th, steel, seg=10)
        kn = node('knee_' + s, (0, 0, -L1), th)
        cyl('kneeJ_' + s, .3, .62, (0, 0, 0), kn, gun, seg=20, axis='x')
        box('kneeCap_' + s, (.5, .3, .5), (0, .27, .03), kn, org, .07, top=(.8, .7), rot=(-.25, 0, 0))
        box('shin_' + s, (.42, .5, .98), (0, 0, -.5), kn, gun, .06, bot=(.8, .8))
        box('shinA_' + s, (.5, .26, .74), (0, .2, -.45), kn, org, .07, top=(1, .9), bot=(.85, .8))
        hose('shinHose_' + s, [(sd * .24, -.18, -.1), (sd * .3, -.25, -.6), (sd * .22, -.15, -.95)], .04, kn, dark)
        hk = node('hock_' + s, (0, 0, -L2), kn)
        cyl('hockJ_' + s, .24, .54, (0, 0, 0), hk, dark, seg=18, axis='x')
        box('spur_' + s, (.14, .6, .3), (0, -.42, -.05), hk, steel, .04, top=(.3, .25), shift=(0, -.25), rot=(.5, 0, 0))   # the rear spike
        box('meta_' + s, (.36, .42, .95), (0, 0, -.5), hk, gun, .05, bot=(.85, .85))
        box('metaA_' + s, (.4, .2, .7), (0, .16, -.45), hk, org, .05, top=(.9, 1), bot=(.8, .9))
        an = node('ankle_' + s, (0, 0, -L3), hk)
        ball('ankleJ_' + s, .2, (0, 0, 0), an, dark)
        box('foot_' + s, (.68, .78, .26), (0, .12, -.2), an, gun, .06, top=(.9, .85))
        box('footA_' + s, (.6, .5, .14), (0, .1, -.04), an, org, .04)
        for i, x in enumerate((-.25, 0, .25)):
            cl = node('claw_%s%d' % (s, i), (x, .45, -.22), an)
            box('toe_%s%d' % (s, i), (.18, .36, .2), (0, .12, 0), cl, gun, .04, top=(.8, .8))
            cyl('clawB_%s%d' % (s, i), .085, .42, (0, .44, -.06), cl, steel, seg=10, r2=.01, bev=0, rot=(-math.pi / 2 - .45, 0, 0))
        box('heel_' + s, (.24, .32, .2), (0, -.3, -.24), an, gun, .04)
        cyl('heelC_' + s, .07, .3, (0, -.5, -.3), an, steel, seg=8, r2=.01, bev=0, rot=(math.pi / 2 + .5, 0, 0))
        legs.append((th, kn, hk, an))
    # ================= torso =================
    to = node('torso', (0, 0, HIP), root)
    for i, z in enumerate((.12, .26, .4)): cyl('spine%d' % i, .3 - i * .02, .12, (0, -.05, z), to, gun if i % 2 else dark, seg=16)
    box('abdo', (1.05, .8, .45), (0, .05, .5), to, gun, .07)
    box('chest', (1.9, 1.35, 1.05), (0, .15, 1.15), to, org, .14, top=(1.06, 1.0), bot=(.72, .85), shift=(0, .12))
    box('chestP', (1.2, .3, .62), (0, .82, 1.15), to, org, .07, top=(1.1, 1), bot=(.85, 1), rot=(-.12, 0, 0))
    for sd in (-1, 1):
        box('vent_%d' % sd, (.36, .06, .16), (sd * .42, .97, 1.24), to, dark, .02, rot=(-.12, 0, 0))
    slats('chestGrille', 4, (.3, .05, .05), .09, (0, .97, 1.0), to, dark, axis='z')
    box('collar', (1.0, .6, .3), (0, .3, 1.72), to, gun, .06)
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        box('side07_' + s, (.08, .9, .75), (sd * 1.0, .15, 1.15), to, org, .03)
        box('sideT_' + s, (.06, .18, .5), (sd * 1.04, -.32, 1.1), to, trim, .01)
    # ---- missile pods above the shoulders ----
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        box('podArm_' + s, (.5, .35, .25), (sd * .85, -.15, 1.7), to, gun, .04)
        box('pod_' + s, (.86, .9, .78), (sd * 1.25, -.1, 2.05), to, grey, .09)
        box('podRim_' + s, (.9, .12, .82), (sd * 1.25, .38, 2.05), to, org, .06, top=(1, 1))
        box('podFace_' + s, (.7, .04, .6), (sd * 1.25, .44, 2.05), to, dark, .02)
        for r in range(2):
            for c in range(3):
                x, z = sd * 1.25 + (c - 1) * .21, 1.94 + r * .22
                cyl('tube_%s%d%d' % (s, r, c), .085, .08, (x, .46, z), to, gun, seg=12, axis='y', bev=.01)
                cyl('tubeG_%s%d%d' % (s, r, c), .05, .02, (x, .5, z), to, core, seg=10, axis='y', bev=0)
        node('pod_' + s + '_mz', (sd * 1.25, .6, 2.05), to)
    # ---- arms: angular shoulder plates, upper arm, cannon forearm ----
    def arm(sd):
        s = 'L' if sd < 0 else 'R'
        a = node('arm_' + s, (sd * 1.22, .05, 1.28), to)
        cyl('shJ_' + s, .34, .5, (0, 0, 0), a, dark, seg=18, axis='x')
        box('pauld_' + s, (.78, .95, .5), (sd * .12, 0, .2), a, org, .09, top=(.8, .85), rot=(0, -sd * .35, 0))
        box('pauldT_' + s, (.06, .7, .12), (sd * .46, 0, .04), a, trim, .01, rot=(0, -sd * .35, 0))
        box('upper_' + s, (.44, .5, .7), (sd * .05, 0, -.42), a, gun, .05)
        box('upperA_' + s, (.12, .44, .5), (sd * .28, 0, -.4), a, org, .03)
        g = node('gun_' + s, (sd * .05, .05, -.8), a)
        cyl('elbow_' + s, .25, .5, (0, 0, 0), g, dark, seg=16, axis='x')
        box('housing_' + s, (.6, 1.5, .6), (0, .45, 0), g, gun, .08)
        box('housA_' + s, (.64, 1.05, .34), (0, .38, .2), g, org, .07, top=(.9, .95))
        for i in range(3): box('housL_%s%d' % (s, i), (.04, .14, .03), (sd * .33, .45 + i * .06, -.02), g, trim, .005)
        slats('fins_' + s, 5, (.05, .1, .34), .16, (-sd * .33, .4, -.05), g, dark, axis='y')
        cyl('drum_' + s, .2, .26, (sd * .38, -.1, -.08), g, gun, seg=16, axis='x')
        b = node('brl_' + s, (0, 1.22, -.02), g)
        t1 = node('tier1_' + s, (0, 0, 0), b)
        cyl('t1s_' + s, .17, .45, (0, .18, 0), t1, dark, seg=14, axis='y'); cyl('t1b_' + s, .1, 1.2, (0, .7, 0), t1, steel, seg=14, axis='y')
        cyl('t1m_' + s, .15, .26, (0, 1.32, 0), t1, gun, seg=14, axis='y')
        t2 = node('tier2_' + s, (0, 0, 0), b)
        box('t2s_' + s, (.44, .45, .26), (0, .18, 0), t2, dark, .05)
        for x in (-.1, .1): cyl('t2b_%s%s' % (s, x), .085, 1.3, (x, .75, 0), t2, steel, seg=12, axis='y')
        box('t2m_' + s, (.42, .24, .2), (0, 1.38, 0), t2, gun, .04)
        t3 = node('tier3_' + s, (0, 0, 0), b)
        cyl('t3s_' + s, .25, .42, (0, .18, 0), t3, dark, seg=18, axis='y')
        for i, (x, z) in enumerate([(-.11, -.065), (.11, -.065), (0, .125)]): cyl('t3b_%s%d' % (s, i), .072, 1.38, (x, .78, z), t3, steel, seg=12, axis='y')
        cyl('t3r_' + s, .24, .07, (0, .95, 0), t3, gun, seg=18, axis='y'); cyl('t3m_' + s, .25, .1, (0, 1.45, 0), t3, gun, seg=18, axis='y')
        t4 = node('tier4_' + s, (0, 0, 0), b)
        cyl('t4s_' + s, .27, .45, (0, .18, 0), t4, dark, seg=20, axis='y')
        for i in range(4):
            an_ = i * math.pi / 2 + math.pi / 4; cyl('t4b_%s%d' % (s, i), .068, 1.48, (math.cos(an_) * .135, .82, math.sin(an_) * .135), t4, steel, seg=12, axis='y')
        for y in (.55, 1.1): cyl('t4r_%s%s' % (s, y), .24, .06, (0, y, 0), t4, gun, seg=20, axis='y')
        cyl('t4m_' + s, .25, .12, (0, 1.52, 0), t4, gun, seg=20, axis='y'); cyl('t4g_' + s, .19, .03, (0, 1.6, 0), t4, core, seg=20, axis='y')
        node('muzzle_' + s, (0, 1.66, 0), b)
        return a
    arms = [arm(-1), arm(1)]
    # ---- head: long-snouted wolf with tall ears, on a forward neck ----
    cyl('neckB', .22, .5, (0, .55, 1.8), to, dark, seg=14, rot=(-.9, 0, 0))
    hd = node('head', (0, .82, 2.02), to)
    box('skull', (.62, .62, .48), (0, 0, .06), hd, org, .08, top=(.8, .85))
    box('snout', (.42, .72, .3), (0, .6, -.02), hd, org, .06, top=(.75, .8), bot=(.85, 1), shift=(0, -.04))
    box('nose', (.26, .2, .2), (0, .98, -.05), hd, gun, .04)
    box('jaw', (.38, .7, .14), (0, .5, -.22), hd, grey, .04, top=(1, 1), bot=(.8, .9))
    box('brow', (.58, .42, .1), (0, .25, .3), hd, grey, .03, rot=(.18, 0, 0))
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        box('eye_' + s, (.2, .05, .055), (sd * .13, .56, .14), hd, eye, .012, rot=(0, 0, -sd * .38))
        box('ear_' + s, (.2, .18, .62), (sd * .2, -.12, .5), hd, org, .03, top=(.12, .3), shift=(0, -.08), rot=(-.12, sd * .14, 0))
        box('earIn_' + s, (.1, .04, .38), (sd * .2, -.02, .46), hd, grey, .01, top=(.15, 1), rot=(-.12, sd * .14, 0))
        box('cheek_' + s, (.08, .4, .22), (sd * .26, .25, -.06), hd, gun, .02)
    cyl('antenna', .015, .7, (.22, -.25, .55), hd, steel, seg=6, bev=0)
    # ---- back: wolf-emblem pack, radiators, two big thrusters ----
    box('pack', (1.15, .5, 1.25), (0, -.95, 1.35), to, grey, .1)
    box('packFrame', (1.55, .4, 1.05), (0, -.8, 1.3), to, gun, .07)
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        slats('rad_' + s, 6, (.26, .05, .05), .11, (sd * .66, -1.0, 1.4), to, dark, axis='z')
        box('radFrame_' + s, (.32, .12, .78), (sd * .66, -.98, 1.4), to, gun, .03)
        box('radLight_' + s, (.04, .03, .12), (sd * .5, -1.22, 1.55), to, core, .005)
    jets = []
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        j = node('jet_' + s, (sd * .34, -1.15, .65), to)
        cyl('collar_' + s, .3, .22, (0, 0, .12), j, gun, seg=22)
        cyl('bell_' + s, .3, .7, (0, 0, -.3), j, steel, seg=24, r2=.34, cap=False, thick=.04, bev=0)
        cyl('bellRing_' + s, .35, .08, (0, 0, -.64), j, gun, seg=24)
        cyl('core_' + s, .27, .02, (0, 0, -.05), j, core, seg=20, bev=0)
        jets.append(j)
    # ---- decals: 07 on the chest sides, the howling wolf on the pack ----
    decal('dec07_L', .7, .58, (.06, .65, .44, .96), (-1.045, .18, 1.2), to, dec, (0, 0, -math.pi / 2))
    decal('dec07_R', .7, .58, (.06, .65, .44, .96), (1.045, .18, 1.2), to, dec, (0, 0, math.pi / 2))
    decal('decWolf', .78, .64, (.52, .58, .98, .96), (0, -1.206, 1.42), to, dec, (0, 0, 0))
    # ---- pose for the shading bake (reset before export) ----
    for th, kn, hk, an in legs:
        hz, hy = ANK + L3 * math.cos(PHI), -L3 * math.sin(PHI)   # the hock sits above and behind the ankle
        d = math.hypot((HIP - .05) - hz, hy)
        tdir = math.atan2(hy, -(hz - (HIP - .05)))  # angle of hip->hock from straight down, plus = forward
        al = math.acos(max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)))); ga = math.acos(max(-1, min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))))
        t1 = tdir + al; k = -(math.pi - ga)
        th.rotation_euler.x = t1; kn.rotation_euler.x = k; hk.rotation_euler.x = PHI - (t1 + k); an.rotation_euler.x = -PHI
    for j in jets: j.rotation_euler.x = -.45
    for o in bpy.context.scene.objects:
        if o.name.startswith('tier') and o.name[4] in '234': o.location.x += 30
    bpy.context.view_layer.update()
    bake_ao(.5, 20)
    for o in bpy.context.scene.objects:
        if o.name.startswith('tier') and o.name[4] in '234': o.location.x -= 30
    return stats()

if __name__ == '__main__':
    out = sys.argv[-1]
    t = build()
    if out.endswith('.glb'):
        export(out); print('howler tris', t, 'size KB', os.path.getsize(out) // 1024)
