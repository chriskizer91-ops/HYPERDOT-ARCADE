${GLSL_MATS}
${GLSL_ART}
/* SCULPT — V3's cavern, sphere-traced through one smooth distance field built from 2D fields.
     rock      a 2D outline extruded toward the camera to a front that bulges out deeper in the rock;
               the open cave behind recedes into a bowl; both carry 3D noise for crags
     matter    the play channel's iron, lava, ice and snow: the 2D outline extruded +-half-depth,
               every edge rounded, so cast iron sets in pillows and a lone frozen drop is a bead
     Rime      the same, thickest in the middle, cut into crystal facets when shaded
     water     a separate see-through surface that bends the ray
   then: normals, ambient occlusion, soft shadows from the heart and the lava, the original's 2D
   light, materials, a volumetric pass through the channel's air, and the far magma haze. */
precision highp sampler3D;
uniform sampler2D uFA;uniform sampler2D uFB;uniform sampler2D uState;uniform sampler2D uVox;uniform sampler2D uSpr;uniform sampler2D uGas;
uniform sampler2D uLight;uniform sampler2D uLB;uniform vec2 uLSz;uniform float uLQ;uniform sampler3D uN3;
uniform mat4 uInvVP;uniform mat4 uVP;uniform vec3 uEye;
uniform vec4 uPL[8];uniform vec4 uPC[8];uniform int uNL;
uniform vec4 uHeart;uniform vec4 uHeartFx;
uniform float uTime;uniform float uAmb;uniform vec3 uTint;uniform vec3 uBackA;uniform vec3 uBackB;uniform vec3 uCryst;uniform vec3 uIce;
uniform float uMagma;uniform int uQ;
uniform sampler2D uBack;uniform float uBackOk;uniform float uBackAsp;uniform float uBackGain;uniform vec3 uRockL;uniform float uCold;
in vec2 vT;out vec4 o;
const vec2 GS=vec2(320.,180.);const float ZP=8.;
vec2 suv(vec2 p){vec2 q=p-.5,i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return (i+f+.5)/GS;}
float n3(vec3 p){return texture(uN3,p*(1./32.)).r;}
float lum(vec3 c){return dot(c,vec3(.3,.55,.15));}
vec3 L2(vec2 q){return texture(uLight,q/uLSz).rgb*(uLQ<.5?2.6:1.);}
float rbox(vec2 q,float r){q+=r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
/* the field. m: 0 rock (1 when it is the far cave behind the channel), 2 matter, 3 Rime, 4 heart; w = water */
float map(vec3 p,out int m,out float w){
  vec4 A=texture(uFA,p.xy/GS);
  float dR=A.r,zF=A.g,zB=A.b;
  vec2 ob=max(max(-p.xy,p.xy-GS),0.);float od=length(ob);
  if(od>0.){dR=min(dR,0.)-od;zF=max(zF,8.)+od*.55;zB=-8.;}
  float sR=max(dR*.85,(p.z-zF)*.78),sB=(p.z-zB)*.6;
  float d=min(sR,sB);m=sR<sB?0:1;
  if(d<2.6){float k=mix(.18,1.,smoothstep(6.,13.,abs(p.z)));d-=k*(n3(p*.27)*1.05+n3(p*.83+11.)*.42-.73);}
  w=1e3;
  if(abs(p.z)<10.5){
    vec4 B=texture(uFB,p.xy/GS);
    if(B.g>0.){float s=rbox(vec2(B.r,abs(p.z)-B.g),.6);if(s<d){d=s;m=2;}}
    if(B.b<5.){float hz=clamp(.8+max(-B.b,0.)*1.15,1.1,6.5);float s=rbox(vec2(B.b,abs(p.z)-hz),.5)*.8;if(s<d){d=s;m=3;}}
    if(B.a>0.)w=rbox(vec2(A.a,abs(p.z)-B.a),.4);
  }
  if(uHeartFx.w>.5){float s=length(p-vec3(uHeart.xy,0.))-uHeart.z;if(s<d){d=s;m=4;}}
  return d;
}
float mapd(vec3 p){int m;float w;return map(p,m,w);}
vec3 nrm(vec3 p,float e){const vec2 k=vec2(1,-1);return normalize(k.xyy*mapd(p+k.xyy*e)+k.yyx*mapd(p+k.yyx*e)+k.yxy*mapd(p+k.yxy*e)+k.xxx*mapd(p+k.xxx*e));}
float nrmWd(vec3 p){int m;float w;map(p,m,w);return w;}
vec3 nrmW(vec3 p){const vec2 k=vec2(1,-1);float e=.08;return normalize(k.xyy*nrmWd(p+k.xyy*e)+k.yyx*nrmWd(p+k.yyx*e)+k.yxy*nrmWd(p+k.yxy*e)+k.xxx*nrmWd(p+k.xxx*e));}
float occl(vec3 p,vec3 n){float o2=0.,s=1.;int ns=uQ>1?3:2;for(int i=1;i<=3;i++){if(i>ns)break;float h=.45*float(i*i);o2+=(h-mapd(p+n*h))*s;s*=.55;}return clamp(1.-o2*.32,0.,1.);}
float shadow(vec3 p,vec3 l,float maxt){float res=1.,t=.5;for(int i=0;i<22;i++){float h=mapd(p+l*t);res=min(res,7.*h/t);t+=clamp(h,.35,4.5);if(res<.03||t>maxt)break;}return clamp(res,0.,1.);}
/* steel tempers through straw, bronze, purple and blue as a thin oxide forms between ~200 and ~330 C */
vec3 temper(float T){
  float k=clamp((T-200.)/130.,0.,1.);
  vec3 c=k<.25?mix(vec3(1),vec3(1.5,1.25,.6),k*4.):k<.5?mix(vec3(1.5,1.25,.6),vec3(1.1,.6,.35),(k-.25)*4.):k<.75?mix(vec3(1.1,.6,.35),vec3(.8,.45,1.2),(k-.5)*4.):mix(vec3(.8,.45,1.2),vec3(.45,.7,1.5),(k-.75)*4.);
  return T<200.||T>520.?vec3(1):mix(c,vec3(1),clamp((T-330.)/190.,0.,1.));
}
/* cells: distance between the two nearest seeds (an edge measure), and the nearest cell's id */
vec3 voro(vec2 x,float anim){vec2 n=floor(x),f=fract(x);float d1=8.,d2=8.;vec2 id=vec2(0);
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(i,j),q=vec2(h21(n+g),h21(n+g+19.7));q=.5+.45*sin(anim+6.2831*q);vec2 r=g+q-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=n+g;}else if(d<d2)d2=d;}
  return vec3(sqrt(d2)-sqrt(d1),h21(id),h21(id+3.1));}
vec2 faceUV(vec3 p,vec3 n){vec3 a=abs(n);return a.z>max(a.x,a.y)?p.xy:a.y>a.x?vec2(p.x,p.z*1.3):vec2(p.z*1.3,p.y);}
/* the painted far view: a picture at the end of the cave, placed by the ray's direction (it is far
   enough away that only turning the camera moves it), a little soft, as a distant thing is */
vec3 backdrop(vec3 D){
  float ax=atan(D.x,-D.z),ay=atan(D.y,length(D.xz));
  const float SY=.64;vec2 uv=vec2(ax/(SY*uBackAsp)+.5,(ay-.3)/SY+.5);
  vec3 c=textureLod(uBack,clamp(uv,vec2(.001),vec2(.999)),1.).rgb;
  return c*smoothstep(-.06,.04,uv.y)*smoothstep(1.06,.96,uv.y);
}
void lights(vec3 P,vec3 N,vec3 V,float shin,bool sh,out vec3 dif,out vec3 spc){
  dif=vec3(0);spc=vec3(0);
  for(int i=0;i<8;i++){if(i>=uNL)break;vec3 d=uPL[i].xyz-P;float dd=dot(d,d),dl=sqrt(dd);vec3 l=d/dl;float att=1./(1.+dd/(uPL[i].w*uPL[i].w));
    float nl=max(dot(N,l),0.);if(nl<=0.||att<.02)continue;
    float s=1.;if(sh&&i<2&&uQ>1)s=shadow(P+N*.25,l,dl-(i==0?uHeart.z+.8:1.));
    dif+=uPC[i].rgb*nl*att*s;spc+=uPC[i].rgb*pow(max(dot(N,normalize(l+V)),0.),shin)*att*nl*s;}
}
ivec2 cellIn(vec3 p,vec3 n,int want){
  for(int k=0;k<3;k++){ivec2 c=ivec2(floor(p.xy-n.xy*(.35+.45*float(k))));c=clamp(c,ivec2(0),ivec2(319,179));
    if(want==3){if(texelFetch(uVox,c,0).a>0.)return c;}
    else{int mm=int(texelFetch(uState,c,0).r*255.+.5);if(mm<128){mm&=127;if(mm!=AIR&&mm!=STEAM&&mm!=SMOKE&&mm!=WATER)return c;}}}
  return clamp(ivec2(floor(p.xy-n.xy*.4)),ivec2(0),ivec2(319,179));
}
void main(){
  vec2 ndc=vT*2.-1.;
  vec4 a=uInvVP*vec4(ndc,-1.,1.),b=uInvVP*vec4(ndc,1.,1.);
  vec3 wo=a.xyz/a.w,wd=normalize(b.xyz/b.w-wo);
  vec3 O=vec3(uEye.x,-uEye.y,uEye.z),D=vec3(wd.x,-wd.y,wd.z);
  if(D.z>-1e-4){o=vec4(0);gl_FragDepth=1.;return;}
  vec3 O0=O,D0=D;
  float t=max(0.,(27.-O.z)/D.z),t0=t,tWet=-1.;
  int m=-1;float w;bool wet=false;vec3 Tr=vec3(1),Acc=vec3(0);float wpath=0.;
  int MS=uQ>1?140:84;vec3 p=O+D*t;
  for(int i=0;i<140;i++){if(i>=MS)break;
    p=O+D*t;float d=map(p,m,w);
    if(!wet&&w<.04){
      /* into the water: a glint off the surface, then the ray bends and carries on underwater */
      wet=true;tWet=t;vec3 nw=nrmW(p);
      if(uArt>.5&&nw.y<-.4){float sc=1./34.;vec2 u=vec2(p.x,p.z*1.6)*sc;vec3 r1=artN(u+vec2(uTime*.013,uTime*.009),T_RIPPLE,1.),r2=artN(u*1.7-vec2(uTime*.011,-uTime*.016),T_RIPPLE,1.5);
        nw=normalize(nw+vec3(r1.x+r2.x,0.,r1.y+r2.y)*.35);}float fr=.03+.75*pow(1.-max(dot(nw,-D),0.),5.);
      vec3 Lw=L2(p.xy);vec3 dif,spc;lights(p,nw,-D,120.,false,dif,spc);
      Acc+=Tr*(fr*(Lw*.7+uAmb*uTint*2.5+.02)+spc*.9);Tr*=1.-fr;
      O=p+D*.05;D=refract(D,nw,.75);if(D.z>-.02)D=normalize(vec3(D.xy,-.05));t=0.;continue;}
    if(wet&&w<0.)wpath+=max(d,.03)*.85;
    if(d<.012*(1.+t*.004))break;
    float st=d*.82;if(p.z>10.5&&D.z<0.)st=min(st,(p.z-10.2)/(-D.z));   /* never step over the play channel without looking inside it */
    t+=max(st,.015);
    if(p.z<-74.){m=-2;break;}
  }
  if(wet)Tr*=exp(-vec3(.3,.1,.06)*wpath);
  vec3 P=O+D*t,V=-D,col=vec3(0),N=vec3(0,0,1);
  float far=0.;
  if(m==4){
    /* the forge heart: white heat, brightest where it faces you, a slow swirl, frost while the Rime cling */
    vec3 C=vec3(uHeart.xy,0.),Nn=normalize(P-C);float mu=max(dot(Nn,V),0.);
    float sw=sin(uTime*2.2+atan(Nn.y,Nn.x)*3.+Nn.z*4.)*.5+.5,sw2=n3(Nn*3.+vec3(uTime*.4,0.,0.));
    col=bb(uHeart.w+mu*200.-sw*55.*(1.-mu)-sw2*80.)*(1.+.25*uHeartFx.z);
    float fr=uHeartFx.x*smoothstep(.42,.62,n3(Nn*6.+floor(uTime*2.)))*(1.-mu*.5);
    col=mix(col,vec3(.75,.9,1.)*(.6+.4*mu),fr*.85);
  }else if(m>=0){
    N=nrm(P,m==3?.12:m==2?.22:.4);
    float ao=occl(P,N);
    vec3 L=L2(P.xy+N.xy*.8);
    float zatt=P.z<-ZP?1./(1.+pow((-ZP-P.z)/15.,2.)):1.;L*=zatt;L/=1.+lum(L)*.28;   /* a soft shoulder: lit stone stays stone-coloured beside the pour */
    vec3 amb=uAmb*uTint*(1.+.6*smoothstep(80.,20.,P.y))*ao*mix(.35,1.,smoothstep(-40.,-8.,P.z));
    vec3 sp=texture(uLB,P.xy/GS).rgb;
    if(P.z>ZP+.3)L+=sp*.55*exp(-(P.z-ZP)*.07)*(.4+.6*max(N.z,0.));
    L*=mix(1.,ao,.6);
    /* studio lighting on top of the cave's own: a cool fill from above the camera so shapes in shadow
       still read, and a warm rim from the magma behind that cuts every silhouette out */
    vec3 fillD=normalize(vec3(-.25,-.85,.6));
    amb+=vec3(.022,.032,.055)*max(dot(N,fillD),0.)*ao*smoothstep(-34.,-8.,P.z)*smoothstep(18.,9.,P.z);   /* the play surfaces only: the deep cave and the near cliffs stay dark */
    float rimk=pow(1.-max(dot(N,V),0.),3.)*ao;
    vec3 rimc=(vec3(1.,.42,.12)*(.03+uMagma*.07)+uTint*.03)*rimk;
    float reach=min(1.,lum(L)*6.+.12);
    vec3 dif,spc;
    if(m<=1){
      ivec2 c=clamp(ivec2(floor(P.xy-N.xy*.5)),ivec2(0),ivec2(319,179));
      vec4 s=texelFetch(uState,c,0);int mm;float T;cellOf(s,mm,T);float aux=s.b;
      if(P.x<0.||P.y<0.||P.x>320.||P.y>180.){mm=BED;T=0.;aux=.5;}
      /* the painted rock: two of the stage's stones in broad patches, rubble or snow gathered on the ledges,
         the far cave in columns of basalt; brightness kept to the stage's own, colour leaning to its palette */
      vec3 Nb=N,ta=vec3(0);float th=.5;
      if(uArt>.5&&mm!=CRYST){
        float lt=lum(uBackB)*2.9;vec3 tn=mix(vec3(1),uBackB/max(lum(uBackB),1e-3),.42);
        if(m==1){float sc=1./62.,lod=artLod(P,N,V,sc);vec4 a=tri(P,N,T_COLUMNS,sc,lod,1.1,Nb);ta=a.rgb/artMean(T_COLUMNS)*lt*tn;th=a.a;}
        else if(mm==BED){float sc=1./58.,lod=artLod(P,N,V,sc);vec4 a=tri(P,N,uRockL.x,sc,lod,1.3,Nb);ta=a.rgb/artMean(uRockL.x)*lt*tn*.8;th=a.a;}
        else{
          float sc=1./54.,lod=artLod(P,N,V,sc);
          float kB=smoothstep(.42,.6,n3(P*.019+vec3(5.,1.,0.)));
          vec3 n1=N,n2=N;vec4 a=vec4(0);
          if(kB<.99){vec4 q=tri(P,N,uRockL.x,sc,lod,1.35,n1);a+=vec4(q.rgb/artMean(uRockL.x),q.a)*(1.-kB);}
          if(kB>.01){vec4 q=tri(P,N,uRockL.y,sc*1.15,lod+.2,1.35,n2);a+=vec4(q.rgb/artMean(uRockL.y),q.a)*kB;}
          Nb=normalize(mix(n1,n2,kB));ta=a.rgb*lt*tn;th=a.a;
          float kT=smoothstep(.3,.8,-N.y)*smoothstep(.35,.55,n3(P*.09+2.)+th*.3);
          if(kT>.01){vec3 n3_=N;float scT=1./36.;vec4 q=tri(P,N,uRockL.z,scT,artLod(P,N,V,scT),1.,n3_);
            vec3 ct=uRockL.z==T_SNOW?q.rgb*.95:q.rgb/artMean(uRockL.z)*lt*tn*1.15;
            ta=mix(ta,ct,kT);Nb=normalize(mix(Nb,n3_,kT));th=mix(th,q.a,kT);}
          if(uCold>0.){float kf=uCold*smoothstep(.45,.62,n3(P*.04+8.)+(-N.y)*.25+th*.2);ta=mix(ta,ta*vec3(.75,.9,1.2)+vec3(.04,.06,.09)*uCold,kf*.6);}
        }
      }
      lights(P,Nb,V,14.,true,dif,spc);
      if(mm==CRYST&&m==0){
        /* lantern crystals: cut gems lit from inside */
        vec3 vc=voro(faceUV(P,N)*1.6,0.);vec3 fn=normalize(N+(vec3(vc.y,vc.z,.5)-.5)*.8);float cg=.6+.6*vc.y;
        if(uArt>.5){float sc=1./22.;vec4 a=tri(P,N,T_CRYSTAL,sc,artLod(P,N,V,sc),1.4,fn);cg=.35+a.r*1.9;}
        float fres=pow(1.-max(dot(fn,V),0.),3.);
        col=uCryst*(.5+.35*sin(uTime*1.7+aux*40.))*cg+uCryst*L*.5+fres*uCryst*.8+step(.985,h21(floor(P.xy*2.)+floor(uTime*4.)))*uCryst*1.5;
      }else{
        /* volcanic basalt: strata, grain and colour drift; magma veins glow where the rock is hot */
        float strata=.5+.5*sin(P.y*.36+n3(P*.05)*6.+P.z*.04);
        vec3 al=mix(uBackB*2.2,uBackB*3.6+vec3(.03,.02,.012),strata*.6+n3(P*.21+9.)*.3)*(.74+.5*n3(P*.42+3.));
        if(m==1)al=mix(al,uBackA*2.4+uBackB*.8,.35);
        if(mm==BED)al=al*.8+uBackA*.5;
        if(uArt>.5){al=ta;amb+=vec3(.022,.032,.055)*(max(dot(Nb,fillD),0.)-max(dot(N,fillD),0.))*ao*smoothstep(-34.,-8.,P.z)*smoothstep(18.,9.,P.z);}
        col=al*((L+amb)*1.05+dif*reach*.85)+spc*reach*al*(.3+th*.9)+rimc*.8;
        float heat=lum(sp)*1.1+uMagma*.22*smoothstep(-10.,-45.,P.z)+clamp((T-350.)/600.,0.,1.);
        float vein=1.-smoothstep(.0,.028,abs(n3(P*.105+vec3(0.,0.,7.))-.5));vein*=smoothstep(.5,.66,n3(P*.045+5.));
        float pulse=.75+.25*sin(uTime*1.1+P.x*.07+P.y*.05);
        col+=bb(620.+min(heat,1.2)*620.)*vein*min(heat*1.4,1.)*pulse*1.3;
        col+=sp*smoothstep(.15,.9,lum(sp))*.35*(.6+.4*n3(P*.3));   /* stone beside the lava is heated through */
        /* the magma chamber far behind: falls of lava running down the deepest walls */
        if(P.z<-36.){float k=smoothstep(-36.,-60.,P.z)*(.35+uMagma);
          float fall=pow(max(0.,n3(vec3(P.x*.34,P.y*.03-uTime*.32,7.))*1.6-.75),1.4)*smoothstep(.4,.65,n3(vec3(P.x*.05,2.,P.z*.02)));
          float pool=smoothstep(.55,.9,n3(vec3(P.x*.05,P.y*.08,uTime*.05)))*smoothstep(120.,175.,P.y);
          col+=bb(1050.+fall*450.)*(fall*1.6+pool*.8)*k;}
      }
      far=P.z<-ZP?clamp((-ZP-P.z)/50.,0.,1.):0.;
    }else if(m==2){
      ivec2 c=cellIn(P,N,2);vec4 s=texelFetch(uState,c,0);int mm;float T;cellOf(s,mm,T);float aux=s.b;
      vec3 em=bb(T);vec2 fu=faceUV(P,N);float top=N.y<-.55?1.:0.;
      if(mm==LAVA){
        /* molten iron with a skin: crust plates drift and split, white heat shows in the seams */
        vec3 vc=voro(fu*.34+vec2(uTime*.05,-uTime*(top>.5?.03:.12)),uTime*.4);
        float seam=1.-smoothstep(.02,.16,vc.x);
        float crust=clamp((1520.-T)/380.,0.,1.)*.9+.1*top;
        vec3 hot=bb(T+70.)*1.3,cool=bb(max(T-360.-vc.y*240.,560.))*.55+vec3(.05,.02,.015)*L;
        if(uArt>.5){
          /* the painted crust: dark plates riding on the flow, the glow coming through where they part */
          float sc=1./26.;vec2 fl=vec2(uTime*.05,-uTime*(top>.5?.03:.12))*3.;vec3 nn=N;
          vec4 a=pla((fu+fl)*sc+vc.yz*.02,N,T_CRUST,artLod(P,N,V,sc),1.,nn);
          float sm=smoothstep(.03,.32,a.r-a.b*.8);
          seam=max(seam*.35,sm);
          cool=bb(max(T-380.-(1.-a.a)*260.,560.))*.5+a.rgb*.25*(L+amb*2.)+vec3(.03,.012,.01)*L;N=nn;}
        col=mix(hot,cool,crust*(1.-seam))+bb(T+120.)*seam*.6;
        lights(P,N,V,70.,false,dif,spc);col+=spc*.22;
      }else if(mm==IRON||mm==SLAG||mm==RAIL||mm==HOUSE){
        vec3 al;float sk=.65;
        if(mm==IRON){al=vec3(.15,.15,.17)*(.85+.3*aux)*temper(T);}
        else if(mm==SLAG){al=vec3(.04,.035,.05)*(.8+.5*aux)+vec3(.05,.02,.08)*n3(P*.6);sk=1.;}
        else if(mm==RAIL){al=vec3(.22,.21,.23)*(abs(P.z)>1.7?.7:1.);if(fract(P.x/8.)<.1)al*=1.6;sk=.9;}
        else{al=vec3(.1,.085,.085)*(.85+.3*aux);}
        float crackA=-1.;
        if(uArt>.5){
          /* painted metal: cast iron with its crazed skin, glassy slag, the riveted rail, brick for the houses */
          vec3 nn=N;
          if(mm==IRON){float sc=1./24.,lod=artLod(P,N,V,sc);vec4 a=pla(fu*sc,N,T_IRON,lod,1.,nn);vec3 n2=N;vec4 c2=pla(fu*sc*1.3+.37,N,T_CRAZE,lod+.38,1.,n2);
            al=a.rgb/artMean(T_IRON)*.15*(.85+.3*aux)*temper(T);crackA=1.-smoothstep(.22,.45,c2.a);nn=normalize(nn+n2-N);}
          else if(mm==SLAG){float sc=1./22.;vec4 a=pla(fu*sc,N,T_OBSID,artLod(P,N,V,sc),1.2,nn);al=a.rgb/artMean(T_OBSID)*.045*(.8+.5*aux)+vec3(.03,.012,.05)*a.a;}
          else if(mm==RAIL){float sc=1./16.;vec4 a=pla(vec2(P.x,abs(N.z)>.5?P.y:P.z)*sc,N,T_PLATE,artLod(P,N,V,sc),1.,nn);al=a.rgb/artMean(T_PLATE)*.2*(abs(P.z)>1.7?.75:1.);}
          else{float sc=1./12.;vec4 a=pla(fu*sc,N,T_BRICK,artLod(P,N,V,sc),1.,nn);al=a.rgb/artMean(T_BRICK)*.1*(.85+.3*aux);}
          N=nn;}
        lights(P,N,V,mm==RAIL?80.:55.,true,dif,spc);
        if(mm==IRON||mm==SLAG){
          /* cast iron cooling: the skin crazes; the cracks stay hot after the plates have dulled */
          vec3 vc=voro(fu*.55,0.);float crack=crackA>=0.?max(crackA,(1.-smoothstep(.02,.12,vc.x))*.3):1.-smoothstep(.02,.12,vc.x);
          float glow=T>1050.?.75+.25*crack:smoothstep(480.,1000.,T)*(.12+.88*crack);
          em*=glow*(.8+.3*n3(P*.5));}
        float fres=pow(1.-max(dot(N,V),0.),4.);
        col=al*((L+amb)*1.05+dif*reach)+spc*reach*sk*(mm==SLAG?vec3(.55,.45,.75):vec3(.65,.65,.7))+fres*(L+amb)*.18+em+rimc*.6;
        if(mm==HOUSE){vec4 sq=texelFetch(uSpr,c,0);int ac=int(sq.a*255.+.5);if(sq.a>0.)col+=ac==255?pow(sq.rgb,vec3(2.2))*L*.5:pow(sq.rgb,vec3(2.2))*float(ac)/254.*6.*(N.z>.5?1.:.7);}
      }else if(mm==ICE){
        /* clear ice: faceted, it reflects the cave and lets the lava light through */
        vec3 vc=voro(fu*.7,0.);vec3 fn=normalize(N+(vec3(vc.y,vc.z,.5)-.5)*.5);vec3 itn=vec3(1);
        if(uArt>.5){float sc=1./30.;vec4 a=pla(fu*sc,N,T_ICE,artLod(P,N,V,sc),1.,fn);fn=normalize(fn+(vec3(vc.y,vc.z,.5)-.5)*.25);itn=a.rgb/artMean(T_ICE)*.9;}
        lights(P,fn,V,110.,false,dif,spc);
        float fres=.05+.95*pow(1.-max(dot(fn,V),0.),4.);
        vec3 thru=uIce*itn*(L2(P.xy-fn.xy*2.5)*1.1+amb*2.+.015);
        col=mix(thru,(L+amb*2.5)*.8+.02,fres*.6)+spc*reach*1.2+step(.99,h21(floor(P.xy*2.5)+floor(P.z)+floor(uTime*3.)))*L*2.;
      }else if(mm==SNOW){
        vec3 sal=vec3(.82,.88,.98);vec3 nn=N;
        if(uArt>.5){float sc=1./28.;vec4 a=pla(fu*sc,N,T_SNOW,artLod(P,N,V,sc),1.,nn);sal=a.rgb*1.35;}
        lights(P,nn,V,20.,false,dif,spc);
        col=sal*((L+amb)*.95+dif*reach*.8+.012)*(.88+.24*aux)*(top>.5?1.1:.85)+step(.992,h21(floor(P.xy*3.)+floor(uTime*3.)))*(L+.05)*1.5;
      }else{vec3 al=uBackB*3.;vec3 nn=N;
        if(uArt>.5&&mm==RUBBLE){float sc=1./20.;vec4 a=pla(fu*sc,N,T_RUBBLE,artLod(P,N,V,sc),1.,nn);al=a.rgb/artMean(T_RUBBLE)*lum(uBackB)*3.*mix(vec3(1),uBackB/max(lum(uBackB),1e-3),.4);}
        lights(P,nn,V,12.,false,dif,spc);col=al*((L+amb)+dif*reach*.8)+em;}
    }else{
      /* the Rime: living crystal. Their pixel-art colours tint the ice; eyes and cores glow */
      ivec2 c=cellIn(P,N,3);vec4 sq=texelFetch(uVox,c,0);int ac=int(sq.a*255.+.5);
      vec4 sm=texture(uVox,(P.xy-N.xy*.4)/GS);vec3 cc=pow(ac==255&&sm.a>.5?sm.rgb/sm.a:sq.rgb,vec3(2.2));   /* the pixel art, filtered: tint, not speckle */
      vec3 vc=voro(faceUV(P,N)*.42+vec2(P.z*.13),0.);vec3 fn=normalize(N+(vec3(vc.y,vc.z,.5)-.5)*1.1);       /* cut into broad crystal facets */
      if(uArt>.5){float sc=1./18.;vec3 nn=N;vec4 a=tri(P,N,T_RIME,sc,artLod(P,N,V,sc),1.2,nn);fn=normalize(nn+(vec3(vc.y,vc.z,.5)-.5)*.6);vc.y=mix(vc.y,clamp(a.a*1.4-.2,0.,1.),.7);}
      lights(P,fn,V,90.,true,dif,spc);
      float fres=.06+.94*pow(1.-max(dot(fn,V),0.),3.);
      vec3 thru=cc*(L2(P.xy-fn.xy*2.)*1.4+amb*2.2+.03)*(.75+.5*vc.y);
      vec3 rim=(L*1.2+dif*reach)*fres;
      col=ac==255?thru+rim*mix(vec3(1),cc*2.,.4)+spc*reach*1.3+cc*dif*reach*.5+cc*.2+uIce*fres*.3+rimc:cc*float(ac)/254.*6.;   /* a faint cold light inside every Rime */
      col+=step(.985,h21(floor(P.xy*2.)+floor(uTime*5.)+vc.y*9.))*(L+.08)*1.4*float(ac==255);
    }
  }else{col=vec3(.004,.003,.003);}
  /* the far view: where the cave runs deepest it opens onto the stage's painted backdrop */
  float bk=m==-2?1.:m==1?smoothstep(-12.,-34.,P.z):0.;
  bk*=uBackOk;
  if(bk>0.&&uArt>.5){vec3 B=backdrop(D);B=mix(vec3(lum(B)),B,.85)*.34*uBackGain+uAmb*uTint*.05;col=mix(col,B,bk);far*=1.-bk;}
  col=Acc+Tr*col;
  /* the channel's air: light shafts in the haze (the 2D light already knows what casts shadows),
     steam billowing, and how much the hot air shimmers */
  float tEnd=wet?tWet:t;vec3 Oq=O0,Dq=D0;
  float ta=max(t0,(13.-Oq.z)/Dq.z),tb=min(tEnd,(-13.-Oq.z)/Dq.z),haze=0.;
  if(tb>ta){int NS=uQ>1?14:8;float dt=(tb-ta)/float(NS),j=h21(gl_FragCoord.xy+fract(uTime*3.7)*41.);vec3 Tv=vec3(1),Av=vec3(0);
    for(int k=0;k<14;k++){if(k>=NS)break;vec3 q=Oq+Dq*(ta+dt*(float(k)+j));vec4 gs=texture(uGas,q.xy/GS);vec3 Lq=L2(q.xy);
      float fz=smoothstep(13.,6.,abs(q.z));
      Av+=Tv*Lq*.0016*dt*fz;
      haze=max(haze,gs.b*fz);
      float dens=gs.r+gs.g;
      if(dens>.01){float rz=1.1+11.*pow(clamp(dens*1.2,0.,1.),1.5)+1.2*n3(vec3(q.xy*.3,uTime*.2));float prof=smoothstep(rz,rz*.2,abs(q.z));
        float nz=clamp(n3(vec3(q.xy*.19,q.z*.15)+vec3(0.,-uTime*.5,0.))*1.3+n3(q*.47-vec3(uTime*.27,0.,0.))*.8-.45,0.,1.6);
        float sd=(gs.r*1.3+gs.g*1.5)*prof*nz;
        if(sd>0.){float e=exp(-sd*.3*dt);vec3 sc=mix(vec3(.85,.88,.94)*(Lq*1.25+uAmb*uTint*2.5+.025),vec3(.14,.12,.12)*(Lq*.6+.01),gs.g/dens);Av+=Tv*(1.-e)*sc;Tv*=e;}}}
    col=Av+Tv*col;}
  /* the far cave sinks into a haze lit by the magma below */
  if(far>0.){vec3 fc=L2(P.xy)*.06+uAmb*uTint*.18+bb(1150.)*uMagma*.05*smoothstep(60.,170.,P.y);col=mix(col,fc,far*.22);}
  vec4 cl=uVP*vec4(P.x,-P.y,P.z,1.);
  gl_FragDepth=clamp(cl.z/cl.w*.5+.5,0.,1.);
  o=vec4(col,haze);
}
