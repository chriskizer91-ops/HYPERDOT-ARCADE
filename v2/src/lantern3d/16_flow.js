/* =====================================================================================
   25. THE FRAME LOOP — the original's fixed 60 Hz simulation and its flow between screens,
       with a 3D picture drawn at up to 60 frames a second
   ===================================================================================== */
const TT={t:0};
/* the title world: the original's cobbled floor and iron letters, built in 3D */
function titleSetup(){
  TT.t=0;if(TOWN.kind==='title'&&TOWN.mesh)return;
  MAP=Array.from({length:12},()=>'.'.repeat(24));MW=24;MH=12;worldAlloc(192,96);CANOPY=new Uint8Array(WN);LAMPS.length=0;WELLS=[];
  SH.length=0;MOTHS.length=0;SNUF.length=0;FLARES.length=0;PART.length=0;FF.length=0;PICKS.length=0;BOSS.on=false;GREAT.on=false;
  ST=Object.assign({},NIGHTS[0],{fog:.3,rain:0,moon:1.4,amb:.01});buildTitle3D();moonMap();R3.camInit=false;
}
/* a night's town in 3D, right after the rules have built theirs */
function view3dNight(){buildTown3D();hzLamps();moonMap();for(const L of LAMPS){L.vis=0;L.lit3=0;L.burst=0;}FL3.next=0;GREAT.hz3=0;SPL.length=0;R3.camInit=false;}
const UIP={};
function edges(c){c.m=K('KeyM');c.g=K('KeyG');const e={};for(const k of ['ok','back','pause','a','b','u','d','l','r','m','g']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}if(e.m)toggleSound();if(e.g)toggleDots();return e;}
const IDLE={x:0,y:0,a:false,b:false,ax:0,ay:0,aim:null};
const ATT=[9,7,9.5,34];
/* a tap on the screen, in HUD dots */
const tapHud=()=>[(PTR.x-HUD.ox)/HUD.pitch,(PTR.y-HUD.oy)/HUD.pitch];
function tick(dt){
  const c=readCtl(),e=edges(c),tap=PTR.pressed;S.t+=dt;S.clock+=dt;
  S.shake=Math.max(0,S.shake-dt*2.2);S.flash=Math.max(0,S.flash-dt*2.2);
  if((S.mode==='play'||S.mode==='intro')&&e.pause){setPause(!S.paused);return;}
  if(S.paused){
    const n=pauseItems().length;if(e.u){S.pauseI=(S.pauseI+n-1)%n;SFX.move();}if(e.d){S.pauseI=(S.pauseI+1)%n;SFX.move();}
    let ti=-1;if(tap){const [,ty]=tapHud();for(let i=0;i<n;i++){const y=pauseRowY(i);if(ty>=y-3&&ty<y+9)ti=i;}}
    if(e.ok||ti>=0){const i=ti>=0?ti:S.pauseI;if(i===0)setPause(false);else if(i===1){toggleDots();SFX.confirm();}else{setPause(false);if(EMBED)ARC.exit();APP_attract();}}
    return;
  }
  const m=S.mode;
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
  ACC+=dt;let n=0;while(ACC>=1/60&&n<3){tick(1/60);ACC-=1/60;n++;}if(n===3)ACC=0;if(n>0)endInputFrame();
  RDT+=dt;musicTick(S.paused);ambUpdate();
  /* draw at most 60 times a second, even on a 90 or 120 Hz screen */
  if(LASTR&&ts-LASTR<15.2)return;const rms=LASTR?ts-LASTR:16.7;LASTR=ts;
  const t0=performance.now();renderHud(RDT);render3D(Math.min(.1,RDT));RDT=0;RTM.ms+=(performance.now()-t0-RTM.ms)*.05;perfWatch(rms);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-lantern3d-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';}
function toggleDots(){R3.dots=!R3.dots;store.set('hd-lantern3d-dots',R3.dots?'1':'0');$('resv').textContent=R3.dots?'ON':'OFF';}
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
$('resv').textContent=R3.dots?'ON':'OFF';
if(gl){try{r3Init();}catch(e){GLERR=String(e&&e.message||e);console.error(e);}}
  window.__la={ARC,AU,TG,gl,SPR,LU,S,P,SH,LAMPS,MOTHS,SNUF,BOSS,GREAT,FLARES,NIGHTS,R3,RTM,TOWN,HZ,PICKS,tick,lampsLit,lampToggle,litCells,autopilot,start:APP_start,startNight,attract:APP_attract,nightSetup,fireFlare,spawnShade,spawnMoths,spawnSnuffer,bossStart,wakeGreatLamp,KEY,LATCH,setQuality,toggleDots,screenToWorld,worldToScreen,
    ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},lightAll(){for(const L of LAMPS)if(!L.lit){lampToggle(L,true);L.once=1;}litCells();}};
if(!gl||GLERR){$('err').style.display='grid';if(GLERR)$('err').textContent='LANTERN 3D could not build its shaders on this graphics card. '+GLERR.slice(0,400);}
else{layoutChrome();r3Resize();APP_attract();ARC.post('ready',{title:CAB.title,tickets:CAB.tickets});requestAnimationFrame(frame);}
