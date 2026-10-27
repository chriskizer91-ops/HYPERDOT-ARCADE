/* =====================================================================================
   0. CABINET CONFIG
   ===================================================================================== */
const CAB={
  id:'redline',title:'REDLINE',brand:'REDLINE',sub:'LED MATRIX GRAND PRIX',style:'color',
  res:[[192,108],[256,144],[320,180],[384,216]],
  tickets:true,
  keys:'<b>← →</b> steer · <b>↓</b> or <b>Shift</b> brake (hold while turning to drift) · <b>Space</b> nitro · <b>Enter</b> start · <b>Esc</b> pause · the throttle is automatic'
};
/* =====================================================================================
   1. BASICS
   ===================================================================================== */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2,PI=Math.PI;
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchy=matchMedia('(hover: none)').matches;
const fmt=n=>Math.floor(n).toLocaleString('en-US');
const pick=a=>a[(Math.random()*a.length)|0];
const smooth=t=>t*t*(3-2*t);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hexRGB(h){const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
const c255=v=>v<0?0:v>255?255:v|0;
const rgbS=(r,g2,b)=>'rgb('+c255(r)+','+c255(g2)+','+c255(b)+')';
/* colour strings for fogged and shaded colours are cached: the road asks for thousands per frame */
const FOGQ=24,FCACHE=new Map();
function fogS(hex,fogHex,k){
  const q=k<=0?0:k>=1?FOGQ:Math.round(k*FOGQ),key=hex+fogHex;let arr=FCACHE.get(key);
  if(!arr){const a=hexRGB(hex),b=hexRGB(fogHex);arr=[];for(let i=0;i<=FOGQ;i++){const t=i/FOGQ;arr.push(rgbS(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t));}FCACHE.set(key,arr);}
  return arr[q];
}
function mixS(a,b,t){const A=hexRGB(a),B=hexRGB(b);return rgbS(lerp(A[0],B[0],t),lerp(A[1],B[1],t),lerp(A[2],B[2],t));}
const SCACHE=new Map();
function shadeS(hex,k){const key=hex+k;let s=SCACHE.get(key);if(!s){const A=hexRGB(hex);s=rgbS(A[0]*k,A[1]*k,A[2]*k);SCACHE.set(key,s);}return s;}
const EMBED=/[?&]embed=1/.test(location.search);
const fmtT=t=>{if(!(t>0)||t>5999)return '-:--.--';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2);};
/* =====================================================================================
   2. BITMAP FONTS: 5x7 (txt5) and 3x5 (txt3); col may be a CSS colour or an array of 7 row colours
   ===================================================================================== */
const F5SRC=`A 01110 10001 10001 11111 10001 10001 10001|B 11110 10001 10001 11110 10001 10001 11110|C 01110 10001 10000 10000 10000 10001 01110|D 11110 10001 10001 10001 10001 10001 11110|E 11111 10000 10000 11110 10000 10000 11111|F 11111 10000 10000 11110 10000 10000 10000|G 01110 10001 10000 10111 10001 10001 01111|H 10001 10001 10001 11111 10001 10001 10001|I 01110 00100 00100 00100 00100 00100 01110|J 00111 00010 00010 00010 00010 10010 01100|K 10001 10010 10100 11000 10100 10010 10001|L 10000 10000 10000 10000 10000 10000 11111|M 10001 11011 10101 10101 10001 10001 10001|N 10001 10001 11001 10101 10011 10001 10001|O 01110 10001 10001 10001 10001 10001 01110|P 11110 10001 10001 11110 10000 10000 10000|Q 01110 10001 10001 10001 10101 10010 01101|R 11110 10001 10001 11110 10100 10010 10001|S 01111 10000 10000 01110 00001 00001 11110|T 11111 00100 00100 00100 00100 00100 00100|U 10001 10001 10001 10001 10001 10001 01110|V 10001 10001 10001 10001 10001 01010 00100|W 10001 10001 10001 10101 10101 10101 01010|X 10001 10001 01010 00100 01010 10001 10001|Y 10001 10001 01010 00100 00100 00100 00100|Z 11111 00001 00010 00100 01000 10000 11111|0 01110 10001 10011 10101 11001 10001 01110|1 00100 01100 00100 00100 00100 00100 01110|2 01110 10001 00001 00010 00100 01000 11111|3 11111 00010 00100 00010 00001 10001 01110|4 00010 00110 01010 10010 11111 00010 00010|5 11111 10000 11110 00001 00001 10001 01110|6 00110 01000 10000 11110 10001 10001 01110|7 11111 00001 00010 00100 01000 01000 01000|8 01110 10001 10001 01110 10001 10001 01110|9 01110 10001 10001 01111 00001 00010 01100|! 00100 00100 00100 00100 00100 00000 00100|. 00000 00000 00000 00000 00000 01100 01100|, 00000 00000 00000 00000 01100 00100 01000|: 00000 01100 01100 00000 01100 01100 00000|- 00000 00000 00000 11111 00000 00000 00000|+ 00000 00100 00100 11111 00100 00100 00000|? 01110 10001 00001 00010 00100 00000 00100|' 00100 00100 01000 00000 00000 00000 00000|/ 00001 00001 00010 00100 01000 10000 10000|> 01000 00100 00010 00001 00010 00100 01000|< 00010 00100 01000 10000 01000 00100 00010|x 00000 00000 10001 01010 00100 01010 10001|_ 00000 00000 00000 00000 00000 00000 00000`;
const G5={};for(const ln of F5SRC.split('|')){const p=ln.trim().split(/\s+/);G5[p[0]==='_'?' ':p[0]]=p.slice(1).map(r=>parseInt(r,2));}
const F3SRC=`A 010 101 111 101 101|B 110 101 110 101 110|C 011 100 100 100 011|D 110 101 101 101 110|E 111 100 110 100 111|F 111 100 110 100 100|G 011 100 101 101 011|H 101 101 111 101 101|I 111 010 010 010 111|J 001 001 001 101 010|K 101 101 110 101 101|L 100 100 100 100 111|M 101 111 111 101 101|N 110 101 101 101 101|O 010 101 101 101 010|P 110 101 110 100 100|Q 010 101 101 110 011|R 110 101 110 101 101|S 011 100 010 001 110|T 111 010 010 010 010|U 101 101 101 101 111|V 101 101 101 101 010|W 101 101 111 111 101|X 101 101 010 101 101|Y 101 101 010 010 010|Z 111 001 010 100 111|0 111 101 101 101 111|1 010 110 010 010 111|2 111 001 111 100 111|3 111 001 011 001 111|4 101 101 111 001 001|5 111 100 111 001 111|6 111 100 111 101 111|7 111 001 001 010 010|8 111 101 111 101 111|9 111 101 111 001 111|x 000 101 010 101 000|+ 000 010 111 010 000|- 000 000 111 000 000|: 0 1 0 1 0|. 0 0 0 0 1|, 0 0 0 1 1|! 1 1 1 0 1|/ 001 001 010 100 100|' 1 1 0 0 0|> 100 010 001 010 100|< 001 010 100 010 001|? 111 001 011 000 010|( 01 10 10 10 01|) 10 01 01 01 10|% 101 001 010 100 101|# 101 111 101 111 101`;
const G3={};for(const ln of F3SRC.split('|')){const p=ln.trim().split(/\s+/);G3[p[0]]=p.slice(1);}
function tw5(s,sc=1){return s.length*6*sc-sc;}
function txt5(g,s,x,y,col,sc=1,align,it=0){
  if(align==='c')x=Math.round(x-tw5(s,sc)/2);else if(align==='r')x=x-tw5(s,sc);
  const cols=Array.isArray(col)?col:null;if(!cols)g.fillStyle=col;
  for(const ch of s){const gl5=G5[ch]||G5[ch.toUpperCase()]||G5[' '];
    for(let r=0;r<7;r++){if(cols)g.fillStyle=cols[Math.min(cols.length-1,r)];const ox=it?Math.round((6-r)*it*sc):0;for(let c=0;c<5;c++)if((gl5[r]>>(4-c))&1)g.fillRect(x+c*sc+ox,y+r*sc,sc,sc);}
    x+=6*sc;}
}
function tw3(s,sc=1){let w=0;for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];w+=((gg?gg[0].length:3)+1)*sc;}return Math.max(0,w-sc);}
function txt3(g,s,x,y,col,sc=1,align){
  if(align==='c')x=Math.round(x-tw3(s,sc)/2);else if(align==='r')x=x-tw3(s,sc);
  g.fillStyle=col;
  for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){x+=4*sc;continue;}for(let r=0;r<5;r++)for(let c=0;c<gg[r].length;c++)if(gg[r][c]==='1')g.fillRect(x+c*sc,y+r*sc,sc,sc);x+=(gg[0].length+1)*sc;}
}
const O8=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
function otxt5(g,s,x,y,col,sc=1,align,it=0,ol='#000'){const o=Math.max(1,sc>>1);for(const [a,b] of O8)txt5(g,s,x+a*o,y+b*o,ol,sc,align,it);txt5(g,s,x,y,col,sc,align,it);}
function otxt3(g,s,x,y,col,sc=1,align,ol='#000'){for(const [a,b] of O8)txt3(g,s,x+a,y+b,ol,sc,align);txt3(g,s,x,y,col,sc,align);}
/* drop-shadowed text: cheaper than an outline, reads well over the road */
function stxt5(g,s,x,y,col,sc=1,align,it){txt5(g,s,x+Math.max(1,sc>>1),y+Math.max(1,sc>>1),'#000',sc,align,it);txt5(g,s,x,y,col,sc,align,it);}
function stxt3(g,s,x,y,col,sc=1,align){txt3(g,s,x+1,y+1,'#000',sc,align);txt3(g,s,x,y,col,sc,align);}
const GR={
  volt:['#ffffff','#fff7cc','#ffe46a','#ffc21a','#ff9a10','#e2600a','#902c06'],
  cyan:['#ffffff','#e6fbff','#a6f3ff','#4fe0ff','#22b4ff','#2a70ff','#3a36c8'],
  red:['#ffffff','#ffe0e6','#ff9aab','#ff4a62','#ff1a3a','#c80d2a','#7a0618'],
  steel:['#ffffff','#eef1f8','#cfd6e6','#a2adc6','#76829e','#4e5876','#2c3250'],
  green:['#ffffff','#eaffe6','#b4ffaa','#6aff5a','#2ee04a','#1a9c3a','#0e5a26'],
  gold:['#ffffff','#fff4c8','#ffe27a','#ffc83a','#e8a020','#a86a10','#5a3606']
};
/* =====================================================================================
   3. THE MATRIX: the game draws into the 2D canvas g at W x H dots
   ===================================================================================== */
const RESDEF=touchy?1:2;
let resI=parseInt(store.get('hd-'+CAB.id+'-res',RESDEF),10);if(!(resI>=0&&resI<CAB.res.length))resI=RESDEF;
let W=CAB.res[resI][0],H=CAB.res[resI][1],SC=W/256;
const mc=document.createElement('canvas'),g=mc.getContext('2d',{willReadFrequently:true});
const RESCB=[];
function setRes(i){resI=i;W=CAB.res[i][0];H=CAB.res[i][1];SC=W/256;mc.width=W;mc.height=H;g.imageSmoothingEnabled=false;store.set('hd-'+CAB.id+'-res',i);$('resv').textContent=W+'×'+H;for(const f of RESCB)f();}
/* =====================================================================================
   4. LED DISPLAY: WebGL2 round dots, unlit-dot floor, two-level bloom, ACES tonemap, vignette
   ===================================================================================== */
const cv=$('gl');
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,powerPreference:'high-performance'});
let g2=null;if(!gl)g2=cv.getContext('2d');
const HDR=gl?!!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float')):false;
function prog(vs,fs){
  const p=gl.createProgram();
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(t);gl.shaderSource(s,'#version 300 es\nprecision highp float;\n'+src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
const VS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const FS_LED=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uRes;uniform float uGain;out vec4 o;
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;
  vec3 c=texture(uTex,(id+.5)/uRes).rgb;c=pow(c,vec3(2.2));
  float r=.43,fw=max(fwidth(cell.x),fwidth(cell.y)),d=length(f);
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.0-smoothstep(0.0,r,d),far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.74+.48*hot),.58,far);
  vec3 col=(c*uGain+vec3(.52,.5,.62)*.016)*m;
  vec2 q=vT-vec2(.22,.9);col+=vec3(.010,.010,.014)*(1.0-smoothstep(0.0,.8,length(q)));
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
void main(){vec3 c=texture(uScene,vT).rgb+(texture(uB1,vT).rgb*.8+texture(uB2,vT).rgb*1.2)*uBloom;c=aces(c*1.1);c=pow(c,vec3(1.0/2.2));vec2 q=vT-.5;c*=1.0-dot(q,q)*.5;o=vec4(c,1.0);}`;
let P_LED,P_BR,P_BL,P_CO,VAO,MTEX;
const FB={};let VW=1,VH=1,DPR=1,RECT={x:0,y:0,w:100,h:56};
if(gl){
  P_LED=prog(VS,FS_LED);P_BR=prog(VS,FS_BRIGHT);P_BL=prog(VS,FS_BLUR);P_CO=prog(VS,FS_COMP);
  VAO=gl.createVertexArray();MTEX=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,MTEX);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function mkTarget(w,h){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,HDR?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,HDR?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  return {t,f,w,h};
}
function pass(p,src,dst,setup){
  gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:VW,dst?dst.h:VH);
  gl.useProgram(p.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src.t);gl.uniform1i(p.u.uTex,0);
  if(setup)setup(p.u);gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);
}
function present(){
  if(!gl){g2.fillStyle='#060509';g2.fillRect(0,0,VW,VH);g2.imageSmoothingEnabled=false;g2.drawImage(mc,RECT.x*DPR,RECT.y*DPR,RECT.w*DPR,RECT.h*DPR);return;}
  gl.bindTexture(gl.TEXTURE_2D,MTEX);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mc);
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.scene.f);gl.viewport(0,0,VW,VH);gl.clearColor(.018,.014,.026,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const rx=Math.round(RECT.x*DPR),rw=Math.round(RECT.w*DPR),rh=Math.round(RECT.h*DPR),ry=VH-Math.round(RECT.y*DPR)-rh;
  gl.viewport(rx,ry,rw,rh);gl.useProgram(P_LED.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,MTEX);
  gl.uniform1i(P_LED.u.uTex,0);gl.uniform2f(P_LED.u.uRes,W,H);gl.uniform1f(P_LED.u.uGain,HDR?2.5:1.6);
  gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);
  pass(P_BR,FB.scene,FB.a,u=>{gl.uniform2f(u.uPx,1/VW,1/VH);gl.uniform1f(u.uThr,HDR?1.0:.8);});
  pass(P_BL,FB.a,FB.b,u=>gl.uniform2f(u.uDir,1/FB.a.w,0));pass(P_BL,FB.b,FB.a,u=>gl.uniform2f(u.uDir,0,1/FB.a.h));
  pass(P_BR,FB.a,FB.c,u=>{gl.uniform2f(u.uPx,1/FB.a.w,1/FB.a.h);gl.uniform1f(u.uThr,0);});
  pass(P_BL,FB.c,FB.d,u=>gl.uniform2f(u.uDir,2.2/FB.c.w,0));pass(P_BL,FB.d,FB.c,u=>gl.uniform2f(u.uDir,0,2.2/FB.c.h));
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,VW,VH);gl.useProgram(P_CO.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,FB.scene.t);gl.uniform1i(P_CO.u.uScene,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,FB.a.t);gl.uniform1i(P_CO.u.uB1,1);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,FB.c.t);gl.uniform1i(P_CO.u.uB2,2);
  gl.uniform1f(P_CO.u.uBloom,HDR?1:.55);gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2.5);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));cv.width=VW;cv.height=VH;
  if(gl){for(const k in FB){gl.deleteTexture(FB[k].t);gl.deleteFramebuffer(FB[k].f);}
    FB.scene=mkTarget(VW,VH);FB.a=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));FB.b=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));
    FB.c=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));FB.d=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));}
  layout();
}
/* RECT = where the matrix sits on screen (CSS px). Phones upright: matrix on top, controls below. */
function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style,asp=W/H;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;$('turn').hidden=!portrait||EMBED;
  const gutL=EMBED?Math.max(0,sl):Math.max(16,sl),gutR=EMBED?Math.max(0,sr):Math.max(16,sr),top=EMBED?Math.max(0,st):Math.max(10,st)+46;
  if(portrait){
    const w=vw-gutL-gutR,h=w/asp;RECT={x:gutL,y:top+4,w,h};
    bs.setProperty('--stick',Math.min(200,vw*.46)+'px');bs.setProperty('--b',Math.min(64,vw*.15)+'px');
    bs.setProperty('--padTop',(RECT.y+h+26)+'px');$('turn').style.top=(RECT.y+h+8)+'px';
  }else{
    const bottom=EMBED?Math.max(0,sb):touchy?Math.max(8,sb)+4:Math.max(10,sb)+30,aw=vw-gutL-gutR,ah=vh-top-bottom;let w=aw,h=w/asp;if(h>ah){h=ah;w=h*asp;}
    RECT={x:gutL+(aw-w)/2,y:top+(ah-h)/2,w,h};
    if(touchy){bs.setProperty('--stick',Math.min(190,vw*.24)+'px');bs.setProperty('--b',Math.min(58,vh*.14)+'px');}
  }
}
/* =====================================================================================
   5. AUDIO CORE: tone() and noise() voices into a compressor, with reverb and delay sends
   ===================================================================================== */
const AU={ctx:null,out:null,mus:null,sfx:null,eng:null,rev:null,dly:null,noise:null,muted:store.get('hd-mute','0')==='1',next:0,step:0,track:null,want:null};
const mtof=m=>440*Math.pow(2,(m-69)/12),now=()=>AU.ctx?AU.ctx.currentTime:0;
function audioInit(){
  try{
    if(!AU.ctx){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();AU.ctx=c;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.15;comp.connect(c.destination);
      AU.out=c.createGain();AU.out.gain.value=AU.muted||ARC.muted?0:.62;AU.out.connect(comp);
      AU.mus=c.createGain();AU.mus.gain.value=.22;AU.mus.connect(AU.out);
      AU.sfx=c.createGain();AU.sfx.gain.value=.85;AU.sfx.connect(AU.out);
      const len=c.sampleRate*2|0,ir=c.createBuffer(2,len,c.sampleRate);
      for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.4);}
      const cvn=c.createConvolver();cvn.buffer=ir;AU.rev=c.createGain();AU.rev.gain.value=.45;AU.rev.connect(cvn);cvn.connect(AU.out);
      const dl=c.createDelay(1);dl.delayTime.value=.33;const fb=c.createGain();fb.gain.value=.3;const dlo=c.createGain();dlo.gain.value=.3;
      dl.connect(fb);fb.connect(dl);dl.connect(dlo);dlo.connect(AU.mus);AU.dly=dl;
      const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
      AU.next=c.currentTime+.05;
      engineInit();
    }
    if(AU.ctx.state==='suspended')AU.ctx.resume();
  }catch(e){}
}
function setVolume(){if(AU.out)AU.out.gain.value=AU.muted||ARC.muted?0:.62;}
function env(gn,t,a,peak,d){gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);gn.gain.exponentialRampToValueAtTime(.0001,t+a+d);}
/* tone(freq, start, dur, wave, vol, bus, slideTo, lowpassCut, reverbSend, attack, pan) */
function tone(f,t,dur,type,vol,bus,slide,cut,rv,att,pan){
  const c=AU.ctx;if(!c||AU.muted)return;const o=c.createOscillator();o.type=type||'square';o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  const gn=c.createGain();env(gn,t,att||.005,vol||.1,dur);let n=o;
  if(cut){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;fl.Q.value=3;o.connect(fl);n=fl;}
  n.connect(gn);let last=gn;if(pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=clamp(pan,-1,1);gn.connect(p);last=p;}
  last.connect(bus||AU.sfx);if(rv){const s=c.createGain();s.gain.value=rv;last.connect(s);s.connect(AU.rev);}o.start(t);o.stop(t+dur+.08);
}
/* noise(start, dur, vol, filterFrom, filterTo, filterType, bus, reverbSend, Q, pan) */
function noise(t,dur,vol,f0,f1,type,bus,rv,q,pan){
  const c=AU.ctx;if(!c||AU.muted)return;const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;
  const fl=c.createBiquadFilter();fl.type=type||'lowpass';fl.Q.value=q||1;fl.frequency.setValueAtTime(f0||4000,t);fl.frequency.exponentialRampToValueAtTime(Math.max(30,f1||200),t+dur);
  const gn=c.createGain();env(gn,t,.003,vol,dur);s.connect(fl);fl.connect(gn);let last=gn;
  if(pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=clamp(pan,-1,1);gn.connect(p);last=p;}
  last.connect(bus||AU.sfx);if(rv){const r=c.createGain();r.gain.value=rv;last.connect(r);r.connect(AU.rev);}
  s.start(t,Math.random()*1.5);s.stop(t+dur+.08);
}
/* the announcer, through the browser's speech engine */
let VOICE=store.get('hd-voice','1')==='1';
function say(txt,pitch=.55,rate=1.02){if(AU.muted||ARC.muted||!VOICE||S.demo)return;try{const s=window.speechSynthesis;if(!s)return;s.cancel();const u=new SpeechSynthesisUtterance(txt);u.pitch=pitch;u.rate=rate;u.volume=.9;
  const vs=s.getVoices?s.getVoices():[];const v=vs.find(v=>/^en/i.test(v.lang));if(v)u.voice=v;s.speak(u);}catch(e){}}
/* =====================================================================================
   6. INPUT: one snapshot per simulation tick from keyboard, touch, mouse and gamepads.
      LATCH holds keys pressed since the last tick so very quick taps are never lost.
   ===================================================================================== */
const KEY={},LATCH=new Set();
const GAMEKEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Tab']);
addEventListener('keydown',e=>{if(GAMEKEYS.has(e.code))e.preventDefault();KEY[e.code]=true;if(e.repeat)return;LATCH.add(e.code);audioInit();});
addEventListener('keyup',e=>{KEY[e.code]=false;});
addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;PTR.down=false;MPTR.clear();});
const K=c=>KEY[c]||LATCH.has(c);
const PTR={x:0,y:0,on:false,down:false,pressed:false,released:false,id:null,touch:false};
const MPTR=new Map();                 /* touches on the matrix itself while racing: left half steers left, right half right */
const toM=e=>[(e.clientX-RECT.x)/RECT.w*W,(e.clientY-RECT.y)/RECT.h*H];
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();[PTR.x,PTR.y]=toM(e);PTR.on=true;PTR.down=true;PTR.pressed=true;PTR.id=e.pointerId;PTR.touch=e.pointerType!=='mouse';
  if(e.pointerType!=='mouse')MPTR.set(e.pointerId,PTR.x<W/2?-1:1);try{cv.setPointerCapture(e.pointerId);}catch(_){}});
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerId===PTR.id){[PTR.x,PTR.y]=toM(e);PTR.on=true;}if(MPTR.has(e.pointerId))MPTR.set(e.pointerId,toM(e)[0]<W/2?-1:1);});
addEventListener('pointerup',e=>{MPTR.delete(e.pointerId);if(e.pointerId===PTR.id||e.pointerType==='mouse'){if(PTR.down)PTR.released=true;PTR.down=false;}});
addEventListener('pointercancel',e=>{MPTR.delete(e.pointerId);if(e.pointerId===PTR.id){PTR.down=false;PTR.released=true;}});
function pads(){try{const gp=navigator.getGamepads?navigator.getGamepads():[];const out=[];for(const p of gp)if(p&&p.connected!==false)out.push(p);return out;}catch(e){return [];}}
/* the steering stick slides left and right only; its travel maps straight to the wheel */
const TS={x:0,on:false,A:false,B:false};
(()=>{const el=$('stL'),kn=$('knL');let id=null,cx=0;
  const set=x=>{const r=el.clientWidth*.36,dx=clamp(x-cx,-r,r);kn.style.transform=`translate(calc(-50% + ${dx}px),-50%)`;TS.x=dx/r;TS.on=true;};
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();id=e.pointerId;const b=el.getBoundingClientRect();cx=b.left+b.width/2;try{el.setPointerCapture(id);}catch(_){}set(e.clientX);});
  el.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX);});
  const end=e=>{if(e.pointerId!==id)return;id=null;kn.style.transform='';TS.x=0;TS.on=false;};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);})();
for(const [bid,k] of [['bA','A'],['bB','B']]){
  const el=$(bid);
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();TS[k]=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId);}catch(_){}});
  const up=()=>{TS[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
}
/* the control snapshot. x in -1..1 (analog when it can be), keys report whether steering was digital */
function readCtl(){
  const o={x:0,y:0,dig:true,brake:false,nitro:false,start:false,ok:false,back:false,pause:false,u:false,d:false,l:false,r:false};
  if(K('ArrowLeft')||K('KeyA'))o.x-=1;if(K('ArrowRight')||K('KeyD'))o.x+=1;if(K('ArrowUp')||K('KeyW'))o.y-=1;if(K('ArrowDown')||K('KeyS'))o.y+=1;
  if(K('ArrowDown')||K('KeyS')||K('ShiftLeft')||K('ShiftRight')||K('KeyX')||K('KeyK'))o.brake=true;
  if(K('Space')||K('KeyZ')||K('KeyJ')||K('KeyN'))o.nitro=true;
  if(TS.on){o.x=TS.x;o.dig=false;}if(TS.A)o.nitro=true;if(TS.B)o.brake=true;
  if(!TS.on&&MPTR.size){let s=0;for(const v of MPTR.values())s+=v;o.x=clamp(s,-1,1);}
  for(const p of pads()){
    const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed),bv=k=>p.buttons[k]?p.buttons[k].value||0:0,lx=p.axes[0]||0,ly=p.axes[1]||0;
    if(Math.abs(lx)>.12){o.x=Math.sign(lx)*(Math.abs(lx)-.12)/.88;o.dig=false;}if(Math.abs(ly)>.5)o.y=ly;
    if(b(14))o.x=-1;if(b(15))o.x=1;if(b(12))o.y=-1;if(b(13))o.y=1;
    if(b(0)||bv(7)>.3)o.nitro=true;if(b(1)||b(2)||bv(6)>.3)o.brake=true;if(b(9))o.start=true;if(b(0))o.ok=true;if(b(1))o.back=true;
  }
  o.u=o.y<-.5;o.d=o.y>.5;o.l=o.x<-.5;o.r=o.x>.5;
  o.ok=o.ok||K('Enter')||K('Space')||K('KeyJ')||K('KeyZ')||TS.A;o.back=o.back||K('Escape')||K('Backspace');o.pause=K('Escape')||K('KeyP')||o.start;
  return o;
}
function endInputFrame(){LATCH.clear();PTR.pressed=false;PTR.released=false;}
/* =====================================================================================
   7. ARCADE BRIDGE: the 3D arcade loads cabinets in an iframe with ?embed=1.
      game -> arcade: {src:'hyperdot',type:'ready'|'score'|'over'|'exit', id, ...}
      arcade -> game: {src:'hyperdot-arcade',cmd:'start'|'pause'|'resume'|'attract'|'mute'|'unmute'}
   ===================================================================================== */
const ARC={muted:false,last:0,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:CAB.id},data||{}),'*');}catch(e){}},
  score(s){const t=performance.now();if(t-this.last>250){this.last=t;this.post('score',{score:Math.floor(s)});}},
  over(score,tickets){this.post('over',{score:Math.floor(score),tickets:CAB.tickets?Math.max(0,Math.round(tickets||0)):0});},
  exit(){this.post('exit');}
};
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){audioInit();APP_start();}
  else if(m.cmd==='pause')setPause(true);
  else if(m.cmd==='resume')setPause(false);
  else if(m.cmd==='attract')APP_attract();
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
window.HYPERDOT_GAME={id:CAB.id,title:CAB.title,tickets:CAB.tickets,version:2};
