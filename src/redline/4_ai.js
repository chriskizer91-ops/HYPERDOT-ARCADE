/* =====================================================================================
   10. RIVALS: racecraft on top of the same driving model
   Each driver aims at the racing line a little ahead, holds the speed profile scaled by skill (in
   corners only; on the straights everyone has the same car), and reacts to traffic: following
   and drafting when there is no room, picking a side to pass (the inside of the next corner if it
   can), defending against a faster car behind, and now and then overcooking a corner.
   ===================================================================================== */
function mkAI(d,round){
  const dk=[-.06,-.04,-.02,-.005,.006][round]||0;
  /* the field gets quicker round by round: on top of the corner skill, a share of straight-line pace too */
  const base=[.925,.95,.972,.988,1][round]||1;
  return {d,skill:clamp(d.skill+dk,.86,1),aggr:d.aggr,cons:d.cons,pace:1,base,passX:null,passT:0,passOn:null,defX:0,defT:0,defCD:0,mistakeT:0,inBrake:false,
    react:rnd(.12,.42),badStart:Math.random()<.15,spunT:0,holdT:0,nitroCD:rnd(2,6),paceT:0};
}
function aiInput(c,dt){
  const A=c.ai,N=TR.N,s=segAt(c.z),sp=c.v/VTOP;
  A.passT=Math.max(0,A.passT-dt);A.defT=Math.max(0,A.defT-dt);A.defCD=Math.max(0,A.defCD-dt);A.mistakeT=Math.max(0,A.mistakeT-dt);A.spunT=Math.max(0,A.spunT-dt);A.nitroCD=Math.max(0,A.nitroCD-dt);
  /* target speed: the profile a few segments ahead; skill bites in the corners, not on the straights */
  const look=TR.segs[(s.i+3)%N],vl=look.vlim;
  const ck=vl>=.999?1:vl-(1-A.skill)*(1-vl)*2.6;
  let vt=VTOP*c.top*Math.min(1.01,ck*A.pace*A.base*(A.mistakeT>0?1.09:1));
  /* entering a braking zone: a chance of getting it wrong */
  const braking=look.vlim<.82;if(braking&&!A.inBrake&&Math.random()<(1-A.cons)*.4)A.mistakeT=1.6;A.inBrake=braking;
  /* traffic ahead: pass, or follow and draft */
  const lead=Math.round(4+sp*12),sa=TR.segs[(s.i+lead)%N];
  let tx=sa.line,ahead=null,ad=99;
  for(const o of CARS){if(o===c)continue;const d=dSeg(c.z,o.z);if(d<=0||d>10)continue;if(Math.abs(o.x-c.x)<.5&&d<ad){ad=d;ahead=o;}}
  if(ahead&&c.v>ahead.v-VTOP*.015&&!A.passT){
    let inside=0;for(let k=4;k<40;k+=4){const cv=TR.segs[(s.i+k)%N].curve;if(Math.abs(cv)>1){inside=Math.sign(cv);break;}}
    const opts=[ahead.x-.52,ahead.x+.52].map(x=>clamp(x,-.86,.86)).filter(x=>Math.abs(x-ahead.x)>.36);
    let best=null,bs=-1e9;
    for(const x of opts){let room=1;for(const o of CARS){if(o===c||o===ahead)continue;const d=dSeg(c.z,o.z);if(d>-1.5&&d<6&&Math.abs(o.x-x)<.36)room=0;}
      const sc=room*2+(Math.sign(x-ahead.x)===inside?.6+A.aggr*.6:0)-Math.abs(x-c.x)*.8+Math.random()*.2;if(room&&sc>bs){bs=sc;best=x;}}
    if(best!=null){A.passX=best;A.passT=3.2;A.passOn=ahead;}
    else{A.holdT=.6;}
  }
  if(A.passT>0&&A.passOn){if(dSeg(A.passOn.z,c.z)>2.6)A.passT=0;else tx=A.passX;}
  A.holdT=Math.max(0,A.holdT-dt);
  /* never drive into the gearbox ahead: keep a gap that grows with speed until there is room to go by */
  if(ahead){const gap=3+sp*5,side=Math.abs(ahead.x-c.x);
    if((A.holdT>0||side<.36)&&ad<gap)vt=Math.min(vt,ahead.v*(ad<gap*.55?.94:ad<gap*.8?.985:1.0));}
  /* defending: a quicker car close behind on a straight gets the door shut, once */
  if(A.aggr>.5&&!A.defCD&&Math.abs(s.curve)<1){for(const o of CARS){if(o===c)continue;const d=dSeg(o.z,c.z);if(d>0&&d<5&&o.v>c.v+VTOP*.01&&Math.abs(o.x-c.x)>.25){A.defX=clamp(c.x+Math.sign(o.x-c.x)*.32*A.aggr,-.8,.8);A.defT=1.6;A.defCD=5;break;}}}
  if(A.defT>0&&!(A.passT>0))tx=lerp(tx,A.defX,.7);
  /* nitro: down a long straight when passing, or on the last lap */
  let nit=false;
  if(c.nitro>.25&&!A.nitroCD&&vl>.999){let clear=true;for(let k=8;k<70;k+=8)if(TR.segs[(s.i+k)%N].vlim<.98){clear=false;break;}
    if(clear&&(A.passT>0||c.lapDone>=TR.laps-1||(ahead&&ad<6))){nit=true;}}
  if(c.nitroOn&&c.nitro<.05)A.nitroCD=rnd(4,9);
  /* steering: a PD controller on the target line, plus a feed-forward for the corner's residual push */
  const onLine=1-Math.min(1,Math.abs(c.x-s.line)/.85),d=sp*sp*s.curve*(1-LINEB*onLine)/GRIPK,cap=TR.grip;
  const auth=STEER*(.36+.64*Math.min(1,sp*1.6));
  const ff=Math.sign(d)*(Math.min(Math.abs(d),cap)*PUSH*.22+Math.max(0,Math.abs(d)-cap)*OVERK)/Math.max(.3,auth);
  const steer=clamp((tx-c.x)*2.4-c.vx*.38/Math.max(.3,auth)+ff,-1,1);
  let thr=1,brk=0;
  if(c.v>vt*1.012){thr=0;brk=clamp((c.v-vt)/(VTOP*.055),.15,1);}else if(c.v>vt*.995)thr=.4;
  if(S.mode==='grid'){thr=0;brk=1;}
  if(S.raceT<A.react){thr=0;}else if(A.badStart&&S.raceT<A.react+1.1)thr=.55;
  return {steer,thr,brk,nitro:nit};
}
/* every half second: a gentle pull toward the player so a race stays a race, never a procession */
function aiPace(){
  if(!P)return;for(const c of CARS){if(!c.ai)continue;const gap=(c.dist-P.dist)/SEG;
    c.ai.pace=gap>140?.982:gap>60?.993:gap<-160?1.02:gap<-70?1.008:1;if(P.finished)c.ai.pace=1;}
}
/* ---------- the highway's traffic: lane-keeping cars that sometimes change lanes ---------- */
let TRAFFIC=[];
const LANESX=[-.66,0,.66],TCOLS=['#ff3b5c','#3a7bff','#ffd23f','#2fe6ff','#7dff6a','#ff8a2e','#c45cff','#f2f2f2','#ff5ad8'];
function resetTraffic(n){
  for(const s of TR.segs)s.cars.length=0;TRAFFIC=[];
  for(let i=0;i<n;i++){const lane=LANESX[(Math.random()*3)|0],z=Math.floor(rnd(40,TR.N))*SEG,type=Math.random()<.15?'truck':Math.random()<.35?'sports':'sedan';
    TRAFFIC.push({x:lane,tx:lane,z,v:VTOP*(type==='truck'?rnd(.25,.38):rnd(.32,.55)),type,col:pick(TCOLS),w:type==='truck'?.42:.36,prel:null});}
}
function trafficStep(dt){
  for(const c of TRAFFIC){
    const rel=dSeg(P.z,c.z);
    if(rel>0&&rel<22&&Math.abs(c.x-P.x)<.45&&Math.random()<dt*1.5)c.tx=c.x>P.x?Math.min(.75,c.x+.66):Math.max(-.75,c.x-.66);
    else if(Math.random()<dt*.05)c.tx=pick(LANESX);
    c.x+=clamp(c.tx-c.x,-dt*.6,dt*.6);c.z=wrapZ(c.z+dt*c.v);
  }
}
