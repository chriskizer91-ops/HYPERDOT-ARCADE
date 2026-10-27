/* =====================================================================================
   10. THE RASTERISER — a three-quarter perspective view drawn into RBUF with a z-buffer.
   The static cabinet is ray-cast once per resolution (colour + depth + lamp ids), the moving
   deck and face are ray-cast per frame inside their screen band, and every coin is
   rasterised analytically: under a locally affine projection a disc is an ellipse, so each
   pixel maps back to disc coordinates (a,b); the rim is the same ellipse swept along the
   axis, found by minimising |q0 + t m| over t in [0, 2h]. Faces carry a stamped relief
   emblem (height map -> bump normal), everything is lit as metal: diffuse + sharp
   Blinn-Phong + an animated environment of the cabinet's own lamps.
   ===================================================================================== */
const CAM={ex:0,ey:25.5,ez:40.5,F:[0,0,0],R:[0,0,0],U:[0,0,0],f:1,cx:0,cy:0};
const CHY=7.1;                                     // chute rail height
let RDX=null,RDY=null,RDZ=null,SCOL=null,SZ=null,SMAT=null,LAMPI=null,LAMPU=null,LAMPK=null,NLAMP=0,DROW0=0,DROW1=0;
function camInit(){
  const tx=0,ty=0,tz=12.2,E=[CAM.ex,CAM.ey,CAM.ez];let F=[tx-E[0],ty-E[1],tz-E[2]];const fl=Math.hypot(F[0],F[1],F[2]);F=F.map(v=>v/fl);
  const R=[-F[2],0,F[0]],rl=Math.hypot(R[0],R[2]);R[0]/=rl;R[2]/=rl;
  const U=[R[1]*F[2]-R[2]*F[1],R[2]*F[0]-R[0]*F[2],R[0]*F[1]-R[1]*F[0]];
  CAM.F=F;CAM.R=R;CAM.U=U;CAM.f=W*.875;CAM.cx=W/2;CAM.cy=H*.585;
}
/* world -> screen. Results in PJ[0..2] = sx, sy, depth */
const PJ=new Float64Array(3);
function proj(x,y,z){const dx=x-CAM.ex,dy=y-CAM.ey,dz=z-CAM.ez,F=CAM.F,R=CAM.R,U=CAM.U;
  const zc=dx*F[0]+dy*F[1]+dz*F[2],xc=dx*R[0]+dy*R[1]+dz*R[2],yc=dx*U[0]+dy*U[1]+dz*U[2];
  PJ[0]=CAM.cx+CAM.f*xc/zc;PJ[1]=CAM.cy-CAM.f*yc/zc;PJ[2]=zc;}
/* ---------- the static cabinet, ray-cast once per resolution ---------- */
const MAT={none:0,floor:1,gutter:2,wall:3,back:4,front:5,tray:6,lip:7,frame:8};
function bake(){
  const N=W*H;RDX=new Float32Array(N);RDY=new Float32Array(N);RDZ=new Float32Array(N);
  SCOL=new Uint32Array(N);SZ=new Float32Array(N);SMAT=new Uint8Array(N);
  const li=[],lu=[],lk=[];
  const E=[CAM.ex,CAM.ey,CAM.ez],F=CAM.F,R=CAM.R,U=CAM.U;
  let r0=H,r1=0;
  for(let py=0;py<H;py++)for(let px_=0;px_<W;px_++){
    const a=(px_+.5-CAM.cx)/CAM.f,b=(py+.5-CAM.cy)/CAM.f,i=py*W+px_;
    const dx=F[0]+a*R[0]-b*U[0],dy=F[1]+a*R[1]-b*U[1],dz=F[2]+a*R[2]-b*U[2];  // d.F = 1, so ray t == camera depth
    RDX[i]=dx;RDY[i]=dy;RDZ[i]=dz;
    let bt=1e9,mat=0,hx=0,hy=0,hz=0;
    const hit=(t,m)=>{if(t>0&&t<bt){bt=t;mat=m;hx=E[0]+dx*t;hy=E[1]+dy*t;hz=E[2]+dz*t;}};
    if(dy<0){const t=-E[1]/dy,x=E[0]+dx*t,z=E[2]+dz*t;               // floor y=0
      if(z>=-1&&z<=ZE&&Math.abs(x)<=XW&&(z<ZG||Math.abs(x)<=XF))hit(t,z>ZE-.32?MAT.lip:MAT.floor);
      const t2=(-2.6-E[1])/dy,x2=E[0]+dx*t2,z2=E[2]+dz*t2;           // gutter bottoms
      if(z2>=ZG&&z2<=ZE+.4&&Math.abs(x2)>XF&&Math.abs(x2)<=XW)hit(t2,MAT.gutter);
      const t3=(-3.2-E[1])/dy,x3=E[0]+dx*t3,z3=E[2]+dz*t3;           // payout tray
      if(z3>ZE&&z3<ZE+3.5&&Math.abs(x3)<=XW)hit(t3,MAT.tray);}
    for(const s of [-1,1]){if(dx*s<=0)continue;const t=(s*XW-E[0])/dx,y=E[1]+dy*t,z=E[2]+dz*t;   // side walls (inner faces)
      if(y>-3.2&&y<5.2&&z>-1&&z<ZE+.9)hit(t,MAT.wall);}
    if(dx!==0)for(const s of [-1,1]){const t=(s*XF-E[0])/dx,y=E[1]+dy*t,z=E[2]+dz*t;              // gutter lip faces
      if(y>-2.6&&y<0&&z>ZG&&z<ZE&&Math.abs(E[0]+dx*t)<=XW)hit(t,MAT.gutter);}
    if(dz<0){const t=-E[2]/dz,y=E[1]+dy*t,x=E[0]+dx*t;if(y>HP-.05&&y<8.4&&Math.abs(x)<=XW)hit(t,MAT.back);}   // back wall above the deck
    if(dz<0){const t=(ZE-E[2])/dz,y=E[1]+dy*t,x=E[0]+dx*t;if(y<0&&y>-3.2&&Math.abs(x)<=XF)hit(t,MAT.front);} // the front face below the edge
    if(mat===0){/* outside the cabinet: the dark frame around the glass */SCOL[i]=pack(6,5,10);SZ[i]=1e9;SMAT[i]=MAT.frame;continue;}
    SZ[i]=bt;SMAT[i]=mat;
    const dth=BAY4[((py&3)<<2)|(px_&3)];let r=0,gg=0,bb=0;
    if(mat===MAT.floor){
      /* playfield print: deep violet acrylic, a sunburst from the pusher, hex dot grid, lane lamps near the edge */
      const ang=Math.atan2(hx,(hz-2)),ray=(Math.cos(ang*18)>.2?1:0),fade=clamp(1-(hz-4)/22,0,1);
      const hexd=((Math.sin(hx*2.2)+Math.sin((hx*.5+hz*.866)*2.2)+Math.sin((hx*.5-hz*.866)*2.2))>1.9)?1:0;
      const base=.55+.45*Math.min(1,hz/ZE);
      r=(18+ray*10*fade+hexd*14)*base;gg=(12+ray*4*fade+hexd*10)*base;bb=(46+ray*22*fade+hexd*26)*base;
      if(dth<.5){r*=.92;gg*=.92;bb*=.92;}
      if(hz>ZE-3.4&&hz<ZE-.6){const lane=Math.round(hx/3),cxl=lane*3,u=(hz-(ZE-3.4))/2.8,ax=Math.abs(hx-cxl);
        if(Math.abs(lane)<=4&&ax<1.1&&Math.abs(ax-(1-u)*1.1)<.22){li.push(i);lu.push(u+(lane&1)*.0);lk.push(1);}}
    }else if(mat===MAT.lip){const k=(hz-(ZE-.32))/.32;r=150+90*k;gg=150+80*k;bb=170+70*k;li.push(i);lu.push((hx+XW)/(2*XW));lk.push(2);}
    else if(mat===MAT.gutter){const k=clamp(1+hy/2.6,0,1);r=70*k+dth*18;gg=4*k;bb=16*k+6;}
    else if(mat===MAT.wall){
      /* inner side walls: smoked mirror with a chase-lamp strip along the top and a chrome rail */
      const k=clamp((hy+3)/8,0,1),z=hz;r=14+k*20;gg=12+k*16;bb=26+k*26;
      if(Math.abs(hy-4.55)<.32){li.push(i);lu.push(z/ZE);lk.push(3);}
      else if(Math.abs(hy-3.95)<.14){r=120;gg=128;bb=150;}
      else if(hy<.1&&hy>-.35){r=90;gg=94;bb=110;}
      if(dth<.35&&hy<3.8){r*=.85;gg*=.85;bb*=.85;}
    }else if(mat===MAT.back){
      /* back panel: dark glossy violet with a row of marquee bulbs along the top and a thin chrome cap over the deck */
      const k=clamp((hy-HP)/7,0,1);r=16+10*(1-k);gg=9+5*(1-k);bb=30+18*k;
      if(hy>7.2){const bx=((hx+XW)/1.25)%1,by=(hy-7.8)/.5;if(Math.hypot(bx-.5,by*.9)<.42){li.push(i);lu.push((hx+XW)/(2*XW));lk.push(4);}else{r=22;gg=14;bb=34;}}
      else if(Math.abs(hy-6.6)<.1){r=110;gg=90;bb=140;}
      if(hy<HP+.3){r=48;gg=50;bb=62;}
    }else if(mat===MAT.front){const k=clamp(-hy/3,0,1);r=40-30*k;gg=24-18*k;bb=50-36*k;if(hy>-.5){li.push(i);lu.push((hx+XF)/(2*XF));lk.push(5);}}
    else if(mat===MAT.tray){r=34+dth*10;gg=30+dth*8;bb=38+dth*12;}
    SCOL[i]=pack(r,gg,bb);
  }
  LAMPI=Int32Array.from(li);LAMPU=Float32Array.from(lu);LAMPK=Uint8Array.from(lk);NLAMP=li.length;
  /* the screen rows in which the deck or the face can appear */
  let y0=H,y1=0;for(const z of [0,PZM-PZA,PZM+PZA])for(const x of [-XW,XW])for(const y of [0,HP]){proj(x,y,z);y0=Math.min(y0,PJ[1]);y1=Math.max(y1,PJ[1]);}
  DROW0=clamp(Math.floor(y0)-1,0,H-1);DROW1=clamp(Math.ceil(y1)+1,0,H-1);
}
/* ---------- emblems: relief height maps (ES x ES over the unit disc) -> bump gradients + material ---------- */
const ES=24;let EMB=[];
function star(x,y,ro,ri,n){const a=Math.atan2(y,x)+Math.PI/2,r=Math.hypot(x,y),k=Math.PI/n,f=((a%(2*k))+2*k)%(2*k)-k;return r<ri+(ro-ri)*(1-Math.abs(f)/k);}
/* a design is sampled at 4x4 per texel and box-filtered, then mip-mapped to 12x12 for small coins */
function mkLevel(fn,N){const hgt=new Float32Array(N*N),mat=new Uint8Array(N*N),G=new Float32Array(N*N*2),SS=4;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let hs=0;const mc=[0,0,0,0];
    for(let sj=0;sj<SS;sj++)for(let si=0;si<SS;si++){const x=(i+(si+.5)/SS)/N*2-1,y=(j+(sj+.5)/SS)/N*2-1,r=Math.hypot(x,y);let [h,m]=fn(x,y,r);if(r>.92)h*=Math.max(0,1-(r-.92)*10);hs+=h;mc[m]++;}
    hgt[j*N+i]=hs/(SS*SS);let bm=0;for(let m=1;m<4;m++)if(mc[m]>mc[bm])bm=m;mat[j*N+i]=bm;}
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const im=Math.max(0,i-1),ip=Math.min(N-1,i+1),jm=Math.max(0,j-1),jp=Math.min(N-1,j+1),sc=N/24;
    G[(j*N+i)*2]=(hgt[j*N+ip]-hgt[j*N+im])*.5*sc;G[(j*N+i)*2+1]=(hgt[jp*N+i]-hgt[jm*N+i])*.5*sc;}
  return {hgt,mat,G,N};}
function buildEmblems(){
  EMB=[];
  const designs=[
    /* 0 brass heads: raised rim, a bold star */ (x,y,r)=>r>.8?[1,2]:star(x,y,.66,.3,5)?[.95,0]:[.15,0],
    /* 1 tails: raised rim, a ring and a dot */ (x,y,r)=>r>.8?[1,2]:Math.abs(r-.5)<.11?[.9,0]:r<.18?[.9,0]:[.15,0],
    /* 2 BONUS: gold rim, red enamel field, a gold star */ (x,y,r)=>r>.78?[1,2]:star(x,y,.7,.32,5)?[.95,0]:[.3,1],
    /* 3 prize token: a cut gem (hexagonal pyramid) inside a rim */ (x,y,r)=>{if(r>.84)return [1,2];let m=0;for(let k=0;k<6;k++){const a=k*Math.PI/3;m=Math.max(m,x*Math.cos(a)+y*Math.sin(a));}
      return m<.64?[.35+.65*(1-m/.64),1]:[.2,3];},
    /* 4 bonus tails: gold rim, enamel, a ring */ (x,y,r)=>r>.78?[1,2]:Math.abs(r-.46)<.12?[.9,0]:[.3,1]
  ];
  for(const d of designs)EMB.push([mkLevel(d,ES),mkLevel(d,12)]);
}
buildEmblems();
/* specular power table and a per-frame environment map of the cabinet's lamps (indexed by reflection x/y) */
const SPEC=new Float32Array(256),SPEC2=new Float32Array(256);for(let i=0;i<256;i++){SPEC[i]=Math.pow(i/255,60);SPEC2[i]=Math.pow(i/255,9)*.22;}   // polished relief / satin field
const ENVR=new Float32Array(16*16),ENVG=new Float32Array(16*16),ENVB=new Float32Array(16*16);
function envFrame(t,flash){
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){const rx=i/7.5-1,ry=j/7.5-1,k=j*16+i;
    let r=.05+.06*Math.max(0,ry),g2_=.045+.05*Math.max(0,ry),b=.08+.07*Math.max(0,ry);
    {const s=clamp((ry-.3)/.5,0,1),q=s*s*(3-2*s);r+=q*1.0;g2_+=q*.88;b+=q*.68;}                // the lamp panel above the glass (soft ramp)
    const ch=.5+.5*Math.sin(t*3.2+rx*5),side=Math.max(0,Math.abs(rx)-.45)*1.6*(.4+.6*ch);    // neon strips on the side walls
    if(rx>0){r+=side*.9;g2_+=side*.25;b+=side*.8;}else{r+=side*.2;g2_+=side*.75;b+=side*1.0;}
    if(ry<-.2){r+=.06;g2_+=.03;b+=.1;}                                                      // the violet playfield below
    ENVR[k]=r*.8+flash;ENVG[k]=g2_*.8+flash*.85;ENVB[k]=b*.8+flash*.6;}
}
