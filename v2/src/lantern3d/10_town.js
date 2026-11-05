/* =====================================================================================
   19. 3D — THE TOWN. Each night's map is built twice from the same cells: once by the original
       code (04_world.js) into the flat occlusion map the rules use, and once here into houses,
       cobbles, fences, graves, trees, canals and lamp posts. Every solid thing also stamps its
       height into a height map (HM, two samples per dot); the lights cast their shadows from it.
       The placements reuse the original's hashes, so a gravestone stands where its dots are.
   ===================================================================================== */
const HR=2;
let HMW=2,HMH=2,HM=new Float32Array(4),HM_OUT=50;
const MT={plain:0,ground:1,wall:2,roof:3,wood:4,stone:5,iron:6,leaf:7,paint:8,rock:9,tower:10,canvas:11,bed:12,glass:13,brick:14,grate:15,bark:16,metal:17};
const TOWN={mesh:null,glass:null,water:null,mesh2:null,gtex:null,aotex:null,shore:null,kind:'night',lampsZ:24.5,sea:false,bounds:[0,0,384,256],pad:6};
function hmAlloc(w,h,out){HMW=w*HR;HMH=h*HR;HM=new Float32Array(HMW*HMH);HM_OUT=out;}
function hmFn(x0,y0,x1,y1,f){const a=Math.max(0,Math.ceil(x0*HR-.5)),b=Math.min(HMW,Math.ceil(x1*HR-.5)),c=Math.max(0,Math.ceil(y0*HR-.5)),d=Math.min(HMH,Math.ceil(y1*HR-.5));
  for(let y=c;y<d;y++)for(let x=a;x<b;x++){const h=f((x+.5)/HR,(y+.5)/HR);const i=y*HMW+x;if(h>HM[i])HM[i]=h;}}
function hmRect(x0,y0,x1,y1,h){hmFn(x0,y0,x1,y1,()=>h);}
function hmDisc(cx,cy,r,h){hmFn(cx-r,cy-r,cx+r,cy+r,(x,y)=>(x-cx)*(x-cx)+(y-cy)*(y-cy)<=r*r?h:0);}
function hmAt(x,y){const ix=Math.floor(x*HR),iy=Math.floor(y*HR);if(ix<0||iy<0||ix>=HMW||iy>=HMH)return HM_OUT;return HM[iy*HMW+ix];}
/* ---------- colours: albedo (as sRGB, squared to linear in the shader) and gloss ---------- */
const COL={stone:[.5,.48,.45,.18],dstone:[.36,.34,.32,.15],iron:[.09,.085,.09,.75],wood:[.44,.31,.2,.12],dwood:[.26,.18,.12,.1],paint:[.66,.63,.56,.12],leaf:[.17,.27,.12,.08],
  bark:[.27,.2,.14,.05],rock:[.44,.42,.4,.1],brick:[.46,.24,.17,.08],tower:[.84,.82,.78,.25],glass:[.2,.2,.22,.95],bed:[.05,.06,.06,.1],grate:[.11,.1,.1,.6],bronze:[.3,.36,.31,.45],
  canvas:[.7,.65,.55,.05],sand:[.62,.56,.45,.05],water:[.04,.06,.07,.9],plain:[.5,.5,.5,.2],cloth:[.3,.24,.2,.05]};
/* ---------- the nights in 3D: where the moon stands, the sky's tint, the mist ---------- */
const NIGHT3D=[
  {moonAz:-2.3,moonEl:.62,moonC:[.34,.42,.66],sky:[.020,.028,.05],gnd:[.012,.010,.010],fog:[.30,.33,.42],fogTop:34},
  {moonAz:-2.9,moonEl:.55,moonC:[.30,.38,.62],sky:[.018,.026,.048],gnd:[.010,.010,.012],fog:[.28,.32,.42],fogTop:30},
  {moonAz:-.6,moonEl:.42,moonC:[.40,.46,.70],sky:[.022,.030,.055],gnd:[.012,.011,.012],fog:[.34,.37,.48],fogTop:26},
  {moonAz:-1.9,moonEl:.9,moonC:[.24,.28,.40],sky:[.020,.024,.036],gnd:[.012,.011,.011],fog:[.36,.36,.40],fogTop:44},
  {moonAz:-1.57,moonEl:.38,moonC:[.36,.44,.70],sky:[.020,.030,.058],gnd:[.010,.012,.016],fog:[.30,.36,.50],fogTop:104,fogH:15}
];
let N3=NIGHT3D[0];
/* ---------- the houses: each block of '#' cells is cut into rectangles, and each rectangle into houses of 2-4 cells ---------- */
function blockRects(isB,x0,y0,x1,y1){
  const w=x1-x0,h=y1-y0,seen=new Uint8Array(w*h),out=[];
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){if(seen[(y-y0)*w+x-x0]||!isB(x,y))continue;
    let ex=x;while(ex+1<x1&&isB(ex+1,y)&&!seen[(y-y0)*w+ex+1-x0])ex++;
    let ey=y;for(;;){if(ey+1>=y1)break;let ok=true;for(let k=x;k<=ex;k++)if(!isB(k,ey+1)||seen[(ey+1-y0)*w+k-x0]){ok=false;break;}if(!ok)break;ey++;}
    for(let j=y;j<=ey;j++)for(let k=x;k<=ex;k++)seen[(j-y0)*w+k-x0]=1;out.push([x,y,ex+1,ey+1]);}
  return out;
}
function splitHouses(r,sd){
  const [x0,y0,x1,y1]=r,out=[],w=x1-x0,h=y1-y0;
  const cut=(a,b,s)=>{const seg=[];let p=a;while(p<b){let L=2+((hash2(p,s,sd+201)*3)|0);if(b-p-L===1)L++;if(L>b-p)L=b-p;seg.push([p,p+L]);p+=L;}return seg;};
  const xs=w>4||w>=h?cut(x0,x1,y0*7+3):[[x0,x1]],ys=h>4||h>w?cut(y0,y1,x0*5+11):[[y0,y1]];
  for(const [a,b] of xs)for(const [c,d] of ys)out.push([a,c,b,d]);return out;
}
function house(mb,cx0,cy0,cx1,cy1,sd,stamp){
  const x0=cx0*CS,y0=cy0*CS,x1=cx1*CS,y1=cy1*CS,w=x1-x0,d=y1-y0,seed=(hash2(cx0*3+cx1,cy0*5+cy1,sd+211)*255)|0,hs=hash2(cx0,cy0,sd+213);
  const alongX=w===d?hs>.5:w>d;                         /* the ridge runs along the long side */
  const hw=24+((hash2(cx0,cy1,sd+217)*5)|0)*4,span=alongX?d:w,half=span/2,rise=Math.min(15,half*(.55+hash2(cx1,cy0,sd+219)*.35)),zr=hw+rise,o=1.4,oz=o*rise/half;
  const wm=[MT.wall,hw/255,seed,1],rc=[.5,.5,.5,.2],rm=[MT.roof,0,seed,1];
  mb.box(x0,y0,0,x1,y1,hw,COL.plain,wm,15);
  if(alongX){const ym=y0+half;
    mb.quad([x0-o,y0-o,hw-oz],[x0-o,ym,zr],[x1+o,ym,zr],[x1+o,y0-o,hw-oz],rc,rm,nrm3(0,-rise,half));
    mb.quad([x1+o,y1+o,hw-oz],[x1+o,ym,zr],[x0-o,ym,zr],[x0-o,y1+o,hw-oz],rc,rm,nrm3(0,rise,half));
    for(const [x,nx] of [[x0,-1],[x1,1]]){const a=mb.v(x,y0,hw,nx,0,0,COL.plain,wm),b=mb.v(x,ym,zr,nx,0,0,COL.plain,wm),c=mb.v(x,y1,hw,nx,0,0,COL.plain,wm);mb.tri(a,b,c);}
    /* the roof's underside and its end boards, so the eaves don't look like paper */
    mb.box(x0-o,ym-.5,zr-.6,x1+o,ym+.5,zr+.35,COL.dwood,[MT.wood,0,0,1],31);
    if(stamp)hmFn(x0,y0,x1,y1,(x,y)=>hw+rise*(1-Math.abs(y-ym)/half));}
  else{const xm=x0+half;
    mb.quad([x0-o,y1+o,hw-oz],[xm,y1+o,zr],[xm,y0-o,zr],[x0-o,y0-o,hw-oz],rc,rm,nrm3(-rise,0,half));
    mb.quad([x1+o,y0-o,hw-oz],[xm,y0-o,zr],[xm,y1+o,zr],[x1+o,y1+o,hw-oz],rc,rm,nrm3(rise,0,half));
    for(const [y,ny] of [[y0,-1],[y1,1]]){const a=mb.v(x0,y,hw,0,ny,0,COL.plain,wm),b=mb.v(xm,y,zr,0,ny,0,COL.plain,wm),c=mb.v(x1,y,hw,0,ny,0,COL.plain,wm);mb.tri(a,b,c);}
    mb.box(xm-.5,y0-o,zr-.6,xm+.5,y1+o,zr+.35,COL.dwood,[MT.wood,0,1,1],31);
    if(stamp)hmFn(x0,y0,x1,y1,(x,y)=>hw+rise*(1-Math.abs(x-xm)/half));}
  /* a chimney on some roofs */
  if(hash2(cx0,cy0,sd+223)>.45){const ccx=x0+w*(.25+.5*hash2(cx1,cy1,sd+227)),ccy=y0+d*(.25+.5*hash2(cx1,cy0,sd+229));
    const ztop=zr+3.5,zb=hw;mb.box(ccx-1.5,ccy-1.5,zb,ccx+1.5,ccy+1.5,ztop,COL.brick,[MT.brick,0,seed,1],31);mb.box(ccx-1.8,ccy-1.8,ztop,ccx+1.8,ccy+1.8,ztop+.7,COL.dstone,[MT.stone,0,0,1],31);
    if(stamp)hmRect(ccx-1.5,ccy-1.5,ccx+1.5,ccy+1.5,ztop+.7);}
}
function nrm3(x,y,z){const l=Math.hypot(x,y,z);return [x/l,y/l,z/l];}
/* ---------- small things ---------- */
function ringWall(mb,cx,cy,r0,r1,z0,z1,c,m,seg){seg=seg||14;mb.cyl(cx,cy,z0,z1,r1,r1,seg,c,m,false);
  const b=mb.n;for(let i=0;i<=seg;i++){const a=i/seg*TAU,ca=Math.cos(a),sa=Math.sin(a);mb.v(cx+ca*r0,cy+sa*r0,z0,-ca,-sa,0,c,m);mb.v(cx+ca*r0,cy+sa*r0,z1,-ca,-sa,0,c,m);}
  for(let i=0;i<seg;i++){const a=b+i*2;mb.I.push(a,a+2,a+3,a,a+3,a+1);}
  const t=mb.n;for(let i=0;i<=seg;i++){const a=i/seg*TAU,ca=Math.cos(a),sa=Math.sin(a);mb.v(cx+ca*r0,cy+sa*r0,z1,0,0,1,c,m);mb.v(cx+ca*r1,cy+sa*r1,z1,0,0,1,c,m);}
  for(let i=0;i<seg;i++){const a=t+i*2;mb.I.push(a,a+3,a+2,a,a+1,a+3);}}
function discM(mb,cx,cy,z,r,c,m,seg){seg=seg||16;const ct=mb.v(cx,cy,z,0,0,1,c,m),b=mb.n;for(let i=0;i<=seg;i++){const a=i/seg*TAU;mb.v(cx+Math.cos(a)*r,cy+Math.sin(a)*r,z,0,0,1,c,m);}for(let i=0;i<seg;i++)mb.I.push(ct,b+i+1,b+i);}
function gable(mb,x0,y0,x1,y1,ze,zr,c,m){const ym=(y0+y1)/2,hy=(y1-y0)/2,rise=zr-ze;
  mb.quad([x0,y0,ze],[x0,ym,zr],[x1,ym,zr],[x1,y0,ze],c,m,nrm3(0,-rise,hy));mb.quad([x1,y1,ze],[x1,ym,zr],[x0,ym,zr],[x0,y1,ze],c,m,nrm3(0,rise,hy));}
function lampPost(mb,gb,L,li){
  const x=L.x,y=L.y,Z=TOWN.lampsZ;
  mb.box(x-1.5,y-1.5,0,x+1.5,y+1.5,1.2,COL.dstone,[MT.stone,0,0,1],31);
  mb.cyl(x,y,1.2,2.4,1.05,.85,10,COL.iron,[MT.iron,0,0,1]);
  mb.cyl(x,y,2.4,20.8,.62,.48,10,COL.iron,[MT.iron,0,0,1],false);
  mb.cyl(x,y,20.6,21.8,1.05,1.25,10,COL.iron,[MT.iron,0,0,1]);
  /* the cage: four corner bars, a floor, a pointed cap with a finial */
  for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]])mb.box(x+u*1.6-.25,y+v*1.6-.25,21.8,x+u*1.6+.25,y+v*1.6+.25,27.4,COL.iron,[MT.iron,0,0,1],31);
  mb.box(x-1.9,y-1.9,21.6,x+1.9,y+1.9,22,COL.iron,[MT.iron,0,0,1],31);
  mb.lathe(x,y,[[2.5,27.3],[2.5,27.8],[1.6,28.6],[.5,30.2],[.35,30.8],[.7,31.2],[0,31.9]],4,COL.iron,[MT.iron,0,0,1]);
  /* glass panes: drawn separately so each lamp can glow on its own */
  const gm=[MT.glass,0,li,1],s=1.48,z0=22,z1=27.3;
  gb.quad([x-s,y+s,z0],[x+s,y+s,z0],[x+s,y+s,z1],[x-s,y+s,z1],COL.glass,gm,[0,1,0]);
  gb.quad([x+s,y-s,z0],[x-s,y-s,z0],[x-s,y-s,z1],[x+s,y-s,z1],COL.glass,gm,[0,-1,0]);
  gb.quad([x+s,y+s,z0],[x+s,y-s,z0],[x+s,y-s,z1],[x+s,y+s,z1],COL.glass,gm,[1,0,0]);
  gb.quad([x-s,y-s,z0],[x-s,y+s,z0],[x-s,y+s,z1],[x-s,y-s,z1],COL.glass,gm,[-1,0,0]);
  /* the mantle inside, which glows white-hot when lit */
  gb.cyl(x,y,23.2,25.6,.55,.42,8,[.9,.85,.7,.1],[MT.glass,0,li,1]);
  hmRect(x-1,y-1,x+1,y+1,21);
}
/* ---------- the town ---------- */
function buildTown3D(){
  for(const k of ['mesh','glass','water'])if(TOWN[k]){freeMesh(TOWN[k]);TOWN[k]=null;}
  const st=ST,sd=st.seed,ni=NIGHTS.indexOf(st);N3=NIGHT3D[Math.max(0,ni)];TOWN.kind='night';
  const sea=!!st.boss,PAD=TOWN.pad;TOWN.sea=sea;hmAlloc(WW,WH,sea?0:50);
  /* the map, padded on every side: houses all round, water where a canal leaves the map, the sea round the island */
  const cellP=(cx,cy)=>{if(cx>=0&&cy>=0&&cx<MW&&cy<MH)return cellAt(cx,cy);if(sea)return '~';const ex=clamp(cx,0,MW-1),ey=clamp(cy,0,MH-1),e=cellAt(ex,ey);return e==='~'||e==='='?'~':'#';};
  const isB=(cx,cy)=>cellP(cx,cy)==='#',isW=(cx,cy)=>{const c=cellP(cx,cy);return c==='~';},isWB=(cx,cy)=>{const c=cellP(cx,cy);return c==='~'||c==='=';};
  const mb=new MB(),gb=new MB(),wb=new MB();
  /* houses */
  for(const r of blockRects(isB,-PAD,-PAD,MW+PAD,MH+PAD))for(const h of splitHouses(r,sd)){const inMap=h[2]>0&&h[3]>0&&h[0]<MW&&h[1]<MH;house(mb,h[0],h[1],h[2],h[3],sd,inMap);}
  /* ground: one quad per open cell; the shader paints cobbles, grass, dirt and sand from a weight map */
  const gm=[MT.ground,0,0,1];
  for(let cy=-PAD;cy<MH+PAD;cy++)for(let cx=-PAD;cx<MW+PAD;cx++){if(isB(cx,cy)||isWB(cx,cy))continue;const x=cx*CS,y=cy*CS;mb.quad([x,y,0],[x,y+CS,0],[x+CS,y+CS,0],[x+CS,y,0],COL.plain,gm,[0,0,1]);}
  /* canals and the sea: a stone bank down to the bed wherever water meets land; the water itself is one big sheet */
  let anyW=false;
  for(let cy=-PAD;cy<MH+PAD;cy++)for(let cx=-PAD;cx<MW+PAD;cx++){if(!isWB(cx,cy))continue;anyW=true;const x=cx*CS,y=cy*CS,sandy=sea||groundOf(clamp(cx,0,MW-1),clamp(cy,0,MH-1))==='sand';
    mb.quad([x,y,-7],[x+CS,y,-7],[x+CS,y+CS,-7],[x,y+CS,-7],COL.bed,[MT.bed,0,0,1],[0,0,1]);
    const bank=sandy?COL.sand:COL.dstone,bm=[sandy?MT.ground:MT.stone,0,0,1];
    if(sandy){/* a beach: the sand runs down under the water instead of stopping at a wall */
      for(const [u,v] of [[1,0],[-1,0],[0,1],[0,-1]]){if(isWB(cx+u,cy+v))continue;const S=3.2,z1=-3.2,wc=[.36,.31,.24,.2];
        if(u===1)mb.quad([x+CS,y,0],[x+CS,y+CS,0],[x+CS-S,y+CS,z1],[x+CS-S,y,z1],wc,bm,nrm3(.7,0,.7));
        if(u===-1)mb.quad([x,y+CS,0],[x,y,0],[x+S,y,z1],[x+S,y+CS,z1],wc,bm,nrm3(-.7,0,.7));
        if(v===1)mb.quad([x+CS,y+CS,0],[x,y+CS,0],[x,y+CS-S,z1],[x+CS,y+CS-S,z1],wc,bm,nrm3(0,.7,.7));
        if(v===-1)mb.quad([x,y,0],[x+CS,y,0],[x+CS,y+S,z1],[x,y+S,z1],wc,bm,nrm3(0,-.7,.7));}
      continue;}
    for(const [u,v] of [[1,0],[-1,0],[0,1],[0,-1]]){if(isWB(cx+u,cy+v)||isB(cx+u,cy+v)&&!sandy)continue;
      if(u===1)mb.quad([x+CS,y,0],[x+CS,y+CS,0],[x+CS,y+CS,-7],[x+CS,y,-7],bank,bm,[-1,0,0]);
      if(u===-1)mb.quad([x,y+CS,0],[x,y,0],[x,y,-7],[x,y+CS,-7],bank,bm,[1,0,0]);
      if(v===1)mb.quad([x+CS,y+CS,0],[x,y+CS,0],[x,y+CS,-7],[x+CS,y+CS,-7],bank,bm,[0,-1,0]);
      if(v===-1)mb.quad([x,y,0],[x+CS,y,0],[x+CS,y,-7],[x,y,-7],bank,bm,[0,1,0]);
      /* a coping stone along a canal's edge */
      if(!sandy){const cs=[MT.stone,0,0,1];if(u===1)mb.box(x+CS,y,0,x+CS+.9,y+CS,.5,COL.stone,cs,31);if(u===-1)mb.box(x-.9,y,0,x,y+CS,.5,COL.stone,cs,31);if(v===1)mb.box(x,y+CS,0,x+CS,y+CS+.9,.5,COL.stone,cs,31);if(v===-1)mb.box(x,y-.9,0,x+CS,y,.5,COL.stone,cs,31);}}
    if(cellP(cx,cy)==='='){/* a plank bridge on two beams */
      const hor=isWB(cx-1,cy)&&cellP(cx-1,cy)==='='||isWB(cx+1,cy)&&cellP(cx+1,cy)==='='||!isWB(cx-1,cy)||!isWB(cx+1,cy);
      mb.box(x,y,-.6,x+CS,y+CS,.35,COL.wood,[MT.wood,0,hor?0:1,1],31);
      for(const k of [1.5,6.5])if(hor)mb.box(x,y+k-.6,-3,x+CS,y+k+.6,-.6,COL.dwood,[MT.wood,0,0,1],15);else mb.box(x+k-.6,y,-3,x+k+.6,y+CS,-.6,COL.dwood,[MT.wood,0,1,1],15);}}
  /* past the edge of the map: more roofs of the sleeping town, fading into the mist */
  if(!sea){const x0=-PAD*CS,y0=-PAD*CS,x1=WW+PAD*CS,y1=WH+PAD*CS,F=900,z=32,rm=[MT.roof,0,77,1],c=[.5,.5,.5,.1];
    mb.quad([x0-F,y0-F,z],[x0-F,y1+F,z],[x0,y1+F,z],[x0,y0-F,z],c,rm,[0,0,1]);mb.quad([x1,y0-F,z],[x1,y1+F,z],[x1+F,y1+F,z],[x1+F,y0-F,z],c,rm,[0,0,1]);
    mb.quad([x0,y0-F,z],[x0,y0,z],[x1,y0,z],[x1,y0-F,z],c,rm,[0,0,1]);mb.quad([x0,y1,z],[x0,y1+F,z],[x1,y1+F,z],[x1,y1,z],c,rm,[0,0,1]);}
  if(anyW){const E=sea?2600:PAD*CS+200;wb.quad([-E,-E,-1.2],[-E,WH+E,-1.2],[WW+E,WH+E,-1.2],[WW+E,-E,-1.2],COL.water,[0,0,0,1],[0,0,1]);}
  /* bridge rails: low stone where a bridge meets water, as the rules have them */
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){if(CELL[cellAt(cx,cy)]!=='bridge')continue;
    for(const [u,v] of [[0,-1],[0,1],[-1,0],[1,0]]){if(CELL[cellAt(cx+u,cy+v)]!=='water')continue;
      const x0=u?cx*CS+(u>0?CS-1:0):cx*CS,y0=v?cy*CS+(v>0?CS-1:0):cy*CS,x1=u?x0+1:x0+CS,y1=v?y0+1:y0+CS;
      mb.box(x0+.1,y0+.1,.35,x1-.1,y1-.1,5.6,COL.stone,[MT.stone,0,0,1],31);mb.box(x0-.1,y0-.1,5.6,x1+.1,y1+.1,6.3,COL.dstone,[MT.stone,0,0,1],31);hmRect(x0,y0,x1,y1,6.3);
      for(let k=0;k<CS;k+=4){const px=u?x0:x0+k,py=v?y0:y0+k;mb.box(px-.15,py-.15,.35,px+1.15,py+1.15,7.2,COL.stone,[MT.stone,0,0,1],31);hmRect(px,py,px+1,py+1,7.2);}}}
  /* features, cell by cell, with the original's own dice */
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){const t=CELL[cellAt(cx,cy)];if(!t)continue;featureMesh(mb,cx,cy,t,sd);}
  LAMPS.forEach((L,i)=>lampPost(mb,gb,L,i));
  /* spawn wells: an iron grate in the street, with dark breath coming up */
  for(const w of WELLS){ringWall(mb,w.x,w.y,2.6,3.5,0,.45,COL.dstone,[MT.stone,0,0,1],16);discM(mb,w.x,w.y,.08,2.6,COL.grate,[MT.grate,0,0,1],16);}
  TOWN.mesh=mb.build();TOWN.glass=gb.build();TOWN.water=wb.build();TOWN.anyW=anyW;TOWN.tris=(TOWN.mesh?TOWN.mesh.tris:0)+(TOWN.glass?TOWN.glass.tris:0);
  TOWN.bounds=[0,0,WW,WH];townTextures(sea);
}
function featureMesh(mb,cx,cy,t,sd){
  const x0=cx*CS,y0=cy*CS,mx=x0+4,my=y0+4,hs=hash2(cx,cy,sd+9),S5=[MT.stone,0,0,1];
  if(t==='tree'){const r=1.6+hs*.6,tx=mx+(hs-.5)*2,ty=my+(hash2(cx,cy,sd+10)-.5)*2;
    mb.lathe(tx,ty,[[r*1.45,0],[r*1.05,1.4],[r*.85,8],[r*.7,15],[r*.45,21],[r*.2,25]],9,COL.bark,[MT.bark,0,0,1]);hmDisc(tx,ty,r,19);
    const R=7.2+hs*1.5,lc=[.15+hs*.05,.25+hs*.06,.11,.06];
    mb.blob(mx,my,26,R*.78,R*.78,R*.55,2,lc,[MT.leaf,0,(hs*255)|0,1],.32,cx*3+cy);
    for(let k=0;k<4;k++){const a=k/4*TAU+hs*3,rr=R*.5;mb.blob(mx+Math.cos(a)*rr,my+Math.sin(a)*rr,21+hash2(cx,cy,sd+300+k)*6,R*.5,R*.5,R*.42,2,lc,[MT.leaf,0,(hs*255+k*40)&255,1],.35,cx+k*7);}}
  else if(t==='grave'){const k=1+(hs>.4?1:0);for(let n=0;n<k;n++){const gx=x0+1+((hash2(cx,cy,sd+20+n)*4)|0),gy=y0+1+n*3+((hash2(cx,cy,sd+30+n)*2)|0),age=hash2(cx,cy,sd+50+n);
      const sc=[.44+age*.12,.43+age*.1,.4+age*.08,.12];
      if(hash2(cx,cy,sd+40+n)>.55){/* a cross on a low plinth */
        mb.box(gx+.7,gy-.9,0,gx+2.3,gy+1.9,1,COL.dstone,S5,31);mb.box(gx+1.05,gy+.05,1,gx+1.95,gy+.95,9.4,sc,S5,31);mb.box(gx,gy+.05,5.8,gx+3,gy+.95,6.9,sc,S5,31);
        hmRect(gx+1,gy-1,gx+2,gy+2,1);hmRect(gx,gy,gx+3,gy+1,6.9);hmRect(gx+1,gy,gx+2,gy+1,9.4);}
      else{/* a headstone with a rounded top */
        mb.box(gx-.2,gy-.2,0,gx+3.2,gy+2.2,.8,COL.dstone,S5,31);mb.box(gx+.05,gy+.35,.8,gx+2.95,gy+1.35,5.4,sc,S5,31);
        mb.cyl(gx+1.5,gy+.85,5.4,6.3,1.45,1.2,10,sc,S5);hmRect(gx,gy,gx+3,gy+2,.8);hmRect(gx,gy+.3,gx+3,gy+1.4,6.3);}}}
  else if(t==='fence'||t==='hedge'){const L=CELL[cellAt(cx-1,cy)],R=CELL[cellAt(cx+1,cy)],U=CELL[cellAt(cx,cy-1)],D=CELL[cellAt(cx,cy+1)];
    const hor=L===t||R===t||(!(U===t||D===t)),ver=U===t||D===t,hedge=t==='hedge';
    if(hedge){const lc=[.13,.22,.1,.05],lm=[MT.leaf,0,(hs*255)|0,1];
      if(hor){mb.box(x0,y0+3,0,x0+CS,y0+6,7.6,lc,lm,31);mb.box(x0,y0+3.4,7.6,x0+CS,y0+5.6,8.6,lc,lm,31);hmRect(x0,y0+3,x0+CS,y0+6,8.6);}
      if(ver){mb.box(x0+3,y0,0,x0+6,y0+CS,7.6,lc,lm,31);mb.box(x0+3.4,y0,7.6,x0+5.6,y0+CS,8.6,lc,lm,31);hmRect(x0+3,y0,x0+6,y0+CS,8.6);}}
    else{const pm=[MT.paint,0,0,1],pc=[.58+hs*.08,.56+hs*.07,.5,.1];
      /* pickets where the rules put fence dots: runs of solid dots become boards with pointed tops */
      const run=(get,emit)=>{let a=-1;for(let i=0;i<=CS;i++){const on=i<CS&&get(i);if(on&&a<0)a=i;if(!on&&a>=0){emit(a,i);a=-1;}}};
      if(hor){run(i=>{const x=x0+i;return (x%3)!==2||i===0;},(a,b)=>{const xa=x0+a,xb=x0+b;mb.box(xa+.15,my+.1,0,xb-.15,my+.9,8.4,pc,pm,31);mb.box(xa+.45,my+.15,8.4,xb-.45,my+.85,9.2,pc,pm,31);hmRect(xa,my,xb,my+1,9.2);});
        for(const z of [2.4,6.2])mb.box(x0,my+.9,z,x0+CS,my+1.35,z+.8,COL.wood,[MT.wood,0,0,1],31);}
      if(ver){run(j=>{const y=y0+j;return (y%3)!==2||j===0;},(a,b)=>{const ya=y0+a,yb=y0+b;mb.box(mx+.1,ya+.15,0,mx+.9,yb-.15,8.4,pc,pm,31);mb.box(mx+.15,ya+.45,8.4,mx+.85,yb-.45,9.2,pc,pm,31);hmRect(mx,ya,mx+1,yb,9.2);});
        for(const z of [2.4,6.2])mb.box(mx+.9,y0,z,mx+1.35,y0+CS,z+.8,COL.wood,[MT.wood,0,1,1],31);}}}
  else if(t==='crates'){const n=2+((hs*2)|0);for(let k=0;k<n;k++){const bx=x0+((hash2(cx,cy,sd+50+k)*4)|0),by=y0+((hash2(cx,cy,sd+60+k)*4)|0),round=hash2(cx,cy,sd+70+k)>.5,h=4+k*.35;
      if(round){mb.cyl(bx+2,by+2,0,h+1,1.75,1.75,10,COL.wood,[MT.wood,0,1,1]);mb.cyl(bx+2,by+2,h*.3,h*.3+.4,1.85,1.85,10,COL.iron,[MT.iron,0,0,1],false);mb.cyl(bx+2,by+2,h*.75,h*.75+.4,1.85,1.85,10,COL.iron,[MT.iron,0,0,1],false);hmDisc(bx+2,by+2,1.8,h+1);}
      else{mb.box(bx+.1,by+.1,0,bx+3.9,by+3.9,h,COL.wood,[MT.wood,0,k&1,1],31);mb.box(bx,by,h-.5,bx+4,by+4,h+.1,COL.dwood,[MT.wood,0,0,1],31);hmRect(bx,by,bx+4,by+4,h+.1);}}}
  else if(t==='stall'){const cm=[MT.canvas,0,(hs*255)|0,1];
    mb.box(x0+1,y0+1,0,x0+7,y0+4,5.8,COL.wood,[MT.wood,0,0,1],31);mb.box(x0+.8,y0+.8,5.8,x0+7.2,y0+4.2,6.3,COL.dwood,[MT.wood,0,0,1],31);hmRect(x0+1,y0+1,x0+7,y0+4,6.3);
    for(const [u,v] of [[1.2,1.2],[6.8,1.2],[1.2,3.8],[6.8,3.8]])mb.box(x0+u-.3,y0+v-.3,6.3,x0+u+.3,y0+v+.3,15.2,COL.dwood,[MT.wood,0,0,1],31);
    mb.quad([x0+.3,y0+.4,15.6],[x0+.3,y0+5.6,12.4],[x0+7.7,y0+5.6,12.4],[x0+7.7,y0+.4,15.6],COL.canvas,cm,nrm3(0,3.2,5.2));
    for(let k=0;k<3;k++){const gx=x0+2+k*2,c=[[.6,.25,.12,.2],[.55,.5,.18,.2],[.3,.4,.16,.2]][(k+((hs*3)|0))%3];mb.blob(gx,y0+2.5,7.2,.9,.9,.7,1,c,[MT.plain,0,0,1],.2,k);}}
  else if(t==='bench'){const bm=[MT.wood,0,0,1];mb.box(x0+1,my,2.6,x0+7,my+1.6,3.2,COL.wood,bm,31);mb.box(x0+1,my+1.45,3.2,x0+7,my+1.95,6.2,COL.wood,bm,31);
    for(const u of [1.6,6.4])mb.box(x0+u-.3,my+.2,0,x0+u+.3,my+1.9,2.6,COL.iron,[MT.iron,0,0,1],31);hmRect(x0+1,my,x0+7,my+2,3.2);hmRect(x0+1,my+1.4,x0+7,my+2,6.2);}
  else if(t==='wellstone'){ringWall(mb,mx,my,2.05,3.4,0,6,COL.stone,S5,16);discM(mb,mx,my,3.2,2.05,COL.water,[MT.bed,0,0,1],14);hmDisc(mx,my,3.4,6);
    for(const u of [-2.75,2.75])mb.box(mx+u-.35,my-.35,6,mx+u+.35,my+.35,15,COL.dwood,[MT.wood,0,0,1],31);mb.box(mx-3,my-.2,12.6,mx+3,my+.2,13,COL.dwood,[MT.wood,0,0,1],31);
    gable(mb,mx-3.8,my-2.4,mx+3.8,my+2.4,14.2,17.6,[.3,.2,.15,.15],[MT.roof,0,40,1]);mb.box(mx-.7,my-.7,8.5,mx+.7,my+.7,10,COL.dwood,[MT.wood,0,0,1],31);}
  else if((t==='statue'||t==='tower')&&(CELL[cellAt(cx-1,cy)]===t||CELL[cellAt(cx,cy-1)]===t))return;
  else if(t==='statue'){const sx=mx+4,sy=my+4;ringWall(mb,sx,sy,6.3,7.5,0,4,COL.stone,S5,24);discM(mb,sx,sy,2.6,6.4,COL.water,[MT.bed,0,0,1],24);hmFn(sx-7.5,sy-7.5,sx+7.5,sy+7.5,(x,y)=>{const d=Math.hypot(x-sx,y-sy);return d>6.3&&d<=7.5?4:0;});
    mb.lathe(sx,sy,[[2.3,0],[2.3,7.6],[2.6,8],[2.6,9],[0,9]],12,COL.stone,S5);hmDisc(sx,sy,2.3,9);
    /* the first lamplighter, in bronze, his lamp held high */
    mb.lathe(sx,sy,[[1.75,9],[1.6,11],[1.2,16],[.95,18.2],[.6,18.8],[0,18.9]],10,COL.bronze,[MT.metal,0,0,1]);mb.blob(sx,sy,20,1.05,1.05,1.2,1,COL.bronze,[MT.metal,0,0,1],0,1);
    mb.box(sx+.5,sy-.35,17,sx+1.2,sy+.35,24.2,COL.bronze,[MT.metal,0,0,1],31);mb.box(sx+.3,sy-.7,24.2,sx+1.7,sy+.7,25.8,COL.bronze,[MT.metal,0,0,1],31);hmDisc(sx,sy,1.7,19);}
  else if(t==='rocks'){const n=2+((hs*3)|0);for(let k=0;k<n;k++){const rx=x0+hash2(cx,cy,sd+80+k)*8,ry=y0+hash2(cx,cy,sd+90+k)*8,r=1.5+hash2(cx,cy,sd+95+k)*2.2;
      mb.blob(rx,ry,r*.3,r*1.1,r*1.05,r*1.15,2,[.38+hs*.08,.37+hs*.07,.35,.1],[MT.rock,0,(k*60)&255,1],.3,cx*11+k);hmFn(rx-r,ry-r,rx+r,ry+r,(x,y)=>{const q=1-((x-rx)**2+(y-ry)**2)/(r*r);return q>0?r*.3+r*1.15*Math.sqrt(q):0;});}}
  else if(t==='tower'){const tx=mx+4,ty=my+4;
    mb.lathe(tx,ty,[[11.6,0],[11.6,3.2],[10.2,3.2],[9.6,30],[8.6,62],[8,84]],20,COL.tower,[MT.tower,0,0,1]);hmDisc(tx,ty,10.2,84);
    mb.cyl(tx,ty,84,85.6,10.4,10.4,20,COL.iron,[MT.iron,0,0,1]);ringWall(mb,tx,ty,9.9,10.3,85.6,89.4,COL.iron,[MT.iron,0,0,1],24);
    mb.cyl(tx,ty,85.6,86.6,5.9,5.9,16,COL.iron,[MT.iron,0,0,1]);
    TOWN.towerGlass=true;mb.cyl(tx,ty,86.6,96,5.6,5.6,16,COL.glass,[MT.glass,0,15,1],false);
    for(let k=0;k<8;k++){const a=k/8*TAU;mb.box(tx+Math.cos(a)*5.6-.25,ty+Math.sin(a)*5.6-.25,86.6,tx+Math.cos(a)*5.6+.25,ty+Math.sin(a)*5.6+.25,96,COL.iron,[MT.iron,0,0,1],31);}
    mb.lathe(tx,ty,[[6.6,96],[6.4,96.8],[3.6,100.2],[1,101.6],[.9,102.4],[1.3,103],[0,104]],16,[.42,.1,.08,.35],[MT.metal,0,0,1]);}
}
/* ---------- textures the town needs: where each ground is, how much is crowded round a spot, where the shore is ---------- */
function blur(src,w,h,ch,passes){let a=src,b=new Float32Array(a.length);
  for(let p=0;p<passes;p++){for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<ch;c++){let s=0;for(let k=-1;k<=1;k++)s+=a[(y*w+clamp(x+k,0,w-1))*ch+c];b[(y*w+x)*ch+c]=s/3;}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<ch;c++){let s=0;for(let k=-1;k<=1;k++)s+=b[(clamp(y+k,0,h-1)*w+x)*ch+c];a[(y*w+x)*ch+c]=s/3;}}
  return a;}
function townTextures(sea){
  for(const k of ['gtex','aotex','shore'])if(TOWN[k]){gl.deleteTexture(TOWN[k]);TOWN[k]=null;}
  /* ground weights at a dot each: road, grass, dirt, sand */
  const gw=new Float32Array(WW*WH*4),KIND={road:0,grass:1,dirt:2,sand:3,bridge:0,water:2};
  for(let cy=0;cy<MH;cy++)for(let cx=0;cx<MW;cx++){const k=KIND[groundOf(cx,cy)]??0;for(let j=0;j<CS;j++)for(let i=0;i<CS;i++)gw[((cy*CS+j)*WW+cx*CS+i)*4+k]=1;}
  blur(gw,WW,WH,4,2);const g8=new Uint8Array(gw.length);for(let i=0;i<gw.length;i++)g8[i]=Math.round(gw[i]*255);
  TOWN.gtex=mkTex(WW,WH,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,g8,gl.LINEAR);
  /* contact shade: how much stands round each dot, and how tall; grounds everything */
  const ao=new Float32Array(WW*WH);for(let y=0;y<WH;y++)for(let x=0;x<WW;x++){const h=hmAt(x+.5,y+.5);ao[y*WW+x]=Math.min(1,h/10);}
  blur(ao,WW,WH,1,3);const a8=new Uint8Array(ao.length);for(let i=0;i<ao.length;i++)a8[i]=Math.round(clamp(ao[i],0,1)*255);
  TOWN.aotex=mkTex(WW,WH,gl.R8,gl.RED,gl.UNSIGNED_BYTE,a8,gl.LINEAR);
  /* the shore: 1 on land, fading out over the water, for foam and shallows */
  const sw=WW>>1,sh=WH>>1,so=new Float32Array(sw*sh);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const c=CELL[cellAt((x*2/CS)|0,(y*2/CS)|0)];so[y*sw+x]=c==='water'||c==='bridge'?0:1;}
  blur(so,sw,sh,1,4);const s8=new Uint8Array(so.length);for(let i=0;i<so.length;i++)s8[i]=Math.round(clamp(so[i],0,1)*255);
  TOWN.shore=mkTex(sw,sh,gl.R8,gl.RED,gl.UNSIGNED_BYTE,s8,gl.LINEAR);
}
/* ---------- the title: the word LANTERN in raised iron letters on a cobbled floor ---------- */
function buildTitle3D(){
  for(const k of ['mesh','glass','water'])if(TOWN[k]){freeMesh(TOWN[k]);TOWN[k]=null;}
  TOWN.kind='title';TOWN.sea=false;N3={moonAz:-2.2,moonEl:.75,moonC:[.20,.25,.42],sky:[.012,.016,.03],gnd:[.008,.007,.007],fog:[.3,.32,.4],fogTop:30};
  hmAlloc(WW,WH,0);const mb=new MB(),gm=[MT.ground,0,0,1],E=120;
  mb.quad([-E,-E,0],[-E,WH+E,0],[WW+E,WH+E,0],[WW+E,-E,0],COL.plain,gm,[0,0,1]);
  const sc=3,word='LANTERN',x0=Math.round((WW-(word.length*6*sc-sc))/2),y0=20,lm=[MT.metal,0,0,1],lc=[.2,.18,.17,.55];
  for(let k=0;k<word.length;k++){const g5=G5[word[k]];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((g5[r]>>(4-c))&1){
    const x=x0+k*6*sc+c*sc,y=y0+r*sc;mb.box(x,y,0,x+sc,y+sc,7,lc,lm,31);mb.box(x-.25,y-.25,0,x+sc+.25,y+sc+.25,.6,COL.dstone,[MT.stone,0,0,1],31);hmRect(x,y,x+sc,y+sc,7);}}
  TOWN.mesh=mb.build();TOWN.glass=null;TOWN.water=null;TOWN.anyW=false;TOWN.tris=TOWN.mesh.tris;TOWN.bounds=[0,0,WW,WH];townTextures(false);
}
