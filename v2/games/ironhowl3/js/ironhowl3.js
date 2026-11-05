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
const MOUSE={dx:0,dy:0,locked:false};
const TS={id:-1,ox:0,oy:0,ax:0,ay:0,look:-1,lx:0,ly:0,ldx:0,ldy:0,jet:false,jetHit:false};
let PAD_PREV={};
addEventListener('keydown',e=>{if(e.repeat)return;KEYS.add(e.code);HIT.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>KEYS.delete(e.code));
addEventListener('blur',()=>{KEYS.clear();TS.id=-1;TS.look=-1;TS.jet=false;});
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
    else if(t.identifier===TS.look){TS.ldx+=t.clientX-TS.lx;TS.ldy+=t.clientY-TS.ly;TS.lx=t.clientX;TS.ly=t.clientY;}
  }
  if(G.mode==='play')e.preventDefault();
}
function touchEnd(e){for(const t of e.changedTouches){if(t.identifier===TS.id){TS.id=-1;TS.ax=TS.ay=0;HUD.stick(false);}if(t.identifier===TS.look)TS.look=-1;}}
addEventListener('touchstart',touchStart,{passive:false});
addEventListener('touchmove',touchMove,{passive:false});
addEventListener('touchend',touchEnd);addEventListener('touchcancel',touchEnd);
function readCtl(dt){
  const o={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false,view:false,pause:false};
  const k=c=>KEYS.has(c);
  o.mx=(k('KeyD')?1:0)-(k('KeyA')?1:0);o.my=(k('KeyW')||k('ArrowUp')?1:0)-(k('KeyS')||k('ArrowDown')?1:0);
  o.turn+=((k('ArrowRight')||k('KeyE')?1:0)-(k('ArrowLeft')||k('KeyQ')?1:0))*2.4*dt;
  if(MOUSE.locked){o.turn+=MOUSE.dx*.0026;o.pitch-=MOUSE.dy*.002;}
  MOUSE.dx=MOUSE.dy=0;
  o.jet=k('Space');o.jetHit=HIT.has('Space');o.view=HIT.has('KeyV');o.pause=HIT.has('KeyP')||HIT.has('Escape');
  /* touch */
  if(TS.id>=0){const m=Math.min(1,Math.hypot(TS.ax,TS.ay)),a=Math.atan2(TS.ay,TS.ax),dz=m<.12?0:(m-.12)/.88;o.mx+=Math.cos(a)*dz;o.my-=Math.sin(a)*dz;}
  if(TS.ldx||TS.ldy){o.turn+=TS.ldx*.0062*SET.sens;o.pitch-=TS.ldy*.004*SET.sens;TS.ldx=TS.ldy=0;}
  if(TS.jet)o.jet=true;if(TS.jetHit){o.jetHit=true;TS.jetHit=false;}
  /* gamepad */
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  for(const p of pads){if(!p||!p.connected)continue;const ax=i=>Math.abs(p.axes[i]||0)>.16?p.axes[i]:0,b=i=>p.buttons[i]&&p.buttons[i].pressed;
    o.mx+=ax(0);o.my-=ax(1);o.turn+=ax(2)*2.8*dt;o.pitch-=ax(3)*1.6*dt;
    if(b(0)||b(4))o.jet=true;const pr=PAD_PREV;if((b(0)||b(4))&&!pr.j)o.jetHit=true;if(b(3)&&!pr.v)o.view=true;if(b(9)&&!pr.s)o.pause=true;
    PAD_PREV={j:b(0)||b(4),v:b(3),s:b(9)};break;}
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
  if(o.srgb!==false)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,R.capabilities.getMaxAnisotropy());return t;}
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
const SKYU={uSun:{value:SUN},uZen:{value:new THREE.Color(0x2a5fb4)},uHor:{value:new THREE.Color(0xb3c8de)},uSunC:{value:new THREE.Color(1,.93,.8)},
  tCloud:U.tCloud,uCloudOff:U.uCloudOff,uCloudAmt:U.uCloudAmt};
const SKY=new THREE.Mesh(new THREE.SphereGeometry(500,32,16),new THREE.ShaderMaterial({uniforms:SKYU,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
  fragmentShader:`uniform vec3 uSun,uZen,uHor,uSunC;uniform sampler2D tCloud;uniform vec2 uCloudOff;uniform float uCloudAmt;varying vec3 vD;
  void main(){vec3 d=normalize(vD);float h=max(d.y,0.);
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
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;'+(o.fade?'\nattribute float aFade;varying float vFade;':'')+(o.ground?'\nattribute float aTrail;varying float vTrail;':''))
      .replace('#include <project_vertex>',`#include <project_vertex>
        vec4 wp4=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          wp4=instanceMatrix*wp4;
        #endif
        vWP=(modelMatrix*wp4).xyz;`+(o.fade?'vFade=aFade;':'')+(o.ground?'vTrail=aTrail;':''));
    let f=sh.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vWP;uniform sampler2D tCloud;uniform vec2 uCloudOff,uSunXZ;uniform float uCloudScale,uCloudAmt,uLeafGlow;`+(o.fade?'varying float vFade;':'')+(o.ground?'varying float vTrail;':'')+`
      float cloudShade(){vec2 uv=(vWP.xz+vWP.y*uSunXZ)*uCloudScale+uCloudOff;float n=clamp((texture2D(tCloud,uv).r*.72+texture2D(tCloud,uv*2.3).r*.28-.2)/.36,0.,1.);
        return mix(1.,.4,smoothstep(.5,.78,n)*uCloudAmt);}`)
      .replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color*=cloudShade();');
    if(o.fade)f=f.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(vFade>.01){float dn=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(dn<vFade)discard;}`);
    if(o.leaf)f=f.replace('#include <normal_fragment_begin>',LEAF_NORMAL)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*uLeafGlow*vec3(.9,1.,.7);');
    if(o.ground)f=f.replace('#include <map_fragment>',`#include <map_fragment>
      {float big=texture2D(tCloud,vWP.xz/61.).r,small=texture2D(tCloud,vWP.xz/9.3).r;
       vec3 moss=diffuseColor.rgb*vec3(.62,.72,.42)*(.75+big*.5);
       vec3 litter=diffuseColor.rgb*vec3(.86,.74,.6)*(.8+small*.35);
       vec3 floorc=mix(moss,litter,smoothstep(.35,.7,big));
       diffuseColor.rgb=mix(floorc,diffuseColor.rgb*vec3(1.02,.95,.86),vTrail);}`);
    sh.fragmentShader=f;
  };
  mat.customProgramCacheKey=()=>'w'+(o.fade?1:0)+(o.leaf?1:0)+(o.ground?1:0);
  return mat;
}

/* ---- 04_world.js ---- */
/* ===================== the woods test map =====================
   PLAY = half-size of the ground you can walk on (160 x 160 m). Beyond it the ground rises into wooded ridges. */
const PLAY=80,WORLD=170;
const TRAIL=[[0,78],[-12,56],[-22,32],[-6,12],[16,-4],[20,-28],[2,-46],[-18,-60],[-12,-80]];
const CLEAR=[[-32,38,15],[26,-14,17],[-24,-56,13],[34,50,11],[4,26,9]];
const SPAWN={x:0,z:70,yaw:0};
function segD(px,pz,ax,az,bx,bz){const vx=bx-ax,vz=bz-az,t=clamp(((px-ax)*vx+(pz-az)*vz)/(vx*vx+vz*vz),0,1),dx=px-ax-vx*t,dz=pz-az-vz*t;return Math.sqrt(dx*dx+dz*dz);}
function trailD(x,z){let d=1e9;for(let i=0;i<TRAIL.length-1;i++){const a=TRAIL[i],b=TRAIL[i+1];d=Math.min(d,segD(x,z,a[0],a[1],b[0],b[1]));}return d;}
function clearD(x,z){let d=1e9;for(const c of CLEAR)d=Math.min(d,Math.hypot(x-c[0],z-c[1])-c[2]);return d;}
function hgt(x,z){
  const big=(fbm(x*.011+3.1,z*.011-7.4,4)-.5)*9,small=(fbm(x*.047,z*.047+11,2)-.5)*1.8;
  const e=Math.max(Math.abs(x),Math.abs(z)),rim=Math.pow(smooth(PLAY-6,PLAY+60,e),1.3)*28;
  return big+small*smooth(1.5,7,trailD(x,z))+rim;
}
/* --- ground --- */
function buildGround(){
  const n=170,g=new THREE.PlaneGeometry(WORLD*2,WORLD*2,n,n);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,tr=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,hgt(x,z));tr[i]=smooth(4.6,2.0,trailD(x,z));}
  g.setAttribute('aTrail',new THREE.BufferAttribute(tr,1));g.computeVertexNormals();
  const m=hookWorld(new THREE.MeshStandardMaterial({map:tex('06-dirt-and-gravel',{rep:WORLD*2/4.6}),roughness:.97,metalness:0}),{ground:true});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;S.add(mesh);return mesh;
}
/* --- vegetation: one InstancedMesh per model part; near and far versions swap by distance; trees between the camera and the mech dither out --- */
const VEG={list:[],byId:{},cat:null,ready:false,cols:new Map(),grassCell:12};
function colKey(x,z){return ((Math.floor(x/10)+200)*1000)+(Math.floor(z/10)+200);}
function addCol(x,z,r){const k=colKey(x,z);if(!VEG.cols.has(k))VEG.cols.set(k,[]);VEG.cols.get(k).push({x,z,r});}
/* push a circle (x,z,rad) out of tree trunks; returns [x,z,hit] */
function collide(x,z,rad){let hit=false;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=VEG.cols.get(colKey(x+i*10,z+j*10));if(!a)continue;
    for(const c of a){const dx=x-c.x,dz=z-c.z,rr=rad+c.r,d2=dx*dx+dz*dz;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2);x=c.x+dx/d*rr;z=c.z+dz/d*rr;hit=true;}}}
  return [x,z,hit];}
function vegAsset(id,kind){if(VEG.byId[id])return VEG.byId[id];const a={id,kind,inst:[],parts:{near:[],far:[]},sel:[],selFar:[]};VEG.byId[id]=a;VEG.list.push(a);return a;}
function plant(id,kind,x,z,s,rnd){
  const a=vegAsset(id,kind),c=VEG.cat[id],y=hgt(x,z)-(kind==='tree'?.25:.05),r=rnd()*TAU;
  const m=new THREE.Matrix4().compose(V3(x,y,z),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),r),V3(s,s,s));
  const cr=Math.max(c.size_m[0],c.size_m[2])*.5*s;
  a.inst.push({x,y,z,s,m,cr,h:c.size_m[1]*s,f:0});
  if(c.collider&&kind==='tree')addCol(x,z,c.collider.r*s+.1);
}
function layoutWoods(mixId){
  const mix=VEG.cat._biomes.find(b=>b.id===mixId)||VEG.cat._biomes[0],rnd=mulberry(4242);
  const pick=o=>{let t=0;for(const k in o)t+=o[k];let r=rnd()*t;for(const k in o){r-=o[k];if(r<=0)return k;}return Object.keys(o)[0];};
  /* trees: jittered grid, open trail and clearings in the middle, thick on the ridges */
  for(let gx=-WORLD+4;gx<WORLD-4;gx+=7.5)for(let gz=-WORLD+4;gz<WORLD-4;gz+=7.5){
    const x=gx+(rnd()-.5)*6.5,z=gz+(rnd()-.5)*6.5,e=Math.max(Math.abs(x),Math.abs(z)),inner=e<PLAY;
    const td=trailD(x,z),cd=clearD(x,z);
    if(Math.hypot(x-SPAWN.x,z-SPAWN.z)<13)continue;
    if(td<6.5||cd<0)continue;
    const p=inner?(.62*smooth(6.5,12,td)*smooth(0,6,cd)):.92;
    if(rnd()>p)continue;
    plant(pick(mix.tree),'tree',x,z,.82+rnd()*.4,rnd);
  }
  /* grass tufts and bushes */
  for(let i=0;i<11000;i++){const x=(rnd()-.5)*2*(PLAY+14),z=(rnd()-.5)*2*(PLAY+14);if(trailD(x,z)<2.4&&rnd()<.85)continue;plant(pick(mix.grass),'grass',x,z,.75+rnd()*.7,rnd);}
  for(let i=0;i<330;i++){const x=(rnd()-.5)*2*(PLAY+10),z=(rnd()-.5)*2*(PLAY+10);if(trailD(x,z)<4)continue;plant(rnd()<.65?'bush_sage':'bush_oleander','bush',x,z,.9+rnd()*.7,rnd);}
  /* a few props by the trail */
  const props=['prop_drum','prop_tires','prop_icechest','prop_drum','prop_tires','prop_mailbox'];
  for(let i=0;i<props.length;i++){const k=(i+.5)/props.length*(TRAIL.length-1),a=TRAIL[k|0],b=TRAIL[(k|0)+1],f=k%1,x=lerp(a[0],b[0],f),z=lerp(a[1],b[1],f);
    const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),sd=i%2?-1:1;plant(props[i],'prop',x+dz/l*5.6*sd,z-dx/l*5.6*sd,1,rnd);}
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
    VEG.cat={_biomes:c.biomes};c.manifest.assets.forEach(a=>VEG.cat[a.id]=a);layoutWoods(mixId);
    const L=new THREE.GLTFLoader(LM),jobs=[];
    for(const a of VEG.list){const c=VEG.cat[a.id];for(const lod of ['near','far'])
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
        if(t>-.05&&t<1.08){const px=dx-segx*t,pz=dz-segz*t,dp=Math.sqrt(px*px+pz*pz);if(dp<s.cr*.7+1.4)tgt=.82;}
        if(dx*dx+dz*dz<s.cr*s.cr*.4)tgt=Math.max(tgt,.9);
        s.f+=(tgt-s.f)*damp(tgt>s.f?10:4,dt);}}
    for(const lod of ['near','far']){const L=lod==='near'?sn:sf;
      for(const p of a.parts[lod]){const arr=p.im.instanceMatrix.array,fa=p.fade.array;
        for(let k=0;k<L.length;k++){const i=L[k];arr.set(p.big.subarray(i*16,i*16+16),k*16);fa[k]=lod==='near'&&isT?a.inst[i].f:0;}
        p.im.count=L.length;p.im.visible=L.length>0;p.im.instanceMatrix.needsUpdate=true;p.fade.needsUpdate=true;
        const tt=L.length*(p.geo.index?p.geo.index.count:p.geo.attributes.position.count)/3;tris+=tt;inst+=L.length;if(DEV){const k=a.kind+'.'+lod;VEGN.by[k]=(VEGN.by[k]||0)+tt;}}}
  }
  VEGN.tris=tris|0;VEGN.inst=inst;
}

/* ---- 05_mech.js ---- */
/* ===================== Howler 07, the player's mech (4.5 m tall) =====================
   root (on the ground) -> hips (turn with the walking direction, carry the legs) and torso (turns with the aim). */
const MT={};
function mechMats(){
  const k=a=>hookWorld(a);
  MT.org=k(new THREE.MeshStandardMaterial({map:tex('22-howler-armour'),roughness:.48,metalness:.35}));
  MT.grey=k(new THREE.MeshStandardMaterial({map:tex('23-grey-armour'),roughness:.52,metalness:.45}));
  MT.gun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),color:0xb4bac4,roughness:.46,metalness:.72}));
  MT.steel=k(new THREE.MeshStandardMaterial({map:tex('25-brushed-steel'),roughness:.3,metalness:.92}));
  MT.trim=k(new THREE.MeshStandardMaterial({map:tex('26-hazard-trim'),roughness:.6,metalness:.2}));
  MT.dark=k(new THREE.MeshStandardMaterial({color:0x17191d,roughness:.7,metalness:.55}));
  MT.glow=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.5,.12).multiplyScalar(2.6)});
  MT.eye=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.72,.3).multiplyScalar(3.2)});
  const dec=tex('28-howler-decals',{clamp:true});
  MT.decal=k(new THREE.MeshStandardMaterial({map:dec,transparent:true,alphaTest:.3,roughness:.6,metalness:.1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  MT.flame=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.46,.16).multiplyScalar(1.25),transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});
  MT.flame2=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.7,1).multiplyScalar(1.5),transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
}
const GEO={};
/* box with chamfered edges (catches highlights); uv: texture repeats once every 1/uvs metres */
function cbox(w,h,d,c=.07,uvs=.45){
  const key=[w,h,d,c,uvs].join();if(GEO[key])return GEO[key];
  const iw=w-2*c,ih=h-2*c,sh=new THREE.Shape();sh.moveTo(-iw/2,-ih/2);sh.lineTo(iw/2,-ih/2);sh.lineTo(iw/2,ih/2);sh.lineTo(-iw/2,ih/2);sh.closePath();
  const g=new THREE.ExtrudeGeometry(sh,{depth:Math.max(.001,d-2*c),bevelEnabled:true,bevelSize:c,bevelThickness:c,bevelSegments:1,curveSegments:1});
  g.translate(0,0,-(d-2*c)/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*uvs+.5,uv.getY(i)*uvs+.5);
  g.computeVertexNormals();return GEO[key]=g;
}
function cyl(r0,r1,l,seg=14,open=false){const key='c'+[r0,r1,l,seg,open].join();if(GEO[key])return GEO[key];const g=new THREE.CylinderGeometry(r0,r1,l,seg,1,open);return GEO[key]=g;}
function add(par,geo,mat,x,y,z,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=m.receiveShadow=true;par.add(m);return m;}
function grp(par,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);par.add(g);return g;}
/* a quad showing one rectangle of the decal sheet (u0,v0)-(u1,v1) */
function decal(par,w,h,u0,v0,u1,v1,x,y,z,ry){
  const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,lerp(u0,u1,uv.getX(i)),lerp(v0,v1,uv.getY(i)));
  const m=new THREE.Mesh(g,MT.decal);m.position.set(x,y,z);m.rotation.y=ry;m.receiveShadow=true;par.add(m);return m;
}
const L1=1.25,L2=1.25,HIP=2.25,ANK=.24;
function buildMech(){
  mechMats();
  const root=new THREE.Group(),hips=grp(root,0,HIP,0),torso=grp(root,0,HIP,0);
  /* pelvis */
  add(hips,cbox(1.5,.55,1.0,.08),MT.gun,0,.05,0);add(hips,cyl(.32,.32,1.9,12),MT.dark,0,0,0,0,0,Math.PI/2);
  /* legs */
  const legs=[-1,1].map(sd=>{
    const thigh=grp(hips,sd*.92,0,0);
    add(thigh,cbox(.56,1.3,.66,.07),MT.gun,0,-.6,0);add(thigh,cbox(.62,.9,.2,.06),MT.org,sd*.02,-.5,-.37,-.06);
    add(thigh,cbox(.2,.7,.5,.05),MT.grey,sd*.33,-.5,0);
    const knee=grp(thigh,0,-L1,0);
    add(knee,new THREE.SphereGeometry(.34,14,10),MT.dark,0,0,0);add(knee,cbox(.5,.4,.3,.06),MT.grey,0,.02,-.32,.3);
    add(knee,cbox(.5,1.3,.58,.07),MT.org,0,-.66,.04);add(knee,cbox(.42,.85,.16,.05),MT.grey,0,-.62,-.31);
    add(knee,cyl(.07,.07,1.0,8),MT.steel,0,-.6,.38,.08);add(knee,cbox(.16,.5,.3,.04),MT.trim,sd*.27,-.95,.04);
    const ankle=grp(knee,0,-L2,0);
    add(ankle,new THREE.SphereGeometry(.22,12,8),MT.dark,0,0,0);
    add(ankle,cbox(.82,.3,1.3,.07),MT.grey,0,-.1,-.16);add(ankle,cbox(.86,.16,.42,.05),MT.gun,0,-.18,-.82,-.25);
    add(ankle,cbox(.6,.22,.4,.05),MT.gun,0,-.12,.62,.3);
    return {thigh,knee,ankle,sd,u:sd<0?0:.5,plant:true,gy:0};
  });
  /* torso */
  add(torso,cyl(.5,.58,.42,14),MT.dark,0,.2,0);
  add(torso,cbox(2.2,1.25,1.7,.13),MT.org,0,.98,.05);
  add(torso,cbox(1.92,.82,.32,.08),MT.grey,0,1.02,-.86,-.28);
  add(torso,new THREE.BoxGeometry(1.1,.1,.04),MT.glow,0,1.3,-1.02,-.28);
  add(torso,cbox(1.84,.26,1.32,.08),MT.org,0,1.7,.12);
  add(torso,cbox(.26,.16,1.5,.04),MT.trim,-.98,1.62,.05);add(torso,cbox(.26,.16,1.5,.04),MT.trim,.98,1.62,.05);
  /* head */
  const head=grp(torso,0,1.98,-.3);
  add(head,cbox(.86,.5,.82,.09),MT.grey,0,0,0);add(head,new THREE.BoxGeometry(.56,.07,.04),MT.eye,0,.03,-.42);
  add(head,cbox(.9,.12,.6,.04),MT.org,0,.28,.06);add(head,cyl(.025,.025,.9,6),MT.steel,.32,.62,.25,-.15);add(head,cyl(.02,.02,.6,6),MT.steel,-.3,.48,.3,.1);
  /* shoulders: missile pods */
  for(const sd of [-1,1]){
    add(torso,cbox(.78,.62,1.12,.08),MT.grey,sd*1.4,1.62,.05);add(torso,new THREE.BoxGeometry(.6,.44,.04),MT.dark,sd*1.4,1.62,-.52);
    for(let r=0;r<2;r++)for(let c=0;c<3;c++)add(torso,cyl(.07,.07,.05,8),MT.gun,sd*1.4+(c-1)*.17,1.52+r*.2,-.545,Math.PI/2);
  }
  /* arms with autocannons */
  const arms=[-1,1].map(sd=>{
    const sh=grp(torso,sd*1.32,1.12,-.05);
    add(sh,new THREE.SphereGeometry(.3,12,10),MT.dark,0,0,0);add(sh,cbox(.52,.78,.62,.07),MT.gun,sd*.16,-.3,0);
    const gun=grp(sh,sd*.16,-.62,0);
    add(gun,cbox(.58,.58,1.55,.09),MT.org,0,0,-.42);add(gun,cbox(.62,.2,.9,.05),MT.grey,0,.32,-.3);
    add(gun,cbox(.2,.4,.6,.04),MT.trim,sd*.3,0,-.1);
    const brl=grp(gun,0,-.02,-1.2);add(brl,cyl(.11,.11,1.2,12),MT.steel,0,0,-.6,Math.PI/2);add(brl,cyl(.16,.16,.28,12),MT.dark,0,0,-1.18,Math.PI/2);
    return {sh,gun,brl,sd,kick:0};
  });
  /* back: jet pack, nozzles, flames */
  add(torso,cbox(1.55,1.02,.58,.09),MT.gun,0,1.0,1.12);add(torso,cbox(1.2,.2,.5,.05),MT.trim,0,1.58,1.12);
  const jets=[-1,1].map(sd=>{
    const n=grp(torso,sd*.46,.42,1.32);n.rotation.x=-.55;
    add(n,cyl(.2,.26,.5,14,true),MT.dark,0,0,0);const core=add(n,new THREE.CircleGeometry(.19,14),MT.glow,0,-.2,0,Math.PI/2);core.castShadow=false;
    const f1=new THREE.Mesh(cyl(.02,.2,1,10,true),MT.flame);f1.position.y=-.75;f1.castShadow=false;n.add(f1);
    const f2=new THREE.Mesh(cyl(.01,.11,1,8,true),MT.flame2);f2.position.y=-.55;f2.castShadow=false;n.add(f2);
    return {n,core,f1,f2};
  });
  /* decals: 07 on both flanks, the howling wolf on the jet pack (the camera sees the back the most) */
  decal(torso,.78,.62,.06,.65,.44,.96,-1.112,1.0,.2,-Math.PI/2);decal(torso,.78,.62,.06,.65,.44,.96,1.112,1.0,.2,Math.PI/2);
  decal(torso,.98,.8,.52,.58,.98,.96,0,1.02,1.413,0);
  const jl=new THREE.PointLight(0xff9a40,0,14,1.8);jl.position.set(0,.6,1.6);torso.add(jl);
  root.traverse(o=>{if(o.isMesh&&o.material===MT.decal)o.castShadow=false;});
  for(const f of jets){f.f1.userData.keep=f.f2.userData.keep=f.core.userData.keep=1;}
  mergeParts(root);
  S.add(root);
  return {root,hips,torso,head,legs,arms,jets,jl,phase:0,bob:0,lean:0,roll:0};
}
/* join the fixed pieces inside each moving group into one mesh per material (about 130 meshes become about 45) */
function mergeParts(root){
  const groups=[];root.traverse(o=>{if(o.isGroup||o===root)groups.push(o);});
  for(const g of groups){const by=new Map();
    for(const m of g.children.slice()){if(!m.isMesh||m.userData.keep)continue;m.updateMatrix();
      let geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
      for(const k of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(k))geo.deleteAttribute(k);
      if(!by.has(m.material))by.set(m.material,{geos:[],cast:m.castShadow});by.get(m.material).geos.push(geo);g.remove(m);}
    for(const [mat,v] of by){const mm=new THREE.Mesh(THREE.mergeGeometries(v.geos,false),mat);mm.castShadow=v.cast;mm.receiveShadow=true;g.add(mm);}
  }
}
/* 2-bone leg IK in the leg's own side view. target (ty,tz) is the ankle relative to the hip; knee bends forward */
function legIK(L,ty,tz,footPitch){
  let d=Math.hypot(ty,tz);d=clamp(d,.3,L1+L2-.002);
  const th=Math.atan2(-tz,-ty),al=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1)),ga=Math.acos(clamp((L1*L1+L2*L2-d*d)/(2*L1*L2),-1,1));
  const t1=th+al,k=-(Math.PI-ga);
  L.thigh.rotation.x=t1;L.knee.rotation.x=k;L.ankle.rotation.x=-(t1+k)+(footPitch||0);
}
/* pose the mech for this frame. st: {x,z,gy,legYaw,aimYaw,spd (m/s along the legs, minus = backwards),air,vy,land,thrust,pitch}
   returns foot-plant events [{x,z,side}] for sound, dust and shake */
function poseMech(M,st,dt){
  const ev=[],sp=Math.abs(st.spd),sf=clamp(sp/7.5,0,1),w=smooth(.15,1.4,sp);
  const S_=lerp(1.0,2.5,sf);
  if(!st.air)M.phase+=st.spd*dt/(2*S_);
  const cy=Math.cos(st.legYaw),sy=Math.sin(st.legYaw);
  const comp=st.land*.55;
  const bob=st.air?0:Math.abs(Math.sin(M.phase*TAU))*.1*w;
  const hipY=st.gy+HIP-bob-comp-(st.air?0:.04*w);
  M.root.position.set(st.x,0,st.z);
  M.hips.position.y=hipY;M.torso.position.y=hipY+.02;
  M.hips.rotation.y=st.legYaw;M.torso.rotation.y=st.aimYaw;
  M.lean+=((st.air?-.1:-.05*sf*Math.sign(st.spd||1))+st.land*.25-M.lean)*damp(6,dt);
  M.roll+=((st.air?0:Math.sin(M.phase*TAU)*.025*w)-M.roll)*damp(8,dt);
  M.torso.rotation.x=M.lean;M.torso.rotation.z=M.roll;M.hips.rotation.z=M.roll*.6;
  for(const L of M.legs){
    let tz=0,lift=0;
    if(st.air){tz=.35+L.sd*.1;lift=.55+(st.vy>0?.25:0);}
    else{let u=(M.phase+(L.sd>0?.5:0))%1;if(u<0)u+=1;
      if(u<.5){tz=lerp(-S_/2,S_/2,u/.5);}else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s*s*(3-2*s));lift=Math.sin(Math.PI*s)*.5*w;}
      tz*=w;const nowPlant=u<.5;if(nowPlant&&!L.plant&&w>.3)ev.push({side:L.sd});L.plant=nowPlant;}
    /* foot on the terrain under it */
    const ox=L.sd*.92,fx=st.x+ox*cy+tz*sy,fz=st.z-ox*sy+tz*cy;L.gy=hgt(fx,fz);
    const ty=(st.air?hipY-2.05+lift:L.gy+ANK+lift)-hipY;
    legIK(L,ty,tz,st.air?.25:0);
    if(ev.length&&ev[ev.length-1].side===L.sd&&ev[ev.length-1].x===undefined){ev[ev.length-1].x=fx;ev[ev.length-1].z=fz;}
  }
  /* arms swing a little against the stride, recoil kick decays */
  for(const A of M.arms){A.kick*=Math.exp(-dt*14);A.sh.rotation.x=st.pitch*.8+Math.sin(M.phase*TAU+(A.sd>0?Math.PI:0))*.05*w;A.brl.position.z=-1.2+A.kick*.3;}
  /* jets */
  const th=st.thrust,fl=.6+Math.random()*.4;
  for(const J of M.jets){J.f1.visible=J.f2.visible=th>.02;const l1=(.5+th*1.5)*fl,l2=(.35+th*.9)*fl;J.f1.scale.set(1,l1,1);J.f1.position.y=-.25-.5*l1;
    J.f2.scale.set(1,l2,1);J.f2.position.y=-.25-.5*l2;J.core.scale.setScalar(.6+th*.6);}
  MT.glow.color.setRGB(1,.5,.12).multiplyScalar(2.2+th*3.5);
  M.jl.intensity=th*60*fl;
  return ev;
}

/* ---- 06_player.js ---- */
/* ===================== the player: walking, jet hops, collisions ===================== */
const WALK=7.5,RAD=1.35;
/* jet hop: vh = sideways speed, vy = launch speed, hold = how long holding JET keeps pushing, refill = seconds per fuel cell */
const JET={vh:21,vy:9.5,grav:22,hold:.6,holdG:.42,refill:3.6,drain:.55};
let P=null;
function mkPlayer(){return {x:SPAWN.x,z:SPAWN.z,y:hgt(SPAWN.x,SPAWN.z),yaw:SPAWN.yaw,pitch:0,legYaw:SPAWN.yaw,vx:0,vz:0,vy:0,air:false,
  cells:2,fuel:2,jetT:9,land:0,thrust:0,spd:0,groundT:9,ev:[],hops:0,dist:0};}
function updPlayer(c,dt){
  P.yaw-=c.turn;P.pitch=clamp(P.pitch+c.pitch,-.3,.34);   /* turn: plus = to the right */
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
  const B=PLAY+6;if(Math.abs(nx)>B){nx=Math.sign(nx)*B;P.vx*=.2;}if(Math.abs(nz)>B){nz=Math.sign(nz)*B;P.vz*=.2;}
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

/* ---- 08_camera.js ---- */
/* ===================== follow cameras =====================
   close: just behind and above the head, so it feels like first person.
   far:   one mech height higher and further back, still looking along the mech over its neck (not down at the field). */
const VIEWS={close:{back:3.5,up:5.75,look:24,lookY:4.25,fov:64,side:0,pos:10},
             far:{back:13,up:9.6,look:18,lookY:3.3,fov:58,side:0,pos:6}};
const CAMS={x:0,y:0,z:0,ty:0,shake:0,fovK:0,blend:1,ready:false};
function camFov(base){/* portrait: open the view up so there is enough to see at the sides */const a=cam.aspect;return a>=1?base:Math.min(90,base+(1-a)*28);}
function updCam(dt,p,view){
  const V=VIEWS[view],fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw);
  /* the body height follows the mech with a little lag in the air, so jet hops feel big */
  const by=p.y;CAMS.ty+=(by-CAMS.ty)*damp(p.air?(view==='close'?7:3.2):9,dt);if(!CAMS.ready){CAMS.ty=by;}
  /* portrait screens are narrow: step back a little so the mech does not fill them */
  const pt=Math.max(0,1-cam.aspect),back=V.back+pt*(view==='close'?2.2:3),up=V.up+pt*(view==='close'?.7:1.2);
  const pit=p.pitch,tx=p.x-fx*back,tz=p.z-fz*back;let ty=CAMS.ty+up-pit*(view==='close'?1.2:2.2);
  if(!CAMS.ready){CAMS.x=tx;CAMS.y=ty;CAMS.z=tz;CAMS.ready=true;}
  const k=damp(V.pos,dt);CAMS.x+=(tx-CAMS.x)*k;CAMS.z+=(tz-CAMS.z)*k;CAMS.y+=(ty-CAMS.y)*k;
  const gy=hgt(CAMS.x,CAMS.z)+1.6;if(CAMS.y<gy)CAMS.y=gy;
  CAMS.shake=Math.max(0,CAMS.shake-dt*2.2);const sh=CAMS.shake*CAMS.shake*.35;
  cam.position.set(CAMS.x+(Math.random()-.5)*sh,CAMS.y+(Math.random()-.5)*sh,CAMS.z+(Math.random()-.5)*sh);
  const ly=CAMS.ty+V.lookY+Math.tan(pit)*V.look;
  cam.lookAt(p.x+fx*V.look,ly,p.z+fz*V.look);
  CAMS.fovK+=((p.air&&p.jetT<.5?1:0)-CAMS.fovK)*damp(4,dt);
  const f=camFov(V.fov)+CAMS.fovK*5;if(Math.abs(cam.fov-f)>.01){cam.fov=f;cam.updateProjectionMatrix();}
  SKY.position.copy(cam.position);
}

/* ---- 09_hud.js ---- */
/* ===================== HUD (kept small: fuel, two corner buttons, the JET button on phones) ===================== */
const HUD={
  load(p){const b=$('ldbar');if(b)b.style.width=Math.round(p*100)+'%';},
  stick(on,x,y,dx,dy){const s=$('stick');if(!on){s.style.display='none';return;}s.style.display='block';s.style.left=x+'px';s.style.top=y+'px';$('knob').style.transform='translate('+dx+'px,'+dy+'px)';},
  fuel(p){const el=$('fuel');if(!el)return;if(el.children.length!==p.cells){el.innerHTML='';for(let i=0;i<p.cells;i++){const c=document.createElement('i');c.appendChild(document.createElement('b'));el.appendChild(c);}}
    for(let i=0;i<p.cells;i++){const f=Math.round(clamp(p.fuel-i,0,1)*50)/50,c=el.children[i];if(c._f!==f){c._f=f;c.firstChild.style.width=(f*100)+'%';c.className=f>=1?'full':'';}}},
  flashFuel(){const el=$('fuel');el.classList.remove('no');void el.offsetWidth;el.classList.add('no');},
  view(v){$('bview').textContent=v==='close'?'CLOSE':'FAR';},
  hint(t,sec){const h=$('hint');h.textContent=t;h.style.opacity=t?1:0;clearTimeout(HUD._ht);if(t&&sec)HUD._ht=setTimeout(()=>h.style.opacity=0,sec*1000);},
  menu(){const m=$('menu');$('mview').textContent='VIEW: '+(SET.view==='close'?'CLOSE':'FAR');
    $('mqual').textContent='QUALITY: '+(SET.quality==='auto'?'AUTO ('+QL.toUpperCase()+')':SET.quality.toUpperCase());
    $('msound').textContent='SOUND: '+(SET.sound?'ON':'OFF');$('msens').textContent='LOOK SPEED: '+SET.sens.toFixed(1)+'x';$('msens').style.display=touchy?'':'none';
    $('mexit').style.display=EMBED?'':'none';m.style.display=G.paused?'flex':'none';},
  dev(){if(!DEV)return;const i=R.info.render;$('dev').textContent=Math.round(1/Math.max(1e-3,G.fdt))+' fps  '+QL+' x'+DYN.toFixed(2)+'  calls '+i.calls+'  tris '+(i.triangles/1000|0)+'k  veg '+VEGN.inst;}
};
function setupHud(){
  if(touchy)document.body.classList.add('touch');
  const jb=$('bjet');
  jb.addEventListener('touchstart',e=>{e.preventDefault();TS.jet=true;TS.jetHit=true;jb.classList.add('on');},{passive:false});
  const up=e=>{TS.jet=false;jb.classList.remove('on');};jb.addEventListener('touchend',up);jb.addEventListener('touchcancel',up);
  $('bview').onclick=e=>{e.stopPropagation();cycleView();};
  $('bpause').onclick=e=>{e.stopPropagation();if(G.mode==='play')setPause(!G.paused);};
  $('mresume').onclick=()=>setPause(false);
  $('mview').onclick=()=>{cycleView();HUD.menu();};
  $('mqual').onclick=()=>{const o=['auto','low','med','high'];SET.quality=o[(o.indexOf(SET.quality)+1)%o.length];store.set('quality',SET.quality);
    setQuality(SET.quality==='auto'?(touchy?'med':'high'):SET.quality);HUD.menu();};
  $('msound').onclick=()=>{SET.sound=!SET.sound;store.set('sound',SET.sound?1:0);HUD.menu();};
  $('msens').onclick=()=>{const o=[.6,.8,1,1.3,1.7];SET.sens=o[(o.indexOf(SET.sens)+1)%o.length]||1;store.set('sens',SET.sens);HUD.menu();};
  $('mexit').onclick=()=>ARC.exit();
  HUD.view(SET.view);
}

/* ---- 10_main.js ---- */
/* ===================== game flow ===================== */
const G={mode:'load',paused:false,t:0,fdt:1/60,birdT:6,perf:{t:0,n:0,s:0},demoI:1,demoHop:4};
let M=null,CTLX=null;
function setQuality(q){QL=q;QC=QUAL[q];DYN=1;resize();setShadow();S.fog.near=QC.fog*.22;S.fog.far=QC.fog;}
function cycleView(){SET.view=SET.view==='close'?'far':'close';store.set('view',SET.view);HUD.view(SET.view);}
function setPause(b){G.paused=b;HUD.menu();setVolume();if(!b&&!touchy&&G.mode==='play')lockMouse();if(b)jetLoop(0);}
function startPlay(){audioInit();G.mode='play';G.paused=false;P=mkPlayer();CAMS.ready=false;$('title').style.display='none';HUD.menu();ARC.begin();
  if(!touchy){lockMouse();HUD.hint('WASD MOVE · MOUSE AIM · SPACE JET HOP · V CAMERA · ESC PAUSE',9);}else HUD.hint('LEFT THUMB MOVES · RIGHT THUMB AIMS · JET TO HOP',7);}
function startDemo(){G.mode='demo';G.paused=false;P=mkPlayer();CAMS.ready=false;G.demoI=1;$('title').style.display='none';HUD.menu();}
/* attract mode: walk the trail, hop now and then */
function demoCtl(dt){const c={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false};const t=TRAIL[G.demoI];if(!t)return c;
  const dx=t[0]-P.x,dz=t[1]-P.z;if(Math.hypot(dx,dz)<7){G.demoI++;if(G.demoI>=TRAIL.length){G.demoI=1;P=mkPlayer();CAMS.ready=false;}}
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
  G.t+=dt;U.uTime.value=G.t;
  /* the clouds drift; their shadows slide over the ground with them */
  U.uCloudOff.value.x+=dt*.0016;U.uCloudOff.value.y+=dt*.0007;
  const live=(G.mode==='play'||G.mode==='demo')&&!G.paused;
  if(live){
    let c=G.mode==='demo'?demoCtl(dt):readCtl(dt);
    if(CTLX){Object.assign(c,CTLX);CTLX.jetHit=false;CTLX.view=false;if(CTLX.turnOnce){c.turn=CTLX.turnOnce;CTLX.turnOnce=0;}}
    if(c.view)cycleView();if(c.pause&&G.mode==='play')setPause(true);
    updPlayer(c,dt);handleEvents();
  }else if(G.mode==='play'){const c=readCtl(dt);if(c.pause||c.view&&false)setPause(false);}
  else readCtl(dt);
  if(M){const ev=poseMech(M,{x:P.x,z:P.z,gy:P.y,legYaw:P.legYaw,aimYaw:P.yaw,spd:live?P.spd:0,air:P.air,vy:P.vy,land:P.land,thrust:P.thrust,pitch:P.pitch},live?dt:0);
    for(const e of ev){const k=clamp(Math.abs(P.spd)/WALK,.35,1);sStep(k);if(e.x!==undefined)dustPuff(e.x,e.z,3,.55);if(SET.view==='close')CAMS.shake=Math.max(CAMS.shake,.16*k);}}
  const view=G.mode==='title'||G.mode==='demo'?'far':SET.view;
  updCam(live||G.mode!=='play'?dt:0,P,view);
  placeSun(P.x-Math.sin(P.yaw)*12,P.z-Math.cos(P.yaw)*12);
  U.uSunXZ.value.set(SUN.x/SUN.y,SUN.z/SUN.y);
  if(live)jetFX(dt);updFX(live?dt:0);
  updVeg(dt,P.x,3,P.z);
  jetLoop(live?P.thrust:0);
  if(live){G.birdT-=dt;if(G.birdT<0){sBird();G.birdT=4+Math.random()*8;}}
  HUD.fuel(P);
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
  setupHud();setQuality(QL);U.tCloud.value=tex('34-fog',{srgb:false});
  buildGround();M=buildMech();buildFX();P=mkPlayer();
  const done=()=>{G.mode=G.mode==='load'?'title':G.mode;$('load').style.display='none';$('title').style.display=G.mode==='title'?'flex':'none';document.title='IRONHOWL 3';ARC.post('ready',{title:ARC.title});};
  let vegDone=false,texDone=false;LM.onLoad=()=>{texDone=true;if(vegDone)done();};
  loadVeg('woods').then(()=>{vegDone=true;if(texDone||LOADP>=1)done();});
  requestAnimationFrame(frame);
}
$('title').addEventListener('click',()=>{if(G.mode==='title')startPlay();});
cv.addEventListener('click',()=>{if(G.mode==='play'&&!G.paused&&!touchy&&!MOUSE.locked)lockMouse();});
addEventListener('keydown',e=>{if(G.mode==='title'&&(e.code==='Enter'||e.code==='Space'))startPlay();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){if(G.mode==='title'||G.mode==='demo')startPlay();else if(G.paused)setPause(false);}
  else if(m.cmd==='pause'){if(G.mode==='play'&&!G.paused)setPause(true);}
  else if(m.cmd==='resume'){if(G.mode==='play'&&G.paused)setPause(false);}
  else if(m.cmd==='attract'){ARC.live=false;if(G.mode!=='load')startDemo();else G.mode='demo';}
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
if(DEV)window.__ih3={S,KEY,SKY,PFX,rt(n=3){const t0=performance.now();for(let i=0;i<n;i++){R.render(S,cam);R.getContext().finish();}return +((performance.now()-t0)/n).toFixed(1);},G,get P(){return P;},get M(){return M;},VEG,get VEGN(){return VEGN;},R,cam,CAMS,SET,QUAL,setQuality,cycleView,startPlay,startDemo,setPause,
  ctl(o){CTLX=o;},
  /* run the game forward t seconds at 60 steps a second without drawing (for tests) */
  ff(t){const n=Math.round(t*60);for(let i=0;i<n;i++)tick(1/60);},
  info(){const i=R.info.render;return {calls:i.calls,tris:i.triangles,veg:VEGN.inst,ql:QL,dyn:DYN,mode:G.mode,x:+P.x.toFixed(1),z:+P.z.toFixed(1),y:+P.y.toFixed(2),air:P.air,fuel:+P.fuel.toFixed(2),hops:P.hops};}};
boot();

})();
