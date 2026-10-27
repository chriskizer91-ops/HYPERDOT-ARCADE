/* ===================== world ===================== */
const ENT=[],BOLTS=[],MISS=[],FX=[],CHUNKS=[],FLAK=[];
let PL=null,EID=0;
const G={mode:'title',demo:true,t:0,score:0,hi:parseInt(store.get('vl-hi','0'),10)||0,mult:1,multT:0,shake:0,msg:null,msgT:0,M:null,mi:0,
  radio:[],rad:null,hurt:0,hurtDir:0,warnT:0,camMode:parseInt(store.get('vl-cam','0'),10)||0,stats:{shots:0,hits:0,kills:0},up:{},paused:false,menuI:0,slow:1,slowT:0,god:false};
const TEAMC={a:[90,200,255],e:[140,255,80],p:[255,96,60]};
const hostile=(a,b)=>a!==b&&a!=='n'&&b!=='n';
function ent(o){o.id=++EID;o.dead=false;o.flash=0;o.hitT=0;ENT.push(o);return o;}
function mkShip(type,team,pos,q,o={}){
  const d=SHIPS[type],v0=d.vmax*.6;
  return ent(Object.assign({kind:'ship',type,d,team,pos:pos.slice(),q:qnorm(q.slice()),vel:vmul(qF(q),v0),spd:v0,hp:d.hp,max:d.hp,sh:d.sh,shMax:d.sh,shT:0,r:d.r,mesh:MESH[d.mesh],
    thr:.7,boost:false,fireT:rnd(0,.6),gun:0,trail:[],ai:{st:'engage',t:0,reT:0,tgt:null,jt:0,ev:[0,0,1],ext:[0,0,1]},rates:[0,0,0],name:d.name,missT:rnd(5,9),torpT:rnd(3,6),spin:0},o));
}
function mkCap(mk,team,pos,q,o={}){return ent(Object.assign({kind:'cap',mk,mesh:MESH[mk],team,pos:pos.slice(),q:qnorm(q.slice()),vel:[0,0,0],r:MESH[mk].R,hp:1,max:1,inv:true,subs:[],s:1},o));}
const SUBM={turret:'turretBase',gen:'gen',bridge:'bridge',engine:'engineSys',vent:'vent',core:'core',beam:'beamEm'};
function mkSub(c,sub,lp,o={}){const s=ent(Object.assign({kind:'sub',sub,parent:c,lp,team:c.team,pos:[0,0,0],q:c.q,vel:[0,0,0],r:10,hp:100,max:100,mesh:MESH[SUBM[sub]],aim:qF(c.q),gq:c.q,fireT:rnd(0,2),s:1,tgt:null,reT:0,burst:0},o));s.max=s.hp;c.subs.push(s);subPos(s);return s;}
const SUBHC={turret:[0,2.4,0],gen:[0,4.5,0],bridge:[0,7,0],engine:[0,0,-21],vent:[0,1.5,0],core:[0,0,0],beam:[0,0,8]};
function subPos(s){const c=s.parent;s.mpos=vadd(c.pos,qrot(c.q,s.lp));const h=SUBHC[s.sub];s.pos=vadd(s.mpos,qrot(c.q,vmul(h,s.s)));s.q=c.q;s.vel=c.vel;}
function mkRock(pos,rad,v){return ent({kind:'rock',team:'n',pos:pos.slice(),q:qnorm([Math.random(),Math.random()-.5,Math.random()-.5,Math.random()-.5]),vel:vrand(rnd(0,4)),mesh:MESH.rocks[v??(Math.random()*6|0)],s:rad,r:rad*.9,hp:rad*rad*.25+30,max:rad*rad*.25+30,spin:[vnorm(vrand(1)),rnd(.02,.2)/Math.sqrt(rad/20)]});}
function clearWorld(){for(const a of [ENT,BOLTS,MISS,FX,CHUNKS,FLAK])a.length=0;PL=null;G.radio.length=0;G.rad=null;}

/* ===================== flight ===================== */
function fly(e,dt,c){
  const d=e.d,tk=e.turnK||1,R=e.rates,sm=Math.min(1,dt*(e===PL?7:5));
  R[0]+=(c.pitch-R[0])*sm;R[1]+=(c.yaw-R[1])*sm;R[2]+=(c.roll-R[2])*sm;
  let q=e.q;q=qmul(q,qaxis([1,0,0],-R[0]*d.turn[0]*tk*dt));q=qmul(q,qaxis([0,1,0],R[1]*d.turn[1]*tk*dt));q=qmul(q,qaxis([0,0,1],-R[2]*d.turn[2]*dt));e.q=qnorm(q);
  const f=qF(e.q),tgt=c.boost&&d.boost?d.boost*(e.boostK||1):lerp(d.vmin,d.vmax,clamp(c.thr,0,1));
  e.spd+=(tgt-e.spd)*Math.min(1,dt*(c.boost?2.2:1.4));
  const k=Math.min(1,dt*d.grip);for(let i=0;i<3;i++)e.vel[i]+=(f[i]*e.spd-e.vel[i])*k;
  vaddm(e.pos,e.vel,dt);
}
/* steer toward a world point: fine aim when close to the nose, bank-and-pull when it is far off */
function steerTo(e,goal,agg){
  const l=vnorm(toLocal(e,goal)),off=Math.acos(clamp(l[2],-1,1));
  let yaw=clamp(Math.atan2(l[0],l[2])*2.4,-1,1),pitch=clamp(Math.atan2(l[1],l[2])*2.4,-1,1),roll=0;
  if(off>.4){let ra=Math.atan2(l[0],l[1]),pu=1;if(Math.abs(ra)>HP){ra-=Math.sign(ra)*PI;pu=-1;}roll=clamp(ra*1.8,-1,1);pitch=pu*clamp(off*1.6,0,1)*(Math.abs(ra)<.9?1:.4);yaw*=.5;}
  return {pitch:pitch*(agg||1),yaw:yaw*(agg||1),roll,thr:.8,boost:false};
}
/* look ahead for hulls and rocks */
function avoid(e){
  const look=vaddm(e.pos.slice(),e.vel,1.6);
  for(const o of ENT){if(o.dead)continue;
    if(o.kind==='rock'){const d=vdist(look,o.pos);if(d<o.r+40){return vaddm(e.pos.slice(),vnorm(vsub(look,o.pos)),400);}}
    else if(o.kind==='cap'){if(vdist(e.pos,o.pos)>o.r+300)continue;const l=toLocal(o,look);
      for(const b of o.mesh.boxes){const dx=l[0]-b.c[0],dy=l[1]-b.c[1],dz=l[2]-b.c[2];if(Math.abs(dx)<b.h[0]+60&&Math.abs(dy)<b.h[1]+60&&Math.abs(dz)<b.h[2]+60){
        const px=b.h[0]+60-Math.abs(dx),py=b.h[1]+60-Math.abs(dy),pz=b.h[2]+60-Math.abs(dz);let n=py<=px&&py<=pz?[0,Math.sign(dy)||1,0]:px<=pz?[Math.sign(dx)||1,0,0]:[0,0,Math.sign(dz)||1];
        return vaddm(e.pos.slice(),qrot(o.q,n),500);}}}}
  return null;
}
/* ===================== targeting ===================== */
function targetable(e){return !e.dead&&!e.dying&&(e.kind==='ship'||e.kind==='beacon'||(e.kind==='sub'&&!e.noTarget)||e.kind==='torp');}
function pickTarget(e){
  let best=null,bs=1e9;
  for(const o of ENT){if(o.dead||o.dying||!hostile(e.team,o.team)||(o.kind!=='ship'&&o.kind!=='sub'&&o.kind!=='beacon'&&!(o.kind==='torp'&&e.team==='a')))continue;if(o.kind==='sub'&&o.sub!=='turret'&&e.team==='a')continue;if(o.kind==='sub'&&e.team==='e')continue;
    let s=vdist(e.pos,o.pos);if(o===PL)s*=G.demo?1:.55;if(o.kind==='torp')s*=.35;if(o.kind==='sub')s*=1.6;if(e.d&&e.d.torp&&o.kind!=='cap')s*=3;if(o.ai&&o.ai.tgt===e)s*=.6;s*=rnd(.8,1.25);if(s<bs){bs=s;best=o;}}
  return best;
}
function capTargets(e){let best=null,bs=1e9;for(const o of ENT){if(o.dead||!hostile(e.team,o.team)||!o.torpable)continue;const s=vdist(e.pos,o.pos)*rnd(.8,1.2);if(s<bs){bs=s;best=o;}}return best;}
/* ===================== AI pilots ===================== */
function aiShip(e,dt){
  const A=e.ai,d=e.d;A.t-=dt;A.reT-=dt;A.jt-=dt;e.fireT-=dt;e.missT-=dt;e.torpT-=dt;
  if(e.spinOut){e.spinOut-=dt;e.q=qnorm(qmul(e.q,qaxis(e.spinAx,dt*6)));vaddm(e.pos,e.vel,dt);if(FRAME%2===0)fxSmoke(e.pos,3,1);if(FRAME%3===0)fxFire(e.pos,2.5);if(e.spinOut<=0)explodeShip(e);return;}
  if(d.torp&&(!A.cap||A.cap.dead)){A.cap=capTargets(e);}
  if(!A.tgt||A.tgt.dead||A.reT<=0){A.tgt=pickTarget(e);A.reT=rnd(3,7);}
  let c,fire=false,aimP=null;const T=A.tgt;
  const av=avoid(e);
  if(d.torp&&A.cap&&A.st!=='extend'){const C=A.cap,dist=vdist(e.pos,C.pos);c=steerTo(e,C.pos);c.thr=1;
    const ang=Math.acos(clamp(vdot(qF(e.q),vnorm(vsub(C.pos,e.pos))),-1,1));
    if(dist<C.r+1300&&ang<.3&&e.torpT<=0){launchTorp(e,C);e.torpT=rnd(9,13);A.st='extend';A.t=rnd(4,6);A.ext=vnorm(vadd(vmul(qF(e.q),-.3),vrand(1)));}
    if(dist<C.r+300){A.st='extend';A.t=3;A.ext=vnorm(vadd(qU(e.q),vrand(.5)));}
  }else if(A.st==='extend'){c=steerTo(e,vaddm(e.pos.slice(),A.ext,600));c.thr=1;if(A.t<=0)A.st='engage';}
  else if(A.st==='evade'){if(A.jt<=0){A.ev=vnorm(vadd(qF(e.q),vrand(1.4)));A.jt=rnd(.4,.8);}c=steerTo(e,vaddm(e.pos.slice(),A.ev,500),1.2);c.thr=1;if(A.t<=0)A.st='engage';}
  else if(T){
    const dist=vdist(e.pos,T.pos);aimP=lead(e.pos,e.vel,T.pos,T.vel||[0,0,0],d.bolt.spd);
    c=steerTo(e,aimP,e.agg||1);
    const toT=vnorm(vsub(aimP,e.pos)),ang=Math.acos(clamp(vdot(qF(e.q),toT),-1,1));
    if(ang<(e.type==='viper'?.09:.065)&&dist<1150)fire=true;
    const tf=T.vel?vnorm(T.vel):[0,0,1],behind=vdot(tf,vnorm(vsub(T.pos,e.pos)))>.4;c.thr=behind&&dist<500?clamp((T.spd||80)/d.vmax,.3,1):1;
    if(dist<(T.kind==='sub'?240:e.type==='viper'?140:200)&&vdot(qF(e.q),vnorm(vsub(T.pos,e.pos)))>-.2){A.st='extend';A.t=rnd(1.8,3);A.ext=vnorm(vadd(qF(e.q),vrand(.7)));}
    if(d.miss&&e.missT<=0&&dist<1700&&ang<.4&&T.kind==='ship'){launchMissile(e,T);e.missT=e.type==='viper'?rnd(6,9):rnd(10,15);if(e.type==='viper'){setTimeout0(()=>{if(!e.dead&&!T.dead)launchMissile(e,T);},.35);}}
  }else if(A.form&&PL&&!PL.dead){const gp=toWorld(PL,A.form),dd=vdist(e.pos,gp);c=steerTo(e,dd>60?gp:vaddm(gp.slice(),qF(PL.q),400));c.thr=clamp((PL.spd+(dd-20)*.6)/d.vmax,.2,1);}
  else{c=steerTo(e,A.home||vaddm(e.pos.slice(),qF(e.q),300));c.thr=.6;}
  if(e.hitT>.9&&A.st==='engage'&&Math.random()<(e.type==='viper'?.5:.3)){A.st='evade';A.t=rnd(1.5,2.8);A.jt=0;}
  const ctr=G.M?G.M.center:[0,0,800],rad=G.M?G.M.radius:4200;if(vdist(e.pos,ctr)>rad*1.05){c=steerTo(e,ctr,1);c.thr=1;if(A.st==='extend')A.st='engage';}
  if(av){c=steerTo(e,av,1.3);fire=false;}
  fly(e,dt,c);
  A.bt=(A.bt||0)-dt;A.cool=(A.cool||0)-dt;
  if(fire&&A.cool<=0){if(A.bt<=0&&A.bt>-1)A.bt=rnd(.6,1.1);if(A.bt>0)shipFire(e,aimP);else{A.cool=rnd(.5,1.2);A.bt=0;}}
}
/* ===================== weapons ===================== */
function shipFire(e,aimP){
  if(e.fireT>0)return;const d=e.d,pl=e===PL;e.fireT=d.bolt.rate*(pl?1/(1+.2*(G.up.rate||0)):1);
  const quad=pl&&G.up.quad,guns=d.guns,list=quad?guns:[guns[e.gun++%guns.length]];
  for(const gp of list){
    const p=toWorld(e,gp);let dir;
    if(aimP){dir=vnorm(vsub(aimP,p));}else dir=qF(e.q);
    if(!pl&&d.acc){dir=vnorm(vadd(dir,vrand(d.acc*Math.random())));}
    if(pl&&quad){dir=vnorm(vadd(dir,vmul(qU(e.q),(guns.indexOf(gp)%2?.003:-.003))));}
    const spd=d.bolt.spd,dmg=d.bolt.dmg*(pl?(1+.25*(G.up.dmg||0)):1);
    BOLTS.push({p,prev:p.slice(),v:vaddm(vmul(dir,spd),e.vel,1),life:d.bolt.life,team:e.team,dmg,owner:e,col:pl?TEAMC.p:TEAMC[e.team]});
  }
  if(pl){if(quad)e.gun++;G.stats.shots++;SFX.laser();}else{const dd=vdist(e.pos,VIEW.pos);SFX.elaser(1-dd/1600);}
  if(pl&&quad){e.fireT*=1.35;}
}
function launchMissile(e,T){
  const p=toWorld(e,[0,-1.2,1]),pl=e===PL;
  MISS.push({kind:'mis',p,v:vaddm(vmul(qF(e.q),60),e.vel,1),tgt:T,team:e.team,dmg:pl?95*(1+.3*(G.up.seek||0)):18,life:7,turn:pl?2.6*(1+.5*(G.up.seek||0)):1.7,spd:pl?440:390,owner:e,t:0,q:e.q.slice(),hp:5});
  SFX.missile();
}
function launchTorp(e,C){const p=toWorld(e,[0,-1.5,5]);const t=ent({kind:'torp',team:e.team,pos:p,vel:vaddm(vmul(qF(e.q),40),e.vel,.5),q:e.q.slice(),r:3.8,hp:8,max:8,mesh:MESH.torp,tgt:C,life:30,s:1.4,name:'TORPEDO'});
  MISS.push({kind:'torp',ent:t});SFX.missile();if(C===G.M?.protect||C.torpable)radioOnce('torp',['JUNO','Torpedoes in the water! Shoot them down!']);}
/* ===================== damage ===================== */
function damage(e,dmg,src,pt){
  if(e.dead||e.dying||dmg<=0)return;
  if(e.shielded&&e.shielded()){if(pt)fxShieldHit(pt);return;}
  if(e===PL&&G.god)return;
  if(e===PL&&G.dmgLog){const k=src?(src.type||src.sub||src.kind||'pt'):'flak';G.dmgLog[k]=(G.dmgLog[k]||0)+dmg;}
  if(e.sh>0){const a=Math.min(e.sh,dmg);e.sh-=a;dmg-=a;e.shT=e===PL?2:2.6;e.shHit=.18;if(e===PL)SFX.shieldHit();if(pt&&e!==PL)fxShieldHit(pt,4);}
  e.shT=e===PL?2:2.6;
  if(dmg>0){e.hp-=dmg;e.flash=.06;e.hitT=1;if(e===PL){SFX.hullHit();G.shake=Math.min(1,G.shake+.35);}}
  if(e===PL&&src){G.hurt=.5;const l=toLocal(PL,src.pos||src);G.hurtDir=Math.atan2(l[0],l[1]);}
  if(src&&src===PL&&e.kind!=='rock'){G.stats.hits++;}
  if(e.hp<=0)kill(e,src);
}
function kill(e,src){
  if(e.dead||e.dying)return;
  const byP=src===PL||(src&&src.owner===PL);
  const sc={dart:200,wasp:250,hammer:400,ace:1500,viper:12000}[e.type]||(e.kind==='sub'?{turret:500,gen:2500,bridge:5000,engine:1500,vent:3000,core:10000,beam:4000}[e.sub]:e.kind==='torp'?150:e.kind==='beacon'?2000:e.kind==='rock'?25:0);
  if(byP&&sc){G.mult=Math.min(5,G.mult+(e.kind==='rock'?0:1));G.multT=4;const pts=sc*G.mult;G.score+=pts;if(e.kind!=='rock'){G.stats.kills++;POPS.push({p:e.pos.slice(),t:0,s:'+'+fmt(pts)});}}
  if(G.M&&G.M.onKill)G.M.onKill(e,byP);
  if(e.kind==='ship'&&e!==PL&&Math.random()<.35&&e.type!=='viper'){e.dying=true;e.spinOut=rnd(.6,1.1);e.spinAx=vnorm(vrand(1));e.hp=0;return;}
  e.dead=true;
  if(e.kind==='ship'&&e!==PL)explodeShip(e);
  else if(e.kind==='sub'){fxExplode(e.pos,e.r*1.6,true);if(e.sub==='gen')SFX.shieldDown();}
  else if(e.kind==='rock'){fxRock(e);}
  else if(e.kind==='torp'||e.kind==='beacon')fxExplode(e.pos,e.kind==='torp'?10:24,e.kind==='beacon');
  if(e===PL){fxExplode(e.pos,30,true);for(let i=0;i<14;i++)chunk(e.pos,e.vel,MT.hull,rnd(.6,1.8));SFX.bigboom();G.slow=.35;G.slowT=1.4;}
}
function explodeShip(e){
  e.dead=true;e.dying=false;const big=e.type==='viper'||e.type==='hammer';fxExplode(e.pos,big?28:16,big);for(let i=0;i<(big?14:8);i++)chunk(e.pos,e.vel,e.mesh.mats[0]||MT.dark,rnd(.6,1.8));
}
function setTimeout0(f,t){LATER.push({f,t});}const LATER=[];
/* ===================== effects ===================== */
const POPS=[];
function fxFire(p,r){FX.push({k:'fire',p:vadd(p,vrand(r*.3)),v:vrand(r*.6),r0:r*.4,r1:r*1.4,t:0,T:rnd(.35,.7)});}
function fxSmoke(p,r,n){for(let i=0;i<(n||1);i++)FX.push({k:'smoke',p:vadd(p,vrand(r*.3)),v:vrand(r*.3),r0:r*.5,r1:r*2.2,t:0,T:rnd(1,2.2)});}
function fxSpark(p,n,col,spd){for(let i=0;i<n;i++)FX.push({k:'spark',p:p.slice(),v:vrand(spd||60),t:0,T:rnd(.2,.5),col:col||[255,220,140]});}
function fxShieldHit(p,r){FX.push({k:'shield',p:p.slice(),t:0,T:.25,r:r||8});}
function fxExplode(p,r,big){
  for(let i=0;i<(big?22:12);i++)FX.push({k:'fire',p:vadd(p,vrand(r*.25)),v:vrand(r*rnd(.6,1.6)),r0:r*.2,r1:r*rnd(.5,1),t:-Math.random()*.15,T:rnd(.5,1.1)});
  for(let i=0;i<(big?12:6);i++)FX.push({k:'smoke',p:vadd(p,vrand(r*.3)),v:vrand(r*.5),r0:r*.3,r1:r*rnd(.8,1.4),t:-.2,T:rnd(1.6,3)});
  fxSpark(p,big?30:16,null,r*7);
  FX.push({k:'flash',p:p.slice(),t:0,T:.22,r:r*1.6});
  FX.push({k:'ring',p:p.slice(),t:0,T:big?.9:.6,r:r*(big?5:3.2),ax:vnorm(vrand(1))});
  const d=vdist(p,VIEW.pos);if(d<2500){(big?SFX.bigboom:SFX.boom)(clamp(1.3-d/1500,.2,1.3));G.shake=Math.min(1,G.shake+clamp(1-d/600,0,1)*(big?.8:.4));}
}
function chunk(p,v,m,s){CHUNKS.push({p:vadd(p,vrand(2)),v:vaddm(vrand(rnd(15,50)),v,.6),q:qnorm(vrand(1).concat([1]).slice(0,4)),ax:vnorm(vrand(1)),w:rnd(2,8),s,m,t:0,T:rnd(2,3.5),fire:Math.random()<.5});}
function fxRock(e){fxExplode(e.pos,e.s*.5,e.s>40);for(let i=0;i<10;i++)FX.push({k:'dust',p:vadd(e.pos,vrand(e.s*.6)),v:vrand(e.s*.4),r0:e.s*.3,r1:e.s*.9,t:0,T:rnd(1.5,3)});
  if(e.s>34)for(let i=0;i<3;i++){const r=e.s*rnd(.35,.5),k=mkRock(vadd(e.pos,vrand(e.s*.5)),r);k.vel=vaddm(vrand(rnd(5,18)),e.vel,1);}}
function updFX(dt){
  for(const f of FX){f.t+=dt;if(f.v){vaddm(f.p,f.v,dt);const k=Math.pow(f.k==='spark'?.4:.55,dt);f.v[0]*=k;f.v[1]*=k;f.v[2]*=k;}}
  let j=0;for(let i=0;i<FX.length;i++)if(FX[i].t<FX[i].T)FX[j++]=FX[i];FX.length=j;if(FX.length>2200)FX.splice(0,FX.length-2200);
  for(const c of CHUNKS){c.t+=dt;vaddm(c.p,c.v,dt);c.q=qnorm(qmul(c.q,qaxis(c.ax,c.w*dt)));if(c.fire&&FRAME%4===0)FX.push({k:'fire',p:c.p.slice(),v:[0,0,0],r0:c.s*.8,r1:c.s*2,t:0,T:.4});}
  j=0;for(let i=0;i<CHUNKS.length;i++)if(CHUNKS[i].t<CHUNKS[i].T)CHUNKS[j++]=CHUNKS[i];CHUNKS.length=j;
  for(const p of POPS)p.t+=dt;for(let i=POPS.length-1;i>=0;i--)if(POPS[i].t>1.1)POPS.splice(i,1);
  for(let i=LATER.length-1;i>=0;i--){const l=LATER[i];l.t-=dt;if(l.t<=0){LATER.splice(i,1);l.f();}}
}
/* ===================== bolts, missiles, flak ===================== */
function segSphere(a,b,c,r){const ab=vsub(b,a),ac=vsub(c,a),L2=vdot(ab,ab);let t=L2>0?vdot(ac,ab)/L2:0;t=clamp(t,0,1);const px=a[0]+ab[0]*t-c[0],py=a[1]+ab[1]*t-c[1],pz=a[2]+ab[2]*t-c[2];return px*px+py*py+pz*pz<r*r?t:-1;}
function segBox(a,b,C,B){const la=toLocal(C,a),lb=toLocal(C,b),d=vsub(lb,la);let t0=0,t1=1;
  for(let k=0;k<3;k++){const lo=B.c[k]-B.h[k],hi=B.c[k]+B.h[k];if(Math.abs(d[k])<1e-9){if(la[k]<lo||la[k]>hi)return -1;continue;}let ta=(lo-la[k])/d[k],tb=(hi-la[k])/d[k];if(ta>tb){const s=ta;ta=tb;tb=s;}t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return -1;}return t0;}
function updBolts(dt){
  for(const b of BOLTS){
    if(b.life<=0)continue;b.life-=dt;b.prev[0]=b.p[0];b.prev[1]=b.p[1];b.prev[2]=b.p[2];vaddm(b.p,b.v,dt);
    const mid=vlerp(b.prev,b.p,.5),half=vdist(b.prev,b.p)*.5;let bt=2,be=null;
    for(const e of ENT){
      if(e.dead||e===b.owner||!(hostile(b.team,e.team)||e.team==='n'))continue;
      if(e.kind==='cap'){if(vdist(mid,e.pos)>e.r+half)continue;for(const B of e.mesh.boxes){const t=segBox(b.prev,b.p,e,B);if(t>=0&&t<bt){bt=t;be=e;}}continue;}
      const R=e.r*(e.s&&e.kind!=='rock'?e.s:1);if(vdist(mid,e.pos)>R+half)continue;
      const t=segSphere(b.prev,b.p,e.pos,R);if(t>=0&&t<bt){bt=t;be=e;}
    }
    if(be){const hp=vlerp(b.prev,b.p,bt);b.life=0;
      if(be.kind==='cap'){fxSpark(hp,4,b.col,40);FX.push({k:'flash',p:hp,t:0,T:.08,r:5});}
      else{damage(be,b.dmg,b.owner,hp);fxSpark(hp,5,b.col,50);FX.push({k:'flash',p:hp,t:0,T:.06,r:3});if(b.owner===PL&&be.kind!=='rock')G.hitMark=.15;}}
  }
  let j=0;for(let i=0;i<BOLTS.length;i++)if(BOLTS[i].life>0)BOLTS[j++]=BOLTS[i];BOLTS.length=j;
  for(const m of MISS){
    if(m.kind==='torp'){const e=m.ent;if(e.dead){m.done=1;continue;}e.life-=dt;const C=e.tgt;
      if(!C||C.dead||e.life<=0){e.dead=true;fxExplode(e.pos,8,false);m.done=1;continue;}
      const want=vnorm(vsub(C.pos,e.pos)),cur=vnorm(e.vel),nd=vturn(cur,want,.5*dt),sp=Math.min(150,vlen(e.vel)+40*dt);e.vel=vmul(nd,sp);vaddm(e.pos,e.vel,dt);e.q=qlook(nd,qU(e.q));
      if(FRAME%2===0)FX.push({k:'smoke',p:e.pos.slice(),v:vrand(2),r0:1.5,r1:4,t:0,T:1.4});
      if(hitCap(C,e.pos,6)){e.dead=true;m.done=1;fxExplode(e.pos,26,true);if(C.capHit)C.capHit(170);}
      continue;}
    m.t+=dt;m.life-=dt;const T=m.tgt&&!m.tgt.dead?m.tgt:null;let dir=vnorm(m.v);
    if(T&&m.t>.25){const ap=lead(m.p,[0,0,0],T.pos,T.vel||[0,0,0],m.spd);dir=vturn(dir,vnorm(vsub(ap,m.p)),m.turn*dt);}
    const sp=Math.min(m.spd,vlen(m.v)+m.spd*1.5*dt);m.v=vmul(dir,sp);vaddm(m.p,m.v,dt);m.q=qlook(dir,[0,1,0]);
    FX.push({k:'smoke',p:m.p.slice(),v:vrand(2),r0:.8,r1:3.2,t:0,T:rnd(.9,1.4)});
    let boom=m.life<=0;
    if(T&&vdist(m.p,T.pos)<T.r+7){boom=true;damage(T,m.dmg,m.owner,m.p);}
    for(const o of ENT){if(boom)break;if(o.dead)continue;if(o.kind==='rock'&&vdist(m.p,o.pos)<o.r){boom=true;damage(o,m.dmg,m.owner);}else if(o.kind==='cap'&&hitCap(o,m.p,2))boom=true;}
    if(boom){m.done=1;fxExplode(m.p,m.team==='a'?14:10,false);}
  }
  for(let i=MISS.length-1;i>=0;i--)if(MISS[i].done)MISS.splice(i,1);
  for(const f of FLAK){f.t+=dt;vaddm(f.p,f.v,dt);if(f.t>=f.T){f.done=1;FX.push({k:'flak',p:f.p.slice(),t:0,T:.9,r:16});FX.push({k:'flash',p:f.p.slice(),t:0,T:.12,r:14});
    for(const e of ENT)if(!e.dead&&e.kind==='ship'&&hostile(f.team,e.team)){const d=vdist(e.pos,f.p);if(d<36)damage(e,6*(1-d/36),null,f.p);}
    const dd=vdist(f.p,VIEW.pos);if(dd<1200)SFX.boom(.35*(1-dd/1200));}}
  for(let i=FLAK.length-1;i>=0;i--)if(FLAK[i].done)FLAK.splice(i,1);
}
function hitCap(C,p,pad){const l=toLocal(C,p);for(const B of C.mesh.boxes){if(Math.abs(l[0]-B.c[0])<B.h[0]+pad&&Math.abs(l[1]-B.c[1])<B.h[1]+pad&&Math.abs(l[2]-B.c[2])<B.h[2]+pad)return true;}return false;}
/* ===================== capital ships: subsystems aim and fire ===================== */
function updCaps(dt){
  for(const c of ENT){if(c.kind!=='cap'||c.dead)continue;vaddm(c.pos,c.vel,dt);if(c.think)c.think(c,dt);}
  for(const s of ENT){if(s.kind!=='sub'||s.dead)continue;subPos(s);if(s.sub==='turret')turretThink(s,dt);if(s.flash>0)s.flash-=dt;}
}
function turretThink(s,dt){
  s.reT-=dt;s.fireT-=dt;
  if(!s.tgt||s.tgt.dead||s.reT<=0){s.reT=rnd(1.5,3);let best=null,bd=s.range||1300;for(const o of ENT){if(o.dead||o.kind!=='ship'||!hostile(s.team,o.team))continue;const d=vdist(o.pos,s.pos)*(o===PL?.8:1);if(d<bd){bd=d;best=o;}}s.tgt=best;}
  const T=s.tgt;if(!T){return;}
  const up=qU(s.parent.q),toT=vnorm(vsub(T.pos,s.pos));if(vdot(toT,up)<-.15){return;}
  const ap=lead(s.pos,[0,0,0],T.pos,T.vel,s.flak?700:1000);s.aim=vturn(s.aim,vnorm(vsub(ap,s.pos)),dt*.95);s.gq=qlook(s.aim,up);
  if(s.fireT<=0&&vdot(s.aim,vnorm(vsub(ap,s.pos)))>.995){
    const mz=vadd(s.mpos||s.pos,vmul(up,4.6*s.s));
    if(s.flak){const d=vdist(s.pos,ap),tt=d/700+rnd(-.15,.15);if(d<320){s.fireT=.4;return;}FLAK.push({p:mz,v:vmul(vnorm(vadd(s.aim,vrand(.03))),700),t:0,T:tt,team:s.team});s.fireT=rnd(.9,1.5);}
    else{if(s.burst<=0)s.burst=3;s.burst--;const dir=vnorm(vadd(s.aim,vrand(.035)));BOLTS.push({p:vadd(mz,vmul(dir,8*s.s)),prev:mz.slice(),v:vmul(dir,1000),life:1.6,team:s.team,dmg:3.5*(s.dmgK||1),owner:s,col:TEAMC[s.team],big:1});s.fireT=s.burst>0?.16:rnd(1.6,2.6);
      const dd=vdist(s.pos,VIEW.pos);SFX.elaser(1-dd/1800);}
  }
}
/* ===================== player ===================== */
const PLS={lockT:0,locked:false,lockTone:0,tgt:null,missCD:0,energy:100,boostE:100,cockT:0,boostHeld:false,ctl:null,autoT:0,warnBeep:0,flyby:0};
function maxEnergy(){return 100*(1+.4*(G.up.cap||0));}
function updPlayer(dt,c){
  const P=PL,S2=PLS;if(!P||P.dead)return;S2.ctl=c;
  P.thr=clamp(P.thr+c.thr*dt*.8,0,1);
  const wantBoost=c.boost&&S2.boostE>5;let boost=wantBoost&&S2.boostE>0;
  if(boost){S2.boostE=Math.max(0,S2.boostE-dt*34/(1+.5*(G.up.boost||0)));if(!S2.boostHeld)SFX.boost();}else S2.boostE=Math.min(100,S2.boostE+dt*14*(1+.5*(G.up.boost||0)));
  S2.boostHeld=boost;P.boostK=1+.25*(G.up.boost||0);P.turnK=1+.15*(G.up.agile||0);
  let ctl={pitch:c.pitch,yaw:c.yaw,roll:c.roll,thr:P.thr,boost};
  /* combat zone fence: a gentle pull back toward the fight */
  const M=G.M;if(M){const d=vdist(P.pos,M.center);if(d>M.radius){const l=vnorm(toLocal(P,M.center)),k=clamp((d-M.radius)/600,0,1);ctl.yaw=lerp(ctl.yaw,clamp(Math.atan2(l[0],l[2])*2,-1,1),k*.8);ctl.pitch=lerp(ctl.pitch,clamp(Math.atan2(l[1],l[2])*2,-1,1),k*.8);G.fence=true;}else G.fence=false;}
  fly(P,dt,ctl);
  P.fireT-=dt;
  /* energy for cannons */
  const em=maxEnergy();S2.energy=Math.min(em,S2.energy+dt*24*(1+.3*(G.up.cap||0)));
  /* targeting */
  S2.autoT-=dt;
  if(c.target){S2.tgt=nearestToNose(true);SFX.select();S2.lockT=0;}
  if(!S2.tgt||!targetable(S2.tgt)){if(S2.autoT<=0){S2.tgt=nearestToNose(false);S2.autoT=.4;S2.lockT=0;}}
  const T=S2.tgt;let aimP=null;
  if(T){const lp=lead(P.pos,P.vel,T.pos,T.vel||[0,0,0],P.d.bolt.spd),toL=vnorm(vsub(lp,P.pos)),ang=Math.acos(clamp(vdot(qF(P.q),toL),-1,1));if(ang<.045&&vdist(P.pos,T.pos)<1600)aimP=lp;S2.lead=lp;
    const toT=vnorm(vsub(T.pos,P.pos)),ta=Math.acos(clamp(vdot(qF(P.q),toT),-1,1)),dist=vdist(P.pos,T.pos);
    if(ta<.26&&dist<2800&&T.kind!=='rock'){const lt=.9/(1+.6*(G.up.lock||0));S2.lockT=Math.min(lt,S2.lockT+dt);S2.lockTone-=dt;if(S2.lockT>=lt){if(!S2.locked)SFX.locked();S2.locked=true;}else if(S2.lockTone<=0){SFX.lockTone();S2.lockTone=.18;}}
    else{S2.lockT=Math.max(0,S2.lockT-dt*2);S2.locked=false;}}
  else{S2.lockT=0;S2.locked=false;S2.lead=null;}
  if(c.fire&&S2.energy>=4&&P.fireT<=0){shipFire(P,aimP);S2.energy-=G.up.quad?5:3.6;}
  S2.missCD-=dt;
  if(c.missile&&S2.missCD<=0&&P.missiles>0){launchMissile(P,S2.locked?T:null);P.missiles--;S2.missCD=.6;S2.lockT=0;S2.locked=false;}
  /* shields */
  P.shT-=dt;if(P.shT<=0&&P.sh<P.shMax)P.sh=Math.min(P.shMax,P.sh+dt*24*(1+.3*(G.up.shield||0)));
  if(P.shHit>0)P.shHit-=dt;
  /* Halcyon's deck crew patches you up when you fly close */
  const CV=G.M&&G.M.cv;G.repair=false;
  if(CV&&!CV.dead&&!CV.dying){const d=vdist(P.pos,CV.pos);if(d<CV.r+260){if(P.hp<P.max||P.missiles<P.maxMiss){G.repair=true;P.hp=Math.min(P.max,P.hp+dt*9);S2.rearm=(S2.rearm||0)+dt;if(S2.rearm>2.5&&P.missiles<P.maxMiss){S2.rearm=0;P.missiles++;}}}
    if(P.hp<P.max*.4)radioOnce('repair',['CMD','Voidlance, you are hurt. Come home to Halcyon and we will patch you up.']);}
  /* incoming missile warning */
  let inc=null;for(const m of MISS)if(m.kind==='mis'&&m.tgt===P&&vdist(m.p,P.pos)<2600){inc=m;break;}
  G.incoming=inc;if(inc){S2.warnBeep-=dt;if(S2.warnBeep<=0){SFX.warn();S2.warnBeep=clamp(vdist(inc.p,P.pos)/2000,.15,.6);}}
  /* fly-by whoosh */
  S2.flyby-=dt;if(S2.flyby<=0)for(const e of ENT){if(e.kind!=='ship'||e===P||e.dead)continue;const d=vdist(e.pos,P.pos);if(d<45){SFX.flyby(1-d/45);S2.flyby=.5;break;}}
  /* collisions with rocks, hulls and ships (damage at most every half second) */
  S2.bumpT=(S2.bumpT||0)-dt;const bump=(amt,at)=>{if(S2.bumpT>0)return;S2.bumpT=.5;damage(P,amt,at);SFX.impact();G.shake=1;};
  for(const o of ENT){if(o.dead||o===P)continue;
    if(o.kind==='rock'){const d=vdist(P.pos,o.pos),rr=o.r+P.r;if(d<rr){const n=vnorm(vsub(P.pos,o.pos));P.pos=vadd(o.pos,vmul(n,rr));const vn=vdot(P.vel,n);if(vn<0){vaddm(P.vel,n,-vn*1.6);bump(Math.min(35,-vn*.25),o.pos);}}}
    else if(o.kind==='cap'&&vdist(P.pos,o.pos)<o.r+20){const l=toLocal(o,P.pos);for(const B of o.mesh.boxes){const dx=l[0]-B.c[0],dy=l[1]-B.c[1],dz=l[2]-B.c[2],px=B.h[0]+P.r-Math.abs(dx),py=B.h[1]+P.r-Math.abs(dy),pz=B.h[2]+P.r-Math.abs(dz);
      if(px>0&&py>0&&pz>0){let n=py<=px&&py<=pz?[0,Math.sign(dy)||1,0]:px<=pz?[Math.sign(dx)||1,0,0]:[0,0,Math.sign(dz)||1];const pen=Math.min(px,py,pz),nw=qrot(o.q,n);vaddm(P.pos,nw,pen);const vn=vdot(P.vel,nw);if(vn<0){vaddm(P.vel,nw,-vn*1.6);bump(Math.min(35,-vn*.25),vadd(P.pos,nw));fxSpark(P.pos,14,null,60);}}}}
    else if(o.kind==='ship'){const d=vdist(P.pos,o.pos),rr=o.r+P.r;if(d<rr*.8){const n=vnorm(vsub(P.pos,o.pos));P.pos=vadd(o.pos,vmul(n,rr*.8));vaddm(P.vel,n,40);if(S2.bumpT<=0){damage(o,30,P);}bump(12,o.pos);}}}
}
function nearestToNose(cycle){
  const P=PL,f=qF(P.q);let best=null,bs=1e9;const cur=PLS.tgt;
  for(const o of ENT){if(!targetable(o)||!hostile(P.team,o.team))continue;const to=vsub(o.pos,P.pos),d=vlen(to),a=Math.acos(clamp(vdot(f,vmul(to,1/(d||1))),-1,1));
    let s=a*3+d/1500;if(o.objective)s*=.8;if(o.kind==='torp')s*=.6;if(cycle&&o===cur)s+=50;if(s<bs){bs=s;best=o;}}
  return best;
}
/* ===================== radio ===================== */
const SAID=new Set();
function radio(who,text,dur){G.radio.push({who,text,dur:dur||Math.max(2.6,text.length*.06+1.2)});}
function radioOnce(key,[who,text]){if(SAID.has(key))return;SAID.add(key);radio(who,text);}
function updRadio(dt){
  if(!G.rad&&G.radio.length){G.rad=G.radio.shift();G.rad.t=0;SFX.radio();say(G.rad.text,G.rad.who);}
  if(G.rad){G.rad.t+=dt;if(G.rad.t>G.rad.dur){G.rad=null;}}
}
