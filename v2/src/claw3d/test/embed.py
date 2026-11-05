#!/usr/bin/env python3
"""Plush Panic 3D inside a test iframe with ?embed=1, the way the arcade opens it: the published file must say
ready, obey pause / resume / mute / unmute, and show no console errors."""
import asyncio, os, subprocess, sys, threading, functools, http.server
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE); REPO = os.path.normpath(os.path.join(SRC, '..', '..', '..'))
subprocess.run([sys.executable, os.path.join(SRC, 'build.py')], check=True, stdout=subprocess.DEVNULL)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=REPO)); threading.Thread(target=srv.serve_forever, daemon=True).start()
PORT = srv.server_address[1]
open(os.path.join(REPO, 'v2', 'games', '_embed_test.html'), 'w').write('''<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>
<iframe id="f" src="claw3d.html?embed=1"></iframe><script>window.MSGS=[];addEventListener('message',e=>{if(e.data&&e.data.src==='hyperdot')MSGS.push(e.data);});
window.send=c=>document.getElementById('f').contentWindow.postMessage({src:'hyperdot-arcade',cmd:c},'*');window.F=()=>document.getElementById('f').contentWindow;</script>''')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        pg.on('response', lambda r: errs.append('404 ' + r.url) if r.status == 404 else None)
        await pg.goto('http://127.0.0.1:%d/v2/games/_embed_test.html' % PORT)
        await pg.wait_for_function('MSGS.some(m=>m.type==="ready")', timeout=240000)
        print('ready:', await pg.evaluate('MSGS.find(m=>m.type==="ready")'))
        print('has the test hook (should be False):', await pg.evaluate('!!F().__game'))
        await pg.evaluate('send("start")'); await pg.wait_for_timeout(1500)
        print('after start, playing:', await pg.evaluate('F().document.body.classList.contains("playing")'))
        await pg.evaluate('send("pause")'); await pg.wait_for_timeout(500)
        print('after pause, menu shown:', await pg.evaluate('!F().document.getElementById("menu").hidden'))
        await pg.evaluate('send("resume")'); await pg.wait_for_timeout(500)
        print('after resume, menu hidden:', await pg.evaluate('F().document.getElementById("menu").hidden'))
        await pg.evaluate('send("mute");send("unmute")'); await pg.wait_for_timeout(300)
        print('exit button in the pause menu:', await pg.evaluate('!F().document.getElementById("mEx").hidden'))
        await pg.screenshot(path='/tmp/clawwork/embed.png')
        print('console problems:', [e for e in errs if 'favicon' not in e] or 'none')
        await b.close()
asyncio.run(main())
os.remove(os.path.join(REPO, 'v2', 'games', '_embed_test.html'))
