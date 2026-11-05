/* ===================== simulation step (60 Hz) ===================== */
{const lim={boom:.05,elaser:.03,shieldHit:.06,hullHit:.08,flyby:.4,missile:.08,lockTone:.1,laser:.03,impact:.12,bigboom:.15,capboom:.5,radio:.2,warn:.12};
  const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
function msg(t,sub,dur,col){G.msg={t,sub,col:col||GR.steel};G.msgT=dur||2;}
function step(dt,c){
  G.t+=dt;let sdt=dt;if(G.slowT>0){G.slowT-=dt;sdt=dt*G.slow;if(G.slowT<=0)G.slow=1;}
  if(PL&&!PL.dead&&c)updPlayer(sdt,G.auto?autoCtl():c);
  for(const e of ENT){if(e.dead)continue;if(e.flash>0)e.flash-=sdt;if(e.hitT>0)e.hitT-=sdt;if(e.shHit>0)e.shHit-=sdt;
    if(e.kind==='ship'){if(!e.isPlayer)aiShip(e,sdt);if(FRAME%2===0){const ep=ENG_POS[e.type]||[[0,0,-2]];if(!e.tr)e.tr=ep.map(()=>[]);for(let j=0;j<ep.length;j++){const t=e.tr[j];t.push(toWorld(e,ep[j]));if(t.length>18)t.shift();}}}
    else if(e.kind==='rock'){vaddm(e.pos,e.vel,sdt);e.q=qnorm(qmul(e.q,qaxis(e.spin[0],e.spin[1]*sdt)));}}
  updCaps(sdt);updBolts(sdt);updFX(sdt);updMission(sdt);updRadio(dt);
  if(FRAME%30===0){let j=0;for(let i=0;i<ENT.length;i++){const e=ENT[i];if(!e.dead||e===PL)ENT[j++]=e;}ENT.length=j;}
  G.shake=Math.max(0,G.shake-dt*1.6);if(G.multT>0){G.multT-=dt;if(G.multT<=0)G.mult=1;}if(G.hurt>0)G.hurt-=dt;if(G.msgT>0)G.msgT-=dt;if(G.hitMark>0)G.hitMark-=dt;
  if(G.demo)demoDirector(dt);
  updCamera(dt);
}
/* test autopilot for the player */
function autoCtl(){const P=PL;const CV=G.M&&G.M.cv;if(CV&&!CV.dead&&(P.hp<P.max*.35||PLS.homing&&P.hp<P.max*.95)){PLS.homing=true;const s=steerTo(P,CV.pos,1),av=avoid(P),c0={pitch:s.pitch,yaw:s.yaw,roll:s.roll,thr:vdist(P.pos,CV.pos)<CV.r+200?0:1,fire:false,missile:false,boost:vdist(P.pos,CV.pos)>1500,target:false,cock:false};if(av){const a2=steerTo(P,av,1.2);Object.assign(c0,{pitch:a2.pitch,yaw:a2.yaw,roll:a2.roll});}return c0;}PLS.homing=false;PLS.autoPick=(PLS.autoPick||0)-1/60;if(PLS.autoPick<=0){PLS.autoPick=2;let best=null,bs=1e9;for(const o of ENT){if(!targetable(o)||!hostile('a',o.team))continue;if(o.shielded&&o.shielded())continue;let s=vdist(o.pos,P.pos);if(o.objective)s*=.15;if(o.sub==='beam')s*=.05;if(o.kind==='torp')s*=.2;if(o.kind==='sub'&&o.sub==='turret')s*=1.5;if(s<bs){bs=s;best=o;}}if(best)PLS.tgt=best;}
  const T=PLS.tgt,c={pitch:0,yaw:0,roll:0,thr:P.thr<.9?1:0,fire:false,missile:false,boost:false,target:false,cock:false};
  const av=avoid(P);if(av){const s=steerTo(P,av,1.2);Object.assign(c,{pitch:s.pitch,yaw:s.yaw,roll:s.roll});return c;}
  if(PLS.autoX>0){PLS.autoX-=1/60;c.boost=true;return c;}
  if(T&&T.kind==='ship'&&vdist(P.pos,T.pos)<130&&Math.random()<.02){PLS.autoX=1.6;}
  if(T&&T.kind==='sub'&&T.parent){const C=T.parent,up=vmul(qU(C.q),T.lp[1]<0?-1:1),rel=vsub(P.pos,T.pos),h=vdot(rel,up),dist=vlen(rel);if(h<60&&dist<1400&&!PLS.autoUp){PLS.autoUp=1;}if(PLS.autoUp){const goal=vadd(T.pos,vadd(vmul(up,500),vmul(vnorm(vsub(rel,vmul(up,h))),300)));const s=steerTo(P,goal,1);Object.assign(c,{pitch:s.pitch,yaw:s.yaw,roll:s.roll});if(h>380||dist>1600)PLS.autoUp=0;return c;}}
  if(T){const aim=PLS.lead||T.pos,s=steerTo(P,aim,1),d=vdist(P.pos,T.pos),ang=Math.acos(clamp(vdot(qF(P.q),vnorm(vsub(aim,P.pos))),-1,1));Object.assign(c,{pitch:s.pitch,yaw:s.yaw,roll:s.roll});
    c.fire=ang<.06&&d<1400;c.missile=PLS.locked&&(T.kind!=='ship'||T.type==='viper'||T.type==='hammer'||Math.random()<.01);if(d<120&&T.kind==='sub'){c.pitch=1;}if(d>2500)c.boost=true;}
  return c;}
/* ===================== attract-mode battle ===================== */
function startDemo(){
  clearWorld();G.demo=true;G.demoCam=true;G.M=null;G.mode='title';G.menuI=0;const ti=(Math.random()*6)|0;useTheme(ti);
  const CV=mkCap('carrier','a',[-300,-80,-600],qaxis([0,1,0],.4),{name:'HALCYON'});addTurrets(CV,[[30,22,200],[-30,22,200],[30,22,-200],[-30,22,-200]],1.2,9999,99);
  const F=mkCap(Math.random()<.5?'frigate':'levi','e',[400,60,2600],qaxis([0,1,0],PI-.5),{name:'RAIDER'});const mm=F.mesh.mounts;addTurrets(F,mm.turrets,F.mk==='levi'?1.6:1.3,9999,2);
  if(ti===2)for(let i=0;i<40;i++)mkRock(vadd([0,0,1000],[rnd(-1500,1500),rnd(-300,300),rnd(-1200,1200)]),rnd(14,70));
  DEMOB.t=0;CAM.cine.subj=null;setTrack('title');
}
const DEMOB={t:0};
function demoDirector(dt){DEMOB.t-=dt;if(DEMOB.t>0)return;DEMOB.t=3;
  const a=ENT.filter(e=>e.kind==='ship'&&!e.dead&&e.team==='a').length,e=ENT.filter(x=>x.kind==='ship'&&!x.dead&&x.team==='e').length;
  if(a<5)wing('sparrow','a',3,vadd([-300,0,-300],vrand(300)),vnorm([rnd(-.3,.3),0,1]),40);
  if(e<7){const t=pick(['dart','dart','wasp','hammer','ace']);wing(t,'e',3,vadd([300,40,2000],vrand(400)),vnorm([rnd(-.3,.3),0,-1]),40);}
}
/* ===================== upgrades ===================== */
const UPG=[
  {id:'rate',name:'RAPID CYCLERS',d:['CANNONS FIRE','20% FASTER'],max:3,cat:'w'},{id:'dmg',name:'FOCUS LENSES',d:['BOLTS HIT','25% HARDER'],max:3,cat:'w'},
  {id:'quad',name:'QUAD LINK',d:['ALL FOUR GUNS','FIRE TOGETHER'],max:1,cat:'w'},{id:'cap',name:'CAPACITORS',d:['MORE CANNON ENERGY','AND FASTER RECHARGE'],max:2,cat:'w'},
  {id:'pods',name:'MAGAZINE',d:['+4 MISSILES','EACH SORTIE'],max:3,cat:'w'},{id:'seek',name:'SEEKER HEADS',d:['MISSILES TURN AND','HIT HARDER'],max:2,cat:'w'},
  {id:'lock',name:'FAST LOCK',d:['MISSILE LOCK','40% QUICKER'],max:2,cat:'w'},{id:'shield',name:'DEFLECTORS',d:['+35 SHIELD AND','FASTER REGEN'],max:3,cat:'d'},
  {id:'hull',name:'ARMOR PLATE',d:['+30 HULL','EACH SORTIE'],max:3,cat:'d'},{id:'boost',name:'AFTERBURNER',d:['LONGER, FASTER','BOOST'],max:2,cat:'u'},
  {id:'agile',name:'VECTOR THRUST',d:['TURN RATE','+15%'],max:2,cat:'u'}
];
const ICONS={rate:['1..1...','.1..1..','..1..1.','...1..1','..1..1.','.1..1..','1..1...'],dmg:['...1...','..111..','.11111.','1111111','.11111.','..111..','...1...'],
  quad:['11...11','11...11','.......','..111..','.......','11...11','11...11'],cap:['..111..','.1...1.','.1.1.1.','.1.1.1.','.1.1.1.','.1...1.','.11111.'],
  pods:['...1...','..111..','..1.1..','..111..','.11111.','1.111.1','..1.1..'],seek:['1.....1','.1...1.','..1.1..','...1...','..1.1..','.1...1.','1.....1'],
  lock:['11...11','1.....1','...1...','..111..','...1...','1.....1','11...11'],shield:['1111111','1.....1','1.111.1','1.111.1','.1.1.1.','..1.1..','...1...'],
  hull:['1111111','1.1.1.1','1111111','1.1.1.1','1111111','1.1.1.1','1111111'],boost:['...1...','..111..','.11111.','...1...','..111..','.1.1.1.','1..1..1'],
  agile:['..111..','.1...1.','1.....1','1..1..1','1.....1','.1...1.','..111..']};
const CATC={w:['#ffae2a','#ffd040','WEAPON'],d:['#6aff5a','#b4ffaa','DEFENSE'],u:['#4fe0ff','#a6f3ff','FLIGHT']};
function rollUpgrades(){const pool=UPG.filter(u=>(G.up[u.id]||0)<u.max),ch=[];while(ch.length<3&&pool.length)ch.push(pool.splice((Math.random()*pool.length)|0,1)[0]);return ch;}
/* ===================== flow ===================== */
function saveRun(){store.set('save',JSON.stringify({mi:G.mi,up:G.up,score:G.score}));}
function loadRun(){try{return JSON.parse(store.get('save','null'));}catch(e){return null;}}
function newCampaign(){G.up={};G.score=0;G.demo=false;G.demoCam=false;vlBegin();brief(0);}
function brief(i){G.mi=i;saveRun();G.scoreStart=G.score;startMission(i);G.demo=false;G.demoCam=false;G.mode='brief';G.t=0;G.msgT=0;setTrack('brief');CAM.cine.subj=null;G.briefA=0;}
function launch(){G.mode='play';G.t=0;setTrack(MISSIONS[G.mi].music);msg('MISSION '+(G.mi+1),MISSIONS[G.mi].name,3,GR.cyan);SFX.confirm();say('Launch','SYS');}
function endMission(win){
  const M=G.M,st=G.stats;
  if(win){const acc=st.shots?Math.round(st.hits/st.shots*100):0,hullB=PL&&!PL.dead?Math.round(PL.hp/PL.max*100)*40:0,accB=acc*120,tB=Math.max(0,Math.round((420-M.t)*20));
    G.deb={win:true,kills:st.kills,acc,time:M.t,rows:[['MISSION BONUS',M.bonus||0],['ACCURACY '+acc+'%',accB],['HULL INTACT',hullB],['SPEED',tB]]};
    for(const r of G.deb.rows)G.score+=r[1];
    if(G.score>G.hi){G.hi=G.score;store.set('hi',G.hi);G.deb.hi=true;}
    G.mode='debrief';setTrack('win');ARC.wins++;}
  else{G.deb={win:false,why:M.why};G.mode='fail';setTrack('over');}
  G.t=0;G.menuI=0;
}
function afterDebrief(){if(G.mi>=MISSIONS.length-1){G.mode='victory';G.t=0;G.menuI=0;const cv=G.M&&G.M.cv;if(cv&&!cv.dead){G.demoCam=true;Object.assign(CAM.cine,{subj:cv,kind:'orbit',t:0,dur:1e9,ang:0,h:.3});for(let i=0;i<3;i++)wing('sparrow','a',3,vadd(cv.pos,[rnd(-400,400),rnd(60,200),rnd(-600,600)]),vnorm([rnd(-1,1),0,1]),40);}store.set('save','null');say('The Leviathan is destroyed. Halcyon is safe.','CMD');G.tix=vlTickets(true);ARC.over(G.score,G.tix);return;}G.upg=rollUpgrades();G.mode='upgrade';G.menuI=1;G.t=0;setTrack('shop');}
/* ===================== UI tick ===================== */
let TAP=null;const UIP={},HOT=[],UIM={x:-1,y:-1};
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
function titleItems(){const sv=loadRun(),it=[['START','start']];if(sv&&sv.mi>0)it.push(['CONTINUE: MISSION '+(sv.mi+1),'cont']);it.push(['HOW TO PLAY','how'],['OPTIONS','opt']);return it;}
function tick(dt){
  FRAME++;
  const c=readCtl(),e={};c.pz=K('Escape')||K('KeyP')||c.start;c.okT=c.ok||TS.F;c.ex=K('Escape')||padHeld(1);   /* ex: Esc or gamepad B, the arcade's back-out */
  for(const k of ['u','d','l','r','ok','okT','back','pz','ex']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const m=G.mode;
  if(m==='title'){step(dt,null);if(EMBED&&e.ex)ARC.exit();else{const it=titleItems(),a=menuNav(it.length,{...e,ok:e.ok||e.okT});
    if(a>=0){const k=it[a][1];if(k==='start'){SFX.confirm();newCampaign();}else if(k==='cont'){const sv=loadRun();SFX.confirm();G.up=sv.up||{};G.score=sv.score||0;G.demo=false;vlBegin();brief(sv.mi);}
      else if(k==='how'){G.mode='howto';G.howP=0;SFX.confirm();}else if(k==='opt'){openOptions(false);}}}}
  else if(m==='howto'){step(dt,null);const adv=e.ok||e.okT||e.r||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;
    if(e.back||(e.l&&G.howP===0)){G.mode='title';G.menuI=titleItems().findIndex(x=>x[1]==='how');SFX.back();}else if(e.l){G.howP--;SFX.select();}else if(adv){G.howP++;SFX.select();if(G.howP>1){G.mode='title';G.menuI=0;}}}
  else if(m==='brief'){G.t+=dt;G.briefA+=dt;updCamBrief(dt);const go=e.ok||e.okT||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;if(G.t>.7&&go)launch();if(e.back){arcQuit();startDemo();}}
  else if(m==='play'){
    if(G.paused){const a=menuNav(PAUSE_ITEMS.length,e);if(e.back||e.pz||a===0)setPause(false);else if(a===1){setPause(false);G.score=G.scoreStart;brief(G.mi);}else if(a===2){openOptions(true);}else if(a===3){setPause(false);arcQuit();startDemo();}}
    else if(e.pz)setPause(true);
    else{if(c.cock){G.camMode=(G.camMode+1)%3;store.set('cam',G.camMode);SFX.select();}step(dt,c);}}
  else if(m==='options'){if(!G.optFromPause)step(dt,null);optionsTick(e);}
  else if(m==='debrief'){G.t+=dt;step(dt,null);const go=e.ok||e.okT||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;if(G.t>1.2&&go){SFX.confirm();afterDebrief();}}
  else if(m==='upgrade'){G.t+=dt;const n=G.upg.length;let a=menuNav(n,e,true);for(let i=0;i<n;i++)if(LATCH.has('Digit'+(i+1)))a=i;
    if(a>=0&&G.t>.5){const u=G.upg[a];G.up[u.id]=(G.up[u.id]||0)+1;SFX.confirm();say(u.name.toLowerCase(),'SYS');brief(G.mi+1);}}
  else if(m==='fail'){G.t+=dt;step(dt,null);const a=menuNav(2,e);if(G.t>1&&a>=0){if(a===0){G.score=G.scoreStart;brief(G.mi);}else{ARC.over(G.score,vlTickets(true));startDemo();}}}
  else if(m==='victory'){G.t+=dt;step(dt,null);const go=e.ok||e.okT||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;if(G.t>2.5&&go)startDemo();}
  TAP=null;
  if(ARC.live)ARC.score(G.score);
  engineTick(m==='play'&&!G.paused&&PL&&!PL.dead,PL?PL.thr:0,PLS.boostHeld);
}
function updCamBrief(dt){const P=PL;if(!P)return;const a=G.briefA*.12+.6,R=34;CAM.pos=vadd(P.pos,[Math.sin(a)*R,8,Math.cos(a)*R]);CAM.q=qlook(vsub(P.pos,CAM.pos),[0,1,0]);CAM.F=(W/2)/Math.tan(40*D2R);CAM.cy=.5;}
function setPause(on){G.paused=on;G.menuI=0;$('pauseBtn').textContent=on?'Resume':'Pause';if(on)SFX.back();}
/* options, from the title or from the pause menu */
function openOptions(fromPause){G.optFromPause=fromPause;G.mode='options';G.menuI=0;SFX.confirm();}
function closeOptions(){SFX.back();if(G.optFromPause){G.mode='play';G.paused=true;G.menuI=2;}else{G.mode='title';G.menuI=titleItems().findIndex(x=>x[1]==='opt');}G.optFromPause=false;}
function optionsTick(e){
  const it=optItems(),a=menuNav(it.length,e);if(e.back){closeOptions();return;}if(a<0)return;const k=it[a][1];
  if(k==='back'){closeOptions();return;}
  if(k==='cam'){G.camMode=(G.camMode+1)%3;store.set('cam',G.camMode);}
  else if(k==='aim'){AIM=(AIM+1)%AIM_LV.length;store.set('aim',AIM);}
  else if(k==='inv'){INVERT=!INVERT;store.set('inv',INVERT?'1':'0');}
  else if(k==='dotf'){DOTF=!DOTF;store.set('dotf',DOTF?'1':'0');}
  else if(k==='dots'){setDots((dotI+1)%DOTS.length);}
  else if(k==='q'){if(qAuto)setQuality(0,false);else if(qI<2)setQuality(qI+1,false);else setQuality(touchy?1:2,true);}
  else if(k==='voice'){VOICE=!VOICE;store.set('voice',VOICE?'1':'0');if(!VOICE)try{speechSynthesis.cancel();}catch(_){}}
  else if(k==='snd'){toggleSound();}
  SFX.select();}

/* ===================== chrome, loop, boot ===================== */
function toggleSound(){AU.muted=!AU.muted;store.set('mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
function pauseKey(){audioInit();if(G.mode==='play')setPause(!G.paused);else if(G.mode==='howto'){G.mode='title';G.menuI=0;}else if(G.mode==='options')closeOptions();}
$('pauseBtn').addEventListener('click',e=>{pauseKey();e.currentTarget.blur();});
$('pzb').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pauseKey();});
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;e.preventDefault();audioInit();TAP={x:(e.clientX-RECT.x)/RECT.w*W,y:(e.clientY-RECT.y)/RECT.h*H};});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('resize',resize);
/* ===================== arcade bridge: tickets and commands ===================== */
function vlBegin(){ARC.begin();ARC.base=G.score;ARC.wins=0;}   /* a new or continued campaign is one credit */
/* tickets, exactly as the original: 3 per mission won, 1 per 6,000 points earned this credit, 20 for the victory; a credit that ends on
   its own (victory, or quitting after a failed mission) pays at least 3; max 150. */
function vlTickets(natural){const t=3*ARC.wins+Math.floor(Math.max(0,G.score-ARC.base)/6000)+(G.mode==='victory'?20:0);return Math.min(150,natural?Math.max(3,t):t);}
function arcQuit(){if(ARC.live)ARC.over(G.score,vlTickets(false));}   /* backing out of a briefing or quitting from the pause menu */
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){audioInit();if(!ARC.live){if(G.paused)setPause(false);SFX.confirm();newCampaign();}}
  else if(m.cmd==='pause'){if(G.mode==='play'&&!G.paused)setPause(true);}
  else if(m.cmd==='resume'){if(G.mode==='play'&&G.paused)setPause(false);}
  else if(m.cmd==='attract'){ARC.live=false;if(G.paused)setPause(false);startDemo();}
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();try{speechSynthesis.cancel();}catch(_){}}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
window.HYPERDOT_GAME={id:ARC.id,title:ARC.title,tickets:true,version:1};
/* auto quality: if the frame rate cannot hold while flying, step down one level (never back up on its own) */
function perfTick(dt){
  if(!qAuto||qI===0)return;if(PERF.cool>0){PERF.cool-=dt;return;}if(G.mode!=='play'&&G.mode!=='title'||G.paused)return;
  PERF.sum+=dt;PERF.n++;if(PERF.sum>=2.5){const avg=PERF.sum/PERF.n;PERF.fps=1/avg;PERF.sum=0;PERF.n=0;if(avg>1/44)setQuality(qI-1,true);}
}
let ACC=0,LAST=0;
function frame(ts){
  const raw=LAST?(ts-LAST)/1000:1/60,dt=Math.min(.05,raw);LAST=ts;
  /* single presses (C, T, a click) count once, even when a slow frame catches up with several steps */
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;if(n===1)endInputFrame();}if(n===4)ACC=0;
  draw();musicTick(G.paused);renderFrame();perfTick(Math.min(.25,raw));
  document.body.classList.toggle('playing',G.mode==='play'&&!G.paused);
  requestAnimationFrame(frame);
}
/* a phone can drop the 3D context when the app goes to the background; the campaign is saved per mission, so start fresh */
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();},false);
cv.addEventListener('webglcontextrestored',()=>location.reload(),false);
function boot(){
  if(AU.muted)$('snd').textContent='Sound off';
  const qp=(location.search.match(/[?&]q=(low|med|high)/)||[])[1];if(qp){qAuto=false;qI=['low','med','high'].indexOf(qp);}
  if(!gl){$('err').style.display='grid';return;}
  try{glInit();}catch(err){console.error(err);$('err').textContent='This game could not start its 3D renderer on this browser.';$('err').style.display='grid';return;}
  RESCB.push(glTargets);resize();
  startDemo();
  ARC.post('ready',{title:ARC.title,w:W,h:H,tickets:true});
  requestAnimationFrame(frame);
}
boot();
/*@@TEST@@*/
