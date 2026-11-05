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
