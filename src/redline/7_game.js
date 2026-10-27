/* =====================================================================================
   14. THE GAME: a five-round Grand Prix (top three to go through, one retry), the classic
   Highway Run, and the attract race that plays itself behind the title
   ===================================================================================== */
const POINTS=[10,8,6,5,4,3,2,1];
const S={mode:'title',t:0,clock:0,demo:true,paused:false,assist:clamp(parseInt(store.get('hd-'+CAB.id+'-assist','0'),10)||0,0,2),
  score:0,hi:parseInt(store.get('hd-'+CAB.id+'-hi','0'),10)||0,hwhi:parseInt(store.get('hd-'+CAB.id+'-hwhi','0'),10)||0,tickets:0,
  round:0,pts:{},cont:1,res:null,raceT:0,lights:0,goT:0,gridT:0,holdT:0,rev:0,flag:'',yellow:0,cheer:0,shake:0,flash:0,parts:[],popups:[],radio:[],
  stats:{},wet:false,bumpT:0,menuI:0,menuRow:0,newHi:false,lastPos:8,demoT:0,best:null,radioT:0,hw:null,trackI:0,finishT:0,gridPos:8};
const NAME_P='YOU';
function popup(txt,col,sub){S.popups.push({txt,col:col||'#ffd23f',sub,t:0});if(S.popups.length>3)S.popups.shift();}
function radio(txt,col){if(S.demo)return;S.radio.push({txt,col:col||'#9ff1ff',t:0});if(S.radio.length>2)S.radio.shift();}
function newStats(){return {spins:0,bumps:0,walls:0,passes:0,best:0,clean:true,draftT:0,drift:0};}
/* ---------- setting up a race ---------- */
function gridOrder(){
  /* round one: the field by skill, you at the back. After that: reverse championship order, so the
     leader starts last and has to come through the pack */
  const all=[NAME_P,...DRIVERS.map(d=>d.name)];
  if(S.round===0||S.demo){const r=DRIVERS.slice().sort((a,b)=>b.skill-a.skill).map(d=>d.name);return S.demo?[...r.slice(0,5),NAME_P,...r.slice(5)]:[...r,NAME_P];}
  return all.slice().sort((a,b)=>(S.pts[a]||0)-(S.pts[b]||0)||(a===NAME_P?1:b===NAME_P?-1:0));
}
function setupRace(ci){
  buildCircuit(ci);S.wet=THEMES[TR.theme].weather==='rain';S.trackI=ci;
  CARS=[];const order=gridOrder();
  order.forEach((nm,k)=>{
    let z=0;for(const s of TR.segs)if(s.grid===k){z=s.i*SEG+SEG*.5;break;}
    const c=mkCar({z,x:k%2?.42:-.42,name:nm});c.dist=dSeg(TR.startI*SEG,z)*SEG;
    if(nm===NAME_P){c.player=true;c.drv={name:NAME_P,num:1,col:'#ff2a4a',col2:'#ffffff',tag:'#ff2a4a'};P=c;}
    else{const d=DRIVERS.find(q=>q.name===nm);c.drv=d;c.ai=mkAI(d,S.demo?3:S.round);c.top=1+(d.skill-.96)*.25;}
    c.lapDone=0;c.lapT0=0;CARS.push(c);
  });
  if(S.demo){P.ai=mkAI({name:'YOU',skill:.975,aggr:.6,cons:.95},3);}
  TRAFFIC=[];S.parts.length=0;S.popups.length=0;S.radio.length=0;S.raceT=0;S.lights=0;S.goT=0;S.flag='';S.yellow=0;S.cheer=0;
  S.stats=newStats();S.tipI=0;S.gridPos=CARS.indexOf(P)+1;S.lastPos=S.gridPos;S.finishT=0;S.res=null;
  VIEW.th=TR.theme;VIEW.thPrev=TR.theme;VIEW.themeT=1;VIEW.sky=0;raceOrder();
}
function APP_attract(){
  S.demo=true;S.paused=false;S.mode='title';S.t=0;S.demoT=0;S.round=0;
  setupRace((Math.random()*CIRCUITS.length)|0);
  /* drop straight in mid-race so the screen is busy from the first frame */
  S.lights=5;S.goT=0;S.raceT=0;
  for(const c of CARS){c.v=VTOP*rnd(.5,.65);}
  setTrack('title');$('pauseBtn').textContent='Pause';
}
function APP_start(){if(S.mode==='title'||S.mode==='over'){S.mode='menu';S.t=0;S.menuI=0;S.menuRow=0;SFX.confirm();setTrack('title');}}
function startGP(){
  S.demo=false;S.round=0;S.cont=1;S.retried=0;S.score=0;S.tickets=0;S.pts={};S.wins=0;S.podiums=0;S.roundRes=[];for(const nm of [NAME_P,...DRIVERS.map(d=>d.name)])S.pts[nm]=0;
  startRound();
}
function startRound(){S.hwGrid=0;setupRace(S.round);S.mode='intro';S.t=0;setTrack(CIRCUITS[S.round].id);say(CIRCUITS[S.round].name.toLowerCase()+'. round '+(S.round+1));}
function toGrid(){S.mode='grid';S.t=0;S.gridT=0;S.lights=0;S.holdT=rnd(.5,1.4);S.rev=0;S.jump=0;}
/* ---------- the start: five lights on, a pause, lights out ---------- */
function gridStep(dt,ctl){
  S.gridT+=dt;S.rev=lerp(S.rev,ctl.nitro||ctl.brake?0:.55+.35*Math.sin(S.gridT*7),.1);
  const n=Math.min(5,Math.floor(S.gridT/.8));if(n>S.lights){S.lights=n;SFX.light();}
  if(S.lights>=5&&S.gridT>4+S.holdT){S.mode=S.hwGrid?'hw':'race';S.raceT=0;S.goT=1.2;S.lights=0;SFX.go();say('go');S.launch=0;S.flag='green';}
  if(ctl.nitro&&!S.jump&&!S.hwGrid&&S.mode==='grid'){S.jump=1;popup('TOO EARLY','#ff2a4a','NO LAUNCH BOOST');}      /* holding nitro through the lights is a guess, not a start */
}
/* ---------- the player's inputs: smoothed steering (keys ramp, sticks map straight through) ---------- */
function playerInput(ctl,dt){
  if(window.__auto&&!P.ai)P.ai=mkAI({name:'YOU',skill:.985,aggr:.6,cons:.95},3);
  if(S.demo||P.finished||S.mode==='finish'||(window.__auto&&S.mode!=='hw'))return aiInput(P,dt);
  let x=ctl.x;
  if(ctl.dig){const sgn=Math.sign(x-P.steer),rate=x===0?9:(Math.sign(x)!==Math.sign(P.steer)&&P.steer!==0?12:4.2);P.steer+=sgn*Math.min(Math.abs(x-P.steer),rate*dt);}
  else{const tgt=Math.sign(x)*Math.pow(Math.abs(x),1.25);P.steer=lerp(P.steer,tgt,Math.min(1,dt*14));}
  let thr=ctl.brake?0:1,brk=ctl.brake?1:0;
  /* perfect start: nitro within a quarter second of lights out */
  if(S.mode==='race'&&S.raceT<.25&&ctl.nitro&&!S.launch&&!S.jump){S.launch=1;P.boostT=1.2;popup('PERFECT START','#5aff6a');SFX.boost();S.score+=500;}
  return {steer:P.steer,thr,brk,nitro:ctl.nitro&&S.raceT>.3};
}
/* ---------- the race itself ---------- */
const UIN=new Map();
function raceStep(dt,ctl){
  S.raceT+=dt;S.goT=Math.max(0,S.goT-dt);S.yellow=Math.max(0,S.yellow-dt);S.cheer=Math.max(0,S.cheer-dt);
  for(const c of CARS)UIN.set(c,c===P?playerInput(ctl,dt):aiInput(c,dt));
  const sub=2;for(let k=0;k<sub;k++){for(const c of CARS){const u=UIN.get(c);c.steer=c===P?P.steer:u.steer;carStep(c,u,dt/sub);}contacts();}
  if(P.nitroOn&&!P.wasNitro)SFX.nitro();P.wasNitro=P.nitroOn;
  drafting(dt);
  if(P.draft>.55&&!P.drafting){P.drafting=1;if(!S.demo){popup('SLIPSTREAM','#2fe6ff');SFX.draft();}}else if(P.draft<.3)P.drafting=0;
  if(P.draft>.5)S.stats.draftT+=dt;
  for(const c of CARS){if(c.spinT>.9){S.yellow=3;}}
  S.paceT=(S.paceT||0)+dt;if(S.paceT>.5){S.paceT=0;aiPace();}
  /* laps */
  for(const c of CARS){if(c.finished)continue;const done=Math.floor(c.dist/TR.L);
    if(done>c.lapDone){c.lapDone=done;const lt=S.raceT-c.lapT0;c.lapT0=S.raceT;c.lastLap=lt;c.laps.push(lt);if(!c.bestLap||lt<c.bestLap)c.bestLap=lt;
      if(c===P&&!S.demo)lapEvent(lt);
      if(done>=TR.laps&&!S.demo){c.finished=true;const over=(c.dist-done*TR.L)/Math.max(1,c.v);c.finishT=S.raceT-over;if(c===P)playerFinish();}}}
  const order=raceOrder();
  if(!S.demo){if(P.pos<S.lastPos){SFX.up();if(S.raceT>3)popup('P'+P.pos,'#5aff6a');S.stats.passes+=S.lastPos-P.pos;S.score+=150*(S.lastPos-P.pos);}else if(P.pos>S.lastPos){SFX.down();}S.lastPos=P.pos;ARC.score(S.score);}
  radioStep(dt,order);
  playerFX();
  if(P.wallT>.2&&!P.hitWall){P.hitWall=1;S.stats.walls++;S.stats.clean=false;}else if(P.wallT<=0)P.hitWall=0;
  if(P.spinT>0)S.stats.clean=false;
  if(P.drift)S.stats.drift+=dt;
  /* near the line: the crowd */
  if(Math.abs(dSeg(P.z,TR.startI*SEG))<10&&S.raceT>2&&!S.cheerOn){S.cheerOn=1;S.cheer=2.5;if(!S.demo)SFX.cheer();}else if(Math.abs(dSeg(P.z,TR.startI*SEG))>20)S.cheerOn=0;
}
function lapEvent(lt){
  const lap=P.lapDone;
  const rec=parseFloat(store.get('hd-'+CAB.id+'-rec-'+TR.C.id,'0'))||0;
  if(P.bestLap===lt&&lap>1){popup('FASTEST LAP','#ff5ad8',fmtT(lt));SFX.best();}
  if(!rec||lt<rec){store.set('hd-'+CAB.id+'-rec-'+TR.C.id,lt.toFixed(3));if(rec){radio('TRACK RECORD '+fmtT(lt),'#ff5ad8');S.score+=2000;}}
  if(lap===TR.laps-1){popup('FINAL LAP','#ffffff');SFX.final();say('final lap');S.flag='white';}
  else if(lap<TR.laps){popup('LAP '+(lap+1)+'/'+TR.laps,'#ffffff',fmtT(lt));SFX.lap();}
}
/* the race engineer: gaps and warnings over the radio */
const TIPS=[[2,'DRAFT BEHIND A CAR FOR SPEED'],[9,'BRAKE WHERE THE LINE TURNS RED'],[16,'HOLD BRAKE AND STEER TO DRIFT'],[24,'DRIFTS AND DRAFTS FILL YOUR NITRO']];
function radioStep(dt,order){
  for(const r of S.radio)r.t+=dt;S.radio=S.radio.filter(r=>r.t<3.2);
  if(S.demo||P.finished)return;S.radioT+=dt;
  /* first race of the Grand Prix: the engineer walks you through the car */
  if(S.round===0&&!S.retried&&TR.kind==='circuit'){S.tipI=S.tipI||0;const tp=TIPS[S.tipI];if(tp&&S.raceT>tp[0]&&(S.assist<2||S.tipI===0)){radio(tp[1],'#ffffff');S.tipI++;S.radioT=-2;return;}}
  const i=P.pos-1,ahead=order[i-1],behind=order[i+1];
  if(behind&&!behind.finished){const gap=(P.dist-behind.dist)/Math.max(1,P.v);if(gap<.7&&behind.v>P.v&&S.radioT>6){S.radioT=0;radio(behind.drv.name+' CLOSING','#ffb020');}}
  if(S.radioT>9){S.radioT=0;if(ahead){const gap=(ahead.dist-P.dist)/Math.max(1,P.v);radio('GAP TO '+ahead.drv.name+' '+gap.toFixed(1),'#9ff1ff');}else if(behind){const gap=(P.dist-behind.dist)/Math.max(1,P.v);radio('LEADING BY '+gap.toFixed(1),'#5aff6a');}}
}
function playerFinish(){
  S.mode='finish';S.t=0;S.flag='chk';S.cheer=4;SFX.cheer();
  const p=P.pos;say(p===1?'winner!':'position '+p);popup(p===1?'WINNER!':'P'+p,p<=3?'#ffd23f':'#ffffff',fmtT(P.finishT));
  if(p===1)SFX.win();else if(p<=3)SFX.lap();else SFX.down();
  P.ai=mkAI({name:'YOU',skill:.95,aggr:.3,cons:1},2);
}
/* everyone still running when you finish gets a time from their pace */
function closeRace(){
  for(const c of CARS){if(c.finished)continue;const left=TR.laps*TR.L-c.dist;c.finished=true;c.finishT=S.raceT+left/Math.max(VTOP*.55,c.v);}
  const order=raceOrder();
  const res=order.map((c,i)=>({name:c.drv.name,col:c.drv.tag,t:c.finishT,best:c.bestLap,pts:POINTS[i],me:c===P}));
  for(const r of res)S.pts[r.name]+=r.pts;
  const pos=P.pos,fast=res.reduce((a,r)=>r.best&&(!a||r.best<a.best)?r:a,null);
  const bon={pos:POINTS[pos-1]*1000,passes:Math.max(0,S.gridPos-pos)*250,fast:fast&&fast.me?1000:0,clean:S.stats.clean?1500:0};
  for(const k in bon)S.score+=bon[k];
  if(pos===1)S.wins++;if(pos<=3)S.podiums++;
  S.res={rows:res,pos,bon,fast:fast?fast.name:''};S.roundRes.push(pos);
}
function standings(){return Object.keys(S.pts).map(n=>({name:n,pts:S.pts[n],me:n===NAME_P})).sort((a,b)=>b.pts-a.pts||(a.me?-1:b.me?1:0));}
function afterResults(){
  const pos=S.res.pos;
  if(pos<=3){if(S.round>=CIRCUITS.length-1){endGP(true);}else{S.mode='standings';S.t=0;}}
  else if(S.cont>0){S.mode='continue';S.t=0;}
  else endGP(false);
}
function endGP(done){
  const st=standings(),cp=st.findIndex(r=>r.me)+1;S.champPos=cp;S.gpDone=done;
  let tk=S.roundRes.reduce((a,p)=>a+(p<=3?8:3)+(p===1?6:0),0);if(done&&cp===1)tk+=60;if(S.wins===CIRCUITS.length)tk+=200;
  if(done&&cp===1)S.score+=20000;
  S.tickets=tk;S.newHi=S.score>S.hi;if(S.newHi){S.hi=S.score;store.set('hd-'+CAB.id+'-hi',S.hi);}
  S.mode=done?'champion':'over';S.t=0;setTrack(done&&cp===1?'champ':'over');if(!done)SFX.lose();else if(cp===1){SFX.win();say('champion of the world');}
  ARC.over(S.score,S.tickets);
}
/* ---------- the Highway Run: the classic, against the clock through traffic ---------- */
function startHighway(){
  S.demo=false;buildHighway();S.wet=false;CARS=[];P=mkCar({z:TR.startI*SEG,x:0,name:NAME_P,player:true});P.drv={name:NAME_P,num:1,col:'#ff2a4a',col2:'#ffffff',tag:'#ff2a4a'};P.nitro=.6;CARS.push(P);P.lapDone=0;
  resetTraffic(110);S.hw={time:55,dist:0,near:0,top:0,lap:1,stage:0};S.score=0;S.tickets=0;S.parts.length=0;S.popups.length=0;S.stats=newStats();
  S.mode='grid';S.gridT=0;S.lights=0;S.holdT=.3;S.hwGrid=1;S.raceT=0;S.jump=0;VIEW.th=0;VIEW.thPrev=0;VIEW.themeT=1;setTrack('highway');
}
function hwStep(dt,ctl){
  const H2=S.hw;S.raceT+=dt;S.goT=Math.max(0,S.goT-dt);
  const u=S.mode==='hwover'?{steer:0,thr:0,brk:.3,nitro:false}:playerInput(ctl,dt);
  for(let k=0;k<2;k++)carStep(P,u,dt/2);
  if(P.nitroOn&&!P.wasNitro)SFX.nitro();P.wasNitro=P.nitroOn;
  trafficStep(dt);
  /* traffic: a gentle bump, never a wreck */
  for(const c of TRAFFIC){const d=dSeg(P.z,c.z),dx=Math.abs(c.x-P.x);if(d>-.3&&d<1.1&&dx<(c.w+.32)/2*.95){
      if(P.v>c.v&&d>.2){P.v=c.v*.92;P.z=wrapZ(c.z-1.15*SEG);P.vx+=c.x>P.x?-1.2:1.2;S.shake=.5;SFX.bump(1);popup('BUMP','#ff2a4a');S.stats.clean=false;}
      else{P.vx+=c.x>P.x?-1.4:1.4;P.v*=.97;SFX.bump(.5);}}}
  /* near misses: a car just overtaken, close but not touched */
  for(const c of TRAFFIC){const rel=dSeg(P.z,c.z),pr=c.prel==null?rel:c.prel;c.prel=rel;
    if(S.mode==='hw'&&pr>0&&rel<=0){const dx=Math.abs(c.x-P.x);if(dx<.6&&dx>.3&&P.v>VTOP*.5){H2.near++;S.score+=500;P.nitro=Math.min(1,P.nitro+.12);popup('NEAR MISS','#2fe6ff','+500');SFX.miss();}}}
  if(S.mode==='hw'){H2.time-=dt;H2.dist+=dt*P.v*.00672;S.score+=dt*P.v/40;H2.top=Math.max(H2.top,P.v);if(P.drift)S.score+=dt*300;
    if(H2.time<=10&&Math.ceil(H2.time)!==H2.beep){H2.beep=Math.ceil(H2.time);SFX.warn();}
    if(H2.time<=0){H2.time=0;S.mode='hwover';S.t=0;popup('TIME UP','#ff2a4a');endHighway();}ARC.score(S.score);}
  /* stages: a new theme and more time at each gate */
  const s=segAt(P.z);if(s.st!==VIEW.th){VIEW.thPrev=VIEW.th;VIEW.th=s.st;VIEW.themeT=0;
    if(S.mode==='hw'){if(s.st===0){H2.lap++;popup('LAP '+H2.lap,'#ffffff','TRAFFIC UP');resetTraffic(110+H2.lap*30);}const b=Math.max(18,32-H2.lap*4);H2.time+=b;S.score+=5000*H2.lap;popup('CHECKPOINT','#7dff6a','+'+b+' SEC');SFX.check();S.flash=.6;}}
  playerFX();
}
function endHighway(){S.score=Math.floor(S.score);S.tickets=Math.min(60,Math.round(S.score/2500));S.newHi=S.score>S.hwhi;if(S.newHi){S.hwhi=S.score;store.set('hd-'+CAB.id+'-hwhi',S.hwhi);}SFX.lose();ARC.over(S.score,S.tickets);setTrack('over');}
