/* ===================== pixel rasterizer: every machine is built from shaded capsules drawn straight onto the dot grid ===================== */
let XRAY=0,XRAYC=0,CUR=1,MODE=0,FACE=1,FRAME=0,RIM=[255,60,170],RIMK=1,RIMDIR=1,OUTLINE=pack(10,6,18);
const CLIP=[0,0,1,1];
let LX=-.42,LY=-.6,LZ=.68;{const l=Math.hypot(LX,LY,LZ);LX/=l;LY/=l;LZ/=l;}
let bx0=0,by0=0,bx1=0,by1=0;
const BAY=[-.07,.03,.07,-.03];
let GHOST=[255,255,255],GALPHA=.5,GHOSTP=0;
const WHITE=pack(255,255,255),FLASH=[pack(255,236,236),pack(255,246,246),WHITE,WHITE];
const HOLOX=new Int8Array(512);
const VIEW={ox:0,oy:0,S:60};
function beginActor(){CUR++;if(CUR>65000){STAMP.fill(0);CUR=1;}bx0=1e9;by0=1e9;bx1=-1;by1=-1;}
function setClip(x0,y0,x1,y1){CLIP[0]=Math.max(0,Math.floor(x0));CLIP[1]=Math.max(0,Math.floor(y0));CLIP[2]=Math.min(RW,Math.ceil(x1));CLIP[3]=Math.min(RH,Math.ceil(y1));}
function fullClip(){setClip(0,0,RW,RH);}
function setRim(c,dir){RIM=c;RIMDIR=dir;RIMK++;}
function setGhost(c,a){GHOST=c;GALPHA=a;GHOSTP=pack(c[0],c[1],c[2],a*255);}
function mkRamp(hex,o={}){
  const b=hexRGB(hex),amb=o.amb||[34,18,60];let cols;
  if(o.emi)cols=[b.map(c=>c*.78),b.map(c=>c*.92),b,b.map(c=>c+(255-c)*.6)];
  else cols=[b.map((c,i)=>c*.32+amb[i]*.42),b.map(c=>c*.64),b,b.map(c=>c+(255-c)*.4)];
  const p=cols.map(c=>pack(c[0],c[1],c[2]));
  const pf=cols.map(c=>pack(c[0]*.6+amb[0]*.16,c[1]*.6+amb[1]*.16,c[2]*.6+amb[2]*.16));
  return {base:b,cols,p,pf:o.emi?cols.map(c=>pack(c[0]*.8,c[1]*.8,c[2]*.8)):pf,emi:!!o.emi,rk:0,rc:0,rcf:0};
}
function rimOf(m,far){
  if(m.rk!==RIMK){const c=mixC(m.base,RIM,.68);m.rc=pack(c[0],c[1],c[2]);const f=mixC(m.base,RIM,.42);m.rcf=pack(f[0]*.72,f[1]*.72,f[2]*.72);m.rk=RIMK;}
  return far?m.rcf:m.rc;
}
function ghostPx(i){
  const d=RBUF[i],a=d>>>24;
  if(a===0)RBUF[i]=GHOSTP;
  else{const r=d&255,gg=(d>>>8)&255,bb=(d>>>16)&255;RBUF[i]=pack(r+(GHOST[0]-r)*GALPHA,gg+(GHOST[1]-gg)*GALPHA,bb+(GHOST[2]-bb)*GALPHA,a);}
}
/* the workhorse: a tapered capsule with toon shading, dithered bands, rim light and inner outlines */
function cap(ax,ay,bx,by,ra,rb,mat,pid,far,edge){
  if(ra<.55)ra=.55;if(rb<.55)rb=.55;
  const pad=(ra>rb?ra:rb)+1.6;
  let x0=Math.floor((ax<bx?ax:bx)-pad),x1=Math.ceil((ax>bx?ax:bx)+pad),y0=Math.floor((ay<by?ay:by)-pad),y1=Math.ceil((ay>by?ay:by)+pad);
  if(MODE===3){x0-=4;x1+=4;}
  if(x0<CLIP[0])x0=CLIP[0];if(y0<CLIP[1])y0=CLIP[1];if(x1>=CLIP[2])x1=CLIP[2]-1;if(y1>=CLIP[3])y1=CLIP[3]-1;
  if(x0>x1||y0>y1)return;
  const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy,inv=L2>1e-6?1/L2:0,L=Math.sqrt(L2)||1;
  const fn=typeof mat==='function';
  for(let py=y0;py<=y1;py++){
    const fy=py+.5,sh=MODE===3?HOLOX[py&511]:0,row=py*RW;
    for(let px=x0;px<=x1;px++){
      const fx=px+.5-sh;
      let t=((fx-ax)*dx+(fy-ay)*dy)*inv;if(t<0)t=0;else if(t>1)t=1;
      const ox=fx-ax-dx*t,oy=fy-ay-dy*t,d2=ox*ox+oy*oy,r=ra+(rb-ra)*t,i=row+px;
      if(d2<=r*r){
        if(MODE===2){ghostPx(i);EM[i]=1;continue;}
        if(MODE===4){if(STAMP[i]!==XRAY&&((px+py)&1)){RBUF[i]=XRAYC;EM[i]=1;}continue;}
        const ir=1/r,nx=ox*ir,ny=oy*ir,q=1-nx*nx-ny*ny,nz=q>0?Math.sqrt(q):0;
        const m=fn?mat(t,(oy*dx-ox*dy)*ir/L*FACE):mat;
        const dif=nx*LX+ny*LY+nz*LZ+BAY[((py&1)<<1)|(px&1)];
        const band=dif<.1?0:dif<.4?1:dif<.76?2:3;
        let c;
        if(!m.emi&&nx*RIMDIR>.48&&nz<.66)c=rimOf(m,far);
        else c=far?m.pf[band]:m.p[band];
        if(MODE===1)c=(((c>>>1)&0x7f7f7f)+0x7f7f7f|0xff000000)>>>0;
        if(MODE===3&&(py+FRAME)%3===0)c=(((c>>>1)&0x7f7f7f)|0xff000000)>>>0;
        RBUF[i]=c;STAMP[i]=CUR;PART[i]=pid;EM[i]=m.emi?1:2;
        if(px<bx0)bx0=px;if(px>bx1)bx1=px;if(py<by0)by0=py;if(py>by1)by1=py;
      }else if(edge&&STAMP[i]===CUR&&PART[i]!==pid){
        const re=r+1.05;if(d2<=re*re){RBUF[i]=OUTLINE;PART[i]=pid;EM[i]=0;}
      }
    }
  }
}
function dot(x,y,c,e){x|=0;y|=0;if(x<CLIP[0]||y<CLIP[1]||x>=CLIP[2]||y>=CLIP[3])return;const i=y*RW+x;RBUF[i]=c;STAMP[i]=CUR;PART[i]=250;EM[i]=e?1:0;}
function dline(x0,y0,x1,y1,c){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let k=0;k<=n;k++)dot(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c);}
function outlinePass(col){
  if(bx1<0)return;
  const x0=Math.max(CLIP[0],bx0-1),x1=Math.min(CLIP[2]-1,bx1+1),y0=Math.max(CLIP[1],by0-1),y1=Math.min(CLIP[3]-1,by1+1);let n=0;
  for(let y=y0;y<=y1;y++){const row=y*RW;for(let x=x0;x<=x1;x++){const i=row+x;if(STAMP[i]===CUR)continue;
    if((x>0&&STAMP[i-1]===CUR)||(x<RW-1&&STAMP[i+1]===CUR)||(y>0&&STAMP[i-RW]===CUR)||(y<RH-1&&STAMP[i+RW]===CUR))OLB[n++]=i;}}
  for(let k=0;k<n;k++){const i=OLB[k];RBUF[i]=col;STAMP[i]=CUR;PART[i]=255;EM[i]=0;}
}


/* ===================== oblique projection: ground squashed, height lifts up the screen ===================== */
let S=16,KY=.8,KZ=.72,OFFX=0,OFFY=0;
const PX=x=>x*S-OFFX,PY=(y,z)=>y*S*KY-(z||0)*S*KZ-OFFY;
function cap3(x0,y0,z0,x1,y1,z1,r0,r1,mat,pid,edge){cap(PX(x0),PY(y0,z0),PX(x1),PY(y1,z1),r0*S,r1*S,mat,pid,false,edge);}
function ball(x,y,z,r,mat,pid,edge){const sx=PX(x),sy=PY(y,z);cap(sx,sy,sx,sy,r*S,r*S,mat,pid,false,edge);}
/* ---------- flat primitives ---------- */
function fillR(x0,y0,x1,y1,c,e){
  x0=Math.max(CLIP[0],Math.round(x0));x1=Math.min(CLIP[2],Math.round(x1));y0=Math.max(CLIP[1],Math.round(y0));y1=Math.min(CLIP[3],Math.round(y1));
  if(x1<=x0||y1<=y0)return;const ev=e?1:0;
  for(let y=y0;y<y1;y++){const r=y*RW;RBUF.fill(c,r+x0,r+x1);EM.fill(ev,r+x0,r+x1);STAMP.fill(0,r+x0,r+x1);}
}
function fillEll(cx,cy,rx,ry,c,e){
  if(rx<.5||ry<.5)return;const y0=Math.max(CLIP[1],Math.floor(cy-ry)),y1=Math.min(CLIP[3]-1,Math.ceil(cy+ry)),ev=e?1:0;
  for(let y=y0;y<=y1;y++){const dy=(y+.5-cy)/ry;if(dy*dy>1)continue;const hw=rx*Math.sqrt(1-dy*dy),a=Math.max(CLIP[0],Math.round(cx-hw)),b=Math.min(CLIP[2],Math.round(cx+hw));if(b>a){const r=y*RW;RBUF.fill(c,r+a,r+b);EM.fill(ev,r+a,r+b);}}
}
function mulEll(cx,cy,rx,ry,k){
  if(rx<.5||ry<.5)return;const y0=Math.max(0,Math.floor(cy-ry)),y1=Math.min(RH-1,Math.ceil(cy+ry));
  for(let y=y0;y<=y1;y++){const dy=(y+.5-cy)/ry;if(dy*dy>1)continue;const hw=rx*Math.sqrt(1-dy*dy),a=Math.max(0,Math.round(cx-hw)),b=Math.min(RW,Math.round(cx+hw)),r=y*RW;
    for(let x=a;x<b;x++){const i=r+x,c=RBUF[i];RBUF[i]=(0xff000000|((((c>>>16)&255)*k)<<16)|((((c>>>8)&255)*k)<<8)|((c&255)*k))>>>0;}}
}
function mulR(x0,y0,x1,y1,k){
  x0=Math.max(0,Math.round(x0));x1=Math.min(RW,Math.round(x1));y0=Math.max(0,Math.round(y0));y1=Math.min(RH,Math.round(y1));
  for(let y=y0;y<y1;y++){const r=y*RW;for(let x=x0;x<x1;x++){const i=r+x,c=RBUF[i];RBUF[i]=(0xff000000|((((c>>>16)&255)*k)<<16)|((((c>>>8)&255)*k)<<8)|((c&255)*k))>>>0;}}
}
const shade=(c,k)=>pack((c&255)*k,((c>>>8)&255)*k,((c>>>16)&255)*k);
const hexP=h=>{const c=hexRGB(h);return pack(c[0],c[1],c[2]);};

/* ===================== light: ambient + baked lamps + dynamic lights, applied per dot ===================== */
let AMB=[.34,.35,.48],ACTL=.66;
function light(wx,wy,wz,rad,r,g,b){
  const sx=PX(wx),sy=PY(wy,(wz||0)*.25),rx=rad*S,ry=rad*S*KY;
  const x0=Math.max(0,Math.floor(sx-rx)),x1=Math.min(W-1,Math.ceil(sx+rx)),y0=Math.max(0,Math.floor(sy-ry)),y1=Math.min(H-1,Math.ceil(sy+ry));
  if(x0>x1||y0>y1)return;const irx=1/rx,iry=1/ry;
  for(let y=y0;y<=y1;y++){const dy=(y+.5-sy)*iry,dy2=dy*dy;if(dy2>=1)continue;const row=y*W;
    for(let x=x0;x<=x1;x++){const dx=(x+.5-sx)*irx,d2=dx*dx+dy2;if(d2>=1)continue;const f=(1-d2)*(1-d2),k=(row+x)*3;DL[k]+=r*f;DL[k+1]+=g*f;DL[k+2]+=b*f;}}
}
function cone(wx,wy,ang,len,half,r,g,b){
  const sx=PX(wx),sy=PY(wy,0),ca=Math.cos(ang),sa=Math.sin(ang),ch=Math.cos(half);
  const ex=[sx,sx+Math.cos(ang-half)*len*S,sx+Math.cos(ang+half)*len*S,sx+ca*len*S],ey=[sy,sy+Math.sin(ang-half)*len*S*KY,sy+Math.sin(ang+half)*len*S*KY,sy+sa*len*S*KY];
  const x0=Math.max(0,Math.floor(Math.min(...ex))),x1=Math.min(W-1,Math.ceil(Math.max(...ex))),y0=Math.max(0,Math.floor(Math.min(...ey))),y1=Math.min(H-1,Math.ceil(Math.max(...ey)));
  const iS=1/S,iSK=1/(S*KY),il=1/len,ich=1/(1-ch);
  for(let y=y0;y<=y1;y++){const dy=(y+.5-sy)*iSK,row=y*W;
    for(let x=x0;x<=x1;x++){const dx=(x+.5-sx)*iS,d=Math.sqrt(dx*dx+dy*dy);if(d>=len||d<.01)continue;const c=(dx*ca+dy*sa)/d;if(c<=ch)continue;
      const f=(1-d*il)*Math.min(1,(c-ch)*ich*2.2)*Math.min(1,d*.8),k=(row+x)*3;DL[k]+=r*f;DL[k+1]+=g*f;DL[k+2]+=b*f;}}
}
function lightPass(){
  const SL=WORLD.SL,AW=WORLD.AW,AH=WORLD.AH,ox=OFFX,oy=OFFY,ar=AMB[0],ag=AMB[1],ab=AMB[2];
  for(let y=0;y<H;y++){
    const ay=y+oy,inY=ay>=0&&ay<AH,row=y*W,arow=ay*AW;
    for(let x=0;x<W;x++){
      const i=row+x,e=EM[i];if(e===1)continue;
      const k=i*3;let lr=ar+DL[k],lg=ag+DL[k+1],lb=ab+DL[k+2];
      const ax=x+ox;if(inY&&ax>=0&&ax<AW){const s=(arow+ax)*3;lr+=SL[s]*.01;lg+=SL[s+1]*.01;lb+=SL[s+2]*.01;}
      if(e===2){if(lr<ACTL)lr=ACTL;if(lg<ACTL)lg=ACTL;if(lb<ACTL+.04)lb=ACTL+.04;}
      const c=RBUF[i],r=(c&255)*lr,gg=((c>>>8)&255)*lg,b=((c>>>16)&255)*lb;
      RBUF[i]=(0xff000000|((b>255?255:b)<<16)|((gg>255?255:gg)<<8)|(r>255?255:r))>>>0;
    }
  }
}
