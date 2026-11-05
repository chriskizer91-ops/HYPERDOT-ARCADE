/* =====================================================================================
   2a. GRAPHICS CORE — WebGL2 context, programs, render targets, a mesh builder, and the
   shaders. The whole city lives in TRACK SPACE (u across the road, h above it, s along it),
   exactly like the original's game logic. The vertex shader bends it onto the road curve
   (world = pX(s)+u, pY(s)+h, s), so the city is built from plain boxes and still follows
   every bend and hill. Mirroring h -> -h in that same shader gives the wet-road reflection.
   ===================================================================================== */
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
const HDR=gl?!!gl.getExtension('EXT_color_buffer_float'):false;
if(gl)gl.getExtension('OES_texture_float_linear');
let GLERR=null;
/* the HUD is still a small dot matrix: H_M rows, as many columns as the screen's shape needs */
const H_M=180;let W=320,H=H_M;
const mc=document.createElement('canvas'),g=mc.getContext('2d',{willReadFrequently:false});
mc.width=W;mc.height=H;
function prog(vs,fs,name){
  const p=gl.createProgram();
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(t);gl.shaderSource(s,'#version 300 es\nprecision highp float;\nprecision highp int;\n'+src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);throw new Error((name||'')+' '+(t===gl.VERTEX_SHADER?'VS':'FS')+': '+log);}gl.attachShader(p,s);}
  gl.bindAttribLocation(p,0,'aPos');gl.bindAttribLocation(p,1,'aNrm');gl.bindAttribLocation(p,2,'aCol');gl.bindAttribLocation(p,3,'aExt');
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error((name||'')+' link: '+gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
/* ---------- render targets ---------- */
function mkTex(w,h,hdr,filter,mips){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  const f=hdr&&HDR;gl.texImage2D(gl.TEXTURE_2D,0,f?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,f?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mips?gl.LINEAR_MIPMAP_LINEAR:filter||gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter||gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;
}
function mkTarget(w,h,o={}){
  w=Math.max(1,w|0);h=Math.max(1,h|0);const T={w,h,t:mkTex(w,h,o.hdr!==false,o.filter,o.mips),f:gl.createFramebuffer(),mips:!!o.mips};
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,T.t,0);
  if(o.depth){T.d=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,T.d);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,T.d);}
  return T;
}
/* the main scene target can be multisampled: draw into renderbuffers, then resolve into a texture */
function mkMSTarget(w,h,samples){
  const T={w,h,samples,f:gl.createFramebuffer(),c:gl.createRenderbuffer(),d:gl.createRenderbuffer()};
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);
  gl.bindRenderbuffer(gl.RENDERBUFFER,T.c);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,HDR?gl.RGBA16F:gl.RGBA8,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,T.c);
  gl.bindRenderbuffer(gl.RENDERBUFFER,T.d);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,T.d);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteFramebuffer(T.f);gl.deleteRenderbuffer(T.c);gl.deleteRenderbuffer(T.d);return null;}
  return T;
}
function freeTarget(T){if(!T)return;if(T.t)gl.deleteTexture(T.t);if(T.f)gl.deleteFramebuffer(T.f);if(T.d)gl.deleteRenderbuffer(T.d);if(T.c)gl.deleteRenderbuffer(T.c);}

/* ---------- mesh builder: 14 floats a vertex (pos 3, normal 3, colour+material 4, extra 4) ---------- */
const VSTRIDE=14;
class MB{
  constructor(){this.v=[];this.n=0;}
  vert(x,y,z,nx,ny,nz,c,m,e){this.v.push(x,y,z,nx,ny,nz,c[0],c[1],c[2],m,e?e[0]:0,e?e[1]:0,e?e[2]:0,e?e[3]:0);this.n++;}
  /* a quad p0 p1 p2 p3 (counter-clockwise seen from outside), flat normal, optional per-corner uv in e[2],e[3] */
  quad(p0,p1,p2,p3,c,m,e,uv){
    const ax=p1[0]-p0[0],ay=p1[1]-p0[1],az=p1[2]-p0[2],bx=p3[0]-p0[0],by=p3[1]-p0[1],bz=p3[2]-p0[2];
    let nx=az*by-ay*bz,ny=ax*bz-az*bx,nz=ay*bx-ax*by;   /* outward for the corner order used below */const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const E=i=>uv?[e?e[0]:0,e?e[1]:0,uv[i][0],uv[i][1]]:e;
    for(const i of [0,1,2,0,2,3]){const p=[p0,p1,p2,p3][i];this.vert(p[0],p[1],p[2],nx,ny,nz,c,m,E(i));}
  }
  tri(p0,p1,p2,n0,n1,n2,c,m,e){this.vert(...p0,...n0,c,m,e);this.vert(...p1,...n1,c,m,e);this.vert(...p2,...n2,c,m,e);}
  /* an axis-aligned box, split along z every `seg` metres so the curve bends it smoothly.
     faces: bit 1 +x, 2 -x, 4 +y, 8 -y, 16 +z, 32 -z.  uvm: give faces metre-based uv in e[2..3] */
  box(x0,y0,z0,x1,y1,z1,c,m,e,faces=63,seg=8,uvm){
    const nz=Math.max(1,Math.ceil((z1-z0)/seg));
    for(let k=0;k<nz;k++){const za=z0+(z1-z0)*k/nz,zb=z0+(z1-z0)*(k+1)/nz;
      if(faces&1)this.quad([x1,y0,za],[x1,y0,zb],[x1,y1,zb],[x1,y1,za],c,m,e,uvm?[[za,y0],[zb,y0],[zb,y1],[za,y1]]:null);
      if(faces&2)this.quad([x0,y0,zb],[x0,y0,za],[x0,y1,za],[x0,y1,zb],c,m,e,uvm?[[-zb,y0],[-za,y0],[-za,y1],[-zb,y1]]:null);
      if(faces&4)this.quad([x0,y1,za],[x1,y1,za],[x1,y1,zb],[x0,y1,zb],c,m,e,uvm?[[x0,za],[x1,za],[x1,zb],[x0,zb]]:null);
      if(faces&8)this.quad([x0,y0,zb],[x1,y0,zb],[x1,y0,za],[x0,y0,za],c,m,e);}
    if(faces&16)this.quad([x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],c,m,e,uvm?[[-x1,y0],[-x0,y0],[-x0,y1],[-x1,y1]]:null);
    if(faces&32)this.quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],c,m,e,uvm?[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]:null);
  }
  /* a flat panel facing +x/-x (sx=±1) or +z/-z (sz=±1), with 0..1 uv for signs and screens */
  panel(cx,cy,cz,w,h,face,c,m,seed,style){
    const e0=[seed,style];let P;
    if(face==='+x')P=[[cx,cy-h/2,cz-w/2],[cx,cy-h/2,cz+w/2],[cx,cy+h/2,cz+w/2],[cx,cy+h/2,cz-w/2]];
    else if(face==='-x')P=[[cx,cy-h/2,cz+w/2],[cx,cy-h/2,cz-w/2],[cx,cy+h/2,cz-w/2],[cx,cy+h/2,cz+w/2]];
    else if(face==='-z')P=[[cx-w/2,cy-h/2,cz],[cx+w/2,cy-h/2,cz],[cx+w/2,cy+h/2,cz],[cx-w/2,cy+h/2,cz]];
    else P=[[cx+w/2,cy-h/2,cz],[cx-w/2,cy-h/2,cz],[cx-w/2,cy+h/2,cz],[cx+w/2,cy+h/2,cz]];
    this.quad(P[0],P[1],P[2],P[3],c,m,e0,[[0,0],[1,0],[1,1],[0,1]]);
  }
  /* a smooth loft through cross-sections (each a closed ring of [x,y] at a z), the tool for vehicle bodies.
     mat(i,j) picks the material of each face so glass and paint can share one smooth surface. */
  loft(secs,col,mat,ext,capA=true,capB=true){
    const N=secs[0].pts.length,S=secs.length,P=[],Nn=[];
    for(let i=0;i<S;i++){P.push([]);Nn.push([]);for(let j=0;j<N;j++){P[i].push([secs[i].pts[j][0],secs[i].pts[j][1],secs[i].z+(secs[i].dz?secs[i].dz[j]:0)]);Nn[i].push([0,0,0]);}}
    const fn=(a,b,c2)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c2[0]-a[0],vy=c2[1]-a[1],vz=c2[2]-a[2];return [uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];};
    for(let i=0;i<S-1;i++)for(let j=0;j<N;j++){const j2=(j+1)%N,a=P[i][j],b=P[i][j2],c2=P[i+1][j2],d=P[i+1][j];const f=fn(a,b,c2),f2=fn(a,c2,d);
      for(const [ii,jj] of [[i,j],[i,j2],[i+1,j2],[i+1,j]]){const t=Nn[ii][jj];t[0]+=f[0]+f2[0];t[1]+=f[1]+f2[1];t[2]+=f[2]+f2[2];}}
    for(const row of Nn)for(const t of row){const l=Math.hypot(t[0],t[1],t[2])||1;t[0]/=l;t[1]/=l;t[2]/=l;}
    for(let i=0;i<S-1;i++)for(let j=0;j<N;j++){const j2=(j+1)%N,m=mat?mat(i,j):0,c=Array.isArray(col)?col:col(i,j),e=typeof ext==='function'?ext(i,j):ext;
      this.tri(P[i][j],P[i][j2],P[i+1][j2],Nn[i][j],Nn[i][j2],Nn[i+1][j2],c,m,e);this.tri(P[i][j],P[i+1][j2],P[i+1][j],Nn[i][j],Nn[i+1][j2],Nn[i+1][j],c,m,e);}
    const cap=(i,flip)=>{let cx=0,cy=0,cz=0;for(const p of P[i]){cx+=p[0];cy+=p[1];cz+=p[2];}cx/=N;cy/=N;cz/=N;const nz=flip?1:-1;const c=Array.isArray(col)?col:col(i,0),m=mat?mat(Math.min(i,S-2),0):0,e=typeof ext==='function'?ext(i,0):ext;
      for(let j=0;j<N;j++){const j2=(j+1)%N;if(flip)this.tri([cx,cy,cz],P[i][j],P[i][j2],[0,0,nz],[0,0,nz],[0,0,nz],c,m,e);else this.tri([cx,cy,cz],P[i][j2],P[i][j],[0,0,nz],[0,0,nz],[0,0,nz],c,m,e);}};
    if(capA)cap(0,false);if(capB)cap(S-1,true);
  }
  /* a cylinder (or cone, with r1) of radius r.
     axis 'z': cyl(x, y, z0, z1)   axis 'y': cyl(x, z, y0, y1)   axis 'x': cyl(z, y, x0, x1) */
  cyl(a,b,t0,t1,r,seg,c,m,e,capped=true,axis='z',r1){
    const secs=[];const R1=r1==null?r:r1;
    for(const [z,rr] of [[t0,r],[t1,R1]]){const pts=[];for(let k=0;k<seg;k++){const an=k/seg*TAU;pts.push([a+Math.cos(an)*rr,b+Math.sin(an)*rr]);}secs.push({z,pts});}
    if(axis==='z'){this.loft(secs,c,()=>m,e,capped,capped);return;}
    const tmp=new MB();tmp.loft(secs,c,()=>m,e,capped,capped);const v=tmp.v;
    for(let i=0;i<v.length;i+=VSTRIDE){const x=v[i],y=v[i+1],z=v[i+2],nx=v[i+3],ny=v[i+4],nz=v[i+5];
      if(axis==='y'){v[i+1]=z;v[i+2]=y;v[i+4]=nz;v[i+5]=ny;}
      else{v[i]=z;v[i+2]=x;v[i+3]=nz;v[i+5]=nx;}}
    for(let i=0;i<v.length;i++)this.v.push(v[i]);this.n+=tmp.n;
  }
  /* a torus in the xy plane at z, for thruster rings */
  torus(cx,cy,cz,R,r,segA,segB,c,m,e){
    for(let i=0;i<segA;i++)for(let j=0;j<segB;j++){
      const P=(a,b)=>{const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);return [[cx+(R+r*cb)*ca,cy+(R+r*cb)*sa,cz+r*sb],[cb*ca,cb*sa,sb]];};
      const a0=i/segA*TAU,a1=(i+1)/segA*TAU,b0=j/segB*TAU,b1=(j+1)/segB*TAU;const A=P(a0,b0),B=P(a1,b0),C=P(a1,b1),D=P(a0,b1);
      this.tri(A[0],B[0],C[0],A[1],B[1],C[1],c,m,e);this.tri(A[0],C[0],D[0],A[1],C[1],D[1],c,m,e);}
  }
  sphere(cx,cy,cz,rx,ry,rz,seg,c,m,e){
    const st=Math.max(4,seg>>1);
    for(let i=0;i<st;i++)for(let j=0;j<seg;j++){
      const P=(a,b)=>{const x=Math.sin(a)*Math.cos(b),y=Math.cos(a),z=Math.sin(a)*Math.sin(b);return [[cx+x*rx,cy+y*ry,cz+z*rz],[x/rx,y/ry,z/rz]];};
      const a0=i/st*Math.PI,a1=(i+1)/st*Math.PI,b0=j/seg*TAU,b1=(j+1)/seg*TAU;const A=P(a0,b0),B=P(a0,b1),C=P(a1,b1),D=P(a1,b0);
      const nn=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];};
      this.tri(A[0],C[0],B[0],nn(A[1]),nn(C[1]),nn(B[1]),c,m,e);this.tri(A[0],D[0],C[0],nn(A[1]),nn(D[1]),nn(C[1]),c,m,e);}
  }
  /* move everything already in the builder (or from index i0 on) */
  xform(fn,i0=0){for(let i=i0*VSTRIDE;i<this.v.length;i+=VSTRIDE){const r=fn(this.v[i],this.v[i+1],this.v[i+2],this.v[i+3],this.v[i+4],this.v[i+5]);this.v[i]=r[0];this.v[i+1]=r[1];this.v[i+2]=r[2];if(r.length>3){this.v[i+3]=r[3];this.v[i+4]=r[4];this.v[i+5]=r[5];}}}
  upload(old){
    const data=new Float32Array(this.v);let M=old;
    if(!M){M={vao:gl.createVertexArray(),buf:gl.createBuffer(),n:0,cap:0};}
    gl.bindVertexArray(M.vao);gl.bindBuffer(gl.ARRAY_BUFFER,M.buf);
    if(data.byteLength>M.cap){gl.bufferData(gl.ARRAY_BUFFER,data,old?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);M.cap=data.byteLength;}else gl.bufferSubData(gl.ARRAY_BUFFER,0,data);
    const S=VSTRIDE*4;
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,S,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,S,12);
    gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,S,24);
    gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.FLOAT,false,S,40);
    gl.bindVertexArray(null);M.n=this.n;return M;
  }
}
function freeMesh(M){if(!M)return;gl.deleteBuffer(M.buf);gl.deleteVertexArray(M.vao);}
/* a shared integer hash, the same in JS and GLSL, so a sign and the coloured light it throws agree */
function ihash(x){x=(x|0)>>>0;x=Math.imul(x^(x>>>16),0x7feb352d)>>>0;x=Math.imul(x^(x>>>15),0x846ca68b)>>>0;return ((x^(x>>>16))>>>0)/4294967296;}
const ihash2=(a,b)=>ihash((a|0)*73856093^(b|0)*19349663);
