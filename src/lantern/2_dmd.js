/* =====================================================================================
   5. THE PLASMA PANEL
      The nibbles go through what a real gas-plasma display does to them before they reach
      your eye: every cell lights at once but takes a few hundredths of a second to go out
      (so fast motion smears), and a heavily lit row bleeds a faint glow into the dark cells
      of the same row (the classic plasma ghosting). Then the GPU draws each cell as a round
      neon dot behind tinted glass, with bloom.
   ===================================================================================== */
const PLV=new Float32Array(N),PUP=new Uint8Array(N);
const LVL=new Float32Array(16);for(let l=0;l<16;l++)LVL[l]=l/15;
const PANEL={tau:.032,ghost:.055};
function panelStep(dt){
  const k=Math.exp(-dt/PANEL.tau);
  for(let y=0;y<H;y++){let sum=0;const r=y*W;
    for(let x=0;x<W;x++){const i=r+x,n=LVL[NB[i]],o=PLV[i]*k,v=n>o?n:o;PLV[i]=v;sum+=v;}
    const gh=sum/W*PANEL.ghost;
    for(let x=0;x<W;x++){const i=r+x,v=PLV[i]+gh*(1-PLV[i]);PUP[i]=v>=1?255:(v*255)|0;}}
}
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,powerPreference:'high-performance'});
const HDR=gl?!!gl.getExtension('EXT_color_buffer_float'):false;
function prog(vs,fs){
  const p=gl.createProgram();
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(t);gl.shaderSource(s,'#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n'+src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
const VS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
/* one neon cell per dot. The plasma glows orange near 585-610 nm; at full drive the core of a dot runs
   toward yellow-white. Off cells stay faintly visible through the glass. */
const FS_LED=`in vec2 vT;uniform sampler2D uDots;uniform vec2 uRes;uniform vec3 uTint;uniform vec3 uHot;uniform float uGain;uniform float uTime;uniform float uFlash;out vec4 o;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;
  float v=texture(uDots,vec2((id.x+.5)/uRes.x,1.-(id.y+.5)/uRes.y)).r;
  v=max(v,uFlash);
  /* drive -> light: plasma cells are close to linear in perceived brightness, so expand to linear */
  float L=pow(v,2.1);
  vec3 c=uTint*L+uHot*smoothstep(.62,1.,v)*L;
  float fw=max(fwidth(cell.x),fwidth(cell.y));float d=length(f);
  float r=.43;float dm=1.-smoothstep(r-fw*.7-.04,r+fw*.7,d);
  float core=1.-smoothstep(0.,r*.9,d);float far=smoothstep(.36,.95,fw);
  float m=mix(dm*(.66+.62*core),.62,far);
  /* the off cell and the glass: a dim brown disc, a faint sheen across the panel, a little dust */
  vec3 off=vec3(.042,.016,.006)*(1.-far*.4)*dm;
  float sheen=smoothstep(.9,0.,abs(vT.x*.7+vT.y-1.05))*.018;
  float dust=step(.9985,h21(id*1.37+3.1))*.03;
  o=vec4(c*uGain*m+off+vec3(sheen+dust)*vec3(1.,.85,.7),1.);
}`;
const FS_BRIGHT=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;out vec4 o;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;
c*=.25;float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.0)/max(l,1e-4);o=vec4(c,1.0);}`;
const FS_BLUR=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uDir;out vec4 o;
void main(){vec3 s=texture(uTex,vT).rgb*.227027;s+=(texture(uTex,vT+uDir*1.3846).rgb+texture(uTex,vT-uDir*1.3846).rgb)*.316216;
s+=(texture(uTex,vT+uDir*3.2308).rgb+texture(uTex,vT-uDir*3.2308).rgb)*.070270;o=vec4(s,1.0);}`;
const FS_COMP=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uB1;uniform sampler2D uB2;uniform float uBloom;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){vec3 c=texture(uScene,vT).rgb+(texture(uB1,vT).rgb*.55+texture(uB2,vT).rgb*.85)*uBloom;c=aces(c);c=pow(c,vec3(1.0/2.2));vec2 q=vT-.5;c*=1.0-dot(q,q)*.45;o=vec4(c,1.0);}`;
let P_LED,P_BR,P_BL,P_CO,VAO,GLERR=null;
const FB={},TX={};let VW=1,VH=1,DPR=1;
function texParams(nearest){const f=nearest?gl.NEAREST:gl.LINEAR;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
function mkTarget(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,HDR?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,HDR?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);texParams(false);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return {t,f,w,h};}
function freeTarget(T){if(!T)return;gl.deleteTexture(T.t);gl.deleteFramebuffer(T.f);}
/* the glass: classic amber, the deeper red-orange of the earliest panels, or a cold blue mod */
const GLASS=[{name:'AMBER',tint:[1,.36,.055],hot:[.55,.42,.2]},{name:'RED',tint:[1,.16,.035],hot:[.6,.26,.1]},{name:'ICE',tint:[.22,.52,1],hot:[.4,.55,.6]}];
let GI=clamp(parseInt(store.get('hd-lantern-glass','0'),10)||0,0,GLASS.length-1);
if(gl){
  try{P_LED=prog(VS,FS_LED);P_BR=prog(VS,FS_BRIGHT);P_BL=prog(VS,FS_BLUR);P_CO=prog(VS,FS_COMP);}catch(e){GLERR=String(e);console.error(e);}
  VAO=gl.createVertexArray();
  TX.dots=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX.dots);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,W,H,0,gl.RED,gl.UNSIGNED_BYTE,null);texParams(true);
}
function bindT(unit,t,loc){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc,unit);}
function draw(p,dst,setup){gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:VW,dst?dst.h:VH);gl.useProgram(p.p);if(setup)setup(p.u);gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);}
function pass(p,src,dst,setup){draw(p,dst,u=>{bindT(0,src.t,u.uTex);if(setup)setup(u);});}
let FLASH=0,PTIME=0;
function present(){
  if(!gl||!P_LED)return;
  gl.bindTexture(gl.TEXTURE_2D,TX.dots);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RED,gl.UNSIGNED_BYTE,PUP);
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.scene.f);gl.viewport(0,0,VW,VH);gl.clearColor(.012,.006,.004,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const rx=Math.round((RECT.x+(RECT.ox||0))*DPR),rw=Math.round(RECT.w*DPR),rh=Math.round(RECT.h*DPR),ry=VH-Math.round((RECT.y+(RECT.oy||0))*DPR)-rh;
  gl.viewport(rx,ry,rw,rh);gl.useProgram(P_LED.p);const G=GLASS[GI];
  bindT(0,TX.dots,P_LED.u.uDots);gl.uniform2f(P_LED.u.uRes,W,H);gl.uniform3fv(P_LED.u.uTint,G.tint);gl.uniform3fv(P_LED.u.uHot,G.hot);
  gl.uniform1f(P_LED.u.uGain,HDR?1.9:1.3);gl.uniform1f(P_LED.u.uTime,PTIME);gl.uniform1f(P_LED.u.uFlash,FLASH);
  gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
  pass(P_BR,FB.scene,FB.a,u=>{gl.uniform2f(u.uPx,1/VW,1/VH);gl.uniform1f(u.uThr,HDR?.9:.7);});
  pass(P_BL,FB.a,FB.b,u=>gl.uniform2f(u.uDir,1/FB.a.w,0));pass(P_BL,FB.b,FB.a,u=>gl.uniform2f(u.uDir,0,1/FB.a.h));
  pass(P_BR,FB.a,FB.c,u=>{gl.uniform2f(u.uPx,1/FB.a.w,1/FB.a.h);gl.uniform1f(u.uThr,0);});
  pass(P_BL,FB.c,FB.d,u=>gl.uniform2f(u.uDir,2.2/FB.c.w,0));pass(P_BL,FB.d,FB.c,u=>gl.uniform2f(u.uDir,0,2.2/FB.c.h));
  draw(P_CO,null,u=>{bindT(0,FB.scene.t,u.uScene);bindT(1,FB.a.t,u.uB1);bindT(2,FB.c.t,u.uB2);gl.uniform1f(u.uBloom,HDR?1:.6);});
  gl.activeTexture(gl.TEXTURE0);
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2.5);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));cv.width=VW;cv.height=VH;
  if(gl){for(const k of ['scene','a','b','c','d'])if(FB[k])freeTarget(FB[k]);
    FB.scene=mkTarget(VW,VH);FB.a=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));FB.b=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));
    FB.c=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));FB.d=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));}
  layout();
}
/* the panel is 2:1; it sits under the chrome bar, centred, as large as the window allows */
function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style,asp=W/H;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;$('turn').hidden=!portrait||EMBED;
  const gutL=EMBED?Math.max(0,sl):Math.max(16,sl),gutR=EMBED?Math.max(0,sr):Math.max(16,sr),top=EMBED?Math.max(0,st):Math.max(10,st)+46;
  if(portrait){const w=vw-gutL-gutR,h=w/asp;RECT={x:gutL,y:top+4,w,h};bs.setProperty('--stick',Math.min(156,vw*.36)+'px');bs.setProperty('--b',Math.min(64,vw*.16)+'px');bs.setProperty('--padTop',(RECT.y+h+26)+'px');$('turn').style.top=(RECT.y+h+8)+'px';}
  else{const bottom=EMBED?Math.max(0,sb):touchy?Math.max(8,sb)+4:Math.max(10,sb)+30,aw=vw-gutL-gutR,ah=vh-top-bottom;let w=aw,h=w/asp;if(h>ah){h=ah;w=h*asp;}RECT={x:gutL+(aw-w)/2,y:top+(ah-h)/2,w,h};
    if(touchy){bs.setProperty('--stick',Math.min(140,vh*.34)+'px');bs.setProperty('--b',Math.min(56,vh*.13)+'px');}}
}
