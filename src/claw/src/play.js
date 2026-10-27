/* ---------- 9.5 projection: world (x right, y up, z into the glass) -> matrix pixels ----------
   A pinhole camera in front of the glass, raised so the pit floor and the chute top read in depth.
   Every soft body is flat in its own depth plane, so one scale per body projects it exactly. */
const CAMF=200,CAMX=PW/2,CAMY=95;
let KS=1,VX0=128,VY0=42,BG=null,BGN=null;   /* baked interior, without and with the neon sign */
const FR={tb:12,sb:4,bs:2,bulbs:[]};
const persp=z=>CAMF/(CAMF+z);
const prX=(x,z)=>VX0+(x-CAMX)*persp(z)*KS,prY=(y,z)=>VY0-(y-CAMY)*persp(z)*KS;
const P3=(c,k=1)=>pack(c[0]*k,c[1]*k,c[2]*k);
const WHITE=[255,255,255];
/* blend a colour into RBUF at index i with opacity a (0..1) */
function blendI(i,r,g2,b,a){const c=RBUF[i],R=c&255,G=(c>>>8)&255,B=(c>>>16)&255;RBUF[i]=(0xff000000|(c255(B+(b-B)*a)<<16)|(c255(G+(g2-G)*a)<<8)|c255(R+(r-R)*a))>>>0;}
function shadeI(i,k){const c=RBUF[i];RBUF[i]=(0xff000000|(c255(((c>>>16)&255)*k)<<16)|(c255(((c>>>8)&255)*k)<<8)|c255((c&255)*k))>>>0;}

/* ---------- 9.6 the cabinet interior, baked once per resolution ----------
   For each dot, cast the camera ray into the box and take the first inner surface it meets
   (floor, ceiling, mirror side walls, or the back wall), then shade it with ordered dithering. */
function bakeBG(){
  BG=new Uint32Array(W*H);const rn=mulberry(11);
  const tb=FR.tb,sb=FR.sb;
  for(let py=0;py<H;py++)for(let qx=0;qx<W;qx++){
    const bay=BAY4[((py&3)<<2)|(qx&3)];let r,g2,b;
    if(qx<sb||qx>=W-sb||py<tb||py>=H-sb){
      /* bezel: dark plum plastic, a chrome lip on the inner edge, the marquee plate at the top */
      const inner=qx===sb-1||qx===W-sb||py===tb-1||py===H-sb;
      if(inner){r=150;g2=136;b=178;}
      else if(py<tb&&qx>=sb&&qx<W-sb){const t=py/tb;r=34+28*t;g2=12+8*t;b=46+30*t;if(bay<.25){r+=6;b+=8;}}
      else{r=24;g2=14;b=36;if((qx+py)%3===0){r+=4;b+=6;}}
    }else{
      const dx=(qx+.5-VX0)/KS,dy=(VY0-(py+.5))/KS;let z=PD,surf=0;
      if(dy<0){const zz=CAMF/(-CAMY/dy)-CAMF;if(zz<z){z=zz;surf=1;}}
      if(dy>0){const zz=CAMF/((PH-CAMY)/dy)-CAMF;if(zz<z){z=zz;surf=2;}}
      if(dx<0){const zz=CAMF/(-CAMX/dx)-CAMF;if(zz<z){z=zz;surf=3;}}
      if(dx>0){const zz=CAMF/((PW-CAMX)/dx)-CAMF;if(zz<z){z=zz;surf=4;}}
      const s=CAMF/(CAMF+Math.max(0,z)),wx=CAMX+dx/s,wy=CAMY+dy/s,fog=1-.38*clamp(z/PD,0,1);
      if(z<0){r=14;g2=8;b=20;}
      else if(surf===0){ /* back wall: indigo with a polka-heart print, lit from the LED strip above */
        const k=.62+.62*clamp(wy/PH,0,1);r=36;g2=24;b=74;
        const gx=((wx+(Math.floor(wy/16)&1)*8)%16+16)%16-8,gy=((wy%16)+16)%16-8,d=gx*gx*.8+(gy+Math.abs(gx)*.55)**2;
        if(d<7.5){r=104;g2=48;b=150;}else if(d<11&&bay<.5){r=70;g2=36;b=116;}
        if(((wx+wy)%32+32)%32<1.2){r+=10;g2+=8;b+=18;}
        r*=k;g2*=k;b*=k;
        if(wy>PH-7){const t=(wy-(PH-7))/7;r+=120*t*t;g2+=60*t*t;b+=130*t*t;}
      }else if(surf===1){ /* carpet: dithered magenta noise, a chrome lip at the front */
        const nz=rn()*20-10;r=76+nz;g2=22+nz*.4;b=64+nz;if(((wx*.3|0)+(z*.5|0))&1){r+=6;b+=6;}
        if(z<2.2){r=110;g2=104;b=130;}
      }else if(surf===2){ /* ceiling: ribs, an LED strip along the front */
        r=20;g2=16;b=32;if((z|0)%8<1)r=g2=b=38;if(z<3.5){r=255;g2=200;b=246;}
      }else{ /* mirror side walls: panel seams and a soft diagonal reflection */
        const k=.6+.55*clamp(wy/PH,0,1);r=28;g2=28;b=58;
        if((z%12.5)<1){r=12;g2=12;b=20;}
        if(((z*1.2+wy*.7)%46)<4&&bay<.6){r+=34;g2+=34;b+=52;}
        if(wy>PH-5){r+=60;g2+=40;b+=80;}
        r*=k;g2*=k;b*=k;
      }
      r*=fog;g2*=fog;b*=fog;
    }
    BG[py*W+qx]=pack(r,g2,b);
  }
  /* a neon sign on the back wall, high up where the heap never reaches */
  BGN=BG;BG=new Uint32Array(BGN);
  const sgY=prY(PH-12,PD),tx0=prX(PW/2,PD);neonBG('PLUSH',tx0-19,sgY,[255,70,190]);neonBG('PANIC',tx0+19,sgY,[60,200,255]);
  {const t=BG;BG=BGN;BGN=t;}
  /* bulb sockets around the bezel (lit per frame) */
  FR.bulbs.length=0;const sp=Math.max(4,Math.round(5*KS)),bs=FR.bs;
  for(let x=1;x<W-bs;x+=sp)FR.bulbs.push(x,0);
  for(let y=sp;y<H-bs-1;y+=sp)FR.bulbs.push(W-bs-1,y);
  for(let x=W-bs-1-((W-bs-2)%sp);x>0;x-=sp)FR.bulbs.push(x,H-bs-1);
  for(let y=H-bs-1-sp;y>0;y-=sp)FR.bulbs.push(1,y);
}
/* write a txt5 string straight into the baked background with a soft neon glow */
function neonBG(str,cx,cy,col){const w=tw5(str,1);let x=Math.round(cx-w/2);const y=Math.round(cy);
  for(const ch of str){const gl5=G5[ch]||G5[' '];
    for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((gl5[r]>>(4-c))&1)for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const xx=x+c+a,yy=y+r+b;if(xx<0||yy<0||xx>=W||yy>=H)continue;const i=yy*W+xx;
      if(!a&&!b)BG[i]=pack(255,226,250);else{const f=a&&b?.12:.22,cc=BG[i],R=(cc&255)+col[0]*f,G=((cc>>>8)&255)+col[1]*f,B=((cc>>>16)&255)+col[2]*f;BG[i]=pack(R,G,B);}}
    x+=6;}}
RESCB.push(()=>{KS=W/256;VX0=W/2;VY0=42*KS;FR.bs=KS<1?1:2;FR.sb=FR.bs+2;FR.tb=Math.round(12*KS);bakeBG();});

/* ---------- 9.7 plush rasterizer ----------
   A "view" is a soft body projected to the screen: the ring offset outward by the particle radius (the visible
   skin), the limb chains, and the best-fit affine map rest-space -> screen (A_pq A_qq^-1 of shape matching).
   The fill walks scanlines, maps every dot back into rest space with the inverse affine, and shades it like a
   stuffed dome lit from the top-left, quantised to four tones with the Bayer matrix. Patterns (muzzles,
   stripes, spots, the unicorn's mane) live in rest space, so they squash and rotate with the plush. */
const VW_={n:0,sx:new Float32Array(64),sy:new Float32Array(64),lx:new Float32Array(96),ly:new Float32Array(96),cx:0,cy:0,
  m00:1,m01:0,m10:0,m11:1,R:10,sc:1,T:null,b:null,mood:0,blink:0,yaw:0,dim:1,lit:0,spx:0,spw:0,spy:0,alpha:1,t:0};
const XS=new Float32Array(64);
function palOf(c,k){const s=[c[0]*.5,c[1]*.52,c[2]*.66],h=mixC(c,WHITE,.32),hh=mixC(c,WHITE,.7);
  return [P3(s,k),P3(c,k),P3(h,k),P3(hh,k)];}
const PALS=new Uint32Array(24),PCACHE=new Map();
/* palettes per (design, brightness step), cached: no allocation in the frame loop */
function setPal(T,k){
  const q=clamp(Math.round(k*24),1,40),key=T.i*64+q;let P=PCACHE.get(key);
  if(!P){k=q/24;P=new Uint32Array(24);const sets=[T.col,T.sec,T.acc];
    for(let s=0;s<3;s++){const p=palOf(sets[s],k);for(let j=0;j<4;j++)P[s*4+j]=p[j];}
    /* spotlight tones: warmer, and brighter only as far as the fabric has headroom (white plush must not clip) */
    for(let s=0;s<2;s++){const c=sets[s],lum=(c[0]*.3+c[1]*.59+c[2]*.11)/255,lk=k*(1.26-.34*lum);const p=palOf(mixC(c,[255,236,190],.2),lk);P[12+s*4]=p[1];P[13+s*4]=p[2];P[14+s*4]=p[3];P[15+s*4]=P3(WHITE,Math.min(.95,lk));}
    P[20]=P3(T.ol,k);P[21]=P3([20,10,24],k);P[22]=P3([255,255,255],Math.min(1,k*1.1));P[23]=P3([255,110,150],k);PCACHE.set(key,P);}
  PALS.set(P);
}
/* build the view of a live body under projection (ox,oy,sc): screen = (ox + x*sc, oy - y*sc) */
function viewBody(b,ox,oy,sc){
  const V=VW_,n=b.n,i0=b.i0,T=b.T,rp=b.rp*.92;V.n=n;V.T=T;V.b=b;V.sc=sc;V.R=T.R*sc;
  let cx=0,cy=0;for(let k=0;k<n;k++){cx+=X[i0+k];cy+=Y[i0+k];}cx/=n;cy/=n;
  /* skin: each ring point pushed out along its vertex normal by the particle radius */
  for(let k=0;k<n;k++){const i=i0+k,ip=i0+(k+n-1)%n,inx=i0+(k+1)%n,tx=X[inx]-X[ip],ty=Y[inx]-Y[ip],l=Math.sqrt(tx*tx+ty*ty)||1;
    V.sx[k]=ox+(X[i]+ty/l*rp)*sc;V.sy[k]=oy-(Y[i]-tx/l*rp)*sc;}
  /* best-fit affine of the ring: A = A_pq A_qq^-1, blended with the pure rotation for robustness */
  const RS=restShape(T);let p00=0,p01=0,p10=0,p11=0;
  for(let k=0;k<n;k++){const dx=X[i0+k]-cx,dy=Y[i0+k]-cy;p00+=dx*b.qx[k];p01+=dx*b.qy[k];p10+=dy*b.qx[k];p11+=dy*b.qy[k];}
  let a00=p00*RS.i00+p01*RS.i01,a01=p00*RS.i01+p01*RS.i11,a10=p10*RS.i00+p11*RS.i01,a11=p10*RS.i01+p11*RS.i11;
  const c=Math.cos(b.ang),s=Math.sin(b.ang),det=a00*a11-a01*a10,wq=det>.45?.65:.15;
  a00=a00*wq+c*(1-wq);a01=a01*wq-s*(1-wq);a10=a10*wq+s*(1-wq);a11=a11*wq+c*(1-wq);
  V.m00=a00*sc;V.m01=a01*sc;V.m10=-a10*sc;V.m11=-a11*sc;
  V.cx=ox+cx*sc;V.cy=oy-cy*sc;
  let li=0;for(const L of b.limbs){for(let j=0;j<L.n;j++){V.lx[li]=ox+X[L.s+j]*sc;V.ly[li]=oy-Y[L.s+j]*sc;li++;}}
  V.mood=b.mood;V.blink=b.blinkOn?1:0;V.yaw=b.yaw;
  /* eyes follow the claw when it is close (catch-light on the claw's side) */
  V.look=b.state==='pit'&&Math.abs(CL.hx-b.cx)<70&&Math.abs(CL.hz-BZ[b.slot])<20?Math.sign(CL.hx-b.cx):0;
  return V;
}
/* a posed puppet of a design (prize board, results, HUD shelf): rest shape, optional wobble */
function viewPuppet(T,cx,cy,sc,rot,mood){
  const V=VW_,RS=restShape(T),n=T.N,c=Math.cos(rot),s=Math.sin(rot),rp=RS.rp*.92;V.n=n;V.T=T;V.b=null;V.sc=sc;V.R=T.R*sc;
  for(let k=0;k<n;k++){const ip=(k+n-1)%n,inx=(k+1)%n,tx=RS.qx[inx]-RS.qx[ip],ty=RS.qy[inx]-RS.qy[ip],l=Math.sqrt(tx*tx+ty*ty)||1;
    const qx=RS.qx[k]+ty/l*rp,qy=RS.qy[k]-tx/l*rp;V.sx[k]=cx+(c*qx-s*qy)*sc;V.sy[k]=cy-(s*qx+c*qy)*sc;}
  V.m00=c*sc;V.m01=-s*sc;V.m10=-s*sc;V.m11=-c*sc;V.cx=cx;V.cy=cy;
  let li=0;for(const rl of RS.limbs)for(let j=0;j<rl.d.n;j++){const lx=rl.pts[2*j],ly=rl.pts[2*j+1];V.lx[li]=cx+(c*lx-s*ly)*sc;V.ly[li]=cy-(s*lx+c*ly)*sc;li++;}
  V.mood=mood||0;V.blink=0;V.yaw=0;V.look=0;V.dim=1;V.lit=0;V.alpha=1;
  return V;
}
/* filled capsule (tapered) with a 1-dot outline: two passes so chained segments merge cleanly */
function capsuleR(x0,y0,x1,y1,r0,r1,col){
  const xa=Math.max(0,Math.floor(Math.min(x0-r0,x1-r1))),xb=Math.min(W-1,Math.ceil(Math.max(x0+r0,x1+r1))),ya=Math.max(0,Math.floor(Math.min(y0-r0,y1-r1))),yb=Math.min(H-1,Math.ceil(Math.max(y0+r0,y1+r1)));
  const ex=x1-x0,ey=y1-y0,l2=ex*ex+ey*ey||1e-6;
  for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){const px0=x+.5-x0,py0=y+.5-y0;let t=(px0*ex+py0*ey)/l2;t=t<0?0:t>1?1:t;const dx=px0-ex*t,dy=py0-ey*t,r=r0+(r1-r0)*t;if(dx*dx+dy*dy<r*r)RBUF[y*W+x]=col;}
}
function discR(x0,y0,r,col){capsuleR(x0,y0,x0,y0,r,r,col);}
function triR(ax,ay,bx,by,cx,cy,col){
  const xa=Math.max(0,Math.floor(Math.min(ax,bx,cx))),xb=Math.min(W-1,Math.ceil(Math.max(ax,bx,cx))),ya=Math.max(0,Math.floor(Math.min(ay,by,cy))),yb=Math.min(H-1,Math.ceil(Math.max(ay,by,cy)));
  const d=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(d)<1e-6)return;
  for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){const px0=x+.5,py0=y+.5,w1=((bx-px0)*(cy-py0)-(by-py0)*(cx-px0))/d,w2=((cx-px0)*(ay-py0)-(cy-py0)*(ax-px0))/d;if(w1>=0&&w2>=0&&w1+w2<=1)RBUF[y*W+x]=col;}
}
const RAINBOW=[[255,90,110],[255,170,60],[255,230,80],[110,230,120],[90,190,255],[170,120,255]];
/* limbs: drawn as chains of capsules (two passes: outline then fill), ears as discs, cat ears as triangles */
function drawLimbs(V,back){
  const T=V.T,RS=restShape(T),sc=V.sc,ol=PALS[20],main=PALS[1],acc=PALS[9],sec=PALS[5];let li=0;
  for(const rl of RS.limbs){const d=rl.d,n=d.n,s0=li;li+=n;if(!!d.back!==back)continue;
    const ai=rl.a,ax=V.sx[ai],ay=V.sy[ai],r=d.r*sc,kind=d.kind;
    if(kind==='ear'||kind==='foot'){const x=V.lx[s0],y=V.ly[s0];discR(x,y,r+.55,ol);discR(x,y,r-.45,kind==='foot'?PALS[0]:main);if(kind==='ear')discR(x,y,r*.48,acc);else discR(x+.2,y+.2,r*.45,PALS[4]);continue;}
    if(kind==='tri'||kind==='horn'){const n0=(ai+T.N-1)%T.N,n1=(ai+1)%T.N,bx0=(V.sx[n0]+ax)/2,by0=(V.sy[n0]+ay)/2,bx1=(V.sx[n1]+ax)/2,by1=(V.sy[n1]+ay)/2,tx=V.lx[s0],ty=V.ly[s0];
      if(kind==='horn'){triR(bx0,by0,bx1,by1,tx,ty,PALS[20]);const cx=(bx0+bx1)/2,cy=(by0+by1)/2;triR(bx0+(cx-bx0)*.25,by0+(cy-by0)*.25,bx1+(cx-bx1)*.25,by1+(cy-by1)*.25,tx+(cx-tx)*.12,ty+(cy-ty)*.12,PALS[10]);
        for(let q=1;q<3;q++){const t=q/3;px(cx+(tx-cx)*t,cy+(ty-cy)*t,PALS[11]);}}
      else{triR(bx0,by0,bx1,by1,tx,ty,ol);const cx=(bx0+bx1+tx)/3,cy=(by0+by1+ty)/3,k=.72;triR(cx+(bx0-cx)*k,cy+(by0-cy)*k,cx+(bx1-cx)*k,cy+(by1-cy)*k,cx+(tx-cx)*k,cy+(ty-cy)*k,main);
        const k2=.38;triR(cx+(bx0-cx)*k2,cy+(by0-cy)*k2,cx+(bx1-cx)*k2,cy+(by1-cy)*k2,cx+(tx-cx)*k2*1.25,cy+(ty-cy)*k2*1.25,acc);}
      continue;}
    /* chains: bunny ears, tails, tentacles, the mane */
    for(let pass=0;pass<2;pass++){let x0=ax,y0=ay,r0=r;
      for(let j=0;j<n;j++){const x1=V.lx[s0+j],y1=V.ly[s0+j],r1=r*(1-(d.taper||0)*.8*(j+1)/n);
        let col=pass?main:ol;
        if(pass&&kind==='mane')col=P3(RAINBOW[j%6],V.dim);
        if(pass&&kind==='tail'&&j===n-1)col=acc;
        capsuleR(x0,y0,x1,y1,pass?r0-.6:r0+.5,pass?r1-.6:r1+.5,col);x0=x1;y0=y1;r0=r1;}
    }
    if(kind==='lear'){let x0=V.lx[s0],y0=V.ly[s0];for(let j=1;j<n;j++){const x1=V.lx[s0+j],y1=V.ly[s0+j];capsuleR(x0,y0,x1,y1,r*.38,r*.3,sec);x0=x1;y0=y1;}}
    if(kind==='tent'&&r>1.6)for(let j=0;j<n;j+=2)px(V.lx[s0+j],V.ly[s0+j],sec);
  }
}
/* the body fill */
function drawView(V){
  const T=V.T,n=V.n,f=T.face,R=V.R;
  setPal(T,V.dim);
  drawLimbs(V,true);
  /* inverse of the rest->screen affine */
  const det=V.m00*V.m11-V.m01*V.m10||1e-6,i00=V.m11/det,i01=-V.m01/det,i10=-V.m10/det,i11=V.m00/det,iR=1/T.R;
  let y0=1e9,y1=-1e9;for(let k=0;k<n;k++){if(V.sy[k]<y0)y0=V.sy[k];if(V.sy[k]>y1)y1=V.sy[k];}
  y0=Math.max(0,Math.floor(y0));y1=Math.min(H-1,Math.ceil(y1));
  const jelly=!!f.jelly,gold=!!f.gold,tt=V.t,lit=V.lit,spx=V.spx,spw=V.spw;
  for(let y=y0;y<=y1;y++){
    const yc=y+.5;let ni=0;
    for(let k=0;k<n;k++){const k2=k+1===n?0:k+1,ay=V.sy[k],by=V.sy[k2];if((ay<=yc)!==(by<=yc))XS[ni++]=V.sx[k]+(yc-ay)/(by-ay)*(V.sx[k2]-V.sx[k]);}
    for(let a=1;a<ni;a++){const v=XS[a];let b=a-1;while(b>=0&&XS[b]>v){XS[b+1]=XS[b];b--;}XS[b+1]=v;}
    for(let m=0;m+1<ni;m+=2){const xa=Math.max(0,Math.ceil(XS[m]-.5)),xb=Math.min(W-1,Math.floor(XS[m+1]-.5));
      for(let x=xa;x<=xb;x++){
        const qx=x+.5-V.cx,qy=yc-V.cy,u=(i00*qx+i01*qy)*iR,v=(i10*qx+i11*qy)*iR;
        /* pattern set: 0 main, 1 secondary, 2 accent */
        let ps=0;
        if(f.muzzle){const mx=u/.44,my=(v+.26)/.31;if(mx*mx+my*my<1)ps=1;}
        if(f.stripes&&v>.5&&Math.abs(u)<.36&&(((u+.36)*8.3)|0)%2===0)ps=2;
        if(f.stripes){const mx=u/.5,my=(v+.3)/.3;if(mx*mx+my*my<1)ps=1;}
        if(f.spots){const a1=(u+.42)**2+(v-.5)**2,a2=(u-.38)**2+(v-.58)**2,a3=(u-.02)**2+(v-.82)**2,a4=(u-.62)**2+(v-.12)**2;if(a1<.018||a2<.014||a3<.012||a4<.01)ps=1;}
        if(f.glow&&u*u+v*v<.09)ps=1;
        if(f.mane&&v>.15&&u>.1){const rr=u*u+v*v;if(rr>.42){const band=((Math.atan2(v,u)*3.2)|0);RBUF[y*W+x]=P3(RAINBOW[(band%6+6)%6],V.dim);continue;}}
        /* stuffed-dome lighting from the top-left, four tones with ordered dithering */
        const rr=u*u+v*v,nz=Math.sqrt(rr<1.4?1-rr*.6:.16),dif=-.42*u+.5*v+.62*nz;
        const bay=BAY4[((y&3)<<2)|(x&3)];
        let lv=dif*2.5-.35+bay;if(gold){const sw=((u*.9+v*.6+tt*1.3)%2.4+2.4)%2.4;if(sw<.22)lv+=1.4;}
        let idx=lv<0?0:lv>=3?3:lv|0;
        if(rr>.8&&idx>0&&bay<.5)idx--;
        let col=PALS[ps*4+idx];
        if(lit&&ps<2){const d=Math.abs(x+.5-spx);if(d<spw-bay*1.5)col=PALS[12+ps*4+(idx>2?2:idx)];}
        if(jelly){const i=y*W+x;if(f.jelly&&(idx>1||((x+y)&1))){RBUF[i]=col;}else blendI(i,(col&255),(col>>>8)&255,(col>>>16)&255,.62);continue;}
        RBUF[y*W+x]=col;
      }
    }
  }
  /* outline along the skin */
  const ol=PALS[20];
  for(let k=0;k<n;k++){const k2=k+1===n?0:k+1;line(V.sx[k],V.sy[k],V.sx[k2],V.sy[k2],ol);}
  if(jelly){const hx=V.cx+V.m00*(-.42*T.R)+V.m01*(.38*T.R),hy=V.cy+V.m10*(-.42*T.R)+V.m11*(.38*T.R);discR(hx,hy,Math.max(1,R*.16),PALS[22]);px(hx+R*.3,hy+R*.05,PALS[22]);}
  drawFace(V);
  drawLimbs(V,false);
}
/* faces: hand-placed dots in rest space, so they follow the squash, the tumble and a little 3/4 yaw */
const FP=[[0,0],[0,0],[0,0],[0,0]];let FPI=0;
function fpt(V,u,v){const R=V.T.R,o=FP[FPI++&3];o[0]=Math.round(V.cx+V.m00*u*R+V.m01*v*R-.5);o[1]=Math.round(V.cy+V.m10*u*R+V.m11*v*R-.5);return o;}
function drawFace(V){
  const T=V.T,f=T.face,R=V.R,q=R>=17?Math.max(2,Math.round(R/10.5)):1,big=R>=13,small=R<8.6,dk=PALS[21],wh=PALS[22],pk=PALS[23],yaw=V.yaw*.22,es=1-Math.abs(V.yaw)*.25;
  /* every facial feature is a tiny pixel stamp; q scales it for the big showcase plush */
  let ox=0,oy=0;const P=(dx,dy,c,w=1,h=1)=>rect(ox+dx*q,oy+dy*q,w*q,h*q,c);
  const mood=V.mood,blink=V.blink,em=blink?4:mood;
  const e0=fpt(V,-f.ex*es+yaw,f.ey),ex0=e0[0],ey0=e0[1],e1=fpt(V,f.ex*es+yaw,f.ey),ex1=e1[0],ey1=e1[1];
  /* eyes: dot, blink, ^ happy, wide, x dizzy, > < squeeze, - sleepy */
  for(let e=0;e<2;e++){ox=e?ex1:ex0;oy=e?ey1:ey0;const sg=e?1:-1;if(q>1){ox-=q>>1;oy-=q>>1;}
    if(em===1){if(small){P(0,0,dk);P(1,0,dk);}else{P(-1,1,dk);P(0,0,dk);P(1,1,dk);}}
    else if(em===3){P(-1,-1,dk);P(1,-1,dk);P(0,0,dk);P(-1,1,dk);P(1,1,dk);}
    else if(em===5){P(-sg,-1,dk);P(0,0,dk);P(-sg,1,dk);}
    else if(em===4){P(0,1,dk,2,1);if(big)P(-1,1,dk);}
    else if(em===2){P(0,-1,dk,2,3);if(!small)P(0,-1,wh);}
    else{const lk=V.look>0?1:0;if(small)P(0,0,dk,1,2);else{P(0,0,dk,2,2);if(big){P(0,-1,dk,2,1);P(lk,-1,wh);}else P(lk,0,wh);}}
    if(f.lash&&!small)P(e?2:-1,-1,dk);
  }
  if(f.blush&&!small){const a=fpt(V,-f.ex*es-.16+yaw,f.ey-.2);ox=a[0];oy=a[1];P(0,0,pk,2,1);const b=fpt(V,f.ex*es+.16+yaw,f.ey-.2);ox=b[0];oy=b[1];P(0,0,pk,2,1);}
  const mo=mood===2?'o':mood===1||mood===6?'D':mood===3?'~':mood===5?'w':f.mouth;
  if(f.nose===1){const n=fpt(V,yaw,-.12);ox=n[0];oy=n[1];P(0,0,dk,2,1);}
  else if(f.nose===2){const n=fpt(V,yaw,-.06);ox=n[0];oy=n[1];P(0,0,pk);}
  const m=fpt(V,yaw,f.nose?-.26:-.16);ox=m[0];oy=m[1];if(q>1)ox-=q>>1;
  if(mo==='u'){P(-1,0,dk);P(0,1,dk);P(1,0,dk);if(big){P(-2,-1,dk);P(2,-1,dk);}}
  else if(mo==='w'){P(-2,0,dk);P(-1,1,dk);P(0,0,dk);P(1,1,dk);P(2,0,dk);}
  else if(mo==='o'){if(small)P(0,0,dk);else{P(0,0,dk,2,2);if(big)P(0,1,pk);}}
  else if(mo==='D'){P(-1,0,dk,3,2);if(!small)P(-1,1,pk,3,1);}
  else if(mo==='~'){P(-2,1,dk);P(-1,0,dk);P(0,1,dk);P(1,0,dk);P(2,1,dk);}
  if(f.whisk&&!small)for(const sg of [-1,1]){const w=fpt(V,sg*.56+yaw,-.12);ox=w[0];oy=w[1];P(0,0,dk);P(sg,0,dk);P(0,2,dk);P(sg,2,dk);}
  if(f.crown){const c=fpt(V,yaw,1.08);ox=c[0];oy=c[1];const c1=P3([255,220,60],V.dim),c2=P3([255,60,90],V.dim);P(-2,0,c1,5,2);P(-2,-1,c1);P(0,-1,c1);P(2,-1,c1);P(0,0,c2);}
}

/* ---------- 9.8 the claw, the gantry and the chute ---------- */
const CLW=[0,0];
function clawPt(u,v){clawLocalToWorld(u,v,CLW);return CLW;}
const STEEL=[[40,44,64],[96,104,132],[168,178,204],[236,240,250]];
function steelCol(t,k){const i=clamp(t*3.99|0,0,3);return P3(STEEL[i],k);}
function drawGantry(){
  const gz=CL.gz,k=.9;
  /* side rails at the top of each mirror wall, the cross beam at the carriage depth, the carriage */
  for(const x of [3,PW-3]){line(prX(x,0),prY(PH,0),prX(x,PD),prY(PH,PD),P3([120,126,160],k));line(prX(x,0),prY(PH,0)+1,prX(x,PD),prY(PH,PD)+1,P3([50,52,74],k));}
  const by=prY(PH-1,gz),xa=prX(2,gz),xb=prX(PW-2,gz),th=Math.max(2,Math.round(2.4*KS*persp(gz)));
  rect(xa,by-th,xb-xa,th,P3([70,74,100]));rect(xa,by-th,xb-xa,1,P3([190,196,220]));rect(xa,by,xb-xa,1,P3([30,30,46]));
  const cx=prX(CL.gx,gz),s=persp(gz)*KS,cw=9*s,chh=5*s;
  rect(cx-cw/2,by-th-1,cw,chh+th,P3([60,64,90]));rect(cx-cw/2,by-th-1,cw,1,P3([200,206,230]));rect(cx-cw/2+1,by+chh-th-2,cw-2,1,P3([255,80,140]));
}
/* spotlight cone under the claw while aiming and dropping */
function drawBeam(){
  if(!M.beam)return;const s=persp(CL.hz)*KS,hx=prX(CL.hx,CL.hz),hy=prY(CL.hy-3,CL.hz),fy=prY(0,CL.hz),k=M.beam;
  for(let y=Math.max(FR.tb,Math.round(hy));y<Math.min(H-FR.sb,fy);y++){const t=(y-hy)/Math.max(1,fy-hy),hw=(3+t*14)*s;
    for(let x=Math.max(FR.sb,Math.floor(hx-hw));x<=Math.min(W-FR.sb-1,Math.ceil(hx+hw));x++){const e=1-Math.abs(x+.5-hx)/hw;if(e>0&&BAY4[((y&3)<<2)|(x&3)]<e*.75)addPx(y*W+x,30*k,24*k,10*k);}}
  glow(hx,fy-1,9*s,[255,220,120],.35*k);
}
function drawClaw(){
  const z=CL.hz,s=persp(z)*KS,ox=VX0-CAMX*s,oy=VY0+CAMY*s,k=.95;
  const SX=wx=>ox+wx*s,SY=wy=>oy-wy*s;
  /* cable (sags when slack) */
  const ax=prX(CL.gx,CL.gz),ay=prY(GYA,CL.gz),top=clawPt(0,6),tx=SX(top[0]),ty=SY(top[1]),sag=clamp(CL.slack,0,10)*.6*s;
  const n=Math.max(4,Math.round(Math.abs(ty-ay)/2));
  let lx=ax,ly=ay;for(let i=1;i<=n;i++){const t=i/n,x=ax+(tx-ax)*t+Math.sin(t*Math.PI)*sag,y=ay+(ty-ay)*t;line(lx,ly,x,y,P3([170,176,200],k));if(i%4===1)px(x+1,y,P3([60,64,86],k));lx=x;ly=y;}
  /* side prongs: steel capsules pivot -> elbow -> tip, rubber pad on the tip */
  prongLocal();
  for(let pass=0;pass<2;pass++)for(let sd=0;sd<2;sd++){const o=sd*8;
    const a=clawPt(PG[o],PG[o+1]),ax2=SX(a[0]),ay2=SY(a[1]),b=clawPt(PG[o+2],PG[o+3]),bx=SX(b[0]),by=SY(b[1]),c=clawPt(PG[o+4],PG[o+5]),cx=SX(c[0]),cy=SY(c[1]);
    const r=RC*s;
    if(!pass){capsuleR(ax2,ay2,bx,by,r+.6,r+.6,P3([22,22,34]));capsuleR(bx,by,cx,cy,r+.6,r+.4,P3([22,22,34]));}
    else{capsuleR(ax2,ay2,bx,by,r-.3,r-.3,steelCol(.55,k));capsuleR(bx,by,cx,cy,r-.3,r-.4,steelCol(.45,k));line(ax2,ay2-.5,bx,by-.5,steelCol(.95,k));discR(cx,cy,Math.max(1,r*.85),P3([200,40,70],k));}
  }
  /* housing: chrome bell with a status LED band */
  const hc=clawPt(0,1.5),hx=SX(hc[0]),hy=SY(hc[1]),hw=6*s,hh=4.5*s;
  discR(hx,hy-hh*.55,hw*.72+.6,P3([22,22,34]));discR(hx,hy-hh*.55,hw*.72-.4,steelCol(.7,k));
  rect(hx-hw-.5,hy-hh*.5,hw*2+1,hh+1,P3([22,22,34]));
  for(let yy=0;yy<hh;yy++){const t=1-yy/hh;rect(hx-hw+.5,hy-hh*.5+yy+.5,hw*2-1,1,steelCol(.35+t*.55,k));}
  const led=M.led||[90,255,140],pul=.65+.35*Math.sin(S.t*9);rect(hx-hw+1,hy+hh*.15,hw*2-2,Math.max(1,s),P3(led,pul));
  glow(hx,hy+hh*.2,hw*1.6,led,.22*pul);
  /* front prong (toward the viewer): foreshortened, drawn last so it overlaps what the claw holds */
  const phm=(CL.ph[0]+CL.ph[1])*.5,a1=A0P+phm,fl=(L1*Math.cos(a1)*.62+L2*.5)*s,fx=hx,fy=hy+hh*.5;
  capsuleR(fx,fy,fx,fy+fl,RC*s+.9,RC*s+.6,P3([22,22,34]));capsuleR(fx,fy,fx,fy+fl,RC*s,RC*s-.2,steelCol(.8,k));discR(fx,fy+fl,Math.max(1,RC*s*.9),P3([220,50,80],k));
}
/* the chute: dark well opening (sorted at its back wall's depth) and the translucent front panel (last) */
function drawChuteHole(){
  const x0=prX(0,CD),x1=prX(CW,CD),yb=prY(CH,CD),xf0=prX(0,0),xf1=prX(CW,0),yf=prY(CH,0);
  for(let y=Math.floor(yb);y<=Math.ceil(yf);y++){const t=(y-yb)/Math.max(1,yf-yb),xa=x0+(xf0-x0)*t,xb=x1+(xf1-x1)*t;
    for(let x=Math.max(FR.sb,Math.ceil(xa));x<Math.min(W-FR.sb,xb);x++)RBUF[y*W+x]=pack(10+8*t,4,16+10*t);}
  /* back panel of the chute: tinted acrylic */
  const yb0=prY(0,CD);for(let y=Math.ceil(yb);y<yb0;y++)for(let x=Math.max(FR.sb,Math.ceil(x0));x<x1;x++){if(((x+y)&1)===0)blendI(y*W+x,140,210,255,.16);}
  line(x0,yb,x1,yb,P3([255,210,90],.8));
}
function drawChuteFront(){
  const x0=Math.round(prX(0,0)),x1=Math.round(prX(CW,0)),y0=Math.round(prY(CH,0)),y1=Math.round(prY(0,0)),xr=prX(CW,CD),yr=prY(CH,CD);
  for(let y=y0;y<=y1&&y<H-FR.sb;y++){const fr=y>y0+(y1-y0)*.42?.42:.13;for(let x=Math.max(FR.sb,x0);x<=x1;x++){const i=y*W+x;blendI(i,120,40,110,fr);if(((x-y*1.6)%23+23)%23<2)addPx(i,22,22,30);}}
  /* right edge of the box going back, hazard rim along the top */
  line(x1,y0,xr,yr,P3([255,210,90],.9));
  for(let x=Math.max(FR.sb,x0);x<=x1;x++){const c=(((x>>1)+(S.t*6|0))&1)?pack(255,206,40):pack(40,20,10);px(x,y0,c);px(x,y0+1,c);}
  rect(x1-1,y0,2,y1-y0,P3([255,210,90],.85));
  /* the prize door at the bottom */
  const dw=(x1-x0)*.6,dx=(x0+x1)/2-dw/2,dh=Math.max(4,5*KS),dy=y1-dh,open=clamp(M.door,0,1);
  rect(dx,dy,dw,dh,pack(16,8,20));rect(dx,dy,dw,Math.max(1,dh*(1-open)),pack(110,30,70));rect(dx,dy,dw,1,pack(255,140,190));
}

/* ---------- 9.9 machine sequence: credits, phases, grip, wins ---------- */
const S={mode:'title',t:0,demo:true,score:0,tickets:0,hi:parseInt(store.get('hd-'+CAB.id+'-hi','0'),10)||0,paused:false,
  credit:0,prizes:[],consol:0,page:0,pageT:0,lamp:'attract',winT:0,newHi:false,tShown:0,shake:0,flash:0,stats:{games:0,wins:0}};
const M={ph:'idle',t:0,timer:30,S:1,aDown:false,aT:0,lockPend:0,ptr:null,wins:[],beam:0,led:null,door:0,heldB:null,maxLift:0,slackT:0,
  touched:false,sqzT:0,vx:0,vz:0,tgtX:null,tgtZ:null,hurry:false,lastBeep:0,roll:0,msg:'',msgT:0,bonus:0};
const GVM=54,GVZ=30,GAC=130,XMIN=20,XMAX=PW-20,ZMIN=7,ZMAX=PD-7;
/* gantry: each axis either follows a velocity command or seeks a target, with acceleration limits (the swing comes free) */
function gantryTick(dt){
  const carry=M.ph==='carry',ac=carry?78:GAC;   /* carrying a prize the motors run gentler, like a careful operator */
  for(let ax=0;ax<2;ax++){const pos=ax?CL.gz:CL.gx,vel=ax?CL.gvz:CL.gvx,tg=ax?M.tgtZ:M.tgtX,cmd=ax?M.vz:M.vx,lo=ax?ZMIN:XMIN,hi=ax?ZMAX:XMAX;
    const vm=(ax?GVZ:GVM)*(carry?.7:1);   /* depth travels slower: it is a short axis */
    const want=tg!=null?clamp((tg-pos)*3.2,-vm,vm):cmd*vm,dv=clamp(want-vel,-ac*dt,ac*dt);let v=vel+dv,p=pos+v*dt;
    if(p<lo){p=lo;v=0;}else if(p>hi){p=hi;v=0;}
    if(ax){CL.gz=p;CL.gvz=v;}else{CL.gx=p;CL.gvx=v;}}
}
function rollStrength(){
  /* each credit's strength is rolled honestly and shown before you move; the last credit of a dry game gets a visible boost */
  let s=.42+.58*Math.pow(Math.random(),.85);
  if(!S.demo&&S.credit===3&&S.prizes.length===0)s=Math.max(s,.78);
  if(S.demo)s=.82+Math.random()*.18;
  return Math.round(s*100)/100;
}
function setPhase(p){M.ph=p;M.t=0;}
function newCredit(){
  if(S.demo)S.stats.demoTries=(S.stats.demoTries||0)+1;
  S.credit++;M.wins=[];M.S=rollStrength();CL.S=M.S;M.maxLift=0;M.heldB=null;M.touched=false;M.bonus=0;M.timer=30;M.hurry=false;
  M.tgtX=null;M.tgtZ=null;M.vx=0;M.vz=0;M.aDown=false;M.ptr=null;M.lockPend=0;M.slipped=false;M.overT=0;M.slackT=0;
  setPhase('roll');if(!S.demo){SFX.coin();}
}
function startDrop(){
  /* remember which plush this drop was aimed at (the AI avoids repeating a failed target) */
  let nb=null,nd=1e9;for(const b of BOD){if(b.state!=='pit')continue;const d=Math.abs(b.cx-CL.gx)+Math.abs(BZ[b.slot]-CL.gz)*.7-b.cy*.3;if(d<nd){nd=d;nb=b;}}M.aimB=nb;
  setPhase('drop');CL.motor=-1;M.tgtX=CL.gx;M.tgtZ=CL.gz;M.vx=M.vz=0;SFX.drop();M.led=[255,200,60];}
/* gameplay input during the two aim phases. Real-machine style: hold A to travel (right, then back) and let go
   to set; arrows/stick travel both ways; tap A sets; drag on the glass moves the claw; B drops at once. */
function aimInput(dt,c,e){
  const isX=M.ph==='aimX';
  if(e.a){M.aDown=true;M.aT=0;M.tgtX=M.tgtZ=null;}
  let v=0;const axisIn=isX?c.x:-c.y;
  if(Math.abs(axisIn)>.25){v=axisIn;M.tgtX=M.tgtZ=null;}
  if(M.aDown){M.aT+=dt;if(c.a){if(M.aT>.16)v=1;}else{M.aDown=false;M.lockPend=1;}}
  /* pointer: X follows the finger; depth follows a vertical drag (or a press on the top-down inset) */
  const P=PTR;
  if(P.pressed){M.ptr={x:P.x,y:P.y,gx:CL.gx,gz:CL.gz,inset:inInset(P.x,P.y),moved:false};}
  if(M.ptr&&P.down){const pt=M.ptr;if(Math.abs(P.x-pt.x)+Math.abs(P.y-pt.y)>2)pt.moved=true;
    if(pt.inset){const w=insetToWorld(P.x,P.y);if(isX)M.tgtX=clamp(w[0],XMIN,XMAX);else M.tgtZ=clamp(w[1],ZMIN,ZMAX);}
    else if(isX){if(pt.moved)M.tgtX=clamp(CAMX+(P.x-VX0)/(persp(CL.gz)*KS),XMIN,XMAX);}
    else if(pt.moved)M.tgtZ=clamp(pt.gz+(pt.y-P.y)*1.25/KS,ZMIN,ZMAX);}
  if(M.ptr&&P.released){const pt=M.ptr;M.ptr=null;
    if(!pt.moved&&!pt.inset&&isX)M.tgtX=clamp(CAMX+(P.x-VX0)/(persp(CL.gz)*KS),XMIN,XMAX);
    M.lockPend=1;}
  if(e.b){M.lockPend=2;}
  /* the axis that is not being set stays pinned where it was locked */
  if(isX){M.vx=M.tgtX==null?v:0;M.vz=0;M.tgtZ=M.zLock;}else{M.vz=M.tgtZ==null?v:0;M.vx=0;M.tgtX=M.xLock;}
}
function lockAxis(){
  if(M.ph==='aimX'){M.tgtX=M.xLock=clamp(CL.gx+CL.gvx*.12,XMIN,XMAX);M.tgtZ=null;SFX.lock();setPhase('aimZ');M.aDown=false;}
  else{SFX.lock();startDrop();}
}
function machineTick(dt,c,e){
  M.t+=dt;if(M.msgT>0)M.msgT-=dt;
  const ph=M.ph;
  if(ph==='prep'){ /* between attract and a paid game: open, go home, restock */
    CL.motor=-1;CL.winch=-34;M.tgtX=HOME_X;M.tgtZ=HOME_Z;M.beam=0;M.led=[120,140,255];
    if(M.t>.7&&restockQ.length===0&&Math.abs(CL.gx-HOME_X)<40)newCredit();   /* the roll keeps homing the claw */
  }else if(ph==='roll'){ /* the strength needle sweeps and settles on this credit's value */
    M.tgtX=HOME_X;M.tgtZ=HOME_Z;CL.motor=-1;CL.winch=-40;M.led=[255,120,255];
    const dur=S.demo?.5:1.5,p=clamp(M.t/dur,0,1),wob=(1-p)*(1-p);M.roll=clamp(M.S+Math.sin(M.t*23)*.5*wob,.05,1);
    if(!S.demo&&p<1)SFX.roll(M.roll);
    if(M.t>=dur&&Math.abs(CL.gx-HOME_X)<1.5&&Math.abs(CL.gz-HOME_Z)<1.5&&CL.L<LMIN+4){M.roll=M.S;if(!S.demo){SFX.settle(M.S);}setPhase('aimX');M.tgtX=null;M.tgtZ=M.zLock=CL.gz;M.timer=30;if(!S.demo)SFX.go();}
  }else if(ph==='aimX'||ph==='aimZ'){
    M.beam=Math.min(1,M.beam+dt*3);M.led=[90,255,140];CL.motor=-1;CL.winch=-34;
    if(S.demo)pilot(dt);else aimInput(dt,c,e);
    if(!S.demo){M.timer-=dt;
      if(M.timer<10&&!M.hurry){M.hurry=true;setTrack('hurry');}
      if(M.timer<5.5&&Math.ceil(M.timer)!==M.lastBeep){M.lastBeep=Math.ceil(M.timer);SFX.beep(M.timer<3);}
      if(M.timer<=0){M.timer=0;M.msg='TIME!';M.msgT=1;SFX.beep(true);M.lockPend=2;}}
    /* a set request locks once the carriage has arrived where it was sent (a tap = "go there and set") */
    if(M.lockPend===2){M.lockPend=0;SFX.lock();startDrop();}
    else if(M.lockPend===1){const tg=M.ph==='aimX'?M.tgtX:M.tgtZ,pos=M.ph==='aimX'?CL.gx:CL.gz;if(tg==null||Math.abs(pos-tg)<.8){M.lockPend=0;lockAxis();}}
  }else if(ph==='drop'){
    /* open, then pay out cable; stop when the cable goes slack (the claw rests on the heap) or at full length */
    M.beam=Math.max(0,M.beam-dt*1.5);
    if(M.t>.28){CL.winch=Math.min(50,Math.max(CL.winch,0)+5);
      const vy=(CL.hy-CL.oy)/HS;if(CL.slack>1&&vy>-15)M.slackT++;else M.slackT=0;
      if(CL.touch>0&&!M.touched){M.touched=true;SFX.poff(1,.8);dust(CL.hx,CL.hy-18,CL.hz,6);}
      if(M.slackT>2||CL.L>=LMAX){M.overT=(M.overT||0)+1;if(M.overT>9||CL.L>=LMAX){M.overT=0;M.slackT=0;CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-GYA,CL.hz-CL.gz)+.5);setPhase('grab');CL.motor=1;SFX.close();M.led=[255,70,90];}}}
    else{CL.winch=0;}
  }else if(ph==='grab'){
    if(M.t>1.0){setPhase('lift');CL.winch=-34;SFX.lift();}
  }else if(ph==='lift'){
    CL.winch=-Math.min(34,6+(CL.L-LMIN)*3);   /* the winch eases into its stop instead of jolting */
    if(CL.L<=LMIN+.05){CL.winch=0;if(M.t2==null)M.t2=0;M.t2+=dt;if(M.t2>.35){M.t2=null;setPhase('carry');M.tgtX=HOME_X;M.tgtZ=HOME_Z;SFX.rattle();}}
  }else if(ph==='carry'){
    if(Math.abs(CL.gx-HOME_X)<.6&&Math.abs(CL.gz-HOME_Z)<.6&&Math.abs(CL.gvx)+Math.abs(CL.gvz)<1){if(M.t2==null)M.t2=0;M.t2+=dt;if(M.t2>.45){M.t2=null;setPhase('release');CL.motor=-1;SFX.release();}}
  }else if(ph==='release'){
    if(M.t>1.9){setPhase('result');creditResult();}
  }else if(ph==='result'){
    if(M.t<dt*1.5&&!M.wins.length&&M.aimB)M.aimB.fails=(M.aimB.fails||0)+1;
    const dur=M.wins.length?3.4:1.9;
    if(M.t>dur){if(S.demo){S.credit=0;newCredit();}else if(S.credit>=3)gameOver();else newCredit();}
  }else if(ph==='idle'){CL.motor=-1;CL.winch=-34;M.tgtX=HOME_X;M.tgtZ=HOME_Z;M.beam=0;}
  /* grip telemetry, held plush, slips */
  if(ph==='lift'||ph==='carry'||ph==='release'){
    let hb=null,hp=0;for(const b of BOD)if(b.state==='pit'&&b.pc>hp&&b.cy>8){hp=b.pc;hb=b;}
    if(hb&&hb.cy>M.maxLift){M.maxLift=hb.cy;}
    if(hb)M.heldB=hb;
    else if(M.heldB&&ph!=='release'&&M.heldB.state==='pit'&&M.heldB.cy>20&&(M.heldB.cy<M.maxLift-6)){if(!M.slipped){M.slipped=true;SFX.slip();popup('SLIP!',CL.hx,CL.hy-30,CL.hz,'#ff7a9a');}}
  }
  if(ph==='grab'||ph==='lift'||ph==='carry'){CL.grip=clamp(1-CL.load*.55,0,1)*(CL.cnt?1:0);}else CL.grip=Math.max(0,CL.grip-dt*2);
}
function creditResult(){
  if(S.demo)return;
  if(M.wins.length===0){
    const close=M.maxLift>55,t=2+(close?2:0)+((Math.random()*2)|0);
    S.tickets+=t;S.consol+=t;S.score+=t*20;M.msg=close?'SO CLOSE!':'NICE TRY';M.msgT=1.9;popupHud('+'+t+' TICKETS','#ffd040');SFX.aww();
  }
  ARC.score(S.score);
}
/* a plush dropped through the hole */
function winPlush(b){
  const T=b.T;b.state='show';BACT[b.slot]=0;
  /* move it into the showcase stage (its own little world) and pop it toward the player */
  let cx=0,cy=0;for(let i=b.i0;i<b.i0+b.np;i++){cx+=X[i];cy+=Y[i];}cx/=b.np;cy/=b.np;
  const vx=60+Math.random()*20,vy=150+Math.random()*30;
  for(let i=b.i0;i<b.i0+b.np;i++){X[i]+=6-cx;Y[i]+=T.R+4-cy;OX[i]=X[i]-vx*HS;OY[i]=Y[i]-vy*HS;}
  b.show={t:0,x0:prX(CW*.5,0),done:false};b.mood=1;
  SFX.chute();setTimeout2(()=>{SFX.boing();M.door=1;},.25);
  if(M.ph==='prep'||M.ph==='idle'){kill(b);return;}   /* between games: back to the stockroom, no fanfare */
  M.wins.push(b);S.winT=0;S.lamp='win';
  if(!S.demo){
    const tix=T.tix,tb=Math.ceil(M.timer)*10,dbl=M.wins.length>1?1500:0,pts=tix*100+tb+dbl;
    S.tickets+=tix;S.score+=pts;S.prizes.push(T.i);S.stats.wins++;
    popupHud('+'+tix+' TICKETS','#ffd040');if(dbl)popupHud('DOUBLE!','#6aff5a');
    if(T.rar===4){SFX.jackpot();say('Jackpot!',.8,1);S.flash=1;}else{SFX.winner();say('Winner!',.9,1.05);S.flash=.5;}
    ARC.score(S.score);
  }else{SFX.winner();S.stats.demoWins=(S.stats.demoWins||0)+1;}
  hitStop(.12);S.shake=.5;confetti(46);
}
/* tiny deferred-call queue on simulation time */
const LATER=[];function setTimeout2(f,s){LATER.push({f,t:s});}

/* ---------- 9.10 restocking and the attract pilot ---------- */
const restockQ=[];let restockT=0;
function pickType(){let gold=BOD.some(b=>b.T.id==='gold')||restockQ.some(t=>t.id==='gold');if(!gold&&Math.random()<.06)return CASTI.gold;
  let tot=0;for(const t of CAST)tot+=t.wt;let r=Math.random()*tot;for(const t of CAST){r-=t.wt;if(r<0)return t;}return CAST[0];}
const TARGET_N=26;
function restockTick(dt){
  if(S.mode==='play'&&M.ph!=='prep')return;   /* real machines are restocked between games, not mid-credit */
  const live=BOD.filter(b=>b.state==='pit').length+restockQ.length;
  for(let k=live;k<TARGET_N;k++)restockQ.push(pickType());
  restockT-=dt;
  if(restockQ.length&&restockT<=0){restockT=.32;const T=restockQ.shift(),z=rnd(T.R*.7+1,PD-T.R*.7-1);
    spawn(T,rnd(CW+18,PW-16),PH-T.R-6,z,rnd(-1,1),rnd(-20,20),rnd(-40,0));}
}
function fillMachine(){
  /* boot: a settled heap, with a golden bear buried somewhere half the time */
  const types=[];for(let k=0;k<TARGET_N;k++)types.push(pickType());if(!types.some(t=>t.id==='gold')&&Math.random()<.5)types[(Math.random()*types.length)|0]=CASTI.gold;
  let k=0;for(let row=0;k<types.length;row++)for(let col=0;col<7&&k<types.length;col++,k++){const T=types[k];
    spawn(T,CW+18+col*26+rnd(-3,3),18+row*17+rnd(0,6),clamp(8+((k*7)%3)*15+rnd(0,4),T.R*.7+.5,PD-T.R*.7-.5),rnd(-.6,.6));}
  for(let t=0;t<240;t++)physTick();
  for(const b of BOD.slice())if(b.cy<-10)kill(b);
}
/* choose a plush the way a decent player would: on top, reachable, valuable */
function pickTarget(){let best=null,bs=-1e9;
  for(const b of BOD){if(b.state!=='pit'||b.cx<CW+14||b.cx>PW-16)continue;if(S.demo&&b.T.id==='gold')continue;
    let cover=0;for(const o of BOD){if(o===b||o.state!=='pit')continue;if(Math.abs(BZ[o.slot]-BZ[b.slot])<(BTH[o.slot]+BTH[b.slot])*.5&&Math.abs(o.cx-b.cx)<o.T.R+b.T.R-2&&o.cy>b.cy)cover++;}
    const sc=b.cy*1.4-cover*40+Math.min(b.T.tix,60)*.4-Math.abs(b.cx-120)*.04-(b.fails||0)*30+Math.random()*10;if(sc>bs){bs=sc;best=b;}}
  return best;}
const AI={tgt:null,err:0,wait:0};
function pilot(dt){
  if(M.ph==='aimX'){
    if(M.t<dt*1.5){AI.tgt=pickTarget();AI.err=rnd(-3.5,3.5);AI.wait=rnd(.15,.5);}
    const tx=AI.tgt?clamp(AI.tgt.cx+AI.err,XMIN,XMAX):rnd(80,200);M.tgtX=tx;M.tgtZ=M.zLock;
    if(Math.abs(CL.gx-tx)<.7&&Math.abs(CL.gvx)<2){AI.wait-=dt;if(AI.wait<=0){lockAxis();AI.wait=rnd(.2,.5);AI.err=rnd(-2.5,2.5);}}
  }else{
    const tz=AI.tgt&&AI.tgt.state==='pit'?clamp(BZ[AI.tgt.slot]+AI.err,ZMIN,ZMAX):PD*.5;M.tgtZ=tz;M.tgtX=M.xLock;
    if(Math.abs(CL.gz-tz)<.6&&Math.abs(CL.gvz)<2){AI.wait-=dt;if(AI.wait<=0)lockAxis();}
  }
}

/* ---------- 9.11 effects: particles (dots in the world), pop-up text, hit-stop ---------- */
const FXP=[];
function dust(x,y,z,n){for(let i=0;i<n;i++)FXP.push({x:x+rnd(-6,6),y:y+rnd(-2,4),z,vx:rnd(-20,20),vy:rnd(10,40),life:rnd(.3,.6),c:[200,180,220],k:0});}
function confetti(n){for(let i=0;i<n;i++)FXP.push({sx:rnd(0,W),sy:rnd(-20,0),vx:rnd(-20,20),vy:rnd(20,60),life:rnd(1.2,2.4),c:RAINBOW[(Math.random()*6)|0],k:1,ph:rnd(0,6)});}
function sparkle(sx,sy,n,c){for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(20,70);FXP.push({sx,sy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-20,life:rnd(.4,.9),c:c||[255,240,160],k:2});}}
const POP=[];
function popup(txt,x,y,z,col){POP.push({txt,sx:prX(x,z),sy:prY(y,z),t:0,col,big:false});}
function popupHud(txt,col){POP.push({txt,sx:W/2,sy:H*.4+POP.length*8*KS,t:0,col,big:true});}
let HSTOP=0;function hitStop(s){if(!reduce)HSTOP=Math.max(HSTOP,s);}
function fxTick(dt){
  for(const p of FXP){p.life-=dt;if(p.k===0){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=120*dt;}else{p.sx+=p.vx*dt*KS;p.sy+=p.vy*dt*KS;if(p.k===1){p.vx+=Math.sin(S.t*4+p.ph)*30*dt;p.vy=Math.min(p.vy+40*dt,50);}else p.vy+=80*dt;}}
  for(let i=FXP.length-1;i>=0;i--)if(FXP[i].life<=0)FXP.splice(i,1);
  for(const p of POP)p.t+=dt;for(let i=POP.length-1;i>=0;i--)if(POP[i].t>1.6)POP.splice(i,1);
  M.door=Math.max(0,M.door-dt*1.2);
  for(let i=LATER.length-1;i>=0;i--){LATER[i].t-=dt;if(LATER[i].t<=0){const f=LATER[i].f;LATER.splice(i,1);f();}}
}

/* ---------- 9.12 the world tick: physics + machine + plush moods + sounds from contacts ---------- */
function worldTick(dt,c,e){
  pmark('t_restock');restockTick(dt);
  gantryTick(dt);
  machineTick(dt,c||NOCTL,e||{});
  pmark('t_phys');physTick();pmark('t_after');
  /* wins, showcase, lost bodies */
  for(const b of BOD.slice()){
    if(b.state==='pit'){
      if(b.cx<CW&&b.cy<-b.T.R*1.2)winPlush(b);
      else if(b.cy<-60)kill(b);
    }else if(b.state==='show'){showTick(b,dt);}
  }
  /* moods: blink, sleepy, surprised in the claw, wheee when lifted, dizzy after a hard landing */
  for(const b of BOD){if(b.state!=='pit')continue;
    b.blink-=dt;if(b.blink<0){b.blinkOn=!b.blinkOn;b.blink=b.blinkOn?.12:rnd(1.8,5);}
    if(b.moodT>0){b.moodT-=dt;if(b.moodT<=0)b.mood=0;}
    if(b.pc>0&&(M.ph==='grab'||M.ph==='lift'||M.ph==='carry')){b.mood=b.cy>50?1:b.comp<.9?5:2;b.moodT=.5;}
    else if(b.imp>380&&b.moodT<=0){b.mood=3;b.moodT=1.4;}
    /* anticipation: plush right under the descending claw go wide-eyed */
    else if(M.ph==='drop'&&b.moodT<=0&&Math.abs(b.cx-CL.hx)<20&&Math.abs(BZ[b.slot]-CL.hz)<BTH[b.slot]*.6&&CL.hy-b.cy<45){b.mood=2;b.moodT=.4;}
    else if(b.moodT<=0&&b.sleepy&&S.mode==='title')b.mood=4;
    /* contact sounds (rate-limited inside SFX) */
    b.impT-=dt;if(b.imp>140&&b.impT<=0){b.impT=.25;if(b.imp>260)SFX.flump(clamp(b.imp/700,.2,1),1/b.T.mass);if(b.imp>420&&FXP.length<120)dust(b.cx,b.cy-b.T.R*.8,BZ[b.slot],3);}
    b.sqT-=dt;if(b.pc>2&&b.comp<.92&&b.sqT<=0){b.sqT=.6;SFX.squeak(b.T.sq);}
  }
  /* claw chatter when the carriage stops hard */
  const sp=Math.abs(CL.gvx)+Math.abs(CL.gvz);if(M.lastSp>25&&sp<8)SFX.clink();M.lastSp=sp;
  motorHum(sp,Math.abs(CL.winch));pmark(null);PROF.last=null;
}
const NOCTL={x:0,y:0,a:false,b:false};
function showTick(b,dt){
  const sh=b.show;sh.t+=dt;
  if(sh.t<.05)return;
  /* stage walls for the bouncing plush */
  for(let i=b.i0;i<b.i0+b.np;i++){const v=X[i]-OX[i];if(X[i]<RD[i]){X[i]=RD[i];OX[i]=X[i]+v*.5;}else if(X[i]>70-RD[i]){X[i]=70-RD[i];OX[i]=X[i]+v*.5;}}
  /* the prize rights itself (a bean-bag bottom) so it lands facing you, and drifts to centre stage */
  if(sh.t>.9){let mx=0;for(let i=b.i0;i<b.i0+b.n;i++)mx+=X[i];mx/=b.n;const f=(35-mx)*.0025;for(let i=b.i0;i<b.i0+b.np;i++)X[i]+=f;}
  if(sh.t>.25){let cx=0,cy=0;for(let i=b.i0;i<b.i0+b.np;i++){cx+=X[i];cy+=Y[i];}cx/=b.np;cy/=b.np;
    const a=-Math.atan2(Math.sin(b.ang),Math.cos(b.ang))*Math.min(.12,dt*3),c=Math.cos(a),sn=Math.sin(a);
    for(let i=b.i0;i<b.i0+b.np;i++){const x=X[i]-cx,y=Y[i]-cy;X[i]=cx+x*c-y*sn;Y[i]=cy+x*sn+y*c;const ox=OX[i]-cx,oy=OY[i]-cy;OX[i]=cx+ox*c-oy*sn;OY[i]=cy+ox*sn+oy*c;}}
  if(sh.t>2.9&&!sh.done){sh.done=true;}
  if(sh.t>3.5){kill(b);if(!sh.quiet&&!S.demo)S.shelfBump=1;}
}

/* ---------- 9.13 motor hum: one persistent voice whose gain/pitch follow the gantry and winch ---------- */
let HUM=null;
function motorHum(sp,wn){
  if(!AU.ctx||AU.ctx.state!=='running')return;
  if(!HUM){try{const c=AU.ctx,o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),gn=c.createGain();o.type='sawtooth';o2.type='square';o.frequency.value=60;o2.frequency.value=121;
    f.type='lowpass';f.frequency.value=500;gn.gain.value=0;o.connect(f);o2.connect(f);f.connect(gn);gn.connect(AU.sfx);o.start();o2.start();HUM={o,o2,f,gn};}catch(e){return;}}
  const t=AU.ctx.currentTime,lv=(S.paused||AU.muted)?0:clamp(sp/GVM,0,1)*.045+clamp(wn/50,0,1)*.04;
  HUM.gn.gain.setTargetAtTime(lv,t,.05);HUM.o.frequency.setTargetAtTime(48+sp*1.4+wn*1.6,t,.08);HUM.o2.frequency.setTargetAtTime(97+sp*2.8+wn*3,t,.08);HUM.f.frequency.setTargetAtTime(380+sp*14+wn*12,t,.08);
}

/* ---------- 9.14 HUD pieces: the top-down inset, gauges, bezel bulbs ---------- */
function insetRect(){const iw=Math.round(46*KS),ih=Math.round(20*KS);return [W-FR.sb-iw-2,FR.tb+2,iw,ih];}
function inInset(x,y){const [ix,iy,iw,ih]=insetRect();return x>=ix-2&&x<=ix+iw+2&&y>=iy-2&&y<=iy+ih+2&&(S.mode==='play');}
function insetToWorld(x,y){const [ix,iy,iw,ih]=insetRect();return [(x-ix)/iw*PW,(iy+ih-y)/ih*PD];}
function drawInset(){
  const [ix,iy,iw,ih]=insetRect(),mx=x=>ix+x/PW*iw,mz=z=>iy+ih-z/PD*ih;
  for(let y=iy-1;y<=iy+ih;y++)for(let x=ix-1;x<=ix+iw;x++){const i=y*W+x;if(x<ix||y<iy||x===ix+iw||y===iy+ih)RBUF[i]=pack(130,120,170);else{shadeI(i,.25);if(((x-ix)%Math.round(10*KS)===0)||((y-iy)%Math.round(8*KS)===0))addPx(i,10,8,18);}}
  /* chute */
  const cx1=mx(CW),cz1=mz(CD);for(let x=ix;x<cx1;x++){px(x,cz1,pack(255,200,60));}for(let y=Math.round(cz1);y<iy+ih;y++)px(cx1,y,pack(255,200,60));
  for(let y=Math.round(cz1)+1;y<iy+ih;y++)for(let x=ix;x<cx1;x++)if(((x+y)&1)===0)RBUF[y*W+x]=pack(50,30,10);
  /* plush as dots, brighter when higher in the heap */
  for(const b of BOD){if(b.state!=='pit')continue;const x=mx(b.cx),y=mz(BZ[b.slot]),k=.45+clamp(b.cy/60,0,1)*.6;const c=P3(b.T.col,k);rect(x-1,y-1,2,2,c);if(b.T.id==='gold'&&(S.t*4|0)%2)px(x,y-2,pack(255,255,200));}
  /* claw crosshair + phase guide line */
  const x=Math.round(mx(CL.hx)),y=Math.round(mz(CL.hz)),bl=(S.t*6|0)%2,cc=bl?pack(255,255,255):pack(90,255,160);
  if(M.ph==='aimX')for(let yy=iy;yy<iy+ih;yy+=2)px(x,yy,pack(90,255,160));
  if(M.ph==='aimZ')for(let xx=ix;xx<ix+iw;xx+=2)px(xx,y,pack(90,255,160));
  px(x,y,cc);px(x-2,y,cc);px(x+2,y,cc);px(x,y-2,cc);px(x,y+2,cc);
}
function gauge(x,y,w,h,v,c0,c1,label){
  rect(x-1,y-1,w+2,h+2,pack(130,120,170));rect(x,y,w,h,pack(14,10,22));
  const seg=Math.max(2,Math.round(3*KS)),ns=Math.floor(h/seg),on=Math.round(v*ns);
  for(let s=0;s<ns;s++){const t=s/(ns-1),c=mixC(c0,c1,t),lit=s<on,yy=y+h-(s+1)*seg;rect(x,yy+1,w,seg-1,lit?P3(c):P3(c,.16));}
}
function drawBulbs(){
  const t=S.t,bl=FR.bulbs,nb=bl.length/2,mode=S.lamp,bs=FR.bs;
  for(let i=0;i<nb;i++){const x=bl[2*i],y=bl[2*i+1];let c,k;
    if(mode==='win'){const ph=((t*8)|0)+i;c=RAINBOW[(i+((t*10)|0))%6];k=ph&1?1:.25;if(S.winT>2.2)k=.55+.45*Math.sin(t*20+i);}
    else if(mode==='hurry'){c=[255,60,50];k=((i+(t*14|0))%4<2)?1:.2;}
    else if(mode==='play'){c=[255,214,140];const q=((i-t*9)%7+7)%7;k=q<1.2?1:q<2.2?.45:.13;}
    else if(mode==='over'){c=[255,190,80];k=.35+.65*Math.max(0,Math.sin(t*2.2+i*.35));}
    else{c=RAINBOW[((i/3|0)+((t*3)|0))%6];const q=((i+t*16)%9+9)%9;k=q<2?1:q<3?.5:.16;}
    rect(x,y,bs,bs,P3(c,k));if(k>.6)glow(x+bs/2,y+bs/2,2.6*KS,c,.2*k);}
}

/* ---------- 9.15 render ---------- */
const DRAW=[],PROF={on:false,acc:{}};
function pmark(k){if(!PROF.on)return;const t=performance.now();if(PROF.last!=null)PROF.acc[PROF.lk]=(PROF.acc[PROF.lk]||0)+t-PROF.last;PROF.last=t;PROF.lk=k;}
function render(){pmark('bg');
  const sh=reduce?0:S.shake;const ox=Math.round((Math.random()-.5)*sh*4*KS),oy=Math.round((Math.random()-.5)*sh*3*KS);
  const src=(S.mode==='title'&&S.page===0)||S.mode==='over'?BG:BGN;
  if(ox||oy){for(let y=0;y<H;y++){const sy=clamp(y-oy,0,H-1);for(let x=0;x<W;x++)RBUF[y*W+x]=src[sy*W+clamp(x-ox,0,W-1)];}}else RBUF.set(src);
  pmark('gantry');drawGantry();pmark('bodies');
  /* depth-sorted pass: plush (back to front), the chute well at its back wall, the beam + claw at the claw depth */
  DRAW.length=0;for(const b of BOD)if(b.state==='pit')DRAW.push(b);
  DRAW.sort((a,b)=>BZ[b.slot]-BZ[a.slot]);
  const clawZ=CL.hz-6;let clawDone=false,holeDone=false;
  const lit=M.beam>.05;
  for(const b of DRAW){const z=BZ[b.slot];
    if(!holeDone&&z<CD){drawChuteHole();holeDone=true;}
    if(!clawDone&&z<clawZ){drawBeam();drawClaw();clawDone=true;}
    const s=persp(z)*KS,V=viewBody(b,VX0-CAMX*s,VY0+CAMY*s,s);
    V.dim=(.74+.3*(1-z/PD))*(.86+.18*clamp(b.cy/60,0,1));V.t=S.t;V.alpha=1;
    V.lit=lit&&Math.abs(z-CL.hz)<BTH[b.slot]*.5?1:0;
    if(V.lit){V.spx=prX(CL.hx,z);V.spw=(3+clamp((CL.hy-b.cy)*.18,0,14))*s;}
    drawView(V);
  }
  if(!holeDone)drawChuteHole();
  if(!clawDone){drawBeam();drawClaw();}
  pmark('chute');drawChuteFront();pmark('fx');
  /* world particles */
  for(const p of FXP){if(p.k!==0)continue;const x=prX(p.x,p.z),y=prY(p.y,p.z);disc(x,y,Math.max(.6,p.life*2*KS),P3(p.c),p.life*1.4);}
  /* glass glare */
  for(let y=FR.tb;y<H-FR.sb;y++){const xg=Math.round(W*.72-(y-FR.tb)*.5);for(let x=xg;x<xg+Math.round(3*KS);x++)if(x>=FR.sb&&x<W-FR.sb)addPx(y*W+x,7,7,11);}
  /* the showcase: won plush bouncing toward the player */
  for(const b of BOD)if(b.state==='show')drawShow(b);
  for(const p of FXP){if(p.k===0)continue;const c=P3(p.c,Math.min(1,p.life*1.5));if(p.k===1)rect(p.sx,p.sy,Math.max(1,KS*1.4),Math.max(1,KS*(1+Math.sin(S.t*12+p.ph))),c);else{px(p.sx,p.sy,c);glow(p.sx,p.sy,2*KS,p.c,.25*p.life);}}
  pmark('bulbs');drawBulbs();pmark('inset');
  if(S.mode==='play'&&!S.paused)drawInset();else if(S.mode==='title')drawInset();
  if(S.mode==='play')drawGauges();
  if(S.flash>0){const f=S.flash*40;for(let i=0;i<W*H;i+=1)addPx(i,f,f*.8,f*.5);}
  pmark('overlay');overlayPix();
  pmark('commit');commit();pmark('text');
  drawText();pmark(null);PROF.last=null;
}
function drawShow(b){
  const sh=b.show,t=sh.t,e=1-Math.pow(1-clamp(t/1.2,0,1),3),sc=(1+1.15*e)*KS;
  /* stage x=0..70 maps from the chute door (start) to centred on screen (settled) */
  const ox=lerp(sh.x0-6*KS,W/2-35*sc,e),oy=H-FR.sb-2-e*10*KS;
  let fade=1,ox2=ox,oy2=oy,sc2=sc;
  if(sh.done){const u=clamp((t-2.9)/.6,0,1),q=u*u;const tx=S.demo?W/2:shelfXY(S.prizes.length-1)[0],ty=S.demo?-20:shelfXY(S.prizes.length-1)[1];
    let cx=0,cy=0;for(let i=b.i0;i<b.i0+b.n;i++){cx+=X[i];cy+=Y[i];}cx/=b.n;cy/=b.n;const scx=ox+cx*sc,scy=oy-cy*sc;
    sc2=sc*(1-q*.75);ox2=lerp(scx,tx,q)-cx*sc2;oy2=lerp(scy,ty,q)+cy*sc2;}
  const V=viewBody(b,ox2,oy2,sc2);V.dim=.94*fade;V.t=S.t;V.lit=0;V.mood=1;V.blink=0;V.alpha=1;
  /* a dark halo behind the prize so it reads against the heap, a coloured rim light, sparkles */
  if(!sh.done){const rr=V.R*1.9,k=clamp(t*3,0,1);for(let y=Math.max(0,Math.floor(V.cy-rr));y<Math.min(H,V.cy+rr);y++)for(let x=Math.max(0,Math.floor(V.cx-rr));x<Math.min(W,V.cx+rr);x++){const d=((x-V.cx)**2+(y-V.cy)**2)/(rr*rr);if(d<1)shadeI(y*W+x,1-.55*k*(1-d));}}
  if(t>.3&&t<2.9&&Math.random()<.4)sparkle(V.cx+rnd(-1,1)*V.R,V.cy+rnd(-1,1)*V.R,1,b.T.rar===4?[255,220,80]:[255,255,255]);
  glow(V.cx,V.cy-V.R*.2,V.R*2.1,b.T.rar===4?[255,170,30]:[255,90,190],.12);
  drawView(V);
}
function shelfXY(i){return [W-FR.sb-8*KS-i*11*KS,H-FR.sb-8*KS];}
function drawGauges(){
  const x=FR.sb+3,y=FR.tb+Math.round(14*KS),w=Math.max(3,Math.round(4*KS)),h=Math.round(44*KS);
  const v=M.ph==='roll'?M.roll:M.S;gauge(x,y,w,h,v,[255,70,60],[90,255,120]);
  if(M.ph==='grab'||M.ph==='lift'||M.ph==='carry')gauge(x+w+Math.round(4*KS),y,w,h,CL.grip,[255,90,60],[80,200,255]);
  /* prize shelf: what you have won this game */
  for(let i=0;i<S.prizes.length;i++){const [sx,sy]=shelfXY(i),T=CAST[S.prizes[i]];const V=viewPuppet(T,sx,sy,.34*KS,Math.sin(S.t*3+i)*.12,1);V.dim=1;drawView(V);}
}
/* ---- bitmap text through a glyph atlas: an outlined glyph is ~90 fillRects, a cached one is one drawImage.
   Cached per (font, glyph, colour, scale, outline) so the set is bounded and never churns canvases.
   Glyph canvases are CPU-backed (willReadFrequently) so blitting into the CPU matrix canvas never reads back. */
const GLC=new Map();
function glyph(k5,ch,col,sc,it,out){
  const ck=Array.isArray(col)?(col._k||(col._k=col.join(''))):col,key=(k5?'5':'3')+ch+ck+'|'+sc+'|'+it+'|'+out;let c=GLC.get(key);
  if(!c){const o=out?(k5?Math.max(1,sc>>1):1):0,gw=k5?5:(G3[ch]||G3[ch.toUpperCase()]||['000'])[0].length,w=gw*sc+2*o+2+Math.ceil(6*sc*it),h=(k5?7:5)*sc+2*o+2;
    c=document.createElement('canvas');c.width=Math.max(1,w);c.height=h;const cx=c.getContext('2d',{willReadFrequently:true});
    if(k5){if(out)otxt5(cx,ch,o+1,o+1,col,sc,undefined,it,'#000');else txt5(cx,ch,o+1,o+1,col,sc,undefined,it);}
    else{if(out)otxt3(cx,ch,o+1,o+1,col,sc);else txt3(cx,ch,o+1,o+1,col,sc);}
    c._o=o+1;GLC.set(key,c);}
  return c;
}
function T5(s,x,y,col,sc=1,al,it=0,out=true){const w=tw5(s,sc);if(al==='c')x=Math.round(x-w/2);else if(al==='r')x=x-w;
  for(let i=0;i<s.length;i++){const ch=s[i];if(ch!==' '){const c=glyph(true,ch,col,sc,it,out);g.drawImage(c,x-c._o,y-c._o);}x+=6*sc;}}
function T3(s,x,y,col,sc=1,al,out=true){const w=tw3(s,sc);if(al==='c')x=Math.round(x-w/2);else if(al==='r')x=x-w;
  for(let i=0;i<s.length;i++){const ch=s[i],gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){x+=4*sc;continue;}const c=glyph(false,ch,col,sc,0,out);g.drawImage(c,x-c._o,y-c._o);x+=(gg[0].length+1)*sc;}}
function dimRect(x0,y0,w,h,k){const xa=Math.max(0,x0|0),xb=Math.min(W,(x0+w)|0),ya=Math.max(0,y0|0),yb=Math.min(H,(y0+h)|0);for(let y=ya;y<yb;y++)for(let x=xa;x<xb;x++)shadeI(y*W+x,k);}
const LAMPG=['#ffffff','#fff3c4','#ffe066','#ffc21a','#ff9a10','#ff6a10','#c0400a'];
/* pixel half of the overlays (before commit): dim panels, puppets, the ticket strip */
function overlayPix(){
  const t=S.t,gl0=FR.sb,gt=FR.tb,gw=W-FR.sb*2,gh=H-FR.tb-FR.sb;
  if(S.mode==='title'){const pg=S.page,big=W>=300?4:W>=240?3:2;
    if(pg===0){const y0=gt+Math.round(H*.1)-2;dimRect(gl0,y0,gw,Math.round(big*16+16*KS),.2);dimRect(gl0,y0+Math.round(big*16+16*KS),gw,Math.round(8*KS),.45);const py=Math.round(H*.7)-3;dimRect(Math.round(W*.28),py,Math.round(W*.44),Math.round(13*KS),.35);}
    else if(pg===1){dimRect(gl0,gt,gw,gh,.28);
      for(let i=0;i<8;i++){const T=CAST[i],col=i%4,row=i>>2,cx=Math.round(W*(.14+col*.24)),cy=Math.round(gt+H*(.3+row*.4));
        const V=viewPuppet(T,cx,cy,.72*KS,Math.sin(t*2.4+i)*.12,(t+i*.7)%3<.3?1:0);V.dim=1;V.t=t;drawView(V);
        if(T.rar>=3)glow(cx,cy,10*KS,T.rar===4?[255,190,40]:[255,90,200],.18+.08*Math.sin(t*5));}}
    else dimRect(gl0,gt,gw,gh,.3);}
  else if(S.mode==='over'){dimRect(gl0,gt,gw,gh,.2);
    const n=S.prizes.length;if(n){const sp=Math.min(30*KS,(W-40)/n);for(let i=0;i<n;i++){const T=CAST[S.prizes[i]],cx=Math.round(W/2+(i-(n-1)/2)*sp),cy=Math.round(H*.36),ap=clamp(t*2-i*.4,0,1);
      if(ap<=0)continue;glow(cx,cy,12*KS,T.rar===4?[255,190,40]:[255,120,200],.2);const V=viewPuppet(T,cx,cy-Math.round((1-ap)*10),.62*KS*ap+.01,Math.sin(t*3+i)*.15,1);V.dim=1;V.t=t;drawView(V);}}
    ticketStrip();}
  if(S.paused)dimRect(0,0,W,H,.36);
}
/* the ticket strip feeding out of the dispenser slot, folding into a pile on the floor */
function ticketStrip(){
  const per=Math.max(1,S.tickets/48),n=Math.round(S.tShown/per),sx=Math.round(W*.84),sy=Math.round(H*.47),tw=Math.max(5,Math.round(7*KS)),th=Math.max(2,Math.round(3*KS));
  rect(sx-tw,sy-3,tw*2,3,pack(16,10,24));rect(sx-tw,sy-3,tw*2,1,pack(120,100,150));
  const floor=H-FR.sb-2;let y=sy;
  for(let i=0;i<n;i++){const c=i%2?pack(255,176,64):pack(255,216,144),cd=pack(140,70,20);
    if(y+th<floor){const x=Math.round(sx-tw/2+Math.sin(i*.6+S.t*3)*1.2);rect(x,y,tw,th-1,c);px(x+tw-2,y,cd);y+=th;}
    else{const k=i,x=Math.round(sx-tw/2-((k*5)%9-4)*2),yy=floor-(((k-(n-(n%1)))%4+4)%4)-((k*3)%3);rect(x,yy,tw,1,c);}}
}
function drawText(){
  const tb=FR.tb,k=KS,midY=Math.round(tb/2-3.5);
  /* marquee: WINNER lamps in the middle, time + credits left, tickets right */
  const wl='WINNER',wx=Math.round(W/2-tw5(wl,1)/2);
  for(let i=0;i<6;i++){let on=false;if(S.lamp==='win'){const st=S.winT*8;on=S.winT<.9?i<=st%7:((S.winT*6)%1<.7);}
    T5(wl[i],wx+i*6,midY,on?LAMPG:'#4a1830',1,undefined,0,false);}
  if(S.mode==='play'){
    const tm=Math.ceil(M.timer),urgent=M.timer<10&&(M.ph==='aimX'||M.ph==='aimZ');
    T3('TIME',FR.sb+2,midY+1,'#a89cc8',1,undefined,false);T5(String(tm).padStart(2,'0'),FR.sb+2+tw3('TIME')+3,midY,urgent&&(S.t*4|0)%2?'#ff4a4a':'#ffd040',1,undefined,0,false);
    for(let i=0;i<3;i++){const cx=FR.sb+2+tw3('TIME')+18+i*6,used=i<S.credit-1,cur=i===S.credit-1;g.fillStyle=used?'#3a2a40':cur?((S.t*3|0)%2?'#ffd040':'#ff9a10'):'#ffd040';g.fillRect(cx,midY+1,4,5);}
    const ts=fmt(S.tickets);T5(ts,W-FR.sb-2,midY,'#ffd040',1,'r',0,false);T3('TIX',W-FR.sb-4-tw5(ts),midY+1,'#a89cc8',1,'r',false);
  }else{
    T3('HI '+fmt(S.hi),FR.sb+2,midY+1,'#a89cc8',1,undefined,false);T3(S.mode==='over'?'THANK YOU':'FREE PLAY',W-FR.sb-2,midY+1,'#a89cc8',1,'r',false);
  }
  if(S.mode==='play'){
    const gx=FR.sb+3,gy=FR.tb+Math.round(14*k),gh=Math.round(44*k);
    T3('STR',gx-1,gy-7,'#c8ffd0');T3(Math.round((M.ph==='roll'?M.roll:M.S)*100)+'%',gx-1,gy+gh+3,'#ffffff');
    if(M.ph==='grab'||M.ph==='lift'||M.ph==='carry')T3('GRIP',gx+Math.round(8*k)-1,gy+gh+10,'#a6f3ff');
    let pr='';const tch=touchy;
    if(M.ph==='aimX')pr=tch?'DRAG OR HOLD GO  > RIGHT':'HOLD SPACE OR > TO MOVE';else if(M.ph==='aimZ')pr=tch?'DRAG UP OR HOLD GO  > BACK':'HOLD SPACE OR UP FOR DEPTH';
    else if(M.ph==='drop')pr='DROP!';else if(M.ph==='grab')pr='GRAB!';else if(M.ph==='lift'||M.ph==='carry')pr=CL.grip>.05?'HOLD ON...':'';
    if(W<230&&pr.length>20)pr=M.ph==='aimX'?'MOVE  < >':'DEPTH  UP/DOWN';
    if(pr)T3(pr,Math.round(W/2),tb+3,'#ffffff',1,'c');
    if(M.ph==='roll'){const cy=Math.round(H*.36);T5('CREDIT '+S.credit,W/2,cy,GR.volt,W>=300?3:2,'c',.12);
      const pc=Math.round(M.roll*100);T5('STRENGTH '+pc,W/2,cy+(W>=300?28:20),pc>75?GR.green:pc>55?GR.volt:GR.red,1,'c');
      if(S.credit===3&&S.prizes.length===0&&M.S>=.78)T3('LAST CHANCE BOOST',W/2,cy+(W>=300?40:30),'#6aff5a',1,'c');}
    if(M.msgT>0&&M.msg)T5(M.msg,W/2,Math.round(H*.42),M.msg==='TIME!'?GR.red:GR.pink,2,'c',.1);
    if(M.ph==='result'&&M.wins.length){const big=W>=300?3:2,y=Math.round(H*.24);if((S.winT*6|0)%2||S.winT>1)T5(M.wins.some(b=>b.T.rar===4)?'JACKPOT!':'WINNER!',W/2,y,GR.volt,big,'c',.15);}
  }
  for(const p of POP){const a=p.t<.15?p.t/.15:p.t>1.2?1-(p.t-1.2)/.4:1;if(a<=0)continue;const yy=Math.round(p.sy-p.t*14*KS);g.globalAlpha=clamp(a,0,1);if(p.big)T5(p.txt,Math.round(p.sx),yy,p.col,1,'c');else T3(p.txt,Math.round(p.sx),yy,p.col,1,'c');g.globalAlpha=1;}
  /* chute label */
  {const cx=Math.round(prX(CW*.5,0)),cy=Math.round(prY(CH*.55,0)),hot=S.lamp==='win'&&(S.t*8|0)%2;T3('PRIZE',cx,cy,hot?'#ffffff':'#ffd040',1,'c');T3('V',cx,cy+7,hot?'#ffffff':'#ff9a10',1,'c');}
  if(S.mode==='title')titleText();else if(S.mode==='over')overText();
  if(S.paused){T5('PAUSED',W/2,Math.round(H*.38),GR.steel,2,'c',0);T3(touchy?'TAP TO RESUME':'ESC TO RESUME',W/2,Math.round(H*.38)+22,'#c8c0e0',1,'c');}
}
function wobText(s,x,y,sc,t){ /* per-letter bounce, like a plush settling */
  const w=tw5(s,sc);let cx=Math.round(x-w/2);for(let i=0;i<s.length;i++){const dy=Math.round(Math.sin(t*4-i*.55)*Math.max(1,sc*.6));T5(s[i],cx,y+dy,i%2?GR.pink:GR.cyan,sc);cx+=6*sc;}}
function titleText(){
  const t=S.t,pg=S.page,big=W>=300?4:W>=240?3:2;
  if(pg===0){
    const y=FR.tb+Math.round(H*.12);wobText('PLUSH',W/2,y,big,t);wobText('PANIC',W/2,y+big*8,big,t+1.2);
    T3('THE SOFT-BODY CLAW MACHINE',W/2,y+big*16+3,'#ffd6f0',1,'c');
    if((t*2|0)%2)T5(touchy?'TAP TO PLAY':'PRESS START',W/2,Math.round(H*.7),GR.volt,1,'c');
  }else if(pg===1){
    T5('PRIZES',W/2,FR.tb+3,GR.volt,1,'c');
    for(let i=0;i<8;i++){const T=CAST[i],col=i%4,row=i>>2,cx=Math.round(W*(.14+col*.24)),cy=Math.round(FR.tb+H*(.3+row*.4));
      T3(T.name.replace('GOLDEN ','GOLD '),cx,cy+Math.round(14*KS),RAR[T.rar].c,1,'c');T3(T.tix+' TIX',cx,cy+Math.round(14*KS)+7,'#ffd040',1,'c');}
  }else{
    T5('HOW TO PLAY',W/2,FR.tb+3,GR.cyan,1,'c');
    const lines=touchy?['1  DRAG SIDEWAYS, LIFT TO SET','2  DRAG UP FOR DEPTH, LIFT TO DROP','3  THE CLAW GRABS AND CARRIES','STRENGTH IS ROLLED EACH CREDIT','3 CREDITS  30 SECONDS EACH']:
      ['1  HOLD SPACE OR > , RELEASE TO SET','2  HOLD SPACE OR UP FOR DEPTH','3  THE CLAW GRABS AND CARRIES','STRENGTH IS ROLLED EACH CREDIT','3 CREDITS  30 SECONDS EACH'];
    lines.forEach((s,i)=>T3(W<230?s.replace(' , RELEASE TO SET','').replace(', LIFT TO SET','').replace(', LIFT TO DROP',''):s,W/2,FR.tb+Math.round(16*KS)+i*Math.round(11*KS),i<3?'#ffffff':'#ffd040',1,'c'));
    T3('WATCH THE TOP-DOWN MAP FOR DEPTH',W/2,H-FR.sb-10,'#a6f3ff',1,'c');
  }
}
function overText(){
  const t=S.t;
  T5(S.prizes.length?'YOUR HAUL':'GAME OVER',W/2,FR.tb+3,S.prizes.length?GR.volt:GR.pink,W>=300?2:1,'c');
  const n=S.prizes.length;
  if(n){const sp=Math.min(30*KS,(W-40)/n);for(let i=0;i<n;i++){const T=CAST[S.prizes[i]],cx=Math.round(W/2+(i-(n-1)/2)*sp),cy=Math.round(H*.36);if(t*2-i*.4>0)T3('+'+T.tix,cx,cy+Math.round(12*KS),'#ffd040',1,'c');}}
  else T3('NO PRIZE THIS TIME',W/2,Math.round(H*.33),'#c8c0e0',1,'c');
  if(S.consol)T3('CONSOLATION +'+S.consol,W/2,Math.round(H*.52),'#a89cc8',1,'c');
  const ty=Math.round(H*.6);T5('TICKETS '+fmt(S.tShown),W/2,ty,GR.volt,1,'c');
  T5('SCORE '+fmt(S.score),W/2,ty+11,'#ffffff',1,'c');
  if(S.newHi&&(t*4|0)%2)T3('NEW HIGH SCORE',W/2,ty+21,'#6aff5a',1,'c');
  if(t>2.5&&(t*2|0)%2)T3(touchy?'TAP TO CONTINUE':'PRESS START',W/2,H-FR.sb-8,'#ffb040',1,'c');
}

/* ---------- 10. FRAME LOOP — fixed 60 Hz simulation, render once per display frame ---------- */
const UIP={};
function setPause(on){if(S.mode!=='play')on=false;S.paused=on;$('pauseBtn').textContent=on?'Resume':'Pause';if(on)M.aDown=false;}
function newGame(){
  Object.assign(S,{score:0,tickets:0,credit:0,prizes:[],consol:0,demo:false,newHi:false,tShown:0,winT:9});
  S.mode='play';S.t=0;S.lamp='play';setPhase('prep');M.wins=[];AI.tgt=null;
}
function APP_start(){if(S.mode==='play')return;newGame();setTrack('play');SFX.confirm();S.stats.games++;}
function APP_attract(){S.mode='title';S.demo=true;S.paused=false;S.t=0;S.page=0;S.pageT=0;S.lamp='attract';S.credit=0;S.prizes=[];newCredit();setTrack('title');}
function gameOver(){
  S.mode='over';S.t=0;S.lamp='over';S.tShown=0;M.beam=0;setPhase('idle');
  if(S.score>S.hi){S.hi=S.score;store.set('hd-'+CAB.id+'-hi',S.hi);S.newHi=true;}else S.newHi=false;
  setTrack('over');say(S.prizes.length?'Great haul!':'Game over',.7,.95);ARC.over(S.score,S.tickets);
}
function tick(dt){
  const c=readCtl(),e={};for(const k of ['ok','back','pause','a','b','start']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  const tap=PTR.pressed;
  S.t+=dt;if(S.shake>0)S.shake=Math.max(0,S.shake-dt*2);if(S.flash>0)S.flash=Math.max(0,S.flash-dt*2.5);S.winT+=dt;
  if(S.lamp==='win'&&S.winT>3.4&&M.ph!=='result')S.lamp=S.mode==='play'?'play':S.mode==='title'?'attract':'over';
  if(S.mode==='play'&&S.lamp==='play'&&M.hurry&&(M.ph==='aimX'||M.ph==='aimZ'))S.lamp='hurry';else if(S.lamp==='hurry'&&!(M.ph==='aimX'||M.ph==='aimZ'))S.lamp='play';
  if(M.hurry&&!(M.ph==='aimX'||M.ph==='aimZ')&&S.mode==='play'){M.hurry=false;setTrack('play');}
  if(HSTOP>0){HSTOP-=dt;fxTick(dt*.25);return;}
  if(S.mode==='title'){
    worldTick(dt,null,null);fxTick(dt);
    S.pageT+=dt;if(S.pageT>(S.page===0?7:5.5)){S.pageT=0;S.page=(S.page+1)%3;}
    if(e.ok||e.start||K('Enter')&&e.pause||tap){audioInit();APP_start();}else if(e.back&&EMBED)ARC.exit();
  }else if(S.mode==='play'){
    if(e.pause){setPause(!S.paused);return;}
    if(S.paused){motorHum(0,0);if(tap)setPause(false);return;}
    worldTick(dt,c,e);fxTick(dt);
  }else if(S.mode==='over'){
    M.tgtX=HOME_X;M.tgtZ=HOME_Z;CL.motor=-1;CL.winch=-34;
    worldTick(dt,null,null);fxTick(dt);
    if(S.tShown<S.tickets&&S.t>.6){const rate=Math.max(18,S.tickets/2.4);const nt=Math.min(S.tickets,S.tShown+rate*dt);if((nt|0)>(S.tShown|0))SFX.ticket();S.tShown=nt;}
    if(S.t>2.5&&(e.ok||e.start||tap))APP_attract();else if(EMBED&&S.t>1.5&&e.back)ARC.exit();
  }
}
let ACC=0,LAST=0;const PERF={tick:0,render:0,present:0,n:0};
function frame(ts){
  const dt=LAST?Math.min(.05,(ts-LAST)/1000):1/60;LAST=ts;
  ACC+=dt;let n=0;const t0=performance.now();while(ACC>=1/60&&n<4){tick(1/60);ACC-=1/60;n++;}if(n===4)ACC=0;
  if(n>0)endInputFrame();
  const t1=performance.now();g.setTransform(1,0,0,1,0,0);render();const t2=performance.now();musicTick(S.paused);present();const t3=performance.now();
  if(n)PERF.tick+=((t1-t0)/n-PERF.tick)*.05;PERF.render+=((t2-t1)-PERF.render)*.05;PERF.present+=((t3-t2)-PERF.present)*.05;
  requestAnimationFrame(frame);
}
/* ---------- chrome + boot ---------- */
function toggleSound(){AU.muted=!AU.muted;store.set('hd-mute',AU.muted?'1':'0');setVolume();$('snd').textContent=AU.muted?'Sound off':'Sound on';try{if(AU.muted)speechSynthesis.cancel();}catch(e){}}
$('snd').addEventListener('click',e=>{audioInit();toggleSound();e.currentTarget.blur();});
$('res').addEventListener('click',e=>{setRes((resI+1)%CAB.res.length);layout();e.currentTarget.blur();});
$('pauseBtn').addEventListener('click',e=>{audioInit();setPause(!S.paused);e.currentTarget.blur();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
addEventListener('keydown',e=>{if(e.code==='KeyM'){audioInit();toggleSound();}});
addEventListener('resize',resize);
$('brand').firstChild.textContent=CAB.brand;$('brand').querySelector('span').textContent=CAB.sub;$('keys').innerHTML=CAB.keys;document.title='Plush Panic';
$('bA').textContent='GO';$('bB').textContent='DROP';
if(!gl)$('err').style.display='grid';
if(AU.muted)$('snd').textContent='Sound off';
setRes(resI);resize();fillMachine();APP_attract();
ARC.post('ready',{title:CAB.title,w:W,h:H,tickets:CAB.tickets});
/*HOOK*/
/* test hook (stripped from the published build): fast-forward and inspect */
window.__game={AU,SFX,PROF,S,M,CL,BOD,CAST,KEY,LATCH,PTR,TS,PERF,tick,render,ff(sec){for(let i=0;i<sec*60;i++)tick(1/60);endInputFrame();},start:APP_start,attract:APP_attract,setRes,
  hashStats(){let mx=0,occ=0;for(let c=0;c<GN;c++){const k=CST[c+1]-CST[c];if(k){occ++;if(k>mx)mx=k;}}let nan=0,ylo=1e9,yhi=-1e9,xlo=1e9,xhi=-1e9;for(let i=0;i<NP;i++){if(PB[i]<0)continue;if(!(X[i]===X[i]&&Y[i]===Y[i]))nan++;else{ylo=Math.min(ylo,Y[i]);yhi=Math.max(yhi,Y[i]);xlo=Math.min(xlo,X[i]);xhi=Math.max(xhi,X[i]);}}return {NP,mx,occ,nan,ylo,yhi,xlo,xhi,bod:BOD.length,show:BOD.filter(b=>b.state!=='pit').length};},
  ARCm:()=>ARC.muted,bz:b=>BZ[b.slot],pickTarget,physTick,setPause,endInput:endInputFrame,W:()=>W,H:()=>H,
  dropIn(b){const dx=CW*.5-b.cx,dy=CH+22-b.cy;for(let i=b.i0;i<b.i0+b.np;i++){X[i]+=dx;Y[i]+=dy;OX[i]=X[i];OY[i]=Y[i];}BZ[b.slot]=BOZ[b.slot]=CD*.45;b.zmode=2;},
  ffUntil(f,max=30){let n=0;while(!f()&&n<max*60){tick(1/60);endInputFrame();n++;}return n/60;},
  bench(n){let a=performance.now();for(let i=0;i<n;i++)tick(1/60);let b=performance.now();for(let i=0;i<n;i++){g.setTransform(1,0,0,1,0,0);render();}let c=performance.now();return {tick:(b-a)/n,render:(c-b)/n};}};
/*/HOOK*/
requestAnimationFrame(frame);
