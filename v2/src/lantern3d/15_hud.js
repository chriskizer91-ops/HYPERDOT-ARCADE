/* =====================================================================================
   24. THE HUD AND THE SCREENS — the original's dot-matrix lettering, laid over the 3D view.
       The matrix is about 192 dots across in landscape (128 on a phone held upright), each dot
       a few pixels wide, so the lettering stays the same size of dot whatever the screen.
   ===================================================================================== */
const HUD={pitch:6,ox:0,oy:0,narrow:false,portrait:false,bot:96,callY:11};
function layoutHud(){const cw=R3.cssW,ch=R3.cssH,portrait=ch>cw*1.05;
  const pitch=portrait?clamp(cw/128,2.6,5):clamp(cw/192,3,6.2),w=Math.max(96,Math.floor(cw/pitch)),h=Math.max(60,Math.floor(ch/pitch));
  HUD.pitch=pitch;HUD.ox=(cw-w*pitch)/2;HUD.oy=(ch-h*pitch)/2;HUD.narrow=w<170;HUD.portrait=portrait;if(w!==W||h!==H)hudAlloc(w,h);
  document.body.style.setProperty('--hudtop',Math.round(HUD.oy+(HUD.narrow?13:8)*pitch)+'px');
  /* on a touch screen the stick and the buttons take the bottom: text that sits at the bottom moves above them */
  const padPx=touchy?Math.min(150,Math.min(cw,ch)*(portrait?.36:.34))+34:0;HUD.bot=touchy?Math.max(40,h-Math.ceil(padPx/pitch)):h;
  HUD.callY=HUD.narrow?26:touchy&&!EMBED?18:11;}
/* a point of the town in HUD dots */
function toHud(x,y,z){const s=worldToScreen(x,y,z);return [(s[0]-HUD.ox)/HUD.pitch,(s[1]-HUD.oy)/HUD.pitch,s[3]];}
const fitTxt3=(s,w)=>tw3(s)<=w;
/* text that is too wide for a narrow screen breaks at its spaces */
function txt3w(s,x,y,v,align,step){if(fitTxt3(s,W-4)){txt3(s,x,y,v,align);return 1;}const words=s.split(' '),lines=[];let cur='';
  for(const wd of words){const t=cur?cur+' '+wd:wd;if(tw3(t)>W-4&&cur){lines.push(cur);cur=wd;}else cur=t;}if(cur)lines.push(cur);lines.forEach((l,i)=>txt3(l,x,y+i*(step||7),v,align));return lines.length;}
function otxt5f(s,x,y,v,sc,align){if(tw5(s,sc)>W-4&&sc>1)sc=1;if(tw5(s,1)>W-4){otxt3(s,x,y+1,v,align);return;}otxt5(s,x,y,v,sc,align);}
function drawHUD3(){
  const blink=(S.clock*4|0)&1,lowOil=P.oil<25,nar=HUD.narrow;dimRect(0,0,W,nar?12:7,.62);
  txt3('OIL',1,1,lowOil&&blink?15:9);const bw=26,n=Math.round(bw*P.oil/OIL_MAX);for(let i=0;i<bw;i++){const v=i<n?(lowOil&&blink?15:i<n-1?11:14):2;dot(14+i,1,v);dot(14+i,2,v);dot(14+i,3,v);}
  for(let k=0;k<3;k++){const on=k<P.flares;dot(44+k*4,1,on?13:2);dot(44+k*4,2,on?9:2);dot(44+k*4,3,on?9:2);}
  for(let k=0;k<Math.min(5,P.lives);k++){dot(58+k*4,1,12);dot(58+k*4,2,15);dot(57+k*4,2,7);dot(59+k*4,2,7);dot(58+k*4,3,9);}
  const nl=LAMPS.length,ly=nar?7:1,lx0=nar?Math.round(W/2-nl*2.5+1):Math.max(72,Math.round(W/2+6-nl*2.5));
  for(let k=0;k<nl;k++){const L=LAMPS[k],x=lx0+k*5,on=L.lit,v=on?15:3,y=ly;dot(x,y,v);dot(x+1,y,v);dot(x,y+1,on?12:3);dot(x+1,y+1,on?12:3);dot(x-1,y,on?5:2);dot(x+2,y,on?5:2);dot(x,y+2,on?6:4);dot(x+1,y+2,on?6:4);if(!nar){dot(x,y+3,4);dot(x+1,y+3,4);}}
  txt3(fmt(S.score),W-2,1,13,'r');
  if(BOSS.on&&!BOSS.dead){const bw2=Math.min(60,W-30),x0=Math.round(W/2-bw2/2),y0=HUD.bot-5;dimRect(x0-4,y0-8,bw2+8,12,.15);txt3('THE LONG NIGHT',W/2,y0-7,10,'c');const k=BOSS.hp/BOSS.hp0;for(let i=0;i<bw2;i++){dot(x0+i,y0,i<k*bw2?13:2);dot(x0+i,y0+1,i<k*bw2?9:2);}}
  /* where the nearest dark lamp lies, when it is off the screen */
  let tl=null,bd=1e9;for(const L of LAMPS)if(!L.lit){const d=Math.hypot(L.x-P.x,L.y-P.y);if(d<bd){bd=d;tl=L;}}
  if(tl&&!P.dead){const [sx,sy]=toHud(tl.x,tl.y,TOWN.lampsZ),top=nar?14:10;if(sx<3||sy<top||sx>W-4||sy>H-4){const a=Math.atan2(sy-H/2,sx-W/2),cx=W/2+Math.cos(a)*(W/2-5),cy=clamp(H/2+Math.sin(a)*(H/2-5),top+2,H-4);
    if(((S.clock*3)|0)&1)for(let k=0;k<4;k++){const px=cx-Math.cos(a)*k,py=cy-Math.sin(a)*k,w=3-k;for(let j=-w;j<=w;j++)dot(px+Math.cos(a+Math.PI/2)*j*.6,py+Math.sin(a+Math.PI/2)*j*.6,k===0?15:10,1);}}}
}
function drawPops3(){for(const p of S.pops){const k=p.t/1.1,[x,y]=toHud(p.x,p.y,15+k*9);txt3(p.txt,Math.round(x),Math.round(y),Math.round(13*(1-k*k)),'c',1);}}
function drawCalls3(){
  let y=HUD.callY;for(const c of S.calls){if(c.t>c.dur)continue;const reveal=Math.min(1,c.t/.18),s=c.txt,n=Math.ceil(s.length*reveal),from=Math.floor((s.length-n)/2);
    const shown=s.split('').map((ch,i)=>i>=from&&i<from+n?ch:' ').join('');const v=c.t>c.dur-.35&&((c.t*16|0)&1)?6:15;otxt5f(shown,W/2,y,v,1,'c');y+=10;}
  if(S.big){const b=S.big,a=b.t<.25?b.t/.25:b.t>2.8?(3.2-b.t)/.4:1,sc=tw5(b.title,2)<=W-6?2:1,y=Math.round(H*.3);
    dimRect(0,y-5,W,sc*7+20,.4);const v=Math.round(15*a);otxt5f(b.title,W/2,y,v,sc,'c');if(b.sub)otxt3(b.sub,W/2,y+sc*7+5,Math.round(11*a),'c');}
}
function panelBox(x,y,w,h){dimRect(x,y,w,h,.15);for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(i===0||j===0||i===w-1||j===h-1)dot(x+i,y+j,6);}
function drawTally3(){
  const T_=S.tally,w=Math.min(150,W-6),x=Math.round(W/2-w/2),h=T_.rows.length*7+26,y=Math.max(10,Math.round(H/2-h/2-6));panelBox(x,y,w,h);
  otxt5('DAWN',W/2,y+3,15,1,'c');
  T_.rows.forEach((r,i)=>{if(i>=T_.shown)return;const yy=y+14+i*7;txt3(r[0],x+5,yy,9);txt3(r[1],x+w*.62,yy,13,'c');if(r[2])txt3('+'+fmt(r[2]),x+w-5,yy,15,'r');});
  txt3('SCORE',x+5,y+h-8,11);txt3(fmt(S.score),x+w-5,y+h-8,15,'r');
  if(T_.paid>=T_.pay&&T_.shown>=T_.rows.length&&((S.clock*2|0)&1))txt3w(S.night<NIGHTS.length-1?(touchy?'TAP FOR THE NEXT NIGHT':'PRESS START: THE NEXT NIGHT'):(touchy?'TAP':'PRESS START'),W/2,Math.min(HUD.bot-6,y+h+6),12,'c');
}
function drawEntry3(y){
  const e=S.entry;if(!e)return;txt3w('A NEW HIGH SCORE. YOUR INITIALS',W/2,y,10,'c');
  for(let k=0;k<3;k++){const x=W/2-14+k*12,sel=k===e.i;txt5(ALPHA[e.ch[k]],x,y+9,sel&&((S.clock*4|0)&1)?15:sel?11:13);if(sel)for(let i=0;i<5;i++)dot(x+i,y+18,12);}
  txt3w(touchy?'STICK CHANGES  BEAM SETS':'UP DOWN CHANGE  SPACE SETS',W/2,y+23,7,'c');
}
function drawTable3(y0){
  dimRect(0,y0-5,W,66,.35);otxt5('HIGH SCORES',W/2,y0,15,1,'c');const cw=Math.min(W-20,120),x0=Math.round(W/2-cw/2);
  S.hi.forEach((r,i)=>{const y=y0+12+i*9,v=i===0?15:11;txt5((i+1)+'',x0,y,v);txt5(r[0],x0+16,y,v);txt5(fmt(r[1]),x0+cw,y,v,1,'r');});
}
const RULES3=[
  ['THE SHADES WALK IN THE DARK','LIGHT FREEZES THEM','THE BEAM BURNS THEM'],
  ['STAND BY A DARK LAMP TO LIGHT IT','LIT LAMPS FILL YOUR OIL','LIGHT THEM ALL TO CALL THE DAWN'],
  ['MOTHS DRINK OIL. SNUFFERS KILL LAMPS','A FLARE BURNS ALL THAT IS NEAR','THE OIL RUNS OUT: THE DARK TAKES YOU']];
function drawRules3(t){
  const pg=Math.min(2,Math.floor(t/3)),r=RULES3[pg],y0=Math.round(H*.18);dimRect(0,y0-6,W,58,.35);otxt5f('HOW TO KEEP THE LIGHT',W/2,y0,15,1,'c');
  let y=y0+20;r.forEach((l,i)=>{y+=txt3w(l,W/2,y,i===0?14:11,'c')*7+4;});
  txt3((pg+1)+'/3',W/2,HUD.bot-8,6,'c');
}
/* ---------- each frame's HUD, by mode ---------- */
function renderHud(dt){
  hudClear();const m=S.mode;
  if(m==='attract'){const ph=S.att.ph,tt=S.att.t;
    if(ph===0){const y=Math.round(H*.62);const a=clamp((tt-1.2)*1.5,0,1);if(a>0)otxt3('KEEP THE LIGHT',W/2,y,Math.round(13*a),'c');
      if(tt>2&&((S.clock*2|0)&1))otxt3(touchy?'TAP TO PLAY':'PRESS START',W/2,y+12,15,'c');const by=HUD.portrait?HUD.bot-8:HUD.bot-7;
      if(HUD.portrait){otxt3('HI '+fmt(S.hi[0][1]),W/2,by-8,9,'c');otxt3('HYPERDOT ARCADE',W/2,by,9,'c');}else{otxt3('HI '+fmt(S.hi[0][1]),3,by,9);otxt3('HYPERDOT ARCADE',W-3,by,9,'r');}
      otxt5('3D',W-3,3,11,1,'r');}
    else if(ph===1)drawTable3(Math.round(H*.2));else drawRules3(tt);}
  else if(m==='demo'||m==='intro'||m==='play'||m==='dying'||m==='dawn'||m==='ending'){
    if(m==='play'||m==='demo'||(m==='intro'&&S.t>3)||m==='dying'){drawPops3();drawHUD3();drawCalls3();}
    if(m==='demo'){otxt3('DEMO',W/2,HUD.bot-15,9,'c');if((S.clock*2|0)&1)otxt3(touchy?'TAP TO PLAY':'PRESS START',W/2,HUD.bot-7,14,'c');}
    if(m==='intro'){const a=clamp(S.t*2,0,1)*clamp((4.8-S.t)*2,0,1),v=Math.round(15*a),y=Math.round(H*.26);dimRect(0,y-4,W,56,.4);
      otxt3('NIGHT '+(S.night+1),W/2,y,Math.round(10*a),'c');const sc=tw5(ST.name,2)<=W-8?2:1;otxt5f(ST.name,W/2,y+8,v,sc,'c');
      let yy=y+28;ST.hint.forEach((l,i)=>{yy+=txt3w(l,W/2,yy,Math.round(11*a),'c')*7;});if(S.t>2.2)otxt3('LIGHT '+LAMPS.length+' LAMPS',W/2,yy+3,(S.clock*4|0)&1?v:Math.round(v*.6),'c');}
    if(m==='dying'&&S.t>1.8){const y=Math.round(H*.3);otxt5f('THE DARK',W/2,y,15,2,'c');otxt5('TAKES YOU',W/2,y+18,15,1,'c');otxt3(P.lives>0?P.lives+(P.lives>1?' WICKS LEFT':' WICK LEFT'):'NO WICKS LEFT',W/2,y+32,11,'c');}
    if(m==='dawn'&&S.t>1.6)drawTally3();
    if(m==='ending'){const a=clamp(S.t-1,0,1),y=Math.round(H*.16);if(S.t>1){dimRect(0,y-4,W,62,.35);otxt5f('THE LONG NIGHT',W/2,y,Math.round(15*a),2,'c');otxt5('IS OVER',W/2,y+18,Math.round(15*a),1,'c');
      otxt5(fmt(S.score),W/2,y+32,15,1,'c');otxt3(S.tickets+' TICKETS',W/2,y+42,12,'c');if(S.entry)drawEntry3(y+50);else if(S.t>3&&((S.clock*2|0)&1))otxt3(touchy?'TAP':'PRESS START',W/2,HUD.bot-7,12,'c');}}}
  else if(m==='over'){const y=Math.round(H*.12);dimRect(0,0,W,H,.55);otxt5f('GAME OVER',W/2,y,15,2,'c');otxt5(fmt(S.score),W/2,y+20,15,1,'c');otxt3(S.tickets+' TICKETS',W/2,y+30,12,'c');
    if(S.entry)drawEntry3(y+42);else{txt3('HI '+fmt(S.hi[0][1])+'  '+S.hi[0][0],W/2,y+44,9,'c');if(S.t>2.5&&((S.clock*2|0)&1))otxt3(touchy?'TAP TO CONTINUE':'PRESS START',W/2,HUD.bot-8,13,'c');}}
  if(S.paused){dimRect(0,0,W,H,.45);const y0=Math.round(H*.24);otxt5f('PAUSED',W/2,y0,15,2,'c');
    pauseItems().forEach((t,i)=>{const y=pauseRowY(i),sel=i===S.pauseI;otxt5f((sel?'> ':'  ')+t+(sel?' <':'  '),W/2,y,sel?15:7,1,'c');});}
}
const pauseRowY=i=>Math.round(H*.5)+i*11;
function pauseItems(){return ['RESUME',R3.dots?'DOTS: ON':'DOTS: OFF',EMBED?'EXIT':'QUIT TO TITLE'];}
