in vec2 vT;out vec4 o;
uniform vec2 uRes;uniform float uTime;uniform vec3 uCam;uniform mat3 uRot;uniform float uFov;uniform int uStage;uniform float uSteps;
uniform vec3 uPA,uPF,uPP;uniform vec2 uYA,uYF,uYP;
uniform vec4 uCar[14];uniform vec4 uCarB[14];uniform int uNC;
uniform vec4 uBk;uniform vec4 uBkB;uniform vec3 uBkF;
uniform vec4 uTg;uniform vec4 uTgB;
uniform vec4 uDr[2];uniform vec4 uDrT[2];
uniform vec4 uPad[6];uniform vec4 uRamp[4];
uniform float uRain,uFogD,uWet;
uniform vec3 uN1,uN2,uN3,uFogC,uSkyA,uSkyB;
#define RW 9.0
#define PI 3.14159265
#define ZERO min(int(uTime),0)
/* ---------------- globals set by the scene function ---------------- */
float gM;vec3 gC;float gGD;vec3 gGC;bool gWantGlow;
/* ---------------- the track: a smooth curve the whole city is bent around ---------------- */
float pX(float z){return uPA.x*sin(z*uPF.x+uPP.x)+uPA.y*sin(z*uPF.y+uPP.y)+uPA.z*sin(z*uPF.z+uPP.z);}
float pY(float z){return uYA.x*sin(z*uYF.x+uYP.x)+uYA.y*sin(z*uYF.y+uYP.y);}
float h1(float n){return fract(sin(n*91.3458+.731)*47453.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
vec3 neon(float k){k=fract(k);return k<.34?uN1:k<.67?uN2:uN3;}
void glowAt(float d,vec3 c){if(gWantGlow&&d<gGD){gGD=d;gGC=c;}}
#define TAKE(dd,m,c) if(dd<d){d=dd;gM=m;gC=c;}
/* ---------------- districts (track space q: x across the road, y above it, z along it) ---------------- */
float buildings(vec3 q,float d,float hMin,float hMax,float P,float signs,bool lanterns){
  float ax=abs(q.x),sd=q.x>0.?1.:0.;
  float fz=q.z/P,cz=floor(fz);
  for(int k=ZERO;k<2;k++){
    float cell=cz+float(k)-(fract(fz)<.5?1.:0.);
    float id=cell*2.+sd,r1=h1(id),r2=h1(id+7.13),r3=h1(id+3.37),r4=h1(id+9.91);
    if(mod(cell,7.)<.5)continue;                                  /* a cross street every 7 blocks */
    float zc=(cell+.5)*P,gap=2.5+r3*5.,D=8.+r2*12.,Hh=hMin+r1*r1*(hMax-hMin);
    float glass=(hMax>50.&&r4>.8)?1.:0.;
    vec3 c=vec3(ax-14.5-D,q.y-Hh,q.z-zc);
    float b=sdBox(c,vec3(D,Hh,(P-gap)*.5));
    TAKE(b,glass>.5?4.:3.,vec3(r1,r2,r3))
    /* blade signs and shop bands glow into the fog */
    float sy=5.5+r2*5.,sl=1.6+r3*2.5;
    float sg=sdBox(vec3(ax-13.7,q.y-sy,q.z-zc+(r1-.5)*(P-gap)*.6),vec3(.12,sl,.85));
    vec3 nc=neon(r4*3.+r1)*(.55+.45*step(.06,fract(uTime*(.25+r3*.6)+r2)));
    TAKE(sg,5.,nc*2.2)
    glowAt(sg,nc);
    if(signs>1.5){float s2=sdBox(vec3(ax-13.8,q.y-(sy+sl+3.),q.z-zc-(r1-.5)*(P-gap)*.5),vec3(.12,1.2+r4,1.3));vec3 c2=neon(r1*3.+.5);TAKE(s2,5.,c2*2.)glowAt(s2,c2);}
    float sb=sdBox(vec3(ax-14.45,q.y-3.4,q.z-zc),vec3(.12,.28,(P-gap)*.42));
    vec3 nc2=neon(r2*3.+.31);TAKE(sb,5.,nc2*1.6)glowAt(sb,nc2*.7);
    if(r3>.72&&glass<.5&&hMax>40.){float hb=sdBox(vec3(ax-15.,q.y-2.*Hh-6.,q.z-zc),vec3(.25,5.,8.5));TAKE(hb,8.,vec3(r4,r2,cell))glowAt(hb,neon(r4)*.6);}
  }
  if(lanterns){
    float LZ=18.,lz=q.z-(floor(q.z/LZ)+.5)*LZ,wy=8.8-1.8*(1.-(q.x*q.x)/(RW*RW+30.));
    float wire=length(vec2(q.y-wy,lz))-.04;TAKE(wire,6.,vec3(0))
    float lx=mod(q.x+1.15,2.3)-1.15;float ll=length(vec3(lx,(q.y-wy+.55)*.8,lz))-.36;
    vec3 lc=mix(vec3(1.,.25,.1),vec3(1.,.6,.15),h1(floor((q.x+1.15)/2.3)+floor(q.z/LZ)*3.1));
    if(abs(q.x)<RW+3.){TAKE(ll,7.,lc*1.7)glowAt(ll,lc*.8);}
  }
  return d;
}
float lamps(vec3 q,float d){
  float ax=abs(q.x),LP=26.,lz=q.z-(floor(q.z/LP+.5))*LP;
  float pole=sdCap(vec3(ax,q.y,lz),vec3(10.,0.,0.),vec3(10.,7.6,0.),.12);TAKE(pole,6.,vec3(0))
  float arm=sdCap(vec3(ax,q.y,lz),vec3(10.,7.6,0.),vec3(8.4,7.8,0.),.08);TAKE(arm,6.,vec3(0))
  float head=sdBox(vec3(ax-8.4,q.y-7.7,lz),vec3(.9,.1,.3));TAKE(head,7.,vec3(1.,.72,.42)*3.)
  glowAt(head,vec3(1.,.62,.32));
  return d;
}
float skyway(vec3 q,float d){
  float ax=abs(q.x);
  float deck=sdBox(vec3(q.x,q.y+1.3,0.),vec3(RW+1.6,1.3,1e5));TAKE(deck,ax<RW?1.:2.,vec3(0))
  float rail=sdBox(vec3(ax-RW-1.2,q.y-.6,0.),vec3(.25,.6,1e5));TAKE(rail,6.,vec3(0))
  float strip=sdBox(vec3(ax-RW-1.2,q.y-1.25,0.),vec3(.27,.06,1e5));TAKE(strip,5.,uN2*1.4)glowAt(strip,uN2*.5);
  float PZ=64.,pz=q.z-(floor(q.z/PZ)+.5)*PZ;float pil=sdBox(vec3(q.x,q.y+40.,pz),vec3(2.2,38.,2.2));TAKE(pil,3.,vec3(.2,.3,.5))
  float g2=q.y+78.;TAKE(g2,14.,vec3(0))
  /* far towers either side of the skyway */
  vec2 cell=floor(vec2(q.x,q.z)/150.);vec2 lc=vec2(q.x,q.z)-(cell+.5)*150.;float hr=h2(cell);
  if(abs(cell.x+.5)>.6){float tw=sdBox(vec3(lc.x,q.y+78.-(60.+hr*170.)*.5,lc.y),vec3(16.+hr*14.,(60.+hr*170.)*.5,16.+hr*10.));TAKE(tw,3.,vec3(hr,fract(hr*7.),.4))}
  /* gantries */
  float GZ=520.,gz=q.z-(floor(q.z/GZ)+.5)*GZ;float gt=min(sdBox(vec3(ax-RW-.8,q.y-4.5,gz),vec3(.3,4.5,.3)),sdBox(vec3(q.x,q.y-8.6,gz),vec3(RW+1.,.4,.3)));TAKE(gt,6.,vec3(0))
  float gp=sdBox(vec3(q.x,q.y-7.3,gz-.35),vec3(5.5,.9,.06));TAKE(gp,8.,vec3(.3,.8,floor(q.z/GZ)))glowAt(gp,uN1*.4);
  return d;
}
float tunnel(vec3 q,float d){
  float R=13.,open=step(.82,fract(q.z/700.));
  float wall=R-length(vec2(q.x,max(q.y-3.,0.)*1.08));
  if(open<.5){TAKE(wall,15.,vec3(0))}
  float RZ=16.,rz=q.z-(floor(q.z/RZ)+.5)*RZ;
  float ring=length(vec2(max(wall,0.)-.05,rz))-.14;if(open<.5){glowAt(ring,uN1);}
  if(open>.5){d=buildings(q,d,20.,70.,34.,1.,false);}
  return d;
}
/* ---------------- vehicles ---------------- */
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
float cars(vec3 p,float d){
  for(int i=ZERO;i<14;i++){if(i>=uNC)break;vec4 c=uCar[i];vec3 v=p-c.xyz;float bd=length(v)-6.;if(bd>d)continue;
    v.xz=rot(c.w)*v.xz;vec4 b=uCarB[i];float L=b.y;
    vec3 paint=b.x<.5?vec3(.7,.1,.15):b.x<1.5?vec3(.1,.3,.7):b.x<2.5?vec3(.75,.75,.8):b.x<3.5?vec3(.1,.55,.35):vec3(.06,.06,.08);
    float body=sdBox(v-vec3(0.,.95,0.),vec3(1.,.42,L))-.18;TAKE(body,9.,paint)
    float cab=sdBox(v-vec3(0.,1.55,-.25),vec3(.82,.28,L*.48))-.14;TAKE(cab,9.,paint*.6)
    float tl=sdBox(v-vec3(0.,1.05,-L-.18),vec3(.85,.08,.05));vec3 tc=vec3(1.,.06,.04)*(1.4+b.z*2.2);TAKE(tl,5.,tc)glowAt(tl,tc*.6);
    float hl=sdBox(v-vec3(0.,.95,L+.18),vec3(.8,.07,.05));TAKE(hl,5.,vec3(1.,.95,.8)*2.)
    if(b.w>.5){float bl=sdBox(v-vec3(sign(b.w-1.5)*.95,1.05,-L-.15),vec3(.1,.08,.06));vec3 cc=vec3(1.,.6,.05)*step(.5,fract(uTime*2.));TAKE(bl,5.,cc*2.)}
    glowAt(length(vec3(v.x*.5,v.y-.25,v.z*.25))-.3,neon(b.x*.37)*.35);
  }
  return d;
}
float bike(vec3 p,float d,vec4 B,vec4 BB,float target){
  /* the player's bike is modelled at rider scale and drawn 1.3x so it reads at LED resolution */
  float K=target>.5?1.:1.3;
  vec3 v=p-B.xyz;float bd=length(v)-(target>.5?5.:3.6*K);if(bd>d)return d;
  v.xz=rot(B.w)*v.xz;v.xy=rot(-BB.x)*v.xy;v/=K;d/=K;
  if(target>.5){
    float body=sdBox(v-vec3(0.,1.3,0.),vec3(1.25,.85,2.9))-.25;float scorch=BB.y*step(.42,vn2(v.xz*1.9+v.y*1.3));TAKE(body,12.,vec3(.85,.62,.18)*(1.-scorch*.75))
    float win=sdBox(v-vec3(0.,1.75,2.7),vec3(1.1,.35,.3));TAKE(win,4.,vec3(.1))
    float stripe=sdBox(vec3(abs(v.x)-1.5,v.y-1.15,v.z),vec3(.03,.1,2.6));TAKE(stripe,5.,vec3(1.,.55,.1)*1.6)
    float lb=sdBox(v-vec3(0.,2.45,.6),vec3(1.,.1,.25));float ph=step(.5,fract(uTime*3.));vec3 lc=v.x>0.?vec3(1.,.08,.05)*ph:vec3(.1,.3,1.)*(1.-ph);TAKE(lb,5.,lc*2.4)glowAt(lb*1.8,lc*.5);
    float tl=sdBox(vec3(abs(v.x)-.95,v.y-1.2,v.z+3.12),vec3(.22,.14,.05));TAKE(tl,5.,vec3(1.,.1,.05)*2.4)glowAt(tl,vec3(.8,.05,.03));
    if(BB.z>.05){glowAt(length(vec3(v.x*.7,v.y-.9,v.z+3.6))-.35,vec3(1.,.5,.15)*BB.z*1.5);}
    glowAt(length(vec3(v.x*.4,v.y-.25,v.z*.2))-.4,vec3(1.,.7,.2)*.5);
    return d;}
  float hull=sdCap(v,vec3(0.,.75,-1.25),vec3(0.,.8,1.1),.34);TAKE(hull,10.,vec3(.12,.13,.16))
  float nose=sdCap(v,vec3(0.,.78,1.1),vec3(0.,.62,1.75),.2);TAKE(nose,10.,vec3(.12,.13,.16))
  float trim=sdBox(v-vec3(0.,.8,0.),vec3(.37,.065,1.25));vec3 tc=mix(uN1,vec3(1.),.2)*(1.8+BB.z*2.);TAKE(trim,5.,tc)
  vec3 pv=vec3(abs(v.x)-.42,v.y-.4,v.z);
  float pod=sdCap(pv,vec3(0.,0.,-1.),vec3(0.,0.,.8),.16);TAKE(pod,10.,vec3(.2,.22,.26))
  /* thruster rings at the back of each pod: what you see most from the chase camera */
  float ring=length(vec2(length(pv.xy)-.13,pv.z+1.08))-.04;vec3 rc=mix(uN2,vec3(1.),.25)*(1.5+BB.z*2.5);TAKE(ring,5.,rc)glowAt(ring*K*1.4,uN2*(.35+BB.z*.8));
  float core=length(vec3(pv.xy,(pv.z+1.1)*2.))-.085;vec3 cc=mix(uN2,vec3(1.),.6)*(.8+BB.z*3.);TAKE(core,5.,cc)
  float tube=sdCap(pv-vec3(.15,.02,0.),vec3(0.,0.,-1.05),vec3(0.,0.,.85),.045);vec3 tb=uN2*(1.6+BB.z*2.);TAKE(tube,5.,tb)glowAt(tube*K,tb*.35);
  float tors=sdCap(v,vec3(0.,1.05,-.35),vec3(0.,1.32,.25),.22);TAKE(tors,11.,vec3(.09,.1,.2))
  float stripe=sdBox(vec3(abs(v.x)-.1,v.y-1.18,v.z+.3),vec3(.035,.17,.2));TAKE(stripe,5.,uN1*1.6)
  float helm=length(v-vec3(0.,1.48,.42))-.19;TAKE(helm,11.,vec3(.85,.85,.9))
  float vis=sdBox(v-vec3(0.,1.5,.58),vec3(.13,.05,.05));TAKE(vis,5.,uN2*2.)
  float tail=sdBox(v-vec3(0.,.86,-1.62),vec3(.26,.055,.06));TAKE(tail,5.,vec3(1.,.1,.12)*3.)glowAt(tail*K*1.5,vec3(1.,.05,.05)*.55);
  glowAt(length(vec3(v.x*.8,v.y-.12,v.z*.5))*K*1.4-.25,uN1*(.35+BB.z*.6));
  if(BB.z>.05){glowAt((length(v-vec3(0.,.8,-2.1))-.12)*K,vec3(.4,.7,1.)*BB.z*2.);glowAt((length(vec3(pv.x,pv.y,(pv.z+1.9)*.5))-.08)*K,vec3(.3,.6,1.)*BB.z*1.4);}
  return d*K;
}
float ramps(vec3 q,float d){
  for(int i=ZERO;i<4;i++){vec4 r=uRamp[i];if(r.z<=0.)continue;float lz=q.z-r.x;if(lz<-2.||lz>r.z+2.)continue;
    vec3 c=vec3(q.x-r.y,q.y,lz-r.z*.5);float b=sdBox(c,vec3(2.2,1.5,r.z*.5));float sl=dot(vec2(c.z+r.z*.5,q.y),normalize(vec2(-1.5,r.z)));
    float w=max(b,sl);TAKE(w,13.,vec3(0))}
  return d;
}
/* ---------------- the whole scene ---------------- */
float map(vec3 p){
  vec3 q=vec3(p.x-pX(p.z),p.y-pY(p.z),p.z);
  float d=1e5;gGD=1e5;gGC=vec3(0);
  if(uStage==2){d=skyway(q,d);}
  else{d=q.y-(abs(q.x)>RW?.22:0.);gM=abs(q.x)>RW?2.:1.;gC=vec3(0);
    if(uStage==0)d=buildings(q,d,14.,95.,34.,1.,false);
    else if(uStage==1)d=buildings(q,d,8.,26.,26.,2.,true);
    else d=tunnel(q,d);
    if(uStage!=3)d=lamps(q,d);}
  /* vehicles only live in a slab over the road: skip them (but never step past the slab) elsewhere */
  float slab=max(q.y-7.5,abs(q.x)-13.5);
  if(slab<.6){
    d=ramps(q,d);
    d=cars(p,d);
    if(uBkB.w>.5)d=bike(p,d,uBk,uBkB,0.);
    if(uTgB.w>.5)d=bike(p,d,uTg,uTgB,1.);
  }else d=min(d,slab);
  for(int i=ZERO;i<2;i++){if(uDr[i].w<.5)continue;float dr=length(p-uDr[i].xyz)-.7;vec3 sc=fract(uTime*2.+float(i)*.5)<.5?vec3(1.,.1,.1):vec3(.2,.3,1.);TAKE(dr,5.,sc*2.)glowAt(dr,sc);}
  return d;
}
vec3 nrm(vec3 p,float t){
  /* tetrahedral normal in a loop so map() is compiled once here, not four times */
  float h=.0015*t+.002;vec3 n=vec3(0);
  for(int i=ZERO;i<4;i++){vec3 e=.5773*(2.*vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))-1.);n+=e*map(p+e*h);}
  return normalize(n);
}
/* ---------------- sky ---------------- */
vec3 sky(vec3 rd){
  float y=rd.y;vec3 c=mix(uSkyB,uSkyA,smoothstep(-.05,.45,y));
  c+=uSkyB*.6*exp(-abs(y)*9.);
  if(uStage==2){vec3 md=normalize(vec3(-.5,.32,.8));float m=dot(rd,md);c+=vec3(.9,.85,.75)*smoothstep(.9985,.9992,m)*2.+vec3(.3,.25,.35)*pow(max(m,0.),60.)*.5;}
  float st=step(.9985,h2(floor(rd.xy*300.+rd.z*170.)))*smoothstep(.1,.4,y)*(uStage==2?1.:.35);c+=vec3(st);
  return c;
}
/* ---------------- lighting ---------------- */
vec3 lightsAt(vec3 p,vec3 n,vec3 q){
  vec3 L=vec3(0);
  if(uStage!=2&&uStage!=3){float LP=26.,lz0=floor(q.z/LP+.5)*LP;
    for(int k=-1;k<=1;k++){float lz=lz0+float(k)*LP;for(int s=-1;s<=1;s+=2){vec3 lp=vec3(float(s)*8.4,7.4,lz),v=lp-q;float dd=dot(v,v);L+=vec3(1.,.62,.34)*1.6*max(dot(n,v*inversesqrt(dd)),0.)/(1.+dd*.012);}}}
  if(uStage==3){float RZ=16.,rz=floor(q.z/RZ+.5)*RZ;for(int k=-1;k<=1;k++){vec3 v=vec3(0.,9.,rz+float(k)*RZ)-q;float dd=dot(v,v);L+=uN1*1.1*max(dot(n,v*inversesqrt(dd)),.15)/(1.+dd*.01);}}
  if(uStage==2){L+=vec3(.25,.3,.45)*max(n.y,0.)*.6;}
  /* neon spill from the nearest signs onto the street */
  if(uStage<2||uStage==3){float P=uStage==1?26.:34.,ax=abs(q.x),id=floor(q.z/P)*2.+(q.x>0.?1.:0.);vec3 nc=neon(h1(id+9.91)*3.+h1(id));float dx=ax-13.7;L+=nc*.9/(1.+dx*dx*.06+pow(q.y-6.,2.)*.01)*max(dot(n,vec3(sign(q.x),.2,0.)),.2);}
  /* the bike's headlight */
  if(uBkB.w>.5){vec3 hp=uBk.xyz+vec3(0.,1.05,0.)+uBkF*2.3,v=p-hp;float dd=length(v);float sp=smoothstep(.86,.97,dot(v/dd,uBkF));L+=vec3(.9,.95,1.)*3.*sp/(1.+dd*dd*.004)*max(dot(n,-v/dd),0.);}
  if(uBkB.w>.5){vec3 v=uBk.xyz+vec3(0.,.35,0.)-p;float dd=dot(v,v);L+=uN1*(1.4+uBkB.z*1.5)/(1.+dd*.9)*max(dot(n,v*inversesqrt(dd)),0.)*(1.-smoothstep(.12,.3,p.y-uBk.y));}
  /* the getaway van's light bar strobes on everything nearby */
  if(uTgB.w>.5){vec3 v=uTg.xyz+vec3(0.,2.5,0.)-p;float dd=dot(v,v);float ph=step(.5,fract(uTime*3.));L+=mix(vec3(.1,.3,1.),vec3(1.,.1,.05),ph)*6./(1.+dd*.05)*max(dot(n,v*inversesqrt(dd)),0.);}
  return L;
}
vec3 shadeBasic(vec3 p,vec3 n,vec3 rd,float m,vec3 mc,float t){
  vec3 q=vec3(p.x-pX(p.z),p.y-pY(p.z),p.z);
  vec3 amb=mix(uSkyB*.35,uSkyA*.6,n.y*.5+.5)+uFogC*.25;
  if(m>4.5&&m<5.5||m==7.)return mc;
  if(m==8.){vec2 uv=vec2(q.z*.12,q.y*.2);float s=step(.5,fract(uv.x+uTime*.6+uv.y*.3))*.7+.3*step(.7,fract(uv.y*3.));return neon(mc.x+floor(uTime*.2+mc.z*.37))*s*1.6+vec3(.05);}
  if(m==14.){vec2 g=fract(q.xz*vec2(.11,.11));float s=step(.92,g.x)+step(.92,g.y);vec2 c=floor(q.xz*.11);float w=step(.35,h2(c))*step(.15,fract(g.x*4.))*step(.2,fract(g.y*4.));
    return (uN3*s*.7+vec3(1.,.8,.5)*w*.18*h2(c+1.))*(.6+.4*sin(uTime+c.x));}
  vec3 alb=vec3(.04);float spec=0.;
  if(m==1.){alb=vec3(.035,.035,.04);float ax=abs(q.x);float mk=(abs(ax-4.5)<.11&&fract(q.z/9.)<.45)||(abs(ax-8.75)<.11)?1.:0.;if(uStage==3)mk=max(mk,abs(ax)<.11&&fract(q.z/6.)<.5?1.:0.);alb=mix(alb,vec3(.55,.55,.5),mk);
    for(int i=ZERO;i<6;i++){vec4 pd=uPad[i];if(pd.z<=0.)continue;float lz=q.z-pd.x;if(lz>0.&&lz<pd.z&&abs(q.x-pd.y)<2.){float ch=step(.5,fract(lz*.25-abs(q.x-pd.y)*.25-uTime*2.));return vec3(.1,.8,1.)*(.4+ch*2.5);}}}
  else if(m==2.){alb=vec3(.08,.08,.09);}
  else if(m==3.||m==4.){
    alb=m==4.?vec3(.03,.05,.07):mix(vec3(.05,.045,.06),vec3(.1,.08,.1),mc.y);
    /* windows */
    vec2 w=vec2(abs(n.x)>.5?q.z:q.x,q.y);vec2 wc=floor(w/vec2(2.2,3.1)),wf=fract(w/vec2(2.2,3.1));
    float lit=step(.62-mc.x*.25,h2(wc+mc.xy*91.));float win=step(.15,wf.x)*step(wf.x,.75)*step(.2,wf.y)*step(wf.y,.75);
    vec3 wcol=mix(vec3(1.,.75,.45),vec3(.55,.75,1.),h2(wc*1.7))*(.5+.5*h2(wc+3.));
    if(m==4.){win=step(.08,wf.x)*step(.25,wf.y);lit*=.6;}
    return alb*(amb+lightsAt(p,n,q))+wcol*lit*win*(m==4.?.35:.55);}
  else if(m==6.){alb=vec3(.07,.07,.08);spec=.4;}
  else if(m==9.||m==12.){alb=mc;spec=.9;}
  else if(m==10.){alb=vec3(.1,.105,.13);spec=1.3;}
  else if(m==11.){alb=mc;spec=.3;}
  else if(m==13.){alb=vec3(.3,.25,.05);float st=step(.5,fract(q.z*.6+q.x*.3));alb=mix(alb,vec3(.05),st);return alb*(amb+lightsAt(p,n,q))+vec3(.5,.4,0.)*(1.-st)*.4;}
  else if(m==15.){alb=vec3(.12,.12,.14);float RZ=16.,rz=abs(q.z-(floor(q.z/RZ)+.5)*RZ);float ring=smoothstep(.5,.2,rz);float pan=step(.92,fract(q.z/4.))+step(.95,fract(atan(q.y-3.,q.x)*3.));
    float em=uStage==3?step(.97,fract(q.z/48.))*step(.5,fract(uTime*1.5))*step(abs(q.y-1.5),.4):0.;
    return alb*(1.-pan*.4)*(amb+lightsAt(p,n,q))+uN1*ring*2.2+vec3(1.,.1,.05)*em*2.;}
  vec3 col=alb*(amb+lightsAt(p,n,q));
  if(m==9.||m==12.||m==10.||m==11.){float fr=pow(1.-max(dot(-rd,n),0.),2.5);col+=alb*(.12+.5*fr)*(uN1+uN2)*.5+vec3(.6,.65,.8)*fr*(m>9.5?.22:.08);}
  if(spec>0.){vec3 r=reflect(rd,n);col+=sky(r)*spec*(.04+.5*pow(1.-max(dot(-rd,n),0.),4.))+neon(floor(p.z*.03))*.06*spec*max(r.y,0.);}
  return col;
}
/* ---------------- primary ray + one reflection bounce, in ONE loop so the march is compiled once ---------------- */
void main(){
  vec2 uv=(vT*uRes-uRes*.5)/uRes.y;
  vec3 rd=normalize(uRot*vec3(uv*uFov,1.)),ro=uCam;
  vec3 acc=vec3(0),base=vec3(0),rcol=vec3(0);float T0=1.,refl=0.;bool primHit=false;
  for(int b=ZERO;b<2;b++){
    bool prim=b==0;gWantGlow=prim;
    float t=prim?.2:.05,T=1.,maxS=prim?uSteps:uSteps*.55;bool hit=false;
    for(int i=ZERO;i<140;i++){
      if(float(i)>maxS)break;
      vec3 p=ro+rd*t;float d=map(p);
      if(prim){
        float dt=max(d*.85,.04+t*.004);
        float fd=uFogD*(.6+.8*exp(-max(p.y-pY(p.z),0.)*.04));
        /* neon glow, drone searchlights and the headlight are gathered along the primary ray */
        acc+=T*gGC*exp(-gGD*1.7)*dt*.085;
        for(int k=ZERO;k<2;k++){if(uDr[k].w<.5)continue;vec3 v=p-uDr[k].xyz;float lv=length(v);vec3 ax=normalize(uDrT[k].xyz-uDr[k].xyz);float cs=dot(v/lv,ax);acc+=T*vec3(.55,.65,.9)*smoothstep(.975,.993,cs)*.55/(1.+lv*lv*.002)*dt*.05;}
        if(uBkB.w>.5){vec3 hd=normalize(uBkF+vec3(0.,-.05,0.));vec3 v=p-(uBk.xyz+vec3(0.,1.05,0.)+uBkF*2.3);float lv=length(v)+.001;acc+=T*vec3(.55,.62,.85)*smoothstep(.94,.99,dot(v,hd)/lv)/(1.+lv*.16)*dt*.0055*(1.+uRain*1.6)*step(0.,dot(v,hd));}
        T*=exp(-fd*dt);
        if(d<.0015*t+.004){hit=true;break;}
        t+=dt;if(t>420.||T<.02)break;
      }else{
        if(d<.003*t+.01){hit=true;break;}
        t+=d*.9;if(t>220.)break;
      }
    }
    if(!hit){if(prim){base=sky(rd)*T+uFogC*(1.-T)*.7+sky(rd)*(1.-T)*.3;T0=1.;}else rcol=sky(rd);break;}
    /* the last map() call was at the hit point, so gM/gC already hold its material */
    vec3 p=ro+rd*t;float m=gM;vec3 mc=gC;gWantGlow=false;vec3 n=nrm(p,t);
    vec3 c=shadeBasic(p,n,rd,m,mc,t);
    if(!prim){rcol=mix(uFogC,c,exp(-uFogD*t));break;}
    primHit=true;base=c;T0=T;
    /* wet road, glass and paint reflect the city */
    vec3 q=vec3(p.x-pX(p.z),p.y-pY(p.z),p.z);vec3 rn=n;
    if(m==1.||m==2.||m==13.){float wet=uWet*(.32+.6*smoothstep(.3,.72,vn2(q.xz*vec2(.12,.05))));
      if(uRain>.5){vec2 cc=floor(q.xz/1.3),cf=fract(q.xz/1.3)-.5;float ph=fract(uTime*1.2+h2(cc));float rr=length(cf+vec2(h2(cc+1.),h2(cc+2.))*.3-.15);float ring=smoothstep(.06,0.,abs(rr-ph*.45))*(1.-ph);rn=normalize(n+vec3(cf.x,0.,cf.y)*ring*.9);}
      rn=normalize(rn+vec3(vn2(q.xz*1.7)-.5,0.,vn2(q.zx*1.5)-.5)*.035);
      refl=wet*(.25+.75*pow(1.-max(dot(-rd,n),0.),3.));}
    else if(m==4.){refl=.55;}
    else if(m==9.||m==12.){refl=.25*pow(1.-max(dot(-rd,n),0.),2.)+.05;}
    if(refl<=.02||t>180.){refl=0.;break;}
    ro=p+n*.05;rd=reflect(rd,rn);
  }
  vec3 col=base;
  if(primHit){col=mix(base,min(rcol*.85,vec3(2.2)),refl);col=col*T0+uFogC*(1.-T0);}
  col+=acc;
  o=vec4(max(col,0.),1.);
}
