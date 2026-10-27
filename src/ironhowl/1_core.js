/* ===================== basics ===================== */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2,D2R=Math.PI/180;
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchy=matchMedia('(hover: none)').matches;
/* ===================== arcade bridge (the commands are wired up in the UI module) =====================
   The 3D Hyperdot Arcade loads this page in an iframe with ?embed=1 and talks to it by postMessage:
   game -> arcade {src:'hyperdot',id,type:'ready'|'score'|'over'|'exit',...}
   arcade -> game {src:'hyperdot-arcade',cmd:'start'|'pause'|'resume'|'attract'|'mute'|'unmute'}
   live runs from the start of a run to its single 'over'. */
const EMBED=/[?&]embed=1/.test(location.search);
const ARC={id:'ironhowl',title:'IRONHOWL',muted:false,live:false,last:0,sent:-1,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:this.id},data||{}),'*');}catch(e){}},
  begin(){this.live=true;this.sent=-1;},
  score(s){if(!this.live)return;const t=performance.now();if(s!==this.sent&&t-this.last>250){this.last=t;this.sent=s;this.post('score',{score:s});}},
  over(score,tickets){if(!this.live)return;this.live=false;this.post('over',{score,tickets:Math.max(0,Math.round(tickets||0))});},
  exit(){this.post('exit');}
};
const fmt=n=>Math.floor(n).toLocaleString('en-US');
const pick=a=>a[(Math.random()*a.length)|0];
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hexRGB(h){const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
const c255=v=>v<0?0:v>255?255:v|0;
const pack=(r,g,b,a=255)=>(((a&255)<<24)|(c255(b)<<16)|(c255(g)<<8)|c255(r))>>>0;
function rgba(c,a=1){return 'rgba('+c255(c[0])+','+c255(c[1])+','+c255(c[2])+','+a+')';}
function mixC(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function hmix(a,b,t){return rgba(mixC(hexRGB(a),hexRGB(b),t));}

/* ===================== bitmap fonts ===================== */
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
const GR={
  volt:['#ffffff','#fff7cc','#ffe46a','#ffc21a','#ff9a10','#e2600a','#902c06'],
  cyan:['#ffffff','#e6fbff','#a6f3ff','#4fe0ff','#22b4ff','#2a70ff','#3a36c8'],
  red:['#ffffff','#ffe0e6','#ff9aab','#ff4a62','#ff1a3a','#c80d2a','#7a0618'],
  steel:['#ffffff','#eef1f8','#cfd6e6','#a2adc6','#76829e','#4e5876','#2c3250'],
  pink:['#ffffff','#ffe2f2','#ffa6d6','#ff5ab4','#ff2f9a','#c81476','#760a46'],
  green:['#ffffff','#eaffe6','#b4ffaa','#6aff5a','#2ee04a','#1a9c3a','#0e5a26'],
  violet:['#ffffff','#f0e6ff','#d0b4ff','#a878ff','#8048ff','#5a2ad8','#34168a']
};

/* ===================== matrix canvases ===================== */
const RES=[[256,144],[320,180],[384,216]];
let resI=parseInt(store.get('ih-res',touchy?'1':'2'),10);if(!(resI>=0&&resI<=2))resI=touchy?1:2;
let W=384,H=216,RW=384,RH=216;
const mc=document.createElement('canvas'),g=mc.getContext('2d',{willReadFrequently:true});
const ac=document.createElement('canvas'),acx=ac.getContext('2d',{willReadFrequently:true});
let AIMG=null,RBUF=null,STAMP=null,PART=null,OLB=null;
const RESCB=[];let EM=null,DL=null;
function setRes(i){
  resI=i;W=RES[i][0];H=RES[i][1];RW=W;RH=H;mc.width=ac.width=W;mc.height=ac.height=H;
  g.imageSmoothingEnabled=false;acx.imageSmoothingEnabled=false;
  AIMG=acx.createImageData(W,H);RBUF=new Uint32Array(AIMG.data.buffer);STAMP=new Uint16Array(W*H);PART=new Uint8Array(W*H);OLB=new Int32Array(W*H);EM=new Uint8Array(W*H);DL=new Float32Array(W*H*3);
  store.set('ih-res',i);$('resv').textContent=W+'×'+H;
  for(const f of RESCB)f();
}

/* ===================== WebGL LED display ===================== */
const cv=$('gl');
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,powerPreference:'high-performance'});
let g2=null;if(!gl)g2=cv.getContext('2d');
const HDR=gl?!!gl.getExtension('EXT_color_buffer_float'):false;
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
  float fw=max(fwidth(cell.x),fwidth(cell.y));
  float d=length(f),r=.43;
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,d);
  float hot=1.0-smoothstep(0.0,r,d);
  float far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.74+.48*hot),.58,far);
  vec3 unlit=vec3(.52,.5,.62)*.016;
  vec3 col=(c*uGain+unlit)*m;
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
  if(!gl){g2.fillStyle='#07050b';g2.fillRect(0,0,VW,VH);g2.imageSmoothingEnabled=false;g2.drawImage(mc,RECT.x*DPR,RECT.y*DPR,RECT.w*DPR,RECT.h*DPR);return;}
  gl.bindTexture(gl.TEXTURE_2D,MTEX);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mc);
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.scene.f);gl.viewport(0,0,VW,VH);gl.clearColor(.02,.015,.03,1);gl.clear(gl.COLOR_BUFFER_BIT);
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
function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;$('turn').hidden=!portrait||EMBED;
  const gutL=EMBED?Math.max(0,sl):Math.max(16,sl),gutR=EMBED?Math.max(0,sr):Math.max(16,sr),top=EMBED?Math.max(0,st):Math.max(10,st)+46;
  if(portrait){
    const w=vw-gutL-gutR,h=w*9/16;RECT={x:gutL,y:top+4,w,h};
    const stick=Math.min(156,vw*.36),btn=Math.min(56,vw*.14);
    bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');
    bs.setProperty('--padTop',(RECT.y+h+26)+'px');$('turn').style.top=(RECT.y+h+8)+'px';
  }else{
    const bottom=EMBED?Math.max(0,sb):touchy?Math.max(8,sb)+4:Math.max(10,sb)+30,aw=vw-gutL-gutR,ah=vh-top-bottom;let w=aw,h=w*9/16;if(h>ah){h=ah;w=h*16/9;}
    RECT={x:gutL+(aw-w)/2,y:top+(ah-h)/2,w,h};
    if(touchy){const stick=Math.min(140,vh*.34),btn=Math.min(50,vh*.12);bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');}
  }
}

/* ===================== audio: synth, reverb, tracker, announcer ===================== */
const AU={ctx:null,out:null,mus:null,sfx:null,rev:null,dly:null,noise:null,muted:store.get('ih-mute','0')==='1',next:0,step:0,track:null,want:null};
const mtof=m=>440*Math.pow(2,(m-69)/12),now=()=>AU.ctx?AU.ctx.currentTime:0;
function audioInit(){
  try{
    if(!AU.ctx){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();AU.ctx=c;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.15;comp.connect(c.destination);
      AU.out=c.createGain();AU.out.gain.value=AU.muted||ARC.muted?0:.62;AU.out.connect(comp);
      AU.mus=c.createGain();AU.mus.gain.value=.26;AU.mus.connect(AU.out);
      AU.sfx=c.createGain();AU.sfx.gain.value=.85;AU.sfx.connect(AU.out);
      const len=c.sampleRate*2.2|0,ir=c.createBuffer(2,len,c.sampleRate);
      for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
      const cvn=c.createConvolver();cvn.buffer=ir;AU.rev=c.createGain();AU.rev.gain.value=.5;AU.rev.connect(cvn);cvn.connect(AU.out);
      const dl=c.createDelay(1);dl.delayTime.value=.3;const fb=c.createGain();fb.gain.value=.32;const dlo=c.createGain();dlo.gain.value=.35;
      dl.connect(fb);fb.connect(dl);dl.connect(dlo);dlo.connect(AU.mus);AU.dly=dl;
      const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
      AU.next=c.currentTime+.05;
    }
    if(AU.ctx.state==='suspended')AU.ctx.resume();
  }catch(e){}
}
/* master gain = the player's own Sound toggle combined with the arcade's mute */
function setVolume(){if(AU.out)AU.out.gain.value=AU.muted||ARC.muted?0:.62;}
function env(gn,t,a,peak,d){gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);gn.gain.exponentialRampToValueAtTime(.0001,t+a+d);}
function tone(f,t,dur,type,vol,bus,slide,cut,rv,att){
  const c=AU.ctx;if(!c||AU.muted)return;const o=c.createOscillator();o.type=type||'square';o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  const gn=c.createGain();env(gn,t,att||.005,vol||.1,dur);let n=o;
  if(cut){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;fl.Q.value=3;o.connect(fl);n=fl;}
  n.connect(gn);gn.connect(bus||AU.sfx);if(rv){const s=c.createGain();s.gain.value=rv;gn.connect(s);s.connect(AU.rev);}o.start(t);o.stop(t+dur+.08);
}
function noise(t,dur,vol,f0,f1,type,bus,rv,q){
  const c=AU.ctx;if(!c||AU.muted)return;const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;
  const fl=c.createBiquadFilter();fl.type=type||'lowpass';fl.Q.value=q||1;fl.frequency.setValueAtTime(f0||4000,t);fl.frequency.exponentialRampToValueAtTime(Math.max(30,f1||200),t+dur);
  const gn=c.createGain();env(gn,t,.003,vol,dur);s.connect(fl);fl.connect(gn);gn.connect(bus||AU.sfx);if(rv){const r=c.createGain();r.gain.value=rv;gn.connect(r);r.connect(AU.rev);}
  s.start(t,Math.random()*.5);s.stop(t+dur+.08);
}
const SFX={
  cannon(){const t=now();noise(t,.05,.18,3200,700,'bandpass',0,0,1.2);tone(140,t,.06,'square',.07,AU.sfx,60,900);},
  cannonOD(){const t=now();noise(t,.05,.16,5000,1400,'bandpass',0,0,1.2);tone(220,t,.05,'square',.06,AU.sfx,90,1600);},
  missile(){const t=now();noise(t,.4,.13,500,3600,'bandpass',0,.1,1.5);tone(160,t,.32,'sawtooth',.035,AU.sfx,700,1500);},
  boom(k=1){const t=now(),m=Math.min(1.5,k);noise(t,.3*k+.15,.38*m,2400,60,'lowpass',0,.3*m);tone(92,t,.28*k,'sine',.42*m,AU.sfx,28);},
  bigboom(){const t=now();noise(t,1.5,.7,3200,40,'lowpass',0,.8);tone(58,t,1.2,'sine',.7,AU.sfx,20,0,.5);noise(t,.12,.35,8000,3000,'highpass');},
  step(){const t=now();tone(64,t,.13,'sine',.2,AU.sfx,36);noise(t,.07,.08,700,140);},
  dash(){noise(now(),.28,.16,400,3800,'bandpass',0,.1,1.4);},
  heat(){noise(now(),.7,.12,7000,2000,'highpass');},
  zap(){tone(880,now(),.1,'square',.03,AU.sfx,300,2400);},
  heavy(){const t=now();tone(320,t,.18,'square',.06,AU.sfx,90,1500);noise(t,.18,.18,1600,300);},
  shell(){const t=now();tone(420,t,.2,'square',.05,AU.sfx,120,1600);noise(t,.2,.15,1400,300);},
  charge(){tone(180,now(),.9,'sawtooth',.045,AU.sfx,1500,2800);},
  laser(){const t=now();tone(104,t,1.2,'sawtooth',.07,AU.sfx,0,2200);noise(t,1.2,.07,4200,3000,'bandpass',0,0,3);},
  whistle(){tone(2000,now(),1.4,'sine',.035,AU.sfx,420);},
  pod(){noise(now(),1.2,.12,700,4400,'bandpass',0,.1,2);},
  impact(){const t=now();noise(t,.55,.5,1800,60,'lowpass',0,.35);tone(68,t,.45,'sine',.5,AU.sfx,24);},
  pickup(){const t=now();tone(1320,t,.08,'square',.05);tone(1760,t+.07,.14,'square',.05);},
  hurt(){const t=now();tone(220,t,.12,'square',.08,AU.sfx,110,1200);noise(t,.1,.22,3000,800,'bandpass');},
  clank(){const t=now();tone(1900,t,.05,'square',.03,AU.sfx,1200);noise(t,.04,.09,7000,4000,'highpass');},
  ping(){tone(2600,now(),.07,'triangle',.05);},
  crunch(){const t=now();noise(t,.22,.28,1400,160,'lowpass',0,.1);tone(110,t,.12,'square',.05,AU.sfx,50,700);},
  alarm(){const t=now();for(let i=0;i<3;i++){tone(660,t+i*.5,.25,'square',.07,AU.sfx,0,2200);tone(440,t+i*.5+.25,.25,'square',.07,AU.sfx,0,2200);}},
  howl(){const t=now();tone(52,t,1.9,'sawtooth',.24,AU.sfx,210,1400,.6,.05);tone(78,t,1.9,'sawtooth',.16,AU.sfx,320,1200,.4,.05);noise(t,1.7,.4,260,6400,'bandpass',0,.6,1);},
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  tick(){tone(1900,now(),.02,'square',.025);},
  clear(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.32,'square',.05,AU.sfx,0,0,.3));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};

let VOICE=store.get('ih-voice','1')==='1';
function say(txt){
  if(AU.muted||ARC.muted||!VOICE)return;
  try{const s=window.speechSynthesis;if(!s)return;s.cancel();const u=new SpeechSynthesisUtterance(txt);u.pitch=.3;u.rate=.9;u.volume=1;
    const vs=s.getVoices?s.getVoices():[];const v=vs.find(v=>/^en/i.test(v.lang)&&/male|daniel|alex|fred|aaron|arthur|rishi|google uk english male/i.test(v.name))||vs.find(v=>/^en/i.test(v.lang));if(v)u.voice=v;s.speak(u);}catch(e){}
}
/* ---- tracker ---- */
const SCALES={minor:[0,2,3,5,7,8,10],phryg:[0,1,3,5,7,8,10],harm:[0,2,3,5,7,8,11],dorian:[0,2,3,5,7,9,10],major:[0,2,4,5,7,9,11],penta:[0,3,5,7,10]};
function sdeg(tr,d){const sc=SCALES[tr.scale],n=sc.length,o=Math.floor(d/n),i=((d%n)+n)%n;return sc[i]+12*o;}
const LEADCH='123456789abcdefg';
const TRACKS={
  title:{bpm:92,root:40,scale:'phryg',prog:[0,1,0,6],bass:'R.....R.R.....O.',lead:'5-------6---5---3-------1---2---',kick:'x.......x.x.....',snare:'........x.......',hat:'..x...x...x...x.',pad:1,lv:.04},
  yard:{bpm:140,root:38,scale:'minor',prog:[0,0,5,6],bass:'R.RO.RR.R.RO.RF.',lead:'1.3.4.5---4.3.1.5.4.3.1---3.4.3.',kick:'x...x...x..xx...',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.x.',pad:1,lv:.04},
  docks:{bpm:150,root:45,scale:'harm',prog:[0,5,3,4],bass:'RR.R.RR.R.RRORF.',lead:'8.7.5.3.5.7.8---7.5.3.2.3.5.7---',kick:'x.....x.x.....x.',snare:'....x.......x...',hat:'xxx.xxx.xxx.xxx.',arp:'16',lv:.04},
  boss:{bpm:172,root:40,scale:'harm',prog:[0,1,5,4],bass:'R.R.RRO.R.R.RRF.',lead:'1.2.3.5.8.7.5.3.1.2.3.5.9.8.7.5.',kick:'x.........x.....',snare:'....x.......x..x',hat:'xxxxxxxxxxxxxxxx',pad:1,lv:.045},
  shop:{bpm:104,root:45,scale:'dorian',prog:[0,3,4,3],bass:'R...R.O.R...R.F.',lead:'................................',kick:'x.......x.......',snare:'................',hat:'..x...x...x...x.',arp:'8',pad:1,lv:0},
  over:{bpm:70,root:40,scale:'minor',prog:[0,5,3,4],bass:'R.......R.......',lead:'................................',kick:'x...............',snare:'................',hat:'................',pad:1,lv:0}
};

function setTrack(name){AU.want=name;}
function musicTick(paused){
  const c=AU.ctx;if(!c||c.state!=='running')return;
  if(AU.want!==AU.track){AU.track=AU.want;AU.step=0;AU.next=Math.max(AU.next,c.currentTime+.05);}
  const tr=TRACKS[AU.track];if(!tr)return;
  const sd=60/tr.bpm/4;if(AU.next<c.currentTime)AU.next=c.currentTime+.03;
  while(AU.next<c.currentTime+.15){
    const st=AU.step,s=st&15,bar=(st>>4)%tr.prog.length,d=tr.prog[bar],t=AU.next,R=tr.root;
    if(!AU.muted&&!paused){
      const bc=tr.bass[s];
      if(bc!=='.'){const n=R+sdeg(tr,d)+(bc==='O'?12:bc==='F'?sdeg(tr,d+4)-sdeg(tr,d):bc==='T'?sdeg(tr,d+2)-sdeg(tr,d):0);tone(mtof(n),t,sd*1.7,'sawtooth',.13,AU.mus,0,700);}
      if(tr.kick[s]==='x'){const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);const gn=c.createGain();env(gn,t,.002,.45,.16);o.connect(gn);gn.connect(AU.mus);o.start(t);o.stop(t+.22);}
      if(tr.snare[s]==='x'){noise(t,.14,.24,2800,900,'bandpass',AU.mus);tone(190,t,.06,'triangle',.08,AU.mus,120);}
      if(tr.hat[s]==='x')noise(t,.025,.06,9000,7000,'highpass',AU.mus);
      const lc=tr.lead[st%32];
      if(lc&&lc!=='.'&&lc!=='-'&&tr.lv){let len=1;while(tr.lead[(st+len)%32]==='-'&&len<16)len++;const dg=LEADCH.indexOf(lc);
        const o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(mtof(R+24+sdeg(tr,dg)),t);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2600;
        const gn=c.createGain();env(gn,t,.01,tr.lv,sd*len*.95);o.connect(fl);fl.connect(gn);gn.connect(AU.mus);gn.connect(AU.dly);o.start(t);o.stop(t+sd*len+.1);}
      if(tr.arp){const ev=tr.arp==='16'?1:2;if(s%ev===0){const k=(s/ev|0)%4,deg=[0,2,4,7][k];tone(mtof(R+12+sdeg(tr,d+deg)),t,sd*ev*.9,'triangle',.035,AU.mus);}}
      if(tr.pad&&s===0){for(const k of [0,2,4]){const f=mtof(R+12+sdeg(tr,d+k));tone(f,t,sd*15,'sawtooth',.018,AU.mus,0,900,0,sd*4);tone(f*1.006,t,sd*15,'sawtooth',.014,AU.mus,0,900,0,sd*4);}}
    }
    AU.next+=sd;AU.step++;
  }
}

/* ===================== input: keyboard + mouse, gamepads, twin touch sticks ===================== */
const KEY={},LATCH=new Set();
const GAMEKEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Tab']);
const KEYHOOK=[];
addEventListener('keydown',e=>{if(GAMEKEYS.has(e.code))e.preventDefault();KEY[e.code]=true;if(e.repeat)return;LATCH.add(e.code);audioInit();for(const f of KEYHOOK)f(e.code);});
addEventListener('keyup',e=>{KEY[e.code]=false;});
addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;MOUSE.l=MOUSE.r=false;});
const K=c=>KEY[c]||LATCH.has(c);
const MOUSE={x:0,y:0,on:false,l:false,r:false,lp:false,rp:false,last:0};
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;MOUSE.x=(e.clientX-RECT.x)/RECT.w*W;MOUSE.y=(e.clientY-RECT.y)/RECT.h*H;MOUSE.on=true;MOUSE.last=performance.now();});
cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;audioInit();MOUSE.on=true;MOUSE.x=(e.clientX-RECT.x)/RECT.w*W;MOUSE.y=(e.clientY-RECT.y)/RECT.h*H;if(e.button===0){MOUSE.l=true;MOUSE.lp=true;}if(e.button===2){MOUSE.r=true;MOUSE.rp=true;}});
addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;if(e.button===0)MOUSE.l=false;if(e.button===2)MOUSE.r=false;});
function pads(){try{const gp=navigator.getGamepads?navigator.getGamepads():[];const out=[];for(const p of gp)if(p&&p.connected!==false)out.push(p);return out;}catch(e){return [];}}
function padHeld(i){for(const p of pads())if(p.buttons[i]&&p.buttons[i].pressed)return true;return false;}
const TS={mx:0,my:0,ax:0,ay:0,aOn:false,M:false,D:false,H:false};
function stick(el,kn,cb){
  let id=null,cx=0,cy=0;
  const set=(x,y)=>{const dx=x-cx,dy=y-cy,r=el.clientWidth*.5,l=Math.hypot(dx,dy),k=l>r*.62?r*.62/l:1;kn.style.transform=`translate(${dx*k}px,${dy*k}px)`;const m=Math.min(1,l/(r*.62));cb(l>2?dx/l*m:0,l>2?dy/l*m:0,true);};
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();id=e.pointerId;const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;try{el.setPointerCapture(id);}catch(_){}set(e.clientX,e.clientY);});
  el.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX,e.clientY);});
  const end=e=>{if(e.pointerId!==id)return;id=null;kn.style.transform='';cb(0,0,false);};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
}
stick($('stL'),$('knL'),(x,y)=>{TS.mx=x;TS.my=y;});
stick($('stR'),$('knR'),(x,y,on)=>{TS.ax=x;TS.ay=y;TS.aOn=on;});
for(const [bid,k] of [['bM','M'],['bD','D'],['bH','H']]){
  const el=$(bid);
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();TS[k]=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId);}catch(_){}});
  const up=()=>{TS[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
}
/* one control snapshot per frame */
let AIMMODE='mouse';
function readCtl(){
  const o={mx:0,my:0,ax:0,ay:0,aim:null,px:0,py:0,fire:false,missile:false,dash:false,howl:false,start:false,u:false,d:false,l:false,r:false,ok:false,back:false};
  if(K('KeyA'))o.mx-=1;if(K('KeyD'))o.mx+=1;if(K('KeyW'))o.my-=1;if(K('KeyS'))o.my+=1;
  let kx=0,ky=0;if(K('ArrowLeft'))kx-=1;if(K('ArrowRight'))kx+=1;if(K('ArrowUp'))ky-=1;if(K('ArrowDown'))ky+=1;
  if(kx||ky){o.aim='dir';o.ax=kx;o.ay=ky;o.fire=true;AIMMODE='keys';}
  else if(MOUSE.on&&(AIMMODE!=='keys'||performance.now()-MOUSE.last<400)){o.aim='point';o.px=MOUSE.x;o.py=MOUSE.y;AIMMODE='mouse';if(MOUSE.l)o.fire=true;}
  if(MOUSE.r||K('Space'))o.missile=true;if(K('ShiftLeft')||K('ShiftRight'))o.dash=true;if(K('KeyE')||K('KeyQ'))o.howl=true;
  if(K('KeyJ'))o.fire=true;if(K('KeyK'))o.missile=true;if(K('KeyL'))o.dash=true;
  if(TS.mx||TS.my){o.mx=TS.mx;o.my=TS.my;}
  if(TS.aOn&&(TS.ax||TS.ay)){o.aim='dir';o.ax=TS.ax;o.ay=TS.ay;o.fire=true;}
  if(TS.M)o.missile=true;if(TS.D)o.dash=true;if(TS.H)o.howl=true;
  for(const p of pads()){
    const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed),lx=p.axes[0]||0,ly=p.axes[1]||0,rx=p.axes[2]||0,ry=p.axes[3]||0;
    if(Math.hypot(lx,ly)>.2){o.mx=lx;o.my=ly;}
    if(b(14))o.mx=-1;if(b(15))o.mx=1;if(b(12))o.my=-1;if(b(13))o.my=1;
    if(Math.hypot(rx,ry)>.3){o.aim='dir';o.ax=rx;o.ay=ry;if(Math.hypot(rx,ry)>.55)o.fire=true;}
    if(b(7)||b(2))o.fire=true;if(b(5)||b(0))o.missile=true;if(b(4)||b(1))o.dash=true;if(b(3)||b(6))o.howl=true;if(b(9))o.start=true;
    if(b(0))o.ok=true;if(b(1))o.back=true;
  }
  const ml=Math.hypot(o.mx,o.my);if(ml>1){o.mx/=ml;o.my/=ml;}
  o.u=o.my<-.5||K('ArrowUp');o.d=o.my>.5||K('ArrowDown');o.l=o.mx<-.5||K('ArrowLeft');o.r=o.mx>.5||K('ArrowRight');
  o.ok=o.ok||K('Enter')||K('Space')||K('KeyJ')||MOUSE.lp;o.back=o.back||K('Escape')||K('KeyK');o.start=o.start||K('Enter');
  return o;
}
function endInputFrame(){LATCH.clear();MOUSE.lp=MOUSE.rp=false;}
