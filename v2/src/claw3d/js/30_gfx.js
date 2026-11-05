/* =====================================================================================
   30. GRAPHICS — three.js. The three machines stand side by side in a little corner of the arcade. Each machine
   is a group placed in the room; everything inside it (case, claw, plush) uses the machine's own coordinates,
   the same ones the physics uses. Each plush is its painted mesh bent by its physics balls on the GPU.
   ===================================================================================== */
const GFX={R:null,scene:null,cam:null,mg:{},q:'med',tex:{},ok:false};
const QUAL={low:{dpr:1,shadow:512,sheen:false,aa:false},med:{dpr:1.5,shadow:1024,sheen:true,aa:true},high:{dpr:2,shadow:2048,sheen:true,aa:true}};
/* where each machine stands: x along the row, its case floor's height above the room floor, fronts in a line */
const MPOS={};
function placeMachines(){let x=0;const gap=.3,ow={sugar:.72,wild:1.24,titan:2.3};
  const order=MORDER,wid=order.map(id=>ow[id]);let tot=wid.reduce((a,b)=>a+b,0)+gap*(order.length-1);x=-tot/2;
  order.forEach((id,i)=>{const m=MACHINES[id];m.ow=wid[i];MPOS[id]=[x+wid[i]/2,m.hb,-m.box.z1];x+=wid[i]+gap;});
  const c=MPOS.wild[0];for(const id of order)MPOS[id][0]-=c;   /* Wildwood in the middle of the room */
}
function gfxInit(){
  const qp=(location.search.match(/[?&]q=(low|med|high)/)||[])[1],saved=store.get('hd-'+CAB.id+'-q','auto');
  GFX.q=qp||(saved!=='auto'?saved:(touchy?'med':'high'));
  const Q=QUAL[GFX.q];
  let R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:Q.aa,powerPreference:'high-performance'});}catch(e){$('err').style.display='grid';return false;}
  R.setPixelRatio(Math.min(devicePixelRatio||1,Q.dpr));R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;R.outputColorSpace=THREE.SRGBColorSpace;
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  GFX.R=R;GFX.scene=new THREE.Scene();GFX.scene.background=new THREE.Color('#07050d');GFX.scene.fog=new THREE.Fog('#07050d',6,16);
  GFX.cam=new THREE.PerspectiveCamera(38,1,.03,40);
  placeMachines();resize();return true;
}
function resize(){if(!GFX.R)return;const w=innerWidth,h=innerHeight;GFX.R.setSize(w,h,false);cv.style.width=w+'px';cv.style.height=h+'px';GFX.cam.aspect=w/h;GFX.cam.updateProjectionMatrix();}
function texOf(key,srgb=true,rep=false){const im=ASSETS.img[key];if(!im)return null;const t=new THREE.Texture(im);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.flipY=false;
  t.anisotropy=Math.min(8,GFX.R.capabilities.getMaxAnisotropy());if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.needsUpdate=true;return t;}
/* a texture drawn on a canvas (labels, the carpet, ornaments) */
function ctex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=Math.min(8,GFX.R.capabilities.getMaxAnisotropy());if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}return t;}
/* ---------- shared materials ---------- */
const MAT={};
const STD=(c,r,m=0,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m},o));
function makeMaterials(){
  MAT.chrome=STD('#f2f4f8',.16,1,{envMapIntensity:2.4});MAT.steel=STD('#c9ced6',.32,1,{envMapIntensity:1.8});
  MAT.black=STD('#0c0a0e',.8);MAT.rubber=STD('#151517',.75);MAT.hole=STD('#050306',1);MAT.cable=STD('#8a8e98',.4,.8);MAT.cord=STD('#121214',.45);
  /* glass: reflections only, added on top (a thin plane that is otherwise invisible) */
  MAT.glass=new THREE.MeshStandardMaterial({color:'#000000',roughness:.03,metalness:0,envMapIntensity:2.2,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  MAT.acrylic=new THREE.MeshPhysicalMaterial({color:'#d8ecff',roughness:.08,metalness:0,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
  MAT.glowTex=ctex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h);});
}
/* ---------- a kit: parts placed in a machine, merged into one mesh per material (few draw calls) ---------- */
const _m4=new THREE.Matrix4(),_e=new THREE.Euler(),_qq=new THREE.Quaternion(),_p3=new THREE.Vector3(),_s3=new THREE.Vector3();
class Kit{
  constructor(G){this.G=G;this.b=new Map();}
  add(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,o={}){
    _m4.compose(_p3.set(x,y,z),_qq.setFromEuler(_e.set(rx,ry,rz,o.order||'XYZ')),_s3.set(o.sx||1,o.sy||1,o.sz||1));geo.applyMatrix4(_m4);
    const key=mat.uuid+'|'+(o.cast?1:0)+(o.recv===false?0:1)+(o.ro||0);let e=this.b.get(key);if(!e){e={mat,cast:!!o.cast,recv:o.recv!==false,ro:o.ro||0,g:[]};this.b.set(key,e);}
    e.g.push(geo.index?geo.toNonIndexed():geo);return geo;}
  box(w,h,d,mat,x,y,z,o){return this.add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,o&&o.rx||0,o&&o.ry||0,o&&o.rz||0,o||{});}
  cyl(rt,rb,h,mat,x,y,z,o={}){return this.add(new THREE.CylinderGeometry(rt,rb,h,o.seg||20,1,!!o.open),mat,x,y,z,o.rx||0,o.ry||0,o.rz||0,o);}
  plane(w,h,mat,x,y,z,o={}){return this.add(new THREE.PlaneGeometry(w,h),mat,x,y,z,o.rx||0,o.ry||0,o.rz||0,o);}
  flush(){for(const e of this.b.values()){const g=mergeGeo(e.g),m=new THREE.Mesh(g,e.mat);m.castShadow=e.cast;m.receiveShadow=e.recv;m.renderOrder=e.ro;m.matrixAutoUpdate=false;m.updateMatrix();this.G.add(m);}this.b.clear();}
}
function mergeGeo(list){
  let n=0;for(const g of list)n+=g.attributes.position.count;
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
  for(const g of list){const c=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);if(g.attributes.normal)nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);o+=c;g.dispose();}
  const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.BufferAttribute(pos,3));r.setAttribute('normal',new THREE.BufferAttribute(nor,3));r.setAttribute('uv',new THREE.BufferAttribute(uv,2));r.computeBoundingSphere();return r;
}
/* a rounded rectangle extruded along z (fridge-like cabinet parts) */
function rrect(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function rbox(w,h,d,r,bev){bev=bev||0;const g=new THREE.ExtrudeGeometry(rrect(w-2*bev,h-2*bev,Math.max(.001,r-bev)),{depth:d-(bev||0)*2,bevelEnabled:!!bev,bevelThickness:bev||0,bevelSize:bev||0,bevelSegments:3,curveSegments:6});g.translate(0,0,-d/2+(bev||0));return g;}
/* ---------- the room: arcade carpet, a dark wall, a soft fill light on the cabinet fronts ---------- */
function buildRoom(){
  const sc=GFX.scene;
  const carpet=ctex(512,512,(g,w,h)=>{g.fillStyle='#0e0a22';g.fillRect(0,0,w,h);const R=mulberry(77),cols=['#ff3fa4','#3fe0ff','#ffd23f','#7dff5a','#a77bff'];
    for(let i=0;i<70;i++){const x=R()*w,y=R()*h,c=cols[(R()*cols.length)|0],s=10+R()*16,k=(R()*4)|0;g.save();g.translate(x,y);g.rotate(R()*TAU);g.globalAlpha=.55;g.strokeStyle=g.fillStyle=c;g.lineWidth=3;
      if(k===0){g.beginPath();g.moveTo(0,-s);g.lineTo(s*.9,s*.6);g.lineTo(-s*.9,s*.6);g.closePath();g.stroke();}
      else if(k===1){g.beginPath();g.arc(0,0,s*.5,0,TAU);g.fill();}
      else if(k===2){g.beginPath();for(let t=0;t<=1;t+=.1)g.lineTo(-s+t*2*s,Math.sin(t*TAU)*s*.35);g.stroke();}
      else{g.fillRect(-s*.4,-s*.1,s*.8,s*.2);g.fillRect(-s*.1,-s*.4,s*.2,s*.8);}g.restore();}},true);
  carpet.repeat.set(7,4);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(14,8),STD('#ffffff',.95,0,{map:carpet}));fl.rotation.x=-Math.PI/2;fl.position.set(0,0,-.5);fl.receiveShadow=true;sc.add(fl);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(14,5),STD('#1a1228',.9));wall.position.set(0,2.5,-1.75);sc.add(wall);
  const base=new THREE.Mesh(new THREE.BoxGeometry(14,.12,.04),STD('#2a1d3a',.6));base.position.set(0,.06,-1.73);sc.add(base);
  sc.add(new THREE.HemisphereLight('#bcc8ff','#2a1a20',.6));
  const fill=new THREE.DirectionalLight('#ffe8d0',.9);fill.position.set(.6,2.4,4);sc.add(fill,fill.target);
  const rim=new THREE.DirectionalLight('#9fc0ff',.5);rim.position.set(-1,2,-1.2);sc.add(rim);
  const im=ASSETS.img['extra/reflect'];if(im){const t=new THREE.Texture(im);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;
    const pm=new THREE.PMREMGenerator(GFX.R);sc.environment=pm.fromEquirectangular(t).texture;sc.environmentIntensity=.55;pm.dispose();}
  /* the claw's own little light under its housing, a soft spot on whatever is below it (follows the machine you play) */
  const cl=new THREE.SpotLight('#fff0d8',0,1.2,.5,.8,1.5);sc.add(cl,cl.target);GFX.clawSpot=cl;
}
/* one light per machine, inside the top of its case; only the machine in front of you casts shadows */
function machineLight(id){
  const m=MACHINES[id],C=m.box,P=MPOS[id],U=m.U,Q=QUAL[GFX.q];
  const sp=new THREE.SpotLight(m.light||'#ffdcae',(m.lightI||14)*Math.pow(U,1.2),3*U,.9,.55,1.2);sp.position.set(P[0]+.05*U,P[1]+C.top-.02*U,P[2]+.05*U);sp.target.position.set(P[0],P[1],P[2]);
  sp.shadow.mapSize.set(Q.shadow,Q.shadow);sp.shadow.bias=-.0004;sp.shadow.normalBias=.01*U;sp.shadow.camera.near=.2*U;sp.shadow.camera.far=C.top+m.hb+1.5*U;
  GFX.scene.add(sp,sp.target);return sp;
}
function setShadows(id){for(const k in GFX.mg){const L=GFX.mg[k].light;if(L)L.castShadow=k===id;}}
/* ---------- plush: one geometry per design, one material (its own uniforms) per toy in the case ---------- */
const PGEO={};
function plushGeometry(T){
  if(PGEO[T.id])return PGEO[T.id];const m=T.model,g=new THREE.BufferGeometry(),s=T.size;
  const pos=new Float32Array(m.nv*3);for(let i=0;i<m.nv*3;i++)pos[i]=m.pos[i]*s;
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(m.nrm,3));g.setAttribute('uv',new THREE.BufferAttribute(m.uv,2));
  const bi=new Float32Array(m.nv*4),bw=new Float32Array(m.nv*4);for(let i=0;i<m.nv*4;i++){bi[i]=m.bone[i];bw[i]=m.wt[i]/255;}
  g.setAttribute('aBone',new THREE.BufferAttribute(bi,4));g.setAttribute('aWt',new THREE.BufferAttribute(bw,4));g.setIndex(new THREE.BufferAttribute(m.idx,1));
  g.computeBoundingSphere();return PGEO[T.id]=g;
}
const NPM=64;
function skinInject(shader,U){
  Object.assign(shader.uniforms,U);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
uniform vec4 uP[${NPM}];uniform vec4 uQ[${NPM}];uniform mat3 uR;attribute vec4 aBone;attribute vec4 aWt;
vec3 skinP(vec3 p){vec3 o=vec3(0.);for(int k=0;k<4;k++){int b=int(aBone[k]+.5);o+=aWt[k]*(uP[b].xyz+uR*(p-uQ[b].xyz));}return o;}`)
    .replace('#include <beginnormal_vertex>','vec3 objectNormal=uR*vec3(normal);\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif')
    .replace('#include <begin_vertex>','vec3 transformed=skinP(vec3(position));');
}
function plushMaterial(T){
  const Q=QUAL[GFX.q],map=GFX.tex['p/'+T.id]||(GFX.tex['p/'+T.id]=texOf('p/'+T.id));
  const shiny=T.id==='hare'||T.id==='moth'||T.id==='donut',metal=T.id==='hare'||T.id==='donut';
  const mat=Q.sheen?new THREE.MeshPhysicalMaterial({map,roughness:shiny?.55:.92,metalness:metal?.25:0,sheen:1,sheenRoughness:.45,sheenColor:new THREE.Color(.7,.7,.7),sheenColorMap:map})
                   :new THREE.MeshStandardMaterial({map,roughness:.9});
  const U={uP:{value:Array.from({length:NPM},()=>new THREE.Vector4())},uQ:{value:Array.from({length:NPM},()=>new THREE.Vector4())},uR:{value:new THREE.Matrix3()}};
  const P=prepType(T);for(let k=0;k<P.n;k++)U.uQ.value[k].set(P.q[k*3]+P.c0[0],P.q[k*3+1]+P.c0[1],P.q[k*3+2]+P.c0[2],0);
  mat.onBeforeCompile=sh=>skinInject(sh,U);mat.customProgramCacheKey=()=>'plush'+(Q.sheen?1:0);
  const dm=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});dm.onBeforeCompile=sh=>skinInject(sh,U);dm.customProgramCacheKey=()=>'plushdepth';
  return {mat,dm,U};
}
/* the plush of the machine being simulated follow their balls; the other machines' plush stay as they were left */
function syncPlush(){
  const E=GFX.mg[MC.id],map=E.plush,seen=new Set();
  for(const b of BOD){let e=map.get(b.id);
    if(!e){const {mat,dm,U}=plushMaterial(b.T),mesh=new THREE.Mesh(plushGeometry(b.T),mat);mesh.customDepthMaterial=dm;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
      E.pg.add(mesh);e={mesh,U};map.set(b.id,e);}
    seen.add(b.id);
    if(!b.sleep||!e.slept){const P=e.U.uP.value;for(let k=0;k<b.n;k++){const i=b.i0+k;P[k].set(PX[i],PY[i],PZ[i],0);}
      const R=b.R;e.U.uR.value.set(R[0],R[1],R[2],R[3],R[4],R[5],R[6],R[7],R[8]);}
    e.slept=b.sleep;}
  for(const [id,e] of map)if(!seen.has(id)){E.pg.remove(e.mesh);e.mesh.material.dispose();e.mesh.customDepthMaterial.dispose();map.delete(id);}
}
/* ---------- build everything ---------- */
function buildWorld(){
  makeMaterials();buildRoom();
  for(const id of MORDER){const G=new THREE.Group(),P=MPOS[id];G.position.set(P[0],P[1],P[2]);G.updateMatrix();GFX.scene.add(G);
    const pg=new THREE.Group();G.add(pg);
    setMachine(id);const E=GFX.mg[id]={G,pg,plush:new Map(),bulbs:[],anim:[]};
    CABS[id](E);E.rig=buildRig(E,id);E.light=machineLight(id);}
}
/* in play only the machine in front of you is drawn; on the title screen all three */
function showMachines(all){for(const id in GFX.mg)GFX.mg[id].G.visible=all||id===MC.id;}
/* ---------- the camera ---------- */
const CAM={k:0,want:0,f:1,sl:1,from:null};
function camPose(id,kind){
  const m=MACHINES[id],C=m.box,U=m.U,asp=GFX.cam.aspect,port=asp<1;
  const vf=(port?52:38)*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*asp),fit=(w,h)=>Math.max(h/(2*Math.tan(vf/2)),w/(2*Math.tan(hf/2))),fov=vf*180/Math.PI;
  let p,t;
  if(kind==='side'){const c=Object.assign({se:.4,sy:.62},m.cam),n=fit(C.z1-C.z0+.25*U,C.top+.2*U);p=[C.x1+n*.95,c.sy*C.top+n*c.se,.02*U];t=[0,.42*C.top,0];}
  else if(kind==='full'){/* the whole machine, between the LED strip at the top and the name panel at the bottom */
    const F=m.frame,h=F.y1-F.y0,top=port?.075:.085,bot=port?.8:.765,fr=bot-top,cf=(top+bot)/2,n=fit(F.w/.92,h/fr),span=2*n*Math.tan(vf/2),cy=(F.y0+F.y1)/2,ty=cy-(.5-cf)*span;
    p=[0,ty+n*.1,C.z1+n];t=[0,ty,0];}
  else{const c=Object.assign({pe:.36,py:.6,tf:.44,fh:.12},m.cam),n=fit(C.x1-C.x0+.1*U,C.top+c.fh*U);p=[0,c.py*C.top+n*c.pe,C.z1+n];t=[0,c.tf*C.top,-.05*U];}
  return {p,t,fov};
}
const _a=new THREE.Vector3(),_b=new THREE.Vector3();
const lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
function camNow(){
  const id=MC.id,P=MPOS[id],e=CAM.k*CAM.k*(3-2*CAM.k);
  const A0=camPose(id,'play'),A1=camPose(id,'full'),B=camPose(id,'side');
  const A={p:lerp3(A0.p,A1.p,CAM.f),t:lerp3(A0.t,A1.t,CAM.f),fov:A0.fov};
  /* swing round the case on an arc, not through it */
  const ang=e*Math.PI/2,r0=Math.hypot(A.p[0],A.p[2]),r1=Math.hypot(B.p[0],B.p[2]),r=lerp(r0,r1,e);
  const p=[Math.sin(ang)*r+P[0],lerp(A.p[1],B.p[1],e)+P[1],Math.cos(ang)*r+P[2]],t=lerp3(A.t,B.t,e);t[0]+=P[0];t[1]+=P[1];t[2]+=P[2];
  return {p,t,fov:lerp(A.fov,B.fov,e)};
}
function camTick(dt){
  CAM.want=(M.ph==='aimZ'&&S.mode==='play'&&!S.demo)?1:0;
  CAM.fw=(S.mode==='play'&&!S.demo)?0:1;CAM.f+=(CAM.fw-CAM.f)*Math.min(1,dt*2);
  CAM.k+=(CAM.want-CAM.k)*Math.min(1,dt*3.2);
  let c=camNow();
  /* sliding along the row to another machine */
  if(CAM.sl<1&&CAM.from){CAM.sl=Math.min(1,CAM.sl+dt/.7);const s=CAM.sl*CAM.sl*(3-2*CAM.sl),f=CAM.from;
    /* a little pull back mid-slide, so you see the row */
    const back=Math.sin(s*Math.PI)*.35;c={p:lerp3(f.p,c.p,s),t:lerp3(f.t,c.t,s),fov:lerp(f.fov,c.fov,s)};c.p[2]+=back;c.p[1]+=back*.2;}
  const cam=GFX.cam;_a.set(c.p[0],c.p[1],c.p[2]);
  if(S.shake>0&&!reduce){const k=S.shake*.01*UNIT;_a.x+=(Math.random()-.5)*k;_a.y+=(Math.random()-.5)*k;}
  cam.position.copy(_a);_b.set(c.t[0],c.t[1],c.t[2]);cam.lookAt(_b);
  if(Math.abs(cam.fov-c.fov)>.01){cam.fov=c.fov;cam.updateProjectionMatrix();}
}
function camSlideFrom(){const cam=GFX.cam,d=new THREE.Vector3();cam.getWorldDirection(d);const t=cam.position.clone().addScaledVector(d,3);
  CAM.from={p:[cam.position.x,cam.position.y,cam.position.z],t:[t.x,t.y,t.z],fov:cam.fov};CAM.sl=0;}
/* screen point -> where it lands on a vertical plane through the claw (for dragging the claw with a finger), in machine coordinates */
const _ray=new THREE.Raycaster(),_ndc=new THREE.Vector2(),_pl=new THREE.Plane(),_hit=new THREE.Vector3(),_nz=new THREE.Vector3(0,0,1),_nx=new THREE.Vector3(1,0,0);
function screenToWorld(px,py,axis){
  const P=MPOS[MC.id];_ndc.set(px/innerWidth*2-1,-(py/innerHeight)*2+1);_ray.setFromCamera(_ndc,GFX.cam);
  if(axis==='x')_pl.set(_nz,-(CL.gz+P[2]));else _pl.set(_nx,-(CL.gx+P[0]));
  return _ray.ray.intersectPlane(_pl,_hit)?(axis==='x'?_hit.x-P[0]:_hit.z-P[2]):null;
}
function render(dt){camTick(dt);showMachines(CAM.f>.6||CAM.sl<1);drawRig(GFX.mg[MC.id].rig);syncPlush();animCabs(dt);GFX.R.render(GFX.scene,GFX.cam);}
