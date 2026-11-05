"""Prepare the image list's pictures for Studio:  python3 prep_images.py FOLDER

FOLDER holds the pictures as they came from the generator, named starting with their
number (e.g. "1.1-Cobblestones.png"). Writes game-ready copies to img/ here, which
build.py embeds:
  1.1-4.8  surfaces        512 x 512 JPEG
  5.1 5.3  night and dawn  2048 x 1024 JPEG, made to wrap round left to right
  5.2      the moon        512 x 512 JPEG, cropped so the disc is 80% of the width
  5.4      the skyline     2048 wide greyscale PNG
  7.1-7.6  story cards     1280 x 720 JPEG
The model sheets (6.x) are blueprints and are not put in the game.
"""
import glob, os, re, sys
import numpy as np
from PIL import Image

src = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, 'img')
os.makedirs(out, exist_ok=True)


def wrap_x(im, band):
    """Cross-fade the right edge into the left, then drop the right band, so the picture wraps."""
    a = np.asarray(im, dtype=np.float32)
    w = a.shape[1]
    t = np.linspace(0, 1, band, dtype=np.float32)[None, :, None]
    left = a[:, :band] * t + a[:, w - band:] * (1 - t)
    return Image.fromarray(np.concatenate([left, a[:, band:w - band]], axis=1).clip(0, 255).astype(np.uint8))


files = {}
for f in glob.glob(os.path.join(src, '**', '*.*'), recursive=True):
    m = re.match(r'(\d\.\d)', os.path.basename(f))
    if m and f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        files[m.group(1)] = f
total = 0
for k in sorted(files):
    im = Image.open(files[k]).convert('RGB')
    g, n = k[0], None
    if g in '1234':
        n = k + '.jpg'
        im.resize((512, 512), Image.LANCZOS).save(os.path.join(out, n), quality=88)
    elif k in ('5.1', '5.3'):
        n = k + '.jpg'
        wrap_x(im, im.width // 14).resize((2048, 1024), Image.LANCZOS).save(os.path.join(out, n), quality=85)
    elif k == '5.2':
        a = np.asarray(im.convert('L'))
        ys, xs = np.nonzero(a > 40)
        cx, cy, r = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, (xs.max() - xs.min() + ys.max() - ys.min()) / 4
        h = r / .8
        n = k + '.jpg'
        im.crop((int(cx - h), int(cy - h), int(cx + h), int(cy + h))).resize((512, 512), Image.LANCZOS).save(os.path.join(out, n), quality=88)
    elif k == '5.4':
        n = k + '.png'
        s = im.convert('L').resize((2048, round(2048 * im.height / im.width)), Image.LANCZOS)
        s.point(lambda v: 0 if v < 128 else 255).save(os.path.join(out, n), optimize=True)
    elif g == '7':
        n = k + '.jpg'
        im.resize((1280, 720), Image.LANCZOS).save(os.path.join(out, n), quality=82)
    if n:
        sz = os.path.getsize(os.path.join(out, n))
        total += sz
        print(f'{k}  {os.path.basename(files[k])[:40]:40s} -> img/{n}  {sz // 1024} KB')
print(f'{total // 1024} KB in all ({total * 4 // 3 // 1024} KB once embedded)')
