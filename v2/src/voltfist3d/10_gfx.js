/* ===================== 3D renderer: quality levels, render passes, the final cinematic composite =====================
   Each frame: (rooftop billboard feed) -> mirror view for wet floors -> the scene -> bloom -> light shafts -> anamorphic
   streaks -> depth of field -> one final pass that grades the picture, adds impact effects, and lays the HUD over it.
   W,H stay the original's 384x216 matrix: the fight engine sizes the biggest gap between fighters from W/H, so it must not
   follow the screen. The LED HUD has its own dot grid, OW x OH, whose width follows the shape of the screen. */
let W=384,H=216;
const OH=216;let OW=384;
const mc=document.createElement('canvas');mc.width=OW;mc.height=OH;
const g=mc.getContext('2d');g.imageSmoothingEnabled=false;
const cv=$('gl');
let RECT={x:0,y:0,w:100,h:56},DPR=1;

/* quality. scene / out: device-pixel ratio of the 3D picture and of the final pass. mirror: size of the wet-floor
   reflection view (0 = cheap fighter-only reflections). rays: light-shaft samples. dof: depth of field. */
const QS=[
  {id:'low', label:'LOW',   scene:1.0,out:1.6,samples:0,shadow:0,   lights:2,refl:0,ghosts:3,fx:.55,bloom:4,mirror:0,  rays:0, streak:0,dof:0},
  {id:'med', label:'MEDIUM',scene:1.35,out:2.2,samples:0,shadow:1024,lights:3,refl:1,ghosts:5,fx:.85,bloom:5,mirror:.36,rays:24,streak:1,dof:0},
  {id:'high',label:'HIGH',  scene:2.0,out:2.5,samples:4,shadow:2048,lights:4,refl:1,ghosts:8,fx:1,  bloom:5,mirror:.55,rays:48,streak:1,dof:1}];
const QURL=(location.search.match(/[?&]q=(low|med|high)/)||[])[1];
let QPICK=QURL||store.get('quality','auto');if(!['auto','low','med','high'].includes(QPICK))QPICK='auto';
let QI=QPICK==='auto'?(touchy?1:2):QS.findIndex(q=>q.id===QPICK);
const Q=()=>QS[QI];
let DOTS=store.get('dots','0')==='1';

let renderer=null;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance'});}catch(e){renderer=null;}
const GL_OK=!!(renderer&&renderer.capabilities&&renderer.capabilities.isWebGL2);
const HDR=GL_OK&&(renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float'));
if(GL_OK){renderer.info.autoReset=false;renderer.autoClear=true;renderer.shadowMap.enabled=Q().shadow>0;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.NoToneMapping;}

/* ---------- full-screen passes ---------- */
const FSV=`out vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const FSGEO=new THREE.BufferGeometry();
FSGEO.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
FSGEO.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
const FSQ=new THREE.Mesh(FSGEO,null);FSQ.frustumCulled=false;
const FSS=new THREE.Scene();FSS.add(FSQ);const FSC=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
function fsMat(fs,uni,defs){return new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:FSV,fragmentShader:fs,uniforms:uni,defines:defs||{},depthTest:false,depthWrite:false});}
function blit(mat,target){FSQ.material=mat;renderer.setRenderTarget(target);renderer.render(FSS,FSC);}

/* dual-filter bloom: a bright pass into 1/2 size, four more halvings, then back up, adding each level */
const M_DOWN=fsMat(`in vec2 vUv;uniform sampler2D tSrc;uniform vec2 uPx;uniform float uThr,uFirst;out vec4 o;
vec3 pre(vec3 c){if(uFirst<.5)return c;float l=max(c.r,max(c.g,c.b));return c*(max(l-uThr,0.)/max(l,1e-4));}
void main(){vec3 s=pre(texture(tSrc,vUv).rgb)*4.;s+=pre(texture(tSrc,vUv+uPx*vec2(-1.,-1.)).rgb)+pre(texture(tSrc,vUv+uPx*vec2(1.,-1.)).rgb)+pre(texture(tSrc,vUv+uPx*vec2(-1.,1.)).rgb)+pre(texture(tSrc,vUv+uPx*vec2(1.,1.)).rgb);
o=vec4(min(s/8.,vec3(40.)),1.);}`,{tSrc:{value:null},uPx:{value:new THREE.Vector2()},uThr:{value:1},uFirst:{value:1}});
const M_UP=fsMat(`in vec2 vUv;uniform sampler2D tSrc,tAdd;uniform vec2 uPx;out vec4 o;
void main(){vec3 s=texture(tSrc,vUv+uPx*vec2(-2.,0.)).rgb+texture(tSrc,vUv+uPx*vec2(2.,0.)).rgb+texture(tSrc,vUv+uPx*vec2(0.,-2.)).rgb+texture(tSrc,vUv+uPx*vec2(0.,2.)).rgb;
s+=(texture(tSrc,vUv+uPx*vec2(-1.,1.)).rgb+texture(tSrc,vUv+uPx*vec2(1.,1.)).rgb+texture(tSrc,vUv+uPx*vec2(-1.,-1.)).rgb+texture(tSrc,vUv+uPx*vec2(1.,-1.)).rgb)*2.;
o=vec4(s/12.+texture(tAdd,vUv).rgb,1.);}`,{tSrc:{value:null},tAdd:{value:null},uPx:{value:new THREE.Vector2()}});
/* light shafts: march from each pixel toward the light, gathering the bright parts of the picture */
const M_RAY=fsMat(`in vec2 vUv;uniform sampler2D tSrc;uniform vec2 uL;uniform float uDen,uDec,uW;out vec4 o;
void main(){vec2 uv=vUv,d=(uv-uL)*uDen/float(NS);float il=1.;vec3 s=vec3(0.);
for(int i=0;i<NS;i++){uv-=d;s+=texture(tSrc,uv).rgb*il*uW;il*=uDec;}o=vec4(s,1.);}`,{tSrc:{value:null},uL:{value:new THREE.Vector2(.5,.5)},uDen:{value:.9},uDec:{value:.96},uW:{value:.05}},{NS:48});
/* anamorphic streak: a wide horizontal smear of only the hottest pixels (neon, beams, sparks) */
const M_STREAK=fsMat(`in vec2 vUv;uniform sampler2D tSrc;uniform vec2 uPx;uniform float uStep,uThr;out vec4 o;
void main(){vec3 s=vec3(0.);float ws=0.;for(int i=-7;i<=7;i++){float w=exp(-abs(float(i))*.32);vec3 c=texture(tSrc,vUv+vec2(float(i)*uStep*uPx.x,0.)).rgb;
  if(uThr>0.){float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.)/max(l,1e-4);}s+=c*w;ws+=w;}o=vec4(s/ws,1.);}`,{tSrc:{value:null},uPx:{value:new THREE.Vector2()},uStep:{value:2},uThr:{value:0}});
/* depth of field: blur by distance from the focus plane; the blur amount rides in alpha */
const M_DOF=fsMat(`in vec2 vUv;uniform sampler2D tSrc,tDepth;uniform vec2 uPx;uniform float uFocus,uRange,uMax,uNear,uFar;out vec4 o;
float lin(float d){return uNear*uFar/(uFar-d*(uFar-uNear));}
float coc(vec2 uv){return clamp((abs(lin(texture(tDepth,uv).x)-uFocus)-.4)/uRange,0.,1.);}
const vec2 PD[12]=vec2[](vec2(-.326,-.406),vec2(-.840,-.074),vec2(-.696,.457),vec2(-.203,.621),vec2(.962,-.195),vec2(.473,-.480),vec2(.519,.767),vec2(.185,-.893),vec2(.507,.064),vec2(.896,.412),vec2(-.322,-.933),vec2(-.792,-.598));
void main(){float c0=coc(vUv);vec3 s=texture(tSrc,vUv).rgb;float ws=1.;
  for(int i=0;i<12;i++){vec2 uv=vUv+PD[i]*uMax*uPx*max(c0,.25);float c=coc(uv);float w=max(c,c0*.5);s+=texture(tSrc,uv).rgb*w;ws+=w;}
  o=vec4(s/ws,c0);}`,{tSrc:{value:null},tDepth:{value:null},uPx:{value:new THREE.Vector2()},uFocus:{value:6},uRange:{value:12},uMax:{value:4},uNear:{value:.1},uFar:{value:600}});

/* the last pass. Picture: impact ripples and colour fringing bend where it is sampled; then depth of field, bloom, shafts,
   streaks; exposure, filmic tone curve, the stage's colour grade, impact frames. Then the HUD: the LED-dot grid (or the
   whole picture as LEDs with the Dots filter). The modern HUD is page elements on top. */
const HUDTEX=new THREE.CanvasTexture(mc);HUDTEX.magFilter=THREE.LinearFilter;HUDTEX.minFilter=THREE.LinearMipmapLinearFilter;HUDTEX.generateMipmaps=true;HUDTEX.colorSpace=THREE.NoColorSpace;
const BLACK=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1);BLACK.needsUpdate=true;
const M_OUT=fsMat(`in vec2 vUv;uniform sampler2D tScene,tBloom,tHud,tRay,tStreak,tDof;uniform vec2 uGrid,uRes;
uniform float uDots,uBloomK,uExpo,uFlash,uHudK,uVig,uTint,uRayK,uStreakK,uDofOn,uCA,uImpact,uZoom,uTime,uGrain,uSat,uContrast,uLedHud;
uniform vec3 uTintC,uRayC,uLift,uGain,uGam,uStreakC;uniform vec4 uShock[3],uLens;uniform vec2 uZoomC;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h21(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  float asp=uRes.x/uRes.y;vec2 uv=vUv,cuv0=uv;
  /* impact shockwaves: a ring of refraction spreading from the hit */
  for(int i=0;i<3;i++){vec4 s=uShock[i];if(s.w<=0.)continue;vec2 d=uv-s.xy;d.x*=asp;float r=length(d),k=exp(-pow((r-s.z)*18.,2.))*s.w;uv-=normalize(d+1e-5)*vec2(1./asp,1.)*k*.035;}
  /* lensing: the plasma star bends the picture around it, and the air shimmers */
  if(uLens.w>0.){vec2 d=uv-uLens.xy;d.x*=asp;float r=length(d),g=exp(-r*r/(uLens.z*uLens.z));
    uv-=d*vec2(1./asp,1.)*g*uLens.w*.42;uv+=g*uLens.w*.0035*vec2(sin(vUv.y*90.+uTime*23.),cos(vUv.x*80.+uTime*19.));}
  /* super zoom: a radial smear toward the fighter */
  vec3 sc;vec2 ca=(uv-.5)*uCA*.012;
  if(uZoom>0.){vec3 acc=vec3(0.);for(int i=0;i<6;i++){float t=float(i)/6.;vec2 u2=mix(uv,uZoomC,t*uZoom*.08);acc+=texture(tScene,u2).rgb;}sc=acc/6.;}
  else sc=vec3(texture(tScene,uv+ca).r,texture(tScene,uv).g,texture(tScene,uv-ca).b);
  if(uDofOn>.5){vec4 d=texture(tDof,uv);sc=mix(sc,d.rgb,smoothstep(.0,.6,d.a));}
  vec2 cell=vUv*uGrid,id=floor(cell),f=fract(cell)-.5,cuv=(id+.5)/uGrid;
  float fw=uGrid.y/uRes.y,dd=length(f),rr=.43;
  float dm=1.-smoothstep(rr-fw*.7-.02,rr+fw*.7,dd),hot=1.-smoothstep(0.,rr,dd);
  vec3 add=texture(tBloom,uv).rgb*uBloomK+texture(tRay,uv).rgb*uRayK*uRayC+texture(tStreak,uv).rgb*uStreakK*uStreakC;
  if(uDots>.5){vec3 c=texture(tScene,cuv).rgb+texture(tBloom,cuv).rgb*uBloomK;sc=c*dm*(.78+.5*hot)*1.3+vec3(.006,.005,.009)*(1.-dm)+add*.25;}
  else sc+=add;
  sc=mix(sc,sc*uTintC,uTint);
  sc=aces(sc*uExpo);
  /* colour grade: lift / gamma / gain, saturation, contrast */
  sc=pow(max(sc*uGain+uLift*(1.-sc),0.),1./uGam);
  float lu=dot(sc,vec3(.2126,.7152,.0722));sc=mix(vec3(lu),sc,uSat);sc=clamp((sc-.5)*uContrast+.5,0.,1.);
  /* impact frame: a split-second two-tone flash on the biggest hits */
  if(uImpact>0.){float l2=dot(sc,vec3(.3,.59,.11));vec3 it=l2>.3?vec3(1.,.97,.92):vec3(.03,.02,.05);sc=mix(sc,it,uImpact);}
  /* LED HUD */
  if(uLedHud>.5){
    vec4 hd=texelFetch(tHud,ivec2(id),0);vec3 gl=textureLod(tHud,vUv,1.6).rgb;
    sc*=1.-hd.a*(.62-.25*dm);sc+=aces(pow(hd.rgb,vec3(2.2))*uHudK)*dm*(.76+.5*hot)*hd.a;sc+=pow(gl,vec3(2.2))*.32;}
  sc=mix(sc,vec3(1.),uFlash);
  vec2 q=vUv-.5;sc*=1.-dot(q,q)*uVig;
  vec3 outc=pow(max(sc,0.),vec3(1./2.2));outc+=(h21(vUv*uRes+fract(uTime)*91.7)-.5)*uGrain;
  o=vec4(outc,1.);
}`,{tScene:{value:null},tBloom:{value:null},tHud:{value:HUDTEX},tRay:{value:BLACK},tStreak:{value:BLACK},tDof:{value:BLACK},
  uGrid:{value:new THREE.Vector2(384,216)},uRes:{value:new THREE.Vector2(1,1)},uDots:{value:0},uBloomK:{value:.6},uExpo:{value:1.05},uFlash:{value:0},uHudK:{value:1.75},uVig:{value:.42},
  uTint:{value:0},uTintC:{value:new THREE.Color(1,1,1)},uRayK:{value:0},uRayC:{value:new THREE.Color(1,1,1)},uStreakK:{value:0},uStreakC:{value:new THREE.Color(.55,.7,1.2)},uDofOn:{value:0},
  uCA:{value:0},uImpact:{value:0},uZoom:{value:0},uZoomC:{value:new THREE.Vector2(.5,.5)},uTime:{value:0},uGrain:{value:.022},uSat:{value:1.1},uContrast:{value:1.04},uLedHud:{value:1},
  uLift:{value:new THREE.Vector3(0,0,0)},uGain:{value:new THREE.Vector3(1,1,1)},uGam:{value:new THREE.Vector3(1,1,1)},
  uShock:{value:[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()]},uLens:{value:new THREE.Vector4()}});

let RT=null,RTM=null,RTR=null,RTS1=null,RTS2=null,RTD=null;const BLD=[],BLU=[];let SW=2,SH=2;
function mkRT(w,h,o){return new THREE.WebGLRenderTarget(Math.max(2,w),Math.max(2,h),Object.assign({type:HDR?THREE.HalfFloatType:THREE.UnsignedByteType,format:THREE.RGBAFormat,depthBuffer:false,
  minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false,wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping},o||{}));}
function makeTargets(){
  if(!GL_OK)return;
  for(const t of [RT,RTM,RTR,RTS1,RTS2,RTD].concat(BLD,BLU))if(t)t.dispose();BLD.length=BLU.length=0;RTM=RTR=RTS1=RTS2=RTD=null;
  const q=Q(),sd=Math.min(DPR,q.scene);SW=Math.max(2,Math.round(RECT.w*sd));SH=Math.max(2,Math.round(RECT.h*sd));
  RT=mkRT(SW,SH,{depthBuffer:true,samples:q.samples});
  if(q.dof){RT.depthTexture=new THREE.DepthTexture(SW,SH);RT.depthTexture.type=THREE.UnsignedIntType;RTD=mkRT(SW>>1,SH>>1);}
  let w=SW,h=SH;for(let i=0;i<q.bloom;i++){w=Math.max(2,w>>1);h=Math.max(2,h>>1);BLD.push(mkRT(w,h));BLU.push(mkRT(w,h));}
  if(q.mirror)RTM=mkRT(Math.round(SW*q.mirror),Math.round(SH*q.mirror),{depthBuffer:true,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
  if(q.rays){RTR=mkRT(SW>>2,SH>>2);M_RAY.defines.NS=q.rays;M_RAY.needsUpdate=true;}
  if(q.streak){RTS1=mkRT(SW>>2,SH>>3);RTS2=mkRT(SW>>2,SH>>3);}
}
function bloomPass(thr){
  const n=BLD.length;let src=RT;
  for(let i=0;i<n;i++){M_DOWN.uniforms.tSrc.value=src.texture;M_DOWN.uniforms.uPx.value.set(1/src.width,1/src.height);M_DOWN.uniforms.uFirst.value=i===0?1:0;M_DOWN.uniforms.uThr.value=thr;blit(M_DOWN,BLD[i]);src=BLD[i];}
  let low=BLD[n-1];
  for(let i=n-2;i>=0;i--){M_UP.uniforms.tSrc.value=low.texture;M_UP.uniforms.tAdd.value=BLD[i].texture;M_UP.uniforms.uPx.value.set(.5/low.width,.5/low.height);blit(M_UP,BLU[i]);low=BLU[i];}
  return low;
}
function raysPass(lx,ly,den){if(!RTR)return null;const U=M_RAY.uniforms;U.tSrc.value=BLD[0].texture;U.uL.value.set(lx,ly);U.uDen.value=den;U.uDec.value=Q().rays>30?.965:.94;U.uW.value=Q().rays>30?.045:.07;blit(M_RAY,RTR);return RTR;}
function streakPass(){if(!RTS1)return null;const U=M_STREAK.uniforms;U.tSrc.value=BLD[1].texture;U.uPx.value.set(1/BLD[1].width,0);U.uStep.value=1.6;U.uThr.value=.35;blit(M_STREAK,RTS1);
  U.tSrc.value=RTS1.texture;U.uPx.value.set(1/RTS1.width,0);U.uStep.value=5;U.uThr.value=0;blit(M_STREAK,RTS2);return RTS2;}
function dofPass(focus,range,mx){if(!RTD)return null;const U=M_DOF.uniforms;U.tSrc.value=RT.texture;U.tDepth.value=RT.depthTexture;U.uPx.value.set(1/RTD.width,1/RTD.height);
  U.uFocus.value=focus;U.uRange.value=range;U.uMax.value=mx;U.uNear.value=CAM3.near;U.uFar.value=CAM3.far;blit(M_DOF,RTD);return RTD;}

/* ---------- layout: where the 3D view sits on the page ---------- */
const RESIZECB=[];
function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;$('turn').hidden=!portrait||EMBED;
  const gutL=EMBED?Math.max(0,sl):Math.max(16,sl),gutR=EMBED?Math.max(0,sr):Math.max(16,sr),top=EMBED?Math.max(0,st):Math.max(10,st)+46;
  if(portrait){
    const w=vw-gutL-gutR,h=w*9/16;RECT={x:gutL,y:top+4,w,h};
    const stick=Math.min(168,vw*.4),btn=Math.min(76,vw*.18);
    bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');bs.setProperty('--bg-gap',Math.round(btn*.16)+'px');
    bs.setProperty('--padTop',(RECT.y+h+28)+'px');$('turn').style.top=(RECT.y+h+8)+'px';
  }else{
    const bottom=EMBED?Math.max(0,sb):touchy?Math.max(8,sb)+4:Math.max(10,sb)+30,aw=vw-gutL-gutR,ah=vh-top-bottom;
    let w=aw,h=ah;if(w/h>2.4)w=h*2.4;if(w/h<4/3)h=w*3/4;
    RECT={x:gutL+(aw-w)/2,y:top+(ah-h)/2,w,h};
    if(touchy){const stick=Math.min(150,vh*.36),btn=Math.min(64,vh*.15);bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');bs.setProperty('--bg-gap',Math.round(btn*.14)+'px');}
  }
  RECT.w=Math.max(2,Math.round(RECT.w));RECT.h=Math.max(2,Math.round(RECT.h));RECT.x=Math.round(RECT.x);RECT.y=Math.round(RECT.y);
}
function resize(){
  DPR=Math.max(1,window.devicePixelRatio||1);layout();
  const s=cv.style;s.left=RECT.x+'px';s.top=RECT.y+'px';s.width=RECT.w+'px';s.height=RECT.h+'px';
  OW=Math.max(160,Math.round(OH*RECT.w/RECT.h));if(mc.width!==OW){mc.width=OW;mc.height=OH;g.imageSmoothingEnabled=false;HUDTEX.dispose();}
  if(!GL_OK)return;
  const od=Math.min(DPR,Q().out);renderer.setPixelRatio(1);renderer.setSize(Math.round(RECT.w*od),Math.round(RECT.h*od),false);
  M_OUT.uniforms.uGrid.value.set(OW,OH);M_OUT.uniforms.uRes.value.set(Math.round(RECT.w*od),Math.round(RECT.h*od));
  makeTargets();for(const f of RESIZECB)f();
}
function setQuality(i,why){
  if(i===QI)return;QI=clamp(i,0,2);
  if(GL_OK){const sh=Q().shadow>0;if(renderer.shadowMap.enabled!==sh){renderer.shadowMap.enabled=sh;SCENE.traverse(o=>{if(o.material){for(const m of [].concat(o.material))m.needsUpdate=true;}});}}
  resize();for(const f of QUALCB)f(why);
}
const QUALCB=[];
/* auto quality: if a fight can't hold about 45 frames a second for three seconds, step down one level (never back up on its own) */
const PERF={t:0,acc:0,n:0,slow:0};
function perfTick(dt,fighting){
  if(QPICK!=='auto'||!fighting||document.hidden)return;
  PERF.acc+=dt;PERF.n++;
  if(PERF.acc>=1){const avg=PERF.acc/PERF.n;PERF.acc=0;PERF.n=0;if(avg>1/45)PERF.slow++;else PERF.slow=Math.max(0,PERF.slow-1);if(PERF.slow>=3&&QI>0){PERF.slow=0;setQuality(QI-1,'auto');}}
}
function toggleDots(){DOTS=!DOTS;store.set('dots',DOTS?'1':'0');$('resv').textContent=DOTS?'Dots on':'Dots off';}
