/* =====================================================================================
   9. GAME — PLUSH PANIC, the claw machine.
      The pit is a 3-D box seen through the front glass. Every plush is a 2-D soft body living in the
      X-Y plane at its own depth Z with a thickness ("slab"): a verlet ring with edge, pressure (area) and
      shape-matching constraints, plus limb chains (ears, tails, tentacles). Two bodies only touch where
      their depth slabs overlap, so the heap is three rows deep and still cheap. The claw is a 3-D
      pendulum on a winch cable under a moving gantry, with two rigid hooked prongs (capsules) driven by a
      torque-limited motor. Grip is honest Coulomb friction from whatever squeeze the motor can deliver.
   ===================================================================================== */
//#PHYS-BEGIN
/* ---------- 9.1 world (world units ~ matrix pixels at the front glass at 256 wide) ---------- */
const PW=240,PD=50,PH=124;            // pit: x 0..PW left to right, z 0..PD front glass to back wall, y up from the floor
const CW=54,CD=32,CH=40,CWT=1.6;      // prize chute: open-top box in the front-left corner (x<CW, z<CD), rim height CH, wall half-thickness
const HOME_X=CW*.5,HOME_Z=CD*.5;      // the claw parks right over the chute
const SUBS=4,HS=1/(60*SUBS),H2=HS*HS,GRAV=560,DAMP=.997;
const MU_S=.7,MU_K=.45,FL_S=.95,FL_K=.6;   // plush-plush and plush-floor friction (static / kinetic)
const D2R=Math.PI/180;

/* ---------- 9.2 the cast: ring shape, stiffness, limbs, palette, face, value ----------
   shape(a) = radius factor at ring angle a (0 = +x, 90deg = up), ks = shape-matching stiffness per substep
   (low = squishy), ka = pressure stiffness, mass per particle, fric = fabric grip multiplier.
   limbs: at = ring angle of the anchor point, dir = rest direction (body frame), n points of len each,
   k = direction-spring stiffness (low = floppy), r = radius, curl = bend per segment, back = drawn behind. */
const RAR=[{n:'COMMON',c:'#c8d0e8'},{n:'UNCOMMON',c:'#6aff5a'},{n:'RARE',c:'#4fe0ff'},{n:'EPIC',c:'#ff6ac0'},{n:'JACKPOT',c:'#ffd040'}];
const roundBody=a=>1-.16*Math.max(0,-Math.sin(a))**3;   /* plush sit on a slightly flattened, bean-filled base */
const CAST=[
 {id:'bear',name:'BEAR',rar:0,tix:15,wt:24,R:12.5,N:16,sx:1,sy:.95,shape:roundBody,ks:0.04,ka:0.25,mass:1,fric:1,sq:.75,
  col:[182,112,60],sec:[244,208,156],acc:[246,140,150],ol:[66,30,14],
  limbs:[{at:128,dir:126,n:1,len:4.4,k:.22,r:3.6,kind:'ear',back:1},{at:52,dir:54,n:1,len:4.4,k:.22,r:3.6,kind:'ear',back:1},
         {at:243,dir:258,n:1,len:3.2,k:.25,r:3,kind:'foot',back:1},{at:297,dir:282,n:1,len:3.2,k:.25,r:3,kind:'foot',back:1}],
  face:{ex:.36,ey:.14,mouth:'u',muzzle:1,nose:1,blush:0}},
 {id:'bunny',name:'BUNNY',rar:0,tix:15,wt:24,R:11.5,N:16,sx:.95,sy:1.03,shape:roundBody,ks:0.035,ka:0.25,mass:.95,fric:1,sq:1.25,
  col:[238,234,250],sec:[255,150,196],acc:[255,120,170],ol:[96,72,120],
  limbs:[{at:104,dir:98,n:4,len:3.3,k:.16,taper:.75,curl:.06,r:2.6,m:.35,kind:'lear',back:1},{at:76,dir:82,n:4,len:3.3,k:.16,taper:.75,curl:-.06,r:2.6,m:.35,kind:'lear',back:1},
         {at:245,dir:262,n:1,len:3,k:.25,r:2.8,kind:'foot',back:1},{at:295,dir:278,n:1,len:3,k:.25,r:2.8,kind:'foot',back:1}],
  face:{ex:.34,ey:.1,mouth:'w',nose:2,blush:1}},
 {id:'cat',name:'KITTY',rar:1,tix:20,wt:16,R:12,N:16,sx:1.05,sy:.92,shape:roundBody,ks:0.04,ka:0.25,mass:1,fric:1,sq:1.05,
  col:[250,152,54],sec:[255,236,204],acc:[196,84,26],ol:[92,36,8],
  limbs:[{at:130,dir:118,n:1,len:5.6,k:.3,r:2.6,kind:'tri',back:1},{at:50,dir:62,n:1,len:5.6,k:.3,r:2.6,kind:'tri',back:1},
         {at:330,dir:5,n:4,len:3.2,k:.09,taper:.5,curl:.42,r:2.1,kind:'tail',back:1}],
  face:{ex:.38,ey:.06,mouth:'w',nose:2,blush:0,whisk:1,stripes:1}},
 {id:'octo',name:'OCTOPUS',rar:1,tix:25,wt:14,R:11.5,N:16,sx:1.06,sy:1,shape:a=>Math.sin(a)>=0?1:1-.36*(-Math.sin(a)),ks:0.032,ka:0.28,mass:1,fric:1.05,sq:1.4,
  col:[236,82,166],sec:[255,176,216],acc:[255,120,190],ol:[104,16,66],
  limbs:[-52,-26,0,26,52].map(o=>({at:270+o*.9,dir:270+o*.85,n:4,len:2.9,k:.05,taper:.4,curl:o>0?.1:o<0?-.1:0,r:2.3,kind:'tent',back:1})),
  face:{ex:.3,ey:.05,mouth:'o',blush:1,spots:1}},
 {id:'star',name:'STAR',rar:2,tix:35,wt:9,R:14,N:20,sx:1,sy:1,shape:a=>.55+.45*((Math.cos(5*(a-Math.PI/2))+1)/2)**1.6,ks:0.075,ka:0.2,mass:.85,fric:1,sq:1.6,
  col:[255,206,36],sec:[255,250,176],acc:[255,140,90],ol:[150,82,0],limbs:[],
  face:{ex:.24,ey:.07,mouth:'u',blush:1,glow:1}},
 {id:'slime',name:'SLIME',rar:2,tix:40,wt:8,R:12,N:18,sx:1.12,sy:.9,shape:a=>Math.sin(a)>=0?1:1-.42*(-Math.sin(a)),ks:0.012,ka:0.5,mass:1.05,fric:.6,sq:.5,
  col:[64,226,168],sec:[190,255,226],acc:[30,150,120],ol:[10,86,70],
  limbs:[{at:90,dir:96,n:2,len:2.4,k:.08,taper:.3,curl:.35,r:1.7,kind:'tuft',back:0}],
  face:{ex:.3,ey:.08,mouth:'D',blush:1,jelly:1}},
 {id:'uni',name:'UNICORN',rar:3,tix:60,wt:4,R:12.5,N:16,sx:1,sy:.96,shape:roundBody,ks:0.04,ka:0.25,mass:1.15,fric:1,sq:1.8,
  col:[240,236,255],sec:[255,214,240],acc:[255,196,60],ol:[96,70,140],
  limbs:[{at:112,dir:100,n:1,len:7,k:.22,r:2,m:.22,kind:'horn',back:0},{at:136,dir:132,n:1,len:4.6,k:.3,r:2.4,kind:'tri',back:1},
         {at:44,dir:48,n:1,len:4.6,k:.3,r:2.4,kind:'tri',back:1},{at:340,dir:0,n:4,len:3,k:.08,taper:.4,curl:-.3,r:2.3,kind:'mane',back:1}],
  face:{ex:.34,ey:.1,mouth:'u',blush:1,lash:1,mane:1}},
 {id:'gold',name:'GOLDEN BEAR',rar:4,tix:300,wt:0,R:13,N:16,sx:1,sy:.95,shape:roundBody,ks:0.05,ka:0.25,mass:1.55,fric:.9,sq:.6,
  col:[255,192,32],sec:[255,240,150],acc:[255,120,40],ol:[120,60,0],
  limbs:[{at:128,dir:126,n:1,len:4.6,k:.22,r:3.7,kind:'ear',back:1},{at:52,dir:54,n:1,len:4.6,k:.22,r:3.7,kind:'ear',back:1},
         {at:243,dir:258,n:1,len:3.2,k:.25,r:3,kind:'foot',back:1},{at:297,dir:282,n:1,len:3.2,k:.25,r:3,kind:'foot',back:1}],
  face:{ex:.36,ey:.14,mouth:'u',muzzle:1,nose:1,blush:0,crown:1,gold:1}}
];
const CASTI={};CAST.forEach((t,i)=>{t.i=i;CASTI[t.id]=t;});

/* ---------- 9.3 soft-body engine: one particle pool, bodies own contiguous ranges ---------- */
const MAXP=1600,MAXB=48;
const X=new Float32Array(MAXP),Y=new Float32Array(MAXP),OX=new Float32Array(MAXP),OY=new Float32Array(MAXP);
const IW=new Float32Array(MAXP),RD=new Float32Array(MAXP),PB=new Int16Array(MAXP).fill(-1);
const BZ=new Float32Array(MAXB),BOZ=new Float32Array(MAXB),BTH=new Float32Array(MAXB),BWZ=new Float32Array(MAXB),BACT=new Uint8Array(MAXB);
const SLOT=new Array(MAXB).fill(null),BOD=[];
let NP=0,BID=0;
const GXS=new Float32Array(64),GYS=new Float32Array(64);
/* rest shape of a design (cached): ring offsets about the rest centroid, particle radius, limb anchors + rest chains.
   Collision particles sit inside the visible skin by their own radius (the outline is drawn offset outward) and
   overlap their neighbours by ~40%, so nothing can slip between two of them. */
function restShape(T){
  if(T._rest)return T._rest;
  const n=T.N,ux=new Float32Array(n),uy=new Float32Array(n);let P1=0,mx=0,my=0;
  for(let k=0;k<n;k++){const a=Math.PI/2+k*TAU/n,f=T.shape(a);ux[k]=T.sx*f*Math.cos(a);uy[k]=T.sy*f*Math.sin(a);mx+=ux[k];my+=uy[k];}
  mx/=n;my/=n;for(let k=0;k<n;k++){const j=(k+1)%n;P1+=Math.hypot(ux[j]-ux[k],uy[j]-uy[k]);}
  const rho=T.R/(1+.7*P1/n),rp=.7*rho*P1/n,qx=new Float32Array(n),qy=new Float32Array(n),e0=new Float32Array(n);
  let A=0,a00=0,a01=0,a11=0;
  for(let k=0;k<n;k++){qx[k]=(ux[k]-mx)*rho;qy[k]=(uy[k]-my)*rho;a00+=qx[k]*qx[k];a01+=qx[k]*qy[k];a11+=qy[k]*qy[k];}
  for(let k=0;k<n;k++){const j=(k+1)%n;e0[k]=Math.hypot(qx[j]-qx[k],qy[j]-qy[k]);A+=qx[k]*qy[j]-qx[j]*qy[k];}
  const det=a00*a11-a01*a01;
  const limbs=T.limbs.map(d=>{const at=d.at*D2R;let best=0,bd=9;
    for(let k=0;k<n;k++){const ak=Math.PI/2+k*TAU/n,dd=Math.abs(Math.atan2(Math.sin(ak-at),Math.cos(ak-at)));if(dd<bd){bd=dd;best=k;}}
    const pts=[];let x0=qx[best],y0=qy[best];for(let j=0;j<d.n;j++){const a=d.dir*D2R+(d.curl||0)*j;x0+=Math.cos(a)*d.len;y0+=Math.sin(a)*d.len;pts.push(x0,y0);}
    return {a:best,pts,d};});
  return T._rest={n,qx,qy,e0,rp,A0:A*.5,i00:a11/det,i01:-a01/det,i11:a00/det,limbs};
}
function spawn(T,x,y,z,rot,vx=0,vy=0){
  let slot=-1;for(let s=0;s<MAXB;s++)if(!SLOT[s]){slot=s;break;}if(slot<0)return null;
  const RS=restShape(T),n=T.N;let nl=0;for(const l of T.limbs)nl+=l.n;const np=n+nl;
  if(NP+np>MAXP)compact();if(NP+np>MAXP)return null;
  const b={T,slot,i0:NP,n,np,state:'pit',qx:RS.qx,qy:RS.qy,e0:RS.e0,A0:RS.A0,rp:RS.rp,limbs:[],
    cx:x,cy:y,ang:rot,comp:1,tch:0,mood:0,moodT:0,blink:rnd(1,4),yaw:rnd(-.6,.6),pc:0,pcL:0,pcR:0,held:0,liftY:0,imp:0,sqT:0,impT:0,zmode:0,
    minX:0,maxX:0,minY:0,maxY:0,id:++BID,age:0,sleepy:Math.random()<.25,show:null};
  NP+=np;SLOT[slot]=b;BOD.push(b);
  const c=Math.cos(rot),s=Math.sin(rot),im=1/T.mass;
  for(let k=0;k<n;k++){const i=b.i0+k;X[i]=x+c*b.qx[k]-s*b.qy[k];Y[i]=y+s*b.qx[k]+c*b.qy[k];OX[i]=X[i]-vx*HS;OY[i]=Y[i]-vy*HS;IW[i]=im;RD[i]=b.rp;PB[i]=slot;}
  let li=b.i0+n;
  for(const rl of RS.limbs){const d=rl.d;
    b.limbs.push({a:rl.a,s:li,n:d.n,len:d.len,k:d.k,dir:d.dir*D2R,curl:d.curl||0,taper:d.taper||0,r:d.r,kind:d.kind,back:!!d.back});
    for(let j=0;j<d.n;j++){const lx=rl.pts[2*j],ly=rl.pts[2*j+1];X[li]=x+c*lx-s*ly;Y[li]=y+s*lx+c*ly;OX[li]=X[li]-vx*HS;OY[li]=Y[li]-vy*HS;IW[li]=im/(d.m||.6);RD[li]=d.r*.85;PB[li]=slot;li++;}
  }
  BZ[slot]=BOZ[slot]=z;BTH[slot]=T.R*1.4;BWZ[slot]=1/(np*T.mass);BACT[slot]=1;
  return b;
}
function kill(b){
  for(let i=b.i0;i<b.i0+b.np;i++){PB[i]=-1;IW[i]=0;}
  SLOT[b.slot]=null;BACT[b.slot]=0;const k=BOD.indexOf(b);if(k>=0)BOD.splice(k,1);b.state='gone';
}
function compact(){
  BOD.sort((a,b)=>a.i0-b.i0);let w=0;
  for(const b of BOD){const i0=b.i0;if(i0!==w){for(let k=0;k<b.np;k++){const s=i0+k,d=w+k;X[d]=X[s];Y[d]=Y[s];OX[d]=OX[s];OY[d]=OY[s];IW[d]=IW[s];RD[d]=RD[s];PB[d]=PB[s];}
    for(const L of b.limbs)L.s+=w-i0;b.i0=w;}w+=b.np;}
  for(let i=w;i<NP;i++){PB[i]=-1;IW[i]=0;}NP=w;
}
/* internal constraints of one body: edges, pressure, shape matching, limbs (one Gauss-Seidel pass per substep) */
function solveBody(b){
  const i0=b.i0,n=b.n,T=b.T;
  for(let k=0;k<n;k++){const i=i0+k,j=k+1===n?i0:i+1,dx=X[j]-X[i],dy=Y[j]-Y[i],d=Math.sqrt(dx*dx+dy*dy)||1e-6,w=IW[i]+IW[j];if(!w)continue;
    const c=(d-b.e0[k])/(d*w);X[i]+=dx*c*IW[i];Y[i]+=dy*c*IW[i];X[j]-=dx*c*IW[j];Y[j]-=dy*c*IW[j];}
  /* pressure as a PBD area constraint: dA/dp_k is half the perpendicular of the chord p_{k-1} -> p_{k+1} */
  let A=0,den=0;
  for(let k=0;k<n;k++){const i=i0+k,j=k+1===n?i0:i+1,h=k===0?i0+n-1:i-1;A+=X[i]*Y[j]-X[j]*Y[i];
    const gx=.5*(Y[j]-Y[h]),gy=.5*(X[h]-X[j]);GXS[k]=gx;GYS[k]=gy;den+=IW[i]*(gx*gx+gy*gy);}
  A*=.5;b.comp=A/b.A0;
  if(den>1e-9){const lam=(b.A0-A)/den*T.ka;for(let k=0;k<n;k++){const i=i0+k;X[i]+=lam*IW[i]*GXS[k];Y[i]+=lam*IW[i]*GYS[k];}}
  /* 2-D shape matching: best-fit rotation of the rest shape about the current centroid (closed form),
     then pull every point toward its goal. Low ks = squishy plush, high ks = firm (star keeps its points). */
  let cx=0,cy=0;for(let k=0;k<n;k++){cx+=X[i0+k];cy+=Y[i0+k];}cx/=n;cy/=n;
  let sa=0,sb=0;for(let k=0;k<n;k++){const dx=X[i0+k]-cx,dy=Y[i0+k]-cy;sa+=b.qx[k]*dx+b.qy[k]*dy;sb+=b.qx[k]*dy-b.qy[k]*dx;}
  const ang=Math.atan2(sb,sa),c=Math.cos(ang),s=Math.sin(ang),al=T.ks;
  for(let k=0;k<n;k++){const i=i0+k;if(!IW[i])continue;X[i]+=(cx+c*b.qx[k]-s*b.qy[k]-X[i])*al;Y[i]+=(cy+s*b.qx[k]+c*b.qy[k]-Y[i])*al;}
  b.cx=cx;b.cy=cy;b.ang=ang;
  /* limbs: each joint is pulled toward its rest direction (body frame) and kept at its segment length */
  for(const L of b.limbs){let p=i0+L.a;
    for(let j=0;j<L.n;j++){const q=L.s+j,a=ang+L.dir+L.curl*j,kk=L.k*(1-L.taper*j/L.n);
      /* direction spring, applied to child and parent in opposite directions (momentum-conserving, no free energy) */
      const ex=(X[p]+Math.cos(a)*L.len-X[q])*kk,ey=(Y[p]+Math.sin(a)*L.len-Y[q])*kk,ws=IW[p]+IW[q],fq=IW[q]/ws,fp=IW[p]/ws;
      X[q]+=ex*fq;Y[q]+=ey*fq;X[p]-=ex*fp;Y[p]-=ey*fp;
      const dx=X[q]-X[p],dy=Y[q]-Y[p],d=Math.sqrt(dx*dx+dy*dy)||1e-6,w=IW[p]+IW[q],cc=(d-L.len)/(d*w);
      X[p]+=dx*cc*IW[p];Y[p]+=dy*cc*IW[p];X[q]-=dx*cc*IW[q];Y[q]-=dy*cc*IW[q];p=q;}
  }
}
/* ---- broad phase: counting-sort spatial hash over the X-Y plane ---- */
const CELL=7,GX0=-14,GY0=-84,GNX=38,GNY=34,GN=GNX*GNY;
const CST=new Int32Array(GN+1),CUR=new Int32Array(GN),CIT=new Int32Array(MAXP),PCL=new Int32Array(MAXP);
function buildHash(){
  CST.fill(0);
  for(let i=0;i<NP;i++){const s=PB[i];if(s<0||BACT[s]!==1){PCL[i]=-1;continue;}
    let cx=((X[i]-GX0)/CELL)|0,cy=((Y[i]-GY0)/CELL)|0;cx=cx<0?0:cx>=GNX?GNX-1:cx;cy=cy<0?0:cy>=GNY?GNY-1:cy;const c=cy*GNX+cx;PCL[i]=c;CST[c+1]++;}
  for(let c=0;c<GN;c++)CST[c+1]+=CST[c];CUR.set(CST.subarray(0,GN));
  for(let i=0;i<NP;i++)if(PCL[i]>=0)CIT[CUR[PCL[i]]++]=i;
}
/* narrow phase: particle discs of different bodies whose depth slabs overlap. A grazing overlap in depth is
   resolved by sliding the bodies apart in Z (like a 3-D minimum-translation axis); otherwise in X-Y with friction. */
/* pair test for particles i<j in neighbouring cells */
function pairC(i,j){
  const si=PB[i],sj=PB[j];if(si===sj)return;
  const dx=X[j]-X[i],dy=Y[j]-Y[i],rr=RD[i]+RD[j],d2=dx*dx+dy*dy;if(d2>=rr*rr)return;
  const dzb=BZ[sj]-BZ[si],ovz=(BTH[si]+BTH[sj])*.5-(dzb<0?-dzb:dzb);if(ovz<=0)return;
  const d=Math.sqrt(d2)||1e-4,pen=rr-d;
  if(ovz<pen*1.25){const pz=(dzb<0?-1:1)*ovz*.06,wz=BWZ[si]+BWZ[sj];BZ[si]-=pz*BWZ[si]/wz;BZ[sj]+=pz*BWZ[sj]/wz;return;}
  const nx=dx/d,ny=dy/d,wi=IW[i],wj=IW[j],w=wi+wj;if(!w)return;
  const cc=pen/w;X[i]-=nx*cc*wi;Y[i]-=ny*cc*wi;X[j]+=nx*cc*wj;Y[j]+=ny*cc*wj;SLOT[si].tch=1;SLOT[sj].tch=1;
  const rvx=(X[j]-OX[j])-(X[i]-OX[i]),rvy=(Y[j]-OY[j])-(Y[i]-OY[i]),vn=rvx*nx+rvy*ny,tx=rvx-vn*nx,ty=rvy-vn*ny,tl=Math.sqrt(tx*tx+ty*ty);
  if(tl>1e-7){const f=(tl<MU_S*pen?1:MU_K*pen/tl)/w;X[i]+=tx*f*wi;Y[i]+=ty*f*wi;X[j]-=tx*f*wj;Y[j]-=ty*f*wj;}
  if(vn<-.35){const v=-vn/HS,bi=SLOT[si],bj=SLOT[sj];if(bi.imp<v)bi.imp=v;if(bj.imp<v)bj.imp=v;}
}
/* every cell against itself and its four "forward" neighbours, so each pair is visited exactly once */
function collideAll(){
  for(let gy=0;gy<GNY;gy++)for(let gx=0;gx<GNX;gx++){const c=gy*GNX+gx,a0=CST[c],a1=CST[c+1];if(a0===a1)continue;
    for(let m=a0;m<a1;m++){const i=CIT[m];
      for(let q=m+1;q<a1;q++)pairC(i,CIT[q]);
      if(gx<GNX-1)for(let q=CST[c+1],qe=CST[c+2];q<qe;q++)pairC(i,CIT[q]);
      if(gy<GNY-1){const r=c+GNX;
        if(gx>0)for(let q=CST[r-1],qe=CST[r];q<qe;q++)pairC(i,CIT[q]);
        for(let q=CST[r],qe=CST[r+1];q<qe;q++)pairC(i,CIT[q]);
        if(gx<GNX-1)for(let q=CST[r+1],qe=CST[r+2];q<qe;q++)pairC(i,CIT[q]);}
    }}
}
function wallFric(i,pen){const dy=Y[i]-OY[i];if(Math.abs(dy)<.5*pen)Y[i]=OY[i];else Y[i]-=(dy>0?1:-1)*.3*pen;}
function floorFric(i,pen,ms,mk){const dx=X[i]-OX[i];if(Math.abs(dx)<ms*pen)X[i]=OX[i];else X[i]-=(dx>0?1:-1)*mk*pen;}
/* walls, floor and the chute box. Depth mode: 0 = behind the chute, 1 = straddling its back wall (rests on the
   rim), 2 = over the hole (falls in). Mode changes that would teleport particles through a wall are blocked in Z. */
function bounds(b){
  const s=b.slot,th=BTH[s]*.5,e=b.i0+b.np;
  let inBox=false,inShaft=false;
  for(let i=b.i0;i<e;i++){const r=RD[i];if(X[i]<CW+CWT+r&&Y[i]<CH+r)inBox=true;if(X[i]<CW&&Y[i]<CH-r)inShaft=true;}
  let mode=BZ[s]-th>=CD?0:BZ[s]+th>CD+2?1:2;
  if(mode!==0&&b.zmode===0&&inBox){BZ[s]=BOZ[s]=CD+th;mode=0;}
  if(mode!==2&&b.zmode===2&&inShaft){BZ[s]=BOZ[s]=CD+2-th;mode=2;}
  b.zmode=mode;
  for(let i=b.i0;i<e;i++){const r=RD[i];
    if(X[i]<r){const p=r-X[i];X[i]=r;wallFric(i,p);}else if(X[i]>PW-r){const p=X[i]-PW+r;X[i]=PW-r;wallFric(i,p);}
    if(mode===1){
      if(X[i]<CW+CWT+r&&Y[i]<CH+r){const pu=CH+r-Y[i],pr=CW+CWT+r-X[i];if(pu<pr){Y[i]=CH+r;floorFric(i,pu,FL_S,FL_K);b.tch=1;}else X[i]=CW+CWT+r;continue;}
    }else if(mode===2){
      if(Y[i]<CH){if(OX[i]<CW){if(X[i]>CW-CWT-r)X[i]=CW-CWT-r;}else if(X[i]<CW+CWT+r)X[i]=CW+CWT+r;}
      else{const dx=X[i]-CW,dy=Y[i]-CH,d2=dx*dx+dy*dy,rr=CWT+r;if(d2<rr*rr){const d=Math.sqrt(d2)||1e-4;X[i]=CW+dx/d*rr;Y[i]=CH+dy/d*rr;}}
      if(X[i]<CW)continue;
    }
    if(Y[i]<r){const pen=r-Y[i];Y[i]=r;floorFric(i,pen,FL_S,FL_K);b.tch=1;const v=(OY[i]-Y[i]+pen)/HS;if(v>b.imp)b.imp=v;}
  }
  /* clamps in depth also reset the verlet history, or the clamp itself would become a velocity */
  if(mode===2&&b.cx<CW&&b.cy<CH&&BZ[s]>CD-1-th)BZ[s]=BOZ[s]=CD-1-th;
  if(BZ[s]<th)BZ[s]=BOZ[s]=th;else if(BZ[s]>PD-th)BZ[s]=BOZ[s]=PD-th;
}
/* rigid-mode damping (Mueller et al.): pull each particle's velocity toward the body's rigid motion
   (centre-of-mass velocity + angular velocity about it). Kills constraint fighting without killing tumbling. */
function dampBody(b){
  const i0=b.i0,n=b.n;let cx=0,cy=0,vx=0,vy=0;
  for(let i=i0;i<i0+n;i++){cx+=X[i];cy+=Y[i];vx+=X[i]-OX[i];vy+=Y[i]-OY[i];}cx/=n;cy/=n;vx/=n;vy/=n;
  let Lm=0,I=0;for(let i=i0;i<i0+n;i++){const rx=X[i]-cx,ry=Y[i]-cy;Lm+=rx*(Y[i]-OY[i]-vy)-ry*(X[i]-OX[i]-vx);I+=rx*rx+ry*ry;}
  const w=Lm/(I||1),kd=b.T.kd||.012,kl=.004,kr=b.tch?.035:0;
  /* plus rolling resistance while resting on something: fabric squashes into a contact patch instead of rolling */
  for(let i=i0,e=i0+b.np;i<e;i++){const rx=X[i]-cx,ry=Y[i]-cy,tx=vx-w*ry,ty=vy+w*rx,k=i<i0+n?kd:kl;
    OX[i]-=(tx-(X[i]-OX[i]))*k+kr*w*ry;OY[i]-=(ty-(Y[i]-OY[i]))*k-kr*w*rx;}
  b.tch=0;
}

/* ---------- 9.4 the claw rig: gantry carriage -> winch cable -> head (3-D pendulum) -> two hooked prongs ----------
   Prong geometry in the head's local frame (y up): pivot at (+-PIV,-2), an upper arm of L1 at angle A0P+phi from
   straight down, then a hook of L2 bent inward by HOOK. phi = opening angle (0 = closed). Each prong angle is a
   heavy verlet DOF (geared motor) driven by a position servo whose stall squeeze is proportional to the credit's
   strength S (see clawIntegrate). Every contact pushes back through its lever arm, so a heavy plush pries a weak
   claw open, the squeeze sets the normal force, and the normal force sets how much Coulomb friction can hold.
   PBD force units: a correction of d per substep on mass m is a force m*d/h^2, which is why the prongs are heavy:
   a big stall force must not mean a big per-substep displacement (that snaps when the plush slips). */
const GYA=PH-2,LMIN=13,LMAX=GYA-27,MHI=1/40,IPI=1/4000,PIV=4.5,L1=21,L2=9,A0P=.18,HOOK=1.55,RC=1.7,PHMIN=.08,PHMAX=.95;
const VCL=.006,VOP=.01,DM=.006,KM=.35,MAXPEN=.6;   /* geared prongs: heavy (IPI), stall squeeze = KM*S*DM per substep ~ 1.8x plush weight at S=1 */
const CL={gx:HOME_X,gz:HOME_Z,gvx:0,gvz:0,hx:HOME_X,hy:GYA-LMIN,hz:HOME_Z,ox:HOME_X,oy:GYA-LMIN,oz:HOME_Z,L:LMIN,winch:0,
  ph:[.5,.5],oph:[.5,.5],pt:[.5,.5],motor:-1,S:1,tilt:0,slack:0,touch:0,cap:0,dem:0,grip:0,load:0,hold:0,cnt:0,muf:1};
const PG=new Float32Array(16);   // local prong geometry per side: pivot, elbow, tip (x,y) -> 6 floats per side
function prongLocal(){for(let s=0;s<2;s++){const sg=s?1:-1,a1=A0P+CL.ph[s],a2=a1-HOOK,o=s*8;
  PG[o]=sg*PIV;PG[o+1]=-2;PG[o+2]=PG[o]+L1*sg*Math.sin(a1);PG[o+3]=PG[o+1]-L1*Math.cos(a1);PG[o+4]=PG[o+2]+L2*sg*Math.sin(a2);PG[o+5]=PG[o+3]-L2*Math.cos(a2);}}
function clawLocalToWorld(u,v,out){const c=Math.cos(CL.tilt),s=Math.sin(CL.tilt);out[0]=CL.hx+u*c-v*s;out[1]=CL.hy+u*s+v*c;return out;}
function clawIntegrate(){
  const vx=(CL.hx-CL.ox)*.9975,vy=(CL.hy-CL.oy)*.9975,vz=(CL.hz-CL.oz)*.996;
  CL.ox=CL.hx;CL.oy=CL.hy;CL.oz=CL.hz;CL.hx+=vx;CL.hy+=vy-GRAV*H2;CL.hz+=vz;
  CL.L=clamp(CL.L+CL.winch*HS,LMIN,LMAX);
  /* the cable is a rope: it only pulls (inextensible when taut, slack when the claw rests on the pile) */
  const dx=CL.hx-CL.gx,dy=CL.hy-GYA,dz=CL.hz-CL.gz,d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-6;CL.slack=CL.L-d;
  if(d>CL.L){const k=CL.L/d;CL.hx=CL.gx+dx*k;CL.hy=GYA+dy*k;CL.hz=CL.gz+dz*k;}
  CL.tilt+=(Math.atan2(dx,-dy)*(CL.slack>1?.4:1)-CL.tilt)*.25;
  /* prong motor = position servo: its set-point sweeps at the rated speed (VCL per substep) but may lead the real
     prong by at most S*DM; a stiff spring (KM) pulls the prong toward it. Free, the prong closes at rated speed;
     stalled on a plush, it squeezes with exactly KM*S*DM per substep: the credit's strength, nothing hidden. */
  for(let s=0;s<2;s++){const v=(CL.ph[s]-CL.oph[s])*.85;CL.oph[s]=CL.ph[s];CL.ph[s]+=v;
    if(CL.motor>0)CL.pt[s]=Math.max(PHMIN,CL.pt[s]-VCL,CL.ph[s]-CL.S*DM);
    else if(CL.motor<0)CL.pt[s]=Math.min(PHMAX,CL.pt[s]+VOP,CL.ph[s]+DM);
    CL.ph[s]+=(CL.pt[s]-CL.ph[s])*KM;
    if(CL.ph[s]<PHMIN){CL.ph[s]=PHMIN;CL.oph[s]=PHMIN;}else if(CL.ph[s]>PHMAX){CL.ph[s]=PHMAX;CL.oph[s]=PHMAX;}}
  CL.hz=clamp(CL.hz,5,PD-5);
}
/* closest point on segment (ax,ay)-(bx,by) to (px,py) -> parameter t */
function segT(ax,ay,bx,by,px0,py0){const ex=bx-ax,ey=by-ay,l=ex*ex+ey*ey;if(l<1e-9)return 0;const t=((px0-ax)*ex+(py0-ay)*ey)/l;return t<0?0:t>1?1:t;}
const LU=new Float32Array(64),LV=new Float32Array(64);
let CC=0,CSN=0,CDHX=0,CDHY=0;           /* claw frame for this substep: cos/sin of tilt, head displacement */
let CCAP=0,CDEM=0,CCNT=0;
/* apply one prong contact to a plush point P = (1-w)*p_i + w*p_j (j<0: single particle).
   (cu,cv) contact on prong sd in claw-local coords, (nu,nv) local normal from prong into the plush, pen = depth.
   Two-way: the plush point, the claw head (linear) and the prong angle (through its lever) share the correction
   by generalized inverse mass; then Coulomb friction against the moving prong surface. */
function prongHit(b,i,j,w,sd,cu,cv,nu,nv,pen,muS){
  if(pen>MAXPEN)pen=MAXPEN;   /* cap depenetration per substep: no explosive kicks */
  const o=sd*8,sg=sd?1:-1,wi=IW[i]*(1-w),wj=j<0?0:IW[j]*w,wP=wi*(1-w)+wj*w;if(wP<=0)return;
  const ru=cu-PG[o],rv=cv-PG[o+1],ra=ru*nv-rv*nu,wf=ra*ra*IPI,l=pen/(wP+MHI+wf);
  const nx=nu*CC-nv*CSN,ny=nu*CSN+nv*CC;
  X[i]+=nx*l*wi;Y[i]+=ny*l*wi;if(j>=0){X[j]+=nx*l*wj;Y[j]+=ny*l*wj;}
  CL.hx-=nx*l*MHI;CL.hy-=ny*l*MHI;CL.ph[sd]-=sg*ra*l*IPI;
  const om=sg*(CL.ph[sd]-CL.oph[sd]),vu=-rv*om,vv=ru*om,cvx=CDHX+vu*CC-vv*CSN,cvy=CDHY+vu*CSN+vv*CC;
  let dpx=(X[i]-OX[i])*(1-w),dpy=(Y[i]-OY[i])*(1-w);if(j>=0){dpx+=(X[j]-OX[j])*w;dpy+=(Y[j]-OY[j])*w;}
  const rx=dpx-cvx,ry=dpy-cvy,vn=rx*nx+ry*ny,tx=rx-vn*nx,ty=ry-vn*ny,tl=Math.sqrt(tx*tx+ty*ty);
  if(tl>1e-7){const lt=(tl<muS*pen?1:muS*.7*pen/tl)/(wP+MHI);
    X[i]-=tx*lt*wi;Y[i]-=ty*lt*wi;if(j>=0){X[j]-=tx*lt*wj;Y[j]-=ty*lt*wj;}CL.hx+=tx*lt*MHI;CL.hy+=ty*lt*MHI;}
  CCAP+=muS*pen;CDEM+=tl;CCNT++;b.pc++;if(sd)b.pcR++;else b.pcL++;
  if(CL.ph[sd]>PHMAX+.05)CL.ph[sd]=PHMAX+.05;else if(CL.ph[sd]<PHMIN-.05)CL.ph[sd]=PHMIN-.05;
}
function clawContacts(){
  prongLocal();
  const c=Math.cos(CL.tilt),sn=Math.sin(CL.tilt),hx=CL.hx,hy=CL.hy,hz=CL.hz;CC=c;CSN=sn;CDHX=CL.hx-CL.ox;CDHY=CL.hy-CL.oy;
  /* the prong tips cannot go through the floor (outside the chute hole) */
  for(let s=0;s<2;s++){const o=s*8,ty=hy+PG[o+4]*sn+PG[o+5]*c,tx=hx+PG[o+4]*c-PG[o+5]*sn;if(ty<RC&&!(tx<CW&&hz<CD)){CL.hy+=RC-ty;}}
  if(CL.hy<6)CL.hy=6;
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let k=0;k<12;k+=2){const o=k<6?k:k+2,u=PG[o],v=PG[o+1],wx=hx+u*c-v*sn,wy=hy+u*sn+v*c;if(wx<x0)x0=wx;if(wx>x1)x1=wx;if(wy<y0)y0=wy;if(wy>y1)y1=wy;}
  x0-=8;x1+=8;y0-=6;y1=Math.max(y1,hy+5)+6;
  CL.touch=0;
  for(const b of BOD){if(b.state!=='pit')continue;const s=b.slot,dz=BZ[s]-hz,reach=BTH[s]*.5+3;b.pc=0;b.pcL=0;b.pcR=0;
    if(Math.abs(dz)>=reach||b.maxX<x0||b.minX>x1||b.maxY<y0||b.minY>y1)continue;
    const zw=1-Math.abs(dz)/reach,muS=.95*b.T.fric*(.35+.65*zw)*CL.muf,i0=b.i0,n=b.n;
    for(let i=i0,e=i0+b.np;i<e;i++){
      const r=RD[i],qx=X[i]-hx,qy=Y[i]-hy,lu=qx*c+qy*sn,lv=-qx*sn+qy*c;
      if(i<i0+n){LU[i-i0]=lu;LV[i-i0]=lv;}
      /* housing: a fat capsule, linear response only */
      {const t=segT(-4.5,2.5,4.5,2.5,lu,lv),cu=-4.5+9*t,du=lu-cu,dv=lv-2.5,d2=du*du+dv*dv,rr=3.4+r;
        if(d2<rr*rr){const d=Math.sqrt(d2)||1e-4,pen=Math.min(MAXPEN,rr-d),nu=du/d,nv=dv/d,nx=nu*c-nv*sn,ny=nu*sn+nv*c,wp=IW[i],l=pen/(wp+MHI);
          X[i]+=nx*l*wp;Y[i]+=ny*l*wp;CL.hx-=nx*l*MHI;CL.hy-=ny*l*MHI;CL.touch++;b.pc++;}}
      if(i<i0+n)continue;
      /* limb particles (ears, tails, tentacles) against the prong capsules: these are what hooks catch */
      for(let sd=0;sd<2;sd++){const o=sd*8;
        for(let sg2=0;sg2<2;sg2++){const a=o+sg2*2,au=PG[a],av=PG[a+1],bu=PG[a+2],bv=PG[a+3];
          const t=segT(au,av,bu,bv,lu,lv),cu=au+(bu-au)*t,cv=av+(bv-av)*t,du=lu-cu,dv=lv-cv,d2=du*du+dv*dv,rr=RC+r;
          if(d2>=rr*rr)continue;const d=Math.sqrt(d2)||1e-4;prongHit(b,i,-1,0,sd,cu,cv,du/d,dv/d,rr-d,muS);CL.touch++;}}
    }
    /* ring skin against the prongs: one-sided capsule-vs-edge, so a thin prong can never slip between two
       ring particles. For each edge (outward normal), clip the prong segment to the edge's strip and take its
       deepest point; a contact pushes the edge's two particles (barycentric) and the prong apart. */
    const rp=b.rp,rr=RC+rp,m=rp*.6;
    for(let k=0;k<n;k++){const k2=k+1===n?0:k+1,au=LU[k],av=LV[k],eu=LU[k2]-au,ev=LV[k2]-av,L=Math.sqrt(eu*eu+ev*ev)||1e-6,ux=eu/L,uy=ev/L,no=uy,nw=-ux;
      for(let sd=0;sd<2;sd++){const o=sd*8;
        for(let sg2=0;sg2<2;sg2++){const a=o+sg2*2,pu=PG[a],pv=PG[a+1],qu=PG[a+2],qv=PG[a+3];
          const s0=(pu-au)*ux+(pv-av)*uy,s1=(qu-au)*ux+(qv-av)*uy,d0=(pu-au)*no+(pv-av)*nw,d1=(qu-au)*no+(qv-av)*nw;
          if(d0>=rr&&d1>=rr)continue;
          let ta=0,tb=1;
          if(Math.abs(s1-s0)<1e-6){if(s0<-m||s0>L+m)continue;}
          else{let t1=(-m-s0)/(s1-s0),t2=(L+m-s0)/(s1-s0);if(t1>t2){const q=t1;t1=t2;t2=q;}ta=t1>0?t1:0;tb=t2<1?t2:1;if(ta>tb)continue;}
          const da=d0+(d1-d0)*ta,db=d0+(d1-d0)*tb,tt=da<db?ta:tb,sdist=da<db?da:db;
          /* only shallow penetrations are real: a prong "behind" a far edge of the same ring is outside, not inside */
          if(sdist>=rr||sdist<-1.2)continue;
          const ss=s0+(s1-s0)*tt,w=ss<0?0:ss>L?1:ss/L,cu=pu+(qu-pu)*tt,cv=pv+(qv-pv)*tt;
          prongHit(b,i0+k,i0+k2,w,sd,cu,cv,-no,-nw,rr-sdist,muS);CL.touch++;
          /* the third (front/back) prong centres a well-aligned plush in depth and squeezes an off-centre one out */
          if(CL.motor>0){if(Math.abs(dz)<reach*.5){BZ[s]-=dz*.004;CL.hz+=dz*.0006;}else BZ[s]+=(dz<0?-1:1)*.02;}
        }}
    }
  }
}
/* per-body bounding boxes (once per tick; padded so the claw broad phase can trust them for 4 substeps) */
function bodyBoxes(){for(const b of BOD){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=b.i0,e=b.i0+b.np;i<e;i++){if(X[i]<x0)x0=X[i];if(X[i]>x1)x1=X[i];if(Y[i]<y0)y0=Y[i];if(Y[i]>y1)y1=Y[i];}
  b.minX=x0-5;b.maxX=x1+5;b.minY=y0-5;b.maxY=y1+5;}}
/* the showcase: a won plush bounces toward the player in its own little space (floor y = 0, bouncy) */
function showBounds(b){for(let i=b.i0,e=b.i0+b.np;i<e;i++){const r=RD[i];if(Y[i]<r){const vy=Y[i]-OY[i];Y[i]=r;if(vy<0)OY[i]=r+vy*.62;const dx=X[i]-OX[i];OX[i]=X[i]-dx*.9;}}}
/* one 60 Hz physics tick = SUBS substeps */
function physTick(){
  bodyBoxes();CCAP=0;CDEM=0;CCNT=0;
  for(const b of BOD){b.imp=0;}
  for(let st=0;st<SUBS;st++){
    for(let i=0;i<NP;i++){if(PB[i]<0)continue;const vx=(X[i]-OX[i])*DAMP,vy=(Y[i]-OY[i])*DAMP;OX[i]=X[i];OY[i]=Y[i];X[i]+=vx;Y[i]+=vy-GRAV*H2;}
    for(const b of BOD){const s=b.slot,vz=(BZ[s]-BOZ[s])*.9;BOZ[s]=BZ[s];BZ[s]+=vz;}
    clawIntegrate();
    for(const b of BOD){dampBody(b);solveBody(b);}
    buildHash();collideAll();
    for(const b of BOD)if(b.state==='show')showBounds(b);else bounds(b);
    clawContacts();
  }
  /* grip telemetry: capacity of static friction vs the tangential slip it had to cancel */
  CL.cap=CCAP;CL.dem=CDEM;CL.cnt=CCNT;const ld=CCNT?CDEM/(CCAP+1e-6):0;CL.load+=(ld-CL.load)*.2;
}
//#PHYS-END
