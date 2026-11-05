"""Pack the effect pictures into one 1024x512 sheet (4 x 2 tiles of 256 px) for the particle system.
Tiles: 0 explosion-1, 1 explosion-2, 2 muzzle-flash, 3 sparks, 4 steam. Run from v2/src/ironhowl3."""
import os
from PIL import Image
ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'games', 'ironhowl3', 'art')
sheet = Image.new('RGB', (1024, 512), (0, 0, 0))
for i, n in enumerate(['35-explosion-1', '36-explosion-2', '38-muzzle-flash', '39-sparks', '43-steam']):
    im = Image.open(os.path.join(ART, n + '.webp')).convert('RGB').resize((256, 256), Image.LANCZOS)
    sheet.paste(im, ((i % 4) * 256, (i // 4) * 256))
out = os.path.join(ART, 'fx-atlas.webp'); sheet.save(out, quality=88, method=6); print(out, os.path.getsize(out) // 1024, 'KB')
