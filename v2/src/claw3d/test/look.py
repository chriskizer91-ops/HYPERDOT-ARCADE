#!/usr/bin/env python3
"""Plush Panic 3D, the three machines in headless Chrome: the picker on each machine, then a credit on each.

  python3 test/look.py OUTDIR [laptop|phone|landscape ...]      (env PLAY=0 skips the credits)

Writes OUTDIR/<size>_<machine>_<step>.png and prints boot time, triangles, draw calls and any console errors.
"""
import asyncio, os, subprocess, sys, tempfile, threading, functools, http.server, time
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claw3d-look'; os.makedirs(OUT, exist_ok=True)
DEV = tempfile.mkdtemp()
subprocess.run([sys.executable, os.path.join(SRC, 'build.py'), '--dev', os.path.join(DEV, 'claw3d.html')], check=True, stdout=subprocess.DEVNULL)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=DEV)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/claw3d.html' % srv.server_address[1]
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
SIZES = sys.argv[2:] or ['laptop', 'phone']
PLAY = os.environ.get('PLAY', '1') != '0'
ONLY = os.environ.get('ONLY', 'sugar,wild,titan').split(',')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        for tag in SIZES:
            vp, mob = ((1280, 720), False) if tag == 'laptop' else ((412, 915), True) if tag == 'phone' else ((915, 412), True)
            ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2.625 if mob else 1, is_mobile=mob, has_touch=mob)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
            pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
            t0 = time.time(); await pg.goto(URL)
            await pg.wait_for_function('window.__game&&__game.S.mode==="title"&&document.getElementById("ld").hidden', timeout=300000)
            print(tag, 'boot to title %.1f s (software graphics)' % (time.time() - t0))
            for mid in ONLY:
                await pg.evaluate(f'__game.switchMachine("{mid}");__game.ff(1.5);__game.camSnap()')
                await pg.wait_for_timeout(700)
                await pg.screenshot(path=f'{OUT}/{tag}_{mid}_1_pick.png')
                info = await pg.evaluate('({m:__game.mc(),tris:__game.tris(),calls:__game.calls(),bodies:__game.BOD.length,asleep:__game.asleep()})')
                print(' ', tag, 'picker', info)
            if PLAY:
                for mid in ONLY:
                    await pg.evaluate(f'__game.switchMachine("{mid}");__game.ff(.5);__game.start();__game.ffUntil(()=>__game.M.ph==="aimX",12);__game.camSnap()')
                    await pg.wait_for_timeout(700); await pg.screenshot(path=f'{OUT}/{tag}_{mid}_2_aim.png')
                    info = await pg.evaluate('({tris:__game.tris(),calls:__game.calls()})'); print(' ', tag, mid, 'aim', info)
                    await pg.evaluate('''(()=>{const g=__game,t=g.pickTarget();g.GT.tx=t.cx;g.ffUntil(()=>Math.abs(g.CL.gx-t.cx)<.01,8);g.M.lockPend=1;g.ff(.15);
                      g.GT.tz=t.cz;g.ff(1);})()''')
                    await pg.evaluate('__game.camSnap()'); await pg.wait_for_timeout(700); await pg.screenshot(path=f'{OUT}/{tag}_{mid}_3_depth.png')
                    await pg.evaluate('''(()=>{const g=__game;g.M.lockPend=1;g.ffUntil(()=>g.M.ph==="grab",10);g.ff(.6);})()''')
                    await pg.evaluate('__game.camSnap()'); await pg.wait_for_timeout(700); await pg.screenshot(path=f'{OUT}/{tag}_{mid}_4_grab.png')
                    await pg.evaluate('''(()=>{const g=__game;g.ffUntil(()=>g.M.ph==="carry",10);g.ff(.8);})()''')
                    await pg.evaluate('__game.camSnap()'); await pg.wait_for_timeout(700); await pg.screenshot(path=f'{OUT}/{tag}_{mid}_5_carry.png')
                    await pg.evaluate('''(()=>{const g=__game;g.ffUntil(()=>g.M.ph==="result",12);g.ff(.4);})()''')
                    await pg.evaluate('__game.camSnap()'); await pg.wait_for_timeout(700); await pg.screenshot(path=f'{OUT}/{tag}_{mid}_6_result.png')
                    r = await pg.evaluate('({wins:__game.M.wins.map(b=>b.T.id),strength:__game.M.S,tickets:__game.S.tickets})'); print(' ', tag, mid, 'result', r)
                    await pg.evaluate('__game.S.mode="over";__game.attract();__game.ff(.3)')
            perf = await pg.evaluate('__game.bench(30)'); print(' ', tag, 'ms per tick / per frame here', {k: round(v, 2) for k, v in perf.items()})
            print(' ', tag, 'console errors:', errs[:8] if errs else 'none')
            await ctx.close()
        await b.close()
asyncio.run(main())
