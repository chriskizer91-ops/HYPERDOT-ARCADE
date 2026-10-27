/* =====================================================================================
   9. GAME — WHACK SHACK. A 3x3 garden of burrows at dusk, critters that pop, one padded mallet.

   The heart of this cabinet is CHARACTER ANIMATION, done procedurally:
     * every critter is a RIG of shaded ellipsoids (body, belly, head, ears, eyes, lids, brows,
       mouth, teeth, tongue, whiskers, paws, props) placed through a small affine transform
       stack. Squash, stretch, lean and head tilt are just matrices on that stack, so the same
       rig plays every pose; there is not a single sprite frame in the file;
     * every moving part is a damped spring, and children are driven by their parent's
       ACCELERATION (ears, whiskers, moustache, the king's crown), which is where follow-through
       and overlapping action come from without keyframing anything;
     * a per-critter state machine sequences the acting: anticipation (rustle, dirt puff),
       pop with overshoot, idle (breathing, blinks, saccades, watching the mallet), laugh,
       duck, bonk (squash + X eyes), dizzy (spiral eyes, orbiting stars) and sink;
     * the mallet is a rig too: eased wind-down swing, arc smear, padded-head squash,
       one-tick impact silhouette frame and hit-stop.
   Rendering: primitives rasterize into a LAYER (colour + stamp buffer), which is then
   composited onto RBUF with a burrow clip, a 1-px ink outline, burrow occlusion and optional
   tint / shimmer / silhouette. Shading is per-pixel (analytic ellipsoid normals) quantized to
   hue-shifted tone ramps with 4x4 Bayer dithering, which is what reads best as LED dots.
   ===================================================================================== */

/* ---------- 9.1 maths: springs, easing, a 2D affine transform stack ---------- */
const SP=(x=0)=>({x,v:0});
/* semi-implicit Euler damped spring toward tgt (w = angular frequency, z = damping ratio).
   Returns the acceleration so children can be driven by it (follow-through). */
function spr(s,tgt,w,z,dt){const a=w*w*(tgt-s.x)-2*z*w*s.v;s.v+=a*dt;s.x+=s.v*dt;return a;}
/* the same spring with an external force term (used for inertia-driven parts) */
function sprF(s,tgt,w,z,f,dt){const a=w*w*(tgt-s.x)-2*z*w*s.v+f;s.v+=a*dt;s.x+=s.v*dt;return a;}
const frac=v=>v-Math.floor(v);
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);

/* current transform: x' = Xa*x + Xc*y + Xe ; y' = Xb*x + Xd*y + Xf (canvas convention, y down).
   Positive rotations turn clockwise on screen. */
const XS=new Float64Array(6*40);let XI=0,Xa=1,Xb=0,Xc=0,Xd=1,Xe=0,Xf=0;
function xReset(){XI=0;Xa=1;Xb=0;Xc=0;Xd=1;Xe=0;Xf=0;}
function xPush(){const o=XI*6;XS[o]=Xa;XS[o+1]=Xb;XS[o+2]=Xc;XS[o+3]=Xd;XS[o+4]=Xe;XS[o+5]=Xf;XI++;}
function xPop(){XI--;const o=XI*6;Xa=XS[o];Xb=XS[o+1];Xc=XS[o+2];Xd=XS[o+3];Xe=XS[o+4];Xf=XS[o+5];}
function xT(x,y){Xe+=Xa*x+Xc*y;Xf+=Xb*x+Xd*y;}
function xS(sx,sy){Xa*=sx;Xb*=sx;Xc*=sy;Xd*=sy;}
function xR(r){const c=Math.cos(r),s=Math.sin(r),a=Xa,b=Xb;Xa=a*c+Xc*s;Xb=b*c+Xd*s;Xc=Xc*c-a*s;Xd=Xd*c-b*s;}
function xK(k){Xc+=Xa*k;Xd+=Xb*k;}                 /* shear: x += k*y (lean that keeps the base planted) */
const wx=(x,y)=>Xa*x+Xc*y+Xe,wy=(x,y)=>Xb*x+Xd*y+Xf;

/* ---------- 9.2 the rasterizer ----------
   An ellipse is the image of the unit disc under the current transform. We keep its inverse
   matrix, so a pixel p maps to q = Minv (p - c) and is inside when |q| < 1. The ellipsoid
   normal in screen space is Minv^T q (scaled by the mean radius) with nz = sqrt(1-|q|^2):
   exact for the affine image of a sphere, so squashed and sheared parts still shade right. */
function mkG(){return {cx:0,cy:0,i0:0,i1:0,i2:0,i3:0,n0:0,n1:0,n2:0,n3:0,x0:0,y0:0,x1:0,y1:0,r:1};}
const GPOOL=[];for(let i=0;i<64;i++)GPOOL.push(mkG());let GPI=0;
function geo(cx,cy,rx,ry,rot){
  const G=GPOOL[GPI];GPI=(GPI+1)&63;
  const c=rot?Math.cos(rot):1,s=rot?Math.sin(rot):0;
  const ax=rx*c,ay=rx*s,bx=-ry*s,by=ry*c;
  const A0=Xa*ax+Xc*ay,A1=Xb*ax+Xd*ay,B0=Xa*bx+Xc*by,B1=Xb*bx+Xd*by;
  let det=A0*B1-B0*A1;if(Math.abs(det)<1e-6)det=det<0?-1e-6:1e-6;
  G.cx=Xa*cx+Xc*cy+Xe;G.cy=Xb*cx+Xd*cy+Xf;
  G.i0=B1/det;G.i1=-B0/det;G.i2=-A1/det;G.i3=A0/det;
  const r=Math.sqrt(Math.abs(det));G.r=r;
  G.n0=G.i0*r;G.n1=G.i2*r;G.n2=G.i1*r;G.n3=G.i3*r;
  const ex=Math.sqrt(A0*A0+B0*B0),ey=Math.sqrt(A1*A1+B1*B1);
  G.x0=G.cx-ex;G.x1=G.cx+ex;G.y0=G.cy-ey;G.y1=G.cy+ey;
  return G;
}
/* q-space threshold that leaves a band about p pixels wide at the rim (for outlines / rings) */
function ringK(G,p){const t=Math.max(0,1-p/Math.max(.5,G.r));return t*t;}

/* key light from upper-left-front, its half vector, and a cool dusk rim from the right */
const LX=-.498,LY=-.647,LZ=.577,HX=-.28,HY=-.364,HZ=.888,RX=.97,RY=-.24;

/* a material: hue-shifted tone ramp (shadows drift toward violet, lights toward warm cream) */
function M0(){return {ramp:null,n:0,amb:.16,dif:.95,spec:0,hi:0,rim:0,rimc:0,flat:0,dark:0,dith:0,tint:0,tc:0,fx:0,vg:0,tex:0,c1:0,c2:0};}
function mkMat(hex,o){
  o=o||{};const M=M0(),n=o.n||6,b=hexRGB(hex),lo=hexRGB(o.lo||'#2a1442'),wm=hexRGB(o.warm||'#fff0c8');
  const gn=o.gain==null?.9:o.gain,b0=b.map(v=>v*gn),dark=mixC(b0.map(v=>v*(o.dk==null?.3:o.dk)),lo,.42),light=mixC(b0,wm,o.lt==null?.3:o.lt);
  M.ramp=new Uint32Array(n);M.n=n;
  for(let i=0;i<n;i++){const t=i/(n-1),c=t<.58?mixC(dark,b0,t/.58):mixC(b0,light,(t-.58)/.42);M.ramp[i]=pack(c[0],c[1],c[2]);}
  const hi=hexRGB(o.hi||'#fffdf2'),rc=mixC(light,hexRGB(o.rimc||'#9cc2ff'),.4);
  M.amb=o.amb==null?.16:o.amb;M.dif=o.dif==null?.95:o.dif;M.spec=o.spec||0;M.hi=pack(hi[0],hi[1],hi[2]);
  M.rim=o.rim==null?1:o.rim;M.rimc=pack(rc[0],rc[1],rc[2]);M.tex=o.tex||0;M.vg=o.vg||0;return M;
}
function flatMat(hex){const M=M0(),c=hexRGB(hex);M.flat=pack(c[0],c[1],c[2]);return M;}
function darkMat(k,dith){const M=M0();M.dark=k;M.dith=dith||0;return M;}          /* multiplies what is already there */
function tintMat(hex,a){const M=M0(),c=hexRGB(hex);M.tint=a;M.tc=pack(c[0],c[1],c[2]);return M;}
function mulC(c,k){return (0xff000000|(((c>>>16&255)*k)<<16)|(((c>>>8&255)*k)<<8)|((c&255)*k))>>>0;}
function mixP(c,d,t){const r=c&255,g_=c>>>8&255,b=c>>>16&255;return pack(r+((d&255)-r)*t,g_+((d>>>8&255)-g_)*t,b+((d>>>16&255)-b)*t);}
function addC(c,v){const r=(c&255)+v,g_=(c>>>8&255)+v,b=(c>>>16&255)+v;return (0xff000000|((b>255?255:b)<<16)|((g_>255?255:g_)<<8)|(r>255?255:r))>>>0;}

/* render target: either the shared LAYER (colour + stamp, bbox tracked) or RBUF directly */
let U=1,LC=null,LST=null,NZ=null,STAMP=1,TCOL=null,TST=null,LX0=0,LY0=0,LX1=-1,LY1=-1,FXT=0,YCLIP=1e9;   /* YCLIP: rows below it will be clipped anyway, so skip them */
const OUTL=pack(22,10,26),WHITE=pack(255,255,255);
function newLayer(){STAMP++;LX0=W;LY0=H;LX1=-1;LY1=-1;TCOL=LC;TST=LST;}
function toRBUF(){TCOL=RBUF;TST=null;}

/* fill one primitive. shape 0 = ellipse (sphere normal), 1 = squircle shaded as a cylinder whose
   axis is the local y (cross-section along x), 2 = squircle cylinder with axis along local x.
   clip: another geo the pixel must be inside of (or outside of, when out = true);
   cLo/cHi: keep only q.y in that range (half-ellipses, lids); ring: keep only the rim band. */
function fillE(G,M,clip=null,cLo=-9,cHi=9,ring=0,out=false,shape=0){
  let x0=Math.floor(G.x0),x1=Math.ceil(G.x1),y0=Math.floor(G.y0),y1=Math.min(Math.ceil(G.y1),YCLIP);
  if(x0<0)x0=0;if(y0<0)y0=0;if(x1>W-1)x1=W-1;if(y1>H-1)y1=H-1;if(x0>x1||y0>y1)return;
  const cx=G.cx,cy=G.cy,i0=G.i0,i1=G.i1,i2=G.i2,i3=G.i3,n0=G.n0,n1=G.n1,n2=G.n2,n3=G.n3;
  const flat=M.flat,dk=M.dark,dith=M.dith,tn=M.tint,fx=M.fx,vg=M.vg,ramp=M.ramp,nn=M.n,amb=M.amb,dif=M.dif,spec=M.spec,rim=M.rim,tex=M.tex;
  const T=TCOL,ST=TST,stp=STAMP;let any=false;
  for(let y=y0;y<=y1;y++){
    const dy=y+.5-cy,bi=(y&3)<<2,row=y*W;
    for(let x=x0;x<=x1;x++){
      const dx=x+.5-cx,qx=i0*dx+i1*dy,qy=i2*dx+i3*dy;
      let d;if(shape===0)d=qx*qx+qy*qy;else{const a=qx*qx,b=qy*qy;d=a*a+b*b;}
      if(d>=1||qy<cLo||qy>cHi||d<ring)continue;
      if(clip!==null){const ex=x+.5-clip.cx,ey=y+.5-clip.cy,ux=clip.i0*ex+clip.i1*ey,uy=clip.i2*ex+clip.i3*ey;if((ux*ux+uy*uy<1)===out)continue;}
      const i=row+x;
      if(dk){if(ST!==null&&ST[i]!==stp)continue;if(dith&&BAY4[bi|(x&3)]>dith*(1.15-d))continue;T[i]=mulC(T[i],dk);continue;}
      if(tn){if(ST!==null&&ST[i]!==stp)continue;T[i]=mixP(T[i],M.tc,tn);continue;}
      let col;
      if(flat)col=flat;
      else if(fx===1){col=frac(Math.atan2(qy,qx)/TAU+Math.sqrt(d)*1.6-FXT*1.3)<.42?M.c1:M.c2;}
      else{
        let nx,ny,nz;
        if(shape===0){nx=n0*qx+n1*qy;ny=n2*qx+n3*qy;nz=Math.sqrt(1-d);}
        else if(shape===1){nx=n0*qx;ny=n2*qx;nz=Math.sqrt(Math.max(0,1-qx*qx));}
        else{nx=n1*qy;ny=n3*qy;nz=Math.sqrt(Math.max(0,1-qy*qy));}
        const il=1/Math.sqrt(nx*nx+ny*ny+nz*nz+1e-9);nx*=il;ny*=il;nz*=il;
        if(spec&&nx*HX+ny*HY+nz*HZ>spec)col=M.hi;
        else if(rim&&nz<.3&&nx*RX+ny*RY>.6)col=M.rimc;
        else{
          const dl=nx*LX+ny*LY+nz*LZ;
          const l=vg?Math.pow(Math.max(0,(1-qy)*.5),1.7)*.95:amb+dif*(dl>0?dl:0);
          let k=Math.floor(l*nn+BAY4[bi|(x&3)]-.5+(tex?(NZ[i]-1.5)*tex:0));
          k=k<0?0:k>=nn?nn-1:k;col=ramp[k];
        }
      }
      T[i]=col;if(ST!==null)ST[i]=stp;any=true;
    }
  }
  if(any&&ST!==null){if(x0<LX0)LX0=x0;if(x1>LX1)LX1=x1;if(y0<LY0)LY0=y0;if(y1>LY1)LY1=y1;}
}
/* points, lines and strokes in world or local (transformed) coordinates */
function plot(x,y,col){x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;TCOL[i]=col;
  if(TST!==null){TST[i]=STAMP;if(x<LX0)LX0=x;if(x>LX1)LX1=x;if(y<LY0)LY0=y;if(y>LY1)LY1=y;}}
function lineW(x0,y0,x1,y1,col){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let k=0;k<=n;k++)plot(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,col);}
function lineL(x0,y0,x1,y1,col){lineW(wx(x0,y0),wy(x0,y0),wx(x1,y1),wy(x1,y1),col);}
function plotL(x,y,col){plot(wx(x,y),wy(x,y),col);}
/* a stroke w local units wide: several parallel 1-px lines once it is thicker than a dot */
function strokeL(x0,y0,x1,y1,col,w){
  const ax=wx(x0,y0),ay=wy(x0,y0),bx=wx(x1,y1),by=wy(x1,y1);
  const wp=w*Math.sqrt(Math.abs(Xa*Xd-Xb*Xc));if(wp<1.3){lineW(ax,ay,bx,by,col);return;}
  let nx=-(by-ay),ny=bx-ax;const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;
  for(let o=-(wp-1)/2;o<=(wp-1)/2+.01;o+=.5)lineW(ax+nx*o,ay+ny*o,bx+nx*o,by+ny*o,col);
}
/* flat triangle in local coordinates (crown points, flames) */
function triL(ax,ay,bx,by,cx,cy,col){
  const x0_=wx(ax,ay),y0_=wy(ax,ay),x1_=wx(bx,by),y1_=wy(bx,by),x2_=wx(cx,cy),y2_=wy(cx,cy);
  const mnx=Math.max(0,Math.floor(Math.min(x0_,x1_,x2_))),mxx=Math.min(W-1,Math.ceil(Math.max(x0_,x1_,x2_)));
  const mny=Math.max(0,Math.floor(Math.min(y0_,y1_,y2_))),mxy=Math.min(H-1,Math.ceil(Math.max(y0_,y1_,y2_)));
  const ar=(x1_-x0_)*(y2_-y0_)-(y1_-y0_)*(x2_-x0_);if(Math.abs(ar)<1e-6)return;const sg=ar>0?1:-1;
  for(let y=mny;y<=mxy;y++)for(let x=mnx;x<=mxx;x++){const px_=x+.5,py_=y+.5;
    const e0=((x1_-x0_)*(py_-y0_)-(y1_-y0_)*(px_-x0_))*sg,e1=((x2_-x1_)*(py_-y1_)-(y2_-y1_)*(px_-x1_))*sg,e2=((x0_-x2_)*(py_-y2_)-(y0_-y2_)*(px_-x2_))*sg;
    if(e0>=0&&e1>=0&&e2>=0)plot(x,y,col);}
}

/* ---------- 9.3 the compositor: layer -> RBUF ----------
   clip: Int16Array of per-column y limits (the burrow's front rim) or null.
   sil: 0 colour, 1 white impact silhouette. ta: tint toward (tc) by ta. shim: golden shine band.
   ao: darken pixels close to the rim (the burrow occludes light near its mouth). */
function compose(clip,sil,tc,ta,shim,ao){
  if(LX1<LX0)return;
  const x0=Math.max(0,LX0-1),x1=Math.min(W-1,LX1+1),y0=Math.max(0,LY0-1),y1=Math.min(H-1,LY1+1),s=STAMP;
  const aoN=ao*U,sh=shim?shim:0;
  for(let y=y0;y<=y1;y++){const row=y*W,bi=(y&3)<<2;
    for(let x=x0;x<=x1;x++){
      const lim=clip!==null?clip[x]:H;if(y>=lim)continue;
      const i=row+x;
      if(LST[i]===s){
        if(sil){RBUF[i]=WHITE;continue;}
        let c=LC[i];
        if(ta>0)c=mixP(c,tc,ta);
        if(sh&&frac((x-y*.6)/(26*U)-sh)<.09)c=addC(c,90);
        if(aoN>0&&clip!==null){const dd=lim-y;if(dd<aoN){const k=(dd+BAY4[bi|(x&3)]*1.6)/aoN;if(k<1)c=mulC(c,.42+.58*k);}}
        RBUF[i]=c;
      }else if((x>0&&LST[i-1]===s)||(x<W-1&&LST[i+1]===s)||(y>0&&LST[i-W]===s)||(y<H-1&&LST[i+W]===s))RBUF[i]=OUTL;
    }
  }
}
/* integer screen shake: memmove the frame in place (no allocation) */
function shiftBuf(dx,dy,fillc){
  if(!dx&&!dy)return;
  if(dy>0){RBUF.copyWithin(dy*W,0,(H-dy)*W);RBUF.fill(fillc,0,dy*W);}
  else if(dy<0){RBUF.copyWithin(0,-dy*W,H*W);RBUF.fill(fillc,(H+dy)*W,H*W);}
  if(dx)for(let y=0;y<H;y++){const r=y*W;if(dx>0){RBUF.copyWithin(r+dx,r,r+W-dx);RBUF.fill(fillc,r,r+dx);}else{RBUF.copyWithin(r,r-dx,r+W);RBUF.fill(fillc,r+W+dx,r+W);}}
}
