/* ===================== combat state ===================== */
let PLY=null;
const EN=[],BUL=[],MIS=[],SHELLS=[],BOMBS=[],PODS=[],PICK=[],PRT=[],LIGHTS=[],RINGS=[];
const G={mode:'title',wave:0,phase:'idle',pt:0,queue:[],spawnT:0,score:0,hi:parseInt(store.get('ih-hi','0'),10)||0,shake:0,hurtT:0,boss:null,msg:null,msgT:0,
  kills:0,endless:0,demo:true,t:0,upg:null,upgI:0,camX:WW/2,camY:WH/2,arena:'yard',clearBonus:0,best:parseInt(store.get('ih-bw','0'),10)||0,slow:1,slowT:0};
const angD=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function turnTo(a,b,max){let d=angD(b,a);if(d>max)d=max;if(d<-max)d=-max;return a+d;}
function steer(u,tvx,tvy,dt,acc){const k=Math.min(1,dt*acc);u.vx+=(tvx-u.vx)*k;u.vy+=(tvy-u.vy)*k;}
function leadAng(u,P,spd,ox,oy){const dx=P.x-(ox??u.x),dy=P.y-(oy??u.y),t=Math.hypot(dx,dy)/spd;return Math.atan2(P.y+P.vy*t*.8-(oy??u.y),P.x+P.vx*t*.8-(ox??u.x));}
function shakeIt(k){G.shake=Math.min(1.2,G.shake+k);}
function msg(t,sub,dur,col){G.msg={t,sub,col:col||GR.steel};G.msgT=dur||2;}

/* ---------- particles (world space) ---------- */
function prt(o){if(PRT.length<1400)PRT.push(o);return o;}
function fireball(x,y,z,rad){
  const n=Math.min(40,8+rad*9|0);
  for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(.5,1)*rad*3,up=rnd(.5,3)*rad;prt({k:'fire',x,y,z:z+.3,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:up,life:rnd(.25,.6),max:.6,s:rnd(.4,.9)*rad*.6,drag:.9});}
  for(let i=0;i<n*.7;i++){const a=Math.random()*TAU,v=rnd(.2,1)*rad*1.6;prt({k:'smoke',x,y,z:z+.5,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rnd(.8,2.4),life:rnd(.9,2.2),max:2.2,s:rnd(.4,.8)*rad*.6,drag:.96,grow:1.4});}
  for(let i=0;i<n*.8;i++){const a=Math.random()*TAU,v=rnd(4,12)*Math.sqrt(rad);prt({k:'spark',x,y,z:z+.4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rnd(2,9),life:rnd(.2,.55),max:.55,g:14});}
  RINGS.push({x,y,r0:.2,r1:rad*1.6,life:.32,max:.32,col:[255,200,120]});
  LIGHTS.push({x,y,z,rad:rad*3.4,col:[1.6,.9,.35],life:.4,max:.4});
}
function debris(x,y,z,n,col,sp){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(1,6)*(sp||1);prt({k:'deb',x,y,z:z+.3,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rnd(2,8),life:rnd(1,2.2),max:2.2,s:rnd(.06,.16),col:col||[90,88,84],g:18,bounce:.35});}}
function sparks(x,y,z,n,col){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(2,8);prt({k:'spark',x,y,z,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rnd(0,5),life:rnd(.1,.3),max:.3,g:10,col});}}
function dustAt(x,y,n,s){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(.5,2.4);prt({k:'dust',x,y,z:.1,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rnd(.1,.8),life:rnd(.5,1.1),max:1.1,s:(s||.25)*rnd(.7,1.3),drag:.92,grow:1.2});}}
function updPrt(dt){
  for(const p of PRT){
    p.life-=dt;const dr=p.drag?Math.pow(p.drag,dt*60):1;p.vx*=dr;p.vy*=dr;p.vz=p.vz*dr-(p.g||0)*dt;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.grow)p.s*=1+(p.grow-1)*dt;
    if(p.z<0){if(p.bounce){p.z=0;p.vz=-p.vz*p.bounce;p.vx*=.6;p.vy*=.6;if(Math.abs(p.vz)<.6)p.vz=0;}else if(p.k==='spark'){p.life=0;}else p.z=0;}
  }
  let j=0;for(let i=0;i<PRT.length;i++)if(PRT[i].life>0)PRT[j++]=PRT[i];PRT.length=j;
  for(const r of RINGS)r.life-=dt;for(let i=RINGS.length-1;i>=0;i--)if(RINGS[i].life<=0)RINGS.splice(i,1);
  for(const L of LIGHTS)L.life-=dt;for(let i=LIGHTS.length-1;i>=0;i--)if(LIGHTS[i].life<=0)LIGHTS.splice(i,1);
}

/* ---------- damage ---------- */
function explode(x,y,z,rad,dmg,team,o={}){
  if(dmg>0){
    if(team!=='e')for(const u of EN){if(u.dead)continue;const d=Math.hypot(u.x-x,u.y-y)-u.r;if(d<rad)hitUnit(u,dmg*(1-Math.max(0,d)/rad*.6),'x',x,y);}
    if(team!=='p'&&PLY&&!PLY.dead){const d=Math.hypot(PLY.x-x,PLY.y-y)-PLY.r*.6;if(d<rad)hurtPlayer(dmg*(1-Math.max(0,d)/rad*.5)*(team==='n'?.6:1),x,y);}
    const seen=new Set();for(let gx=-1;gx<=1;gx++)for(let gy=-1;gy<=1;gy++)for(const p of propsNear(x+gx*2,y+gy*2)){if(p.dead||seen.has(p))continue;seen.add(p);
      const cx=clamp(x,p.x0,p.x1),cy=clamp(y,p.y0,p.y1);if(Math.hypot(cx-x,cy-y)<rad*.9)damageProp(p,dmg*.8);}
  }
  fireball(x,y,z,rad*.6);if(z<1.5)scorch(x,y,rad*.85,.6);
  shakeIt(Math.min(.6,rad*.09));SFX.boom(rad/2.2);
  if(o.debris!==false)debris(x,y,z,Math.min(18,rad*4|0),[70,64,58]);
}
function damageProp(p,dmg){
  if(p.dead)return;p.hit=3;
  if(p.hp>=9999)return;
  p.hp-=dmg;if(p.hp<=0)destroyProp(p);
}
function destroyProp(p){
  p.dead=true;rubble(p);SFX.crunch();
  const cx=p.cx??(p.x0+p.x1)/2,cy=p.cy??(p.y0+p.y1)/2;
  const col=p.kind==='crate'?[140,100,60]:p.kind==='cont'?hexRGB(WORLD.th.cont[p.c]):p.kind==='barrel'?[200,50,30]:[130,128,122];
  debris(cx,cy,p.h*.5,p.kind==='cont'?26:14,col,p.kind==='cont'?1.6:1);dustAt(cx,cy,10,.5);
  if(p.kind==='barrel')setTimeout0(()=>explode(cx,cy,.6,3.4,48,'n'),.08);
  if(p.kind==='lamp'){bakeLamp(p,-1);sparks(cx,cy,4,20,[255,220,140]);}
  if(p.kind==='cont'){fireball(cx,cy,1.2,1.6);if(Math.random()<.5)dropPick(cx,cy,'scrap');}
  if(p.kind==='crate'&&Math.random()<.35)dropPick(cx,cy,Math.random()<.4?'repair':'scrap');
  G.score+=p.kind==='cont'?150:p.kind==='crate'?25:10;
}
const LATER=[];function setTimeout0(f,t){LATER.push({f,t});}
function hitUnit(u,dmg,src,fx,fy){
  if(u.dead||u.spawnT<.35)return false;
  if(src==='b'&&u.d.shield&&u.shp>0&&u.st!=='stagger'){const a=Math.atan2(fy-u.y,fx-u.x);if(Math.abs(angD(a,u.aim))<1.15){u.shieldHit=.08;u.shp-=dmg;if(u.shp<=0){u.shp=0;breakShield(u);return true;}sparks(u.x+Math.cos(u.aim)*.8,u.y+Math.sin(u.aim)*.8,1.1,3,[120,230,255]);if(Math.random()<.3)SFX.ping();return false;}}
  if(src==='b'&&u.d.armor){const a=Math.atan2(fy-u.y,fx-u.x);if(Math.abs(angD(a,u.body))<.9){dmg*=.35;if(Math.random()<.3)SFX.clank();}}
  u.hp-=dmg;u.flash=.05;
  if(u.d.boss)G.bossHit=.1;
  if(u.hp<=0)killUnit(u);
  return true;
}
function breakShield(u){const c=L2W(u,u.aim,.82,0);sparks(c[0],c[1],1.1,24,[140,240,255]);debris(c[0],c[1],1.1,10,[80,200,255],1.2);SFX.crunch();SFX.zap();POPS.push({x:u.x,y:u.y,z:2.4,t:0,s:'SHIELD BROKEN',c:'#8af8ff'});}
function killUnit(u){
  if(u.dead)return;u.dead=true;const d=u.d,P=PLY;
  G.kills++;P.kills++;P.mult=Math.min(8,P.mult+(d.boss?3:1));P.multT=2.4;
  const pts=d.score*P.mult;G.score+=pts;
  const boost=(P.up.howl?1.5:1);P.odM=Math.min(100,P.odM+(d.boss?100:d.score/50)*boost);
  POPS.push({x:u.x,y:u.y,z:(u.z||0)+2,t:0,s:'+'+fmt(pts)});
  if(d.boss){bossDeath(u);return;}
  explode(u.x,u.y,(u.z||0)+.5,d.boom,0,'p');
  if(d.fly){BOMBS.push({x:u.x,y:u.y,z:u.z,vz:-2,crash:1});}
  const r=Math.random();if(r<.07)dropPick(u.x,u.y,'repair');else if(r<.16)dropPick(u.x,u.y,'cell');else if(r<.36)dropPick(u.x,u.y,'scrap');
}
function bossDeath(u){
  G.boss=null;G.slow=.35;G.slowT=2.2;msg(u.d.name+' DESTROYED','',3,GR.volt);SFX.bigboom();
  for(let i=0;i<9;i++)setTimeout0(()=>explode(u.x+rnd(-2.5,2.5),u.y+rnd(-2,2),rnd(1,4),rnd(2,3.5),0,'p'),i*.18);
  setTimeout0(()=>{explode(u.x,u.y,2,6,0,'p');shakeIt(1.2);for(let i=0;i<6;i++)dropPick(u.x+rnd(-2,2),u.y+rnd(-2,2),pick(['repair','cell','scrap']));},1.7);
  for(const e of EN)if(!e.dead&&e!==u){e.hp=0;e.stun=3;setTimeout0(()=>killUnit(e),rnd(.2,1.4));}
}
function hurtPlayer(dmg,sx,sy){
  const P=PLY;if(!P||P.dead||P.inv>0||G.demoGod)return;
  P.hp-=dmg;P.flash=.07;P.inv=.18;G.hurtT=.35;shakeIt(Math.min(.5,dmg*.025));SFX.hurt();
  if(sx!=null){const dx=P.x-sx,dy=P.y-sy,d=Math.hypot(dx,dy)||1;P.vx+=dx/d*dmg*.25;P.vy+=dy/d*dmg*.25;}
  if(P.hp<=0){P.hp=0;P.dead=true;P.deadT=0;explode(P.x,P.y,1.5,4,0,'p');SFX.bigboom();G.slow=.3;G.slowT=1.6;setTimeout0(()=>explode(P.x+.5,P.y,2,3,0,'p'),.3);}
}
function dropPick(x,y,k){PICK.push({x,y,z:.5,vz:4,k,t:0});}

/* ---------- enemy brains ---------- */
function thinkScuttler(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx)+Math.sin(u.t*3+u.ph)*.55;
  steer(u,Math.cos(a)*u.d.spd,Math.sin(a)*u.d.spd,dt,7);u.body=turnTo(u.body,Math.atan2(u.vy,u.vx),dt*12);
  u.cool-=dt;if(d<u.r+P.r+.3&&u.cool<=0&&!P.dead){u.cool=.85;hurtPlayer(7,u.x,u.y);u.vx-=dx/d*5;u.vy-=dy/d*5;SFX.clank();}
}
function thinkGunner(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,sp=u.d.spd;let tx=0,ty=0;
  if(d>10){tx=dx/d*sp;ty=dy/d*sp;}else if(d<6){tx=-dx/d*sp;ty=-dy/d*sp;}else{tx=-dy/d*sp*u.dir*.8;ty=dx/d*sp*u.dir*.8;}
  if(u.bumped||Math.random()<dt*.25){u.dir*=-1;u.bumped=null;}
  steer(u,tx,ty,dt,4);if(Math.hypot(u.vx,u.vy)>.3)u.body=turnTo(u.body,Math.atan2(u.vy,u.vx),dt*7);u.aim=turnTo(u.aim,Math.atan2(dy,dx),dt*5);
  u.cool-=dt;
  if(u.st==='go'&&u.cool<=0&&d<15&&losClear(u.x,u.y,P.x,P.y)){u.st='aim';u.stT=0;}
  else if(u.st==='aim'){u.stT+=dt;if(u.stT>.45){u.st='fire';u.burst=3;u.stT=0;}}
  else if(u.st==='fire'){u.stT-=dt;if(u.stT<=0){if(u.burst-->0){u.stT=.13;const m=L2W(u,u.aim,1.05,.5);fireE(m[0],m[1],1.35,leadAng(u,P,12,m[0],m[1]),12,6,'eb');u.muz=.06;}else{u.st='go';u.cool=rnd(1.8,2.9);}}}
  updFeet(u,dt,.55,.2,.4,null);
}
function thinkTank(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,toP=Math.atan2(dy,dx);
  const want=d<7?toP+Math.PI/2*u.dir:toP;if(u.bumped){u.dir*=-1;u.bumped=null;}
  u.body=turnTo(u.body,want,dt*1.1);const sp=d>7?u.d.spd:u.d.spd*.6;steer(u,Math.cos(u.body)*sp,Math.sin(u.body)*sp,dt,2);u.tread=(u.tread||0)+Math.hypot(u.vx,u.vy)*dt;
  u.aim=turnTo(u.aim,toP,dt*(u.st==='aim'?.6:1.6));u.cool-=dt;
  if(u.st==='go'&&u.cool<=0&&d<17){u.st='aim';u.stT=0;SFX.charge();}
  else if(u.st==='aim'){u.stT+=dt;if(u.stT>.85){const m=L2W(u,u.aim,1.85,0);fireE(m[0],m[1],1.18,u.aim,16,16,'hs');u.muz=.12;u.st='go';u.cool=rnd(2.6,3.6);u.vx-=Math.cos(u.aim)*2;u.vy-=Math.sin(u.aim)*2;SFX.heavy();}}
}
function thinkMortar(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,sp=u.d.spd;let tx=0,ty=0;
  if(d>16){tx=dx/d*sp;ty=dy/d*sp;}else if(d<11){tx=-dx/d*sp;ty=-dy/d*sp;}else{tx=-dy/d*sp*u.dir*.5;ty=dx/d*sp*u.dir*.5;}
  if(u.bumped){u.dir*=-1;u.bumped=null;}
  steer(u,tx,ty,dt,3);if(Math.hypot(u.vx,u.vy)>.2)u.body=turnTo(u.body,Math.atan2(u.vy,u.vx),dt*4);u.aim=turnTo(u.aim,Math.atan2(dy,dx),dt*3);u.cool-=dt;
  if(u.st==='go'&&u.cool<=0&&d<22){u.st='load';u.stT=0;}
  else if(u.st==='load'){u.stT+=dt;if(u.stT>.6){const tb=L2W(u,u.aim,.32,0);const tx2=P.x+P.vx*1.2+rnd(-1,1),ty2=P.y+P.vy*1.2+rnd(-1,1);
    SHELLS.push({x0:tb[0],y0:tb[1],z0:2.2,x1:clamp(tx2,IN0+1,INX-1),y1:clamp(ty2,IN0+1,INY-1),t:0,T:1.7,h:10,dmg:20,rad:2.5});SFX.shell();u.st='go';u.cool=rnd(3.2,4.2);
    prt({k:'smoke',x:tb[0],y:tb[1],z:2.3,vx:0,vy:0,vz:2,life:1,max:1,s:.4,grow:1.5});}}
  updFeet(u,dt,.6,.2,.8,null);
}
function thinkShielder(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,toP=Math.atan2(dy,dx);
  if(u.shp==null)u.shp=200*HPK;u.aim=turnTo(u.aim,toP,dt*(u.st==='stagger'?.3:1.35));u.cool-=dt;if(u.shieldHit>0)u.shieldHit-=dt;
  if(u.st==='stagger'){u.stT+=dt;steer(u,0,0,dt,4);if(u.stT>1.1){u.st='go';}}
  else if(u.st==='slam'){u.stT+=dt;steer(u,0,0,dt,6);if(u.stT>.42){u.st='stagger';u.stT=0;u.cool=1.8;if(d<2.6){hurtPlayer(14,u.x,u.y);}shakeIt(.15);dustAt(u.x+Math.cos(u.aim),u.y+Math.sin(u.aim),8,.4);SFX.impact();}}
  else{steer(u,dx/d*u.d.spd,dy/d*u.d.spd,dt,3);if(d<2.1&&u.cool<=0){u.st='slam';u.stT=0;}}
  if(Math.hypot(u.vx,u.vy)>.2)u.body=turnTo(u.body,Math.atan2(u.vy,u.vx),dt*6);
  updFeet(u,dt,.5,.22,.48,null);
}
function thinkTurret(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,toP=Math.atan2(dy,dx);u.vx=u.vy=0;u.stT+=dt;
  if(u.st==='go'){u.aim=turnTo(u.aim,toP,dt*1.5);if(u.stT>2.2){u.st='charge';u.stT=0;SFX.charge();}}
  else if(u.st==='charge'){u.aim=turnTo(u.aim,toP,dt*.5);if(u.stT>1){u.st='fire';u.stT=0;SFX.laser();}}
  else if(u.st==='fire'){u.aim=turnTo(u.aim,toP,dt*.85);const o=L2W(u,u.aim,1.0,0);u.beams=[beam(o[0],o[1],1.24,u.aim,17,.55,dt*34)];if(u.stT>1.4){u.st='cool';u.stT=0;u.beams=null;}}
  else if(u.st==='cool'){if(u.stT>1.6){u.st='go';u.stT=0;}}
}
function thinkBomber(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1;
  if(u.st==='go'){u.body=turnTo(u.body,Math.atan2(dy,dx),dt*1.5);if(d<1.8){u.st='run';u.stT=0;u.burst=3;}}
  else if(u.st==='run'){u.stT+=dt;u.cool-=dt;if(u.burst>0&&u.cool<=0){u.burst--;u.cool=.32;BOMBS.push({x:u.x,y:u.y,z:u.z-.4,vz:0});SFX.whistle();}if(u.stT>2.2)u.st='go';}
  const sp=u.d.spd;u.vx=Math.cos(u.body)*sp;u.vy=Math.sin(u.body)*sp;
  u.x=clamp(u.x,IN0-3,INX+3);u.y=clamp(u.y,IN0-3,INY+3);if(u.x<=IN0-2.9||u.x>=INX+2.9||u.y<=IN0-2.9||u.y>=INY+2.9)u.body+=dt*3;
}
function thinkGoliath(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,toP=Math.atan2(dy,dx),ph=u.hp<u.max*.5?2:1;u.stT+=dt;
  u.body=turnTo(u.body,d>7?toP:toP+Math.PI/2,dt*.5);const sp=d>7?u.d.spd:u.d.spd*.5;steer(u,Math.cos(u.body)*sp,Math.sin(u.body)*sp,dt,1.5);
  updFeet(u,dt,1.6,.42,2.6,f=>{shakeIt(.12);SFX.step();dustAt(f.x,f.y,5,.4);});
  u.cool-=dt;u.mc=(u.mc??6)-dt;u.sc=(u.sc??4)-dt;u.spw=(u.spw??8)-dt;
  if(u.cool<=0){u.cool=ph===2?.85:1.3;u.muzS=-(u.muzS||1);const tp=L2W(u,u.body,.4,u.muzS*1.0),a=leadAng(u,P,15,tp[0],tp[1]);fireE(tp[0]+Math.cos(a)*1.85,tp[1]+Math.sin(a)*1.85,4.45,a,15,16,'hs');u.muz=.12;SFX.heavy();}
  if(u.st==='go'&&u.mc<=0){u.st='barrage';u.stT=0;SFX.alarm();}
  if(u.st==='barrage'&&u.stT>1.1){u.st='go';u.mc=ph===2?6:8;for(let i=0;i<(ph===2?10:7);i++){const p=L2W(u,u.body,-2.2,(i%6-2.5)*.22);MIS.push({x:p[0],y:p[1],z:4.3,vx:rnd(-2,2),vy:rnd(-2,2),vz:7,tgt:P,life:6,team:'e',dmg:12,t:0,delay:i*.12,spd:9,turn:1.9});}SFX.missile();}
  if(u.st==='go'&&d<5.8&&u.sc<=0){u.st='stomp';u.stT=0;RINGS.push({x:u.x,y:u.y,r0:5.8,r1:5.8,life:1,max:1,col:[255,60,40],warn:1});}
  if(u.st==='stomp'&&u.stT>1){u.st='go';u.sc=5;shakeIt(.8);SFX.impact();RINGS.push({x:u.x,y:u.y,r0:.5,r1:6.5,life:.45,max:.45,col:[255,220,160]});dustAt(u.x,u.y,24,.8);if(d<6)hurtPlayer(26,u.x,u.y);}
  if(ph===2&&u.spw<=0){u.spw=9;for(let i=0;i<3;i++){const e=mkEnemy('scuttler',u.x+rnd(-2,2),u.y+rnd(-2,2));EN.push(e);}}
}
function thinkMaw(u,dt){
  const P=PLY,dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,toP=Math.atan2(dy,dx),ph=u.hp<u.max*.5?2:1;u.stT+=dt;u.lc=(u.lc??5)-dt;u.jc=(u.jc??8)-dt;u.spw=(u.spw??6)-dt;
  if(u.st==='go'){u.body=turnTo(u.body,toP,dt*1.2);steer(u,Math.cos(u.body)*u.d.spd*(d>5?1:-.4),Math.sin(u.body)*u.d.spd*(d>5?1:-.4),dt,2);
    if(u.lc<=0){u.st='charge';u.stT=0;SFX.charge();u.vx=u.vy=0;}else if(u.jc<=0){u.st='crouch';u.stT=0;u.jx=P.x;u.jy=P.y;RINGS.push({x:P.x,y:P.y,r0:3.6,r1:3.6,life:1.3,max:1.3,col:[255,60,40],warn:1});}}
  else if(u.st==='charge'){steer(u,0,0,dt,5);u.body=turnTo(u.body,toP,dt*.8);if(u.stT>1){u.st='beam';u.stT=0;u.bdir=angD(toP,u.body)>0?1:-1;u.body-=u.bdir*.9;SFX.laser();}}
  else if(u.st==='beam'){u.body+=u.bdir*dt*(ph===2?1.1:.85);const e=L2W(u,u.body,.85,0);u.beams=[beam(e[0],e[1],2.65,u.body,20,.7,dt*40)];if(ph===2)u.beams.push(beam(e[0],e[1],2.65,u.body+Math.PI*.5*u.bdir,20,.7,dt*40));if(u.stT>2.1){u.st='go';u.lc=ph===2?4:5.5;u.beams=null;}}
  else if(u.st==='crouch'){steer(u,0,0,dt,6);if(u.stT>.5){u.st='leap';u.stT=0;u.sx=u.x;u.sy=u.y;SFX.dash();}}
  else if(u.st==='leap'){const t=Math.min(1,u.stT/.8);u.x=lerp(u.sx,u.jx,t);u.y=lerp(u.sy,u.jy,t);u.z=Math.sin(t*Math.PI)*6;for(const f of u.feet){f.x+=(u.x+Math.cos(u.body+f.a)*3-f.x)*.2;f.y+=(u.y+Math.sin(u.body+f.a)*3-f.y)*.2;f.z=u.z*.6;}
    if(t>=1){u.z=0;u.st='go';u.jc=ph===2?6:8;shakeIt(1);SFX.impact();explode(u.x,u.y,.2,3.6,30,'e',{debris:true});RINGS.push({x:u.x,y:u.y,r0:.5,r1:7,life:.5,max:.5,col:[255,200,140]});for(const f of u.feet)f.z=0;}}
  if(u.st!=='leap')updFeet(u,dt,1.3,.22,3.0,f=>{if(Math.random()<.3)SFX.step();});
  if(u.spw<=0){u.spw=ph===2?5:7;for(let i=0;i<(ph===2?5:3);i++){const p=L2W(u,u.body,-2,rnd(-1,1));const e=mkEnemy('scuttler',p[0],p[1]);EN.push(e);}}
}
/* a beam stops at the first solid thing in its path; cover works */
function beam(ox,oy,oz,ang,len,w,dmg){
  const c=Math.cos(ang),s=Math.sin(ang);let L=len;
  for(let d=.6;d<len;d+=.3){if(propAt(ox+c*d,oy+s*d,1.0,0)){L=d;break;}}
  const ex=ox+c*L,ey=oy+s*L,P=PLY;
  if(!P.dead){const dx=P.x-ox,dy=P.y-oy,al=dx*c+dy*s,pp=Math.abs(-dx*s+dy*c);
    if(al>0&&al<L+P.r*.4&&pp<w+P.r*.6){P.beamAcc=(P.beamAcc||0)+dmg;if(P.beamAcc>=6&&P.inv<=0){P.beamAcc=0;hurtPlayer(6,null,null);sparks(P.x,P.y,1.6,4,[255,140,90]);}}}
  if(L<len&&Math.random()<.35){const pr=propAt(ex+c*.25,ey+s*.25,1.0,0);if(pr)damageProp(pr,dmg*3);}
  if(Math.random()<.6)sparks(ex,ey,.6,2,[255,150,90]);
  if(Math.random()<.12)scorch(ex,ey,.45,.25);
  return {ox,oy,oz,ex,ey,L};
}
function fireE(x,y,z,a,spd,dmg,kind){BUL.push({x,y,z,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg,team:'e',kind,life:3.2,r:kind==='hs'?.3:.2});if(kind==='eb')SFX.zap();}

/* ---------- player ---------- */
const UPG=[
  {id:'spread',name:'TWIN FEED',d:['ADDS A SIDE STREAM','TO EACH CANNON'],max:2},
  {id:'rate',name:'HAIR TRIGGER',d:['CANNONS FIRE','25% FASTER'],max:3},
  {id:'dmg',name:'DEPLETED CORE',d:['ROUNDS HIT','35% HARDER'],max:3},
  {id:'pods',name:'EXTRA PODS',d:['+2 MISSILES','PER SALVO'],max:3},
  {id:'reload',name:'AUTOLOADER',d:['MISSILES RELOAD','35% FASTER'],max:2},
  {id:'armor',name:'HEAVY PLATE',d:['+30 MAX HULL','AND A FULL REPAIR'],max:4},
  {id:'cool',name:'CRYO LOOP',d:['HEAT VENTS','60% FASTER'],max:2},
  {id:'drone',name:'WINGMAN',d:['AN ESCORT DRONE','FIGHTS BESIDE YOU'],max:2},
  {id:'ram',name:'RAM PLATE',d:['DASHING SMASHES','WHATEVER YOU HIT'],max:1},
  {id:'magnet',name:'SCRAP MAGNET',d:['PICKUPS FLY','STRAIGHT TO YOU'],max:1},
  {id:'howl',name:'WAR CRY',d:['HOWL CHARGES','50% FASTER'],max:2},
  {id:'pierce',name:'RAILSHOT',d:['ROUNDS PUNCH','THROUGH ONE TARGET'],max:1}
];
const FIX={id:'fix',name:'FIELD REPAIR',d:['FULL HULL AND','+5,000 SCORE'],max:99};
function applyUpg(id){const P=PLY;if(id==='fix'){P.hp=P.maxHp;G.score+=5000;return;}P.up[id]=(P.up[id]||0)+1;if(id==='armor'){P.maxHp+=30;P.hp=P.maxHp;}if(id==='drone')P.drones.push({x:P.x,y:P.y,z:2.6,a:0,spin:0,cool:0,ph:P.drones.length*Math.PI});}
const CTL={prev:{missile:false,dash:false,howl:false}};
function updPlayer(dt,c){
  const P=PLY;if(P.dead){P.deadT+=dt;return;}
  if(P.inv>0)P.inv-=dt;if(P.flash>0)P.flash-=dt;if(P.muz>0)P.muz-=dt;if(P.missT>0)P.missT-=dt;if(P.dashCD>0)P.dashCD-=dt;if(P.multT>0){P.multT-=dt;if(P.multT<=0)P.mult=1;}
  if(P.od>0){P.od-=dt;if(P.od<=0)msg('OVERDRIVE OFF','',1);}
  const mP=c.missile&&!CTL.prev.missile,dP=c.dash&&!CTL.prev.dash,hP=c.howl&&!CTL.prev.howl;CTL.prev={missile:c.missile,dash:c.dash,howl:c.howl};
  const spd=6.4*(P.od>0?1.2:1);
  if(P.dashT>0){P.dashT-=dt;P.inv=Math.max(P.inv,.05);if(FRAME%2===0)P.trail.push({x:P.x,y:P.y,body:P.body,turret:P.turret,life:.25});
    if(P.up.ram)for(const u of EN)if(!u.dead&&Math.hypot(u.x-P.x,u.y-P.y)<u.r+P.r+.2&&!u.ramT){u.ramT=.5;hitUnit(u,40,'x',P.x,P.y);sparks(u.x,u.y,1,8);SFX.impact();shakeIt(.2);}
  }else steer(P,c.mx*spd,c.my*spd,dt,9);
  if(dP&&P.dashCD<=0){const l=Math.hypot(c.mx,c.my);let dx=c.mx,dy=c.my;if(l<.2){dx=Math.cos(P.turret);dy=Math.sin(P.turret);}else{dx/=l;dy/=l;}P.vx=dx*24;P.vy=dy*24;P.dashT=.2;P.dashCD=1.1;SFX.dash();dustAt(P.x,P.y,6,.4);}
  P.x+=P.vx*dt;P.y+=P.vy*dt;pushOut(P);
  if(P.bumped&&P.dashT>0&&P.up.ram&&P.bumped.hp<9999){damageProp(P.bumped,120);}P.bumped=null;
  for(const t of P.trail)t.life-=dt;P.trail=P.trail.filter(t=>t.life>0);
  if(Math.hypot(P.vx,P.vy)>.6)P.body=turnTo(P.body,Math.atan2(P.vy,P.vx),dt*6);
  let aim=P.aim;
  if(c.aim==='point'){const wx=(c.px+OFFX)/S,wy=(c.py+OFFY+1.8*S*KZ)/(S*KY);P.aimPt=[wx,wy];aim=Math.atan2(wy-P.y,wx-P.x);}
  else if(c.aim==='dir'){aim=Math.atan2(c.ay,c.ax);P.aimPt=null;}
  P.aim=aim;P.turret=turnTo(P.turret,aim,dt*10);
  const cool=(P.up.cool?1+.6*P.up.cool:1);
  if(P.over>0){P.over-=dt;P.heat=Math.max(0,P.heat-60*dt);if(FRAME%3===0)prt({k:'smoke',x:P.x,y:P.y,z:2.4,vx:rnd(-1,1),vy:rnd(-1,1),vz:2,life:.8,max:.8,s:.3,grow:1.5,col:[200,200,200]});}
  P.fireT-=dt;
  if(c.fire&&P.over<=0){
    if(P.fireT<=0){P.fireT=(P.od>0?1/19:1/11)/(1+.25*(P.up.rate||0));playerFire();if(P.od<=0){P.heat+=4.3;if(P.heat>=100){P.heat=100;P.over=1.5;SFX.heat();msg('OVERHEAT','VENTING',1.2,GR.red);}}}
  }else P.heat=Math.max(0,P.heat-46*cool*dt);
  if(mP&&P.missT<=0)fireMissiles();
  if(hP&&P.odM>=100)howl();
  P.bob=-.05*Math.max(...P.feet.map(f=>f.z))*.5;
  updFeet(P,dt,.85,.2,.55,f=>{SFX.step();shakeIt(.02);dustAt(f.x,f.y,2,.2);});
  for(const d of P.drones){d.ph+=dt*1.6;d.spin+=dt*30;const tx=P.x+Math.cos(d.ph)*2.4,ty=P.y+Math.sin(d.ph)*2.4;d.x+=(tx-d.x)*Math.min(1,dt*6);d.y+=(ty-d.y)*Math.min(1,dt*6);d.z=2.6+Math.sin(G.t*3+d.ph)*.2;
    d.cool-=dt;const e=nearestEnemy(d.x,d.y,12);if(e){d.a=Math.atan2(e.y-d.y,e.x-d.x);if(d.cool<=0){d.cool=.32;BUL.push({x:d.x,y:d.y,z:d.z,vx:Math.cos(d.a)*30,vy:Math.sin(d.a)*30,dmg:5,team:'p',kind:'db',life:.6,r:.12});}}}
}
function nearestEnemy(x,y,max,cone,ca){let best=null,bd=max||1e9;for(const u of EN){if(u.dead||u.spawnT<.35)continue;const d=Math.hypot(u.x-x,u.y-y);if(cone){const a=Math.atan2(u.y-y,u.x-x);if(Math.abs(angD(a,ca))>cone)continue;}if(d<bd){bd=d;best=u;}}return best;}
function playerFire(){
  const P=PLY;P.gun=-P.gun;const s=P.gun,m=L2W(P,P.turret,1.4,s*.9),sp=P.up.spread||0,dmg=7*(1+.35*(P.up.dmg||0))*(P.od>0?1.3:1);
  const tp=P.aimPt&&Math.hypot(P.aimPt[0]-P.x,P.aimPt[1]-P.y)>2.5?P.aimPt:[P.x+Math.cos(P.turret)*14,P.y+Math.sin(P.turret)*14];
  const base=Math.atan2(tp[1]-m[1],tp[0]-m[0]);
  for(let k=-sp;k<=sp;k++){const a=base+k*.09+rnd(-.02,.02);BUL.push({x:m[0],y:m[1],z:1.85,vx:Math.cos(a)*38,vy:Math.sin(a)*38,dmg:k?dmg*.6:dmg,team:'p',kind:'pb',life:.7,r:.16,pierce:P.up.pierce?1:0});}
  P.muz=.05;(P.od>0?SFX.cannonOD:SFX.cannon)();
  const ej=L2W(P,P.turret,.1,s*1.1);prt({k:'case',x:ej[0],y:ej[1],z:1.9,vx:-Math.sin(P.turret)*s*3+rnd(-.5,.5),vy:Math.cos(P.turret)*s*3+rnd(-.5,.5),vz:rnd(2,4),life:1.2,max:1.2,g:16,bounce:.4,s:.05,col:[230,180,60]});
}
function fireMissiles(){
  const P=PLY,n=4+2*(P.up.pods||0);
  const tg=EN.filter(u=>!u.dead&&u.spawnT>=.35).map(u=>({u,s:Math.hypot(u.x-P.x,u.y-P.y)+Math.abs(angD(Math.atan2(u.y-P.y,u.x-P.x),P.turret))*6})).sort((a,b)=>a.s-b.s).slice(0,n);
  for(let i=0;i<n;i++){const s=i%2?1:-1,p=L2W(P,P.turret,.3,s*.74),a=P.turret+s*rnd(.6,1.4);
    MIS.push({x:p[0],y:p[1],z:2.5,vx:Math.cos(a)*5,vy:Math.sin(a)*5,vz:4,tgt:tg.length?tg[i%tg.length].u:null,life:3.4,team:'p',dmg:26,t:0,delay:i*.06,spd:21,turn:6,ang:a});}
  P.missT=4.2/(1+.35*(P.up.reload||0));SFX.missile();
}
function howl(){
  const P=PLY;P.odM=0;P.od=7;SFX.howl();shakeIt(1);if(!G.demo){msg('HOWL','OVERDRIVE ENGAGED',1.6,GR.volt);say('Overdrive');}
  RINGS.push({x:P.x,y:P.y,r0:.5,r1:10,life:.6,max:.6,col:[255,200,90]},{x:P.x,y:P.y,r0:.3,r1:7,life:.45,max:.45,col:[255,255,255]});
  LIGHTS.push({x:P.x,y:P.y,z:1,rad:14,col:[1.8,1.2,.5],life:.8,max:.8});
  for(const u of EN){if(u.dead)continue;const d=Math.hypot(u.x-P.x,u.y-P.y);if(d<10){hitUnit(u,70*(1-d/14),'x',P.x,P.y);const k=(10-d)*1.2/(u.d.mass||1);u.vx+=(u.x-P.x)/(d||1)*k;u.vy+=(u.y-P.y)/(d||1)*k;}}
  for(const b of BUL)if(b.team==='e'&&Math.hypot(b.x-P.x,b.y-P.y)<10)b.life=0;
  for(const p of WORLD.props)if(!p.dead&&p.hp<9999){const cx=(p.x0+p.x1)/2,cy=(p.y0+p.y1)/2;if(Math.hypot(cx-P.x,cy-P.y)<6)damageProp(p,90);}
}

/* ---------- projectiles ---------- */
function updBul(dt){
  const P=PLY;
  for(const b of BUL){
    if(b.life<=0)continue;b.life-=dt;const n=2;
    for(let s=0;s<n&&b.life>0;s++){
      b.x+=b.vx*dt/n;b.y+=b.vy*dt/n;
      const pr=propAt(b.x,b.y,b.team==='p'?1.0:.9,0);
      if(pr){if(b.team==='p'||b.kind==='hs')damageProp(pr,b.kind==='hs'?30:b.dmg);sparks(b.x,b.y,b.z,3,b.team==='p'?[255,220,120]:[255,120,80]);if(b.kind==='hs')explode(b.x,b.y,b.z,1.7,b.dmg*.5,'e');b.life=0;break;}
      if(b.team==='p'){for(const u of EN){if(u.dead||u===b.last)continue;const rr=u.r+b.r;if((u.x-b.x)**2+(u.y-b.y)**2<rr*rr){const ok=hitUnit(u,b.dmg,'b',b.x-b.vx*.05,b.y-b.vy*.05);sparks(b.x,b.y,b.z,ok?4:2,ok?[255,230,150]:[140,230,255]);
        if(ok&&b.pierce>0){b.pierce--;b.last=u;}else{b.life=0;}break;}}}
      else if(!P.dead){const rr=P.r*.85+b.r;if((P.x-b.x)**2+(P.y-b.y)**2<rr*rr){hurtPlayer(b.dmg,b.x-b.vx*.1,b.y-b.vy*.1);if(b.kind==='hs')explode(b.x,b.y,b.z,1.6,0,'e');sparks(b.x,b.y,b.z,5,[255,140,80]);b.life=0;}}
      if(b.x<0||b.y<0||b.x>WW||b.y>WH)b.life=0;
    }
  }
  for(let i=BUL.length-1;i>=0;i--)if(BUL[i].life<=0)BUL.splice(i,1);
  for(const m of MIS){
    if(m.life<=0)continue;m.t+=dt;if(m.delay>0){m.delay-=dt;continue;}m.life-=dt;
    const t=m.tgt&&!m.tgt.dead?m.tgt:null;let ang=m.ang??Math.atan2(m.vy,m.vx);
    if(t){const ta=Math.atan2(t.y-m.y,t.x-m.x);ang=turnTo(ang,ta,m.turn*dt*(m.t<.25?.4:1));}
    m.ang=ang;const sp=Math.min(m.spd,Math.hypot(m.vx,m.vy)+m.spd*2.5*dt);m.vx=Math.cos(ang)*sp;m.vy=Math.sin(ang)*sp;
    const tz=t?Math.min(3,(t.z||0)+1.2+Math.hypot(t.x-m.x,t.y-m.y)*.25):3;m.vz+=((tz-m.z)*3-m.vz)*Math.min(1,dt*4);
    m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;
    if(FRAME%1===0)prt({k:'trail',x:m.x,y:m.y,z:m.z,vx:rnd(-.3,.3),vy:rnd(-.3,.3),vz:rnd(0,.4),life:rnd(.5,.9),max:.9,s:.16,grow:1.6,drag:.95});
    let hit=m.z<=.15||m.life<=0||!!propAt(m.x,m.y,m.z,0);
    if(m.team==='p'){for(const u of EN)if(!u.dead&&Math.hypot(u.x-m.x,u.y-m.y)<u.r+.35&&Math.abs((u.z||0)+1-m.z)<2.5){hit=true;break;}}
    else if(!PLY.dead&&Math.hypot(PLY.x-m.x,PLY.y-m.y)<PLY.r+.3&&m.z<3.5)hit=true;
    if(hit){m.life=0;explode(m.x,m.y,Math.max(0,m.z),m.team==='p'?2.4:2,m.dmg,m.team);}
  }
  for(let i=MIS.length-1;i>=0;i--)if(MIS[i].life<=0)MIS.splice(i,1);
  for(const s of SHELLS){s.t+=dt;if(s.t>=s.T){s.done=1;explode(s.x1,s.y1,0,s.rad,s.dmg,'e');}}
  for(let i=SHELLS.length-1;i>=0;i--)if(SHELLS[i].done)SHELLS.splice(i,1);
  for(const b of BOMBS){b.vz-=14*dt;b.z+=b.vz*dt;if(b.z<=0){b.done=1;explode(b.x,b.y,0,b.crash?2.6:2.2,b.crash?10:15,'e');}}
  for(let i=BOMBS.length-1;i>=0;i--)if(BOMBS[i].done)BOMBS.splice(i,1);
}
const shellPos=s=>{const t=s.t/s.T;return [lerp(s.x0,s.x1,t),lerp(s.y0,s.y1,t),lerp(s.z0,0,t)+Math.sin(t*Math.PI)*s.h];};

/* ---------- pickups, pods, waves ---------- */
const POPS=[];
function updPick(dt){
  const P=PLY;
  for(const p of PICK){p.t+=dt;p.vz-=12*dt;p.z+=p.vz*dt;if(p.z<.5){p.z=.5;p.vz=Math.abs(p.vz)>1?-p.vz*.4:0;}
    const d=Math.hypot(P.x-p.x,P.y-p.y),mag=P.up.magnet?7:2.4;if(d<mag&&!P.dead){p.x+=(P.x-p.x)*Math.min(1,dt*(P.up.magnet?6:4));p.y+=(P.y-p.y)*Math.min(1,dt*(P.up.magnet?6:4));}
    if(d<P.r+.4&&!P.dead){p.got=1;SFX.pickup();if(p.k==='repair'){P.hp=Math.min(P.maxHp,P.hp+25);POPS.push({x:P.x,y:P.y,z:3,t:0,s:'+25 HULL',c:'#7dff6a'});}
      else if(p.k==='cell'){P.odM=Math.min(100,P.odM+25);POPS.push({x:P.x,y:P.y,z:3,t:0,s:'+HOWL',c:'#ffae2a'});}else{G.score+=250*P.mult;POPS.push({x:P.x,y:P.y,z:3,t:0,s:'+'+fmt(250*P.mult),c:'#ffffff'});}}
    if(p.t>16)p.got=1;}
  for(let i=PICK.length-1;i>=0;i--)if(PICK[i].got)PICK.splice(i,1);
  for(const p of POPS)p.t+=dt;for(let i=POPS.length-1;i>=0;i--)if(POPS[i].t>1)POPS.splice(i,1);
}
function openSpot(minD){
  for(let k=0;k<80;k++){const x=rnd(IN0+2,INX-2),y=rnd(IN0+2,INY-2);if(Math.hypot(x-PLY.x,y-PLY.y)<(minD||7))continue;if(propAt(x,y,0,1.4))continue;let ok=true;for(const p of PODS)if(Math.hypot(p.x-x,p.y-y)<2.5)ok=false;if(ok)return [x,y];}
  return [rnd(IN0+3,INX-3),rnd(IN0+3,INY-3)];
}
function spawnPod(type,x,y){if(x==null)[x,y]=openSpot(type==='goliath'||type==='maw'?10:6);PODS.push({x,y,type,t:0,T:type==='goliath'||type==='maw'?2.4:1.4,big:EDEF[type].boss});SFX.pod();}
function spawnGate(type){const gt=pick(WORLD.gates),e=mkEnemy(type,gt.x+rnd(-1.5,1.5)*(gt.dy?1:0)-gt.dx*1.5,gt.y+rnd(-1.5,1.5)*(gt.dx?1:0)-gt.dy*1.5);e.body=Math.atan2(gt.dy,gt.dx);e.vx=gt.dx*6;e.vy=gt.dy*6;e.spawnT=1;e.gate=1;EN.push(e);}
function spawnAir(type){const side=(Math.random()*4)|0,x=side===0?IN0-2:side===1?INX+2:rnd(IN0,INX),y=side===2?IN0-2:side===3?INY+2:rnd(IN0,INY);const e=mkEnemy(type,x,y);e.spawnT=1;e.body=Math.atan2(PLY.y-y,PLY.x-x);EN.push(e);}
function updPods(dt){
  for(const p of PODS){p.t+=dt;if(p.t>=p.T&&!p.done){p.done=1;const e=mkEnemy(p.type,p.x,p.y);e.spawnT=0;EN.push(e);if(e.d.boss){G.boss=e;}
    shakeIt(p.big?1:.25);SFX.impact();dustAt(p.x,p.y,p.big?30:12,p.big?.8:.4);RINGS.push({x:p.x,y:p.y,r0:.3,r1:p.big?7:2.6,life:.4,max:.4,col:[255,210,150]});scorch(p.x,p.y,p.big?4:1.6,.5);
    LIGHTS.push({x:p.x,y:p.y,z:0,rad:p.big?10:4,col:[1.4,.8,.4],life:.35,max:.35});
    if(!PLY.dead&&Math.hypot(PLY.x-p.x,PLY.y-p.y)<(p.big?4:1.8))hurtPlayer(p.big?20:10,p.x,p.y);
    for(const pr of propsNear(p.x,p.y))if(Math.hypot(clamp(p.x,pr.x0,pr.x1)-p.x,clamp(p.y,pr.y0,pr.y1)-p.y)<(p.big?3:1.2))damageProp(pr,200);}}
  for(let i=PODS.length-1;i>=0;i--)if(PODS[i].done)PODS.splice(i,1);
}
const WAVES=[
  {arena:'yard',g:[['scuttler',10,'gate'],['gunner',3,'pod']]},
  {g:[['scuttler',14,'gate'],['gunner',5,'pod'],['bomber',2,'air']]},
  {g:[['scuttler',12,'gate'],['gunner',6,'pod'],['tank',2,'pod']]},
  {g:[['scuttler',14,'gate'],['mortar',4,'pod'],['gunner',5,'pod'],['bomber',3,'air']]},
  {g:[['scuttler',16,'gate'],['shield',3,'pod'],['tank',2,'pod'],['turret',2,'pod'],['gunner',4,'pod']]},
  {boss:'goliath',g:[['scuttler',8,'gate']]},
  {arena:'docks',g:[['scuttler',18,'gate'],['gunner',6,'pod'],['bomber',4,'air']]},
  {g:[['scuttler',16,'gate'],['tank',3,'pod'],['mortar',4,'pod'],['shield',2,'pod']]},
  {g:[['scuttler',20,'gate'],['turret',3,'pod'],['gunner',8,'pod'],['bomber',4,'air']]},
  {g:[['scuttler',22,'gate'],['shield',4,'pod'],['tank',3,'pod'],['mortar',4,'pod']]},
  {g:[['scuttler',24,'gate'],['gunner',8,'pod'],['tank',4,'pod'],['turret',3,'pod'],['bomber',6,'air']]},
  {boss:'maw',g:[['scuttler',10,'gate']]}
];
function waveDef(n){if(n<=12)return WAVES[n-1];const k=WAVES[6+((n-13)%6)];return k;}
function startWave(n){
  G.wave=n;const w=waveDef(n);HPK=1+Math.max(0,n-12)*.12;
  const want=n<=6?'yard':n<=12?'docks':(Math.floor((n-13)/6)%2?'yard':'docks');
  if(want!==G.arena||!WORLD){G.arena=want;newWorld(want,n*13+7);setRim(THEMES[want].rim,1);AMB=THEMES[want].amb.slice();PLY.x=WW/2;PLY.y=WH/2+5;mkFeet(PLY,2,.55);PICK.length=0;}
  const q=[];let t=1.5;
  for(const [type,cnt,via] of w.g){const c=n>12?Math.round(cnt*(1+(n-12)*.1)):cnt;
    if(via==='gate'){for(let i=0;i<c;i+=4){q.push({t,type,via,n:Math.min(4,c-i)});t+=rnd(1.6,2.6);}}
    else for(let i=0;i<c;i++){q.push({t:t+i*rnd(1.1,1.8)+(via==='air'?4:0),type,via,n:1});}}
  q.sort((a,b)=>a.t-b.t);
  if(w.boss){q.length=0;q.push({t:3.2,type:w.boss,via:'pod',n:1});let tt=6;for(const [type,cnt,via] of w.g)for(let i=0;i<cnt;i+=4){q.push({t:tt,type,via,n:4});tt+=8;}}
  G.queue=q;G.phase='incoming';G.pt=0;G.wt=0;
  const th=THEMES[G.arena];
  if(G.demo)return;
  if(w.boss){msg('WARNING','BOSS APPROACHING',3,GR.red);SFX.alarm();setTrack('boss');say('Warning. '+EDEF[w.boss].name.toLowerCase()+' approaching');}
  else{msg('WAVE '+n,n===1||n===7?th.name:(n>12?'ENDLESS':th.where),2.4,GR.volt);setTrack(th.music);say('Wave '+n);}
}
function updWave(dt){
  G.pt+=dt;
  if(G.phase==='incoming'||G.phase==='fight'){
    G.wt+=dt;const alive=EN.filter(u=>!u.dead).length;
    while(G.queue.length&&G.queue[0].t<=G.wt&&alive+PODS.length<28){const s=G.queue.shift();for(let i=0;i<s.n;i++){if(s.via==='gate')spawnGate(s.type);else if(s.via==='air')spawnAir(s.type);else spawnPod(s.type);}}
    if(G.queue.length&&G.queue[0].t<=G.wt)G.wt-=dt*.5;
    if(G.pt>1)G.phase='fight';
    if(G.phase==='fight'&&!G.queue.length&&!PODS.length&&!EN.some(u=>!u.dead)&&!PLY.dead){
      G.phase='clear';G.pt=0;const bonus=1000*G.wave;G.score+=bonus;msg('WAVE CLEAR','+'+fmt(bonus),2.4,GR.green);SFX.clear();if(!G.demo)say('Wave clear');if(!G.demo&&G.wave>G.best){G.best=G.wave;store.set('ih-bw',G.best);}
      PLY.hp=Math.min(PLY.maxHp,PLY.hp+15);
    }
  }else if(G.phase==='clear'){if(G.pt>2.6){if(G.demo){startWave(pick([2,3,4,5,8,9,10,11].filter(k=>k!==G.wave)));return;}if(G.wave===12&&!G.endless){G.mode='win';G.t=0;setTrack('shop');SFX.clear();return;}openUpgrade();}}
}
function openUpgrade(){
  const P=PLY,pool=UPG.filter(u=>(P.up[u.id]||0)<u.max);const ch=[];while(ch.length<3&&pool.length){ch.push(pool.splice((Math.random()*pool.length)|0,1)[0]);}if(ch.length<3)ch.push(FIX);
  G.upg=ch;G.upgI=1;G.mode='upgrade';G.t=0;setTrack('shop');
}
