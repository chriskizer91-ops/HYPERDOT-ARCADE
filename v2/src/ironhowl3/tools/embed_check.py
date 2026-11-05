import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await (await b.new_context(viewport={'width':820,'height':470})).new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.goto('http://localhost:8000/v2/src/ironhowl3/tools/embed_check.html')
        await pg.wait_for_function("LOG.includes('ready:ironhowl3')",timeout=240000)
        out=[]
        async def st(label): out.append(label+' -> '+str(await pg.evaluate("(()=>{const h=inner();return h.G.mode+(h.G.paused?' paused':'')+' muted='+(h.G&&window.frames[0].document?'' :'')})()")))
        await st('after ready')
        for cmd in ['start','pause','resume','mute','unmute','attract']:
            await pg.evaluate(f"send('{cmd}')"); await pg.wait_for_timeout(1500); await st(cmd)
        await pg.evaluate("inner().ff(3)"); out.append('attract walks: '+str(await pg.evaluate("JSON.stringify(inner().info())")))
        await pg.evaluate("send('start')"); await pg.wait_for_timeout(1500); await st('start again')
        await pg.evaluate("inner().setPause(true)"); await pg.wait_for_timeout(500)
        vis=await pg.evaluate("getComputedStyle(document.getElementById('f').contentDocument.getElementById('mexit')).display")
        await pg.evaluate("document.getElementById('f').contentDocument.getElementById('mexit').click()"); await pg.wait_for_timeout(500)
        keys=await pg.evaluate("Object.keys(document.getElementById('f').contentWindow.localStorage)")
        print('\n'.join(out)); print('exit button shown:',vis); print('messages:',await pg.evaluate('LOG')); print('saved keys:',keys); print('errors:',errs)
        await b.close()
asyncio.run(main())
