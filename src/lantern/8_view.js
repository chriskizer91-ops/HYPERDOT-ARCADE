/* =====================================================================================
   13. COMPOSITION — light every dot of the view, set the sprites into it (lit pixel art,
       voids where the shades stand, glowing eyes and flames), then quantize to nibbles
   ===================================================================================== */
const LT=new Float32Array(N);              /* total light per view dot, for the sprites */
const FLK=new Float32Array(256).fill(1);
let VX=0,VY=0;                              /* the view's world origin this frame (whole dots) */
const RAIN=[];
function composeWorld(t){
  /* lamp flicker: gas mantles breathe a little, never much */
  for(let i=0;i<LAMPS.length;i++){const L=LAMPS[i];FLK[i]=1+.03*Math.sin(L.flick*7.3)+.02*Math.sin(L.flick*17.1+i)+(L.snuffT>0?-.5*L.snuffT:0);}
  FLK[255]=1;
  LB.fill(0);EMB.fill(0);VOID.fill(1);
  /* the hand lantern: a small hot glow and, when the shutter is open, the beam */
  if(!P.dead||S.mode==='dying'){const dk=S.mode==='dying'?Math.max(0,1-S.t/1.6):1,ro=Math.ceil(lanternR()*dk+1);
    if(ro>1)addLight(P.lx,P.ly,ro,lanternI()*dk*(P.oil<=0?.45+.35*Math.random():1),{S:LSM,src:1.1,hot:.9});
    if(P.beamK>.02&&dk>0)addLight(P.lx,P.ly,BEAM.R,1.9*P.beamK*oilK()*dk,{S:LSM,src:1.1,cone:{dir:P.aim,half:BEAM.half,soft:.07},near:3});}
  for(const f of FLARES){const k=1-f.t/f.dur;addLight(f.x,f.y,f.R,2.4*k*k,{S:f.S,src:2.2,hot:2});}
  if(GREAT.on&&TOWER)addLight(TOWER.x,TOWER.y,127,1.6*GREAT.k,{S:GREAT.S,src:2.6,cone:{dir:GREAT.a,half:GREAT.half,soft:.05}});
  for(const f of FF)if(f.on){const b=.5+.5*Math.sin(f.ph*6);if(b>.25)addLight(f.x,f.y,6,.28*b);}
  /* the ground, the roofs, the water, the canopies */
  const fogK=ST.fog,moonK=ST.moon*.42,amb=ST.amb*2.6,fx=(t*4.3)|0,fy=(t*2.1)|0,fx2=(-t*2.7)|0;
  for(let y=0;y<H;y++){const wy=VY+y;if(wy<0||wy>=WH){for(let x=0;x<W;x++){RAD[y*W+x]=0;LT[y*W+x]=0;}continue;}
    const fr=((wy+fy)&127)*FOGS,fr2=((wy*2+fy)&127)*FOGS;
    for(let x=0;x<W;x++){const wx=VX+x,i=y*W+x;if(wx<0||wx>=WW){RAD[i]=0;LT[i]=0;continue;}
      const w=wy*WW+wx,Ls=LMAP[w]*FLK[LMID[w]],L=Ls+LB[i];LT[i]=L;
      const a=ALB[w]*(1/255),fog=(FOGT[fr+((wx+fx)&127)]*.65+FOGT[fr2+((wx+fx2)&127)]*.35)*fogK;
      let r=L*(a+fog*.32)+MOON[w]*moonK*(1/255)*(1+fog*.6)+amb*a;
      if(MAT[w]===M_WATER){const g=Math.sin(wx*.85+Math.sin(wy*.33+t*.9)*2.2+t*1.9)*Math.sin(wy*.6-t*.7+wx*.1);if(g>.55)r+=L*(g-.55)*1.6;}
      const cn=CANOPY[w];if(cn){r=(Ls+LB[i]*.25)*cn*(1/255)*.9+MOON[w]*moonK*(1/255)+.012;}
      RAD[i]=r;}}
}
/* ---------- sprites ---------- */
function lit(x,y,alb,mode){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x,v=alb*(LT[i]+.02);if(mode===1)RAD[i]=Math.max(RAD[i],v);else RAD[i]=v;}
function emit(x,y,v){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;EMB[y*W+x]+=v;}
function voidAt(x,y,k){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;VOID[i]=Math.min(VOID[i],k);}
/* the lamplighter seen from above: a hood, a long coat swinging as he walks, the lantern held out */
const PSPR=['..x..','.xxx.','xxoxx','xxxxx','.x.x.'];
function drawPlayer(){
  if(P.dead&&S.mode!=='dying')return;const sx=Math.round(P.x)-VX,sy=Math.round(P.y)-VY,blink=P.inv>0&&((S.clock*16|0)&1);if(blink)return;
  const sw=Math.hypot(P.vx,P.vy)>4?((S.clock*8|0)&1):0;
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){const ch=PSPR[r][c];if(ch==='.')continue;if(r===4&&sw&&c===1)continue;if(r===4&&!sw&&c===3)continue;lit(sx-2+c,sy-3+r,ch==='o'?.95:.55);}
  /* the lantern itself */
  const lx=Math.round(P.lx)-VX,ly=Math.round(P.ly)-VY,fl=(P.oil>0?1:.4)*(S.mode==='dying'?Math.max(0,1-S.t/1.4):1);
  emit(lx,ly,1.8*fl);emit(lx+1,ly,.5*fl);emit(lx,ly+1,.35*fl);
}
const SHSPR=['.x.x.','xxxxx','xxxxx','xxxxx','x.x.x'];
function drawShades(t){
  for(const s of SH){const sx=Math.round(s.x)-VX,sy=Math.round(s.y)-VY;if(sx<-8||sy<-8||sx>W+8||sy>H+8)continue;
    const k=s.in,wob=(r32()&3)===0;
    for(let r=0;r<5;r++)for(let c=0;c<5;c++){if(SHSPR[r][c]==='.')continue;if(k<.6&&hash2(c,r,(t*12|0)+s.id)>k)continue;const edge=r===0||c===0||c===4||r===4;voidAt(sx-2+c,sy-3+r,s.burn>0&&wob?.4:edge&&hash2(c,r,(t*14|0)+s.id)>.6?.3:0);}
    /* a ragged fringe of dark */
    for(let n=0;n<4;n++){const a=hash2(n,s.id,(t*9|0))*TAU,rr=3.2;voidAt(sx+Math.cos(a)*rr,sy-1+Math.sin(a)*rr,.35);}
    const open=((s.eye+s.id)%4.3)>.18,eb=(s.fz>.5?.35:.75)*k;
    if(open){emit(sx-1,sy-2,eb);emit(sx+1,sy-2,eb);}
    if(s.burn>0)for(let n=0;n<3;n++)emit(sx-2+(r32()%5),sy-3+(r32()%5),1.2);}
}
function drawSnuffers(t){
  for(const z of SNUF){const sx=Math.round(z.x)-VX,sy=Math.round(z.y)-VY;
    for(let r=0;r<10;r++){const hw=r<2?1:r<5?2:3;for(let c=-hw;c<=hw;c++)voidAt(sx+c,sy-8+r,0);}
    for(let r=0;r<6;r++)voidAt(sx+4,sy-9+r,0);voidAt(sx+3,sy-10,0);voidAt(sx+2,sy-10,0);          /* the pole and its bell */
    for(let n=0;n<6;n++){const a=Math.sin(t*3+n)*1.5;voidAt(sx-2+n%5+a,sy+2+((n/5)|0),.3);}
    emit(sx-1,sy-6,z.fz>.5?.4:.9);emit(sx+1,sy-6,z.fz>.5?.4:.9);
    if(z.burn>0)for(let n=0;n<4;n++)emit(sx-3+(r32()%7),sy-8+(r32()%10),1.3);}
}
function drawMoths(t){for(const m of MOTHS)for(const q of m.n){const x=m.x+Math.cos(q.a)*q.r,y=m.y+Math.sin(q.a)*q.r*.7;lit(x-VX,y-VY,1.2,1);if(((t*20+q.ph*3)|0)&1)lit(x-VX+1,y-VY,.6,1);}}
function drawLamps(t){
  for(let li=0;li<LAMPS.length;li++){const L=LAMPS[li],sx=L.x-VX,sy=L.y-VY;if(sx<-4||sy<-6||sx>W+4||sy>H+4)continue;
    /* the cage on its post, seen from above, a little north of the base */
    const hy=sy-3;
    if(L.lit){const f=FLK[li];emit(sx-1,hy,2.1*f);emit(sx,hy,2.4*f);emit(sx-1,hy-1,1.6*f);emit(sx,hy-1,1.8*f);for(const [u,v] of [[-2,0],[1,0],[-2,-1],[1,-1],[-1,-2],[0,-2],[-1,1],[0,1]])emit(sx+u,hy+v,.32*f);}
    else{for(const [u,v] of [[-1,0],[0,0],[-1,-1],[0,-1]])lit(sx+u,hy+v,.5);for(const [u,v] of [[-2,0],[1,0],[-1,-2],[0,-2]])lit(sx+u,hy+v,.8);
      if(L.snuffT>0)emit(sx,hy,.4*L.snuffT);}
    if(P.kl===L&&P.kindle>0){const n=Math.round(P.kindle*16);for(let k=0;k<n;k++){const a=-Math.PI/2+k/16*TAU;emit(sx-.5+Math.cos(a)*5.5,hy+Math.sin(a)*5.5,.9);}}}
}
function drawPicks(t){for(const p of PICKS){if(!p.on)continue;const sx=p.x-VX,sy=p.y-VY+Math.round(Math.sin(p.t*3)*.6);
  if(p.k==='oil'){for(let j=-2;j<=1;j++)for(let i=-1;i<=1;i++)lit(sx+i,sy+j,.85);lit(sx,sy-3,.9);emit(sx-1,sy-2,((p.t*2|0)&1)?.5:.15);}
  else{for(let j=-1;j<=1;j++)lit(sx,sy+j,.9);emit(sx,sy-2,.9+.5*Math.sin(p.t*9));}}}
function drawFlies(){for(const f of FF)if(f.on){const b=.5+.5*Math.sin(f.ph*6);if(b>.2)emit(f.x-VX,f.y-VY,1.4*b);}}
function drawParts(){for(const p of PART){const k=1-p.t/p.life,sx=p.x-VX,sy=p.y-VY;if(p.kind===0)emit(sx,sy,1.6*k);else{const xi=sx|0,yi=sy|0;if(xi<0||yi<0||xi>=W||yi>=H)continue;const i=yi*W+xi;RAD[i]=RAD[i]*(1-.5*k)+LT[i]*.45*k+.03*k;}}}
function drawRain(t,dt){
  if(!ST.rain)return;for(let n=0;n<16;n++)RAIN.push({x:(r32()%W),y:(r32()%H),t:0});
  let n=0;for(const d of RAIN){d.t+=dt;if(d.t>.16)continue;const i=d.y*W+d.x,L=LT[i];if(d.t<.06)RAD[i]+=L*1.1+.01;else{for(const [u,v] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=d.x+u,yy=d.y+v;if(xx>=0&&yy>=0&&xx<W&&yy<H)RAD[yy*W+xx]+=LT[yy*W+xx]*.5;}}RAIN[n++]=d;}RAIN.length=n;
}
function drawBoss(t){
  const B=BOSS;if(!B.on)return;const r=B.r+6,sx=B.x-VX,sy=B.y-VY;
  for(let y=Math.max(0,Math.floor(sy-r));y<=Math.min(H-1,Math.ceil(sy+r));y++)for(let x=Math.max(0,Math.floor(sx-r));x<=Math.min(W-1,Math.ceil(sx+r));x++){const m=bossMask(x+VX,y+VY);if(m<1)VOID[y*W+x]=Math.min(VOID[y*W+x],m);}
  /* the eye: a slit that opens */
  const e=B.eye>0?Math.min(1,B.eye*2):0,ew=Math.round(7*e),glow=B.hurt>0?2.2:1.4;
  if(ew>0)for(let i=-ew;i<=ew;i++){const hh=Math.round(2.4*e*Math.sqrt(1-(i/(ew+1))**2));for(let j=-hh;j<=hh;j++)emit(sx+i,sy+j,(Math.abs(j)<1&&Math.abs(i)<2?2.2:.9)*glow*(B.dead?Math.max(0,1-B.dead):1));}
  else for(let i=-5;i<=5;i++)emit(sx+i,sy,.18);
}
/* ---------- the whole view ---------- */
function renderNight(t,dt){
  /* the camera leads a little toward the lantern's beam */
  const lead=12*P.beamK+4;CAM.tx=clamp(P.x-W/2+Math.cos(P.aim)*lead,0,WW-W);CAM.ty=clamp(P.y-H/2+Math.sin(P.aim)*lead*.7,0,WH-H);
  CAM.x+=(CAM.tx-CAM.x)*Math.min(1,dt*5);CAM.y+=(CAM.ty-CAM.y)*Math.min(1,dt*5);
  const sh=S.shake>0&&!reduce?S.shake*S.shake*2.2:0;VX=Math.round(CAM.x+(sh?rnd(-sh,sh):0));VY=Math.round(CAM.y+(sh?rnd(-sh,sh):0));
  composeWorld(t);
  drawLamps(t);drawPicks(t);drawPlayer();drawMoths(t);drawRain(t,dt);drawParts();
  drawShades(t);drawSnuffers(t);drawBoss(t);drawFlies();
  for(let i=0;i<N;i++){RAD[i]=RAD[i]*VOID[i]+EMB[i];}
  if(S.mode==='dying'){const k=clamp(S.t/1.8,0,1);for(let i=0;i<N;i++)RAD[i]*=1-k*.92;}
  quantize();
}
/* =====================================================================================
   14. THE TITLE: the word LANTERN stands in raised iron letters on a cobbled floor, and a
       lantern on a chain swings past them; the letters' shadows sweep across the stones
   ===================================================================================== */
const TT={t:0};
function titleSetup(){
  MAP=Array.from({length:12},()=>'.'.repeat(24));MW=24;MH=12;worldAlloc(W,H);CANOPY=new Uint8Array(WN);LAMPS.length=0;
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++)dressGround(cx,cy,'road',5);
  const sc=3,word='LANTERN',x0=Math.round((W-(word.length*6*sc-sc))/2),y0=20;TT.let=new Uint8Array(WN);
  for(let k=0;k<word.length;k++){const g5=G5[word[k]];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((g5[r]>>(4-c))&1)
    for(let j=0;j<sc;j++)for(let i=0;i<sc;i++){const x=x0+k*6*sc+c*sc+i,y=y0+r*sc+j,q=y*WW+x;OCC[q]=2;MAT[q]=M_WALL;TT.let[q]=1;}}
  /* raised iron letters: a bevel that catches the light on the side it comes from */
  for(let i=0;i<WN;i++)if(TT.let[i]){const up=!TT.let[i-WW],dn=!TT.let[i+WW],lf=!TT.let[i-1],rt=!TT.let[i+1];ALB[i]=up?250:dn?120:(lf||rt)?190:205;}
  SH.length=0;MOTHS.length=0;SNUF.length=0;FLARES.length=0;PART.length=0;FF.length=0;PICKS.length=0;BOSS.on=false;GREAT.on=false;
  ST=Object.assign({},NIGHTS[0],{fog:.3,rain:0,moon:1.4,amb:.01});TT.t=0;
}
const TSM=mkShadow(512);
function renderTitle(t){
  VX=0;VY=0;LB.fill(0);EMB.fill(0);VOID.fill(1);
  /* a lantern carried slowly round the word: its shadows wheel across the cobbles */
  const ang=t*.42-1.2,lx=96+Math.cos(ang)*86,ly=40+Math.sin(ang)*34,sw=0,R=120,I=1.35*(.95+.05*Math.sin(t*13));
  castShadow(TSM,lx,ly,R,2,.5);addLight(lx,ly,R,I,{S:TSM,src:1.6,hot:1.3});
  const fogK=ST.fog,moonK=ST.moon*.055;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,w=y*WW+x;
    if(TT.let[w]){/* the face of a letter is above the floor: no shadow falls on it, only the fall-off of the flame */
      const d=Math.hypot(x+.5-lx,y+.5-ly),f=Math.max(0,1-d*d/(R*R));RAD[i]=I*f*f*(1+1.3/(1+d*.2))*ALB[w]/255*.95+.05;LT[i]=RAD[i];continue;}
    const L=LB[i];LT[i]=L;const fog=FOGT[((y+(t*2|0))&127)*FOGS+((x+(t*4|0))&127)]*fogK;RAD[i]=L*(ALB[w]/255+fog*.3)+MOON[w]*moonK/255;}
  emit(lx,ly,2.6);emit(lx+1,ly,1);emit(lx,ly+1,.9);emit(lx-1,ly,.7);emit(lx,ly-1,.7);
  for(let i=0;i<N;i++)RAD[i]+=EMB[i];quantize();
}
/* =====================================================================================
   15. THE HUD AND THE SCREENS — straight into the nibbles
   ===================================================================================== */
function drawHUD(){
  dimRect(0,0,W,7,.12);
  const blink=(S.clock*4|0)&1,lowOil=P.oil<25;
  txt3('OIL',1,1,lowOil&&blink?15:9);const bw=26,n=Math.round(bw*P.oil/OIL_MAX);for(let i=0;i<bw;i++){const v=i<n?(lowOil&&blink?15:i<n-1?11:14):2;dot(14+i,1,v);dot(14+i,2,v);dot(14+i,3,v);}
  for(let k=0;k<3;k++){const on=k<P.flares;dot(44+k*4,1,on?13:2);dot(44+k*4,2,on?9:2);dot(44+k*4,3,on?9:2);}
  for(let k=0;k<Math.min(5,P.lives);k++){dot(58+k*4,1,12);dot(58+k*4,2,15);dot(57+k*4,2,7);dot(59+k*4,2,7);dot(58+k*4,3,9);}
  /* the lamps of the night: a little lamp each, lit or dark */
  const nl=LAMPS.length,lx0=Math.round(W/2+6-nl*2.5);
  for(let k=0;k<nl;k++){const L=LAMPS[k],x=lx0+k*5,on=L.lit,v=on?15:3;dot(x,1,v);dot(x+1,1,v);dot(x,2,on?12:3);dot(x+1,2,on?12:3);dot(x-1,1,on?5:2);dot(x+2,1,on?5:2);dot(x,3,on?6:4);dot(x+1,3,on?6:4);dot(x,4,4);dot(x+1,4,4);}
  txt3(fmt(S.score),W-2,1,13,'r');
  if(BOSS.on&&!BOSS.dead){const bw2=60,x0=Math.round(W/2-bw2/2),y0=H-5;dimRect(x0-4,y0-8,bw2+8,12,.15);txt3('THE LONG NIGHT',W/2,y0-7,10,'c');const k=BOSS.hp/BOSS.hp0;for(let i=0;i<bw2;i++){dot(x0+i,y0,i<k*bw2?13:2);dot(x0+i,y0+1,i<k*bw2?9:2);}}
  /* where the nearest dark lamp lies, when it is off the panel */
  let tl=null,bd=1e9;for(const L of LAMPS)if(!L.lit){const d=Math.hypot(L.x-P.x,L.y-P.y);if(d<bd){bd=d;tl=L;}}
  if(tl&&!P.dead){const sx=tl.x-VX,sy=tl.y-VY;if(sx<2||sy<9||sx>W-3||sy>H-3){const a=Math.atan2(sy-H/2,sx-W/2),cx=W/2+Math.cos(a)*(W/2-5),cy=clamp(H/2+Math.sin(a)*(H/2-5),11,H-4);
    if(((S.clock*3)|0)&1)for(let k=0;k<4;k++){const px=cx-Math.cos(a)*k,py=cy-Math.sin(a)*k,w=3-k;for(let j=-w;j<=w;j++)dot(px+Math.cos(a+Math.PI/2)*j*.6,py+Math.sin(a+Math.PI/2)*j*.6,k===0?15:10,1);}}}
}
function drawPops(){for(const p of S.pops){const k=p.t/1.1;txt3(p.txt,Math.round(p.x-VX),Math.round(p.y-VY-k*10),Math.round(13*(1-k*k)),'c',1);}}
function drawCalls(){
  let y=10;for(const c of S.calls){if(c.t>c.dur)continue;const reveal=Math.min(1,c.t/.18),s=c.txt,n=Math.ceil(s.length*reveal),from=Math.floor((s.length-n)/2);
    const shown=s.split('').map((ch,i)=>i>=from&&i<from+n?ch:' ').join('');const v=c.t>c.dur-.35&&((c.t*16|0)&1)?6:15;otxt5(shown,W/2,y,v,1,'c');y+=10;}
  if(S.big){const b=S.big;{const a=b.t<.25?b.t/.25:b.t>2.8?(3.2-b.t)/.4:1,sc=tw5(b.title,2)<=W-6?2:1,y=30;
    dimRect(0,y-5,W,sc*7+20,.35);const v=Math.round(15*a);otxt5(b.title,W/2,y,v,sc,'c');if(b.sub)otxt3(b.sub,W/2,y+sc*7+5,Math.round(11*a),'c');}}
}
function panelBox(x,y,w,h){for(let j=0;j<h;j++)for(let i=0;i<w;i++)dot(x+i,y+j,(i===0||j===0||i===w-1||j===h-1)?6:0);}
/* the classic DMD wipes and dissolves between screens */
const SNAP=new Uint8Array(N);let SNAPT=-1;
function snap(){SNAP.set(NB);SNAPT=0;}
function dissolve(dt){if(SNAPT<0)return;SNAPT+=dt;const k=SNAPT/.45;if(k>=1){SNAPT=-1;return;}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const th=(BAYER[((y&3)<<2)|(x&3)]+.5);if(th>k){const i=y*W+x;NB[i]=SNAP[i];}}}
function sunrise(t){
  /* a dithered dawn: a band of light climbs from the bottom edge and rays wheel out of the sun */
  const hy=H-Math.min(H*.55,t*40),sx=W/2;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;let v=0;if(y>hy){v=4+(y-hy)/(H-hy+1)*9;}
    else{const a=Math.atan2(y-hy-8,x-sx),r=Math.hypot(x-sx,y-hy-8);const ray=((a*9+t*.6)%1+1)%1<.5;v=ray?Math.max(0,7-r*.06):Math.max(0,3-r*.04);}
    const lvl=Math.round(v+BAYER[((y&3)<<2)|(x&3)]);NB[i]=Math.max(NB[i]>>1,clamp(lvl,0,15));}
  for(let x=0;x<W;x++)dot(x,Math.round(hy),15);
}
function drawTally(){
  const T_=S.tally,w=150,x=Math.round(W/2-w/2),y=12,h=T_.rows.length*7+26;panelBox(x,y,w,h);
  otxt5('DAWN',W/2,y+3,15,1,'c');
  T_.rows.forEach((r,i)=>{if(i>=T_.shown)return;const yy=y+14+i*7;txt3(r[0],x+5,yy,9);txt3(r[1],x+w*.6,yy,13,'c');if(r[2])txt3('+'+fmt(r[2]),x+w-5,yy,15,'r');});
  txt3('SCORE',x+5,y+h-8,11);txt3(fmt(S.score),x+w-5,y+h-8,15,'r');
  if(T_.paid>=T_.pay&&T_.shown>=T_.rows.length&&((S.clock*2|0)&1))txt3(S.night<NIGHTS.length-1?(touchy?'TAP FOR THE NEXT NIGHT':'PRESS START: THE NEXT NIGHT'):(touchy?'TAP':'PRESS START'),W/2,H-6,12,'c');
}
function drawEntry(y){
  const e=S.entry;if(!e)return;txt3('A NEW HIGH SCORE. YOUR INITIALS',W/2,y,10,'c');
  for(let k=0;k<3;k++){const x=W/2-14+k*12,sel=k===e.i;txt5(ALPHA[e.ch[k]],x,y+9,sel&&((S.clock*4|0)&1)?15:sel?11:13);if(sel){dot(x,y+18,15);dot(x+4,y+18,15);for(let i=0;i<5;i++)dot(x+i,y+18,12);}}
  txt3(touchy?'STICK CHANGES  BEAM SETS':'UP DOWN CHANGE  SPACE SETS',W/2,y+23,7,'c');
}
function drawTable(y0){
  otxt5('HIGH SCORES',W/2,y0,15,1,'c');
  S.hi.forEach((r,i)=>{const y=y0+12+i*9,v=i===0?15:11;txt5((i+1)+'',36,y,v);txt5(r[0],52,y,v);txt5(fmt(r[1]),W-36,y,v,1,'r');});
}
const RULES=[
  ['THE SHADES WALK IN THE DARK','LIGHT FREEZES THEM','THE BEAM BURNS THEM'],
  ['STAND BY A DARK LAMP TO LIGHT IT','LIT LAMPS FILL YOUR OIL','LIGHT THEM ALL TO CALL THE DAWN'],
  ['MOTHS DRINK OIL. SNUFFERS KILL LAMPS','A FLARE BURNS ALL THAT IS NEAR','THE OIL RUNS OUT: THE DARK TAKES YOU']];
function drawRules(t){
  const pg=Math.min(2,Math.floor(t/3)),r=RULES[pg];otxt5('HOW TO KEEP THE LIGHT',W/2,10,15,1,'c');
  r.forEach((l,i)=>txt3(l,W/2,32+i*12,i===0?14:11,'c'));
  txt3((pg+1)+'/3',W/2,H-8,6,'c');
}
