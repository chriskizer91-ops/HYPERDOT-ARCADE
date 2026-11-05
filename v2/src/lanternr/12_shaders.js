/* =====================================================================================
   21. 3D — SHADERS. One lighting routine is shared by everything solid: the hand lantern's
       glow and beam, up to twelve street lamps, flares, the great lamp, the moon and the sky.
       Each light uses the falloff the rules use, so a pool that looks lit is a pool that
       freezes a shade. The town's surfaces are painted procedurally (no image files).
   ===================================================================================== */
const MAXL=12;
const GL_COMMON=`
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
/* REMAKE: value noise read from a 256x256 tile of hashes (one texture read instead of four hashes) */
uniform sampler2D uNT;
float vn(vec2 p){return texture(uNT,(p+.5)*.00390625).r;}
float fbm(vec2 p){return vn(p)*.55+vn(p*2.07+7.1)*.3+vn(p*4.13+13.7)*.15;}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
uint ih(int a,int b,int c){uint h=uint(a)*374761393u+uint(b)*668265263u+uint(c)*982451653u;h=(h^(h>>13))*1274126177u;return h^(h>>16);}
float ihf(int a,int b,int c){return float(ih(a,b,c)>>8)/16777216.;}
`;
const GL_LIGHT=`
#define MAXL ${MAXL}
uniform sampler2D uHz;
uniform vec4 uLanP,uLanI,uLanH,uBeam;
uniform int uNL;uniform vec4 uLmP[MAXL];uniform vec4 uLmI[MAXL];
uniform int uNF;uniform vec4 uFlP[3];uniform vec4 uFlI[3];
uniform vec4 uGrP,uGrI,uGrH;
uniform vec3 uMoonD,uMoonC;uniform mat4 uMoonVP;uniform sampler2DShadow uMoonS;
uniform vec3 uSky,uGnd;uniform vec4 uQ;
const vec3 C_LAN=vec3(1.,.55,.22),C_LAMP=vec3(1.,.63,.29),C_FL=vec3(1.,.47,.34),C_GR=vec3(1.,.87,.64);
const float HZIH=1./${HZ.rows}.;
/* the horizon test: H = (first row, rows, dots per row); LS = the flame's size */
float hzS(vec3 L,vec3 H,vec3 P,float LS,float taps){
  vec2 d=P.xz-L.xz;float r=length(d);float fi=(r-1.)/H.z-1.;if(fi<0.)return 1.;
  fi=min(fi,H.y-1.);float v=(H.x+fi+.5)*HZIH,u=atan(d.y,d.x)*.15915494;
  vec2 h=texture(uHz,vec2(u,v)).rg;float w=clamp(LS*(r-h.g)/max(h.g,.7)+.05,.05,9.);
  float s=smoothstep(-w,w,P.y-(L.y+h.r*r));
  if(taps>1.5){float du=min(w/r,.1)*.11;vec2 h1=texture(uHz,vec2(u+du,v)).rg,h2=texture(uHz,vec2(u-du,v)).rg;
    s=(s+smoothstep(-w,w,P.y-(L.y+h1.r*r))+smoothstep(-w,w,P.y-(L.y+h2.r*r)))/3.;}
  return s;}
float moonS(vec3 P){vec4 q=uMoonVP*vec4(P,1.);vec3 c=q.xyz*.5+.5;if(c.x<0.||c.y<0.||c.x>1.||c.y>1.)return 1.;c.z-=.0012;
  float s=texture(uMoonS,c);if(uQ.z>1.5){float o=uQ.w;s=s*.36+(texture(uMoonS,c+vec3(o,0,0))+texture(uMoonS,c-vec3(o,0,0))+texture(uMoonS,c+vec3(0,o,0))+texture(uMoonS,c-vec3(0,o,0)))*.16;}return s;}
void addL(inout vec3 D,inout vec3 Sp,vec3 col,float I,vec3 N,vec3 V,vec3 P,vec3 Lp,float gk,float gx){
  vec3 Lv=normalize(Lp-P);float nd=max(dot(N,Lv)*.72+.28,0.);D+=col*(I*nd);vec3 hv=normalize(Lv+V);Sp+=col*(I*pow(max(dot(N,hv),0.),gx)*gk);}
void lights(vec3 P,vec3 N,vec3 V,float gl,out vec3 D,out vec3 Sp){
  D=vec3(0.);Sp=vec3(0.);float gx=mix(6.,160.,gl*gl),gk=gl*(.12+gl*1.7);vec3 Ps=P+N*.4;
  if(uLanH.w>0.){vec3 L=uLanP.xyz;vec2 d=P.xz-L.xz;float dh=length(d),I=0.,R=uLanP.w;
    if(dh<R){float f=1.-dh*dh/(R*R);I+=f*f*(1.+.9/(1.+dh*.2))*uLanI.x;}
    if(uLanI.y>0.&&dh<uBeam.z&&dh>.4){float cs=dot(d,uLanI.zw)/dh,lo=uBeam.x-uBeam.y;if(cs>lo){float f=1.-dh*dh/(uBeam.z*uBeam.z),el=(P.y-L.y)/dh;
      I+=uLanI.y*f*f*smoothstep(lo,uBeam.x+uBeam.y,cs)*smoothstep(0.,3.,dh)*smoothstep(1.1,.35,el);}}
    if(I>.003){I*=hzS(L,uLanH.xyz,Ps,1.1,uQ.x);addL(D,Sp,C_LAN,I,N,V,P,L+vec3(0.,7.,0.),gk,gx);}}
  for(int i=0;i<MAXL;i++){if(i>=uNL)break;vec4 Lm=uLmP[i];vec2 d=P.xz-Lm.xz;float dh2=dot(d,d),R2=Lm.w*Lm.w;if(dh2>=R2)continue;
    float dh=sqrt(dh2),f=1.-dh2/R2,I=f*f*(1.+1.6/(1.+dh*.12))*uLmI[i].x;if(I<.003)continue;
    if(uQ.y>0.)I*=hzS(Lm.xyz,uLmI[i].yzw,Ps,1.7,1.);addL(D,Sp,C_LAMP,I,N,V,P,Lm.xyz,gk,gx);}
  for(int i=0;i<3;i++){if(i>=uNF)break;vec4 F=uFlP[i];vec2 d=P.xz-F.xz;float dh=length(d);if(dh>=F.w)continue;
    float I=uFlI[i].x*(1.-dh/F.w)*(1.+2./(1.+dh*.3));I*=hzS(F.xyz,uFlI[i].yzw,Ps,2.4,1.);addL(D,Sp,C_FL,I,N,V,P,F.xyz+vec3(0.,5.,0.),gk,gx);}
  if(uGrI.x>0.){vec2 d=P.xz-uGrP.xz;float dh=length(d);if(dh<uGrP.w&&dh>uGrH.w){float cs=dot(d,uGrI.yz)/dh;if(cs>uGrI.w-.05){
    float I=uGrI.x*smoothstep(uGrI.w-.05,uGrI.w+.05,cs)*(1.-dh/uGrP.w*.55);I*=hzS(uGrP.xyz,uGrH.xyz,Ps,3.,1.);addL(D,Sp,C_GR,I,N,V,P,uGrP.xyz,gk,gx);}}}
  float ms=moonS(Ps),md=max(dot(N,uMoonD),0.);D+=uMoonC*(md*ms);vec3 hv=normalize(uMoonD+V);Sp+=uMoonC*(pow(max(dot(N,hv),0.),gx)*gk*ms*1.2);
  D+=mix(uGnd,uSky,N.y*.5+.5);}
`;
/* ---------- solid things: the town, the lamplighter, his lantern, the pickups ---------- */
const VS_WORLD=`layout(location=0) in vec3 aPos;layout(location=1) in vec4 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in vec4 aMat;
uniform mat4 uVP,uM;out vec3 vP;out vec3 vN;out vec4 vC;out vec4 vM;invariant gl_Position;
void main(){vec4 w=uM*vec4(aPos,1.);vP=w.xyz;vN=mat3(uM)*aNrm.xyz;vC=aCol;vM=aMat;gl_Position=uVP*w;}`;
/* the depth pre-pass: the town's depth first, so the costly lighting runs once per pixel */
const FS_PRE=GL_COMMON+`in vec3 vP;in vec3 vN;in vec4 vC;in vec4 vM;out vec4 o;uniform vec4 uCut;
void main(){o=vec4(0.);}`;
const VS_DEPTH=`layout(location=0) in vec3 aPos;uniform mat4 uVP,uM;void main(){gl_Position=uVP*(uM*vec4(aPos,1.));}`;
const FS_DEPTH=`out vec4 o;void main(){o=vec4(1.);}`;
const FS_WORLD=GL_COMMON+GL_LIGHT+`
in vec3 vP;in vec3 vN;in vec4 vC;in vec4 vM;out vec4 o;
uniform vec3 uCam;uniform vec4 uWorld;uniform sampler2D uGround;uniform sampler2D uAO;uniform vec4 uCut;
uniform vec4 uLampG[16];uniform vec3 uTint;uniform vec3 uEmis;uniform float uDawn;
void main(){
  vec3 P=vP,N=normalize(vN),V=normalize(uCam-P);int id=int(vM.x+.5);float sd=vM.z;
  /* REMAKE: no cutaway (and no discard, so the GPU can skip hidden pixels after the depth pre-pass) */
  vec3 alb=vC.rgb*vC.rgb;float gl=vC.a,aa=clamp(1.-length(fwidth(P))*.5,0.,1.);vec3 em=vec3(0.);float wet=uWorld.z;
  if(id==1){/* the ground: cobbles in running bond, four dots by three as on the panel; grass, dirt, sand */
    vec2 q=P.xz,wq=q+(vec2(vn(q*.3),vn(q*.3+17.))-.5)*2.4;vec4 w=texture(uGround,wq/uWorld.xy);w/=max(w.r+w.g+w.b+w.a,.001);
    float row=floor(q.y/3.),off=mod(row,2.)*2.,sx=floor((q.x+off)/4.);vec2 lc=vec2(fract((q.x+off)/4.)*4.,fract(q.y/3.)*3.),e2=min(lc,vec2(4.,3.)-lc);float e=min(e2.x,e2.y);
    float hs=h21(vec2(sx,row)),st=mix(.6,smoothstep(.08,.4,e),aa);
    vec3 cob=mix(vec3(.035,.032,.03),vec3(.22,.2,.18)*(.6+.75*hs)*(.8+.4*vn(q*1.9)),st);
    float t=clamp(e/.75,0.,1.),sl=(1.-t)*1.3*aa*w.r;vec2 gd=e2.x<e2.y?vec2(lc.x<2.?1.:-1.,0.):vec2(0.,lc.y<1.5?1.:-1.);
    float gn=fbm(q*.45);vec3 gr=vec3(.055,.09,.035)*(.55+.9*gn)+vec3(.04,.05,.015)*step(.84,h21(floor(q*vec2(2.,1.)+gn*3.)));
    vec3 dt=vec3(.15,.115,.08)*(.65+.7*fbm(q*.6+3.));vec3 sa=vec3(.2,.17,.12)*(.84+.26*vn(q*.8))*(.93+.07*sin(q.x*.9+q.y*.4+vn(q*.2)*4.));
    alb=cob*w.r+gr*w.g+dt*w.b+sa*w.a;gl=.16*w.r*st+.05+.04*w.a;
    N=normalize(vec3(-gd.x*sl,1.,-gd.y*sl)+vec3(vn(q*2.)-.5,0.,vn(q*2.+5.)-.5)*.35*(w.g+w.b+w.a*.5));
    if(wet>0.){float pud=smoothstep(.52,.66,fbm(q*.055+vec2(3.,7.)))*(w.r+w.b);gl=mix(gl,.55,(w.r+w.b)*.7);gl=mix(gl,1.,pud);alb*=1.-.4*pud-.2*w.r;N=normalize(mix(N,vec3(0.,1.,0.),pud*.9));}}
  else if(id==2){/* plaster walls: windows spaced along each wall from its own start, a door, timber frames, a plinth */
    float hw=vM.y,v=P.y,ph=h21(vec2(sd,1.7));vec4 cr=floor(vC*255.+.5);float u0=cr.r+cr.g*256.-64.,L=max(cr.b+cr.a*256.,1.);
    bool xf=abs(N.x)>abs(N.z);float ux=xf?P.z:P.x;int face=xf?(N.x>0.?0:1):(N.z>0.?2:3),isd=int(sd+.5);
    vec3 base=ph<.2?vec3(.36,.31,.25):ph<.4?vec3(.30,.27,.24):ph<.6?vec3(.34,.25,.17):ph<.8?vec3(.24,.25,.27):vec3(.32,.2,.15);
    base*=.8+.4*fbm(vec2(ux,v)*.3+sd);base*=.88+.12*smoothstep(0.,6.,v);alb=base*base*1.6;gl=.05+wet*.05;
    float n=max(1.,floor(L/10.)),spc=L/n,rel=ux-u0,ci=clamp(floor(rel/spc),0.,n-1.),fu=rel-ci*spc-spc*.5;int iw=int(ci);
    float fl=v<18.?0.:1.,fv=v-(fl<.5?7.:21.);int dI=ihf(isd,face,5)<.6?int(ih(isd,face,3)%uint(n)):-1;
    bool tim=h21(vec2(sd,7.))>.6;
    if(tim&&v>2.5&&v<hw-1.&&(abs(v-18.)<.7||abs(abs(fu)-spc*.5)<.45||(v>18.7&&abs(fract((fu+v*.8)/10.)-.5)<.04))){alb=vec3(.035,.025,.02);gl=.08;}
    bool door=fl<.5&&iw==dI,hasW=!door&&ihf(isd,face*8+iw,int(fl))>.25&&(fl<.5||hw>=31.)&&v<hw-1.;
    if(hasW&&abs(fu)<2.4&&fv>-.4&&fv<8.4){
      if(abs(fu)<2.&&fv>0.&&fv<8.){bool bar=abs(fu)<.12||abs(fv-4.)<.12;alb=bar?vec3(.03,.025,.02):vec3(.012,.014,.017);gl=bar?.1:.95;
        N=normalize(N+vec3(vn(P.xz*3.)-.5,0.,vn(P.zx*3.)-.5)*.04);float lw=ihf(isd*3+iw,int(fl),face+17);if(lw>.9&&!bar){vec2 cu=vec2(fu,fv-4.);em=vec3(1.,.52,.2)*(.035+.015*sin(uWorld.w*2.3+ci))*(.6+.4*smoothstep(2.6,0.,length(cu*vec2(1.,.6))));}}
      else{alb=vec3(.06,.045,.035);gl=.1;}}
    else if(door&&abs(fu)<2.35&&v<11.4){float r=length(vec2(fu,max(v-9.,0.)));
      if(r<2.3){alb=vec3(.075,.045,.03)*(.75+.5*vn(vec2(fu*4.,v*.3)));gl=.14;if(abs(fu)<.06||abs(fract(v/2.8)-.5)<.03)alb*=.45;}}
    if(v<2.4){alb=vec3(.09,.085,.08)*(.7+.6*fbm(vec2(ux,v)*.8));gl=.1+wet*.2;}}
  else if(id==3){/* roof tiles in rows, clay or slate, with moss */
    vec3 rc=h21(vec2(sd,3.))>.42?vec3(.17,.065,.042):vec3(.05,.055,.065);float u=abs(N.x)>abs(N.z)?P.z:P.x,row=floor(P.y/1.25),cu=floor(u/1.7+row*.5),tu=fract(u/1.7+row*.5),band=fract(P.y/1.25);
    alb=rc*(.7+.6*h21(vec2(cu,row)))*(.6+.4*smoothstep(0.,.4,band));alb*=1.-.6*(1.-smoothstep(0.,.07,tu))*aa;
    alb=mix(alb,vec3(.03,.045,.02),smoothstep(.62,.82,fbm(P.xz*.13+sd))*.7);gl=.07+wet*.16;N=normalize(N+vec3(0.,(band-.5)*.3*aa,0.));}
  else if(id==4){/* planks */
    bool ax=sd<.5;float along=ax?P.x:P.z,across=ax?P.z:P.x;if(abs(N.y)<.5)across=P.y;float pk=floor(across/1.55),fq=fract(across/1.55);
    alb*=(.65+.55*h21(vec2(pk,3.)))*(.82+.36*vn(vec2(along*.35,pk*9.)))*mix(1.,mix(.3,1.,smoothstep(0.,.1,fq)*smoothstep(1.,.9,fq)),aa);gl=.06+wet*.3;}
  else if(id==5){alb*=.7+.6*fbm(P.xz*.6+P.y*.35);gl=.12+wet*.3;}
  else if(id==6){alb*=.8+.4*vn(P.xz*3.+P.y);}
  else if(id==7){float n=fbm(P.xz*.8+P.y*.6+sd);alb*=.45+1.1*n;gl=.04;N=normalize(N+(vec3(vn(P.xz*1.3),vn(P.zy*1.3),vn(P.yx*1.3))-.5)*.9);}
  else if(id==8){alb*=.75+.35*vn(P.xz*1.5+P.y*.7);}
  else if(id==9){float n=fbm(P.xz*.5+P.y*.4);alb*=.6+.7*n;alb*=1.-.6*smoothstep(.02,0.,abs(vn(P.xz*.9+P.y*.5)-.5));gl=.08+wet*.3;}
  else if(id==10){float b=mod(floor((P.y-3.)/16.),2.);alb=b>.5?vec3(.16,.012,.01):vec3(.6,.58,.54);alb*=.85+.3*fbm(P.xz*.4+P.y*.2);gl=.25;
    float a=atan(P.z-uGrP.z,P.x-uGrP.x);if(fract(P.y/23.)>.86&&abs(fract(a*1.2732)-.5)<.12&&P.y<80.){alb=vec3(.01);gl=.9;}}
  else if(id==11){float s=step(.5,fract(P.x/1.6));float ph=h21(vec2(sd,9.));vec3 c1=ph<.33?vec3(.4,.05,.04):ph<.66?vec3(.06,.2,.08):vec3(.05,.1,.3);alb=mix(c1,vec3(.55,.5,.4),s)*(.85+.3*vn(P.xz*2.));gl=.03;}
  else if(id==12){alb=vec3(.008,.01,.01);gl=.5;}
  else if(id==13){vec4 g=uLampG[int(sd+.5)];alb=vec3(.02,.022,.025);gl=.95;em=g.rgb+vec3(1.,.5,.2)*g.w*(.7+.3*sin(uWorld.w*5.+sd));}
  else if(id==14){vec2 q=vec2(abs(N.x)>.5?P.z:P.x,P.y);float r=floor(q.y/.9);float bx=fract((q.x+mod(r,2.)*.6)/1.2),by=fract(q.y/.9);
    alb*=(.7+.5*h21(vec2(floor((q.x+mod(r,2.)*.6)/1.2),r)))*mix(1.,.35,(1.-smoothstep(0.,.08,bx)*smoothstep(0.,.1,by))*aa);}
  else if(id==15){vec2 q=fract(P.xz*.7);float bar=step(.55,q.x);alb=mix(vec3(.004),alb,bar);gl=bar*.6;}
  else if(id==16){alb*=.55+.9*vn(vec2(atan(P.z,P.x)*6.,P.y*.25)+sd);}
  else if(id==17){alb*=.85+.3*vn(P.xz*2.+P.y);gl=.6;}
  alb*=uTint;
  vec3 D,Sp;lights(P,N,V,gl,D,Sp);
  float ao=vM.w/255.;if(P.y<14.){float a=texture(uAO,P.xz/uWorld.xy).r;ao*=1.-.6*a*(1.-smoothstep(0.,14.,P.y))*(id==1?1.:.6);}
  o=vec4((alb*D+Sp)*ao+em+uEmis,1.);}`;
/* ---------- darkness that walks: the shades, the snuffers' robes, the Long Night ---------- */
const VS_VOID=`layout(location=0) in vec3 aPos;layout(location=1) in vec4 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in vec4 aMat;
uniform mat4 uVP,uM;uniform vec4 uVw;out vec3 vP;out vec3 vN;out float vH;
void main(){vec3 p=aPos;float k=1.-smoothstep(0.,uVw.w*.75,p.y);float t=uVw.x,sd=uVw.y;
  float n=sin(p.x*.9+t*2.3+sd)*sin(p.y*.55-t*1.7+sd*.3)*sin(p.z*.8+t*1.4+sd*1.7);p+=aNrm.xyz*n*uVw.z*(.35+.9*k);
  p.xz+=vec2(sin(t*2.1+p.y*.9+sd),cos(t*1.6+p.y*.7+sd*2.))*uVw.z*.5*k*k;vH=aPos.y/uVw.w;
  vec4 w=uM*vec4(p,1.);vP=w.xyz;vN=mat3(uM)*aNrm.xyz;gl_Position=uVP*w;}`;
const FS_VOID=GL_COMMON+`in vec3 vP;in vec3 vN;in float vH;out vec4 o;uniform vec3 uCam;uniform vec4 uVoid;uniform vec4 uVw;uniform vec3 uVoidC;
void main(){if(vH>uVoid.z+.02)discard;vec3 V=normalize(uCam-vP),N=normalize(vN);float fr=pow(1.-abs(dot(N,V)),2.2);
  vec3 c=vec3(.0012,.001,.002)+fr*mix(vec3(.004,.003,.01),vec3(.05,.05,.07),uVoid.x)+uVoidC*fr;
  float fl=vn(vP.xz*.9+vec2(vP.y*.6,uVw.x*9.));c+=pow(fr,.7)*uVoid.y*vec3(2.6,.95,.26)*(.35+.9*fl*fl);
  c+=smoothstep(uVoid.z-.12,uVoid.z+.02,vH)*vec3(.5,.18,.05)*uVoid.y*2.;
  /* alpha carries how much of the darkness survives the glow and the mist (the finish multiplies it in) */
  o=vec4(c,clamp(.03+fr*.32+uVoid.x*.22+uVoid.y*.55,0.,1.));}`;
/* ---------- water: dark, rippled, and full of reflected lamps ---------- */
const FS_WATER=GL_COMMON+GL_LIGHT+`in vec3 vP;in vec3 vN;in vec4 vC;in vec4 vM;out vec4 o;uniform vec3 uCam;uniform vec3 uHor;uniform vec4 uWorld;uniform sampler2D uShore;uniform vec4 uLampG[16];
/* the slope of the water: a handful of travelling waves at odd angles, plus a little fine chop */
vec2 rip(vec2 q,float t){vec2 g=vec2(0.);float ph=vn(q*.03)*6.;
  for(int i=0;i<6;i++){float fi=float(i),a=fi*2.39+.6,k=.16+fi*.11;vec2 d=vec2(cos(a),sin(a));g+=d*k*cos(dot(d,q)*k-t*(1.1+fi*.37)+ph+fi*1.7)*(1.1-fi*.12);}
  return g*1.4;}
void main(){vec3 P=vP,V=normalize(uCam-P);float t=uWorld.w;vec2 g=rip(P.xz,t);
  if(uWorld.z>0.){vec2 cell=floor(P.xz/5.);vec2 f=fract(P.xz/5.)-.5;float ph=fract(t*.9+h21(cell));float r=length(f+ (vec2(h21(cell+3.),h21(cell+7.))-.5)*.4)*5.;g+=normalize(f+1e-4)*sin((r-ph*4.)*6.)*smoothstep(1.2,0.,abs(r-ph*4.))*(1.-ph)*.9;}
  vec3 N=normalize(vec3(-g.x*.14,1.,-g.y*.14));float sh=texture(uShore,P.xz/uWorld.xy).r;if(P.x<0.||P.z<0.||P.x>uWorld.x||P.z>uWorld.y)sh=0.;
  float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);vec3 c=mix(vec3(.004,.008,.01),vec3(.012,.02,.02),sh)+uSky*fr*3.;
  /* every light leaves a broken column on the water */
  vec3 R=reflect(-V,N),Sp=vec3(0.),D=vec3(0.);
  if(uLanH.w>0.){vec3 L=uLanP.xyz;float I=uLanI.x*.6+uLanI.y*.8;vec3 l=normalize(L-P);Sp+=C_LAN*I*pow(max(dot(R,l),0.),220.)*28./(1.+length(L-P)*.02);
    vec2 d=P.xz-L.xz;float dh=length(d);if(uLanI.y>0.&&dh<uBeam.z){float cs=dot(d,uLanI.zw)/max(dh,.1);D+=C_LAN*uLanI.y*smoothstep(uBeam.x-uBeam.y,uBeam.x+uBeam.y,cs)*(1.-dh/uBeam.z)*.035;}}
  for(int i=0;i<MAXL;i++){if(i>=uNL)break;vec4 Lm=uLmP[i];vec3 l=Lm.xyz-P;float dl=length(l);if(dl>150.)continue;l/=dl;float I=uLmI[i].x;Sp+=C_LAMP*I*pow(max(dot(R,l),0.),260.)*40./(1.+dl*.015);}
  for(int i=0;i<3;i++){if(i>=uNF)break;vec3 l=normalize(uFlP[i].xyz-P);Sp+=C_FL*uFlI[i].x*pow(max(dot(R,l),0.),120.)*14.;}
  if(uGrI.x>0.){vec3 l=normalize(uGrP.xyz-P);Sp+=C_GR*uGrI.x*pow(max(dot(R,l),0.),90.)*10.;vec2 d=P.xz-uGrP.xz;float dh=length(d);float cs=dot(d,uGrI.yz)/max(dh,.1);D+=C_GR*uGrI.x*smoothstep(uGrI.w-.05,uGrI.w+.05,cs)*.05*(1.-smoothstep(60.,200.,dh));}
  Sp+=uMoonC*pow(max(dot(R,uMoonD),0.),180.)*60.;
  c=mix(c,vec3(.02,.04,.038),smoothstep(.15,.6,sh)*.8);
  float fn=vn(P.xz*.7+t*.3),foam=smoothstep(.32,.5,sh+fn*.12)*smoothstep(.85,.6,sh+fn*.1)*(.55+.45*vn(P.xz*1.9-t*.5))+smoothstep(.6,.9,sh)*.5*fn;
  vec3 D2,S2;lights(P,vec3(0.,1.,0.),V,0.,D2,S2);
  c+=Sp+D+foam*(.45*D2+uSky*1.2+uMoonC*.25);c=mix(c,uHor,smoothstep(220.,1500.,length(uCam-P)));o=vec4(c,1.);}`;
/* ---------- sprites: glows, embers, smoke, eyes, moths, ground pools, the kindling ring ---------- */
const VS_SPR=`layout(location=4) in vec4 iA;layout(location=5) in vec4 iB;layout(location=6) in vec4 iC;
uniform mat4 uVP;uniform vec3 uCR,uCU;out vec2 vUV;out vec4 vCol;out vec4 vPrm;
void main(){int id=gl_VertexID%6;vec2 c=vec2((id==1||id==2||id==4)?1.:-1.,(id==2||id==4||id==5)?1.:-1.);
  float r=abs(iC.x-7.)<.5?0.:iC.z;vec2 cr=vec2(c.x*cos(r)-c.y*sin(r),c.x*sin(r)+c.y*cos(r));vec3 P=vec3(iA.x,iA.z,iA.y);vec2 sz=vec2(iA.w*iC.w,iA.w);vec3 w;
  if(iC.y<.5)w=P+uCR*cr.x*sz.x+uCU*cr.y*sz.y;else if(iC.y<1.5)w=P+vec3(cr.x*sz.x,0.,cr.y*sz.y);else{vec3 rr=normalize(vec3(uCR.x,0.,uCR.z));w=P+rr*c.x*sz.x+vec3(0.,c.y*sz.y,0.);}
  vUV=c;vCol=iB;vPrm=iC;gl_Position=uVP*vec4(w,1.);}`;
const FS_SPR=GL_COMMON+`in vec2 vUV;in vec4 vCol;in vec4 vPrm;out vec4 o;uniform float uT;uniform int uBatch;
void main(){vec2 u=vUV;float r2=dot(u,u),a=0.;int s=int(vPrm.x+.5);
  if(s==0)a=exp(-r2*4.5)*(1.-smoothstep(.8,1.,r2));
  else if(s==1)a=smoothstep(1.,.45,sqrt(r2));
  else if(s==2)a=smoothstep(.16,0.,abs(sqrt(r2)-.78));
  else if(s==3)a=smoothstep(1.,.15,sqrt(r2))*(.55+.45*vn(u*2.3+vPrm.z*9.));
  else if(s==4)a=exp(-u.x*u.x*7.)*(1.-u.y*u.y);
  else if(s==5){float y=u.y*.5+.5;float w=mix(.62,.0,y)*(1.-pow(1.-y,6.));a=smoothstep(w,w*.3,abs(u.x))*smoothstep(0.,.08,y);}
  else if(s==6)a=exp(-r2*9.)+exp(-abs(u.y)*28.)*exp(-u.x*u.x*3.)*.6+exp(-abs(u.x)*28.)*exp(-u.y*u.y*3.)*.6;
  else if(s==7){float ang=fract(atan(u.x,u.y)*.15915494+1.);float k=floor(ang*16.);float cen=(k+.5)/16.;vec2 dp=vec2(sin(cen*6.2832),cos(cen*6.2832))*.8;
    a=smoothstep(.13,.07,length(u-dp))*(k<vPrm.z*16.?1.:.16);}
  else if(s==8){vec2 q=vec2(abs(u.x),u.y);float f=.55+.45*sin(uT*38.+vPrm.z*20.);a=smoothstep(1.,.6,length((q-vec2(.45*f,.05))/vec2(.55*f,.42)))+smoothstep(.25,.1,length(u));}
  else if(s==9){a=smoothstep(1.,.3,length(u/vec2(1.,.55)));}
  else if(s==10){a=smoothstep(1.,0.,abs(u.x))*smoothstep(1.,.2,abs(u.y));}
  o=vec4(vCol.rgb*vCol.a*a,vCol.a*a);if(uBatch>=2)o.a=s==9?min(1.,a*vCol.a):0.;}`;
/* ---------- rain: streaks that catch whatever light is near ---------- */
const VS_RAIN=`uniform mat4 uVP;uniform vec3 uCR;uniform vec4 uRain;out vec2 vUV;out vec3 vW;
float hh(float n){return fract(sin(n*127.1)*43758.5453);}
void main(){int id=gl_VertexID%6;vec2 c=vec2((id==1||id==2||id==4)?1.:-1.,(id==2||id==4||id==5)?1.:-1.);float n=float(gl_InstanceID);
  float B=uRain.w,x=uRain.x+(hh(n)-.5)*2.*B,z=uRain.y+(hh(n+.37)-.5)*2.*B*.8,H=110.,y=mod(hh(n+.71)*H-uRain.z*95.,H);
  vec3 p=vec3(x+y*.12,y,z+y*.04);vec3 dir=normalize(vec3(.12,1.,.04));vec3 rr=normalize(cross(dir,normalize(vec3(uCR.z,0.,-uCR.x)+vec3(0.,.001,0.))));
  vec3 w=p+dir*c.y*2.6+normalize(vec3(uCR.x,0.,uCR.z))*c.x*.13;vUV=c;vW=w;gl_Position=uVP*vec4(w,1.);}`;
const FS_RAIN=GL_COMMON+GL_LIGHT+`in vec2 vUV;in vec3 vW;out vec4 o;uniform vec3 uCamP;
void main(){vec3 D,Sp;lights(vW,normalize(vec3(.3,.2,.9)),vec3(0.,0.,1.),0.,D,Sp);float a=exp(-vUV.x*vUV.x*3.)*(1.-vUV.y*vUV.y)*smoothstep(7.,24.,length(vW-uCamP));o=vec4(D*a*.9,0.);}`;
/* ---------- the night air: mist that the beam, the lamps and the flares light up ---------- */
const FS_FOG=GL_COMMON+GL_LIGHT+`out vec4 o;uniform sampler2D uDepth;uniform sampler2D uFogN;uniform mat4 uInvVP;uniform vec4 uFog;uniform vec3 uFogC;uniform vec2 uRes;uniform float uSteps;uniform vec4 uWorld;
void main(){vec2 uv=gl_FragCoord.xy/uRes;float dz=texture(uDepth,uv).r;
  vec4 a=uInvVP*vec4(uv*2.-1.,-1.,1.);a/=a.w;vec4 b=uInvVP*vec4(uv*2.-1.,dz*2.-1.,1.);b/=b.w;
  vec3 ro=a.xyz,rd=b.xyz-a.xyz;float tm=length(rd);rd/=tm;float top=uFog.y;
  float t0=0.,t1=tm;if(rd.y<0.){t0=max(0.,(top-ro.y)/rd.y);t1=min(tm,(-2.-ro.y)/rd.y);}else if(ro.y>top){o=vec4(0.,0.,0.,1.);return;}
  t1=min(t1,t0+260.);if(t1<=t0){o=vec4(0.,0.,0.,1.);return;}
  int N=int(uSteps);float dt=(t1-t0)/uSteps,j=ign(gl_FragCoord.xy+fract(uFog.z*7.)*61.);vec3 acc=vec3(0.);float T=1.,drift=uFog.z;
  for(int i=0;i<24;i++){if(i>=N)break;float t=t0+(float(i)+j)*dt;vec3 S=ro+rd*t;
    float nz=texture(uFogN,S.xz*.0058+vec2(drift*.012,drift*.006)).r*.65+texture(uFogN,S.xz*.0115-vec2(drift*.008,-drift*.005)).r*.35;
    float den0=uFog.x*(.25+1.1*nz),den=den0*exp(-max(S.y,0.)/uFog.w);
    vec3 L=uFogC;
    if(uLanH.w>0.){vec3 Lp=uLanP.xyz;vec2 d=S.xz-Lp.xz;float dh=length(d),I=0.;float d3=length(S-Lp);I+=uLanI.x*3.4/(1.+d3*d3*.05);
      if(uLanI.y>0.&&dh<uBeam.z&&dh>.5){float cs=dot(d,uLanI.zw)/dh,lo=uBeam.x-uBeam.y;if(cs>lo){float f=1.-dh/uBeam.z,el=(S.y-Lp.y)/dh;
        I+=uLanI.y*5.*f*smoothstep(lo,uBeam.x+uBeam.y,cs)*smoothstep(.62,.0,abs(el+.04))*(1.+1.6*smoothstep(.5,1.,dot(-normalize(rd.xz),d/dh)));}}
      if(I>.004)L+=C_LAN*I*hzS(Lp,uLanH.xyz,S,1.1,1.);}
    for(int k=0;k<MAXL;k++){if(k>=uNL)break;vec4 Lm=uLmP[k];vec3 dv=S-Lm.xyz;float d2=dot(dv,dv);if(d2>Lm.w*Lm.w*1.4)continue;
      float I=uLmI[k].x*(3./(1.+d2*.035)+.1*max(0.,1.-d2/(Lm.w*Lm.w*1.4)));if(uQ.y>1.5)I*=hzS(Lm.xyz,uLmI[k].yzw,S,1.7,1.);L+=C_LAMP*I;}
    for(int k=0;k<3;k++){if(k>=uNF)break;vec4 F=uFlP[k];vec3 dv=S-F.xyz;float d2=dot(dv,dv);if(d2>F.w*F.w)continue;L+=C_FL*uFlI[k].x*(3./(1.+d2*.01)+.2)*hzS(F.xyz,uFlI[k].yzw,S,2.4,1.);}
    if(uGrI.x>0.){vec3 dv=S-uGrP.xyz;float dh=length(dv.xz);if(dh<uGrP.w*1.15&&dh>uGrH.w){float cs=dot(dv.xz,uGrI.yz)/dh;float ce=uGrI.w-.02;
      if(cs>ce-.04){float el=dv.y/dh;float want=-uGrP.y/(uGrP.w*.8);acc+=T*den0*.7*dt*C_GR*uGrI.x*3.*smoothstep(ce-.04,ce+.05,cs)*smoothstep(.18,0.,abs(el-want))*(1.-dh/(uGrP.w*1.15));}}}
    acc+=T*den*L*dt;T*=exp(-den*dt*.55);}
  o=vec4(acc,T);}`;

/* ---------- REMAKE: the night sky. Stars, the moon and its halo, slow clouds, the roofs and spires of the rest of
   the town on the horizon, and at dawn a sunrise in the east ---------- */
const FS_SKY=GL_COMMON+`in vec2 vT;out vec4 o;uniform mat4 uInvVP;uniform vec3 uCamP;uniform vec3 uMoonD;uniform vec3 uSunD;uniform vec4 uSk;
void main(){vec4 a=uInvVP*vec4(vT*2.-1.,1.,1.);vec3 d=normalize(a.xyz/a.w-uCamP);float el=d.y,t=uSk.x,dawn=uSk.y,mk=uSk.z;
  vec3 c=mix(vec3(.016,.021,.036),vec3(.0022,.0035,.010),smoothstep(-.02,.6,el));
  c+=vec3(.045,.026,.013)*exp(-max(el,0.)*13.)*(1.-uSk.w*.7);
  if(el>0.){vec3 q=d*230.;vec3 ci=floor(q);float hs=fract(sin(dot(ci,vec3(12.9898,78.233,37.719)))*43758.5453);
    if(hs>.9962){vec3 f=fract(q)-.5;float s=smoothstep(.24,0.,length(f))*(.55+.45*sin(t*2.3+hs*97.));c+=vec3(.82,.86,1.)*s*(hs-.9962)*240.*smoothstep(0.,.22,el)*(1.-dawn);}}
  float md=dot(d,uMoonD),ang=acos(clamp(md,-1.,1.));
  vec3 mt=normalize(cross(uMoonD,vec3(0.,1.,0.))),mb=cross(mt,uMoonD);vec2 mp=vec2(dot(d,mt),dot(d,mb))/.032;
  float disc=smoothstep(1.,.93,length(mp));c+=vec3(1.,.96,.88)*disc*(1.25-.45*fbm(mp*2.3+4.))*1.4*mk*(1.-dawn*.6)*(.75+.25*sqrt(max(0.,1.-dot(mp,mp))));
  c+=vec3(.22,.27,.42)*exp(-ang*7.)*.2*mk+vec3(.4,.45,.6)*exp(-ang*34.)*.3*mk;
  if(el>.005){vec2 p=d.xz/el*520.;float n=fbm(p*.0011+vec2(t*.0045,t*.002))*.7+fbm(p*.0031-vec2(t*.003,0.))*.3;float cl=smoothstep(.46,.8,n);
    vec3 cc=mix(vec3(.010,.012,.019),vec3(.07,.075,.095),exp(-ang*2.6)*mk)+vec3(.32,.15,.07)*dawn;c=mix(c,cc,cl*smoothstep(.005,.14,el)*.88);}
  if(dawn>0.){float sd=dot(d,uSunD);vec3 dc=mix(vec3(.42,.2,.1),vec3(.12,.2,.38),smoothstep(-.05,.5,el));c=mix(c,dc*.75,dawn*.8);
    c+=vec3(1.,.5,.22)*exp(-max(1.-sd,0.)*16.)*dawn*.7;c+=vec3(1.,.8,.55)*smoothstep(.9986,.9993,sd)*dawn*5.;}
  if(uSk.w<.5){float az=atan(d.z,d.x),b=floor(az*44.),fb=fract(az*44.);float hh=.012+.03*fract(sin(b*91.7)*4373.1),spire=step(.92,fract(sin(b*13.3)*913.7));
    float hgt=hh+spire*.07*max(0.,1.-abs(fb-.5)*4.)+.004*step(.5,fract(sin(b*7.1)*43.7))*step(.3,abs(fb-.5));
    if(el<hgt){c=vec3(.0035,.0045,.008)+dawn*vec3(.05,.04,.05);float win=step(.975,h21(floor(vec2(az*1100.,el*1100.))))*step(.006,hgt-el);c+=vec3(1.,.58,.24)*win*.22*(1.-dawn);}}
  o=vec4(c,1.);}`;
/* ---------- the glow: a bright pass, then a ladder of blurs down and back up ---------- */
const VS_FS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FS_BRIGHT=`in vec2 vT;out vec4 o;uniform sampler2D uScene;uniform sampler2D uFogT;uniform vec2 uPx;uniform float uThr;
vec3 s(vec2 t){vec4 f=texture(uFogT,t),c=texture(uScene,t);return (c.rgb*f.a+f.rgb)*clamp(c.a,0.,1.);}
void main(){vec3 c=(s(vT+uPx*vec2(-1,-1))+s(vT+uPx*vec2(1,-1))+s(vT+uPx*vec2(-1,1))+s(vT+uPx*vec2(1,1)))*.25;float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.)/max(l,1e-4);o=vec4(min(c,vec3(40.)),1.);}`;
const FS_DOWN=`in vec2 vT;out vec4 o;uniform sampler2D uTex;uniform vec2 uPx;
void main(){vec3 c=texture(uTex,vT).rgb*4.+texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;o=vec4(c/8.,1.);}`;
const FS_UP=`in vec2 vT;out vec4 o;uniform sampler2D uTex;uniform vec2 uPx;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-2,0)).rgb+texture(uTex,vT+uPx*vec2(2,0)).rgb+texture(uTex,vT+uPx*vec2(0,-2)).rgb+texture(uTex,vT+uPx*vec2(0,2)).rgb
  +(texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb)*2.;o=vec4(c/12.,1.);}`;
/* ---------- the finish: exposure, filmic curve, a cold-warm grade, vignette, grain ---------- */
const FS_COMP=GL_COMMON+`in vec2 vT;out vec4 o;uniform sampler2D uScene;uniform sampler2D uFogT;uniform sampler2D uBloom;uniform vec4 uC1;uniform vec4 uC2;uniform vec2 uRes;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec4 f=texture(uFogT,vT),sc=texture(uScene,vT);vec3 c=sc.rgb*f.a+f.rgb;c+=texture(uBloom,vT).rgb*uC1.y;c*=mix(1.,clamp(sc.a,0.,1.),.94);
  c*=uC1.x;c=max(c,vec3(0.));
  vec2 q=vT-.5;float vg=1.-dot(q*vec2(1.,.8),q*vec2(1.,.8))*(1.15+uC2.y*2.);c*=max(vg,0.);
  c+=vec3(.9,.12,.05)*uC2.x*smoothstep(.12,.5,length(q))*.5;
  c=aces(c);c=pow(c,vec3(1./2.2));
  float lu=dot(c,vec3(.299,.587,.114));c=mix(c,vec3(lu),uC2.z*.7);
  c=mix(c,c*vec3(.92,.97,1.08)+vec3(.0,.004,.012),1.-smoothstep(.0,.4,lu));
  c=mix(c,vec3(1.,.9,.75),uC1.z);c*=1.-uC1.w;
  c+=(ign(gl_FragCoord.xy+fract(uC2.w)*97.)-.5)*.022;
  o=vec4(c,1.);}`;
/* ---------- the amber dot matrix: the HUD over the picture, or the whole picture as plasma dots ---------- */
const FS_DOTS=`in vec2 vT;out vec4 o;uniform sampler2D uHud;uniform sampler2D uImg;uniform vec4 uGrid;uniform vec2 uRes;uniform float uMode;uniform vec3 uTint;uniform vec3 uHot;uniform float uFlash;
float bay(vec2 p){ivec2 i=ivec2(mod(p,4.));int k=i.y*4+i.x;int b[16]=int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);return (float(b[k])+.5)/16.-.5;}
void main(){vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);vec2 cell=(px-uGrid.zw)/uGrid.xy;vec2 id=floor(cell),f=fract(cell)-.5;vec2 G=vec2(textureSize(uHud,0));
  bool inside=id.x>=0.&&id.y>=0.&&id.x<G.x&&id.y<G.y;vec4 h=inside?texture(uHud,(id+.5)/G):vec4(0.);float lvl=h.r*255./15.,ns=h.g*255.;
  float fw=1./uGrid.x;float d=length(f),r=.43,dm=1.-smoothstep(r-fw*1.3-.03,r+fw*1.3,d),core=1.-smoothstep(0.,r*.9,d);
  float glow=0.;if(uGrid.x>3.){vec2 gc=(cell)/G;glow=texture(uHud,gc).r*255./15.;}
  if(uMode<.5){if(!inside){o=vec4(0.);return;}
    float dot_=ns>254.5?1.:0.,dk=ns>254.5?.62:ns/255.;float L=pow(lvl,2.1);vec3 c=(uTint*L+uHot*smoothstep(.62,1.,lvl)*L)*dm*(.62+.6*core)*1.6*dot_;
    c+=(vec3(.05,.02,.008)*dm)*dot_;c+=uTint*pow(glow,2.)*.22;float a=clamp(dk+dm*dot_*.3,0.,1.);o=vec4(c,a);}
  else{vec2 src=(id+.5)*uGrid.xy+uGrid.zw;vec2 sp=vec2(src.x,uRes.y-src.y)/uRes,ho=uGrid.xy*.3/uRes;vec3 im=(texture(uImg,sp).rgb*2.+texture(uImg,sp+ho).rgb+texture(uImg,sp-ho).rgb+texture(uImg,sp+vec2(ho.x,-ho.y)).rgb+texture(uImg,sp-vec2(ho.x,-ho.y)).rgb)/6.;float l=dot(im,vec3(.3,.55,.15));
    float v=clamp(floor(pow(clamp(l*1.1,0.,1.),.8)*15.+bay(id)+.5),0.,15.)/15.;if(!inside)v=0.;
    if(ns>254.5)v=lvl;else if(ns>0.)v*=1.-ns/255.;v=max(v,uFlash);
    float L=pow(v,2.1);vec3 c=(uTint*L+uHot*smoothstep(.62,1.,v)*L)*dm*(.62+.6*core)*1.6+vec3(.04,.016,.006)*dm;o=vec4(c,1.);}}`;
