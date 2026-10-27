/* =====================================================================================
   HYPERDOT CABINET LAYER for Skies of Aethermoor (the full game, untouched underneath).
   1. LED GLASS. A switch beside the game's own round buttons (or G on the keyboard) lays an LED panel
      over the 3D world. Right after the game draws each frame, the frame is copied on the GPU and
      redrawn as round dots: one colour per dot, 32 drive levels, a dark gap, a soft glow and a little
      bloom. Everything that is HTML (the ship panel, compass, map, tags and menus) stays sharp on top,
      so you can still read the fight. Shift+G changes the dot size.
   2. ARCADE BRIDGE. ?embed=1, ready / score / over / exit messages to the arcade, and its pause and
      mute commands, as every Hyperdot cabinet does.
   ===================================================================================== */
(()=>{
'use strict';
const ID='aethermoor',Q=new URLSearchParams(location.search),EMBED=Q.get('embed')==='1';
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}};
const PITCHES=[3,4,6];                                 /* CSS pixels per dot: fine, standard, bold */
const GLASS={on:store.get('hd-aethermoor-glass','0')==='1',pi:Math.min(2,Math.max(0,parseInt(store.get('hd-aethermoor-pitch','1'),10)||1)),k:0,prog:null,tex:null,w:0,h:0,vao:null,u:{}};
window.HYPERDOT_GAME={id:ID,title:'SKIES OF AETHERMOOR',kind:'deluxe',glass:()=>GLASS.on};

/* ---------------- the LED pass, drawn with raw WebGL2 on the game's own context ---------------- */
const VS=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const FS=`#version 300 es
precision highp float;
uniform sampler2D uT;uniform vec2 uR;uniform float uP;uniform float uK;
out vec4 o;
vec3 lin(vec3 c){return pow(max(c,0.0),vec3(2.2));}
void main(){
  vec2 px=gl_FragCoord.xy,cell=floor(px/uP),f=px/uP-cell-0.5,uv=px/uR;
  vec2 c0=(cell+0.5)*uP/uR,d=vec2(0.25*uP)/uR;
  /* one colour per dot: the average of its cell */
  vec3 c=(texture(uT,c0+vec2(-d.x,-d.y)).rgb+texture(uT,c0+vec2(d.x,-d.y)).rgb+texture(uT,c0+vec2(-d.x,d.y)).rgb+texture(uT,c0+d).rgb)*0.25;
  /* 32 drive levels per channel, the way an LED panel's driver steps them */
  c=floor(c*31.0+0.5)/31.0;
  vec3 L=lin(c);
  float r=length(f),aa=1.2/uP;
  float dotm=1.0-smoothstep(0.40-aa,0.40+aa,r);
  float glow=exp(-r*r*6.0);
  vec3 bloom=lin(textureLod(uT,uv,4.0).rgb);
  vec3 led=L*(dotm*1.85+glow*0.22)+vec3(0.018,0.016,0.024)*dotm+bloom*0.16+vec3(0.003);
  /* a faint sheen across the glass */
  led+=vec3(0.010,0.009,0.014)*smoothstep(0.9,0.0,abs(uv.x-uv.y*0.6-0.25));
  vec3 base=lin(texture(uT,uv).rgb);
  o=vec4(pow(mix(base,led,uK),vec3(1.0/2.2)),1.0);
}`;
function setupGL(gl){
  const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x;};
  const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  GLASS.prog=p;for(const n of ['uT','uR','uP','uK'])GLASS.u[n]=gl.getUniformLocation(p,n);GLASS.vao=gl.createVertexArray();
}
function post(R){
  const gl=R.getContext();if(!GLASS.on&&GLASS.k<=0)return;
  try{
    if(!GLASS.prog)setupGL(gl);
    const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);
    if(!GLASS.tex||GLASS.w!==w||GLASS.h!==h){
      if(GLASS.tex)gl.deleteTexture(GLASS.tex);GLASS.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,GLASS.tex);
      const lv=Math.floor(Math.log2(Math.max(w,h)))+1;gl.texStorage2D(gl.TEXTURE_2D,lv,gl.RGBA8,w,h);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      GLASS.w=w;GLASS.h=h;
    }else gl.bindTexture(gl.TEXTURE_2D,GLASS.tex);
    gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,w,h);gl.generateMipmap(gl.TEXTURE_2D);
    gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.STENCIL_TEST);
    gl.colorMask(true,true,true,true);gl.depthMask(false);
    gl.useProgram(GLASS.prog);gl.bindVertexArray(GLASS.vao);
    gl.uniform1i(GLASS.u.uT,0);gl.uniform2f(GLASS.u.uR,w,h);gl.uniform1f(GLASS.u.uP,PITCHES[GLASS.pi]*(w/Math.max(1,R.domElement.clientWidth||w)));gl.uniform1f(GLASS.u.uK,GLASS.k);
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindVertexArray(null);gl.depthMask(true);
  }catch(e){GLASS.on=false;GLASS.k=0;console.warn('LED glass off:',e);}
  R.resetState();
}

/* ---------------- the switch: a round button that sits beside the game's own ---------------- */
const btn=document.createElement('button');btn.id='btn-glass';btn.type='button';btn.className='panel';
btn.setAttribute('aria-label','LED glass (G)');btn.title='LED glass (G) · Shift+G changes the dot size';
btn.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">'+[0,1,2].map(y=>[0,1,2].map(x=>`<circle cx="${5+x*7}" cy="${5+y*7}" r="2.4"/>`).join('')).join('')+'</svg>';
const css=document.createElement('style');
css.textContent=`#btn-glass{position:fixed;z-index:60;display:grid;place-items:center;padding:0;cursor:pointer}
#btn-glass svg circle{fill:currentColor;opacity:.45;transition:opacity .2s,fill .2s}
#btn-glass.on svg circle{opacity:1;fill:#f2c45a;filter:drop-shadow(0 0 2px rgba(242,196,90,.9))}
#hd-glass-toast{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:61;pointer-events:none;padding:8px 16px;border-radius:10px;
  background:rgba(40,20,48,.88);border:1px solid rgba(255,236,200,.5);color:#fbefd6;font:600 14px/1.2 'Fira Sans',system-ui,sans-serif;letter-spacing:.06em;opacity:0;transition:opacity .3s}`;
document.head.appendChild(css);
const toast=document.createElement('div');toast.id='hd-glass-toast';let toastT=0;
function say(t){toast.textContent=t;toast.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>toast.style.opacity=0,1300);}
const ANCHORS=['btn-pause','btn-settings-title','btn-settings-port'];
function place(){
  let a=null;for(const id of ANCHORS){const e=document.getElementById(id);if(!e||e.hidden||!e.getClientRects().length)continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity<.05)continue;
    const r=e.getBoundingClientRect();if(r.width>0&&r.top<innerHeight*.4){a=r;break;}}
  if(!a){btn.style.display='none';return;}
  btn.style.display='';btn.style.width=a.width+'px';btn.style.height=a.height+'px';btn.style.top=a.top+'px';btn.style.left=Math.max(8,a.left-a.width-10)+'px';
}
function setGlass(on,quiet){GLASS.on=!!on;store.set('hd-aethermoor-glass',GLASS.on?'1':'0');btn.classList.toggle('on',GLASS.on);btn.setAttribute('aria-pressed',GLASS.on?'true':'false');
  if(!quiet)say(GLASS.on?'LED GLASS ON':'LED GLASS OFF');post_('glass',{on:GLASS.on});}
function nextPitch(){GLASS.pi=(GLASS.pi+1)%PITCHES.length;store.set('hd-aethermoor-pitch',GLASS.pi);say(['FINE DOTS','STANDARD DOTS','BOLD DOTS'][GLASS.pi]);if(!GLASS.on)setGlass(true,true);}
btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setGlass(!GLASS.on);btn.blur();});
btn.addEventListener('pointerdown',e=>e.stopPropagation());
addEventListener('keydown',e=>{if(e.code!=='KeyG'||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'))return;
  if(e.shiftKey)nextPitch();else setGlass(!GLASS.on);},true);

/* ---------------- the arcade bridge ---------------- */
const IN_FRAME=window.parent&&window.parent!==window;
function post_(type,data){if(!IN_FRAME)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:ID},data||{}),'*');}catch(e){}}
let pausedByArcade=false;
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;const g=window.__game;
  if(m.cmd==='mute')window.__hdSetMute&&__hdSetMute(true);
  else if(m.cmd==='unmute')window.__hdSetMute&&__hdSetMute(false);
  else if(m.cmd==='pause'){if(g&&g.mode==='voyage'&&!g.paused){g.pause(true);pausedByArcade=true;}}
  else if(m.cmd==='resume'){if(g&&pausedByArcade&&g.paused)g.pause(false);pausedByArcade=false;}
  else if(m.cmd==='glass')setGlass(m.on===undefined?!GLASS.on:m.on,true);
  else if(m.cmd==='attract'||m.cmd==='start'){/* the full game keeps its own title screen */}
});
if(EMBED)document.documentElement.classList.add('hd-embed');

/* ---------------- start once the game is up ---------------- */
let last=null,voy=null,lastScore=-1;
function hook(){
  const g=window.__game;if(!g||!g.ready||!g.renderer){setTimeout(hook,200);return;}
  const R=g.renderer,orig=R.render.bind(R);
  /* the LED pass runs straight after every frame the game draws to the screen */
  R.render=function(s,c){orig(s,c);if(R.getRenderTarget()===null)post(R);};
  document.body.appendChild(btn);document.body.appendChild(toast);setGlass(GLASS.on,true);place();
  addEventListener('resize',place);setInterval(place,400);
  let t0=performance.now();
  (function fade(t){const dt=Math.min(.1,(t-t0)/1000);t0=t;GLASS.k=Math.max(0,Math.min(1,GLASS.k+(GLASS.on?dt:-dt)/.3));requestAnimationFrame(fade);})(t0);
  /* scores: a voyage's shards while it lasts; when it ends, the shards it banked */
  setInterval(()=>{const m=g.mode,v=g.voyage;
    if(m==='voyage'&&last!=='voyage')voy={bank0:g.progress.data.shards,downed:0};
    if(m==='voyage'&&v){const sc=v.shards|0;if(sc!==lastScore){lastScore=sc;post_('score',{score:sc,downed:v.downed|0});}if(voy)voy.downed=v.downed|0;}
    if(last==='voyage'&&m!=='voyage'&&voy){const banked=Math.max(0,(g.progress.data.shards|0)-(voy.bank0|0)),sunk=!!(g.waves&&g.waves.sunk);
      post_('over',{score:banked,downed:voy.downed,sunk,tickets:Math.min(80,2+Math.round(banked/15)+voy.downed)});voy=null;lastScore=-1;}
    last=m;},250);
  post_('ready',{title:'SKIES OF AETHERMOOR',deluxe:true,glass:GLASS.on});
}
hook();
})();
