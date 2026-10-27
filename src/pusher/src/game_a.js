/* =====================================================================================
   11. THE GAME — session flow, chute, payouts, wheel, showers, attract pilot
   ===================================================================================== */
const SESSION=75,BANK0=20,REFILL=2.2,CASC_N=25,RELOAD=.24;
const S={mode:'title',t:0,paused:false,demo:true,auto:false,hi:parseInt(store.get('hd-pusher-hi','0'),10)||0,
  jp:clamp(parseInt(store.get('hd-pusher-jp','150'),10)||150,150,500),
  score:0,tk:0,tkf:0,won:0,lostN:0,prizes:0,wheelTk:0,bank:BANK0,bankT:0,time:SESSION,phase:'run',finalT:0,lastDrop:-9,dropped:0,showered:0,
  cx:0,cdir:1,manualT:0,aimT:0,reload:0,pending:false,ptrHold:0,bumps:3,x2:0,casc:0,shower:null,
  wheel:{on:false,queue:0,ang:0,w:0,flap:0,flapV:0,res:-1,t:0,show:0,lastPeg:0},
  parts:[],pops:[],shake:0,flash:0,flashC:[255,255,255],hitstop:0,banner:null,
  overT:0,tkShown:0,newHi:false,info:0,base:null,heap0:0,demoT:0,demoShowerT:12,trayN:0,trayX:0,warned:0};
/* quaternion product a*b */
function qMul(a,b){return [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];}
function randQ(){const u=Math.random(),v=Math.random()*TAU,w=Math.random()*TAU,s1=Math.sqrt(1-u),s2=Math.sqrt(u);return [s2*Math.cos(w),s1*Math.sin(v),s1*Math.cos(v),s2*Math.sin(w)];}
/* ---------- the chute: drops a coin standing on edge, with a little tumble, so it lands, rolls and settles ---------- */
const CHX=XW-1.6,YDR=CHY-.7;
function dropCoin(x,kind){
  const q=qMul(qAxis(0,1,0,rnd(-.5,.5)),qMul(qAxis(1,0,0,Math.PI/2+rnd(-.35,.35)),qAxis(0,1,0,rnd(0,TAU))));
  const i=spawn(kind,clamp(x+rnd(-.06,.06),-XW+1.05,XW-1.05),YDR,ZDROP+rnd(-.08,.08),q);if(i<0)return -1;
  VY[i]=-rnd(1.5,3.5);VZ[i]=rnd(-.6,.6);WX[i]=rnd(-7,7);WY[i]=rnd(-2,2);WZ[i]=rnd(-2,2);return i;
}
function pickKind(demo){const r=Math.random();return r<(demo?.14:.07)?2:Math.random()<.22?1:0;}
function chuteDrop(){
  if(S.reload>0)return false;
  if(!S.demo){if(S.bank<=0){if(S.mode==='play'&&S.t-S.warned>1){S.warned=S.t;SFX.back();pop(W/2,H*.5,'BANK EMPTY',[255,120,90]);}return false;}S.bank--;S.dropped++;S.jp=Math.min(500,S.jp+.25);}
  dropCoin(S.cx,S.nextKind||0);S.nextKind=pickKind(S.demo);S.reload=RELOAD;S.lastDrop=S.t;SFX.drop(S.cx);
  if(!S.demo&&gapNow())S.gapOK=.5;return true;
}
/* will a coin dropped now land in front of the pusher face (the best timing)? fall time ~0.26 s */
function gapNow(){const ph=PU.ph+TAU/PPER*.26;return PZM+PZA*Math.sin(ph)<ZDROP-1.05;}
function startShower(n,why){S.shower={n,t:0,k:0};S.flash=.5;S.flashC=[120,200,255];SFX.shower();banner('COIN SHOWER',GR.cyan,1.8);if(!S.demo){S.showered+=n;say('Coin shower',.8,1.05);}}
function showerTick(dt){const sh=S.shower;if(!sh)return;sh.t+=dt;
  while(sh.k<sh.n&&sh.t>sh.k*.065){sh.k++;const kind=Math.random()<.04?2:Math.random()<.3?1:0;
    const i=spawn(kind,rnd(-XF+1.6,XF-1.6),rnd(8.5,11.5),rnd(ZDROP-2.5,ZE-5),randQ());
    if(i>=0){VY[i]=-rnd(2,6);WX[i]=rnd(-8,8);WZ[i]=rnd(-8,8);}}
  if(sh.k>=sh.n)S.shower=null;}
/* ---------- the bonus wheel: pegs, a sprung flapper and friction decide where it stops ---------- */
const WSEG=[{t:'tk',v:3,c:[255,190,60]},{t:'shower',c:[70,190,255]},{t:'tk',v:5,c:[255,120,60]},{t:'coins',v:5,c:[120,240,120]},{t:'prize',c:[200,90,255]},
  {t:'tk',v:8,c:[255,90,140]},{t:'tk',v:3,c:[255,190,60]},{t:'tk',v:4,c:[255,150,40]},{t:'tk',v:5,c:[255,120,60]},{t:'x2',c:[90,255,220]},{t:'tk',v:12,c:[255,70,70]},{t:'jack',c:[255,230,120]}];
const WW=WSEG.map(s=>s.t==='jack'?.17:1),WSUM=WW.reduce((a,b)=>a+b,0),WA=[];{let a=0;for(const w of WW){WA.push(a);a+=w/WSUM*TAU;}WA.push(TAU);}
function wheelSeg(ang){let a=((-ang)%TAU+TAU)%TAU;for(let k=0;k<WSEG.length;k++)if(a<WA[k+1])return k;return 0;}
function wheelStart(){const w=S.wheel;w.on=true;S.spins=(S.spins||0)+1;w.w=rnd(7.5,11);w.res=-1;w.t=0;w.show=w.show||0;setTrack('wheel');SFX.confirm();banner('BONUS WHEEL',GR.volt,1.2);}
function wheelTick(dt){const w=S.wheel;
  w.show=clamp(w.show+(w.on||w.res>=0&&w.t<2.2?dt*4:-dt*3),0,1);
  if(!w.on){if(w.res>=0){w.t+=dt;if(w.t>2.4){w.res=-1;if(w.queue>0){w.queue--;wheelStart();}else setTrack(musicFor());}}else if(w.queue>0&&w.show<=0){w.queue--;wheelStart();}return;}
  w.t+=dt;const prev=w.ang;
  w.w-=(.42+.07*w.w)*dt;w.ang+=w.w*dt;
  /* pegs at every segment boundary: when one passes the flapper it costs energy and flicks the flapper */
  const a0=((-prev)%TAU+TAU)%TAU,a1=((-w.ang)%TAU+TAU)%TAU;
  for(let k=0;k<WSEG.length;k++){const pa=WA[k];const crossed=a1<=a0?(pa>a1&&pa<=a0):(pa>a1||pa<=a0);   // the pointer's local angle decreases as the wheel turns
    if(crossed&&w.w>0){w.w=Math.max(0,w.w-.07-Math.random()*.05);w.flapV-=10*Math.min(1,.3+w.w*.12);SFX.peg(w.w);}}
  w.flapV+=(-w.flap*90-w.flapV*9)*dt;w.flap+=w.flapV*dt;
  if(w.w<=.03){w.on=false;w.w=0;w.res=wheelSeg(w.ang);w.t=0;wheelPay(w.res);}
}
function wheelPay(k){const s=WSEG[k];let lv=1;
  if(s.t==='tk'){const v=s.v*(S.x2>0?2:1);S.tk+=v;S.wheelTk+=v;pop(W/2,H*.8,'+'+v+' TICKETS',[255,220,90],1.6);lv=s.v>=8?2:1;}
  else if(s.t==='shower'){if(S.demo||S.phase==='run'){startShower(20,'wheel');}else{S.tk+=5;S.wheelTk+=5;pop(W/2,H*.8,'+5 TICKETS',[255,220,90],1.6);}lv=2;}   // no rain after the clock: it would never end
  else if(s.t==='coins'){if(!S.demo)S.bank+=s.v;pop(W/2,H*.8,'+'+s.v+' COINS',[140,255,140],1.6);}
  else if(s.t==='prize'){const i=spawn(3,rnd(-6,6),9,rnd(ZDROP+1,11),qAxis(1,0,0,rnd(-.3,.3)));if(i>=0){HUE[i]=(Math.random()*4)|0;WX[i]=rnd(-3,3);}pop(W/2,H*.8,'PRIZE TOKEN',[220,140,255],1.6);lv=2;}
  else if(s.t==='x2'){S.x2=20;pop(W/2,H*.8,'DOUBLE TICKETS',[120,255,230],1.6);lv=2;}
  else if(s.t==='jack'){const v=Math.round(S.jp);S.tk+=v;S.wheelTk+=v;S.jackpots=(S.jackpots||0)+1;S.jp=150;pop(W/2,H*.8,'JACKPOT '+v,[255,240,120],2.6);S.flash=1;S.flashC=[255,220,120];S.hitstop=.25;S.shake=1;SFX.jackpot();say('Jackpot!',.7,1);lv=3;
}
  if(s.t!=='jack')SFX.wheelWin(lv);if(!S.demo)store.set('hd-pusher-jp',Math.round(S.jp));
}
/* ---------- feedback ---------- */
function pop(x,y,txt,col,life){S.pops.push({x,y,txt,col:col||[255,255,255],life:life||1,t:0});if(S.pops.length>14)S.pops.shift();}
function banner(txt,grad,life){S.banner={txt,grad,life,t:0};}
function spark(x,y,z,n,col,spd){for(let k=0;k<n&&S.parts.length<360;k++){const a=Math.random()*TAU,v=rnd(.3,1)*(spd||5);S.parts.push({x,y,z,vx:Math.cos(a)*v*.6,vy:rnd(.5,1.3)*v,vz:Math.sin(a)*v*.4+v*.3,life:rnd(.4,1),col});}}
/* ---------- payouts from the physics events ---------- */
function events(){
  let nw=0,sx=0;
  for(const e of PH.evWon){const k=e[0],x=e[1];nw++;sx+=x;
    if(S.mode==='over')continue;
    if(k===3){S.prizes++;const v=15*(S.x2>0?2:1);S.tk+=v;S.score+=500;pop(clampPX(x),H-22,'PRIZE +'+v,[220,150,255],2);banner('PRIZE WON',GR.violet,1.6);SFX.prize();S.flash=.7;S.flashC=[200,120,255];S.hitstop=.18;spark(x,-.2,ZE+.4,40,[220,140,255],8);}
    else{S.won++;S.casc++;const pts=k===2?50:10;S.score+=pts;S.tkf+=(S.x2>0?2:1)/10;if(S.tkf>=1){const w=Math.floor(S.tkf);S.tk+=w;S.tkf-=w;}
      spark(x,-.2,ZE+.3,k===2?18:6,k===2?[255,90,90]:[255,210,100],k===2?7:4);mergePop(x,pts);SFX.coinWon(k,x);
      if(k===2){S.wheel.queue++;banner('BONUS COIN',GR.red,1.2);SFX.bonusIn();}}
  }
  if(nw){S.trayN+=nw;S.trayX=sx/nw;}
  for(const e of PH.evLost){const k=e[0],x=e[1];if(S.mode==='over')continue;S.lostN++;
    if(k===2)pop(clampPX(x),H-26,'BONUS LOST',[255,90,90],1.2);else if(k===3)pop(clampPX(x),H-26,'PRIZE LOST',[255,90,90],1.5);
    spark(x,-1.5,e[2],4,[255,60,60],3);SFX.lost(x);}
  PH.evWon.length=0;PH.evLost.length=0;
  /* the shower meter: each shower raises the next threshold (25, 40, 55...) so a session builds to one big moment, not a loop */
  if(S.casc>=(S.cascN||CASC_N)&&!S.shower){S.casc=0;S.cascN=(S.cascN||CASC_N)+15;startShower(20,'cascade');}
}
function clampPX(x){proj(x,0,ZE);return clamp(PJ[0],20,W-20);}
function mergePop(x,pts){const px_=clampPX(x);for(const p of S.pops)if(p.merge&&p.t<.35&&Math.abs(p.x-px_)<26){p.v+=pts;p.txt='+'+p.v;p.t=Math.min(p.t,.1);p.x=(p.x+px_)/2;return;}
  const p={x:px_,y:H-18,txt:'+'+pts,col:[255,230,120],life:1.1,t:0,merge:true,v:pts};S.pops.push(p);if(S.pops.length>14)S.pops.shift();}
/* impact sounds: the loudest few impacts of this tick, each through the bank of its surface */
const HUSED=new Uint8Array(64);
function hitSounds(){const n=PH.nHits;if(!n||!AU.ctx)return;
  const used=HUSED;used.fill(0);for(let s=0;s<3;s++){let b=-1,bs=0;for(let k=0;k<n;k++)if(!used[k]&&PH.hits[k*5+3]>bs){bs=PH.hits[k*5+3];b=k;}if(b<0)break;used[b]=1;
    const o=b*5;SFX.clink(PH.hits[o+4],PH.hits[o+3],PH.hits[o],PH.hits[o+2]);}}
/* ---------- the cabinet bump: shake the machine (three per session) ---------- */
function bump(){if(!S.demo&&S.bumps<=0){SFX.tilt();pop(W/2,H*.5,'NO BUMPS LEFT',[255,120,90]);return;}
  if(!S.demo)S.bumps--;wakeAll();for(let k=0;k<NL;k++){const i=LIVE[k];if(BY[i]<-.5)continue;VY[i]+=rnd(1.5,3.2);VZ[i]+=rnd(.6,2.2);VX[i]+=rnd(-1,1);WX[i]+=rnd(-4,4);WZ[i]+=rnd(-4,4);}
  S.shake=.8;SFX.bump();pop(W/2,H*.45,'BUMP!',[255,200,120],.8);}
/* ---------- autopilot: attract mode, and the soak tester's player ---------- */
const AP={next:0,tx:0,style:0};
function pilot(dt,c){
  /* aim where the heap near the edge is tallest (pressure there tips coins over), sometimes at prize tokens */
  if(S.t>AP.next){AP.next=S.t+rnd(.4,1.1);
    let best=0,bx=rnd(-XF+3,XF-3);for(let k=0;k<NL;k++){const i=LIVE[k];if(BZ[i]>ZE-4&&BY[i]>.2&&Math.abs(BX[i])<XF-2){const s=BY[i]+(KIND[i]===3?2:0)+Math.random()*.3;if(s>best){best=s;bx=BX[i];}}}
    AP.tx=Math.random()<.6?bx:rnd(-XF+3,XF-3);}
  c.x=clamp((AP.tx-S.cx)*.8,-1,1);c.a=Math.abs(AP.tx-S.cx)<1.2&&(gapNow()||Math.random()<.02)&&(S.demo?NL<370||Math.random()<.35:S.bank>0);
  if(!S.demo&&S.bumps>0&&S.phase==='final'&&Math.random()<dt*.5)c.b=true;
  return c;
}
function musicFor(){return S.mode==='title'?'title':S.mode==='over'?'over':S.phase==='run'?'play':'last';}
