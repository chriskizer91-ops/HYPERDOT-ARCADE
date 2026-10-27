/* =====================================================================================
   10. FRAME LOOP — fixed 60 Hz simulation, render once per display frame
   ===================================================================================== */
/* the rolling rumble: looping noise through a lowpass whose level, colour and lumpiness
   (an LFO at the ball's rotation rate) follow the rolling speed. Airborne balls are silent. */
const RB={on:false};
function rumble(){
  const c=AU.ctx;if(!c||c.state!=='running')return;
  try{
    if(!RB.on){RB.on=true;
      RB.src=c.createBufferSource();RB.src.buffer=AU.noise;RB.src.loop=true;RB.f=c.createBiquadFilter();RB.f.type='lowpass';RB.f.Q.value=2.2;RB.f.frequency.value=200;
      RB.m=c.createGain();RB.m.gain.value=.65;RB.g=c.createGain();RB.g.gain.value=0;RB.src.connect(RB.f);RB.f.connect(RB.m);RB.m.connect(RB.g);RB.g.connect(AU.sfx);
      RB.lfo=c.createOscillator();RB.lfo.frequency.value=8;RB.lg=c.createGain();RB.lg.gain.value=.35;RB.lfo.connect(RB.lg);RB.lg.connect(RB.m.gain);
      RB.o=c.createOscillator();RB.o.type='sine';RB.o.frequency.value=50;RB.og=c.createGain();RB.og.gain.value=0;RB.o.connect(RB.og);RB.og.connect(AU.sfx);
      RB.src.start();RB.lfo.start();RB.o.start();}
    const b=BALL;let sp=0,f=220;
    if(!S.paused&&S.mode!=='over'&&(b.st==='live'||b.st==='hand')&&b.roll>.05){sp=b.roll;f=b.supK===2?120+sp*80:200+sp*170;}
    const v=AU.muted||ARC.muted?0:clamp(sp/3.6,0,1)*.6*(S.mode==='title'?.5:1),t=c.currentTime;
    RB.g.gain.setTargetAtTime(v,t,.035);RB.og.gain.setTargetAtTime(v*.55,t,.05);RB.f.frequency.setTargetAtTime(f,t,.05);
    RB.lfo.frequency.setTargetAtTime(clamp(sp/(TAU*PH.R),1,30),t,.05);RB.o.frequency.setTargetAtTime(38+sp*9,t,.05);
  }catch(e){}
}
const UIP={};
function setPause(on){if(S.mode!=='play')on=false;S.paused=on;$('pauseBtn').textContent=on?'Resume':'Pause';if(on){S.charging=false;S.drag=null;}}
function tick(dt){
  const c=readCtl(),e={};for(const k of ['ok','back','pause','a','start']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const mk=K('KeyM');if(mk&&!UIP.m)toggleSound();UIP.m=mk;
  const tap=PTR.pressed;
  if(S.mode==='title'){S.rt+=dt;simTick(dt,c,e);camTick(dt);if(e.ok||e.start||tap){audioInit();APP_start();}else if(e.back&&EMBED)ARC.exit();}
  else if(S.mode==='play'){
    if(e.pause){setPause(!S.paused);return;}
    if(S.paused){if(tap)setPause(false);rumble();return;}
    S.rt+=dt;simTick(dt,c,e);camTick(dt);
  }else if(S.mode==='over'){
    S.rt+=dt;S.t+=dt;dmdTick(dt);lampTick(dt);partTick(dt);TIX.tick(dt);camTick(dt);S.disp=S.score;
    if(!TIX.done&&S.t>1&&(tap||e.ok))TIX.rate*=3;
    else if(S.t>1.6&&TIX.done&&(e.ok||e.start||tap))APP_attract();else if(EMBED&&S.t>1.6&&e.back)ARC.exit();
  }
  rumble();
}
let ACC=0,LAST=0,FREEZE=false;   /* tests can freeze real time and drive ticks themselves */
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;const t0=performance.now();if(FREEZE)ACC=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0){PERF.tick=(performance.now()-t0)/n;endInputFrame();}   /* only clear latched taps once a tick has seen them */
  g.setTransform(1,0,0,1,0,0);render();musicTick(S.paused);present();
  requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%CAB.res.length);layout();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
$('brand').firstChild.textContent=CAB.brand;$('brand').querySelector('span').textContent=CAB.sub;$('keys').innerHTML=CAB.keys;document.title='Ring Roller';
/* phones: no stick (you swipe the matrix itself); the big button is hold-to-charge, release to roll */
$('stL').hidden=true;$('bB').hidden=true;$('bA').textContent='ROLL';$('pad').style.justifyContent='flex-end';
if(!gl)$('err').style.display='grid';
if(AU.muted)$('snd').textContent='Sound off';
buildScene();buildPaint();LAMPV=new Float32Array(2*LAMPN());LAMPT=new Float32Array(2*LAMPN());LAMPC=new Uint8Array(2*LAMPN());buildTable();
RESCB.push(()=>{fitCams();CAM.sig='';});
setRes(resI);resize();APP_attract();
ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
/* test hook (stripped from the published build) */
window.__game={S,BALL,KEY,LATCH,PTR,TS,TIX,PERF,TAB,RINGS,HOLES,PH,CAM,tick,render,shadeStatic,rasterScene,shadeScene,throwBall,setPause,ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},freeze(on){FREEZE=on;},proj(x,y,z){const p=project(x,y,z);return [p[0],p[1],p[2]];},get RECT(){return RECT;},start:APP_start,attract:APP_attract,setRes,get W(){return W;},get H(){return H;}};
requestAnimationFrame(frame);
})();
