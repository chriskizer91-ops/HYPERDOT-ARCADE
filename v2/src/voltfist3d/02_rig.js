/* ===================== pixel rasterizer: limbs are drawn as shaded capsules straight onto the dot grid ===================== */
let CUR=1,MODE=0,FACE=1,FRAME=0,RIM=[255,60,170],RIMK=1,RIMDIR=1,OUTLINE=pack(10,6,18);
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
        if(MODE===2){ghostPx(i);continue;}
        const ir=1/r,nx=ox*ir,ny=oy*ir,q=1-nx*nx-ny*ny,nz=q>0?Math.sqrt(q):0;
        const m=fn?mat(t,(oy*dx-ox*dy)*ir/L*FACE):mat;
        const dif=nx*LX+ny*LY+nz*LZ+BAY[((py&1)<<1)|(px&1)];
        const band=dif<.1?0:dif<.4?1:dif<.76?2:3;
        let c;
        if(!m.emi&&nx*RIMDIR>.48&&nz<.66)c=rimOf(m,far);
        else c=far?m.pf[band]:m.p[band];
        if(MODE===1)c=(((c>>>1)&0x7f7f7f)+0x7f7f7f|0xff000000)>>>0;
        if(MODE===3&&(py+FRAME)%3===0)c=(((c>>>1)&0x7f7f7f)|0xff000000)>>>0;
        RBUF[i]=c;STAMP[i]=CUR;PART[i]=pid;
        if(px<bx0)bx0=px;if(px>bx1)bx1=px;if(py<by0)by0=py;if(py>by1)by1=py;
      }else if(edge&&STAMP[i]===CUR&&PART[i]!==pid){
        const re=r+1.05;if(d2<=re*re){RBUF[i]=OUTLINE;PART[i]=pid;}
      }
    }
  }
}
function dot(x,y,c){x|=0;y|=0;if(x<CLIP[0]||y<CLIP[1]||x>=CLIP[2]||y>=CLIP[3])return;const i=y*RW+x;RBUF[i]=c;STAMP[i]=CUR;PART[i]=250;}
function dline(x0,y0,x1,y1,c){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let k=0;k<=n;k++)dot(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c);}
function outlinePass(col){
  if(bx1<0)return;
  const x0=Math.max(CLIP[0],bx0-1),x1=Math.min(CLIP[2]-1,bx1+1),y0=Math.max(CLIP[1],by0-1),y1=Math.min(CLIP[3]-1,by1+1);let n=0;
  for(let y=y0;y<=y1;y++){const row=y*RW;for(let x=x0;x<=x1;x++){const i=row+x;if(STAMP[i]===CUR)continue;
    if((x>0&&STAMP[i-1]===CUR)||(x<RW-1&&STAMP[i+1]===CUR)||(y>0&&STAMP[i-RW]===CUR)||(y<RH-1&&STAMP[i+RW]===CUR))OLB[n++]=i;}}
  for(let k=0;k<n;k++){const i=OLB[k];RBUF[i]=col;STAMP[i]=CUR;PART[i]=255;}
}

/* ===================== poses: hips, lean and four IK targets ===================== */
const PK=['hx','hy','lean','head','rot'],PV=['an','af','ln','lf'];
function P(base,o){
  const r={hx:0,hy:.8,lean:0,head:0,rot:0,an:[.3,1.3],af:[.1,1.3],ln:[.2,0],lf:[-.2,0],eN:0,eF:0,kN:0,kF:0};
  if(base)for(const k in base)r[k]=Array.isArray(base[k])?base[k].slice():base[k];
  if(o)for(const k in o)r[k]=Array.isArray(o[k])?o[k].slice():o[k];
  return r;
}
function cpPose(a,out){out=out||{};for(const k of PK)out[k]=a[k]||0;for(const k of PV){out[k]=out[k]||[0,0];out[k][0]=a[k][0];out[k][1]=a[k][1];}out.eN=a.eN;out.eF=a.eF;out.kN=a.kN;out.kF=a.kF;out.open=a.open;return out;}
function lerpPose(a,b,t,out){
  out=out||{};for(const k of PK)out[k]=lerp(a[k]||0,b[k]||0,t);
  for(const k of PV){const x=a[k],y=b[k];out[k]=out[k]||[0,0];out[k][0]=x[0]+(y[0]-x[0])*t;out[k][1]=x[1]+(y[1]-x[1])*t;}
  const s=t<.5?a:b;out.eN=s.eN;out.eF=s.eF;out.kN=s.kN;out.kF=s.kF;out.open=s.open;return out;
}
const EASE={lin:t=>t,out:t=>1-(1-t)*(1-t)*(1-t),in:t=>t*t*t,smooth:t=>t*t*(3-2*t),snap:t=>1-Math.pow(1-t,5)};
function keyPose(keys,f,out){
  if(f<=keys[0][0])return cpPose(keys[0][1],out);
  for(let i=1;i<keys.length;i++)if(f<=keys[i][0]){const a=keys[i-1],b=keys[i],tt=(f-a[0])/Math.max(1e-6,b[0]-a[0]);return lerpPose(a[1],b[1],EASE[b[2]||'smooth'](clamp(tt,0,1)),out);}
  return cpPose(keys[keys.length-1][1],out);
}
function ik(sx,sy,tx,ty,l1,l2,px,py,flip){
  let dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy)||1e-6;
  const mx=(l1+l2)*.9995,mn=Math.abs(l1-l2)+.02;
  if(d>mx){dx*=mx/d;dy*=mx/d;d=mx;}else if(d<mn){dx*=mn/d;dy*=mn/d;d=mn;}
  const a=Math.atan2(dy,dx),A=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
  const e1x=sx+Math.cos(a+A)*l1,e1y=sy+Math.sin(a+A)*l1,e2x=sx+Math.cos(a-A)*l1,e2y=sy+Math.sin(a-A)*l1;
  const s1=(e1x-sx)*px+(e1y-sy)*py,s2=(e2x-sx)*px+(e2y-sy)*py,u1=flip?s1<s2:s1>=s2;
  return [u1?e1x:e2x,u1?e1y:e2y,sx+dx,sy+dy];
}
function toePt(k,a,L){
  let dx=a[0]-k[0],dy=a[1]-k[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
  const lift=clamp(a[1]/.13,0,1);let px=dx+.9,py=dy;const pl=Math.hypot(px,py)||1;px/=pl;py/=pl;
  const tx=lerp(1,px,lift),ty=lerp(0,py,lift),tl=Math.hypot(tx,ty)||1;
  return [a[0]+tx/tl*L,a[1]+ty/tl*L];
}
const JPTS=['H','N','waist','chest','C','shN','shF','elN','elF','haN','haF','hpN','hpF','knN','knF','anN','anF','toN','toF'];
const JDIR=['hu','hfw','dir','q'];
function solve(p,b,J){
  J=J||{};const h=b.h,hx=p.hx*h,hy=p.hy*h,ln=p.lean*D2R,ht=(p.lean+p.head)*D2R;
  const dx=Math.sin(ln),dy=Math.cos(ln),qx=dy,qy=-dx,tor=b.torso*h;
  J.dir=[dx,dy];J.q=[qx,qy];J.H=[hx,hy];J.N=[hx+dx*tor,hy+dy*tor];
  J.waist=[hx+dx*tor*.16,hy+dy*tor*.16];J.chest=[hx+dx*tor*.72,hy+dy*tor*.72];
  const hdx=Math.sin(ht),hdy=Math.cos(ht);J.hu=[hdx,hdy];J.hfw=[hdy,-hdx];
  const nk=(b.neck+b.headR)*h;J.C=[J.N[0]+hdx*nk,J.N[1]+hdy*nk];J.R=b.headR*h;
  const sd=b.shDrop*h,SX=J.N[0]-dx*sd,SY=J.N[1]-dy*sd;
  J.shN=[SX+qx*b.shN*h,SY+qy*b.shN*h];J.shF=[SX+qx*b.shF*h,SY+qy*b.shF*h];
  J.hpN=[hx+qx*b.hipN*h,hy+qy*b.hipN*h];J.hpF=[hx+qx*b.hipF*h,hy+qy*b.hipF*h];
  const ua=b.uarm*h,fa=b.farm*h,th=b.thigh*h,sh=b.shin*h;
  let r=ik(J.shN[0],J.shN[1],p.an[0]*h,p.an[1]*h,ua,fa,.25,-1,p.eN);J.elN=[r[0],r[1]];J.haN=[r[2],r[3]];
  r=ik(J.shF[0],J.shF[1],p.af[0]*h,p.af[1]*h,ua,fa,.25,-1,p.eF);J.elF=[r[0],r[1]];J.haF=[r[2],r[3]];
  r=ik(J.hpN[0],J.hpN[1],p.ln[0]*h,p.ln[1]*h,th,sh,1,.15,p.kN);J.knN=[r[0],r[1]];J.anN=[r[2],r[3]];
  r=ik(J.hpF[0],J.hpF[1],p.lf[0]*h,p.lf[1]*h,th,sh,1,.15,p.kF);J.knF=[r[0],r[1]];J.anF=[r[2],r[3]];
  J.toN=toePt(J.knN,J.anN,b.footL*h);J.toF=toePt(J.knF,J.anF,b.footL*h);
  if(p.rot){
    const a=-p.rot*D2R,c=Math.cos(a),s=Math.sin(a),ox=hx,oy=hy;
    for(const k of JPTS){if(k==='H')continue;const v=J[k],x=v[0]-ox,y=v[1]-oy;v[0]=ox+x*c-y*s;v[1]=oy+x*s+y*c;}
    for(const k of JDIR){const v=J[k],x=v[0],y=v[1];v[0]=x*c-y*s;v[1]=x*s+y*c;}
  }
  return J;
}

/* ===================== cloth: verlet chains (headband tails, scarves, ponytails) ===================== */
let STAGEWIND=0,FRAMET=0;
function anchorL(name,J){
  const R=J.R,C=J.C,f=J.hfw,u=J.hu;
  switch(name){
    case 'band':return [C[0]-f[0]*R*1.02+u[0]*R*.44,C[1]-f[1]*R*1.02+u[1]*R*.44];
    case 'pony':return [C[0]-f[0]*R*.82+u[0]*R*.66,C[1]-f[1]*R*.82+u[1]*R*.66];
    case 'hair':return [C[0]-f[0]*R*.7+u[0]*R*.2,C[1]-f[1]*R*.7+u[1]*R*.2];
    case 'scarf':return [J.N[0]-J.q[0]*.07-J.dir[0]*.02,J.N[1]-J.q[1]*.07-J.dir[1]*.02];
    case 'belt':return [J.H[0]+J.dir[0]*.07+J.q[0]*.13,J.H[1]+J.dir[1]*.07+J.q[1]*.13];
    case 'shF':return J.shF;case 'shN':return J.shN;
  }
  return J.N;
}
function mkChains(def){return (def.look.chains||[]).map(o=>({o,p:null,q:null}));}
function updChain(ch,F){
  const o=ch.o,a=anchorL(o.anchor,F.J),ax=F.x+a[0]*F.face,ay=F.y+a[1],n=o.n,seg=o.seg*F.def.body.h;
  if(!ch.p){ch.p=[];ch.q=[];for(let i=0;i<=n;i++){const x=ax-F.face*i*seg*.8,y=ay-i*seg*.5;ch.p.push([x,y]);ch.q.push([x,y]);}}
  ch.p[0][0]=ax;ch.p[0][1]=ay;
  const gr=(o.g??1)*9.8/3600,wind=STAGEWIND/3600,fl=(o.flow||0)/3600,dm=o.damp||.9;
  for(let i=1;i<=n;i++){const p=ch.p[i],q=ch.q[i],vx=(p[0]-q[0])*dm,vy=(p[1]-q[1])*dm;q[0]=p[0];q[1]=p[1];
    p[0]+=vx+wind*(.55+.45*Math.sin(FRAMET*.06+i*.8+o.n))-F.face*fl;p[1]+=vy-gr+(o.lift||0)/3600;if(p[1]<.02)p[1]=.02;}
  for(let i=1;i<=n;i++){const a2=ch.p[i-1],p=ch.p[i],dx=p[0]-a2[0],dy=p[1]-a2[1],l=Math.hypot(dx,dy)||1e-6;p[0]=a2[0]+dx/l*seg;p[1]=a2[1]+dy/l*seg;}
}
function drawChain(ch,F,m,pid){
  if(!ch.p)return;const o=ch.o,S=VIEW.S,k=F.def.body.h,n=o.n;
  for(let i=0;i<n;i++){
    const a=ch.p[i],b=ch.p[i+1],w0=lerp(o.w[0],o.w[1],i/n)*S*k,w1=lerp(o.w[0],o.w[1],(i+1)/n)*S*k;
    cap(VIEW.ox+a[0]*S,VIEW.oy-a[1]*S,VIEW.ox+b[0]*S,VIEW.oy-b[1]*S,w0,w1,m,pid,false,false);
  }
}

/* ===================== drawing a fighter ===================== */
const SPT={};for(const k of JPTS)SPT[k]=[0,0];
function lsp(F,lx,ly){return [VIEW.ox+(F.x+lx*F.face)*VIEW.S,VIEW.oy-(F.y+ly)*VIEW.S];}
function matAt(m,t){return typeof m==='function'?m(t,0):m;}
function drawFighter(F,o){
  const d=F.def,b=d.body,L=d.look,J=F.Jr,Q=SPT,S=VIEW.S;
  MODE=(o&&o.mode)||0;FACE=F.face;
  for(const k of JPTS){const p=J[k],s=Q[k];s[0]=VIEW.ox+(F.x+p[0]*F.face)*S;s[1]=VIEW.oy-(F.y+p[1])*S;}
  const rs=S*b.h*b.bulk;
  beginActor();
  const C=(a,c,r0,r1,m,id,far,edge)=>cap(Q[a][0],Q[a][1],Q[c][0],Q[c][1],r0*rs,r1*rs,m,id,far,edge);
  C('shF','elF',b.rU[0],b.rU[1],L.uarm,1,true,false);
  C('elF','haF',b.rF[0],b.rF[1],L.farm,2,true,false);
  C('haF','haF',b.rHand,b.rHand,L.hand,3,true,false);
  C('hpF','knF',b.rT[0],b.rT[1],L.thigh,4,true,false);
  C('knF','anF',b.rS[0],b.rS[1],L.shin,5,true,false);
  C('anF','toF',b.rFoot,b.rFoot*.82,L.foot,6,true,false);
  if(F.chains)for(const ch of F.chains)if(ch.o.layer!=='front')drawChain(ch,F,L[ch.o.mat],9);
  C('waist','chest',b.rWaist,b.rChest,L.torso,7,false,false);
  {const H=J.H,dd=J.dir,a=lsp(F,H[0]-dd[0]*.03,H[1]-dd[1]*.03),c=lsp(F,H[0]+dd[0]*.08,H[1]+dd[1]*.08);cap(a[0],a[1],c[0],c[1],b.rPelvis*rs,b.rWaist*rs*1.02,L.pelvis,8,false,false);}
  if(L.belt){const H=J.H,dd=J.dir,q=J.q,bw=b.rPelvis*b.bulk*1.05,a=lsp(F,H[0]+dd[0]*.075-q[0]*bw,H[1]+dd[1]*.075-q[1]*bw),c=lsp(F,H[0]+dd[0]*.075+q[0]*bw,H[1]+dd[1]*.075+q[1]*bw);
    cap(a[0],a[1],c[0],c[1],(L.beltW||.034)*rs,(L.beltW||.034)*rs,L.belt,16,false,false);
    if(L.buckle){const m=lsp(F,H[0]+dd[0]*.075+q[0]*bw*.75,H[1]+dd[1]*.075+q[1]*bw*.75);cap(m[0],m[1],m[0],m[1],L.buckle*rs,L.buckle*rs,L.buckleM,17,false,false);}}
  C('hpN','knN',b.rT[0],b.rT[1],L.thigh,10,false,true);
  C('knN','anN',b.rS[0],b.rS[1],L.shin,11,false,true);
  C('anN','toN',b.rFoot,b.rFoot*.82,L.foot,12,false,true);
  if(L.collar)L.collar(F,J,rs);
  drawHead(F,J,Q,L,b,rs);
  if(L.chestFx)L.chestFx(F,J,rs);
  C('shN','shN',b.rDelt,b.rDelt,matAt(L.uarm,0),20,false,true);
  C('shN','elN',b.rU[0],b.rU[1],L.uarm,21,false,true);
  C('elN','haN',b.rF[0],b.rF[1],L.farm,22,false,true);
  C('haN','haN',b.rHand,b.rHand,L.hand,23,false,true);
  if(F.chains)for(const ch of F.chains)if(ch.o.layer==='front')drawChain(ch,F,L[ch.o.mat],24);
  if(MODE!==2)outlinePass(OUTLINE);
  MODE=0;
}
function drawHead(F,J,Q,L,b,rs){
  const S=VIEW.S,fc=F.face,Cs=Q.C,R=J.R*S*(L.headK||1);
  const ux=J.hu[0]*fc,uy=-J.hu[1],fx=J.hfw[0]*fc,fy=-J.hfw[1];
  const hp=(f,u)=>[Cs[0]+fx*f*R+ux*u*R,Cs[1]+fy*f*R+uy*u*R];
  const cp=(a,c,r0,r1,m,id,edge)=>cap(a[0],a[1],c[0],c[1],r0,r1,m,id,false,edge);
  cp(Q.N,hp(-.08,-.75),b.rNeck*rs,b.rNeck*rs*.92,L.skin,13);
  const st=L.hairStyle;
  if(st==='bald'||st==='holo')cp(Cs,Cs,R,R,st==='holo'?L.helm:L.skin,14);
  else{const hc=hp(-.2,.15);cp(hc,hc,R*1.05,R*1.05,L.hair,14);const fcp=hp(.17,-.16);cp(fcp,fcp,R*.85,R*.85,L.skin,15);}
  if(L.spikes)for(const s of L.spikes){const a=s[0]*D2R,dvx=ux*Math.cos(a)+fx*Math.sin(a),dvy=uy*Math.cos(a)+fy*Math.sin(a);
    cp([Cs[0]+dvx*R*.45,Cs[1]+dvy*R*.45],[Cs[0]+dvx*R*s[1],Cs[1]+dvy*R*s[1]],R*s[2],Math.max(.55,R*.07),L.hair,18);}
  if(L.beard)cp(hp(-.3,-.36),hp(.62,-.74),R*.34,R*.3,L.beard,19);
  if(L.gear==='band'){cp(hp(1.0,.34),hp(-.98,.5),R*.2,R*.22,L.band,19);const k=hp(-1.04,.44);cp(k,k,R*.24,R*.24,L.band,19);}
  else if(L.gear==='mask')cp(hp(1.0,-.3),hp(-.3,-.44),R*.5,R*.42,L.mask,19);
  if(MODE===2)return;
  const rr=Math.max(1,Math.round(R/6));
  if(L.gear==='visor'||st==='holo'){cp(hp(1.02,.06),hp(-.12,.12),R*.2,R*.16,L.visor,19);}
  else{
    const e=hp(.56,.06),hurt=F.hurtT>0||F.state==='kd';
    if(hurt){dline(e[0]-fx*rr,e[1]-fy*rr,e[0]+fx*rr*.5,e[1]+fy*rr*.5,L.eyeD);}
    else{if(R>=5)dot(e[0]-fx*1.2,e[1]-fy*1.2,L.eyeW);dot(e[0],e[1],L.eyeD);if(R>=9)dot(e[0]-fx*1.2,e[1]-fy*1.2+1,L.eyeW);}
    const b0=hp(.3,.36),b1=hp(.78,.24);dline(b0[0],b0[1],b1[0],b1[1],L.brow||L.eyeD);
    if(R>=7&&L.gear!=='mask'){const m=hp(.62,-.46);dot(m[0],m[1],L.mouth||L.eyeD);}
  }
}
