#!/usr/bin/env python3
"""Plush Panic 3D: build each plush's 3D model from its three cut-out views, then paint it.

  python3 build_plush.py [id ...]        (no ids: all 20)

Reads art/plush/<id>_{front,side,back}.webp (made by process_art.py). Writes:
  models/<id>.bin      the mesh, its paint coordinates, the physics points and the skin weights (see FORMAT)
  models/<id>.webp     the painted texture (one picture wrapped round the whole toy)
  models/index.json    sizes and counts, for the build and for checking

How a plush gets its shape:
  1. Front view -> where the toy is, left to right and up and down. Side view -> how deep it is at each height.
  2. Every height (row) is a slice. In each slice the toy is rounded: |u|^p + |v|^p <= 1, where u is the
     position across the front run it sits in and v the position across the side run. p = 2.2 is pillow-round.
  3. Parts the two views can't tell apart (thin wings, a tail behind the legs) get rules in PARTS below.
  4. The surface is pulled out of that volume (marching cubes), smoothed, and thinned to the triangle budget.
How it gets painted: the surface is unwrapped flat (xatlas), and every texel looks itself up in the front, side
and back pictures, weighted by which way it faces and whether that picture can actually see it.
"""
import os, sys, json, struct
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure
import trimesh, fast_simplification, xatlas

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..'))
ART = os.path.join(SRC, 'art', 'plush')
OUT = os.path.join(SRC, 'models')
os.makedirs(OUT, exist_ok=True)
META = json.load(open(os.path.join(ART, 'meta.json')))

# real height of each toy in metres (the shape is built 1 unit tall and scaled in the game)
SIZE = {'mochi': .07, 'berry': .085, 'toast': .08, 'onigiri': .078, 'pudding': .075, 'boba': .095, 'cupcake': .09, 'donut': .08,
        'frog': .19, 'hedgehog': .2, 'toadstool': .24, 'fox': .26, 'redpanda': .25, 'owl': .24, 'moth': .25, 'hare': .28,
        'whale': .5, 'dino': .75, 'sloth': .7, 'dragon': .72}
BUDGET = {'sugar': 2400, 'wild': 3600, 'titan': 7000}      # triangles
TEX = {'sugar': 512, 'wild': 512, 'titan': 1024}           # painted texture size
NPART = {'sugar': 28, 'wild': 40, 'titan': 64}             # physics points
NY = {'sugar': 96, 'wild': 112, 'titan': 136}              # slices from bottom to top
# per-toy shape rules: p = roundness; thin = colour ranges in the front view that are thin flat parts
# (h0..h1 hue in degrees, smin = least saturation, t = half thickness in units, z = where they sit front/back)
PARTS = {
    'moth': {'thin': [{'h0': 60, 'h1': 170, 'smin': .12, 't': .018, 'z': 0.0}]},
    'dragon': {'thin': [{'h0': 255, 'h1': 305, 'smin': .35, 't': .02, 'z': -.12}], 'feat': {'k': .9, 'ymin': 2}, 'sopen': 4},
    'whale': {'feat': {'k': .28, 'ymin': 2}}, 'dino': {'feat': {'k': 1.1, 'ymin': .55}, 'sopen': 5, 'ssmooth': 5, 'fsmooth': 4}, 'redpanda': {'feat': {'k': 1.0}},
    'fox': {'feat': {'k': 1.1, 'ymin': .5}}, 'hedgehog': {'feat': {'k': 1.2, 'ymin': .3, 'tail': False}}, 'hare': {'feat': {'k': 1.1, 'ymin': .45}}, 'owl': {'feat': {'k': 1.2, 'ymin': .45, 'tail': False}},
    'frog': {'ssmooth': 5, 'fsmooth': 3}, 'toast': {'p': 3.2}, 'onigiri': {'p': 2.6}, 'boba': {'p': 2.6}, 'donut': {'p': 2.0},
}

def load(pid, view):
    im = Image.open(os.path.join(ART, '%s_%s.webp' % (pid, view))).convert('RGBA')
    return np.asarray(im).astype(np.float32) / 255.0

def resample(a, w, h):
    return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((w, h), Image.BOX)).astype(np.float32) / 255.0

def runs_norm(mask):
    """For every row: each pixel's position across the run it sits in, -1 at one edge to +1 at the other (9 outside)."""
    H, W = mask.shape
    U = np.full((H, W), 9.0, np.float32)
    for y in range(H):
        row = mask[y]
        if not row.any():
            continue
        d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
        starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
        for s, e in zip(starts, ends):
            if e - s < 1:
                continue
            c, hw = (s + e - 1) / 2.0, max((e - s) / 2.0, .5)
            U[y, s:e] = (np.arange(s, e) - c) / hw
    return U

def rgb2hsv(rgb):
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, d / (mx + 1e-6), mx

def build(pid):
    M = META[pid]; mach = M['machine']; cfg = PARTS.get(pid, {})
    F, S, B = load(pid, 'front'), load(pid, 'side'), load(pid, 'back')
    ny = NY[mach]
    # every view is scaled to the same height: the toy is 1 unit tall, feet at y = 0
    def grid_of(img):
        h, w = img.shape[:2]
        nx = max(4, round(w / h * ny))
        return resample(img[..., 3], nx, ny)[::-1]     # row 0 = bottom
    fa, sa = grid_of(F), grid_of(S)
    fm = ndimage.binary_opening(fa > .5, iterations=1)
    # back spikes in the side view would become ridges across the whole back (two views can't tell they are narrow):
    # round them off the shape; the back photo still paints them on
    sm = ndimage.binary_opening(sa > .5, iterations=cfg.get('sopen', 1))
    # small bumps and notches in the side outline (little arms, the dip above the feet) would be stretched across
    # the whole width as rings: smooth the outline by blurring its signed distance, which rounds both away
    def smooth_outline(m, sig):
        if sig <= 0:
            return m
        sd = ndimage.distance_transform_edt(m) - ndimage.distance_transform_edt(~m)
        return ndimage.gaussian_filter(sd, sig) > 0
    sm = smooth_outline(sm, cfg.get('ssmooth', 3.0) * ny / 100)
    fm = smooth_outline(fm, cfg.get('fsmooth', 1.5) * ny / 100)
    nx, nz = fm.shape[1], sm.shape[1]
    p = cfg.get('p', 2.2)
    # snouts and tails: big bumps off the front or the back of the side outline. Two views can't say how wide they
    # are, so instead of a shelf across the whole toy each becomes a round feature down the middle, as wide as it is tall
    fe = cfg.get('feat'); sm_full = sm; L = None
    if fe:
        smf = sm[:, ::-1]                                                     # (y, z), +z = the toy's front
        core = smooth_outline(sm, fe.get('core', 7) * ny / 100)[:, ::-1]
        mind = max(2, int(fe.get('mind', .04) * ny))
        prot = np.zeros_like(smf)
        for yi in range(ny):
            cc = np.where(core[yi])[0]
            if not len(cc):
                continue
            zf, zb = cc.max(), cc.min()
            row = np.where(smf[yi])[0]
            if yi / ny >= fe.get('ymin', .3) and (row > zf + mind).any():
                prot[yi, zf + 1:] = smf[yi, zf + 1:]
            if fe.get('tail', True) and (row < zb - mind).any():
                prot[yi, :zb] = smf[yi, :zb]
        prot = ndimage.binary_opening(prot, iterations=1)
        if os.environ.get('DBG'): print('   features: %d voxels in snouts/tails' % prot.sum())
        hv = np.zeros(smf.shape, np.float32)
        for zi in range(nz):
            d = np.diff(np.concatenate([[0], prot[:, zi].astype(np.int8), [0]]))
            for a0, a1 in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
                hv[a0:a1, zi] = (a1 - a0) / 2.0 / ny
        L = ndimage.grey_dilation(hv * fe.get('k', 1.0), size=(5, 5))
        sm = (smf & ~prot)[:, ::-1]
    # outside the outline the value has to keep falling smoothly (1 at the edge, more further out): a hard jump there
    # makes the smoothed surface snap onto the pixel grid's stair-steps, which shows up as rings round the toy
    def outside(mask, D):
        return 1.0 + ndimage.distance_transform_edt(~mask) / np.maximum(D, 1)
    if cfg.get('mode', 'runs') == 'runs':
        U, V = runs_norm(fm), runs_norm(sm)
        for A, m in ((U, fm), (V, sm)):
            o = outside(m, .06 * ny); A[~m] = o[~m]
    else:
        # how far in from the outline each pixel is, compared with how thick that part of the toy is nearby:
        # 0 deep inside, 1 at the edge. Smooth in every direction, so slices can't jump the way row runs do.
        def inset(mask):
            d = ndimage.distance_transform_edt(np.pad(mask, 1))[1:-1, 1:-1]
            w = max(3, int(cfg.get('win', .22) * ny))
            D = ndimage.gaussian_filter(ndimage.maximum_filter(d, size=w), w / 4)
            u = np.where(mask, 1.0 - d / np.maximum(D, 1), outside(mask, .06 * ny))
            return np.clip(u, 0, 4).astype(np.float32)
        U, V = inset(fm), inset(sm)
    # volume: x across the front view, z across the side view (the side view's image-left is the toy's front)
    PAD = 3
    vol = np.full((ny + 2 * PAD, nx + 2 * PAD, nz + 2 * PAD), -1.0, np.float32)
    uu = np.abs(U)[:, :, None]; vv = np.abs(V[:, ::-1])[:, None, :]          # flip z so +z = the toy's front
    val = np.clip(1.0 - (np.minimum(uu, 3) ** p + np.minimum(vv, 3) ** p), -1, 1)
    # thin flat parts (wings): a slab instead of the full depth
    for th in cfg.get('thin', []):
        rgb = np.stack([resample(F[..., c], nx, ny)[::-1] for c in range(3)], -1)
        h, s, v = rgb2hsv(rgb)
        tm = fm & (h >= th['h0']) & (h <= th['h1']) & (s >= th['smin'])
        tm = ndimage.binary_opening(tm, iterations=1)
        zc = (np.arange(nz) - (nz - 1) / 2.0) / ny                            # z in units
        # row by row, the slab sits where the side photo shows that colour (wings behind, ear frills at the head)
        srgb = np.stack([resample(S[..., c], nz, ny)[::-1] for c in range(3)], -1)[:, ::-1]
        sh, ss, _ = rgb2hsv(srgb)
        smk = sm[:, ::-1] & (sh >= th['h0']) & (sh <= th['h1']) & (ss >= th['smin'])
        zrow = np.full(ny, th['z'], np.float32)
        for yi in range(ny):
            cols = np.where(smk[yi])[0]
            if len(cols) >= 2:
                zrow[yi] = zc[cols].mean()
        zrow = ndimage.gaussian_filter1d(ndimage.median_filter(zrow, 7), 2)
        slab = 1.0 - np.abs(zc[None, None, :] - zrow[:, None, None]) / th['t']
        # thin areas: only the slab; elsewhere the round volume as before
        val = np.where(tm[:, :, None], np.minimum(np.maximum(slab, -1), 1), val)
    if L is not None:
        Vf = runs_norm(sm_full); o = outside(sm_full, .06 * ny); Vf[~sm_full] = o[~sm_full]
        vf = np.abs(Vf[:, ::-1])[:, None, :]
        xc = (np.arange(nx) - (nx - 1) / 2.0) / ny
        lim = 1.0 - (np.abs(xc)[None, :, None] / np.maximum(L, 1e-3)[:, None, :]) ** p
        vfeat = np.minimum(np.minimum(lim, 1.0 - np.minimum(vf, 3) ** p), 1.0 - np.minimum(uu, 3) ** p)
        val = np.where((L > 0)[:, None, :], np.maximum(val, np.clip(vfeat, -1, 1)), val)
    vol[PAD:PAD + ny, PAD:PAD + nx, PAD:PAD + nz] = val
    if os.environ.get('DBG'): np.savez('/tmp/clawwork/dbg_%s.npz' % pid, fm=fm, sm=sm, U=U, V=V, val=val)
    vol = ndimage.gaussian_filter(vol, (1.25, .9, .9))      # a little more along the height: smooths slice-to-slice steps
    verts, faces, _, _ = measure.marching_cubes(vol, 0.0)
    # voxel -> units: x right, y up, z toward the viewer; centre x and z on the views' middles
    verts = verts[:, [1, 0, 2]] - PAD
    verts[:, 0] = (verts[:, 0] - (nx - 1) / 2.0) / ny
    verts[:, 1] = verts[:, 1] / ny
    verts[:, 2] = (verts[:, 2] - (nz - 1) / 2.0) / ny
    mesh = trimesh.Trimesh(verts, faces[:, [0, 2, 1]], process=True)
    trimesh.smoothing.filter_taubin(mesh, lamb=.5, nu=-.53, iterations=12)
    target = BUDGET[mach]
    if len(mesh.faces) > target:
        v2, f2 = fast_simplification.simplify(mesh.vertices.astype(np.float32), mesh.faces.astype(np.int32), 1 - target / len(mesh.faces))
        mesh = trimesh.Trimesh(v2, f2, process=True)
    V3 = mesh.vertices.astype(np.float32); FI = mesh.faces.astype(np.uint32)
    # outward normals straight from the volume (it is positive inside), so nothing can come out inside-out
    gy, gx, gz = np.gradient(vol)
    vc = [V3[:, 1] * ny + PAD, V3[:, 0] * ny + (nx - 1) / 2.0 + PAD, V3[:, 2] * ny + (nz - 1) / 2.0 + PAD]
    NV = -np.stack([ndimage.map_coordinates(g, vc, order=1) for g in (gx, gy, gz)], 1).astype(np.float32)
    NV /= np.linalg.norm(NV, axis=1, keepdims=True) + 1e-9
    fn = np.cross(V3[FI[:, 1]] - V3[FI[:, 0]], V3[FI[:, 2]] - V3[FI[:, 0]])
    flip = (fn * NV[FI].sum(1)).sum(1) < 0
    FI[flip] = FI[flip][:, [0, 2, 1]]
    # ---- unwrap and paint ----
    vmap, idx, uv = xatlas.parametrize(V3, FI)
    V3, NV = V3[vmap], NV[vmap]
    T = TEX[mach]
    tex, cover = bake(pid, V3, NV, idx, uv, T, F, S, B, fm, sm, ny)
    Image.fromarray(tex).save(os.path.join(OUT, pid + '.webp'), 'WEBP', quality=86, method=6)
    # ---- physics points: spread through the inside, each a ball that reaches the skin ----
    inside = vol[PAD:PAD + ny, PAD:PAD + nx, PAD:PAD + nz] > 0.05
    edt = ndimage.distance_transform_edt(inside) / ny
    pts = np.argwhere(inside).astype(np.float32)          # (y, x, z) voxels
    k = NPART[mach]
    rng = np.random.default_rng(1)
    C = pts[rng.choice(len(pts), k, replace=False)]
    for _ in range(25):                                   # k-means: even spread through the volume
        d = ((pts[:, None, :] - C[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            m = pts[lab == j]
            if len(m):
                C[j] = m.mean(0)
    P = np.zeros((k, 4), np.float32)
    for j, (y, x, z) in enumerate(C):
        yi, xi, zi = int(round(y)), int(round(x)), int(round(z))
        r = edt[min(ny - 1, yi), min(nx - 1, xi), min(nz - 1, zi)]
        P[j] = [(x - (nx - 1) / 2.0) / ny, y / ny, (z - (nz - 1) / 2.0) / ny, max(r, 1.2 / ny)]
    # ---- skin: each vertex follows its 4 nearest physics points ----
    d = np.sqrt(((V3[:, None, :] - P[None, :, :3]) ** 2).sum(-1)) - P[None, :, 3] * .5
    near = np.argsort(d, 1)[:, :4]
    dn = np.take_along_axis(d, near, 1)
    w = 1.0 / (np.maximum(dn, 1e-3) ** 2)
    w /= w.sum(1, keepdims=True)
    write_bin(pid, V3, NV, uv, idx, near, w, P)
    return {'id': pid, 'machine': mach, 'size': SIZE[pid], 'verts': len(V3), 'tris': len(idx), 'parts': k, 'tex': T,
            'cover': round(cover, 3), 'bin': os.path.getsize(os.path.join(OUT, pid + '.bin')), 'webp': os.path.getsize(os.path.join(OUT, pid + '.webp')),
            'w': round(float(V3[:, 0].max() - V3[:, 0].min()), 3), 'd': round(float(V3[:, 2].max() - V3[:, 2].min()), 3)}

def bake(pid, V3, NV, idx, uv, T, F, S, B, fm, sm, ny):
    """Paint: every texel of the unwrapped surface takes its colour from the views that can see it."""
    # depth maps from each camera: the nearest surface along the view, from the mesh itself (z-buffer by splatting)
    def view_xy(view, P):
        if view == 'front': return P[:, 0], P[:, 1], P[:, 2]
        if view == 'back': return -P[:, 0], P[:, 1], -P[:, 2]
        if view == 'left': return -P[:, 2], P[:, 1], P[:, 0]      # camera on +x: image right = -z
        return P[:, 2], P[:, 1], -P[:, 0]                          # right side: the left view mirrored
    B = register(B, F[:, ::-1])
    imgs = {'front': F, 'back': B, 'left': S, 'right': S[:, ::-1]}
    # each image spans its own width at height 1; image x centre = view's 0
    def img_lookup(view, a, b):
        im = imgs[view]; h, w = im.shape[:2]
        px = a * h + (w - 1) / 2.0; py = (h - 1) - b * h
        return px, py
    # depth buffers (resolution 256 per unit)
    R = 256
    zbuf = {}
    tri_pts = V3[idx]                                  # (ntri, 3, 3)
    dense = np.concatenate([tri_pts.mean(1), V3, (tri_pts[:, 0] + tri_pts[:, 1]) / 2, (tri_pts[:, 1] + tri_pts[:, 2]) / 2, (tri_pts[:, 0] + tri_pts[:, 2]) / 2])
    for view in imgs:
        a, b, dep = view_xy(view, dense)
        ia = np.clip(((a + 1.5) * R).astype(int), 0, 3 * R - 1); ib = np.clip((b * R).astype(int), 0, R + 1)
        zb = np.full((R + 2, 3 * R), -9.0, np.float32)
        np.maximum.at(zb, (ib, ia), dep)
        zb = ndimage.grey_dilation(zb, size=(5, 5))
        zbuf[view] = zb
    # rasterise triangles in uv space
    tex = np.zeros((T, T, 3), np.float32); wsum = np.zeros((T, T), np.float32)
    pos = np.zeros((T, T, 3), np.float32); nrm = np.zeros((T, T, 3), np.float32); hit = np.zeros((T, T), bool)
    UV = uv * (T - 1)
    for tri in idx:
        p0, p1, p2 = UV[tri]
        x0, x1 = int(np.floor(min(p0[0], p1[0], p2[0]))), int(np.ceil(max(p0[0], p1[0], p2[0])))
        y0, y1 = int(np.floor(min(p0[1], p1[1], p2[1]))), int(np.ceil(max(p0[1], p1[1], p2[1])))
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if abs(den) < 1e-9:
            continue
        l0 = ((p1[1] - p2[1]) * (xs - p2[0]) + (p2[0] - p1[0]) * (ys - p2[1])) / den
        l1 = ((p2[1] - p0[1]) * (xs - p2[0]) + (p0[0] - p2[0]) * (ys - p2[1])) / den
        l2 = 1 - l0 - l1
        m = (l0 >= -.02) & (l1 >= -.02) & (l2 >= -.02) & (xs >= 0) & (ys >= 0) & (xs < T) & (ys < T)
        if not m.any():
            continue
        L = np.stack([l0[m], l1[m], l2[m]], 1)
        pos[ys[m], xs[m]] = L @ V3[tri]; nrm[ys[m], xs[m]] = L @ NV[tri]; hit[ys[m], xs[m]] = True
    P = pos[hit]; N = nrm[hit]; N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-6
    col = np.zeros((len(P), 3), np.float32); ws = np.zeros(len(P), np.float32)
    facing = {'front': N[:, 2], 'back': -N[:, 2], 'left': N[:, 0], 'right': -N[:, 0]}
    for view, im in imgs.items():
        a, b, dep = view_xy(view, P)
        ia = np.clip(((a + 1.5) * R).astype(int), 0, 3 * R - 1); ib = np.clip((b * R).astype(int), 0, R + 1)
        vis = dep >= zbuf[view][ib, ia] - .035
        f = np.clip(facing[view], 0, 1)
        w = (f ** 2.2) * vis * (1.0 if view in ('front', 'back') else .8)
        px, py = img_lookup(view, a, b)
        h, wd = im.shape[:2]
        pxi = np.clip(px, 0, wd - 1); pyi = np.clip(py, 0, h - 1)
        c = np.stack([ndimage.map_coordinates(im[..., ch], [pyi, pxi], order=1) for ch in range(4)], 1)
        w = w * np.clip(c[:, 3] * 1.4 - .2, 0, 1)                      # don't take colour from outside the toy
        col += c[:, :3] * w[:, None]; ws += w
        if os.environ.get('DBG'): print('  ', view, 'facing>0 %.2f vis %.2f alpha %.2f used %.2f' % ((f > .1).mean(), vis.mean(), (c[:, 3] > .5).mean(), (w > 1e-3).mean()))
    down = np.clip(-N[:, 1] - .1, 0, 1)
    lift = 1 + .9 * down
    col = np.minimum(col * lift[:, None], col + ws[:, None] * .3)
    good = ws > 1e-3
    cover = float(good.mean())
    out = np.zeros((len(P), 3), np.float32); out[good] = col[good] / ws[good, None]
    tex[hit] = out
    known = np.zeros((T, T), bool); known[hit] = good
    # fill texels no view could see (under chins, between legs) from their painted neighbours, then pad the charts
    for _ in range(64):
        if known.all():
            break
        k = known.astype(np.float32)
        s = ndimage.uniform_filter(tex * k[..., None], (3, 3, 1)); c = ndimage.uniform_filter(k, 3)
        new = (~known) & (c > 0)
        tex[new] = s[new] / c[new, None]; known |= new
    return (np.clip(tex, 0, 1) * 255).astype(np.uint8), cover   # row = v (the game loads it with flipY off)

def register(img, ref):
    """Stretch and slide a picture so its outline lines up with ref's outline (both pictures 1 unit tall):
    try stretches of 0.85..1.15 each way, and for each find the best slide by cross-correlation."""
    H = 96
    def small(a, w):
        return resample(a, w, H)
    rw = max(8, round(ref.shape[1] / ref.shape[0] * H))
    R0 = (small(ref[..., 3], rw) > .5).astype(np.float32)
    best = (-1, 1, 1, 0, 0)
    iw = img.shape[1] / img.shape[0]
    for sx in np.arange(.84, 1.17, .03):
        for sy in np.arange(.88, 1.13, .03):
            w2, h2 = max(4, round(iw * H * sx)), max(4, round(H * sy))
            m = (resample(img[..., 3], w2, h2) > .5).astype(np.float32)
            # place m bottom-centred on a canvas the size of the reference plus margins, then correlate
            Hc, Wc = H + 40, rw + 60
            A = np.zeros((Hc, Wc), np.float32); A[20:20 + H, 30:30 + rw] = R0
            Bm = np.zeros((Hc, Wc), np.float32)
            y0 = 20 + H - h2; x0 = 30 + (rw - w2) // 2
            if y0 < 0 or x0 < 0 or y0 + h2 > Hc or x0 + w2 > Wc:
                continue
            Bm[y0:y0 + h2, x0:x0 + w2] = m
            cc = np.real(np.fft.ifft2(np.fft.fft2(A) * np.conj(np.fft.fft2(Bm))))
            cc = np.roll(np.roll(cc, 10, 0), 15, 1)[:21, :31]               # slides of -10..10 rows, -15..15 cols
            iy, ix = np.unravel_index(cc.argmax(), cc.shape)
            inter = cc[iy, ix]; iou = inter / (R0.sum() + m.sum() - inter + 1e-6)
            if iou > best[0]:
                best = (iou, sx, sy, iy - 10, ix - 15)
    iou, sx, sy, dy, dx = best
    # rebuild the picture at the reference's own size with that stretch and slide
    Hr, Wr = ref.shape[:2]; k = Hr / H
    h2, w2 = round(Hr * sy), round(iw * Hr * sx)
    big = np.asarray(Image.fromarray((img * 255).astype(np.uint8)).resize((w2, h2), Image.LANCZOS)).astype(np.float32) / 255
    out = np.zeros((Hr, Wr, 4), np.float32)
    y0 = Hr - h2 + round(dy * k); x0 = (Wr - w2) // 2 + round(dx * k)
    ys, xs = max(0, y0), max(0, x0); ye, xe = min(Hr, y0 + h2), min(Wr, x0 + w2)
    out[ys:ye, xs:xe] = big[ys - y0:ye - y0, xs - x0:xe - x0]
    if os.environ.get('DBG'): print('   back fit: stretch %.2f x %.2f, slide %d,%d, overlap %.2f' % (sx, sy, dx, dy, iou))
    return out

def write_bin(pid, V3, NV, uv, idx, near, w, P):
    """FORMAT (little-endian): 'PLS1', u32 nv, u32 ntri, u32 np, f32 min[3], f32 max[3],
    u16 pos[nv*3] (quantised in the box), i8 nrm[nv*3], u16 uv[nv*2], u8 bone[nv*4], u8 weight[nv*4],
    u16 index[ntri*3], f32 part[np*4] (x, y, z, radius)."""
    mn, mx = V3.min(0), V3.max(0)
    q = np.round((V3 - mn) / np.maximum(mx - mn, 1e-6) * 65535).astype('<u2')
    n8 = np.round(np.clip(NV / (np.linalg.norm(NV, axis=1, keepdims=True) + 1e-9), -1, 1) * 127).astype('i1')
    u16 = np.round(np.clip(uv, 0, 1) * 65535).astype('<u2')
    wq = np.round(w * 255).astype(np.int32); wq[:, 0] += 255 - wq.sum(1)
    with open(os.path.join(OUT, pid + '.bin'), 'wb') as f:
        f.write(b'PLS1' + struct.pack('<III', len(V3), len(idx), len(P)) + struct.pack('<6f', *mn, *mx))
        for a in (q, n8, u16, near.astype('u1'), np.clip(wq, 0, 255).astype('u1'), idx.astype('<u2'), P.astype('<f4')):
            f.write(a.tobytes())

if __name__ == '__main__':
    ids = sys.argv[1:] or list(META)
    idxp = os.path.join(OUT, 'index.json')
    index = json.load(open(idxp)) if os.path.exists(idxp) else {}
    for pid in ids:
        r = build(pid); index[pid] = r
        print('%-10s %5d verts %5d tris  cover %.0f%%  bin %3d KB  tex %3d KB  w %.2f d %.2f' % (pid, r['verts'], r['tris'], r['cover'] * 100, r['bin'] // 1024, r['webp'] // 1024, r['w'], r['d']))
    json.dump(index, open(idxp, 'w'), indent=1)
