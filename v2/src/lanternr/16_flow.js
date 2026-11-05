/* =====================================================================================
   25. THE FRAME LOOP — the original's fixed 60 Hz simulation and its flow between screens,
       with a 3D picture drawn at up to 60 frames a second
   ===================================================================================== */
const TT={t:0};
/* REMAKE: the title is Lamp Street itself, every lamp lit, the lamplighter waiting under one of them */
function titleSetup(){
  TT.t=0;storyHide();if(TOWN.kind==='night'&&R3.titleTown)return;
  nightSetup(0,true);for(const L of LAMPS){lampToggle(L,true);L.once=1;L.vis=1;}litCells();
  let best=LAMPS[0],bd=1e9;for(const L of LAMPS){const d=Math.hypot(L.x-START.x,L.y-START.y);if(d<bd){bd=d;best=L;}}
  if(best){P.x=best.x+5;P.y=best.y+4;}P.aim=P.aimTo=-2.2;P.beamK=0;R3.titleTown=true;CAM3.init=false;
  const free=(a,mx)=>{for(let s=2;s<mx;s+=2)if(hmAt(P.x+Math.cos(a)*s,P.y+Math.sin(a)*s)>6)return s;return mx;};let ba=0,bs=-1;
  for(let k=0;k<24;k++){const a=k/24*TAU,sc=Math.min(free(a,40),36)+Math.min(free(a+Math.PI,160),150)*.4;if(sc>bs){bs=sc;ba=a;}}R3.titleA=ba;
}
/* a night's town in 3D, right after the rules have built theirs; the camera starts facing the nearest lamp */
function view3dNight(){R3.sunOn=false;R3.titleTown=false;buildTown3D();hzLamps();moonMap();for(const L of LAMPS){L.vis=0;L.lit3=0;L.burst=0;}FL3.next=0;GREAT.hz3=0;SPL.length=0;VFX.length=0;
  let best=null,bd=1e9;for(const L of LAMPS){const d=Math.hypot(L.x-P.x,L.y-P.y);if(d<bd){bd=d;best=L;}}
  CAM3.yaw=best?Math.atan2(best.y-P.y,best.x-P.x):-Math.PI/2;P.aim=P.aimTo=CAM3.yaw;CAM3.pitch=.22;CAM3.dd=28.5;CAM3.cine=null;R3.prevLit=0;R3.prevGreat=false;R3.prevBoss=false;}
/* ---------- the story, told on cards between the nights ---------- */
const CHAPTERS=[
  ['Chapter One','Lamp Street','The guild bell has not rung in a hundred nights. You are the last lamplighter of Wickham, and tonight the dark came down Lamp Street first. Light every lamp, and the dawn will follow.'],
  ['Chapter Two','The Canals','The rain came in off the sea. Over the canals the moths are thick as smoke, and they drink from any flame. When they swarm, close your shutter and let them fly to a brighter lamp.'],
  ['Chapter Three',"St Elm's Yard",'Something walks between the graves with a bell on a pole. The snuffers do not hunt you; they hunt the lamps. Only your beam will stop them. Mind the low stones: they hide what stands behind them.'],
  ['Chapter Four','The Fog Market','The fog has swallowed the market whole. Everything hunts tonight. Keep to the lamps, keep your oil, and watch the edges of your sight.'],
  ['Chapter Five','The Lighthouse','On the island the great lamp has been dark since the guild fell. Light the island and it will wake. But what sleeps beneath the sea will wake with it.']];
/* a card fades in and out; what it should be doing is kept apart from the fade, so a quick skip can't leave it up */
const FADE={};
function fade(id,on){const el=$(id);if(FADE[id]===on)return;FADE[id]=on;
  if(on){el.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(FADE[id])el.classList.add('on');}));}
  else{el.classList.remove('on');setTimeout(()=>{if(!FADE[id])el.hidden=true;},950);}}
function storyShow(i){const c=CHAPTERS[i];if(!c)return;const art=studio()&&IMGS['7.'+(i+1)];$('story').style.backgroundImage=art?'linear-gradient(rgba(4,4,8,.45),rgba(4,4,8,.7)),url('+art+')':'';$('stCh').textContent=c[0];$('stT').textContent=c[1];$('stP').textContent=c[2];fade('story',true);}
function storyHide(){fade('story',false);}
function logoShow(on){fade('logo',on);}
/* ---------- looking round: the mouse (held still by pointer lock), a drag on the screen, the BEAM button dragged ---------- */
let OURUNLOCK=false;
function lockPointer(){if(touchy||document.pointerLockElement===cv)return;try{const r=cv.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(e){}}
function unlockPointer(){if(document.pointerLockElement){OURUNLOCK=true;try{document.exitPointerLock();}catch(e){}}}
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){if(!OURUNLOCK&&(S.mode==='play'||S.mode==='intro')&&!S.paused)setPause(true);OURUNLOCK=false;}});
const playing=()=>(S.mode==='play'||S.mode==='intro')&&!S.paused;
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&playing())lockPointer();});
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!playing())return;if(document.pointerLockElement===cv||e.buttons){CAM3.mdx+=e.movementX||0;CAM3.mdy+=e.movementY||0;}});
const DRAG={};function dragLook(el,k){el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')DRAG[e.pointerId]=[e.clientX,e.clientY];});
  el.addEventListener('pointermove',e=>{const d=DRAG[e.pointerId];if(!d)return;if(playing()){CAM3.mdx+=(e.clientX-d[0])*k;CAM3.mdy+=(e.clientY-d[1])*k*.8;}d[0]=e.clientX;d[1]=e.clientY;});
  const end=e=>{delete DRAG[e.pointerId];};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
dragLook(cv,1.7);dragLook($('bA'),1.7);
const UIP={};
function edges(c){c.m=K('KeyM');c.g=K('KeyG');c.lk=K('KeyL');const e={};for(const k of ['ok','back','pause','a','b','u','d','l','r','m','g','lk']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}if(e.m)toggleSound();if(e.g)toggleDots();if(e.lk)toggleLook();return e;}
const IDLE={x:0,y:0,a:false,b:false,ax:0,ay:0,aim:null};
const ATT=[9,7,9.5,34];
/* a tap on the screen, in HUD dots */
const tapHud=()=>[(PTR.x-HUD.ox)/HUD.pitch,(PTR.y-HUD.oy)/HUD.pitch];
function tick(dt){
  if(playing()&&!window.__auto)camInput(dt,S.mode==='play');
  const c=readCtl(),e=edges(c),tap=PTR.pressed;S.t+=dt;S.clock+=dt;
  S.shake=Math.max(0,S.shake-dt*2.2);S.flash=Math.max(0,S.flash-dt*2.2);
  if((S.mode==='play'||S.mode==='intro'||S.mode==='chapter')&&e.pause){setPause(!S.paused);return;}
  if(S.paused){
    const n=pauseItems().length;if(e.u){S.pauseI=(S.pauseI+n-1)%n;SFX.move();}if(e.d){S.pauseI=(S.pauseI+1)%n;SFX.move();}
    let ti=-1;if(tap){const [,ty]=tapHud();for(let i=0;i<n;i++){const y=pauseRowY(i);if(ty>=y-3&&ty<y+9)ti=i;}}
    if(e.ok||ti>=0){const i=ti>=0?ti:S.pauseI;if(i===0)setPause(false);else if(i===1){toggleLook();SFX.confirm();}else if(i===2){toggleDots();SFX.confirm();}else{setPause(false);if(EMBED)ARC.exit();APP_attract();}}
    return;
  }
  const m=S.mode;
  if(m==='chapter'){if((S.t>1.4&&(e.ok||tap||c.start))||S.t>13){storyHide();S.mode='intro';S.t=0;}return;}
  if(m==='attract'){
    S.att.t+=dt;TT.t+=dt;
    if(S.att.t>ATT[S.att.ph]){S.att.ph=(S.att.ph+1)%ATT.length;S.att.t=0;if(S.att.ph===3){startDemo();return;}if(S.att.ph===0)titleSetup();}
    if(e.ok||tap||c.start){APP_start();return;}
    if(e.back&&EMBED)ARC.exit();
  }
  else if(m==='demo'){
    const ap=autopilot();nightStep(dt,ap,true);if(ap.b)fireFlare();
    if(e.ok||tap||c.start){APP_start();return;}
    if(S.t>ATT[3]||P.dead||nightWon()){APP_attract();}
  }
  else if(m==='intro'){
    nightStep(dt,{x:0,y:0,a:false,b:false,ax:0,ay:0,aim:c.aim},false);
    P.oil=Math.min(OIL_MAX,S.t/1.2*OIL_MAX);
    if(S.t>4.8){S.mode='play';S.t=0;P.oil=OIL_MAX;}else if((e.ok||tap)&&S.t<3.8)S.t=3.8;
  }
  else if(m==='play'){
    let ctl=c;if(window.__auto){ctl=autopilot();if(ctl.b)fireFlare();}else if(e.b)fireFlare();
    nightStep(dt,ctl,true);
    /* moments that get a shot of their own */
    const lit=lampsLit();if(lit===LAMPS.length&&R3.prevLit<LAMPS.length&&!ST.boss)cine('last',2.4);R3.prevLit=lit;
    if(GREAT.on&&!R3.prevGreat)cine('great',3.2);R3.prevGreat=GREAT.on;if(BOSS.on&&!R3.prevBoss)cine('boss',3.2);R3.prevBoss=BOSS.on;
    if(nightWon()){S.wonT=(S.wonT||0)+dt;if(S.wonT>1.6){S.wonT=0;startDawn();}}
  }
  else if(m==='dying'){
    nightStep(dt,IDLE,false);
    if(S.t>3.8){if(P.lives>0)respawn();else gameOver();}
  }
  else if(m==='dawn'){
    nightStep(dt,IDLE,false);const T_=S.tally;T_.t+=dt;
    if(S.t>1.6){if(T_.shown<T_.rows.length){if(T_.t>.42){T_.t=0;T_.shown++;SFX.tick();}}
      else if(T_.paid<T_.pay){const k=Math.min(T_.pay-T_.paid,Math.max(50,Math.round(T_.pay*dt*.9)));T_.paid+=k;addScore(k);SFX.tick();}}
    if((e.ok||tap||window.__auto&&S.t>6)&&S.t>1.6){if(T_.shown<T_.rows.length||T_.paid<T_.pay){addScore(T_.pay-T_.paid);T_.paid=T_.pay;T_.shown=T_.rows.length;}else nextNight();}
    else if(S.t>16&&T_.paid>=T_.pay)nextNight();
  }
  else if(m==='over'||m==='ending'){
    if(m==='ending')nightStep(dt,IDLE,false);else{for(const s of SH){s.eye+=dt;}stepParts(dt);}
    if(S.entry){const en=S.entry;en.t+=dt;
      if(e.u){en.ch[en.i]=(en.ch[en.i]+1)%ALPHA.length;SFX.move();}if(e.d){en.ch[en.i]=(en.ch[en.i]+ALPHA.length-1)%ALPHA.length;SFX.move();}
      if(e.l&&en.i>0){en.i--;SFX.move();}if(e.r&&en.i<2){en.i++;SFX.move();}
      if(tap){en.ch[en.i]=(en.ch[en.i]+1)%ALPHA.length;SFX.move();}
      if(e.ok||(e.a&&!tap)){if(en.i<2){en.i++;SFX.confirm();}else commitEntry();}
      if(en.t>30||window.__auto)commitEntry();}
    else if(S.t>2.5&&(e.ok||tap))APP_attract();
    else if(EMBED&&S.t>2&&e.back)ARC.exit();
    else if(S.t>(m==='ending'?45:25))APP_attract();
  }
}
let ACC=0,LAST=0,LASTR=0,RDT=0;
const RTM={ms:0};
function frame(ts){
  requestAnimationFrame(frame);
  const ms=LAST?ts-LAST:16.7,dt=Math.min(.05,ms/1000);LAST=ts;
  R3.ts+=((CAM3.cine&&S.mode==='play'?.38:1)-R3.ts)*Math.min(1,dt*6);
  ACC+=dt*R3.ts;let n=0;while(ACC>=1/60&&n<3){tick(1/60);ACC-=1/60;n++;}if(n===3)ACC=0;if(n>0)endInputFrame();
  RDT+=dt;musicTick(S.paused);ambUpdate();
  /* draw at most 60 times a second, even on a 90 or 120 Hz screen */
  if(LASTR&&ts-LASTR<15.2)return;const rms=LASTR?ts-LASTR:16.7;LASTR=ts;
  logoShow(S.mode==='attract'&&S.att.ph===0&&!S.paused);$('story').style.visibility=S.paused?'hidden':'';
  const t0=performance.now();renderHud(RDT);render3D(Math.min(.1,RDT));RDT=0;RTM.ms+=(performance.now()-t0-RTM.ms)*.05;perfWatch(rms);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-lanternr-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';}
function toggleDots(){R3.dots=!R3.dots;store.set('hd-lanternr-dots',R3.dots?'1':'0');$('resv').textContent=R3.dots?'ON':'OFF';}
/* the Look switch: Studio (the new paint, models and grade) or Classic (as the remake first shipped) */
function toggleLook(){setLook(R3.look==='studio'?'classic':'studio');}
function lookLabel(){$('lookv').textContent=R3.look==='studio'?'STUDIO':'CLASSIC';}
$('look').addEventListener('click',e=>{toggleLook();e.currentTarget.blur();});
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{toggleDots();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
function layoutChrome(){const portrait=touchy&&innerHeight>innerWidth*1.05,bs=document.body.style;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;
  if(touchy){const v=Math.min(innerWidth,innerHeight);bs.setProperty('--stick',Math.min(150,v*(portrait?.36:.34))+'px');bs.setProperty('--b',Math.min(62,v*(portrait?.15:.13))+'px');}}
addEventListener('resize',()=>{layoutChrome();if(gl&&!GLERR)r3Resize();});
if(AU.muted)$('snd').textContent='Sound off';
$('resv').textContent=R3.dots?'ON':'OFF';lookLabel();
if(gl){try{r3Init();}catch(e){GLERR=String(e&&e.message||e);console.error(e);}}
  window.__la={CAM3,VFX,ARC,AU,TG,gl,SPR,LU,S,P,SH,LAMPS,MOTHS,SNUF,BOSS,GREAT,FLARES,NIGHTS,R3,RTM,TOWN,HZ,PICKS,tick,lampsLit,lampToggle,litCells,autopilot,start:APP_start,startNight,attract:APP_attract,setLook,TX,studio,AM2,nightSetup,fireFlare,spawnShade,spawnMoths,spawnSnuffer,bossStart,wakeGreatLamp,KEY,LATCH,setQuality,toggleDots,screenToWorld,worldToScreen,
    ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},lightAll(){for(const L of LAMPS)if(!L.lit){lampToggle(L,true);L.once=1;}litCells();}};
if(!gl||GLERR){$('err').style.display='grid';if(GLERR)$('err').textContent='LANTERN: THE LONG NIGHT could not build its shaders on this graphics card. '+GLERR.slice(0,400);}
else{layoutChrome();r3Resize();APP_attract();ARC.post('ready',{title:CAB.title,tickets:CAB.tickets});requestAnimationFrame(frame);}
