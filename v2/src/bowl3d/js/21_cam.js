/* =====================================================================================
   21. THE CAMERA DIRECTOR — the original's shots, opened up for full-resolution 3D:
       behind the bowler to aim, chasing the ball down the lane, the pin deck for the crash
       (lower and slower when the ball hits hard), and a slow drift for the final score.
       fov is vertical for a 16:9 screen; narrower screens widen it to keep `hmin` across.
   ===================================================================================== */
const CAM={e:[0,1.25,-2.7],t:[0,.05,10.5],fov:34,hmin:24};
const PIPC={e:[0,.6,16.55],t:[0,.17,18.7],fov:24,on:false,x:0,y:0,w:0,h:0};
const AIMU={x:0,a:0,on:false,al:0};
function camTick(dt){
  const b=PW.ball;let k=3.5,ex,ey,ez,tx,ty,tz,fv,hm;
  const aimV=()=>{ex=G.x0*.55;ey=1.22;ez=-2.75;tx=G.x0*.22;ty=.08;tz=10.5;fv=33;hm=26;};
  const pinV=()=>{const d=sstep(0,4,G.ph==='pins'?G.pt:4)*.3,lo=G.slowT>0?.12:0;ex=0;ey=.74-d*.08-lo;ez=14.75+d;tx=0;ty=.3;tz=18.7;fv=36;hm=34;};
  switch(G.ph){
    case 'aim':aimV();k=4;break;
    case 'swing':aimV();ez-=.1;k=1.2;break;
    case 'roll':{const s=sstep(3,15,b.z);ex=b.x*.55*(1-s);ey=lerp(1.0,.8,s);ez=Math.min(b.z-2.5,14.75);tx=b.x*.45*(1-s);ty=lerp(.12,.26,s);tz=Math.min(b.z+5.5,18.7);fv=lerp(32,36,s);hm=lerp(24,34,s);k=6;break;}
    case 'sweep':if(PS.t<(PS.fresh?1.05:1.55))pinV();else aimV();k=2.6;break;
    default:pinV();k=3;
  }
  /* the cartoon on the masking unit gets its own shot */
  if(DMD.on&&(G.ph==='tally'||G.ph==='sweep'||G.ph==='done')&&S.mode!=='over'){ex=0;ey=.86;ez=14.1;tx=0;ty=.8;tz=18;fv=40;hm=38;k=2.2;}
  if(S.mode==='over'){ex=Math.sin(S.ot*.22)*.8;ey=2.4;ez=6.2;tx=0;ty=0;tz=11.5;fv=36;hm=26;k=.7;}
  const a=1-Math.exp(-k*dt);
  CAM.e[0]+=(ex-CAM.e[0])*a;CAM.e[1]+=(ey-CAM.e[1])*a;CAM.e[2]+=(ez-CAM.e[2])*a;
  CAM.t[0]+=(tx-CAM.t[0])*a;CAM.t[1]+=(ty-CAM.t[1])*a;CAM.t[2]+=(tz-CAM.t[2])*a;CAM.fov+=(fv-CAM.fov)*a;CAM.hmin+=(hm-CAM.hmin)*a;
  /* the pin-cam inset while the main camera is far from the deck */
  const far=CAM.e[2]<9;PIPC.on=QP[QL].pip&&far&&S.mode==='play'&&(G.ph==='aim'||G.ph==='swing'||G.ph==='roll'||G.ph==='sweep');
  PIPC.w=Math.round(W*(PORTRAIT?.42:.27));PIPC.h=Math.round(PIPC.w*.6);PIPC.x=W-PIPC.w-3;PIPC.y=PADT+sheetH()+4;
}
function fovFor(fv,hm,asp){const v=Math.max(fv,2*Math.atan(Math.tan(hm*Math.PI/360)/asp)*180/Math.PI);return Math.min(v,74);}
function applyCam(){
  let jx=0,jy=0;if(S.shake>0&&!reduce){jx=(Math.random()-.5)*S.shake*.03;jy=(Math.random()-.5)*S.shake*.024;}
  const asp=VW/VH;CAM3.aspect=asp;CAM3.fov=fovFor(CAM.fov,CAM.hmin,asp);CAM3.updateProjectionMatrix();
  CAM3.position.copy(V3(CAM.e[0]+jx,CAM.e[1]+jy,CAM.e[2]));CAM3.up.set(0,1,0);CAM3.lookAt(V3(CAM.t[0],CAM.t[1],CAM.t[2]));CAM3.updateMatrixWorld();
  PIP3.aspect=PIPC.w/Math.max(1,PIPC.h);PIP3.fov=PIPC.fov;PIP3.updateProjectionMatrix();PIP3.position.copy(V3(...PIPC.e));PIP3.lookAt(V3(...PIPC.t));PIP3.updateMatrixWorld();
}
