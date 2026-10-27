
/* ---------- 9.13 meet the critters: the same rigs on a counter, each doing its signature bit ---------- */
const CAST=[];
['mole','hard','gold','bomb','king'].forEach((k,i)=>{const vh=mkHole(0,i,0,0,.78,20+i);vh.kind=k;vh.c=mkCritter(vh);vh.c.cast=true;CAST.push(vh);});
const CASTTXT={mole:KIND.mole.pts+' PTS',hard:'2 HITS',gold:KIND.gold.pts+' FAST',bomb:"DON'T!",king:'5 HITS'};
function layoutCast(){const sy=Math.round(H*.72);for(let i=0;i<5;i++){const vh=CAST[i];vh.x=Math.round(W*(i+.5)/5);vh.y=sy;vh.k=vh.kind==='king'?.64:.78;
  vh.clip=new Int16Array(W).fill(sy);vh.clipP=new Int16Array(W).fill(sy+Math.round(4*U));}}
function castStart(){S.castT=0;S.castN=0;CAST.forEach((vh,i)=>{spawnCritter(vh,vh.kind);vh.c.delay=.25+i*.2;});}
function castAct(c){
  switch(c.kind){
  case 'mole':enter(c,'laugh');break;
  case 'hard':c.SQ.v-=5;c.brow=2;c.flush=.8;steam(c);break;
  case 'gold':enter(c,'tease');break;
  case 'bomb':c.fph+=.5;c.SQ.v+=4;break;
  case 'king':c.CRv=-105;c.CRA.v+=7;c.SQ.v-=3;break;
  }
}
function castTick(dt){
  S.castT+=dt;if(S.castT>1.35&&S.t>1.4){S.castT=0;castAct(CAST[S.castN++%5].c);}
  for(const vh of CAST){const c=vh.c;if(c.delay>0){c.delay-=dt;continue;}critTick(c,dt);if(c.kind==='hard'&&c.flush>0)c.flush=Math.max(0,c.flush-dt*.5);if(c.brow===2&&c.kind==='hard'&&c.flush<.2)c.brow=1;}
}
function drawCast(){
  for(let i=0;i<W*H;i++)RBUF[i]=mulC(RBUF[i],.28);
  const sy=CAST[0].y,th=Math.round(5*U);
  rect(0,sy,W,th,pack(112,66,40));rect(0,sy,W,1,pack(176,114,72));rect(0,sy+th,W,1,pack(36,20,16));
  for(let x=Math.round(7*U);x<W;x+=Math.round(32*U))rect(x,sy+1,1,th-1,pack(84,48,30));
  for(const vh of CAST){const c=vh.c;if(c.delay>0||c.st==='none')continue;
    dizzyStars(c,false);drawRig(c);compose(vh.clip,0,REDC,c.kind==='bomb'?c.red*.75:0,c.kind==='gold'?S.rt*.9:0,0);
    if(drawPaws(c))compose(vh.clipP,0,REDC,c.kind==='bomb'?c.red*.75:0,0,0);dizzyStars(c,true);if(c.kind==='bomb')fuseGlow(c);}
}
function castText(){
  const ol='#140a18',sc=W>=300?2:1;
  O5('MEET THE CRITTERS',W/2,Math.round(H*.17),GR.cyan,sc,'c',0,ol);
  for(const vh of CAST){if(vh.c.delay>0)continue;const y=vh.y+Math.round(7*U)+2;
    O3(KIND[vh.kind].name,vh.x,y,'#ffffff',1,'c',ol);O3(CASTTXT[vh.kind],vh.x,y+7,vh.kind==='bomb'?'#ff6a6a':vh.kind==='gold'?'#ffd84a':vh.kind==='king'?'#d8a8ff':'#a8ecff',1,'c',ol);}
}

/* ---------- 9.14 results: tally, then a ticket strip spits out of the slot ----------
   A host mole pops up beside the board and reacts to the run: hops and cheers for a good one,
   laughs at a poor one. Same rig, same state machine, just a different director. */
const HOST=mkHole(0,0,0,0,.62,30);HOST.c=mkCritter(HOST);HOST.c.cast=true;
function layoutHost(){HOST.k=.62;HOST.x=Math.round(21*U);HOST.y=H-Math.round(10*U);holeClips(HOST);}
function hostTick(dt){const c=HOST.c;if(c.delay>0){c.delay-=dt;if(c.delay<=0)SFX.pop('mole');return;}if(c.st==='none')return;critTick(c,dt);
  S.hostT+=dt;if(S.hostT>1.5&&c.st==='up'&&S.tkDone){S.hostT=0;
    if(S.newHi||S.tickets>=25){c.snick=.75;c.H.v+=7;c.SQ.v+=5;c.EAR[0].v+=10;c.EAR[1].v+=10;SFX.combo(16);
      for(let i=0;i<14;i++)part(PK_CONF,HOST.x+rnd(-8,8)*U,HOST.y-30*U*HOST.k,rnd(-70,70)*U,rnd(-160,-70)*U,rnd(.8,1.3),1,pack(...BULB[i%5]),HOST.y+rnd(-2,4)*U);}
    else{enter(c,'laugh');SFX.laugh(1);}}}
function drawHost(){const c=HOST.c;if(c.delay>0||c.st==='none')return;
  holeBack(HOST,true);drawRig(c);compose(HOST.clip,0,0,0,0,3.6*HOST.k);toRBUF();holeXf(HOST);holeFront(HOST);if(drawPaws(c))compose(HOST.clipP,0,0,0,0,0);}
const JACKPOT=9500;
function toResults(){
  S.mode='over';S.t=0;
  S.tkBase=Math.floor(S.score/250);S.tkCombo=Math.floor(S.best/10)*2;          /* +2 for every 10 in a row */
  S.jackpot=S.score>=JACKPOT?200:0;
  S.tickets=S.tkBase+S.tkCombo+S.jackpot;
  S.newHi=S.score>S.hi&&S.score>0;if(S.newHi){S.hi=S.score;store.set('hd-'+CAB.id+'-hi',S.hi);}
  S.tkShown=0;S.scShown=0;S.tkDone=false;S.tkAcc=0;S.hostT=0;spawnCritter(HOST,'mole');HOST.c.delay=.9;
  setTrack('over');ARC.over(S.score,S.tickets);
}
function resultsTick(dt){
  if(S.t<.45)return;
  if(S.scShown<S.score){S.scShown=Math.min(S.score,S.scShown+Math.max(400,S.score)*dt/.9);if(((S.t*30)|0)%2)SFX.tick();return;}
  if(!S.tkDone){S.tkAcc+=Math.max(15,S.tickets/2.2)*dt;
    while(S.tkAcc>=1&&S.tkShown<S.tickets){S.tkAcc-=1;S.tkShown++;SFX.ticket();}
    if(S.tkShown>=S.tickets){S.tkDone=true;S.tkAcc=0;if(S.newHi||S.jackpot){SFX.win();S.lflash=.8;}else SFX.confirm();}}
}
function finishCount(){S.scShown=S.score;S.tkShown=S.tickets;S.tkDone=true;S.tkAcc=0;}
function resLayout(){const big=W>=256,pw=Math.min(W-8,Math.round(168*U)),y0=big?Math.round(9*U):4,sp=big?Math.round(8*U):7;
  return {pw,x0:Math.round(W/2-pw/2),y0,tY:y0+5,sY:y0+5+(big?16:15)+3,stY:y0+5+(big?16:15)+3+sp+3,tkY:0,sp};}
function drawResults(){
  for(let i=0;i<W*H;i++)RBUF[i]=mulC(RBUF[i],.34);
  const L=resLayout(),ph=L.stY+L.sp*3+L.sp+16-L.y0,x0=L.x0,y0=L.y0,pw=L.pw;L.tkY=L.stY+L.sp*3+2;
  /* a wooden board with planks and nails */
  rect(x0-1,y0-1,pw+2,ph+2,pack(20,10,12));rect(x0,y0,pw,ph,pack(56,32,24));
  for(let y=y0+Math.round(9*U);y<y0+ph;y+=Math.round(9*U))rect(x0,y,pw,1,pack(40,22,16));
  for(let y=y0;y<y0+ph;y++)for(let x=x0;x<x0+pw;x++){const n=NZ[y*W+x];if(n===3&&((x+y*3)&7)===0)RBUF[y*W+x]=pack(66,38,28);}   /* grain */
  rect(x0,y0,pw,1,pack(110,72,46));rect(x0,y0+ph-1,pw,1,pack(30,16,12));
  for(const [nx,ny] of [[x0+3,y0+3],[x0+pw-4,y0+3],[x0+3,y0+ph-4],[x0+pw-4,y0+ph-4]]){px(nx,ny,pack(200,196,210));px(nx+1,ny+1,pack(80,70,90));}
  /* the ticket slot and the strip hanging out of it */
  const sx=Math.round(x0+pw*.8),sY=y0+ph,sw=Math.round(26*U);rect(sx-sw/2,sY-2,sw,3,pack(12,8,12));
  const n=S.tkShown,tw=Math.max(9,Math.round(14*U)),tht=Math.max(5,Math.round(7*U)),scroll=S.tkDone?0:S.tkAcc,vis=Math.min(n,Math.ceil((H-sY)/tht)+1);
  for(let j=0;j<vis;j++){const y=Math.round(sY+(j+scroll-.6)*tht),sway=Math.round(Math.sin(S.rt*2.2+j*.6)*j*.35*U),x=Math.round(sx-tw/2+sway);if(y>H)break;
    const odd=(n-j)&1,base=odd?pack(255,122,170):pack(255,176,64);
    rect(x,y,tw,tht-1,base);rect(x,y,tw,1,addC(base,40));rect(x+1,y+tht-1,tw-2,1,pack(120,40,60));
    px(x,y+(tht>>1),pack(40,16,24));px(x+tw-1,y+(tht>>1),pack(40,16,24));
    const cx=x+(tw>>1),cy=y+(tht>>1);px(cx,cy,WHITE);px(cx-1,cy,pack(255,240,200));px(cx+1,cy,pack(255,240,200));px(cx,cy-1,pack(255,240,200));px(cx,cy+1,pack(255,240,200));}
  S._ph=ph;drawHost();
  if(NP)drawParts();
}
function resultsText(){
  const ol='#140a18',L=resLayout(),x0=L.x0,pw=L.pw,big=W>=256;L.tkY=L.stY+L.sp*3+2;
  O5('TIME UP!',W/2,L.tY,GR.volt,2,'c',.12,ol);
  O5('SCORE '+fmt(S.scShown),W/2,L.sY,'#ffffff',1,'c',0,ol);
  const acc=S.hits+S.whiffs>0?Math.round(100*S.hits/(S.hits+S.whiffs)):0,c1=x0+Math.round(8*U),c2=x0+(pw>>1)+Math.round(4*U),y=L.stY;
  O3('HITS '+S.hits,c1,y,'#ffe0a0',1,undefined,ol);O3('ACCURACY '+acc+'%',c2,y,'#ffe0a0',1,undefined,ol);
  O3('BEST COMBO '+S.best,c1,y+L.sp,'#a8ecff',1,undefined,ol);O3('KING KO '+S.kos,c2,y+L.sp,'#d8a8ff',1,undefined,ol);
  O3('BOMBS '+S.bombs,c1,y+L.sp*2,'#ff9a9a',1,undefined,ol);O3('ESCAPED '+S.esc,c2,y+L.sp*2,'#c8c0d8',1,undefined,ol);
  const tky=L.tkY+3;
  if(S.scShown>=S.score){O5('TICKETS '+S.tkShown,W/2,tky,GR.volt,1,'c',0,ol);
    if(S.tkDone){const bits=[];if(S.tkCombo)bits.push('COMBO +'+S.tkCombo);if(S.jackpot)bits.push('JACKPOT +'+S.jackpot);
      const hiNow=S.newHi&&(!bits.length||((S.rt/1.3)|0)%2===1);    /* the bonus line and the new-record line take turns */
      if(hiNow)O3('NEW HIGH SCORE!',W/2,tky+9,((S.rt*4)|0)%2?'#6aff7a':'#c8ffd0',1,'c',OL);
      else if(bits.length)O3(bits.join('  '),W/2,tky+9,S.jackpot&&((S.rt*6)|0)%2?'#ffffff':'#ffd040',1,'c',OL);}}
  if(S.tkDone&&S.t>2&&((S.rt*2)|0)%2)O3(touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-7,'#ffb040',1,'c',ol);
}

/* ---------- 9.15 text: the house bitmap fonts, rendered once per (string, style) and blitted ----------
   Drawing a 5x7 glyph is ~17 fillRects, nine times over for the outline; the title alone would be
   ~10k canvas calls a frame. Each distinct string is drawn once into a tiny canvas instead. */
const TXC=new Map();
function tcache(f,s,col,sc,it,ol){
  const key=f+s+'|'+(typeof col==='string'?col:col[3])+sc+'|'+it+'|'+(ol||'');let e=TXC.get(key);
  if(!e){const o=ol?(f===5?Math.max(1,sc>>1):1):0,tw=f===5?tw5(s,sc):tw3(s,sc),c=document.createElement('canvas');
    c.width=Math.max(1,tw+2*o+(f===5?Math.ceil(6*it*sc):0)+1);c.height=(f===5?7:5)*sc+2*o;const x=c.getContext('2d',{willReadFrequently:true});
    if(f===5){if(ol)otxt5(x,s,o,o,col,sc,undefined,it,ol);else txt5(x,s,o,o,col,sc,undefined,it);}else{if(ol)otxt3(x,s,o,o,col,sc,undefined,ol);else txt3(x,s,o,o,col,sc);}
    e={c,o,tw};if(TXC.size>500)TXC.clear();TXC.set(key,e);}
  return e;
}
function tblit(e,x,y,align){if(align==='c')x=Math.round(x-e.tw/2);else if(align==='r')x=x-e.tw;g.drawImage(e.c,x-e.o,y-e.o);}
const O5=(s,x,y,col,sc=1,align,it=0,ol='#000')=>tblit(tcache(5,s,col,sc,it,ol),x,y,align);
const O3=(s,x,y,col,sc=1,align,ol='#000')=>tblit(tcache(3,s,col,sc,0,ol),x,y,align);
const P5=(s,x,y,col,sc=1,align,it=0)=>tblit(tcache(5,s,col,sc,it,''),x,y,align);
/* ---------- 9.16 HUD, title, banners, pop-ups ---------- */
const TIERC=['#7affa0','#4fe0ff','#ffd040','#ff5ab4'],OL='#140a18';
function banner(s,sub,col,dur){S.ban={s,sub,col,t:0,max:dur||1.2};}
function drawHUD(){
  O5(fmt(S.score),3,3,'#ffffff',1,undefined,0,OL);
  const m=multOf(S.combo)*(S.frenzy?2:1);if(m>1)O5('x'+m,3,12,m>=8?GR.pink:m>=4?GR.volt:GR.cyan,1,undefined,0,OL);
  const ts=Math.max(0,Math.ceil(S.time)),urg=S.time<=10&&S.mode==='play',tsc=W>=320?3:2;
  if(!(urg&&S.time<=5&&((S.time*4)|0)%2===0))O5(String(ts),W/2,2,urg?GR.red:GR.volt,tsc,'c',0,OL);
  if(S.frenzy&&S.mode==='play'&&((S.rt*3)|0)%2)O3('FRENZY x2',W/2,4+7*tsc,'#ff6ac4',1,'c',OL);
  const segW=Math.max(2,Math.round(3.2*U)),segH=Math.max(2,Math.round(3*U)),n=8,bw=n*segW+(n-1),bx=W-3-bw,by=11;
  O3('COMBO '+S.combo,W-3,3,S.combo>=8?TIERC[Math.min(3,Math.floor(S.combo/8))]:'#d8d0f0',1,'r',OL);
  const tier=Math.min(3,Math.floor(S.combo/8)),fill=S.combo>=24?8:S.combo%8;
  g.fillStyle=OL;g.fillRect(bx-1,by-1,bw+2,segH+2);
  for(let i=0;i<n;i++){g.fillStyle=i<fill?TIERC[tier]:'#2c2440';g.fillRect(bx+i*(segW+1),by,segW,segH);}
  if(S.comboT>0&&S.combo>0){g.fillStyle=TIERC[tier];g.fillRect(bx,by+segH+2,Math.max(1,Math.round(bw*S.comboT/2.6)),1);}
}
const LOGO=CAB.title.split('').map(()=>({y:0,v:0,rest:false}));
function logoDrop(){LOGO.forEach((l,i)=>{l.y=-(36+i*7)*U;l.v=0;l.rest=false;});}
function logoTick(dt){const gr=620*U;LOGO.forEach((l,i)=>{
  if(l.rest){if(Math.abs(frac(S.rt/4.2)-i*.018)<.004)l.v=-92*U,l.rest=false;else return;}     /* a hop ripples along the logo */
  l.v+=gr*dt;l.y+=l.v*dt;if(l.y>0){l.y=0;if(l.v>40*U){l.v*=-.42;}else{l.v=0;l.rest=true;}}});}
const HINTS=['CLICK OR TAP THE CRITTERS','KEYS 1-9, OR ARROWS AND SPACE','HARDHATS TAKE TWO HITS','GOLDIES ARE FAST: '+KIND.gold.pts+' POINTS','NEVER HIT A BOMB!','THE KING RULES THE LAST 10 SECONDS','CHAIN HITS FOR A BIGGER MULTIPLIER'];
function drawTitle(){
  const sc=W>=300?3:2,s=CAB.title,w=tw5(s,sc),y0=Math.round(4*U)+2;let x=Math.round(W/2-w/2);
  for(let i=0;i<s.length;i++){const ch=s[i];if(ch!==' '){const dy=Math.round(LOGO[i].y);P5(ch,x+1,y0+dy+Math.max(2,sc),'#3a0c30',sc);O5(ch,x,y0+dy,i<5?GR.volt:GR.pink,sc,undefined,0,OL);}x+=6*sc;}
  O3('WHACK THE CRITTERS',W/2,y0+7*sc+5,'#e8dcff',1,'c',OL);
  O3('HI '+fmt(S.hi),W-3,H-16,'#9890b0',1,'r',OL);
  O3(HINTS[Math.floor(S.rt/2.8)%HINTS.length],W/2,H-17,'#c8f0ff',1,'c',OL);
  if(((S.rt*2)|0)%2)O5(touchy?'TAP TO PLAY':pads().length?'PRESS START':'CLICK OR PRESS SPACE',W/2,H-9,GR.volt,1,'c',0,OL);
}
function drawBanner(){const b=S.ban;if(!b)return;const sc=W>=300?3:2,ti=b.t/b.max,sl=ti<.12?1-ti/.12:ti>.88?-(ti-.88)/.12:0,e=sl*sl*sl,y=Math.round(H*.36);
  const x=Math.round(W/2+e*W);g.fillStyle='rgba(10,4,16,.55)';g.fillRect(0,y-4,W,7*sc+8+(b.sub?9:0));
  O5(b.s,x,y,b.col,sc,'c',.12,OL);if(b.sub)O3(b.sub,x,y+7*sc+3,'#ffffff',1,'c',OL);}
function drawPops(){for(const p of POPS){if(!p.on)continue;const f=p.t/p.max;if(f>.72&&((p.t*20)|0)%2)continue;
  const x=Math.round(p.x),y=Math.round(p.y);
  if(p.big===2)O5(p.s,x,y,p.col,(W>=300?2:1)+(p.t<.07?1:0),'c',0,OL);
  else if(p.big===1)O5(p.s,x,y,p.col,(W>=300?2:1)+(p.t<.06?1:0),'c',.15,OL);
  else O3(p.s,x,y,p.col,1,'c',OL);}}
function drawCount(){if(S.t<.35){O5('GET READY',W/2,Math.round(H*.4),GR.cyan,W>=300?2:1,'c',0,OL);return;}
  const n=3-Math.floor((S.t-.35)/.6),ph=frac((S.t-.35)/.6),sc=(W>=300?5:4)+(ph<.1?1:0);if(n>=1)O5(String(n),W/2,Math.round(H*.36),GR.volt,sc,'c',0,OL);}

/* ---------- 9.17 render ---------- */
function fuseGlow(c){const f=.6+.4*Math.sin(S.rt*40);glow(c.fuseX,c.fuseY,4.5*U*c.hole.k,[255,170,60],f);px(c.fuseX,c.fuseY,WHITE);}
function drawBurrow(h){
  const c=h.c,vis=c.st!=='none',tc=c.kind==='bomb'?REDC:SOOTC,ta=c.kind==='bomb'?c.red*.75:c.soot*.65;
  drawHoleBack(h);
  const rimY=Math.ceil(h.y+HRY*h.k*U);
  if(vis){dizzyStars(c,false);YCLIP=rimY;drawRig(c);YCLIP=1e9;compose(h.clip,0,tc,ta,c.kind==='gold'?S.rt*.9:0,3.6*h.k);}
  drawHoleFront(h);
  if(vis){YCLIP=rimY+Math.ceil(4.6*h.k*U);const pw=drawPaws(c);YCLIP=1e9;if(pw)compose(h.clipP,0,tc,ta,0,0);dizzyStars(c,true);if(c.kind==='bomb')fuseGlow(c);}
}
function impactFrame(){
  const k=reduce?.6:.2;for(let i=0;i<W*H;i++)RBUF[i]=mulC(RBUF[i],k);
  const c=HIT;if(c.st!=='none'){drawRig(c);compose(c.hole.clip,1,0,0,0,0);if(drawPaws(c))compose(c.hole.clipP,1,0,0,0,0);}
  ML.sc=malletSc();drawSmear(1);drawMallet(1);
}
function frenzyEdge(){const p=.55+.45*Math.sin(S.rt*9),d=Math.max(3,Math.round(7*U));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const e=Math.min(x,y,W-1-x,H-1-y);if(e>=d){x=W-1-d;continue;}const f=(1-e/d)*p;addPx(y*W+x,80*f,8*f,60*f);}}
const KPB=[],KPS=[];
function render(){
  GPI=0;FXT=S.rt;
  RBUF.set(BG);drawSky();
  if(S.mode==='title'||S.mode==='cast')drawFireflies();
  for(let i=0;i<9;i++)drawBurrow(HOLES[i]);
  drawDebris();drawParts();
  if(S.impF>0&&HIT!==null&&S.mode!=='cast'&&S.mode!=='over')impactFrame();
  else if(S.mode!=='over'&&S.mode!=='cast'){drawMalletShadow();drawMallet(0);}
  if(S.mode!=='cast')drawBurst();
  if(S.flash>0&&!reduce){const f=Math.min(1,S.flash);for(let i=0;i<W*H;i++)addPx(i,130*f,84*f,40*f);}
  if(S.frenzy&&(S.mode==='play'||S.mode==='end'))frenzyEdge();
  if(!reduce&&S.shake>0){const a=S.shake*5*U;shiftBuf(Math.round((Math.random()-.5)*2*a),Math.round((Math.random()-.5)*2*a),pack(8,6,12));}
  if(S.mode==='cast')drawCast();
  if(S.mode==='over')drawResults();
  commit();
  /* text and HUD through the 2D context */
  if(S.mode==='play'||S.mode==='ready'||S.mode==='end')drawHUD();
  if(S.mode!=='cast'&&S.mode!=='over')drawPops();
  if(S.mode==='ready')drawCount();
  if(S.mode==='title')drawTitle();
  if(S.mode==='cast')castText();
  if(S.mode==='over')resultsText();
  if(S.mode!=='cast'&&S.mode!=='over'&&!(S.mode==='title'&&S.ban&&S.ban.s==='FRENZY!'))drawBanner();
  if(S.paused){g.fillStyle='rgba(6,2,12,.62)';g.fillRect(0,0,W,H);O5('PAUSED',W/2,Math.round(H*.36),GR.steel,2,'c',0,OL);O3(touchy?'TAP TO RESUME':'CLICK OR ESC TO RESUME',W/2,Math.round(H*.36)+20,'#c8c0e0',1,'c',OL);}
  /* phone keypad lights up under critters, like the real cabinet's buttons */
  if(KPB.length&&!$('kp').hidden)for(let i=0;i<9;i++){const c=HOLES[i].c,s=(S.mode==='play'||S.mode==='ready')&&hittable(c)?c.kind:'';if(KPS[i]!==s){KPS[i]=s;KPB[i].dataset.s=s;}}
  cv.classList.toggle('nocur',!PTR.touch&&PTR.on&&PTR.x>=0&&PTR.y>=0&&PTR.x<W&&PTR.y<H&&(S.mode==='play'||S.mode==='ready')&&!S.paused);
}

/* ---------- 9.18 modes and input ---------- */
function newRun(demo){
  Object.assign(S,{t:0,score:0,time:demo?37:45,combo:0,comboT:0,best:0,hits:0,whiffs:0,esc:0,bombs:0,kos:0,frenzy:false,kingT:0,kingN:0,spawnT:.7,stop:0,impF:0,
    shake:0,flash:0,demo,tickets:0,newHi:false,jackpot:0,ban:null,lastHole:-1,lastSec:0,cnt:-1});
  for(const h of HOLES){const c=h.c;c.st='none';c.cool=0;c.stars=0;c.paw=0;c.red=0;h.rus=0;h.scorch=0;h.lit=0;}
  NP=0;for(const p of POPS)p.on=false;DEB.length=0;
  ML.ph='hover';ML.TH.x=UPA;ML.TH.v=0;ML.thPrev=UPA;ML.stun=0;ML.soot=0;ML.qd=false;ML.SQ.x=0;ML.burst=0;HIT=null;
  aiReset();
}
function APP_start(){
  newRun(false);S.mode='ready';S.paused=false;$('pauseBtn').textContent='Pause';setTrack('play');SFX.confirm();
  ML.vis=1;if(PTR.on&&!PTR.touch){ML.mode='ptr';ML.inX=PTR.x;ML.inY=PTR.y;}else{ML.mode='cell';ML.cell=4;ML.PX.x=ML.x=cellX(4);ML.PY.x=ML.y=cellY(4);}
}
function APP_attract(){newRun(true);S.mode='title';S.paused=false;$('pauseBtn').textContent='Pause';setTrack('title');logoDrop();}
function endGame(){
  S.mode='end';S.t=0;banner('TIME UP!','',GR.volt,1.5);SFX.whistle();
  for(const h of HOLES){const c=h.c;if(c.st==='rustle')enter(c,'none');else if(hittable(c)||c.st==='pop'||c.st==='up')enter(c,'duck');}
}
function timer(dt){
  S.time-=dt;
  if(!S.frenzy&&S.time<=10&&S.time>0){S.frenzy=true;S.kingT=.6;S.lflash=.6;banner('FRENZY!','WHACK THE KING',GR.pink,1.3);if(!S.demo)setTrack('frenzy');if(!S.demo)SFX.fanfare();}
  if(S.mode==='play'){const sec=Math.ceil(S.time);if(sec!==S.lastSec){S.lastSec=sec;if(sec<=5&&sec>0)SFX.tick();}if(S.time<=0){S.time=0;endGame();}}
}
function sim(dt,live){
  if(S.stop>0){S.stop--;if(S.impF>0)S.impF--;if(S.flash>0)S.flash-=dt*3;if(live)timer(dt);return;}     /* hit-stop: the world freezes, the clock (and the flash) do not */
  S.impF=0;
  if(live){timer(dt);if(S.mode==='play'||S.demo)spawner(dt);}
  if(S.comboT>0){S.comboT-=dt;if(S.comboT<=0)S.combo=0;}
  const cur=ML.vis&&ML.mode==='cell'&&(S.mode==='play'||S.mode==='ready');
  for(const h of HOLES){critTick(h.c,dt);h.rus*=.85;if(h.scorch>0)h.scorch=Math.max(0,h.scorch-dt*.35);h.jx=h.rus>.1?Math.sin(S.rt*58+h.idx*2)*.7*h.rus:0;
    h.lit=clamp(h.lit+((cur&&ML.cell===h.idx)?dt*10:-dt*6),0,1);}
  partTick(dt);debTick(dt);popTick(dt);
  if(S.demo||S.auto)aiTick(dt);
  malletTick(dt);
  if(S.shake>0)S.shake=Math.max(0,S.shake-dt*1.8);if(S.flash>0)S.flash-=dt*3;
  if(S.ban){S.ban.t+=dt;if(S.ban.t>S.ban.max)S.ban=null;}
}
const KR=[0,0,0,0],KPQ=[];
function gpBtn(k){for(const p of pads())if(p.buttons[k]&&p.buttons[k].pressed)return true;return false;}
function stepCell(j){if(ML.mode!=='cell'){toCell(nearestCell(ML.x,ML.y));return;}let col=ML.cell%3,row=(ML.cell/3)|0;
  if(j===0)col=Math.max(0,col-1);else if(j===1)col=Math.min(2,col+1);else if(j===2)row=Math.max(0,row-1);else row=Math.min(2,row+1);toCell(row*3+col);SFX.select();}
function anyDigit(){for(let d=1;d<=9;d++)if(LATCH.has('Digit'+d)||LATCH.has('Numpad'+d))return true;return false;}
function clearDigits(){for(let d=1;d<=9;d++){LATCH.delete('Digit'+d);LATCH.delete('Numpad'+d);}}
function gameInput(c,e,dt){
  if(PTR.last!==S.plast){S.plast=PTR.last;if(PTR.on&&!PTR.touch){ML.mode='ptr';ML.inX=PTR.x;ML.inY=PTR.y;ML.vis=1;}}
  if(PTR.touch&&PTR.down&&ML.mode==='ptr'){ML.inX=PTR.x;ML.inY=PTR.y;}
  if(PTR.pressed){ML.mode='ptr';ML.inX=PTR.x;ML.inY=PTR.y;ML.vis=1;swing(-1,PTR.x,PTR.y);}
  for(let d=1;d<=9;d++){const a='Digit'+d,b='Numpad'+d;if(LATCH.has(a)||LATCH.has(b)){LATCH.delete(a);LATCH.delete(b);const i=NUMPAD[d];toCell(i);swing(i,0,0);}}   /* consume: one press, one swing */
  while(KPQ.length){const i=KPQ.shift();toCell(i);swing(i,0,0);}
  const st=[K('ArrowLeft')||K('KeyA')||gpBtn(14),K('ArrowRight')||K('KeyD')||gpBtn(15),K('ArrowUp')||K('KeyW')||gpBtn(12),K('ArrowDown')||K('KeyS')||gpBtn(13)];
  for(let j=0;j<4;j++){if(st[j]){if(KR[j]===0){stepCell(j);KR[j]=-.26;}else{KR[j]+=dt;if(KR[j]>=.1){KR[j]=1e-4;stepCell(j);}}}else KR[j]=0;}
  let ax=0,ay=0;for(const p of pads()){const lx=p.axes[0]||0,ly=p.axes[1]||0;if(lx*lx+ly*ly>ax*ax+ay*ay){ax=lx;ay=ly;}}   /* analog stick = absolute 3x3 selector */
  const mag=Math.hypot(ax,ay);
  if(mag>.5){const cc=(ax<-.38?0:ax>.38?2:1)+3*(ay<-.38?0:ay>.38?2:1);if(cc!==ML.cell||ML.mode!=='cell')toCell(cc);S.stick=1;}
  else if(S.stick&&mag<.25){S.stick=0;toCell(4);}
  if(e.a||e.ok){if(ML.mode!=='cell')toCell(nearestCell(ML.x,ML.y));swing(ML.cell,0,0);}
}
const UIP={};
function setPause(on){if(S.mode!=='play'&&S.mode!=='ready')on=false;S.paused=on;$('pauseBtn').textContent=on?'Resume':'Pause';}
function tick(dt){
  const c=readCtl(),e={};for(const k of ['ok','back','pause','a','start']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const tap=PTR.pressed,kp=KPQ.length>0;
  S.rt+=dt;if(S.lflash>0)S.lflash-=dt;
  if(LATCH.has('KeyM')){LATCH.delete('KeyM');toggleSound();}
  switch(S.mode){
  case 'title':case 'cast':
    S.t+=dt;logoTick(dt);
    if(e.ok||e.a||e.start||tap||kp||anyDigit()){KPQ.length=0;clearDigits();APP_start();return;}
    if(e.back&&EMBED){ARC.exit();return;}
    if(S.mode==='title'&&S.t>15){S.mode='cast';S.t=0;castStart();}else if(S.mode==='cast'&&S.t>9.5){S.mode='title';S.t=0;}
    if(S.mode==='cast')castTick(dt);
    if(S.time<=0){const m=S.mode,t=S.t;newRun(true);S.mode=m;S.t=t;}
    sim(dt,true);break;
  case 'ready':
    if(e.pause){setPause(!S.paused);return;}if(S.paused){if(tap)setPause(false);return;}
    S.t+=dt;gameInput(c,e,dt);sim(dt,false);
    {const n=S.t<.35?-1:Math.min(3,Math.floor((S.t-.35)/.6));if(n!==S.cnt){S.cnt=n;if(n>=0&&n<3)SFX.count(1);}}
    if(S.t>=2.15){S.mode='play';S.t=0;SFX.count(0);banner('WHACK!','',GR.volt,.7);}break;
  case 'play':
    if(e.pause){setPause(!S.paused);return;}if(S.paused){if(tap)setPause(false);return;}
    S.t+=dt;gameInput(c,e,dt);sim(dt,true);ARC.score(S.score);break;
  case 'end':S.t+=dt;sim(dt,false);if(S.t>1.6)toResults();break;
  case 'over':S.t+=dt;resultsTick(dt);hostTick(dt);partTick(dt);popTick(dt);
    if(S.t>1&&(e.ok||e.a||e.start||tap||kp)){KPQ.length=0;clearDigits();if(!S.tkDone)finishCount();else if(S.t>1.8)APP_attract();}
    if(EMBED&&e.back&&S.t>1)ARC.exit();break;
  }
}
/* =====================================================================================
   10. FRAME LOOP — fixed 60 Hz simulation, render once per display frame
   ===================================================================================== */
let ACC=0,LAST=0,RUN=true;
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();          /* only clear latched taps once a tick has seen them */
  g.setTransform(1,0,0,1,0,0);render();musicTick(S.paused);present();
  if(RUN)requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%CAB.res.length);layout();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
/* the upright-phone keypad: nine lit buttons in the burrow layout */
{const kp=$('kp');for(const d of [7,8,9,4,5,6,1,2,3]){const b=document.createElement('button');b.className='kb';b.type='button';b.textContent=String(d);b.setAttribute('aria-label','Burrow '+d);const i=NUMPAD[d];
  b.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();KPQ.push(i);b.classList.add('on');try{b.setPointerCapture(e.pointerId);}catch(_){}});
  const up=()=>b.classList.remove('on');b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);
  kp.appendChild(b);KPB[i]=b;KPS[i]='';}}
LAYCB.push(portrait=>{$('pad').hidden=true;const kp=$('kp'),on=portrait&&!EMBED;kp.hidden=!on;
  if(on){const top=RECT.y+RECT.h+40,kb=Math.max(52,Math.min(96,(innerWidth-64)/3,(innerHeight-top-24)/3.4)),gap=Math.round(kb*.2),spare=innerHeight-top-24-(kb*3+gap*2);
    document.body.style.setProperty('--kb',kb+'px');document.body.style.setProperty('--kg',gap+'px');kp.style.top=(top+Math.max(0,spare*.4))+'px';}});
RESCB.push(()=>{U=W/256;LC=new Uint32Array(W*H);LST=new Int32Array(W*H);STAMP=1;NZ=new Uint8Array(W*H);
  const r=mulberry(5);for(let i=0;i<W*H;i++)NZ[i]=(r()*4)|0;layoutHoles();layoutCast();layoutHost();bakeBG();});
$('brand').firstChild.textContent=CAB.brand;$('brand').querySelector('span').textContent=CAB.sub;$('keys').innerHTML=CAB.keys;document.title='Whack Shack';
if(!gl)$('err').style.display='grid';
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();APP_attract();
ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
/* test hook (stripped from the published build): fast-forward, drive and time the cabinet */
window.__game={S,KEY,LATCH,PTR,TS,ML,AI,HOLES,KIND,CAST,KPQ,tick,render,present,ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,setRes,setPause,spawn(i,k){spawnCritter(HOLES[i],k);},enter,halt(){RUN=false;},flush(){g.getImageData(0,0,1,1);},rect:()=>RECT,snap(){g.setTransform(1,0,0,1,0,0);render();return mc.toDataURL();},bench(n,np){n=n||120;const T=[],R=[],P=[];for(let i=0;i<n;i++){const a=performance.now();tick(1/60);const b=performance.now();g.setTransform(1,0,0,1,0,0);render();g.getImageData(0,0,1,1);const c=performance.now();if(!np){present();if(gl)gl.finish();}const d=performance.now();endInputFrame();T.push(b-a);R.push(c-b);P.push(d-c);}const q=(A,f)=>{const s=A.slice().sort((x,y)=>x-y);return +s[Math.min(s.length-1,Math.floor(s.length*f))].toFixed(3);},m=A=>+(A.reduce((x,y)=>x+y,0)/A.length).toFixed(3);return {tick:m(T),tickP50:q(T,.5),tickP95:q(T,.95),render:m(R),renderP50:q(R,.5),renderP95:q(R,.95),renderMax:q(R,1),present:m(P),presentP50:q(P,.5)};}};
requestAnimationFrame(frame);
})();
