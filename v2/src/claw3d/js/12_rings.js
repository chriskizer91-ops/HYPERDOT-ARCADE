/* =====================================================================================
   12. KEYRINGS — every Sugar Claw keychain hangs from a chrome ring on a short ball chain, like the real thing.
   The ring is a small weight on the end of the chain: it flops over, lies on the floor beside its keychain, and
   swings when the keychain is lifted. Sugar Claw's rule: if a prong goes through the ring while the claw closes,
   the ring hooks on it, and the keychain is lifted by its ring even when the grip is too weak to hold it.
   It lets go when the claw opens.
   ===================================================================================== */
const RING={R:.012,tube:.0017,L:.016,cap:1.05,hold:.72};
let RINGSTEP=null;
/* where the chain meets the toy: its highest point; the balls nearest it carry the chain's pull */
function ringPrep(T){
  if(T._ring!==undefined)return T._ring;if(!T.ring)return T._ring=null;
  const m=T.model,s=T.size,P=prepType(T);let ty=-1e9,tx=0,tz=0;
  for(let i=0;i<m.nv;i++){const y=m.pos[i*3+1]*s;if(y>ty){ty=y;tx=m.pos[i*3]*s;tz=m.pos[i*3+2]*s;}}
  const d=[];for(let k=0;k<P.n;k++){const x=P.q[k*3]+P.c0[0],y=P.q[k*3+1]+P.c0[1],z=P.q[k*3+2]+P.c0[2];d.push([Math.hypot(x-tx,y-ty,z-tz),k]);}
  d.sort((a,b)=>a[0]-b[0]);const ks=d.slice(0,3).map(e=>e[1]);
  return T._ring={top:[tx,ty,tz],ks,L:RING.L+RING.R};
}
/* the chain's anchor in the world: the top point carried by its nearest balls and the toy's rotation */
const _ra=[0,0,0];
function ringAnchor(b,o){const G=b.T._ring,P=b.P,R=b.R;o[0]=o[1]=o[2]=0;
  for(const k of G.ks){const i=b.i0+k,dx=G.top[0]-(P.q[k*3]+P.c0[0]),dy=G.top[1]-(P.q[k*3+1]+P.c0[1]),dz=G.top[2]-(P.q[k*3+2]+P.c0[2]);
    o[0]+=PX[i]+R[0]*dx+R[1]*dy+R[2]*dz;o[1]+=PY[i]+R[3]*dx+R[4]*dy+R[5]*dz;o[2]+=PZ[i]+R[6]*dx+R[7]*dy+R[8]*dz;}
  o[0]/=G.ks.length;o[1]/=G.ks.length;o[2]/=G.ks.length;return o;}
function ringInit(b){const G=ringPrep(b.T);if(!G)return null;ringAnchor(b,_ra);const R=b.R,L=G.L;
  const x=_ra[0]+R[1]*L,y=_ra[1]+R[4]*L,z=_ra[2]+R[7]*L;return b.rg={x,y,z,ox:x,oy:y,oz:z,hook:-1};}
/* the closest point on prong s's hook (elbow to tip) to a point */
function hookPoint(s,x,y,z,o){const g=s*9,ax=PG[g+3],ay=PG[g+4],az=PG[g+5],ex=PG[g+6]-ax,ey=PG[g+7]-ay,ez=PG[g+8]-az,l2=ex*ex+ey*ey+ez*ez;
  let t=((x-ax)*ex+(y-ay)*ey+(z-az)*ez)/(l2||1e-12);t=t<0?0:t>1?1:t;o[0]=ax+ex*t;o[1]=ay+ey*t;o[2]=az+ez*t;return Math.hypot(x-o[0],y-o[1],z-o[2]);}
const _hp=[0,0,0];let RINGHOOKS=0;
/* one substep for every ring */
function ringStep(all){
  const C=CASE,grab=CL.motor>0&&!all,lim=RING.R*RING.cap;
  for(const b of BOD){if(b.state!=='pit'||!b.T.ring)continue;const r=b.rg||ringInit(b);if(!r)continue;
    if(b.sleep&&r.hook<0&&!all)continue;
    /* a small weight on a chain */
    const vx=(r.x-r.ox)*.985,vy=(r.y-r.oy)*.985,vz=(r.z-r.oz)*.985;r.ox=r.x;r.oy=r.y;r.oz=r.z;r.x+=vx;r.y+=vy-GRAV*H2;r.z+=vz;
    /* hooked on a prong: it hangs on the hook; the claw opening lets it slide off */
    if(r.hook>=0){if(CL.motor<0&&CL.ph[r.hook]>CS.PHMIN+.3)r.hook=-1;
      else{const d=hookPoint(r.hook,r.x,r.y,r.z,_hp);if(d>RING.R*RING.hold){const k=(d-RING.R*RING.hold)/d;r.x+=(_hp[0]-r.x)*k;r.y+=(_hp[1]-r.y)*k;r.z+=(_hp[2]-r.z)*k;}}}
    else if(grab&&(M.ph==='grab'||M.ph==='lift')){for(let s=0;s<CS.npr;s++){if(hookPoint(s,r.x,r.y,r.z,_hp)<lim){r.hook=s;r.was=1;RINGHOOKS++;wake(b);break;}}}
    /* the chain: the ring can't be further than L from where the chain meets the toy */
    const G=b.T._ring;ringAnchor(b,_ra);const dx=r.x-_ra[0],dy=r.y-_ra[1],dz=r.z-_ra[2],dl=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-9;
    if(dl>G.L){const ex=dl-G.L,nx=dx/dl,ny=dy/dl,nz=dz/dl;
      if(r.hook>=0){/* the toy hangs from its ring: the top of the toy is pulled up to the chain's length */
        wake(b);for(const k of G.ks){const i=b.i0+k;PX[i]+=nx*ex*.9;PY[i]+=ny*ex*.9;PZ[i]+=nz*ex*.9;}}
      else{r.x-=nx*ex;r.y-=ny*ex;r.z-=nz*ex;}}
    /* the case: floor, walls; over the chute it falls with its toy */
    const t=RING.tube*1.5,inCh=r.x<C.cx&&r.z>C.cz;
    if(!inCh&&r.y<t){r.y=t;r.ox=r.x-(r.x-r.ox)*.6;r.oz=r.z-(r.z-r.oz)*.6;}
    if(r.x<C.x0+t)r.x=C.x0+t;else if(r.x>C.x1-t)r.x=C.x1-t;if(r.z<C.z0+t)r.z=C.z0+t;else if(r.z>C.z1-t)r.z=C.z1-t;
  }
}
/* let every ring drop and settle beside its toy (the toys themselves stay put) */
function ringSettle(){if(!RINGSTEP)return;for(let i=0;i<240;i++)ringStep(true);}
