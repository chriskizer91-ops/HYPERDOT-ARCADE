/* =====================================================================================
   12. THE GAME — frames and balls, the pinsetter, the camera director, the AI bowler.
       Phases of one ball: aim -> swing -> roll -> pins (physics settles) -> tally -> sweep -> aim
   ===================================================================================== */
const S={mode:'title',t:0,ot:0,score:0,hi:parseInt(store.get('hd-'+CAB.id+'-hi','0'),10)||0,paused:false,demo:true,tickets:0,tshown:0,tacc:0,newHi:false,shake:0,parts:[],toast:null,games:0};
const PW=mkWorld(),AIW=mkWorld();
const SPIN=[-.9,-.5,0,.5,.9],SPINL=['HOOK <<','HOOK <','STRAIGHT','HOOK >','HOOK >>'];
const BSTYLES=[{a:[1,.1,.62],b:[.1,.85,1]},{a:[.35,1,.2],b:[1,.5,.05]},{a:[1,.25,.08],b:[1,.85,.2]},{a:[.55,.28,1],b:[.2,1,.75]}];
let BSTY=BSTYLES[0];
const NBR=[1023,1023,1023,1023];                                    /* the neighbouring lanes' racks */
const G={rolls:[],sheet:null,rs:null,ph:'aim',pt:0,x0:.18,kst:0,kph:0,kph2:0,kang:0,kpow:0,pang:0,pspd:0,spinI:1,shot:null,before:1023,after:1023,
  gut:false,hit:false,streak:0,fast:1,slowT:0,strobe:0,pinFlash:0,ai:null,mph:0,lastK:-1,crash:0,crashed:false,rph:0,wasSplit:false,over:false,
  auto:false,autoSkill:.7,swipeAim:false};
const popc=m=>{let n=0;while(m){n+=m&1;m>>=1;}return n;};
const jsh=i=>{const s=Math.sin(i*127.1+.7)*43758.5453;return s-Math.floor(s);};
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);}
/* spots within 12 in of each other are neighbours; a split = head pin down and the leave falls into 2+ groups */
const ADJ=SPOTS.map((a,i)=>SPOTS.reduce((m,b,j)=>j!==i&&Math.hypot(a[0]-b[0],a[1]-b[1])<.31?m|1<<j:m,0));
function isSplit(m){if(m&1||popc(m)<2)return false;let seen=0,groups=0;
  for(let i=0;i<10;i++){if(!(m>>i&1)||seen>>i&1)continue;groups++;let st=[i];seen|=1<<i;while(st.length){const k=st.pop();const nb=ADJ[k]&m&~seen;for(let j=0;j<10;j++)if(nb>>j&1){seen|=1<<j;st.push(j);}}}
  return groups>1;}
function newGame(demo){
  Object.assign(G,{rolls:[],sheet:sheet([]),ph:'aim',pt:0,x0:.18,kst:0,spinI:1,streak:0,over:false,ai:null,mph:0,lastK:-1,wasSplit:false,strobe:0,pinFlash:0,slowT:0,fast:1});
  S.score=0;S.demo=demo;S.toast=null;BSTY=pick(BSTYLES);
  rackAll(PW,true);PW.sw.on=false;PS.on=false;DMD.on=false;
  for(let j=0;j<4;j++)NBR[j]=nbRack();
  startAim();
}
function nbRack(){if(Math.random()<.45)return 1023;let m=0;for(let i=0;i<10;i++)if(Math.random()<.3)m|=1<<i;return m;}
function APP_start(){newGame(false);S.mode='play';S.paused=false;setTrack('play');SFX.confirm();}
function APP_attract(){newGame(true);S.mode='title';setTrack('title');}
function startAim(){
  Object.assign(G,{ph:'aim',pt:0,kst:0,pang:0,pspd:0,gut:false,hit:false,crash:0,crashed:false,mph:0,fast:1,swipeAim:false,ai:null});
  G.rs=rackState(G.rolls);ballToHand();G.before=standMask(PW);
  if(Math.random()<.35){const j=Math.random()*4|0;NBR[j]=nbRack();}
  if(S.demo||G.auto)aiStart();
  if(S.mode==='play')setTrack(G.rs.f===9?'tenth':'play');
}
/* the ball in hand turns slowly and breathes a little, showing off its swirl and finger holes */
function ballToHand(){const b=PW.ball,yw=Math.sin(S.t*.7)*.9,tl=-.35;b.on=true;b.kin=true;b.sleep=false;b.gone=false;b.vx=b.vy=b.vz=b.wx=b.wy=b.wz=0;
  const cy=Math.cos(yw/2),sy=Math.sin(yw/2),cx=Math.cos(tl/2),sx=Math.sin(tl/2);b.qw=cx*cy;b.qx=sx*cy;b.qy=cx*sy;b.qz=-sx*sy;syncRot(b);
  b.x=G.x0;b.y=.46+Math.sin(S.t*2.1)*.004;b.z=-.36;}
const spdFrom=pw=>6+3.6*clamp(pw,0,1);                           /* 13.4 .. 21.5 mph */
function throwBall(x0,ang,spd,spin){
  if(G.ph!=='aim')return;
  G.shot={x0,ang:clamp(ang,-.075,.075),spd:clamp(spd,5.4,10),spin:clamp(spin,-1,1)};G.shot.revs=24+12*Math.abs(G.shot.spin);
  G.ph='swing';G.pt=0;G.mph=G.shot.spd*2.237;G.before=standMask(PW);G.ai=null;SFX.swoosh();
}
/* the arm swing: back and up toward the camera, then down through the release point on the lane */
function swingPos(b,t){const s=G.shot,x=s.x0;
  if(t<.22){const u=sstep(0,.22,t);b.x=x+.05*u;b.y=lerp(.46,.8,u);b.z=lerp(-.36,-1.12,u);}
  else{const u=clamp((t-.22)/.28,0,1),v=u*u,a=1-v;          /* quadratic Bezier (accelerating forward swing) */
    b.x=a*a*(x+.05)+2*a*v*(x+.02)+v*v*x;b.y=a*a*.8+2*a*v*.06+v*v*(BR+.025);b.z=a*a*-1.12+2*a*v*-.7+v*v*.35;}
  const ang=t*-3.5;b.qw=Math.cos(ang/2);b.qx=Math.sin(ang/2);b.qy=b.qz=0;syncRot(b);}
function evalRoll(){
  const after=standMask(PW),rs=rackState(G.rolls),k=clamp(popc(G.before)-popc(after&G.before),0,rs.left);
  G.rolls.push(k);G.sheet=sheet(G.rolls);S.score=G.sheet.total;G.lastK=k;G.after=after;
  const strike=rs.fresh&&k===10,spare=!rs.fresh&&k===rs.left,split=rs.fresh&&k<10&&isSplit(after);
  G.streak=strike?G.streak+1:0;
  if(strike){const n=G.streak,perfect=G.rolls.length===12&&G.sheet.total===300;
    if(perfect){dmd('perfect','PERFECT GAME','300');SFX.perfect();say('Perfect game!');maskMsg('300',4);}
    else if(n===3){dmd('turkey','TURKEY!');SFX.turkey();say('Turkey!');maskMsg('TURKEY',3);}
    else if(n===2){dmd('strike','DOUBLE!','X X');SFX.strike();say('Double!');maskMsg('DOUBLE',2.6);}
    else if(n>=4){dmd('bagger',n+' BAGGER!');SFX.strike();say(n+' bagger!');maskMsg(n+' IN A ROW',2.6);}
    else{dmd('strike','STRIKE!','X');SFX.strike();say('Strike!');maskMsg('STRIKE!',2.6);}
    G.strobe=1;G.pinFlash=1;confetti(n>=3?70:40);}
  else if(spare){dmd('spare',G.wasSplit?'SPLIT PICKED!':'SPARE!');SFX.spare();say('Spare!');G.strobe=.55;maskMsg('SPARE!',2.2);confetti(18);}
  else if(k===0&&G.gut){dmd('gutter','GUTTER BALL');SFX.sad();say('Gutter ball.');}
  else if(split){const ten=after===(1<<6|1<<9);dmd('split',ten?'7-10 SPLIT!':'SPLIT!');SFX.split();if(ten)say('Seven ten split!');}
  else S.toast={txt:k===0?'MISS':String(k),sub:k===0?'':k===1?'PIN':'PINS',t:0};
  G.wasSplit=split;
  if(!S.demo)ARC.score(S.score);
  G.ph='tally';G.pt=0;
}
/* ---------- the pinsetter: sweep bar guards, table lifts the standing pins, sweep clears deadwood, table re-sets ---------- */
const PS={on:false,t:0,fresh:false,dur:0,ty:.98,held:0,grab:false,drop:false,cleared:false,pos:[]};
const kf=(t,a,b,v0,v1)=>v0+(v1-v0)*sstep(a,b,t);
function psStart(fresh){Object.assign(PS,{on:true,t:0,fresh,dur:fresh?2.35:3.05,ty:.98,held:0,grab:false,drop:false,cleared:false});
  const s=PW.sw;s.y=.8;s.z=17.98;s.vy=s.vz=0;s.on=false;PW.ball.on=false;SFX.sweep();
  /* re-spot exactly the pins the sheet counted as standing (one that toppled since goes back on its spot) */
  if(!fresh){PS.held=G.after;for(let i=0;i<10;i++){const p=PW.pins[i];PS.pos[i]=pinUp(p)?[p.x-p.ax*PCOM,p.z-p.az*PCOM]:[SPOTS[i][0],SPOTS[i][1]];}}}
function psHold(p,x,z,ty){p.kin=true;p.sleep=true;p.on=true;p.gone=false;p.x=x;p.z=z;p.y=ty-.392+PCOM;p.qw=1;p.qx=p.qy=p.qz=0;syncRot(p);}
function psTick(dt){
  if(!PS.on)return;const t=(PS.t+=dt),f=PS.fresh,s=PW.sw;let sy,sz,ty;
  if(f){sy=t<1.8?kf(t,0,.4,.8,.015):kf(t,1.9,2.3,.015,.8);sz=t<1.1?kf(t,.4,1.1,17.98,19.4):kf(t,1.1,1.5,19.4,17.98);ty=t<1.75?kf(t,1.15,1.75,.98,.392):kf(t,1.8,2.2,.392,.98);}
  else{sy=t<2.55?kf(t,0,.4,.8,.015):kf(t,2.6,3.0,.015,.8);sz=t<1.65?kf(t,.95,1.65,17.98,19.4):kf(t,1.65,2.05,19.4,17.98);
    ty=t<.6?kf(t,.2,.6,.98,.392):t<2?kf(t,.65,1.05,.392,.98):t<2.45?kf(t,2,2.45,.98,.392):kf(t,2.5,2.9,.392,.98);}
  s.vy=(sy-s.y)/Math.max(dt,1e-4);s.vz=(sz-s.z)/Math.max(dt,1e-4);s.y=sy;s.z=sz;s.on=sy<.3;PS.ty=ty;
  if(Math.abs(s.vz)>.05)for(const p of PW.pins)if(p.on&&!p.kin&&p.z>sz-.2&&p.z<sz+.4)wake(p);
  if(!f){
    if(!PS.grab&&t>=.6){PS.grab=true;SFX.clunk();for(let i=0;i<10;i++)if(PS.held>>i&1)psHold(PW.pins[i],PS.pos[i][0],PS.pos[i][1],ty);}
    if(PS.grab&&!PS.drop)for(let i=0;i<10;i++)if(PS.held>>i&1)PW.pins[i].y=ty-.392+PCOM;
    if(!PS.cleared&&t>=1.7){PS.cleared=true;for(const p of PW.pins)if(!p.kin){p.on=false;p.gone=true;}}
    if(!PS.drop&&t>=2.45){PS.drop=true;SFX.set();for(let i=0;i<10;i++)if(PS.held>>i&1)placePin(PW.pins[i],PS.pos[i][0],0,PS.pos[i][1],false);}
  }else{
    if(!PS.cleared&&t>=1.12){PS.cleared=true;for(let i=0;i<10;i++)psHold(PW.pins[i],SPOTS[i][0],SPOTS[i][1],ty);}
    if(PS.cleared&&!PS.drop)for(const p of PW.pins)p.y=ty-.392+PCOM;
    if(!PS.drop&&t>=1.75){PS.drop=true;SFX.set();rackAll(PW,true);}
  }
  if(t>=PS.dur){PS.on=false;s.on=false;s.y=.8;}
}
/* ---------- the camera director ---------- */
const CAM={e:[0,1.16,-2.95],t:[0,.04,9.5],tn:.255};
const PIPC={e:[0,.6,16.55],t:[0,.17,18.7],tn:.2,on:false,x:0,y:0,w:0,h:0};
const AIMU={x:0,a:0,on:false,al:0};
function camTick(dt){
  const b=PW.ball;let k=3.5,ex,ey,ez,tx,ty,tz,tn;
  const aimV=()=>{ex=G.x0*.55;ey=1.16;ez=-2.95;tx=G.x0*.25;ty=.04;tz=9.5;tn=.255;};
  const pinV=()=>{const d=sstep(0,4,G.ph==='pins'?G.pt:4)*.3;ex=0;ey=.84-d*.1;ez=14.95+d;tx=0;ty=.2;tz=18.75;tn=.28;};
  switch(G.ph){
    case 'aim':aimV();k=4;break;
    case 'swing':aimV();k=1.2;break;
    case 'roll':{const s=sstep(3,15,b.z);ex=b.x*.55*(1-s);ey=lerp(1.02,.82,s);ez=Math.min(b.z-2.7,14.95);tx=b.x*.45*(1-s);ty=lerp(.1,.16,s);tz=Math.min(b.z+5.5,18.75);tn=lerp(.25,.27,s);k=6;break;}
    case 'sweep':if(PS.t<(PS.fresh?1.05:1.55))pinV();else aimV();k=2.6;break;
    default:pinV();k=3;
  }
  if(S.mode==='over'){ex=Math.sin(S.ot*.25)*.35;ey=.95;ez=15.5;tx=0;ty=.22;tz=18.8;tn=.28;k=.8;}
  const a=1-Math.exp(-k*dt);
  CAM.e[0]+=(ex-CAM.e[0])*a;CAM.e[1]+=(ey-CAM.e[1])*a;CAM.e[2]+=(ez-CAM.e[2])*a;
  CAM.t[0]+=(tx-CAM.t[0])*a;CAM.t[1]+=(ty-CAM.t[1])*a;CAM.t[2]+=(tz-CAM.t[2])*a;CAM.tn+=(tn-CAM.tn)*a;
  /* the pin-cam inset while the main camera is far from the deck */
  const far=CAM.e[2]<9;PIPC.on=far&&S.mode!=='over'&&(G.ph==='aim'||G.ph==='swing'||G.ph==='roll'||G.ph==='sweep');
  PIPC.w=Math.round(W*.27);PIPC.h=Math.round(PIPC.w*.6);PIPC.x=W-PIPC.w-3;PIPC.y=sheetH()+4;
}
/* project a world point to matrix pixels with the main camera (same maths as the shader) */
const PJ=new Float32Array(9);
function proj(x,y,z){camMat(PJ,CAM.e,CAM.t);const vx=x-CAM.e[0],vy=y-CAM.e[1],vz=z-CAM.e[2],zc=vx*PJ[6]+vy*PJ[7]+vz*PJ[8];if(zc<.05)return null;
  return [((vx*PJ[0]+vy*PJ[1]+vz*PJ[2])/(zc*CAM.tn)/(W/H)*.5+.5)*W,(.5-(vx*PJ[3]+vy*PJ[4]+vz*PJ[5])/(zc*CAM.tn)*.5)*H,zc];}
/* ---------- the AI bowler (attract mode and the soak autopilot) ----------
   It picks a target (the 1-3 pocket, or the key pin of a spare), then finds the launch angle by
   bisection, running the real ball physics in a scratch world: one probe roll per tick. Human
   error is added afterwards, scaled by skill. */
function aiStart(){
  const m=standMask(PW),fresh=m===1023,sk=S.demo?.8:G.autoSkill;let x0,tx,tz,spin,spd;
  if(fresh){spin=-(.45+Math.random()*.35);spd=7.3+Math.random()*1.2;x0=.13+Math.random()*.15;tx=.085;tz=LN.head-.4;}
  else{let kp=-1;
    for(let i=0;i<10;i++)if(m>>i&1){const p=PW.pins[i];if(kp<0||p.z<PW.pins[kp].z-.05||(Math.abs(p.z-PW.pins[kp].z)<.05&&Math.abs(p.x)<Math.abs(PW.pins[kp].x)))kp=i;}
    if(kp<0){kp=0;}let sx=0,n=0;for(let i=0;i<10;i++)if(m>>i&1){sx+=PW.pins[i].x;n++;}
    const kx=PW.pins[kp].x,mx=n?sx/n:kx;tx=clamp(kx+(mx-kx)*.45,-.43,.43);tz=PW.pins[kp].z-.3;
    spin=-.18;spd=7.5+Math.random()*.7;x0=clamp(-tx*.75+.04,-.36,.36);}
  const err=(1-sk)*.011+.0011;let wild=0;if(G.auto&&!S.demo&&Math.random()<.05)wild=(Math.random()<.5?-1:1)*.06;
  G.ai={x0,tx,tz,spin,spd,lo:-.08,hi:.08,k:0,t:0,think:.8+Math.random()*.7,err:gauss()*err+wild,serr:gauss()*(1.1-sk)};
}
function aiPathX(x0,ang,spd,spin,tz){const P=AIW;for(const p of P.pins)p.on=false;P.sw.on=false;launch(P,x0,ang,spd,spin,24+12*Math.abs(spin));
  for(let i=0;i<HZ*5;i++){physStep(P,1/HZ);P.nev=0;const b=P.ball;if(!b.on)return NaN;if(Math.abs(b.x)>LN.hw+.01)return b.x>0?2:-2;if(b.z>=tz)return b.x;}return NaN;}
function aiTick(dt){const A=G.ai;if(!A)return;A.t+=dt;
  G.x0+=clamp(A.x0-G.x0,-dt*.7,dt*.7);
  if(A.k<11){const m=(A.lo+A.hi)/2,x=aiPathX(A.x0,m,A.spd,A.spin,A.tz);if(!(x<A.tx))A.hi=m;else A.lo=m;A.k++;}
  else{A.ang=(A.lo+A.hi)/2+A.err;if(A.t>A.think&&Math.abs(G.x0-A.x0)<.004)throwBall(G.x0,A.ang,A.spd*(1+A.serr*.025),clamp(A.spin+A.serr*.15,-1,1));}
}
/* ---------- pointer gestures: drag sideways = move, swipe up = bowl (curl at the end = hook) ----------
   Samples carry the events' own timestamps and include coalesced moves, so a busy frame never
   flattens a flick. Power comes from the fastest forward-swing speed in the last 250 ms (a flick
   that stops before release still counts); aim from the whole forward stroke; hook from how far
   the last third of the stroke turns away from it. */
const GST={down:false,id:null,pts:[],x0:0,y0:0,lowI:0,mode:'',rel:false,fresh:false,sx:0};
function gstPush(x,y,t){const P=GST.pts;if(P.length>=220){P.splice(0,60);GST.lowI=Math.max(0,GST.lowI-60);}P.push([x,y,t]);if(y>=P[GST.lowI][1])GST.lowI=P.length-1;}
cv.addEventListener('pointerdown',e=>{GST.down=true;GST.id=e.pointerId;GST.pts.length=0;GST.lowI=0;gstPush(e.clientX,e.clientY,e.timeStamp);
  GST.x0=e.clientX;GST.y0=e.clientY;GST.mode='';GST.rel=false;GST.fresh=true;});
addEventListener('pointermove',e=>{if(!GST.down||e.pointerId!==GST.id)return;const ce=e.getCoalescedEvents?e.getCoalescedEvents():null;
  if(ce&&ce.length)for(const c of ce)gstPush(c.clientX,c.clientY,c.timeStamp);else gstPush(e.clientX,e.clientY,e.timeStamp);});
addEventListener('pointerup',e=>{if(!GST.down||e.pointerId!==GST.id)return;gstPush(e.clientX,e.clientY,e.timeStamp);GST.down=false;GST.rel=true;});
addEventListener('pointercancel',e=>{if(e.pointerId===GST.id){GST.down=false;GST.rel=false;GST.mode='';}});
/* the forward stroke: from the lowest point (end of any back-swing) to the latest sample */
function stroke(){const P=GST.pts,n=P.length,lo=P[GST.lowI],l=P[n-1];if(!lo||!l)return null;
  const fx=l[0]-lo[0],fy=l[1]-lo[1];let peak=0;
  for(let i=Math.max(GST.lowI+1,1);i<n;i++){let j=i-1;while(j>GST.lowI&&P[i][2]-P[j][2]<40)j--;const dt=P[i][2]-P[j][2];if(dt<8||l[2]-P[i][2]>250)continue;
    const v=-(P[i][1]-P[j][1])/dt*1000;if(v>peak)peak=v;}
  let len=0;for(let i=GST.lowI+1;i<n;i++)len+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);
  let k=n-1,acc=0;while(k>GST.lowI+1&&acc<len*.33){acc+=Math.hypot(P[k][0]-P[k-1][0],P[k][1]-P[k-1][1]);k--;}
  const tx=l[0]-P[k][0],ty=l[1]-P[k][1],curl=Math.hypot(tx,ty)>4?Math.atan2(tx,-ty)-Math.atan2(fx,-fy):0;
  return {fx,fy,peak,curl};}
const swPow=v=>clamp((v-150)/1450,0,1);
function gestureAim(){
  if(GST.fresh){GST.fresh=false;GST.sx=G.x0;}
  const P=GST.pts,last=P[P.length-1];if(!last)return;
  if(GST.down){const dx=last[0]-GST.x0,dy=last[1]-GST.y0;
    if(!GST.mode&&Math.hypot(dx,dy)>10)GST.mode=Math.abs(dx)>Math.abs(dy)*1.25?'slide':'swing';
    if(GST.mode==='slide'){G.x0=clamp(GST.sx+dx*(2.5/RECT.w),-.42,.42);G.kst=0;}
    if(GST.mode==='swing'){const s=stroke();if(s&&s.fy<-6){G.pang=clamp(Math.atan2(s.fx,-s.fy)*.1,-.07,.07);G.swipeAim=true;G.pspd+=(swPow(s.peak)-G.pspd)*.5;}}}
  if(GST.rel){GST.rel=false;
    if(GST.mode==='swing'){const s=stroke();
      if(s&&s.fy<-28&&s.peak>60){const ang=clamp(Math.atan2(s.fx,-s.fy)*.1,-.07,.07),spin=clamp(s.curl/.45,-1,1);
        throwBall(G.x0,ang,spdFrom(swPow(s.peak)),Math.abs(spin)<.12?0:spin);}}
    GST.mode='';G.swipeAim=false;G.pspd=0;}
}
function playerAim(dt,c,e){
  if(e.b){G.spinI=(G.spinI+1)%SPIN.length;SFX.select();}
  if(G.kst===0){if(Math.abs(c.x)>.2)G.x0=clamp(G.x0+c.x*dt*.5,-.42,.42);if(e.a){G.kst=1;G.kph=0;SFX.select();}}
  else if(G.kst===1){G.kph+=dt*2.3;G.kang=Math.sin(G.kph)*.052;if(e.a){G.kst=2;G.kph2=0;SFX.select();}else if(e.d){G.kst=0;SFX.back();}}
  else{G.kph2+=dt*2.7;G.kpow=.5-.5*Math.cos(G.kph2);if(e.a)throwBall(G.x0,G.kang,spdFrom(G.kpow),SPIN[G.spinI]);else if(e.d){G.kst=1;SFX.back();}}
  gestureAim();
}
/* ---------- one simulation tick of the alley ---------- */
function gameTick(dt,c,e,tap){
  G.pt+=dt;
  if(!S.demo&&(G.ph==='pins'||G.ph==='tally'||G.ph==='sweep')&&(tap||e.a))G.fast=3;
  let ts=G.fast;if(G.slowT>0){G.slowT-=dt;ts*=lerp(1,.28,sstep(0,.18,G.slowT));}
  const dtp=dt*ts,n=Math.max(4,Math.ceil(4*ts-1e-6)),sdt=dtp/n;
  const busy=G.ph==='roll'||G.ph==='pins'||G.ph==='tally'||G.ph==='sweep'||G.ph==='done';
  if(busy){PW.nev=0;for(let i=0;i<n;i++){physStep(PW,sdt);if(PW.nev>=PW.ev.length-8)impacts();}impacts();}
  const b=PW.ball;
  switch(G.ph){
    case 'aim':
      if(S.demo||G.auto)aiTick(dt);else if(S.mode==='play')playerAim(dt,c,e);
      if(G.ph==='aim')ballToHand();
      AIMU.x=G.x0;AIMU.on=S.mode==='play'&&!G.auto||(G.ai&&G.ai.ang!=null);
      AIMU.a=G.ai&&G.ai.ang!=null?G.ai.ang:G.swipeAim?G.pang:G.kst?G.kang:0;AIMU.al=G.ai?.55:G.kst===0&&!G.swipeAim?.35:1;break;
    case 'swing':AIMU.on=false;swingPos(b,G.pt);
      if(G.pt>=.5){const s=G.shot;launch(PW,s.x0,s.ang,s.spd,s.spin,s.revs);G.ph='roll';G.pt=0;SFX.land();S.shake=Math.max(S.shake,.15);}break;
    case 'roll':if(b.on&&b.gut&&!G.gut&&b.z<LN.head){G.gut=true;SFX.gutter();}
      if(!b.on||b.z>LN.head-1||G.pt>8){G.ph='pins';G.pt=0;}break;
    case 'pins':{const done=!b.on||b.z>LN.pit+.05;if((settled(PW)&&done&&G.pt>1.1)||G.pt>6)evalRoll();break;}
    case 'tally':if(G.pt>.55){const rs=rackState(G.rolls);if(rs.over){G.ph='done';G.pt=0;G.over=true;}else{psStart(rs.fresh);G.ph='sweep';G.pt=0;}}break;
    case 'sweep':psTick(dtp);if(!PS.on)startAim();break;
    case 'done':if(S.mode!=='over'&&G.pt>(DMD.on?DMD.dur-DMD.t+.5:1.4)){if(S.demo)newGame(true);else gameOver();}break;
  }
  if(G.strobe>0)G.strobe=Math.max(0,G.strobe-dt*.5);if(G.pinFlash>0)G.pinFlash=Math.max(0,G.pinFlash-dt*1.2);
}
function gameOver(){
  S.mode='over';S.ot=0;const sc=G.sheet.total;S.score=sc;
  let tk=Math.max(3,Math.round(sc/10));if(sc>=300)tk=500;else if(sc>=200)tk+=80;S.tickets=tk;S.tshown=0;S.tacc=0;
  S.newHi=sc>S.hi;if(S.newHi){S.hi=sc;store.set('hd-'+CAB.id+'-hi',sc);}
  setTrack('over');if(sc>=200)SFX.win();else SFX.lose();say(sc>=300?'Perfect!':sc>=200?'What a game!':'Game over.');ARC.over(sc,tk);S.games++;
}
function overTick(dt){S.ot+=dt;if(S.ot>.9&&S.tshown<S.tickets){S.tacc+=dt*(S.tickets>80?70:16);while(S.tacc>=1&&S.tshown<S.tickets){S.tshown++;S.tacc--;SFX.ticket();}}
  if(S.ot>40)APP_attract();}
/* =====================================================================================
   13. AUDIO GLUE — collision events from the solver become clacks, thocks and the crash;
       the rolling rumble follows the ball's speed, the gutter, and its revolutions.
   ===================================================================================== */
function impacts(){const P=PW;let bp=0,pp=0,pf=0,pw=0,bw=0,be=null,pe=null;
  for(let i=0;i<P.nev;i++){const e=P.ev[i],s=e.s;
    if(e.tag===T_BP){if(s>bp){bp=s;be=e;}}else if(e.tag===T_PP){if(s>pp){pp=s;pe=e;}G.crash+=s;}
    else if(e.tag===T_PF||e.tag===T_PG){if(s>pf)pf=s;}else if(e.tag===T_PW){if(s>pw)pw=s;}else if(e.tag===T_BW||e.tag===T_BG){if(s>bw)bw=s;}}
  if(bp>.4){SFX.thock(bp/5);spark(be.x,be.y,be.z,bp);if(!G.hit){G.hit=true;if(bp>2.5&&!reduce)G.slowT=.42;S.shake=Math.min(1,bp/5);}}
  if(pp>.5){SFX.clack(pp/4);if(pp>2.2)spark(pe.x,pe.y,pe.z,pp*.6);}
  if(pf>.6)SFX.clatter(pf/3);if(pw>.6)SFX.wall(pw/4);if(bw>.9&&G.ph!=='swing')SFX.clunk();
  if(!G.crashed&&G.crash>16){G.crashed=true;SFX.crash(Math.min(1,G.crash/34));}
  P.nev=0;
}
function rumbleTick(dt){rumbleInit();const b=PW.ball;let lv=0,fq=110,hum=0;
  if(b.on&&!b.kin&&!S.paused&&S.mode!=='over'){const sp=Math.hypot(b.vx,b.vz),dz=Math.max(0,b.z-CAM.e[2]-2),on=b.floor?1:.12;
    G.rph+=Math.hypot(b.wx,b.wy,b.wz)*dt;const thump=.8+.2*Math.max(0,Math.sin(G.rph));
    lv=clamp(sp/8,0,1)*.34*on*thump/(1+dz*.05);fq=55+sp*17;hum=lv*.6;if(b.gut){fq*=1.9;lv*=1.25;hum*=.3;}}
  rumbleSet(lv,fq,hum);}
/* =====================================================================================
   14. AMBER DMD BAND — strikes, spares, turkeys, splits and gutter balls get a short cartoon in
       the alley-monitor tradition: drawn in greys on a small canvas, quantised to 16 amber
       steps with an ordered dither, and stamped across the top band of the matrix.
   ===================================================================================== */
const DMC=document.createElement('canvas'),dg=DMC.getContext('2d',{willReadFrequently:true});let BH=43,BIMG=null,B32=null;
RESCB.push(()=>{BH=Math.round(H*.3);DMC.width=W;DMC.height=BH;BIMG=g.createImageData(W,BH);B32=new Uint32Array(BIMG.data.buffer);});
const DMD={on:false,kind:'',t:0,dur:2.5,txt:'',sub:''};
function dmd(kind,txt,sub){Object.assign(DMD,{on:true,kind,t:0,txt,sub:sub||'',dur:kind==='perfect'?4.4:kind==='turkey'?3:2.6});}
const gy=l=>{const v=c255(l*255);return 'rgb('+v+','+v+','+v+')';};
const eob=u=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2);};
function dBall(x,y,r,a,l,face){dg.fillStyle=gy(l);dg.beginPath();dg.arc(x,y,r,0,TAU);dg.fill();
  if(face){dg.fillStyle='#000';dg.fillRect(x-r*.45,y-r*.3,Math.max(1,r*.22),Math.max(1,r*.3));dg.fillRect(x+r*.22,y-r*.3,Math.max(1,r*.22),Math.max(1,r*.3));
    dg.beginPath();dg.arc(x,y+r*.55,r*.32,Math.PI*1.15,Math.PI*1.85);dg.lineWidth=Math.max(1,r*.12);dg.strokeStyle='#000';dg.stroke();return;}
  dg.fillStyle=gy(l*.25);const c=Math.cos(a),s=Math.sin(a);
  for(const [hx,hy,hr] of [[-.3,-.28,.15],[.08,-.42,.14],[.06,.08,.17]]){dg.beginPath();dg.arc(x+(hx*c-hy*s)*r,y+(hx*s+hy*c)*r,hr*r,0,TAU);dg.fill();}
  dg.fillStyle=gy(1);dg.beginPath();dg.arc(x-r*.42,y-r*.42,r*.13,0,TAU);dg.fill();}
function dPin(cx,cy,s,a,l){dg.save();dg.translate(cx,cy);dg.rotate(a);dg.translate(0,7*s);dg.fillStyle=gy(l);
  dg.beginPath();dg.ellipse(0,-4.5*s,2.4*s,4.4*s,0,0,TAU);dg.fill();dg.fillRect(-.95*s,-10.6*s,1.9*s,4.4*s);
  dg.beginPath();dg.arc(0,-12.6*s,1.4*s,0,TAU);dg.fill();dg.fillStyle=gy(l*.35);dg.fillRect(-1.05*s,-9.7*s,2.1*s,.55*s);dg.fillRect(-1*s,-8.8*s,2*s,.55*s);dg.restore();}
function dStar(x,y,r,l){if(l<=0||r<=0)return;dg.fillStyle=gy(l);dg.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,q=i&1?r*.3:r;dg.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}dg.fill();}
/* a word centred at (cx,cy), scale may be fractional; wave = per-letter bounce amplitude */
function dWord(s,cx,cy,sc,l,wave,t,out){const w=tw5(s,1);dg.save();dg.translate(Math.round(cx),Math.round(cy));dg.scale(sc,sc);
  let x=-w/2;for(let i=0;i<s.length;i++){const yy=-3.5+(wave?Math.sin(t*9-i*.8)*wave:0);if(out!==false)for(const [ox,oy] of O8)txt5(dg,s[i],x+ox/sc,yy+oy/sc,'#000',1);txt5(dg,s[i],x,yy,gy(l),1);x+=6;}dg.restore();}
function wordScale(s,w,h){return Math.max(1,Math.min(Math.floor((h-4)/9),Math.floor((w-10)/tw5(s,1))));}
function fireworks(t,w,h,n,seed){for(let k=0;k<n;k++){const t0=jsh(seed+k)*1.6,u=t-t0;if(u<0||u>1.1)continue;const cx=w*(.1+.8*jsh(seed+k*3.1)),cy=h*(.2+.4*jsh(seed+k*7.7));
  for(let i=0;i<14;i++){const a=i/14*TAU,r=u*h*.55;dg.fillStyle=gy(1-u*.8);dg.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*r+u*u*h*.3,1.4,1.4);}}}
function dmdDraw(){
  const w=W,h=BH,t=DMD.t,k=DMD.kind,T=DMD.txt,cy=h/2;dg.setTransform(1,0,0,1,0,0);dg.fillStyle='#000';dg.fillRect(0,0,w,h);
  const SC=wordScale(T,w,h);
  if(k==='strike'||k==='bagger'){
    /* beat 1: the ball barrels in and the rack explodes; beat 2: impact frame; beat 3: the word slams in */
    const hit=.4,px=w*.6,ps=h*.05;
    if(t<hit+.08){const u=clamp(t/hit,0,1),bx=lerp(-h*.3,px-h*.26,Math.pow(u,1.5));
      for(let i=0;i<5;i++){dg.fillStyle=gy(.25+.12*i);dg.fillRect(bx-h*.32-i*9-(t*90%9),cy+h*(-.14+.08*i),6+i*3,1);}dBall(bx,cy+h*.14,h*.22,t*16,.9);}
    for(let i=0;i<4;i++){const bx0=px+(i-1.5)*h*.22,pcy=cy+h*.1;
      if(t<hit)dPin(bx0,pcy,ps,Math.sin(t*30+i)*(t>hit-.06?.25:0),.92);
      else{const u=t-hit,vx=(i-1.2)*w*1.1+w*.35,vy=-h*(3.2+jsh(i)*2.2);if(u<.6)dPin(bx0+vx*u,pcy+vy*u+h*9*u*u,ps,(i-1.4)*16*u,.92);}}
    if(t>hit&&t<hit+.06){dg.fillStyle='#fff';dg.fillRect(0,0,w,h);}
    if(t>hit)for(let i=0;i<14;i++){const a=i*2.39,r=(t-hit)*w*.7*(.4+jsh(i+3));dStar(px+Math.cos(a)*r,cy+Math.sin(a)*r*.45,1.5+2*Math.abs(Math.sin(t*14+i)),.9*(1-clamp((t-hit)/1.1,0,1)));}
    if(k==='bagger')fireworks(t-.4,w,h,6,11);
    if(t>hit+.16){const u=clamp((t-hit-.16)/.3,0,1),sc=u<1?SC*(1+(1-eob(u))*2.4):SC;dWord(T,w/2,cy+(u<1?0:Math.sin(t*6)*.6),sc,1,0,t);}}
  else if(k==='perfect'){fireworks(t,w,h,9,3);fireworks(t-1.6,w,h,9,29);const fl=(t*5|0)%2,s2=Math.max(1,Math.min(Math.floor((h-6)/18),Math.floor((w-10)/tw5(T,1))));
    dWord(T,w/2,h*.28,s2,1,1.2,t);dWord('300',w/2,h*.74,s2,fl?1:.55,0,t);}
  else if(k==='turkey'){
    const x=lerp(w+h*.7,-h*.7,t/DMD.dur),y=h*.78,bob=Math.abs(Math.sin(t*11))*h*.04,R=h*.95;
    for(let i=0;i<7;i++){const a=Math.PI*(1.05+i*.15);dg.fillStyle=gy(i&1?.5:.78);dg.beginPath();dg.ellipse(x+R*.1+Math.cos(a)*R*.2,y-bob-R*.12+Math.sin(a)*R*.22,R*.06,R*.15,a+Math.PI/2,0,TAU);dg.fill();}
    dg.fillStyle=gy(.68);dg.beginPath();dg.ellipse(x,y-bob,R*.17,R*.13,0,0,TAU);dg.fill();
    const hx=x-R*.17,hy=y-bob-R*.2+Math.sin(t*22)*R*.02;dg.fillRect(hx,hy,R*.05,R*.14);dg.beginPath();dg.arc(hx+R*.02,hy,R*.065,0,TAU);dg.fill();
    dg.fillStyle=gy(1);dg.beginPath();dg.moveTo(hx-R*.04,hy);dg.lineTo(hx-R*.11,hy+R*.02);dg.lineTo(hx-R*.04,hy+R*.04);dg.fill();
    dg.fillStyle=gy(.45);dg.fillRect(hx-R*.03,hy+R*.03,R*.03,R*.07);dg.fillStyle='#000';dg.fillRect(hx,hy-R*.025,1.2,1.2);
    const lg=Math.sin(t*11)*R*.05;dg.fillStyle=gy(.9);dg.fillRect(x-R*.04+lg,y-bob+R*.1,1.5,R*.15+bob);dg.fillRect(x+R*.04-lg,y-bob+R*.1,1.5,R*.15+bob);
    const s2=Math.max(1,Math.min(SC,Math.floor(h*.36/7)));dWord(T,w/2,h*.2,s2,1,1,t);
    if(t>.8&&t<1.9&&(t*6|0)%2)txt3(dg,'GOBBLE!',Math.round(x-R*.5),Math.round(y-bob-R*.5),gy(.95),1,'r');
    dWord('X X X',w*.86,h*.2,1,.75,0,t,false);}
  else if(k==='spare'){
    const pxp=w*.5,ps=h*.052,hit=.5;
    if(t<hit)dPin(pxp,cy+h*.12,ps,Math.sin(t*26)*.25*sstep(0,.4,t),.92);
    else{const u=t-hit;dPin(pxp-w*.6*u,cy+h*.12-h*1.2*u+h*3*u*u,ps,-9*u,.92);}
    if(t<hit+.12){const bx=lerp(w+h*.3,pxp,clamp(t/hit,0,1));dBall(bx,cy+h*.22,h*.2,-t*16,.85);}
    if(t>hit){const u=clamp((t-hit)/.3,0,1),sx=lerp(-w*.3,w*1.3,u);dg.fillStyle=gy(.9);dg.save();dg.translate(sx,cy);dg.rotate(.5);dg.fillRect(-3,-h,6,h*2);dg.restore();
      if(t>hit+.12){const v=clamp((t-hit-.12)/.25,0,1);dWord(T,lerp(-w*.4,w/2,eob(v)),cy,SC,1,0,t);}}}
  else if(k==='gutter'){
    dg.fillStyle=gy(.35);dg.fillRect(0,h*.62,w,1);dg.fillRect(0,h*.92,w,1);
    const u=clamp(t/1.1,0,1),bx=lerp(-h*.2,w*.62,u),dropT=clamp((u-.45)/.25,0,1),by=lerp(h*.62-h*.15,h*.92-h*.16,dropT*dropT);
    dBall(bx,by,h*.15,0,.8,true);
    const ws=Math.max(1,Math.min(SC,Math.floor((h*.55)/7))),tw=tw5(T,ws);let x=w/2-tw/2;
    for(let i=0;i<T.length;i++){const t0=.15+i*.08,uu=t-t0;if(uu>0){const fy=Math.min(1,uu*2.2),bounce=Math.abs(Math.sin(Math.min(uu*6,Math.PI)))*(1-fy)*h*.2;
      const yy=lerp(-10,h*.08,fy*fy)-bounce+(uu>1.1?Math.sin(i*1.7)*2:0);txt5(dg,T[i],x,yy,gy(.95),ws);}x+=6*ws;}}
  else if(k==='split'){
    const ps=h*.05,sh=Math.sin(t*40)*.18*Math.max(0,1-t/1.6),sp=sstep(.2,.9,t);
    dPin(w*.07,cy+h*.1,ps,sh,.9);dPin(w*.93,cy+h*.1,ps,-sh,.9);
    const ix=T.indexOf('SPLIT'),a=T.slice(0,ix+3),bb=T.slice(ix+3),sc=Math.max(1,Math.min(SC,Math.floor((w*.72)/tw5(T,1)))),wa=tw5(a,sc),wb=tw5(bb,sc),tot=wa+wb+6*sc;
    const gap=Math.min(sp*w*.12,Math.max(0,(w*.76-tot)/2));txt5(dg,a,w/2-tot/2-gap,cy-3.5*sc,gy(1),sc);txt5(dg,bb,w/2-tot/2+wa+6*sc-sc+gap,cy-3.5*sc,gy(1),sc);
    for(let i=0;i<3;i++){dg.fillStyle=gy(.4);dg.fillRect(w/2-1,cy-h*.3+i*h*.25,2,h*.12);}}
  else {dWord(T,w/2,cy,SC,1,0,t);}
}
function dmdBand(){
  if(!DMD.on||!BIMG)return;dmdDraw();const id=dg.getImageData(0,0,W,BH).data;
  const rows=Math.round(BH*Math.min(clamp(DMD.t/.12,0,1),clamp((DMD.dur-DMD.t)/.16,0,1)));if(rows<=0)return;
  for(let y=0;y<rows;y++){const br=(y&3)<<2;for(let x=0;x<W;x++){const i=y*W+x,l=id[i*4]/255,q=Math.floor(l*15+BAY4[br|(x&3)]*.999)/15;
    B32[i]=pack(16+239*q,6+160*q,2+68*q);}}
  g.putImageData(BIMG,0,0,0,0,W,rows);g.fillStyle='#ff9a30';g.fillRect(0,rows,W,1);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,rows+1,W,1);
}
/* =====================================================================================
   15. THE MASKING PANEL — a small canvas texture above the pin deck (our lane on top, a grey
       template below that the shader tints per neighbouring lane). It flashes on strikes.
   ===================================================================================== */
const MKC=document.createElement('canvas');MKC.width=160;MKC.height=144;const mk=MKC.getContext('2d');let MKmsg='',MKt=0,MKph=-1;
function maskMsg(s,d){MKmsg=s;MKt=d;MKph=-1;}
function paintMask(fl){
  mk.setTransform(1,0,0,1,0,0);mk.fillStyle='#000';mk.fillRect(0,0,160,144);const r=mulberry(11);
  /* our panel (rows 0-71): starfield, ringed planet, the logo low down where the pin camera sees it */
  for(let i=0;i<70;i++){const x=r()*160|0,y=r()*40|0,b=r();mk.fillStyle=rgba(mixC([120,170,255],[255,130,230],r()),.25+.75*b);mk.fillRect(x,y,b>.9?2:1,b>.9?2:1);}
  const gd=mk.createRadialGradient(128,14,1,132,18,12);gd.addColorStop(0,'#ffd0f0');gd.addColorStop(1,'#7a2a9a');mk.fillStyle=gd;mk.beginPath();mk.arc(132,18,11,0,TAU);mk.fill();
  mk.strokeStyle='#5ff0ff';mk.lineWidth=1.5;mk.beginPath();mk.ellipse(132,18,21,5,-.3,0,TAU);mk.stroke();
  mk.fillStyle='#ff5ab4';for(let x=0;x<160;x+=2)mk.fillRect(x,36+Math.round(Math.sin(x*.25)*2),2,1);
  if(MKmsg){const s=MKmsg,sc=tw5(s,3)<=150?3:2;txt5(mk,s,80,58-7*sc,fl?GR.volt:GR.pink,sc,'c');
    for(let i=0;i<16;i++){mk.fillStyle=(i+(fl?1:0))%2?'#ffd040':'#ff2f9a';mk.fillRect(4+i*9.6,66,4,3);}}
  else{txt5(mk,'STRIKE NIGHT',80,44,GR.cyan,2,'c');txt5(mk,'LANE 7',80,62,'#ff9ad0',1,'c');}
  /* neighbour template (rows 72-121, tinted per lane in the shader; the left third holds the lane number) */
  for(let i=0;i<50;i++){const x=56+(r()*104|0),y=72+(r()*50|0),b=r();mk.fillStyle='rgba(255,255,255,'+(.2+.6*b)+')';mk.fillRect(x,y,1,1);}
  const g2d=mk.createRadialGradient(108,92,1,112,96,15);g2d.addColorStop(0,'#fff');g2d.addColorStop(1,'#444');mk.fillStyle=g2d;mk.beginPath();mk.arc(112,96,14,0,TAU);mk.fill();
  mk.strokeStyle='#ddd';mk.lineWidth=2;mk.beginPath();mk.ellipse(112,96,26,6,-.3,0,TAU);mk.stroke();
  mk.fillStyle='#999';mk.fillRect(48,74,2,46);
  /* digit atlas (row 125): 0-9 at x = 2 + d*14, 10 x 14 px each */
  for(let d=0;d<10;d++)txt5(mk,String(d),2+d*14,125,'#fff',2);
  uploadMask();
}
function maskTick(dt){if(MKt>0){MKt-=dt;const ph=(MKt*7|0)%2;if(MKt<=0){MKmsg='';paintMask(0);}else if(ph!==MKph){MKph=ph;paintMask(ph);}}}
/* =====================================================================================
   16. PARTICLES — impact sparks (projected from the contact point) and strike confetti, in matrix px
   ===================================================================================== */
function spark(x,y,z,s){const p=proj(x,y,z);if(!p)return;const n=Math.min(10,2+s*1.6|0),sc=clamp(3/p[2],.4,2.5);
  for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(10,45)*sc;if(S.parts.length<220)S.parts.push({x:p[0],y:p[1],vx:Math.cos(a)*v,vy:Math.sin(a)*v-12*sc,g:90*sc,life:rnd(.2,.45),max:.45,c:Math.random()<.5?[180,230,255]:[255,255,255],k:1});}}
function confetti(n){const cols=[[255,90,180],[80,225,255],[255,210,64],[120,255,120],[170,120,255]];
  for(let i=0;i<n;i++)if(S.parts.length<220)S.parts.push({x:rnd(0,W),y:rnd(-10,BH*.6),vx:rnd(-12,12),vy:rnd(5,35),g:22,life:rnd(1.2,2.4),max:2.4,c:pick(cols),k:2,ph:Math.random()*TAU});}
function partTick(dt){const P=S.parts;let j=0;for(let i=0;i<P.length;i++){const p=P[i];p.life-=dt;if(p.life<=0)continue;p.vy+=p.g*dt;
  if(p.k===2){p.ph+=dt*8;p.vx+=Math.sin(p.ph)*30*dt;p.vx*=.97;p.vy=Math.min(p.vy,30);}p.x+=p.vx*dt;p.y+=p.vy*dt;P[j++]=p;}P.length=j;}
function partDraw(){for(const p of S.parts){const a=clamp(p.life/p.max*1.5,0,1),i=(p.y|0)*W+(p.x|0);if(p.x<0||p.y<0||p.x>=W||p.y>=H)continue;
  if(p.k===1)addPx(i,p.c[0]*a,p.c[1]*a,p.c[2]*a);else{const on=Math.sin(p.ph)>-.3;RBUF[i]=pack(p.c[0]*(on?1:.5),p.c[1]*(on?1:.5),p.c[2]*(on?1:.5));if(on&&p.x+1<W)RBUF[i+1]=RBUF[i];}}}
/* =====================================================================================
   17. HUD + RENDER — scene from the GPU, sparks, then the score sheet, aim UI and overlays.
   ===================================================================================== */
const sheetH=()=>H<120?13:17;
function drawSheet(){
  const sh=G.sheet||sheet(G.rolls),h=sheetH(),fw=Math.floor((W-4)/11.55),f10=Math.round(fw*1.45),tw=W-4-9*fw-f10,by=h<15?1:2,ty=h<15?7:10;
  const cur=G.rs&&!G.over&&S.mode!=='over'&&G.ph!=='done'?G.rs.f:-1,blink=(S.t*3|0)%2;
  g.fillStyle='rgba(6,3,16,.86)';g.fillRect(0,0,W,h+1);g.fillStyle='#3a2d70';g.fillRect(0,h,W,1);
  for(let f=0;f<10;f++){const x=2+f*fw,w=f<9?fw:f10,F=sh.fr[f],nc=f<9?2:3;
    if(f===cur){g.fillStyle=blink?'rgba(255,176,64,.22)':'rgba(255,176,64,.12)';g.fillRect(x+1,0,w-1,h);}
    g.fillStyle='#3a2d70';g.fillRect(x,0,1,h);
    for(let i=0;i<nc;i++){const cx=x+w-(nc-i)*5;g.fillStyle='#3a2d70';g.fillRect(cx-1,0,1,by+6);g.fillRect(cx-1,by+6,6,1);
      const m=F.m[i];if(m)txt3(g,m,cx+1,by,m==='X'?'#ff5ab4':m==='/'?'#4fe0ff':m==='-'?'#7c76a0':'#ffffff');}
    if(F.t!=null)txt3(g,String(F.t),x+Math.round(w/2)+1,ty,'#ffffff',1,'c');
    else if(f<10&&h>=15&&tw>0&&F.m.length===0)txt3(g,String(f+1),x+Math.round(w/2)+1,ty,'#3a2d70',1,'c');}
  const x=2+9*fw+f10;g.fillStyle='#3a2d70';g.fillRect(x,0,1,h);g.fillRect(W-2,0,1,h);
  txt3(g,'TOT',x+Math.round(tw/2),by,'#8a80c0',1,'c');txt3(g,String(sh.total),x+Math.round(tw/2),ty,'#ffd040',1,'c');
}
function drawPinDiagram(x,y,s){const m=G.ph==='aim'||G.ph==='swing'||G.ph==='roll'?standMask(PW):G.ph==='sweep'&&PS.drop?standMask(PW):G.after;
  const rows=[[6,7,8,9],[3,4,5],[1,2],[0]];
  for(let r=0;r<4;r++)for(let j=0;j<rows[r].length;j++){const i=rows[r][j],px2=x+Math.round((j-(rows[r].length-1)/2)*s*2),py2=y+r*s;
    const up=m>>i&1,was=G.before>>i&1;g.fillStyle=up?'#ffffff':(was&&(G.ph==='pins'||G.ph==='tally'||G.ph==='done')?'#ff4a8a':'#2c2650');g.fillRect(px2-1,py2-1,2,2);}}
function hud(){
  const playing=S.mode==='play',sh=sheetH();
  drawSheet();
  if(PIPC.on){const p=PIPC;g.fillStyle='#ff5ab4';g.fillRect(p.x-1,p.y-1,p.w+2,1);g.fillRect(p.x-1,p.y+p.h,p.w+2,1);g.fillRect(p.x-1,p.y,1,p.h);g.fillRect(p.x+p.w,p.y,1,p.h);
    txt3(g,'PIN CAM',p.x+2,p.y+p.h+3,'#ff9ad0');}
  /* bottom row: frame, ball, speed, spin, pin diagram */
  const rs=G.rs||rackState(G.rolls),top=touchy,by=top?sh+10:H-7;   /* on touch screens the buttons own the bottom corners */
  if(S.mode!=='over'){
    if(!G.over)otxt3(g,'FRAME '+(rs.f+1)+'  BALL '+(rs.b+1),3,by,'#c8c0ff');
    if(G.mph&&G.ph!=='aim')otxt3(g,G.mph.toFixed(1)+' MPH',3,top?by+7:by-7,'#ffd040');
    if(top)drawPinDiagram(W-PIPC.w-16>90?Math.round(W*.5):12,sh+6,3);else drawPinDiagram(W-12,H-16,3);
  }
  if(playing&&G.ph==='aim'&&!G.auto){
    const sp=SPINL[G.spinI];otxt3(g,(touchy?'B':'SHIFT')+' SPIN: '+sp,3,top?by+7:by-7,'#7ce8ff');
    let hint=touchy?'SWIPE UP TO BOWL - DRAG TO MOVE':'SWIPE UP, OR SPACE: SET LINE';
    if(G.kst===1)hint='SPACE: LOCK AIM';else if(G.kst===2)hint='SPACE: BOWL';else if(G.swipeAim)hint='RELEASE TO BOWL - CURVE TO HOOK';
    if(G.kst===0&&!touchy&&!G.swipeAim)hint='< > LINE  SPACE SET  OR SWIPE UP';
    otxt3(g,hint,Math.round((W-(PIPC.on?PIPC.w+4:0))/2),top?H-9:sh+4,(S.t*2|0)%2||G.kst?'#ffffff':'#ffb040',1,'c');
    if(G.kst===2||G.swipeAim){const v=G.kst===2?G.kpow:G.pspd,x=5,y0=Math.round(H*.3),hh=Math.round(H*.4);
      g.fillStyle='#000';g.fillRect(x-1,y0-1,5,hh+2);const fh=Math.round(hh*v);for(let i=0;i<fh;i++){const u=i/hh;g.fillStyle=u<.55?'#40ff80':u<.8?'#ffd040':'#ff4a6a';g.fillRect(x,y0+hh-1-i,3,1);}
      otxt3(g,'PWR',x+1,y0-8,'#ffffff',1,'c');}}
  if(playing&&!S.demo&&G.ph==='pins'&&G.pt>1.2&&G.fast===1)otxt3(g,touchy?'TAP TO SKIP':'SPACE TO SKIP',W/2,H-23,'#8a80c0',1,'c');
  if(S.toast){const T=S.toast,a=T.t<1.1;if(a){const y=Math.round(H*.36);otxt5(g,T.txt,W/2,y,GR.steel,H>=140?3:2,'c');if(T.sub)otxt3(g,T.sub,W/2,y+(H>=140?25:18),'#c8c0ff',1,'c');}}
  dmdBand();
  if(S.mode==='title')titleCard();else if(S.mode==='over')overCard();
  if(S.paused){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);otxt5(g,'PAUSED',W/2,Math.round(H*.4),GR.steel,2,'c',0,'#000');otxt3(g,touchy?'TAP RESUME':'ESC TO RESUME',W/2,Math.round(H*.4)+20,'#c8c0ff',1,'c');}
}
const TIPS_T=['SWIPE UP TO BOWL','CURVE YOUR SWIPE TO HOOK','DRAG THE BALL TO MOVE','STRIKES, SPARES, TURKEYS!'];
const TIPS_K=['DRAG UP TO BOWL - CURVE IT TO HOOK','OR ARROWS + SPACE: LINE, AIM, POWER','SHIFT CHANGES THE SPIN','STRIKES, SPARES, TURKEYS!'];
function titleCard(){
  const sc=W>=300?3:2,y=Math.round(H*.3);if(DMD.on&&DMD.t>.1&&DMD.t<DMD.dur-.1)return;
  /* at the deck the masking unit itself carries the logo, so the card steps aside for the pin action */
  if(CAM.e[2]>9){if((S.t*2|0)%2)otxt5(g,touchy?'TAP TO PLAY':'PRESS START',W/2,H-17,GR.volt,1,'c');otxt3(g,'HI '+S.hi,W-3,sheetH()+3,'#ffb040',1,'r');return;}
  otxt5(g,'STRIKE NIGHT',W/2+1,y+1,'#3a0a40',sc,'c',.12,'#000');otxt5(g,'STRIKE NIGHT',W/2,y,GR.pink,sc,'c',.12,'#000');
  otxt3(g,'COSMIC BOWLING - 10 FRAMES',W/2,y+7*sc+5,'#7ce8ff',1,'c');
  if((S.t*2|0)%2)otxt5(g,touchy?'TAP TO PLAY':'PRESS START',W/2,Math.round(H*.56),GR.volt,1,'c');
  const tips=touchy?TIPS_T:TIPS_K;otxt3(g,tips[(S.t/2.6|0)%tips.length],W/2,Math.round(H*.56)+11,'#c8c0ff',1,'c');
  otxt3(g,'HI '+S.hi,W/2,Math.round(H*.56)+20,'#ffb040',1,'c');
}
function overCard(){
  const t=S.ot;g.fillStyle='rgba(4,2,12,.66)';g.fillRect(0,sheetH()+1,W,H-sheetH()-1);
  const y=Math.round(H*.27),big=H>=140?3:2;otxt5(g,S.score>=300?'PERFECT!':S.score>=200?'GREAT GAME!':S.score>=100?'NICE GAME!':'GAME OVER',W/2,y,S.score>=200?GR.volt:GR.pink,2,'c',.1,'#000');
  otxt3(g,'FINAL SCORE',W/2,y+20,'#c8c0ff',1,'c');otxt5(g,String(S.score),W/2,y+28,GR.steel,big,'c',0,'#000');
  /* tickets spit from a slot, a strip that grows and scrolls */
  const sx=Math.round(W*.78),sy=Math.round(H*.45);g.fillStyle='#1a1430';g.fillRect(sx-9,sy-3,18,4);g.fillStyle='#ff9a30';g.fillRect(sx-8,sy-2,16,1);
  const n=S.tshown,len=Math.min(n,Math.floor((H-sy-4)/6)),scroll=(S.tacc*6)|0;
  for(let i=0;i<len;i++){const ty2=sy+2+i*6+(len<Math.floor((H-sy-4)/6)?0:scroll);if(ty2>H-2)continue;g.fillStyle=i%2?'#ff7a3a':'#ff5a2a';g.fillRect(sx-6,ty2,12,5);g.fillStyle='#ffd0a0';g.fillRect(sx-4,ty2+2,8,1);g.fillStyle='#2a0a0a';g.fillRect(sx-6,ty2+5,12,1);}
  otxt3(g,'TICKETS',sx,sy-11,'#ffd040',1,'c');otxt5(g,String(n),Math.round(W*.25),Math.round(H*.5),GR.volt,big,'c',0,'#000');otxt3(g,'TICKETS',Math.round(W*.25),Math.round(H*.5)+8*big+2,'#ffd040',1,'c');
  if(S.newHi&&(t*4|0)%2)otxt3(g,'NEW HIGH SCORE',W/2,y+28+8*big+4,'#6aff5a',1,'c');
  if(t>1.5)otxt3(g,touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-9,(t*2|0)%2?'#ffffff':'#8a80c0',1,'c');
}
function render(){
  if(!gl){RBUF.fill(pack(7,6,11));commit();return;}   /* no WebGL2: a dark panel behind the explanation, nothing else */
  const t0=performance.now();
  if(SC_OK){let jx=0,jy=0;if(S.shake>0&&!reduce){jx=(Math.random()-.5)*S.shake*.025;jy=(Math.random()-.5)*S.shake*.02;}
    CAM.e[0]+=jx;CAM.e[1]+=jy;drawScene();CAM.e[0]-=jx;CAM.e[1]-=jy;}
  else{for(let y=0;y<H;y++)RBUF.fill(pack(10+8*y/H,6,20+20*y/H),y*W,(y+1)*W);}
  const t1=performance.now();
  partDraw();commit();hud();
  const t2=performance.now();T.scene+=(t1-t0-T.scene)*.1;T.hud+=(t2-t1-T.hud)*.1;
}
