/* =====================================================================================
   GRAPHICS: the city is ray-marched per dot into a W x H HDR buffer, the HUD is drawn on a
   transparent 2D canvas, and the LED pass turns both into round glowing dots with bloom.
   ===================================================================================== */
const RES=[[256,144],[320,180],[384,216]];
let resI=parseInt(store.get('hd-prisma-res',touchy?'0':'1'),10);if(!(resI>=0&&resI<RES.length))resI=touchy?0:1;
let W=RES[resI][0],H=RES[resI][1];
const mc=document.createElement('canvas'),g=mc.getContext('2d',{willReadFrequently:true});
const RESCB=[];
function setRes(i){resI=i;W=RES[i][0];H=RES[i][1];mc.width=W;mc.height=H;g.imageSmoothingEnabled=false;store.set('hd-prisma-res',i);$('resv').textContent=W+'×'+H;if(gl)mkSceneTarget();for(const f of RESCB)f();}
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,powerPreference:'high-performance'});
const HDR=gl?!!gl.getExtension('EXT_color_buffer_float'):false;
const SCENE_K=HDR?1:.3;           /* without float targets, scenes are stored scaled down to keep highlights */
function prog(vs,fs){
  const p=gl.createProgram();
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(t);gl.shaderSource(s,'#version 300 es\nprecision highp float;\nprecision highp int;\n'+src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
const VS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const FS_SCENE=`/*@@SCENE@@*/`;
const FS_LED=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uHud;uniform vec2 uRes;uniform float uGain;uniform float uSK;uniform float uFlash;out vec4 o;
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;vec2 uv=(id+.5)/uRes;
  vec3 c=texture(uScene,uv).rgb/uSK;vec4 h=texture(uHud,uv);h.rgb=pow(h.rgb,vec3(2.2));
  c=c/(1.+c*.06);c=mix(c,h.rgb*1.5,h.a)+vec3(1.,.95,.9)*uFlash;
  float fw=max(fwidth(cell.x),fwidth(cell.y));float d=length(f),r=.44;
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.0-smoothstep(0.0,r,d),far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.72+.5*hot),.6,far);
  vec3 col=(c*uGain+vec3(.52,.5,.66)*.016)*m;
  o=vec4(col,1.0);
}`;
const FS_BRIGHT=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;out vec4 o;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;
c*=.25;float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.0)/max(l,1e-4);o=vec4(c,1.0);}`;
const FS_BLUR=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uDir;out vec4 o;
void main(){vec3 s=texture(uTex,vT).rgb*.227027;s+=(texture(uTex,vT+uDir*1.3846).rgb+texture(uTex,vT-uDir*1.3846).rgb)*.316216;
s+=(texture(uTex,vT+uDir*3.2308).rgb+texture(uTex,vT-uDir*3.2308).rgb)*.070270;o=vec4(s,1.0);}`;
const FS_COMP=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uB1;uniform sampler2D uB2;uniform float uBloom;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){vec3 c=texture(uScene,vT).rgb+(texture(uB1,vT).rgb*.55+texture(uB2,vT).rgb*.85)*uBloom;c=aces(c*1.0);c=pow(c,vec3(1.0/2.2));vec2 q=vT-.5;c*=1.0-dot(q,q)*.55;o=vec4(c,1.0);}`;
let P_SC,P_LED,P_BR,P_BL,P_CO,VAO,HTEX,GLERR=null;
const FB={};let VW=1,VH=1,DPR=1,RECT={x:0,y:0,w:100,h:56};
function tex(w,h,fl){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,fl&&HDR?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,fl&&HDR?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);return t;}
function texParams(nearest){const f=nearest?gl.NEAREST:gl.LINEAR;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
function mkTarget(w,h,nearest){const t=tex(w,h,true);texParams(nearest);const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return {t,f,w,h};}
function mkSceneTarget(){if(FB.s){gl.deleteTexture(FB.s.t);gl.deleteFramebuffer(FB.s.f);}FB.s=mkTarget(W,H,true);}
if(gl){
  try{P_SC=prog(VS,FS_SCENE);}catch(e){GLERR=String(e);console.error(e);}
  P_LED=prog(VS,FS_LED);P_BR=prog(VS,FS_BRIGHT);P_BL=prog(VS,FS_BLUR);P_CO=prog(VS,FS_COMP);
  VAO=gl.createVertexArray();HTEX=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,HTEX);texParams(true);
}
function pass(p,src,dst,setup){
  gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:VW,dst?dst.h:VH);
  gl.useProgram(p.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src.t);gl.uniform1i(p.u.uTex,0);
  if(setup)setup(p.u);gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);
}
/* uniforms for the scene shader are staged here by the game each frame */
const SU={};
function uni(u,name,v){const l=u[name];if(l==null)return;
  if(typeof v==='number'){if(name==='uStage'||name==='uNC')gl.uniform1i(l,v);else gl.uniform1f(l,v);}
  else if(v.length===2)gl.uniform2fv(l,v);else if(v.length===3)gl.uniform3fv(l,v);else if(v.length===9&&name==='uRot')gl.uniformMatrix3fv(l,false,v);else if(v.length%4===0)gl.uniform4fv(l,v);}
function renderScene(){
  if(!P_SC)return;
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.s.f);gl.viewport(0,0,W,H);gl.useProgram(P_SC.p);
  gl.uniform2f(P_SC.u.uRes,W,H);for(const k in SU)uni(P_SC.u,k,SU[k]);
  gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);
}
let FLASH=0;
function present(){
  if(!gl)return;
  renderScene();
  gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mc);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.scene.f);gl.viewport(0,0,VW,VH);gl.clearColor(.02,.012,.03,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const rx=Math.round(RECT.x*DPR),rw=Math.round(RECT.w*DPR),rh=Math.round(RECT.h*DPR),ry=VH-Math.round(RECT.y*DPR)-rh;
  gl.viewport(rx,ry,rw,rh);gl.useProgram(P_LED.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,FB.s.t);gl.uniform1i(P_LED.u.uScene,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.uniform1i(P_LED.u.uHud,1);
  gl.uniform2f(P_LED.u.uRes,W,H);gl.uniform1f(P_LED.u.uGain,HDR?1.5:1.1);gl.uniform1f(P_LED.u.uSK,SCENE_K);gl.uniform1f(P_LED.u.uFlash,FLASH);
  gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
  pass(P_BR,FB.scene,FB.a,u=>{gl.uniform2f(u.uPx,1/VW,1/VH);gl.uniform1f(u.uThr,HDR?1.15:.8);});
  pass(P_BL,FB.a,FB.b,u=>gl.uniform2f(u.uDir,1/FB.a.w,0));pass(P_BL,FB.b,FB.a,u=>gl.uniform2f(u.uDir,0,1/FB.a.h));
  pass(P_BR,FB.a,FB.c,u=>{gl.uniform2f(u.uPx,1/FB.a.w,1/FB.a.h);gl.uniform1f(u.uThr,0);});
  pass(P_BL,FB.c,FB.d,u=>gl.uniform2f(u.uDir,2.2/FB.c.w,0));pass(P_BL,FB.d,FB.c,u=>gl.uniform2f(u.uDir,0,2.2/FB.c.h));
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,VW,VH);gl.useProgram(P_CO.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,FB.scene.t);gl.uniform1i(P_CO.u.uScene,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,FB.a.t);gl.uniform1i(P_CO.u.uB1,1);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,FB.c.t);gl.uniform1i(P_CO.u.uB2,2);
  gl.uniform1f(P_CO.u.uBloom,HDR?1:.6);gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2.5);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));cv.width=VW;cv.height=VH;
  if(gl){for(const k of ['scene','a','b','c','d'])if(FB[k]){gl.deleteTexture(FB[k].t);gl.deleteFramebuffer(FB[k].f);}
    FB.scene=mkTarget(VW,VH);FB.a=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));FB.b=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));
    FB.c=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));FB.d=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));}
  layout();
}
function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style,asp=16/9;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;$('turn').hidden=!portrait||EMBED;
  const gutL=EMBED?Math.max(0,sl):Math.max(16,sl),gutR=EMBED?Math.max(0,sr):Math.max(16,sr),top=EMBED?Math.max(0,st):Math.max(10,st)+46;
  if(portrait){const w=vw-gutL-gutR,h=w/asp;RECT={x:gutL,y:top+4,w,h};bs.setProperty('--stick',Math.min(156,vw*.36)+'px');bs.setProperty('--b',Math.min(64,vw*.16)+'px');bs.setProperty('--padTop',(RECT.y+h+26)+'px');$('turn').style.top=(RECT.y+h+8)+'px';}
  else{const bottom=EMBED?Math.max(0,sb):touchy?Math.max(8,sb)+4:Math.max(10,sb)+30,aw=vw-gutL-gutR,ah=vh-top-bottom;let w=aw,h=w/asp;if(h>ah){h=ah;w=h*asp;}RECT={x:gutL+(aw-w)/2,y:top+(ah-h)/2,w,h};
    if(touchy){bs.setProperty('--stick',Math.min(140,vh*.34)+'px');bs.setProperty('--b',Math.min(56,vh*.13)+'px');}}
}
