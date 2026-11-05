/* =====================================================================================
   23. HUD — the original's score sheet, pin diagram, hints, toasts and cards, drawn on a
       transparent W x H canvas that the renderer shows as LED dots over the 3D picture.
       W is about 256 dots across a laptop and 168 across an upright phone, so the dots stay
       big and readable on both.
   ===================================================================================== */
const sheetH=()=>H<120?13:17;   /* the strip's height; it is drawn PADT dots down */
function drawSheet(c,w,h){
  const sh=G.sheet||sheet(G.rolls),fw=Math.floor((w-4)/11.55),f10=Math.round(fw*1.45),tw=w-4-9*fw-f10,by=h<15?1:2,ty=h<15?7:10;
  const cur=G.rs&&!G.over&&S.mode!=='over'&&G.ph!=='done'?G.rs.f:-1,blink=(S.t*3|0)%2;
  c.fillStyle='rgba(6,3,16,.9)';c.fillRect(0,0,w,h+1);c.fillStyle='#3a2d70';c.fillRect(0,h,w,1);
  for(let f=0;f<10;f++){const x=2+f*fw,fwid=f<9?fw:f10,F=sh.fr[f],nc=f<9?2:3;
    if(f===cur){c.fillStyle=blink?'rgba(255,176,64,.4)':'rgba(255,176,64,.22)';c.fillRect(x+1,0,fwid-1,h);}
    c.fillStyle='#3a2d70';c.fillRect(x,0,1,h);
    for(let i=0;i<nc;i++){const cx=x+fwid-(nc-i)*5;c.fillStyle='#3a2d70';c.fillRect(cx-1,0,1,by+6);c.fillRect(cx-1,by+6,6,1);
      const m=F.m[i];if(m)txt3(c,m,cx+1,by,m==='X'?'#ff5ab4':m==='/'?'#4fe0ff':m==='-'?'#7c76a0':'#ffffff');}
    if(F.t!=null)txt3(c,String(F.t),x+Math.round(fwid/2)+1,ty,'#ffffff',1,'c');
    else if(h>=15&&tw>0&&F.m.length===0)txt3(c,String(f+1),x+Math.round(fwid/2)+1,ty,'#3a2d70',1,'c');}
  const x=2+9*fw+f10;c.fillStyle='#3a2d70';c.fillRect(x,0,1,h);c.fillRect(w-2,0,1,h);
  txt3(c,'TOT',x+Math.round(tw/2),by,'#8a80c0',1,'c');txt3(c,String(sh.total),x+Math.round(tw/2),ty,'#ffd040',1,'c');
}
function drawPinDiagram(x,y,s){const m=G.ph==='aim'||G.ph==='swing'||G.ph==='roll'?standMask(PW):G.ph==='sweep'&&PS.drop?standMask(PW):G.after;
  const rows=[[6,7,8,9],[3,4,5],[1,2],[0]];
  for(let r=0;r<4;r++)for(let j=0;j<rows[r].length;j++){const i=rows[r][j],px2=x+Math.round((j-(rows[r].length-1)/2)*s*2),py2=y+r*s;
    const up=m>>i&1,was=G.before>>i&1;g.fillStyle='#000';g.fillRect(px2-2,py2-2,4,4);
    g.fillStyle=up?'#ffffff':(was&&(G.ph==='pins'||G.ph==='tally'||G.ph==='done')?'#ff4a8a':'#2c2650');g.fillRect(px2-1,py2-1,2,2);}}
function hud(){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
  const playing=S.mode==='play',sh=sheetH();
  g.save();g.translate(0,PADT);drawSheet(g,W,sh);g.restore();
  if(PIPC.on){const p=PIPC;g.fillStyle='#ff5ab4';g.fillRect(p.x-1,p.y-1,p.w+2,1);g.fillRect(p.x-1,p.y+p.h,p.w+2,1);g.fillRect(p.x-1,p.y,1,p.h);g.fillRect(p.x+p.w,p.y,1,p.h);
    otxt3(g,'PIN CAM',p.x+2,p.y+p.h+3,'#ff9ad0');}
  const rs=G.rs||rackState(G.rolls),by=H-8;
  if(S.mode==='play'){
    if(!G.over)otxt3(g,'FRAME '+(rs.f+1)+'  BALL '+(rs.b+1),3,by,'#c8c0ff');
    if(G.mph&&G.ph!=='aim'){const sp=G.shot?G.shot.spin:0;otxt3(g,G.mph.toFixed(1)+' MPH'+(sp<-.02?'  HOOK <':sp>.02?'  HOOK >':''),3,by-8,'#ffd040');}
    drawPinDiagram(W-13,H-17-PADB,3);
  }
  if(playing&&G.ph==='aim'&&!G.auto){
    if(!touchy||G.kst)otxt3(g,(touchy?'':'SHIFT ')+'SPIN: '+SPINL[G.spinI],3,by-8,'#7ce8ff');
    const hy=PORTRAIT?Math.round(H*.8):H-38,held=GST.down&&GST.mode;
    if(!held){
      let hint=touchy?'SWIPE UP TO BOWL':'SWIPE UP, OR SPACE: SET LINE';
      if(G.kst===1)hint='SPACE: LOCK AIM';else if(G.kst===2)hint='SPACE: BOWL';
      if(G.kst===0&&!touchy)hint='< > LINE  SPACE SET  OR SWIPE UP';
      if(GST.hintT>0)hint=GST.hint;
      otxt3(g,hint,Math.round(W/2),hy,GST.hintT>0?'#ffb040':(S.t*2|0)%2||G.kst?'#ffffff':'#ffb040',1,'c');
      if(touchy&&G.rolls.length<3&&GST.hintT<=0)otxt3(g,'SLIDE TO MOVE - CURVE THE END TO HOOK',Math.round(W/2),hy+8,'#a39cb4',1,'c');
      if(G.kst===0&&(G.rolls.length<2||GST.idle>5))ghostSwipe();}
    else strokeDots();
    if(G.kst===2){const v=G.kpow,x=5,y0=Math.round(H*.3),hh=Math.round(H*.4);
      g.fillStyle='#000';g.fillRect(x-1,y0-1,5,hh+2);const fh=Math.round(hh*v);for(let i=0;i<fh;i++){const u=i/hh;g.fillStyle=u<.55?'#40ff80':u<.8?'#ffd040':'#ff4a6a';g.fillRect(x,y0+hh-1-i,3,1);}
      otxt3(g,'PWR',x+1,y0-8,'#ffffff',1,'c');}}
  if(playing&&!S.demo&&G.ph==='pins'&&G.pt>1.2&&G.fast===1)otxt3(g,touchy?'TAP TO SKIP':'SPACE TO SKIP',W/2,H-24,'#8a80c0',1,'c');
  if(S.mode==='title')titleCard();else if(S.mode==='over')overCard();
}
const TIPS_T=['SWIPE UP TO BOWL','CURVE YOUR SWIPE TO HOOK','DRAG THE BALL TO MOVE','STRIKES, SPARES, TURKEYS!'];
const TIPS_K=['DRAG UP TO BOWL - CURVE IT TO HOOK','OR ARROWS + SPACE: LINE, AIM, POWER','SHIFT CHANGES THE SPIN','STRIKES, SPARES, TURKEYS!'];
function titleCard(){
  const sc=W>=300?3:2,y=Math.round(H*(PORTRAIT?.22:.26));if(DMD.on&&DMD.t>.1&&DMD.t<DMD.dur-.1)return;
  if(CAM.e[2]>9){if((S.t*2|0)%2)otxt5(g,touchy?'TAP TO PLAY':'PRESS START',W/2,H-30,GR.volt,1,'c');otxt3(g,'HI '+S.hi,W-3,PADT+sheetH()+3,'#ffb040',1,'r');return;}
  otxt5(g,'STRIKE NIGHT',W/2+1,y+1,'#3a0a40',sc,'c',.12,'#000');otxt5(g,'STRIKE NIGHT',W/2,y,GR.pink,sc,'c',.12,'#000');
  const bx=W/2+tw5('STRIKE NIGHT',sc)/2+4;let sy=y+7*sc+5;
  if(bx+12<W)otxt5(g,'3D',bx,y-4,GR.cyan,1,'',0,'#000');else{otxt5(g,'3D',W/2,sy,GR.cyan,2,'c',0,'#000');sy+=19;}
  otxt3(g,'COSMIC BOWLING - 10 FRAMES',W/2,sy,'#7ce8ff',1,'c');
  const py=Math.round(H*(PORTRAIT?.62:.58));
  if((S.t*2|0)%2)otxt5(g,touchy?'TAP TO PLAY':'PRESS START',W/2,py,GR.volt,1,'c');
  const tips=touchy?TIPS_T:TIPS_K;otxt3(g,tips[(S.t/2.6|0)%tips.length],W/2,py+11,'#c8c0ff',1,'c');
  otxt3(g,'HI '+S.hi,W/2,py+20,'#ffb040',1,'c');
}
function overCard(){
  const t=S.ot;g.fillStyle='rgba(4,2,12,.74)';g.fillRect(0,PADT+sheetH()+1,W,H-PADT-sheetH()-1);
  const y=Math.round(H*.27),big=H>=140?3:2;otxt5(g,S.score>=300?'PERFECT!':S.score>=200?'GREAT GAME!':S.score>=100?'NICE GAME!':'GAME OVER',W/2,y,S.score>=200?GR.volt:GR.pink,2,'c',.1,'#000');
  otxt3(g,'FINAL SCORE',W/2,y+20,'#c8c0ff',1,'c');otxt5(g,String(S.score),W/2,y+28,GR.steel,big,'c',0,'#000');
  const sx=Math.round(W*.78),sy=Math.round(H*.45);g.fillStyle='#1a1430';g.fillRect(sx-9,sy-3,18,4);g.fillStyle='#ff9a30';g.fillRect(sx-8,sy-2,16,1);
  const n=S.tshown,len=Math.min(n,Math.floor((H-sy-14)/6)),scroll=(S.tacc*6)|0;
  for(let i=0;i<len;i++){const ty2=sy+2+i*6+(len<Math.floor((H-sy-14)/6)?0:scroll);if(ty2>H-12)continue;g.fillStyle=i%2?'#ff7a3a':'#ff5a2a';g.fillRect(sx-6,ty2,12,5);g.fillStyle='#ffd0a0';g.fillRect(sx-4,ty2+2,8,1);g.fillStyle='#2a0a0a';g.fillRect(sx-6,ty2+5,12,1);}
  otxt3(g,'TICKETS',sx,sy-11,'#ffd040',1,'c');otxt5(g,String(n),Math.round(W*.25),Math.round(H*.5),GR.volt,big,'c',0,'#000');otxt3(g,'TICKETS',Math.round(W*.25),Math.round(H*.5)+8*big+2,'#ffd040',1,'c');
  if(S.newHi&&(t*4|0)%2)otxt3(g,'NEW HIGH SCORE',W/2,y+28+8*big+4,'#6aff5a',1,'c');
  if(t>1.5)otxt3(g,touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-9,(t*2|0)%2?'#ffffff':'#8a80c0',1,'c');
}

/* where the ball in hand sits on the HUD grid */
const _bp=new THREE.Vector3();
function ballHud(){const b=PW.ball;_bp.copy(V3(b.x,b.y,b.z)).project(CAM3);return [(_bp.x+1)/2*W,(1-_bp.y)/2*H];}
/* the thumb's stroke, as LED dots: green to amber to red with speed; the speed and hook ride above it */
function strokeDots(){
  const P=GST.pts,n=P.length;if(!n)return;const sx=W/innerWidth,sy=H/innerHeight,t=GST.mode==='throw';
  const v=G.pspd,col=v<.45?'#40ff80':v<.8?'#ffd040':'#ff4a6a';
  const i0=t?GST.lowI:Math.max(0,n-24),dots=[];
  for(let i=Math.max(i0,1);i<n;i++){const x0=P[i-1][0]*sx,y0=P[i-1][1]*sy,x1=P[i][0]*sx,y1=P[i][1]*sy,m=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));
    for(let k=0;k<m;k++)dots.push([Math.round(x0+(x1-x0)*k/m),Math.round(y0+(y1-y0)*k/m),(i-i0)/Math.max(1,n-i0)]);}
  g.fillStyle='#000';for(const [x,y] of dots)g.fillRect(x-1,y-1,3,3);
  g.fillStyle=t?col:'#7ce8ff';for(const [x,y,a] of dots){g.globalAlpha=.3+.7*a;g.fillRect(x,y,1,1);}g.globalAlpha=1;
  const l=P[n-1],lx=clamp(Math.round(l[0]*sx),24,W-24),ly=Math.max(PADT+sheetH()+6,Math.round(l[1]*sy)-14);
  if(t){const mph=(spdFrom(G.pspd)*2.237).toFixed(0)+' MPH',hk=G.pspin<-.4?'HOOK <<':G.pspin<-.02?'HOOK <':G.pspin>.4?'HOOK >>':G.pspin>.02?'HOOK >':'STRAIGHT';
    otxt3(g,mph,lx,ly,col,1,'c');otxt3(g,hk,lx,ly+7,G.pspin?'#ff9ad0':'#c8c0ff',1,'c');}
  else{const [bx]=ballHud();otxt3(g,'<  MOVE  >',clamp(Math.round(bx),24,W-24),ly,'#7ce8ff',1,'c');}
}
/* a ghost swipe for the first balls: chevrons rising from the ball in hand */
function ghostSwipe(){if(!touchy)return;const [bx,by0]=ballHud(),t=S.t*1.4%1;
  for(let k=0;k<3;k++){const u=(t+k/3)%1,y=Math.round(by0-H*(.06+.22*u)),a=Math.sin(u*Math.PI);if(a<.05)continue;
    g.globalAlpha=a;const x=Math.round(bx);g.fillStyle='#000';for(const [ox,oy] of [[-3,1],[-2,0],[-1,-1],[0,-2],[1,-1],[2,0],[3,1]])g.fillRect(x+ox-1,y+oy-1,3,3);
    g.fillStyle='#ffd040';for(const [ox,oy] of [[-3,1],[-2,0],[-1,-1],[0,-2],[1,-1],[2,0],[3,1]])g.fillRect(x+ox,y+oy,1,1);g.globalAlpha=1;}}
