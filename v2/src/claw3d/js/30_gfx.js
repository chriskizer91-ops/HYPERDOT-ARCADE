/* =====================================================================================
   30. GRAPHICS — three.js. The case, the claw, the lights, and the plush: each plush is its painted mesh
   bent by its physics balls on the GPU (every vertex follows its 4 nearest balls, turned with the body).
   ===================================================================================== */
const GFX={R:null,scene:null,cam:null,plush:new Map(),claw:null,q:'med',tex:{},env:null,ok:false};
const QUAL={low:{dpr:1,shadow:512,sheen:false,aa:false},med:{dpr:1.5,shadow:1024,sheen:true,aa:true},high:{dpr:2,shadow:2048,sheen:true,aa:true}};
function gfxInit(){
  const qp=(location.search.match(/[?&]q=(low|med|high)/)||[])[1],saved=store.get('hd-'+CAB.id+'-q','auto');
  GFX.q=qp||(saved!=='auto'?saved:(touchy?'med':'high'));
  const Q=QUAL[GFX.q];
  let R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:Q.aa,powerPreference:'high-performance'});}catch(e){$('err').style.display='grid';return false;}
  R.setPixelRatio(Math.min(devicePixelRatio||1,Q.dpr));R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;R.outputColorSpace=THREE.SRGBColorSpace;
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  GFX.R=R;GFX.scene=new THREE.Scene();GFX.scene.background=new THREE.Color('#0b0712');
  GFX.cam=new THREE.PerspectiveCamera(38,1,.03,30);
  resize();return true;
}
function resize(){if(!GFX.R)return;const w=innerWidth,h=innerHeight;GFX.R.setSize(w,h,false);cv.style.width=w+'px';cv.style.height=h+'px';GFX.cam.aspect=w/h;GFX.cam.updateProjectionMatrix();}
function texOf(key,srgb=true,rep=false){const im=ASSETS.img[key];if(!im)return null;const t=new THREE.Texture(im);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.flipY=false;
  t.anisotropy=Math.min(8,GFX.R.capabilities.getMaxAnisotropy());if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.needsUpdate=true;return t;}
/* ---------- materials ---------- */
const MAT={};
function makeMaterials(){
  const S=(c,r,m=0,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m},o));
  MAT.paint=S('#22392a',.55);MAT.trim=S('#a8743f',.6);MAT.darkwood=S('#2a1d14',.7);MAT.brass=S('#d2a957',.3,1,{envMapIntensity:1.8});
  MAT.chrome=S('#f2f4f8',.2,1,{envMapIntensity:2.4});MAT.rubber=S('#b0283a',.6);MAT.black=S('#0c0a0e',.8);
  const felt=texOf('fab/felt',true,true);if(felt)felt.repeat.set(5,4);
  MAT.floor=S('#4a6a34',1,0,{map:felt});
  const wall=texOf('mach/wild_wall');MAT.wall=new THREE.MeshStandardMaterial({map:wall,emissiveMap:wall,emissive:new THREE.Color('#ffffff'),emissiveIntensity:.35,roughness:.9});
  /* glass: reflections only, added on top (a thin plane that is otherwise invisible) */
  MAT.glass=new THREE.MeshStandardMaterial({color:'#000000',roughness:.03,metalness:0,envMapIntensity:2.2,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  MAT.acrylic=new THREE.MeshPhysicalMaterial({color:'#d8ecff',roughness:.08,metalness:0,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
  MAT.hole=S('#050306',1);
  const mq=texOf('mach/wild_marquee');MAT.marquee=new THREE.MeshStandardMaterial({map:mq,emissiveMap:mq,emissive:new THREE.Color('#ffffff'),emissiveIntensity:.8,roughness:.6});
  MAT.bulb=new THREE.MeshStandardMaterial({color:'#ffd39a',emissive:new THREE.Color('#ffb860'),emissiveIntensity:2.2,roughness:.3});
  MAT.cable=S('#8a8e98',.4,.8);
}
/* ---------- the case (Wildwood) ---------- */
function box(w,h,d,m,x,y,z,cast=true,recv=true){const g=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);g.position.set(x,y,z);g.castShadow=cast;g.receiveShadow=recv;GFX.scene.add(g);return g;}
function buildCase(){
  const C=CASE,sc=GFX.scene,W=C.x1-C.x0,D=C.z1-C.z0,H=C.top;
  /* floor mat, back painting, glass sides and front, the top */
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D),MAT.floor);fl.rotation.x=-Math.PI/2;fl.position.set(0,0,0);fl.receiveShadow=true;sc.add(fl);
  const wl=new THREE.Mesh(new THREE.PlaneGeometry(W,H),MAT.wall);wl.position.set(0,H/2,C.z0-.002);wl.receiveShadow=true;sc.add(wl);
  for(const [x,ry] of [[C.x0,Math.PI/2],[C.x1,-Math.PI/2]]){const g=new THREE.Mesh(new THREE.PlaneGeometry(D,H),MAT.glass);g.position.set(x,H/2,0);g.rotation.y=ry;g.renderOrder=5;sc.add(g);}
  const fg=new THREE.Mesh(new THREE.PlaneGeometry(W,H-.02),MAT.glass);fg.position.set(0,H/2+.01,C.z1+.004);fg.renderOrder=6;sc.add(fg);GFX.front=fg;
  box(W+.12,.06,D+.12,MAT.paint,0,H+.03,0,false);
  /* corner posts and trim (light wood), the lower cabinet (green paint), the control deck */
  for(const x of [C.x0-.03,C.x1+.03])for(const z of [C.z0-.03,C.z1+.03])box(.05,H+.08,.05,MAT.trim,x,H/2,z);
  for(const z of [C.z0-.03,C.z1+.03])box(W+.12,.04,.05,MAT.trim,0,H+.07,z);
  box(W+.12,.9,D+.12,MAT.paint,0,-.45-.02,0);box(W+.14,.03,D+.14,MAT.trim,0,-.032,0);
  box(W+.12,.08,.26,MAT.darkwood,0,-.07,C.z1+.16);box(.045,.06,.045,MAT.brass,-.12,-.0,C.z1+.17);
  const btn=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.025,24),new THREE.MeshStandardMaterial({color:'#2dc85a',emissive:new THREE.Color('#1aff6a'),emissiveIntensity:.6,roughness:.3}));btn.position.set(.12,-.02,C.z1+.17);sc.add(btn);
  /* the marquee above */
  const mq=new THREE.Mesh(new THREE.PlaneGeometry(W+.1,(W+.1)/3),MAT.marquee);mq.position.set(0,H+.08+(W+.1)/6,C.z1+.03);sc.add(mq);
  box(W+.16,(W+.1)/3+.04,.04,MAT.darkwood,0,H+.08+(W+.1)/6,C.z1+.005,false);
  /* the prize chute: an acrylic box in the front-left corner over a dark shaft */
  const cw=C.cx-C.x0,cd=C.z1-C.cz;
  const a1=new THREE.Mesh(new THREE.PlaneGeometry(cd,C.ch),MAT.acrylic);a1.rotation.y=Math.PI/2;a1.position.set(C.cx,C.ch/2,(C.cz+C.z1)/2);a1.renderOrder=4;sc.add(a1);
  const a2=new THREE.Mesh(new THREE.PlaneGeometry(cw,C.ch),MAT.acrylic);a2.position.set((C.x0+C.cx)/2,C.ch/2,C.cz);a2.renderOrder=4;sc.add(a2);
  box(.012,.012,cd,MAT.brass,C.cx,C.ch,(C.cz+C.z1)/2,false);box(cw,.012,.012,MAT.brass,(C.x0+C.cx)/2,C.ch,C.cz,false);
  const ho=new THREE.Mesh(new THREE.PlaneGeometry(cw,cd),MAT.hole);ho.rotation.x=-Math.PI/2;ho.position.set((C.x0+C.cx)/2,.002,(C.cz+C.z1)/2);sc.add(ho);
  /* the gantry: rails along each side, a beam across at the carriage's depth, the carriage */
  for(const x of [C.x0+.02,C.x1-.02])box(.025,.03,D,MAT.brass,x,CS.GY+.025,0,true,false);
  GFX.beam=box(W-.02,.025,.03,MAT.brass,0,CS.GY+.025,0,true,false);
  GFX.car=box(.07,.05,.06,MAT.darkwood,0,CS.GY+.02,0,true,false);
  /* Edison bulbs along the front top */
  for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.016,12,10),MAT.bulb);b.position.set(C.x0+.08+i*(W-.16)/4,H-.03,C.z1-.04);sc.add(b);}
}
function buildLights(){
  const sc=GFX.scene,C=CASE,Q=QUAL[GFX.q];
  const sp=new THREE.SpotLight('#ffdcae',14,3,.95,.55,1.2);sp.position.set(.05,C.top-.02,.05);sp.target.position.set(0,0,0);sp.castShadow=true;
  sp.shadow.mapSize.set(Q.shadow,Q.shadow);sp.shadow.bias=-.0004;sp.shadow.normalBias=.01;sp.shadow.camera.near=.2;sp.shadow.camera.far=1.4;sc.add(sp,sp.target);GFX.spot=sp;
  for(const x of [-.3,.3]){const p=new THREE.PointLight('#ffb468',1.2,2.2,1.4);p.position.set(x,C.top-.08,C.z1-.08);sc.add(p);}
  sc.add(new THREE.HemisphereLight('#bcd0ff','#2a1a20',.55));
  const rim=new THREE.DirectionalLight('#9fc0ff',.6);rim.position.set(-1,1.5,-1.2);sc.add(rim);
  /* the claw's own little light under its housing, a soft spot on whatever is below it */
  const cl=new THREE.SpotLight('#fff0d8',0,1.2,.5,.8,1.5);sc.add(cl,cl.target);GFX.clawSpot=cl;
  const im=ASSETS.img['extra/reflect'];if(im){const t=new THREE.Texture(im);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;
    const pm=new THREE.PMREMGenerator(GFX.R);sc.environment=pm.fromEquirectangular(t).texture;sc.environmentIntensity=.55;pm.dispose();}
}
/* ---------- the claw ---------- */
function buildClaw(){
  const sc=GFX.scene,g={};
  g.cable=new THREE.Mesh(new THREE.CylinderGeometry(.0025,.0025,1,6),MAT.cable);g.cable.castShadow=true;sc.add(g.cable);
  g.head=new THREE.Group();sc.add(g.head);
  const bell=new THREE.Mesh(new THREE.CylinderGeometry(CS.RH*.62,CS.RH*.9,.055,24,1),MAT.chrome);bell.position.y=.012;bell.castShadow=true;g.head.add(bell);
  const ribs=new THREE.Mesh(new THREE.CylinderGeometry(CS.RH*.66,CS.RH*.66,.03,24,1,true),new THREE.MeshStandardMaterial({color:'#d8dce4',roughness:.25,metalness:1,wireframe:false}));ribs.position.y=.05;g.head.add(ribs);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(CS.RH*.95,CS.RH*.95,.012,24),MAT.brass);col.position.y=-.018;col.castShadow=true;g.head.add(col);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(CS.RH*.35,14,10),MAT.chrome);cap.position.y=.07;g.head.add(cap);
  const seg=new THREE.CylinderGeometry(CS.RC,CS.RC,1,10);seg.translate(0,.5,0);
  g.seg=[];for(let s=0;s<6;s++){const m=new THREE.Mesh(seg,MAT.chrome);m.castShadow=true;sc.add(m);g.seg.push(m);}
  const joint=new THREE.SphereGeometry(CS.RC*1.25,10,8),pad=new THREE.SphereGeometry(CS.RC*1.35,10,8);
  g.j=[];g.pad=[];for(let s=0;s<3;s++){const j=new THREE.Mesh(joint,MAT.chrome);sc.add(j);g.j.push(j);const p=new THREE.Mesh(pad,MAT.rubber);p.castShadow=true;sc.add(p);g.pad.push(p);}
  GFX.claw=g;
}
const _v=new THREE.Vector3(),_u=new THREE.Vector3(0,1,0),_q=new THREE.Quaternion();
function placeSeg(m,ax,ay,az,bx,by,bz){_v.set(bx-ax,by-ay,bz-az);const l=_v.length()||1e-6;m.position.set(ax,ay,az);_q.setFromUnitVectors(_u,_v.multiplyScalar(1/l));m.quaternion.copy(_q);m.scale.set(1,l,1);}
function drawClaw(){
  const g=GFX.claw;clawFrame();
  GFX.beam.position.z=CL.gz;GFX.car.position.set(CL.gx,CS.GY+.035,CL.gz);
  const tx=CL.hx+CL.ux*.075,ty=CL.hy+CL.uy*.075,tz=CL.hz+CL.uz*.075;placeSeg(g.cable,tx,ty,tz,CL.gx,CS.GY+.02,CL.gz);
  g.head.position.set(CL.hx,CL.hy,CL.hz);_v.set(CL.ux,CL.uy,CL.uz);g.head.quaternion.setFromUnitVectors(_u,_v);
  for(let s=0;s<3;s++){const vis=s<CS.npr;g.j[s].visible=g.pad[s].visible=vis;g.seg[s*2].visible=g.seg[s*2+1].visible=vis;if(!vis)continue;const o=s*9;
    placeSeg(g.seg[s*2],PG[o],PG[o+1],PG[o+2],PG[o+3],PG[o+4],PG[o+5]);placeSeg(g.seg[s*2+1],PG[o+3],PG[o+4],PG[o+5],PG[o+6],PG[o+7],PG[o+8]);
    g.j[s].position.set(PG[o+3],PG[o+4],PG[o+5]);g.pad[s].position.set(PG[o+6],PG[o+7],PG[o+8]);}
  const cs=GFX.clawSpot;cs.intensity=M.beam*3;cs.position.set(CL.hx,CL.hy-.02,CL.hz);cs.target.position.set(CL.hx,0,CL.hz);
}
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
  const shiny=T.id==='hare'||T.id==='moth';
  const mat=Q.sheen?new THREE.MeshPhysicalMaterial({map,roughness:shiny?.55:.92,metalness:shiny&&T.id==='hare'?.25:0,sheen:1,sheenRoughness:.45,sheenColor:new THREE.Color(.7,.7,.7),sheenColorMap:map})
                   :new THREE.MeshStandardMaterial({map,roughness:.9});
  const U={uP:{value:Array.from({length:NPM},()=>new THREE.Vector4())},uQ:{value:Array.from({length:NPM},()=>new THREE.Vector4())},uR:{value:new THREE.Matrix3()}};
  const P=prepType(T);for(let k=0;k<P.n;k++)U.uQ.value[k].set(P.q[k*3]+P.c0[0],P.q[k*3+1]+P.c0[1],P.q[k*3+2]+P.c0[2],0);
  mat.onBeforeCompile=sh=>skinInject(sh,U);mat.customProgramCacheKey=()=>'plush'+(Q.sheen?1:0);
  const dm=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});dm.onBeforeCompile=sh=>skinInject(sh,U);dm.customProgramCacheKey=()=>'plushdepth';
  return {mat,dm,U};
}
function syncPlush(){
  const seen=new Set();
  for(const b of BOD){let e=GFX.plush.get(b.id);
    if(!e){const {mat,dm,U}=plushMaterial(b.T),mesh=new THREE.Mesh(plushGeometry(b.T),mat);mesh.customDepthMaterial=dm;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
      GFX.scene.add(mesh);e={mesh,U};GFX.plush.set(b.id,e);}
    seen.add(b.id);
    if(!b.sleep||!e.slept){const P=e.U.uP.value;for(let k=0;k<b.n;k++){const i=b.i0+k;P[k].set(PX[i],PY[i],PZ[i],0);}
      const R=b.R;e.U.uR.value.set(R[0],R[1],R[2],R[3],R[4],R[5],R[6],R[7],R[8]);}
    e.slept=b.sleep;}
  for(const [id,e] of GFX.plush)if(!seen.has(id)){GFX.scene.remove(e.mesh);e.mesh.material.dispose();e.mesh.customDepthMaterial.dispose();GFX.plush.delete(id);}
}
/* ---------- the camera: in front of the glass while you set left-right, round to the side while you set depth ---------- */
const CAM={k:0,want:0,shake:0};
function camPose(side,full){
  const C=CASE,asp=GFX.cam.aspect,port=asp<1;
  /* fit a box of w x h metres to the screen whatever its shape, with room for the strip at the top */
  const vf=(port?52:38)*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*asp),fit=(w,h)=>Math.max(h/(2*Math.tan(vf/2)),w/(2*Math.tan(hf/2))),fov=vf*180/Math.PI;
  if(side){const n=fit(.95,1.2);return {p:[C.x1+n*.95,.62+n*.4,.02],t:[0,.42,0],fov};}
  if(full){const n=fit(1.08,1.5);return {p:[0,.66+n*.38,C.z1+n],t:[0,.56,-.04],fov};}   /* the whole machine, marquee and all */
  const n=fit(1.0,1.12);return {p:[0,.6+n*.36,C.z1+n],t:[0,.44,-.05],fov};               /* playing: the case, close to the glass */
}
const _a=new THREE.Vector3(),_b=new THREE.Vector3();
function camTick(dt){
  CAM.want=(M.ph==='aimZ'&&S.mode==='play'&&!S.demo)?1:0;
  CAM.fw=(S.mode==='play'&&!S.demo)?0:1;CAM.f=CAM.f??1;CAM.f+=(CAM.fw-CAM.f)*Math.min(1,dt*2);
  CAM.k+=(CAM.want-CAM.k)*Math.min(1,dt*3.2);const e=CAM.k*CAM.k*(3-2*CAM.k);
  const A0=camPose(false,false),A1=camPose(false,true),f=CAM.f,B=camPose(true,false),cam=GFX.cam;
  const A={p:A0.p.map((v,i)=>lerp(v,A1.p[i],f)),t:A0.t.map((v,i)=>lerp(v,A1.t[i],f)),fov:A0.fov};
  /* swing round the case on an arc, not through it */
  const ang=e*Math.PI/2,r0=Math.hypot(A.p[0],A.p[2]),r1=Math.hypot(B.p[0],B.p[2]),r=lerp(r0,r1,e);
  _a.set(Math.sin(ang)*r,lerp(A.p[1],B.p[1],e),Math.cos(ang)*r);
  if(S.shake>0&&!reduce){_a.x+=(Math.random()-.5)*S.shake*.01;_a.y+=(Math.random()-.5)*S.shake*.01;}
  cam.position.copy(_a);_b.set(lerp(A.t[0],B.t[0],e),lerp(A.t[1],B.t[1],e),lerp(A.t[2],B.t[2],e));cam.lookAt(_b);
  const fov=lerp(A.fov,B.fov,e);if(Math.abs(cam.fov-fov)>.01){cam.fov=fov;cam.updateProjectionMatrix();}
}
/* screen point -> where it lands on a vertical plane through the claw (for dragging the claw with a finger) */
const _ray=new THREE.Raycaster(),_ndc=new THREE.Vector2(),_pl=new THREE.Plane(),_hit=new THREE.Vector3();
function screenToWorld(px,py,axis){
  _ndc.set(px/innerWidth*2-1,-(py/innerHeight)*2+1);_ray.setFromCamera(_ndc,GFX.cam);
  if(axis==='x')_pl.set(new THREE.Vector3(0,0,1),-CL.gz);else _pl.set(new THREE.Vector3(1,0,0),-CL.gx);
  return _ray.ray.intersectPlane(_pl,_hit)?(axis==='x'?_hit.x:_hit.z):null;
}
function render(dt){camTick(dt);drawClaw();syncPlush();GFX.R.render(GFX.scene,GFX.cam);}
