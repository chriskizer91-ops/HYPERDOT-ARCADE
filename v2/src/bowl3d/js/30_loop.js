/* =====================================================================================
   30. FRAME LOOP — fixed 60 Hz game ticks (the physics substeps at 240 Hz inside them),
       one 3D render per display frame, and the frame-rate watch that steps quality down.
   ===================================================================================== */
const UIP={},T={fps:60,ms:16.7,bad:0,good:0,frames:0};
function setPause(on){if(S.mode!=='play')on=false;S.paused=on;$('menu').hidden=!on;document.body.classList.toggle('paused',on);if(on){menuSync();}}
function world(dt,c,e,tap){
  gameTick(dt,c,e,tap);camTick(dt);
  if(DMD.on){DMD.t+=dt;if(DMD.t>=DMD.dur)DMD.on=false;}
  if(MKt>0){MKt-=dt;if(MKt<=0)MKmsg='';}
  if(S.toast){S.toast.t+=dt;if(S.toast.t>1.2)S.toast=null;}
  if(S.shake>0)S.shake=Math.max(0,S.shake-dt*2.2);
  if(G.chase!=null&&G.chase>=0){G.chase+=dt*(G.shot?G.shot.spd*1.6:12);if(G.chase>LN.deck+2)G.chase=-9;}
  fxTick(dt);rumbleTick(dt);
}
function tick(dt){
  const c=readCtl(),e={},cc={ok:c.ok,back:c.back,pause:c.pause,a:c.a||c.ok,b:c.b,d:c.d};
  for(const k in cc){e[k]=cc[k]&&!UIP[k];UIP[k]=cc[k];}
  const tap=PTR.pressed;S.t+=dt;document.body.classList.toggle('playing',S.mode!=='title');
  if(S.mode==='title'){world(dt,c,e,false);GST.rel=false;if(e.ok||tap)APP_start();else if(e.back&&EMBED)ARC.exit();}
  else if(S.mode==='play'){if(e.pause)setPause(!S.paused);else if(!S.paused)world(dt,c,e,tap);}
  else if(S.mode==='over'){world(dt,c,e,false);overTick(dt);if(S.ot>1.5&&(e.ok||tap))APP_attract();else if(EMBED&&S.ot>1.5&&e.back)ARC.exit();}
}
/* physics -> meshes, uniforms, LED screens, HUD; then reflection, scene, pin cam and post */
const _pq=new THREE.Quaternion();let LEDK=0,NBK=-1;
function syncWorld(){
  const b=PW.ball;BALL3.visible=b.on&&!b.gone;BALL3.position.set(b.x,b.y,b.z);BALL3.quaternion.set(b.qx,b.qy,b.qz,b.qw);
  for(let i=0;i<10;i++){const p=PW.pins[i],m=PINS3[i];m.visible=p.on&&!p.gone;if(m.visible){m.position.set(p.x,p.y,p.z);m.quaternion.set(p.qx,p.qy,p.qz,p.qw);}}
  const sw=PW.sw;SWEEP.visible=PS.on&&sw.y<.78;SWEEP.position.set(0,sw.y+.05,sw.z);
  TABLE.visible=PS.on&&PS.ty<.95;TABLE.position.y=PS.ty;
  const onLane=b.on&&!b.gone&&b.z<LN.pit;BLOB.visible=onLane;BLOB.position.set(b.x,0,b.z);blobMat.opacity=.55*clamp(1-(b.y-BR)*4,0,1)*(b.z<15?1:.4);
  BALLLIGHT.position.set(b.x,b.y+.05,b.z);BALLLIGHT.color.setRGB(BSTY.a[0],BSTY.a[1],BSTY.a[2]);BALLLIGHT.intensity=onLane?.5:0;
  const nk=NBR.join(',');if(nk!==NBK){NBK=nk;nbSync();}
  U.uT.value=S.t;U.uFx.value.set(G.strobe,G.pinFlash,1,0);U.uStrobe.value=G.strobe>.4&&!reduce?((S.t*14|0)%2)*G.strobe:G.strobe*.3;
  U.uChase.value=G.chase!=null&&G.chase>=0?G.chase:-9;
  U.uAim.value.set(AIMU.x,AIMU.a,AIMU.on?1:0,AIMU.al);U.uBallA.value.setRGB(BSTY.a[0],BSTY.a[1],BSTY.a[2]);U.uBallB.value.setRGB(BSTY.b[0],BSTY.b[1],BSTY.b[2]);
  M_COMP.uniforms.uFlash.value=reduce?0:Math.max(0,G.strobe-.7)*.5;
  spotsTick(S.t,G.strobe);
  if((LEDK++&1)===0){paintMask();if(LEDK%4===1)paintOverhead();}
}
function render3d(){
  R.info.reset();syncWorld();applyCam();hud();
  if(MIRROR.rt)renderMirror(CAM3);
  R.setRenderTarget(RT.scene);RT.scene.scissorTest=false;RT.scene.viewport.set(0,0,VW,VH);R.render(SCENE,CAM3);
  if(PIPC.on&&PIPC.w>8){const sx=VW/W,sy=VH/H,x=Math.round(PIPC.x*sx),w=Math.round(PIPC.w*sx),h=Math.round(PIPC.h*sy),y=VH-Math.round(PIPC.y*sy)-h;
    const ro=U.uReflOn.value;U.uReflOn.value=0;RT.scene.viewport.set(x,y,w,h);RT.scene.scissor.set(x,y,w,h);RT.scene.scissorTest=true;R.setRenderTarget(RT.scene);R.render(SCENE,PIP3);
    RT.scene.scissorTest=false;RT.scene.viewport.set(0,0,VW,VH);U.uReflOn.value=ro;}
  post();
}
/* frame-rate watch: if frames take too long for a couple of seconds, drop a level (never while pinned) */
function qualityTick(dt){
  T.frames++;T.ms+=(dt*1000-T.ms)*.05;if(T.frames<90||QPIN!=null||S.paused)return;
  if(T.ms>24){T.bad+=dt;T.good=0;}else if(T.ms<13){T.good+=dt;T.bad=0;}else{T.bad=Math.max(0,T.bad-dt);T.good=0;}
  if(T.bad>2.2&&QL>0){setQuality(QL-1);T.bad=0;T.frames=0;T.ms=16.7;}
  if(T.good>10&&QL<QSTART){setQuality(QL+1);T.good=0;T.frames=0;}
}
let ACC=0,LAST=0,NOREN=false,FIRST=true;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  if(R&&!NOREN){render3d();qualityTick(dt);}
  musicTick(S.paused);
  if(FIRST){FIRST=false;ARC.post('ready',{title:CAB.title,tickets:CAB.tickets});}
  requestAnimationFrame(frame);
}
/* ---------- chrome: top chips, the pause menu ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-'+CAB.id+'-mute',AU.muted?'1':'0');setVolume();menuSync();try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
function toggleDots(){DOTS=!DOTS;store.set('hd-'+CAB.id+'-dots',DOTS?'1':'0');menuSync();}
function cycleQ(){const order=[null,0,1,2],i=order.indexOf(QPIN);QPIN=order[(i+1)%4];store.set('hd-'+CAB.id+'-q',QPIN==null?'auto':String(QPIN));setQuality(QPIN==null?QSTART:QPIN);T.frames=0;menuSync();}
function menuSync(){$('snd').textContent=AU.muted?'Sound off':'Sound on';$('mSnd').textContent=AU.muted?'Sound: off':'Sound: on';
  $('dots').classList.toggle('on',DOTS);$('mDots').textContent=DOTS?'Dots: on':'Dots: off';$('mQ').textContent='Graphics: '+(QPIN==null?'auto ('+QP[QL].name.toLowerCase()+')':QP[QPIN].name.toLowerCase());}
const btn=(id,f)=>$(id).addEventListener('click',e=>{audioInit();f();e.currentTarget.blur();});
btn('snd',toggleSound);btn('dots',toggleDots);btn('pz',()=>setPause(!S.paused));btn('pauseBtn',()=>setPause(!S.paused));
btn('mRes',()=>setPause(false));btn('mRe',()=>{setPause(false);APP_start();});btn('mDots',toggleDots);btn('mQ',cycleQ);btn('mSnd',toggleSound);btn('mEx',()=>{setPause(false);ARC.exit();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',()=>{resize();});
if(EMBED)document.body.classList.add('embed');if(touchy)document.body.classList.add('touch');
$('mEx').hidden=!EMBED;$('keys').innerHTML=CAB.keys;
/* ---------- boot ---------- */
if(!GL_OK){$('err').style.display='grid';}
else{
  resize();worldInit();menuSync();APP_attract();paintMask();paintOverhead();
  /*@@HOOK*/
  window.__game={S,G,PW,PS,CAM,KEY,LATCH,PTR,GST,T,DMD,QP,tick,sheet,rackState,standMask,isSplit,render3d,setQuality,get QL(){return QL;},
    ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,
    auto(on,skill){G.auto=!!on;if(skill!=null)G.autoSkill=skill;if(on&&G.ph==='aim'&&!G.ai)aiStart();},
    bowl(x0,ang,spd,spin){G.x0=x0;G.ai=null;throwBall(x0,ang,spd,spin);},norender(on){NOREN=!!on;},dots(on){DOTS=!!on;},AU,gameOver,evalRoll,dmd,maskMsg,
    U,SCENE,MIRROR,laneMat,R,RT,CAM3,BALL3,PINS3,HEMI,KEY3,PINL,TRL,info(){return {QL,VW,VH,W,H,DPR,calls:R.info.render.calls,tris:R.info.render.triangles,geos:R.info.memory.geometries,tex:R.info.memory.textures};}};
  /*HOOK@@*/
  requestAnimationFrame(frame);
}
