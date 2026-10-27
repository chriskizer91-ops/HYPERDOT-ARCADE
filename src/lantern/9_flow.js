/* =====================================================================================
   16. THE FRAME LOOP — a fixed 60 Hz simulation, one picture per display frame
   ===================================================================================== */
const UIP={};
function edges(c){c.m=K('KeyM');const e={};for(const k of ['ok','back','pause','a','b','u','d','l','r','m']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}if(e.m)toggleSound();return e;}
const IDLE={x:0,y:0,a:false,b:false,ax:0,ay:0,aim:null};
const ATT=[9,7,9.5,34];
function tick(dt){
  const c=readCtl(),e=edges(c),tap=PTR.pressed;S.t+=dt;S.clock+=dt;
  S.shake=Math.max(0,S.shake-dt*2.2);S.flash=Math.max(0,S.flash-dt*2.2);
  if((S.mode==='play'||S.mode==='intro')&&e.pause){setPause(!S.paused);return;}
  if(S.paused){
    if(e.u||e.d){S.pauseI^=1;SFX.move();}
    const ti=tap?(PTR.y>H*.55-3&&PTR.y<H*.55+7?0:PTR.y>=H*.55+7&&PTR.y<H*.55+18?1:-1):-1;
    if(e.ok||ti>=0){const i=ti>=0?ti:S.pauseI;if(i===0)setPause(false);else{setPause(false);if(EMBED)ARC.exit();APP_attract();}}
    return;
  }
  const m=S.mode;
  if(m==='attract'){
    S.att.t+=dt;TT.t+=dt;
    if(S.att.t>ATT[S.att.ph]){S.att.ph=(S.att.ph+1)%ATT.length;S.att.t=0;snap();if(S.att.ph===3){startDemo();return;}if(S.att.ph===0)titleSetup();}
    if(e.ok||tap||c.start){APP_start();return;}
    if(e.back&&EMBED)ARC.exit();
  }
  else if(m==='demo'){
    const ap=autopilot();nightStep(dt,ap,true);if(ap.b)fireFlare();
    if(e.ok||tap||c.start){APP_start();return;}
    if(S.t>ATT[3]||P.dead||nightWon()){snap();APP_attract();}
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
    if(m==='ending')nightStep(dt,IDLE,false);
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
let ACC=0,LAST=0,RDT=0;
const RT={ms:0};
function render(dt){
  const t0=performance.now(),m=S.mode;
  if(m==='attract'){
    const ph=S.att.ph,tt=S.att.t;
    if(ph===0){renderTitle(TT.t);const a=clamp((tt-1.2)*1.5,0,1);if(a>0)otxt3('KEEP THE LIGHT',W/2,47,Math.round(13*a),'c');
      if(tt>2&&((S.clock*2|0)&1))otxt3(touchy?'TAP TO PLAY':'PRESS START',W/2,74,15,'c');otxt3('HI '+fmt(S.hi[0][1]),3,H-6,9);otxt3('HYPERDOT ARCADE',W-3,H-6,9,'r');}
    else if(ph===1){NB.fill(0);drawTable(8);}
    else{NB.fill(0);drawRules(tt);}
  }
  else if(m==='demo'||m==='intro'||m==='play'||m==='dying'||m==='dawn'||m==='ending'){
    renderNight(S.clock,dt);
    if(m==='play'||m==='demo'||(m==='intro'&&S.t>3)||m==='dying'){drawPops();drawHUD();drawCalls();}
    if(m==='demo'){otxt3('DEMO',3,H-7,9);if((S.clock*2|0)&1)otxt3(touchy?'TAP TO PLAY':'PRESS START',W/2,H-7,14,'c');}
    if(m==='intro'){const a=clamp(S.t*2,0,1)*clamp((4.8-S.t)*2,0,1),v=Math.round(15*a);dimRect(0,18,W,56,.4);
      otxt3('NIGHT '+(S.night+1),W/2,22,Math.round(10*a),'c');const sc=tw5(ST.name,2)<=W-8?2:1;otxt5(ST.name,W/2,30,v,sc,'c');
      ST.hint.forEach((l,i)=>txt3(l,W/2,50+i*7,Math.round(11*a),'c'));if(S.t>2.2)otxt3('LIGHT '+LAMPS.length+' LAMPS',W/2,74,(S.clock*4|0)&1?v:Math.round(v*.6),'c');}
    if(m==='dying'){
      /* eyes in the dark, closing in */
      const k=clamp((S.t-.6)/2.4,0,1);for(let n=0;n<9;n++){const a=n/9*TAU+n*.7,r=60-k*44+Math.sin(S.t*3+n)*3,x=W/2+Math.cos(a)*r*1.4,y=H/2+Math.sin(a)*r*.8;if(((S.t*3+n*.37)%2.1)>.15){dot(x-1,y,Math.round(9*k)+2,1);dot(x+1,y,Math.round(9*k)+2,1);}}
      if(S.t>1.8){otxt5('THE DARK',W/2,30,15,2,'c');otxt5('TAKES YOU',W/2,48,15,1,'c');otxt3(P.lives>0?P.lives+(P.lives>1?' WICKS LEFT':' WICK LEFT'):'NO WICKS LEFT',W/2,62,11,'c');}}
    if(m==='dawn'){sunrise(S.t);if(S.t>1.6)drawTally();}
    if(m==='ending'){sunrise(Math.min(S.t,3));const a=clamp(S.t-1,0,1);if(S.t>1){otxt5('THE LONG NIGHT',W/2,14,Math.round(15*a),2,'c');otxt5('IS OVER',W/2,32,Math.round(15*a),1,'c');
      otxt5(fmt(S.score),W/2,46,15,1,'c');otxt3(S.tickets+' TICKETS',W/2,56,12,'c');if(S.entry)drawEntry(64);else if(S.t>3&&((S.clock*2|0)&1))otxt3(touchy?'TAP':'PRESS START',W/2,H-7,12,'c');}}
  }
  else if(m==='over'){NB.fill(0);
    for(let n=0;n<14;n++){const a=n*2.39996,r=30+((S.t*6+n*13)%50),x=W/2+Math.cos(a)*r*1.6,y=H/2+Math.sin(a)*r*.7;if((S.t*2+n)%3>.3){dot(x-1,y,5);dot(x+1,y,5);}}
    otxt5('GAME OVER',W/2,8,15,2,'c');otxt5(fmt(S.score),W/2,28,15,1,'c');otxt3(S.tickets+' TICKETS',W/2,38,12,'c');
    if(S.entry)drawEntry(50);else{txt3('HI '+fmt(S.hi[0][1])+'  '+S.hi[0][0],W/2,52,9,'c');if(S.t>2.5&&((S.clock*2|0)&1))otxt3(touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-8,13,'c');}}
  if(S.paused){dimRect(0,0,W,H,.25);otxt5('PAUSED',W/2,22,15,2,'c');
    ['RESUME',EMBED?'EXIT':'QUIT TO TITLE'].forEach((t,i)=>{const y=Math.round(H*.55)+i*11,sel=i===S.pauseI;otxt5((sel?'> ':'  ')+t+(sel?' <':'  '),W/2,y,sel?15:7,1,'c');});}
  if(S.flash>0&&!reduce){const f=Math.round(S.flash*9);for(let i=0;i<N;i++)if(NB[i]<f)NB[i]=f;}
  dissolve(dt);
  RT.ms+=(performance.now()-t0-RT.ms)*.05;
}
function frame(ts){
  const ms=LAST?ts-LAST:16.7,dt=Math.min(.05,ms/1000);LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<3){tick(1/60);ACC-=1/60;n++;}if(n===3)ACC=0;
  RDT+=dt;if(n>0){endInputFrame();render(Math.min(.1,RDT));RDT=0;}
  PTIME+=dt;panelStep(dt);present();musicTick(S.paused);ambUpdate();
  requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{GI=(GI+1)%GLASS.length;store.set('hd-lantern-glass',GI);$('resv').textContent=GLASS[GI].name;e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
if(!gl||GLERR){$('err').style.display='grid';if(GLERR)$('err').textContent='LANTERN could not build its display shaders on this graphics card. '+GLERR.slice(0,300);}
if(AU.muted)$('snd').textContent='Sound off';
$('resv').textContent=GLASS[GI].name;
  window.__la={S,P,SH,LAMPS,MOTHS,SNUF,BOSS,GREAT,FLARES,NIGHTS,PERF,RT,NB,RAD,LT,CAM,tick,render,lampsLit,lampToggle,litCells,autopilot,start:APP_start,startNight,attract:APP_attract,nightSetup,fireFlare,spawnShade,spawnMoths,spawnSnuffer,bossStart,wakeGreatLamp,KEY,LATCH,
    ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},lightAll(){for(const L of LAMPS)if(!L.lit){lampToggle(L,true);L.once=1;}litCells();}};
if(gl&&!GLERR){resize();APP_attract();ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});requestAnimationFrame(frame);}
