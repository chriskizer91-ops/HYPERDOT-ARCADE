/* ===================== what the camera sees each frame ===================== */
const V3=THREE.Vector3;
const CD={pos:new V3(0,1.3,6),tgt:new V3(0,1,0),w:0,sw:0,kw:0,iw:0,rw:0,orbit:0,last:'',studioT:0};
const _p=new V3(),_t=new V3(),_p2=new V3(),_t2=new V3();
let LASTSUPER=null,SUPERHOLD=0;

/* a K.O. landed by a super gets a longer, slower slow-motion and the camera circles the loser */
const _koHit=koHit;
koHit=function(A,D,p){
  const live=FIGHT&&FIGHT.phase==='fight'&&!D.dead;
  const sup=live&&((A.state==='attack'&&A.move&&A.move.super)||PROJ.some(q=>q.own===A&&!q.dead&&PT[q.type].h.super));
  _koHit(A,D,p);
  if(sup&&!FIGHT.demo){SLOW=.22;SLOWT=96;FIGHT.superKO=D;FIGHT.koOrbit=0;CAM.focusT=Math.max(CAM.focusT,140);}
  else if(live)FIGHT.superKO=null;
};

/* ---------- fighters ---------- */
function hideActors(){for(const a of ACTORS){a.grp.visible=false;for(const gh of a.ghosts)gh.m.visible=false;}}
function ghostFor(A,i){let gh=A.ghosts[i];if(!gh){const mat=mkGhost();const m=new THREE.Mesh(fighterGeo(A.def).geo,mat);m.frustumCulled=false;m.renderOrder=55;A.grp.parent.add(m);gh=A.ghosts[i]={m,mat};}return gh;}
function showActor(A,o){
  /* o: {x,y,face,J,chains,yaw,squint,flash,holo} */
  A.grp.visible=true;A.used=true;
  poseParts(A.def,o.x,o.y,o.face,o.J,A.mats,{yaw:o.yaw||0,squint:o.squint,z:o.z||0});
  poseCloth(A,{def:A.def,chains:o.chains});
  A.U.uFlash.value=o.flash||0;A.U.uGlitch.value=A.def.look.holo&&!reduce?(VR()<.35?1:0):0;
  A.refl.visible=Q().refl>0;if(A.cloth)A.grp.children[5].visible=Q().refl>0;
  A.U.uDimF.value=o.dim??1;
}
function drawFighters(al,dt){
  for(const A of ACTORS)for(const gh of A.ghosts)gh.m.visible=false;
  for(const F of FIGHT.f){
    const A=actorFor('f'+F.side,F.def),I=interpActor(F,al);
    if(F.hidden){A.grp.visible=false;continue;}
    let yaw=0;const m=F.move;
    if(F.state==='attack'&&m&&m.spin&&F.mf>=m.spin[0]&&F.mf<=m.spin[1])yaw=-(F.mf-m.spin[0]+al)*TAU/11*F.face;
    if(A.lastFace&&A.lastFace!==F.face&&!F.air)A.turn=1;A.lastFace=F.face;
    if(A.turn>0){yaw+=A.turn*Math.PI*-F.face;A.turn=Math.max(0,A.turn-dt*8);}
    showActor(A,{x:I.x,y:I.y,face:F.face,J:I.J,chains:I.chains,yaw,squint:F.hurtT>0||F.state==='kd',flash:F.flashT>0?.5:0});
    /* the boulder Magnus holds over his head */
    if(F.state==='attack'&&m&&m.hold&&F.mf>=m.hold[0]&&F.mf<=m.hold[1]){const J=F.Jr,hx=(J.haN[0]+J.haF[0])/2,hy=(J.haN[1]+J.haF[1])/2+.12;F._hold=[F.x+hx*F.face,F.y+hy];}else F._hold=null;
    /* afterimages from the engine's trail snapshots */
    const n=Math.min(F.trail.length,Q().ghosts);
    for(let i=0;i<n;i++){const t=F.trail[F.trail.length-1-i],gh=ghostFor(A,i),k=t.life/t.max;
      poseParts(F.def,t.x,t.y,t.face,t.Jr,gh.mat.uniforms.uPart.value,{});gh.mat.uniforms.uCol.value.setRGB(F.def.glow[0]/255,F.def.glow[1]/255,F.def.glow[2]/255);
      gh.mat.uniforms.uA.value=clamp(t.a*k*.9,0,1)*.75;gh.m.visible=true;}
  }
}

/* ---------- the fight camera ---------- */
const TANH=Math.tan(15*D2R);
function chestOf(F){const J=F.Jr;return [F.x+J.chest[0]*F.face,F.y+J.chest[1]];}
function camFight(al,dt){
  const c=CAM._s||{x:CAM.x,y:CAM.y,vh:CAM.vh,px:CAM.x,py:CAM.y,pvh:CAM.vh};
  const x=lerp(c.px,c.x,al),y=lerp(c.py,c.y,al),vh=lerp(c.pvh,c.vh,al),asp=RECT.w/RECT.h;
  let d=vh*1.06/(2*TANH);d=Math.max(d,vh*16/9*1.02/(2*TANH*asp));
  _p.set(x,1.16+y*.9+vh*.04,d);_t.set(x,.98+y,0);
  if(CAM.shake>.002&&!reduce){const s=CAM.shake;_p.x+=vr(-1,1)*s;_p.y+=vr(-1,1)*s*.6;_t.x+=vr(-1,1)*s*.5;}
  const Fi=FIGHT,step=dt*60;
  /* round 1 intro: start wide and high, sweep in */
  const iwT=Fi.phase==='intro'?1-EASE.smooth(clamp((Fi.pt-20)/90,0,1)):0;CD.iw=lerp(CD.iw,iwT,Math.min(1,.2*step));
  if(CD.iw>.002){const a=-.75*CD.iw;_p2.set(Math.sin(a)*9.2,2.6,Math.cos(a)*9.2);_t2.set(0,1.1,0);_p.lerp(_p2,CD.iw);_t.lerp(_t2,CD.iw);}
  /* super flash: sweep in on the fighter */
  let swT=0;
  if(SUPERF>0&&SUPEROWN){LASTSUPER=SUPEROWN;SUPERHOLD=0;swT=1;}
  const S=LASTSUPER;
  if(S){const k=clamp(Fi.superT/48,0,1),ch=chestOf(S),th=lerp(.18,.62,EASE.smooth(k))*S.face,dist=lerp(2.9,2.05,EASE.smooth(k));
    _p2.set(ch[0]+Math.sin(th)*dist,ch[1]+.18,Math.cos(th)*dist);_t2.set(ch[0]+S.face*.12,ch[1]+.12,0);
    if(swT){CD.sw=lerp(CD.sw,1,Math.min(1,.32*step));}else{CD.sw=lerp(CD.sw,0,Math.min(1,.16*step));if(CD.sw<.01)LASTSUPER=null;}
    _p.lerp(_p2,CD.sw);_t.lerp(_t2,CD.sw);}
  /* the super itself: a lower, wider angle while it plays out */
  let actT=0,actF=null;for(const F of Fi.f)if(F.state==='attack'&&F.move&&F.move.super&&SUPERF===0){actT=1;actF=F;}
  CD.aw=lerp(CD.aw||0,actT,Math.min(1,.1*step));
  if(CD.aw>.01&&actF){CD.af=actF;}
  if(CD.aw>.01&&CD.af){const F=CD.af,a=.2*F.face;_p2.set(_p.x+Math.sin(a)*d*.25,_p.y-.28,_p.z*1.1);_t2.set(_t.x,_t.y+.1,0);_p.lerp(_p2,CD.aw);_t.lerp(_t2,CD.aw);}
  /* a K.O. by a super: circle the loser in slow motion */
  const D=Fi.superKO;let kwT=0;
  if(D&&(Fi.phase==='ko')&&Fi.pt<150){kwT=1;Fi.koOrbit=(Fi.koOrbit||0)+dt;}
  CD.kw=lerp(CD.kw,kwT,Math.min(1,(kwT?.12:.05)*step));
  if(CD.kw>.01&&D){const a=(.25+Fi.koOrbit*.42)*-D.face,ch=chestOf(D),dd=3.1;_p2.set(ch[0]+Math.sin(a)*dd,Math.max(.5,ch[1]*.6+.35),Math.cos(a)*dd);_t2.set(ch[0],Math.max(.4,ch[1]*.7),0);_p.lerp(_p2,CD.kw);_t.lerp(_t2,CD.kw);}
  /* round won: push in on the winner */
  const Wn=Fi.winnerF,rwT=(Fi.phase==='roundend'&&Wn&&!Fi.demo)?1:0;CD.rw=lerp(CD.rw,rwT,Math.min(1,.05*step));
  if(CD.rw>.01&&Wn){const ch=chestOf(Wn),a=.42*Wn.face;_p2.set(ch[0]+Math.sin(a)*2.9,ch[1]+.25,Math.cos(a)*2.9);_t2.set(ch[0],ch[1]+.2,0);_p.lerp(_p2,CD.rw*.85);_t.lerp(_t2,CD.rw*.85);}
  CAM3.position.copy(_p);CAM3.lookAt(_t);CAM3.fov=30;
}

/* ---------- the studio: a dark room with an LED wall, for select / VS / continue / ending ---------- */
const STUDIO={};
(function(){
  const g=STUDIOG;
  const fl=new THREE.PlaneGeometry(40,24);fl.rotateX(-Math.PI/2);fl.translate(0,0,-6);
  const fm=new THREE.Mesh(fl,stdMat({color:0x120c1c,roughness:.35,metalness:.4}));fm.receiveShadow=true;g.add(fm);
  const wallMat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uA:{value:new THREE.Color(1,.8,.2)},uB:{value:new THREE.Color(.2,.9,1)},uSplit:{value:2},uK:{value:1}},depthWrite:true,
    vertexShader:`varying vec2 vU;void main(){vU=uv*vec2(160.,64.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uT,uSplit,uK;uniform vec3 uA,uB;varying vec2 vU;void main(){vec2 id=floor(vU),f=fract(vU)-.5;float d=length(f),m=1.-smoothstep(.28,.42,d);
      float s=fract((id.x+id.y)/14.+uT*.25);float st=step(.55,s)*.7+.3;float side=step(uSplit*80.+80.-id.y*uSplit*.35,id.x);vec3 c=mix(uA,uB,side);
      float spark=step(.995,fract(sin(dot(id,vec2(12.9,78.2))+floor(uT*3.))*43758.5));
      gl_FragColor=vec4(pow(c,vec3(2.2))*m*st*.22*uK+vec3(spark*m*.6)*uK+vec3(.004,.003,.007),1.);}`});
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(40,16),wallMat);wall.position.set(0,7,-5);g.add(wall);
  const rings=[];for(let i=0;i<2;i++){const m=new THREE.Mesh(TORGEO,addMat(0xffffff));m.rotation.x=Math.PI/2;m.renderOrder=61;g.add(m);rings.push(m);}
  const seam=new THREE.Mesh(new THREE.PlaneGeometry(.16,16),addMat(0xffffff));seam.position.set(0,6,-4.9);seam.renderOrder=62;g.add(seam);
  Object.assign(STUDIO,{wallMat,rings,seam});
  g.visible=false;
})();
function studioEnv(sun,sunK,sky,skyK,rim,refl){SUN.color.set(sun);SUN.intensity=sunK;SUN.position.set(-2,6,6);HEMI.color.set(sky);HEMI.groundColor.set('#0a0612');HEMI.intensity=skyK;SCENE.fog=null;
  SHU.uRim.value.setRGB(rim[0]/255,rim[1]/255,rim[2]/255);SHU.uOlCol.value.setRGB(.03,.02,.06);SHU.uRefl.value=refl;}
const col3=a=>new THREE.Color(a[0]/255,a[1]/255,a[2]/255);
/* puppets move at the same 60 steps a second as the fight */
let STACC=0;
function studioStep(dt){STACC+=dt;let n=0;while(STACC>=1/60&&n<4){STACC-=1/60;n++;CD.studioT++;for(const k in LIVEPUP){const p=LIVEPUP[k];animPuppet(p.p,p.pose,p.bob);}}if(n===4)STACC=0;}
const LIVEPUP={};
function livePup(key,id,face,x,y,pose,bob){const p=puppet(id,face,key);p.x=x;p.y=y||0;LIVEPUP[key]={p,pose,bob};return p;}
function showPup(key,p,yaw,dim,z){const A=actorFor('p'+key,p.def);showActor(A,{x:p.x,y:p.y,face:p.face,J:p.J,chains:p.chains,yaw,dim,z});return A;}
const SELX=(i,n)=>(i-(n-1)/2)*1.5;
function studioScene(sc){
  for(const k in LIVEPUP)delete LIVEPUP[k];
  const W_=STUDIO.wallMat.uniforms,t=CD.studioT;W_.uT.value=t/60;STUDIO.seam.visible=false;for(const r of STUDIO.rings)r.visible=false;
  if(sc==='select'){
    const ids=SELIDS(),n=ids.length,show=APP.mode==='arcade'?[0]:[0,1],hov=show.map(s=>APP.sel[s].i%n);
    const a=ROSTER[ids[hov[0]]],b=show.length>1?ROSTER[ids[hov[1]]]:a;
    W_.uA.value.copy(col3(a.glow));W_.uB.value.copy(col3(b.glow));W_.uSplit.value=show.length>1?1:0;W_.uK.value=.72;
    studioEnv('#fff4ee',1.6,'#6050a0',.7,[255,255,255],.3);
    ids.forEach((id,i)=>{
      const who=show.filter(s=>hov[s===0?0:1]===i),x=SELX(i,n),fwd=who.length?.7:0,locked=who.some(s=>APP.sel[s].done);
      const face=who.length===1&&who[0]===1?-1:1,p=livePup('sel'+i,id,face,x,0,locked?ROSTER[id].st.WIN:null,1);
      showPup('sel'+i,p,-face*.95,who.length?1:.38,fwd);
    });
    show.forEach((s,k)=>{const i=hov[k],r=STUDIO.rings[k];r.visible=true;r.position.set(SELX(i,n),.03,.7);const sc2=.62+.04*Math.sin(t*.12);r.scale.set(sc2,sc2,sc2);hdr(r,s===0?[255,210,63]:[47,230,255],APP.sel[s].done?4:2.2);
      lightReq(SELX(i,n),2.4,2.2,s===0?[255,220,140]:[140,230,255],4.5,7);});
    _p.set(0,1.55,7.7);_t.set(0,1.12,0);
  }else if(sc==='vs'){
    const v=APP.vs,a=ROSTER[v.p1],b=ROSTER[v.p2],sl=EASE.out(Math.min(1,APP.t/14));
    W_.uA.value.copy(col3(a.glow));W_.uB.value.copy(col3(b.glow));W_.uSplit.value=1;W_.uK.value=1.3;
    studioEnv('#ffffff',1.3,'#403060',.6,[255,255,255],.32);
    const pa=livePup('vsA',v.p1,1,-1.25-(1-sl)*4,0,a.st.INTRO),pb=livePup('vsB',v.p2,-1,1.25+(1-sl)*4,0,b.st.INTRO);
    showPup('vsA',pa,-.55);showPup('vsB',pb,.55);
    lightReq(-2.4,2,2.2,a.glow,7,7);lightReq(2.4,2,2.2,b.glow,7,7);
    STUDIO.seam.visible=true;STUDIO.seam.material.color.setRGB(3,3,3.4);STUDIO.seam.rotation.z=-.22+Math.sin(t*.7)*.01;
    _p.set(0,1.25,4.6);_t.set(0,1.05,0);
  }else if(sc==='cont'||sc==='gameover'){
    const d=ROSTER[APP.player];W_.uA.value.set(1,.24,.35);W_.uB.value.set(1,.24,.35);W_.uSplit.value=0;W_.uK.value=.6;
    studioEnv('#ff9aa8',.9,'#401020',.5,[255,60,90],.25);
    if(sc==='cont'){const p=livePup('cont',APP.player,1,-1.0,0,d.st.LOSE,0);showPup('cont',p,-.5,.85);lightReq(-1,2.4,1.6,[255,80,100],4,6);}
    _p.set(.2,1.1,4.2);_t.set(.2,.85,0);
  }else if(sc==='ending'){
    const d=ROSTER[APP.player];W_.uA.value.copy(col3(d.glow));W_.uB.value.copy(col3(d.glow));W_.uSplit.value=0;W_.uK.value=.7;
    studioEnv('#fff0d8',1.6,'#504070',.7,d.glow,.3);
    const p=livePup('end',APP.player,1,-1.3,0,d.st.WIN,1);showPup('end',p,-.6);lightReq(-1.3,2.6,1.8,d.glow,6,7);
    _p.set(.1,1.3,4.6);_t.set(.1,1.1,0);
  }else{
    W_.uA.value.set(.5,.4,1);W_.uB.value.set(.5,.4,1);W_.uSplit.value=0;W_.uK.value=.5;studioEnv('#ffffff',1,'#403060',.6,[255,255,255],.25);
    _p.set(0,1.3,6);_t.set(0,1.1,0);
  }
  const drift=Math.sin(t*.006)*.25;_p.x+=drift;
  CAM3.position.copy(_p);CAM3.lookAt(_t);CAM3.fov=30;
}

/* ---------- one frame ---------- */
const _rd=new V3();
let FEEDN=0,CAMO=null;const STATS={calls:0,tris:0};
const STAGESCREENS=new Set(['title','menu','options','howto','fight']);
const isStudio=()=>!STAGESCREENS.has(APP.screen)||!FIGHT;
function prepare3D(dt,al){
  if(!GL_OK)return;
  const sc=APP.screen,studio=isStudio();
  hideActors();
  STAGEG.visible=!studio;STUDIOG.visible=studio;FIGHTVIS=!studio;
  const mode=studio?'studio':'stage:'+(STAGE&&STAGE.id);if(mode!==CD.last){if(!studio)stageEnv(STAGE);CD.last=mode;}
  if(!studio){SUN.position.set(...STAGE.env.sunPos);stageTick(dt);drawFighters(al,dt);camFight(al,dt);}
  else{studioScene(sc);}
  if(CAMO){CAM3.position.set(CAMO[0],CAMO[1],CAMO[2]);CAM3.lookAt(CAMO[3],CAMO[4],CAMO[5]);}
  CAM3.aspect=RECT.w/RECT.h;CAM3.updateProjectionMatrix();CAM3.updateMatrixWorld();
  SHU.uTime.value=performance.now()/1000;
  const rd=studio?1:(STAGE.rimDir||1);_rd.set(rd,.3,-.35).normalize().transformDirection(CAM3.matrixWorldInverse);SHU.uRimDir.value.copy(_rd);
  SHU.uKeyDir.value.copy(SUN.position).normalize();SHU.uKeyCol.value.copy(SUN.color).multiplyScalar(SUN.intensity*.5);SHU.uAmb.value.copy(HEMI.color).multiplyScalar(HEMI.intensity*.35);
  SUN.target.position.set(CAM3.position.x,0,0);SUN.position.add(SUN.target.position);
  /* keep the shadow map steady: snap its centre to whole texels */
  if(SUN.castShadow){const ts=14/Math.max(256,Q().shadow);SUN.target.position.x=Math.round(SUN.target.position.x/ts)*ts;}
  SUN.target.updateMatrixWorld();
  drawFX3(al);
  if(!studio&&SUPERF>0&&SUPEROWN){const ch=chestOf(SUPEROWN);for(let i=0;i<22;i++){const a=VR()*TAU,r0=vr(1.4,2.4),r1=r0+vr(.8,2);
    const ca=Math.cos(a),sa=Math.sin(a);streak(BADD,ch[0]+(_cr.x*ca+_cu.x*sa)*r0,ch[1]+(_cr.y*ca+_cu.y*sa)*r0,(_cr.z*ca+_cu.z*sa)*r0,ch[0]+(_cr.x*ca+_cu.x*sa)*r1,ch[1]+(_cr.y*ca+_cu.y*sa)*r1,(_cr.z*ca+_cu.z*sa)*r1,.012,SUPEROWN.def.glow,.6,2.2);}
    const n=BADD.n;for(const [k,sz] of [['position',3],['aCol',4],['aUv',2],['aSp',2]]){const at=BADD.geo.attributes[k];at.clearUpdateRanges();at.addUpdateRange(0,Math.max(1,n*4*sz));at.needsUpdate=true;}BADD.geo.setDrawRange(0,n*6);}
  applyLights();
}
function render3D(){
  if(!GL_OK)return;
  const studio=isStudio();
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  /* the rooftop billboard shows a live feed of the fight, as LEDs */
  if(!studio&&STAGE&&STAGE.built&&STAGE.built.feed&&Q().id!=='low'){
    const fd=STAGE.built.feed;FEEDN++;
    if(!fd.rt)fd.rt=new THREE.WebGLRenderTarget(192,108,{type:HDR?THREE.HalfFloatType:THREE.UnsignedByteType});
    if(FEEDN%3===0&&FIGHT){const A=FIGHT.f[0],B=FIGHT.f[1],mx=(A.x+B.x)/2;fd.cam.position.set(mx+1.2,1.4,3.4);fd.cam.lookAt(mx,1.1,0);fd.cam.updateMatrixWorld();
      fd.mesh.visible=false;BADD.mesh.visible=false;renderer.setRenderTarget(fd.rt);renderer.setClearColor(0x0a0414,1);renderer.clear();renderer.render(SCENE,fd.cam);fd.mesh.visible=true;BADD.mesh.visible=true;fd.mat.uniforms.tF.value=fd.rt.texture;}
    fd.mat.uniforms.uDim.value=DIMK;
  }
  renderer.setRenderTarget(RT);renderer.setClearColor(0x05030a,1);renderer.clear();renderer.info.reset();renderer.render(SCENE,CAM3);STATS.calls=renderer.info.render.calls;STATS.tris=renderer.info.render.triangles;
  const bl=bloomPass(studio?1.25:1.15);
  HUDTEX.needsUpdate=true;
  const U=M_OUT.uniforms;U.tScene.value=RT.texture;U.tBloom.value=bl.texture;U.uDots.value=DOTS?1:0;U.uBloomK.value=DOTS?.55:.6;
  blit(M_OUT,null);
}
