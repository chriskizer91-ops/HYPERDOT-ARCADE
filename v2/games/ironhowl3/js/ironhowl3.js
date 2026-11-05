/* Ironhowl 3 - Hyperdot Arcade. Built from v2/src/ironhowl3/game by build.py */
(function(){'use strict';
/* ---- 01_base.js ---- */
/* ===================== basics =====================
   World: three.js axes. x east, y up, z south. A yaw of 0 faces north (-z);
   forward(yaw) = (-sin yaw, 0, -cos yaw), right(yaw) = (cos yaw, 0, -sin yaw). Object3D.rotation.y = yaw. */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const damp=(rate,dt)=>1-Math.exp(-rate*dt);
const angD=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const Q=new URLSearchParams(location.search);
const DEV=Q.has('dev');
const KP='hd-ironhowl3-';
const store={get(k,d){try{const v=localStorage.getItem(KP+k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(KP+k,String(v));}catch(e){}}};
const touchy=Q.has('touch')||matchMedia('(hover: none)').matches;
const EMBED=Q.get('embed')==='1';
/* arcade bridge. The 3D Hyperdot Arcade loads this page in an iframe with ?embed=1:
   game -> arcade {src:'hyperdot',id,type:'ready'|'score'|'over'|'exit',...}
   arcade -> game {src:'hyperdot-arcade',cmd:'start'|'pause'|'resume'|'attract'|'mute'|'unmute'} */
const ARC={id:'ironhowl3',title:'IRONHOWL 3',muted:false,live:false,last:0,sent:-1,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:this.id},data||{}),'*');}catch(e){}},
  begin(){this.live=true;this.sent=-1;},
  score(s){if(!this.live)return;const t=performance.now();if(s!==this.sent&&t-this.last>250){this.last=t;this.sent=s;this.post('score',{score:s});}},
  over(score,tickets){if(!this.live)return;this.live=false;this.post('over',{score,tickets:Math.max(0,Math.round(tickets||0))});},
  exit(){this.post('exit');}
};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* smooth value noise for terrain */
function hash2(x,y){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,o){let s=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){s+=vnoise(x*f,y*f)*a;n+=a;a*=.5;f*=2.03;}return s/n;}
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);

/* ---- 02_input.js ---- */
/* ===================== controls =====================
   readCtl(dt) gives one frame of intent:
   mx,my  move (-1..1, my = forward), turn/pitch (radians this frame), jet (held), jetHit (pressed this frame), view/pause (pressed). */
const KEYS=new Set(),HIT=new Set();
const MOUSE={dx:0,dy:0,locked:false,l:false,rHit:false};
addEventListener('mousedown',e=>{if(!MOUSE.locked)return;if(e.button===0)MOUSE.l=true;if(e.button===2)MOUSE.rHit=true;});
addEventListener('mouseup',e=>{if(e.button===0)MOUSE.l=false;});
addEventListener('contextmenu',e=>e.preventDefault());
const TS={id:-1,ox:0,oy:0,ax:0,ay:0,look:-1,lx:0,ly:0,ldx:0,ldy:0,jet:false,jetHit:false,fire:false,fireId:-1,msl:false,vent:false,salvo:false};
let PAD_PREV={};
addEventListener('keydown',e=>{if(e.repeat)return;KEYS.add(e.code);HIT.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>KEYS.delete(e.code));
addEventListener('blur',()=>{KEYS.clear();TS.id=-1;TS.look=-1;TS.jet=false;TS.fire=false;TS.fireId=-1;MOUSE.l=false;});
addEventListener('mousemove',e=>{if(MOUSE.locked){MOUSE.dx+=e.movementX||0;MOUSE.dy+=e.movementY||0;}});
document.addEventListener('pointerlockchange',()=>{MOUSE.locked=document.pointerLockElement===cv;if(!MOUSE.locked&&G.mode==='play'&&!G.paused&&!touchy)setPause(true);});
function lockMouse(){if(touchy||EMBED&&!document.hasFocus())return;try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
const STICK_R=58;
function touchStart(e){
  for(const t of e.changedTouches){
    if(t.target.closest&&t.target.closest('button'))continue;
    if(t.clientX<innerWidth*.45&&TS.id<0){TS.id=t.identifier;TS.ox=t.clientX;TS.oy=t.clientY;TS.ax=TS.ay=0;HUD.stick(true,TS.ox,TS.oy,0,0);}
    else if(TS.look<0){TS.look=t.identifier;TS.lx=t.clientX;TS.ly=t.clientY;}
  }
  if(G.mode==='play')e.preventDefault();
}
function touchMove(e){
  for(const t of e.changedTouches){
    if(t.identifier===TS.id){let dx=t.clientX-TS.ox,dy=t.clientY-TS.oy;const d=Math.hypot(dx,dy);
      if(d>STICK_R){/* the stick base follows the thumb so it never runs out of room */TS.ox+=dx/d*(d-STICK_R);TS.oy+=dy/d*(d-STICK_R);dx=t.clientX-TS.ox;dy=t.clientY-TS.oy;}
      TS.ax=dx/STICK_R;TS.ay=dy/STICK_R;HUD.stick(true,TS.ox,TS.oy,dx,dy);}
    else if(t.identifier===TS.look||t.identifier===TS.fireId){TS.ldx+=t.clientX-TS.lx;TS.ldy+=t.clientY-TS.ly;TS.lx=t.clientX;TS.ly=t.clientY;}
  }
  if(G.mode==='play')e.preventDefault();
}
function touchEnd(e){for(const t of e.changedTouches){if(t.identifier===TS.id){TS.id=-1;TS.ax=TS.ay=0;HUD.stick(false);}if(t.identifier===TS.look)TS.look=-1;}}
addEventListener('touchstart',touchStart,{passive:false});
addEventListener('touchmove',touchMove,{passive:false});
addEventListener('touchend',touchEnd);addEventListener('touchcancel',touchEnd);
function readCtl(dt){
  const o={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false,view:false,pause:false,fire:false,msl:false,vent:false,salvo:false};
  const k=c=>KEYS.has(c);
  o.mx=(k('KeyD')?1:0)-(k('KeyA')?1:0);o.my=(k('KeyW')||k('ArrowUp')?1:0)-(k('KeyS')||k('ArrowDown')?1:0);
  o.turn+=((k('ArrowRight')?1:0)-(k('ArrowLeft')?1:0))*2.4*dt;
  if(MOUSE.locked){o.turn+=MOUSE.dx*.0026;o.pitch-=MOUSE.dy*.002;}
  MOUSE.dx=MOUSE.dy=0;
  o.jet=k('Space');o.jetHit=HIT.has('Space');o.fire=MOUSE.l||k('KeyF');o.msl=MOUSE.rHit||HIT.has('KeyG');o.vent=HIT.has('KeyR');o.salvo=HIT.has('KeyQ')||HIT.has('KeyE');MOUSE.rHit=false;o.view=HIT.has('KeyV');o.pause=HIT.has('KeyP')||HIT.has('Escape');
  /* touch */
  if(TS.id>=0){const m=Math.min(1,Math.hypot(TS.ax,TS.ay)),a=Math.atan2(TS.ay,TS.ax),dz=m<.12?0:(m-.12)/.88;o.mx+=Math.cos(a)*dz;o.my-=Math.sin(a)*dz;}
  if(TS.ldx||TS.ldy){o.turn+=TS.ldx*.0062*SET.sens;o.pitch-=TS.ldy*.004*SET.sens;TS.ldx=TS.ldy=0;}
  if(TS.jet)o.jet=true;if(TS.jetHit){o.jetHit=true;TS.jetHit=false;}
  if(TS.fire)o.fire=true;if(TS.msl){o.msl=true;TS.msl=false;}if(TS.vent){o.vent=true;TS.vent=false;}if(TS.salvo){o.salvo=true;TS.salvo=false;}
  /* gamepad */
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  for(const p of pads){if(!p||!p.connected)continue;const ax=i=>Math.abs(p.axes[i]||0)>.16?p.axes[i]:0,b=i=>p.buttons[i]&&p.buttons[i].pressed;
    o.mx+=ax(0);o.my-=ax(1);o.turn+=ax(2)*2.8*dt;o.pitch-=ax(3)*1.6*dt;
    if(b(0)||b(4))o.jet=true;const pr=PAD_PREV;if((b(0)||b(4))&&!pr.j)o.jetHit=true;if(b(3)&&!pr.v)o.view=true;if(b(9)&&!pr.s)o.pause=true;
    if(b(7)||b(5))o.fire=true;if(b(6)&&!pr.m)o.msl=true;if(b(1)&&!pr.x)o.vent=true;if(b(2)&&!pr.q)o.salvo=true;
    PAD_PREV={j:b(0)||b(4),v:b(3),s:b(9),m:b(6),x:b(1),q:b(2)};break;}
  const l=Math.hypot(o.mx,o.my);if(l>1){o.mx/=l;o.my/=l;}
  HIT.clear();
  return o;
}

/* ---- 03_render.js ---- */
/* ===================== renderer, quality, sky, light ===================== */
const cv=$('gl');
const SET={quality:store.get('quality','auto'),view:store.get('view','close'),sens:parseFloat(store.get('sens','1'))||1,sound:store.get('sound','1')==='1'};
/* px = pixel budget; shadow = map size (0 = off); grass/near/far = draw distances in metres */
const QUAL={low:{px:.75e6,shadow:0,grass:24,grassNear:8,near:24,far:115,fog:100},
            med:{px:1.35e6,shadow:1024,grass:36,grassNear:12,near:32,far:165,fog:140},
            high:{px:3.4e6,shadow:2048,grass:52,grassNear:18,near:48,far:230,fog:185}};
let QL=SET.quality==='auto'?(touchy?'med':'high'):SET.quality,QC=QUAL[QL],DYN=1;
const R=new THREE.WebGLRenderer({canvas:cv,antialias:!Q.has('noaa'),powerPreference:'high-performance',stencil:false});
R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.18;
R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFShadowMap;R.shadowMap.autoUpdate=true;
const S=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(66,1,.1,700);
function resize(){
  const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,Math.sqrt(QC.px/(w*h)))*DYN;
  R.setPixelRatio(Math.max(.5,dpr));R.setSize(w,h,false);cv.style.width=w+'px';cv.style.height=h+'px';cam.aspect=w/h;cam.updateProjectionMatrix();
}
addEventListener('resize',resize);
/* shared uniforms used by every world material hook */
const U={tCloud:{value:null},uCloudOff:{value:new THREE.Vector2()},uCloudScale:{value:1/420},uCloudAmt:{value:.75},uSunXZ:{value:new THREE.Vector2()},
  uLeafGlow:{value:.26},uTime:{value:0}};
/* --- loading --- */
const LM=new THREE.LoadingManager();let LOADP=0;
LM.onProgress=(u,a,b)=>{LOADP=a/b;HUD.load(LOADP);};
const TL=new THREE.TextureLoader(LM);
const ART='art/';
function tex(n,o={}){const t=TL.load(ART+n+'.webp');t.wrapS=t.wrapT=o.clamp?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;if(o.rep)t.repeat.set(o.rep,o.rep);
  if(o.srgb!==false)t.colorSpace=THREE.SRGBColorSpace;if(o.glb)t.flipY=false;   /* models from Blender use glTF's upside-down v */t.anisotropy=Math.min(8,R.capabilities.getMaxAnisotropy());return t;}
/* --- light --- */
const SUN=new THREE.Vector3(-.42,.62,-.66).normalize();   /* direction toward the sun: high, from the north-west */
const HEMI=new THREE.HemisphereLight(0xd6e4ff,0x6a5a44,1.55);S.add(HEMI);
const KEY=new THREE.DirectionalLight(0xfff0d6,3.1);KEY.castShadow=true;S.add(KEY,KEY.target);
KEY.shadow.bias=-.0004;KEY.shadow.normalBias=.05;
function setShadow(){const s=QC.shadow;KEY.castShadow=s>0;R.shadowMap.enabled=s>0;if(s){KEY.shadow.mapSize.set(s,s);if(KEY.shadow.map){KEY.shadow.map.dispose();KEY.shadow.map=null;}
  const r=QL==='high'?42:34;Object.assign(KEY.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:260});KEY.shadow.camera.updateProjectionMatrix();}}
/* the shadow box follows a point in front of the mech, snapped to shadow texels so edges do not crawl */
function placeSun(fx,fz){
  const s=QC.shadow||1024,r=KEY.shadow.camera.right,step=2*r/s;
  const ux=Math.round(fx/step)*step,uz=Math.round(fz/step)*step;
  KEY.target.position.set(ux,0,uz);KEY.position.set(ux+SUN.x*120,SUN.y*120,uz+SUN.z*120);KEY.target.updateMatrixWorld();
}
/* --- sky dome: gradient, sun, drifting clouds (the same cloud texture throws the moving shadows on the ground) --- */
const SKYU={tPano:{value:null},uPano:{value:0},uPanoK:{value:1},uSun:{value:SUN},uZen:{value:new THREE.Color(0x2a5fb4)},uHor:{value:new THREE.Color(0xb3c8de)},uSunC:{value:new THREE.Color(1,.93,.8)},
  tCloud:U.tCloud,uCloudOff:U.uCloudOff,uCloudAmt:U.uCloudAmt};
const SKY=new THREE.Mesh(new THREE.SphereGeometry(500,32,16),new THREE.ShaderMaterial({uniforms:SKYU,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
  fragmentShader:`uniform vec3 uSun,uZen,uHor,uSunC;uniform sampler2D tCloud,tPano;uniform vec2 uCloudOff;uniform float uCloudAmt,uPano,uPanoK;varying vec3 vD;
  void main(){vec3 d=normalize(vD);float h=max(d.y,0.);
    if(uPano>.5){vec2 uv=vec2(atan(d.x,-d.z)/6.2831853+.5,.5+asin(clamp(d.y,-1.,1.))/3.1415927);vec3 pc=texture2D(tPano,vec2(uv.x,max(uv.y,.502))).rgb*uPanoK;
      float sd=max(dot(d,uSun),0.);pc+=uSunC*pow(sd,700.)*10.;if(d.y<0.)pc=mix(pc,uHor,min(1.,-d.y*6.));gl_FragColor=vec4(pc,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;}
    vec3 c=mix(uHor,uZen,pow(h,.42));
    float sd=max(dot(d,uSun),0.);c+=uSunC*(pow(sd,900.)*28.+pow(sd,24.)*.55+pow(sd,4.)*.12);
    if(d.y>0.){vec2 uv=d.xz/(d.y+.1)*1.05+uCloudOff;
      float n1=texture2D(tCloud,uv).r,n2=texture2D(tCloud,uv*2.3).r,n=clamp((n1*.72+n2*.28-.2)/.36,0.,1.);
      n1=clamp((n1-.2)/.36,0.,1.);n2=clamp((n2-.2)/.36,0.,1.);
      float cl=smoothstep(.36,.86,n)*uCloudAmt*smoothstep(0.,.15,d.y);
      vec3 cc=mix(vec3(.46,.5,.58),vec3(1.05,1.03,1.),smoothstep(.25,.85,n2*.55+(1.-n1)*.65))+uSunC*pow(sd,6.)*.6;
      c=mix(c,cc,cl*.94);}
    else c=mix(uHor,uHor*.8,min(1.,-d.y*4.));
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`}));
SKY.renderOrder=-10;SKY.frustumCulled=false;S.add(SKY);
S.fog=new THREE.Fog(0xb3c8de,30,160);
/* --- material hook: cloud shadows on the sun light, optional dither fade (per instance), optional leaf lighting --- */
const LEAF_NORMAL=THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;','');
function hookWorld(mat,o={}){
  mat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,{tCloud:U.tCloud,uCloudOff:U.uCloudOff,uCloudScale:U.uCloudScale,uCloudAmt:U.uCloudAmt,uSunXZ:U.uSunXZ,uLeafGlow:U.uLeafGlow});
    if(o.ground)Object.assign(sh.uniforms,{tB:{value:o.ground.tB},tC:{value:o.ground.tC},uBRep:{value:o.ground.bRep},uCRep:{value:o.ground.cRep},uTint:{value:new THREE.Vector3(...o.ground.tint)}});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;'+(o.fade?'\nattribute float aFade;varying float vFade;':'')+(o.ground?'\nattribute float aTrail;varying float vTrail;attribute float aMix;varying float vMix;':''))
      .replace('#include <project_vertex>',`#include <project_vertex>
        vec4 wp4=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          wp4=instanceMatrix*wp4;
        #endif
        vWP=(modelMatrix*wp4).xyz;`+(o.fade?'vFade=aFade;':'')+(o.ground?'vTrail=aTrail;vMix=aMix;':''));
    let f=sh.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vWP;uniform sampler2D tCloud;uniform vec2 uCloudOff,uSunXZ;uniform float uCloudScale,uCloudAmt,uLeafGlow;`+(o.fade?'varying float vFade;':'')+(o.ground?'varying float vTrail;varying float vMix;uniform sampler2D tB,tC;uniform float uBRep,uCRep;uniform vec3 uTint;':'')+`
      float cloudShade(){vec2 uv=(vWP.xz+vWP.y*uSunXZ)*uCloudScale+uCloudOff;float n=clamp((texture2D(tCloud,uv).r*.72+texture2D(tCloud,uv*2.3).r*.28-.2)/.36,0.,1.);
        return mix(1.,.4,smoothstep(.5,.78,n)*uCloudAmt);}`)
      .replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color*=cloudShade();');
    if(o.fade)f=f.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(vFade>.01){float dn=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(dn<vFade)discard;}`);
    if(o.leaf)f=f.replace('#include <normal_fragment_begin>',LEAF_NORMAL)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*uLeafGlow*vec3(.9,1.,.7);');
    if(o.ground)f=f.replace('#include <map_fragment>',`#include <map_fragment>
      {float big=texture2D(tCloud,vWP.xz/71.).r;
       vec3 cb=texture2D(tB,vWP.xz*uBRep).rgb,cc=texture2D(tC,vWP.xz*uCRep).rgb;
       vec3 c=mix(diffuseColor.rgb,cb,clamp(vMix,0.,1.));c=mix(c,cc,clamp(vTrail,0.,1.));
       diffuseColor.rgb=c*uTint*(.82+big*.36);}`);
    sh.fragmentShader=f;
  };
  mat.customProgramCacheKey=()=>'w'+(o.fade?1:0)+(o.leaf?1:0)+(o.ground?1:0);
  return mat;
}

/* a ring of distant scenery (hills or a skyline) around the horizon; it follows the camera like the sky */
let RING=null;
function horizonRing(texName,height,lift,tint,copies){
  const t=tex(texName,{clamp:false});t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.repeat.set(copies||3,1);
  const g=new THREE.CylinderGeometry(420,420,height,64,1,true);
  const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.BackSide,depthWrite:false,fog:false,color:new THREE.Color(...(tint||[1,1,1]))});
  RING=new THREE.Mesh(g,m);RING.renderOrder=-9;RING.frustumCulled=false;RING.userData.lift=lift;S.add(RING);}
/* each map sets its own light, sky and fog */
function applyLook(L){
  SUN.set(...L.sun).normalize();KEY.color.set(L.sunCol);KEY.intensity=L.sunK;HEMI.color.set(L.sky);HEMI.groundColor.set(L.ground);HEMI.intensity=L.hemiK;
  SKYU.uZen.value.set(L.zen);SKYU.uHor.value.set(L.hor);S.fog.color.set(L.fog);U.uCloudAmt.value=L.clouds;R.toneMappingExposure=L.exp||1.18;
  if(L.pano){SKYU.tPano.value=tex(L.pano);SKYU.uPano.value=1;SKYU.uPanoK.value=L.panoK||1;}
  if(L.ring)horizonRing(L.ring.tex,L.ring.h,L.ring.lift,L.ring.tint,L.ring.copies);
}

/* ---- 04_world.js ---- */
/* ===================== the world: shared by every map (the maps themselves are in 04b_maps.js) =====================
   PLAY = half-size of the ground you can walk on (260 x 260 m since session 5; it was 160). Beyond it the ground rises (or meets water). */
const PLAY=130,WORLD=225;
let MAPID='woods',MAPDEF=null,TRAIL=[],CLEAR=[],SPAWN={x:0,z:70,yaw:0};
function pickMap(){const want=(MISSION?MISSION.map:(Q.get('map')||store.get('map','woods'))).toLowerCase();MAPID=MAPS[want]?want:'woods';MAPDEF=MAPS[MAPID];
  TRAIL=MAPDEF.trail||[];CLEAR=MAPDEF.clear||[];SPAWN=MISSION?{x:MISSION.start[0],z:MISSION.start[1],yaw:MISSION.start[2]}:MAPDEF.spawn;if(!MISSION)store.set('map',MAPID);}
function segD(px,pz,ax,az,bx,bz){const vx=bx-ax,vz=bz-az,t=clamp(((px-ax)*vx+(pz-az)*vz)/(vx*vx+vz*vz),0,1),dx=px-ax-vx*t,dz=pz-az-vz*t;return Math.sqrt(dx*dx+dz*dz);}
function trailD(x,z){let d=1e9;for(let i=0;i<TRAIL.length-1;i++){const a=TRAIL[i],b=TRAIL[i+1];d=Math.min(d,segD(x,z,a[0],a[1],b[0],b[1]));}return d;}
function clearD(x,z){let d=1e9;for(const c of CLEAR)d=Math.min(d,Math.hypot(x-c[0],z-c[1])-c[2]);return d;}
function hgt(x,z){return MAPDEF.h(x,z);}
/* --- ground: a base texture, a second one (weight aMix) and a third (weight aTrail), each tiled in world space --- */
function buildGround(){
  const G_=MAPDEF.ground,n=WORLD,g=new THREE.PlaneGeometry(WORLD*2,WORLD*2,n,n);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,tr=new Float32Array(p.count),mx=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,hgt(x,z));const w=G_.w(x,z);mx[i]=w[0];tr[i]=w[1];}
  g.setAttribute('aTrail',new THREE.BufferAttribute(tr,1));g.setAttribute('aMix',new THREE.BufferAttribute(mx,1));g.computeVertexNormals();
  const m=hookWorld(new THREE.MeshStandardMaterial({map:tex(G_.a,{rep:WORLD*2/G_.ar}),roughness:G_.rough||.96,metalness:0}),
    {ground:{tB:tex(G_.b),tC:tex(G_.c),bRep:1/G_.br,cRep:1/G_.cr,tint:G_.tint||[1,1,1]}});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;S.add(mesh);return mesh;
}
/* a road or trail draped over the ground, textured along its length, soft at the edges */
function ribbon(pts,width,texName,repLen,lift){
  const sm=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    const L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),n=Math.max(2,Math.ceil(L/1.5));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;const f=(a,b,c,d)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);sm.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}}
  sm.push(pts[pts.length-1]);
  const pos=[],uv=[],col=[],idx=[];let v=0;
  for(let i=0;i<sm.length;i++){const a=sm[Math.max(0,i-1)],b=sm[Math.min(sm.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    if(i>0)v+=Math.hypot(sm[i][0]-sm[i-1][0],sm[i][1]-sm[i-1][1])/repLen;
    for(const s of [-1,-.7,.7,1]){const x=sm[i][0]-dz*s*width/2,z=sm[i][1]+dx*s*width/2;pos.push(x,hgt(x,z)+(lift||.07),z);uv.push((s+1)/2,v);col.push(1,1,1,Math.abs(s)>.9?0:1);}}
  for(let i=0;i<sm.length-1;i++)for(let k=0;k<3;k++){const a=i*4+k,b=a+1,c=a+4,d=a+5;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,4));g.setIndex(idx);g.computeVertexNormals();
  const t=tex(texName);t.wrapS=THREE.ClampToEdgeWrapping;
  const m=hookWorld(new THREE.MeshStandardMaterial({map:t,vertexColors:true,transparent:true,roughness:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;mesh.renderOrder=1;S.add(mesh);return mesh;
}
/* --- vegetation: one InstancedMesh per model part; near and far versions swap by distance; trees between the camera and the mech dither out --- */
const VEG={list:[],byId:{},cat:null,ready:false,cols:new Map(),grassCell:12};
function colKey(x,z){return ((Math.floor(x/10)+200)*1000)+(Math.floor(z/10)+200);}
function addCol(x,z,r,h){const k=colKey(x,z);if(!VEG.cols.has(k))VEG.cols.set(k,[]);VEG.cols.get(k).push({x,z,r,h:h||9});}
/* a solid box (containers, buildings, crane legs) from x0..x1, z0..z1, standing on y0, h tall */
function addBox(x0,z0,x1,z1,h,y0){const c={b:1,x0,z0,x1,z1,h,y0:y0==null?hgt((x0+x1)/2,(z0+z1)/2):y0,x:(x0+x1)/2,z:(z0+z1)/2,r:Math.hypot(x1-x0,z1-z0)/2};
  for(let i=Math.floor(x0/10);i<=Math.floor(x1/10);i++)for(let j=Math.floor(z0/10);j<=Math.floor(z1/10);j++){const k=((i+200)*1000)+(j+200);if(!VEG.cols.has(k))VEG.cols.set(k,[]);VEG.cols.get(k).push(c);}return c;}
/* push a circle (x,z,rad) out of tree trunks; returns [x,z,hit] */
function collide(x,z,rad){let hit=false;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=VEG.cols.get(colKey(x+i*10,z+j*10));if(!a)continue;
    for(const c of a){if(c.b){const cx=clamp(x,c.x0,c.x1),cz=clamp(z,c.z0,c.z1),dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;
        if(d2<rad*rad){if(d2>1e-8){const d=Math.sqrt(d2);x=cx+dx/d*rad;z=cz+dz/d*rad;}else{const e=[x-c.x0,c.x1-x,z-c.z0,c.z1-z],m=Math.min(...e);if(m===e[0])x=c.x0-rad;else if(m===e[1])x=c.x1+rad;else if(m===e[2])z=c.z0-rad;else z=c.z1+rad;}hit=true;}continue;}
      const dx=x-c.x,dz=z-c.z,rr=rad+c.r,d2=dx*dx+dz*dz;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2);x=c.x+dx/d*rr;z=c.z+dz/d*rr;hit=true;}}}
  return [x,z,hit];}
function vegAsset(id,kind){if(VEG.byId[id])return VEG.byId[id];const a={id,kind,inst:[],parts:{near:[],far:[]},sel:[],selFar:[]};VEG.byId[id]=a;VEG.list.push(a);return a;}
function plant(id,kind,x,z,s,rnd){
  const a=vegAsset(id,kind),c=VEG.cat[id],y=hgt(x,z)-(kind==='tree'?.25:.05),r=rnd()*TAU;
  const m=new THREE.Matrix4().compose(V3(x,y,z),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),r),V3(s,s,s));
  const cr=Math.max(c.size_m[0],c.size_m[2])*.5*s;
  a.inst.push({x,y,z,s,m,cr,h:c.size_m[1]*s,f:0});
  if(c.collider&&kind==='tree')addCol(x,z,c.collider.r*s+.1,c.size_m[1]*s);
}
function partsOf(scene,kind,lod){
  const out=[];scene.updateMatrixWorld(true);
  scene.traverse(o=>{if(!o.isMesh)return;
    const leaf=/foliage|grass/i.test(o.material.name||'')||(o.material.userData&&o.material.userData.gameMat==='LEAF');
    if(!o.material.userData.ih3){o.material.userData.ih3=1;hookWorld(o.material,{fade:kind==='tree',leaf});
      /* the pack's far versions are painted darker than the near ones; lift them so the swap does not show */
      if(leaf){o.material.side=THREE.DoubleSide;o.material.color.multiplyScalar(lod==='far'?(kind==='grass'?1.25:1.8):1.2);}}
    if(leaf&&!o.geometry.userData.bent){o.geometry.userData.bent=1;const g=o.geometry,p=g.attributes.position,nn=g.attributes.normal;g.computeBoundingBox();
      const c=new THREE.Vector3();g.boundingBox.getCenter(c);const v=new THREE.Vector3(),w=new THREE.Vector3();
      for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i),p.getZ(i));w.set(nn.getX(i),nn.getY(i),nn.getZ(i));
        if(kind==='grass')w.multiplyScalar(.25).add(V3(0,1,0));else w.multiplyScalar(.35).add(v.sub(c).normalize().multiplyScalar(.65));
        w.normalize();nn.setXYZ(i,w.x,w.y,w.z);}nn.needsUpdate=true;}
    out.push({geo:o.geometry,mat:o.material,local:o.matrixWorld.clone(),leaf});});
  return out;
}
function buildInstances(a,lod,scene){
  const n=a.inst.length,parts=partsOf(scene,a.kind,lod);
  for(const p of parts){
    const im=new THREE.InstancedMesh(p.geo,p.mat,n);im.count=0;im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.castShadow=lod==='near'&&a.kind!=='grass';im.receiveShadow=!p.leaf||a.kind==='grass';
    const fa=new THREE.InstancedBufferAttribute(new Float32Array(n),1);fa.setUsage(THREE.DynamicDrawUsage);p.geo=p.geo.clone();p.geo.setAttribute('aFade',fa);im.geometry=p.geo;p.fade=fa;
    const big=new Float32Array(n*16),t=new THREE.Matrix4();a.inst.forEach((s,i)=>{t.multiplyMatrices(s.m,p.local);big.set(t.elements,i*16);});
    p.big=big;p.im=im;S.add(im);a.parts[lod].push(p);
  }
}
function loadVeg(mixId){
  return fetch('models/catalog.json').then(r=>r.json()).then(c=>{
    VEG.cat={_biomes:c.biomes};c.manifest.assets.forEach(a=>VEG.cat[a.id]=a);MAPDEF.layout(mulberry(4242),mixId);
    const L=new THREE.GLTFLoader(LM),jobs=[];
    for(const a of VEG.list.filter(a=>a.inst.length)){const c=VEG.cat[a.id];for(const lod of ['near','far'])
      jobs.push(new Promise(ok=>L.load('models/'+c.files[lod],g=>{buildInstances(a,lod,g.scene);ok();},undefined,()=>ok())));}
    return Promise.all(jobs).then(()=>{VEG.ready=true;});
  });
}
const _cf=new THREE.Vector3();
let VEGN={tris:0,inst:0,by:{}};
/* every frame: choose which instances to draw (distance + view cone), near or far, and how faded */
function updVeg(dt,mx,my,mz){
  if(!VEG.ready)return;
  const cx=cam.position.x,cz=cam.position.z;cam.getWorldDirection(_cf);const fl=Math.hypot(_cf.x,_cf.z)||1,fx=_cf.x/fl,fz=_cf.z/fl;
  const hf=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect),cosT=Math.cos(Math.min(1.55,hf+.25));
  const NEAR=QC.near,FAR=QC.far,GR=QC.grass;let tris=0,inst=0;if(DEV)VEGN.by={};
  const segx=mx-cx,segz=mz-cz,segL2=segx*segx+segz*segz||1;
  for(const a of VEG.list){
    const isT=a.kind==='tree',K=a.kind,far=a.parts.far.length>0,nearD=isT?NEAR:K==='grass'?QC.grassNear:K==='bush'?NEAR*.55:NEAR,lim=K==='grass'?GR:K==='bush'?NEAR*1.3:K==='prop'?NEAR*1.5:FAR;
    const sn=a.sel,sf=a.selFar;sn.length=0;sf.length=0;
    for(let i=0;i<a.inst.length;i++){const s=a.inst[i],dx=s.x-cx,dz=s.z-cz,d2=dx*dx+dz*dz;if(d2>lim*lim)continue;
      const d=Math.sqrt(d2);if(d>s.cr+6&&(dx*fx+dz*fz)/d<cosT-s.cr/d)continue;
      if(!far||d<nearD)sn.push(i);else sf.push(i);}
    /* fade near trees that stand between the camera and the mech, or right against the lens */
    if(isT){for(const i of sn){const s=a.inst[i],dx=s.x-cx,dz=s.z-cz;let tgt=0;const t=(dx*segx+dz*segz)/segL2;
        if(t>-.05&&t<1.08){const px=dx-segx*t,pz=dz-segz*t,dp=Math.sqrt(px*px+pz*pz);if(dp<s.cr*.7+1.4)tgt=.86;}
        if(dx*dx+dz*dz<s.cr*s.cr*.4)tgt=1;
        s.f+=(tgt-s.f)*damp(tgt>s.f?10:4,dt);}}
    for(const lod of ['near','far']){const L=lod==='near'?sn:sf;
      for(const p of a.parts[lod]){const arr=p.im.instanceMatrix.array,fa=p.fade.array;
        for(let k=0;k<L.length;k++){const i=L[k];arr.set(p.big.subarray(i*16,i*16+16),k*16);fa[k]=lod==='near'&&isT?a.inst[i].f:0;}
        p.im.count=L.length;p.im.visible=L.length>0;p.im.instanceMatrix.needsUpdate=true;p.fade.needsUpdate=true;
        const tt=L.length*(p.geo.index?p.geo.index.count:p.geo.attributes.position.count)/3;tris+=tt;inst+=L.length;if(DEV){const k=a.kind+'.'+lod;VEGN.by[k]=(VEGN.by[k]||0)+tt;}}}
  }
  VEGN.tris=tris|0;VEGN.inst=inst;
}

/* ---- 04b_maps.js ---- */
/* ===================== the three kinds of place: woods, field, docks =====================
   Each map gives: h(x,z) ground height, ground textures + weights, look (light, sky, fog), layout (plants), build (structures),
   spawn, trail (draped road), route (attract demo path), bounds (where the mech may walk). Pick one with ?map=woods|field|docks. */
function tmat(name,o={}){const t=tex(name,{glb:o.glb});if(o.rep)t.repeat.set(o.rep[0],o.rep[1]);
  return hookWorld(new THREE.MeshStandardMaterial({map:t,roughness:o.r==null?.8:o.r,metalness:o.m==null?.1:o.m,color:o.col==null?0xffffff:o.col,
    transparent:!!o.alpha,alphaTest:o.alpha?.45:0,side:o.ds?THREE.DoubleSide:THREE.FrontSide}));}
/* box geometry whose faces [+x,-x,+y,-y,+z,-z] repeat their texture every [u,v] metres (0 = stretch once) */
function sbox(w,h,d,reps){const g=new THREE.BoxGeometry(w,h,d);if(!reps)return g;const uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++){const r=reps[f];if(!r)continue;for(let i=f*4;i<f*4+4;i++)uv.setXY(i,uv.getX(i)*(r[0]?dims[f][0]/r[0]:1),uv.getY(i)*(r[1]?dims[f][1]/r[1]:1));}return g;}
function put(g,mats,x,y,z,ry,shadow){const m=new THREE.Mesh(g,mats);m.position.set(x,y,z);m.rotation.y=ry||0;m.castShadow=shadow!==false;m.receiveShadow=true;S.add(m);return m;}
function gable(w,d,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3,uv.getY(i)/3);return g;}
function rectW(x,z,r,soft){return smooth(-soft,soft,Math.min(x-r[0],r[2]-x,z-r[1],r[3]-z));}
function pickW(o,rnd){let t=0;for(const k in o)t+=o[k];let r=rnd()*t;for(const k in o){r-=o[k];if(r<=0)return k;}return Object.keys(o)[0];}
function biome(id){return VEG.cat._biomes.find(b=>b.id===id)||VEG.cat._biomes[0];}
function propsAlong(rnd,list,side){for(let i=0;i<list.length;i++){const k=(i+.5)/list.length*(TRAIL.length-1),a=TRAIL[k|0],b=TRAIL[(k|0)+1],f=k%1,x=lerp(a[0],b[0],f),z=lerp(a[1],b[1],f);
  const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),sd=i%2?-1:1;plant(list[i],'prop',x+dz/l*side*sd,z-dx/l*side*sd,1,rnd);}}
/* session 5: arenas grew 1.6x (260 m across) so there is room to back off; K scales the woods and field layouts */
const K=1.6,kp=a=>a.map(p=>[p[0]*K,p[1]*K]),kc=a=>a.map(c=>[c[0]*K,c[1]*K,c[2]*K]),kr=a=>a.map(r=>[r[0]*K,r[1]*K,r[2]*K,r[3]*K,r[4]]);
const MAPS={
/* ---------------- woods: mixed forest, a trail, clearings ---------------- */
woods:{name:'WOODS',mix:'woods',spawn:{x:0,z:112,yaw:0},
  trail:kp([[0,82],[-12,56],[-22,32],[-6,12],[16,-4],[20,-28],[2,-46],[-18,-60],[-12,-82]]),
  clear:kc([[-32,38,15],[26,-14,17],[-24,-56,13],[34,50,11],[4,26,9],[-48,-10,12],[50,-50,12]]),
  h(x,z){const big=(fbm(x*.011+3.1,z*.011-7.4,4)-.5)*9,small=(fbm(x*.047,z*.047+11,2)-.5)*1.8;
    const e=Math.max(Math.abs(x),Math.abs(z)),rim=Math.pow(smooth(PLAY-6,PLAY+60,e),1.3)*28;return big+small*smooth(1.5,7,trailD(x,z))+rim;},
  ground:{a:'81-forest-floor',ar:6,b:'82-mossy-ground-with-roots',br:7,c:'06-dirt-and-gravel',cr:4.6,
    w(x,z){return [smooth(.45,.62,fbm(x*.03+5,z*.03-2,3)),smooth(5.5,3,trailD(x,z))*.5];}},
  look:{sun:[-.42,.62,-.66],sunCol:0xfff0d6,sunK:3.1,sky:0xd6e4ff,ground:0x6a5a44,hemiK:1.55,zen:0x2a5fb4,hor:0xb3c8de,fog:0xb3c8de,clouds:.75},
  layout(rnd,mixId){const mix=biome(mixId);
    for(let gx=-WORLD+4;gx<WORLD-4;gx+=7.5)for(let gz=-WORLD+4;gz<WORLD-4;gz+=7.5){
      const x=gx+(rnd()-.5)*6.5,z=gz+(rnd()-.5)*6.5,e=Math.max(Math.abs(x),Math.abs(z)),td=trailD(x,z),cd=clearD(x,z);
      if(Math.hypot(x-SPAWN.x,z-SPAWN.z)<13||td<6.5||cd<0)continue;
      if(rnd()>(e<PLAY?.62*smooth(6.5,12,td)*smooth(0,6,cd):.92))continue;plant(pickW(mix.tree,rnd),'tree',x,z,.82+rnd()*.4,rnd);}
    for(let i=0;i<20000;i++){const x=(rnd()-.5)*2*(PLAY+14),z=(rnd()-.5)*2*(PLAY+14);if(trailD(x,z)<2.6&&rnd()<.9)continue;plant(pickW(mix.grass,rnd),'grass',x,z,.75+rnd()*.7,rnd);}
    for(let i=0;i<600;i++){const x=(rnd()-.5)*2*(PLAY+10),z=(rnd()-.5)*2*(PLAY+10);if(trailD(x,z)<4)continue;plant(rnd()<.65?'bush_sage':'bush_oleander','bush',x,z,.9+rnd()*.7,rnd);}
    propsAlong(rnd,['prop_drum','prop_tires','prop_icechest','prop_drum','prop_tires','prop_mailbox'],5.6);},
  build(){ribbon(TRAIL,7.5,'62-farm-track',10);boulders(30,mulberry(77));}},
/* ---------------- field: rolling farmland, a farm track, crops, a farmstead, relay masts ---------------- */
field:{name:'FIELD',mix:'meadow',spawn:{x:0,z:115,yaw:0},
  trail:kp([[0,88],[4,64],[-6,40],[-2,18],[14,0],[22,-22],[10,-44],[-12,-62],[-20,-88]]),
  crops:kr([[-74,-12,-24,28,'c'],[-72,40,-28,72,'b'],[34,-74,72,-34,'c'],[40,-24,76,8,'b'],[-60,-70,-26,-36,'b']]),
  farm:{x:67,z:54},masts:[[-64,-32],[77,-83],[-51,83]],
  h(x,z){const big=(fbm(x*.0075+11,z*.0075-3,4)-.5)*15,small=(fbm(x*.04,z*.04,2)-.5)*1.1;
    const e=Math.max(Math.abs(x),Math.abs(z)),rim=Math.pow(smooth(PLAY-4,PLAY+70,e),1.2)*30;
    const flat=Math.min(smooth(3,10,trailD(x,z)),smooth(18,38,Math.hypot(x-67,z-54)));return (big*.8+small)*(.35+.65*flat)+rim;},
  ground:{a:'60-meadow-ground',ar:5,b:'63-ploughed-field',br:6,c:'64-wheat-field',cr:4.5,
    w(x,z){let b=0,c=0;for(const r of MAPS.field.crops){const k=rectW(x,z,r,1.6);if(r[4]==='b')b=Math.max(b,k);else c=Math.max(c,k);}return [b,c];}},
  look:{sun:[-.35,.78,-.5],sunCol:0xfff4e2,sunK:3.3,sky:0xdbe9ff,ground:0x6f6a4a,hemiK:1.6,zen:0x2f6fd0,hor:0xc6daf0,fog:0xc4d6ea,clouds:.55,
    pano:'69-daytime-field-sky',ring:{tex:'70-distant-hills',h:70,lift:-10,tint:[.9,.95,1],copies:3},exp:1.12},
  layout(rnd,mixId){const mix=biome('meadow'),cropAt=(x,z)=>MAPS.field.crops.some(r=>rectW(x,z,r,3)>0),farmD=(x,z)=>Math.hypot(x-67,z-54);
    /* hedgerow trees along the crop edges and the far hills, a few loners in the meadow */
    for(const r of MAPS.field.crops)for(let t=0;t<1;t+=.06){const side=(t*4)|0,f=(t*4)%1,x=side===0?lerp(r[0],r[2],f):side===2?lerp(r[2],r[0],f):side===1?r[2]+2.5:r[0]-2.5,
      z=side===0?r[1]-2.5:side===2?r[3]+2.5:side===1?lerp(r[1],r[3],f):lerp(r[3],r[1],f);if(rnd()<.55&&trailD(x,z)>7&&farmD(x,z)>18)plant(pickW({tree_oak:3,tree_cottonwood:1.5,tree_willow:.6},rnd),'tree',x,z,.8+rnd()*.35,rnd);}
    for(let i=0;i<1400;i++){const x=(rnd()-.5)*2*(WORLD-8),z=(rnd()-.5)*2*(WORLD-8),e=Math.max(Math.abs(x),Math.abs(z));
      if(e<PLAY+4&&rnd()>.04)continue;if(trailD(x,z)<8||cropAt(x,z)||farmD(x,z)<22||Math.hypot(x-SPAWN.x,z-SPAWN.z)<14)continue;plant(pickW(e>PLAY?{tree_oak:2,tree_cottonwood:1,tree_ponderosa:1.5,tree_spruce:1}:{tree_oak:3,tree_cottonwood:1.5,tree_aspen:.8},rnd),'tree',x,z,.8+rnd()*.4,rnd);}
    for(let i=0;i<22000;i++){const x=(rnd()-.5)*2*(PLAY+14),z=(rnd()-.5)*2*(PLAY+14);if(trailD(x,z)<3||cropAt(x,z)||farmD(x,z)<14)continue;plant(pickW({grass_meadow:3,grass_dry:1.2},rnd),'grass',x,z,.8+rnd()*.8,rnd);}
    for(let i=0;i<260;i++){const x=(rnd()-.5)*2*PLAY,z=(rnd()-.5)*2*PLAY;if(trailD(x,z)<5||cropAt(x,z)||farmD(x,z)<16)continue;plant(rnd()<.6?'bush_sage':'bush_oleander','bush',x,z,.9+rnd()*.6,rnd);}
    propsAlong(rnd,['prop_mailbox','prop_tires','prop_drum','prop_icechest'],5.8);},
  build(){const rnd=mulberry(91);ribbon(TRAIL,7.5,'62-farm-track',10);
    const F=MAPS.field.farm,y=hgt(F.x,F.z);
    const red=tmat('66-red-barn-siding',{r:.85}),wood=tmat('67-wooden-fence-planks',{r:.9}),roof=tmat('10-corrugated-metal',{col:0x9a3a2e,r:.6,m:.4}),roof2=tmat('10-corrugated-metal',{col:0x7c828a,r:.6,m:.4}),dark=tmat('24-gunmetal',{col:0x55504a});
    /* barn: walls, a gable roof, a big door */
    put(sbox(22,9,14,[[4,4],[4,4],0,0,[4,4],[4,4]]),[red,red,dark,dark,red,red],F.x,y+4.5,F.z);put(gable(15,23.5,6),roof,F.x,y+9,F.z,Math.PI/2);addBox(F.x-11,F.z-7,F.x+11,F.z+7,15);
    put(sbox(6,7,.3),wood,F.x,y+3.5,F.z-7.1);
    /* farmhouse and silo */
    put(sbox(14,6,10,[[4,4],[4,4],0,0,[4,4],[4,4]]),[wood,wood,dark,dark,wood,wood],F.x-26,y+3,F.z+4);put(gable(11,15,4),roof2,F.x-26,y+6,F.z+4,Math.PI/2);addBox(F.x-33,F.z-1,F.x-19,F.z+9,10);
    const silo=tmat('12-rusted-steel-plate',{rep:[4,3],r:.7,m:.5});put(new THREE.CylinderGeometry(3.4,3.4,16,24),silo,F.x+16,y+8,F.z+10);put(new THREE.SphereGeometry(3.5,24,10,0,TAU,0,Math.PI/2),roof2,F.x+16,y+16,F.z+10);addCol(F.x+16,F.z+10,3.5,19);
    /* fences along the track */
    const rail=new THREE.BoxGeometry(.12,.16,1),post=new THREE.BoxGeometry(.22,1.5,.22);
    for(let i=1;i<TRAIL.length-1;i++){const a=TRAIL[i],b=TRAIL[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),ang=Math.atan2(b[0]-a[0],b[1]-a[1]);if(i%2)continue;
      for(const sd of [-1,1]){const ox=Math.cos(ang)*5.2*sd,oz=-Math.sin(ang)*5.2*sd;
        for(let t=0;t<L;t+=4){const x=a[0]+(b[0]-a[0])*t/L+ox,z=a[1]+(b[1]-a[1])*t/L+oz,h0=hgt(x,z);put(post,wood,x,h0+.75,z,ang);
          for(const hh of [.5,1.1]){const m=put(rail,wood,x+(b[0]-a[0])/L*2,h0+hh,z+(b[1]-a[1])/L*2,ang);m.scale.z=4;}}}}
    /* round hay bales */
    const hay=tmat('64-wheat-field',{rep:[3,1],r:.95}),hayEnd=hookWorld(new THREE.MeshStandardMaterial({map:tex('68-round-hay-bale-end'),alphaTest:.4,roughness:.95}));
    const bg=new THREE.CylinderGeometry(1,1,1.4,20,1,false);bg.rotateZ(Math.PI/2);const bales=[];
    for(let i=0;i<44;i++){const r=MAPS.field.crops[i%MAPS.field.crops.length],x=lerp(r[0],r[2],.1+rnd()*.8),z=lerp(r[1],r[3],.1+rnd()*.8);if(r[4]!=='c')continue;
      bales.push(new THREE.Matrix4().compose(V3(x,hgt(x,z)+1,z),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),rnd()*TAU),V3(1,1,1)));addCol(x,z,1.1,2);}
    const bim=new THREE.InstancedMesh(bg,[hay,hayEnd,hayEnd],bales.length);bales.forEach((m,k)=>bim.setMatrixAt(k,m));bim.castShadow=bim.receiveShadow=true;S.add(bim);
    /* radio relay masts: lattice towers with a red light (mission 1 targets) */
    const truss=tmat('74-crane-truss',{alpha:true,ds:true,rep:[4,6],r:.6,m:.5});
    MAPS.field.mastObjs=[];
    for(const [mx,mz] of MAPS.field.masts){const g0=hgt(mx,mz),grp=new THREE.Group();grp.position.set(mx,g0,mz);grp.userData.keep=1;S.add(grp);   /* a pivot at the base so a destroyed mast can topple */
      const tw=new THREE.Mesh(new THREE.CylinderGeometry(.6,1.6,26,4,1,true),truss);tw.position.y=13;tw.rotation.y=Math.PI/4;tw.castShadow=true;grp.add(tw);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(.4,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color(1,.1,.05).multiplyScalar(4)}));lamp.position.y=26.4;grp.add(lamp);addBox(mx-1.6,mz-1.6,mx+1.6,mz+1.6,26);
      MAPS.field.mastObjs.push({x:mx,z:mz,y:g0,tower:grp,lamp,fall:0});}
  }},
/* ---------------- docks: Harbor 9 at sunset, container stacks, cranes, a ship, warehouses ---------------- */
docks:{name:'DOCKS',mix:'woods',spawn:{x:9,z:88,yaw:0},bounds:{x0:-128,x1:128,z0:-96,z1:96},quay:-100,
  blocksX:[-110,-76,-42,-8,26,60,94],blocksZ:[-80,-56,-32,-8,16,40,64],lanesX:[-93,-59,-25,9,43,77,111],
  trail:[],route:[[9,88],[9,28],[43,28],[43,-44],[-25,-44],[-25,28],[9,28]],
  h(x,z){return z<-100?-7:0;},
  ground:{a:'02-wet-concrete',ar:7,b:'79-dock-lane-markings',br:14,c:'07-harbor-paving',cr:5,rough:.7,
    w(x,z){const lane=Math.max(...MAPS.docks.lanesX.map(c=>smooth(6,4.5,Math.abs(x-c)))),c=smooth(-86,-94,z);return [lane*smooth(90,84,Math.abs(z)),c];}},
  look:{sun:[-.85,.3,-.42],sunCol:0xffb070,sunK:3.4,sky:0xb4a0d2,ground:0x6a5448,hemiK:2.1,zen:0x3a2a6a,hor:0xf0a070,fog:0xc8907e,clouds:.3,
    pano:'80-harbour-sunset-sky',ring:{tex:'33-harbor-skyline',h:60,lift:-8,tint:[.8,.72,.85],copies:3},exp:1.28},
  layout(){},
  build(){const rnd=mulberry(19),Qz=-100;
    /* water and the quay wall */
    const wt=tex('75-harbour-water',{rep:60});const water=new THREE.Mesh(new THREE.PlaneGeometry(700,320),new THREE.MeshStandardMaterial({map:wt,color:0xa8bcc0,roughness:.16,metalness:.3}));
    water.rotation.x=-Math.PI/2;water.position.set(0,-2.6,Qz-160);S.add(water);MAPS.docks.wt=wt;
    put(sbox(470,3.4,1,[0,0,0,0,0,[7,0]]),[tmat('09-blast-wall'),tmat('09-blast-wall'),tmat('07-harbor-paving'),tmat('09-blast-wall'),tmat('09-blast-wall'),tmat('76-quay-edge-with-fenders')],0,-1.7,Qz-.5,0,false);
    /* a moored ship */
    const hull=tmat('77-ship-hull-side',{r:.6,m:.3}),deck=tmat('12-rusted-steel-plate',{rep:[10,2]}),hdark=tmat('24-gunmetal',{col:0x3a2a28});
    put(sbox(190,18,22,[[0,0],[0,0],0,0,[28,0],[28,0]]),[hdark,hdark,deck,hdark,hull,hull],15,0,Qz-24,0,false);
    put(sbox(22,15,18,[[6,6],[6,6],0,0,[6,6],[6,6]]),tmat('14-docks-building-facade'),-66,16.5,Qz-24,0,true);
    /* two ship-to-shore cranes over the quay */
    const truss=tmat('74-crane-truss',{alpha:true,ds:true,r:.55,m:.5});const tb=(w,h,d,x,y,z)=>{const g=sbox(w,h,d,[[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5]]);return put(g,truss,x,y,z);};
    for(const cx of [-59,9,77]){const z1=Qz+10,z2=Qz+1,zm=(z1+z2)/2;for(const lx of [-7,7])for(const lz of [z1,z2]){tb(1.6,32,1.6,cx+lx,16,lz);addBox(cx+lx-1,lz-1,cx+lx+1,lz+1,32);}
      tb(16,2,1.6,cx,31,z1);tb(16,2,1.6,cx,31,z2);tb(1.6,2,10,cx-7,31,zm);tb(1.6,2,10,cx+7,31,zm);
      tb(3,2.4,78,cx,35,Qz-13);put(sbox(7,4.5,9),tmat('12-rusted-steel-plate',{rep:[2,2]}),cx,38,zm);
      put(sbox(3,2.4,3),tmat('24-gunmetal'),cx,32.5,Qz-26);}
    /* container stacks in blocks, lanes between them (each stack is one collider) */
    const L=12.2,H=2.6,W=2.44,cg=new THREE.BoxGeometry(L,H,W),endM=tmat('11-container-door-end',{r:.7,m:.3}),roofM=tmat('73-container-roof',{r:.7,m:.3}),botM=tmat('24-gunmetal');
    const kinds=[tmat('71-red-shipping-container-side',{r:.65,m:.35}),tmat('72-blue-shipping-container-side',{r:.65,m:.35}),tmat('10-corrugated-metal',{col:0x5f8a7a,r:.65,m:.35,rep:[3,1]}),tmat('10-corrugated-metal',{col:0xc8a040,r:.65,m:.35,rep:[3,1]})];
    const lists=kinds.map(()=>[]);
    for(const bx of MAPS.docks.blocksX)for(const bz of MAPS.docks.blocksZ){
      if(Math.hypot(bx-SPAWN.x,bz-SPAWN.z)<18)continue;
      for(let ix=0;ix<2;ix++)for(let iz=0;iz<3;iz++){if(rnd()<.12)continue;const x=bx-L/2+ix*L+(ix?.15:-.15),z=bz-W+iz*W*1.02,n=1+(rnd()*3|0);
        for(let k=0;k<n;k++)lists[rnd()*4|0].push([x,H/2+k*H,z,rnd()<.5?0:Math.PI]);addBox(x-L/2,z-W/2,x+L/2,z+W/2,n*H,0);}}
    kinds.forEach((m,i)=>{const l=lists[i];if(!l.length)return;const im=new THREE.InstancedMesh(cg,[endM,endM,roofM,botM,m,m],l.length);const t=new THREE.Matrix4();
      l.forEach((p,k)=>{t.compose(V3(p[0],p[1],p[2]),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),p[3]),V3(1,1,1));im.setMatrixAt(k,t);});im.castShadow=im.receiveShadow=true;S.add(im);});
    /* warehouses along the back, the HARBOR 9 neon and a Hyperdot billboard */
    const clad=tmat('10-corrugated-metal',{col:0x8a9096,rep:[1,1]}),door=tmat('78-warehouse-roller-door',{r:.7,m:.3}),gravel=tmat('15-roof-gravel');
    for(const wx of [-104,-52,0,52,104]){put(sbox(34,12,18,[[4,4],[4,4],[6,6],0,[4,4],[34/3,0]]),[clad,clad,gravel,gravel,clad,door],wx,6,108);addBox(wx-17,99,wx+17,117,12,0);}
    const neon=new THREE.Mesh(new THREE.PlaneGeometry(11,5.5),new THREE.MeshBasicMaterial({map:tex('44-neon-sign-harbor-9'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(2,2,2)}));
    neon.position.set(0,13.6,98.9);neon.rotation.y=Math.PI;S.add(neon);
    const bb=new THREE.Mesh(new THREE.PlaneGeometry(9,9),tmat('46-hyperdot-arcade-billboard',{r:.5}));bb.position.set(121.1,7,108);bb.rotation.y=Math.PI/2;S.add(bb);
    /* lamp posts and bollards */
    const pole=tmat('24-gunmetal'),lampM=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.85,.55).multiplyScalar(3)});
    const night=MISSION&&MISSION.look&&MISSION.look.night;if(night)lampM.color.multiplyScalar(2.2);
    const pool=night?poolTex():null;
    for(const x of MAPS.docks.lanesX)for(const z of [-88,-20,52,84]){put(new THREE.CylinderGeometry(.18,.25,13,8),pole,x+3.6,6.5,z);put(new THREE.BoxGeometry(1.6,.3,.7),lampM,x+3.6,13,z);addCol(x+3.6,z,.4,13);
      if(night){const g=new THREE.PlaneGeometry(22,22);g.rotateX(-Math.PI/2);g.translate(x+3.6,.06,z);(MAPS.docks._pools=MAPS.docks._pools||[]).push(g);}}
    if(night&&MAPS.docks._pools){const p=new THREE.Mesh(THREE.mergeGeometries(MAPS.docks._pools),new THREE.MeshBasicMaterial({map:pool,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1,.78,.45).multiplyScalar(.55)}));
      p.renderOrder=2;p.userData.keep=1;p.frustumCulled=false;S.add(p);}
    for(let x=-124;x<=124;x+=9.5)put(new THREE.CylinderGeometry(.35,.42,.8,10),pole,x,.4,Qz+1.2);
  },
  tick(dt){if(MAPS.docks.wt){MAPS.docks.wt.offset.x+=dt*.004;MAPS.docks.wt.offset.y+=dt*.0025;}}},
};
/* mossy boulders for the woods: lumpy rocks with a collider */
function boulders(n,rnd){const m=tmat('83-mossy-boulder-rock',{rep:[2,2],r:.95,m:0});
  for(let i=0;i<n;i++){let x,z,k=0;do{x=(rnd()-.5)*2*(PLAY-8);z=(rnd()-.5)*2*(PLAY-8);k++;}while((trailD(x,z)<8||Math.hypot(x-SPAWN.x,z-SPAWN.z)<15)&&k<20);
    const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position,r=1.6+rnd()*2.6;
    for(let j=0;j<p.count;j++){const vx=p.getX(j),vy=p.getY(j),vz=p.getZ(j),f=1+(fbm(vx*1.7+i*3,vz*1.7+vy*1.3,3)-.5)*.7;p.setXYZ(j,vx*f*r,vy*f*r*.62,vz*f*r*(.8+rnd()*.1));}
    g.computeVertexNormals();put(g,m,x,hgt(x,z)+r*.15,z,rnd()*TAU);addCol(x,z,r*.85,r*1.1);}}
/* a soft round glow for fake lamp light on the ground at night */
function poolTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const BND=()=>MAPDEF.bounds||{x0:-PLAY-6,x1:PLAY+6,z0:-PLAY-6,z1:PLAY+6};
function boxAt(x,z,y){const a=VEG.cols.get(colKey(x,z));if(!a)return false;for(const c of a)if(c.b&&x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1&&y<c.y0+c.h)return true;return false;}
/* after a map is built, join its fixed single-material meshes into one mesh per material (fences, posts, crane beams, lamps...) */
function mergeStatic(before){
  const by=new Map();
  for(const o of S.children.slice()){if(before.has(o)||!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent&&!o.material.alphaTest||o.userData.keep)continue;
    o.updateMatrixWorld(true);let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)continue;
    if(!by.has(o.material))by.set(o.material,{gs:[],cast:o.castShadow});by.get(o.material).gs.push(g);S.remove(o);}
  let n=0;for(const [m,v] of by){const mm=new THREE.Mesh(THREE.mergeGeometries(v.gs,false),m);mm.castShadow=v.cast;mm.receiveShadow=true;S.add(mm);n+=v.gs.length;}
  return n;}

/* ---- 05_mech.js ---- */
/* ===================== Howler 07, the player's mech (models/mech/howler07.glb, built in Blender: v2/src/ironhowl3/blender) =====================
   The model's empties are the joints: hips/thigh/knee/ankle (legs), torso, head, arm/gun/brl (guns), tier1..4 (barrel sets), muzzle, pod_*_mz, jet.
   Legs are dog-like with three parts: thigh (knee forward), shin back to the hock, then the long foot bone down to the clawed foot.
   Shading is baked into the vertex colours. */
const MT={};
function mechMats(){
  const k=(a)=>{a.vertexColors=true;return hookWorld(a);};
  MT.org=k(new THREE.MeshStandardMaterial({map:tex('22-howler-armour'),roughness:.46,metalness:.35}));
  MT.grey=k(new THREE.MeshStandardMaterial({map:tex('23-grey-armour'),roughness:.5,metalness:.45}));
  MT.gun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),color:0xb4bac4,roughness:.44,metalness:.72}));
  MT.steel=k(new THREE.MeshStandardMaterial({map:tex('25-brushed-steel'),roughness:.28,metalness:.92}));
  MT.trim=k(new THREE.MeshStandardMaterial({map:tex('26-hazard-trim'),roughness:.6,metalness:.2}));
  MT.dark=k(new THREE.MeshStandardMaterial({color:0x1a1c20,roughness:.68,metalness:.55}));
  MT.glass=k(new THREE.MeshStandardMaterial({color:0x0a0e14,roughness:.12,metalness:.6}));
  MT.glow=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.5,.12).multiplyScalar(2.6)});
  MT.eye=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.72,.3).multiplyScalar(3.2)});
  MT.decal=hookWorld(new THREE.MeshStandardMaterial({map:tex('28-howler-decals',{clamp:true,glb:true}),transparent:true,alphaTest:.3,roughness:.6,metalness:.1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));   /* no baked shading: it sits flat on the armour and would bake black */
  MT.flame=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.46,.16).multiplyScalar(1.25),transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});
  MT.flame2=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.7,1).multiplyScalar(1.5),transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
}
const MECH_MAT={org:'org',grey:'grey',gun:'gun',steel:'steel',trim:'trim',dark:'dark',glass:'glass',eye:'eye',jetcore:'glow',decal:'decal'};
/* join the fixed pieces under each joint into one mesh per material (about 170 pieces become about 60) */
function mergeParts(root,keep){
  const holders=new Set();root.traverse(o=>{if(o.isMesh&&o.parent&&!(keep&&keep(o)))holders.add(o.parent);});
  for(const g of holders){const by=new Map();
    for(const m of g.children.slice()){if(!m.isMesh||(keep&&keep(m))||m.children.length)continue;m.updateMatrix();
      let geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
      for(const k of Object.keys(geo.attributes))if(!['position','normal','uv','color'].includes(k))geo.deleteAttribute(k);
      if(!geo.attributes.color){const c=new Float32Array(geo.attributes.position.count*4).fill(1);geo.setAttribute('color',new THREE.BufferAttribute(c,4));}
      if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
      const key=m.material;if(!by.has(key))by.set(key,{geos:[],cast:m.castShadow});by.get(key).geos.push(geo);g.remove(m);}
    for(const [mat,v] of by){const ok=v.geos.every(q=>q.attributes.color.itemSize===v.geos[0].attributes.color.itemSize);
      if(!ok)v.geos.forEach(q=>{if(q.attributes.color.itemSize===3){const a=q.attributes.color.array,b=new Float32Array(a.length/3*4);for(let i=0;i<a.length/3;i++){b[i*4]=a[i*3];b[i*4+1]=a[i*3+1];b[i*4+2]=a[i*3+2];b[i*4+3]=1;}q.setAttribute('color',new THREE.BufferAttribute(b,4));}});
      const mm=new THREE.Mesh(THREE.mergeGeometries(v.geos,false),mat);mm.castShadow=v.cast;mm.receiveShadow=true;g.add(mm);}
  }
}
const HIP=3.2,L1=1.05,L2=1.0,L3=.9,ANK=.36,PHI=.26,HIPDROP=.05;
function buildMech(){
  mechMats();
  const M={root:new THREE.Group(),ready:false,phase:0,lean:0,roll:0,tier:0};S.add(M.root);
  new THREE.GLTFLoader(LM).load('models/mech/howler07.glb',g=>{
    const sc=g.scene;sc.traverse(o=>{if(o.isMesh){const n=(o.material&&o.material.name)||'';o.material=MT[MECH_MAT[n]||'gun'];o.castShadow=o.receiveShadow=true;if(n==='decal'||n==='jetcore')o.castShadow=false;}});
    const N=n=>sc.getObjectByName(n);
    M.cores=['L','R'].map(s=>N('core_'+s));
    mergeParts(sc,o=>M.cores.includes(o));
    M.root.add(sc);M.hips=N('hips');M.torso=N('torso');M.head=N('head');
    M.legs=[-1,1].map(sd=>{const s=sd<0?'L':'R';return {thigh:N('thigh_'+s),knee:N('knee_'+s),hock:N('hock_'+s),ankle:N('ankle_'+s),sd,plant:true,gy:0};});
    M.arms=[-1,1].map(sd=>{const s=sd<0?'L':'R';return {sh:N('arm_'+s),gun:N('gun_'+s),brl:N('brl_'+s),bz:N('brl_'+s).position.z,muzzle:N('muzzle_'+s),tiers:[1,2,3,4].map(t=>N('tier'+t+'_'+s)),sd,kick:0};});
    M.pods=['L','R'].map(s=>N('pod_'+s+'_mz'));
    M.jets=['L','R'].map((s,i)=>{const n=N('jet_'+s);n.rotation.x=-.55;
      const f1=new THREE.Mesh(new THREE.CylinderGeometry(.02,.22,1,10,1,true),MT.flame);f1.castShadow=false;n.add(f1);
      const f2=new THREE.Mesh(new THREE.CylinderGeometry(.01,.12,1,8,1,true),MT.flame2);f2.castShadow=false;n.add(f2);
      return {n,core:M.cores[i],f1,f2};});
    M.jl=new THREE.PointLight(0xff9a40,0,14,1.8);M.jl.position.set(0,1.2,1.6);M.torso.add(M.jl);
    M.ready=true;setTier(M,1);
  });
  return M;
}
function setTier(M,t){if(!M.ready||M.tier===t)return;M.tier=t;for(const A of M.arms)A.tiers.forEach((n,i)=>n.visible=i===t-1);}
/* 2-bone leg IK in the leg's side view: target (ty,tz) is the ankle relative to the hip. rev: knee bends backwards */
function legIK(L,ty,tz,footPitch,l1,l2,rev){
  l1=l1||L1;l2=l2||L2;let d=Math.hypot(ty,tz);d=clamp(d,.3,l1+l2-.002);
  const th=Math.atan2(-tz,-ty),al=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),ga=Math.acos(clamp((l1*l1+l2*l2-d*d)/(2*l1*l2),-1,1));
  const t1=rev?th-al:th+al,k=rev?Math.PI-ga:-(Math.PI-ga);
  L.thigh.rotation.x=t1;L.knee.rotation.x=k;L.ankle.rotation.x=-(t1+k)+(footPitch||0);
}
/* the mech's legs: the foot bone keeps a fixed forward lean (PHI), so place the hock behind and above the ankle, then solve hip->hock */
function legIK3(L,ty,tz,footPitch,phi){
  phi=phi==null?PHI:phi;const hy=ty+L3*Math.cos(phi),hz=tz+L3*Math.sin(phi);
  legIK(L,hy,hz,0,L1,L2,false);const a=L.thigh.rotation.x+L.knee.rotation.x;
  L.hock.rotation.x=phi-a;L.ankle.rotation.x=-phi+(footPitch||0);
}
/* pose the mech for this frame. st: {x,z,gy,legYaw,aimYaw,spd (m/s along the legs, minus = backwards),air,vy,land,thrust,pitch}
   returns foot-plant events [{x,z,side}] for sound, dust and shake */
function poseMech(M,st,dt){
  const ev=[];if(!M.ready)return ev;
  const sp=Math.abs(st.spd),sf=clamp(sp/7.5,0,1),w=smooth(.15,1.4,sp),S_=lerp(1.0,2.4,sf);
  if(!st.air)M.phase+=st.spd*dt/(2*S_);
  const cy=Math.cos(st.legYaw),sy=Math.sin(st.legYaw),comp=st.land*.6;
  const bob=st.air?0:Math.abs(Math.sin(M.phase*TAU))*.1*w;
  const hipY=st.gy+HIP-bob-comp-(st.air?0:.05*w);
  M.root.position.set(st.x,0,st.z);
  M.hips.position.y=hipY;M.torso.position.y=hipY+.02;
  M.hips.rotation.y=st.legYaw;M.torso.rotation.y=st.aimYaw;
  M.lean+=((st.air?-.1:-.05*sf*Math.sign(st.spd||1))+st.land*.25-M.lean)*damp(6,dt);
  M.roll+=((st.air?0:Math.sin(M.phase*TAU)*.025*w)-M.roll)*damp(8,dt);
  M.torso.rotation.x=M.lean;M.torso.rotation.z=M.roll;M.hips.rotation.z=M.roll*.6;
  const hy=hipY-HIPDROP;
  for(const L of M.legs){
    let tz=0,lift=0;
    if(st.air){tz=-.15+L.sd*.08;lift=.75+(st.vy>0?.3:0);}
    else{let u=(M.phase+(L.sd>0?.5:0))%1;if(u<0)u+=1;
      if(u<.5){tz=lerp(-S_/2,S_/2,u/.5);}else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s*s*(3-2*s));lift=Math.sin(Math.PI*s)*.5*w;}
      tz*=w;const nowPlant=u<.5;if(nowPlant&&!L.plant&&w>.3)ev.push({side:L.sd});L.plant=nowPlant;}
    const ox=L.sd*.88,fx=st.x+ox*cy+tz*sy,fz=st.z-ox*sy+tz*cy;L.gy=hgt(fx,fz);
    const ty=(st.air?hy-2.3+lift:L.gy+ANK+lift)-hy;
    legIK3(L,ty,tz,st.air?.35:0,st.air?.5:PHI);
    const e=ev[ev.length-1];if(e&&e.side===L.sd&&e.x===undefined){e.x=fx;e.z=fz;}
  }
  for(const A of M.arms){A.kick*=Math.exp(-dt*16);A.sh.rotation.x=st.pitch*.85+Math.sin(M.phase*TAU+(A.sd>0?Math.PI:0))*.04*w;A.brl.position.z=A.bz+A.kick*.32;}
  const th=st.thrust,fl=.6+Math.random()*.4;
  for(const J of M.jets){J.f1.visible=J.f2.visible=th>.02;const l1=(.5+th*1.5)*fl,l2=(.35+th*.9)*fl;J.f1.scale.set(1,l1,1);J.f1.position.y=-.45-.5*l1;
    J.f2.scale.set(1,l2,1);J.f2.position.y=-.45-.5*l2;if(J.core)J.core.scale.setScalar(.7+th*.5);}
  MT.glow.color.setRGB(1,.5,.12).multiplyScalar(2.2+th*3.5);
  M.jl.intensity=th*60*fl;
  return ev;
}

/* ---- 06_player.js ---- */
/* ===================== the player: walking, jet hops, collisions ===================== */
const WALK=7.5,RAD=1.35;
/* jet hop: vh = sideways speed, vy = launch speed, hold = how long holding JET keeps pushing, refill = seconds per fuel cell */
const JET={vh:30,vy:11,grav:22,hold:.9,holdG:.35,refill:3.2,drain:.55};   /* tap: about 30 m, hold: about 55 m */
let P=null;
function mkPlayer(){return {x:SPAWN.x,z:SPAWN.z,y:hgt(SPAWN.x,SPAWN.z),yaw:SPAWN.yaw,pitch:0,legYaw:SPAWN.yaw,vx:0,vz:0,vy:0,air:false,
  cells:2,fuel:2,jetT:9,land:0,thrust:0,spd:0,groundT:9,ev:[],hops:0,dist:0,hull:100,hullMax:100,shield:60,shieldMax:60,regenT:0,dead:false};}
function updPlayer(c,dt){
  if(P.dead){P.thrust=0;return;}
  /* shield comes back after 3 s without a hit */
  if(P.regenT>0)P.regenT-=dt;else P.shield=Math.min(P.shieldMax,P.shield+22*dt);
  P.yaw-=c.turn;P.pitch=clamp(P.pitch+c.pitch,-.85,.34);   /* turn: plus = to the right */
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
  let wx=fx*c.my+rx*c.mx,wz=fz*c.my+rz*c.mx;const ml=Math.hypot(wx,wz);
  /* jet hop */
  if(c.jetHit){
    if(!P.air&&P.fuel>=.98){const dx=ml>.2?wx/ml:fx,dz=ml>.2?wz/ml:fz;
      P.vx=dx*JET.vh;P.vz=dz*JET.vh;P.vy=JET.vy;P.air=true;P.fuel-=1;P.jetT=0;P.hops++;P.ev.push({t:'jet'});}
    else if(!P.air)P.ev.push({t:'nofuel'});
  }
  if(P.air){
    P.jetT+=dt;const hold=c.jet&&P.jetT<JET.hold&&P.fuel>.02;
    if(hold)P.fuel=Math.max(0,P.fuel-JET.drain*dt);
    P.vy-=JET.grav*(hold?JET.holdG:1)*dt;
    /* a little steering in the air */
    P.vx+=wx*5*dt;P.vz+=wz*5*dt;const hv=Math.hypot(P.vx,P.vz);if(hv>JET.vh*1.05){P.vx*=JET.vh*1.05/hv;P.vz*=JET.vh*1.05/hv;}
    P.thrust+=((P.jetT<.28?1:hold?.75:0)-P.thrust)*damp(14,dt);
    P.y+=P.vy*dt;
  }else{
    const tx=wx*WALK,tz=wz*WALK,k=damp(Math.hypot(P.vx,P.vz)>WALK*1.1?2.6:ml>.05?3.4:5.5,dt);
    P.vx+=(tx-P.vx)*k;P.vz+=(tz-P.vz)*k;P.thrust+=(0-P.thrust)*damp(10,dt);P.groundT+=dt;
    if(P.groundT>.6)P.fuel=Math.min(P.cells,P.fuel+dt/JET.refill);
  }
  /* move, then push out of tree trunks and keep inside the map */
  let nx=P.x+P.vx*dt,nz=P.z+P.vz*dt;
  const r=collide(nx,nz,RAD);if(r[2]&&(!P.air||P.y<hgt(r[0],r[1])+4)){nx=r[0];nz=r[1];}
  const B=BND();if(nx<B.x0||nx>B.x1){nx=clamp(nx,B.x0,B.x1);P.vx*=.2;}if(nz<B.z0||nz>B.z1){nz=clamp(nz,B.z0,B.z1);P.vz*=.2;}
  P.dist+=Math.hypot(nx-P.x,nz-P.z);P.x=nx;P.z=nz;
  const g=hgt(P.x,P.z);
  if(P.air){if(P.y<=g&&P.vy<0){const k=clamp(-P.vy/16,0,1.3);P.y=g;P.air=false;P.vy=0;P.groundT=0;P.land=Math.max(P.land,.18+k*.32);P.ev.push({t:'land',k});}}
  else P.y=g;
  P.land=Math.max(0,P.land-dt*1.6);
  /* legs: face the way you walk (backwards when walking backwards), shuffle round when turning on the spot */
  const hs=Math.hypot(P.vx,P.vz);let tgt=P.legYaw,turnStep=0;
  if(hs>.6){const my=Math.atan2(-P.vx,-P.vz);tgt=Math.abs(angD(my,P.yaw))>1.95?my+Math.PI:my;}
  else if(Math.abs(angD(P.yaw,P.legYaw))>.55){tgt=P.yaw;turnStep=2.4;}
  const dl=angD(tgt,P.legYaw),mx=(P.air?2:5.5)*dt;P.legYaw+=clamp(dl,-mx,mx);
  const lf=-Math.sin(P.legYaw),lz=-Math.cos(P.legYaw);
  P.spd=P.vx*lf+P.vz*lz;if(Math.abs(P.spd)<turnStep&&!P.air&&Math.abs(dl)>.05)P.spd=turnStep*Math.sign(P.spd||1);
}

/* ---- 06b_weapons.js ---- */
/* ===================== weapons: autocannon tiers I-IV with heat and vent, missile salvos ===================== */
const GUN={tier:1,base:1,heat:0,over:false,cd:0,side:0,cool:0,ventCd:0,flash:0,hitT:0,
  rate:[0,6,7,8,9],dmg:[0,11,8.5,7.2,6.6],spread:[0,.004,.006,.02,.009]};
const HEAT={shot:2.3,cool:30,delay:.45,resume:38};
const MSL={ammo:12,max:24,salvo:2,cd:0};
const BOLTS=[],EBOLTS=[],MISS=[];
/* SALVO: 14 auto-aimed rounds from the shoulder pods at the nearest machines all around you (even behind), then a 12 s cooldown.
   It does not use the gun's heat, and it works in the air, so you can hop away and salvo at the same time. */
const SALVO={cd:0,cool:12,n:14,left:0,t:0,dmg:16,range:48};
const BOLT={speed:150,range:170};
let BM=null,EBM=null,MSM=null,MFL=null;
const _v=new THREE.Vector3(),_w=new THREE.Vector3(),_m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_up=new THREE.Vector3(0,1,0),_z=new THREE.Vector3(0,0,1);
function buildWeapons(){
  const g=new THREE.CylinderGeometry(.1,.1,1,6,1,true);g.rotateX(Math.PI/2);
  BM=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.78,.4).multiplyScalar(3),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),160);
  const g2=new THREE.SphereGeometry(.22,10,6);g2.scale(1,1,2.6);
  EBM=new THREE.InstancedMesh(g2,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.22,.08).multiplyScalar(3.2),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),80);
  const g3=new THREE.CylinderGeometry(.09,.12,.9,8);g3.rotateX(Math.PI/2);
  MSM=new THREE.InstancedMesh(g3,hookWorld(new THREE.MeshStandardMaterial({color:0xd8d8d0,roughness:.5,metalness:.4})),40);
  for(const m of [BM,EBM,MSM]){m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);S.add(m);}
  BM.renderOrder=EBM.renderOrder=4;
  MFL=new THREE.PointLight(0xffb060,0,22,1.6);S.add(MFL);
}
/* where the crosshair points: the first enemy, tree or ground along the camera ray (aim assist bends it onto a nearby enemy) */
const AIM={x:0,y:0,z:0,e:null,dist:0};
function rayAim(){
  cam.getWorldDirection(_v);const ox=cam.position.x,oy=cam.position.y,oz=cam.position.z,dx=_v.x,dy=_v.y,dz=_v.z;
  let best=BOLT.range,hitE=null;
  /* aim assist: the enemy closest to the crosshair within a small cone */
  const cone=touchy?.12:.055;let ba=cone;
  for(const e of EN){if(e.dead||e.spawnT>0)continue;const ex=e.x-ox,ey=e.y+e.d.cy-oy,ez=e.z-oz,t=ex*dx+ey*dy+ez*dz;if(t<4||t>BOLT.range)continue;
    const px=ex-dx*t,py=ey-dy*t,pz=ez-dz*t,perp=Math.sqrt(px*px+py*py+pz*pz),ang=Math.max(0,perp-e.d.r)/t;
    if(ang<ba){ba=ang;hitE=e;best=t;}}
  for(const tg of TARGETS){if(tg.dead)continue;for(const s0 of tg.spheres){const ex=s0[0]-ox,ey=s0[1]-oy,ez=s0[2]-oz,t=ex*dx+ey*dy+ez*dz;if(t<4||t>BOLT.range)continue;const px=ex-dx*t,py=ey-dy*t,pz=ez-dz*t,ang=Math.max(0,Math.sqrt(px*px+py*py+pz*pz)-s0[3])/t;
    if(ang<ba){ba=ang;hitE=null;best=t;AIM.e=null;AIM.x=s0[0];AIM.y=s0[1];AIM.z=s0[2];AIM.dist=t;AIM.tg=1;}}}
  if(hitE){AIM.e=hitE;AIM.x=hitE.x;AIM.y=hitE.y+hitE.d.cy;AIM.z=hitE.z;AIM.dist=best;return;}
  if(AIM.tg){AIM.tg=0;return;}
  /* otherwise march the ray against ground and tree trunks */
  let t=6;for(;t<BOLT.range;t+=2){const x=ox+dx*t,y=oy+dy*t,z=oz+dz*t;if(y<hgt(x,z)){t-=1;break;}if(treeAt(x,z,y))break;}
  AIM.e=null;AIM.x=ox+dx*t;AIM.y=oy+dy*t;AIM.z=oz+dz*t;AIM.dist=t;
}
function treeAt(x,z,y){const a=VEG.cols.get(colKey(x,z));if(!a)return false;for(const c of a){if(c.b){if(x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1&&y<c.y0+c.h)return true;continue;}const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz<(c.r+.25)*(c.r+.25)&&y<hgt(c.x,c.z)+(c.h||9))return true;}return false;}
function updSalvo(c,dt){
  SALVO.cd=Math.max(0,SALVO.cd-dt);
  if(c.salvo&&!P.dead){if(SALVO.cd<=0&&SALVO.left<=0){for(const e of EN)e.pend=0;SALVO.left=SALVO.n;SALVO.t=0;SALVO.cd=SALVO.cool;HUD.msg('SALVO',.8);CAMS.shake=Math.max(CAMS.shake,.3);}else if(SALVO.left<=0)sClick();}
  if(SALVO.left>0){SALVO.t-=dt;while(SALVO.left>0&&SALVO.t<=0){SALVO.t+=.065;SALVO.left--;salvoRound(SALVO.n-SALVO.left);}}
}
function salvoRound(i){
  const near=EN.filter(e=>!e.dead&&e.spawnT<=0&&Math.hypot(e.x-P.x,e.z-P.z)<SALVO.range).sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z));
  const pod=M.ready?M.pods[i%2]:null;if(pod)pod.getWorldPosition(_w);else _w.set(P.x,P.y+5,P.z);
  let tx,ty,tz;
  /* spread the rounds: the nearest machine that is not already going to die from rounds in the air */
  let tg=null;if(near.length){const e=tg=near.find(o=>o.hp-(o.pend||0)>0)||near[0];e.pend=(e.pend||0)+SALVO.dmg;tx=e.x+(Math.random()-.5)*.4;ty=e.y+e.d.cy;tz=e.z+(Math.random()-.5)*.4;}
  else{const a=P.yaw+i/SALVO.n*TAU;tx=P.x-Math.sin(a)*14;tz=P.z-Math.cos(a)*14;ty=hgt(tx,tz);}
  let ax=tx-_w.x,ay=ty-_w.y,az=tz-_w.z;const l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;
  BOLTS.push({x:_w.x,y:_w.y,z:_w.z,vx:ax*170,vy:ay*170,vz:az*170,life:(l+8)/170,dmg:SALVO.dmg,tg});
  part({x:_w.x+ax*.6,y:_w.y+ay*.6,z:_w.z+az*.6,vx:0,vy:0,vz:0,life:.07,s0:1.5,s1:.6,a:2.4,col:[1,.75,.4],glow:true});MFL.position.copy(_w);GUN.flash=1;sGun(2);
}
function updGun(c,dt){
  updSalvo(c,dt);
  GUN.cd-=dt;GUN.ventCd=Math.max(0,GUN.ventCd-dt);GUN.flash=Math.max(0,GUN.flash-dt*12);GUN.hitT=Math.max(0,GUN.hitT-dt);
  if(M.ready)setTier(M,GUN.tier);
  const firing=c.fire&&!GUN.over&&!P.dead;
  if(firing&&GUN.cd<=0){
    const t=GUN.tier,A=M.ready?M.arms[GUN.side]:null;GUN.cd+=1/GUN.rate[t];if(GUN.cd<0)GUN.cd=0;GUN.side^=1;
    if(A){A.muzzle.getWorldPosition(_w);A.kick=1;}else _w.set(P.x,P.y+3.2,P.z);
    /* barrel offsets per tier, in the gun's own frame */
    const offs=t===1?[[0,0]]:t===2?[[-.11,0],[.11,0]]:t===3?[[-.12,-.07],[.12,-.07],[0,.13]]:[[.1,.1],[-.1,.1],[-.1,-.1],[.1,-.1]];
    const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
    for(const o of offs){const sx=_w.x+rx*o[0],sy=_w.y+o[1],sz=_w.z+rz*o[0];
      let ax=AIM.x-sx,ay=AIM.y-sy,az=AIM.z-sz;const l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;
      const sp=GUN.spread[t];ax+=(Math.random()-.5)*sp*2;ay+=(Math.random()-.5)*sp*2;az+=(Math.random()-.5)*sp*2;
      BOLTS.push({x:sx,y:sy,z:sz,vx:ax*BOLT.speed,vy:ay*BOLT.speed,vz:az*BOLT.speed,life:BOLT.range/BOLT.speed,dmg:GUN.dmg[t]});}
    part({x:_w.x+fx*.4,y:_w.y,z:_w.z+fz*.4,vx:0,vy:0,vz:0,life:.08,s0:1.6+t*.25,s1:.8,a:2.6,col:[1,.7,.35],glow:true});
    if(Math.random()<.5)part({x:_w.x,y:_w.y,z:_w.z,vx:fx*2,vy:.8,vz:fz*2,life:.7,s0:.4,s1:1.4,a:.22,col:SMOKE,drag:2});
    MFL.position.copy(_w);GUN.flash=1;
    GUN.heat+=HEAT.shot;GUN.cool=HEAT.delay;
    if(GUN.heat>=100){GUN.heat=100;GUN.over=true;sOver();HUD.msg('OVERHEAT · VENT IT',1.4);}
    sGun(t);
  }else if(!firing){GUN.cool-=dt;if(GUN.cool<=0)GUN.heat=Math.max(0,GUN.heat-HEAT.cool*dt);}
  if(GUN.over){GUN.cool-=dt;if(GUN.cool<=0)GUN.heat=Math.max(0,GUN.heat-HEAT.cool*.8*dt);if(GUN.heat<=HEAT.resume)GUN.over=false;
    if(M.ready&&Math.random()<dt*14){const A=M.arms[Math.random()<.5?0:1];A.muzzle.getWorldPosition(_w);part({x:_w.x,y:_w.y,z:_w.z,vx:(Math.random()-.5),vy:1.5+Math.random(),vz:(Math.random()-.5),life:1.2,s0:.4,s1:1.6,a:.35,col:[.85,.85,.88],drag:1});}}
  MFL.intensity=GUN.flash*90;
  /* vent: dump all heat with a steam blast that shoves close enemies back */
  if(c.vent&&GUN.ventCd<=0&&!P.dead){GUN.ventCd=8;GUN.heat=0;GUN.over=false;sVent();CAMS.shake=Math.max(CAMS.shake,.35);
    for(let i=0;i<26;i++){const a=Math.random()*TAU,s=4+Math.random()*7;part({x:P.x+Math.cos(a)*1.2,y:P.y+1.5+Math.random()*2,z:P.z+Math.sin(a)*1.2,vx:Math.cos(a)*s,vy:.5+Math.random()*2,vz:Math.sin(a)*s,life:1.4+Math.random(),s0:1,s1:4.2,a:.4,col:[.92,.93,.95],drag:2.2,grav:-.4});}
    for(const e of EN){if(e.dead)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz)||1;if(d<10){hurtEnemy(e,15,e.x,e.y+1,e.z);e.kx+=dx/d*16*(1-d/12);e.kz+=dz/d*16*(1-d/12);}}}
  /* missiles: tap to fire a salvo at the enemies nearest the crosshair */
  MSL.cd-=dt;
  if(c.msl&&!P.dead){
    if(MSL.ammo<=0||MSL.cd>0){if(MSL.ammo<=0){sClick();HUD.msg('NO MISSILES',1);}}
    else{MSL.cd=.7;cam.getWorldDirection(_v);
      const cand=EN.filter(e=>!e.dead&&e.spawnT<=0).map(e=>{const ex=e.x-cam.position.x,ey=e.y+e.d.cy-cam.position.y,ez=e.z-cam.position.z,d=Math.hypot(ex,ey,ez);return {e,d,a:Math.acos(clamp((ex*_v.x+ey*_v.y+ez*_v.z)/d,-1,1))};})
        .filter(o=>o.a<.6&&o.d<120).sort((a,b)=>a.a-b.a);
      const n=Math.min(MSL.salvo,MSL.ammo);for(let i=0;i<n;i++){const tg=cand.length?cand[i%cand.length].e:null,pod=M.ready?M.pods[i%2]:null;
        if(pod)pod.getWorldPosition(_w);else _w.set(P.x,P.y+4.4,P.z);
        const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
        MISS.push({x:_w.x,y:_w.y,z:_w.z,vx:fx*14+(i%2?3:-3),vy:9,vz:fz*14,t:0,tg,life:4.5,ax:AIM.x,ay:AIM.y,az:AIM.z,delay:i*.09});}
      MSL.ammo-=n;sMissile();}
  }
}
/* move bolts and missiles, test hits */
function updShots(dt){
  const drop=(i)=>{const b=BOLTS[i];if(b.tg)b.tg.pend=Math.max(0,(b.tg.pend||0)-b.dmg);BOLTS.splice(i,1);};
  for(let i=BOLTS.length-1;i>=0;i--){const b=BOLTS[i];b.life-=dt;if(b.life<=0){drop(i);continue;}
    const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt,nz=b.z+b.vz*dt;let hit=null,ht=1;
    for(const e of EN){if(e.dead||e.spawnT>0)continue;const t=segSphere(b.x,b.y,b.z,nx,ny,nz,e.x,e.y+e.d.cy,e.z,e.d.r);if(t>=0&&t<ht){ht=t;hit=e;}}
    const hx=lerp(b.x,nx,ht),hy=lerp(b.y,ny,ht),hz=lerp(b.z,nz,ht);
    if(hit){drop(i);hurtEnemy(hit,b.dmg,hx,hy,hz);GUN.hitT=.12;sparks(hx,hy,hz,5,[1,.75,.35]);continue;}
    const tg=hitTargets(b.x,b.y,b.z,nx,ny,nz);if(tg){drop(i);hurtTarget(tg,b.dmg);GUN.hitT=.12;sparks(nx,ny,nz,6,[1,.75,.35]);continue;}
    if(ny<hgt(nx,nz)||treeAt(nx,nz,ny)){sparks(nx,Math.max(ny,hgt(nx,nz)+.1),nz,4,[1,.7,.3]);part({x:nx,y:Math.max(ny,hgt(nx,nz)+.2),z:nz,vx:0,vy:1,vz:0,life:.8,s0:.5,s1:1.6,a:.3,col:DUST,drag:1.5});drop(i);continue;}
    b.x=nx;b.y=ny;b.z=nz;}
  for(let i=MISS.length-1;i>=0;i--){const m=MISS[i];m.t+=dt;m.life-=dt;if(m.t<m.delay)continue;
    if(m.tg&&m.tg.dead)m.tg=null;
    const tx=m.tg?m.tg.x:m.ax,ty=m.tg?m.tg.y+m.tg.d.cy:m.ay,tz=m.tg?m.tg.z:m.az;
    if(m.t>m.delay+.25){/* home in */const sp=Math.min(62,Math.hypot(m.vx,m.vy,m.vz)+60*dt);let dx=tx-m.x,dy=ty-m.y,dz=tz-m.z;const dl=Math.hypot(dx,dy,dz)||1;
      const k=Math.min(1,dt*4.2);let vx=m.vx/sp,vy=m.vy/sp,vz=m.vz/sp;const cl=Math.hypot(m.vx,m.vy,m.vz)||1;vx=m.vx/cl;vy=m.vy/cl;vz=m.vz/cl;
      vx+=(dx/dl-vx)*k;vy+=(dy/dl-vy)*k;vz+=(dz/dl-vz)*k;const nl=Math.hypot(vx,vy,vz)||1;m.vx=vx/nl*sp;m.vy=vy/nl*sp;m.vz=vz/nl*sp;}
    else m.vy-=6*dt;
    m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;
    if(Math.random()<.9)part({x:m.x,y:m.y,z:m.z,vx:0,vy:.3,vz:0,life:1.1,s0:.35,s1:1.5,a:.33,col:SMOKE,drag:1});
    part({x:m.x,y:m.y,z:m.z,vx:0,vy:0,vz:0,life:.06,s0:.7,s1:.3,a:1.6,col:[1,.6,.25],glow:true});
    const near=m.tg&&Math.hypot(tx-m.x,ty-m.y,tz-m.z)<m.tg.d.r+.6;
    if(near||m.life<=0||m.y<hgt(m.x,m.z)+.1||treeAt(m.x,m.z,m.y)){boom(m.x,Math.max(m.y,hgt(m.x,m.z)+.3),m.z,1);splash(m.x,m.y,m.z,4.8,75);MISS.splice(i,1);}}
  for(let i=EBOLTS.length-1;i>=0;i--){const b=EBOLTS[i];b.life-=dt;if(b.life<=0){EBOLTS.splice(i,1);continue;}
    const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt,nz=b.z+b.vz*dt;
    if(!P.dead&&segSphere(b.x,b.y,b.z,nx,ny,nz,P.x,P.y+3.3,P.z,2.0)>=0){hurtPlayer(b.dmg,b.x-b.vx,b.z-b.vz);sparks(nx,ny,nz,6,[.6,.8,1]);EBOLTS.splice(i,1);continue;}
    if(ny<hgt(nx,nz)||treeAt(nx,nz,ny)){sparks(nx,ny,nz,4,[1,.35,.15]);EBOLTS.splice(i,1);continue;}
    b.x=nx;b.y=ny;b.z=nz;}
  drawShots();
}
function segSphere(x0,y0,z0,x1,y1,z1,cx,cy,cz,r){const dx=x1-x0,dy=y1-y0,dz=z1-z0,fx=x0-cx,fy=y0-cy,fz=z0-cz,a=dx*dx+dy*dy+dz*dz,b=2*(fx*dx+fy*dy+fz*dz),c=fx*fx+fy*fy+fz*fz-r*r;
  if(c<0)return 0;const D=b*b-4*a*c;if(D<0||a<1e-9)return -1;const t=(-b-Math.sqrt(D))/(2*a);return t>=0&&t<=1?t:-1;}
function drawShots(){
  let n=0;for(const b of BOLTS){if(n>=160)break;const l=Math.hypot(b.vx,b.vy,b.vz);_v.set(b.vx/l,b.vy/l,b.vz/l);_q.setFromUnitVectors(_z,_v);
    _m4.compose(_w.set(b.x-_v.x*1.8,b.y-_v.y*1.8,b.z-_v.z*1.8),_q,V3(1,1,3.6));BM.setMatrixAt(n++,_m4);}
  BM.count=n;BM.instanceMatrix.needsUpdate=true;BM.visible=n>0;
  n=0;for(const b of EBOLTS){if(n>=80)break;const l=Math.hypot(b.vx,b.vy,b.vz);_v.set(b.vx/l,b.vy/l,b.vz/l);_q.setFromUnitVectors(_z,_v);_m4.compose(_w.set(b.x,b.y,b.z),_q,V3(1,1,1));EBM.setMatrixAt(n++,_m4);}
  EBM.count=n;EBM.instanceMatrix.needsUpdate=true;EBM.visible=n>0;
  n=0;for(const m of MISS){if(m.t<m.delay)continue;const l=Math.hypot(m.vx,m.vy,m.vz)||1;_v.set(m.vx/l,m.vy/l,m.vz/l);_q.setFromUnitVectors(_z,_v);_m4.compose(_w.set(m.x,m.y,m.z),_q,V3(1,1,1));MSM.setMatrixAt(n++,_m4);}
  MSM.count=n;MSM.instanceMatrix.needsUpdate=true;MSM.visible=n>0;
}
function sparks(x,y,z,n,col){for(let i=0;i<n;i++){const a=Math.random()*TAU,b=Math.random()*2-1,s=4+Math.random()*7;
  part({x,y,z,vx:Math.cos(a)*s*Math.sqrt(1-b*b),vy:b*s+2,vz:Math.sin(a)*s*Math.sqrt(1-b*b),life:.25+Math.random()*.25,s0:.22,s1:.06,a:2,col,glow:true,drag:2,grav:12});}}
function boom(x,y,z,k){sBoom(k);CAMS.shake=Math.max(CAMS.shake,Math.min(.9,.7*k*12/Math.max(6,Math.hypot(x-P.x,z-P.z))));
  part({x,y,z,vx:0,vy:0,vz:0,life:.35,s0:4*k,s1:7*k,a:2.4,col:[1,.62,.28],glow:true});
  for(let i=0;i<10*k;i++){const a=Math.random()*TAU,s=2+Math.random()*5*k;part({x,y,z,vx:Math.cos(a)*s,vy:1+Math.random()*4,vz:Math.sin(a)*s,life:1.4+Math.random(),s0:1.2*k,s1:4.4*k,a:.45,col:[.32,.3,.29],drag:1.8,grav:-.6});}
  sparks(x,y,z,10*k,[1,.62,.25]);MFL.position.set(x,y+1,z);GUN.flash=Math.max(GUN.flash,1.4*k);}
function splash(x,y,z,r,dmg){for(const t of TARGETS){if(t.dead)continue;const s=t.spheres[0];if(Math.hypot(s[0]-x,s[1]-y,s[2]-z)<r+s[3]+2)hurtTarget(t,dmg);}for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-x,e.y+e.d.cy-y,e.z-z);if(d<r+e.d.r)hurtEnemy(e,dmg*(1-.5*clamp(d/r,0,1)),e.x,e.y+e.d.cy,e.z);}}

/* ---- 06c_enemies.js ---- */
/* ===================== FORGE machines, path-finding, waves, pickups, damage and score ===================== */
const EDEF={
  skitter:{hp:30,r:1.3,cy:1.25,speed:9.5,score:50,drop:.12,file:'skitter',sc:1.4},
  hound:{hp:95,r:1.7,cy:1.95,speed:8.2,score:150,drop:.4,file:'hound',sc:1.15},
  gunner:{hp:230,r:1.4,cy:2.7,speed:4.6,score:400,drop:1,file:'gunner',sc:1.05}};
const EN=[],EMAT={},ETPL={};
let ENEMY_READY=false;
function loadEnemies(){
  const k=a=>{a.vertexColors=true;return hookWorld(a);};
  EMAT.egrey=k(new THREE.MeshStandardMaterial({map:tex('23-grey-armour'),color:0x9c8884,roughness:.5,metalness:.45}));
  EMAT.egun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),color:0x6c7078,roughness:.45,metalness:.7}));
  EMAT.edark=k(new THREE.MeshStandardMaterial({color:0x121316,roughness:.7,metalness:.4}));
  EMAT.esteel=MT.steel;
  EMAT.ered=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.14,.06).multiplyScalar(3.4)});
  EMAT.emblem=hookWorld(new THREE.MeshStandardMaterial({map:tex('29-enemy-emblem',{clamp:true,glb:true}),transparent:true,alphaTest:.35,roughness:.55,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  const L=new THREE.GLTFLoader(LM),jobs=Object.keys(EDEF).map(id=>new Promise(ok=>L.load('models/mech/'+EDEF[id].file+'.glb',g=>{
    g.scene.traverse(o=>{if(o.isMesh){o.material=EMAT[o.material.name]||EMAT.egun;o.castShadow=o.material!==EMAT.emblem;o.receiveShadow=true;}});
    mergeParts(g.scene);ETPL[id]=g.scene;ok();},undefined,()=>ok())));
  return Promise.all(jobs).then(()=>{ENEMY_READY=true;});
}
/* ---- path-finding: a flow field on a 2 m grid, rebuilt when the player moves to another cell ---- */
const NAV={c:2,n:0,o:0,block:null,dist:null,pc:-1,t:0};
function navInit(){const ext=PLAY+10;NAV.o=-ext;NAV.n=Math.ceil(ext*2/NAV.c);const n=NAV.n;NAV.block=new Uint8Array(n*n);NAV.dist=new Float32Array(n*n);
  const seen=new Set();
  for(const a of VEG.cols.values())for(const c of a){if(seen.has(c))continue;seen.add(c);
    if(c.b){const i0=Math.floor((c.x0-1.2-NAV.o)/NAV.c),i1=Math.floor((c.x1+1.2-NAV.o)/NAV.c),j0=Math.floor((c.z0-1.2-NAV.o)/NAV.c),j1=Math.floor((c.z1+1.2-NAV.o)/NAV.c);
      for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)if(i>=0&&j>=0&&i<n&&j<n)NAV.block[j*n+i]=1;continue;}
    const r=c.r+1.1,i0=Math.floor((c.x-r-NAV.o)/NAV.c),i1=Math.floor((c.x+r-NAV.o)/NAV.c),j0=Math.floor((c.z-r-NAV.o)/NAV.c),j1=Math.floor((c.z+r-NAV.o)/NAV.c);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){if(i<0||j<0||i>=n||j>=n)continue;const cx=NAV.o+(i+.5)*NAV.c,cz=NAV.o+(j+.5)*NAV.c;if(Math.hypot(cx-c.x,cz-c.z)<r)NAV.block[j*n+i]=1;}}}
const navCell=(x,z)=>{const i=Math.floor((x-NAV.o)/NAV.c),j=Math.floor((z-NAV.o)/NAV.c);return i<0||j<0||i>=NAV.n||j>=NAV.n?-1:j*NAV.n+i;};
function navBuild(){const n=NAV.n,D=NAV.dist;D.fill(1e9);const s=navCell(P.x,P.z);if(s<0)return;NAV.pc=s;
  /* Dijkstra with a bucket queue is overkill here: a two-pass chamfer sweep (8 neighbours) is fast and good enough */
  D[s]=0;const B=NAV.block,d1=1,d2=1.414;
  for(let it=0;it<3;it++){
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i;if(B[k])continue;let v=D[k];
      if(i>0&&D[k-1]+d1<v)v=D[k-1]+d1;if(j>0){if(D[k-n]+d1<v)v=D[k-n]+d1;if(i>0&&D[k-n-1]+d2<v)v=D[k-n-1]+d2;if(i<n-1&&D[k-n+1]+d2<v)v=D[k-n+1]+d2;}D[k]=v;}
    for(let j=n-1;j>=0;j--)for(let i=n-1;i>=0;i--){const k=j*n+i;if(B[k])continue;let v=D[k];
      if(i<n-1&&D[k+1]+d1<v)v=D[k+1]+d1;if(j<n-1){if(D[k+n]+d1<v)v=D[k+n]+d1;if(i<n-1&&D[k+n+1]+d2<v)v=D[k+n+1]+d2;if(i>0&&D[k+n-1]+d2<v)v=D[k+n-1]+d2;}D[k]=v;}}
}
/* direction toward the player through the woods from (x,z); falls back to straight at the player */
function navDir(x,z){const k=navCell(x,z),n=NAV.n,D=NAV.dist;let bx=P.x-x,bz=P.z-z;
  if(k>=0&&D[k]<1e8){let best=D[k],bi=-1,bj=-1;const i=k%n,j=(k/n)|0;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=n||jj>=n)continue;const v=D[jj*n+ii];if(v<best){best=v;bi=ii;bj=jj;}}
    if(bi>=0&&D[k]>2){bx=NAV.o+(bi+.5)*NAV.c-x;bz=NAV.o+(bj+.5)*NAV.c-z;}}
  const l=Math.hypot(bx,bz)||1;return [bx/l,bz/l];}
/* can the enemy see the player (no trunk in between)? */
function los(x,z){const dx=P.x-x,dz=P.z-z,d=Math.hypot(dx,dz),st=Math.ceil(d/3);for(let i=1;i<st;i++){const t=i/st;if(treeAt(x+dx*t,z+dz*t,hgt(x+dx*t,z+dz*t)+2.5))return false;}return true;}
/* ---- spawning ---- */
function spawnEnemy(id,x,z){const d=EDEF[id],tp=ETPL[id];if(!tp)return null;
  const o=tp.clone(true);const N=n=>o.getObjectByName(n);
  const e={id,d,o,x,z,y:hgt(x,z),yaw:Math.atan2(-(P.x-x),-(P.z-z)),hp:d.hp*G.hpK,dead:false,spawnT:1.3,st:'move',t:0,cd:1+Math.random()*1.5,
    kx:0,kz:0,flash:0,phase:Math.random()*10,strafe:Math.random()<.5?1:-1,strT:2+Math.random()*2,vx:0,vz:0};
  if(id==='skitter'){e.body=N('body');e.legs=[0,1,2,3].map(i=>N('leg'+i));}
  else if(id==='hound'){e.body=N('body');e.head=N('head');e.legs=['FL','FR','BL','BR'].map(s=>({up:N('leg'+s),kn:N('knee'+s)}));}
  else{e.hips=N('hips');e.torso=N('torso');e.armR=N('armR');e.armL=N('armL');e.mzR=N('mzR');e.mzL=N('mzL');
    e.legs=[-1,1].map(sd=>{const s=sd<0?'L':'R';return {thigh:N('thigh_'+s),knee:N('knee_'+s),ankle:N('ankle_'+s),sd};});e.gp=0;}
  /* each enemy gets its own copy of the armour material so it can flash when hit */
  e.mat=EMAT.egrey.clone();e.mat.onBeforeCompile=EMAT.egrey.onBeforeCompile;e.mat.customProgramCacheKey=EMAT.egrey.customProgramCacheKey;
  o.traverse(m=>{if(m.isMesh&&m.material===EMAT.egrey)m.material=e.mat;});
  o.scale.setScalar(d.sc||1);o.position.set(x,e.y,z);o.visible=false;S.add(o);EN.push(e);
  return e;}
/* waves arrive in front of the player, 55-80 m ahead, with a red beacon first */
const WAVES=[{skitter:4},{skitter:6,hound:1},{hound:2,skitter:4},{gunner:1,skitter:4},{gunner:2,hound:2},{gunner:2,hound:2,skitter:6}];
const BEACONS=[];
function spawnSpot(){const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  for(let tries=0;tries<40;tries++){const a=(Math.random()-.5)*1.2,d=55+Math.random()*25,ca=Math.cos(a),sa=Math.sin(a);
    const B=BND(),dx=fx*ca-fz*sa,dz=fx*sa+fz*ca,x=clamp(P.x+dx*d,B.x0+4,B.x1-4),z=clamp(P.z+dz*d,B.z0+4,B.z1-4);
    if(Math.hypot(x-P.x,z-P.z)<35)continue;const k=navCell(x,z);if(k<0||NAV.block[k])continue;return [x,z];}
  const B=BND();return [clamp(P.x-Math.sin(P.yaw)*60,B.x0+4,B.x1-4),clamp(P.z-Math.cos(P.yaw)*60,B.z0+4,B.z1-4)];}
function startWave(){
  const w=WAVES[G.wave%WAVES.length];G.hpK=1+Math.floor(G.wave/WAVES.length)*.3;G.wave++;
  HUD.banner('WAVE '+G.wave);
  for(const id in w){const [cx,cz]=spawnSpot();BEACONS.push({x:cx,z:cz,t:1.3});
    for(let i=0;i<w[id];i++){const a=Math.random()*TAU,r=Math.random()*(id==='skitter'?6:4)+(i?2:0);let x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      const cl=collide(x,z,EDEF[id].r);spawnEnemy(id,cl[0],cl[1]);}}
}
/* ---- damage ---- */
function hurtEnemy(e,dmg,x,y,z){if(e.dead)return;e.hp-=dmg;e.flash=1;if(e.hp<=0)killEnemy(e);}
function killEnemy(e){e.dead=true;S.remove(e.o);e.mat.dispose();
  boom(e.x,e.y+e.d.cy,e.z,e.id==='skitter'?.7:e.id==='hound'?1.1:1.5);
  const now=G.t;G.combo=now-G.lastKill<3?G.combo+1:1;G.lastKill=now;const mult=Math.min(3,1+.25*(G.combo-1));
  addScore(Math.round(e.d.score*mult*(G.hpK||1)));G.kills++;
  if(Math.random()<e.d.drop)dropPickup(e.x,e.z,e.id==='gunner'&&Math.random()<.55?'chip':null);
}
function hurtPlayer(dmg,fx,fz){if(P.dead||G.mode!=='play'&&G.mode!=='demo')return;P.regenT=3;
  const s=Math.min(P.shield,dmg);P.shield-=s;dmg-=s;if(s>0){sShield();HUD.hit(fx,fz,'s');}
  if(dmg>0){P.hull-=dmg;sHurt();HUD.hit(fx,fz,'h');CAMS.shake=Math.max(CAMS.shake,.3+dmg*.02);}
  if(P.hull<=0){P.hull=0;playerDown();}}
function addScore(n){G.score+=n;ARC.score(G.score);}
/* ---- pickups: chip (gun tier), repair, shield, missiles, fuel ---- */
const PK=[],PKDEF={chip:{col:[1,.85,.2],name:'GUN TIER'},repair:{col:[.35,1,.45],name:'REPAIR'},shield:{col:[.4,.7,1],name:'SHIELD'},
  missile:{col:[1,.5,.2],name:'MISSILES'},fuel:{col:[.92,.95,1],name:'JET FUEL'}};
let PKG=null,PKB=null;
function dropPickup(x,z,kind){
  if(!kind){const r=Math.random();kind=r<.34?'chip':r<.58?'repair':r<.76?'missile':r<.9?'fuel':'shield';}
  if(kind==='chip'&&GUN.tier>=4)kind='missile';
  if(!PKG){PKG=new THREE.OctahedronGeometry(.55,0);PKB=new THREE.CylinderGeometry(.08,.08,14,6,1,true);PKB.translate(0,7,0);}
  const c=new THREE.Color(...PKDEF[kind].col),gem=new THREE.Mesh(PKG,new THREE.MeshBasicMaterial({color:c.clone().multiplyScalar(2.4)}));
  const beam=new THREE.Mesh(PKB,new THREE.MeshBasicMaterial({color:c.clone().multiplyScalar(.9),transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));
  const g=new THREE.Group();g.add(gem,beam);const cl=collide(x,z,.8);g.position.set(cl[0],hgt(cl[0],cl[1]),cl[1]);S.add(g);
  PK.push({kind,g,gem,beam,x:cl[0],z:cl[1],t:0,life:28});}
function updPickups(dt){for(let i=PK.length-1;i>=0;i--){const p=PK[i];p.t+=dt;p.gem.rotation.y+=dt*2.4;p.gem.position.y=1.4+Math.sin(p.t*3)*.25;
  p.g.visible=p.life-p.t>5||Math.sin(p.t*18)>0;
  if(!P.dead&&Math.hypot(P.x-p.x,P.z-p.z)<3.4){collect(p.kind);S.remove(p.g);PK.splice(i,1);continue;}
  if(p.t>p.life){S.remove(p.g);PK.splice(i,1);}}}
function collect(k){sPickup();
  if(k==='chip'){GUN.tier=Math.min(4,GUN.tier+1);HUD.msg('GUN TIER '+['','I','II','III','IV'][GUN.tier],1.6);}
  else if(k==='repair'){P.hull=Math.min(P.hullMax,P.hull+35);HUD.msg('REPAIR +35',1.2);}
  else if(k==='shield'){P.shield=P.shieldMax;HUD.msg('SHIELD FULL',1.2);}
  else if(k==='missile'){MSL.ammo=Math.min(MSL.max,MSL.ammo+6);HUD.msg('MISSILES +6',1.2);}
  else {P.fuel=P.cells;HUD.msg('JET FUEL FULL',1.2);}
  addScore(25);}
/* ---- enemy brains ---- */
function updEnemies(dt){
  NAV.t-=dt;if(NAV.t<=0||navCell(P.x,P.z)!==NAV.pc){navBuild();NAV.t=.5;}
  for(let i=BEACONS.length-1;i>=0;i--){const b=BEACONS[i];b.t-=dt;if(Math.random()<dt*30)part({x:b.x+(Math.random()-.5)*2,y:hgt(b.x,b.z)+.3,z:b.z+(Math.random()-.5)*2,vx:0,vy:8+Math.random()*6,vz:0,life:.5,s0:.9,s1:.3,a:1.4,col:[1,.2,.08],glow:true});if(b.t<=0)BEACONS.splice(i,1);}
  let alive=0;
  for(const e of EN){if(e.dead)continue;alive++;
    if(e.spawnT>0){e.spawnT-=dt;if(e.spawnT<=0){e.o.visible=true;dustPuff(e.x,e.z,8,e.d.r*.8);}continue;}
    e.t+=dt;e.cd-=dt;e.flash=Math.max(0,e.flash-dt*7);e.mat.emissive.setRGB(e.flash*1.4,e.flash*.5,e.flash*.3);
    const dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz)||1,face=Math.atan2(-dx,-dz);let mvx=0,mvz=0,sp=e.d.speed,want=face;
    if(e.id==='skitter'){
      if(dist>2.8){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];want=Math.atan2(-mvx,-mvz);
        const s=Math.sin(e.t*3+e.phase)*.5;mvx+=-nd[1]*s;mvz+=nd[0]*s;}
      else if(e.cd<=0&&!P.dead){e.cd=1;hurtPlayer(4,e.x,e.z);sZap();sparks(lerp(e.x,P.x,.6),e.y+1.2,lerp(e.z,P.z,.6),6,[.6,.85,1]);}
    }else if(e.id==='hound'){
      if(e.st==='move'){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];want=Math.atan2(-mvx,-mvz);if(dist<20&&dist>6&&e.cd<=0&&los(e.x,e.z)){e.st='aim';e.t=0;}}
      else if(e.st==='aim'){sp=0;want=face;if(e.t>.75){e.st='charge';e.t=0;e.cx=dx/dist;e.cz=dz/dist;sHowl();}}
      else if(e.st==='charge'){mvx=e.cx;mvz=e.cz;sp=26;want=Math.atan2(-mvx,-mvz);
        if(!P.dead&&dist<e.d.r+RAD+.4&&P.y-hgt(P.x,P.z)<1.6&&!e.hitDone){e.hitDone=true;hurtPlayer(18,e.x,e.z);P.vx+=e.cx*9;P.vz+=e.cz*9;}
        if(e.t>1.1){e.st='rest';e.t=0;e.hitDone=false;}}
      else{sp=1.5;mvx=dx/dist;mvz=dz/dist;if(e.t>1.3){e.st='move';e.cd=1.2+Math.random();}}
    }else{/* gunner: hold 24-42 m, strafe, shoot bursts when it can see you */
      const seen=los(e.x,e.z);e.strT-=dt;if(e.strT<=0){e.strafe*=-1;e.strT=2+Math.random()*2.5;}
      if(dist>42||!seen){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];}
      else if(dist<24){mvx=-dx/dist;mvz=-dz/dist;}
      else{mvx=-dz/dist*e.strafe;mvz=dx/dist*e.strafe;sp*=.7;}
      want=face;
      if(seen&&dist<55&&e.cd<=0&&!P.dead){e.burst=3;e.cd=2.4+Math.random();e.bt=0;}
      if(e.burst>0){e.bt-=dt;if(e.bt<=0){e.bt=.18;e.burst--;const mz=e.burst%2?e.mzR:e.mzL;mz.getWorldPosition(_w);
        const lead=dist/30*.6,tx=P.x+P.vx*lead,ty=P.y+3.2,tz=P.z+P.vz*lead;let ax=tx-_w.x,ay=ty-_w.y,az=tz-_w.z;const l=Math.hypot(ax,ay,az)||1;
        EBOLTS.push({x:_w.x,y:_w.y,z:_w.z,vx:ax/l*30,vy:ay/l*30,vz:az/l*30,life:2.4,dmg:8});sEShot();part({x:_w.x,y:_w.y,z:_w.z,vx:0,vy:0,vz:0,life:.08,s0:1.2,s1:.5,a:2,col:[1,.3,.1],glow:true});}}
    }
    /* move with separation from other machines, trunk collisions and knockback */
    for(const o of EN){if(o===e||o.dead||o.spawnT>0)continue;const ox=e.x-o.x,oz=e.z-o.z,rr=e.d.r+o.d.r,d2=ox*ox+oz*oz;if(d2<rr*rr&&d2>1e-4){const d=Math.sqrt(d2);mvx+=ox/d*(rr-d)/rr*1.5;mvz+=oz/d*(rr-d)/rr*1.5;}}
    if(dist<e.d.r+RAD&&!(e.st==='charge')){mvx-=dx/dist;mvz-=dz/dist;}
    e.vx+=(mvx*sp-e.vx)*damp(6,dt);e.vz+=(mvz*sp-e.vz)*damp(6,dt);
    let nx=e.x+(e.vx+e.kx)*dt,nz=e.z+(e.vz+e.kz)*dt;e.kx*=Math.exp(-dt*4);e.kz*=Math.exp(-dt*4);
    const c=collide(nx,nz,e.d.r),B=BND();e.x=clamp(c[0],B.x0,B.x1);e.z=clamp(c[1],B.z0,B.z1);e.y=hgt(e.x,e.z);
    e.yaw+=clamp(angD(want,e.yaw),-dt*(e.st==='aim'?6:4),dt*(e.st==='aim'?6:4));
    poseEnemy(e,dt,Math.hypot(e.vx,e.vz));
  }
  for(let i=EN.length-1;i>=0;i--)if(EN[i].dead)EN.splice(i,1);
  if(G.mode==='play'&&!P.dead&&!MISSION){if(alive===0&&BEACONS.length===0){G.breakT-=dt;if(G.breakT<=0){startWave();G.breakT=4;}}}
}
function poseEnemy(e,dt,sp){
  e.o.position.set(e.x,e.y,e.z);e.o.rotation.y=e.yaw;e.phase+=dt*(1.2+sp*(e.id==='skitter'?.9:e.id==='hound'?.42:.5));const ph=e.phase;
  if(e.id==='skitter'){e.body.position.y=.95+Math.abs(Math.sin(ph*2))*.08;e.legs.forEach((L,i)=>{const s=(i===0||i===3)?1:-1;L.rotation.y=Math.sin(ph*2)*.35*s*Math.min(1,sp/3);L.rotation.x=Math.max(0,Math.cos(ph*2)*s)*.25*Math.min(1,sp/3);});}
  else if(e.id==='hound'){const run=Math.min(1,sp/6),aim=e.st==='aim'?1:0;e.body.position.y=1.75-aim*.35+Math.sin(ph*2)*.08*run;e.body.rotation.x=aim*.12;
    e.legs.forEach((L,i)=>{const o=i<2?0:Math.PI*.9,s=Math.sin(ph*2+o+(i%2)*.4);L.up.rotation.x=s*.65*run-aim*.3;L.kn.rotation.x=(i<2?-.35:.35)+Math.cos(ph*2+o)*.4*run;});
    EMAT.ered.color.setRGB(1,.14,.06).multiplyScalar(3.4);}
  else{const run=Math.min(1,sp/4);e.gp+=dt*sp/1.6;e.hips.position.y=1.9-Math.abs(Math.sin(e.gp*TAU))*.07*run;e.torso.position.y=e.hips.position.y;
    e.legs.forEach(L=>{let u=(e.gp+(L.sd>0?.5:0))%1;let tz=0,lift=0;const S_=1.2*run;if(u<.5)tz=lerp(-S_/2,S_/2,u/.5);else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s);lift=Math.sin(Math.PI*s)*.35*run;}
      legIK(L,-(1.85-.25-lift),tz,0,1,1,false);   /* gunner knees bend forward */});
    e.armR.rotation.x=e.armL.rotation.x=Math.atan2(P.y+2.6-(e.y+2.85),Math.hypot(P.x-e.x,P.z-e.z))*.9;}
}

/* ---- 06d_missions.js ---- */
/* ===================== missions: steps (destroy / reach / clear / hold), checkpoints, radio, results =====================
   ?mission=N loads that mission's map and look. Without it the game is the endless sandbox. Progress: hd-ironhowl3-save. */
const NIGHT_DOCKS={sun:[-.3,.55,.45],sunCol:0x9fb4ff,sunK:.7,sky:0x3a4668,ground:0x141820,hemiK:1.0,zen:0x04070f,hor:0x1c2846,fog:0x0e1626,clouds:.15,
  pano:'31-docks-night-sky',panoK:.9,ring:{tex:'33-harbor-skyline',h:60,lift:-8,tint:[1,1,1],copies:3},exp:1.45,night:true};
const DUSK_FIELD={sun:[-.82,.16,-.3],sunCol:0xff8a50,sunK:2.4,sky:0x9a86b4,ground:0x4a3a30,hemiK:1.3,zen:0x22305c,hor:0xf09468,fog:0xb88078,clouds:.85,pano:null,
  ring:{tex:'70-distant-hills',h:70,lift:-10,tint:[.55,.45,.55],copies:3},exp:1.2};
const MISSIONS=[
  {id:1,name:'SUNLINE',map:'field',start:[0,115,0],
   brief:['FORGE steers its machines through the farm radio masts.','Knock out all three, then meet Rook at the truck by the barn.'],
   steps:[{t:'destroy',label:'DESTROY THE RELAY MASTS',masts:[2],wave:{skitter:4},radio:[['ROOK','Masts first. Then we talk about the big one.'],['ROOK','Left thumb to move, right thumb to aim. JET if they swarm you.']]},
          {t:'destroy',label:'DESTROY THE RELAY MASTS',masts:[0],wave:{skitter:5,gunner:1},cp:1,radio:[['FORGE','UNIT 07. YOU ARE OBSOLETE.'],['ROOK','Gunners keep their distance. Close in or hop around them.']]},
          {t:'destroy',label:'DESTROY THE RELAY MASTS',masts:[1],wave:{skitter:5,gunner:2},cp:1,radio:[['ROOK','Last mast. Tip: SALVO clears whatever is at your feet.']]},
          {t:'reach',label:'MEET ROOK AT THE TRUCK',at:[47,30],r:13,truck:1,radio:[['ROOK','That is the lot. Truck is by the barn.']]}]},
  {id:2,name:'NIGHT SHIFT',map:'docks',look:NIGHT_DOCKS,start:[9,88,0],
   brief:['Harbor 9, midnight. FORGE runs the container yard now.','Get through the lanes and cut the gate controls on the quay.'],
   steps:[{t:'reach',label:'GET INTO THE YARD',at:[9,28],r:10,wave:{skitter:5},radio:[['ROOK','Stay in the lanes. The stacks are too tall to hop.']]},
          {t:'clear',label:'CLEAR THE CROSSING',wave:{skitter:6,gunner:1},at:[9,28],cp:1,radio:[['FORGE','THE HARBOR IS MINE. LEAVE.']]},
          {t:'destroy',label:'DESTROY THE GATE CONTROLS',consoles:[[-25,-88],[43,-88]],wave:{gunner:2,skitter:4},cp:1,radio:[['ROOK','Two control boxes on the quay, red lights. Burn them.']]},
          {t:'reach',label:'GET TO THE MIDDLE CRANE',at:[9,-84],r:12,wave:{hound:1,skitter:4},radio:[['ROOK','Gate is dead. Head for the crane, I will lift you out.']]}]},
  {id:3,name:'PINEWALL',map:'woods',start:[0,112,0],
   brief:['A salvage convoy went quiet in the pine woods.','Find it and guard Rook while she pulls the cores out.'],
   steps:[{t:'reach',label:'FIND THE CONVOY',at:[38,-18],r:16,wreck:1,wave:{skitter:4,hound:1},radio:[['ROOK','Convoy beacon is east of the trail. Watch the trees.'],['ROOK','Hounds charge in a straight line. Hop over them.']]},
          {t:'hold',label:'GUARD ROOK',at:[38,-18],r:24,time:60,every:15,waves:[{hound:2,skitter:3},{skitter:6},{gunner:1,hound:1,skitter:3},{hound:3}],cp:1,radio:[['ROOK','Got the cores. One minute. Keep them off me.'],['FORGE','I SEE YOU, ROOK.']]},
          {t:'reach',label:'REACH THE NORTH RIDGE',at:[-19,-118],r:16,wave:{gunner:1,hound:2},cp:1,radio:[['ROOK','Done. Meet me at the north ridge.']]}]},
  {id:4,name:'HOLD THE FARM',map:'field',look:DUSK_FIELD,start:[0,115,0],
   brief:['Dusk. A storm and a FORGE column are both heading for the farm.','Hold the farmhouse relay until Rook finishes the upload.'],
   steps:[{t:'reach',label:'GET TO THE FARMHOUSE',at:[41,62],r:16,radio:[['ROOK','Storm is coming in. So is FORGE.']]},
          {t:'hold',label:'DEFEND THE FARMHOUSE',at:[45,52],r:34,time:150,every:16,waves:[{skitter:6},{hound:2,skitter:4},{gunner:2,skitter:3},{gunner:1,hound:2,skitter:4},{gunner:2,hound:2},{gunner:3,skitter:6}],cp:1,
           radio:[['ROOK','Two and a half minutes. Stay near the house.'],['FORGE','THE FIELDS BELONG TO THE FACTORY.']]}]},
];
const MID=parseInt(Q.get('mission')||'0',10),MISSION=MISSIONS.find(m=>m.id===MID)||null;
const MS={step:-1,t:0,waveT:0,wi:0,hold:0,repairs:3,cp:null,kills0:0,time:0,done:false,objs:[],truck:null,zone:null};
const SAVE={get(){try{return JSON.parse(store.get('save','{}'))||{};}catch(e){return {};}},put(o){store.set('save',JSON.stringify(o));}};
function unlocked(){return Math.max(1,SAVE.get().unlocked||1);}
/* ---- destructible objectives: radio masts (built by the field map), gate control boxes (made here) ---- */
const TARGETS=[];
function addTarget(o){o.hp=o.hpMax;o.dead=false;TARGETS.push(o);return o;}
function hitTargets(x0,y0,z0,x1,y1,z1){for(const t of TARGETS){if(t.dead)continue;for(const s of t.spheres){if(segSphere(x0,y0,z0,x1,y1,z1,s[0],s[1],s[2],s[3])>=0)return t;}}return null;}
function hurtTarget(t,d){if(t.dead)return;t.hp-=d;t.flash=1;if(t.hp<=0){t.dead=true;boom(t.x,t.y+3,t.z,1.8);setTimeout(()=>boom(t.x+1,t.y+6,t.z,1.2),250);addScore(300);if(t.die)t.die();}}
function makeConsole(x,z){const y=hgt(x,z),g=new THREE.Group();g.position.set(x,y,z);
  const body=new THREE.Mesh(sbox(2.6,3.2,1.8),tmat('12-rusted-steel-plate',{rep:[2,2]}));body.position.y=1.6;body.castShadow=body.receiveShadow=true;g.add(body);
  const lamp=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.12,.05).multiplyScalar(4)});
  for(const dx of [-.7,0,.7]){const l=new THREE.Mesh(new THREE.BoxGeometry(.4,.25,.1),lamp);l.position.set(dx,2.6,.92);g.add(l);}
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,3,6),tmat('25-brushed-steel'));ant.position.set(.9,4.6,0);g.add(ant);S.add(g);
  return addTarget({x,z,y,hpMax:170,spheres:[[x,y+1.6,z,1.9]],obj:g,die(){g.rotation.z=.5;g.position.y-=.8;lamp.color.setRGB(.15,.02,.01);}});}
function mastTarget(i){const m=MAPS.field.mastObjs[i];return addTarget({x:m.x,z:m.z,y:m.y,hpMax:260,spheres:[[m.x,m.y+3,m.z,2.4],[m.x,m.y+8,m.z,2],[m.x,m.y+13,m.z,1.6]],obj:m.tower,
  die(){m.fall=1;m.lamp.material.color.setRGB(.1,.02,.01);}});}
/* Rook's truck: a quick boxy stand-in (the real model comes with the escort mission) */
function makeTruck(x,z,yaw,burnt){const g=new THREE.Group(),y=hgt(x,z);g.position.set(x,y,z);g.rotation.y=yaw||0;
  const body=burnt?tmat('12-rusted-steel-plate',{col:0x3a3330}):tmat('53-howler-armour-large-plates',{rep:[1,1]}),dark=tmat('24-gunmetal',{col:burnt?0x222222:0x666a70});
  const add=(geo,m,px,py,pz)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.castShadow=o.receiveShadow=true;g.add(o);};
  add(new THREE.BoxGeometry(2.6,2.2,2.4),body,0,2.1,2.6);add(new THREE.BoxGeometry(2.7,1.2,5.2),dark,0,1.5,-1.2);add(new THREE.BoxGeometry(2.4,.9,4.8),body,0,2.5,-1.2);
  const wg=new THREE.CylinderGeometry(.62,.62,.5,14);wg.rotateZ(Math.PI/2);for(const wz of [2.6,-.4,-2.6])for(const wx of [-1.35,1.35])add(wg,tmat('57-rubber-and-cables'),wx,.62,wz);
  add(new THREE.BoxGeometry(.3,2.6,.3),dark,.8,3.6,-2.8);S.add(g);addBox(x-2.5,z-4.5,x+2.5,z+4.5,3.5);return g;}
/* a soft ring on the ground showing where to stand (hold steps) or go (reach steps) */
function zoneRing(x,z,r,col){const g=new THREE.RingGeometry(r-.5,r,64);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:new THREE.Color(...col),transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.set(x,hgt(x,z)+.25,z);m.renderOrder=3;S.add(m);return m;}
/* ---- radio strip ---- */
const RADIO=[];let radioT=0;
function radio(lines){for(const l of lines)RADIO.push(l);}
function updRadio(dt){radioT-=dt;if(radioT<=0){const el=$('radio');if(RADIO.length){const [who,txt]=RADIO.shift();el.innerHTML='<b class="'+(who==='FORGE'?'fg':'rk')+'">'+who+'</b> '+txt;el.style.opacity=1;radioT=3.8;if(who==='FORGE')sEShot();else sClick();}else if(el.style.opacity!=='0'){el.style.opacity=0;}}}
/* ---- running a mission ---- */
function spawnGroup(def,cx,cz,ring){for(const id in def){let x=cx,z=cz;
    for(let k=0;k<30;k++){const a=Math.random()*TAU,d=(ring||[12,26]);x=cx+Math.cos(a)*(d[0]+Math.random()*(d[1]-d[0]));z=cz+Math.sin(a)*(d[0]+Math.random()*(d[1]-d[0]));const B=BND();x=clamp(x,B.x0+4,B.x1-4);z=clamp(z,B.z0+4,B.z1-4);
      const c=navCell(x,z);if(c>=0&&!NAV.block[c]&&Math.hypot(x-P.x,z-P.z)>30)break;}
    BEACONS.push({x,z,t:1.3});for(let i=0;i<def[id];i++){const a=Math.random()*TAU,r=Math.random()*5+(i?2:0),c=collide(x+Math.cos(a)*r,z+Math.sin(a)*r,EDEF[id].r);spawnEnemy(id,c[0],c[1]);}}}
function stepPos(s){if(s.masts)return MAPS.field.mastObjs[s.masts[0]];if(s.consoles){const live=MS.objs.find(t=>!t.dead);return live||{x:s.consoles[0][0],z:s.consoles[0][1]};}if(s.at)return {x:s.at[0],z:s.at[1]};return null;}
function beginStep(i){
  MS.step=i;MS.t=0;MS.wi=0;MS.waveT=4;MS.hold=0;MS.objs=[];const s=MISSION.steps[i];if(!s)return finishMission(true);
  if(MS.zone){S.remove(MS.zone);MS.zone=null;}
  if(s.cp)MS.cp={step:i,x:P.x,z:P.z,yaw:P.yaw,tier:GUN.tier};
  if(s.masts)MS.objs=s.masts.map(mastTarget);
  if(s.consoles)MS.objs=s.consoles.map(c=>makeConsole(c[0],c[1]));
  if(s.truck&&!MS.truck)MS.truck=makeTruck(s.at[0],s.at[1],-.6);
  if(s.wreck&&!MS.wreck){MS.wreck=[makeTruck(s.at[0]+4,s.at[1]-3,.9,1),makeTruck(s.at[0]-6,s.at[1]+5,2.4,1)];}
  if(s.t==='hold'||s.t==='reach')MS.zone=zoneRing(s.at[0],s.at[1],s.r,s.t==='hold'?[1,.6,.2]:[.4,.9,1]);
  if(s.wave){const p=stepPos(s)||{x:P.x-Math.sin(P.yaw)*60,z:P.z-Math.cos(P.yaw)*60};spawnGroup(s.wave,p.x,p.z,s.t==='clear'?[8,22]:[10,26]);}
  if(s.radio)radio(s.radio);
  HUD.banner(s.label);if(i>0&&s.cp){HUD.msg('CHECKPOINT',1.6);sPickup();}
}
function updMission(dt){
  if(!MISSION||G.mode!=='play'||MS.done)return;
  MS.t+=dt;MS.time+=dt;const s=MISSION.steps[MS.step];if(!s)return;
  for(const m of MAPS.field.mastObjs||[])if(m.fall&&m.fall<90){m.fall+=dt*60;m.tower.rotation.z=Math.min(1.5,(m.fall/60)*(m.fall/60)*1.5);}
  let txt=s.label,ok=false;
  if(s.t==='destroy'){const left=MS.objs.filter(t=>!t.dead).length;txt+=' '+(MS.objs.length-left)+'/'+MS.objs.length;
    if(s.masts){const all=MISSION.steps.filter(q=>q.masts).length,doneN=MISSION.steps.indexOf(s);txt=s.label+' '+(doneN+(left?0:1))+'/'+all;}ok=left===0;}
  else if(s.t==='reach'){ok=Math.hypot(P.x-s.at[0],P.z-s.at[1])<s.r;}
  else if(s.t==='clear'){ok=MS.t>3&&EN.filter(e=>!e.dead).length===0&&BEACONS.length===0;}
  else if(s.t==='hold'){const inside=Math.hypot(P.x-s.at[0],P.z-s.at[1])<s.r;if(inside)MS.hold+=dt;const left=Math.max(0,s.time-MS.hold);
    txt+=' '+Math.floor(left/60)+':'+String(Math.floor(left%60)).padStart(2,'0')+(inside?'':' · GET BACK IN THE RING');
    MS.waveT-=dt;if(MS.waveT<=0&&left>0){MS.waveT=s.every;const w=s.waves[MS.wi%s.waves.length];MS.wi++;const a=Math.random()*TAU;spawnGroup(w,s.at[0]+Math.cos(a)*70,s.at[1]+Math.sin(a)*70,[0,14]);}
    ok=left<=0;}
  HUD.set('obj','text',txt);
  if(ok){addScore(500);beginStep(MS.step+1);}
}
function finishMission(won){if(MS.done)return;MS.done=true;G.mode='results';
  const time=MS.time|0,bonus=won?2000+Math.max(0,600-time)*5+MS.repairs*400:0;if(won)addScore(bonus);
  const sv=SAVE.get();sv.best=sv.best||{};if(won){sv.unlocked=Math.max(sv.unlocked||1,MISSION.id+1);}sv.best[MISSION.id]=Math.max(sv.best[MISSION.id]||0,G.score);SAVE.put(sv);
  const tickets=Math.min(80,Math.floor(G.score/400)+(won?10:0));ARC.over(G.score,tickets);
  $('rtitle').textContent=won?'MISSION COMPLETE':'MISSION FAILED';$('rtitle').className='logo'+(won?'':' bad');
  $('rstats').innerHTML=[['MISSION',MISSION.id+' · '+MISSION.name],['SCORE',G.score.toLocaleString('en-US')],['TIME',Math.floor(time/60)+':'+String(time%60).padStart(2,'0')],['KILLS',G.kills],['REPAIRS LEFT',MS.repairs],['TICKETS',tickets]].map(r=>'<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('');
  $('rnext').style.display=won&&MISSIONS.find(m=>m.id===MISSION.id+1)?'':'none';$('results').style.display='flex';jetLoop(0);
}
/* falling in a mission: repair at the last checkpoint (3 repairs per mission), then the mission is lost */
function missionDown(){if(MS.repairs<=0){setTimeout(()=>finishMission(false),2200);return false;}return true;}
function repairAtCheckpoint(){MS.repairs--;const cp=MS.cp||{step:0,x:MISSION.start[0],z:MISSION.start[1],yaw:MISSION.start[2],tier:GUN.base};
  clearFight();P=mkPlayer();P.x=cp.x;P.z=cp.z;P.y=hgt(cp.x,cp.z);P.yaw=P.legYaw=cp.yaw;CAMS.ready=false;if(M)M.root.visible=true;
  GUN.tier=Math.max(GUN.base,(cp.tier||1)-1);GUN.heat=0;GUN.over=false;$('down').style.display='none';G.mode='play';
  for(const t of MS.objs)if(!t.dead){t.hp=t.hpMax;}beginStep(cp.step);HUD.msg('REPAIRED · '+MS.repairs+' LEFT',2);}
function startMission(){MS.done=false;MS.repairs=3;MS.cp=null;MS.time=0;RADIO.length=0;P.x=MISSION.start[0];P.z=MISSION.start[1];P.y=hgt(P.x,P.z);P.yaw=P.legYaw=MISSION.start[2];CAMS.ready=false;beginStep(0);}
/* mission list on the title screen */
function missionMenu(){const box=$('mlist'),u=unlocked(),best=SAVE.get().best||{};
  box.querySelector('.cards').innerHTML=MISSIONS.map(m=>{const lock=m.id>u;return '<button class="mcard'+(lock?' lock':'')+'" data-id="'+m.id+'"'+(lock?' disabled':'')+'><b>'+m.id+' · '+m.name+'</b><span>'+
    (lock?'LOCKED':MAPS[m.map].name+(m.look===NIGHT_DOCKS?' · NIGHT':m.look===DUSK_FIELD?' · DUSK':'')+(best[m.id]?' · BEST '+best[m.id].toLocaleString('en-US'):''))+'</span></button>';}).join('');
  box.querySelectorAll('.mcard').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.set('mission',b.dataset.id);q.delete('map');location.search=q.toString();}));
  box.style.display='flex';}

/* ---- 07_fx.js ---- */
/* ===================== particles: one system, smoke blends normally, glow adds light (premultiplied alpha) ===================== */
const PFX={max:900,list:[],mesh:null};
function buildFX(){
  const base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();
  g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
  const n=PFX.max;PFX.iP=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);PFX.iS=new THREE.InstancedBufferAttribute(new Float32Array(n*4),4);PFX.iC=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);
  for(const a of [PFX.iP,PFX.iS,PFX.iC])a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iP',PFX.iP);g.setAttribute('iS',PFX.iS);g.setAttribute('iC',PFX.iC);g.instanceCount=0;
  const m=new THREE.ShaderMaterial({uniforms:{tSmoke:{value:tex('37-smoke-puff',{clamp:true})}},transparent:true,depthWrite:false,
    blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
    vertexShader:`attribute vec3 iP;attribute vec4 iS;attribute vec3 iC;varying vec2 vUv;varying vec4 vS;varying vec3 vC;
      void main(){vUv=uv;vS=iS;vC=iC;float c=cos(iS.y),s=sin(iS.y);vec2 q=vec2(c*position.x-s*position.y,s*position.x+c*position.y)*iS.x;
        vec4 mv=viewMatrix*vec4(iP,1.);mv.xy+=q;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D tSmoke;varying vec2 vUv;varying vec4 vS;varying vec3 vC;
      void main(){if(vS.w<.5){float t=texture2D(tSmoke,vUv).r;float a=smoothstep(.04,.6,t)*vS.z;gl_FragColor=vec4(vC*(.6+.5*t)*a,a);}
        else{float r=length(vUv-.5)*2.;float gl=pow(max(0.,1.-r),2.2);gl_FragColor=vec4(vC*gl*vS.z,0.);}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  PFX.mesh=new THREE.Mesh(g,m);PFX.mesh.frustumCulled=false;PFX.mesh.renderOrder=5;S.add(PFX.mesh);
}
/* o: {x,y,z, vx,vy,vz, life, s0,s1 (size start/end), a (alpha), col [r,g,b], glow (bool), drag, grav, vr} */
function part(o){if(PFX.list.length>=PFX.max)PFX.list.shift();o.t=0;o.rot=Math.random()*TAU;o.vr=o.vr==null?(Math.random()-.5)*1.2:o.vr;PFX.list.push(o);}
const DUST=[.5,.43,.33],SMOKE=[.55,.55,.57];
function dustPuff(x,z,n,k){const y=hgt(x,z)+.2;for(let i=0;i<n;i++){const a=Math.random()*TAU,s=(1.5+Math.random()*2.5)*k;
  part({x:x+Math.cos(a)*.6,y,z:z+Math.sin(a)*.6,vx:Math.cos(a)*s,vy:.4+Math.random()*.9*k,vz:Math.sin(a)*s,life:1.1+Math.random()*.9,s0:.9*k,s1:3.2*k,a:.38,col:DUST,drag:2.2,grav:-.1});}}
function updFX(dt){
  const L=PFX.list;let n=0;const P_=PFX.iP.array,S_=PFX.iS.array,C_=PFX.iC.array;
  for(let i=L.length-1;i>=0;i--){const p=L[i];p.t+=dt;if(p.t>=p.life){L.splice(i,1);continue;}}
  for(const p of L){const dr=Math.exp(-(p.drag||0)*dt);p.vx*=dr;p.vy*=dr;p.vz*=dr;p.vy-=(p.grav||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rot+=p.vr*dt;
    const f=p.t/p.life,s=lerp(p.s0,p.s1,Math.sqrt(f)),a=p.a*(p.glow?(1-f):Math.min(1,f*6)*(1-f)*(1-f));
    P_[n*3]=p.x;P_[n*3+1]=p.y;P_[n*3+2]=p.z;S_[n*4]=s;S_[n*4+1]=p.rot;S_[n*4+2]=a;S_[n*4+3]=p.glow?1:0;C_[n*3]=p.col[0];C_[n*3+1]=p.col[1];C_[n*3+2]=p.col[2];n++;}
  PFX.mesh.geometry.instanceCount=n;PFX.iP.needsUpdate=PFX.iS.needsUpdate=PFX.iC.needsUpdate=true;
}
/* ===================== sound (all made on the fly, nothing to download) ===================== */
const AU={c:null,out:null,nb:null,jet:null,jetF:null,wind:null};
function audioInit(){
  if(AU.c){if(AU.c.state==='suspended')AU.c.resume();return;}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=AU.c=new C();
  AU.out=c.createGain();const comp=c.createDynamicsCompressor();AU.out.connect(comp);comp.connect(c.destination);setVolume();
  const nb=AU.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b=b*.97+w*.03;d[i]=w*.6+b*3;}
  const loop=(freq,type)=>{const s=c.createBufferSource();s.buffer=nb;s.loop=true;const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=c.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AU.out);s.start();return {f,g};};
  const j=loop(600,'lowpass');AU.jet=j.g;AU.jetF=j.f;const w=loop(380,'lowpass');AU.wind=w.g;w.g.gain.value=.05;
}
function setVolume(){if(AU.out)AU.out.gain.value=(!SET.sound||ARC.muted||G.paused)?0:.75;}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0005,t+a+dec);}
function thump(f0,f1,dur,vol,nf,nv){const c=AU.c;if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  o.connect(g);g.connect(AU.out);env(g,t,.008,vol,dur);o.start(t);o.stop(t+dur+.05);
  if(nv){const s=c.createBufferSource();s.buffer=AU.nb;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=nf;const h=c.createGain();s.connect(f);f.connect(h);h.connect(AU.out);env(h,t,.005,nv,dur*.7);s.start(t,Math.random());s.stop(t+dur);}}
function sStep(k){thump(78,36,.22,.42*k,420,.22*k);}
function sLand(k){thump(70,26,.5,.8*k+.2,700,.5*k+.15);}
function sJet(){const c=AU.c;if(!c)return;const t=c.currentTime,s=c.createBufferSource();s.buffer=AU.nb;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=.8;
  f.frequency.setValueAtTime(380,t);f.frequency.exponentialRampToValueAtTime(1900,t+.35);const g=c.createGain();s.connect(f);f.connect(g);g.connect(AU.out);env(g,t,.02,.55,.6);s.start(t,Math.random());s.stop(t+.8);thump(90,40,.35,.35,0,0);}
function sClick(){const c=AU.c;if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=180;o.connect(g);g.connect(AU.out);env(g,t,.003,.08,.08);o.start(t);o.stop(t+.12);}
function sBird(){const c=AU.c;if(!c)return;let t=c.currentTime+.05;const f0=2400+Math.random()*1600,n=2+(Math.random()*3|0);
  for(let i=0;i<n;i++){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f0*1.35,t+.07);o.connect(g);g.connect(AU.out);env(g,t,.01,.035,.09);o.start(t);o.stop(t+.14);t+=.11+Math.random()*.06;}}
function jetLoop(th){if(!AU.jet)return;const t=AU.c.currentTime;AU.jet.gain.setTargetAtTime(th*.5,t,.05);AU.jetF.frequency.setTargetAtTime(350+th*1700,t,.05);}
/* combat sounds */
function nz(type,f0,f1,dur,vol,q){const c=AU.c;if(!c)return;const t=c.currentTime,s=c.createBufferSource();s.buffer=AU.nb;const f=c.createBiquadFilter();f.type=type;f.Q.value=q||1;
  f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=c.createGain();s.connect(f);f.connect(g);g.connect(AU.out);env(g,t,.004,vol,dur);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
function tone(type,f0,f1,dur,vol){const c=AU.c;if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);o.connect(g);g.connect(AU.out);env(g,t,.004,vol,dur);o.start(t);o.stop(t+dur+.05);}
function sGun(t){nz('bandpass',1800+t*200,500,.09,.32,.9);thump(150,60,.08,.28,0,0);}
function sOver(){tone('square',880,440,.25,.08);setTimeout(()=>tone('square',880,440,.25,.08),280);}
function sVent(){nz('highpass',2500,900,1.1,.5,.7);thump(60,40,.3,.3,0,0);}
function sMissile(){nz('bandpass',600,2400,.5,.4,1.2);}
function sBoom(k){thump(80,24,.6+k*.3,.55+k*.3,900,.55*k+.2);}
function sShield(){tone('sine',1400,700,.12,.12);}
function sHurt(){nz('lowpass',900,200,.25,.45,1);thump(90,40,.2,.3,0,0);}
function sPickup(){tone('triangle',660,1320,.18,.14);setTimeout(()=>tone('triangle',990,1980,.16,.1),90);}
function sZap(){nz('bandpass',3000,1200,.12,.18,4);}
function sHowl(){tone('sawtooth',220,520,.45,.09);}
function sEShot(){nz('bandpass',900,300,.14,.22,1.5);tone('square',300,120,.12,.05);}

/* ---- 08_camera.js ---- */
/* ===================== follow cameras =====================
   close: just behind and above the head, so it feels like first person.
   far:   one mech height higher and further back, still looking along the mech over its neck (not down at the field). */
/* side: the camera sits a little to the right so the crosshair is never hidden behind the mech */
const VIEWS={close:{back:5.0,up:7.4,look:26,lookY:5.8,fov:64,side:1.3,pos:10},
             far:{back:14,up:10.9,look:24,lookY:6.2,fov:58,side:2.8,pos:6}};
const CAMS={x:0,y:0,z:0,ty:0,shake:0,fovK:0,blend:1,ready:false};
function camFov(base){/* portrait: open the view up so there is enough to see at the sides */const a=cam.aspect;return a>=1?base:Math.min(90,base+(1-a)*28);}
let CAMX=null;   /* test/showcase camera: {a (angle around the mech), d (distance), h (height), ly (look height)} */
function updCam(dt,p,view){
  if(CAMX){const a=p.yaw+CAMX.a;cam.position.set(p.x-Math.sin(a)*CAMX.d,p.y+CAMX.h,p.z-Math.cos(a)*CAMX.d);cam.lookAt(p.x,p.y+(CAMX.ly||3),p.z);if(cam.fov!==50){cam.fov=50;cam.updateProjectionMatrix();}SKY.position.copy(cam.position);return;}
  const V=VIEWS[view],fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw),sd=V.side*(cam.aspect<1?.45:1)+Math.max(0,-p.pitch-.2)*3;
  /* the body height follows the mech with a little lag in the air, so jet hops feel big */
  const by=p.y;CAMS.ty+=(by-CAMS.ty)*damp(p.air?(view==='close'?7:3.2):9,dt);if(!CAMS.ready){CAMS.ty=by;}
  /* portrait screens are narrow: step back a little so the mech does not fill them */
  const pt=Math.max(0,1-cam.aspect),back=V.back+pt*(view==='close'?2.2:3),up=V.up+pt*(view==='close'?.7:1.2);
  /* looking steeply down: slide the camera further right so you can see past the mech to your own feet */
  const down=Math.max(0,-p.pitch-.2);
  const pit=p.pitch;let tx=p.x-fx*back+rx*sd,tz=p.z-fz*back+rz*sd,ty=CAMS.ty+up-pit*(view==='close'?1.2:2.2);
  /* if a container or building sits between the mech and the camera, pull the camera in front of it */
  {const hx=p.x,hy=p.y+5,hz=p.z;for(let t=.15;t<=1.001;t+=.05){const x=lerp(hx,tx,t),y=lerp(hy,ty,t),z=lerp(hz,tz,t);if(boxAt(x,z,y+.6)){const k=Math.max(.1,t-.08);tx=lerp(hx,tx,k);ty=lerp(hy,ty,k)+(1-k)*1.5;tz=lerp(hz,tz,k);break;}}}
  if(!CAMS.ready){CAMS.x=tx;CAMS.y=ty;CAMS.z=tz;CAMS.ready=true;}
  const k=damp(V.pos,dt);CAMS.x+=(tx-CAMS.x)*k;CAMS.z+=(tz-CAMS.z)*k;CAMS.y+=(ty-CAMS.y)*k;
  const gy=hgt(CAMS.x,CAMS.z)+1.6;if(CAMS.y<gy)CAMS.y=gy;
  CAMS.shake=Math.max(0,CAMS.shake-dt*2.2);const sh=CAMS.shake*CAMS.shake*.35;
  cam.position.set(CAMS.x+(Math.random()-.5)*sh,CAMS.y+(Math.random()-.5)*sh,CAMS.z+(Math.random()-.5)*sh);
  const ly=CAMS.ty+V.lookY+Math.tan(pit)*V.look;
  cam.lookAt(p.x+fx*V.look+rx*sd,ly,p.z+fz*V.look+rz*sd);
  CAMS.fovK+=((p.air&&p.jetT<.5?1:0)-CAMS.fovK)*damp(4,dt);
  const f=camFov(V.fov)+CAMS.fovK*5;if(Math.abs(cam.fov-f)>.01){cam.fov=f;cam.updateProjectionMatrix();}
  SKY.position.copy(cam.position);
}

/* ---- 09_hud.js ---- */
/* ===================== HUD: kept small. Top left: shield, hull, jets, gun tier, missiles. Top middle: score. Crosshair with heat. ===================== */
const ROMAN=['','I','II','III','IV'];
const HUD={_c:{},
  load(p){const b=$('ldbar');if(b)b.style.width=Math.round(p*100)+'%';},
  stick(on,x,y,dx,dy){const s=$('stick');if(!on){s.style.display='none';return;}s.style.display='block';s.style.left=x+'px';s.style.top=y+'px';$('knob').style.transform='translate('+dx+'px,'+dy+'px)';},
  set(id,prop,v){const k=id+prop;if(this._c[k]===v)return;this._c[k]=v;const el=$(id);if(prop==='text')el.textContent=v;else if(prop==='cls')el.className=v;else el.style[prop]=v;},
  fuel(p){const el=$('fuel');if(!el)return;if(el.children.length!==p.cells){el.innerHTML='';for(let i=0;i<p.cells;i++){const c=document.createElement('i');c.appendChild(document.createElement('b'));el.appendChild(c);}}
    for(let i=0;i<p.cells;i++){const f=Math.round(clamp(p.fuel-i,0,1)*50)/50,c=el.children[i];if(c._f!==f){c._f=f;c.firstChild.style.width=(f*100)+'%';c.className=f>=1?'full':'';}}},
  flashFuel(){const el=$('fuel');el.classList.remove('no');void el.offsetWidth;el.classList.add('no');},
  view(v){$('bview').textContent=v==='close'?'CLOSE':'FAR';},
  hint(t,sec){const h=$('hint');h.textContent=t;h.style.opacity=t?1:0;clearTimeout(HUD._ht);if(t&&sec)HUD._ht=setTimeout(()=>h.style.opacity=0,sec*1000);},
  msg(t,sec){const h=$('msg');h.textContent=t;h.style.opacity=1;clearTimeout(HUD._mt);HUD._mt=setTimeout(()=>h.style.opacity=0,(sec||1.2)*1000);},
  banner(t){const h=$('banner');h.textContent=t;h.classList.remove('go');void h.offsetWidth;h.classList.add('go');},
  /* a red (hull) or blue (shield) arc at the screen edge pointing to whoever hit you */
  hit(fx,fz,kind){const a=Math.atan2(fx-P.x,fz-P.z),rel=angD(a,P.yaw+Math.PI);const d=$('dmg'+(HUD._di=(HUD._di+1||0)%4));
    d.className='dmg '+kind;d.style.transform='rotate('+(-rel)+'rad)';d.style.opacity=1;clearTimeout(d._t);d._t=setTimeout(()=>d.style.opacity=0,450);
    if(kind==='h'){const v=$('vig');v.style.opacity=.55;clearTimeout(v._t);v._t=setTimeout(()=>v.style.opacity=0,180);}},
  frame(){
    if(!P)return;
    this.set('bshield','width',(P.shield/P.shieldMax*100).toFixed(0)+'%');this.set('bhull','width',(P.hull/P.hullMax*100).toFixed(0)+'%');
    this.set('bhull','cls',P.hull<30?'low':'');
    this.set('gtier','text','GUN '+ROMAN[GUN.tier]);this.set('mslc','text','MSL '+MSL.ammo);this.set('bmsl','text','MSL '+MSL.ammo);
    this.set('score','text',G.score.toLocaleString('en-US'));if(!MISSION)this.set('obj','text','');const cm=G.t-G.lastKill<3&&G.combo>1;this.set('combo','text',cm?'x'+Math.min(3,1+.25*(G.combo-1)).toFixed(2).replace(/\.?0+$/,''):'');
    this.set('heatb','width',GUN.heat.toFixed(0)+'%');this.set('heat','cls',GUN.over?'over':GUN.heat>70?'warm':'');
    this.set('cross','cls',GUN.hitT>0?'hit':AIM.e?'on':'');
    this.set('bvent','cls','tb'+(GUN.ventCd>0?' cool':GUN.over?' hot':''));
    const sr=SALVO.cd<=0;this.set('bsalvo','cls','tb'+(sr?'':' cool'));this.set('bsalvo','text',sr?'SALVO':String(Math.ceil(SALVO.cd)));
    this.set('salvoc','text',sr?'SALVO Q':'SALVO '+Math.ceil(SALVO.cd));this.set('salvoc','cls',sr?'rdy':'');
    /* arrows at the screen edge for machines you cannot see within 60 m */
    let k=0;const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
    for(const e of EN){if(k>=6)break;if(e.dead||e.spawnT>0)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>60)continue;
      const rel=angD(Math.atan2(-dx,-dz),P.yaw);if(Math.abs(rel)<.75)continue;const el=$('ea'+k++);el.style.display='block';el.style.transform='rotate('+(-rel)+'rad)';el.style.opacity=d<25?1:.6;}
    for(;k<6;k++){const el=$('ea'+k);if(el.style.display!=='none')el.style.display='none';}
    /* mission waypoint: a marker over the objective, pinned to the screen edge when it is off screen, with the distance */
    const wp=$('wp');if(MISSION&&!MS.done&&G.mode==='play'){const s=MISSION.steps[MS.step],p=s&&stepPos(s);
      if(p){const v=V3(p.x,hgt(p.x,p.z)+(s.masts?14:5),p.z).project(cam);let sx=(v.x*.5+.5)*innerWidth,sy=(-v.y*.5+.5)*innerHeight;const behind=v.z>1;
        if(behind){sx=innerWidth-sx;sy=innerHeight-sy;}const m=46,off=behind||sx<m||sx>innerWidth-m||sy<m+40||sy>innerHeight-m;
        if(off){const cx=innerWidth/2,cy=innerHeight/2;let dx=sx-cx,dy=sy-cy;if(behind&&Math.abs(dy)<1)dy=1;const k2=Math.min((cx-m)/Math.abs(dx||1e-3),(cy-m-20)/Math.abs(dy||1e-3));sx=cx+dx*k2;sy=cy+dy*k2;}
        wp.style.display='block';wp.style.transform='translate('+sx.toFixed(0)+'px,'+sy.toFixed(0)+'px)';this.set('wpd','text',Math.round(Math.hypot(p.x-P.x,p.z-P.z))+' m');this.set('wp','cls',off?'off':'');}
      else wp.style.display='none';}else if(wp.style.display!=='none')wp.style.display='none';
  },
  menu(){const m=$('menu');$('mview').textContent='VIEW: '+(SET.view==='close'?'CLOSE':'FAR');
    $('mqual').textContent='QUALITY: '+(SET.quality==='auto'?'AUTO ('+QL.toUpperCase()+')':SET.quality.toUpperCase());
    $('msound').textContent='SOUND: '+(SET.sound?'ON':'OFF');$('msens').textContent='LOOK SPEED: '+SET.sens.toFixed(1)+'x';$('msens').style.display=touchy?'':'none';
    $('mexit').style.display=EMBED?'':'none';m.style.display=G.paused?'flex':'none';},
  dev(){if(!DEV)return;const i=R.info.render;$('dev').textContent=Math.round(1/Math.max(1e-3,G.fdt))+' fps  '+QL+' x'+DYN.toFixed(2)+'  calls '+i.calls+'  tris '+(i.triangles/1000|0)+'k  veg '+VEGN.inst+'  en '+EN.length;}
};
function setupHud(){
  if(touchy)document.body.classList.add('touch');
  const hold=(id,on,off)=>{const b=$(id);b.addEventListener('touchstart',e=>{e.preventDefault();on(e);b.classList.add('on');},{passive:false});
    const up=e=>{off&&off(e);b.classList.remove('on');};b.addEventListener('touchend',up);b.addEventListener('touchcancel',up);};
  hold('bjet',()=>{TS.jet=true;TS.jetHit=true;},()=>{TS.jet=false;});
  hold('bfire',e=>{const t=e.changedTouches[0];TS.fire=true;TS.fireId=t.identifier;TS.lx=t.clientX;TS.ly=t.clientY;},()=>{TS.fire=false;TS.fireId=-1;});
  hold('bmsl',()=>{TS.msl=true;});hold('bvent',()=>{TS.vent=true;});hold('bsalvo',()=>{TS.salvo=true;});
  $('bview').onclick=e=>{e.stopPropagation();cycleView();};
  $('bpause').onclick=e=>{e.stopPropagation();if(G.mode==='play')setPause(!G.paused);};
  $('mresume').onclick=()=>setPause(false);
  $('mview').onclick=()=>{cycleView();HUD.menu();};
  $('mqual').onclick=()=>{const o=['auto','low','med','high'];SET.quality=o[(o.indexOf(SET.quality)+1)%o.length];store.set('quality',SET.quality);
    setQuality(SET.quality==='auto'?(touchy?'med':'high'):SET.quality);HUD.menu();};
  $('msound').onclick=()=>{SET.sound=!SET.sound;store.set('sound',SET.sound?1:0);HUD.menu();};
  $('msens').onclick=()=>{const o=[.6,.8,1,1.3,1.7];SET.sens=o[(o.indexOf(SET.sens)+1)%o.length]||1;store.set('sens',SET.sens);HUD.menu();};
  $('mexit').onclick=()=>ARC.exit();
  $('down').addEventListener('click',()=>{if(G.mode==='down'&&G.downT<=0){if(MISSION)repairAtCheckpoint();else startPlay();}});
  HUD.view(SET.view);
}

/* ---- 10_main.js ---- */
/* ===================== game flow ===================== */
let NIGHT_ON=false;
const G={mode:'load',paused:false,t:0,fdt:1/60,birdT:6,perf:{t:0,n:0,s:0},demoI:1,demoHop:4,score:0,kills:0,combo:0,lastKill:-9,wave:0,hpK:1,breakT:3,downT:0};
let M=null,CTLX=null;
function setQuality(q){QL=q;QC=QUAL[q];DYN=1;resize();setShadow();S.fog.near=QC.fog*.22;S.fog.far=QC.fog;}
function cycleView(){SET.view=SET.view==='close'?'far':'close';store.set('view',SET.view);HUD.view(SET.view);}
function setPause(b){G.paused=b;HUD.menu();setVolume();if(!b&&!touchy&&G.mode==='play')lockMouse();if(b)jetLoop(0);}
function clearFight(){for(const e of EN)S.remove(e.o);EN.length=0;BOLTS.length=EBOLTS.length=MISS.length=BEACONS.length=0;for(const p of PK)S.remove(p.g);PK.length=0;}
function resetRun(){P=mkPlayer();CAMS.ready=false;clearFight();Object.assign(GUN,{tier:GUN.base,heat:0,over:false,cd:0,ventCd:0});MSL.ammo=12;SALVO.cd=0;SALVO.left=0;
  Object.assign(G,{score:0,kills:0,combo:0,lastKill:-9,wave:0,hpK:1,breakT:3});if(M)M.root.visible=true;$('down').style.display='none';}
function playerDown(){if(P.dead)return;P.dead=true;P.thrust=0;boom(P.x,P.y+2.5,P.z,2);boom(P.x+1,P.y+3.5,P.z-1,1.2);if(M)M.root.visible=false;
  G.mode='down';G.downT=2.4;
  if(MISSION){const can=missionDown();$('dscore').textContent=can?'REPAIRS LEFT '+MS.repairs:'NO REPAIRS LEFT';$('dgo').textContent=can?'TAP TO REPAIR AT THE CHECKPOINT':'';if(!can)G.downT=99;return;}
  $('dgo').textContent='TAP TO GO AGAIN';const best=+store.get('best',0);if(G.score>best)store.set('best',G.score);
  $('dscore').textContent='SCORE '+G.score.toLocaleString('en-US')+'  ·  WAVE '+G.wave+'  ·  BEST '+Math.max(best,G.score).toLocaleString('en-US');
  ARC.over(G.score,Math.min(60,Math.floor(G.score/400)+G.wave));}
function startPlay(){audioInit();resetRun();G.mode='play';G.paused=false;$('title').style.display='none';$('mlist').style.display='none';HUD.menu();ARC.begin();if(MISSION)startMission();
  if(!touchy){lockMouse();HUD.hint('WASD MOVE · MOUSE AIM · SPACE JET HOP · V CAMERA · ESC PAUSE',9);}else HUD.hint('LEFT THUMB MOVES · RIGHT THUMB AIMS · JET TO HOP',7);}
function startDemo(){resetRun();G.mode='demo';G.paused=false;G.demoI=1;$('title').style.display='none';HUD.menu();}
/* attract mode: walk the trail, hop now and then */
function demoCtl(dt){const c={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false},RT=MAPDEF.route||TRAIL;const t=RT[G.demoI];if(!t)return c;
  const dx=t[0]-P.x,dz=t[1]-P.z;if(Math.hypot(dx,dz)<7){G.demoI++;if(G.demoI>=RT.length){G.demoI=1;P=mkPlayer();CAMS.ready=false;}}
  const want=Math.atan2(-dx,-dz),d=angD(want,P.yaw);c.turn=-clamp(d,-1.4*dt,1.4*dt);c.my=Math.abs(d)<.6?1:.3;
  G.demoHop-=dt;if(G.demoHop<0){c.jetHit=true;c.jet=true;G.demoHop=5+Math.random()*4;}return c;}
function handleEvents(){
  for(const e of P.ev){
    if(e.t==='jet'){sJet();CAMS.shake=Math.max(CAMS.shake,.45);dustPuff(P.x,P.z,12,1.1);}
    else if(e.t==='land'){sLand(e.k);CAMS.shake=Math.max(CAMS.shake,.4+e.k*.6);dustPuff(P.x,P.z,10+e.k*16|0,.9+e.k*.7);}
    else if(e.t==='nofuel'){sClick();HUD.flashFuel();}
  }
  P.ev.length=0;
}
const _np=new THREE.Vector3();
function jetFX(dt){if(P.thrust<.05)return;for(const J of M.jets){J.n.getWorldPosition(_np);
  const k=P.thrust;if(Math.random()<k*dt*60)part({x:_np.x,y:_np.y-.4,z:_np.z,vx:(Math.random()-.5)*2,vy:-6-Math.random()*4,vz:(Math.random()-.5)*2,life:.25+Math.random()*.15,s0:.9,s1:.35,a:1.4*k,col:[1,.55,.22],glow:true,drag:2});
  if(Math.random()<k*dt*30)part({x:_np.x,y:_np.y-.6,z:_np.z,vx:(Math.random()-.5)*1.5,vy:-3-Math.random()*2,vz:(Math.random()-.5)*1.5,life:1.2+Math.random()*.8,s0:.8,s1:3.4,a:.3,col:SMOKE,drag:1.6,grav:-.6});}}
function tick(dt){
  G.t+=dt;U.uTime.value=G.t;if(MAPDEF.tick)MAPDEF.tick(dt);if(RING)RING.position.set(cam.position.x,cam.position.y+RING.userData.lift,cam.position.z);
  /* the clouds drift; their shadows slide over the ground with them */
  U.uCloudOff.value.x+=dt*.0016;U.uCloudOff.value.y+=dt*.0007;
  const live=(G.mode==='play'||G.mode==='demo')&&!G.paused;
  if(live){
    let c=G.mode==='demo'?demoCtl(dt):readCtl(dt);
    if(CTLX){Object.assign(c,CTLX);CTLX.jetHit=false;CTLX.view=false;if(CTLX.turnOnce){c.turn=CTLX.turnOnce;CTLX.turnOnce=0;}}
    if(c.view)cycleView();if(c.pause&&G.mode==='play')setPause(true);
    rayAim();updPlayer(c,dt);if(G.mode==='play')updGun(c,dt);handleEvents();updMission(dt);
  }else if(G.mode==='play'){const c=readCtl(dt);if(c.pause)setPause(false);}
  else readCtl(dt);
  const fight=(G.mode==='play'&&!G.paused)||G.mode==='down';
  if(fight){updShots(dt);updEnemies(dt);updPickups(dt);}
  updRadio(dt);if(NIGHT_ON&&M&&M.ready&&!M.lamp){M.lamp=new THREE.SpotLight(0xfff2d8,1600,110,.55,.6,1.4);M.lamp.position.set(0,.3,-.4);M.head.add(M.lamp);const t=new THREE.Object3D();t.position.set(0,-3,-30);M.head.add(t);M.lamp.target=t;}
  if(G.mode==='down'){G.downT-=dt;if(G.downT<=0&&$('down').style.display!=='flex'){$('down').style.display='flex';}
    if(Math.random()<dt*20)part({x:P.x+(Math.random()-.5)*2,y:P.y+1+Math.random()*2,z:P.z+(Math.random()-.5)*2,vx:0,vy:2.5,vz:0,life:2.4,s0:1.2,s1:5,a:.4,col:[.2,.2,.21],drag:.6,grav:-.5});}
  if(M){const ev=poseMech(M,{x:P.x,z:P.z,gy:P.y,legYaw:P.legYaw,aimYaw:P.yaw,spd:live?P.spd:0,air:P.air,vy:P.vy,land:P.land,thrust:P.thrust,pitch:P.pitch},live?dt:0);
    for(const e of ev){const k=clamp(Math.abs(P.spd)/WALK,.35,1);sStep(k);if(e.x!==undefined)dustPuff(e.x,e.z,3,.55);if(SET.view==='close')CAMS.shake=Math.max(CAMS.shake,.16*k);}}
  const view=G.mode==='title'||G.mode==='demo'||G.mode==='down'?'far':SET.view;
  updCam(live||G.mode!=='play'?dt:0,P,view);
  placeSun(P.x-Math.sin(P.yaw)*12,P.z-Math.cos(P.yaw)*12);
  U.uSunXZ.value.set(SUN.x/SUN.y,SUN.z/SUN.y);
  if(live)jetFX(dt);updFX(live?dt:0);
  updVeg(dt,P.x,3,P.z);
  jetLoop(live?P.thrust:0);
  if(live){G.birdT-=dt;if(G.birdT<0){sBird();G.birdT=4+Math.random()*8;}}
  HUD.fuel(P);HUD.frame();
}
/* auto quality: if frames are slow, lower the render scale, then the quality level */
function autoQ(dt){if(SET.quality!=='auto'||G.mode!=='play'||G.paused)return;const pf=G.perf;pf.t+=dt;pf.n++;
  if(pf.t>=2.5){const avg=pf.t/pf.n;pf.t=0;pf.n=0;
    if(avg>1/40){if(DYN>.66){DYN*=.88;resize();}else if(QL!=='low'){setQuality(QL==='high'?'med':'low');}}
    else if(avg<1/57&&DYN<1){DYN=Math.min(1,DYN*1.06);resize();}}}
let last=performance.now();
function frame(now){
  const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;G.fdt+=(raw-G.fdt)*.1;
  tick(dt);autoQ(dt);R.render(S,cam);HUD.dev();requestAnimationFrame(frame);
}
function boot(){
  pickMap();setupHud();setQuality(QL);const LK=MISSION&&MISSION.look?Object.assign({},MAPDEF.look,MISSION.look):MAPDEF.look;NIGHT_ON=!!LK.night;applyLook(LK);setupTitle();U.tCloud.value=tex('34-fog',{srgb:false});
  buildGround();const before=new Set(S.children);MAPDEF.build();mergeStatic(before);M=buildMech();buildFX();buildWeapons();P=mkPlayer();
  const done=()=>{G.mode=G.mode==='load'?'title':G.mode;$('load').style.display='none';$('title').style.display=G.mode==='title'?'flex':'none';document.title='IRONHOWL 3';ARC.post('ready',{title:ARC.title});};
  let vegDone=false,texDone=false;LM.onLoad=()=>{texDone=true;if(vegDone)done();};
  Promise.all([loadVeg(MAPDEF.mix),loadEnemies()]).then(()=>{navInit();navBuild();vegDone=true;if(texDone||LOADP>=1)done();});
  requestAnimationFrame(frame);
}
$('title').addEventListener('click',()=>{if(G.mode==='title')startPlay();});
/* map choice on the title screen: reloads the page with that map */
document.querySelectorAll('#maps button').forEach(b=>{b.classList.toggle('sel',b.dataset.map===MAPID);b.addEventListener('click',e=>{e.stopPropagation();if(b.dataset.map===MAPID)return;store.set('map',b.dataset.map);
  const q=new URLSearchParams(location.search);q.set('map',b.dataset.map);location.search=q.toString();});});
cv.addEventListener('click',()=>{if(G.mode==='play'&&!G.paused&&!touchy&&!MOUSE.locked)lockMouse();});
addEventListener('keydown',e=>{if(G.mode==='title'&&(e.code==='Enter'||e.code==='Space'))startPlay();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){if(G.mode==='title'||G.mode==='demo'||G.mode==='down'&&!MISSION||G.mode==='results')startPlay();else if(G.paused)setPause(false);}
  else if(m.cmd==='pause'){if(G.mode==='play'&&!G.paused)setPause(true);}
  else if(m.cmd==='resume'){if(G.mode==='play'&&G.paused)setPause(false);}
  else if(m.cmd==='attract'){ARC.live=false;if(G.mode!=='load')startDemo();else G.mode='demo';}
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
if(DEV)window.__ih3={S,KEY,SKY,PFX,GUN,MSL,SALVO,MS,MISSION,TARGETS,hurtTarget,beginStep,finishMission,repairAtCheckpoint,EN,PK,AIM,startWave,spawnEnemy,dropPickup,hurtPlayer,rt(n=3){const t0=performance.now();for(let i=0;i<n;i++){R.render(S,cam);R.getContext().finish();}return +((performance.now()-t0)/n).toFixed(1);},G,get P(){return P;},get M(){return M;},VEG,get VEGN(){return VEGN;},R,cam,CAMS,SET,QUAL,setQuality,cycleView,startPlay,startDemo,setPause,
  ctl(o){CTLX=o;},showcase(o){CAMX=o;},
  /* run the game forward t seconds at 60 steps a second without drawing (for tests) */
  ff(t){const n=Math.round(t*60);for(let i=0;i<n;i++)tick(1/60);},
  info(){const i=R.info.render;return {calls:i.calls,tris:i.triangles,veg:VEGN.inst,ql:QL,mode:G.mode,x:+P.x.toFixed(1),z:+P.z.toFixed(1),air:P.air,fuel:+P.fuel.toFixed(2),hull:+P.hull.toFixed(0),shield:+P.shield.toFixed(0),tier:GUN.tier,heat:+GUN.heat.toFixed(0),over:GUN.over,msl:MSL.ammo,score:G.score,kills:G.kills,wave:G.wave,enemies:EN.filter(e=>!e.dead).length,bolts:BOLTS.length,ebolts:EBOLTS.length};}};
/* title screen: mission briefing when a mission is loaded, otherwise the sandbox map buttons and the mission list */
function setupTitle(){
  if(MISSION){$('maps').style.display='none';$('bmis').style.display='none';$('tsub').textContent='MISSION '+MISSION.id+' · '+MISSION.name;
    $('tbrief').innerHTML=MISSION.brief.map(l=>'<div>'+l+'</div>').join('')+'<div class="objs">'+MISSION.steps.filter((s,i,a)=>a.findIndex(q=>q.label===s.label)===i).map(s=>'· '+s.label).join('<br>')+'</div>';
    $('tgo').textContent='TAP TO DEPLOY';$('bmenu').style.display='';}
  $('bmis').onclick=e=>{e.stopPropagation();missionMenu();};
  $('bmenu').onclick=e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.delete('mission');location.search=q.toString();};
  $('mlback').onclick=e=>{e.stopPropagation();$('mlist').style.display='none';};
  $('rnext').onclick=()=>{const q=new URLSearchParams(location.search);q.set('mission',MISSION.id+1);location.search=q.toString();};
  $('rretry').onclick=()=>location.reload();
  $('rmenu').onclick=()=>{const q=new URLSearchParams(location.search);q.delete('mission');location.search=q.toString();};
}
boot();
document.querySelectorAll('#maps button').forEach(b=>b.classList.toggle('sel',b.dataset.map===MAPID));

})();
