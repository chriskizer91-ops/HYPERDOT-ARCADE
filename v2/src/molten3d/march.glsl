${GLSL_MATS}
${GLSL_ART}
/* MARCH — one ray per pixel through the extruded grid.
   Every cell is a column standing on the play plane. Along z (toward the camera) a cell can hold:
     terrain   solid from far behind up to its front depth zT (rock juts out; open cave recedes)
     slab      the play channel, -h..h (iron, lava, ice, snow, rubble, the heart's housing, the rail)
     voxel     a Rime body or the King, -s..s, thickest in its middle
     medium    water (see-through, absorbs) or steam / smoke (a lit fog), inside the channel
   The ray walks the cells it crosses in u,v (a 2D DDA) and, in each, checks where it is in z. */
uniform sampler2D uCell;uniform sampler2D uCoarse;uniform sampler2D uState;uniform sampler2D uVox;uniform sampler2D uSpr;uniform sampler2D uGas;
uniform sampler2D uLight;uniform sampler2D uLB;uniform vec2 uLSz;uniform float uLQ;
uniform mat4 uInvVP;uniform mat4 uVP;uniform vec3 uEye;
uniform vec4 uPL[8];uniform vec4 uPC[8];uniform int uNL;
uniform vec4 uHeart;uniform vec4 uHeartFx;
uniform float uTime;uniform float uAmb;uniform vec3 uTint;uniform vec3 uBackA;uniform vec3 uBackB;uniform vec3 uCryst;uniform vec3 uIce;uniform float uSteamQ;
uniform sampler2D uBack;uniform float uBackOk;uniform float uBackAsp;uniform float uBackGain;uniform vec3 uRockL;uniform float uCold;
in vec2 vT;out vec4 o;
const float ZP=8.;
vec4 cellAt(ivec2 c){
  ivec2 cc=clamp(c,ivec2(0),ivec2(319,179));vec4 d=texelFetch(uCell,cc,0);
  vec4 r=vec4(d.r*90.-64.,d.g*10.,d.b*10.,floor(d.a*255.+.5));
  if(c!=cc){float dd=float(max(max(-c.x,c.x-319),max(-c.y,c.y-179)));r=vec4(min(max(r.x,8.)+dd*.6,19.+h21(vec2(c))*.8),0.,0.,0.);}
  return r;
}
vec3 L2(vec2 q){return texture(uLight,q/uLSz).rgb*(uLQ<.5?2.6:1.);}
/* the far cave: columnar basalt with slow joints and a little grain (the original's back wall) */
vec3 backwall(vec2 p){
  float big=vn(p*.035)*.6+vn(p*.09+7.)*.4;
  float cx=p.x*.07+vn(vec2(p.y*.03,3.))*1.6,j=abs(fract(cx)-.5);
  float joint=smoothstep(.02,.11,j);
  float frac=smoothstep(.0,.08,abs(fract(p.y*.045+vn(vec2(floor(cx),p.y*.01))*2.)-.5));
  float grain=.85+.3*h21(p);
  return mix(uBackA,uBackB,big)*(.72+.28*joint*frac)*grain*2.3*(.8+.4*vn(p*.21));
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
/* point lights: diffuse and a highlight; they only add where the 2D light says the place is reachable */
void pointLights(vec3 P,vec3 N,vec3 V,float shin,out vec3 dif,out vec3 spc){
  dif=vec3(0);spc=vec3(0);
  for(int i=0;i<8;i++){if(i>=uNL)break;vec3 d=uPL[i].xyz-P;float dd=dot(d,d);vec3 l=d*inversesqrt(dd);float att=1./(1.+dd/(uPL[i].w*uPL[i].w));
    float nl=max(dot(N,l),0.);dif+=uPC[i].rgb*nl*att;spc+=uPC[i].rgb*pow(max(dot(N,normalize(l+V)),0.),shin)*att*nl;}
}
float lum(vec3 c){return dot(c,vec3(.3,.55,.15));}
/* the painted far view (see SCULPT) */
vec3 backdrop(vec3 D){
  float ax=atan(D.x,-D.z),ay=atan(D.y,length(D.xz));
  const float SY=.64;vec2 uv=vec2(ax/(SY*uBackAsp)+.5,(ay-.3)/SY+.5);
  vec3 c=textureLod(uBack,clamp(uv,vec2(.001),vec2(.999)),1.).rgb;
  return c*smoothstep(-.06,.04,uv.y)*smoothstep(1.06,.96,uv.y);
}
vec2 fUV(vec3 p,vec3 n){vec3 a=abs(n);return a.z>max(a.x,a.y)?p.xy:a.y>a.x?vec2(p.x,p.z*1.3):vec2(p.z*1.3,p.y);}
/* the painted rock, one projection (the face's own) */
vec3 artRock(vec3 P,vec3 N,vec3 V,inout vec3 Nb,out float th){
  float lt=lum(uBackB)*2.9;vec3 tn=mix(vec3(1),uBackB/max(lum(uBackB),1e-3),.42);
  vec2 u=fUV(P,N);float sc=1./54.,lod=artLod(P,N,V,sc);
  float kB=smoothstep(.42,.6,vn(P.xy*.019+vec2(5.,1.)+P.z*.01));
  float L=kB<.5?uRockL.x:uRockL.y;vec4 a=pla(u*(kB<.5?sc:sc*1.15),N,L,lod,1.35,Nb);
  vec3 c=a.rgb/artMean(L)*lt*tn;th=a.a;
  float kT=smoothstep(.3,.8,-N.y)*smoothstep(.35,.55,vn(P.xy*.09+2.)+th*.3);
  if(kT>.01){vec3 n3_=N;vec4 q=pla(u/36.,N,uRockL.z,artLod(P,N,V,1./36.),1.,n3_);vec3 ct=uRockL.z==T_SNOW?q.rgb*.95:q.rgb/artMean(uRockL.z)*lt*tn*1.15;c=mix(c,ct,kT);Nb=normalize(mix(Nb,n3_,kT));}
  if(uCold>0.){float kf=uCold*smoothstep(.45,.62,vn(P.xy*.04+8.)+(-N.y)*.25+th*.2);c=mix(c,c*vec3(.75,.9,1.2)+vec3(.04,.06,.09)*uCold,kf*.6);}
  return c;}
void main(){
  vec2 ndc=vT*2.-1.;
  vec4 a=uInvVP*vec4(ndc,-1.,1.),b=uInvVP*vec4(ndc,1.,1.);
  vec3 wo=a.xyz/a.w,wd=normalize(b.xyz/b.w-wo);
  vec3 O=vec3(uEye.x,-uEye.y,uEye.z),D=vec3(wd.x,-wd.y,wd.z);
  if(D.z>-1e-4){o=vec4(0);gl_FragDepth=1.;return;}
  if(abs(D.x)<1e-6)D.x=1e-6;if(abs(D.y)<1e-6)D.y=1e-6;
  float t=max(0.,(26.-O.z)/D.z);
  /* the forge heart's core: a sphere */
  float tS=1e9;
  if(uHeartFx.w>.5){vec3 C=vec3(uHeart.xy,0.),oc=O-C;float bq=dot(oc,D),cq=dot(oc,oc)-uHeart.z*uHeart.z,hq=bq*bq-cq;if(hq>0.)tS=-bq-sqrt(hq);}
  vec3 p=O+D*t;ivec2 c=ivec2(floor(p.xy));
  vec2 stp=sign(D.xy),tDel=abs(1./D.xy);
  vec2 tMax=(vec2(c)+max(stp,0.)-O.xy)/D.xy;
  vec3 nIn=vec3(0,0,1);
  float tH=1e9;vec3 nH=vec3(0,0,1);int kd=-1;ivec2 cH=c;
  vec3 Tr=vec3(1),Acc=vec3(0);float haze=0.;bool wet=false;
  for(int i=0;i<200;i++){
    /* empty-space skip: jump a whole 4x4 block when the ray stays in front of its terrain and the block is empty */
    if(c.x>=0&&c.y>=0&&c.x<320&&c.y<180){ivec2 cb=c>>2;vec4 cc=texelFetch(uCoarse,cb,0);
      if(cc.g<.5){vec2 b0=vec2(cb*4),b1=b0+4.;vec2 tb=(mix(b0,b1,step(0.,stp))-O.xy)/D.xy;float tbx=min(tb.x,tb.y);
        if(tbx>t+1e-3&&O.z+D.z*tbx>cc.r*90.-64.+.05&&tbx<tS){
          float zm=O.z+D.z*(t+tbx)*.5,att=zm<-ZP?1./(1.+pow((-ZP-zm)/18.,2.)):zm>ZP?exp(-(zm-ZP)*.18)*.5:1.;
          Acc+=Tr*L2(b0+2.)*.0022*(tbx-t)*att;
          t=tbx;vec2 pp=O.xy+D.xy*t;
          if(tb.x<tb.y){c.x=stp.x>0.?int(b1.x):int(b0.x)-1;c.y=int(clamp(floor(pp.y),b0.y,b1.y-1.));nIn=vec3(-stp.x,0,0);}
          else{c.y=stp.y>0.?int(b1.y):int(b0.y)-1;c.x=int(clamp(floor(pp.x),b0.x,b1.x-1.));nIn=vec3(0,-stp.y,0);}
          tMax=(vec2(c)+max(stp,0.)-O.xy)/D.xy;
          continue;}}}
    float tEx=min(tMax.x,tMax.y);
    vec4 cd=cellAt(c);float zT=cd.x,sh=cd.y,sz=cd.z;int med=int(cd.w);
    float zi=O.z+D.z*t,zo=O.z+D.z*tEx;
    float th=1e9;vec3 nh;int k=-1;
    if(zi<=zT){th=t;nh=nIn;k=0;}else if(zo<=zT){th=(zT-O.z)/D.z;nh=vec3(0,0,1);k=0;}
    if(sh>0.){if(zi<=sh&&zi>=-sh){if(t<th){th=t;nh=nIn;k=1;}}else if(zi>sh&&zo<=sh){float a2=(sh-O.z)/D.z;if(a2<th){th=a2;nh=vec3(0,0,1);k=1;}}}
    if(sz>0.){if(zi<=sz&&zi>=-sz){if(t<th){th=t;nh=nIn;k=2;}}else if(zi>sz&&zo<=sz){float a2=(sz-O.z)/D.z;if(a2<th){th=a2;nh=vec3(0,0,1);k=2;}}}
    float tEnd=min(min(th,tEx),tS);
    if(tEnd>t){
      vec2 mid2=O.xy+D.xy*((t+tEnd)*.5);float zm=O.z+D.z*(t+tEnd)*.5;float len=tEnd-t;
      vec3 Lc=vec3(0);
      bool glow=uSteamQ>1.5||((i&1)==0);                       /* the air's glow is sampled every cell on HIGH, every other cell below */
      if(med!=0||glow)Lc=L2(vec2(c)+.5);
      if(med>=10){
        /* water: the light inside it, then what is behind it, dimmed by depth */
        float wz=float(med-10)*.1;
        float a2=max(t,(wz-O.z)/D.z),b2=min(tEnd,(-wz-O.z)/D.z);
        if(b2>a2){float l=b2-a2;
          if(!wet){wet=true;vec3 ne=a2<=t+1e-4?nIn:vec3(0,0,1);float fr=.03+.6*pow(1.-max(dot(ne,-D),0.),5.);
            vec3 sp=vec3(0);vec3 dd;pointLights(O+D*a2,ne,-D,90.,dd,sp);Acc+=Tr*(fr*(Lc*.8+uAmb*uTint*1.5)+sp*.9+Lc*vec3(.04,.07,.08)*(ne.y<-.5?1.4:.3));}
          vec3 ext=exp(-vec3(.34,.11,.07)*l);Acc+=Tr*(1.-ext)*(vec3(.02,.09,.15)*(Lc*1.3+.03));Tr*=ext;}
      }else{
        /* the cave air glows faintly with the light passing through it; steam and smoke are a lit fog */
        float att=zm<-ZP?1./(1.+pow((-ZP-zm)/18.,2.)):zm>ZP?exp(-(zm-ZP)*.18)*.5:1.;
        if(glow)Acc+=Tr*Lc*.0022*len*att*(uSteamQ>1.5?1.:2.);
        if(med==2){
        vec4 gs=texture(uGas,mid2/vec2(320.,180.));
        haze=max(haze,gs.b*smoothstep(13.,5.,abs(zm))*step(zm,ZP+3.));
        if(gs.r+gs.g>.015){
          int ns=int(clamp(len*.7,1.,4.));float sl=len/float(ns);
          for(int k2=0;k2<4;k2++){if(k2>=ns)break;float tq=t+sl*(float(k2)+.5);vec3 Q=O+D*tq;vec4 g2=texture(uGas,Q.xy/vec2(320.,180.));float dens=g2.r+g2.g;
            /* a cloud is as deep as it is wide: a lone wisp is a small puff, a big cloud fills the channel */
            float rz=1.1+11.*pow(clamp(dens*1.2,0.,1.),1.5)+1.2*vn(Q.xy*.3+uTime*.2);float prof=smoothstep(rz,rz*.2,abs(Q.z));if(dens<.01||prof<=0.)continue;
            float nz=uSteamQ>.5?clamp(vn(Q.xy*.19+vec2(Q.z*.15,-uTime*.5))*1.1+vn(Q.xy*.47-vec2(uTime*.27,Q.z*.29))*.7-.35,0.,1.6):1.;
            float sd=(g2.r*1.3+g2.g*1.5)*prof*nz;
            if(sd>0.){float e=exp(-sd*.3*sl);
              /* steam scatters the cave's light back at you: it reads as a pale glow, never a hole */
              vec3 sc=mix(vec3(.85,.88,.94)*(Lc*1.25+uAmb*uTint*2.5+.025),vec3(.14,.12,.12)*(Lc*.6+.01),g2.g/dens);
              Acc+=Tr*(1.-e)*sc;Tr*=e;}}
        }}
      }
    }
    if(tS<th&&tS<tEx){kd=3;tH=tS;break;}
    if(k>=0){kd=k;tH=th;nH=nh;cH=c;break;}
    if(Tr.r+Tr.g+Tr.b<.015){kd=-2;tH=tEx;break;}
    if(tMax.x<tMax.y){c.x+=int(stp.x);t=tMax.x;tMax.x+=tDel.x;nIn=vec3(-stp.x,0,0);}
    else{c.y+=int(stp.y);t=tMax.y;tMax.y+=tDel.y;nIn=vec3(0,-stp.y,0);}
  }
  if(kd==-1){tH=t;kd=-2;}
  vec3 P=O+D*tH,V=-D,col=vec3(0);
  if(kd==3){
    /* the core: white heat, brightest where it faces you, a slow swirl, frost while the Rime cling */
    vec3 C=vec3(uHeart.xy,0.),Nn=normalize(P-C);float mu=max(dot(Nn,V),0.);
    float sw=sin(uTime*2.2+atan(Nn.y,Nn.x)*3.+Nn.z*4.)*.5+.5,sw2=vn(Nn.xy*3.+vec2(uTime*.4,0.));
    float Tc=uHeart.w;col=bb(Tc+mu*200.-sw*55.*(1.-mu)-sw2*60.)*(1.+.25*uHeartFx.z);
    float fr=uHeartFx.x*smoothstep(.4,.7,vn(Nn.xy*5.+Nn.z*3.+floor(uTime*2.)))*(1.-mu*.5);
    col=mix(col,vec3(.75,.9,1.)*(.6+.4*mu),fr*.85);
  }else if(kd>=0){
    vec4 s=texelFetch(uState,clamp(cH,ivec2(0),ivec2(319,179)),0);int m;float T;cellOf(s,m,T);float aux=s.b;
    bool out_=cH.x<0||cH.y<0||cH.x>319||cH.y>179;if(out_){m=BED;T=0.;aux=h21(vec2(cH));}
    vec3 Nf=nH;
    /* terrain: soften the column faces toward the slope of the rock around them */
    if(kd==0){float zl=cellAt(cH-ivec2(1,0)).x,zr=cellAt(cH+ivec2(1,0)).x,zu=cellAt(cH-ivec2(0,1)).x,zd=cellAt(cH+ivec2(0,1)).x;
      vec3 ns=normalize(vec3(-(zr-zl)*.5,-(zd-zu)*.5,1.));Nf=normalize(nH.z>.5?mix(nH,ns,.85):nH+ns*.9);}
    float ao=1.;
    if(kd==0&&!(m==ROCK||m==BED||m==CRYST)){float z0=cellAt(cH).x,occ=0.;
      for(int j=0;j<4;j++){ivec2 o2=ivec2(j==0?2:j==1?-2:0,j==2?2:j==3?-2:0);occ+=clamp((cellAt(cH+o2).x-z0)/6.,0.,1.);}
      ao=1.-occ*.18;}
    vec2 q=P.xy+nH.xy*.6;
    vec3 L=L2(q);
    float zatt=P.z<-ZP?1./(1.+pow((-ZP-P.z)/15.,2.)):1.;L*=zatt;
    vec3 amb=uAmb*uTint*(1.+.6*smoothstep(80.,20.,P.y));
    if(P.z>ZP+.3)L+=texture(uLB,P.xy/vec2(320.,180.)).rgb*.55*exp(-(P.z-ZP)*.07)*(.4+.6*max(Nf.z,0.));
    float reach=min(1.,lum(L)*6.+.12);
    vec3 dif,spc;
    if(kd==2){
      /* a voxel sprite: lit pixel art (the Rime) or self-lit (wisps, eyes, the King's heart) */
      vec4 sp=texelFetch(uVox,cH,0);int ac=int(sp.a*255.+.5);vec3 cc=pow(sp.rgb,vec3(2.2));
      if(uArt>.5&&ac==255){float sc=1./18.;vec4 a=pla(fUV(P,Nf)*sc,Nf,T_RIME,artLod(P,Nf,V,sc),1.2,Nf);cc*=.55+a.rgb/artMean(T_RIME)*.55;}
      pointLights(P,Nf,V,30.,dif,spc);
      float side=Nf.z>.5?1.:.78;
      col=ac==255?cc*((L+amb)*1.15*side+dif*reach*.9+.03)+spc*reach*.5+cc*.012:cc*float(ac)/254.*6.;
    }else if(kd==0&&!(m==ROCK||m==BED||m==CRYST)){
      /* the cave receding behind the play channel */
      vec3 al=backwall(P.xy+vec2(P.z*.6,P.z*.21));
      if(uArt>.5){float sc=1./62.;vec4 a=pla(fUV(P,Nf)*sc,Nf,T_COLUMNS,artLod(P,Nf,V,sc),1.1,Nf);al=a.rgb/artMean(T_COLUMNS)*lum(uBackB)*2.6*mix(vec3(1),uBackB/max(lum(uBackB),1e-3),.42);}
      pointLights(P,Nf,V,8.,dif,spc);
      col=al*((L*.62+amb*1.4)*(.75+.35*max(Nf.z,0.))+dif*reach*.5)*ao;
    }else if(kd==0){
      vec3 al=m==BED?uBackA*1.3+rockAlb(P.xy,aux)*.35:rockAlb(P.xy+vec2(0.,P.z*.3),aux);
      if(uArt>.5&&m!=CRYST){float th;al=artRock(P,Nf,V,Nf,th)*(m==BED?.75:1.);}
      pointLights(P,Nf,V,10.,dif,spc);
      col=al*((L+amb)*(Nf.z>.5?.9:1.05)+dif*reach*.8)+spc*reach*.05;
      if(m==CRYST){vec3 e=uCryst*(.55+.25*sin(uTime*1.7+aux*40.))*(Nf.z>.5?1.:.45);col=uCryst*L*.4+e+step(.97,h21(floor(P.xy)+floor(uTime*4.)))*uCryst*.8;}
      vec3 em=bb(T);col+=em;
    }else{
      vec3 em=bb(T);float top=Nf.y<-.5?1.:0.,front=Nf.z>.5?1.:0.;
      if(m==LAVA){
        /* molten iron churns: Worley seams drift across the surface; the cut face shows it flowing */
        vec2 pq=top>.5?vec2(P.x,P.z*1.3):front>.5?vec2(P.x,P.y*1.4):vec2(P.z,P.y*1.4);
        vec2 qq=pq*vec2(.17,.24)+vec2(uTime*.11,-uTime*(front>.5?.25:.07));vec2 qi=floor(qq),qf=fract(qq);float d1=9.,d2=9.;
        for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 gq=vec2(i,j),oq=vec2(h21(qi+gq),h21(qi+gq+17.3));oq=.5+.45*sin(uTime*.6+6.2831*oq);float d=length(gq+oq-qf);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
        float seam=1.-smoothstep(.0,.22,d2-d1);
        col=vec3(.07,.025,.015)*L+em*(top>.5?.62:1.)*(.72+.55*seam);
        if(uArt>.5){float sc=1./26.;vec4 a=pla(pq*sc+vec2(uTime*.11,-uTime*(front>.5?.25:.07))*sc*2.,Nf,T_CRUST,artLod(P,Nf,V,sc),1.,Nf);float sm=smoothstep(.03,.32,a.r-a.b*.8);
          col=a.rgb*.2*L+em*(top>.5?.62:1.)*mix(.32,1.25,max(sm,seam*.3))*mix(1.,.8,clamp((1520.-T)/380.,0.,1.));}
        pointLights(P,Nf,V,60.,dif,spc);col+=spc*.25;
      }else if(m==IRON||m==SLAG||m==RAIL||m==HOUSE){
        vec3 al;float shin=50.,sk=.6;
        if(m==IRON){al=vec3(.17,.17,.19)*(.82+.36*aux)*temper(T);}
        else if(m==SLAG){al=vec3(.045,.04,.055)*(.8+.5*aux)+vec3(.05,.02,.08)*vn(P.xy*.6);sk=.9;}
        else if(m==RAIL){al=vec3(.2,.19,.21)*(abs(P.z)>1.7?.7:1.);if(fract(P.x/8.)<.13)al*=1.6;shin=70.;}
        else{al=vec3(.11,.09,.09)*(.85+.3*aux);if(fract(P.x*.5+P.y*.5)<.25&&aux>.7)al*=1.9;}
        if(uArt>.5){vec2 fu=fUV(P,Nf);
          if(m==IRON){float sc=1./24.,lod=artLod(P,Nf,V,sc);vec4 a=pla(fu*sc,Nf,T_IRON,lod,1.,Nf);float cr=1.-smoothstep(.22,.45,artA(fu*sc*1.3+.37,T_CRAZE,lod+.38).a);
            al=a.rgb/artMean(T_IRON)*.17*(.82+.36*aux)*temper(T);em*=T>1050.?.75+.25*cr:smoothstep(480.,1000.,T)*(.12+.88*cr);}
          else if(m==SLAG){float sc=1./22.;vec4 a=pla(fu*sc,Nf,T_OBSID,artLod(P,Nf,V,sc),1.2,Nf);al=a.rgb/artMean(T_OBSID)*.045*(.8+.5*aux)+vec3(.03,.012,.05)*a.a;em*=.4+.6*a.a;}
          else if(m==RAIL){float sc=1./16.;vec4 a=pla(vec2(P.x,Nf.z>.5?P.y:P.z)*sc,Nf,T_PLATE,artLod(P,Nf,V,sc),1.,Nf);al=a.rgb/artMean(T_PLATE)*.2*(abs(P.z)>1.7?.75:1.);}
          else{float sc=1./12.;vec4 a=pla(fu*sc,Nf,T_BRICK,artLod(P,Nf,V,sc),1.,Nf);al=a.rgb/artMean(T_BRICK)*.11*(.85+.3*aux);}}
        else if(m==IRON||m==SLAG)em*=.62+.7*vn(P.xy*.55+P.z*.3+aux*3.)*(T>700.?1.:.4)+.15*step(.8,vn(P.xy*.21+uTime*.05));
        pointLights(P,Nf,V,shin,dif,spc);
        float fres=pow(1.-max(dot(Nf,V),0.),4.);
        col=al*((L+amb)*1.05+dif*reach)+spc*reach*sk*(m==SLAG?vec3(.55,.45,.75):vec3(.6,.6,.65))+fres*(L+amb)*.12+em;
        if(m==HOUSE){vec4 sp=texelFetch(uSpr,cH,0);int ac=int(sp.a*255.+.5);if(sp.a>0.)col+=ac==255?pow(sp.rgb,vec3(2.2))*L*.5:pow(sp.rgb,vec3(2.2))*float(ac)/254.*6.*(front>.5?1.:.7);}
      }else if(m==ICE){
        vec3 itn=vec3(1);if(uArt>.5){float sc=1./30.;vec4 a=pla(fUV(P,Nf)*sc,Nf,T_ICE,artLod(P,Nf,V,sc),1.,Nf);itn=a.rgb/artMean(T_ICE)*.9;}
        pointLights(P,Nf,V,80.,dif,spc);
        float tw=step(.985,h21(floor(P.xy*1.7)+floor(P.z*2.)+floor(uTime*2.5+aux*7.)));
        col=uIce*itn*((L+amb)*.85+dif*reach*.7+.012)*(.85+.3*aux)+L*(front>.5?.1:.35)+tw*L*1.8+vec3(.01,.025,.04)+spc*reach*.8;
      }else if(m==SNOW){
        vec3 sal=vec3(.82,.88,.98);if(uArt>.5){float sc=1./28.;vec4 a=pla(fUV(P,Nf)*sc,Nf,T_SNOW,artLod(P,Nf,V,sc),1.,Nf);sal=a.rgb*1.35;}
        pointLights(P,Nf,V,20.,dif,spc);
        col=sal*((L+amb)*.95+dif*reach*.8+.012)*(.88+.24*aux)*(top>.5?1.1:.85)+step(.99,h21(floor(P.xy*2.)+floor(uTime*3.)))*L*1.2;
      }else if(m==RUBBLE){
        vec3 al=rockAlb(P.xy,aux)*1.15;if(uArt>.5){float sc=1./20.;vec4 a=pla(fUV(P,Nf)*sc,Nf,T_RUBBLE,artLod(P,Nf,V,sc),1.,Nf);al=a.rgb/artMean(T_RUBBLE)*lum(uBackB)*3.*mix(vec3(1),uBackB/max(lum(uBackB),1e-3),.4);}
        pointLights(P,Nf,V,10.,dif,spc);col=al*((L+amb)+dif*reach*.8)+em;
      }else if(m==EMBER){col=em*1.2;}
      else col=em+rockAlb(P.xy,aux)*L;
    }
  }else{
    col=backwall(P.xy)*L2(P.xy)*.1;
  }
  /* the far view where the cave runs deepest */
  if(uArt>.5&&uBackOk>0.){float bk=(kd<0?1.:(kd==0&&P.z<-ZP-2.)?smoothstep(-12.,-34.,P.z):0.)*uBackOk;
    if(bk>0.){vec4 s2=texelFetch(uState,clamp(cH,ivec2(0),ivec2(319,179)),0);int m2=int(s2.r*255.+.5)&127;if(kd==0&&(m2==ROCK||m2==BED||m2==CRYST))bk=0.;
      vec3 B=backdrop(D);B=mix(vec3(lum(B)),B,.85)*.34*uBackGain+uAmb*uTint*.05;col=mix(col,B,bk);}}
  col=Acc+Tr*col;
  vec4 cl=uVP*vec4(P.x,-P.y,P.z,1.);
  gl_FragDepth=clamp(cl.z/cl.w*.5+.5,0.,1.);
  o=vec4(col,haze);
}
