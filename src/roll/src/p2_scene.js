/* =====================================================================================
   9b. SOFTWARE 3D: scene mesh, camera, and a flat-shaded triangle rasterizer that writes a
   G-buffer (1/z depth + face id per dot). The camera only moves while a ball is in play, so
   the G-buffer is cached and re-rasterized only when the camera changes. Lighting, lamps,
   ball shadows and procedural paint are then shaded per dot every frame from that buffer
   (a tiny deferred renderer), and the balls are ray-cast analytically into the same depth.
   ===================================================================================== */
const PITCH=1.02;   /* neighbouring alleys sit at x = +-PITCH */
const MT={BG:0,LANE:1,HUMP:2,RAILIN:3,RAILTOP:4,DARK:5,SLOT:6,BOARD:7,LIP:8,SIDE:9,BACK:10,CHROME:11,DIV:12,FLOOR:13,CAP:14,WALL:15};
const RAIL_H=.055,RAIL_W=.05,SLOT_Y=YB0-.24,SIDE_H=.5,SIDE_F=.26;   /* target box: back / front wall heights */
const LIGHT=(()=>{const x=.22,y=1,z=-.5,l=Math.hypot(x,y,z);return [x/l,y/l,z/l];})();
let NV=0,NT=0,TLN,VX,VY,VZ,VCX,VCY,VCZ,SXA,SYA,TA,TB,TC,TMAT,TAUX,TNX,TNY,TNZ,TR,TG,TBL,TLIT;
const LAMPZ=[];             /* rail lamp positions along the lane (shared by both sides) */
function buildScene(){
  const V=[],T=[];let LN=0,OX=0,LO=false;
  const vt=(x,y,z)=>{V.push(x,y,z);return V.length/3-1;};
  /* triangle with a facing hint: the winding is fixed so the normal points along (hx,hy,hz) */
  const tri=(a,b,c,m,col,aux,hx,hy,hz)=>{
    const ax=V[a*3],ay=V[a*3+1],az=V[a*3+2],ux=V[b*3]-ax,uy=V[b*3+1]-ay,uz=V[b*3+2]-az,wx=V[c*3]-ax,wy=V[c*3+1]-ay,wz=V[c*3+2]-az;
    let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz);if(l<1e-12)return;nx/=l;ny/=l;nz/=l;
    if(nx*hx+ny*hy+nz*hz<0){T.push(a,c,b,m,aux,-nx,-ny,-nz,col[0],col[1],col[2],LN);}else T.push(a,b,c,m,aux,nx,ny,nz,col[0],col[1],col[2],LN);
  };
  const quad=(p,m,col,aux,h)=>{const a=vt(p[0][0]+OX,p[0][1],p[0][2]),b=vt(p[1][0]+OX,p[1][1],p[1][2]),c=vt(p[2][0]+OX,p[2][1],p[2][2]),d=vt(p[3][0]+OX,p[3][1],p[3][2]);tri(a,b,c,m,col,aux,...h);tri(a,c,d,m,col,aux,...h);};
  const HW=PH.HW,X2=HW+RAIL_W;
  /* one complete alley; neighbours (lo) get coarser rings */
  const alley=(ln,lo)=>{LN=ln;OX=ln*PITCH;LO=lo;
  /* lane + hump as strips following the profile; rails ride on top of the same profile */
  const zs=[];for(let i=0;i<=5;i++)zs.push(lerp(PH.ZS,PH.ZH0,i/5));for(let i=1;i<=9;i++)zs.push(lerp(PH.ZH0,PH.ZL,i/9));
  for(let i=0;i<zs.length-1;i++){
    const z0=zs[i],z1=zs[i+1],y0=laneY(z0),y1=laneY(z1),hump=z0>=PH.ZH0-1e-6,last=i===zs.length-2;
    const m=last?MT.CHROME:hump?MT.HUMP:MT.LANE,col=last?[200,205,220]:hump?[150,98,54]:[168,116,64],n=[0,1,-laneDY((z0+z1)/2)];
    quad([[-HW,y0,z0],[HW,y0,z0],[HW,y1,z1],[-HW,y1,z1]],m,col,0,n);
    for(const s of [-1,1]){
      quad([[s*HW,y0,z0],[s*HW,y0+RAIL_H,z0],[s*HW,y1+RAIL_H,z1],[s*HW,y1,z1]],MT.RAILIN,[120,28,44],0,[-s,0,0]);
      quad([[s*HW,y0+RAIL_H,z0],[s*X2,y0+RAIL_H,z0],[s*X2,y1+RAIL_H,z1],[s*HW,y1+RAIL_H,z1]],MT.RAILTOP,[60,56,70],s,[0,1,0]);
      quad([[s*X2,y0+RAIL_H,z0],[s*X2,-.45,z0],[s*X2,-.45,z1],[s*X2,y1+RAIL_H,z1]],MT.RAILIN,[90,20,34],0,[s,0,0]);
    }
  }
  if(!ln)for(let z=.05;z<PH.ZL-.02;z+=.15)LAMPZ.push(z);
  /* the player's end of the lane: a padded bumper */
  quad([[-X2,laneY(PH.ZS),PH.ZS],[X2,laneY(PH.ZS),PH.ZS],[X2,-.45,PH.ZS],[-X2,-.45,PH.ZS]],MT.RAILIN,[90,20,34],0,[0,0,-1]);
  /* gutter slot: lip face, slot floor, board front face, two bin dividers */
  quad([[-HW,Y_LIP,PH.ZL],[HW,Y_LIP,PH.ZL],[HW,SLOT_Y,PH.ZL],[-HW,SLOT_Y,PH.ZL]],MT.DARK,[70,40,30],0,[0,0,1]);
  quad([[-HW,SLOT_Y,PH.ZL],[HW,SLOT_Y,PH.ZL],[HW,SLOT_Y,ZB0],[-HW,SLOT_Y,ZB0]],MT.SLOT,[30,26,40],0,[0,1,0]);
  quad([[-HW,YB0,ZB0],[HW,YB0,ZB0],[HW,SLOT_Y,ZB0],[-HW,SLOT_Y,ZB0]],MT.DARK,[36,30,60],0,[0,0,-1]);
  for(const s of [-1,1])for(const e of [-1,1]){const x=s*PH.BIN+e*.006;
    quad([[x,SLOT_Y,PH.ZL],[x,YB0-.03,PH.ZL],[x,YB0-.03,ZB0],[x,SLOT_Y,ZB0]],MT.DIV,[150,150,170],0,[e,0,0]);}
  for(const s of [-1,1])quad([[s*PH.BIN-.006,YB0-.03,PH.ZL],[s*PH.BIN+.006,YB0-.03,PH.ZL],[s*PH.BIN+.006,YB0-.03,ZB0],[s*PH.BIN-.006,YB0-.03,ZB0]],MT.DIV,[200,200,220],0,[0,1,0]);
  /* target board */
  const bp=(u,v,w)=>{const o=[0,0,0];fromBoard(u,v,w,o);return o;};
  quad([bp(-HW,0,0),bp(HW,0,0),bp(HW,PH.VB,0),bp(-HW,PH.VB,0)],MT.BOARD,[34,36,72],0,[0,COSP,-SINP]);
  /* ring lips: a wall-and-bead profile swept round each ring (the physics torus is the bead) */
  const NA=lo?2:4,prof=[[-PH.rt,0,-1,0]];for(let k=0;k<=NA;k++){const a=Math.PI*(1-k/NA);prof.push([PH.rt*Math.cos(a),PH.hL+PH.rt*Math.sin(a),Math.cos(a),Math.sin(a)]);}prof.push([PH.rt,0,1,0]);
  RINGS.forEach((ri,idx)=>{
    const N=Math.round((ri.val===100?14:12+ri.r*80)*(lo?.55:1));
    for(let j=0;j<N;j++){const t0=j/N*TAU,t1=(j+1)/N*TAU,tm=(j+.5)/N*TAU;
      for(let k=0;k<prof.length-1;k++){const p0=prof[k],p1=prof[k+1];
        const P=(t,p)=>bp(ri.u+(ri.r+p[0])*Math.cos(t),ri.v+(ri.r+p[0])*Math.sin(t),p[1]);
        /* facing hint: average profile normal, rotated into world */
        const hr=(p0[2]+p1[2])/2,hw=k===0?0:k===prof.length-2?0:(p0[3]+p1[3])/2;
        const hu=hr*Math.cos(tm),hv=hr*Math.sin(tm);
        quad([P(t0,p0),P(t1,p0),P(t1,p1),P(t0,p1)],MT.LIP,ri.col,idx,[hu,hv*SINP+hw*COSP,hv*COSP-hw*SINP]);
      }}
  });
  /* target box side walls (tall), their caps, and the back wall */
  const zt0=PH.ZL,yt0=Y_LIP+SIDE_F,zt1=ZTOP,yt1=YTOP+SIDE_H;
  for(const s of [-1,1]){
    quad([[s*HW,SLOT_Y,zt0],[s*HW,yt0,zt0],[s*HW,yt1,zt1],[s*HW,SLOT_Y,zt1]],MT.SIDE,[70,34,110],s,[-s,0,0]);
    quad([[s*HW,yt0,zt0],[s*X2,yt0,zt0],[s*X2,yt1,zt1],[s*HW,yt1,zt1]],MT.CAP,[60,56,70],s,[0,1,0]);
    quad([[s*X2,yt0,zt0],[s*X2,-.45,zt0],[s*X2,-.45,zt1],[s*X2,yt1,zt1]],MT.RAILIN,[60,24,80],0,[s,0,0]);
    quad([[s*HW,yt0,zt0],[s*X2,yt0,zt0],[s*X2,-.45,zt0],[s*HW,-.45,zt0]],MT.RAILIN,[90,20,34],0,[0,0,-1]);
    /* front post of the box, standing on the rail */
    quad([[s*HW,Y_LIP+RAIL_H,zt0],[s*HW,yt0,zt0],[s*HW,yt0,zt0-.04],[s*HW,Y_LIP+RAIL_H,zt0-.04]],MT.CAP,[60,56,70],0,[-s,0,0]);
  }
  quad([[-HW,YTOP-.02,ZTOP],[HW,YTOP-.02,ZTOP],[HW,yt1,ZTOP],[-HW,yt1,ZTOP]],MT.BACK,[40,30,80],0,[0,0,-1]);
  quad([[-X2,yt1,ZTOP],[X2,yt1,ZTOP],[X2,yt1,ZTOP+.06],[-X2,yt1,ZTOP+.06]],MT.CAP,[60,56,70],0,[0,1,0]);
  };
  alley(0,false);alley(-1,true);alley(1,true);LN=0;OX=0;
  /* the arcade around the alley: carpet and a far wall */
  quad([[-4,-.45,PH.ZS-2],[4,-.45,PH.ZS-2],[4,-.45,ZTOP+.07],[-4,-.45,ZTOP+.07]],MT.FLOOR,[40,30,60],0,[0,1,0]);
  quad([[-4,-.45,ZTOP+.07],[4,-.45,ZTOP+.07],[4,2.6,ZTOP+.07],[-4,2.6,ZTOP+.07]],MT.WALL,[30,24,50],0,[0,0,-1]);
  /* pack into typed arrays */
  NV=V.length/3;NT=T.length/12;
  VX=new Float32Array(NV);VY=new Float32Array(NV);VZ=new Float32Array(NV);VCX=new Float32Array(NV);VCY=new Float32Array(NV);VCZ=new Float32Array(NV);SXA=new Float32Array(NV);SYA=new Float32Array(NV);
  for(let i=0;i<NV;i++){VX[i]=V[i*3];VY[i]=V[i*3+1];VZ[i]=V[i*3+2];}
  TLN=new Int8Array(NT);TA=new Int32Array(NT);TB=new Int32Array(NT);TC=new Int32Array(NT);TMAT=new Uint8Array(NT);TAUX=new Int8Array(NT);
  TNX=new Float32Array(NT);TNY=new Float32Array(NT);TNZ=new Float32Array(NT);TR=new Float32Array(NT);TG=new Float32Array(NT);TBL=new Float32Array(NT);TLIT=new Float32Array(NT);
  for(let t=0;t<NT;t++){const o=t*12;TLN[t]=T[o+11];TA[t]=T[o];TB[t]=T[o+1];TC[t]=T[o+2];TMAT[t]=T[o+3];TAUX[t]=T[o+4];TNX[t]=T[o+5];TNY[t]=T[o+6];TNZ[t]=T[o+7];TR[t]=T[o+8];TG[t]=T[o+9];TBL[t]=T[o+10];
    /* baked light per face: key (lambert) + sky/ground hemisphere + ambient */
    const nd=Math.max(0,TNX[t]*LIGHT[0]+TNY[t]*LIGHT[1]+TNZ[t]*LIGHT[2]);TLIT[t]=.18+.72*nd+.16*(TNY[t]*.5+.5);}
}
/* ---- camera ---- */
const CAM={ex:0,ey:0,ez:0,fx:0,fy:0,fz:1,rx:1,ry:0,rz:0,ux:0,uy:1,uz:0,F:100,cx:0,cy:0,sig:''};
let Y0=0,VH3=1,DH=0;   /* 3D viewport rows: Y0..H-1; the DMD panel owns rows 0..DH-1 */
function setCam(ex,ey,ez,tx,ty,tz,F,roll){
  let fx=tx-ex,fy=ty-ey,fz=tz-ez;const l=Math.hypot(fx,fy,fz);fx/=l;fy/=l;fz/=l;
  let rx=fz,ry=0,rz=-fx;const rl=Math.hypot(rx,rz);rx/=rl;rz/=rl;
  let ux=fy*rz-fz*ry,uy=fz*rx-fx*rz,uz=fx*ry-fy*rx;   /* up = forward x right */
  if(roll){const c=Math.cos(roll),s=Math.sin(roll),r2x=rx*c+ux*s,r2y=ry*c+uy*s,r2z=rz*c+uz*s;ux=ux*c-rx*s;uy=uy*c-ry*s;uz=uz*c-rz*s;rx=r2x;ry=r2y;rz=r2z;}
  Object.assign(CAM,{ex,ey,ez,fx,fy,fz,rx,ry,rz,ux,uy,uz,F,cx:W/2,cy:Y0+VH3/2});
}
/* world -> matrix pixel; returns depth (<=0 when behind the camera) */
const PJ=[0,0,0];
function project(x,y,z){const dx=x-CAM.ex,dy=y-CAM.ey,dz=z-CAM.ez,cz=dx*CAM.fx+dy*CAM.fy+dz*CAM.fz;
  if(cz<.02){PJ[2]=0;return PJ;}PJ[0]=CAM.cx+CAM.F*(dx*CAM.rx+dy*CAM.ry+dz*CAM.rz)/cz;PJ[1]=CAM.cy-CAM.F*(dx*CAM.ux+dy*CAM.uy+dz*CAM.uz)/cz;PJ[2]=cz;return PJ;}
/* ---- G-buffer ---- */
let GZ=null,GF=null,GH=null,GHD=null;   /* 1/z, face id, hole id (-1), depth below the board inside a hole */
RESCB.push(()=>{GZ=new Float32Array(W*H);GF=new Int32Array(W*H);GH=new Int8Array(W*H);GHD=new Float32Array(W*H);CAM.sig='';});
/* rasterize one screen triangle (x,y in matrix px, w = 1/z). Row spans come from solving the three
   edge functions for x, so no pixel outside the triangle is ever visited. */
function rtri(x0,y0,w0,x1,y1,w1,x2,y2,w2,id){
  let ar=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);if(ar>-1e-9&&ar<1e-9)return;
  if(ar<0){let t=x1;x1=x2;x2=t;t=y1;y1=y2;y2=t;t=w1;w1=w2;w2=t;ar=-ar;}
  const dwx=((w1-w0)*(y2-y0)-(w2-w0)*(y1-y0))/ar,dwy=((w2-w0)*(x1-x0)-(w1-w0)*(x2-x0))/ar;
  let ya=Math.ceil(Math.min(y0,y1,y2)-.5),yb=Math.floor(Math.max(y0,y1,y2)-.5);if(ya<Y0)ya=Y0;if(yb>H-1)yb=H-1;
  const ax=-(y1-y0),bx=-(y2-y1),cx=-(y0-y2);
  for(let y=ya;y<=yb;y++){
    const py=y+.5;let xl=-1e9,xr=1e9,A,Bc,q;
    Bc=(x1-x0)*(py-y0)+(y1-y0)*x0;A=ax;if(A>1e-12){q=-Bc/A;if(q>xl)xl=q;}else if(A<-1e-12){q=-Bc/A;if(q<xr)xr=q;}else if(Bc<0)continue;
    Bc=(x2-x1)*(py-y1)+(y2-y1)*x1;A=bx;if(A>1e-12){q=-Bc/A;if(q>xl)xl=q;}else if(A<-1e-12){q=-Bc/A;if(q<xr)xr=q;}else if(Bc<0)continue;
    Bc=(x0-x2)*(py-y2)+(y0-y2)*x2;A=cx;if(A>1e-12){q=-Bc/A;if(q>xl)xl=q;}else if(A<-1e-12){q=-Bc/A;if(q<xr)xr=q;}else if(Bc<0)continue;
    let xa=Math.ceil(xl-.5),xe=Math.floor(xr-.5);if(xa<0)xa=0;if(xe>W-1)xe=W-1;if(xa>xe)continue;
    let w=w0+dwx*(xa+.5-x0)+dwy*(py-y0),i=y*W+xa;
    for(let x=xa;x<=xe;x++,i++,w+=dwx)if(w>GZ[i]){GZ[i]=w;GF[i]=id;}
  }
}
const NEAR=.03,CLP=new Float32Array(30);
function rasterScene(){
  const {ex,ey,ez,fx,fy,fz,rx,ry,rz,ux,uy,uz,F,cx,cy}=CAM;
  for(let i=0;i<NV;i++){const dx=VX[i]-ex,dy=VY[i]-ey,dz=VZ[i]-ez,z=dx*fx+dy*fy+dz*fz,x=dx*rx+dy*ry+dz*rz,y=dx*ux+dy*uy+dz*uz;
    VCX[i]=x;VCY[i]=y;VCZ[i]=z;if(z>NEAR){SXA[i]=cx+F*x/z;SYA[i]=cy-F*y/z;}}
  GZ.fill(0,Y0*W);GF.fill(-1,Y0*W);GH.fill(-1,Y0*W);
  for(let t=0;t<NT;t++){
    const a=TA[t],b=TB[t],c=TC[t];
    /* back-face cull in world space */
    if((VX[a]-ex)*TNX[t]+(VY[a]-ey)*TNY[t]+(VZ[a]-ez)*TNZ[t]>=0)continue;
    const za=VCZ[a],zb=VCZ[b],zc=VCZ[c];
    if(za>NEAR&&zb>NEAR&&zc>NEAR){rtri(SXA[a],SYA[a],1/za,SXA[b],SYA[b],1/zb,SXA[c],SYA[c],1/zc,t);continue;}
    if(za<=NEAR&&zb<=NEAR&&zc<=NEAR)continue;
    /* near-plane clip (Sutherland-Hodgman, one plane), then fan */
    let n=0;const vs=[a,b,c];
    for(let k=0;k<3;k++){const p=vs[k],q=vs[(k+1)%3],zp=VCZ[p],zq=VCZ[q];
      if(zp>NEAR){CLP[n*3]=VCX[p];CLP[n*3+1]=VCY[p];CLP[n*3+2]=zp;n++;}
      if((zp>NEAR)!==(zq>NEAR)){const s=(NEAR-zp)/(zq-zp);CLP[n*3]=VCX[p]+(VCX[q]-VCX[p])*s;CLP[n*3+1]=VCY[p]+(VCY[q]-VCY[p])*s;CLP[n*3+2]=NEAR;n++;}}
    for(let k=1;k<n-1;k++){const P=(j,o)=>o===0?cx+F*CLP[j*3]/CLP[j*3+2]:cy-F*CLP[j*3+1]/CLP[j*3+2];
      rtri(P(0,0),P(0,1),1/CLP[2],P(k,0),P(k,1),1/CLP[k*3+2],P(k+1,0),P(k+1,1),1/CLP[k*3+5],t);}
  }
  holePass();
}
/* holes are cut analytically: a board dot inside a hole circle is replaced by the far inside wall
   of an open cylinder (ray vs cylinder), and the depth buffer gets that deeper depth, so a ball
   sinking into a pocket is depth-tested against the real hole, not against the flat board. */
function holePass(){
  const {ex,ey,ez,fx,fy,fz,rx,ry,rz,ux,uy,uz,F,cx,cy}=CAM;const B=[0,0,0];
  for(let y=Y0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,id=GF[i];if(id<0||TMAT[id]!==MT.BOARD)continue;
    const z=1/GZ[i],px=(x+.5-cx)/F,py=-(y+.5-cy)/F,dx=fx+px*rx+py*ux,dy=fy+px*ry+py*uy,dz=fz+px*rz+py*uz;
    toBoard(ex+dx*z-TLN[id]*PITCH,ey+dy*z,ez+dz*z,B);
    for(let h=0;h<HOLES.length;h++){const ho=HOLES[h],ou=B[0]-ho.u,ov=B[1]-ho.v;if(ou*ou+ov*ov>=ho.r*ho.r)continue;
      /* ray direction in board coords (u, v, w) */
      const du=dx,dv=dy*SINP+dz*COSP,dw=dy*COSP-dz*SINP;
      const a=du*du+dv*dv,b=2*(ou*du+ov*dv),c=ou*ou+ov*ov-ho.r*ho.r;let s=(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a);
      let dep=-s*dw;if(dep>PH.HOLED){dep=PH.HOLED;s=PH.HOLED/-dw;}
      GH[i]=h;GHD[i]=dep;GZ[i]=1/(z+s);break;}
  }
}
