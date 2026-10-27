/* =====================================================================================
   18. FRAME LOOP — fixed 60 Hz ticks (physics substeps at 240 Hz inside), render once per display frame
   ===================================================================================== */
const UIP={},T={tick:0,scene:0,hud:0,bad:0,good:0};
function setPause(on){if(S.mode!=='play')on=false;S.paused=on;$('pauseBtn').textContent=on?'Resume':'Pause';if(on)rumbleSet(0,100,0);}
function world(dt,c,e,tap){
  gameTick(dt,c,e,tap);camTick(dt);
  if(DMD.on){DMD.t+=dt;if(DMD.t>=DMD.dur)DMD.on=false;}
  if(S.toast){S.toast.t+=dt;if(S.toast.t>1.2)S.toast=null;}
  if(S.shake>0)S.shake=Math.max(0,S.shake-dt*2.2);
  partTick(dt);maskTick(dt);rumbleTick(dt);
}
function tick(dt){
  const t0=performance.now(),c=readCtl(),e={},cc={ok:c.ok,back:c.back,pause:c.pause,a:c.a||c.ok,b:c.b,d:c.d};
  for(const k in cc){e[k]=cc[k]&&!UIP[k];UIP[k]=cc[k];}
  const tap=PTR.pressed;S.t+=dt;
  if(S.mode==='title'){world(dt,c,e,false);GST.rel=false;if(e.ok||tap)APP_start();else if(e.back&&EMBED)ARC.exit();}
  else if(S.mode==='play'){if(e.pause)setPause(!S.paused);else if(S.paused){if(tap)setPause(false);}else world(dt,c,e,tap);}
  else if(S.mode==='over'){world(dt,c,e,false);overTick(dt);if(S.ot>1.5&&(e.ok||tap))APP_attract();else if(EMBED&&S.ot>1.5&&e.back)ARC.exit();}
  T.tick+=(performance.now()-t0-T.tick)*.05;
}
/* adaptive per-dot quality: drop reflections' detail if the GPU pass is slow, climb back when there is headroom */
function qualityTick(dt){if(QFIX!=null||!SC_OK)return;
  if(T.scene>18){T.bad+=dt;T.good=0;}else if(T.scene<6){T.good+=dt;T.bad=0;}else{T.bad=0;T.good=0;}
  if(T.bad>1.2&&QL>0){QL--;T.bad=0;}if(T.good>5&&QL<2){QL++;T.good=0;}}
let ACC=0,LAST=0,NOREN=false;   /* NOREN: tests only, skip drawing so input runs at real speed */
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();          /* only clear latched taps once a tick has seen them */
  if(!NOREN){g.setTransform(1,0,0,1,0,0);render();present();qualityTick(dt);}musicTick(S.paused);
  requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%CAB.res.length);relayout();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
/* the swipe-zone hint lives in the empty space under the matrix on an upright phone */
function relayout(){resize();const sw=$('swz'),port=document.body.classList.contains('portrait');sw.hidden=!port||EMBED;
  if(port){const top=RECT.y+RECT.h+44;sw.style.top=top+'px';}}
addEventListener('resize',relayout);document.body.classList.add('nostick');
$('brand').firstChild.textContent=CAB.brand;$('brand').querySelector('span').textContent=CAB.sub;$('keys').innerHTML=CAB.keys;document.title='Strike Night';
$('stL').hidden=true;                                   /* touch players bowl by swiping the matrix; A/B stay for line-aim-power and spin */
if(!gl)$('err').style.display='grid';
if(AU.muted)$('snd').textContent='Sound off';
sceneInit();setRes(resI);relayout();paintMask(0);APP_attract();
ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
/*@@HOOK*/
/* test hook (stripped from the published build): fast-forward, autopilot and inspection */
window.__game={S,G,PW,PS,CAM,KEY,LATCH,PTR,TS,GST,T,DMD,tick,render,sheet,rackState,standMask,isSplit,
  ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,setRes,
  auto(on,skill){G.auto=!!on;if(skill!=null)G.autoSkill=skill;if(on&&G.ph==='aim'&&!G.ai)aiStart();},
  bowl(x0,ang,spd,spin){G.x0=x0;G.ai=null;throwBall(x0,ang,spd,spin);},quality(q){QL=q;},dmd,paintMask,say,aiStart,aiTick,evalRoll,psStart,norender(on){NOREN=!!on;},AU,gameOver,show(){g.setTransform(1,0,0,1,0,0);render();present();},
  phys(){return {nc:NC,awake:PW.pins.filter(p=>p.on&&!p.sleep&&!p.kin).length};}};
/*HOOK@@*/
requestAnimationFrame(frame);
