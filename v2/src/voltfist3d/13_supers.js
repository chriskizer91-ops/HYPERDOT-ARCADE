/* ===================== super shows: the big moments get effects of their own =====================
   Everything here is for the eyes only. It reads the fight (moves, frames, projectiles) and never changes it,
   and its randomness comes from VR(), so the fight's own random numbers stay exactly as in the original.
   - Kai's GIGAVOLT CANNON: a living plasma-noise beam, and lightning strikes that hit the whole stage
   - Nova's SUPERNOVA: a churning plasma star that bends the picture around it (lensing), with a corona
   - Echo's PRISM BREAK: the same beam split into a rainbow
   - Runa's THOUSAND PETALS: a petal storm whirling around the target and curved sword arcs
   - Magnus's MEGATON DROP: the floor cracks open, rocks fly, dust rolls out
   - every aura (electricity, plasma) now crawls over the fighter's body */
let FLASHG=0;              /* a lightning flash over the whole stage, 0..1 */
const SKYB=[],CRACKS=[],DEB3=[];
let NOVALENS=null;

/* ---------- shaders ---------- */
const NOISE3=`float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}`;
const FXV=`varying vec2 vU;varying vec3 vN,vV,vP;void main(){vU=uv;vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;vN=normalMatrix*normal;gl_Position=projectionMatrix*mv;}`;
/* the beam: bright core, soft edges, energy streaming away from the fighter */
const BEAMF=`uniform vec3 uCol;uniform float uK,uT,uLen,uRain,uCore,uDir;varying vec2 vU;varying vec3 vN,vV,vP;`+NOISE3+`
void main(){float ndv=abs(dot(normalize(vN),normalize(vV)));
  float d=(uDir>0.?1.-vU.y:vU.y)*uLen;
  float fl=n3(vec3(d*2.6-uT*38.,vU.x*7.,uT*3.))*.6+n3(vec3(d*6.-uT*64.,vU.x*15.,1.7))*.4;
  float body=pow(ndv,mix(1.1,3.5,uCore)),st=smoothstep(.38,.85,fl);
  vec3 c=uCol;
  if(uRain>.5){float h=fract(d*.16-uT*1.6+vU.x*.5);c=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);c=mix(vec3(1.),c,.8);}
  float tip=smoothstep(0.,.5,d);
  gl_FragColor=vec4(c*body*(.45+1.1*st)*uK*tip,1.);}`;
/* the plasma star: boiling noise, white-hot centre, glowing rim */
const NOVAF=`uniform vec3 uA,uB;uniform float uK,uT,uShell;varying vec2 vU;varying vec3 vN,vV,vP;`+NOISE3+`
void main(){float ndv=abs(dot(normalize(vN),normalize(vV))),fr=1.-ndv;
  vec3 p=vP*2.4;float w=fbm3(p*1.6-vec3(0.,uT*.9,0.));float n=fbm3(p+vec3(0.,0.,uT*1.4)+w*1.6);
  float fil=smoothstep(.42,.78,n);
  vec3 c;
  if(uShell>.5){c=mix(uA,uB,fil)*pow(fr,3.2)*(.5+2.4*fil);}
  else{float f2=fil*fil;c=mix(uA*.5,uB*1.3,f2)*(.06+2.2*f2)+uA*pow(fr,2.)*1.3+vec3(1.,.95,1.)*pow(ndv,14.)*.7;}
  gl_FragColor=vec4(c*uK,1.);}`;
function fxShader(fs,uni){return new THREE.ShaderMaterial({uniforms:uni,vertexShader:FXV,fragmentShader:fs,transparent:true,depthWrite:false,
  blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation});}
const PBEAMS=pool(()=>{const m=new THREE.Mesh(BEAMGEO,fxShader(BEAMF,{uCol:{value:new THREE.Color()},uK:{value:1},uT:{value:0},uLen:{value:1},uRain:{value:0},uCore:{value:0},uDir:{value:1}}));m.renderOrder=62;m.frustumCulled=false;return m;});
const NOVAGEO=new THREE.IcosahedronGeometry(1,4);
const NOVACF=`varying vec2 vU;varying vec3 vN,vV,vP;uniform float uK,uT;`+NOISE3+`
void main(){float ndv=abs(dot(normalize(vN),normalize(vV))),fr=1.-ndv;
  vec3 p=vP*2.4;float w=fbm3(p*1.6-vec3(0.,uT*.9,0.));float n=fbm3(p+vec3(0.,0.,uT*1.4)+w*1.6);
  vec3 c=mix(vec3(.16,.02,.32),vec3(.95,.3,1.35),smoothstep(.36,.62,n));c=mix(c,vec3(.55,1.45,1.7),smoothstep(.6,.82,n));
  c+=vec3(1.3,1.15,1.5)*pow(ndv,7.)*.55+vec3(.8,.35,1.3)*pow(fr,2.4)*1.3;
  gl_FragColor=vec4(c*uK,1.);}`;
const PNOVAC=pool(()=>{const m=new THREE.Mesh(NOVAGEO,new THREE.ShaderMaterial({uniforms:{uK:{value:1},uT:{value:0}},vertexShader:FXV,fragmentShader:NOVACF}));m.renderOrder=40;m.frustumCulled=false;return m;});
const PNOVA=pool(()=>{const m=new THREE.Mesh(NOVAGEO,fxShader(NOVAF,{uA:{value:new THREE.Color()},uB:{value:new THREE.Color()},uK:{value:1},uT:{value:0},uShell:{value:0}}));m.renderOrder=61;m.frustumCulled=false;return m;});
const c01=(c,k)=>[c[0]/255*k,c[1]/255*k,c[2]/255*k];

/* ---------- little helpers ---------- */
function boltPath(x0,y0,z0,x1,y1,z1,n,amp){const P=[[x0,y0,z0]];
  for(let i=1;i<n;i++){const t=i/n,j=amp*(1-t*.3);P.push([lerp(x0,x1,t)+vr(-j,j),lerp(y0,y1,t)+vr(-j,j)*.25,lerp(z0,z1,t)+vr(-j,j)*.6]);}
  P.push([x1,y1,z1]);return P;}
/* fractal lightning: a coarse jagged path, then every segment broken again into smaller kinks */
function boltPathF(x0,y0,z0,x1,y1,z1,n,amp){const C=boltPath(x0,y0,z0,x1,y1,z1,n,amp),P=[C[0]];
  for(let i=1;i<C.length;i++){const a=C[i-1],b=C[i],l=Math.hypot(b[0]-a[0],b[1]-a[1])*.13;
    for(let k=1;k<=3;k++){const t=k/4;P.push([lerp(a[0],b[0],t)+vr(-l,l),lerp(a[1],b[1],t)+vr(-l,l)*.4,lerp(a[2],b[2],t)+vr(-l,l)*.5]);}P.push(b);}
  return P;}
function drawPath(B,P,w,col,a,k){for(let i=1;i<P.length;i++){const p=P[i-1],q=P[i];streak(B,p[0],p[1],p[2],q[0],q[1],q[2],w,col,a,k);}}
/* a glowing line lying flat on the floor */
function fstreak(B,ax,az,bx,bz,w,col,a,k){const dx=bx-ax,dz=bz-az,l=Math.hypot(dx,dz)||1,px=-dz/l*w,pz=dx/l*w,f=k/255,y=.014;
  bq(B,ax-px,y,az-pz,bx-px,y,bz-pz,bx+px,y,bz+pz,ax+px,y,az+pz,col[0]*f,col[1]*f,col[2]*f,a,2,0,-1,-1,1,1);}
const atMove=(F,name)=>F.state==='attack'&&F.move&&F.move.name===name;
function jw(F,k,J){const p=(J||F.Jr)[k];return [F.x+p[0]*F.face,F.y+p[1]];}

/* lightning from the sky: a forked bolt that hits the floor, lights everything and throws sparks */
function skyStrike(x,z,col,big){
  if(SKYB.length>5)SKYB.shift();
  const tx=x+vr(-2.5,2.5),main=boltPathF(tx,vr(9,12),z-vr(1,4),x,0,z,11,1.2),br=[];
  for(let i=6;i<main.length-8;i+=2)if(VR()<.22){const p=main[i],l=vr(.8,2.6);br.push(boltPathF(p[0],p[1],p[2],p[0]+vr(-l,l),p[1]-vr(.6,l),p[2]+vr(-.6,.6),4,.35));}
  SKYB.push({main,br,t:0,max:big?14:10,x,z,col});
  FLASHG=Math.max(FLASHG,(big?1:.7)*(reduce?.3:1));
  const S=STAGE&&STAGE.built;if(S&&S.bolt&&S.bolt.t<=0){S.bolt.t=6;S.bolt.path=null;S.bolt.x=x*6;}
  for(let i=0;i<14;i++){const a=vr(.15,Math.PI-.15),v=vr(2,7);
    fxp({k:'spk',x,y:.05,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:14,life:vr(10,24)|0,max:24,col:VR()<.5?C_W:col,len:vr(.1,.22)});}
  vdust(x,0,5);
}
/* the floor bursts open where Magnus lands */
function megaSlam(x){
  const segs=[];
  for(let i=0;i<11;i++){const a=i/11*TAU+vr(-.2,.2),L=vr(1.2,3.2);let px=x,pz=0;const pts=[[px,pz]];
    for(let s=1;s<=5;s++){const t=s/5,aa=a+vr(-.35,.35);px=x+Math.cos(aa)*L*t;pz=Math.sin(aa)*L*t*.8;pts.push([px,pz]);}
    segs.push({pts,w:vr(.02,.045)});
    if(VR()<.5){const m=pts[2],b=a+vr(-.9,.9),l2=vr(.4,1);segs.push({pts:[m,[m[0]+Math.cos(b)*l2*.5,m[1]+Math.sin(b)*l2*.4],[m[0]+Math.cos(b)*l2,m[1]+Math.sin(b)*l2*.8]],w:.018});}}
  CRACKS.push({x,t:0,segs});if(CRACKS.length>2)CRACKS.shift();
  for(let i=0;i<16;i++){const a=vr(.2,Math.PI-.2),v=vr(2.5,6.5);
    DEB3.push({x:x+vr(-.3,.3),y:.1,z:vr(-.3,.3),vx:Math.cos(a)*v,vy:Math.sin(a)*v*1.2,vz:vr(-2.5,2.5),s:vr(.05,.14),r:vr(0,6),vr:vr(-12,12),life:vr(70,110)});}
  if(DEB3.length>40)DEB3.splice(0,DEB3.length-40);
  vdust(x,0,12);FLASHG=Math.max(FLASHG,.3);
}

/* ---------- once per fight step (60 times a second): spawn things ---------- */
function superStep(F){
  if(!FIGHT)return;const O=opp(F),fz=SUPERF>0&&SUPEROWN===F;
  if(atMove(F,'GIGAVOLT CANNON')){
    if(fz&&FIGHT.superT%15===7)skyStrike(F.x+F.face*vr(1,5),vr(-4.5,-2.5),C_Y,0);
    if(!fz&&F.mf<22&&F.mf%2===0){const h=jw(F,'haN');for(let i=0;i<2;i++){const a=VR()*TAU,r=vr(.9,1.6);
      fxp({k:'spk',x:h[0]+Math.cos(a)*r,y:h[1]+Math.sin(a)*r,vx:-Math.cos(a)*r*7,vy:-Math.sin(a)*r*7,g:0,life:8,max:8,col:VR()<.5?C_W:C_Y,len:.22});}}
    if(F.mf===22)skyStrike(F.x+F.face*vr(2,4),vr(-2,-1.2),C_Y,1);
    else if(F.mf>22&&F.mf<78&&F.mf%6===0)skyStrike(F.x+F.face*vr(.6,7.5),VR()<.25?vr(.9,1.6):vr(-3.2,-1),VR()<.3?C_C:C_Y,0);
  }
  if(atMove(F,'PRISM BREAK')&&F.mf>22&&F.mf<84&&F.mf%3===0){const x=F.x+F.face*vr(.8,7);
    fxp({k:'dot',x,y:vr(.6,1.6),vx:vr(-1,1),vy:vr(1,3),g:0,life:26,max:26,col:[[255,90,120],[255,220,90],[90,255,160],[90,200,255],[200,120,255]][(VR()*5)|0],s:.035});}
  if(atMove(F,'MEGATON DROP')){if(F.mf>=92&&!F._mg){F._mg=1;megaSlam(O.x);}}else F._mg=0;
  if(atMove(F,'SUPERNOVA')&&!fz&&F.mf<30&&F.mf%2===0){const a=jw(F,'haN'),b=jw(F,'haF'),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
    for(let i=0;i<2;i++){const t=VR()*TAU,r=vr(.8,1.5);fxp({k:'spk',x:cx+Math.cos(t)*r,y:cy+Math.sin(t)*r,vx:-Math.cos(t)*r*6,vy:-Math.sin(t)*r*6,g:0,life:9,max:9,col:VR()<.5?C_C:C_V,len:.2});}}
}
let SFIGHT=null;
function superWorldStep(){
  if(FIGHT!==SFIGHT){SFIGHT=FIGHT;superReset();}
  for(const s of SKYB)s.t++;for(let i=SKYB.length-1;i>=0;i--)if(SKYB[i].t>=SKYB[i].max)SKYB.splice(i,1);
  for(const c of CRACKS)c.t++;for(let i=CRACKS.length-1;i>=0;i--)if(CRACKS[i].t>260)CRACKS.splice(i,1);
  for(const d of DEB3){d.vy-=16/60;d.x+=d.vx/60;d.y+=d.vy/60;d.z+=d.vz/60;d.r+=d.vr/60;d.life--;
    if(d.y<d.s*.6){d.y=d.s*.6;d.vy=Math.abs(d.vy)*.35;d.vx*=.6;d.vz*=.6;d.vr*=.6;if(Math.abs(d.vy)<.6)d.vy=0;}}
  for(let i=DEB3.length-1;i>=0;i--)if(DEB3[i].life<=0)DEB3.splice(i,1);
}
function superReset(){SKYB.length=0;CRACKS.length=0;DEB3.length=0;FLASHG=0;NOVALENS=null;}

/* ---------- auras on the fighters' bodies ---------- */
function auraOf(F){
  const m=F.move;
  if(SUPERF>0&&SUPEROWN===F){const g=F.def.glow;return [g[0]/255,g[1]/255,g[2]/255,.3+.1*Math.sin(FRAMET*.5)];}
  if(F.state==='attack'&&m&&m.aura&&F.mf>=m.aura[0]&&F.mf<=m.aura[1]){const k=m.aura[2],s=m.super?1:.7;
    if(k==='elec')return [1,.84,.3,s*(.4+VR()*.6)];
    if(k==='plasma')return [.72,.42,1,s*(.85+.15*Math.sin(FRAMET*.4))];
    return [1,.55,.75,s*.5];}
  return null;
}
const ARCJ=[['haN','elN'],['elN','shN'],['shN','chest'],['chest','H'],['chest','waist'],['waist','knN'],['knN','anN'],['haF','elF'],['elF','shF'],['shF','chest'],['waist','knF']];
function bodyArcs(F,col,n){
  for(let i=0;i<n;i++){const pr=ARCJ[(VR()*ARCJ.length)|0],a=jw(F,pr[0]),b=jw(F,pr[1]);
    zig3(BADD,a[0],a[1],.32,b[0],b[1],.32,5,.07,.011,VR()<.4?C_W:col,.95,5);}
}

/* ---------- drawing, once per picture ---------- */
function drawSupers(al){
  const fk=FXK(),T=FRAMET/60;NOVALENS=null;
  /* sky lightning */
  for(const s of SKYB){const f=1-s.t/s.max,on=s.t<3||s.t%3!==1,a=on?Math.min(1,f*1.6):.25;
    drawPath(BADD,s.main,.09,s.col,a*.4,2);drawPath(BADD,s.main,.022,C_W,a,6);
    for(const b of s.br){drawPath(BADD,b,.05,s.col,a*.3,1.8);drawPath(BADD,b,.012,C_W,a*.8,4.5);}
    flat(BADD,s.x,.02,s.z,1.1*f+.3,1.1*f+.3,s.col,.4*a,1.6,0);bill(BADD,s.x,.12,s.z,.45,C_W,a*.6,2.5,0);
    lightReq(s.x,1.6,s.z+.6,[200,215,255],12*f,16);}
  /* cracks in the floor */
  for(const c of CRACKS){const f=Math.max(0,1-c.t/260),hot=Math.max(0,1-c.t/50),col=[255,lerp(90,235,hot),lerp(20,170,hot)];
    for(const sg of c.segs)for(let i=1;i<sg.pts.length;i++){const p=sg.pts[i-1],q=sg.pts[i],w=sg.w*(1-i/sg.pts.length*.6);
      fstreak(BADD,p[0],p[1],q[0],q[1],w*2.8,col,.35*f,1.6);fstreak(BADD,p[0],p[1],q[0],q[1],w,col,f,2+hot*4);}
    if(hot>0){lightReq(c.x,.6,.5,[255,150,60],14*hot,8);flat(BADD,c.x,.02,0,2.4*(1-hot)+.6,2*(1-hot)+.5,[255,170,80],.5*hot,2,1,.12);}}
  for(const d of DEB3){const m=PROCK.get();m.position.set(d.x,d.y,d.z);m.scale.setScalar(d.s);m.rotation.set(d.r,d.r*.7,d.r*.4);}
  if(!FIGHT)return;
  for(const F of FIGHT.f){if(F.hidden)continue;const O=opp(F);
    const au=auraOf(F),m=F.move;
    if(au&&m&&m.aura&&m.aura[2]==='elec'&&F.state==='attack')bodyArcs(F,m.name==='PRISM BREAK'?C_C:C_Y,fk>.7?3:2);
    if(au&&m&&m.aura&&m.aura[2]==='plasma'&&F.state==='attack'&&VR()<.5)bodyArcs(F,C_V,1);
    /* Nova gathers a plasma star between her hands before she throws it */
    if(atMove(F,'SUPERNOVA')&&F.mf<30){const a=jw(F,'haN'),b=jw(F,'haF'),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2,k=SUPERF>0?.4:.4+F.mf/30*.6;
      plasmaStar(cx,cy,.35,.1+.18*k,k,T);}
    /* Runa's petal storm whirls around the target while the combo runs */
    if(atMove(F,'THOUSAND PETALS')&&F.cine&&F.mf>=13&&F.mf<84){const t=(F.mf+al)/60,cx=O.x,cy=O.y+.95,inn=Math.min(1,(F.mf-13)/8),out=Math.min(1,(84-F.mf)/14),n=Math.round(120*fk);
      for(let i=0;i<n;i++){const h1=fract(Math.sin(i*12.9898)*43758.5),h2=fract(Math.sin(i*78.233)*12345.7),h3=fract(Math.sin(i*39.425)*24634.6);
        const a=i*2.399+t*(3+h1*3),r=(.45+h2*1.25)*(1.15-.25*inn),y=cy-1+h3*2.3+Math.sin(t*4+i)*.12;
        const col=h1<.18?C_W:h1<.6?[255,150,190]:[255,90,150];
        const px=cx+Math.cos(a)*r,pz=Math.sin(a)*r,sp=a*1.7+t*6,pl=.035+.025*h3,dx=Math.cos(sp)*pl,dy=Math.sin(sp)*pl*.6;
        streak(BADD,px-dx,y-dy,pz,px+dx,y+dy,pz,.014+.008*h2,col,Math.min(inn,out)*.75,.75+.5*h2);}
      lightReq(cx,cy,.8,[255,120,170],5*Math.min(inn,out),5);}
  }
}
const fract=x=>x-Math.floor(x);
function plasmaStar(x,y,z,r,k,T){
  const core=PNOVAC.get(),U=core.material.uniforms;core.position.set(x,y,z);core.scale.setScalar(r);core.rotation.set(T*.3,T*.5,0);U.uK.value=.5+.5*k;U.uT.value=T;
  const sh=PNOVA.get(),V=sh.material.uniforms;sh.position.set(x,y,z);sh.scale.setScalar(r*1.32);sh.rotation.set(-T*.2,T*.35,.5);
  V.uA.value.setRGB(...c01(C_V,1));V.uB.value.setRGB(...c01([255,140,255],1));V.uK.value=.42*k;V.uT.value=T*1.3+5;V.uShell.value=1;
  bill(BADD,x,y,z,r*2.4,C_V,.28*k,1.2,0);
  /* corona: rays turning slowly round the star */
  for(let i=0;i<10;i++){const a=i/10*TAU+T*(i%2?.6:-.4),l=r*(1.9+.8*Math.sin(T*3+i*1.7)),ca=Math.cos(a),sa=Math.sin(a);
    const ex=x+(_cr.x*ca+_cu.x*sa)*l,ey=y+(_cr.y*ca+_cu.y*sa)*l,ez=z+(_cr.z*ca+_cu.z*sa)*l;
    streak(BADD,x+(ex-x)*.55,y+(ey-y)*.55,z+(ez-z)*.55,ex,ey,ez,r*.07,i%3?C_V:C_C,.5*k,1.8);}
  lightReq(x,y,z+.5,C_V,6*k,7);
}
/* the projectile versions, called from drawProj3 */
function drawNova3(p,x,y,z,r){
  const T=FRAMET/60;plasmaStar(x,y,z+.1,r*.8,1,T);
  /* plasma licks the floor under it */
  for(let i=0;i<2;i++)if(VR()<.6){const fx=x+vr(-r,r)*1.4;zig3(BADD,x+vr(-.2,.2),y-r*.6,z,fx,0,vr(-.4,.4),5,r*.25,.012,i?C_C:C_V,.85,4);}
  flat(BADD,x,.02,0,r*2.4,r*1.8,C_V,.45,1.8,0);
  lightReq(x,y,z+.6,C_C,5,6);
  NOVALENS={x,y,z,r:r*2.3,k:.55};
}
function drawBeam3(p,t,x,y,z,r){
  const col=t.col,rain=p.type==='beam2',x1=p.face>0?STH+5:-STH-5,len=Math.abs(x1-x),mx=(x+x1)/2,hh=r*(1+.15*Math.sin(p.t*.9)),T=FRAMET/60;
  const lay=[[hh*2.3,col,.12,0],[hh*1.05,col,.4,.35],[hh*.3,C_W,1.4,.95]];
  for(const [rad,c,k,cr] of lay){const m=PBEAMS.get(),U=m.material.uniforms;m.position.set(mx,y,z);m.scale.set(len,rad,rad);
    U.uCol.value.setRGB(...c01(c,1));U.uK.value=k;U.uT.value=T;U.uLen.value=len;U.uRain.value=rain&&c!==C_W?1:0;U.uCore.value=cr;U.uDir.value=p.face;}
  for(let i=0;i<4;i++)zig3(BADD,x,y+vr(-hh,hh),z+vr(-hh,hh),x1,y+vr(-hh,hh)*1.6,z+vr(-hh,hh)*1.6,22,hh*1.5,.011,i%2?C_W:col,.85,3);
  /* the muzzle: a little sun with a cross of light */
  bill(BADD,x,y,z+.05,hh*3.4,col,.3,1.1,0);bill(BADD,x,y,z+.05,hh*1.5,C_W,.7,1.8,0);
  streak(BADD,x-hh*9,y,z+.1,x+hh*9,y,z+.1,hh*.4,C_W,.5,1.8);streak(BADD,x,y-hh*6,z+.1,x,y+hh*6,z+.1,hh*.3,col,.6,2);
  /* the floor glows and scorches along the beam */
  flat(BADD,mx,.02,0,len/2,.9,col,.3,.8,0);
  for(const fx of [0,.3,.6])lightReq(x+(x1-x)*fx,y,z+.8,col,fx?3:4,6);
}
