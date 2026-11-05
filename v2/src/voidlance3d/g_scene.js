/* ===================== cameras (as the original, with the focal length set from the HUD's dot rows) ===================== */
const CAM={pos:[0,0,0],q:qid(),F:229,F0:229,cy:.4,cine:{t:0,dur:0,kind:'',subj:null,pos:[0,0,0],q:qid(),ang:0},death:null,boostF:1};
const FOCAL=1.0594;   /* F = H*1.0594 keeps the original's 80-degree view across a 16:9 screen */
const ENG_POS={lance:[[1.05,-.1,-6.9],[-1.05,-.1,-6.9]],sparrow:[[1.05,-.1,-6.9],[-1.05,-.1,-6.9]],dart:[[0,0,-2.2]],ace:[[0,0,-2.2]],wasp:[[0,0,-5.5]],hammer:[[3.9,-.4,-4.7],[-3.9,-.4,-4.7]],viper:[[1.1,0,-8.2],[-1.1,0,-8.2]]};
const ENG_R={lance:.56,sparrow:.56,dart:.5,ace:.5,wasp:.7,hammer:.9,viper:.72};
function pickShot(){
  const C=CAM.cine,ships=ENT.filter(e=>e.kind==='ship'&&!e.dead&&!e.dying),caps=ENT.filter(e=>e.kind==='cap'&&!e.dead);
  const r=Math.random();C.t=0;C.dur=rnd(4.5,7);
  if(caps.length&&r<.22){C.kind='orbit';C.subj=pick(caps);C.ang=Math.random()*TAU;C.h=rnd(-.3,.5);}
  else if(ships.length){C.subj=pick(ships);C.kind=r<.62?'chase':'fly';if(C.kind==='fly'){const s=C.subj;C.pos=vadd(vaddm(s.pos.slice(),s.vel,2.2),vadd(vmul(qR(s.q),rnd(-30,30)),vmul(qU(s.q),rnd(8,22))));C.q=qlook(vsub(s.pos,C.pos),[0,1,0]);}else{C.q=C.subj.q.slice();}}
  else{C.kind='still';C.pos=[0,0,-200];C.q=qid();}
}
function updCamera(dt){
  const C=CAM,F0=H*FOCAL;C.F0=F0;
  if(G.mode==='title'||G.mode==='howto'||G.mode==='options'&&!G.optFromPause||G.demoCam){
    const S2=C.cine;S2.t+=dt;if(!S2.subj||S2.subj.dead||S2.subj.dying||S2.t>S2.dur)pickShot();const s=S2.subj;
    if(S2.kind==='chase'&&s){S2.q=qslerp(S2.q,s.q,Math.min(1,dt*3));C.pos=vadd(s.pos,qrot(S2.q,[s.r*1.2,s.r*1.8,-s.r*8]));C.q=qnorm(qmul(S2.q,qaxis([1,0,0],.1)));}
    else if(S2.kind==='fly'&&s){C.pos=S2.pos;C.q=qlook(vsub(s.pos,S2.pos),[0,1,0]);}
    else if(S2.kind==='orbit'&&s){S2.ang+=dt*.06;const R=s.r*1.5;C.pos=vadd(s.pos,[Math.cos(S2.ang)*R,s.r*S2.h,Math.sin(S2.ang)*R]);C.q=qlook(vsub(s.pos,C.pos),[0,1,0]);}
    else{C.pos=S2.pos;C.q=S2.q;}
    C.F=F0;C.cy=.5;return;}
  const P=PL;if(!P)return;
  if(P.dead){if(!C.death)C.death={p:P.pos.slice(),a:0};C.death.a+=dt*.35;const R=70;C.pos=vadd(C.death.p,[Math.cos(C.death.a)*R,24,Math.sin(C.death.a)*R]);C.q=qlook(vsub(C.death.p,C.pos),[0,1,0]);C.F=F0;C.cy=.5;return;}
  C.death=null;
  C.boostF+=((PLS.boostHeld?.86:1)-C.boostF)*Math.min(1,dt*3);
  if(G.camMode===2){C.q=qslerp(C.q,P.q,Math.min(1,dt*7));C.pos=vadd(P.pos,qrot(C.q,[0,5.4,-21.5]));C.cy=.52;}
  else{C.q=P.q.slice();C.pos=toWorld(P,[0,.9,1.4]);C.cy=G.camMode===0?.4:.5;}
  if(G.shake>0&&!reduce){const k=G.shake*G.shake*.025;C.q=qnorm(qmul(C.q,qaxis(vnorm(vrand(1)),k*rnd(.4,1))));}
  C.F=F0*C.boostF;
}

/* ===================== the cockpit: a real 3D dashboard and canopy, built in camera space =====================
   Its outline and screens are unprojected from the same HUD-dot layout the instruments are drawn in, so the
   radar, the target screen and the status bars sit exactly on the dashboard's screens. It turns with you, so the
   sun sweeps across it. */
const DASH={};
function dashLayout(){
  const y0=Math.round(H*.79),hy=Math.round(H*.735),Wd=LANDT?Math.round(W*.6):Math.min(W,Math.round(H*1.78)),x0=Math.round((W-Wd)/2),X=f=>x0+Math.round(Wd*f);
  Object.assign(DASH,{y0,hy,x0,Wd,X});
  DASH.radar=[X(.205),y0+3,Math.round(Wd*.15),H-y0-5];
  DASH.tgt=[X(.385),hy+4,Math.round(Wd*.23),H-hy-6];
  DASH.stat=[X(.645),y0+3,Math.round(Wd*.15),H-y0-5];
  DASH.left=[X(.012),y0+5,Math.round(Wd*.18),H-y0-8];DASH.right=[X(.815),y0+5,Math.round(Wd*.18),H-y0-8];
}
MT.dashA=mat('#22252f',{r:.72,m:.3});MT.dashB=mat('#15171e',{r:.42,m:.5});MT.bezel=mat('#50566a',{r:.28,m:.75,d:0});MT.scr=mat('#010203',{r:.7,m:0,d:0});MT.pillar=mat('#343846',{r:.34,m:.6});
const COCK={key:'',mesh:null};
function cockpitMesh(){
  dashLayout();const F=H*FOCAL,cx=W/2,cy=H*.4,key=W+'x'+H;if(COCK.key===key)return COCK.mesh;
  const U=(sx,sy,z)=>[(sx-cx)*z/F,-(sy-cy)*z/F,z];
  const M=mesh(),mats=[];const mi=k=>{let i=mats.indexOf(MT[k]);if(i<0){mats.push(MT[k]);i=mats.length-1;}return i;};
  const quad=(A,B,C,D,k)=>{const b=M.P.length;M.P.push(A,B,C,D);const n=vcross(vsub(B,A),vsub(C,A)),m=mi(k);if(vdot(n,A)>0){M.T.push([b,b+2,b+1,m],[b,b+3,b+2,m]);}else{M.T.push([b,b+1,b+2,m],[b,b+2,b+3,m]);}};
  const {y0,hy,X}=DASH,yb=H*1.06,z0=1.15,z1=.62;
  /* the top outline of the panel, wider than the screen so the edges never show */
  const top=[[-W*.08,y0+1],[0,y0],[X(.3),y0-2],[X(.36),hy],[X(.64),hy],[X(.7),y0-2],[W,y0],[W*1.08,y0+1]];
  const ytop=sx=>{for(let i=0;i+1<top.length;i++){const a=top[i],b=top[i+1];if(sx>=a[0]&&sx<=b[0])return a[1]+(b[1]-a[1])*(sx-a[0])/Math.max(1e-6,b[0]-a[0]);}return y0;};
  const zAt=(sx,sy)=>{const yt=ytop(sx);return z0+(z1-z0)*clamp((sy-yt)/(yb-yt),0,1);};
  const P3=(sx,sy,dz=0)=>U(sx,sy,zAt(sx,sy)-dz);
  for(let i=0;i+1<top.length;i++){const a=top[i],b=top[i+1];
    quad(U(a[0],a[1],z0),U(b[0],b[1],z0),U(b[0],yb,z1),U(a[0],yb,z1),i===3?'dashB':'dashA');
    /* the glare shield: a lip that runs forward from the top edge */
    const la=U(a[0],a[1],z0),lb=U(b[0],b[1],z0);quad(la,lb,vadd(lb,[0,.025,.4]),vadd(la,[0,.025,.4]),'dashB');}
  /* screens with bezels */
  for(const [x,y,w,h] of [DASH.radar,DASH.tgt,DASH.stat]){const e=1.6;
    quad(P3(x-e,y-e,.004),P3(x+w+e,y-e,.004),P3(x+w+e,y+h+e,.004),P3(x-e,y+h+e,.004),'bezel');
    quad(P3(x,y,.008),P3(x+w,y,.008),P3(x+w,y+h,.008),P3(x,y+h,.008),'scr');}
  for(const [x,y,w,h] of [DASH.left,DASH.right])quad(P3(x,y,.004),P3(x+w,y,.004),P3(x+w,y+h,.004),P3(x,y+h,.004),'scr');
  /* canopy pillars from the top corners down to the dash, and the bow of the canopy frame across the top */
  const beam=(a,b,ra,rb2,k)=>{const d=vnorm(vsub(b,a)),s=vnorm(vcross(d,[0,0,1])),t=vnorm(vcross(d,s));
    const v=[];for(const [p,r] of [[a,ra],[b,rb2]])for(const [i,j] of [[-1,-1],[1,-1],[1,1],[-1,1]])v.push(vadd(p,vadd(vmul(s,i*r),vmul(t,j*r*.7))));
    add(M,{v:[v[0],v[1],v[2],v[3],v[4],v[5],v[6],v[7]],t:PRIM.box.t},mi(k),{});};
  for(const sgn of [-1,1]){const tx=sgn<0?W*.012:W*.988,bx=sgn<0?X(.135):X(.865);
    beam(U(tx,-H*.02,.95),U(bx,y0+1,z0*.97),.05,.035,'pillar');}
  beam(U(-W*.05,H*.004,.95),U(W*1.05,H*.004,.95),.055,.055,'pillar');
  COCK.mesh=bake(M,mats);COCK.key=key;return COCK.mesh;
}

/* ===================== what gets drawn this frame ===================== */
const s2lv=c=>[s2l(c[0]),s2l(c[1]),s2l(c[2])];
const TEAML={a:s2lv([90,200,255]),e:s2lv([140,255,80]),p:s2lv([255,96,60])};
const ENGL={a:s2lv([110,210,255]),e:s2lv([150,255,90]),x:s2lv([255,120,60])};
function chunkMesh(m){if(!CHM.has(m)){CHM.set(m,bake(add(mesh(),gFrustum(1,.6,.5,.3,.2),0,{s:[1,1,1]}),[m]));}return CHM.get(m);}
const CHM=new Map();
function showPlayerShip(){return G.camMode===2||G.demoCam||G.mode==='title'||G.mode==='brief'||(PL&&PL.dead);}
/* every hull in the world, as (mesh, position, orientation, scale, flash, glow) */
function eachMesh(fn){
  for(const e of ENT){if(e.dead)continue;
    if(e.kind==='cap'){fn(e.mesh,e.pos,e.q,e.s||1,e.flash,1,e);continue;}
    if(e.kind==='sub'){if(e.hidden)continue;const mp=e.mpos||e.pos;fn(e.mesh,mp,e.q,e.s,e.flash,e.glow??1,e);
      if(e.sub==='turret')fn(MESH.turretGun,vadd(mp,vmul(qU(e.q),4.6*e.s)),e.gq,e.s,e.flash,1,e);continue;}
    if(e.kind==='rock'){fn(e.mesh,e.pos,e.q,e.s,e.flash,1,e);continue;}
    if(e.kind==='beacon'){fn(e.mesh,e.pos,e.q,1,e.flash,1,e);continue;}
    if(e.kind==='torp'){fn(e.mesh,e.pos,e.q,e.s,0,1.2+.4*Math.sin(G.t*20),e);continue;}
    if(e.kind!=='ship')continue;
    if(e===PL&&!showPlayerShip())continue;
    fn(e.mesh,e.pos,e.q,1,e.flash,e===PL?.3+.25*e.spd/e.d.vmax+(PLS.boostHeld?.3:0):.7+.3*e.spd/e.d.vmax,e);
  }
  for(const m of MISS)if(m.kind==='mis')fn(MESH.missile,m.p,m.q,2,0,1,null);
  for(const c of CHUNKS)if(c.t<c.T)fn(chunkMesh(c.m),c.p,c.q,c.s,0,1,null);
}
function inView(pos,R){const c=cam(pos);if(c[2]+R<NEAR)return false;const V=VIEW,lim=Math.max(c[2]+R,.01)/V.F;
  if(c[0]-R>(W-V.cx)*lim||c[0]+R<-V.cx*lim||c[1]-R>V.cy*lim||c[1]+R<(V.cy-H)*lim)return false;return true;}

/* ---------- lights: the brightest flashes near the camera light the hulls around them ---------- */
const LP=new Float32Array(32),LC=new Float32Array(32);let NL=0;
function gatherLights(){
  const cand=[],cp=CAM.pos;
  for(const f of FX){if(f.t<0)continue;const a=f.t/f.T;
    if(f.k==='flash'){const k=(1-a)*(1-a),r=Math.max(30,f.r*9),c=f.col?s2lv(f.col):[1,.72,.42];cand.push([f.p,r,c,k*Math.min(10,1.5+f.r*.35)]);}
    else if(f.k==='muz'&&f.e&&!f.e.dead){cand.push([toWorld(f.e,f.lp),24,s2lv(f.col),(1-a)*1.6]);}}
  const M=G.M;if(M&&M.beam&&M.beam.on>0){cand.push([M.beam.a,900,[.55,1,.4],6]);cand.push([M.beam.b,700,[.6,1,.45],6]);}
  for(const c of cand)c.push(c[3]*c[1]/(vdist(c[0],cp)+c[1]*.25));
  cand.sort((a,b)=>b[4]-a[4]);NL=Math.min(8,cand.length);
  for(let i=0;i<NL;i++){const c=cand[i];LP[i*4]=c[0][0]-cp[0];LP[i*4+1]=c[0][1]-cp[1];LP[i*4+2]=c[0][2]-cp[2];LP[i*4+3]=c[1];LC[i*4]=c[2][0]*c[3];LC[i*4+1]=c[2][1]*c[3];LC[i*4+2]=c[2][2]*c[3];LC[i*4+3]=0;}
}

/* ---------- sprites: fire, smoke, sparks, flashes, rings, bolts, engine plumes and trails ---------- */
let NI=0;const DEP=new Float32Array(MAXI),ORD=new Uint32Array(MAXI),IB2=new Float32Array(MAXI*12);
function spr(p,size,r,g2,b,a,sx,sy,sz,kind,seed){
  if(NI>=MAXI)return;const o=NI*12,cp=CAM.pos,x=p[0]-cp[0],y=p[1]-cp[1],z=p[2]-cp[2];
  const d=x*VIEW.f[0]+y*VIEW.f[1]+z*VIEW.f[2];if(d<-size-Math.abs(sx)-Math.abs(sy)-Math.abs(sz))return;
  IB[o]=x;IB[o+1]=y;IB[o+2]=z;IB[o+3]=size;IB[o+4]=r;IB[o+5]=g2;IB[o+6]=b;IB[o+7]=a;IB[o+8]=sx;IB[o+9]=sy;IB[o+10]=sz;IB[o+11]=kind+(seed||0)*.999;DEP[NI]=d;NI++;
}
const FIRE_RAMP=[[0,[1,.86,.6],3.6],[.1,[1,.62,.24],2.8],[.28,[1,.38,.08],1.8],[.5,[.6,.14,.04],.8],[1,[.14,.05,.03],.1]];
function fireCol(a){let i=0;while(i<FIRE_RAMP.length-2&&a>FIRE_RAMP[i+1][0])i++;const A=FIRE_RAMP[i],B=FIRE_RAMP[i+1],t=clamp((a-A[0])/(B[0]-A[0]),0,1);const k=lerp(A[2],B[2],t);return [lerp(A[1][0],B[1][0],t)*k,lerp(A[1][1],B[1][1],t)*k,lerp(A[1][2],B[1][2],t)*k];}
const DUST3=[];for(let i=0;i<160;i++)DUST3.push(vrandIn(80));
const BUBQ=[];MESH.bubble=build((M,m)=>add(M,gSphere(1),m('shieldE')));
function buildSprites(){
  NI=0;BUBQ.length=0;const fxk=QL[qI].fx,cp=CAM.pos;
  /* explosions and their aftermath */
  let n=0;for(const f of FX){if(f.t<0)continue;const a=f.t/f.T,seed=((f.sd??(f.sd=Math.random())));n++;
    switch(f.k){
      case 'fire':{const r=lerp(f.r0,f.r1,Math.sqrt(a)),c=fireCol(a),k=1-a*.35;spr(f.p,r,c[0]*k,c[1]*k,c[2]*k,a*a*.55,0,0,0,3,seed);break;}
      case 'smoke':{if(fxk<1&&(n%3===0))break;const r=lerp(f.r0,f.r1,a),k=(1-a)*.72,lit=.018+.03*Math.max(0,1-a*3);spr(f.p,r,lit*k*1.6,lit*k*1.3,lit*k*1.2,k,0,0,0,3,seed);break;}
      case 'dust':{const r=lerp(f.r0,f.r1,a),k=(1-a)*.65;spr(f.p,r,.06*k,.045*k,.032*k,k,0,0,0,3,seed);break;}
      case 'flak':{const r=f.r*(.5+a*.7),k=(1-a)*.85;spr(f.p,r,.02*k,.018*k,.02*k,k,0,0,0,3,seed);if(a<.2){const q=(1-a*5)*4;spr(f.p,f.r*.9,q,q*.62,q*.3,0,0,0,0,0,0);}break;}
      case 'spark':{const c=f.col||[255,220,140],k=(1-a)*3.2;spr(f.p,.22,s2l(c[0])*k,s2l(c[1])*k*(1-a*.3),s2l(c[2])*k*(1-a*.5),0,f.v[0]*.035,f.v[1]*.035,f.v[2]*.035,1,0);break;}
      case 'flash':{const k=1.6*(1-a)*2.6,c=f.col?s2lv(f.col):[1,.85,.68];spr(f.p,f.r*(1-a*.5)*1.5,c[0]*k,c[1]*k,c[2]*k,0,0,0,0,0,0);break;}
      case 'muz':{if(!f.e||f.e.dead)break;if(f.e===PL&&!showPlayerShip())break;const p=toWorld(f.e,f.lp),k=(1-a)*6,c=s2lv(f.col);spr(p,f.r*(1-a*.4),c[0]*k,c[1]*k,c[2]*k,0,0,0,0,0,0);break;}
      case 'shield':{if(f.e===PL&&!showPlayerShip())break;const k=(1-a)*1.8;spr(f.p,f.r*(1+a)*.6,.12*k,.5*k,1*k,0,0,0,0,0,0);
        if(f.e&&!f.e.dead&&BUBQ.length<24){const e=f.e,c=e.kind==='sub'?(e.mpos||e.pos):e.pos,R=e.kind==='sub'?e.r*(e.s||1)*1.4:(e.mesh?e.mesh.R*1.08:e.r*1.4);BUBQ.push({p:c,R,h:vnorm(vsub(f.p,c)),k:(1-a)*(1-a)});}break;}
      case 'ring':{const R=f.r*Math.sqrt(a),k=(1-a)*(1-a)*1.6;spr(f.p,R,1*k,.55*k,.28*k,0,f.ax[0],f.ax[1],f.ax[2],2,0);break;}
    }}
  /* cannon bolts: stretched light with a white-hot core */
  for(const b of BOLTS){const c=b.col,dir=vnorm(b.v),L=b.big?30:22,k=b.big?5:6;spr(b.p,b.big?.85:.55,s2l(c[0])*k,s2l(c[1])*k,s2l(c[2])*k,0,dir[0]*L,dir[1]*L,dir[2]*L,1,0);}
  for(const f of FLAK)spr(f.p,2.2,2.4,1.6,.8,0,0,0,0,0,0);
  /* engines: a glow, a plume that stretches with throttle, and a fading trail */
  for(const e of ENT){if(e.kind!=='ship'||e.dead)continue;const ep=ENG_POS[e.type];if(!ep)continue;
    const me=e===PL,seen=!me||showPlayerShip(),tl=e.team==='e'?(e.type==='ace'||e.type==='viper'?ENGL.x:ENGL.e):ENGL.a,k=.45+.55*(e.spd/e.d.vmax)+(me&&PLS.boostHeld?.8:0);
    const f=qF(e.q),er=ENG_R[e.type]||.6,ex=me?.8:1;
    if(seen)for(const lp of ep){const p=toWorld(e,lp),gk=k*3.2*ex,L=er*(2.2+5*k)*(1+Math.random()*.15);
      spr(p,er*1.7,tl[0]*gk*.16,tl[1]*gk*.16,tl[2]*gk*.16,0,0,0,0,0,0);
      spr(p,er*.62,tl[0]*gk*.42,tl[1]*gk*.42,tl[2]*gk*.42,0,f[0]*L,f[1]*L,f[2]*L,1,0);}
    if(e.tr&&seen){for(let j=0;j<e.tr.length;j++){const tr=e.tr[j],nn=tr.length;if(nn<2)continue;
      const head=toWorld(e,ep[j]||ep[0]);let prev=head;
      for(let i=nn-1;i>=0;i--){const q=tr[i],u=(nn-1-i)/nn,w=er*.5*(1-u)+.05,ik=Math.pow(1-u,1.6)*.55;
        spr(prev,w,tl[0]*ik,tl[1]*ik,tl[2]*ik,0,prev[0]-q[0],prev[1]-q[1],prev[2]-q[2],1,0);prev=q;}}}
    /* far ships stay visible as a coloured point, like a lit dot on the original's matrix */
    if(!me){const c=cam(e.pos);if(c[2]>NEAR){const px=e.r*VIEW.F/c[2]*(RH/H);if(px<2.5){const tc=TEAML[e.team]||TEAML.e,kk=1.6;spr(e.pos,e.r*.5,tc[0]*kk,tc[1]*kk,tc[2]*kk,0,0,0,0,0,0);}}}
  }
  /* missiles, torpedoes, and the glows of the capital ships' parts */
  for(const m of MISS){if(m.kind!=='mis')continue;const d=vnorm(m.v),t=vsub(m.p,vmul(d,2.6));spr(t,2.6,4,2.6,1.2,0,0,0,0,0,0);spr(t,.7,5,3.6,1.8,0,d[0]*8,d[1]*8,d[2]*8,1,0);}
  for(const e of ENT){if(e.dead)continue;
    if(e.kind==='torp'){const k=(FRAME>>2)&1?3:1.8;spr(e.pos,5,k,.3*k,.18*k,0,0,0,0,0,0);}
    else if(e.kind==='beacon'){if((FRAME>>4)&1)spr(vadd(e.pos,[0,13,0]),9,6,.5,.3,0,0,0,0,0,0);}
    else if(e.kind==='sub'){const s=e.s||1;
      if(e.sub==='gen')spr(e.pos,9*s,.12,.6,1.3,0,0,0,0,0,0);
      if(e.sub==='vent'&&!e.shielded())spr(vadd(e.pos,vmul(qU(e.q),1.5*s)),11*s,1.6*(.7+.3*Math.sin(G.t*6+e.id)),.5,.12,0,0,0,0,0,0);
      if(e.sub==='core')spr(e.pos,24*s,2.4*(.8+.2*Math.sin(G.t*5)),.7,.18,0,0,0,0,0,0);
      if(e.sub==='beam'&&e.charge>0){const p=vadd(e.pos,vmul(qF(e.q),7)),k=e.charge*4;spr(p,8+e.charge*30,.4*k,1*k,.3*k,0,0,0,0,0,0);}
      if(e.shielded&&e.shielded()&&e.objective&&e.sub!=='gen'){const R=e.r*s*1.7,k=.22+.06*Math.sin(G.t*3+e.id);spr(e.mpos||e.pos,R,.05*k,.3*k,.6*k,0,0,0,0,0,0);}
    }}
  /* the Leviathan's main beam */
  const M=G.M;if(M&&M.beam&&M.beam.on>0){const b=M.beam,d=vsub(b.a,b.b),w=1+Math.random()*.25;
    spr(b.a,14*w,1.2,4,.9,0,d[0],d[1],d[2],1,0);spr(b.a,5*w,6,8,5,0,d[0],d[1],d[2],1,0);
    for(let i=0;i<=8;i++)spr(vlerp(b.a,b.b,i/8),40*w,.25,.8,.2,0,0,0,0,0,0);spr(b.b,90,1.2,2.4,.8,0,0,0,0,0,0);spr(b.a,40,1,2.6,.8,0,0,0,0,0,0);}
  /* space dust streaks tell you how fast you are going */
  const vel=PL&&!PL.dead&&G.mode==='play'?PL.vel:(CAM.cine.subj&&CAM.cine.kind==='chase'?CAM.cine.subj.vel:[0,0,0]),sp=vlen(vel);
  for(const d of DUST3){const rel=vsub(d,cp);for(let k=0;k<3;k++){if(rel[k]>80)d[k]-=160;else if(rel[k]<-80)d[k]+=160;}
    const dist=vdist(d,cp),f=clamp(1-dist/80,0,1)*.5;if(f<=0)continue;const L=Math.min(.06,.012+sp*.00018);spr(d,.04,.35*f,.38*f,.48*f,0,vel[0]*L,vel[1]*L,vel[2]*L,1,0);}
  /* back to front, so smoke hides what is behind it */
  for(let i=0;i<NI;i++)ORD[i]=i;const ord=ORD.subarray(0,NI);ord.sort((a,b)=>DEP[b]-DEP[a]);
  for(let i=0;i<NI;i++){const s=ord[i]*12;IB2.set(IB.subarray(s,s+12),i*12);}
}

/* ---------- holograms: queued by the HUD, rendered into the dot grid ---------- */
const HOLOQ=[];
function holo(m,x,y,w,h,ang,col,s,pitch,pos,q,dist){HOLOQ.push({m,x,y,w,h,ang,col,s:s||1,pitch:pitch??-.3,pos:pos||[0,0,0],q:q||qid(),dist:dist||2.4});}

/* ---------- is the sun hidden behind a hull or a rock? ---------- */
function sunHidden(){const a=CAM.pos,b=vaddm(a.slice(),SUN.dir,6000);
  for(const e of ENT){if(e.dead)continue;
    if(e.kind==='cap'){if(vdist(a,e.pos)>e.r+6000)continue;for(const B of e.mesh.boxes)if(segBox(a,b,e,B)>=0)return true;}
    else if(e.kind==='rock'||(e.kind==='ship'&&(e!==PL||showPlayerShip()))){if(segSphere(a,b,e.pos,e.kind==='rock'?e.r:e.r*.7)>=0)return true;}}
  return false;}
