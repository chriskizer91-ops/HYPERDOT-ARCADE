/* =====================================================================================
   10. SOFT BODIES IN 3D
   Every plush is a cloud of balls (its physics points, from build_plush.py) that wants to keep its shape:
   - shape matching: each substep the best-fit rotation of the rest shape is found (Mueller 2016, warm-started
     quaternion), blended a little with the best-fit stretch so plush can squash, and every ball is pulled
     part of the way to its goal. Low pull = squishy.
   - springs between near balls keep the local shape, so a prong makes a dent instead of moving the whole toy.
   - balls of different toys push apart with friction; the case floor, walls, glass and prize chute hold them.
   - rigid-mode damping takes the jiggle out without stopping tumbles.
   Units: metres, seconds. One 60 Hz tick = SUBS substeps.
   ===================================================================================== */
const SUBS=4,HS=1/(60*SUBS),H2=HS*HS,GRAV=9.81,AIR=.9995;
const MU_S=.75,MU_K=.5,FL_S=.95,FL_K=.65;
const MAXP=4096;
const PX=new Float64Array(MAXP),PY=new Float64Array(MAXP),PZ=new Float64Array(MAXP);
const OX=new Float64Array(MAXP),OY=new Float64Array(MAXP),OZ=new Float64Array(MAXP);
const PR=new Float64Array(MAXP),PW=new Float64Array(MAXP),PB=new Int32Array(MAXP).fill(-1),PS=new Uint8Array(MAXP);   // PS: 1 = its body sleeps
let NP=0;
const BOD=[];let BID=0;
/* the case: set by the machine (x across, y up, z toward the glass); the chute is the front-left corner */
const CASE={x0:-.45,x1:.45,z0:-.35,z1:.35,top:1,cx:-.2,cz:.1,ch:.2,cw:.006,deep:-.6};

/* ---------- per type: rest shape, springs, the stretch matrix (built once per toy design) ---------- */
function prepType(T){
  if(T._p)return T._p;
  const m=T.model,n=m.np,s=T.size,rx=new Float64Array(n),ry=new Float64Array(n),rz=new Float64Array(n),rr=new Float64Array(n);
  let cx=0,cy=0,cz=0;
  for(let k=0;k<n;k++){rx[k]=m.part[k*4]*s;ry[k]=m.part[k*4+1]*s;rz[k]=m.part[k*4+2]*s;rr[k]=Math.min(m.part[k*4+3]*(T.inflate||1.12),.11)*s;cx+=rx[k];cy+=ry[k];cz+=rz[k];}
  cx/=n;cy/=n;cz/=n;
  const q=new Float64Array(n*3);for(let k=0;k<n;k++){q[k*3]=rx[k]-cx;q[k*3+1]=ry[k]-cy;q[k*3+2]=rz[k]-cz;}
  /* springs to the 5 nearest balls */
  const E=[];
  for(let a=0;a<n;a++){const d=[];for(let b=0;b<n;b++)if(b!==a)d.push([Math.hypot(rx[a]-rx[b],ry[a]-ry[b],rz[a]-rz[b]),b]);d.sort((u,v)=>u[0]-v[0]);
    for(let j=0;j<Math.min(5,d.length);j++){const b=d[j][1];if(a<b||!E.some(e=>e[0]===b&&e[1]===a))E.push([a,b,d[j][0]]);}}
  const ei=new Int32Array(E.length*2),el=new Float64Array(E.length);E.forEach((e,i)=>{ei[i*2]=e[0];ei[i*2+1]=e[1];el[i]=e[2];});
  /* Aqq^-1 for the stretch part of shape matching */
  let a00=0,a01=0,a02=0,a11=0,a12=0,a22=0;
  for(let k=0;k<n;k++){const x=q[k*3],y=q[k*3+1],z=q[k*3+2];a00+=x*x;a01+=x*y;a02+=x*z;a11+=y*y;a12+=y*z;a22+=z*z;}
  const AQ=inv3([a00,a01,a02,a01,a11,a12,a02,a12,a22]);
  /* model-space origin relative to the rest centroid: the mesh is drawn from the balls, this places it */
  T._p={n,q,r:rr,ei,el,AQ,c0:[cx,cy,cz],h:s,mass:T.mass||.2};
  return T._p;
}
function inv3(m){const [a,b,c,d,e,f,g,h,i]=m,A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C;if(Math.abs(det)<1e-18)return [1,0,0,0,1,0,0,0,1];
  const k=1/det;return [A*k,-(b*i-c*h)*k,(b*f-c*e)*k,B*k,(a*i-c*g)*k,-(a*f-c*d)*k,C*k,-(a*h-b*g)*k,(a*e-b*d)*k];}
/* quaternion [x,y,z,w] -> row-major 3x3 */
function qmat(q,R){const [x,y,z,w]=q;R[0]=1-2*(y*y+z*z);R[1]=2*(x*y-z*w);R[2]=2*(x*z+y*w);R[3]=2*(x*y+z*w);R[4]=1-2*(x*x+z*z);R[5]=2*(y*z-x*w);R[6]=2*(x*z-y*w);R[7]=2*(y*z+x*w);R[8]=1-2*(x*x+y*y);return R;}
/* Mueller, Bender, Chentanez, Macklin 2016: the rotation part of A, iterating a warm-started quaternion */
function extractRot(A,q,R,iters){
  for(let it=0;it<iters;it++){qmat(q,R);
    const ox=(R[3]*A[6]-R[6]*A[3])+(R[4]*A[7]-R[7]*A[4])+(R[5]*A[8]-R[8]*A[5]),
          oy=(R[6]*A[0]-R[0]*A[6])+(R[7]*A[1]-R[1]*A[7])+(R[8]*A[2]-R[2]*A[8]),
          oz=(R[0]*A[3]-R[3]*A[0])+(R[1]*A[4]-R[4]*A[1])+(R[2]*A[5]-R[5]*A[2]);
    const dn=Math.abs(R[0]*A[0]+R[3]*A[3]+R[6]*A[6]+R[1]*A[1]+R[4]*A[4]+R[7]*A[7]+R[2]*A[2]+R[5]*A[5]+R[8]*A[8])+1e-9;
    const wx=ox/dn,wy=oy/dn,wz=oz/dn,w=Math.hypot(wx,wy,wz);if(w<1e-9)break;
    const s=Math.sin(w/2)/w,c=Math.cos(w/2),ax=wx*s,ay=wy*s,az=wz*s;
    const [x,y,z,ww]=q;q[0]=c*x+ax*ww+ay*z-az*y;q[1]=c*y-ax*z+ay*ww+az*x;q[2]=c*z+ax*y-ay*x+az*ww;q[3]=c*ww-ax*x-ay*y-az*z;
    const l=Math.hypot(q[0],q[1],q[2],q[3]);q[0]/=l;q[1]/=l;q[2]/=l;q[3]/=l;}
  return qmat(q,R);
}
/* place a toy: position (x,y,z) of its rest centroid, a yaw, an optional tilt, starting velocity */
function spawn(T,x,y,z,yaw=0,vx=0,vy=0,vz=0,tilt=0){
  const P=prepType(T),n=P.n;if(NP+n>MAXP)compact();if(NP+n>MAXP)return null;
  const q=quatYawTilt(yaw,tilt),R=qmat(q,new Float64Array(9));
  const b={T,P,i0:NP,n,state:'pit',q,R,A:new Float64Array(9),cx:x,cy:y,cz:z,id:++BID,pc:0,touch:0,imp:0,held:0,comp:1,
    x0:0,x1:0,y0:0,y1:0,z0:0,z1:0,age:0,mood:0,moodT:0,sqT:0,impT:0,fails:0,sleep:false,calm:0,L:new Float64Array(9),G:new Float64Array(9)};
  for(let k=0;k<n;k++){const i=NP+k,qx=P.q[k*3],qy=P.q[k*3+1],qz=P.q[k*3+2];
    PX[i]=x+R[0]*qx+R[1]*qy+R[2]*qz;PY[i]=y+R[3]*qx+R[4]*qy+R[5]*qz;PZ[i]=z+R[6]*qx+R[7]*qy+R[8]*qz;
    OX[i]=PX[i]-vx*HS;OY[i]=PY[i]-vy*HS;OZ[i]=PZ[i]-vz*HS;PR[i]=P.r[k];PW[i]=n/P.mass;PB[i]=BOD.length;PS[i]=0;}
  NP+=n;BOD.push(b);reindex();return b;
}
function quatYawTilt(yaw,tilt){const cy=Math.cos(yaw/2),sy=Math.sin(yaw/2),ct=Math.cos(tilt/2),st=Math.sin(tilt/2);
  /* yaw about y, then tilt about x */return [ct*0+st*cy,sy*ct,-sy*st,cy*ct];}
function kill(b){const k=BOD.indexOf(b);if(k<0)return;for(let i=b.i0;i<b.i0+b.n;i++){PB[i]=-1;PW[i]=0;}BOD.splice(k,1);b.state=b.state==='won'?'won':'gone';reindex();}
function reindex(){for(let k=0;k<BOD.length;k++){const b=BOD[k];for(let i=b.i0;i<b.i0+b.n;i++)PB[i]=k;}}
function compact(){BOD.sort((a,b)=>a.i0-b.i0);let w=0;
  for(const b of BOD){if(b.i0!==w){for(let k=0;k<b.n;k++){const s=b.i0+k,d=w+k;PX[d]=PX[s];PY[d]=PY[s];PZ[d]=PZ[s];OX[d]=OX[s];OY[d]=OY[s];OZ[d]=OZ[s];PR[d]=PR[s];PW[d]=PW[s];}b.i0=w;}w+=b.n;}
  for(let i=w;i<NP;i++){PB[i]=-1;PW[i]=0;PS[i]=0;}NP=w;reindex();}
/* sleep: a toy lying still costs nothing until something touches it */
function setSleep(b,on){b.sleep=on;b.calm=0;for(let i=b.i0;i<b.i0+b.n;i++){PS[i]=on?1:0;if(on){OX[i]=PX[i];OY[i]=PY[i];OZ[i]=PZ[i];}}}
function wake(b){if(b.sleep)setSleep(b,false);}

/* ---------- one body's own constraints ---------- */
function solveBody(b){
  const P=b.P,i0=b.i0,n=b.n,q=P.q,T=b.T;
  let cx=0,cy=0,cz=0;for(let i=i0;i<i0+n;i++){cx+=PX[i];cy+=PY[i];cz+=PZ[i];}cx/=n;cy/=n;cz/=n;
  const A=b.A;A.fill(0);
  for(let k=0;k<n;k++){const i=i0+k,px=PX[i]-cx,py=PY[i]-cy,pz=PZ[i]-cz,qx=q[k*3],qy=q[k*3+1],qz=q[k*3+2];
    A[0]+=px*qx;A[1]+=px*qy;A[2]+=px*qz;A[3]+=py*qx;A[4]+=py*qy;A[5]+=py*qz;A[6]+=pz*qx;A[7]+=pz*qy;A[8]+=pz*qz;}
  const R=extractRot(A,b.q,b.R,2);
  /* goal = blend of the best rotation and the best stretch (volume-normalised), so plush squash and bulge */
  let G=R;const be=T.beta??.3;
  if(be>0){const Q=P.AQ,L=b.L;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++)L[r*3+c]=A[r*3]*Q[c]+A[r*3+1]*Q[3+c]+A[r*3+2]*Q[6+c];
    const det=L[0]*(L[4]*L[8]-L[5]*L[7])-L[1]*(L[3]*L[8]-L[5]*L[6])+L[2]*(L[3]*L[7]-L[4]*L[6]);
    if(det>.05){const k=1/Math.cbrt(det);G=b.G;for(let j=0;j<9;j++)G[j]=be*L[j]*k+(1-be)*R[j];}
    b.comp=Math.min(1.2,Math.max(.4,det));}
  const al=T.ks??.06;
  for(let k=0;k<n;k++){const i=i0+k,qx=q[k*3],qy=q[k*3+1],qz=q[k*3+2];
    PX[i]+=(cx+G[0]*qx+G[1]*qy+G[2]*qz-PX[i])*al;PY[i]+=(cy+G[3]*qx+G[4]*qy+G[5]*qz-PY[i])*al;PZ[i]+=(cz+G[6]*qx+G[7]*qy+G[8]*qz-PZ[i])*al;}
  /* springs between near balls */
  const ei=P.ei,el=P.el,ke=T.ke??.25;
  for(let e=0;e<el.length;e++){const a=i0+ei[e*2],c=i0+ei[e*2+1],dx=PX[c]-PX[a],dy=PY[c]-PY[a],dz=PZ[c]-PZ[a],d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-9,f=(d-el[e])/d*.5*ke;
    PX[a]+=dx*f;PY[a]+=dy*f;PZ[a]+=dz*f;PX[c]-=dx*f;PY[c]-=dy*f;PZ[c]-=dz*f;}
  b.cx=cx;b.cy=cy;b.cz=cz;
}
/* rigid-mode damping: pull each ball's velocity toward the body's rigid motion (kills jiggle, keeps tumbles);
   plus rolling resistance while it rests on something, so fabric squashes into a contact patch instead of rolling */
function dampBody(b){
  const i0=b.i0,n=b.n;let cx=0,cy=0,cz=0,vx=0,vy=0,vz=0;
  for(let i=i0;i<i0+n;i++){cx+=PX[i];cy+=PY[i];cz+=PZ[i];vx+=PX[i]-OX[i];vy+=PY[i]-OY[i];vz+=PZ[i]-OZ[i];}
  cx/=n;cy/=n;cz/=n;vx/=n;vy/=n;vz/=n;
  let lx=0,ly=0,lz=0,i00=0,i01=0,i02=0,i11=0,i12=0,i22=0;
  for(let i=i0;i<i0+n;i++){const rx=PX[i]-cx,ry=PY[i]-cy,rz=PZ[i]-cz,ux=PX[i]-OX[i]-vx,uy=PY[i]-OY[i]-vy,uz=PZ[i]-OZ[i]-vz;
    lx+=ry*uz-rz*uy;ly+=rz*ux-rx*uz;lz+=rx*uy-ry*ux;const r2=rx*rx+ry*ry+rz*rz;
    i00+=r2-rx*rx;i11+=r2-ry*ry;i22+=r2-rz*rz;i01-=rx*ry;i02-=rx*rz;i12-=ry*rz;}
  const I=inv3([i00,i01,i02,i01,i11,i12,i02,i12,i22]),wx=I[0]*lx+I[1]*ly+I[2]*lz,wy=I[3]*lx+I[4]*ly+I[5]*lz,wz=I[6]*lx+I[7]*ly+I[8]*lz;
  const kd=b.T.kd??.02,kr=b.touch?.03:0;
  for(let i=i0;i<i0+n;i++){const rx=PX[i]-cx,ry=PY[i]-cy,rz=PZ[i]-cz;
    const tx=vx+wy*rz-wz*ry,ty=vy+wz*rx-wx*rz,tz=vz+wx*ry-wy*rx;
    const ux=PX[i]-OX[i],uy=PY[i]-OY[i],uz=PZ[i]-OZ[i];
    let nx=ux+(tx-ux)*kd,ny=uy+(ty-uy)*kd,nz=uz+(tz-uz)*kd;
    if(kr){nx-=(wy*rz-wz*ry)*kr;ny-=(wz*rx-wx*rz)*kr;nz-=(wx*ry-wy*rx)*kr;}
    OX[i]=PX[i]-nx;OY[i]=PY[i]-ny;OZ[i]=PZ[i]-nz;}
  b.touch=0;
}

/* ---------- broad phase: a counting-sort grid over the case ---------- */
let CELL=.06,GX0=-.6,GY0=-.8,GZ0=-.5,GNX=1,GNY=1,GNZ=1,GN=1;
let CST=new Int32Array(2),CIT=new Int32Array(MAXP),PCL=new Int32Array(MAXP),CUR=new Int32Array(1);
function setupGrid(){
  let mr=.01;for(let i=0;i<NP;i++)if(PB[i]>=0&&PR[i]>mr)mr=PR[i];CELL=Math.max(.02,mr*2);
  GX0=CASE.x0-.1;GY0=CASE.deep-.1;GZ0=CASE.z0-.1;
  GNX=Math.ceil((CASE.x1-CASE.x0+.2)/CELL)+1;GNY=Math.ceil((CASE.top-CASE.deep+.6)/CELL)+1;GNZ=Math.ceil((CASE.z1-CASE.z0+.2)/CELL)+1;GN=GNX*GNY*GNZ;
  if(CST.length<GN+2){CST=new Int32Array(GN+2);CUR=new Int32Array(GN+1);}
}
function buildHash(){
  CST.fill(0,0,GN+2);
  for(let i=0;i<NP;i++){if(PB[i]<0){PCL[i]=-1;continue;}
    let cx=((PX[i]-GX0)/CELL)|0,cy=((PY[i]-GY0)/CELL)|0,cz=((PZ[i]-GZ0)/CELL)|0;
    cx=cx<0?0:cx>=GNX?GNX-1:cx;cy=cy<0?0:cy>=GNY?GNY-1:cy;cz=cz<0?0:cz>=GNZ?GNZ-1:cz;
    const c=(cy*GNZ+cz)*GNX+cx;PCL[i]=c;CST[c+1]++;}
  for(let c=0;c<GN;c++)CST[c+1]+=CST[c];CUR.set(CST.subarray(0,GN));
  for(let i=0;i<NP;i++)if(PCL[i]>=0)CIT[CUR[PCL[i]]++]=i;
}
function pairC(i,j){
  const bi=PB[i],bj=PB[j];if(bi===bj||(PS[i]&PS[j]))return;
  const dx=PX[j]-PX[i],dy=PY[j]-PY[i],dz=PZ[j]-PZ[i],rr=PR[i]+PR[j],d2=dx*dx+dy*dy+dz*dz;if(d2>=rr*rr)return;
  const d=Math.sqrt(d2)||1e-6,pen=rr-d,nx=dx/d,ny=dy/d,nz=dz/d;
  if(PS[i]|PS[j]){if(pen>.004){wake(BOD[PS[i]?bi:bj]);}}
  const wi=PS[i]?0:PW[i],wj=PS[j]?0:PW[j],w=wi+wj;if(!w)return;
  const cc=pen/w;PX[i]-=nx*cc*wi;PY[i]-=ny*cc*wi;PZ[i]-=nz*cc*wi;PX[j]+=nx*cc*wj;PY[j]+=ny*cc*wj;PZ[j]+=nz*cc*wj;
  BOD[bi].touch=1;BOD[bj].touch=1;
  const rx=(PX[j]-OX[j])-(PX[i]-OX[i]),ry=(PY[j]-OY[j])-(PY[i]-OY[i]),rz=(PZ[j]-OZ[j])-(PZ[i]-OZ[i]),vn=rx*nx+ry*ny+rz*nz;
  const tx=rx-vn*nx,ty=ry-vn*ny,tz=rz-vn*nz,tl=Math.sqrt(tx*tx+ty*ty+tz*tz);
  if(tl>1e-9){const f=(tl<MU_S*pen?1:MU_K*pen/tl)/w;PX[i]+=tx*f*wi;PY[i]+=ty*f*wi;PZ[i]+=tz*f*wi;PX[j]-=tx*f*wj;PY[j]-=ty*f*wj;PZ[j]-=tz*f*wj;}
  if(vn<-.0012){const v=-vn/HS;if(BOD[bi].imp<v)BOD[bi].imp=v;if(BOD[bj].imp<v)BOD[bj].imp=v;}
}
/* when most toys sleep, only the awake balls look for neighbours (in all 27 cells round them) */
let AWAKE=new Int32Array(MAXP),NAW=0;
function collideAwake(){
  for(let a=0;a<NAW;a++){const i=AWAKE[a],c=PCL[i];if(c<0)continue;
    const cx=c%GNX,cz=((c/GNX)|0)%GNZ,cy=(c/(GNX*GNZ))|0;
    for(let oy=-1;oy<=1;oy++){const ny=cy+oy;if(ny<0||ny>=GNY)continue;
      for(let oz=-1;oz<=1;oz++){const nz=cz+oz;if(nz<0||nz>=GNZ)continue;
        for(let ox=-1;ox<=1;ox++){const nx=cx+ox;if(nx<0||nx>=GNX)continue;
          const d=(ny*GNZ+nz)*GNX+nx,qe=CST[d+1];
          for(let q=CST[d];q<qe;q++){const j=CIT[q];if(j!==i&&(PS[j]||i<j))pairC(i,j);}}}}}
}
function collideAll(){
  NAW=0;for(let i=0;i<NP;i++)if(PB[i]>=0&&!PS[i])AWAKE[NAW++]=i;
  if(NAW===0)return;
  if(NAW<NP*.45){collideAwake();return;}
  /* walk the balls in cell order; for each occupied cell test itself and its 13 "forward" neighbours,
     so every pair of cells is visited once and empty space costs nothing */
  /* only the first CST[GN] entries of CIT are this substep's balls (won toys leave gaps in the pool) */
  let m=0;const total=CST[GN];
  while(m<total){
    const c=PCL[CIT[m]],a0=CST[c],a1=CST[c+1];m=a1;
    const cx=c%GNX,cz=((c/GNX)|0)%GNZ,cy=(c/(GNX*GNZ))|0;
    for(let p=a0;p<a1;p++){const i=CIT[p];
      for(let q=p+1;q<a1;q++)pairC(i,CIT[q]);
      for(let k=0;k<13;k++){const nx=cx+NB13[k*3],ny=cy+NB13[k*3+1],nz=cz+NB13[k*3+2];if(nx<0||ny<0||nz<0||nx>=GNX||ny>=GNY||nz>=GNZ)continue;
        const d=(ny*GNZ+nz)*GNX+nx,qe=CST[d+1];for(let q=CST[d];q<qe;q++)pairC(i,CIT[q]);}
    }
  }
}
const NB13=(()=>{const o=[];for(let oy=0;oy<=1;oy++)for(let oz=(oy?-1:0);oz<=1;oz++)for(let ox=(oy||oz?-1:1);ox<=1;ox++)o.push(ox,oy,oz);return new Int8Array(o);})();
/* the case: floor, walls, glass, and the prize chute (an open-topped box in the front-left corner, its floor far below) */
function floorFric(i,pen,ms,mk){const dx=PX[i]-OX[i],dz=PZ[i]-OZ[i],tl=Math.hypot(dx,dz);if(tl<ms*pen){PX[i]=OX[i];PZ[i]=OZ[i];}else if(tl>1e-12){const k=mk*pen/tl;PX[i]-=dx*k;PZ[i]-=dz*k;}}
function wallFric(i,pen){const dy=PY[i]-OY[i];if(Math.abs(dy)<.5*pen)PY[i]=OY[i];else PY[i]-=(dy>0?1:-1)*.3*pen;}
function bounds(b){
  const C=CASE,e=b.i0+b.n;
  for(let i=b.i0;i<e;i++){const r=PR[i];
    if(PX[i]<C.x0+r){const p=C.x0+r-PX[i];PX[i]=C.x0+r;wallFric(i,p);}else if(PX[i]>C.x1-r){const p=PX[i]-C.x1+r;PX[i]=C.x1-r;wallFric(i,p);}
    if(PZ[i]<C.z0+r){const p=C.z0+r-PZ[i];PZ[i]=C.z0+r;wallFric(i,p);}else if(PZ[i]>C.z1-r){const p=PZ[i]-C.z1+r;PZ[i]=C.z1-r;wallFric(i,p);}
    if(PY[i]>C.top-r){PY[i]=C.top-r;}
    /* the chute: inside its shaft a ball falls (and the shaft walls keep it in); outside, its walls and rim are solid */
    const wasIn=OX[i]<C.cx&&OZ[i]>C.cz&&(PY[i]<C.ch+r||OY[i]<C.ch+r);
    if(wasIn){
      if(PX[i]>C.cx-C.cw-r){PX[i]=C.cx-C.cw-r;wallFric(i,0);}
      if(PZ[i]<C.cz+C.cw+r){PZ[i]=C.cz+C.cw+r;wallFric(i,0);}
      if(PY[i]<C.deep+r){const p=C.deep+r-PY[i];PY[i]=C.deep+r;floorFric(i,p,FL_S,FL_K);}
      continue;
    }
    if(PX[i]<C.cx+C.cw+r&&PZ[i]>C.cz-C.cw-r&&PY[i]<C.ch+r){
      const pu=C.ch+r-PY[i],px=C.cx+C.cw+r-PX[i],pz=PZ[i]-(C.cz-C.cw-r);
      if(pu<=px&&pu<=pz){PY[i]=C.ch+r;floorFric(i,pu,FL_S,FL_K);b.touch=1;}
      else if(px<pz){PX[i]=C.cx+C.cw+r;wallFric(i,px);}else{PZ[i]=C.cz-C.cw-r;wallFric(i,pz);}
      continue;
    }
    if(PY[i]<r){const pen=r-PY[i];const v=(OY[i]-PY[i])/HS;PY[i]=r;floorFric(i,pen,FL_S,FL_K);b.touch=1;if(v>b.imp)b.imp=v;}
  }
}
function bodyBoxes(){for(const b of BOD){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
  for(let i=b.i0,e=b.i0+b.n;i<e;i++){const r=PR[i];if(PX[i]-r<x0)x0=PX[i]-r;if(PX[i]+r>x1)x1=PX[i]+r;if(PY[i]-r<y0)y0=PY[i]-r;if(PY[i]+r>y1)y1=PY[i]+r;if(PZ[i]-r<z0)z0=PZ[i]-r;if(PZ[i]+r>z1)z1=PZ[i]+r;}
  b.x0=x0-.02;b.x1=x1+.02;b.y0=y0-.02;b.y1=y1+.02;b.z0=z0-.02;b.z1=z1+.02;}}
/* one 60 Hz physics tick */
let SLEEPOK=true;
function physTick(clawStep){
  bodyBoxes();for(const b of BOD)b.imp=0;
  for(let st=0;st<SUBS;st++){
    for(let i=0;i<NP;i++){if(PB[i]<0||PS[i])continue;const vx=(PX[i]-OX[i])*AIR,vy=(PY[i]-OY[i])*AIR,vz=(PZ[i]-OZ[i])*AIR;OX[i]=PX[i];OY[i]=PY[i];OZ[i]=PZ[i];PX[i]+=vx;PY[i]+=vy-GRAV*H2;PZ[i]+=vz;}
    if(clawStep)clawStep.integrate();
    for(const b of BOD)if(!b.sleep){dampBody(b);solveBody(b);}
    if(BOD.some(b=>!b.sleep)){buildHash();collideAll();}
    for(const b of BOD)if(!b.sleep)bounds(b);
    if(clawStep)clawStep.contacts();
  }
  /* a toy that has crept less than 6 mm/s on average (no ball faster than 4 cm/s) for half a second goes to sleep */
  for(const b of BOD){if(b.sleep||b.state!=='pit')continue;let mv=0,av=0;
    for(let i=b.i0,e=b.i0+b.n;i<e;i++){const dx=PX[i]-OX[i],dy=PY[i]-OY[i],dz=PZ[i]-OZ[i],v=Math.sqrt(dx*dx+dy*dy+dz*dz);av+=v;if(v>mv)mv=v;}
    if(SLEEPOK&&av/b.n/HS<.006&&mv/HS<.04&&!b.pc){if(++b.calm>30)setSleep(b,true);}else b.calm=0;}
}
