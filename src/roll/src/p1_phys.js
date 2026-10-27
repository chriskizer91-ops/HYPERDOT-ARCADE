/* =====================================================================================
   9a. WORLD + BALL PHYSICS  (metres, seconds, y up, z up the lane away from the player)
   The alley is an inclined plane that turns into a parabolic launch ramp (the hump), a
   gutter slot, then a 30-degree target board carrying ring lips. Ring lips are true tori:
   the closest point on a torus to a sphere centre is found analytically (project onto the
   board plane, push out to the core circle), so rattling around a lip is exact contact
   against a curved tube rather than against a polyline. Pocket holes are open cylinders:
   their rim is a zero-thickness circle, their wall a cylinder, so a ball can teeter on a
   rim, rattle across a hole and drop. A rolling sphere carries linear AND angular velocity;
   every contact applies a normal impulse and a Coulomb friction impulse at the contact
   point, which is what turns skid into roll and side-spin into a curving path.
   ===================================================================================== */
const PH={g:9.81,R:0.04,HW:0.42,ZS:-0.5,ZH0:1.1,ZL:1.4,SLOT:0.11,phi:25*Math.PI/180,VB:0.98,lane:9*Math.PI/180,launch:45*Math.PI/180,
  hL:0.03,rt:0.018,rH:0.05,HOLED:0.13,SUB:8,ZHAND:0.1};
const LS=Math.tan(PH.lane),LK=(Math.tan(PH.launch)-LS)/(2*(PH.ZL-PH.ZH0));
/* lane profile y(z): a straight incline, then a parabola whose slope grows to the launch angle at the lip */
const laneY=z=>z<PH.ZH0?LS*z:LS*z+LK*(z-PH.ZH0)*(z-PH.ZH0);
const laneDY=z=>z<PH.ZH0?LS:LS+2*LK*(z-PH.ZH0);
const Y_LIP=laneY(PH.ZL),ZB0=PH.ZL+PH.SLOT,YB0=Y_LIP-0.08;
const SINP=Math.sin(PH.phi),COSP=Math.cos(PH.phi);
const ZTOP=ZB0+PH.VB*COSP,YTOP=YB0+PH.VB*SINP;
/* board frame: origin at the bottom-centre edge, u across (=x), v up the slope, w out of the board */
const toBoard=(x,y,z,o)=>{const dy=y-YB0,dz=z-ZB0;o[0]=x;o[1]=dy*SINP+dz*COSP;o[2]=dy*COSP-dz*SINP;return o;};
const fromBoard=(u,v,w,o)=>{o[0]=u;o[1]=YB0+v*SINP+w*COSP;o[2]=ZB0+v*COSP-w*SINP;return o;};
/* targets: ring lips are nested circles whose bottoms are a ball-and-a-bit apart (so each crescent
   funnels into its own hole) and whose tops nearly touch. Pockets sit in the top corners. */
const RCOL={10:[70,150,255],20:[60,235,130],30:[255,214,60],40:[255,128,36],50:[255,48,80],100:[255,70,230]};
const RINGS=[],HOLES=[];
{
  /* bottom gaps are a ball plus lip clearance; tops almost touch; ring 10 leaves a free channel
     (wider than a ball) to each side wall so nothing can wedge outside the nest */
  const gap=0.12,top=0.005,r50=0.065,b10=0.12,c50=b10+4*gap+r50;
  const rr=[[50,c50,r50]];
  let bot=c50-r50,tp=c50+r50;
  for(const val of [40,30,20,10]){bot-=gap;tp+=top;rr.push([val,(bot+tp)/2,(tp-bot)/2]);}
  rr.reverse();                                   /* 10,20,30,40,50 */
  for(const [val,v,r] of rr)RINGS.push({val,u:0,v,r,col:RCOL[val],flash:0,glow:0});
  for(let i=0;i<4;i++){const a=RINGS[i],b=RINGS[i+1];HOLES.push({val:a.val,u:0,v:((a.v-a.r)+(b.v-b.r))/2,r:PH.rH,ring:i});}
  HOLES.push({val:50,u:0,v:c50,r:PH.rH,ring:4});
  for(const s of [-1,1]){RINGS.push({val:100,u:s*0.25,v:0.87,r:0.06,col:RCOL[100],flash:0,glow:0});HOLES.push({val:100,u:s*0.25,v:0.87,r:0.046,ring:RINGS.length-1});}
}
/* ---- the ball ---- */
function newBall(){return {px:0,py:0,pz:0,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0,qw:1,qx:0,qy:0,qz:0,st:'hand',t:0,hole:-1,res:null,
  sup:0,supK:0,roll:0,air:0,still:0,onHump:false,launched:false,maxZ:0,sinkT:0,glow:0,firstV:null,firstU:0};}
function spinQ(b,ax,ay,az,ang){const s=Math.sin(ang/2),c=Math.cos(ang/2),w=b.qw,x=b.qx,y=b.qy,z=b.qz;
  b.qw=c*w-s*(ax*x+ay*y+az*z);b.qx=c*x+s*(ax*w+ay*z-az*y);b.qy=c*y+s*(ay*w+az*x-ax*z);b.qz=c*z+s*(az*w+ax*y-ay*x);}
/* impulse response at one contact: n = unit normal out of the surface, pen = penetration depth.
   Returns the closing speed (for sound). Friction impulse per unit mass is capped at mu*jn and
   sized to cancel contact-point slip: for a solid sphere that is 2/7 of the slip speed. */
const IMP={v:0};
function contact(b,nx,ny,nz,pen,e,mu){
  b.px+=nx*pen;b.py+=ny*pen;b.pz+=nz*pen;
  const vn=b.vx*nx+b.vy*ny+b.vz*nz;if(vn>=0)return 0;
  const jn=-(1+(vn<-0.3?e:0))*vn;             /* slow (resting) contacts do not bounce: kills jitter */
  b.vx+=nx*jn;b.vy+=ny*jn;b.vz+=nz*jn;
  const R=PH.R,rx=-nx*R,ry=-ny*R,rz=-nz*R;
  let cx=b.vx+(b.wy*rz-b.wz*ry),cy=b.vy+(b.wz*rx-b.wx*rz),cz=b.vz+(b.wx*ry-b.wy*rx);
  const cn=cx*nx+cy*ny+cz*nz;cx-=nx*cn;cy-=ny*cn;cz-=nz*cn;
  const sl=Math.sqrt(cx*cx+cy*cy+cz*cz);
  if(sl>1e-7){
    let j=sl*(2/7);const jm=mu*jn;if(j>jm)j=jm;
    const jx=-cx/sl*j,jy=-cy/sl*j,jz=-cz/sl*j,k=2.5/(R*R);
    b.vx+=jx;b.vy+=jy;b.vz+=jz;
    b.wx+=(ry*jz-rz*jy)*k;b.wy+=(rz*jx-rx*jz)*k;b.wz+=(rx*jy-ry*jx)*k;
  }
  return -vn;
}
/* rolling resistance + pivot friction while supported by a surface with normal n */
function rollDrag(b,nx,ny,nz,crr,dt){
  const vn=b.vx*nx+b.vy*ny+b.vz*nz,tx=b.vx-nx*vn,ty=b.vy-ny*vn,tz=b.vz-nz*vn,s=Math.sqrt(tx*tx+ty*ty+tz*tz);
  if(s>1e-5){const k=Math.max(0,1-crr*PH.g*dt/s);b.vx=nx*vn+tx*k;b.vy=ny*vn+ty*k;b.vz=nz*vn+tz*k;
    const wn=b.wx*nx+b.wy*ny+b.wz*nz;b.wx=(b.wx-nx*wn)*k+nx*wn*(1-3*dt);b.wy=(b.wy-ny*wn)*k+ny*wn*(1-3*dt);b.wz=(b.wz-nz*wn)*k+nz*wn*(1-3*dt);}
  return s;
}
const BC=[0,0,0],WP=[0,0,0];
/* surface materials: [restitution, friction, rolling resistance] */
const MAT={lane:[.25,.14,.010],board:[.26,.22,.020],lip:[.36,.16,0],wall:[.5,.1,0],rim:[.3,.2,0]};
/* one substep for one ball; events go to ev(kind, speed, ball, extra) */
function stepBall(b,dt,ev){
  const R=PH.R;
  b.vy-=PH.g*dt;b.vx*=1-.03*dt;b.vy*=1-.03*dt;b.vz*=1-.03*dt;
  b.px+=b.vx*dt;b.py+=b.vy*dt;b.pz+=b.vz*dt;
  const wl=Math.sqrt(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz);if(wl>1e-6)spinQ(b,b.wx/wl,b.wy/wl,b.wz/wl,wl*dt);
  let sup=0,supK=0,roll=0,s;
  /* --- lane + hump: closest point on the profile curve (Newton-style foot-point iteration) --- */
  if(b.pz<PH.ZL+R&&b.py<laneY(Math.min(b.pz,PH.ZL))+R*1.5&&b.st!=='sink'){
    let z=b.pz;
    for(let i=0;i<3;i++){const y=laneY(z),d=laneDY(z),il=1/Math.sqrt(1+d*d),nz=-d*il,ny=il,dist=(b.pz-z)*nz+(b.py-y)*ny;z=b.pz-nz*dist;if(z>PH.ZL)z=PH.ZL;if(z<PH.ZS)z=PH.ZS;}
    const dz=b.pz-z,dy=b.py-laneY(z),dist=Math.sqrt(dz*dz+dy*dy);
    if(dist<R&&dist>1e-6&&(dy>0||b.pz>PH.ZL)){
      const ny=dy/dist,nz=dz/dist,m=MAT.lane;s=contact(b,0,ny,nz,R-dist,m[0],m[1]);
      if(s>.6)ev('thud',s,b,0);
      roll=rollDrag(b,0,ny,nz,m[2],dt);sup=1;supK=1;
      if(!b.onHump&&b.pz>PH.ZH0){b.onHump=true;ev('hump',Math.sqrt(b.vz*b.vz+b.vy*b.vy),b,0);}
    }
  }
  if(!b.launched&&b.pz>PH.ZL){b.launched=true;ev('launch',Math.sqrt(b.vz*b.vz+b.vy*b.vy),b,0);}
  /* --- lip face (vertical, faces the board) and board front face (faces the player): the gutter slot --- */
  if(b.py<Y_LIP&&b.pz>PH.ZL&&b.pz<PH.ZL+R){const m=MAT.wall;s=contact(b,0,0,1,PH.ZL+R-b.pz,m[0],m[1]);if(s>.4)ev('knock',s,b,0);}
  if(b.py<YB0&&b.pz<ZB0&&b.pz>ZB0-R){const m=MAT.wall;s=contact(b,0,0,-1,b.pz-(ZB0-R),m[0],m[1]);if(s>.4)ev('knock',s,b,0);}
  /* --- target board --- */
  toBoard(b.px,b.py,b.pz,BC);let u=BC[0],v=BC[1],w=BC[2];
  if(w<R+.08&&w>-PH.HOLED-.1){
    let hole=-1;
    for(let i=0;i<HOLES.length;i++){const h=HOLES[i],du=u-h.u,dv=v-h.v;if(du*du+dv*dv<h.r*h.r){hole=i;break;}}
    if(b.st==='sink')hole=b.hole;
    if(hole>=0){
      /* inside a hole: above the plane the rim circle holds the ball, below it the cylinder wall does */
      const h=HOLES[hole],du=u-h.u,dv=v-h.v,ql=Math.sqrt(du*du+dv*dv)||1e-6,eu=du/ql,evv=dv/ql;
      if(w>0){const dr=ql-h.r,d=Math.sqrt(dr*dr+w*w);
        if(d<R){const nu=dr/d,nw=w/d,nx=nu*eu,ny=nu*evv*SINP+nw*COSP,nz=nu*evv*COSP-nw*SINP,m=MAT.rim;s=contact(b,nx,ny,nz,R-d,m[0],m[1]);if(s>.25)ev('rim',s,b,hole);sup=1;supK=2;}}
      else if(ql+R>h.r){const nx=-eu,ny=-evv*SINP,nz=-evv*COSP,m=MAT.rim;s=contact(b,nx,ny,nz,ql+R-h.r,m[0],m[1]);if(s>.25)ev('rim',s,b,hole);}
      if(b.st==='live'&&w<-R*1.05){b.st='sink';b.hole=hole;b.sinkT=0;ev('dunk',Math.sqrt(b.vx*b.vx+b.vy*b.vy+b.vz*b.vz),b,hole);}
    }else if(v>=0&&v<=PH.VB&&w<R&&w>-R){
      const m=MAT.board;s=contact(b,0,COSP,-SINP,R-w,m[0],m[1]);
      if(s>.5)ev('thud',s,b,1);
      if(b.firstV===null&&b.st==='live'){b.firstV=v;b.firstU=u;}
      roll=rollDrag(b,0,COSP,-SINP,m[2],dt);sup=1;supK=2;
    }else if(v<0&&w>-R){
      /* the board's bottom edge: a straight corner the ball can roll over into the slot */
      const d=Math.sqrt(v*v+w*w);if(d<R&&d>1e-6){const nv=v/d,nw=w/d,m=MAT.wall;s=contact(b,0,nv*SINP+nw*COSP,nv*COSP-nw*SINP,R-d,m[0],m[1]);sup=1;supK=2;if(s>.4)ev('knock',s,b,0);}
    }
    /* --- ring lips: tori lying on the board. Closest point on the core circle = push the in-plane
       offset out to radius r at height hL; then it is a sphere-vs-sphere test with radius R+rt --- */
    if(w<PH.hL+PH.rt+R)for(let i=0;i<RINGS.length;i++){
      const ri=RINGS[i],du=u-ri.u,dv=v-ri.v,ql=Math.sqrt(du*du+dv*dv),lim=R+PH.rt;
      if(Math.abs(ql-ri.r)>lim||ql<1e-6)continue;
      const dr=ql-ri.r,dw=w-PH.hL,d=Math.sqrt(dr*dr+dw*dw);
      if(d<lim){const eu=du/ql,evv=dv/ql,nu=dr/d,nw=dw/d,nx=nu*eu,ny=nu*evv*SINP+nw*COSP,nz=nu*evv*COSP-nw*SINP,m=MAT.lip;
        s=contact(b,nx,ny,nz,lim-d,m[0],m[1]);if(s>.12)ev('lip',s,b,i);if(nw>.5){sup=1;supK=2;}}
    }
  }
  /* --- side walls, back wall, the player's end --- */
  if(b.px>PH.HW-R){s=contact(b,-1,0,0,b.px-(PH.HW-R),MAT.wall[0],MAT.wall[1]);if(s>.3)ev('wall',s,b,0);}
  else if(b.px<-PH.HW+R){s=contact(b,1,0,0,(-PH.HW+R)-b.px,MAT.wall[0],MAT.wall[1]);if(s>.3)ev('wall',s,b,0);}
  if(b.pz>ZTOP-R){s=contact(b,0,0,-1,b.pz-(ZTOP-R),MAT.wall[0],MAT.wall[1]);if(s>.3)ev('back',s,b,0);}
  if(b.pz<PH.ZS+R){contact(b,0,0,1,PH.ZS+R-b.pz,.3,.1);}
  b.sup=sup;b.supK=supK;b.roll=sup?roll:0;b.air=sup?0:b.air+dt;
}
/* sphere-sphere impulse between two live balls (equal mass, e=.8, no friction) */
function ballPair(a,b,ev){
  const dx=b.px-a.px,dy=b.py-a.py,dz=b.pz-a.pz,d2=dx*dx+dy*dy+dz*dz,D=2*PH.R;if(d2>=D*D||d2<1e-10)return;
  const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,nz=dz/d,pen=(D-d)/2;
  a.px-=nx*pen;a.py-=ny*pen;a.pz-=nz*pen;b.px+=nx*pen;b.py+=ny*pen;b.pz+=nz*pen;
  const vr=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny+(b.vz-a.vz)*nz;if(vr>=0)return;
  const j=-(1.8)*vr/2;a.vx-=nx*j;a.vy-=ny*j;a.vz-=nz*j;b.vx+=nx*j;b.vy+=ny*j;b.vz+=nz*j;if(-vr>.2)ev('click',-vr,a,0);
}
/* advance every live ball one simulation tick (PH.SUB substeps) and run outcome detection */
function physTick(balls,dt,ev){
  const h=dt/PH.SUB;
  for(let k=0;k<PH.SUB;k++){
    for(const b of balls)if(b.st==='live'||b.st==='sink'||b.st==='out')stepBall(b,h,ev);
    for(let i=0;i<balls.length;i++){const a=balls[i];if(a.st!=='live')continue;for(let j=i+1;j<balls.length;j++)if(balls[j].st==='live')ballPair(a,balls[j],ev);}
  }
  for(const b of balls){
    if(b.st==='hand')continue;
    b.t+=dt;const n=Math.sqrt(b.qw*b.qw+b.qx*b.qx+b.qy*b.qy+b.qz*b.qz);b.qw/=n;b.qx/=n;b.qy/=n;b.qz/=n;
    if(b.pz>b.maxZ)b.maxZ=b.pz;
    const sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy+b.vz*b.vz);
    if(b.st==='live'){
      /* the slot under the board is split into three bins: the side bins (fed by the side channels) pay 10 */
      if(b.py<YB0-0.07&&b.pz>PH.ZL-.01&&b.pz<ZB0+.01){b.st='out';b.res=Math.abs(b.px)>PH.BIN?'side':'gutter';ev(b.res,sp,b,0);}
      else if(b.vz<-.05&&b.pz<PH.ZH0-.25&&b.maxZ>PH.ZH0-.2&&!b.launched){b.st='out';b.res='short';ev('short',sp,b,0);}
      else if(b.vz<-.05&&b.pz<PH.ZH0-.6&&b.t>.8&&!b.launched){b.st='out';b.res='short';ev('short',sp,b,0);}
      else if(b.launched&&b.vz<-.05&&b.pz<PH.ZH0-.15){b.st='out';b.res='bounce';ev('short',sp,b,1);}
      /* a ball that stops on a lip top gets a nudge (the cabinet "shakes"), and is ruled on after 7 s */
      b.still=sp<.04?b.still+dt:0;
      if(b.still>1.1){b.vx+=(Math.random()-.5)*.3;b.vy+=.05;b.vz-=.12;b.still=0;ev('nudge',0,b,0);}
      if(b.t>9){b.st='out';b.res='gutter';ev('gutter',0,b,0);}
    }else if(b.st==='sink'){b.sinkT+=dt;if(b.sinkT>.5)b.st='gone';}
    else if(b.st==='out'){b.sinkT+=dt;if(b.sinkT>1.6||b.pz<PH.ZS+.08||b.py<YB0-.45)b.st='gone';}
  }
}
/* put a ball on the lane at (x, z) and roll it: speed (m/s), aim (rad, + = right), spin (-1..1 side roll).
   The hand imparts 85% of natural roll, so the ball skids briefly, then friction locks it into rolling. */
function launchBall(b,x,z,speed,aim,spin){
  const ny=Math.cos(PH.lane),nz=-Math.sin(PH.lane);
  b.px=x;b.pz=z;b.py=laneY(z)+PH.R/ny;
  const dx=Math.sin(aim),dz=Math.cos(aim)*Math.cos(PH.lane),dy=Math.cos(aim)*Math.sin(PH.lane);
  b.vx=dx*speed;b.vy=dy*speed;b.vz=dz*speed;
  /* natural roll: w = n x v / R */
  const k=.85/PH.R;b.wx=(ny*b.vz-nz*b.vy)*k;b.wy=(nz*b.vx)*k;b.wz=(-ny*b.vx)*k;
  /* side roll about the travel direction; friction turns it into sideways drift (a curve) */
  const sw=-spin*PH.SPIN;b.wx+=dx*sw;b.wy+=dy*sw;b.wz+=dz*sw;
  Object.assign(b,{st:'live',t:0,hole:-1,res:null,onHump:false,launched:false,maxZ:z,still:0,sinkT:0,air:0,firstV:null});
}
PH.SPIN=30;PH.BIN=0.25;
