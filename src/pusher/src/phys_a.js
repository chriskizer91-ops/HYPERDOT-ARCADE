/* =====================================================================================
   9. COIN CASCADE — THE MASS SIMULATION
   Every coin is a real rigid disc (a cylinder of radius R and half-thickness h) with a
   position, a quaternion, linear and angular velocity. The solver is extended position-
   based dynamics (Muller et al. 2020, "Detailed rigid body simulation with XPBD"):
     once per 60 Hz tick : uniform-grid broadphase -> speculative contact generation with
                           body-local anchors (so contacts stay valid while bodies move)
     NSUB substeps       : integrate (gravity, gyroscopic term) -> project every contact
                           (normal + static friction, Gauss-Seidel, bottom-up order)
                           -> derive velocities -> velocity pass (dynamic friction,
                           restitution) -> impact events for the sound engine
   Contacts are generated from the coin's real features: the rim circle against faces and
   planes (deepest point found analytically plus a 4-point support ring), lens corners where
   two rims cross, corners where a rim crosses a table edge (so a coin overhanging the drop
   edge pivots on that edge and only tips when its centre of mass passes it), and a rim-to-rim
   lateral contact chosen by a separating-axis test. Bodies fall asleep individually and are
   woken by the contacts that disturb them, so a settled heap costs almost nothing.
   World units: coin radius = 1 (about 12 mm). x right, y up, z toward the player.
   ===================================================================================== */
const XW=16,XF=14.3,ZG=16.5,ZE=22,HP=1.0;      // side walls, gutter lips, gutter start, drop edge, deck height
const PZM=6.4,PZA=2.2,PPER=3.6;              // pusher front face: centre, amplitude (z), period (s)
const ZDROP=6.3,YDROP=8.8;                   // the chute's drop line
const GRAV=200,NSUB=4,DT=1/60,HS=DT/NSUB;
const NB=800,MAXC=20000;
/* body kinds: 0 brass token, 1 nickel token, 2 BONUS (spins the wheel), 3 prize token */
const KR=[1,1,1,1.38],KH=[.15,.15,.15,.24],KM=[1,1,1,2.6];
const F64=n=>new Float64Array(n);
const BX=F64(NB),BY=F64(NB),BZ=F64(NB),VX=F64(NB),VY=F64(NB),VZ=F64(NB);
const QW=F64(NB),QX=F64(NB),QY=F64(NB),QZ=F64(NB),WX=F64(NB),WY=F64(NB),WZ=F64(NB);
const OX=F64(NB),OY=F64(NB),OZ=F64(NB),OQW=F64(NB),OQX=F64(NB),OQY=F64(NB),OQZ=F64(NB);
const RM=F64(NB*9),OM=F64(NB*9);             // rotation matrices (row-major); columns = u, n (axis), v
const BR=F64(NB),BH=F64(NB),BIM=F64(NB),BIID=F64(NB),BIIN=F64(NB),EIM=F64(NB),EIID=F64(NB),EIIN=F64(NB),MG=F64(NB);
const KIND=new Uint8Array(NB),MOV=new Uint8Array(NB),SLP=new Uint8Array(NB),WAKE=new Uint8Array(NB),TOUCHP=new Uint8Array(NB),COVER=new Uint8Array(NB),ALV=new Uint8Array(NB),HUE=new Uint8Array(NB);
const NACT=new Uint8Array(NB),STILL=new Float32Array(NB),SAX=F64(NB),SAY=F64(NB),SAZ=F64(NB),SAN=F64(NB*3),AGE=new Float32Array(NB),SPK=new Float32Array(NB);
const LIVE=new Int32Array(NB),LPOS=new Int32Array(NB);let NL=0;
const FREE=[];
const PH={t:0,ticks:0,won:0,lost:0,spawned:0,wonK:[0,0,0,0],lostK:[0,0,0,0],spawnK:[0,0,0,0],awake:0,contacts:0,active:0,ms:0,bad:0,
  evWon:[],evLost:[],hits:new Float32Array(64*5),nHits:0,faceLoad:0,deckN:0};
const PU={ph:-Math.PI/2,z:PZM-PZA,zo:PZM-PZA,v:0};
function physReset(){FREE.length=0;for(let i=NB-1;i>=0;i--){FREE.push(i);ALV[i]=0;}NL=0;
  Object.assign(PH,{won:0,lost:0,spawned:0,wonK:[0,0,0,0],lostK:[0,0,0,0],spawnK:[0,0,0,0],bad:0});PH.evWon.length=0;PH.evLost.length=0;}

/* quaternion -> rotation matrix */
function qmat(i){const w=QW[i],x=QX[i],y=QY[i],z=QZ[i],o=i*9;
  RM[o]=1-2*(y*y+z*z);RM[o+1]=2*(x*y-w*z);RM[o+2]=2*(x*z+w*y);
  RM[o+3]=2*(x*y+w*z);RM[o+4]=1-2*(x*x+z*z);RM[o+5]=2*(y*z-w*x);
  RM[o+6]=2*(x*z-w*y);RM[o+7]=2*(y*z+w*x);RM[o+8]=1-2*(x*x+y*y);}
/* apply a small rotation vector t (radians): q += 0.5 [t,0] q */
function rotB(i,tx,ty,tz){const w=QW[i],x=QX[i],y=QY[i],z=QZ[i];
  QW[i]=w-.5*(tx*x+ty*y+tz*z);QX[i]=x+.5*(tx*w+ty*z-tz*y);QY[i]=y+.5*(ty*w+tz*x-tx*z);QZ[i]=z+.5*(tz*w+tx*y-ty*x);qmat(i);}
function qAxis(ax,ay,az,ang){const l=Math.sqrt(ax*ax+ay*ay+az*az)||1,s=Math.sin(ang/2)/l;return [Math.cos(ang/2),ax*s,ay*s,az*s];}
function spawn(k,x,y,z,q){
  if(!FREE.length)return -1;const i=FREE.pop(),R=KR[k],h=KH[k],m=KM[k];
  BX[i]=x;BY[i]=y;BZ[i]=z;VX[i]=VY[i]=VZ[i]=0;WX[i]=WY[i]=WZ[i]=0;
  const ql=Math.hypot(q[0],q[1],q[2],q[3])||1;QW[i]=q[0]/ql;QX[i]=q[1]/ql;QY[i]=q[2]/ql;QZ[i]=q[3]/ql;qmat(i);
  OX[i]=x;OY[i]=y;OZ[i]=z;OQW[i]=QW[i];OQX[i]=QX[i];OQY[i]=QY[i];OQZ[i]=QZ[i];for(let j=0;j<9;j++)OM[i*9+j]=RM[i*9+j];
  BR[i]=R;BH[i]=h;BIM[i]=1/m;BIID[i]=1/(m*(R*R/4+h*h/3));BIIN[i]=1/(m*R*R/2);   // solid cylinder inertia
  KIND[i]=k;MOV[i]=1;SLP[i]=0;WAKE[i]=0;STILL[i]=0;AGE[i]=0;SPK[i]=0;ALV[i]=1;HUE[i]=(Math.random()*4)|0;
  LPOS[i]=NL;LIVE[NL++]=i;PH.spawned++;PH.spawnK[k]++;return i;
}
function kill(i){ALV[i]=0;const p=LPOS[i],last=LIVE[--NL];LIVE[p]=last;LPOS[last]=p;FREE.push(i);}
function wakeAll(){for(let k=0;k<NL;k++){const i=LIVE[k];SLP[i]=0;STILL[i]=0;}}
/* the playfield floor (y=0): full width behind the gutters, narrowed by the side gutters in front */
const onFloor=(x,z)=>z<=ZE&&(z<ZG?(x>=-XW&&x<=XW):(x>=-XF&&x<=XF));

/* ---------- broadphase: uniform grid over x/z, rebuilt each tick with a counting sort ---------- */
const GCS=2.9,GX0=-XW-1.5,GZ0=-2,GNX=Math.ceil((2*XW+3)/GCS),GNZ=Math.ceil((ZE+9)/GCS),GN=GNX*GNZ;
const GCNT=new Int32Array(GN+1),GST=new Int32Array(GN+1),GIT=new Int32Array(NB),GOF=new Int32Array(NB);
function gridBuild(){
  GCNT.fill(0);
  for(let k=0;k<NL;k++){const i=LIVE[k];let cx=Math.floor((BX[i]-GX0)/GCS),cz=Math.floor((BZ[i]-GZ0)/GCS);
    cx=cx<0?0:cx>=GNX?GNX-1:cx;cz=cz<0?0:cz>=GNZ?GNZ-1:cz;const c=cz*GNX+cx;GOF[i]=c;GCNT[c]++;}
  let s=0;for(let c=0;c<GN;c++){GST[c]=s;s+=GCNT[c];GCNT[c]=GST[c];}GST[GN]=s;
  for(let k=0;k<NL;k++){const i=LIVE[k];GIT[GCNT[GOF[i]]++]=i;}
}

/* ---------- contacts (structure of arrays) ----------
   For contact c: body CB1 is pushed along +n, body CB2 (a coin, -1 = static world, -2 = pusher) along -n.
   Penetration d = (p2 - p1) . n with p1 = x1 + R1 r1, p2 from CR2 in CB2's frame.
   CNF: frame of the stored normal (0 world, 1 body-1 local, 2 body-2 local).
   CT types: 1 floor plane, 2 deck plane, 3 floor-edge corner, 4 deck-edge corner, 5 wall, 6 pusher face,
             7 coin face, 8 coin rim-to-rim, 9 faces below the floor (gutter lips, front face) */
const CB1=new Int32Array(MAXC),CB2=new Int32Array(MAXC),CT=new Uint8Array(MAXC),CNF=new Uint8Array(MAXC),CKEY=new Uint8Array(MAXC);
const CR1=F64(MAXC*3),CR2=F64(MAXC*3),CN=F64(MAXC*3),CMS=new Float32Array(MAXC),CMD=new Float32Array(MAXC),CE=new Float32Array(MAXC);
const CLAM=F64(MAXC),CVN=F64(MAXC),ORD=new Int32Array(MAXC),KCNT=new Int32Array(33);
let NC=0;
function addC(t,a,b,p1x,p1y,p1z,p2x,p2y,p2z,nx,ny,nz,nf,ms,md,e){
  if(NC>=MAXC)return;const c=NC++,c3=c*3,oa=a*9;
  CT[c]=t;CB1[c]=a;CB2[c]=b;CNF[c]=nf;CMS[c]=ms;CMD[c]=md;CE[c]=e;CLAM[c]=0;
  let rx=p1x-BX[a],ry=p1y-BY[a],rz=p1z-BZ[a];                       // world -> body-local (transpose)
  CR1[c3]=RM[oa]*rx+RM[oa+3]*ry+RM[oa+6]*rz;CR1[c3+1]=RM[oa+1]*rx+RM[oa+4]*ry+RM[oa+7]*rz;CR1[c3+2]=RM[oa+2]*rx+RM[oa+5]*ry+RM[oa+8]*rz;
  if(b>=0){const ob=b*9;rx=p2x-BX[b];ry=p2y-BY[b];rz=p2z-BZ[b];
    CR2[c3]=RM[ob]*rx+RM[ob+3]*ry+RM[ob+6]*rz;CR2[c3+1]=RM[ob+1]*rx+RM[ob+4]*ry+RM[ob+7]*rz;CR2[c3+2]=RM[ob+2]*rx+RM[ob+5]*ry+RM[ob+8]*rz;}
  else{CR2[c3]=p2x;CR2[c3+1]=p2y;CR2[c3+2]=b===-2?p2z-PU.z:p2z;}
  if(nf===0){CN[c3]=nx;CN[c3+1]=ny;CN[c3+2]=nz;}
  else{const o=(nf===1?a:b)*9;CN[c3]=RM[o]*nx+RM[o+3]*ny+RM[o+6]*nz;CN[c3+1]=RM[o+1]*nx+RM[o+4]*ny+RM[o+7]*nz;CN[c3+2]=RM[o+2]*nx+RM[o+5]*ny+RM[o+8]*nz;}
  const yl=b>=0?Math.min(BY[a],BY[b]):BY[a]-.4;let key=((yl+1.5)*5)|0;CKEY[c]=key<0?0:key>31?31:key;   // bottom-up solve order
}
/* ---- coin vs a horizontal plane (floor or deck): analytic deepest rim point + a 4-point support ring ---- */
function planeC(i,t,py,mg){
  const o=i*9,R=BR[i],h=BH[i],nx=RM[o+1],ny=RM[o+4],nz=RM[o+7],sf=ny>=0?-1:1;
  let wx=ny*nx,wy=ny*ny-1,wz=ny*nz;const wl=Math.sqrt(wx*wx+wy*wy+wz*wz);   // in-plane direction pointing most downward
  if(wl<1e-3){wx=RM[o];wy=RM[o+3];wz=RM[o+6];}else{wx/=wl;wy/=wl;wz/=wl;}
  const kx=ny*wz-nz*wy,ky=nz*wx-nx*wz,kz=nx*wy-ny*wx;
  const cx=BX[i]+sf*h*nx,cy=BY[i]+sf*h*ny,cz=BZ[i]+sf*h*nz,b=t===2?-2:-1;
  const ms=t===2?.65:.56,md=t===2?.5:.42,e=t===2?.32:.24;
  for(let s=0;s<4;s++){                                              // deepest point, a tripod ring at +-120 deg, and the far rim
    let qx,qy,qz;
    if(s===0){qx=cx+R*wx;qy=cy+R*wy;qz=cz+R*wz;}
    else if(s<3){const kc=-.5,ks=s===1?.866:-.866;qx=cx+R*(kc*wx+ks*kx);qy=cy+R*(kc*wy+ks*ky);qz=cz+R*(kc*wz+ks*kz);}
    else{qx=cx-2*sf*h*nx+R*wx;qy=cy-2*sf*h*ny+R*wy;qz=cz-2*sf*h*nz+R*wz;}   // the far rim, for coins standing on edge
    const d=py-qy;if(d<-mg)continue;
    if(t===1&&!onFloor(qx,qz)&&!onFloor(qx-(qx-BX[i])*.3,qz-(qz-BZ[i])*.3))continue;
    if(t===2&&qz>PU.z+.4)continue;
    addC(t,i,b,qx,qy,qz,qx,py,qz,0,1,0,0,ms,md,e);
  }
}
/* ---- coin vs a table edge (a horizontal line segment): the coin's down-facing rim crosses the edge's vertical
   plane at up to two points; the edge corner under each becomes a support whose normal is the coin face, so an
   overhanging coin pivots on the edge exactly like a lever and tips only when its centre of mass passes it ---- */
function edgeC(i,t,x0,z0,x1,z1,ey,mg){
  const o=i*9,R=BR[i],h=BH[i];
  const ux=RM[o],uz=RM[o+6],nx=RM[o+1],ny=RM[o+4],nz=RM[o+7],vx=RM[o+2],vz=RM[o+8],sf=ny>=0?-1:1;
  const cx=BX[i]+sf*h*nx,cy=BY[i]+sf*h*ny,cz=BZ[i]+sf*h*nz;
  let ex=x1-x0,ez=z1-z0;const el=Math.sqrt(ex*ex+ez*ez);ex/=el;ez/=el;
  const qx=-ez,qz=ex,A=R*(qx*ux+qz*uz),B=R*(qx*vx+qz*vz),C=(qx*x0+qz*z0)-(qx*cx+qz*cz),AB=Math.sqrt(A*A+B*B);
  if(AB<1e-6||Math.abs(C)>=AB)return;
  const th0=Math.atan2(B,A),dth=Math.acos(C/AB),fnx=sf*nx,fny=sf*ny,fnz=sf*nz,b=t===4?-2:-1;
  for(let s=-1;s<=1;s+=2){
    const th=th0+s*dth,co=Math.cos(th),si=Math.sin(th),rx=cx+R*(co*ux+si*vx),rz=cz+R*(co*uz+si*vz);
    let tt=(rx-x0)*ex+(rz-z0)*ez;tt=tt<0?0:tt>el?el:tt;
    const kx=x0+ex*tt,kz=z0+ez*tt,dx=kx-cx,dy=ey-cy,dz=kz-cz,dn=dx*fnx+dy*fny+dz*fnz;
    if(dx*dx+dy*dy+dz*dz-dn*dn>R*R*1.003)continue;                  // the corner must sit under the coin's face
    const d=-dn;if(d<-mg||d>2*h+.06)continue;
    addC(t,i,b,kx-dn*fnx,ey-dn*fny,kz-dn*fnz,kx,ey,kz,-fnx,-fny,-fnz,1,.5,.4,.28);
  }
}
/* ---- coin vs a vertical plane (walls, pusher face): both rims' extreme points toward the plane ---- */
function wallC(i,t,wx,wz,off,mg){                                // allowed side: x*wx + z*wz >= off
  const o=i*9,R=BR[i],h=BH[i],nx=RM[o+1],ny=RM[o+4],nz=RM[o+7];
  const dn=-(wx*nx+wz*nz);let px=-wx-dn*nx,py=-dn*ny,pz=-wz-dn*nz;const pl=Math.sqrt(px*px+py*py+pz*pz);   // toward the wall, in the coin's plane
  if(pl<1e-3){px=RM[o];py=RM[o+3];pz=RM[o+6];}else{px/=pl;py/=pl;pz/=pl;}
  const b=t===6?-2:-1,ms=t===6?.3:.2,md=t===6?.25:.15;
  for(let s=-1;s<=1;s+=2){
    const qx=BX[i]+s*h*nx+R*px,qy=BY[i]+s*h*ny+R*py,qz=BZ[i]+s*h*nz+R*pz,d=off-(qx*wx+qz*wz);
    if(d<-mg)continue;
    addC(t,i,b,qx,qy,qz,qx+d*wx,qy,qz+d*wz,wx,0,wz,0,ms,md,.3);
  }
}
function worldContacts(i){
  const o=i*9,x=BX[i],y=BY[i],z=BZ[i],R=BR[i],h=BH[i],ny=RM[o+4],mg=MG[i];
  const ey=R*Math.sqrt(Math.max(0,1-ny*ny))+h*Math.abs(ny),lo=y-ey;   // lowest point of the coin
  if(lo<mg&&lo>-1.2)planeC(i,1,0,mg);
  if(z<PU.z+R+.5&&lo<HP+mg&&lo>HP-.7){planeC(i,2,HP,mg);TOUCHP[i]=1;}
  if(lo<mg+.5&&lo>-1.5){
    if(z>ZE-R-.5)edgeC(i,3,-XF,ZE,XF,ZE,0,mg);
    if(z>ZG-R-.5){
      if(x>XF-R-.5){edgeC(i,3,XF,ZG,XF,ZE,0,mg);edgeC(i,3,XF,ZG,XW,ZG,0,mg);}
      if(x<-XF+R+.5){edgeC(i,3,-XF,ZG,-XF,ZE,0,mg);edgeC(i,3,-XW,ZG,-XF,ZG,0,mg);}
    }
  }
  if(Math.abs(z-PU.z)<R+.5&&lo<HP+mg+.3&&y>HP-.9){edgeC(i,4,-XW,PU.z,XW,PU.z,HP,mg);TOUCHP[i]=1;}
  if(x>XW-R-.4)wallC(i,5,-1,0,-XW,mg);
  if(x<-XW+R+.4)wallC(i,5,1,0,-XW,mg);
  if(z<R+.4)wallC(i,5,0,1,0,mg);
  if(z>PU.z-.9&&z<PU.z+R+.6&&lo<HP+.2){wallC(i,6,0,1,PU.z,mg);TOUCHP[i]=1;}
  /* safety net around the pusher's front corner: rim samples tested against the whole block every substep */
  if(Math.abs(z-PU.z)<R+.6&&lo<HP+mg&&y<HP+R){const o2=i*9,ux=RM[o2],uy=RM[o2+3],uz=RM[o2+6],vx=RM[o2+2],vy=RM[o2+5],vz=RM[o2+8],nx=RM[o2+1],ny2=RM[o2+4],nz=RM[o2+7];
    for(let s=0;s<8;s++){const f=(s&4)?h:-h,ca=s&1?0:(s&2?-1:1),cb=s&1?(s&2?-1:1):0;
      const qx=x+f*nx+R*(ca*ux+cb*vx),qy=y+f*ny2+R*(ca*uy+cb*vy),qz=z+f*nz+R*(ca*uz+cb*vz);
      if(qz>PU.z+.5||qy>HP+.5)continue;addC(10,i,-2,qx,qy,qz,qx,qy,qz,0,0,1,0,.3,.25,.2);}}
  if(lo<0){                                                          // coins already past a lip and dipping below the floor:
    if(z>ZE+.02&&z<ZE+R+.6&&Math.abs(x)<XF+.5)wallC(i,9,0,1,ZE,mg);  // the front face of the field, gutter lips, gutter backs
    if(z>ZG){if(x>XF+.02&&x<XF+R+.6)wallC(i,9,1,0,XF,mg);if(x<-XF-.02&&x>-XF-R-.6)wallC(i,9,-1,0,XF,mg);}
    if(Math.abs(x)>XF+.02&&z>ZG+.02&&z<ZG+R+.6)wallC(i,9,0,1,ZG,mg);
  }
}

/* ---- coin vs coin. Candidate support points on both faces, a rim-to-rim lateral contact, and a separating-axis
   choice between them: the configuration needing the least correction is the real one (a coin pressed
   sideways into a neighbour keeps a horizontal normal; a coin lying on another gets face supports). ---- */
const CA=new Float64Array(16*8);let NCA=0;
function cand(px_,py_,pz_,qx,qy,qz,d,who){if(NCA>=16)return;const o=NCA*8;CA[o]=px_;CA[o+1]=py_;CA[o+2]=pz_;CA[o+3]=qx;CA[o+4]=qy;CA[o+5]=qz;CA[o+6]=d;CA[o+7]=who;NCA++;}
/* points of P's facing rim circle that lie over Q's facing face */
function circFace(P,fp,Q,fq,mg,who){
  const op=P*9,oq=Q*9,npx=RM[op+1],npy=RM[op+4],npz=RM[op+7],nqx=RM[oq+1],nqy=RM[oq+4],nqz=RM[oq+7];
  const Rp=BR[P],Rq=BR[Q],hp=BH[P],hq=BH[Q],ox=fq*nqx,oy=fq*nqy,oz=fq*nqz;
  const fx=BX[Q]+hq*ox,fy=BY[Q]+hq*oy,fz=BZ[Q]+hq*oz,cx=BX[P]+fp*hp*npx,cy=BY[P]+fp*hp*npy,cz=BZ[P]+fp*hp*npz;
  const on=ox*npx+oy*npy+oz*npz;let wx=-ox+on*npx,wy=-oy+on*npy,wz=-oz+on*npz,wl=Math.sqrt(wx*wx+wy*wy+wz*wz);
  if(wl<.02){wx=BX[Q]-cx;wy=BY[Q]-cy;wz=BZ[Q]-cz;const tt=wx*npx+wy*npy+wz*npz;wx-=tt*npx;wy-=tt*npy;wz-=tt*npz;wl=Math.sqrt(wx*wx+wy*wy+wz*wz);
    if(wl<1e-4){wx=RM[op];wy=RM[op+3];wz=RM[op+6];wl=1;}}
  wx/=wl;wy/=wl;wz/=wl;
  const kx=npy*wz-npz*wy,ky=npz*wx-npx*wz,kz=npx*wy-npy*wx,RR=Rq*Rq*1.002;let best=-1e9;
  for(let s=0;s<4;s++){
    const ca=s===0?1:s===2?-1:0,cb=s===1?1:s===3?-1:0;
    const qx=cx+Rp*(ca*wx+cb*kx),qy=cy+Rp*(ca*wy+cb*ky),qz=cz+Rp*(ca*wz+cb*kz);
    const d=(fx-qx)*ox+(fy-qy)*oy+(fz-qz)*oz;if(d<-mg||d>2*hq+mg)continue;
    const rx=qx-BX[Q],ry=qy-BY[Q],rz=qz-BZ[Q],ra=rx*nqx+ry*nqy+rz*nqz;if(rx*rx+ry*ry+rz*rz-ra*ra>RR)continue;
    cand(qx,qy,qz,qx+d*ox,qy+d*oy,qz+d*oz,d,who);if(d>best)best=d;
  }
  return best;
}
/* the two corners of the overlap lens (where P's rim crosses Q's rim, measured in Q's face plane) */
function lensC(P,fp,Q,fq,mg){
  const op=P*9,oq=Q*9,npx=RM[op+1],npy=RM[op+4],npz=RM[op+7];
  const uqx=RM[oq],uqy=RM[oq+3],uqz=RM[oq+6],vqx=RM[oq+2],vqy=RM[oq+5],vqz=RM[oq+8],ox=fq*RM[oq+1],oy=fq*RM[oq+4],oz=fq*RM[oq+7];
  const Rp=BR[P],Rq=BR[Q],hp=BH[P],hq=BH[Q];
  const fx=BX[Q]+hq*ox,fy=BY[Q]+hq*oy,fz=BZ[Q]+hq*oz,cx=BX[P]+fp*hp*npx,cy=BY[P]+fp*hp*npy,cz=BZ[P]+fp*hp*npz;
  const rx=cx-fx,ry=cy-fy,rz=cz-fz,pa=rx*uqx+ry*uqy+rz*uqz,pb=rx*vqx+ry*vqy+rz*vqz,dd=Math.sqrt(pa*pa+pb*pb);
  if(dd<1e-4||dd>=Rp+Rq||dd<=Math.abs(Rq-Rp))return -1e9;
  const l=(Rq*Rq-Rp*Rp+dd*dd)/(2*dd),hh=Math.sqrt(Math.max(0,Rq*Rq-l*l)),ea=pa/dd,eb=pb/dd;let best=-1e9;
  for(let s=-1;s<=1;s+=2){
    const ka=ea*l-eb*hh*s,kb=eb*l+ea*hh*s,kx=fx+ka*uqx+kb*vqx,ky=fy+ka*uqy+kb*vqy,kz=fz+ka*uqz+kb*vqz;
    let wx=kx-cx,wy=ky-cy,wz=kz-cz;const tt=wx*npx+wy*npy+wz*npz;wx-=tt*npx;wy-=tt*npy;wz-=tt*npz;const wl=Math.sqrt(wx*wx+wy*wy+wz*wz);if(wl<1e-6)continue;
    const qx=cx+Rp*wx/wl,qy=cy+Rp*wy/wl,qz=cz+Rp*wz/wl,d=(fx-qx)*ox+(fy-qy)*oy+(fz-qz)*oz;
    if(d<-mg||d>2*hq+mg)continue;
    cand(qx,qy,qz,qx+d*ox,qy+d*oy,qz+d*oz,d,0);if(d>best)best=d;
  }
  return best;
}
const SEL=new Int32Array(3);
function pairC(a,b,mg){
  const oa=a*9,ob=b*9,dx=BX[b]-BX[a],dy=BY[b]-BY[a],dz=BZ[b]-BZ[a];
  const nax=RM[oa+1],nay=RM[oa+4],naz=RM[oa+7],nbx=RM[ob+1],nby=RM[ob+4],nbz=RM[ob+7],Ra=BR[a],Rb=BR[b],ha=BH[a],hb=BH[b];
  /* axis 1: the mean "up" normal m — coins separated along it cannot touch */
  const sa=nay>=0?1:-1,sb=nby>=0?1:-1;let mx=nax*sa+nbx*sb,my=nay*sa+nby*sb,mz=naz*sa+nbz*sb;const ml=Math.sqrt(mx*mx+my*my+mz*mz)||1;mx/=ml;my/=ml;mz/=ml;
  const dm=dx*mx+dy*my+dz*mz;let ca=nax*mx+nay*my+naz*mz,cb=nbx*mx+nby*my+nbz*mz;
  const mo=ha*Math.abs(ca)+Ra*Math.sqrt(Math.max(0,1-ca*ca))+hb*Math.abs(cb)+Rb*Math.sqrt(Math.max(0,1-cb*cb))-Math.abs(dm);
  if(mo<-mg)return;
  /* axis 2: lateral, between the centres perpendicular to m */
  let Lx=dx-dm*mx,Ly=dy-dm*my,Lz=dz-dm*mz,Ll=Math.sqrt(Lx*Lx+Ly*Ly+Lz*Lz);
  if(Ll<1e-6){Lx=1;Ly=0;Lz=0;Ll=0;}else{Lx/=Ll;Ly/=Ll;Lz/=Ll;}
  ca=nax*Lx+nay*Ly+naz*Lz;cb=nbx*Lx+nby*Ly+nbz*Lz;
  const penL=ha*Math.abs(ca)+Ra*Math.sqrt(Math.max(0,1-ca*ca))+hb*Math.abs(cb)+Rb*Math.sqrt(Math.max(0,1-cb*cb))-Ll;
  if(penL<-mg)return;
  /* face supports */
  NCA=0;const fa=(dx*nax+dy*nay+dz*naz)>=0?1:-1,fb=(dx*nbx+dy*nby+dz*nbz)>=0?-1:1;
  let pen=circFace(b,fb,a,fa,mg,0);pen=Math.max(pen,circFace(a,fa,b,fb,mg,1),lensC(b,fb,a,fa,mg));
  let used=0;
  if(NCA>0&&(pen<penL||mo<0)){
    /* keep at most 3 (a tripod defines the support plane): the deepest, then greedy farthest-point for a wide support */
    let n=NCA;if(n>3){let bi=0;for(let k=1;k<NCA;k++)if(CA[k*8+6]>CA[bi*8+6])bi=k;SEL[0]=bi;
      for(let s=1;s<3;s++){let bk=-1,bd=-1;for(let k=0;k<NCA;k++){let md=1e9;for(let r=0;r<s;r++){const o1=k*8,o2=SEL[r]*8,ex=CA[o1]-CA[o2],ey=CA[o1+1]-CA[o2+1],ez=CA[o1+2]-CA[o2+2],dd=ex*ex+ey*ey+ez*ez;if(dd<md)md=dd;}if(md>bd){bd=md;bk=k;}}SEL[s]=bk;}n=3;}
    else for(let k=0;k<n;k++)SEL[k]=k;
    for(let s=0;s<n;s++){const o=SEL[s]*8;
      if(CA[o+7]===0)addC(7,b,a,CA[o],CA[o+1],CA[o+2],CA[o+3],CA[o+4],CA[o+5],fa*nax,fa*nay,fa*naz,2,.56,.4,.34);
      else addC(7,a,b,CA[o],CA[o+1],CA[o+2],CA[o+3],CA[o+4],CA[o+5],fb*nbx,fb*nby,fb*nbz,2,.56,.4,.34);}
    if(BY[b]>BY[a])COVER[a]++;else COVER[b]++;
    used=pen;
  }else{
    /* rim to rim (only when the two slabs overlap in height): support points of each cylinder along +-L */
    if(mo<-.04)return;
    const sA=Math.abs(ca)>.03?(ca>0?ha:-ha):0,sB=Math.abs(cb)>.03?(cb>0?-hb:hb):0;
    let wax=Lx-ca*nax,way=Ly-ca*nay,waz=Lz-ca*naz;const wal=Math.sqrt(wax*wax+way*way+waz*waz)||1;
    let wbx=-Lx+cb*nbx,wby=-Ly+cb*nby,wbz=-Lz+cb*nbz;const wbl=Math.sqrt(wbx*wbx+wby*wby+wbz*wbz)||1;
    const p2x=BX[a]+sA*nax+Ra*wax/wal,p2y=BY[a]+sA*nay+Ra*way/wal,p2z=BZ[a]+sA*naz+Ra*waz/wal;
    const p1x=BX[b]+sB*nbx+Rb*wbx/wbl,p1y=BY[b]+sB*nby+Rb*wby/wbl,p1z=BZ[b]+sB*nbz+Rb*wbz/wbl;
    addC(8,b,a,p1x,p1y,p1z,p2x,p2y,p2z,Lx,Ly,Lz,0,.45,.32,.3);
    used=penL;
  }
  /* wake-up rules for a sleeping partner: support underneath it moved, or it is being pushed */
  /* wake a sleeping partner only for real causes: its support is genuinely moving (judged by displacement, not by the
     solver's resting jitter, which would otherwise set off endless wake chains), or it is being pushed into */
  if(!SLP[a]!==!SLP[b]){const s=SLP[a]?a:b,w=SLP[a]?b:a;if((BY[s]>BY[w]+.05&&MOV[w])||used>.05)WAKE[s]=1;}
}
function detect(){
  NC=0;gridBuild();
  for(let cz=0;cz<GNZ;cz++)for(let cx=0;cx<GNX;cx++){
    const c0=cz*GNX+cx,s0=GST[c0],e0=GST[c0+1];if(s0===e0)continue;
    for(let nb=0;nb<5;nb++){                                        // half stencil: self, E, SW, S, SE
      const ox=nb===1?1:nb===2?-1:nb===4?1:0,oz=nb>=2?1:0,nx=cx+ox,nz=cz+oz;
      if(nx<0||nx>=GNX||nz>=GNZ)continue;
      const c1=nz*GNX+nx,s1=GST[c1],e1=GST[c1+1];
      for(let p=s0;p<e0;p++){const i=GIT[p],si=SLP[i];
        for(let q=(nb===0?p+1:s1);q<e1;q++){const j=GIT[q];if(si&&SLP[j])continue;
          const ddx=BX[j]-BX[i],ddz=BZ[j]-BZ[i],rr=BR[i]+BR[j]+MG[i]+MG[j];
          if(ddx*ddx+ddz*ddz>rr*rr||Math.abs(BY[j]-BY[i])>rr)continue;
          pairC(i,j,MG[i]+MG[j]);}}
    }
  }
  for(let k=0;k<NL;k++){const i=LIVE[k];if(!SLP[i])worldContacts(i);}
  /* counting sort by height bucket: Gauss-Seidel sweeps bottom-up so a stack is supported in one pass */
  KCNT.fill(0);for(let c=0;c<NC;c++)KCNT[CKEY[c]+1]++;for(let k=1;k<33;k++)KCNT[k]+=KCNT[k-1];
  for(let c=0;c<NC;c++)ORD[KCNT[CKEY[c]]++]=c;
}
