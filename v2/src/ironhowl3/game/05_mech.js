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
