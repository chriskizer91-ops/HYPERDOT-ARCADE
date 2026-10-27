/* =====================================================================================
   16. FLOW: one fixed 60 Hz tick for every screen, render once per display frame
   ===================================================================================== */
const UIP={};
function setPause(on){if(!['race','grid','hw'].includes(S.mode)||S.demo)on=false;S.paused=on;S.pauseI=0;$('pauseBtn').textContent=on?'Resume':'Pause';}
function quitRace(){setPause(false);if(S.mode==='hw'){S.mode='hwover';S.t=0;endHighway();}else endGP(false);}
function edges(c){const e={};for(const k of ['ok','back','pause','nitro','l','r','u','d']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}return e;}
function menuTap(){
  /* taps on the menu: a mode card starts it, the assist row cycles */
  const cw=W*.36,ch=H*.36,cy=H*.2;
  for(let i=0;i<2;i++){const cx=W/2+(i?1:-1)*(cw/2+4*SC)-cw/2;if(PTR.x>=cx&&PTR.x<=cx+cw&&PTR.y>=cy&&PTR.y<=cy+ch){S.menuI=i;return 'go';}}
  if(PTR.y>cy+ch){for(let i=0;i<3;i++){const x=W/2+(i-1)*W*.17;if(Math.abs(PTR.x-x)<W*.08){S.assist=i;store.set('hd-'+CAB.id+'-assist',i);SFX.select();return 'set';}}}
  return null;
}
function goMode(){SFX.confirm();if(MODES[S.menuI].id==='gp')startGP();else startHighway();}
function tick(dt){
  const c=readCtl(),e=edges(c),tap=PTR.pressed;
  S.clock+=dt;S.t+=dt;S.shake=Math.max(0,S.shake-dt*2.5);S.flash=Math.max(0,S.flash-dt*2.5);
  for(const p of S.popups)p.t+=dt;S.popups=S.popups.filter(p=>p.t<1.6);
  VIEW.themeT=Math.min(1,VIEW.themeT+dt*.7);
  /* the pause menu: resume or retire (keys, pad or a tap on the item) */
  if(S.paused){if(e.u||e.d){S.pauseI=1-S.pauseI;SFX.select();}
    if(tap){const y1=Math.round(H*.36)+10*K5()+Math.round(13*SC)+3;if(Math.abs(PTR.y-y1)<6*SC)quitRace();else setPause(false);}      /* a tap on RETIRE quits, anywhere else resumes */
    else if(e.pause)setPause(false);else if(e.ok){if(S.pauseI)quitRace();else setPause(false);}else if(K('KeyQ'))quitRace();
    return;}
  const m=S.mode;
  if(m==='title'||m==='menu'){
    raceStep(dt,c);S.demoT+=dt;
    if(S.demoT>50){const cm=m;APP_attract();S.mode=cm;}
    if(m==='title'){if(e.back&&EMBED)ARC.exit();else if(e.ok||tap||(e.pause&&!K('Escape')))APP_start();}
    else{
      if(e.u||e.d){S.menuRow=1-S.menuRow;SFX.select();}
      if(e.l||e.r){if(S.menuRow===0){S.menuI=e.l?0:1;}else{S.assist=clamp(S.assist+(e.l?-1:1),0,2);store.set('hd-'+CAB.id+'-assist',S.assist);}SFX.select();}
      if(tap){const r=menuTap();if(r==='go')goMode();}
      else if(e.ok&&S.t>.25)goMode();
      else if(e.back){S.mode='title';SFX.back();}
    }
  }
  else if(m==='intro'){if(S.t>.6&&(e.ok||tap)||S.t>7)toGrid();}
  else if(m==='grid'){if(e.pause){setPause(true);return;}gridStep(dt,c);if(S.mode==='race'||S.mode==='hw'){for(const k of CARS)k.lapT0=0;}}
  else if(m==='race'){if(e.pause){setPause(true);return;}raceStep(dt,c);}
  else if(m==='finish'){raceStep(dt,c);const all=CARS.every(k=>k.finished);if((S.t>2.5&&(e.ok||tap))||S.t>11||(all&&S.t>4)){closeRace();S.mode='results';S.t=0;setTrack('results');}}
  else if(m==='results'){raceStep(dt,{x:0,dig:true});if(S.t>2.2&&(e.ok||tap))afterResults();}
  else if(m==='standings'){if(S.t>1.8&&(e.ok||tap)){S.round++;startRound();}}
  else if(m==='continue'){if(e.ok||tap){S.cont--;S.retried=1;SFX.confirm();startRound();}else if(e.back||S.t>9)endGP(false);}
  else if(m==='champion'||m==='over'||m==='hwover'){
    if(m==='hwover')hwStep(dt,c);
    const tk=Math.min(S.tickets,Math.floor(Math.max(0,S.t-1)*12));if(tk>(S.tkShown||0)){S.tkShown=tk;SFX.ticket();}
    if(S.t>2.5&&(e.ok||tap)){S.tkShown=0;APP_attract();}else if(EMBED&&S.t>2.5&&e.back){S.tkShown=0;ARC.exit();}
  }
  else if(m==='hw'){if(e.pause){setPause(true);return;}hwStep(dt,c);}
  partStep(dt);weatherStep(dt);
  if(m!=='grid'&&m!=='intro'){VIEW.sky+=dt*(P.v/VTOP)*(P.seg?P.seg.curve:0)*.0016*60;}
}
function render(){
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
  renderWorld();
  const m=S.mode;
  if(m==='title')drawTitle();
  else if(m==='menu')drawMenu();
  else if(m==='intro')drawIntro();
  else if(m==='grid'){if(S.hwGrid)drawHwHUD();else drawRaceHUD();drawLights();}
  else if(m==='race')drawRaceHUD();
  else if(m==='finish'){drawRaceHUD();if(S.t>.5){panel(0,Math.round(H*.44),W,Math.round(14*SC),.6);stxt5(g,'FINISHED  P'+P.pos,W/2,Math.round(H*.44)+3*SC,P.pos<=3?GR.gold:'#ffffff',1,'c');}}
  else if(m==='results')drawResults();
  else if(m==='standings')drawStandings();
  else if(m==='continue')drawContinue();
  else if(m==='champion')drawChampion();
  else if(m==='over')drawOver();
  else if(m==='hw')drawHwHUD();
  else if(m==='hwover'){drawHwHUD();drawHwOver();}
  if(S.paused)drawPause();
}
let FACC=0,FLAST=0;const RT={tick:0,render:0};
function frame(ts){
  const dt=FLAST?Math.min(.05,(ts-FLAST)/1000):1/60;FLAST=ts;
  FACC+=dt;let n=0;const t0=performance.now();while(FACC>=1/60&&n<4){tick(1/60);FACC-=1/60;n++;}if(n===4)FACC=0;
  const t1=performance.now();if(n>0){endInputFrame();RT.tick+=((t1-t0)/n-RT.tick)*.05;}
  render();RT.render+=(performance.now()-t1-RT.render)*.05;engineUpdate();musicTick(S.paused);present();
  requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%CAB.res.length);layout();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
$('brand').firstChild.textContent=CAB.brand;$('brand').querySelector('span').textContent=CAB.sub;$('keys').innerHTML=CAB.keys;
if(!gl)$('err').style.display='grid';
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();APP_attract();
ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
window.__rl={AU,S,get P(){return P;},CARS:()=>CARS,TR:()=>TR,TRAFFIC:()=>TRAFFIC,KEY,LATCH,PTR,TS,RT,CIRCUITS,DRIVERS,tick,ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,startGP,startHighway,startRound,attract:APP_attract,setRes,frame(){render();present();},closeRace,endGP,raceOrder,setupRace};
requestAnimationFrame(frame);
