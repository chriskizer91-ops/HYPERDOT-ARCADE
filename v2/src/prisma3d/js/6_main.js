/* =====================================================================================
   6. FRAME LOOP — a fixed 60 Hz simulation (the original's), one render per display frame
   ===================================================================================== */
const UIP={};
function edges(c){const e={};for(const k of ['ok','back','pause','a','u','d','view']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}return e;}
function rowAt(y){for(const [i,r] of menuRows().entries())if(y>=r.y-3&&y<=r.y+9)return i;return -1;}
function menuAct(i){
  if(i===0)APP_start();else if(i===1){S.how=0;SFX.confirm();}
  else{ASSIST=!ASSIST;store.set('hd-prisma3d-assist',ASSIST?'1':'0');SFX.confirm();}
}
function toggleSound(){AU.muted=!AU.muted;store.set('hd-prisma3d-mute',AU.muted?'1':'0');setVolume();try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
function pauseAct(i){
  const id=pauseItems()[i][1];SFX.confirm();
  if(id==='resume')setPause(false);
  else if(id==='view')setView(VIEW.mode?0:1);
  else if(id==='qual'){if(QS.auto)setQuality(0,false);else if(QS.i<2)setQuality(QS.i+1,false);else setQuality(touchy?1:2,true);}
  else if(id==='snd')toggleSound();
  else{setPause(false);if(EMBED)ARC.exit();APP_attract();}
}
function tick(dt){
  const c=readCtl();c.view=K('KeyC')||K('KeyV');const e=edges(c),tap=PTR.pressed;S.t+=dt;
  if((S.mode==='play'||S.mode==='intro')&&e.pause){setPause(!S.paused);return;}
  if(e.view&&!S.paused){setView(VIEW.mode?0:1);SFX.move();}
  if(S.paused){
    const n=pauseItems().length;
    if(e.u){S.pauseI=(S.pauseI+n-1)%n;SFX.move();}if(e.d){S.pauseI=(S.pauseI+1)%n;SFX.move();}
    let ti=-1;if(tap){const k=Math.floor((PTR.y-PAUSE_Y0()+3)/PAUSE_DY);if(k>=0&&k<n)ti=k;}
    if(ti>=0){S.pauseI=ti;pauseAct(ti);}else if(e.ok)pauseAct(S.pauseI);
    return;
  }
  const m=S.mode;
  if(m==='title'){
    if(S.how>=0){if(e.ok||tap){S.how++;SFX.move();if(S.how>1)S.how=-1;}else if(e.back){S.how=-1;SFX.back();}}
    else{if(e.u){S.menuI=(S.menuI+2)%3;SFX.move();}if(e.d){S.menuI=(S.menuI+1)%3;SFX.move();}
      if(tap){const i=rowAt(PTR.y);if(i>=0){S.menuI=i;menuAct(i);return;}APP_start();return;}
      if(e.ok){menuAct(S.menuI);if(S.mode!=='title')return;}
      else if(e.back&&EMBED)ARC.exit();}
    worldStep(dt,autopilot(),true);
    if((TG.state==='caught'&&S.caughtT>6)||S.t>55)APP_attract();
  }
  else if(m==='intro'){
    const t0=S.t-dt;if(t0<3.6&&S.t>=3.6||t0<4.6&&S.t>=4.6||t0<5.6&&S.t>=5.6)SFX.beep();
    if(S.t>=6.6){S.mode='play';S.t=0;SFX.go();BK.vs=20;}
    else if((e.ok||tap)&&S.t<3.5)S.t=3.5;
    worldStep(dt,null,false);
  }
  else if(m==='play'){
    const ctl={x:c.x,brake:c.b,nitro:e.a||(tap&&!PTR.touch)};
    if(window.__auto)Object.assign(ctl,autopilot());
    S.time-=dt;if(S.time<10&&Math.ceil(S.time)!==Math.ceil(S.time+dt)&&S.time>0)SFX.warn();
    worldStep(dt,ctl,true);
    if(S.mode==='play'&&S.time<=0){S.time=0;timeUp();}
  }
  else if(m==='caught'){worldStep(dt,null,false);if(S.t>4.8)startTally();}
  else if(m==='tally'){
    worldStep(dt,null,false);const T=S.tally;T.t+=dt;
    if(T.shown<T.rows.length){if(T.t>.45){T.t=0;T.shown++;SFX.tick();}}
    else if(T.paid<T.pay){const k=Math.min(T.pay-T.paid,Math.max(50,Math.round(T.pay*dt*.9)));T.paid+=k;addScore(k);SFX.tick();}
    if(e.ok||tap){if(T.shown<T.rows.length||T.paid<T.pay){addScore(T.pay-T.paid);T.paid=T.pay;T.shown=T.rows.length;}else nextStage();}
    else if(S.t>16&&T.paid>=T.pay)nextStage();
  }
  else if(m==='timeup'){worldStep(dt,null,false);S.count-=dt;
    if(S.t>.8&&(e.ok||tap)){S.cont++;S.score=0;ARC.score(0);startStage(S.stage);SFX.confirm();}
    else if(S.count<=0)gameOver();}
  else if(m==='over'){worldStep(dt,null,false);if(S.t>1.5&&(e.ok||tap))APP_attract();else if(EMBED&&S.t>1.5&&e.back)ARC.exit();else if(S.t>25)APP_attract();}
  else if(m==='ending'){worldStep(dt,null,false);if(S.t>3&&(e.ok||tap))APP_attract();else if(S.t>40)APP_attract();}
}
let ACC=0,LAST=0;const PERF={ms:16.7,frames:0};
function frame(ts){
  const ms=LAST?ts-LAST:16.7,dt=Math.min(.05,ms/1000);LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  if(!window.__noDraw)render(dt);musicTick(S.paused);ambUpdate();
  PERF.ms+=(Math.min(ms,100)-PERF.ms)*.05;PERF.frames++;
  /* auto quality: step down when the frame rate can't hold (never in the first seconds of a stage) */
  if(QS.auto&&!document.hidden&&!S.paused){QS.ema+=(Math.min(ms,80)-QS.ema)*.05;QS.t+=dt;
    if(QS.t>2){QS.t=0;if(QS.ema>21.5&&QS.i>0){QS.low++;if(QS.low>=2){QS.i--;QS.low=0;QS.drops++;makeTargets();}}else QS.low=0;}}
  requestAnimationFrame(frame);
}
function render(dt){
  updateCamera(S.paused?0:dt);
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);drawOverlay();
  FLASH=reduce?0:S.flash*.25;
  /* the touch pad shows only while you drive */
  const drive=touchy&&!S.paused&&(S.mode==='play'||S.mode==='intro');const pad=$('pad');if(pad.hidden===drive)pad.hidden=!drive;
  const pb=$('pauseBtn'),pbOn=!EMBED&&(S.mode==='play'||S.mode==='intro')&&!S.paused;if(pb.hidden===pbOn)pb.hidden=!pbOn;
  render3d(S.paused?0:dt);
}
/* ---------- boot ---------- */
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
if(gl){try{glInit();}catch(e){GLERR=String(e);console.error(e);}}
if(!gl||GLERR){$('err').style.display='grid';if(GLERR)$('err').textContent='PRISMA 3D could not set up its graphics on this device. '+GLERR.slice(0,300);}
else{resize();APP_attract();
  ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
  if(/[?&]test=1/.test(location.search))window.__pr={AU,S,BK,TG,TR,FEAT,DR,CAM,QS,QUALS,KEY,LATCH,PTR,TS,STK,CH,VIEW,PERF,GBX,AMB,audioInit,useNitro,tick,ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,startStage,STAGES,get ST(){return ST;},render,autopilot,cam(f){CAMOV=f;},setQuality,setView,resize,
    stats(){let tris=0,n=0;for(const c of CH.map.values()){tris+=(c.g.n+c.s.n)/3;n++;}let v=MODELS.bike.n+MODELS.van.n+MODELS.drone.n;for(const m of MODELS.car)v+=m.n;return {chunks:n,cityTris:Math.round(tris),vehicleTris:Math.round(v/3),RTW,RTH,CW,CH:CH_,q:qnow().name,msaa:!!RT.ms,refl:!!RT.rf,hdr:HDR,W,H,ri:rightInset(),pbHidden:$('pauseBtn').hidden,mode:S.mode,kmh:Math.round(BK.vs*3.6),gear:GBX.g,rpm:+GBX.rpm.toFixed(3)};}};
  requestAnimationFrame(frame);}
