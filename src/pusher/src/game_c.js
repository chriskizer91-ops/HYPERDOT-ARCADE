/* =====================================================================================
   12. COMPOSE — world -> RBUF (z-buffered), overlays, commit, then HUD text through g
   ===================================================================================== */
let TMP=null;RESCB.push(()=>{camInit();bake();TMP=new Uint32Array(W*H);proj(0,CHY,ZDROP);ZCH=PJ[2];});
/* where would a coin dropped now come to rest? the highest coin top under the chute, else deck or floor */
function landingY(x){let y=PZM+PZA*Math.sin(PU.ph+TAU/PPER*.26)>ZDROP+.6?HP:0;
  for(let k=0;k<NL;k++){const i=LIVE[k];if(BY[i]>YDR-1)continue;const dx=BX[i]-x,dz=BZ[i]-ZDROP;if(dx*dx+dz*dz<1.6){const t=BY[i]+BH[i]+.02;if(t>y)y=t;}}return y;}
function drawChute(t){
  const x=S.cx,ready=S.reload<=0&&(S.demo||S.bank>0),good=gapNow();
  /* rail */
  proj(-XW,CHY+.62,ZDROP);const ax=PJ[0],ay=PJ[1],az=PJ[2];proj(XW,CHY+.62,ZDROP);
  for(let px_=Math.max(0,ax|0);px_<=Math.min(W-1,PJ[0]|0);px_++){const y=Math.round(ay);if(y>=0&&y<H-1){let i=y*W+px_;if(az<ZB[i]){RBUF[i]=pack(150,155,175);ZB[i]=az;}i+=W;if(az<ZB[i]){RBUF[i]=pack(60,62,78);ZB[i]=az;}}}
  /* drop guide: a dotted plumb line to the landing point and a ring there */
  if(ready){const ly=landingY(x),ph=(t*6)%1;proj(x,YDR,ZDROP+.0);const ty=PJ[1];proj(x,ly,ZDROP);const by=PJ[1],sx=PJ[0];
    for(let y=Math.ceil(ty);y<by;y++){if(((y+ph*4)|0)%3)continue;const i=y*W+Math.round(sx);if(i>=0&&i<W*H)addPx(i,good?40:60,good?90:50,good?50:20);}
    for(let k=0;k<20;k++){const a=k/20*TAU;proj(x+Math.cos(a)*1.05,ly+.01,ZDROP+Math.sin(a)*1.05);const i=Math.round(PJ[1])*W+Math.round(PJ[0]);if(PJ[0]>=0&&PJ[0]<W&&PJ[1]>=0&&PJ[1]<H&&(k+((t*10)|0))%4<3)addPx(i,good?60:120,good?200:110,good?90:30);}}
  /* carriage: an open chrome yoke riding the rail, the next coin standing in it, and a status lamp
     (green = the pusher is pulling back, so a coin dropped now lands in the gap in front of it) */
  const cz=ZDROP+.5;proj(x,CHY+.35,cz);const ccx=PJ[0],ccy=PJ[1],czd=PJ[2];proj(x+1.25,CHY+.35,cz);const hw=PJ[0]-ccx;proj(x,CHY+1.4,cz);const top=PJ[1];proj(x,CHY-.75,cz);const bot=PJ[1];
  const post=(px0,c1,c2)=>{quadZ(px0,top,px0+1,bot,czd-.2,c1);quadZ(px0+1,top,px0+1,bot,czd-.2,c2);};
  post(ccx-hw-2,pack(200,205,225),pack(90,92,110));post(ccx+hw,pack(90,92,110),pack(200,205,225));
  quadZ(ccx-hw-2,top-1,ccx+hw+1,top,czd-.21,pack(220,225,240));quadZ(ccx-hw-2,top+1,ccx+hw+1,top+1,czd-.21,pack(70,70,90));
  quadZ(ccx-hw-1,bot,ccx-hw+1,bot+1,czd-.21,pack(150,150,170));quadZ(ccx+hw-2,bot,ccx+hw,bot+1,czd-.21,pack(150,150,170));
  const lc=!ready?[255,40,40]:good?[60,255,110]:[255,170,40];quadZ(ccx-1,top-3,ccx+1,top-2,czd-.22,pack(lc[0],lc[1],lc[2]));glow(ccx,top-2.5,5,lc,.55);
  if(ready)drawCoin(x,CHY+.35,ZDROP+.55,1,0,0,0,0,1,0,-1,0,1,.15,S.nextKind||0,0,.95,.05,0);
}
function drawParts(){for(const p of S.parts){proj(p.x,p.y,p.z);if(PJ[2]<1)continue;const x=PJ[0],y=PJ[1];if(x<0||y<0||x>=W||y>=H)continue;const k=Math.min(1,p.life*1.6),c=p.col;
  addPx((y|0)*W+(x|0),c[0]*k,c[1]*k,c[2]*k);if(p.life>.5)glow(x,y,2.2,c,.35*k);}}
/* the bonus wheel, drawn per dot: segments, chasing rim bulbs, pegs, hub, and the sprung flapper */
function drawWheel(t){const w=S.wheel;if(w.show<=0)return null;
  const e=w.show<1?1-Math.pow(1-w.show,3):1,R=Math.round(H*.31*e),cx=W/2,cy=Math.round(H*.4),R2=R*R;if(R<3)return null;
  for(let y=Math.max(0,cy-R-3);y<=Math.min(H-1,cy+R+3);y++)for(let x=Math.max(0,cx-R-3);x<=Math.min(W-1,cx+R+3);x++){
    const dx=x+.5-cx,dy=y+.5-cy,d2=dx*dx+dy*dy,i=y*W+x;
    if(d2>(R+3)*(R+3))continue;
    if(d2>R2){const c=RBUF[i];RBUF[i]=pack((c&255)*.3,((c>>>8)&255)*.3,((c>>>16)&255)*.3);continue;}
    const d=Math.sqrt(d2),a=Math.atan2(dy,dx),loc=((a+Math.PI/2-w.ang)%TAU+TAU)%TAU;let k=0;while(k<WSEG.length-1&&loc>=WA[k+1])k++;
    const sg=WSEG[k],win=w.res===k&&!w.on;let c=sg.c,r=c[0],gg=c[1],b=c[2];
    const shade=(.55+.45*(1-d/R))*((k&1)?.82:1)*(win?(.6+.4*Math.sin(t*18)):1);r*=shade;gg*=shade;b*=shade;
    if(sg.t==='jack'){const s=.5+.5*Math.sin(t*9+d*.4);r=255*(.6+.4*s);gg=200*(.6+.4*s);b=80;}
    if(d>R*.86){const n=Math.floor((a+Math.PI)/TAU*28),on=(n+((t*(w.on?14:5))|0))%3===0;r=on?255:70;gg=on?220:50;b=on?140:40;}
    else if(d<R*.17){r=230;gg=180;b=80;if(d<R*.07){r=255;gg=245;b=200;}}
    const off=Math.min(Math.abs(loc-WA[k]),Math.abs(WA[k+1]-loc))*d;if(off<.6&&d>R*.17&&d<R*.86){r=60;gg=50;b=60;}
    RBUF[i]=pack(r,gg,b);}
  /* pegs */
  for(let k=0;k<WSEG.length;k++){const a=WA[k]+w.ang-Math.PI/2,px_=cx+Math.cos(a)*R*.82,py=cy+Math.sin(a)*R*.82;disc(px_,py,1.1,pack(255,255,240));}
  /* flapper at the top, sprung, flicked by the pegs */
  const fa=clamp(w.flap,-1.2,1.2)*.5;for(let s=0;s<6;s++){const yy=cy-R-3+s,xx=cx+Math.sin(fa)*s*1.2;for(let q=-(5-s)>>1;q<=(5-s)>>1;q++)px(xx+q,yy,pack(255,250,230));}
  return {cx,cy,R};
}
function blitShake(){if(reduce||S.shake<=0)return;const a=Math.round((Math.random()-.5)*S.shake*6),b=Math.round((Math.random()-.5)*S.shake*4);if(!a&&!b)return;
  TMP.set(RBUF);for(let y=0;y<H;y++){const sy=clamp(y-b,0,H-1);for(let x=0;x<W;x++)RBUF[y*W+x]=TMP[sy*W+clamp(x-a,0,W-1)];}}
const RT={ms:0};
function render(){
  const t0=performance.now(),t=S.t;
  envFrame(t,S.flash*.5);
  drawStatic(t,{hot:(S.shower||S.wheel.on)?1:0,col:S.mode==='over'?2:0});
  const q0=performance.now();drawDeck(t);const q1=performance.now();drawCoins(t);const q2=performance.now();drawChute(t);drawGlints(t);drawParts();
  const wh=drawWheel(t);const q3=performance.now();RT.deck=q1-q0;RT.coins=q2-q1;RT.rest=q3-q2;RT.pre=q0-t0;
  if(S.flash>0){const f=S.flash,c=S.flashC;for(let i=0;i<W*H;i++)addPx(i,c[0]*f*.25,c[1]*f*.25,c[2]*f*.25);}
  blitShake();const q4=performance.now();commit();const q5=performance.now();hud(t,wh);RT.commit=q5-q4;RT.hud=performance.now()-q5;
  RT.ms=performance.now()-t0;
}
/* ---------- text sprites: outlined bitmap strings rendered once and reused (per-pixel fillRects are slow) ---------- */
const TXC=new Map();
function tsprite(k,s,col,sc,it,ol){const key=k+'|'+s+'|'+(Array.isArray(col)?col.join(','):col)+'|'+sc+'|'+it+'|'+ol;let e=TXC.get(key);if(e)return e;
  const w=(k===5?tw5(s,sc)+Math.ceil(6*it*sc):tw3(s,sc))+6,h=(k===5?7:5)*sc+6,c=document.createElement('canvas');c.width=Math.max(1,w);c.height=h;const x=c.getContext('2d');
  if(k===5)otxt5(x,s,3,3,col,sc,undefined,it,ol);else otxt3(x,s,3,3,col,sc,undefined,ol);
  e={c};if(TXC.size>500)TXC.clear();TXC.set(key,e);return e;}
function OT5(g_,s,x,y,col,sc=1,align,it=0,ol='#000'){const e=tsprite(5,s,col,sc,it,ol);let X=x;if(align==='c')X=Math.round(x-tw5(s,sc)/2);else if(align==='r')X=x-tw5(s,sc);g_.drawImage(e.c,X-3,y-3);}
function OT3(g_,s,x,y,col,sc=1,align,ol='#000'){const e=tsprite(3,s,col,sc,0,ol);let X=x;if(align==='c')X=Math.round(x-tw3(s,sc)/2);else if(align==='r')X=x-tw3(s,sc);g_.drawImage(e.c,X-3,y-3);}
/* ---------- HUD and screens (bitmap fonts through g) ---------- */
function coinIcon(x,y,col){g.fillStyle=col;g.fillRect(x+1,y,3,5);g.fillRect(x,y+1,5,3);g.fillStyle='rgba(255,255,255,.8)';g.fillRect(x+1,y+1,1,1);}
function hud(t,wh){
  if(wh){for(let k=0;k<WSEG.length;k++){const s=WSEG[k],a=(WA[k]+WA[k+1])/2+S.wheel.ang-Math.PI/2,x=wh.cx+Math.cos(a)*wh.R*.56,y=wh.cy+Math.sin(a)*wh.R*.56;
      const lbl=s.t==='tk'?''+s.v:s.t==='shower'?'RAIN':s.t==='coins'?'+5':s.t==='prize'?'GEM':s.t==='x2'?'x2':'JP';const rr=s.t==='jack'?.76:.56,lx=wh.cx+Math.cos(a)*wh.R*rr,ly=wh.cy+Math.sin(a)*wh.R*rr;
      if(wh.R>24)OT3(g,lbl,Math.round(lx),Math.round(ly)-2,s.t==='jack'?'#fff2a0':'#ffffff',1,'c');}
    if(S.wheel.res>=0&&!S.wheel.on){const s=WSEG[S.wheel.res];}}
  if(S.mode==='play'||S.mode==='over'){
    g.fillStyle='rgba(4,3,10,.74)';g.fillRect(0,0,W,9);
    coinIcon(3,2,S.bank>3?'#ffc84a':'#ff5a4a');OT3(g,'x'+S.bank,10,2,S.bank>0?'#ffe6a0':'#ff6a5a');
    if(S.phase==='run'){g.fillStyle='#5a4a2a';g.fillRect(3,8,18,1);g.fillStyle='#ffc84a';g.fillRect(3,8,Math.round(18*S.bankT/REFILL),1);}
    const tx=Math.round(W*.17);
    if(S.mode==='play'){if(S.phase==='run'||S.phase==='ready')OT3(g,'TIME '+Math.ceil(S.time),tx,2,S.time<10&&(t*4|0)%2?'#ff5a5a':'#ffd040');
      else if(S.phase==='last')OT3(g,'LAST COINS',tx,2,(t*3|0)%2?'#ff7a5a':'#ffd040');else OT3(g,'FINAL '+Math.ceil(S.finalT),tx,2,'#ff9a40');}
    const mx=Math.round(W*.42);OT3(g,'SHOWER',mx,2,'#9adfff');const bw=Math.round(W*.13),bx=mx+26;g.fillStyle='#16304a';g.fillRect(bx,2,bw,5);
    g.fillStyle=S.shower?((t*10|0)%2?'#ffffff':'#4fe0ff'):'#2aa8ff';g.fillRect(bx,2,Math.round(bw*Math.min(1,S.casc/(S.cascN||CASC_N))),5);
    OT3(g,fmt(S.score),Math.round(W*.83),2,'#ffffff',1,'r');
    g.fillStyle='#ff9a20';g.fillRect(W-27,2,7,5);g.fillStyle='#ffd080';g.fillRect(W-25,3,3,1);
    OT3(g,''+Math.round(S.tk+(S.tkf||0)-.49),W-3,2,S.x2>0&&(t*6|0)%2?'#9affea':'#ffd060',1,'r');
    if(S.x2>0)OT3(g,'x2',W-36,10,'#9affea');
    /* tickets spitting out of the slot under the counter whenever some are paid */
    const tkNow=Math.round(S.tk+(S.tkf||0)-.49);if(tkNow>(S.tkSeen||0)){S.spit=Math.min(14,(S.spit||0)+tkNow-(S.tkSeen||0));S.spitT=0;}S.tkSeen=tkNow;
    if(S.spit>0){S.spitT=(S.spitT||0)+1/60;const n=Math.min(S.spit,Math.floor(S.spitT*30));for(let k=0;k<n;k++){g.fillStyle=k%2?'#ff9a20':'#ffc060';g.fillRect(W-26,9+k*2,5,2);g.fillStyle='#6a2a00';g.fillRect(W-24,9+k*2,1,1);}
      if(S.spitT>1.4)S.spit=0;}
    if(S.wheel.queue>0&&S.mode==='play')OT3(g,'WHEEL x'+S.wheel.queue,W-3,H-16,(t*4|0)%2?'#ffd060':'#ff8040',1,'r');
    if(S.mode==='play'&&S.bumps<3)OT3(g,'BUMP '+S.bumps,3,10,'#a0a0c0');
  }
  if(S.banner){const b=S.banner,k=b.t/b.life,sc=W>=300?3:2,y=Math.round(H*.5-7*sc/2-(k<.15?(1-k/.15)*8:0));
    if(k<.85||(t*10|0)%2)OT5(g,b.txt,W/2,y,b.grad,sc,'c',.12,'#000');}
  for(const p of S.pops){const k=p.t/p.life,y=Math.round(p.y-k*14);const a=k>.7?(1-k)/.3:1;g.globalAlpha=a;if(p.life>1.3&&!p.merge&&tw5(p.txt)<W-8)OT5(g,p.txt,Math.round(p.x),y-2,rgba(p.col,1),1,'c');else OT3(g,p.txt,Math.round(p.x),y,rgba(p.col,1),1,'c');g.globalAlpha=1;}
  if(S.mode==='title'){
    const sc=W>=300?3:2,y=Math.round(H*.05)+1;OT5(g,'COIN CASCADE',W/2,y,GR.volt,sc,'c',.15,'#000');
    OT3(g,'THE HYPERDOT COIN PUSHER',W/2,y+7*sc+4,'#c8c0e8',1,'c');
    if((S.t*2|0)%2)OT5(g,touchy?'TAP TO PLAY':'PRESS SPACE',W/2,Math.round(H*.78),'#ffb040',1,'c');
    const info=['HI SCORE '+fmt(S.hi),'DROP WHEN THE PUSHER PULLS BACK','RED STAR COINS SPIN THE WHEEL','PRIZE TOKENS PAY 15 TICKETS','JACKPOT '+Math.round(S.jp)+' TICKETS','25 COINS WON = A COIN SHOWER'];
    const n=(S.t/3.2|0)%info.length;OT3(g,info[n],W/2,H-8,n===0?'#ffffff':'#b8b0d8',1,'c');
  }else if(S.mode==='play'){
    if(S.t<7&&S.phase!=='final'){let h_=touchy?'TAP TO DROP - TAP WHERE TO AIM':'SPACE OR CLICK TO DROP - AIM WITH MOUSE OR ARROWS';if(tw3(h_)>W-6)h_=touchy?'TAP WHERE TO DROP':'SPACE DROPS - ARROWS AIM';OT3(g,h_,W/2,H-8,(S.t*2|0)%2?'#ffd890':'#a89870',1,'c');}
    else if(S.bank<=0&&S.phase==='run')OT3(g,'NEXT COIN IN '+Math.ceil(REFILL-S.bankT),W/2,H-8,'#ff9a7a',1,'c');
    if(S.gapOK>0)OT3(g,'GOOD DROP',W/2,Math.round(H*.18),'#7affa0',1,'c');
  }else if(S.mode==='over'){
    const pw=Math.min(W-16,150),ph=Math.round(H*.66),px0=Math.round(W/2-pw/2),py0=Math.round(H*.17);
    g.fillStyle='rgba(6,4,14,.86)';g.fillRect(px0,py0,pw,ph);g.fillStyle='#ffb040';g.fillRect(px0,py0,pw,1);g.fillRect(px0,py0+ph-1,pw,1);
    OT5(g,'SESSION OVER',W/2,py0+4,GR.volt,1,'c');
    const rows=[['COINS WON',S.won],['PRIZES',S.prizes],['WHEEL TICKETS',S.wheelTk],['SCORE',fmt(S.score)]];
    rows.forEach((r,k)=>{const y=py0+16+k*8;if(S.overT>.3+k*.25){OT3(g,r[0],px0+8,y,'#b8b0d8');OT3(g,''+r[1],px0+pw-8,y,'#ffffff',1,'r');}});
    const ty=py0+ph-26;OT5(g,''+Math.floor(S.tkShown),W/2+10,ty,GR.volt,2,'c');OT3(g,'TICKETS',W/2+10,ty+16,'#ffd060',1,'c');
    /* the ticket strip chattering out of the slot */
    const n=Math.min(14,Math.floor(S.tkShown/Math.max(1,S.tk/14))),sx=px0+10;for(let k=0;k<n;k++){g.fillStyle=k%2?'#ff9a20':'#ffb848';g.fillRect(sx,ty+18-k*3,12,2);g.fillStyle='#7a3a08';g.fillRect(sx+5,ty+18-k*3,2,2);}
    if(S.newHi&&(S.t*4|0)%2)OT3(g,'NEW HIGH SCORE',W/2,py0+ph+3,'#6aff5a',1,'c');
    if(S.overT>1.6&&S.tkShown>=S.tk&&(S.t*2|0)%2)OT3(g,touchy?'TAP TO CONTINUE':'PRESS SPACE',W/2,H-8,'#ffb040',1,'c');
  }
  if(S.paused){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);OT5(g,'PAUSED',W/2,Math.round(H*.4),GR.steel,2,'c',0,'#000');OT3(g,touchy?'TAP PAUSE TO RESUME':'ESC TO RESUME',W/2,Math.round(H*.4)+20,'#c0c0d8',1,'c');}
}
/* =====================================================================================
   13. FRAME LOOP — fixed 60 Hz simulation, render once per display frame
   ===================================================================================== */
let ACC=0,LAST=0;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  if(AU.ctx&&!CLK.ready&&!CLK.busy){CLK.busy=true;setTimeout(()=>{try{synthBank();}catch(e){}},0);}
  g.setTransform(1,0,0,1,0,0);render();musicTick(S.paused);motorUpdate(!S.paused&&!document.hidden,PU.v,PH.faceLoad);present();
  requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%CAB.res.length);layout();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
$('brand').firstChild.textContent=CAB.brand;$('brand').querySelector('span').textContent=CAB.sub;$('keys').innerHTML=CAB.keys;document.title='Coin Cascade';
$('stL').hidden=true;$('bA').textContent='DROP';$('bB').textContent='BUMP';
{const st=document.createElement('style');st.textContent='#pad{justify-content:flex-end}body.portrait #pad{justify-content:center}';document.head.appendChild(st);}   // no stick: buttons to the right (centred when upright)
if(!gl)$('err').style.display='grid';
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();
buildHeap(7);settleHeap(1.6);S.cx=0;APP_attract();
ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
/*HOOK*/
window.__game={S,PH,PU,KEY,LATCH,PTR,TS,RT,tick,render,physTick,start:APP_start,attract:APP_attract,setRes,
  ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},
  shower:()=>startShower(20,'test'),wheel:()=>{S.wheel.queue++;},bump,
  badList(){const o=[];for(let k=0;k<NL;k++){const i=LIVE[k],x=BX[i],y=BY[i],z=BZ[i];const inP=z<PU.z-.6&&y<HP-.35&&y>-.3&&Math.abs(x)<XW,un=y<-.25&&z<ZE-1.3&&(z<ZG?Math.abs(x)<XW-1.2:Math.abs(x)<XF-1.2);
    if(inP||un)o.push({i,what:inP?'pusher':'floor',x:+x.toFixed(2),y:+y.toFixed(2),z:+z.toFixed(2),pu:+PU.z.toFixed(2),ny:+RM[i*9+4].toFixed(2),slp:SLP[i],v:[VX[i],VY[i],VZ[i]].map(v=>+v.toFixed(1)),age:+AGE[i].toFixed(2),kind:KIND[i]});}return o;},
  live:()=>NL,conserved:()=>NL+PH.won+PH.lost===PH.spawned,
  /* tunnelling probes: a coin centre inside the pusher block, or below the floor surface over the floor interior */
  bad(){let n=0;for(let k=0;k<NL;k++){const i=LIVE[k],x=BX[i],y=BY[i],z=BZ[i];
    if(z<PU.z-.6&&y<HP-.35&&y>-.3&&Math.abs(x)<XW)n++;if(y<-.25&&z<ZE-1.3&&(z<ZG?Math.abs(x)<XW-1.2:Math.abs(x)<XF-1.2))n++;}return n;},
  stats(){let s1=0,s2=0;for(let k=0;k<NL;k++){const i=LIVE[k];if(SLP[i]===1)s1++;else if(SLP[i]===2)s2++;}return {live:NL,asleep:s1,riders:s2,awake:PH.awake,contacts:PH.contacts,active:PH.active,ms:PH.ms};}};
/*/HOOK*/
requestAnimationFrame(frame);
