#!/usr/bin/env node
/* Air Hockey 3D: build a test copy, then check it in headless Chromium.

     node v2/src/airhockey3d/test/check.js [OUTDIR]

   Needs Node's Playwright (require('playwright')) and its Chromium. Writes screenshots to OUTDIR
   (default /tmp/airhockey3d-check) and prints:
     - console errors on the published file
     - whole matches on autopilot at laptop and phone sizes: the score, the tickets paid, the save keys
     - controls: a mouse puts player 1's mallet where it points; in two-player, each finger drives the
       mallet on its own half
     - the cabinet contract inside a test iframe: ready, Esc on the title -> exit, start, pause/resume,
       mute/unmute, over, and Exit to arcade from the pause menu
   The game runs at a few frames a second in a software renderer, so the checks drive it through the
   test hook (window.__game, only in the test copy) instead of waiting in real time. */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const SRC=path.dirname(__dirname),REPO=path.resolve(SRC,'..','..','..'),OUT=process.argv[2]||path.join(os.tmpdir(),'airhockey3d-check');
fs.mkdirSync(OUT,{recursive:true});
const DEV=fs.mkdtempSync(path.join(os.tmpdir(),'ah3d-'));
execFileSync('python3',[path.join(SRC,'build.py'),'--dev',path.join(DEV,'airhockey3d.html')],{stdio:'inherit'});
fs.writeFileSync(path.join(DEV,'embed.html'),`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>
<iframe id="f" src="airhockey3d.html?embed=1"></iframe><script>window.MSGS=[];addEventListener('message',e=>{if(e.data&&e.data.src==='hyperdot')MSGS.push(e.data);});
window.send=c=>document.getElementById('f').contentWindow.postMessage({src:'hyperdot-arcade',cmd:c},'*');window.G=()=>document.getElementById('f').contentWindow.__game;</script>`);
function serve(root,port){return http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d);});}).listen(port);}
const s1=serve(REPO,8751),s2=serve(DEV,8752);
const ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'];
const ok=(c,m)=>console.log((c?'  ok   ':'  FAIL ')+m);
(async()=>{
  const b=await chromium.launch({args:ARGS});let fails=0;const chk=(c,m)=>{if(!c)fails++;ok(c,m);};
  /* 1. the published file */
  {const pg=await b.newPage({viewport:{width:1280,height:720}}),logs=[];
    pg.on('console',m=>{if(['error','warning'].includes(m.type())&&!/favicon|GPU stall/.test(m.text()))logs.push(m.text());});pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
    await pg.goto('http://127.0.0.1:8751/v2/games/airhockey3d.html');await pg.waitForTimeout(5000);await pg.screenshot({path:path.join(OUT,'published.png')});
    console.log('published file');chk(!logs.length,'no console errors '+(logs.length?JSON.stringify(logs.slice(0,5)):''));
    chk(!(await pg.evaluate('typeof window.__game!=="undefined"')),'test hook stripped');await pg.close();}
  /* 2. whole matches on autopilot */
  for(const [tag,vw,vh,mob] of [['laptop',1280,720,false],['phone',412,915,true]]){
    const ctx=await b.newContext({viewport:{width:vw,height:vh},deviceScaleFactor:mob?2.625:1,isMobile:mob,hasTouch:mob});
    const pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto('http://127.0.0.1:8752/airhockey3d.html');await pg.waitForTimeout(2500);
    console.log(tag);
    for(const [ri,to,rules] of [[0,7,'classic'],[4,5,'frenzy']]){
      await pg.evaluate(`localStorage.clear();__game.norender(true);__game.setOpt('to','${to}');__game.setOpt('rules','${rules}');__game.G.ri=${ri};__game.auto(true,3);__game.start();`);
      const r=await pg.evaluate(`(()=>{const g=__game;let n=0,frz=0;for(;n<60*900&&g.S.mode!=='over';n++){g.tick(1/60);if(g.G.P.pucks.length>1)frz=1;}
        return {mode:g.S.mode,secs:n/60,score:g.G.score,tix:g.G.tickets,res:g.G.result&&{w:g.G.result.w,unlocked:g.G.result.unlocked},frz,beat:g.BEAT,replays:g.G.replays,keys:Object.keys(localStorage)}})()`);
      const w=r.score[0]>r.score[1],want=w?15+ri*8+(r.score[0]-r.score[1]):Math.max(2,r.score[0]*2);
      chk(r.mode==='over'&&Math.max(...r.score)===to,`vs ${RN(ri)} first to ${to} ${rules}: ${r.score.join('-')} in ${r.secs.toFixed(0)} s, ${r.replays} replays`);
      chk(r.tix===want,`tickets ${r.tix} (want ${want})`);
      if(rules==='frenzy')chk(r.frz===1,'frenzy dropped two pucks');
      chk(r.keys.every(k=>k.startsWith('hd-airhockey3d-')),'saves only hd-airhockey3d-* keys: '+r.keys.join(' '));
      if(w&&ri===0)chk(r.beat===0&&r.res.unlocked==='BLITZ','beating PIXEL unlocks BLITZ');
    }
    await pg.evaluate('__game.norender(false);__game.render3d(1/60);__game.render3d(1/60)');await pg.screenshot({path:path.join(OUT,tag+'_over.png')});
    /* controls */
    await pg.evaluate('__game.auto(false);__game.start();__game.ff(2.2)');
    const m=await pg.evaluate(`(()=>{const g=__game,[sx,sy]=g.deckToScreen(.22,.55);g.MOUSE.x=sx;g.MOUSE.y=sy;g.MOUSE.on=true;g.ff(.6);const ml=g.G.P.mal[0];return [ml.x,ml.z]})()`);
    if(!mob)chk(Math.hypot(m[0]-.22,m[1]-.55)<.03,`mouse puts the mallet where it points (${m.map(v=>v.toFixed(3))})`);
    await pg.evaluate('__game.start2();__game.ff(2.2)');
    const t2=await pg.evaluate(`(()=>{const g=__game;g.MOUSE.on=false;const a=g.deckToScreen(-.2,.5),b=g.deckToScreen(.25,-.6);
      g.PT.set(101,{x:a[0],y:a[1],x0:a[0],y0:a[1],type:'touch',pl:-1,t:1});g.PT.set(102,{x:b[0],y:b[1],x0:b[0],y0:b[1],type:'touch',pl:-1,t:2});g.ff(.7);
      const P=g.G.P;const r=[[P.mal[0].x,P.mal[0].z],[P.mal[1].x,P.mal[1].z],g.PT.get(101).pl,g.PT.get(102).pl];g.PT.clear();return r;})()`);
    chk(t2[2]===0&&t2[3]===1,'two fingers: each belongs to the player whose half it touched');
    chk(Math.abs(t2[0][0]+.2)<.06&&Math.abs(t2[1][0]-.25)<.06&&t2[0][1]>0&&t2[1][1]<0,`two fingers drive their own mallets (${JSON.stringify(t2.slice(0,2).map(a=>a.map(v=>+v.toFixed(2))))})`);
    const inf=await pg.evaluate('__game.render3d(1/60);__game.info()');
    console.log(`  render: quality ${inf.QL}, ${inf.VW}x${inf.VH}, ${inf.calls} draw calls, ${inf.tris} triangles`);
    chk(!errs.length,'no page errors '+(errs.length?JSON.stringify(errs.slice(0,3)):''));
    await ctx.close();
  }
  /* 3. the cabinet contract */
  {const pg=await b.newPage({viewport:{width:960,height:540}});await pg.goto('http://127.0.0.1:8752/embed.html');await pg.waitForTimeout(3500);
    const ev=s=>pg.evaluate(s),w=t=>pg.waitForTimeout(t);console.log('cabinet contract');
    chk(await ev("MSGS.some(m=>m.type==='ready'&&m.id==='airhockey3d')"),'ready');
    await ev("G().norender(true);G().tick(1/60);G().KEY.Escape=true;G().tick(1/60);G().KEY.Escape=false;G().tick(1/60)");
    chk(await ev("MSGS.some(m=>m.type==='exit')"),'Esc on the title -> exit');
    await ev("send('start')");await w(300);chk(await ev("G().S.mode==='play'&&!G().G.demo"),'start');
    await ev("send('pause')");await w(300);chk(await ev("G().S.paused===true"),'pause');
    await ev("send('resume')");await w(300);chk(await ev("G().S.paused===false"),'resume');
    await ev("send('mute')");await w(300);chk(await ev("G().AU.ctx?G().AU.out.gain.value===0:true"),'mute');
    await ev("send('unmute')");await w(300);chk(await ev("G().AU.ctx?G().AU.out.gain.value>0:true"),'unmute');
    await ev("G().setOpt('to','5');G().auto(true,3);(()=>{const g=G();for(let i=0;i<60*600&&g.S.mode!=='over';i++)g.tick(1/60);})()");
    const ov=JSON.parse(await ev("JSON.stringify(MSGS.filter(m=>m.type==='over'))"));
    chk(ov.length===1&&ov[0].tickets>0&&ov[0].id==='airhockey3d','over with tickets: '+JSON.stringify(ov));
    chk(await ev("MSGS.some(m=>m.type==='score')"),'score messages');
    chk(await ev("!G().S.paused&&document.getElementById('f').contentDocument.getElementById('oExit').hidden===false"),'result card offers Exit to arcade');
    await ev("MSGS.length=0;G().auto(false);G().start();send('pause')");await w(300);
    await pg.frameLocator('#f').locator('#mEx').click();await w(300);chk(await ev("MSGS.some(m=>m.type==='exit')"),'Exit to arcade from the pause menu');
    await pg.close();}
  await b.close();s1.close();s2.close();
  console.log(fails?`${fails} FAILED`:'all checks passed');process.exit(fails?1:0);
})();
function RN(i){return ['PIXEL','BLITZ','BRICK','RICO','APEX'][i];}
