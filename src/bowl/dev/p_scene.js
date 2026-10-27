/* =====================================================================================
   11. GPU PER-DOT RENDERER — the alley is ray traced in one fragment shader at the matrix
       resolution (one invocation per LED), read back into RBUF, then the HUD and the house
       LED pass run exactly as in every other cabinet.
       Analytic primitives: lane / approach / deck plane (procedural boards, arrows, oil),
       gutters as concave cylinders, kickbacks + pinsetter as boxes, the ball as a sphere.
       Each pin is a revolved 2D signed-distance profile, sphere-traced only inside its own
       bounding cylinder in pin space; a CPU-side box around all live pins gates every pin
       loop (tracing, shadows, occlusion) so most dots never touch them.
       The oiled lane and the deck mirror everything with Fresnel, a per-board micro-tilt and
       a rougher lobe where the oil has run out. Lighting: blacklight ambience (fluorescent
       materials glow), a hooded pin light with analytic soft shadows, ceiling cans, roving
       "cosmic" spots. Neighbouring lanes repeat the lane domain every 1.75 m.
   ===================================================================================== */
const FS_SCENE=`in vec2 vT;out vec4 o;
uniform vec2 uRes;uniform float uT;uniform int uQ;
uniform vec3 uEye;uniform mat3 uCam;uniform float uTan;
uniform vec3 uEye2;uniform mat3 uCam2;uniform float uTan2;uniform vec4 uPip;
uniform vec4 uBall;uniform mat3 uBallR;uniform vec3 uBallA;uniform vec3 uBallB;
uniform vec4 uPin[10];uniform mat3 uPinR[10];uniform vec3 uPB0;uniform vec3 uPB1;
uniform vec4 uSet;uniform vec4 uAim;uniform vec4 uFx;uniform vec4 uNb;
uniform sampler2D uMask;
#define HW .527
#define GX .644
#define GY .12
#define GR .168
#define WALL .762
#define CELL 1.75
#define PITZ 19.156
#define DECKZ 17.95
#define MZ 17.86
#define MY0 .64
#define MY1 1.46
#define CEIL 3.0
#define CURT 20.15
#define KBZ 17.62
#define KBY 1.0
#define BR .1085
#define LOIL 12.2
const vec2 SP[10]=vec2[10](vec2(0.,18.288),vec2(-.1524,18.552),vec2(.1524,18.552),vec2(-.3048,18.816),vec2(0.,18.816),vec2(.3048,18.816),vec2(-.4572,19.08),vec2(-.1524,19.08),vec2(.1524,19.08),vec2(.4572,19.08));
float h11(float n){return fract(sin(n*127.1+.7)*43758.5453);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n31(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+1.),f.x),f.y),f.z);}
vec3 hue(float h){return .5+.5*cos(6.2832*(h+vec3(0.,.33,.67)));}
/* ---- the pin: a 2D profile in (radius, height), revolved. The exact distance to a revolved shape
   is the 2D distance at (length(p.xz), p.y). Built from uneven capsules (circle-to-circle hulls). */
float sdUC(vec2 p,float r1,float r2,float h){p.x=abs(p.x);float b=(r1-r2)/h,a=sqrt(1.-b*b),k=dot(p,vec2(-b,a));
  if(k<0.)return length(p)-r1;if(k>a*h)return length(p-vec2(0.,h))-r2;return dot(p,vec2(a,b))-r1;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float pin2(vec2 q){
  float d=sdUC(q-vec2(0.,.03),.04,.0605,.084);            /* base ring to the belly (4.766 in at 4.5 in) */
  d=min(d,sdUC(q-vec2(0.,.114),.0605,.0215,.172));         /* belly tapering into the neck */
  d=min(d,length(q-vec2(0.,.166))-.0532);                  /* shoulder fullness */
  d=smin(d,length(q-vec2(0.,.3485))-.0322,.03);            /* head, filleted into the neck */
  return max(d,-q.y);}
float tPin(vec3 ro,vec3 rd,float tmax,int steps){
  float a=dot(rd.xz,rd.xz),b=dot(ro.xz,rd.xz),c=dot(ro.xz,ro.xz)-.0042,t0,t1;
  if(a<1e-8){if(c>0.)return -1.;t0=-1e9;t1=1e9;}else{float h=b*b-a*c;if(h<0.)return -1.;h=sqrt(h);t0=(-b-h)/a;t1=(-b+h)/a;}
  float iy=1./(abs(rd.y)<1e-6?1e-6:rd.y),ya=-ro.y*iy,yb=(.382-ro.y)*iy;
  t0=max(max(t0,min(ya,yb)),0.);t1=min(min(t1,max(ya,yb)),tmax);if(t0>=t1)return -1.;
  float t=t0;for(int i=0;i<40;i++){if(i>=steps)break;vec3 p=ro+rd*t;float d=pin2(vec2(length(p.xz),p.y));if(d<.0006)return t;t+=d;if(t>t1)return -1.;}
  return -1.;}
vec3 pinN(vec3 p){float r=length(p.xz);vec2 q=vec2(r,p.y),e=vec2(.0008,0.);
  vec2 g=vec2(pin2(q+e)-pin2(q-e),pin2(q+e.yx)-pin2(q-e.yx));vec2 dr=r>1e-5?p.xz/r:vec2(1.,0.);return normalize(vec3(g.x*dr.x,g.y,g.x*dr.y));}
/* slab test; tn<0 (ray starts inside) counts as a miss */
vec2 slab(vec3 ro,vec3 iv,vec3 a,vec3 b){vec3 t0=(a-ro)*iv,t1=(b-ro)*iv,mn=min(t0,t1),mx=max(t0,t1);return vec2(max(max(mn.x,mn.y),mn.z),min(min(mx.x,mx.y),mx.z));}
float tBox(vec3 ro,vec3 rd,vec3 iv,vec3 a,vec3 b,out vec3 n){vec3 t0=(a-ro)*iv,t1=(b-ro)*iv,mn=min(t0,t1),mx=max(t0,t1);
  float tn=max(max(mn.x,mn.y),mn.z),tf=min(min(mx.x,mx.y),mx.z);n=vec3(0.,1.,0.);if(tn>tf||tn<0.)return 1e9;
  n=tn==mn.x?vec3(-sign(rd.x),0.,0.):tn==mn.y?vec3(0.,-sign(rd.y),0.):vec3(0.,0.,-sign(rd.z));return tn;}
struct Hit{float t;vec3 n;vec3 p;vec3 l;int m;int id;float k;};
/* materials: 1 lane/deck/approach, 4 gutter, 5 capping, 6 kickback, 7 masking panel, 8 ceiling, 9 pit + curtain,
   10 ball, 11 pin, 12 neighbour pin, 13 sweep bar, 14 setting table, 16 wall above the masking units */
Hit trace(vec3 ro,vec3 rd,bool sec){
  Hit h;h.t=1e9;h.m=0;h.id=-1;h.k=0.;h.n=vec3(0.,1.,0.);h.p=vec3(0.);h.l=vec3(0.);vec3 n,iv=1./rd;float t;
  if(rd.y<0.){t=-ro.y/rd.y;vec3 p=ro+rd*t;float k=floor(p.x/CELL+.5),lx=p.x-k*CELL,ax=abs(lx);h.k=k;
    if(ax<WALL&&p.z>PITZ){t=(-.45-ro.y)/rd.y;h.t=t;h.p=ro+rd*t;h.m=9;}
    else if(ax<HW){h.t=t;h.p=p;h.m=1;}
    else if(ax<WALL){vec2 c=vec2(k*CELL+sign(lx)*GX,GY),oc=ro.xy-c;float a=dot(rd.xy,rd.xy),b=dot(oc,rd.xy),cc=dot(oc,oc)-GR*GR,d=b*b-a*cc;
      if(d>0.){t=(-b+sqrt(d))/a;h.t=t;h.p=ro+rd*t;h.n=normalize(vec3(c-h.p.xy,0.));h.m=4;}}
    else{h.t=t;h.p=p;h.m=5;}}
  if(rd.y>0.){t=(CEIL-ro.y)/rd.y;if(t<h.t){h.t=t;h.p=ro+rd*t;h.m=8;h.n=vec3(0.,-1.,0.);h.k=floor(h.p.x/CELL+.5);}}
  if(rd.z>0.){t=(MZ-ro.z)/rd.z;vec3 p=ro+rd*t;
    if(t>0.&&t<h.t&&p.y>MY0){h.t=t;h.p=p;h.n=vec3(0.,0.,-1.);h.m=p.y<MY1?7:16;h.k=floor(p.x/CELL+.5);}
    t=(CURT-ro.z)/rd.z;if(t>0.&&t<h.t){h.t=t;h.p=ro+rd*t;h.n=vec3(0.,0.,-1.);h.m=9;h.k=floor(h.p.x/CELL+.5);}
    /* kickbacks: only the dividers the ray can reach between the deck front and the curtain */
    float xa=ro.x+rd.x*max((KBZ-ro.z)/rd.z,0.),xb=ro.x+rd.x*max((CURT-ro.z)/rd.z,0.);
    float i0=floor(min(xa,xb)/CELL-.5),i1=floor(max(xa,xb)/CELL+.5);
    for(int j=0;j<3;j++){float i=i0+float(j);if(i>i1)break;float cx=(i+.5)*CELL;
      t=tBox(ro,rd,iv,vec3(cx-.113,-.5,KBZ),vec3(cx+.113,KBY,CURT),n);if(t<h.t){h.t=t;h.n=n;h.p=ro+rd*t;h.m=6;h.k=i;}}}
  if(uBall.w>.5){vec3 oc=ro-uBall.xyz;float b=dot(oc,rd),c=dot(oc,oc)-BR*BR,d=b*b-c;
    if(d>0.){t=-b-sqrt(d);if(t>0.&&t<h.t){h.t=t;h.p=ro+rd*t;h.n=(h.p-uBall.xyz)/BR;h.m=10;}}}
  if(uSet.y<.8){t=tBox(ro,rd,iv,vec3(-.8,uSet.y,uSet.x-.03),vec3(.8,uSet.y+.1,uSet.x+.03),n);if(t<h.t){h.t=t;h.n=n;h.p=ro+rd*t;h.m=13;}}
  if(uSet.z<.95){t=tBox(ro,rd,iv,vec3(-.7,uSet.z,18.08),vec3(.7,uSet.z+.07,19.22),n);if(t<h.t){h.t=t;h.n=n;h.p=ro+rd*t;h.m=14;}}
  /* pins: our ten (moving, any orientation) and the neighbours' static racks share one marching site */
  vec2 pb=slab(ro,iv,uPB0,uPB1);bool own=pb.x<pb.y&&pb.y>0.&&pb.x<h.t;int racks=0;
  if(!sec&&uQ>0&&rd.z>0.)for(int j=0;j<4;j++){float k=float(j<2?j-2:j-1);vec2 sb=slab(ro,iv,vec3(k*CELL-.52,0.,18.2),vec3(k*CELL+.52,.385,19.15));
    if(sb.x<sb.y&&sb.y>0.&&sb.x<h.t)racks|=1<<j;}
  if(own||racks!=0){int steps=sec?(uQ>1?24:14):40;
    for(int i=0;i<50;i++){vec3 lo,ld;float kk=0.;int id;
      if(i<10){if(!own)continue;vec4 P=uPin[i];if(P.w<.5)continue;mat3 R=uPinR[i];
        vec3 oc=ro-(P.xyz+R[1]*.19);float b=dot(oc,rd),c=dot(oc,oc)-.042;if(c>0.&&(b>0.||b*b<c))continue;   /* bounding sphere */
        lo=(ro-P.xyz)*R;ld=rd*R;id=i;}
      else{int j=(i-10)/10,q=i-10-j*10;if(((racks>>j)&1)==0||((int(uNb[j])>>q)&1)==0)continue;
        kk=float(j<2?j-2:j-1);lo=ro-vec3(kk*CELL+SP[q].x,0.,SP[q].y);ld=rd;id=q;}
      t=tPin(lo,ld,h.t,i<10?steps:22);if(t>0.){h.t=t;h.m=i<10?11:12;h.id=id;h.l=lo+ld*t;h.p=ro+rd*t;h.k=kk;}}}
  return h;}
/* ---- lighting ---- */
float sphSS(vec3 ro,vec3 rd,vec4 s,float k){vec3 oc=ro-s.xyz;float b=dot(oc,rd),c=dot(oc,oc)-s.w*s.w,h=b*b-c;
  float d=sqrt(max(0.,s.w*s.w-h))-s.w,t=-b-sqrt(max(h,0.));return t<0.?1.:smoothstep(0.,1.,2.5*k*d/t);}
float sphAO(vec3 p,vec3 n,vec4 s){vec3 d=s.xyz-p;float l=length(d);return 1.-max(0.,dot(n,d/l))*s.w*s.w/(l*l);}
bool nearPins(vec3 p,float m){return all(greaterThan(p,uPB0-m))&&all(lessThan(p,uPB1+m));}
vec3 spots(vec3 p){vec3 s=vec3(0.);for(int i=0;i<3;i++){float fi=float(i);
  vec2 c=vec2(sin(uT*(.31+fi*.17)+fi*2.1)*.62,5.+fi*4.5+sin(uT*(.23+fi*.11)+fi)*4.);vec2 d=p.xz-c;float dd=dot(d,d);
  if(dd<.2)s+=hue(fi*.33+uT*.05)*smoothstep(.18,.01,dd);}return s*(.1+uFx.x*1.1);}
/* diffuse light at p (ambience, two nearest ceiling cans, the hooded pin light with soft shadows) plus the pin light's specular */
vec3 light(vec3 p,vec3 n,float k,bool sh,vec3 rd,float sp,out float spc){
  vec3 L=vec3(.07,.04,.15)*(1.+.6*n.y);spc=0.;
  float zi=clamp(floor((p.z-1.5)/3.4),0.,3.);                             /* the two nearest crosswise tubes */
  for(int i=0;i<2;i++){vec3 d=vec3(p.x,CEIL-.06,1.5+(zi+float(i))*3.4)-p;float dd=dot(d,d);L+=vec3(.7,.5,1.)*.55*max(dot(n,d),0.)*inversesqrt(dd)/dd;}
  vec3 d=vec3(k*CELL,.6,17.95)-p;float dd=dot(d,d);vec3 ld=d*inversesqrt(dd);
  float cone=smoothstep(.15,.7,dot(-ld,normalize(vec3(0.,-.42,1.))))*(k==0.?1.:.65);
  if(cone>0.){float s=1.;vec3 q=p+n*.003;
    if(sh){if(nearPins(q,.7))for(int i=0;i<10;i++){vec4 P=uPin[i];if(P.w<.5)continue;vec3 a=uPinR[i][1];
        s*=sphSS(q,ld,vec4(P.xyz+a*.12,.057),6.)*sphSS(q,ld,vec4(P.xyz+a*.33,.03),6.);}
      if(uBall.w>.5)s*=sphSS(q,ld,vec4(uBall.xyz,BR),6.);}
    float e=(2.1+uFx.y*1.6)*cone*s/(.9+dd);L+=vec3(.82,.86,1.)*e*max(dot(n,ld),0.);
    if(sp>0.)spc=pow(max(dot(reflect(rd,n),ld),0.),sp)*e*.5;}
  return L;}
/* a cheap environment for the ball's clearcoat: ceiling cans, the glowing masking units, the lane glow */
vec3 envr(vec3 r){vec3 c=vec3(.02,.012,.04);
  if(r.y>0.){float q=r.z/r.y*(CEIL-.3);c+=vec3(.7,.5,1.)*smoothstep(.3,.05,abs(fract(q/3.4)-.5)*3.4)*.9;}
  c+=vec3(.6,.25,.9)*smoothstep(.75,1.,r.z)*smoothstep(-.2,.15,r.y)*.9;c+=vec3(.25,.1,.4)*smoothstep(0.,-.4,r.y);return c;}
/* ---- the floor: boards, oil, deck ---- */
vec3 laneGlow(vec3 p,float k){vec3 e=vec3(0.);float lx=p.x-k*CELL,z=p.z;
  if(z>-.02&&z<.02)e+=vec3(1.,.15,.35)*1.4;                                /* foul line */
  if(z>3.6&&z<4.9){float j=clamp(floor(lx/.1351+.5),-3.,3.),tip=4.88-abs(j)*.3,dz=tip-z;   /* the seven arrows (nearest only) */
    if(dz>0.&&dz<.17)e+=vec3(.25,1.,.45)*1.3*smoothstep(.003,-.002,abs(lx-j*.1351)-.0135*dz/.17);}
  if(z>2.1&&z<2.16){float b=(HW-abs(lx))/.02703+.5;float bb=b<4.?3.:b<6.5?5.:b<9.5?8.:b<12.5?11.:14.;   /* dots at 7 ft */
    e+=vec3(.2,.8,1.)*smoothstep(.013,.007,length(vec2(abs(lx)-(HW-(bb-.5)*.02703),z-2.13)));}
  if(z>10.36&&z<12.2)e+=vec3(.2,.7,1.)*.6*smoothstep(.006,.002,abs(abs(lx)-.27-(z-10.36)*.015));  /* range finders */
  if(uAim.z>.5&&k==0.&&z>.3&&z<7.){float ax=uAim.x+tan(uAim.y)*(z-.35),s=(z-.35)/cos(uAim.y);
    float on=step(fract(s*2.2-uT*1.6),.55)*smoothstep(6.5,1.,s)*uAim.w;
    e+=vec3(.4,1.,.95)*1.6*on*smoothstep(.016,.006,abs(lx-ax));
    if(abs(z-4.6)<.05)e+=vec3(1.,.8,.3)*1.5*uAim.w*smoothstep(.04,.025,abs(lx-ax))*step(.012,abs(lx-ax));}
  return e;}
/* masking panels: ours from the top half of the texture; neighbours get the grey template, tinted, plus a lane number */
vec3 panel(vec3 p,float k,float t){float lx=p.x-k*CELL,u=lx/CELL+.5,v=(MY1-p.y)/(MY1-MY0),lod=max(0.,log2(t*2.*uTan/uRes.y/.011));
  vec3 c;if(k==0.)c=textureLod(uMask,vec2(u,v*.5),lod).rgb;
  else{c=textureLod(uMask,vec2(u,.5+v*(50./144.)),lod).r*hue(k*.27+.6)*1.2;
    float n=7.+k;vec2 q=vec2((u-.08)/.17,(v-.28)/.44);
    if(n>0.&&q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.){float two=step(9.5,n),d=two>.5?(q.x<.5?floor(n/10.):mod(n,10.)):n,s=two>.5?fract(q.x*2.):q.x;
      c+=(hue(k*.27+.6)*.6+.35)*textureLod(uMask,vec2((2.+d*14.+s*10.)/160.,(125.+q.y*14.)/144.),max(lod-1.,0.)).r*.9;}}
  return c*1.25*smoothstep(0.,.015,u)*smoothstep(1.,.985,u)+vec3(.02,.015,.04);}
/* ---- materials: each branch only fills in a description; lighting happens once afterwards ---- */
struct Mat{vec3 a;vec3 e;vec3 n;vec3 rn;float ao;float ks;float sp;float gl;float ro;bool sh;bool lit;};
Mat material(Hit h,vec3 rd,bool sec){
  Mat m;vec3 p=h.p,n=h.n;float k=h.k;m.a=vec3(0.);m.e=vec3(0.);m.n=n;m.rn=n;m.ao=1.;m.ks=0.;m.sp=0.;m.gl=0.;m.ro=0.;m.sh=false;m.lit=true;
  if(h.m==0){m.e=vec3(.008,.004,.016);m.lit=false;}
  else if(h.m==1){float lx=p.x-k*CELL,z=p.z,bx=(lx+HW)*(39./(2.*HW)),bi=floor(bx),bf=fract(bx),hb=h11(bi+k*41.+7.);m.ro=.004;
    if(z<0.){m.a=mix(vec3(.42,.33,.24),vec3(.5,.41,.3),hb)*(.85+.15*n21(vec2(bi*7.,z*3.)));m.gl=.3;m.ro=.04;}
    else if(z<DECKZ){float gr=n21(vec2(bi*13.+bf*3.,z*.8))*.6+n21(vec2(bi*5.,z*7.))*.4;
      m.a=mix(vec3(.46,.28,.15),vec3(.62,.4,.22),hb)*(.75+.32*gr)*.42;
      float dry=smoothstep(LOIL-1.2,LOIL+1.2,z+smoothstep(.2,.46,abs(lx))*2.2);   /* 40 ft of oil, outside boards dry first */
      m.a*=.86+.2*dry;m.gl=mix(1.,.5,dry);m.ro=mix(.002,.03,dry);}
    else{vec2 q=vec2(lx,z-18.288);float r=floor(q.y/.26397+.5),c=floor((lx/.1524-r)*.5+.5)*2.+r,d=length(q-vec2(c*.1524,r*.26397));   /* pin spots */
      m.a=vec3(.12,.105,.15)*(.92+.08*hb)*(1.-.5*smoothstep(.006,0.,abs(d-.034))*step(r,3.5)*step(-.5,r)*step(abs(c),r+.5));m.gl=.62;m.ro=.006;}
    m.a*=1.-.3*smoothstep(.07,0.,min(bf,1.-bf))*step(z,DECKZ);                  /* board seams */
    m.rn=normalize(vec3((hb-.5)*.012+(n21(vec2(bi*1.7,z*.3))-.5)*.01,1.,(h11(bi*3.1+floor(z*.45)*7.)-.5)*.006));  /* each board's own tilt */
    m.e=laneGlow(p,k)+m.a*spots(p);m.n=vec3(0.,1.,0.);
    float a=1.;if(uBall.w>.5)a*=sphAO(p,m.n,vec4(uBall.xyz,BR*1.1));
    if(nearPins(p,.3))for(int i=0;i<10;i++){vec4 P=uPin[i];if(P.w<.5)continue;vec3 c=P.xyz+uPinR[i][1]*.1;vec3 d=c-p;if(dot(d,d)>.1)continue;a*=sphAO(p,m.n,vec4(c,.07));}
    m.ao=a;m.sh=!sec&&uQ>0&&abs(k)<.1&&z>15.5;}
  else if(h.m==4){vec3 r=reflect(rd,n);m.a=vec3(.06,.05,.12);m.e=vec3(.5,.3,.9)*pow(max(r.y,0.),18.)*.3+spots(p)*.05+vec3(.15,.05,.3)*smoothstep(.01,0.,abs(abs(p.x-k*CELL)-HW))*.5;}
  else if(h.m==5){float lx=abs(p.x-k*CELL);m.a=vec3(.05,.04,.08);vec3 tube=mod(k,2.)==0.?vec3(.2,.9,1.):vec3(1.,.2,.8);
    m.e=spots(p)*.08+tube*1.5*smoothstep(.012,.004,abs(lx-WALL-.016))*step(p.z,KBZ);}
  else if(h.m==6){float cx=(k+.5)*CELL,side=abs(n.x),fr=step(.5,abs(n.z));vec3 col=mod(k,2.)==0.?vec3(1.,.15,.75):vec3(.15,.85,1.);
    m.a=vec3(.05,.04,.08);float tube=smoothstep(.014,.004,abs(p.y-.34))+smoothstep(.014,.004,abs(p.y-.78));
    m.e=col*(1.+uFx.x*1.5)*(tube*side*1.1+fr*1.3*smoothstep(.016,.006,min(abs(abs(p.x-cx)-.1),abs(p.y-KBY+.012))))+col*side*(.025*smoothstep(.9,0.,p.y)+.035*step(.88,fract(p.z*5.)))*(1.+uFx.x*2.);
    h.k=floor(p.x/CELL+.5);}
  else if(h.m==7){m.e=panel(p,k,h.t);m.lit=false;}
  else if(h.m==8){float lx=p.x-k*CELL,dz=abs(mod(p.z-1.5,3.4)-1.7)-1.7;dz=abs(dz);vec3 tube=mod(k,2.)==0.?vec3(1.,.2,.8):vec3(.2,.9,1.);
    m.e=vec3(.025,.02,.04)+vec3(.7,.5,1.)*(2.4*smoothstep(.04,.022,dz)+.22*smoothstep(.45,0.,dz))*step(0.,p.z)*step(p.z,16.)
      +tube*smoothstep(.02,.008,abs(abs(lx)-.875))*.8*(.7+.3*sin(p.z*.8-uT*3.));m.lit=false;}
  else if(h.m==9){m.e=vec3(.006,.004,.012);m.lit=false;}
  else if(h.m==16){vec2 q=p.xy*5.;float s=h21(floor(q));vec2 pc=vec2(p.x-1.1,p.y-2.25);float r=length(pc);
    m.e=vec3(.02,.01,.05)+hue(s)*step(.985,s)*smoothstep(.35,.1,length(fract(q)-.5))*1.1+vec3(.9,.3,.7)*.5*smoothstep(.42,.4,r)*(.4+.6*smoothstep(-.4,.4,pc.y+pc.x*.3))
      +vec3(.3,.9,1.)*.9*smoothstep(.02,0.,abs(length(pc*vec2(1.,3.2))-.7))*step(.4,r);m.lit=false;}
  else if(h.m==10){vec3 nl=n*uBallR,q=nl*1.9;float w=n31(q*1.6+3.1),s=n31(q+w*2.2+vec3(0.,7.,0.)),s2=n31(q*2.4+w*1.5+11.);   /* the swirl, in ball space */
    vec3 a=mix(vec3(.05,.02,.16),uBallA,smoothstep(.42,.6,s));a=mix(a,uBallB,smoothstep(.6,.74,s2));
    float hole=0.;for(int i=0;i<3;i++){vec3 hd=normalize(i==0?vec3(0.,1.,.55):i==1?vec3(-.17,1.,-.32):vec3(.17,1.,-.32));hole=max(hole,smoothstep(.9935,.9965,dot(nl,hd)));}
    float F=.05+.95*pow(1.-max(dot(-rd,n),0.),5.);m.a=a*.7*(1.-hole);m.e=(a*(.3+.25*(s+s2))*.7+envr(reflect(rd,n))*F*1.5)*(1.-hole);m.ks=4.*(1.-hole);m.sp=60.;}
  else if(h.m==11||h.m==12){vec3 nl=pinN(h.l);m.n=h.m==11?uPinR[h.id]*nl:nl;float y=h.l.y;
    float stripe=(step(.232,y)-step(.246,y))+(step(.254,y)-step(.268,y)),ao=.5+.5*smoothstep(0.,.07,y),fr=pow(1.-max(dot(-rd,m.n),0.),2.5),fl=h.m==11?1.+uFx.y*.5:.6;
    m.a=mix(vec3(.95,.95,.97),vec3(.95,.06,.2),stripe)*.8*ao*fl;m.e=mix(vec3(.25,.32,.85),vec3(1.,.05,.3),stripe)*(.22+.35*fr)*ao*fl;m.ks=1.6;m.sp=28.;}
  else if(h.m==13){m.a=vec3(.08,.07,.1);m.e=vec3(1.,.55,.1)*1.6*step(.5,fract(p.x*6.-uT*3.))*step(.5,-n.z)*smoothstep(.02,.0,abs(p.y-uSet.y-.05));}
  else if(h.m==14){m.a=vec3(.1,.1,.13);m.e=vec3(.6,.7,1.)*.6*step(.5,-n.y)*step(.8,fract(p.x*8.));}
  return m;}
void main(){
  vec2 fc=gl_FragCoord.xy,mp=vec2(fc.x,uRes.y-fc.y);vec3 eye=uEye;mat3 cam=uCam;float tn=uTan;vec2 uv;
  if(uPip.z>0.&&mp.x>=uPip.x&&mp.x<uPip.x+uPip.z&&mp.y>=uPip.y&&mp.y<uPip.y+uPip.w){
    eye=uEye2;cam=uCam2;tn=uTan2;uv=vec2((mp.x-uPip.x)/uPip.z*2.-1.,1.-(mp.y-uPip.y)/uPip.w*2.);uv.x*=uPip.z/uPip.w;}
  else{uv=fc/uRes*2.-1.;uv.x*=uRes.x/uRes.y;}
  vec3 rd=normalize(cam*vec3(uv*tn,1.));rd+=vec3(equal(rd,vec3(0.)))*1e-6;
  /* two bounces through one trace / material / light site: the primary ray, then the mirror ray off the lane */
  vec3 col=vec3(0.),thr=vec3(1.),ro=eye;float dist=0.;
  for(int b=0;b<2;b++){bool sec=b>0;Hit h=trace(ro,rd,sec);Mat m=material(h,rd,sec);
    float spc=0.;vec3 L=m.lit?light(h.p,m.n,h.k,m.sh,rd,m.sp,spc):vec3(0.);
    vec3 c=m.a*L*m.ao+m.e+spc*m.ks;dist+=min(h.t,200.);c=mix(c,vec3(.012,.006,.03),1.-exp(-max(dist-8.,0.)*.035));col+=thr*c;
    if(h.m!=1||sec||uQ==0)break;
    vec3 r=reflect(rd,m.rn);r.y=abs(r.y);r=normalize(r+(vec3(h21(fc+.31),0.,h21(fc*1.7+5.1))-.5)*m.ro);
    thr*=(.04+.96*pow(1.-max(dot(-rd,m.rn),0.),5.))*m.gl;ro=h.p+vec3(0.,.002,0.);rd=r+vec3(equal(r,vec3(0.)))*1e-6;}
  col*=uFx.z;col=1.-exp(-col*1.05);col=pow(col,vec3(1./2.2));
  col+=(h21(floor(fc))-.5)/255.*1.5;
  o=vec4(col,1.);
}`;
let P_SC=null,SCN=null,RPX=null,RP32=null,MKT=null,SC_OK=false;
let QL=2;const QFIX=(location.search.match(/[?&]q=(\d)/)||[])[1];if(QFIX!=null)QL=+QFIX;
const PINU=new Float32Array(40),PINR=new Float32Array(90),CAM1=new Float32Array(9),CAM2=new Float32Array(9),BALLR=new Float32Array(9),PB=new Float32Array(6);
function sceneInit(){
  if(!gl)return;
  try{P_SC=prog(VS,FS_SCENE);SC_OK=true;}catch(e){SC_OK=false;console.warn('scene shader',e);$('err').textContent='This game needs WebGL2 with a capable shader compiler.';$('err').style.display='grid';return;}
  MKT=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,MKT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function sceneTarget(){
  if(!SC_OK)return;if(SCN){gl.deleteTexture(SCN.t);gl.deleteFramebuffer(SCN.f);}
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  SCN={t,f};RPX=new Uint8Array(W*H*4);RP32=new Uint32Array(RPX.buffer);
}
RESCB.push(sceneTarget);
function uploadMask(){if(!SC_OK)return;gl.bindTexture(gl.TEXTURE_2D,MKT);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,MKC);gl.generateMipmap(gl.TEXTURE_2D);}
/* camera basis as a column-major mat3: right, up, forward (right = up x forward keeps +x on screen right) */
function camMat(out,e,t){let fx=t[0]-e[0],fy=t[1]-e[1],fz=t[2]-e[2];const fl=Math.hypot(fx,fy,fz);fx/=fl;fy/=fl;fz/=fl;
  let rx=fz,rz=-fx;const rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl;out[0]=rx;out[1]=0;out[2]=rz;out[3]=fy*rz;out[4]=fz*rx-fx*rz;out[5]=-fy*rx;out[6]=fx;out[7]=fy;out[8]=fz;}
function bodyMat(out,b){out[0]=b.e0x;out[1]=b.e0y;out[2]=b.e0z;out[3]=b.ax;out[4]=b.ay;out[5]=b.az;out[6]=b.e2x;out[7]=b.e2y;out[8]=b.e2z;}
/* draw the scene into the W x H target and read it straight back into RBUF (GL rows are bottom-up) */
function drawScene(){
  const u=P_SC.u;gl.bindFramebuffer(gl.FRAMEBUFFER,SCN.f);gl.viewport(0,0,W,H);gl.useProgram(P_SC.p);
  gl.uniform2f(u.uRes,W,H);gl.uniform1f(u.uT,S.t);gl.uniform1i(u.uQ,QL);
  camMat(CAM1,CAM.e,CAM.t);gl.uniform3fv(u.uEye,CAM.e);gl.uniformMatrix3fv(u.uCam,false,CAM1);gl.uniform1f(u.uTan,CAM.tn);
  camMat(CAM2,PIPC.e,PIPC.t);gl.uniform3fv(u.uEye2,PIPC.e);gl.uniformMatrix3fv(u.uCam2,false,CAM2);gl.uniform1f(u.uTan2,PIPC.tn);
  gl.uniform4f(u.uPip,PIPC.x,PIPC.y,PIPC.on?PIPC.w:0,PIPC.h);
  const b=PW.ball;gl.uniform4f(u.uBall,b.x,b.y,b.z,b.on?1:0);bodyMat(BALLR,b);gl.uniformMatrix3fv(u.uBallR,false,BALLR);
  gl.uniform3fv(u.uBallA,BSTY.a);gl.uniform3fv(u.uBallB,BSTY.b);
  /* pins: base position + rotation, and one box around every live pin (pins lie within .4 m of their base) */
  PB[0]=PB[1]=PB[2]=1e3;PB[3]=PB[4]=PB[5]=-1e3;
  for(let i=0;i<10;i++){const p=PW.pins[i],o=i*4,bx=p.x-p.ax*PCOM,by=p.y-p.ay*PCOM,bz=p.z-p.az*PCOM;PINU[o]=bx;PINU[o+1]=by;PINU[o+2]=bz;PINU[o+3]=p.on?1:0;
    const r=i*9;PINR[r]=p.e0x;PINR[r+1]=p.e0y;PINR[r+2]=p.e0z;PINR[r+3]=p.ax;PINR[r+4]=p.ay;PINR[r+5]=p.az;PINR[r+6]=p.e2x;PINR[r+7]=p.e2y;PINR[r+8]=p.e2z;
    if(p.on){const cx=bx+p.ax*.19,cy=by+p.ay*.19,cz=bz+p.az*.19;PB[0]=Math.min(PB[0],cx-.21);PB[1]=Math.min(PB[1],cy-.21);PB[2]=Math.min(PB[2],cz-.21);PB[3]=Math.max(PB[3],cx+.21);PB[4]=Math.max(PB[4],cy+.21);PB[5]=Math.max(PB[5],cz+.21);}}
  gl.uniform4fv(u['uPin[0]'],PINU);gl.uniformMatrix3fv(u['uPinR[0]'],false,PINR);gl.uniform3f(u.uPB0,PB[0],PB[1],PB[2]);gl.uniform3f(u.uPB1,PB[3],PB[4],PB[5]);
  gl.uniform4f(u.uSet,PW.sw.z,PS.on?PW.sw.y:.9,PS.on?PS.ty:.98,0);
  gl.uniform4f(u.uAim,AIMU.x,AIMU.a,AIMU.on?1:0,AIMU.al);
  gl.uniform4f(u.uFx,G.strobe,G.pinFlash,.8,0);gl.uniform4f(u.uNb,NBR[0],NBR[1],NBR[2],NBR[3]);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,MKT);gl.uniform1i(u.uMask,0);
  gl.bindVertexArray(VAO);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,RPX);
  for(let y=0;y<H;y++)RBUF.set(RP32.subarray((H-1-y)*W,(H-y)*W),y*W);
}
