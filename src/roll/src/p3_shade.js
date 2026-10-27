/* =====================================================================================
   9c. DEFERRED SHADING in two passes.
   STATIC (only when the camera moves, alongside the raster): every dot gets its lit base colour
   from the G-buffer (face light, procedural planks / arrows / ring zones / painted numbers / hole
   tubes) plus a one-byte "dynamic code", an index and a weight saying what live light it carries
   (a rail lamp, a lamp's spill on the wood, a ring lip, a neon letter...).
   DYNAMIC (every frame): base + the live part of its code, ball shadow (shadow ray vs sphere) and
   contact occlusion inside the shadow's screen rect, coloured point lights inside their rects,
   then ordered dither to 6 bits per channel. Holding still, a frame costs about one pass of adds.
   ===================================================================================== */
const LAMPN=()=>LAMPZ.length;
let LAMPV=null,LAMPT=null,LAMPC=null;   /* brightness (lagged), target, colour index; [side*N+k] */
const LAMPCOL=[[255,176,64],[255,255,240],[255,60,90],[70,200,255],[110,255,120],[255,80,220]];
const CHEV=new Float32Array(6);          /* side-wall chase lamps (target box), brightness */
const SIGN=new Float32Array(3);          /* back wall neon: 100 L, 100 R, title */
const LIGHTS=[];                         /* {x,y,z,r,g,b,i,k} transient point lights */
let CASTN=0;const CAST=new Float32Array(3*8);
/* glyph masks for paint / neon: string -> {w,h,m} using the 3x5 font */
function mask3(s){const w=tw3(s),m=new Uint8Array(w*5);let x=0;for(const ch of s){const gg=G3[ch];if(!gg){x+=4;continue;}for(let r=0;r<5;r++)for(let c=0;c<gg[r].length;c++)if(gg[r][c]==='1')m[r*w+x+c]=1;x+=gg[0].length+1;}return {w,h:5,m};}
const PAINT=[];   /* numbers painted on the board, in board (u,v) */
const NEON=[];    /* neon lettering on the back wall, in wall (x,y) */
const glyphSpot=(cx,cy,cell,mk,ring,sig,col)=>({cx,cy,cell,mk,ring,sig,col,hw:mk.w*cell/2,hh:2.5*cell});
function buildPaint(){
  PAINT.length=0;NEON.length=0;
  for(let h=0;h<4;h++){const ho=HOLES[h],mk=mask3(String(ho.val));for(const s of [-1,1])PAINT.push(glyphSpot(s*.106,ho.v+.02,.0105,mk,ho.ring,0,null));}
  const m10=mask3('10');for(const s of [-1,1])PAINT.push(glyphSpot(s*.335,.055,.012,m10,0,0,null));
  const m1=mask3('100');for(const s of [0,1])NEON.push(glyphSpot((s?1:-1)*.25,YTOP+.085,.017,m1,0,s,RCOL[100]));
  NEON.push(glyphSpot(0,YTOP+.215,.0145,mask3('RING ROLLER'),0,2,[80,220,255]));
}
/* which glyph spot covers (a,b)? bounding-box reject first, then one mask lookup */
function paintAt(list,a,b){
  for(let k=0;k<list.length;k++){const p=list[k],dx=a-p.cx+p.hw;if(dx<0||dx>=2*p.hw)continue;const dy=p.cy-b+p.hh;if(dy<0||dy>=2*p.hh)continue;
    if(p.mk.m[((dy/p.cell)|0)*p.mk.w+((dx/p.cell)|0)])return k;}return -1;}
const hash1=n=>{n=Math.imul(n^61^(n>>>16),9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);return ((n^n>>>15)>>>0)/4294967296;};
const nlamp=(k,s,ln,t)=>{const v=Math.sin(k*.8-t*(2.6+ln*.4)+s*1.3+ln);return .12+.6*(v>0?v*v*v:0);};
const DY={NONE:0,LAMP:1,HALO:2,SPILL:3,LIP:4,ZONE:5,HOLE:6,PAINT:7,NEON:8,CHEV:9,TOPB:10,WALLB:11,NLAMP:12,NHALO:13,NSPILL:14,CHROME:15,CHEVH:16};
let SR=null,SG=null,SBL=null,DT=null,DA=null,DK=null;
RESCB.push(()=>{const n=W*H;SR=new Float32Array(n);SG=new Float32Array(n);SBL=new Float32Array(n);DT=new Uint8Array(n);DA=new Int16Array(n);DK=new Float32Array(n);});
function shadeStatic(){
  const {ex,ey,ez,fx,fy,fz,rx,ry,rz,ux,uy,uz,F,cx,cy}=CAM,HW=PH.HW,N=LAMPN();
  const B=[0,0,0],pitch=Math.asin(clamp(fy,-1,1));
  for(let y=Y0;y<H;y++){
    const py=-(y+.5-cy)/F;
    for(let x=0;x<W;x++){
      const i=y*W+x,id=GF[i];let r,g,b,er=0,eg=0,eb=0,lit,dt=0,da=0,dk=0;
      if(id<0){ /* backdrop: dark gradient with soft distant arcade glows */
        const px=(x+.5-cx)/F,el=py+pitch;let k=.5+.5*clamp(el*2,-1,1);r=10+14*k;g=6+8*k;b=18+26*k;
        const gl=Math.exp(-((px+.9)*(px+.9)*6+(el-.25)*(el-.25)*40))*60+Math.exp(-((px-1.1)*(px-1.1)*5+(el-.3)*(el-.3)*30))*50;
        SR[i]=r+gl*.9;SG[i]=g+gl*.2;SBL[i]=b+gl;DT[i]=0;continue;}
      const z=1/GZ[i],px=(x+.5-cx)/F,dx=fx+px*rx+py*ux,dy=fy+px*ry+py*uy,dz=fz+px*rz+py*uz;
      const XW=ex+dx*z,Y=ey+dy*z,Z=ez+dz*z,m=TMAT[id],ln=TLN[id],X=XW-ln*PITCH;   /* X is lane-local */
      r=TR[id];g=TG[id];b=TBL[id];lit=TLIT[id];
      switch(m){
        case MT.LANE:case MT.HUMP:{
          const pl=(X+HW)/.0525,pi=Math.floor(pl),fp=pl-pi,tone=.86+.14*hash1(pi*7+3),gr=.93+.07*Math.sin(Z*41+pi*7.1+Math.sin(Z*6.3+pi)*2.2);
          const fw=z/F/.0525*.55;let k=tone*gr*(.66+.24*Math.exp(-X*X*9));
          if(fw<.45&&(fp<fw||fp>1-fw))k*=.62+.3*(fw/.45);
          r*=k;g*=k;b*=k;
          if(m===MT.LANE){
            if(Z>.235&&Z<.25){r=225;g=40;b=56;er=40;}
            const dzc=.74-Z;if(dzc>0&&dzc<.11)for(let a=-2;a<=2;a++){const d=Math.abs(X-a*.12);if(d<dzc*.42&&d>dzc*.42-.02){r=255;g=180;b=60;er=60;eg=36;eb=6;}}
          }else{const tt=(Z-PH.ZH0)/(PH.ZL-PH.ZH0);if((tt>.3&&tt<.37)||(tt>.6&&tt<.67)){r=250;g=205;b=70;er=50;eg=40;eb=10;}}
          const dr=HW-Math.abs(X);if(dr<.12&&N){const s=X<0?0:1;let kk=Math.round((Z-LAMPZ[0])/.15);if(kk<0)kk=0;if(kk>=N)kk=N-1;
            const f=1-dr/.12;dk=f*f*Math.max(0,1-Math.abs(Z-LAMPZ[kk])/.12)*.9;if(dk>.004){dt=ln?DY.NSPILL:DY.SPILL;da=ln?kk|s<<5|(ln+1)<<6:s*N+kk;}}
          break;}
        case MT.CHROME:dt=DY.CHROME;dk=X*30;break;
        case MT.RAILIN:{const hy=Y-laneY(Math.min(Z,PH.ZL));if(Z<PH.ZL-.005&&hy>RAIL_H-.01&&hy<=RAIL_H+.001){er=150;eg=30;eb=80;}break;}
        case MT.RAILTOP:{
          const s=X<0?0:1;let kk=Math.round((Z-LAMPZ[0])/.15);if(kk<0)kk=0;if(kk>=N)kk=N-1;
          const lx=(s?1:-1)*(HW+RAIL_W/2),ddx=X-lx,ddz=Z-LAMPZ[kk],d=Math.sqrt(ddx*ddx+ddz*ddz);da=ln?kk|s<<5|(ln+1)<<6:s*N+kk;
          if(d<.017){dt=ln?DY.NLAMP:DY.LAMP;dk=1-d/.017;r=g=b=40;}else if(d<.05){dt=ln?DY.NHALO:DY.HALO;dk=1-d/.05;}
          break;}
        case MT.SIDE:{
          const hb=Y-(YB0+(Z-ZB0)*SINP/COSP),yt=lerp(Y_LIP+SIDE_F,YTOP+SIDE_H,(Z-PH.ZL)/(ZTOP-PH.ZL));
          if(Y>yt-.012){er=160;eg=40;eb=200;}
          else{let k=Math.round((Z-ZB0-.06)/.155);if(k<0)k=0;if(k>5)k=5;const dzl=Z-(ZB0+.06+k*.155),dhl=hb-.17,d=Math.sqrt(dzl*dzl+dhl*dhl);
            if(d<.021){r=g=b=40;if(ln){er=30;eg=60;eb=70;}else{dt=DY.CHEV;da=k;dk=1-d/.021;}}else if(d<.06&&!ln){dt=DY.CHEVH;da=k;dk=1-d/.06;}}
          const v2=(Y*7+Z*3)%.2;if(v2<.01){r*=1.25;g*=1.25;b*=1.25;}
          break;}
        case MT.BACK:{
          const k=paintAt(NEON,X,Y);
          if(k>=0){const n=NEON[k],q=ln?.62:.35;er=n.col[0]*q;eg=n.col[1]*q;eb=n.col[2]*q;r=n.col[0]*.3;g=n.col[1]*.3;b=n.col[2]*.3;if(!ln){dt=DY.NEON;da=k;}}
          else{const bx=Math.floor((X+HW)/.035);if(Y>YTOP+SIDE_H-.03&&Math.abs(((X+HW)/.035-bx)-.5)<.32){dt=DY.TOPB;da=bx+(ln+1)*7;}}
          break;}
        case MT.BOARD:{
          const hh=GH[i];
          if(hh>=0){ /* inside a hole: far wall of the tube, lit at the rim by the ring's colour */
            const ho=HOLES[hh],c=RINGS[ho.ring].col,dep=GHD[i]/PH.HOLED,f=(1-dep)*(1-dep);
            r=c[0]*f*.35*.5;g=c[1]*f*.35*.5;b=c[2]*f*.35*.5;lit=1;if(dep<.08){er=c[0]*.5;eg=c[1]*.5;eb=c[2]*.5;}
            if(dep>=.999){r=g=b=2;}else if(!ln){dt=DY.HOLE;da=ho.ring;dk=f*.5;}break;}
          toBoard(X,Y,Z,B);const u=B[0],v=B[1];
          let zone=-1;for(let k=4;k>=0;k--){const ri=RINGS[k],du=u-ri.u,dv=v-ri.v;if(du*du+dv*dv<ri.r*ri.r){zone=k;break;}}
          if(zone<0)for(let k=5;k<7;k++){const ri=RINGS[k],du=u-ri.u,dv=v-ri.v;if(du*du+dv*dv<ri.r*ri.r){zone=k;break;}}
          if(zone>=0){const c=RINGS[zone].col;r=r*.6+c[0]*.22;g=g*.6+c[1]*.22;b=b*.6+c[2]*.22;if(!ln){dt=DY.ZONE;da=zone;dk=lit;}}
          else{const sb=Math.abs(Math.sin(u*40+v*14));if(sb<.08){r*=1.2;g*=1.2;b*=1.3;}}
          const pk=paintAt(PAINT,u,v);if(pk>=0){const c=RINGS[PAINT[pk].ring].col;r=c[0]*.7;g=c[1]*.7;b=c[2]*.7;er=c[0]*.275;eg=c[1]*.275;eb=c[2]*.275;if(!ln){dt=DY.PAINT;da=PAINT[pk].ring;}}
          if(v<.012){r=150;g=150;b=175;dt=0;}
          break;}
        case MT.LIP:{const c=RINGS[TAUX[id]].col,q=ln?.08:.3;r=c[0]*.55;g=c[1]*.55;b=c[2]*.55;er=c[0]*q;eg=c[1]*q;eb=c[2]*q;if(!ln){dt=DY.LIP;da=TAUX[id];}break;}
        case MT.FLOOR:{const cxk=Math.floor(XW/.14),czk=Math.floor(Z/.14),hsh=hash1(cxk*73856093^czk*19349663);
          r=22;g=18;b=40;if(hsh<.3){const fxx=XW/.14-cxk-.5,fzz=Z/.14-czk-.5,dd=fxx*fxx+fzz*fzz;if(dd<.06){const pc=LAMPCOL[(hsh*20|0)%6];r=pc[0]*.32;g=pc[1]*.32;b=pc[2]*.32;}}
          break;}
        case MT.WALL:{const k=(Y+.45)/3;r=26-12*k;g=18-8*k;b=44-16*k;lit=1;
          /* a row of marquee bulbs high on the arcade wall, chasing slowly */
          if(Y>1.25&&Y<1.33){const bx=XW/.11,bi=Math.floor(bx),fb=bx-bi-.5,fy2=(Y-1.29)/.04;if(fb*fb+fy2*fy2<.12){dt=DY.WALLB;da=bi;dk=((bi%6)+6)%6;}}
          break;}
        default:break;
      }
      if(ln){lit*=.36;er*=.38;eg*=.38;eb*=.38;}
      SR[i]=r*lit+er;SG[i]=g*lit+eg;SBL[i]=b*lit+eb;DT[i]=dt;DA[i]=da;DK[i]=dk;
    }
  }
}
/* screen rect of a world sphere of radius rad (for bounding shadow / light work) */
const RC=[0,0,0,0];
function sphereRect(x,y,z,rad,o,first){const p=project(x,y,z);if(p[2]<.05)return false;const rr=CAM.F*rad/p[2]+2;
  const a=p[0]-rr,b=p[1]-rr,c=p[0]+rr,d=p[1]+rr;if(first){o[0]=a;o[1]=b;o[2]=c;o[3]=d;}else{o[0]=Math.min(o[0],a);o[1]=Math.min(o[1],b);o[2]=Math.max(o[2],c);o[3]=Math.max(o[3],d);}return true;}
function shadeScene(t){
  const {ex,ey,ez,fx,fy,fz,rx,ry,rz,ux,uy,uz,F,cx,cy}=CAM,R=PH.R,L0=LIGHT[0],L1=LIGHT[1],L2=LIGHT[2],N=LAMPN();
  /* live colours for this frame */
  const t6=(t*6)|0,t3=(t*3)|0;
  /* shadow rect: the ball and its shadow cast along the light down to 0.8 m below it */
  let sx0=1,sy0=1,sx1=0,sy1=0;
  if(CASTN){const ok=sphereRect(CAST[0],CAST[1],CAST[2],R*2.6,RC,true);if(ok){for(let k=1;k<=4;k++)sphereRect(CAST[0]-L0*k*.2,CAST[1]-L1*k*.2,CAST[2]-L2*k*.2,R*2.2,RC,false);sx0=Math.max(0,RC[0]|0);sy0=Math.max(Y0,RC[1]|0);sx1=Math.min(W-1,RC[2]|0);sy1=Math.min(H-1,RC[3]|0);}}
  let lx0=1,ly0=1,lx1=0,ly1=0;const nl=LIGHTS.length;
  if(nl){let first=true;for(const L of LIGHTS){if(sphereRect(L.x,L.y,L.z,.5,RC,first))first=false;}if(!first){lx0=Math.max(0,RC[0]|0);ly0=Math.max(Y0,RC[1]|0);lx1=Math.min(W-1,RC[2]|0);ly1=Math.min(H-1,RC[3]|0);}}
  for(let y=Y0;y<H;y++){
    const brow=(y&3)<<2,inS=y>=sy0&&y<=sy1,inL=y>=ly0&&y<=ly1,py=-(y+.5-cy)/F;
    for(let x=0;x<W;x++){
      const i=y*W+x;let r=SR[i],g=SG[i],b=SBL[i];
      const d=DT[i];
      if(d){
        switch(d){
          case DY.LAMP:{const li=DA[i],c=LAMPCOL[LAMPC[li]],q=.18+LAMPV[li]*(.8+.6*DK[i]);r+=c[0]*q;g+=c[1]*q;b+=c[2]*q;break;}
          case DY.HALO:{const li=DA[i],c=LAMPCOL[LAMPC[li]],q0=LAMPV[li]*DK[i],q=q0*q0*.5;r+=c[0]*q;g+=c[1]*q;b+=c[2]*q;break;}
          case DY.SPILL:{const li=DA[i],c=LAMPCOL[LAMPC[li]],q=LAMPV[li]*DK[i];r+=c[0]*q;g+=c[1]*q;b+=c[2]*q;break;}
          case DY.NLAMP:case DY.NHALO:case DY.NSPILL:{const a=DA[i],kk=a&31,s=(a>>5)&1,ln=((a>>6)&3)-1,c=LAMPCOL[(kk+(ln>0?2:4))%6],lb=nlamp(kk,s,ln,t);
            let q=d===DY.NLAMP?.18+lb*(.8+.6*DK[i]):d===DY.NHALO?(lb*DK[i])*(lb*DK[i])*.5:lb*DK[i];q*=.4;r+=c[0]*q;g+=c[1]*q;b+=c[2]*q;break;}
          case DY.LIP:{const ri=RINGS[DA[i]],fl=ri.flash,c=ri.col,q=ri.glow*.5+fl*1.4,w=255*fl*fl;r+=c[0]*q+w;g+=c[1]*q+w;b+=c[2]*q+w;break;}
          case DY.ZONE:{const ri=RINGS[DA[i]],q=ri.flash*.5*DK[i];if(q>0){r+=ri.col[0]*q;g+=ri.col[1]*q;b+=ri.col[2]*q;}break;}
          case DY.HOLE:{const ri=RINGS[DA[i]],q=DK[i]*(ri.glow*.6+ri.flash*1.6);r+=ri.col[0]*q;g+=ri.col[1]*q;b+=ri.col[2]*q;break;}
          case DY.PAINT:{const ri=RINGS[DA[i]],q=ri.flash*.5;if(q>0){r+=ri.col[0]*q;g+=ri.col[1]*q;b+=ri.col[2]*q;}break;}
          case DY.NEON:{const n=NEON[DA[i]],q=SIGN[n.sig]*.9;r+=n.col[0]*q;g+=n.col[1]*q;b+=n.col[2]*q;break;}
          case DY.CHEV:{const q=.12+CHEV[DA[i]]*(.85+.5*DK[i]);r+=90*q;g+=220*q;b+=255*q;break;}
          case DY.CHEVH:{const q0=CHEV[DA[i]]*DK[i],q=q0*q0*.45;r+=90*q;g+=220*q;b+=255*q;break;}
          case DY.TOPB:{const on=(DA[i]+t6)%4===0?.7:.105;r+=255*on;g+=180*on;b+=80*on;break;}
          case DY.WALLB:{const on=((DA[i]+t3)%5+5)%5===0?.8:.18,c=LAMPCOL[DK[i]];r+=c[0]*on;g+=c[1]*on;b+=c[2]*on;break;}
          case DY.CHROME:{const k=.8+.4*Math.sin(DK[i]+t*2);r+=40*k;g+=42*k;b+=50*k;break;}
        }
      }
      if((inS&&x>=sx0&&x<=sx1)||(inL&&x>=lx0&&x<=lx1)){
        const id=GF[i];
        if(id>=0){
          const z=1/GZ[i],px=(x+.5-cx)/F,X=ex+(fx+px*rx+py*ux)*z,Y=ey+(fy+px*ry+py*uy)*z,Z=ez+(fz+px*rz+py*uz)*z;
          if(inS&&x>=sx0&&x<=sx1){let sh=1;
            /* ball shadow: does the ray toward the key light pass through the sphere? soft edge by miss distance */
            const qx=CAST[0]-X,qy=CAST[1]-Y,qz=CAST[2]-Z,d2=qx*qx+qy*qy+qz*qz;
            if(d2<.36){const tt=qx*L0+qy*L1+qz*L2;if(tt>0){const pd=Math.sqrt(Math.max(0,d2-tt*tt)),s=clamp((pd-R*.72)/(R*.62),0,1);sh*=.4+.6*s;}
              const dd=Math.sqrt(d2);if(dd<R*2.4){const a=clamp(1-(dd-R)/(R*1.4),0,1);sh*=1-.5*a*a;}}
            r*=sh;g*=sh;b*=sh;}
          if(inL&&x>=lx0&&x<=lx1)for(let k=0;k<nl;k++){const L=LIGHTS[k],qx=L.x-X,qy=L.y-Y,qz=L.z-Z,d2=qx*qx+qy*qy+qz*qz,il=1/Math.sqrt(d2+1e-6),nd=(qx*TNX[id]+qy*TNY[id]+qz*TNZ[id])*il;
            if(nd>0){const q=L.i*nd/(1+d2*L.k)*(TLN[id]?.3:1);r+=L.r*q*(TR[id]/255+.25);g+=L.g*q*(TG[id]/255+.25);b+=L.b*q*(TBL[id]/255+.25);}}
        }
      }
      const bay=BAY4[brow|(x&3)];
      let R8=((r*.247+bay)|0)*4.05,G8=((g*.247+bay)|0)*4.05,B8=((b*.247+bay)|0)*4.05;if(R8>255)R8=255;if(G8>255)G8=255;if(B8>255)B8=255;
      RBUF[i]=(0xff000000|(B8<<16)|(G8<<8)|R8)>>>0;
    }
  }
}
/* ---- balls: analytic ray-sphere per dot, depth-tested against the G-buffer ---- */
const BM=new Float32Array(9);
function ballMatrix(b){const w=b.qw,x=b.qx,y=b.qy,z=b.qz;
  BM[0]=1-2*(y*y+z*z);BM[1]=2*(x*y-w*z);BM[2]=2*(x*z+w*y);BM[3]=2*(x*y+w*z);BM[4]=1-2*(x*x+z*z);BM[5]=2*(y*z-w*x);BM[6]=2*(x*z-w*y);BM[7]=2*(y*z+w*x);BM[8]=1-2*(x*x+y*y);}
function drawBall(b){
  const {ex,ey,ez,fx,fy,fz,rx,ry,rz,ux,uy,uz,F,cx,cy}=CAM,R=PH.R,L0=LIGHT[0],L1=LIGHT[1],L2=LIGHT[2];
  const p=project(b.px,b.py,b.pz);if(p[2]<.06)return;
  ballMatrix(b);
  const rp=F*R/p[2]*1.2+2,x0=Math.max(0,Math.floor(p[0]-rp)),x1=Math.min(W-1,Math.ceil(p[0]+rp)),y0=Math.max(Y0,Math.floor(p[1]-rp)),y1=Math.min(H-1,Math.ceil(p[1]+rp));
  const ox=ex-b.px,oy=ey-b.py,oz=ez-b.pz,cc=ox*ox+oy*oy+oz*oz-R*R,B=[0,0,0];
  toBoard(b.px,b.py,b.pz,B);const sinkW=B[2],inHole=b.st==='sink'||(b.hole>=0);
  const nl=LIGHTS.length,glow=b.glow||0;
  for(let y=y0;y<=y1;y++){const py=-(y+.5-cy)/F,brow=(y&3)<<2;
    for(let x=x0;x<=x1;x++){
      const px=(x+.5-cx)/F,dx=fx+px*rx+py*ux,dy=fy+px*ry+py*uy,dz=fz+px*rz+py*uz;
      const a=dx*dx+dy*dy+dz*dz,hb=dx*ox+dy*oy+dz*oz,disc=hb*hb-a*cc;if(disc<0)continue;
      const t=(-hb-Math.sqrt(disc))/a,i=y*W+x;if(t<NEAR||t*GZ[i]>=1)continue;
      const nx=(ox+dx*t)/R,ny=(oy+dy*t)/R,nz=(oz+dz*t)/R;
      /* surface pattern in the ball's own frame, so it turns as the ball rolls */
      const lx=BM[0]*nx+BM[3]*ny+BM[6]*nz,ly=BM[1]*nx+BM[4]*ny+BM[7]*nz,lz=BM[2]*nx+BM[5]*ny+BM[8]*nz;
      let ar=214,ag=200,ab=176;
      if(ly>-.3&&ly<.3){ar=200;ag=30;ab=48;if(ly>-.07&&ly<.07){ar=250;ag=200;ab=70;}}
      else if(lx>-.17&&lx<.17){ar=34;ag=58;ab=176;}
      if(lz>.9||lz<-.9){ar=40;ag=36;ab=60;}
      const il=1/Math.sqrt(a),vx=-dx*il,vy=-dy*il,vz=-dz*il,nd=nx*L0+ny*L1+nz*L2,dif=nd>0?nd:0;
      let hx=L0+vx,hy=L1+vy,hz=L2+vz;const hl=1/Math.sqrt(hx*hx+hy*hy+hz*hz),sp=Math.max(0,(nx*hx+ny*hy+nz*hz)*hl),spec=sp*sp*sp*sp,spec2=spec*spec*spec*spec*spec;
      const fr=1-Math.abs(nx*vx+ny*vy+nz*vz),rim=fr*fr*fr;
      let k=.2+.82*dif+.14*(ny*.5+.5);
      if(inHole){const wv=sinkW+(ny*COSP-nz*SINP)*R;if(wv<0)k*=clamp(1+wv/.07,0,1);}
      let r=ar*k+spec2*255+spec*30+rim*(40+glow*200),g=ag*k+spec2*250+spec*28+rim*(30+glow*120),bb=ab*k+spec2*240+spec*26+rim*(50+glow*40);
      for(let q=0;q<nl;q++){const L=LIGHTS[q],qx=L.x-b.px,qy=L.y-b.py,qz=L.z-b.pz,d2=qx*qx+qy*qy+qz*qz,d=Math.sqrt(d2),nd2=(nx*qx+ny*qy+nz*qz)/d;if(nd2>0){const s=L.i*nd2/(1+d2*L.k);r+=L.r*s;g+=L.g*s;bb+=L.b*s;}}
      const bay=BAY4[brow|(x&3)];RBUF[i]=pack(((r*.247+bay)|0)*4.05,((g*.247+bay)|0)*4.05,((bb*.247+bay)|0)*4.05);
      GZ2[i]=1/t;
    }}
}
let GZ2=null;RESCB.push(()=>{GZ2=new Float32Array(W*H);});
/* additive world-space dot (sparks, trails, aim guide), depth-tested against scene and balls */
function addDot(x,y,z,r,g,b,sz){
  const p=project(x,y,z);if(p[2]<.05)return;const X=p[0]|0,Y=p[1]|0;if(X<0||X>=W||Y<Y0||Y>=H)return;
  const i=Y*W+X;if(p[2]*GZ[i]>=1.002||p[2]*GZ2[i]>=1.002)return;
  addPx(i,r,g,b);const rr=sz*CAM.F/p[2];
  if(rr>.6){const h=.45;if(X>0)addPx(i-1,r*h,g*h,b*h);if(X<W-1)addPx(i+1,r*h,g*h,b*h);if(Y>Y0)addPx(i-W,r*h,g*h,b*h);if(Y<H-1)addPx(i+W,r*h,g*h,b*h);}
  if(rr>1.4){const h=.2;if(X>0&&Y>Y0)addPx(i-W-1,r*h,g*h,b*h);if(X<W-1&&Y>Y0)addPx(i-W+1,r*h,g*h,b*h);if(X>0&&Y<H-1)addPx(i+W-1,r*h,g*h,b*h);if(X<W-1&&Y<H-1)addPx(i+W+1,r*h,g*h,b*h);}
}
