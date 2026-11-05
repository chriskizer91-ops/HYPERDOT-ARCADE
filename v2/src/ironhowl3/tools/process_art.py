"""Turns the generated Ironhowl 3 images into game-ready files.

    python3 process_art.py INPUT_DIR

INPUT_DIR holds the original PNGs named NN-name.png (01..46).
Writes  ../art/masters/NN-name.webp      full size, near-lossless, kept so the art can be reprocessed later
        ../../../games/ironhowl3/art/...  game-ready: resized, tiling fixed where needed, alpha cut where needed
"""
import os, sys, glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MASTERS = os.path.join(HERE, '..', 'art', 'masters')
GAME = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'games', 'ironhowl3', 'art'))

# how each image is used. kind: tex (tiling surface), face (one face, not tiled), sky, strip (skyline cutout),
# add (glowing, black = transparent), alpha_black (cut out of black), alpha_white (dark mark cut out of white), grid4 (2x2 sheet)
SPEC = {
 1:('tex',1024,''),2:('tex',1024,'xy'),3:('tex',1024,''),4:('tex',1024,''),5:('tex',1024,'xy'),6:('tex',1024,''),7:('tex',1024,''),8:('tex',1024,''),
 9:('tex',1024,'y'),10:('tex',1024,'y'),11:('face',1024,''),12:('tex',1024,''),13:('tex',1024,'xy'),14:('tex',1024,'y'),15:('tex',1024,''),16:('face',1024,''),
 17:('tex',1024,'y'),18:('face',1024,'x'),19:('face',1024,'x'),20:('alpha_black',1024,''),21:('grid4',512,''),22:('tex',1024,'y'),23:('tex',1024,'y'),
 24:('tex',1024,''),25:('tex',1024,'x'),26:('face',1024,''),27:('tex',1024,'xy'),28:('alpha_black',1024,''),29:('alpha_black',512,''),
 30:('sky',2048,''),31:('sky',2048,''),32:('strip',2172,''),33:('strip',2172,''),34:('tex',512,'xy'),
 35:('add',512,''),36:('add',512,''),37:('add',512,''),38:('add',512,''),39:('add',512,''),40:('alpha_white',512,''),41:('alpha_white',512,''),
 42:('add',1024,''),43:('add',512,''),44:('add',1024,''),45:('add',1024,''),46:('face',1024,''),
 # set 2 (Nov 2026). ref = modelling guide, kept as a master only
 47:('ref',0,''),48:('ref',0,''),49:('ref',0,''),50:('ref',0,''),51:('ref',0,''),52:('ref',0,''),
 53:('tex',1024,'y'),54:('tex',1024,'xy'),55:('tex',1024,'xy'),56:('tex',1024,'xy'),57:('tex',1024,''),58:('tex',1024,'y'),59:('add',1024,''),
 60:('tex',1024,''),61:('tex',1024,''),62:('tex',1024,''),63:('tex',1024,''),64:('tex',1024,'y'),65:('tex',1024,''),66:('tex',1024,'y'),67:('tex',1024,''),
 68:('alpha_black',512,''),69:('sky',2048,''),70:('strip',2048,''),71:('face',1024,''),72:('face',1024,''),73:('tex',1024,'y'),74:('alpha_black',1024,''),
 75:('tex',1024,'x'),76:('face',1024,''),77:('face',1024,''),78:('face',1024,''),79:('tex',1024,''),80:('sky',2048,''),
 81:('tex',1024,''),82:('tex',1024,''),83:('tex',1024,''),84:('tex',1024,''),85:('row',256,''),86:('alpha_white_col',512,''),
}

def seamless(a, axes):
    """blend each problem axis with a half-offset copy so opposite edges meet"""
    a = a.astype(np.float32)
    for ax in axes:
        n = a.shape[0 if ax == 'y' else 1]
        b = np.roll(a, n // 2, axis=0 if ax == 'y' else 1)
        t = np.abs(np.linspace(-1, 1, n))            # 1 at the edges, 0 in the middle
        w = np.clip((t - .55) / .45, 0, 1); w = w * w * (3 - 2 * w)
        w = w[:, None, None] if ax == 'y' else w[None, :, None]
        a = a * (1 - w) + b * w
    return np.clip(a, 0, 255).astype(np.uint8)

def save(img, path, q=84, lossless=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=q, method=6, lossless=lossless)

def main(src):
    files = sorted(glob.glob(os.path.join(src, '*.png')))
    total = 0
    for f in files:
        base = os.path.basename(f).split('__')[-1]
        try: num = int(base[:2])
        except ValueError: continue
        name = base[:-4]
        if num not in SPEC: continue
        kind, size, fix = SPEC[num]
        im = Image.open(f).convert('RGB')
        save(im, os.path.join(MASTERS, name + '.webp'), q=92)
        if kind == 'ref': continue
        out = os.path.join(GAME, name + '.webp')
        if kind in ('tex', 'face'):
            a = np.asarray(im)
            if fix: a = seamless(a, fix)
            r = Image.fromarray(a)
            if max(r.size) > size: r.thumbnail((size, size), Image.LANCZOS)
            save(r, out, q=82)
        elif kind == 'sky':
            r = im.resize((size, size // 2), Image.LANCZOS); save(r, out, q=86)
        elif kind == 'strip':
            a = np.asarray(im).astype(np.float32); m = a.max(axis=2)
            rows = np.where(m.mean(axis=1) > 2)[0]; y0, y1 = max(0, rows.min() - 8), min(a.shape[0], rows.max() + 8)
            a = a[y0:y1]; m = m[y0:y1]
            alpha = np.clip((m - 3) / 10, 0, 1)                 # lit silhouettes against a pure black sky
            rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
            save(Image.fromarray(rgba, 'RGBA'), out, q=86)
        elif kind == 'add':
            r = im.copy(); r.thumbnail((size, size), Image.LANCZOS); save(r, out, q=82)
        elif kind == 'alpha_black':
            a = np.asarray(im).astype(np.float32); m = a.max(axis=2)
            alpha = np.clip((m - 8) / 40, 0, 1)
            col = np.clip(a / np.maximum(alpha[..., None], 1e-3), 0, 255)
            r = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA'); r.thumbnail((size, size), Image.LANCZOS); save(r, out, q=86)
        elif kind == 'alpha_white':
            a = np.asarray(im).astype(np.float32); l = a.mean(axis=2)
            alpha = np.clip((245 - l) / 200, 0, 1)
            col = np.clip(a * .55, 0, 255)
            r = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA'); r.thumbnail((size, size), Image.LANCZOS); save(r, out, q=86)
        elif kind == 'alpha_white_col':   # coloured cut-out on white (keeps its colour)
            a = np.asarray(im).astype(np.float32); l = a.min(axis=2)
            alpha = np.clip((242 - l) / 60, 0, 1)
            r = Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), 'RGBA'); r.thumbnail((size, size), Image.LANCZOS); save(r, out, q=86)
        elif kind == 'row':   # a row of icons on black: split at the dark gaps
            a = np.asarray(im).astype(np.float32); m = a.max(axis=2); colon = m.max(axis=0) > 40
            runs = []; i = 0
            while i < len(colon):
                if colon[i]:
                    j = i
                    while j < len(colon) and colon[j]: j += 1
                    if j - i > 20: runs.append((i, j))
                    i = j
                else: i += 1
            for k, (x0, x1) in enumerate(runs):
                c = a[:, x0:x1]; mm = c.max(axis=2); ys = np.where(mm.max(axis=1) > 40)[0]; c = c[ys.min():ys.max() + 1]; mm = c.max(axis=2)
                al = np.clip((mm - 8) / 50, 0, 1); col = np.clip(c / np.maximum(al[..., None], 1e-3), 0, 255)
                r = Image.fromarray(np.dstack([col, al * 255]).astype(np.uint8), 'RGBA'); r.thumbnail((size, size), Image.LANCZOS)
                pth = os.path.join(GAME, f'{name}-{k + 1}.webp'); save(r, pth, q=88); total += os.path.getsize(pth)
            print(name, 'icons', len(runs))
            continue
        elif kind == 'grid4':
            a = np.asarray(im).astype(np.float32); H, W = a.shape[:2]
            for i, (cy, cx) in enumerate([(0, 0), (0, 1), (1, 0), (1, 1)]):
                c = a[cy * H // 2:(cy + 1) * H // 2, cx * W // 2:(cx + 1) * W // 2]; m = c.max(axis=2)
                ys, xs = np.where(m > 30); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                r = Image.fromarray(c.astype(np.uint8)); r.thumbnail((size, size), Image.LANCZOS)
                p = os.path.join(GAME, f'{name}-{i + 1}.webp'); save(r, p, q=84); total += os.path.getsize(p)
            continue
        total += os.path.getsize(out)
    print('game-ready art:', round(total / 1e6, 2), 'MB')
    mt = sum(os.path.getsize(p) for p in glob.glob(os.path.join(MASTERS, '*.webp')))
    print('masters:', round(mt / 1e6, 2), 'MB')

if __name__ == '__main__':
    main(sys.argv[1])
