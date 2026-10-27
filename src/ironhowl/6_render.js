/* ===================== scene: sky, baked ground, depth-sorted machines, air layer, per-dot light ===================== */
const ZOOM=26;
const CAM={x:WW/2,y:WH/2};
RESCB.push(()=>{fullClip();S=W/ZOOM;if(WORLD)bakeWorld();});
const RX={green:mkRamp('#5aff6a',{emi:1}),amber:mkRamp('#ffae2a',{emi:1}),silver:mkRamp('#b8bcc8'),pod:mkRamp('#80848e'),podR:mkRamp('#b03a2a'),
  beamO:mkRamp('#ff3a1a',{emi:1}),beamI:mkRamp('#fff4e6',{emi:1})};
const FIREC=[pack(255,252,230),pack(255,214,110),pack(255,140,40),pack(200,60,20),pack(90,30,16)];
const BAY4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const STARS=Array.from({length:70},(_,i)=>{const r=mulberry(i*7919+3);return {x:r(),y:r(),b:.4+r()*.6,ph:r()*TAU};});
function px1(x,y,c,e){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;RBUF[i]=c;EM[i]=e?1:0;}
function dEll(cx,cy,rx,ry,c,alpha,e){
  if(alpha<=0)return;rx=Math.max(.6,rx);ry=Math.max(.6,ry);
  const y0=Math.max(0,Math.floor(cy-ry)),y1=Math.min(H-1,Math.ceil(cy+ry)),ev=e?1:0;
  for(let y=y0;y<=y1;y++){const dy=(y+.5-cy)/ry;if(dy*dy>1)continue;const hw=rx*Math.sqrt(1-dy*dy),a=Math.max(0,Math.round(cx-hw)),b=Math.min(W,Math.round(cx+hw)),row=y*W,br=(y&3)<<2;
    for(let x=a;x<b;x++)if(BAY4[br|(x&3)]<alpha){RBUF[row+x]=c;EM[row+x]=ev;}}
}
function dlineE(x0,y0,x1,y1,c){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let k=0;k<=n;k++)px1(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c,1);}
function ringE(wx,wy,r,c,thick,dash,phase){
  const cx=PX(wx),cy=PY(wy,0),rx=r*S,ry=r*S*KY,n=Math.max(20,Math.round(rx*2.6));
  for(let k=0;k<n;k++){if(dash&&((k+(phase|0))>>1)%2)continue;const a=k/n*TAU,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;px1(x,y,c,1);if(thick>1){px1(x+1,y,c,1);px1(x,y+1,c,1);}}
}
function warnZone(wx,wy,r,prog,big){
  const cx=PX(wx),cy=PY(wy,0),blink=((FRAME>>(prog>.7?1:2))&1);
  dEll(cx,cy,r*S*prog,r*S*KY*prog,pack(255,40,24),.28+.2*prog,1);
  ringE(wx,wy,r,blink?pack(255,70,40):pack(150,20,14),big?2:1,false);
  if(big)ringE(wx,wy,r*.6,pack(255,60,30),1,true,FRAME>>1);
}
function rayLen(ox,oy,ang,len,z){const c=Math.cos(ang),s=Math.sin(ang);for(let d=.6;d<len;d+=.3)if(propAt(ox+c*d,oy+s*d,z,0))return d;return len;}
function dotLine3(x0,y0,z0,x1,y1,z1,c,gap){const sx0=PX(x0),sy0=PY(y0,z0),sx1=PX(x1),sy1=PY(y1,z1),n=Math.round(Math.hypot(sx1-sx0,sy1-sy0)/gap);for(let k=0;k<=n;k++){if((k+(FRAME>>1))%3===0)continue;px1(sx0+(sx1-sx0)*k/n,sy0+(sy1-sy0)*k/n,c,1);}}

/* ---------- camera ---------- */
function snapCam(){CAM.x=PLY.x;CAM.y=PLY.y;}
function updCam(dt){
  const P=PLY;let tx=P.x,ty=P.y;
  if(!P.dead){tx+=Math.cos(P.turret)*2.6+P.vx*.22;ty+=Math.sin(P.turret)*1.8+P.vy*.22;}
  const B=G.boss;if(B&&!B.dead){const d=Math.hypot(B.x-P.x,B.y-P.y);if(d<18){tx=lerp(tx,(B.x+P.x)/2,.32);ty=lerp(ty,(B.y+P.y)/2,.32);}}
  const k=Math.min(1,dt*4.5);CAM.x+=(tx-CAM.x)*k;CAM.y+=(ty-CAM.y)*k;
  G.shake=Math.max(0,G.shake-dt*2.4);
}
function applyCam(){
  const sh=reduce?0:G.shake*G.shake*S*.55;
  let ox=CAM.x*S-W/2,oy=CAM.y*S*KY-1.4*S*KZ-H/2;
  ox=clamp(ox,0,WORLD.AW-W);oy=clamp(oy,-S*2.4,WORLD.AH-H);
  OFFX=Math.round(clamp(ox+rnd(-1,1)*sh,0,WORLD.AW-W));OFFY=Math.round(oy+rnd(-1,1)*sh);
}

/* ---------- ground ---------- */
function blitGround(){
  const A=WORLD.ALB,AW=WORLD.AW,AH=WORLD.AH,th=WORLD.th,dock=th.id==='docks';
  EM.fill(0);DL.fill(0);
  const hz=dock?[26,34,78]:[96,46,34],tp=dock?[4,6,18]:[16,10,26],outc=pack(8,10,16);
  for(let y=0;y<H;y++){const ay=y+OFFY,row=y*W;
    if(ay<0){const t=clamp(-ay/(S*5),0,1),c=mixC(hz,tp,Math.sqrt(t));RBUF.fill(pack(c[0],c[1],c[2]),row,row+W);EM.fill(1,row,row+W);continue;}
    if(ay>=AH){RBUF.fill(outc,row,row+W);continue;}
    const a0=ay*AW+OFFX;RBUF.set(A.subarray(a0,a0+W),row);
  }
  if(OFFY<0)for(const s of STARS){const y=Math.round(-S*.6-s.y*S*5)-OFFY,x=Math.round(((s.x*W*1.6-OFFX*.15)%(W*1.6)+W*1.6)%(W*1.6));if(y<0||y>=H||x>=W)continue;const tw=.5+.5*Math.sin(G.t*2+s.ph),v=60+150*s.b*tw;px1(x,y,pack(v,v,v*1.1),1);}
}
function groundFx(){
  for(const r of RINGS){const a=r.life/r.max;
    if(r.warn)warnZone(r.x,r.y,r.r1,1-a,r.r1>3);
    else{const rr=lerp(r.r0,r.r1,1-a*a),c=pack(r.col[0]*a+40*(1-a),r.col[1]*a+30*(1-a),r.col[2]*a+30*(1-a));ringE(r.x,r.y,rr,c,a>.4?2:1,false);if(a>.5)ringE(r.x,r.y,rr*.86,pack(r.col[0]*.6,r.col[1]*.6,r.col[2]*.6),1,false);}}
  for(const s of SHELLS)warnZone(s.x1,s.y1,s.rad,s.t/s.T,false);
  for(const b of BOMBS)if(!b.crash)warnZone(b.x,b.y,1.6,clamp(1-b.z/5.5,0,1),false);
  for(const p of PODS)warnZone(p.x,p.y,p.big?3.6:1.5,p.t/p.T,p.big);
}

/* ---------- actors ---------- */
const DRAWL=[];let PCUR=0;
function drawPick(p){
  if(p.t>13&&((FRAME>>2)&1))return;
  const z=p.z+.25+Math.sin(p.t*4)*.12,x=p.x,y=p.y,sp=p.t*3;
  shadowOf(x,y,.32,z);beginActor();
  if(p.k==='repair'){const c=Math.cos(sp)*.28,s=Math.sin(sp)*.28;cap3(x-c,y-s*.3,z,x+c,y+s*.3,z,.1,.1,RX.green,1,false);cap3(x,y,z-.28,x,y,z+.28,.1,.1,RX.green,1,false);}
  else if(p.k==='cell'){cap3(x,y,z-.2,x,y,z+.22,.17,.17,RX.amber,1,false);ball(x,y,z+.32,.07,RM.steel,2,false);}
  else{ball(x,y,z,.21,RX.silver,1,true);const c=Math.cos(sp),s=Math.sin(sp);ball(x+c*.12,y+s*.12,z+.08,.07,RM.white,2,false);}
  outlinePass(OUTLINE);
}
function drawGhost(t){
  const P=PLY,dx=t.x-P.x,dy=t.y-P.y,a=t.life/.25;
  setGhost([90,220,255],.25+.4*a);
  drawPlayer({...P,x:t.x,y:t.y,body:t.body,turret:t.turret,ghost:1,muz:0,flash:0,inv:0,dashT:1,feet:P.feet.map(f=>({...f,x:f.x+dx,y:f.y+dy}))});
}
function drawSorted(){
  DRAWL.length=0;
  for(const p of WORLD.props)if(!p.dead)DRAWL.push({k:p.kind==='sky'?-99:p.y1,t:0,o:p});
  for(const u of EN)if(!u.dead&&!u.d.fly)DRAWL.push({k:u.y,t:1,o:u});
  if(!PLY.dead){DRAWL.push({k:PLY.y,t:2,o:PLY});for(const t of PLY.trail)DRAWL.push({k:t.y-.01,t:4,o:t});}
  for(const p of PICK)DRAWL.push({k:p.y,t:3,o:p});
  DRAWL.sort((a,b)=>a.k-b.k);PCUR=0;
  for(const d of DRAWL){switch(d.t){case 0:drawProp(d.o);break;case 1:d.o.d.draw(d.o);break;case 2:{const c0=CUR;drawPlayer(d.o);if(CUR!==c0)PCUR=CUR;break;}case 3:drawPick(d.o);break;case 4:drawGhost(d.o);break;}}
  MODE=0;
  if(PCUR&&!PLY.dead){const P=PLY,t=L2W(P,P.turret,-.1,0);MODE=4;XRAY=PCUR;XRAYC=pack(255,176,70);ball(t[0],t[1],2.05+P.bob,.5,RM.amber,0,false);ball(P.x,P.y,1.5+P.bob,.28,RM.amber,0,false);MODE=0;}
}
function drawAir(){
  for(const u of EN){if(u.dead)continue;
    if(u.d.fly)u.d.draw(u);
    if(u.type==='turret'&&u.st==='charge'){const o=L2W(u,u.aim,1.0,0),L=rayLen(o[0],o[1],u.aim,17,1.0);dotLine3(o[0],o[1],1.24,o[0]+Math.cos(u.aim)*L,o[1]+Math.sin(u.aim)*L,1.0,pack(255,60,40),2);}
    if(u.type==='tank'&&u.st==='aim'){const o=L2W(u,u.aim,1.85,0),L=rayLen(o[0],o[1],u.aim,17,1.0),c=u.stT>.6&&((FRAME>>1)&1)?pack(255,230,200):pack(255,50,36);dotLine3(o[0],o[1],1.18,o[0]+Math.cos(u.aim)*L,o[1]+Math.sin(u.aim)*L,1.0,c,2);}
    if(u.type==='maw'&&u.st==='charge'){const e=L2W(u,u.body,.85,0);ball(e[0],e[1],2.65,.2+u.stT*.35,RM.hot,9,false);}
    if(u.beams)for(const bm of u.beams){const w=.15+.05*Math.sin(G.t*70),ez=Math.min(bm.oz,1.0);
      cap3(bm.ox,bm.oy,bm.oz,bm.ex,bm.ey,ez,w*1.7,w*2.3,RX.beamO,1,false);cap3(bm.ox,bm.oy,bm.oz,bm.ex,bm.ey,ez,w*.7,w*.9,RX.beamI,2,false);
      ball(bm.ex,bm.ey,ez,.32+Math.random()*.18,RM.muzzle,3,false);ball(bm.ox,bm.oy,bm.oz,.26,RM.muzzle,3,false);}
  }
  if(!PLY.dead)for(const d of PLY.drones)drawDrone(d);
  for(const p of PODS){const k=1-p.t/p.T,z=k*k*34,r=p.big?1.1:.45,x=p.x+k*k*5,y=p.y-k*k*2;
    if(z<.05)continue;beginActor();cap3(x,y,z+r*2.4,x,y,z+r*.6,r*.75,r,p.big?RX.podR:RX.pod,1,true);ball(x,y,z+r*.35,r*(.7+Math.random()*.3),RM.glow,2,false);outlinePass(OUTLINE);}
  for(const s of SHELLS){const p=shellPos(s);ball(p[0],p[1],p[2],.2,RM.dark,1,false);ball(p[0],p[1],p[2]+.12,.08,RM.hot,2,false);}
  for(const b of BOMBS){ball(b.x,b.y,b.z,.2,RM.black,1,false);ball(b.x,b.y,b.z+.14,.07,RM.eye,2,false);}
  for(const m of MIS){if(m.delay>0)continue;const sp=Math.hypot(m.vx,m.vy)||1,dx=m.vx/sp,dy=m.vy/sp;
    cap3(m.x-dx*.42,m.y-dy*.42,m.z-m.vz*.02,m.x,m.y,m.z,.08,.07,m.team==='p'?RM.white:RM.red2,1,false);ball(m.x-dx*.5,m.y-dy*.5,m.z,.1+Math.random()*.06,RM.glow,2,false);}
  for(const b of BUL){const k=b.kind;
    if(k==='pb')cap3(b.x-b.vx*.03,b.y-b.vy*.03,b.z,b.x,b.y,b.z,.06,.09,P_OD()?RM.cyanE:RM.muzzle,1,false);
    else if(k==='db')cap3(b.x-b.vx*.025,b.y-b.vy*.025,b.z,b.x,b.y,b.z,.05,.07,RM.cyanE,1,false);
    else if(k==='hs'){ball(b.x,b.y,b.z,.24,RM.hot,1,false);ball(b.x,b.y,b.z,.12,RM.muzzle,2,false);}
    else cap3(b.x-b.vx*.03,b.y-b.vy*.03,b.z,b.x,b.y,b.z,.08,.13,RM.eye,1,false);}
}
const P_OD=()=>PLY&&PLY.od>0;
function drawPrt(){
  const smk=WORLD.th.id==='docks'?pack(50,54,68):pack(66,60,56),dust=WORLD.th.id==='docks'?pack(70,74,86):pack(112,100,84);
  for(const p of PRT){const sx=PX(p.x),sy=PY(p.y,p.z);if(sx<-30||sx>W+30||sy<-30||sy>H+30)continue;const a=p.life/p.max;
    switch(p.k){
      case 'fire':{const r=Math.max(.7,p.s*S*(.5+a*.7)),ci=a>.78?0:a>.56?1:a>.36?2:a>.18?3:4;dEll(sx,sy,r,r*.9,FIREC[ci],ci<3?1:.55,1);if(ci<2)dEll(sx,sy,r*.45,r*.4,FIREC[0],1,1);break;}
      case 'smoke':case 'trail':{const r=Math.max(.7,p.s*S),c=p.col?(p.pc||(p.pc=pack(p.col[0],p.col[1],p.col[2]))):smk;dEll(sx,sy,r,r*.85,c,Math.min(1,a*1.4)*.78,0);if(p.k==='trail'&&a>.72)dEll(sx,sy,r*.55,r*.5,FIREC[a>.88?0:1],1,1);break;}
      case 'dust':{const r=Math.max(.7,p.s*S);dEll(sx,sy,r,r*.6,dust,a*.7,0);break;}
      case 'spark':{const c=p.col?(p.pc||(p.pc=pack(p.col[0],p.col[1],p.col[2]))):FIREC[1];dlineE(PX(p.x-p.vx*.022),PY(p.y-p.vy*.022,p.z-p.vz*.022),sx,sy,c);break;}
      default:{const c=p.pc||(p.pc=pack(p.col[0],p.col[1],p.col[2]));px1(sx,sy,c,0);if(p.s>.11)px1(sx+1,sy,c,0);}
    }}
}
/* ---------- dynamic lights ---------- */
function sceneLights(){
  const P=PLY,dock=WORLD.th.id==='docks';
  if(!P.dead){
    const fl=dock?[.42,.56,.78]:[.74,.6,.4],h=L2W(P,P.turret,.9,0);cone(h[0],h[1],P.turret,10.5,.44,fl[0],fl[1],fl[2]);
    light(P.x,P.y,0,2.6,.22,.17,.1);
    if(P.muz>0){const m=L2W(P,P.turret,1.5,P.gun*.9);light(m[0],m[1],1.8,3.4,1.1,.78,.34);}
    if(P.od>0)light(P.x,P.y,0,4,.55+.3*Math.sin(G.t*22),.3,.08);
    for(const d of P.drones)light(d.x,d.y,0,1.7,.08,.24,.34);
  }
  for(const u of EN){if(u.dead)continue;light(u.x,u.y,0,u.r*1.5+.7,.17,.045,.035);
    if(u.muz>0){const m=u.type==='tank'?L2W(u,u.aim,1.9,0):[u.x,u.y];light(m[0],m[1],1.2,u.type==='tank'||u.d.boss?4:2.6,1,.55,.25);}
    if(u.beams)for(const bm of u.beams){const c=Math.cos(Math.atan2(bm.ey-bm.oy,bm.ex-bm.ox)),s=Math.sin(Math.atan2(bm.ey-bm.oy,bm.ex-bm.ox));for(let d=0;d<bm.L;d+=2.2)light(bm.ox+c*d,bm.oy+s*d,0,2.6,.75,.16,.08);light(bm.ex,bm.ey,0,3.4,1.2,.45,.2);}
    if(u.st==='charge'||u.st==='aim'&&u.type==='tank')light(u.x,u.y,0,2.2,.4*Math.min(1,u.stT),.06,.04);}
  for(const b of BUL){if(b.team==='p')light(b.x,b.y,b.z,1.4,b.kind==='db'?.08:.5,b.kind==='db'?.36:.4,b.kind==='db'?.5:.14);else light(b.x,b.y,b.z,b.kind==='hs'?2.4:1.4,.6,b.kind==='hs'?.3:.1,.08);}
  for(const m of MIS)if(m.delay<=0)light(m.x,m.y,m.z,2.1,.75,.42,.12);
  for(const L of LIGHTS){const a=L.life/L.max;light(L.x,L.y,L.z,L.rad*(.5+.5*a),L.col[0]*a,L.col[1]*a,L.col[2]*a);}
  for(const p of PICK){const c=p.k==='repair'?[.1,.5,.12]:p.k==='cell'?[.5,.3,.05]:[.25,.25,.3];light(p.x,p.y,0,1.7,c[0],c[1],c[2]);}
  for(const p of PODS){const k=1-p.t/p.T;light(p.x+k*k*5,p.y-k*k*2,k*k*34*.3,p.big?6:3,.9,.45,.15);}
}
const PROF={};
function renderScene(){
  const T=performance.now.bind(performance);let t=T(),q;
  applyCam();blitGround();groundFx();q=T();PROF.ground=q-t;t=q;
  drawSorted();q=T();PROF.sorted=q-t;t=q;drawAir();drawPrt();q=T();PROF.air=q-t;t=q;
  sceneLights();q=T();PROF.lights=q-t;t=q;lightPass();q=T();PROF.lpass=q-t;t=q;
  acx.putImageData(AIMG,0,0);g.drawImage(ac,0,0);q=T();PROF.blit=q-t;
}
