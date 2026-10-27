/* =====================================================================================
   GRAPHICS — the matrix is the simulation: one LED per cell, 320 x 180.
     upload   cell state (material, temperature, grain, extra) + sprite layer   (RGBA8)
     MAT      per-cell emission (blackbody of the cell's temperature) + opacity
     JFA      jump-flood distance field to the nearest opaque cell
     RC 4..0  radiance cascades: probes trace short intervals through the distance field
              and merge with the coarser cascade above (2D global illumination)
     LIGHT    cascade 0 integrated to fluence per probe (+ dominant light direction)
     FINAL    materials shaded by that light, steam density, temper colours, heat haze
     LED      round dots + HUD, then the house bloom and ACES tonemap
   ===================================================================================== */
const W=320,H=180,N=W*H;
const mc=document.createElement('canvas');mc.width=W;mc.height=H;const g=mc.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
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
/* material ids shared by every shader (kept in sync with the simulation's table) */
const GLSL_MATS=`const int AIR=0,ROCK=1,BED=2,RAIL=3,IRON=4,SLAG=5,LAVA=6,WATER=7,STEAM=8,SMOKE=9,ICE=10,SNOW=11,RUBBLE=12,EMBER=13,CRYST=14,HOUSE=15;
uniform sampler2D uBB;
vec3 bb(float T){return texture(uBB,vec2(clamp((T+40.)/2080.,0.,1.),.5)).rgb;}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
void cellOf(vec4 s,out int m,out float T){m=int(s.r*255.+.5);T=s.g*2040.-40.;}
`;
/* MAT: emission and opacity. Every opaque cell glows with the blackbody colour of its own temperature. */
const FS_MAT=`${GLSL_MATS}
uniform sampler2D uState;uniform sampler2D uSpr;uniform float uTime;uniform vec3 uCryst;out vec4 o;
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);vec4 s=texelFetch(uState,p,0);int m;float T;cellOf(s,m,T);
  float op=(m==AIR||m==WATER||m==STEAM||m==SMOKE)?0.:1.;
  vec3 e=op>0.?bb(T):vec3(0);
  if(m==LAVA)e*=.82+.36*vn(vec2(p)*.45+vec2(uTime*.7,-uTime*1.1));
  if(m==CRYST)e+=uCryst*(1.5+.5*sin(uTime*1.7+s.b*40.));
  vec4 sp=texelFetch(uSpr,p,0);
  if(sp.a>0.){int a=int(sp.a*255.+.5);op=1.;e=a==255?vec3(0):pow(sp.rgb,vec3(2.2))*float(a)/254.*6.;}
  o=vec4(e,op);
}`;
/* JFA: seed with the cell's own centre if opaque; each step keeps the nearest of 9 candidates k cells away */
const FS_JSEED=`uniform sampler2D uTex;out vec4 o;void main(){ivec2 p=ivec2(gl_FragCoord.xy);float a=texelFetch(uTex,p,0).a;o=a>.5?vec4(vec2(p)+.5,0.,1.):vec4(-1e4,-1e4,0.,0.);}`;
const FS_JSTEP=`uniform sampler2D uTex;uniform float uK;uniform vec2 uSize;out vec4 o;
void main(){vec2 p=gl_FragCoord.xy;vec4 best=vec4(-1e4,-1e4,0.,0.);float bd=1e9;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 q=p+vec2(i,j)*uK;if(q.x<0.||q.y<0.||q.x>=uSize.x||q.y>=uSize.y)continue;
    vec4 s=texelFetch(uTex,ivec2(q),0);if(s.x<-1e3)continue;vec2 d=s.xy-p;float dd=dot(d,d);if(dd<bd){bd=dd;best=s;}}
  o=best;}`;
/* RC: one texel = one ray (probe, direction). Layout is direction-major: each direction owns a block of
   probes, so the merge can use hardware bilinear filtering across the four nearest coarser probes. */
const FS_RC=`uniform sampler2D uJFA;uniform sampler2D uEmit;uniform sampler2D uUp;
uniform ivec2 uPr;uniform int uBW;uniform float uSp;uniform float uT0;uniform float uT1;uniform int uHasUp;uniform ivec2 uPrU;uniform vec2 uUpSize;uniform vec2 uWorld;out vec4 o;
float sdBox(vec2 q){vec4 s=texelFetch(uJFA,ivec2(q),0);if(s.x<-1e3)return 1e3;vec2 d=abs(q-s.xy)-.5;return length(max(d,0.))+min(max(d.x,d.y),0.);}
void main(){
  ivec2 t=ivec2(gl_FragCoord.xy);ivec2 b=t/uPr;ivec2 pr=t-b*uPr;
  if(b.x>=uBW||b.y>=uBW){o=vec4(0);return;}
  int dirs=uBW*uBW,d=b.x+b.y*uBW;
  vec2 P=(vec2(pr)+.5)*uSp;
  float a=(float(d)+.5)*6.28318531/float(dirs);vec2 dir=vec2(cos(a),sin(a));
  vec4 r=vec4(0,0,0,1);float tt=uT0;
  for(int s=0;s<28;s++){
    vec2 q=P+dir*tt;
    if(q.x<0.||q.y<0.||q.x>=uWorld.x||q.y>=uWorld.y){r=vec4(0);break;}
    float sd=sdBox(q);
    if(sd<0.){r=vec4(texelFetch(uEmit,ivec2(q),0).rgb,0.);break;}
    tt+=max(sd,.4);if(tt>=uT1)break;
  }
  if(r.a>0.&&uHasUp==1){
    vec2 pu=clamp(P/(2.*uSp)-.5,vec2(0),vec2(uPrU)-1.);vec4 acc=vec4(0);int bwu=uBW*2;
    for(int k=0;k<4;k++){int du=d*4+k;ivec2 bu=ivec2(du-(du/bwu)*bwu,du/bwu);acc+=texture(uUp,(vec2(bu*uPrU)+pu+.5)/uUpSize);}
    acc*=.25;r.rgb+=acc.rgb*r.a;r.a*=acc.a;
  }
  o=r;
}`;
/* LIGHT: average the 4 base rays of each probe; also the luminance-weighted mean direction of incoming light */
const FS_LIGHT=`uniform sampler2D uC0;uniform ivec2 uPr;layout(location=0) out vec4 o;layout(location=1) out vec4 o2;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);vec3 s=vec3(0);vec2 dv=vec2(0);
  for(int d=0;d<4;d++){ivec2 b=ivec2(d&1,d>>1);vec3 c=texelFetch(uC0,b*uPr+p,0).rgb;s+=c;float a=(float(d)+.5)*1.57079633;dv+=vec2(cos(a),sin(a))*dot(c,vec3(.3,.55,.15));}
  o=vec4(s*.25,1.);o2=vec4(dv*.25,0.,1.);}`;
/* low quality: no shadows, light is a wide blur of the emission */
const FS_DOWN=`uniform sampler2D uTex;uniform vec2 uPx;out vec4 o;void main(){vec2 uv=gl_FragCoord.xy*uPx;o=vec4((texture(uTex,uv-uPx*.5).rgb+texture(uTex,uv+uPx*.5).rgb+texture(uTex,uv+vec2(uPx.x,-uPx.y)*.5).rgb+texture(uTex,uv+vec2(-uPx.x,uPx.y)*.5).rgb)*.25,1.);}`;
const FS_FINAL=`/*@@FINAL@@*/`;
const FS_LED=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uHud;uniform vec2 uRes;uniform float uGain;uniform float uFlash;uniform float uTime;uniform vec3 uFlashC;out vec4 o;
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;vec2 uv=(id+.5)/uRes;vec2 su=vec2(uv.x,1.-uv.y);
  vec4 c0=texture(uScene,su);vec3 c=c0.rgb;
  /* heat haze: hot air bends the cells behind it (bilinear resample a fraction of a dot away) */
  if(c0.a>.01){vec2 off=c0.a*vec2(sin(uTime*8.3+id.y*1.9+id.x*.37),cos(uTime*6.1+id.x*1.3-id.y*.5))*.85;c=texture(uScene,su+off/uRes).rgb;}
  vec4 h=texture(uHud,uv);h.rgb=pow(h.rgb,vec3(2.2));
  c=c/(1.+c*.05);c=mix(c,h.rgb*1.5,h.a)+uFlashC*uFlash;
  float fw=max(fwidth(cell.x),fwidth(cell.y));float d=length(f),r=.44;
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.0-smoothstep(0.0,r,d),far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.72+.5*hot),.6,far);
  o=vec4((c*uGain+vec3(.5,.48,.62)*.014)*m,1.0);
}`;
const FS_BRIGHT=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;out vec4 o;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;
c*=.25;float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.0)/max(l,1e-4);o=vec4(c,1.0);}`;
const FS_BLUR=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uDir;out vec4 o;
void main(){vec3 s=texture(uTex,vT).rgb*.227027;s+=(texture(uTex,vT+uDir*1.3846).rgb+texture(uTex,vT-uDir*1.3846).rgb)*.316216;
s+=(texture(uTex,vT+uDir*3.2308).rgb+texture(uTex,vT-uDir*3.2308).rgb)*.070270;o=vec4(s,1.0);}`;
const FS_COMP=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uB1;uniform sampler2D uB2;uniform float uBloom;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){vec3 c=texture(uScene,vT).rgb+(texture(uB1,vT).rgb*.5+texture(uB2,vT).rgb*.8)*uBloom;c=aces(c);c=pow(c,vec3(1.0/2.2));vec2 q=vT-.5;c*=1.0-dot(q,q)*.5;o=vec4(c,1.0);}`;

let P_MAT,P_JS,P_JT,P_RC,P_LI,P_DN,P_FI,P_LED,P_BR,P_BL,P_CO,VAO,GLERR=null;
const FB={},TX={};let VW=1,VH=1,DPR=1,RECT={x:0,y:0,w:100,h:56};
/* light quality: 2 = cascades with a probe per cell, 1 = a probe per 2x2 cells, 0 = blurred glow, no shadows */
const QL=['LOW','MED','HIGH'];
let LQ=parseInt(store.get('hd-molten-light',touchy?'1':'2'),10);if(!(LQ>=0&&LQ<=2))LQ=touchy?1:2;if(!HDR)LQ=0;
function texParams(nearest){const f=nearest?gl.NEAREST:gl.LINEAR;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
function mkTex(w,h,fl,nearest){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,fl&&HDR?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,fl&&HDR?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);texParams(nearest);return t;}
function mkTarget(w,h,nearest,t2){const t=mkTex(w,h,true,nearest);const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  let tb=null;if(t2){tb=mkTex(w,h,true,nearest);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,tb,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);}
  return {t,t2:tb,f,w,h};}
function freeTarget(T){if(!T)return;gl.deleteTexture(T.t);if(T.t2)gl.deleteTexture(T.t2);gl.deleteFramebuffer(T.f);}
/* ---- the blackbody palette: Planck's law integrated against the CIE 1931 colour-matching functions
        (multi-lobe Gaussian fits of Wyman, Sloan & Shirley 2013), XYZ -> linear sRGB. Brightness is the
        photopic luminance compressed by a square root, so 700 C reads as a dull ember, 1100 C as deep orange
        and 1500 C as white heat. */
function blackbodyLUT(){
  const n=256,out=new Float32Array(n*4);
  const xb=l=>{const t1=(l-442.0)*(l<442?.0624:.0374),t2=(l-599.8)*(l<599.8?.0264:.0323),t3=(l-501.1)*(l<501.1?.0490:.0382);return .362*Math.exp(-.5*t1*t1)+1.056*Math.exp(-.5*t2*t2)-.065*Math.exp(-.5*t3*t3);};
  const yb=l=>{const t1=(l-568.8)*(l<568.8?.0213:.0247),t2=(l-530.9)*(l<530.9?.0613:.0322);return .821*Math.exp(-.5*t1*t1)+.286*Math.exp(-.5*t2*t2);};
  const zb=l=>{const t1=(l-437.0)*(l<437?.0845:.0278),t2=(l-459.0)*(l<459?.0385:.0725);return 1.217*Math.exp(-.5*t1*t1)+.681*Math.exp(-.5*t2*t2);};
  const planck=(lnm,K)=>{const l=lnm*1e-9;return 1/(l*l*l*l*l*(Math.exp(1.4388e-2/(l*K))-1));};
  const XYZ=K=>{let X=0,Y=0,Z=0;for(let l=380;l<=780;l+=5){const p=planck(l,K);X+=p*xb(l);Y+=p*yb(l);Z+=p*zb(l);}return [X,Y,Z];};
  const Yref=XYZ(1500+273.15)[1];
  for(let i=0;i<n;i++){
    const C=-40+i*2080/(n-1),K=C+273.15;let r=0,gg=0,b=0;
    if(C>380){const [X,Y,Z]=XYZ(K);
      let R=3.2406*X-1.5372*Y-.4986*Z,G=-.9689*X+1.8758*Y+.0415*Z,B=.0557*X-.2040*Y+1.0570*Z;
      const mn=Math.min(R,G,B);if(mn<0){R-=mn;G-=mn;B-=mn;}const mx=Math.max(R,G,B)||1;R/=mx;G/=mx;B/=mx;
      const I=3.6*Math.pow(Y/Yref,.5)*clamp((C-380)/260,0,1);r=R*I;gg=G*I;b=B*I;}
    out.set([r,gg,b,1],i*4);
  }
  return out;
}
let CASC=[],LIGHT=null,LBLUR=null,SBUF=null,SPR=null;
function buildLightTargets(){
  for(const c of CASC)freeTarget(c.fb);CASC=[];freeTarget(LIGHT);LIGHT=null;freeTarget(LBLUR&&LBLUR[0]);freeTarget(LBLUR&&LBLUR[1]);LBLUR=null;
  if(LQ===0){LBLUR=[mkTarget(W>>2,H>>2,false),mkTarget(W>>2,H>>2,false)];return;}
  const s0=LQ===2?1:2,L0=1.5*s0;
  for(let i=0;i<5;i++){const sp=s0<<i,pw=Math.ceil(W/sp),ph=Math.ceil(H/sp),bw=2<<i;
    CASC.push({sp,pw,ph,bw,t0:i===0?(s0===1?.75:.05):L0*(Math.pow(4,i)-1)/3,t1:L0*(Math.pow(4,i+1)-1)/3,fb:mkTarget(pw*bw,ph*bw,false)});}
  LIGHT=mkTarget(CASC[0].pw,CASC[0].ph,false,true);
}
if(gl){
  try{
    P_MAT=prog(VS,FS_MAT);P_JS=prog(VS,FS_JSEED);P_JT=prog(VS,FS_JSTEP);P_RC=prog(VS,FS_RC);P_LI=prog(VS,FS_LIGHT);P_DN=prog(VS,FS_DOWN);P_FI=prog(VS,FS_FINAL);
    P_LED=prog(VS,FS_LED);P_BR=prog(VS,FS_BRIGHT);P_BL=prog(VS,FS_BLUR);P_CO=prog(VS,FS_COMP);
  }catch(e){GLERR=String(e);console.error(e);}
  VAO=gl.createVertexArray();
  TX.hud=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX.hud);texParams(true);
  TX.state=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX.state);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);texParams(true);
  TX.spr=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX.spr);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);texParams(true);
  TX.bb=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX.bb);gl.texImage2D(gl.TEXTURE_2D,0,HDR?gl.RGBA16F:gl.RGBA32F,256,1,0,gl.RGBA,gl.FLOAT,blackbodyLUT());texParams(!HDR);
  FB.emit=mkTarget(W,H,true);FB.j0=mkTarget(W,H,true);FB.j1=mkTarget(W,H,true);FB.s=mkTarget(W,H,false);
  buildLightTargets();
}
SBUF=new Uint8ClampedArray(N*4);SPR=new Uint8ClampedArray(N*4);
function setLight(q){if(!HDR)q=0;LQ=q;store.set('hd-molten-light',q);if(gl)buildLightTargets();$('resv').textContent=QL[LQ];}
function bindT(unit,t,loc){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc,unit);}
function draw(p,dst,setup){gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:VW,dst?dst.h:VH);gl.useProgram(p.p);if(setup)setup(p.u);gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);}
function pass(p,src,dst,setup){draw(p,dst,u=>{bindT(0,src.t,u.uTex);if(setup)setup(u);});}
/* the FINAL pass reads a handful of per-stage colours staged here by the game */
const SU={uTime:0,uAmb:.095,uTint:[.5,.45,.6],uBackA:[.05,.045,.06],uBackB:[.11,.09,.1],uCryst:[.2,.6,1],uIce:[.55,.8,.95],uFlashC:[1,.9,.8]};
const GT={upload:0,gpu:0};
function renderWorld(){
  if(!P_MAT)return;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.bindTexture(gl.TEXTURE_2D,TX.state);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,SBUF);
  gl.bindTexture(gl.TEXTURE_2D,TX.spr);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,SPR);
  draw(P_MAT,FB.emit,u=>{bindT(0,TX.state,u.uState);bindT(1,TX.spr,u.uSpr);bindT(2,TX.bb,u.uBB);gl.uniform1f(u.uTime,SU.uTime);gl.uniform3fv(u.uCryst,SU.uCryst);});
  let lightT=null,ldirT=null,lsz=[W,H];
  if(LQ>0){
    /* distance field */
    draw(P_JS,FB.j0,u=>bindT(0,FB.emit.t,u.uTex));
    let a=FB.j0,b=FB.j1;
    for(const k of [256,128,64,32,16,8,4,2,1,1]){draw(P_JT,b,u=>{bindT(0,a.t,u.uTex);gl.uniform1f(u.uK,k);gl.uniform2f(u.uSize,W,H);});[a,b]=[b,a];}
    /* cascades, coarsest first */
    for(let i=CASC.length-1;i>=0;i--){const c=CASC[i],up=CASC[i+1];
      draw(P_RC,c.fb,u=>{bindT(0,a.t,u.uJFA);bindT(1,FB.emit.t,u.uEmit);bindT(2,up?up.fb.t:FB.emit.t,u.uUp);
        gl.uniform2i(u.uPr,c.pw,c.ph);gl.uniform1i(u.uBW,c.bw);gl.uniform1f(u.uSp,c.sp);gl.uniform1f(u.uT0,c.t0);gl.uniform1f(u.uT1,c.t1);
        gl.uniform1i(u.uHasUp,up?1:0);if(up){gl.uniform2i(u.uPrU,up.pw,up.ph);gl.uniform2f(u.uUpSize,up.fb.w,up.fb.h);}gl.uniform2f(u.uWorld,W,H);});}
    draw(P_LI,LIGHT,u=>{bindT(0,CASC[0].fb.t,u.uC0);gl.uniform2i(u.uPr,CASC[0].pw,CASC[0].ph);});
    lightT=LIGHT.t;ldirT=LIGHT.t2;lsz=[CASC[0].pw*CASC[0].sp,CASC[0].ph*CASC[0].sp];
  }else{
    const [l0,l1]=LBLUR;draw(P_DN,l0,u=>{bindT(0,FB.emit.t,u.uTex);gl.uniform2f(u.uPx,1/l0.w,1/l0.h);});
    for(let k=0;k<2;k++){pass(P_BL,l0,l1,u=>gl.uniform2f(u.uDir,(1.6+k)/l0.w,0));pass(P_BL,l1,l0,u=>gl.uniform2f(u.uDir,0,(1.6+k)/l0.h));}
    lightT=l0.t;ldirT=l0.t;lsz=[W,H];
  }
  draw(P_FI,FB.s,u=>{bindT(0,TX.state,u.uState);bindT(1,TX.spr,u.uSpr);bindT(2,TX.bb,u.uBB);bindT(3,lightT,u.uLight);bindT(4,ldirT,u.uLDir);bindT(5,FB.emit.t,u.uEmit);
    gl.uniform1f(u.uTime,SU.uTime);gl.uniform1f(u.uAmb,SU.uAmb);gl.uniform1f(u.uLQ,LQ);gl.uniform2f(u.uLSz,lsz[0],lsz[1]);
    for(const k of ['uTint','uBackA','uBackB','uCryst','uIce'])gl.uniform3fv(u[k],SU[k]);});
  gl.activeTexture(gl.TEXTURE0);
}
let FLASH=0;
function present(){
  if(!gl)return;
  renderWorld();
  gl.bindTexture(gl.TEXTURE_2D,TX.hud);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mc);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.scene.f);gl.viewport(0,0,VW,VH);gl.clearColor(.02,.012,.016,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const rx=Math.round(RECT.x*DPR),rw=Math.round(RECT.w*DPR),rh=Math.round(RECT.h*DPR),ry=VH-Math.round(RECT.y*DPR)-rh;
  gl.viewport(rx,ry,rw,rh);gl.useProgram(P_LED.p);
  bindT(0,FB.s.t,P_LED.u.uScene);bindT(1,TX.hud,P_LED.u.uHud);
  gl.uniform2f(P_LED.u.uRes,W,H);gl.uniform1f(P_LED.u.uGain,HDR?1.7:1.2);gl.uniform1f(P_LED.u.uFlash,FLASH);gl.uniform1f(P_LED.u.uTime,SU.uTime);gl.uniform3fv(P_LED.u.uFlashC,SU.uFlashC);
  gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
  pass(P_BR,FB.scene,FB.a,u=>{gl.uniform2f(u.uPx,1/VW,1/VH);gl.uniform1f(u.uThr,HDR?1.1:.8);});
  pass(P_BL,FB.a,FB.b,u=>gl.uniform2f(u.uDir,1/FB.a.w,0));pass(P_BL,FB.b,FB.a,u=>gl.uniform2f(u.uDir,0,1/FB.a.h));
  pass(P_BR,FB.a,FB.c,u=>{gl.uniform2f(u.uPx,1/FB.a.w,1/FB.a.h);gl.uniform1f(u.uThr,0);});
  pass(P_BL,FB.c,FB.d,u=>gl.uniform2f(u.uDir,2.2/FB.c.w,0));pass(P_BL,FB.d,FB.c,u=>gl.uniform2f(u.uDir,0,2.2/FB.c.h));
  draw(P_CO,null,u=>{bindT(0,FB.scene.t,u.uScene);bindT(1,FB.a.t,u.uB1);bindT(2,FB.c.t,u.uB2);gl.uniform1f(u.uBloom,HDR?1:.6);});
  gl.activeTexture(gl.TEXTURE0);
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2.5);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));cv.width=VW;cv.height=VH;
  if(gl){for(const k of ['scene','a','b','c','d'])if(FB[k])freeTarget(FB[k]);
    FB.scene=mkTarget(VW,VH,false);FB.a=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2),false);FB.b=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2),false);
    FB.c=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3),false);FB.d=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3),false);}
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
