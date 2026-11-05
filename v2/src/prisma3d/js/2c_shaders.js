/* =====================================================================================
   2c. SHADERS
   WORLD  — everything solid: the city (track space) and the vehicles (model space).
            Lighting is worked out in track space, where the street lamps, the tunnel rings
            and the neon signs repeat on a fixed rhythm, so they cost a few lines of maths
            instead of a list of lights.
   SKY    — the night sky, the moon, stars and the city's glow on the horizon.
   FX     — additive streaks: rain, sparks, light ribbons, drone beams.
   POST   — bright pass, blur, the PRISM TRAILS (light smeared into rainbow streaks by speed),
            and the final picture: radial speed blur that splits colour at the edges, a tight
            glow, a saturated grade, and the dot-matrix HUD laid over the top.
   ===================================================================================== */
const GLSL_CURVE=`
uniform vec3 uPA,uPF,uPP;uniform vec2 uYA,uYF,uYP;
float pX(float z){return uPA.x*sin(z*uPF.x+uPP.x)+uPA.y*sin(z*uPF.y+uPP.y)+uPA.z*sin(z*uPF.z+uPP.z);}
float pY(float z){return uYA.x*sin(z*uYF.x+uYP.x)+uYA.y*sin(z*uYF.y+uYP.y);}
`;
const GLSL_HASH=`
float ih(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return float(x)/4294967296.;}
float ih2(int a,int b){return ih(uint(a*73856093^b*19349663));}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
vec3 hue(float h){return clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.);}
`;
const WORLD_VS=GLSL_CURVE+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in vec4 aExt;
uniform mat4 uVP;uniform vec3 uEye;uniform int uSpace;uniform mat4 uModel;uniform vec4 uOff;uniform float uMirror;
out vec3 vQ;out vec3 vN;out vec4 vCol;out vec4 vExt;out vec3 vRel;out vec3 vL;
void main(){
  vec3 rel,n=aNrm;
  if(uSpace==0){vec3 p=vec3(aPos.x+uOff.x,aPos.y+uOff.y,aPos.z*uOff.w+uOff.z);rel=vec3(p.x+pX(p.z),p.y+pY(p.z),p.z)-uEye;}
  else{rel=(uModel*vec4(aPos,1.)).xyz;n=normalize(mat3(uModel)*aNrm);}
  vec3 w=rel+uEye;float ry=pY(w.z);
  vQ=vec3(w.x-pX(w.z),w.y-ry,w.z);
  if(uMirror>.5){rel.y=2.*(ry-uEye.y)-rel.y;}
  vN=n;vCol=aCol;vExt=aExt;vRel=rel;vL=aPos;
  gl_Position=uVP*vec4(rel,1.);
}`;
const WORLD_FS=GLSL_HASH+`
in vec3 vQ;in vec3 vN;in vec4 vCol;in vec4 vExt;in vec3 vRel;in vec3 vL;
uniform int uStage;uniform float uTime,uWet,uRain,uFogD,uMirror,uReflOn,uSpeed,uBolt;
uniform vec3 uN1,uN2,uN3,uFogC,uSkyA,uSkyB,uEyeQ;
uniform sampler2D uRefl;uniform vec2 uRes;
uniform vec4 uPad[6];
uniform vec4 uLP[14];uniform vec4 uLC[14];uniform vec4 uLD[14];uniform int uNL;
uniform vec3 uPaint;uniform vec4 uVeh;uniform vec4 uVeh2;
out vec4 o;
vec3 neon(float k){k=fract(k);return k<.34?uN1:k<.67?uN2:uN3;}
vec3 neonI(int i){return i==0?uN1:i==1?uN2:uN3;}
/* the neon environment that glossy paint and glass reflect: sky, then a band of city light on the horizon */
vec3 env(vec3 r){
  float y=r.y;vec3 c=mix(uSkyB,uSkyA,smoothstep(-.05,.5,y))*1.4;
  float a=atan(r.x,r.z);float band=exp(-abs(y-.04)*14.);
  float cell=floor(a*5.);vec3 nc=neon(h2(vec2(cell,3.))*3.);
  c+=nc*band*(.5+1.1*step(.45,fract(a*5.)))*1.3;
  c+=mix(uN1,uN2,.5)*exp(-abs(y+.2)*6.)*.25;
  c+=vec3(1.,.97,.92)*pow(max(y,0.),6.)*.08;
  return c;
}
/* every light that can touch a point, in track space */
vec3 gSpec;
vec3 lightsAt(vec3 q,vec3 n,vec3 vd,float shin,float ks){
  vec3 L=vec3(0);gSpec=vec3(0);
  /* street lamps every 26 m on both sides (downtown and the market) */
  if(uStage<2){float LP=26.,lz0=floor(q.z/LP+.5)*LP;
    for(int k=-1;k<=1;k++){float lz=lz0+float(k)*LP;
      for(int sd=-1;sd<=1;sd+=2){vec3 v=vec3(float(sd)*8.3,7.45,lz)-q;float dd=dot(v,v);vec3 l=v*inversesqrt(dd);
        float cone=.25+.75*smoothstep(.2,.75,l.y);float a=cone/(1.+dd*.028);
        L+=vec3(1.,.66,.36)*2.4*a*max(dot(n,l),0.);
        gSpec+=vec3(1.,.7,.42)*2.4*a*pow(max(dot(n,normalize(l+vd)),0.),shin)*ks;}}}
  /* the tunnel's rings of light every 16 m */
  if(uStage==3){float RZ=16.,rz0=floor(q.z/RZ+.5)*RZ;bool open=fract(q.z/700.)>=.82;
    if(!open)for(int k=-1;k<=1;k++){vec3 v=vec3(0.,10.5,rz0+float(k)*RZ)-q;float dd=dot(v,v);vec3 l=v*inversesqrt(dd);float a=1./(1.+dd*.012);
      L+=uN1*1.5*a*max(dot(n,l),.12);gSpec+=uN1*1.5*a*pow(max(dot(n,normalize(l+vd)),0.),shin)*ks;}}
  /* coloured spill from the signs on each block (the same hash the signs were coloured with) */
  if(uStage==0||uStage==1||(uStage==3&&fract(q.z/700.)>=.82)){
    float P=uStage==1?26.:34.;int cell=int(floor(q.z/P));
    for(int sd=0;sd<2;sd++){float sx=sd==0?-1.:1.;
      for(int k=-1;k<=1;k++){int c=cell+k;float zc=(float(c)+.5)*P;int id=c*2+sd;float r=ih(uint(id*7+3));
        vec3 nc=neonI(int(r*3.));vec3 v=vec3(sx*12.8,5.,zc)-q;float dd=dot(v,v);vec3 l=v*inversesqrt(dd);
        float a=(.8+.6*ih(uint(id*13+5)))/(1.+dd*.045);
        L+=nc*1.7*a*max(dot(n,l),.0);gSpec+=nc*1.7*a*pow(max(dot(n,normalize(l+vd)),0.),shin)*ks;}}}
  /* the vehicles' own lights, the bike's underglow and the drones' searchlights */
  for(int i=0;i<14;i++){if(i>=uNL)break;vec3 v=uLP[i].xyz-q;float dd=dot(v,v)+.04;vec3 l=v*inversesqrt(dd);
    float a=1./(1.+dd*uLP[i].w);
    if(uLD[i].w>-1.5)a*=smoothstep(uLD[i].w,uLD[i].w+.08,dot(-l,uLD[i].xyz));
    L+=uLC[i].rgb*a*max(dot(n,l),0.);gSpec+=uLC[i].rgb*a*pow(max(dot(n,normalize(l+vd)),0.),shin)*ks;}
  return L;
}
vec3 ambient(vec3 n){return mix(uSkyB*.5,uSkyA*.9+uSkyB*.2,n.y*.5+.5)+uFogC*.35+vec3(.012,.01,.02);}
/* filtered stripes: crisp up close, a smooth average in the distance instead of shimmer */
float fstep(float e0,float x,float w){return clamp((x-e0)/max(w,1e-4)+.5,0.,1.);}
float band(float x,float a,float b,float w){return fstep(a,x,w)*(1.-fstep(b,x,w));}
void main(){
  if(uMirror>.5&&vQ.y<-.08)discard;
  int m=int(vCol.a+.5);
  vec3 q=vQ,n=normalize(vN);vec3 rv=uMirror>.5?vec3(vRel.x,-vRel.y,vRel.z):vRel;float dist=length(rv);vec3 vd=normalize(-rv);
  if(dot(n,vd)<0.)n=-n;
  /* in track space the view direction is close enough to the world one for lighting */
  vec3 col=vec3(0),emi=vec3(0);float shin=24.,ks=0.;
  vec3 alb=vCol.rgb;
  if(m==5){ /* plain glow: lamp heads, strips, tubes */
    float fl=vExt.y>0.?(.65+.35*step(.08,fract(uTime*vExt.y+vExt.z))):1.;emi=alb*vExt.x*fl;}
  else if(m==12){ /* paper lanterns */
    float rib=.75+.25*smoothstep(.0,.3,abs(fract(atan(n.x,n.z)*1.27)-.5));float cap=smoothstep(.75,.9,abs(n.y));
    emi=alb*(1.6+.35*sin(uTime*2.3+vExt.x*17.))*rib*(1.-cap*.85);}
  else if(m==7){ /* neon sign panels: tubes round the edge, glyph blocks inside, a sweep that runs through them */
    vec2 uv=vExt.zw;float seed=vExt.x;vec2 px=fwidth(uv);
    float edge=max(band(uv.x,.03,.07,px.x*1.5),band(uv.x,.93,.97,px.x*1.5))*band(uv.y,.03,.97,px.y)+max(band(uv.y,.03,.07,px.y*1.5),band(uv.y,.93,.97,px.y*1.5))*band(uv.x,.03,.97,px.x);
    float vert=vExt.y;vec2 g=vert>.5?vec2(3.,7.):vec2(9.,3.);vec2 gc=floor((uv-.12)/.76*g),gf=fract((uv-.12)/.76*g);
    float inside=step(.12,uv.x)*step(uv.x,.88)*step(.12,uv.y)*step(uv.y,.88);
    float on=step(.38,h2(gc+seed*31.7))*inside;float blk=band(gf.x,.12,.88,px.x*g.x*1.5)*band(gf.y,.15,.85,px.y*g.y*1.5);
    float far=smoothstep(.12,.35,max(px.x*g.x,px.y*g.y));blk=mix(blk,.55,far);
    float sweep=.55+.45*smoothstep(.0,.25,fract((vert>.5?uv.y:uv.x)*.6-uTime*.35+seed));
    float flick=step(.04,fract(uTime*.7+seed*3.))*.4+.6;
    vec3 c2=neon(seed*3.+.33);
    emi=alb*edge*2.6+mix(alb,c2,.35)*on*blk*sweep*2.*flick+alb*.06;}
  else if(m==8){ /* the giant video billboards: bold shapes, scan lines, colour cycling */
    vec2 uv=vExt.zw;float seed=vExt.x,t=uTime*.25+seed*7.;float k=floor(t);float f=fract(t);
    vec3 c1=neon(h2(vec2(k,seed))*3.),c2=neon(h2(vec2(k,seed+1.))*3.+.4);
    float sh;float mode=floor(h2(vec2(k,seed*3.))*4.);
    vec2 p=uv-.5;
    if(mode<1.)sh=step(length(p*vec2(2.,1.))+.05*sin(atan(p.y,p.x)*6.+uTime*2.),.33);
    else if(mode<2.)sh=step(.5,fract(uv.x*4.+uv.y*2.-uTime*.8));
    else if(mode<3.)sh=step(abs(p.y+.15*sin(p.x*9.+uTime*3.)),.12);
    else sh=step(.6,h2(floor(uv*vec2(12.,6.))+k));
    vec3 c=mix(c1*.35,c2,sh);c*=.85+.15*sin(uv.y*240.);c*=smoothstep(0.,.05,f)*smoothstep(1.,.95,f)*.6+.4;
    float frame=1.-band(uv.x,.015,.985,fwidth(uv.x))*band(uv.y,.03,.97,fwidth(uv.y));
    emi=c*1.9+vec3(.9)*frame*.3;}
  else if(m==17){ /* the prism stripe on the bike: the spectrum, running backwards as you speed up */
    float h=fract(vL.z*.45-uTime*(.3+uSpeed*1.4));emi=hue(h)*(1.6+uVeh.z*2.5)+.15;}
  else if(m==10){ /* vehicle lights. ext.x: 0 head, 1 tail, 2 left blink, 3 right blink, 4 amber beacon, 5 police, 6 thruster, 7 underglow */
    int ty=int(vExt.x+.5);float on=1.;vec3 c=alb;
    if(ty==1){c=vec3(1.,.04,.03)*(1.3+uVeh.x*2.2);}
    else if(ty==2||ty==3){on=(uVeh.y>.5&&abs(uVeh.y-float(ty-1))<.5)?step(.5,fract(uTime*2.2)):0.;c=vec3(1.,.55,.05)*3.;}
    else if(ty==4){float a=atan(vL.x-vExt.z,vL.z)+uTime*9.;on=.25+.75*pow(max(cos(a),0.),3.);c=vec3(1.,.5,.06)*3.2;}
    else if(ty==5){float ph=step(.5,fract(uTime*3.+vExt.z));c=mix(vec3(.15,.3,1.),vec3(1.,.08,.05),ph)*3.5;}
    else if(ty==6){c=alb*(1.1+uVeh.z*2.6);}
    else if(ty==7){c=alb*(.9+uVeh.z*1.2);}
    else c=alb*3.;
    emi=c*on;}
  else if(m==14){ /* the city far below the skyway: a grid of lit streets with traffic crawling along them */
    vec2 p=q.xz;vec2 gq=p/36.;vec2 cell=floor(gq),f=fract(gq);vec2 px=fwidth(gq);
    float st=max(band(f.x,.0,.06,px.x*2.),band(f.y,.0,.06,px.y*2.));
    float blocks=step(.25,h2(cell))*(1.-st);
    vec2 wc=floor(p/3.);float win=step(.72,h2(wc+cell))*blocks;
    float car=step(.93,fract(p.y*.05+uTime*.6*(h2(cell)>.5?1.:-1.)+h2(cell+7.)))*band(f.x,.0,.06,px.x*2.);
    float car2=step(.93,fract(p.x*.05+uTime*.5+h2(cell+3.)))*band(f.y,.0,.06,px.y*2.);
    vec3 sc=mix(vec3(1.,.6,.3),uN2,.3);
    emi=sc*st*.5+mix(vec3(1.,.8,.5),uN3,h2(wc))*win*.5+vec3(1.,.95,.9)*car*1.5+vec3(1.,.15,.1)*car2*1.2;
    alb=vec3(.02);}
  else{
    /* ---------- lit surfaces ---------- */
    float refl=0.,rough=1.;vec3 nn=n;
    if(m==1){ /* the road: asphalt, lane paint, puddles, rain rings, and the mirror of the city */
      vec2 rq=q.xz;float ax=abs(q.x);
      float grain=vn2(rq*vec2(1.3,.9))*.5+vn2(rq*6.)*.3+vn2(rq*23.)*.2;
      alb=vec3(.028,.028,.034)*(.65+.7*grain);
      float wz=fwidth(q.z),wx=fwidth(q.x);
      float dash=band(fract(q.z/9.),0.,.45,wz/9.*1.5);
      float mk=band(ax,4.39,4.61,wx*1.5)*dash+band(ax,8.62,8.86,wx*1.5);
      if(uStage==2||uStage==3)mk=max(mk,band(ax,-.12,.12,wx*1.5)*band(fract(q.z/6.),0.,.5,wz/6.*1.5));
      alb=mix(alb,vec3(.6,.6,.58),mk*.9);
      float pud=smoothstep(.42,.72,vn2(rq*vec2(.11,.045)+3.1));
      float wet=uWet*(.45+.55*pud)*(1.-mk*.6);
      rough=mix(.55,.04,pud)*(1.-.3*uWet);
      if(uRain>.5){vec2 cc=floor(rq/1.1),cf=fract(rq/1.1)-.5;float ph=fract(uTime*1.3+h2(cc));float rr=length(cf+vec2(h2(cc+1.),h2(cc+2.))*.3-.15);
        float ring=smoothstep(.05,0.,abs(rr-ph*.45))*(1.-ph);nn=normalize(n+vec3(cf.x,0.,cf.y)*ring*1.4);}
      nn=normalize(nn+vec3(vn2(rq*1.9)-.5,0.,vn2(rq.yx*1.6)-.5)*.05*(1.-pud));
      refl=wet;shin=60.;ks=.8*wet;
      for(int i=0;i<6;i++){vec4 pd=uPad[i];if(pd.z<=0.)continue;float lz=q.z-pd.x;
        if(lz>0.&&lz<pd.z&&abs(q.x-pd.y)<2.){float ch=step(.5,fract(lz*.25-abs(q.x-pd.y)*.25-uTime*2.));emi+=mix(uN2,vec3(.4,.9,1.),.5)*(.35+ch*2.4);}}
    }
    else if(m==2){ /* pavement and concrete: slabs, a little wet */
      vec2 sq=vec2(q.x,q.z);vec2 tl=fract(sq/vec2(1.5,1.5));vec2 px=fwidth(sq/1.5);
      float seam=1.-band(tl.x,.03,.97,px.x)*band(tl.y,.03,.97,px.y);
      alb=vCol.rgb*(.8+.4*vn2(floor(sq/1.5)*3.1))*(1.-seam*.4);refl=uWet*.3;rough=.35;shin=30.;ks=.3*uWet;}
    else if(m==3){ /* building fronts: rows of windows, lit at random, shops along the ground */
      bool sideFace=abs(n.x)>.5;vec2 fc=sideFace?vec2(q.z,q.y):vec2(q.x,q.y);
      if(abs(n.y)>.5){alb=vCol.rgb*.6;}
      else{
        float seed=vExt.x,lp=vExt.y,fh=vExt.w,ww=vExt.z>1.5?1.6:2.5;
        vec2 g=fc/vec2(ww,fh);vec2 cell=floor(g),f=fract(g);vec2 px=fwidth(g);
        float win=band(f.x,.14,.86,px.x*1.5)*band(f.y,.22,.8,px.y*1.5);
        float r=h2(cell+seed*13.7),r2=h2(cell*1.7+seed);
        float lit=step(1.-lp,r);
        vec3 wc=mix(vec3(1.,.72,.42),vec3(.62,.8,1.),step(.6,r2));wc=mix(wc,neon(r2*3.),step(.9,r2)*.7);
        float tv=step(.97,r2)*(.6+.4*sin(uTime*7.+r*40.));
        float far=smoothstep(.25,.6,max(px.x,px.y));
        float wl=mix(win*lit,lp*.36,far);
        vec3 base=vCol.rgb*(.75+.5*vn2(vec2(fc.x*.08,fc.y*.4)+seed));
        base=mix(base,vec3(.012,.014,.02),win*(1.-far)*.85);
        alb=base;
        emi=(wc*(.75+.5*h2(cell+3.))+vec3(.4,.6,1.)*tv)*wl*1.15;
        /* the ground floor: shop windows, bright */
        if(q.y<4.2&&sideFace){float bay=floor(fc.x/6.),bf=fract(fc.x/6.);float sw=band(bf,.08,.92,px.x*ww/6.*2.)*band(q.y,.5,3.3,fwidth(q.y)*1.5);
          float pane=band(fract(bf*3.),.05,.95,px.x*ww/2.*2.)*band(q.y,.6,3.2,fwidth(q.y)*1.5);float on=step(.25,h2(vec2(bay,seed)));
          vec3 shop=mix(vec3(1.,.8,.55),neon(h2(vec2(bay,seed+3.))*3.),.6)*(.35+.65*smoothstep(3.3,.6,q.y));
          emi=max(emi,shop*sw*pane*on*.75);alb=mix(alb,vec3(.015),sw);refl=sw*.6;rough=.04;}
        refl=max(refl,win*(1.-far)*.25);rough=min(rough,.15);
      }
      shin=40.;ks=.15;}
    else if(m==4){ /* glass towers: the sky and the city's neon slide across them, a few floors still lit */
      vec2 fc=abs(n.x)>.5?vec2(q.z,q.y):vec2(q.x,q.y);vec2 px=fwidth(fc);
      float mul=max(band(fract(fc.x/1.8),0.,.05,px.x/1.8*2.),band(fract(fc.y/3.6),0.,.06,px.y/3.6*2.));
      float fl=floor(fc.y/3.6);float litf=step(.78,h2(vec2(fl,vExt.x)))*step(.3,h2(vec2(floor(fc.x/1.8),fl+vExt.x)));
      alb=mix(vec3(.01,.015,.03),vec3(.08),mul);emi=mix(vec3(.7,.85,1.),vec3(1.,.8,.55),h2(vec2(fl,3.)))*litf*(1.-mul)*.7;
      refl=.85*(1.-mul);rough=.03;shin=90.;ks=.6;}
    else if(m==6){alb=vCol.rgb;refl=.25;rough=.25;shin=50.;ks=.7;}                 /* dark metal */
    else if(m==9){ /* vehicle paint: a deep clear coat over metal flake */
      alb=uPaint*vCol.rgb;float dn=vn2(vL.xz*4.7+vL.y*3.1)*.65+vn2(vL.zy*11.)*.35;float dm=step(1.-uVeh.w*.55,dn);alb*=1.-dm*.75;
      refl=1.;rough=.02+dm*.5;shin=120.;ks=1.2*(1.-dm);}
    else if(m==19){alb=vec3(.008,.01,.016);refl=1.;rough=.01;shin=140.;ks=1.;}       /* vehicle glass */
    else if(m==11){ /* tunnel walls: tiles with dark seams */
      vec2 tc=vec2(q.z,atan(q.y-3.,q.x)*13.);vec2 px=fwidth(tc);vec2 f=fract(tc/vec2(2.,1.4));
      float seam=1.-band(f.x,.04,.96,px.x)*band(f.y,.05,.95,px.y);alb=vCol.rgb*(1.-seam*.55)*(.85+.3*h2(floor(tc/vec2(2.,1.4))));
      refl=.35*(1.-seam);rough=.12;shin=50.;ks=.5;
      float em=step(.97,fract(q.z/48.))*step(.5,fract(uTime*1.5))*band(q.y,1.1,1.9,fwidth(q.y));emi=vec3(1.,.08,.04)*em*3.;}
    else if(m==13){ /* ramps: chevrons and a glowing lip */
      float st=step(.5,fract(q.z*.5+abs(vL.x)*.5));alb=mix(vec3(.55,.42,.04),vec3(.03),st);
      emi=vec3(1.,.75,.1)*(1.-st)*.25;refl=.2;rough=.2;ks=.4;}
    else if(m==15){alb=vCol.rgb;rough=.6;ks=.1;shin=16.;}                            /* rubber, cloth */
    else{alb=vCol.rgb;rough=vExt.x>0.?vExt.x:.5;ks=vExt.y;shin=40.;refl=vExt.y*.3;}
    vec3 L=lightsAt(q,nn,vd,shin,ks);
    col=alb*(ambient(nn)+L)+gSpec;
    /* reflections: the road reads the mirrored city, everything glossy reads the neon environment */
    if(refl>0.){
      float fr=.04+.96*pow(1.-max(dot(vd,nn),0.),5.);
      vec3 R;
      if(m==1||m==2){
        if(uReflOn>.5&&uMirror<.5){vec2 suv=gl_FragCoord.xy/uRes;vec2 off=nn.xz*vec2(.06,.03)*(1.+rough*4.);
          float lod=rough*5.;R=vec3(0);
          /* wet asphalt smears light into vertical streaks: a few taps straight down the screen */
          for(int k=0;k<4;k++){float t=float(k)/3.;R+=textureLod(uRefl,clamp(suv+off+vec2(0.,-t*rough*.09),.001,.999),lod).rgb;}R*=.25;}
        else R=env(reflect(-vd,nn))*.35;
        col=col*(1.-refl*.6)+R*refl*mix(.45,1.,fr);
      }else{
        R=env(reflect(-vd,nn));
        /* metallic paint tints what it reflects; the clear coat on top reflects it white at grazing angles */
        vec3 tint=m==9?alb*2.2+vec3(fr*.8):vec3(mix(.06,1.,fr));
        col+=R*refl*tint*(1.-rough*.6);}
    }
  }
  vec3 c=col+emi;
  /* crisp air: clear up close, then the city sinks into its own coloured dark */
  float fd=max(dist-45.,0.)*uFogD;float fog=exp(-fd);
  c=mix(uFogC*(1.+uBolt*2.),c,fog);
  o=vec4(max(c,0.),1.);
}`;
const FS_VS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const SKY_FS=GLSL_HASH+`in vec2 vT;uniform mat3 uRot;uniform float uFov,uAsp,uMirror,uTime,uBolt;uniform int uStage;uniform vec3 uSkyA,uSkyB,uFogC,uN1,uN2,uN3;out vec4 o;
void main(){
  vec2 p=(vT*2.-1.)*vec2(uAsp,1.)*uFov*.5;vec3 rd=normalize(uRot*vec3(p,1.));if(uMirror>.5)rd.y=-rd.y;
  float y=rd.y;vec3 c=mix(uSkyB*1.2,uSkyA,smoothstep(-.02,.55,y));
  c+=uSkyB*.9*exp(-abs(y)*10.);
  /* the city's glow along the horizon, in the stage's own neon */
  float a=atan(rd.x,rd.z);c+=mix(uN1,uN2,.5+.5*sin(a*3.))*exp(-abs(y-.01)*28.)*.35;
  /* stars: sharp single points */
  vec2 sp=vec2(a*180.,y*180.);vec2 cell=floor(sp);float st=step(.992,h2(cell));vec2 f=fract(sp)-.5;
  float star=st*smoothstep(.2,.0,length(f))*smoothstep(.05,.3,y)*(uStage==2?1.3:.55)*(.6+.4*sin(uTime*2.+h2(cell+1.)*30.));
  c+=vec3(.9,.92,1.)*star;
  if(uStage==2){vec3 md=normalize(vec3(-.5,.3,.8));float m=dot(rd,md);
    float disc=smoothstep(.9988,.99905,m);vec3 mp=rd-md*m;float mare=vn2(mp.xy*900.)*.25+vn2(mp.xy*2400.)*.1;
    c+=vec3(1.,.96,.88)*disc*(2.4-mare*3.)+vec3(.5,.45,.65)*pow(max(m,0.),220.)*.6+vec3(.3,.25,.45)*pow(max(m,0.),18.)*.12;}
  c+=vec3(.5,.55,.9)*uBolt*smoothstep(-.1,.6,y)*1.5;
  o=vec4(c,1.);
}`;
/* additive streaks: one shader for rain, sparks, light ribbons and beams. Each vertex carries its own colour. */
const FX_VS=`layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in vec4 aExt;
uniform mat4 uVP;out vec4 vC;out vec2 vU;
void main(){vC=aCol;vU=aExt.xy;gl_Position=uVP*vec4(aPos,1.);}`;
const FX_FS=`in vec4 vC;in vec2 vU;out vec4 o;
void main(){float e=1.-abs(vU.y*2.-1.);e=smoothstep(0.,.6,e);float l=vU.x;o=vec4(vC.rgb*vC.a*e*l,0.);}`;
/* ---------- post ---------- */
const BRIGHT_FS=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;out vec4 o;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-.5,-.5)).rgb+texture(uTex,vT+uPx*vec2(.5,-.5)).rgb+texture(uTex,vT+uPx*vec2(-.5,.5)).rgb+texture(uTex,vT+uPx*vec2(.5,.5)).rgb;
c*=.25;c=min(c,vec3(24.));float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.0)/max(l,1e-4);o=vec4(c,1.0);}`;
const BLUR_FS=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uDir;out vec4 o;
void main(){vec3 s=texture(uTex,vT).rgb*.227027;s+=(texture(uTex,vT+uDir*1.3846).rgb+texture(uTex,vT-uDir*1.3846).rgb)*.316216;
s+=(texture(uTex,vT+uDir*3.2308).rgb+texture(uTex,vT-uDir*3.2308).rgb)*.070270;o=vec4(s,1.0);}`;
/* PRISM TRAILS: last frame's light, pushed outward from the point you're flying at, with red pushed a
   little further than green and green further than blue. Every light leaves a streak behind it, and
   the streak splits into its colours. Faster means longer streaks and a wider split. */
const TRAIL_FS=`in vec2 vT;uniform sampler2D uPrev;uniform sampler2D uNew;uniform vec2 uC;uniform vec2 uShift;uniform float uZoom,uDecay,uDisp,uGain,uAsp;out vec4 o;
void main(){
  vec2 d=vT-uC;float r=length(d*vec2(uAsp,1.));float edge=smoothstep(.05,.55,r);
  float z=uZoom*edge;
  vec2 b=uC+uShift;
  float pr=texture(uPrev,b+d*(1.-z*(1.+uDisp))).r;
  float pg=texture(uPrev,b+d*(1.-z)).g;
  float pb=texture(uPrev,b+d*(1.-z*(1.-uDisp))).b;
  vec3 p=vec3(pr,pg,pb)*uDecay;
  vec3 n=texture(uNew,vT).rgb*uGain*edge;
  o=vec4(min(p+n,vec3(40.)),1.);
}`;
const COMP_FS=`in vec2 vT;uniform sampler2D uScene,uB1,uB2,uTrail,uHud;uniform vec2 uC;uniform float uBlur,uDisp,uAsp,uFlash,uSat,uTrailK,uBurst,uGlow,uTime;
uniform vec2 uHudRes;uniform vec2 uScr;uniform float uDotOn;uniform int uTaps;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
vec3 hue(float h){return clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.);}
void main(){
  vec2 d=vT-uC;float r=length(d*vec2(uAsp,1.));
  float edge=smoothstep(.12,.8,r);
  /* speed blur toward the vanishing point; the centre stays sharp so you can always see where you're going */
  float L=uBlur*edge,D=uDisp*edge;vec3 c=vec3(0);
  for(int i=0;i<12;i++){if(i>=uTaps)break;float t=float(i)/max(float(uTaps-1),1.);float s=1.-L*t;
    c.r+=texture(uScene,uC+d*(s*(1.+D))).r;c.g+=texture(uScene,uC+d*s).g;c.b+=texture(uScene,uC+d*(s*(1.-D))).b;}
  c/=float(uTaps);
  vec3 glow=texture(uB1,vT).rgb*.5+texture(uB2,vT).rgb*.55;
  c+=glow*uGlow+texture(uTrail,vT).rgb*uTrailK;
  /* the nitro burst: a ring of spectrum that races out from the middle */
  if(uBurst>0.){float rad=.12+(1.-uBurst)*1.25;float rr=r-rad;float ring=exp(-rr*rr*2600.)*uBurst*smoothstep(.0,.15,rad-.1);c+=hue(atan(d.y,d.x*uAsp)*.159+uTime*.4)*ring*1.25;}
  c=aces(c*1.05);
  float lum=dot(c,vec3(.2126,.7152,.0722));c=max(mix(vec3(lum),c,uSat),0.);
  c=pow(c,vec3(1./2.2));
  c=mix(c,c*c*(3.-2.*c),.25);                     /* a little more contrast: deep blacks, bright neon */
  c*=1.-dot(d*vec2(uAsp,1.)*.7,d*vec2(uAsp,1.)*.7)*.5;
  c+=vec3(1.,.97,.92)*uFlash;
  /* the HUD, drawn as round LED dots: the nod to the original's matrix */
  if(uDotOn>.5){vec2 cell=vec2(vT.x,1.-vT.y)*uHudRes;vec2 id=floor(cell),f=fract(cell)-.5;vec2 huv=(id+.5)/uHudRes;
    vec4 h=texture(uHud,huv);vec4 hs=texture(uHud,vec2(vT.x,1.-vT.y));
    float dpx=uScr.y/uHudRes.y;float rad=.42,dd=length(f);float dot1=1.-smoothstep(rad-.9/dpx,rad+.9/dpx,dd);float hot=1.-smoothstep(0.,rad,dd);
    vec3 hc=pow(h.rgb,vec3(2.2));float lit=max(hc.r,max(hc.g,hc.b));
    c*=1.-hs.a*.72*(1.-min(lit*3.,1.)*.4);
    c+=hc*h.a*dot1*(.85+.6*hot)*1.15+hc*h.a*.08;}
  o=vec4(c,1.);
}`;
