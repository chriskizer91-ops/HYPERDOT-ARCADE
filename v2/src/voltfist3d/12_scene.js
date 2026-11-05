/* ===================== the 3D scene: camera, lights, smoothing between fight steps ===================== */
const SCENE=new THREE.Scene();
const CAM3=new THREE.PerspectiveCamera(30,16/9,.1,600);
CAM3.position.set(0,1.3,6);
const SUN=new THREE.DirectionalLight(0xffffff,2.2);
SUN.shadow.camera.left=-7;SUN.shadow.camera.right=7;SUN.shadow.camera.top=6;SUN.shadow.camera.bottom=-2;SUN.shadow.camera.near=1;SUN.shadow.camera.far=40;
SUN.shadow.bias=-.0006;SUN.shadow.normalBias=.02;
const HEMI=new THREE.HemisphereLight(0x8070c0,0x201830,1);
SCENE.add(SUN,SUN.target,HEMI,ACTORG);
const STAGEG=new THREE.Group(),STUDIOG=new THREE.Group(),FXG=new THREE.Group();
SCENE.add(STAGEG,STUDIOG,FXG);
function applyShadowQuality(){
  const q=Q();SUN.castShadow=q.shadow>0;
  if(q.shadow>0&&SUN.shadow.mapSize.x!==q.shadow){SUN.shadow.mapSize.set(q.shadow,q.shadow);if(SUN.shadow.map){SUN.shadow.map.dispose();SUN.shadow.map=null;}}
  renderer&&(renderer.shadowMap.type=q.id==='high'?THREE.PCFSoftShadowMap:THREE.PCFShadowMap);
}
applyShadowQuality();QUALCB.push(applyShadowQuality);

/* moving lights: effects ask for light each frame; the brightest few get the real lights */
const LPOOL=[];for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffffff,0,6,2);l.visible=i<Q().lights;SCENE.add(l);LPOOL.push(l);}
QUALCB.push(()=>{for(let i=0;i<LPOOL.length;i++)LPOOL[i].visible=i<Q().lights;});
const LREQ=[];
function lightReq(x,y,z,col,int,dist){if(LREQ.length<80&&int>.05)LREQ.push({x,y,z,c:col,i:int,d:dist||6});}
function applyLights(){
  LREQ.sort((a,b)=>b.i-a.i);const n=Q().lights;
  for(let i=0;i<LPOOL.length;i++){const l=LPOOL[i],r=i<n?LREQ[i]:null;
    if(r){l.position.set(r.x,r.y,r.z);l.color.setRGB(r.c[0]/255,r.c[1]/255,r.c[2]/255);l.intensity=r.i;l.distance=r.d;}else l.intensity=0;}
  LREQ.length=0;
}

/* ---------- smoothing: the fight steps at 60 Hz; the picture is drawn between the last two steps ---------- */
const SNAP={alpha:1};
function snapActor(F){
  const s=F._s||(F._s={x:0,y:0,px:0,py:0,J:{},PJ:{},ch:[],pch:[],init:false});
  const cp=(src,dst)=>{for(const k of JPTS){const v=src[k];if(!v)continue;const d=dst[k]||(dst[k]=[0,0]);d[0]=v[0];d[1]=v[1];}
    for(const k of ['C','hu','hfw','dir','q','H']){const v=src[k];if(!v)continue;const d=dst[k]||(dst[k]=[0,0]);d[0]=v[0];d[1]=v[1];}dst.R=src.R;};
  if(s.init){s.px=s.x;s.py=s.y;const t=s.PJ;s.PJ=s.J;s.J=t;}
  s.x=F.x;s.y=F.y;cp(F.Jr,s.J);
  if(!s.init||Math.abs(s.x-s.px)>1.5){s.px=s.x;s.py=s.y;cp(F.Jr,s.PJ);}
  /* cloth */
  for(let i=0;i<F.chains.length;i++){const ch=F.chains[i];if(!ch.p)continue;
    const a=s.ch[i]||(s.ch[i]=ch.p.map(p=>[p[0],p[1]])),b=s.pch[i]||(s.pch[i]=ch.p.map(p=>[p[0],p[1]]));
    for(let k=0;k<ch.p.length;k++){b[k][0]=s.init?a[k][0]:ch.p[k][0];b[k][1]=s.init?a[k][1]:ch.p[k][1];a[k][0]=ch.p[k][0];a[k][1]=ch.p[k][1];}}
  s.init=true;
}
const _IJ={},_IC=[];
function interpActor(F,al){
  const s=F._s;if(!s)return {x:F.x,y:F.y,J:F.Jr,chains:F.chains};
  for(const k in s.J){const a=s.PJ[k],b=s.J[k];if(!a||typeof b==='number')continue;const d=_IJ[k]||(_IJ[k]=[0,0]);d[0]=a[0]+(b[0]-a[0])*al;d[1]=a[1]+(b[1]-a[1])*al;}
  /* keep the direction vectors unit length */
  for(const k of ['dir','q','hu','hfw']){const d=_IJ[k];if(d){const l=Math.hypot(d[0],d[1])||1;d[0]/=l;d[1]/=l;}}
  _IJ.R=s.J.R;
  const chains=[],IC=s.ic||(s.ic=[]);for(let i=0;i<s.ch.length;i++){const a=s.pch[i],b=s.ch[i];if(!a){chains.push(F.chains[i]);continue;}
    const p=IC[i]||(IC[i]=b.map(()=>[0,0]));for(let k=0;k<b.length;k++){p[k][0]=a[k][0]+(b[k][0]-a[k][0])*al;p[k][1]=a[k][1]+(b[k][1]-a[k][1])*al;}chains.push({p});}
  return {x:s.px+(s.x-s.px)*al,y:s.py+(s.y-s.py)*al,J:_IJ,chains};
}
function snapWorld(){
  for(const p of PROJ){if(p._sx===undefined){p._px=p.x;p._py=p.y;}else{p._px=p._sx;p._py=p._sy;}p._sx=p.x;p._sy=p.y;}
  for(const p of FXL){if(p._z===undefined){initFxZ(p);}else stepFxZ(p);}
  const c=CAM._s||(CAM._s={x:CAM.x,y:CAM.y,vh:CAM.vh,px:CAM.x,py:CAM.y,pvh:CAM.vh});
  c.px=c.x;c.py=c.y;c.pvh=c.vh;c.x=CAM.x;c.y=CAM.y;c.vh=CAM.vh;
}
/* wrap the original fight step: run it unchanged, then remember where everything was */
const _fightStep=fightStep;
fightStep=function(){
  _fightStep();
  if(!FIGHT)return;
  for(const F of FIGHT.f){snapActor(F);fxStepHook(F);}
  snapWorld();projStepHook();
};
