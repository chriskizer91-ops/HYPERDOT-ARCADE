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
  const fr=Q().refl>0&&!Q().mirror;A.refl.visible=fr;if(A.clothRefl)A.clothRefl.visible=fr;
  A.U.uDimF.value=o.dim??1;
  const au=o.aura;A.U.uAura.value.set(au?au[0]:0,au?au[1]:0,au?au[2]:0,au?au[3]:0);
}
/* ---------- standing poses: a better-looking stance for each fighter while they stand still (looks only; the fight's
   own skeleton, hit boxes and timing are untouched). The pose blends in and out over a few frames. ---------- */
const POSEALT={
  kai:{A:{hy:.78,lean:4,head:-2,an:[.42,1.42],af:[.14,1.26],ln:[.28,0],lf:[-.3,0]},B:{hy:.77,lean:10,head:-8,an:[.32,1.47],af:[.18,1.45],ln:[.26,0],lf:[-.28,0]}},
  runa:{A:{hy:.72,lean:12,head:-6,an:[.4,1.3],af:[.14,1.22],ln:[.34,0],lf:[-.34,0]},B:{hy:.7,lean:18,head:-12,an:[.52,1.12],af:[-.02,1.34],ln:[.36,0],lf:[-.34,0]}},
  magnus:{A:{hy:.75,lean:8,head:-2,an:[.4,1.3],af:[.24,1.24],ln:[.34,0],lf:[-.36,0]},B:{hy:.78,lean:5,head:3,an:[.34,1.42],af:[.2,1.4],ln:[.3,0],lf:[-.32,0]}},
  nova:{A:{hy:.84,lean:0,head:0,an:[.42,1.24],af:[.1,1.02],ln:[.16,0],lf:[-.2,0]},B:{hy:.86,lean:-2,head:4,an:[.3,1.4],af:[-.04,1.36],ln:[.14,0],lf:[-.18,0]}},
  echo:{A:{hy:.79,lean:6,head:-2,an:[.44,1.36],af:[.18,1.3],ln:[.28,0],lf:[-.3,0]},B:{hy:.76,lean:12,head:-10,an:[.36,1.48],af:[.2,1.46],ln:[.3,0],lf:[-.32,0]}}};
const POSEPICK={kai:null,runa:'B',magnus:'A',nova:'A',echo:'A'};   /* Christopher's picks: Kai keeps his own stance */
const ALTS0={};
function altS0(def){const k=POSEPICK[def.id],o=k&&POSEALT[def.id]&&POSEALT[def.id][k];if(!o)return null;const key=def.id+k;return ALTS0[key]||(ALTS0[key]=P(def.st.S0,o));}
const _altP={},_altJ={};
function altPose(F,A,I,dt){
  const s0=altS0(F.def),want=s0&&F.state==='idle'&&!F.air?1:0;
  A.pw=lerp(A.pw||0,want,Math.min(1,dt*10));if(!s0||A.pw<.01)return I;
  const t=FRAMET/60+F.side*1.7,br=Math.sin(t*2.2);
  cpPose(s0,_altP);_altP.hy-=.006*(1+br)*.5;_altP.an[1]+=.01*br;_altP.af[1]+=.01*br;
  const Ja=solve(_altP,F.def.body,{}),w=A.pw,J=A._jb||(A._jb={});
  for(const k in I.J){const a=I.J[k],b=Ja[k];if(a&&b&&typeof a!=='number'&&a.length===2){const d=J[k]||(J[k]=[0,0]);d[0]=a[0]+(b[0]-a[0])*w;d[1]=a[1]+(b[1]-a[1])*w;}else J[k]=a;}
  for(const k of ['dir','q','hu','hfw']){const d=J[k];if(d){const l=Math.hypot(d[0],d[1])||1;d[0]/=l;d[1]/=l;}}
  /* the cloth hangs from the moved body: shift each chain by how far its anchor moved */
  const chains=I.chains.map((c,i)=>{const o=F.def.chains&&F.def.chains[i];if(!c||!c.p||!o)return c;
    const a0=anchorL(o.anchor,I.J),a1=anchorL(o.anchor,J),dx=(a1[0]-a0[0])*F.face,dy=a1[1]-a0[1];
    return {p:c.p.map(q=>[q[0]+dx,q[1]+dy])};});
  return {x:I.x,y:I.y,J,chains};
}
function drawFighters(al,dt){
  for(const A of ACTORS)for(const gh of A.ghosts)gh.m.visible=false;
  for(const F of FIGHT.f){
    const A=actorFor('f'+F.side,F.def),I=altPose(F,A,interpActor(F,al),dt);
    if(F.hidden){A.grp.visible=false;continue;}
    let yaw=0;const m=F.move;
    if(F.state==='attack'&&m&&m.spin&&F.mf>=m.spin[0]&&F.mf<=m.spin[1])yaw=-(F.mf-m.spin[0]+al)*TAU/11*F.face;
    if(A.lastFace&&A.lastFace!==F.face&&!F.air)A.turn=1;A.lastFace=F.face;
    if(A.turn>0){yaw+=A.turn*Math.PI*-F.face;A.turn=Math.max(0,A.turn-dt*8);}
    showActor(A,{x:I.x,y:I.y,face:F.face,J:I.J,chains:I.chains,yaw,squint:F.hurtT>0||F.state==='kd',flash:F.flashT>0?.5:0,aura:auraOf(F)});
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
  const cin=Math.max(CD.sw,CD.kw,CD.rw*.8,CD.iw*.6);POST.dof.f=_p.distanceTo(_t);POST.dof.r=lerp(34,4.5,cin);POST.dof.m=lerp(1.4,3.2,cin);
}

/* ---------- the studio: a dark room with an LED wall, for select / VS / continue / ending ---------- */
const STUDIO={};
(function(){
  const g=STUDIOG;
  const fl=new THREE.PlaneGeometry(40,24);fl.rotateX(-Math.PI/2);fl.translate(0,0,-6);
  const fm=new THREE.Mesh(fl,mirrorize(stdMat({color:0x120c1c,roughness:.35,metalness:.4}),{k:.55,rough:1}));fm.receiveShadow=true;g.add(fm);STUDIO.floors=[fm];
  const wallMat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uA:{value:new THREE.Color(1,.8,.2)},uB:{value:new THREE.Color(.2,.9,1)},uSplit:{value:2},uK:{value:1}},depthWrite:true,
    vertexShader:`varying vec2 vU;void main(){vU=uv*vec2(160.,64.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uT,uSplit,uK;uniform vec3 uA,uB;varying vec2 vU;void main(){vec2 id=floor(vU),f=fract(vU)-.5;float d=length(f),m=1.-smoothstep(.28,.42,d);
      float s=fract((id.x+id.y)/14.+uT*.25);float st=step(.55,s)*.7+.3;float side=step(uSplit*80.+80.-id.y*uSplit*.35,id.x);vec3 c=mix(uA,uB,side);
      float spark=step(.995,fract(sin(dot(id,vec2(12.9,78.2))+floor(uT*3.))*43758.5));
      gl_FragColor=vec4(pow(c,vec3(2.2))*m*st*.22*uK+vec3(spark*m*.6)*uK+vec3(.004,.003,.007),1.);}`});
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(40,16),wallMat);wall.position.set(0,7,-5);g.add(wall);
  const rings=[];for(let i=0;i<2;i++){const m=new THREE.Mesh(TORGEO,addMat(0xffffff));m.rotation.x=Math.PI/2;m.renderOrder=61;g.add(m);rings.push(m);}
  const seam=new THREE.Mesh(new THREE.PlaneGeometry(.16,16),addMat(0xffffff));seam.position.set(0,6,-4.9);seam.renderOrder=62;g.add(seam);
  Object.assign(STUDIO,{wallMat,rings,seam,floors:STUDIO.floors});
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
  CAM3.position.copy(_p);CAM3.lookAt(_t);CAM3.fov=30;POST.dof.f=_p.distanceTo(_t)-.2;POST.dof.r=sc==='vs'?2.2:4;POST.dof.m=sc==='vs'?7:5;
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
  _rd.copy(SUN.position).normalize();SHU.uKeyDir.value.copy(_rd);SHU.uKeyDirV.value.copy(_rd).transformDirection(CAM3.matrixWorldInverse);
  SHU.uKeyColF.value.copy(SUN.color).multiplyScalar(SUN.intensity*.55);SHU.uSkyC.value.copy(HEMI.color).multiplyScalar(HEMI.intensity*.6);SHU.uGndC.value.copy(HEMI.groundColor).multiplyScalar(HEMI.intensity*.6);
  SHU.uKeyDir.value.copy(SUN.position).normalize();SHU.uKeyCol.value.copy(SUN.color).multiplyScalar(SUN.intensity*.5);SHU.uAmb.value.copy(HEMI.color).multiplyScalar(HEMI.intensity*.35);
  SUN.target.position.set(CAM3.position.x,0,0);SUN.position.add(SUN.target.position);
  /* keep the shadow map steady: snap its centre to whole texels */
  if(SUN.castShadow){const ts=14/Math.max(256,Q().shadow);SUN.target.position.x=Math.round(SUN.target.position.x/ts)*ts;}
  SUN.target.updateMatrixWorld();
  postTick(dt,studio);
  drawFX3(al);
  if(!studio&&SUPERF>0&&SUPEROWN){const ch=chestOf(SUPEROWN);for(let i=0;i<22;i++){const a=VR()*TAU,r0=vr(1.4,2.4),r1=r0+vr(.8,2);
    const ca=Math.cos(a),sa=Math.sin(a);streak(BADD,ch[0]+(_cr.x*ca+_cu.x*sa)*r0,ch[1]+(_cr.y*ca+_cu.y*sa)*r0,(_cr.z*ca+_cu.z*sa)*r0,ch[0]+(_cr.x*ca+_cu.x*sa)*r1,ch[1]+(_cr.y*ca+_cu.y*sa)*r1,(_cr.z*ca+_cu.z*sa)*r1,.012,SUPEROWN.def.glow,.6,2.2);}
    const n=BADD.n;for(const [k,sz] of [['position',3],['aCol',4],['aUv',2],['aSp',2]]){const at=BADD.geo.attributes[k];at.clearUpdateRanges();at.addUpdateRange(0,Math.max(1,n*4*sz));at.needsUpdate=true;}BADD.geo.setDrawRange(0,n*6);}
  applyLights();
}
/* ---------- the mirror view under wet floors (as three.js's Reflector does it: a camera reflected in the floor, with its
   near plane tilted onto the floor so nothing below it is drawn) ---------- */
const MIRCAM=new THREE.PerspectiveCamera(),TEXMAT=new THREE.Matrix4(),_mrot=new THREE.Matrix4(),_mc=new V3(),_ml=new V3(),_mt=new V3(),_mpl=new THREE.Plane(),_mcp=new THREE.Vector4(),_mq=new THREE.Vector4();
function updateMirrorCam(){
  const cam=CAM3;_mc.setFromMatrixPosition(cam.matrixWorld);MIRCAM.position.set(_mc.x,-_mc.y,_mc.z);
  _mrot.extractRotation(cam.matrixWorld);_ml.set(0,0,-1).applyMatrix4(_mrot).add(_mc);_mt.set(_ml.x,-_ml.y,_ml.z);
  MIRCAM.up.set(0,1,0).applyMatrix4(_mrot);MIRCAM.up.y=-MIRCAM.up.y;MIRCAM.lookAt(_mt);MIRCAM.near=cam.near;MIRCAM.far=cam.far;MIRCAM.updateMatrixWorld();
  MIRCAM.projectionMatrix.copy(cam.projectionMatrix);
  TEXMAT.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);TEXMAT.multiply(MIRCAM.projectionMatrix);TEXMAT.multiply(MIRCAM.matrixWorldInverse);
  _mpl.set(new V3(0,1,0),0);_mpl.applyMatrix4(MIRCAM.matrixWorldInverse);_mcp.set(_mpl.normal.x,_mpl.normal.y,_mpl.normal.z,_mpl.constant);
  const pm=MIRCAM.projectionMatrix.elements;
  _mq.x=(Math.sign(_mcp.x)+pm[8])/pm[0];_mq.y=(Math.sign(_mcp.y)+pm[9])/pm[5];_mq.z=-1;_mq.w=(1+pm[10])/pm[14];
  _mcp.multiplyScalar(2/_mcp.dot(_mq));pm[2]=_mcp.x;pm[6]=_mcp.y;pm[10]=_mcp.z+1-.003;pm[14]=_mcp.w;
  MIRCAM.projectionMatrixInverse.copy(MIRCAM.projectionMatrix).invert();
}
/* ---------- post effects driven by the fight: shockwaves, colour fringing, impact frames, super zoom ---------- */
const POST={shocks:[],ca:0,imp:0,zoom:0,dof:{f:6,r:14,m:2.2},grade:{lift:new V3(),gain:new V3(1,1,1),gam:new V3(1,1,1),sat:1.1,con:1.04},rayK:0};
const STUDIOGRADE={lift:[.012,0,.022],gain:[1.03,1,1.05],gam:[1,1,1],sat:1.1,con:1.04};
const _pp=new V3();
function toUV(x,y,z){_pp.set(x,y,z).project(CAM3);return [_pp.x*.5+.5,_pp.y*.5+.5,_pp.z];}
function postTick(dt,studio){
  const P_=POST,red=reduce;
  for(const e of IMPACTS){if(studio||red)continue;const u=toUV(e.x,e.y,.2);if(u[2]>1)continue;
    const big=e.kind==='super',hv=e.kind==='heavy'||e.kind==='elec'||e.kind==='slash'||e.kind==='plasma';
    const s=big?1.5:hv?clamp(e.dmg/85,.35,1.1):e.kind==='block'?.22:.14;
    P_.shocks.push({x:u[0],y:u[1],r:0,s,v:big?.9:.75});if(P_.shocks.length>3)P_.shocks.shift();
    P_.ca=Math.min(2.2,P_.ca+s*1.1);if(big||e.dmg>=88)P_.imp=big?4:2;}
  IMPACTS.length=0;
  FLASHG=Math.max(0,FLASHG-dt*5);
  for(const k of P_.shocks){k.r+=dt*k.v;k.s*=Math.exp(-dt*4.2);}P_.shocks=P_.shocks.filter(k=>k.s>.02&&k.r<1.4);
  const sup=!studio&&SUPERF>0&&SUPEROWN;
  P_.ca=Math.max(sup?.7:0,P_.ca*Math.exp(-dt*7));
  P_.zoom=lerp(P_.zoom,sup&&!red?.5:0,Math.min(1,dt*(sup?10:6)));
  const U=M_OUT.uniforms;
  for(let i=0;i<3;i++){const k=P_.shocks[i];if(k)U.uShock.value[i].set(k.x,k.y,k.r,k.s);else U.uShock.value[i].set(0,0,0,0);}
  U.uCA.value=P_.ca;U.uImpact.value=P_.imp>0?.85:0;if(P_.imp>0)P_.imp--;
  U.uZoom.value=P_.zoom;if(sup){const c=chestOf(SUPEROWN),u=toUV(c[0],c[1],0);U.uZoomC.value.set(u[0],u[1]);}
  /* grade and light shafts follow the stage (or the studio) */
  const gd=studio?STUDIOGRADE:STAGE.env.grade,k=Math.min(1,dt*3),G_=P_.grade;
  G_.lift.lerp(_pp.set(...gd.lift),k);G_.gain.lerp(_pp.set(...gd.gain),k);G_.gam.lerp(_pp.set(...gd.gam),k);G_.sat=lerp(G_.sat,gd.sat,k);G_.con=lerp(G_.con,gd.con,k);
  U.uLift.value.copy(G_.lift);U.uGain.value.copy(G_.gain);U.uGam.value.copy(G_.gam);U.uSat.value=G_.sat;U.uContrast.value=G_.con;
  U.uTime.value=performance.now()/1000;
  /* lensing around Nova's plasma star */
  const L=!studio&&!red&&NOVALENS;
  if(L){const c=toUV(L.x,L.y,L.z),e=toUV(L.x,L.y+L.r,L.z);U.uLens.value.set(c[0],c[1],Math.max(.02,Math.abs(e[1]-c[1])),c[2]<1?L.k:0);}else U.uLens.value.w=0;
}
function render3D(){
  if(!GL_OK)return;
  const studio=isStudio(),q=Q();
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  /* the rooftop billboard shows a live feed of the fight, as LEDs */
  if(!studio&&STAGE&&STAGE.built&&STAGE.built.feed&&q.id!=='low'){
    const fd=STAGE.built.feed;FEEDN++;
    if(!fd.rt)fd.rt=new THREE.WebGLRenderTarget(192,108,{type:HDR?THREE.HalfFloatType:THREE.UnsignedByteType});
    if(FEEDN%3===0&&FIGHT){const A=FIGHT.f[0],B=FIGHT.f[1],mx=(A.x+B.x)/2;fd.cam.position.set(mx+1.2,1.4,3.4);fd.cam.lookAt(mx,1.1,0);fd.cam.updateMatrixWorld();
      fd.mesh.visible=false;BADD.mesh.visible=false;renderer.setRenderTarget(fd.rt);renderer.setClearColor(0x0a0414,1);renderer.clear();renderer.render(SCENE,fd.cam);fd.mesh.visible=true;BADD.mesh.visible=true;fd.mat.uniforms.tF.value=fd.rt.texture;}
    fd.mat.uniforms.uDim.value=DIMK;
  }
  renderer.info.reset();
  /* wet floors: render the mirror view */
  const floors=studio?STUDIO.floors:(STAGE&&STAGE.floors)||[];
  if(RTM&&floors.length){updateMirrorCam();MIRU.uTexMat.value.copy(TEXMAT);MIRU.uMirOn.value=0;for(const f of floors)f.visible=false;
    renderer.setRenderTarget(RTM);renderer.setClearColor(0x05030a,1);renderer.clear();renderer.render(SCENE,MIRCAM);
    for(const f of floors)f.visible=true;MIRU.tMir.value=RTM.texture;MIRU.uMirOn.value=1;}
  else MIRU.uMirOn.value=0;
  renderer.setRenderTarget(RT);renderer.setClearColor(0x05030a,1);renderer.clear();renderer.render(SCENE,CAM3);STATS.calls=renderer.info.render.calls;STATS.tris=renderer.info.render.triangles;
  const bl=bloomPass(studio?1.25:1.15);
  const U=M_OUT.uniforms;
  /* light shafts toward the stage's light */
  let ray=null;if(!studio&&RTR&&STAGE.env.rays&&!DOTS){const r=STAGE.env.rays,u=toUV(r.p[0],r.p[1],r.p[2]);
    if(u[2]<1){const vis=clamp(1.4-Math.max(Math.abs(u[0]-.5),Math.abs(u[1]-.5))*1.6,0,1);if(vis>0){ray=raysPass(u[0],u[1],.92);U.uRayK.value=r.k*vis*DIMK;U.uRayC.value.set(r.c);}}}
  if(!ray){U.uRayK.value=0;}U.tRay.value=ray?ray.texture:BLACK;
  const st=streakPass();U.tStreak.value=st?st.texture:BLACK;U.uStreakK.value=st?(studio?.5:(STAGE.env.streak??.6)):0;
  const dof=!DOTS&&RTD?dofPass(POST.dof.f,POST.dof.r,POST.dof.m):null;U.tDof.value=dof?dof.texture:BLACK;U.uDofOn.value=dof?1:0;
  HUDTEX.needsUpdate=true;
  U.tScene.value=RT.texture;U.tBloom.value=bl.texture;U.uDots.value=DOTS?1:0;U.uBloomK.value=DOTS?.55:.6;
  blit(M_OUT,null);
}
