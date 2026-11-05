#!/usr/bin/env python3
"""Touch test for Plush Panic 3D on a phone-sized screen (412 x 915, touch). Prints, for each try, where the finger
lifted and where the claw ended up, in centimetres.
  - drags at three speeds, both axes (left-right from the front, depth from the side)
  - taps (tap = go there and set)
  - holding GO for different times (how far the claw travels)
The game is stepped with its test hook at 60 ticks a second of game time, so the numbers are game-time numbers."""
import asyncio, os, subprocess, sys, tempfile, threading, functools, http.server
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
DEV = tempfile.mkdtemp(); subprocess.run([sys.executable, os.path.join(SRC, 'build.py'), '--dev', os.path.join(DEV, 'claw3d.html')], check=True, stdout=subprocess.DEVNULL)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=DEV)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/claw3d.html' % srv.server_address[1]
JS = r'''
window.T={
  ev(type,x,y){const e=new PointerEvent(type,{pointerId:7,pointerType:'touch',clientX:x,clientY:y,bubbles:true,isPrimary:true});(type==='pointerdown'?document.getElementById('gl'):window).dispatchEvent(e);},
  /* drag from (x0,y) to (x1,y) taking ms of game time, then lift; returns where the finger lifted (world) and where the claw is */
  drag(axis,x0,x1,y,ms){const g=__game;g.camSnap();const steps=Math.max(1,Math.round(ms/1000*60));this.ev('pointerdown',x0,y);g.tick(1/60);g.endInput();
    for(let k=1;k<=steps;k++){const x=x0+(x1-x0)*k/steps;this.ev('pointermove',x,y);g.tick(1/60);g.endInput();}
    const want=this.world(axis,x1,y);this.ev('pointerup',x1,y);g.tick(1/60);g.endInput();
    const ph0=g.M.ph;g.ffUntil(()=>g.M.ph!==ph0,4);const got=axis==='x'?g.M.xLock:g.CL.gz;return {want,got,locked:g.M.ph!==ph0};},
  tap(axis,x,y){const g=__game;g.camSnap();const want=this.world(axis,x,y);this.ev('pointerdown',x,y);g.tick(1/60);g.endInput();g.tick(1/60);g.endInput();this.ev('pointerup',x,y);g.tick(1/60);g.endInput();
    const ph0=g.M.ph;g.ffUntil(()=>g.M.ph!==ph0,5);return {want,got:axis==='x'?g.M.xLock:g.CL.gz};},
  hold(ms){const g=__game,x0=g.CL.gx;g.TS.A=true;g.TS.Ap=true;for(let k=0;k<Math.round(ms/1000*60);k++){g.tick(1/60);g.TS.Ap=false;}g.TS.A=false;g.tick(1/60);g.endInput();
    const ph0=g.M.ph;g.ffUntil(()=>g.M.ph!==ph0,3);return {from:x0,to:g.M.xLock};},
  world(axis,x,y){const C=__game.CASE,w=__game.screenToWorld(x,y,axis),lo=axis==='x'?C.x0+.07:C.z0+.07,hi=axis==='x'?C.x1-.07:C.z1-.07;return Math.min(hi,Math.max(lo,w));},
  newCredit(){const g=__game;g.setPause(false);g.S.mode='title';g.start();g.ffUntil(()=>g.M.ph==='aimX',12);g.camSnap();}
};'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2.625, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_function('window.__game&&__game.S.mode==="title"&&document.getElementById("ld").hidden', timeout=240000)
        await pg.add_script_tag(content=JS)
        cm = lambda v: '%+.1f' % (v * 100)
        print('DRAGS (finger lifts at a spot; the claw should stop under it)')
        for ms in (150, 400, 1000):
            await pg.evaluate('T.newCredit()')
            rx = await pg.evaluate(f'T.drag("x",90,300,520,{ms})')
            rz = await pg.evaluate(f'T.drag("z",300,140,520,{ms})')
            print(f'  {ms:4d} ms drag   left-right: finger {cm(rx["want"])} cm, claw {cm(rx["got"])} cm, off by {abs(rx["want"]-rx["got"])*100:.1f} cm, set: {rx["locked"]}'
                  f'   |  depth: finger {cm(rz["want"])} cm, claw {cm(rz["got"])} cm, off by {abs(rz["want"]-rz["got"])*100:.1f} cm')
        print('TAPS (tap = go there and set)')
        for x in (110, 206, 300):
            await pg.evaluate('T.newCredit()')
            r = await pg.evaluate(f'T.tap("x",{x},520)')
            print(f'  tap at {x:3d} px: aimed {cm(r["want"])} cm, claw set at {cm(r["got"])} cm, off by {abs(r["want"]-r["got"])*100:.1f} cm')
        print('HOLD GO (hold to travel right, let go to set)')
        for ms in (100, 300, 700, 1500):
            await pg.evaluate('T.newCredit()')
            r = await pg.evaluate(f'T.hold({ms})')
            print(f'  held {ms:4d} ms: claw moved {abs(r["to"]-r["from"])*100:5.1f} cm and set')
        print('errors:', errs or 'none')
        await b.close()
asyncio.run(main())
