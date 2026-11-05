/* =====================================================================================
   2f. THE FRAME
     1 reflection: the city drawn upside down under the road, into a small picture
     2 the scene: sky, road (reading that picture), city, vehicles, then the glowing bits
     3 glow: the brightest light, blurred a little (kept tight: crisp, not hazy)
     4 prism trails: the glow fed back into itself, pushed outward and split into colour
     5 the final picture: speed blur at the edges, grade, and the dot HUD
   ===================================================================================== */
const RAIN_VS=`layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;
uniform mat4 uVP;uniform vec3 uBox,uOffs,uVel,uT1,uT2;uniform float uLen;out vec4 vC;out vec2 vU;
void main(){
  vec3 p=fract(aPos+uOffs)*uBox-uBox*vec3(.5,.18,.22);
  vec3 d=uVel*uLen;vec3 at=p-d*aNrm.x;
  vec3 side=normalize(cross(d+vec3(0.,.001,0.),at));float w=.006+.0012*length(at);at+=side*aNrm.y*w;
  float fade=smoothstep(46.,10.,length(p))*smoothstep(.5,3.,length(p));
  vC=vec4(mix(uT1,uT2,step(.5,fract(aPos.x*7.31))),.55*fade);vU=vec2(1.-aNrm.x*.85,aNrm.y*.5+.5);
  gl_Position=uVP*vec4(at,1.);
}`;
let P_W,P_SKY,P_FX,P_RAIN,P_BR,P_BL,P_TR,P_CO,VAO0,HTEX,RAINM=null,FXM=null;
const RT={};let CW=2,CH_=2,RTW=2,RTH=2,DPR=1,RECT={x:0,y:0,w:100,h:56};
const QUALS=[
  {name:'LOW',px:.55e6,msaa:0,refl:0,taps:4,rain:450,lights:6},
  {name:'MEDIUM',px:1.1e6,msaa:2,refl:.42,taps:6,rain:850,lights:10},
  {name:'HIGH',px:2.4e6,msaa:4,refl:.5,taps:10,rain:1400,lights:14}];
const QS={i:0,auto:true,ema:16.7,t:0,low:0,drops:0};
{const sv=store.get('hd-prisma3d-q','auto');QS.auto=sv==='auto';QS.i=QS.auto?(touchy?1:2):clamp(parseInt(sv,10)||1,0,2);}
const qnow=()=>QUALS[QS.i];
function glInit(){
  P_W=prog(WORLD_VS,WORLD_FS,'world');P_SKY=prog(FS_VS,SKY_FS,'sky');P_FX=prog(FX_VS,FX_FS,'fx');P_RAIN=prog(RAIN_VS,FX_FS,'rain');
  P_BR=prog(FS_VS,BRIGHT_FS,'bright');P_BL=prog(FS_VS,BLUR_FS,'blur');P_TR=prog(FS_VS,TRAIL_FS,'trail');P_CO=prog(FS_VS,COMP_FS,'comp');
  VAO0=gl.createVertexArray();
  HTEX=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  buildModels();buildRain();artInit();
}
function buildRain(){
  const n=1400,M=new MB(),rng=mulberry(77);
  for(let i=0;i<n;i++){const s=[rng(),rng(),rng()];
    const V=(e,sd)=>M.vert(s[0],s[1],s[2],e,sd,0,[1,1,1],0,null);V(0,-1);V(0,1);V(1,1);V(0,-1);V(1,1);V(1,-1);}
  RAINM=M.upload();
}
function makeTargets(){
  for(const k in RT){freeTarget(RT[k]);delete RT[k];}
  const q=qnow();const sc=Math.min(1,Math.sqrt(q.px/(CW*CH_)));RTW=Math.max(2,Math.round(CW*sc));RTH=Math.max(2,Math.round(CH_*sc));
  RT.sc=mkTarget(RTW,RTH,{depth:true});
  RT.ms=q.msaa?mkMSTarget(RTW,RTH,Math.min(q.msaa,gl.getParameter(gl.MAX_SAMPLES)||0)):null;
  if(q.refl)RT.rf=mkTarget(Math.round(RTW*q.refl),Math.round(RTH*q.refl),{depth:true,mips:true});
  const hw=RTW>>1,hh=RTH>>1;RT.b1=mkTarget(hw,hh);RT.b1b=mkTarget(hw,hh);RT.b2=mkTarget(RTW>>2,RTH>>2);RT.b2b=mkTarget(RTW>>2,RTH>>2);
  RT.tr0=mkTarget(hw,hh);RT.tr1=mkTarget(hw,hh);
  for(const k of ['tr0','tr1']){gl.bindFramebuffer(gl.FRAMEBUFFER,RT[k].f);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);}
}
function setQuality(i,auto){QS.i=clamp(i,0,2);QS.auto=!!auto;store.set('hd-prisma3d-q',QS.auto?'auto':String(QS.i));QS.ema=16.7;QS.t=0;QS.low=0;if(gl)makeTargets();}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);CW=Math.max(2,Math.round(innerWidth*DPR));CH_=Math.max(2,Math.round(innerHeight*DPR));cv.width=CW;cv.height=CH_;
  RECT={x:0,y:0,w:innerWidth,h:innerHeight};
  H=H_M;W=Math.max(200,Math.round(H*innerWidth/Math.max(1,innerHeight)));mc.width=W;mc.height=H;g.imageSmoothingEnabled=false;
  if(gl)makeTargets();layout();
}
function layout(){
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('embed',EMBED);
  $('turn').hidden=!portrait||EMBED;
  const bs=document.body.style;bs.setProperty('--stick',Math.round(Math.min(150,Math.min(vw,vh)*.34))+'px');bs.setProperty('--b',Math.round(Math.min(64,Math.min(vw,vh)*.14))+'px');
  stickRest();
}
/* ---------- matrices ---------- */
const VPM=new Float32Array(16),VPMIRR=new Float32Array(16);let PREVF=null;
function makeVP(out,near,far){
  const asp=RTW/RTH,fy=2/CAM.fov,fx=fy/asp,A=(far+near)/(far-near),B=-2*far*near/(far-near),r=CAM.r,u=CAM.u,f=CAM.f;
  out.set([fx*r[0],fy*u[0],A*f[0],f[0], fx*r[1],fy*u[1],A*f[1],f[1], fx*r[2],fy*u[2],A*f[2],f[2], 0,0,B,0]);
}
function toUV(dir){const z=v3.dot(dir,CAM.f);if(z<=1e-4)return [.5,.5];const asp=RTW/RTH;return [.5+v3.dot(dir,CAM.r)/z/CAM.fov/asp,.5+v3.dot(dir,CAM.u)/z/CAM.fov];}
/* ---------- uniforms the world shader needs every frame ---------- */
const ULP=new Float32Array(56),ULC=new Float32Array(56),ULD=new Float32Array(56),UPAD=new Float32Array(24);let NL=0;
function trackOf(w){return [w[0]-pX(w[2]),w[1]-pY(w[2]),w[2]];}
function addLight(q,col,k,dir,cut){if(NL>=qnow().lights)return;ULP.set([q[0],q[1],q[2],k],NL*4);ULC.set([col[0],col[1],col[2],0],NL*4);ULD.set(dir?[dir[0],dir[1],dir[2],cut]:[0,0,0,-2],NL*4);NL++;}
function gatherLights(){
  NL=0;const B=BK,T=TG,t=S.clock,ni=B.nitroT>0?1:B.boostT>0?.5:0;
  const yr=Math.atan2(B.vu,Math.max(1,B.vs));
  addLight([B.u,B.h+.32,B.s],[.55*(1.5+ni*1.6),.9*(1.5+ni*1.6),1.6+ni*1.6],.9);
  addLight([B.u+Math.sin(yr)*2.1,B.h+.85,B.s+2.1],[2.4,2.35,2.2],.003,[Math.sin(yr),-.06,Math.cos(yr)],.9);
  if(T.on){const pulse=.5+.5*Math.cos(t*9);
    addLight([T.u,T.h+1.4,T.s-3.7],[2.6,.16,.1],.18);
    addLight([T.u,T.h+3.6,T.s+1.7],[.9+1.1*pulse,.45+.55*pulse,.05],.08);
    for(const d of DR){if(!d.on)continue;const dq=trackOf([d.x,d.y,d.z]);const tq=[T.u,T.h+1,T.s];const v=v3.norm(v3.sub(tq,dq));addLight(dq,[2.6,2.7,3.2],.0012,v,.975);}
    const ph=(t*3)%1<.5;const d0=DR[0];if(d0.on){const dq=trackOf([d0.x,d0.y,d0.z]);addLight(dq,ph?[2.4,.15,.1]:[.25,.5,2.6],.06);}
  }
  const near=[];for(const c of TR.cars){const ds=c.s-B.s;if(ds>-8&&ds<140)near.push([ds,c]);}near.sort((a,b)=>a[0]-b[0]);
  for(const [ds,c] of near.slice(0,4)){addLight([c.u,c.h+.85,c.s-c.L-.3],[1.4+c.brake*2.4,.07,.05],.35);addLight([c.u,c.h+.8,c.s+c.L+.5],[3,2.9,2.6],.004,[0,-.05,1],.88);}
  UPAD.fill(0);let np=0;for(const f of FEAT.list){if(f.k!=='pad'||np>=6)continue;if(f.z+f.len<CAM.s-6||f.z>CAM.s+480)continue;UPAD.set([f.z,f.u,f.len,0],np*4);np++;}
}
let BOLT=0;
function worldUniforms(P,mirror){
  const u=P.u;gl.useProgram(P.p);
  gl.uniform3fv(u.uPA,ST.PA);gl.uniform3fv(u.uPF,ST.PF);gl.uniform3fv(u.uPP,ST.PP);gl.uniform2fv(u.uYA,ST.YA);gl.uniform2fv(u.uYF,ST.YF);gl.uniform2fv(u.uYP,ST.YP);
  gl.uniformMatrix4fv(u.uVP,false,VPM);gl.uniform3fv(u.uEye,CAM.eye);gl.uniform1f(u.uMirror,mirror?1:0);
  gl.uniform1i(u.uStage,ST.id);gl.uniform1f(u.uTime,S.clock%600);gl.uniform1f(u.uWet,ST.wet);gl.uniform1f(u.uRain,ST.rain);gl.uniform1f(u.uFogD,ST.fogD*.75);
  gl.uniform1i(u.uTex,TX.on);gl.uniform4fv(u.uSignR,SIGNR);gl.uniform4fv(u.uSignC,SIGNC);
  {const L=SIGNCAT[bladeCat()]||[0];gl.uniform2i(u.uSignCat,L[0],L.length);}
  gl.uniform1f(u.uShopH,ST.id===1?4.5:5.3);gl.uniform1f(u.uShopL,ST.id===1?1:0);
  const T=(unit,target,t,name)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(target,t||null);gl.uniform1i(u[name],unit);};
  T(1,gl.TEXTURE_2D_ARRAY,TX.fac,'uFac');T(2,gl.TEXTURE_2D_ARRAY,TX.shop,'uShop');T(3,gl.TEXTURE_2D_ARRAY,TX.surf,'uSurf');T(4,gl.TEXTURE_2D_ARRAY,TX.ads,'uAds');
  T(5,gl.TEXTURE_2D,TX.signs,'uSigns');T(6,gl.TEXTURE_2D,null,'uVT');T(7,gl.TEXTURE_2D,null,'uDec');gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(u.uSpeed,clamp(BK.vs/100,0,1.4));gl.uniform1f(u.uBolt,BOLT);
  gl.uniform3fv(u.uN1,ST.N1);gl.uniform3fv(u.uN2,ST.N2);gl.uniform3fv(u.uN3,ST.N3);gl.uniform3fv(u.uFogC,fogC());gl.uniform3fv(u.uSkyA,SU_SKYA);gl.uniform3fv(u.uSkyB,SU_SKYB);
  gl.uniform3fv(u.uEyeQ,trackOf(CAM.eye));
  gl.uniform4fv(u.uLP,ULP);gl.uniform4fv(u.uLC,ULC);gl.uniform4fv(u.uLD,ULD);gl.uniform1i(u.uNL,NL);gl.uniform4fv(u.uPad,UPAD);
  gl.uniform1f(u.uReflOn,RT.rf&&!mirror?1:0);gl.uniform2f(u.uRes,RTW,RTH);
  if(RT.rf){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mirror?null:RT.rf.t);gl.uniform1i(u.uRefl,0);}
  gl.uniform4f(u.uOff,0,0,0,1);gl.uniform1i(u.uSpace,0);gl.uniform3f(u.uPaint,1,1,1);gl.uniform4f(u.uVeh,0,0,0,0);
}
let SU_SKYA=[0,0,0],SU_SKYB=[0,0,0];
function fogC(){const f=ST.fog;if(!(TX.on&TXF.SKY))return f;const k=SKY_FOG[STAGE_SKY[ST.id]];return [f[0]*.4+k[0]*.6,f[1]*.4+k[1]*.6,f[2]*.4+k[2]*.6];}
const MM=new Float32Array(16);
/* a model matrix relative to the eye: yaw about up, lean about forward, pitch about right */
function modelMat(s,u,h,yaw,lean,pitch,k){
  const p=W3(s,u,h),e=CAM.eye,cy=Math.cos(yaw),sy=Math.sin(yaw);
  let F=[sy,0,cy],R=[cy,0,-sy],U=[0,1,0];
  if(pitch){const c=Math.cos(pitch),sn=Math.sin(pitch);const F2=v3.add(v3.mul(F,c),v3.mul(U,sn)),U2=v3.sub(v3.mul(U,c),v3.mul(F,sn));F=F2;U=U2;}
  if(lean){const c=Math.cos(lean),sn=Math.sin(lean);const U2=v3.add(v3.mul(U,c),v3.mul(R,sn)),R2=v3.sub(v3.mul(R,c),v3.mul(U,sn));U=U2;R=R2;}
  k=k||1;MM.set([R[0]*k,R[1]*k,R[2]*k,0,U[0]*k,U[1]*k,U[2]*k,0,F[0]*k,F[1]*k,F[2]*k,0,p[0]-e[0],p[1]-e[1],p[2]-e[2],1]);return MM;
}
function drawMesh(M){if(!M||!M.n)return;gl.bindVertexArray(M.vao);gl.drawArrays(gl.TRIANGLES,0,M.n);}
const CARPAINT=new WeakMap();let PAINTN=0;
const BIKE_PAINT=[.05,.055,.08],VAN_PAINT=[.62,.38,.05];
/* where the PRISMA decal sits on the bike's rear fairing: z from, z to, y top, y bottom (metres, the bike's own frame) */
const BIKE_DECAL=[-1.62,-.55,.98,.8];
function bikeLean(){return -BK.bank*1.15;}
function bikePitch(){return BK.air?clamp(Math.atan2(BK.vh,Math.max(1,BK.vs))*.8,-.3,.35):0;}
/* carved vehicles: tell the shader where each view of the design sheet sits */
function projUniforms(u,d,mode,tex){
  const b=d.b;gl.uniform4f(u.uPB,b[0],b[1],b[2],b[3]);gl.uniform4f(u.uPZ,b[4],b[5],d.w?d.w[0]:b[1]-b[0],d.w?d.w[1]:b[1]-b[0]);
  gl.uniform4fv(u.uPRs,d.side);gl.uniform4fv(u.uPRb,d.back||d.top||d.side);gl.uniform4fv(u.uPRf,d.front||d.side);gl.uniform1i(u.uPMode,mode);
  gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,tex);gl.activeTexture(gl.TEXTURE0);gl.uniform1f(u.uDecOn,0);gl.uniform1f(u.uHue,0);
}
function decalUniforms(u,on,tex,zy,r,glow){gl.uniform1f(u.uDecOn,on?1:0);if(!on)return;gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,tex);gl.activeTexture(gl.TEXTURE0);gl.uniform4fv(u.uDecZY,zy);gl.uniform4fv(u.uDecR,r);gl.uniform1f(u.uDecGlow,glow);}
const CARHUE=[0,.9,2.1,3.3,4.4];
function drawVehicles(P,mirror){
  const u=P.u;gl.uniform1i(u.uSpace,1);const B=BK,carved=(TX.on&TXF.VEH)!==0;
  /* traffic */
  for(const c of TR.cars){const ds=c.s-CAM.s;if(ds<-14||ds>560)continue;
    let pi=CARPAINT.get(c);if(pi==null){pi=(PAINTN++*5+3)%PAINTS.length;if(c.type===4)pi=4;CARPAINT.set(c,pi);}
    gl.uniformMatrix4fv(u.uModel,false,modelMat(c.s,c.u,c.h+Math.sin(S.clock*3+c.s*.1)*.03,c.yaw,0,0));gl.uniform3fv(u.uPaint,PAINTS[pi]);
    gl.uniform4f(u.uVeh,c.brake,c.blink,0,0);
    if(carved){projUniforms(u,VEHDATA.cars[c.type],1,TX.veh.traffic);gl.uniform1f(u.uGloss,c.type===4?.5:.85);gl.uniform1f(u.uHue,c.type<2||c.type===3?CARHUE[pi%5]:0);drawVeh(TX.meshes.cars[c.type]);gl.uniform1f(u.uHue,0);drawMesh(MODELS.carLights[c.type]);}
    else drawMesh(MODELS.car[c.type]);}
  /* the van */
  if(TG.on){const T=TG;gl.uniformMatrix4fv(u.uModel,false,modelMat(T.s,T.u,T.h+.05+Math.sin(S.clock*4)*.03,T.yaw,-T.bank,0));gl.uniform3fv(u.uPaint,VAN_PAINT);
    gl.uniform4f(u.uVeh,T.brakeT>0?1:0,0,T.boostT>0?1:0,T.dmg/100);
    if(carved&&(TX.on&TXF.DEC)){projUniforms(u,VEHDATA.van,0,TX.veh.van);gl.uniform1f(u.uGloss,.9);decalUniforms(u,true,TX.liv,[-2.95,1.45,2.55,1.05],[0,0,1,1],0);drawVeh(TX.meshes.van);gl.uniform1f(u.uDecOn,0);}
    else drawMesh(MODELS.van);}
  /* drones */
  for(const d of DR){if(!d.on)continue;const q=trackOf([d.x,d.y,d.z]);gl.uniformMatrix4fv(u.uModel,false,modelMat(q[2],q[0],q[1],TG.yaw||0,Math.sin(S.clock*1.3)*.08,-.12));gl.uniform4f(u.uVeh,0,0,0,0);
    if(carved){projUniforms(u,VEHDATA.drone,2,TX.veh.drone);gl.uniform1f(u.uGloss,.4);drawVeh(TX.meshes.drone);}else drawMesh(MODELS.drone);}
  /* the bike (hidden in the helmet view, except in the mirror) */
  if(VIEW.mode!==2||mirror||S.mode!=='play'&&S.mode!=='intro'){
    gl.uniformMatrix4fv(u.uModel,false,modelMat(B.s,B.u,B.h+.05+Math.sin(S.clock*9)*.035,B.yaw,bikeLean(),bikePitch(),carved?1:1.08));gl.uniform3fv(u.uPaint,BIKE_PAINT);
    gl.uniform4f(u.uVeh,S.ctlBrake?1:0,0,B.nitroT>0?1:B.boostT>0?.5:0,0);
    if(carved){projUniforms(u,VEHDATA.bike,0,TX.veh.bike);gl.uniform1f(u.uGloss,.55);decalUniforms(u,(TX.on&TXF.DEC)!==0,TX.dec,BIKE_DECAL,[0,0,1,174/512],.35);drawVeh(TX.meshes.bike);gl.uniform1f(u.uDecOn,0);}
    else drawMesh(MODELS.bike);}
  /* ramps */
  gl.uniform1i(u.uSpace,0);gl.uniform3f(u.uPaint,1,1,1);
  for(const f of FEAT.list){if(f.k!=='ramp')continue;if(f.z+f.len<CAM.s-6||f.z>CAM.s+520)continue;gl.uniform4f(u.uOff,f.u,groundAt(f.z,f.u),f.z,f.len);drawMesh(MODELS.ramp);}
  gl.uniform4f(u.uOff,0,0,0,1);
}
function drawCity(P,which){
  const z0=CAM.s-30,z1=CAM.s+(ST.id===2?780:580);
  for(const c of CH.map.values()){if(c.z1<z0||c.z0>z1)continue;drawMesh(which==='g'?c.g:c.s);}
}
function drawSky(mirror){
  gl.useProgram(P_SKY.p);const u=P_SKY.u;
  gl.uniformMatrix3fv(u.uRot,false,[CAM.r[0],CAM.r[1],CAM.r[2],CAM.u[0],CAM.u[1],CAM.u[2],CAM.f[0],CAM.f[1],CAM.f[2]]);
  gl.uniform1f(u.uFov,CAM.fov);gl.uniform1f(u.uAsp,RTW/RTH);gl.uniform1f(u.uMirror,mirror?1:0);gl.uniform1f(u.uTime,S.clock%600);gl.uniform1f(u.uBolt,BOLT);gl.uniform1i(u.uStage,ST.id);
  gl.uniform3fv(u.uSkyA,SU_SKYA);gl.uniform3fv(u.uSkyB,SU_SKYB);gl.uniform3fv(u.uFogC,fogC());gl.uniform3fv(u.uN1,ST.N1);gl.uniform3fv(u.uN2,ST.N2);gl.uniform3fv(u.uN3,ST.N3);
  gl.uniform1i(u.uTex,TX.on);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,TX.sky);gl.uniform1i(u.uSky,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,TX.skyl);gl.uniform1i(u.uSkyl,1);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,TX.moon);gl.uniform1i(u.uMoon,2);gl.activeTexture(gl.TEXTURE0);
  gl.depthMask(false);gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
/* ---------- the glowing extras: light ribbons, sparks, drone beams ---------- */
const RIB={bike:[[],[]],van:[[],[]],cars:new WeakMap()};
function ribPush(arr,p,t,maxT){arr.unshift([p[0],p[1],p[2],t]);while(arr.length>2&&t-arr[arr.length-1][3]>maxT)arr.pop();if(arr.length>90)arr.length=90;}
function localToWorld(M,x,y,z){const e=CAM.eye;return [M[0]*x+M[4]*y+M[8]*z+M[12]+e[0],M[1]*x+M[5]*y+M[9]*z+M[13]+e[1],M[2]*x+M[6]*y+M[10]*z+M[14]+e[2]];}
function ribbonsUpdate(){
  const t=S.clock,B=BK,ni=B.nitroT>0?1:B.boostT>0?.5:0;
  const M=modelMat(B.s,B.u,B.h+.05,B.yaw,bikeLean(),bikePitch(),(TX.on&TXF.VEH)?1:1.08);
  const life=.04+ni*.035;
  const rx=(TX.on&TXF.VEH)?.56:.47,rz=(TX.on&TXF.VEH)?-1.2:-1.22;ribPush(RIB.bike[0],localToWorld(M,-rx,.43,rz),t,life);ribPush(RIB.bike[1],localToWorld(M,rx,.43,rz),t,life);
  if(TG.on){const T=TG,M2=modelMat(T.s,T.u,T.h+.05,T.yaw,-T.bank,0);const l2=.35;ribPush(RIB.van[0],localToWorld(M2,-.97,1.35,-3.2),t,l2);ribPush(RIB.van[1],localToWorld(M2,.97,1.35,-3.2),t,l2);}
  for(const c of TR.cars){const ds=c.s-B.s;if(ds<-6||ds>160)continue;let r=RIB.cars.get(c);if(!r){r=[[],[]];RIB.cars.set(c,r);}
    const L=c.L,hw=c.type===4?1.12:.95;const p0=W3(c.s-L,c.u-hw*.6,c.h+.82),p1=W3(c.s-L,c.u+hw*.6,c.h+.82);ribPush(r[0],p0,t,.18);ribPush(r[1],p1,t,.18);}
}
function ribbon(M,pts,w,colAt,alpha){
  if(pts.length<2)return;const e=CAM.eye,n=pts.length,t0=pts[0][3],tN=pts[n-1][3]||t0-1;
  let prevL=null,prevR=null,prevA=0;
  for(let i=0;i<n;i++){const p=[pts[i][0]-e[0],pts[i][1]-e[1],pts[i][2]-e[2]];const q=i<n-1?pts[i+1]:pts[i-1];let tg=v3.sub(pts[i],q);if(i===n-1)tg=v3.mul(tg,-1);
    let sd=v3.cross(tg,p);const l=Math.hypot(sd[0],sd[1],sd[2])||1;sd=v3.mul(sd,w/l);
    const a=1-(t0-pts[i][3])/Math.max(1e-3,t0-tN);const L=v3.sub(p,sd),R=v3.add(p,sd);
    if(prevL){const c=colAt(i/(n-1));const al=alpha;
      M.vert(prevL[0],prevL[1],prevL[2],0,0,0,c,al,[prevA,0,0,0]);M.vert(prevR[0],prevR[1],prevR[2],0,0,0,c,al,[prevA,1,0,0]);M.vert(R[0],R[1],R[2],0,0,0,c,al,[a,1,0,0]);
      M.vert(prevL[0],prevL[1],prevL[2],0,0,0,c,al,[prevA,0,0,0]);M.vert(R[0],R[1],R[2],0,0,0,c,al,[a,1,0,0]);M.vert(L[0],L[1],L[2],0,0,0,c,al,[a,0,0,0]);}
    prevL=L;prevR=R;prevA=a;}
}
function streak(M,a,b,w,c,al){
  const e=CAM.eye,p=[a[0]-e[0],a[1]-e[1],a[2]-e[2]],q=[b[0]-e[0],b[1]-e[1],b[2]-e[2]];let sd=v3.cross(v3.sub(p,q),p);const l=Math.hypot(sd[0],sd[1],sd[2])||1;sd=v3.mul(sd,w/l);
  const A=v3.sub(p,sd),Bp=v3.add(p,sd),C=v3.add(q,sd),D=v3.sub(q,sd);
  M.vert(...A,0,0,0,c,al,[1,0,0,0]);M.vert(...Bp,0,0,0,c,al,[1,1,0,0]);M.vert(...C,0,0,0,c,al,[0,1,0,0]);M.vert(...A,0,0,0,c,al,[1,0,0,0]);M.vert(...C,0,0,0,c,al,[0,1,0,0]);M.vert(...D,0,0,0,c,al,[0,0,0,0]);
}
function hueRGB(h){const f=n=>{const k=(n+h*6)%6;return 1-Math.max(0,Math.min(k,4-k,1));};return [f(5),f(3),f(1)];}
function buildFX(){
  const M=new MB(),B=BK,ni=B.nitroT>0?1:B.boostT>0?.5:0,t=S.clock;
  /* the bike's wake: two ribbons of spectrum off the thruster rings */
  const ph=t*(.6+B.vs/60);
  if((S.mode==='play'||S.mode==='intro'||S.mode==='title')&&!(VIEW.mode===2&&S.mode==='play'))for(const r of RIB.bike)ribbon(M,r,.045+ni*.025,k=>{const c=hueRGB((k*.85+ph)%1);const I=(1.1+ni*1.6)*(1-k*.6);return [c[0]*I,c[1]*I,c[2]*I];},.8);
  for(const r of RIB.van)ribbon(M,r,.12,()=>[4,.25,.15],1);
  for(const c of TR.cars){const r=RIB.cars.get(c);if(!r)continue;if(c.s-B.s<-6||c.s-B.s>160)continue;for(const q of r)ribbon(M,q,.07,()=>[2.4+c.brake*2,.12,.08],.8);}
  /* sparks: hot streaks; smoke: dim puffs */
  for(const p of SPK){const k=clamp(p.life*2.5,0,1);const a=[p.x,p.y,p.z],b=[p.x-p.vx*.03,p.y-p.vy*.03,p.z-(p.vz-BK.vs)*.03];
    if(p.sm)streak(M,a,[a[0],a[1]+.6,a[2]],.35,[.2,.18,.25],.25*k);
    else streak(M,a,b,.025,[p.col[0]/255*3,p.col[1]/255*3,p.col[2]/255*3],.6+k);}
  /* drone searchlights: a soft beam from each drone down onto the van */
  if(TG.on)for(const d of DR){if(!d.on)continue;const tgt=W3(TG.s,TG.u,TG.h+.6);const e=CAM.eye,p=[d.x-e[0],d.y-.15-e[1],d.z+.4-e[2]],q=[tgt[0]-e[0],tgt[1]-e[1],tgt[2]-e[2]];
    let sd=v3.cross(v3.sub(p,q),q);const l=Math.hypot(sd[0],sd[1],sd[2])||1;sd=v3.mul(sd,1/l);const w0=.12,w1=2.6,c=[.7,.75,1];
    const A=v3.sub(p,v3.mul(sd,w0)),Bq=v3.add(p,v3.mul(sd,w0)),C=v3.add(q,v3.mul(sd,w1)),D=v3.sub(q,v3.mul(sd,w1));
    M.vert(...A,0,0,0,c,.35,[1,0,0,0]);M.vert(...Bq,0,0,0,c,.35,[1,1,0,0]);M.vert(...C,0,0,0,c,.35,[.25,1,0,0]);M.vert(...A,0,0,0,c,.35,[1,0,0,0]);M.vert(...C,0,0,0,c,.35,[.25,1,0,0]);M.vert(...D,0,0,0,c,.35,[.25,0,0,0]);}
  FXM=M.upload(FXM);
}
function drawFX(){
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);
  gl.useProgram(P_FX.p);gl.uniformMatrix4fv(P_FX.u.uVP,false,VPM);drawMesh(FXM);
  if(ST.rain&&!reduce){const q=qnow(),u=P_RAIN.u,B=BK;gl.useProgram(P_RAIN.p);gl.uniformMatrix4fv(u.uVP,false,VPM);
    const box=[40,26,72],e=CAM.eye,fall=S.clock*13;gl.uniform3fv(u.uBox,box);
    gl.uniform3f(u.uOffs,-(e[0])/box[0],-(fall+e[1])/box[1],-(e[2])/box[2]);
    const vx=dpX(B.s)*B.vs+B.vu;gl.uniform3f(u.uVel,-vx,-13,-B.vs);gl.uniform1f(u.uLen,.022);
    gl.uniform3f(u.uT1,.55,.65,.95);gl.uniform3fv(u.uT2,ST.N1.map(v=>v*.8+.2));
    gl.bindVertexArray(RAINM.vao);gl.drawArrays(gl.TRIANGLES,0,Math.min(RAINM.n,q.rain*6));}
  gl.depthMask(true);gl.disable(gl.BLEND);
}
/* ---------- post ---------- */
function fsPass(P,dst,setup){gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:CW,dst?dst.h:CH_);gl.useProgram(P.p);if(setup)setup(P.u);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);}
function bindT(unit,t,u,name){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(u[name],unit);}
const FXS={burst:0,lastNitro:0,trailFlip:0};
function render3d(dt){
  if(!gl||!P_W)return;
  const B=BK,sp=clamp(B.vs/100,0,1.45),ni=B.nitroT>0?1:0;
  BOLT=S.bolt>0?(S.bolt>.85||(S.bolt>.45&&S.bolt<.6)?1:.35)*S.bolt:0;
  SU_SKYA=BOLT?ST.skyA.map((c,i)=>c+[.35,.38,.55][i]*BOLT):ST.skyA;SU_SKYB=BOLT?ST.skyB.map((c,i)=>c+[.25,.25,.4][i]*BOLT):ST.skyB;
  artStage();cityUpdate(BK.s,CH.map.size<3?8:2);
  makeVP(VPM,.25,2400);
  gatherLights();
  if(!S.paused)ribbonsUpdate();buildFX();
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  /* 1 the mirror */
  if(RT.rf){gl.bindFramebuffer(gl.FRAMEBUFFER,RT.rf.f);gl.viewport(0,0,RT.rf.w,RT.rf.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    drawSky(true);worldUniforms(P_W,true);drawCity(P_W,'s');drawVehicles(P_W,true);
    gl.bindTexture(gl.TEXTURE_2D,RT.rf.t);gl.generateMipmap(gl.TEXTURE_2D);}
  /* 2 the scene */
  const tgt=RT.ms||RT.sc;gl.bindFramebuffer(gl.FRAMEBUFFER,tgt.f);gl.viewport(0,0,RTW,RTH);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  drawSky(false);worldUniforms(P_W,false);drawCity(P_W,'g');if(RT.rf){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);}gl.uniform1f(P_W.u.uReflOn,0);drawCity(P_W,'s');drawVehicles(P_W,false);
  drawFX();
  if(RT.ms){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.ms.f);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.sc.f);gl.blitFramebuffer(0,0,RTW,RTH,0,0,RTW,RTH,gl.COLOR_BUFFER_BIT,gl.NEAREST);}
  gl.disable(gl.DEPTH_TEST);
  /* 3 glow */
  fsPass(P_BR,RT.b1,u=>{bindT(0,RT.sc.t,u,'uTex');gl.uniform2f(u.uPx,1/RTW,1/RTH);gl.uniform1f(u.uThr,HDR?1.25:.82);});
  fsPass(P_BL,RT.b1b,u=>{bindT(0,RT.b1.t,u,'uTex');gl.uniform2f(u.uDir,1/RT.b1.w,0);});fsPass(P_BL,RT.b1,u=>{bindT(0,RT.b1b.t,u,'uTex');gl.uniform2f(u.uDir,0,1/RT.b1.h);});
  fsPass(P_BR,RT.b2,u=>{bindT(0,RT.b1.t,u,'uTex');gl.uniform2f(u.uPx,1/RT.b1.w,1/RT.b1.h);gl.uniform1f(u.uThr,0);});
  fsPass(P_BL,RT.b2b,u=>{bindT(0,RT.b2.t,u,'uTex');gl.uniform2f(u.uDir,1.6/RT.b2.w,0);});fsPass(P_BL,RT.b2,u=>{bindT(0,RT.b2b.t,u,'uTex');gl.uniform2f(u.uDir,0,1.6/RT.b2.h);});
  /* 4 prism trails */
  const vel=v3.norm([dpX(B.s)*B.vs+B.vu,dpY(B.s)*B.vs+(B.air?B.vh:0),Math.max(1,B.vs)]);
  /* the speed effects follow the direction you're flying; if the camera looks elsewhere (orbit shots), they fade out */
  const look=v3.dot(vel,CAM.f),fxk=clamp((look-.6)/.3,0,1);let C=fxk>0?toUV(vel):[.5,.5];C=[clamp(C[0],-.2,1.2),clamp(C[1],-.2,1.2)];
  let shift=[0,0];if(PREVF){const pu=toUV(PREVF);shift=[.5-pu[0],.5-pu[1]];if(Math.abs(shift[0])>.2||Math.abs(shift[1])>.2)shift=[0,0];}PREVF=CAM.f.slice();
  const k60=clamp(dt*60,0,3),live=S.paused?0:1;
  if(B.nitroT>0&&!FXS.lastNitro)FXS.burst=1;FXS.lastNitro=B.nitroT>0?1:0;FXS.burst=Math.max(0,FXS.burst-dt*1.6);
  if(FXS.clear){FXS.clear=0;for(const k of ['tr0','tr1']){gl.bindFramebuffer(gl.FRAMEBUFFER,RT[k].f);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);}}
  const A=FXS.trailFlip?RT.tr1:RT.tr0,Bt=FXS.trailFlip?RT.tr0:RT.tr1;FXS.trailFlip^=1;
  const zoom=(.004+.011*sp*sp+ni*.012)*k60*live*fxk,decay=live?Math.pow(clamp(.7+.2*sp+ni*.06,0,.955),k60):1,disp=.22+ni*.9+(B.boostT>0?.25:0);
  fsPass(P_TR,Bt,u=>{bindT(0,A.t,u,'uPrev');bindT(1,RT.b1.t,u,'uNew');gl.uniform2f(u.uC,C[0],C[1]);gl.uniform2f(u.uShift,shift[0]*live,shift[1]*live);gl.uniform1f(u.uZoom,zoom);gl.uniform1f(u.uDecay,decay);gl.uniform1f(u.uDisp,disp);gl.uniform1f(u.uGain,(.12+.42*sp+ni*.25)*live*(ST.id===3?.7:1)*fxk);gl.uniform1f(u.uAsp,RTW/RTH);});
  /* 5 the final picture */
  gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mc);
  const q=qnow();
  fsPass(P_CO,null,u=>{bindT(0,RT.sc.t,u,'uScene');bindT(1,RT.b1.t,u,'uB1');bindT(2,RT.b2.t,u,'uB2');bindT(3,Bt.t,u,'uTrail');bindT(4,HTEX,u,'uHud');
    gl.uniform2f(u.uC,C[0],C[1]);const calm=reduce||S.paused||!(S.mode==='play'||S.mode==='title'||S.mode==='intro');gl.uniform1f(u.uBlur,calm?0:(.0055*sp*sp+ni*.011+(B.boostT>0?.004:0))*fxk);gl.uniform1f(u.uDisp,calm?0:(.0018*sp+ni*.0045)*fxk);gl.uniform1f(u.uAsp,RTW/RTH);
    gl.uniform1f(u.uFlash,FLASH);gl.uniform1f(u.uSat,1.28);gl.uniform1f(u.uTrailK,reduce?0:.5);gl.uniform1f(u.uBurst,reduce||S.paused?0:FXS.burst);gl.uniform1f(u.uGlow,.75);gl.uniform1f(u.uTime,S.clock);
    gl.uniform2f(u.uHudRes,W,H);gl.uniform2f(u.uScr,CW,CH_);gl.uniform1f(u.uDotOn,1);gl.uniform1i(u.uTaps,q.taps);});
  gl.activeTexture(gl.TEXTURE0);
}
let FLASH=0;
