/*==CORE==*/
/* =====================================================================================
   9. PHYSICS — one ball and ten rigid pins, on the CPU at 240 Hz.
      Units are metres, kilograms and seconds. x runs across the lane (+x = the bowler's right),
      y is up, z runs down the lane (foul line z=0, head pin z=18.288 = 60 ft).
      Solver: sequential impulses with accumulated clamping, friction cones, restitution,
      speculative contacts for the gaps, Baumgarte for leftover overlap, and sleeping so a
      rack stands perfectly still until something touches it.
      Pins are axisymmetric, so a pin's whole inertia tensor is described by its axis a:
        I^-1 v = v/It + (1/Ia - 1/It)(a.v)a
      and every collision capsule lies on that axis, so shapes never need a full matrix.
   ===================================================================================== */
const GV=9.81,HZ=240,ITER=10;
/* lane geometry (USBC sizes): half lane width, gutter channel axis/radius, kickback walls, deck, pit */
const LN={hw:.527,gx:.644,gy:.12,gr:.168,wall:.762,deck:17.95,pit:19.156,head:18.288,cush:20.05,oil:12.2};
const PM=1.53,PIT=.0155,PIA=.0017,PCOM=.147,PBC=.043,PBR=.197;  /* pin: mass, inertia (transverse, axial), CoM height, bound centre/radius */
const PITI=1/PIT,PIAI=1/PIA;
const BR=.1085,BM=6.8,BI=BM*.0635*.0635,BII=1/BI;              /* ball: 8.5 in, 15 lb, radius of gyration 2.5 in */
/* the pin as a capsule stack along its axis: [y0,y1,radius] measured from the base, stored relative to the CoM */
const CAPS=[[.05,.05,.045],[.085,.145,.0605],[.175,.195,.05],[.222,.222,.037],[.25,.30,.0245],[.349,.349,.032]].map(c=>[c[0]-PCOM,c[1]-PCOM,c[2]]);
const NRING=6,RR=.0258,RCS=[],RSN=[];for(let k=0;k<NRING;k++){RCS.push(Math.cos(k/NRING*TAU));RSN.push(Math.sin(k/NRING*TAU));}
/* pin spots 1..10: 12 in triangle, rows 10.39 in apart. Index 0 is the head pin, 6 the 7-pin, 9 the 10-pin. */
const SPOTS=[[0,0],[-1,1],[1,1],[-2,2],[0,2],[2,2],[-3,3],[-1,3],[1,3],[3,3]].map(([c,r])=>[c*.1524,LN.head+r*.26397]);
/* contact materials: restitution e, friction mu (b=ball p=pin f=floor w=kickback) */
const PHY={ebp:.68,mbp:.12,epp:.42,mpp:.16,epf:.28,mpf:.3,ew:.55,mw:.2,bf:.12};
const T_BL=1,T_BG=2,T_BP=3,T_PP=4,T_PF=5,T_PG=6,T_PW=7,T_BW=8,T_CU=9,T_SW=10;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

function mkBody(pin){return {pin,x:0,y:0,z:0,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0,qw:1,qx:0,qy:0,qz:0,
  e0x:1,e0y:0,e0z:0,ax:0,ay:1,az:0,e2x:0,e2y:0,e2z:1,im:pin?1/PM:1/BM,on:false,sleep:false,still:0,kin:false,gone:false,floor:0,gut:0,id:0,hit:0};}
function mkWorld(){const P={ball:mkBody(false),pins:[],sw:{on:false,z:0,y:0,vz:0,vy:0},ev:[],nev:0,t:0};
  for(let i=0;i<10;i++){const p=mkBody(true);p.id=i;P.pins.push(p);}for(let i=0;i<48;i++)P.ev.push({tag:0,s:0,x:0,y:0,z:0,a:null,b:null});return P;}
/* quaternion -> rotation matrix columns (local x, local y = the pin axis, local z) */
function syncRot(b){const w=b.qw,x=b.qx,y=b.qy,z=b.qz;
  b.e0x=1-2*(y*y+z*z);b.e0y=2*(x*y+w*z);b.e0z=2*(x*z-w*y);
  b.ax=2*(x*y-w*z);b.ay=1-2*(x*x+z*z);b.az=2*(y*z+w*x);
  b.e2x=2*(x*z+w*y);b.e2y=2*(y*z-w*x);b.e2z=1-2*(x*x+y*y);}
let IX=0,IY=0,IZ=0;
function iinv(b,x,y,z){if(b.pin){const k=(x*b.ax+y*b.ay+z*b.az)*(PIAI-PITI);IX=x*PITI+k*b.ax;IY=y*PITI+k*b.ay;IZ=z*PITI+k*b.az;}else{IX=x*BII;IY=y*BII;IZ=z*BII;}}
function wake(b){if(b.sleep){b.sleep=false;b.still=0;}}
/* oil: a house shot. ~40 ft of slick oil (mu ~.035) heavier in the middle, a dry back end (mu ~.2);
   the outside boards dry out earlier, so a ball that drifts wide grabs sooner. */
function laneMu(x,z){if(z<0||z>LN.deck)return .2;const cr=sstep(.2,.46,Math.abs(x)),oil=.03+.035*cr,dry=sstep(LN.oil-1.1,LN.oil+1.1,z+cr*2.2);return oil+(.21-oil)*dry;}

/* ---------- contacts: a preallocated pool, filled every substep ---------- */
const CP=[];for(let i=0;i<640;i++)CP.push({A:null,B:null,rax:0,ray:0,raz:0,rbx:0,rby:0,rbz:0,nx:0,ny:0,nz:0,px:0,py:0,pz:0,d:0,e:0,mu:0,kx:0,ky:0,kz:0,tag:0,
  mn:0,m1:0,m2:0,t1x:0,t1y:0,t1z:0,t2x:0,t2y:0,t2z:0,bias:0,jn:0,jt1:0,jt2:0});
let NC=0;const SLOPC=.003;
function addC(A,B,px,py,pz,nx,ny,nz,d,e,mu,kx,ky,kz,tag){if(NC>=CP.length)return;const c=CP[NC++];
  c.A=A;c.B=B;c.px=px;c.py=py;c.pz=pz;c.rax=px-A.x;c.ray=py-A.y;c.raz=pz-A.z;
  if(B){c.rbx=px-B.x;c.rby=py-B.y;c.rbz=pz-B.z;}c.nx=nx;c.ny=ny;c.nz=nz;c.d=d;c.e=e;c.mu=mu;c.kx=kx;c.ky=ky;c.kz=kz;c.tag=tag;}
/* a sphere (or a point, r=0) against the static alley: lane / deck plane, gutter channels (concave cylinders),
   the lane edges, the pit edge, kickback walls, the pit cushion, and the pinsetter's sweep bar when it is down */
function sphereWorld(b,cx,cy,cz,r,ball,P){
  const ax=cx<0?-cx:cx,sx=cx<0?-1:1;
  if(cz<LN.pit){
    if(ax<LN.hw){const d=cy-r;if(d<SLOPC){b.floor=1;addC(b,null,cx,cy-r,cz,0,1,0,-d,ball?PHY.bf:PHY.epf,ball?laneMu(cx,cz):PHY.mpf,0,0,0,ball?T_BL:T_PF);}}
    else if(ax<LN.wall){
      const dx=cx-sx*LN.gx,dy=cy-LN.gy,dl=Math.sqrt(dx*dx+dy*dy),lim=LN.gr-r;
      if(cy<LN.gy&&dl>lim-SLOPC){const ux=dx/dl,uy=dy/dl;b.floor=1;b.gut=1;addC(b,null,sx*LN.gx+ux*LN.gr,LN.gy+uy*LN.gr,cz,-ux,-uy,0,dl-lim,.15,ball?.08:.3,0,0,0,ball?T_BG:T_PG);}
      const ex=cx-sx*LN.hw,el=Math.sqrt(ex*ex+cy*cy);if(el<r+SLOPC&&el>1e-6){b.floor=1;addC(b,null,sx*LN.hw,0,cz,ex/el,cy/el,0,r-el,.15,.2,0,0,0,ball?T_BG:T_PF);}
    }
  }else if(ax<LN.hw){const ez=cz-LN.pit,el=Math.sqrt(cy*cy+ez*ez);if(el<r+SLOPC&&el>1e-6&&cy>-r)addC(b,null,cx,0,LN.pit,0,cy/el,ez/el,r-el,.2,.25,0,0,0,ball?T_BL:T_PF);}
  if(LN.wall-ax<r+SLOPC&&r>0)addC(b,null,sx*LN.wall,cy,cz,-sx,0,0,r-(LN.wall-ax),PHY.ew,PHY.mw,0,0,0,ball?T_BW:T_PW);
  if(LN.cush-cz<r+SLOPC&&r>0)addC(b,null,cx,cy,LN.cush,0,0,-1,r-(LN.cush-cz),.05,.6,0,0,0,T_CU);
  const s=P.sw;if(s.on&&r>0){const qx=clamp(cx,-.8,.8),qy=clamp(cy,s.y,s.y+.1),qz=clamp(cz,s.z-.03,s.z+.03),dx=cx-qx,dy=cy-qy,dz=cz-qz,d2=dx*dx+dy*dy+dz*dz;
    if(d2<r*r){if(d2>1e-10){const d=Math.sqrt(d2);addC(b,null,qx,qy,qz,dx/d,dy/d,dz/d,r-d,0,.2,0,s.vy,s.vz,T_SW);}else addC(b,null,cx,cy,s.z+.03,0,0,1,s.z+.03-cz+r,0,.2,0,s.vy,s.vz,T_SW);}}
}
function pinWorld(p,P){
  for(let i=0;i<CAPS.length;i++){const c=CAPS[i];sphereWorld(p,p.x+p.ax*c[0],p.y+p.ay*c[0],p.z+p.az*c[0],c[2],false,P);
    if(c[1]!==c[0])sphereWorld(p,p.x+p.ax*c[1],p.y+p.ay*c[1],p.z+p.az*c[1],c[2],false,P);}
  /* the flat base: a ring of points. This is what lets a pin stand, rock on its edge and wobble. */
  for(let k=0;k<NRING;k++){const u=RR*RCS[k],w=RR*RSN[k];
    sphereWorld(p,p.x+p.e0x*u-p.ax*PCOM+p.e2x*w,p.y+p.e0y*u-p.ay*PCOM+p.e2y*w,p.z+p.e0z*u-p.az*PCOM+p.e2z*w,0,false,P);}
}
/* ball against each capsule: the closest point on a capsule axis is just a clamped projection */
function ballPin(b,p){
  const cx=p.x+p.ax*PBC,cy=p.y+p.ay*PBC,cz=p.z+p.az*PBC,qx=b.x-cx,qy=b.y-cy,qz=b.z-cz,R=BR+PBR+SLOPC;
  if(qx*qx+qy*qy+qz*qz>R*R)return;
  const h=(b.x-p.x)*p.ax+(b.y-p.y)*p.ay+(b.z-p.z)*p.az;
  for(let i=0;i<CAPS.length;i++){const c=CAPS[i],t=h<c[0]?c[0]:h>c[1]?c[1]:h,sx=p.x+p.ax*t,sy=p.y+p.ay*t,sz=p.z+p.az*t;
    let nx=b.x-sx,ny=b.y-sy,nz=b.z-sz;const d2=nx*nx+ny*ny+nz*nz,rs=BR+c[2];
    if(d2>=(rs+SLOPC)*(rs+SLOPC)||d2<1e-12)continue;const d=Math.sqrt(d2);nx/=d;ny/=d;nz/=d;
    wake(p);p.hit=1;addC(b,p,sx+nx*c[2],sy+ny*c[2],sz+nz*c[2],nx,ny,nz,rs-d,PHY.ebp,PHY.mbp,0,0,0,T_BP);}
}
/* closest points between two segments (Ericson): results in SS, ST */
let SS=0,ST=0;
function segseg(px,py,pz,d1x,d1y,d1z,qx,qy,qz,d2x,d2y,d2z){
  const rx=px-qx,ry=py-qy,rz=pz-qz,a=d1x*d1x+d1y*d1y+d1z*d1z,e=d2x*d2x+d2y*d2y+d2z*d2z,f=d2x*rx+d2y*ry+d2z*rz;let s,t;
  if(a<1e-9){s=0;t=e<1e-9?0:clamp(f/e,0,1);}
  else{const c=d1x*rx+d1y*ry+d1z*rz;if(e<1e-9){t=0;s=clamp(-c/a,0,1);}
    else{const bb=d1x*d2x+d1y*d2y+d1z*d2z,dn=a*e-bb*bb;s=dn>1e-12?clamp((bb*f-c*e)/dn,0,1):0;t=(bb*s+f)/e;
      if(t<0){t=0;s=clamp(-c/a,0,1);}else if(t>1){t=1;s=clamp((bb-c)/a,0,1);}}}
  SS=s;ST=t;
}
function pinPin(A,B){
  const dx=A.x+A.ax*PBC-B.x-B.ax*PBC,dy=A.y+A.ay*PBC-B.y-B.ay*PBC,dz=A.z+A.az*PBC-B.z-B.az*PBC;
  if(dx*dx+dy*dy+dz*dz>4*PBR*PBR)return;
  let dyn=true;
  if(A.sleep||B.sleep){if(A.sleep&&B.sleep)return;const M=A.sleep?B:A,Sl=A.sleep?A:B;
    /* a moving pin wakes a sleeper; a pin that is only settling leans on it as if it were the floor */
    if(M.vx*M.vx+M.vy*M.vy+M.vz*M.vz>.02||M.wx*M.wx+M.wy*M.wy+M.wz*M.wz>2)wake(Sl);else{dyn=false;A=M;B=Sl;}}
  for(let i=0;i<CAPS.length;i++){const ca=CAPS[i],la=ca[1]-ca[0],pax=A.x+A.ax*ca[0],pay=A.y+A.ay*ca[0],paz=A.z+A.az*ca[0],dax=A.ax*la,day=A.ay*la,daz=A.az*la;
    for(let j=0;j<CAPS.length;j++){const cb=CAPS[j],lb=cb[1]-cb[0],pbx=B.x+B.ax*cb[0],pby=B.y+B.ay*cb[0],pbz=B.z+B.az*cb[0],dbx=B.ax*lb,dby=B.ay*lb,dbz=B.az*lb;
      const rs=ca[2]+cb[2],mx=pax+dax*.5-pbx-dbx*.5,my=pay+day*.5-pby-dby*.5,mz=paz+daz*.5-pbz-dbz*.5,lr=rs+(la+lb)*.5+SLOPC;
      if(mx*mx+my*my+mz*mz>lr*lr)continue;
      segseg(pax,pay,paz,dax,day,daz,pbx,pby,pbz,dbx,dby,dbz);
      const qax=pax+dax*SS,qay=pay+day*SS,qaz=paz+daz*SS,qbx=pbx+dbx*ST,qby=pby+dby*ST,qbz=pbz+dbz*ST;
      let nx=qax-qbx,ny=qay-qby,nz=qaz-qbz;const d2=nx*nx+ny*ny+nz*nz;if(d2>=(rs+SLOPC)*(rs+SLOPC)||d2<1e-12)continue;
      const d=Math.sqrt(d2);nx/=d;ny/=d;nz/=d;addC(A,dyn?B:null,qbx+nx*cb[2],qby+ny*cb[2],qbz+nz*cb[2],nx,ny,nz,rs-d,PHY.epp,PHY.mpp,0,0,0,T_PP);}}
}
/* ---------- the impulse solver ---------- */
let RVX=0,RVY=0,RVZ=0;
function relv(c){const A=c.A,B=c.B;RVX=A.vx+A.wy*c.raz-A.wz*c.ray;RVY=A.vy+A.wz*c.rax-A.wx*c.raz;RVZ=A.vz+A.wx*c.ray-A.wy*c.rax;
  if(B){RVX-=B.vx+B.wy*c.rbz-B.wz*c.rby;RVY-=B.vy+B.wz*c.rbx-B.wx*c.rbz;RVZ-=B.vz+B.wx*c.rby-B.wy*c.rbx;}else{RVX-=c.kx;RVY-=c.ky;RVZ-=c.kz;}}
/* effective mass along n: 1 / (1/mA + (rA x n).IA^-1.(rA x n) + same for B) */
function kInv(c,nx,ny,nz){const A=c.A,B=c.B;let cx=c.ray*nz-c.raz*ny,cy=c.raz*nx-c.rax*nz,cz=c.rax*ny-c.ray*nx;iinv(A,cx,cy,cz);let k=A.im+cx*IX+cy*IY+cz*IZ;
  if(B){cx=c.rby*nz-c.rbz*ny;cy=c.rbz*nx-c.rbx*nz;cz=c.rbx*ny-c.rby*nx;iinv(B,cx,cy,cz);k+=B.im+cx*IX+cy*IY+cz*IZ;}return 1/k;}
function imp(c,px,py,pz){const A=c.A,B=c.B;A.vx+=px*A.im;A.vy+=py*A.im;A.vz+=pz*A.im;iinv(A,c.ray*pz-c.raz*py,c.raz*px-c.rax*pz,c.rax*py-c.ray*px);A.wx+=IX;A.wy+=IY;A.wz+=IZ;
  if(B){B.vx-=px*B.im;B.vy-=py*B.im;B.vz-=pz*B.im;iinv(B,c.rby*pz-c.rbz*py,c.rbz*px-c.rbx*pz,c.rbx*py-c.rby*px);B.wx-=IX;B.wy-=IY;B.wz-=IZ;}}
function prep(c,dt,P){
  relv(c);const vn=RVX*c.nx+RVY*c.ny+RVZ*c.nz;c.mn=kInv(c,c.nx,c.ny,c.nz);
  let tx=RVX-vn*c.nx,ty=RVY-vn*c.ny,tz=RVZ-vn*c.nz,tl=Math.sqrt(tx*tx+ty*ty+tz*tz);
  if(tl<1e-7){if(Math.abs(c.nx)<.9){tx=0;ty=c.nz;tz=-c.ny;}else{tx=-c.nz;ty=0;tz=c.nx;}tl=Math.sqrt(tx*tx+ty*ty+tz*tz);}
  tx/=tl;ty/=tl;tz/=tl;c.t1x=tx;c.t1y=ty;c.t1z=tz;c.t2x=c.ny*tz-c.nz*ty;c.t2y=c.nz*tx-c.nx*tz;c.t2z=c.nx*ty-c.ny*tx;
  c.m1=kInv(c,tx,ty,tz);c.m2=kInv(c,c.t2x,c.t2y,c.t2z);
  let bias=0;
  if(c.d<0)bias=c.d/dt;                                  /* speculative: the gap may close this step, no further */
  else{if(vn<-.4)bias=-c.e*vn;const pb=Math.min(.6,(c.d-.0012)*.22/dt);if(pb>bias)bias=pb;}
  c.bias=bias;c.jn=0;c.jt1=0;c.jt2=0;
  if(vn<-.35&&c.d>-.002&&P.nev<P.ev.length){const e=P.ev[P.nev++];e.tag=c.tag;e.s=-vn;e.x=c.px;e.y=c.py;e.z=c.pz;e.a=c.A;e.b=c.B;}
}
function solveC(c){
  relv(c);const vn=RVX*c.nx+RVY*c.ny+RVZ*c.nz;const j0=c.jn;let j=j0+(c.bias-vn)*c.mn;if(j<0)j=0;c.jn=j;const l=j-j0;
  if(l!==0)imp(c,l*c.nx,l*c.ny,l*c.nz);
  if(c.mu>0&&(j>0||c.jt1!==0||c.jt2!==0)){relv(c);
    let j1=c.jt1-(RVX*c.t1x+RVY*c.t1y+RVZ*c.t1z)*c.m1,j2=c.jt2-(RVX*c.t2x+RVY*c.t2y+RVZ*c.t2z)*c.m2;
    const lim=c.mu*j,q=j1*j1+j2*j2;if(q>lim*lim){const s=q>0?lim/Math.sqrt(q):0;j1*=s;j2*=s;}
    const d1=j1-c.jt1,d2=j2-c.jt2;c.jt1=j1;c.jt2=j2;imp(c,d1*c.t1x+d2*c.t2x,d1*c.t1y+d2*c.t2y,d1*c.t1z+d2*c.t2z);}
}
function integ(b,dt){b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
  const wx=b.wx,wy=b.wy,wz=b.wz,qw=b.qw,qx=b.qx,qy=b.qy,qz=b.qz,h=.5*dt;     /* dq = 1/2 (0,w) q */
  b.qw=qw+h*(-wx*qx-wy*qy-wz*qz);b.qx=qx+h*(wx*qw+wy*qz-wz*qy);b.qy=qy+h*(wy*qw+wz*qx-wx*qz);b.qz=qz+h*(wz*qw+wx*qy-wy*qx);
  const n=1/Math.sqrt(b.qw*b.qw+b.qx*b.qx+b.qy*b.qy+b.qz*b.qz);b.qw*=n;b.qx*=n;b.qy*=n;b.qz*=n;syncRot(b);}
/* one substep of the whole world */
function physStep(P,dt){
  NC=0;const B=P.ball,pins=P.pins,bl=B.on&&!B.kin;P.t+=dt;
  if(bl){B.vy-=GV*dt;B.floor=0;B.gut=0;}
  for(let i=0;i<10;i++){const p=pins[i];if(p.on&&!p.kin&&!p.sleep){p.vy-=GV*dt;p.floor=0;}}
  if(bl)sphereWorld(B,B.x,B.y,B.z,BR,true,P);
  for(let i=0;i<10;i++){const p=pins[i];if(p.on&&!p.kin&&!p.sleep)pinWorld(p,P);}
  if(bl)for(let i=0;i<10;i++){const p=pins[i];if(p.on&&!p.kin)ballPin(B,p);}
  for(let i=0;i<10;i++){const a=pins[i];if(!a.on||a.kin)continue;for(let j=i+1;j<10;j++){const b=pins[j];if(b.on&&!b.kin)pinPin(a,b);}}
  for(let k=0;k<NC;k++)prep(CP[k],dt,P);
  for(let it=0;it<ITER;it++)for(let k=0;k<NC;k++)solveC(CP[k]);
  if(bl){integ(B,dt);if(B.y<-.22||B.z>LN.cush+.2)B.on=false;}
  for(let i=0;i<10;i++){const p=pins[i];if(!p.on||p.kin||p.sleep)continue;
    const dm=p.floor?1-dt*.9:1-dt*.04;p.wx*=dm;p.wy*=dm;p.wz*=dm;
    integ(p,dt);
    if(p.y<-.1||p.z>LN.cush){p.on=false;p.gone=true;continue;}
    const v2=p.vx*p.vx+p.vy*p.vy+p.vz*p.vz,w2=p.wx*p.wx+p.wy*p.wy+p.wz*p.wz;
    if(v2<.003&&w2<.45){p.still+=dt;if(p.still>.3){p.sleep=true;p.vx=p.vy=p.vz=p.wx=p.wy=p.wz=0;}}else p.still=0;}
}
/* rack helpers */
function placePin(p,x,y,z,jit){p.x=x+(jit?(Math.random()-.5)*.003:0);p.y=y+PCOM;p.z=z+(jit?(Math.random()-.5)*.003:0);p.vx=p.vy=p.vz=p.wx=p.wy=p.wz=0;
  const a=jit?Math.random()*TAU:0;p.qw=Math.cos(a/2);p.qx=0;p.qy=Math.sin(a/2);p.qz=0;syncRot(p);p.on=true;p.gone=false;p.sleep=true;p.kin=false;p.still=0;p.hit=0;}
function rackAll(P,jit){for(let i=0;i<10;i++)placePin(P.pins[i],SPOTS[i][0],0,SPOTS[i][1],jit);}
function pinUp(p){return p.on&&!p.gone&&!p.kin&&p.ay>.94&&p.y-PCOM*p.ay<.02&&p.y-PCOM*p.ay>-.01&&Math.abs(p.x)<LN.hw&&p.z<LN.pit;}
function standMask(P){let m=0;for(let i=0;i<10;i++)if(pinUp(P.pins[i]))m|=1<<i;return m;}
function settled(P){for(const p of P.pins)if(p.on&&!p.kin&&!p.sleep)return false;return true;}
/* release: speed (m/s), angle (rad, + toward the right), spin in -1..1 (+ hooks right), rev rate (rad/s).
   The rotation splits into forward roll about (dz,0,-dx) and side rotation about the travel direction;
   the side part is what the dry back end turns into hook. */
function launch(P,x0,ang,spd,spin,revs){const b=P.ball;b.on=true;b.kin=false;b.sleep=false;b.gone=false;
  b.x=x0;b.y=BR+.025;b.z=.35;const dx=Math.sin(ang),dz=Math.cos(ang);b.vx=spd*dx;b.vy=-.35;b.vz=spd*dz;
  const phi=Math.min(1,Math.abs(spin))*1.1,sg=spin<0?-1:1,c=Math.cos(phi)*revs,s=Math.sin(phi)*revs*sg;
  b.wx=c*dz-s*dx;b.wy=0;b.wz=-c*dx-s*dz;b.qw=1;b.qx=b.qy=b.qz=0;syncRot(b);}

/* =====================================================================================
   10. SCORING — pure functions over the list of rolls (pins knocked per ball).
   ===================================================================================== */
const sym=n=>n===0?'-':String(n);
function sheet(r){
  const fr=[];let i=0,cum=0,ok=true;
  for(let f=0;f<10;f++){const a=r[i],b=r[i+1],c=r[i+2],F={m:[],t:null};fr.push(F);
    if(a==null){ok=false;continue;}
    if(f<9){
      if(a===10){F.m=['','X'];i+=1;if(ok&&b!=null&&c!=null){cum+=10+b+c;F.t=cum;}else ok=false;}
      else{F.m=[sym(a)];if(b==null){ok=false;i+=1;continue;}i+=2;
        if(a+b===10){F.m.push('/');if(ok&&c!=null){cum+=10+c;F.t=cum;}else ok=false;}
        else{F.m.push(sym(b));if(ok){cum+=a+b;F.t=cum;}}}
    }else{
      F.m=[a===10?'X':sym(a)];
      if(b!=null)F.m.push(a===10?(b===10?'X':sym(b)):(a+b===10?'/':sym(b)));
      if(c!=null)F.m.push(a===10?(b===10?(c===10?'X':sym(c)):(b+c===10?'/':sym(c))):(c===10?'X':sym(c)));
      const need=(a===10||(b!=null&&a+b===10))?3:2,have=1+(b!=null)+(c!=null);
      if(ok&&have>=need){cum+=a+b+(c||0);F.t=cum;}else ok=false;
    }
  }
  return {fr,total:cum};
}
/* where the game stands before the next roll: frame f (0..9), ball b in that frame, pins up (left), fresh rack?, over? */
function rackState(r){
  let f=0,b=0,left=10,first=0,second=0;
  for(const k of r){
    if(f<9){if(b===0){if(k===10){f++;left=10;}else{b=1;left=10-k;}}else{f++;b=0;left=10;}}
    else if(b===0){first=k;b=1;left=k===10?10:10-k;}
    else if(b===1){second=k;if(first===10){b=2;left=k===10?10:10-k;}else if(first+k===10){b=2;left=10;}else return {f:9,b:2,left:0,fresh:false,over:true};}
    else return {f:9,b:3,left:0,fresh:false,over:true};
  }
  return {f,b,left,fresh:left===10,over:false};
}
/*==/CORE==*/
