/* ===================== one rendered frame ===================== */
const LMX=new Float32Array(16),SHM=new Float32Array(16);let SHON=0,SHB=0;
const ID16=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const PERF={sum:0,n:0,cool:3,fps:60};
function bindTex(unit,target,t){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(target,t);}
function fullTri(){gl.bindVertexArray(VAO_E);gl.drawArrays(gl.TRIANGLES,0,3);}
/* shadow map: an orthographic view from the sun, centred a little ahead of the camera, snapped to whole texels */
function shadowPass(){
  SHON=0;if(!T.sh)return;
  const S=T.sh.s,R=S>=2048?620:480,D=4500,L=SUN.dir;
  let c=vaddm(CAM.pos.slice(),VIEW.f,R*.5);
  const lz=vmul(L,-1),lx=vnorm(vcross(Math.abs(L[1])<.95?[0,1,0]:[1,0,0],lz)),ly=vcross(lz,lx);
  const ts=2*R/S,cxl=vdot(c,lx),cyl=vdot(c,ly);c=vaddm(vaddm(c,lx,Math.round(cxl/ts)*ts-cxl),ly,Math.round(cyl/ts)*ts-cyl);
  const o=vsub(CAM.pos,c),ox=vdot(o,lx),oy=vdot(o,ly),oz=vdot(o,lz);
  const rows=[[lx[0]/R,lx[1]/R,lx[2]/R,ox/R],[ly[0]/R,ly[1]/R,ly[2]/R,oy/R],[lz[0]/D,lz[1]/D,lz[2]/D,oz/D],[0,0,0,1]];
  for(let r=0;r<4;r++)for(let k=0;k<4;k++){LMX[k*4+r]=rows[r][k];SHM[k*4+r]=r<3?rows[r][k]*.5+(k===3?.5:0):rows[r][k];}
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.sh.f);gl.viewport(0,0,S,S);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2.5,6);
  const p=P.depth;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uLM,false,LMX);
  eachMesh((m,pos,q,s)=>{if(vdist(pos,c)>R*1.5+m.R*s)return;const G2=meshGPU(m);gl.uniformMatrix3fv(p.u.uR,false,qmat(q,M3));
    gl.uniform3f(p.u.uT,pos[0]-CAM.pos[0],pos[1]-CAM.pos[1],pos[2]-CAM.pos[2]);gl.uniform1f(p.u.uS,s);gl.bindVertexArray(G2.vao);gl.drawArrays(gl.TRIANGLES,0,G2.n);});
  gl.disable(gl.POLYGON_OFFSET_FILL);SHON=1;SHB=ts*1.6;
}
function meshSetup(p,near,far,shadow){
  gl.useProgram(p.p);gl.uniformMatrix3fv(p.u.uV,false,MV);projU(p.u,near,far);
  const sc=SUN.col;gl.uniform3f(p.u.uSun,SUN.dir[0],SUN.dir[1],SUN.dir[2]);gl.uniform3f(p.u.uSunC,s2l(sc[0])*2.5,s2l(sc[1])*2.5,s2l(sc[2])*2.5);
  gl.uniform3f(p.u.uAmb,s2l(AMBC[0])*1.4+.004,s2l(AMBC[1])*1.4+.004,s2l(AMBC[2])*1.4+.006);gl.uniform1f(p.u.uIbl,1.1);gl.uniform1f(p.u.uEK,3.4);gl.uniform1f(p.u.uFill,shadow?2.2:1.2);gl.uniform1f(p.u.uSunK,shadow?1:.45);
  gl.uniform1f(p.u.uShOn,shadow&&SHON?1:0);gl.uniformMatrix4fv(p.u.uSM,false,shadow&&SHON?SHM:ID16);gl.uniform1f(p.u.uSB,SHB);
  bindTex(1,gl.TEXTURE_2D,shadow&&SHON?T.sh.t:DUMMY_SH);gl.uniform1i(p.u.uShT,1);bindTex(2,gl.TEXTURE_CUBE_MAP,SKYC);gl.uniform1i(p.u.uSky,2);
  gl.uniform4fv(p.u.uLP,LP);gl.uniform4fv(p.u.uLC,LC);gl.uniform1i(p.u.uNL,NL);
}
function drawM(p,m,pos,q,s,flash,glow,rel){
  const G2=meshGPU(m);gl.uniformMatrix3fv(p.u.uR,false,qmat(q,M3));
  if(rel)gl.uniform3f(p.u.uT,pos[0],pos[1],pos[2]);else gl.uniform3f(p.u.uT,pos[0]-CAM.pos[0],pos[1]-CAM.pos[1],pos[2]-CAM.pos[2]);
  gl.uniform1f(p.u.uS,s);gl.uniform1f(p.u.uGlow,glow);gl.uniform1f(p.u.uFlash,flash>0?clamp(flash/.06,0,1):0);gl.uniform1f(p.u.uDet,G2.det);
  gl.bindVertexArray(G2.vao);gl.drawArrays(gl.TRIANGLES,0,G2.n);
}
function screenVP(){const rx=Math.round(RECT.x*DPR),rw=Math.round(RECT.w*DPR),rh=Math.round(RECT.h*DPR),ry=VH-Math.round(RECT.y*DPR)-rh;gl.viewport(rx,ry,rw,rh);}
function renderFrame(){
  if(!gl)return;
  if(SKYDIRTY)bakeSkyGL();
  const C=CAM;setView(C.pos,C.q,W/2,H*C.cy,C.F);viewMats();gatherLights();
  shadowPass();
  /* ---- the scene, in HDR ---- */
  const tgt=T.ms||T.scene;gl.bindFramebuffer(gl.FRAMEBUFFER,tgt.f);gl.viewport(0,0,RW,RH);
  gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  let p=P.sky;gl.useProgram(p.p);bindTex(0,gl.TEXTURE_CUBE_MAP,SKYC);gl.uniform1i(p.u.uSky,0);gl.uniformMatrix3fv(p.u.uVI,false,MVI);projU(p.u,1,2);
  const sc=SUN.col;gl.uniform3f(p.u.uSun,SUN.dir[0],SUN.dir[1],SUN.dir[2]);gl.uniform3f(p.u.uSunC,s2l(sc[0]),s2l(sc[1]),s2l(sc[2]));gl.uniform1f(p.u.uSunR,SUN.size);fullTri();
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
  p=P.star;gl.useProgram(p.p);gl.uniformMatrix3fv(p.u.uV,false,MV);projU(p.u,1,2);gl.uniform1f(p.u.uPs,Math.max(1,RH/700));gl.uniform1f(p.u.uTm,G.t);gl.bindVertexArray(STARV);gl.drawArrays(gl.POINTS,0,STARN);
  if(PLANET.on){gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);p=P.planet;gl.useProgram(p.p);gl.uniformMatrix3fv(p.u.uVI,false,MVI);projU(p.u,1,2);
    const PA=PLANET,bx=vnorm(vcross(PA.axis,[.3,.1,.9])),bz=vcross(bx,PA.axis);
    gl.uniform3fv(p.u.uPD,PA.dir);gl.uniform3fv(p.u.uAx,PA.axis);gl.uniform3fv(p.u.uBx,bx);gl.uniform3fv(p.u.uBz,bz);gl.uniform3fv(p.u.uSun,SUN.dir);gl.uniform1f(p.u.uAr,PA.ar);gl.uniform1f(p.u.uSeed,PA.seed);gl.uniform1f(p.u.uRot,G.t*.0126);
    gl.uniform3fv(p.u.uP0,PA.pal[0]);gl.uniform3fv(p.u.uP1,PA.pal[1]);gl.uniform3fv(p.u.uP2,PA.pal[2]);gl.uniform3fv(p.u.uAtm,PA.atm);gl.uniform3f(p.u.uAmb,s2l(AMBC[0]),s2l(AMBC[1]),s2l(AMBC[2]));fullTri();}
  /* hulls */
  gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CW);
  p=P.mesh;meshSetup(p,NEAR,30000,true);
  eachMesh((m,pos,q,s,fl,gw)=>{const R=m.R*s;if(!inView(pos,R))return;const c=cam(pos);if(c[2]>0&&R*VIEW.F/c[2]*(RH/H)<.35)return;drawM(p,m,pos,q,s,fl,gw);});
  /* light and smoke */
  buildSprites();
  if(NI){gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    p=P.spr;gl.useProgram(p.p);gl.uniformMatrix3fv(p.u.uV,false,MV);projU(p.u,NEAR,30000);gl.uniform1f(p.u.uPxW,H/(VIEW.F*RH));gl.uniform1f(p.u.uTm,G.t);
    bindTex(0,gl.TEXTURE_2D,NOISE);gl.uniform1i(p.u.uNoise,0);gl.bindBuffer(gl.ARRAY_BUFFER,INSTB);gl.bufferSubData(gl.ARRAY_BUFFER,0,IB2,0,NI*12);
    gl.bindVertexArray(QUADV);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,NI);gl.depthMask(true);}
  if(BUBQ.length){gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.enable(gl.CULL_FACE);p=P.bub;gl.useProgram(p.p);gl.uniformMatrix3fv(p.u.uV,false,MV);projU(p.u,NEAR,30000);
    gl.uniformMatrix4fv(p.u.uSM,false,ID16);gl.uniform1f(p.u.uTm,G.t);gl.uniform3f(p.u.uCol,.12,.5,1.1);const G2=meshGPU(MESH.bubble);gl.uniformMatrix3fv(p.u.uR,false,qmat(qid(),M3));gl.bindVertexArray(G2.vao);
    for(const b of BUBQ){gl.uniform3f(p.u.uT,b.p[0]-CAM.pos[0],b.p[1]-CAM.pos[1],b.p[2]-CAM.pos[2]);gl.uniform1f(p.u.uS,b.R);gl.uniform3f(p.u.uHit,b.h[0],b.h[1],b.h[2]);gl.uniform1f(p.u.uK,b.k);gl.drawArrays(gl.TRIANGLES,0,G2.n);}
    gl.depthMask(true);gl.disable(gl.CULL_FACE);}
  /* sun glare */
  const sz=vdot(SUN.dir,VIEW.f);
  if(sz>.15){const sx=(VIEW.cx+vdot(SUN.dir,VIEW.r)/sz*VIEW.F)/W*2-1,sy=1-(VIEW.cy-vdot(SUN.dir,VIEW.u)/sz*VIEW.F)/H*2;
    if(Math.abs(sx)<1.1&&Math.abs(sy)<1.1&&!sunHidden()){gl.disable(gl.DEPTH_TEST);gl.blendFunc(gl.ONE,gl.ONE);p=P.flare;gl.useProgram(p.p);gl.uniform2f(p.u.uS,sx,sy);
      gl.uniform1f(p.u.uK,Math.min(1,(sz-.15)*2)*(1-Math.max(0,Math.max(Math.abs(sx),Math.abs(sy))-.9)*10));gl.uniform1f(p.u.uAsp,W/H);gl.uniform3f(p.u.uC,s2l(sc[0])*1.4,s2l(sc[1])*1.4,s2l(sc[2])*1.4);fullTri();}}
  /* the cockpit, over everything, with its own depth */
  if(G.camMode===0&&G.mode==='play'&&PL&&!PL.dead){const m=cockpitMesh();gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);
    const fK=VIEW.F;VIEW.F=CAM.F0;p=P.mesh;meshSetup(p,.04,20,false);VIEW.F=fK;drawM(p,m,[0,0,0],CAM.q,1,0,1,true);}
  /* ---- resolve, bloom, tone map ---- */
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  if(T.ms){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,T.ms.f);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,T.scene.f);gl.blitFramebuffer(0,0,RW,RH,0,0,RW,RH,gl.COLOR_BUFFER_BIT,gl.NEAREST);}
  let src=T.scene;const BL=T.bl;
  for(let i=0;i<BL.length;i++){const d=BL[i];gl.bindFramebuffer(gl.FRAMEBUFFER,d.f);gl.viewport(0,0,d.w,d.h);p=P.down;gl.useProgram(p.p);bindTex(0,gl.TEXTURE_2D,src.t);gl.uniform1i(p.u.uTex,0);
    gl.uniform2f(p.u.uPx,1/src.w,1/src.h);gl.uniform1f(p.u.uThr,GLX.cbf?1.05:.72);gl.uniform1f(p.u.uPre,i===0?1:0);fullTri();src=d;}
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);p=P.up;gl.useProgram(p.p);
  for(let i=BL.length-1;i>0;i--){const d=BL[i-1],s=BL[i];gl.bindFramebuffer(gl.FRAMEBUFFER,d.f);gl.viewport(0,0,d.w,d.h);bindTex(0,gl.TEXTURE_2D,s.t);gl.uniform1i(p.u.uTex,0);gl.uniform2f(p.u.uPx,1/s.w,1/s.h);gl.uniform1f(p.u.uK,1);fullTri();}
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,VW,VH);gl.clearColor(.02,.024,.047,1);gl.clear(gl.COLOR_BUFFER_BIT);
  if(DOTF){gl.bindFramebuffer(gl.FRAMEBUFFER,T.ldr.f);gl.viewport(0,0,RW,RH);}else screenVP();
  p=P.comp;gl.useProgram(p.p);bindTex(0,gl.TEXTURE_2D,T.scene.t);gl.uniform1i(p.u.uScene,0);bindTex(1,gl.TEXTURE_2D,BL.length?BL[0].t:T.scene.t);gl.uniform1i(p.u.uBloom,1);
  gl.uniform1f(p.u.uBK,BL.length?(GLX.cbf?.55:.4):0);gl.uniform1f(p.u.uExp,1.05);gl.uniform3f(p.u.uTint,1,1,1);gl.uniform1f(p.u.uGrain,(FRAME%64)*.37);fullTri();
  if(DOTF){gl.bindFramebuffer(gl.FRAMEBUFFER,null);screenVP();p=P.led;gl.useProgram(p.p);bindTex(0,gl.TEXTURE_2D,T.ldr.t);gl.uniform1i(p.u.uTex,0);gl.uniform2f(p.u.uRes,W,H);fullTri();}
  /* ---- holograms into the dot grid, then the LED HUD over the frame ---- */
  holoPass();
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);screenVP();
  bindTex(0,gl.TEXTURE_2D,HUDT);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,hc);gl.generateMipmap(gl.TEXTURE_2D);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);p=P.hud;gl.useProgram(p.p);gl.uniform1i(p.u.uHud,0);bindTex(1,gl.TEXTURE_2D,HOLO.t);gl.uniform1i(p.u.uHolo,1);
  gl.uniform2f(p.u.uRes,W,H);gl.uniform1f(p.u.uGain,1.18);fullTri();gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0);
}
/* holograms: each one gets its own little camera and viewport inside the 2x dot grid */
function holoPass(){
  gl.bindFramebuffer(gl.FRAMEBUFFER,HOLO.f);gl.viewport(0,0,HOLO.w,HOLO.h);gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(!HOLOQ.length)return;
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CW);
  const p=P.holo;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uSM,false,ID16);gl.uniform1f(p.u.uFrame,FRAME%3);
  const keep={pos:VIEW.pos,q:VIEW.q,cx:VIEW.cx,cy:VIEW.cy,F:VIEW.F},kW=W,kH=H;
  for(const h of HOLOQ){const R=h.m.R*h.s,cq=qlook([Math.sin(h.ang),h.pitch,Math.cos(h.ang)],[0,1,0]),cp=vsub(h.pos,vmul(qF(cq),R*h.dist)),F=Math.min(h.w,h.h)*1.05;
    gl.viewport(h.x*2,(kH-h.y-h.h)*2,h.w*2,h.h*2);gl.enable(gl.SCISSOR_TEST);gl.scissor(h.x*2,(kH-h.y-h.h)*2,h.w*2,h.h*2);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.SCISSOR_TEST);
    setView(cp,cq,h.w/2,h.h/2,F);viewMats();W=h.w;H=h.h;gl.uniformMatrix3fv(p.u.uV,false,MV);projU(p.u,R*.1,R*8);W=kW;H=kH;
    const hl=vnorm(vadd(qU(cq),vmul(qR(cq),-.7)));gl.uniform3f(p.u.uHL,hl[0],hl[1],hl[2]);gl.uniform3f(p.u.uTint,h.col[0]/255,h.col[1]/255,h.col[2]/255);
    const G2=meshGPU(h.m);gl.uniformMatrix3fv(p.u.uR,false,qmat(h.q,M3));gl.uniform3f(p.u.uT,h.pos[0]-cp[0],h.pos[1]-cp[1],h.pos[2]-cp[2]);gl.uniform1f(p.u.uS,h.s);
    gl.bindVertexArray(G2.vao);gl.drawArrays(gl.TRIANGLES,0,G2.n);}
  setView(keep.pos,keep.q,keep.cx,keep.cy,keep.F);viewMats();HOLOQ.length=0;
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
}
