/* ===================== painted fighters: bodies measured from Christopher's character sheets =====================
   tools/art_prep.py found each fighter's joints in the front T-pose picture and measured how wide every body part is
   (front picture) and how deep (turnaround side view and face-sheet side view). Here those measurements become the
   3D shapes, and the same pictures are painted onto them: every triangle looks up its colour in the front picture if it
   faces forward, in the back picture if it faces backward, and for the head in the face-sheet front or side view.
   The moves still come from the original skeleton; only the shape and the paint are new. ?classic=1 shows the old bodies. */
const ART_OFF=/[?&]classic=1/.test(location.search);
const ARTA=2048,ARTFITS={},ARTTEX={};
const ARTFX={nova:{emi:2.4},echo:{emi:.45},magnus:{gold:1}};
function artTex(id){
  if(ARTTEX[id])return ARTTEX[id];
  const t=new THREE.Texture();t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;
  const im=new Image();im.onload=()=>{
    /* phones get a half-size copy: a quarter of the memory, and still sharper than the screen */
    if(Q().id!=='high'){const c=document.createElement('canvas');c.width=c.height=ARTA/2;c.getContext('2d').drawImage(im,0,0,ARTA/2,ARTA/2);t.image=c;}
    else t.image=im;
    t.needsUpdate=true;};
  im.src=ARTDATA.img[id];
  return ARTTEX[id]=t;
}
function artFit(def){
  if(ART_OFF||!ARTDATA||!ARTDATA.meta[def.id])return null;
  if(ARTFITS[def.id])return ARTFITS[def.id];
  const m=ARTDATA.meta[def.id],b=def.body,h=b.h,F=m.front,B=m.back;
  const J=solve(P(def.st.S0),b,{}),d2=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
  /* metres per front-atlas pixel, from the leg length (hip to ankle) */
  const sF=(b.thigh+b.shin)*h/(((F.aR[1]-F.hR[1])+(F.aL[1]-F.hL[1]))/2);
  const kB=d2(B.N,B.H)/d2(F.N,F.H);
  const W=v=>v*m.fs*sF;                                   /* front-sheet pixels to metres */
  const A={m,F,B,sF,kB,W,J,
    lT:d2(J.N,J.waist),lP:d2(J.waist,J.H),
    sw:clamp((F.SL[0]-F.SR[0])/2*sF*.92,b.rChest*h*b.bulk*1.32*.8*.9,b.rChest*h*b.bulk*1.32*.8*1.25),
    hw:clamp((F.hL[0]-F.hR[0])/2*sF,b.rPelvis*h*b.bulk*1.32*.55*.9,b.rPelvis*h*b.bulk*1.32*.55*1.3)};
  /* the head: its height (top of hair to chin) keeps the T-pose's proportion */
  const hd=m.head,hH=hd.tposeH*m.fs*sF;
  A.kh=hH/(hd.front.chin-hd.front.top);A.chinL=-.72*b.headR*h*(def.look.headK||1);
  return ARTFITS[def.id]=A;
}
const ARTMP=[.38,0];
/* a closed shape from stacked rings: ys from top to bottom, rf(i,cx,cz) the radius toward a direction */
function gbHull(G,part,ys,rf,o={}){
  const M_=o.seg||24,n=ys.length,P_=[];
  for(let i=0;i<n;i++){const r=[];for(let j=0;j<=M_;j++){const th=j/M_*TAU,cx=Math.cos(th),cz=Math.sin(th),k=rf(i,cx,cz);r.push([cx*k+(o.xo?o.xo(i):0),ys[i],cz*k]);}P_.push(r);}
  const top=[(o.xo?o.xo(0):0),ys[0]+(ys[0]-ys[1])*.3,0],bot=[(o.xo?o.xo(n-1):0),ys[n-1]-(ys[n-2]-ys[n-1])*.3,0];
  const nrm=(i,j)=>{const a=P_[Math.max(0,i-1)][j],b_=P_[Math.min(n-1,i+1)][j],c=P_[i][(j+M_-1)%M_],d=P_[i][(j+1)%M_];
    return v3n(v3cross(v3sub(a,b_),v3sub(d,c)));};
  const N_=P_.map((r,i)=>r.map((_,j)=>nrm(i,j%M_)));
  const W1=[1,1,1],ol=o.ol??1;
  for(let i=0;i<n-1;i++)for(let j=0;j<M_;j++){const A_=P_[i][j],B_=P_[i][j+1],C_=P_[i+1][j+1],D_=P_[i+1][j];
    gbTri(G,part,[A_,B_,D_],[N_[i][j],N_[i][j+1],N_[i+1][j]],W1,0,ol,ARTMP);gbTri(G,part,[B_,C_,D_],[N_[i][j+1],N_[i+1][j+1],N_[i+1][j]],W1,0,ol,ARTMP);}
  for(let j=0;j<M_;j++){gbTri(G,part,[top,P_[0][j+1],P_[0][j]],[[0,1,0],N_[0][j+1],N_[0][j]],W1,0,ol,ARTMP);
    gbTri(G,part,[bot,P_[n-1][j],P_[n-1][j+1]],[[0,-1,0],N_[n-1][j],N_[n-1][j+1]],W1,0,ol,ARTMP);}
}
const sell=(cx,cz,D,W,p=2.3)=>Math.pow(Math.pow(Math.abs(cx/Math.max(1e-4,D)),p)+Math.pow(Math.abs(cz/Math.max(1e-4,W)),p),-1/p);
function interpA(a,t){const n=a.length-1,x=clamp(t,0,1)*n,i=Math.min(n-1,Math.floor(x)),f=x-i;return a[i]*(1-f)+a[i+1]*f;}

/* ---------- the body ---------- */
function artBody(def,G,A){
  const b=def.body,h=b.h,rs=h*b.bulk,m=A.m,F=A.F,W=A.W;
  const oy=m.fo[1],fs=m.fs,ya=y=>y*fs+oy;
  /* torso and pelvis rows (crotch -> neck base), filled in above the armpits where the arms hide the chest's edge */
  const rows=m.torso.map(r=>r.slice());let ap=rows.findIndex(r=>r[1]==null);if(ap<0)ap=rows.length;
  const hwAp=rows[Math.max(0,ap-1)][1],nkW=b.rNeck*rs*1.5/(fs*A.sF);
  for(let i=ap;i<rows.length;i++){const t=(i-ap+1)/(rows.length-ap);rows[i][1]=lerp(hwAp*1.03,nkW,EASE.smooth(clamp((t-.45)/.55,0,1)));}
  for(const r of rows){if(r[2]==null)r[2]=r[1]*.6;if(r[3]==null)r[3]=r[1]*.6;}
  /* depth narrows toward the neck too */
  for(let i=ap;i<rows.length;i++){const t=(i-ap+1)/(rows.length-ap),k=lerp(1,.55,EASE.smooth(clamp((t-.5)/.5,0,1)));rows[i][2]*=k;rows[i][3]*=k;}
  const stT=A.lT/(F.W[1]-F.N[1]),stP=A.lP/(F.H[1]-F.W[1]);
  const tor=[],pel=[];
  for(let i=rows.length-1;i>=0;i--){const y=ya(rows[i][0]);if(y<=F.W[1]+6)tor.push(rows[i]);}
  for(let i=rows.length-1;i>=0;i--){const y=ya(rows[i][0]);if(y>=F.W[1]-6)pel.push(rows[i]);}
  gbHull(G,P_TORSO,tor.map(r=>(F.W[1]-ya(r[0]))*stT),(i,cx,cz)=>sell(cx,cz,W(cx>=0?tor[i][2]:tor[i][3]),W(tor[i][1])),{seg:28});
  gbHull(G,P_PELVIS,pel.map(r=>(F.H[1]-ya(r[0]))*stP+.03),(i,cx,cz)=>sell(cx,cz,W(cx>=0?pel[i][2]:pel[i][3]),W(pel[i][1])),{seg:28});
  /* neck */
  const R=b.headR*h*(def.look.headK||1),nk=(b.neck+b.headR)*h,nl=Math.hypot(nk-.75*R,.08*R);
  gbCapsule(G,P_NECK,[0,0,0],[0,nl,0],b.rNeck*rs*1.12,b.rNeck*rs*.92,RGBM(255,255,255),{seg:16,len:3,lat:3,ol:0,mp:ARTMP});
  /* head: front width and side depth from the face sheet */
  const hf=m.head.front.rows.map(r=>r.slice()),hs=m.head.side.rows.map(r=>r.slice()),kh=A.kh,nr=hf.length;
  /* below the eyes the head narrows to the jaw: hanging hair and headband tails beside the face are left to the cloth */
  const iRef=Math.round(nr*.5),wRef=hf[iRef][1],bRef=hs[iRef][2],fRef=hs[iRef][1];
  for(let i=iRef;i<nr;i++){const u=(i-iRef)/(nr-1-iRef);hf[i][1]=Math.min(hf[i][1],wRef*(1-.3*u*u));hs[i][2]=Math.min(hs[i][2],bRef*(1-.25*u));hs[i][1]=Math.min(hs[i][1],fRef*1.05);}
  gbHull(G,P_HEAD,hf.map(r=>A.chinL+(m.head.front.chin-r[0])*kh),(i,cx,cz)=>sell(cx,cz,(cx>=0?hs[i][1]:hs[i][2])*kh,hf[i][1]*kh,2.1),{seg:32,ol:.7});
  /* arms: measured widths along each bone (the first stretch is hidden by the torso in the picture, so it is filled in) */
  const lim=m.limbs,fix=a=>{const v=a.slice(),k=v[2];v[0]=k*1.1;v[1]=k*1.05;return v;};
  const prof=(wa,da)=>(t,cx,cz)=>sell(cx,cz,W(interpA(da,t)),W(interpA(wa,t)),2.1);
  for(const [pu,pf,ph,s] of [[P_UAN,P_FAN,P_HAN,'L'],[P_UAF,P_FAF,P_HAF,'R']]){
    const ua=fix(lim['ua'+s]),fa=lim['fa'+s];
    gbCapsule(G,pu,[0,0,0],[0,b.uarm*h,0],1,1,RGBM(255,255,255),{seg:18,len:10,lat:4,prof:prof(ua,ua.map(v=>v*.95)),mp:ARTMP});
    gbSphere(G,pu,[0,W(ua[1])*.25,0],W(ua[1])*1.1,RGBM(255,255,255),{seg:16,lat:6,mp:ARTMP});
    gbCapsule(G,pf,[0,0,0],[0,b.farm*h,0],1,1,RGBM(255,255,255),{seg:18,len:10,lat:4,prof:prof(fa,fa.map(v=>v*.92)),mp:ARTMP});
    /* a fist: palm block, curled fingers with knuckles, thumb */
    const rh=Math.max(b.rHand*rs,W(fa[10])*.95);
    gbCapsule(G,ph,[0,rh*.05,0],[0,rh*.55,0],rh*.82,rh*.78,RGBM(255,255,255),{seg:16,lat:5,len:3,sz:.78,sx:1.02,mp:ARTMP});
    for(let k=0;k<4;k++){const z=(k-1.5)*rh*.36;gbSphere(G,ph,[rh*.42,rh*.78,z],rh*.24,RGBM(255,255,255),{seg:8,lat:3,ol:.5,mp:ARTMP});}
    gbCapsule(G,ph,[rh*.5,rh*.15,rh*.32],[rh*.78,rh*.5,rh*.2],rh*.28,rh*.24,RGBM(255,255,255),{seg:8,lat:3,len:2,mp:ARTMP});
  }
  /* legs: front widths, depth from the side view */
  const ld=m.legDepth.map(v=>v==null?null:v),ldf=(i,wv)=>ld[i]==null?wv*.95:ld[i];
  for(const [pt,ps,pf,s] of [[P_THN,P_SHN,P_FTN,'L'],[P_THF,P_SHF,P_FTF,'R']]){
    const th=fix(lim['th'+s]),sh=lim['sh'+s];
    const thD=th.map((v,i)=>clamp(ldf(Math.round(i/2),v),v*.75,v*1.35)),shD=sh.map((v,i)=>clamp(ldf(5+Math.round(i/2),v),v*.75,v*1.35));
    gbCapsule(G,pt,[0,0,0],[0,b.thigh*h,0],1,1,RGBM(255,255,255),{seg:18,len:10,lat:4,prof:prof(th,thD),mp:ARTMP});
    gbCapsule(G,ps,[0,0,0],[0,b.shin*h,0],1,1,RGBM(255,255,255),{seg:18,len:12,lat:4,prof:prof(sh,shD),mp:ARTMP});
    const rf=Math.max(b.rFoot*rs,W(sh[10])*.8);
    gbCapsule(G,pf,[0,0,0],[0,b.footL*h,0],rf*1.06,rf*.86,RGBM(255,255,255),{seg:14,len:4,sx:.62,sz:1.22,mp:ARTMP});
    gbSphere(G,pf,[-rf*.25,-rf*.25,0],rf*1.04,RGBM(255,255,255),{seg:12,lat:4,sx:.8,sz:1.1,mp:ARTMP});
  }
  return {R,nl};
}

/* ---------- the paint: a texture position for every vertex ---------- */
function artUV(def,G,A){
  const b=def.body,h=b.h,rs=h*b.bulk,m=A.m,F=A.F,B=A.B,sF=A.sF,hd=m.head;
  const n=G.p.length/3,uv=new Float32Array(n*2);
  const bot=m.bot*m.fs+m.fo[1];
  /* each part: origin landmark, end landmark, its length in the model */
  const limb={};
  const LM=(k,s)=>k+s;
  for(const [s,sd] of [['R','F'],['L','N']]){
    limb['UA'+sd]=['S'+s,'E'+s,b.uarm*h];limb['FA'+sd]=['E'+s,'W'+s,b.farm*h];limb['HA'+sd]=['W'+s,'T'+s,b.rHand*rs*1.4];
    limb['TH'+sd]=['h'+s,'k'+s,b.thigh*h];limb['SH'+sd]=['k'+s,'a'+s,b.shin*h];limb['FT'+sd]=['a'+s,null,b.footL*h];}
  void LM;
  const PK={[P_UAN]:'UAN',[P_FAN]:'FAN',[P_HAN]:'HAN',[P_UAF]:'UAF',[P_FAF]:'FAF',[P_HAF]:'HAF',[P_THN]:'THN',[P_SHN]:'SHN',[P_FTN]:'FTN',[P_THF]:'THF',[P_SHF]:'SHF',[P_FTF]:'FTF'};
  const OFFK={UAN:'uaL_o',FAN:'faL_o',UAF:'uaR_o',FAF:'faR_o',THN:'thL_o',SHN:'shL_o',THF:'thR_o',SHF:'shR_o'};
  const put=(i,x,y)=>{uv[i*2]=x/ARTA;uv[i*2+1]=1-y/ARTA;};
  for(let t=0;t<n;t+=3){
    const part=G.part[t];let nx=0,nz=0;for(let k=0;k<3;k++){nx+=G.n[(t+k)*3];nz+=G.n[(t+k)*3+2];}
    const back=nx<0,V=back?B:F,lat=back?A.kB/sF:1/sF,vs=back?A.kB:1;
    for(let k=0;k<3;k++){const i=t+k,px=G.p[i*3],py=G.p[i*3+1],pz=G.p[i*3+2];
      if(part===P_HEAD){
        if(nx>Math.abs(nz)*1.05){const s=hd.front.s/A.kh;put(i,hd.front.o[0]-pz*s,hd.front.o[1]-(py-A.chinL)*s);}
        else{const s=hd.side.s/A.kh;put(i,hd.side.o[0]+px*s,hd.side.o[1]-(py-A.chinL)*s);}
        continue;}
      if(part===P_TORSO){put(i,V.W[0]-pz*lat,V.W[1]-py*vs*(F.W[1]-F.N[1])/A.lT);continue;}
      if(part===P_PELVIS){put(i,V.H[0]-pz*lat,V.H[1]-(py-.03)*vs*(F.H[1]-F.W[1])/A.lP);continue;}
      if(part===P_NECK){put(i,V.N[0]-pz*lat,V.N[1]-py*vs/sF);continue;}
      const L=limb[PK[part]];if(!L){put(i,F.N[0],F.N[1]);continue;}
      const a=V[L[0]],e=L[1]?V[L[1]]:[a[0],back?a[1]+(bot-F.aR[1])*vs:bot],dx=e[0]-a[0],dy=e[1]-a[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
      const al=py*len/L[2],ok=OFFK[PK[part]],off=ok?interpA(m.limbs[ok],py/L[2])*m.fs*vs:0,q=pz*lat+off;put(i,a[0]+ux*al+uy*q,a[1]+uy*al-ux*q);
    }
  }
  return uv;
}
