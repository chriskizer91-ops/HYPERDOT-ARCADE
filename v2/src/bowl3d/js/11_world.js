/* =====================================================================================
   11. THE ALLEY IN 3D — built in the physics' own coordinates inside one group (ALLEY) whose
       z is mirrored, so +x stays the bowler's right on screen while three.js looks down -z.
       x across the lane, y up, z down the lane: foul line z=0, head pin z=18.288.
       Seven lanes (ours in the middle), each 1.75 m wide: oiled boards that mirror the room,
       gutters, neon capping, kickbacks, the pin deck, the pit, masking units that are LED
       screens, blacklight tubes and roving cosmic spots with visible beams.
   ===================================================================================== */
const CELL=1.75,NLANE=3,MZ=17.86,MY0=.64,MY1=1.46,CEIL=3.0,CURT=20.15,KBZ=17.62,KBY=1.0;
const SCENE=new THREE.Scene(),ALLEY=new THREE.Group();ALLEY.scale.z=-1;SCENE.add(ALLEY);
SCENE.background=new THREE.Color(.006,.004,.012);
SCENE.fog=new THREE.Fog(new THREE.Color(.012,.007,.03),16,46);
const CAM3=new THREE.PerspectiveCamera(40,1,.05,80),PIP3=new THREE.PerspectiveCamera(30,1.6,.05,40),MIR3=new THREE.PerspectiveCamera(40,1,.05,80);
CAM3.layers.enable(1);PIP3.layers.enable(1);MIR3.layers.set(0);
const V3=(x,y,z)=>new THREE.Vector3(x,y,-z);                       /* physics -> world */
const C3=(r,g,b)=>new THREE.Color(r,g,b);

/* ---------- small geometry helpers ---------- */
/* extrude a 2D profile [[x,y],...] along z0..z1 (in segments) with smooth normals */
function ribbon(prof,z0,z1,segZ,xoff){
  const n=prof.length,pos=[],nor=[],uv=[],idx=[];segZ=segZ||1;xoff=xoff||0;
  const nrm=[];for(let i=0;i<n;i++){const a=prof[Math.max(0,i-1)],b=prof[Math.min(n-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;nrm.push([-ty/l,tx/l]);}
  for(let s=0;s<=segZ;s++){const z=z0+(z1-z0)*s/segZ;for(let i=0;i<n;i++){pos.push(prof[i][0]+xoff,prof[i][1],z);nor.push(nrm[i][0],nrm[i][1],0);uv.push(i/(n-1),s/segZ);}}
  for(let s=0;s<segZ;s++)for(let i=0;i<n-1;i++){const a=s*n+i,b=a+1,c=a+n,d=c+1;idx.push(a,c,b,b,c,d);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);return geo;
}
/* merge geometries with the same attributes (position, normal, uv) */
function merge(list){
  let nv=0,ni=0;for(const g of list){nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;}
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=new Float32Array(nv*2),I=new Uint32Array(ni);let ov=0,oi=0;
  for(const g of list){const c=g.attributes.position.count;P.set(g.attributes.position.array,ov*3);N.set(g.attributes.normal.array,ov*3);if(g.attributes.uv)U.set(g.attributes.uv.array,ov*2);
    if(g.index){const a=g.index.array;for(let k=0;k<a.length;k++)I[oi+k]=a[k]+ov;oi+=a.length;}else{for(let k=0;k<c;k++)I[oi+k]=k+ov;oi+=c;}ov+=c;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('uv',new THREE.BufferAttribute(U,2));geo.setIndex(new THREE.BufferAttribute(I,1));return geo;
}
function boxAt(x0,y0,z0,x1,y1,z1){const g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);return g;}
function planeY(x0,x1,z0,z1,y,sx,sz){const g=new THREE.PlaneGeometry(x1-x0,z1-z0,sx||1,sz||1);g.rotateX(-Math.PI/2);g.translate((x0+x1)/2,y,(z0+z1)/2);return g;}
function faceBowler(g){g.rotateY(Math.PI);const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setX(i,1-u.getX(i));return g;}   /* turned to face -z, texture kept readable */
function planeZ(x0,x1,y0,y1,z){const g=faceBowler(new THREE.PlaneGeometry(x1-x0,y1-y0));g.translate((x0+x1)/2,(y0+y1)/2,z);return g;}
const glowMat=(c,k)=>new THREE.MeshBasicMaterial({color:C3(c[0]*k,c[1]*k,c[2]*k),fog:true});
const addMesh=(geo,mat,o)=>{const m=new THREE.Mesh(geo,mat);if(o){if(o.layer!=null)m.layers.set(o.layer);if(o.cast)m.castShadow=true;if(o.recv)m.receiveShadow=true;if(o.order!=null)m.renderOrder=o.order;}ALLEY.add(m);return m;};

/* ---------- shader patching: our GLSL dropped into three's standard material ---------- */
const GLSL_NOISE=`
float h11(float n){return fract(sin(n*127.1+.7)*43758.5453);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n31(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+1.),f.x),f.y),f.z);}
vec3 hue(float h){return .5+.5*cos(6.2832*(h+vec3(0.,.33,.67)));}`;
function patch(mat,o){
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,o.uni||{});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vOP;varying vec3 vWP;varying vec3 vON;'+(o.vh||''))
      .replace('#include <project_vertex>','#include <project_vertex>\nvOP=transformed;vON=normal;\n#ifdef USE_INSTANCING\nvWP=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;\n#else\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;\n#endif\n'+(o.vm||''));
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vOP;varying vec3 vWP;varying vec3 vON;'+GLSL_NOISE+(o.fh||''));
    if(o.fa)sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+o.fa);
    if(o.fr)sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n'+o.fr);
    if(o.fe)sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+o.fe);
    if(o.fo)sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',o.fo+'\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey=()=>o.key;return mat;
}
/* shared, per-frame uniforms */
const U={uT:{value:0},uFx:{value:new THREE.Vector4(0,0,1,0)},uChase:{value:-9},tRefl:{value:null},uReflMat:{value:new THREE.Matrix4()},uReflOn:{value:0},
  uAim:{value:new THREE.Vector4(0,0,0,0)},uBallP:{value:new THREE.Vector4(0,0,0,0)},uBallA:{value:new THREE.Color()},uBallB:{value:new THREE.Color()},uSpots:{value:[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()]},
  uSpotC:{value:[new THREE.Color(),new THREE.Color(),new THREE.Color()]},uStrobe:{value:0}};
const GLSL_SPOTS=`uniform vec4 uSpots[3];uniform vec3 uSpotC[3];
vec3 spots(vec3 p){vec3 s=vec3(0.);for(int i=0;i<3;i++){vec2 d=p.xz-uSpots[i].xy;float dd=dot(d,d),r=uSpots[i].z;s+=uSpotC[i]*smoothstep(r*r,r*r*.05,dd)*uSpots[i].w;}return s;}`;

/* ---------- the lanes: boards, oil, deck and approach, all procedural (from the original's shader) ---------- */
const LOIL=12.2,HW=LN.hw,GXc=LN.gx,GYc=LN.gy,GRc=LN.gr,WALLc=LN.wall,DECKZ=LN.deck,PITZ=LN.pit;
const laneMat=patch(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.25,metalness:0,envMapIntensity:.15}),{key:'lane',
  uni:U,
  vh:'uniform mat4 uReflMat;varying vec4 vRefl;',vm:'vRefl=uReflMat*vec4(vWP,1.);',
  fh:`uniform float uT;uniform vec4 uFx;uniform float uChase;uniform sampler2D tRefl;uniform float uReflOn;uniform vec4 uAim;uniform vec4 uBallP;varying vec4 vRefl;${GLSL_SPOTS}
  float gloss=0.,rough=.3,bseed=0.;vec3 glowE=vec3(0.);
  vec3 laneGlow(vec3 p,float k){vec3 e=vec3(0.);float lx=p.x-k*${CELL.toFixed(2)},z=p.z;
    if(z>-.02&&z<.02)e+=vec3(1.,.15,.35)*2.2;
    if(z>3.6&&z<4.9){float j=clamp(floor(lx/.1351+.5),-3.,3.),tip=4.88-abs(j)*.3,dz=tip-z;
      if(dz>0.&&dz<.17)e+=vec3(.25,1.,.45)*2.*smoothstep(.003,-.002,abs(lx-j*.1351)-.0135*dz/.17);}
    if(z>2.1&&z<2.16){float b=(${HW.toFixed(3)}-abs(lx))/.02703+.5;float bb=b<4.?3.:b<6.5?5.:b<9.5?8.:b<12.5?11.:14.;
      e+=vec3(.2,.8,1.)*1.4*smoothstep(.013,.007,length(vec2(abs(lx)-(${HW.toFixed(3)}-(bb-.5)*.02703),z-2.13)));}
    if(z>10.36&&z<12.2)e+=vec3(.2,.7,1.)*.9*smoothstep(.006,.002,abs(abs(lx)-.27-(z-10.36)*.015));
    if(z<-.05&&z>-4.8){float zz=-z;for(int r=0;r<3;r++){float rz=r==0?.61:r==1?3.66:4.57;if(abs(zz-rz)<.03){float b=(${HW.toFixed(3)}-abs(lx))/.02703+.5;float bb=b<4.?3.:b<6.5?5.:b<9.5?8.:b<12.5?11.:14.;
      e+=vec3(.95,.4,1.)*1.1*smoothstep(.011,.006,length(vec2(abs(lx)-(${HW.toFixed(3)}-(bb-.5)*.02703),zz-rz)));}}}
    /* the chase: a band of light runs down the lane after the release */
    if(uChase>-1.&&z>0.&&z<${DECKZ.toFixed(2)})e+=vec3(.5,.25,1.)*.55*smoothstep(1.2,0.,abs(z-uChase))*smoothstep(.0,.06,${HW.toFixed(3)}-abs(lx));
    if(uAim.z>.5&&abs(k)<.1&&z>.3&&z<7.){float ax=uAim.x+tan(uAim.y)*(z-.35),s=(z-.35)/cos(uAim.y);
      float on=step(fract(s*2.2-uT*1.6),.55)*smoothstep(6.5,1.,s)*uAim.w;
      e+=vec3(.4,1.,.95)*2.4*on*smoothstep(.016,.006,abs(lx-ax));
      if(abs(z-4.6)<.05)e+=vec3(1.,.8,.3)*2.2*uAim.w*smoothstep(.04,.025,abs(lx-ax))*step(.012,abs(lx-ax));}
    return e;}`,
  fa:`{vec3 p=vOP;float k=floor(p.x/${CELL.toFixed(2)}+.5),lx=p.x-k*${CELL.toFixed(2)},z=p.z,bx=(lx+${HW.toFixed(3)})*(39./(2.*${HW.toFixed(3)})),bi=floor(bx),bf=fract(bx),hb=h11(bi+k*41.+7.);vec3 a;
    if(z<0.){a=mix(vec3(.42,.33,.24),vec3(.5,.41,.3),hb)*(.85+.15*n21(vec2(bi*7.,z*3.)))*.7;gloss=.3;rough=.3;}
    else if(z<${DECKZ.toFixed(2)}){float gr=n21(vec2(bi*13.+bf*3.,z*.8))*.6+n21(vec2(bi*5.,z*7.))*.4;
      a=mix(vec3(.46,.28,.15),vec3(.62,.4,.22),hb)*(.75+.32*gr)*.5;
      float dry=smoothstep(${LOIL}-1.2,${LOIL}+1.2,z+smoothstep(.2,.46,abs(lx))*2.2);a*=.86+.2*dry;gloss=mix(1.,.45,dry);rough=mix(.06,.3,dry);}
    else{vec2 q=vec2(lx,z-18.288);float r=floor(q.y/.26397+.5),c=floor((lx/.1524-r)*.5+.5)*2.+r,d=length(q-vec2(c*.1524,r*.26397));
      a=vec3(.2,.17,.22)*(.92+.08*hb)*(1.-.5*smoothstep(.006,0.,abs(d-.034))*step(r,3.5)*step(-.5,r)*step(abs(c),r+.5));gloss=.65;rough=.12;}
    a*=1.-.3*smoothstep(.07,0.,min(bf,1.-bf))*step(z,${DECKZ.toFixed(2)});
    bseed=hb;diffuseColor.rgb=a;glowE=laneGlow(p,k)+a*spots(p)*1.6*(1.+uFx.x*1.5);}`,
  fr:'roughnessFactor=rough;',
  fe:'totalEmissiveRadiance+=glowE;',
  fo:`if(uReflOn>.5){vec2 ruv=vRefl.xy/vRefl.w;ruv+=vec2((bseed-.5)*.006,(n21(vec2(vOP.z*.4,bseed*9.))-.5)*.004)*(1.+rough*6.);
    vec3 rc=texture(tRefl,ruv).rgb;if(rough>.15){rc=(rc+texture(tRefl,ruv+vec2(.004,.006)).rgb+texture(tRefl,ruv-vec2(.005,.004)).rgb)/3.;}
    float F=.04+.96*pow(1.-clamp(dot(normalize(vViewPosition),normal),0.,1.),5.);outgoingLight+=rc*F*gloss*.7;}`});
/* all seven lanes' floors in one mesh: approach, lane bed with the deck; plus capping strips */
{const L=[];for(let k=-NLANE;k<=NLANE;k++){const x=k*CELL;L.push(planeY(x-HW,x+HW,0,PITZ,0,1,24));L.push(planeY(x-CELL/2,x+CELL/2,-5.2,0,0,1,4));}
  const lanes=addMesh(merge(L),laneMat,{layer:1,recv:true});lanes.name='lanes';}

/* gutters: the concave channel, glossy dark plastic with a faint UV sheen; edge tubes in neon */
const gutMat=patch(new THREE.MeshStandardMaterial({color:C3(.04,.035,.08),roughness:.35,metalness:0,envMapIntensity:.25}),{key:'gut',uni:U,
  fh:`uniform vec4 uFx;${GLSL_SPOTS}`,fe:`totalEmissiveRadiance+=spots(vOP)*.04+vec3(.12,.04,.3)*.06;`});
const capMat=patch(new THREE.MeshStandardMaterial({color:C3(.04,.035,.07),roughness:.4,metalness:.1}),{key:'cap',uni:U,
  fh:`uniform float uT;uniform vec4 uFx;uniform float uChase;uniform float uStrobe;${GLSL_SPOTS}`,
  fe:`{float k=floor(vOP.x/${CELL.toFixed(2)}+.5),lx=vOP.x-k*${CELL.toFixed(2)};float side=sign(lx);vec3 tube=mod(k+(side>0.?1.:0.),2.)==0.?vec3(.2,.9,1.):vec3(1.,.2,.8);
    float d=abs(abs(lx)-${(WALLc+.03).toFixed(3)});float on=smoothstep(.012,.004,d)*step(vOP.z,${KBZ.toFixed(2)});
    float pulse=1.+.6*sin(vOP.z*.8-uT*3.)*.5+uStrobe*2.5+(uChase>-1.?2.*smoothstep(1.4,0.,abs(vOP.z-uChase))*step(abs(k),.1):0.);
    totalEmissiveRadiance+=tube*2.2*on*pulse+spots(vOP)*.08;}`});
{const G=[],C=[];const prof=[];for(let i=0;i<=14;i++){const ph=-44.1+88.7*i/14,r=ph*Math.PI/180;prof.push([GXc+GRc*Math.sin(r),GYc-GRc*Math.cos(r)]);}
  const profL=prof.map(([x,y])=>[-x,y]).reverse();
  for(let k=-NLANE;k<=NLANE;k++){const x=k*CELL;G.push(ribbon(prof,0,PITZ,8,x));G.push(ribbon(profL,0,PITZ,8,x));
    C.push(planeY(x+WALLc,x+CELL-WALLc,-5.2,KBZ,.001,1,8));}
  C.push(planeY(-NLANE*CELL-CELL/2-4,-NLANE*CELL-CELL/2+.113,-5.2,PITZ,.001));C.push(planeY(NLANE*CELL+CELL/2-.113,NLANE*CELL+CELL/2+4,-5.2,PITZ,.001));
  addMesh(merge(G),gutMat,{layer:1,recv:true});addMesh(merge(C),capMat,{layer:1});}

/* kickbacks (the side walls of each pin deck), the pit, the curtain, the wall over the masking units */
const kbMat=patch(new THREE.MeshStandardMaterial({color:C3(.05,.04,.08),roughness:.5,metalness:.1}),{key:'kb',uni:U,
  fh:`uniform vec4 uFx;uniform float uStrobe;`,
  fe:`{vec3 p=vOP;float k=floor(p.x/${CELL.toFixed(2)}),cx=(k+.5)*${CELL.toFixed(2)};vec3 col=mod(k,2.)==0.?vec3(1.,.15,.75):vec3(.15,.85,1.);float side=abs(vON.x),fr=step(.5,abs(vON.z)),tube=smoothstep(.014,.004,abs(p.y-.34))+smoothstep(.014,.004,abs(p.y-.78));
    float edge=fr*smoothstep(.016,.006,min(abs(abs(p.x-cx)-.1),abs(p.y-${(KBY-.012).toFixed(3)})));
    float diag=smoothstep(.012,.0,abs(fract((p.z-p.y*.9)*1.6)-.5)-.47)*step(.05,p.y)*step(p.y,.95);
    totalEmissiveRadiance+=col*(1.+uFx.x*1.5+uStrobe*3.)*(tube*side*1.4+edge*2.2+diag*side*.45)+col*side*.04;}`});
{const K=[];for(let k=-NLANE-1;k<=NLANE;k++){const cx=(k+.5)*CELL;K.push(boxAt(cx-.113,-.5,KBZ,cx+.113,KBY,CURT));}
  addMesh(merge(K),kbMat,{recv:true});}
const darkMat=new THREE.MeshStandardMaterial({color:C3(.02,.015,.03),roughness:.9});
addMesh(planeY(-8,8,PITZ,CURT,-.45),darkMat,{layer:1});
{const curtMat=patch(new THREE.MeshStandardMaterial({color:C3(.05,.04,.07),roughness:.95}),{key:'curt',uni:U,
  fa:`diffuseColor.rgb*=.6+.4*smoothstep(-.6,.6,sin(vOP.x*48.));`});
  addMesh(planeZ(-8,8,-.45,MY0+.02,CURT),curtMat,{recv:true});}
/* the wall above the masking units: dark, with a starfield and a ringed planet (from the original) */
const wallMat=patch(new THREE.MeshBasicMaterial({color:0x000000}),{key:'wall',uni:U,fh:`uniform float uT;`,
  fo:`{vec3 p=vOP;vec2 q=p.xy*5.;float s=h21(floor(q));vec2 pc=vec2(p.x-1.1,p.y-2.25);float r=length(pc);
    outgoingLight=vec3(.02,.01,.05)+hue(s)*step(.985,s)*smoothstep(.35,.1,length(fract(q)-.5))*1.6*(.7+.3*sin(uT*2.+s*40.))+vec3(.9,.3,.7)*.7*smoothstep(.42,.4,r)*(.4+.6*smoothstep(-.4,.4,pc.y+pc.x*.3))
      +vec3(.3,.9,1.)*1.4*smoothstep(.02,0.,abs(length(pc*vec2(1.,3.2))-.7))*step(.4,r);
    outgoingLight+=vec3(1.,.3,.8)*1.6*smoothstep(.02,.0,abs(p.y-${(MY1+.03).toFixed(2)}));}`});
addMesh(planeZ(-NLANE*CELL-CELL/2-4,NLANE*CELL+CELL/2+4,MY1,CEIL,MZ),wallMat);
/* the ceiling: open and black, with crosswise blacklight tubes; a neon line runs down over every capping */
const ceilMat=patch(new THREE.MeshBasicMaterial({color:0x000000}),{key:'ceil',uni:U,fh:`uniform float uT;`,
  fo:`{vec3 p=vOP;float k=floor(p.x/${CELL.toFixed(2)}+.5),lx=p.x-k*${CELL.toFixed(2)};vec3 tube=mod(k,2.)==0.?vec3(1.,.2,.8):vec3(.2,.9,1.);
    outgoingLight=vec3(.012,.01,.02)+tube*smoothstep(.02,.008,abs(abs(lx)-.875))*.6*(.7+.3*sin(p.z*.8-uT*3.))*step(-4.,p.z)*step(p.z,17.);}`});
{const g=planeY(-12,12,-8,MZ,CEIL);g.rotateX(0);const m=addMesh(g,ceilMat);m.material.side=THREE.DoubleSide;}
{const T=[];for(let i=0;i<6;i++){const z=1.5+i*3.4;T.push(boxAt(-12,CEIL-.08,z-.025,12,CEIL-.03,z+.025));}T.push(boxAt(-12,CEIL-.08,-2.4,12,CEIL-.03,-2.35));
  addMesh(merge(T),glowMat([.42,.22,1],1.3));}
/* the approach floor beyond the lanes and the settee carpet behind */
{const carp=patch(new THREE.MeshStandardMaterial({color:C3(.05,.03,.08),roughness:1}),{key:'carp',uni:U,fh:`uniform float uT;`,
  fe:`{vec2 q=vOP.xz*2.2;vec2 c=floor(q),f=fract(q)-.5;float s=h21(c);vec3 col=hue(s);float sh=s<.33?step(length(f),.18):s<.66?step(max(abs(f.x),abs(f.y)),.12):smoothstep(.04,0.,abs(length(f)-.22));
    totalEmissiveRadiance+=col*sh*.55*step(.55,h21(c+7.));}`});
  addMesh(planeY(-14,14,-12,-5.2,0),carp,{layer:1});}

/* ---------- pins: the original's revolved profile, turned into a lathe ---------- */
function sdUC(px,py,r1,r2,h){px=Math.abs(px);const b=(r1-r2)/h,a=Math.sqrt(1-b*b),k=-b*px+a*py;if(k<0)return Math.hypot(px,py)-r1;if(k>a*h)return Math.hypot(px,py-h)-r2;return a*px+b*py-r1;}
function smin(a,b,k){const h=clamp(.5+.5*(b-a)/k,0,1);return lerp(b,a,h)-k*h*(1-h);}
function pin2(x,y){let d=sdUC(x,y-.03,.04,.0605,.084);d=Math.min(d,sdUC(x,y-.114,.0605,.0215,.172));d=Math.min(d,Math.hypot(x,y-.166)-.0532);d=smin(d,Math.hypot(x,y-.3485)-.0322,.03);return Math.max(d,-y);}
const PIN_TOP=(()=>{let lo=.3,hi=.4;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(pin2(0,m)<0)lo=m;else hi=m;}return lo;})();
function pinRadius(y){if(pin2(0,y)>=0)return 0;let lo=0,hi=.08;for(let i=0;i<30;i++){const m=(lo+hi)/2;if(pin2(m,y)<0)lo=m;else hi=m;}return lo;}
function pinGeo(seg,N){const pts=[new THREE.Vector2(0,0)];
  for(let i=0;i<=N;i++){const yy=clamp(PIN_TOP*(1-Math.cos(Math.PI*i/N))/2,.0005,PIN_TOP-.0006);pts.push(new THREE.Vector2(pinRadius(yy),yy));}
  pts.push(new THREE.Vector2(0,PIN_TOP));
  const g=new THREE.LatheGeometry(pts,seg);g.translate(0,-PCOM,0);return g;}
const PIN_GEO=pinGeo(24,40),PIN_GEO_LO=pinGeo(12,22);
const pinMat=patch(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.18,metalness:0,envMapIntensity:.9}),{key:'pin',uni:U,
  fh:`uniform vec4 uFx;uniform float uStrobe;float stripe=0.;`,
  fa:`{float y=vOP.y+${PCOM};stripe=(step(.232,y)-step(.246,y))+(step(.254,y)-step(.268,y));diffuseColor.rgb=mix(vec3(.93,.93,.96),vec3(.95,.06,.25),stripe);}`,
  fe:`{float y=vOP.y+${PCOM};float fr=pow(1.-clamp(dot(normalize(vViewPosition),normal),0.,1.),2.5);
    totalEmissiveRadiance+=mix(vec3(.1,.12,.4),vec3(2.,.1,.6),stripe)*(.3+.5*fr)*(1.+uFx.y*.8+uStrobe*1.5)*(.55+.45*smoothstep(0.,.07,y));}`});
const PINS3=[];for(let i=0;i<10;i++){const m=addMesh(PIN_GEO,pinMat,{cast:true,recv:true});m.visible=false;PINS3.push(m);}
/* the neighbours' racks: one instanced mesh; a pin that is down is scaled away */
const NBPINS=new THREE.InstancedMesh(PIN_GEO_LO,pinMat,60);NBPINS.receiveShadow=false;ALLEY.add(NBPINS);
const NBL=[-3,-2,-1,1,2,3];
function nbSync(){const m=new THREE.Matrix4(),z=new THREE.Matrix4().makeScale(0,0,0);let n=0;
  for(let j=0;j<6;j++){const k=NBL[j],mask=j===0||j===5?1023:NBR[j-1];
    for(let i=0;i<10;i++){if(mask>>i&1){m.makeRotationY(i*1.7+k);m.setPosition(k*CELL+SPOTS[i][0],PCOM,SPOTS[i][1]);NBPINS.setMatrixAt(n,m);}else NBPINS.setMatrixAt(n,z);n++;}}
  NBPINS.instanceMatrix.needsUpdate=true;}

/* ---------- the ball: the original's swirl, in ball space, with three finger holes ---------- */
const ballMat=patch(new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.12,metalness:0,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.2}),{key:'ball',uni:U,
  fh:`uniform vec3 uBallA;uniform vec3 uBallB;float hole=0.;vec3 swirl=vec3(0.);`,
  fa:`{vec3 nl=normalize(vOP),q=nl*1.9;float w=n31(q*1.6+3.1),s=n31(q+w*2.2+vec3(0.,7.,0.)),s2=n31(q*2.4+w*1.5+11.);
    vec3 a=mix(vec3(.05,.02,.16),uBallA,smoothstep(.42,.6,s));a=mix(a,uBallB,smoothstep(.6,.74,s2));
    for(int i=0;i<3;i++){vec3 hd=normalize(i==0?vec3(0.,1.,.55):i==1?vec3(-.17,1.,-.32):vec3(.17,1.,-.32));hole=max(hole,smoothstep(.9935,.9965,dot(nl,hd)));}
    swirl=a*(.3+.25*(s+s2));diffuseColor.rgb=a*.75*(1.-hole*.95);}`,
  fr:`roughnessFactor=mix(roughnessFactor,.9,hole);`,
  fe:`totalEmissiveRadiance+=swirl*1.05*(1.-hole);`});
const BALL3=addMesh(new THREE.SphereGeometry(BR,48,32),ballMat,{cast:true});
/* the ball's own glow on the lane (its UV swirl lights the boards) and a soft contact shadow for the dark approach */
const BALLLIGHT=new THREE.PointLight(0xff66cc,0,1.6,2);ALLEY.add(BALLLIGHT);
const blobMat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.55,depthWrite:false,
  alphaMap:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'#fff');gr.addColorStop(1,'#000');x.fillStyle=gr;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t;})()});
const BLOB=addMesh(planeY(-.16,.16,-.16,.16,.002),blobMat,{order:2});BLOB.layers.set(1);

/* ---------- the pinsetter: sweep bar (orange chase lights) and the setting table ---------- */
const SWEEP=addMesh(boxAt(-.8,-.05,-.03,.8,.05,.03),patch(new THREE.MeshStandardMaterial({color:C3(.08,.07,.1),roughness:.4,metalness:.5}),{key:'sw2',uni:U,fh:`uniform float uT;`,
  fe:`totalEmissiveRadiance+=vec3(1.,.55,.1)*2.2*step(.5,fract(vOP.x*6.-uT*3.))*smoothstep(.02,.0,abs(vOP.y-.03));`}),{cast:true});
const TABLE=addMesh(boxAt(-.7,0,18.08,.7,.07,19.22),patch(new THREE.MeshStandardMaterial({color:C3(.1,.1,.13),roughness:.5,metalness:.6}),{key:'tb',uni:U,
  fe:`totalEmissiveRadiance+=vec3(.6,.7,1.)*1.2*step(.8,fract(vOP.x*8.))*step(vON.y,-.5);`}),{cast:true});

/* ---------- lights ---------- */
const HEMI=new THREE.HemisphereLight(C3(.32,.2,.75),C3(.03,.02,.06),.5);SCENE.add(HEMI);
const KEY3=new THREE.DirectionalLight(C3(.55,.5,1),.3);KEY3.position.set(.5,6,4);KEY3.target.position.set(0,0,-12);SCENE.add(KEY3,KEY3.target);
/* the hooded pin light behind the masking unit: the only light with shadows */
const PINL=new THREE.SpotLight(C3(.85,.9,1),4.2,7,1.0,.55,.85);PINL.position.copy(V3(0,.62,17.8));PINL.target.position.copy(V3(0,-.3,19.6));
PINL.castShadow=true;PINL.shadow.bias=-.0004;PINL.shadow.normalBias=.01;PINL.shadow.camera.near=.2;PINL.shadow.camera.far=4;SCENE.add(PINL,PINL.target);
const NBL3=[];for(const k of [-1,1]){const l=new THREE.SpotLight(C3(.75,.8,1),4,6,1.05,.6,.85);l.position.copy(V3(k*CELL*1.5,.6,17.7));l.target.position.copy(V3(k*CELL*1.5,-.3,19.6));SCENE.add(l,l.target);NBL3.push(l);}

/* ---------- environment for the glossy ball and pins: a little neon room baked into a PMREM ---------- */
function buildEnv(){
  const es=new THREE.Scene();es.background=new THREE.Color(.006,.004,.012);
  const add=(geo,c,k,x,y,z)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:C3(c[0]*k,c[1]*k,c[2]*k),side:THREE.DoubleSide}));m.position.set(x,y,z);es.add(m);};
  for(let i=-3;i<=3;i++)add(new THREE.BoxGeometry(16,.05,.08),[.62,.42,1],.9,0,3,i*3.4);        /* blacklight tubes overhead */
  for(const sx of [-1,1])for(let j=0;j<2;j++)add(new THREE.BoxGeometry(.05,.04,30),j?[1,.2,.8]:[.2,.9,1],.8,sx*(3+j*.6),.6+j*.4,0);  /* neon along the side walls */
  add(new THREE.PlaneGeometry(10,1.2),[.6,.25,.9],.35,0,1.1,-18);                                 /* the masking units' glow, down the lane */
  add(new THREE.PlaneGeometry(10,3),[.18,.08,.3],.12,0,1.5,12);                                   /* the room behind */
  const pm=new THREE.PMREMGenerator(R);const rt=pm.fromScene(es,.02);pm.dispose();return rt.texture;}

/* ---------- LED screens in the world: a canvas shown as round dots that fade to an average far away ---------- */
function ledMat(canvas,gain,o){o=o||{};const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.NoColorSpace;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.flipY=true;
  const mat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,fog:false,uniforms:{tLed:{value:tex},uGrid:{value:new THREE.Vector2(canvas.width,canvas.height)},uGain:{value:gain},uTint:{value:o.tint||new THREE.Color(1,1,1)},uStrobe:U.uStrobe},
    vertexShader:`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`in vec2 vU;out vec4 o;uniform sampler2D tLed;uniform vec2 uGrid;uniform float uGain;uniform vec3 uTint;uniform float uStrobe;
      void main(){vec2 cell=vU*uGrid,id=floor(cell),f=fract(cell)-.5;float fw=max(fwidth(cell.x),fwidth(cell.y));
        vec3 c=pow(texelFetch(tLed,ivec2(id),0).rgb,vec3(2.2))*uTint;vec3 avg=pow(texture(tLed,vU).rgb,vec3(2.2))*uTint;
        float d=length(f),r=.42,dm=1.-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.-smoothstep(0.,r,d),far=smoothstep(.35,.9,fw);
        vec3 col=mix(c*dm*(.72+.5*hot)+vec3(.5,.48,.62)*.01*dm,avg*.62,far)*uGain*(1.+uStrobe*.6);
        o=vec4(col,1.);}`});
  mat.userData.tex=tex;return mat;}
/* our masking unit: 192 x 82 dots across the lane above the pins */
const MKC=document.createElement('canvas');MKC.width=192;MKC.height=82;const mk=MKC.getContext('2d',{willReadFrequently:true});
const MK_MAT=ledMat(MKC,2.2);
{const g=faceBowler(new THREE.PlaneGeometry(CELL-.04,MY1-MY0));g.translate(0,(MY0+MY1)/2,MZ);addMesh(g,MK_MAT);}
/* the neighbours' masking units: their own number and a tinted planet */
{const N=[];for(let k=-NLANE;k<=NLANE;k++){if(!k)continue;const c=document.createElement('canvas');c.width=96;c.height=41;const x=c.getContext('2d'),r=mulberry(30+k),h=(k*.27+.6)%1;
  const col=[0,1,2].map(i=>Math.round(255*(.5+.5*Math.cos(TAU*(h+i*.33)))));x.fillStyle='#000';x.fillRect(0,0,96,41);
  for(let i=0;i<40;i++){x.fillStyle=`rgba(255,255,255,${.2+.6*r()})`;x.fillRect(r()*96|0,r()*41|0,1,1);}
  x.fillStyle=`rgb(${col})`;x.beginPath();x.arc(66,20,9,0,TAU);x.fill();x.strokeStyle='#ddd';x.lineWidth=1;x.beginPath();x.ellipse(66,20,17,4,-.3,0,TAU);x.stroke();
  txt5(x,String(7+k),8,13,`rgb(${col})`,2);
  const m=ledMat(c,1.5);const g=faceBowler(new THREE.PlaneGeometry(CELL-.04,MY1-MY0));g.translate(k*CELL,(MY0+MY1)/2,MZ);addMesh(g,m);}}
/* the overhead monitor hangs over the approach, tilted down toward the bowler: 160 x 50 dots */
const OVC=document.createElement('canvas');OVC.width=160;OVC.height=50;const ov=OVC.getContext('2d');
const OV_MAT=ledMat(OVC,2.0);
const OVG=new THREE.Group();ALLEY.add(OVG);OVG.position.set(0,1.7,4.2);OVG.rotation.x=-.06;
{const g=faceBowler(new THREE.PlaneGeometry(1.8,.5625));const scr=new THREE.Mesh(g,OV_MAT);OVG.add(scr);
  const fr=new THREE.Mesh(new THREE.BoxGeometry(1.92,.68,.08),new THREE.MeshStandardMaterial({color:C3(.03,.025,.05),roughness:.4,metalness:.6}));fr.position.z=.045;OVG.add(fr);
  const rim=new THREE.Mesh(new THREE.BoxGeometry(1.94,.02,.09),glowMat([1,.25,.8],2.4));rim.position.set(0,-.34,.04);OVG.add(rim);
  const rim2=rim.clone();rim2.position.y=.34;rim2.material=glowMat([.25,.9,1],2.2);OVG.add(rim2);
  for(const sx of [-.8,.8]){const rod=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.7),new THREE.MeshStandardMaterial({color:0x111111,metalness:.8,roughness:.3}));rod.position.set(sx,.7,.05);OVG.add(rod);}}

/* ---------- cosmic spots: three roving pools of colour on the lanes, with visible beams ---------- */
const BEAMMAT=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false,
  uniforms:{uC:{value:new THREE.Color()},uK:{value:1}},
  vertexShader:`varying float vY;varying vec3 vN;varying vec3 vV;void main(){vY=uv.y;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vY;varying vec3 vN;varying vec3 vV;uniform vec3 uC;uniform float uK;void main(){float e=pow(abs(dot(vN,vV)),1.6);gl_FragColor=vec4(uC*uK*e*(.2+.8*vY)*.32,1.);}`});
const BEAMS=[];for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.03,.36,1,24,1,true),BEAMMAT.clone());m.material.uniforms.uC.value=U.uSpotC.value[i];m.renderOrder=5;ALLEY.add(m);BEAMS.push(m);}
const hueC=(h,out)=>out.setRGB(.5+.5*Math.cos(TAU*h),.5+.5*Math.cos(TAU*(h+.33)),.5+.5*Math.cos(TAU*(h+.67)));
function spotsTick(t,fx){
  for(let i=0;i<3;i++){const s=U.uSpots.value[i],x=Math.sin(t*(.31+i*.17)+i*2.1)*(1.6+i*.9),z=5+i*4.5+Math.sin(t*(.23+i*.11)+i)*4;s.set(x,z,.42,(.35+fx*1.2));
    hueC(i*.33+t*.05,U.uSpotC.value[i]);
    const b=BEAMS[i],top=new THREE.Vector3(x*.4,CEIL-.1,z-2.2),bot=new THREE.Vector3(x,0,z),d=new THREE.Vector3().subVectors(top,bot),l=d.length();
    b.position.copy(bot).addScaledVector(d,.5);b.scale.set(1,l,1);b.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());b.material.uniforms.uK.value=.55+fx*1.4;}}

/* ---------- planar reflection of the oiled lane ---------- */
const MIRROR={rt:null,scale:0};
const _rp=new THREE.Plane(),_v=new THREE.Vector3(),_n=new THREE.Vector3(0,1,0),_rw=new THREE.Vector3(0,0,0),_cw=new THREE.Vector3(),_rot=new THREE.Matrix4(),_la=new THREE.Vector3(),
  _tg=new THREE.Vector3(),_q=new THREE.Vector4(),_cp=new THREE.Vector4();
function mirrorTargets(){const s=QP[QL].refl;if(MIRROR.rt){MIRROR.rt.dispose();MIRROR.rt=null;}MIRROR.scale=s;
  if(s>0)MIRROR.rt=new THREE.WebGLRenderTarget(Math.max(2,VW*s|0),Math.max(2,VH*s|0),{type:HDR_OK?THREE.HalfFloatType:THREE.UnsignedByteType,samples:0});
  U.tRefl.value=MIRROR.rt?MIRROR.rt.texture:null;U.uReflOn.value=MIRROR.rt?1:0;}
/* after three's Reflector (MIT): mirror the camera in y=0, clip everything under the floor with an oblique near plane */
function renderMirror(cam){
  if(!MIRROR.rt)return;cam.updateMatrixWorld();_cw.setFromMatrixPosition(cam.matrixWorld);
  _v.subVectors(_rw,_cw);if(_v.dot(_n)>0)return;_v.reflect(_n).negate();_v.add(_rw);
  _rot.extractRotation(cam.matrixWorld);_la.set(0,0,-1).applyMatrix4(_rot).add(_cw);_tg.subVectors(_rw,_la);_tg.reflect(_n).negate();_tg.add(_rw);
  MIR3.position.copy(_v);MIR3.up.set(0,1,0).applyMatrix4(_rot).reflect(_n);MIR3.lookAt(_tg);MIR3.far=cam.far;MIR3.updateMatrixWorld();MIR3.projectionMatrix.copy(cam.projectionMatrix);
  const tm=U.uReflMat.value;tm.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1);tm.multiply(MIR3.projectionMatrix);tm.multiply(MIR3.matrixWorldInverse);
  _rp.setFromNormalAndCoplanarPoint(_n,_rw);_rp.applyMatrix4(MIR3.matrixWorldInverse);_cp.set(_rp.normal.x,_rp.normal.y,_rp.normal.z,_rp.constant);
  const pm=MIR3.projectionMatrix;_q.x=(Math.sign(_cp.x)+pm.elements[8])/pm.elements[0];_q.y=(Math.sign(_cp.y)+pm.elements[9])/pm.elements[5];_q.z=-1;_q.w=(1+pm.elements[10])/pm.elements[14];
  _cp.multiplyScalar(2/_cp.dot(_q));pm.elements[2]=_cp.x;pm.elements[6]=_cp.y;pm.elements[10]=_cp.z+1-.003;pm.elements[14]=_cp.w;
  const fog=SCENE.fog;R.setRenderTarget(MIRROR.rt);R.clear();R.render(SCENE,MIR3);SCENE.fog=fog;}

function worldQuality(){const q=QP[QL];R.shadowMap.enabled=q.shadow>0;PINL.castShadow=q.shadow>0;
  if(q.shadow){PINL.shadow.mapSize.set(q.shadow,q.shadow);if(PINL.shadow.map){PINL.shadow.map.dispose();PINL.shadow.map=null;}}
  for(const l of NBL3)l.visible=QL>1;for(const b of BEAMS)b.visible=q.beams;mirrorTargets();
  for(const m of [laneMat,gutMat,pinMat,ballMat,capMat,kbMat])m.needsUpdate=true;}
function worldResize(){mirrorTargets();}
function worldInit(){if(!R)return;SCENE.environment=buildEnv();nbSync();worldQuality();}
