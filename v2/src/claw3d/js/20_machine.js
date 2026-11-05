/* =====================================================================================
   20. THE MACHINES and the sequence of one game: credits, the strength roll, aim, drop, grab, lift, carry,
   release, result. Same rules as the 2-D original. Session 2 builds Wildwood; Sugar Claw and Titan follow.
   ===================================================================================== */
const RAR=[{n:'COMMON',c:'#c8d0e8'},{n:'UNCOMMON',c:'#6aff5a'},{n:'RARE',c:'#4fe0ff'},{n:'EPIC',c:'#ff6ac0'},{n:'JACKPOT',c:'#ffd040'}];
const MACHINES={
  wild:{id:'wild',name:'WILDWOOD',sub:'CLASSIC',
    box:{x0:-.45,x1:.45,z0:-.35,z1:.35,top:1.0,cx:-.2,cz:.1,ch:.2,cw:.006,deep:-.6},
    claw:{npr:3,piv:.032,vh:.012,L1:.12,L2:.055,A0:.2,HOOK:1.55,RC:.008,RH:.042,GY:.95,LMIN:.12,LMAX:.9,home:[-.33,.23]},
    credits:3,timer:30,stock:22,roll:[.42,1],boost:.78,
    /* tix = tickets for winning it, wt = how many in a hundred, fric = how grippy the fabric is */
    cast:[{id:'frog',name:'FROG',rar:0,tix:15,wt:16,mass:.24},{id:'hedgehog',name:'HEDGEHOG',rar:0,tix:15,wt:16,mass:.24,fric:1.15},
      {id:'toadstool',name:'TOADSTOOL',rar:0,tix:15,wt:16,mass:.22},{id:'fox',name:'FOX',rar:1,tix:25,wt:13,mass:.22},
      {id:'redpanda',name:'RED PANDA',rar:1,tix:25,wt:13,mass:.24},{id:'owl',name:'OWL',rar:2,tix:35,wt:10,mass:.22},
      {id:'moth',name:'LUNA MOTH',rar:3,tix:60,wt:6,mass:.16,fric:.85},{id:'hare',name:'GOLDEN HARE',rar:4,tix:300,wt:0,mass:.26,fric:.85}]}
};
let MC=null;const CAST={};
function setMachine(id){
  MC=MACHINES[id];Object.assign(CASE,MC.box);Object.assign(CS,MC.claw);
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
  if(M.ph==='aimX'){GT.tx=M.xLock=clamp(CL.gx+CL.gvx*.12,CASE.x0+.07,CASE.x1-.07);GT.tz=null;SFX.lock();setPhase('aimZ');M.aDown=false;}
  else{SFX.lock();startDrop();}
}
function machineTick(dt,c,e){
  M.t+=dt;if(M.msgT>0)M.msgT-=dt;
  const ph=M.ph,h=CS.home;
  if(ph==='prep'){CL.motor=-1;CL.winch=-.34;GT.tx=h[0];GT.tz=h[1];M.beam=0;
    if(M.t>.7&&restockQ.length===0)newCredit();}
  else if(ph==='roll'){GT.tx=h[0];GT.tz=h[1];CL.motor=-1;CL.winch=-.4;
    const dur=S.demo?.5:1.5,p=clamp(M.t/dur,0,1),wob=(1-p)*(1-p);M.roll=clamp(M.S+Math.sin(M.t*23)*.5*wob,.05,1);
    if(!S.demo&&p<1)SFX.roll(M.roll);
    if(M.t>=dur&&Math.abs(CL.gx-h[0])<.015&&Math.abs(CL.gz-h[1])<.015&&CL.L<CS.LMIN+.04){M.roll=M.S;if(!S.demo)SFX.settle(M.S);setPhase('aimX');GT.tx=null;GT.tz=M.zLock=CL.gz;M.timer=MC.timer;if(!S.demo)SFX.go();}}
  else if(ph==='aimX'||ph==='aimZ'){M.beam=Math.min(1,M.beam+dt*3);CL.motor=-1;CL.winch=-.34;
    if(S.demo)pilot(dt);else aimInput(dt,c,e);
    if(!S.demo){M.timer-=dt;
      if(M.timer<10&&!M.hurry){M.hurry=true;setTrack('hurry');}
      if(M.timer<5.5&&Math.ceil(M.timer)!==M.lastBeep){M.lastBeep=Math.ceil(M.timer);SFX.beep(M.timer<3);}
      if(M.timer<=0){M.timer=0;M.msg='TIME!';M.msgT=1;SFX.beep(true);M.lockPend=2;}}
    if(M.lockPend===2){M.lockPend=0;SFX.lock();startDrop();}
    else if(M.lockPend===1){const tg=M.ph==='aimX'?GT.tx:GT.tz,pos=M.ph==='aimX'?CL.gx:CL.gz,vel=M.ph==='aimX'?CL.gvx:CL.gvz;
      /* set once the carriage has arrived, or has stopped against the end of its rail */
      M.lockWait=Math.abs(vel)<.004?(M.lockWait||0)+dt:0;
      if(tg==null||Math.abs(pos-tg)<.008||M.lockWait>.25){M.lockPend=0;M.lockWait=0;lockAxis();}}}
  else if(ph==='drop'){M.beam=Math.max(0,M.beam-dt*1.5);
    if(M.t>.28){CL.winch=Math.min(.45,Math.max(CL.winch,0)+.04);
      const vy=(CL.hy-CL.oy)/HS;if(CL.slack>.008&&vy>-.12)M.slackT++;else M.slackT=0;
      if(CL.touch>0&&!M.touched){M.touched=true;SFX.poff(1,.8);}
      if(M.slackT>4||CL.L>=CS.LMAX){CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-CS.GY,CL.hz-CL.gz)+.004);setPhase('grab');CL.motor=1;SFX.close();}}
    else CL.winch=0;}
  else if(ph==='grab'){if(M.t>1.0){setPhase('lift');SFX.lift();}}
  else if(ph==='lift'){CL.winch=-Math.min(.34,.06+(CL.L-CS.LMIN)*3);
    if(CL.L<=CS.LMIN+.0005){CL.winch=0;M.t2=(M.t2||0)+dt;if(M.t2>.35){M.t2=null;setPhase('carry');GT.tx=h[0];GT.tz=h[1];GT.carry=true;SFX.rattle();}}}
  else if(ph==='carry'){if(Math.abs(CL.gx-h[0])<.006&&Math.abs(CL.gz-h[1])<.006&&Math.abs(CL.gvx)+Math.abs(CL.gvz)<.01){M.t2=(M.t2||0)+dt;if(M.t2>.45){M.t2=null;GT.carry=false;setPhase('release');CL.motor=-1;SFX.release();}}}
  else if(ph==='release'){if(M.t>1.9){setPhase('result');creditResult();}}
  else if(ph==='result'){
    if(M.t<dt*1.5&&!M.wins.length&&M.aimB)M.aimB.fails=(M.aimB.fails||0)+1;
    if(M.t>(M.wins.length?3.2:1.9)){if(S.demo){S.credit=0;newCredit();}else if(S.credit>=MC.credits)gameOver();else newCredit();}}
  else if(ph==='idle'){CL.motor=-1;CL.winch=-.34;GT.tx=h[0];GT.tz=h[1];M.beam=0;}
  /* what the claw holds, and slips */
  if(ph==='lift'||ph==='carry'||ph==='release'){
    let hb=null,hp=0;for(const b of BOD)if(b.state==='pit'&&b.pc>hp&&b.cy>.05){hp=b.pc;hb=b;}
    if(hb&&hb.cy>M.maxLift)M.maxLift=hb.cy;if(hb)M.heldB=hb;
    else if(M.heldB&&ph!=='release'&&M.heldB.state==='pit'&&M.heldB.cy>.1&&M.heldB.cy<M.maxLift-.06&&!M.slipped){M.slipped=true;SFX.slip();M.msg='SLIP!';M.msgT=1;}}
  CL.grip=(ph==='grab'||ph==='lift'||ph==='carry')&&CL.cnt?clamp(1-CL.load*.55,0,1):Math.max(0,CL.grip-dt*2);
}
function creditResult(){
  if(S.demo)return;
  if(M.wins.length===0){const close=M.maxLift>.4,t=2+(close?2:0)+((Math.random()*2)|0);
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
  const hasJ=BOD.some(b=>b.T.rar===4)||restockQ.some(t=>t.rar===4);
  const J=MC.cast.find(c=>c.rar===4);if(J&&!hasJ&&Math.random()<.06)return CAST[J.id];
  let tot=0;for(const c of MC.cast)tot+=c.wt;let r=Math.random()*tot;for(const c of MC.cast){r-=c.wt;if(r<0)return CAST[c.id];}return CAST[MC.cast[0].id];
}
function dropSpot(T){const C=CASE;let x,z,k=0;do{x=rnd(C.x0+.1,C.x1-.1);z=rnd(C.z0+.1,C.z1-.1);k++;}while(x<C.cx+.12&&z>C.cz-.12&&k<20);return [x,z];}
function restockTick(dt){
  if(S.mode==='play'&&M.ph!=='prep')return;
  const live=BOD.filter(b=>b.state==='pit').length+restockQ.length;
  for(let k=live;k<MC.stock;k++)restockQ.push(pickType());
  restockT-=dt;
  if(restockQ.length&&restockT<=0){restockT=.4;const T=restockQ.shift(),[x,z]=dropSpot(T);spawn(T,x,CASE.top-.25,z,rnd(-3,3),0,0,0,rnd(-.8,.8));setupGrid();}
}
function fillMachine(){
  const types=[];for(let k=0;k<MC.stock;k++)types.push(pickType());
  const J=MC.cast.find(c=>c.rar===4);if(J&&!types.some(t=>t.rar===4)&&Math.random()<.5)types[(Math.random()*types.length)|0]=CAST[J.id];
  const C=CASE;let k=0;
  for(let row=0;k<types.length;row++)for(let col=0;col<4&&k<types.length;col++)for(let dep=0;dep<3&&k<types.length;dep++){
    const x=C.x0+.13+col*(C.x1-C.x0-.26)/3+rnd(-.02,.02),z=C.z0+.12+dep*(C.z1-C.z0-.24)/2+rnd(-.02,.02);
    if(x<C.cx+.12&&z>C.cz-.12)continue;
    spawn(types[k++],x,.14+row*.24,z,rnd(-3,3),0,0,0,rnd(-.4,.4));}
  setupGrid();
}
/* the attract-mode pilot picks a plush the way a decent player would: on top, reachable, worth something */
function pickTarget(){let best=null,bs=-1e9;
  for(const b of BOD){if(b.state!=='pit'||(b.cx<CASE.cx+.08&&b.cz>CASE.cz-.08))continue;if(S.demo&&b.T.rar===4)continue;
    let cover=0;for(const o of BOD)if(o!==b&&o.state==='pit'&&Math.hypot(o.cx-b.cx,o.cz-b.cz)<.12&&o.cy>b.cy+.03)cover++;
    const sc=b.y1*2-cover*.5+b.T.tix*.002-(b.fails||0)*.3+Math.random()*.1;if(sc>bs){bs=sc;best=b;}}
  return best;}
const AI={tgt:null,err:0,wait:0};
function pilot(dt){
  if(M.ph==='aimX'){if(M.t<dt*1.5){AI.tgt=pickTarget();AI.err=rnd(-.02,.02);AI.wait=rnd(.15,.5);}
    const tx=AI.tgt?clamp(AI.tgt.cx+AI.err,CASE.x0+.07,CASE.x1-.07):0;GT.tx=tx;GT.tz=M.zLock;
    if(Math.abs(CL.gx-tx)<.006&&Math.abs(CL.gvx)<.02){AI.wait-=dt;if(AI.wait<=0){lockAxis();AI.wait=rnd(.2,.5);AI.err=rnd(-.02,.02);}}}
  else{const tz=AI.tgt&&AI.tgt.state==='pit'?clamp(AI.tgt.cz+AI.err,CASE.z0+.07,CASE.z1-.07):0;GT.tz=tz;GT.tx=M.xLock;
    if(Math.abs(CL.gz-tz)<.006&&Math.abs(CL.gvz)<.02){AI.wait-=dt;if(AI.wait<=0)lockAxis();}}
}
/* ---------- the world tick: stock, carriage, machine, physics, wins ---------- */
function worldTick(dt,c,e){
  restockTick(dt);gantryTick(dt);machineTick(dt,c||NOCTL,e||{});
  physTick(CLAWSTEP);clawTelemetry();
  for(const b of BOD.slice()){if(b.state!=='pit')continue;
    if(b.cx<CASE.cx&&b.cz>CASE.cz&&b.cy<-.06)winPlush(b);else if(b.cy<CASE.deep-.2)kill(b);}
  for(const b of BOD){b.age+=dt;
    b.impT-=dt;if(b.imp>.7&&b.impT<=0){b.impT=.25;SFX.flump(clamp(b.imp/2.5,.2,1),1/b.T.size*.25);}
    b.sqT-=dt;if(b.pc>2&&b.comp<.9&&b.sqT<=0&&(M.ph==='grab'||M.ph==='lift')){b.sqT=.7;SFX.squeak(1.1-b.T.size);}}
  const sp=Math.abs(CL.gvx)+Math.abs(CL.gvz);if((M.lastSp||0)>.2&&sp<.05)SFX.clink();M.lastSp=sp;
  for(let i=LATER.length-1;i>=0;i--){LATER[i].t-=dt;if(LATER[i].t<=0){const f=LATER[i].f;LATER.splice(i,1);f();}}
}
const NOCTL={x:0,y:0,a:false,b:false};
