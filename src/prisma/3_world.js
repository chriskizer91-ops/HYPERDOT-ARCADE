/* =====================================================================================
   WORLD — stages, the road curve (mirrors pX/pY in the shader exactly), the bike, traffic,
   the getaway van and the police drones. Everything moves in track space:
     s = distance along the road (it is also world z), u = across the road (world x minus the
     curve), h = height above the road. World position = (pX(s)+u, pY(s)+h, s).
   ===================================================================================== */
const RW=9,LANES=[-6.75,-2.25,2.25,6.75];
const STAGES=[
  {name:'CHROMA AVENUE',area:'DOWNTOWN',id:0,PA:[46,18,6],PF:[.0023,.0061,.0157],PP:[0,1.3,2.1],YA:[5,1.5],YF:[.0031,.011],YP:[.4,1.7],
   N1:[1,.15,.7],N2:[.1,.8,1],N3:[1,.55,.12],fog:[.05,.024,.075],skyA:[.015,.01,.04],skyB:[.14,.04,.18],rain:1,fogD:.0055,wet:1,
   lim:13.2,poles:true,cars:12,carV:[26,42],top:92,tgtV:68,gap:620,time:62,feat:[380,170,.4],tr:'s0',
   brief:['SUSPECT VEHICLE IS A GOLD VAN','EASTBOUND ON CHROMA AVENUE.','RAM IT OFF THE ROAD. GO!'],say:'Prisma one. Suspect is a gold van, eastbound on Chroma Avenue. Ram it off the road.'},
  {name:'LANTERN ROW',area:'NIGHT MARKET',id:1,PA:[34,20,9],PF:[.0029,.0072,.0171],PP:[1.1,.2,2.6],YA:[3,1.2],YF:[.004,.013],YP:[1.1,.3],
   N1:[1,.12,.1],N2:[1,.6,.15],N3:[.1,1,.55],fog:[.075,.03,.022],skyA:[.02,.008,.012],skyB:[.22,.06,.04],rain:0,fogD:.0068,wet:.55,
   lim:13.2,poles:true,cars:14,carV:[22,36],top:92,tgtV:70,gap:680,time:64,feat:[330,140,.25],tr:'s1',
   brief:['HE BAILED INTO THE NIGHT MARKET.','STREETS ARE PACKED. WATCH THE','CROWDS AND STAY ON HIM.'],say:'He bailed into the night market. The streets are packed. Stay on him.'},
  {name:'SKYWAY',area:'ELEVATED EXPRESS',id:2,PA:[70,30,10],PF:[.0018,.005,.012],PP:[2.2,.7,1.4],YA:[10,3],YF:[.0022,.008],YP:[.2,2.4],
   N1:[.62,.3,1],N2:[.2,.9,1],N3:[1,.45,.1],fog:[.022,.026,.055],skyA:[.01,.015,.05],skyB:[.1,.08,.2],rain:0,fogD:.0029,wet:.25,
   lim:9.5,poles:false,cars:9,carV:[30,48],top:98,tgtV:76,gap:780,time:62,feat:[300,120,.55],tr:'s2',
   brief:['HE IS ON THE SKYWAY NOW. NO','EXITS FOR TEN KILOMETERS.','USE THE RAMPS. FLY.'],say:'He is on the skyway. No exits for ten kilometers. Use the ramps.'},
  {name:'UNDERLINE',area:'TRANSIT TUNNEL',id:3,PA:[40,16,5],PF:[.0026,.007,.019],PP:[.5,2.9,.1],YA:[6,2],YF:[.0027,.0105],YP:[2.,.9],
   N1:[.1,.9,1],N2:[.6,.7,1],N3:[1,.1,.2],fog:[.014,.022,.03],skyA:[.01,.01,.02],skyB:[.05,.05,.08],rain:0,fogD:.0046,wet:.3,
   lim:11.6,poles:false,cars:11,carV:[30,46],top:100,tgtV:80,gap:820,time:66,feat:[260,100,.2],tr:'s3',
   brief:['LAST CHANCE. HE IS HEADED FOR','THE UNDERLINE TUNNEL AND THE','HARBOR. END THIS.'],say:'Last chance. He is headed down the Underline to the harbor. End this.'}
];
let ST=STAGES[0];
const sn=Math.sin,cs=Math.cos;
function pX(z){const a=ST.PA,f=ST.PF,p=ST.PP;return a[0]*sn(z*f[0]+p[0])+a[1]*sn(z*f[1]+p[1])+a[2]*sn(z*f[2]+p[2]);}
function dpX(z){const a=ST.PA,f=ST.PF,p=ST.PP;return a[0]*f[0]*cs(z*f[0]+p[0])+a[1]*f[1]*cs(z*f[1]+p[1])+a[2]*f[2]*cs(z*f[2]+p[2]);}
function ddpX(z){const a=ST.PA,f=ST.PF,p=ST.PP;return -(a[0]*f[0]*f[0]*sn(z*f[0]+p[0])+a[1]*f[1]*f[1]*sn(z*f[1]+p[1])+a[2]*f[2]*f[2]*sn(z*f[2]+p[2]));}
function pY(z){const a=ST.YA,f=ST.YF,p=ST.YP;return a[0]*sn(z*f[0]+p[0])+a[1]*sn(z*f[1]+p[1]);}
function dpY(z){const a=ST.YA,f=ST.YF,p=ST.YP;return a[0]*f[0]*cs(z*f[0]+p[0])+a[1]*f[1]*cs(z*f[1]+p[1]);}
/* the tunnel opens to the sky for a stretch every 700 m (the shader uses the same rule) */
const tunnelOpen=s=>((s/700)%1+1)%1>=.82;
function limAt(s){return ST.id===3&&tunnelOpen(s)?13.2:ST.lim;}
function groundAt(s,u){return ST.id!==2&&Math.abs(u)>RW?.22:0;}
const W3=(s,u,h)=>[pX(s)+u,pY(s)+h,s];

/* ---------- ramps and boost pads, laid out ahead procedurally ---------- */
const FEAT={list:[],next:0,rng:mulberry(1)};
function featReset(seed){FEAT.list.length=0;FEAT.next=260;FEAT.rng=mulberry(seed);}
function featFill(s){
  const r=FEAT.rng,[gap,jit,rampP]=ST.feat;
  while(FEAT.next<s+900){
    const z=FEAT.next,lane=LANES[(r()*4)|0];
    if(r()<rampP)FEAT.list.push({k:'ramp',z,u:lane,len:11+r()*3});
    else{FEAT.list.push({k:'pad',z,u:lane,len:16});if(r()<.35)FEAT.list.push({k:'pad',z:z+60,u:LANES[(r()*4)|0],len:16});}
    FEAT.next+=gap+r()*jit*2-jit;
  }
  while(FEAT.list.length&&FEAT.list[0].z<s-120)FEAT.list.shift();
}
function rampH(s,u){for(const f of FEAT.list){if(f.k!=='ramp')continue;const lz=s-f.z;if(lz>=0&&lz<=f.len&&Math.abs(u-f.u)<2.2)return {h:1.5*lz/f.len,f};}return null;}

/* ---------- the bike ---------- */
const BK={s:0,u:0,h:0,vs:0,vu:0,vh:0,air:0,steer:0,nitroT:0,nitros:3,boostT:0,wob:0,wobV:0,scrape:0,hitT:0,yaw:0,bank:0,ground:0,inRamp:null,airT:0,pole:0,lastS:0};
let ASSIST=store.get('hd-prisma-assist','1')==='1';
function bikeReset(s,u){Object.assign(BK,{s,u,h:0,vs:0,vu:0,vh:0,air:0,steer:0,nitroT:0,nitros:3,boostT:0,wob:0,wobV:0,scrape:0,hitT:0,yaw:0,bank:0,ground:0,inRamp:null,airT:0,lastS:s});}
function topSpeed(){return BK.nitroT>0?ST.top+33:BK.boostT>0?ST.top+20:ST.top;}
/* the forgiving part: assist nudges you around traffic you are about to hit and keeps you off walls */
function assistSteer(c){
  if(!ASSIST||BK.air)return c.x;
  let nudge=0;const B=BK,look=.55;
  for(const t of TR.cars){const ds=t.s-B.s;if(ds<0||ds>B.vs*look+8||t.dead)continue;
    const tu=t.u+t.vu*ds/Math.max(10,B.vs-t.vs),du=B.u-tu;if(Math.abs(du)>2.6)continue;
    const away=du===0?(B.u>0?-1:1):Math.sign(du);nudge+=away*(1-Math.abs(du)/2.6)*(1-ds/(B.vs*look+8))*1.4;}
  const lim=limAt(B.s);if(Math.abs(B.u)>lim-1.8)nudge-=Math.sign(B.u)*(Math.abs(B.u)-(lim-1.8))*.5;
  /* never fight a player who is steering hard */
  return clamp(c.x+nudge*(1-Math.abs(c.x)*.7),-1,1);
}
function bikeStep(dt,c){
  const B=BK;B.lastS=B.s;
  if(B.nitroT>0)B.nitroT-=dt;if(B.boostT>0)B.boostT-=dt;if(B.hitT>0)B.hitT-=dt;
  /* throttle is automatic; brake sheds speed fast and tightens the steering */
  const top=topSpeed();
  if(c.brake)B.vs=Math.max(0,B.vs-58*dt);
  else if(c.coast){}
  else if(B.vs<top){const k=B.nitroT>0||B.boostT>0?75:30*(1-(B.vs/top)**2)+2.5;B.vs=Math.min(top,B.vs+k*dt);}
  else B.vs=Math.max(top,B.vs-16*dt);
  /* steering: a lateral speed target that grows with speed, plus the curve pushing you wide */
  const sx=assistSteer(c);
  B.steer+=(sx-B.steer)*Math.min(1,dt*11);
  const latMax=8+B.vs*.13,tgt=B.steer*latMax*(B.air?.35:1);
  B.vu+=(tgt-B.vu)*Math.min(1,dt*(c.brake?9:6.5));
  B.vu-=ddpX(B.s)*B.vs*B.vs*(ASSIST?.5:.95)*dt;
  /* wobble after a hit: a decaying side-to-side shimmy */
  B.wobV+=(-B.wob*60-B.wobV*7)*dt;B.wob+=B.wobV*dt;
  B.s+=B.vs*dt;B.u+=B.vu*dt;
  /* walls scrape instead of stopping you dead */
  const lim=limAt(B.s);B.scrape=Math.max(0,B.scrape-dt*4);
  if(Math.abs(B.u)>lim){const sg=Math.sign(B.u);B.u=sg*lim;if(B.vu*sg>0)B.vu=-B.vu*.3;B.vs*=1-.55*dt;B.scrape=1;
    if(Math.random()<.9)sparks(B.s+.4,B.u+sg*.3,B.h+.5,B.vs*.8,-sg*3,5,[255,190,90]);}
  /* lamp poles on the sidewalk: worth dodging */
  if(ST.poles&&Math.floor(B.lastS/26+.5)!==Math.floor(B.s/26+.5)&&Math.abs(Math.abs(B.u)-10)<.75&&B.h<5){
    B.vs*=.6;B.wobV+=Math.sign(B.u)*-5;B.vu=-Math.sign(B.u)*6;B.hitT=.6;S.shake=Math.max(S.shake,.7);hitStat();
    sparks(B.s+1,B.u,1,B.vs*.6,0,22,[255,220,150]);SFX.crunch(1);flashMsg('POLE!','#ff6a4a',.8);}
  /* height: ramps launch you, gravity brings you back */
  B.ground=groundAt(B.s,B.u);const rh=B.air?null:rampH(B.s,B.u);
  if(rh){B.h=B.ground+rh.h;B.inRamp=rh.f;B.vh=0;}
  else{
    if(B.inRamp){const f=B.inRamp;B.inRamp=null;B.air=1;B.airT=0;B.vh=B.vs*1.5/f.len+2.5;B.h=B.ground+1.5;SFX.launch();}
    if(B.air){B.airT+=dt;B.vh-=23*dt;B.h+=B.vh*dt;
      if(B.h<=B.ground){B.h=B.ground;B.air=0;const hard=-B.vh;B.vh=0;SFX.land(hard);S.shake=Math.max(S.shake,Math.min(.8,hard/30));
        sparks(B.s,B.u,.2,B.vs*.7,0,10+hard|0,[180,220,255]);if(B.airT>.9)airBonus(B.airT);}}
    else B.h+=(B.ground-B.h)*Math.min(1,dt*20);
  }
  /* boost pads */
  if(!B.air)for(const f of FEAT.list){if(f.k!=='pad'||f.hit)continue;const lz=B.s-f.z;if(lz>=0&&lz<f.len&&Math.abs(B.u-f.u)<2){f.hit=1;B.boostT=1.4;B.vs=Math.min(ST.top+20,B.vs+16);SFX.pad();padBonus();}}
  /* a rooster tail of spray off the wet street */
  if(ST.rain&&!B.air&&B.vs>30&&Math.random()<.85)for(let k=0;k<2;k++){const p=W3(B.s-2.1,B.u+rnd(-.35,.35),.15);if(SPK.length<260)SPK.push({x:p[0],y:p[1],z:p[2],vx:rnd(-1.5,1.5)+B.vu*.5,vy:rnd(1.5,4.5),vz:B.vs*rnd(.55,.8),life:rnd(.15,.32),col:[150,185,255]});}
  /* afterfire: the pops the engine fires into its pipe flash at the tail */
  if(B.popN>0){const n=Math.min(3,B.popN);B.popN=0;sparks(B.s-1.7,B.u,.55,B.vs*.92,B.vu*.5,3*n,Math.random()<.5?[255,170,70]:[255,110,40]);}
  B.yaw=Math.atan2(dpX(B.s)*B.vs+B.vu,Math.max(1,B.vs))+B.wob*.25;
  B.bank+=(clamp(-B.vu/latMax*.5,-.55,.55)+B.wob*.3-B.bank)*Math.min(1,dt*8);
}
function useNitro(){const B=BK;if(B.nitros<=0||B.nitroT>0)return false;B.nitros--;B.nitroT=2.6;B.vs=Math.max(B.vs,ST.top+8);SFX.nitro();S.shake=Math.max(S.shake,.35);return true;}

/* ---------- civilian traffic: one-way, four lanes, hover cars with blinkers and brake lights ---------- */
const TR={cars:[],rng:mulberry(5)};
const CARTYPES=[[0,2.15],[1,2.3],[2,2.2],[3,2.05],[4,4.2]];
function trReset(seed){TR.cars.length=0;TR.rng=mulberry(seed);}
function laneFree(lane,s,gap){for(const t of TR.cars)if(Math.abs(t.lane-lane)<.5&&Math.abs(t.s-s)<gap)return false;return true;}
function spawnCar(s0,s1){
  const r=TR.rng;for(let tries=0;tries<6;tries++){
    const lane=(r()*4)|0,s=s0+r()*(s1-s0);if(!laneFree(lane,s,32))continue;
    const ty=CARTYPES[r()<.12?4:(r()*4)|0],big=ty[0]===4;
    const v=big?22+r()*8:ST.carV[0]+r()*(ST.carV[1]-ST.carV[0]);
    TR.cars.push({s,u:LANES[lane],h:0,vs:v,v0:v,vu:0,lane,tlane:lane,type:ty[0],L:ty[1],brake:0,blink:0,blinkT:0,spin:0,spinV:0,yaw:0,hit:0,dead:0,passed:0,hitCD:0,near:0});return;}
}
function trStep(dt,spawn){
  const B=BK;
  if(spawn){let n=0;for(const t of TR.cars)if(t.s>B.s-40)n++;
    if(n<ST.cars&&TR.cars.length<14)spawnCar(B.s+Math.max(380,B.vs*4.6),B.s+Math.max(560,B.vs*6.2));}
  for(const t of TR.cars){
    if(t.hitCD>0)t.hitCD-=dt;
    if(t.hit){ /* knocked: spinning, sliding, slowing */
      t.spin+=t.spinV*dt;t.spinV*=1-1.6*dt;t.vs=Math.max(0,t.vs-14*dt);t.vu*=1-1.8*dt;t.brake=1;
      if(Math.abs(t.spinV)<.3&&Math.abs(t.vu)<.5){t.hit=0;t.lane=LANES.reduce((bi,l,i)=>Math.abs(l-t.u)<Math.abs(LANES[bi]-t.u)?i:bi,0);t.tlane=t.lane;t.v0=Math.max(18,t.v0*.8);}
    }else{
      /* keep a gap to whoever is ahead in the lane */
      let ahead=null,ad=1e9;for(const o of TR.cars){if(o===t)continue;const d=o.s-t.s;if(d>0&&d<ad&&Math.abs(o.u-t.u)<2.4){ad=d;ahead=o;}}
      const vd=TG.on&&TG.s>t.s&&TG.s-t.s<ad&&Math.abs(TG.u-t.u)<2.4?TG:null;if(vd){ad=TG.s-t.s;ahead=TG;}
      let want=t.v0;if(ahead&&ad<34){want=Math.min(want,(ahead.vs||0)-(34-ad)*.4);}
      t.brake=want<t.vs-2?1:0;t.vs+=clamp(want-t.vs,-20*dt,8*dt);t.vs=Math.max(0,t.vs);
      /* lane changes, signalled first */
      if(t.blinkT>0){t.blinkT-=dt;if(t.blinkT<=0)t.lane=t.tlane;}
      else if(t.lane===t.tlane&&((ahead&&ad<45&&TR.rng()<dt*1.2)||TR.rng()<dt*.05)){
        const opts=[t.lane-1,t.lane+1].filter(l=>l>=0&&l<4&&laneFree(l,t.s,18));if(opts.length){t.tlane=opts[(TR.rng()*opts.length)|0];t.blink=t.tlane>t.lane?2:1;t.blinkT=.9;}}
      if(t.blinkT<=0&&t.lane===t.tlane&&Math.abs(LANES[t.lane]-t.u)<.2)t.blink=0;
      t.vu=clamp((LANES[t.lane]-t.u)*1.6,-3.6,3.6);
    }
    t.s+=t.vs*dt;t.u+=t.vu*dt;const lim=limAt(t.s)-1.4;if(Math.abs(t.u)>lim){t.u=Math.sign(t.u)*lim;t.vu*=-.3;}
    const rh=rampH(t.s,t.u);t.h=rh?rh.h:groundAt(t.s,t.u)*.5;
    t.yaw=Math.atan2(dpX(t.s)*Math.max(1,t.vs)+t.vu,Math.max(1,t.vs))+t.spin;
  }
  for(let i=TR.cars.length-1;i>=0;i--){const t=TR.cars[i];if(t.s<B.s-90||t.s>B.s+1100)TR.cars.splice(i,1);}
}
/* car vs car contact (the van shoves, a nitro bike smashes through) */
function shove(t,fromU,dvs,power){
  const sg=Math.sign(t.u-fromU)||1;t.hit=1;t.vu=sg*(5+power*5);t.spinV=sg*(1.5+power*3)*(Math.random()<.5?1:-1);t.vs=Math.max(4,t.vs+dvs);t.hitCD=.5;
}
/* ---------- the getaway van ---------- */
const TG={on:false,s:0,u:0,h:0,vs:0,vu:0,lane:2,dmg:0,boostT:0,wob:0,wobV:0,yaw:0,bank:0,think:0,brakeT:0,state:'run',dodgeT:0,caught:0,spin:0,spinV:0,hitFlash:0};
function tgReset(s){Object.assign(TG,{on:true,s,u:LANES[2],h:0,vs:ST.tgtV,vu:0,lane:2,dmg:0,boostT:0,wob:0,wobV:0,yaw:0,bank:0,think:0,brakeT:0,state:'run',dodgeT:0,caught:0,spin:0,spinV:0,hitFlash:0});}
function laneClear(lane,s,ahead){let best=1e9;for(const t of TR.cars){const d=t.s-s;if(d>-8&&d<ahead&&Math.abs(t.u-LANES[lane])<2.6)best=Math.min(best,d);}return best;}
function tgStep(dt,demo){
  const T=TG,B=BK;if(!T.on)return;
  if(T.boostT>0)T.boostT-=dt;if(T.hitFlash>0)T.hitFlash-=dt*3;
  T.wobV+=(-T.wob*40-T.wobV*5)*dt;T.wob+=T.wobV*dt;
  if(T.state==='caught'){ /* spinning out to a stop */
    T.vs=Math.max(0,T.vs-30*dt);T.spin+=T.spinV*dt;T.spinV*=1-1.2*dt;T.vu*=1-2*dt;T.s+=T.vs*dt;T.u+=T.vu*dt;
    const lim=limAt(T.s)-1.8;if(Math.abs(T.u)>lim){T.u=Math.sign(T.u)*lim;T.vu=0;}
    T.yaw=Math.atan2(dpX(T.s)*Math.max(1,T.vs),Math.max(1,T.vs))+T.spin;T.bank*=.95;return;}
  const gap=T.s-B.s;
  /* rubber band: dawdle when far, flee when close, panic boosts once he is hurt */
  let want=ST.tgtV+(gap>520?-7:gap>260?-2:gap<70?9:4)+(T.dmg>50?4:0);
  /* overtaken: he floors it to get back in front rather than tail the bike */
  if(gap<4)want=Math.max(want,B.vs+(gap<-20?16:10));
  if(T.boostT>0)want+=17;
  T.think-=dt;
  if(T.think<=0){T.think=.25+Math.random()*.3;
    if(gap<60&&gap>-10&&T.boostT<=0&&Math.random()<(T.dmg>40?.07:.035))T.boostT=1.8,SFX.vanBoost();
    if(gap<45&&gap>4&&T.brakeT<=0&&Math.random()<.04)T.brakeT=.7;           /* the brake-check */
    /* pick the lane with the most open road, dodge the bike when it lines up behind him */
    const angry=S.contact&&Math.abs(gap)<6&&Math.abs(B.u-T.u)<5&&Math.random()<.45;
    let best=T.lane,bs=-1e9;for(let l=0;l<4;l++){let sc=Math.min(200,laneClear(l,T.s,200))-Math.abs(l-T.lane)*22;
      if(gap>0&&gap<60&&Math.abs(LANES[l]-B.u)<2.5)sc-=(70+T.dmg*.5)*(1-gap/60);
      if(angry&&Math.abs(LANES[l]-B.u)<2.5)sc+=140;                     /* bike alongside: swing into it */
      sc+=Math.random()*12;if(sc>bs){bs=sc;best=l;}}
    if(gap>0&&gap<40)T.think=Math.min(T.think,.18+Math.random()*.2);
    if(Math.abs(best-T.lane)>1)best=T.lane+Math.sign(best-T.lane);T.lane=best;}
  if(T.brakeT>0){T.brakeT-=dt;want=Math.min(want,B.vs-18);}
  T.vs+=clamp(want-T.vs,-30*dt,(gap<4?22:14)*dt);
  T.vu+=(clamp((LANES[T.lane]-T.u)*1.8,-9,9)-T.vu)*Math.min(1,dt*5);
  T.s+=T.vs*dt;T.u+=T.vu*dt;
  const lim=limAt(T.s)-1.8;if(Math.abs(T.u)>lim){T.u=Math.sign(T.u)*lim;T.vu*=-.2;}
  /* the van just shoves cars out of its way */
  for(const t of TR.cars){if(t.hitCD>0)continue;const ds=t.s-T.s,du=t.u-T.u;if(Math.abs(ds)<t.L+3.4&&Math.abs(du)<2.7){shove(t,T.u,8,.6);T.vs*=.93;T.wobV+=Math.sign(du)*-2;
    sparks(T.s+ds*.5,T.u+du*.5,1,T.vs,0,14,[255,200,120]);if(Math.abs(t.s-B.s)<160)SFX.crunch(.6);}}
  const rh=rampH(T.s,T.u);T.h=rh?rh.h:groundAt(T.s,T.u);
  /* a hurt van smokes and sheds sparks */
  if(T.dmg>35&&Math.random()<dt*T.dmg/12)smoke(T.s-3.3,T.u+rnd(-.9,.9),1.6,T.vs);
  if(T.dmg>60&&Math.random()<dt*T.dmg/30)sparks(T.s-3.2,T.u+rnd(-1,1),.6,T.vs*.92,0,3,[255,170,80]);
  T.yaw=Math.atan2(dpX(T.s)*T.vs+T.vu,Math.max(1,T.vs))+T.wob*.2;
  T.bank+=(clamp(-T.vu*.03,-.2,.2)+T.wob*.2-T.bank)*Math.min(1,dt*6);
}
/* ---------- the two police drones ride shotgun over the van and light it up ---------- */
const DR=[{x:0,y:0,z:0,on:0,ph:0},{x:0,y:0,z:0,on:0,ph:2.1}];
function drStep(dt,t){
  for(let k=0;k<2;k++){const d=DR[k];d.ph+=dt;
    let s,u,h;
    if(TG.on){const orbit=TG.state==='caught';const a=t*.6+k*Math.PI;
      s=TG.s+(orbit?Math.sin(a)*11:-6-k*7+Math.sin(t*.7+k)*3);u=TG.u+(orbit?Math.cos(a)*11:(k?5.5:-5.5)+Math.sin(t*.9+k*2)*1.5);h=(orbit?14:12+k*2)+Math.sin(t*1.3+k)*1.2;}
    else{s=BK.s+40+k*10;u=(k?5:-5);h=14;}
    const p=W3(s,u,h);
    if(!d.on){d.x=p[0];d.y=p[1];d.z=p[2];d.on=1;}
    const kk=Math.min(1,dt*3);d.x+=(p[0]-d.x)*kk;d.y+=(p[1]-d.y)*kk;d.z+=(p[2]-d.z)*kk;
    if(Math.abs(p[2]-d.z)>200){d.x=p[0];d.y=p[1];d.z=p[2];}
  }
}

/* ---------- world-space sparks (drawn on the HUD layer through the camera) ---------- */
const SPK=[];
function sparks(s,u,h,vs,vu,n,col){const p=W3(s,u,h);for(let i=0;i<n&&SPK.length<260;i++)SPK.push({x:p[0],y:p[1],z:p[2],vx:vu+rnd(-6,6),vy:rnd(1,7),vz:vs*rnd(.75,1.02),life:rnd(.25,.6),col});}
function smoke(s,u,h,vs){const p=W3(s,u,h);if(SPK.length<260)SPK.push({x:p[0],y:p[1],z:p[2],vx:rnd(-1,1),vy:rnd(1,2.5),vz:vs*rnd(.8,.95),life:rnd(.5,1),col:[110,105,130],sm:1});}
function spkStep(dt){for(const p of SPK){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.sm){p.vz*=1-dt*1.5;}else{p.vy-=20*dt;p.vz*=1-dt*.8;}p.life-=dt;}for(let i=SPK.length-1;i>=0;i--)if(SPK[i].life<=0)SPK.splice(i,1);}

/* ---------- contact between the bike and everything else ---------- */
function bikeContacts(){
  const B=BK;if(B.h>2.1)return;
  for(const t of TR.cars){
    const ds=t.s-B.s,du=t.u-B.u,hl=t.L+.18+2.0,hw=1.18+.55;
    if(Math.abs(ds)<hl&&Math.abs(du)<hw&&t.hitCD<=0){
      t.hitCD=.6;const nitro=B.nitroT>0;
      if(nitro){ /* nitro turns the bike into a battering ram */
        shove(t,B.u,B.vs*.25,1.2);B.vs*=.94;S.shake=Math.max(S.shake,.5);SFX.crunch(1);sparks(B.s+1.5,B.u+du*.5,1,B.vs,0,26,[150,220,255]);smashBonus();}
      else if(hl-Math.abs(ds)<hw-Math.abs(du)||ds<0){ /* nose or tail: a rear-end */
        if(ds>0){B.vs=lerp(B.vs,t.vs,.62);t.vs+=9;t.brake=1;shove(t,B.u,0,.25);}else{B.vs+=6;}
        B.wobV+=(Math.random()<.5?-1:1)*4;B.hitT=.5;S.shake=Math.max(S.shake,.6);SFX.crunch(.9);sparks(B.s+1.5,B.u+du*.4,1,B.vs*.9,0,18,[255,200,120]);hitStat();
      }else{ /* a side swipe: pushed apart, a little speed lost */
        const sg=-Math.sign(du)||1;B.vu=sg*9;B.u+=sg*(hw-Math.abs(du))*.6;t.vu=-sg*4;B.vs*=.92;B.wobV+=sg*3;S.shake=Math.max(S.shake,.35);SFX.scrape(.7);sparks(B.s,B.u-sg*.5,1,B.vs*.9,-sg*3,12,[255,210,140]);hitStat(.5);}
      t.near=0;
    }
    /* close shaves score, but only clean ones */
    if(!t.passed&&ds<0){t.passed=1;if(Math.abs(du)<2.9&&t.hitCD<=0&&B.vs-t.vs>18&&S.mode==='play')nearMiss(t);}
  }
  /* the van */
  const T=TG;if(!T.on||T.state==='caught')return;
  const ds=T.s-B.s,du=T.u-B.u;
  if(Math.abs(ds)<3.15+2.0&&Math.abs(du)<1.5+.55&&B.hitT<=0){
    const rel=Math.max(0,B.vs-T.vs)+Math.abs(B.vu-T.vu)*.6,nitro=B.nitroT>0;
    let dm=(3+rel*.45)*(nitro?1.8:1)*(ds>0?1:.6);dm=Math.min(dm,nitro?24:14);
    /* he swerved into you: you take the worst of it */
    const swipe=Math.abs(ds)<3.5&&Math.sign(T.vu-B.vu)===-Math.sign(du)&&Math.abs(T.vu-B.vu)>3;
    if(swipe){B.vu=-Math.sign(du)*13;B.wobV+=-Math.sign(du)*6;B.vs*=.9;dm*=.5;flashMsg('SIDESWIPED!','#ff7a5a',.8);hitStat(.5);}
    B.hitT=.45;B.vs=Math.min(B.vs,T.vs-6);B.vu-=Math.sign(du)*5;B.wobV+=(Math.random()<.5?-1:1)*3;
    T.wobV+=Math.sign(du||1)*(4+rel*.15);T.vu+=Math.sign(du||1)*3;T.hitFlash=1;
    S.shake=Math.max(S.shake,.8);SFX.ram(nitro);sparks(T.s-3,B.u+du*.6,1.2,T.vs,0,40,nitro?[150,220,255]:[255,190,80]);
    ramHit(dm,nitro);
  }
}
