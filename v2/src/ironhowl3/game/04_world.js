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
function addCol(x,z,r,h){const k=colKey(x,z);if(!VEG.cols.has(k))VEG.cols.set(k,[]);VEG.cols.get(k).push({x,z,r,h:h||9});}
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
  if(c.collider&&kind==='tree')addCol(x,z,c.collider.r*s+.1,c.size_m[1]*s);
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
