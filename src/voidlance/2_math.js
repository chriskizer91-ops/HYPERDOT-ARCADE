/* ===================== 3D math: vectors as [x,y,z], quaternions as [w,x,y,z]. x right, y up, z forward ===================== */
const v3=(x=0,y=0,z=0)=>[x,y,z];
const vadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],vmul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],vlen=a=>Math.hypot(a[0],a[1],a[2]),vdist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function vnorm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];}
const vlerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function vaddm(a,b,k){a[0]+=b[0]*k;a[1]+=b[1]*k;a[2]+=b[2]*k;return a;}
function vrand(r){const u=Math.random()*2-1,t=Math.random()*TAU,s=Math.sqrt(1-u*u);return [s*Math.cos(t)*r,u*r,s*Math.sin(t)*r];}
function vrandIn(r){return vrand(r*Math.cbrt(Math.random()));}
const qid=()=>[1,0,0,0];
function qmul(a,b){return [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];}
function qnorm(q){const l=Math.hypot(q[0],q[1],q[2],q[3])||1;q[0]/=l;q[1]/=l;q[2]/=l;q[3]/=l;return q;}
function qaxis(ax,an){const s=Math.sin(an/2);return [Math.cos(an/2),ax[0]*s,ax[1]*s,ax[2]*s];}
function qrot(q,v){const [w,x,y,z]=q,ix=w*v[0]+y*v[2]-z*v[1],iy=w*v[1]+z*v[0]-x*v[2],iz=w*v[2]+x*v[1]-y*v[0],iw=-x*v[0]-y*v[1]-z*v[2];
  return [ix*w+iw*-x+iy*-z-iz*-y,iy*w+iw*-y+iz*-x-ix*-z,iz*w+iw*-z+ix*-y-iy*-x];}
const qconj=q=>[q[0],-q[1],-q[2],-q[3]];
const qinv=qconj;
function qslerp(a,b,t){let c=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];let bb=b;if(c<0){c=-c;bb=[-b[0],-b[1],-b[2],-b[3]];}
  if(c>.9995)return qnorm([a[0]+(bb[0]-a[0])*t,a[1]+(bb[1]-a[1])*t,a[2]+(bb[2]-a[2])*t,a[3]+(bb[3]-a[3])*t]);
  const th=Math.acos(c),s=Math.sin(th),k0=Math.sin((1-t)*th)/s,k1=Math.sin(t*th)/s;return [a[0]*k0+bb[0]*k1,a[1]*k0+bb[1]*k1,a[2]*k0+bb[2]*k1,a[3]*k0+bb[3]*k1];}
/* local axes of a quaternion */
const qR=q=>qrot(q,[1,0,0]),qU=q=>qrot(q,[0,1,0]),qF=q=>qrot(q,[0,0,1]);
/* orientation looking along f with an up hint */
function qlook(f,up){
  f=vnorm(f);let r=vcross(up||[0,1,0],f);if(vlen(r)<1e-4)r=vcross([1,0,0],f);r=vnorm(r);const u=vcross(f,r);
  const m00=r[0],m01=u[0],m02=f[0],m10=r[1],m11=u[1],m12=f[1],m20=r[2],m21=u[2],m22=f[2],tr=m00+m11+m22;let q;
  if(tr>0){const s=Math.sqrt(tr+1)*2;q=[.25*s,(m21-m12)/s,(m02-m20)/s,(m10-m01)/s];}
  else if(m00>m11&&m00>m22){const s=Math.sqrt(1+m00-m11-m22)*2;q=[(m21-m12)/s,.25*s,(m01+m10)/s,(m02+m20)/s];}
  else if(m11>m22){const s=Math.sqrt(1+m11-m00-m22)*2;q=[(m02-m20)/s,(m01+m10)/s,.25*s,(m12+m21)/s];}
  else{const s=Math.sqrt(1+m22-m00-m11)*2;q=[(m10-m01)/s,(m02+m20)/s,(m12+m21)/s,.25*s];}
  return qnorm(q);
}
/* rotate local vector by ship orientation, then add position */
const toWorld=(e,l)=>vadd(e.pos,qrot(e.q,l));
const toLocal=(e,w)=>qrot(qinv(e.q),vsub(w,e.pos));
/* turn unit vector a toward unit vector b by at most ang radians */
function vturn(a,b,ang){const c=clamp(vdot(a,b),-1,1),th=Math.acos(c);if(th<=ang||th<1e-5)return b.slice();let ax=vcross(a,b);if(vlen(ax)<1e-6)ax=vcross(a,[0,1,0]);return vnorm(qrot(qaxis(vnorm(ax),ang),a));}
/* intercept: where to aim from p (moving vs) with bolt speed bs at target t (moving vt) */
function lead(p,vs,t,vt,bs){const rel=vsub(vt,vs);let d=vdist(p,t),tt=d/bs;for(let i=0;i<2;i++){const q=vaddm(t.slice(),rel,tt);tt=vdist(p,q)/bs;}return vaddm(t.slice(),rel,tt);}
/* value noise for procedural textures */
function hash3(x,y,z){let h=(x*374761393+y*668265263+z*1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const a=hash3(xi,yi,zi),b=hash3(xi+1,yi,zi),c=hash3(xi,yi+1,zi),d=hash3(xi+1,yi+1,zi),e=hash3(xi,yi,zi+1),f=hash3(xi+1,yi,zi+1),g2=hash3(xi,yi+1,zi+1),h=hash3(xi+1,yi+1,zi+1);
  return lerp(lerp(lerp(a,b,u),lerp(c,d,u),v),lerp(lerp(e,f,u),lerp(g2,h,u),v),w);}
function fbm(x,y,z,o){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f,z*f);f*=2.03;a*=.5;}return s;}

/* ===================== meshes: primitives are placed, rotated and scaled, then wound outward ===================== */
function mesh(){return {P:[],T:[]};}
const PRIM={
  box:{v:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],t:[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[0,4,7],[0,7,3],[1,2,6],[1,6,5]]}
};
function gFrustum(w0,h0,w1,h1,dy1=0,dx1=0){return {v:[[-w0,-h0,-1],[w0,-h0,-1],[w0,h0,-1],[-w0,h0,-1],[-w1+dx1,-h1+dy1,1],[w1+dx1,-h1+dy1,1],[w1+dx1,h1+dy1,1],[-w1+dx1,h1+dy1,1]],t:PRIM.box.t};}
function gCyl(seg,r0=1,r1=1,caps=true){const v=[],t=[];for(let i=0;i<seg;i++){const a=i/seg*TAU;v.push([Math.cos(a)*r0,Math.sin(a)*r0,-1],[Math.cos(a)*r1,Math.sin(a)*r1,1]);}
  for(let i=0;i<seg;i++){const j=(i+1)%seg;t.push([i*2,j*2,j*2+1],[i*2,j*2+1,i*2+1]);}
  if(caps){const b=v.length;v.push([0,0,-1],[0,0,1]);for(let i=0;i<seg;i++){const j=(i+1)%seg;t.push([b,i*2,j*2],[b+1,j*2+1,i*2+1]);}}return {v,t};}
function gCone(seg){const v=[[0,0,1]],t=[];for(let i=0;i<seg;i++){const a=i/seg*TAU;v.push([Math.cos(a),Math.sin(a),-1]);}const b=v.length;v.push([0,0,-1]);for(let i=0;i<seg;i++){const j=(i+1)%seg;t.push([0,1+i,1+j],[b,1+j,1+i]);}return {v,t};}
function gSphere(det,jit,seed){
  const p=(1+Math.sqrt(5))/2;let v=[[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]].map(vnorm);
  let t=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let d=0;d<det;d++){const nt=[],mid={};const m=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(mid[k]!=null)return mid[k];v.push(vnorm(vlerp(v[a],v[b],.5)));return mid[k]=v.length-1;};
    for(const [a,b,c] of t){const ab=m(a,b),bc=m(b,c),ca=m(c,a);nt.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}t=nt;}
  if(jit){const s=seed||1;v=v.map(q=>{const k=1+jit*(fbm(q[0]*1.7+s,q[1]*1.7+s*2,q[2]*1.7-s,3)*2-1)*1.4;return vmul(q,k);});}
  return {v,t};
}
/* add a primitive: o = {p:[x,y,z], s:[sx,sy,sz] or k, r:[rx,ry,rz] euler radians, mx:true mirrors to -x as well} */
function add(M,prim,mat,o={}){
  const doit=sgn=>{
    const s=o.s==null?[1,1,1]:typeof o.s==='number'?[o.s,o.s,o.s]:o.s,p=o.p||[0,0,0],r=o.r||[0,0,0];
    let q=qid();if(r[1])q=qmul(q,qaxis([0,1,0],r[1]*sgn));if(r[0])q=qmul(q,qaxis([1,0,0],r[0]));if(r[2])q=qmul(q,qaxis([0,0,1],r[2]*sgn));
    const base=M.P.length,vs=prim.v.map(v=>{const w=qrot(q,[v[0]*s[0],v[1]*s[1],v[2]*s[2]]);return [w[0]+p[0]*sgn,w[1]+p[1],w[2]+p[2]];});
    let c=[0,0,0];for(const v of vs)vaddm(c,v,1/vs.length);
    for(const v of vs)M.P.push(v);
    for(const [a,b,cc] of prim.t){const A=vs[a],B=vs[b],C=vs[cc],n=vcross(vsub(B,A),vsub(C,A)),fc=vmul(vadd(vadd(A,B),C),1/3);
      if(vdot(n,vsub(fc,c))<0)M.T.push([base+a,base+cc,base+b,mat]);else M.T.push([base+a,base+b,base+cc,mat]);}
  };
  doit(1);if(o.mx)doit(-1);
  return M;
}
/* bake into typed arrays with face normals + centers */
function bake(M,mats){
  const nv=M.P.length,nf=M.T.length,V=new Float32Array(nv*3),F=new Int32Array(nf*3),FM=new Uint8Array(nf),N=new Float32Array(nf*3),C=new Float32Array(nf*3);let R=0;
  M.P.forEach((p,i)=>{V[i*3]=p[0];V[i*3+1]=p[1];V[i*3+2]=p[2];R=Math.max(R,Math.hypot(p[0],p[1],p[2]));});
  M.T.forEach((t,i)=>{F[i*3]=t[0];F[i*3+1]=t[1];F[i*3+2]=t[2];FM[i]=t[3];const A=M.P[t[0]],B=M.P[t[1]],Cc=M.P[t[2]],n=vnorm(vcross(vsub(B,A),vsub(Cc,A)));
    N[i*3]=n[0];N[i*3+1]=n[1];N[i*3+2]=n[2];C[i*3]=(A[0]+B[0]+Cc[0])/3;C[i*3+1]=(A[1]+B[1]+Cc[1])/3;C[i*3+2]=(A[2]+B[2]+Cc[2])/3;});
  return {V,F,FM,N,C,nv,nf,R,mats};
}
