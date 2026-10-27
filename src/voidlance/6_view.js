/* ===================== cameras ===================== */
const CAM={pos:[0,0,0],q:qid(),F:229,cy:.4,cine:{t:0,dur:0,kind:'',subj:null,pos:[0,0,0],q:qid(),ang:0},death:null,boostF:1};
const ENG_POS={lance:[[1.05,-.1,-6.9],[-1.05,-.1,-6.9]],sparrow:[[1.05,-.1,-6.9],[-1.05,-.1,-6.9]],dart:[[0,0,-2.2]],ace:[[0,0,-2.2]],wasp:[[0,0,-5.5]],hammer:[[3.9,-.4,-4.7],[-3.9,-.4,-4.7]],viper:[[1.1,0,-8.2],[-1.1,0,-8.2]]};
function pickShot(){
  const C=CAM.cine,ships=ENT.filter(e=>e.kind==='ship'&&!e.dead&&!e.dying),caps=ENT.filter(e=>e.kind==='cap'&&!e.dead);
  const r=Math.random();C.t=0;C.dur=rnd(4.5,7);
  if(caps.length&&r<.22){C.kind='orbit';C.subj=pick(caps);C.ang=Math.random()*TAU;C.h=rnd(-.3,.5);}
  else if(ships.length){C.subj=pick(ships);C.kind=r<.62?'chase':'fly';if(C.kind==='fly'){const s=C.subj;C.pos=vadd(vaddm(s.pos.slice(),s.vel,2.2),vadd(vmul(qR(s.q),rnd(-30,30)),vmul(qU(s.q),rnd(8,22))));C.q=qlook(vsub(s.pos,C.pos),[0,1,0]);}else{C.q=C.subj.q.slice();}}
  else{C.kind='still';C.pos=[0,0,-200];C.q=qid();}
}
function updCamera(dt){
  const C=CAM;let F0=(W/2)/Math.tan(40*D2R);
  if(G.mode==='title'||G.mode==='howto'||G.demoCam){
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
  if(G.camMode===2){C.q=qslerp(C.q,P.q,Math.min(1,dt*7));C.pos=vadd(P.pos,qrot(C.q,[0,5.2,-21]));C.cy=.52;}
  else{C.q=P.q.slice();C.pos=toWorld(P,[0,.9,1.4]);C.cy=G.camMode===0?.4:.5;}
  if(G.shake>0&&!reduce){const k=G.shake*G.shake*.025;C.q=qnorm(qmul(C.q,qaxis(vnorm(vrand(1)),k*rnd(.4,1))));}
  C.F=F0*C.boostF;
}
/* ===================== world render ===================== */
const CHM=new Map();
function chunkMesh(m){if(!CHM.has(m)){CHM.set(m,bake(add(mesh(),gFrustum(1,.6,.5,.3,.2),0,{s:[1,1,1]}),[m]));}return CHM.get(m);}
function drawShips(){
  const V=VIEW;
  for(const e of ENT){if(e.dead)continue;
    if(e.kind==='cap'){drawMesh(e.mesh,e.pos,e.q,{s:e.s,flash:e.flash});continue;}
    if(e.kind==='sub'){if(e.hidden)continue;const mp=e.mpos||e.pos;drawMesh(e.mesh,mp,e.q,{s:e.s,flash:e.flash,glow:e.glow});if(e.sub==='turret')drawMesh(MESH.turretGun,vadd(mp,vmul(qU(e.q),4.6*e.s)),e.gq,{s:e.s,flash:e.flash});
      if(e.sub==='gen'){glow(e.pos,9*e.s,[60,200,255],.35+.15*Math.sin(G.t*4+e.id));}
      if(e.sub==='vent'&&!e.shielded())glow(vadd(e.pos,vmul(qU(e.q),1.5*e.s)),11*e.s,[255,120,40],.55+.25*Math.sin(G.t*6+e.id));
      if(e.sub==='core')glow(e.pos,22*e.s,[255,110,40],.7+.3*Math.sin(G.t*5));
      if(e.sub==='beam'&&e.charge>0)glow(vadd(e.pos,vmul(qF(e.q),7)),8+e.charge*30,[170,255,110],e.charge);
      continue;}
    if(e.kind==='rock'){drawMesh(e.mesh,e.pos,e.q,{s:e.s,flash:e.flash});continue;}
    if(e.kind==='beacon'){drawMesh(e.mesh,e.pos,e.q,{flash:e.flash});if((FRAME>>4)&1)glow(vadd(e.pos,[0,13,0]),8,[255,60,40],1.2);continue;}
    if(e.kind==='torp'){drawMesh(e.mesh,e.pos,e.q,{s:e.s});glow(e.pos,4,[255,80,50],(FRAME>>2)&1?1.2:.7,1.5);continue;}
    if(e.kind!=='ship')continue;
    if(e===PL&&G.camMode!==2&&!PL.dead&&!G.demoCam&&G.mode!=='title')continue;
    const c=cam(e.pos);if(c[2]<NEAR-e.r)continue;const rp=c[2]>0?e.r*V.F/c[2]:99;
    if(rp<1.2){const s=proj(e.pos);if(s){const tc=e===PL?TEAMC.p:TEAMC[e.team];pxz(s[0],s[1],s[2],pack(tc[0],tc[1],tc[2]));}continue;}
    drawMesh(e.mesh,e.pos,e.q,{flash:e.flash,glow:e===PL?.3+.25*e.spd/e.d.vmax+(PLS.boostHeld?.3:0):.7+.3*e.spd/e.d.vmax});
    const ep=ENG_POS[e.type],tc=e.team==='e'?(e.type==='ace'||e.type==='viper'?[255,120,60]:[150,255,90]):[110,210,255],k=.45+.55*(e.spd/e.d.vmax);
    if(ep){const gr=e===PL?.75:e.type==='hammer'?2.2:1.4;for(const p of ep)glow(toWorld(e,p),gr,tc,e===PL?k*.8:k,1);}
  }
}
function drawTrails(){
  for(const e of ENT){if(e.kind!=='ship'||e.dead||e.trail.length<2)continue;if(e===PL&&G.camMode!==2&&!G.demoCam)continue;const tc=e===PL?TEAMC.p:TEAMC[e.team],n=e.trail.length;
    for(let i=1;i<n;i++){const a=i/n*.5;line3(e.trail[i-1],e.trail[i],pack(tc[0]*a,tc[1]*a,tc[2]*a),1);}}
}
function drawMissiles(){
  for(const m of MISS){if(m.kind!=='mis')continue;drawMesh(MESH.missile,m.p,m.q,{s:2});const t=vsub(m.p,vmul(vnorm(m.v),2.6));glow(t,2.4,[255,190,110],1.2,1.5);}
  for(const c of CHUNKS){if(c.t>c.T)continue;drawMesh(chunkMesh(c.m),c.p,c.q,{s:c.s});}
}
function drawBolts(){
  for(const b of BOLTS){const c=b.col,dir=vnorm(b.v),L=b.big?30:22,tail=vsub(b.p,vmul(dir,L)),d=vdist(b.p,VIEW.pos),th=d<160?3:d<700?2:1;
    line3(tail,b.p,pack(c[0],c[1],c[2]),th,pack(c[0]*.5+128,c[1]*.5+128,c[2]*.5+128));}
  for(const f of FLAK)glow(f.p,2,[255,200,120],.8,1);
}
function drawFX(){
  for(const f of FX){if(f.t<0)continue;const a=f.t/f.T;
    switch(f.k){
      case 'fire':{const r=lerp(f.r0,f.r1,Math.sqrt(a)),c=a<.15?[255,250,220]:a<.35?[255,210,110]:a<.6?[255,130,40]:[150,50,24];blob(f.p,r,pack(c[0],c[1],c[2]),1-a*.6);if(a<.3)glow(f.p,r*1.4,[255,160,70],.5*(1-a/.3));break;}
      case 'smoke':{const r=lerp(f.r0,f.r1,a),k=(1-a)*.75;blob(f.p,r,pack(46,44,52),k);break;}
      case 'dust':{blob(f.p,lerp(f.r0,f.r1,a),pack(96,84,70),(1-a)*.7);break;}
      case 'flak':{blob(f.p,f.r*(.5+a*.7),pack(40,38,42),(1-a)*.85);if(a<.2)glow(f.p,f.r,[255,170,90],1-a*5);break;}
      case 'spark':{const c=f.col;line3(f.p,vsub(f.p,vmul(f.v,.03)),pack(c[0]*(1-a*.5),c[1]*(1-a*.6),c[2]*(1-a*.7)),1);break;}
      case 'flash':glow(f.p,f.r*(1-a*.5),[255,235,200],1.6*(1-a),2);break;
      case 'shield':glow(f.p,f.r*(1+a),[80,210,255],(1-a)*1.2,2);break;
      case 'ring':{const R=f.r*Math.sqrt(a),ax=f.ax,u=vnorm(vcross(ax,[.3,.9,.1])),v=vcross(ax,u),k=(1-a);let prev=null;
        for(let i=0;i<=36;i++){const t=i/36*TAU,p=vadd(f.p,vadd(vmul(u,Math.cos(t)*R),vmul(v,Math.sin(t)*R)));if(prev)line3(prev,p,pack(255*k,190*k,120*k),1);prev=p;}break;}
    }}
}
function drawBeam(){const M=G.M;if(!M||!M.beam)return;const b=M.beam;if(b.on>0){const w=1+Math.random()*.4;line3(b.a,b.b,pack(190,255,140),3,pack(255,255,240));
  for(let i=0;i<=10;i++){const p=vlerp(b.a,b.b,i/10);glow(p,22*w,[120,255,90],.55);}glow(b.b,70,[200,255,160],1.2);}}
/* ===================== cockpit: drawn into the dot grid ===================== */
function fillPoly(pts,c0,c1,gy0,gy1){
  let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}y0=Math.max(0,Math.ceil(y0));y1=Math.min(H-1,Math.floor(y1));
  for(let y=y0;y<=y1;y++){const xs=[],yc=y+.5;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=yc&&b[1]>yc)||(b[1]<=yc&&a[1]>yc))xs.push(a[0]+(yc-a[1])/(b[1]-a[1])*(b[0]-a[0]));}
    xs.sort((a,b)=>a-b);const t=gy1>gy0?clamp((y-gy0)/(gy1-gy0),0,1):0,row=y*W,br=(y&3)<<2;
    for(let k=0;k+1<xs.length;k+=2){const xa=Math.max(0,Math.ceil(xs[k]-.5)),xb=Math.min(W,Math.ceil(xs[k+1]-.5));for(let x=xa;x<xb;x++)RBUF[row+x]=BAY4[br|(x&3)]<t?c1:c0;}}
}
function rect(x,y,w,h,c){x=Math.round(x);y=Math.round(y);for(let j=Math.max(0,y);j<Math.min(H,y+h);j++)RBUF.fill(c,j*W+Math.max(0,x),j*W+Math.min(W,x+w));}
const DASH={};
function dashLayout(){
  const y0=Math.round(H*.79),hy=Math.round(H*.735);
  DASH.y0=y0;DASH.hy=hy;
  DASH.radar=[Math.round(W*.205),y0+3,Math.round(W*.15),H-y0-5];
  DASH.tgt=[Math.round(W*.385),hy+4,Math.round(W*.23),H-hy-6];
  DASH.stat=[Math.round(W*.645),y0+3,Math.round(W*.15),H-y0-5];
  DASH.left=[3,y0+5,Math.round(W*.18),H-y0-8];DASH.right=[Math.round(W*.815),y0+5,Math.round(W*.18),H-y0-8];
}
function drawCockpit(){
  dashLayout();const sl=vdot(SUN.dir,VIEW.r),su=vdot(SUN.dir,VIEW.u),lit=clamp(.5+sl*.5,0,1),y0=DASH.y0,hy=DASH.hy;
  const base=[24,26,36],hi=[60,64,84],ca=pack(base[0],base[1],base[2]),cb=pack(base[0]*1.4,base[1]*1.4,base[2]*1.5);
  fillPoly([[0,y0],[W*.3,y0-2],[W*.36,hy],[W*.64,hy],[W*.7,y0-2],[W,y0],[W,H],[0,H]],cb,ca,y0,H);
  const edge=pack(hi[0]+60*Math.max(0,su),hi[1]+56*Math.max(0,su),hi[2]+50*Math.max(0,su));
  for(const [a,b] of [[[0,y0],[W*.3,y0-2]],[[W*.3,y0-2],[W*.36,hy]],[[W*.36,hy],[W*.64,hy]],[[W*.64,hy],[W*.7,y0-2]],[[W*.7,y0-2],[W,y0]]]){const n=Math.ceil(Math.abs(b[0]-a[0]))+1;for(let k=0;k<=n;k++){const x=a[0]+(b[0]-a[0])*k/n,y=a[1]+(b[1]-a[1])*k/n;const i=(Math.round(y)|0)*W+(x|0);if(i>=0&&i<W*H)RBUF[i]=edge;}}
  /* canopy pillars catch the sun on one side */
  const pl=pack(30+50*lit,32+48*lit,44+50*lit),pr=pack(30+50*(1-lit),32+48*(1-lit),44+50*(1-lit)),pd=pack(14,15,22);
  fillPoly([[0,H*.02],[W*.022,H*.02],[W*.155,y0],[W*.12,y0+1]],pl,pd,0,y0);
  fillPoly([[W,H*.02],[W*.978,H*.02],[W*.845,y0],[W*.88,y0+1]],pr,pd,0,y0);
  fillPoly([[0,0],[W,0],[W,H*.022],[0,H*.022]],pd,pack(36,38,50),0,H*.022);
  for(const [x,y,w,h] of [DASH.radar,DASH.tgt,DASH.stat]){rect(x-1,y-1,w+2,h+2,pack(70,74,92));rect(x,y,w,h,pack(4,6,10));}
  for(const [x,y,w,h] of [DASH.left,DASH.right]){rect(x,y,w,h,pack(16,18,26));}
  for(let i=0;i<6;i++){const on=((FRAME>>5)+i*3)%7<4,x=DASH.left[0]+4+i*6,y=DASH.left[1]+DASH.left[3]-6;rect(x,y,3,2,on?pack(255,170,60):pack(60,40,20));}
  for(let i=0;i<6;i++){const on=((FRAME>>4)+i*5)%9<3,x=DASH.right[0]+DASH.right[2]-8-i*6,y=DASH.right[1]+DASH.right[3]-6;rect(x,y,3,2,on?pack(90,220,255):pack(20,50,60));}
  if(PLS.tgt&&!PLS.tgt.dead)drawTargetCam(PLS.tgt);
}
function drawTargetCam(T){
  const [x,y,w,h]=DASH.tgt,m=T.kind==='cap'?T.mesh:T.mesh;if(!m)return;
  const keep={pos:VIEW.pos,q:VIEW.q,cx:VIEW.cx,cy:VIEW.cy,F:VIEW.F};
  for(let j=y;j<y+h;j++)ZB.fill(0,j*W+x,j*W+x+w);
  const s=T.s||1,R=m.R*s,a=G.t*.6,cq=qlook([Math.sin(a),-.35,Math.cos(a)],[0,1,0]),cp=vsub(T.pos,vmul(qF(cq),R*2.6));
  setView(cp,cq,x+w/2,y+h/2,h*1.1,[x,y,x+w,y+h]);
  const sv=SUN.dir;SUN.dir=vnorm(vadd(qU(cq),vmul(qR(cq),-.6)));drawMesh(m,T.pos,T.q,{s});SUN.dir=sv;
  const tc=T.team==='e'?[120,255,110]:T.team==='a'?[110,220,255]:[255,220,120];
  for(let j=y;j<y+h;j++){const sc=(j+FRAME)%3===0?.55:1;for(let i=x;i<x+w;i++){const k=j*W+i;if(ZB[k]>0){const c=RBUF[k],l=(((c&255)*.3+((c>>>8)&255)*.55+((c>>>16)&255)*.15)/255)*sc*1.3+.12;RBUF[k]=pack(tc[0]*l,tc[1]*l,tc[2]*l);}else RBUF[k]=(j+i)%5===0?pack(6,18,12):pack(3,6,6);}}
  setView(keep.pos,keep.q,keep.cx,keep.cy,keep.F);
}
const PROF={};
function renderWorld(){
  const C=CAM;setView(C.pos,C.q,W/2,Math.round(H*C.cy),C.F);TRIS=0;
  const T=performance.now.bind(performance);let t=T(),q;drawSky();q=T();PROF.sky=q-t;t=q;drawShips();drawMissiles();q=T();PROF.ships=q-t;t=q;drawTrails();drawBeam();drawBolts();drawFX();q=T();PROF.fx=q-t;t=q;
  if(PL&&!PL.dead&&G.mode!=='title')drawDust(PL.vel);else drawDust(CAM.cine.subj&&CAM.cine.kind==='chase'?CAM.cine.subj.vel:[0,0,0]);
  sunFlare();
  if(G.camMode===0&&PL&&!PL.dead&&!G.demoCam&&(G.mode==='play'))drawCockpit();
  acx.putImageData(AIMG,0,0);g.drawImage(ac,0,0);
}
