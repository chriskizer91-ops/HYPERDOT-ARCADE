/* =====================================================================================
   9e. GAME — nine balls per game. Each ball: roll in from the return, aim, roll; the camera
   follows the ball up the alley and settles on the board for the landing, then comes back.
   ===================================================================================== */
const S={mode:'title',t:0,rt:0,score:0,disp:0,hi:parseInt(store.get('hd-'+CAB.id+'-hi','0'),10)||0,balls:9,thrown:0,ballReady:false,last:null,
  results:[],phase:'enter',pt:0,cur:null,handX:0,handZ:PH.ZHAND,aim:0,spin:0,pw:0,pdir:1,charging:false,drag:null,
  demo:true,auto:false,paused:false,tickets:0,tixShown:0,newHi:false,hitstop:0,shake:0,flash:0,flashC:[255,255,255],
  camT:0,camX:0,lastIn:touchy?'ptr':'key',ai:null,popups:[],parts:[],trails:[],final:false,hint:0,games:0,lastRes:null};
const BALL=newBall();
/* ---- launch table: straight rolls simulated once at boot; inverted for the AI and the power meter ---- */
const TAB=[];let SPMIN=2.45,SPMAX=4.9;const METER=[];
function buildTable(){
  const b=newBall(),bc=[0,0,0];TAB.length=0;
  for(let s=2.3;s<=5.3;s+=.05){launchBall(b,0,PH.ZHAND,s,0,0);let land=null;
    for(let i=0;i<200&&!land&&b.st==='live';i++)physTick([b],1/60,(k,sp,bb,e)=>{if(!land&&(k==='lip'||k==='thud'&&e===1||k==='rim'||k==='back')){toBoard(b.px,b.py,b.pz,bc);land=bc[1];}});
    if(land!==null)TAB.push([s,land]);}
  for(let i=1;i<TAB.length;i++)if(TAB[i][1]<TAB[i-1][1])TAB[i][1]=TAB[i-1][1];   /* force monotone */
  SPMIN=speedFor(-.1);SPMAX=speedFor(1.02)*1.03;
  METER.length=0;for(let h=0;h<5;h++){const dv=[-.05,-.02,0,0,0][h];METER.push({val:HOLES[h].val,p:(speedFor(HOLES[h].v+dv)-SPMIN)/(SPMAX-SPMIN),ring:h});}
  b.st='gone';
}
function speedFor(v){if(!TAB.length)return 3.5;if(v<=TAB[0][1])return TAB[0][0]-(TAB[0][1]-v)*2;
  for(let i=1;i<TAB.length;i++)if(TAB[i][1]>=v){const a=TAB[i-1],b=TAB[i];return a[0]+(b[0]-a[0])*(v-a[1])/Math.max(1e-6,b[1]-a[1]);}return TAB[TAB.length-1][0];}
const powerSpeed=p=>SPMIN+clamp(p,0,1.06)*(SPMAX-SPMIN);
/* ---- flow ---- */
function newGame(demo){
  Object.assign(S,{t:0,score:0,disp:0,thrown:0,ballReady:false,last:null,results:[],phase:'enter',pt:0,demo,tickets:0,tixShown:0,newHi:false,
    final:false,aim:0,spin:0,pw:0,charging:false,drag:null,ai:null,camT:0,camX:0,popups:[]});
  S.parts.length=0;DQ.length=0;DCUR=null;BALL.st='gone';S.cur=null;S.handX=0;S.handZ=PH.ZHAND;
  for(const r of RINGS){r.flash=0;r.glow=0;}
  nextBall();
}
function APP_start(){newGame(false);S.mode='play';S.games++;setTrack('play');SFX.confirm();say('Roll!');TIX.reset();}
function APP_attract(){newGame(true);S.mode='title';setTrack('title');TIX.reset();}
function nextBall(){
  if(S.thrown>=S.balls){endGame();return;}
  S.phase='enter';S.pt=0;S.ballReady=true;S.cur=BALL;BALL.st='hand';BALL.hole=-1;BALL.res=null;BALL.glow=0;
  S.aim*=.5;S.charging=false;S.pw=0;S.drag=null;S.ai=null;
  if(S.thrown===S.balls-1&&!S.final){S.final=true;if(!S.demo){dmdPush('final',{},1.5);SFX.final();setTrack('final');}}
  else if(!S.demo&&S.thrown>0)dmdPush('ball',{n:S.thrown+1},.7);
  SFX.enter();
}
function endGame(){
  if(S.demo){S.mode='title';newGame(true);return;}
  S.mode='over';S.t=0;S.ballReady=false;
  const sc=S.score;S.tickets=Math.max(2,Math.floor(sc/30))+(sc>=400?10:0)+(sc>=600?15:0)+(sc>=900?250:0);
  if(sc>S.hi){S.hi=sc;store.set('hd-'+CAB.id+'-hi',sc);S.newHi=true;}else S.newHi=false;
  setTrack('over');if(sc>=900){dmdPush('perfect',{},2.4);SFX.jackpot();say('Perfect game!');}else if(S.newHi){SFX.win();say('New high score');}else{SFX.lose();say('Game over');}
  ARC.over(sc,S.tickets);TIX.start(S.tickets);
}
/* ---- throwing ---- */
function throwBall(speed,aim,spin){
  const b=BALL;b.qw=1;b.qx=b.qy=b.qz=0;spinQ(b,Math.random()-.5,Math.random()-.5,Math.random()-.5,Math.random()*6);
  launchBall(b,clamp(S.handX,-PH.HW+PH.R+.01,PH.HW-PH.R-.01),S.handZ,speed,aim,spin);
  S.thrown++;S.ballReady=false;S.phase='roll';S.pt=0;S.lastRes=null;S.hint++;
  SFX.release(speed/4);S.trails.length=0;
}
/* the attract-mode / autopilot bowler: picks a target, inverts the launch table, adds human error,
   and plays the throw out as a visible pull-back and flick of the hand */
function aiPlan(){
  const r=Math.random(),pocket=r<.1,target=pocket?HOLES[5+(Math.random()<.5?0:1)]:HOLES[r<.22?1:r<.42?2:r<.68?3:4];
  const x0=pocket?Math.sign(target.u)*.1:(Math.random()-.5)*.08,dv=pocket?-.06:target.val===20?-.02:0;
  const zt=ZB0+(target.v+dv)*COSP,aim=Math.atan((target.u-x0)/(zt-PH.ZHAND));
  const err=S.demo?1:1.1;
  return {x0,aim:aim+(Math.random()-.5)*2*.006*err,speed:speedFor(target.v+dv)*(1+(Math.random()-.5)*2*.012*err),spin:0,wait:rnd(.35,.8),t:0};
}
function aiTick(dt){
  if(!S.ai)S.ai=aiPlan();const a=S.ai;a.t+=dt;
  if(a.t<a.wait){S.handX+=(a.x0*.4-S.handX)*Math.min(1,dt*3);return;}
  const k=clamp((a.t-a.wait)/.32,0,1);S.handX=lerp(S.handX,a.x0,Math.min(1,dt*10));S.handZ=PH.ZHAND-.09*Math.sin(k*Math.PI*.5);
  if(k>=1){S.handZ=PH.ZHAND-.04;S.aim=a.aim;throwBall(a.speed,a.aim,a.spin);}
}
/* pointer: grab anywhere, drag back, flick forward. Only the forward stroke counts (from the lowest
   point of the pull-back to release): its chord gives the aim, its last 100 ms the power (in CSS px
   relative to the screen, so phones and monitors feel alike), and how much it bends gives side spin
   in the same direction as the bend. */
const FS=[],FSR=[];let FDOWN=false;
/* raw pointer samples with event timestamps (coalesced moves included), so a fast flick that
   lands between two display frames is still measured exactly */
{const push=e=>{const m=toM(e);FSR.push([m[0],m[1],e.timeStamp/1000]);if(FSR.length>160)FSR.shift();};
  cv.addEventListener('pointerdown',e=>{FSR.length=0;FDOWN=true;push(e);});
  addEventListener('pointermove',e=>{if(!FDOWN||e.pointerId!==PTR.id)return;const ev=e.getCoalescedEvents?e.getCoalescedEvents():null;if(ev&&ev.length)for(const c of ev)push(c);else push(e);});
  const up=e=>{if(FDOWN&&e.pointerId===PTR.id){push(e);FDOWN=false;}};addEventListener('pointerup',up);addEventListener('pointercancel',up);}
function flickRead(){
  const A=FSR.length>=3?FSR:FS;let n=A.length;if(n<2)return null;
  /* the release event repeats the last position; ignore it if it follows a move closely */
  while(n>2&&Math.abs(A[n-1][0]-A[n-2][0])+Math.abs(A[n-1][1]-A[n-2][1])<.25&&A[n-1][2]-A[n-2][2]<.06)n--;
  const tl=A[n-1][2];
  let j=n-1;while(j>0&&A[j-1][1]>=A[j][1]-.5&&tl-A[j-1][2]<=.4)j--;
  let v0=j;while(v0<n-3&&tl-A[v0][2]>.1)v0++;   /* last 100 ms of the stroke, but never fewer than 3 samples */
  const a=A[v0],b=A[n-1],dt=Math.max(1/120,b[2]-a[2]),k=RECT.w/W/Math.max(300,Math.min(900,Math.min(innerWidth,innerHeight)));
  const vx=(b[0]-a[0])/dt*k,vy=(b[1]-a[1])/dt*k,chx=b[0]-A[j][0],chy=A[j][1]-b[1];
  let turn=0;
  if(n-1-j>=3){const m=(j+n-1)>>1,a1=Math.atan2(A[m][0]-A[j][0],A[j][1]-A[m][1]),a2=Math.atan2(A[n-1][0]-A[m][0],A[m][1]-A[n-1][1]);
    turn=a2-a1;if(turn>Math.PI)turn-=TAU;if(turn<-Math.PI)turn+=TAU;}
  return {vx,vy,up:-vy,turn,chx,chy};
}
function aimInput(dt,c,e){
  const hx=PH.HW-PH.R-.02;
  /* --- pointer drag / flick --- */
  if(PTR.pressed&&!S.drag){S.drag={x0:PTR.x,y0:PTR.y,hx0:S.handX};FS.length=0;S.lastIn='ptr';S.charging=false;
    if(FSR.length){S.drag.x0=FSR[0][0];S.drag.y0=FSR[0][1];}}
  else if(PTR.down&&!S.drag&&FDOWN){S.drag={x0:PTR.x,y0:PTR.y,hx0:S.handX};FS.length=0;const t=performance.now()/1000-.02;while(FSR.length&&FSR[0][2]<t)FSR.shift();S.lastIn='ptr';S.charging=false;}
  if(S.drag){
    FS.push([PTR.x,PTR.y,S.rt]);if(FS.length>40)FS.shift();
    const zh=2.0,mpp=zh/CAM.F;S.handX=clamp(S.drag.hx0+(PTR.x-S.drag.x0)*mpp,-hx,hx);
    S.handZ=PH.ZHAND-clamp((PTR.y-S.drag.y0)*mpp*.9,0,.2)+clamp((S.drag.y0-PTR.y)*mpp*.25,0,.04);
    if(!PTR.down){const f=flickRead();S.lastFlick=f;S.drag=null;FSR.length=0;
      if(f&&f.up>.55&&f.chy>1){const p=clamp((f.up-.6)/3.2,0,1.06),aim=clamp(Math.atan2(f.chx,f.chy)*.42,-.17,.17),spin=clamp(f.turn*1.6,-1,1);
        S.aim=aim;S.spin=spin;throwBall(powerSpeed(p),aim,spin);}
      else S.handZ=PH.ZHAND;}
    return;
  }
  /* --- keys / pad: aim, curve, slide, hold A to charge, release to roll --- */
  if(Math.abs(c.x)>.15||Math.abs(c.y)>.5)S.lastIn='key';
  if(c.b){S.handX=clamp(S.handX+c.x*dt*.5,-hx,hx);}else{const pa=S.aim;S.aim=clamp(S.aim+c.x*dt*.22,-.17,.17);if(Math.abs(S.aim-pa)>1e-4&&((S.rt*12)|0)!==((S.rt*12-dt*12)|0))SFX.tick();}
  if(c.u)S.spin=clamp(S.spin+dt*1.6,-1,1);if(c.d)S.spin=clamp(S.spin-dt*1.6,-1,1);
  const pd=pads()[0];if(pd&&Math.abs(pd.axes[2]||0)>.25)S.spin=clamp(S.spin+(pd.axes[2])*dt*1.8,-1,1);
  if(e.a&&!S.charging){S.charging=true;S.pw=0;S.pdir=1;S.lastIn=TS.A?'ptr':'key';}
  if(S.charging){
    if(c.a){const pp=S.pw;S.pw+=S.pdir*dt*.78;if(S.pw>=1.04){S.pw=1.04;S.pdir=-1;}if(S.pw<=0){S.pw=0;S.pdir=1;}if(((pp*16)|0)!==((S.pw*16)|0))SFX.charge(S.pw);
      S.handZ=PH.ZHAND-S.pw*.06;}
    else{S.charging=false;S.handZ=PH.ZHAND-.03;throwBall(powerSpeed(S.pw),S.aim,S.spin);}
  }
}
/* ---- physics events -> sound, light and particles ---- */
function onEv(k,s,b,e){
  const vol=S.demo&&S.mode==='title'?.55:1;
  switch(k){
    case 'thud':if(e===1){SFX.thud(s/3*vol);if(s>1.6){S.shake=Math.max(S.shake,.08*s);puff(b,6);}}else if(s>.8)SFX.thud(s/5*vol);break;
    case 'hump':SFX.clack(s/3.5*vol);break;
    case 'launch':SFX.launch(s/3*vol);for(let i=0;i<LAMPN();i++){LAMPV[i]=Math.max(LAMPV[i],.8);LAMPV[LAMPN()+i]=Math.max(LAMPV[LAMPN()+i],.8);}break;
    case 'lip':SFX.tock(e,s/1.6*vol);RINGS[e].glow=Math.min(1,RINGS[e].glow+s*.5);if(s>1.2)spark(b,RINGS[e].col,3);break;
    case 'rim':SFX.rim(s*vol);break;
    case 'knock':case 'wall':case 'back':SFX.knock(s/2.5*vol);if(k==='back'&&s>1.5)S.shake=Math.max(S.shake,.1);break;
    case 'click':SFX.click();break;
    case 'nudge':SFX.nudge();S.shake=Math.max(S.shake,.25);break;
    case 'dunk':score(HOLES[e].val,HOLES[e]);break;
    case 'side':score(10,null,'side');break;
    case 'gutter':score(0,null,'gutter');break;
    case 'short':score(0,null,e?'bounce':'short');break;
  }
}
const BCP=[0,0,0];
function score(val,hole,how){
  if(S.lastRes!==null)return;S.lastRes=val;
  S.score+=val;S.last=val;S.results.push(val);if(!S.demo)ARC.score(S.score);
  const b=BALL;
  if(hole){
    const ri=RINGS[hole.ring];ri.flash=1;fromBoard(hole.u,hole.v,.02,BCP);
    const big=val>=50;S.hitstop=big?(val>=100?.16:.09):.03;S.flash=val>=100?.9:big?.45:.18;S.flashC=ri.col;
    burst(BCP[0],BCP[1],BCP[2],ri.col,8+val/4|0,val>=100);S.shake=Math.max(S.shake,val>=100?.6:big?.3:.08);
    S.popups.push({txt:'+'+val,x:BCP[0],y:BCP[1]+.05,z:BCP[2],t:0,col:ri.col});
    if(val>=100){SIGN[hole.u<0?0:1]=1.5;dmdPush('jackpot',{},2.2);SFX.dunk(100);SFX.jackpot();if(!S.demo)say('Pocket! One hundred!',.7,1.05);}
    else{dmdPush('score',{val,sub:val>=40?'RING '+val:''},1.35);SFX.dunk(val);if(val>=50&&!S.demo)say('Fifty!',.7,1.05);}
    lampFlash();
  }else if(how==='side'){RINGS[0].flash=.8;dmdPush('score',{val:10,sub:'SIDE'},1.1);SFX.side();S.popups.push({txt:'+10',x:b.px,y:YB0+.04,z:ZB0-.02,t:0,col:RCOL[10]});}
  else{dmdPush(how==='gutter'?'gutter':'short',{txt:how==='gutter'?'GUTTER':how==='bounce'?'BOUNCED':'TOO SHORT'},1.15);if(how==='gutter')SFX.gutter();else SFX.short();}
}
/* ---- particles ---- */
function burst(x,y,z,col,n,confetti){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(.3,1.3)*(confetti?1.4:1);
  S.parts.push({x,y,z,vx:Math.cos(a)*v*.6,vy:rnd(.8,2.2)*(confetti?1.3:1),vz:Math.sin(a)*v*.5-.3,life:rnd(.5,1.1)*(confetti?1.6:1),max:1.1,col:confetti?LAMPCOL[i%6]:col,sz:.006});}}
function spark(b,col,n){for(let i=0;i<n;i++)S.parts.push({x:b.px,y:b.py,z:b.pz,vx:rnd(-.6,.6),vy:rnd(.2,1),vz:rnd(-.6,.3),life:rnd(.15,.35),max:.35,col,sz:.003});}
function puff(b,n){for(let i=0;i<n;i++)S.parts.push({x:b.px,y:b.py-PH.R*.8,z:b.pz,vx:rnd(-.4,.4),vy:rnd(.05,.3),vz:rnd(-.4,.2),life:rnd(.2,.45),max:.45,col:[120,110,150],sz:.004});}
function partTick(dt){const P=S.parts;let j=0;for(let i=0;i<P.length;i++){const p=P[i];p.vy-=4*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.life-=dt;if(p.life>0)P[j++]=p;}P.length=j;
  for(const p of S.popups)p.t+=dt;S.popups=S.popups.filter(p=>p.t<1.1);}
/* ---- lamps: targets by pattern, brightness lags like a filament (fast up, slow down) ---- */
let LFLASH=0;
function lampFlash(){LFLASH=1;}   /* all lamps strobe together after a dunk */
function lampTick(dt){
  const N=LAMPN(),t=S.rt,b=BALL,live=b.st==='live'||b.st==='sink',fin=S.final&&S.mode==='play';
  for(let s=0;s<2;s++)for(let k=0;k<N;k++){const i=s*N+k;let v,c=0;
    if(S.mode==='title'){v=.25+.75*Math.max(0,Math.sin(k*.55-t*4+s*Math.PI));c=(k+((t*.5)|0))%6;}
    else if(S.mode==='over'){v=((k+((t*8)|0))%3===0)?1:.1;c=2*(s&1)+ (k&1);}
    else if(fin){v=((k+((t*14)|0)+s*2)%4===0)?1:.12;c=((k+((t*14)|0))%8<4)?2:1;}
    else if(live&&b.pz<PH.ZL+.2){v=.12+Math.exp(-Math.abs(LAMPZ[k]-b.pz)*7)*.95+Math.exp(-Math.abs(LAMPZ[k]-b.pz+.35)*5)*.3;c=0;}
    else{v=.16+((k+((t*3)|0))%6===0?.5:0);c=0;}
    if(LFLASH>0){const on=(LFLASH*8|0)%2;if(on){v=1;c=-1;}}
    LAMPT[i]=v;LAMPC[i]=c<0?LAMPC[i]:c;
    const tau=LAMPT[i]>LAMPV[i]?.025:.11;LAMPV[i]+=(LAMPT[i]-LAMPV[i])*(1-Math.exp(-dt/tau));
  }
  if(LFLASH>0){LFLASH-=dt*1.4;if((LFLASH*8|0)%2){for(let i=0;i<2*N;i++)LAMPC[i]=5;}}
  /* target-box lamps: run upward while the ball flies, breathe otherwise; flash with the rails */
  const fly=b.st==='live'&&b.launched&&b.air>0;
  for(let k=0;k<6;k++){let v=fly?((((t*14)|0)-k)%6===0?1:.12):S.mode==='title'?.2+.8*Math.max(0,Math.sin(t*3-k*.9)):(k===((t*1.5)|0)%6?.55:.1);if(LFLASH>0&&(LFLASH*8|0)%2)v=1;
    CHEV[k]+=(v-CHEV[k])*(1-Math.exp(-dt/(v>CHEV[k]?.025:.1)));}
  for(let k=0;k<2;k++){SIGN[k]=Math.max(.35+.25*Math.sin(t*3+k*1.7),SIGN[k]-dt*.9);}
  SIGN[2]=S.mode==='title'&&S.t<1.2?((Math.sin(S.t*60)>.2||S.t>.8)?1:.05):.75+.2*Math.sin(t*1.7);
  for(const r of RINGS){r.flash=Math.max(0,r.flash-dt*1.1);r.glow=Math.max(.25+.15*Math.sin(t*2+r.v*9),r.glow-dt*2.5);}
}
/* ---- the follow camera: two framed poses (aiming / board) blended by how far up the ball is ---- */
const POSE={a:null,b:null};
function fitPose(E,pts,mx){
  /* pitch so the highest and lowest points sit symmetric about the centre row; F from the span */
  let lo=1e9,hi=-1e9;for(const p of pts){const a=Math.atan2(p[1]-E[1],p[2]-E[2]);if(a<lo)lo=a;if(a>hi)hi=a;}
  const pitch=(lo+hi)/2,half=(hi-lo)/2,Fv=(VH3/2-mx)/Math.tan(half);
  let Fh=1e9;const c=Math.cos(pitch),s=Math.sin(pitch);for(const p of pts){const dz=(p[2]-E[2])*c+(p[1]-E[1])*s,dx=Math.abs(p[0]-E[0]);if(dx>0)Fh=Math.min(Fh,(W/2-1)*dz/dx);}
  return {E,T:[E[0],E[1]+Math.sin(pitch)*3,E[2]+Math.cos(pitch)*3],F:Math.min(Fv,Fh)};
}
function fitCams(){
  /* low and well back: the lane foreshortens and the board reads big, with the ball in hand at the bottom */
  POSE.a=fitPose([0,.45,-1.9],[[0,laneY(PH.ZHAND-PH.R*1.4),PH.ZHAND-PH.R*1.4],[0,YTOP+.135,ZTOP]],.5);
  const bot=[0,0,0],tp=[0,0,0];fromBoard(0,-.04,0,bot);
  POSE.b=fitPose([0,YTOP+.3,ZB0-.55],[[0,bot[1],bot[2]],[0,YTOP+.31,ZTOP],[-PH.HW,bot[1],bot[2]],[PH.HW,bot[1],bot[2]]],.5);
}
function camTick(dt){
  const b=BALL;let tgt=0,tx=0;
  if(S.phase==='roll'){
    if(b.st==='live')tgt=clamp((b.pz-.25)/(PH.ZL-.15),0,1);else if(b.st==='sink')tgt=1;else if(b.st==='out')tgt=b.res==='short'||b.res==='bounce'?0:1;
    if(S.pt>9)tgt=0;tx=clamp(b.px,-.3,.3)*.5;
  }else if(S.phase==='settle'){tgt=S.pt<.55?S.camT:0;}
  S.camT+=(tgt-S.camT)*(1-Math.exp(-dt*(tgt>S.camT?3.2:2.6)));S.camX+=(tx*S.camT-S.camX)*(1-Math.exp(-dt*3));
  /* snap the tails of the eases: a still camera means the cached G-buffer is reused */
  if(Math.abs(tgt-S.camT)<.004)S.camT=tgt;if(Math.abs(tx*S.camT-S.camX)<.0015)S.camX=tx*S.camT;
}
function applyCam(){
  const k=S.camT*S.camT*(3-2*S.camT),A=POSE.a,B=POSE.b,E=[0,1,2].map(i=>lerp(A.E[i],B.E[i],k)),T=[0,1,2].map(i=>lerp(A.T[i],B.T[i],k));
  setCam(E[0]+S.camX,E[1],E[2],T[0]+S.camX*1.2,T[1],T[2],lerp(A.F,B.F,k),0);
}
/* ---- one simulation tick of the alley (shared by play, attract and the autopilot) ---- */
function simTick(dt,c,e){
  S.t+=dt;S.pt+=dt;
  if(S.flash>0)S.flash-=dt*2.5;if(S.shake>0)S.shake=Math.max(0,S.shake-dt*1.8);
  dmdTick(dt);lampTick(dt);
  if(S.disp<S.score){S.disp=Math.min(S.score,S.disp+Math.max(1,Math.ceil((S.score-S.disp)*dt*6)));if(!S.demo)SFX.count();}
  if(S.hitstop>0){S.hitstop-=dt;partTick(dt*.2);return;}
  partTick(dt);
  const b=BALL;
  if(S.phase==='enter'){
    /* the next ball rolls out of the return channel into the hand, turning as it goes */
    const k=clamp(S.pt/.55,0,1),e2=1-(1-k)*(1-k)*(1-k),x0=PH.HW-PH.R-.005,z0=PH.ZHAND-.12;
    const nx=lerp(x0,S.handX,e2),nz=lerp(z0,PH.ZHAND,e2),vx=(nx-b.px)/dt,vz=(nz-b.pz)/dt;
    if(S.pt>dt*1.5){const w=Math.hypot(vx,vz)/PH.R;if(w>1e-3)spinQ(b,vz/(w*PH.R),0,-vx/(w*PH.R),w*dt);b.roll=Math.hypot(vx,vz);}
    b.px=nx;b.pz=nz;b.py=laneY(nz)+PH.R;S.handZ=PH.ZHAND;
    if(k>=1){S.phase='aim';S.pt=0;b.roll=0;}
  }else if(S.phase==='aim'){
    if(S.demo||S.auto)aiTick(dt);else aimInput(dt,c,e);
    if(S.phase==='aim'){const nx=S.handX,nz=S.handZ,vx=(nx-b.px)/dt,vz=(nz-b.pz)/dt,w=Math.hypot(vx,vz)/PH.R;if(w>1e-3)spinQ(b,vz/(w*PH.R),0,-vx/(w*PH.R),w*dt);b.px=nx;b.pz=nz;b.py=laneY(nz)+PH.R;b.roll=0;}
  }else if(S.phase==='roll'){
    physTick([b],dt,onEv);
    if(b.st==='live'&&(b.air>0||Math.hypot(b.vx,b.vy,b.vz)>2.2)){S.trails.push(b.px,b.py,b.pz);if(S.trails.length>24)S.trails.splice(0,3);}else if(S.trails.length)S.trails.splice(0,3);
    if(b.st==='gone'||S.pt>12){if(S.lastRes===null)score(0,null,'gutter');S.phase='settle';S.pt=0;}
  }else if(S.phase==='settle'){
    if(S.trails.length)S.trails.splice(0,3);
    if(S.pt>1.05&&(!dmdBusy()||S.pt>3.2)&&S.camT<.08)nextBall();
  }
}
