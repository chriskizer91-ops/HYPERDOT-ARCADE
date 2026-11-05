"""Turn Christopher's 38 Prisma 3D images into game-ready art in v2/src/prisma3d/art/.
Run with: python3 -I process_art.py <input dir> <output dir>
Every output is WebP. Tiling textures get their seams fixed; the sign sheets are cut into single signs and
packed into one atlas; the skylines get a silhouette mask so the buildings block the sky behind them."""
import sys, os, glob, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FILES = {os.path.basename(p)[:2]: p for p in glob.glob(os.path.join(SRC, '*', '*.png'))}
assert len(FILES) == 38, sorted(FILES)
def load(n, mode='RGB'): return Image.open(FILES[n]).convert(mode)
def arr(im): return np.asarray(im).astype(np.float32) / 255
def img(a, mode=None):
    a = np.clip(a * 255 + .5, 0, 255).astype(np.uint8)
    return Image.fromarray(a, mode) if mode else Image.fromarray(a)
REPORT = []
def save(im, name, q=82):
    p = os.path.join(OUT, name + '.webp'); im.save(p, 'WEBP', quality=q, method=6)
    REPORT.append((name, im.size, os.path.getsize(p)))

def seam_crop(a, axis, m, min_frac=.8, probe=4):
    """Find where the image repeats itself: the place e whose next few columns (or rows) match the first few.
    Leaves room for an m-wide blend band taken from just past e."""
    n = a.shape[axis]; best = (1e9, n - m)
    start = np.take(a, range(0, probe), axis=axis)
    for e in range(int(n * min_frac), n - m - probe):
        d = np.abs(np.take(a, range(e, e + probe), axis=axis) - start).mean()
        if d < best[0]: best = (d, e)
    return best[1]
def make_seamless(a, wrapx=True, wrapy=True, m=28, crop=True):
    """Crop at the natural repeat point e, then fade the first m columns in from the picture just past e,
    so the last column runs straight into the first one when the texture repeats."""
    for ax, on in ((1, wrapx), (0, wrapy)):
        if not on: continue
        n = a.shape[ax]
        e = seam_crop(a, ax, m) if crop else n - m
        t = np.linspace(0, 1, m); t = t[None, :, None] if ax == 1 else t[:, None, None]
        head = np.take(a, range(0, m), axis=ax); past = np.take(a, range(e, e + m), axis=ax)
        body = np.take(a, range(0, e), axis=ax).copy()
        if ax == 1: body[:, :m] = past * (1 - t) + head * t
        else: body[:m] = past * (1 - t) + head * t
        a = body
    return a

# ---------- 1-4 skies, 5 moon ----------
for i, n in enumerate(['01', '02', '03', '04']):
    save(load(n).resize((1792, 896), Image.LANCZOS), f'sky{i}', 80)
m = arr(load('05')); L = m.max(2); ys, xs = np.where(L > .06)
c = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
moon = img(c).resize((512, 512), Image.LANCZOS); save(moon, 'moon', 85)

# ---------- 6-8 skylines: crop to the buildings, mask everything below the roofline ----------
for i, n in enumerate(['06', '07', '08']):
    a = arr(load(n)); L = a.max(2); H, W = L.shape
    on = L > .05
    top = np.full(W, H)
    for x in range(W):
        ys = np.where(on[:, x])[0]
        if len(ys): top[x] = ys.min()
    top = nd.median_filter(top, 9).astype(float)
    ymin = int(max(0, np.percentile(top, 1) - 4)); rows = np.where(on.any(1))[0]; ymax = int(rows.max()) + 1
    a = a[ymin:ymax]; top -= ymin; Hc = a.shape[0]
    yy = np.arange(Hc)[:, None]
    alpha = np.clip((yy - top[None, :] + 2) / 4, 0, 1)
    # the skyway's sea of lights fades out toward the top instead of having a hard roofline
    if n == '08': alpha = np.clip(alpha * np.clip(yy / (Hc * .5), 0, 1) ** .6 + (a.max(2) > .08) * .0, 0, 1)
    rgba = np.dstack([a, alpha])
    im = img(rgba, 'RGBA'); w2 = 2048; h2 = max(64, int(round(Hc * w2 / W / 8) * 8)); im = im.resize((w2, h2), Image.LANCZOS)
    save(im, f'skyline{i}', 82)

# ---------- 9-12 building fronts, a texture array: office, glass, brick, market (upper floors) ----------
fac = []
for n in ['09', '10', '11']:
    a = make_seamless(arr(load(n)))
    fac.append(img(a).resize((1024, 1024), Image.LANCZOS))
a = arr(load('12')); a = a[:int(a.shape[0] * .45)]
a = make_seamless(a, True, True, crop=True)
fac.append(img(a).resize((1024, 1024), Image.LANCZOS))
for i, im in enumerate(fac): save(im, f'fac{i}', 80)

# ---------- 13-14 street-level strips: shops downtown, stalls in the market ----------
for i, n in enumerate(['13', '14']):
    a = make_seamless(arr(load(n)), True, False)
    save(img(a).resize((2048, 640), Image.LANCZOS), f'shop{i}', 80)

# ---------- 15, 16, 29, 30, 31, 32: surfaces (texture array) ----------
surf = []
for n in ['15', '16', '29', '30', '31']:
    a = make_seamless(arr(load(n)))
    surf.append(img(a).resize((1024, 1024), Image.LANCZOS))
a = arr(load('32')); L = a.max(2); ys, xs = np.where(L > .08); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
a = make_seamless(a, True, False, crop=False)
surf.append(img(a).resize((1024, 1024), Image.LANCZOS))
for i, im in enumerate(surf): save(im, f'surf{i}', 78)

# ---------- 17-22: cut every sign out and pack them into one atlas ----------
cats = [('17', 'blade_downtown'), ('18', 'blade_market'), ('19', 'shop_downtown'), ('20', 'shop_market'), ('21', 'gantry'), ('22', 'tunnel')]
pieces = []
for n, cat in cats:
    a = arr(load(n)); L = a.max(2)
    mk = nd.binary_fill_holes(nd.binary_closing(L > .13, iterations=4)); lab, k = nd.label(mk)
    boxes = []
    for s in nd.find_objects(lab):
        x0, y0, w, h = s[1].start, s[0].start, s[1].stop - s[1].start, s[0].stop - s[0].start
        if w * h > a.shape[0] * a.shape[1] * .004: boxes.append((x0, y0, w, h))
    boxes.sort(key=lambda b: (b[1] // 120, b[0]))
    for b in boxes:
        x0, y0, w, h = b; p = 10
        x0 = max(0, x0 - p); y0 = max(0, y0 - p); x1 = min(a.shape[1], b[0] + w + p); y1 = min(a.shape[0], b[1] + h + p)
        c = a[y0:y1, x0:x1]
        w8 = (c.max(2) > .2)[..., None] * c
        col = (w8.reshape(-1, 3).sum(0) / max(1, (c.max(2) > .2).sum())).tolist()
        pieces.append({'cat': cat, 'img': img(c), 'col': [round(v, 3) for v in col]})
# shelf-pack at the largest scale that fits 2048 x 2048
def pack(scale):
    W = 2048; x = y = rowh = 0; out = []
    for pc in pieces:
        w, h = int(pc['img'].width * scale), int(pc['img'].height * scale)
        if x + w > W: x = 0; y += rowh + 4; rowh = 0
        out.append((x, y, w, h)); x += w + 4; rowh = max(rowh, h)
    return out, y + rowh
scale = 1.0
while True:
    rects, used = pack(scale)
    if used <= 2048: break
    scale -= .02
atlas = Image.new('RGB', (2048, 2048), (0, 0, 0))
meta = []
for pc, (x, y, w, h) in zip(pieces, rects):
    atlas.paste(pc['img'].resize((w, h), Image.LANCZOS), (x, y))
    meta.append({'cat': pc['cat'], 'r': [x / 2048, y / 2048, w / 2048, h / 2048], 'asp': round(w / h, 4), 'col': pc['col']})
save(atlas, 'signs', 84)
json.dump({'scale': round(scale, 3), 'signs': meta}, open(os.path.join(OUT, 'signs.json'), 'w'))

# ---------- 23-28 billboards (texture array) ----------
for i, n in enumerate(['23', '24', '25', '26', '27', '28']):
    save(load(n).resize((1024, 576), Image.LANCZOS), f'ad{i}', 80)

# ---------- 37 decals, 38 livery ----------
save(load('37').resize((1024, 1024), Image.LANCZOS), 'decals', 86)
save(load('38').resize((2048, 683), Image.LANCZOS), 'livery', 84)

tot = 0
for nme, sz, b in REPORT: tot += b; print(f'{nme:10s} {sz[0]}x{sz[1]}  {b / 1024:.0f} KB')
print('signs packed at scale', scale, 'count', len(meta), '| total', round(tot / 1e6, 2), 'MB')
