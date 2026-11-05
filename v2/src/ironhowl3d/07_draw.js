/* ===================== drawing the scene each frame: machines, pickups, projectiles, beams, lights ===================== */
const RX={green:mkRamp('#5aff6a',{emi:1,k:3}),amber:mkRamp('#ffae2a',{emi:1,k:3}),silver:mkRamp('#c8ccd8',{r:.25,m:.9}),pod:mkRamp('#80848e',{r:.4,m:.7}),podR:mkRamp('#b03a2a',{r:.45,m:.4}),
  podD:mkRamp('#2a2c32',{r:.5,m:.6})};
function drawPick(p){
  if(p.t>13&&((FRAME>>2)&1))return;
  const z=p.z+.35+Math.sin(p.t*4)*.14,x=p.x,y=p.y,sp=p.t*3;
  shadowOf(x,y,.32,z);
  if(p.k==='repair'){const c=Math.cos(sp)*.3,s=Math.sin(sp)*.3;cap3(x-c,y-s,z,x+c,y+s,z,.1,.1,RX.green);cap3(x,y,z-.3,x,y,z+.3,.1,.1,RX.green);glow3(x,y,z,x,y,z,.6,.6,[.2,1,.3],.25);}
  else if(p.k==='cell'){cap3(x,y,z-.22,x,y,z+.22,.17,.17,RX.amber);ball(x,y,z+.34,.07,RM.steel);box3(x,y,z,sp,.4,.06,.5,RM.dark);glow3(x,y,z,x,y,z,.6,.6,[1,.6,.15],.25);}
  else{ball(x,y,z,.21,RX.silver);const c=Math.cos(sp),s=Math.sin(sp);box3(x+c*.16,y+s*.16,z+.08,sp,.16,.1,.1,RM.white);box3(x-c*.12,y-s*.12,z-.06,-sp,.14,.12,.08,RM.dark);}
}
function drawGhost(t){
  const P=PLY,dx=t.x-P.x,dy=t.y-P.y,a=t.life/.25;
  setGhost([90,220,255],.25+.4*a);
  drawPlayer({...P,x:t.x,y:t.y,body:t.body,turret:t.turret,ghost:1,muz:0,flash:0,inv:0,dashT:1,feet:P.feet.map(f=>({...f,x:f.x+dx,y:f.y+dy}))});
}
function dotLine3(x0,y0,z0,x1,y1,z1,col,gap){const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/gap));for(let k=0;k<n;k++){if((k+(FRAME>>1))%3===0)continue;const t=k/n,t2=(k+.5)/n;
  glow3(lerp(x0,x1,t),lerp(y0,y1,t),lerp(z0,z1,t),lerp(x0,x1,t2),lerp(y0,y1,t2),lerp(z0,z1,t2),.05,.05,col,1);}}
function rayLen(ox,oy,ang,len,z){const c=Math.cos(ang),s=Math.sin(ang);for(let d=.6;d<len;d+=.3)if(propAt(ox+c*d,oy+s*d,z,0))return d;return len;}
function drawAir(){
  for(const u of EN){if(u.dead)continue;
    if(u.type==='turret'&&u.st==='charge'){const o=L2W(u,u.aim,1.0,0),L=rayLen(o[0],o[1],u.aim,17,1.0);dotLine3(o[0],o[1],1.24,o[0]+Math.cos(u.aim)*L,o[1]+Math.sin(u.aim)*L,1.0,[1,.25,.15],.5);}
    if(u.type==='tank'&&u.st==='aim'){const o=L2W(u,u.aim,1.85,0),L=rayLen(o[0],o[1],u.aim,17,1.0),c=u.stT>.6&&((FRAME>>1)&1)?[1,.9,.8]:[1,.2,.14];dotLine3(o[0],o[1],1.22,o[0]+Math.cos(u.aim)*L,o[1]+Math.sin(u.aim)*L,1.0,c,.5);}
    if(u.type==='maw'&&u.st==='charge'){const e=L2W(u,u.body,.88,0),r=.2+u.stT*.35;ball(e[0],e[1],2.65,r,RM.hot);glow3(e[0],e[1],2.65,e[0],e[1],2.65,r*3,r*3,[1,.3,.1],.5);}
    if(u.beams)for(const bm of u.beams){const w=.15+.05*Math.sin(G.t*70),ez=Math.min(bm.oz,1.0);
      glow3(bm.ox,bm.oy,bm.oz,bm.ex,bm.ey,ez,w*2.4,w*3.2,[1,.18,.06],.9);glow3(bm.ox,bm.oy,bm.oz,bm.ex,bm.ey,ez,w*.8,w,[1,.9,.75],2.2);
      glow3(bm.ex,bm.ey,ez,bm.ex,bm.ey,ez,.6+Math.random()*.4,.6,[1,.4,.15],1);ball(bm.ex,bm.ey,ez,.3+Math.random()*.15,RM.muzzle);ball(bm.ox,bm.oy,bm.oz,.26,RM.muzzle);}
  }
  if(!PLY.dead)for(const d of PLY.drones)drawDrone(d);
  for(const p of PODS){const k=1-p.t/p.T,z=k*k*34,r=p.big?1.1:.45,x=p.x+k*k*5,y=p.y-k*k*2;
    if(z<.05)continue;cap3(x,y,z+r*2.4,x,y,z+r*.6,r*.75,r,p.big?RX.podR:RX.pod);for(let i=0;i<4;i++){const a=i*Math.PI/2+p.t*3;box3(x+Math.cos(a)*r*.7,y+Math.sin(a)*r*.7,z+r*2,a,r*.3,.05,r*1.2,RX.podD);}
    ball(x,y,z+r*.35,r*(.7+Math.random()*.3),RM.glow);glow3(x,y,z+r*.3,x+k*k*5*.3,y-k*k*.6,z+r*6,r*1.4,r*.3,[1,.5,.15],.9);}
  for(const s of SHELLS){const p=shellPos(s);ball(p[0],p[1],p[2],.2,RM.dark);ball(p[0],p[1],p[2]+.12,.08,RM.hot);glow3(p[0],p[1],p[2],p[0],p[1],p[2],.35,.35,[1,.4,.15],.35);}
  for(const b of BOMBS){ball(b.x,b.y,b.z,.2,RM.black);box3(b.x,b.y,b.z+.22,0,.2,.04,.18,RM.dark);ball(b.x,b.y,b.z+.14,.07,RM.eye);}
  for(const m of MIS){if(m.delay>0)continue;const sp=Math.hypot(m.vx,m.vy)||1,dx=m.vx/sp,dy=m.vy/sp;
    cap3(m.x-dx*.42,m.y-dy*.42,m.z-m.vz*.02,m.x,m.y,m.z,.08,.07,m.team==='p'?RM.white:RM.red2);
    const tx=m.x-dx*.55,ty=m.y-dy*.55;ball(tx,ty,m.z,.1+Math.random()*.06,RM.glow);glow3(tx,ty,m.z,tx-dx*.8,ty-dy*.8,m.z,.22,.04,[1,.6,.2],1.1);}
  const od=P_OD();
  for(const b of BUL){const k=b.kind;
    if(k==='pb'){const c=od?[.4,.95,1]:[1,.85,.45];glow3(b.x-b.vx*.035,b.y-b.vy*.035,b.z,b.x,b.y,b.z,.05,.08,c,2.6);glow3(b.x-b.vx*.02,b.y-b.vy*.02,b.z,b.x,b.y,b.z,.14,.18,c,.35);}
    else if(k==='db')glow3(b.x-b.vx*.025,b.y-b.vy*.025,b.z,b.x,b.y,b.z,.05,.07,[.4,.95,1],2.2);
    else if(k==='hs'){ball(b.x,b.y,b.z,.22,RM.hot);glow3(b.x,b.y,b.z,b.x-b.vx*.05,b.y-b.vy*.05,b.z,.5,.2,[1,.4,.15],.9);}
    else{glow3(b.x-b.vx*.03,b.y-b.vy*.03,b.z,b.x,b.y,b.z,.08,.12,[1,.22,.15],2.2);glow3(b.x,b.y,b.z,b.x,b.y,b.z,.3,.3,[1,.2,.1],.3);}}
}
const P_OD=()=>PLY&&PLY.od>0;
/* ---------- the original's per-dot lights become light requests ---------- */
function sceneLights(){
  const P=PLY;
  if(!P.dead){
    const h=L2W(P,P.turret,.9,0),tg=L2W(P,P.turret,8,0);head.position.set(h[0],2.6+P.bob,h[1]);head.target.position.set(tg[0],0,tg[1]);head.target.updateMatrixWorld();head.intensity=G.mode==='title'?28:34;
    light(P.x,P.y,0,2.6,.22,.17,.1);
    if(P.muz>0){const m=L2W(P,P.turret,1.5,P.gun*.9);light(m[0],m[1],1.8,3.4,1.1,.78,.34);}
    if(P.od>0)light(P.x,P.y,0,4,.55+.3*Math.sin(G.t*22),.3,.08);
    for(const d of P.drones)light(d.x,d.y,0,1.7,.08,.24,.34);
  }else head.intensity=0;
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
/* ---------- the roster page of HOW TO PLAY: the enemies themselves, turning on a dark stage ---------- */
let ROSTERON=false;const RCACHE={u:null};
function drawRoster3D(){
  const v=new T.Vector3();
  if(!RCACHE.u)RCACHE.u=ROSTER.map(r=>{if(!r[0])return null;const u=mkEnemy(r[0],0,0);u.spawnT=9;return u;});
  const cw=MW/4,top=18,chh=(MH-30)/2;
  for(let i=0;i<ROSTER.length;i++){const u=RCACHE.u[i];if(!u)continue;
    const sx=MX+cw*(i%4)+cw/2,sy=MY+top+chh*((i/4)|0)+chh*.4;
    NDC.set(sx/W*2-1,-(sy/H*2-1));RAY.setFromCamera(NDC,camera);v.copy(RAY.ray.direction).multiplyScalar(14).add(RAY.ray.origin);
    const sc=u.type==='tank'?.85:u.type==='bomber'?1:1.15;u.x=v.x;u.y=v.z;u.t+=1/60;u.body=u.aim=G.t*.6+i;
    const zoff=v.y-(u.d.fly?1.8:.9);
    if(u.feet)for(const f of u.feet){const a=u.body+f.a,rr=u.type==='mortar'?.8:.42;f.x=u.x+Math.cos(a)*rr;f.y=u.y+Math.sin(a)*rr;f.z=0;}
    const save=u.z;u.z=u.d.fly?1.8:0;ZOFF=zoff;u.d.draw(u);ZOFF=0;u.z=save;
  }
}
/* ---------- one frame of 3D ---------- */
const PROF={n:0,build:0,hud:0,tick:0};
function render3D(dt){
  const t0=performance.now();
  primsBegin();FX.begin();
  ROSTERON=G.mode==='howto'&&G.howP===1;
  ARENA.grp.visible=!ROSTERON;if(THEME3.sky)THEME3.sky.visible=!ROSTERON;FX.wMesh.visible=!ROSTERON;
  if(ROSTERON){drawRoster3D();PR.xray.mesh.count=0;head.position.copy(camera.position);RAY.setFromCamera(NDC.set(0,.1),camera);head.target.position.copy(RAY.ray.direction).multiplyScalar(14).add(RAY.ray.origin);head.target.updateMatrixWorld();head.intensity=160;head.distance=40;head.angle=1.1;hemi.intensity=1.6;}
  else{head.distance=18;head.angle=.52;hemi.intensity=WORLD&&WORLD.th.id==='docks'?.75:.85;}
  if(!ROSTERON){
    if(PLY&&!PLY.dead)drawPlayer(PLY);
    PR.xray.mesh.count=PR.cap.n;
    if(PLY&&!PLY.dead)for(const t of PLY.trail)drawGhost(t);
    for(const u of EN)if(!u.dead)u.d.draw(u);
    for(const p of PICK)drawPick(p);
    drawAir();FX.parts(dt);FX.ground(dt);sceneLights();FX.weatherUpd();
  }
  primsEnd();
  if(ROSTERON)LREQ.length=0;
  assignLights();FX.end();
  ARENA.update(dt);
  PROF.build+=performance.now()-t0;PROF.n++;
  present();
}
/* ---------- camera follow (the original's): lead toward the aim, frame the boss when it's close ---------- */
function snapCam(){CAM.x=PLY.x;CAM.y=PLY.y;}
function updCam(dt){
  const P=PLY;let tx=P.x,ty=P.y;
  if(!P.dead){tx+=Math.cos(P.turret)*2.6+P.vx*.22;ty+=Math.sin(P.turret)*1.8+P.vy*.22;}
  const B=G.boss;if(B&&!B.dead){const d=Math.hypot(B.x-P.x,B.y-P.y);if(d<18){tx=lerp(tx,(B.x+P.x)/2,.32);ty=lerp(ty,(B.y+P.y)/2,.32);}}
  const k=Math.min(1,dt*4.5);CAM.x+=(tx-CAM.x)*k;CAM.y+=(ty-CAM.y)*k;
  G.shake=Math.max(0,G.shake-dt*2.4);
}
