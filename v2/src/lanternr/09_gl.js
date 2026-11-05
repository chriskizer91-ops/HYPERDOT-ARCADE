/* =====================================================================================
   18. 3D — THE GL DEVICE: context, shader programs, textures, render targets and meshes
   ===================================================================================== */
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:true,stencil:false,premultipliedAlpha:false,powerPreference:'high-performance'});
const HDR=gl?!!gl.getExtension('EXT_color_buffer_float'):false;
let GLERR=null;
function prog(vs,fs,defs){
  const p=gl.createProgram(),head='#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler2DShadow;\n'+(defs||'');
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(t);gl.shaderSource(s,head+src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);const lines=(head+src).split('\n');const m=/0:(\d+)/.exec(log);throw new Error(log+(m?'\n> '+lines[m[1]-1]:''));}gl.attachShader(p,s);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
function texParams(filter,wrap){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter===gl.LINEAR_MIPMAP_LINEAR?gl.LINEAR:filter);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrap||gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrap||gl.CLAMP_TO_EDGE);}
function mkTex(w,h,ifmt,fmt,type,data,filter,wrap){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,data||null);texParams(filter||gl.LINEAR,wrap);return t;}
/* colour targets: half-float when the GPU can render to it (bright lights stay bright), 8-bit otherwise */
function mkTarget(w,h,depth,ldr){w=Math.max(1,w|0);h=Math.max(1,h|0);const hdr=HDR&&!ldr;
  const t=mkTex(w,h,hdr?gl.RGBA16F:gl.RGBA8,gl.RGBA,hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null,gl.LINEAR);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);let d=null;
  if(depth){d=mkTex(w,h,gl.DEPTH_COMPONENT24,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null,gl.NEAREST);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,d,0);}
  return {t,f,d,w,h};}
function freeTarget(T){if(!T)return;gl.deleteTexture(T.t);if(T.d)gl.deleteTexture(T.d);gl.deleteFramebuffer(T.f);}
function mkShadowTarget(sz){const d=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,d);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,sz,sz,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  texParams(gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,d,0);return {d,f,w:sz,h:sz};}
/* ---------- meshes. A mesh builder takes points of the town (x east, y south, z up) and stores them for GL ----------
   per vertex: position, normal, albedo + gloss, and a material word: id, glow, a per-object seed, occlusion */
class MB{
  constructor(){this.P=[];this.Nn=[];this.C=[];this.Mt=[];this.I=[];this.n=0;}
  v(x,y,z,nx,ny,nz,c,m){this.P.push(x,z,y);this.Nn.push(nx*127|0,nz*127|0,ny*127|0,0);if(c.raw)this.C.push(c[0],c[1],c[2],c[3]);else this.C.push(c[0]*255|0,c[1]*255|0,c[2]*255|0,(c[3]==null?.2:c[3])*255|0);
    this.Mt.push(m[0]|0,(m[1]||0)*255|0,m[2]|0,(m[3]==null?1:m[3])*255|0);return this.n++;}
  tri(a,b,c){this.I.push(a,b,c);}
  /* a flat quad from four corners (counter-clockwise seen from the front) with one normal */
  quad(p0,p1,p2,p3,c,m,nrm){let n=nrm;if(!n){const ax=p1[0]-p0[0],ay=p1[1]-p0[1],az=p1[2]-p0[2],bx=p3[0]-p0[0],by=p3[1]-p0[1],bz=p3[2]-p0[2];
      /* the town is left-handed in (x east, y south, z up), so the front normal is b x a */
      n=[by*az-bz*ay,bz*ax-bx*az,bx*ay-by*ax];const l=Math.hypot(n[0],n[1],n[2])||1;n=[n[0]/l,n[1]/l,n[2]/l];}
    const a=this.v(p0[0],p0[1],p0[2],n[0],n[1],n[2],c,m),b=this.v(p1[0],p1[1],p1[2],n[0],n[1],n[2],c,m),d=this.v(p2[0],p2[1],p2[2],n[0],n[1],n[2],c,m),e=this.v(p3[0],p3[1],p3[2],n[0],n[1],n[2],c,m);
    this.I.push(a,b,d,a,d,e);}
  /* an axis-aligned box; faces: 1 +x, 2 -x, 4 +y(south), 8 -y(north), 16 top, 32 bottom */
  box(x0,y0,z0,x1,y1,z1,c,m,faces){faces=faces==null?31:faces;
    if(faces&16)this.quad([x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[x1,y0,z1],c,m,[0,0,1]);
    if(faces&32)this.quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],c,m,[0,0,-1]);
    if(faces&4)this.quad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],c,m,[0,1,0]);
    if(faces&8)this.quad([x1,y0,z0],[x0,y0,z0],[x0,y0,z1],[x1,y0,z1],c,m,[0,-1,0]);
    if(faces&1)this.quad([x1,y1,z0],[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],c,m,[1,0,0]);
    if(faces&2)this.quad([x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1],c,m,[-1,0,0]);}
  /* a (tapered) cylinder about a vertical axis */
  cyl(cx,cy,z0,z1,r0,r1,seg,c,m,caps){const base=this.n,k=(r0-r1)/(z1-z0||1);
    for(let i=0;i<=seg;i++){const a=i/seg*TAU,ca=Math.cos(a),sa=Math.sin(a),l=Math.hypot(1,k);
      this.v(cx+ca*r0,cy+sa*r0,z0,ca/l,sa/l,k/l,c,m);this.v(cx+ca*r1,cy+sa*r1,z1,ca/l,sa/l,k/l,c,m);}
    for(let i=0;i<seg;i++){const a=base+i*2;this.I.push(a,a+3,a+2,a,a+1,a+3);}
    if(caps!==false&&r1>0){const ct=this.v(cx,cy,z1,0,0,1,c,m),b2=this.n;for(let i=0;i<=seg;i++){const a=i/seg*TAU;this.v(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1,z1,0,0,1,c,m);}
      for(let i=0;i<seg;i++)this.I.push(ct,b2+i+1,b2+i);}}
  /* a lumpy ball: a subdivided octahedron pushed out by a noise function */
  blob(cx,cy,cz,rx,ry,rz,div,c,m,lump,seed){const verts=[],key={},idx=[];
    const add=(x,y,z)=>{const l=Math.hypot(x,y,z);x/=l;y/=l;z/=l;const k=(x*1e4|0)+','+(y*1e4|0)+','+(z*1e4|0);if(key[k]!=null)return key[k];verts.push([x,y,z]);return key[k]=verts.length-1;};
    let faces=[[0,0,1,1,0,0,0,1,0],[0,0,1,0,1,0,-1,0,0],[0,0,1,-1,0,0,0,-1,0],[0,0,1,0,-1,0,1,0,0],[0,0,-1,0,1,0,1,0,0],[0,0,-1,-1,0,0,0,1,0],[0,0,-1,0,-1,0,-1,0,0],[0,0,-1,1,0,0,0,-1,0]].map(f=>[[f[0],f[1],f[2]],[f[3],f[4],f[5]],[f[6],f[7],f[8]]]);
    for(let d=0;d<div;d++){const nf=[];for(const [a,b,cc] of faces){const ab=a.map((v,i)=>(v+b[i])/2),bc=b.map((v,i)=>(v+cc[i])/2),ca=cc.map((v,i)=>(v+a[i])/2);nf.push([a,ab,ca],[ab,b,bc],[ca,bc,cc],[ab,bc,ca]);}faces=nf;}
    for(const f of faces)idx.push(add(...f[0]),add(...f[1]),add(...f[2]));
    const base=this.n,pos=verts.map(([x,y,z])=>{const s=1+(lump||0)*(vnoise(x*2.3+seed,y*2.3+z*1.7,seed|0)-.5)*2;return [cx+x*rx*s,cy+y*ry*s,cz+z*rz*s];});
    const nrm=verts.map(()=>[0,0,0]);for(let i=0;i<idx.length;i+=3){const a=pos[idx[i]],b=pos[idx[i+1]],cc=pos[idx[i+2]];const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=cc[0]-a[0],vy=cc[1]-a[1],vz=cc[2]-a[2];
      const n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];for(const j of [idx[i],idx[i+1],idx[i+2]]){nrm[j][0]+=n[0];nrm[j][1]+=n[1];nrm[j][2]+=n[2];}}
    for(let i=0;i<pos.length;i++){const n=nrm[i],l=Math.hypot(n[0],n[1],n[2])||1;this.v(pos[i][0],pos[i][1],pos[i][2],n[0]/l,n[1]/l,n[2]/l,c,m);}
    /* the octahedron's faces wind the other way round in the town's left-handed frame */
    for(let i=0;i<idx.length;i+=3)this.I.push(base+idx[i],base+idx[i+2],base+idx[i+1]);}
  /* a solid of revolution from a profile [[r,z],...] */
  lathe(cx,cy,prof,seg,c,m){const base=this.n;
    for(let j=0;j<prof.length;j++){const [r,z]=prof[j],p=prof[Math.max(0,j-1)],q=prof[Math.min(prof.length-1,j+1)],dr=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dr,dz)||1,nr=dz/l,nz=-dr/l;
      for(let i=0;i<=seg;i++){const a=i/seg*TAU,ca=Math.cos(a),sa=Math.sin(a);this.v(cx+ca*r,cy+sa*r,z,ca*nr,sa*nr,nz,c,m);}}
    for(let j=0;j<prof.length-1;j++)for(let i=0;i<seg;i++){const a=base+j*(seg+1)+i,b=a+seg+1;this.I.push(a,b+1,a+1,a,b,b+1);}}
  build(){if(!this.n)return null;const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const buf=(data,loc,size,type,norm)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);
      if(type===gl.FLOAT||norm)gl.vertexAttribPointer(loc,size,type,!!norm,0,0);else gl.vertexAttribPointer(loc,size,type,false,0,0);return b;};
    const bs=[buf(new Float32Array(this.P),0,3,gl.FLOAT),buf(new Int8Array(this.Nn),1,4,gl.BYTE,true),buf(new Uint8Array(this.C),2,4,gl.UNSIGNED_BYTE,true),buf(new Uint8Array(this.Mt),3,4,gl.UNSIGNED_BYTE,false)];
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(this.I),gl.STATIC_DRAW);gl.bindVertexArray(null);
    return {vao,n:this.I.length,bs:bs.concat(ib),tris:this.I.length/3};}
}
function freeMesh(m){if(!m)return;gl.deleteVertexArray(m.vao);for(const b of m.bs)gl.deleteBuffer(b);}
function drawMesh(m){if(!m)return;gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.n,gl.UNSIGNED_INT,0);}
