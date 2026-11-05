/* =====================================================================================
   20. THE MACHINES and the sequence of one game: credits, the strength roll, aim, drop, grab, lift, carry,
   release, result. Same rules as the 2-D original. Three machines share it; each has its own case, claw, prizes
   and odds. Only the machine in front of you is simulated; the others are kept exactly as you left them.
   ===================================================================================== */
const RAR=[{n:'COMMON',c:'#c8d0e8'},{n:'UNCOMMON',c:'#6aff5a'},{n:'RARE',c:'#4fe0ff'},{n:'EPIC',c:'#ff6ac0'},{n:'JACKPOT',c:'#ffd040'}];
/* box: the case inside (x across, y up from the floor of the case, z toward the glass); the prize chute is the
   front-left corner x<cx, z>cz with walls ch high. U: size relative to Wildwood. hb: case floor above the room floor.
   claw: see 11_claw.js. gantry: carriage speeds. wd/wu: winch speeds down/up. fill: how the case is stocked.
   cast: tix = tickets, wt = how many in a hundred, fric = grip of the fabric, mass in kg. */
const MACHINES={
  sugar:{id:'sugar',name:'SUGAR CLAW',sub:'MINI',what:'FOOD KEYCHAINS',level:'EASY',col:'#ff8ac8',U:.45,hb:.84,
    box:{x0:-.25,x1:.25,z0:-.19,z1:.19,top:.54,cx:-.105,cz:.065,ch:.08,cw:.004,deep:-.5},cam:{pe:.16,py:.5,tf:.4,fh:.04,se:.24,sy:.55},
    claw:{npr:2,piv:.014,vh:.006,L1:.062,L2:.032,A0:.25,HOOK:1.62,RC:.0042,RH:.021,MHI:1/.45,IPI:1800,MAXPEN:.003,
      GY:.495,LMIN:.075,LMAX:.43,home:[-.178,.128],edge:.035,cab:.04},
    gantry:{vm:.2,vmz:.15,ac:1.1},wd:.32,wu:.24,
    credits:3,timer:30,stock:30,roll:[.7,1],boost:.85,
    fill:{cols:5,deps:4,mx:.055,mz:.055,row:.075,y0:.05},
    cast:[{id:'mochi',name:'MOCHI',rar:0,tix:5,wt:16,mass:.03},{id:'berry',name:'BERRY',rar:0,tix:5,wt:16,mass:.03},
      {id:'toast',name:'TOAST',rar:0,tix:5,wt:16,mass:.03},{id:'onigiri',name:'ONIGIRI',rar:1,tix:8,wt:13,mass:.03},
      {id:'pudding',name:'PUDDING',rar:1,tix:8,wt:13,mass:.03},{id:'boba',name:'BOBA TEA',rar:2,tix:10,wt:11,mass:.03},
      {id:'cupcake',name:'CUPCAKE',rar:3,tix:15,wt:8,mass:.03},{id:'donut',name:'GOLD DONUT',rar:4,tix:75,wt:0,mass:.035,fric:.9}]},
  wild:{id:'wild',name:'WILDWOOD',sub:'CLASSIC',what:'WOODLAND PLUSH',level:'MEDIUM',col:'#ffcf8a',U:1,hb:.92,
    box:{x0:-.45,x1:.45,z0:-.35,z1:.35,top:1.0,cx:-.2,cz:.1,ch:.2,cw:.006,deep:-.6},cam:{fh:.34,tf:.5},
    claw:{npr:3,piv:.032,vh:.012,L1:.12,L2:.055,A0:.2,HOOK:1.55,RC:.008,RH:.042,GY:.95,LMIN:.12,LMAX:.9,home:[-.33,.23],edge:.07,cab:.075},
    gantry:{vm:.32,vmz:.24,ac:1.4},wd:.45,wu:.34,
    credits:3,timer:30,stock:22,roll:[.42,1],boost:.78,
    fill:{cols:4,deps:3,mx:.13,mz:.12,row:.24,y0:.14},
    cast:[{id:'frog',name:'FROG',rar:0,tix:15,wt:16,mass:.24},{id:'hedgehog',name:'HEDGEHOG',rar:0,tix:15,wt:16,mass:.24,fric:1.15},
      {id:'toadstool',name:'TOADSTOOL',rar:0,tix:15,wt:16,mass:.22},{id:'fox',name:'FOX',rar:1,tix:25,wt:13,mass:.22},
      {id:'redpanda',name:'RED PANDA',rar:1,tix:25,wt:13,mass:.24},{id:'owl',name:'OWL',rar:2,tix:35,wt:10,mass:.22},
      {id:'moth',name:'LUNA MOTH',rar:3,tix:60,wt:6,mass:.16,fric:.85},{id:'hare',name:'GOLDEN HARE',rar:4,tix:300,wt:0,mass:.26,fric:.85}]},
  titan:{id:'titan',name:'TITAN',sub:'GIANT',what:'GIANT PLUSH',level:'HARD',col:'#ffd040',U:2.2,hb:.78,
    box:{x0:-.95,x1:.95,z0:-.65,z1:.65,top:1.55,cx:-.2,cz:-.05,ch:.3,cw:.012,deep:-.72},
    claw:{npr:3,piv:.08,vh:.03,L1:.3,L2:.14,A0:.2,HOOK:1.5,RC:.02,RH:.1,MHI:1/4,IPI:45,MAXPEN:.013,PHMAX:1.35,
      GY:1.47,LMIN:.3,LMAX:1.36,home:[-.575,.3],edge:.15,cab:.17},
    gantry:{vm:.48,vmz:.36,ac:1.5},wd:.6,wu:.42,
    credits:4,timer:40,stock:4,roll:[.25,.7],boost:.5,fixed:true,
    spots:[[-.6,-.36],[.02,-.38],[.62,-.36],[.22,.32],[.64,.3]],
    cast:[{id:'whale',name:'WHALE',rar:2,tix:150,wt:25,mass:1.2},{id:'dino',name:'DINO',rar:2,tix:150,wt:25,mass:1.4},
      {id:'sloth',name:'SLOTH',rar:2,tix:150,wt:25,mass:1.3,fric:1.1},{id:'dragon',name:'STAR DRAGON',rar:4,tix:500,wt:25,mass:1.5}]}
};
const MORDER=['sugar','wild','titan'];
let MC=null;const CAST={};
function setMachine(id){
  MC=MACHINES[id];Object.assign(CASE,MC.box);for(const k in CS0)CS[k]=CS0[k];Object.assign(CS,MC.claw);
  Object.assign(GT,{vm:.32,vmz:.24,ac:1.4},MC.gantry);UNIT=MC.U;
  for(const c of MC.cast){const T=PLUSH[c.id];Object.assign(T,c);CAST[c.id]=T;}
}
/* ---------- state of the game and of one credit ---------- */
const S={mode:'title',t:0,demo:true,score:0,tickets:0,hi:0,paused:false,credit:0,prizes:[],consol:0,lamp:'attract',winT:9,flash:0,shake:0,stats:{games:0,wins:0}};
const M={ph:'idle',t:0,timer:30,S:1,roll:1,aDown:false,aT:0,lockPend:0,xLock:0,zLock:0,wins:[],beam:0,maxLift:0,slackT:0,overT:0,heldB:null,slipped:false,touched:false,
  hurry:false,lastBeep:0,msg:'',msgT:0,aimB:null,t2:null,ptr:null};
function rollStrength(){
  const [lo,hi]=MC.roll;let s=lo+(hi-lo)*Math.pow(Math.random(),.85);
  if(!S.demo&&S.credit===MC.credits&&S.prizes.length===0)s=Math.max(s,MC.boost);   /* a visible boost on the last credit of a dry game */
  if(S.demo)s=.85+Math.random()*.15;
  return Math.round(s*100)/100;
}
function setPhase(p){M.ph=p;M.t=0;}
function newCredit(){
  S.credit++;M.wins=[];M.S=rollStrength();CL.S=M.S;M.maxLift=0;M.heldB=null;M.touched=false;M.timer=MC.timer;M.hurry=false;
  GT.tx=GT.tz=null;GT.vx=GT.vz=0;M.aDown=false;M.ptr=null;M.lockPend=0;M.slipped=false;M.overT=0;M.slackT=0;
  setPhase('roll');if(!S.demo)SFX.coin();
}
function startDrop(){
  let nb=null,nd=1e9;for(const b of BOD){if(b.state!=='pit')continue;const d=Math.hypot(b.cx-CL.gx,b.cz-CL.gz)-b.y1*.3;if(d<nd){nd=d;nb=b;}}M.aimB=nb;
  setPhase('drop');CL.motor=-1;GT.tx=CL.gx;GT.tz=CL.gz;GT.vx=GT.vz=0;SFX.drop();
}
function lockAxis(){
  if(M.ph==='aimX'){GT.tx=M.xLock=clamp(CL.gx+CL.gvx*.12,CASE.x0+CS.edge,CASE.x1-CS.edge);GT.tz=null;SFX.lock();setPhase('aimZ');M.aDown=false;}
  else{SFX.lock();startDrop();}
}
function machineTick(dt,c,e){
  M.t+=dt;if(M.msgT>0)M.msgT-=dt;
  const ph=M.ph,h=CS.home,U=UNIT;
  if(ph==='prep'){CL.motor=-1;CL.winch=-MC.wu;GT.tx=h[0];GT.tz=h[1];M.beam=0;
    if(M.t>.7&&restockQ.length===0)newCredit();}
  else if(ph==='roll'){GT.tx=h[0];GT.tz=h[1];CL.motor=-1;CL.winch=-MC.wu*1.2;
    const dur=S.demo?.5:1.5,p=clamp(M.t/dur,0,1),wob=(1-p)*(1-p);M.roll=clamp(M.S+Math.sin(M.t*23)*.5*wob,.05,1);
    if(!S.demo&&p<1)SFX.roll(M.roll);
    if(M.t>=dur&&Math.abs(CL.gx-h[0])<.015*U&&Math.abs(CL.gz-h[1])<.015*U&&CL.L<CS.LMIN+.04*U){M.roll=M.S;if(!S.demo)SFX.settle(M.S);setPhase('aimX');GT.tx=null;GT.tz=M.zLock=CL.gz;M.timer=MC.timer;if(!S.demo)SFX.go();}}
  else if(ph==='aimX'||ph==='aimZ'){M.beam=Math.min(1,M.beam+dt*3);CL.motor=-1;CL.winch=-MC.wu;
    if(S.demo)pilot(dt);else aimInput(dt,c,e);
    if(!S.demo){M.timer-=dt;
      if(M.timer<10&&!M.hurry){M.hurry=true;setTrack('hurry');}
      if(M.timer<5.5&&Math.ceil(M.timer)!==M.lastBeep){M.lastBeep=Math.ceil(M.timer);SFX.beep(M.timer<3);}
      if(M.timer<=0){M.timer=0;M.msg='TIME!';M.msgT=1;SFX.beep(true);M.lockPend=2;}}
    if(M.lockPend===2){M.lockPend=0;SFX.lock();startDrop();}
    else if(M.lockPend===1){const tg=M.ph==='aimX'?GT.tx:GT.tz,pos=M.ph==='aimX'?CL.gx:CL.gz,vel=M.ph==='aimX'?CL.gvx:CL.gvz;
      /* set once the carriage has arrived, or has stopped against the end of its rail */
      M.lockWait=Math.abs(vel)<.004*U?(M.lockWait||0)+dt:0;
      if(tg==null||Math.abs(pos-tg)<.008*U||M.lockWait>.25){M.lockPend=0;M.lockWait=0;lockAxis();}}}
  else if(ph==='drop'){M.beam=Math.max(0,M.beam-dt*1.5);
    if(M.t>.28){CL.winch=Math.min(MC.wd,Math.max(CL.winch,0)+.04*Math.sqrt(U));
      const vy=(CL.hy-CL.oy)/HS;if(CL.slack>.008*U&&vy>-.12*U)M.slackT++;else M.slackT=0;
      if(CL.touch>0&&!M.touched){M.touched=true;SFX.poff(1,.8);}
      if(M.slackT>4||CL.L>=CS.LMAX){CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-CS.GY,CL.hz-CL.gz)+.004*U);setPhase('grab');CL.motor=1;SFX.close();}}
    else CL.winch=0;}
  else if(ph==='grab'){if(M.t>1.0){setPhase('lift');SFX.lift();}}
  else if(ph==='lift'){CL.winch=-Math.min(MC.wu,.06*U+(CL.L-CS.LMIN)*3);
    if(CL.L<=CS.LMIN+.0005){CL.winch=0;M.t2=(M.t2||0)+dt;if(M.t2>.35){M.t2=null;setPhase('carry');GT.tx=h[0];GT.tz=h[1];GT.carry=true;SFX.rattle();}}}
  else if(ph==='carry'){if(Math.abs(CL.gx-h[0])<.006*U&&Math.abs(CL.gz-h[1])<.006*U&&Math.abs(CL.gvx)+Math.abs(CL.gvz)<.01*U){M.t2=(M.t2||0)+dt;if(M.t2>.45){M.t2=null;GT.carry=false;setPhase('release');CL.motor=-1;SFX.release();}}}
  else if(ph==='release'){if(M.t>1.9){setPhase('result');creditResult();}}
  else if(ph==='result'){
    if(M.t<dt*1.5&&!M.wins.length&&M.aimB)M.aimB.fails=(M.aimB.fails||0)+1;
    if(M.t>(M.wins.length?3.2:1.9)){if(S.demo){S.credit=0;newCredit();}else if(S.credit>=MC.credits)gameOver();else newCredit();}}
  else if(ph==='idle'){CL.motor=-1;CL.winch=-MC.wu;GT.tx=h[0];GT.tz=h[1];M.beam=0;}
  /* what the claw holds, and slips */
  if(ph==='lift'||ph==='carry'||ph==='release'){
    let hb=null,hp=0;for(const b of BOD)if(b.state==='pit'&&b.pc>hp&&b.cy>.05*U){hp=b.pc;hb=b;}
    if(hb&&hb.cy>M.maxLift)M.maxLift=hb.cy;if(hb)M.heldB=hb;
    else if(M.heldB&&ph!=='release'&&M.heldB.state==='pit'&&M.heldB.cy>.1*U&&M.heldB.cy<M.maxLift-.06*U&&!M.slipped){M.slipped=true;SFX.slip();M.msg='SLIP!';M.msgT=1;}}
  CL.grip=(ph==='grab'||ph==='lift'||ph==='carry')&&CL.cnt?clamp(1-CL.load*.55,0,1):Math.max(0,CL.grip-dt*2);
}
function creditResult(){
  if(S.demo)return;
  if(M.wins.length===0){const close=M.maxLift>.4*UNIT,t=2+(close?2:0)+((Math.random()*2)|0);
    S.tickets+=t;S.consol+=t;S.score+=t*20;M.msg=close?'SO CLOSE!':'NICE TRY';M.msgT=1.9;hudPop('+'+t+' TICKETS','#ffd040');SFX.aww();}
  ARC.score(S.score);
}
/* a plush went down the chute */
function winPlush(b){
  const T=b.T;b.state='won';kill(b);
  SFX.chute();later(()=>SFX.boing(),.25);
  if(M.ph==='prep'||M.ph==='idle')return;
  M.wins.push(b);S.winT=0;S.lamp='win';
  if(!S.demo){const tb=Math.ceil(M.timer)*10,dbl=M.wins.length>1?1500:0,pts=T.tix*100+tb+dbl;
    S.tickets+=T.tix;S.score+=pts;S.prizes.push(T.id);S.stats.wins++;recordPrize(T);
    hudPop('+'+T.tix+' TICKETS','#ffd040');if(dbl)hudPop('DOUBLE!','#6aff5a');
    if(T.rar===4){SFX.jackpot();say('Jackpot!',.8,1);S.flash=1;}else{SFX.winner();say('Winner!',.9,1.05);S.flash=.5;}
    ARC.score(S.score);}
  else SFX.winner();
  S.shake=.4;
}
/* what you have won, kept for the arcade's shelf: per plush, how many and when first */
function recordPrize(T){try{const k='hd-'+CAB.id+'-prizes',o=JSON.parse(store.get(k,'{}'))||{};const e=o[T.id]||{n:0,first:Date.now(),machine:MC.id};e.n++;o[T.id]=e;store.set(k,JSON.stringify(o));}catch(err){}}
const LATER=[];function later(f,s){LATER.push({f,t:s});}
/* ---------- the stock: filling the case, restocking between games ---------- */
const restockQ=[];let restockT=0;
function pickType(){
  if(MC.fixed){const have=new Set(BOD.filter(b=>b.state==='pit').map(b=>b.T.id).concat(restockQ.map(t=>t.id)));
    const miss=MC.cast.filter(c=>!have.has(c.id));return CAST[(miss.length?miss[(Math.random()*miss.length)|0]:MC.cast[0]).id];}
  const hasJ=BOD.some(b=>b.T.rar===4)||restockQ.some(t=>t.rar===4);
  const J=MC.cast.find(c=>c.rar===4);if(J&&!hasJ&&Math.random()<.06)return CAST[J.id];
  let tot=0;for(const c of MC.cast)tot+=c.wt;let r=Math.random()*tot;for(const c of MC.cast){r-=c.wt;if(r<0)return CAST[c.id];}return CAST[MC.cast[0].id];
}
function inChute(x,z,m){return x<CASE.cx+m&&z>CASE.cz-m;}
function dropSpot(T){const C=CASE,U=UNIT,m=T.size*.45;let x,z,k=0;do{x=rnd(C.x0+m,C.x1-m);z=rnd(C.z0+m,C.z1-m);k++;}while(inChute(x,z,m+.02*U)&&k<30);return [x,z];}
function restockTick(dt){
  if(S.mode==='play'&&M.ph!=='prep')return;
  const live=BOD.filter(b=>b.state==='pit').length+restockQ.length;
  for(let k=live;k<MC.stock;k++)restockQ.push(pickType());
  restockT-=dt;
  if(restockQ.length&&restockT<=0){restockT=.4;const T=restockQ.shift(),[x,z]=dropSpot(T);spawn(T,x,CASE.top-T.size*.75,z,rnd(-3,3),0,0,0,rnd(-.8,.8));setupGrid();}
}
function fillMachine(){
  const C=CASE,U=UNIT,types=[];
  if(MC.fixed){const ids=MC.cast.map(c=>c.id).sort(()=>Math.random()-.5);for(const id of ids)types.push(CAST[id]);
    const spots=MC.spots.slice().sort(()=>Math.random()-.5);
    types.forEach((T,k)=>{const [x,z]=spots[k];spawn(T,x+rnd(-.03,.03),T.size*.62,z+rnd(-.03,.03),rnd(-3,3),0,0,0,rnd(-.15,.15));});
    setupGrid();return;}
  for(let k=0;k<MC.stock;k++)types.push(pickType());
  const J=MC.cast.find(c=>c.rar===4);if(J&&!types.some(t=>t.rar===4)&&Math.random()<.5)types[(Math.random()*types.length)|0]=CAST[J.id];
  const F=MC.fill;let k=0;
  for(let row=0;k<types.length&&row<12;row++)for(let col=0;col<F.cols&&k<types.length;col++)for(let dep=0;dep<F.deps&&k<types.length;dep++){
    const x=C.x0+F.mx+col*(C.x1-C.x0-F.mx*2)/(F.cols-1)+rnd(-.02,.02)*U,z=C.z0+F.mz+dep*(C.z1-C.z0-F.mz*2)/(F.deps-1)+rnd(-.02,.02)*U;
    if(inChute(x,z,.12*U))continue;
    spawn(types[k++],x,F.y0+row*F.row,z,rnd(-3,3),0,0,0,rnd(-.4,.4));}
  setupGrid();
}
/* a pile settled ahead of time by tools/bake_piles.js (three per machine, one picked at random each visit to the page) */
function placePile(id){
  const L=(typeof PILES!=='undefined'&&PILES[id])||[];if(!L.length)return false;
  const V=L[(Math.random()*L.length)|0],q=new Float32Array(b64(V.q).buffer),p=new Float32Array(b64(V.p).buffer);clearPhys();let o=0;
  V.t.forEach((tid,k)=>{const b=spawn(CAST[tid],0,0,0);if(!b){o+=CAST[tid].model.np*3;return;}let cx=0,cy=0,cz=0;
    for(let j=0;j<b.n;j++){const i=b.i0+j;PX[i]=OX[i]=p[o];PY[i]=OY[i]=p[o+1];PZ[i]=OZ[i]=p[o+2];o+=3;cx+=PX[i];cy+=PY[i];cz+=PZ[i];}
    b.cx=cx/b.n;b.cy=cy/b.n;b.cz=cz/b.n;for(let j=0;j<4;j++)b.q[j]=q[k*4+j];qmat(b.q,b.R);setSleep(b,true);});
  setupGrid();bodyBoxes();return true;
}
/* ---------- one machine's world, saved while you look at another ---------- */
const WORLD={};
function copyBody(b){const r={};for(const k in b){if(k==='T'||k==='P')continue;const v=b[k];r[k]=ArrayBuffer.isView(v)?v.slice():Array.isArray(v)?v.slice():v;}return r;}
function copyState(o){const r={};for(const k in o){const v=o[k];r[k]=ArrayBuffer.isView(v)?v.slice():v;}return r;}
function pasteState(o,r){for(const k in r){const v=r[k];if(ArrayBuffer.isView(v)&&ArrayBuffer.isView(o[k]))o[k].set(v);else o[k]=v;}}
function saveWorld(){
  if(!MC)return;
  WORLD[MC.id]={bodies:BOD.map(b=>({b,own:copyBody(b),px:PX.slice(b.i0,b.i0+b.n),py:PY.slice(b.i0,b.i0+b.n),pz:PZ.slice(b.i0,b.i0+b.n),
    ox:OX.slice(b.i0,b.i0+b.n),oy:OY.slice(b.i0,b.i0+b.n),oz:OZ.slice(b.i0,b.i0+b.n)})),
    CL:copyState(CL),GT:copyState(GT),M:copyState(M),AI:copyState(AI),rq:restockQ.slice(),rt:restockT,credit:S.credit};
}
function clearPhys(){for(let i=0;i<NP;i++){PB[i]=-1;PW[i]=0;PS[i]=0;}NP=0;BOD.length=0;}
function loadWorld(id){
  setMachine(id);const w=WORLD[id];
  clearPhys();
  if(!w){clawReset();setPhase('idle');return false;}
  for(const s of w.bodies){const b=s.b,P=b.P;for(const k in s.own){const v=s.own[k];if(ArrayBuffer.isView(v))b[k].set(v);else if(Array.isArray(v))b[k]=v.slice();else b[k]=v;}b.i0=NP;
    for(let k=0;k<b.n;k++){const i=NP+k;PX[i]=s.px[k];PY[i]=s.py[k];PZ[i]=s.pz[k];OX[i]=s.ox[k];OY[i]=s.oy[k];OZ[i]=s.oz[k];PR[i]=P.r[k];PW[i]=b.n/P.mass;PS[i]=b.sleep?1:0;}
    NP+=b.n;BOD.push(b);}
  reindex();setupGrid();
  pasteState(CL,w.CL);pasteState(GT,w.GT);pasteState(M,w.M);pasteState(AI,w.AI);restockQ.length=0;restockQ.push(...w.rq);restockT=w.rt;S.credit=w.credit;
  return true;
}
/* the attract-mode pilot picks a plush the way a decent player would: on top, reachable, worth something */
function pickTarget(){let best=null,bs=-1e9;const U=UNIT;
  for(const b of BOD){if(b.state!=='pit'||inChute(b.cx,b.cz,.08*U))continue;if(S.demo&&b.T.rar===4)continue;
    let cover=0;for(const o of BOD)if(o!==b&&o.state==='pit'&&Math.hypot(o.cx-b.cx,o.cz-b.cz)<.12*U&&o.cy>b.cy+.03*U)cover++;
    const sc=b.y1/U*2-cover*.5+b.T.tix*.002-(b.fails||0)*.3+Math.random()*.1;if(sc>bs){bs=sc;best=b;}}
  return best;}
const AI={tgt:null,err:0,wait:0};
function pilot(dt){
  const U=UNIT,lo=CS.edge;
  if(M.ph==='aimX'){if(M.t<dt*1.5){AI.tgt=pickTarget();AI.err=rnd(-.02,.02)*U;AI.wait=rnd(.15,.5);}
    const tx=AI.tgt?clamp(AI.tgt.cx+AI.err,CASE.x0+lo,CASE.x1-lo):0;GT.tx=tx;GT.tz=M.zLock;
    if(Math.abs(CL.gx-tx)<.006*U&&Math.abs(CL.gvx)<.02*U){AI.wait-=dt;if(AI.wait<=0){lockAxis();AI.wait=rnd(.2,.5);AI.err=rnd(-.02,.02)*U;}}}
  else{const tz=AI.tgt&&AI.tgt.state==='pit'?clamp(AI.tgt.cz+AI.err,CASE.z0+lo,CASE.z1-lo):0;GT.tz=tz;GT.tx=M.xLock;
    if(Math.abs(CL.gz-tz)<.006*U&&Math.abs(CL.gvz)<.02*U){AI.wait-=dt;if(AI.wait<=0)lockAxis();}}
}
/* ---------- the world tick: stock, carriage, machine, physics, wins ---------- */
function worldTick(dt,c,e){
  restockTick(dt);gantryTick(dt);machineTick(dt,c||NOCTL,e||{});
  physTick(CLAWSTEP);clawTelemetry();
  for(const b of BOD.slice()){if(b.state!=='pit')continue;
    if(b.cx<CASE.cx&&b.cz>CASE.cz&&b.cy<-.06*UNIT)winPlush(b);else if(b.cy<CASE.deep-.2*UNIT)kill(b);}
  for(const b of BOD){b.age+=dt;
    b.impT-=dt;if(b.imp>.7*Math.sqrt(UNIT)&&b.impT<=0){b.impT=.25;SFX.flump(clamp(b.imp/2.5,.2,1),1/b.T.size*.25);}
    b.sqT-=dt;if(b.pc>2&&b.comp<.9&&b.sqT<=0&&(M.ph==='grab'||M.ph==='lift')){b.sqT=.7;SFX.squeak(clamp(1.1-b.T.size,.4,1.1));}}
  const sp=Math.abs(CL.gvx)+Math.abs(CL.gvz);if((M.lastSp||0)>.2*UNIT&&sp<.05*UNIT)SFX.clink();M.lastSp=sp;
  for(let i=LATER.length-1;i>=0;i--){LATER[i].t-=dt;if(LATER[i].t<=0){const f=LATER[i].f;LATER.splice(i,1);f();}}
}
const NOCTL={x:0,y:0,a:false,b:false};
