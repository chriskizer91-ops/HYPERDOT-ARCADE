/* ---------- substep: integrate (semi-implicit Euler + the gyroscopic term of a symmetric top) ---------- */
function integrate(h){
  const dz=PU.z-PU.zo;
  for(let k=0;k<NL;k++){const i=LIVE[k];NACT[i]=0;
    if(SLP[i]){if(SLP[i]===2){OX[i]=BX[i];OY[i]=BY[i];OZ[i]=BZ[i];BZ[i]+=dz;}continue;}   // deck riders move with the deck
    const o=i*9;
    OX[i]=BX[i];OY[i]=BY[i];OZ[i]=BZ[i];OQW[i]=QW[i];OQX[i]=QX[i];OQY[i]=QY[i];OQZ[i]=QZ[i];
    for(let j=0;j<9;j++)OM[o+j]=RM[o+j];
    let vx=VX[i],vy=VY[i]-GRAV*h,vz=VZ[i];const sp=vx*vx+vy*vy+vz*vz;
    if(sp>2025){const s=45/Math.sqrt(sp);vx*=s;vy*=s;vz*=s;}       // speed clamp (45 u/s) — no tunnelling through 0.3-thick coins
    VX[i]=vx;VY[i]=vy;VZ[i]=vz;
    const nx=RM[o+1],ny=RM[o+4],nz=RM[o+7];let wx=WX[i],wy=WY[i],wz=WZ[i];
    /* dw = -h I^-1 (w x Iw); for a disc Iw = Id w + (In-Id)(w.n)n so w x Iw = (In-Id)(w.n)(w x n) */
    const iid=BIID[i],dii=BIIN[i]-iid,kk=(1/BIIN[i]-1/iid)*(wx*nx+wy*ny+wz*nz);
    const tx=kk*(wy*nz-wz*ny),ty=kk*(wz*nx-wx*nz),tz=kk*(wx*ny-wy*nx),tn=tx*nx+ty*ny+tz*nz;
    wx-=h*(iid*tx+dii*tn*nx);wy-=h*(iid*ty+dii*tn*ny);wz-=h*(iid*tz+dii*tn*nz);
    const ws=wx*wx+wy*wy+wz*wz;if(ws>3600){const s=60/Math.sqrt(ws);wx*=s;wy*=s;wz*=s;}
    WX[i]=wx;WY[i]=wy;WZ[i]=wz;
    BX[i]+=vx*h;BY[i]+=vy*h;BZ[i]+=vz*h;rotB(i,wx*h,wy*h,wz*h);
  }
}
/* ---------- substep: project contacts. Each correction moves and rotates both bodies by their generalised
   inverse masses (1/m + (r x n) . I^-1 (r x n)); static friction then cancels the anchor slip of this substep
   when the needed tangential "force" stays inside the friction cone (lambda_t < mu_s lambda_n). ---------- */
const DMAX=.03;
function solvePos(h){
  const pz=PU.z,pzo=PU.zo;
  for(let k=0;k<NC;k++){
    const c=ORD[k],a=CB1[c],b=CB2[c],t=CT[c],c3=c*3,oa=a*9,ob=b>=0?b*9:0;
    const l0=CR1[c3],l1=CR1[c3+1],l2=CR1[c3+2];
    const r1x=RM[oa]*l0+RM[oa+1]*l1+RM[oa+2]*l2,r1y=RM[oa+3]*l0+RM[oa+4]*l1+RM[oa+5]*l2,r1z=RM[oa+6]*l0+RM[oa+7]*l1+RM[oa+8]*l2;
    const p1x=BX[a]+r1x,p1y=BY[a]+r1y,p1z=BZ[a]+r1z,m0=CR2[c3],m1=CR2[c3+1],m2=CR2[c3+2];
    let p2x,p2y,p2z,r2x=0,r2y=0,r2z=0;
    if(b>=0){r2x=RM[ob]*m0+RM[ob+1]*m1+RM[ob+2]*m2;r2y=RM[ob+3]*m0+RM[ob+4]*m1+RM[ob+5]*m2;r2z=RM[ob+6]*m0+RM[ob+7]*m1+RM[ob+8]*m2;p2x=BX[b]+r2x;p2y=BY[b]+r2y;p2z=BZ[b]+r2z;}
    else{p2x=m0;p2y=m1;p2z=b===-2?m2+pz:m2;}
    let nx=CN[c3],ny=CN[c3+1],nz=CN[c3+2];const nf=CNF[c];
    if(nf){const o=nf===1?oa:ob,x=nx,y=ny,z=nz;nx=RM[o]*x+RM[o+1]*y+RM[o+2]*z;ny=RM[o+3]*x+RM[o+4]*y+RM[o+5]*z;nz=RM[o+6]*x+RM[o+7]*y+RM[o+8]*z;}
    if(t===10){                                                     // box sample: inside the pusher block? leave by the shallower side
      if(!(p1z<pz&&p1y<HP&&p1x>-XW&&p1x<XW)){CLAM[c]=0;continue;}
      const ez_=pz-p1z,ey_=HP-p1y;if(ez_<ey_){nx=0;ny=0;nz=1;p2x=p1x;p2y=p1y;p2z=pz;}else{nx=0;ny=1;nz=0;p2x=p1x;p2y=HP;p2z=p1z;}
      CN[c3]=nx;CN[c3+1]=ny;CN[c3+2]=nz;CR2[c3]=p2x;CR2[c3+1]=p2y;CR2[c3+2]=p2z-pz;}
    /* does the support still exist where the anchor is now? (coins slide off edges and off each other mid-tick) */
    if(t===1){if(!onFloor(p1x,p1z)){CLAM[c]=0;continue;}}
    else if(t===2){if(p1z>pz||p1z<-.3){CLAM[c]=0;continue;}}
    else if(t===3||t===4){const dx=p2x-BX[a],dy=p2y-BY[a],dz=p2z-BZ[a],dn=dx*RM[oa+1]+dy*RM[oa+4]+dz*RM[oa+7],R=BR[a];if(dx*dx+dy*dy+dz*dz-dn*dn>R*R*1.003){CLAM[c]=0;continue;}}
    else if(t===6){if(p1y>HP){CLAM[c]=0;continue;}}
    else if(t===7){const dx=p1x-BX[b],dy=p1y-BY[b],dz=p1z-BZ[b],dn=dx*RM[ob+1]+dy*RM[ob+4]+dz*RM[ob+7],R=BR[b]+.05;if(dx*dx+dy*dy+dz*dz-dn*dn>R*R){CLAM[c]=0;continue;}}
    else if(t===9){if(p1y>-.02){CLAM[c]=0;continue;}}
    else if(t===8){if(Math.abs(p1y-p2y)>BH[a]+BH[b]+.04){CLAM[c]=0;continue;}}   // rims only touch at the same height
    const d=(p2x-p1x)*nx+(p2y-p1y)*ny+(p2z-p1z)*nz;
    if(d<=0||((t===3||t===4)&&d>2*BH[a]+.08)){CLAM[c]=0;continue;}
    /* approach speed before projection (restitution reference) */
    let ux=VX[a]+WY[a]*r1z-WZ[a]*r1y,uy=VY[a]+WZ[a]*r1x-WX[a]*r1z,uz=VZ[a]+WX[a]*r1y-WY[a]*r1x;
    if(b>=0){ux-=VX[b]+WY[b]*r2z-WZ[b]*r2y;uy-=VY[b]+WZ[b]*r2x-WX[b]*r2z;uz-=VZ[b]+WX[b]*r2y-WY[b]*r2x;}else if(b===-2)uz-=PU.v;
    CVN[c]=ux*nx+uy*ny+uz*nz;
    /* stacking: the lower coin of a face contact behaves twice as heavy (shock-propagation style mass scaling) */
    let s1=1,s2=1;if(t===7){if(BY[b]<BY[a])s2=.5;else s1=.5;}
    /* depenetration caps: deep overlaps (squeezes, edge pivots, a coin dropped onto the moving corner) recover over a few
       substeps instead of exploding; the pusher's cap is still 5x its own travel per substep, so it can never be overrun */
    const dc=t===1?d:(t===2||t===4||t===6||t===10)?(d>.08?.08:d):(d>DMAX?DMAX:d);
    /* resting-contact inertia scaling: a correction at the rim of a thin disc is ~80% rotation, so one Gauss-Seidel
       sweep rocks a resting coin between its supports and the heap random-walks. For slow contacts we solve with 3x
       the rotational inertia (impacts and table-edge pivots keep the true inertia, so tumbles and tips stay real). */
    const ri=(CVN[c]>-1&&t!==3&&t!==4)?1/3:1;
    const im1=EIM[a]*s1,iid1=EIID[a]*s1*ri,dii1=(EIIN[a]-EIID[a])*s1*ri,ax1=RM[oa+1],ay1=RM[oa+4],az1=RM[oa+7];
    let cx=r1y*nz-r1z*ny,cy=r1z*nx-r1x*nz,cz=r1x*ny-r1y*nx,dn=cx*ax1+cy*ay1+cz*az1;
    const i1x=iid1*cx+dii1*dn*ax1,i1y=iid1*cy+dii1*dn*ay1,i1z=iid1*cz+dii1*dn*az1;
    let w=im1+cx*i1x+cy*i1y+cz*i1z,im2=0,iid2=0,dii2=0,ax2=0,ay2=0,az2=0,i2x=0,i2y=0,i2z=0;
    if(b>=0){im2=EIM[b]*s2;iid2=EIID[b]*s2*ri;dii2=(EIIN[b]-EIID[b])*s2*ri;ax2=RM[ob+1];ay2=RM[ob+4];az2=RM[ob+7];
      cx=r2y*nz-r2z*ny;cy=r2z*nx-r2x*nz;cz=r2x*ny-r2y*nx;dn=cx*ax2+cy*ay2+cz*az2;
      i2x=iid2*cx+dii2*dn*ax2;i2y=iid2*cy+dii2*dn*ay2;i2z=iid2*cz+dii2*dn*az2;w+=im2+cx*i2x+cy*i2y+cz*i2z;}
    if(w<1e-9){CLAM[c]=0;if(SLP[a]&&(d>.05||CVN[c]<-1.5))WAKE[a]=1;if(b>=0&&SLP[b]&&(d>.05||CVN[c]<-1.5))WAKE[b]=1;continue;}
    const dl=dc/w;
    if(im1>0){BX[a]+=nx*dl*im1;BY[a]+=ny*dl*im1;BZ[a]+=nz*dl*im1;rotB(a,i1x*dl,i1y*dl,i1z*dl);}else if(SLP[a]&&(d>.05||CVN[c]<-1.5))WAKE[a]=1;
    if(im2>0){BX[b]-=nx*dl*im2;BY[b]-=ny*dl*im2;BZ[b]-=nz*dl*im2;rotB(b,-i2x*dl,-i2y*dl,-i2z*dl);}else if(b>=0&&SLP[b]&&(d>.05||CVN[c]<-1.5))WAKE[b]=1;
    CLAM[c]=dl;if(NACT[a]<255)NACT[a]++;if(b>=0&&NACT[b]<255)NACT[b]++;
    /* static friction */
    let dpx=p1x-(OX[a]+OM[oa]*l0+OM[oa+1]*l1+OM[oa+2]*l2),dpy=p1y-(OY[a]+OM[oa+3]*l0+OM[oa+4]*l1+OM[oa+5]*l2),dpz=p1z-(OZ[a]+OM[oa+6]*l0+OM[oa+7]*l1+OM[oa+8]*l2);
    if(b>=0){dpx-=p2x-(OX[b]+OM[ob]*m0+OM[ob+1]*m1+OM[ob+2]*m2);dpy-=p2y-(OY[b]+OM[ob+3]*m0+OM[ob+4]*m1+OM[ob+5]*m2);dpz-=p2z-(OZ[b]+OM[ob+6]*m0+OM[ob+7]*m1+OM[ob+8]*m2);}
    else if(b===-2)dpz-=pz-pzo;
    const dpn=dpx*nx+dpy*ny+dpz*nz;dpx-=dpn*nx;dpy-=dpn*ny;dpz-=dpn*nz;
    const L=Math.sqrt(dpx*dpx+dpy*dpy+dpz*dpz);
    if(L>1e-9){
      const tx=dpx/L,ty=dpy/L,tz=dpz/L;
      cx=r1y*tz-r1z*ty;cy=r1z*tx-r1x*tz;cz=r1x*ty-r1y*tx;dn=cx*ax1+cy*ay1+cz*az1;
      const j1x=iid1*cx+dii1*dn*ax1,j1y=iid1*cy+dii1*dn*ay1,j1z=iid1*cz+dii1*dn*az1;let wt=im1+cx*j1x+cy*j1y+cz*j1z,j2x=0,j2y=0,j2z=0;
      if(b>=0){cx=r2y*tz-r2z*ty;cy=r2z*tx-r2x*tz;cz=r2x*ty-r2y*tx;dn=cx*ax2+cy*ay2+cz*az2;
        j2x=iid2*cx+dii2*dn*ax2;j2y=iid2*cy+dii2*dn*ay2;j2z=iid2*cz+dii2*dn*az2;wt+=im2+cx*j2x+cy*j2y+cz*j2z;}
      if(wt>1e-9){const lt=L/wt;
        if(lt<CMS[c]*dl){
          if(im1>0){BX[a]-=tx*lt*im1;BY[a]-=ty*lt*im1;BZ[a]-=tz*lt*im1;rotB(a,-j1x*lt,-j1y*lt,-j1z*lt);}
          if(im2>0){BX[b]+=tx*lt*im2;BY[b]+=ty*lt*im2;BZ[b]+=tz*lt*im2;rotB(b,j2x*lt,j2y*lt,j2z*lt);}
        }}
    }
  }
}
/* ---------- substep: velocities from the corrected poses ---------- */
function updVel(h){
  const ih=1/h,ld=1-.12*h,ad=1-1.1*h;
  for(let k=0;k<NL;k++){const i=LIVE[k];if(SLP[i])continue;
    /* projection may reverse or absorb velocity, but it may not inject much: cap the gain over the integrated velocity */
    const v0=Math.sqrt(VX[i]*VX[i]+VY[i]*VY[i]+VZ[i]*VZ[i]),w0=Math.sqrt(WX[i]*WX[i]+WY[i]*WY[i]+WZ[i]*WZ[i]);
    let vx=(BX[i]-OX[i])*ih*ld,vy=(BY[i]-OY[i])*ih*ld,vz=(BZ[i]-OZ[i])*ih*ld;const vn=Math.sqrt(vx*vx+vy*vy+vz*vz);
    if(vn>v0+3){const f=(v0+3)/vn;vx*=f;vy*=f;vz*=f;}VX[i]=vx;VY[i]=vy;VZ[i]=vz;
    let w=QW[i],x=QX[i],y=QY[i],z=QZ[i];const l=1/Math.sqrt(w*w+x*x+y*y+z*z);w*=l;x*=l;y*=l;z*=l;QW[i]=w;QX[i]=x;QY[i]=y;QZ[i]=z;qmat(i);
    const pw=OQW[i],qx=OQX[i],qy=OQY[i],qz=OQZ[i],dw=w*pw+x*qx+y*qy+z*qz;   // dq = q * conj(q_prev)
    const s=(dw<0?-2:2)*ih*ad;
    let ax=(-w*qx+pw*x-(y*qz-z*qy))*s,ay=(-w*qy+pw*y-(z*qx-x*qz))*s,az=(-w*qz+pw*z-(x*qy-y*qx))*s;
    {const wn=Math.sqrt(ax*ax+ay*ay+az*az);if(wn>w0+15){const f=(w0+15)/wn;ax*=f;ay*=f;az*=f;}}
    /* rest damping: a coin held at two or more points that only rocks slowly is rolling on a rim with no slip,
       a mode rigid contacts cannot dissipate; real coins lose that energy at once (micro-impacts, rim scuff) */
    if(NACT[i]>=2){const w2=ax*ax+ay*ay+az*az;if(w2<9){const f=1-12*h;ax*=f;ay*=f;az*=f;}
      /* granular rest damping: a heap moves when pushed and stops when not; it never coasts */
      const rz=SLP[i]===2?VZ[i]-PU.v:VZ[i],v2=VX[i]*VX[i]+VY[i]*VY[i]+VZ[i]*VZ[i];if(v2<.3&&w2<9){const f=1-9*h;VX[i]*=f;VY[i]*=f;VZ[i]*=f;}}
    WX[i]=ax;WY[i]=ay;WZ[i]=az;
  }
}
/* ---------- substep: velocity pass — dynamic friction (capped by the normal impulse) and restitution ---------- */
function solveVel(h){
  const thr=2*GRAV*h,pv=PU.v;
  for(let k=0;k<NC;k++){const c=ORD[k],lam=CLAM[c];if(lam<=0)continue;
    const a=CB1[c],b=CB2[c],t=CT[c],c3=c*3,oa=a*9,ob=b>=0?b*9:0;
    const l0=CR1[c3],l1=CR1[c3+1],l2=CR1[c3+2];
    const r1x=RM[oa]*l0+RM[oa+1]*l1+RM[oa+2]*l2,r1y=RM[oa+3]*l0+RM[oa+4]*l1+RM[oa+5]*l2,r1z=RM[oa+6]*l0+RM[oa+7]*l1+RM[oa+8]*l2;
    let r2x=0,r2y=0,r2z=0;
    if(b>=0){const m0=CR2[c3],m1=CR2[c3+1],m2=CR2[c3+2];r2x=RM[ob]*m0+RM[ob+1]*m1+RM[ob+2]*m2;r2y=RM[ob+3]*m0+RM[ob+4]*m1+RM[ob+5]*m2;r2z=RM[ob+6]*m0+RM[ob+7]*m1+RM[ob+8]*m2;}
    let nx=CN[c3],ny=CN[c3+1],nz=CN[c3+2];const nf=CNF[c];
    if(nf){const o=nf===1?oa:ob,x=nx,y=ny,z=nz;nx=RM[o]*x+RM[o+1]*y+RM[o+2]*z;ny=RM[o+3]*x+RM[o+4]*y+RM[o+5]*z;nz=RM[o+6]*x+RM[o+7]*y+RM[o+8]*z;}
    let vx=VX[a]+WY[a]*r1z-WZ[a]*r1y,vy=VY[a]+WZ[a]*r1x-WX[a]*r1z,vz=VZ[a]+WX[a]*r1y-WY[a]*r1x;
    if(b>=0){vx-=VX[b]+WY[b]*r2z-WZ[b]*r2y;vy-=VY[b]+WZ[b]*r2x-WX[b]*r2z;vz-=VZ[b]+WX[b]*r2y-WY[b]*r2x;}else if(b===-2)vz-=pv;
    const vn=vx*nx+vy*ny+vz*nz,tx=vx-vn*nx,ty=vy-vn*ny,tz=vz-vn*nz,vt=Math.sqrt(tx*tx+ty*ty+tz*tz);
    let dx=0,dy=0,dz=0;
    if(vt>1e-6){const f=Math.min(CMD[c]*lam/h,vt)/vt;dx=-tx*f;dy=-ty*f;dz=-tz*f;}
    const vp=CVN[c],e=vp<-thr?CE[c]:0,dvn=(vp<0?-e*vp:0)-vn;
    dx+=nx*dvn;dy+=ny*dvn;dz+=nz*dvn;
    const dl=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dl<1e-7)continue;
    const ex=dx/dl,ey=dy/dl,ez=dz/dl;
    let s1=1,s2=1;if(t===7){if(BY[b]<BY[a])s2=.5;else s1=.5;}
    const im1=EIM[a]*s1,iid1=EIID[a]*s1,dii1=(EIIN[a]-EIID[a])*s1,ax1=RM[oa+1],ay1=RM[oa+4],az1=RM[oa+7];
    let cx=r1y*ez-r1z*ey,cy=r1z*ex-r1x*ez,cz=r1x*ey-r1y*ex,dn=cx*ax1+cy*ay1+cz*az1;
    const i1x=iid1*cx+dii1*dn*ax1,i1y=iid1*cy+dii1*dn*ay1,i1z=iid1*cz+dii1*dn*az1;
    let w=im1+cx*i1x+cy*i1y+cz*i1z,im2=0,i2x=0,i2y=0,i2z=0;
    if(b>=0){im2=EIM[b]*s2;const iid2=EIID[b]*s2,dii2=(EIIN[b]-EIID[b])*s2,ax2=RM[ob+1],ay2=RM[ob+4],az2=RM[ob+7];
      cx=r2y*ez-r2z*ey;cy=r2z*ex-r2x*ez;cz=r2x*ey-r2y*ex;dn=cx*ax2+cy*ay2+cz*az2;
      i2x=iid2*cx+dii2*dn*ax2;i2y=iid2*cy+dii2*dn*ay2;i2z=iid2*cz+dii2*dn*az2;w+=im2+cx*i2x+cy*i2y+cz*i2z;}
    if(w<1e-9)continue;
    const P=dl/w;
    if(im1>0){VX[a]+=ex*P*im1;VY[a]+=ey*P*im1;VZ[a]+=ez*P*im1;WX[a]+=i1x*P;WY[a]+=i1y*P;WZ[a]+=i1z*P;}
    if(im2>0){VX[b]-=ex*P*im2;VY[b]-=ey*P*im2;VZ[b]-=ez*P*im2;WX[b]-=i2x*P;WY[b]-=i2y*P;WZ[b]-=i2z*P;}
    if(vp<-2.5&&PH.nHits<64){const o=PH.nHits++*5;PH.hits[o]=BX[a]+r1x;PH.hits[o+1]=BY[a]+r1y;PH.hits[o+2]=BZ[a]+r1z;PH.hits[o+3]=-vp;
      PH.hits[o+4]=b>=0?0:t===1?1:2;if(b>=0&&KIND[b]===3||KIND[a]===3)PH.hits[o+4]=3;}
  }
}
/* ---------- one 60 Hz tick of the whole machine ---------- */
function physTick(){
  const t0=performance.now();PH.nHits=0;let aw=0;
  for(let k=0;k<NL;k++){const i=LIVE[k];
    if(WAKE[i]||(SLP[i]===1&&PU.v>0&&BZ[i]-BR[i]<PU.z+.8&&BY[i]<HP+.6&&BZ[i]>PU.z-1)||(SLP[i]===2&&(BZ[i]-BR[i]<.7||BZ[i]+BR[i]>PU.z-.25))){SLP[i]=0;STILL[i]=0;WAKE[i]=0;}   // the advancing face wakes what it will touch
    TOUCHP[i]=0;COVER[i]=0;AGE[i]+=DT;
    if(SLP[i]){EIM[i]=0;EIID[i]=0;EIIN[i]=0;MG[i]=.02;}
    else{aw++;EIM[i]=BIM[i];EIID[i]=BIID[i];EIIN[i]=BIIN[i];
      const sp=Math.abs(VX[i])+Math.abs(VY[i])+Math.abs(VZ[i])+(Math.abs(WX[i])+Math.abs(WY[i])+Math.abs(WZ[i]))*BR[i];
      MG[i]=Math.min(.6,.025+sp*DT*1.25);}   // speculative margin grows with speed so fast coins find contacts before they reach them
  }
  PH.awake=aw;detect();PH.contacts=NC;
  for(let s=0;s<NSUB;s++){
    PU.zo=PU.z;PU.ph+=TAU/PPER*HS;PU.z=PZM+PZA*Math.sin(PU.ph);PU.v=(PU.z-PU.zo)/HS;
    integrate(HS);
    for(let k=0;k<NL;k++){const i=LIVE[k];if(SLP[i]===2)VZ[i]=PU.v;}
    solvePos(HS);updVel(HS);solveVel(HS);
  }
  let act=0,fl=0,dk=0;for(let c=0;c<NC;c++)if(CLAM[c]>0){act++;if(CT[c]===6)fl+=CLAM[c];}
  PH.active=act;PH.faceLoad=fl;
  /* sleeping: a body that stays slow for half a second freezes; it costs nothing until a contact wakes it */
  for(let k=0;k<NL;k++){const i=LIVE[k];if(SLP[i])continue;
    if(TOUCHP[i])dk++;
    /* positional test: one-iteration XPBD leaves a jitter of about g*h in resting velocities, so instead of
       instantaneous speed we ask whether the coin has gone anywhere (or turned) during the last 0.4 s */
    const onDeck=BY[i]>HP&&BZ[i]+BR[i]<PU.z-.35&&BZ[i]-BR[i]>.7,o=i*9,zr=onDeck?BZ[i]-PU.z:BZ[i];
    const ex=BX[i]-SAX[i],ey=BY[i]-SAY[i],ez=zr-SAZ[i],nd=RM[o+1]*SAN[i*3]+RM[o+4]*SAN[i*3+1]+RM[o+7]*SAN[i*3+2];
    const still=ex*ex+ey*ey+ez*ez<.0016&&nd>.9993&&VX[i]*VX[i]+VY[i]*VY[i]+VZ[i]*VZ[i]<(onDeck?30:4);MOV[i]=still?0:1;
    if(still&&(onDeck||!TOUCHP[i]))STILL[i]+=DT;
    else{STILL[i]=0;SAX[i]=BX[i];SAY[i]=BY[i];SAZ[i]=zr;SAN[i*3]=RM[o+1];SAN[i*3+1]=RM[o+4];SAN[i*3+2]=RM[o+7];}
    if(STILL[i]>.4){SLP[i]=onDeck?2:1;VX[i]=VY[i]=WX[i]=WY[i]=WZ[i]=0;VZ[i]=onDeck?PU.v:0;OX[i]=BX[i];OY[i]=BY[i];OZ[i]=BZ[i];
      OQW[i]=QW[i];OQX[i]=QX[i];OQY[i]=QY[i];OQZ[i]=QZ[i];const o=i*9;for(let j=0;j<9;j++)OM[o+j]=RM[o+j];}
  }
  PH.deckN=dk;
  /* coins leaving the machine: over the drop edge = won, into a side gutter = lost */
  for(let k=NL-1;k>=0;k--){const i=LIVE[k],y=BY[i];
    if(!(y>-60&&y<90&&BX[i]===BX[i]&&BZ[i]===BZ[i])){PH.bad++;PH.lost++;PH.lostK[KIND[i]]++;PH.evLost.push([KIND[i],0,ZE]);kill(i);continue;}
    if(y<-3.2||(y<-2.2&&Math.abs(BX[i])>XF+.2)){
      if(Math.abs(BX[i])<=XF+.4&&BZ[i]>ZE-1){PH.won++;PH.wonK[KIND[i]]++;PH.evWon.push([KIND[i],BX[i],BZ[i],i]);}
      else{PH.lost++;PH.lostK[KIND[i]]++;PH.evLost.push([KIND[i],BX[i],BZ[i],i]);}
      kill(i);
    }
  }
  PH.t+=DT;PH.ticks++;PH.ms=performance.now()-t0;
}
/* ---------- the house heap: hex-packed layers with jitter, then a few seconds of real settling ---------- */
function buildHeap(seed){
  const r=mulberry(seed||7);physReset();
  PU.ph=Math.PI/2;PU.z=PU.zo=PZM+PZA;PU.v=0;                          // start fully extended
  const sp=2.05,rh=sp*Math.sqrt(3)/2;
  const lay=(z0,z1,L,fill,y0,inside)=>{let row=0;
    for(let z=z0+(L*.41%1)*rh;z<=z1;z+=rh,row++){const off=((row&1)?sp/2:0)+L*.71;
      for(let x=-XW+((off%sp)+sp)%sp;x<=XW;x+=sp){if(r()>fill)continue;
        const px_=x+(r()-.5)*.22,pz_=z+(r()-.5)*.22;if(!inside(px_,pz_))continue;
        const q=qAxis(r()-.5,0,r()-.5,(r()-.5)*.1);
        spawn(r()<.22?1:0,px_,y0+KH[0]+L*(2*KH[0]+.025)+.005,pz_,q);}}};
  const low=(x,z)=>z<ZG-1.1?Math.abs(x)<XW-1.03:Math.abs(x)<XF-1.03;
  const deck=(x,z)=>Math.abs(x)<XW-1.03&&z>1.04;
  const zf=PU.z+1.06;
  lay(zf,ZE-1.15,0,.97,0,low);lay(zf,ZE-1.6,1,.9,0,low);lay(zf+.5,ZE-2.4,2,.72,0,low);lay(zf+1.2,ZE-3.4,3,.45,0,low);
  lay(1.04,PU.z-1.06,0,.96,HP,deck);lay(1.04,PU.z-1.4,1,.75,HP,deck);lay(1.5,PU.z-2.2,2,.4,HP,deck);
  /* two prize tokens riding the heap */
  for(let k=0;k<2;k++){const x=(k?1:-1)*(3+r()*6),z=12+r()*4;spawn(3,x,2.2+k*.2,z,qAxis(1,0,0,(r()-.5)*.2));}
}
function settleHeap(sec){for(let i=0;i<sec*60;i++)physTick();PH.won=PH.lost=0;PH.spawned=NL;PH.wonK=[0,0,0,0];PH.lostK=[0,0,0,0];PH.evWon.length=0;PH.evLost.length=0;}
