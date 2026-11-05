/* =====================================================================================
   20. THE GAME — frames and balls, the pinsetter and the AI bowler (the original's, unchanged
       except that sparks and confetti are now 3D particles).
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
  auto:false,autoSkill:.7,swipeAim:false,pspin:0};
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
  Object.assign(G,{ph:'aim',pt:0,kst:0,pang:0,pspd:0,pspin:0,gut:false,hit:false,crash:0,crashed:false,mph:0,fast:1,swipeAim:false,ai:null});
  G.rs=rackState(G.rolls);ballToHand();G.before=standMask(PW);GST.idle=0;
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
  else{S.toast={txt:k===0?'MISS':String(k),sub:k===0?'':k===1?'PIN':'PINS',t:0};maskMsg(k===0?'MISS':k+(k===1?' PIN':' PINS'),1.8);}
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
/* ---------- the throw on a touch screen (and with a mouse) ----------
   Put your thumb anywhere and the ball is in your hand: slide sideways and the ball follows your
   thumb along the foul line. Push up and let go to bowl. The push can start from any point and
   can follow a little back-swing; what counts is the stroke from the lowest point to the release.
   - speed: the stroke's fastest moment, in screen heights per second, so every screen feels the same
            (a pause before letting go doesn't lose it; slide back down to cancel a throw)
   - aim:   the stroke's direction, gently: 10 degrees off straight moves the ball 6 cm at the pins
   - hook:  curve the end of the stroke; a natural thumb arc still rolls straight (the turn from the
            stroke's first half to its last third must pass 10 degrees)
   While the stroke is under way the lane shows the ball's predicted path, from the real physics.
   Samples carry the events' own timestamps (coalesced moves included), so a busy frame never
   flattens a flick. */
const GST={down:false,id:null,pts:[],x0:0,y0:0,lowI:0,mode:'',rel:false,fresh:false,sx:0,hint:'',hintT:0,idle:0};
function gstPush(x,y,t){const P=GST.pts;if(P.length>=220){P.splice(0,60);GST.lowI=Math.max(0,GST.lowI-60);}P.push([x,y,t]);if(y>=P[GST.lowI][1])GST.lowI=P.length-1;}
cv.addEventListener('pointerdown',e=>{GST.down=true;GST.id=e.pointerId;GST.pts.length=0;GST.lowI=0;gstPush(e.clientX,e.clientY,e.timeStamp);
  GST.x0=e.clientX;GST.y0=e.clientY;GST.mode='';GST.rel=false;GST.fresh=true;});
addEventListener('pointermove',e=>{if(!GST.down||e.pointerId!==GST.id)return;const ce=e.getCoalescedEvents?e.getCoalescedEvents():null;
  if(ce&&ce.length)for(const c of ce)gstPush(c.clientX,c.clientY,c.timeStamp);else gstPush(e.clientX,e.clientY,e.timeStamp);});
addEventListener('pointerup',e=>{if(!GST.down||e.pointerId!==GST.id)return;gstPush(e.clientX,e.clientY,e.timeStamp);GST.down=false;GST.rel=true;});
addEventListener('pointercancel',e=>{if(e.pointerId===GST.id){GST.down=false;GST.rel=false;GST.mode='';}});
const wrapA=a=>a>Math.PI?a-TAU:a<-Math.PI?a+TAU:a;
/* the forward stroke: from the lowest point (the end of any back-swing) to the latest sample */
function stroke(){const P=GST.pts,n=P.length,lo=P[GST.lowI],l=P[n-1];if(!lo||!l)return null;
  const fx=l[0]-lo[0],fy=l[1]-lo[1];let peak=0;
  for(let i=Math.max(GST.lowI+1,1);i<n;i++){let j=i-1;while(j>GST.lowI&&P[i][2]-P[j][2]<40)j--;const dt=P[i][2]-P[j][2];if(dt<8)continue;
    const v=-(P[i][1]-P[j][1])/dt*1000;if(v>peak)peak=v;}
  let len=0;for(let i=GST.lowI+1;i<n;i++)len+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);
  /* the hook: how far the stroke turns, from its first half to its last third */
  const at=f=>{let acc=0;for(let i=GST.lowI+1;i<n;i++){acc+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);if(acc>=len*f)return P[i];}return l;};
  const a=at(.45),c=at(.65),ax=a[0]-lo[0],ay=a[1]-lo[1],bx=l[0]-c[0],by=l[1]-c[1];
  const curl=len>30&&Math.hypot(ax,ay)>4&&Math.hypot(bx,by)>4?wrapA(Math.atan2(bx,-by)-Math.atan2(ax,-ay)):0;
  return {fx,fy,up:-fy,peak,curl,len};}
const aimFrom=s=>{const d=Math.atan2(s.fx,-s.fy);return Math.sign(d)*clamp((Math.abs(d)-.07)*.03,0,.05);};
const spinFrom=s=>Math.sign(s.curl)*clamp((Math.abs(s.curl)-.17)*1.1,0,.7);
const powFrom=peak=>clamp((peak/Math.max(200,innerHeight)-.3)/3.4,0,1);
/* sideways drag: metres per CSS pixel, so the ball stays under the finger at its distance from the camera */
function dragK(){const hf=2*Math.atan(Math.tan(CAM3.fov*Math.PI/360)*CAM3.aspect);return 2*2.5*Math.tan(hf/2)/Math.max(1,RECT.w)*.9;}
function gestureAim(){
  if(GST.fresh){GST.fresh=false;GST.sx=G.x0;GST.mode='hold';}
  const P=GST.pts,last=P[P.length-1];if(!last){GST.idle+=1/60;return;}
  const hh=Math.max(200,innerHeight),lo=P[GST.lowI],up=lo[1]-last[1],slide=ref=>clamp(GST.sx+(ref[0]-GST.x0)*dragK(),-.42,.42);
  if(GST.down){GST.idle=0;
    GST.mode=up>Math.max(14,hh*.025)?'throw':'hold';
    const nx=slide(GST.mode==='throw'?lo:last);if(Math.abs(nx-G.x0)>1e-4){G.x0=nx;G.kst=0;}
    if(GST.mode==='throw'){const s=stroke();G.pang=aimFrom(s);G.pspin=spinFrom(s);G.pspd+=(powFrom(s.peak)-G.pspd)*.5;G.swipeAim=true;}else G.swipeAim=false;}
  else GST.idle+=1/60;
  if(GST.rel){GST.rel=false;
    const s=stroke(),far=up>Math.max(24,hh*.05);G.x0=slide(far?lo:last);
    if(s&&far&&s.peak/hh>.35)throwBall(G.x0,aimFrom(s),spdFrom(powFrom(s.peak)),spinFrom(s));
    else if(far){GST.hint='SWIPE A LITTLE FASTER';GST.hintT=1.8;SFX.back();}
    GST.mode='';G.swipeAim=false;G.pspd=0;G.pspin=0;}
  if(GST.hintT>0)GST.hintT-=1/60;
}
/* ---------- the predicted path, drawn on the lane while you aim ----------
   The ball alone, rolled in a scratch world with the real physics; x sampled every half metre. */
const PVW=mkWorld(),PATH=new Float32Array(37),PV={key:'',on:false,end:7,fade:5,al:0};
function previewTick(){
  if(G.ph!=='aim'||S.mode!=='play'||G.auto){PV.on=false;return;}
  let ang=0,spd=spdFrom(.45),spin=0,full=false;
  if(G.swipeAim){ang=G.pang;spin=G.pspin;spd=spdFrom(G.pspd);full=true;}
  else if(G.kst===1){ang=G.kang;spin=SPIN[G.spinI];full=true;}
  else if(G.kst===2){ang=G.kang;spin=SPIN[G.spinI];spd=spdFrom(G.kpow);full=true;}
  else if(!touchy)spin=SPIN[G.spinI];
  PV.on=true;PV.end=full?15.5:7;PV.fade=full?10:4.5;PV.al+=((full?1:.55)-PV.al)*.25;
  const key=[G.x0.toFixed(3),ang.toFixed(4),spd.toFixed(2),spin.toFixed(2)].join();if(key===PV.key)return;PV.key=key;
  const P=PVW;for(const p of P.pins)p.on=false;P.sw.on=false;launch(P,G.x0,ang,spd,spin,24+12*Math.abs(spin));let j=0,last=G.x0;
  for(let i=0;i<HZ*5&&j<37;i++){physStep(P,1/HZ);P.nev=0;const b=P.ball;if(!b.on)break;last=b.x;while(j<37&&b.z>=.35+j*.5){PATH[j++]=b.x;}}
  while(j<37)PATH[j++]=last;
}
function playerAim(dt,c,e){
  if(e.b){G.spinI=(G.spinI+1)%SPIN.length;SFX.select();}
  if(G.kst===0){if(Math.abs(c.x)>.2)G.x0=clamp(G.x0+c.x*dt*.5,-.42,.42);if(e.a){G.kst=1;G.kph=0;SFX.select();}}
  else if(G.kst===1){G.kph+=dt*2.3;G.kang=Math.sin(G.kph)*.052;if(e.a){G.kst=2;G.kph2=0;SFX.select();}else if(e.d){G.kst=0;SFX.back();}}
  else{G.kph2+=dt*2.7;G.kpow=.5-.5*Math.cos(G.kph2);if(e.a)throwBall(G.x0,G.kang,spdFrom(G.kpow),SPIN[G.spinI]);else if(e.d){G.kst=1;SFX.back();}}
  gestureAim();previewTick();
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
      if(G.pt>=.5){const s=G.shot;launch(PW,s.x0,s.ang,s.spd,s.spin,s.revs);G.ph='roll';G.pt=0;SFX.land();S.shake=Math.max(S.shake,.15);G.chase=0;}break;
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
