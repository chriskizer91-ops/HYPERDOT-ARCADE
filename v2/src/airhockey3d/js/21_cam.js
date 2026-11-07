/* =====================================================================================
   21. CAMERA — the director.
       p1:     from behind your end, looking down the table. It's fitted to the screen so the
               whole table shows, steeper on an upright phone. It holds still while you play
               (your finger maps straight onto the deck), with a small shake on a big hit.
       top:    two players: straight down, the table along the screen's long side.
               On a laptop player 1 is on the right (the arrow keys), player 2 on the left (WASD).
       demo:   a slow orbit for the attract loop.
       replay: low at the side of the goal that was scored on.
   ===================================================================================== */
const CAM={mode:'demo',k:1,dur:1,from:null,e:new THREE.Vector3(0,2.6,3),t:new THREE.Vector3(0,TB.DECK,0),up:new THREE.Vector3(0,1,0),fov:50,fit:{},orb:0,rs:1};
const _fc=new THREE.PerspectiveCamera();
const TABLE_PTS=(()=>{const x=TB.HW+RL.sideW+.012,z=TB.HL+RL.endW+.012,a=[];for(const sx of [-1,1])for(const sz of [-1,1])for(const y of [TB.DECK-.03,TB.DECK+RL.h])a.push(new THREE.Vector3(sx*x,y,sz*z));return a;})();
/* fit: find the distance (and the aim point along the table) that puts the whole table inside the screen,
   below the score bar and clear of the edges */
function fitView(pitch,fov,up){
  const asp=innerWidth/Math.max(1,innerHeight),sa=parseFloat(getComputedStyle($('sa')).paddingTop)||0;
  const topPx=(EMBED||touchy?8:50)+sa+Math.max(26,innerHeight*.07),botPx=10+(touchy||EMBED?18:6),sidePx=8;
  const ny0=-1+2*botPx/innerHeight,ny1=1-2*topPx/innerHeight,nx=1-2*sidePx/innerWidth;
  _fc.fov=fov;_fc.aspect=asp;_fc.near=.05;_fc.far=60;_fc.updateProjectionMatrix();
  const d=new THREE.Vector3(),tg=new THREE.Vector3(0,TB.DECK,0);
  if(up)d.set(0,-1,0);else d.set(0,-Math.sin(pitch),-Math.cos(pitch));
  const v=new THREE.Vector3();let lo=.5,hi=12,shift=0;
  const test=dist=>{_fc.position.copy(tg).addScaledVector(d,-dist);if(up)_fc.up.copy(up);else _fc.up.set(0,1,0);_fc.lookAt(tg);_fc.updateMatrixWorld();
    let x0=9,x1=-9,y0=9,y1=-9;for(const p of TABLE_PTS){v.copy(p).project(_fc);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}
    return {x0,x1,y0,y1};};
  for(let it=0;it<4;it++){
    lo=.5;hi=14;for(let i=0;i<28;i++){const m=(lo+hi)/2,b=test(m);if(b.x0<-nx||b.x1>nx||(b.y1-b.y0)>(ny1-ny0))lo=m;else hi=m;}
    /* centre it vertically in the free band: slide the aim point along the screen's up direction on the deck */
    const b=test(hi),want=(ny0+ny1)/2,have=(b.y0+b.y1)/2,err=have-want;
    const sv=new THREE.Vector3(0,1,0).applyQuaternion(_fc.quaternion);sv.y=0;if(sv.lengthSq()<1e-6)break;sv.normalize();
    tg.addScaledVector(sv,err*hi*Math.tan(fov*Math.PI/360)*.9);shift+=err;
  }
  test(hi);return {e:_fc.position.clone(),t:tg.clone(),fov,up:_fc.up.clone()};
}
function camFits(){
  const portrait=innerHeight>innerWidth*1.05;
  CAM.fit.p1=fitView(portrait?1.13:.9,portrait?52:42);
  CAM.fit.top=fitView(0,portrait?46:40,portrait?new THREE.Vector3(0,0,-1):new THREE.Vector3(1,0,0));
}
function viewFor(mode){
  if(mode==='p1'||mode==='top')return CAM.fit[mode];
  if(mode==='demo'){const a=CAM.orb,r=3.0,pt=innerHeight>innerWidth;return {e:new THREE.Vector3(Math.sin(a)*r,TB.DECK+1.5+Math.sin(a*.7)*.2,Math.cos(a)*r),t:new THREE.Vector3(0,TB.DECK+(pt?.05:.22),0),fov:pt?58:46,up:new THREE.Vector3(0,1,0)};}
  if(mode==='replay'){const s=CAM.rs,f=replayFrame(),pk=f&&f.p[0]?f.p[0]:[0,s*.6],tx=clamp(pk[0],-.35,.35)*.6,tz=clamp(pk[1],-1,1);
    return {e:new THREE.Vector3(.95,TB.DECK+.32,s*(TB.HL+.55)),t:new THREE.Vector3(tx,TB.DECK+.02,lerp(s*.55,tz,.5)),fov:44,up:new THREE.Vector3(0,1,0)};}
  return CAM.fit.p1;
}
function camStart(mode,quick){
  CAM.from={e:CAM.e.clone(),t:CAM.t.clone(),fov:CAM.fov,up:CAM.up.clone()};CAM.mode=mode;CAM.k=0;CAM.dur=quick?.45:mode==='demo'?.01:1.25;
  if(!CAM.fit.p1)camFits();
}
function camReplay(side){CAM.rs=side;camStart('replay',true);}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function camTick(dt){
  CAM.orb+=dt*.11;CAM.k=Math.min(1,CAM.k+dt/CAM.dur);
  const v=viewFor(CAM.mode),f=CAM.from,k=f?ease(CAM.k):1;
  if(f&&k<1){CAM.e.lerpVectors(f.e,v.e,k);CAM.t.lerpVectors(f.t,v.t,k);CAM.fov=lerp(f.fov,v.fov,k);CAM.up.lerpVectors(f.up,v.up,k).normalize();
    /* the swoop rises a little through the middle */
    CAM.e.y+=Math.sin(k*Math.PI)*.35*(CAM.mode==='p1'||CAM.mode==='top'?1:0);}
  else{CAM.e.copy(v.e);CAM.t.copy(v.t);CAM.fov=v.fov;CAM.up.copy(v.up);}
}
function applyCam(){
  CAM3.fov=CAM.fov;CAM3.aspect=innerWidth/Math.max(1,innerHeight);CAM3.updateProjectionMatrix();
  CAM3.position.copy(CAM.e);CAM3.up.copy(CAM.up);
  if(S.shake>0&&!reduce){const s=S.shake*.006;CAM3.position.x+=(Math.random()-.5)*s;CAM3.position.y+=(Math.random()-.5)*s;CAM3.position.z+=(Math.random()-.5)*s;}
  CAM3.lookAt(CAM.t);CAM3.updateMatrixWorld();
}
