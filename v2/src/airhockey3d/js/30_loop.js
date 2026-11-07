/* =====================================================================================
   30. FRAME LOOP — fixed 60 Hz game ticks (the physics substeps 8 times inside each),
       one 3D render per display frame, the frame-rate watch that steps quality down, the
       keys and gamepad buttons for the menus, and boot.
   ===================================================================================== */
const UIP={},T={fps:60,ms:16.7,bad:0,good:0,frames:0};
function tick(dt){
  const mk=menuKeys(),e={};for(const k in mk){e[k]=mk[k]&&!UIP[k];UIP[k]=mk[k];}
  /* d-pad and arrows move between buttons whenever a menu is up */
  const menuUp=!!UI.scr||S.paused;
  if(menuUp){const dirs={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]},st={u:K('ArrowUp'),d:K('ArrowDown'),l:K('ArrowLeft'),r:K('ArrowRight')};
    for(const p of pads()){const b=i=>!!(p.buttons[i]&&p.buttons[i].pressed),ly=p.axes[1]||0,lx=p.axes[0]||0;if(b(12)||ly<-.6)st.u=true;if(b(13)||ly>.6)st.d=true;if(b(14)||lx<-.6)st.l=true;if(b(15)||lx>.6)st.r=true;
      if(b(0)&&!UIP.padA){const a=document.activeElement;if(a&&a.tagName==='BUTTON')a.click();}UIP.padA=b(0);}
    for(const k in st){if(st[k]&&!UIP['n'+k])focusMove(dirs[k][0],dirs[k][1]);UIP['n'+k]=st[k];}}
  S.t+=dt;U.uT.value=S.t;
  if(S.mode==='title'){gameTick(dt);
    if(e.back){if(UI.scr==='rivals'){SFX.back();uiShow('title');}else if(EMBED)ARC.exit();}}
  else if(S.mode==='play'){
    if(e.pause&&!G.replay)setPause(!S.paused);
    else if(!S.paused)gameTick(dt);else airTick(dt,false,0);}
  else if(S.mode==='over'){S.ot+=dt;gameTick(dt);if(S.ot>1&&e.back)APP_attract();}
  camTick(dt);fxTick(dt);
  if(S.shake>0)S.shake=Math.max(0,S.shake-dt*2.4);if(S.flash>0)S.flash=Math.max(0,S.flash-dt*1.6);
  const d=Math.exp(-dt*1.8);LEDU.uFl0.value*=d;LEDU.uFl1.value*=d;if(LT.goalK)LT.goalK*=Math.exp(-dt*2.2);
}
/* ---------- physics (or the replay) -> meshes ---------- */
const PV=[];        /* what each puck slot shows this frame, for the trails */
const _q=new THREE.Quaternion(),_ax=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0),_q2=new THREE.Quaternion();
function syncWorld(dt){
  const f=G.replay?replayFrame():null,P=G.P,th=THEMES[THEME];
  const pucks=f?f.p.map(a=>({x:a[0],z:a[1],ang:a[2],on:!!a[3],sink:a[4],sinkSide:a[5],sx:a[6],sz:a[7],hop:a[8],tilt:a[9],id:a[10],last:a[11],vx:0,vz:0,drop:1})):P.pucks;
  const mal=f?[[f.m[0],f.m[1]],[f.m[2],f.m[3]]]:[[P.mal[0].x,P.mal[0].z],[P.mal[1].x,P.mal[1].z]];
  for(let k=0;k<3;k++){const m=PUCK3[k],bl=BLOBS[k],L=LT.puck[k],p=pucks.find(q=>q.id===k);PV[k]=null;
    if(!p||(!p.on&&!(p.sink>0&&p.sink<.7))||S.mode==='title'&&false){m.visible=false;bl.visible=false;L.intensity=0;continue;}
    let x=p.x,y=TB.DECK+.0012+(p.hop||0),z=p.z;
    if(p.drop!=null&&p.drop<1){y+=Math.pow(1-p.drop,2)*.14;}
    if(!p.on){const s=p.sink;z=p.sinkSide*(TB.HL+Math.min(.06,s*.9));y=TB.DECK+.0012-Math.max(0,s-.06)*Math.max(0,s-.06)*4;x=clamp(x,-TB.GW/2+TB.RP,TB.GW/2-TB.RP);}
    m.visible=true;m.position.set(x,y,z);
    /* spin, plus a wobble after a hard hit */
    _q.setFromAxisAngle(_up,-p.ang);
    if(p.tilt>.01&&!reduce){const sp=Math.hypot(p.vx,p.vz)||1;_ax.set(-(p.vz||0)/sp,0,(p.vx||0)/sp);if(_ax.lengthSq()<.5)_ax.set(1,0,0);
      _q2.setFromAxisAngle(_ax,Math.sin(S.t*38)*p.tilt*.12);_q.premultiply(_q2);}
    m.quaternion.copy(_q);
    bl.visible=p.on;bl.position.set(x,TB.DECK+.0006,z);bl.material.opacity=.42/(1+(y-TB.DECK)*60);
    L.intensity=th.puckE>0&&p.on?.05:0;L.position.set(x,TB.DECK+.03,z);
    const sp=Math.hypot(p.vx,p.vz);PV[k]={x,z,spd:f?(p.on?3:0):sp,col:p.last>=0?plCol(p.last):'#ffffff',vis:p.on};
    if(f&&k<PV.length&&p.on){const pr=PV[k];pr.spd=T._lastRep&&T._lastRep[k]?Math.hypot(x-T._lastRep[k][0],z-T._lastRep[k][1])*60*G.replay.speed:0;}
  }
  if(f){T._lastRep=PV.map(p=>p&&[p.x,p.z]);}
  for(let i=0;i<2;i++){const m=MAL3[i],[x,z]=mal[i];m.position.set(x,TB.DECK+.0005,z);BLOBS[3+i].position.set(x,TB.DECK+.0006,z);}
  trailTick(dt,PV);
  /* the light show bits */
  const live=pucks.find(p=>p.on);
  if(live&&th.lineK>0){DU.uGlow.value.set(live.x,live.z,.35,.09);DU.uGlowC.value.set(live.last>=0?plCol(live.last):'#9ad8ff');}else DU.uGlow.value.z=0;
  LT.goal.intensity=(LT.goalK||0)*.35;
  for(const c of CHUTE){const fl=G.chuteFl&&G.chuteFl[0]===c.sz?LT.goalK||0:0;c.lm.color.copy(c.base).multiplyScalar(1.4+fl*6*(((S.t*10)|0)%2?1:.3));}
  BOARD.grp.visible=!((CAM.mode==='p1'||CAM.mode==='top')&&CAM.k>.5)||S.mode==='over';
  LEDU.uChase.value=S.mode==='title'?1:0;LEDU.uK.value=S.mode==='title'?1.2:1;
  M_COMP.uniforms.uFlash.value=reduce?0:S.flash*.25;
}
function render3d(dt){
  R.info.reset();syncWorld(dt||1/60);applyCam();hud();paintBoard(dt||1/60);
  if(MIRROR_ON())renderMirror(CAM3);else DU.uMirOn.value=0;
  R.setRenderTarget(RT.scene);R.render(SCENE,CAM3);
  post();
}
const MIRROR_ON=()=>!!MIR.rt;
/* frame-rate watch: if frames take too long for a couple of seconds, drop a level (never while pinned) */
function qualityTick(dt){
  T.frames++;T.ms+=(dt*1000-T.ms)*.05;if(T.frames<90||QPIN!=null||S.paused)return;
  if(T.ms>24){T.bad+=dt;T.good=0;}else if(T.ms<13){T.good+=dt;T.bad=0;}else{T.bad=Math.max(0,T.bad-dt);T.good=0;}
  if(T.bad>2.2&&QL>0){setQuality(QL-1);T.bad=0;T.frames=0;T.ms=16.7;menuSync();}
  if(T.good>10&&QL<QSTART){setQuality(QL+1);T.good=0;T.frames=0;menuSync();}
}
let ACC=0,LAST=0,NOREN=false,FIRST=true;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  if(R&&!NOREN){render3d(dt);qualityTick(dt);}
  musicTick(S.paused);
  if(FIRST){FIRST=false;ARC.post('ready',{title:CAB.title,tickets:CAB.tickets});}
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',()=>{resize();camFits();});
if(EMBED)document.body.classList.add('embed');if(touchy)document.body.classList.add('touch');
/* ---------- boot ---------- */
if(!GL_OK){$('err').style.display='grid';}
else{
  resize();worldInit();fxInit();uiInit();camFits();menuSync();APP_attract();
  /*@@HOOK*/
  window.__game={S,G,TB,CAM,KEY,LATCH,PT,MOUSE,T,QP,RIVALS,tick,render3d,setQuality,get QL(){return QL;},get BEAT(){return BEAT;},
    ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,start2:APP_start2,attract:APP_attract,matchOver,uiShow,setOpt,
    auto(on,ri){G.auto=on?[mkAI(0,RIVALS[ri==null?3:ri],99),G.two?mkAI(1,RIVALS[ri==null?3:ri],98):null]:null;},
    norender(on){NOREN=!!on;},dots(on){DOTS=!!on;},AU,R,RT,SCENE,CAM3,screenToDeck,deckToScreen,
    info(){return {QL,VW,VH,W,H,DPR,calls:R.info.render.calls,tris:R.info.render.triangles,geos:R.info.memory.geometries,tex:R.info.memory.textures};}};
  /*HOOK@@*/
  requestAnimationFrame(frame);
}
