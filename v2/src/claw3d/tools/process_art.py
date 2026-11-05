#!/usr/bin/env python3
"""Plush Panic 3D: turn Christopher's 67 generated images into game-ready art.

  python3 process_art.py RAW_DIR

RAW_DIR holds the original PNGs (01a_Mochi_Turnaround.png ... 43_Cover_Art.png).
Writes into ../art (shipped in the game) and ../ref (modelling references, not shipped):

  art/plush/<id>_front.webp  cut-out front view (from the b image)
  art/plush/<id>_side.webp   cut-out left side view (from the a sheet)
  art/plush/<id>_back.webp   cut-out back view (the c image for the giants, the a sheet for the rest)
  art/machine/<m>_marquee.webp, <m>_wall.webp, <m>_side.webp
  art/fabric/<name>.webp     512 px, lighting flattened, made seamless
  art/extra/reflect.webp, cover.webp
  ref/*.jpg                  the machines, the claws and the full sheets, small, for modelling
  art/plush/meta.json        per view: size in pixels and where the toy's feet sit

Needs: pip install rembg onnxruntime (the isnet-general-use model in ~/.u2net).
"""
import os, sys, json, glob
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

RAW = sys.argv[1]
ONLY = sys.argv[2:]        # optional: only these plush ids (and skip the machine art)
HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.normpath(os.path.join(HERE, '..', 'art'))
REF = os.path.normpath(os.path.join(HERE, '..', 'ref'))
for d in ['plush', 'machine', 'fabric', 'extra']:
    os.makedirs(os.path.join(ART, d), exist_ok=True)
os.makedirs(REF, exist_ok=True)

PLUSH = [  # number, id, machine, keychain?
    (1, 'mochi', 'sugar', 1), (2, 'berry', 'sugar', 1), (3, 'toast', 'sugar', 1), (4, 'onigiri', 'sugar', 1),
    (5, 'pudding', 'sugar', 1), (6, 'boba', 'sugar', 1), (7, 'cupcake', 'sugar', 1), (8, 'donut', 'sugar', 1),
    (9, 'frog', 'wild', 0), (10, 'hedgehog', 'wild', 0), (11, 'toadstool', 'wild', 0), (12, 'fox', 'wild', 0),
    (13, 'redpanda', 'wild', 0), (14, 'owl', 'wild', 0), (15, 'moth', 'wild', 0), (16, 'hare', 'wild', 0),
    (17, 'whale', 'titan', 0), (18, 'dino', 'titan', 0), (19, 'sloth', 'titan', 0), (20, 'dragon', 'titan', 0)]
FRONT_MAX = {'sugar': 768, 'wild': 768, 'titan': 1024}
VIEW_MAX = {'sugar': 512, 'wild': 512, 'titan': 768}

def raw(prefix):
    m = sorted(glob.glob(os.path.join(RAW, prefix + '_*.png')))
    assert m, 'missing ' + prefix
    return m[0]

_session = None
def matte(im):
    """Cut a toy out of its flat grey background: RGBA with a soft alpha edge for fur."""
    global _session
    from rembg import remove, new_session
    if _session is None:
        _session = new_session('isnet-general-use')
    out = remove(im.convert('RGB'), session=_session, alpha_matting=True, alpha_matting_foreground_threshold=240,
                 alpha_matting_background_threshold=15, alpha_matting_erode_size=8)
    a = np.asarray(out).astype(np.float32)
    src = np.asarray(im.convert('RGB')).astype(np.float32)
    bg = np.median(np.concatenate([src[:8].reshape(-1, 3), src[:, :8].reshape(-1, 3), src[:, -8:].reshape(-1, 3)]), axis=0)
    # the cut-out tool sometimes drops pale parts inside the outline (the dragon's gold belly). Anything enclosed
    # by the outline that is not background grey is the toy; real holes (the donut's) are grey and stay open.
    r = max(6, int(.1 * im.height))
    sil0 = np.pad(a[..., 3] > 128, r)
    grown = ndimage.distance_transform_edt(~sil0) <= r                       # a fast closing: grow by r...
    closed = (ndimage.distance_transform_edt(grown) > r)[r:-r, r:-r]           # ...then shrink by r
    sil = ndimage.binary_fill_holes(closed | sil0[r:-r, r:-r])
    dist = np.sqrt(((src - bg) ** 2).sum(-1))
    chroma = src.max(-1) - src.min(-1)
    shadowy = (chroma < 18) & (src.mean(-1) < bg.mean() + 4)       # floor shadows: grey and darker than the backdrop
    col_a = np.clip((dist - 16) / 22, 0, 1) * 255 * ~shadowy
    a[..., 3] = np.where(sil, np.maximum(a[..., 3], col_a), a[..., 3])
    a[..., :3] = np.where((sil & (col_a > a[..., 3] - 1))[..., None], src, a[..., :3])
    # take the grey out of half-transparent edge pixels (un-premultiply against the background colour)
    rgb, al = a[..., :3], a[..., 3:] / 255.0
    k = np.clip(al, 0.05, 1)
    rgb = np.where(al > 0.02, np.clip((rgb - bg * (1 - k)) / k, 0, 255), rgb)
    return Image.fromarray(np.concatenate([rgb, al * 255], -1).astype(np.uint8), 'RGBA')

def alpha_of(im):
    return np.asarray(im)[..., 3].astype(np.float32) / 255.0

def keep_main(im, min_frac=0.002):
    """Drop stray specks: keep alpha components bigger than min_frac of the image."""
    a = alpha_of(im)
    lab, n = ndimage.label(a > 0.3)
    if n <= 1:
        return im
    sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= min_frac * a.size])
    keep = ndimage.binary_dilation(keep, iterations=6)
    arr = np.asarray(im).copy()
    arr[..., 3] = (arr[..., 3] * keep).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')

def cut_keychain(im):
    """Keychain plush: the ring, ball chain and loop become real 3D metal in the game, so cut them off the picture.
    Scanning down from the top, the metal is a run of rows where the toy is very narrow; the body starts where
    the coverage jumps up and stays up. Returns the cropped image and how many rows were cut."""
    a = alpha_of(im)
    rows = (a > 0.5).sum(1)
    mx = rows.max()
    top = int(np.argmax(rows > 0))
    limit = top + int(0.55 * (len(rows) - top))
    cut = top
    for y in range(top, limit):
        if rows[y] < 0.14 * mx:
            cut = y
    # body starts a little below the last narrow row; leave a couple of rows so the top stays round
    cut = max(top, cut - 2)
    arr = np.asarray(im).copy()
    arr[:cut + 1, :, 3] = 0
    return Image.fromarray(arr, 'RGBA'), cut - top

def crop_alpha(im, pad=6):
    a = alpha_of(im)
    ys, xs = np.where(a > 0.04)
    x0, x1, y0, y1 = max(0, xs.min() - pad), min(im.width, xs.max() + pad + 1), max(0, ys.min() - pad), min(im.height, ys.max() + pad + 1)
    return im.crop((x0, y0, x1, y1))

def fit(im, mx):
    s = min(1.0, mx / max(im.size))
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS) if s < 1 else im

def split_sheet(im):
    """A turnaround sheet holds three toys side by side: split at the two widest empty column gaps."""
    a = alpha_of(im)
    occ = (a > 0.3).sum(0) > 2
    gaps, x = [], 0
    W = len(occ)
    while x < W:
        if not occ[x]:
            s = x
            while x < W and not occ[x]:
                x += 1
            if s > 0 and x < W:
                gaps.append((x - s, s, x))
        else:
            x += 1
    gaps.sort(reverse=True)
    if len(gaps) >= 2:
        cuts = sorted([(g[1] + g[2]) // 2 for g in gaps[:2]])
    else:
        # the views touch (the whale's flippers): cut at the thinnest columns near a third and two thirds across
        col = ndimage.uniform_filter1d((a > 0.3).sum(0).astype(np.float32), 9)
        cuts = [int(lo * W) + int(np.argmin(col[int(lo * W):int(hi * W)])) for lo, hi in [(.22, .45), (.55, .78)]]
    edges = [0] + cuts + [W]
    return [im.crop((edges[i], 0, edges[i + 1], im.height)) for i in range(3)]

def save_webp(im, path, q=84):
    im.save(path, 'WEBP', quality=q, method=6)
    return os.path.getsize(path)

def foot_info(im):
    a = alpha_of(im)
    ys, xs = np.where(a > 0.5)
    return {'w': im.width, 'h': im.height, 'cx': round(float(xs.mean()) / im.width, 4)}

meta = {}
total = 0
for num, pid, mach, key in PLUSH:
    if ONLY and pid not in ONLY:
        continue
    n = '%02d' % num
    sheet = Image.open(raw(n + 'a'))
    fr_src = Image.open(raw(n + 'b'))
    m_sheet = matte(sheet)
    v_front, v_side, v_back = [keep_main(v) for v in split_sheet(m_sheet)]
    v_frontb = keep_main(matte(fr_src))
    v_backc = keep_main(matte(Image.open(raw(n + 'c')))) if mach == 'titan' else None
    cuts = {}
    if key:
        v_frontb, cuts['front'] = cut_keychain(v_frontb)
        v_side, cuts['side'] = cut_keychain(v_side)
        v_back, cuts['back'] = cut_keychain(v_back)
        v_front, cuts['sheetfront'] = cut_keychain(v_front)
    views = {'front': fit(crop_alpha(v_frontb), FRONT_MAX[mach]), 'side': fit(crop_alpha(v_side), VIEW_MAX[mach]),
             'back': fit(crop_alpha(v_backc if v_backc is not None else v_back), FRONT_MAX[mach] if v_backc is not None else VIEW_MAX[mach])}
    meta[pid] = {'num': num, 'machine': mach, 'keychain': key}
    for k, v in views.items():
        total += save_webp(v, os.path.join(ART, 'plush', '%s_%s.webp' % (pid, k)))
        meta[pid][k] = foot_info(v)
    # the sheet's own front view, for checking proportions against the side and back (same scale on the sheet)
    sf = crop_alpha(v_front)
    meta[pid]['sheet'] = {'front_h': sf.height, 'side_h': crop_alpha(v_side).height, 'back_h': crop_alpha(v_back).height,
                          'front_w': sf.width, 'side_w': crop_alpha(v_side).width, 'back_w': crop_alpha(v_back).width}
    sheet.convert('RGB').resize((1024, round(1024 * sheet.height / sheet.width)), Image.LANCZOS).save(os.path.join(REF, '%s_sheet.jpg' % pid), quality=80)
    print('%-10s %s' % (pid, {k: v.size for k, v in views.items()}), 'cut', cuts or '')
mp = os.path.join(ART, 'plush', 'meta.json')
if ONLY and os.path.exists(mp):
    old = json.load(open(mp)); old.update(meta); meta = old
json.dump(meta, open(mp, 'w'), indent=1)
if ONLY:
    sys.exit(0)

# ---- machine art: marquee, back wall, side art (Titan's arched marquee is cut out of its white corners) ----
MACH = {'sugar': (21, 22, 23, 24), 'wild': (25, 26, 27, 28), 'titan': (29, 30, 31, 32)}
for m, (cab, mq, wall, side) in MACH.items():
    Image.open(raw('%02d' % cab)).convert('RGB').resize((768, 1152), Image.LANCZOS).save(os.path.join(REF, m + '_machine.jpg'), quality=82)
    im = Image.open(raw('%02d' % mq)).convert('RGBA')
    if m == 'titan':
        im = keep_main(matte(im))
        im = crop_alpha(im, 0)
    total += save_webp(fit(im, 1280), os.path.join(ART, 'machine', m + '_marquee.webp'))
    total += save_webp(fit(Image.open(raw('%02d' % wall)).convert('RGB'), 1280), os.path.join(ART, 'machine', m + '_wall.webp'), 82)
    total += save_webp(fit(Image.open(raw('%02d' % side)).convert('RGB'), 1024), os.path.join(ART, 'machine', m + '_side.webp'), 80)
for n, m in [(33, 'sugar'), (34, 'wild'), (35, 'titan')]:
    im = Image.open(raw('%02d' % n)).convert('RGB')
    im.resize((1024, round(1024 * im.height / im.width)), Image.LANCZOS).save(os.path.join(REF, m + '_claw.jpg'), quality=85)

# ---- fabrics: flatten the lighting, make them repeat without a seam, 512 px ----
def seamless(a):
    H, W = a.shape[:2]
    low = ndimage.gaussian_filter(a, (H / 10, W / 10, 0))
    a = a / np.maximum(low, 1) * low.mean((0, 1))          # even out light falloff and vignetting
    b = np.roll(np.roll(a, H // 2, 0), W // 2, 1)          # a copy with its seams in the middle
    yy, xx = np.mgrid[0:H, 0:W]
    ex = np.minimum(xx, W - 1 - xx) / (W / 2)
    ey = np.minimum(yy, H - 1 - yy) / (H / 2)
    w = np.clip(np.minimum(ex, ey) * 2.2, 0, 1)
    w = (w * w * (3 - 2 * w))[..., None]                   # 0 at the edges (take the shifted copy), 1 in the middle
    mu = a.mean((0, 1))
    out = mu + ((a - mu) * w + (b - mu) * (1 - w)) / np.sqrt(w * w + (1 - w) ** 2)   # keep the fibre contrast in the blend
    return np.clip(out, 0, 255)
FAB = {36: 'minky', 37: 'longfur', 38: 'sherpa', 39: 'felt', 40: 'velvet', 41: 'satin'}
for n, name in FAB.items():
    a = np.asarray(Image.open(raw('%02d' % n)).convert('RGB')).astype(np.float32)
    im = Image.fromarray(seamless(a).astype(np.uint8)).resize((512, 512), Image.LANCZOS)
    total += save_webp(im, os.path.join(ART, 'fabric', name + '.webp'), 80)

# ---- extras: the arcade behind you (for reflections, softened) and the cover ----
im = Image.open(raw('42')).convert('RGB').filter(ImageFilter.GaussianBlur(3))
total += save_webp(fit(im, 1024), os.path.join(ART, 'extra', 'reflect.webp'), 78)
total += save_webp(fit(Image.open(raw('43')).convert('RGB'), 1280), os.path.join(ART, 'extra', 'cover.webp'), 84)
print('art total %.2f MB' % (total / 1e6))
