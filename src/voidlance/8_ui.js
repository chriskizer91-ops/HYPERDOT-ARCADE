/* ===================== simulation step (60 Hz) ===================== */
{const lim={boom:.05,elaser:.03,shieldHit:.06,hullHit:.08,flyby:.4,missile:.08,lockTone:.1,laser:.03,impact:.12,bigboom:.15,capboom:.5,radio:.2,warn:.12};
  const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
function msg(t,sub,dur,col){G.msg={t,sub,col:col||GR.steel};G.msgT=dur||2;}
function step(dt,c){
  G.t+=dt;let sdt=dt;if(G.slowT>0){G.slowT-=dt;sdt=dt*G.slow;if(G.slowT<=0)G.slow=1;}
  if(PL&&!PL.dead&&c)updPlayer(sdt,G.auto?autoCtl():c);
  for(const e of ENT){if(e.dead)continue;if(e.flash>0)e.flash-=sdt;if(e.hitT>0)e.hitT-=sdt;if(e.shHit>0)e.shHit-=sdt;
    if(e.kind==='ship'){if(!e.isPlayer)aiShip(e,sdt);if(FRAME%3===0){e.trail.push(e.pos.slice());if(e.trail.length>16)e.trail.shift();}}
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
function saveRun(){store.set('vl-save',JSON.stringify({mi:G.mi,up:G.up,score:G.score}));}
function loadRun(){try{return JSON.parse(store.get('vl-save','null'));}catch(e){return null;}}
function newCampaign(){G.up={};G.score=0;G.demo=false;G.demoCam=false;vlBegin();brief(0);}
function brief(i){G.mi=i;saveRun();G.scoreStart=G.score;startMission(i);G.demo=false;G.demoCam=false;G.mode='brief';G.t=0;G.msgT=0;setTrack('brief');CAM.cine.subj=null;G.briefA=0;}
function launch(){G.mode='play';G.t=0;setTrack(MISSIONS[G.mi].music);msg('MISSION '+(G.mi+1),MISSIONS[G.mi].name,3,GR.cyan);SFX.confirm();say('Launch','SYS');}
function endMission(win){
  const M=G.M,st=G.stats;
  if(win){const acc=st.shots?Math.round(st.hits/st.shots*100):0,hullB=PL&&!PL.dead?Math.round(PL.hp/PL.max*100)*40:0,accB=acc*120,tB=Math.max(0,Math.round((420-M.t)*20));
    G.deb={win:true,kills:st.kills,acc,time:M.t,rows:[['MISSION BONUS',M.bonus||0],['ACCURACY '+acc+'%',accB],['HULL INTACT',hullB],['SPEED',tB]]};
    for(const r of G.deb.rows)G.score+=r[1];
    if(G.score>G.hi){G.hi=G.score;store.set('vl-hi',G.hi);G.deb.hi=true;}
    G.mode='debrief';setTrack('win');ARC.wins++;}
  else{G.deb={win:false,why:M.why};G.mode='fail';setTrack('over');}
  G.t=0;G.menuI=0;
}
function afterDebrief(){if(G.mi>=MISSIONS.length-1){G.mode='victory';G.t=0;G.menuI=0;const cv=G.M&&G.M.cv;if(cv&&!cv.dead){G.demoCam=true;Object.assign(CAM.cine,{subj:cv,kind:'orbit',t:0,dur:1e9,ang:0,h:.3});for(let i=0;i<3;i++)wing('sparrow','a',3,vadd(cv.pos,[rnd(-400,400),rnd(60,200),rnd(-600,600)]),vnorm([rnd(-1,1),0,1]),40);}store.set('vl-save','null');say('The Leviathan is destroyed. Halcyon is safe.','CMD');G.tix=vlTickets(true);ARC.over(G.score,G.tix);return;}G.upg=rollUpgrades();G.mode='upgrade';G.menuI=1;G.t=0;setTrack('shop');}
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
function titleItems(){const sv=loadRun(),it=[['START','start']];if(sv&&sv.mi>0)it.push(['CONTINUE: MISSION '+(sv.mi+1),'cont']);it.push(['HOW TO PLAY','how'],['VIEW: '+['COCKPIT','HUD ONLY','CHASE'][G.camMode],'cam'],['INVERT Y: '+(INVERT?'ON':'OFF'),'inv']);return it;}
function tick(dt){
  FRAME++;
  const c=readCtl(),e={};c.pz=K('Escape')||K('KeyP')||c.start;c.okT=c.ok||TS.F;c.ex=K('Escape')||padHeld(1);   /* ex: Esc or gamepad B, the arcade's back-out */
  for(const k of ['u','d','l','r','ok','okT','back','pz','ex']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const m=G.mode;
  if(m==='title'){step(dt,null);if(EMBED&&e.ex)ARC.exit();else{const it=titleItems(),a=menuNav(it.length,{...e,ok:e.ok||e.okT});
    if(a>=0){const k=it[a][1];if(k==='start'){SFX.confirm();newCampaign();}else if(k==='cont'){const sv=loadRun();SFX.confirm();G.up=sv.up||{};G.score=sv.score||0;G.demo=false;vlBegin();brief(sv.mi);}
      else if(k==='how'){G.mode='howto';G.howP=0;SFX.confirm();}else if(k==='cam'){G.camMode=(G.camMode+1)%3;store.set('vl-cam',G.camMode);SFX.select();}else if(k==='inv'){INVERT=!INVERT;store.set('vl-inv',INVERT?'1':'0');SFX.select();}}}}
  else if(m==='howto'){step(dt,null);const adv=e.ok||e.okT||e.r||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;
    if(e.back||(e.l&&G.howP===0)){G.mode='title';G.menuI=2;SFX.back();}else if(e.l){G.howP--;SFX.select();}else if(adv){G.howP++;SFX.select();if(G.howP>1){G.mode='title';G.menuI=0;}}}
  else if(m==='brief'){G.t+=dt;G.briefA+=dt;updCamBrief(dt);const go=e.ok||e.okT||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;if(G.t>.7&&go)launch();if(e.back){arcQuit();startDemo();}}
  else if(m==='play'){
    if(G.paused){const a=menuNav(3,e);if(e.back||e.pz||a===0)setPause(false);else if(a===1){setPause(false);G.score=G.scoreStart;brief(G.mi);}else if(a===2){setPause(false);arcQuit();startDemo();}}
    else if(e.pz)setPause(true);
    else{if(c.cock){G.camMode=(G.camMode+1)%3;store.set('vl-cam',G.camMode);SFX.select();}step(dt,c);}}
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

/* ===================== HUD ===================== */
const HC={dim:'#77809a',ink:'#e8ecf8',amber:'#ffb040',red:'#ff4a4a',green:'#6aff5a',cyan:'#5ad8ff',yel:'#ffd040',bg:'#242838'};
function panel(x,y,w,h,a){g.fillStyle=`rgba(4,6,12,${a??.62})`;g.fillRect(x,y,w,h);}
function bar(x,y,w,h,f,col){g.fillStyle=HC.bg;g.fillRect(x,y,w,h);g.fillStyle=col;g.fillRect(x,y,Math.round(w*clamp(f,0,1)),h);g.fillStyle='rgba(0,0,0,.55)';for(let i=x+3;i<x+w;i+=4)g.fillRect(i,y,1,h);}
function ring(cx,cy,r,col,step,gap){g.fillStyle=col;const n=Math.max(12,Math.round(r*6));for(let i=0;i<n;i++){if(gap&&(i%step)<gap)continue;const a=i/n*TAU;g.fillRect(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r),1,1);}}
function corners(x,y,r,col,len){g.fillStyle=col;x=Math.round(x);y=Math.round(y);r=Math.round(r);const L=len||Math.max(2,Math.round(r*.45));
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const px=x+sx*r,py=y+sy*r;g.fillRect(sx<0?px:px-L+1,py,L,1);g.fillRect(px,sy<0?py:py-L+1,1,L);}}
function arrowTri(x,y,dx,dy,sz,col){const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;g.fillStyle=col;g.beginPath();g.moveTo(x+dx*sz,y+dy*sz);g.lineTo(x-dx*sz*.6-dy*sz*.75,y-dy*sz*.6+dx*sz*.75);g.lineTo(x-dx*sz*.6+dy*sz*.75,y-dy*sz*.6-dx*sz*.75);g.closePath();g.fill();}
function wrap(s,n){const w=s.split(' '),out=[];let l='';for(const x of w){if((l+' '+x).trim().length>n){out.push(l.trim());l=x;}else l+=' '+x;}if(l.trim())out.push(l.trim());return out;}
const RCOL={CMD:'#c8d0e0',JUNO:'#5ad8ff',RIX:'#ffb040',VIPER:'#ff4a4a',SYS:'#ffffff'};
function portrait(x,y,who){const c=hexRGB(RCOL[who]||'#ffffff');g.fillStyle='#0a0e16';g.fillRect(x,y,14,14);
  g.fillStyle=rgba(c.map(v=>v*.45));g.beginPath();g.arc(x+7,y+8,6,0,TAU);g.fill();g.fillStyle=rgba(c);g.fillRect(x+3,y+6,8,2);
  if(who==='VIPER'){g.fillStyle='#ff2020';g.fillRect(x+4,y+6,2,2);g.fillRect(x+8,y+6,2,2);}if(who==='CMD'){g.fillStyle='#808898';g.fillRect(x+2,y+2,10,2);}
  if(G.rad&&(FRAME>>2)&1){g.fillStyle=rgba(c.map(v=>v*.8));g.fillRect(x+5,y+11,4,1);}}
function radarDraw(x,y,w,h){
  const P=PL,cx=x+w/2,cy=y+h/2,R=3200;g.fillStyle='rgba(60,255,140,.25)';
  for(let i=0;i<48;i++){const a=i/48*TAU;g.fillRect(Math.round(cx+Math.cos(a)*(w/2-1)),Math.round(cy+Math.sin(a)*(h/2-1)),1,1);if(i%2===0)g.fillRect(Math.round(cx+Math.cos(a)*(w/4)),Math.round(cy+Math.sin(a)*(h/4)),1,1);}
  g.fillRect(Math.round(cx),y+1,1,h-2);g.fillRect(x+1,Math.round(cy),w-2,1);
  for(const e of ENT){if(e.dead||e===P||e.kind==='sub'&&!e.objective||e.kind==='rock'&&e.s<50)continue;let l=toLocal(P,e.pos);const d=vlen(l);if(d>R){if(e.kind!=='cap'&&!e.objective)continue;l=vmul(l,R/d);}
    const bx=cx+l[0]/R*(w/2-2),by=cy-l[2]/R*(h/2-2),st=-l[1]/R*h*.55;
    const col=e.kind==='rock'?'#6a6058':e.objective?HC.yel:e.kind==='torp'?((FRAME>>2)&1?'#ffffff':HC.red):e.team==='e'?HC.red:HC.cyan;
    g.fillStyle='rgba(60,255,140,.35)';const s0=Math.min(by,by+st),s1=Math.max(by,by+st);for(let yy=Math.round(s0);yy<Math.round(s1);yy++)g.fillRect(Math.round(bx),yy,1,1);
    g.fillStyle=col;const sz=e.kind==='cap'?3:e===PLS.tgt?2:1;g.fillRect(Math.round(bx)-(sz>>1),Math.round(by+st)-(sz>>1),sz,sz);
    if(e===PLS.tgt&&(FRAME>>3)&1){g.fillRect(Math.round(bx)-2,Math.round(by+st)-2,5,1);}}
  for(const m of MISS)if(m.kind==='mis'&&m.tgt===P){const l=toLocal(P,m.p);if(vlen(l)<R){g.fillStyle=(FRAME>>1)&1?'#ffffff':HC.red;g.fillRect(Math.round(cx+l[0]/R*(w/2-2)),Math.round(cy-l[2]/R*(h/2-2)-l[1]/R*h*.55),1,1);}}
  g.fillStyle=HC.amber;g.fillRect(Math.round(cx)-1,Math.round(cy),3,1);g.fillRect(Math.round(cx),Math.round(cy)-1,1,1);
}
function nameOf(e){return e.name||(e.d&&e.d.name)||e.kind.toUpperCase();}
function hud(quiet){
  const P=PL,V=VIEW,blink=(FRAME>>3)&1,cock=G.camMode===0;if(!P)return;
  const viewBot=cock?(DASH.hy||H*.73)-2:H;
  if(!P.dead){
    /* nose reticle */
    let rx=V.cx,ry=V.cy;if(G.camMode===2){const s=proj(vadd(P.pos,vmul(qF(P.q),900)));if(s){rx=s[0];ry=s[1];}}
    rx=Math.round(rx);ry=Math.round(ry);const rc=PLS.energy<8?HC.red:HC.amber;g.fillStyle=rc;
    g.fillRect(rx-7,ry,4,1);g.fillRect(rx+4,ry,4,1);g.fillRect(rx,ry-6,1,3);g.fillRect(rx,ry+4,1,3);g.fillRect(rx,ry,1,1);
    if(G.hitMark>0){g.fillStyle='#ffffff';for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.fillRect(rx+a*3,ry+b*3,1,1);g.fillRect(rx+a*4,ry+b*4,1,1);}}
    if(G.hurt>0){const a=G.hurtDir-HP;g.fillStyle=`rgba(255,60,50,${Math.min(1,G.hurt*2)})`;for(let k=-6;k<=6;k++){const t=a+k*.06;g.fillRect(Math.round(rx+Math.cos(t)*26),Math.round(ry+Math.sin(t)*26),2,2);}}
    /* mouse virtual-stick cursor */
    if(PLS.ctl&&PLS.ctl.mouse){const mx=Math.round(MOUSE.x),my=Math.round(MOUSE.y);g.fillStyle='rgba(255,255,255,.75)';g.fillRect(mx-2,my,5,1);g.fillRect(mx,my-2,1,5);
      g.fillStyle='rgba(255,255,255,.18)';const n=Math.round(Math.hypot(mx-rx,my-ry)/4);for(let k=1;k<n;k++)g.fillRect(Math.round(rx+(mx-rx)*k/n),Math.round(ry+(my-ry)*k/n),1,1);}
    /* entity markers */
    for(const e of ENT){if(e.dead||e===P||e.dying)continue;const ok=e.kind==='ship'||e.kind==='torp'||e.kind==='beacon'||(e.kind==='sub'&&(e.objective||e.sub==='turret'&&!e.noTarget))||e.kind==='cap';if(!ok||e===PLS.tgt)continue;
      const s=proj(e.pos);if(!s||s[0]<2||s[1]<2||s[0]>W-2||s[1]>viewBot)continue;const rp=Math.max(3,Math.min(18,e.r*(e.s&&e.kind==='sub'?e.s:1)*s[2]*V.F));
      if(e.kind==='cap'){if(rp>=18)continue;txt3(g,nameOf(e),Math.round(s[0]),Math.round(s[1])-8,e.team==='e'?'#ff8a8a':'#9ae6ff',1,'c');continue;}
      if(e.objective&&!(e.shielded&&e.shielded())){g.fillStyle=blink?HC.yel:'#a08020';const x=Math.round(s[0]),y=Math.round(s[1]),r=Math.round(rp)+2;for(let k=-r;k<=r;k++){g.fillRect(x+k,y-(r-Math.abs(k)),1,1);g.fillRect(x+k,y+(r-Math.abs(k)),1,1);}}
      else if(e.kind==='torp'){if((FRAME>>2)&1)corners(s[0],s[1],4,HC.red,2);txt3(g,'TORP',Math.round(s[0]),Math.round(s[1])+6,HC.red,1,'c');}
      else if(e.team==='e')corners(s[0],s[1],rp,e.kind==='sub'?'#a04040':'#ff5a5a',2);
      else if(e.kind==='ship'){g.fillStyle=HC.cyan;g.fillRect(Math.round(s[0])-1,Math.round(s[1])-rp,3,1);if(e.call&&rp>4)txt3(g,e.call,Math.round(s[0]),Math.round(s[1])-rp-7,'#7ad8ff',1,'c');}}
    /* current target */
    const T=PLS.tgt;
    if(T&&!T.dead){const s=proj(T.pos),tc=T.objective?HC.yel:T.team==='e'?HC.red:HC.cyan;
      if(s&&s[0]>0&&s[0]<W&&s[1]>0&&s[1]<viewBot){const rp=Math.max(6,Math.min(40,T.r*(T.kind==='sub'?T.s||1:1)*s[2]*V.F+3));corners(s[0],s[1],rp,tc);
        const dist=vdist(P.pos,T.pos);txt3(g,nameOf(T),Math.round(s[0]),Math.round(s[1]-rp-8),tc,1,'c');txt3(g,(dist<1000?Math.round(dist)+'M':(dist/1000).toFixed(1)+'KM'),Math.round(s[0]),Math.round(s[1]+rp+3),tc,1,'c');
        const hf=(T.hp+(T.sh||0))/(T.max+(T.shMax||0));g.fillStyle=HC.bg;g.fillRect(Math.round(s[0]-rp),Math.round(s[1]+rp+10),Math.round(rp*2),2);g.fillStyle=tc;g.fillRect(Math.round(s[0]-rp),Math.round(s[1]+rp+10),Math.round(rp*2*hf),2);
        if(T.shielded&&T.shielded()&&blink)txt3(g,'SHIELDED',Math.round(s[0]),Math.round(s[1]+rp+14),HC.cyan,1,'c');
        if(PLS.lockT>0&&T.kind!=='cap'){const lt=.9/(1+.6*(G.up.lock||0)),k=PLS.locked?0:1-PLS.lockT/lt,r=Math.round(rp+4+k*18),a=G.t*(PLS.locked?0:5);g.fillStyle=PLS.locked?((FRAME>>1)&1?'#ffffff':HC.red):HC.amber;
          for(let i=0;i<4;i++){const t=a+i*HP;g.fillRect(Math.round(s[0]+Math.cos(t)*r)-1,Math.round(s[1]+Math.sin(t)*r)-1,3,3);}if(PLS.locked)txt3(g,'LOCK',Math.round(s[0]+rp+6),Math.round(s[1]-2),HC.red);}}
      else{const l=toLocal(G.camMode===2?{pos:CAM.pos,q:CAM.q}:P,T.pos),a=Math.atan2(-l[1],l[0]),r=34;arrowTri(rx+Math.cos(a)*r,ry+Math.sin(a)*r,Math.cos(a),Math.sin(a),4,tc);}
      if(PLS.lead&&T.kind!=='cap'){const s2=proj(PLS.lead);if(s2&&s2[1]<viewBot){const on=Math.hypot(s2[0]-rx,s2[1]-ry)<4;ring(s2[0],s2[1],on?3:2.5,on?'#ffffff':tc,1,0);}}}
    /* incoming missiles + fence */
    if(G.incoming&&(FRAME>>2)&1){otxt3(g,'MISSILE',W>>1,Math.round(viewBot-30),HC.red,1,'c');const l=toLocal(P,G.incoming.p),a=Math.atan2(-l[1],l[0]);arrowTri(rx+Math.cos(a)*44,ry+Math.sin(a)*44,Math.cos(a),Math.sin(a),5,HC.red);}
    if(G.fence&&blink)otxt3(g,'RETURN TO THE COMBAT ZONE',W>>1,Math.round(viewBot-40),HC.yel,1,'c');
    if(G.repair)otxt3(g,(FRAME>>4)&1?'REPAIRING':'HALCYON DECK CREW',W>>1,Math.round(viewBot-20),HC.green,1,'c');
  }
  for(const p of POPS){const s=proj(p.p);if(!s)continue;if(p.t>.8&&(FRAME&1))continue;otxt3(g,p.s,Math.round(s[0]),Math.round(s[1]-p.t*12-6),'#fff2b0',1,'c','#000');}
  /* objectives, score */
  const ob=G.M?G.M.obj():[];if(ob.length){let w=0;for(const l of ob)w=Math.max(w,tw3(l));panel(2,cock?8:2,w+8,ob.length*7+4);ob.forEach((l,i)=>txt3(g,l,6,(cock?8:2)+3+i*7,i===0?HC.yel:HC.ink));}
  {const y=cock?8:2;panel(W-74,y,72,G.mult>1?19:11);txt5(g,fmt(G.score),W-5,y+2,'#ffffff',1,'r');if(G.mult>1){txt3(g,'x'+G.mult,W-70,y+12,HC.amber);g.fillStyle=HC.amber;g.fillRect(W-60,y+14,Math.round(55*G.multT/4),1);}}
  /* radio */
  if(G.rad){const R=G.rad,bw=Math.round(Math.min(W*.5,200)),bx=Math.round(W/2-bw/2),by=cock?28:22,lines=wrap(R.text.toUpperCase(),Math.floor((bw-22)/4)),n=Math.floor(R.t*48);
    panel(bx,by,bw,Math.max(18,lines.length*7+10),.75);portrait(bx+2,by+2,R.who);txt3(g,R.who,bx+19,by+2,RCOL[R.who]||'#fff');let used=0;
    lines.forEach((l,i)=>{const k=Math.max(0,Math.min(l.length,n-used));used+=l.length+1;txt3(g,l.slice(0,k),bx+19,by+9+i*7,HC.ink);});}
  /* big message */
  if(!quiet&&G.msg&&G.msgT>0&&(G.msgT>.3||(FRAME>>1)&1)){const sc=W>=380?3:2,y=Math.round(H*(G.rad?.34:.26));otxt5(g,G.msg.t,W>>1,y,G.msg.col,sc,'c',.12,'#000');if(G.msg.sub)otxt3(g,G.msg.sub,W>>1,y+7*sc+5,'#e6e8f0',1,'c');}
  /* instruments */
  if(cock&&!P.dead)dashReadouts();else if(!P.dead)compactReadouts();
  if(G.hurt>0){g.fillStyle=`rgba(255,40,30,${Math.min(.6,G.hurt)})`;g.fillRect(0,0,W,2);g.fillRect(0,H-2,W,2);g.fillRect(0,0,2,H);g.fillRect(W-2,0,2,H);}
  if(P.shHit>0&&cock){g.fillStyle=`rgba(90,210,255,${P.shHit*1.2})`;g.fillRect(0,(DASH.hy||H)-3,W,1);}
}
function statBars(x,y,w,rowH){
  const P=PL,lab=(t,yy,c)=>txt3(g,t,x,yy,c||HC.dim),bw=w-16;
  lab('SHD',y,P.shHit>0?'#ffffff':HC.dim);bar(x+15,y,bw,4,P.sh/P.shMax,'#4fd8ff');
  const hf=P.hp/P.max;lab('HUL',y+rowH,hf<.3&&(FRAME>>3)&1?HC.red:HC.dim);bar(x+15,y+rowH,bw,4,hf,hf>.5?HC.green:hf>.25?'#ffc21a':HC.red);
  lab('NRG',y+rowH*2);bar(x+15,y+rowH*2,bw,4,PLS.energy/maxEnergy(),HC.amber);
  lab('BST',y+rowH*3);bar(x+15,y+rowH*3,bw,4,PLS.boostE/100,PLS.boostHeld?'#ffffff':'#4a8aff');
}
function dashReadouts(){
  const P=PL;radarDraw(...DASH.radar);const [sx,sy,sw,sh]=DASH.stat;statBars(sx+2,sy+2,sw-4,Math.max(5,Math.floor((sh-4)/4)));
  const [lx,ly,lw,lh]=DASH.left;txt3(g,'SPD',lx+3,ly+2,HC.dim);txt3(g,String(Math.round(P.spd)),lx+lw-3,ly+2,HC.ink,1,'r');bar(lx+3,ly+9,lw-6,3,P.thr,'#7a9aff');
  const [qx,qy,qw,qh]=DASH.right;txt3(g,'MSL',qx+3,qy+2,HC.dim);txt3(g,String(P.missiles),qx+qw-3,qy+2,P.missiles?HC.ink:HC.red,1,'r');
  txt3(g,PLS.locked?'LOCKED':PLS.lockT>0?'LOCKING':'NO LOCK',qx+3,qy+9,PLS.locked?HC.red:PLS.lockT>0?HC.amber:'#4a5068');
  const T=PLS.tgt,[tx,ty,tw,th]=DASH.tgt;if(T&&!T.dead){txt3(g,nameOf(T),tx+2,ty+2,T.team==='e'?'#9aff8a':'#9ae6ff');const hf=(T.hp+(T.sh||0))/(T.max+(T.shMax||0));bar(tx+2,ty+th-5,tw-4,3,hf,T.team==='e'?'#6aff5a':'#5ad8ff');}
  else txt3(g,'NO TARGET',tx+tw/2,ty+th/2-2,'#2a5a3a',1,'c');
}
function compactReadouts(){
  const P=PL,y=H-26;panel(2,y-2,74,26);statBars(5,y,66,6);
  const rw=Math.round(W*.16),rh=Math.round(rw*.45),rx=W-rw-4,ry=H-rh-4;panel(rx-2,ry-2,rw+4,rh+4);radarDraw(rx,ry,rw,rh);
  panel(rx-46,H-22,42,20);txt3(g,'MSL '+P.missiles,rx-43,H-19,P.missiles?HC.ink:HC.red);txt3(g,'SPD '+Math.round(P.spd),rx-43,H-12,HC.ink);
  if(PLS.locked&&(FRAME>>2)&1)txt3(g,'LOCK',rx+rw/2,ry-8,HC.red,1,'c');
}
/* ===================== screens ===================== */
function dim(a){g.fillStyle=`rgba(2,3,8,${a})`;g.fillRect(0,0,W,H);}
function menu(items,y,sp){sp=sp||12;const cx=W>>1;
  for(let i=0;i<items.length;i++){const s=items[i],on=i===G.menuI,yy=Math.round(y+i*sp),w=tw5(s,1);
    if(on){g.fillStyle='rgba(79,227,255,.14)';g.fillRect(cx-w/2-13,yy-2,w+26,11);txt5(g,s,cx,yy,GR.cyan,1,'c');const k=(FRAME>>3)&1;txt5(g,'>',cx-w/2-10+k,yy,HC.cyan);txt5(g,'<',cx+w/2+5-k,yy,HC.cyan);}
    else txt5(g,s,cx,yy,'#8890a8',1,'c');
    HOT.push({x:cx-w/2-13,y:yy-3,w:w+26,h:sp,i});}}
function cursor(){if(!MOUSE.on||touchy||performance.now()-MOUSE.last>3000)return;const x=Math.round(MOUSE.x),y=Math.round(MOUSE.y);g.fillStyle='#000';g.fillRect(x-1,y-1,3,7);g.fillRect(x-1,y-1,6,3);g.fillStyle='#ffffff';g.fillRect(x,y,1,5);g.fillRect(x,y,4,1);g.fillRect(x+1,y+1,1,1);}
function logo(cx,y,sc){const s='VOIDLANCE',w=tw5(s,sc);otxt5(g,s,cx,y,GR.cyan,sc,'c',.18,'#02101a');
  const sw=((G.t*.4)%1.5)*(w+60)-30+cx-w/2;g.save();g.beginPath();g.rect(sw,y-2,sc*3,7*sc+4);g.clip();txt5(g,s,cx,y,'#ffffff',sc,'c',.18);g.restore();}
function drawTitle(){
  g.fillStyle='rgba(2,3,8,.45)';g.fillRect(0,0,W,Math.round(H*.42));const sc=W>=380?4:3,cx=W>>1,y=Math.round(H*.1);
  logo(cx,y,sc);txt3(g,'LED MATRIX STARFIGHTER',cx,y+7*sc+6,'#9aa8c8',1,'c');txt3(g,'SIX MISSIONS. ONE LANCE. ONE LEVIATHAN.',cx,y+7*sc+14,HC.dim,1,'c');
  const it=titleItems();panel(W/2-74,Math.round(H*.5)-6,148,it.length*12+8,.55);menu(it.map(x=>x[0]),Math.round(H*.5));
  panel(0,H-12,W,12,.5);txt3(g,'HI SCORE '+fmt(G.hi),cx,H-9,HC.dim,1,'c');
}
function holo(m,x,y,w,h,ang,col,s,pitch){
  const keep={pos:VIEW.pos,q:VIEW.q,cx:VIEW.cx,cy:VIEW.cy,F:VIEW.F};for(let j=y;j<y+h;j++)ZB.fill(0,j*W+x,j*W+x+w);
  const R=m.R*(s||1),cq=qlook([Math.sin(ang),pitch??-.3,Math.cos(ang)],[0,1,0]),pos=[0,0,0],cp=vsub(pos,vmul(qF(cq),R*2.4));
  setView(cp,cq,x+w/2,y+h/2,Math.min(w,h)*1.05,[x,y,x+w,y+h]);const sv=SUN.dir;SUN.dir=vnorm(vadd(qU(cq),vmul(qR(cq),-.7)));drawMesh(m,pos,qid(),{s});SUN.dir=sv;
  for(let j=y;j<y+h;j++){const sc=(j+FRAME)%3===0?.55:1;for(let i=x;i<x+w;i++){const k=j*W+i;if(ZB[k]>0){const c=RBUF[k],l=(((c&255)*.3+((c>>>8)&255)*.55+((c>>>16)&255)*.15)/255)*sc*1.35+.1;RBUF[k]=pack(col[0]*l,col[1]*l,col[2]*l);}else RBUF[k]=(i+j)%6===0?pack(col[0]*.06,col[1]*.06,col[2]*.06):pack(3,5,8);}}
  setView(keep.pos,keep.q,keep.cx,keep.cy,keep.F);
}
function drawBrief(){
  dim(.62);const def=MISSIONS[G.mi],cx=W>>1,hx=Math.round(W*.04),hw=Math.round(W*.36),hy=Math.round(H*.2),hh=Math.round(H*.6);
  g.fillStyle='rgba(20,60,50,.25)';g.fillRect(hx,hy,hw,hh);
  const hm=MESH[def.holo];holo(hm,hx,hy,hw,hh,G.t*.5,def.holo==='levi'||def.holo==='frigate'?[255,120,100]:def.holo==='beacon'?[255,200,110]:[120,255,140],1,-.35);
  acx.putImageData(AIMG,0,0);g.save();g.beginPath();g.rect(hx,hy,hw,hh);g.clip();g.drawImage(ac,0,0);g.restore();
  g.fillStyle='rgba(120,255,160,.5)';corners(hx+hw/2,hy+hh/2,Math.min(hw,hh)/2-2,'rgba(120,255,160,.6)',6);
  const tx=Math.round(W*.44);txt3(g,'MISSION '+(G.mi+1)+' OF 6   '+def.sub,tx,hy,HC.cyan);otxt5(g,def.name,tx,hy+8,GR.cyan,W>=380?2:1,'l',.1,'#000');
  let y=hy+(W>=380?26:18);for(const l of def.brief){for(const w of wrap(l,Math.floor((W-tx-6)/4))){txt3(g,w,tx,y,'#c8d0e0');y+=7;}y+=3;}
  y+=4;const up=Object.keys(G.up);if(up.length){txt3(g,'FITTED: '+up.map(k=>UPG.find(u=>u.id===k).name+(G.up[k]>1?' x'+G.up[k]:'')).join(', '),tx,y,HC.dim);}
  if(G.t>.7&&(FRAME>>4)&1)otxt5(g,touchy?'TAP TO LAUNCH':'PRESS FIRE TO LAUNCH',cx,H-14,HC.amber,1,'c',0,'#000');
  txt3(g,'SCORE '+fmt(G.score),W-5,4,HC.dim,1,'r');
}
function drawDebrief(){
  dim(Math.min(.7,G.t*.8));const D=G.deb,cx=W>>1,sc=W>=380?3:2,y0=Math.round(H*.12);
  otxt5(g,'MISSION COMPLETE',cx,y0,GR.green,sc,'c',.12,'#000');
  let y=y0+7*sc+10;txt3(g,'KILLS '+D.kills+'   ACCURACY '+D.acc+'%   TIME '+mmss(D.time),cx,y,HC.ink,1,'c');y+=12;
  D.rows.forEach((r,i)=>{if(G.t<.4+i*.25)return;txt3(g,r[0],cx-70,y,HC.dim);txt3(g,'+'+fmt(r[1]),cx+70,y,'#fff2b0',1,'r');y+=8;});
  y+=4;if(G.t>1.4){txt5(g,'SCORE '+fmt(G.score),cx,y,'#ffffff',1,'c');if(D.hi&&(FRAME>>3)&1)txt3(g,'NEW HIGH SCORE',cx,y+10,HC.yel,1,'c');}
  if(G.t>1.2&&(FRAME>>4)&1)txt3(g,touchy?'TAP TO CONTINUE':'PRESS FIRE TO CONTINUE',cx,H-12,HC.amber,1,'c');
}
function drawFail(){dim(Math.min(.66,G.t*.6));const cx=W>>1,sc=W>=380?3:2;otxt5(g,'MISSION FAILED',cx,Math.round(H*.2),GR.red,sc,'c',.12,'#000');txt3(g,G.deb.why||'',cx,Math.round(H*.2)+7*sc+8,HC.ink,1,'c');
  if(G.t>1)menu(['RETRY MISSION','QUIT TO TITLE'],Math.round(H*.56));}
function drawVictory(){dim(Math.min(.6,G.t*.4));const cx=W>>1,sc=W>=380?3:2;otxt5(g,'VICTORY',cx,Math.round(H*.16),GR.volt,sc+1,'c',.12,'#000');
  txt3(g,'THE LEVIATHAN IS DESTROYED. HALCYON IS SAFE.',cx,Math.round(H*.16)+7*(sc+1)+8,'#c8d0e0',1,'c');txt5(g,'FINAL SCORE '+fmt(G.score),cx,Math.round(H*.5),'#ffffff',1,'c');
  if(G.score>0&&G.score>=G.hi&&(FRAME>>3)&1)txt3(g,'NEW HIGH SCORE',cx,Math.round(H*.5)+11,HC.yel,1,'c');if(EMBED)txt3(g,'+'+G.tix+' TICKETS',cx,Math.round(H*.5)+22,HC.amber,1,'c');if(G.t>2.5&&(FRAME>>4)&1)txt3(g,touchy?'TAP TO RETURN':'PRESS FIRE TO RETURN',cx,H-12,HC.amber,1,'c');}
function drawUpgrade(){
  dim(.62);const cx=W>>1,n=G.upg.length;txt5(g,'REFIT',cx,8,GR.cyan,1,'c');txt3(g,'THE DECK CREW HAS TIME FOR ONE UPGRADE',cx,19,'#9aa8c8',1,'c');
  const cw=Math.round(W*.29),chh=Math.round(H*.54),gap=Math.round(W*.025),tot=n*cw+(n-1)*gap,x0=Math.round(cx-tot/2),y0=Math.round(H*.2)+6,isc=H>=200?3:2;
  for(let i=0;i<n;i++){const u=G.upg[i],on=i===G.menuI,x=x0+i*(cw+gap),y=y0-(on?2:0),cc=CATC[u.cat];
    g.fillStyle=on?'rgba(10,30,40,.95)':'rgba(8,10,18,.92)';g.fillRect(x,y,cw,chh);g.fillStyle=on?cc[0]:'#323a4a';g.fillRect(x,y,cw,1);g.fillRect(x,y+chh-1,cw,1);g.fillRect(x,y,1,chh);g.fillRect(x+cw-1,y,1,chh);
    txt3(g,cc[2],x+cw/2,y+5,on?cc[0]:HC.dim,1,'c');const ic=ICONS[u.id],iw=7*isc,ix=Math.round(x+cw/2-iw/2),iy=y+13;g.fillStyle=on?cc[1]:cc[0];
    for(let r=0;r<7;r++)for(let k=0;k<7;k++)if(ic[r][k]==='1')g.fillRect(ix+k*isc,iy+r*isc,isc-(isc>2?1:0),isc-(isc>2?1:0));
    const ny=iy+iw+6;txt3(g,u.name,x+cw/2,ny,on?'#ffffff':HC.ink,1,'c');txt3(g,u.d[0],x+cw/2,ny+9,'#b0b8cc',1,'c');txt3(g,u.d[1],x+cw/2,ny+16,'#b0b8cc',1,'c');
    const lv=G.up[u.id]||0,pw=6,tw2=u.max*pw+(u.max-1)*2,px0=Math.round(x+cw/2-tw2/2),py=y+chh-8;for(let k=0;k<u.max;k++){g.fillStyle=k<lv?cc[0]:k===lv?((FRAME>>3)&1?cc[1]:'#3a4a5a'):HC.bg;g.fillRect(px0+k*(pw+2),py,pw,3);}
    if(!touchy)txt3(g,String(i+1),x+4,y+5,HC.dim);HOT.push({x,y,w:cw,h:chh,i});}
  txt3(g,touchy?'TAP A CARD':'CLICK, OR ARROWS + ENTER, OR 1 2 3',cx,H-9,HC.dim,1,'c');
}
const HOWSHIPS=[['lance','LANCE','YOU. FAST, TWIN CANNONS',[255,180,90]],['sparrow','SPARROW','JUNO AND RIX',[110,220,255]],['dart','DART','RAIDER LINE FIGHTER',[140,255,110]],['wasp','WASP','FAST AND FRAGILE',[140,255,110]],
  ['hammer','HAMMER','BOMBER. SHOOT ITS TORPEDOES',[140,255,110]],['viper','VIPER','THE RED KNIVES LEADER',[255,110,90]]];
function drawHow(){
  dim(.8);const cx=W>>1,dsk=!touchy;
  if(G.howP===0){txt5(g,'HOW TO FLY',cx,6,GR.cyan,1,'c');
    const rows=[['STEER',dsk?'MOUSE (A VIRTUAL STICK) OR ARROWS':'LEFT STICK'],['FIRE',dsk?'CLICK OR SPACE':'FIRE BUTTON'],['MISSILE',dsk?'RIGHT CLICK OR F':'MISSILE BUTTON'],['THROTTLE',dsk?'W / S':'AUTOMATIC'],['ROLL',dsk?'A / D':'AUTOMATIC'],['BOOST',dsk?'SHIFT':'BOOST BUTTON'],['TARGET',dsk?'T OR TAB, NEAREST TO THE NOSE':'AUTOMATIC'],['VIEW',dsk?'C: COCKPIT, HUD ONLY, CHASE':'IN THE TITLE MENU']];
    const x0=Math.round(W*.06),x1=Math.round(W*.27);let y=19;for(const [a,b] of rows){txt3(g,a,x0,y,HC.amber);txt3(g,b,x1,y,HC.ink);y+=8;}
    y+=5;for(const t of ['PUT YOUR NOSE ON THE LEAD CIRCLE AHEAD OF A TARGET, THEN FIRE.','HOLD A TARGET NEAR THE NOSE TO LOCK MISSILES.','SHIELDS RECHARGE WHEN YOU STOP TAKING HITS.','GAMEPADS WORK TOO. ESC PAUSES.']){g.fillStyle=HC.cyan;g.fillRect(x0,y+2,2,1);txt3(g,t,x0+5,y,'#c0c8dc');y+=8;}}
  else{txt5(g,'SHIPS',cx,6,GR.cyan,1,'c');const cw=W/3,chh=(H-34)/2;
    HOWSHIPS.forEach((s,i)=>{const x=Math.round((i%3)*cw)+4,y=Math.round(17+((i/3)|0)*chh),w=Math.round(cw)-8,h=Math.round(chh)-16;holo(MESH[s[0]],x,y,w,h,G.t*.6+i,s[3],1,-.32);});
    acx.putImageData(AIMG,0,0);g.save();g.beginPath();HOWSHIPS.forEach((s,i)=>{g.rect(Math.round((i%3)*cw)+4,Math.round(17+((i/3)|0)*chh),Math.round(cw)-8,Math.round(chh)-16);});g.clip();g.drawImage(ac,0,0);g.restore();
    HOWSHIPS.forEach((s,i)=>{const x=Math.round((i%3)*cw+cw/2),y=Math.round(17+((i/3)|0)*chh+chh-15);txt3(g,s[1],x,y,rgba(s[3]),1,'c');txt3(g,s[2],x,y+7,'#a8b0c4',1,'c');});}
  if((FRAME>>4)&1)txt3(g,G.howP===0?'NEXT >':'DONE >',W-6,H-9,HC.amber,1,'r');txt3(g,(G.howP+1)+'/2',6,H-9,HC.dim);
}
function drawPause(){dim(.6);otxt5(g,'PAUSED',W>>1,Math.round(H*.24),GR.steel,2,'c',0,'#000');menu(['RESUME','RESTART MISSION','QUIT TO TITLE'],Math.round(H*.48));}
function draw(){
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;HOT.length=0;const m=G.mode;
  if(m==='brief')updCamBrief(0);
  renderWorld();
  if(m==='play'){hud(G.paused);if(G.paused)drawPause();}
  else if(m==='title')drawTitle();
  else if(m==='howto')drawHow();
  else if(m==='brief')drawBrief();
  else if(m==='debrief'){drawDebrief();}
  else if(m==='upgrade')drawUpgrade();
  else if(m==='fail')drawFail();
  else if(m==='victory')drawVictory();
  if(m!=='play'||G.paused)cursor();
}
/* ===================== chrome, loop, boot ===================== */
function toggleSound(){AU.muted=!AU.muted;store.set('vl-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%RES.length);e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();if(G.mode==='play')setPause(!G.paused);else if(G.mode==='howto'){G.mode='title';G.menuI=0;}e.currentTarget.blur();});
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;e.preventDefault();audioInit();TAP={x:(e.clientX-RECT.x)/RECT.w*W,y:(e.clientY-RECT.y)/RECT.h*H};});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('resize',resize);
/* ===================== arcade bridge: tickets and commands ===================== */
function vlBegin(){ARC.begin();ARC.base=G.score;ARC.wins=0;}   /* a new or continued campaign is one credit */
/* tickets: 3 per mission won, 1 per 6,000 points earned this credit, 20 for the victory; a credit that ends on
   its own (victory, or quitting after a failed mission) pays at least 3; max 150. Two or three missions pay
   about 19-26, the whole campaign about 95-100. */
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
let ACC=0,LAST=0;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;if(n>0)endInputFrame();
  draw();musicTick(G.paused);present();
  requestAnimationFrame(frame);
}
if(!gl){$('err').style.display='grid';}
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();
startDemo();
ARC.post('ready',{title:ARC.title,w:W,h:H,tickets:true});
window.__vl={ARC,AU,vlTickets,endMission,afterDebrief,setPause,damage,G,get PL(){return PL},PLS,ENT,BOLTS,MISS,FX,KEY,MOUSE,TS,LATCH,CAM,MISSIONS,startDemo,newCampaign,brief,launch,startMission,tick,draw,present,setRes,mkShip,
  ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},time(k){const t0=performance.now();for(let i=0;i<k;i++)tick(1/60);const t1=performance.now();draw();const t2=performance.now();present();const t3=performance.now();return JSON.stringify(PROF,(k,v)=>typeof v==='number'?+v.toFixed(1):v)+' tick '+((t1-t0)/k).toFixed(2)+' draw '+(t2-t1).toFixed(2)+' present '+(t3-t2).toFixed(2)+' tris '+TRIS+' ent '+ENT.length+' fx '+FX.length;}};
requestAnimationFrame(frame);
