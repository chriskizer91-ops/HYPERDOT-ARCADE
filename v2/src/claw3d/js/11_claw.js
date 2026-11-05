/* =====================================================================================
   11. THE CLAW: gantry carriage -> winch cable -> head (a 3-D pendulum) -> 2 or 3 hooked prongs.
   Each prong hinges on the head, an upper arm of L1 at angle A0+phi from straight down, then a hook of L2 bent
   inward by HOOK. phi is the opening (small = closed). Every prong angle is a heavy degree of freedom driven by a
   geared position servo: it closes at its rated speed, and when a plush stops it, it squeezes with a force set by
   this credit's strength S and nothing else. Every contact pushes back on the plush, on the head and, through its
   lever arm, on the prong; so a weak claw is pried open by a heavy toy, the squeeze sets the normal force and the
   normal force sets how much friction can hold. Same honest rule as the 2-D original.
   ===================================================================================== */
const CS={npr:3,piv:.032,vh:.012,L1:.12,L2:.055,A0:.2,HOOK:1.55,RC:.008,RH:.042,
  MHI:1/1.3,IPI:1100,VCL:.0055,VOP:.01,DM:.0055,KM:.35,PHMIN:.04,PHMAX:.98,MAXPEN:.006,mu:1,
  GY:.95,LMIN:.12,LMAX:.9,home:[-.33,.23],edge:.07};
const CS0=Object.assign({},CS);   /* the defaults; each machine overrides what it needs */
const CL={gx:0,gz:0,gvx:0,gvz:0,hx:0,hy:0,hz:0,ox:0,oy:0,oz:0,L:.12,winch:0,
  ph:new Float64Array(3),oph:new Float64Array(3),pt:new Float64Array(3),motor:-1,S:1,
  ux:0,uy:1,uz:0,slack:0,touch:0,cnt:0,cap:0,dem:0,load:0,grip:0};
function clawReset(){
  const h=CS.home;Object.assign(CL,{gx:h[0],gz:h[1],gvx:0,gvz:0,hx:h[0],hy:CS.GY-CS.LMIN,hz:h[1],ox:h[0],oy:CS.GY-CS.LMIN,oz:h[1],L:CS.LMIN,winch:0,motor:-1,ux:0,uy:1,uz:0});
  for(let s=0;s<3;s++){CL.ph[s]=CL.oph[s]=CL.pt[s]=CS.PHMAX*.6;}
}
/* prong frame: for prong s, its outward direction e (perpendicular to the claw's up axis u) */
const PE=new Float64Array(9),PK=new Float64Array(9);   // e and the opening axis k = e x u, per prong
const PG=new Float64Array(27);                           // per prong: hinge, elbow, tip (world)
function prongAngle(s){return CS.npr===2?(s?Math.PI:0):Math.PI/2+s*TAU/3;}
function clawFrame(){
  const ux=CL.ux,uy=CL.uy,uz=CL.uz;
  /* reference across: world x projected off u */
  let r0x=1-ux*ux,r0y=-ux*uy,r0z=-ux*uz;const l=Math.hypot(r0x,r0y,r0z)||1;r0x/=l;r0y/=l;r0z/=l;
  const r1x=uy*r0z-uz*r0y,r1y=uz*r0x-ux*r0z,r1z=ux*r0y-uy*r0x;
  for(let s=0;s<CS.npr;s++){const a=prongAngle(s),c=Math.cos(a),sn=Math.sin(a),o=s*3;
    const ex=r0x*c+r1x*sn,ey=r0y*c+r1y*sn,ez=r0z*c+r1z*sn;PE[o]=ex;PE[o+1]=ey;PE[o+2]=ez;
    PK[o]=ey*uz-ez*uy;PK[o+1]=ez*ux-ex*uz;PK[o+2]=ex*uy-ey*ux;
    const a1=CS.A0+CL.ph[s],a2=a1-CS.HOOK,g=s*9;
    const hx=CL.hx+ex*CS.piv-ux*CS.vh,hy=CL.hy+ey*CS.piv-uy*CS.vh,hz=CL.hz+ez*CS.piv-uz*CS.vh;
    const s1=Math.sin(a1)*CS.L1,c1=Math.cos(a1)*CS.L1,s2=Math.sin(a2)*CS.L2,c2=Math.cos(a2)*CS.L2;
    PG[g]=hx;PG[g+1]=hy;PG[g+2]=hz;
    PG[g+3]=hx+ex*s1-ux*c1;PG[g+4]=hy+ey*s1-uy*c1;PG[g+5]=hz+ez*s1-uz*c1;
    PG[g+6]=PG[g+3]+ex*s2-ux*c2;PG[g+7]=PG[g+4]+ey*s2-uy*c2;PG[g+8]=PG[g+5]+ez*s2-uz*c2;}
}
function clawIntegrate(){
  const vx=(CL.hx-CL.ox)*.9975,vy=(CL.hy-CL.oy)*.9975,vz=(CL.hz-CL.oz)*.9975;
  CL.ox=CL.hx;CL.oy=CL.hy;CL.oz=CL.hz;CL.hx+=vx;CL.hy+=vy-GRAV*H2;CL.hz+=vz;
  CL.L=clamp(CL.L+CL.winch*HS,CS.LMIN,CS.LMAX);
  /* the cable only pulls: inextensible when taut, slack when the claw rests on the heap */
  const dx=CL.hx-CL.gx,dy=CL.hy-CS.GY,dz=CL.hz-CL.gz,d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-9;CL.slack=CL.L-d;
  if(d>CL.L){const k=CL.L/d;CL.hx=CL.gx+dx*k;CL.hy=CS.GY+dy*k;CL.hz=CL.gz+dz*k;}
  /* the claw hangs along the cable (less so when the cable is slack and it sits on the pile) */
  let ux=-dx/d,uy=-dy/d,uz=-dz/d;const tk=CL.slack>.01*UNIT?.35:1;ux*=tk;uz*=tk;uy=1-(1-uy)*tk;
  CL.ux+=(ux-CL.ux)*.25;CL.uy+=(uy-CL.uy)*.25;CL.uz+=(uz-CL.uz)*.25;const ul=Math.hypot(CL.ux,CL.uy,CL.uz);CL.ux/=ul;CL.uy/=ul;CL.uz/=ul;
  /* prong servos: the set-point sweeps at the rated speed but may lead the real prong by at most S*DM;
     a stiff spring (KM) pulls the prong to it. Free, a prong closes at rated speed; stalled, it squeezes with S. */
  for(let s=0;s<CS.npr;s++){const v=(CL.ph[s]-CL.oph[s])*.85;CL.oph[s]=CL.ph[s];CL.ph[s]+=v;
    if(CL.motor>0)CL.pt[s]=Math.max(CS.PHMIN,CL.pt[s]-CS.VCL,CL.ph[s]-CL.S*CS.DM);
    else if(CL.motor<0)CL.pt[s]=Math.min(CS.PHMAX,CL.pt[s]+CS.VOP,CL.ph[s]+CS.DM);
    CL.ph[s]+=(CL.pt[s]-CL.ph[s])*CS.KM;
    if(CL.ph[s]<CS.PHMIN){CL.ph[s]=CS.PHMIN;CL.oph[s]=CS.PHMIN;}else if(CL.ph[s]>CS.PHMAX){CL.ph[s]=CS.PHMAX;CL.oph[s]=CS.PHMAX;}}
}
let CCAP=0,CDEM=0,CCNT=0,CDHX=0,CDHY=0,CDHZ=0;
/* one prong contact on ball i: c = contact on the prong (world), n = normal from prong into ball, pen = depth */
function prongHit(b,i,s,cx,cy,cz,nx,ny,nz,pen,mu){
  if(pen>CS.MAXPEN)pen=CS.MAXPEN;
  const o=s*3,g=s*9,rx=cx-PG[g],ry=cy-PG[g+1],rz=cz-PG[g+2];
  /* how the contact point moves when the prong opens: k x r */
  const kx=PK[o+1]*rz-PK[o+2]*ry,ky=PK[o+2]*rx-PK[o]*rz,kz=PK[o]*ry-PK[o+1]*rx,ra=nx*kx+ny*ky+nz*kz;
  const wp=PW[i],l=pen/(wp+CS.MHI+ra*ra*CS.IPI);
  PX[i]+=nx*l*wp;PY[i]+=ny*l*wp;PZ[i]+=nz*l*wp;
  CL.hx-=nx*l*CS.MHI;CL.hy-=ny*l*CS.MHI;CL.hz-=nz*l*CS.MHI;CL.ph[s]-=ra*l*CS.IPI;
  /* Coulomb friction against the moving prong surface */
  const om=CL.ph[s]-CL.oph[s],svx=CDHX+kx*om,svy=CDHY+ky*om,svz=CDHZ+kz*om;
  const qx=PX[i]-OX[i]-svx,qy=PY[i]-OY[i]-svy,qz=PZ[i]-OZ[i]-svz,vn=qx*nx+qy*ny+qz*nz;
  const tx=qx-vn*nx,ty=qy-vn*ny,tz=qz-vn*nz,tl=Math.sqrt(tx*tx+ty*ty+tz*tz);
  if(tl>1e-12){const lt=(tl<mu*pen?1:mu*.7*pen/tl)/(wp+CS.MHI);
    PX[i]-=tx*lt*wp;PY[i]-=ty*lt*wp;PZ[i]-=tz*lt*wp;CL.hx+=tx*lt*CS.MHI;CL.hy+=ty*lt*CS.MHI;CL.hz+=tz*lt*CS.MHI;}
  CCAP+=mu*pen;CDEM+=tl;CCNT++;b.pc++;
  if(CL.ph[s]>CS.PHMAX+.05)CL.ph[s]=CS.PHMAX+.05;else if(CL.ph[s]<CS.PHMIN-.05)CL.ph[s]=CS.PHMIN-.05;
}
function clawContacts(){
  clawFrame();CDHX=CL.hx-CL.ox;CDHY=CL.hy-CL.oy;CDHZ=CL.hz-CL.oz;
  const C=CASE;
  /* prong tips can't go through the floor (except over the chute hole) */
  for(let s=0;s<CS.npr;s++){const g=s*9+6,ty=PG[g+1];if(ty<CS.RC&&!(PG[g]<C.cx&&PG[g+2]>C.cz)){CL.hy+=CS.RC-ty;}}
  if(CL.hy<.05*UNIT)CL.hy=.05*UNIT;
  clawFrame();
  const reach=CS.L1+CS.L2+CS.piv+.03*UNIT;
  CL.touch=0;
  for(const b of BOD){b.pc=0;if(b.state!=='pit')continue;
    if(b.x1<CL.hx-reach||b.x0>CL.hx+reach||b.z1<CL.hz-reach||b.z0>CL.hz+reach||b.y0>CL.hy+.06*UNIT||b.y1<CL.hy-reach)continue;
    wake(b);
    const mu=.95*(b.T.fric||1)*CS.mu;
    for(let i=b.i0,e=b.i0+b.n;i<e;i++){const r=PR[i];
      /* housing: a ball round the head, pushes only */
      {const hx=CL.hx+CL.ux*.01*UNIT,hy=CL.hy+CL.uy*.01*UNIT,hz=CL.hz+CL.uz*.01*UNIT,dx=PX[i]-hx,dy=PY[i]-hy,dz=PZ[i]-hz,d2=dx*dx+dy*dy+dz*dz,rr=CS.RH+r;
        if(d2<rr*rr){const d=Math.sqrt(d2)||1e-9,pen=Math.min(CS.MAXPEN,rr-d),nx=dx/d,ny=dy/d,nz=dz/d,wp=PW[i],l=pen/(wp+CS.MHI);
          PX[i]+=nx*l*wp;PY[i]+=ny*l*wp;PZ[i]+=nz*l*wp;CL.hx-=nx*l*CS.MHI;CL.hy-=ny*l*CS.MHI;CL.hz-=nz*l*CS.MHI;CL.touch++;b.pc++;}}
      /* the prongs: two capsules each (arm, hook) */
      for(let s=0;s<CS.npr;s++){const g=s*9;
        for(let seg=0;seg<2;seg++){const a=g+seg*3,ax=PG[a],ay=PG[a+1],az=PG[a+2],ex=PG[a+3]-ax,ey=PG[a+4]-ay,ez=PG[a+5]-az;
          const l2=ex*ex+ey*ey+ez*ez;let t=((PX[i]-ax)*ex+(PY[i]-ay)*ey+(PZ[i]-az)*ez)/(l2||1e-12);t=t<0?0:t>1?1:t;
          const cx=ax+ex*t,cy=ay+ey*t,cz=az+ez*t,dx=PX[i]-cx,dy=PY[i]-cy,dz=PZ[i]-cz,d2=dx*dx+dy*dy+dz*dz,rr=CS.RC+r;
          if(d2>=rr*rr)continue;const d=Math.sqrt(d2)||1e-9;
          prongHit(b,i,s,cx,cy,cz,dx/d,dy/d,dz/d,rr-d,mu);CL.touch++;}}
    }
  }
}
const CLAWSTEP={integrate:clawIntegrate,contacts:clawContacts};
/* grip telemetry, once per tick: static-friction capacity against the slip it had to cancel */
function clawTelemetry(){CL.cap=CCAP;CL.dem=CDEM;CL.cnt=CCNT;const ld=CCNT?CDEM/(CCAP+1e-9):0;CL.load+=(ld-CL.load)*.2;CCAP=CDEM=CCNT=0;}
/* the carriage: each axis follows a velocity command or seeks a target, with acceleration limits (the swing comes free) */
const GT={tx:null,tz:null,vx:0,vz:0,vm:.32,vmz:.24,ac:1.4,carry:false};
function gantryTick(dt){
  const ac=GT.carry?.8:GT.ac;
  for(let ax=0;ax<2;ax++){const pos=ax?CL.gz:CL.gx,vel=ax?CL.gvz:CL.gvx,tg=ax?GT.tz:GT.tx,cmd=ax?GT.vz:GT.vx,vm=(ax?GT.vmz:GT.vm)*(GT.carry?.7:1);
    const lo=ax?CASE.z0+CS.edge:CASE.x0+CS.edge,hi=ax?CASE.z1-CS.edge:CASE.x1-CS.edge;
    const want=tg!=null?clamp((tg-pos)*3.2,-vm,vm):cmd*vm,dv=clamp(want-vel,-ac*dt,ac*dt);let v=vel+dv,p=pos+v*dt;
    if(p<lo){p=lo;v=0;}else if(p>hi){p=hi;v=0;}
    if(ax){CL.gz=p;CL.gvz=v;}else{CL.gx=p;CL.gvx=v;}}
}
