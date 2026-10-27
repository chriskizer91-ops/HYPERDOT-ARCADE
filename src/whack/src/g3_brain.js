
/* ---------- 9.7 the acting: one state machine + a bundle of springs per critter ----------
   rustle (anticipation) -> pop (overshoot) -> up (idle acting) -> laugh / tease -> duck
                                   \-> hit (bonk) -> dizzy -> sink        clang / khit -> up   */
const S={mode:'title',t:0,rt:0,score:0,hi:parseInt(store.get('hd-'+CAB.id+'-hi','0'),10)||0,time:45,combo:0,comboT:0,best:0,hits:0,whiffs:0,esc:0,bombs:0,kos:0,
  frenzy:false,kingT:0,kingN:0,spawnT:1,stop:0,impF:0,shake:0,flash:0,lflash:0,demo:true,auto:false,paused:false,tickets:0,newHi:false,jackpot:0,
  ban:null,lastHole:-1,plast:0,lastSec:0,tkShown:0,scShown:0,tkDone:false,tkAcc:0,tkBase:0,tkCombo:0,castN:0,castT:0,cnt:-1,stick:0,hostT:0,_ph:0};
let HIT=null;
const phaseP=()=>clamp((45-S.time)/35,0,1);         /* 0 at the start, 1 at the frenzy */
function hittable(c){const s=c.st;return (s==='pop'||s==='up'||s==='laugh'||s==='duck'||s==='clang'||s==='khit'||s==='tease')&&c.H.x>.36;}
function spawnCritter(h,kind){
  const c=h.c,KD=KIND[kind];c.kind=kind;
  c.H.x=0;c.H.v=0;c.SQ.x=0;c.SQ.v=0;c.LEAN.x=0;c.LEAN.v=0;c.leanT=0;c.TILT.x=0;c.TILT.v=0;c.tiltT=0;c.HD.x=0;c.HD.v=0;
  for(const e of c.EAR){e.x=0;e.v=0;}for(const e of c.WH){e.x=0;e.v=0;}c.CRy=0;c.CRv=0;c.CRA.x=0;c.CRA.v=0;
  c.lid=0;c.lid0=KD.lid0;c.lidAng=kind==='bomb'?-.5:kind==='hard'?-.2:0;c.brow=kind==='hard'?1:kind==='king'?4:kind==='bomb'?2:0;
  c.flush=0;c.soot=0;c.red=0;c.fph=0;c.jx=0;c.hp=kind==='hard'?2:kind==='king'?5:1;c.helmet=kind==='hard';c.stars=0;c.worry=0;c.snick=0;c.snkOn=false;c.taunt=0;
  c.hold=kind==='king'||c.cast;c.blinkT=rnd(.8,2.5);c.blink=0;c.lookX=0;c.lookY=0;c.ltx=0;c.lty=-.2;c.lookT=.3;c.seen=0;
  enter(c,'rustle');
}
function enter(c,st){
  if(c.cast&&(st==='duck'||st==='none'||st==='sink'))st='up';
  const KD=KIND[c.kind],h=c.hole;c.st=st;c.t=0;
  switch(st){
  case 'rustle':c.hT=.03;c.hw=30;c.hz=.6;c.SQ.x=-.18;c.eyes='shut';c.mouth='o';c.mo=.8;c.paw=0;
    c.dur=(c.kind==='king'?.75:lerp(KD.rus[0],KD.rus[1],phaseP()))*rnd(.9,1.12);if(!c.cast)SFX.rustle();break;
  case 'pop':c.hT=1;c.hw=KD.w;c.hz=KD.z;c.H.v+=KD.w*.25;c.SQ.v+=3;c.eyes='wide';c.mouth='o';c.mo=1.1;c.jx=0;
    c.life=c.life0=c.hold?99:lerp(KD.up[0],KD.up[1],phaseP())*(S.frenzy?.82:1)*rnd(.92,1.1);
    if(!c.cast){dirtBurst(h,c.kind==='king'?16:8);SFX.pop(c.kind);if(c.kind==='king'){SFX.fanfare();S.shake=Math.max(S.shake,.3);}}break;
  case 'up':c.eyes='open';c.mouth=KD.mouth;c.paw=1;c.hT=1;c.hw=KD.w;c.hz=KD.z;c.tiltT=0;c.leanT=0;break;
  case 'laugh':c.eyes='happy';c.mouth='laugh';c.laughSide=Math.random()<.5?-1:1;if(!c.cast){SFX.laugh(KD.voice);popText('HA HA',c.topX,c.topY-3*U,'#ffe070',0,0);}break;
  case 'tease':c.mouth='tongue';c.eyes='happy';if(!c.cast)SFX.raspberry();break;
  case 'duck':c.paw=0;c.eyes='shut';c.mouth='o';c.mo=.8;c.hT=1.1;c.hw=26;c.hz=.5;c.tiltT=0;c.leanT=0;c.red=0;break;
  case 'hit':c.paw=0;c.eyes='x';c.mouth='o';c.mo=1.35;c.SQ.x=-.5;c.SQ.v=0;c.H.x=Math.max(.3,c.H.x-.1);c.H.v=0;c.hT=.66;c.hw=13;c.hz=.45;c.brow=0;c.lid0=0;c.red=0;c.taunt=0;c.snick=0;break;
  case 'dizzy':c.eyes='spiral';c.mouth='wavy';c.stars=1;if(!c.cast)SFX.dizzy();break;
  case 'sink':c.hT=-.25;c.hw=8;c.hz=1;break;
  case 'clang':c.eyes='x';c.mouth='grit';c.SQ.x=-.34;c.SQ.v=0;c.hT=.84;c.hw=14;c.hz=.4;c.brow=2;c.lidAng=-.45;c.lid0=.2;c.flush=1;c.life+=.7;c.paw=1;
    c.EAR[0].x=-.6;c.EAR[0].v=-6;c.EAR[1].x=-.6;c.EAR[1].v=-6;break;              /* ears spring out from under the hat */
  case 'khit':c.eyes='x';c.mouth='grit';c.SQ.x=-.42;c.SQ.v=0;c.hT=.8;c.hw=12;c.hz=.4;c.CRv=-125;c.CRA.v+=(Math.random()<.5?-1:1)*9;c.brow=2;c.lidAng=-.4;c.flush=Math.min(1,c.flush+.22);break;
  case 'none':c.cool=.45;c.paw=0;c.stars=0;c.red=0;if(c.kind==='king')S.kingT=.55;break;
  }
}
function escape(c){
  if(S.mode==='play')S.esc++;
  if(c.kind==='bomb'){if(!c.cast)SFX.fizzle();enter(c,'duck');}
  else if(c.kind==='gold')enter(c,'tease');
  else enter(c,'laugh');
}
/* how close (and how raised) the mallet is over this critter's face, 0..1 */
function malletNear(c){if(!ML.vis||c.cast)return 0;const k=c.hole.k*U,d=Math.hypot(ML.x-c.headX,(ML.y-c.headY)*1.3)/(32*k);return d>1?0:(1-d)*clamp(ML.TH.x/UPA,0,1);}
function chooseLook(c,KD){
  c.lookT=rnd(KD.sacc[0],KD.sacc[1]);
  const watch=!c.cast&&ML.vis&&(c.worry>.25||c.kind==='hard'||c.kind==='king'||Math.random()<.35);
  if(watch){const dx=ML.hx-c.headX,dy=ML.hy-c.headY,l=Math.hypot(dx,dy)||1,m=Math.min(1,l/(18*U));c.ltx=dx/l*m;c.lty=dy/l*m;if(c.kind==='hard')c.lookT=.12;}
  else if(Math.random()<.3){c.ltx=0;c.lty=.2;}            /* look straight at the player */
  else{c.ltx=rnd(-1,1);c.lty=rnd(-.7,.5);}
}
/* idle acting per personality */
function idle(c,KD,dt){
  const m=malletNear(c);c.worry+=((m>.35?1:0)-c.worry)*Math.min(1,dt*8);
  switch(c.kind){
  case 'mole':
    if(c.brow!==2)c.brow=c.worry>.5?3:0;
    if(c.taunt>0){c.taunt-=dt;c.mouth='tongue';c.leanT=Math.sin(c.t*18)*.06;if(c.taunt<=0){c.mouth=KD.mouth;c.leanT=0;}}
    else if(c.worry<.2&&c.snick<=0&&Math.random()<dt*.3)c.taunt=.55;
    if(Math.random()<dt*.7)c.EAR[Math.random()<.5?0:1].v+=rnd(7,11);
    if(c.worry>.6&&Math.random()<dt*1.5)sweat(c);
    break;
  case 'hard':
    if(Math.random()<dt*.6){c.SQ.v-=2.4;if(!c.helmet&&!c.cast)steam(c);}                 /* grumpy huff */
    if(!c.helmet)c.flush=Math.max(.45,c.flush-dt*.4);
    break;
  case 'gold':
    c.jx=Math.sin(c.t*70)*.32*(1+c.worry*1.5);c.brow=c.worry>.5?3:0;c.lid0=0;
    if(Math.random()<dt*6)glint(c);if(c.worry>.5&&Math.random()<dt*2.5)sweat(c);
    break;
  case 'bomb':{
    c.leanT=Math.sin(c.t*5.5)*.16;c.tiltT=Math.sin(c.t*5.5+1)*.08;
    const f=clamp(1-c.life/c.life0,0,1);c.fph+=dt*(2.2+7*f+5*m);const s=Math.sin(c.fph*TAU);c.red=s>0?s*s*.85:0;
    if(Math.random()<dt*14&&!c.cast)part(PK_SPARK,c.fuseX,c.fuseY,rnd(-40,40)*U,rnd(-70,-20)*U,rnd(.12,.25),1,pack(255,230,120),1e9);
    if(Math.random()<dt*4&&!c.cast)SFX.fuse();
    break;}
  case 'king':
    c.tiltT=-.05+Math.sin(c.t*1.6)*.045;c.lid0=c.flush>.5?.12:.38;if(c.flush>0)c.flush=Math.max(0,c.flush-dt*.08);
    break;
  }
  if(c.snick>0){c.snkOn=true;c.eyes='happy';c.mouth='laugh';c.hT=1+.035*Math.abs(Math.sin(c.t*15));}
  else if(c.snkOn){c.snkOn=false;c.eyes='open';c.mouth=c.kind==='hard'&&!c.helmet?'grit':KD.mouth;c.hT=1;}
}
function critTick(c,dt){
  if(c.st==='none'){if(c.cool>0)c.cool-=dt;return;}
  const KD=KIND[c.kind],h=c.hole;c.t+=dt;c.br+=dt*(c.kind==='gold'?6:3.2);
  if(c.snick>0)c.snick-=dt;
  switch(c.st){
  case 'rustle':h.rus=1;c.hT=.1+.06*Math.abs(Math.sin(c.t*21));c.jx=Math.sin(c.t*61)*.6;if(!c.cast&&Math.random()<dt*26)dirtSpeck(h);if(c.t>=c.dur)enter(c,'pop');break;
  case 'pop':if(c.t>.1&&c.eyes==='wide')c.eyes='open';if(c.t>.15&&c.mouth==='o')c.mouth=KD.mouth;if(c.t>.34)enter(c,'up');break;
  case 'up':if(!c.hold)c.life-=dt;idle(c,KD,dt);if(c.life<=0)escape(c);break;
  case 'laugh':c.hT=1+.045*Math.abs(Math.sin(c.t*15));c.leanT=Math.sin(c.t*15)*.07;c.tiltT=-.14+Math.sin(c.t*15)*.06;
    if(!c.cast&&c.t>.4&&c.t-dt<=.4)popText('HA!',c.topX+c.laughSide*-15*U*c.hole.k,c.topY-1*U,'#ffd050',0,0);if(c.t>.82)enter(c,'duck');break;
  case 'tease':c.leanT=Math.sin(c.t*22)*.1;if(c.t>.34)enter(c,'duck');break;
  case 'duck':if(c.t>.07){c.hT=-.22;c.hw=30;c.hz=.7;}if(c.t>.1&&c.H.x<.02){c.H.x=0;enter(c,'none');}break;
  case 'hit':if(c.t>.22)enter(c,'dizzy');break;
  case 'dizzy':c.hT=.6+.025*Math.sin(c.t*7);c.tiltT=Math.sin(c.t*6.5)*.17;c.leanT=Math.cos(c.t*6.5)*.06;if(c.t>.8)enter(c,'sink');break;
  case 'sink':c.tiltT=Math.sin(c.t*6.5)*.17;c.leanT=0;if(c.t>.2&&c.H.x<.02){c.H.x=0;enter(c,'none');}break;
  case 'clang':if(c.t>.1)c.eyes='open';if(c.t>.42){enter(c,'up');c.mouth='grit';}break;
  case 'khit':if(c.t>.12)c.eyes='open';if(c.t>.32){enter(c,'up');c.mouth='grit';}break;
  }
  /* emergence spring, and everything that rides on its acceleration */
  const aH=spr(c.H,c.hT,c.hw,c.hz,dt),ay=-DEPTH*aH;                     /* rig root acceleration, rig units/s^2 */
  spr(c.SQ,clamp(c.H.v*.032,-.22,.3),24,.3,dt);                           /* stretch with speed, jiggle home */
  const aL=spr(c.LEAN,c.leanT,15,.38,dt),aT=spr(c.TILT,c.tiltT,13,.42,dt);
  sprF(c.HD,0,26,.32,-.05*ay,dt);c.HD.x=clamp(c.HD.x,-3,3);                /* head lags the body (overlap) */
  for(let i=0;i<2;i++){const e=c.EAR[i],s=i?1:-1;                           /* ears: pendulum torque = d x (-a) */
    sprF(e,0,15,.17,-ay*Math.sin(.32+e.x)*.02-s*aL*1.1-s*aT*.7,dt);if(e.x>1.15){e.x=1.15;e.v*=-.3;}else if(e.x<-.8){e.x=-.8;e.v*=-.3;}}
  for(let i=0;i<2;i++){const e=c.WH[i],s=i?1:-1;sprF(e,0,24,.2,-ay*.016-s*aL*.6,dt);e.x=clamp(e.x,-.7,.9);}
  if(c.kind==='king'){c.CRv+=(900-ay*.2)*dt;c.CRy+=c.CRv*dt;if(c.CRy>0){c.CRy=0;if(c.CRv>0)c.CRv=c.CRv>60?-c.CRv*.38:0;}  /* crown: a free body resting on the head */
    spr(c.CRA,0,11,.22,dt);c.CRA.x=clamp(c.CRA.x,-.6,.6);}
  if(c.st!=='rustle'){
    c.lookT-=dt;if(c.lookT<=0)chooseLook(c,KD);
    const ls=Math.min(1,dt*32);c.lookX+=(c.ltx-c.lookX)*ls;c.lookY+=(c.lty-c.lookY)*ls;      /* saccade: fast move, then hold */
    c.blinkT-=dt;if(c.blinkT<=0){c.blink=.13;c.blinkT=Math.random()<.18?.2:rnd(KD.blink[0],KD.blink[1]);}
    if(c.blink>0){c.blink-=dt;const p=1-c.blink/.13;c.lid=p<.45?p/.45:1-(p-.45)/.55;}else c.lid=0;
  }
  if(c.soot>0)c.soot=Math.max(0,c.soot-dt*.35);
  /* analytic face position (the renderer refines it; the AI and worry logic need it without a render) */
  const k=h.k*U*KD.sc*c.scale,sy=1+c.SQ.x;c.headX=h.x+c.jx*k;c.headY=h.y+(1-c.H.x)*DEPTH*k-(c.kind==='bomb'?18:27)*k*sy;
}

/* ---------- 9.8 particles, text pop-ups, flying hard hats ---------- */
const PK_CLOD=0,PK_DUST=1,PK_STAR=2,PK_SPARK=3,PK_COIN=4,PK_SMOKE=5,PK_FIRE=6,PK_RING=7,PK_CONF=8,PK_DROP=9,PK_STEAM=10,PK_GLINT=11;
const PMAX=700,PP=[];for(let i=0;i<PMAX;i++)PP.push({k:0,x:0,y:0,vx:0,vy:0,life:0,max:1,fl:0,s:1,c:0,r:0,vr:0});let NP=0;
function part(k,x,y,vx,vy,life,s,c,fl){if(NP>=PMAX)return null;const p=PP[NP++];p.k=k;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=p.max=life;p.s=s;p.c=c;p.fl=fl;p.r=Math.random()*TAU;p.vr=rnd(-9,9);return p;}
function partTick(dt){
  const gr=430*U;
  for(let i=0;i<NP;i++){const p=PP[i];p.life-=dt;
    if(p.life<=0){PP[i]=PP[NP-1];PP[NP-1]=p;NP--;i--;continue;}
    switch(p.k){
    case PK_CLOD:case PK_COIN:case PK_CONF:case PK_DROP:p.vy+=(p.k===PK_CONF?.25:1)*gr*dt;if(p.k===PK_CONF){p.vx*=.97;p.vx+=Math.sin(p.r*2)*30*U*dt;}
      if(p.y>p.fl&&p.vy>0){p.y=p.fl;p.vy*=-.32;p.vx*=.55;p.vr*=.5;if(Math.abs(p.vy)<18*U)p.vy=0;}break;
    case PK_SPARK:case PK_STAR:p.vy+=gr*.55*dt;p.vx*=.985;break;
    case PK_DUST:case PK_SMOKE:case PK_STEAM:p.vx*=.9;p.vy*=.9;p.vy-=(p.k===PK_DUST?4:22)*U*dt;break;
    case PK_FIRE:p.vx*=.86;p.vy*=.86;p.vy-=30*U*dt;break;
    }
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;
  }
}
const RINGM=flatMat('#ffd080'),SMOKEC=[pack(64,56,66),pack(96,86,94)],FIREC=[[255,210,110],[255,130,30],[200,50,20]];
function drawParts(){
  toRBUF();
  for(let i=0;i<NP;i++){const p=PP[i],f=p.life/p.max,x=p.x,y=p.y;
    switch(p.k){
    case PK_CLOD:{const s=Math.max(1,Math.round(p.s*Math.max(.75,U)));rect(x,y,s,s,p.c);if(s>1)px(x,y,addC(p.c,46));break;}
    case PK_DUST:case PK_SMOKE:case PK_STEAM:disc(x,y,p.s*(1+(1-f)*1.4),p.c,p.k===PK_DUST?f*.75:f*.9);break;
    case PK_STAR:sparkle(x,y,Math.min(1,f*1.8),p.s*.8,p.r);break;
    case PK_SPARK:line(x,y,x-p.vx*.022,y-p.vy*.022,p.c);px(x,y,WHITE);break;
    case PK_COIN:{xReset();const cw=Math.abs(Math.cos(p.r*1.6));fillE(geo(x,y,Math.max(.6,p.s*cw),p.s),MT.crown);break;}
    case PK_FIRE:{const c=f>.6?FIREC[0]:f>.3?FIREC[1]:FIREC[2];glow(x,y,p.s*(.5+f*.8),c,f*1.3);if(f>.5)disc(x,y,p.s*.35*f,pack(c[0],c[1],c[2]),1);break;}
    case PK_RING:{xReset();const r=p.s*(1.15-f);const G=geo(x,y,r,r*.42);if(BAY4[(i*5)&15]<f*1.5)fillE(G,RINGM,null,-9,9,ringK(G,1.2));break;}
    case PK_CONF:if(Math.cos(p.r*3)>-.6)px(x,y,p.c);break;
    case PK_DROP:px(x,y,pack(150,220,255));px(x,y-1,pack(90,170,255));break;
    case PK_GLINT:{const b=Math.sin(f*Math.PI);const c=pack(255*b,250*b,200*b);px(x,y,c);if(b>.5){px(x+1,y,c);px(x-1,y,c);px(x,y+1,c);px(x,y-1,c);}break;}
    }
  }
}
function dirtSpeck(h){const k=h.k*U,a=rnd(0,TAU);part(PK_CLOD,h.x+Math.cos(a)*14*k,h.y+Math.sin(a)*4*k-k,rnd(-30,30)*k,rnd(-95,-45)*k,rnd(.35,.55),Math.random()<.35?2:1,DIRTC[(Math.random()*3)|0],h.y+rnd(1,7)*k);
  if(Math.random()<.3)part(PK_DUST,h.x+rnd(-12,12)*k,h.y-rnd(0,3)*k,rnd(-10,10)*k,rnd(-16,-6)*k,rnd(.3,.45),rnd(2.5,3.5)*k,DUSTC,0);}
function dirtBurst(h,n,dust=3){const k=h.k*U;
  for(let i=0;i<n;i++){const a=rnd(-Math.PI*.95,-Math.PI*.05);part(PK_CLOD,h.x+rnd(-13,13)*k,h.y-2*k,Math.cos(a)*rnd(30,120)*k,Math.sin(a)*rnd(70,160)*k,rnd(.5,.9),Math.random()<.45?2:1,DIRTC[(Math.random()*3)|0],h.y+rnd(-2,9)*k);}
  for(let i=0;i<dust;i++){const sd=i&1?1:-1;part(PK_DUST,h.x+sd*rnd(12,20)*k,h.y-rnd(0,3)*k,sd*rnd(8,22)*k,rnd(-22,-8)*k,rnd(.35,.55),rnd(3,5)*k,DUSTC,0);}}
function starBurst(x,y,n,k){for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(60,130)*k;part(PK_STAR,x,y,Math.cos(a)*v,Math.sin(a)*v-50*k,rnd(.4,.7),k,0,0);}}
function sweat(c){const k=c.hole.k*U;part(PK_DROP,c.headX+(Math.random()<.5?-1:1)*12*k,c.headY-10*k,rnd(-10,10)*k,-20*k,.5,1,0,c.headY+6*k);}
function steam(c){const k=c.hole.k*U;for(const s of [-1,1])part(PK_STEAM,c.headX+s*10*k,c.headY-12*k,s*25*k,-30*k,.45,2.4*k,pack(230,230,240),0);}
function glint(c){const k=c.hole.k*U;part(PK_GLINT,c.headX+rnd(-16,16)*k,c.headY+rnd(-16,22)*k,0,0,rnd(.25,.45),1,0,0);}
/* text pop-ups: rise, settle, blink out. big: 1 = comic hit word, 2 = banner-sized */
const POPS=[];for(let i=0;i<28;i++)POPS.push({on:false,s:'',x:0,y:0,vy:0,t:0,max:1,col:'#fff',big:0,sc:1});
function popText(s,x,y,col,sc,big){if(big)for(const q of POPS)if(q.on&&q.big===big)q.on=false;   /* one comic word / banner line at a time */
  let p=null;for(const q of POPS)if(!q.on){p=q;break;}if(!p){p=POPS[0];for(const q of POPS)if(q.t>p.t)p=q;}
  p.on=true;p.s=s;p.x=x;p.y=Math.max(y,(big?30:26)*U);p.vy=-(big?34:26)*U;p.t=0;p.max=big?.75:.9;p.col=col;p.big=big;p.sc=sc;}
function popTick(dt){for(const p of POPS)if(p.on){p.t+=dt;p.y=Math.max(p.y+p.vy*dt,(p.big?20:18)*U);p.vy*=Math.pow(.02,dt);if(p.t>p.max)p.on=false;}}
const DEB=[];
function helmetFly(c){const k=c.hole.k*U*KIND.hard.sc,s=Math.random()<.5?-1:1;DEB.push({x:c.headX,y:c.headY-8*k,vx:rnd(45,90)*s*k,vy:-rnd(150,190)*k,r:0,vr:s*rnd(9,15),fl:c.hole.y+rnd(6,12)*k,life:2.2,k,b:0});}
function debTick(dt){for(let i=DEB.length-1;i>=0;i--){const d=DEB[i];d.vy+=520*d.k*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.r+=d.vr*dt;
  if(d.y>d.fl&&d.vy>0){d.y=d.fl;if(d.vy>60*d.k&&d.b<3){SFX.clink();d.b++;}d.vy*=-.42;d.vx*=.7;d.vr*=.55;if(Math.abs(d.vy)<20*d.k)d.vy=0;}
  d.life-=dt;if(d.life<=0)DEB.splice(i,1);}}
function drawDebris(){for(const d of DEB){if(d.life<.5&&((d.life*16)|0)%2)continue;drawHelmetAt(d.x,d.y,d.r,d.k);compose(null,0,0,0,0,0);}}

/* ---------- 9.9 the mallet: eased wind-down swing about the grip, arc smear, padded squash ---------- */
const UPA=.95,NUMPAD=[0,6,7,8,3,4,5,0,1,2],DIG=[7,8,9,4,5,6,1,2,3];
const ML={x:128,y:90,inX:128,inY:90,mode:'ptr',cell:4,PX:SP(0),PY:SP(0),TH:SP(UPA),thPrev:UPA,LEAN:SP(0),SQ:SP(0),ph:'hover',t:0,th0:UPA,dur:4,
  aimX:0,aimY:0,aimCell:-1,qd:false,qCell:-1,qX:0,qY:0,stun:0,soot:0,lx:0,vis:0,hx:0,hy:0,sc:1,burst:0,bx:0,by:0,swings:0,hitC:false,smA:0};
const malletSc=()=>U*(.84+.26*clamp(ML.y/H,0,1));
function malletXf(){const s=ML.sc,rf=clamp(ML.TH.x/UPA,0,1.2);xReset();xT(ML.x+(30+4*rf)*s,ML.y+(-9.6-6*rf)*s);xS(s,s);xR(ML.TH.x+ML.LEAN.x);}
function swing(cell,x,y){
  if(ML.stun>0){if(ML.stun<.55)SFX.fizzle();return;}
  if(ML.ph==='down'||S.stop>0){ML.qd=true;ML.qCell=cell;ML.qX=x;ML.qY=y;return;}
  ML.aimCell=cell;ML.aimX=x;ML.aimY=y;ML.ph='down';ML.t=0;ML.swings++;
  ML.th0=Math.max(ML.TH.x,.6);ML.dur=ML.TH.x>.55?4:3;ML.TH.x=ML.th0;ML.TH.v=0;ML.thPrev=ML.th0;
  SFX.swing();
}
function cellX(i){return HOLES[i].x;}
function cellY(i){const h=HOLES[i];return h.y-22*h.k*U;}
function toCell(i){if(ML.mode!=='cell'){ML.PX.x=ML.x;ML.PY.x=ML.y;ML.PX.v=ML.PY.v=0;}ML.mode='cell';ML.cell=i;ML.vis=1;}
function nearestCell(x,y){let b=4,bd=1e9;for(const h of HOLES){const d=Math.hypot(x-h.x,(y-cellY(h.idx))*1.4);if(d<bd){bd=d;b=h.idx;}}return b;}
function malletTick(dt){
  ML.thPrev=ML.TH.x;if(ML.stun>0)ML.stun-=dt;if(ML.soot>0)ML.soot=Math.max(0,ML.soot-dt*.6);
  if(ML.mode==='cell'){spr(ML.PX,cellX(ML.cell),40,1,dt);spr(ML.PY,cellY(ML.cell),40,1,dt);ML.x=ML.PX.x;ML.y=ML.PY.x;}
  else{ML.x=ML.inX;ML.y=ML.inY;}
  const vx=(ML.x-ML.lx)/dt;ML.lx=ML.x;spr(ML.LEAN,clamp(-vx/U*.0014,-.32,.32),17,.45,dt);   /* the head trails the motion */
  if(ML.ph==='down'){ML.t++;const f=Math.min(1,ML.t/ML.dur);ML.TH.x=ML.th0*(1-f*f*f);ML.TH.v=0;          /* accelerating strike (cubic ease-in) */
    if(ML.t>=ML.dur){ML.TH.x=0;if(ML.mode==='cell'){ML.x=ML.PX.x=cellX(ML.cell);ML.y=ML.PY.x=cellY(ML.cell);}impact();ML.ph='hit';ML.t=0;}}
  else if(ML.ph==='hit'){ML.t++;if(ML.t>=(ML.hitC?1:3)){ML.ph='hover';ML.TH.v=ML.hitC?16:9;}}   /* recoil the moment the world resumes */
  else spr(ML.TH,UPA+.04*Math.sin(S.rt*3.1),15,.42,dt);                                       /* recoil with overshoot */
  if(ML.qd&&ML.ph!=='down'&&S.stop<=0&&(ML.ph!=='hit'||ML.t>=1)){ML.qd=false;swing(ML.qCell,ML.qX,ML.qY);}
  spr(ML.SQ,0,32,.22,dt);if(ML.burst>0)ML.burst--;
  {const s=malletSc(),rf=clamp(ML.TH.x/UPA,0,1.2),a=ML.TH.x+ML.LEAN.x;                       /* head position for the critters to watch */
   ML.hx=ML.x+(30+4*rf)*s-30*s*Math.cos(a);ML.hy=ML.y+(-9.6-6*rf)*s-30*s*Math.sin(a);}
}
function drawMallet(sil){
  if(!ML.vis)return;ML.sc=malletSc();
  if(!sil)drawSmear();
  newLayer();malletXf();
  fillE(geo(-15.5,0,15.5,2.3),MT.wood,null,-9,9,0,false,2);
  fillE(geo(-2.6,0,5.4,2.75),MT.grip,null,-9,9,0,false,2);
  for(let k=0;k<4;k++)lineL(-7.2+k*2.2,-2.3,-6+k*2.2,2.3,pack(100,94,146));
  fillE(geo(2.6,0,2.6,3.1),MT.wood);
  xPush();const q=ML.SQ.x;xT(-30,9.7*q);xS(1+q*.6,1-q);           /* padded head squashes, anchored at its face */
  fillE(geo(0,0,7.7,9.7),MT.mallet,null,-9,9,0,false,1);
  fillE(geo(0,-5.4,7.8,1.15),MT.band,null,-9,9,0,false,1);fillE(geo(0,5.4,7.8,1.15),MT.band,null,-9,9,0,false,1);
  fillE(geo(0,-9.7,7.7,2.5),MT.mcap);
  ML.hx=wx(0,0);ML.hy=wy(0,0);xPop();
  compose(null,sil,SOOTC,ML.soot*.7,0,0);
}
const SOOTC=pack(30,24,26),REDC=pack(220,20,30);
/* smear frame: the swept annulus between last tick's angle and this one, dithered out toward the old angle */
function drawSmear(sil){
  const a0=ML.TH.x+ML.LEAN.x,a1=(sil?ML.smA:ML.thPrev)+ML.LEAN.x,da=a1-a0;
  if(da<.07||(ML.ph!=='down'&&ML.ph!=='hit'))return;
  const s=ML.sc,rf=clamp(ML.TH.x/UPA,0,1.2),gx=ML.x+(30+4*rf)*s,gy=ML.y+(-9.6-6*rf)*s;
  const rI=(30-7.7)*s,rO=Math.hypot(30+7.7,9.7)*s,rL=rO+4.2*s,hw=.33,span=da+hw,base=Math.PI+a0;
  const x0=Math.max(0,Math.floor(gx-rL)),x1=Math.min(W-1,Math.ceil(gx+rL)),y0=Math.max(0,Math.floor(gy-rL)),y1=Math.min(H-1,Math.ceil(gy+rL));
  const c1=sil?WHITE:pack(236,52,52),c2=sil?WHITE:pack(255,150,140),cw=pack(255,250,240),s1=rO+1.5*s,s2=rO+3.3*s;
  for(let y=y0;y<=y1;y++){const bi=(y&3)<<2;for(let x=x0;x<=x1;x++){
    const dx=x+.5-gx,dy=y+.5-gy,r=Math.sqrt(dx*dx+dy*dy);if(r<rI||r>rL)continue;
    let rel=Math.atan2(dy,dx)-base;rel-=TAU*Math.round(rel/TAU);if(rel<-hw||rel>span)continue;
    const al=1-Math.max(0,rel-hw*.6)/(da+hw*.4);
    if(r>rO){if((Math.abs(r-s1)<.6||Math.abs(r-s2)<.6)&&rel>da*.15&&BAY4[bi|(x&3)]<al*.9)RBUF[y*W+x]=cw;continue;}
    if(BAY4[bi|(x&3)]>al*1.15)continue;RBUF[y*W+x]=rel<hw+da*.45?c1:c2;}}
}
function drawMalletShadow(){if(!ML.vis)return;const s=ML.sc||U,rf=clamp(ML.TH.x/UPA,0,1),r=(3.5+7*rf)*s;toRBUF();xReset();fillE(geo(ML.x+2*s,ML.y+3*s,r*1.25,r*.5),rf>.55?MT.mshadowL:MT.mshadowD);}
function drawBurst(){if(ML.burst<=0)return;const s=ML.sc,age=5-ML.burst,c=age<2?WHITE:pack(255,230,120);
  for(let i=0;i<8;i++){const a=i*TAU/8+.2,r0=(8+age*2.2)*s,r1=(13+age*2.6)*s;line(ML.bx+Math.cos(a)*r0,ML.by+Math.sin(a)*r0*.8,ML.bx+Math.cos(a)*r1,ML.by+Math.sin(a)*r1*.8,c);}}

/* ---------- 9.10 hits, misses, combos, the bomb ---------- */
const multOf=n=>Math.min(4,1+Math.floor(n/8));             /* x2 at 8 in a row, x3 at 16, x4 at 24 */
function findTarget(x,y,cell){
  if(cell>=0){const c=HOLES[cell].c;return hittable(c)?c:null;}
  let best=null,bd=1.35;
  for(const h of HOLES){const c=h.c;if(!hittable(c))continue;const k=h.k*U*KIND[c.kind].sc;
    const cy=h.y+(1-c.H.x)*DEPTH*k-22*k*(1+c.SQ.x),dx=(x-h.x)/(20*k),dy=(y-cy)/(26*k),d=dx*dx+dy*dy;if(d<bd){bd=d;best=c;}}
  return best;
}
function impact(){
  ML.burst=5;ML.bx=ML.x;ML.by=ML.y;ML.smA=ML.thPrev;ML.thPrev=0;     /* the smear lives one frame; the hold is clean */
  const c=findTarget(ML.aimX,ML.aimY,ML.aimCell);
  ML.hitC=!!c;
  if(c){strike(c);ML.SQ.x=c.kind==='bomb'?.24:.34;
    if(c.st!=='none'){const k=c.hole.k*U*KIND[c.kind].sc;ML.y=ML.PY.x=c.hole.y+(1-c.H.x)*DEPTH*k-(c.kind==='bomb'?30:36)*k*(1+c.SQ.x)-1;ML.by=ML.y;}}  /* follow the head down into the squash */
  else{whiff();ML.SQ.x=.16;}
}
const HITWORDS=['BONK!','WHAM!','POW!','BOP!','THWACK!'];
function addHit(c,base,word){
  const live=S.mode==='play'||S.demo;if(!live)return;
  S.combo++;S.comboT=2.6;if(S.combo>S.best)S.best=S.combo;S.hits++;
  const pts=base*multOf(S.combo)*(S.frenzy?2:1);S.score+=pts;
  const col=c.kind==='gold'?'#ffe060':c.kind==='king'?'#e0a0ff':c.kind==='hard'?'#a0e0ff':'#ffffff';
  popText('+'+pts,c.topX+(S.combo&1?16:-16)*U*c.hole.k,c.topY+4*U,col,0,0);if(word)popText(word,ML.x-14*U,ML.y-34*U*c.hole.k,c.kind==='gold'?GR.volt:GR.pink,1,1);
  SFX.bonk(S.combo);if(S.combo%8===0){SFX.combo(S.combo);S.lflash=.45;popText('COMBO '+S.combo,W/2,H*.42,GR.cyan,1,2);}
}
function strike(c){
  const KD=KIND[c.kind],h=c.hole,k=h.k*U*KD.sc;HIT=c;
  if(c.kind==='bomb'){explode(c);return;}
  for(const o of HOLES){const n=o.c;if(n!==c&&n.st==='up'&&Math.abs(o.r-h.r)<=1&&Math.abs(o.col-h.col)<=1){n.blink=.13;n.SQ.v-=3;n.worry=1;}}   /* neighbours flinch */
  if(c.kind==='hard'&&c.helmet){                                                  /* first hit: the hard hat takes it */
    c.helmet=false;enter(c,'clang');helmetFly(c);addHit(c,5,'CLANG!');
    for(let i=0;i<12;i++){const a=rnd(-Math.PI*.95,-Math.PI*.05),v=rnd(80,200)*k;part(PK_SPARK,c.headX+rnd(-6,6)*k,c.headY-10*k,Math.cos(a)*v,Math.sin(a)*v,rnd(.2,.4),1,pack(255,rnd(200,250),120),1e9);}
    S.stop=4;S.impF=1;S.shake=Math.max(S.shake,.2);SFX.clang();return;}
  if(c.kind==='king'){c.hp--;starBurst(c.headX,c.headY-6*k,5,k);
    if(c.hp>0){enter(c,'khit');addHit(c,KD.pts,HITWORDS[(Math.random()*HITWORDS.length)|0]);S.stop=5;S.impF=1;S.shake=Math.max(S.shake,.26);return;}
    enter(c,'hit');c.hold=false;addHit(c,KD.pts,'KO!');if(S.mode==='play'||S.demo){const b=120*(S.frenzy?2:1);S.score+=b;S.kos++;popText('ROYAL KO +'+b,W/2,H*.42,GR.volt,1,2);}
    for(let i=0;i<26;i++)part(PK_CONF,c.headX+rnd(-10,10)*k,c.headY-10*k,rnd(-120,120)*k,rnd(-220,-80)*k,rnd(.9,1.5),1,pack(...BULB[i%5]),h.y+rnd(4,14)*k);
    S.stop=12;S.impF=2;S.shake=Math.max(S.shake,.5);SFX.ko();return;}
  enter(c,'hit');
  const gold=c.kind==='gold';addHit(c,KD.pts,HITWORDS[(Math.random()*HITWORDS.length)|0]);
  starBurst(c.headX,c.headY-8*k,gold?7:4,k);dirtBurst(h,5,0);
  if(gold){for(let i=0;i<9;i++)part(PK_COIN,c.headX,c.headY-6*k,rnd(-90,90)*k,rnd(-210,-120)*k,rnd(.8,1.2),2.4*k,0,h.y+rnd(2,12)*k);SFX.gold();}
  S.stop=gold?7:5;S.impF=gold?2:1;S.shake=Math.max(S.shake,gold?.3:.2);
}
function whiff(){
  let gx=ML.aimX,gy=ML.aimY;if(ML.aimCell>=0){const h=HOLES[ML.aimCell];gx=h.x;gy=h.y-3*h.k*U;}
  for(let i=0;i<3;i++)part(PK_DUST,gx+rnd(-5,5)*U,gy+rnd(-1,2)*U,rnd(-30,30)*U,rnd(-18,-4)*U,rnd(.3,.5),rnd(2.5,4)*U,DUSTC,0);
  for(let i=0;i<3;i++)part(PK_CLOD,gx,gy,rnd(-50,50)*U,rnd(-90,-40)*U,rnd(.3,.5),1,DIRTC[i],gy+rnd(2,5)*U);
  SFX.whiff();
  if(S.mode==='play'||S.demo){if(S.combo>=5)popText('COMBO LOST',W/2,H*.42,'#ff8a8a',0,2);S.combo=0;S.comboT=0;S.whiffs++;}
  let n=0;for(const h of HOLES){const c=h.c;if(c.st==='up'&&c.kind!=='king'){c.snick=.6;n++;}}   /* everyone up has a snicker at you */
  if(n)SFX.snicker();
}
function explode(c){
  const h=c.hole,k=h.k*U,x=h.x,y=h.y-15*k;
  enter(c,'none');c.cool=1.3;h.scorch=4;
  if(S.mode==='play'||S.demo){S.bombs++;S.score=Math.max(0,S.score+KIND.bomb.pts);S.combo=0;S.comboT=0;popText(String(KIND.bomb.pts),x,y-12*k,'#ff5a5a',0,0);}
  popText('BOOM!',x,y-24*k,GR.red,1,1);
  for(let i=0;i<18;i++){const a=rnd(0,TAU),v=rnd(20,110)*k;part(PK_FIRE,x+rnd(-4,4)*k,y+rnd(-4,4)*k,Math.cos(a)*v,Math.sin(a)*v*.7-30*k,rnd(.35,.7),rnd(6,11)*k,0,0);}
  for(let i=0;i<12;i++){const a=rnd(0,TAU),v=rnd(15,60)*k;part(PK_SMOKE,x+rnd(-6,6)*k,y+rnd(-6,4)*k,Math.cos(a)*v,Math.sin(a)*v*.6-20*k,rnd(.9,1.6),rnd(4,7)*k,SMOKEC[i&1],0);}
  for(let i=0;i<16;i++){const a=rnd(-Math.PI,0);part(PK_CLOD,x+rnd(-8,8)*k,h.y-2*k,Math.cos(a)*rnd(60,180)*k,Math.sin(a)*rnd(90,220)*k,rnd(.6,1),2,DIRTC[(Math.random()*3)|0],h.y+rnd(-2,12)*k);}
  for(let i=0;i<14;i++){const a=rnd(0,TAU),v=rnd(120,260)*k;part(PK_SPARK,x,y,Math.cos(a)*v,Math.sin(a)*v,rnd(.2,.45),1,pack(255,200,90),1e9);}
  part(PK_RING,x,h.y,0,0,.4,46*k,0,0);
  S.shake=Math.max(S.shake,.75);S.flash=.55;S.stop=3;S.impF=0;ML.stun=.75;ML.soot=1;
  for(const o of HOLES){const n=o.c;if(o!==h&&Math.abs(o.r-h.r)<=1&&Math.abs(o.col-h.col)<=1&&hittable(n)&&n.kind!=='king'&&n.kind!=='bomb'){n.soot=1;if(n.helmet){helmetFly(n);n.helmet=false;}enter(n,'hit');}}  /* the blast bonks the neighbours */
  SFX.boom(1.5);
}

/* ---------- 9.11 the spawner: pacing over 45 seconds, then the king's frenzy ---------- */
function pickKind(){const p=phaseP(),r=Math.random();
  if(S.frenzy)return r<.16?'gold':r<.3?'bomb':r<.4?'hard':'mole';
  const pg=.05+.06*p,pb=p<.15?0:.07+.12*p,ph=.07+.14*p;
  return r<pg?'gold':r<pg+pb?'bomb':r<pg+pb+ph?'hard':'mole';}
function freeHole(pref){
  if(pref>=0&&HOLES[pref].c.st==='none'&&HOLES[pref].c.cool<=0)return HOLES[pref];
  let n=0,ph=null;for(const h of HOLES){if(h.c.st!=='none'||h.c.cool>0||h.idx===S.lastHole)continue;n++;if(Math.random()*n<1)ph=h;}return ph;}
function kingUp(){for(const h of HOLES)if(h.c.kind==='king'&&h.c.st!=='none')return true;return false;}
function spawner(dt){
  if(S.frenzy){S.kingT-=dt;if(S.kingT<=0&&!kingUp()){const h=freeHole(S.kingN===0?4:-1);if(h){spawnCritter(h,'king');S.kingN++;S.kingT=99;if(S.kingN===1)popText('THE KING!',W/2,H*.3,GR.violet,1,2);}}}
  S.spawnT-=dt;if(S.spawnT>0)return;
  let act=0;for(const h of HOLES)if(h.c.st!=='none')act++;
  const p=phaseP(),maxA=S.frenzy?6:Math.round(lerp(2,4.4,p));
  if(act>=maxA){S.spawnT=.08;return;}
  const h=freeHole(-1);if(!h){S.spawnT=.1;return;}
  spawnCritter(h,pickKind());S.lastHole=h.idx;
  S.spawnT=(S.frenzy?.36:lerp(1.0,.5,p))*rnd(.7,1.25);
}

/* ---------- 9.12 the autopilot: plays attract mode (and the soak test) like a person would ----------
   picks the most valuable reachable target, reacts after a human delay, moves with a critically
   damped "hand", sometimes misjudges (so the critters get to laugh) and, in attract, now and then
   cannot resist a bomb so the explosion gets shown. keys = drive the 1-9 keyboard path instead. */
const AI={x:128,y:90,vx:0,vy:0,tgt:-1,react:0,cool:0,ox:0,oy:0,w:13,err:.07,dare:.14,skill:1,keys:false,dareC:null,idleT:0,ix:.5,iy:.6};
function aiReset(){AI.x=W/2;AI.y=H*.62;AI.vx=AI.vy=0;AI.tgt=-1;AI.cool=.4;AI.dareC=null;}
const PRI={mole:1,hard:1.35,gold:2.6,bomb:0,king:3.2};
function aiTick(dt){
  if(AI.cool>0)AI.cool-=dt;
  let c=AI.tgt>=0?HOLES[AI.tgt].c:null;
  if(c&&!(hittable(c)&&(c.kind!=='bomb'||AI.dareC===c))){AI.tgt=-1;c=null;}
  if(!c){let best=-1e9;
    for(const h of HOLES){const o=h.c;if(!hittable(o))continue;
      if(o.kind==='bomb'){if(!o.seen){o.seen=1;if(Math.random()<AI.dare)AI.dareC=o;}if(AI.dareC!==o)continue;}
      const d=Math.hypot(h.x-AI.x,h.y-AI.y)/W,sc=(PRI[o.kind]||1)-d*2.2-(o.st==='duck'?1.2:0)+(o.kind==='bomb'?1:0);if(sc>best){best=sc;AI.tgt=h.idx;}}
    if(AI.tgt>=0){c=HOLES[AI.tgt].c;AI.react=rnd(.11,.24)/AI.skill;AI.ox=rnd(-3,3)*U;AI.oy=rnd(-3,3)*U;if(Math.random()<AI.err)AI.ox+=(Math.random()<.5?-1:1)*rnd(23,30)*U*HOLES[AI.tgt].k;}}
  let tx,ty;
  if(c){tx=c.headX+AI.ox;ty=c.headY+4*U*c.hole.k+AI.oy;}
  else{let rh=null;for(const h of HOLES)if(h.c.st==='rustle'&&!h.c.cast){rh=h;break;}
    if(rh){tx=rh.x;ty=rh.y-16*U*rh.k;}else{AI.idleT-=dt;if(AI.idleT<=0){AI.idleT=rnd(.6,1.4);AI.ix=rnd(.3,.7);AI.iy=rnd(.45,.75);}tx=AI.ix*W;ty=AI.iy*H;}}
  const w=AI.w*Math.sqrt(AI.skill);AI.vx+=(w*w*(tx-AI.x)-2*.9*w*AI.vx)*dt;AI.vy+=(w*w*(ty-AI.y)-2*.9*w*AI.vy)*dt;AI.x+=AI.vx*dt;AI.y+=AI.vy*dt;
  AI.react-=dt;
  if(AI.keys){if(c&&AI.react<=0&&AI.cool<=0){LATCH.add((AI.tgt&1?'Numpad':'Digit')+DIG[AI.tgt]);AI.cool=rnd(.1,.2)/AI.skill;if(c.kind!=='hard'&&c.kind!=='king')AI.tgt=-1;}return;}
  ML.inX=AI.x;ML.inY=AI.y;ML.mode='ptr';ML.vis=1;
  if(c&&AI.react<=0&&AI.cool<=0&&Math.hypot(tx-AI.x,ty-AI.y)<6*U){swing(-1,AI.x,AI.y);AI.cool=rnd(.1,.2)/AI.skill;if(c.kind!=='hard'&&c.kind!=='king')AI.tgt=-1;}
}
