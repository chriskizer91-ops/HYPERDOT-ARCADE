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
  const V=VIEWS[view],fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw),sd=V.side*(cam.aspect<1?.45:1);
  /* the body height follows the mech with a little lag in the air, so jet hops feel big */
  const by=p.y;CAMS.ty+=(by-CAMS.ty)*damp(p.air?(view==='close'?7:3.2):9,dt);if(!CAMS.ready){CAMS.ty=by;}
  /* portrait screens are narrow: step back a little so the mech does not fill them */
  const pt=Math.max(0,1-cam.aspect),back=V.back+pt*(view==='close'?2.2:3),up=V.up+pt*(view==='close'?.7:1.2);
  const pit=p.pitch,tx=p.x-fx*back+rx*sd,tz=p.z-fz*back+rz*sd;let ty=CAMS.ty+up-pit*(view==='close'?1.2:2.2);
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
