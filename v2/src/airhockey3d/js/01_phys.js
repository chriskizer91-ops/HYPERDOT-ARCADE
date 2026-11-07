/* =====================================================================================
   1. PHYSICS — the table, the puck(s) and the two mallets, in metres and seconds.
      Table frame: x across (-HW..HW), z along (-HL..HL). Player 1 defends +z (the near end),
      player 2 defends -z. The deck is at y = TB.DECK in the 3D world.
      - The puck rides on air: a little drag that grows with speed, almost no rolling friction.
        With the air off it scrubs to a stop.
      - The rails are a rounded rectangle; each end rail has a goal slot with rounded posts.
      - Mallets are moved by their players (kinematic, very heavy). Each tick their path is
        cut into substeps, and the puck's contact with a mallet is found by a swept test, so
        a fast flick can't pass through the puck.
      - A spinning puck grips rails and mallets a little: spin bends its bounces (and a
        glancing hit puts spin on it).
      - A puck pinned between a mallet and a rail stops the mallet; it can't be pushed through.
      Pure: no DOM, no randomness, so the same inputs always give the same game.
   ===================================================================================== */
const TB={HW:.5,HL:1.0,RC:.11,GW:.30,POST:.009,RP:.0405,HP:.016,RM:.05,DECK:.80,
  VMAL:7.2,      /* a mallet's top speed, m/s */
  VSOFT:5.4,     /* puck speeds above this are compressed (a hard flick still feels hard, but stays readable) */
  VMAX:9.5,
  E_WALL:.86,E_MAL:.72,E_PUCK:.92,
  MU_WALL:.28,MU_MAL:.42,
  SUB:8};
const SIDE=[1,-1];   /* player 0 defends +z, player 1 defends -z */
function mkPuck(x,z){return {x,z,vx:0,vz:0,w:0,ang:0,on:true,sink:0,sinkSide:0,sx:0,sz:0,last:-1,lastSpd:0,bank:0,hop:0,hopV:0,tilt:0,id:0};}
function mkMallet(side){const z=side*(TB.HL-.22);return {x:0,z,px:0,pz:z,vx:0,vz:0,tx:0,tz:z,side,block:0};}
function mkPhys(){return {pucks:[],mal:[mkMallet(1),mkMallet(-1)],air:1,ev:[],t:0,hits:0};}

/* where a mallet may be: its own half (its centre may touch the centre line), inside the rails */
function clampMallet(side,x,z){
  const r=TB.RM,hw=TB.HW-r,hl=TB.HL-r;
  x=x<-hw?-hw:x>hw?hw:x;let lz=side*z;lz=lz<0?0:lz>hl?hl:lz;
  const cx=TB.HW-TB.RC,cz=TB.HL-TB.RC;
  if(Math.abs(x)>cx&&lz>cz){const ox=Math.abs(x)-cx,oz=lz-cz,d=Math.hypot(ox,oz),m=TB.RC-r;
    if(d>m){const k=m/d;x=Math.sign(x)*(cx+ox*k);lz=cz+oz*k;}}
  return [x,side*lz];
}
/* the player's hand -> the mallet's end position for this tick (legal, and no faster than VMAL) */
function malletAim(m,tx,tz,dt,vmax){
  [tx,tz]=clampMallet(m.side,tx,tz);
  let dx=tx-m.x,dz=tz-m.z;const d=Math.hypot(dx,dz),s=(vmax||TB.VMAL)*dt;
  if(d>s){dx*=s/d;dz*=s/d;}
  m.tx=m.x+dx;m.tz=m.z+dz;
}
function softCap(p){
  const s=Math.hypot(p.vx,p.vz);if(s<=TB.VSOFT)return;
  let n=TB.VSOFT+(s-TB.VSOFT)*.42;if(n>TB.VMAX)n=TB.VMAX;p.vx*=n/s;p.vz*=n/s;
}
/* friction at a contact with inward normal (nx,nz): the slip of the puck's edge (its slide plus its spin)
   is cut by k, shared between slide and spin the way a solid disc shares it (1/3 slide, 2/3 spin) */
function grip(p,nx,nz,k,svx,svz){
  const tx=-nz,tz=nx,u=(p.vx-(svx||0))*tx+(p.vz-(svz||0))*tz+p.w*TB.RP,du=k*u;
  p.vx-=du/3*tx;p.vz-=du/3*tz;p.w-=2*du/(3*TB.RP);
}
function bounce(P,p,nx,nz,e,mu,kind,x,z){
  const vn=p.vx*nx+p.vz*nz;if(vn>=0)return;
  p.vx-=(1+e)*vn*nx;p.vz-=(1+e)*vn*nz;grip(p,nx,nz,mu);
  const imp=-vn;if(kind==='wall'&&imp>.25)p.bank++;
  if(imp>.08)P.ev.push({t:kind,imp,x:x==null?p.x:x,z:z==null?p.z:z,p});
  if(imp>2.2){p.hopV=Math.max(p.hopV,(imp-2.2)*.12);p.tilt=Math.min(1,p.tilt+imp*.08);}
}
/* the rails, the corners, the goal posts and the slot; returns 1 if the puck went in */
function walls(P,p){
  const r=TB.RP,HW=TB.HW,HL=TB.HL,RC=TB.RC,gw=TB.GW/2,cx=HW-RC,cz=HL-RC,ax=Math.abs(p.x),az=Math.abs(p.z),sx=p.x<0?-1:1,sz=p.z<0?-1:1;
  if(az>HL){                                 /* in a goal slot: its side walls, then the drop */
    if(ax>gw-r){p.x=sx*(gw-r);if(p.vx*sx>0)p.vx=-p.vx*.5;}
    if(az>HL+r*.55)return sz;
    return 0;
  }
  if(ax>cx&&az>cz){                          /* a rounded corner */
    const ox=p.x-sx*cx,oz=p.z-sz*cz,d=Math.hypot(ox,oz);
    if(d>RC-r){const nx=-ox/d,nz=-oz/d;p.x=sx*cx+ox/d*(RC-r);p.z=sz*cz+oz/d*(RC-r);bounce(P,p,nx,nz,TB.E_WALL,TB.MU_WALL,'wall',sx*cx-nx*RC,sz*cz-nz*RC);}
    return 0;
  }
  if(ax>HW-r){p.x=sx*(HW-r);bounce(P,p,-sx,0,TB.E_WALL,TB.MU_WALL,'wall',sx*HW,p.z);}
  if(az>HL-r){
    if(ax>=gw){p.z=sz*(HL-r);bounce(P,p,0,-sz,TB.E_WALL,TB.MU_WALL,'wall',p.x,sz*HL);}
    else{                                    /* in the goal mouth: the posts are small round ends of the rail */
      for(const qx of [-gw,gw]){const ox=p.x-qx,oz=p.z-sz*HL,d=Math.hypot(ox,oz),m=r+TB.POST;
        if(d<m&&d>1e-6){const nx=ox/d,nz=oz/d;p.x=qx+nx*m;p.z=sz*HL+nz*m;bounce(P,p,nx,nz,TB.E_WALL*.9,TB.MU_WALL,'post',qx,sz*HL);}}
    }
  }
  return 0;
}
/* the swept contact of a puck and a mallet over one substep (both move in straight lines) */
function malletHit(P,p,m,mi,x0,z0,x1,z1,h){
  const R=TB.RP+TB.RM;
  /* relative motion of the puck from the mallet's point of view, over this substep */
  const dx0=p.x-p.vx*h-x0,dz0=p.z-p.vz*h-z0,dx1=p.x-x1,dz1=p.z-z1;
  let ex=dx1-dx0,ez=dz1-dz0,a=ex*ex+ez*ez,b=2*(dx0*ex+dz0*ez),c=dx0*dx0+dz0*dz0-R*R,t=-1;
  if(c<0)t=0;else if(a>1e-12){const disc=b*b-4*a*c;if(disc>=0){const s=(-b-Math.sqrt(disc))/(2*a);if(s>=0&&s<=1)t=s;}}
  if(t<0){const d=Math.hypot(dx1,dz1);if(d>=R)return false;t=1;}
  /* at the moment of contact */
  const mx=x0+(x1-x0)*t,mz=z0+(z1-z0)*t,px=p.x-p.vx*h*(1-t),pz=p.z-p.vz*h*(1-t);
  let nx=px-mx,nz=pz-mz,d=Math.hypot(nx,nz);if(d<1e-6){nx=0;nz=-m.side;d=1;}nx/=d;nz/=d;
  const mvx=(x1-x0)/h,mvz=(z1-z0)/h,vn=(p.vx-mvx)*nx+(p.vz-mvz)*nz;
  if(vn<0){
    p.vx-=(1+TB.E_MAL)*vn*nx;p.vz-=(1+TB.E_MAL)*vn*nz;grip(p,nx,nz,TB.MU_MAL,mvx,mvz);softCap(p);
    const imp=-vn,spd=Math.hypot(p.vx,p.vz);
    if(imp>.05){P.ev.push({t:'mallet',imp,who:mi,x:mx+nx*TB.RM,z:mz+nz*TB.RM,p,spd});
      p.last=mi;p.lastSpd=spd;p.bank=0;P.hits++;}
    if(imp>2.6){p.hopV=Math.max(p.hopV,(imp-2.6)*.08);p.tilt=Math.min(1,p.tilt+imp*.1);}
  }
  /* the puck now sits on the mallet's rim, and finishes the substep from there */
  const rest=(1-t)*h;
  p.x=mx+nx*R+p.vx*rest;p.z=mz+nz*R+p.vz*rest;
  const qx=p.x-x1,qz=p.z-z1,q=Math.hypot(qx,qz);if(q<R&&q>1e-6){p.x=x1+qx/q*R;p.z=z1+qz/q*R;}
  return true;
}
function puckPuck(P,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),R=2*TB.RP;if(d>=R||d<1e-6)return;
  const nx=dx/d,nz=dz/d,o=(R-d)/2;a.x-=nx*o;a.z-=nz*o;b.x+=nx*o;b.z+=nz*o;
  const vn=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(vn>=0)return;
  const j=-(1+TB.E_PUCK)*vn/2;a.vx-=j*nx;a.vz-=j*nz;b.vx+=j*nx;b.vz+=j*nz;
  if(-vn>.1)P.ev.push({t:'puck',imp:-vn,x:(a.x+b.x)/2,z:(a.z+b.z)/2,p:a});
}
/* one fixed tick. Before it, each mallet's tx,tz holds where its player put it (see malletAim). */
function physStep(P,dt){
  const n=TB.SUB,h=dt/n;P.t+=dt;
  for(const m of P.mal){m.px=m.x;m.pz=m.z;m.vx=(m.tx-m.x)/dt;m.vz=(m.tz-m.z)/dt;m.block=Math.max(0,m.block-dt);}
  for(let k=0;k<n;k++){
    for(let mi=0;mi<2;mi++){const m=P.mal[mi];m.x0=m.x;m.z0=m.z;m.x=m.px+(m.tx-m.px)*(k+1)/n;m.z=m.pz+(m.tz-m.pz)*(k+1)/n;}
    for(const p of P.pucks){
      if(!p.on)continue;
      /* air: drag grows with speed; the cushion holds a little friction. Air off: it scrubs to a stop */
      const s=Math.hypot(p.vx,p.vz);
      if(s>1e-5){const dec=P.air?(.016+.11*s+.012*s*s):(1.6+.6*s);const ns=Math.max(0,s-dec*h);p.vx*=ns/s;p.vz*=ns/s;}
      p.w*=1-(P.air?.55:3)*h;
      p.x+=p.vx*h;p.z+=p.vz*h;p.ang+=p.w*h;
      for(let mi=0;mi<2;mi++){const m=P.mal[mi];malletHit(P,p,m,mi,m.x0,m.z0,m.x,m.z,h);}
      const g=walls(P,p);
      if(g){p.on=false;p.sink=1e-4;p.sinkSide=g;p.sx=p.vx;p.sz=p.vz;P.ev.push({t:'goal',side:g,p,spd:Math.hypot(p.sx,p.sz),x:p.x});continue;}
      /* pinned against a rail: the mallet stops; it can't push the puck through */
      for(let mi=0;mi<2;mi++){const m=P.mal[mi],qx=p.x-m.x,qz=p.z-m.z,q=Math.hypot(qx,qz),R=TB.RP+TB.RM;
        if(q<R-.001&&q>1e-6){const o=R-q;m.x-=qx/q*o;m.z-=qz/q*o;[m.x,m.z]=clampMallet(m.side,m.x,m.z);m.block=.12;
          const vn=(p.vx-m.vx)*qx/q+(p.vz-m.vz)*qz/q;if(vn<0){p.vx-=vn*qx/q*.5;p.vz-=vn*qz/q*.5;}}}
    }
    for(let i=0;i<P.pucks.length;i++)for(let j=i+1;j<P.pucks.length;j++){const a=P.pucks[i],b=P.pucks[j];if(a.on&&b.on)puckPuck(P,a,b);}
  }
  for(const m of P.mal){m.vx=(m.x-m.px)/dt;m.vz=(m.z-m.pz)/dt;m.tx=m.x;m.tz=m.z;}
  for(const p of P.pucks){
    /* the cosmetic hop and wobble after a hard hit (the puck lifts a few mm and settles) */
    if(p.hopV>0||p.hop>0){p.hop+=p.hopV*dt;p.hopV-=9.8*dt;if(p.hop<=0){p.hop=0;p.hopV=p.hopV<-.12?-p.hopV*.3:0;}}
    p.tilt*=Math.exp(-dt*5);
    if(!p.on&&p.sink>0)p.sink+=dt;
  }
}
/* ---------- prediction for the CPU: the puck's path off the rails, ignoring mallets ---------- */
const PRED=mkPuck(0,0),PREDP={ev:[],air:1};
/* run the puck forward up to tmax seconds; returns the first time and place its centre reaches lz on the
   given side (side*z >= lz), or null. Uses the real rail code at 1/240 s steps. */
function predictCross(p,side,lz,tmax){
  const q=PRED;q.x=p.x;q.z=p.z;q.vx=p.vx;q.vz=p.vz;q.w=p.w;q.on=true;q.bank=0;PREDP.ev.length=0;
  const h=1/240;let t=0;
  if(side*q.z>=lz)return {t:0,x:q.x,z:q.z,vx:q.vx,vz:q.vz,banks:0};
  while(t<tmax){
    const s=Math.hypot(q.vx,q.vz);if(s<.02)return null;
    const dec=.016+.11*s+.012*s*s,ns=Math.max(0,s-dec*h);q.vx*=ns/s;q.vz*=ns/s;q.w*=1-.55*h;
    q.x+=q.vx*h;q.z+=q.vz*h;t+=h;
    const g=walls(PREDP,q);
    if(side*q.z>=lz||g)return {t,x:q.x,z:q.z,vx:q.vx,vz:q.vz,banks:q.bank,goal:g};
  }
  return null;
}
/* where the puck will be after tsec seconds (no mallets) */
function predictAt(p,tsec){
  const q=PRED;q.x=p.x;q.z=p.z;q.vx=p.vx;q.vz=p.vz;q.w=p.w;q.on=true;PREDP.ev.length=0;
  const h=1/240;for(let t=0;t<tsec;t+=h){const s=Math.hypot(q.vx,q.vz);if(s<.005)break;const dec=.016+.11*s+.012*s*s,ns=Math.max(0,s-dec*h);q.vx*=ns/s;q.vz*=ns/s;q.x+=q.vx*h;q.z+=q.vz*h;if(walls(PREDP,q))break;}
  return q;
}
