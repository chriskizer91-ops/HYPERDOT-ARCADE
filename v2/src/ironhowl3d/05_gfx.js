/* ===================== 3D engine: renderer, quality, layout, instanced machine parts, lights, camera, post =====================
   Every machine is still built from tapered capsules, balls and boxes, as in the original, but now they are real 3D parts.
   All parts of one kind share one instanced mesh, so the whole cast of machines costs a handful of draw calls. */
const T=THREE;
let W=384,H=216;                         /* the LED dot grid: the HUD, the menus and the optional DOTS filter all live on it */
let RECT={x:0,y:0,w:100,h:56},VW=2,VH=2,DPR=1;
let FRAME=0;
const HOLOX=new Int8Array(512);
function lin(v){return Math.pow(v/255,2.2);}
function linRGB(h){return hexRGB(h).map(lin);}

/* ---------- quality ---------- */
const QUAL={
  low: {n:'low', px:.6e6, shadow:0,   lights:2,msaa:0,rain:300, prt:700, seg:[8,2], dyn:.6, refl:0,  haze:0},
  med: {n:'med', px:1.15e6,shadow:1024,lights:4,msaa:0,rain:700, prt:1100,seg:[10,3],dyn:.7, refl:.3, haze:10},
  high:{n:'high',px:3.6e6,shadow:2048,lights:7,msaa:4,rain:1500,prt:1400,seg:[12,4],dyn:.75,refl:.5, haze:22}};
const QORDER=['low','med','high'];
const QPIN=(location.search.match(/[?&]q=(low|med|high)/)||[])[1]||null;
/* a level you pick yourself (the Quality button, or ?q=) stays put; otherwise it steps down on its own when the frame rate can't hold */
const QSAVED=store.get('q','');let QLOCK=!!(QPIN||QUAL[QSAVED]);
let QN=QPIN||(QUAL[QSAVED]?QSAVED:(touchy?'med':'high'));
let Q=QUAL[QN];
let DOTS=store.get('dots','0')==='1';
let VIEWM=store.get('view','0')==='1'?1:0;     /* 0 high three-quarter, 1 close */

/* ---------- renderer ---------- */
let renderer=null;
try{renderer=new T.WebGLRenderer({canvas:cv,antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance'});}catch(e){renderer=null;}
const OK3D=!!renderer;
const HALF=OK3D&&(renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float'));
if(OK3D){
  renderer.autoClear=true;renderer.toneMapping=T.NoToneMapping;renderer.outputColorSpace=T.LinearSRGBColorSpace;
  renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.enabled=Q.shadow>0;renderer.shadowMap.autoUpdate=false;
  renderer.info.autoReset=true;
}
const scene=new T.Scene();
const camera=new T.PerspectiveCamera(40,16/9,.5,260);
scene.add(camera);camera.layers.enable(1);
/* the mirror camera for wet-ground reflections: it sees layer 0 only (no ground, no decals, no water) */
const rcam=new T.PerspectiveCamera(40,16/9,.5,260);rcam.layers.set(0);
const REFL={on:false,mat:new T.Matrix4(),k:0,black:new T.DataTexture(new Uint8Array([0,0,0,255]),1,1)};REFL.black.needsUpdate=true;
const WETU=[];   /* the uniforms of every wet surface */
function hookWet(mat,k){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uRefl={value:REFL.black};sh.uniforms.uRM={value:REFL.mat};sh.uniforms.uRK={value:0};sh.uniforms.uRT={value:0};WETU.push(sh.uniforms);mat.userData.u=sh.uniforms;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 uRM;varying vec4 vRU;varying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\n{vec4 rw=modelMatrix*vec4(transformed,1.);vWP=rw.xyz;vRU=uRM*rw;}');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uRefl;uniform float uRK,uRT;varying vec4 vRU;varying vec3 vWP;')
      .replace('#include <opaque_fragment>',`{float wet=clamp((1.-roughnessFactor)*1.35-.08,0.,1.);if(uRK>0.&&wet>.02){
  vec2 j=vec2(sin(vWP.x*3.1+uRT*1.7)+sin(vWP.z*4.3-uRT*2.3),cos(vWP.z*2.7+uRT*1.3)+sin(vWP.x*5.1+uRT))*.0025*(1.2-wet);
  vec3 rc=texture(uRefl,vRU.xy/vRU.w+j).rgb;float fr=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.5);
  outgoingLight+=rc*wet*wet*(.28+.72*fr)*uRK;}}
#include <opaque_fragment>`);
  };
  mat.customProgramCacheKey=()=>'wet';
}

/* ---------- lights: sky fill, a key light with shadows, the mech's headlight and a pool of point lights for flashes ---------- */
const hemi=new T.HemisphereLight(0x8890c0,0x302820,1.1);scene.add(hemi);let HEMIK=.6;
const sun=new T.DirectionalLight(0xffc890,2.4);sun.castShadow=true;scene.add(sun);scene.add(sun.target);
function setShadowSize(n){if(!n)return;sun.shadow.mapSize.set(n,n);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}const c=sun.shadow.camera;c.left=-30;c.right=30;c.top=24;c.bottom=-24;c.near=1;c.far=120;c.updateProjectionMatrix();sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;}
setShadowSize(Q.shadow||1024);
const head=new T.SpotLight(0xffd8a0,0,18,.52,.55,1.2);scene.add(head);scene.add(head.target);
const POOL=[];for(let i=0;i<8;i++){const L=new T.PointLight(0xffffff,0,8,1.6);L.visible=i<Q.lights;scene.add(L);POOL.push(L);}
const LREQ=[];   /* light requests this frame: the brightest get a real light, the rest glow on the ground */
function light(x,y,z,rad,r,g,b){if(LREQ.length<400)LREQ.push({x,y,z:z||0,rad,r,g,b});}

/* ---------- layout ---------- */
let PORTRAIT=false;
function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style;PORTRAIT=portrait;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;$('turn').hidden=!portrait||EMBED;
  const top=EMBED?Math.max(0,st):Math.max(10,st)+42;
  if(portrait){
    const stick=Math.min(150,vw*.36),btn=Math.min(56,vw*.14),padH=stick+60+Math.max(16,sb);
    bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');
    const h=Math.max(vw*.75,Math.min(vh-top-padH-24,vw*1.45));RECT={x:0,y:top,w:vw,h:Math.round(h)};
    bs.setProperty('--padTop',(RECT.y+RECT.h+18)+'px');$('turn').style.top=(RECT.y+RECT.h+4)+'px';
  }else{
    const bottom=EMBED?0:touchy?0:Math.max(10,sb)+26;
    RECT={x:0,y:top,w:vw,h:Math.max(60,vh-top-bottom)};
    if(touchy){const stick=Math.min(140,vh*.34),btn=Math.min(50,vh*.12);bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');}
  }
  const a=RECT.w/RECT.h;
  if(a>=16/9){H=touchy?180:216;W=Math.round(H*a);}
  else if(a>=1){W=touchy?320:384;H=Math.round(W/a);}
  else{W=256;H=Math.round(W/a);}
  /* menus are laid out for 16:9 and drawn in the largest 16:9 box that fits */
  MH=Math.min(H,Math.round(W*9/16));MW=Math.min(W,Math.round(MH*16/9));MX=Math.round((W-MW)/2);MY=Math.round((H-MH)/2);
  Object.assign(cv.style,{left:RECT.x+'px',top:RECT.y+'px',width:RECT.w+'px',height:RECT.h+'px'});
}
let MW=384,MH=216,MX=0,MY=0;

/* ---------- render targets and post ---------- */
const RT={};let RS=1,DYN=1,RW=2,RH=2;
function mkRT(w,h,o={}){return new T.WebGLRenderTarget(Math.max(1,w|0),Math.max(1,h|0),Object.assign({type:HALF?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false,generateMipmaps:false},o));}
function sizeTargets(){
  if(!OK3D)return;
  for(const k in RT){RT[k].dispose();delete RT[k];}
  const px=VW*VH,base=Math.min(1,Math.sqrt(Q.px/px));RS=base*DYN;
  RW=Math.max(64,Math.round(VW*RS));RH=Math.max(36,Math.round(VH*RS));
  RT.scene=mkRT(RW,RH,{depthBuffer:true,samples:Q.msaa&&HALF?Q.msaa:0});
  RT.dots=mkRT(W,H,{depthBuffer:true,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
  if(Q.refl)RT.refl=mkRT(Math.round(RW*Q.refl),Math.round(RH*Q.refl),{depthBuffer:true});
  const bw=Math.max(8,VW>>2),bh=Math.max(8,VH>>2);
  RT.a=mkRT(bw,bh);RT.b=mkRT(bw,bh);RT.c=mkRT(Math.max(4,bw>>1),Math.max(4,bh>>1));RT.d=mkRT(Math.max(4,bw>>1),Math.max(4,bh>>1));
}
function resize(){
  layout();
  DPR=Math.min(window.devicePixelRatio||1,2);VW=Math.max(2,Math.round(RECT.w*DPR));VH=Math.max(2,Math.round(RECT.h*DPR));
  if(OK3D){renderer.setPixelRatio(1);renderer.setSize(VW,VH,false);}
  camera.aspect=RECT.w/RECT.h;camera.updateProjectionMatrix();
  HUD.resize();sizeTargets();
}
const PQ=new T.Scene(),PC=new T.OrthographicCamera(-1,1,1,-1,0,1);
const FSQ=new T.BufferGeometry();FSQ.setAttribute('position',new T.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
const FSM=new T.Mesh(FSQ);FSM.frustumCulled=false;PQ.add(FSM);
const VSQ=`in vec3 position;out vec2 vT;void main(){vT=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`;
function post(fs,uni){return new T.RawShaderMaterial({glslVersion:T.GLSL3,vertexShader:'precision highp float;\n'+VSQ,fragmentShader:'precision highp float;\nin vec2 vT;out vec4 o;\n'+fs,uniforms:uni,depthTest:false,depthWrite:false});}
const PM={
  bright:post(`uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;
c*=.25;float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.0)/max(l,1e-4);o=vec4(c,1.0);}`,{uTex:{value:null},uPx:{value:new T.Vector2()},uThr:{value:1}}),
  blur:post(`uniform sampler2D uTex;uniform vec2 uDir;
void main(){vec3 s=texture(uTex,vT).rgb*.227027;s+=(texture(uTex,vT+uDir*1.3846).rgb+texture(uTex,vT-uDir*1.3846).rgb)*.316216;
s+=(texture(uTex,vT+uDir*3.2308).rgb+texture(uTex,vT-uDir*3.2308).rgb)*.070270;o=vec4(s,1.0);}`,{uTex:{value:null},uDir:{value:new T.Vector2()}}),
  comp:post(`uniform sampler2D uScene;uniform sampler2D uB1;uniform sampler2D uB2;uniform sampler2D uHud;uniform float uBloom,uDots,uDim,uTime,uExp,uGrain,uHurt,uHudOn;uniform vec2 uGrid;uniform vec3 uTint;uniform vec3 uShad,uHigh;uniform float uSat,uCon,uCA;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float ledMask(vec2 cell,out float far){vec2 f=fract(cell)-.5;float fw=max(fwidth(cell.x),fwidth(cell.y));float d=length(f),r=.43;
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,d);float hot=1.0-smoothstep(0.0,r,d);far=smoothstep(.38,.95,fw);return mix(dm*(.74+.48*hot),.58,far);}
void main(){
  vec2 cell=vT*uGrid;ivec2 id=ivec2(clamp(floor(cell),vec2(0),uGrid-1.));float far;float m=ledMask(cell,far);
  vec3 c;
  if(uDots>.5){c=texelFetch(uScene,id,0).rgb*2.1*m+vec3(.52,.5,.62)*.012*m;}
  else{vec2 dq=(vT-.5)*uCA;c=vec3(texture(uScene,vT-dq).r,texture(uScene,vT).g,texture(uScene,vT+dq).b);}
  c+=(texture(uB1,vT).rgb*.8+texture(uB2,vT).rgb*1.2)*uBloom;
  c*=uExp*(1.0-uDim);
  c=aces(c*1.05);c=pow(c,vec3(1.0/2.2));
  {float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,uSat);c+=uShad*pow(1.-l,3.)+uHigh*l*l;c=mix(c,smoothstep(0.,1.,c),uCon);}
  vec2 q=vT-.5;c*=1.0-dot(q,q)*.55;
  c+=uHurt*vec3(.5,.03,.02)*smoothstep(.18,.5,length(q));
  c+=(h12(gl_FragCoord.xy+fract(uTime)*91.7)-.5)*uGrain;
  if(uHudOn>.5){
    vec4 h=texelFetch(uHud,ivec2(id.x,int(uGrid.y)-1-id.y),0);
    vec3 gl=vec3(0);
    for(int k=0;k<4;k++){ivec2 o2=ivec2(k==0?1:k==1?-1:0,k==2?1:k==3?-1:0);vec4 n=texelFetch(uHud,clamp(ivec2(id.x,int(uGrid.y)-1-id.y)+o2,ivec2(0),ivec2(uGrid)-1),0);gl+=n.rgb*n.a;}
    c=c*(1.0-h.a*.8)+h.rgb*h.a*m*1.22+gl*.05;
  }
  o=vec4(c,1.0);
}`,{uScene:{value:null},uB1:{value:null},uB2:{value:null},uHud:{value:null},uBloom:{value:1},uDots:{value:0},uDim:{value:0},uTime:{value:0},uExp:{value:1},uGrain:{value:.025},uHurt:{value:0},uHudOn:{value:1},uGrid:{value:new T.Vector2(384,216)},uTint:{value:new T.Vector3(1,1,1)},uShad:{value:new T.Vector3()},uHigh:{value:new T.Vector3()},uSat:{value:1.1},uCon:{value:.25},uCA:{value:.0025}})
};
function pass(mat,dst){FSM.material=mat;renderer.setRenderTarget(dst||null);renderer.render(PQ,PC);}
let WETK=1;
/* colour grading per arena: tinted shadows and highlights, saturation and a gentle S-curve */
const GRADE={set(dock){const u=PM.comp.uniforms;if(dock){u.uShad.value.set(-.01,.012,.05);u.uHigh.value.set(.03,-.005,.03);u.uSat.value=1.18;u.uCon.value=.3;WETK=1.6;}else{u.uShad.value.set(.0,.018,.04);u.uHigh.value.set(.06,.02,-.03);u.uSat.value=1.12;u.uCon.value=.3;WETK=.9;}}};
const POSTV={dim:0,hurt:0,exp:1};const STATS={calls:0,tri:0};
function present(){
  const base=DOTS?RT.dots:RT.scene;
  renderer.shadowMap.needsUpdate=true;
  const rOn=!!RT.refl&&!ROSTERON&&!DOTS;
  if(rOn){
    /* mirror the camera in the ground plane */
    rcam.fov=camera.fov;rcam.aspect=camera.aspect;rcam.near=camera.near;rcam.far=camera.far;rcam.updateProjectionMatrix();
    const p=camera.position;rcam.position.set(p.x,-p.y,p.z);camera.getWorldDirection(_v2);_v.set(p.x+_v2.x,-(p.y+_v2.y),p.z+_v2.z);
    const up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);rcam.up.set(up.x,-up.y,up.z);rcam.lookAt(_v);rcam.updateMatrixWorld();
    REFL.mat.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(rcam.projectionMatrix).multiply(rcam.matrixWorldInverse);
    renderer.setRenderTarget(RT.refl);renderer.render(scene,rcam);renderer.shadowMap.needsUpdate=false;
  }
  for(const u of WETU){u.uRefl.value=rOn?RT.refl.texture:REFL.black;u.uRK.value=rOn?WETK:0;u.uRT.value=G.t;}
  renderer.setRenderTarget(base);renderer.render(scene,camera);STATS.calls=renderer.info.render.calls;STATS.tri=renderer.info.render.triangles;
  const b=PM.bright.uniforms,bl=PM.blur.uniforms;
  b.uTex.value=base.texture;b.uPx.value.set(1/base.width,1/base.height);b.uThr.value=HALF?1.0:.8;pass(PM.bright,RT.a);
  bl.uTex.value=RT.a.texture;bl.uDir.value.set(1/RT.a.width,0);pass(PM.blur,RT.b);bl.uTex.value=RT.b.texture;bl.uDir.value.set(0,1/RT.a.height);pass(PM.blur,RT.a);
  b.uTex.value=RT.a.texture;b.uPx.value.set(1/RT.a.width,1/RT.a.height);b.uThr.value=0;pass(PM.bright,RT.c);
  bl.uTex.value=RT.c.texture;bl.uDir.value.set(2.2/RT.c.width,0);pass(PM.blur,RT.d);bl.uTex.value=RT.d.texture;bl.uDir.value.set(0,2.2/RT.c.height);pass(PM.blur,RT.c);
  const u=PM.comp.uniforms;u.uScene.value=base.texture;u.uB1.value=RT.a.texture;u.uB2.value=RT.c.texture;u.uHud.value=HUD.tex;
  u.uBloom.value=HALF?(DOTS?.9:.85):.5;u.uDots.value=DOTS?1:0;u.uDim.value=POSTV.dim;u.uTime.value=G.t;u.uHurt.value=POSTV.hurt;u.uExp.value=POSTV.exp;u.uGrid.value.set(W,H);
  pass(PM.comp,null);
}

/* ---------- instanced parts ---------- */
function capGeo(seg,rings){
  const pos=[],end=[],idx=[],lats=[];
  for(let i=0;i<=rings;i++)lats.push([-Math.PI/2+Math.PI/2*i/rings,0]);
  for(let i=0;i<=rings;i++)lats.push([Math.PI/2*i/rings,1]);
  for(const [a,e] of lats){const cy=Math.sin(a),cr=Math.cos(a);for(let j=0;j<seg;j++){const t=j/seg*TAU;pos.push(cr*Math.cos(t),cy,cr*Math.sin(t));end.push(e);}}
  for(let r=0;r<lats.length-1;r++)for(let j=0;j<seg;j++){const a=r*seg+j,b=r*seg+(j+1)%seg,c=(r+1)*seg+j,d=(r+1)*seg+(j+1)%seg;idx.push(a,c,b,b,c,d);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('aEnd',new T.Float32BufferAttribute(end,1));g.setIndex(idx);
  g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);return g;
}
const CAPV={head:'#include <common>\nattribute vec3 aM;attribute vec3 aRL;attribute float aEnd;varying vec3 vM;',
  nrm:'vec3 objectNormal=normalize(position+vec3(0.0,(aRL.x-aRL.y)/max(aRL.z,.001)*(1.0-abs(position.y)),0.0));\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(1.,0.,0.);\n#endif',
  pos:'vec3 transformed=position*mix(aRL.x,aRL.y,aEnd)+vec3(0.0,aEnd*aRL.z,0.0);'};
const RIMU={value:new T.Color(.4,.3,.2)};   /* a floodlight edge glow on every machine, coloured per arena */
function hookStd(mat,isCap){
  mat.onBeforeCompile=sh=>{
    let v=sh.vertexShader;
    v=v.replace('#include <common>',isCap?CAPV.head:'#include <common>\nattribute vec3 aM;varying vec3 vM;');
    if(isCap)v=v.replace('#include <beginnormal_vertex>',CAPV.nrm).replace('#include <begin_vertex>',CAPV.pos);
    v=v.replace('#include <color_vertex>','#include <color_vertex>\nvM=aM;');sh.vertexShader=v;
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vM;')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=vM.y;')
      .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=vM.z;')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vM.x;')
      .replace('#include <opaque_fragment>','{float rim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);outgoingLight+=uRim*rim*(.55+.45*diffuseColor.rgb);}\n#include <opaque_fragment>')
      .replace('varying vec3 vM;','varying vec3 vM;uniform vec3 uRim;');
    sh.uniforms.uRim=RIMU;
  };
  mat.customProgramCacheKey=()=>isCap?'cap':'inst';
}
function hookAdd(mat,isCap){
  mat.onBeforeCompile=sh=>{
    let v=sh.vertexShader;
    v=v.replace('#include <common>',isCap?CAPV.head:'#include <common>\nattribute vec3 aM;varying vec3 vM;');
    if(isCap)v=v.replace('#include <begin_vertex>',CAPV.pos);
    v=v.replace('#include <color_vertex>','#include <color_vertex>\nvM=aM;');sh.vertexShader=v;
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vM;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vM.x;');
  };
  mat.customProgramCacheKey=()=>isCap?'capA':'instA';
}
function hookDepth(mat){mat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>',CAPV.head).replace('#include <begin_vertex>',CAPV.pos);};mat.customProgramCacheKey=()=>'capD';}
class Prim{
  constructor(geo,mat,cap,o={}){
    this.cap=cap;this.n=0;this.isCap=!!o.isCap;
    const m=new T.InstancedMesh(geo,mat,cap);m.frustumCulled=false;m.count=0;m.castShadow=!!o.cast;m.receiveShadow=!!o.recv;m.renderOrder=o.order||2;
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh=m;this.M=m.instanceMatrix.array;
    this.C=new Float32Array(cap*3);m.instanceColor=new T.InstancedBufferAttribute(this.C,3);m.instanceColor.setUsage(T.DynamicDrawUsage);
    this.A=new Float32Array(cap*3);this.aA=new T.InstancedBufferAttribute(this.A,3);this.aA.setUsage(T.DynamicDrawUsage);geo.setAttribute('aM',this.aA);
    if(this.isCap){this.R=new Float32Array(cap*3);this.aR=new T.InstancedBufferAttribute(this.R,3);this.aR.setUsage(T.DynamicDrawUsage);geo.setAttribute('aRL',this.aR);}
    if(o.depth)m.customDepthMaterial=o.depth;
    scene.add(m);
  }
  begin(){this.n=0;}
  end(){const n=this.n,m=this.mesh;m.count=n;
    for(const [a,s] of [[m.instanceMatrix,16],[m.instanceColor,3],[this.aA,3],[this.aR,3]]){if(!a)continue;a.clearUpdateRanges();if(n){a.addUpdateRange(0,n*s);a.needsUpdate=true;}}}
}
let PR={};
function buildPrims(){
  for(const k in PR){scene.remove(PR[k].mesh);PR[k].mesh.geometry.dispose();}
  const [seg,rings]=Q.seg;
  const mStd=new T.MeshStandardMaterial({color:0xffffff,roughness:.5,metalness:.3,envMapIntensity:.9});hookStd(mStd,true);
  const mInst=new T.MeshStandardMaterial({color:0xffffff,roughness:.5,metalness:.3,envMapIntensity:.9});hookStd(mInst,false);
  const mDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});hookDepth(mDepth);
  const addM=isCap=>{const m=new T.MeshBasicMaterial({color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false});hookAdd(m,isCap);return m;};
  const boxG=new T.BoxGeometry(1,1,1);boxG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  const cylG=new T.CylinderGeometry(1,1,1,14,1);cylG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  PR={
    cap:new Prim(capGeo(seg,rings),mStd,3200,{isCap:true,cast:true,recv:true,depth:mDepth}),
    box:new Prim(boxG,mInst,2400,{cast:true,recv:true}),
    cyl:new Prim(cylG,mInst,500,{cast:true,recv:true}),
    capA:new Prim(capGeo(8,2),addM(true),1400,{isCap:true,order:5}),
    boxA:new Prim(boxG.clone(),addM(false),300,{order:5})
  };
  /* the x-ray silhouette: the player's own parts, drawn only where a prop stands in front of them */
  const xm=new T.MeshBasicMaterial({color:0xffa040,transparent:false,blending:T.AdditiveBlending,depthWrite:false,depthFunc:T.GreaterDepth,fog:false});
  hookAdd(xm,true);xm.customProgramCacheKey=()=>'xray';xm.onBeforeCompile=(f=>sh=>{f(sh);sh.fragmentShader=sh.fragmentShader.replace('diffuseColor.rgb*=vM.x;','diffuseColor.rgb=diffuse*(.32+.18*step(.5,fract((gl_FragCoord.x+gl_FragCoord.y)*.25)));');})(xm.onBeforeCompile);
  const xr=new T.InstancedMesh(PR.cap.mesh.geometry,xm,1);xr.layers.set(1);xr.instanceMatrix=PR.cap.mesh.instanceMatrix;xr.instanceColor=PR.cap.mesh.instanceColor;xr.frustumCulled=false;xr.count=0;xr.renderOrder=1;scene.add(xr);
  PR.xray={mesh:xr,begin(){},end(){}};
  const xmb=new T.MeshBasicMaterial({color:0xffa040,transparent:false,blending:T.AdditiveBlending,depthWrite:false,depthFunc:T.GreaterDepth,fog:false});hookAdd(xmb,false);xmb.customProgramCacheKey=()=>'xrayB';xmb.onBeforeCompile=(f=>sh=>{f(sh);sh.fragmentShader=sh.fragmentShader.replace('diffuseColor.rgb*=vM.x;','diffuseColor.rgb=diffuse*(.32+.18*step(.5,fract((gl_FragCoord.x+gl_FragCoord.y)*.25)));');})(xmb.onBeforeCompile);
  const xb=new T.InstancedMesh(PR.box.mesh.geometry,xmb,1);xb.layers.set(1);xb.instanceMatrix=PR.box.mesh.instanceMatrix;xb.instanceColor=PR.box.mesh.instanceColor;xb.frustumCulled=false;xb.count=0;xb.renderOrder=1;scene.add(xb);
  PR.xrayB={mesh:xb,begin(){},end(){}};
}
/* material descriptors: linear colour, emission, roughness, metalness */
function mkRamp(hex,o={}){return {c:linRGB(hex),emi:o.emi?(o.k||2.4):0,r:o.r??.55,m:o.m??.3,hex};}
let ZOFF=0;                      /* lifts every part (the roster page floats the machines in front of the camera) */
let MODE=0;                      /* 0 normal, 1 hit flash, 2 dash ghost, 3 materializing hologram */
let GHOST=[.35,.85,1],GALPHA=.5,FLASHK=1;
function setGhost(c,a){GHOST=[c[0]/255,c[1]/255,c[2]/255];GALPHA=a;}
const TMPC=[0,0,0];
/* where a part goes and what colour it gets, given the drawing mode */
function route(mt,add){
  if(MODE===2){TMPC[0]=GHOST[0];TMPC[1]=GHOST[1];TMPC[2]=GHOST[2];return GALPHA*.9;}
  if(MODE===3){const f=.5+.5*Math.sin(G.t*40+FRAME);TMPC[0]=.3;TMPC[1]=.9;TMPC[2]=1;return (.25+.35*f)*(FLASHK<1?.3:1);}
  return -1;
}
function writeCol(P,i,mt,a){
  const C=P.C,A=P.A,k=i*3;
  if(a>=0){C[k]=TMPC[0];C[k+1]=TMPC[1];C[k+2]=TMPC[2];A[k]=a;A[k+1]=0;A[k+2]=0;return;}
  if(MODE===1){const f=FLASHK;C[k]=lerp(mt.c[0],1,.6*f);C[k+1]=lerp(mt.c[1],.9,.6*f);C[k+2]=lerp(mt.c[2],.85,.6*f);A[k]=Math.max(mt.emi,.35*f);A[k+1]=mt.r;A[k+2]=0;return;}
  C[k]=mt.c[0];C[k+1]=mt.c[1];C[k+2]=mt.c[2];A[k]=mt.emi;A[k+1]=mt.r;A[k+2]=mt.m;
}
/* a tapered capsule between two world points */
function cap3(x0,y0,z0,x1,y1,z1,r0,r1,mt){
  const a=route(mt),P=a>=0?PR.capA:PR.cap;if(P.n>=P.cap)return;const i=P.n++;
  let dx=x1-x0,dy=z1-z0,dz=y1-y0;const L=Math.hypot(dx,dy,dz);
  if(L<1e-5){dx=0;dy=1;dz=0;}else{dx/=L;dy/=L;dz/=L;}
  let ax,ay,az;if(Math.abs(dy)<.92){ax=dz;ay=0;az=-dx;}else{ax=0;ay=-dz;az=dy;}
  const al=Math.hypot(ax,ay,az);ax/=al;ay/=al;az/=al;
  const bx=ay*dz-az*dy,by=az*dx-ax*dz,bz=ax*dy-ay*dx;
  const M=P.M,o=i*16;
  M[o]=ax;M[o+1]=ay;M[o+2]=az;M[o+3]=0;M[o+4]=dx;M[o+5]=dy;M[o+6]=dz;M[o+7]=0;M[o+8]=bx;M[o+9]=by;M[o+10]=bz;M[o+11]=0;M[o+12]=x0;M[o+13]=z0+ZOFF;M[o+14]=y0;M[o+15]=1;
  const R=P.R,k=i*3;R[k]=r0;R[k+1]=r1;R[k+2]=L;writeCol(P,i,mt,a);
}
function ball(x,y,z,r,mt){cap3(x,y,z,x,y,z,r,r,mt);}
/* an oriented box: centre (x,y,z), heading ang, f along the heading, s across it, h tall; pitch tilts the nose up */
function box3(x,y,z,ang,f,s,h,mt,pitch,roll){
  const a=route(mt),P=a>=0?PR.boxA:PR.box;if(P.n>=P.cap)return;const i=P.n++;
  const c=Math.cos(ang),sn=Math.sin(ang),M=P.M,o=i*16;
  if(!pitch&&!roll){
    M[o]=c*f;M[o+1]=0;M[o+2]=sn*f;M[o+3]=0;M[o+4]=0;M[o+5]=h;M[o+6]=0;M[o+7]=0;M[o+8]=-sn*s;M[o+9]=0;M[o+10]=c*s;M[o+11]=0;
  }else{
    const cp=Math.cos(pitch||0),sp=Math.sin(pitch||0),cr=Math.cos(roll||0),sr=Math.sin(roll||0);
    /* forward axis tilted up by pitch, side axis rolled */
    const fx=c*cp,fy=sp,fz=sn*cp;let sx=-sn*cr,sy=sr,sz=c*cr;
    let ux=fz*sy-fy*sz,uy=fx*sz-fz*sx,uz=fy*sx-fx*sy;if(uy<0){ux=-ux;uy=-uy;uz=-uz;}
    const ul=Math.hypot(ux,uy,uz)||1;ux/=ul;uy/=ul;uz/=ul;
    sx=fy*uz-fz*uy;sy=fz*ux-fx*uz;sz=fx*uy-fy*ux;
    M[o]=fx*f;M[o+1]=fy*f;M[o+2]=fz*f;M[o+3]=0;M[o+4]=ux*h;M[o+5]=uy*h;M[o+6]=uz*h;M[o+7]=0;M[o+8]=sx*s;M[o+9]=sy*s;M[o+10]=sz*s;M[o+11]=0;
  }
  M[o+12]=x;M[o+13]=z+ZOFF;M[o+14]=y;M[o+15]=1;writeCol(P,i,mt,a);
}
/* a box with a free rotation (quaternion in three.js axes), for tumbling debris */
function boxQ(x,y,z,qx,qy,qz,qw,sx,sy,sz,mt){
  const P=PR.box;if(P.n>=P.cap)return;const i=P.n++,M=P.M,o=i*16;
  const x2=qx+qx,y2=qy+qy,z2=qz+qz,xx=qx*x2,xy=qx*y2,xz=qx*z2,yy=qy*y2,yz=qy*z2,zz=qz*z2,wx=qw*x2,wy=qw*y2,wz=qw*z2;
  M[o]=(1-(yy+zz))*sx;M[o+1]=(xy+wz)*sx;M[o+2]=(xz-wy)*sx;M[o+3]=0;M[o+4]=(xy-wz)*sy;M[o+5]=(1-(xx+zz))*sy;M[o+6]=(yz+wx)*sy;M[o+7]=0;
  M[o+8]=(xz+wy)*sz;M[o+9]=(yz-wx)*sz;M[o+10]=(1-(xx+yy))*sz;M[o+11]=0;M[o+12]=x;M[o+13]=z;M[o+14]=y;M[o+15]=1;writeCol(P,i,mt,-1);
}
/* a flat-ended cylinder between two world points */
function cyl3(x0,y0,z0,x1,y1,z1,r,mt){
  if(MODE===2||MODE===3){cap3(x0,y0,z0,x1,y1,z1,r,r,mt);return;}
  const P=PR.cyl;if(P.n>=P.cap)return;const i=P.n++;
  let dx=x1-x0,dy=z1-z0,dz=y1-y0;const L=Math.hypot(dx,dy,dz)||1e-4;dx/=L;dy/=L;dz/=L;
  let ax,ay,az;if(Math.abs(dy)<.92){ax=dz;ay=0;az=-dx;}else{ax=0;ay=-dz;az=dy;}const al=Math.hypot(ax,ay,az);ax/=al;ay/=al;az/=al;
  const bx=ay*dz-az*dy,by=az*dx-ax*dz,bz=ax*dy-ay*dx,M=P.M,o=i*16;
  M[o]=ax*r;M[o+1]=ay*r;M[o+2]=az*r;M[o+3]=0;M[o+4]=dx*L;M[o+5]=dy*L;M[o+6]=dz*L;M[o+7]=0;M[o+8]=bx*r;M[o+9]=by*r;M[o+10]=bz*r;M[o+11]=0;
  M[o+12]=(x0+x1)/2;M[o+13]=(z0+z1)/2+ZOFF;M[o+14]=(y0+y1)/2;M[o+15]=1;writeCol(P,i,mt,-1);
}
/* additive glow capsule (beams, muzzle flashes, shields) regardless of mode */
function glow3(x0,y0,z0,x1,y1,z1,r0,r1,col,k){
  const P=PR.capA;if(P.n>=P.cap)return;const m=MODE;MODE=2;const g=GHOST,ga=GALPHA;GHOST=col;GALPHA=k/.9;cap3(x0,y0,z0,x1,y1,z1,r0,r1,null);GHOST=g;GALPHA=ga;MODE=m;
}
function glowBox(x,y,z,ang,f,s,h,col,k){const m=MODE;MODE=2;const g=GHOST,ga=GALPHA;GHOST=col;GALPHA=k/.9;box3(x,y,z,ang,f,s,h,null);GHOST=g;GALPHA=ga;MODE=m;}
function primsBegin(){for(const k in PR)PR[k].begin();}
function primsEnd(){for(const k in PR)PR[k].end();}

/* ---------- camera ---------- */
const CAM={x:WW/2,y:WH/2};
const CAMFX={kick:0,kv:0,rx:0,ry:0,rvx:0,rvy:0,roll:0,fov:0,sw:0,
  step(k){this.kv-=k*6;this.roll=(this.roll>0?-1:1)*k*.03;},
  recoil(ax,ay,k){this.rvx-=ax*k;this.rvy-=ay*k;},
  upd(dt){const s=60*dt;
    this.kv+=(-this.kick*120-this.kv*14)*dt;this.kick+=this.kv*dt;
    this.rvx+=(-this.rx*160-this.rvx*16)*dt;this.rvy+=(-this.ry*160-this.rvy*16)*dt;this.rx+=this.rvx*dt;this.ry+=this.rvy*dt;
    this.roll*=Math.pow(.9,s);this.fov*=Math.pow(.92,s);}
};
const SHK={t:0,ph:[Math.random()*9,Math.random()*9,Math.random()*9]};
const CV=[{pitch:56*D2R,dist:20,fov:40},{pitch:44*D2R,dist:14.5,fov:44}];
const _v=new T.Vector3(),_v2=new T.Vector3();
let CAMOV=null;   /* test hook: {x,y,pitch,dist,fov} */
let CAMYAW=0;const CINE={k:0,x:30,y:19};     /* the title and end screens slowly swing the camera round; play keeps north up */
function placeCamera(dt){
  const v=CAMOV||CV[VIEWM],a=RECT.w/RECT.h;
  let dist=v.dist;const hf=2*Math.atan(Math.tan(v.fov*D2R/2)*a),wantW=VIEWM?16:21,wNow=2*dist*Math.tan(hf/2);if(wNow<wantW&&!CAMOV)dist*=wantW/wNow;
  if(PORTRAIT)dist*=1.05;
  camera.fov=v.fov+CAMFX.fov;
  /* boss entrance: swing to the drop pod, hold on the landing, then hand back */
  let ck=0,bx=CAM.x,by=CAM.y;
  if(!CAMOV&&G.mode==='play'&&!G.demo){const bp=PODS.find(p=>p.big);if(bp){ck=clamp((bp.t-(bp.T-1.7))/.5,0,1);bx=bp.x;by=bp.y;}else if(G.boss&&G.boss.t<1.7){ck=1-clamp((G.boss.t-1.1)/.6,0,1);bx=G.boss.x;by=G.boss.y;}}
  CINE.k+=(ck-CINE.k)*Math.min(1,dt*(ck>CINE.k?3:2.5));if(ck>0){CINE.x=bx;CINE.y=by;}
  const cs=CINE.k*CINE.k*(3-2*CINE.k);
  let fx=CAMOV?CAMOV.x:lerp(CAM.x,CINE.x,cs),fy=CAMOV?CAMOV.y:lerp(CAM.y,CINE.y,cs);
  if(!CAMOV){if(G.mode==='title')fy+=2.2;fx=clamp(fx,IN0+5,INX-5);fy=clamp(fy,IN0+1.5,INY-1);}
  SHK.t+=dt;const sh=reduce?0:G.shake*G.shake*.55,t=SHK.t*38;
  const jx=(Math.sin(t+SHK.ph[0])+Math.sin(t*1.7+SHK.ph[1])*.5)*sh,jy=(Math.sin(t*1.3+SHK.ph[2])+Math.sin(t*2.3)*.5)*sh,jz=Math.sin(t*1.9+SHK.ph[1])*sh*.6;
  const kick=reduce?0:CAMFX.kick;
  const cx=fx+jx+CAMFX.rx,cz=fy+jy+CAMFX.ry;
  const show=!CAMOV&&(G.mode==='title'||G.mode==='over'||G.mode==='win');
  CAMYAW+=((show?Math.sin(G.t*.16)*.42:0)-CAMYAW)*Math.min(1,dt*(show?1.2:5));
  /* look at the boss from the open middle of the arena, so buildings don't get in the way */
  const cyw=Math.abs(CINE.x-WW/2)+Math.abs(CINE.y-WH/2)>3?clamp(angD(Math.atan2(WW/2-CINE.x,WH/2+6-CINE.y),0),-1.1,1.1):.4;
  const pitch=lerp(v.pitch,47*D2R,cs);dist=lerp(dist,19,cs);const yw=lerp(CAMYAW,cyw,cs);
  const hd=Math.cos(pitch)*dist;
  camera.position.set(cx+Math.sin(yw)*hd,Math.sin(pitch)*dist+1.4+jz+kick,cz+Math.cos(yw)*hd);
  _v.set(cx,1.2+kick*.4,cz);camera.lookAt(_v);
  camera.rotation.z+=reduce?0:CAMFX.roll+sh*.012*Math.sin(t*.7);
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  /* the key light and its shadow box follow the camera's focus */
  const S0=SUNDIR;sun.position.set(fx+S0[0]*40,S0[1]*40,fy+S0[2]*40);sun.target.position.set(fx,0,fy-2);sun.target.updateMatrixWorld();
}
let SUNDIR=[-.55,.62,.5];
/* world -> HUD dots; returns false when behind the camera */
const PJ=[0,0];
function w2h(x,y,z){_v.set(x,z||0,y).project(camera);PJ[0]=(_v.x*.5+.5)*W;PJ[1]=(1-(_v.y*.5+.5))*H;return _v.z<1;}
const PX=(x,y,z)=>{w2h(x,y,z);return PJ[0];};
/* screen (css px inside the view) -> world point on the horizontal plane at height zp */
const RAY=new T.Raycaster(),NDC=new T.Vector2(),PLN=new T.Plane(new T.Vector3(0,1,0),0);
function screenToWorld(cx,cy,zp){
  NDC.set(cx/RECT.w*2-1,-(cy/RECT.h*2-1));RAY.setFromCamera(NDC,camera);PLN.constant=-(zp||0);
  const hit=RAY.ray.intersectPlane(PLN,_v2);if(!hit)return [CAM.x,CAM.y];return [_v2.x,_v2.z];
}
