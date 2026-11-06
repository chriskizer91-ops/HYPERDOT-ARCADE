/* =====================================================================================
   31. HUD — an LED dot-matrix strip at the top (time, credits, tickets), the strength meter on the left, big LED
   messages in the middle. Drawn on one 2-D canvas over the 3-D view; text is cached per string.
   ===================================================================================== */
const HUD={cv:null,g:null,w:0,h:0,dpr:1,pops:[],cache:new Map()};
function hudInit(){HUD.cv=$('hud');HUD.g=HUD.cv.getContext('2d');hudResize();}
function hudResize(){if(!HUD.cv)return;HUD.dpr=Math.min(2,devicePixelRatio||1);HUD.w=innerWidth;HUD.h=innerHeight;HUD.cv.width=Math.round(HUD.w*HUD.dpr);HUD.cv.height=Math.round(HUD.h*HUD.dpr);HUD.cache.clear();}
function hudPop(txt,col){HUD.pops.push({txt,col,t:0});}
/* a string as LED dots: 5x7 glyphs, each lit pixel a round dot with a faint glow; unlit dots faintly visible */
function ledText(str,dot,col,ghost){
  const key=str+'|'+dot+'|'+col+'|'+(ghost?1:0);let c=HUD.cache.get(key);if(c)return c;
  if(HUD.cache.size>300)HUD.cache.clear();
  const tw=tw5(str,1),th=7,pad=2,cw=Math.ceil((tw+pad*2)*dot),ch=Math.ceil((th+pad*2)*dot);
  const src=document.createElement('canvas');src.width=tw+1;src.height=th;txt5(src.getContext('2d'),str,0,0,'#fff',1);
  const d=src.getContext('2d').getImageData(0,0,src.width,th).data;
  c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d');
  const r=dot*.42;g.fillStyle=col;g.shadowColor=col;g.shadowBlur=dot*1.2;
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const on=d[(y*src.width+x)*4+3]>128;if(!on)continue;g.beginPath();g.arc((x+pad+.5)*dot,(y+pad+.5)*dot,r,0,TAU);g.fill();}
  if(ghost){g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.06)';for(let y=0;y<th;y++)for(let x=0;x<tw;x++){if(d[(y*src.width+x)*4+3]>128)continue;g.beginPath();g.arc((x+pad+.5)*dot,(y+pad+.5)*dot,r*.8,0,TAU);g.fill();}}
  c.pw=pad*dot;HUD.cache.set(key,c);return c;
}
function led(str,x,y,dot,col,al,ghost){const c=ledText(str,dot*HUD.dpr,col,ghost),g=HUD.g,w=c.width,h=c.height,p=c.pw;
  let X=x*HUD.dpr;if(al==='c')X-=w/2;else if(al==='r')X-=w-p;else X-=p;g.drawImage(c,Math.round(X),Math.round(y*HUD.dpr-p));}
/* a big LED message on a dark plate, so it reads over any back wall */
function ledBig(str,x,y,dot,col){const w=tw5(str)*dot+dot*8,h=dot*11;panel(x-w/2,y-dot*2,w,h,dot*2);led(str,x,y,dot,col,'c');}
function panel(x,y,w,h,r){const g=HUD.g,k=HUD.dpr;g.beginPath();g.roundRect(x*k,y*k,w*k,h*k,r*k);g.fillStyle='rgba(10,6,14,.72)';g.fill();g.strokeStyle='rgba(255,210,140,.22)';g.lineWidth=k;g.stroke();}
function hudDraw(dt){
  const g=HUD.g;if(!g)return;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,HUD.cv.width,HUD.cv.height);
  const W=HUD.w,H=HUD.h,small=W<520,top=Math.max(8,SAFE.top+6);
  /* the top strip */
  const sw=Math.min(W-20,small?W-20:520),sx=(W-sw)/2,sh=small?30:34,d=small?2.6:3;
  panel(sx,top,sw,sh,10);
  const ty=top+(sh-7*d)/2;
  if(S.mode==='play'){
    const tm=Math.ceil(M.timer),urg=M.timer<10&&(M.ph==='aimX'||M.ph==='aimZ');
    led('TIME',sx+12,ty,d*.75,'#b8a4d8');led(String(tm).padStart(2,'0'),sx+12+tw5('TIME')*d*.75+8,ty,d,urg&&(S.t*4|0)%2?'#ff4a4a':'#ffd040');
    let cx=W/2-((MC.credits-1)*14)/2;for(let i=0;i<MC.credits;i++){const used=i<S.credit-1,cur=i===S.credit-1;
      g.beginPath();g.arc((cx+i*14)*HUD.dpr,(top+sh/2)*HUD.dpr,4.2*HUD.dpr,0,TAU);g.fillStyle=used?'#3a2a40':cur?((S.t*3|0)%2?'#ffd040':'#ff9a10'):'#ffd040';g.fill();}
    led(fmt(S.tickets),sx+sw-12,ty,d,'#ffd040','r');led('TIX',sx+sw-12-tw5(fmt(S.tickets))*d-8,ty,d*.75,'#b8a4d8','r');
  }else{
    led('HI '+fmt(S.hi),sx+12,ty,d*.75,'#b8a4d8');led(S.mode==='over'?MC.name:'PLUSH PANIC 3D',W/2,ty,d*.8,S.mode==='over'?MC.col:'#ff6ac0','c');led(S.mode==='over'?'THANKS':'FREE',sx+sw-12,ty,d*.75,'#b8a4d8','r');
  }
  /* strength meter (and grip while holding) on the left */
  if(S.mode==='play'&&!SHOW.cur){
    const mh=Math.min(170,H*.32),mx=Math.max(10,SAFE.left+10),my=H*.5-mh/2,seg=10,v=M.ph==='roll'?M.roll:M.S,on=Math.round(v*seg);
    panel(mx-6,my-26,34,mh+52,9);led('STR',mx+11,my-20,1.6,'#c8ffd0','c');
    for(let s=0;s<seg;s++){const t=s/(seg-1),yy=my+mh-(s+1)*(mh/seg),c=s<on?`hsl(${t*120},95%,58%)`:'rgba(255,255,255,.07)';g.fillStyle=c;g.beginPath();g.roundRect((mx)*HUD.dpr,(yy+2)*HUD.dpr,22*HUD.dpr,(mh/seg-4)*HUD.dpr,3*HUD.dpr);g.fill();}
    led(Math.round(v*100)+'%',mx+11,my+mh+8,1.6,'#ffffff','c');
    if(M.ph==='grab'||M.ph==='lift'||M.ph==='carry'){const gx=mx+40,gv=Math.round(CL.grip*seg);panel(gx-6,my-26,34,mh+52,9);led('GRIP',gx+11,my-20,1.4,'#a6f3ff','c');
      for(let s=0;s<seg;s++){const yy=my+mh-(s+1)*(mh/seg);g.fillStyle=s<gv?'#5ad8ff':'rgba(255,255,255,.07)';g.beginPath();g.roundRect(gx*HUD.dpr,(yy+2)*HUD.dpr,22*HUD.dpr,(mh/seg-4)*HUD.dpr,3*HUD.dpr);g.fill();}}
    /* what to do now, under the strip */
    let pr='';if(!S.demo){if(M.ph==='aimX')pr=touchy?'DRAG OR HOLD GO':'HOLD SPACE OR > TO MOVE';else if(M.ph==='aimZ')pr=touchy?'DEPTH: DRAG OR HOLD GO':'DEPTH: HOLD SPACE OR UP';
      else if(M.ph==='drop')pr='DROP!';else if(M.ph==='grab')pr='GRAB!';else if(M.ph==='lift'||M.ph==='carry')pr=CL.grip>.05?'HOLD ON...':'';}
    if(pr)led(pr,W/2,top+sh+10,small?1.7:2,'#ffffff','c');
    if(M.ph==='roll'){const big=small?4:6,cy=H*.3;ledBig('CREDIT '+S.credit,W/2,cy,big,'#ffd040');const pc=Math.round(M.roll*100);
      ledBig('STRENGTH '+pc+'%',W/2,cy+big*10,big*.55,pc>75?'#6aff5a':pc>55?'#ffd040':'#ff5a5a');
      if(S.credit===MC.credits&&S.prizes.length===0&&M.S>=MC.boost)led('LAST CHANCE BOOST',W/2,cy+big*16,big*.4,'#6aff5a','c');}
    if(M.msgT>0&&M.msg){const big=small?3.4:5;ledBig(M.msg,W/2,H*.34,big,M.msg==='TIME!'?'#ff4a4a':'#ff6ac0');}
    if(M.ph==='result'&&M.wins.length&&S.demo&&((S.winT*6|0)%2||S.winT>1)){const big=small?4.5:7;ledBig(M.wins.some(b=>b.T.rar===4)?'JACKPOT!':'WINNER!',W/2,H*.24,big,'#ffd040');
      ledBig(M.wins.map(b=>b.T.name).join(' + '),W/2,H*.24+big*10,big*.45,RAR[M.wins[0].T.rar].c);}
  }
  /* title: the machine's marquee is the big sign; the game's name and the prompt sit low, under the case */
  /* title: the machine in front of you, which of the three it is, and how hard */
  if(S.mode==='title'){const big=small?3.4:4.4,y=H*(small?.835:.8),pw=Math.min(W*.9,560);panel(W/2-pw/2,y-big*5.5,pw,big*29,14);
    const n=MORDER.length,i=MORDER.indexOf(MC.id);for(let k=0;k<n;k++){g.beginPath();g.arc((W/2+(k-(n-1)/2)*16)*HUD.dpr,(y-big*2.6)*HUD.dpr,(k===i?4.2:3)*HUD.dpr,0,TAU);g.fillStyle=k===i?MC.col:'rgba(255,255,255,.25)';g.fill();}
    led(MC.name,W/2,y,big,MC.col,'c');
    const lc=MC.level==='EASY'?'#6aff5a':MC.level==='HARD'?'#ff5a5a':'#ffd040';
    led(MC.sub+' . '+MC.what,W/2,y+big*9.5,big*.42,'#e8dcc8','c');led(MC.level,W/2,y+big*14,big*.42,lc,'c');
    if((S.t*2|0)%2)led(touchy?'TAP TO PLAY':'PRESS START',W/2,y+big*19.2,big*.56,'#ffd040','c');}
  if(S.mode==='over'){const big=small?4:6,y=H*(small?.29:.2);ledBig(S.prizes.length?'YOUR HAUL':'GAME OVER',W/2,y,big,S.prizes.length?'#ffd040':'#ff6ac0');
    const ls=big*8.5,tz=big*7.5;S.prizes.slice(0,6).forEach((id,i)=>{const T=CAST[id],yy=y+big*10+i*ls,txt=T.name+'  +'+T.tix,tw=tw5(txt)*big*.45,x0=W/2-(tw+tz+8)/2;
      panel(x0-6,yy-tz*.4,tw+tz+20,tz*1.05,8);const th=thumbOf(T);if(th)g.drawImage(th,x0*HUD.dpr,(yy-tz*.35)*HUD.dpr,tz*HUD.dpr,tz*HUD.dpr);led(txt,x0+tz+8,yy,big*.45,RAR[T.rar].c);});
    if(S.prizes.length>6)led('+ '+(S.prizes.length-6)+' MORE',W/2,y+big*10+6*ls,big*.4,'#c8c0e0','c');
    if(!S.prizes.length)ledBig('NO PRIZE THIS TIME',W/2,y+big*10,big*.45,'#c8c0e0');
    const yy=Math.max(H*.62,y+big*10+Math.min(7,S.prizes.length)*big*8.5+big*2);ledBig('TICKETS '+fmt(S.tShown||0),W/2,yy,big*.6,'#ffd040');ledBig('SCORE '+fmt(S.score),W/2,yy+big*7,big*.45,'#ffffff');
    if(S.newHi&&(S.t*4|0)%2)led('NEW HIGH SCORE',W/2,yy+big*11,big*.4,'#6aff5a','c');
    if(S.t>2.5&&(S.t*2|0)%2)led(touchy?'TAP TO CONTINUE':'PRESS START',W/2,H*.88,small?2.4:3,'#ffb040','c');}
  showHud(W,H,small);
  /* pop-up text */
  for(const p of HUD.pops){p.t+=dt;const a=p.t<.15?p.t/.15:p.t>1.2?1-(p.t-1.2)/.4:1;if(a<=0)continue;g.globalAlpha=clamp(a,0,1);led(p.txt,W/2,H*.44-p.t*30,small?2.6:3.4,p.col,'c');g.globalAlpha=1;}
  HUD.pops=HUD.pops.filter(p=>p.t<1.6);
  if(S.paused){g.fillStyle='rgba(5,3,10,.45)';g.fillRect(0,0,HUD.cv.width,HUD.cv.height);}
}
