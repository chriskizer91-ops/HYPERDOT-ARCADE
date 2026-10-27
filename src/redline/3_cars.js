/* =====================================================================================
   9. CARS: one driving model for you and the rivals
   Position along the road (z, wrapped; dist, not), lateral offset x (road edge = 1), speed v.
   Grip: a corner asks for sideways grip in proportion to speed squared times its curve, a little
   less if you are on the racing line. Within the tyres' limit the car only drifts outward as far as
   the steering assist leaves it to; past the limit it slides wide and scrubs speed. Nothing ends in
   a crash: walls bounce you back, a big hit spins you round and the car recovers on its own.
   ===================================================================================== */
const ACC=VTOP*.34,COAST=VTOP*.06,BRK=VTOP*BRAKEA*1.18;
const STEER=1.55,PUSH=1.0,OVERK=1.9,SCRUB=.55,LATK=7.5,CARW=.32,CARL=2.2;      /* a car is about 2.2 segments (3 m of contact patch to bumper) long */
const ASSISTS=[{name:'FULL',cancel:.7,lift:1,keep:1,line:1},{name:'LIGHT',cancel:.4,lift:0,keep:0,line:1},{name:'OFF',cancel:0,lift:0,keep:0,line:0}];
/* the rivals: skill is the share of the ideal speed they carry, aggression how hard they defend and
   dive down the inside, consistency how rarely they overcook a corner */
const DRIVERS=[
  {name:'VEX',  num:7, col:'#3a7bff',col2:'#ffffff',skill:.985,aggr:.8,cons:.9, style:'LATE BRAKER'},
  {name:'NOVA', num:21,col:'#ffd23f',col2:'#1a1a1a',skill:.975,aggr:.45,cons:.97,style:'SMOOTH'},
  {name:'KAITO',num:3, col:'#f2f2f2',col2:'#ff2a4a',skill:.97, aggr:.6,cons:.92,style:'TECHNICIAN'},
  {name:'SABLE',num:66,col:'#1a1a22',col2:'#ff8a2e',skill:.962,aggr:.95,cons:.84,style:'BLOCKER'},
  {name:'MIRA', num:12,col:'#c45cff',col2:'#2fe6ff',skill:.955,aggr:.35,cons:.95,style:'CONSISTENT'},
  {name:'BRUNO',num:44,col:'#2ee04a',col2:'#0e5a26',skill:.945,aggr:.7,cons:.86,style:'WILD'},
  {name:'ZERO', num:0, col:'#ff5ad8',col2:'#ffffff',skill:.935,aggr:.5,cons:.9, style:'ROOKIE'}
];
/* the colour that tags each driver on maps and tables: the livery, or its trim if the livery is too dark to read */
for(const d of DRIVERS){const c=hexRGB(d.col);d.tag=(c[0]*.3+c[1]*.59+c[2]*.11)<60?d.col2:d.col;}
let CARS=[],P=null;
function mkCar(o){return Object.assign({z:0,dist:0,x:0,vx:0,v:0,steer:0,thr:0,brk:0,nitro:.35,nitroOn:false,drift:false,driftT:0,boostT:0,slide:0,spinT:0,spinA:0,
  offroad:false,kerbT:0,wallT:0,draft:0,draftT:0,gear:1,rpm:0,lap:0,lapT0:0,lastLap:0,bestLap:0,finished:false,finishT:0,pos:0,hitT:0,sparkT:0,top:1,acc:1,
  laps:[],passes:0,lost:0,player:false,ai:null,brakeLit:false,yaw:0,seg:null,prevSeg:null},o);}
/* ---------- one physics step for one car. u = {steer -1..1, thr 0..1, brk 0..1, nitro bool} ---------- */
function carStep(c,u,dt){
  const s=segAt(c.z),sp=c.v/VTOP,A=c.player?ASSISTS[S.assist]:{cancel:.78,lift:0,keep:0};
  c.seg=s;
  /* spin: hands off, the car rotates and slows, then the driver catches it */
  if(c.spinT>0){c.spinT-=dt;c.spinA+=dt*c.spinDir*9*Math.min(1,c.spinT+.2);u={steer:0,thr:0,brk:.4,nitro:false};if(c.spinT<=0){c.spinA=0;if(c.player)popup('RECOVERED','#9ff1ff');}}
  /* nitro */
  c.nitroOn=u.nitro&&c.nitro>.02&&sp>.2&&c.spinT<=0;
  if(c.nitroOn){c.nitro=Math.max(0,c.nitro-dt*.28);}
  /* the power slide: brake while turning at speed; carries speed through and charges nitro */
  const wantDrift=u.brk>.5&&Math.abs(u.steer)>.35&&sp>.42&&!c.offroad&&c.spinT<=0;
  if(wantDrift&&!c.drift){c.drift=true;c.driftT=0;c.driftDir=Math.sign(u.steer);}
  if(c.drift&&(u.brk<.5||sp<.34||c.offroad||c.spinT>0)){c.drift=false;if(c.driftT>.9){c.boostT=Math.min(1.4,.4+c.driftT*.35);if(c.player){popup('DRIFT BOOST','#ff5ad8','+'+fmt(c.driftT*400));S.score+=c.driftT*400;SFX.boost();}}}
  if(c.drift){c.driftT+=dt;c.nitro=Math.min(1,c.nitro+dt*.15);}
  c.boostT=Math.max(0,c.boostT-dt);
  /* grip demand on this corner, and what the tyres can give */
  const onLine=1-Math.min(1,Math.abs(c.x-s.line)/.85);
  const demand=sp*sp*s.curve*(1-LINEB*onLine)/GRIPK;
  const cap=TR.grip*(c.offroad?.7:1)*(c.drift?1.22:1)*(S.wet?.94:1),ad=Math.abs(demand);
  const within=Math.min(ad,cap),over=Math.max(0,ad-cap);
  c.slide=lerp(c.slide,over/cap,Math.min(1,dt*8));
  /* traction assist: lift off when the corner asks more than the tyres have */
  let thr=u.thr;if(A.lift&&over>.06&&!c.drift)thr=Math.min(thr,.35);
  /* longitudinal: power that fades toward the (drafted, boosted, grass-limited) top speed, brakes, coasting */
  const vt=VTOP*c.top*(1+.075*c.draft+(c.nitroOn?.13:0)+(c.boostT>0?.05:0))*(c.offroad?.5:1)*(S.wet?.985:1);
  let a=thr>0?ACC*c.acc*thr*Math.max(0,1-Math.pow(c.v/vt,1.7)):-COAST;
  if(c.nitroOn&&c.v<vt)a+=ACC*.95;if(c.boostT>0&&c.v<vt)a+=ACC*.5;
  a-=BRK*u.brk*(c.drift?.2:1);
  if(c.v>vt)a=Math.min(a,-(c.v-vt)*1.4-VTOP*.05);
  a-=over*SCRUB*VTOP*(c.drift?.45:1);
  c.v=Math.max(0,c.v+a*dt);c.thr=thr;c.brk=u.brk;c.brakeLit=u.brk>.1;
  /* lateral: what the corner pushes you outward, what the wheel gives back */
  const push=Math.sign(demand)*(within*PUSH*(1-A.cancel)*(c.drift?.55:1)+over*OVERK);
  const auth=STEER*(.36+.64*Math.min(1,sp*1.6))*(c.offroad?.8:1)*(c.drift?1.15:1)*(c.spinT>0?0:1);
  let tv=u.steer*auth-push;
  if(A.keep&&Math.abs(u.steer)<.2&&Math.abs(c.x)>.84&&Math.sign(c.x)===Math.sign(c.vx||c.x))tv-=Math.sign(c.x)*.9*Math.min(1,(Math.abs(c.x)-.84)/.2);   /* lane keeping, full assist only */
  c.vx+=(tv-c.vx)*Math.min(1,dt*LATK);
  c.x+=c.vx*dt*(sp>.02?1:0);
  c.yaw=lerp(c.yaw,(c.drift?c.driftDir*.55:0)+u.steer*.12+clamp(over,0,.6)*-Math.sign(demand)*.6,Math.min(1,dt*6));
  /* road edges: kerbs rumble, grass slows, walls bounce */
  const ax=Math.abs(c.x);c.offroad=ax>(s.kerb?1.14:1.04);c.onKerb=!c.offroad&&ax>.98&&s.kerb;
  const WX=s.tun&&TR.walls!=='tunnel'?1.32:TR.wallX;
  if(ax>WX){const out=c.vx*Math.sign(c.x);c.x=Math.sign(c.x)*WX;
    if(out>0){const imp=out;c.vx=-Math.sign(c.x)*Math.max(.25,imp*.35);c.v*=1-Math.min(.22,imp*.1);c.wallT=.25;
      if(c.player){S.shake=Math.max(S.shake,Math.min(.6,imp*.3));SFX.wall(imp);if(imp>.4)sparks(c.x>0?1:-1,imp);}
      if(sp>.45&&c.spinT<=0&&imp>(c.player?[99,2.4,2.0][S.assist]:1.7)){spin(c,c.x>0?-1:1);}      /* full assist never spins you */}}
  c.wallT=Math.max(0,c.wallT-dt);
  /* move */
  c.prevSeg=s;c.z=wrapZ(c.z+c.v*dt);c.dist+=c.v*dt;
  gearbox(c,thr,dt);
}
/* ---------- the gearbox: seven close ratios, seamless upshifts with an ignition cut, blipped
   downshifts on the brakes. It only shapes the engine note and the tach; c.rpm is a share of redline. ---------- */
const VG=[.27,.40,.53,.66,.80,.96,1.2];       /* share of top speed each gear reaches at redline */
function gearbox(c,thr,dt){
  if(!c.eng)c.eng=engineFor(c);
  const pct=c.v/VTOP,iN=c.eng.idle/c.eng.redline;let g=c.gear||1;
  c.cutT=Math.max(0,(c.cutT||0)-dt);c.blipT=Math.max(0,(c.blipT||0)-dt);c.shiftCd=Math.max(0,(c.shiftCd||0)-dt);
  if(pct/VG[g-1]>.965&&g<7&&c.shiftCd<=0&&thr>.2){g++;c.cutT=c.player?.045:.055;c.shiftCd=.22;c.evShift=1;}
  else if(g>1&&pct/VG[g-2]<.9&&c.shiftCd<=0){g--;c.blipT=thr<.3?.13:.07;c.shiftCd=.15;c.evShift=-1;}
  c.gear=g;
  const road=pct/VG[g-1];
  let tgt=road*(1+(c.drift?.1:0)+Math.min(.08,c.slide*.2)+(c.offroad&&thr>.5?.04:0));
  if(g===1&&thr>.3)tgt=Math.max(tgt,.62*(1-clamp(pct/.2,0,1))+road);      /* the launch: clutch slip holds the revs up */
  if(c.blipT>0)tgt=Math.max(tgt,road+.08);
  c.lim=road>1.005&&thr>.3;if(c.lim)c.limT=(c.limT||0)+dt;
  tgt=Math.max(iN,Math.min(tgt,1));
  const k=tgt<c.rpm?(c.cutT>0?32:9):(c.blipT>0?26:12);
  c.rpm+=(tgt-c.rpm)*Math.min(1,dt*k);
  const lim=c.lim&&((c.limT*26)|0)%2===0;
  c.load=c.cutT>0||lim||c.spinT>0?0:c.blipT>0?.8:c.nitroOn||c.boostT>0?1:c.brk>.1?0:thr;
  c.limCut=lim;
}
function spin(c,dir){c.spinT=1.0;c.spinDir=dir;c.v*=.62;c.drift=false;if(c.player){S.shake=.8;SFX.spin();popup('SPIN!','#ff2a4a');S.stats.spins++;}else if(c.ai)c.ai.spunT=4;}
/* ---------- contact between cars: soft, so racing door to door is fun rather than fatal ---------- */
function contacts(){
  const n=CARS.length;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    const a=CARS[i],b=CARS[j];const dz=dSeg(a.z,b.z),dx=b.x-a.x;
    if(Math.abs(dz)>CARL||Math.abs(dx)>CARW)continue;
    const front=dz>0?b:a,back=dz>0?a:b,adz=Math.abs(dz);
    if(adz<CARL*.55){/* side by side: lean on each other */
      const o=(CARW-Math.abs(dx))*.5,sg=dx>=0?1:-1;a.x-=sg*o;b.x+=sg*o;
      if(sg>0){a.vx=Math.min(a.vx,-.4);b.vx=Math.max(b.vx,.4);}else{a.vx=Math.max(a.vx,.4);b.vx=Math.min(b.vx,-.4);}
      a.v*=.997;b.v*=.997;if(a.player||b.player){if(S.clock-S.bumpT>.3){S.bumpT=S.clock;SFX.bump(.5);S.shake=Math.max(S.shake,.25);}}}
    else{/* nose to tail: the car behind gives up its speed */
      if(back.v>front.v){const dv=back.v-front.v;S.contacts=(S.contacts||0)+1;back.v=front.v*.985;front.v+=dv*.25;back.z=wrapZ(front.z-CARL*SEG);back.dist=front.dist-CARL*SEG;
        if(dv>VTOP*.3&&S.raceT>6&&front.spinT<=0&&!front.player)spin(front,dx>0?1:-1);
        if(a.player||b.player){if(S.clock-S.bumpT>.25){S.bumpT=S.clock;SFX.bump(Math.min(1,dv/VTOP*4));S.shake=Math.max(S.shake,.35);}if(back.player)S.stats.bumps++;}}}
  }
}
/* ---------- slipstream: tucked in behind a car, you punch a smaller hole in the air ---------- */
function drafting(dt){
  for(const c of CARS){let best=0;
    for(const o of CARS){if(o===c)continue;const d=dSeg(c.z,o.z);if(d<2.4||d>28)continue;const dx=Math.abs(o.x-c.x);if(dx>.3)continue;
      const k=(1-(d-2.4)/25.6)*(1-dx/.3)*Math.min(1,o.v/VTOP*1.6);if(k>best)best=k;}
    c.draft+=(best-c.draft)*Math.min(1,dt*(best>c.draft?1.6:3));
    if(c.draft>.5){c.draftT+=dt;c.nitro=Math.min(1,c.nitro+dt*.05);}else c.draftT=0;
  }
}
/* ---------- race order: finished cars by finishing time, the rest by distance ---------- */
function raceOrder(){
  const o=CARS.slice().sort((a,b)=>a.finished!==b.finished?(a.finished?-1:1):a.finished?a.finishT-b.finishT:b.dist-a.dist);
  o.forEach((c,i)=>c.pos=i+1);return o;
}
