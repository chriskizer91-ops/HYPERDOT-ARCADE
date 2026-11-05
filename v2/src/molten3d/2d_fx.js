/* ---------------------------------------------------------------------------------
   PAINTED EFFECTS — the six effect pictures (6.1 to 6.6) as billboards in the cave: a slag
   bomb's blast, sparks and smoke; a Rime bursting into shards and steam; molten iron
   splashing where the pour lands. They face the camera, grow and fade; fire adds light,
   smoke and steam are lit by the cave. Rock in front hides them.
   --------------------------------------------------------------------------------- */
const FXK={steam:0,smoke:1,blast:2,sparks:3,shatter:4,splash:5};
const FXB=[];const FXBMAX=72;let P_FB=null,FBVAO=null;
const VS_FB=`layout(location=0) in vec2 aQ;uniform mat4 uVP;uniform vec3 uC;uniform vec2 uS;uniform float uRot;uniform vec3 uR;uniform vec3 uU;out vec2 vQ;out vec3 vW;
void main(){float c=cos(uRot),s=sin(uRot);vec2 q=vec2(aQ.x*c-aQ.y*s,aQ.x*s+aQ.y*c);vQ=aQ*.5+.5;vec3 w=uC+(uR*q.x*uS.x+uU*q.y*uS.y);vW=w;gl_Position=uVP*vec4(w,1.);}`;
const FS_FB=`precision highp sampler2DArray;in vec2 vQ;in vec3 vW;uniform sampler2DArray uFx;uniform float uL;uniform float uA;uniform int uK;uniform vec3 uTn;
uniform sampler2D uLight;uniform vec2 uLSz;uniform float uLQ;uniform float uAmb;uniform vec3 uTint;out vec4 o;
void main(){vec3 t=texture(uFx,vec3(vQ.x,1.-vQ.y,uL)).rgb;
  if(uK==0){o=vec4(t*uTn*uA,0.);return;}                     /* fire, sparks, shards, splashes: light added */
  float a=clamp(dot(t,vec3(.3,.55,.15))*1.6,0.,1.)*uA;         /* smoke and steam: lit by the cave around them */
  vec3 L=texture(uLight,vec2(vW.x,-vW.y)/uLSz).rgb*(uLQ<.5?2.6:1.);
  vec3 c=(uK==1?vec3(.16,.13,.12):vec3(.8,.84,.9))*(L*1.2+uAmb*uTint*2.5+.02);
  o=vec4(c*a,a);}`;
function fxb(k,x,y,z,s0,s1,life,o){if(FXB.length>=FXBMAX)FXB.shift();o=o||{};FXB.push({k:FXK[k],x,y,z:z||0,s0,s1,life,t:0,rot:o.rot!=null?o.rot:Math.random()*TAU,spin:o.spin||0,a:o.a||1,vy:o.vy||0,vx:o.vx||0,tn:o.tn||[1,1,1],up:!!o.up});}
/* the moments that call for them */
function fxBoom(x,y){fxb('blast',x,y,2,10,36,.55,{a:1.7});fxb('sparks',x,y,3,14,46,.9,{a:1.4,spin:.6});fxb('smoke',x,y-4,-1,12,44,2.6,{a:.75,vy:-9,spin:.15});fxb('smoke',x+6,y-2,1,10,34,2.2,{a:.55,vy:-7,spin:-.2});}
function fxBurst(x,y,w,h){const s=Math.max(w,h);fxb('shatter',x,y,1,s*.7,s*2.3,.38,{a:1.3,tn:[.75,.95,1.2]});fxb('steam',x,y-2,0,s*.6,s*1.8,1.4,{a:.6,vy:-8});}
function fxGiantBurst(x,y){fxb('shatter',x,y,2,30,120,.7,{a:1.5,tn:[.75,.95,1.2]});fxb('shatter',x-14,y+10,4,20,70,.55,{a:1.1,tn:[.75,.95,1.2]});for(let k=0;k<4;k++)fxb('steam',x+(k-1.5)*14,y-6,0,20,60,2.6,{a:.6,vy:-10});}
function fxSplash(x,y,big){fxb('splash',x,y-(big?5:3.2),2,big?9:5,big?17:10,big?.4:.28,{a:big?1.4:1.1,rot:(Math.random()-.5)*.3,up:1});if(Math.random()<.25)fxb('sparks',x,y-2,2,8,20,.5,{a:.7});}
function fxbStep(dt){for(let i=FXB.length-1;i>=0;i--){const f=FXB[i];f.t+=dt;f.y+=f.vy*dt;f.x+=f.vx*dt;f.rot+=f.spin*dt;if(f.t>=f.life)FXB.splice(i,1);}}
/* where the pour lands: straight down from the nozzle to the first thing in the way */
let POURFX=0;
function pourSplash(dt){
  if(!(CR.pouring&&CR.rod>.4&&!CR.refill&&CR.fill>1)){POURFX=0;return;}
  POURFX-=dt;if(POURFX>0)return;POURFX=.09+Math.random()*.08;
  const x=Math.round(CR.nx);if(x<1||x>W-2)return;let y=Math.round(CR.ny)+2;while(y<H-1&&(M[y*W+x]===AIR||M[y*W+x]===STEAM||M[y*W+x]===SMOKE))y++;
  if(y<H-1)fxSplash(x+.5,y,M[y*W+x]===LAVA&&Math.random()<.3);
}
function buildFX(){
  try{P_FB=prog(VS_FB,FS_FB);}catch(e){console.error(e);P_FB=null;return;}
  FBVAO=gl.createVertexArray();gl.bindVertexArray(FBVAO);const q=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,q);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
  const names=['fx_steam','fx_smoke','fx_blast','fx_sparks','fx_shatter','fx_splash'];if(!ART.fx_blast)return;
  TX.fx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.fx);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,9,gl.SRGB8_ALPHA8,256,256,names.length);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  let left=names.length;
  names.forEach((n,i)=>{const im=new Image();im.onload=()=>{gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.fx);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,256,256,1,gl.RGBA,gl.UNSIGNED_BYTE,im);
    if(--left===0){gl.generateMipmap(gl.TEXTURE_2D_ARRAY);TX.fxOk=1;}};im.src=ART[n];});
}
function drawFXB(){
  if(!P_FB||!TX.fxOk||!FXB.length)return;
  const fw=V3.norm(V3.sub([CS.tx,-CS.ty,0],CAM.eye)),R=V3.norm(V3.cross(fw,[0,1,0])),U=V3.cross(R,fw);
  gl.depthMask(false);gl.enable(gl.BLEND);gl.useProgram(P_FB.p);const u=P_FB.u;setLightU(u);
  gl.uniformMatrix4fv(u.uVP,false,CAM.VP);gl.uniform3fv(u.uR,R);gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.fx);gl.uniform1i(u.uFx,10);
  gl.bindVertexArray(FBVAO);
  for(const f of FXB){const k=f.t/f.life,e=1-Math.pow(1-k,2.2),s=f.s0+(f.s1-f.s0)*e;
    const add=f.k>=2,fade=add?Math.pow(1-k,1.6)*(k<.08?k/.08:1):(1-k)*(k<.15?k/.15:1);
    if(add)gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ZERO,gl.ONE);else gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE);
    gl.uniform3fv(u.uU,f.up?[0,1,0]:U);gl.uniform3f(u.uC,f.x,-f.y,f.z);gl.uniform2f(u.uS,s*.5,s*.5);gl.uniform1f(u.uRot,f.up?f.rot*.2:f.rot);
    gl.uniform1f(u.uL,f.k);gl.uniform1f(u.uA,f.a*fade);gl.uniform1i(u.uK,add?0:f.k===FXK.smoke?1:2);gl.uniform3fv(u.uTn,f.tn);
    gl.drawArrays(gl.TRIANGLES,0,6);}
  gl.disable(gl.BLEND);gl.depthMask(true);gl.bindVertexArray(null);
}
/* ---------------------------------------------------------------------------------
   CARDS — the four paintings (7.1 to 7.4): the title (it opens the game, then the live
   cave rises through it), the Anvil behind the upgrade cards, the Rime Queen as she
   arrives, and the ending. Drawn into the scene, under the dot-screen text.
   --------------------------------------------------------------------------------- */
const CARD={img:{},cur:'',ok:0,tex:null,asp:16/9};let P_CD=null;
const FS_CD=`in vec2 vT;uniform sampler2D uC;uniform float uA;uniform float uZ;uniform float uSa;uniform float uCa;uniform float uDim;out vec4 o;
void main(){vec2 q=vT-.5;float k=uSa/uCa;if(k>1.)q.y/=k;else q.x*=k;q=q/uZ+.5;vec3 c=texture(uC,vec2(q.x,1.-q.y)).rgb;
  float v=1.-.55*pow(length(vT-.5)*1.3,2.);o=vec4(c*v*uDim*uA,uA);}`;
function cardWant(){
  if(S.mode==='title'){const a=S.t<4.6?1:Math.max(0,1-(S.t-4.6)/1.6);return a>0?['card_title',a,.82,1.06-.05*Math.min(1,S.t/6)]:null;}
  if(S.mode==='anvil')return ['card_anvil',Math.min(1,S.t*2.5)*.8,.55,1.02+.03*Math.min(1,S.t/8)];
  if(S.mode==='ending')return ['card_end',Math.min(1,S.t*.7)*.85,.7,1.03+.04*Math.min(1,S.t/12)];
  if(BOSS.on&&BOSS.kind==='queen'&&BOSS.t<4.2){const t=BOSS.t,a=t<.35?t/.35:t>3.2?Math.max(0,(4.2-t)):1;return ['card_queen',a*.92,.85,1.08-.06*t/4.2];}
  return null;
}
function drawCard(){
  const w=cardWant();if(!w||!ART[w[0]])return;
  if(!P_CD){try{P_CD=prog(VS,FS_CD);}catch(e){console.error(e);P_CD=-1;}CARD.tex=gl.createTexture();}
  if(P_CD===-1)return;
  if(CARD.cur!==w[0]){CARD.cur=w[0];CARD.ok=0;let im=CARD.img[w[0]];
    const put=()=>{if(CARD.cur!==w[0])return;gl.bindTexture(gl.TEXTURE_2D,CARD.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);CARD.asp=im.width/im.height;CARD.ok=1;};
    if(im&&im.complete&&im.naturalWidth)put();else{if(!im){im=new Image();CARD.img[w[0]]=im;im.src=ART[w[0]];}im.addEventListener('load',put,{once:true});}}
  if(!CARD.ok||w[1]<=.002)return;
  gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE);
  gl.useProgram(P_CD.p);const u=P_CD.u;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,CARD.tex);gl.uniform1i(u.uC,0);
  const portrait=document.body.classList.contains('portrait'),sa=portrait?RECT.w/RECT.h:FB.sc.w/FB.sc.h;
  gl.uniform1f(u.uA,w[1]);gl.uniform1f(u.uDim,w[2]);gl.uniform1f(u.uZ,w[3]);gl.uniform1f(u.uSa,sa);gl.uniform1f(u.uCa,CARD.asp);
  gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);
}
/* the first paintings are wanted at once: decode them early */
function cardsPreload(){for(const k of ['card_title'])if(ART[k]&&!CARD.img[k]){const im=new Image();CARD.img[k]=im;im.src=ART[k];}}
