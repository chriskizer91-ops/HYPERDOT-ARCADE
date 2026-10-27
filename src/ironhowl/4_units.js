/* ===================== machines: built from shaded capsules, legs solved with IK ===================== */
const RM={
  amber:mkRamp('#e08e1c'),amber2:mkRamp('#f2b444'),steel:mkRamp('#646874'),dark:mkRamp('#2c2e36'),black:mkRamp('#17181d'),
  visor:mkRamp('#5af0ff',{emi:1}),glow:mkRamp('#ffb040',{emi:1}),muzzle:mkRamp('#fff2b0',{emi:1}),
  red:mkRamp('#a62a26'),red2:mkRamp('#cc4430'),gun:mkRamp('#4c505a'),eye:mkRamp('#ff3a2a',{emi:1}),eyeY:mkRamp('#ffd040',{emi:1}),
  olive:mkRamp('#5e6c3c'),shield:mkRamp('#48dcff',{emi:1}),purple:mkRamp('#6a3c8c'),bone:mkRamp('#bab2a2'),white:mkRamp('#e8e8f0'),cyanE:mkRamp('#8af8ff',{emi:1}),hot:mkRamp('#ff6a2a',{emi:1})
};
const L2W=(u,ang,f,s)=>{const c=Math.cos(ang),sn=Math.sin(ang);return [u.x+c*f-sn*s,u.y+sn*f+c*s];};
function capL(u,ang,f0,s0,z0,f1,s1,z1,r0,r1,m,pid,edge){const a=L2W(u,ang,f0,s0),b=L2W(u,ang,f1,s1);cap3(a[0],a[1],z0,b[0],b[1],z1,r0,r1,m,pid,edge);}
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
function legs(u,hipW,hz,L,r0,r1,mUp,mLow,mFoot,pid,fr,back){
  for(let i=0;i<u.feet.length;i++){const f=u.feet[i],a=u.body+f.a,hx=u.x+Math.cos(a)*hipW*.5,hy=u.y+Math.sin(a)*hipW*.5,side=Math.sin(f.a)>=0?1:-1;
    const K=knee(hx,hy,hz,f.x,f.y,f.z+r1,L,u.feet.length===2?side:0,u.feet.length===2?u.body:u.body+f.a+Math.PI,u.feet.length===2?back:-.9);
    cap3(hx,hy,hz,K[0],K[1],K[2],r0,r0*.85,mUp,pid,false);cap3(K[0],K[1],K[2],f.x,f.y,f.z+r1*.8,r1*1.1,r1,mLow,pid+1,false);
    if(fr){const c=Math.cos(u.body),s=Math.sin(u.body);cap3(f.x-c*fr*.4,f.y-s*fr*.4,f.z+r1*.7,f.x+c*fr*.6,f.y+s*fr*.6,f.z+r1*.7,r1,r1*.8,mFoot,pid+2,false);}}
}
function shadowOf(x,y,rx,alt){const k=1/(1+(alt||0)*.08),sx=PX(x+(alt||0)*.25)+S*.18,sy=PY(y,0)+S*.12;mulEll(sx,sy,rx*S*k,rx*S*KY*.8*k,.5+Math.min(.35,(alt||0)*.03));}

/* ===================== the player: HOWLER ===================== */
function mkPlayer(){
  const p={kind:'player',x:WW/2,y:WH/2+5,z:0,vx:0,vy:0,r:1.0,hp:100,maxHp:100,heat:0,over:0,aim:-Math.PI/2,turret:-Math.PI/2,body:-Math.PI/2,fireT:0,gun:1,muz:0,
    missT:0,dashT:0,dashCD:0,inv:0,od:0,odM:0,flash:0,bob:0,trail:[],drones:[],up:{},dead:false,deadT:0,hitT:0,kills:0,score:0,mult:1,multT:0};
  mkFeet(p,2,.55);return p;
}
function drawPlayer(u){
  if(u.dead)return;
  if(u.inv>0&&u.dashT<=0&&((FRAME>>2)&1))return;
  const b=u.body,a=u.turret,z=u.bob;
  if(!u.ghost)shadowOf(u.x,u.y,1.25,0);
  beginActor();MODE=umode(u);
  legs(u,1.0,1.45+z,.86,.2,.15,RM.steel,RM.dark,RM.black,1,.5,.35);
  {const l=L2W(u,b,0,-.42),r=L2W(u,b,0,.42);cap3(l[0],l[1],1.5+z,r[0],r[1],1.5+z,.3,.3,RM.dark,7,true);}
  for(const s of [-1,1]){capL(u,a,-.2,s*.9,1.85+z,.38,s*.9,1.85+z,.2,.2,RM.steel,8,true);capL(u,a,.38,s*.9,1.85+z,1.32,s*.9,1.85+z,.09,.08,RM.black,9,true);
    if(u.up.spread)capL(u,a,.3,s*.9+s*.18,1.95+z,1.1,s*.9+s*.18,1.95+z,.06,.06,RM.black,9,true);
    if(u.muz>0&&u.gun===s){const m=L2W(u,a,1.42,s*.9);ball(m[0],m[1],1.85+z,.17,RM.muzzle,10,false);}}
  capL(u,a,-.52,0,2.0+z,.34,0,2.0+z,.62,.56,RM.amber,11,true);
  capL(u,a,-.36,0,2.42+z,.2,0,2.42+z,.42,.36,RM.amber2,12,true);
  for(const s of [-1,1]){capL(u,a,-.36,s*.74,2.34+z,.28,s*.74,2.34+z,.26,.24,RM.dark,13,true);
    if(u.missT<=0)for(const k of [-.09,.09]){const p=L2W(u,a,.42,s*.74+k);ball(p[0],p[1],2.4+z,.06,RM.glow,14,false);}}
  capL(u,a,.5,-.2,2.14+z,.5,.2,2.14+z,.11,.11,RM.visor,15,false);
  for(const s of [-1,1]){const e=L2W(u,a,-.92,s*.24);ball(e[0],e[1],2.05+z,.09,u.od>0?RM.cyanE:RM.glow,16,false);}
  {const t=L2W(u,a,-.55,-.4);cap3(t[0],t[1],2.6+z,t[0],t[1],3.3+z,.03,.02,RM.steel,17,false);}
  MODE=0;outlinePass(OUTLINE);
}
function drawDrone(d){
  shadowOf(d.x,d.y,.4,d.z);beginActor();
  ball(d.x,d.y,d.z,.26,RM.steel,1,true);ball(d.x+Math.cos(d.a)*.18,d.y+Math.sin(d.a)*.18,d.z+.05,.1,RM.visor,2,false);
  for(let k=0;k<4;k++){const a=d.spin+k*Math.PI/2;cap3(d.x,d.y,d.z+.1,d.x+Math.cos(a)*.38,d.y+Math.sin(a)*.38,d.z+.12,.04,.03,RM.dark,3,false);}
  outlinePass(OUTLINE);
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
function umode(u){return u.ghost?2:u.spawnT!=null&&u.spawnT<.35?3:u.flash>0?1:0;}
function mkEnemy(type,x,y){
  const d=EDEF[type],u={kind:'enemy',type,d,x,y,z:d.fly?d.alt:0,vx:0,vy:0,r:d.r,hp:d.hp*(d.boss?1:HPK),max:0,body:Math.random()*TAU,aim:0,t:0,st:'go',stT:0,cool:rnd(.6,2.2),
    flash:0,dead:false,ph:Math.random()*TAU,dir:Math.random()<.5?1:-1,burst:0,bob:0,spawnT:0};
  u.max=u.hp;u.aim=u.body;
  if(d.legs===2)mkFeet(u,2,type==='gunner'?.4:.48);else if(d.legs===4)mkFeet(u,4,type==='goliath'?2.6:.8);else if(d.legs===8){u.feet=[];for(let i=0;i<8;i++){const a=(i<4?-1:1)*(.5+(i%4)*.55);u.feet.push({x:x+Math.cos(a)*3,y:y+Math.sin(a)*3,z:0,t:1,fx:0,fy:0,tx:0,ty:0,a});}}
  return u;
}
/* ---------- enemy drawing ---------- */
function drawScuttler(u){
  const b=u.body,t=u.t*16+u.ph;shadowOf(u.x,u.y,.6,0);beginActor();MODE=umode(u);
  const L=[.62,1.57,2.5];
  for(let k=0;k<6;k++){const s=k<3?1:-1,la=b+s*L[k%3],ph=Math.sin(t+k*1.7),fx=u.x+Math.cos(la)*(.78+ph*.1),fy=u.y+Math.sin(la)*(.78+ph*.1),fz=Math.max(0,Math.cos(t+k*1.7))*.16;
    const kx=u.x+Math.cos(la)*.45,ky=u.y+Math.sin(la)*.45;cap3(u.x,u.y,.5,kx,ky,.72,.07,.06,RM.dark,1,false);cap3(kx,ky,.72,fx,fy,fz,.06,.04,RM.black,2,false);}
  ball(u.x,u.y,.5,.34,RM.red,3,true);ball(u.x-Math.cos(b)*.06,u.y-Math.sin(b)*.06,.7,.25,RM.red2,4,true);
  const e=L2W(u,b,.3,0);ball(e[0],e[1],.56,.09,RM.eye,5,false);
  MODE=0;outlinePass(OUTLINE);
}
function drawGunner(u){
  const b=u.body,a=u.aim;shadowOf(u.x,u.y,.85,0);beginActor();MODE=umode(u);
  legs(u,.8,1.05,.62,.14,.11,RM.gun,RM.dark,RM.black,1,.36,.5);
  capL(u,a,-.25,0,1.4,.2,0,1.4,.44,.4,RM.gun,4,true);capL(u,a,-.1,0,1.72,.15,0,1.72,.28,.24,RM.red,5,true);
  capL(u,a,.05,.5,1.35,.95,.5,1.35,.09,.08,RM.black,6,true);capL(u,a,-.1,.5,1.35,.2,.5,1.35,.16,.15,RM.dark,7,true);
  const e=L2W(u,a,.36,0);ball(e[0],e[1],1.55,.1,u.st==='aim'&&((FRAME>>1)&1)?RM.eyeY:RM.eye,8,false);
  if(u.muz>0){const m=L2W(u,a,1.05,.5);ball(m[0],m[1],1.35,.14,RM.muzzle,9,false);}
  MODE=0;outlinePass(OUTLINE);
}
function drawTank(u){
  const b=u.body,a=u.aim;shadowOf(u.x,u.y,1.5,0);beginActor();MODE=umode(u);
  for(const s of [-1,1]){capL(u,b,-1.05,s*.72,.32,1.05,s*.72,.32,.32,.32,RM.black,1,true);
    for(let i=0;i<6;i++){const f=-1+((i/5)*2+(u.tread||0)%0.4/2)%2;const p=L2W(u,b,f,s*.72);ball(p[0],p[1],.62,.05,RM.dark,2,false);}}
  capL(u,b,-.9,0,.72,.9,0,.72,.62,.58,u.type==='tank'&&WORLD.th.id==='docks'?RM.purple:RM.olive,3,true);
  ball(u.x,u.y,1.15,.5,RM.red2,4,true);
  capL(u,a,.3,0,1.18,1.75,0,1.18,.11,.1,RM.black,5,true);
  const e=L2W(u,a,.25,.3);ball(e[0],e[1],1.4,.08,RM.eye,6,false);
  if(u.muz>0){const m=L2W(u,a,1.85,0);ball(m[0],m[1],1.18,.24,RM.muzzle,7,false);}
  MODE=0;outlinePass(OUTLINE);
}
function drawMortar(u){
  const b=u.body;shadowOf(u.x,u.y,1.1,0);beginActor();MODE=umode(u);
  legs(u,1.0,.85,.7,.12,.09,RM.dark,RM.gun,null,1,0,0);
  ball(u.x,u.y,.85,.52,RM.olive,4,true);
  const tb=L2W(u,u.aim,.32,0);cap3(u.x,u.y,1.0,tb[0],tb[1],2.15,.17,.16,RM.dark,5,true);
  ball(tb[0],tb[1],2.18,.11,u.st==='load'?RM.hot:RM.black,6,false);
  const e=L2W(u,b,-.3,.25);ball(e[0],e[1],1.2,.07,RM.eye,7,false);
  MODE=0;outlinePass(OUTLINE);
}
function drawShielder(u){
  const a=u.aim;shadowOf(u.x,u.y,1.0,0);beginActor();MODE=umode(u);
  legs(u,.9,1.0,.6,.16,.12,RM.purple,RM.dark,RM.black,1,.38,.5);
  capL(u,a,-.3,0,1.35,.15,0,1.35,.5,.46,RM.purple,4,true);
  capL(u,a,-.2,-.62,1.5,.35,-.62,1.2,.16,.2,RM.dark,5,true);
  const e=L2W(u,a,.25,0);ball(e[0],e[1],1.62,.09,RM.eye,6,false);
  if(u.shp==null||u.shp>0){const sh=u.shieldHit>0,low=u.shp!=null&&u.shp<70*HPK&&(FRAME>>1)&1;if(u.st==='stagger'){capL(u,a+.9,.55,-.95,.55,.55,.95,.55,.18,.18,RM.dark,7,false);}else if(!low)capL(u,a,.82,-.95,1.05,.82,.95,1.05,.22,.22,sh?RM.white:RM.shield,7,false);}
  MODE=0;outlinePass(OUTLINE);
}
function drawTurret(u){
  const sx=PX(u.x),sy=PY(u.y,0);if(u.spawnT<1){}
  fillEll(sx,sy,S*1.05,S*1.05*KY,pack(36,38,44));fillEll(sx,sy,S*.8,S*.8*KY,pack(56,58,64));
  beginActor();MODE=umode(u);
  ball(u.x,u.y,.65,.56,RM.steel,1,true);ball(u.x,u.y,1.2,.42,RM.red,2,true);
  capL(u,u.aim,.2,0,1.24,.95,0,1.24,.13,.11,RM.black,3,true);
  const cg=u.st==='charge'?u.stT/1:u.st==='fire'?1:0,e=L2W(u,u.aim,1.0,0);
  ball(e[0],e[1],1.24,.08+cg*.16,cg>0?RM.hot:RM.eye,4,false);
  MODE=0;outlinePass(OUTLINE);
}
function drawBomber(u){
  const b=u.body;shadowOf(u.x,u.y,1.1,u.z);beginActor();MODE=umode(u);
  capL(u,b,-.6,0,u.z,.7,0,u.z,.3,.24,RM.gun,1,true);
  capL(u,b,-.1,-1.0,u.z+.05,-.1,1.0,u.z+.05,.13,.13,RM.dark,2,true);
  for(const s of [-1,1]){const p=L2W(u,b,-.1,s*1.05);ball(p[0],p[1],u.z+.08,.17,RM.steel,3,true);ball(p[0],p[1],u.z+.24,.08,RM.hot,4,false);}
  const e=L2W(u,b,.7,0);ball(e[0],e[1],u.z+.05,.08,RM.eye,5,false);
  MODE=0;outlinePass(OUTLINE);
}
function drawGoliath(u){
  const b=u.body,a=u.aim;shadowOf(u.x,u.y,3.6,0);beginActor();MODE=umode(u);
  legs(u,4.2,3.0,2.3,.38,.3,RM.dark,RM.gun,RM.black,1,0,0);
  capL(u,b,-1.7,0,3.1,1.5,0,3.1,1.45,1.3,RM.red,4,true);
  capL(u,b,-1.4,0,3.9,1.0,0,3.9,1.0,.9,RM.red2,5,true);
  capL(u,b,-2.2,0,3.7,-1.5,0,3.7,.75,.75,RM.dark,6,true);
  for(let i=0;i<6;i++){const p=L2W(u,b,-2.2,(i-2.5)*.22);ball(p[0],p[1],4.3,.09,u.st==='barrage'?RM.hot:RM.eye,7,false);}
  for(const s of [-1,1]){const tp=L2W(u,b,.4,s*1.0);ball(tp[0],tp[1],4.5,.55,RM.steel,8,true);
    const ang=Math.atan2(PLY.y-tp[1],PLY.x-tp[0]);cap3(tp[0],tp[1],4.5,tp[0]+Math.cos(ang)*1.7,tp[1]+Math.sin(ang)*1.7,4.45,.16,.14,RM.black,9,true);
    if(u.muzS===s&&u.muz>0)ball(tp[0]+Math.cos(ang)*1.85,tp[1]+Math.sin(ang)*1.85,4.45,.3,RM.muzzle,10,false);}
  const c=L2W(u,b,1.6,0),pulse=.22+.08*Math.sin(u.t*6);ball(c[0],c[1],3.0,pulse,RM.eye,11,false);
  MODE=0;outlinePass(OUTLINE);
}
function drawMaw(u){
  const b=u.body,z=u.z;shadowOf(u.x,u.y,3.4,z);beginActor();MODE=umode(u);
  for(const f of u.feet){const la=b+f.a,hx=u.x+Math.cos(la)*.9,hy=u.y+Math.sin(la)*.9,kx=(hx+f.x)/2+Math.cos(la)*.3,ky=(hy+f.y)/2+Math.sin(la)*.3;
    cap3(hx,hy,2.2+z,kx,ky,4.0+z*.5,.2,.17,RM.bone,1,false);cap3(kx,ky,4.0+z*.5,f.x,f.y,f.z,.16,.07,RM.dark,2,false);}
  capL(u,b,-2.0,0,2.3+z,-1.0,0,2.3+z,1.5,1.3,RM.purple,3,true);
  ball(u.x,u.y,2.5+z,1.05,RM.dark,4,true);
  for(let i=0;i<5;i++){const e=L2W(u,b,.85,(i-2)*.22);ball(e[0],e[1],2.65+z+(i%2)*.15,i===2?.22:.11,u.st==='charge'||u.st==='beam'?RM.hot:RM.eye,5,false);}
  for(let i=0;i<8;i++){const p=L2W(u,b,-1.5+(i%4)*-.25,(i<4?-1:1)*.5);ball(p[0],p[1],3.4+z,.08,RM.cyanE,6,false);}
  MODE=0;outlinePass(OUTLINE);
}
