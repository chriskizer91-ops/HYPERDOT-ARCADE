/* =====================================================================================
   22. 3D — THE FRAME. A scene pass into a half-float target (the town, the water, the people,
       the darkness, the sprites), the night air at a fraction of the size, a glow ladder, then
       the finish and the dot matrix on top. Quality steps down by itself if the frame rate can't
       hold: first the resolution, then the mist, the rain and the soft shadows.
   ===================================================================================== */
const QS={
  high:{scale:1,fogDiv:2,steps:18,rain:1400,lanTaps:3,lampSh:1,fogSh:2,moonPcf:2,moonSz:2048},
  med:{scale:.5,fogDiv:3,steps:12,rain:800,lanTaps:3,lampSh:1,fogSh:1,moonPcf:1,moonSz:2048},
  low:{scale:.5,fogDiv:4,steps:8,rain:350,lanTaps:1,lampSh:1,fogSh:1,moonPcf:1,moonSz:1024}
};
const QPIN=(/[?&]q=(low|med|high)/.exec(location.search)||[])[1];
const R3={ts:1,q:QPIN||(touchy?'med':'high'),scale:1,auto:!QPIN,ft:16,slow:0,fast:0,cssW:1,cssH:1,dpr:1,VP:M4.id(),V:M4.id(),PR:M4.id(),IVP:M4.id(),cam:[0,0,0],cr:[1,0,0],cu:[0,1,0],
  dots:store.get('hd-lanternr-dots','0')==='1',t:0,frames:0,tgt:{x:192,y:128},camD:180,pitch:1.0,fov:.66,shake:[0,0],moonVP:M4.id(),built:false};
R3.scale=QS[R3.q].scale;
const PG={},TG={};let VAO0=null,SPRVAO=null,SPRBUF=null,FOGNT=null,HUDT=null,HUDW=0,HUDH=0,MOONT=null;
function r3Init(){
  PG.world=prog(VS_WORLD,FS_WORLD);PG.pre=prog(VS_WORLD,FS_PRE);PG.depth=prog(VS_DEPTH,FS_DEPTH);PG.voidp=prog(VS_VOID,FS_VOID);PG.water=prog(VS_WORLD,FS_WATER);
  PG.spr=prog(VS_SPR,FS_SPR);PG.rain=prog(VS_RAIN,FS_RAIN);PG.fog=prog(VS_FS,FS_FOG);PG.bright=prog(VS_FS,FS_BRIGHT);PG.down=prog(VS_FS,FS_DOWN);PG.up=prog(VS_FS,FS_UP);
  PG.comp=prog(VS_FS,FS_COMP);PG.sky=prog(VS_FS,FS_SKY);PG.dots=prog(VS_FS,FS_DOTS);
  VAO0=gl.createVertexArray();
  SPRVAO=gl.createVertexArray();gl.bindVertexArray(SPRVAO);SPRBUF=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,SPRBUF);gl.bufferData(gl.ARRAY_BUFFER,SPR.cap*48,gl.DYNAMIC_DRAW);
  for(let k=0;k<3;k++){gl.enableVertexAttribArray(4+k);gl.vertexAttribPointer(4+k,4,gl.FLOAT,false,48,k*16);gl.vertexAttribDivisor(4+k,1);}gl.bindVertexArray(null);
  const fn=new Uint8Array(FOGS*FOGS);for(let i=0;i<fn.length;i++)fn[i]=Math.round(FOGT[i]*255);FOGNT=mkTex(FOGS,FOGS,gl.R8,gl.RED,gl.UNSIGNED_BYTE,fn,gl.LINEAR,gl.REPEAT);
  hzInit();actorMeshes();
  /* the noise tile every shader reads (unit 7, bound once for good) */
  const nt=new Uint8Array(256*256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){let q=[(x*.1031)%1,(y*.1031)%1,(x*.1031)%1];const dd=q[0]*(q[1]+33.33)+q[1]*(q[2]+33.33)+q[2]*(q[0]+33.33);q=q.map(v=>v+dd);nt[y*256+x]=Math.floor((((q[0]+q[1])*q[2])%1+1)%1*255.99);}
  gl.activeTexture(gl.TEXTURE7);const NTX=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,NTX);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,256,256,0,gl.RED,gl.UNSIGNED_BYTE,nt);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  for(const k in PG){const p=PG[k];if(p.u.uNT){gl.useProgram(p.p);gl.uniform1i(p.u.uNT,7);}}gl.activeTexture(gl.TEXTURE0);
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
  if(R3.slow>1.4){R3.slow=0;R3.ft=18;const minS=R3.q==='high'?.62:.36;
    if(R3.scale>minS+.01){R3.scale=Math.max(minS,R3.scale*.86);r3Targets();}else if(R3.q==='high')setQuality('med');else if(R3.q==='med')setQuality('low');}
  else if(R3.fast>7){R3.fast=0;const top=QS[R3.q].scale;if(R3.scale<top-.01){R3.scale=Math.min(top,R3.scale*1.1);r3Targets();}}
}
/* ---------- the moon's shadow: rendered once per town from above, along the moonlight ---------- */
function moonSky(){const el=N3.moonEl,az=N3.moonAz;return [Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)];}
/* REMAKE: at dawn the light comes from the sun, low in the east, and the shadow map is cast again from there */
const SUN=(()=>{const el=.2,az=-.3;return [Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)];})();
function moonDir(){return R3.sunOn?SUN:moonSky();}
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
/* ---------- REMAKE: the camera stands behind the lamplighter's right shoulder, at street level ----------
   Every mode asks for a pose (an eye and a point to look at, in town coordinates, z up). The camera glides to
   the pose: slowly for a cut between moments, at once while you play. It never goes into a wall: it slides in
   along the height map until the way to the lamplighter is clear. */
const CAM3={yaw:-Math.PI/2,pitch:.22,dd:29,mdx:0,mdy:0,cine:null,cineT:0,trans:1,last:'',e:[0,0,40],a:[0,0,0],init:false};
const angD=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function camInput(dt,live){
  const sens=.0034;CAM3.yaw+=CAM3.mdx*sens;CAM3.pitch=clamp(CAM3.pitch+CAM3.mdy*sens*.7,-.2,.78);CAM3.mdx=0;CAM3.mdy=0;
  if(K('ArrowLeft')||K('KeyQ'))CAM3.yaw-=2.3*dt;if(K('ArrowRight')||K('KeyE'))CAM3.yaw+=2.3*dt;
  let stick=false;for(const p of pads()){const rx=p.axes[2]||0,ry=p.axes[3]||0;if(Math.abs(rx)>.15){CAM3.yaw+=rx*Math.abs(rx)*3.2*dt;stick=true;}if(Math.abs(ry)>.15)CAM3.pitch=clamp(CAM3.pitch+ry*1.5*dt,-.2,.78);}
  /* thumbs and sticks get a little help: with the beam open, the view leans toward the nearest thing in front */
  if(live&&P.beam&&(touchy||stick||pads().length)){let best=null,bd=1e9;
    const cand=[...SH.filter(s=>s.in>.5),...SNUF];if(BOSS.on&&BOSS.eye>0)cand.push(BOSS);
    for(const s of cand){const d=Math.hypot(s.x-P.x,s.y-P.y);if(d>72)continue;const da=angD(Math.atan2(s.y-P.y,s.x-P.x),CAM3.yaw);if(Math.abs(da)<.55&&d<bd){bd=d;best=da;}}
    if(best!=null)CAM3.yaw+=clamp(best,-2.6*dt,2.6*dt);}
  CAM3.pitch+=(clamp(CAM3.pitch,-.2,.78)-CAM3.pitch);
}
function camClear(px,py,pz,e){let ex=e[0],ey=e[1],ez=e[2];const D=Math.hypot(ex-px,ey-py,ez-pz)||1;for(let s=1.5;s<=D;s+=1){const k=s/D;if(hmAt(px+(ex-px)*k,py+(ey-py)*k)>pz+(ez-pz)*k-1.7){const q=Math.max(3.5,s-2.2)/D;return [px+(ex-px)*q,py+(ey-py)*q,pz+(ez-pz)*q];}}return e;}
function posePlay(yaw,pt){
  /* behind the right shoulder; when a wall is in the way the camera rises over him rather than pressing up to his back */
  const portrait=R3.cssW/R3.cssH<.9,fx=Math.cos(yaw),fy=Math.sin(yaw),rx=-fy,ry=fx,D=portrait?33:28.5;
  const fit=(p)=>{const sh=(portrait?2.2:4.4),px=P.x+rx*sh,py=P.y+ry*sh,pz=13.4,cp=Math.cos(p),sp_=Math.sin(p),ex=px-fx*cp*D,ey=py-fy*cp*D,ez=pz+sp_*D;
    let dd=D;for(let s=1.5;s<=D;s+=1){const k=s/D;if(hmAt(px+(ex-px)*k,py+(ey-py)*k)>pz+(ez-pz)*k-1.7){dd=Math.max(3.5,s-2.2);break;}}return dd;};
  let p=pt,dd=fit(pt);if(dd<D*.75){for(const q of [pt+.3,pt+.6,pt+.9]){const d2=fit(Math.min(q,1.15));if(d2>dd+2){dd=d2;p=Math.min(q,1.15);}if(dd>=D*.75)break;}}
  CAM3.pe=(CAM3.pe==null?p:CAM3.pe)+(p-(CAM3.pe==null?p:CAM3.pe))*.08;p=CAM3.pe;
  CAM3.dd=dd<CAM3.dd?dd:CAM3.dd+(dd-CAM3.dd)*.05;const k=CAM3.dd/D,sh=(portrait?2.2:4.4)*k,px=P.x+rx*sh,py=P.y+ry*sh,pz=13.4,cp=Math.cos(p),sp_=Math.sin(p);
  const ex=px-fx*cp*D*k,ey=py-fy*cp*D*k,ez=pz+sp_*D*k;
  return {e:[ex,ey,ez],a:[ex+fx*cp*100,ey+fy*cp*100,ez-Math.sin(pt)*100]};
}
function camSetup(dt){
  const asp=R3.cssW/R3.cssH,portrait=asp<.9;R3.fov=portrait?1.22:.96;const m=S.mode,t=S.t;let pose,rate=60;
  if(m!==CAM3.last){CAM3.last=m;CAM3.trans=1;}CAM3.trans=Math.max(0,CAM3.trans-dt/1.8);
  if(TOWN.kind==='night'){
    if(m==='attract'){/* the title: the lamplighter under a lit lamp, the camera swaying slowly, the street open behind him */const a=(R3.titleA||0)+Math.sin(TT.t*.11)*.22,R=portrait?40:27;
      pose={e:camClear(P.x,P.y,12,[P.x+Math.cos(a)*R,P.y+Math.sin(a)*R,9.5+Math.sin(TT.t*.13)*2]),a:[P.x,P.y,portrait?10:15.5]};rate=3;}
    else if(m==='chapter'){/* the chapter card: a slow flight high over the town */const a=-2.1+t*.045,R=210-t*3;
      pose={e:[WW/2+Math.cos(a)*R,WH/2+Math.sin(a)*R*.8,175-t*4],a:[lerp(WW/2,P.x,clamp(t/14,0,1)),lerp(WH/2,P.y,clamp(t/14,0,1)),0]};rate=1.2;}
    else if(m==='dying'){const k=clamp(t/3,0,1),a=CAM3.yaw+Math.PI+k*.9;pose={e:camClear(P.x,P.y,8,[P.x+Math.cos(a)*(20-k*6),P.y+Math.sin(a)*(20-k*6),9+k*6]),a:[P.x,P.y,3]};rate=2;}
    else if(m==='over'){pose={e:[P.x+5,P.y+16,26],a:[P.x,P.y,0]};rate=1.5;}
    else if(m==='dawn'||m==='ending'){/* dawn: the camera rises and turns to the sunrise in the east */const k=easeIO(clamp(t/7,0,1));
      pose={e:[P.x-6,P.y+4,lerp(16,64,k)],a:[P.x+200,P.y-40,lerp(10,60,k)]};rate=1.4;}
    else{if(m==='demo'||window.__auto){CAM3.yaw+=angD(P.aim,CAM3.yaw)*Math.min(1,dt*3);}
      pose=posePlay(CAM3.yaw,CAM3.pitch);
      /* a few moments get a shot of their own, while the night runs slow */
      const c=CAM3.cine;if(c){c.t+=dt;const w=Math.min(1,c.t/.5)*Math.min(1,(c.dur-c.t)/.6);
        let cp=null;if(c.k==='great'&&TOWER)cp={e:[P.x+(P.x-TOWER.x)*.35,P.y+(P.y-TOWER.y)*.35+8,30],a:[TOWER.x,TOWER.y,78]};
        else if(c.k==='boss'&&BOSS.on)cp={e:[P.x+(P.x-BOSS.x)*.25,P.y+(P.y-BOSS.y)*.25+10,22],a:[BOSS.x,BOSS.y,BOSS.r*1.4]};
        else if(c.k==='last'){const fx=Math.cos(CAM3.yaw),fy=Math.sin(CAM3.yaw);cp={e:[P.x-fx*40,P.y-fy*40,lerp(20,46,c.t/c.dur)],a:[P.x+fx*40,P.y+fy*40,0]};}
        if(cp&&w>0)for(const k of ['e','a'])for(let i=0;i<3;i++)pose[k][i]=lerp(pose[k][i],cp[k][i],w*w*(3-2*w));
        if(c.t>=c.dur)CAM3.cine=null;}
      if(m==='intro')rate=1.4;}
  }else pose={e:[96,140,40],a:[96,40,0]};
  if(CAM3.trans>0)rate=Math.min(rate,lerp(60,2.2,CAM3.trans));
  if(!CAM3.init){CAM3.init=true;CAM3.e=pose.e.slice();CAM3.a=pose.a.slice();}
  const k=Math.min(1,dt*rate);for(let i=0;i<3;i++){CAM3.e[i]+=(pose.e[i]-CAM3.e[i])*k;CAM3.a[i]+=(pose.a[i]-CAM3.a[i])*k;}
  const sh=S.shake>0&&!reduce?S.shake*S.shake*1.4:0,sx=sh?rnd(-sh,sh):0,sz=sh?rnd(-sh,sh):0;
  let e=[CAM3.e[0]+sx,CAM3.e[2]+sz,CAM3.e[1]],c=[CAM3.a[0],CAM3.a[2],CAM3.a[1]];
  if(R3.dbg){const d=R3.dbg;c=[d.x,d.z||0,d.y];e=[d.x-Math.sin(d.yaw||0)*Math.cos(d.p)*d.D,(d.z||0)+Math.sin(d.p)*d.D,d.y+Math.cos(d.yaw||0)*Math.cos(d.p)*d.D];}
  R3.V=M4.look(e,c,[0,1,0]);R3.PR=M4.persp(R3.fov,asp,1.2,1700);R3.VP=M4.mul(R3.PR,R3.V);R3.IVP=M4.inv(R3.VP);R3.cam=e;
  R3.cr=[R3.V[0],R3.V[4],R3.V[8]];R3.cu=[R3.V[1],R3.V[5],R3.V[9]];R3.tgt.x=CAM3.a[0];R3.tgt.y=CAM3.a[1];
}
function cine(k,dur){if(!CAM3.cine||CAM3.cine.k!==k)CAM3.cine={k,t:0,dur};}
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
    /* a lamp whose light can't reach anything in front of the camera is left out */
    const cf=[CAM3.a[0]-CAM3.e[0],CAM3.a[1]-CAM3.e[1]],cl=Math.hypot(cf[0],cf[1])||1,ahead=((L.x-CAM3.e[0])*cf[0]+(L.y-CAM3.e[1])*cf[1])/cl;
    if(I>.004&&LU.nl<MAXL&&(TOWN.kind!=='night'||ahead>-R-8||R3.dbg)){const o=LU.nl*4;LU.lmP.set([L.x,TOWN.lampsZ,L.y,R],o);LU.lmI.set([I,HZP.r0+i*HZP.nr,HZP.nr,HZP.st],o);LU.nl++;}}
  /* flares: their horizon is cast when they catch */
  LU.nf=0;for(const f of FLARES){if(LU.nf>=3)break;if(f.slot==null){f.slot=FL3.next++%3;hzCast(HZF.r0+f.slot*HZF.nr,HZF.nr,HZF.st,f.x,f.y,3,1.5);}
    const k=1-f.t/f.dur,o=LU.nf*4;LU.flP.set([f.x,3,f.y,f.R],o);LU.flI.set([2.4*k*k,HZF.r0+f.slot*HZF.nr,HZF.nr,HZF.st],o);LU.nf++;}
  /* the great lamp */
  if(GREAT.on&&TOWER){if(!GREAT.hz3){GREAT.hz3=1;hzCast(HZG.r0,HZG.nr,HZG.st,TOWER.x,TOWER.y,91,TOWER.r+1.5);}
    LU.grP.set([TOWER.x,91,TOWER.y,GREAT.R]);LU.grI.set([1.6*GREAT.k,Math.cos(GREAT.a),Math.sin(GREAT.a),Math.cos(GREAT.half)]);LU.grH.set([HZG.r0,HZG.nr,HZG.st,TOWER.r+1]);LU.lampG[60]=1.8*GREAT.k;LU.lampG[61]=1.5*GREAT.k;LU.lampG[62]=1.1*GREAT.k;}
  else{LU.grI[0]=0;GREAT.hz3=0;}
  /* moon and sky; dawn warms them */
  let dawn=m==='dawn'||m==='ending'?clamp(S.t/7,0,1):0;R3.dawn=dawn;if(dawn>0&&!R3.sunOn){R3.sunOn=true;moonMap();}
  const md=moonDir(),mk=(TOWN.kind==='title'?1:ST.moon)*.11*(R3.sunOn?Math.max(.15,dawn):1);
  LU.moonD=md;LU.moonC=[lerp(N3.moonC[0]*mk,1.1,dawn*dawn*.5),lerp(N3.moonC[1]*mk,.6,dawn*dawn*.5),lerp(N3.moonC[2]*mk,.42,dawn*dawn*.5)];
  const sk=N3.sky,sa=.9;LU.sky=[lerp(sk[0]*sa,.16,dawn),lerp(sk[1]*sa,.15,dawn),lerp(sk[2]*sa,.2,dawn)];LU.gnd=[lerp(N3.gnd[0],.05,dawn),lerp(N3.gnd[1],.04,dawn),lerp(N3.gnd[2],.04,dawn)];
  LU.q.set([Q.lanTaps,Q.lampSh,Q.moonPcf,1/QS[R3.q].moonSz]);const SKq=R3.skip||{};if(SKq.lamps)LU.nl=0;if(SKq.soft)LU.q.set([1,0,1,1/QS[R3.q].moonSz]);
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
const PROFB=new Uint8Array(4);function PM(k){if(!R3.prof)return;const g=gl,f=g.getParameter(g.FRAMEBUFFER_BINDING);g.bindFramebuffer(g.FRAMEBUFFER,null);g.readPixels(0,0,1,1,g.RGBA,g.UNSIGNED_BYTE,PROFB);g.bindFramebuffer(g.FRAMEBUFFER,f);const t=performance.now();R3.prof[k]=(R3.prof[k]||0)+(t-(R3.prof._t||t));R3.prof._t=t;}
function render3D(dt){
  if(R3.prof)R3.prof._t=performance.now();
  R3.t+=dt;R3.frames++;camSetup(dt);lightsPrep(dt);
  const sc=TG.scene;gl.bindFramebuffer(gl.FRAMEBUFFER,sc.f);gl.viewport(0,0,sc.w,sc.h);
  const dawn=R3.dawn||0;gl.clearColor(lerp(.004,.12,dawn),lerp(.005,.1,dawn),lerp(.01,.12,dawn),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  PM('pre');
  const SK=R3.skip||{};if(!SK.sky){const p=PG.sky,u=p.u;gl.useProgram(p.p);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.uniformMatrix4fv(u.uInvVP,false,R3.IVP);gl.uniform3fv(u.uCamP,R3.cam);
    gl.uniform3fv(u.uMoonD,moonSky());gl.uniform3fv(u.uSunD,SUN);gl.uniform4f(u.uSk,R3.t,dawn,(TOWN.kind==='title'?1:ST.moon)*(1-dawn*.5),TOWN.sea?1:0);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
  /* the cutaway circle round the lamplighter: houses between him and the camera open up */
  const cut=[0,0,0,0];
  /* the town: depth first, then the light, once per pixel */
  PM('sky');
  if(!SK.town){const pp=PG.pre;gl.useProgram(pp.p);gl.uniformMatrix4fv(pp.u.uVP,false,R3.VP);gl.uniformMatrix4fv(pp.u.uM,false,IDM);gl.colorMask(false,false,false,false);
  if(!SK.pre){drawMesh(TOWN.mesh);drawMesh(TOWN.glass);}gl.colorMask(true,true,true,true);PM('prepass');
  {const pw=PG.world;gl.useProgram(pw.p);worldU(pw);setLightU(pw);bindT(2,TOWN.gtex,pw.u.uGround);bindT(3,TOWN.aotex,pw.u.uAO);
  gl.uniformMatrix4fv(pw.u.uM,false,IDM);gl.uniform3f(pw.u.uTint,1,1,1);gl.uniform3f(pw.u.uEmis,0,0,0);gl.uniform4fv(pw.u.uLampG,LU.lampG);
  gl.depthMask(!!SK.pre);if(!SK.world){drawMesh(TOWN.mesh);drawMesh(TOWN.glass);}gl.depthMask(true);}}const pw=PG.world;
  PM('town');
  if(!SK.solids){gl.useProgram(pw.p);drawSolids(pw);}
  PM('solids');
  /* water */
  if(TOWN.anyW&&TOWN.water){const p=PG.water;gl.useProgram(p.p);worldU(p);setLightU(p);gl.uniform3f(p.u.uHor,lerp(.014,.3,dawn),lerp(.018,.22,dawn),lerp(.03,.2,dawn));bindT(4,TOWN.shore,p.u.uShore);gl.uniformMatrix4fv(p.u.uM,false,IDM);drawMesh(TOWN.water);}
  PM('water');
  /* the darkness: shades, snuffers, the Long Night */
  drawVoids();
  /* sprites */
  PM('voids');
  if(!SK.spr){fillSprites(dt);drawSprites();}
  PM('sprites');
  /* rain */
  if(ST.rain&&TOWN.kind==='night'&&!(S.mode==='over')){const p=PG.rain;gl.useProgram(p.p);setLightU(p);gl.uniformMatrix4fv(p.u.uVP,false,R3.VP);gl.uniform3fv(p.u.uCR,R3.cr);gl.uniform3fv(p.u.uCamP,R3.cam);
    gl.uniform4f(p.u.uRain,CAM3.e[0]+Math.cos(CAM3.yaw)*40,CAM3.e[1]+Math.sin(CAM3.yaw)*40,R3.t,75);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);gl.bindVertexArray(VAO0);gl.drawArraysInstanced(gl.TRIANGLES,0,6,QS[R3.q].rain);gl.depthMask(true);gl.disable(gl.BLEND);}
  PM('rain');
  /* the night air */
  const fg=TG.fog;gl.bindFramebuffer(gl.FRAMEBUFFER,fg.f);gl.viewport(0,0,fg.w,fg.h);gl.disable(gl.DEPTH_TEST);
  if(!SK.fog){const p=PG.fog,u=p.u;gl.useProgram(p.p);setLightU(p);bindT(6,sc.d,u.uDepth);bindT(5,FOGNT,u.uFogN);gl.uniformMatrix4fv(u.uInvVP,false,R3.IVP);
    const fogK=(TOWN.kind==='title'?.3:ST.fog)*(1-dawn*.6);gl.uniform4f(u.uFog,(.0011+fogK*.0042)*(R3.fogMul==null?1:R3.fogMul),N3.fogTop,R3.t,N3.fogH||N3.fogTop*.42);const mk=(TOWN.kind==='title'?1:ST.moon);
    gl.uniform3f(u.uFogC,N3.fog[0]*.05*mk+dawn*.25,N3.fog[1]*.05*mk+dawn*.22,N3.fog[2]*.05*mk+dawn*.2);gl.uniform2f(u.uRes,fg.w,fg.h);gl.uniform1f(u.uSteps,QS[R3.q].steps);gl.uniform4f(u.uWorld,WW,WH,0,R3.t);
    gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);}
  PM('fog');
  /* the glow ladder */
  fsPass(PG.bright,TG.b0,u=>{bindT(0,sc.t,u.uScene);bindT(1,fg.t,u.uFogT);gl.uniform2f(u.uPx,.5/sc.w,.5/sc.h);gl.uniform1f(u.uThr,HDR?.9:.62);});
  const down=[[TG.b0,TG.b1],[TG.b1,TG.b2],[TG.b2,TG.b3],[TG.b3,TG.b4]];for(const [a,b] of down)fsPass(PG.down,b,u=>{bindT(0,a.t,u.uTex);gl.uniform2f(u.uPx,1/a.w,1/a.h);});
  const up=[[TG.b4,TG.u3],[TG.u3,TG.u2],[TG.u2,TG.u1],[TG.u1,TG.u0]];for(const [a,b] of up)fsPass(PG.up,b,u=>{bindT(0,a.t,u.uTex);gl.uniform2f(u.uPx,.5/a.w,.5/a.h);});
  PM('bloom');
  /* the finish, then the dots */
  const toLdr=R3.dots;const dest=toLdr?TG.ldr:null;
  const flash=S.flash>0&&!reduce?S.flash*.35:0,dark=S.mode==='dying'?clamp((S.t-.4)/2.2,0,1)*.88:S.mode==='over'?.5:0,hurt=P.hurt>0?P.hurt*1.6:0,gutter=TOWN.kind==='night'&&!P.dead&&P.oil<22&&S.mode==='play'?(1-P.oil/22)*.5:0;
  fsPass(PG.comp,dest,u=>{bindT(0,sc.t,u.uScene);bindT(1,fg.t,u.uFogT);bindT(2,TG.u0.t,u.uBloom);gl.uniform4f(u.uC1,2.15*(1+dawn*.2),HDR?.55:.4,flash,dark);gl.uniform4f(u.uC2,hurt,gutter,S.paused?.6:0,R3.t);gl.uniform2f(u.uRes,cv.width,cv.height);});
  hudUpload();
  const pd=PG.dots,ud=pd.u,G=GLASS3[GI3];gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);gl.useProgram(pd.p);
  bindT(0,HUDT,ud.uHud);if(toLdr)bindT(1,TG.ldr.t,ud.uImg);gl.uniform4f(ud.uGrid,HUD.pitch*R3.dpr,HUD.pitch*R3.dpr,HUD.ox*R3.dpr,HUD.oy*R3.dpr);gl.uniform2f(ud.uRes,cv.width,cv.height);
  gl.uniform1f(ud.uMode,toLdr?1:0);gl.uniform3fv(ud.uTint,G.tint);gl.uniform3fv(ud.uHot,G.hot);gl.uniform1f(ud.uFlash,0);
  if(!toLdr){gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}
  gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.BLEND);PM('finish');
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
let GI3=clamp(parseInt(store.get('hd-lanternr-glass','0'),10)||0,0,GLASS3.length-1);
