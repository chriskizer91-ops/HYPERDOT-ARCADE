/* ===================== WebGL2 renderer: lit meshes, nebula sky, shadows, particles, bloom and the LED HUD =====================
   One frame: shadow map -> scene (sky, planet, hulls, effects, cockpit) into an HDR buffer -> bloom -> tone map ->
   optional dot-matrix filter -> HUD canvas lit as LED dots, with ship holograms rendered into the dot grid. */
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,stencil:false,powerPreference:'high-performance'});
const GLX={cbf:false,maxS:0,msF:0};
if(gl){GLX.cbf=!!gl.getExtension('EXT_color_buffer_float');gl.getExtension('OES_texture_float_linear');GLX.maxS=gl.getParameter(gl.MAX_SAMPLES)||0;
  if(GLX.cbf){try{const s=gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES);GLX.msF=s&&s.length?Math.max(...s):0;}catch(e){GLX.msF=0;}}else GLX.msF=GLX.maxS;}
const HDRI=GLX.cbf?(gl&&gl.RGBA16F):(gl&&gl.RGBA8),HDRT=GLX.cbf?(gl&&gl.HALF_FLOAT):(gl&&gl.UNSIGNED_BYTE);

/* quality: render scale cap, MSAA, shadow map size, effect budget, bloom levels */
const QL=[{n:'LOW',sc:1,ms:0,sh:0,fx:.55,bl:5},{n:'MED',sc:1.5,ms:4,sh:1024,fx:.8,bl:6},{n:'HIGH',sc:2,ms:4,sh:2048,fx:1,bl:6}];
let qAuto=store.get('q','auto')==='auto',qI=qAuto?(touchy?1:2):clamp(parseInt(store.get('q','2'),10)||0,0,2);
let DOTF=store.get('dotf','0')==='1';

/* ---------- shader plumbing ---------- */
const GLSL_HEAD='#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2DShadow;\nprecision highp samplerCube;\n';
function shd(type,src){const s=gl.createShader(type);gl.shaderSource(s,GLSL_HEAD+src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);console.error(e+'\n'+src.split('\n').map((l,i)=>(i+6)+': '+l).join('\n'));throw new Error(e);}return s;}
function prog(vs,fs){
  const p=gl.createProgram();gl.attachShader(p,shd(gl.VERTEX_SHADER,vs));gl.attachShader(p,shd(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
const NOISE_GLSL=`
float hsh(vec3 p){uvec3 q=uvec3(ivec3(floor(p))+ivec3(4096));q=q*uvec3(1597334673u,3812015801u,2798796415u);uint n=(q.x^q.y^q.z)*1597334673u;return float(n)*(1./4294967295.);}
float vn3(vec3 x){vec3 i=floor(x),f=fract(x);vec3 u=f*f*(3.-2.*f);
  return mix(mix(mix(hsh(i),hsh(i+vec3(1,0,0)),u.x),mix(hsh(i+vec3(0,1,0)),hsh(i+vec3(1,1,0)),u.x),u.y),
             mix(mix(hsh(i+vec3(0,0,1)),hsh(i+vec3(1,0,1)),u.x),mix(hsh(i+vec3(0,1,1)),hsh(i+vec3(1,1,1)),u.x),u.y),u.z);}
float fbm3(vec3 x,int o){float s=0.,a=.5;for(int i=0;i<8;i++){if(i>=o)break;s+=a*vn3(x);x*=2.03;a*=.5;}return s;}
`;
const VS_FULL=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
/* camera-space projection used everywhere: x right, y up, z forward; F, cx, cy in HUD dots (see VIEW) */
const PROJ_GLSL=`uniform vec4 uPX;uniform vec2 uPZ;vec4 prj(vec3 c){return vec4(uPX.x*c.x+uPX.y*c.z,uPX.z*c.y+uPX.w*c.z,uPZ.x*c.z+uPZ.y,c.z);}`;

/* ---------- lit hull shader ---------- */
const VS_MESH=`layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec3 aC;layout(location=3) in vec4 aM;
uniform mat3 uR;uniform vec3 uT;uniform float uS;uniform mat3 uV;uniform mat4 uSM;uniform float uSB;${PROJ_GLSL}
out vec3 vW;out vec3 vN;out vec3 vC;out vec4 vM;out vec3 vL;out vec3 vLN;out vec3 vS;
void main(){vec3 n=uR*aN;vec3 w=uR*(aP*uS)+uT;vW=w;vN=n;vC=aC;vM=aM;vL=aP*uS;vLN=aN;
  vS=(uSM*vec4(w+normalize(n)*uSB,1.)).xyz;gl_Position=prj(uV*w);}`;
const FS_MESH=`in vec3 vW;in vec3 vN;in vec3 vC;in vec4 vM;in vec3 vL;in vec3 vLN;in vec3 vS;
uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uAmb;uniform float uGlow;uniform float uFlash;uniform float uDet;uniform float uShOn;uniform float uIbl;uniform float uEK;uniform float uFill;uniform float uSunK;
uniform sampler2DShadow uShT;uniform samplerCube uSky;uniform vec4 uLP[8];uniform vec4 uLC[8];uniform int uNL;
out vec4 o;
${NOISE_GLSL}
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float shadowAt(vec3 s){if(s.x<.002||s.y<.002||s.x>.998||s.y>.998||s.z>1.)return 1.;float ts=1./float(textureSize(uShT,0).x);
  float r=texture(uShT,vec3(s.xy+vec2(-.6,-.6)*ts,s.z))+texture(uShT,vec3(s.xy+vec2(.6,-.6)*ts,s.z))+texture(uShT,vec3(s.xy+vec2(-.6,.6)*ts,s.z))+texture(uShT,vec3(s.xy+vec2(.6,.6)*ts,s.z));
  float e=min(min(s.x,s.y),min(1.-s.x,1.-s.y));return mix(1.,r*.25,smoothstep(0.,.04,e));}
void main(){
  vec3 N=normalize(vN);vec3 V=normalize(-vW);if(!gl_FrontFacing)N=-N;
  vec3 alb=vC;float emi=vM.x,rough=vM.y,metal=vM.z,det=vM.w,win=0.;
  if(emi>0.){o=vec4(alb*emi*uGlow*uEK+uFlash*vec3(1.5),1.);return;}
  if(det>.5&&det<1.5&&uDet>0.){
    vec3 an=abs(vLN);vec2 uv=(an.x>an.y&&an.x>an.z?vL.yz:an.y>an.z?vL.xz:vL.xy)/uDet;
    vec2 id=floor(uv),f=fract(uv);float r=h21(id),r2=h21(floor(uv*.25)+7.);alb*=(.86+.28*r)*(.9+.2*r2)*(.8+.4*vn3(vL*(.35/uDet)));rough=clamp(rough+(r-.5)*.2,.04,1.);
    vec2 fw=fwidth(uv);vec2 e=min(f,1.-f)/max(fw,vec2(1e-4));float ln=1.-clamp(min(e.x,e.y)-.3,0.,1.);
    ln*=1.-smoothstep(.08,.3,max(fw.x,fw.y));alb*=1.-ln*.5;
    if(uDet>4.&&r>.982&&metal<.6){vec2 c2=abs(f-.5);win=step(max(c2.x,c2.y*1.7),.2)*(1.-smoothstep(.15,.5,max(fw.x,fw.y)));}
  }else if(det>1.5){float n=vn3(vL*.09)*.55+vn3(vL*.4)*.3+vn3(vL*1.7)*.15;alb*=.45+1.1*n;rough=clamp(rough-.15+n*.2,0.,1.);}
  float sh=uShOn>.5?shadowAt(vS):1.;
  float ndl=max(dot(N,uSun),0.),ndv=max(dot(N,V),.001);
  vec3 H=normalize(uSun+V);float ndh=max(dot(N,H),0.);
  float sp=exp2(11.*(1.-rough)+1.);float spec=pow(ndh,sp)*(sp+8.)*.04;
  vec3 F0=mix(vec3(.04),alb,metal);vec3 Fr=F0+(1.-F0)*pow(1.-ndv,5.)*(1.-rough*.8);
  vec3 dif=alb*(1.-metal*.85);
  vec3 col=(dif+Fr*spec)*uSunC*ndl*sh*uSunK;
  col+=dif*uAmb*uFill*(.35+.65*ndv);
  col+=dif*(textureLod(uSky,N,5.5).rgb*uIbl+uAmb);
  col+=textureLod(uSky,reflect(-V,N),rough*7.).rgb*min(Fr,vec3(.6))*uIbl*.9;
  for(int i=0;i<8;i++){if(i>=uNL)break;vec3 d=uLP[i].xyz-vW;float dd=length(d);float at=max(0.,1.-dd/uLP[i].w);at*=at;vec3 l=d/max(dd,.001);
    col+=(dif*max(dot(N,l),0.)+Fr*pow(max(dot(N,normalize(l+V)),0.),sp)*.25)*uLC[i].rgb*at;}
  col+=vec3(1.,.8,.5)*win*2.4;
  col=mix(col,vec3(2.4,2.3,2.2),uFlash*.65);
  o=vec4(col,1.);
}`;
/* holograms for the briefing, the ship roster and the cockpit's target screen: drawn into the HUD's dot grid */
const FS_HOLO=`in vec3 vW;in vec3 vN;in vec3 vC;in vec4 vM;in vec3 vL;in vec3 vLN;in vec3 vS;
uniform vec3 uTint;uniform vec3 uHL;uniform float uFrame;out vec4 o;
void main(){vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;float d=dot(N,uHL);vec3 base=vM.x>0.?vec3(1.):pow(vC,vec3(1./2.2))*(.35+.75*max(d,0.)+.12*max(-d,0.));
  float l=dot(base,vec3(.3,.55,.15))*1.35+.1;float row=floor(gl_FragCoord.y*.5);float sc=mod(row+uFrame,3.)<.5?.55:1.;
  o=vec4(uTint*l*sc,1.);}`;
/* shield bubbles: a fresnel shell that flares where the shot landed */
const FS_BUB=`in vec3 vW;in vec3 vN;in vec3 vC;in vec4 vM;in vec3 vL;in vec3 vLN;in vec3 vS;uniform vec3 uHit;uniform float uK;uniform vec3 uCol;uniform float uTm;out vec4 o;
void main(){vec3 N=normalize(vN),V=normalize(-vW);float f=pow(1.-abs(dot(N,V)),2.2);float h=max(dot(normalize(vLN),uHit),0.);
  vec3 q=vLN*9.;float cell=abs(sin(q.x+uTm*3.)*sin(q.y*1.15)*sin(q.z*1.3));float hex=.55+.45*smoothstep(.15,.6,cell);
  o=vec4(uCol*(f*.3+pow(h,6.)*.9+pow(h,40.)*1.6)*uK*hex,0.);}`;
const VS_DEPTH=`layout(location=0) in vec3 aP;uniform mat3 uR;uniform vec3 uT;uniform float uS;uniform mat4 uLM;void main(){gl_Position=uLM*vec4(uR*(aP*uS)+uT,1.);}`;
const FS_DEPTH=`out vec4 o;void main(){o=vec4(1.);}`;

/* ---------- sky ---------- */
const FS_SKYBAKE=`in vec2 vT;uniform int uFace;uniform float uSeed;uniform vec3 uBase;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uBand;uniform vec3 uSun;uniform vec3 uSunC;out vec4 o;
${NOISE_GLSL}
vec3 cubeDir(int f,float u,float v){if(f==0)return vec3(1,-v,-u);if(f==1)return vec3(-1,-v,u);if(f==2)return vec3(u,1,v);if(f==3)return vec3(u,-1,-v);if(f==4)return vec3(u,-v,1);return vec3(-u,-v,-1);}
void main(){vec2 uv=vT*2.-1.;vec3 d=normalize(cubeDir(uFace,uv.x,uv.y));float s=uSeed;
  float n1=fbm3(d*2.2+vec3(s,0,-s),6),n2=fbm3(d*4.+vec3(9,-s,3),5),band=exp(-pow(dot(d,uBand)/.32,2.));
  float fil=fbm3(d*11.+vec3(-s,4,s),4);
  float k=pow(clamp((n1-.38)*2.2,0.,1.),1.6)*(.5+band*.9)*(.7+.6*fil),k2=pow(clamp((n2-.5)*2.5,0.,1.),2.)*.8*band;
  float dust=smoothstep(.45,.75,fbm3(d*5.+vec3(3,s,-7),5))*band;
  float sd=max(0.,dot(d,uSun)),halo=pow(sd,14.)*.55+pow(sd,90.)*1.6;
  vec3 c=uBase+uC1*k+uC2*k2+uSunC*halo*vec3(.45,.4,.36);c*=1.-dust*.55;
  o=vec4(pow(max(c,vec3(0.))/255.,vec3(2.2))*1.4,1.);}`;
const FS_SKY=`in vec2 vT;uniform samplerCube uSky;uniform mat3 uVI;uniform vec4 uPX;uniform vec3 uSun;uniform vec3 uSunC;uniform float uSunR;out vec4 o;
void main(){vec2 nd=vT*2.-1.;vec3 d=normalize(uVI*vec3((nd.x-uPX.y)/uPX.x,(nd.y-uPX.w)/uPX.z,1.));
  vec3 c=texture(uSky,d).rgb;float sd=dot(d,uSun),ca=cos(uSunR);
  c+=uSunC*(smoothstep(ca-.0008,ca+.0004,sd)*9.+pow(max(sd,0.),2000.)*2.5+pow(max(sd,0.),160.)*.16);
  o=vec4(c,1.);}`;
const VS_STAR=`layout(location=0) in vec3 aD;layout(location=1) in vec4 aC;uniform mat3 uV;uniform float uPs;uniform float uTm;${PROJ_GLSL}out vec3 vC;
void main(){vec3 c=uV*aD;vec4 p=prj(c);p.z=p.w*.99999;gl_Position=p;float tw=.8+.2*sin(uTm*2.3+aD.x*97.+aD.z*41.);float s=aC.w*uPs;vC=aC.rgb*tw*min(1.,s*s);gl_PointSize=max(1.,s);}`;
const FS_STAR=`in vec3 vC;out vec4 o;void main(){vec2 q=gl_PointCoord*2.-1.;float a=max(0.,1.-dot(q,q));o=vec4(vC*a*a,0.);}`;
const FS_PLANET=`in vec2 vT;uniform mat3 uVI;uniform vec4 uPX;uniform vec3 uPD;uniform vec3 uAx;uniform vec3 uBx;uniform vec3 uBz;uniform vec3 uSun;uniform float uAr;uniform float uSeed;uniform float uRot;
uniform vec3 uP0;uniform vec3 uP1;uniform vec3 uP2;uniform vec3 uAtm;uniform vec3 uAmb;out vec4 o;
${NOISE_GLSL}
void main(){vec2 nd=vT*2.-1.;vec3 d=normalize(uVI*vec3((nd.x-uPX.y)/uPX.x,(nd.y-uPX.w)/uPX.z,1.));
  float cd=dot(d,uPD);if(cd<cos(uAr*1.3))discard;float sa=sin(uAr),disc=cd*cd-(1.-sa*sa);vec3 atm=pow(uAtm/255.,vec3(2.2));
  if(disc<0.){float ang=acos(clamp(cd,-1.,1.)),t=(ang-uAr)/(uAr*.22);if(t>1.)discard;vec3 nr=normalize(d-uPD*cd);float lit=max(0.,dot(nr,uSun)+.3);o=vec4(atm*pow(1.-t,2.2)*lit*.9,0.);return;}
  float t=cd-sqrt(disc);vec3 n=normalize(d*t-uPD);
  float lat=dot(n,uAx),lo=atan(dot(n,uBz),dot(n,uBx))+uRot,cx=cos(lo)*2.,cz=sin(lo)*2.;
  float sw=fbm3(vec3(lat*3.+uSeed,cx*.5,cz*.5+uSeed*2.),4),bb=(sin(lat*14.+sw*5.)+1.)*.5,b2=fbm3(vec3(lat*30.+uSeed,cx+sw*3.,cz)*1.,4);
  float storm=smoothstep(.62,.7,fbm3(n*6.+uSeed,4));
  vec3 c=mix(uP0,uP1,bb);c=mix(c,uP2,clamp(b2*1.6-.55,0.,1.));c=mix(c,uP1*1.1,storm*.5);c=pow(c/255.,vec3(2.2));
  float dif=dot(n,uSun),li=clamp(dif*1.1+.06,0.,1.),nz=max(0.,dot(n,-d)),rim=pow(1.-nz,3.)*max(0.,dif+.3);
  o=vec4(c*(li*1.5+.015)+atm*rim*1.3+uAmb*c*.3,1.);}`;

/* ---------- particles, bolts, trails, glows, shock rings: one instanced quad, premultiplied alpha (a=0 adds light) ---------- */
const VS_SPR=`layout(location=0) in vec2 aQ;layout(location=1) in vec4 iP;layout(location=2) in vec4 iC;layout(location=3) in vec4 iS;
uniform mat3 uV;uniform float uPxW;${PROJ_GLSL}
out vec2 vQ;out vec4 vC;flat out int vK;out float vSeed;out float vLen;
void main(){int k=int(floor(iS.w));vK=k;vSeed=fract(iS.w);vC=iC;vQ=aQ;vLen=0.;vec3 c=uV*iP.xyz;float s=iP.w;vec3 pos;
  if(k==0||k==3)vC*=clamp((c.z-1.5)/(s*2.5+1.),0.,1.);
  if(k==1){vec3 c1=uV*(iP.xyz-iS.xyz);float ms=max(s,max(min(c.z,c1.z),.5)*uPxW*1.1);vec3 ax=c1-c;float L=length(ax);vec3 dir=L>1e-4?ax/L:vec3(0,1,0);
    vec3 side=cross(dir,normalize(c+c1+vec3(0,0,1e-3)));float sl=length(side);side=sl>1e-4?side/sl:vec3(1,0,0);
    float along=(aQ.y*.5+.5)*(L+2.*ms)-ms;pos=c+dir*along+side*aQ.x*ms;vLen=(L+2.*ms)/ms;}
  else if(k==2){vec3 n=uV*normalize(iS.xyz);vec3 t=normalize(cross(n,abs(n.y)<.9?vec3(0,1,0):vec3(1,0,0)));vec3 b=cross(n,t);pos=c+(t*aQ.x+b*aQ.y)*s;}
  else{float ms=max(s,max(c.z,.5)*uPxW*1.3);float a=vSeed*6.2832;vec2 q=mat2(cos(a),sin(a),-sin(a),cos(a))*aQ;pos=c+vec3(q*ms,0.);if(k==0)vC*=min(1.,s/ms*s/ms*1.2+.15);}
  gl_Position=prj(pos);}`;
const FS_SPR=`in vec2 vQ;in vec4 vC;flat in int vK;in float vSeed;in float vLen;uniform sampler2D uNoise;uniform float uTm;out vec4 o;
void main(){float a;vec3 hot=vec3(0);
  if(vK==1){float along=(vQ.y*.5+.5)*vLen-1.,seg=vLen-2.,dy=along-clamp(along,0.,seg);float d=length(vec2(vQ.x,dy));a=max(0.,1.-d);a*=a;hot=vec3(pow(max(0.,1.-d*2.2),2.))*dot(vC.rgb,vec3(.33))*.9;}
  else if(vK==2){float r=length(vQ);a=smoothstep(.7,.92,r)*(1.-smoothstep(.92,1.,r))+.03*(1.-r);a=max(a,0.);}
  else if(vK==3){float d=length(vQ);vec2 uv=vQ*.32+vec2(vSeed*7.1,vSeed*3.7)+uTm*.01;float n=texture(uNoise,uv).r*.65+texture(uNoise,uv*2.3).r*.35;a=smoothstep(1.,.25,d+(n-.5)*1.1);hot=vC.rgb*smoothstep(.55,0.,d)*.6;}
  else{float d=dot(vQ,vQ);a=max(0.,1.-d);a*=a*a;}
  o=vec4(vC.rgb*a+hot*a,vC.a*a);}`;
/* sun glare when the sun is in view: an anamorphic streak and a few ghosts across the screen centre */
const FS_FLARE=`in vec2 vT;uniform vec2 uS;uniform float uK;uniform float uAsp;uniform vec3 uC;out vec4 o;
void main(){vec2 p=vT*2.-1.;vec2 q=(p-uS)*vec2(uAsp,1.);vec3 c=uC*exp(-abs(q.y)*120.)*exp(-abs(q.x)*2.2)*.3+uC*exp(-length(q)*9.)*.12;
  const float GT[5]=float[5](.45,-.25,-.6,-1.05,-1.5);const float GR[5]=float[5](.05,.09,.04,.16,.08);
  const vec3 GC[5]=vec3[5](vec3(.4,.8,1.),vec3(.4,1.,.6),vec3(1.,.6,.3),vec3(.6,.5,1.),vec3(1.,.9,.6));
  for(int i=0;i<5;i++){vec2 g=(p-uS*GT[i])*vec2(uAsp,1.);float d=length(g)/GR[i];c+=GC[i]*(smoothstep(1.,.6,d)*.018+smoothstep(1.,.94,d)*smoothstep(.88,.94,d)*.025);}
  o=vec4(c*uK,0.);}`;

/* ---------- post ---------- */
const FS_DOWN=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;uniform float uPre;out vec4 o;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;c*=.25;
  if(uPre>.5){c=min(c,vec3(60.));float l=max(c.r,max(c.g,c.b)),k=clamp(l-uThr*.5,0.,uThr);k=k*k/(4.*uThr*.5+1e-4);c*=max(k,l-uThr)/max(l,1e-4);}
  o=vec4(c,1.);}`;
const FS_UP=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uK;out vec4 o;
void main(){vec3 c=texture(uTex,vT).rgb*4.;c+=(texture(uTex,vT+vec2(uPx.x,0)).rgb+texture(uTex,vT-vec2(uPx.x,0)).rgb+texture(uTex,vT+vec2(0,uPx.y)).rgb+texture(uTex,vT-vec2(0,uPx.y)).rgb)*2.;
  c+=texture(uTex,vT+uPx).rgb+texture(uTex,vT-uPx).rgb+texture(uTex,vT+vec2(uPx.x,-uPx.y)).rgb+texture(uTex,vT+vec2(-uPx.x,uPx.y)).rgb;o=vec4(c*(uK/16.),1.);}`;
const FS_COMP=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uBloom;uniform float uBK;uniform float uExp;uniform vec3 uTint;uniform float uGrain;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec2 q=vT-.5;float ca=dot(q,q)*.004;vec3 c=vec3(texture(uScene,vT-q*ca).r,texture(uScene,vT).g,texture(uScene,vT+q*ca).b);
  c+=texture(uBloom,vT).rgb*uBK;c=aces(c*uExp*uTint);c=pow(c,vec3(1./2.2));c*=1.-dot(q,q)*.55;
  float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+uGrain)*43758.5453);c+=(n-.5)*.012;o=vec4(c,1.);}`;
/* the optional dot-matrix filter: the finished 3D frame shown on an LED panel, one dot per HUD cell */
const FS_LED=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uRes;out vec4 o;
void main(){vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;
  vec3 c=(texture(uTex,(id+vec2(.3,.3))/uRes).rgb+texture(uTex,(id+vec2(.7,.3))/uRes).rgb+texture(uTex,(id+vec2(.3,.7))/uRes).rgb+texture(uTex,(id+vec2(.7,.7))/uRes).rgb)*.25;
  float fw=max(fwidth(cell.x),fwidth(cell.y)),d=length(f),r=.43,dm=1.-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.-smoothstep(0.,r,d),far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.78+.52*hot),.62,far);o=vec4((c*1.3+vec3(.035,.034,.045))*m,1.);}`;
/* the HUD: every canvas pixel is one LED. Lit dots glow, panels dim the scene behind them. Holograms share the grid. */
const FS_HUD=`in vec2 vT;uniform sampler2D uHud;uniform sampler2D uHolo;uniform vec2 uRes;uniform float uGain;out vec4 o;
void main(){vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;
  vec4 h=texelFetch(uHud,ivec2(id),0);vec4 ho=texture(uHolo,(id+.5)/uRes);
  float fw=max(fwidth(cell.x),fwidth(cell.y)),d=length(f),r=.43,dm=1.-smoothstep(r-fw*.6-.03,r+fw*.6,d),hot=1.-smoothstep(0.,r,d),far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.72+.5*hot),.6,far);vec3 c=h.rgb+ho.rgb;float a=max(h.a,ho.a);
  vec3 glow=textureLod(uHud,vT,2.2).rgb*.55+textureLod(uHud,vT,3.6).rgb*.35;
  o=vec4(c*uGain*m+glow,max(a*(.45+.55*m),ho.a));}`;

let P={},VAO_E,QUADB,QUADV,INST,INSTB,STARV,STARN=0,NOISE,DUMMY_SH,SKYC=null,SKYDIRTY=true,SKYTH=null,HUDT,HOLO={t:null,f:null,d:null,w:0,h:0};
const T={};let RW=1,RH=1;
const MAXI=9000,IB=new Float32Array(MAXI*12);
function glInit(){
  P.mesh=prog(VS_MESH,FS_MESH);P.holo=prog(VS_MESH,FS_HOLO);P.bub=prog(VS_MESH,FS_BUB);P.depth=prog(VS_DEPTH,FS_DEPTH);P.skybake=prog(VS_FULL,FS_SKYBAKE);P.sky=prog(VS_FULL,FS_SKY);
  P.star=prog(VS_STAR,FS_STAR);P.planet=prog(VS_FULL,FS_PLANET);P.spr=prog(VS_SPR,FS_SPR);P.flare=prog(VS_FULL,FS_FLARE);
  P.down=prog(VS_FULL,FS_DOWN);P.up=prog(VS_FULL,FS_UP);P.comp=prog(VS_FULL,FS_COMP);P.led=prog(VS_FULL,FS_LED);P.hud=prog(VS_FULL,FS_HUD);
  VAO_E=gl.createVertexArray();
  /* the sprite quad + its instance buffer */
  QUADV=gl.createVertexArray();gl.bindVertexArray(QUADV);
  QUADB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,QUADB);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  INSTB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,INSTB);gl.bufferData(gl.ARRAY_BUFFER,IB.byteLength,gl.DYNAMIC_DRAW);
  for(let i=0;i<3;i++){gl.enableVertexAttribArray(1+i);gl.vertexAttribPointer(1+i,4,gl.FLOAT,false,48,i*16);gl.vertexAttribDivisor(1+i,1);}
  gl.bindVertexArray(null);
  /* tileable value noise for smoke and fire */
  const N=128,nd=new Uint8Array(N*N),rr=mulberry(77);
  for(const [cells,amp] of [[8,.5],[16,.3],[32,.2]]){const gr=[];for(let i=0;i<cells*cells;i++)gr.push(rr());
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N*cells,fy=y/N*cells,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
      const v=(a,b)=>gr[((b%cells+cells)%cells)*cells+((a%cells+cells)%cells)];const val=lerp(lerp(v(ix,iy),v(ix+1,iy),sx),lerp(v(ix,iy+1),v(ix+1,iy+1),sx),sy);
      nd[y*N+x]=Math.min(255,nd[y*N+x]+val*amp*255);}}
  NOISE=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,NOISE);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,N,N,0,gl.RED,gl.UNSIGNED_BYTE,nd);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  DUMMY_SH=depthTex(1);
  HUDT=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,HUDT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  buildStars();
}
function tex(w,h,ifmt,fmt,type,filt){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filt);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filt);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
function hdrTex(w,h){return tex(w,h,HDRI,gl.RGBA,HDRT,gl.LINEAR);}
function depthTex(s){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,s,s,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);return t;}
function rb(w,h,fmt,s){const r=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,r);if(s>0)gl.renderbufferStorageMultisample(gl.RENDERBUFFER,s,fmt,w,h);else gl.renderbufferStorage(gl.RENDERBUFFER,fmt,w,h);return r;}
function fb(ct,depth,colRB){const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);
  if(ct)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,ct,0);if(colRB)gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,colRB);
  if(depth)gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);return f;}
/* all render targets follow the game box, the render scale and the quality level */
function glTargets(){
  if(!gl)return;
  if(T.bl)for(const l of T.bl){gl.deleteTexture(l.t);gl.deleteFramebuffer(l.f);}
  for(const k of ['scene','ms','ldr','sh']){const o=T[k];if(!o)continue;if(o.t)gl.deleteTexture(o.t);if(o.f)gl.deleteFramebuffer(o.f);if(o.c)gl.deleteRenderbuffer(o.c);if(o.d)gl.deleteRenderbuffer(o.d);T[k]=null;}
  const Q=QL[qI];let sc=Math.min(DPR,Q.sc);const px=RECT.w*RECT.h*sc*sc,cap=touchy?2.6e6:4.4e6;if(px>cap)sc*=Math.sqrt(cap/px);
  RW=Math.max(16,Math.round(RECT.w*sc));RH=Math.max(16,Math.round(RECT.h*sc));
  const ms=Math.min(Q.ms,GLX.msF||0);
  T.scene={t:hdrTex(RW,RH),w:RW,h:RH};
  if(ms>0){T.ms={c:rb(RW,RH,HDRI,ms),d:rb(RW,RH,gl.DEPTH_COMPONENT24,ms),w:RW,h:RH,s:ms};T.ms.f=fb(null,T.ms.d,T.ms.c);T.scene.f=fb(T.scene.t,null);}
  else{T.scene.d=rb(RW,RH,gl.DEPTH_COMPONENT24,0);T.scene.f=fb(T.scene.t,T.scene.d);T.ms=null;}
  T.bl=[];let w=RW>>1,h=RH>>1;for(let i=0;i<Q.bl&&w>=4&&h>=4;i++){const t=hdrTex(w,h);T.bl.push({t,f:fb(t,null),w,h});w>>=1;h>>=1;}
  T.ldr={t:tex(RW,RH,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.LINEAR),w:RW,h:RH};T.ldr.f=fb(T.ldr.t,null);
  if(Q.sh){const t=depthTex(Q.sh);const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,t,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);T.sh={t,f,s:Q.sh};}
  /* the hologram layer lives in the HUD's dot grid, at 2x so every dot averages four samples */
  const hw=W*2,hh=H*2;if(HOLO.w!==hw||HOLO.h!==hh){if(HOLO.t){gl.deleteTexture(HOLO.t);gl.deleteFramebuffer(HOLO.f);gl.deleteRenderbuffer(HOLO.d);}
    HOLO.t=tex(hw,hh,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.LINEAR);HOLO.d=rb(hw,hh,gl.DEPTH_COMPONENT24,0);HOLO.f=fb(HOLO.t,HOLO.d);HOLO.w=hw;HOLO.h=hh;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
function setQuality(i,auto){qI=clamp(i,0,2);if(auto!=null)qAuto=auto;store.set('q',qAuto?'auto':String(qI));glTargets();PERF.n=0;PERF.sum=0;PERF.cool=4;}

/* ---------- stars: real points, drawn every frame so they stay sharp ---------- */
function buildStars(){
  const r=mulberry(9),data=[];
  for(let i=0;i<2600;i++){const u=r()*2-1,t=r()*TAU,s=Math.sqrt(1-u*u),d=[s*Math.cos(t),u,s*Math.sin(t)];const b=Math.pow(r(),3.2);
    const tc=r(),c=tc<.15?[1,.72,.55]:tc<.3?[.62,.76,1]:[.92,.92,1],k=.25+b*2.6;data.push(d[0],d[1],d[2],c[0]*k,c[1]*k,c[2]*k,.9+b*2.4);}
  STARN=data.length/7;STARV=gl.createVertexArray();gl.bindVertexArray(STARV);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,28,12);gl.bindVertexArray(null);
}
/* ---------- the nebula: baked once per mission into a mipmapped cube (the hulls use it for ambient light and reflections) ---------- */
function skyTheme(th){SKYTH=th;SKYDIRTY=true;}
function bakeSkyGL(){
  SKYDIRTY=false;const th=SKYTH;if(!th)return;const S=touchy?256:512;
  if(!SKYC){SKYC=gl.createTexture();gl.bindTexture(gl.TEXTURE_CUBE_MAP,SKYC);for(let f=0;f<6;f++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+f,0,HDRI,S,S,0,gl.RGBA,HDRT,null);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    for(const w of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R])gl.texParameteri(gl.TEXTURE_CUBE_MAP,w,gl.CLAMP_TO_EDGE);}
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.viewport(0,0,S,S);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
  const p=P.skybake;gl.useProgram(p.p);gl.uniform1f(p.u.uSeed,th.seed||3);gl.uniform3fv(p.u.uBase,th.base);gl.uniform3fv(p.u.uC1,th.c1);gl.uniform3fv(p.u.uC2,th.c2);
  gl.uniform3fv(p.u.uBand,th.band||[0,1,0]);gl.uniform3fv(p.u.uSun,SUN.dir);gl.uniform3fv(p.u.uSunC,SUN.col);gl.bindVertexArray(VAO_E);
  for(let i=0;i<6;i++){gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,SKYC,0);gl.uniform1i(p.u.uFace,i);gl.drawArrays(gl.TRIANGLES,0,3);}
  gl.bindTexture(gl.TEXTURE_CUBE_MAP,SKYC);gl.generateMipmap(gl.TEXTURE_CUBE_MAP);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(f);
}

/* ---------- meshes go to the GPU once: position, corner normal, linear colour, (emissive, roughness, metal, detail) ---------- */
function meshGPU(m){
  if(m.gpu)return m.gpu;const nf=m.nf,a=new Float32Array(nf*3*13);let o=0;
  for(let f=0;f<nf;f++){const mt=m.mats[m.FM[f]];for(let k=0;k<3;k++){const vi=m.F[f*3+k];
    a[o++]=m.V[vi*3];a[o++]=m.V[vi*3+1];a[o++]=m.V[vi*3+2];a[o++]=m.VN[f*9+k*3];a[o++]=m.VN[f*9+k*3+1];a[o++]=m.VN[f*9+k*3+2];
    a[o++]=mt.lin[0];a[o++]=mt.lin[1];a[o++]=mt.lin[2];a[o++]=mt.emi?mt.glow:0;a[o++]=mt.rough;a[o++]=mt.metal;a[o++]=mt.det;}}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,52,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,52,12);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,52,24);gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.FLOAT,false,52,36);gl.bindVertexArray(null);
  m.gpu={vao,b,n:nf*3,det:m.boxes?7:Math.min(3,Math.max(.7,m.R/7))};return m.gpu;
}
/* column-major mat3s: model rotation from a quaternion, and the camera's world->view rotation */
const M3=new Float32Array(9),MV=new Float32Array(9),MVI=new Float32Array(9);
function qmat(q,out){const r=qR(q),u=qU(q),f=qF(q);out[0]=r[0];out[1]=r[1];out[2]=r[2];out[3]=u[0];out[4]=u[1];out[5]=u[2];out[6]=f[0];out[7]=f[1];out[8]=f[2];return out;}
function viewMats(){const V=VIEW;MV[0]=V.r[0];MV[1]=V.u[0];MV[2]=V.f[0];MV[3]=V.r[1];MV[4]=V.u[1];MV[5]=V.f[1];MV[6]=V.r[2];MV[7]=V.u[2];MV[8]=V.f[2];
  MVI[0]=V.r[0];MVI[1]=V.r[1];MVI[2]=V.r[2];MVI[3]=V.u[0];MVI[4]=V.u[1];MVI[5]=V.u[2];MVI[6]=V.f[0];MVI[7]=V.f[1];MVI[8]=V.f[2];}
/* projection numbers for prj(): x and y from the HUD-dot focal length and centre, z between near and far */
function projU(u,near,far){const V=VIEW;gl.uniform4f(u.uPX,2*V.F/W,2*V.cx/W-1,2*V.F/H,1-2*V.cy/H);gl.uniform2f(u.uPZ,(far+near)/(far-near),-2*far*near/(far-near));}
