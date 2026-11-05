import asyncio, sys
from playwright.async_api import async_playwright
import os
OUT=os.environ.get('SHOTS','/tmp/ih3shots'); os.makedirs(OUT,exist_ok=True)
BASE='http://localhost:8000/v2/games/ironhowl3/index.html'   # serve the repo root on port 8000
async def main():
    w,h=int(sys.argv[1]),int(sys.argv[2]); script=sys.argv[3]; name=sys.argv[4]
    touch=len(sys.argv)>5 and sys.argv[5]=='touch'; q=sys.argv[6] if len(sys.argv)>6 else ''
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if touch else 1,has_touch=touch,is_mobile=touch)
        pg=await ctx.new_page(); logs=[]
        pg.on('console',lambda m:logs.append(m.type+': '+m.text[:400]))
        pg.on('pageerror',lambda e:logs.append('ERR '+str(e)[:600]))
        await pg.goto(BASE+'?dev'+('&touch' if touch else '')+('&'+q if q else ''))
        try: await pg.wait_for_function("window.__ih3&&__ih3.G.mode!=='load'",timeout=180000)
        except Exception: logs.append('LOAD TIMEOUT')
        for step in [s for s in script.split('%%') if s]:
            if step.startswith('wait:'): await pg.wait_for_timeout(int(step[5:]))
            elif step.startswith('shot:'): await pg.screenshot(path=OUT+'/'+step[5:]+'.png')
            elif step.startswith('tap:'):
                x,y=map(int,step[4:].split(',')); await pg.touchscreen.tap(x,y)
            else:
                try:
                    r=await pg.evaluate(step)
                    if r is not None: print('=>',str(r)[:3000])
                except Exception as e: logs.append('EVAL ERR '+str(e)[:400])
        await pg.screenshot(path=OUT+'/'+name+'.png')
        print('\n'.join(l for l in logs if 'favicon' not in l and '404' not in l)[:6000])
        await b.close()
asyncio.run(main())
