/* ===================== effects: particles, ground decals, flashes, weather, and handing out the real lights ===================== */
function quadGeo(cap,attrs){
  const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));g.setIndex([0,1,2,0,2,3]);
  const A={};for(const [k,n] of attrs){const a=new T.InstancedBufferAttribute(new Float32Array(cap*n),n);a.setUsage(T.DynamicDrawUsage);g.setAttribute(k,a);A[k]=a;}
  g.instanceCount=0;g.boundingSphere=new T.Sphere(new T.Vector3(),1e5);return {g,A,cap,n:0};
}
function flushQ(Q){Q.g.instanceCount=Q.n;for(const k in Q.A){const a=Q.A[k];a.clearUpdateRanges();if(Q.n){a.addUpdateRange(0,Q.n*a.itemSize);a.needsUpdate=true;}}}
const PVS=`attribute vec4 iP;attribute vec4 iC;attribute vec4 iV;varying vec4 vC;varying vec2 vU;varying float vS;
void main(){vec4 mv=viewMatrix*vec4(iP.xyz,1.);vec2 q=position.xy;vS=iV.w;
  if(iV.w>0.){vec2 d=(viewMatrix*vec4(iV.xyz,0.)).xy;float l=length(d);vec2 dir=l>1e-4?d/l:vec2(0.,1.);vec2 nr=vec2(-dir.y,dir.x);mv.xy+=dir*q.y*(iP.w+l*iV.w)+nr*q.x*iP.w*.4;}
  else mv.xy+=q*iP.w;
  vU=position.xy*2.;vC=iC;gl_Position=projectionMatrix*mv;}`;
const PFS=`varying vec4 vC;varying vec2 vU;varying float vS;void main(){float d=vS>0.?length(vU*vec2(1.,.55)):length(vU);float a=vS>0.?smoothstep(1.,.2,d):pow(max(0.,1.-d*d),1.6);if(a<.004)discard;gl_FragColor=vec4(vC.rgb*a*vC.a,vC.a*a);}`;
const DVS=`attribute vec4 iD;attribute vec4 iC;attribute vec4 iK;varying vec4 vC;varying vec4 vK;varying vec2 vU;
void main(){float c=cos(iD.w),s=sin(iD.w);vec2 q=position.xy;vec2 r=vec2(q.x*c-q.y*s,q.x*s+q.y*c)*iD.z*2.;vU=position.xy*2.;vC=iC;vK=iK;
  gl_Position=projectionMatrix*viewMatrix*vec4(iD.x+r.x,.035+iK.w*.006,iD.y+r.y,1.);}`;
const DFS=`varying vec4 vC;varying vec4 vK;varying vec2 vU;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){float d=length(vU),k=vK.x,a=0.;
  if(k<.5)a=pow(max(0.,1.-d*d),1.5);
  else if(k<1.5){float nn=n(vU*3.+vK.z*17.)*.6+n(vU*9.+vK.z*5.)*.4;a=smoothstep(1.,.25,d+nn*.45-.15)*(.7+.3*nn);}
  else if(k<2.5){float w=max(.035,vK.z);a=exp(-pow((d-vK.y)/w,2.));}
  else if(k<3.5){float p=vK.y;a=step(d,p)*(.28+.2*p)+exp(-pow((d-.97)/.03,2.))*(.6+.4*vK.z);float ang=atan(vU.y,vU.x);a+=step(.5,fract(ang*3.18+vK.z*.0))*exp(-pow((d-.62)/.02,2.))*.5*step(.5,vK.z);a*=step(d,1.);}
  else{vec2 u=abs(vU);float r=max(u.x*.75,u.y*1.4);a=smoothstep(1.,.7,r)*.9;}
  gl_FragColor=vec4(vC.rgb*a*vC.a,vC.a*a);}`;
const FX={
  init(){
    const mk=(vs,fs,blend)=>new T.ShaderMaterial({vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,fog:false,
      blending:blend==='add'?T.AdditiveBlending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,premultipliedAlpha:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const PA=[['iP',4],['iC',4],['iV',4]],DA=[['iD',4],['iC',4],['iK',4]];
    this.pAdd=quadGeo(2400,PA);this.pAlp=quadGeo(1600,PA);this.dAdd=quadGeo(700,DA);this.dAlp=quadGeo(900,DA);
    const madd=mk(PVS,PFS,'add'),malp=mk(PVS,PFS,'alpha'),dadd=mk(DVS,DFS,'add'),dalp=mk(DVS,DFS,'alpha');
    madd.blending=T.AdditiveBlending;dadd.blending=T.AdditiveBlending;
    const M=(q,m,o)=>{const x=new T.Mesh(q.g,m);x.frustumCulled=false;x.renderOrder=o;scene.add(x);return x;};
    this.mDAlp=M(this.dAlp,dalp,3);this.mDAdd=M(this.dAdd,dadd,4);this.mPAlp=M(this.pAlp,malp,7);this.mPAdd=M(this.pAdd,madd,8);
    this.weather();
  },
  SC:[],scN:0,FL:[],SM:[],FP:[],
  scorch(x,y,rad,k){const S=this.SC;const o={x,y,r:rad*1.05,k:Math.min(.85,(k||.6)*1.1),rot:Math.random()*TAU,seed:Math.random()};if(S.length<260)S.push(o);else{S[this.scN]=o;this.scN=(this.scN+1)%260;}},
  clearMarks(){this.SC.length=0;this.scN=0;this.FP.length=0;this.SM.length=0;this.FL.length=0;},
  flash(x,y,z,rad){if(this.FL.length<40)this.FL.push({x,y,z,rad,t:0,max:.16+rad*.02});},
  smolder(x,y,z,dur){this.SM.push({x,y,z,t:0,dur});},
  print(x,y,ang,s){if(this.FP.length>70)this.FP.shift();this.FP.push({x,y,ang,s:s||1,t:0});},
  planks(p){const cx=(p.x0+p.x1)/2,cy=(p.y0+p.y1)/2;for(let i=0;i<9;i++){const a=Math.random()*TAU,v=rnd(2,6);prt({k:'plank',x:cx+rnd(-.3,.3),y:cy+rnd(-.3,.3),z:rnd(.3,1),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rnd(3,8),life:rnd(2.5,4),max:4,s:.1,col:[150,108,62],g:18,bounce:.3,L:rnd(.5,1.1)});}},
  blob(x,y,r,a){this.dec(this.dAlp,x,y,r,0,0,0,0,a*(Q.shadow?.55:1),0,0,0,0);},
  glow(x,y,r,cr,cg,cb,k){this.dec(this.dAdd,x,y,r,0,cr,cg,cb,k,0,0,0,1);},
  dec(Qd,x,y,r,rot,cr,cg,cb,ca,kind,p1,p2,layer){if(Qd.n>=Qd.cap)return;const i=Qd.n++,A=Qd.A;
    A.iD.array.set([x,y,r,rot],i*4);A.iC.array.set([cr,cg,cb,ca],i*4);A.iK.array.set([kind,p1,p2,layer],i*4);},
  part(Qd,x,y,z,s,cr,cg,cb,ca,vx,vy,vz,st){if(Qd.n>=Qd.cap)return;const i=Qd.n++,A=Qd.A,o=i*4;
    const P=A.iP.array,C=A.iC.array,V=A.iV.array;P[o]=x;P[o+1]=z;P[o+2]=y;P[o+3]=s;C[o]=cr;C[o+1]=cg;C[o+2]=cb;C[o+3]=ca;V[o]=vx;V[o+1]=vz;V[o+2]=vy;V[o+3]=st;},
  begin(){this.pAdd.n=this.pAlp.n=this.dAdd.n=this.dAlp.n=0;},
  end(){flushQ(this.pAdd);flushQ(this.pAlp);flushQ(this.dAdd);flushQ(this.dAlp);},
  /* ---------- everything that lives on the ground ---------- */
  ground(dt){
    for(const s of this.SC)this.dec(this.dAlp,s.x,s.y,s.r,s.rot,.02,.015,.012,s.k,1,0,s.seed,0);
    for(let i=this.FP.length-1;i>=0;i--){const f=this.FP[i];f.t+=dt;if(f.t>9){this.FP.splice(i,1);continue;}this.dec(this.dAlp,f.x,f.y,.34*f.s,f.ang,0,0,0,.28*(1-f.t/9),4,0,0,0);}
    for(const r of RINGS){const a=r.life/r.max;
      if(r.warn){const big=r.r1>3,bl=(FRAME>>(1-a>.7?1:2))&1;this.dec(this.dAdd,r.x,r.y,r.r1,0,1,.16+bl*.1,.09,.9,3,1-a,big?1:0,2);}
      else{const rr=lerp(r.r0,r.r1,1-a*a);this.dec(this.dAdd,r.x,r.y,Math.max(.2,rr),0,r.col[0]/255*2,r.col[1]/255*2,r.col[2]/255*2,a,2,.92,.05+.04*a,2);}}
    for(const s of SHELLS)this.dec(this.dAdd,s.x1,s.y1,s.rad,0,1,.18,.1,.9,3,s.t/s.T,0,2);
    for(const b of BOMBS)if(!b.crash)this.dec(this.dAdd,b.x,b.y,1.6,0,1,.18,.1,.9,3,clamp(1-b.z/5.5,0,1),0,2);
    for(const p of PODS)this.dec(this.dAdd,p.x,p.y,p.big?3.6:1.5,0,1,.18,.1,.9,3,p.t/p.T,p.big?1:0,2);
  },
  /* ---------- particles ---------- */
  parts(dt){
    const dock=WORLD.th.id==='docks',smk=dock?[.06,.065,.09]:[.09,.075,.065],dust=dock?[.09,.1,.13]:[.2,.16,.12];
    for(const p of PRT){const a=p.life/p.max;
      switch(p.k){
        case 'fire':{const s=Math.max(.12,p.s*(.5+a*.7))*1.35;let r,gg,b;if(a>.78){r=2.2;gg=1.7;b=1.0;}else if(a>.56){r=2.0;gg=1.0;b=.3;}else if(a>.36){r=1.3;gg=.42;b=.1;}else if(a>.18){r=.5;gg=.13;b=.04;}else{r=.12;gg=.06;b=.04;}
          this.part(this.pAdd,p.x,p.y,p.z,s,r,gg,b,Math.min(1,a*2)*.55,0,0,0,0);if(a<.4)this.part(this.pAlp,p.x,p.y,p.z+.2,s*1.1,.05,.04,.035,(.4-a)*1.2,0,0,0,0);break;}
        case 'smoke':case 'trail':{const s=Math.max(.15,p.s)*1.6,c=p.col?[p.col[0]/255*.25,p.col[1]/255*.25,p.col[2]/255*.25]:smk;
          this.part(this.pAlp,p.x,p.y,p.z,s,c[0],c[1],c[2],Math.min(1,a*1.3)*.62,0,0,0,0);
          if(p.k==='trail'&&a>.72)this.part(this.pAdd,p.x,p.y,p.z,s*.55,3,1.5,.4,(a-.72)*3,0,0,0,0);break;}
        case 'dust':this.part(this.pAlp,p.x,p.y,p.z+.1,Math.max(.15,p.s)*1.6,dust[0],dust[1],dust[2],a*.45,0,0,0,0);break;
        case 'spark':{const c=p.col||[255,214,110];this.part(this.pAdd,p.x,p.y,p.z,.05,c[0]/255*4,c[1]/255*4,c[2]/255*4,Math.min(1,a*2),p.vx,p.vy,p.vz,.03);break;}
        case 'spl':this.part(this.pAdd,p.x,p.y,p.z,.04,.4,.6,.8,a*.6,p.vx,p.vy,p.vz,.02);break;
        default:{/* debris, planks and shell casings tumble as little boxes */
          if(!p.q){p.ax=rnd(-1,1);p.ay=rnd(-1,1);p.az=rnd(-1,1);const l=Math.hypot(p.ax,p.ay,p.az)||1;p.ax/=l;p.ay/=l;p.az/=l;p.an=Math.random()*TAU;p.sp=rnd(6,16);p.q=1;
            p.mt={c:(p.col||[90,88,84]).map(v=>Math.pow(v/255,2.2)),emi:p.k==='case'?.35:0,r:.6,m:p.k==='case'?.8:.2};}
          const moving=Math.abs(p.vz)>.01||p.z>.05||Math.abs(p.vx)+Math.abs(p.vy)>.3;if(moving)p.an+=p.sp*dt;
          const h=p.an*.5,sn=Math.sin(h),fade=a<.15?a/.15:1,s=p.s*1.25*fade;
          if(p.k==='plank')boxQ(p.x,p.y,p.z+.04,p.ax*sn,p.ay*sn,p.az*sn,Math.cos(h),s*.9,s*.6,p.L*fade,p.mt);
          else if(p.k==='case')boxQ(p.x,p.y,p.z+.03,p.ax*sn,p.ay*sn,p.az*sn,Math.cos(h),.05,.05,.13,p.mt);
          else boxQ(p.x,p.y,p.z+s*.4,p.ax*sn,p.ay*sn,p.az*sn,Math.cos(h),s*1.3,s,s*1.1,p.mt);}}
    }
    /* explosion flashes: a fast bright bloom ball plus light */
    for(let i=this.FL.length-1;i>=0;i--){const f=this.FL[i];f.t+=dt;const a=1-f.t/f.max;if(a<=0){this.FL.splice(i,1);continue;}
      this.part(this.pAdd,f.x,f.y,f.z+.4,f.rad*(.9-a*.3),1.6,1.0,.5,a*a*.8,0,0,0,0);light(f.x,f.y,f.z+.5,f.rad*2.2,1.5*a,.85*a,.35*a);}
    /* wrecks keep smoking */
    for(let i=this.SM.length-1;i>=0;i--){const s=this.SM[i];s.t+=dt;if(s.t>s.dur){this.SM.splice(i,1);continue;}const k=1-s.t/s.dur;
      if(Math.random()<dt*14*k)prt({k:'smoke',x:s.x+rnd(-1.2,1.2),y:s.y+rnd(-.6,.6),z:s.z*.5,vx:rnd(-.2,.2),vy:rnd(-.2,.2),vz:rnd(1,2),life:rnd(1.4,2.4),max:2.4,s:.35,grow:1.5,drag:.97});
      if(Math.random()<dt*8*k)prt({k:'fire',x:s.x+rnd(-1,1),y:s.y+rnd(-.5,.5),z:s.z*.4,vx:0,vy:0,vz:rnd(.8,1.6),life:.35,max:.35,s:.3,drag:.9});
      light(s.x,s.y,1,4,.7*k,.35*k,.1*k);}
  },
  /* ---------- weather: rain and splashes on the docks, rising embers at the yard ---------- */
  weather(){
    const n=1500;const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0]),3));g.setIndex([0,1,2,0,2,3]);
    const seed=new Float32Array(n*4);for(let i=0;i<n*4;i++)seed[i]=Math.random();g.setAttribute('iS',new T.InstancedBufferAttribute(seed,4));g.instanceCount=0;g.boundingSphere=new T.Sphere(new T.Vector3(),1e5);
    this.wMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,uniforms:{uT:{value:0},uC:{value:new T.Vector3(30,0,19)},uMode:{value:0},uCol:{value:new T.Color()}},
      vertexShader:`attribute vec4 iS;uniform float uT,uMode;uniform vec3 uC;varying float vA;varying vec2 vU;
void main(){vec3 box=vec3(46.,16.,34.);float sp=uMode<.5?22.:-1.2;
  vec3 p=vec3(iS.x*box.x,fract(iS.y-uT*sp/box.y*(.8+.4*iS.z))*box.y,iS.z*box.z);
  if(uMode>.5){p.x+=sin(uT*.7+iS.w*30.)*1.2;p.z+=cos(uT*.5+iS.w*20.)*.8;}
  p.xz=uC.xz-box.xz*.5+mod(p.xz-(uC.xz-box.xz*.5),box.xz);
  vec4 mv=viewMatrix*vec4(p,1.);vec3 dn=(viewMatrix*vec4(uMode<.5?vec3(.12,-1.,.05):vec3(0,1,0),0.)).xyz;
  vec2 d=normalize(dn.xy+1e-5),nr=vec2(-d.y,d.x);float L=uMode<.5?1.0:.09,Wd=uMode<.5?.035:.07;
  mv.xy+=nr*position.x*Wd+d*position.y*L;vU=position.xy;
  vA=uMode<.5?(.5+.35*iS.w):smoothstep(0.,.15,p.y/box.y)*smoothstep(1.,.6,p.y/box.y)*(.5+.5*sin(uT*3.+iS.w*40.));
  gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform vec3 uCol;uniform float uMode;varying float vA;varying vec2 vU;void main(){float a=uMode<.5?(1.-abs(vU.x)*2.)*vU.y:max(0.,1.-length(vec2(vU.x*2.,(vU.y-.5)*2.)));gl_FragColor=vec4(uCol*a*vA,1.);}`});
    this.wMesh=new T.Mesh(g,this.wMat);this.wMesh.frustumCulled=false;this.wMesh.renderOrder=9;scene.add(this.wMesh);this.wGeo=g;
  },
  weatherUpd(){
    const dock=WORLD&&WORLD.th.id==='docks',u=this.wMat.uniforms;u.uT.value=G.t;u.uC.value.set(CAM.x,0,CAM.y);u.uMode.value=dock?0:1;
    if(dock)u.uCol.value.setRGB(.7,.82,1.1);else u.uCol.value.setRGB(2.4,.9,.3);
    this.wGeo.instanceCount=dock?Q.rain:Math.round(Q.rain*.12);
    if(dock&&Math.random()<.9){for(let i=0;i<(QN==='low'?1:3);i++){const x=CAM.x+rnd(-16,16),y=CAM.y+rnd(-12,10);prt({k:'spl',x,y,z:.05,vx:rnd(-.6,.6),vy:rnd(-.6,.6),vz:rnd(1.2,2.2),life:.18,max:.18,g:12});}}
  }
};
/* ---------- the light pool: the brightest requests near the action get real lights; the rest glow on the ground ---------- */
function assignLights(){
  const fx=CAM.x,fy=CAM.y,n=Q.lights;
  for(const L of LREQ)L.s=(L.r+L.g+L.b)*L.rad/(1+Math.hypot(L.x-fx,L.y-fy)*.08);
  LREQ.sort((a,b)=>b.s-a.s);
  for(let i=0;i<POOL.length;i++){const P=POOL[i];if(i<n&&i<LREQ.length){const L=LREQ[i],m=Math.max(L.r,L.g,L.b,1e-3);
      P.position.set(L.x,(L.z||0)+.7,L.y);P.color.setRGB(L.r/m,L.g/m,L.b/m);P.intensity=m*L.rad*7;P.distance=L.rad*1.7;P.decay=1.4;}else P.intensity=0;}
  for(let i=n;i<LREQ.length;i++){const L=LREQ[i];if(L.rad<.8)continue;FX.glow(L.x,L.y,L.rad*.7,L.r,L.g,L.b,.26);}
  LREQ.length=0;
}
function at(x,y){if(w2h(x,y,0))PAN=clamp(PJ[0]/W*2-1,-1,1)*.7;return SFX;}
