#!/usr/bin/env python3
"""The win close-up on each machine: start a game, drop a plush into the chute, screenshot the close-up as it runs.
  python3 test/show.py OUTDIR [laptop|phone]"""
import asyncio, os, subprocess, sys, tempfile, threading, functools, http.server
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claw3d-show'; os.makedirs(OUT, exist_ok=True)
DEV = tempfile.mkdtemp(); subprocess.run([sys.executable, os.path.join(SRC, 'build.py'), '--dev', os.path.join(DEV, 'claw3d.html')], check=True, stdout=subprocess.DEVNULL)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=DEV)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/claw3d.html' % srv.server_address[1]
SIZES = sys.argv[2:] or ['phone']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for tag in SIZES:
            vp, mob = ((1280, 720), False) if tag == 'laptop' else ((412, 915), True)
            ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2.625 if mob else 1, is_mobile=mob, has_touch=mob)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e))); pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
            await pg.goto(URL); await pg.wait_for_function('window.__game&&__game.S.mode==="title"&&document.getElementById("ld").hidden', timeout=300000)
            for mid in os.environ.get('ONLY', 'sugar,wild,titan').split(','):
                await pg.evaluate(f'(()=>{{const g=__game;if(g.S.mode!=="title"){{g.S.mode="over";g.attract();}}g.switchMachine("{mid}");g.ff(.3);g.start();g.ffUntil(()=>g.M.ph==="aimX",14);}})()')
                await pg.evaluate('(()=>{const g=__game;g.GT.tx=g.CASE.x1-g.CS.edge;g.ff(3);})()')
                pid = await pg.evaluate('__game.dropIn()')
                await pg.evaluate('__game.ffUntil(()=>__game.SHOW.cur,6)')
                for t, name in [(.55, 'pop'), (1.2, 'rise'), (2.4, 'spin')]:
                    await pg.evaluate(f'(()=>{{const g=__game;g.ffUntil(()=>!g.SHOW.cur||g.SHOW.t>{t},6);g.camSnap();}})()')
                    await pg.wait_for_timeout(500); await pg.screenshot(path=f'{OUT}/{tag}_{mid}_show_{name}.png')
                st = await pg.evaluate('(()=>{const g=__game;g.ffUntil(()=>!g.SHOW.cur,8);g.ffUntil(()=>g.M.ph!=="result",8);return {ph:g.M.ph,tickets:g.S.tickets,credit:g.S.credit,prizes:g.S.prizes}})()')
                print(tag, mid, 'won', pid, '->', st)
            print(tag, 'console errors:', errs[:6] or 'none')
            await ctx.close()
        await b.close()
asyncio.run(main())
