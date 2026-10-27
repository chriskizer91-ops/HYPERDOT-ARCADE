/* ===================== simulation step (60 Hz) ===================== */
{const lim={boom:.05,step:.07,clank:.05,ping:.06,crunch:.06,zap:.035,impact:.08,pickup:.05,hurt:.09,heavy:.06,shell:.08,whistle:.12,pod:.1,charge:.15,laser:.2,missile:.08,dash:.1};
  const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
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
  for(const u of EN){if(u.dead||!u.d.fly)continue;const sx=PX(u.x),sy=PY(u.y,u.z);if(Math.hypot(sx-c.px,sy-c.py)<S*1.1){c.px=sx;c.py=PY(u.y,1.8);return;}}
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
  PLY=mkPlayer();Object.assign(G,{score:0,kills:0,wave:0,boss:null,endless:false,arena:'',slow:1,slowT:0,msg:null,msgT:0,shake:0,hurtT:0,paused:false,phase:'idle',newHi:false,t:0});
  CTL.prev={missile:true,dash:true,howl:true};
}
function startGame(){G.demo=false;G.demoGod=false;resetRun();G.mode='play';G.menuI=0;startWave(1);snapCam();SFX.confirm();ARC.begin();}
function startDemo(){G.demo=true;G.demoGod=true;resetRun();G.mode='title';G.menuI=0;startWave(pick([2,3,4,8,9,10]));snapCam();setTrack('title');}
function saveHi(){G.newHi=G.score>G.hi;if(G.newHi){G.hi=G.score;store.set('ih-hi',G.hi);}}
function gameOver(){G.mode='over';G.t=0;G.menuI=0;saveHi();setTrack('over');SFX.lose();say('Mech destroyed');G.tix=ihTickets(true);ARC.over(G.score,G.tix);}
function setPause(on){G.paused=on;G.menuI=0;$('pauseBtn').textContent=on?'Resume':'Pause';if(on)SFX.back();}

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
  FRAME++;if(FRAME%3===0)for(let i=0;i<512;i++)HOLOX[i]=Math.random()<.07?((Math.random()*5)|0)-2:0;
  const c=readCtl(),e={};
  c.pz=K('Escape')||K('KeyP')||c.start;c.ok=c.ok||TS.M;c.ex=K('Escape')||padHeld(1);   /* ex: Esc or gamepad B, the arcade's back-out */
  for(const k of ['u','d','l','r','ok','back','pz','ex']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const m=G.mode;
  if(m==='title'){step(dt,c);if(EMBED&&e.ex)ARC.exit();else{const a=menuNav(2,e);if(a===0)startGame();else if(a===1){G.mode='howto';G.howP=0;SFX.confirm();}}}
  else if(m==='howto'){step(dt,c);
    const adv=e.ok||e.r||MOUSE.lp||TAP;MOUSE.lp=false;TAP=null;
    if(e.back||e.l&&G.howP===0){G.mode='title';G.menuI=1;SFX.back();}else if(e.l){G.howP--;SFX.select();}else if(adv){G.howP++;SFX.select();if(G.howP>1){G.mode='title';G.menuI=0;}}}
  else if(m==='play'){
    if(G.paused){const a=menuNav(3,e);if(e.back||e.pz||a===0)setPause(false);else if(a===1){setPause(false);arcQuit();startGame();}else if(a===2){setPause(false);arcQuit();startDemo();}}
    else if(e.pz)setPause(true);
    else step(dt,c);}
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

/* ===================== HUD ===================== */
const HC={dim:'#77708a',ink:'#ece6f4',amber:'#ffae2a',red:'#ff4a3a',green:'#6aff5a',steel:'#a2adc6',bg:'#2a2632'};
function panel(x,y,w,h,a){g.fillStyle=`rgba(5,4,9,${a??.62})`;g.fillRect(x,y,w,h);}
function segBar(x,y,w,h,f,col){g.fillStyle=HC.bg;g.fillRect(x,y,w,h);const n=Math.round(w*clamp(f,0,1));g.fillStyle=col;g.fillRect(x,y,n,h);g.fillStyle='rgba(0,0,0,.6)';for(let i=x+3;i<x+w;i+=4)g.fillRect(i,y,1,h);}
function hostiles(){let n=PODS.length;for(const u of EN)if(!u.dead)n++;for(const q of G.queue)n+=q.n;return n;}
function lockTargets(P){const n=4+2*(P.up.pods||0);return EN.filter(u=>!u.dead&&u.spawnT>=.35).map(u=>({u,s:Math.hypot(u.x-P.x,u.y-P.y)+Math.abs(angD(Math.atan2(u.y-P.y,u.x-P.x),P.turret))*6})).sort((a,b)=>a.s-b.s).slice(0,n).map(o=>o.u);}
function tri(x,y,dx,dy,sz,col){const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;g.fillStyle=col;g.beginPath();g.moveTo(x+dx*sz,y+dy*sz);g.lineTo(x-dx*sz*.6-dy*sz*.8,y-dy*sz*.6+dx*sz*.8);g.lineTo(x-dx*sz*.6+dy*sz*.8,y-dy*sz*.6-dx*sz*.8);g.closePath();g.fill();}
function hud(quiet){
  const P=PLY,cx=W>>1,blink=(FRAME>>3)&1;
  /* world-anchored: lock brackets, pops, reticle, off-screen arrows */
  if(!P.dead&&P.missT<=0){g.fillStyle=(FRAME>>2)&1?'#ffd040':'#ff8a2a';for(const u of lockTargets(P)){const sx=Math.round(PX(u.x)),sy=Math.round(PY(u.y,(u.z||0)+1)),r=Math.round(Math.max(5,u.r*S*.95));if(sx<0||sx>W||sy<0||sy>H)continue;
    for(const [ax,ay] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=sx+ax*r,y=sy+ay*r;g.fillRect(ax<0?x:x-2,y,3,1);g.fillRect(x,ay<0?y:y-2,1,3);}}}
  for(const p of POPS){const sx=PX(p.x),sy=PY(p.y,p.z+p.t*1.6);if(p.t>.7&&(FRAME&1))continue;otxt3(g,p.s,Math.round(sx),Math.round(sy),p.c||'#fff2b0',1,'c','#000');}
  let n=0;for(const u of EN){if(u.dead||n>14)continue;const sx=PX(u.x),sy=PY(u.y,(u.z||0)+1);if(sx>=0&&sx<W&&sy>=0&&sy<H)continue;n++;
    const dx=sx-W/2,dy=sy-H/2,t=Math.min((W/2-7)/Math.abs(dx||1e-3),(H/2-7)/Math.abs(dy||1e-3));tri(W/2+dx*t,H/2+dy*t,dx,dy,u.d.boss?5:3,u.d.boss?(blink?'#ffd040':'#ff4a3a'):'#ff4a3a');}
  if(!P.dead){let rx,ry;if(AIMMODE==='mouse'&&MOUSE.on&&!touchy){rx=MOUSE.x;ry=MOUSE.y;}else{rx=PX(P.x+Math.cos(P.turret)*7);ry=PY(P.y+Math.sin(P.turret)*7,1.8);}
    rx=Math.round(rx);ry=Math.round(ry);g.fillStyle=P.over>0?HC.red:'#ffd040';g.fillRect(rx-5,ry,3,1);g.fillRect(rx+3,ry,3,1);g.fillRect(rx,ry-5,1,3);g.fillRect(rx,ry+3,1,3);g.fillRect(rx,ry,1,1);}
  /* top-left: hull, heat, missiles */
  panel(2,2,76,28);
  const hf=P.hp/P.maxHp,hc=hf>.5?HC.green:hf>.25?'#ffc21a':(blink?HC.red:'#7a1810');
  txt3(g,'HULL',5,5,HC.dim);segBar(24,5,51,5,hf,hc);
  txt3(g,'HEAT',5,12,P.over>0&&blink?HC.red:HC.dim);segBar(24,12,51,5,P.heat/100,P.over>0?(FRAME>>2)&1?HC.red:'#ffd040':P.heat>70?'#ff7a2a':HC.amber);
  txt3(g,'MSL',5,19,HC.dim);{const np=4+2*(P.up.pods||0),full=4.2/(1+.35*(P.up.reload||0)),rf=P.missT>0?1-P.missT/full:1;const pw=np>6?3:4;
    for(let i=0;i<np;i++){g.fillStyle=rf>=1?'#ffd040':(i/np<rf?'#8a5a10':HC.bg);g.fillRect(24+i*(pw+2),19,pw,5);}}
  if(hf<.25&&!P.dead&&blink)txt3(g,'HULL CRITICAL',5,33,HC.red);
  /* top-center: wave or boss */
  if(G.boss&&!G.boss.dead){const b=G.boss,bw=Math.round(W*.4);panel(cx-bw/2-3,2,bw+6,24);txt3(g,b.d.name,cx,5,'#ff9aab',1,'c');segBar(Math.round(cx-bw/2),13,bw,5,b.hp/b.max,G.bossHit>0?'#ffffff':(b.hp<b.max*.5?'#ff2a6a':'#ff3a2a'));txt3(g,'WAVE '+G.wave,cx,20,HC.dim,1,'c');}
  else{panel(cx-36,2,72,19);txt5(g,'WAVE '+G.wave,cx,4,GR.volt,1,'c');const h=hostiles();txt3(g,G.phase==='clear'?'ALL CLEAR':h+' HOSTILE'+(h===1?'':'S'),cx,13,G.phase==='clear'?HC.green:HC.steel,1,'c');}
  /* top-right: score, multiplier, radar */
  const rw=Math.round(W*.13),rh=Math.round(rw*(INY-IN0)/(INX-IN0)),rx0=W-rw-3,ry0=21;
  panel(rx0-2,2,rw+4,ry0+rh-1);
  txt5(g,fmt(G.score),W-4,4,'#ffffff',1,'r');
  if(P.mult>1){txt3(g,'x'+P.mult,rx0,13,HC.amber);g.fillStyle=HC.amber;g.fillRect(rx0+10,15,Math.round((rw-10)*P.multT/2.4),1);}
  g.fillStyle='#14121c';g.fillRect(rx0,ry0,rw,rh);g.fillStyle='#3a3446';g.fillRect(rx0,ry0,rw,1);g.fillRect(rx0,ry0+rh-1,rw,1);g.fillRect(rx0,ry0,1,rh);g.fillRect(rx0+rw-1,ry0,1,rh);
  const mx=x=>rx0+1+(x-IN0)/(INX-IN0)*(rw-2),my=y=>ry0+1+(y-IN0)/(INY-IN0)*(rh-2);
  g.fillStyle='rgba(255,255,255,.14)';{const vx0=mx(OFFX/S),vy0=my((OFFY+S*KZ)/(S*KY)),vw=W/S/(INX-IN0)*(rw-2),vh=H/(S*KY)/(INY-IN0)*(rh-2);g.fillRect(Math.round(vx0),Math.round(vy0),Math.round(vw),Math.round(vh));}
  for(const p of PICK){g.fillStyle=HC.green;g.fillRect(Math.round(mx(p.x)),Math.round(my(p.y)),1,1);}
  for(const p of PODS){if((FRAME>>2)&1){g.fillStyle='#ff8a5a';g.fillRect(Math.round(mx(p.x)),Math.round(my(p.y)),1,1);}}
  for(const u of EN){if(u.dead)continue;const x=Math.round(mx(u.x)),y=Math.round(my(u.y));if(u.d.boss){g.fillStyle=blink?'#ffd040':HC.red;g.fillRect(x-1,y-1,3,3);}else{g.fillStyle=u.d.fly?'#ff9aab':HC.red;g.fillRect(x,y,1,1);}}
  if(!P.dead){g.fillStyle=(FRAME>>2)&1?'#ffffff':HC.amber;g.fillRect(Math.round(mx(P.x))-1,Math.round(my(P.y)),3,1);g.fillRect(Math.round(mx(P.x)),Math.round(my(P.y))-1,1,3);}
  /* bottom-center: howl */
  {const bw=Math.round(W*.28),bx=Math.round(cx-bw/2),by=H-8;panel(bx-24,by-3,bw+28,11);
    if(P.od>0){txt3(g,'OVR',bx-21,by,'#4fe0ff');segBar(bx,by,bw,5,P.od/7,(FRAME>>1)&1?'#8af8ff':'#2fb4ff');}
    else{txt3(g,'HOWL',bx-21,by,P.odM>=100?(blink?'#fff0c8':HC.amber):HC.dim);segBar(bx,by,bw,5,P.odM/100,P.odM>=100?(blink?'#fff0c8':'#ffae2a'):'#c87a14');
      if(P.odM>=100&&!P.dead)otxt3(g,touchy?'TAP HOWL':'PRESS E',cx,by-9,blink?'#ffffff':HC.amber,1,'c');}}
  /* big message */
  if(!quiet&&G.msg&&G.msgT>0){const mm=G.msg,sc=W>=380?3:2,y=Math.round(H*.3),age=(G.msg.d0??(G.msg.d0=G.msgT))-G.msgT;
    if(age>.12||(FRAME&1)){if(G.msgT>.3||(FRAME>>1)&1){otxt5(g,mm.t,cx,y,mm.col,sc,'c',.15,'#000');if(mm.sub)otxt3(g,mm.sub,cx,y+7*sc+5,'#e6e2da',1,'c');}}}
  /* damage + danger edges */
  if(G.hurtT>0){g.fillStyle=`rgba(255,30,20,${Math.min(.75,G.hurtT*2)})`;g.fillRect(0,0,W,2);g.fillRect(0,H-2,W,2);g.fillRect(0,0,2,H);g.fillRect(W-2,0,2,H);}
  else if(hf<.25&&!P.dead){const a=.25+.25*Math.sin(G.t*8);g.fillStyle=`rgba(255,30,20,${a})`;g.fillRect(0,0,W,1);g.fillRect(0,H-1,W,1);g.fillRect(0,0,1,H);g.fillRect(W-1,0,1,H);}
}

/* ===================== screens ===================== */
function dim(a){g.fillStyle=`rgba(3,2,7,${a})`;g.fillRect(0,0,W,H);}
function menu(items,y,sp){
  sp=sp||12;const cx=W>>1;
  for(let i=0;i<items.length;i++){const s=items[i],on=i===G.menuI,yy=Math.round(y+i*sp),w=tw5(s,1);
    if(on){g.fillStyle='rgba(255,174,42,.18)';g.fillRect(cx-w/2-13,yy-2,w+26,11);txt5(g,s,cx,yy,GR.volt,1,'c');const k=(FRAME>>3)&1;txt5(g,'>',cx-w/2-10+k,yy,HC.amber);txt5(g,'<',cx+w/2+5-k,yy,HC.amber);}
    else txt5(g,s,cx,yy,'#8a8498',1,'c');
    HOT.push({x:cx-w/2-13,y:yy-3,w:w+26,h:sp,i});}
}
function logo(cx,y,sc){
  const s='IRONHOWL',w=tw5(s,sc);otxt5(g,s,cx,y,GR.volt,sc,'c',.18,'#160700');
  const sw=((G.t*.42)%1.5)*(w+60)-30+cx-w/2;g.save();g.beginPath();g.rect(sw,y-2,sc*3,7*sc+4);g.clip();txt5(g,s,cx,y,'#ffffff',sc,'c',.18);g.restore();
}
function drawTitle(){
  dim(.38);g.fillStyle='rgba(3,2,7,.5)';g.fillRect(0,0,W,Math.round(H*.48));
  const sc=W>=380?4:3,cx=W>>1,y=Math.round(H*.13);
  logo(cx,y,sc);
  txt3(g,'LED MATRIX MECH ARENA',cx,y+7*sc+6,HC.steel,1,'c');
  txt3(g,'12 WAVES. 2 ARENAS. 2 BOSSES. 1 MECH.',cx,y+7*sc+14,HC.dim,1,'c');
  menu(['START','HOW TO PLAY'],Math.round(H*.6));
  panel(0,H-12,W,12,.5);txt3(g,'HI SCORE '+fmt(G.hi)+'   BEST WAVE '+G.best,cx,H-9,HC.dim,1,'c');
}
function drawHow(){
  dim(.78);const cx=W>>1,dsk=!touchy;
  if(G.howP===0){
    txt5(g,'HOW TO PLAY',cx,6,GR.volt,1,'c');
    const rows=[['MOVE',dsk?'WASD':'LEFT STICK'],['AIM + FIRE',dsk?'MOUSE + CLICK, OR ARROWS':'RIGHT STICK'],['MISSILES',dsk?'RIGHT CLICK OR SPACE':'MISSILE BUTTON'],['DASH',dsk?'SHIFT':'DASH BUTTON'],['HOWL',dsk?'E, WHEN THE METER IS FULL':'HOWL, WHEN THE METER IS FULL']];
    const x0=Math.round(W*.08),x1=Math.round(W*.34);let y=20;
    for(const [a,b] of rows){txt3(g,a,x0,y,HC.amber);txt3(g,b,x1,y,HC.ink);y+=9;}
    txt3(g,'GAMEPADS WORK TOO. ESC PAUSES.',x1,y,HC.dim);y+=13;
    const tips=['CANNONS OVERHEAT. EASE OFF AND THEY VENT.','KILLS CHARGE THE HOWL: SHOCKWAVE + OVERDRIVE.','MISSILES LOCK ON: WATCH FOR THE BRACKETS.','RED BARRELS CHAIN. CONTAINERS COLLAPSE.','A RED RING ON THE GROUND MEANS INCOMING.','LOW BARRIERS STOP ENEMY ROUNDS. YOURS FLY OVER.'];
    for(const t of tips){g.fillStyle=HC.amber;g.fillRect(x0,y+2,2,1);txt3(g,t,x0+5,y,'#c8c0d4');y+=8;}
  }else{
    txt5(g,'HOSTILES',cx,6,GR.red,1,'c');drawRoster();
  }
  if((FRAME>>4)&1)txt3(g,G.howP===0?'NEXT >':'DONE >',W-6,H-9,HC.amber,1,'r');
  txt3(g,(G.howP+1)+'/2',6,H-9,HC.dim);
}
const ROSTER=[['scuttler','SCUTTLER','SWARMS IN','THROUGH GATES'],['gunner','GUNNER','3-ROUND BURSTS.','WATCH THE EYE'],['tank','TANK','ARMORED FRONT.','FLANK IT'],['mortar','MORTAR','LOBS SHELLS.','LEAVE THE RING'],
  ['shield','SHIELDER','BLOCKS ROUNDS.','USE MISSILES'],['turret','TURRET','SWEEPING BEAM.','BREAK THE LINE'],['bomber','BOMBER','FLIES OVER AND','DROPS BOMBS'],[null,'???','TWO BOSSES','GUARD THE END']];
let RCACHE=null;
function drawRoster(){
  const cw=W/4,top=18,chh=(H-30)/2,S0=S,ox=OFFX,oy=OFFY;S=W/17;OFFX=0;OFFY=0;
  if(!RCACHE||RCACHE.W!==W){RCACHE={W,u:ROSTER.map((r,i)=>{if(!r[0])return null;const sx=cw*(i%4)+cw/2,sy=top+chh*((i/4)|0)+chh*.52;const u=mkEnemy(r[0],sx/S,sy/(S*KY));u.spawnT=9;u.body=.5;u.aim=.5;if(u.d.fly)u.z=1.3;if(u.feet)for(const f of u.feet){f.x=u.x+Math.cos(u.body+f.a)*(u.type==='mortar'?.8:.42);f.y=u.y+Math.sin(u.body+f.a)*(u.type==='mortar'?.8:.42);}return u;})};}
  RBUF.fill(0);EM.fill(0);fullClip();
  for(const u of RCACHE.u){if(!u)continue;u.t+=1/60;u.d.draw(u);}
  acx.putImageData(AIMG,0,0);g.drawImage(ac,0,0);
  S=S0;OFFX=ox;OFFY=oy;
  for(let i=0;i<ROSTER.length;i++){const r=ROSTER[i],x=Math.round(cw*(i%4)+cw/2),y=Math.round(top+chh*((i/4)|0)+chh*.62);
    if(!r[0]){txt5(g,'?',x,y-18,(FRAME>>3)&1?HC.red:'#7a1810',2,'c');}
    txt3(g,r[1],x,y,r[0]?HC.amber:HC.red,1,'c');txt3(g,r[2],x,y+7,'#b8b0c4',1,'c');txt3(g,r[3],x,y+13,'#b8b0c4',1,'c');}
}
const ICONS={spread:['1.....1','.1...1.','..1.1..','1..1..1','.1.1.1.','..111..','...1...'],rate:['1..1...','.1..1..','..1..1.','...1..1','..1..1.','.1..1..','1..1...'],
  dmg:['...1...','..111..','..111..','..111..','..111..','.11111.','.11111.'],pods:['...1...','..111..','..1.1..','..111..','.11111.','1.111.1','..1.1..'],
  reload:['..111.1','.1...11','1...111','1......','1.....1','.1...1.','..111..'],armor:['1111111','1.....1','1.111.1','1.111.1','.1.1.1.','..1.1..','...1...'],
  cool:['1..1..1','.1.1.1.','..111..','1111111','..111..','.1.1.1.','1..1..1'],drone:['11...11','11...11','..111..','.11111.','..111..','11...11','11...11'],
  ram:['...1..1','...11.1','1111111','1111111','...11.1','...1..1','......1'],magnet:['11...11','11...11','11...11','11...11','11...11','.11111.','..111..'],
  howl:['....1..','.1...1.','1.1...1','1.1.1.1','1.1...1','.1...1.','....1..'],pierce:['...1...','...1.1.','...1..1','1111111','...1..1','...1.1.','...1...'],
  fix:['..111..','..1.1..','1111111','1.....1','1111111','..1.1..','..111..']};
const UCAT={spread:'w',rate:'w',dmg:'w',pods:'w',reload:'w',pierce:'w',armor:'d',cool:'d',fix:'d',drone:'u',ram:'u',magnet:'u',howl:'u'};
const CATC={w:['#ffae2a','#ffd040','WEAPON'],d:['#6aff5a','#b4ffaa','ARMOR'],u:['#4fe0ff','#a6f3ff','SYSTEM']};
function drawUpgrade(){
  dim(.62);const cx=W>>1,n=G.upg.length;
  txt5(g,'WAVE '+G.wave+' CLEAR',cx,8,GR.green,1,'c');txt3(g,'SALVAGE: TAKE ONE UPGRADE',cx,19,HC.steel,1,'c');txt3(g,'SCORE '+fmt(G.score)+'   HULL '+Math.ceil(PLY.hp)+'/'+PLY.maxHp,cx,H-18,HC.dim,1,'c');
  const cw=Math.round(W*.29),chh=Math.round(H*.54),gap=Math.round(W*.025),tot=n*cw+(n-1)*gap,x0=Math.round(cx-tot/2),y0=Math.round(H*.2)+6,isc=H>=200?3:2;
  for(let i=0;i<n;i++){const u=G.upg[i],on=i===G.menuI,x=x0+i*(cw+gap),y=y0-(on?2:0),cc=CATC[UCAT[u.id]];
    g.fillStyle=on?'rgba(40,26,8,.95)':'rgba(12,10,18,.92)';g.fillRect(x,y,cw,chh);
    g.fillStyle=on?cc[0]:'#3a3446';g.fillRect(x,y,cw,1);g.fillRect(x,y+chh-1,cw,1);g.fillRect(x,y,1,chh);g.fillRect(x+cw-1,y,1,chh);
    if(on){g.fillStyle=cc[0];g.fillRect(x+2,y+2,cw-4,1);}
    txt3(g,cc[2],x+cw/2,y+5,on?cc[0]:HC.dim,1,'c');
    const ic=ICONS[u.id]||ICONS.fix,iw=7*isc,ix=Math.round(x+cw/2-iw/2),iy=y+13;g.fillStyle=on?cc[1]:cc[0];
    for(let r=0;r<7;r++)for(let k=0;k<7;k++)if(ic[r][k]==='1')g.fillRect(ix+k*isc,iy+r*isc,isc-(isc>2?1:0),isc-(isc>2?1:0));
    const ny=iy+iw+6;txt3(g,u.name,x+cw/2,ny,on?'#ffffff':HC.ink,1,'c');
    txt3(g,u.d[0],x+cw/2,ny+9,'#b8b0c4',1,'c');txt3(g,u.d[1],x+cw/2,ny+16,'#b8b0c4',1,'c');
    if(u.max<=4){const lv=PLY.up[u.id]||0,pw=6,tw=u.max*pw+(u.max-1)*2,px0=Math.round(x+cw/2-tw/2),py=y+chh-8;for(let k=0;k<u.max;k++){g.fillStyle=k<lv?cc[0]:k===lv?((FRAME>>3)&1?cc[1]:'#5a4a2a'):HC.bg;g.fillRect(px0+k*(pw+2),py,pw,3);}}
    if(n<=3&&!touchy)txt3(g,String(i+1),x+4,y+5,HC.dim);
    HOT.push({x,y,w:cw,h:chh,i});}
  txt3(g,touchy?'TAP A CARD':'CLICK, OR ARROWS + ENTER, OR 1 2 3',cx,H-9,HC.dim,1,'c');
}
function drawOver(){
  dim(Math.min(.72,G.t*.6));const cx=W>>1,sc=W>=380?3:2;
  otxt5(g,'MECH DESTROYED',cx,Math.round(H*.2),GR.red,sc,'c',.15,'#000');
  txt5(g,'WAVE '+G.wave+'   SCORE '+fmt(G.score),cx,Math.round(H*.2)+7*sc+12,'#ffffff',1,'c');
  if(G.newHi){if((FRAME>>3)&1)txt5(g,'NEW HIGH SCORE',cx,Math.round(H*.2)+7*sc+24,GR.volt,1,'c');}else txt3(g,'HI SCORE '+fmt(G.hi)+'   BEST WAVE '+G.best,cx,Math.round(H*.2)+7*sc+25,HC.dim,1,'c');
  txt3(g,PLY.kills+' KILLS',cx,Math.round(H*.2)+7*sc+35,HC.steel,1,'c');
  if(EMBED)txt3(g,'+'+G.tix+' TICKETS',cx,Math.round(H*.2)+7*sc+45,HC.amber,1,'c');
  if(G.t>1.2)menu(['RETRY','TITLE'],Math.round(H*.7));
}
function drawWin(){
  dim(Math.min(.7,G.t*.5));const cx=W>>1,sc=W>=380?3:2;
  otxt5(g,'ARENA CLEARED',cx,Math.round(H*.18),GR.volt,sc,'c',.15,'#000');
  txt3(g,'THE MAW IS SCRAP. THE YARD IS YOURS.',cx,Math.round(H*.18)+7*sc+8,HC.steel,1,'c');
  txt5(g,'SCORE '+fmt(G.score),cx,Math.round(H*.18)+7*sc+20,'#ffffff',1,'c');
  if(G.newHi&&(FRAME>>3)&1)txt5(g,'NEW HIGH SCORE',cx,Math.round(H*.18)+7*sc+32,GR.volt,1,'c');
  if(EMBED)txt3(g,'+'+ihTickets(true)+' TICKETS',cx,Math.round(H*.18)+7*sc+42,HC.amber,1,'c');   /* paid on TITLE; endless keeps adding */
  if(G.t>1.2)menu(['KEEP FIGHTING: ENDLESS','TITLE'],Math.round(H*.68));
}
function drawPause(){dim(.6);const cx=W>>1;otxt5(g,'PAUSED',cx,Math.round(H*.24),GR.steel,2,'c',0,'#000');menu(['RESUME','RESTART','QUIT TO TITLE'],Math.round(H*.48));}
function draw(){
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;HOT.length=0;
  renderScene();
  const m=G.mode;
  if(m==='play'){hud(G.paused);if(G.paused)drawPause();}
  else if(m==='title')drawTitle();
  else if(m==='howto')drawHow();
  else if(m==='upgrade')drawUpgrade();
  else if(m==='over')drawOver();
  else if(m==='win')drawWin();
  const rd=m==='play'&&PLY&&PLY.odM>=100&&PLY.od<=0;const bh=$('bH');if(bh.classList.contains('ready')!==rd)bh.classList.toggle('ready',rd);
}

/* ===================== chrome, loop, boot ===================== */
function toggleSound(){AU.muted=!AU.muted;store.set('ih-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%RES.length);RCACHE=null;e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();if(G.mode==='play')setPause(!G.paused);else if(G.mode==='howto'){G.mode='title';G.menuI=0;}e.currentTarget.blur();});
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;e.preventDefault();audioInit();TAP={x:(e.clientX-RECT.x)/RECT.w*W,y:(e.clientY-RECT.y)/RECT.h*H};});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('resize',resize);
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
let ACC=0,LAST=0;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  draw();musicTick(G.paused);present();
  requestAnimationFrame(frame);
}
if(!gl){$('err').style.display='grid';}
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();
startDemo();
ARC.post('ready',{title:ARC.title,w:W,h:H,tickets:true});
window.__ih={ARC,AU,ihTickets,gameOver,PROF,G,get PLY(){return PLY},EN,BUL,MIS,PRT,PICK,PODS,RINGS,KEY,MOUSE,TS,LATCH,get WORLD(){return WORLD},startGame,startDemo,startWave,spawnPod,applyUpg,openUpgrade,tick,draw,present,setRes,mkEnemy,hurtPlayer,
  ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},time(k){const t0=performance.now();for(let i=0;i<k;i++)tick(1/60);const t1=performance.now();draw();const t2=performance.now();present();const t3=performance.now();const hs=performance.now();hud();const he=performance.now();return JSON.stringify(PROF,(k,v)=>typeof v==='number'?+v.toFixed(2):v)+' hud '+(he-hs).toFixed(2)+' tick '+((t1-t0)/k).toFixed(2)+' draw '+(t2-t1).toFixed(2)+' present '+(t3-t2).toFixed(2);}};
requestAnimationFrame(frame);
