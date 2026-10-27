${GLSL_MATS}
uniform sampler2D uState;uniform sampler2D uSpr;uniform sampler2D uLight;uniform sampler2D uLDir;uniform sampler2D uEmit;
uniform float uTime;uniform float uAmb;uniform float uLQ;uniform vec2 uLSz;
uniform vec3 uTint;uniform vec3 uBackA;uniform vec3 uBackB;uniform vec3 uCryst;uniform vec3 uIce;
out vec4 o;
int matAt(ivec2 q){return int(texelFetch(uState,clamp(q,ivec2(0),ivec2(319,179)),0).r*255.+.5);}
bool opq(int m){return !(m==AIR||m==WATER||m==STEAM||m==SMOKE);}
/* the cave's far wall: columnar basalt with slow joints and a little grain */
vec3 backwall(vec2 p){
  float big=vn(p*.035)*.6+vn(p*.09+7.)*.4;
  float cx=p.x*.07+vn(vec2(p.y*.03,3.))*1.6,j=abs(fract(cx)-.5);
  float joint=smoothstep(.02,.11,j);
  float frac=smoothstep(.0,.08,abs(fract(p.y*.045+vn(vec2(floor(cx),p.y*.01))*2.)-.5));
  float grain=.85+.3*h21(p);
  return mix(uBackA,uBackB,big)*(.55+.45*joint*frac)*grain*2.3;
}
vec3 rockAlb(vec2 p,float aux){
  float strata=.5+.5*sin(p.y*.38+vn(p*.04)*7.);
  vec3 a=mix(uBackB*2.4,uBackB*3.8+vec3(.03,.02,.015),strata*.6+aux*.4);
  return a*(.78+.4*vn(p*.33+aux*3.));
}
/* steel tempers through straw, bronze, purple and blue as a thin oxide forms between ~200 and ~330 C */
vec3 temper(float T){
  float k=clamp((T-200.)/130.,0.,1.);
  vec3 c=k<.25?mix(vec3(1),vec3(1.5,1.25,.6),k*4.):k<.5?mix(vec3(1.5,1.25,.6),vec3(1.1,.6,.35),(k-.25)*4.):k<.75?mix(vec3(1.1,.6,.35),vec3(.8,.45,1.2),(k-.5)*4.):mix(vec3(.8,.45,1.2),vec3(.45,.7,1.5),(k-.75)*4.);
  return T<200.||T>520.?vec3(1):mix(c,vec3(1),clamp((T-330.)/190.,0.,1.));
}
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);vec2 pf=vec2(p);
  vec4 s=texelFetch(uState,p,0);int m;float T;cellOf(s,m,T);float aux=s.b,ex=s.a;
  vec2 luv=(pf+.5)/uLSz;
  vec3 L=texture(uLight,luv).rgb*(uLQ<.5?2.6:1.);
  vec2 ld=texture(uLDir,luv).rg;
  L+=uAmb*uTint*(1.+.6*smoothstep(80.,20.,pf.y));
  vec3 em=texelFetch(uEmit,p,0).rgb;
  vec3 col;float haze=0.;
  /* outward surface normal from the 8 neighbours, for rim light and metal sheen */
  vec2 n=vec2(0);bool edge=false;
  if(opq(m)){
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){if(i==0&&j==0)continue;if(!opq(matAt(p+ivec2(i,j))))n+=vec2(i,j);}
    edge=dot(n,n)>.01;
  }
  float face=0.;
  if(edge){vec2 nn=normalize(n);float ll=length(ld);face=ll>1e-4?dot(nn,ld/ll):0.;}
  float rim=edge?(.75+.45*max(face,0.)):.82;
  if(m==AIR||m==STEAM||m==SMOKE){
    col=backwall(pf)*L*.62;
    if(T>420.)col+=bb(T)*.05;
    /* steam and smoke are drawn as a smoothed density so clouds read as vapour, not dots */
    float st=0.,sm=0.;
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){int q=matAt(p+ivec2(i,j));float w=(i==0&&j==0)?2.:1.;if(q==STEAM)st+=w;else if(q==SMOKE)sm+=w;}
    st/=10.;sm/=10.;
    if(st>0.){float k=clamp(st*1.25,0.,1.)*(m==STEAM?.92:.6);col=mix(col,vec3(.8,.84,.9)*(L*.95+.025)+bb(T)*.02,k);}
    if(sm>0.){col=mix(col,vec3(.16,.14,.14)*(L*.8+.02),clamp(sm*1.2,0.,1.)*.8);}
    haze=clamp((T-120.)/650.,0.,1.)*.95;
  }
  else if(m==WATER){
    vec3 thru=backwall(pf)*L*.5*vec3(.35,.65,.9);
    vec3 w=vec3(.025,.11,.19)*(L*1.3+.02);
    col=mix(thru,w,.55)+vec3(.04,.06,.07)*L*(.6+.8*vn(pf*.5+vec2(uTime*1.5,0.)));
    if(matAt(p-ivec2(0,1))==AIR||matAt(p-ivec2(0,1))==STEAM){col+=L*vec3(.32,.52,.62)*.55+vec3(.5,.7,.8)*L*step(.93,h21(pf+floor(uTime*6.)))*.6;}
    if(T>55.)col=mix(col,vec3(.6,.7,.75)*(L+.03),clamp((T-55.)/45.,0.,.5)*h21(pf+floor(uTime*20.)));
  }
  else if(m==LAVA){
    /* molten iron churns: a drifting Worley pattern of brighter seams between cooler cells, and a dimmer skin */
    vec2 q=pf*vec2(.17,.24)+vec2(uTime*.11,-uTime*.07);vec2 qi=floor(q),qf=fract(q);float d1=9.,d2=9.;
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(i,j),o=vec2(h21(qi+g),h21(qi+g+17.3));o=.5+.45*sin(uTime*.6+6.2831*o);float d=length(g+o-qf);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
    float seam=1.-smoothstep(.0,.22,d2-d1);
    bool skin=matAt(p-ivec2(0,1))==AIR;
    col=vec3(.07,.025,.015)*L+em*(skin?.62:1.)*(.72+.55*seam);
  }
  else if(m==EMBER){col=em*1.2;}
  else if(m==ROCK||m==RUBBLE||m==BED){
    vec3 a=m==BED?uBackA*1.1:rockAlb(pf,aux)*(m==RUBBLE?1.15:1.);
    col=a*L*rim+em;
  }
  else if(m==IRON||m==SLAG||m==RAIL||m==HOUSE){
    vec3 a;
    if(m==IRON)a=vec3(.17,.17,.19)*(.82+.36*aux)*temper(T);
    else if(m==SLAG)a=vec3(.045,.04,.055)*(.8+.5*aux)+vec3(.05,.02,.08)*vn(pf*.6);
    else if(m==RAIL){a=vec3(.2,.19,.21)*((p.y&1)==0?1.:.7);if((p.x&7)==3)a*=1.6;}
    else{a=vec3(.11,.09,.09)*(.85+.3*aux);if(((p.x+p.y)&3)==0&&aux>.7)a*=1.9;}
    float sheen=edge?pow(max(face,0.),3.)*(m==SLAG?.9:.55):0.;
    if(m==IRON||m==SLAG)em*=.62+.7*vn(pf*.55+aux*3.)*(T>700.?1.:.4)+.15*step(.8,vn(pf*.21+uTime*.05));
    col=a*L*rim+L*sheen*(m==SLAG?vec3(.55,.45,.75):vec3(.6,.6,.65))*.5+em;
  }
  else if(m==ICE){
    float tw=step(.985,h21(pf*1.7+floor(uTime*2.5+aux*7.)));
    col=uIce*(L*.85+.012)*(.85+.3*aux)+L*(edge?.35:.1)+tw*L*1.8+vec3(.01,.025,.04);
  }
  else if(m==SNOW){col=vec3(.82,.88,.98)*(L*.95+.012)*(.88+.24*aux)+step(.99,h21(pf+floor(uTime*3.)))*L*1.2;}
  else if(m==CRYST){col=uCryst*L*.4+em*1.1+step(.97,h21(pf+floor(uTime*4.)))*uCryst*1.5;}
  else col=vec3(1,0,1);
  /* sprites: lit pixel art (255) or self-lit pixels */
  vec4 sp=texelFetch(uSpr,p,0);
  if(sp.a>0.){int a=int(sp.a*255.+.5);vec3 c=pow(sp.rgb,vec3(2.2));col=a==255?c*(L*1.08+uTint*.03+.035):c*float(a)/254.*6.;haze=0.;}
  o=vec4(col,haze);
}
