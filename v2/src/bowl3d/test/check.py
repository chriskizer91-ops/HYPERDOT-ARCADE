#!/usr/bin/env python3
"""Strike Night 3D: build a test copy, then check it in headless Chrome.

  python3 v2/src/bowl3d/test/check.py [OUTDIR]

Needs Python Playwright and Chrome. Writes screenshots to OUTDIR (default /tmp/bowl3d-check) and prints:
  - console errors on the published file
  - a whole game on autopilot: the score sheet, the tickets paid, the save keys used
  - the cabinet contract inside a test iframe: ready, pause/resume, mute/unmute, start, over, exit
The game runs at a few frames a second in a software renderer, so the checks drive it with the
test hook (window.__game, only in the test copy) instead of waiting in real time.
"""
import asyncio, json, os, subprocess, sys, tempfile, threading, functools, http.server
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
REPO = os.path.normpath(os.path.join(SRC, '..', '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bowl3d-check'
os.makedirs(OUT, exist_ok=True)
DEV = tempfile.mkdtemp()
subprocess.run([sys.executable, os.path.join(SRC, 'build.py'), '--dev', os.path.join(DEV, 'bowl3d.html')], check=True)
open(os.path.join(DEV, 'embed.html'), 'w').write('''<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>
<iframe id="f" src="bowl3d.html?embed=1"></iframe><script>window.MSGS=[];addEventListener('message',e=>{if(e.data&&e.data.src==='hyperdot')MSGS.push(e.data);});
window.send=c=>document.getElementById('f').contentWindow.postMessage({src:'hyperdot-arcade',cmd:c},'*');window.G=()=>document.getElementById('f').contentWindow.__game;</script>''')

def serve(root, port):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=root)
    s = http.server.ThreadingHTTPServer(('127.0.0.1', port), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
serve(REPO, 8731); serve(DEV, 8732)
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

async def main():
    async with async_playwright() as p:
        exe = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
        b = await p.chromium.launch(executable_path=exe, headless=True, args=ARGS)
        # 1. the published file: no console errors
        pg = await b.new_page(viewport={'width': 1280, 'height': 720}); logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        await pg.goto('http://127.0.0.1:8731/v2/games/bowl3d.html'); await pg.wait_for_timeout(5000)
        await pg.screenshot(path=os.path.join(OUT, 'published.png'))
        print('published file, console problems:', [l for l in logs if 'favicon' not in l] or 'none')
        await pg.close()
        # 2. a whole game on autopilot, laptop and phone sizes
        for tag, vp, mob in [('laptop', (1280, 720), False), ('phone', (412, 915), True)]:
            ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2.625 if mob else 1, is_mobile=mob, has_touch=mob)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:8732/bowl3d.html'); await pg.wait_for_timeout(2500)
            await pg.evaluate('localStorage.clear();__game.norender(true);__game.start();__game.auto(true,.9)')
            shots = 0
            for _ in range(3000):
                st = await pg.evaluate('''(()=>{const g=__game;for(let i=0;i<20;i++){g.tick(1/60);if(g.DMD.on&&g.DMD.t>.5&&g.DMD.t<.55)break;}
                  return {mode:g.S.mode,ot:g.S.ot,dmd:g.DMD.on&&g.DMD.t>.5&&g.DMD.t<.6?g.DMD.kind:''}})()''')
                if st['dmd'] and shots < 3:
                    shots += 1; await pg.evaluate('__game.render3d();__game.render3d()'); await pg.screenshot(path=os.path.join(OUT, f'{tag}_{st["dmd"]}_{shots}.png'))
                if st['mode'] == 'over' and st['ot'] > 2: break
            await pg.evaluate('__game.render3d();__game.render3d()'); await pg.screenshot(path=os.path.join(OUT, f'{tag}_over.png'))
            r = json.loads(await pg.evaluate('''JSON.stringify({sheet:__game.sheet(__game.G.rolls).fr.map(f=>f.m.join("")),score:__game.S.score,tickets:__game.S.tickets,
              keys:Object.keys(localStorage),info:__game.info()})'''))
            sc = r['score']; want = 500 if sc >= 300 else max(3, round(sc / 10)) + (80 if sc >= 200 else 0)
            print(f'{tag}: sheet', ' '.join(r['sheet']), '| score', sc, '| tickets', r['tickets'], 'OK' if r['tickets'] == want else f'WRONG (want {want})',
                  '| saves', r['keys'], '| errors', errs or 'none')
            print(f'  {tag} render: quality', r['info']['QL'], 'size', r['info']['VW'], 'x', r['info']['VH'], 'draw calls', r['info']['calls'], 'triangles', r['info']['tris'])
            await ctx.close()
        # 3. the cabinet contract
        pg = await b.new_page(viewport={'width': 960, 'height': 540})
        await pg.goto('http://127.0.0.1:8732/embed.html'); await pg.wait_for_timeout(3500)
        ev = pg.evaluate; res = {}
        res['ready'] = await ev("MSGS.some(m=>m.type==='ready'&&m.id==='bowl3d')")
        await ev("G().norender(true);G().tick(1/60);G().KEY.Escape=true;G().tick(1/60);G().KEY.Escape=false;G().tick(1/60)")
        res['esc on title -> exit'] = await ev("MSGS.some(m=>m.type==='exit')")
        await ev("send('start')"); await pg.wait_for_timeout(300); res['start'] = await ev("G().S.mode==='play'")
        await ev("send('pause')"); await pg.wait_for_timeout(300); res['pause'] = await ev("G().S.paused===true")
        await ev("send('resume')"); await pg.wait_for_timeout(300); res['resume'] = await ev("G().S.paused===false")
        await ev("send('mute')"); await pg.wait_for_timeout(300); res['mute'] = await ev("G().AU.ctx?G().AU.out.gain.value===0:'no audio'")
        await ev("send('unmute')"); await pg.wait_for_timeout(300); res['unmute'] = await ev("G().AU.ctx?G().AU.out.gain.value>0:'no audio'")
        await ev("G().auto(true,.9);(()=>{const g=G();for(let i=0;i<60*600&&g.S.mode!=='over';i++)g.tick(1/60);})()")
        res['over'] = await ev("JSON.stringify(MSGS.filter(m=>m.type==='over'))")
        await ev("MSGS.length=0;G().start();send('pause')"); await pg.wait_for_timeout(300)
        await pg.frame_locator('#f').locator('#mEx').click(); await pg.wait_for_timeout(300)
        res['menu exit'] = await ev("MSGS.some(m=>m.type==='exit')")
        for k, v in res.items(): print('contract:', k, '->', v)
        await b.close()
asyncio.run(main())
