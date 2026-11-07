/* =====================================================================================
   20. THE MATCH — first to 5, 7 or 9. The player who was scored on gets the puck.
       Rules: CLASSIC (one puck), or FRENZY (every third point drops two pucks at once,
       and each one that goes in counts).
       Modes: 1 player against a rival (each beaten rival unlocks the next), 2 players on
       one screen, and the attract demo (two rivals play while the title is up).
       Big goals (a rocket, a bank shot, the winner) get an instant replay; tap to skip.
   ===================================================================================== */
const S={mode:'title',t:0,paused:false,ot:0,shake:0,flash:0};
const G={P:mkPhys(),two:false,demo:true,ri:0,to:+store.get('hd-'+CAB.id+'-to','7')||7,rules:store.get('hd-'+CAB.id+'-rules','classic'),
  pl:[{},{}],ai:[null,null],ph:'idle',pt:0,serve:0,score:[0,0],round:0,
  msg:null,big:null,rec:[],replay:null,lastGoal:null,stats:null,tickets:0,result:null,idle:0,hum:[{hx:0,hz:0,vx:0,vz:0},{hx:0,hz:0,vx:0,vz:0}]};
if(![5,7,9].includes(G.to))G.to=7;if(G.rules!=='frenzy')G.rules='classic';
let BEAT=parseInt(store.get('hd-'+CAB.id+'-beat','-1'),10);if(!(BEAT>=-1))BEAT=-1;
G.ri=clamp(parseInt(store.get('hd-'+CAB.id+'-rival','0'),10)||0,0,Math.min(4,BEAT+1));
const MPH=v=>v*2.237;
const plName=i=>G.pl[i].name,plCol=i=>G.pl[i].col;

function newStats(){return {hits:[0,0],top:[0,0],rally:0,longest:0,banks:[0,0],saves:[0,0]};}
function setupPlayers(kind){
  if(kind==='demo'){G.pl=[{human:false,name:DEMO_A.name,col:DEMO_A.col,rv:DEMO_A},{human:false,name:DEMO_B.name,col:DEMO_B.col,rv:DEMO_B}];}
  else if(kind==='two'){G.pl=[{human:true,name:'P1',col:P1COL},{human:true,name:'P2',col:P2COL}];}
  else{const rv=RIVALS[G.ri];G.pl=[{human:true,name:'YOU',col:P1COL},{human:false,name:rv.name,col:rv.col,rv}];}
  G.ai=G.pl.map((p,i)=>p.human?null:mkAI(i,p.rv,(Math.random()*1e9)|0));
  for(let i=0;i<2;i++)setMalletColor(i,G.pl[i].col);
  LEDU.uC0.value.set(G.pl[0].col);LEDU.uC1.value.set(G.pl[1].col);
  for(const c of CHUTE)c.base.set(G.pl[c.sz>0?0:1].col);
  BOARD.neon[0].material.color.set(G.pl[0].col).multiplyScalar(3);BOARD.neon[1].material.color.set(G.pl[1].col).multiplyScalar(3);
}
function resetTable(){
  const P=G.P;P.pucks.length=0;P.ev.length=0;P.hits=0;
  for(let i=0;i<2;i++){const m=P.mal[i],z=SIDE[i]*(TB.HL-.2);m.x=m.tx=m.px=0;m.z=m.tz=m.pz=z;m.vx=m.vz=0;G.hum[i].hx=0;G.hum[i].hz=z;G.hum[i].vx=G.hum[i].vz=0;}
  for(const a of G.ai.concat(G.auto||[]))if(a){a.hx=0;a.hz=a.s*(TB.HL-a.rv.depth);a.hvx=a.hvz=0;a.strike=null;a.plan=null;a.hist=[];}
  G.rec.length=0;G.replay=null;
}
function startMatch(kind){
  G.two=kind==='two';G.demo=kind==='demo';setupPlayers(kind);resetTable();
  G.score=[0,0];G.round=0;G.stats=newStats();G.serve=G.demo?(Math.random()<.5?0:1):0;G.result=null;G.idle=0;
  G.ph='intro';G.pt=0;G.msg=null;G.big=null;G.P.air=1;
  S.mode='play';S.paused=false;
  if(!G.demo){setTrack('play');musicLevel(true);SFX.whoosh();}
  camStart(G.demo?'demo':G.two?'top':'p1');
}
function APP_start(){uiHide();startMatch('one');}
function APP_start2(){uiHide();startMatch('two');}
function APP_attract(){S.mode='title';S.paused=false;$('menu').hidden=true;document.body.classList.remove('paused');startMatch('demo');S.mode='title';setTrack('title');musicLevel(false);uiShow('title');}

/* ---------- serving: the puck is set down on the server's side (or, in a frenzy, two at the centre line) ---------- */
let PUCKN=0;
function serve(){
  const P=G.P;P.pucks.length=0;G.round++;
  const frenzy=G.rules==='frenzy'&&G.round>1&&G.round%3===0;
  if(frenzy){for(const sx of [-1,1]){const p=mkPuck(sx*.16,0);p.id=PUCKN++%3;p.vx=0;p.vz=(Math.random()<.5?-1:1)*.25;p.drop=0;P.pucks.push(p);}
    G.big={txt:'FRENZY!',sub:'2 PUCKS',col:'#ffd23f',t:0,dur:1.6};SFX.frenzy();say('Frenzy!');}
  else{const s=SIDE[G.serve],p=mkPuck((Math.random()-.5)*.06,s*.42);p.id=PUCKN++%3;p.drop=0;P.pucks.push(p);
    if(!G.demo)G.msg={txt:G.serve===0&&!G.two?'YOUR PUCK':plName(G.serve)+(G.two?' SERVES':' SERVES'),col:plCol(G.serve),t:0,dur:1.4};}
  /* each puck mesh is matched to its slot once per serve */
  P.pucks.forEach((p,i)=>{p.id=i;});
  G.ph='live';G.pt=0;G.stats.rally=0;G.lastTouch=-1;
  for(const a of G.ai.concat(G.auto||[]))if(a){a.hist=[];a.strike=null;a.plan=null;a.mt=0;}
  SFX.serve();
}
function matchPoint(){return Math.max(G.score[0],G.score[1])===G.to-1;}
function scored(scorer,ev){
  const p=ev.p,spd=Math.max(ev.spd,p.lastSpd*.9);
  G.score[scorer]++;G.serve=1-scorer;
  G.stats.top[scorer]=Math.max(G.stats.top[scorer],p.last===scorer?p.lastSpd:0);if(p.bank>0&&p.last===scorer)G.stats.banks[scorer]++;
  const human=G.pl[scorer].human,mine=!G.two&&scorer===0,theirs=!G.two&&scorer===1;
  const won=G.score[scorer]>=G.to;
  G.lastGoal={scorer,spd:p.last===scorer?p.lastSpd:spd,bank:p.last===scorer?p.bank:0,own:p.last!==scorer&&p.last>=0,t:S.t,won};
  /* the winning goal ends it: any other puck still out (a frenzy) is lifted off the table */
  if(won)for(const q of G.P.pucks)if(q!==p&&q.on){q.on=false;q.sink=0;}
  /* the light show: a ring of the scorer's colour runs out from the goal, the rails strobe, the chute lights */
  const sz=ev.side,ri=(G.ripI=(G.ripI||0)+1)%3;DU.uRip.value[ri].set(clamp(ev.x,-.15,.15),sz*TB.HL,S.t,1.6);DU.uRipC.value[ri].set(plCol(scorer)).multiplyScalar(1.4);
  if(scorer===0)LEDU.uFl1.value=1;else LEDU.uFl0.value=1;
  G.chuteFl=[sz,1];LT.goal.position.set(0,TB.DECK+.2,sz*(TB.HL-.15));LT.goal.color.set(plCol(scorer));LT.goalK=1;
  S.flash=.35;S.shake=Math.min(1,.35+G.lastGoal.spd*.06);
  SFX.drop();setTimeout(()=>{if(G.demo&&S.mode!=='title')return;(mine||G.two||G.demo?SFX.hornWin:SFX.hornLose)();},180);
  fxGoal(ev.x,sz,plCol(scorer));
  if(!G.demo){
    const mph=MPH(G.lastGoal.spd);
    G.big={txt:won?(G.two?plName(scorer)+' WINS':mine?'YOU WIN!':plName(scorer)+' WINS'):(G.lastGoal.own?'OWN GOAL!':mine||G.two?'GOAL!':plName(scorer)+' SCORES'),
      sub:G.lastGoal.own?'':(G.lastGoal.bank?'BANK SHOT  ':'')+(mph>=6?mph.toFixed(0)+' MPH':''),col:plCol(scorer),t:0,dur:won?2.6:1.7};
    if(!won&&matchPoint())setTimeout(()=>{if(S.mode==='play'&&!G.result){G.msg={txt:'MATCH POINT',col:'#ffd23f',t:0,dur:1.6};}},1500);
    say(won?(mine?'You win!':G.two?plName(scorer).replace('P','Player ')+' wins!':plName(scorer)+' wins'):(mine||G.two?'Goal!':''),.7,1);
    if(!G.two)ARC.score(G.score[0]);
  }
  for(const a of G.ai)if(a)aiAdapt(a,G.score[a.pi],G.score[1-a.pi]);
  if(matchPoint()&&!G.demo)setTrack('tense');
}
/* ---------- the human hands: a pointer puts the mallet where you point; keys and sticks push it ---------- */
const _ray=new THREE.Raycaster(),_ndc=new THREE.Vector2(),_hit=new THREE.Vector3(),DECKPL=new THREE.Plane(new THREE.Vector3(0,1,0),-(TB.DECK+.03));
function screenToDeck(cx,cy){
  _ndc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);_ray.setFromCamera(_ndc,CAM3);
  return _ray.ray.intersectPlane(DECKPL,_hit)?{x:_hit.x,z:_hit.z}:null;
}
const _pv=new THREE.Vector3();
function deckToScreen(x,z){_pv.set(x,TB.DECK,z).project(CAM3);return [(_pv.x+1)/2*innerWidth,(1-_pv.y)/2*innerHeight];}
/* which way is "away from me" on the screen for player pi (a finger keeps the mallet just ahead of itself) */
function awayDir(pi){const a=deckToScreen(0,SIDE[pi]*TB.HL),b=deckToScreen(0,0),dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [dx/l,dy/l];}
function pointerFor(pi){
  let best=null;
  for(const [id,p] of PT){if(p.type==='mouse')continue;
    if(p.pl<0){if(G.two){const h=screenToDeck(p.x0,p.y0);p.pl=h&&h.z<0?1:0;}else p.pl=0;}
    if(p.pl===pi&&(!best||p.t>best.t))best=p;}
  if(best)return best;
  if(pi===0&&MOUSE.on&&!touchy)return {x:MOUSE.x,y:MOUSE.y,type:'mouse'};
  return null;
}
function humanTick(pi,dt){
  const m=G.P.mal[pi],h=G.hum[pi],p=pointerFor(pi);
  if(p){let x=p.x,y=p.y;if(p.type!=='mouse'){const a=awayDir(pi),off=Math.min(30,innerHeight*.035);x+=a[0]*off;y+=a[1]*off;}
    const d=screenToDeck(x,y);if(d){[h.hx,h.hz]=clampMallet(m.side,d.x,d.z);h.vx=h.vz=0;malletAim(m,h.hx,h.hz,dt);G.idle=0;return;}}
  const st=stick(pi,G.two);
  /* screen directions -> the deck: the camera's right, and its up flattened onto the table */
  let vx=0,vz=0;
  if(st.on){_v1.set(1,0,0).applyQuaternion(CAM3.quaternion);_v2.set(0,1,0).applyQuaternion(CAM3.quaternion);_v1.y=0;_v2.y=0;_v1.normalize();
    if(_v2.lengthSq()<1e-4)_v2.set(0,0,-1).applyQuaternion(CAM3.quaternion).setY(0);_v2.normalize();
    const sp=TB.VMAL*.55;vx=(_v1.x*st.x+_v2.x*st.y)*sp;vz=(_v1.z*st.x+_v2.z*st.y)*sp;G.idle=0;}
  const k=Math.min(1,dt*(st.on?11:16));h.vx+=(vx-h.vx)*k;h.vz+=(vz-h.vz)*k;
  if(Math.abs(h.hx-m.x)>.08||Math.abs(h.hz-m.z)>.08){h.hx=m.x;h.hz=m.z;}
  h.hx+=h.vx*dt;h.hz+=h.vz*dt;[h.hx,h.hz]=clampMallet(m.side,h.hx,h.hz);
  malletAim(m,h.hx,h.hz,dt);
}
/* ---------- one tick of the match ---------- */
function gameTick(dt){
  const P=G.P;G.pt+=dt;
  if(G.msg){G.msg.t+=dt;if(G.msg.t>G.msg.dur)G.msg=null;}
  if(G.big){G.big.t+=dt;if(G.big.t>G.big.dur)G.big=null;}
  if(G.replay){replayTick(dt);return;}
  /* the hands move in every phase, so you can get ready */
  for(let i=0;i<2;i++){if(G.pl[i].human){if(G.auto&&G.auto[i])aiTick(G.auto[i],P,dt);else if(S.mode==='play')humanTick(i,dt);else malletAim(P.mal[i],P.mal[i].x,P.mal[i].z,dt);}else aiTick(G.ai[i],P,dt);}
  if(G.ph==='intro'){if(G.pt>(G.demo?.3:1.9))serve();}
  physStep(P,dt);
  /* the puck drop after a serve */
  for(const p of P.pucks)if(p.drop!=null&&p.drop<1)p.drop=Math.min(1,p.drop+dt*4);
  for(const e of P.ev){
    if(e.t==='mallet'){const k=clamp(e.imp/5,0,1);SFX.clack(k);fxHit(e.x,e.z,plCol(e.who),k);G.stats.hits[e.who]++;
      if(G.lastTouch!==e.who&&G.lastTouch>=0){G.stats.rally++;G.stats.longest=Math.max(G.stats.longest,G.stats.rally);}G.lastTouch=e.who;
      if(k>.6)S.shake=Math.max(S.shake,(k-.6)*.5);
      G.stats.top[e.who]=Math.max(G.stats.top[e.who],e.spd);}
    else if(e.t==='wall'){SFX.rail(clamp(e.imp/4,0,1));if(e.imp>1.5)fxSpark(e.x,e.z,'#ffffff',clamp(e.imp/6,0,1)*.6);}
    else if(e.t==='post'){SFX.post(clamp(e.imp/4,0,1));fxSpark(e.x,e.z,'#ffffff',.6);}
    else if(e.t==='puck')SFX.puck(clamp(e.imp/3,0,1));
    else if(e.t==='goal'&&G.ph==='live'){scored(e.side>0?1:0,e);}
  }
  P.ev.length=0;
  /* the puck's glide hiss and the blower */
  let fast=0;for(const p of P.pucks)if(p.on)fast=Math.max(fast,Math.hypot(p.vx,p.vz)/6);
  airTick(dt,S.mode==='play'&&!G.demo&&G.ph!=='over',fast);
  record();
  if(G.ph==='live'){
    const live=P.pucks.filter(p=>p.on);
    if(!live.length){
      const lg=G.lastGoal,won=lg&&lg.won;
      if(won){G.ph='end';G.pt=0;}
      else{G.ph='goal';G.pt=0;}
    }else{
      /* a puck that has stopped where nobody plays it gets a puff of air */
      for(const p of live){const sp=Math.hypot(p.vx,p.vz);p.still=sp<.04?(p.still||0)+dt:0;
        if(p.still>(G.pl[p.z>0?0:1].human?9:3.5)){p.still=0;p.vx=(-p.x)*.8+(Math.random()-.5)*.3;p.vz=-Math.sign(p.z||1)*.35;SFX.whoosh();}}
    }
  }
  else if(G.ph==='goal'){if(G.pt>(G.demo?1.2:1.5)){if(!G.demo&&wantReplay())startReplay();else serve();}}
  else if(G.ph==='end'){if(G.pt>(G.demo?1.2:1.4)){if(!G.demo&&wantReplay())startReplay();else matchOver();}}
}
/* ---------- the instant replay: the last few seconds, slowed, from a low angle ---------- */
function record(){
  const P=G.P,f={m:[P.mal[0].x,P.mal[0].z,P.mal[1].x,P.mal[1].z],p:P.pucks.map(p=>[p.x,p.z,p.ang,p.on?1:0,p.sink,p.sinkSide,p.sx,p.sz,p.hop,p.tilt,p.id,p.last])};
  G.rec.push(f);if(G.rec.length>330)G.rec.shift();
}
G.replays=0;
function wantReplay(){const lg=G.lastGoal;if(!lg||G.rec.length<60)return false;
  if(lg.won)return true;
  const good=lg.spd>=5.6||lg.bank>0&&lg.spd>3;if(!good||lg.own)return false;
  return G.lastReplayRound==null||G.round-G.lastReplayRound>=3;}
function startReplay(){
  const n=G.rec.length;let end=n-1;
  /* end shortly after the puck went in */
  for(let i=n-1;i>0;i--){if(G.rec[i].p.some(q=>q[3]===1)){end=Math.min(n-1,i+26);break;}}
  const start=Math.max(0,end-104);
  G.replay={frames:G.rec.slice(start,end+1),t:0,speed:.5,ph:G.ph,goalSide:G.lastGoal?SIDE[1-G.lastGoal.scorer]:1};
  G.lastReplayRound=G.round;G.replays++;camReplay(G.replay.goalSide);SFX.whoosh();
}
function replayFrame(){const r=G.replay;if(!r)return null;const i=Math.min(r.frames.length-1,r.t*60|0);return r.frames[i];}
function replayTick(dt){
  const r=G.replay;r.t+=dt*r.speed;
  const f=replayFrame();
  /* replay sounds: clacks where the puck changed direction hard */
  if(r.t*60>=r.frames.length-1||TAP||K('Space')||K('Enter')){
    const ph=r.ph;G.replay=null;camStart(G.two?'top':'p1',true);
    if(ph==='end')matchOver();else serve();
  }
}
/* ---------- the end of a match: tickets, unlocks, the card ---------- */
function matchOver(){
  if(G.demo){startMatch('demo');S.mode='title';return;}      /* the attract demo just plays again */
  G.ph='over';const w=G.score[0]>G.score[1]?0:1,me=!G.two;
  let tix=0;
  if(G.two)tix=8;
  else if(w===0)tix=15+G.ri*8+(G.score[0]-G.score[1]);
  else tix=Math.max(2,G.score[0]*2);
  G.tickets=tix;
  let unlocked=null;
  if(me&&w===0&&G.ri>BEAT){BEAT=G.ri;store.set('hd-'+CAB.id+'-beat',BEAT);if(G.ri<4)unlocked=RIVALS[G.ri+1].name;}
  const wins=+store.get('hd-'+CAB.id+'-wins-'+(G.two?'2p':RIVALS[G.ri].id),'0')||0;if(w===0||G.two)store.set('hd-'+CAB.id+'-wins-'+(G.two?'2p':RIVALS[G.ri].id),wins+1);
  G.result={w,unlocked,tix,score:G.score.slice(),stats:G.stats,champ:me&&w===0&&G.ri===4};
  S.mode='over';S.ot=0;
  ARC.over(G.score[0],tix);
  (me&&w===1?SFX.lose:SFX.win)();setTrack('over');musicLevel(false);
  if(me&&w===0&&G.ri===4)say('Champion!',.7,1);
  camStart(G.two?'top':'p1');
  uiShow('over');
}
