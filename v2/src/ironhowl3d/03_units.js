/* ===================== machines: the original's capsules and balls, now real 3D parts, plus armour boxes; legs solved with IK ===================== */
const RM={
  amber:mkRamp('#e08e1c',{r:.4,m:.35}),amber2:mkRamp('#f2b444',{r:.38,m:.3}),steel:mkRamp('#5c606b',{r:.38,m:.65}),legs:mkRamp('#4a4e58',{r:.45,m:.55}),dark:mkRamp('#2e3038',{r:.42,m:.7}),black:mkRamp('#18191e',{r:.5,m:.55}),
  visor:mkRamp('#5af0ff',{emi:1,k:3.2}),glow:mkRamp('#ffb040',{emi:1,k:3.2}),muzzle:mkRamp('#fff2b0',{emi:1,k:8}),
  red:mkRamp('#a62a26',{r:.42,m:.3}),red2:mkRamp('#cc4430',{r:.4,m:.3}),gun:mkRamp('#4c505a',{r:.38,m:.75}),eye:mkRamp('#ff3a2a',{emi:1,k:4.5}),eyeY:mkRamp('#ffd040',{emi:1,k:4.5}),
  olive:mkRamp('#5e6c3c',{r:.6,m:.25}),shield:mkRamp('#48dcff',{emi:1,k:2.5}),purple:mkRamp('#6a3c8c',{r:.42,m:.4}),bone:mkRamp('#bab2a2',{r:.6,m:.1}),white:mkRamp('#e8e8f0',{r:.35,m:.25}),
  cyanE:mkRamp('#8af8ff',{emi:1,k:4.5}),hot:mkRamp('#ff6a2a',{emi:1,k:5.5}),hazard:mkRamp('#e8b020',{r:.5,m:.2}),rubber:mkRamp('#1c1c20',{r:.85,m:0}),
  plateD:mkRamp('#3a3328',{r:.5,m:.5}),redE:mkRamp('#ff2a20',{emi:1,k:6})
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
  const p={kind:'player',x:WW/2,y:WH/2+5,z:0,vx:0,vy:0,r:1.0,hp:100,maxHp:100,heat:0,over:0,aim:-Math.PI/2,turret:-Math.PI/2,body:-Math.PI/2,fireT:0,gun:1,muz:0,
    missT:0,dashT:0,dashCD:0,inv:0,od:0,odM:0,flash:0,bob:0,trail:[],drones:[],up:{},dead:false,deadT:0,hitT:0,kills:0,score:0,mult:1,multT:0,rec:[0,0],sway:0};
  mkFeet(p,2,.55);return p;
}
function drawPlayer(u){
  if(u.dead)return;
  if(u.inv>0&&u.dashT<=0&&((FRAME>>2)&1))return;
  const b=u.body,a=u.turret,z=u.bob,od=u.od>0;
  if(!u.ghost)shadowOf(u.x,u.y,1.3,0);
  MODE=umode(u);
  legs(u,1.0,1.45+z,.86,.2,.15,RM.legs,RM.dark,RM.black,.5,.35,RM.amber);
  /* hips */
  {const l=L2W(u,b,0,-.42),r=L2W(u,b,0,.42);cap3(l[0],l[1],1.5+z,r[0],r[1],1.5+z,.3,.3,RM.dark);boxL(u,b,-.05,0,1.58+z,.6,.62,.36,RM.gun);}
  /* waist and torso, turning with the guns */
  ball(u.x,u.y,1.78+z,.34,RM.black);
  boxL(u,a,-.12,0,2.04+z,1.12,1.06,.66,RM.amber);
  boxL(u,a,.5,0,2.0+z,.32,.86,.52,RM.amber2,-.45);
  boxL(u,a,-.72,0,2.06+z,.26,.8,.5,RM.dark);
  capL(u,a,-.36,0,2.44+z,.16,0,2.44+z,.4,.34,RM.amber2);
  capL(u,a,.62,-.21,2.16+z,.62,.21,2.16+z,.085,.085,RM.visor);
  for(const s of [-1,1]){
    /* shoulder joint, cannon housing, armour cap, barrel with recoil, muzzle brake */
    const rk=u.rec[s>0?1:0]*.24;
    ball(...L2W(u,a,0,s*.66),1.92+z,.22,RM.dark);
    capL(u,a,-.22,s*.9,1.85+z,.36,s*.9,1.85+z,.21,.2,RM.steel);
    boxL(u,a,.04,s*.9,2.06+z,.62,.3,.12,RM.amber);
    capL(u,a,.36-rk,s*.9,1.85+z,1.3-rk,s*.9,1.85+z,.09,.08,RM.black);
    boxL(u,a,1.3-rk,s*.9,1.85+z,.18,.21,.21,RM.dark);
    if(u.up.spread){capL(u,a,.3,s*.9+s*.19,1.96+z,1.08,s*.9+s*.19,1.96+z,.055,.055,RM.black);if(u.up.spread>1)capL(u,a,.3,s*.9-s*.19,1.96+z,1.08,s*.9-s*.19,1.96+z,.055,.055,RM.black);}
    if(u.muz>0&&u.gun===s&&MODE===0){const m=L2W(u,a,1.48-rk,s*.9),e=L2W(u,a,2.2,s*.9),col=od?[.4,.95,1]:[1,.85,.45];
      ball(m[0],m[1],1.85+z,.16,od?RM.cyanE:RM.muzzle);glow3(m[0],m[1],1.85+z,e[0],e[1],1.85+z,.26,.05,col,1.3);glow3(m[0],m[1],1.85+z,m[0],m[1],1.85+z,.5,.5,col,.35);}
    /* missile pods: four tubes each, lit when loaded */
    boxL(u,a,-.06,s*.74,2.44+z,.72,.42,.42,RM.dark);boxL(u,a,-.06,s*.74,2.68+z,.6,.34,.07,RM.amber);
    for(const k of [-.1,.1])for(const kz of [-.09,.09]){const p=L2W(u,a,.31,s*.74+k);ball(p[0],p[1],2.44+z+kz,.065,u.missT<=0?RM.glow:RM.black);}
  }
  for(const s of [-1,1]){const e=L2W(u,a,-.86,s*.26);ball(e[0],e[1],2.0+z,.065,od?RM.cyanE:RM.glow);
    if(MODE===0){const e2=L2W(u,a,-1.1,s*.26);glow3(e[0],e[1],2.0+z,e2[0],e2[1],1.95+z,.1,.04,od?[.3,.9,1]:[1,.6,.2],od?.6:.25);}}
  {const t=L2W(u,a,-.5,-.4);cap3(t[0],t[1],2.6+z,t[0],t[1],3.3+z,.03,.02,RM.steel);if((FRAME>>4)&1)ball(t[0],t[1],3.32+z,.05,RM.redE);}
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
  for(let k=0;k<6;k++){const s=k<3?1:-1,la=b+s*L[k%3],ph=Math.sin(t+k*1.7),fx=u.x+Math.cos(la)*(.78+ph*.1),fy=u.y+Math.sin(la)*(.78+ph*.1),fz=Math.max(0,Math.cos(t+k*1.7))*.16;
    const kx=u.x+Math.cos(la)*.45,ky=u.y+Math.sin(la)*.45;cap3(u.x,u.y,.5,kx,ky,.74,.07,.06,RM.dark);cap3(kx,ky,.74,fx,fy,fz,.06,.035,RM.black);}
  ball(u.x,u.y,.5,.34,RM.red);ball(u.x-Math.cos(b)*.06,u.y-Math.sin(b)*.06,.7,.25,RM.red2);
  boxL(u,b,-.12,0,.84,.36,.3,.1,RM.dark);
  const e=L2W(u,b,.3,0);ball(e[0],e[1],.56,.09,RM.eye);
  for(const s of [-1,1]){const m=L2W(u,b,.34,s*.14);cap3(m[0],m[1],.44,m[0]+Math.cos(b+s*.4)*.2,m[1]+Math.sin(b+s*.4)*.2,.36,.04,.02,RM.black);}
  holoScan(u,1);MODE=0;
}
function drawGunner(u){
  const b=u.body,a=u.aim;shadowOf(u.x,u.y,.88,0);MODE=umode(u);
  legs(u,.8,1.05,.62,.14,.11,RM.gun,RM.dark,RM.black,.36,.5,RM.black);
  capL(u,a,-.25,0,1.4,.2,0,1.4,.44,.4,RM.gun);
  boxL(u,a,.18,0,1.42,.32,.62,.46,RM.dark,-.25);boxL(u,a,-.45,0,1.5,.3,.5,.5,RM.black);
  capL(u,a,-.1,0,1.74,.15,0,1.74,.28,.24,RM.red);
  capL(u,a,.05,.5,1.35,.95,.5,1.35,.09,.08,RM.black);capL(u,a,-.1,.5,1.35,.2,.5,1.35,.16,.15,RM.dark);
  const e=L2W(u,a,.36,0);ball(e[0],e[1],1.56,.1,u.st==='aim'&&((FRAME>>1)&1)?RM.eyeY:RM.eye);
  if(u.muz>0){const m=L2W(u,a,1.05,.5);ball(m[0],m[1],1.35,.14,RM.muzzle);glow3(m[0],m[1],1.35,m[0],m[1],1.35,.4,.4,[1,.5,.3],.4);}
  holoScan(u,2);MODE=0;
}
function drawTank(u){
  const b=u.body,a=u.aim,hull=u.type==='tank'&&WORLD.th.id==='docks'?RM.purple:RM.olive;shadowOf(u.x,u.y,1.55,0);MODE=umode(u);
  const tr=(u.tread||0);
  for(const s of [-1,1]){boxL(u,b,0,s*.74,.33,2.25,.46,.56,RM.rubber);
    for(let i=0;i<5;i++){const f=-.84+i*.42,p=L2W(u,b,f,s*.98),q=L2W(u,b,f,s*.5);cyl3(p[0],p[1],.3,q[0],q[1],.3,.2,RM.dark);}
    for(let i=0;i<7;i++){const f=-1.05+(((i/7)*2.1+tr*.7)%2.1),p=L2W(u,b,f,s*.74);box3(p[0],p[1],.63,b,.1,.48,.04,RM.black);}}
  boxL(u,b,-.1,0,.82,1.7,1.16,.52,hull);boxL(u,b,.86,0,.74,.5,1.1,.4,hull,-.55);boxL(u,b,-.92,0,.92,.3,.9,.36,RM.dark);
  capL(u,b,-.9,0,.72,.9,0,.72,.5,.46,hull);
  boxL(u,a,-.05,0,1.28,.95,.86,.42,RM.red2);ball(u.x,u.y,1.15,.46,RM.red2);
  capL(u,a,.3,0,1.22,1.75,0,1.22,.11,.1,RM.black);boxL(u,a,1.72,0,1.22,.24,.26,.26,RM.dark);
  const e=L2W(u,a,.25,.3);ball(e[0],e[1],1.48,.08,RM.eye);
  if(u.muz>0){const m=L2W(u,a,1.9,0),e2=L2W(u,a,2.8,0);ball(m[0],m[1],1.22,.26,RM.muzzle);glow3(m[0],m[1],1.22,e2[0],e2[1],1.22,.5,.1,[1,.6,.3],1.2);}
  holoScan(u,1.6);MODE=0;
}
function drawMortar(u){
  const b=u.body;shadowOf(u.x,u.y,1.15,0);MODE=umode(u);
  legs(u,1.0,.85,.7,.12,.09,RM.dark,RM.gun,null,0,0,RM.black);
  ball(u.x,u.y,.85,.52,RM.olive);boxL(u,b,0,0,.62,.9,.9,.2,RM.dark);
  const tb=L2W(u,u.aim,.32,0);cap3(u.x,u.y,1.0,tb[0],tb[1],2.15,.17,.16,RM.dark);
  ball(tb[0],tb[1],2.18,.12,u.st==='load'?RM.hot:RM.black);
  if(u.st==='load')glow3(tb[0],tb[1],2.2,tb[0],tb[1],2.2,.5,.5,[1,.4,.15],.3*Math.min(1,u.stT*2));
  const e=L2W(u,b,-.3,.25);ball(e[0],e[1],1.2,.07,RM.eye);
  holoScan(u,2.2);MODE=0;
}
function drawShielder(u){
  const a=u.aim;shadowOf(u.x,u.y,1.0,0);MODE=umode(u);
  legs(u,.9,1.0,.6,.16,.12,RM.purple,RM.dark,RM.black,.38,.5,RM.black);
  capL(u,a,-.3,0,1.35,.15,0,1.35,.5,.46,RM.purple);boxL(u,a,-.15,0,1.62,.7,.7,.2,RM.dark);
  capL(u,a,-.2,-.62,1.5,.35,-.62,1.2,.16,.2,RM.dark);
  const e=L2W(u,a,.25,0);ball(e[0],e[1],1.62,.09,RM.eye);
  if(u.shp==null||u.shp>0){const sh=u.shieldHit>0,low=u.shp!=null&&u.shp<70*HPK&&(FRAME>>1)&1;
    if(u.st==='stagger'){capL(u,a+.9,.55,-.95,.55,.55,.95,.55,.18,.18,RM.dark);}
    else if(!low){const c=L2W(u,a,.84,0);
      capL(u,a,.84,-.98,.45,.84,.98,.45,.07,.07,RM.dark);capL(u,a,.84,-.98,1.65,.84,.98,1.65,.07,.07,RM.dark);
      glowBox(c[0],c[1],1.05,a,.06,1.95,1.2,sh?[1,1,1]:[.3,.85,1],sh?1.4:.55);
      if(MODE===0)glowBox(c[0],c[1],1.05,a,.24,2.1,1.34,[.2,.7,1],.12);}}
  holoScan(u,2);MODE=0;
}
function drawTurret(u){
  shadowOf(u.x,u.y,1.1,0);MODE=umode(u);
  cyl3(u.x,u.y,0,u.x,u.y,.28,1.02,RM.dark);cyl3(u.x,u.y,.28,u.x,u.y,.4,.8,RM.gun);
  for(let k=0;k<6;k++){const an=k/6*TAU+.3;box3(u.x+Math.cos(an)*.92,u.y+Math.sin(an)*.92,.2,an,.2,.32,.4,RM.hazard);}
  ball(u.x,u.y,.68,.56,RM.steel);ball(u.x,u.y,1.2,.42,RM.red);
  capL(u,u.aim,.2,0,1.24,.95,0,1.24,.13,.11,RM.black);boxL(u,u.aim,-.1,0,1.36,.5,.5,.18,RM.dark);
  const cg=u.st==='charge'?u.stT/1:u.st==='fire'?1:0,e=L2W(u,u.aim,1.0,0);
  ball(e[0],e[1],1.24,.08+cg*.16,cg>0?RM.hot:RM.eye);
  if(cg>0)glow3(e[0],e[1],1.24,e[0],e[1],1.24,.3+cg*.5,.3+cg*.5,[1,.35,.15],.25+cg*.35);
  holoScan(u,1.7);MODE=0;
}
function drawBomber(u){
  const b=u.body;shadowOf(u.x,u.y,1.1,u.z);MODE=umode(u);
  capL(u,b,-.6,0,u.z,.7,0,u.z,.3,.24,RM.gun);
  boxL(u,b,-.12,0,u.z+.05,.6,2.2,.08,RM.dark);boxL(u,b,-.62,0,u.z+.3,.3,.06,.5,RM.dark,.3);
  for(const s of [-1,1]){const p=L2W(u,b,-.1,s*1.05);cyl3(p[0],p[1],u.z-.15,p[0],p[1],u.z+.25,.17,RM.steel);ball(p[0],p[1],u.z-.18,.09,RM.hot);
    if(MODE===0)glow3(p[0],p[1],u.z-.2,p[0],p[1],u.z-.75,.17,.02,[1,.5,.2],.7);}
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
  holoScan(u,4);MODE=0;
}
