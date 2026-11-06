/* =====================================================================================
   33. THE WIN CLOSE-UP — a won plush drops down the chute and tumbles out of the prize door toward you; the camera
   comes in close, the plush turns once with its name and tickets, then it goes off to your collection.
   Tap (or any button) skips to the end. Only in a real game, not in the demo.
   ===================================================================================== */
const SHOW={q:[],cur:null,t:0,w:0,mesh:{},dmat:{},wait:0};
const SH={pop:.8,rise:1.4,spin:3.6,end:4.2};
function showBusy(){return !!SHOW.cur||SHOW.q.length>0;}
function showQueue(T,first,n){SHOW.q.push({T,first,n,mid:MC.id});if(!SHOW.cur)SHOW.wait=.55;}
/* the plush at rest, with an ordinary material (no skinning), for the close-up and the collection pictures */
function displayMat(T){if(SHOW.dmat[T.id])return SHOW.dmat[T.id];const Q=QUAL[GFX.q],map=GFX.tex['p/'+T.id]||(GFX.tex['p/'+T.id]=texOf('p/'+T.id));
  const shiny=T.id==='hare'||T.id==='moth'||T.id==='donut',metal=T.id==='hare'||T.id==='donut';
  return SHOW.dmat[T.id]=Q.sheen?new THREE.MeshPhysicalMaterial({map,roughness:shiny?.55:.92,metalness:metal?.25:0,sheen:1,sheenRoughness:.45,sheenColor:new THREE.Color(.7,.7,.7),sheenColorMap:map})
    :new THREE.MeshStandardMaterial({map,roughness:.9});}
function displayPlush(T){const g=new THREE.Group(),m=new THREE.Mesh(plushGeometry(T),displayMat(T));g.add(m);
  if(T.ring){const G=ringPrep(T),r=new THREE.Mesh(new THREE.TorusGeometry(RING.R,RING.tube,8,28),MAT.chrome),c=new THREE.Mesh(new THREE.CylinderGeometry(.0008,.0008,RING.L,5),MAT.steel);
    c.position.set(G.top[0],G.top[1]+RING.L/2,G.top[2]);r.position.set(G.top[0],G.top[1]+RING.L+RING.R,G.top[2]);g.add(r,c);}
  return g;}
/* the model's own centre, so it turns about its middle */
function plushMid(T){const m=T.model,s=T.size;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
  for(let i=0;i<m.nv;i++){const x=m.pos[i*3]*s,y=m.pos[i*3+1]*s,z=m.pos[i*3+2]*s;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z;}
  return {c:[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],h:y1-y0,w:Math.max(x1-x0,z1-z0)};}
function showStart(it){
  const M0=MACHINES[it.mid],E=GFX.mg[it.mid],T=it.T,pm=T._mid||(T._mid=plushMid(T));
  const holder=new THREE.Group(),inner=displayPlush(T);inner.position.set(-pm.c[0],-pm.c[1],-pm.c[2]);holder.add(inner);E.G.add(holder);
  SHOW.cur=Object.assign(it,{holder,pm,door:M0.door,U:M0.U});SHOW.t=0;document.body.classList.add('show');
}
function showEnd(){const c=SHOW.cur;if(!c)return;c.holder.parent.remove(c.holder);SHOW.cur=null;document.body.classList.remove('show');if(SHOW.q.length)SHOW.wait=.3;}
const ease=p=>p<0?0:p>1?1:p*p*(3-2*p);
function showTick(dt,skip){
  if(!SHOW.cur){if(SHOW.q.length){SHOW.wait-=dt;if(SHOW.wait<=0)showStart(SHOW.q.shift());}SHOW.w=Math.max(0,SHOW.w-dt*2);return;}
  const c=SHOW.cur;if(skip&&SHOW.t<SH.spin)SHOW.t=SH.spin;
  const t=SHOW.t+=dt,U=c.U,d=c.door,h=c.pm.h,H=c.holder;
  /* where it sits for its close-up: just in front of the prize door, a little above it */
  const cz=d[2]+Math.max(.2*U,h*.9),cy=d[1]+h*.5+.06*U;
  if(t<SH.pop){const p=t/SH.pop,e=ease(p);H.position.set(d[0],d[1]-.02*U+Math.sin(p*Math.PI)*.07*U+h*.5*e,lerp(d[2]-.06*U,cz,e));H.rotation.set(-(1-e)*TAU,0,0);H.scale.setScalar(.55+.45*e);
    if(t-dt<.02)SFX.boing();}
  else if(t<SH.rise){const e=ease((t-SH.pop)/(SH.rise-SH.pop));H.position.set(d[0],lerp(d[1]-.02*U+h*.5,cy,e),cz);H.rotation.set(0,0,0);H.scale.setScalar(1);}
  else if(t<SH.spin){const p=clamp((t-SH.rise-.5)/(SH.spin-SH.rise-.5),0,1);   /* face you a moment, then one turn */H.position.set(d[0],cy+Math.sin(t*3)*.008*U,cz);H.rotation.set(0,ease(p)*TAU,0);H.scale.setScalar(1);
    if(t-dt<SH.rise)SFX.ticket();}
  else{const e=ease((t-SH.spin)/(SH.end-SH.spin));H.position.set(d[0],cy+e*.3*U,cz);H.scale.setScalar(Math.max(.001,1-e));H.rotation.y+=dt*8;}
  SHOW.w=t<SH.spin?Math.min(1,SHOW.w+dt*2.2):Math.max(0,SHOW.w-dt*1.8);
  if(t>=SH.end)showEnd();
}
/* the camera's close-up of it */
function showPose(){const c=SHOW.cur;if(!c)return SHOW.lastPose||null;const P=MPOS[c.mid],d=c.door,U=c.U,h=c.pm.h,w=c.pm.w,asp=GFX.cam.aspect,port=asp<1;
  const vf=(port?52:38)*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*asp),n=Math.max(h*2.6/(2*Math.tan(vf/2)),w*2.6/(2*Math.tan(hf/2)),.25*U);
  const cz=d[2]+Math.max(.2*U,h*.9),cy=d[1]+h*.5+.06*U,ty=cy+(port?h*.08:0);
  return SHOW.lastPose={p:[d[0]+P[0],ty+n*.18+P[1],cz+n+P[2]],t:[d[0]+P[0],ty+P[1],cz+P[2]],fov:vf*180/Math.PI};}
/* light it: the claw's little spotlight is free during a win, so it moves out to the close-up */
function showLight(){const c=SHOW.cur,cs=GFX.clawSpot;if(!c||!cs)return;const P=MPOS[c.mid],H=c.holder.position,U=c.U;
  cs.intensity=6*U*U*SHOW.w;cs.distance=2*U;cs.angle=.6;cs.position.set(H.x+P[0]+.1*U,H.y+P[1]+.45*U,H.z+P[2]+.35*U);cs.target.position.set(H.x+P[0],H.y+P[1],H.z+P[2]);}
/* compile the close-up's material at boot, so the first win doesn't stutter */
function showWarm(){const E=GFX.mg[MC.id],T=CAST[MC.cast[0].id],g=displayPlush(T);g.position.set(0,-.5,0);E.G.add(g);SHOW.warm=g;}
function showWarmDone(){if(SHOW.warm){SHOW.warm.parent.remove(SHOW.warm);SHOW.warm=null;}}
/* the HUD during the close-up */
function showHud(W,H,small){const c=SHOW.cur;if(!c||SHOW.t<.35)return;const T=c.T,big=small?4.2:6,a=SHOW.t>SH.spin?Math.max(0,1-(SHOW.t-SH.spin)*2.5):Math.min(1,(SHOW.t-.35)*3);
  const g=HUD.g;g.globalAlpha=a;
  ledBig(T.rar===4?'JACKPOT!':'WINNER!',W/2,H*.11,big,'#ffd040');ledBig(T.name,W/2,H*.11+big*11,big*.55,RAR[T.rar].c);
  const y=H*(small?.76:.78);ledBig('+'+T.tix+' TICKETS',W/2,y,big*.55,'#ffd040');
  const have=collectedCount();ledBig(c.first?'NEW! '+have+' OF 20 COLLECTED':'YOU HAVE '+c.n+' NOW',W/2,y+big*7.5,big*.4,c.first?'#6aff5a':'#c8d0e8');
  g.globalAlpha=1;}
