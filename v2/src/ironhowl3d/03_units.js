/* ===================== machines: the original's capsules and balls, now real 3D parts, plus armour boxes; legs solved with IK ===================== */
const RM={
  amber:mkRamp('#e08e1c',{r:.4,m:.35}),amber2:mkRamp('#dc9c38',{r:.5,m:.3}),steel:mkRamp('#5c606b',{r:.38,m:.65}),legs:mkRamp('#4a4e58',{r:.45,m:.55}),dark:mkRamp('#2e3038',{r:.42,m:.7}),black:mkRamp('#18191e',{r:.5,m:.55}),
  visor:mkRamp('#5af0ff',{emi:1,k:3.2}),glow:mkRamp('#ffb040',{emi:1,k:3.2}),muzzle:mkRamp('#fff2b0',{emi:1,k:8}),
  red:mkRamp('#a62a26',{r:.42,m:.3}),red2:mkRamp('#cc4430',{r:.4,m:.3}),gun:mkRamp('#4c505a',{r:.38,m:.75}),eye:mkRamp('#ff3a2a',{emi:1,k:4.5}),eyeY:mkRamp('#ffd040',{emi:1,k:4.5}),
  olive:mkRamp('#5e6c3c',{r:.6,m:.25}),shield:mkRamp('#48dcff',{emi:1,k:2.5}),purple:mkRamp('#6a3c8c',{r:.42,m:.4}),bone:mkRamp('#bab2a2',{r:.6,m:.1}),white:mkRamp('#e8e8f0',{r:.35,m:.25}),
  cyanE:mkRamp('#8af8ff',{emi:1,k:4.5}),hot:mkRamp('#ff6a2a',{emi:1,k:5.5}),hazard:mkRamp('#e8b020',{r:.5,m:.2}),rubber:mkRamp('#1c1c20',{r:.85,m:0}),
  plateD:mkRamp('#3a3328',{r:.5,m:.5}),redE:mkRamp('#ff2a20',{emi:1,k:6}),lamp:mkRamp('#fff4e0',{emi:1,k:7}),green:mkRamp('#4aff6a',{emi:1,k:5})
};
const L2W=(u,ang,f,s)=>{const c=Math.cos(ang),sn=Math.sin(ang);return [u.x+c*f-sn*s,u.y+sn*f+c*s];};
function capL(u,ang,f0,s0,z0,f1,s1,z1,r0,r1,m){const a=L2W(u,ang,f0,s0),b=L2W(u,ang,f1,s1);cap3(a[0],a[1],z0,b[0],b[1],z1,r0,r1,m);}
function boxL(u,ang,f,s,z,lf,ls,lh,m,pitch,roll){const p=L2W(u,ang,f,s);box3(p[0],p[1],z,ang,lf,ls,lh,m,pitch,roll);}
function knee(hx,hy,hz,fx,fy,fz,L,side,b,back){
  const dx=fx-hx,dy=fy-hy,dz=fz-hz,d=Math.hypot(dx,dy,dz)||1e-4,mx=(hx+fx)/2,my=(hy+fy)/2,mz=(hz+fz)/2,dd=Math.min(d,2*L*.999),h=Math.sqrt(Math.max(0,L*L-dd*dd/4));
  let nx=-Math.sin(b)*side*.75-Math.cos(b)*(back??.35),ny=Math.cos(b)*side*.75-Math.sin(b)*(back??.35),nz=.65;
  const ux=dx/d,uy=dy/d,uz=dz/d,dt=nx*ux+ny*uy+nz*uz;nx-=dt*ux;ny-=dt*uy;nz-=dt*uz;const nl=Math.hypot(nx,ny,nz)||1;
  return [mx+nx/nl*h,my+ny/nl*h,mz+nz/nl*h];
}
function mkFeet(u,n,hipW){u.feet=[];for(let i=0;i<n;i++){const a=u.body+(n===2?(i?1:-1)*Math.PI/2:i/n*TAU+Math.PI/4);u.feet.push({x:u.x+Math.cos(a)*hipW,y:u.y+Math.sin(a)*hipW,z:0,t:1,fx:0,fy:0,tx:0,ty:0,a:n===2?(i?1:-1)*Math.PI/2:i/n*TAU+Math.PI/4});}}
function updFeet(u,dt,stride,dur,hipW,onStep){
  const n=u.feet.length;
  for(let i=0;i<n;i++){
    const f=u.feet[i],a=u.body+f.a,hx=u.x+Math.cos(a)*hipW+u.vx*.2,hy=u.y+Math.sin(a)*hipW+u.vy*.2;
    if(f.t>=1){let ok=true;if(n===2)ok=u.feet[1-i].t>=1;else ok=u.feet[(i+1)%n].t>=1&&u.feet[(i+n-1)%n].t>=1;
      if(ok&&Math.hypot(f.x-hx,f.y-hy)>stride){f.t=0;f.fx=f.x;f.fy=f.y;f.tx=hx+u.vx*.14;f.ty=hy+u.vy*.14;}}
    else{f.t=Math.min(1,f.t+dt/dur);const e=f.t*f.t*(3-2*f.t);f.x=lerp(f.fx,f.tx,e);f.y=lerp(f.fy,f.ty,e);f.z=Math.sin(f.t*Math.PI)*stride*.45;if(f.t>=1){f.z=0;if(onStep)onStep(f);}}
  }
}
/* legs: thigh and shin capsules meeting at an IK knee, a knee joint, and a foot plate that sits flat */
function legs(u,hipW,hz,L,r0,r1,mUp,mLow,mFoot,fr,back,mJoint){
  for(let i=0;i<u.feet.length;i++){const f=u.feet[i],a=u.body+f.a,hx=u.x+Math.cos(a)*hipW*.5,hy=u.y+Math.sin(a)*hipW*.5,side=Math.sin(f.a)>=0?1:-1;
    const K=knee(hx,hy,hz,f.x,f.y,f.z+r1,L,u.feet.length===2?side:0,u.feet.length===2?u.body:u.body+f.a+Math.PI,u.feet.length===2?back:-.9);
    cap3(hx,hy,hz,K[0],K[1],K[2],r0,r0*.85,mUp);cap3(K[0],K[1],K[2],f.x,f.y,f.z+r1*.8,r1*1.1,r1,mLow);
    if(mJoint)ball(K[0],K[1],K[2],r0*1.12,mJoint);
    if(fr&&mFoot){const c=Math.cos(u.body),s=Math.sin(u.body);box3(f.x+c*fr*.1,f.y+s*fr*.1,f.z+r1*.55,u.body,fr*1.15,r1*2.4,r1*1.1,mFoot);
      cap3(f.x-c*fr*.4,f.y-s*fr*.4,f.z+r1*.7,f.x+c*fr*.6,f.y+s*fr*.6,f.z+r1*.7,r1*.8,r1*.65,mFoot);}}
}
function shadowOf(x,y,rx,alt){if(MODE===2||ROSTERON)return;const k=1/(1+(alt||0)*.08);FX.blob(x+(alt||0)*.25,y+(alt||0)*.1,rx*k*1.05,.55+Math.min(.3,(alt||0)*.03));}

/* ===================== the player: HOWLER ===================== */
function mkPlayer(){
  const p={kind:'player',x:WW/2,y:WH/2+5,z:0,vx:0,vy:0,r:1.0,hp:150,maxHp:150,bst:{dmg:0,rate:0,spr:0},heat:0,over:0,aim:-Math.PI/2,turret:-Math.PI/2,body:-Math.PI/2,fireT:0,gun:1,muz:0,
    missT:0,dashT:0,dashCD:0,inv:0,od:0,odM:0,flash:0,bob:0,trail:[],drones:[],up:{},dead:false,deadT:0,hitT:0,kills:0,score:0,mult:1,multT:0,rec:[0,0],sway:0};
  mkFeet(p,2,.55);return p;
}
/* gun barrels warm up as the heat bar fills: black, then dull red, then orange-white */
const HEATM={c:[0,0,0],emi:0,r:.4,m:.6};
function heatMat(h){const t=clamp((h-.35)/.65,0,1);let c;
  if(t<.5){const k=t/.5;c=[lerp(.012,.42,k),lerp(.012,.025,k),lerp(.014,.004,k)];}else{const k=(t-.5)/.5;c=[lerp(.42,1,k),lerp(.025,.5,k),lerp(.004,.12,k)];}
  HEATM.c=c;HEATM.emi=t*t*2.2;return HEATM;}
const FINHOT={c:[.75,.16,.03],emi:.9,r:.5,m:.3};
/* a box laid along a segment (thigh and shin armour) */
function seg(x0,y0,z0,x1,y1,z1,w,h,mt,frac){const dx=x1-x0,dy=y1-y0,dz=z1-z0,hl=Math.hypot(dx,dy);box3((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,Math.atan2(dy,dx),Math.hypot(hl,dz)*(frac||1),w,h,mt,Math.atan2(dz,hl));}
/* moving parts that live between frames: spinning barrels, pod lids, radiator fins, steam */
function animPlayer(dt){
  const P=PLY;if(!P||P.dead)return;
  const hot=G.t-(P.lastFire??-9)<.14;
  P.spinV=lerp(P.spinV||0,hot?(P.od>0?46:30):0,Math.min(1,dt*(hot?10:2.2)));P.spin=(P.spin||0)+P.spinV*dt;
  P.lid=lerp(P.lid||0,P.missT<=0?1:0,Math.min(1,dt*7));
  P.fin=lerp(P.fin||0,P.over>0?1:P.heat>72?.3:0,Math.min(1,dt*(P.over>0?12:4)));
  if(P.over>0){
    for(const s of [-1,1]){if(Math.random()<.85){const p=L2W(P,P.turret,-1.0,s*.18),c=Math.cos(P.turret),sn=Math.sin(P.turret);
        prt({k:'steam',x:p[0],y:p[1],z:2.35+P.bob,vx:-c*rnd(2.5,5)+rnd(-.6,.6),vy:-sn*rnd(2.5,5)+rnd(-.6,.6),vz:rnd(1.6,3.4),life:rnd(.5,.9),max:.9,s:.16,grow:2.6,drag:.93});}
      if(Math.random()<.35){const m=L2W(P,P.turret,1.38,s*.9);prt({k:'steam',x:m[0],y:m[1],z:1.9,vx:rnd(-.3,.3),vy:rnd(-.3,.3),vz:rnd(1,2),life:rnd(.4,.7),max:.7,s:.08,grow:2.2,drag:.95});}}
    {const v=L2W(P,P.turret,-1.9,0),k=.6+.4*Math.sin(G.t*18);light(v[0],v[1],1.4,2.6,.32*k,.07*k,.02*k);}
  }else if(P.heat>65&&Math.random()<.25){const s=Math.random()<.5?1:-1,m=L2W(P,P.turret,rnd(.6,1.3),s*.9);prt({k:'steam',x:m[0],y:m[1],z:1.95,vx:0,vy:0,vz:rnd(.6,1.2),life:.6,max:.6,s:.05,grow:2,drag:.95});}
  if(P.heat>60){const k=(P.heat-60)/40;for(const s of [-1,1]){const m=L2W(P,P.turret,1.7,s*.9);light(m[0],m[1],1.2,1.6,.45*k,.1*k,.02*k);}}
}
function drawPlayer(u){
  if(u.dead)return;
  if(u.inv>0&&u.dashT<=0&&((FRAME>>2)&1))return;
  const b=u.body,a=u.turret,z=u.bob,od=u.od>0,hm=heatMat(u.over>0?Math.max(.9,u.heat/100):u.heat/100);
  if(!u.ghost)shadowOf(u.x,u.y,1.3,0);
  MODE=umode(u);
  const cb=Math.cos(b),sb=Math.sin(b);
  /* legs: thigh with armour, knee cap, shin guard, a hydraulic piston that slides as the knee bends, ankle, clawed foot */
  for(let i=0;i<u.feet.length;i++){const f=u.feet[i],side=Math.sin(f.a)>=0?1:-1,hp=L2W(u,b,0,side*.5),hz=1.45+z;
    const K=knee(hp[0],hp[1],hz,f.x,f.y,f.z+.15,.86,side,b,.35),ax=f.x,ay=f.y,az=f.z+.14;
    cap3(hp[0],hp[1],hz,K[0],K[1],K[2],.19,.16,RM.legs);seg(hp[0],hp[1],hz,K[0],K[1],K[2],.32,.3,RM.amber,.62);
    ball(K[0],K[1],K[2],.19,RM.dark);box3(K[0]+cb*.15,K[1]+sb*.15,K[2]+.02,b,.14,.28,.3,RM.amber2,.5);
    cap3(K[0],K[1],K[2],ax,ay,az,.16,.13,RM.dark);seg(lerp(K[0],ax,.15),lerp(K[1],ay,.15),lerp(K[2],az,.15),lerp(K[0],ax,.7),lerp(K[1],ay,.7),lerp(K[2],az,.7),.24,.22,RM.gun);
    {const A=[lerp(hp[0],K[0],.35)-cb*.2,lerp(hp[1],K[1],.35)-sb*.2,lerp(hz,K[2],.35)],B=[lerp(K[0],ax,.45)-cb*.19,lerp(K[1],ay,.45)-sb*.19,lerp(K[2],az,.45)];
      const dx=B[0]-A[0],dy=B[1]-A[1],dz=B[2]-A[2],d=Math.hypot(dx,dy,dz)||1,L=Math.min(.44,d*.7);
      cap3(A[0],A[1],A[2],A[0]+dx/d*L,A[1]+dy/d*L,A[2]+dz/d*L,.065,.06,RM.steel);cap3(B[0],B[1],B[2],B[0]-dx/d*L,B[1]-dy/d*L,B[2]-dz/d*L,.035,.035,RM.white);}
    ball(ax,ay,az,.13,RM.black);
    box3(ax+cb*.04,ay+sb*.04,f.z+.09,b,.58,.36,.16,RM.black);
    for(const k of [-.12,0,.12]){const tx=ax+cb*.36-sb*k,ty=ay+sb*.36+cb*k;box3(tx,ty,f.z+.07,b,.22,.085,.1,RM.dark,-.3);}
    box3(ax-cb*.32,ay-sb*.32,f.z+.1,b,.18,.12,.1,RM.dark,.45);}
  /* hips and skirts */
  boxL(u,b,-.04,0,1.52+z,.62,.88,.36,RM.gun);
  for(const s of [-1,1])boxL(u,b,0,s*.6,1.4+z,.56,.08,.42,RM.amber,0,s*.28);
  boxL(u,b,.34,0,1.38+z,.08,.5,.34,RM.amber2,.3);
  cyl3(u.x,u.y,1.66+z,u.x,u.y,1.84+z,.34,RM.black);
  /* torso, turning with the guns */
  boxL(u,a,-.12,0,2.04+z,1.12,1.06,.66,RM.amber);
  boxL(u,a,-.22,0,2.4+z,.78,.9,.08,RM.amber2);
  for(const s of [-1,1])for(const f of [-.42,.14])boxL(u,a,f,s*.535,2.04+z,.03,.02,.58,RM.black);
  boxL(u,a,.5,0,2.0+z,.32,.86,.52,RM.amber2,-.45);
  for(let k=0;k<5;k++)boxL(u,a,.63,-.32+k*.16,1.82+z,.04,.15,.07,k%2?RM.black:RM.hazard,-.45);
  /* head: armoured cockpit with a glowing visor slit and two running lights */
  boxL(u,a,.14,0,2.58+z,.6,.56,.3,RM.amber2);boxL(u,a,.48,0,2.55+z,.16,.5,.24,RM.amber2,-.6);
  boxL(u,a,.55,0,2.58+z,.05,.42,.07,RM.visor,-.6);
  for(const s of [-1,1]){const p=L2W(u,a,.44,s*.27);ball(p[0],p[1],2.66+z,.035,RM.redE);}
  boxL(u,a,-.02,0,2.76+z,.36,.3,.06,RM.dark);
  /* shoulder floodlight */
  boxL(u,a,.22,-.62,2.62+z,.24,.18,.15,RM.dark);boxL(u,a,.35,-.62,2.62+z,.02,.14,.1,RM.lamp);
  /* back: engine block, radiator fins that swing open to vent, exhausts */
  boxL(u,a,-.76,0,2.06+z,.3,.82,.52,RM.dark);
  {const th=u.fin*1.0;for(let k=0;k<4;k++){const sk=-.27+k*.18,fw=-.93-Math.sin(th)*.21,fz=1.95+Math.cos(th)*.21;boxL(u,a,fw,sk,fz+z,.035,.14,.42,u.fin>.15&&MODE===0?FINHOT:RM.steel,th);}}
  for(const s of [-1,1]){const p=L2W(u,a,-.78,s*.3),q=L2W(u,a,-.96,s*.3);cyl3(p[0],p[1],2.38+z,q[0],q[1],2.72+z,.07,RM.black);
    if(od||u.fin>.15)ball(q[0],q[1],2.74+z,.06,od?RM.cyanE:RM.hot);
    if(MODE===0&&od){glow3(q[0],q[1],2.74+z,q[0],q[1],3.1+z,.12,.03,[.3,.9,1],.6);}}
  /* arms: shoulder joint and armour, gun housing, ammo drum, a three-barrel rotary cannon that spins up and glows with heat */
  for(const s of [-1,1]){
    const rk=u.rec[s>0?1:0]*.2;
    {const p=L2W(u,a,0,s*.5),q=L2W(u,a,0,s*.76);cyl3(p[0],p[1],1.95+z,q[0],q[1],1.95+z,.17,RM.dark);}
    boxL(u,a,-.02,s*.86,2.17+z,.64,.38,.16,RM.amber,0,s*.2);
    boxL(u,a,.02,s*.9,1.86+z,.66,.3,.3,RM.gun);boxL(u,a,.02,s*.9,2.03+z,.5,.22,.05,RM.amber2);
    {const p=L2W(u,a,-.14,s*.76),q=L2W(u,a,-.14,s*1.04);cyl3(p[0],p[1],1.66+z,q[0],q[1],1.66+z,.14,RM.dark);}
    {const p=L2W(u,a,-.26,s*.62),q=L2W(u,a,-.12,s*.8);cap3(p[0],p[1],2.0+z,q[0],q[1],1.76+z,.045,.045,RM.black);}
    const sp=(u.spin||0)*(s>0?1:-1);
    for(let k=0;k<3;k++){const an=sp+k*2.094,o1=Math.cos(an)*.068,o2=Math.sin(an)*.068;capL(u,a,.34-rk,s*.9+o1,1.85+z+o2,1.3-rk,s*.9+o1,1.85+z+o2,.042,.036,hm);}
    for(const f of [.7,1.08])boxL(u,a,f-rk,s*.9,1.85+z,.05,.21,.21,RM.dark);
    boxL(u,a,1.33-rk,s*.9,1.85+z,.12,.22,.22,RM.black);
    if(u.up.spread){capL(u,a,.3,s*.9+s*.2,1.98+z,1.08,s*.9+s*.2,1.98+z,.05,.05,RM.black);if(u.up.spread>1)capL(u,a,.3,s*.9-s*.2,1.98+z,1.08,s*.9-s*.2,1.98+z,.05,.05,RM.black);}
    if(u.muz>0&&u.gun===s&&MODE===0){const m=L2W(u,a,1.46-rk,s*.9),e=L2W(u,a,2.3,s*.9),col=od?[.4,.95,1]:[1,.85,.45];
      ball(m[0],m[1],1.85+z,.16,od?RM.cyanE:RM.muzzle);glow3(m[0],m[1],1.85+z,e[0],e[1],1.85+z,.28,.05,col,1.3);glow3(m[0],m[1],1.85+z,m[0],m[1],1.85+z,.55,.55,col,.35);
      const c1=L2W(u,a,1.5-rk,s*.9-.32),c2=L2W(u,a,1.5-rk,s*.9+.32);glow3(c1[0],c1[1],1.85+z,c2[0],c2[1],1.85+z,.05,.05,col,.9);}
    /* missile pod: a lid that flips open when the salvo is ready */
    boxL(u,a,-.06,s*.74,2.44+z,.72,.42,.42,RM.dark);
    {const th=(u.lid||0)*1.05,lf=-.4+Math.cos(th)*.3,lz=2.67+Math.sin(th)*.3;boxL(u,a,lf,s*.74,lz+z,.6,.38,.05,RM.amber,th);}
    for(const k of [-.1,.1])for(const kz of [-.09,.09]){const p=L2W(u,a,.31,s*.74+k);ball(p[0],p[1],2.44+z+kz,.065,u.missT<=0?RM.glow:RM.black);}
  }
  {const t=L2W(u,a,-.5,-.4);cap3(t[0],t[1],2.62+z,t[0],t[1],3.32+z,.03,.018,RM.steel);if((FRAME>>4)&1)ball(t[0],t[1],3.34+z,.05,RM.redE);}
  MODE=0;
}
function drawDrone(d){
  shadowOf(d.x,d.y,.4,d.z);
  ball(d.x,d.y,d.z,.26,RM.steel);ball(d.x+Math.cos(d.a)*.18,d.y+Math.sin(d.a)*.18,d.z+.05,.1,RM.visor);
  for(let k=0;k<4;k++){const a=d.spin+k*Math.PI/2;cap3(d.x,d.y,d.z+.1,d.x+Math.cos(a)*.38,d.y+Math.sin(a)*.38,d.z+.12,.04,.03,RM.dark);}
  glow3(d.x,d.y,d.z+.12,d.x,d.y,d.z+.12,.45,.45,[.3,.8,1],.12);
}

/* ===================== enemies ===================== */
const EDEF={
  scuttler:{r:.48,hp:12,spd:7.2,score:100,mass:.6,draw:drawScuttler,think:thinkScuttler,boom:.9},
  gunner:{r:.72,hp:42,spd:3.3,score:250,mass:1.2,legs:2,draw:drawGunner,think:thinkGunner,boom:1.3},
  tank:{r:1.25,hp:150,spd:2.4,score:600,mass:3,draw:drawTank,think:thinkTank,boom:2.2,armor:1},
  mortar:{r:.95,hp:64,spd:2.0,score:450,mass:1.6,legs:4,draw:drawMortar,think:thinkMortar,boom:1.6},
  shield:{r:.85,hp:96,spd:2.9,score:500,mass:2,legs:2,draw:drawShielder,think:thinkShielder,boom:1.6,shield:1},
  turret:{r:.85,hp:130,spd:0,score:550,mass:99,draw:drawTurret,think:thinkTurret,boom:1.8},
  bomber:{r:.8,hp:30,spd:6.5,score:350,mass:.5,fly:1,alt:5.5,draw:drawBomber,think:thinkBomber,boom:1.4},
  goliath:{r:2.6,hp:6000,spd:1.6,score:20000,mass:99,legs:4,draw:drawGoliath,think:thinkGoliath,boom:5,boss:1,name:'GOLIATH'},
  maw:{r:2.4,hp:9500,spd:3,score:40000,mass:99,legs:8,draw:drawMaw,think:thinkMaw,boom:5,boss:1,name:'THE MAW'}
};
let HPK=1;
function umode(u){FLASHK=u.d&&u.d.boss?.3:1;return u.ghost?2:u.spawnT!=null&&u.spawnT<.35?3:u.flash>0?1:0;}
function mkEnemy(type,x,y){
  const d=EDEF[type],u={kind:'enemy',type,d,x,y,z:d.fly?d.alt:0,vx:0,vy:0,r:d.r,hp:d.hp*(d.boss?1:HPK),max:0,body:Math.random()*TAU,aim:0,t:0,st:'go',stT:0,cool:rnd(.6,2.2),
    flash:0,dead:false,ph:Math.random()*TAU,dir:Math.random()<.5?1:-1,burst:0,bob:0,spawnT:0};
  u.max=u.hp;u.aim=u.body;
  if(d.legs===2)mkFeet(u,2,type==='gunner'?.4:.48);else if(d.legs===4)mkFeet(u,4,type==='goliath'?2.6:.8);else if(d.legs===8){u.feet=[];for(let i=0;i<8;i++){const a=(i<4?-1:1)*(.5+(i%4)*.55);u.feet.push({x:x+Math.cos(a)*3,y:y+Math.sin(a)*3,z:0,t:1,fx:0,fy:0,tx:0,ty:0,a});}}
  return u;
}
/* materializing: a scan ring rises through the machine while it forms */
function holoScan(u,h){if(MODE!==3)return;const k=clamp(u.spawnT/.35,0,1),z=k*h;glow3(u.x,u.y,z,u.x,u.y,z+.04,u.r*1.5,u.r*1.5,[.3,.9,1],.5);}
/* ---------- enemy drawing ---------- */
function drawScuttler(u){
  const b=u.body,t=u.t*16+u.ph;shadowOf(u.x,u.y,.62,0);MODE=umode(u);
  const L=[.62,1.57,2.5];
  for(let k=0;k<6;k++){const s=k<3?1:-1,la=b+s*L[k%3],ph=Math.sin(t+k*1.7),fx=u.x+Math.cos(la)*(.8+ph*.1),fy=u.y+Math.sin(la)*(.8+ph*.1),fz=Math.max(0,Math.cos(t+k*1.7))*.16;
    const kx=u.x+Math.cos(la)*.46,ky=u.y+Math.sin(la)*.46;cap3(u.x,u.y,.5,kx,ky,.76,.075,.06,RM.dark);ball(kx,ky,.76,.075,RM.red2);cap3(kx,ky,.76,fx,fy,fz,.06,.03,RM.black);}
  ball(u.x,u.y,.5,.34,RM.red);ball(u.x-Math.cos(b)*.06,u.y-Math.sin(b)*.06,.7,.25,RM.red2);
  for(let i=0;i<3;i++)boxL(u,b,-.28+i*.2,0,.82-i*.03,.16,.36-i*.04,.08,i%2?RM.red:RM.dark,.15);
  boxL(u,b,-.36,0,.6,.14,.2,.06,RM.eye,.4);
  const e=L2W(u,b,.3,0);ball(e[0],e[1],.56,.09,RM.eye);
  const jaw=Math.sin(u.t*22+u.ph)*.25;for(const s of [-1,1]){const m=L2W(u,b,.34,s*.14);cap3(m[0],m[1],.44,m[0]+Math.cos(b+s*(.35+jaw))*.24,m[1]+Math.sin(b+s*(.35+jaw))*.24,.34,.045,.02,RM.black);}
  holoScan(u,1);MODE=0;
}
function drawGunner(u){
  const b=u.body,a=u.aim;shadowOf(u.x,u.y,.88,0);MODE=umode(u);
  legs(u,.8,1.05,.62,.14,.11,RM.gun,RM.dark,RM.black,.36,.5,RM.red2);
  capL(u,a,-.25,0,1.4,.2,0,1.4,.44,.4,RM.gun);
  boxL(u,a,.18,0,1.42,.32,.62,.46,RM.dark,-.25);boxL(u,a,-.45,0,1.5,.3,.5,.5,RM.black);
  {const p=L2W(u,a,-.5,-.18);cap3(p[0],p[1],1.75,p[0],p[1],2.3,.02,.015,RM.steel);if((FRAME>>3)&1)ball(p[0],p[1],2.31,.035,RM.eye);}
  capL(u,a,-.1,0,1.74,.15,0,1.74,.28,.24,RM.red);boxL(u,a,.2,0,1.76,.1,.36,.05,RM.eye,-.3);
  boxL(u,a,-.05,-.5,1.62,.42,.3,.16,RM.red2,0,-.2);
  capL(u,a,.05,.5,1.35,.95,.5,1.35,.09,.08,RM.black);capL(u,a,-.1,.5,1.35,.2,.5,1.35,.16,.15,RM.dark);
  boxL(u,a,.98,.5,1.35,.12,.16,.16,RM.dark);boxL(u,a,.1,.5,1.16,.3,.16,.18,RM.olive);
  const e=L2W(u,a,.36,0);ball(e[0],e[1],1.56,.1,u.st==='aim'&&((FRAME>>1)&1)?RM.eyeY:RM.eye);
  if(u.st==='aim'){const m=L2W(u,a,1.05,.5);glow3(m[0],m[1],1.35,m[0],m[1],1.35,.25,.25,[1,.8,.2],.35);}
  if(u.muz>0){const m=L2W(u,a,1.05,.5);ball(m[0],m[1],1.35,.14,RM.muzzle);glow3(m[0],m[1],1.35,m[0],m[1],1.35,.4,.4,[1,.5,.3],.4);}
  holoScan(u,2);MODE=0;
}
function drawTank(u){
  const b=u.body,a=u.aim,hull=u.type==='tank'&&WORLD.th.id==='docks'?RM.purple:RM.olive;shadowOf(u.x,u.y,1.55,0);MODE=umode(u);
  const tr=(u.tread||0);
  for(const s of [-1,1]){boxL(u,b,0,s*.74,.33,2.25,.46,.56,RM.rubber);
    for(let i=0;i<5;i++){const f=-.84+i*.42,p=L2W(u,b,f,s*.98),q=L2W(u,b,f,s*.5);cyl3(p[0],p[1],.3,q[0],q[1],.3,.2,RM.dark);}
    for(let i=0;i<7;i++){const f=-1.05+(((i/7)*2.1+tr*.7)%2.1),p=L2W(u,b,f,s*.74);box3(p[0],p[1],.63,b,.1,.48,.04,RM.black);}
    boxL(u,b,0,s*1.0,.62,2.0,.06,.3,hull,0,s*.15);
    for(let i=0;i<4;i++)boxL(u,b,-.75+i*.5,s*1.03,.66,.06,.03,.06,RM.steel);}
  boxL(u,b,-.1,0,.82,1.7,1.16,.52,hull);boxL(u,b,.86,0,.74,.5,1.1,.4,hull,-.55);boxL(u,b,-.92,0,.92,.3,.9,.36,RM.dark);
  capL(u,b,-.9,0,.72,.9,0,.72,.5,.46,hull);
  for(const s of [-1,1]){const p=L2W(u,b,-1.0,s*.32);cyl3(p[0],p[1],1.0,p[0],p[1],1.35,.07,RM.black);}
  if(Math.hypot(u.vx,u.vy)>.4&&Math.random()<.25&&MODE===0&&!G.paused){const p=L2W(u,b,-1.0,(Math.random()<.5?-1:1)*.32);prt({k:'smoke',x:p[0],y:p[1],z:1.4,vx:-Math.cos(b),vy:-Math.sin(b),vz:1.2,life:.8,max:.8,s:.14,grow:1.6,drag:.96,col:[60,58,56]});}
  boxL(u,a,-.05,0,1.28,.95,.86,.42,RM.red2);ball(u.x,u.y,1.15,.46,RM.red2);
  boxL(u,a,.5,0,1.24,.24,.5,.3,RM.dark);cyl3(...L2W(u,a,-.22,.22),1.5,...L2W(u,a,-.22,.22),1.6,.16,RM.dark);
  {const p=L2W(u,a,-.35,-.3);cap3(p[0],p[1],1.48,p[0]-Math.cos(a)*.2,p[1]-Math.sin(a)*.2,2.4,.015,.01,RM.steel);}
  capL(u,a,.3,0,1.22,1.75,0,1.22,.11,.1,RM.black);cyl3(...L2W(u,a,1.1,0),1.22,...L2W(u,a,1.3,0),1.22,.14,RM.dark);boxL(u,a,1.72,0,1.22,.24,.26,.26,RM.dark);
  const e=L2W(u,a,.25,.3);ball(e[0],e[1],1.48,.08,RM.eye);
  if(u.muz>0){const m=L2W(u,a,1.9,0),e2=L2W(u,a,2.8,0);ball(m[0],m[1],1.22,.26,RM.muzzle);glow3(m[0],m[1],1.22,e2[0],e2[1],1.22,.5,.1,[1,.6,.3],1.2);}
  holoScan(u,1.6);MODE=0;
}
function drawMortar(u){
  const b=u.body;shadowOf(u.x,u.y,1.15,0);MODE=umode(u);
  legs(u,1.0,.85,.7,.12,.09,RM.dark,RM.gun,null,0,0,RM.olive);
  for(const f of u.feet)cyl3(f.x,f.y,f.z,f.x,f.y,f.z+.06,.15,RM.black);
  ball(u.x,u.y,.85,.52,RM.olive);boxL(u,b,0,0,.62,.9,.9,.2,RM.dark);boxL(u,b,0,0,1.12,.6,.62,.12,RM.gun);
  const tb=L2W(u,u.aim,.32,0);cap3(u.x,u.y,1.0,tb[0],tb[1],2.15,.17,.16,RM.dark);
  for(const k of [.35,.7]){cyl3(lerp(u.x,tb[0],k),lerp(u.y,tb[1],k),lerp(1.0,2.15,k)-.05,lerp(u.x,tb[0],k),lerp(u.y,tb[1],k),lerp(1.0,2.15,k)+.05,.2,RM.steel);}
  ball(tb[0],tb[1],2.18,.12,u.st==='load'?RM.hot:RM.black);
  if(u.st==='load')glow3(tb[0],tb[1],2.2,tb[0],tb[1],2.2,.5,.5,[1,.4,.15],.3*Math.min(1,u.stT*2));
  for(let i=0;i<3;i++){const p=L2W(u,b,-.5,-.2+i*.2);cap3(p[0],p[1],.9,p[0],p[1],1.25,.07,.06,RM.dark);ball(p[0],p[1],1.28,.06,RM.hot);}
  const e=L2W(u,b,-.3,.25);ball(e[0],e[1],1.2,.07,RM.eye);
  holoScan(u,2.2);MODE=0;
}
function drawShielder(u){
  const a=u.aim;shadowOf(u.x,u.y,1.0,0);MODE=umode(u);
  legs(u,.9,1.0,.6,.16,.12,RM.purple,RM.dark,RM.black,.38,.5,RM.dark);
  capL(u,a,-.3,0,1.35,.15,0,1.35,.5,.46,RM.purple);boxL(u,a,-.15,0,1.62,.7,.7,.2,RM.dark);
  for(const s of [-1,1])boxL(u,a,-.1,s*.5,1.58,.5,.24,.2,RM.purple,0,s*.3);
  ball(...L2W(u,a,.3,0),1.3,.12,u.shp>0?RM.cyanE:RM.eye);
  capL(u,a,-.2,-.62,1.5,.35,-.62,1.2,.16,.2,RM.dark);
  const e=L2W(u,a,.25,0);ball(e[0],e[1],1.62,.09,RM.eye);
  if(u.shp==null||u.shp>0){const sh=u.shieldHit>0,low=u.shp!=null&&u.shp<70*HPK&&(FRAME>>1)&1;
    if(u.st==='stagger'){capL(u,a+.9,.55,-.95,.55,.55,.95,.55,.18,.18,RM.dark);}
    else if(!low){const c=L2W(u,a,.84,0);
      capL(u,a,.84,-.98,.45,.84,.98,.45,.07,.07,RM.dark);capL(u,a,.84,-.98,1.65,.84,.98,1.65,.07,.07,RM.dark);
      for(const s of [-1,1])capL(u,a,.84,s*.98,.45,.84,s*.98,1.65,.07,.07,RM.dark);
      cyl3(...L2W(u,a,.55,-.62),1.05,...L2W(u,a,.78,-.62),1.05,.12,RM.steel);
      glowBox(c[0],c[1],1.05,a,.06,1.95,1.2,sh?[1,1,1]:[.3,.85,1],sh?1.4:.55);
      for(let k=0;k<3;k++){const zz=.65+k*.4+((G.t*.8+u.ph)%1)*.0;glowBox(c[0],c[1],zz,a,.07,1.9,.02,[.5,.95,1],.5);}
      if(MODE===0)glowBox(c[0],c[1],1.05,a,.24,2.1,1.34,[.2,.7,1],.12);}}
  holoScan(u,2);MODE=0;
}
function drawTurret(u){
  shadowOf(u.x,u.y,1.1,0);MODE=umode(u);
  cyl3(u.x,u.y,0,u.x,u.y,.28,1.02,RM.dark);cyl3(u.x,u.y,.28,u.x,u.y,.4,.8,RM.gun);
  for(let k=0;k<6;k++){const an=k/6*TAU+.3;box3(u.x+Math.cos(an)*.92,u.y+Math.sin(an)*.92,.2,an,.2,.32,.4,RM.hazard);}
  ball(u.x,u.y,.68,.56,RM.steel);ball(u.x,u.y,1.2,.42,RM.red);
  for(let k=0;k<3;k++)boxL(u,u.aim,-.38,-.15+k*.15,1.25,.18,.04,.34,RM.dark);
  capL(u,u.aim,.2,0,1.24,.95,0,1.24,.13,.11,RM.black);boxL(u,u.aim,-.1,0,1.36,.5,.5,.18,RM.dark);boxL(u,u.aim,.62,0,1.24,.3,.24,.24,RM.dark);
  {const ra=u.t*2.5;cap3(u.x,u.y,1.55,u.x,u.y,1.85,.03,.03,RM.steel);box3(u.x,u.y,1.9,ra,.06,.5,.22,RM.gun,0,.3);if((FRAME>>3)&1)ball(u.x,u.y,2.05,.05,RM.redE);}
  const cg=u.st==='charge'?u.stT/1:u.st==='fire'?1:0,e=L2W(u,u.aim,1.0,0);
  ball(e[0],e[1],1.24,.08+cg*.16,cg>0?RM.hot:RM.eye);
  if(cg>0)glow3(e[0],e[1],1.24,e[0],e[1],1.24,.3+cg*.5,.3+cg*.5,[1,.35,.15],.25+cg*.35);
  holoScan(u,1.7);MODE=0;
}
function drawBomber(u){
  const b=u.body;shadowOf(u.x,u.y,1.1,u.z);MODE=umode(u);
  capL(u,b,-.6,0,u.z,.7,0,u.z,.3,.24,RM.gun);boxL(u,b,.45,0,u.z+.16,.32,.22,.1,RM.visor,.2);
  boxL(u,b,-.12,0,u.z+.05,.6,2.2,.08,RM.dark);boxL(u,b,-.62,0,u.z+.3,.3,.06,.5,RM.dark,.3);
  for(const s of [-1,1])boxL(u,b,-.62,s*.3,u.z+.18,.26,.04,.34,RM.dark,.3,s*.6);
  boxL(u,b,-.05,0,u.z-.24,.5,.3,.12,RM.black);
  for(const s of [-1,1]){const p=L2W(u,b,-.1,s*1.05);cyl3(p[0],p[1],u.z-.15,p[0],p[1],u.z+.25,.17,RM.steel);cyl3(p[0],p[1],u.z+.25,p[0],p[1],u.z+.3,.19,RM.dark);ball(p[0],p[1],u.z-.18,.09,RM.hot);
    if(MODE===0)glow3(p[0],p[1],u.z-.2,p[0],p[1],u.z-.75,.17,.02,[1,.5,.2],.7);
    const w=L2W(u,b,-.12,s*1.12);if(((FRAME>>4)+(s>0?1:0))&1)ball(w[0],w[1],u.z+.05,.05,s>0?RM.green:RM.redE);}
  const e=L2W(u,b,.7,0);ball(e[0],e[1],u.z+.05,.08,RM.eye);
  holoScan(u,u.z+.5);MODE=0;
}
function drawGoliath(u){
  const b=u.body,a=u.aim;shadowOf(u.x,u.y,3.7,0);MODE=umode(u);
  legs(u,4.2,3.0,2.3,.38,.3,RM.dark,RM.gun,RM.black,1.4,0,RM.red);
  capL(u,b,-1.7,0,3.1,1.5,0,3.1,1.45,1.3,RM.red);
  capL(u,b,-1.4,0,3.9,1.0,0,3.9,1.0,.9,RM.red2);
  boxL(u,b,-.2,0,4.6,2.0,1.5,.3,RM.dark);boxL(u,b,.9,0,3.3,1.0,2.2,1.1,RM.red2,-.5);
  for(const s of [-1,1])boxL(u,b,-.3,s*1.35,3.2,2.4,.3,1.0,RM.plateD);
  capL(u,b,-2.2,0,3.7,-1.5,0,3.7,.75,.75,RM.dark);boxL(u,b,-2.1,0,4.25,.8,1.6,.3,RM.black);
  for(let i=0;i<6;i++){const p=L2W(u,b,-2.2,(i-2.5)*.22);ball(p[0],p[1],4.42,.09,u.st==='barrage'?RM.hot:RM.eye);}
  for(const s of [-1,1]){const tp=L2W(u,b,.4,s*1.0);ball(tp[0],tp[1],4.5,.55,RM.steel);
    const ang=Math.atan2(PLY.y-tp[1],PLY.x-tp[0]);cap3(tp[0],tp[1],4.5,tp[0]+Math.cos(ang)*1.7,tp[1]+Math.sin(ang)*1.7,4.45,.16,.14,RM.black);
    box3(tp[0]+Math.cos(ang)*.3,tp[1]+Math.sin(ang)*.3,4.75,ang,.7,.5,.2,RM.dark);
    if(u.muzS===s&&u.muz>0){const mx=tp[0]+Math.cos(ang)*1.85,my=tp[1]+Math.sin(ang)*1.85;ball(mx,my,4.45,.3,RM.muzzle);glow3(mx,my,4.45,mx+Math.cos(ang)*1.2,my+Math.sin(ang)*1.2,4.45,.6,.1,[1,.6,.3],1.2);}}
  const c=L2W(u,b,1.6,0),pulse=.22+.08*Math.sin(u.t*6);ball(c[0],c[1],3.0,pulse,RM.eye);glow3(c[0],c[1],3.0,c[0],c[1],3.0,pulse*3,pulse*3,[1,.2,.1],.35);
  /* armour, glowing back vents, a searchlight eye and side hatches */
  for(const s of [-1,1]){boxL(u,b,.2,s*1.45,4.05,1.6,.2,.5,RM.red,0,s*.35);for(let i=0;i<3;i++)boxL(u,b,-1.0+i*.45,s*1.2,4.4,.3,.25,.08,u.st==='barrage'?RM.hot:RM.dark);}
  for(let i=0;i<4;i++)boxL(u,b,-1.6,-.45+i*.3,4.0,.06,.2,.5,u.st==='barrage'||u.hp<u.max*.5?RM.hot:RM.black);
  {const c2=L2W(u,b,1.75,0),g2=L2W(u,b,6,0);ball(c2[0],c2[1],3.4,.18,RM.lamp);glow3(c2[0],c2[1],3.4,g2[0],g2[1],.2,.25,1.4,[1,.85,.6],.12);light(g2[0],g2[1],0,3.6,.8,.55,.3);}
  holoScan(u,5);MODE=0;
}
function drawMaw(u){
  const b=u.body,z=u.z;shadowOf(u.x,u.y,3.5,z);MODE=umode(u);
  for(const f of u.feet){const la=b+f.a,hx=u.x+Math.cos(la)*.9,hy=u.y+Math.sin(la)*.9,kx=(hx+f.x)/2+Math.cos(la)*.3,ky=(hy+f.y)/2+Math.sin(la)*.3;
    cap3(hx,hy,2.2+z,kx,ky,4.0+z*.5,.22,.17,RM.bone);ball(kx,ky,4.0+z*.5,.24,RM.dark);cap3(kx,ky,4.0+z*.5,f.x,f.y,f.z,.16,.06,RM.dark);}
  capL(u,b,-2.0,0,2.3+z,-1.0,0,2.3+z,1.5,1.3,RM.purple);
  for(let i=0;i<3;i++)boxL(u,b,-1.2-i*.5,0,3.55+z-i*.12,.32,1.5-i*.2,.2,RM.bone);
  ball(u.x,u.y,2.5+z,1.05,RM.dark);boxL(u,b,.55,0,2.2+z,.7,1.3,.35,RM.black,-.3);
  for(let i=0;i<5;i++){const e=L2W(u,b,.88,(i-2)*.22);ball(e[0],e[1],2.65+z+(i%2)*.15,i===2?.22:.11,u.st==='charge'||u.st==='beam'?RM.hot:RM.eye);}
  for(let i=0;i<8;i++){const p=L2W(u,b,-1.5+(i%4)*-.25,(i<4?-1:1)*.5);ball(p[0],p[1],3.45+z,.08,RM.cyanE);}
  /* spines, a glowing belly and snapping jaws */
  for(let i=0;i<5;i++){const p=L2W(u,b,-.9-i*.3,0);cap3(p[0],p[1],3.4+z-i*.08,p[0]-Math.cos(b)*.2,p[1]-Math.sin(b)*.2,4.3+z-i*.12,.09,.01,RM.bone);}
  ball(u.x,u.y,1.6+z,.6,u.st==='charge'||u.st==='beam'?RM.hot:RM.purple);glow3(u.x,u.y,1.5+z,u.x,u.y,1.5+z,1.2,1.2,[.8,.2,1],.18);
  {const jw=Math.sin(u.t*9)*.3;for(const s of [-1,1]){const p=L2W(u,b,.95,s*.45);cap3(p[0],p[1],2.3+z,p[0]+Math.cos(b+s*(.4+jw))*.9,p[1]+Math.sin(b+s*(.4+jw))*.9,1.9+z,.14,.03,RM.bone);}}
  holoScan(u,4);MODE=0;
}
