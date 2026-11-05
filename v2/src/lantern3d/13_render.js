/* =====================================================================================
   22. 3D — THE FRAME. A scene pass into a half-float target (the town, the water, the people,
       the darkness, the sprites), the night air at a fraction of the size, a glow ladder, then
       the finish and the dot matrix on top. Quality steps down by itself if the frame rate can't
       hold: first the resolution, then the mist, the rain and the soft shadows.
   ===================================================================================== */
const QS={
  high:{scale:1,fogDiv:2,steps:18,rain:1400,lanTaps:3,lampSh:1,fogSh:2,moonPcf:2,moonSz:2048},
  med:{scale:.62,fogDiv:3,steps:12,rain:800,lanTaps:3,lampSh:1,fogSh:1,moonPcf:1,moonSz:2048},
  low:{scale:.5,fogDiv:4,steps:8,rain:350,lanTaps:1,lampSh:1,fogSh:1,moonPcf:1,moonSz:1024}
};
const QPIN=(/[?&]q=(low|med|high)/.exec(location.search)||[])[1];
const R3={q:QPIN||(touchy?'med':'high'),scale:1,auto:!QPIN,ft:16,slow:0,fast:0,cssW:1,cssH:1,dpr:1,VP:M4.id(),V:M4.id(),PR:M4.id(),IVP:M4.id(),cam:[0,0,0],cr:[1,0,0],cu:[0,1,0],
  dots:store.get('hd-lantern3d-dots','0')==='1',t:0,frames:0,tgt:{x:192,y:128},camD:180,pitch:1.0,fov:.66,shake:[0,0],moonVP:M4.id(),built:false};
R3.scale=QS[R3.q].scale;
const PG={},TG={};let VAO0=null,SPRVAO=null,SPRBUF=null,FOGNT=null,HUDT=null,HUDW=0,HUDH=0,MOONT=null;
function r3Init(){
  PG.world=prog(VS_WORLD,FS_WORLD);PG.pre=prog(VS_WORLD,FS_PRE);PG.depth=prog(VS_DEPTH,FS_DEPTH);PG.voidp=prog(VS_VOID,FS_VOID);PG.water=prog(VS_WORLD,FS_WATER);
  PG.spr=prog(VS_SPR,FS_SPR);PG.rain=prog(VS_RAIN,FS_RAIN);PG.fog=prog(VS_FS,FS_FOG);PG.bright=prog(VS_FS,FS_BRIGHT);PG.down=prog(VS_FS,FS_DOWN);PG.up=prog(VS_FS,FS_UP);
  PG.comp=prog(VS_FS,FS_COMP);PG.dots=prog(VS_FS,FS_DOTS);
  VAO0=gl.createVertexArray();
  SPRVAO=gl.createVertexArray();gl.bindVertexArray(SPRVAO);SPRBUF=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,SPRBUF);gl.bufferData(gl.ARRAY_BUFFER,SPR.cap*48,gl.DYNAMIC_DRAW);
  for(let k=0;k<3;k++){gl.enableVertexAttribArray(4+k);gl.vertexAttribPointer(4+k,4,gl.FLOAT,false,48,k*16);gl.vertexAttribDivisor(4+k,1);}gl.bindVertexArray(null);
  const fn=new Uint8Array(FOGS*FOGS);for(let i=0;i<fn.length;i++)fn[i]=Math.round(FOGT[i]*255);FOGNT=mkTex(FOGS,FOGS,gl.R8,gl.RED,gl.UNSIGNED_BYTE,fn,gl.LINEAR,gl.REPEAT);
  hzInit();actorMeshes();
}
function r3Resize(){
  const dpr=Math.min(window.devicePixelRatio||1,2),cw=Math.max(2,innerWidth),ch=Math.max(2,innerHeight);R3.cssW=cw;R3.cssH=ch;R3.dpr=dpr;
  cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);r3Targets();layoutHud();
}
function r3Targets(){
  const Q=QS[R3.q],s=R3.dpr*R3.scale*(R3.q==='high'?1:1),w=Math.max(64,Math.round(R3.cssW*Math.min(s,R3.dpr))),h=Math.max(64,Math.round(R3.cssH*Math.min(s,R3.dpr)));
  for(const k in TG)freeTarget(TG[k]);
  TG.scene=mkTarget(w,h,true);TG.fog=mkTarget(Math.ceil(w/Q.fogDiv),Math.ceil(h/Q.fogDiv));
  TG.b0=mkTarget(w>>1,h>>1);TG.b1=mkTarget(w>>2,h>>2);TG.b2=mkTarget(w>>3,h>>3);TG.b3=mkTarget(w>>4,h>>4);TG.b4=mkTarget(w>>5,h>>5);
  TG.u3=mkTarget(w>>4,h>>4);TG.u2=mkTarget(w>>3,h>>3);TG.u1=mkTarget(w>>2,h>>2);TG.u0=mkTarget(w>>1,h>>1);
  TG.ldr=mkTarget(w,h,false,true);R3.w=w;R3.h=h;
}
function setQuality(q){if(q===R3.q)return;const sz=QS[R3.q].moonSz;R3.q=q;R3.scale=QS[q].scale;r3Targets();if(QS[q].moonSz!==sz){moonMap();}}
/* frame-rate watch: drop the resolution first, then the quality level */
function perfWatch(ms){
  R3.ft+=(ms-R3.ft)*.06;if(!R3.auto||S.paused||R3.frames<90)return;
  if(R3.ft>24){R3.slow+=ms/1000;R3.fast=0;}else if(R3.ft<15){R3.fast+=ms/1000;R3.slow=0;}else{R3.slow=Math.max(0,R3.slow-ms/2000);R3.fast=0;}
  if(R3.slow>1.4){R3.slow=0;R3.ft=18;const minS=R3.q==='high'?.62:.42;
    if(R3.scale>minS+.01){R3.scale=Math.max(minS,R3.scale*.86);r3Targets();}else if(R3.q==='high')setQuality('med');else if(R3.q==='med')setQuality('low');}
  else if(R3.fast>7){R3.fast=0;const top=QS[R3.q].scale;if(R3.scale<top-.01){R3.scale=Math.min(top,R3.scale*1.1);r3Targets();}}
}
/* ---------- the moon's shadow: rendered once per town from above, along the moonlight ---------- */
function moonDir(){const el=N3.moonEl,az=N3.moonAz;return [Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)];}
function moonMap(){
  const sz=QS[R3.q].moonSz;if(!MOONT||MOONT.w!==sz){if(MOONT){gl.deleteTexture(MOONT.d);gl.deleteFramebuffer(MOONT.f);}MOONT=mkShadowTarget(sz);}
  const d=moonDir(),[bx0,by0,bx1,by1]=TOWN.bounds,cx=(bx0+bx1)/2,cz=(by0+by1)/2,c=[cx,20,cz],e=[cx+d[0]*600,20+d[1]*600,cz+d[2]*600];
  const V=M4.look(e,c,Math.abs(d[1])>.97?[0,0,-1]:[0,1,0]);let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(const x of [bx0-20,bx1+20])for(const y of [-2,110])for(const z of [by0-20,by1+20]){const p=M4.xf(V,x,y,z);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}}
  const P=M4.ortho(mn[0],mx[0],mn[1],mx[1],-mx[2]-10,-mn[2]+10);R3.moonVP=M4.mul(P,V);
  gl.bindFramebuffer(gl.FRAMEBUFFER,MOONT.f);gl.viewport(0,0,sz,sz);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.CULL_FACE);
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2.5,6);gl.useProgram(PG.depth.p);gl.uniformMatrix4fv(PG.depth.u.uVP,false,R3.moonVP);gl.uniformMatrix4fv(PG.depth.u.uM,false,M4.id());
  drawMesh(TOWN.mesh);drawMesh(TOWN.glass);gl.disable(gl.POLYGON_OFFSET_FILL);
}
/* ---------- the camera: high over the lamplighter's shoulder, looking north, leading a little toward the beam ---------- */
function camSetup(dt){
  const asp=R3.cssW/R3.cssH,portrait=asp<.9;R3.fov=portrait?1.2:.62;
  let tx,ty,D,pitch;const m=S.mode;
  if(TOWN.kind==='title'){tx=96;ty=portrait?58:48;D=portrait?250:150;pitch=portrait?1.05:.98;const ph=S.att.ph;if(ph===1||ph===2){D+=14;pitch=1.08;}}
  else{
    const lead=12*P.beamK+4;tx=P.x+Math.cos(P.aim)*lead;ty=P.y+Math.sin(P.aim)*lead*.7+(portrait?16:0);D=portrait?185:172;pitch=portrait?1.12:.92;
    if(m==='intro'){const k=easeIO(clamp(S.t/4.2,0,1));tx=lerp(WW/2,tx,k);ty=lerp(WH/2+30,ty,k);D=lerp(portrait?620:470,D,k);pitch=lerp(1.32,pitch,k);}
    else if(m==='dying'){const k=easeIO(clamp(S.t/3.4,0,1));D*=1-.32*k;pitch-=.12*k;}
    else if(m==='dawn'||m==='ending'){const k=easeIO(clamp(S.t/6,0,1));D*=1+.45*k;pitch+=.12*k;}
    else if(m==='over'){D*=.75;pitch-=.1;}
    const mxm=60,mym=40;tx=clamp(tx,mxm*.6,WW-mxm*.6);ty=clamp(ty,mym*.5,WH-mym*.2);}
  const first=!R3.camInit;R3.camInit=true;const k=first?1:Math.min(1,dt*5);
  R3.tgt.x+=(tx-R3.tgt.x)*k;R3.tgt.y+=(ty-R3.tgt.y)*k;R3.camD+=(D-R3.camD)*(first?1:Math.min(1,dt*4));R3.pitch+=(pitch-R3.pitch)*(first?1:Math.min(1,dt*4));
  if(m==='intro'&&S.t<.05){R3.tgt.x=tx;R3.tgt.y=ty;R3.camD=D;R3.pitch=pitch;}
  const sh=S.shake>0&&!reduce?S.shake*S.shake*3:0,sx=sh?rnd(-sh,sh):0,sy=sh?rnd(-sh,sh):0;
  let c=[R3.tgt.x+sx,0,R3.tgt.y+sy],e=[c[0],Math.sin(R3.pitch)*R3.camD,c[2]+Math.cos(R3.pitch)*R3.camD];
  if(R3.dbg){const d=R3.dbg;c=[d.x,d.z||0,d.y];e=[d.x-Math.sin(d.yaw||0)*Math.cos(d.p)*d.D,(d.z||0)+Math.sin(d.p)*d.D,d.y+Math.cos(d.yaw||0)*Math.cos(d.p)*d.D];}
  R3.V=M4.look(e,c,[0,1,0]);R3.PR=M4.persp(R3.fov,asp,4,R3.camD*3+400);R3.VP=M4.mul(R3.PR,R3.V);R3.IVP=M4.inv(R3.VP);R3.cam=e;
  R3.cr=[R3.V[0],R3.V[4],R3.V[8]];R3.cu=[R3.V[1],R3.V[5],R3.V[9]];
}
/* the point of the town under a pointer at (px,py) CSS pixels, on the ground */
function screenToWorld(px,py){
  const nx=px/R3.cssW*2-1,ny=1-py/R3.cssH*2,a=M4.xf(R3.IVP,nx,ny,-1),b=M4.xf(R3.IVP,nx,ny,1);const dy=b[1]-a[1];if(Math.abs(dy)<1e-6)return null;
  const t=(0-a[1])/dy;if(t<0)return null;return [a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t];}
/* where a point of the town lands on the screen, in CSS pixels (z up) */
function worldToScreen(x,y,z){const p=M4.xf(R3.VP,x,z,y);return [(p[0]*.5+.5)*R3.cssW,(.5-p[1]*.5)*R3.cssH,p[2],p[3]];}
/* ---------- the lights of this frame ---------- */
const LU={lanP:new Float32Array(4),lanI:new Float32Array(4),lanH:new Float32Array(4),beam:new Float32Array(4),nl:0,lmP:new Float32Array(MAXL*4),lmI:new Float32Array(MAXL*4),
  nf:0,flP:new Float32Array(12),flI:new Float32Array(12),grP:new Float32Array(4),grI:new Float32Array(4),grH:new Float32Array(4),moonD:[0,1,0],moonC:[0,0,0],sky:[0,0,0],gnd:[0,0,0],q:new Float32Array(4),
  lampG:new Float32Array(64)};
const LAN3={on:false,x:0,y:0,z:8,aim:0,hx:-1,hy:-1,hw:null};
function lightsPrep(dt){
  const m=S.mode,Q=QS[R3.q];
  /* the hand lantern (or, on the title, the lantern carried round the word) */
  let on=false,dk=1;
  if(TOWN.kind==='title'){const t=TT.t,ang=t*.42-1.2;LAN3.x=96+Math.cos(ang)*86;LAN3.y=40+Math.sin(ang)*34;LAN3.z=13+Math.sin(t*1.3)*.8;on=true;
    LU.lanP.set([LAN3.x,LAN3.z,LAN3.y,58]);LU.lanI.set([1.25*(.95+.05*Math.sin(t*13)),0,1,0]);hzCast(HZL.r0,HZL.nr,HZL.st,LAN3.x,LAN3.y,LAN3.z,.6);}
  else if(!P.dead||m==='dying'){dk=m==='dying'?Math.max(0,1-S.t/1.6):1;on=dk>0;LAN3.x=P.lx;LAN3.y=P.ly;LAN3.z=8;LAN3.aim=P.aim;
    const ro=lanternR()*dk+1,gut=P.oil<=0?.45+.35*Math.random():1;
    LU.lanP.set([P.lx,8,P.ly,ro]);LU.lanI.set([lanternI()*dk*gut,1.9*P.beamK*oilK()*dk,Math.cos(P.aim),Math.sin(P.aim)]);
    if(on&&(Math.abs(P.lx-LAN3.hx)>.04||Math.abs(P.ly-LAN3.hy)>.04||LAN3.hw!==TOWN.mesh)){hzCast(HZL.r0,HZL.nr,HZL.st,P.lx,P.ly,8,.8);LAN3.hx=P.lx;LAN3.hy=P.ly;LAN3.hw=TOWN.mesh;}}
  LAN3.on=on;LU.lanH.set([HZL.r0,HZL.nr,HZL.st,on?1:0]);LU.beam.set([Math.cos(BEAM.half),.07,BEAM.R,0]);
  /* street lamps: lit ones at full, a lamp being kindled a little, one going out flickers down */
  LU.nl=0;LU.lampG.fill(0);
  for(let i=0;i<LAMPS.length;i++){const L=LAMPS[i];L.vis=L.vis||0;L.flick=L.flick||0;
    const want=L.lit?1:0;if(want>L.vis){L.vis=Math.min(1,L.vis+dt*3);if(L.vis===1&&!L.lit3){L.lit3=1;L.burst=1;}}else if(want<L.vis){L.vis=Math.max(0,L.vis-dt*1.4);L.lit3=0;}
    L.burst=Math.max(0,(L.burst||0)-dt*1.8);
    const fl=1+.03*Math.sin(L.flick*7.3)+.02*Math.sin(L.flick*17.1+i)+(L.snuffT>0?-.5*L.snuffT:0),kind=P.kl===L&&P.kindle>0&&!L.lit?P.kindle:0;
    let I=L.vis*L.vis*fl*(1+L.burst*.6)*(!L.lit&&L.vis>0?(.6+.4*Math.random()):1),R=L.R;
    if(kind>0&&I<.2){I=Math.max(I,kind*.22);R=8+kind*10;}
    if(i<16){LU.lampG[i*4]=1.4*I*1;LU.lampG[i*4+1]=.75*I;LU.lampG[i*4+2]=.32*I;LU.lampG[i*4+3]=L.lit?0:.025;}
    if(I>.004&&LU.nl<MAXL){const o=LU.nl*4;LU.lmP.set([L.x,TOWN.lampsZ,L.y,R],o);LU.lmI.set([I,HZP.r0+i*HZP.nr,HZP.nr,HZP.st],o);LU.nl++;}}
  /* flares: their horizon is cast when they catch */
  LU.nf=0;for(const f of FLARES){if(LU.nf>=3)break;if(f.slot==null){f.slot=FL3.next++%3;hzCast(HZF.r0+f.slot*HZF.nr,HZF.nr,HZF.st,f.x,f.y,3,1.5);}
    const k=1-f.t/f.dur,o=LU.nf*4;LU.flP.set([f.x,3,f.y,f.R],o);LU.flI.set([2.4*k*k,HZF.r0+f.slot*HZF.nr,HZF.nr,HZF.st],o);LU.nf++;}
  /* the great lamp */
  if(GREAT.on&&TOWER){if(!GREAT.hz3){GREAT.hz3=1;hzCast(HZG.r0,HZG.nr,HZG.st,TOWER.x,TOWER.y,91,TOWER.r+1.5);}
    LU.grP.set([TOWER.x,91,TOWER.y,GREAT.R]);LU.grI.set([1.6*GREAT.k,Math.cos(GREAT.a),Math.sin(GREAT.a),Math.cos(GREAT.half)]);LU.grH.set([HZG.r0,HZG.nr,HZG.st,TOWER.r+1]);LU.lampG[60]=1.8*GREAT.k;LU.lampG[61]=1.5*GREAT.k;LU.lampG[62]=1.1*GREAT.k;}
  else{LU.grI[0]=0;GREAT.hz3=0;}
  /* moon and sky; dawn warms them */
  const md=moonDir(),mk=(TOWN.kind==='title'?1:ST.moon)*.11;let dawn=m==='dawn'||m==='ending'?clamp(S.t/7,0,1):0;R3.dawn=dawn;
  LU.moonD=md;LU.moonC=[lerp(N3.moonC[0]*mk,1.1,dawn*dawn*.5),lerp(N3.moonC[1]*mk,.6,dawn*dawn*.5),lerp(N3.moonC[2]*mk,.42,dawn*dawn*.5)];
  const sk=N3.sky,sa=.9;LU.sky=[lerp(sk[0]*sa,.16,dawn),lerp(sk[1]*sa,.15,dawn),lerp(sk[2]*sa,.2,dawn)];LU.gnd=[lerp(N3.gnd[0],.05,dawn),lerp(N3.gnd[1],.04,dawn),lerp(N3.gnd[2],.04,dawn)];
  LU.q.set([Q.lanTaps,Q.lampSh,Q.moonPcf,1/QS[R3.q].moonSz]);
  hzFlush();
}
const FL3={next:0};
function setLightU(p){const u=p.u;
  gl.uniform4fv(u.uLanP,LU.lanP);gl.uniform4fv(u.uLanI,LU.lanI);gl.uniform4fv(u.uLanH,LU.lanH);gl.uniform4fv(u.uBeam,LU.beam);
  gl.uniform1i(u.uNL,LU.nl);if(LU.nl){gl.uniform4fv(u.uLmP,LU.lmP,0,LU.nl*4);gl.uniform4fv(u.uLmI,LU.lmI,0,LU.nl*4);}
  gl.uniform1i(u.uNF,LU.nf);if(LU.nf){gl.uniform4fv(u.uFlP,LU.flP,0,LU.nf*4);gl.uniform4fv(u.uFlI,LU.flI,0,LU.nf*4);}
  gl.uniform4fv(u.uGrP,LU.grP);gl.uniform4fv(u.uGrI,LU.grI);gl.uniform4fv(u.uGrH,LU.grH);
  gl.uniform3fv(u.uMoonD,LU.moonD);gl.uniform3fv(u.uMoonC,LU.moonC);gl.uniformMatrix4fv(u.uMoonVP,false,R3.moonVP);gl.uniform3fv(u.uSky,LU.sky);gl.uniform3fv(u.uGnd,LU.gnd);gl.uniform4fv(u.uQ,LU.q);
  bindT(0,HZ.tex,u.uHz);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,MOONT.d);gl.uniform1i(u.uMoonS,1);}
function bindT(unit,t,loc){if(loc==null)return;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc,unit);}
function worldU(p){const u=p.u;gl.uniformMatrix4fv(u.uVP,false,R3.VP);gl.uniform3fv(u.uCam,R3.cam);gl.uniform4f(u.uWorld,WW,WH,ST.rain&&TOWN.kind==='night'?1:0,R3.t);}
/* ---------- the frame ---------- */
const IDM=M4.id();
function render3D(dt){
  R3.t+=dt;R3.frames++;camSetup(dt);lightsPrep(dt);
  const sc=TG.scene;gl.bindFramebuffer(gl.FRAMEBUFFER,sc.f);gl.viewport(0,0,sc.w,sc.h);
  const dawn=R3.dawn||0;gl.clearColor(lerp(.004,.12,dawn),lerp(.005,.1,dawn),lerp(.01,.12,dawn),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  /* the cutaway circle round the lamplighter: houses between him and the camera open up */
  let cut=[0,0,0,0];if(TOWN.kind==='night'&&!P.dead){const s=worldToScreen(P.x,P.y,6);cut=[s[0]*sc.w/R3.cssW,(R3.cssH-s[1])*sc.h/R3.cssH,Math.min(sc.w,sc.h)*.17,s[2]*.5+.5];}
  /* the town: depth first, then the light, once per pixel */
  const pp=PG.pre;gl.useProgram(pp.p);gl.uniformMatrix4fv(pp.u.uVP,false,R3.VP);gl.uniformMatrix4fv(pp.u.uM,false,IDM);gl.uniform4fv(pp.u.uCut,cut);gl.colorMask(false,false,false,false);
  drawMesh(TOWN.mesh);drawMesh(TOWN.glass);gl.colorMask(true,true,true,true);
  const pw=PG.world;gl.useProgram(pw.p);worldU(pw);setLightU(pw);bindT(2,TOWN.gtex,pw.u.uGround);bindT(3,TOWN.aotex,pw.u.uAO);
  gl.uniformMatrix4fv(pw.u.uM,false,IDM);gl.uniform3f(pw.u.uTint,1,1,1);gl.uniform3f(pw.u.uEmis,0,0,0);gl.uniform4fv(pw.u.uLampG,LU.lampG);
  gl.uniform4fv(pw.u.uCut,cut);gl.depthMask(false);drawMesh(TOWN.mesh);drawMesh(TOWN.glass);gl.depthMask(true);gl.uniform4f(pw.u.uCut,0,0,0,0);
  drawSolids(pw);
  /* water */
  if(TOWN.anyW&&TOWN.water){const p=PG.water;gl.useProgram(p.p);worldU(p);setLightU(p);bindT(4,TOWN.shore,p.u.uShore);gl.uniformMatrix4fv(p.u.uM,false,IDM);drawMesh(TOWN.water);}
  /* the darkness: shades, snuffers, the Long Night */
  drawVoids();
  /* sprites */
  fillSprites(dt);drawSprites();
  /* rain */
  if(ST.rain&&TOWN.kind==='night'&&!(S.mode==='over')){const p=PG.rain;gl.useProgram(p.p);setLightU(p);gl.uniformMatrix4fv(p.u.uVP,false,R3.VP);gl.uniform3fv(p.u.uCR,R3.cr);
    gl.uniform4f(p.u.uRain,R3.tgt.x,R3.tgt.y,R3.t,150);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);gl.bindVertexArray(VAO0);gl.drawArraysInstanced(gl.TRIANGLES,0,6,QS[R3.q].rain);gl.depthMask(true);gl.disable(gl.BLEND);}
  /* the night air */
  const fg=TG.fog;gl.bindFramebuffer(gl.FRAMEBUFFER,fg.f);gl.viewport(0,0,fg.w,fg.h);gl.disable(gl.DEPTH_TEST);
  {const p=PG.fog,u=p.u;gl.useProgram(p.p);setLightU(p);bindT(6,sc.d,u.uDepth);bindT(5,FOGNT,u.uFogN);gl.uniformMatrix4fv(u.uInvVP,false,R3.IVP);
    const fogK=(TOWN.kind==='title'?.3:ST.fog)*(1-dawn*.6);gl.uniform4f(u.uFog,(.0035+fogK*.0105)*(R3.fogMul==null?1:R3.fogMul),N3.fogTop,R3.t,N3.fogH||N3.fogTop*.42);const mk=(TOWN.kind==='title'?1:ST.moon);
    gl.uniform3f(u.uFogC,N3.fog[0]*.05*mk+dawn*.25,N3.fog[1]*.05*mk+dawn*.22,N3.fog[2]*.05*mk+dawn*.2);gl.uniform2f(u.uRes,fg.w,fg.h);gl.uniform1f(u.uSteps,QS[R3.q].steps);gl.uniform4f(u.uWorld,WW,WH,0,R3.t);
    gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);}
  /* the glow ladder */
  fsPass(PG.bright,TG.b0,u=>{bindT(0,sc.t,u.uScene);bindT(1,fg.t,u.uFogT);gl.uniform2f(u.uPx,.5/sc.w,.5/sc.h);gl.uniform1f(u.uThr,HDR?.9:.62);});
  const down=[[TG.b0,TG.b1],[TG.b1,TG.b2],[TG.b2,TG.b3],[TG.b3,TG.b4]];for(const [a,b] of down)fsPass(PG.down,b,u=>{bindT(0,a.t,u.uTex);gl.uniform2f(u.uPx,1/a.w,1/a.h);});
  const up=[[TG.b4,TG.u3],[TG.u3,TG.u2],[TG.u2,TG.u1],[TG.u1,TG.u0]];for(const [a,b] of up)fsPass(PG.up,b,u=>{bindT(0,a.t,u.uTex);gl.uniform2f(u.uPx,.5/a.w,.5/a.h);});
  /* the finish, then the dots */
  const toLdr=R3.dots;const dest=toLdr?TG.ldr:null;
  const flash=S.flash>0&&!reduce?S.flash*.35:0,dark=S.mode==='dying'?clamp((S.t-.4)/2.2,0,1)*.88:S.mode==='over'?.5:0,hurt=P.hurt>0?P.hurt*1.6:0,gutter=TOWN.kind==='night'&&!P.dead&&P.oil<22&&S.mode==='play'?(1-P.oil/22)*.5:0;
  fsPass(PG.comp,dest,u=>{bindT(0,sc.t,u.uScene);bindT(1,fg.t,u.uFogT);bindT(2,TG.u0.t,u.uBloom);gl.uniform4f(u.uC1,2.15*(1+dawn*.2),HDR?.55:.4,flash,dark);gl.uniform4f(u.uC2,hurt,gutter,S.paused?.6:0,R3.t);gl.uniform2f(u.uRes,cv.width,cv.height);});
  hudUpload();
  const pd=PG.dots,ud=pd.u,G=GLASS3[GI3];gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);gl.useProgram(pd.p);
  bindT(0,HUDT,ud.uHud);if(toLdr)bindT(1,TG.ldr.t,ud.uImg);gl.uniform4f(ud.uGrid,HUD.pitch*R3.dpr,HUD.pitch*R3.dpr,HUD.ox*R3.dpr,HUD.oy*R3.dpr);gl.uniform2f(ud.uRes,cv.width,cv.height);
  gl.uniform1f(ud.uMode,toLdr?1:0);gl.uniform3fv(ud.uTint,G.tint);gl.uniform3fv(ud.uHot,G.hot);gl.uniform1f(ud.uFlash,0);
  if(!toLdr){gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}
  gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.BLEND);
}
function fsPass(p,dst,setup){gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:cv.width,dst?dst.h:cv.height);gl.useProgram(p.p);if(setup)setup(p.u);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);}
/* the HUD's dots go to the GPU as two bytes each: the level and what the dot does to the picture under it */
let HUDBUF=null;
function hudUpload(){
  if(!HUDT||HUDW!==W||HUDH!==H){if(HUDT)gl.deleteTexture(HUDT);HUDT=mkTex(W,H,gl.RG8,gl.RG,gl.UNSIGNED_BYTE,null,gl.LINEAR);HUDW=W;HUDH=H;HUDBUF=new Uint8Array(W*H*2);}
  for(let i=0;i<N;i++){HUDBUF[i*2]=NB[i];HUDBUF[i*2+1]=NS[i];}
  gl.bindTexture(gl.TEXTURE_2D,HUDT);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RG,gl.UNSIGNED_BYTE,HUDBUF);
}
/* the glass of the dot matrix, as in the original: amber, the deeper red, or ice */
const GLASS3=[{name:'AMBER',tint:[1,.36,.055],hot:[.55,.42,.2]},{name:'RED',tint:[1,.16,.035],hot:[.6,.26,.1]},{name:'ICE',tint:[.22,.52,1],hot:[.4,.55,.6]}];
let GI3=clamp(parseInt(store.get('hd-lantern3d-glass','0'),10)||0,0,GLASS3.length-1);
