/* ===================== painted fighters: bodies measured from Christopher's character sheets =====================
   tools/art_prep.py found each fighter's joints in the front T-pose picture and measured how wide every body part is
   (front picture) and how deep (turnaround side view and face-sheet side view). Here those measurements become finely
   divided 3D shapes, and the same pictures are painted onto them:
   - every vertex looks up its colour in two pictures (front and back for the body, face front and face side for the head)
     and blends them by which way it faces, so there is no seam where one picture hands over to the other
   - the shading painted into the pictures becomes relief: broad shapes (muscles, folds, the nose) move the vertices out or
     in a few millimetres, and the fine detail (strands of hair, stitching, wrinkles) bends the lighting per pixel
   The moves still come from the original skeleton; only the shape and the paint are new. ?classic=1 shows the old bodies. */
const ART_OFF=/[?&]classic=1/.test(location.search);
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const ARTA=2048,ARTFITS={},ARTTEX={};
const ARTFX={kai:{bump:.8},runa:{bump:.8},magnus:{gold:1,bump:1},nova:{emi:2.4,bump:.7},echo:{emi:.45,bump:.5}};
function artTex(id){
  if(ARTTEX[id])return ARTTEX[id];
  const t=new THREE.Texture();t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.premultiplyAlpha=false;
  const im=new Image();im.onload=()=>{
    /* phones get a half-size copy: a quarter of the memory, and still sharper than the screen */
    if(Q().id!=='high'&&self.createImageBitmap)createImageBitmap(im,{resizeWidth:ARTA/2,resizeHeight:ARTA/2,premultiplyAlpha:'none',resizeQuality:'high',imageOrientation:'flipY'}).then(bm=>{t.image=bm;t.flipY=false;t.needsUpdate=true;});
    else{t.image=im;t.needsUpdate=true;}};
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
  const hd=m.head,hH=hd.tposeH*m.fs*sF;
  A.kh=hH/(hd.front.chin-hd.front.top);A.chinL=-.72*b.headR*h*(def.look.headK||1);
  /* the coarse relief grid (256 x 256, 128 = flat) */
  const raw=atob(m.disp),D=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)D[i]=raw.charCodeAt(i);A.disp=D;
  A.det=Q().id==='low'?.6:1;A.hb=(ARTFX[def.id]||{}).hb||[.14,.42];
  /* the limbs' landmarks: origin, end, model length, centre-offset key */
  const rs=h*b.bulk,LB={};
  for(const [s,sd] of [['R','F'],['L','N']]){
    LB['UA'+sd]=['S'+s,'E'+s,b.uarm*h,'ua'+s+'_o'];LB['FA'+sd]=['E'+s,'W'+s,b.farm*h,'fa'+s+'_o'];LB['HA'+sd]=['W'+s,'T'+s,b.rHand*rs*1.4,null];
    LB['TH'+sd]=['h'+s,'k'+s,b.thigh*h,'th'+s+'_o'];LB['SH'+sd]=['k'+s,'a'+s,b.shin*h,'sh'+s+'_o'];LB['FT'+sd]=['a'+s,null,b.footL*h,null];}
  A.LB=LB;A.bot=m.bot*m.fs+m.fo[1];
  return ARTFITS[def.id]=A;
}
let PKEY=null;
const pkeyOf=part=>(PKEY||(PKEY={[P_UAN]:'UAN',[P_FAN]:'FAN',[P_HAN]:'HAN',[P_UAF]:'UAF',[P_FAF]:'FAF',[P_HAF]:'HAF',[P_THN]:'THN',[P_SHN]:'SHN',[P_FTN]:'FTN',[P_THF]:'THF',[P_SHF]:'SHF',[P_FTF]:'FTF'}))[part];
/* where a point of a part finds its paint: [front x, front y, back x, back y, back weight] in atlas pixels */
function projUV(A,part,p,n){
  const m=A.m,F=A.F,B=A.B,hd=m.head,px=p[0],py=p[1],pz=p[2];
  if(part===P_HEAD||part===P_EYE0||part===P_EYE1){
    const s1=hd.front.s/A.kh,s2=hd.side.s/A.kh,c=n[0]/Math.sqrt(n[0]*n[0]+n[2]*n[2]+1e-6);
    return [hd.front.o[0]-pz*s1,hd.front.o[1]-(py-A.chinL)*s1,hd.side.o[0]+px*s2,hd.side.o[1]-(py-A.chinL)*s2,1-smoothstep(A.hb[0],A.hb[1],c)];}
  const wb=smoothstep(.28,-.28,n[0]),o=[0,0,0,0,wb];
  for(let v=0;v<2;v++){const V=v?B:F,lat=(v?A.kB:1)/A.sF,vs=v?A.kB:1;let x,y;
    if(part===P_TORSO){x=V.W[0]-pz*lat;y=V.W[1]-py*vs*(F.W[1]-F.N[1])/A.lT;}
    else if(part===P_PELVIS){x=V.H[0]-pz*lat;y=V.H[1]-(py-.03)*vs*(F.H[1]-F.W[1])/A.lP;}
    else if(part===P_NECK){x=V.N[0]-pz*lat;y=V.N[1]-py*vs/A.sF;}
    else{const L=A.LB[pkeyOf(part)];if(!L){x=F.N[0];y=F.N[1];}
      else{const a=V[L[0]],e=L[1]?V[L[1]]:[a[0],v?a[1]+(A.bot-F.aR[1])*vs:A.bot],dx=e[0]-a[0],dy=e[1]-a[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
        const al=py*len/L[2],off=L[3]?interpA(m.limbs[L[3]],py/L[2])*m.fs*vs:0,q=pz*lat+off;x=a[0]+ux*al+uy*q;y=a[1]+uy*al-ux*q;}}
    o[v*2]=x;o[v*2+1]=y;}
  return o;
}
function artDisp(A,q){
  const s=(x,y)=>{const gx=clamp(x/ARTA*256-.5,0,255),gy=clamp(y/ARTA*256-.5,0,255),ix=Math.min(254,gx|0),iy=Math.min(254,gy|0),fx=gx-ix,fy=gy-iy,D=A.disp;
    const v=(D[iy*256+ix]*(1-fx)+D[iy*256+ix+1]*fx)*(1-fy)+(D[(iy+1)*256+ix]*(1-fx)+D[(iy+1)*256+ix+1]*fx)*fy;return v/128-1;};
  return s(q[0],q[1])*(1-q[4])+s(q[2],q[3])*q[4];
}
const ARTMP=[.2,0];
/* a closed shape from stacked rings, ys from top to bottom, rf(i,cx,cz) = radius toward a direction; the painted relief
   pushes the surface out or in by up to `amp` metres before the normals are worked out */
function gbHull(G,part,ys,rf,o={}){
  const A=o.A,M_=Math.max(8,Math.round((o.seg||24)*(A?A.det:1))),n=ys.length,P_=[];
  for(let i=0;i<n;i++){const r=[];for(let j=0;j<M_;j++){const th=j/M_*TAU,cx=Math.cos(th),cz=Math.sin(th),k=rf(i,cx,cz);r.push([cx*k,ys[i],cz*k]);}P_.push(r);}
  const nrm=(Pp,i,j)=>{const a=Pp[Math.max(0,i-1)][j],b_=Pp[Math.min(n-1,i+1)][j],c=Pp[i][(j+M_-1)%M_],d=Pp[i][(j+1)%M_];return v3n(v3cross(v3sub(a,b_),v3sub(d,c)));};
  let N_=P_.map((r,i)=>r.map((_,j)=>nrm(P_,i,j)));
  if(A&&o.amp){const amp=o.amp;
    const Q_=P_.map((r,i)=>r.map((p,j)=>{const nn=N_[i][j],k=amp*artDisp(A,projUV(A,part,p,nn))*(o.ampF?o.ampF(i):1);return [p[0]+nn[0]*k,p[1]+nn[1]*k,p[2]+nn[2]*k];}));
    for(let i=0;i<n;i++)P_[i]=Q_[i];N_=P_.map((r,i)=>r.map((_,j)=>nrm(P_,i,j)));}
  const top=[0,ys[0]+(ys[0]-ys[1])*.3,0],bot=[0,ys[n-1]-(ys[n-2]-ys[n-1])*.3,0];
  const W1=[1,1,1],ol=o.ol??1;
  for(let i=0;i<n-1;i++)for(let j=0;j<M_;j++){const j1=(j+1)%M_,A_=P_[i][j],B_=P_[i][j1],C_=P_[i+1][j1],D_=P_[i+1][j];
    gbTri(G,part,[A_,B_,D_],[N_[i][j],N_[i][j1],N_[i+1][j]],W1,0,ol,ARTMP);gbTri(G,part,[B_,C_,D_],[N_[i][j1],N_[i+1][j1],N_[i+1][j]],W1,0,ol,ARTMP);}
  for(let j=0;j<M_;j++){const j1=(j+1)%M_;gbTri(G,part,[top,P_[0][j1],P_[0][j]],[[0,1,0],N_[0][j1],N_[0][j]],W1,0,ol,ARTMP);
    gbTri(G,part,[bot,P_[n-1][j],P_[n-1][j1]],[[0,-1,0],N_[n-1][j],N_[n-1][j1]],W1,0,ol,ARTMP);}
}
const sell=(cx,cz,D,W,p=2.3)=>Math.pow(Math.pow(Math.abs(cx/Math.max(1e-4,D)),p)+Math.pow(Math.abs(cz/Math.max(1e-4,W)),p),-1/p);
function interpA(a,t){const n=a.length-1,x=clamp(t,0,1)*n,i=Math.min(n-1,Math.floor(x)),f=x-i;return a[i]*(1-f)+a[i+1]*f;}
function resample(arr,n){const o=[];for(let i=0;i<n;i++){const x=i/(n-1)*(arr.length-1),k=Math.min(arr.length-2,Math.floor(x)),f=x-k;o.push(arr[k].map((v,j)=>v==null||arr[k+1][j]==null?v:v*(1-f)+arr[k+1][j]*f));}return o;}
/* a limb: rings along the bone with round end caps */
function gbLimb(G,A,part,L,wf,df,o={}){
  const det=A.det,NB=Math.round((o.len||28)*det),NC=Math.max(3,Math.round(5*det)),ys=[],tt=[],cf=[];
  const rTop=Math.max(wf(1),df(1)),rBot=Math.max(wf(0),df(0));
  for(let k=NC;k>=1;k--){const ph=k/NC*1.35;ys.push(L+Math.sin(ph)*rTop*.9);tt.push(1);cf.push(Math.cos(ph));}
  for(let k=0;k<=NB;k++){const t=1-k/NB;ys.push(t*L);tt.push(t);cf.push(1);}
  for(let k=1;k<=NC;k++){const ph=k/NC*1.35;ys.push(-Math.sin(ph)*rBot*.9);tt.push(0);cf.push(Math.cos(ph));}
  gbHull(G,part,ys,(i,cx,cz)=>sell(cx,cz,df(tt[i]),wf(tt[i]),2.1)*cf[i],{seg:o.seg||36,A,amp:o.amp,ampF:i=>cf[i]});
}

/* ---------- the body ---------- */
function artBody(def,G,A){
  const b=def.body,h=b.h,rs=h*b.bulk,m=A.m,F=A.F,W=A.W,det=A.det,WH=RGBM(255,255,255);
  const oy=m.fo[1],fs=m.fs,ya=y=>y*fs+oy;
  /* torso and pelvis rows (crotch -> neck base), filled in above the armpits where the arms hide the chest's edge */
  const rows=m.torso.map(r=>r.slice());let ap=rows.findIndex(r=>r[1]==null);if(ap<0)ap=rows.length;
  const hwAp=rows[Math.max(0,ap-1)][1],nkW=b.rNeck*rs*1.5/(fs*A.sF);
  for(let i=ap;i<rows.length;i++){const t=(i-ap+1)/(rows.length-ap);rows[i][1]=lerp(hwAp*1.03,nkW,EASE.smooth(clamp((t-.45)/.55,0,1)));}
  for(const r of rows){if(r[2]==null)r[2]=r[1]*.6;if(r[3]==null)r[3]=r[1]*.6;}
  for(let i=ap;i<rows.length;i++){const t=(i-ap+1)/(rows.length-ap),k=lerp(1,.55,EASE.smooth(clamp((t-.5)/.5,0,1)));rows[i][2]*=k;rows[i][3]*=k;}
  /* a light smoothing pass: the outline measurements are a pixel or two noisy */
  for(let pass=0;pass<2;pass++)for(let i=1;i<rows.length-1;i++)for(const j of [1,2,3])rows[i][j]=(rows[i-1][j]+rows[i][j]*2+rows[i+1][j])/4;
  const stT=A.lT/(F.W[1]-F.N[1]),stP=A.lP/(F.H[1]-F.W[1]);
  let tor=[],pel=[];
  for(let i=rows.length-1;i>=0;i--){const y=ya(rows[i][0]);if(y<=F.W[1]+6)tor.push(rows[i]);if(y>=F.W[1]-6)pel.push(rows[i]);}
  if(det<1){tor=resample(tor,Math.round(tor.length*det));pel=resample(pel,Math.round(pel.length*det));}
  gbHull(G,P_TORSO,tor.map(r=>(F.W[1]-ya(r[0]))*stT),(i,cx,cz)=>sell(cx,cz,W(cx>=0?tor[i][2]:tor[i][3]),W(tor[i][1])),{seg:60,A,amp:.007});
  gbHull(G,P_PELVIS,pel.map(r=>(F.H[1]-ya(r[0]))*stP+.03),(i,cx,cz)=>sell(cx,cz,W(cx>=0?pel[i][2]:pel[i][3]),W(pel[i][1])),{seg:60,A,amp:.006});
  /* neck */
  const R=b.headR*h*(def.look.headK||1),nk=(b.neck+b.headR)*h,nl=Math.hypot(nk-.75*R,.08*R);
  gbCapsule(G,P_NECK,[0,0,0],[0,nl,0],b.rNeck*rs*1.12,b.rNeck*rs*.92,WH,{seg:24,len:5,lat:4,ol:0,mp:ARTMP});
  /* head: front width and side depth from the face sheet; below the eyes it narrows to the jaw */
  let hf=m.head.front.rows.map(r=>r.slice()),hs=m.head.side.rows.map(r=>r.slice());const kh=A.kh,nr=hf.length;
  const iRef=Math.round(nr*.5),wRef=hf[iRef][1],bRef=hs[iRef][2],fRef=hs[iRef][1];
  for(let i=iRef;i<nr;i++){const u=(i-iRef)/(nr-1-iRef);hf[i][1]=lerp(Math.min(hf[i][1],wRef),wRef*(1-.38*u*u),.85);hs[i][2]=Math.min(hs[i][2],bRef*(1-.25*u));hs[i][1]=Math.min(hs[i][1],fRef*1.08);}
  for(let pass=0;pass<3;pass++)for(let i=1;i<nr-1;i++){hf[i][1]=(hf[i-1][1]+hf[i][1]*2+hf[i+1][1])/4;hs[i][2]=(hs[i-1][2]+hs[i][2]*2+hs[i+1][2])/4;}
  /* the face's own profile (brow, nose, lips, chin) stands out of a smooth front only along the middle */
  const frS=hs.map(r=>r[1]),base=frS.map((v,i)=>{let s=0,c=0;for(let k=-6;k<=6;k++){const j=clamp(i+k,0,nr-1);s+=frS[j];c++;}return s/c;});
  const bumpF=frS.map((v,i)=>Math.max(0,v-base[i]));for(let i=0;i<nr;i++)hs[i][1]=base[i];
  const faceBump=(i,cx,cz)=>{const k=Math.round(i*(nr-1)/Math.max(1,hf.length-1));return k>nr*.35?bumpF[k]*kh*Math.max(0,cx)*Math.exp(-(cz*cz)/(.03)):0;};
  if(det<1){hf=resample(hf,Math.round(nr*det));hs=resample(hs,Math.round(nr*det));}
  gbHull(G,P_HEAD,hf.map(r=>A.chinL+(m.head.front.chin-r[0])*kh),(i,cx,cz)=>sell(cx,cz,(cx>=0?hs[i][1]:hs[i][2])*kh,hf[i][1]*kh,2.1)+faceBump(i,cx,cz),{seg:80,ol:.7,A,amp:.003});
  /* Kai's spikes stand out of his hair in 3D, painted from the same face sheet */
  const L=def.look;
  if(L.hairStyle==='spikes'&&L.spikes){const hr=(hf[Math.round(hf.length*.3)][1]*kh)/1.06,fan=[[-1.05,.74],[-.55,.9],[0,1],[.55,.9],[1.05,.74]];
    for(const s of L.spikes){const a=s[0]*D2R,dv=[Math.sin(a),Math.cos(a),0];
      for(const [rz,k] of fan){const d=[dv[0],dv[1]*Math.cos(rz),dv[1]*Math.sin(rz)],c0=[0,hr*.2,0];
        gbCapsule(G,P_HEAD,v3add(c0,v3sc(d,hr*.6)),v3add(c0,v3sc(d,hr*s[1]*k*1.02)),hr*s[2]*(k<1?.85:.95),Math.max(.003,hr*.04),WH,{seg:10,len:5,lat:2,ol:.7,mp:[.3,0],prof:(t)=>1+.15*bump(t,.25,.2)});}}}
  /* arms: measured widths along each bone (the first stretch is hidden by the torso in the picture, so it is filled in) */
  const lim=m.limbs,fix=a=>{const v=a.slice(),n=v.length,k=v[Math.round(n*.2)];for(let i=0;i<Math.round(n*.2);i++)v[i]=k*(1+.1*(1-i/(n*.2)));return v;};
  const sm=a=>{const v=a.slice();for(let p=0;p<2;p++)for(let i=1;i<v.length-1;i++)v[i]=(v[i-1]+v[i]*2+v[i+1])/4;return v;};
  for(const [pu,pf,ph,s] of [[P_UAN,P_FAN,P_HAN,'L'],[P_UAF,P_FAF,P_HAF,'R']]){
    const ua=sm(fix(lim['ua'+s])),fa=sm(lim['fa'+s]);
    gbLimb(G,A,pu,b.uarm*h,t=>W(interpA(ua,t)),t=>W(interpA(ua,t))*.95,{amp:.005});
    gbLimb(G,A,pf,b.farm*h,t=>W(interpA(fa,t)),t=>W(interpA(fa,t))*.9,{amp:.004});
    artFist(G,ph,Math.max(b.rHand*rs,W(fa[fa.length-1])*.95),det);
  }
  /* legs: front widths, depth from the side view */
  const ld=m.legDepth,ldN=ld.length-1;
  for(const [pt,ps,pf,s] of [[P_THN,P_SHN,P_FTN,'L'],[P_THF,P_SHF,P_FTF,'R']]){
    const th=sm(fix(lim['th'+s])),sh=sm(lim['sh'+s]);
    const dAt=(t,wv)=>{const v=interpA(ld.map(x=>x==null?0:x),t);return clamp(v>0?v:wv*.95,wv*.75,wv*1.35);};
    gbLimb(G,A,pt,b.thigh*h,t=>W(interpA(th,t)),t=>W(dAt(t*.5,interpA(th,t))),{amp:.006});
    gbLimb(G,A,ps,b.shin*h,t=>W(interpA(sh,t)),t=>W(dAt(.5+t*.5,interpA(sh,t))),{amp:.005});
    const rf=Math.max(b.rFoot*rs,W(sh[sh.length-1])*.8);
    gbCapsule(G,pf,[0,0,0],[0,b.footL*h,0],rf*1.06,rf*.86,WH,{seg:24,len:8,lat:4,sx:.62,sz:1.22,mp:ARTMP});
    gbSphere(G,pf,[-rf*.25,-rf*.25,0],rf*1.04,WH,{seg:20,lat:6,sx:.8,sz:1.1,mp:ARTMP});
    for(let k=0;k<5;k++)gbSphere(G,pf,[rf*.05,b.footL*h*(.92-Math.abs(k-1.2)*.05),(k-2)*rf*.34],rf*(k===0?.3:.24),WH,{seg:10,lat:3,ol:.4,mp:ARTMP});
    void ldN;
  }
  return {R,nl};
}
/* a clenched fist: palm, four curled fingers in three joints each, and a thumb over them */
function artFist(G,ph,rh,det){
  const WH=RGBM(255,255,255),sg=Math.max(8,Math.round(12*det)),o={seg:sg,lat:3,len:2,mp:ARTMP,ol:.6};
  gbCapsule(G,ph,[0,rh*.05,0],[0,rh*.5,0],rh*.8,rh*.76,WH,{seg:Math.round(24*det),lat:5,len:4,sz:.74,sx:.95,mp:ARTMP});
  for(let k=0;k<4;k++){const z=(k-1.5)*rh*.36,l=k===3?.85:k===0?.97:1,r=rh*(k===3?.15:.17);
    const p0=[-rh*.1,rh*.62,z],p1=[rh*.05,rh*.95*l,z*1.02],p2=[rh*.42,rh*.98*l,z],p3=[rh*.58,rh*.7*l,z*.98];
    gbCapsule(G,ph,p0,p1,r*1.05,r,WH,o);gbCapsule(G,ph,p1,p2,r,r*.95,WH,o);gbCapsule(G,ph,p2,p3,r*.95,r*.85,WH,o);}
  gbCapsule(G,ph,[rh*.35,rh*.12,rh*.5],[rh*.62,rh*.45,rh*.45],rh*.22,rh*.19,WH,o);
  gbCapsule(G,ph,[rh*.62,rh*.45,rh*.45],[rh*.72,rh*.72,rh*.12],rh*.19,rh*.16,WH,o);
}

/* ---------- the paint: two texture positions and a blend weight for every vertex ---------- */
function artUV(def,G,A){
  const n=G.p.length/3,uv=new Float32Array(n*2),uv2=new Float32Array(n*2),wb=new Float32Array(n);
  for(let i=0;i<n;i++){const q=projUV(A,G.part[i],[G.p[i*3],G.p[i*3+1],G.p[i*3+2]],[G.n[i*3],G.n[i*3+1],G.n[i*3+2]]);
    uv[i*2]=q[0]/ARTA;uv[i*2+1]=1-q[1]/ARTA;uv2[i*2]=q[2]/ARTA;uv2[i*2+1]=1-q[3]/ARTA;wb[i]=q[4];}
  return {uv,uv2,wb};
}
