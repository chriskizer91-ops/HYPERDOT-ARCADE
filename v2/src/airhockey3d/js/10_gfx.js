/* =====================================================================================
   10. RENDERER — three.js draws the table at full resolution into a half-float target.
       Then our own passes run: a mip-chain bloom, the HUD drawn as LED dots over the
       3D picture, an optional full-screen Dots filter, ACES tonemap, vignette and grain.
       (The house renderer from Strike Night 3D, with this game's quality levels.)
       Quality: 0 low, 1 medium, 2 high. Phones start on medium, laptops on high; if the
       frame rate cannot hold, it steps down by itself. ?q=low|med|high pins a level.
   ===================================================================================== */
const QP=[
  {name:'LOW', pr:1,   msaa:0,refl:0,  shadow:0,   bloom:4},
  {name:'MED', pr:1.5, msaa:4,refl:.42,shadow:1024,bloom:5},
  {name:'HIGH',pr:2,   msaa:4,refl:.6, shadow:2048,bloom:6}];
const QURL=(location.search.match(/[?&]q=(low|med|high)/)||[])[1];
let QPIN=QURL?{low:0,med:1,high:2}[QURL]:(()=>{const v=store.get('hd-'+CAB.id+'-q','auto');return v==='auto'?null:clamp(parseInt(v,10)||0,0,2);})();
const QSTART=touchy||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?1:2;
let QL=QPIN!=null?QPIN:QSTART;
let DOTS=store.get('hd-'+CAB.id+'-dots','0')==='1';

let R=null;
try{R=new THREE.WebGLRenderer({canvas:cv,antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false});}catch(e){R=null;}
const GL_OK=!!(R&&R.capabilities.isWebGL2);
/* half-float targets need EXT_color_buffer_float; without it everything falls back to 8-bit (no HDR, a lower bloom threshold) */
const HDR_OK=!!(R&&(R.extensions.has('EXT_color_buffer_float')||R.extensions.has('EXT_color_buffer_half_float')));
if(R){R.outputColorSpace=THREE.LinearSRGBColorSpace;R.toneMapping=THREE.NoToneMapping;R.autoClear=true;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.shadowMap.autoUpdate=true;R.info.autoReset=false;}

/* ---------- screen + HUD grid ---------- */
let VW=1,VH=1,DPR=1,W=256,H=144,RECT={x:0,y:0,w:100,h:100},PORTRAIT=false,PADT=0,PADB=0;
const hc=document.createElement('canvas'),g=hc.getContext('2d');
const HUDTEX=new THREE.CanvasTexture(hc);HUDTEX.minFilter=HUDTEX.magFilter=THREE.NearestFilter;HUDTEX.generateMipmaps=false;HUDTEX.colorSpace=THREE.NoColorSpace;HUDTEX.flipY=true;
const RESCB=[];
function hudGrid(){
  const vw=innerWidth,vh=innerHeight;PORTRAIT=vh>vw*1.05;
  W=clamp(Math.round(vw/(PORTRAIT?2.45:touchy?3.6:5)),168,320);H=Math.max(60,Math.round(W*vh/vw));
  hc.width=W;hc.height=H;g.imageSmoothingEnabled=false;RECT={x:0,y:0,w:vw,h:vh};
  const dot=vw/W,sa=parseFloat(getComputedStyle($('sa')).paddingTop)||0;
  PADT=Math.ceil(((!EMBED&&!touchy?48:0)+sa)/dot);          /* room for the top bar on a laptop, and a phone's notch */
  PADB=touchy||EMBED?Math.ceil(56/dot):0;                   /* the pause button's corner */
  for(const f of RESCB)f();
}

/* ---------- full-screen passes ---------- */
const FSC=new THREE.OrthographicCamera(-1,1,1,-1,0,1),FSS=new THREE.Scene();
const FSG=new THREE.BufferGeometry();FSG.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
const FSM=new THREE.Mesh(FSG,null);FSM.frustumCulled=false;FSS.add(FSM);
const VS_FS=`varying vec2 vU;void main(){vU=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`;
function fsMat(frag,uni){return new THREE.ShaderMaterial({vertexShader:VS_FS,fragmentShader:frag,uniforms:uni,depthTest:false,depthWrite:false,glslVersion:THREE.GLSL3});}
function runPass(mat,target){FSM.material=mat;R.setRenderTarget(target||null);R.render(FSS,FSC);}
const mkRT=(w,h,o)=>new THREE.WebGLRenderTarget(Math.max(1,w|0),Math.max(1,h|0),Object.assign({type:HDR_OK?THREE.HalfFloatType:THREE.UnsignedByteType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,generateMipmaps:false},o||{}));

/* the HUD as LED dots: one dot per HUD cell, lit by the HUD canvas; dark text outlines become dark dots */
const GLSL_HUD=`uniform sampler2D tHud;uniform vec2 uGrid;uniform float uHudGain;
vec4 hudCell(vec2 uv){vec2 id=floor(uv*uGrid);return texelFetch(tHud,ivec2(id),0);}
vec3 hudOver(vec3 c,vec2 uv,float fw){
  vec2 cell=uv*uGrid,id=floor(cell),f=fract(cell)-.5;vec4 h=texelFetch(tHud,ivec2(id),0);if(h.a<.004)return c;
  float d=length(f),r=.42,dm=1.-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.-smoothstep(0.,r,d);
  vec3 led=pow(h.rgb/max(h.a,.001),vec3(2.2))*uHudGain;
  float lum=max(led.r,max(led.g,led.b));
  c*=1.-.86*h.a;                                   /* the cell darkens behind a lit or a black dot */
  c+=led*dm*(.7+.55*hot)*h.a;
  c+=vec3(.52,.5,.62)*.012*dm*h.a*step(lum,.02);   /* unlit dot floor */
  return c;}`;
const UNI_HUD={tHud:{value:HUDTEX},uGrid:{value:new THREE.Vector2(W,H)},uHudGain:{value:2.6}};

/* bloom: bright pass into half res, then a 13-tap downsample chain and a tent upsample back up */
const M_BRIGHT=fsMat(`in vec2 vU;out vec4 o;uniform sampler2D tSrc;uniform vec2 uPx;uniform float uThr;${GLSL_HUD}
void main(){vec3 c=(texture(tSrc,vU+uPx*vec2(-.5,-.5)).rgb+texture(tSrc,vU+uPx*vec2(.5,-.5)).rgb+texture(tSrc,vU+uPx*vec2(-.5,.5)).rgb+texture(tSrc,vU+uPx*vec2(.5,.5)).rgb)*.25;
  c=hudOver(c,vU,.5);float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.)/max(l,1e-4);o=vec4(min(c,vec3(40.)),1.);}`,Object.assign({tSrc:{value:null},uPx:{value:new THREE.Vector2()},uThr:{value:1.1}},UNI_HUD));
const M_DOWN=fsMat(`in vec2 vU;out vec4 o;uniform sampler2D tSrc;uniform vec2 uPx;
void main(){vec2 p=uPx;vec3 a=texture(tSrc,vU+p*vec2(-2,-2)).rgb,b=texture(tSrc,vU+p*vec2(0,-2)).rgb,c=texture(tSrc,vU+p*vec2(2,-2)).rgb,
 d=texture(tSrc,vU+p*vec2(-2,0)).rgb,e=texture(tSrc,vU).rgb,f=texture(tSrc,vU+p*vec2(2,0)).rgb,g=texture(tSrc,vU+p*vec2(-2,2)).rgb,h=texture(tSrc,vU+p*vec2(0,2)).rgb,
 i=texture(tSrc,vU+p*vec2(2,2)).rgb,j=texture(tSrc,vU+p*vec2(-1,-1)).rgb,k=texture(tSrc,vU+p*vec2(1,-1)).rgb,l=texture(tSrc,vU+p*vec2(-1,1)).rgb,m=texture(tSrc,vU+p*vec2(1,1)).rgb;
 o=vec4(e*.125+(a+c+g+i)*.03125+(b+d+f+h)*.0625+(j+k+l+m)*.125,1.);}`,{tSrc:{value:null},uPx:{value:new THREE.Vector2()}});
const M_UP=fsMat(`in vec2 vU;out vec4 o;uniform sampler2D tSrc;uniform sampler2D tAdd;uniform vec2 uPx;uniform float uK;
void main(){vec2 p=uPx;vec3 s=texture(tSrc,vU).rgb*4.;s+=(texture(tSrc,vU+p*vec2(-1,0)).rgb+texture(tSrc,vU+p*vec2(1,0)).rgb+texture(tSrc,vU+p*vec2(0,-1)).rgb+texture(tSrc,vU+p*vec2(0,1)).rgb)*2.;
 s+=texture(tSrc,vU+p*vec2(-1,-1)).rgb+texture(tSrc,vU+p*vec2(1,-1)).rgb+texture(tSrc,vU+p*vec2(-1,1)).rgb+texture(tSrc,vU+p*vec2(1,1)).rgb;
 o=vec4(texture(tAdd,vU).rgb+s/16.*uK,1.);}`,{tSrc:{value:null},tAdd:{value:null},uPx:{value:new THREE.Vector2()},uK:{value:1}});
/* the Dots filter samples the picture once per dot from a small copy */
const M_SMALL=fsMat(`in vec2 vU;out vec4 o;uniform sampler2D tSrc;uniform vec2 uPx;
void main(){vec3 c=vec3(0.);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)c+=texture(tSrc,vU+uPx*vec2(x,y)*.33).rgb;o=vec4(c/9.,1.);}`,{tSrc:{value:null},uPx:{value:new THREE.Vector2()}});
const M_COMP=fsMat(`in vec2 vU;out vec4 o;uniform sampler2D tScene;uniform sampler2D tBloom;uniform sampler2D tSmall;uniform float uBloom;uniform float uDots;
uniform float uT;uniform float uFlash;uniform float uExpo;uniform vec2 uRes;${GLSL_HUD}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 uv=vU;vec3 c;float fw=max(fwidth(uv.x*uGrid.x),fwidth(uv.y*uGrid.y));
  if(uDots>.5){vec2 cell=uv*uGrid,id=floor(cell),f=fract(cell)-.5;vec3 s=texture(tSmall,(id+.5)/uGrid).rgb;
    float d=length(f),r=.43,dm=1.-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.-smoothstep(0.,r,d);c=s*dm*(.8+.55*hot)*1.15+vec3(.52,.5,.62)*.008*dm;}
  else{vec2 q=uv-.5;float ca=dot(q,q)*.0035;c=vec3(texture(tScene,uv-q*ca).r,texture(tScene,uv).g,texture(tScene,uv+q*ca).b);}
  c=hudOver(c,uv,fw);
  c+=texture(tBloom,uv).rgb*uBloom;
  c+=vec3(1.,.85,1.)*uFlash;
  c=aces(c*uExpo);c=pow(c,vec3(1./2.2));
  vec2 q=uv-.5;c*=1.-dot(q,q)*.55;
  c+=(h21(uv*uRes+fract(uT*7.3)*91.)-.5)*.022;
  o=vec4(c,1.);}`,Object.assign({tScene:{value:null},tBloom:{value:null},tSmall:{value:null},uBloom:{value:.9},uDots:{value:0},uT:{value:0},uFlash:{value:0},uExpo:{value:1.08},uRes:{value:new THREE.Vector2()}},UNI_HUD));

const RT={scene:null,small:null,bl:[]};
function makeTargets(){
  const q=QP[QL];
  if(RT.scene)RT.scene.dispose();if(RT.small)RT.small.dispose();for(const t of RT.bl)t.dispose();RT.bl=[];
  RT.scene=mkRT(VW,VH,{depthBuffer:true,samples:q.msaa});
  RT.small=mkRT(W,H);
  let w=VW>>1,h=VH>>1;for(let i=0;i<q.bloom&&w>2&&h>2;i++){RT.bl.push(mkRT(w,h));w>>=1;h>>=1;}
  RT.up=[];for(let i=0;i<RT.bl.length-1;i++)RT.up.push(mkRT(RT.bl[i].width,RT.bl[i].height));
}
function resize(){
  hudGrid();const q=QP[QL];
  DPR=Math.min(window.devicePixelRatio||1,q.pr);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));
  if(!R)return;R.setPixelRatio(DPR);R.setSize(innerWidth,innerHeight,false);
  makeTargets();UNI_HUD.uGrid.value.set(W,H);M_COMP.uniforms.uRes.value.set(VW,VH);
  if(typeof worldResize==='function')worldResize();
}
function setQuality(l){QL=clamp(l,0,2);resize();if(typeof worldQuality==='function')worldQuality();}

/* the post chain, after the scene is in RT.scene */
function post(){
  HUDTEX.needsUpdate=true;
  M_BRIGHT.uniforms.uThr.value=HDR_OK?1.1:.72;M_BRIGHT.uniforms.tSrc.value=RT.scene.texture;M_BRIGHT.uniforms.uPx.value.set(1/VW,1/VH);runPass(M_BRIGHT,RT.bl[0]);
  for(let i=1;i<RT.bl.length;i++){M_DOWN.uniforms.tSrc.value=RT.bl[i-1].texture;M_DOWN.uniforms.uPx.value.set(1/RT.bl[i-1].width,1/RT.bl[i-1].height);runPass(M_DOWN,RT.bl[i]);}
  let src=RT.bl[RT.bl.length-1];
  for(let i=RT.bl.length-2;i>=0;i--){M_UP.uniforms.tSrc.value=src.texture;M_UP.uniforms.tAdd.value=RT.bl[i].texture;M_UP.uniforms.uPx.value.set(1/src.width,1/src.height);M_UP.uniforms.uK.value=1;runPass(M_UP,RT.up[i]);src=RT.up[i];}
  if(DOTS){M_SMALL.uniforms.tSrc.value=RT.scene.texture;M_SMALL.uniforms.uPx.value.set(1/W,1/H);runPass(M_SMALL,RT.small);}
  const u=M_COMP.uniforms;u.tScene.value=RT.scene.texture;u.tBloom.value=src.texture;u.tSmall.value=RT.small.texture;u.uDots.value=DOTS?1:0;
  u.uBloom.value=(DOTS?.22:.16)*5/Math.max(3,RT.bl.length);u.uT.value=S.t;
  runPass(M_COMP,null);
}
