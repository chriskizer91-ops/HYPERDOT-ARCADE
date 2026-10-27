/* ===================== software 3D: z-buffered, flat-shaded, ordered-dither tone ramps ===================== */
const BAY4=new Float32Array([0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16));
let FRAME=0;
const NEAR=.6;
/* view: camera position, basis, projection centre, focal length and clip rect */
const VIEW={pos:[0,0,0],q:qid(),r:[1,0,0],u:[0,1,0],f:[0,0,1],cx:192,cy:100,F:229,x0:0,y0:0,x1:384,y1:216};
function setView(pos,q,cx,cy,F,clip){VIEW.pos=pos;VIEW.q=q;VIEW.r=qR(q);VIEW.u=qU(q);VIEW.f=qF(q);VIEW.cx=cx;VIEW.cy=cy;VIEW.F=F;
  if(clip){VIEW.x0=clip[0];VIEW.y0=clip[1];VIEW.x1=clip[2];VIEW.y1=clip[3];}else{VIEW.x0=0;VIEW.y0=0;VIEW.x1=W;VIEW.y1=H;}}
/* world -> camera space */
function cam(p){const V=VIEW,dx=p[0]-V.pos[0],dy=p[1]-V.pos[1],dz=p[2]-V.pos[2];return [dx*V.r[0]+dy*V.r[1]+dz*V.r[2],dx*V.u[0]+dy*V.u[1]+dz*V.u[2],dx*V.f[0]+dy*V.f[1]+dz*V.f[2]];}
/* world -> screen [sx,sy,w] or null when behind */
function proj(p){const c=cam(p);if(c[2]<NEAR)return null;const w=1/c[2];return [VIEW.cx+c[0]*w*VIEW.F,VIEW.cy-c[1]*w*VIEW.F,w];}

/* ---------- materials: 7-step tone ramp from ambient-tinted shadow to near-white ---------- */
let AMBC=[30,26,60],SUNC=[255,240,220],FILLC=[40,60,120];
function mat(hex,o={}){return {hex,base:hexRGB(hex),emi:!!o.emi,glow:o.glow||1,ramp:null,flashR:null,key:''};}
function rampOf(m){
  const key=AMBC.join()+SUNC.join();if(m.key===key)return m.ramp;m.key=key;const b=m.base;
  if(m.emi){m.ramp=[];for(let i=0;i<7;i++){const k=.72+.28*i/6;m.ramp.push(pack(b[0]*k*m.glow,b[1]*k*m.glow,b[2]*k*m.glow));}}
  else{m.ramp=[];for(let i=0;i<7;i++){const t=i/6;let c;
    if(t<.5){const k=t/.5;c=[lerp(b[0]*.1+AMBC[0]*.5,b[0]*.62*SUNC[0]/255,k),lerp(b[1]*.1+AMBC[1]*.5,b[1]*.62*SUNC[1]/255,k),lerp(b[2]*.1+AMBC[2]*.5,b[2]*.62*SUNC[2]/255,k)];}
    else{const k=(t-.5)/.5,hi=[b[0]*SUNC[0]/255,b[1]*SUNC[1]/255,b[2]*SUNC[2]/255],top=mixC(hi,[255,250,240],.45);c=k<.7?mixC(mixC(b,hi,.5).map(v=>v*.62),hi,k/.7):mixC(hi,top,(k-.7)/.3);}
    m.ramp.push(pack(c[0],c[1],c[2]));}}
  m.flashR=m.ramp.map(c=>pack(((c&255)+510)/3,(((c>>>8)&255)+510)/3,(((c>>>16)&255)+510)/3));
  return m.ramp;
}
/* ---------- triangle fill with depth (w = 1/z interpolates linearly in screen space) ---------- */
function tri(ax,ay,aw,bx,by,bw,cx,cy,cw,c0,c1,t){
  let area=(bx-ax)*(cy-ay)-(cx-ax)*(by-ay);if(area===0)return;
  if(area<0){let s=bx;bx=cx;cx=s;s=by;by=cy;cy=s;s=bw;bw=cw;cw=s;area=-area;}
  const V=VIEW;let x0=Math.max(V.x0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(V.x1-1,Math.ceil(Math.max(ax,bx,cx))),y0=Math.max(V.y0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(V.y1-1,Math.ceil(Math.max(ay,by,cy)));
  if(x0>x1||y0>y1)return;
  const ia=1/area;
  /* edge functions: e0 opposite a, etc. */
  const A0=by-cy,B0=cx-bx,A1=cy-ay,B1=ax-cx,A2=ay-by,B2=bx-ax;
  const px=x0+.5,py=y0+.5;
  let r0=(px-bx)*A0+(py-by)*B0,r1=(px-cx)*A1+(py-cy)*B1,r2=(px-ax)*A2+(py-ay)*B2;
  const dw_x=(A0*aw+A1*bw+A2*cw)*ia,dw_y=(B0*aw+B1*bw+B2*cw)*ia;let wr=(r0*aw+r1*bw+r2*cw)*ia;
  const two=t>0&&t<1;
  for(let y=y0;y<=y1;y++){
    let e0=r0,e1=r1,e2=r2,w=wr,row=y*W,br=(y&3)<<2,inside=false;
    for(let x=x0;x<=x1;x++){
      if(e0>=0&&e1>=0&&e2>=0){inside=true;const i=row+x;if(w>ZB[i]){ZB[i]=w;RBUF[i]=two?(BAY4[br|(x&3)]<t?c1:c0):(t>=1?c1:c0);}}
      else if(inside)break;
      e0+=A0;e1+=A1;e2+=A2;w+=dw_x;
    }
    r0+=B0;r1+=B1;r2+=B2;wr+=dw_y;
  }
}
/* ---------- mesh drawing ---------- */
let TX=new Float32Array(4096),TY=new Float32Array(4096),TZ=new Float32Array(4096),SX=new Float32Array(4096),SY=new Float32Array(4096);
const CLIPP=[];for(let i=0;i<5;i++)CLIPP.push([0,0,0]);
let TRIS=0;
/* e: {pos,q,flash,glowK} ; mesh baked; light = world sun dir; o.flat overrides */
function drawMesh(m,pos,q,o){
  const V=VIEW;
  /* sphere cull */
  const cp=cam(pos),R=m.R*(o&&o.s||1);if(cp[2]+R<NEAR)return false;
  const lim=(cp[2]+R)/V.F;if(cp[0]-R>(V.x1-V.cx)*lim||cp[0]+R<(V.x0-V.cx)*lim||cp[1]-R>(V.cy-V.y0)*lim||cp[1]+R<(V.cy-V.y1)*lim)return false;
  const sc=o&&o.s||1;
  /* combined local->camera rotation */
  const lr=qrot(q,[1,0,0]),lu=qrot(q,[0,1,0]),lf=qrot(q,[0,0,1]);
  const m00=vdot(V.r,lr),m01=vdot(V.r,lu),m02=vdot(V.r,lf),m10=vdot(V.u,lr),m11=vdot(V.u,lu),m12=vdot(V.u,lf),m20=vdot(V.f,lr),m21=vdot(V.f,lu),m22=vdot(V.f,lf);
  const nv=m.nv;if(nv>TX.length){TX=new Float32Array(nv*2);TY=new Float32Array(nv*2);TZ=new Float32Array(nv*2);SX=new Float32Array(nv*2);SY=new Float32Array(nv*2);}
  const P=m.V;let anyNear=false;
  for(let i=0;i<nv;i++){const x=P[i*3]*sc,y=P[i*3+1]*sc,z=P[i*3+2]*sc;const X=m00*x+m01*y+m02*z+cp[0],Y=m10*x+m11*y+m12*z+cp[1],Z=m20*x+m21*y+m22*z+cp[2];TX[i]=X;TY[i]=Y;TZ[i]=Z;
    if(Z>=NEAR){const w=V.F/Z;SX[i]=V.cx+X*w;SY[i]=V.cy-Y*w;}else anyNear=true;}
  /* camera and light in local space */
  const qi=qinv(q),cl=qrot(qi,vsub(V.pos,pos)),Ll=qrot(qi,SUN.dir);cl[0]/=sc;cl[1]/=sc;cl[2]/=sc;
  const N=m.N,C=m.C,F=m.F,FM=m.FM,mats=m.mats,flash=o&&o.flash>0,glow=o&&o.glow!=null?o.glow:1;
  for(let f=0;f<m.nf;f++){
    const nx=N[f*3],ny=N[f*3+1],nz=N[f*3+2];
    if(nx*(cl[0]-C[f*3])+ny*(cl[1]-C[f*3+1])+nz*(cl[2]-C[f*3+2])<=0)continue;
    const a=F[f*3],b=F[f*3+1],c=F[f*3+2],mt=mats[FM[f]],rp=rampOf(mt),ramp=flash?mt.flashR:rp;
    let c0,c1,t;
    if(mt.emi){const k=Math.min(6,Math.max(0,glow*6));c0=ramp[k|0];c1=ramp[Math.min(6,(k|0)+1)];t=k-(k|0);if(glow<.15){c0=c1=shade(ramp[0],.35+glow*4);t=0;}}
    else{const d=nx*Ll[0]+ny*Ll[1]+nz*Ll[2],I=d>0?.38+d*.62:.38+d*.3;const k=clamp(I,0,1)*6;c0=ramp[k|0];c1=ramp[Math.min(6,(k|0)+1)];t=k-(k|0);}
    TRIS++;
    if(TZ[a]>=NEAR&&TZ[b]>=NEAR&&TZ[c]>=NEAR){tri(SX[a],SY[a],1/TZ[a],SX[b],SY[b],1/TZ[b],SX[c],SY[c],1/TZ[c],c0,c1,t);continue;}
    if(TZ[a]<NEAR&&TZ[b]<NEAR&&TZ[c]<NEAR)continue;
    /* clip against the near plane, then fan */
    const inp=[a,b,c];let n=0;
    for(let k=0;k<3;k++){const i=inp[k],j=inp[(k+1)%3],zi=TZ[i],zj=TZ[j];
      if(zi>=NEAR){const o2=CLIPP[n++];o2[0]=TX[i];o2[1]=TY[i];o2[2]=zi;}
      if((zi>=NEAR)!==(zj>=NEAR)){const s=(NEAR-zi)/(zj-zi),o2=CLIPP[n++];o2[0]=TX[i]+(TX[j]-TX[i])*s;o2[1]=TY[i]+(TY[j]-TY[i])*s;o2[2]=NEAR;}}
    const pr=CLIPP.slice(0,n).map(p=>[V.cx+p[0]*V.F/p[2],V.cy-p[1]*V.F/p[2],1/p[2]]);
    for(let k=1;k+1<n;k++)tri(pr[0][0],pr[0][1],pr[0][2],pr[k][0],pr[k][1],pr[k][2],pr[k+1][0],pr[k+1][1],pr[k+1][2],c0,c1,t);
  }
  return true;
}
/* ---------- points, lines, glows (depth tested, never write depth unless asked) ---------- */
function pxz(x,y,w,c){x|=0;y|=0;const V=VIEW;if(x<V.x0||y<V.y0||x>=V.x1||y>=V.y1)return;const i=y*W+x;if(w>=ZB[i])RBUF[i]=c;}
function addPx(i,r,g2,b){const c=RBUF[i],R=(c&255)+r,G=((c>>>8)&255)+g2,B=((c>>>16)&255)+b;RBUF[i]=(0xff000000|((B>255?255:B)<<16)|((G>255?255:G)<<8)|(R>255?255:R))>>>0;}
function line3(p0,p1,c,thick,core){
  let a=cam(p0),b=cam(p1);if(a[2]<NEAR&&b[2]<NEAR)return;
  if(a[2]<NEAR){const s=(NEAR-a[2])/(b[2]-a[2]);a=[a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s,NEAR];}
  if(b[2]<NEAR){const s=(NEAR-b[2])/(a[2]-b[2]);b=[b[0]+(a[0]-b[0])*s,b[1]+(a[1]-b[1])*s,NEAR];}
  const V=VIEW,ax=V.cx+a[0]/a[2]*V.F,ay=V.cy-a[1]/a[2]*V.F,bx=V.cx+b[0]/b[2]*V.F,by=V.cy-b[1]/b[2]*V.F,aw=1/a[2],bw=1/b[2];
  const n=Math.min(600,Math.max(1,Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay)))));
  for(let k=0;k<=n;k++){const t=k/n,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,w=aw+(bw-aw)*t;pxz(x,y,w,core&&thick>1?core:c);if(thick>1){pxz(x+1,y,w,c);pxz(x,y+1,w,c);if(thick>2){pxz(x-1,y,w,c);pxz(x,y-1,w,c);}}}
}
/* additive soft disc at a world point; r in world metres (minimum px size) */
function glow(p,r,col,k,minPx){
  const s=proj(p);if(!s)return;const V=VIEW,R=Math.max(minPx||1,r*s[2]*V.F);if(R>260)return;
  const x0=Math.max(V.x0,Math.floor(s[0]-R)),x1=Math.min(V.x1-1,Math.ceil(s[0]+R)),y0=Math.max(V.y0,Math.floor(s[1]-R)),y1=Math.min(V.y1-1,Math.ceil(s[1]+R));
  const iR=1/R,w=s[2];
  for(let y=y0;y<=y1;y++){const dy=(y+.5-s[1])*iR,row=y*W;for(let x=x0;x<=x1;x++){const dx=(x+.5-s[0])*iR,d2=dx*dx+dy*dy;if(d2>=1)continue;const i=row+x;if(w<ZB[i])continue;const f=(1-d2)*(1-d2)*k;addPx(i,col[0]*f,col[1]*f,col[2]*f);}}
}
/* opaque dithered disc (fire, smoke), writes no depth */
function blob(p,r,c,alpha){
  const s=proj(p);if(!s)return;const V=VIEW,R=Math.max(.7,r*s[2]*V.F);if(R>300)return;
  const x0=Math.max(V.x0,Math.floor(s[0]-R)),x1=Math.min(V.x1-1,Math.ceil(s[0]+R)),y0=Math.max(V.y0,Math.floor(s[1]-R)),y1=Math.min(V.y1-1,Math.ceil(s[1]+R)),iR=1/R,w=s[2];
  for(let y=y0;y<=y1;y++){const dy=(y+.5-s[1])*iR,row=y*W,br=(y&3)<<2;for(let x=x0;x<=x1;x++){const dx=(x+.5-s[0])*iR,d2=dx*dx+dy*dy;if(d2>=1)continue;const i=row+x;if(w<ZB[i])continue;if(BAY4[br|(x&3)]<alpha*(1-d2*.55))RBUF[i]=c;}}
}

/* ===================== sky: nebula cube, stars, sun with flare, banded planet ===================== */
const SKY={N:64,faces:null,stars:[],theme:null};
const SUN={dir:vnorm([-.5,.35,.8]),col:[255,240,214],size:.035};
const PLANET={on:false,dir:[0,0,1],ar:.3,axis:[0,1,0],pal:[[200,130,70],[230,180,110],[150,80,50]],atm:[255,170,110],seed:1};
function cubeDir(f,u,v){switch(f){case 0:return [1,-v,-u];case 1:return [-1,-v,u];case 2:return [u,1,v];case 3:return [u,-1,-v];case 4:return [u,-v,1];default:return [-u,-v,-1];}}
function bakeSky(th){
  SKY.theme=th;const N=SKY.N;SKY.faces=[];const r=mulberry(th.seed||3);
  for(let f=0;f<6;f++){const A=new Uint32Array(N*N);for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const d=vnorm(cubeDir(f,(i+.5)/N*2-1,(j+.5)/N*2-1)),s=th.seed||3;
    const n1=fbm(d[0]*2.2+s,d[1]*2.2,d[2]*2.2-s,5),n2=fbm(d[0]*4+9,d[1]*4-s,d[2]*4+3,4),band=Math.exp(-Math.pow(vdot(d,th.band||[0,1,0])/.32,2));
    let k=Math.pow(clamp((n1-.38)*2.2,0,1),1.6)*(.5+band*.9),k2=Math.pow(clamp((n2-.5)*2.5,0,1),2)*.8*band;
    const sd=Math.max(0,vdot(d,SUN.dir)),halo=Math.pow(sd,14)*.55+Math.pow(sd,90)*1.6;
    const c=[th.base[0]+th.c1[0]*k+th.c2[0]*k2+SUN.col[0]*halo*.45,th.base[1]+th.c1[1]*k+th.c2[1]*k2+SUN.col[1]*halo*.4,th.base[2]+th.c1[2]*k+th.c2[2]*k2+SUN.col[2]*halo*.36];
    A[j*N+i]=pack(c[0],c[1],c[2]);}SKY.faces.push(A);}
  SKY.stars=[];for(let i=0;i<1100;i++){const d=vnorm(vrand(1)),b=Math.pow(r(),3),band=Math.exp(-Math.pow(vdot(d,th.band||[0,1,0])/.3,2));if(r()>.45+band*.5&&b<.5)continue;
    const t=r(),c=t<.15?[255,190,150]:t<.3?[170,200,255]:[235,235,255];SKY.stars.push({d,c:pack(c[0]*(.35+b*.65),c[1]*(.35+b*.65),c[2]*(.35+b*.65)),big:b>.82});}
}
function drawSky(){
  const V=VIEW,N=SKY.N,iF=1/V.F,fs=SKY.faces;
  for(let y=V.y0;y<V.y1;y++){
    const ry=-(y+.5-V.cy)*iF;let dx=V.f[0]+V.u[0]*ry+V.r[0]*((V.x0+.5-V.cx)*iF),dy=V.f[1]+V.u[1]*ry+V.r[1]*((V.x0+.5-V.cx)*iF),dz=V.f[2]+V.u[2]*ry+V.r[2]*((V.x0+.5-V.cx)*iF);
    const sx=V.r[0]*iF,sy=V.r[1]*iF,sz=V.r[2]*iF,row=y*W,br=(y&3)<<2;
    for(let x=V.x0;x<V.x1;x++){
      const ax=dx<0?-dx:dx,ay=dy<0?-dy:dy,az=dz<0?-dz:dz;let f,u,v,m;
      if(ax>=ay&&ax>=az){m=ax;if(dx>0){f=0;u=-dz;v=-dy;}else{f=1;u=dz;v=-dy;}}
      else if(ay>=az){m=ay;if(dy>0){f=2;u=dx;v=dz;}else{f=3;u=dx;v=-dz;}}
      else{m=az;if(dz>0){f=4;u=dx;v=-dy;}else{f=5;u=-dx;v=-dy;}}
      const j=BAY4[br|(x&3)]-.5;let iu=((u/m+1)*.5*N+j)|0,iv=((v/m+1)*.5*N-j)|0;if(iu<0)iu=0;else if(iu>=N)iu=N-1;if(iv<0)iv=0;else if(iv>=N)iv=N-1;
      const i=row+x;RBUF[i]=fs[f][iv*N+iu];ZB[i]=0;
      dx+=sx;dy+=sy;dz+=sz;
    }
  }
  for(const s of SKY.stars){const z=vdot(s.d,V.f);if(z<.2)continue;const x=V.cx+vdot(s.d,V.r)/z*V.F,y=V.cy-vdot(s.d,V.u)/z*V.F;if(x<V.x0||y<V.y0||x>=V.x1||y>=V.y1)continue;
    const i=(y|0)*W+(x|0);RBUF[i]=s.big?s.c|0xff404040:s.c;if(s.big&&x+1<V.x1)addPx(i+1,40,40,46);}
  if(PLANET.on)drawPlanet();
  const sz=vdot(SUN.dir,V.f);if(sz>.05){const sx=V.cx+vdot(SUN.dir,V.r)/sz*V.F,sy=V.cy-vdot(SUN.dir,V.u)/sz*V.F,R=Math.max(2.5,SUN.size*V.F);
    for(let y=Math.max(V.y0,Math.floor(sy-R*3));y<Math.min(V.y1,sy+R*3);y++)for(let x=Math.max(V.x0,Math.floor(sx-R*3));x<Math.min(V.x1,sx+R*3);x++){const d=Math.hypot(x+.5-sx,y+.5-sy)/R;const i=y*W+x;
      if(d<1)RBUF[i]=pack(255,252,240);else{const f=Math.pow(1/(d*d),1.2)*.9;addPx(i,SUN.col[0]*f,SUN.col[1]*f,SUN.col[2]*f);}}}
}
function drawPlanet(){
  const V=VIEW,P=PLANET,z=vdot(P.dir,V.f);if(z<-.3)return;
  const sx=V.cx+vdot(P.dir,V.r)/Math.max(.05,z)*V.F,sy=V.cy-vdot(P.dir,V.u)/Math.max(.05,z)*V.F,R=Math.tan(P.ar)*V.F/Math.max(.25,z);
  if(z<.05&&R>0)return;
  const x0=Math.max(V.x0,Math.floor(sx-R*1.12)),x1=Math.min(V.x1-1,Math.ceil(sx+R*1.12)),y0=Math.max(V.y0,Math.floor(sy-R*1.12)),y1=Math.min(V.y1-1,Math.ceil(sy+R*1.12));
  if(x0>x1||y0>y1)return;
  const ax=P.axis,bx=vnorm(vcross(ax,[.3,.1,.9])),bz=vcross(bx,ax),iR=1/R,L=SUN.dir;if(!P.tex||P.texKey!==P.seed+''+P.pal)bakePlanet();const TXW=256,TXH=128,TX=P.tex;
  for(let y=y0;y<=y1;y++){const dy=(y+.5-sy)*iR,row=y*W,br=(y&3)<<2;for(let x=x0;x<=x1;x++){const dx=(x+.5-sx)*iR,d2=dx*dx+dy*dy,i=row+x;
    if(d2>=1){if(d2<1.25){const nrm=vnorm([V.r[0]*dx-V.u[0]*dy-V.f[0]*.15,V.r[1]*dx-V.u[1]*dy-V.f[1]*.15,V.r[2]*dx-V.u[2]*dy-V.f[2]*.15]),lit=Math.max(0,vdot(nrm,L)+.25),f=Math.pow(1-(d2-1)/.25,2)*lit*.55;addPx(i,P.atm[0]*f,P.atm[1]*f,P.atm[2]*f);}continue;}
    const nz=Math.sqrt(1-d2),n=[V.r[0]*dx-V.u[0]*dy-V.f[0]*nz,V.r[1]*dx-V.u[1]*dy-V.f[1]*nz,V.r[2]*dx-V.u[2]*dy-V.f[2]*nz];
    const lat=vdot(n,ax),lo=Math.atan2(vdot(n,bz),vdot(n,bx)),tu=((lo/TAU+.5+G.t*.002)*TXW)&(TXW-1),tv=Math.min(TXH-1,((lat*.5+.5)*TXH)|0),tc=TX[tv*TXW+tu],c=[tc&255,(tc>>>8)&255,(tc>>>16)&255];
    const dif=vdot(n,L),li=clamp(dif*1.15+.08,0,1),dith=BAY4[br|(x&3)]*.12-.06,lv=clamp(li+dith,0,1),rim=Math.pow(1-nz,3)*Math.max(0,dif+.3);
    RBUF[i]=pack(c[0]*(lv*.95+.03)+P.atm[0]*rim*.6+AMBC[0]*.15,c[1]*(lv*.95+.03)+P.atm[1]*rim*.6+AMBC[1]*.15,c[2]*(lv*.95+.03)+P.atm[2]*rim*.6+AMBC[2]*.15);}}
}
function bakePlanet(){const P=PLANET,TXW=256,TXH=128,T=new Uint32Array(TXW*TXH),s=P.seed;
  for(let j=0;j<TXH;j++){const lat=(j+.5)/TXH*2-1;for(let i=0;i<TXW;i++){const lo=(i+.5)/TXW*TAU,cx=Math.cos(lo)*2,cz=Math.sin(lo)*2,sw=fbm(lat*3+s,cx*.5,cz*.5+s*2,3),b=(Math.sin(lat*14+sw*5)+1)*.5,b2=fbm(lat*30+s,cx+sw*3,cz,2);
    let c=mixC(P.pal[0],P.pal[1],b);c=mixC(c,P.pal[2],clamp(b2*1.6-.55,0,1));T[j*TXW+i]=pack(c[0],c[1],c[2]);}}P.tex=T;P.texKey=P.seed+''+P.pal;}
function sunFlare(){
  const V=VIEW,sz=vdot(SUN.dir,V.f);if(sz<.1)return;const sx=V.cx+vdot(SUN.dir,V.r)/sz*V.F,sy=V.cy-vdot(SUN.dir,V.u)/sz*V.F;
  if(sx<V.x0||sy<V.y0||sx>=V.x1||sy>=V.y1)return;if(ZB[(sy|0)*W+(sx|0)]>0)return;
  const vx=V.cx-sx,vy=V.cy-sy,k=Math.min(1,sz*1.2);
  for(const [t,r,c] of [[.6,4,[40,60,110]],[1.5,7,[30,70,60]]]){const cx2=sx+vx*t,cy2=sy+vy*t,R=r*V.F/229;
    for(let y=Math.max(V.y0,Math.floor(cy2-R));y<Math.min(V.y1,cy2+R);y++)for(let x=Math.max(V.x0,Math.floor(cx2-R));x<Math.min(V.x1,cx2+R);x++){const d=Math.hypot(x+.5-cx2,y+.5-cy2)/R;if(d<1){const f=(d>.8?.45:.12)*k;addPx(y*W+x,c[0]*f,c[1]*f,c[2]*f);}}}
  for(let x=Math.max(V.x0,Math.floor(sx-V.F*.5));x<Math.min(V.x1,sx+V.F*.5);x++){const f=Math.pow(1-Math.abs(x-sx)/(V.F*.5),3)*70*k,y=sy|0;if(y>=V.y0&&y<V.y1)addPx(y*W+x,f,f*.95,f*.9);}
}
/* camera-local space dust: tells you how fast you are going */
const DUST=[];for(let i=0;i<140;i++)DUST.push(vrandIn(70));
function drawDust(vel){
  const V=VIEW,sp=vlen(vel);
  for(const d of DUST){
    const rel=vsub(d,V.pos);for(let k=0;k<3;k++){if(rel[k]>70){d[k]-=140;}else if(rel[k]<-70){d[k]+=140;}}
    const p1=vaddm(d.slice(),vel,-Math.min(.06,.012+sp*.00018)),a=proj(d);if(!a)continue;const dist=1/a[2],f=clamp(1-dist/70,0,1);if(f<=0)continue;
    const c=pack(120*f+40,130*f+40,160*f+50);if(sp<5){pxz(a[0],a[1],a[2],c);continue;}line3(p1,d,c,1);
  }
}
