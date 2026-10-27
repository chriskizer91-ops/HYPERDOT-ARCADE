/* =====================================================================================
   11. THE ROAD: the classic segment renderer
   Each segment's two edges are projected with a running lateral offset that grows by the segment's
   curve (the road bends without any real geometry), drawn front to back with a clip line so hills
   hide what is behind them, then walls, scenery and cars are painted back to front over it.
   ===================================================================================== */
const VIEW={tilt:0,ySm:0,sky:0,themeT:1,thPrev:0,th:0,lines:[]};
let FRAME_SEGS=[];const SEGP2={x:0,y:0,w:0};
function project(p,cx,cy,cz){
  p.c.x=-cx;p.c.y=(p.w.y||0)-cy;p.c.z=p.w.z-cz;
  p.s.scale=camDepth/p.c.z;p.s.x=W/2+p.s.scale*p.c.x*W/2;p.s.y=H/2-p.s.scale*p.c.y*H/2;p.s.w=p.s.scale*ROADW*W/2;
}
function quad(x1,y1,w1,x2,y2,w2,col){g.fillStyle=col;g.beginPath();g.moveTo(x1-w1,y1);g.lineTo(x2-w2,y2);g.lineTo(x2+w2,y2);g.lineTo(x1+w1,y1);g.closePath();g.fill();}
function poly4(ax,ay,bx,by,cx2,cy2,dx,dy,col){g.fillStyle=col;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.lineTo(cx2,cy2);g.lineTo(dx,dy);g.closePath();g.fill();}
let clipped=false;
function clipBegin(y){if(y<H){g.save();g.beginPath();g.rect(-W,-H,W*3,y+H);g.clip();clipped=true;}}
function clipEnd(){if(clipped){g.restore();clipped=false;}}
const fogT=(st,col,k)=>fogS(col,THEMES[st].fog,k*.9);
/* ---------- the sky and the far layers (city, sea, peaks, volcano), blended when the theme changes ---------- */
function drawSky(){
  const th=THEMES[VIEW.th],pv=THEMES[VIEW.thPrev],t=VIEW.themeT;
  const c=i=>t<1?mixS(pv.sky[i],th.sky[i],t):th.sky[i];
  const gr=g.createLinearGradient(0,0,0,H*.62);gr.addColorStop(0,c(0));gr.addColorStop(.6,c(1));gr.addColorStop(1,c(2));g.fillStyle=gr;g.fillRect(-W*.1,-H*.1,W*1.2,H*1.2);
  if(th.night&&th.far!=='none'){for(let i=0;i<40;i++){const h=Math.sin(i*91.7)*43758.5,x=((h-Math.floor(h))*W*1.6-VIEW.sky*W*.05)%(W*1.6),y=((Math.sin(i*37.3)*99.1)%1+1)%1*H*.35;if(x>0&&x<W){g.fillStyle=(i*7+((S.clock*2)|0))%11?'#8f86b8':'#ffffff';g.fillRect(x,y,Math.max(1,SC*.7),Math.max(1,SC*.7));}}}
  if(t<1){g.globalAlpha=1-t;farLayer(pv);g.globalAlpha=t;}farLayer(th);g.globalAlpha=1;
}
function farLayer(th){
  const off=VIEW.sky*W,hz=H*.5-clamp(VIEW.ySm*.00012,-.1,.1)*H,t=S.clock;
  if(th.sun&&th.far!=='peaks'){
    const sx=W*.5-((off*.15)%(W*2)+W*2)%(W*2)+W*.5,sr=H*.2;
    const gr=g.createLinearGradient(0,hz-sr,0,hz);gr.addColorStop(0,th.sun);gr.addColorStop(1,th.far==='city'?'#ff2f9a':'#ff5a3a');
    g.fillStyle=gr;g.beginPath();g.arc(clamp(sx,-W,W*2),hz,sr,PI,TAU);g.fill();
    g.fillStyle=th.sky[1];for(let k=0;k<6;k++){const yy=hz-sr*.08-k*sr*.13;g.fillRect(sx-sr,yy,sr*2,Math.max(1,sr*.04*(6-k)/3));}
  }
  if(th.far==='city'){
    for(let layer=0;layer<2;layer++){
      const f=layer?.5:.25,col=layer?'#140826':'#0d0420',wTile=W*1.6,o=((off*f)%wTile+wTile)%wTile;
      for(let rep=-1;rep<2;rep++){const r2=mulberry(11+layer);let x=-o+rep*wTile;
        while(x<-o+(rep+1)*wTile){const bw=(6+r2()*18)*SC*(layer?1.3:1),bh=(8+r2()*(layer?40:30))*SC;
          if(x+bw>0&&x<W){g.fillStyle=col;g.fillRect(x,hz-bh,bw,bh);
            for(let wy=hz-bh+2*SC;wy<hz-2;wy+=3*SC)for(let wx=x+1.5*SC;wx<x+bw-1.5*SC;wx+=3*SC){const h2=Math.sin(wx*12.9+wy*78.2+layer)*43758.5;const v=h2-Math.floor(h2);if(v>.62){g.fillStyle=v>.93?'#ffe9a8':v>.8?'#ff7ac8':'#5fd8ff';g.fillRect(wx,wy,Math.max(1,SC*.9),Math.max(1,SC*.9));}}
            if(layer&&r2()<.18){g.fillStyle=((t*2+x)|0)%2?'#ff2f9a':'#ff2f9a88';g.fillRect(x+bw/2,hz-bh-4*SC,Math.max(1,SC),4*SC);}}
          x+=bw+r2()*3*SC;}}}
  }else if(th.far==='sea'){
    g.fillStyle='#2a1a4a';const wT=W*1.4,o=((off*.3)%wT+wT)%wT;
    for(let rep=-1;rep<2;rep++){g.beginPath();g.moveTo(-o+rep*wT,hz);for(let k=0;k<=24;k++){const x=-o+rep*wT+k*wT/24;g.lineTo(x,hz-(Math.sin(k*1.7)*.5+.5)*H*.08*(k%5===0?1.6:1));}g.lineTo(-o+(rep+1)*wT,hz);g.fill();}
    for(let k=0;k<12;k++){g.fillStyle=k%2?'rgba(255,220,150,.35)':'rgba(255,140,120,.25)';const yy=hz+k*H*.006,ww=W*(.05+k*.02);g.fillRect(W*.5-ww/2+Math.sin(t*2+k)*W*.01,yy,ww,Math.max(1,SC*.7));}
  }else if(th.far==='peaks'){
    for(let k=0;k<3;k++){const yb=H*(.06+k*.05),amp=H*.05;g.strokeStyle=['rgba(80,255,170,.5)','rgba(60,220,255,.4)','rgba(190,90,255,.35)'][k];g.lineWidth=Math.max(1,3*SC);
      g.beginPath();for(let x=0;x<=W;x+=2*SC){const y=yb+Math.sin(x/W*6+t*.6+k*2)*amp+Math.sin(x/W*13-t*.9)*amp*.3;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
    for(let layer=0;layer<2;layer++){const f=layer?.4:.18,wT=W*1.8,o=((off*f)%wT+wT)%wT;g.fillStyle=layer?'#1a2a3c':'#22364a';
      for(let rep=-1;rep<2;rep++){const r2=mulberry(21+layer);g.beginPath();g.moveTo(-o+rep*wT,hz);let x=-o+rep*wT;while(x<-o+(rep+1)*wT){const pw=(14+r2()*30)*SC,ph=(14+r2()*(layer?24:38))*SC;g.lineTo(x+pw/2,hz-ph);g.lineTo(x+pw,hz);x+=pw;}g.lineTo(-o+(rep+1)*wT,hz);g.fill();
        if(!layer){const r3=mulberry(21);let x2=-o+rep*wT;g.fillStyle='#e8f4ff';while(x2<-o+(rep+1)*wT){const pw=(14+r3()*30)*SC,ph=(14+r3()*38)*SC;g.beginPath();g.moveTo(x2+pw/2,hz-ph);g.lineTo(x2+pw/2-pw*.14,hz-ph*.72);g.lineTo(x2+pw/2+pw*.14,hz-ph*.72);g.fill();x2+=pw;}g.fillStyle='#22364a';}}}
  }else if(th.far==='volcano'){
    const wT=W*1.6,o=((off*.2)%wT+wT)%wT;
    for(let rep=-1;rep<2;rep++){const x0=-o+rep*wT+wT*.5;g.fillStyle='#1a0504';g.beginPath();g.moveTo(x0-W*.5,hz);g.lineTo(x0-W*.06,hz-H*.24);g.lineTo(x0+W*.06,hz-H*.24);g.lineTo(x0+W*.5,hz);g.fill();
      const gr=g.createRadialGradient(x0,hz-H*.24,1,x0,hz-H*.24,H*.2);gr.addColorStop(0,'rgba(255,140,40,.9)');gr.addColorStop(1,'rgba(255,60,20,0)');g.fillStyle=gr;g.fillRect(x0-H*.25,hz-H*.5,H*.5,H*.3);
      g.strokeStyle='#ff6a12';g.lineWidth=Math.max(1,SC);g.beginPath();g.moveTo(x0-W*.02,hz-H*.23);g.lineTo(x0-W*.08,hz-H*.12);g.lineTo(x0-W*.12,hz-H*.03);g.stroke();
      for(let k=0;k<5;k++){g.fillStyle=`rgba(60,30,30,${.5-k*.08})`;g.beginPath();g.arc(x0+Math.sin(t*.3+k)*W*.03+k*W*.02,hz-H*.28-k*H*.07,H*(.04+k*.015),0,TAU);g.fill();}}
    g.fillStyle='#120302';const o2=((off*.45)%(W*1.2)+W*1.2)%(W*1.2);for(let rep=-1;rep<2;rep++){g.beginPath();g.moveTo(-o2+rep*W*1.2,hz);for(let k=0;k<=12;k++)g.lineTo(-o2+rep*W*1.2+k*W*.1,hz-(Math.sin(k*2.3)*.5+.5)*H*.07);g.lineTo(-o2+(rep+1)*W*1.2,hz);g.fill();}
  }
}
/* ---------- one road segment: verge, kerbs or rumble, tarmac, lines, grid boxes, the start line ---------- */
function drawSegment(s){
  /* segments are drawn near to far; each reaches .8 dot up into the next one (which paints over it),
     never down into the last, so no seam of verge shows between them */
  const p1=s.p1.s,p2=SEGP2;p2.x=s.p2.s.x;p2.w=s.p2.s.w;p2.y=s.p2.s.y-.8;const th=THEMES[s.st],alt=((s.i/3)|0)%2,k=s.fogK,st=s.st,circ=TR.kind==='circuit';
  g.fillStyle=fogT(st,th.grass[alt],k);g.fillRect(-W*.1,p2.y,W*1.2,p1.y-p2.y);
  if(th.lava&&!s.tun){const glo=.5+.5*Math.sin(S.clock*2+s.i*.3);g.fillStyle=fogT(st,glo>.5?'#3a0c04':'#2a0804',k);g.fillRect(-W*.1,p2.y,W*1.2,p1.y-p2.y);}
  if(s.kerb&&circ){const ka=((s.i/2)|0)%2,r1=p1.w/5.5,r2=p2.w/5.5,kc=fogT(st,th.kerb[ka],k);
    poly4(p1.x-p1.w-r1,p1.y,p1.x-p1.w,p1.y,p2.x-p2.w,p2.y,p2.x-p2.w-r2,p2.y,kc);poly4(p1.x+p1.w+r1,p1.y,p1.x+p1.w,p1.y,p2.x+p2.w,p2.y,p2.x+p2.w+r2,p2.y,kc);}
  else{const r1=p1.w/(s.tun?8:circ?10:6),r2=p2.w/(s.tun?8:circ?10:6),rc=fogT(st,circ?th.road[1]:th.rumble[alt],k);
    poly4(p1.x-p1.w-r1,p1.y,p1.x-p1.w,p1.y,p2.x-p2.w,p2.y,p2.x-p2.w-r2,p2.y,rc);poly4(p1.x+p1.w+r1,p1.y,p1.x+p1.w,p1.y,p2.x+p2.w,p2.y,p2.x+p2.w+r2,p2.y,rc);}
  quad(p1.x,p1.y,p1.w,p2.x,p2.y,p2.w,fogT(st,th.road[alt],k));
  const ew1=p1.w/(circ?30:40),ew2=p2.w/(circ?30:40),ec=fogT(st,circ?'#e8e4f0':th.edge,k);
  if(circ||alt||s.tun){poly4(p1.x-p1.w,p1.y,p1.x-p1.w+ew1,p1.y,p2.x-p2.w+ew2,p2.y,p2.x-p2.w,p2.y,ec);poly4(p1.x+p1.w,p1.y,p1.x+p1.w-ew1,p1.y,p2.x+p2.w-ew2,p2.y,p2.x+p2.w,p2.y,ec);}
  if(!circ&&!alt){const lw1=p1.w/34,lw2=p2.w/34,lc=fogT(st,th.lane,k);for(let l=1;l<3;l++){const lx1=p1.x-p1.w+p1.w*2/3*l,lx2=p2.x-p2.w+p2.w*2/3*l;quad(lx1,p1.y,lw1/2,lx2,p2.y,lw2/2,lc);}}
  if(s.grid>=0&&p1.w>6){const gx=(s.grid%2?.42:-.42),bw=.26;g.fillStyle=fogT(st,'#f4f4ff',k);
    const xa=p1.x+p1.w*(gx-bw),xb=p1.x+p1.w*(gx+bw),xa2=p2.x+p2.w*(gx-bw),xb2=p2.x+p2.w*(gx+bw),lw=Math.max(1,p1.w*.012);
    poly4(xa,p1.y,xb,p1.y,xb2,p2.y,xa2,p2.y,fogT(st,th.road[1],k));g.fillStyle=fogT(st,'#f4f4ff',k);g.fillRect(xa,p1.y-lw,xb-xa,lw);g.fillRect(xa,p2.y,lw,p1.y-p2.y);g.fillRect(xb-lw,p2.y,lw,p1.y-p2.y);}
  if(s.cp){const n2=s.cp===2?12:8;for(let k2=0;k2<n2;k2++){const a=k2/n2,b=(k2+1)/n2,on=(k2+((s.cp===1?(S.clock*8)|0:0)))%2;
      poly4(lerp(p1.x-p1.w,p1.x+p1.w,a),p1.y,lerp(p1.x-p1.w,p1.x+p1.w,b),p1.y,lerp(p2.x-p2.w,p2.x+p2.w,b),p2.y,lerp(p2.x-p2.w,p2.x+p2.w,a),p2.y,fogT(st,on?'#ffffff':'#111111',k));}}
}
/* the racing line overlay: dots down the line, green where you can carry your speed, amber to lift, red to brake */
function drawLine(n0,n1){
  if(!ASSISTS[S.assist].line||TR.kind!=='circuit'||S.mode!=='race'||P.finished)return;
  const v=P.v;
  for(let k=FRAME_SEGS.length-1;k>=0;k--){const s=FRAME_SEGS[k];if(s.n<n0||s.n>n1||s.i%2)continue;const p=s.p1.s;if(p.w<3)continue;
    const r=v/(s.vlim*VTOP),col=r>1.03?'#ff2a4a':r>.96?'#ffb020':'#5aff6a',a=(1-s.fogK)*(.85-s.n/n1*.5);
    g.globalAlpha=Math.max(0,a);g.fillStyle=col;const x=p.x+p.w*s.line,sz=clamp(p.w*.014,.6,2.2*SC);g.fillRect(x-sz,p.y-Math.max(1,sz*.6),sz*2,Math.max(1,sz*.8));}
  g.globalAlpha=1;
}
/* street circuits: concrete walls with a lit top rail; tunnels: walls, ceiling and light strips */
function drawWall(s){
  const p1=s.p1.s,p2=s.p2.s,k=s.fogK,th=THEMES[s.st],WH=820,ww1=p1.w*TR.wallX,ww2=p2.w*TR.wallX;
  const c1=p1.y-p1.scale*WH*H/2,c2=p2.y-p2.scale*WH*H/2,lit=s.i%4<2;
  for(const sd of [-1,1]){const xa=p1.x+sd*ww1,xb=p2.x+sd*ww2;poly4(xa,p1.y,xb,p2.y,xb,c2,xa,c1,fogT(s.st,th.wall[lit?1:0],k));
    poly4(xa,c1,xb,c2,xb,c2+Math.max(.6,(p2.y-c2)*.12),xa,c1+Math.max(.6,(p1.y-c1)*.12),fogT(s.st,th.wallTop,k*.7));}
}
function drawTunnel(s){
  const p1=s.p1.s,p2=s.p2.s,TH=3800,k=s.fogK,wx=TR.walls==='tunnel'?TR.wallX:1.35;
  const c1=p1.y-p1.scale*TH*H/2,c2=p2.y-p2.scale*TH*H/2,ww1=p1.w*wx,ww2=p2.w*wx;
  const lit=s.i%6===0,wall=fogT(s.st,lit?'#2a2238':'#120e1c',k),ceil=fogT(s.st,lit?'#1e1830':'#0c0a14',k);
  poly4(p1.x-ww1,p1.y,p2.x-ww2,p2.y,p2.x-ww2,c2,p1.x-ww1,c1,wall);poly4(p1.x+ww1,p1.y,p2.x+ww2,p2.y,p2.x+ww2,c2,p1.x+ww1,c1,wall);
  poly4(p1.x-ww1,c1,p2.x-ww2,c2,p2.x+ww2,c2,p1.x+ww1,c1,ceil);
  if(s.i%3===0){
    const lc=fogT(s.st,s.st===2?(s.i%12===0?'#ff2f9a':'#2fe6ff'):'#ffd9a0',k*.6);g.fillStyle=lc;
    const lw=Math.max(.6,(p1.y-p2.y)*.6);g.fillRect(p1.x-ww1*.35,c1+lw*.2,ww1*.7,lw);
    for(const sd of [-1,1]){const xa=p1.x+sd*ww1,xb=p2.x+sd*ww2;poly4(xa,lerp(p1.y,c1,.55),xb,lerp(p2.y,c2,.55),xb,lerp(p2.y,c2,.6),xa,lerp(p1.y,c1,.6),lc);}
  }
}
/* ---------- the frame ---------- */
const TOUCHED=[],NEAR=[];
function renderWorld(){
  const sp=P.v/VTOP,N=TR.N;
  /* put each car on its segment for back-to-front drawing */
  for(const s of TOUCHED)s.cars.length=0;TOUCHED.length=0;
  NEAR.length=0;for(const c of CARS){if(c===P)continue;if(dSeg(P.z,c.z)<-.05&&dSeg(P.z,c.z)>-PLAYERZ/SEG){NEAR.push(c);continue;}const s=segAt(c.z);s.cars.push(c);TOUCHED.push(s);}
  for(const c of TRAFFIC){const s=segAt(c.z);s.cars.push(c);TOUCHED.push(s);}
  const cz=wrapZ(P.z-PLAYERZ),base=segAt(cz),basePct=(cz%SEG)/SEG,ps=segAt(P.z),ppct=(P.z%SEG)/SEG;
  const playerY=lerp(ps.p1.w.y,ps.p2.w.y,ppct);VIEW.ySm=lerp(VIEW.ySm,playerY,.25);
  camDepth=1/Math.tan((50+(P.nitroOn?9:0)+(P.boostT>0?4:0)+sp*4)*PI/180);
  const sx=S.shake>0&&!reduce?rnd(-1,1)*S.shake*3*SC:0,sy=S.shake>0&&!reduce?rnd(-1,1)*S.shake*2*SC:0;
  VIEW.tilt=lerp(VIEW.tilt,reduce?0:clamp(-ps.curve*sp*.006-P.steer*sp*.012,-.045,.045),.08);
  g.setTransform(1,0,0,1,0,0);g.translate(W/2+sx,H*.62+sy);g.rotate(VIEW.tilt);g.translate(-W/2,-H*.62);
  drawSky();
  let maxy=H*1.1,x=0,dx=-(base.curve*basePct);FRAME_SEGS.length=0;
  const camX=P.x*ROADW,camY=playerY+CAMH;
  for(let n=0;n<DRAW;n++){
    const s=TR.segs[(base.i+n)%N],loop=s.i<base.i?TR.L:0;
    s.fogK=1-Math.exp(-Math.pow(n/DRAW,1.6)*3.2);s.clip=maxy;s.n=n;
    project(s.p1,camX-x,camY,cz-loop);project(s.p2,camX-x-dx,camY,cz-loop);
    x+=dx;dx+=s.curve;
    if(s.p1.c.z<=camDepth||s.p2.s.y>=s.p1.s.y||s.p2.s.y>=maxy){s.vis=false;continue;}
    s.vis=true;FRAME_SEGS.push(s);drawSegment(s);maxy=s.p1.s.y;
  }
  drawLine(5,80);
  for(let k=FRAME_SEGS.length-1;k>=0;k--){const s=FRAME_SEGS[k];if(s.tun)drawTunnel(s);else if(TR.walls==='street')drawWall(s);}
  /* scenery and cars, back to front */
  for(let n=DRAW-1;n>0;n--){
    const s=TR.segs[(base.i+n)%N];if(!s.p1.s.scale||s.p1.c.z<=camDepth)continue;
    for(const sp2 of s.spr)drawProp(s,sp2);
    for(const c of s.cars){
      const pct=(c.z%SEG)/SEG,sc=lerp(s.p1.s.scale,s.p2.s.scale,pct),cx=lerp(s.p1.s.x,s.p2.s.x,pct)+sc*c.x*ROADW*W/2,cy=lerp(s.p1.s.y,s.p2.s.y,pct);
      const w=sc*(c.w||.34)*ROADW*W/2;if(w<1||cy-w>s.clip)continue;
      clipBegin(s.clip);if(c.ai||c.drv)drawRacer(cx,cy,w,c,s.fogK,s.st);else drawCar(cx,cy,w,{col:c.col,type:c.type,fog:s.fogK,st:s.st,lights:THEMES[s.st].night});clipEnd();
    }
  }
  drawParticles();
  drawPlayer();
  /* cars just behind you, between your car and the camera, overlap it */
  NEAR.sort((a,b)=>dSeg(P.z,a.z)-dSeg(P.z,b.z));
  for(const c of NEAR){const s=segAt(c.z);if(!s.p1.s.scale||s.p1.c.z<=camDepth)continue;const pct=(c.z%SEG)/SEG,sc=lerp(s.p1.s.scale,s.p2.s.scale,pct),cx=lerp(s.p1.s.x,s.p2.s.x,pct)+sc*c.x*ROADW*W/2,cy=lerp(s.p1.s.y,s.p2.s.y,pct),w=sc*.34*ROADW*W/2;if(w>1)drawRacer(cx,cy,w,c,0,s.st);}
  drawWeather();
  if(P.nitroOn||P.boostT>0)speedLines(P.nitroOn?1:.5);
  g.setTransform(1,0,0,1,0,0);
  if(S.flash>0){g.fillStyle=`rgba(255,255,255,${S.flash*(reduce?.15:.45)})`;g.fillRect(0,0,W,H);}
}
