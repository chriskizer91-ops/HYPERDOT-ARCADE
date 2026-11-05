"""Make tiling normal maps (bumps) from the colour textures: brightness becomes height, the slope becomes the normal.
Run from v2/src/ironhowl3: python3 tools/make_normals.py   -> writes games/ironhowl3/art/<name>-n.webp (512 px, enough for surface detail)
STRENGTH says how deep each surface looks; 'inv' flips height for textures whose dark parts stick out (grout, seams)."""
import os, numpy as np
from PIL import Image, ImageFilter
ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'games', 'ironhowl3', 'art')
STRENGTH = {  # name: (strength, blur, invert)
    '22-howler-armour': (3.0, 1.0, 0), '23-grey-armour': (3.0, 1.0, 0), '24-gunmetal': (2.2, .8, 0), '25-brushed-steel': (1.4, .6, 0),
    '53-howler-armour-large-plates': (3.0, 1.0, 0), '54-forge-armour': (3.0, 1.0, 0), '57-rubber-and-cables': (3.5, 1.0, 0),
    '01-yard-concrete': (2.6, 1.2, 0), '02-wet-concrete': (2.4, 1.2, 0), '03-asphalt': (2.0, 1.0, 0), '06-dirt-and-gravel': (3.2, 1.0, 0),
    '07-harbor-paving': (3.0, 1.2, 0), '15-roof-gravel': (3.0, 1.0, 0), '60-meadow-ground': (2.6, 1.2, 0), '61-dry-prairie-ground': (3.0, 1.2, 0),
    '62-farm-track': (3.0, 1.2, 0), '63-ploughed-field': (3.4, 1.4, 0), '64-wheat-field': (2.4, 1.0, 0), '81-forest-floor': (3.2, 1.2, 0),
    '82-mossy-ground-with-roots': (3.2, 1.2, 0), '83-mossy-boulder-rock': (3.4, 1.4, 0), '09-blast-wall': (2.8, 1.2, 0),
    '10-corrugated-metal': (3.0, 1.0, 0), '12-rusted-steel-plate': (2.6, 1.0, 0), '17-concrete-barrier': (2.4, 1.2, 0),
    '04-steel-tread-plate': (3.4, .8, 0), '71-red-shipping-container-side': (3.0, 1.0, 0), '72-blue-shipping-container-side': (3.0, 1.0, 0),
}
for name, (k, blur, inv) in STRENGTH.items():
    src = os.path.join(ART, name + '.webp')
    if not os.path.exists(src): print('missing', name); continue
    im = Image.open(src).convert('L')
    w, h = im.size; im = im.resize((min(512, w), min(512, h)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
    H = np.asarray(im, dtype=np.float32) / 255.0
    if inv: H = 1 - H
    H = H - H.mean()
    dx = (np.roll(H, -1, 1) - np.roll(H, 1, 1)) * .5 * k * 8   # wraps around, so the result still tiles
    dy = (np.roll(H, -1, 0) - np.roll(H, 1, 0)) * .5 * k * 8
    n = np.stack([-dx, dy, np.ones_like(H)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    rgb = ((n * .5 + .5) * 255).clip(0, 255).astype(np.uint8)
    out = os.path.join(ART, name + '-n.webp'); Image.fromarray(rgb, 'RGB').save(out, quality=82, method=6)
    print(name, os.path.getsize(out) // 1024, 'KB')
