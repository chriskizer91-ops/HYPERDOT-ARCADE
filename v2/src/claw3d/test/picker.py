#!/usr/bin/env python3
"""The machine picker on a phone-sized screen (touch) and a laptop (keys): swipes of different lengths and speeds,
taps on the arrows, a tap on the machine (plays it), and the arrow keys. Prints which machine is in front after each."""
import asyncio, os, subprocess, sys, tempfile, threading, functools, http.server
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
DEV = tempfile.mkdtemp(); subprocess.run([sys.executable, os.path.join(SRC, 'build.py'), '--dev', os.path.join(DEV, 'claw3d.html')], check=True, stdout=subprocess.DEVNULL)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=DEV)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/claw3d.html' % srv.server_address[1]
JS = r'''
window.P={
  ev(type,x,y,el){const e=new PointerEvent(type,{pointerId:9,pointerType:'touch',clientX:x,clientY:y,bubbles:true,isPrimary:true});(el||(type==='pointerdown'?document.getElementById('gl'):window)).dispatchEvent(e);},
  step(){__game.tick(1/60);__game.endInput();},
  swipe(x0,x1,y,ms){const n=Math.max(1,Math.round(ms/1000*60));this.ev('pointerdown',x0,y);this.step();for(let k=1;k<=n;k++){this.ev('pointermove',x0+(x1-x0)*k/n,y+(k%2));this.step();}
    this.ev('pointerup',x1,y);this.step();this.step();return {m:__game.mc(),mode:__game.S.mode};},
  tap(x,y){this.ev('pointerdown',x,y);this.step();this.ev('pointerup',x,y);this.step();this.step();return {m:__game.mc(),mode:__game.S.mode};},
  arrow(id){const el=document.getElementById(id),r=el.getBoundingClientRect();this.ev('pointerdown',r.x+r.width/2,r.y+r.height/2,el);this.step();this.ev('pointerup',r.x+r.width/2,r.y+r.height/2,el);this.step();return {m:__game.mc(),mode:__game.S.mode};},
  key(code){window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));this.step();window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));this.step();this.step();return {m:__game.mc(),mode:__game.S.mode};},
  home(m){const g=__game;if(g.S.mode!=='title'){g.S.mode='over';g.attract();}g.switchMachine(m);g.ff(.8);return g.mc();}
};'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2.625, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_function('window.__game&&__game.S.mode==="title"&&document.getElementById("ld").hidden', timeout=240000)
        await pg.add_script_tag(content=JS)
        print('PHONE (412 x 915, touch). Start on Wildwood each time.')
        for (x0, x1, ms, what) in [(300, 100, 120, 'quick swipe left, 200 px'), (300, 100, 500, 'slow swipe left, 200 px'), (100, 320, 250, 'swipe right, 220 px'),
                                   (260, 200, 200, 'short swipe left, 60 px'), (240, 215, 150, 'tiny swipe, 25 px (too short: nothing)')]:
            await pg.evaluate('P.home("wild")'); r = await pg.evaluate(f'P.swipe({x0},{x1},420,{ms})')
            print(f'  {what:40s} -> {r["m"]:6s} ({r["mode"]})')
        await pg.evaluate('P.home("wild")')
        for id_ in ('pR', 'pR', 'pL', 'pL', 'pL'):
            r = await pg.evaluate(f'P.arrow("{id_}")'); print(f'  tap the {"right" if id_=="pR" else "left"} arrow{" ":28s} -> {r["m"]:6s} ({r["mode"]})')
        await pg.evaluate('P.home("titan")'); r = await pg.evaluate('P.tap(206,420)'); print(f'  tap on the machine{" ":23s} -> {r["m"]:6s} ({r["mode"]})')
        await ctx.close()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720}); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_function('window.__game&&__game.S.mode==="title"&&document.getElementById("ld").hidden', timeout=240000)
        await pg.add_script_tag(content=JS)
        print('LAPTOP (keys). Start on Wildwood.')
        await pg.evaluate('P.home("wild")')
        for k in ('ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Enter'):
            r = await pg.evaluate(f'P.key("{k}")'); print(f'  {k:12s} -> {r["m"]:6s} ({r["mode"]})')
        print('errors:', errs or 'none')
        await b.close()
asyncio.run(main())
