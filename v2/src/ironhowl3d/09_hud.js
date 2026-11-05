/* ===================== the LED HUD: the original's HUD and screens, drawn on a dot grid laid over the 3D view ===================== */
const HUD={c:null,tex:null,
  resize(){if(!this.c){this.c=document.createElement('canvas');}this.c.width=W;this.c.height=H;g=this.c.getContext('2d');g.imageSmoothingEnabled=false;
    if(this.tex)this.tex.dispose();const t=new T.CanvasTexture(this.c);t.flipY=false;t.minFilter=t.magFilter=T.NearestFilter;t.generateMipmaps=false;t.colorSpace=T.NoColorSpace;this.tex=t;},
  begin(){g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.clearRect(0,0,W,H);HOT.length=0;POSTV.dim=0;POSTV.hurt=0;},
  end(){this.tex.needsUpdate=true;}
};
let g=null;
function HPt(x,y,z){const ok=w2h(x,y,z);return [PJ[0],PJ[1],ok];}
/* dots per metre at a world point, for brackets and the like */
function dpm(x,y,z){w2h(x,y,z);const a=PJ[0],b=PJ[1];w2h(x+1,y,z);return Math.hypot(PJ[0]-a,PJ[1]-b);}
const HC={dim:'#77708a',ink:'#ece6f4',amber:'#ffae2a',red:'#ff4a3a',green:'#6aff5a',steel:'#a2adc6',bg:'#2a2632'};
function panel(x,y,w,h,a){g.fillStyle=`rgba(5,4,9,${a??.62})`;g.fillRect(x,y,w,h);}
function segBar(x,y,w,h,f,col){g.fillStyle=HC.bg;g.fillRect(x,y,w,h);const n=Math.round(w*clamp(f,0,1));g.fillStyle=col;g.fillRect(x,y,n,h);g.fillStyle='rgba(0,0,0,.6)';for(let i=x+3;i<x+w;i+=4)g.fillRect(i,y,1,h);}
function hostiles(){let n=PODS.length;for(const u of EN)if(!u.dead)n++;for(const q of G.queue)n+=q.n;return n;}
function lockTargets(P){const n=4+2*(P.up.pods||0);return EN.filter(u=>!u.dead&&u.spawnT>=.35).map(u=>({u,s:Math.hypot(u.x-P.x,u.y-P.y)+Math.abs(angD(Math.atan2(u.y-P.y,u.x-P.x),P.turret))*6})).sort((a,b)=>a.s-b.s).slice(0,n).map(o=>o.u);}
function tri(x,y,dx,dy,sz,col){const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;g.fillStyle=col;g.beginPath();g.moveTo(x+dx*sz,y+dy*sz);g.lineTo(x-dx*sz*.6-dy*sz*.8,y-dy*sz*.6+dx*sz*.8);g.lineTo(x-dx*sz*.6+dy*sz*.8,y-dy*sz*.6-dx*sz*.8);g.closePath();g.fill();}
function hud(quiet){
  const P=PLY,cx=W>>1,blink=(FRAME>>3)&1;
  /* world-anchored: lock brackets, pops, reticle, off-screen arrows */
  if(!P.dead&&P.missT<=0){g.fillStyle=(FRAME>>2)&1?'#ffd040':'#ff8a2a';for(const u of lockTargets(P)){const q=HPt(u.x,u.y,(u.z||0)+1),sx=Math.round(q[0]),sy=Math.round(q[1]),r=Math.round(Math.max(5,u.r*dpm(u.x,u.y,1)*.95));if(sx<0||sx>W||sy<0||sy>H)continue;
    for(const [ax,ay] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=sx+ax*r,y=sy+ay*r;g.fillRect(ax<0?x:x-2,y,3,1);g.fillRect(x,ay<0?y:y-2,1,3);}}}
  for(const p of POPS){const q=HPt(p.x,p.y,p.z+p.t*1.6);if(p.t>.7&&(FRAME&1))continue;otxt3(g,p.s,Math.round(q[0]),Math.round(q[1]),p.c||'#fff2b0',1,'c','#000');}
  let n=0;for(const u of EN){if(u.dead||n>14)continue;const q=HPt(u.x,u.y,(u.z||0)+1),sx=q[0],sy=q[1];if(sx>=0&&sx<W&&sy>=0&&sy<H)continue;n++;
    const dx=sx-W/2,dy=sy-H/2,t=Math.min((W/2-7)/Math.abs(dx||1e-3),(H/2-7)/Math.abs(dy||1e-3));tri(W/2+dx*t,H/2+dy*t,dx,dy,u.d.boss?5:3,u.d.boss?(blink?'#ffd040':'#ff4a3a'):'#ff4a3a');}
  if(!P.dead){let rx,ry;if(AIMMODE==='mouse'&&MOUSE.on&&!touchy){rx=MOUSE.x;ry=MOUSE.y;}else{const q=HPt(P.x+Math.cos(P.turret)*7,P.y+Math.sin(P.turret)*7,1.8);rx=q[0];ry=q[1];}
    rx=Math.round(rx);ry=Math.round(ry);g.fillStyle=P.over>0?HC.red:'#ffd040';g.fillRect(rx-5,ry,3,1);g.fillRect(rx+3,ry,3,1);g.fillRect(rx,ry-5,1,3);g.fillRect(rx,ry+3,1,3);g.fillRect(rx,ry,1,1);}
  /* top-left: hull, heat, missiles, and any weapon power-ups with their time left */
  const bl=[];for(const k in BOOST){const B=BOOST[k];if(P.bst[B.id]>0)bl.push([B,P.bst[B.id]]);}
  panel(2,2,76,28+bl.length*7);
  bl.forEach(([B,t],i)=>{const y=26+i*7;if(t>2.5||blink){txt3(g,B.name.replace('2X DAMAGE','2X DMG').replace('RAPID FIRE','RAPID').replace('SPREAD SHOT','SPREAD'),5,y,B.col);}segBar(40,y,35,4,t/BOOST_T,B.col);});
  const hf=P.hp/P.maxHp,hc=hf>.5?HC.green:hf>.25?'#ffc21a':(blink?HC.red:'#7a1810');
  txt3(g,'HULL',5,5,HC.dim);segBar(24,5,51,5,hf,hc);
  txt3(g,'HEAT',5,12,P.over>0&&blink?HC.red:HC.dim);segBar(24,12,51,5,P.heat/100,P.over>0?(FRAME>>2)&1?HC.red:'#ffd040':P.heat>70?'#ff7a2a':HC.amber);
  txt3(g,'MSL',5,19,HC.dim);{const np=4+2*(P.up.pods||0),full=4.2/(1+.35*(P.up.reload||0)),rf=P.missT>0?1-P.missT/full:1;const pw=np>6?3:4;
    for(let i=0;i<np;i++){g.fillStyle=rf>=1?'#ffd040':(i/np<rf?'#8a5a10':HC.bg);g.fillRect(24+i*(pw+2),19,pw,5);}}
  if(hf<.25&&!P.dead&&blink)txt3(g,'HULL CRITICAL',5,33+bl.length*7,HC.red);
  /* top-center: wave or boss */
  if(G.boss&&!G.boss.dead){const b=G.boss,bw=Math.round(Math.min(W,MW*1.1)*.4);panel(cx-bw/2-3,2,bw+6,24);txt3(g,b.d.name,cx,5,'#ff9aab',1,'c');segBar(Math.round(cx-bw/2),13,bw,5,b.hp/b.max,G.bossHit>0?'#ffffff':(b.hp<b.max*.5?'#ff2a6a':'#ff3a2a'));txt3(g,'WAVE '+G.wave,cx,20,HC.dim,1,'c');}
  else{panel(cx-36,2,72,19);txt5(g,'WAVE '+G.wave,cx,4,GR.volt,1,'c');const h=hostiles();txt3(g,G.phase==='clear'?'ALL CLEAR':h+' HOSTILE'+(h===1?'':'S'),cx,13,G.phase==='clear'?HC.green:HC.steel,1,'c');}
  /* top-right: score, multiplier, radar */
  const rw=Math.round(Math.max(48,Math.min(W,MW*1.15)*.13)),rh=Math.round(rw*(INY-IN0)/(INX-IN0)),rx0=W-rw-3,ry0=21;
  panel(rx0-2,2,rw+4,ry0+rh-1);
  txt5(g,fmt(G.score),W-4,4,'#ffffff',1,'r');
  if(P.mult>1){txt3(g,'x'+P.mult,rx0,13,HC.amber);g.fillStyle=HC.amber;g.fillRect(rx0+10,15,Math.round((rw-10)*P.multT/2.4),1);}
  g.fillStyle='#14121c';g.fillRect(rx0,ry0,rw,rh);g.fillStyle='#3a3446';g.fillRect(rx0,ry0,rw,1);g.fillRect(rx0,ry0+rh-1,rw,1);g.fillRect(rx0,ry0,1,rh);g.fillRect(rx0+rw-1,ry0,1,rh);
  const mx=x=>rx0+1+(x-IN0)/(INX-IN0)*(rw-2),my=y=>ry0+1+(y-IN0)/(INY-IN0)*(rh-2);
  {const c=VIEWB;g.fillStyle='rgba(255,255,255,.14)';const x0=Math.max(rx0,mx(c[0])),x1=Math.min(rx0+rw,mx(c[2])),y0=Math.max(ry0,my(c[1])),y1=Math.min(ry0+rh,my(c[3]));if(x1>x0&&y1>y0)g.fillRect(Math.round(x0),Math.round(y0),Math.round(x1-x0),Math.round(y1-y0));}
  for(const p of PICK){g.fillStyle=HC.green;g.fillRect(Math.round(mx(p.x)),Math.round(my(p.y)),1,1);}
  for(const p of PODS){if((FRAME>>2)&1){g.fillStyle='#ff8a5a';g.fillRect(Math.round(mx(p.x)),Math.round(my(p.y)),1,1);}}
  for(const u of EN){if(u.dead)continue;const x=Math.round(mx(u.x)),y=Math.round(my(u.y));if(u.d.boss){g.fillStyle=blink?'#ffd040':HC.red;g.fillRect(x-1,y-1,3,3);}else{g.fillStyle=u.d.fly?'#ff9aab':HC.red;g.fillRect(x,y,1,1);}}
  if(!P.dead){g.fillStyle=(FRAME>>2)&1?'#ffffff':HC.amber;g.fillRect(Math.round(mx(P.x))-1,Math.round(my(P.y)),3,1);g.fillRect(Math.round(mx(P.x)),Math.round(my(P.y))-1,1,3);}
  /* bottom-center: howl */
  {const bw=Math.round(Math.min(W,MW*1.2)*.28),bx=Math.round(cx-bw/2),by=H-8;panel(bx-24,by-3,bw+28,11);
    if(P.od>0){txt3(g,'OVR',bx-21,by,'#4fe0ff');segBar(bx,by,bw,5,P.od/7,(FRAME>>1)&1?'#8af8ff':'#2fb4ff');}
    else{txt3(g,'HOWL',bx-21,by,P.odM>=100?(blink?'#fff0c8':HC.amber):HC.dim);segBar(bx,by,bw,5,P.odM/100,P.odM>=100?(blink?'#fff0c8':'#ffae2a'):'#c87a14');
      if(P.odM>=100&&!P.dead)otxt3(g,touchy?'TAP HOWL':'PRESS E',cx,by-9,blink?'#ffffff':HC.amber,1,'c');}}
  /* big message */
  if(!quiet&&G.msg&&G.msgT>0){const mm=G.msg,sc=MW>=380?3:2,y=Math.round(H*.3),age=(G.msg.d0??(G.msg.d0=G.msgT))-G.msgT;
    if(age>.12||(FRAME&1)){if(G.msgT>.3||(FRAME>>1)&1){otxt5(g,mm.t,cx,y,mm.col,sc,'c',.15,'#000');if(mm.sub)otxt3(g,mm.sub,cx,y+7*sc+5,'#e6e2da',1,'c');}}}
  /* damage + danger edges */
  if(G.hurtT>0){g.fillStyle=`rgba(255,30,20,${Math.min(.75,G.hurtT*2)})`;g.fillRect(0,0,W,2);g.fillRect(0,H-2,W,2);g.fillRect(0,0,2,H);g.fillRect(W-2,0,2,H);POSTV.hurt=Math.min(.6,G.hurtT*1.6);}
  else if(hf<.25&&!P.dead){const a=.25+.25*Math.sin(G.t*8);g.fillStyle=`rgba(255,30,20,${a})`;g.fillRect(0,0,W,1);g.fillRect(0,H-1,W,1);g.fillRect(0,0,1,H);g.fillRect(W-1,0,1,H);POSTV.hurt=a*.35;}
}
/* the part of the arena the camera sees, for the radar */
const VIEWB=[0,0,1,1];
function viewBounds(){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [a,b] of [[0,0],[RECT.w,0],[0,RECT.h],[RECT.w,RECT.h]]){const p=screenToWorld(a,b,0);x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
  VIEWB[0]=x0;VIEWB[1]=y0;VIEWB[2]=x1;VIEWB[3]=y1;}

/* ===================== screens (laid out in a 16:9 box) ===================== */
function dim(a){POSTV.dim=Math.max(POSTV.dim,a*.9);}
function inBox(fn){const w0=W,h0=H,n0=HOT.length;W=MW;H=MH;g.save();g.translate(MX,MY);try{fn();}finally{g.restore();W=w0;H=h0;}for(let i=n0;i<HOT.length;i++){HOT[i].x+=MX;HOT[i].y+=MY;}}
function menu(items,y,sp){
  sp=sp||12;const cx=W>>1;
  for(let i=0;i<items.length;i++){const s=items[i],on=i===G.menuI,yy=Math.round(y+i*sp),w=tw5(s,1);
    if(on){g.fillStyle='rgba(255,174,42,.18)';g.fillRect(cx-w/2-13,yy-2,w+26,11);txt5(g,s,cx,yy,GR.volt,1,'c');const k=(FRAME>>3)&1;txt5(g,'>',cx-w/2-10+k,yy,HC.amber);txt5(g,'<',cx+w/2+5-k,yy,HC.amber);}
    else{g.fillStyle='rgba(5,4,9,.45)';g.fillRect(cx-w/2-4,yy-2,w+8,11);txt5(g,s,cx,yy,'#8a8498',1,'c');}
    HOT.push({x:cx-w/2-13,y:yy-3,w:w+26,h:sp,i});}
}
function logo(cx,y,sc){
  const s='IRONHOWL',w=tw5(s,sc);otxt5(g,s,cx,y,GR.volt,sc,'c',.18,'#160700');
  const sw=((G.t*.42)%1.5)*(w+60)-30+cx-w/2;g.save();g.beginPath();g.rect(sw,y-2,sc*3,7*sc+4);g.clip();txt5(g,s,cx,y,'#ffffff',sc,'c',.18);g.restore();
}
function drawTitle(){
  dim(.42);g.fillStyle='rgba(3,2,7,.38)';g.fillRect(0,0,W,Math.round(H*.5));
  const sc=W>=380?4:3,cx=W>>1,y=Math.round(H*.12);
  logo(cx,y,sc);
  const w=tw5('IRONHOWL',sc);{const bx=cx+w/2+4,by=y+7*sc-9;g.fillStyle='#2fe6ff';g.fillRect(bx,by,15,9);txt5(g,'3D',bx+2,by+1,'#04121a');}
  txt3(g,'MECH ARENA IN REAL 3D, ON AN LED HUD',cx,y+7*sc+6,HC.steel,1,'c');
  txt3(g,'12 WAVES. 2 ARENAS. 2 BOSSES. 1 MECH.',cx,y+7*sc+14,HC.dim,1,'c');
  menu(EMBED?['START','HOW TO PLAY','BACK TO ARCADE']:['START','HOW TO PLAY'],Math.round(H*.58));
  panel(0,H-12,W,12,.5);txt3(g,'HI SCORE '+fmt(G.hi)+'   BEST WAVE '+G.best,cx,H-9,HC.dim,1,'c');
}
function drawHow(){
  const cx=W>>1,dsk=!touchy;
  if(G.howP===0){dim(.78);
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
function drawRoster(){
  const cw=W/4,top=18,chh=(H-30)/2;
  for(let i=0;i<ROSTER.length;i++){const r=ROSTER[i],x=Math.round(cw*(i%4)+cw/2),y=Math.round(top+chh*((i/4)|0)+chh*.66);
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
function pauseItems(){return ['RESUME','RESTART','QUALITY: '+({low:'LOW',med:'MEDIUM',high:'HIGH'})[QN],'VIEW: '+(VIEWM?'CLOSE':'HIGH'),'DOTS: '+(DOTS?'ON':'OFF'),'QUIT TO TITLE'];}
function drawPause(){dim(.6);const cx=W>>1;otxt5(g,'PAUSED',cx,Math.round(H*.14),GR.steel,2,'c',0,'#000');menu(pauseItems(),Math.round(H*.3));}
function drawHUD(){
  HUD.begin();
  const m=G.mode;
  if(m==='play'){hud(G.paused);if(G.paused)inBox(drawPause);}
  else if(m==='title')inBox(drawTitle);
  else if(m==='howto')inBox(drawHow);
  else if(m==='upgrade')inBox(drawUpgrade);
  else if(m==='over')inBox(drawOver);
  else if(m==='win')inBox(drawWin);
  HUD.end();
  const rd=m==='play'&&PLY&&PLY.odM>=100&&PLY.od<=0;const bh=$('bH');if(bh.classList.contains('ready')!==rd)bh.classList.toggle('ready',rd);
}
