/* ---------- session flow ---------- */
function newSession(){
  Object.assign(S,{spins:0,cascN:CASC_N,tkSeen:0,spit:0,score:0,tk:0,tkf:0,won:0,lostN:0,prizes:0,wheelTk:0,jackpots:0,bank:BANK0,bankT:0,time:SESSION,phase:'ready',readyT:1.3,finalT:0,lastDrop:-9,
    dropped:0,showered:0,bumps:3,x2:0,casc:0,shower:null,pops:[],banner:null,newHi:false,warned:0,gapOK:0,lastBeep:99});
  Object.assign(S.wheel,{on:false,queue:0,res:-1,show:0,w:0});
  /* the house keeps the machine full: top the heap up before a new player starts */
  S.topup=Math.max(0,Math.min(80,370-NL));      // the house tops the machine up during GET READY, a coin per tick
  S.base={spawned:PH.spawned,won:PH.won,lost:PH.lost,live:NL};
}
function APP_start(){audioInit();PTR.pressed=false;newSession();S.mode='play';S.demo=false;S.t=0;S.paused=false;setTrack('play');SFX.insert();banner('GOOD LUCK',GR.volt,1.2);}
function APP_attract(){PTR.pressed=false;S.cascN=CASC_N;S.casc=0;S.mode='title';S.demo=true;S.t=0;S.paused=false;S.info=0;S.wheel.queue=0;setTrack('title');$('pauseBtn').textContent='Pause';}
function gameOver(){
  S.mode='over';S.overT=0;S.tkShown=0;S.tk=Math.round(S.tk+S.tkf);S.tkf=0;
  if(S.score>S.hi){S.hi=S.score;store.set('hd-pusher-hi',S.hi);S.newHi=true;}
  store.set('hd-pusher-jp',Math.round(S.jp));setTrack('over');SFX.over();ARC.over(S.score,S.tk);
  S.report={heap0:S.base.live,spawned:PH.spawned-S.base.spawned,won:PH.won-S.base.won,lost:PH.lost-S.base.lost,live:NL,dropped:S.dropped,showered:S.showered};
}
function setPause(on){if(S.mode!=='play')on=false;S.paused=on;$('pauseBtn').textContent=on?'Resume':'Pause';}
/* ---------- the chute: auto sweep, keys/stick slide it, the pointer aims it ---------- */
let ZCH=1;
function ptrWorldX(){return clamp((PTR.x-CAM.cx)*ZCH/CAM.f,-CHX,CHX);}
function chuteTick(dt,c,usePtr){
  /* aim: a finger on the glass, else a pending tap's spot (the chute travels there, then drops), else a hovering mouse */
  let target=null;const inside=PTR.y>H*.05&&PTR.y<H*.98;
  if(usePtr&&PTR.down&&inside)target=ptrWorldX();
  else if(usePtr&&S.pending)target=S.tapX;
  else if(usePtr&&PTR.on&&!PTR.touch&&performance.now()-PTR.last<2500&&inside)target=ptrWorldX();
  if(Math.abs(c.x)>.25){S.cx+=c.x*17*dt;S.manualT=2.2;S.pending=false;}
  else if(target!==null){const d=target-S.cx,st=48*dt;S.cx+=Math.abs(d)<st?d:Math.sign(d)*st;S.manualT=1.2;}
  else if(S.manualT>0)S.manualT-=dt;
  else{S.cx+=S.cdir*6.5*dt;if(S.cx>CHX){S.cx=CHX;S.cdir=-1;}if(S.cx<-CHX){S.cx=-CHX;S.cdir=1;}}
  S.cx=clamp(S.cx,-CHX,CHX);
  return target;
}
/* one fixed 60 Hz step of the machine itself (physics + its consequences) */
function machine(dt){
  if(S.hitstop>0){S.hitstop-=dt;return;}
  physTick();showerTick(dt);events();if(!S.paused)hitSounds();
  for(let k=0;k<NL;k++){const i=LIVE[k];if(SPK[i]>0)SPK[i]=Math.max(0,SPK[i]-dt*2);}
  if(S.trayN){if(S.mode!=='title'||Math.random()<.7)SFX.tray(S.trayN,S.trayX);S.trayN=0;}
}
function fxTick(dt){
  S.shake=Math.max(0,S.shake-dt*2.2);S.flash=Math.max(0,S.flash-dt*2.4);S.gapOK=Math.max(0,(S.gapOK||0)-dt);
  let n=0;for(const p of S.parts){p.vy-=40*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.life-=dt;if(p.life>0)S.parts[n++]=p;}S.parts.length=n;   // in place, no garbage
  n=0;for(const p of S.pops){p.t+=dt;if(p.t<p.life)S.pops[n++]=p;}S.pops.length=n;
  if(S.banner){S.banner.t+=dt;if(S.banner.t>S.banner.life)S.banner=null;}
  wheelTick(dt);
}
const UIP={};
function tick(dt){
  let c=readCtl();const e={};
  if(S.auto&&S.mode==='play')c=pilot(dt,Object.assign(c,{x:0,a:false,b:false}));
  for(const k of ['ok','back','pause','a','b']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  if(LATCH.has('KeyM')){LATCH.delete('KeyM');toggleSound();}   // consume it: a frame may run several ticks
  const tap=PTR.pressed;
  if(S.mode==='title'){
    S.t+=dt;S.demoT+=dt;fxTick(dt);
    const pc=pilot(dt,{x:0,a:false,b:false});chuteTick(dt,pc,false);S.reload-=dt;if(pc.a)chuteDrop();
    if(S.demoT>S.demoShowerT){S.demoT=0;S.demoShowerT=rnd(22,34);startShower(20,'demo');}
    machine(dt);
    if(e.ok||tap||c.start){APP_start();return;}
    if(e.back&&EMBED)ARC.exit();
  }else if(S.mode==='play'){
    if(e.pause){setPause(!S.paused);return;}
    if(S.paused)return;
    S.t+=dt;fxTick(dt);
    if(S.phase==='ready'){S.readyT-=dt;if(S.topup>0){S.topup--;const i=spawn(Math.random()<.22?1:0,rnd(-XF+2,XF-2),rnd(3.5,5),rnd(PZM+PZA+1.5,ZE-4),randQ());if(i>=0)VY[i]=-2;}if(S.readyT<=0)S.phase='run';}
    else if(S.phase==='run'){S.time-=dt;S.bankT+=dt;if(S.bankT>=REFILL){S.bankT-=REFILL;if(S.bank<BANK0){S.bank++;}}
      const sec=Math.ceil(S.time);if(S.time<=10&&sec!==S.lastBeep){S.lastBeep=sec;SFX.warn();}
      if(S.time<=0){S.time=0;S.phase='last';SFX.last();banner('LAST COINS',GR.red,1.6);setTrack('last');}}
    else if(S.phase==='last'){if(S.bank<=0&&S.t-S.lastDrop>1.6&&!S.shower){S.phase='final';S.finalT=6;banner('FINAL PUSH',GR.volt,1.4);}}
    else if(S.phase==='final'){S.finalT-=dt;
      /* bonus coins still queued when the machine winds down pay a flat 3 tickets each instead of a spin */
      if(S.wheel.queue>0&&!S.wheel.on){const q=S.wheel.queue;S.wheel.queue=0;S.tk+=3*q;S.wheelTk+=3*q;pop(W/2,H*.32,'BONUS +'+3*q,[255,220,90],1.4);SFX.wheelWin(1);}
      if((S.finalT<=0&&!S.wheel.on&&S.wheel.res<0&&!S.shower)||S.finalT<-12){gameOver();return;}}
    if(S.x2>0)S.x2-=dt;
    if(!S.auto&&tap&&PTR.y>H*.05&&PTR.y<H*.98){S.pending=true;S.tapX=ptrWorldX();}
    const target=chuteTick(dt,c,!S.auto);S.reload-=dt;
    if(S.phase!=='ready'&&S.phase!=='final'){
      if(S.pending){if(target===null||Math.abs(target-S.cx)<.6){S.pending=false;chuteDrop();}}
      else if(e.a||((c.a||(!S.auto&&PTR.down))&&S.reload<=0&&(target===null||Math.abs(target-S.cx)<.6)))chuteDrop();}
    if(e.b)bump();
    machine(dt);
    if(S.time>0)ARC.score(S.score);
  }else{
    S.t+=dt;S.overT+=dt;fxTick(dt);machine(dt);
    const goal=S.tk,rate=Math.max(12,goal/2.2);
    if(S.tkShown<goal){const prev=Math.floor(S.tkShown);S.tkShown=Math.min(goal,S.tkShown+rate*dt);if(Math.floor(S.tkShown)>prev)SFX.ticket();}
    if(S.overT>1.6&&S.tkShown>=goal&&(e.ok||tap||c.start))APP_attract();
    else if(EMBED&&S.overT>1.6&&e.back)ARC.exit();
  }
}
