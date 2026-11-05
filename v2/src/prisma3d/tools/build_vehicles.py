"""Carve Prisma 3D's vehicles out of Christopher's design sheets (images 33-36).

For each vehicle the outline in each view (side, back, front, or top) is a cut-out. A point in 3D belongs to the
vehicle only if it falls inside every view's outline: the classic "visual hull". The result is smoothed, turned
into a mesh with marching cubes, and the sheet itself becomes the paint: the game projects the side view onto the
sides, the back view onto the back, and so on. Glowing parts (lights, rings, the spectrum stripe) are found by
colour and stored in the texture's alpha so they glow at night.

python3 -I build_vehicles.py <input dir> <art dir>
"""
import sys, os, glob, json, base64, colorsys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage import measure

SRC, OUT = sys.argv[1], sys.argv[2]
FILES = {os.path.basename(p)[:2]: p for p in glob.glob(os.path.join(SRC, '*', '*.png'))}

def sheet(n):
    a = np.asarray(Image.open(FILES[n]).convert('RGB')).astype(np.float32) / 255
    bg = np.median(np.concatenate([a[:8, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3), a[:8, -8:].reshape(-1, 3)]), 0)
    d = np.abs(a - bg).max(2)
    fg = d > .07
    fg = nd.binary_opening(fg, iterations=1); fg = nd.binary_closing(fg, iterations=3); fg = nd.binary_fill_holes(fg)
    lab, k = nd.label(fg)
    sizes = nd.sum(fg, lab, range(1, k + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s > fg.size * .004]
    comps = []
    for i in keep:
        sl = nd.find_objects((lab == i).astype(int))[0]
        comps.append({'y0': sl[0].start, 'y1': sl[0].stop, 'x0': sl[1].start, 'x1': sl[1].stop, 'mask': lab == i})
    return a, fg, comps

def merge(comps, boxes):
    """Group components whose centres fall inside each given box (for views split into several pieces)."""
    out = []
    for (bx0, by0, bx1, by1) in boxes:
        m = None; y0 = x0 = 1e9; y1 = x1 = -1
        for c in comps:
            cx, cy = (c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2
            if bx0 <= cx < bx1 and by0 <= cy < by1:
                m = c['mask'] if m is None else (m | c['mask'])
                y0, y1, x0, x1 = min(y0, c['y0']), max(y1, c['y1']), min(x0, c['x0']), max(x1, c['x1'])
        out.append({'y0': y0, 'y1': y1, 'x0': x0, 'x1': x1, 'mask': m})
    return out

def bleed(a, fg):
    """Push every vehicle colour outward into the background, so samples right at an edge never pick up grey."""
    idx = nd.distance_transform_edt(~fg, return_distances=False, return_indices=True)
    return a[idx[0], idx[1]]

def hsv(a):
    mx = a.max(2); mn = a.min(2); v = mx; s = np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; d = np.maximum(mx - mn, 1e-4)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, s, v

def sample(mask, view, t_u, t_v):
    """Look up the view's (eroded) mask at normalised coordinates."""
    H = view['y1'] - view['y0']; W = view['x1'] - view['x0']
    px = np.clip((view['x0'] + t_u * (W - 1)).round().astype(int), 0, mask.shape[1] - 1)
    py = np.clip((view['y0'] + t_v * (H - 1)).round().astype(int), 0, mask.shape[0] - 1)
    return mask[py, px]

import pyfqmr
def vnormals(v, f):
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    n = np.zeros_like(v)
    for k in range(3): np.add.at(n, f[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
def mesh_from(occ, bounds, sigma=1.0, step=1, target=None):
    v, f, n = _mesh_from(occ, bounds, sigma, step)
    if target and len(f) > target:
        sim = pyfqmr.Simplify(); sim.setMesh(v.astype(np.float64), f.astype(np.int32))
        sim.simplify_mesh(target_count=target, aggressiveness=5, preserve_border=False, verbose=False)
        v, f, _ = sim.getMesh(); v = v.astype(np.float32); f = f.astype(np.uint32)
        n = vnormals(v, f)
        # marching-cubes winding is consistent; make sure normals point outward (away from the centre on average)
        c = v.mean(0)
        if (np.einsum('ij,ij->i', n, v - c) < 0).mean() > .5: n = -n
    return v, f, n.astype(np.float32)
def _mesh_from(occ, bounds, sigma=1.0, step=1):
    x0, x1, y0, y1, z0, z1 = bounds
    nx, ny, nz = occ.shape
    vol = nd.gaussian_filter(occ.astype(np.float32), sigma)
    vol = np.pad(vol, 1)
    sp = ((x1 - x0) / (nx - 1), (y1 - y0) / (ny - 1), (z1 - z0) / (nz - 1))
    verts, faces, normals, _ = measure.marching_cubes(vol, .5, spacing=sp, step_size=step, gradient_direction='ascent')
    verts = verts - np.array(sp) + np.array([x0, y0, z0])
    normals = -normals
    return verts.astype(np.float32), faces.astype(np.uint32), normals.astype(np.float32)

def pack_mesh(verts, faces, normals):
    lo = verts.min(0); hi = verts.max(0); sc = (hi - lo) / 65535
    q = np.round((verts - lo) / np.maximum(sc, 1e-9)).astype(np.uint16)
    nq = np.clip(np.round(normals / np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-6) * 127), -127, 127).astype(np.int8)
    f = faces.astype(np.uint16 if len(verts) < 65536 else np.uint32)
    b64 = lambda x: base64.b64encode(x.tobytes()).decode()
    return {'lo': lo.round(5).tolist(), 'sc': sc.tolist(), 'pos': b64(q), 'nrm': b64(nq), 'idx': b64(f), 'i32': bool(f.dtype == np.uint32), 'nv': int(len(verts)), 'nt': int(len(faces))}

def rect(view, shape, flipu=False, flipv=False):
    """uv rect for a view in the texture: origin + size, negative size for a flip."""
    Hs, Ws = shape[:2]
    u0, v0 = view['x0'] / Ws, view['y0'] / Hs; du, dv = (view['x1'] - view['x0'] - 1) / Ws, (view['y1'] - view['y0'] - 1) / Hs
    if flipu: u0, du = u0 + du, -du
    if flipv: v0, dv = v0 + dv, -dv
    return [round(u0, 6), round(v0, 6), round(du, 6), round(dv, 6)]

def save_tex(a, fg, emis, name, width=None):
    rgb = bleed(a, fg)
    rgba = np.dstack([rgb, np.clip(emis, 0, 1)])
    im = Image.fromarray((rgba * 255 + .5).astype(np.uint8), 'RGBA')
    if width and im.width != width: im = im.resize((width, int(round(im.height * width / im.width))), Image.LANCZOS)
    p = os.path.join(OUT, name + '.webp'); im.save(p, 'WEBP', quality=90, method=6, exact=True)
    return os.path.getsize(p)

MODELS = {}
# ======================= the bike (33): front | side (facing left) | back =======================
a, fg, comps = sheet('33'); comps.sort(key=lambda c: c['x0'])
W3 = a.shape[1]
front, side, back = merge(comps, [(0, 0, W3 * .27, 1e9), (W3 * .27, 0, W3 * .76, 1e9), (W3 * .76, 0, 1e9, 1e9)])
ero = lambda v: nd.binary_erosion(v['mask'], iterations=2)
Ms, Mb, Mf = ero(side), ero(back), ero(front)
L = 3.75; sh = side['y1'] - side['y0']; sw = side['x1'] - side['x0']; mpp = L / sw; Hh = sh * mpp
bw = (back['x1'] - back['x0']) * Hh / (back['y1'] - back['y0']); fw = (front['x1'] - front['x0']) * Hh / (front['y1'] - front['y0'])
Wd = max(bw, fw)
y0, y1 = .18, .18 + Hh; z0, z1 = -L / 2, L / 2; x0, x1 = -Wd / 2, Wd / 2
nz, ny, nx = 150, int(150 * Hh / L), int(150 * Wd / L)
X, Y, Z = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y0, y1, ny), np.linspace(z0, z1, nz), indexing='ij')
tv = (y1 - Y) / (y1 - y0)
occ = sample(Ms, side, (z1 - Z) / (z1 - z0), tv)
occ &= sample(Mb, back, (X - (-bw / 2)) / bw, tv) & (np.abs(X) <= bw / 2)
occ &= sample(Mf, front, ((fw / 2) - X) / fw, tv) & (np.abs(X) <= fw / 2)
v, f, n = mesh_from(occ, (x0, x1, y0, y1, z0, z1), 1.0, 1, 14000)
h, s, val = hsv(a)
em = ((s > .5) & (val > .45)).astype(np.float32) * np.clip((val - .35) / .5, 0, 1)
em = nd.gaussian_filter(em, .7)
sz = save_tex(a, fg, em, 'veh_bike')
MODELS['bike'] = {'mesh': pack_mesh(v, f, n), 'tex': 'veh_bike', 'b': [x0, x1, y0, y1, z0, z1],
    'side': rect(side, a.shape, flipu=True), 'back': rect(back, a.shape), 'front': rect(front, a.shape, flipu=True), 'w': [bw, fw]}
print('bike', f'{L:.2f} x {Wd:.2f} x {Hh:.2f} m', 'tris', len(f), 'tex', sz // 1024, 'KB')

# ======================= the van (34): front | side (facing left) | back =======================
a, fg, comps = sheet('34'); W3 = a.shape[1]
front, side, back = merge(comps, [(0, 0, W3 * .23, 1e9), (W3 * .23, 0, W3 * .76, 1e9), (W3 * .76, 0, 1e9, 1e9)])
Ms, Mb, Mf = ero(side), ero(back), ero(front)
L = 6.3; sh = side['y1'] - side['y0']; sw = side['x1'] - side['x0']; Hh = sh * L / sw
bw = (back['x1'] - back['x0']) * Hh / (back['y1'] - back['y0']); fw = (front['x1'] - front['x0']) * Hh / (front['y1'] - front['y0'])
Wd = max(bw, fw); y0, y1 = .12, .12 + Hh; z0, z1 = -L / 2, L / 2; x0, x1 = -Wd / 2, Wd / 2
nz = 150; ny, nx = int(nz * Hh / L), int(nz * Wd / L)
X, Y, Z = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y0, y1, ny), np.linspace(z0, z1, nz), indexing='ij')
tv = (y1 - Y) / (y1 - y0)
occ = sample(Ms, side, (z1 - Z) / (z1 - z0), tv) & sample(Mb, back, (X + bw / 2) / bw, tv) & (np.abs(X) <= bw / 2) & sample(Mf, front, (fw / 2 - X) / fw, tv) & (np.abs(X) <= fw / 2)
v, f, n = mesh_from(occ, (x0, x1, y0, y1, z0, z1), 1.0, 1, 10000)
h, s, val = hsv(a)
yy = np.arange(a.shape[0])[:, None] * np.ones((1, a.shape[1]))
orange = (h < 40) & (s > .68) & (val > .85)
white = (s < .18) & (val > .93)
em = (orange | white).astype(np.float32); em = nd.gaussian_filter(em, .7)
sz = save_tex(a, fg, em, 'veh_van')
MODELS['van'] = {'mesh': pack_mesh(v, f, n), 'tex': 'veh_van', 'b': [x0, x1, y0, y1, z0, z1],
    'side': rect(side, a.shape, flipu=True), 'back': rect(back, a.shape), 'front': rect(front, a.shape, flipu=True), 'w': [bw, fw]}
print('van', f'{L:.2f} x {Wd:.2f} x {Hh:.2f} m', 'tris', len(f), 'tex', sz // 1024, 'KB')

# ======================= the traffic (35): five side views facing right, stacked =======================
a, fg, comps = sheet('35')
comps.sort(key=lambda c: c['y0'])
# merge pieces that belong to one vehicle (same vertical band)
rows = []
for c in comps:
    cy = (c['y0'] + c['y1']) / 2
    for r in rows:
        if r['y0'] - 6 <= cy <= r['y1'] + 6: break
    else:
        rows.append({'y0': c['y0'], 'y1': c['y1'], 'cs': []}); r = rows[-1]
    r['cs'].append(c); r['y0'] = min(r['y0'], c['y0']); r['y1'] = max(r['y1'], c['y1'])
views = []
for r in rows:
    m = None
    for c in r['cs']: m = c['mask'] if m is None else (m | c['mask'])
    ys, xs = np.where(m); views.append({'y0': ys.min(), 'y1': ys.max() + 1, 'x0': xs.min(), 'x1': xs.max() + 1, 'mask': m})
assert len(views) == 5, len(views)
# game sizes: the hit box lengths (CARTYPES) and a believable width and height for each
SPEC = [(4.3, 1.92, 1.5), (4.6, 1.98, 1.32), (4.4, 1.92, 1.68), (4.1, 1.8, 1.78), (8.4, 2.4, 3.0)]
cars = []
h, s, val = hsv(a)
em = ((h > 180) & (h < 215) & (s > .45) & (val > .6)).astype(np.float32); em = nd.gaussian_filter(em, .7)
for i, (vw, (L, Wd, Hh)) in enumerate(zip(views, SPEC)):
    Ms = nd.binary_erosion(vw['mask'], iterations=2)
    y0, y1 = .1, .1 + Hh; z0, z1 = -L / 2, L / 2; x0, x1 = -Wd / 2, Wd / 2
    nz = 110 if i < 4 else 150; ny = max(30, int(nz * Hh / L * 1.6)); nx = max(24, int(nz * Wd / L * 1.2))
    X, Y, Z = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y0, y1, ny), np.linspace(z0, z1, nz), indexing='ij')
    tu = (Z - z0) / (z1 - z0); tv = (y1 - Y) / (y1 - y0)
    occS = sample(Ms, vw, tu, tv)
    # the roofline at each slice along the car, so the cabin narrows toward the roof
    top = np.full(nz, 1.0)
    occ2 = occS[nx // 2]
    for k in range(nz):
        col = np.where(occ2[:, k])[0]
        top[k] = (col.min() / (ny - 1)) if len(col) else 1.0
    trel = (tv - top[None, None, :]) / np.maximum(1 - top[None, None, :], 1e-3)    # 0 at the roof, 1 at the bottom
    prof = np.where(trel < .42, .7 + .3 * np.clip(trel / .42, 0, 1) ** .7, 1.0) * np.where(trel > .92, .9, 1)
    endz = np.sqrt(np.clip(1 - (np.abs(Z) / (L / 2)) ** 10, 0, 1))
    occ = occS & (np.abs(X) <= Wd / 2 * prof * (.88 + .12 * endz))
    v, f, n = mesh_from(occ, (x0, x1, y0, y1, z0, z1), 1.0, 1, 4200 if i < 4 else 5000)
    cars.append({'mesh': pack_mesh(v, f, n), 'b': [x0, x1, y0, y1, z0, z1], 'side': rect(vw, a.shape)})
    # where the tail lights sit: a third of the way down the rear, roughly
    print('car', i, f'{L:.2f} x {Wd:.2f} x {Hh:.2f} m', 'tris', len(f))
sz = save_tex(a, fg, em, 'veh_traffic')
MODELS['cars'] = cars; MODELS['carTex'] = 'veh_traffic'
print('traffic tex', sz // 1024, 'KB')

# ======================= the drone (36): top view (front at the bottom) | side view (facing left) =======================
a, fg, comps = sheet('36')
H6 = a.shape[0]
top, side = merge(comps, [(0, 0, 1e9, H6 * .6), (0, H6 * .6, 1e9, 1e9)])
Mt, Ms = nd.binary_erosion(top['mask'], iterations=2), nd.binary_erosion(side['mask'], iterations=2)
Wd = 1.9; Lz = Wd * (top['y1'] - top['y0']) / (top['x1'] - top['x0'])
Ls = (side['x1'] - side['x0']); Hh = (side['y1'] - side['y0']) * Lz / Ls
y0, y1 = -Hh / 2, Hh / 2; z0, z1 = -Lz / 2, Lz / 2; x0, x1 = -Wd / 2, Wd / 2
nx, nz = 110, int(110 * Lz / Wd); ny = max(24, int(110 * Hh / Wd))
X, Y, Z = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y0, y1, ny), np.linspace(z0, z1, nz), indexing='ij')
occ = sample(Mt, top, (x1 - X) / (x1 - x0), (Z - z0) / (z1 - z0)) & sample(Ms, side, (z1 - Z) / (z1 - z0), (y1 - Y) / (y1 - y0))
v, f, n = mesh_from(occ, (x0, x1, y0, y1, z0, z1), .8, 1, 5000)
h, s, val = hsv(a)
em = ((((h < 15) | (h > 345)) & (s > .6) & (val > .7)) | ((h > 200) & (h < 250) & (s > .6) & (val > .7)) | ((s < .2) & (val > .96))).astype(np.float32)
em = nd.gaussian_filter(em, .7)
sz = save_tex(a, fg, em, 'veh_drone', 1024)
MODELS['drone'] = {'mesh': pack_mesh(v, f, n), 'tex': 'veh_drone', 'b': [x0, x1, y0, y1, z0, z1], 'top': rect(top, a.shape, flipu=True), 'side': rect(side, a.shape, flipu=True)}
print('drone', f'{Lz:.2f} x {Wd:.2f} x {Hh:.2f} m', 'tris', len(f), 'tex', sz // 1024, 'KB')

json.dump(MODELS, open(os.path.join(OUT, 'vehicles.json'), 'w'))
print('vehicles.json', os.path.getsize(os.path.join(OUT, 'vehicles.json')) // 1024, 'KB')
