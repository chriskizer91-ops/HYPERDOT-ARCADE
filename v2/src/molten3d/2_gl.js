/* =====================================================================================
   GRAPHICS — the simulation is still a 320 x 180 grid of matter; this draws it as a cavern.
     upload   cell state (material, temperature, grain, extra), GI sprites, voxel sprites (RGBA8)
     MAT      per-cell emission + opacity                       \
     JFA      distance field to the nearest opaque cell           > the original's 2D global
     RC 4..0  radiance cascades through that field               /  illumination, kept as is
     LIGHT    fluence per probe (+ dominant light direction)
     BLUR     a wide soft blur of the emission (spill light, and the whole light on LOW)
     TERRAIN  a jump flood to the rock/air boundary gives every cell a depth: rock juts toward
              the camera, open cave recedes up to 60 cells behind the play channel
     CELL     per cell: terrain depth, play-channel slab, voxel-sprite thickness, medium
     GAS      smoothed steam / smoke density and hot-air haze (filtered)
     MARCH    one ray per pixel walks the grid cell by cell (2D DDA, extruded in depth)
     MESH     the crucible, its trolley and the furnace hood
     PARTS    flying matter (drops, the pour, embers, steam puffs) as streaks in 3D
     POST     heat shimmer, bloom, ACES, then the LED-dot HUD (and the optional DOTS filter)
   Space: "sim" coordinates are (u right, v down, z toward the camera) in cells; "world" is
   (u, -v, z), right-handed with y up, used for the matrices.
   ===================================================================================== */
const W=320,H=180,N=W*H;
const mc=document.createElement('canvas');mc.width=W;mc.height=H;const g=mc.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,powerPreference:'high-performance'});
const HDR=gl?!!gl.getExtension('EXT_color_buffer_float'):false;
if(gl)gl.getExtension('OES_texture_float_linear');
function prog(vs,fs){
  const p=gl.createProgram();
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(t);gl.shaderSource(s,'#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n'+src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
const VS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
/* material ids shared by every shader (kept in sync with the simulation's table). Bit 7 of the
   material byte marks a flying particle stamped into the grid: it lights the cave but is drawn
   as a particle, not as a wall. */
const GLSL_MATS=`const int AIR=0,ROCK=1,BED=2,RAIL=3,IRON=4,SLAG=5,LAVA=6,WATER=7,STEAM=8,SMOKE=9,ICE=10,SNOW=11,RUBBLE=12,EMBER=13,CRYST=14,HOUSE=15;
uniform sampler2D uBB;
vec3 bb(float T){return texture(uBB,vec2(clamp((T+40.)/2080.,0.,1.),.5)).rgb;}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
void cellOf(vec4 s,out int m,out float T){m=int(s.r*255.+.5)&127;T=s.g*2040.-40.;}
`;
/* MAT: emission and opacity. Every opaque cell glows with the blackbody colour of its own temperature. */
const FS_MAT=`${GLSL_MATS}
uniform sampler2D uState;uniform sampler2D uSpr;uniform float uTime;uniform vec3 uCryst;out vec4 o;
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);vec4 s=texelFetch(uState,p,0);int m;float T;cellOf(s,m,T);
  float op=(m==AIR||m==WATER||m==STEAM||m==SMOKE)?0.:1.;
  vec3 e=op>0.?bb(T):vec3(0);
  if(m==LAVA)e*=.82+.36*vn(vec2(p)*.45+vec2(uTime*.7,-uTime*1.1));
  if(m==CRYST)e+=uCryst*(1.5+.5*sin(uTime*1.7+s.b*40.));
  vec4 sp=texelFetch(uSpr,p,0);
  if(sp.a>0.){int a=int(sp.a*255.+.5);op=1.;e=a==255?vec3(0):pow(sp.rgb,vec3(2.2))*float(a)/254.*6.;}
  o=vec4(e,op);
}`;
const FS_JSEED=`uniform sampler2D uTex;out vec4 o;void main(){ivec2 p=ivec2(gl_FragCoord.xy);float a=texelFetch(uTex,p,0).a;o=a>.5?vec4(vec2(p)+.5,0.,1.):vec4(-1e4,-1e4,0.,0.);}`;
const FS_JSTEP=`uniform sampler2D uTex;uniform float uK;uniform vec2 uSize;out vec4 o;
void main(){vec2 p=gl_FragCoord.xy;vec4 best=vec4(-1e4,-1e4,0.,0.);float bd=1e9;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 q=p+vec2(i,j)*uK;if(q.x<0.||q.y<0.||q.x>=uSize.x||q.y>=uSize.y)continue;
    vec4 s=texelFetch(uTex,ivec2(q),0);if(s.x<-1e3)continue;vec2 d=s.xy-p;float dd=dot(d,d);if(dd<bd){bd=dd;best=s;}}
  o=best;}`;
const FS_RC=`uniform sampler2D uJFA;uniform sampler2D uEmit;uniform sampler2D uUp;
uniform ivec2 uPr;uniform int uBW;uniform float uSp;uniform float uT0;uniform float uT1;uniform int uHasUp;uniform ivec2 uPrU;uniform vec2 uUpSize;uniform vec2 uWorld;out vec4 o;
float sdBox(vec2 q){vec4 s=texelFetch(uJFA,ivec2(q),0);if(s.x<-1e3)return 1e3;vec2 d=abs(q-s.xy)-.5;return length(max(d,0.))+min(max(d.x,d.y),0.);}
void main(){
  ivec2 t=ivec2(gl_FragCoord.xy);ivec2 b=t/uPr;ivec2 pr=t-b*uPr;
  if(b.x>=uBW||b.y>=uBW){o=vec4(0);return;}
  int dirs=uBW*uBW,d=b.x+b.y*uBW;
  vec2 P=(vec2(pr)+.5)*uSp;
  float a=(float(d)+.5)*6.28318531/float(dirs);vec2 dir=vec2(cos(a),sin(a));
  vec4 r=vec4(0,0,0,1);float tt=uT0;
  for(int s=0;s<28;s++){
    vec2 q=P+dir*tt;
    if(q.x<0.||q.y<0.||q.x>=uWorld.x||q.y>=uWorld.y){r=vec4(0);break;}
    float sd=sdBox(q);
    if(sd<0.){r=vec4(texelFetch(uEmit,ivec2(q),0).rgb,0.);break;}
    tt+=max(sd,.4);if(tt>=uT1)break;
  }
  if(r.a>0.&&uHasUp==1){
    vec2 pu=clamp(P/(2.*uSp)-.5,vec2(0),vec2(uPrU)-1.);vec4 acc=vec4(0);int bwu=uBW*2;
    for(int k=0;k<4;k++){int du=d*4+k;ivec2 bu=ivec2(du-(du/bwu)*bwu,du/bwu);acc+=texture(uUp,(vec2(bu*uPrU)+pu+.5)/uUpSize);}
    acc*=.25;r.rgb+=acc.rgb*r.a;r.a*=acc.a;
  }
  o=r;
}`;
const FS_LIGHT=`uniform sampler2D uC0;uniform ivec2 uPr;layout(location=0) out vec4 o;layout(location=1) out vec4 o2;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);vec3 s=vec3(0);vec2 dv=vec2(0);
  for(int d=0;d<4;d++){ivec2 b=ivec2(d&1,d>>1);vec3 c=texelFetch(uC0,b*uPr+p,0).rgb;s+=c;float a=(float(d)+.5)*1.57079633;dv+=vec2(cos(a),sin(a))*dot(c,vec3(.3,.55,.15));}
  o=vec4(s*.25,1.);o2=vec4(dv*.25,0.,1.);}`;
const FS_DOWN=`uniform sampler2D uTex;uniform vec2 uPx;out vec4 o;void main(){vec2 uv=gl_FragCoord.xy*uPx;o=vec4((texture(uTex,uv-uPx*.5).rgb+texture(uTex,uv+uPx*.5).rgb+texture(uTex,uv+vec2(uPx.x,-uPx.y)*.5).rgb+texture(uTex,uv+vec2(-uPx.x,uPx.y)*.5).rgb)*.25,1.);}`;
/* TERRAIN seeds: the cells on either side of every rock / not-rock edge */
const FS_BSEED=`${GLSL_MATS}
uniform sampler2D uState;out vec4 o;
bool rk(ivec2 q){q=clamp(q,ivec2(0),ivec2(319,179));int m=int(texelFetch(uState,q,0).r*255.+.5)&127;return m==ROCK||m==BED||m==CRYST;}
void main(){ivec2 p=ivec2(gl_FragCoord.xy);bool r=rk(p);
  bool b=r!=rk(p+ivec2(1,0))||r!=rk(p-ivec2(1,0))||r!=rk(p+ivec2(0,1))||r!=rk(p-ivec2(0,1));
  o=b?vec4(vec2(p)+.5,0.,1.):vec4(-1e4,-1e4,0.,0.);}`;
/* CELL: the 3D shape of every cell.
     r  terrain front depth: rock juts out (8 + up to 11 cells as it gets deeper into the rock),
        everything else has open cave behind it that recedes with distance from the rock
     g  half-depth of the play-channel slab (iron, lava, ice, snow, rubble: 8; the heart's housing
        6.5; the rail 2), 0 for none
     b  voxel sprite half-thickness (a Rime body is thickest in its middle)
     a  medium: 1 water, 2 steam or smoke */
const FS_CELL=`${GLSL_MATS}
uniform sampler2D uState;uniform sampler2D uJB;uniform sampler2D uVox;uniform sampler2D uGas;out vec4 o;
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);vec2 pc=vec2(p)+.5;
  vec4 s=texelFetch(uState,p,0);int raw=int(s.r*255.+.5);bool fly=raw>=128;int m=raw&127;
  bool rock=m==ROCK||m==BED||m==CRYST;
  vec4 jb=texelFetch(uJB,p,0);vec2 jo=rock?jb.zw:jb.xy;float d=jo.x<-1e3?99.:max(0.,length(jo-pc)-1.);
  float n1=vn(pc*.11),n2=h21(pc*1.37),n3=vn(pc*.031+7.);
  float zT;
  if(rock)zT=8.+min(11.,d*.62)+(n1-.5)*2.6+(n2-.5)*.9;
  else zT=-8.-min(54.,pow(d,.92)*.95)*(.8+.4*n1)-n2*1.2-n3*2.5;
  zT=clamp(zT,-63.,25.);
  float sh=0.;int med=0;
  /* loose matter (snow, rubble, liquids) is only as deep as it is supported: a lone falling flake or
     drop is a small cube, a pile or a pool spans the whole channel */
  float fill=1.;
  bool loose=m==SNOW||m==RUBBLE||m==LAVA||m==WATER||m==EMBER,castm=m==IRON||m==SLAG||m==ICE;
  if(loose||castm){int cnt=0;
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){if(i==0&&j==0)continue;int r2=int(texelFetch(uState,clamp(p+ivec2(i,j),ivec2(0),ivec2(319,179)),0).r*255.+.5);int m2=r2&127;if(r2<128&&m2!=AIR&&m2!=STEAM&&m2!=SMOKE)cnt++;}
    fill=loose?smoothstep(1.5,4.5,float(cnt)):smoothstep(.5,2.5,float(cnt));}   /* a lone frozen drop is a bead; a wall of any thickness spans the channel */
  if(!rock&&!fly){
    if(m==WATER)med=10+int(max(.9,8.*fill)*10.+.5);
    else if(m==HOUSE)sh=6.5;else if(m==RAIL)sh=2.;
    else if(m==IRON||m==SLAG)sh=7.3+n2*.7;else if(m==ICE)sh=7.4+n2*.8;else if(m==SNOW)sh=7.1+n2*.6;
    else if(m!=AIR)sh=8.;
    if(loose&&m!=WATER||castm)sh=max(.9,sh*fill);
  }
  if(med==0&&(sh==0.||sh==2.)){float gm=0.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec4 gq=texelFetch(uGas,clamp(p+ivec2(i,j),ivec2(0),ivec2(319,179)),0);gm=max(gm,max(gq.r+gq.g,gq.b));}if(gm>.008)med=2;}
  float sz=0.;
  if(texelFetch(uVox,p,0).a>0.){float best=6.;
    for(int j=-5;j<=5;j++)for(int i=-5;i<=5;i++){ivec2 q=p+ivec2(i,j);if(q.x<0||q.y<0||q.x>319||q.y>179)continue;if(texelFetch(uVox,q,0).a==0.)best=min(best,length(vec2(i,j)));}
    sz=clamp(.55+best*1.05,1.1,6.2);}
  o=vec4((zT+64.)/90.,sh/10.,sz/10.,float(med)/255.);
}`;
/* GAS: steam and smoke as a smooth density (filtered when sampled), plus how much the air shimmers */
const FS_GAS=`${GLSL_MATS}
uniform sampler2D uState;out vec4 o;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);float st=0.,sm=0.;
  for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){ivec2 q=clamp(p+ivec2(i,j),ivec2(0),ivec2(319,179));int raw=int(texelFetch(uState,q,0).r*255.+.5),m=raw&127;float w=exp(-float(i*i+j*j)*.35)*1.5;if(raw>=128)w*=.4;
    if(m==STEAM)st+=w;else if(m==SMOKE)sm+=w;}
  vec4 s=texelFetch(uState,p,0);int m;float T;cellOf(s,m,T);bool fly=s.r*255.>127.5;
  float hz=!fly&&(m==AIR||m==STEAM||m==SMOKE)?clamp((T-140.)/700.,0.,1.):0.;   /* hot air shimmers; a falling drop does not */
  o=vec4(min(1.,st/8.),min(1.,sm/8.),hz,1.);}`;
/* COARSE: one texel per 4x4 cells: the nearest terrain in the block and whether anything else lives
   there. A ray that stays in front of a block's terrain and finds nothing else in it skips the block. */
const FS_COARSE=`uniform sampler2D uCell;out vec4 o;
void main(){ivec2 b=ivec2(gl_FragCoord.xy)*4;float mx=0.,busy=0.;
  for(int j=0;j<4;j++)for(int i=0;i<4;i++){vec4 d=texelFetch(uCell,min(b+ivec2(i,j),ivec2(319,179)),0);mx=max(mx,d.r);if(d.g>0.||d.b>0.||d.a>0.)busy=1.;}
  o=vec4(mx,busy,0.,1.);}`;
const FS_MARCH=`/*@@MARCH@@*/`;
/* ---------------------------------------------------------------------------------
   V3 — the sculpted cavern. Four jump floods measure, for every cell, how far it is from the edge
   of the rock, of the play-channel matter (iron, lava, ice...), of the Rime and of the water;
   inside counts negative. From those 2D distances one smooth 3D distance field is built and
   sphere-traced: rounded rock, pillowed cast iron, puffy crystal creatures.
   --------------------------------------------------------------------------------- */
const FS_KSEED=`${GLSL_MATS}
uniform sampler2D uState;uniform sampler2D uVox;uniform int uCls;out vec4 o;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);int raw=int(texelFetch(uState,p,0).r*255.+.5),m=raw&127;bool fly=raw>=128,c;
  if(uCls==0)c=m==ROCK||m==BED||m==CRYST;
  else if(uCls==1)c=!fly&&(m==IRON||m==SLAG||m==ICE||m==SNOW||m==RUBBLE||m==LAVA||m==EMBER||m==HOUSE||m==RAIL);
  else if(uCls==2)c=texelFetch(uVox,p,0).a>0.;
  else c=!fly&&m==WATER;
  vec2 pc=vec2(p)+.5;o=c?vec4(pc,-1e4,-1e4):vec4(-1e4,-1e4,pc);}`;
/* each texel keeps two seeds: the nearest cell inside the class (xy) and the nearest outside it (zw) */
const FS_KSTEP=`uniform sampler2D uTex;uniform float uK;out vec4 o;
void main(){vec2 p=gl_FragCoord.xy;vec4 best=vec4(-1e4);float b1=1e9,b2=1e9;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 q=p+vec2(i,j)*uK;if(q.x<0.||q.y<0.||q.x>=320.||q.y>=180.)continue;vec4 s=texelFetch(uTex,ivec2(q),0);
    if(s.x>-1e3){vec2 d=s.xy-p;float dd=dot(d,d);if(dd<b1){b1=dd;best.xy=s.xy;}}
    if(s.z>-1e3){vec2 d=s.zw-p;float dd=dot(d,d);if(dd<b2){b2=dd;best.zw=s.zw;}}}
  o=best;}`;
/* FIELD: A = rock distance, rock front depth, cave back depth, water distance
          B = matter distance, matter half-depth, Rime distance, water half-depth */
const FS_FIELD=`${GLSL_MATS}
uniform sampler2D uKR;uniform sampler2D uKS;uniform sampler2D uKP;uniform sampler2D uKW;uniform sampler2D uState;
layout(location=0) out vec4 oA;layout(location=1) out vec4 oB;
float sdk(vec4 k,vec2 pc,float far){bool in_=k.x>-1e3&&dot(k.xy-pc,k.xy-pc)<.01;
  if(in_)return k.z<-1e3?-far:-(length(k.zw-pc)-.5);return k.x<-1e3?far:length(k.xy-pc)-.5;}
int support(ivec2 q){int cnt=0;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){if(i==0&&j==0)continue;int r2=int(texelFetch(uState,clamp(q+ivec2(i,j),ivec2(0),ivec2(319,179)),0).r*255.+.5);int m2=r2&127;if(r2<128&&m2!=AIR&&m2!=STEAM&&m2!=SMOKE)cnt++;}return cnt;}
float shOf(ivec2 q){q=clamp(q,ivec2(0),ivec2(319,179));int raw=int(texelFetch(uState,q,0).r*255.+.5),m=raw&127;if(raw>=128)return 0.;
  float n2=h21((vec2(q)+.5)*1.37),sh;
  if(m==HOUSE)sh=6.5;else if(m==RAIL)sh=2.;else if(m==IRON||m==SLAG)sh=7.3+n2*.7;else if(m==ICE)sh=7.4+n2*.8;else if(m==SNOW)sh=7.1+n2*.6;else if(m==LAVA||m==RUBBLE||m==EMBER)sh=8.;else return 0.;
  bool loose=m==SNOW||m==RUBBLE||m==LAVA||m==EMBER,castm=m==IRON||m==SLAG||m==ICE;
  if(loose||castm){float c=float(support(q));sh=max(.9,sh*(loose?smoothstep(1.5,4.5,c):smoothstep(.5,2.5,c)));}
  return sh;}
void main(){ivec2 p=ivec2(gl_FragCoord.xy);vec2 pc=vec2(p)+.5;
  vec4 kr=texelFetch(uKR,p,0),ks=texelFetch(uKS,p,0),kp=texelFetch(uKP,p,0),kw=texelFetch(uKW,p,0);
  float dR=sdk(kr,pc,64.),dS=sdk(ks,pc,16.),dP=sdk(kp,pc,16.),dW=sdk(kw,pc,16.);
  float n1=vn(pc*.11),n3=vn(pc*.031+7.);
  float zF=8.+min(11.,max(0.,-dR)*.62)+(n1-.5)*2.4;
  float zB=dR>0.?-8.-min(54.,pow(dR,.92)*.95)*(.8+.4*n1)-n3*2.5:-8.;
  float sh=ks.x>-1e3?shOf(ivec2(ks.xy)):0.;
  float wd=0.;if(kw.x>-1e3){ivec2 q=ivec2(kw.xy);wd=max(.9,8.*smoothstep(1.5,4.5,float(support(q))));}
  oA=vec4(dR,zF,zB,dW);oB=vec4(dS,sh,dP,wd);}`;
/* a soft blur over all four channels: distances measured from cell centres ripple at the cell
   spacing, and the ripple would show on every surface */
const FS_BLUR4=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uDir;out vec4 o;
void main(){vec4 s=texture(uTex,vT)*.227027;s+=(texture(uTex,vT+uDir*1.3846)+texture(uTex,vT-uDir*1.3846))*.316216;s+=(texture(uTex,vT+uDir*3.2308)+texture(uTex,vT-uDir*3.2308))*.070270;o=s;}`;
const FS_SCULPT=`/*@@SCULPT@@*/`;
/* meshes: the crucible, its trolley and the furnace. Lit like the cave: GI from the grid, the soft
   spill, the point lights; hot parts glow with the blackbody colour of their temperature. */
const VS_MESH=`in vec3 aP;in vec3 aN;in vec4 aC;in float aE;uniform mat4 uVP;uniform mat4 uM;out vec3 vW;out vec3 vN;out vec4 vC;out float vE;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM)*aN;vC=aC;vE=aE;gl_Position=uVP*w;}`;
const FS_MESH=`${GLSL_MATS}
in vec3 vW;in vec3 vN;in vec4 vC;in float vE;
uniform sampler2D uLight;uniform sampler2D uLB;uniform vec2 uLSz;uniform float uLQ;uniform vec3 uEye;
uniform vec4 uPL[8];uniform vec4 uPC[8];uniform int uNL;uniform float uAmb;uniform vec3 uTint;
uniform float uHot;uniform float uFrost;uniform int uMode;uniform mat4 uLoc;uniform float uTime;uniform float uFill;
out vec4 o;
void main(){
  vec3 P=vec3(vW.x,-vW.y,vW.z),Nw=normalize(vN),Nn=vec3(Nw.x,-Nw.y,Nw.z),V=normalize(vec3(uEye.x,-uEye.y,uEye.z)-P);
  if(!gl_FrontFacing)Nn=-Nn;
  if(uMode==1){
    /* the molten surface: a level disc, cut to the inside of the tilted ladle */
    vec3 l=(uLoc*vec4(vW,1.)).xyz;float k=clamp((-2.6-l.y)/8.6,0.,1.),rin=mix(8.,4.6,k)-.15;float r=length(l.xz);
    if(l.y>-2.4||l.y<-11.4||r>rin)discard;
    float sw=vn(l.xz*.55+vec2(uTime*.9,-uTime*.6))*.6+vn(l.xz*1.3-uTime*1.4)*.4;
    vec3 e=bb(1490.+120.*sw-r*9.)*(1.15+.25*sin(uTime*7.+r));
    e=mix(e,vec3(.5,.7,.85)*.3,uFrost*.8*step(.5,vn(l.xz*1.7)));
    o=vec4(e,0.);return;
  }
  vec3 L=texture(uLight,(P.xy+Nn.xy*.8)/uLSz).rgb*(uLQ<.5?2.6:1.)*.8+texture(uLB,P.xy/vec2(320.,180.)).rgb*.7;
  L+=uAmb*uTint*1.6;
  vec3 dif=vec3(0),spc=vec3(0);
  for(int i=0;i<8;i++){if(i>=uNL)break;vec3 d=uPL[i].xyz-P;float dd=dot(d,d);vec3 l=d*inversesqrt(dd);float att=1./(1.+dd/(uPL[i].w*uPL[i].w));
    dif+=uPC[i].rgb*max(dot(Nn,l),0.)*att;spc+=uPC[i].rgb*pow(max(dot(Nn,normalize(l+V)),0.),40.)*att;}
  vec3 alb=vC.rgb;float met=vC.a;
  vec3 c=alb*(L+dif)+spc*mix(.04,.9,met)*mix(vec3(1),alb*2.,met);
  float fres=pow(1.-max(dot(Nn,V),0.),4.);c+=fres*(L*.6+uAmb*uTint)*met*.6;
  if(vE>0.){float T=vE*uHot;c+=bb(T);}
  c=mix(c,vec3(.55,.8,1.)*(L*.9+.04)+spc*.5,uFrost*.55);
  o=vec4(c,0.);
}`;
/* particles: each one a soft streak from where it was to where it is, in 3D at its own depth.
   Hot matter glows (added light); water, ice, snow and rubble are lit by the cave. */
const VS_PART=`${GLSL_MATS}
layout(location=0) in vec2 aQ;layout(location=1) in vec4 aA;layout(location=2) in vec4 aB;
uniform mat4 uVP;uniform vec3 uEye;uniform sampler2D uLight;uniform vec2 uLSz;uniform float uLQ;uniform float uAmb;uniform vec3 uTint;uniform float uPxW;
out vec2 vQ;out vec4 vCol;
void main(){
  int m=int(aB.y+.5);float T=aB.x,z=aB.z,sz=aB.w;
  vec3 p0=vec3(aA.x,-aA.y,z),p1=vec3(aA.z,-aA.w,z);
  vec3 ax=p1-p0;float len=length(ax);vec3 mid=(p0+p1)*.5;vec3 vd=normalize(uEye-mid);
  vec3 dir=len>.05?ax/len:normalize(cross(vd,vec3(0,0,1))+vec3(1e-3,0,0));
  vec3 side=normalize(cross(dir,vd));
  float w=sz;float dist=length(uEye-mid);w=max(w,dist*uPxW*1.3);   /* never thinner than a pixel and a bit */
  vec3 pos=mid+dir*(aQ.x*(len*.5+w))+side*(aQ.y*w);
  vQ=vec2(aQ.x*(len*.5+w)/(len*.5+w+1e-4),aQ.y);
  vec2 sp=vec2(aA.z,aA.w);vec3 L=texture(uLight,sp/uLSz).rgb*(uLQ<.5?2.6:1.)+uAmb*uTint*1.5;
  vec4 c;
  if(m==LAVA||m==EMBER||(m==IRON||m==SLAG)&&T>700.){vec3 e=bb(T)*(m==EMBER?1.6:1.25);c=vec4(e,0.);}
  else if(m==WATER)c=vec4(vec3(.25,.42,.55)*L+vec3(.04,.06,.08),.75);
  else if(m==ICE)c=vec4(vec3(.6,.82,.95)*L+vec3(.05,.07,.09),.9);
  else if(m==SNOW)c=vec4(vec3(.85,.9,1.)*L+vec3(.06),.9);
  else if(m==STEAM)c=vec4((vec3(.8,.83,.9)*(L*.9+uAmb*uTint*2.)+.012)*.3,.05);   /* steam scatters the light: it brightens more than it hides */
  else if(m==SMOKE)c=vec4(vec3(.12,.1,.1)*L*.3,.3);
  else if(m==99)c=vec4(vec3(.9,.75,.6)*L*.5,0.);                     /* lit dust mote */
  else if(m==97)c=vec4((vec3(.55,.8,1.)*(L*.9+.12)+.04)*(.3+1.2*pow(fract(sin(dot(aA.zw,vec2(12.9,78.2)))*43758.),3.)),0.);   /* a crystal shard glinting */
  else c=vec4(vec3(.16,.13,.12)*L+bb(T)*.5,1.);                       /* rubble, cooled iron */
  if(m==LAVA&&T<1100.)c.rgb*=.5;
  vCol=c;gl_Position=uVP*vec4(pos,1.);
}`;
const FS_PART=`in vec2 vQ;in vec4 vCol;out vec4 o;
void main(){float r=length(vQ);float a=smoothstep(1.,.25,r);a*=a;o=vec4(vCol.rgb*a,vCol.a*a);}`;
/* post */
const FS_SHIM=`in vec2 vT;uniform sampler2D uS;uniform float uTime;uniform vec2 uPx;uniform float uK;out vec4 o;
void main(){vec4 c0=texture(uS,vT);vec3 c=c0.rgb;
  if(c0.a>.01){vec2 q=vT*vec2(97.,61.);vec2 off=c0.a*uK*vec2(sin(uTime*7.3+q.y*2.1+sin(q.x*1.3+uTime*2.)),cos(uTime*5.9+q.x*1.7-sin(q.y*1.1-uTime*1.6)));c=texture(uS,vT+off*uPx).rgb;}
  o=vec4(c,1.);}`;
const FS_BRIGHT=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;out vec4 o;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;
c*=.25;float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.0)/max(l,1e-4);o=vec4(c,1.0);}`;
const FS_BLUR=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uDir;out vec4 o;
void main(){vec3 s=texture(uTex,vT).rgb*.227027;s+=(texture(uTex,vT+uDir*1.3846).rgb+texture(uTex,vT-uDir*1.3846).rgb)*.316216;
s+=(texture(uTex,vT+uDir*3.2308).rgb+texture(uTex,vT-uDir*3.2308).rgb)*.070270;o=vec4(s,1.0);}`;
/* composite: bloom, flash, ACES, vignette and grain; the optional DOTS filter samples the frame at
   the centre of each LED and draws it as a round dot; then the HUD is laid over as LED dots */
const FS_COMP=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uB1;uniform sampler2D uB2;uniform sampler2D uHud;
uniform float uBloom;uniform vec4 uRect;uniform vec2 uRes;uniform float uDots;uniform float uFlash;uniform vec3 uFlashC;uniform float uTime;uniform float uExp;uniform int uClip;uniform float uCold;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 fc=gl_FragCoord.xy,uv=vT;
  bool inR=fc.x>=uRect.x&&fc.y>=uRect.y&&fc.x<uRect.x+uRect.z&&fc.y<uRect.y+uRect.w;
  if(uClip==1&&!inR){o=vec4(.031,.02,.024,1.);return;}
  float dm=1.;
  if(uDots>0.){float pitch=uRect.z/uDots;vec2 gg=(fc-uRect.xy)/pitch,id=floor(gg),f=fract(gg)-.5;uv=(uRect.xy+(id+.5)*pitch)/uRes;
    float fw=1./pitch,d=length(f),r=.44;dm=(1.-smoothstep(r-fw*.6-.03,r+fw*.6,d))*(.72+.5*(1.-smoothstep(0.,r,d)));dm=mix(dm,.6,smoothstep(.38,.95,fw))*1.25;}
  vec3 c=texture(uScene,uv).rgb+(texture(uB1,uv).rgb*.5+texture(uB2,uv).rgb*.8)*uBloom;
  c=c*uExp+uFlashC*uFlash;
  c=mix(c,vec3(dot(c,vec3(.3,.5,.2)))*vec3(.7,.9,1.25),uCold);
  c=aces(c)*dm;
  /* the grade: cool shadows, warm highlights, a gentle S-curve */
  float lu=dot(c,vec3(.3,.55,.15));c=mix(c*vec3(.9,.97,1.1),c*vec3(1.07,1.,.9),smoothstep(.04,.55,lu));c=mix(c,c*c*(3.-2.*c),.35);
  c=pow(c,vec3(1./2.2));
  vec2 q=vT-.5;c*=1.-dot(q,q)*.55;
  c+=(h21(fc+fract(uTime*7.)*91.)-.5)*.018;
  /* the HUD: one LED per matrix cell over the play rectangle */
  if(inR){vec2 hg=(fc-uRect.xy)/uRect.zw*vec2(320.,180.);vec2 id=floor(hg),f=fract(hg)-.5;
    vec4 h=texelFetch(uHud,ivec2(id),0);
    if(h.a>0.){float pitch=uRect.z/320.,fw=1./pitch,d=length(f),r=.45;
      float dot_=1.-smoothstep(r-fw*.7-.03,r+fw*.7,d),hot=1.-smoothstep(0.,r,d);
      float lum=max(h.r,max(h.g,h.b));
      c*=1.-h.a*(lum<.08?.82:.55);                                          /* a dark backing keeps the dots legible over the cave */
      c=mix(c,h.rgb*(.82+.45*hot)*1.08,h.a*dot_*smoothstep(.0,.06,lum));}}
  o=vec4(c,1.);
}`;

let P_B4,P_MAT,P_JS,P_JT,P_RC,P_LI,P_DN,P_BS,P_CE,P_GA,P_CS,P_MA,P_KS,P_KT,P_FI,P_SC,P_ME,P_PA,P_SH,P_BR,P_BL,P_CO,VAO,GLERR=null;
const FB={},TX={};let VW=1,VH=1,DPR=1,RW=1,RH=1,RECT={x:0,y:0,w:100,h:56};
/* quality: 2 HIGH (full resolution, a light probe per cell), 1 MED (70% resolution, a probe per 2x2),
   0 LOW (50% resolution, blurred glow without shadows, lighter steam) */
const QL=['LOW','MED','HIGH'],RSCALE=[.42,.5,1],DOTSN=[0,640,320],DOTSL=['OFF','FINE','CLASSIC'];
let LQ=parseInt(store.get('hd-molten3d-q',touchy?'1':'2'),10);if(!(LQ>=0&&LQ<=2))LQ=touchy?1:2;if(!HDR)LQ=0;
let DOTS=parseInt(store.get('hd-molten3d-dots','0'),10);if(!(DOTS>=0&&DOTS<=2))DOTS=0;
function texParams(nearest){const f=nearest?gl.NEAREST:gl.LINEAR;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
function mkTex(w,h,fl,nearest){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,fl&&HDR?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,fl&&HDR?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);texParams(nearest);return t;}
function mkTarget(w,h,nearest,t2,fl,depth){const t=mkTex(w,h,fl!==false,nearest);const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  let tb=null,db=null;if(t2){tb=mkTex(w,h,true,nearest);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,tb,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);}
  if(depth){db=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,db);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,db);}
  return {t,t2:tb,f,w,h,db};}
function freeTarget(T){if(!T)return;gl.deleteTexture(T.t);if(T.t2)gl.deleteTexture(T.t2);if(T.db)gl.deleteRenderbuffer(T.db);gl.deleteFramebuffer(T.f);}
/* ---- the blackbody palette: Planck's law integrated against the CIE 1931 colour-matching functions
        (multi-lobe Gaussian fits of Wyman, Sloan & Shirley 2013), XYZ -> linear sRGB. Brightness is the
        photopic luminance compressed by a square root, so 700 C reads as a dull ember, 1100 C as deep orange
        and 1500 C as white heat. */
function blackbodyLUT(){
  const n=256,out=new Float32Array(n*4);
  const xb=l=>{const t1=(l-442.0)*(l<442?.0624:.0374),t2=(l-599.8)*(l<599.8?.0264:.0323),t3=(l-501.1)*(l<501.1?.0490:.0382);return .362*Math.exp(-.5*t1*t1)+1.056*Math.exp(-.5*t2*t2)-.065*Math.exp(-.5*t3*t3);};
  const yb=l=>{const t1=(l-568.8)*(l<568.8?.0213:.0247),t2=(l-530.9)*(l<530.9?.0613:.0322);return .821*Math.exp(-.5*t1*t1)+.286*Math.exp(-.5*t2*t2);};
  const zb=l=>{const t1=(l-437.0)*(l<437?.0845:.0278),t2=(l-459.0)*(l<459?.0385:.0725);return 1.217*Math.exp(-.5*t1*t1)+.681*Math.exp(-.5*t2*t2);};
  const planck=(lnm,K)=>{const l=lnm*1e-9;return 1/(l*l*l*l*l*(Math.exp(1.4388e-2/(l*K))-1));};
  const XYZ=K=>{let X=0,Y=0,Z=0;for(let l=380;l<=780;l+=5){const p=planck(l,K);X+=p*xb(l);Y+=p*yb(l);Z+=p*zb(l);}return [X,Y,Z];};
  const Yref=XYZ(1500+273.15)[1];
  for(let i=0;i<n;i++){
    const C=-40+i*2080/(n-1),K=C+273.15;let r=0,gg=0,b=0;
    if(C>380){const [X,Y,Z]=XYZ(K);
      let R=3.2406*X-1.5372*Y-.4986*Z,G=-.9689*X+1.8758*Y+.0415*Z,B=.0557*X-.2040*Y+1.0570*Z;
      const mn=Math.min(R,G,B);if(mn<0){R-=mn;G-=mn;B-=mn;}const mx=Math.max(R,G,B)||1;R/=mx;G/=mx;B/=mx;
      const I=3.6*Math.pow(Y/Yref,.5)*clamp((C-380)/260,0,1);r=R*I;gg=G*I;b=B*I;}
    out.set([r,gg,b,1],i*4);
  }
  return out;
}
let CASC=[],LIGHT=null,SBUF=null,SPR=null,VOX=null;
function buildLightTargets(){
  for(const c of CASC)freeTarget(c.fb);CASC=[];freeTarget(LIGHT);LIGHT=null;
  if(LQ===0)return;
  const s0=LQ===2?1:2,L0=1.5*s0;
  for(let i=0;i<5;i++){const sp=s0<<i,pw=Math.ceil(W/sp),ph=Math.ceil(H/sp),bw=2<<i;
    CASC.push({sp,pw,ph,bw,t0:i===0?(s0===1?.75:.05):L0*(Math.pow(4,i)-1)/3,t1:L0*(Math.pow(4,i+1)-1)/3,fb:mkTarget(pw*bw,ph*bw,false)});}
  LIGHT=mkTarget(CASC[0].pw,CASC[0].ph,false,true);
}
if(gl){
  try{
    P_MAT=prog(VS,FS_MAT);P_JS=prog(VS,FS_JSEED);P_JT=prog(VS,FS_JSTEP);P_RC=prog(VS,FS_RC);P_LI=prog(VS,FS_LIGHT);P_DN=prog(VS,FS_DOWN);
    P_BS=prog(VS,FS_BSEED);P_CE=prog(VS,FS_CELL);P_GA=prog(VS,FS_GAS);P_CS=prog(VS,FS_COARSE);P_MA=prog(VS,FS_MARCH);P_KS=prog(VS,FS_KSEED);P_KT=prog(VS,FS_KSTEP);P_FI=prog(VS,FS_FIELD);P_SC=prog(VS,FS_SCULPT);P_B4=prog(VS,FS_BLUR4);P_ME=prog(VS_MESH,FS_MESH);P_PA=prog(VS_PART,FS_PART);
    P_SH=prog(VS,FS_SHIM);P_BR=prog(VS,FS_BRIGHT);P_BL=prog(VS,FS_BLUR);P_CO=prog(VS,FS_COMP);
  }catch(e){GLERR=String(e);console.error(e);}
  VAO=gl.createVertexArray();
  TX.hud=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX.hud);texParams(true);
  for(const k of ['state','spr','vox']){TX[k]=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX[k]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);texParams(k!=='vox');}   /* vox filters (V3 tints the Rime with it); texelFetch ignores that */
  TX.bb=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,TX.bb);gl.texImage2D(gl.TEXTURE_2D,0,HDR?gl.RGBA16F:gl.RGBA32F,256,1,0,gl.RGBA,gl.FLOAT,blackbodyLUT());texParams(!HDR);
  FB.emit=mkTarget(W,H,true);FB.j0=mkTarget(W,H,true);FB.j1=mkTarget(W,H,true);
  FB.lb0=mkTarget(W>>2,H>>2,false);FB.lb1=mkTarget(W>>2,H>>2,false);
  for(const k of ['kr','ks','kp','kw','kt'])FB[k]=mkTarget(W,H,true);FB.fld=mkTarget(W,H,false,true);FB.fa1=mkTarget(W,H,false);FB.fa2=mkTarget(W,H,false);FB.fb1=mkTarget(W,H,false);FB.fb2=mkTarget(W,H,false);
  /* a tiling 32^3 value-noise volume for the rock's detail */
  {const n=32,d=new Uint8Array(n*n*n);let s=1234567;for(let i=0;i<d.length;i++){s=(s*1103515245+12345)>>>0;d[i]=s>>>24;}
    TX.n3=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,TX.n3);gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,n,n,n,0,gl.RED,gl.UNSIGNED_BYTE,d);
    for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.REPEAT],[gl.TEXTURE_WRAP_T,gl.REPEAT],[gl.TEXTURE_WRAP_R,gl.REPEAT]])gl.texParameteri(gl.TEXTURE_3D,k,v);}
  FB.cell=mkTarget(W,H,true,false,false);FB.gas=mkTarget(W,H,false,false,false);FB.co=mkTarget(W/4,Math.ceil(H/4),true,false,false);
  buildLightTargets();
}
SBUF=new Uint8ClampedArray(N*4);SPR=new Uint8ClampedArray(N*4);VOX=new Uint8ClampedArray(N*4);
function setLight(q){if(!HDR)q=0;LQ=q;store.set('hd-molten3d-q',q);if(gl){buildLightTargets();resize();}$('resv').textContent=QL[LQ];}
function setDots(d){DOTS=d;store.set('hd-molten3d-dots',d);}
function bindT(unit,t,loc){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc,unit);}
function draw(p,dst,setup){gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:VW,dst?dst.h:VH);gl.useProgram(p.p);if(setup)setup(p.u);gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);}
function pass(p,src,dst,setup){draw(p,dst,u=>{bindT(0,src.t,u.uTex);if(setup)setup(u);});}
/* per-stage colours staged by the game */
const SU={uMagma:.8,uTime:0,uAmb:.095,uTint:[.5,.45,.6],uBackA:[.05,.045,.06],uBackB:[.11,.09,.1],uCryst:[.2,.6,1],uIce:[.55,.8,.95],uFlashC:[1,.9,.8]};
let LIGHTT=null,LDIRT=null,LSZ=[W,H];
/* the 2D passes: light, then the cells' 3D shape */
function renderGrid(){
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  for(const [k,b] of [['state',SBUF],['spr',SPR],['vox',VOX]]){gl.bindTexture(gl.TEXTURE_2D,TX[k]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,b);}
  draw(P_MAT,FB.emit,u=>{bindT(0,TX.state,u.uState);bindT(1,TX.spr,u.uSpr);bindT(2,TX.bb,u.uBB);gl.uniform1f(u.uTime,SU.uTime);gl.uniform3fv(u.uCryst,SU.uCryst);});
  /* the soft spill: a wide blur of everything that glows */
  draw(P_DN,FB.lb0,u=>{bindT(0,FB.emit.t,u.uTex);gl.uniform2f(u.uPx,1/FB.lb0.w,1/FB.lb0.h);});
  for(let k=0;k<2;k++){pass(P_BL,FB.lb0,FB.lb1,u=>gl.uniform2f(u.uDir,(1.6+k)/FB.lb0.w,0));pass(P_BL,FB.lb1,FB.lb0,u=>gl.uniform2f(u.uDir,0,(1.6+k)/FB.lb0.h));}
  const jfa=()=>{let a=FB.j0,b=FB.j1;for(const k of [256,128,64,32,16,8,4,2,1,1]){draw(P_JT,b,u=>{bindT(0,a.t,u.uTex);gl.uniform1f(u.uK,k);gl.uniform2f(u.uSize,W,H);});[a,b]=[b,a];}return a;};
  if(LQ>0){
    draw(P_JS,FB.j0,u=>bindT(0,FB.emit.t,u.uTex));const a=jfa();
    for(let i=CASC.length-1;i>=0;i--){const c=CASC[i],up=CASC[i+1];
      draw(P_RC,c.fb,u=>{bindT(0,a.t,u.uJFA);bindT(1,FB.emit.t,u.uEmit);bindT(2,up?up.fb.t:FB.emit.t,u.uUp);
        gl.uniform2i(u.uPr,c.pw,c.ph);gl.uniform1i(u.uBW,c.bw);gl.uniform1f(u.uSp,c.sp);gl.uniform1f(u.uT0,c.t0);gl.uniform1f(u.uT1,c.t1);
        gl.uniform1i(u.uHasUp,up?1:0);if(up){gl.uniform2i(u.uPrU,up.pw,up.ph);gl.uniform2f(u.uUpSize,up.fb.w,up.fb.h);}gl.uniform2f(u.uWorld,W,H);});}
    draw(P_LI,LIGHT,u=>{bindT(0,CASC[0].fb.t,u.uC0);gl.uniform2i(u.uPr,CASC[0].pw,CASC[0].ph);});
    LIGHTT=LIGHT.t;LDIRT=LIGHT.t2;LSZ=[CASC[0].pw*CASC[0].sp,CASC[0].ph*CASC[0].sp];
  }else{LIGHTT=FB.lb0.t;LDIRT=FB.lb0.t;LSZ=[W,H];}
  /* class floods: rock (long reach), then matter, Rime and water (short reach) */
  const kflood=(cls,dst,steps)=>{draw(P_KS,dst,u=>{bindT(0,TX.state,u.uState);bindT(1,TX.vox,u.uVox);gl.uniform1i(u.uCls,cls);});
    let a=dst,b=FB.kt;for(const k of steps){draw(P_KT,b,u=>{bindT(0,a.t,u.uTex);gl.uniform1f(u.uK,k);});[a,b]=[b,a];}
    if(a!==dst){FB.kt=dst;}return a;};
  const KR=kflood(0,FB.kr,[128,64,32,16,8,4,2,1,1]);FB.kr=KR;
  draw(P_GA,FB.gas,u=>{bindT(0,TX.state,u.uState);bindT(1,TX.bb,u.uBB);});
  if(LQ===0){
    draw(P_CE,FB.cell,u=>{bindT(0,TX.state,u.uState);bindT(1,KR.t,u.uJB);bindT(2,TX.vox,u.uVox);bindT(3,FB.gas.t,u.uGas);});
    draw(P_CS,FB.co,u=>bindT(0,FB.cell.t,u.uCell));
  }else{
    const sh=[8,4,2,1,1];const KS=kflood(1,FB.ks,sh);FB.ks=KS;const KP=kflood(2,FB.kp,sh);FB.kp=KP;const KW=kflood(3,FB.kw,sh);FB.kw=KW;
    draw(P_FI,FB.fld,u=>{bindT(0,KR.t,u.uKR);bindT(1,KS.t,u.uKS);bindT(2,KP.t,u.uKP);bindT(3,KW.t,u.uKW);bindT(4,TX.state,u.uState);});
    draw(P_B4,FB.fa1,u=>{bindT(0,FB.fld.t,u.uTex);gl.uniform2f(u.uDir,.62/W,0);});draw(P_B4,FB.fa2,u=>{bindT(0,FB.fa1.t,u.uTex);gl.uniform2f(u.uDir,0,.62/H);});
    /* the matter softer still: the grid's staircases become slopes, a frozen drop stays a bead */
    draw(P_B4,FB.fb1,u=>{bindT(0,FB.fld.t2,u.uTex);gl.uniform2f(u.uDir,.42/W,0);});draw(P_B4,FB.fb2,u=>{bindT(0,FB.fb1.t,u.uTex);gl.uniform2f(u.uDir,0,.42/H);});
  }
  gl.activeTexture(gl.TEXTURE0);
}
/* ---------------------------------------------------------------------------------
   MATRICES (column-major) and the camera
   --------------------------------------------------------------------------------- */
const V3={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];}};
const M4={
  id(){const o=new Float32Array(16);o[0]=o[5]=o[10]=o[15]=1;return o;},
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
  persp(fy,asp,n,f){const t=1/Math.tan(fy/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;},
  look(e,c,up){const z=V3.norm(V3.sub(e,c)),x=V3.norm(V3.cross(up,z)),y=V3.cross(z,x),o=new Float32Array(16);
    o[0]=x[0];o[4]=x[1];o[8]=x[2];o[1]=y[0];o[5]=y[1];o[9]=y[2];o[2]=z[0];o[6]=z[1];o[10]=z[2];o[12]=-V3.dot(x,e);o[13]=-V3.dot(y,e);o[14]=-V3.dot(z,e);o[15]=1;return o;},
  tr(x,y,z){const o=M4.id();o[12]=x;o[13]=y;o[14]=z;return o;},
  rz(a){const o=M4.id(),c=Math.cos(a),s=Math.sin(a);o[0]=c;o[1]=s;o[4]=-s;o[5]=c;return o;},
  inv(m){const a=m,o=new Float32Array(16);
    const b00=a[0]*a[5]-a[1]*a[4],b01=a[0]*a[6]-a[2]*a[4],b02=a[0]*a[7]-a[3]*a[4],b03=a[1]*a[6]-a[2]*a[5],b04=a[1]*a[7]-a[3]*a[5],b05=a[2]*a[7]-a[3]*a[6];
    const b06=a[8]*a[13]-a[9]*a[12],b07=a[8]*a[14]-a[10]*a[12],b08=a[8]*a[15]-a[11]*a[12],b09=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14];
    let d=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!d)return M4.id();d=1/d;
    o[0]=(a[5]*b11-a[6]*b10+a[7]*b09)*d;o[1]=(a[2]*b10-a[1]*b11-a[3]*b09)*d;o[2]=(a[13]*b05-a[14]*b04+a[15]*b03)*d;o[3]=(a[10]*b04-a[9]*b05-a[11]*b03)*d;
    o[4]=(a[6]*b08-a[4]*b11-a[7]*b07)*d;o[5]=(a[0]*b11-a[2]*b08+a[3]*b07)*d;o[6]=(a[14]*b02-a[12]*b05-a[15]*b01)*d;o[7]=(a[8]*b05-a[10]*b02+a[11]*b01)*d;
    o[8]=(a[4]*b10-a[5]*b08+a[7]*b06)*d;o[9]=(a[1]*b08-a[0]*b10-a[3]*b06)*d;o[10]=(a[12]*b04-a[13]*b02+a[15]*b00)*d;o[11]=(a[9]*b02-a[8]*b04-a[11]*b00)*d;
    o[12]=(a[5]*b07-a[4]*b09-a[6]*b06)*d;o[13]=(a[0]*b09-a[1]*b07+a[2]*b06)*d;o[14]=(a[13]*b01-a[12]*b03-a[14]*b00)*d;o[15]=(a[8]*b03-a[9]*b01+a[10]*b00)*d;return o;},
  xf(m,p){const x=p[0],y=p[1],z=p[2];return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]];}
};
/* the camera aims at the middle of the cave and is pulled back until the whole field fits the play
   rectangle; the game then leans, sways, dives and shakes it (see camStep in the view) */
const CAM={fov:34*Math.PI/180,yaw:0,pitch:17*Math.PI/180,dist:330,tgt:[160,-92,0],eye:[160,-40,330],VP:M4.id(),IVP:M4.id(),fitD:330,near:4,far:1400,
  look:{yaw:0,pitch:11,dz:1,tx:0,ty:0,ex:0,ey:0}};
function camMatrices(yaw,pitch,dist,tgt,shift){
  const cp=Math.cos(pitch),e=[tgt[0]+Math.sin(yaw)*cp*dist+(shift?shift[0]:0),tgt[1]+Math.sin(pitch)*dist+(shift?shift[1]:0),tgt[2]+Math.cos(yaw)*cp*dist];
  const vw=VW/DPR,vh=VH/DPR,sx=((RECT.x+RECT.w/2)/vw)*2-1,sy=1-((RECT.y+RECT.h/2)/vh)*2;
  const P=M4.persp(CAM.fov,vw/vh,CAM.near,CAM.far);const S=M4.tr(sx,sy,0);
  const V=M4.look(e,tgt,[0,1,0]);return {e,VP:M4.mul(S,M4.mul(P,V))};
}
/* how far the field's corners land outside the play rectangle at a given distance (1 = exactly fits) */
function camFitErr(yaw,pitch,dist,tgt){
  const {VP}=camMatrices(yaw,pitch,dist,tgt),vw=VW/DPR,vh=VH/DPR,sx=((RECT.x+RECT.w/2)/vw)*2-1,sy=1-((RECT.y+RECT.h/2)/vh)*2,kx=RECT.w/vw,ky=RECT.h/vh;let e=0;
  for(const u of [0,W])for(const v of [0,H])for(const z of [0,8]){const c=M4.xf(VP,[u,-v,z]);const nx=(c[0]/c[3]-sx)/kx,ny=(c[1]/c[3]-sy)/ky;e=Math.max(e,Math.abs(nx),Math.abs(ny));}
  return e;
}
function camFit(yaw,pitch,tgt){let lo=60,hi=3000;for(let i=0;i<28;i++){const m=(lo+hi)/2;if(camFitErr(yaw,pitch,m,tgt)>1)lo=m;else hi=m;}return hi;}
function camSet(yaw,pitch,dist,tgt,shift){const r=camMatrices(yaw,pitch,dist,tgt,shift);CAM.eye=r.e;CAM.VP=r.VP;CAM.IVP=M4.inv(r.VP);}
/* sim point -> HUD matrix pixel (for the aim marker, the gauge, score pops and tunnel warnings) */
function projHUD(u,v,z){const c=M4.xf(CAM.VP,[u,-v,z||0]);if(c[3]<=0)return [-99,-99];const vw=VW/DPR,vh=VH/DPR;
  const sx=(c[0]/c[3]*.5+.5)*vw,sy=(.5-c[1]/c[3]*.5)*vh;return [(sx-RECT.x)/RECT.w*W,(sy-RECT.y)/RECT.h*H];}
/* screen point (CSS px) -> where it meets the play plane z=0, in cells */
function unprojPlane(cx,cy){const vw=VW/DPR,vh=VH/DPR,nx=cx/vw*2-1,ny=1-cy/vh*2;
  const a=M4.xf(CAM.IVP,[nx,ny,-1]),b=M4.xf(CAM.IVP,[nx,ny,1]);const p0=[a[0]/a[3],a[1]/a[3],a[2]/a[3]],p1=[b[0]/b[3],b[1]/b[3],b[2]/b[3]];
  const d=V3.sub(p1,p0);if(Math.abs(d[2])<1e-6)return [CR.x,0];const t=-p0[2]/d[2];return [p0[0]+d[0]*t,-(p0[1]+d[1]*t)];}
/* ---------------------------------------------------------------------------------
   MESHES — a tiny builder: lathes (anything round), boxes, tubes
   --------------------------------------------------------------------------------- */
function Mesh(){this.v=[];}
Mesh.prototype.tri=function(a,b,c,col,met,e){const n=V3.norm(V3.cross(V3.sub(b,a),V3.sub(c,a)));for(const p of [a,b,c])this.v.push(p[0],p[1],p[2],n[0],n[1],n[2],col[0],col[1],col[2],met,e||0);};
Mesh.prototype.vert=function(p,n,col,met,e){this.v.push(p[0],p[1],p[2],n[0],n[1],n[2],col[0],col[1],col[2],met,e||0);};
/* revolve a profile [[r,y],...] about the local y axis; smooth normals around, faceted along */
Mesh.prototype.lathe=function(prof,seg,col,met,e,o,flip){o=o||[0,0,0];
  for(let i=0;i<prof.length-1;i++){const [r0,y0]=prof[i],[r1,y1]=prof[i+1];const dy=y1-y0,dr=r1-r0,nl=Math.hypot(dy,dr)||1;let ny=-dr/nl,nr=dy/nl;if(flip){ny=-ny;nr=-nr;}
    for(let s=0;s<seg;s++){const a0=s/seg*TAU,a1=(s+1)/seg*TAU,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
      const P=(r,y,c,s)=>[o[0]+r*c,o[1]+y,o[2]+r*s],Nn=(c,s)=>[nr*c,ny,nr*s];
      const q=[[P(r0,y0,c0,s0),Nn(c0,s0)],[P(r1,y1,c0,s0),Nn(c0,s0)],[P(r1,y1,c1,s1),Nn(c1,s1)],[P(r0,y0,c1,s1),Nn(c1,s1)]];
      const ec=Array.isArray(e)?e[i]:e;
      const ord=flip?[0,2,1,0,3,2]:[0,1,2,0,2,3];for(const k of ord)this.vert(q[k][0],q[k][1],col,met,ec);}}
  return this;};
Mesh.prototype.box=function(x0,y0,z0,x1,y1,z1,col,met,e){
  const p=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]){const a=p[f[0]],b=p[f[1]],c=p[f[2]],d=p[f[3]];this.tri(a,b,c,col,met,e);this.tri(a,c,d,col,met,e);}
  return this;};
/* a cylinder between two points */
Mesh.prototype.tube=function(a,b,r,seg,col,met,e){const ax=V3.norm(V3.sub(b,a)),t=Math.abs(ax[1])<.9?[0,1,0]:[1,0,0],u=V3.norm(V3.cross(ax,t)),w=V3.cross(ax,u);
  for(let s=0;s<seg;s++){const a0=s/seg*TAU,a1=(s+1)/seg*TAU;const d0=V3.add(V3.mul(u,Math.cos(a0)),V3.mul(w,Math.sin(a0))),d1=V3.add(V3.mul(u,Math.cos(a1)),V3.mul(w,Math.sin(a1)));
    const p00=V3.add(a,V3.mul(d0,r)),p01=V3.add(b,V3.mul(d0,r)),p11=V3.add(b,V3.mul(d1,r)),p10=V3.add(a,V3.mul(d1,r));
    for(const [p,n] of [[p00,d0],[p01,d0],[p11,d1],[p00,d0],[p11,d1],[p10,d1]])this.vert(p,n,col,met,e);
    this.tri(a,p10,p00,col,met,e);this.tri(b,p01,p11,col,met,e);}
  return this;};
function upMesh(m){const vao=gl.createVertexArray(),buf=gl.createBuffer(),data=new Float32Array(m.v);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  const loc=n=>gl.getAttribLocation(P_ME.p,n),st=11*4;
  for(const [n,sz,off] of [['aP',3,0],['aN',3,12],['aC',4,24],['aE',1,40]]){const l=loc(n);if(l<0)continue;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,sz,gl.FLOAT,false,st,off);}
  gl.bindVertexArray(null);return {vao,n:data.length/11};}
const MESH={};
function buildMeshes(){
  const iron=[.2,.19,.2],dark=[.08,.075,.08],steel=[.42,.41,.43],brass=[.5,.36,.2],refr=[.22,.15,.12];
  /* the ladle, in its own frame: origin at the pivot, hanging down -y. Rim 2.4 below the pivot
     (radius 9), base 12.4 below (radius 5.8), refractory lining inside, steel bands outside */
  const L=new Mesh();
  L.lathe([[5.6,-12.4],[6.,-12.],[7.4,-8.6],[7.75,-8.6],[7.75,-8.],[8.55,-5.5],[8.9,-5.5],[8.9,-4.9],[9.4,-3.],[9.8,-2.8],[9.8,-2.2],[8.1,-2.2]],32,iron,.75,[0,0,0,0,0,0,0,0,.55,.8,1.]);
  L.lathe([[8.05,-2.25],[7.95,-2.7],[4.7,-11.15],[0.,-11.15]],28,refr,.1,[.8,.8,1,1],0,true);
  L.lathe([[0,-12.4],[5.8,-12.4]],20,dark,.6,0,0,true);
  L.tube([0,-12.2,0],[0,-13.5,0],1.15,10,steel,.7,0);                    /* the nozzle */
  L.tube([-9.6,-3.3,0],[-11.,-3.3,0],1.,10,steel,.8,0);L.tube([9.6,-3.3,0],[11.,-3.3,0],1.,10,steel,.8,0);   /* trunnions */
  /* the bail: from the trunnions up to the pivot eye */
  for(const s of [-1,1]){L.tube([s*10.6,-3.3,0],[s*7.,1.2,0],.55,8,steel,.8,0);L.tube([s*7.,1.2,0],[s*1.,.6,0],.55,8,steel,.8,0);}
  MESH.ladle=upMesh(L);
  const N=new Mesh();N.tube([0,-13.3,0],[0,-13.9,0],1.2,10,[.2,.2,.2],.3,1);MESH.nozzle=upMesh(N);
  const R=new Mesh();R.tube([0,3.2,0],[0,-10.4,0],.42,8,steel,.8,0);R.box(-.9,3.,-.9,.9,4.,.9,dark,.5,0);MESH.rod=upMesh(R);
  /* the molten surface: a flat quad, cut to the ladle in the shader */
  const S=new Mesh();const q=12;S.vert([-q,0,-q],[0,1,0],[1,1,1],0,0);S.vert([-q,0,q],[0,1,0],[1,1,1],0,0);S.vert([q,0,q],[0,1,0],[1,1,1],0,0);S.vert([-q,0,-q],[0,1,0],[1,1,1],0,0);S.vert([q,0,q],[0,1,0],[1,1,1],0,0);S.vert([q,0,-q],[0,1,0],[1,1,1],0,0);
  MESH.surf=upMesh(S);
  /* the trolley, in its own frame: origin on the rail centre-line at the crucible's x; y is world up.
     Four wheels ride the top of the I-beam (rail cells 5..6 -> y -5..-7), side plates drop past
     the beam to a crossbar, and the pivot pin sits at y -8 */
  const T=new Mesh();
  for(const wx of [-6,6])for(const wz of [-2.3,2.3]){T.tube([wx,-3.55,wz-.55],[wx,-3.55,wz+.55],1.45,14,steel,.85,0);T.tube([wx,-3.55,wz-.75],[wx,-3.55,wz+.75],.45,8,dark,.5,0);}
  for(const wz of [-3.25,3.25])T.box(-7.6,-4.6,wz-.3,7.6,-2.6,wz+.3,iron,.7,0),T.box(-1.6,-7.8,wz-.3,1.6,-4.6,wz+.3,iron,.7,0);
  T.box(-6.8,-7.9,-3.55,6.8,-7.1,3.55,iron,.7,0);T.tube([0,-8,-3.6],[0,-8,3.6],.75,10,steel,.85,0);
  T.box(-2.,-2.6,-.5,2.,-1.6,.5,brass,.8,0);
  MESH.trolley=upMesh(T);
  /* the furnace: a riveted hood up in the gallery roof, set behind the rail, its tap glowing */
  const F=new Mesh();
  F.lathe([[3.,6.4],[2.1,6.4],[2.6,5.2],[4.4,3.2],[7.6,.4],[9.2,-1.6],[9.2,-3.],[3.,-3.]].map(([r,y])=>[r,-y]),24,iron,.65,[1,1,.15,0,0,0,0],[0,0,-6.5]);
  F.lathe([[2.1,6.4],[1.4,5.6],[0.,5.6]].map(([r,y])=>[r,-y]),16,[.3,.2,.15],.2,1,[0,0,-6.5],true);
  for(let i=0;i<10;i++){const a=i/10*TAU;F.box(Math.cos(a)*7.9-.35,-1.35,Math.sin(a)*7.9-6.5-.35,Math.cos(a)*7.9+.35,-.65,Math.sin(a)*7.9-6.5+.35,brass,.8,0);}
  F.tube([0,6,-6.5],[0,-3,-6.5],1.6,10,dark,.4,0);
  MESH.furnace=upMesh(F);
}
/* ---------------------------------------------------------------------------------
   PARTICLES — one instance per flying cell of the simulation, plus the purely visual embers
   --------------------------------------------------------------------------------- */
const FXMAX=1400,PINST=new Float32Array((4096+FXMAX+300)*8);let POURAGE=0;let PVAO=null,PBUF=null,PCOUNT=0;
const FX={n:0,x:new Float32Array(FXMAX),y:new Float32Array(FXMAX),z:new Float32Array(FXMAX),vx:new Float32Array(FXMAX),vy:new Float32Array(FXMAX),vz:new Float32Array(FXMAX),
  ox:new Float32Array(FXMAX),oy:new Float32Array(FXMAX),t:new Float32Array(FXMAX),l:new Float32Array(FXMAX),m:new Uint8Array(FXMAX)};
function fxSpawn(x,y,z,vx,vy,vz,T,life,m){if(FX.n>=FXMAX)return;const k=FX.n++;FX.x[k]=FX.ox[k]=x;FX.y[k]=FX.oy[k]=y;FX.z[k]=z;FX.vx[k]=vx;FX.vy[k]=vy;FX.vz[k]=vz;FX.t[k]=T;FX.l[k]=life;FX.m[k]=m;}
/* a Rime shattering: glinting crystal shards (the simulation's own water and ice fall with them) */
function fxShatter(x,y,w,h){const n=Math.min(30,6+(w*h*.2|0));for(let i=0;i<n;i++){const a=Math.random()*TAU,s=30+Math.random()*100;fxSpawn(x+(Math.random()-.5)*w,y+(Math.random()-.5)*h,(Math.random()-.5)*9,Math.cos(a)*s,Math.sin(a)*s-50,(Math.random()-.5)*36,2000,.5+Math.random()*.8,97);}}
function fxStep(dt){
  for(let k=0;k<FX.n;k++){FX.ox[k]=FX.x[k];FX.oy[k]=FX.y[k];
    if(FX.m[k]===99){FX.vx[k]+=Math.sin(FX.y[k]*.07+k)*dt*2;FX.vy[k]+=Math.cos(FX.x[k]*.05+k)*dt*2;FX.vx[k]*=.99;FX.vy[k]*=.99;}
    else if(FX.m[k]===97){FX.vy[k]+=280*dt;FX.vx[k]*=.99;FX.vz[k]*=.99;}
    else{FX.vy[k]-=48*dt;FX.vx[k]+=Math.sin(FX.y[k]*.15+k*1.7)*dt*22;FX.vz[k]+=Math.cos(FX.x[k]*.1+k)*dt*10;FX.vx[k]*=.985;FX.vy[k]*=.985;FX.vz[k]*=.99;FX.t[k]-=dt*330;}
    FX.x[k]+=FX.vx[k]*dt;FX.y[k]+=FX.vy[k]*dt;FX.z[k]+=FX.vz[k]*dt;FX.l[k]-=dt;
    if(FX.l[k]<=0||(FX.m[k]!==99&&FX.t[k]<520)||FX.y[k]<1){const e=--FX.n;if(k!==e){for(const a of ['x','y','z','vx','vy','vz','ox','oy','t','l','m'])FX[a][k]=FX[a][e];}k--;}}
}
function buildParticles(){
  PVAO=gl.createVertexArray();gl.bindVertexArray(PVAO);
  const q=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,q);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  PBUF=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,PBUF);gl.bufferData(gl.ARRAY_BUFFER,PINST.byteLength,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0);gl.vertexAttribDivisor(1,1);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16);gl.vertexAttribDivisor(2,1);
  gl.bindVertexArray(null);
}
function fillParticles(){
  let n=0;const P=PINST;
  const put=(x0,y0,x1,y1,T,m,z,sz)=>{const o=n*8;P[o]=x0;P[o+1]=y0;P[o+2]=x1;P[o+3]=y1;P[o+4]=T;P[o+5]=m;P[o+6]=z;P[o+7]=sz;n++;};
  for(let k=0;k<PN;k++){const m=PM[k],pour=PF[k]&1;
    const sz=m===STEAM?3.2:m===SMOKE?2.6:m===EMBER?.32:pour?.95:m===LAVA?.62:m===SNOW?.42:m===WATER?.3:m===ICE?.38:.5,tl=m===EMBER?1:pour?.55:m===LAVA?.4:.2;   /* drops leave a short trail, sparks a long one */
    put(PX[k]+(POX[k]-PX[k])*tl,PY[k]+(POY[k]-PY[k])*tl,PX[k],PY[k],PT[k],m,PZ[k],sz);}
  for(let k=0;k<FX.n;k++){const fm=FX.m[k],tl=fm===97?.3:1;put(FX.x[k]+(FX.ox[k]-FX.x[k])*tl,FX.y[k]+(FX.oy[k]-FX.y[k])*tl,FX.x[k],FX.y[k],fm===99?20:FX.t[k],fm===99||fm===97?fm:EMBER,FX.z[k],fm===99?.16:fm===97?.2:.26);}
  /* II: the pour as one rope of molten iron along the path the stream is taking right now, grown
     only as far as the first drops could have fallen since the pour began */
  if(POURAGE>0&&CR.fill>1){let x=CR.nx,y=CR.ny+.4,vx=CR.nvx,vy=21,px=x,py=y,tt=0;const h=1/120;
    for(let s=0;s<240;s++){vy+=GRAV*h;x+=vx*h;y+=vy*h;tt+=h;const cx=x|0,cy=y|0;if(cx<1||cx>W-2||cy>H-2||tt>POURAGE)break;
      const hit=cy>GAL&&pBlock(LAVA,M[cy*W+cx]);
      if(hit||Math.hypot(x-px,y-py)>=1.5){put(px,py,x,y,1570-s*.9,LAVA,0,(.34+.12*Math.sin(S.clock*23+s*.7))*Math.min(1,CR.flow*1.4));px=x;py=y;}
      if(hit)break;}}
  /* the furnace's tap stream while the crucible refills */
  if(CR.refill){const surf=PIV_Y+3.4+(1-CR.fill/CR.cap)*7.4;for(let s=0;s<6;s++){const y0=6+s*(surf-6)/6,y1=6+(s+1)*(surf-6)/6,wb=Math.sin(S.clock*17+s*1.3)*.15;put(FURN_X+wb,y0,FURN_X-wb,y1,1540,LAVA,-6.5,.95);}}
  PCOUNT=n;return n;
}
/* ---------------------------------------------------------------------------------
   POINT LIGHTS — the heart, the crucible, the furnace tap, the pooled lava, flashes and bombs
   --------------------------------------------------------------------------------- */
const PLP=new Float32Array(32),PLC=new Float32Array(32);let PLN=0;
function addPL(x,y,z,r,c,k){if(PLN>=8)return;const o=PLN*4;PLP[o]=x;PLP[o+1]=y;PLP[o+2]=z;PLP[o+3]=r;PLC[o]=c[0]*k;PLC[o+1]=c[1]*k;PLC[o+2]=c[2]*k;PLC[o+3]=0;PLN++;}
function gatherLights(){
  PLN=0;
  if(HEART.cells.length){const H_=HEART,Tc=(880+H_.heat*6.6+H_.beat*110+H_.pulse*160)*H_.ign+AMB_T*(1-H_.ign);addPL(HX+.5,COREY()+.5,2,80,bbAt(Math.max(400,Tc)),(.9+H_.beat*.3)*H_.ign*(1-H_.frost*.6)*(.35+.65*H_.heat/100));}
  if(LAVAC.n>20)addPL(LAVAC.x,LAVAC.y-5,0,40+Math.sqrt(LAVAC.n)*1.6,bbAt(1320),Math.min(1.6,LAVAC.n/350+.2));
  const k=CR.fill/CR.cap;addPL(CR.x,PIV_Y+5,0,34,bbAt(1520),.45*k+(CR.pouring?.25:0));
  if(CR.refill)addPL(FURN_X,8,-6,26,bbAt(1500),1.1);
  /* flashes; a slag bomb's (the longest) lights the whole cavern from where it burst */
  for(const l of LIGHTS){const kk=1-l.t/l.dur,big=l.dur>=.34;if(big)addPL(l.x,l.y-2,4,85,bbAt(1250),kk*kk*kk*7);else addPL(l.x,l.y,0,34,[l.c[0]/255*4,l.c[1]/255*4,l.c[2]/255*4],kk);}
  for(const b of BOMBS)addPL(b.x,b.y,0,18,bbAt(1600),.6);
}
/* ---------------------------------------------------------------------------------
   PRESENT — the whole frame
   --------------------------------------------------------------------------------- */
let FLASH=0,COLD=0;
const LADLE={M:M4.id(),inv:M4.id()};
function setLightU(u){
  if(u.uLight!==undefined)bindT(5,LIGHTT,u.uLight);if(u.uLB!==undefined)bindT(6,FB.lb0.t,u.uLB);if(u.uBB!==undefined)bindT(7,TX.bb,u.uBB);
  if(u.uLSz)gl.uniform2f(u.uLSz,LSZ[0],LSZ[1]);if(u.uLQ)gl.uniform1f(u.uLQ,LQ);if(u.uAmb)gl.uniform1f(u.uAmb,SU.uAmb);if(u.uTint)gl.uniform3fv(u.uTint,SU.uTint);
  if(u.uPL){gl.uniform4fv(u.uPL,PLP);gl.uniform4fv(u.uPC,PLC);gl.uniform1i(u.uNL,PLN);}
  if(u.uEye)gl.uniform3f(u.uEye,CAM.eye[0],CAM.eye[1],CAM.eye[2]);if(u.uTime)gl.uniform1f(u.uTime,SU.uTime);
}
function drawMesh(m,M,hot,mode){const u=P_ME.u;gl.uniformMatrix4fv(u.uM,false,M);gl.uniform1f(u.uHot,hot||0);gl.uniform1i(u.uMode,mode||0);gl.bindVertexArray(m.vao);gl.drawArrays(gl.TRIANGLES,0,m.n);}
function present(){
  if(!gl||!P_MA)return;
  renderGrid();gatherLights();
  const portrait=document.body.classList.contains('portrait');
  /* the 3D scene */
  const sc=FB.sc;gl.bindFramebuffer(gl.FRAMEBUFFER,sc.f);gl.viewport(0,0,sc.w,sc.h);
  if(portrait){gl.enable(gl.SCISSOR_TEST);const k=sc.w/VW;gl.scissor(Math.floor(RECT.x*DPR*k),Math.floor((VH-(RECT.y+RECT.h)*DPR)*k),Math.ceil(RECT.w*DPR*k)+1,Math.ceil(RECT.h*DPR*k)+1);}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.ALWAYS);gl.depthMask(true);
  const PM_=LQ>0?P_SC:P_MA;gl.useProgram(PM_.p);{const u=PM_.u;
    if(LQ>0){bindT(0,FB.fa2.t,u.uFA);bindT(8,FB.fb2.t,u.uFB);gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_3D,TX.n3);gl.uniform1i(u.uN3,9);gl.uniform1i(u.uQ,LQ);gl.uniform1f(u.uMagma,SU.uMagma);}
    else{bindT(0,FB.cell.t,u.uCell);bindT(8,FB.co.t,u.uCoarse);}
    bindT(1,TX.state,u.uState);bindT(2,TX.vox,u.uVox);bindT(3,TX.spr,u.uSpr);bindT(4,FB.gas.t,u.uGas);setLightU(u);
    gl.uniformMatrix4fv(u.uInvVP,false,CAM.IVP);gl.uniformMatrix4fv(u.uVP,false,CAM.VP);
    const H_=HEART,Tc=(880+H_.heat*6.6+H_.beat*110+H_.pulse*160)*H_.ign+AMB_T*(1-H_.ign);
    gl.uniform4f(u.uHeart,HX+.5,COREY()+.5,CORER+.25,Tc);gl.uniform4f(u.uHeartFx,H_.frost,H_.ign,H_.beat,H_.cells.length?1:0);
    for(const k of ['uBackA','uBackB','uCryst','uIce'])if(u[k])gl.uniform3fv(u[k],SU[k]);if(u.uSteamQ)gl.uniform1f(u.uSteamQ,LQ);
    gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);}
  gl.depthFunc(gl.LEQUAL);
  /* meshes */
  gl.useProgram(P_ME.p);{const u=P_ME.u;setLightU(u);gl.uniformMatrix4fv(u.uVP,false,CAM.VP);gl.uniform1f(u.uFrost,CR.frozen>0?Math.min(1,CR.frozen*1.5):0);gl.uniform1f(u.uFill,CR.fill/CR.cap);
    const x=CR.x,Tm=M4.tr(x,-RAILY-0.,0);drawMesh(MESH.trolley,Tm,0);
    const Lm=M4.mul(M4.tr(x,-PIV_Y,0),M4.rz(CR.sw));LADLE.M=Lm;LADLE.inv=M4.inv(Lm);
    const k=CR.fill/CR.cap;drawMesh(MESH.ladle,Lm,560+k*260);
    drawMesh(MESH.rod,M4.mul(Lm,M4.tr(0,CR.rod*1.6,0)),0);
    drawMesh(MESH.nozzle,Lm,CR.rod>.3&&CR.fill>1?1560:420);
    drawMesh(MESH.furnace,M4.tr(FURN_X,0,0),(CR.refill?1500:1180)+60*Math.sin(S.clock*3));
    if(CR.fill>1){const surf=PIV_Y+3.4+(1-k)*7.4;gl.uniformMatrix4fv(u.uLoc,false,LADLE.inv);drawMesh(MESH.surf,M4.tr(CR.x,-surf,0),0,1);}
  }
  /* particles: premultiplied, over everything solid, never hiding each other */
  const n=fillParticles();
  if(n){gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE);   /* alpha holds the shimmer: leave it */
    gl.useProgram(P_PA.p);const u=P_PA.u;setLightU(u);gl.uniformMatrix4fv(u.uVP,false,CAM.VP);gl.uniform1f(u.uPxW,2*Math.tan(CAM.fov/2)/sc.h);
    gl.bindBuffer(gl.ARRAY_BUFFER,PBUF);gl.bufferSubData(gl.ARRAY_BUFFER,0,PINST,0,n*8);
    gl.bindVertexArray(PVAO);gl.drawArraysInstanced(gl.TRIANGLES,0,6,n);gl.disable(gl.BLEND);gl.depthMask(true);}
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.SCISSOR_TEST);gl.bindVertexArray(null);
  /* post */
  pass(P_SH,FB.sc,FB.s2,u=>{gl.uniform1f(u.uTime,SU.uTime);gl.uniform2f(u.uPx,1/FB.sc.w,1/FB.sc.h);gl.uniform1f(u.uK,(reduce?0:1.5)*FB.sc.h/600);gl.uniform1i(u.uS,0);bindT(0,FB.sc.t,u.uS);});
  pass(P_BR,FB.s2,FB.a,u=>{gl.uniform2f(u.uPx,1/FB.s2.w,1/FB.s2.h);gl.uniform1f(u.uThr,HDR?1.05:.8);});
  pass(P_BL,FB.a,FB.b,u=>gl.uniform2f(u.uDir,1/FB.a.w,0));pass(P_BL,FB.b,FB.a,u=>gl.uniform2f(u.uDir,0,1/FB.a.h));
  pass(P_BR,FB.a,FB.c,u=>{gl.uniform2f(u.uPx,1/FB.a.w,1/FB.a.h);gl.uniform1f(u.uThr,0);});
  pass(P_BL,FB.c,FB.d,u=>gl.uniform2f(u.uDir,2.2/FB.c.w,0));pass(P_BL,FB.d,FB.c,u=>gl.uniform2f(u.uDir,0,2.2/FB.c.h));
  gl.bindTexture(gl.TEXTURE_2D,TX.hud);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mc);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  draw(P_CO,null,u=>{bindT(0,FB.s2.t,u.uScene);bindT(1,FB.a.t,u.uB1);bindT(2,FB.c.t,u.uB2);bindT(3,TX.hud,u.uHud);gl.uniform1f(u.uBloom,HDR?1:.6);
    gl.uniform4f(u.uRect,RECT.x*DPR,VH-(RECT.y+RECT.h)*DPR,RECT.w*DPR,RECT.h*DPR);gl.uniform2f(u.uRes,VW,VH);gl.uniform1f(u.uDots,DOTSN[DOTS]);
    gl.uniform1f(u.uFlash,FLASH);gl.uniform3fv(u.uFlashC,SU.uFlashC);gl.uniform1f(u.uTime,SU.uTime);gl.uniform1f(u.uExp,1.);gl.uniform1i(u.uClip,portrait?1:0);gl.uniform1f(u.uCold,COLD);});
  gl.activeTexture(gl.TEXTURE0);
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));cv.width=VW;cv.height=VH;
  layout();
  if(gl){for(const k of ['sc','s2','a','b','c','d'])if(FB[k])freeTarget(FB[k]);
    const k=RSCALE[LQ];RW=Math.max(2,Math.round(VW*k));RH=Math.max(2,Math.round(VH*k));
    FB.sc=mkTarget(RW,RH,false,false,true,true);FB.s2=mkTarget(RW,RH,false);
    FB.a=mkTarget(Math.max(1,RW>>2),Math.max(1,RH>>2),false);FB.b=mkTarget(Math.max(1,RW>>2),Math.max(1,RH>>2),false);
    FB.c=mkTarget(Math.max(1,RW>>3),Math.max(1,RH>>3),false);FB.d=mkTarget(Math.max(1,RW>>3),Math.max(1,RH>>3),false);}
  CAM.fitD=camFit(0,CAM.pitch,[160,-92,0]);
}
function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style,asp=16/9;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);document.body.classList.toggle('embed',EMBED);
  $('pad').hidden=!touchy;$('keys').hidden=touchy||EMBED;$('turn').hidden=!portrait||EMBED;
  const gutL=EMBED?Math.max(0,sl):Math.max(16,sl),gutR=EMBED?Math.max(0,sr):Math.max(16,sr),top=EMBED?Math.max(0,st):Math.max(10,st)+46;
  if(portrait){const w=vw-gutL-gutR,h=w/asp;RECT={x:gutL,y:top+4,w,h};bs.setProperty('--stick',Math.min(156,vw*.36)+'px');bs.setProperty('--b',Math.min(64,vw*.16)+'px');bs.setProperty('--padTop',(RECT.y+h+26)+'px');$('turn').style.top=(RECT.y+h+8)+'px';}
  else{const bottom=EMBED?Math.max(0,sb):touchy?Math.max(8,sb)+4:Math.max(10,sb)+30,aw=vw-gutL-gutR,ah=vh-top-bottom;let w=aw,h=w/asp;if(h>ah){h=ah;w=h*asp;}RECT={x:gutL+(aw-w)/2,y:top+(ah-h)/2,w,h};
    if(touchy){bs.setProperty('--stick',Math.min(140,vh*.34)+'px');bs.setProperty('--b',Math.min(56,vh*.13)+'px');}}
}
