/* ===================== 3D fighters =====================
   The fight engine still poses every fighter as a flat skeleton (02_rig.js: hips, lean, four IK targets), exactly as in the
   original. Here that skeleton is lifted into 3D: the joints keep their x and y, the near and far limbs get a depth, the
   chest and head turn a little toward the camera, and arms and legs are solved again in 3D so their lengths stay true.
   Hands and feet still land where the engine's hit circles are.
   Each fighter is one mesh (plus one for cloth): every vertex belongs to a body part, and a shader moves each part by its
   own matrix, so a fighter costs one draw call. Costume patterns are the original's own colour functions (t along a limb,
   s across it), evaluated per triangle. */
const NP=20,P_TORSO=0,P_PELVIS=1,P_NECK=2,P_HEAD=3,P_EYE0=4,P_EYE1=5,P_UAN=6,P_FAN=7,P_HAN=8,P_UAF=9,P_FAF=10,P_HAF=11,
  P_THN=12,P_SHN=13,P_FTN=14,P_THF=15,P_SHF=16,P_FTF=17,P_ID=19;
const YAW_T=28*D2R,YAW_P=16*D2R,YAW_H=34*D2R;

/* ---------- toon ramp (the original's four bands: dark, mid, base, highlight) ---------- */
const TOONRAMP=(()=>{const n=64,d=new Uint8Array(n);for(let i=0;i<n;i++){const c=i/(n-1);d[i]=Math.round(255*(c<.55?.2:c<.7?.48:c<.88?.8:1));}
  const t=new THREE.DataTexture(d,n,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;})();

/* shared shading inputs, set once a frame by the stage/camera */
const SHU={uRim:{value:new THREE.Color(1,.3,.7)},uRimDir:{value:new THREE.Vector3(1,0,0)},uTime:{value:0},uKeyDir:{value:new THREE.Vector3(0,1,0)},
  uKeyCol:{value:new THREE.Color(1,1,1)},uAmb:{value:new THREE.Color(.2,.15,.3)},uRefl:{value:.25},uOlCol:{value:new THREE.Color(.04,.02,.08)}};

/* ---------- geometry builder: tapered elliptical capsules, spheres, cones and tori, one colour per triangle ---------- */
function rampRGB(m){return [m.base[0]/255,m.base[1]/255,m.base[2]/255];}
function srgb2lin(c){return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
function GB(){return {p:[],n:[],c:[],part:[],emi:[],ol:[]};}
function gbTri(G,part,v,nn,col,emi,ol){for(let k=0;k<3;k++){G.p.push(v[k][0],v[k][1],v[k][2]);G.n.push(nn[k][0],nn[k][1],nn[k][2]);G.c.push(col[0],col[1],col[2]);G.part.push(part);G.emi.push(emi);G.ol.push(ol);}}
function v3sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function v3add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function v3sc(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
function v3dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function v3cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function v3len(a){return Math.hypot(a[0],a[1],a[2]);}
function v3n(a){const l=v3len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];}
function colOf(mat,t,s){const m=typeof mat==='function'?mat(t,s):mat;return m;}
/* capsule from a to b (part-local), radii ra..rb, cross-section scaled by sx (toward xref) and sz; colour by mat(t,s) */
function gbCapsule(G,part,a,b,ra,rb,mat,o={}){
  const M=o.seg||14,LAT=o.lat||4,LEN=o.len||6,sx=o.sx||1,sz=o.sz||1,ol=o.ol??1;
  let ax=v3sub(b,a);const L=v3len(ax);ax=L>1e-6?v3sc(ax,1/L):(o.axis||[0,1,0]);
  let xr=o.xref||[1,0,0];xr=v3sub(xr,v3sc(ax,v3dot(xr,ax)));if(v3len(xr)<1e-4)xr=Math.abs(ax[0])<.9?[1,0,0]:[0,0,1],xr=v3sub(xr,v3sc(ax,v3dot(xr,ax)));xr=v3n(xr);
  const zr=v3cross(xr,ax);
  /* rings: bottom hemisphere (at a), body, top hemisphere (at b); each ring: centre, radius, latitude cos/sin, t */
  const rings=[];
  for(let i=0;i<=LAT;i++){const ph=-Math.PI/2+(Math.PI/2)*i/LAT;rings.push({c:a,r:ra,cp:Math.cos(ph),sp:Math.sin(ph),t:0});}
  if(L>1e-6)for(let i=1;i<LEN;i++){const t=i/LEN;rings.push({c:v3add(a,v3sc(ax,L*t)),r:lerp(ra,rb,t),cp:1,sp:0,t});}
  for(let i=0;i<=LAT;i++){const ph=(Math.PI/2)*i/LAT;rings.push({c:b,r:rb,cp:Math.cos(ph),sp:Math.sin(ph),t:1});}
  const P=[],N=[],TS=[];
  for(const R of rings){const pr=[],nr=[],tr=[];
    for(let j=0;j<=M;j++){const th=j/M*TAU,cx=Math.cos(th),cz=Math.sin(th);
      const off=v3add(v3sc(xr,cx*R.cp*R.r*sx),v3sc(zr,cz*R.cp*R.r*sz));
      pr.push(v3add(v3add(R.c,off),v3sc(ax,R.sp*R.r)));
      nr.push(v3n(v3add(v3add(v3sc(xr,cx*R.cp/sx),v3sc(zr,cz*R.cp/sz)),v3sc(ax,R.sp))));
      tr.push([R.t,cx]);}
    P.push(pr);N.push(nr);TS.push(tr);}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<M;j++){
    const tm=(TS[i][j][0]+TS[i+1][j][0])*.5,smid=Math.cos((j+.5)/M*TAU);
    const m=colOf(mat,clamp(tm,0,1),smid);if(!m)continue;
    const col=rampRGB(m).map(srgb2lin),emi=m.emi?1:0;
    const A=P[i][j],B=P[i][j+1],C=P[i+1][j+1],D=P[i+1][j];
    if(v3len(v3cross(v3sub(B,A),v3sub(D,A)))>1e-12)gbTri(G,part,[A,D,B],[N[i][j],N[i+1][j],N[i][j+1]],col,emi,ol);
    if(v3len(v3cross(v3sub(C,B),v3sub(D,B)))>1e-12)gbTri(G,part,[B,D,C],[N[i][j+1],N[i+1][j],N[i+1][j+1]],col,emi,ol);
  }
}
function gbSphere(G,part,c,r,mat,o={}){gbCapsule(G,part,c,c,r,r,mat,Object.assign({lat:o.lat||6,len:1,seg:o.seg||14},o));}
/* elliptical torus (ring) in the plane spanned by u and v around centre c, from angle a0 to a1 */
function gbRing(G,part,c,u,v,rx,rz,tube,mat,o={}){
  const M=o.seg||24,K=o.tseg||6,a0=o.a0??0,a1=o.a1??TAU,ol=o.ol??1;
  const ax=v3n(v3cross(u,v)),m=colOf(mat,.5,0),col=rampRGB(m).map(srgb2lin),emi=m.emi?1:0;
  const pt=(i,k)=>{const a=a0+(a1-a0)*i/M,b=k/K*TAU,cr=[Math.cos(a)*rx,Math.sin(a)*rz];
    const rad=v3n(v3add(v3sc(u,Math.cos(a)/rx),v3sc(v,Math.sin(a)/rz)));
    const center=v3add(c,v3add(v3sc(u,cr[0]),v3sc(v,cr[1])));
    const nn=v3n(v3add(v3sc(rad,Math.cos(b)),v3sc(ax,Math.sin(b))));
    return [v3add(center,v3sc(nn,tube)),nn];};
  for(let i=0;i<M;i++)for(let k=0;k<K;k++){const A=pt(i,k),B=pt(i+1,k),C=pt(i+1,k+1),D=pt(i,k+1);
    gbTri(G,part,[A[0],B[0],C[0]],[A[1],B[1],C[1]],col,emi,ol);gbTri(G,part,[A[0],C[0],D[0]],[A[1],C[1],D[1]],col,emi,ol);}
}
function unpackRGB(p){return {base:[p&255,(p>>>8)&255,(p>>>16)&255],emi:false};}

/* ---------- one fighter's body geometry (static) ---------- */
const GEOS={};
function fighterGeo(def){
  if(GEOS[def.id])return GEOS[def.id];
  const G=GB(),b=def.body,L=def.look,h=b.h,rs=h*b.bulk,tor=b.torso*h,kw=1.32;
  const Lt=tor*.56;
  /* torso: waist to chest, wider than deep */
  gbCapsule(G,P_TORSO,[0,0,0],[0,Lt,0],b.rWaist*rs,b.rChest*rs,L.torso,{seg:22,len:10,lat:5,sz:kw});
  if(L.collar){gbRing(G,P_TORSO,[-.015,tor*.84-.035,0],[1,0,0],[0,0,1],.075*rs*1.05,.09*rs*1.1,.05*rs,LOOK_RUNA.scarfM,{seg:20,tseg:6});}
  /* pelvis + belt */
  gbCapsule(G,P_PELVIS,[0,0,0],[0,.11,0],b.rPelvis*rs,b.rWaist*rs*1.02,L.pelvis,{seg:20,len:3,lat:4,sz:kw});
  if(L.belt){const bw=(L.beltW||.034)*rs;gbRing(G,P_PELVIS,[0,.105,0],[1,0,0],[0,0,1],b.rPelvis*rs*1.06,b.rPelvis*rs*kw*1.06,bw,L.belt,{seg:26,tseg:6});
    if(L.buckle){gbSphere(G,P_PELVIS,[b.rPelvis*rs*1.12,.105,0],L.buckle*rs,L.buckleM,{sx:.45,sz:1.25,seg:12,lat:4});}}
  /* neck */
  const R=b.headR*h*(L.headK||1),nk=(b.neck+b.headR)*h,nl=Math.hypot(nk-.75*R,.08*R);
  gbCapsule(G,P_NECK,[0,0,0],[0,nl,0],b.rNeck*rs,b.rNeck*rs*.92,L.skin,{seg:12,len:2,lat:3,ol:0});
  /* head (origin = head centre, +x = face, +y = up, +z = side) */
  const hp=(f,u,z=0)=>[f*R,u*R,z*R],st=L.hairStyle;
  if(st==='bald'||st==='holo')gbSphere(G,P_HEAD,[0,0,0],R,st==='holo'?L.helm:L.skin,{seg:18,lat:7});
  else{gbSphere(G,P_HEAD,hp(-.2,.15),R*1.05,L.hair,{seg:18,lat:7});gbSphere(G,P_HEAD,hp(.17,-.16),R*.85,L.skin,{seg:16,lat:6,ol:.6});}
  if(L.spikes)for(const s of L.spikes){
    const a=s[0]*D2R,dv=[Math.sin(a),Math.cos(a),0];
    for(const [rz,k] of [[-.62,.84],[0,1],[.62,.84]]){
      /* fan the original's side-view spikes across the head: rotate about the face axis */
      const d=[dv[0],dv[1]*Math.cos(rz),dv[1]*Math.sin(rz)];
      gbCapsule(G,P_HEAD,v3sc(d,R*.45),v3sc(d,R*s[1]*k),R*s[2]*(k<1?.9:1),Math.max(.004,R*.06),L.hair,{seg:8,len:3,lat:2,ol:.7});}
  }
  if(L.beard)gbCapsule(G,P_HEAD,hp(-.3,-.36),hp(.62,-.74),R*.34,R*.3,L.beard,{sz:1.55,seg:14,len:3});
  if(L.gear==='band'){
    const tilt=-4.6*D2R,u=[Math.cos(tilt),Math.sin(tilt),0];gbRing(G,P_HEAD,hp(-.1,.42),u,[0,0,1],R*1.05,R*1.03,R*.17,L.band,{seg:28,tseg:6});
    gbSphere(G,P_HEAD,hp(-1.2,.44),R*.24,L.band,{seg:10,lat:4});}
  else if(L.gear==='mask')gbCapsule(G,P_HEAD,hp(1.0,-.3),hp(-.3,-.44),R*.5,R*.42,L.mask,{sz:1.75,seg:16,len:3});
  const R2=R;
  if(L.gear==='visor'||st==='holo'){gbRing(G,P_HEAD,hp(.06,.08),[1,0,0],[0,0,1],R2*.93,R2*.95,R2*.17,L.visor,{seg:20,tseg:5,a0:-1.35,a1:1.35,ol:.5});}
  else{
    /* eyes: two parts so they can squint when hurt; each built around its own centre */
    const eyeW=unpackRGB(L.eyeW),eyeD=unpackRGB(L.eyeD);
    for(const [pi,zs] of [[P_EYE0,-1],[P_EYE1,1]]){
      gbSphere(G,pi,[0,0,0],R*.13,eyeW,{seg:10,lat:4,ol:0,sx:.7});
      gbSphere(G,pi,[R*.06,0,0],R*.085,eyeD,{seg:8,lat:3,ol:0,sx:.6});
    }
    const br=unpackRGB(L.brow||L.eyeD);
    for(const zs of [-1,1])gbCapsule(G,P_HEAD,[R*.9,R*.25,zs*R*.1],[R*.8,R*.31,zs*R*.42],R*.05,R*.04,br,{seg:6,len:2,lat:2,ol:0});
    if(L.gear!=='mask'){const mo=unpackRGB(L.mouth||L.eyeD);gbCapsule(G,P_HEAD,[R*.94,-R*.44,-R*.13],[R*.94,-R*.44,R*.13],R*.035,R*.035,mo,{seg:6,len:2,lat:2,ol:0});}
  }
  /* arms (near camera = rear arm F, far = lead arm N); a delt sphere at each shoulder */
  for(const [pu,pf,ph] of [[P_UAN,P_FAN,P_HAN],[P_UAF,P_FAF,P_HAF]]){
    gbSphere(G,pu,[0,0,0],b.rDelt*rs,matAt(L.uarm,0),{seg:14,lat:5});
    gbCapsule(G,pu,[0,0,0],[0,b.uarm*h,0],b.rU[0]*rs,b.rU[1]*rs,L.uarm,{seg:14,len:6});
    gbCapsule(G,pf,[0,0,0],[0,b.farm*h,0],b.rF[0]*rs,b.rF[1]*rs,L.farm,{seg:14,len:8});
    gbSphere(G,ph,[0,b.rHand*rs*.15,0],b.rHand*rs,L.hand,{seg:14,lat:5,sz:.92});
  }
  for(const [pt,ps,pf] of [[P_THN,P_SHN,P_FTN],[P_THF,P_SHF,P_FTF]]){
    gbCapsule(G,pt,[0,0,0],[0,b.thigh*h,0],b.rT[0]*rs,b.rT[1]*rs,L.thigh,{seg:16,len:7});
    gbCapsule(G,ps,[0,0,0],[0,b.shin*h,0],b.rS[0]*rs,b.rS[1]*rs,L.shin,{seg:14,len:10});
    gbCapsule(G,pf,[0,0,0],[0,b.footL*h,0],b.rFoot*rs,b.rFoot*rs*.82,L.foot,{seg:12,len:3,sx:.82,sz:1.18});
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(G.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(G.n,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(G.c,3));geo.setAttribute('aPart',new THREE.Float32BufferAttribute(G.part,1));
  geo.setAttribute('aEmi',new THREE.Float32BufferAttribute(G.emi,1));geo.setAttribute('aOl',new THREE.Float32BufferAttribute(G.ol,1));
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),100);
  GEOS[def.id]={geo,R,nl,Lt,tris:G.p.length/9};return GEOS[def.id];
}

/* ---------- materials: toon (lit, shadows), shadow depth, outline, floor reflection, afterimage ---------- */
const PARTDECL=`uniform mat4 uPart[${NP}];attribute float aPart;attribute float aEmi;attribute float aOl;`;
function mkToon(U){
  const m=new THREE.MeshToonMaterial({vertexColors:true,gradientMap:TOONRAMP});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+PARTDECL+'varying float vEmi;uniform float uGlitch,uTime;')
      .replace('#include <beginnormal_vertex>','mat4 pM=uPart[int(aPart+.5)];vec3 objectNormal=mat3(pM)*normal;vEmi=aEmi;')
      .replace('#include <begin_vertex>','vec3 transformed=(pM*vec4(position,1.)).xyz;if(uGlitch>0.){float bnd=floor(transformed.y*9.+floor(uTime*13.));transformed.x+=uGlitch*step(.82,fract(sin(bnd*12.9898)*43758.5453))*.06*sign(sin(bnd*7.3));}');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uRim,uRimDir;uniform float uFlash,uEmiK,uHolo,uTime,uDimF;varying float vEmi;')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vColor.rgb*vEmi*uEmiK;')
      .replace('#include <opaque_fragment>',`
        vec3 Vv=normalize(vViewPosition);float ndv=clamp(dot(normal,Vv),0.,1.);
        float rim=pow(1.-ndv,2.6)*clamp(dot(normal,uRimDir)*.75+.35,0.,1.);
        outgoingLight+=uRim*rim*(diffuseColor.rgb*1.6+.12);
        outgoingLight*=uDimF;
        outgoingLight=mix(outgoingLight,vec3(2.4,2.3,2.2),uFlash);
        #include <opaque_fragment>
        if(uHolo>.5){float sl=mod(gl_FragCoord.y,3.);gl_FragColor.rgb*=(sl<1.?.4:1.)*.62;gl_FragColor.rgb+=vec3(.2,.7,1.1)*pow(1.-ndv,2.2)*.55;gl_FragColor.a=.78;}`);
  };
  return m;
}
function mkDepth(U){
  const m=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  m.onBeforeCompile=sh=>{sh.uniforms.uPart=U.uPart;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+PARTDECL)
    .replace('#include <begin_vertex>','vec3 transformed=(uPart[int(aPart+.5)]*vec4(position,1.)).xyz;');};
  return m;
}
function mkOutline(U){
  return new THREE.ShaderMaterial({uniforms:{uPart:U.uPart,uW:{value:.0085},uCol:SHU.uOlCol,uA:{value:1}},side:THREE.BackSide,
    vertexShader:PARTDECL+`uniform float uW;void main(){mat4 pM=uPart[int(aPart+.5)];vec3 n=normalize(mat3(pM)*normal);vec4 wp=pM*vec4(position,1.);
      vec4 mv=viewMatrix*wp;wp.xyz+=n*uW*aOl*(1.+(-mv.z)*.08);gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`uniform vec3 uCol;void main(){gl_FragColor=vec4(uCol,1.);}`});
}
function mkReflect(U){
  return new THREE.ShaderMaterial({uniforms:{uPart:U.uPart,uRefl:SHU.uRefl,uKeyDir:SHU.uKeyDir,uKeyCol:SHU.uKeyCol,uAmb:SHU.uAmb,uFlash:U.uFlash,uHolo:U.uHolo},
    vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    /* the mirrored fighter is drawn where its line of sight meets the floor: same place on screen, but at the floor's depth,
       so the floor hides what is behind it and anything standing in front still covers the reflection */
    vertexShader:PARTDECL+`varying vec3 vC,vN;varying float vY,vE;void main(){mat4 pM=uPart[int(aPart+.5)];vec4 wp=pM*vec4(position,1.);wp.y=-wp.y;vY=wp.y;
      vec3 n=mat3(pM)*normal;n.y=-n.y;vN=n;vC=color;vE=aEmi;
      vec3 C=cameraPosition;float t=C.y/max(C.y-wp.y,1e-3);vec3 Qp=C+(wp.xyz-C)*t;Qp.y=.004;gl_Position=projectionMatrix*viewMatrix*vec4(Qp,1.);}`,
    fragmentShader:`uniform float uRefl,uFlash,uHolo;uniform vec3 uKeyDir,uKeyCol,uAmb;varying vec3 vC,vN;varying float vY,vE;
      void main(){float a=uRefl*exp(vY*1.25);vec3 n=normalize(vN);vec3 c=vC*(uAmb*1.6+uKeyCol*max(dot(n,uKeyDir),0.)*.8)+vC*vE*2.2;c=mix(c,vec3(1.6),uFlash);if(uHolo>.5)a*=.7;
      gl_FragColor=vec4(c,a);}`});
}
function mkGhost(){
  const mats=[];for(let i=0;i<NP;i++)mats.push(new THREE.Matrix4());
  return new THREE.ShaderMaterial({uniforms:{uPart:{value:mats},uCol:{value:new THREE.Color()},uA:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:PARTDECL+`varying vec3 vN,vV;void main(){mat4 pM=uPart[int(aPart+.5)];vec4 wp=pM*vec4(position,1.);vN=normalize(mat3(viewMatrix)*(mat3(pM)*normal));vec4 mv=viewMatrix*wp;vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uCol;uniform float uA;varying vec3 vN,vV;void main(){float f=1.-clamp(dot(normalize(vN),normalize(vV)),0.,1.);gl_FragColor=vec4(uCol*(.12+f*f*1.4)*uA,1.);}`});
}

/* ---------- cloth: the original's verlet chains drawn as tubes and ribbons ---------- */
const CLOTH_SIDES=6;
function clothSpec(def){
  const L=def.look,out=[];
  for(const o of (L.chains||[])){
    const ribbon=o.mat==='band'||o.mat==='scarfM'||o.mat==='rib'||o.anchor==='belt',kz=o.anchor==='hair'?.9:ribbon?.4:.85;
    let z=0;if(o.anchor==='belt')z=.11;else if(o.anchor==='shF')z=.2;else if(o.anchor==='shN')z=-.2;else if(o.anchor==='band')z=out.filter(c=>c.o.anchor==='band').length?-.05:.05;
    out.push({o,kz,z,mat:L[o.mat]});
  }
  return out;
}

/* ---------- a fighter instance in the scene ---------- */
const ACTORS=[];
function mkActorMesh(def){
  const info=fighterGeo(def),mats=[];for(let i=0;i<NP;i++)mats.push(new THREE.Matrix4());
  const U={uPart:{value:mats},uFlash:{value:0},uEmiK:{value:def.look.holo?1.1:2.2},uHolo:{value:def.look.holo?1:0},uGlitch:{value:0},uRim:SHU.uRim,uRimDir:SHU.uRimDir,uTime:SHU.uTime,uDimF:{value:1}};
  const toon=mkToon(U),depth=mkDepth(U),ol=mkOutline(U),rf=mkReflect(U);
  if(def.look.holo){toon.transparent=true;ol.uniforms.uCol={value:new THREE.Color(.05,.25,.45)};}
  const grp=new THREE.Group();
  const body=new THREE.Mesh(info.geo,toon);body.frustumCulled=false;body.castShadow=true;body.customDepthMaterial=depth;
  const outl=new THREE.Mesh(info.geo,ol);outl.frustumCulled=false;
  const refl=new THREE.Mesh(info.geo,rf);refl.frustumCulled=false;refl.renderOrder=30;
  grp.add(body,outl,refl);
  /* cloth */
  const spec=clothSpec(def);let nv=0;for(const s of spec)nv+=s.o.n*CLOTH_SIDES*6;
  let cloth=null,cgeo=null;
  if(nv){cgeo=new THREE.BufferGeometry();const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),col=new Float32Array(nv*3),part=new Float32Array(nv).fill(P_ID),emi=new Float32Array(nv),olw=new Float32Array(nv).fill(.6);
    let k=0;for(const s of spec){const c=rampRGB(s.mat).map(srgb2lin),e=s.mat.emi?1:0;for(let i=0;i<s.o.n*CLOTH_SIDES*6;i++){col[k*3]=c[0];col[k*3+1]=c[1];col[k*3+2]=c[2];emi[k]=e;k++;}}
    cgeo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));cgeo.setAttribute('normal',new THREE.BufferAttribute(nor,3).setUsage(THREE.DynamicDrawUsage));
    cgeo.setAttribute('color',new THREE.BufferAttribute(col,3));cgeo.setAttribute('aPart',new THREE.BufferAttribute(part,1));cgeo.setAttribute('aEmi',new THREE.BufferAttribute(emi,1));cgeo.setAttribute('aOl',new THREE.BufferAttribute(olw,1));
    cgeo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),100);
    cloth=new THREE.Mesh(cgeo,toon);cloth.frustumCulled=false;cloth.castShadow=true;cloth.customDepthMaterial=depth;
    const co=new THREE.Mesh(cgeo,ol);co.frustumCulled=false;const cr=new THREE.Mesh(cgeo,rf);cr.frustumCulled=false;cr.renderOrder=30;
    grp.add(cloth,co,cr);}
  mats[P_ID].identity();
  const A={def,grp,U,mats,body,outl,refl,cloth,cgeo,spec,ghosts:[],used:false,turn:0,lastFace:0,tris:info.tris};
  ACTORS.push(A);ACTORG.add(grp);return A;
}
function actorFor(key,def){
  let a=ACTORPOOL[key];
  if(!a||a.def!==def){if(a){a.grp.visible=false;a.free=true;}a=ACTORS.find(x=>x.free&&x.def===def)||mkActorMesh(def);a.free=false;a.turn=0;a.lastFace=0;ACTORPOOL[key]=a;}
  return a;
}
const ACTORPOOL={};
const ACTORG=new THREE.Group();

/* ---------- posing: flat skeleton -> part matrices ---------- */
const _o=[0,0,0];
function setM(m,X,Y,Z,O){const e=m.elements;e[0]=X[0];e[1]=X[1];e[2]=X[2];e[3]=0;e[4]=Y[0];e[5]=Y[1];e[6]=Y[2];e[7]=0;e[8]=Z[0];e[9]=Z[1];e[10]=Z[2];e[11]=0;e[12]=O[0];e[13]=O[1];e[14]=O[2];e[15]=1;}
function frameY(Y,fref){let X=v3sub(fref,v3sc(Y,v3dot(fref,Y)));if(v3len(X)<1e-5){X=Math.abs(Y[1])<.9?[0,1,0]:[1,0,0];X=v3sub(X,v3sc(Y,v3dot(X,Y)));}X=v3n(X);return [X,Y,v3cross(X,Y)];}
/* two-bone IK in 3D: shoulder S to target T with lengths l1,l2; the elbow bends toward pole P */
function ik3(S,T,l1,l2,P){
  let d=v3sub(T,S),dist=v3len(d);const mx=(l1+l2)*.999,mn=Math.abs(l1-l2)+.01;
  const dh=dist>1e-6?v3sc(d,1/dist):[0,-1,0];dist=clamp(dist,mn,mx);
  const T2=v3add(S,v3sc(dh,dist)),a=(l1*l1-l2*l2+dist*dist)/(2*dist),r=Math.sqrt(Math.max(0,l1*l1-a*a));
  let pp=v3sub(P,S);pp=v3sub(pp,v3sc(dh,v3dot(pp,dh)));if(v3len(pp)<1e-5)pp=Math.abs(dh[0])<.9?[1,0,0]:[0,0,1],pp=v3sub(pp,v3sc(dh,v3dot(pp,dh)));pp=v3n(pp);
  return [v3add(v3add(S,v3sc(dh,a)),v3sc(pp,r)),T2];
}
/* J: a solved flat skeleton (local: +x forward, +y up). Writes the part matrices for a fighter standing at (x,y) facing `face`.
   extra.yaw spins the whole body about its hips (Magnus's Sky Breaker, turning round); extra.squint closes the eyes. */
function poseParts(def,x,y,face,J,mats,extra){
  const b=def.body,h=b.h,rs=h*b.bulk,info=fighterGeo(def),R=info.R;
  const W3=(p,z=0)=>[x+p[0]*face,y+p[1],z];
  const up=[J.dir[0]*face,J.dir[1],0],fw=[J.q[0]*face,J.q[1],0];
  const yawd=(f,phi)=>v3add(v3sc(f,Math.cos(phi)),[0,0,Math.sin(phi)]);
  /* torso */
  const fwT=yawd(fw,YAW_T),ZT=v3cross(fwT,up),camT=v3sc(ZT,ZT[2]>=0?1:-1);
  const waist=W3(J.waist);setM(mats[P_TORSO],fwT,up,ZT,waist);
  /* pelvis + hips */
  const fwP=yawd(fw,YAW_P),ZP=v3cross(fwP,up),camP=v3sc(ZP,ZP[2]>=0?1:-1);
  const Hc=W3(J.H);setM(mats[P_PELVIS],fwP,up,ZP,v3sub(Hc,v3sc(up,.03)));
  const hipW=b.rPelvis*rs*1.32*.55,hipF=v3add(Hc,v3sc(camP,hipW)),hipN=v3sub(Hc,v3sc(camP,hipW));
  /* shoulders */
  const N=W3(J.N),Sc=v3add(v3sub(N,v3sc(up,b.shDrop*h)),v3sc(fwT,(b.shN+b.shF)*.5*h)),sw=b.rChest*rs*1.32*.8;
  const shF=v3add(Sc,v3sc(camT,sw)),shN=v3sub(Sc,v3sc(camT,sw));
  /* head */
  const hu=[J.hu[0]*face,J.hu[1],0],hf=yawd([J.hfw[0]*face,J.hfw[1],0],YAW_H),ZH=v3cross(hf,hu),C=W3(J.C);
  setM(mats[P_HEAD],hf,hu,ZH,C);
  /* eyes on the face sphere, squinting when hurt */
  const sq=extra&&extra.squint?.22:1;
  for(const [pi,zs] of [[P_EYE0,-1],[P_EYE1,1]]){
    const lc=[R*.9,R*.06,zs*R*.3],o=v3add(C,v3add(v3add(v3sc(hf,lc[0]),v3sc(hu,lc[1])),v3sc(ZH,lc[2])));
    setM(mats[pi],hf,v3sc(hu,sq),ZH,o);}
  /* neck: from the neck base to just under the head */
  const nEnd=v3add(C,v3add(v3sc(hu,-.75*R),v3sc([J.hfw[0]*face,J.hfw[1],0],-.08*R)));
  {const Y=v3n(v3sub(nEnd,N)),[X,,Z]=frameY(Y,fwT);setM(mats[P_NECK],X,Y,Z,N);}
  /* arms */
  const arm=(S,haK,elK,pu,pf,ph)=>{
    const T2=J[haK],E2=J[elK],l1=b.uarm*h,l2=b.farm*h;
    const S2=[(S[0]-x)*face,S[1]-y],ext=clamp(Math.hypot(T2[0]-S2[0],T2[1]-S2[1])/(l1+l2),0,1);
    const tz=S[2]*lerp(.72,.12,EASE.smooth(clamp((ext-.55)/.45,0,1)));
    const [E,T]=ik3(S,W3(T2,tz),l1,l2,W3(E2,S[2]*1.6));
    let Y=v3n(v3sub(E,S)),F=frameY(Y,fwT);setM(mats[pu],F[0],Y,F[2],S);
    Y=v3n(v3sub(T,E));F=frameY(Y,fwT);setM(mats[pf],F[0],Y,F[2],E);setM(mats[ph],F[0],Y,F[2],T);
  };
  arm(shN,'haN','elN',P_UAN,P_FAN,P_HAN);arm(shF,'haF','elF',P_UAF,P_FAF,P_HAF);
  /* legs */
  const leg=(Hp,anK,knK,toK,pt,ps,pf)=>{
    const l1=b.thigh*h,l2=b.shin*h,az=Hp[2]*1.28;
    const [K,A]=ik3(Hp,W3(J[anK],az),l1,l2,W3(J[knK],Hp[2]*1.7));
    let Y=v3n(v3sub(K,Hp)),F=frameY(Y,fwP);setM(mats[pt],F[0],Y,F[2],Hp);
    Y=v3n(v3sub(A,K));F=frameY(Y,fwP);setM(mats[ps],F[0],Y,F[2],K);
    const toe=W3(J[toK],az);Y=v3n(v3sub(toe,A));F=frameY(Y,[0,1,0]);setM(mats[pf],F[0],Y,F[2],A);
  };
  leg(hipN,'anN','knN','toN',P_THN,P_SHN,P_FTN);leg(hipF,'anF','knF','toF',P_THF,P_SHF,P_FTF);
  /* whole-body spin about the hips; the cloth (drawn in world space through part P_ID) turns with it */
  mats[P_ID].identity();
  if(extra&&extra.yaw){
    const a=extra.yaw,c=Math.cos(a),s=Math.sin(a),px=Hc[0],pz=0;
    for(let i=0;i<=P_ID;i++){const e=mats[i].elements;
      for(const k of [0,4,8]){const vx=e[k],vz=e[k+2];e[k]=vx*c+vz*s;e[k+2]=-vx*s+vz*c;}
      const ox=e[12]-px,oz=e[14]-pz;e[12]=px+ox*c+oz*s;e[14]=pz-ox*s+oz*c;}
  }
  if(extra&&extra.z)for(let i=0;i<=P_ID;i++)mats[i].elements[14]+=extra.z;
}
/* cloth vertices for one actor (world space), from the engine's chains */
function poseCloth(A,actor){
  if(!A.cgeo||!actor.chains)return;
  const pos=A.cgeo.attributes.position.array,nor=A.cgeo.attributes.normal.array,h=actor.def.body.h;let k=0;
  const ring=[],rn=[];
  for(let ci=0;ci<A.spec.length;ci++){
    const s=A.spec[ci],ch=actor.chains[ci],n=s.o.n;
    if(!ch||!ch.p){k+=n*CLOTH_SIDES*6;continue;}
    const pts=ch.p,rings=[];
    for(let i=0;i<=n;i++){
      const p=pts[i],pa=pts[Math.max(0,i-1)],pb=pts[Math.min(n,i+1)];let tx=pb[0]-pa[0],ty=pb[1]-pa[1];const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
      const nx=-ty,ny=tx,w=lerp(s.o.w[0],s.o.w[1],i/n)*h,z=s.z+Math.sin(FRAMET*.05+i*.9+ci)*.012*i;
      const rr=[];for(let j=0;j<CLOTH_SIDES;j++){const a=j/CLOTH_SIDES*TAU,ca=Math.cos(a),sa=Math.sin(a);
        rr.push([p[0]+nx*ca*w,p[1]+ny*ca*w,z+sa*w*s.kz,nx*ca,ny*ca,sa]);}
      rings.push(rr);
    }
    for(let i=0;i<n;i++)for(let j=0;j<CLOTH_SIDES;j++){
      const j1=(j+1)%CLOTH_SIDES,a=rings[i][j],b=rings[i][j1],c=rings[i+1][j1],d=rings[i+1][j];
      for(const v of [a,b,d,b,c,d]){pos[k*3]=v[0];pos[k*3+1]=v[1];pos[k*3+2]=v[2];nor[k*3]=v[3];nor[k*3+1]=v[4];nor[k*3+2]=v[5];k++;}
    }
  }
  A.cgeo.attributes.position.needsUpdate=true;A.cgeo.attributes.normal.needsUpdate=true;
}
