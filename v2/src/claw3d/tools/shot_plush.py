#!/usr/bin/env python3
"""Render plush from four sides (front, three-quarter, side, back) into one contact sheet.

  python3 shot_plush.py OUT.jpg id [id ...]

Serves the repo itself, opens tools/preview.html in headless Chrome (software WebGL) and grabs each pose.
"""
import asyncio, os, sys, io, threading, functools, http.server
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
OUT, IDS = sys.argv[1], [a for a in sys.argv[2:] if not a.startswith('--')]
PITCH = next((int(a[8:]) for a in sys.argv if a.startswith('--pitch=')), 8)
EXTRA = ('&plain=1' if '--plain' in sys.argv else '') + ('&noself=1' if '--noself' in sys.argv else '')
YAWS = [int(v) for v in next((a[7:] for a in sys.argv if a.startswith('--yaws=')), '0,35,90,180').split(',')]
COLS = next((int(a[7:]) for a in sys.argv if a.startswith('--grid=')), 0)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=REPO))
threading.Thread(target=srv.serve_forever, daemon=True).start()
PORT = srv.server_address[1]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
                                    args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 360, 'height': 400}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('http://127.0.0.1:%d/v2/src/claw3d/tools/preview.html?id=%s%s' % (PORT, IDS[0], EXTRA))
        await pg.wait_for_function('document.title==="ready"', timeout=60000)
        await pg.wait_for_timeout(800)
        tiles = []
        for pid in IDS:
            row = []
            for y in YAWS:
                await pg.evaluate('([i,y,p])=>shot(i,y,p)', [pid, y, PITCH])
                row.append(Image.open(io.BytesIO(await pg.screenshot())).convert('RGB'))
            tiles.append((pid, row))
        await b.close()
        if errs: print('errors:', errs[:5])
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
    W, H = 360, 400
    if COLS:   # one picture per toy, in a grid
        rows = (len(tiles) + COLS - 1) // COLS
        S = Image.new('RGB', (COLS * W, rows * (H + 26)), (12, 8, 18)); d = ImageDraw.Draw(S)
        for i, (pid, row) in enumerate(tiles):
            x, y = (i % COLS) * W, (i // COLS) * (H + 26)
            d.text((x + 6, y + 3), pid, fill=(255, 220, 120), font=f); S.paste(row[0], (x, y + 26))
        S.save(OUT, quality=88); print(OUT, S.size); return
    S = Image.new('RGB', (len(YAWS) * W, len(tiles) * (H + 26)), (12, 8, 18)); d = ImageDraw.Draw(S)
    for r, (pid, row) in enumerate(tiles):
        d.text((6, r * (H + 26) + 3), pid, fill=(255, 220, 120), font=f)
        for c, im in enumerate(row):
            S.paste(im, (c * W, r * (H + 26) + 26))
    S.save(OUT, quality=88); print(OUT, S.size)
asyncio.run(main())
