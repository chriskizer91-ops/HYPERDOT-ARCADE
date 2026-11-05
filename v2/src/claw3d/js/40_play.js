/* =====================================================================================
   40. PLAY — input for the two aim phases, the title / play / game-over flow, pause, the frame loop and boot.
   Aim like a real machine: hold GO (or Space, or an arrow) to travel and let go to set; or drag the claw with a
   finger; a tap means "go there and set". The first axis is left-right, seen from the front; then the camera
   swings round to the side and the second axis is depth. DROP (Shift) drops at once.
   ===================================================================================== */
const SAFE={top:0,left:0};
function aimInput(dt,c,e){
  const isX=M.ph==='aimX';
  if(e.a){M.aDown=true;M.aT=0;GT.tx=GT.tz=null;}
  let v=0;const axisIn=isX?c.x:c.y;           /* depth: up arrow = toward the back */
  if(Math.abs(axisIn)>.25){v=axisIn;if(isX)GT.tx=null;else GT.tz=null;}
  if(M.aDown){M.aT+=dt;if(c.a){if(M.aT>.16)v=isX?1:-1;}else{M.aDown=false;M.lockPend=1;}}
  /* the finger: the claw follows it across the glass (front) or across the side (depth) */
  const P=PTR,lo=isX?CASE.x0+.07:CASE.z0+.07,hi=isX?CASE.x1-.07:CASE.z1-.07;
  if(P.pressed&&!S.paused)M.ptr={x:P.x,y:P.y,moved:false};
  if(M.ptr&&P.down){if(Math.hypot(P.x-M.ptr.x,P.y-M.ptr.y)>8)M.ptr.moved=true;
    if(M.ptr.moved){const w=screenToWorld(P.x,P.y,isX?'x':'z');if(w!=null){if(isX)GT.tx=clamp(w,lo,hi);else GT.tz=clamp(w,lo,hi);}}}
  if(M.ptr&&P.released){const pt=M.ptr;M.ptr=null;
    if(!pt.moved){const w=screenToWorld(pt.x,pt.y,isX?'x':'z');if(w!=null){if(isX)GT.tx=clamp(w,lo,hi);else GT.tz=clamp(w,lo,hi);}}
    M.lockPend=1;}
  if(e.b)M.lockPend=2;
  /* the axis not being set stays where it was locked */
  if(isX){GT.vx=GT.tx==null?v:0;GT.vz=0;GT.tz=M.zLock;}else{GT.vz=GT.tz==null?v:0;GT.vx=0;GT.tx=M.xLock;}
}
const UIP={};
function setPause(on){if(S.mode!=='play')on=false;S.paused=on;$('menu').hidden=!on;document.body.classList.toggle('paused',on);if(on){M.aDown=false;TS.A=TS.B=false;}}
function newGame(){Object.assign(S,{score:0,tickets:0,credit:0,prizes:[],consol:0,demo:false,newHi:false,tShown:0,winT:9});S.mode='play';S.t=0;S.lamp='play';setPhase('prep');M.wins=[];AI.tgt=null;}
function APP_start(){if(S.mode==='play')return;newGame();setTrack('play');SFX.confirm();S.stats.games++;document.body.classList.add('playing');}
function APP_attract(){S.mode='title';S.demo=true;S.paused=false;$('menu').hidden=true;S.t=0;S.lamp='attract';S.credit=0;S.prizes=[];newCredit();setTrack('title');document.body.classList.remove('playing');}
function gameOver(){
  S.mode='over';S.t=0;S.lamp='over';S.tShown=0;M.beam=0;setPhase('idle');document.body.classList.remove('playing');
  if(S.score>S.hi){S.hi=S.score;store.set('hd-'+CAB.id+'-hi-'+MC.id,S.hi);S.newHi=true;}else S.newHi=false;
  setTrack('over');say(S.prizes.length?'Great haul!':'Game over',.7,.95);ARC.over(S.score,S.tickets);
}
function tick(dt){
  const c=readCtl(),e={};for(const k of ['ok','back','pause','a','b','start']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const tap=PTR.pressed;
  S.t+=dt;if(S.shake>0)S.shake=Math.max(0,S.shake-dt*2);if(S.flash>0)S.flash=Math.max(0,S.flash-dt*2.5);S.winT+=dt;
  if(M.hurry&&!(M.ph==='aimX'||M.ph==='aimZ')&&S.mode==='play'){M.hurry=false;setTrack('play');}
  if(S.mode==='title'){worldTick(dt,null,null);if(e.ok||e.start||tap){audioInit();APP_start();}else if(e.back&&EMBED)ARC.exit();}
  else if(S.mode==='play'){if(e.pause){setPause(!S.paused);return;}if(S.paused)return;worldTick(dt,c,e);}
  else if(S.mode==='over'){GT.tx=CS.home[0];GT.tz=CS.home[1];CL.motor=-1;CL.winch=-.34;worldTick(dt,null,null);
    if(S.tShown<S.tickets&&S.t>.6){const r=Math.max(18,S.tickets/2.4),nt=Math.min(S.tickets,S.tShown+r*dt);if((nt|0)>(S.tShown|0))SFX.ticket();S.tShown=nt;}
    if(S.t>2.5&&(e.ok||e.start||tap))APP_attract();else if(EMBED&&S.t>1.5&&e.back)ARC.exit();}
}
/* ---------- the frame loop: fixed 60 Hz simulation, one render per display frame, automatic quality ---------- */
let ACC=0,LAST=0;const PERF={ft:16,n:0,tick:0,draw:0,stepped:false};
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;const t0=performance.now();while(ACC>=1/60&&n<3){tick(1/60);ACC-=1/60;n++;}if(n===3)ACC=0;
  if(n>0)endInputFrame();
  const t1=performance.now();render(dt);hudDraw(dt);musicTick(S.paused);const t2=performance.now();
  if(n)PERF.tick+=((t1-t0)/n-PERF.tick)*.05;PERF.draw+=((t2-t1)-PERF.draw)*.05;
  PERF.ft+=(dt*1000-PERF.ft)*.03;PERF.n++;
  /* a phone that can't hold the frame rate steps down once: fewer pixels, smaller shadows */
  if(!PERF.stepped&&PERF.n>240&&PERF.ft>24&&GFX.q!=='low'&&store.get('hd-'+CAB.id+'-q','auto')==='auto'){PERF.stepped=true;GFX.R.setPixelRatio(1);GFX.spot.shadow.mapSize.set(512,512);if(GFX.spot.shadow.map){GFX.spot.shadow.map.dispose();GFX.spot.shadow.map=null;}resize();}
  requestAnimationFrame(frame);
}
/* ---------- chrome ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-'+CAB.id+'-mute',AU.muted?'1':'0');setVolume();$('mSnd').textContent='Sound: '+(AU.muted?'off':'on');$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
function chrome(){
  if(EMBED)document.body.classList.add('embed');if(touchy)document.body.classList.add('touch');
  $('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
  $('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
  $('pz').addEventListener('click',e=>{audioInit();setPause(!S.paused);});
  $('mRes').addEventListener('click',()=>setPause(false));
  $('mRe').addEventListener('click',()=>{setPause(false);S.mode='title';APP_start();});
  $('mSnd').addEventListener('click',()=>{audioInit();toggleSound();});
  $('mQ').addEventListener('click',()=>{const o=['auto','low','med','high'],cur=store.get('hd-'+CAB.id+'-q','auto'),nx=o[(o.indexOf(cur)+1)%o.length];store.set('hd-'+CAB.id+'-q',nx);$('mQ').textContent='Graphics: '+nx+' (reloads)';setTimeout(()=>location.reload(),600);});
  $('mQ').textContent='Graphics: '+store.get('hd-'+CAB.id+'-q','auto');$('mSnd').textContent='Sound: '+(AU.muted?'off':'on');
  $('mEx').hidden=!EMBED;$('mEx').addEventListener('click',()=>ARC.exit());
  holdBtn($('bGo'),'A');holdBtn($('bDrop'),'B');
  $('keys').innerHTML=CAB.keys;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
  addEventListener('keydown',e=>{if(e.code==='KeyM'){audioInit();toggleSound();}});
  addEventListener('resize',()=>{resize();hudResize();safe();});
  safe();
}
function safe(){const sa=getComputedStyle($('sa'));SAFE.top=parseFloat(sa.paddingTop)||0;SAFE.left=parseFloat(sa.paddingLeft)||0;}
/* ---------- boot: unpack, build the machine, settle the pile, then tell the arcade we're ready ---------- */
async function boot(){
  chrome();
  const bar=$('ldb');await loadAssets(p=>{bar.style.width=(p*60)+'%';});
  setMachine('wild');S.hi=parseInt(store.get('hd-'+CAB.id+'-hi-'+MC.id,'0'),10)||0;
  if(!gfxInit())return;
  makeMaterials();buildCase();buildLights();buildClaw();hudInit();clawReset();
  fillMachine();
  /* settle the heap before anyone sees it, a little per frame so the page stays alive */
  for(let k=0;k<12;k++){for(let t=0;t<25;t++)physTick(null);bar.style.width=(60+k*3.3)+'%';await new Promise(r=>requestAnimationFrame(r));}
  GFX.R.compile(GFX.scene,GFX.cam);render(1/60);
  $('ld').classList.add('gone');setTimeout(()=>$('ld').hidden=true,500);
  APP_attract();ARC.post('ready',{title:CAB.title,tickets:CAB.tickets});
  requestAnimationFrame(frame);
}
/*@@HOOK*/
/* test hook (stripped from the published build): fast-forward and inspect */
window.__game={S,M,CL,CS,GT,BOD,CASE,PTR,TS,KEY,LATCH,PERF,GFX,CAM,tick,render,screenToWorld,hudDraw,start:APP_start,attract:APP_attract,setPause,pickTarget,endInput:endInputFrame,
  ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},
  ffUntil(f,max=30){let n=0;while(!f()&&n<max*60){tick(1/60);endInputFrame();n++;}return n/60;},
  asleep:()=>BOD.filter(b=>b.sleep).length,camSnap(){CAM.want=(M.ph==='aimZ'&&S.mode==='play'&&!S.demo)?1:0;CAM.k=CAM.want;CAM.f=(S.mode==='play'&&!S.demo)?0:1;render(0);},tris:()=>GFX.R.info.render.triangles,calls:()=>GFX.R.info.render.calls,
  bench(n=60){const a=performance.now();for(let i=0;i<n;i++)tick(1/60);const b=performance.now();for(let i=0;i<n;i++)render(1/60);const c=performance.now();return {tick:(b-a)/n,render:(c-b)/n};}};
/*HOOK@@*/
boot();
