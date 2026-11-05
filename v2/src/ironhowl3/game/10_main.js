/* ===================== game flow ===================== */
const G={mode:'load',paused:false,t:0,fdt:1/60,birdT:6,perf:{t:0,n:0,s:0},demoI:1,demoHop:4};
let M=null,CTLX=null;
function setQuality(q){QL=q;QC=QUAL[q];DYN=1;resize();setShadow();S.fog.near=QC.fog*.22;S.fog.far=QC.fog;}
function cycleView(){SET.view=SET.view==='close'?'far':'close';store.set('view',SET.view);HUD.view(SET.view);}
function setPause(b){G.paused=b;HUD.menu();setVolume();if(!b&&!touchy&&G.mode==='play')lockMouse();if(b)jetLoop(0);}
function startPlay(){audioInit();G.mode='play';G.paused=false;P=mkPlayer();CAMS.ready=false;$('title').style.display='none';HUD.menu();ARC.begin();
  if(!touchy){lockMouse();HUD.hint('WASD MOVE · MOUSE AIM · SPACE JET HOP · V CAMERA · ESC PAUSE',9);}else HUD.hint('LEFT THUMB MOVES · RIGHT THUMB AIMS · JET TO HOP',7);}
function startDemo(){G.mode='demo';G.paused=false;P=mkPlayer();CAMS.ready=false;G.demoI=1;$('title').style.display='none';HUD.menu();}
/* attract mode: walk the trail, hop now and then */
function demoCtl(dt){const c={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false};const t=TRAIL[G.demoI];if(!t)return c;
  const dx=t[0]-P.x,dz=t[1]-P.z;if(Math.hypot(dx,dz)<7){G.demoI++;if(G.demoI>=TRAIL.length){G.demoI=1;P=mkPlayer();CAMS.ready=false;}}
  const want=Math.atan2(-dx,-dz),d=angD(want,P.yaw);c.turn=-clamp(d,-1.4*dt,1.4*dt);c.my=Math.abs(d)<.6?1:.3;
  G.demoHop-=dt;if(G.demoHop<0){c.jetHit=true;c.jet=true;G.demoHop=5+Math.random()*4;}return c;}
function handleEvents(){
  for(const e of P.ev){
    if(e.t==='jet'){sJet();CAMS.shake=Math.max(CAMS.shake,.45);dustPuff(P.x,P.z,12,1.1);}
    else if(e.t==='land'){sLand(e.k);CAMS.shake=Math.max(CAMS.shake,.4+e.k*.6);dustPuff(P.x,P.z,10+e.k*16|0,.9+e.k*.7);}
    else if(e.t==='nofuel'){sClick();HUD.flashFuel();}
  }
  P.ev.length=0;
}
const _np=new THREE.Vector3();
function jetFX(dt){if(P.thrust<.05)return;for(const J of M.jets){J.n.getWorldPosition(_np);
  const k=P.thrust;if(Math.random()<k*dt*60)part({x:_np.x,y:_np.y-.4,z:_np.z,vx:(Math.random()-.5)*2,vy:-6-Math.random()*4,vz:(Math.random()-.5)*2,life:.25+Math.random()*.15,s0:.9,s1:.35,a:1.4*k,col:[1,.55,.22],glow:true,drag:2});
  if(Math.random()<k*dt*30)part({x:_np.x,y:_np.y-.6,z:_np.z,vx:(Math.random()-.5)*1.5,vy:-3-Math.random()*2,vz:(Math.random()-.5)*1.5,life:1.2+Math.random()*.8,s0:.8,s1:3.4,a:.3,col:SMOKE,drag:1.6,grav:-.6});}}
function tick(dt){
  G.t+=dt;U.uTime.value=G.t;
  /* the clouds drift; their shadows slide over the ground with them */
  U.uCloudOff.value.x+=dt*.0016;U.uCloudOff.value.y+=dt*.0007;
  const live=(G.mode==='play'||G.mode==='demo')&&!G.paused;
  if(live){
    let c=G.mode==='demo'?demoCtl(dt):readCtl(dt);
    if(CTLX){Object.assign(c,CTLX);CTLX.jetHit=false;CTLX.view=false;if(CTLX.turnOnce){c.turn=CTLX.turnOnce;CTLX.turnOnce=0;}}
    if(c.view)cycleView();if(c.pause&&G.mode==='play')setPause(true);
    updPlayer(c,dt);handleEvents();
  }else if(G.mode==='play'){const c=readCtl(dt);if(c.pause||c.view&&false)setPause(false);}
  else readCtl(dt);
  if(M){const ev=poseMech(M,{x:P.x,z:P.z,gy:P.y,legYaw:P.legYaw,aimYaw:P.yaw,spd:live?P.spd:0,air:P.air,vy:P.vy,land:P.land,thrust:P.thrust,pitch:P.pitch},live?dt:0);
    for(const e of ev){const k=clamp(Math.abs(P.spd)/WALK,.35,1);sStep(k);if(e.x!==undefined)dustPuff(e.x,e.z,3,.55);if(SET.view==='close')CAMS.shake=Math.max(CAMS.shake,.16*k);}}
  const view=G.mode==='title'||G.mode==='demo'?'far':SET.view;
  updCam(live||G.mode!=='play'?dt:0,P,view);
  placeSun(P.x-Math.sin(P.yaw)*12,P.z-Math.cos(P.yaw)*12);
  U.uSunXZ.value.set(SUN.x/SUN.y,SUN.z/SUN.y);
  if(live)jetFX(dt);updFX(live?dt:0);
  updVeg(dt,P.x,3,P.z);
  jetLoop(live?P.thrust:0);
  if(live){G.birdT-=dt;if(G.birdT<0){sBird();G.birdT=4+Math.random()*8;}}
  HUD.fuel(P);
}
/* auto quality: if frames are slow, lower the render scale, then the quality level */
function autoQ(dt){if(SET.quality!=='auto'||G.mode!=='play'||G.paused)return;const pf=G.perf;pf.t+=dt;pf.n++;
  if(pf.t>=2.5){const avg=pf.t/pf.n;pf.t=0;pf.n=0;
    if(avg>1/40){if(DYN>.66){DYN*=.88;resize();}else if(QL!=='low'){setQuality(QL==='high'?'med':'low');}}
    else if(avg<1/57&&DYN<1){DYN=Math.min(1,DYN*1.06);resize();}}}
let last=performance.now();
function frame(now){
  const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;G.fdt+=(raw-G.fdt)*.1;
  tick(dt);autoQ(dt);R.render(S,cam);HUD.dev();requestAnimationFrame(frame);
}
function boot(){
  setupHud();setQuality(QL);U.tCloud.value=tex('34-fog',{srgb:false});
  buildGround();M=buildMech();buildFX();P=mkPlayer();
  const done=()=>{G.mode=G.mode==='load'?'title':G.mode;$('load').style.display='none';$('title').style.display=G.mode==='title'?'flex':'none';document.title='IRONHOWL 3';ARC.post('ready',{title:ARC.title});};
  let vegDone=false,texDone=false;LM.onLoad=()=>{texDone=true;if(vegDone)done();};
  loadVeg('woods').then(()=>{vegDone=true;if(texDone||LOADP>=1)done();});
  requestAnimationFrame(frame);
}
$('title').addEventListener('click',()=>{if(G.mode==='title')startPlay();});
cv.addEventListener('click',()=>{if(G.mode==='play'&&!G.paused&&!touchy&&!MOUSE.locked)lockMouse();});
addEventListener('keydown',e=>{if(G.mode==='title'&&(e.code==='Enter'||e.code==='Space'))startPlay();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){if(G.mode==='title'||G.mode==='demo')startPlay();else if(G.paused)setPause(false);}
  else if(m.cmd==='pause'){if(G.mode==='play'&&!G.paused)setPause(true);}
  else if(m.cmd==='resume'){if(G.mode==='play'&&G.paused)setPause(false);}
  else if(m.cmd==='attract'){ARC.live=false;if(G.mode!=='load')startDemo();else G.mode='demo';}
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
if(DEV)window.__ih3={S,KEY,SKY,PFX,rt(n=3){const t0=performance.now();for(let i=0;i<n;i++){R.render(S,cam);R.getContext().finish();}return +((performance.now()-t0)/n).toFixed(1);},G,get P(){return P;},get M(){return M;},VEG,get VEGN(){return VEGN;},R,cam,CAMS,SET,QUAL,setQuality,cycleView,startPlay,startDemo,setPause,
  ctl(o){CTLX=o;},
  /* run the game forward t seconds at 60 steps a second without drawing (for tests) */
  ff(t){const n=Math.round(t*60);for(let i=0;i<n;i++)tick(1/60);},
  info(){const i=R.info.render;return {calls:i.calls,tris:i.triangles,veg:VEGN.inst,ql:QL,dyn:DYN,mode:G.mode,x:+P.x.toFixed(1),z:+P.z.toFixed(1),y:+P.y.toFixed(2),air:P.air,fuel:+P.fuel.toFixed(2),hops:P.hops};}};
boot();
