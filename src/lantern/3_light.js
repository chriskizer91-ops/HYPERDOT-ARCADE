/* =====================================================================================
   6. LIGHT — every lit dot is the sum of a few lights, each with its own shadows.
      A light keeps a 1-D polar shadow map: for each of A directions, how far its rays get
      before an occluder (a grid DDA through the town's occlusion map). A dot at distance d
      in direction a is lit if d is not beyond the map there. Penumbrae come from the size
      of the flame: a dot behind an edge sees part of the flame, and the angular width of
      that partial view grows with its distance behind the edge, so shadows are crisp at the
      foot of a wall and soft far from it (contact hardening), all from the 1-D map.
      Street lamps are static, so their light is baked into a world light map once; only the
      hand lantern, flares and the lighthouse are traced every frame.
      Occluders come in two heights: low ones (fences, gravestones, crates) stop the hand
      lantern but not a lamp on its post; tall ones (walls, trunks, posts) stop everything.
   ===================================================================================== */
let WW=384,WH=256,WN=WW*WH;
let OCC=new Uint8Array(WN),ALB=new Uint8Array(WN),MAT=new Uint8Array(WN),MOON=new Uint8Array(WN),LMAP=new Float32Array(WN),LMID=new Uint8Array(WN);
const M_ROAD=0,M_GRASS=1,M_WATER=2,M_ROOF=3,M_BRIDGE=4,M_WALL=5,M_DIRT=6,M_STONE=7,M_ROCK=8,M_SAND=9,M_FLOOR=10;
function worldAlloc(w,h){WW=w;WH=h;WN=w*h;OCC=new Uint8Array(WN);ALB=new Uint8Array(WN);MAT=new Uint8Array(WN);MOON=new Uint8Array(WN);LMAP=new Float32Array(WN);LMID=new Uint8Array(WN).fill(255);}
/* polar lookups for offsets within +-127 dots: angle (0..1 of a turn) and distance */
const ANG=new Float32Array(256*256),DST=new Float32Array(256*256);
for(let dy=-128;dy<128;dy++)for(let dx=-128;dx<128;dx++){const k=(dy+128)*256+dx+128;let a=Math.atan2(dy+.0001,dx+.0001)/TAU;if(a<0)a+=1;ANG[k]=a;DST[k]=Math.sqrt(dx*dx+dy*dy);}
/* ---------- the shadow map: A rays by DDA through the occlusion grid ---------- */
const WMAX=6;
function mkShadow(A){return {A,d:new Float32Array(A),mn:new Float32Array(A),mx:new Float32Array(A),x:0,y:0,R:0};}
function castShadow(S,lx,ly,R,block,skip){
  const A=S.A,d=S.d;S.x=lx;S.y=ly;S.R=R;
  for(let a=0;a<A;a++){
    const th=(a+.5)/A*TAU,dx=Math.cos(th),dy=Math.sin(th);
    let ix=Math.floor(lx),iy=Math.floor(ly);
    const sx=dx>0?1:-1,sy=dy>0?1:-1,tdx=Math.abs(1/dx),tdy=Math.abs(1/dy);
    let tx=dx>0?(ix+1-lx)*tdx:(lx-ix)*tdx,ty=dy>0?(iy+1-ly)*tdy:(ly-iy)*tdy,t=0,hit=R+2;
    while(t<=R){
      if(ix<0||iy<0||ix>=WW||iy>=WH){hit=t;break;}
      if(t>skip&&OCC[iy*WW+ix]>=block){hit=t;break;}
      if(tx<ty){t=tx;tx+=tdx;ix+=sx;}else{t=ty;ty+=tdy;iy+=sy;}
    }
    d[a]=hit;
  }
  /* the nearest and farthest edge within +-WMAX bins: most dots are decided by these two alone */
  const mn=S.mn,mx=S.mx;
  for(let a=0;a<A;a++){let lo=1e9,hi=0;for(let j=-WMAX;j<=WMAX;j++){const v=d[(a+j+A)%A];if(v<lo)lo=v;if(v>hi)hi=v;}mn[a]=lo;mx[a]=hi;}
}
/* visibility of a dot at polar (af = angle in bins, dist) from a flame of radius src */
function vis(S,af,dist,src){
  const A=S.A,a=(af|0)%A,pen=1.15;
  if(dist<=S.mn[a]+pen)return 1;
  if(dist>S.mx[a]+pen+3)return 0;
  const d=S.d,dmin=Math.max(1,S.mn[a]);
  let w=src*(dist-dmin)/(dmin*dist)*A/TAU;w=w<.5?.5:w>WMAX?WMAX:w;
  const lo=Math.floor(af-w),hi=Math.floor(af+w);let s=0,n=0;
  for(let j=lo;j<=hi;j++){const wt=j===lo?1-(af-w-lo):j===hi?(af+w-hi):1;const v=d[(j%A+A)%A];s+=wt*clamp((v+pen-dist)*.8+.5,0,1);n+=wt;}
  return n>0?s/n:1;
}
/* ---------- static lamps, baked ---------- */
const LAMPS=[];
function lampContribution(L){
  const R=L.R,S=mkShadow(512);castShadow(S,L.x+.5,L.y+.5,R,2,2.2);L.S=S;
  const sz=2*R+1,c=new Float32Array(sz*sz);
  for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const wx=L.x+i,wy=L.y+j;if(wx<0||wy<0||wx>=WW||wy>=WH)continue;
    const k=(j+128)*256+i+128,d=DST[k];if(d>R)continue;const f=1-d*d/(R*R),fall=f*f*(1+1.6/(1+d*.12));
    const v=vis(S,ANG[k]*S.A,d,2.2);if(v<=0)continue;c[(j+R)*sz+i+R]=L.I*fall*v;}
  L.C=c;
}
/* rebuild the light map where a lamp changed (all lit lamps whose pools touch that box) */
function relightBox(x0,y0,x1,y1){
  x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(WW-1,x1);y1=Math.min(WH-1,y1);
  for(let y=y0;y<=y1;y++){LMAP.fill(0,y*WW+x0,y*WW+x1+1);LMID.fill(255,y*WW+x0,y*WW+x1+1);}
  const best=new Float32Array((x1-x0+1)*(y1-y0+1));
  for(let li=0;li<LAMPS.length;li++){const L=LAMPS[li];if(!L.lit||!L.C)continue;const R=L.R,sz=2*R+1;
    const ax=Math.max(x0,L.x-R),ay=Math.max(y0,L.y-R),bx=Math.min(x1,L.x+R),by=Math.min(y1,L.y+R);if(ax>bx||ay>by)continue;
    for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++){const v=L.C[(y-L.y+R)*sz+x-L.x+R];if(v<=0)continue;const w=y*WW+x;LMAP[w]+=v;const b=(y-y0)*(x1-x0+1)+x-x0;if(v>best[b]){best[b]=v;LMID[w]=li;}}}
}
function lampToggle(L,on){L.lit=on;relightBox(L.x-L.R,L.y-L.R,L.x+L.R,L.y+L.R);}
/* ---------- the per-frame buffers (screen space) ---------- */
const LB=new Float32Array(N),EMB=new Float32Array(N),VOID=new Float32Array(N),RAD=new Float32Array(N);
const CAM={x:0,y:0,tx:0,ty:0,sx:0,sy:0};
/* a dynamic light: omni falloff, optional cone, optional shadow map */
function addLight(lx,ly,R,I,opt){
  opt=opt||{};const S=opt.S,src=opt.src||1.2,cone=opt.cone,ci=cone?Math.cos(cone.half):0,cx=cone?Math.cos(cone.dir):0,cy=cone?Math.sin(cone.dir):0,soft=cone?cone.soft||.1:0;
  const sx0=Math.floor(lx-VX),sy0=Math.floor(ly-VY);           /* relative to this frame's view origin (shake included) */
  const x0=Math.max(0,sx0-R),x1=Math.min(W-1,sx0+R),y0=Math.max(0,sy0-R),y1=Math.min(H-1,sy0+R);
  const fx=lx-Math.floor(lx),fy=ly-Math.floor(ly);
  for(let y=y0;y<=y1;y++){const dy=y-sy0;
    for(let x=x0;x<=x1;x++){const dx=x-sx0,k=(dy+128)*256+dx+128;
      const ddx=dx+.5-fx,ddy=dy+.5-fy,d=Math.sqrt(ddx*ddx+ddy*ddy);if(d>R)continue;
      let f=1-d*d/(R*R);f*=f;
      if(cone){const cs=(ddx*cx+ddy*cy)/(d||1);if(cs<ci-soft)continue;f*=smooth(ci-soft,ci+soft,cs)*(opt.near?smooth(0,opt.near,d):1);}
      else f*=(1+(opt.hot||0)/(1+d*.2));
      let v=1;if(S)v=vis(S,ANG[k]*S.A,d,src);
      if(v<=0)continue;LB[y*W+x]+=I*f*v;}}
}
/* light at a world point, for game logic (no penumbra, cheap) */
function lightAt(wx,wy,withLantern){
  wx|=0;wy|=0;if(wx<0||wy<0||wx>=WW||wy>=WH)return 0;let L=LMAP[wx+wy*WW];
  if(withLantern)L+=withLantern(wx,wy);return L;
}
function shadowTest(S,wx,wy){const dx=wx-S.x,dy=wy-S.y,d=Math.hypot(dx,dy);if(d>S.R)return 0;let a=Math.atan2(dy,dx)/TAU;if(a<0)a+=1;const ai=(a*S.A)|0;return d<=S.d[ai%S.A]+1?1:0;}
/* ---------- fog: a tileable noise sheet, two layers drifting at different speeds ---------- */
const FOGS=128,FOGT=new Float32Array(FOGS*FOGS);
{const per=(x,y,s,p)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),m=q=>((q%p)+p)%p;
   const a=hash2(m(xi),m(yi),s),b=hash2(m(xi+1),m(yi),s),c=hash2(m(xi),m(yi+1),s),d=hash2(m(xi+1),m(yi+1),s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
 for(let y=0;y<FOGS;y++)for(let x=0;x<FOGS;x++){const v=per(x/16,y/16,5,8)*.55+per(x/8,y/8,9,16)*.3+per(x/4,y/4,13,32)*.15;FOGT[y*FOGS+x]=smooth(.32,.78,v);}}
/* ---------- quantization: tone curve, then a 4x4 ordered dither onto the 16 levels ---------- */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16-.5);
const TONE=new Uint8Array(4096);    /* radiance*1024 -> level*16 (fixed point, so the dither can add fractions) */
for(let i=0;i<4096;i++){const r=i/1024,v=Math.pow(1-Math.exp(-r*1.8),.8);TONE[i]=Math.min(255,Math.round(v*15*16));}
function quantize(){
  for(let y=0;y<H;y++){const row=y*W,b=(y&3)<<2;
    for(let x=0;x<W;x++){const i=row+x;let r=RAD[i];if(r<=0){NB[i]=0;continue;}
      const t=TONE[r>=3.999?4095:(r*1024)|0]/16+BAYER[b|(x&3)];NB[i]=t<0?0:t>15?15:t+.5|0;}}
}
