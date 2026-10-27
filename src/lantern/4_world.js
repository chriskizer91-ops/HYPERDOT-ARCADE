/* =====================================================================================
   7. THE TOWN — nights are drawn as maps of 8 x 8-dot cells, then every cell is dressed
      dot by dot: running-bond cobbles, grass tufts, roof tiles that only the moon sees,
      plank bridges with rails, picket fences whose gaps let light through in stripes,
      gravestones, crates, wells, rocks, and trees whose canopies dapple the lamplight.
   ===================================================================================== */
const CS=8;
let MW=48,MH=32,MAP=[];
const WALK=new Uint8Array(64*64);          /* per cell: 1 when a shade can drift through it */
const PWALK=new Uint8Array(64*64);         /* per cell: 1 when the lamplighter can walk through it */
let CANOPY=new Uint8Array(1);                /* per dot: leaf albedo (0 = open sky) */
let START={x:0,y:0},WELLS=[],PICKS=[],FLIES=[],EDGES=[];
let TOWER=null;                              /* the lighthouse on the last night */
/* legend */
const CELL={'#':'bld','.':'road',',':'grass',':':'dirt','~':'water','=':'bridge','L':'lamp','T':'tree','g':'grave','f':'fence','c':'crates','o':'oil','x':'flare','*':'flies','S':'well','P':'start','W':'wellstone','k':'statue','b':'bench','R':'rocks','s':'sand','H':'tower','h':'hedge','m':'stall','d':'door'};
function cellAt(cx,cy){if(cx<0||cy<0||cx>=MW||cy>=MH)return '#';return MAP[cy][cx]||'#';}
function groundOf(cx,cy){
  const t=CELL[cellAt(cx,cy)];if(t==='road'||t==='grass'||t==='dirt'||t==='sand'||t==='water'||t==='bridge')return t;
  /* a feature cell takes the most common ground around it */
  const cnt={};for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const u=CELL[cellAt(cx+a,cy+b)];if(u==='road'||u==='grass'||u==='dirt'||u==='sand')cnt[u]=(cnt[u]||0)+1;}
  let best='road',bn=0;for(const k in cnt)if(cnt[k]>bn){bn=cnt[k];best=k;}
  if(t==='grave'||t==='tree'||t==='flies'||t==='hedge')return bn&&best!=='road'?best:'grass';
  if(t==='rocks'||t==='tower')return 'sand';
  return best;
}
function put(x,y,occ,alb,mat){if(x<0||y<0||x>=WW||y>=WH)return;const i=y*WW+x;if(occ!=null)OCC[i]=occ;if(alb!=null)ALB[i]=alb;if(mat!=null)MAT[i]=mat;}
function disc(cx,cy,r,f){for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++){const d=Math.hypot(x+.5-cx,y+.5-cy);if(d<=r)f(x,y,d);}}
/* ---------- ground dressing ---------- */
function dressGround(cx,cy,kind,sd){
  const x0=cx*CS,y0=cy*CS;
  for(let j=0;j<CS;j++)for(let i=0;i<CS;i++){const x=x0+i,y=y0+j,h=hash2(x,y,sd);let a,m;
    if(kind==='road'){
      /* running-bond cobbles 4x3 with mortar between; each stone its own shade and a worn top */
      const row=Math.floor(y/3),off=(row&1)*2,sx=Math.floor((x+off)/4),hs=hash2(sx,row,sd+1),lx=(x+off)%4,ly=y%3;
      const mortar=lx===3||ly===2;a=mortar?34:92+hs*58+(lx===1&&ly===0?16:0);m=M_ROAD;}
    else if(kind==='grass'){a=48+h*36+(hash2(x>>1,y,sd+2)>.86?40:0);m=M_GRASS;}
    else if(kind==='dirt'){a=70+h*30+(h>.93?50:0);m=M_DIRT;}
    else if(kind==='sand'){a=96+h*34+((x*3+y*5)%11===0?24:0);m=M_SAND;}
    else if(kind==='water'){a=10+h*8;m=M_WATER;}
    else if(kind==='bridge'){
      const hor=CELL[cellAt(cx-1,cy)]==='bridge'||CELL[cellAt(cx+1,cy)]==='bridge'||CELL[cellAt(cx-1,cy)]==='road'||CELL[cellAt(cx+1,cy)]==='road';
      const p=hor?x:y;a=(p%3===2)?40:96+hash2(hor?Math.floor(x/3):x,hor?y:Math.floor(y/3),sd+3)*40;m=M_BRIDGE;}
    else{a=80;m=M_ROAD;}
    put(x,y,0,a|0,m);}
}
/* ---------- buildings: flood each block of '#', outline it, tile its roof ---------- */
function dressBuildings(sd){
  const seen=new Uint8Array(MW*MH);
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){if(seen[cy*MW+cx]||cellAt(cx,cy)!=='#')continue;
    const cells=[],q=[[cx,cy]];seen[cy*MW+cx]=1;let x0=cx,x1=cx,y0=cy,y1=cy;
    while(q.length){const [a,b]=q.pop();cells.push([a,b]);x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,b);y1=Math.max(y1,b);
      for(const [u,v] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+u,ny=b+v;if(nx<0||ny<0||nx>=MW||ny>=MH||seen[ny*MW+nx]||cellAt(nx,ny)!=='#')continue;seen[ny*MW+nx]=1;q.push([nx,ny]);}}
    const horiz=(x1-x0)>=(y1-y0),bid=hash2(cx,cy,sd+4);
    for(const [a,b] of cells)for(let j=0;j<CS;j++)for(let i=0;i<CS;i++){const x=a*CS+i,y=b*CS+j;
      /* an edge dot borders open ground: that is the wall face the street light falls on */
      const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([u,v])=>{const nx=x+u,ny=y+v,ncx=Math.floor(nx/CS),ncy=Math.floor(ny/CS);return cellAt(ncx,ncy)!=='#'&&nx>=0&&ny>=0&&nx<WW&&ny<WH;});
      const i2=y*WW+x;OCC[i2]=2;MAT[i2]=edge?M_WALL:M_ROOF;ALB[i2]=edge?150:60;
      /* roof seen by moonlight: rows of tiles, a ridge along the long axis, a few chimneys */
      const u=horiz?x:y,v=horiz?y:x,mid=horiz?(y0*CS+(y1+1)*CS)/2:(x0*CS+(x1+1)*CS)/2;
      const tile=((v+(Math.floor(u/3)&1))%3===0)?1:0,ridge=Math.abs(v+.5-mid)<1;
      let mo=edge?14:(ridge?44:22+tile*10-(Math.abs(v+.5-mid)<3?4:0))+bid*8;
      if(!edge&&hash2(Math.floor(x/6),Math.floor(y/6),sd+5)>.965&&(x%6)<2&&(y%6)<2)mo=58;    /* chimney pots catch the moon */
      MOON[i2]=mo|0;}
  }
}
/* ---------- features ---------- */
function lampAt(x,y,R){LAMPS.push({x,y,R:R||ST.lampR,I:ST.lampI||1,lit:false,C:null,S:null,kindle:0,snuffT:0,flick:Math.random()*10});
  for(let j=-1;j<=0;j++)for(let i=-1;i<=0;i++)put(x+i,y+j,2,120,M_STONE);}
function dressFeature(cx,cy,t,sd){
  const x0=cx*CS,y0=cy*CS,mx=x0+4,my=y0+4,hs=hash2(cx,cy,sd+9);
  if(t==='lamp')lampAt(mx,my);
  else if(t==='tree'){const r=1.6+hs*.6;disc(mx+(hs-.5)*2,my+(hash2(cx,cy,sd+10)-.5)*2,r,(x,y)=>put(x,y,2,70,M_STONE));
    disc(mx,my,4.6,(x,y,d)=>{if(OCC[y*WW+x]===0&&hash2(x,y,sd+11)>.55)ALB[y*WW+x]=Math.min(255,ALB[y*WW+x]*.6+20);});   /* leaf litter */
    disc(mx,my,7.2+hs*1.5,(x,y,d)=>{if(x<0||y<0||x>=WW||y>=WH)return;const n=vnoise(x*.45,y*.45,sd+12);if(n>.42+d*.025)CANOPY[y*WW+x]=Math.max(CANOPY[y*WW+x],(60+n*90)|0);});}
  else if(t==='grave'){const k=1+(hs>.4?1:0);for(let n=0;n<k;n++){const gx=x0+1+((hash2(cx,cy,sd+20+n)*4)|0),gy=y0+1+n*3+((hash2(cx,cy,sd+30+n)*2)|0);
      if(hash2(cx,cy,sd+40+n)>.55){put(gx+1,gy-1,1,170,M_STONE);for(let i=0;i<3;i++)put(gx+i,gy,1,170,M_STONE);put(gx+1,gy+1,1,150,M_STONE);}      /* a cross */
      else for(let j=0;j<2;j++)for(let i=0;i<3;i++)put(gx+i,gy+j,1,j?130:175,M_STONE);}}                                                           /* a headstone */
  else if(t==='fence'||t==='hedge'){const L=CELL[cellAt(cx-1,cy)],R=CELL[cellAt(cx+1,cy)],U=CELL[cellAt(cx,cy-1)],D=CELL[cellAt(cx,cy+1)];
    const hor=L===t||R===t||(!(U===t||D===t)),ver=U===t||D===t,hedge=t==='hedge';
    if(hor)for(let i=0;i<CS;i++){const x=x0+i;if(hedge){for(let j=3;j<6;j++)put(x,y0+j,1,60+hash2(x,y0+j,sd)*40,M_GRASS);}else if((x%3)!==2||i===0)put(x,my,1,(x%3)===0?160:130,M_STONE);}
    if(ver)for(let j=0;j<CS;j++){const y=y0+j;if(hedge){for(let i=3;i<6;i++)put(x0+i,y,1,60+hash2(x0+i,y,sd)*40,M_GRASS);}else if((y%3)!==2||j===0)put(mx,y,1,(y%3)===0?160:130,M_STONE);}}
  else if(t==='crates'){const n=2+((hs*2)|0);for(let k=0;k<n;k++){const bx=x0+((hash2(cx,cy,sd+50+k)*4)|0),by=y0+((hash2(cx,cy,sd+60+k)*4)|0),round=hash2(cx,cy,sd+70+k)>.5;
      if(round)disc(bx+2,by+2,1.8,(x,y,d)=>put(x,y,1,d<1?150:110,M_STONE));
      else for(let j=0;j<4;j++)for(let i=0;i<4;i++)put(bx+i,by+j,1,(i===0||j===0)?160:(i+j)%3===0?90:125,M_STONE);}}
  else if(t==='stall'){for(let i=1;i<CS-1;i++)for(let j=1;j<4;j++)put(x0+i,y0+j,1,(i&1)?170:120,M_STONE);}
  else if(t==='bench'){for(let i=1;i<7;i++){put(x0+i,my,1,140,M_STONE);put(x0+i,my+1,1,110,M_STONE);}}
  else if(t==='wellstone'){disc(mx,my,3.4,(x,y,d)=>{if(d>2)put(x,y,2,140,M_STONE);else put(x,y,0,8,M_WATER);});}
  else if((t==='statue'||t==='tower')&&(CELL[cellAt(cx-1,cy)]===t||CELL[cellAt(cx,cy-1)]===t))return;   /* a 2x2 feature is drawn once, from its top-left cell */
  else if(t==='statue'){disc(mx+4,my+4,7.5,(x,y,d)=>{if(d>6.3)put(x,y,1,150,M_STONE);else if(d>2.2)put(x,y,0,14,M_WATER);else put(x,y,2,180,M_STONE);});}
  else if(t==='rocks'){const n=2+((hs*3)|0);for(let k=0;k<n;k++){const rx=x0+hash2(cx,cy,sd+80+k)*8,ry=y0+hash2(cx,cy,sd+90+k)*8,r=1.5+hash2(cx,cy,sd+95+k)*2.2;
      disc(rx,ry,r,(x,y,d)=>{if(vnoise(x*.7,y*.7,sd+96)>.25)put(x,y,2,110+(d<r*.5?30:0),M_ROCK);});}}
  else if(t==='tower'){TOWER={x:mx+4,y:my+4,r:10};disc(mx+4,my+4,10.5,(x,y,d)=>{put(x,y,2,d>9.5?170:60,M_WALL);const i=y*WW+x;if(i>=0&&i<WN)MOON[i]=(d<3?70:((Math.floor(d)&1)?34:18));});}
  else if(t==='well')WELLS.push({x:mx,y:my});
  else if(t==='start')START={x:mx,y:my};
  else if(t==='oil')PICKS.push({k:'oil',x:mx,y:my,on:true,t:0});
  else if(t==='flare')PICKS.push({k:'flare',x:mx,y:my,on:true,t:0});
  else if(t==='flies')FLIES.push({x:mx,y:my});
  else if(t==='door')ST.door={x:mx,y:my};
}
function buildTown(st){
  MAP=st.map.map(r=>r.padEnd(st.map[0].length,'#'));MW=MAP[0].length;MH=MAP.length;
  worldAlloc(MW*CS,MH*CS);CANOPY=new Uint8Array(WN);LAMPS.length=0;WELLS=[];PICKS=[];FLIES=[];TOWER=null;START={x:WW/2,y:WH/2};st.door=null;
  const sd=st.seed;
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){const c=cellAt(cx,cy),t=CELL[c]||'bld';if(t!=='bld')dressGround(cx,cy,groundOf(cx,cy),sd);}
  dressBuildings(sd);
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){const t=CELL[cellAt(cx,cy)];if(t&&t!=='bld'&&t!=='road'&&t!=='grass'&&t!=='dirt'&&t!=='water'&&t!=='bridge'&&t!=='sand')dressFeature(cx,cy,t,sd);}
  /* bridge rails: low stone along the water side of every bridge cell */
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){if(CELL[cellAt(cx,cy)]!=='bridge')continue;
    for(const [u,v] of [[0,-1],[0,1],[-1,0],[1,0]]){if(CELL[cellAt(cx+u,cy+v)]!=='water')continue;
      for(let k=0;k<CS;k++){const x=u?cx*CS+(u>0?CS-1:0):cx*CS+k,y=v?cy*CS+(v>0?CS-1:0):cy*CS+k;put(x,y,1,(k%4===0)?190:140,M_STONE);}}}
  /* walkable cells for the shades' map; everything at the map border is a shade's way in */
  WALK.fill(0);EDGES=[];
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){const t=CELL[cellAt(cx,cy)];const ok=t&&t!=='bld'&&t!=='water'&&t!=='tower'&&t!=='statue'&&t!=='wellstone';WALK[cy*64+cx]=ok?1:0;PWALK[cy*64+cx]=ok&&t!=='fence'&&t!=='hedge'&&t!=='stall'?1:0;
    if(ok&&(cx===0||cy===0||cx===MW-1||cy===MH-1))EDGES.push({x:cx*CS+4,y:cy*CS+4});}
  /* the dark water mirrors the sky a little */
  for(let i=0;i<WN;i++)if(MAT[i]===M_WATER)MOON[i]=6+((hash2(i%WW,(i/WW)|0,sd+99)>.9)?10:0);
  for(const L of LAMPS)lampContribution(L);
  relightBox(0,0,WW-1,WH-1);
  /* a fine walk map (2-dot cells) for the autopilot, built from the very collision test the lamplighter uses */
  P2W=WW>>1;P2H=WH>>1;PASS2=new Uint8Array(P2W*P2H);D2=new Uint16Array(P2W*P2H);
  for(let y=0;y<P2H;y++)for(let x=0;x<P2W;x++)PASS2[y*P2W+x]=blocked(x*2+1,y*2+1,2,true)?0:1;
}
let P2W=1,P2H=1,PASS2=new Uint8Array(1),D2=new Uint16Array(1);const Q2=new Int32Array(256*256);
function bfs2(tx,ty){
  D2.fill(65535);let s=clamp(ty>>1,0,P2H-1)*P2W+clamp(tx>>1,0,P2W-1);
  if(!PASS2[s]){for(let r=1;r<6&&!PASS2[s];r++)for(let j=-r;j<=r&&!PASS2[s];j++)for(let i=-r;i<=r;i++){const x=clamp((tx>>1)+i,0,P2W-1),y=clamp((ty>>1)+j,0,P2H-1);if(PASS2[y*P2W+x]){s=y*P2W+x;break;}}}
  let h=0,t=0;D2[s]=0;Q2[t++]=s;
  while(h<t){const c=Q2[h++],cx=c%P2W,cy=(c/P2W)|0,d=D2[c]+1;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=P2W||ny>=P2H)continue;const n=ny*P2W+nx;
      if(!PASS2[n]||D2[n]<=d)continue;if(dx&&dy&&(!PASS2[cy*P2W+nx]||!PASS2[ny*P2W+cx]))continue;D2[n]=d;Q2[t++]=n;}}
}
/* the next step downhill on the fine map, a few cells ahead so the walk is smooth */
function step2(x,y){let cx=clamp(x>>1,0,P2W-1),cy=clamp(y>>1,0,P2H-1);
  for(let k=0;k<3;k++){let best=D2[cy*P2W+cx],bx=cx,by=cy;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=P2W||ny>=P2H)continue;if(dx&&dy&&(!PASS2[cy*P2W+nx]||!PASS2[ny*P2W+cx]))continue;const v=D2[ny*P2W+nx];if(v<best){best=v;bx=nx;by=ny;}}
    if(bx===cx&&by===cy)break;cx=bx;cy=by;}
  return [cx*2+1,cy*2+1];}
/* is a dot free for something the size of a person (radius ~2) */
function solidDot(x,y,lowToo){x|=0;y|=0;if(x<0||y<0||x>=WW||y>=WH)return true;const o=OCC[y*WW+x];if(o>=2)return true;if(MAT[y*WW+x]===M_WATER&&o===0)return true;return lowToo&&o===1;}
/* every dot of the body's footprint (a rounded square), so a thin post can never slip between samples */
function blocked(x,y,r,lowToo){const x0=Math.floor(x-r+.5),x1=Math.floor(x+r-.5),y0=Math.floor(y-r+.5),y1=Math.floor(y+r-.5);
  for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){if((xx===x0||xx===x1)&&(yy===y0||yy===y1)&&r>1)continue;if(solidDot(xx,yy,lowToo))return true;}return false;}
