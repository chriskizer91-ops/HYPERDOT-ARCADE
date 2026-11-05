/* ===================== simulation step (60 Hz) ===================== */
{const lim={crash:.1,splinter:.06,topple:.2,bigstep:.08,boom:.05,step:.07,clank:.05,ping:.06,crunch:.06,zap:.035,impact:.08,pickup:.05,hurt:.09,heavy:.06,shell:.08,whistle:.12,pod:.1,charge:.15,laser:.2,missile:.08,dash:.1};
  const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m){PAN=0;return;}last[k]=t;f(...a);PAN=0;};}}
function updEnemies(dt){
  const P=PLY;
  for(const u of EN){
    if(u.dead)continue;
    u.t+=dt;u.spawnT+=dt;if(u.flash>0)u.flash-=dt;if(u.muz>0)u.muz-=dt;if(u.ramT>0)u.ramT-=dt;if(u.shieldHit>0&&u.type!=='shield')u.shieldHit-=dt;
    if(u.gate>0){u.gate-=dt;u.x+=u.vx*dt;u.y+=u.vy*dt;u.body=Math.atan2(u.vy,u.vx);u.aim=u.body;continue;}
    if(u.stun>0){u.stun-=dt;u.vx*=.9;u.vy*=.9;u.flash=(FRAME>>2)&1?.02:0;}
    else if(P.dead&&!G.demo){u.vx*=.94;u.vy*=.94;u.beams=null;}
    else u.d.think(u,dt);
    if(u.type==='turret'||(u.type==='maw'&&u.st==='leap'))continue;
    u.x+=u.vx*dt;u.y+=u.vy*dt;
    if(!u.d.fly){u.bumped=null;pushOut(u);
      if(u.bumped&&u.bumped.hp<9999){if(u.d.boss)damageProp(u.bumped,700*dt);else if(u.type==='tank')damageProp(u.bumped,90*dt);}}
  }
  for(let i=0;i<EN.length;i++){const a=EN[i];if(a.dead||a.d.fly||a.gate>0)continue;
    for(let j=i+1;j<EN.length;j++){const b=EN[j];if(b.dead||b.d.fly||b.gate>0)continue;const dx=b.x-a.x,dy=b.y-a.y,rr=a.r+b.r,d2=dx*dx+dy*dy;if(d2>=rr*rr||d2<1e-6)continue;
      const d=Math.sqrt(d2),ov=rr-d,ma=a.d.mass,mb=b.d.mass,ka=mb/(ma+mb),kb=ma/(ma+mb);a.x-=dx/d*ov*ka;a.y-=dy/d*ov*ka;b.x+=dx/d*ov*kb;b.y+=dy/d*ov*kb;}
    if(!P.dead&&!(a.type==='maw'&&a.st==='leap')){const dx=P.x-a.x,dy=P.y-a.y,rr=a.r+P.r*.85,d2=dx*dx+dy*dy;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2),ov=rr-d,ma=a.d.mass,mp=1.6,kp=ma/(ma+mp),ka=mp/(ma+mp);P.x+=dx/d*ov*kp;P.y+=dy/d*ov*kp;a.x-=dx/d*ov*ka;a.y-=dy/d*ov*ka;}}}
  if(!P.dead)pushOut(P);
  for(let i=EN.length-1;i>=0;i--)if(EN[i].dead)EN.splice(i,1);
}
function updTrails(dt){
  for(const s of SHELLS){const p=shellPos(s);if(FRAME%2===0)prt({k:'smoke',x:p[0],y:p[1],z:p[2],vx:0,vy:0,vz:.3,life:.7,max:.7,s:.14,grow:1.4});}
  for(const p of PODS){const k=1-p.t/p.T,z=k*k*34,r=p.big?1.1:.45;if(z<.3)continue;const x=p.x+k*k*5,y=p.y-k*k*2;
    prt({k:'fire',x:x+rnd(-.2,.2)*r,y,z:z+rnd(-.2,.3),vx:rnd(-.5,.5),vy:rnd(-.5,.5),vz:rnd(2,5),life:rnd(.15,.3),max:.3,s:r*.9,drag:.9});
    if(FRAME%2===0)prt({k:'smoke',x,y,z:z+r,vx:rnd(-.3,.3),vy:rnd(-.3,.3),vz:rnd(1,2),life:rnd(.8,1.4),max:1.4,s:r*.8,grow:1.5,drag:.96});}
  if(FRAME%6===0)for(const p of WORLD.props){if(p.dead||p.max>=9999||p.hp>p.max*.45||p.kind==='lamp')continue;if(Math.random()<.4){const x=rnd(p.x0,p.x1),y=rnd(p.y0,p.y1);
    prt({k:'smoke',x,y,z:p.h,vx:rnd(-.2,.2),vy:rnd(-.2,.2),vz:rnd(.8,1.6),life:rnd(1.2,2),max:2,s:.25,grow:1.5,drag:.97});if(Math.random()<.3)prt({k:'fire',x,y,z:p.h,vx:0,vy:0,vz:1.5,life:.3,max:.3,s:.35,drag:.9});}}
  const P=PLY;if(P&&!P.dead&&P.od>0&&FRAME%2===0)prt({k:'spark',x:P.x+rnd(-.6,.6),y:P.y+rnd(-.6,.6),z:rnd(1,2.6),vx:0,vy:0,vz:rnd(1,3),life:.25,max:.25,g:0,col:[255,200,90]});
  for(let i=LATER.length-1;i>=0;i--){const l=LATER[i];l.t-=dt;if(l.t<=0){LATER.splice(i,1);l.f();}}
}
function aimAssist(c){
  if(c.aim!=='point')return;
  for(const u of EN){if(u.dead||!u.d.fly)continue;w2h(u.x,u.y,u.z);if(Math.hypot(PJ[0]-c.px,PJ[1]-c.py)<dpm(u.x,u.y,u.z)*1.1){c.wx=u.x;c.wy=u.y;return;}}
}
/* attract-mode pilot */
const DEMO={wx:WW/2,wy:WH/2,wt:0,mt:0};
function demoCtl(dt){
  const P=PLY,o={mx:0,my:0,ax:0,ay:0,aim:null,fire:false,missile:false,dash:false,howl:false};
  let rx=0,ry=0,near=0;
  for(const u of EN){if(u.dead||u.d.fly)continue;const dx=P.x-u.x,dy=P.y-u.y,d=Math.hypot(dx,dy)||1,R=u.d.boss?9:u.type==='scuttler'?4.5:6.5;if(d<R){rx+=dx/d*(R-d)/R;ry+=dy/d*(R-d)/R;}if(d<12)near++;}
  for(const s of SHELLS){const dx=P.x-s.x1,dy=P.y-s.y1,d=Math.hypot(dx,dy)||1;if(d<s.rad+1.5){rx+=dx/d*2;ry+=dy/d*2;}}
  for(const r of RINGS)if(r.warn){const dx=P.x-r.x,dy=P.y-r.y,d=Math.hypot(dx,dy)||1;if(d<r.r1+1.5){rx+=dx/d*2;ry+=dy/d*2;}}
  DEMO.wt-=dt;if(DEMO.wt<=0||Math.hypot(DEMO.wx-P.x,DEMO.wy-P.y)<2){DEMO.wt=rnd(2,4);const s=openSpot(4);DEMO.wx=s[0];DEMO.wy=s[1];}
  let tx=DEMO.wx-P.x,ty=DEMO.wy-P.y;const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
  const e=nearestEnemy(P.x,P.y,60);
  if(e){const d=Math.hypot(e.x-P.x,e.y-P.y);if(d>11){tx=(e.x-P.x)/d;ty=(e.y-P.y)/d;}
    o.aim='dir';o.ax=e.x+e.vx*.2-P.x;o.ay=e.y+e.vy*.2-P.y;if(P.heat>90)DEMO.vent=1;else if(P.heat<35)DEMO.vent=0;o.fire=d<16&&!DEMO.vent&&P.over<=0;
    DEMO.mt-=dt;if(P.missT<=0&&(near>=3||e.d.boss||e.d.shield||e.d.armor)&&DEMO.mt<=0){o.missile=true;DEMO.mt=1;}
    if(Math.hypot(rx,ry)>1.1&&P.dashCD<=0&&Math.random()<.08)o.dash=true;
    if(P.odM>=100&&(near>=4||e.d.boss))o.howl=true;}
  o.mx=tx*.55+rx*1.7;o.my=ty*.55+ry*1.7;const l=Math.hypot(o.mx,o.my);if(l>1){o.mx/=l;o.my/=l;}
  return o;
}
function step(dt,c){
  G.t+=dt;let sdt=dt;
  if(G.slowT>0){G.slowT-=dt;sdt=dt*G.slow;if(G.slowT<=0)G.slow=1;}
  if(G.demo||G.auto)c=demoCtl(sdt);else aimAssist(c);
  updPlayer(sdt,c);updEnemies(sdt);updBul(sdt);updPods(sdt);updPick(sdt);updTrails(sdt);updPrt(sdt);
  if(!PLY.dead||G.demo)updWave(sdt);
  updCam(sdt);
  if(G.msgT>0)G.msgT-=dt;if(G.hurtT>0)G.hurtT-=dt;if(G.bossHit>0)G.bossHit-=dt;
  if(!G.demo&&PLY.dead&&PLY.deadT>2.6&&G.mode==='play')gameOver();
}

/* ===================== run flow ===================== */
function resetRun(){
  for(const a of [EN,BUL,MIS,SHELLS,BOMBS,PODS,PICK,PRT,LIGHTS,RINGS,POPS,LATER])a.length=0;
  FX.clearMarks();PLY=mkPlayer();Object.assign(G,{score:0,kills:0,wave:0,boss:null,endless:false,arena:'',slow:1,slowT:0,msg:null,msgT:0,shake:0,hurtT:0,paused:false,phase:'idle',newHi:false,t:0});
  CTL.prev={missile:true,dash:true,howl:true};
}
function startGame(){CAMYAW=0;G.demo=false;G.demoGod=false;resetRun();G.mode='play';G.menuI=0;startWave(1);snapCam();SFX.confirm();ARC.begin();}
function startDemo(){G.demo=true;G.demoGod=true;resetRun();G.mode='title';G.menuI=0;startWave(pick([2,3,4,8,9,10]));snapCam();setTrack('title');}
function saveHi(){G.newHi=G.score>G.hi;if(G.newHi){G.hi=G.score;store.set('hi',G.hi);}}
function gameOver(){G.mode='over';G.t=0;G.menuI=0;saveHi();setTrack('over');SFX.lose();say('Mech destroyed');G.tix=ihTickets(true);ARC.over(G.score,G.tix);}
function setPause(on){if(on&&document.pointerLockElement)document.exitPointerLock();G.paused=on;G.menuI=0;$('pauseBtn').textContent=on?'Resume':'Pause';if(on)SFX.back();}
function setDots(on){DOTS=on;store.set('dots',on?'1':'0');$('dotsv').textContent=on?'On':'Off';$('dots').classList.toggle('on',on);}
function setView(v){VIEWM=v;store.set('view',String(v));if(v!==2&&document.pointerLockElement)document.exitPointerLock();}
function cycleView(){setView((VIEWM+1)%3);SFX.select();if(G.mode==='play'&&!G.paused)msg('VIEW: '+VNAME[VIEWM],'',1.1,GR.steel);}
const VNAME=['TOP','CLOSE','BEHIND'];
const QLBL={low:'Low',med:'Medium',high:'High'};
function showQual(){$('qualv').textContent=QLBL[QN];}
function cycleQuality(){const n=QORDER[(QORDER.indexOf(QN)+1)%QORDER.length];applyQuality(n);QLOCK=true;store.set('q',n);showQual();PERF.wait=3;}

/* ===================== UI tick ===================== */
let TAP=null;const UIP={},HOT=[];const UIM={x:-1,y:-1};
function hotAt(x,y){for(const h of HOT)if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return h;return null;}
function menuNav(n,e,horiz){
  if(MOUSE.on&&(MOUSE.x!==UIM.x||MOUSE.y!==UIM.y)){UIM.x=MOUSE.x;UIM.y=MOUSE.y;const h=hotAt(MOUSE.x,MOUSE.y);if(h&&h.i!==G.menuI&&h.i<n){G.menuI=h.i;SFX.select();}}
  if(horiz?e.l:e.u){G.menuI=(G.menuI+n-1)%n;SFX.select();}
  if(horiz?e.r:e.d){G.menuI=(G.menuI+1)%n;SFX.select();}
  let act=-1;
  if(MOUSE.lp){const h=hotAt(MOUSE.x,MOUSE.y);if(h)act=h.i;MOUSE.lp=false;}
  else if(TAP){const h=hotAt(TAP.x,TAP.y);if(h){act=h.i;G.menuI=h.i;}TAP=null;}
  else if(e.ok)act=G.menuI;
  return act<n?act:-1;
}
function tick(dt){
  FRAME++;CAMFX.upd(dt);if(FRAME%3===0)for(let i=0;i<512;i++)HOLOX[i]=Math.random()<.07?((Math.random()*5)|0)-2:0;
  const c=readCtl(),e={};
  c.pz=K('Escape')||K('KeyP')||c.start;c.ok=c.ok||TS.M;c.ex=K('Escape')||padHeld(1);   /* ex: Esc or gamepad B, the arcade's back-out */
  for(const k of ['u','d','l','r','ok','back','pz','ex']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const m=G.mode;
  if(m==='title'){step(dt,c);if(EMBED&&e.ex)ARC.exit();else{const a=menuNav(EMBED?3:2,e);if(a===0)startGame();else if(a===1){G.mode='howto';G.howP=0;SFX.confirm();}else if(a===2){SFX.back();ARC.exit();}}}
  else if(m==='howto'){step(dt,c);
    const adv=e.ok||e.r||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;
    if(e.back||e.l&&G.howP===0){G.mode='title';G.menuI=1;SFX.back();}else if(e.l){G.howP--;SFX.select();}else if(adv){G.howP++;SFX.select();if(G.howP>1){G.mode='title';G.menuI=0;}}}
  else if(m==='play'){
    if(G.paused){const a=menuNav(6,e);if(e.back||e.pz||a===0)setPause(false);else if(a===1){setPause(false);arcQuit();startGame();}else if(a===2){cycleQuality();SFX.select();}else if(a===3){cycleView();}else if(a===4){setDots(!DOTS);SFX.select();}else if(a===5){setPause(false);arcQuit();startDemo();}}
    else if(e.pz)setPause(true);
    else{if(LATCH.has('KeyV'))cycleView();step(dt,c);if(PLY&&BEHIND())CAMH+=angD(PLY.turret,CAMH)*Math.min(1,dt*7);}}
  else if(m==='upgrade'){G.t+=dt;const n=G.upg.length;let a=menuNav(n,e,true);
    for(let i=0;i<n;i++)if(LATCH.has('Digit'+(i+1)))a=i;
    if(a>=0&&G.t>.5){const u=G.upg[a];applyUpg(u.id);SFX.confirm();say(u.name.toLowerCase());G.mode='play';CTL.prev={missile:true,dash:true,howl:true};startWave(G.wave+1);}}
  else if(m==='over'||m==='win'){G.t+=dt;updPrt(dt);updTrails(dt);updCam(dt);if(G.msgT>0)G.msgT-=dt;
    const a=menuNav(2,e);if(G.t>1.2&&a>=0){
      if(m==='over'){if(a===0)startGame();else startDemo();}
      else{if(a===0){G.endless=true;G.mode='play';CTL.prev={missile:true,dash:true,howl:true};startWave(13);}else{saveHi();ARC.over(G.score,ihTickets(true));startDemo();}}}}
  TAP=null;
  if(ARC.live)ARC.score(G.score);
  if(G.mode==='win'&&!G.winSaved){G.winSaved=1;saveHi();say('Arena cleared');}if(G.mode!=='win')G.winSaved=0;
}

/* ===================== chrome, loop, boot ===================== */
function toggleSound(){AU.muted=!AU.muted;store.set('mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('dots').addEventListener('click',e=>{setDots(!DOTS);e.currentTarget.blur();});
$('qual').addEventListener('click',e=>{cycleQuality();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();if(G.mode==='play')setPause(!G.paused);else if(G.mode==='howto'){G.mode='title';G.menuI=0;}e.currentTarget.blur();});
/* behind the mech on a computer: click the view to aim with the mouse (Esc gives the pointer back and pauses) */
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&BEHIND()&&!G.paused&&document.pointerLockElement!==cv){try{const r=cv.requestPointerLock({unadjustedMovement:true});if(r&&r.catch)r.catch(()=>{try{cv.requestPointerLock();}catch(_){}});}catch(_){}}});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==cv&&G.mode==='play'&&!G.paused&&BEHIND())setPause(true);});
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;e.preventDefault();audioInit();TAP={x:(e.clientX-RECT.x)/RECT.w*W,y:(e.clientY-RECT.y)/RECT.h*H};});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('resize',()=>{RESZ=1;});let RESZ=0;
/* ===================== arcade bridge: tickets and commands ===================== */
function ihWaves(){return Math.max(0,G.phase==='clear'?G.wave:G.wave-1);}   /* waves cleared this run */
/* tickets: 3 per wave cleared, 1 per 5,000 points, 20 for clearing the arena; a run that ends on its own pays at least 3; max 150 */
function ihTickets(natural){const t=3*ihWaves()+Math.floor(G.score/5000)+(ihWaves()>=12?20:0);return Math.min(150,natural?Math.max(3,t):t);}
function arcQuit(){if(ARC.live)ARC.over(G.score,ihTickets(false));}   /* restart or quit from the pause menu */
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){audioInit();if(ARC.live&&G.mode==='win'){saveHi();ARC.over(G.score,ihTickets(true));}if(!ARC.live){if(G.paused)setPause(false);startGame();}}
  else if(m.cmd==='pause'){if(G.mode==='play'&&!G.paused)setPause(true);}
  else if(m.cmd==='resume'){if(G.mode==='play'&&G.paused)setPause(false);}
  else if(m.cmd==='attract'){ARC.live=false;if(G.paused)setPause(false);startDemo();}
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();try{speechSynthesis.cancel();}catch(_){}}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
window.HYPERDOT_GAME={id:ARC.id,title:ARC.title,tickets:true,version:1};
/* ---------- quality: steps down by itself when the frame rate can't hold ---------- */
const PERF={acc:0,n:0,good:0,wait:2};
function applyQuality(qn){
  QN=qn;Q=QUAL[qn];renderer.shadowMap.enabled=Q.shadow>0;if(Q.shadow)setShadowSize(Q.shadow);
  POOL.forEach((L,i)=>L.visible=i<Q.lights);buildPrims();DYN=1;sizeTargets();
  scene.traverse(o=>{if(o.material){for(const m of [].concat(o.material))m.needsUpdate=true;}});
}
function perfTick(ft){
  if(PERF.wait>0){PERF.wait-=ft;return;}
  const busy=G.mode==='play'&&!G.paused||G.mode==='title';if(!busy)return;
  PERF.acc+=ft;PERF.n++;
  if(PERF.acc>=2.5){const avg=PERF.acc/PERF.n;PERF.acc=0;PERF.n=0;
    if(avg>1/47){PERF.good=0;
      if(DYN>Q.dyn+.01){DYN=Math.max(Q.dyn,DYN-.15);sizeTargets();PERF.wait=1.5;}
      else if(!QLOCK&&QN!=='low'){applyQuality(QORDER[QORDER.indexOf(QN)-1]);showQual();PERF.wait=3;}}
    else if(avg<1/57){PERF.good++;if(PERF.good>=4&&DYN<1){DYN=Math.min(1,DYN+.1);sizeTargets();PERF.good=0;PERF.wait=1.5;}}}
}
let ACC=0,LAST=0,READY=false;
function frame(ts){
  requestAnimationFrame(frame);
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  musicTick(G.paused);
  if(n===0)return;                       /* one render per 60 Hz step, even on 120 Hz screens */
  RT_FT+=dt;if(G.paused&&(FRAME&1))return;
  const ft=RT_FT;RT_FT=0;
  if(RESZ){RESZ=0;resize();}
  if(WORLD){placeCamera(ft);viewBounds();const th=performance.now();drawHUD();PROF.hud+=performance.now()-th;render3D(ft);}
  perfTick(ft);
  if(!READY){READY=true;$('boot').classList.add('gone');ARC.post('ready',{title:ARC.title,w:W,h:H,tickets:true});}
}
let RT_FT=0;
if(!OK3D){$('err').style.display='grid';ARC.post('ready',{title:ARC.title,tickets:true});}
else{
  if(AU.muted)$('snd').textContent='Sound off';
  setDots(DOTS);showQual();
  buildPrims();FX.init();resize();
  startDemo();
  /* compile every shader up front so the first explosion doesn't stutter */
  try{render3D(1/60);renderer.compile(scene,camera);}catch(e){}
  window.__ih3={ARC,AU,ihTickets,gameOver,G,get PLY(){return PLY},EN,BUL,MIS,PRT,PICK,PODS,RINGS,KEY,MOUSE,TS,LATCH,get WORLD(){return WORLD},startGame,startDemo,startWave,spawnPod,applyUpg,openUpgrade,tick,setDots,setView,applyQuality,renderer,get Q(){return QN},get DYN(){return DYN},get RS(){return RS},PR,FX,STATS,PROF,mkEnemy,EDEF,setPause,hurtPlayer,damageProp,explode,dropPick,get QLOCK(){return QLOCK},set CAMOV(v){CAMOV=v},get CAM(){return CAM},
    ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},
    tickCost(k){const t=performance.now();for(let i=0;i<k;i++)tick(1/60);return (performance.now()-t)/k;}};
  requestAnimationFrame(frame);
}
