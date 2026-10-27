/* ---------- per-frame: static copy + animated lamps ---------- */
const LAMPC=[[255,190,60],[255,80,200],[80,220,255],[255,240,140],[120,255,140]];
function drawStatic(t,mood){
  RBUF.set(SCOL);ZB.set(SZ);
  const hot=mood.hot||0,col=mood.col||0;
  for(let k=0;k<NLAMP;k++){const i=LAMPI[k],u=LAMPU[k],kind=LAMPK[k];let r=0,gg=0,b=0;
    if(kind===1){const ph=(u*3-t*2.2)%1,on=(ph<0?ph+1:ph)<.34?1:.16;const c=LAMPC[(col+0)%5];r=c[0]*on;gg=c[1]*on;b=c[2]*on;}       // edge chevrons, chasing toward the player
    else if(kind===2){const s=.55+.45*Math.sin(u*40-t*6);r=170+70*s;gg=165+60*s;b=180+60*s;}                                        // chrome drop lip with a running sheen
    else if(kind===3){const ph=((u*14-t*5)%1+1)%1,on=ph<.5?1:.22,c=LAMPC[(col+1+(hot?(u*14|0)%3:0))%5];r=c[0]*on;gg=c[1]*on;b=c[2]*on;}  // side-wall chase strip
    else if(kind===4){const n=Math.floor(u*24),on=hot?((n+(t*12|0))%2?1:.2):((n+(t*4|0))%3===0?1:.35),c=LAMPC[(col+3)%5];r=c[0]*on;gg=c[1]*on;b=c[2]*on;}  // marquee bulbs
    else{const on=.5+.5*Math.sin(u*30+t*4);r=255*(.3+.7*on)*(hot?1:.6);gg=150*(.3+.7*on)*(hot?1:.6);b=40;}                          // amber strip under the edge
    RBUF[i]=pack(r,gg,b);}
}
/* ---------- the pusher: deck top (moving perforated plate) and chrome front face, ray-cast in their band ---------- */
function drawDeck(t){
  const pz=PU.z,ex=CAM.ex,ey=CAM.ey,ez=CAM.ez,push=PU.v>0?1:0;
  for(let py=DROW0;py<=DROW1;py++){const dth=(py&3)<<2;
    for(let x=0;x<W;x++){const i=py*W+x,dx=RDX[i],dy=RDY[i],dz=RDZ[i];let best=ZB[i],c=0;
      if(dy<0){const tt=(HP-ey)/dy,hx=ex+dx*tt,hz=ez+dz*tt;
        if(hz>=-.05&&hz<=pz&&hx>=-XW&&hx<=XW&&tt<best){best=tt;const lz=hz-pz;
          const fz=lz/1.1-Math.floor(lz/1.1),groove=fz<.18,sheen=.5+.5*Math.sin(hx*.3+lz*.4),bay=BAY4[dth|(x&3)];
          let r=34+20*sheen,g_=36+20*sheen,b=48+24*sheen;if(groove){r*=.55;g_*=.55;b*=.6;}if(bay<.25){r*=.92;g_*=.92;b*=.92;}
          if(lz>-.22){const q=1+lz/.22;r=90+90*q;g_=94+90*q;b=110+96*q;}
          c=pack(r,g_,b);}}
      if(dz<0){const tt=(pz-ez)/dz,hy=ey+dy*tt,hx=ex+dx*tt;
        if(hy>=0&&hy<=HP&&hx>=-XW&&hx<=XW&&tt<best){best=tt;const k=hy/HP;
          let r=90+150*k*k,g_=94+146*k*k,b=112+140*k*k;
          const lx=((hx+XW)/1.5)%1;if(Math.abs(hy-.45)<.17&&Math.abs(lx-.5)<.2){const on=push&&((hx+XW)/1.5|0)%2===((t*8|0)%2)?1:.25;r=255*on;g_=120*on+40;b=30;}
          if(hy<.12){r*=.45;g_*=.45;b*=.5;}
          c=pack(r,g_,b);}}
      if(c){RBUF[i]=c;ZB[i]=best;}
    }}
}
/* ---------- coins ---------- */
const COINCOL=[[1,.74,.32],[.7,.73,.8],[1,.78,.34],[.82,.8,.78]];   // brass, nickel, bonus gold, token silver
const GEMCOL=[[.15,.95,.45],[.25,.5,1],[1,.18,.38],[.78,.35,1]];
const LX=-.33,LY=.85,LZ=.41;                                               // key light (normalised below)
const GLI=[];                                                                // glints found this frame: x, y, strength
let NGL=0;const GLX=new Float32Array(48),GLY=new Float32Array(48),GLS=new Float32Array(48);
function addGlint(x,y,s){if(NGL<48){GLX[NGL]=x;GLY[NGL]=y;GLS[NGL]=s;NGL++;return;}let m=0;for(let k=1;k<48;k++)if(GLS[k]<GLS[m])m=k;if(s>GLS[m]){GLX[m]=x;GLY[m]=y;GLS[m]=s;}}
/* draw one disc: centre, frame (u, n axis, v), radius, half-thickness, kind, hue, ambient occlusion, extra glow */
function drawCoin(cx,cy,cz,ux,uy,uz,nx,ny,nz,vx,vy,vz,R,h,kind,hue,ao,glow,lively){
  const ex=CAM.ex-cx,ey=CAM.ey-cy,ez=CAM.ez-cz,el=Math.sqrt(ex*ex+ey*ey+ez*ez),Vx=ex/el,Vy=ey/el,Vz=ez/el;
  const sg=(nx*Vx+ny*Vy+nz*Vz)>=0?1:-1;                  // which face looks at us
  nx*=sg;ny*=sg;nz*=sg;vx*=sg;vy*=sg;vz*=sg;              // flipping v too keeps the far-side design un-mirrored
  const fx=cx+h*nx,fy=cy+h*ny,fz=cz+h*nz,F=CAM.F,Rc=CAM.R,U=CAM.U,f=CAM.f;
  const dx=fx-CAM.ex,dy=fy-CAM.ey,dz=fz-CAM.ez,zc=dx*F[0]+dy*F[1]+dz*F[2];if(zc<1)return;
  const xc=dx*Rc[0]+dy*Rc[1]+dz*Rc[2],yc=dx*U[0]+dy*U[1]+dz*U[2],sx=CAM.cx+f*xc/zc+SHX,sy=CAM.cy-f*yc/zc+SHY;
  /* Jacobian of the projection at the face centre applied to the disc axes */
  const J=(wx,wy,wz,o)=>{const a=wx*Rc[0]+wy*Rc[1]+wz*Rc[2],b=wx*U[0]+wy*U[1]+wz*U[2],c=wx*F[0]+wy*F[1]+wz*F[2];JJ[o]=f*(a-xc*c/zc)/zc;JJ[o+1]=-f*(b-yc*c/zc)/zc;return c;};
  const uF=J(ux*R,uy*R,uz*R,0),vF=J(vx*R,vy*R,vz*R,2),nF=J(nx,ny,nz,4);
  const sux=JJ[0],suy=JJ[1],svx=JJ[2],svy=JJ[3],snx=JJ[4],sny=JJ[5];
  let det=sux*svy-svx*suy;if(Math.abs(det)<.45)det=det<0?-.45:.45;        // seen edge-on: keep a one-dot sliver
  const i00=svy/det,i01=-svx/det,i10=-suy/det,i11=sux/det,ma=i00*snx+i01*sny,mb=i10*snx+i11*sny,mm=ma*ma+mb*mb,h2=2*h;
  const exx=Math.sqrt(sux*sux+svx*svx),eyy=Math.sqrt(suy*suy+svy*svy),bx=-h2*snx,by=-h2*sny;
  const x0=Math.max(0,Math.floor(sx+Math.min(0,bx)-exx)),x1=Math.min(W-1,Math.ceil(sx+Math.max(0,bx)+exx));
  const y0=Math.max(0,Math.floor(sy+Math.min(0,by)-eyy)),y1=Math.min(H-1,Math.ceil(sy+Math.max(0,by)+eyy));
  if(x0>x1||y0>y1)return;
  /* lighting terms per coin (the per-pixel normal is a small bump around them) */
  const ll=Math.sqrt(LX*LX+LY*LY+LZ*LZ),lx=LX/ll,ly=LY/ll,lz=LZ/ll;let hx=lx+Vx,hy=ly+Vy,hz=lz+Vz;const hl=Math.sqrt(hx*hx+hy*hy+hz*hz);hx/=hl;hy/=hl;hz/=hl;
  const nL=nx*lx+ny*ly+nz*lz,uL=ux*lx+uy*ly+uz*lz,vL=vx*lx+vy*ly+vz*lz,nH=nx*hx+ny*hy+nz*hz,uH=ux*hx+uy*hy+uz*hz,vH=vx*hx+vy*hy+vz*hz;
  const nV=nx*Vx+ny*Vy+nz*Vz,uV=ux*Vx+uy*Vy+uz*Vz,vV=vx*Vx+vy*Vy+vz*Vz;
  const design=kind===3?3:kind===2?(sg>0?2:4):(sg>0?0:1),E=EMB[design][Math.sqrt(Math.abs(det))<6?1:0],EG=E.G,EMt=E.mat,EH=E.hgt,EN=E.N;
  const base=COINCOL[kind],gem=GEMCOL[hue&3],BUMP=.9;
  const ar=base[0],ag=base[1],ab=base[2];
  let bestS=0,bx_=0,by_=0;
  for(let py=y0;py<=y1;py++){
    const ddy=py+.5-sy;let qa=i00*(x0+.5-sx)+i01*ddy,qb=i10*(x0+.5-sx)+i11*ddy;
    for(let px_=x0;px_<=x1;px_++,qa+=i00,qb+=i10){
      const r2=qa*qa+qb*qb,idx=py*W+px_;
      let a=qa,b=qb,tt=0,rim=false;
      if(r2>1){if(mm<1e-9)continue;tt=-(qa*ma+qb*mb)/mm;tt=tt<0?0:tt>h2?h2:tt;a=qa+tt*ma;b=qb+tt*mb;if(a*a+b*b>1)continue;rim=true;}
      const depth=zc+a*uF+b*vF-tt*nF;if(depth>=ZB[idx])continue;ZB[idx]=depth;
      let NL_,NH_,NV_,Ny,Nx,cr=ar,cg=ag,cb=ab,mat=0,pol=1;
      if(!rim){
        const ix=((a+1)*EN*.5)|0,iy=((b+1)*EN*.5)|0,e=(iy<0?0:iy>=EN?EN-1:iy)*EN+(ix<0?0:ix>=EN?EN-1:ix),gx=EG[e*2]*BUMP,gy=EG[e*2+1]*BUMP,hh=EH[e];mat=EMt[e];
        NL_=nL-gx*uL-gy*vL;NH_=nH-gx*uH-gy*vH;NV_=nV-gx*uV-gy*vV;Ny=ny-gx*uy-gy*vy;Nx=nx-gx*ux-gy*vx;
        if(mat===1){if(kind===2){cr=.8;cg=.06;cb=.1;}else{cr=gem[0];cg=gem[1];cb=gem[2];}pol=kind===2?0:1;}
        else if(mat===3){cr*=.6;cg*=.6;cb*=.62;pol=0;}
        else if(hh<.5){const k=.58+.3*hh;cr*=k;cg*=k;cb*=k;pol=0;}          // recessed field: satin, darker; raised relief stays polished
      }else{
        const rl=1/Math.sqrt(a*a+b*b),ra=a*rl,rb=b*rl;                 // rim: radial normal in the disc plane
        NL_=ra*uL+rb*vL;NH_=ra*uH+rb*vH;NV_=ra*uV+rb*vV;Ny=ra*uy+rb*vy;Nx=ra*ux+rb*vx;
        const k=.62-.3*tt/h2;cr*=k;cg*=k;cb*=k;
      }
      /* metal: diffuse + environment reflection (lamps) + specular: sharp on polished relief, broad and weak on satin */
      const Rx=2*NV_*Nx-Vx,Ry=2*NV_*Ny-Vy;let ei=((Rx+1)*7.5)|0,ej=((Ry+1)*7.5)|0;ei=ei<0?0:ei>15?15:ei;ej=ej<0?0:ej>15?15:ej;const ek=ej*16+ei;
      const si=NH_<=0?0:NH_>=1?255:(NH_*255)|0;let sp=pol?SPEC[si]:SPEC2[si];if(mat===1&&kind===3)sp*=1.5;
      const dif=NL_>0?NL_:0,am=(.09+.5*dif)*ao,en=pol?.7*ao+.15:.28*ao;
      let r=cr*(am+ENVR[ek]*en)+sp*(.3+.7*cr)*1.25+glow*cr,gg=cg*(am+ENVG[ek]*en)+sp*(.3+.7*cg)*1.25+glow*cg,bb=cb*(am+ENVB[ek]*en)+sp*(.3+.7*cb)*1.25+glow*cb;
      if(mat===1&&kind===3){r+=cr*.25;gg+=cg*.25;bb+=cb*.25;}              // gems glow a little from within
      RBUF[idx]=(0xff000000|(((bb>=1?255:bb*255)&255)<<16)|(((gg>=1?255:gg*255)&255)<<8)|((r>=1?255:r*255)&255))>>>0;
      if(sp>bestS){bestS=sp;bx_=px_;by_=py;}
    }}
  if(bestS>.5&&lively>0)addGlint(bx_,by_,bestS*lively);
}
const JJ=new Float64Array(6);let SHX=0,SHY=0;
/* all live coins, nearest first so hidden pixels fail the depth test before any shading */
const DORD=new Int32Array(NB),DKEY=new Float64Array(NB);
function drawCoins(t){
  let n=0;const F=CAM.F;
  for(let k=0;k<NL;k++){const i=LIVE[k];if(BY[i]<-3.6)continue;DORD[n]=i;DKEY[i]=(BX[i]-CAM.ex)*F[0]+(BY[i]-CAM.ey)*F[1]+(BZ[i]-CAM.ez)*F[2];n++;}
  for(let a=1;a<n;a++){const v=DORD[a],kv=DKEY[v];let b=a-1;while(b>=0&&DKEY[DORD[b]]>kv){DORD[b+1]=DORD[b];b--;}DORD[b+1]=v;}   // insertion sort: nearly sorted frame to frame
  NGL=0;
  for(let k=0;k<n;k++){const i=DORD[k],o=i*9,kind=KIND[i];
    const mv=Math.min(1,(Math.abs(WX[i])+Math.abs(WZ[i]))*.3+Math.abs(VY[i])*.08)+(SLP[i]?0:.15);
    const ao=Math.max(.38,1-COVER[i]*.17)*(BY[i]<0?Math.max(.25,1+BY[i]*.25):1)*(.9+.1*Math.min(1,BY[i]));
    let glow=0;if(kind===2)glow=.12+.1*Math.sin(t*6+i);else if(kind===3)glow=.06+.05*Math.sin(t*3+i);
    drawCoin(BX[i],BY[i],BZ[i],RM[o],RM[o+3],RM[o+6],RM[o+1],RM[o+4],RM[o+7],RM[o+2],RM[o+5],RM[o+8],BR[i],BH[i],kind,HUE[i],ao,glow+SPK[i],mv);
  }
}
/* glints: a hot centre and four soft rays; the bloom pass turns them into stars */
function drawGlints(t){
  for(let k=0;k<NGL;k++){const s=GLS[k];if(s<.35)continue;const x=GLX[k]|0,y=GLY[k]|0,L=s>1.2?3:s>.7?2:1,tw=.6+.4*Math.sin(t*20+k*7);
    const c=255*Math.min(1,s)*tw;addPx(y*W+x,c,c,c*.9);
    for(let d=1;d<=L;d++){const f=c*(1-d/(L+1))*.8;
      if(x+d<W)addPx(y*W+x+d,f,f,f*.8);if(x-d>=0)addPx(y*W+x-d,f,f,f*.8);if(y+d<H)addPx((y+d)*W+x,f,f,f*.8);if(y-d>=0)addPx((y-d)*W+x,f,f,f*.8);}}
}
/* a filled screen quad with a depth (used for the chute carriage and rail) */
function quadZ(x0,y0,x1,y1,z,c){x0=Math.max(0,Math.round(x0));x1=Math.min(W-1,Math.round(x1));y0=Math.max(0,Math.round(y0));y1=Math.min(H-1,Math.round(y1));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;if(z<ZB[i]){ZB[i]=z;RBUF[i]=c;}}}
