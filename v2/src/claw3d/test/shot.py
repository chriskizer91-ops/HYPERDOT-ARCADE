#!/usr/bin/env python3
"""Plush Panic 3D in headless Chrome: build a dev copy, screenshot it at laptop and phone sizes, play a credit.

  python3 v2/src/claw3d/test/shot.py [OUTDIR]

Software WebGL is slow, so the checks drive the game with the test hook (window.__game) instead of real time.
"""
import asyncio, os, subprocess, sys, tempfile, threading, functools, http.server, json
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claw3d-shots'; os.makedirs(OUT, exist_ok=True)
DEV = tempfile.mkdtemp()
subprocess.run([sys.executable, os.path.join(SRC, 'build.py'), '--dev', os.path.join(DEV, 'claw3d.html')], check=True, stdout=subprocess.DEVNULL)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=DEV)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/claw3d.html' % srv.server_address[1]
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
SIZES = [a for a in sys.argv[2:]] or ['laptop', 'phone']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        for tag in SIZES:
            vp, mob = ((1280, 720), False) if tag == 'laptop' else ((412, 915), True) if tag == 'phone' else ((915, 412), True)
            ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2.625 if mob else 1, is_mobile=mob, has_touch=mob)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
            pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
            await pg.goto(URL); await pg.wait_for_function('window.__game&&__game.S.mode==="title"&&document.getElementById("ld").hidden', timeout=240000)
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{OUT}/{tag}_1_title.png')
            info = await pg.evaluate('({tris:__game.tris(),calls:__game.calls(),asleep:__game.asleep(),bodies:__game.BOD.length})')
            print(tag, 'title', info)
            await pg.evaluate('__game.start();__game.ffUntil(()=>__game.M.ph==="aimX",12)')
            await pg.evaluate('__game.camSnap()'); await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/{tag}_2_aim.png')
            # aim at the plush the attract pilot would pick
            await pg.evaluate('''(()=>{const g=__game,t=g.pickTarget();g.GT.tx=t.cx;g.ffUntil(()=>Math.abs(g.CL.gx-t.cx)<.006,6);g.M.lockPend=1;g.ff(.1);
              g.GT.tz=t.cz;g.ff(.6);})()''')
            await pg.evaluate('__game.camSnap()'); await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/{tag}_3_depth.png')
            await pg.evaluate('''(()=>{const g=__game;g.ffUntil(()=>Math.abs(g.CL.gz-g.GT.tz)<.006,6);g.M.lockPend=1;g.ff(.1);g.ffUntil(()=>g.M.ph==="grab",8);g.ff(.7);})()''')
            await pg.evaluate('__game.camSnap()'); await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/{tag}_4_grab.png')
            await pg.evaluate('__game.ffUntil(()=>__game.M.ph==="carry",8);__game.ff(1.2)')
            await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/{tag}_5_carry.png')
            r = await pg.evaluate('__game.ffUntil(()=>__game.M.ph==="result",10);__game.ff(.4);({wins:__game.M.wins.length,tix:__game.S.tickets,S:__game.M.S})')
            await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/{tag}_6_result.png')
            print(tag, 'credit 1:', r, 'errors:', [e for e in errs if 'favicon' not in e][:6] or 'none')
            await ctx.close()
        await b.close()
asyncio.run(main())
