/* =====================================================================================
   THE WORLD — caverns, the forge heart, the crucible on its rail, the Rime
   ===================================================================================== */
function hash2(x,y,s){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s){return vnoise(x,y,s)*.55+vnoise(x*2.1,y*2.1,s+7)*.3+vnoise(x*4.3,y*4.3,s+13)*.15;}
const GAL=24,RAILY=5,HX=160;
let HY=170;
/* ---------------------------------------------------------------------------------
   STAGES — palette, cave recipe and the wave script. waves: [time, type, side (-1 left,
   1 right, 0 both), tunnel, count, gap]. Tunnels are listed per side, top to bottom.
   --------------------------------------------------------------------------------- */
const STAGES=[
  {name:'FORGE GATE',sub:'THE OUTER WORKS',seed:11,amb:18,tint:[.55,.42,.36],backA:[.035,.026,.024],backB:[.085,.062,.052],cryst:[1.1,.62,.22],ice:[.55,.78,.95],
    floor:[[0,118],[40,124],[86,146],[128,166],[160,170],[192,166],[234,146],[280,124],[320,118]],rough:3,wall:6,
    ledges:[{side:-1,y:74,len:70,th:9},{side:1,y:74,len:70,th:9}],tunnels:[{side:-1,y:117},{side:-1,y:73},{side:1,y:117},{side:1,y:73}],
    pools:[],blobs:[],pillars:[],ncryst:14,iceCoat:0,snow:0,tr:'s0',
    hint:['POUR ON THE RIME BEFORE THEY','REACH THE FORGE. IRON WALLS','HOLD THEM BACK.'],
    waves:[[2,'shard',-1,0,3,1.3],[9,'shard',1,0,3,1.3],[18,'shard',0,0,4,1.1],[30,'shard',-1,1,5,.9],[36,'rime',1,0,1,0],[46,'shard',1,1,5,.8],
      [52,'shard',-1,0,6,.7],[64,'rime',-1,0,1,0],[66,'shard',1,0,7,.6],[80,'rime',1,1,1,0],[82,'rime',-1,1,1,0],[86,'shard',0,0,8,.55]]},
  {name:'GLACIER VEIN',sub:'WHERE THE RIME IS BORN',seed:23,amb:-7,tint:[.38,.52,.66],backA:[.028,.04,.058],backB:[.068,.098,.13],cryst:[.25,.75,1.3],ice:[.6,.85,1],
    floor:[[0,108],[50,112],[92,140],[130,164],[160,168],[196,160],[232,134],[276,112],[320,104]],rough:4,wall:7,
    ledges:[{side:-1,y:66,len:84,th:8},{side:1,y:60,len:62,th:8},{side:1,y:104,len:30,th:6}],tunnels:[{side:-1,y:107},{side:-1,y:65},{side:1,y:103},{side:1,y:59}],
    pools:[{x0:96,x1:124,d:7},{x0:206,x1:226,d:5}],blobs:[],pillars:[],ncryst:15,iceCoat:1,snow:1,falls:[{x:262,y0:60,y1:104,w:5}],tr:'s1',
    hint:['ICE MELTS TO WATER. LAVA BOILS','WATER TO STEAM. STEAM BURNS','THE WISPS THAT HUNT YOUR CRUCIBLE.'],
    waves:[[2,'shard',0,0,4,1.1],[10,'wisp',1,1,2,1.5],[18,'shard',-1,1,5,.9],[24,'wisp',-1,0,3,1.2],[32,'rime',1,0,1,0],[38,'shard',1,1,6,.7],
      [48,'wisp',0,1,3,1],[56,'rime',-1,1,1,0],[58,'shard',-1,0,6,.6],[70,'wisp',0,0,4,.8],[76,'rime',1,1,1,0],[78,'shard',0,1,8,.5],[92,'rime',-1,0,2,6],[94,'wisp',1,0,4,.7]]},
  {name:'THE UNDERCROFT',sub:'THEY DIG',seed:37,amb:14,tint:[.52,.42,.54],backA:[.034,.026,.038],backB:[.085,.064,.082],cryst:[.75,.35,1.25],ice:[.55,.78,.95],
    floor:[[0,124],[44,130],[80,150],[126,168],[160,171],[196,168],[240,150],[276,128],[320,122]],rough:3,wall:6,
    ledges:[{side:-1,y:80,len:58,th:10},{side:1,y:80,len:58,th:10},{side:-1,y:44,len:36,th:7},{side:1,y:44,len:36,th:7}],tunnels:[{side:-1,y:123},{side:-1,y:79},{side:-1,y:43},{side:1,y:121},{side:1,y:79},{side:1,y:43}],
    pools:[{x0:212,x1:236,d:5}],blobs:[{x:104,y:120,rx:12,ry:7},{x:216,y:118,rx:11,ry:7}],pillars:[],ncryst:16,iceCoat:0,snow:0,tr:'s2',
    hint:['BORERS TUNNEL THROUGH THE ROCK.','POUR LAVA DOWN THEIR SHAFTS.','FROSTCALLERS SUMMON MORE RIME.'],
    waves:[[2,'shard',0,0,4,1],[10,'borer',-1,0,1,0],[16,'shard',1,1,5,.8],[22,'caller',-1,1,1,0],[30,'borer',1,0,1,0],[34,'shard',0,2,4,.9],
      [44,'rime',1,0,1,0],[50,'caller',1,2,1,0],[56,'borer',0,0,1,0],[62,'shard',-1,1,7,.6],[72,'rime',-1,0,1,0],[76,'wisp',0,2,3,1],[84,'borer',0,0,2,4],[90,'shard',0,0,8,.5]]},
  {name:'DROWNED FOUNDRY',sub:'THE OLD WORKS FLOODED',seed:51,amb:9,tint:[.4,.46,.52],backA:[.025,.028,.034],backB:[.06,.068,.078],cryst:[.3,1.05,.8],ice:[.55,.8,.95],
    floor:[[0,112],[36,118],[88,148],[130,166],[160,170],[190,166],[236,148],[284,118],[320,112]],rough:3,wall:6,
    ledges:[{side:-1,y:70,len:96,th:8},{side:1,y:76,len:64,th:9}],tunnels:[{side:-1,y:111},{side:-1,y:69},{side:1,y:111},{side:1,y:75}],
    pools:[{x0:40,x1:84,d:7},{x0:226,x1:264,d:6}],reservoir:{x0:8,x1:58,y0:44,y1:69,dam:62},girders:[{x0:110,x1:210,y:108},{x0:122,x1:198,y:136}],blobs:[],pillars:[],ncryst:14,iceCoat:.35,snow:0,tr:'s3',
    hint:['AN ICE DAM HOLDS BACK A LAKE.','MELT IT AND THE FLOOD WASHES','THE LEDGE CLEAN. MIND THE STEAM.'],
    waves:[[2,'shard',0,0,5,1],[10,'rime',-1,1,1,0],[16,'wisp',1,0,3,1],[22,'shard',-1,1,6,.7],[30,'caller',1,1,1,0],[36,'borer',0,0,1,0],[42,'rime',1,0,1,0],
      [48,'shard',0,1,7,.55],[58,'wisp',0,0,4,.8],[64,'rime',-1,0,2,5],[72,'caller',-1,1,1,0],[78,'borer',1,0,2,3],[84,'shard',0,0,10,.45],[96,'rime',0,1,2,0]]},
  {name:'THE HOAR KING',sub:'THE WINTER UNDER THE WORLD',seed:67,amb:-10,tint:[.38,.5,.68],backA:[.026,.035,.056],backB:[.066,.088,.128],cryst:[.45,.65,1.4],ice:[.62,.86,1],
    floor:[[0,132],[40,136],[90,156],[130,168],[160,170],[200,160],[250,150],[300,148],[320,146]],rough:2,wall:6,
    ledges:[{side:-1,y:74,len:70,th:8}],tunnels:[{side:-1,y:131},{side:-1,y:73},{side:1,y:145}],bigTunnel:{side:1,y:145,h:62},
    pools:[],blobs:[],pillars:[],ncryst:15,iceCoat:.6,snow:1,tr:'boss',boss:1,
    hint:['THE KING IS MADE OF ICE. MELT','HIM CELL BY CELL. BREAK HIS','HEART OF FROST.'],
    waves:[[2,'shard',-1,0,4,1],[8,'wisp',-1,1,2,1.2],[14,'KING',1,0,1,0],[30,'shard',-1,0,5,.8],[48,'wisp',-1,1,3,1],[66,'shard',-1,0,6,.7],[84,'rime',-1,1,1,0],
      [100,'wisp',-1,0,4,.8],[118,'shard',-1,1,7,.6],[140,'rime',-1,0,1,0],[160,'shard',-1,0,8,.5]]}
];
let ST=STAGES[0];
/* ---------------------------------------------------------------------------------
   CAVE GENERATION — rock everywhere, carve the bowl under the gallery, add ledges and
   outcrops, cut the tunnels and the heart chamber, smooth, then dress with water, ice,
   snow, lantern crystals and old girders. Everything walkable stays within a 2-cell step.
   --------------------------------------------------------------------------------- */
const PROT=new Uint8Array(N);
let TUN=[];          /* spawn points {side,x,y} */
function floorAt(x,st){const f=st.floor;let k=0;while(k<f.length-2&&f[k+1][0]<x)k++;const a=f[k],b=f[k+1],t=clamp((x-a[0])/(b[0]-a[0]),0,1),s=t*t*(3-2*t);
  return a[1]+(b[1]-a[1])*s+(vnoise(x*.07,.5,st.seed)-.5)*st.rough*2+(vnoise(x*.23,3.5,st.seed)-.5)*1.4;}
function rk(x,y,m){if(x<1||x>W-2||y<1||y>H-2)return;const i=y*W+x;M[i]=m;T[i]=AMB_T;}
function genCave(st){
  AMB_T=st.amb;clearGrid();PROT.fill(0);RS=(st.seed*2654435761)>>>0||7;
  const sd=st.seed;HY=Math.round(floorAt(HX,st));
  for(let i=0;i<N;i++)M[i]=ROCK;
  /* the bowl */
  for(let x=1;x<W-1;x++){const fy=floorAt(x,st);
    for(let y=GAL-3;y<H-1;y++){
      const wl=st.wall+5*fbm(y*.05,1.5,sd),wr=W-1-(st.wall+5*fbm(y*.05,4.5,sd));
      const ny=(fbm(x*.08,y*.08,sd+3)-.5)*3;
      if(y<fy+ny&&x>wl&&x<wr)M[y*W+x]=AIR;
    }}
  /* upper shoulders: rock bulging in from the walls under the gallery */
  for(let y=GAL;y<GAL+34;y++)for(let x=1;x<W-1;x++){const e=Math.min(x,W-1-x),k=1-(y-GAL)/34;if(e<k*k*26+(fbm(x*.1,y*.1,sd+9)-.5)*8)M[y*W+x]=ROCK;}
  /* ledges grow out of the walls at their tunnel heights: flat tops, tapered undersides */
  for(const l of st.ledges){for(let s=0;s<l.len;s++){const x=l.side<0?1+s:W-2-s,f=s/l.len,top=l.y+(s<30?0:Math.round((vnoise(s*.15,7.5,sd+l.y)-.5)*1.2));
    const th=Math.max(2,l.th*Math.pow(1-f,.6)+(vnoise(s*.2,9.5,sd)-.5)*3);for(let y=top;y<top+th;y++)rk(x,y,ROCK);}}
  for(const b of st.blobs){for(let y=b.y-b.ry-3;y<=b.y+b.ry+3;y++)for(let x=b.x-b.rx-3;x<=b.x+b.rx+3;x++){const dx=(x-b.x)/b.rx,dy=(y-b.y)/b.ry;if(dx*dx+dy*dy<1+(fbm(x*.2,y*.2,sd+21)-.5)*.8)rk(x,y,ROCK);}}
  /* smoothing: majority vote over the 8 neighbours (two rounds) */
  const tmp=new Uint8Array(N);
  for(let r=0;r<2;r++){tmp.set(M);for(let y=GAL;y<H-2;y++)for(let x=2;x<W-2;x++){const i=y*W+x;let c=0;for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++)if(tmp[i+j*W+k]===ROCK)c++;M[i]=c>=5?ROCK:AIR;}}
  /* the gallery the crucible rides in */
  for(let y=1;y<GAL;y++)for(let x=1;x<W-1;x++){M[y*W+x]=AIR;PROT[y*W+x]=1;}
  for(let x=2;x<W-2;x++){rk(x,RAILY,RAIL);rk(x,RAILY+1,RAIL);}
  for(const px of [24,96,224,296]){for(let y=1;y<RAILY;y++)rk(px,y,RAIL);}
  /* tunnels: 16 cells tall (the King's great tunnel taller), a solid floor under each */
  TUN=[];
  for(const t of st.tunnels){
    const big=st.bigTunnel&&st.bigTunnel.side===t.side&&st.bigTunnel.y===t.y,th=big?st.bigTunnel.h:16,len=big?40:24;
    for(let s=0;s<len;s++){const x=t.side<0?1+s:W-2-s;for(let y=t.y-th;y<t.y;y++){if(y>=1){M[y*W+x]=AIR;PROT[y*W+x]=1;}}for(let y=t.y;y<t.y+4;y++)rk(x,y,ROCK);}
    TUN.push({side:t.side,x:t.side<0?6:W-7,y:t.y-1});
  }
  /* the heart chamber: a flat floor and a dome of air */
  for(let x=HX-30;x<=HX+30;x++){const dx=(x-HX)/30;const top=HY-Math.round(30*Math.sqrt(Math.max(0,1-dx*dx)));
    for(let y=top;y<HY;y++)M[y*W+x]=AIR;for(let y=HY;y<HY+5;y++)rk(x,y,ROCK);}
  /* water: dig basins into the floor and fill them to the brim */
  for(const p of st.pools){for(let x=p.x0;x<=p.x1;x++){const f=(x-p.x0)/(p.x1-p.x0),fy=Math.round(floorAt(x,st)),d=Math.round(p.d*Math.sin(Math.PI*f));
    let y0=fy;while(y0>GAL&&M[(y0-1)*W+x]!==AIR)y0--;while(y0<H-2&&M[y0*W+x]===AIR)y0++;
    for(let y=y0;y<y0+d;y++)M[y*W+x]=AIR;}
    const lvl=Math.max(...[p.x0,p.x1].map(x=>{let y=GAL;while(y<H-2&&M[y*W+x]===AIR)y++;return y;}));
    for(let x=p.x0;x<=p.x1;x++)for(let y=lvl;y<H-2&&M[y*W+x]===AIR;y++){const i=y*W+x;M[i]=WATER;T[i]=Math.max(2,AMB_T);}}
  /* a reservoir held back by an ice dam */
  if(st.reservoir){const r=st.reservoir;for(let y=r.y0;y<r.y1;y++)for(let x=r.x0;x<=r.dam+3;x++){const i=y*W+x;if(x>=r.dam)M[i]=ICE;else if(x>=1){M[i]=WATER;T[i]=4;}PROT[i]=1;}
    for(let x=r.x0;x<=r.dam+3;x++)for(let y=r.y1;y<r.y1+5;y++)rk(x,y,ROCK);
    for(let x=r.x0;x<=r.dam+3;x++)for(let y=r.y0-14;y<r.y0;y++){const i=y*W+x;if(y>=GAL)M[i]=AIR;}}
  /* old foundry girders: riveted iron bridges */
  if(st.girders)for(const gd of st.girders){for(let x=gd.x0;x<=gd.x1;x++)for(let y=gd.y;y<gd.y+3;y++){const i=y*W+x;M[i]=IRON;T[i]=AMB_T;}
    for(const x of [gd.x0,gd.x1])for(let y=gd.y+3;y<H-2&&M[y*W+x]===AIR;y++){M[y*W+x]=IRON;M[y*W+x+1]=IRON;}}
  /* frozen waterfalls */
  if(st.falls)for(const f of st.falls)for(let y=f.y0;y<=f.y1;y++){const w=f.w+Math.round((vnoise(y*.2,1,sd)-.5)*3);for(let x=f.x-w;x<=f.x+w;x++){const i=y*W+x;if(M[i]===AIR){M[i]=ICE;T[i]=AMB_T;}}}
  /* rime coating, snow on upward faces, lantern crystals in the walls */
  for(let y=GAL+1;y<H-2;y++)for(let x=2;x<W-2;x++){const i=y*W+x;if(M[i]!==ROCK||PROT[i])continue;
    const up=M[i-W]===AIR,side=M[i-1]===AIR||M[i+1]===AIR,dn=M[i+W]===AIR;
    if(st.iceCoat&&(side||dn||up)&&fbm(x*.09,y*.09,sd+31)<.32+st.iceCoat*.22)M[i]=ICE;
    if(st.snow&&up&&fbm(x*.05,y*.05,sd+41)<.62){M[i-W]=SNOW;if(fbm(x*.1,y,sd+43)<.45&&M[i-2*W]===AIR)M[i-2*W]=SNOW;}}
  let placed=0;
  for(let tries=0;tries<6000&&placed<st.ncryst;tries++){const x=8+(rf()*(W-16))|0,y=GAL+6+(rf()*(H-GAL-20))|0,i=y*W+x;
    if(M[i]!==ROCK||!(M[i-1]===AIR||M[i+1]===AIR||M[i-W]===AIR))continue;if(Math.abs(x-HX)<36&&y>HY-34)continue;
    for(let k=0;k<5;k++){const j=i+((rf()*3|0)-1)+((rf()*3|0)-1)*W;if(M[j]===ROCK)M[j]=CRYST;}placed++;}
  /* frame of bedrock */
  for(let x=0;x<W;x++){M[x]=BED;M[(H-1)*W+x]=BED;}for(let y=0;y<H;y++){M[y*W]=BED;M[y*W+W-1]=BED;}
  for(let i=0;i<N;i++){if(M[i]!==WATER)T[i]=AMB_T;A[i]=r32()&255;}
  buildHeart();
}
/* ---------------------------------------------------------------------------------
   THE FORGE HEART — a riveted iron furnace in the chamber floor with a glowing core.
   It warms its chamber, drinks the lava that reaches it, and freezes if the Rime clings.
   --------------------------------------------------------------------------------- */
const HEART={drain:0,heat:100,beat:0,beatT:0,pulse:0,latched:0,frost:0,fed:0,ign:1,cells:[],edge:[],x0:0,x1:0,y0:0,y1:0,hurtT:0};
const COREY=()=>HY-17,CORER=6;
/* an anvil-shaped pedestal carrying a cradle; the core sits in the cradle, open to the chamber */
function buildHeart(){
  HEART.cells=[];HEART.edge=[];const cy=COREY();
  for(let dy=0;dy<17;dy++){const y=HY-1-dy;let hw;
    if(dy<3)hw=16-dy*.5;else if(dy<9)hw=14.5-(dy-3)*1.05;else hw=8.2+(dy-9)*1.15;
    for(let x=Math.round(HX-hw);x<=Math.round(HX+hw);x++){const cx=x-HX,ccy=y-cy;if(dy>=9&&cx*cx+ccy*ccy<=(CORER+.6)*(CORER+.6))continue;const i=y*W+x;M[i]=HOUSE;HEART.cells.push(i);}}
  for(let y=cy-CORER-1;y<=cy+CORER;y++)for(let x=HX-CORER-1;x<=HX+CORER+1;x++){const i=y*W+x;if(M[i]!==HOUSE)M[i]=AIR;}
  for(const i of HEART.cells){if(M[i-1]!==HOUSE||M[i+1]!==HOUSE||M[i-W]!==HOUSE||M[i+W]!==HOUSE)HEART.edge.push(i);}
  const es=new Set(HEART.edge);HEART.isEdge=new Uint8Array(HEART.cells.map(i=>es.has(i)?1:0));HEART.k=new Float32Array(HEART.cells.length);HEART.cells.forEach((i,n)=>{const y=(i/W)|0,d=Math.hypot(i%W-HX,y-cy);HEART.k[n]=clamp(1-(d-CORER)/16,0,1);});
  HEART.x0=HX-17;HEART.x1=HX+17;HEART.y0=HY-24;HEART.y1=HY-1;
}
function heartReset(){HEART.heat=100;HEART.beat=0;HEART.pulse=0;HEART.latched=0;HEART.frost=0;HEART.fed=0;HEART.ign=0;HEART.hurtT=0;}
function heartStep(dt,live){
  const H_=HEART;H_.ign=Math.min(1,H_.ign+dt*.45);
  /* however many cling to it, the heart loses at most 7 heat a second: a swarm is deadly, not instant */
  if(H_.drain>0){H_.heat=Math.max(0,H_.heat-Math.min(H_.drain,7*dt));H_.drain=0;}
  /* the pedestal is heated from the cradle down: dull red under the core, black iron at its foot */
  const cells=H_.cells,kk=H_.k;for(let n=0;n<cells.length;n++)T[cells[n]]=((330+H_.heat*(1.2+4.6*kk[n]*kk[n]))*(1-H_.frost*.3))*H_.ign+AMB_T*(1-H_.ign);
  /* the housing drinks the lava that touches it */
  let fed=0;
  for(const i of H_.edge){for(const o of [-1,1,-W,W]){const j=i+o,mj=M[j];
    if(mj===LAVA&&(r32()&3)===0){M[j]=AIR;T[j]=600;fed++;}
    else if((mj===IRON||mj===SLAG||mj===RUBBLE)&&(r32()&63)===0){M[j]=AIR;T[j]=300;fed+=.3;AWAKE[((j/W|0)>>CSH)*NCX+((j%W)>>CSH)]=1;}}}   /* the forge reclaims iron that sets against it */
  if(fed&&live){H_.heat=Math.min(100,H_.heat+fed*.028);H_.fed+=fed;H_.pulse=Math.min(1.5,H_.pulse+fed*.03);}
  /* heartbeat: faster and harder as it cools */
  const bpm=58+(100-H_.heat)*.75+H_.latched*6;H_.beatT+=dt*bpm/60;if(H_.beatT>=1){H_.beatT-=1;H_.beat=1;if(live&&H_.ign>.5)SFX.heartbeat(H_.heat);}
  H_.beat=Math.max(0,H_.beat-dt*3.2);H_.pulse=Math.max(0,H_.pulse-dt*1.5);H_.hurtT=Math.max(0,H_.hurtT-dt);
  H_.frost+=((H_.latched>0?1:0)-H_.frost)*dt*1.5;
}
/* ---------------------------------------------------------------------------------
   THE CRUCIBLE — rides the rail, tilts to pour, refills at the furnace spout above the heart
   --------------------------------------------------------------------------------- */
const CR={x:160,vx:0,ax:0,sw:0,sww:0,rod:0,face:1,fill:420,cap:420,pouring:false,flow:0,frozen:0,bombs:2,refill:false,acc:0,nx:0,ny:0,nvx:0,poured:0};
const FURN_X=160,PIV_Y=8,NOZ=12.5;
function crReset(full){CR.x=full?40:CR.x;CR.vx=0;CR.ax=0;CR.sw=0;CR.sww=0;CR.rod=0;CR.face=1;CR.fill=CR.cap;CR.pouring=false;CR.flow=0;CR.frozen=0;CR.refill=false;CR.acc=0;if(full){CR.bombs=2;}CR.poured=0;}
/* the ladle hangs from its trolley as a damped pendulum: accelerate the trolley and it swings back,
   and the stream from its bottom nozzle carries the swing's velocity */
function crStep(dt,ctl,live){
  const v0=CR.vx;
  if(ctl.tx!=null){const k=40,dx=ctl.tx-CR.x;CR.vx+=(dx*k-CR.vx*2*Math.sqrt(k))*dt*4;CR.vx=clamp(CR.vx,-230,230);}
  else{const want=ctl.x*200,a=Math.abs(want)>Math.abs(CR.vx)?1300:1700;CR.vx+=clamp(want-CR.vx,-a*dt,a*dt);}
  CR.x+=CR.vx*dt;if(CR.x<12){CR.x=12;CR.vx=0;}if(CR.x>W-13){CR.x=W-13;CR.vx=0;}
  CR.ax=(CR.vx-v0)/dt;if(Math.abs(CR.vx)>25)CR.face=CR.vx>0?1:-1;
  const Lp=NOZ*.7;CR.sww+=(-(GRAV/Lp)*Math.sin(CR.sw)-CR.ax/Lp*Math.cos(CR.sw)-CR.sww*5.5)*dt;CR.sw=clamp(CR.sw+CR.sww*dt,-.5,.5);
  CR.frozen=Math.max(0,CR.frozen-dt);
  const want=ctl.pour&&CR.frozen<=0&&live;
  CR.rod+=((want?1:0)-CR.rod)*Math.min(1,dt*14);
  CR.pouring=want&&CR.fill>1;
  CR.refill=Math.abs(CR.x-FURN_X)<6&&!want&&CR.fill<CR.cap-1&&live;
  if(!want)CR.fill=Math.min(CR.cap,CR.fill+(CR.refill?170:16)*dt);
  /* nozzle position and velocity (trolley + swing) */
  const s=Math.sin(CR.sw),c=Math.cos(CR.sw);CR.nx=CR.x+s*NOZ;CR.ny=PIV_Y+c*NOZ;CR.nvx=CR.vx+c*NOZ*CR.sww;
  CR.flow+=((CR.pouring?1:0)-CR.flow)*Math.min(1,dt*10);
  if(CR.pouring&&CR.rod>.4){
    CR.acc+=dt*160*CR.flow;
    while(CR.acc>=1&&CR.fill>0){CR.acc-=1;CR.fill-=1;CR.poured++;
      spawnP(CR.nx+rnd(-.35,.35),CR.ny+rnd(0,.8),CR.nvx+rnd(-2,2),rnd(16,26),LAVA,T_POUR+rnd(-30,30),9,PF_POUR);}
  }else CR.acc=0;
}
/* slag bombs */
const BOMBS=[];
function dropBomb(){if(CR.bombs<=0||CR.frozen>0)return false;CR.bombs--;BOMBS.push({x:CR.x,y:20,vx:CR.vx*.6,vy:20,t:0});SFX.bombDrop();return true;}
function bombStep(dt){
  for(let k=BOMBS.length-1;k>=0;k--){const b=BOMBS[k];b.t+=dt;b.vy+=GRAV*dt;const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;
    const steps=Math.ceil(Math.max(Math.abs(nx-b.x),Math.abs(ny-b.y)))||1;let boom=false;
    for(let s=1;s<=steps&&!boom;s++){const x=b.x+(nx-b.x)*s/steps,y=b.y+(ny-b.y)*s/steps,cx=x|0,cy=y|0;
      if(cx<1||cx>W-2||cy>H-2){boom=true;break;}const c=M[cy*W+cx];if(KIND[c]===1||KIND[c]===2||KIND[c]===3)boom=true;
      for(const e of EN)if(cx>=e.x0-1&&cx<=e.x1+1&&cy>=e.y0-1&&cy<=e.y1+1)boom=true;
      if(BOSS.on&&bossCellAt(cx,cy)>=0)boom=true;
      if(boom){b.x=x;b.y=y;}}
    if(boom){BOMBS.splice(k,1);bombBurst(b.x|0,b.y|0);}else{b.x=nx;b.y=ny;}
  }
}
function bombBurst(x,y){
  explode(x,y,10,1500);S.shake=Math.max(S.shake,.9);S.flash=Math.max(S.flash,.5);SFX.boom();
  for(const e of EN){const cx=(e.x0+e.x1)/2,cy=(e.y0+e.y1)/2,d=Math.hypot(cx-x,cy-y);if(d<18)hurtEnemy(e,(1-d/18)*9,'bomb');}
  if(BOSS.on)bossBlast(x,y,14);
  LIGHTS.push({x,y,r:1,t:0,dur:.35,c:[255,200,120]});
}
const LIGHTS=[];          /* short-lived emissive flashes drawn into the sprite layer */
