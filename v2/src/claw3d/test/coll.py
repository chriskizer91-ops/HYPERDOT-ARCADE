#!/usr/bin/env python3
"""The collection: some prizes already won (one of them new), opened with the star button on a phone and the C key
on a laptop, then closed. Also the haul at game over, with pictures. python3 test/coll.py OUTDIR"""
import asyncio, os, subprocess, sys, tempfile, threading, functools, http.server, json
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claw3d-coll'; os.makedirs(OUT, exist_ok=True)
DEV = tempfile.mkdtemp(); subprocess.run([sys.executable, os.path.join(SRC, 'build.py'), '--dev', os.path.join(DEV, 'claw3d.html')], check=True, stdout=subprocess.DEVNULL)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=DEV)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/claw3d.html' % srv.server_address[1]
BOOK = {'mochi': {'n': 3, 'first': 1, 'machine': 'sugar'}, 'donut': {'n': 1, 'first': 1, 'machine': 'sugar'}, 'boba': {'n': 1, 'first': 1, 'machine': 'sugar', 'fresh': 1},
        'fox': {'n': 2, 'first': 1, 'machine': 'wild'}, 'hedgehog': {'n': 1, 'first': 1, 'machine': 'wild'}, 'whale': {'n': 1, 'first': 1, 'machine': 'titan', 'fresh': 1}}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for tag in ('phone', 'laptop'):
            vp, mob = ((1280, 720), False) if tag == 'laptop' else ((412, 915), True)
            ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2.625 if mob else 1, is_mobile=mob, has_touch=mob)
            await ctx.add_init_script(f"try{{localStorage.setItem('hd-claw3d-prizes',{json.dumps(json.dumps(BOOK))});}}catch(e){{}}")
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e))); pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
            await pg.goto(URL); await pg.wait_for_function('window.__game&&__game.S.mode==="title"&&document.getElementById("ld").hidden', timeout=300000)
            await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/{tag}_1_title.png')
            btn = await pg.evaluate('(()=>{const b=document.getElementById("cB"),r=b.getBoundingClientRect();return {text:b.textContent,fresh:b.classList.contains("fresh"),x:r.x,y:r.y,w:r.width,h:r.height,shown:getComputedStyle(b).display}})()')
            print(tag, 'collection button:', btn)
            if mob: await pg.tap('#cB')
            else: await pg.keyboard.press('KeyC'); await pg.evaluate('__game.ff(.05)')
            await pg.wait_for_timeout(600)
            st = await pg.evaluate('(()=>({open:!document.getElementById("coll").hidden,count:document.getElementById("cN").textContent,cells:document.querySelectorAll(".cell").length,got:document.querySelectorAll(".cell.got").length,fresh:[...document.querySelectorAll(".cell.new span")].map(e=>e.textContent),mode:__game.S.mode}))()')
            print(tag, 'opened:', st)
            await pg.screenshot(path=f'{OUT}/{tag}_2_collection.png')
            if mob: await pg.tap('#cX')
            else: await pg.keyboard.press('Escape'); await pg.evaluate('__game.ff(.05)')
            await pg.wait_for_timeout(300)
            st = await pg.evaluate('(()=>({open:!document.getElementById("coll").hidden,mode:__game.S.mode,paused:__game.S.paused,button:document.getElementById("cB").textContent,fresh:document.getElementById("cB").classList.contains("fresh")}))()')
            print(tag, 'closed:', st)
            # a short game with a win, to the haul
            await pg.evaluate('(()=>{const g=__game;g.switchMachine("wild");g.ff(.3);g.start();g.ffUntil(()=>g.M.ph==="aimX",14);g.GT.tx=g.CASE.x1-g.CS.edge;g.ff(3);g.dropIn();g.ffUntil(()=>g.SHOW.cur,6);g.ffUntil(()=>!g.SHOW.cur,8);g.S.credit=g.MACHINES.wild.credits;g.M.lockPend=2;g.ffUntil(()=>g.S.mode==="over",40);g.ff(4);g.camSnap();})()')
            await pg.wait_for_timeout(600); await pg.screenshot(path=f'{OUT}/{tag}_3_haul.png')
            print(tag, 'haul:', await pg.evaluate('({mode:__game.S.mode,prizes:__game.S.prizes,tickets:__game.S.tickets})'))
            print(tag, 'console errors:', errs[:6] or 'none')
            await ctx.close()
        await b.close()
asyncio.run(main())
