/* ===================== effects in 3D: the engine's particles, projectiles and supers, drawn with light =====================
   The engine (06_fx.js) still spawns and moves every spark, ring, flash, bolt and dust puff in metres on the fight plane.
   Here each one gets a depth (sparks burst toward and away from the camera too), is drawn as a glowing camera-facing quad,
   and the bright ones ask for a real light, so a hit lights the fighters and the floor. */
const FXQ=7000;
function mkBatch(blend){
  const geo=new THREE.BufferGeometry(),n=FXQ*4;
  const pos=new Float32Array(n*3),col=new Float32Array(n*4),uv=new Float32Array(n*2),sp=new Float32Array(n*2),idx=new Uint32Array(FXQ*6);
  for(let i=0;i<FXQ;i++){const v=i*4,k=i*6;idx[k]=v;idx[k+1]=v+1;idx[k+2]=v+2;idx[k+3]=v;idx[k+4]=v+2;idx[k+5]=v+3;}
  geo.setIndex(new THREE.BufferAttribute(idx,1));
  const A=(a,s)=>new THREE.BufferAttribute(a,s).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position',A(pos,3));geo.setAttribute('aCol',A(col,4));geo.setAttribute('aUv',A(uv,2));geo.setAttribute('aSp',A(sp,2));
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e4);
  const add=blend==='add';
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,
    blending:add?THREE.CustomBlending:THREE.NormalBlending,blendSrc:THREE.OneFactor,blendDst:add?THREE.OneFactor:THREE.OneMinusSrcAlphaFactor,blendEquation:THREE.AddEquation,
    vertexShader:`attribute vec4 aCol;attribute vec2 aUv,aSp;varying vec4 vC;varying vec2 vU,vS;void main(){vC=aCol;vU=aUv;vS=aSp;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec4 vC;varying vec2 vU,vS;void main(){float s=vS.x,a;vec2 u=vU;
      if(s<.5){float r2=dot(u,u);a=exp(-r2*3.)*(1.-smoothstep(.8,1.,r2));}
      else if(s<1.5){float r=length(u),th=vS.y;a=1.-smoothstep(0.,th,abs(r-(1.-th)));a*=step(r,1.);}
      else if(s<2.5){a=1.-abs(u.y);a=a*a*(1.-smoothstep(.7,1.,abs(u.x)));a+=pow(max(0.,1.-abs(u.y)*2.5),3.)*.6*(1.-abs(u.x));}
      else if(s<3.5){a=step(max(abs(u.x),abs(u.y)),1.);}
      else{float r2=dot(u,u);a=(1.-smoothstep(.2,1.,r2))*.9;}
      a*=vC.a;`+(add?`gl_FragColor=vec4(vC.rgb*a,1.);`:`gl_FragColor=vec4(vC.rgb*a,a);`)+`}`});
  const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;mesh.renderOrder=add?60:50;
  return {geo,mesh,pos,col,uv,sp,n:0};
}
const BADD=mkBatch('add'),BALP=mkBatch('alpha');FXG.add(BADD.mesh,BALP.mesh);
const _cr=new THREE.Vector3(),_cu=new THREE.Vector3(),_cp=new THREE.Vector3();
function fxCamBasis(){const e=CAM3.matrixWorld.elements;_cr.set(e[0],e[1],e[2]);_cu.set(e[4],e[5],e[6]);_cp.set(e[12],e[13],e[14]);}
function bq(B,ax,ay,az,bx,by,bz,cx,cy,cz,dx,dy,dz,r,g_,b,a,shape,par,u0,v0,u1,v1){
  if(B.n>=FXQ)return;const i=B.n++,v=i*4,P=B.pos,C=B.col,U=B.uv,S=B.sp;
  P[v*3]=ax;P[v*3+1]=ay;P[v*3+2]=az;P[v*3+3]=bx;P[v*3+4]=by;P[v*3+5]=bz;P[v*3+6]=cx;P[v*3+7]=cy;P[v*3+8]=cz;P[v*3+9]=dx;P[v*3+10]=dy;P[v*3+11]=dz;
  for(let k=0;k<4;k++){C[(v+k)*4]=r;C[(v+k)*4+1]=g_;C[(v+k)*4+2]=b;C[(v+k)*4+3]=a;S[(v+k)*2]=shape;S[(v+k)*2+1]=par;}
  U[v*2]=u0;U[v*2+1]=v0;U[v*2+2]=u1;U[v*2+3]=v0;U[v*2+4]=u1;U[v*2+5]=v1;U[v*2+6]=u0;U[v*2+7]=v1;
}
/* camera-facing quad; col is 0..255, k scales brightness (above 1 blooms) */
function bill(B,x,y,z,s,col,a,k,shape,par){
  const rx=_cr.x*s,ry=_cr.y*s,rz=_cr.z*s,ux=_cu.x*s,uy=_cu.y*s,uz=_cu.z*s,f=k/255;
  bq(B,x-rx-ux,y-ry-uy,z-rz-uz,x+rx-ux,y+ry-uy,z+rz-uz,x+rx+ux,y+ry+uy,z+rz+uz,x-rx+ux,y-ry+uy,z-rz+uz,col[0]*f,col[1]*f,col[2]*f,a,shape||0,par||0,-1,-1,1,1);
}
/* quad lying on the floor */
function flat(B,x,y,z,sx,sz,col,a,k,shape,par){const f=k/255;bq(B,x-sx,y,z-sz,x+sx,y,z-sz,x+sx,y,z+sz,x-sx,y,z+sz,col[0]*f,col[1]*f,col[2]*f,a,shape||0,par||0,-1,-1,1,1);}
/* a streak from A to B, w wide, facing the camera */
function streak(B,ax,ay,az,bx,by,bz,w,col,a,k){
  let dx=bx-ax,dy=by-ay,dz=bz-az;const vx=(ax+bx)*.5-_cp.x,vy=(ay+by)*.5-_cp.y,vz=(az+bz)*.5-_cp.z;
  let px=dy*vz-dz*vy,py=dz*vx-dx*vz,pz=dx*vy-dy*vx;const pl=Math.hypot(px,py,pz)||1;px=px/pl*w;py=py/pl*w;pz=pz/pl*w;
  const f=k/255;bq(B,ax-px,ay-py,az-pz,bx-px,by-py,bz-pz,bx+px,by+py,bz+pz,ax+px,ay+py,az+pz,col[0]*f,col[1]*f,col[2]*f,a,2,0,-1,-1,1,1);
}
function zig3(B,x0,y0,z0,x1,y1,z1,n,amp,w,col,a,k){
  let px=x0,py=y0,pz=z0;const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
  for(let i=1;i<=n;i++){const t=i/n,o=i<n?(VR()*2-1)*amp:0,oz=i<n?(VR()*2-1)*amp:0;
    const qx=x0+dx*t+nx*o,qy=y0+dy*t+ny*o,qz=z0+(z1-z0)*t+oz;streak(B,px,py,pz,qx,qy,qz,w,col,a,k);px=qx;py=qy;pz=qz;}
}
const FXK=()=>Q().fx;
/* visual-only randomness has its own generator, so it never shifts the fight's own random numbers (the CPU, sparks) */
const VR=mulberry(20261104),vr=(a,b)=>a+VR()*(b-a);
function vdust(x,y,n){for(let i=0;i<n;i++)fxp({k:'dust',x:x+vr(-.2,.2),y:y+.02,vx:vr(-1.2,1.2),vy:vr(.1,.9),life:vr(18,34),max:34,s:vr(.06,.12),col:[150,140,160]});}
/* ---------- particle depth (the engine's particles live on the flat fight plane) ---------- */
function initFxZ(p){
  const sp=Math.hypot(p.vx||0,p.vy||0);
  switch(p.k){
    case 'spk':p._z=.22+vr(-.06,.06);p._vz=vr(-1,1)*sp*.9;break;
    case 'dot':p._z=.2+vr(-.15,.15);p._vz=vr(-1,1)*Math.max(.5,sp)*.6;break;
    case 'deb':p._z=vr(-.35,.35);p._vz=vr(-1.6,1.6);break;
    case 'dust':p._z=vr(-.45,.45);p._vz=vr(-.5,.5);break;
    case 'petal':p._z=vr(-1.4,1.6);p._vz=vr(-.3,.3);break;
    case 'bolt':p._z=.25+vr(-.1,.1);p._vz=0;p._z1=p._z+vr(-.35,.35);break;
    default:p._z=.3;p._vz=0;
  }
}
function stepFxZ(p){if(p._vz){p._z+=p._vz/60;p._vz*=p.k==='spk'?.9:p.k==='dust'?.93:.97;}}
function fxStepHook(F){}
function projStepHook(){
  for(const p of PROJ){if(p.dead)continue;const t=PT[p.type];
    if((t.draw==='bolt'||t.draw==='prism')&&p.t%2===0)fxp({k:'dot',x:p.x,y:p.y+vr(-.08,.08),vx:-p.vx*.15,vy:vr(-.3,.3),g:0,life:12,max:12,col:t.draw==='prism'?C_C:C_Y,s:.03});
    else if(t.draw==='orb'&&p.t%2===0)fxp({k:'dot',x:p.x,y:p.y,vx:-p.vx*.1+vr(-.4,.4),vy:vr(-.4,.4),g:0,life:16,max:16,col:C_V,s:.03});
    else if(t.draw==='quake'&&p.t%2===0)vdust(p.x,0,1);
    else if(t.draw==='well'&&p.on&&p.t%3===0)fxp({k:'dot',x:p.x+vr(-.6,.6),y:vr(.05,1.2),vx:0,vy:-1.5,g:0,life:20,max:20,col:C_V,s:.025});
  }
}

/* ---------- meshes for projectiles that are solid things ---------- */
function rockGeo(){const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position,r=mulberry(5);
  for(let i=0;i<p.count;i++){const k=.82+r()*.3;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.9,p.getZ(i)*k);}g.computeVertexNormals();return g;}
const ROCKGEO=rockGeo(),ROCKMAT=new THREE.MeshStandardMaterial({color:0x6a5444,roughness:.92,metalness:0,flatShading:true});
function starGeo(){const s=new THREE.Shape();for(let i=0;i<8;i++){const a=i/8*TAU,r=i%2?.36:1.1;if(i)s.lineTo(Math.cos(a)*r,Math.sin(a)*r);else s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}s.closePath();
  const h=new THREE.Path();h.absarc(0,0,.18,0,TAU,true);s.holes.push(h);
  const g=new THREE.ExtrudeGeometry(s,{depth:.1,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:1,steps:1});g.translate(0,0,-.05);return g;}
const STARGEO=starGeo(),STARMAT=new THREE.MeshStandardMaterial({color:0xe8eeff,roughness:.25,metalness:.9,emissive:0x301018});
const TORGEO=new THREE.TorusGeometry(1,.035,6,56);
const BEAMGEO=new THREE.CylinderGeometry(1,1,1,18,1,true);BEAMGEO.rotateZ(Math.PI/2);
function pool(make){const a=[];return {a,i:0,get(){let m=this.a[this.i];if(!m){m=make();this.a.push(m);FXG.add(m);}this.i++;m.visible=true;return m;},reset(){for(let k=this.i;k<this.a.length;k++)this.a[k].visible=false;this.i=0;}};}
const addMat=(hex)=>new THREE.MeshBasicMaterial({color:hex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
const PROCK=pool(()=>{const m=new THREE.Mesh(ROCKGEO,ROCKMAT);m.castShadow=true;return m;});
const PSTAR=pool(()=>{const m=new THREE.Mesh(STARGEO,STARMAT);m.castShadow=true;return m;});
const PTOR=pool(()=>{const m=new THREE.Mesh(TORGEO,addMat(0xffffff));m.renderOrder=61;return m;});
const PBEAM=pool(()=>{const m=new THREE.Mesh(BEAMGEO,addMat(0xffffff));m.renderOrder=62;return m;});
function hdr(m,col,k){m.material.color.setRGB(col[0]/255*k,col[1]/255*k,col[2]/255*k);}

/* ---------- draw everything for this frame ---------- */
function drawFX3(al){
  fxCamBasis();BADD.n=0;BALP.n=0;
  const fk=FXK();
  if(FIGHT&&FIGHTVIS){
    for(const p of FXL){
      const f=p.life/p.max,z=p._z===undefined?.3:p._z+(p._vz||0)/60*al;
      switch(p.k){
        case 'spk':{const x=p.x+p.vx/60*al,y=p.y+p.vy/60*al,v=Math.hypot(p.vx,p.vy,p._vz||0)||1,l=p.len*f*1.3;
          streak(BADD,x,y,z,x-p.vx/v*l,y-p.vy/v*l,z-(p._vz||0)/v*l,.016,p.col,Math.min(1,f*1.6),3.2);break;}
        case 'dot':bill(BADD,p.x+p.vx/60*al,p.y+p.vy/60*al,z,Math.max(.018,p.s*1.3),p.col,Math.min(1,f*1.5),3,0);break;
        case 'deb':bill(BALP,p.x,p.y,z,Math.max(.02,p.s*.7),p.col.map(c=>c*.55),Math.min(1,f*2),1,3);break;
        case 'dust':if(fk>.6||VR()<.6)bill(BALP,p.x+p.vx/60*al,p.y+p.vy/60*al,z,p.s*1.7,p.col.map(c=>c*.55),.34*f,1,4);break;
        case 'ring':{const r=lerp(p.r1,p.r0,f),th=clamp(p.w*.018*(1+f)/Math.max(.05,r),.02,.5);if(p.r0>p.r1){bill(BADD,p.x,p.y,z,r,p.col,f*.5,1.1,1,th*.6);break;}
          if(p.flat)flat(BADD,p.x,.02,0,r,r,p.col,f,1.8,1,th);else bill(BADD,p.x,p.y,z,r,p.col,f,2.2,1,th);break;}
        case 'flash':{const r=p.r*(1.4-f*.4)*1.3;bill(BADD,p.x,p.y,z+.1,r,p.col,f*.85,1.5,0);
          lightReq(p.x,p.y,z+.5,p.col,f*Math.min(14,5+p.r*10),2.5+p.r*4);break;}
        case 'bolt':zig3(BADD,p.x0,p.y0,z,p.x1,p.y1,p._z1??z,5,.05,.014,p.col,Math.min(1,f*2),4);break;
        case 'slash':{const l=p.len,c=Math.cos(p.a),s=Math.sin(p.a),e=1-f;
          streak(BADD,p.x-c*l*.5*e-c*l*.2,p.y+s*l*.5*e,z,p.x+c*l*.5,p.y-s*l*.5,z,.012+.03*f,p.col,f,3.4);break;}
        case 'petal':{const s=.035;bill(BADD,p.x,p.y,z,s*(.4+.6*Math.abs(Math.sin(p.a))),p.col,Math.min(1,f*2)*.9,1.2,3);break;}
      }
    }
    for(const p of PROJ)if(!p.dead)drawProj3(p,al);
    for(const F of FIGHT.f){fighterLights(F);if(F._hold){const m=PROCK.get();m.position.set(F._hold[0],F._hold[1],.05);m.scale.setScalar(.29);m.rotation.set(.3,FRAMET*.05,.2);}}
  }
  if(STAGE&&STAGE.fx3&&FIGHTVIS)STAGE.fx3(BADD,BALP,al);
  for(const B of [BADD,BALP]){const n=B.n;B.geo.setDrawRange(0,n*6);
    for(const [k,sz] of [['position',3],['aCol',4],['aUv',2],['aSp',2]]){const at=B.geo.attributes[k];at.clearUpdateRanges();at.addUpdateRange(0,Math.max(1,n*4*sz));at.needsUpdate=true;}}
  PROCK.reset();PSTAR.reset();PTOR.reset();PBEAM.reset();
}
let FIGHTVIS=true;
function drawProj3(p,al){
  const t=PT[p.type],x=p._px===undefined?p.x:p._px+(p._sx-p._px)*al,y=p._py===undefined?p.y:p._py+(p._sy-p._py)*al,r=p.r,z=.12;
  switch(t.draw){
    case 'bolt':case 'prism':{const c=t.draw==='prism'?C_C:C_Y;
      bill(BADD,x,y,z,r*2.6,c,.7,1.6,0);bill(BADD,x,y,z,r*1.2,C_W,.8,2,0);bill(BADD,x,y,z,r*.5,C_W,1,3.5,0);
      for(let i=0;i<4;i++){const a=VR()*TAU,b=vr(-1,1);zig3(BADD,x,y,z,x+Math.cos(a)*r*1.7,y+Math.sin(a)*r*1.7,z+b*r,4,r*.3,.012,i%2?C_W:c,.9,4);}
      lightReq(x,y,z+.4,c,7,5);break;}
    case 'star':{const m=PSTAR.get();m.position.set(x,y,z);m.scale.setScalar(r);m.rotation.set(.35,.2,p.spin*1.6);bill(BADD,x,y,z,r*2.2,C_R,.45,2,0);lightReq(x,y,z+.3,C_R,2.5,3);break;}
    case 'rock':{const m=PROCK.get();m.position.set(x,y,z);m.scale.setScalar(r*1.05);m.rotation.set(p.spin*.3,p.spin*.2,p.spin*.5);break;}
    case 'orb':{bill(BADD,x,y,z,r*2.3,C_V,.7,1.5,0);bill(BADD,x,y,z,r*1.05,C_W,.7,1.8,0);
      for(let i=0;i<3;i++){const m=PTOR.get();m.position.set(x,y,z);const s=r*(.75+i*.16);m.scale.set(s,s,s);m.rotation.set(1.1+i*.5,p.spin+i*1.1,p.spin*.7);hdr(m,i===1?C_W:C_C,2.2);}
      lightReq(x,y,z+.4,C_V,6,5);break;}
    case 'quake':{for(let i=0;i<3;i++){const qx=x+vr(-r,r);zig3(BADD,qx,0,vr(-.3,.4),qx+vr(-r,r)*.4,vr(.25,.6),vr(-.3,.4),4,r*.25,.014,i?C_Y:C_W,.9,4);}
      flat(BADD,x,.02,0,r*2,r*1.4,C_Y,.5,2.4,0);lightReq(x,.4,.4,C_Y,6,4);break;}
    case 'halo':{const m=PTOR.get();m.position.set(x,y,z);m.scale.set(r,r,r);m.rotation.set(Math.PI/2-.42,0,0);hdr(m,C_V,3);
      const m2=PTOR.get();m2.position.set(x,y,z);m2.scale.set(r*.93,r*.93,r*.93);m2.rotation.set(Math.PI/2-.42,0,p.spin);hdr(m2,C_W,2.4);
      bill(BADD,x,y,z,r*1.3,C_V,.25,2,0);lightReq(x,y,z+.3,C_V,8,4);break;}
    case 'well':{const on=p.on,a=on?.95:.45;
      for(let i=0;i<4;i++){const m=PTOR.get(),s=r*(1-i*.2);m.position.set(x,.04+i*.01,0);m.scale.set(s,s*1.15,s);m.rotation.set(Math.PI/2,0,p.spin*(i%2?1:-1));hdr(m,i%2?C_C:C_V,(on?2.6:1.2)*(1-i*.15));}
      flat(BADD,x,.02,0,r*(on?1.4:.9),r*(on?1.4:.9),C_V,on?.55:.25,2,0);lightReq(x,.3,.2,C_V,on?7:2,4);void a;break;}
    case 'nova':{bill(BADD,x,y,z,r*2.4,C_V,.75,1.4,0);bill(BADD,x,y,z,r*1.3,C_C,.5,1.4,0);bill(BADD,x,y,z,r*.75,C_W,.9,2.2,0);
      for(let i=0;i<3;i++){bill(BADD,x,y,z,r*(1+((p.t*.05+i/3)%1)),C_W,.5,1.2,1,.04);}
      lightReq(x,y,z+.6,C_V,12,8);lightReq(x,y,z+.6,C_C,5,5);break;}
    case 'beam':{const col=t.col,x1=p.face>0?STH+5:-STH-5,len=Math.abs(x1-x),mx=(x+x1)/2,hh=r*(1+.15*Math.sin(p.t*.9));
      const layers=[[hh*1.8,col,.16],[hh,col,.5],[hh*.45,C_W,1.1]];
      for(const [rad,c,k] of layers){const m=PBEAM.get();m.position.set(mx,y,z);m.scale.set(len,rad,rad);hdr(m,c,k);}
      for(let i=0;i<3;i++)zig3(BADD,x,y+vr(-hh,hh),z+vr(-hh,hh),x1,y+vr(-hh,hh),z+vr(-hh,hh),18,hh*1.4,.012,i%2?C_W:col,.8,2);
      bill(BADD,x,y,z,hh*4,col,.7,1.2,0);bill(BADD,x,y,z,hh*2,C_W,.9,1.6,0);
      flat(BADD,mx,.02,0,len/2,1,col,.3,.7,0);
      for(const fx of [0,.35,.7])lightReq(x+(x1-x)*fx,y,z+.6,col,fx?7:9,6);break;}
  }
}
/* lights that come off the fighters themselves: auras, supers, the held boulder */
function fighterLights(F){
  if(F.hidden)return;
  const m=F.move,J=F.Jr,cx=F.x+J.chest[0]*F.face,cy=F.y+J.chest[1];
  if(F.state==='attack'&&m&&m.aura&&F.mf>=m.aura[0]&&F.mf<=m.aura[1]){
    const k=m.aura[2],col=k==='elec'?C_Y:k==='plasma'?C_V:[255,150,190];lightReq(cx,cy,.6,col,(m.super?4:3.2)*(.7+VR()*.6),4);}
  if(SUPERF>0&&SUPEROWN===F)lightReq(cx+F.face*.5,cy+.4,1.6,F.def.glow,4.5,5);
  if(F.def.look.holo)lightReq(cx,cy,.5,F.def.glow,1.6,3);
}
