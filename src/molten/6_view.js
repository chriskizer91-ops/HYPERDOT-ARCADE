/* =====================================================================================
   SPRITE LAYER — machines and creatures drawn per frame into SPR (lit pixels or self-lit)
   ===================================================================================== */
const BBL=blackbodyLUT();
function bbAt(Tc){const f=clamp((Tc+40)/2080,0,1)*255,i=Math.min(254,f|0),k=f-i,o=i*4;return [BBL[o]+(BBL[o+4]-BBL[o])*k,BBL[o+1]+(BBL[o+5]-BBL[o+1])*k,BBL[o+2]+(BBL[o+6]-BBL[o+2])*k];}
/* encode linear HDR light as an sRGB colour plus an intensity in alpha (decoded x6 in the shaders) */
function sEmit(x,y,r,g2,b){if(x<0||y<0||x>=W||y>=H)return;const mx=Math.max(r,g2,b,1e-4),o=(y*W+x)*4;SPR[o]=255*Math.pow(r/mx,1/2.2);SPR[o+1]=255*Math.pow(g2/mx,1/2.2);SPR[o+2]=255*Math.pow(b/mx,1/2.2);SPR[o+3]=clamp(Math.round(mx/6*254),1,254);}
function sLit(x,y,r,g2,b){if(x<0||y<0||x>=W||y>=H)return;const o=(y*W+x)*4;SPR[o]=r;SPR[o+1]=g2;SPR[o+2]=b;SPR[o+3]=255;}
function drawFurnace(){
  const x0=FURN_X-6;
  for(let y=1;y<5;y++){const hw=6-y;for(let x=FURN_X-hw-2;x<=FURN_X+hw+2;x++){const edge=Math.abs(x-FURN_X)>=hw+1;sLit(x,y,edge?70:46,edge?64:40,edge?62:40);}}
  const hot=CR.refill?1:.55+.1*Math.sin(S.clock*3);
  for(let x=FURN_X-2;x<=FURN_X+2;x++)for(let y=3;y<5;y++){const c=bbAt(1250+hot*330-(Math.abs(x-FURN_X)>1?120:0)-(y===3?80:0));sEmit(x,y,c[0],c[1],c[2]);}
  if(CR.refill){for(let y=5;y<12;y++){const w=Math.sin(S.clock*17+y*1.3)>.2?1:0,c=bbAt(1500+(r32()&63));sEmit(FURN_X,y,c[0],c[1],c[2]);if(w)sEmit(FURN_X+(y&1?1:-1),y,c[0]*.5,c[1]*.5,c[2]*.5);}}
}
function drawCrucible(){
  const x=Math.round(CR.x),fz=CR.frozen>0;
  /* trolley: two wheels riding on the rail and a crossbar under it */
  for(const wx of [x-7,x+5])for(let y=2;y<5;y++)for(let k=0;k<3;k++){const hub=k===1&&y===3;sLit(wx+k,y,hub?60:y===2?170:110,hub?56:y===2?168:106,hub?60:y===2?176:114);}
  for(let k=-6;k<=6;k++)sLit(x+k,7,96,90,88);sLit(x,PIV_Y,140,134,128);
  /* the ladle, rotated by its swing about the pivot; the molten surface stays level */
  const a=CR.sw,ca=Math.cos(a),sa=Math.sin(a),k=CR.fill/CR.cap,surf=PIV_Y+3.4+(1-k)*7.4;
  for(let py=PIV_Y;py<=PIV_Y+16;py++)for(let px=x-14;px<=x+14;px++){
    const dx=px+.5-CR.x,dy=py+.5-PIV_Y,u=dx*ca+dy*sa,v=-dx*sa+dy*ca-2.4;   /* ladle space: v from the rim (0) to the base (10) */
    if(v<-2.4||v>10.6)continue;
    if(v<0){if((Math.abs(u+(v+2.4)*1.6-3.8)<.6||Math.abs(u-(v+2.4)*1.6+3.8)<.6))sLit(px,py,120,114,110);continue;}   /* bail */
    const hw=9-v*.34;if(Math.abs(u)>hw){if(v>9.6&&Math.abs(u)<1.6)sLit(px,py,110,100,96);continue;}
    const edge=Math.abs(u)>hw-1.3||v>9.4,rim=v<1.1;
    if(edge||rim){if(fz&&(r32()&3)===0)sLit(px,py,200,236,255);else if(rim)sLit(px,py,150,138,130);
      else{const c=bbAt(600+k*230+(v>7.5?70:0)+(Math.abs(u)>hw-.6?-60:0));sEmit(px,py,c[0]+.06,c[1]+.05,c[2]+.05);}}
    else if(py+.5>=surf){const c=bbAt(py<surf+1.2?1570:1440+(r32()&127));sEmit(px,py,c[0],c[1],c[2]);}
    else{const c=bbAt(640+(v>6?80:0));sEmit(px,py,c[0]*.8+.02,c[1]*.8+.015,c[2]*.8+.015);}
  }
  /* the nozzle under the base glows while it runs */
  const nx=Math.round(CR.nx),ny=Math.round(CR.ny);if(CR.rod>.3&&CR.fill>1){const c=bbAt(1560);sEmit(nx,ny,c[0],c[1],c[2]);}else sLit(nx,ny,80,74,72);
}
function drawHeart(){
  const H_=HEART,cy=COREY(),ign=H_.ign,Tc=(880+H_.heat*6.6+H_.beat*110+H_.pulse*160)*ign+AMB_T*(1-ign);
  /* the pedestal: hot iron lit by its own core — rims catch the glow, a forged band, rivets */
  const cc=bbAt(Math.max(900,Tc)),cm=Math.max(cc[0],cc[1],cc[2],1e-3),cr=cc[0]/cm,cg=cc[1]/cm,cb=cc[2]/cm,lum=ign*(.35+.65*H_.heat/100)*(1+H_.beat*.25);
  for(let n=0;n<H_.cells.length;n++){const i=H_.cells[n],x=i%W,y=(i/W)|0,dy=HY-1-y,k=H_.k[n],e=H_.isEdge[n];
    let b=(.012+.17*k*k)*(e?2.1:1)*lum;const band=dy===3||dy===13,riv=(dy===2||dy===12)&&((x+dy)&3)===0;
    if(band)b*=.4;if(riv)b=Math.max(b*2.6,.06);
    const fr=H_.frost>.05&&hash2(x,y,7)<H_.frost*.6;if(fr){sLit(x,y,170,215,245);continue;}
    sEmit(x,y,b*(.25+.75*cr),b*(.2+.5*cg),b*(.16+.3*cb));}
  const vc=bbAt(Tc-300);for(const sx of [-9,-6,6,9])for(let y=HY-8;y<=HY-5;y++)sEmit(HX+sx,y,vc[0]*.7,vc[1]*.7,vc[2]*.7);
  /* the core: a sphere of white heat, brighter at its heart, frosted while the Rime cling */
  for(let y=cy-CORER;y<=cy+CORER;y++)for(let x=HX-CORER;x<=HX+CORER;x++){const d=Math.hypot(x-HX,y-cy);if(d>CORER+.2)continue;
    if(H_.frost>.05&&hash2(x,y,(S.clock*2)|0)<H_.frost*.55*(d/CORER)){sLit(x,y,190,230,255);continue;}
    const sw=Math.sin(S.clock*2.2+Math.atan2(y-cy,x-HX)*3+d)*.5+.5,c=bbAt(Tc+(CORER-d)*34-sw*50*(d/CORER));sEmit(x,y,c[0],c[1],c[2]);}
}
function drawBombs(){for(const b of BOMBS){const x=Math.round(b.x),y=Math.round(b.y);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const c=bbAt(i||j?1350:1650);sEmit(x+i,y+j,c[0],c[1],c[2]);}
  if((r32()&1)===0)spawnP(b.x,b.y,rnd(-15,15),rnd(-40,-10),EMBER,1450,rnd(.2,.5),0);}}
function drawLights(){for(const l of LIGHTS){const k=1-l.t/l.dur,c=l.c;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const w=(i||j)?.45:1;sEmit(Math.round(l.x)+i,Math.round(l.y)+j,c[0]/255*5*k*w,c[1]/255*5*k*w,c[2]/255*5*k*w);}}}
function drawSprites(){
  SPR.fill(0);
  if(S.mode!=='title')drawHeart();
  drawRime();drawBoss();drawFurnace();drawCrucible();drawBombs();drawLights();
}

/* =====================================================================================
   THE TITLE: the word MOLTEN is cast in iron cells of the simulation itself; a heat front
   sweeps along it, the hottest letters shed drops into a molten pool, the pool lights it
   ===================================================================================== */
const TITLE={cells:[],bottom:[],pool:[],t:0,poolY:160};
function titleSetup(){
  ST=STAGES[0];AMB_T=16;clearGrid();PROT.fill(0);EN.length=0;BOMBS.length=0;LIGHTS.length=0;BOSS.on=false;HEART.cells=[];HEART.edge=[];heartReset();HEART.ign=1;crReset(true);CR.x=FURN_X;
  Object.assign(SU,{uTint:[.55,.42,.36],uBackA:[.032,.024,.022],uBackB:[.082,.06,.05],uCryst:[1.1,.6,.22],uIce:[.55,.78,.95]});
  for(let i=0;i<N;i++)M[i]=ROCK;
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const dx=(x-160)/154,dy=(y-96)/86,n=(fbm(x*.06,y*.06,5)-.5)*.35;if(dx*dx+dy*dy<1+n||y<GAL)M[y*W+x]=AIR;}
  for(let x=2;x<W-2;x++){M[RAILY*W+x]=RAIL;M[(RAILY+1)*W+x]=RAIL;}
  for(const px of [24,96,224,296])for(let y=1;y<RAILY;y++)M[y*W+px]=RAIL;
  /* the chamber's curved floor is the basin: flood it with lava */
  TITLE.pool=[];for(let y=TITLE.poolY+4;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(M[i]===AIR){M[i]=LAVA;T[i]=1420;TITLE.pool.push(i);}}
  /* the letters */
  TITLE.cells=[];TITLE.bottom=[];const sc=5,word='MOLTEN',x0=Math.round((W-(word.length*6*sc-sc))/2),y0=34;
  for(let k=0;k<word.length;k++){const gl5=G5[word[k]];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((gl5[r]>>(4-c))&1)
    for(let j=0;j<sc;j++)for(let i=0;i<sc;i++){const x=x0+k*6*sc+c*sc+i,y=y0+r*sc+j,q=y*W+x;M[q]=IRON;T[q]=820;TITLE.cells.push(q);}}
  for(const q of TITLE.cells)if(M[q+W]!==IRON)TITLE.bottom.push(q);
  for(let n=0;n<14;n++){for(let tries=0;tries<200;tries++){const x=8+(rf()*(W-16))|0,y=GAL+4+(rf()*(H-GAL-30))|0,i=y*W+x;if(M[i]===ROCK&&(M[i-1]===AIR||M[i+1]===AIR)){M[i]=CRYST;if(M[i-W]===ROCK)M[i-W]=CRYST;break;}}}
  for(let x=0;x<W;x++){M[x]=BED;M[(H-1)*W+x]=BED;}for(let y=0;y<H;y++){M[y*W]=BED;M[y*W+W-1]=BED;}
  TITLE.t=0;
}
function titleStep(dt){
  TITLE.t+=dt;const sweep=((TITLE.t*64)%470)-75;
  for(const q of TITLE.cells){const x=q%W,d=(x-sweep)/36,tg=780+450*Math.exp(-d*d)+36*Math.sin(TITLE.t*2.3+x*.07);T[q]+=(tg-T[q])*dt*2.4;M[q]=IRON;}
  for(const q of TITLE.bottom)if(T[q]>1120&&(r32()&255)<5&&M[q+W]===AIR)spawnP(q%W+.5,(q/W|0)+1.3,rnd(-2,2),rnd(6,24),LAVA,1460,9,0);
  /* the lake churns: slow convection cells of white heat between cooler crust plates */
  const tt=TITLE.t;
  for(const q of TITLE.pool){const m=M[q],x=q%W,y=(q/W)|0,surf=M[q-W]!==LAVA;
    const n=vnoise(x*.07+tt*.25,y*.18-tt*.1,3)*.6+vnoise(x*.19-tt*.4,y*.3,5)*.4,tg=surf?1060+n*330:1180+n*330;
    if(m===LAVA)T[q]+=(tg-T[q])*.12;else if(m===IRON||m===SLAG){T[q]=1400;}}
  if((r32()&3)===0)spawnP(rnd(60,W-60),TITLE.poolY+4,rnd(-12,12),rnd(-70,-25),EMBER,1500,rnd(.6,1.8),0);
  CR.refill=true;CR.x+=(FURN_X-CR.x)*dt*2;
}

/* =====================================================================================
   HUD — drawn on a transparent W x H canvas that the LED pass lays over the world
   ===================================================================================== */
function panel(x,y,w,h,edge){g.fillStyle='rgba(10,6,6,.8)';g.fillRect(x,y,w,h);g.fillStyle=edge||'rgba(255,150,60,.55)';g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);g.fillRect(x,y,1,h);g.fillRect(x+w-1,y,1,h);}
const HEATC=['#3a1408','#6a1a06','#a42808','#d84a0c','#ff7a1a','#ffaa3a','#ffd070','#fff0c0'];
function heatBar(x,y,w,k,blink){
  g.fillStyle='rgba(0,0,0,.7)';g.fillRect(x-1,y-1,w+2,6);const n=Math.round(w*clamp(k,0,1));
  for(let i=0;i<w;i+=2){const c=HEATC[Math.min(7,(i/w*8)|0)];g.fillStyle=i<n?(blink?'#ffffff':c):'#1c1416';g.fillRect(x+i,y,1,4);}
}
/* where the stream will land: a ballistic trace from the lip through the grid */
function aimPoint(){
  let x=CR.nx,y=CR.ny+.4,vx=CR.nvx,vy=21;const dt=1/60;
  for(let n=0;n<160;n++){vy+=GRAV*dt;const nx=x+vx*dt,ny=y+vy*dt,steps=Math.ceil(Math.max(Math.abs(nx-x),Math.abs(ny-y)))||1;
    for(let s=1;s<=steps;s++){const fx=x+(nx-x)*s/steps,fy=y+(ny-y)*s/steps,cx=fx|0,cy=fy|0;if(cx<1||cx>W-2||cy>H-2)return null;if(cy>GAL&&pBlock(LAVA,M[cy*W+cx]))return [cx,cy];}
    x=nx;y=ny;}
  return null;
}
function drawPlayHUD(){
  const blink=(S.clock*4|0)%2;
  otxt5(g,fmt(S.score),4,2,'#ffffff');
  for(let i=0;i<3;i++){const on=i<CR.bombs,x=5+i*7,y=12;g.fillStyle='#000';g.fillRect(x-1,y-1,6,6);g.fillStyle=on?'#ff8a30':'#2a1c1c';g.fillRect(x,y,4,4);if(on){g.fillStyle='#ffe0a0';g.fillRect(x+1,y+1,1,1);}}
  const cx=W/2,bw=74;otxt3(g,'FORGE',cx-bw/2-24,3,HEART.heat<30&&blink?'#ff5040':'#ffb070');heatBar(Math.round(cx-bw/2),3,bw,HEART.heat/100,HEART.hurtT>0&&blink);
  otxt3(g,Math.round(HEART.heat)+'%',cx+bw/2+4,3,'#ffe0c0');
  const left=EN.length+S.q.length+ST.waves.slice(S.wi).reduce((a,w)=>a+w[4],0);
  otxt3(g,(S.stage+1)+' '+ST.name,W-4,2,'#d8b8a8',1,'r');otxt3(g,'RIME '+left,W-4,9,'#9fe8ff',1,'r');
  /* the crucible's gauge */
  const k=CR.fill/CR.cap,x0=Math.round(CR.x)-7;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x0-1,23,16,3);
  for(let i=0;i<14;i++){g.fillStyle=i<k*14?(k<.15&&blink?'#ffffff':'#ffb040'):'#2a1814';g.fillRect(x0+i,24,1,1);}
  if(CR.refill)otxt3(g,'REFILL',Math.round(CR.x),27,'#ffd090',1,'c');else if(k<.08&&blink)otxt3(g,'EMPTY',Math.round(CR.x),27,'#ff8060',1,'c');
  if(CR.frozen>0&&blink)otxt3(g,'FROZEN',Math.round(CR.x),27,'#bfefff',1,'c');
  /* aim marker */
  const ap=aimPoint();if(ap&&!CR.refill){g.fillStyle=CR.pouring?'rgba(255,220,150,.55)':'rgba(255,170,90,.35)';g.fillRect(ap[0]-2,ap[1]-4,1,1);g.fillRect(ap[0]+2,ap[1]-4,1,1);g.fillRect(ap[0]-1,ap[1]-3,1,1);g.fillRect(ap[0]+1,ap[1]-3,1,1);g.fillRect(ap[0],ap[1]-2,1,1);}
  /* tunnel warnings */
  for(const w of S.warn){if(w.type==='KING')continue;const sides=w.side?[w.side]:[-1,1];for(const sd of sides){const ts=TUN.filter(t=>t.side===sd),t=ts[Math.min(w.tun,ts.length-1)];if(!t||!((S.clock*5|0)%2))continue;
    const x=sd<0?3:W-4,y=t.y-8;g.fillStyle='#9fe8ff';for(let i=0;i<4;i++)g.fillRect(x+(sd<0?i:-i),y-3+i,1,7-i*2);otxt3(g,'!',x+(sd<0?6:-8),y-2,'#ffffff');}}
  if(S.combo>1&&S.comboT>0)otxt3(g,'CHAIN x'+Math.min(8,S.combo),W/2,H-8,S.combo>4?'#ff5ad8':'#ffd040',1,'c');
  if(BOSS.on){const bw2=120,x1=Math.round(W/2-bw2/2),y1=13;otxt3(g,'THE HOAR KING',W/2,y1,'#bfefff',1,'c');g.fillStyle='rgba(0,0,0,.7)';g.fillRect(x1-1,y1+6,bw2+2,4);
    const kb=BOSS.cells/BOSS.cells0,kc=Math.max(0,(BOSS.coreHp/BOSS.coreHp0-.12)/.88);for(let i=0;i<bw2;i+=2){g.fillStyle=i<kb*bw2?'#7fd8ff':'#1a2a3a';g.fillRect(x1+i,y1+7,1,1);g.fillStyle=i<kc*bw2?'#ffffff':'#2a3440';g.fillRect(x1+i,y1+8,1,1);}}
}
function drawPops(){for(const p of S.pops){const a=clamp((1.1-p.t)*3,0,1);g.globalAlpha=a;otxt3(g,p.text,Math.round(p.x),Math.round(p.y-p.t*12),p.col,1,'c');g.globalAlpha=1;}}
function drawMsgs(){
  let y=Math.round(S.big?H*.3+24:H*.3);
  for(let i=S.msgs.length-1;i>=0;i--){const m=S.msgs[i],a=clamp((m.dur-m.t)*4,0,1);g.globalAlpha=a;otxt5(g,m.text,W/2,y-Math.round(m.t*8),m.col,1,'c');g.globalAlpha=1;y+=11;}
  if(S.big){const b=S.big,a=clamp((2.8-b.t)*3,0,1),slide=Math.round(Math.max(0,.18-b.t)*W*3);g.globalAlpha=a;
    otxt5(g,b.text,W/2+slide,Math.round(H*.3),[b.col,b.col,'#ffffff',b.col,b.col,b.col,b.col],2,'c',.1);if(b.sub)otxt3(g,b.sub,W/2-slide,Math.round(H*.3)+18,'#ffffff',1,'c');g.globalAlpha=1;}
}
const MENU=()=>['FIRE THE FORGE','HOW TO PLAY','LIGHT: '+QL[LQ]];
function menuRows(){const y0=110;return MENU().map((t,i)=>({t,y:y0+i*11}));}
function drawTitle(){
  otxt3(g,'HOLD THE FORGE AGAINST THE RIME',W/2,74,'#ffc8a0',1,'c');
  if(S.how>=0){drawHow();return;}
  for(const [i,r] of menuRows().entries()){const sel=i===S.menuI;
    if(sel){g.fillStyle='rgba(255,120,40,.22)';g.fillRect(Math.round(W/2-64),r.y-2,128,11);}
    otxt5(g,r.t,W/2,r.y,sel?'#ffffff':'#c09888',1,'c');if(sel&&(S.clock*3|0)%2){otxt5(g,'>',W/2-60,r.y,'#ff9a40');otxt5(g,'<',W/2+56,r.y,'#ff9a40');}}
  otxt3(g,'HI '+fmt(S.hi),4,H-8,'#c8a090');otxt3(g,'HYPERDOT ARCADE',W-4,H-8,'#c8a090',1,'r');
}
const HOW=[
  ['THE RIME ARE CREATURES OF ICE. THEY','MARCH ON THE FORGE HEART TO FREEZE IT.','','POUR MOLTEN IRON ON THEM FROM THE','CRUCIBLE. IRON COOLS INTO WALLS THAT','HOLD THEM BACK. LAVA THAT REACHES THE','HEART FEEDS IT.'],
  ['MOVE    A D / ARROWS / STICK / MOUSE','POUR    HOLD SPACE / CLICK / POUR','BOMB    X / RIGHT CLICK / BOMB','REFILL  PARK UNDER THE FURNACE','','STEAM KILLS AND IRON TOMBS SCORE MORE.','EVERY 14 MELTED EARNS A SLAG BOMB.']
];
function drawHow(){
  const p=HOW[S.how],w=172,h=p.length*7+22,x=Math.round(W/2-w/2),y=88;panel(x,y,w,h);
  p.forEach((l,i)=>txt3(g,l,x+6,y+6+i*7,'#f0e0d8'));otxt3(g,(S.how+1)+'/2  '+(touchy?'TAP':'PRESS START'),W/2,y+h-9,'#ffb070',1,'c');
}
function drawIntro(){
  const t=S.t,a=clamp(t*2.5,0,1)*clamp((5-t)*2,0,1);g.globalAlpha=a;
  otxt3(g,'STAGE '+(S.stage+1),W/2,44,'#ffb070',1,'c');otxt5(g,ST.name,W/2,52,['#ffffff','#fff0d0','#ffd090','#ffb060','#ff8a40','#e05a20','#a03010'],2,'c',.1);
  otxt3(g,ST.sub,W/2,70,'#e8c8b8',1,'c');
  ST.hint.forEach((l,i)=>otxt3(g,l,W/2,84+i*7,'#c8e8ff',1,'c'));
  if(t>3.2)otxt3(g,'THE RIME APPROACH',W/2,112,(S.clock*4|0)%2?'#9fe8ff':'#ffffff',1,'c');
  g.globalAlpha=1;
}
function drawTally(){
  const T_=S.tally,w=188,x=Math.round(W/2-w/2),y=34,h=T_.rows.length*9+40;
  panel(x,y,w,h);otxt5(g,'THE FORGE HOLDS',W/2,y+5,GR.volt,1,'c');
  T_.rows.forEach((r,i)=>{if(i>=T_.shown)return;const yy=y+18+i*9;txt3(g,r[0],x+6,yy,'#e0c8c0');txt3(g,r[1],x+w*.62,yy,'#ffffff');if(r[2])txt3(g,'+'+fmt(r[2]),x+w-6,yy,'#ffd040',1,'r');});
  const yy=y+h-13;txt3(g,'SCORE',x+6,yy,'#ffb070');txt5(g,fmt(S.score),x+w-6,yy-1,'#ffffff',1,'r');
  if(T_.paid>=T_.pay&&T_.shown>=T_.rows.length&&(S.clock*2|0)%2)otxt3(g,(S.stage<STAGES.length-1?'NEXT  '+STAGES[S.stage+1].name:'THE LAST FIRE')+'   '+(touchy?'TAP':'PRESS START'),W/2,y+h+4,'#ffb070',1,'c');
}
function drawCenter(title,col,lines){
  g.fillStyle='rgba(6,4,8,.55)';g.fillRect(0,0,W,H);otxt5(g,title,W/2,Math.round(H*.22),col,3,'c',.1);
  lines.forEach((l,i)=>{if(l)otxt5(g,l[0],W/2,Math.round(H*.22)+31+i*11,l[1],1,'c');});
}
function drawOverlay(){
  const m=S.mode;
  if(m==='play'||m==='intro'&&S.t>4.2||m==='frozen')drawPlayHUD();
  if(!S.paused){drawPops();if(m==='intro')drawIntro();if(m!=='title')drawMsgs();}   /* the pause card stands alone */
  if(m==='title')drawTitle();
  else if(m==='demo'){otxt5(g,'MOLTEN',W/2,3,GR.volt,1,'c');if((S.clock*2|0)%2)otxt3(g,touchy?'TAP TO PLAY':'PRESS START',W/2,H-9,'#ffd090',1,'c');otxt3(g,'DEMO  '+ST.name,4,H-9,'#a08880');}
  else if(m==='tally')drawTally();
  else if(m==='frozen'){const blink=(S.clock*3|0)%2;if(S.t>1.6)drawCenter('FROZEN',GR.cyan,[['THE FORGE IS COLD','#d8f0ff'],null,['CONTINUE?  '+Math.max(0,Math.ceil(S.count-.01)),'#ffd040'],[blink?(touchy?'TAP TO CONTINUE':'PRESS START'):'','#ffb070'],['SCORE RESETS ON CONTINUE','#a09098']]);}
  else if(m==='over')drawCenter('GAME OVER',GR.steel,[[fmt(S.score),'#ffffff'],[S.tickets+' TICKETS','#ffd040'],[S.newHi&&(S.clock*4|0)%2?'NEW HIGH SCORE':'','#6aff5a'],['HI '+fmt(S.hi),'#a09098']]);
  else if(m==='ending'&&S.t>1.5)drawCenter('FORGE ETERNAL',GR.volt,[['THE WINTER UNDER THE WORLD IS WATER','#ffe0c8'],[fmt(S.score),'#ffffff'],[S.tickets+' TICKETS','#ffd040'],[S.newHi&&(S.clock*4|0)%2?'NEW HIGH SCORE':'','#6aff5a']]);
  if(S.paused){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,W,H);otxt5(g,'PAUSED',W/2,Math.round(H*.3),GR.steel,2,'c');
    ['RESUME',EMBED?'EXIT':'QUIT TO TITLE'].forEach((t,i)=>{const y=Math.round(H*.55)+i*12,sel=i===S.pauseI;otxt5(g,(sel?'> ':'  ')+t+(sel?' <':'  '),W/2,y,sel?'#ffffff':'#a09098',1,'c');});}
}

/* =====================================================================================
   FRAME LOOP — fixed 60 Hz simulation, one render per display frame
   ===================================================================================== */
const UIP={};
function edges(c){c.m=K('KeyM');const e={};for(const k of ['ok','back','pause','a','b','u','d','m']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}if(e.m)toggleSound();return e;}
function rowAt(y){for(const [i,r] of menuRows().entries())if(y>=r.y-3&&y<=r.y+9)return i;return -1;}
function menuAct(i){
  if(i===0)APP_start();else if(i===1){S.how=0;SFX.confirm();}
  else{setLight((LQ+2)%3);SFX.confirm();}
}
function tick(dt){
  const c=readCtl(),e=edges(c),tap=PTR.pressed;S.t+=dt;
  if((S.mode==='play'||S.mode==='intro')&&e.pause){setPause(!S.paused);return;}
  if(S.paused){
    if(e.u||e.d){S.pauseI^=1;SFX.move();}
    const ti=tap?(PTR.y>H*.55-3&&PTR.y<H*.55+9?0:PTR.y>H*.55+9&&PTR.y<H*.55+21?1:-1):-1;
    if(e.ok||ti>=0){const i=ti>=0?ti:S.pauseI;if(i===0)setPause(false);else{setPause(false);if(EMBED)ARC.exit();APP_attract();}}
    return;
  }
  const m=S.mode;
  if(m==='title'||m==='demo'){
    if(m==='title'&&S.how>=0){if(e.ok||tap){S.how++;SFX.move();if(S.how>1)S.how=-1;}else if(e.back){S.how=-1;SFX.back();}}
    else if(m==='title'){if(e.u){S.menuI=(S.menuI+2)%3;SFX.move();}if(e.d){S.menuI=(S.menuI+1)%3;SFX.move();}
      if(tap){const i=rowAt(PTR.y);if(i>=0){S.menuI=i;menuAct(i);return;}}
      else if(e.ok){menuAct(S.menuI);if(S.mode!=='title')return;}
      else if(e.back&&EMBED)ARC.exit();}
    else if(e.ok||tap){APP_attract();return;}
    if(m==='title'){worldStep(dt,{x:0,pour:false},false);if(S.t>16&&S.how<0)startDemo();}
    else{const ap=autopilot();waveStep(dt);worldStep(dt,ap,true);if(HEART.heat<=0||S.t>48||stageDone())APP_attract();}
  }
  else if(m==='intro'){
    if(S.t>=5.2){S.mode='play';S.t=0;SFX.go();bigMsg('THE RIME APPROACH','#9fe8ff');}
    else if((e.ok||tap)&&S.t<4.2)S.t=4.2;
    worldStep(dt,{x:c.x,tx:c.tx,pour:false},false);
  }
  else if(m==='play'){
    const ctl={x:c.x,tx:c.tx,pour:c.a||c.pourP,bomb:e.b};
    if(window.__auto)Object.assign(ctl,autopilot());
    waveStep(dt);worldStep(dt,ctl,true);
    if(HEART.heat<=0)heartFroze();
    else if(stageDone()){S.clearT+=dt;if(S.clearT>2.2)startTally();}
  }
  else if(m==='tally'){
    worldStep(dt,{x:0,pour:false},false);const T_=S.tally;T_.t+=dt;
    if(T_.shown<T_.rows.length){if(T_.t>.42){T_.t=0;T_.shown++;SFX.tick();}}
    else if(T_.paid<T_.pay){const k=Math.min(T_.pay-T_.paid,Math.max(50,Math.round(T_.pay*dt*.9)));T_.paid+=k;addScore(k);SFX.tick();}
    if(e.ok||tap){if(T_.shown<T_.rows.length||T_.paid<T_.pay){addScore(T_.pay-T_.paid);T_.paid=T_.pay;T_.shown=T_.rows.length;}else nextStage();}
    else if(S.t>16&&T_.paid>=T_.pay)nextStage();
  }
  else if(m==='frozen'){
    /* the cold spreads out from the dead heart and everything sets */
    const r=S.t*70;for(let n=0;n<1400;n++){const i=(r32()%N);const x=i%W,y=(i/W)|0;if(Math.hypot(x-HX,y-HY)<r){if(T[i]>-20)T[i]-=40;if(M[i]===WATER)M[i]=ICE;}}
    worldStep(dt,{x:0,pour:false},false);S.count-=dt;if(S.t>1.6)S.big=null;   /* the card takes over from the banner */
    if(S.t>1.6&&(e.ok||tap)){S.cont++;S.score=0;ARC.score(0);startStage(S.stage);SFX.confirm();}
    else if(S.count<=0)gameOver();}
  else if(m==='over'){worldStep(dt,{x:0,pour:false},false);if(S.t>1.5&&(e.ok||tap))APP_attract();else if(EMBED&&S.t>1.5&&e.back)ARC.exit();else if(S.t>25)APP_attract();}
  else if(m==='ending'){worldStep(dt,{x:0,pour:false},false);if(S.t>3&&(e.ok||tap))APP_attract();else if(S.t>40)APP_attract();}
}
let ACC=0,LAST=0;
const QUAL={ema:16.7,t:0,auto:true,drops:0};
function frame(ts){
  const ms=LAST?ts-LAST:16.7,dt=Math.min(.05,ms/1000);LAST=ts;
  ACC+=dt;let n=0;while(ACC>=1/60&&n<3){tick(1/60);ACC-=1/60;n++;}if(n===3)ACC=0;
  if(n>0){endInputFrame();render();}   /* the world only changes on a tick: a 120 Hz display does not need twice the light */
  musicTick(S.paused);ambUpdate();
  /* auto quality: fewer light probes when the GPU falls behind */
  if(QUAL.auto&&!document.hidden){QUAL.ema+=(Math.min(ms,80)-QUAL.ema)*.05;QUAL.t+=dt;
    if(QUAL.t>2){QUAL.t=0;if(QUAL.ema>24&&LQ>0){QUAL.drops++;if(QUAL.drops>=2){setLight(LQ-1);QUAL.drops=0;}}else QUAL.drops=0;}}
  requestAnimationFrame(frame);
}
const RT={stamp:0,spr:0,hud:0,gl:0};
function render(){
  const t0=performance.now();
  SU.uTime=S.clock%600;stampState();const t1=performance.now();drawSprites();const t2=performance.now();
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);drawOverlay();const t3=performance.now();
  FLASH=reduce?0:S.flash*.22;
  /* shake: nudge the whole matrix by whole dots */
  if(S.shake>0&&!reduce){const k=S.shake*S.shake*2.2;RECT.ox=Math.round(rnd(-k,k));RECT.oy=Math.round(rnd(-k,k));}else{RECT.ox=RECT.oy=0;}
  const rx=RECT.x,ry=RECT.y;RECT.x+=RECT.ox*RECT.w/W;RECT.y+=RECT.oy*RECT.h/H;present();RECT.x=rx;RECT.y=ry;
  const t4=performance.now();RT.stamp+=(t1-t0-RT.stamp)*.05;RT.spr+=(t2-t1-RT.spr)*.05;RT.hud+=(t3-t2-RT.hud)*.05;RT.gl+=(t4-t3-RT.gl)*.05;
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setLight((LQ+2)%3);QUAL.auto=false;e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('resize',resize);
if(!gl||GLERR){$('err').style.display='grid';if(GLERR)$('err').textContent='MOLTEN could not build its light shaders on this graphics card. '+GLERR.slice(0,300);}
if(AU.muted)$('snd').textContent='Sound off';
if(gl&&!GLERR){$('resv').textContent=QL[LQ];resize();APP_attract();
  ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
  window.__mo={AWAKE,ACT,get HEATN(){return HEATN;},simMove,simHeat,stepParticles,enemyStep,stampState,drawSprites,TITLE,S,CR,HEART,EN,BOSS,STAGES,KEY,LATCH,PTR,TS,PERF,RT,M,T,EV,get PN(){return PN;},get ST(){return ST;},get LQ(){return LQ;},tick,render,autopilot,setLight,startStage,startDemo,titleSetup,stageSetup,spawnEnemy,explode,
    ff(sec,skipRender){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,count(m){let n=0;for(let i=0;i<N;i++)if(M[i]===m)n++;return n;}};
  requestAnimationFrame(frame);}
