/* =====================================================================================
   21b. 3D — THE STUDIO LOOK. A second way of painting the same town, switched with the Look
        button (Classic is the look the remake shipped with, untouched). Studio paints every
        surface from a pack of textures: twenty layers of albedo and bumps, made on the GPU by
        code when the game starts. A picture in IMGS (the image list's numbers, e.g. '1.1')
        replaces its layer: it is scaled to the same brightness and given bumps from its shading.
   ===================================================================================== */
/* the layers, in order: name, the image list's number, tile size in dots, bump strength */
const TXL=[['cobble','1.1',24,4],['grass','1.2',32,1.3],['dirt','1.3',32,1.6],['sand','1.4',32,.9],['plaster','2.1',24,1.3],['brick','2.2',16,2.6],
  ['oak','2.3',8,1.6],['planks','4.1',12,2.2],['clay','3.1',16,3],['slate','3.2',16,2.6],['stone','2.4',16,2.6],['paint','2.5',24,1.6],['iron','4.2',8,1.1],
  ['canvas','4.3',12,.9],['bark','4.4',12,3],['leaves','4.5',16,2.2],['rock','4.6',32,3],['wool','4.7',4,.7],['leather','4.8',4,1.1],['brass','',4,.4]];
const IMGS=/*@@IMGS@@*/{};
const TXN=TXL.length,TXI={};TXL.forEach((l,i)=>TXI[l[0]]=i);
const TXS=+((/[?&]tex=(\d+)/.exec(location.search)||[])[1])||512;
const TX={ready:false,A:null,N:null,LM:new Float32Array(TXN*4),from:{}};
/* ---------- the code-painted surfaces. Every pattern repeats exactly over the tile, so nothing shows a seam ---------- */
const FS_GEN=GL_COMMON+`layout(location=0) out vec4 oA;layout(location=1) out vec4 oH;uniform int uL;uniform float uS;
float hp(vec2 q,int s){return ihf(int(q.x),int(q.y),s);}
float pv(vec2 p,vec2 F,int s){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);vec2 j=mod(i+1.,F);i=mod(i,F);
  return mix(mix(hp(i,s),hp(vec2(j.x,i.y),s),f.x),mix(hp(vec2(i.x,j.y),s),hp(j,s),f.x),f.y);}
float pf(vec2 u,vec2 F,int s){float a=.5,t=0.,n=0.;for(int i=0;i<5;i++){t+=a*pv(u*F,F,s+i*31);n+=a;a*=.5;F*=2.;}return t/n;}
float pn(vec2 u,float F,int s){return pf(u,vec2(F),s);}
/* cells: nearest and second distance, two hashes of the nearest cell */
vec4 vor(vec2 u,vec2 N,int s,float jt){vec2 p=u*N,i=floor(p),f=fract(p);float d1=9.,d2=9.;vec2 id=vec2(0.);
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y),c=mod(i+g,N);vec2 o=.5+(vec2(hp(c,s),hp(c,s+7))-.5)*jt;vec2 r=g+o-f;float d=dot(r,r);
    if(d<d1){d2=d1;d1=d;id=c;}else if(d<d2)d2=d;}
  return vec4(sqrt(d1),sqrt(d2),hp(id,s+13),hp(id,s+29));}
/* leaves: an ellipse in each cell at its own angle; the highest one wins */
float leafs(vec2 u,float N,int s,out float id,out float vein){vec2 p=u*N,i=floor(p),f=fract(p);float best=-1.;id=0.;vein=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y),c=mod(i+g,N);vec2 o=.5+(vec2(hp(c,s),hp(c,s+7))-.5)*.8,r=f-(g+o);float an=hp(c,s+3)*6.2832,ca=cos(an),sa=sin(an);
    vec2 q=vec2(ca*r.x+sa*r.y,-sa*r.x+ca*r.y);float sz=.62+.4*hp(c,s+5),d=length(q/vec2(sz,sz*.48));
    if(d<1.){float hh=(1.-d*d)*.5+hp(c,s+11);if(hh>best){best=hh;id=hp(c,s+13);vein=1.-smoothstep(0.,.035,abs(q.y));}}}
  return best;}
void main(){vec2 u=gl_FragCoord.xy/uS;vec3 a=vec3(.5);float g=.1,h=.5,c=1.;
  if(uL==0){/* cobbles: small rounded stones, each a little domed, set in dark grit */vec4 v=vor(u,vec2(21.,19.),11,.85);float sh=pn(u,48.,3),e=min(v.y-v.x,(.66-v.x)*1.15)+(sh-.5)*.06,dome=smoothstep(.0,.42,e);
    float gap=1.-smoothstep(.06,.16,e);h=pow(dome,.8)*(.62+.38*v.z)+sh*.1*dome;
    vec3 st=mix(vec3(.4,.39,.38),vec3(.46,.41,.35),v.w)*(.76+.32*v.z)*(.86+.22*pn(u,24.,5));st*=.86+.2*smoothstep(.5,.95,dome);
    a=mix(st,vec3(.19,.17,.14)*(.8+.4*pn(u,64.,9)),gap);g=mix(.22,.04,gap)*(.7+.6*smoothstep(.6,1.,dome));c=1.-gap*.9;}
  else if(uL==1){/* grass */float n1=pn(u,4.,21),n2=pn(u,16.,23),bl=pf(u,vec2(160.,40.),25)*.5+pf(u,vec2(40.,160.),27)*.5;
    float yel=smoothstep(.55,.75,n1),bare=smoothstep(.72,.8,pn(u,6.,29));vec3 gr=mix(vec3(.24,.33,.17),vec3(.38,.37,.2),yel)*(.66+.56*bl)*(.85+.25*n2);
    vec4 cl=vor(u,vec2(48.),31,.9);gr=mix(gr,vec3(.22,.38,.18),step(cl.x,.2)*step(.8,cl.z)*.8);
    a=mix(gr,vec3(.34,.28,.21)*(.8+.3*n2),bare*(1.-bl*.5));h=bl*.7+n2*.3-bare*.3;g=.06;c=.55+.45*bl;}
  else if(uL==2){/* dirt */float n=pn(u,8.,41),f=pn(u,64.,43);vec4 pb=vor(u,vec2(28.),45,.9);float peb=(1.-smoothstep(.06+.1*pb.w,.12+.1*pb.w,pb.x))*step(.72,pb.z);
    float rut=(1.-smoothstep(0.,.07,abs(fract(u.x*2.+.12*pv(u*vec2(2.,4.),vec2(2.,4.),48))-.5)))*.35;
    a=mix(vec3(.4,.33,.26)*(.72+.45*n)*(.9+.2*f)*(1.-rut*.4),vec3(.36,.33,.29)*(.75+.4*pb.w),peb*.85);h=n*.4+f*.25+peb*.4-rut;g=.07+peb*.1;c=.6+.4*clamp(h,0.,1.);}
  else if(uL==3){/* sand */float rp=sin((u.y*7.+pn(u,3.,51)*.6)*6.2832),gn=pn(u,96.,53);vec4 sh=vor(u,vec2(20.),55,.9);float shell=(1.-smoothstep(.05,.1,sh.x))*step(.85,sh.z);
    a=mix(vec3(.47,.43,.36)*(.9+.12*rp)*(.85+.25*gn),vec3(.63,.6,.55),shell);h=.5+rp*.25+gn*.25+shell*.3;g=.1;c=.8+.2*rp;}
  else if(uL==4){/* plaster */float lump=pn(u,6.,61)*.6+pn(u,24.,63)*.4,fine=pn(u,96.,65),stain=smoothstep(.55,.8,pf(u,vec2(10.,2.),67))*.28;
    vec3 p=vec3(.68,.65,.6)*(.92+.12*pn(u,3.,69))*(1.-stain)*(.94+.08*fine);float fp=pn(u,6.,71)*.7+pn(u,24.,72)*.3,fall=smoothstep(.75,.77,fp),rim=smoothstep(.72,.75,fp)*(1.-fall);
    vec4 sv=vor(u,vec2(10.,8.),73,.8);vec3 stn=vec3(.5,.46,.41)*(.8+.3*sv.z)*(1.-.6*(1.-smoothstep(.02,.07,sv.y-sv.x)));
    vec4 cr=vor(u,vec2(5.),75,1.);float crack=(1.-smoothstep(0.,.014,cr.y-cr.x))*smoothstep(.55,.7,pn(u,8.,77));
    a=mix(p,stn,fall)*(1.-crack*.5);h=mix(.55+lump*.35+rim*.1,.18+.15*sv.z,fall)-crack*.3;g=.05;c=1.-crack*.7-fall*.35;}
  else if(uL==5){/* brick */vec2 b=u*vec2(8.,24.);float r=floor(b.y);b.x+=mod(r,2.)*.5;vec2 id=vec2(mod(floor(b.x),8.),r),f=fract(b);
    float e=min(min(f.x,1.-f.x)*2.,min(f.y,1.-f.y)*.667)+(pn(u,64.,81)-.5)*.03,mort=1.-smoothstep(.04,.075,e),hs=hp(id,83),hs2=hp(id,85);
    vec3 bc=mix(vec3(.47,.25,.18),vec3(.38,.22,.17),hs)*(.8+.3*hs2)*(.88+.24*pn(u,48.,87));if(hs2>.9)bc*=.6;bc*=1.-smoothstep(.5,.85,pf(u,vec2(4.,8.),89))*.35;
    a=mix(bc,vec3(.5,.47,.42)*(.8+.3*pn(u,96.,91)),mort);h=mix(.75+.2*smoothstep(0.,.15,e)+.05*pn(u,64.,93),.22,mort);g=mix(.09,.04,mort);c=1.-mort*.6;}
  else if(uL==6){/* dark oak, the grain running up the beam */float gr=pf(u,vec2(24.,1.),101)*.6+pf(u,vec2(96.,2.),103)*.4,ring=sin((u.x*12.+gr*3.)*6.2832)*.5+.5;
    float crack=smoothstep(.82,.9,pf(u,vec2(48.,3.),105));a=vec3(.26,.2,.15)*(.65+.45*gr)*(.9+.15*ring)*(1.-crack*.7);h=.5+gr*.3+ring*.1-crack*.4;g=.1;c=1.-crack*.8;}
  else if(uL==7){/* planks: eight boards up the tile */float pk=floor(u.x*8.),fx=fract(u.x*8.),hs=hp(vec2(pk,0.),111),off=hp(vec2(pk,1.),113);vec2 w=vec2(u.x,u.y+off);
    float gr=pf(w,vec2(64.,2.),115)*.6+pf(w,vec2(16.,1.),117)*.4,edge=min(fx,1.-fx)*1.5,gap=1.-smoothstep(.03,.08,edge);
    vec4 kn=vor(u,vec2(8.,3.),119,.6);float knot=(1.-smoothstep(.05,.14,kn.x))*step(.7,kn.z);
    vec3 c3=mix(vec3(.42,.37,.31),vec3(.36,.31,.25),hs)*(.7+.45*gr);c3=mix(c3,vec3(.2,.15,.11),knot*.8);
    a=mix(c3,vec3(.06,.05,.04),gap);h=mix(.7+.2*smoothstep(0.,.2,edge)+.1*gr,.1,gap)-knot*.1;g=mix(.1,.02,gap);c=1.-gap;}
  else if(uL==8||uL==9){/* roof tiles, clay or slate: the lower edge of each row lies over the row below */bool cl=uL==8;vec2 b=u*vec2(cl?8.:6.,12.);float r=floor(b.y);b.x+=mod(r,2.)*.5;
    vec2 id=vec2(mod(floor(b.x),cl?8.:6.),r),f=fract(b);float barrel=cl?sin(f.x*3.1416):.8,edge=smoothstep(0.,cl?.06:.035,f.x)*smoothstep(1.,cl?.94:.965,f.x),lap=1.-f.y;
    h=(.35+.45*barrel*edge)*(.5+.5*lap)+.08*pn(u,64.,121);float hs=hp(id,123),moss=smoothstep(.58,.8,pn(u,4.,cl?129:153)+(1.-barrel)*.12);
    vec3 tc=cl?mix(vec3(.56,.3,.2),vec3(.47,.28,.21),hs):vec3(.27,.29,.32)*(.75+.3*hs);tc*=(.8+.35*hp(id,125))*(.85+.2*pn(u,32.,127));
    a=mix(tc,vec3(.21,.26,.15)*(.7+.4*pn(u,48.,131)),moss*.85)*(.58+.42*smoothstep(1.,.8,f.y))*(.65+.35*edge);g=mix(cl?.13:.22,.04,moss);c=edge*(.45+.55*smoothstep(1.,.82,f.y));}
  else if(uL==10){/* dressed stone: five courses, three blocks each, the joints set off course by course */float r=floor(u.y*5.),fy=fract(u.y*5.),bx=u.x*3.+hp(vec2(r,0.),161),fx=fract(bx);
    float e=min(min(fx,1.-fx)*5.33,min(fy,1.-fy)*3.2)+(pn(u,32.,163)-.5)*.12,j=1.-smoothstep(.06,.14,e),hs=hp(vec2(mod(floor(bx),3.),r),165);
    vec3 sc=mix(vec3(.46,.44,.4),vec3(.42,.39,.34),hs)*(.85+.25*pn(u,16.,167))*(.9+.15*pn(u,64.,169));sc=mix(sc,vec3(.3,.34,.2),smoothstep(.6,.8,pn(u,8.,171))*(1.-smoothstep(.1,.6,e))*.7);
    a=mix(sc,vec3(.25,.23,.2),j);h=mix(.6+.25*smoothstep(0.,.4,e)+.12*pn(u,48.,173),.15,j);g=mix(.1,.04,j);c=1.-j*.8;}
  else if(uL==11){/* old paint over stone */float fl=pn(u,6.,181)*.7+pn(u,24.,183)*.3,peel=smoothstep(.66,.69,fl),rim=smoothstep(.62,.66,fl)*(1.-peel),rust=smoothstep(.6,.9,pf(u,vec2(12.,1.),185))*.5;
    vec3 pc=mix(vec3(.8,.79,.75)*(.93+.08*pn(u,48.,187)),vec3(.55,.4,.3),rust*(1.-peel)*.6);a=mix(pc,vec3(.42,.41,.39)*(.8+.3*pn(u,32.,189)),peel);
    h=mix(.7+.05*pn(u,64.,191),.35,peel)+rim*.15;g=mix(.25,.08,peel);c=1.-peel*.4;}
  else if(uL==12){/* wrought iron */vec4 hm=vor(u,vec2(14.),201,.9);float rust=smoothstep(.62,.8,pn(u,4.,203)+pn(u,32.,205)*.2),chip=step(.86,pn(u,48.,207));
    a=mix(vec3(.16,.16,.17)*(.85+.25*pn(u,24.,209)),vec3(.34,.19,.11)*(.7+.5*pn(u,64.,211)),rust);a=mix(a,vec3(.28,.28,.29),chip*(1.-rust));
    h=.5+smoothstep(0.,.5,hm.x)*.25-rust*.15+.1*pn(u,64.,213);g=mix(.5,.12,rust);c=1.-rust*.3;}
  else if(uL==13){/* canvas */vec2 w=u*192.;float wv=sin(w.x*6.2832)*sin(w.y*6.2832),th=pn(u,96.,221),st=smoothstep(.6,.85,pn(u,4.,223))*.2;
    a=vec3(.66,.62,.53)*(.9+.1*wv)*(1.-st)*(.92+.12*th);h=.5+wv*.3+th*.2;g=.03;c=.85+.15*wv;}
  else if(uL==14){/* bark: ridges up the trunk */float rd=pf(u,vec2(10.,1.),231)*.65+pf(u,vec2(30.,3.),233)*.35,ridge=smoothstep(.35,.65,rd);vec4 pl=vor(u,vec2(8.,3.),235,.8);
    float plate=smoothstep(0.,.15,pl.y-pl.x),moss=smoothstep(.6,.8,pn(u,4.,237));a=mix(vec3(.3,.27,.24)*(.6+.5*ridge)*(.85+.2*pl.z),vec3(.24,.3,.16),moss*.8*ridge);
    h=ridge*.7*plate+.15+.1*pn(u,64.,239);g=.05;c=.35+.65*ridge;}
  else if(uL==15){/* leaves */float i1,v1,i2,v2,l1=leafs(u,10.,241,i1,v1),l2=leafs(u+.31,17.,251,i2,v2)-.25;bool sec=l2>l1;float L=max(l1,l2),id=sec?i2:i1,vn_=sec?v2:v1;
    vec3 lc=mix(vec3(.18,.27,.12),vec3(.24,.33,.15),id)*(.8+.3*pn(u,32.,259));if(id>.93)lc=vec3(.42,.38,.16);lc*=1.-vn_*.25;
    a=L<0.?vec3(.05,.08,.04):lc*(sec?.85:1.);h=L<0.?0.:clamp(L,0.,1.)*.8-vn_*.08;g=L<0.?.02:.16;c=L<0.?.2:1.;}
  else if(uL==16){/* coastal rock */float st=pf(u,vec2(2.,8.),261)*.6+pn(u,16.,263)*.4,lay=sin((u.y*6.+st*1.5)*6.2832)*.5+.5;vec4 cr=vor(u,vec2(6.),265,1.);
    float crack=1.-smoothstep(0.,.05,cr.y-cr.x),lich=smoothstep(.65,.8,pn(u,8.,267));vec3 r=mix(vec3(.38,.38,.37)*(.75+.35*st)*(.9+.15*lay),vec3(.5,.46,.25),lich*.7);
    a=r*(1.-crack*.6);h=st*.6+lay*.2+smoothstep(0.,.3,cr.y-cr.x)*.2-crack*.3;g=.12;c=1.-crack*.8;}
  else if(uL==17){/* wool twill */float tw=sin((u.x+u.y)*6.2832*48.)*.5+.5,fz=pn(u,64.,271),pill=pn(u,8.,273);
    a=vec3(.62,.62,.62)*(.85+.15*tw)*(.85+.25*fz)*(.9+.1*pill);h=.5+tw*.3+fz*.2;g=.03;c=.8+.2*tw;}
  else if(uL==18){/* worn leather */vec4 cr=vor(u,vec2(9.),281,1.);float crease=1.-smoothstep(0.,.08,cr.y-cr.x),n=pn(u,16.,283),scuff=smoothstep(.6,.85,pn(u,4.,285));
    a=mix(vec3(.3,.2,.14)*(.8+.3*n)*(1.-crease*.35),vec3(.42,.32,.24),scuff*.6);h=.6-crease*.4+n*.15;g=mix(.35,.15,scuff);c=1.-crease*.5;}
  else{/* brass, brushed and tarnished */float sc=pf(u,vec2(128.,4.),291),tar=smoothstep(.55,.8,pn(u,4.,293));a=mix(vec3(.72,.56,.3)*(.85+.2*sc),vec3(.3,.25,.15),tar*.7);h=.5+sc*.1;g=mix(.7,.25,tar);c=1.;}
  oA=vec4(clamp(a,0.,1.),g);oH=vec4(clamp(h,0.,1.),clamp(c,0.,1.),0.,1.);}`;
/* a picture becomes a layer: its colour brought to the code layer's brightness, bumps from its fine shading */
const FS_GENIMG=`layout(location=0) out vec4 oA;layout(location=1) out vec4 oH;uniform sampler2D uImg;uniform float uS;uniform vec4 uTgt;
void main(){vec2 u=gl_FragCoord.xy/uS;vec3 c=texture(uImg,u).rgb,m=textureLod(uImg,vec2(.5),20.).rgb;float lm=dot(m,vec3(.3,.59,.11)),lc=dot(c,vec3(.3,.59,.11)),lb=dot(textureLod(uImg,u,3.5).rgb,vec3(.3,.59,.11));
  oA=vec4(clamp(c*(uTgt.x/max(lm,.02)),0.,1.),clamp(uTgt.y*(.75+.5*clamp(lc/max(lm,.02),0.,2.)*.5),0.,1.));float h=clamp(.5+(lc-lb)/max(lm,.05)*.9,0.,1.);oH=vec4(h,smoothstep(.2,.55,h),0.,1.);}`;
/* the bumps: the slope of the height, wrapped round the tile's edges */
const FS_GENN=`out vec4 o;uniform sampler2D uH;uniform float uK;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);int S=textureSize(uH,0).x;
  #define HT(dx,dy) texelFetch(uH,ivec2((p.x+dx+S)%S,(p.y+dy+S)%S),0).r
  float gx=(HT(-1,-1)+2.*HT(-1,0)+HT(-1,1))-(HT(1,-1)+2.*HT(1,0)+HT(1,1)),gy=(HT(-1,-1)+2.*HT(0,-1)+HT(1,-1))-(HT(-1,1)+2.*HT(0,1)+HT(1,1));
  vec4 c=texelFetch(uH,p,0);o=vec4(clamp(vec2(gx,gy)*.25*uK*float(S)/256.,-1.,1.)*.5+.5,c.r,c.g);}`;
function texGen(){
  if(TX.ready)return;const t0=performance.now(),S=TXS,lv=Math.log2(S)+1|0;
  const mkA=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,lv,gl.RGBA8,S,S,TXN);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);
    const af=gl.getExtension('EXT_texture_filter_anisotropic');if(af)gl.texParameterf(gl.TEXTURE_2D_ARRAY,af.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(af.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));return t;};
  TX.A=mkA();TX.N=mkA();
  const pg=prog(VS_FS,FS_GEN),pi=prog(VS_FS,FS_GENIMG),pn=prog(VS_FS,FS_GENN);for(const p of [pg]){gl.useProgram(p.p);if(p.u.uNT)gl.uniform1i(p.u.uNT,7);}
  const tmp=mkTex(S,S,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,null,gl.NEAREST,gl.REPEAT),f1=gl.createFramebuffer(),f2=gl.createFramebuffer();
  gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.viewport(0,0,S,S);gl.bindVertexArray(VAO0);
  const imgs=[];
  for(let L=0;L<TXN;L++){
    gl.bindFramebuffer(gl.FRAMEBUFFER,f1);gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,TX.A,0,L);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,tmp,0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);gl.useProgram(pg.p);gl.uniform1i(pg.u.uL,L);gl.uniform1f(pg.u.uS,S);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,f2);gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,TX.N,0,L);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.useProgram(pn.p);bindT(0,tmp,pn.u.uH);gl.uniform1f(pn.u.uK,TXL[L][3]);gl.drawArrays(gl.TRIANGLES,0,3);
    const key=TXL[L][1];if(key&&IMGS[key])imgs.push(L);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.drawBuffers([gl.BACK]);
  for(const T of [TX.A,TX.N]){gl.bindTexture(gl.TEXTURE_2D_ARRAY,T);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);}
  texMeans();
  gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.A);gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D_ARRAY,TX.N);gl.activeTexture(gl.TEXTURE0);
  TX.ready=true;TX.ms=Math.round(performance.now()-t0);
  /* pictures arrive after their decode; each one repaints its layer and the mips again */
  for(const L of imgs){const im=new Image();im.onload=()=>{texFromImage(L,im,pi,pn,tmp,f1,f2);};im.src=IMGS[TXL[L][1]];}
}
/* the average colour of each layer, from its smallest mip: lets the shader keep the town as bright as Classic */
function texMeans(){const f=gl.createFramebuffer(),lv=Math.max(0,(Math.log2(TXS)|0)-4),n=TXS>>lv,px=new Uint8Array(n*n*4);gl.bindFramebuffer(gl.FRAMEBUFFER,f);
  /* the mean of the squared colour (the shader squares it), from a 16 x 16 mip */
  for(let L=0;L<TXN;L++){gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,TX.A,lv,L);gl.readPixels(0,0,n,n,gl.RGBA,gl.UNSIGNED_BYTE,px);
    const m=[0,0,0,0];for(let i=0;i<n*n;i++){for(let k=0;k<3;k++){const v=px[i*4+k]/255;m[k]+=v*v;}m[3]+=px[i*4+3]/255;}for(let k=0;k<4;k++)TX.LM[L*4+k]=m[k]/(n*n);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(f);}
function texFromImage(L,im,pi,pn,tmp,f1,f2){
  const S=TXS,it=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,it);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.generateMipmap(gl.TEXTURE_2D);texParams(gl.LINEAR_MIPMAP_LINEAR,gl.REPEAT);
  const lm=TX.LM[L*4]*.3+TX.LM[L*4+1]*.59+TX.LM[L*4+2]*.11;
  gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.viewport(0,0,S,S);gl.bindVertexArray(VAO0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,f1);gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,TX.A,0,L);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,tmp,0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);gl.useProgram(pi.p);bindT(0,it,pi.u.uImg);gl.uniform1f(pi.u.uS,S);gl.uniform4f(pi.u.uTgt,Math.sqrt(lm),TX.LM[L*4+3],0,0);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.bindFramebuffer(gl.FRAMEBUFFER,f2);gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,TX.N,0,L);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.useProgram(pn.p);bindT(0,tmp,pn.u.uH);gl.uniform1f(pn.u.uK,TXL[L][3]);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.drawBuffers([gl.BACK]);gl.deleteTexture(it);
  for(const [T,u] of [[TX.A,8],[TX.N,9]]){gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D_ARRAY,T);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);}gl.activeTexture(gl.TEXTURE0);
  texMeans();TX.from[TXL[L][0]]='picture';
}
/* ---------- the Studio town: the same plan and the same lights, painted from the pack ---------- */
const FS_WORLDS=GL_COMMON+GL_LIGHT+`precision highp sampler2DArray;
in vec3 vP;in vec3 vN;in vec4 vC;in vec4 vM;out vec4 o;
uniform vec3 uCam;uniform vec4 uWorld;uniform sampler2D uGround;uniform sampler2D uAO;uniform vec4 uLampG[16];uniform vec3 uTint;uniform vec3 uEmis;
uniform sampler2DArray uTA,uTN;uniform vec4 uOrg;uniform vec4 uSQ;uniform vec4 uLM[${TXN}];
vec4 TA,TN;
void tx(vec2 uv,int L){TA=texture(uTA,vec3(uv,float(L)));TN=texture(uTN,vec3(uv,float(L)));}
float lum(vec3 c){return dot(c,vec3(.3,.59,.11));}
/* the layer's colour at a set brightness, or the layer as a pattern over a colour of the thing's own */
vec3 tcol(int L,float tg){return TA.rgb*TA.rgb*(tg/max(lum(uLM[L].rgb),.004));}
vec3 tpat(int L,vec3 base){vec3 t=TA.rgb*TA.rgb,m=max(uLM[L].rgb,vec3(.004));return base*mix(vec3(lum(t)/lum(m)),t/m,.35);}
vec3 bmp(vec3 N,vec3 T,vec3 B,float k){vec2 g=(TN.xy*2.-1.)*k*uSQ.y;return normalize(N+T*g.x+B*g.y);}
vec2 dax(vec3 P,vec3 N,out vec3 T,out vec3 B){vec3 a=abs(N);if(a.y>a.x&&a.y>a.z){T=vec3(1,0,0);B=vec3(0,0,1);return P.xz;}if(a.x>a.z){T=vec3(0,0,1);B=vec3(0,1,0);return P.zy;}T=vec3(1,0,0);B=vec3(0,1,0);return P.xy;}
void main(){
  vec3 P=vP,N=normalize(vN),V=normalize(uCam-P);int id=int(vM.x+.5);float sd=vM.z;
  vec3 alb=vC.rgb*vC.rgb;float gl=vC.a,aa=clamp(1.-length(fwidth(P))*.5,0.,1.);vec3 em=vec3(0.);float wet=uWorld.z,refl=0.,cav=1.;TN=vec4(.5,.5,.5,1.);
  if(id==1){/* the ground: cobbles, grass, dirt and sand from the pack, blended by the plan */
    vec2 q=P.xz,wq=q+(vec2(vn(q*.3),vn(q*.3+17.))-.5)*2.4;vec4 w=texture(uGround,wq/uWorld.xy);w/=max(w.r+w.g+w.b+w.a,.001);
    vec3 a=vec3(0.);float g=0.,cv=0.;vec2 gg=vec2(0.);float mv=.8+.4*fbm(q*.019+3.);
    if(w.r>.01){tx(q/24.,0);a+=tcol(0,.17)*w.r;g+=TA.a*w.r;gg+=(TN.xy*2.-1.)*w.r;cv+=TN.w*w.r;}
    if(w.g>.01){tx(q/32.+.37,1);a+=tcol(1,.075)*w.g;g+=TA.a*w.g;gg+=(TN.xy*2.-1.)*w.g;cv+=TN.w*w.g;}
    if(w.b>.01){tx(q/32.+.61,2);a+=tcol(2,.12)*w.b;g+=TA.a*w.b;gg+=(TN.xy*2.-1.)*w.b;cv+=TN.w*w.b;}
    if(w.a>.01){tx(q/32.+.13,3);a+=tcol(3,.17)*w.a;g+=TA.a*w.a;gg+=(TN.xy*2.-1.)*w.a;cv+=TN.w*w.a;}
    alb=a*mv;gl=g;cav=cv;gg*=uSQ.y;N=normalize(vec3(gg.x,1.,gg.y));
    if(wet>0.){/* rain: water in the gaps between the stones, puddles in the hollows, a dark sheen on everything */
      float pud=smoothstep(.5,.64,fbm(q*.055+vec2(3.,7.)))*(w.r+w.b),seep=(1.-cv)*w.r,wt=max(pud,seep*.8);
      alb*=1.-.35*(w.r+w.b)-.25*pud;gl=mix(gl,.62,(w.r+w.b)*.75);gl=mix(gl,1.,wt);N=normalize(mix(N,vec3(0.,1.,0.),pud*.93));cav=mix(cav,1.,pud);
      refl=uSQ.x*(pud*.95+seep*.4+(w.r+w.b)*.1);}}
  else if(id==2){/* walls: Classic's plan of windows, doors and beams, over plaster, oak and stone from the pack */
    float hw=vM.y,v=P.y,ph=h21(vec2(sd,1.7));vec4 cr=floor(vC*255.+.5);float u0=cr.r+cr.g*256.-64.,L=max(cr.b+cr.a*256.,1.);
    bool xf=abs(N.x)>abs(N.z);float ux=xf?P.z:P.x;vec3 T=xf?vec3(0,0,1):vec3(1,0,0),B=vec3(0,1,0);int face=xf?(N.x>0.?0:1):(N.z>0.?2:3),isd=int(sd+.5);
    vec3 base=ph<.2?vec3(.36,.31,.25):ph<.4?vec3(.30,.27,.24):ph<.6?vec3(.34,.25,.17):ph<.8?vec3(.24,.25,.27):vec3(.32,.2,.15);
    float n=max(1.,floor(L/10.)),spc=L/n,rel=ux-u0,ci=clamp(floor(rel/spc),0.,n-1.),fu=rel-ci*spc-spc*.5;int iw=int(ci);
    float fl=v<18.?0.:1.,fv=v-(fl<.5?7.:21.);int dI=ihf(isd,face,5)<.6?int(ih(isd,face,3)%uint(n)):-1;
    bool tim=h21(vec2(sd,7.))>.6,door=fl<.5&&iw==dI,hasW=!door&&ihf(isd,face*8+iw,int(fl))>.25&&(fl<.5||hw>=31.)&&v<hw-1.;
    /* first decide what this point of the wall is, then read the pack once for it */
    int k=0;bool hz=false;
    if(tim&&v>2.5&&v<hw-1.&&(abs(v-18.)<.7||abs(abs(fu)-spc*.5)<.45||(v>18.7&&abs(fract((fu+v*.8)/10.)-.5)<.04))){k=1;hz=abs(v-18.)<.7;}
    if(hasW&&abs(fu)<2.4&&fv>-.6&&fv<8.4)k=abs(fu)<2.&&fv>0.&&fv<8.?2:fv<0.?3:4;
    else if(door&&abs(fu)<2.35&&v<11.4&&length(vec2(fu,max(v-9.,0.)))<2.3)k=5;
    if(v<2.4)k=6;
    if(k==0){tx(vec2(ux+sd*13.7,v)/24.,4);alb=tpat(4,base*base*1.6);alb*=.72+.28*smoothstep(0.,7.,v);alb*=1.-.22*smoothstep(hw-5.,hw,v);gl=TA.a+wet*.06;N=bmp(N,T,B,1.);cav=TN.w;
      /* rain marks run down from each window sill */
      if(abs(fu)<2.2&&fv<0.&&fv>-7.&&ihf(isd,face*8+iw,int(fl))>.25&&(fl<.5||hw>=31.))alb*=1.-.18*smoothstep(-7.,0.,fv)*smoothstep(.6,.2,fract(fu*1.7+.3));}
    else if(k==1){tx(hz?vec2(v,ux)/8.:vec2(ux,v)/8.,6);alb=tcol(6,.028);gl=TA.a;N=bmp(N,hz?B:T,hz?T:B,1.);cav=TN.w;}
    else if(k==2){bool bar=abs(fu)<.12||abs(fv-4.)<.12;alb=bar?vec3(.03,.025,.02):vec3(.012,.014,.017);gl=bar?.1:.95;
      N=normalize(N+vec3(vn(P.xz*3.)-.5,0.,vn(P.zx*3.)-.5)*.04);float lw=ihf(isd*3+iw,int(fl),face+17);if(!bar)refl=uSQ.x*.55;
      if(lw>.9&&!bar){/* a lit room: warm light through curtains drawn to the sides */vec2 cu=vec2(fu,fv-4.);float cur=smoothstep(.95,1.35,abs(fu))*(.7+.3*sin(fu*9.+fv*.3));
        em=vec3(1.,.52,.2)*(.035+.015*sin(uWorld.w*2.3+ci))*(.6+.4*smoothstep(2.6,0.,length(cu*vec2(1.,.6))));em=mix(em*1.25,em*vec3(.9,.45,.25)*.55,cur);refl*=.3;}}
    else if(k==3){tx(vec2(ux,v)/16.,10);alb=tcol(10,.07);gl=TA.a+wet*.2;N=bmp(N,T,B,1.);cav=TN.w;}
    else if(k==4){tx(vec2(ux,v)/8.,6);alb=tcol(6,.05);gl=.1;N=bmp(N,T,B,1.);cav=TN.w;}
    else if(k==5){uint dk=ih(isd,face,9)%4u;vec3 dc=dk==0u?vec3(.075,.045,.03):dk==1u?vec3(.03,.06,.04):dk==2u?vec3(.09,.025,.02):vec3(.025,.035,.06);
      tx(vec2(fu/12.4+.5,v/24.),7);alb=tpat(7,dc);gl=.14+wet*.2;N=bmp(N,T,B,1.);cav=TN.w;if(abs(fu)<.06||abs(fract(v/2.8)-.5)<.03)alb*=.45;
      if(abs(fu-1.5)<.18&&abs(v-5.2)<.18){alb=vec3(.4,.3,.12);gl=.7;}}
    else{tx(vec2(ux,v)/16.,10);alb=tcol(10,.085);gl=TA.a+wet*.2;N=bmp(N,T,B,1.);cav=TN.w;}}
  else if(id==3){/* roofs: clay or slate from the pack, with moss where the rain sits */
    bool clay=h21(vec2(sd,3.))>.42,xf=abs(N.x)>abs(N.z);float u=xf?P.z:P.x;vec3 T=xf?vec3(0,0,1):vec3(1,0,0),B=normalize(vec3(0,1,0)-N*N.y);int L=clay?8:9;
    tx(vec2(u/16.+sd*.37,P.y/12.),L);alb=tcol(L,clay?.075:.045);alb=mix(alb,vec3(.03,.045,.02),smoothstep(.62,.82,fbm(P.xz*.13+sd))*.5);gl=TA.a+wet*.16;N=bmp(N,T,B,1.);cav=TN.w;}
  else if(id>=18){/* the lamplighter's clothes: the pack laid on in his own frame, so it moves with him */
    vec3 d=P-uOrg.xyz;float c=cos(uOrg.w),s=sin(uOrg.w);vec3 lp=vec3(d.x*c+d.z*s,d.y,-d.x*s+d.z*c),ln=vec3(N.x*c+N.z*s,N.y,-N.x*s+N.z*c),T,B;vec2 uv=dax(lp,ln,T,B);
    T=vec3(T.x*c-T.z*s,T.y,T.x*s+T.z*c);B=vec3(B.x*c-B.z*s,B.y,B.x*s+B.z*c);int L=id==18||id==22?17:id==19?18:id==21?19:-1;
    if(L>=0){tx(uv/(id==22?2.2:4.),L);alb=tpat(L,alb);gl=mix(gl,TA.a,.6);N=bmp(N,T,B,id==22?1.6:.8);cav=mix(1.,TN.w,.6);}
    float rim=pow(1.-max(dot(N,V),0.),3.);em+=(uMoonC*1.2+uSky*1.6)*rim*alb*9.;}
  else if(id==13){vec4 g=uLampG[int(sd+.5)];alb=vec3(.02,.022,.025);gl=.95;em=g.rgb+vec3(1.,.5,.2)*g.w*(.7+.3*sin(uWorld.w*5.+sd));}
  else if(id==12){alb=vec3(.008,.01,.01);gl=.5;}
  else if(id==10){/* the lighthouse: its bands, painted over stone */vec3 T,B;vec2 uv=dax(P,N,T,B);float b=mod(floor((P.y-3.)/16.),2.);tx(vec2(atan(P.z-uGrP.z,P.x-uGrP.x)*4.,P.y)/24.,11);
    alb=tpat(11,b>.5?vec3(.16,.012,.01):vec3(.6,.58,.54));gl=TA.a+.1;N=bmp(N,normalize(cross(vec3(0,1,0),N)),vec3(0,1,0),1.);cav=TN.w;
    float a=atan(P.z-uGrP.z,P.x-uGrP.x);if(fract(P.y/23.)>.86&&abs(fract(a*1.2732)-.5)<.12&&P.y<80.){alb=vec3(.01);gl=.9;}}
  else if(id>0){vec3 T,B;vec2 uv=dax(P,N,T,B);
    if(id==4){bool ax=sd<.5;vec2 pu;if(abs(N.y)>.5){pu=ax?vec2(P.z,P.x):vec2(P.x,P.z);T=ax?vec3(0,0,1):vec3(1,0,0);B=ax?vec3(1,0,0):vec3(0,0,1);}else{pu=vec2(P.y,dot(P,T));B=T;T=vec3(0,1,0);}
      tx(pu/vec2(12.4,24.),7);alb=tpat(7,alb);gl=TA.a+wet*.3;N=bmp(N,T,B,1.);cav=TN.w;if(wet>0.&&abs(N.y)>.5)refl=uSQ.x*.15;}
    else if(id==5){tx(uv/16.,10);alb=tpat(10,alb);gl=TA.a+wet*.3;N=bmp(N,T,B,1.);cav=TN.w;}
    else if(id==6||id==17){tx(uv/8.,12);alb=tpat(12,alb);gl=id==17?.6:TA.a;N=bmp(N,T,B,.8);cav=TN.w;}
    else if(id==7){float n=fbm(P.xz*.8+P.y*.6+sd);tx(uv/16.,15);alb=tpat(15,alb*(.6+.8*n));gl=TA.a;N=normalize(bmp(N,T,B,1.)+(vec3(vn(P.xz*1.3),vn(P.zy*1.3),vn(P.yx*1.3))-.5)*.5);cav=TN.w;}
    else if(id==8){tx(uv/24.,11);alb=tpat(11,alb);gl=TA.a;N=bmp(N,T,B,.8);cav=TN.w;}
    else if(id==9){tx(uv/32.,16);alb=tpat(16,alb);gl=TA.a+wet*.3;N=bmp(N,T,B,1.2);cav=TN.w;}
    else if(id==11){float s=step(.5,fract(P.x/1.6)),ph=h21(vec2(sd,9.));vec3 c1=ph<.33?vec3(.4,.05,.04):ph<.66?vec3(.06,.2,.08):vec3(.05,.1,.3);tx(uv/12.,13);alb=tpat(13,mix(c1,vec3(.55,.5,.4),s));gl=.03;N=bmp(N,T,B,1.);cav=TN.w;}
    else if(id==14){tx(uv/16.,5);alb=tpat(5,alb);gl=TA.a+wet*.15;N=bmp(N,T,B,1.);cav=TN.w;}
    else if(id==15){vec2 q=fract(P.xz*.7);float bar=step(.55,q.x);tx(uv/8.,12);alb=mix(vec3(.004),tpat(12,alb),bar);gl=bar*.6;}
    else if(id==16){tx(uv/12.,14);alb=tpat(14,alb);gl=TA.a;N=bmp(N,T,B,1.2);cav=TN.w;}}
  alb*=uTint;alb*=.45+.55*cav;
  vec3 D,Sp;lights(P,N,V,gl,D,Sp);
  /* wet stone and glass mirror the lamps, the lantern, the moon and the sky */
  if(refl>.001){vec3 R=reflect(-V,N);float fr=.04+.96*pow(1.-max(dot(N,V),0.),5.);vec3 rc=uSky*2.2;
    if(uLanH.w>0.){vec3 l=uLanP.xyz-P;float dl=length(l);rc+=C_LAN*(uLanI.x*.7+uLanI.y)*pow(max(dot(R,l/dl),0.),160.)*12./(1.+dl*.03);}
    for(int i=0;i<MAXL;i++){if(i>=uNL)break;vec3 l=uLmP[i].xyz-P;float dl=length(l);rc+=C_LAMP*uLmI[i].x*pow(max(dot(R,l/dl),0.),220.)*30./(1.+dl*.015);}
    rc+=uMoonC*pow(max(dot(R,uMoonD),0.),110.)*16.;Sp+=rc*fr*refl;}
  float ao=vM.w/255.;if(P.y<14.){float a=texture(uAO,P.xz/uWorld.xy).r;ao*=1.-.62*a*(1.-smoothstep(0.,14.,P.y))*(id==1?1.:.6);}
  o=vec4((alb*D+Sp)*ao+em+uEmis,1.);}`;
/* ---------- Studio darkness: smoke that curls up through the body and frays at the edges ----------
   It is blended, not stamped: the edge thins to nothing, and the darkness it leaves (the alpha the finish
   multiplies in) is taken off what was there, so a shade in front of a lit wall fades into it */
const FS_VOIDS=GL_COMMON+`in vec3 vP;in vec3 vN;in float vH;out vec4 o;uniform vec3 uCam;uniform vec4 uVoid;uniform vec4 uVw;uniform vec3 uVoidC;
void main(){if(vH>uVoid.z+.02)discard;vec3 V=normalize(uCam-vP),N=normalize(vN);float fr=pow(1.-abs(dot(N,V)),2.);
  float t=uVw.x,sw=fbm(vec2(vP.x*.33+vP.z*.21,vP.y*.24-t*1.2)+uVw.y),sw2=vn(vec2(vP.z*.55-vP.x*.31,vP.y*.5-t*1.9)*1.3+uVw.y*3.);
  vec3 c=vec3(.0012,.001,.002)+fr*mix(vec3(.004,.003,.01),vec3(.05,.05,.07),uVoid.x)+uVoidC*fr;
  c+=vec3(.012,.008,.03)*smoothstep(.55,.85,sw*.7+sw2*.5)*(1.-uVoid.x);
  float fl=vn(vP.xz*.9+vec2(vP.y*.6,t*9.));c+=pow(fr,.7)*uVoid.y*vec3(2.6,.95,.26)*(.35+.9*fl*fl);
  c+=smoothstep(uVoid.z-.12,uVoid.z+.02,vH)*vec3(.5,.18,.05)*uVoid.y*2.;
  float keep=clamp(.03+fr*.32+uVoid.x*.22+uVoid.y*.55,0.,1.);
  /* how solid the smoke is here: thin at the rim, ragged at the foot, thinner still as it burns */
  float sol=min(uVoid.w,1.),cov=1.-smoothstep(.42+sol*.3,.94+sol*.05,fr+(sw-.5)*.8+(sw2-.5)*.3);if(uVoid.w<1.5)cov*=smoothstep(.0,.3-sol*.24,vH+(sw2-.5)*.25);else cov=1.-.6*smoothstep(.85,1.15,fr+(sw-.5)*.5);cov*=1.-uVoid.y*.25*fl;cov=clamp(cov,0.,1.);
  /* solid things (a snuffer's robe, the Long Night) let less of what is behind them through */
  o=vec4(c*cov,cov*(1.-keep*mix(1.,.4,sol)));}`;
