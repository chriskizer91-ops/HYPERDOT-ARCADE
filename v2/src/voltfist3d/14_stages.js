/* ===================== stages in 3D =====================
   Same five stages, names, music and wind as the original (8_stages.js), now built as places: the fight line is z = 0,
   the floor is y = 0, the camera looks from +z. Everything is made from code; signs and screens use the original's dot font. */
const STAGES={};let STAGE=null;
let DIMK=1,DIMT=1;   /* how lit the stage is (supers dim it) */

/* ---------- toolkit ---------- */
const MATS={};
function stdMat(o){return new THREE.MeshStandardMaterial(Object.assign({roughness:.8,metalness:0},o));}
function lamMat(o){return new THREE.MeshLambertMaterial(o);}
/* unlit glowing material; k above 1 blooms; the stage dims it during supers */
function glowMat(hex,k=1,o={}){const m=new THREE.MeshBasicMaterial(Object.assign({color:hex,fog:o.fog??true},o));m.userData.base=new THREE.Color(hex).multiplyScalar(k);m.color.copy(m.userData.base);if(STAGE_BUILDING)STAGE_BUILDING.emi.push(m);return m;}
let STAGE_BUILDING=null;
function ctex(w,h,fn,o={}){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;fn(x,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(o.repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(o.repeat[0],o.repeat[1]);}
  if(o.nearest){t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;}t.anisotropy=renderer?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;t.userData={canvas:c,ctx:x};return t;}
function MK(geo,mat,x=0,y=0,z=0,parent){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(parent||STAGE_BUILDING.g).add(m);return m;}
function box(w,h,d,mat,x,y,z,parent){const m=MK(new THREE.BoxGeometry(w,h,d),mat,x,y+h/2,z,parent);return m;}
function cyl(r0,r1,h,mat,x,y,z,seg=14,parent){return MK(new THREE.CylinderGeometry(r0,r1,h,seg),mat,x,y+h/2,z,parent);}
/* merge many simple pieces that share one material into one mesh */
function merged(mat,list,o={}){
  const P=[],N=[],U=[];const mtx=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),nm=new THREE.Matrix3();
  for(const it of list){let gg=it.g.index?it.g.toNonIndexed():it.g;e.set(it.rx||0,it.ry||0,it.rz||0);q.setFromEuler(e);
    mtx.compose(new THREE.Vector3(it.x||0,it.y||0,it.z||0),q,new THREE.Vector3(it.sx||1,it.sy||1,it.sz||1));nm.getNormalMatrix(mtx);
    const pa=gg.attributes.position,na=gg.attributes.normal,ua=gg.attributes.uv,v=new THREE.Vector3();
    for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(mtx);P.push(v.x,v.y,v.z);v.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();N.push(v.x,v.y,v.z);U.push(ua?ua.getX(i):0,ua?ua.getY(i):0);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  const m=MK(geo,mat);m.castShadow=!!o.cast;m.receiveShadow=!!o.recv;return m;
}
const BOXG=new THREE.BoxGeometry(1,1,1),CYLG=new THREE.CylinderGeometry(1,1,1,12),SPHG=new THREE.SphereGeometry(1,14,10);
/* wet and glossy floors: each samples a mirror view of the scene (rendered from below the floor every frame), bent by rain
   ripples, sharper in puddles. Without the mirror view (low quality) the fighters' own reflections are laid onto it instead. */
const MIRU={tMir:{value:null},uTexMat:{value:new THREE.Matrix4()},uMirOn:{value:0}};
const RIPPLE_GLSL=`float vh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(vh(i),vh(i+vec2(1,0)),f.x),mix(vh(i+vec2(0,1)),vh(i+vec2(1,1)),f.x),f.y);}
vec2 ripN(vec2 p,float t){vec2 acc=vec2(0.);for(int i=0;i<2;i++){vec2 q=p*(1.6+float(i)*.9)+float(i)*7.3;vec2 id=floor(q),f=fract(q)-.5;float h=vh(id);
  float ph=fract(t*(.85+h*.5)+h);vec2 c=vec2(fract(h*13.1)-.5,fract(h*71.7)-.5)*.5;vec2 d=f-c;float r=length(d),rr=ph*.42;
  acc+=d/(r+1e-3)*sin((r-rr)*70.)*exp(-pow((r-rr)*15.,2.))*(1.-ph);}return acc;}`;
function mirrorize(mat,o={}){
  const U={tMir:MIRU.tMir,uTexMat:MIRU.uTexMat,uMirOn:MIRU.uMirOn,uMT:SHU.uTime,uMirK:{value:o.k??.4},uRip:{value:o.rip||0},uRough:{value:o.rough??1.2},uPud:{value:o.pud||0}};
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 uTexMat;varying vec4 vMir;varying vec3 vWp;')
      .replace('#include <project_vertex>','#include <project_vertex>\nvec4 wpm=modelMatrix*vec4(transformed,1.);vWp=wpm.xyz;vMir=uTexMat*wpm;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tMir;uniform float uMirOn,uMT,uMirK,uRip,uRough,uPud;varying vec4 vMir;varying vec3 vWp;\n'+RIPPLE_GLSL)
      .replace('#include <opaque_fragment>',`if(uMirOn>.5){vec2 rp=uRip>0.?ripN(vWp.xz,uMT)*uRip:vec2(0.);float pd=uPud>0.?mix(1.-uPud,1.,smoothstep(.4,.62,vnz(vWp.xz*.35))):1.;
        vec2 mu=vMir.xy/vMir.w+rp*.018;vec3 rc=textureLod(tMir,mu,uRough*(1.25-pd)).rgb;float fr=.32+.68*pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
        float k=uMirK*pd*fr;outgoingLight=outgoingLight*(1.-k*.6)+rc*k;}
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey=()=>'mirfloor';return mat;
}
function floorMesh(mat,w=70,d=28,z0=-14){const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);g.translate(0,0,z0+d/2);const m=MK(g,mat);m.receiveShadow=true;STAGE_BUILDING.floors.push(m);return m;}
/* sky dome with a vertical gradient */
function skyDome(cols,o={}){
  const mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{uC:{value:cols.map(c=>new THREE.Color(c))},uH:{value:o.h||[ -.05,.08,.22,.5]},uK:{value:1},uFl:{value:0}},
    vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.);gl_Position.z=gl_Position.w*.9999;}`,
    fragmentShader:`uniform vec3 uC[4];uniform vec4 uH;uniform float uK,uFl;varying vec3 vD;void main(){float y=vD.y;
      vec3 c=mix(uC[3],uC[2],smoothstep(uH.x,uH.y,y));c=mix(c,uC[1],smoothstep(uH.y,uH.z,y));c=mix(c,uC[0],smoothstep(uH.z,uH.w,y));
      c=pow(c,vec3(2.2))*uK+vec3(.5,.45,.7)*uFl;gl_FragColor=vec4(c,1.);}`});
  const m=MK(new THREE.SphereGeometry(300,32,16),mat);m.renderOrder=-10;m.frustumCulled=false;return m;
}
function starsPts(n,seed,o={}){const r=mulberry(seed),P=[],C=[];
  for(let i=0;i<n;i++){const u=r()*2-1,a=r()*TAU,y=o.lo!=null?lerp(o.lo,1,r()):u,s=Math.sqrt(1-y*y);P.push(Math.cos(a)*s*280,y*280,Math.sin(a)*s*280);const k=r()<.1?1:.5+r()*.4;C.push(k,k,k*1.1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  const mat=new THREE.PointsMaterial({size:o.size||1.6,sizeAttenuation:false,vertexColors:true,fog:false,depthWrite:false});
  const p=new THREE.Points(geo,mat);p.renderOrder=-9;p.onBeforeRender=()=>p.position.copy(CAM3.position);STAGE_BUILDING.g.add(p);return p;
}
/* a soft glow card that always faces the camera (moon halo, sun glow, lamp glow) */
const GLOWTEX=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t;})();
function glowCard(x,y,z,s,hex,k=1,parent){const m=new THREE.SpriteMaterial({map:GLOWTEX,color:new THREE.Color(hex).multiplyScalar(k),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false});
  m.userData.base=m.color.clone();STAGE_BUILDING.emi.push(m);const sp=new THREE.Sprite(m);sp.position.set(x,y,z);sp.scale.set(s,s,1);sp.renderOrder=40;(parent||STAGE_BUILDING.g).add(sp);return sp;}
/* procedural city blocks: lit windows come from world position, so one material serves every building */
function cityMat(pal,o={}){
  return new THREE.ShaderMaterial({fog:true,uniforms:Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog),{uPal:{value:pal.map(c=>new THREE.Color(c))},uWall:{value:new THREE.Color(o.wall||'#120a26')},uDen:{value:o.den||.25},uWin:{value:o.win||1.4},uK:{value:o.k||2.2},uT:{value:0},uDim:{value:1}}),
    vertexShader:`#include <fog_pars_vertex>
      varying vec3 vW,vN;void main(){vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix*instanceMatrix)*normal);vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader:`#include <fog_pars_fragment>
      uniform vec3 uPal[5],uWall;uniform float uDen,uWin,uK,uT,uDim;varying vec3 vW,vN;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec3 n=abs(vN);vec2 q=n.z>n.x?vW.xy:vW.zy;if(n.y>.9)q=vW.xz;
        vec2 cell=floor(q/vec2(uWin,uWin*1.25)),f=fract(q/vec2(uWin,uWin*1.25));
        float on=step(1.-uDen,h(cell+floor(vW.x*.013)*7.));float flick=step(.02,h(cell+floor(uT*.5)));
        float win=step(.18,f.x)*step(f.x,.78)*step(.22,f.y)*step(f.y,.8)*(n.y>.9?0.:1.);
        vec3 wc=uPal[int(mod(h(cell*1.7)*5.,5.))];
        vec3 c=pow(uWall,vec3(2.2))*(.35+.4*n.z)+pow(wc,vec3(2.2))*on*win*flick*uK*uDim;
        gl_FragColor=vec4(c,1.);
        #include <fog_fragment>
      }`});
}
function city(n,seed,o){const r=mulberry(seed),mat=cityMat(o.pal,o),im=new THREE.InstancedMesh(BOXG,mat,n);const mx=new THREE.Matrix4();
  for(let i=0;i<n;i++){const z=lerp(o.z[0],o.z[1],r()),x=(r()*2-1)*o.x,w=lerp(o.w[0],o.w[1],r()),d=lerp(o.w[0],o.w[1],r()),hh=lerp(o.h[0],o.h[1],Math.pow(r(),1.4));
    mx.makeScale(w,hh,d);mx.setPosition(x,o.base+hh/2,z);im.setMatrixAt(i,mx);}
  im.instanceMatrix.needsUpdate=true;STAGE_BUILDING.g.add(im);STAGE_BUILDING.city.push(mat);return im;}
/* LED-font text on a canvas (the original's 5x7 font), for signs and screens */
function ledSign(text,hex,o={}){const sc=o.sc||2,pad=o.pad||3,w=tw5(text,sc)+pad*2,h=7*sc+pad*2;
  return ctex(w,h,(x)=>{x.fillStyle=o.bg||'rgba(0,0,0,0)';x.fillRect(0,0,w,h);txt5(x,text,pad,pad,hex,sc);if(o.frame){x.strokeStyle=hex;x.lineWidth=1;x.strokeRect(.5,.5,w-1,h-1);}},{nearest:true});}
function signMesh(text,hex,x,y,z,height,k=2.4,o={}){const t=ledSign(text,hex,o),c=t.userData.canvas,ww=height*c.width/c.height;
  const mat=glowMat(0xffffff,k,{map:t,transparent:true,depthWrite:false});mat.blending=THREE.AdditiveBlending;
  const m=MK(new THREE.PlaneGeometry(ww,height),mat,x,y,z);m.renderOrder=41;if(o.ry)m.rotation.y=o.ry;return m;}
/* fields of moving particles (rain, petals, embers, data) worked out on the GPU: one draw call each */
function field(n,o){
  const geo=new THREE.BufferGeometry(),r=mulberry(o.seed||3),pos=new Float32Array(n*4*3),cor=new Float32Array(n*4*2),sd=new Float32Array(n*4*4),idx=new Uint32Array(n*6);
  for(let i=0;i<n;i++){const s=[r(),r(),r(),r()];for(let k=0;k<4;k++){const v=i*4+k;cor[v*2]=k===0||k===3?-1:1;cor[v*2+1]=k<2?-1:1;sd.set(s,v*4);}const v=i*4,j=i*6;idx.set([v,v+1,v+2,v,v+2,v+3],j);}
  geo.setIndex(new THREE.BufferAttribute(idx,1));geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aC',new THREE.BufferAttribute(cor,2));geo.setAttribute('aS',new THREE.BufferAttribute(sd,4));
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e4);
  const U={uT:{value:0},uB0:{value:new THREE.Vector3(...o.b0)},uB1:{value:new THREE.Vector3(...o.b1)},uV:{value:new THREE.Vector3(...o.v)},uSz:{value:new THREE.Vector2(...o.size)},
    uCol:{value:new THREE.Color(o.col).multiplyScalar(o.k||1)},uCol2:{value:new THREE.Color(o.col2||o.col).multiplyScalar(o.k||1)},uSw:{value:o.sway||0},uCX:{value:0},uA:{value:o.a||1},uDim:{value:1}};
  const streakK=o.kind==='streak'?1:0,sq=o.kind==='square'?1:0;
  const mat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:o.blend==='normal'?THREE.NormalBlending:THREE.AdditiveBlending,
    vertexShader:`attribute vec2 aC;attribute vec4 aS;uniform float uT,uSw,uCX;uniform vec3 uB0,uB1,uV;uniform vec2 uSz;varying vec2 vC;varying float vK;
      void main(){vec3 sz=uB1-uB0,b0=uB0+vec3(uCX,0.,0.);vec3 p=uB0+sz*aS.xyz+uV*uT*(.6+.8*aS.w);p.x+=sin(uT*1.3+aS.w*40.)*uSw;p=b0+mod(p-b0,sz);
      vec3 cr=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),cu=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
      vec3 ax=${streakK?'normalize(uV)':'cu'};vec3 sd=${streakK?'normalize(cross(ax,normalize(p-cameraPosition)))':'cr'};
      float rot=uT*3.*(aS.w-.5)*${sq?'1.':'0.'};vec2 c=vec2(aC.x*cos(rot)-aC.y*sin(rot),aC.x*sin(rot)+aC.y*cos(rot));
      p+=sd*c.x*uSz.x+ax*c.y*uSz.y*(.6+.8*aS.w);vC=aC;vK=aS.w;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform vec3 uCol,uCol2;uniform float uA,uDim;varying vec2 vC;varying float vK;void main(){float a=${sq?'1.':streakK?'(1.-abs(vC.x))*(1.-vC.y*vC.y*.3)':'exp(-dot(vC,vC)*3.)'};
      vec3 c=mix(uCol,uCol2,step(.5,fract(vK*7.)));gl_FragColor=vec4(c*a*uA*uDim,${o.blend==='normal'?'a*uA':'1.'});}`});
  const m=MK(geo,mat);m.frustumCulled=false;m.renderOrder=45;STAGE_BUILDING.fields.push({U,follow:o.follow!==false});return m;
}
/* glowing light pools on a wet floor under each sign, like the original's streaks */
function floorStreak(x,z,w,l,hex,k=.5){const t=ctex(4,64,(c,w2,h2)=>{const gr=c.createLinearGradient(0,0,0,h2);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.35,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.fillRect(0,0,w2,h2);});
  const mat=glowMat(hex,k,{map:t,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});const g=new THREE.PlaneGeometry(w,l);g.rotateX(-Math.PI/2);const m=MK(g,mat,x,.012,z);m.renderOrder=42;return m;}

/* ---------- applying a stage ---------- */
function stageEnv(S){
  const e=S.env;SUN.color.set(e.sun);SUN.position.set(e.sunPos[0],e.sunPos[1],e.sunPos[2]);HEMI.color.set(e.sky);HEMI.groundColor.set(e.ground);
  SCENE.fog=e.fog?new THREE.FogExp2(e.fog[0],e.fog[1]):null;
  SHU.uRim.value.setRGB(S.rim[0]/255,S.rim[1]/255,S.rim[2]/255).multiplyScalar(e.rimK||1);
  SHU.uOlCol.value.setRGB(S.outline[0]/255,S.outline[1]/255,S.outline[2]/255);SHU.uRefl.value=S.reflect;
}
function useStage(id){
  STAGE=STAGES[id];STAGEWIND=STAGE.wind||0;setRim(STAGE.rim,STAGE.rimDir);
  if(!STAGE.g){STAGE_BUILDING={g:new THREE.Group(),emi:[],fields:[],city:[],floors:[]};STAGE.built=STAGE.build();Object.assign(STAGE,STAGE_BUILDING);STAGE_BUILDING=null;STAGEG.add(STAGE.g);
    STAGE.g.traverse(o=>{if(o.isMesh&&o.renderOrder===0&&!o.material.transparent&&o.material.isMeshStandardMaterial){o.receiveShadow=true;}});}
  for(const k in STAGES)if(STAGES[k].g)STAGES[k].g.visible=STAGES[k]===STAGE;
  stageEnv(STAGE);if(typeof CD!=='undefined')CD.last='';
}
function stageTick(dt){
  const S=STAGE;if(!S)return;
  DIMT=SUPERF>0?.28:1;DIMK=lerp(DIMK,DIMT,SUPERF>0?.35:.12);
  const e=S.env;SUN.intensity=e.sunK*lerp(.45,1,DIMK);HEMI.intensity=e.skyK*lerp(.35,1,DIMK);
  if(FLASHG>0){HEMI.intensity*=1+FLASHG*1.2;SUN.intensity*=1+FLASHG*.5;}
  for(const m of S.emi)m.color.copy(m.userData.base).multiplyScalar(DIMK);
  for(const c of S.city){c.uniforms.uT.value=FRAMET/60;c.uniforms.uDim.value=DIMK;}
  for(const f of S.fields){f.U.uT.value=FRAMET/60;f.U.uDim.value=DIMK;if(f.follow)f.U.uCX.value=CAM3.position.x;}
  if(S.built&&S.built.update)S.built.update(FRAMET,dt);
}
/* ---------- NEON ROOFTOP: a rooftop in a canyon of towers, at night, in the rain ---------- */
/* towers: one instanced box per building; windows, light bands, neon trim and city haze all come from the shader,
   so hundreds of buildings cost one draw call per layer. instanceColor carries each tower's random seed. */
function towerMat(o){
  return new THREE.ShaderMaterial({uniforms:{uPal:{value:o.pal.map(c=>new THREE.Color(c))},uWall:{value:new THREE.Color(o.wall)},uDen:{value:o.den},uWin:{value:o.win},uK:{value:o.k},
    uT:{value:0},uDim:{value:1},uFog:{value:new THREE.Color(o.fog)},uFd:{value:o.fd},uGlow:{value:new THREE.Color(o.glow)},uFlash:{value:0},uTrim:{value:new THREE.Color(o.trim||'#ff2f9a')}},
    vertexShader:`varying vec3 vW,vN,vL,vS;varying float vD;void main(){vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vW=w.xyz;vL=position;
      #ifdef USE_INSTANCING_COLOR
      vS=instanceColor;
      #else
      vS=vec3(.5);
      #endif
      
      vN=normalize(mat3(modelMatrix*instanceMatrix)*normal);vec4 mv=viewMatrix*w;vD=-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uPal[5],uWall,uFog,uGlow,uTrim;uniform float uDen,uWin,uK,uT,uDim,uFd,uFlash;varying vec3 vW,vN,vL,vS;varying float vD;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec3 n=abs(vN);bool top=n.y>.9;vec2 q=n.z>n.x?vW.xy:vW.zy;
        vec2 cs=vec2(uWin,uWin*1.3)*(.8+vS.y*.5),cell=floor(q/cs),f=fract(q/cs);
        float on=step(1.-uDen*(.5+vS.x),h(cell+vS.z*97.));float fl=step(.015,h(cell+floor(uT*.4+vS.x*9.)));
        float win=step(.16,f.x)*step(f.x,.8)*step(.22,f.y)*step(f.y,.78);
        vec3 wc=pow(uPal[int(mod(h(cell*1.7+vS.x)*5.,5.))],vec3(2.2));
        float band=step(.6,vS.y)*smoothstep(.465,.49,abs(fract(q.y*.045+vS.z)-.5));
        float ed=n.z>n.x?abs(vL.x):abs(vL.z);float trim=step(.62,vS.x)*max(smoothstep(.488,.5,ed),smoothstep(.494,.5,vL.y))*(n.y<.9?1.:0.);
        float hf=vL.y+.5;
        vec3 wall=pow(uWall,vec3(2.2))*(.35+.45*n.z+.2*hf)+pow(uGlow,vec3(2.2))*exp(-max(vW.y+20.,0.)*.06)*.45;
        vec3 c=top?wall*.5:wall+wc*on*win*fl*uK+pow(uTrim,vec3(2.2))*band*uK*.7+pow(mix(uTrim,uPal[1],step(.8,vS.z)),vec3(2.2))*trim*uK*1.4;
        if(top&&vS.x>.5)c+=vec3(1.,.08,.06)*step(.97,h(floor(vW.xz*.3)))*step(.5,fract(uT*.7+vS.y))*3.;
        c*=uDim;c+=pow(uFog,vec3(2.2))*uFlash*.6;
        float fg=1.-exp(-vD*uFd);c=mix(c,pow(uFog,vec3(2.2))*(1.+uFlash),fg*.92);
        gl_FragColor=vec4(c,1.);}`});
}
function towers(list,mat){const im=new THREE.InstancedMesh(BOXG,mat,list.length),mx=new THREE.Matrix4(),col=new THREE.Color();
  list.forEach((b,i)=>{mx.makeScale(b.w,b.h,b.d);mx.setPosition(b.x,b.y+b.h/2,b.z);im.setMatrixAt(i,mx);col.setRGB(b.s[0],b.s[1],b.s[2]);im.setColorAt(i,col);});
  im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.frustumCulled=false;STAGE_BUILDING.g.add(im);STAGE_BUILDING.city.push(mat);return im;}
/* a deck of rain clouds, lit pink and cyan from the city below; lightning lights them from inside */
function cloudDeck(y,o){
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{uT:{value:0},uA:{value:new THREE.Color(o.a)},uB:{value:new THREE.Color(o.b)},uFlash:{value:0},uFx:{value:0},uDim:{value:1}},
    vertexShader:`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform float uT,uFlash,uFx,uDim;uniform vec3 uA,uB;varying vec3 vW;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+7.1;a*=.5;}return s;}
      void main(){vec2 p=vW.xz*.012+vec2(uT*.006,uT*.002);float d=fbm(p),d2=fbm(p*2.3+3.);float c=smoothstep(.38,.75,d);
        float lit=.35+.65*d2;vec3 col=mix(pow(uA,vec3(2.2)),pow(uB,vec3(2.2)),smoothstep(.3,.7,fbm(p*.6+11.)))*lit*.55;
        float dist=length(vW.xz-vec2(uFx,-150.));col+=vec3(.9,.85,1.2)*uFlash*exp(-dist*.004)*(.4+d2);
        float fade=smoothstep(420.,120.,length(vW.xz));gl_FragColor=vec4(col*uDim*c,c*.92*fade);}`});
  const g=new THREE.PlaneGeometry(900,900);g.rotateX(Math.PI/2);const m=MK(g,mat,0,y,-200);m.renderOrder=-7;return mat;
}
/* lanes of flying traffic: head-lights one way, tail-lights the other, worked out on the GPU */
function traffic(n,seed){
  const geo=new THREE.BufferGeometry(),r=mulberry(seed),pos=new Float32Array(n*12),cor=new Float32Array(n*8),ln=new Float32Array(n*16),idx=new Uint32Array(n*6);
  for(let i=0;i<n;i++){const lane=r(),y=lerp(4,34,Math.pow(r(),1.3)),z=lerp(-30,-170,Math.pow(r(),.8)),dir=r()<.5?-1:1,sp=lerp(9,24,r()),ph=r()*400;
    for(let k=0;k<4;k++){const v=i*4+k;cor[v*2]=k===0||k===3?-1:1;cor[v*2+1]=k<2?-1:1;ln.set([y,z,dir*sp,ph],v*4);}idx.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6);void lane;}
  geo.setIndex(new THREE.BufferAttribute(idx,1));geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aC',new THREE.BufferAttribute(cor,2));geo.setAttribute('aL',new THREE.BufferAttribute(ln,4));
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e4);
  const U={uT:{value:0},uDim:{value:1}};
  const mat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec2 aC;attribute vec4 aL;uniform float uT;varying vec2 vC;varying vec3 vCol;
      void main(){float x=mod(aL.w+uT*aL.z,500.)-250.;vec3 p=vec3(x,aL.x+sin(uT*.3+aL.w)*.4,aL.y);
        float len=.6+abs(aL.z)*.09;p+=vec3(aC.x*len,aC.y*.12,0.);vC=aC;vCol=aL.z>0.?vec3(1.4,1.25,1.):vec3(1.6,.12,.18);
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float uDim;varying vec2 vC;varying vec3 vCol;void main(){float a=(1.-vC.y*vC.y)*(1.-smoothstep(.2,1.,abs(vC.x)));gl_FragColor=vec4(vCol*a*2.2*uDim,1.);}`});
  const m=MK(geo,mat);m.frustumCulled=false;m.renderOrder=44;return U;
}
/* volumetric searchlight beams from the streets far below */
function searchlight(x,z,col){
  const g=new THREE.CylinderGeometry(.6,9,140,24,1,true);g.translate(0,70,0);
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false,uniforms:{uC:{value:new THREE.Color(col)},uDim:{value:1}},
    vertexShader:`varying vec3 vN,vV;varying float vY;void main(){vY=position.y/140.;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uC;uniform float uDim;varying vec3 vN,vV;varying float vY;void main(){float e=abs(dot(normalize(vN),normalize(vV)));float a=pow(e,2.2)*(1.-vY)*smoothstep(0.,.06,vY)*.16;gl_FragColor=vec4(pow(uC,vec3(2.2))*a*uDim,1.);}`});
  const m=MK(g,mat,x,-40,z);m.renderOrder=43;return {m,mat};
}
STAGES.roof={id:'roof',name:'NEON ROOFTOP',city:'SECTOR 9, 02:14',rim:[255,60,170],rimDir:1,outline:[12,4,22],wind:-2.2,music:'roof',reflect:.3,
  env:{rays:{p:[-30,40,-260],c:'#ff7ad8',k:.55},streak:.7,grade:{lift:[.012,0,.03],gain:[1.05,.97,1.1],gam:[1,1,1.02],sat:1.2,con:1.08},sun:'#c8b8ff',sunPos:[-4,8,7],sunK:1.45,sky:'#8a50d8',ground:'#1a0a2a',skyK:1.05,fog:['#2a0a40',.008],rimK:1.45},
  build(){
    const g=STAGE_BUILDING.g,r=mulberry(4),R_=()=>r();
    const sky=skyDome(['#06021a','#1a0640','#4a1062','#a02a78'],{h:[-.12,.02,.14,.4]});
    /* the moon behind the clouds, lighting them */
    const moon=MK(new THREE.CircleGeometry(10,40),glowMat('#ffe8f4',1.3,{fog:false}),-30,40,-260);moon.lookAt(0,1,6);glowCard(-30,40,-258,90,'#ff8ad8',.45);
    const clouds=cloudDeck(32,{a:'#ff3fa4',b:'#3a6cff'}),clouds2=cloudDeck(46,{a:'#8a3cc8',b:'#ff5ab4'});
    /* three layers of towers: a canyon close by, a mid city, a far skyline in the haze */
    const pal=['#ffe6b0','#5af0ff','#ff5ab4','#ffd23f','#b8c8ff'],near=[];
    for(const [x,z,w,hh,d] of [[-17,-13,8,48,7],[-26,-20,9,60,8],[-15,-30,7,40,7],[-32,-32,10,70,9],[17,-14,8,52,7],[26,-22,9,44,8],[16,-31,7,62,7],[33,-33,10,58,9],[7,-78,18,98,12]])
      near.push({x,z,w,d,h:hh,y:-60,s:[R_(),R_(),R_()]});
    const tN=towerMat({pal,wall:'#1a1236',den:.2,win:1.15,k:.95,fog:'#2a0c48',fd:.007,glow:'#ff2fa0',trim:'#ff2f9a'});towers(near,tN);
    const mid=[];for(let i=0;i<80;i++){const z=lerp(-46,-115,R_()),x=(R_()*2-1)*(40+(-z)*.9);if(Math.abs(x)<14&&z>-72)continue;const ctr=Math.abs(x)<28?.55:1;mid.push({x,z,w:lerp(6,14,R_()),d:lerp(6,14,R_()),h:lerp(35,95,Math.pow(R_(),1.2))*ctr,y:-60,s:[R_(),R_(),R_()]});}
    const tM=towerMat({pal,wall:'#1c1438',den:.2,win:1.4,k:.85,fog:'#30104c',fd:.009,glow:'#ff3fa4',trim:'#2fe6ff'});towers(mid,tM);
    const far=[];for(let i=0;i<140;i++){const z=lerp(-120,-300,R_()),x=(R_()*2-1)*(80+(-z)*1.1);far.push({x,z,w:lerp(8,22,R_()),d:lerp(8,22,R_()),h:lerp(40,150,Math.pow(R_(),1.5)),y:-60,s:[R_(),R_(),R_()]});}
    const tF=towerMat({pal,wall:'#1a1236',den:.18,win:2,k:.8,fog:'#3a1256',fd:.0105,glow:'#ff4fb0',trim:'#ff5ab4'});towers(far,tF);
    /* spires with red aircraft lights on the tallest near towers */
    const spireM=stdMat({color:0x14101e,roughness:.6,metalness:.5}),reds=[];
    for(const b of near.filter(b=>b.h>55)){cyl(.08,.25,8,spireM,b.x,b.y+b.h,b.z,6);const l=MK(SPHG,glowMat('#ff2030',4,{fog:false}),b.x,b.y+b.h+8.2,b.z);l.scale.setScalar(.25);reds.push(l);}
    /* neon signs on the canyon towers, in the original's LED font; vertical ones read top to bottom */
    const signs=[];const vsign=(t,c,x,y,z,hh,ry)=>{for(let i=0;i<t.length;i++){const m=signMesh(t[i],c,x,y-i*hh*1.05,z,hh,2.2,{frame:0,sc:3,pad:2});m.rotation.y=ry;signs.push({m,ph:R_()*9,base:m.material.userData.base.clone(),v:1});}};
    vsign('HYPERDOT','#ff2f9a',-13.8,20,-9.4,1.25,.18);vsign('VOLT','#2fe6ff',13.8,16,-10.4,1.4,-.2);vsign('ARCADE','#ffd23f',-22,30,-15.9,1.5,.3);
    for(const [t,c,x,y,z,hh,ry] of [['HOTEL','#ffd23f',18,8,-10.4,1.6,-.15],['24H','#7dff6a',-17,5.6,-9.4,1.5,.15],['NOODLE','#ff2f9a',-15,9,-26.4,2.2,.1],['CYBER','#7dff6a',16,15,-27.4,2.4,-.1],['DOTS','#2fe6ff',26,22,-17.9,2.2,-.3],['BAR','#ff5ab4',-26,12,-15.9,1.8,.3]]){
      const m=signMesh(t,c,x,y,z,hh,2,{frame:1,sc:2});m.rotation.y=ry;signs.push({m,ph:R_()*9,base:m.material.userData.base.clone()});}
    /* a giant LED ad wall that scrolls */
    const adT=ctex(512,64,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);const msg=' HYPERDOT ARCADE  *  VOLTFIST TONIGHT  *  ROUND 1  *  INSERT COIN ';
      const gr=x.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#ff2f9a');gr.addColorStop(.5,'#2fe6ff');gr.addColorStop(1,'#ff2f9a');txt5(x,msg,2,18,gr,3);},{nearest:true});
    adT.wrapS=THREE.RepeatWrapping;const adM=glowMat(0xffffff,1.25,{map:adT,fog:true});const ad=MK(new THREE.PlaneGeometry(17,2.6),adM,7,18,-71.9);void ad;
    const adF=MK(new THREE.PlaneGeometry(17.6,3.2),glowMat('#ff2f9a',.9,{transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,wireframe:true}),7,18,-71.85);adF.renderOrder=41;
    /* the rooftop: wet concrete with puddles, parapet with neon strips, props, steam */
    const fl=ctex(512,512,(x,w,h)=>{x.fillStyle='#2a2238';x.fillRect(0,0,w,h);const rr=mulberry(7);
      for(let i=0;i<900;i++){const v=40+rr()*30|0;x.fillStyle=`rgba(${v},${v-8},${v+20},.35)`;x.fillRect(rr()*w,rr()*h,2+rr()*6,2+rr()*6);}
      x.strokeStyle='#150f1e';x.lineWidth=3;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*w/4,0);x.lineTo(i*w/4,h);x.stroke();x.beginPath();x.moveTo(0,i*h/4);x.lineTo(w,i*h/4);x.stroke();}
      for(let i=0;i<10;i++){x.fillStyle='rgba(10,6,18,.55)';x.beginPath();x.ellipse(rr()*w,rr()*h,20+rr()*50,8+rr()*18,rr()*3,0,TAU);x.fill();}},{repeat:[14,6]});
    floorMesh(mirrorize(stdMat({map:fl,color:0x9a8ab8,roughness:.3,metalness:.25}),{k:.7,rip:1,pud:.6,rough:1.3}),80,30,-16);
    const pad=ctex(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='rgba(255,210,63,.24)';x.lineWidth=10;x.beginPath();x.arc(w/2,h/2,w*.42,0,TAU);x.stroke();
      x.fillStyle='rgba(255,210,63,.22)';x.fillRect(w*.33,h*.28,16,h*.44);x.fillRect(w*.67-16,h*.28,16,h*.44);x.fillRect(w*.33,h*.47,w*.34,16);});
    const pg=new THREE.PlaneGeometry(5.4,5.4);pg.rotateX(-Math.PI/2);const pm=MK(pg,stdMat({map:pad,transparent:true,roughness:.4,depthWrite:false}),0,.006,-2.6);pm.renderOrder=11;
    const dark=stdMat({color:0x1a1428,roughness:.55,metalness:.35}),dark2=stdMat({color:0x241c36,roughness:.45,metalness:.55});
    merged(dark,[{g:BOXG,x:0,y:.32,z:-4.6,sx:80,sy:.64,sz:.5},{g:BOXG,x:0,y:.68,z:-4.6,sx:80,sy:.08,sz:.7}],{recv:true});
    const posts=[];for(let x=-30;x<=30;x+=1.6)posts.push({g:CYLG,x,y:1.05,z:-4.45,sx:.035,sy:.8,sz:.035});posts.push({g:BOXG,x:0,y:1.45,z:-4.45,sx:60,sy:.06,sz:.06},{g:BOXG,x:0,y:1.1,z:-4.45,sx:60,sy:.03,sz:.03});
    merged(dark2,posts);
    const tubes=[];for(let x=-30;x<30;x+=2.4)tubes.push({g:BOXG,x:x+1,y:.73,z:-4.24,sx:1.7,sy:.035,sz:.035});merged(glowMat('#ff2f9a',2.4),tubes);
    const acs=[];for(const [x,z] of [[-7.8,-3.2],[-9.6,-3.4],[8.4,-3.1],[12,-3.3]]){acs.push({g:BOXG,x,y:.55,z,sx:1.5,sy:1.1,sz:1.1});}
    merged(stdMat({color:0x3a3450,roughness:.4,metalness:.7}),acs,{cast:true,recv:true});
    const grill=stdMat({color:0x0c0a14,roughness:.9});for(const [x,z] of [[-7.8,-3.2],[8.4,-3.1]])MK(new THREE.CircleGeometry(.38,20),grill,x,.6,z+.56);
    const tw=new THREE.Group();tw.position.set(-12.5,0,-7.5);g.add(tw);const wood=stdMat({color:0x3a2430,roughness:.85});
    for(const [a,b2] of [[-1,-1],[1,-1],[-1,1],[1,1]])cyl(.07,.07,3,dark2,a*1.1,0,b2*1.1,6,tw);
    cyl(1.6,1.6,2.4,wood,0,3,0,18,tw);MK(new THREE.ConeGeometry(1.75,.8,18),wood,0,5.8,0,tw);
    const dish=MK(new THREE.SphereGeometry(1.1,20,10,0,TAU,0,.9),stdMat({color:0x6a6a80,roughness:.35,metalness:.8,side:THREE.DoubleSide}),10.5,2.4,-6.5);dish.rotation.set(-.9,-.5,0);cyl(.06,.06,2.2,dark2,10.5,0,-6.5,6);
    const vents=[[-7.8,1.15,-3.2],[8.4,1.15,-3.1],[-3.5,.5,-4.1]];for(const v of vents)cyl(.2,.24,.5,dark2,v[0]+(v[0]>0?.4:-.4),v[1]-.5,v[2],10);
    /* the billboard in the middle, with the LIVE feed */
    const bw=6.4,bh=3.6,by=2.7,bz=-11;box(bw+.4,bh+.4,.3,dark,0,by-.2,bz-.2);for(const x of [-2.4,2.4])box(.25,by-.2,.25,dark2,x,0,bz-.1);
    const fr=MK(new THREE.PlaneGeometry(bw+.5,bh+.5),glowMat('#ff2f9a',1.4,{transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,wireframe:true}),0,by+bh/2,bz+.02);fr.renderOrder=41;
    const feedMat=new THREE.ShaderMaterial({uniforms:{tF:{value:null},tL:{value:null},uT:{value:0},uDim:{value:1}},fog:false,
      vertexShader:`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D tF,tL;uniform float uT,uDim;varying vec2 vU;void main(){vec2 g=vec2(192.,108.);vec2 id=floor(vU*g),f=fract(vU*g)-.5;
        vec3 c=texture(tF,(id+.5)/g).rgb;c=c/(1.+c);c=mix(c,vec3(.25,.05,.4),.18);float d=length(f);float m=1.-smoothstep(.32,.46,d);
        vec4 l=texture(tL,vU);c=mix(c,l.rgb*1.6,l.a);gl_FragColor=vec4(c*m*1.35*uDim+vec3(.02,.0,.04),1.);}`});
    const bill=MK(new THREE.PlaneGeometry(bw,bh),feedMat,0,by+bh/2,bz);bill.renderOrder=1;
    const ltex=ctex(192,108,(x,w,h)=>{x.clearRect(0,0,w,h);txt5(x,'LIVE',4,4,'#ff3b5c',1);txt5(x,'VOLTFIST',w-4-tw5('VOLTFIST',1),4,'#ffd23f',1);});
    feedMat.uniforms.tL.value=ltex;
    const feed={rt:null,cam:new THREE.PerspectiveCamera(34,16/9,.1,200),mat:feedMat,mesh:bill,n:0};
    /* searchlights and the police drone */
    const sls=[searchlight(-40,-120,'#b4c8ff'),searchlight(55,-150,'#ffb4e8'),searchlight(-10,-200,'#b4c8ff')];
    const heli=new THREE.Group();g.add(heli);box(1.4,.5,.6,dark,0,0,0,heli);box(1.8,.05,.05,dark,.9,.2,0,heli);const hl=MK(SPHG,glowMat('#ff3030',4),0,-.3,0,heli);hl.scale.setScalar(.08);
    const coneMat=glowMat('#b4c8ff',.14,{transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    const cg=new THREE.ConeGeometry(5,26,24,1,true);cg.translate(0,-13,0);const cone=MK(cg,coneMat,0,0,0,heli);
    const tr=traffic(Math.round(260*FXK()),31);
    /* rain: a heavy near layer picking up pink and cyan, and a far curtain */
    field(Math.round(900*FXK()),{seed:8,b0:[-12,0,-7],b1:[12,9,5],v:[-2.6,-16,0],size:[.006,.22],col:'#b8c8ff',col2:'#ff9ad8',k:.6,kind:'streak'});
    field(Math.round(500*FXK()),{seed:18,b0:[-40,-10,-40],b1:[40,30,-10],v:[-3,-22,0],size:[.04,1.2],col:'#8a7ad8',col2:'#5ab0ff',k:.25,kind:'streak'});
    const splash=[],steam=[],bolt={t:0,next:300+R_()*200,path:null,x:0};
    return {feed,update(f){
      for(const s of signs){const on=((f*.05+s.ph)|0)%(s.v?11:7)!==0;s.m.material.color.copy(s.base).multiplyScalar(on?DIMK:.06);}
      for(const l of reds)l.visible=((f/40)|0)%2===0;
      adT.offset.x=(f*.0015)%1;
      const hx=((f*.05)%140)-70;heli.position.set(hx,16,-34);hl.visible=((f/10)|0)%2===0;cone.rotation.z=Math.sin(f*.012)*.5;
      sls.forEach((s,i)=>{s.m.rotation.z=Math.sin(f*.004+i*2.1)*.45;s.m.rotation.x=Math.cos(f*.003+i)*.25;s.mat.uniforms.uDim.value=DIMK;});
      tr.uT.value=f/60;tr.uDim.value=DIMK;
      /* lightning: a forked bolt from the clouds to the far towers, and a flash over everything */
      bolt.t--;if(bolt.t<=0&&f>bolt.next&&!reduce){bolt.t=11;bolt.next=f+400+VR()*500;bolt.x=vr(-90,90);bolt.path=[];let x=bolt.x,y=36;
        while(y>2){const ny=y-vr(3,7),nx=x+vr(-6,6);bolt.path.push([x,y,nx,ny]);if(VR()<.3)bolt.path.push([nx,ny,nx+vr(-9,9),ny-vr(3,8)]);x=nx;y=ny;}}
      const fl2=bolt.t>0?(bolt.t>8||bolt.t%3===0?1:.35):0;
      sky.material.uniforms.uFl.value=fl2*.3;clouds.uniforms.uFlash.value=fl2*2;clouds.uniforms.uFx.value=bolt.x;clouds2.uniforms.uFlash.value=fl2*1.2;clouds2.uniforms.uFx.value=bolt.x;
      for(const m of [tN,tM,tF])m.uniforms.uFlash.value=fl2*.5;
      if(fl2)HEMI.intensity*=1+fl2*1.4;
      clouds.uniforms.uT.value=clouds2.uniforms.uT.value=f/60;clouds.uniforms.uDim.value=clouds2.uniforms.uDim.value=DIMK;
      if(VR()<.6*FXK())splash.push({x:CAM3.position.x+vr(-6,6),z:vr(-3.5,2.5),t:0});
      for(let i=splash.length-1;i>=0;i--)if(++splash[i].t>10)splash.splice(i,1);
      if(f%3===0)for(const v of vents)steam.push({x:v[0]+vr(-.1,.1),y:v[1],z:v[2]+vr(-.1,.1),t:0,s:vr(.25,.4),vx:vr(-.3,-.1)});
      for(let i=steam.length-1;i>=0;i--){const s=steam[i];s.t++;s.y+=.012;s.x+=s.vx/60;s.s*=1.012;if(s.t>110)steam.splice(i,1);}
    },splash,steam,bolt};
  },
  fx3(B,BA){const S=STAGE.built;for(const s of S.splash)flat(B,s.x,.015,s.z,.04+s.t*.012,.04+s.t*.012,[170,190,255],1-s.t/10,1.4,1,.25);
    for(const s of S.steam){const f=1-s.t/110;bill(BA,s.x,s.y,s.z,s.s,[150,110,170],.22*f*Math.min(1,s.t/12),1,4);}
    if(S.bolt.t>0&&S.bolt.path){const a=S.bolt.t>8?1:.6;for(const p of S.bolt.path){zig3(B,p[0],p[1],-150,p[2],p[3],-150,3,1.2,.35,[220,210,255],a,5);}}
    lightReq(-4,2,-4.7,[255,47,154],1.5*DIMK,7);lightReq(5,2,-4.7,[255,47,154],1.5*DIMK,7);lightReq(-11,6,-9.5,[255,47,154],3*DIMK,12);lightReq(11,5,-10.5,[47,230,255],3*DIMK,12);}
};

/* ---------- BLOSSOM SHRINE ---------- */
STAGES.sakura={id:'sakura',name:'BLOSSOM SHRINE',city:'KAGE VALLEY, DUSK',rim:[255,170,90],rimDir:-1,outline:[34,10,24],wind:1.6,music:'sakura',reflect:.1,
  env:{rays:{p:[0,10,-230],c:'#ffb070',k:.7},streak:.35,grade:{lift:[.02,.008,.03],gain:[1.02,.99,.98],gam:[1,1,1],sat:1.04,con:1.05},sun:'#ffd0b0',sunPos:[3,7,8],sunK:1.9,sky:'#ff9a9a',ground:'#3a1a30',skyK:1.15,fog:['#b0506a',.0075],rimK:1.2},
  build(){
    const g=STAGE_BUILDING.g,r=mulberry(21);
    skyDome(['#2a0b3e','#6a1a5a','#ff5a6a','#ffb45a'],{h:[-.05,.03,.12,.38]});
    /* the sun on the horizon, cut by stripes like the original */
    const sunT=ctex(256,256,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#fff2b0');gr.addColorStop(1,'#ff7a4a');x.fillStyle=gr;x.beginPath();x.arc(w/2,h/2,w/2-2,0,TAU);x.fill();
      x.globalCompositeOperation='destination-out';for(let k=0;k<7;k++){x.fillRect(0,h*.55+k*h*.065,w,(7-k)*2.2);}});
    const sun=MK(new THREE.PlaneGeometry(60,60),glowMat(0xffffff,1.15,{map:sunT,transparent:true,fog:false,depthWrite:false}),0,10,-230);sun.renderOrder=-8;glowCard(0,14,-228,160,'#ff9a50',.45);
    /* mountains and a pagoda on a far hill */
    for(const [col,z,amp,yb,seed] of [['#7a2a6a',-150,26,-2,1],['#5a1a54',-95,16,-1,2]]){const rr=mulberry(seed),s=new THREE.Shape();s.moveTo(-260,yb-20);let x=-260;
      while(x<260){const w=20+rr()*40;s.lineTo(x+w*.5,yb+amp*(.35+rr()*.65));s.lineTo(x+w,yb+amp*.15*rr());x+=w;}s.lineTo(260,yb-20);s.closePath();
      const m=MK(new THREE.ShapeGeometry(s),lamMat({color:col}),0,0,z);m.renderOrder=-5;}
    const pag=new THREE.Group();pag.position.set(-36,4,-90);g.add(pag);const pmat=lamMat({color:0x3a0f3a});
    for(let k=0;k<5;k++){const w=7-k*1.1,y=k*2.6;box(w*.55,1.6,w*.55,pmat,0,y,0,pag);const rf=MK(new THREE.ConeGeometry(w*.75,.9,4),pmat,0,y+1.9,0,pag);rf.rotation.y=Math.PI/4;}
    cyl(.15,.15,4,pmat,0,13,0,6,pag);
    /* courtyard */
    const st=ctex(512,512,(x,w,h)=>{x.fillStyle='#5a3a34';x.fillRect(0,0,w,h);const rr=mulberry(11),n=8;
      for(let j=0;j<n;j++)for(let i=0;i<n;i++){const off=(j%2)*w/n/2,v=rr()*24-12;x.fillStyle=`rgb(${136+v|0},${98+v*.6|0},${84+v*.5|0})`;x.fillRect(i*w/n+off+3,j*h/n+3,w/n-6,h/n-6);
        for(let k=0;k<30;k++){x.fillStyle=`rgba(60,24,20,${rr()*.2})`;x.fillRect(i*w/n+off+rr()*w/n,j*h/n+rr()*h/n,3,3);}}},{repeat:[12,5]});
    floorMesh(mirrorize(stdMat({map:st,roughness:.75,metalness:0,color:0xc8b4ac}),{k:.08,rough:3}),80,30,-16);
    /* the torii */
    const red=stdMat({color:0xb8142a,roughness:.55}),blk=stdMat({color:0x1a0610,roughness:.6});
    for(const x of [-2.9,2.9]){cyl(.24,.27,4.6,red,x,0,-7.5,16);cyl(.32,.32,.4,blk,x,0,-7.5,16);}
    box(8.2,.34,.5,red,0,4.25,-7.5);const kas=MK(new THREE.BoxGeometry(9.2,.26,.62),blk,0,4.75,-7.5);kas.castShadow=true;box(.32,.55,.36,red,0,4.42,-7.5);box(7,.22,.34,red,0,3.55,-7.5);
    /* stone lanterns, warm */
    const stone=stdMat({color:0x6a5a5a,roughness:.9}),lamps=[];
    for(const [x,z] of [[-5.6,-3.4],[5.6,-3.4],[-9.5,-6],[9.5,-6]]){cyl(.32,.42,.5,stone,x,0,z,8);cyl(.14,.14,.8,stone,x,.5,z,8);box(.62,.16,.62,stone,x,1.3,z);
      const lb=box(.42,.38,.42,glowMat('#ffd08a',1.3),x,1.46,z);void lb;const rf=MK(new THREE.ConeGeometry(.6,.42,4),stone,x,2.05,z);rf.rotation.y=Math.PI/4;lamps.push([x,1.65,z]);glowCard(x,1.65,z+.05,1.4,'#ffb050',.35);}
    /* cherry trees: trunks and instanced blossom clusters */
    const bark=stdMat({color:0x2a0c18,roughness:.9}),trees=[[-8,-8.5],[8.6,-9],[-13.5,-12],[14,-13],[-4.6,-15],[5.4,-16],[-19,-17],[19.5,-18]];
    const bl=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),lamMat({color:0xffffff}),trees.length*34);let bi=0;const mx=new THREE.Matrix4(),col=new THREE.Color();
    for(const [tx,tz] of trees){const th=3.6+r()*1.8;const tr=cyl(.2,.32,th,bark,tx,0,tz,8);tr.rotation.z=(r()-.5)*.2;
      for(let k=0;k<3;k++){const b=MK(CYLG,bark,tx+(k-1)*.6,th*.75,tz);b.scale.set(.09,1.8,.09);b.rotation.z=(k-1)*.9;b.rotation.x=(r()-.5)*.6;}
      for(let k=0;k<34;k++){const a=r()*TAU,d=r()*2.2,s=.55+r()*.65;mx.makeScale(s,s*.8,s);mx.setPosition(tx+Math.cos(a)*d,th+(r()-.3)*1.6,tz+Math.sin(a)*d*.7);bl.setMatrixAt(bi,mx);
        col.set(k%3?'#ff8ab8':'#ffc0d8');bl.setColorAt(bi,col);bi++;}}
    bl.instanceMatrix.needsUpdate=true;bl.instanceColor.needsUpdate=true;g.add(bl);
    /* a string of paper lanterns behind the fighters */
    const str=new THREE.Group();g.add(str);const lan=[];
    const cpts=[];for(let i=0;i<=24;i++){const t=i/24,x=lerp(-9,9,t);cpts.push(new THREE.Vector3(x,4.1-Math.sin(t*Math.PI)*.9,-2.6));}
    MK(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cpts),40,.012,4),stdMat({color:0x1a0610}),0,0,0,str);
    for(let i=1;i<8;i++){const t=i/8,x=lerp(-9,9,t),y=4.1-Math.sin(t*Math.PI)*.9-.32;const lm=MK(new THREE.CylinderGeometry(.2,.2,.46,12),glowMat(i%2?'#ff3a2a':'#ffb03a',2),x,y,-2.6,str);lan.push({m:lm,ph:i,x,y});
      glowCard(x,y,-2.5,1.1,'#ff8040',.55,str);}
    field(Math.round(420*FXK()),{seed:5,b0:[-12,0,-9],b1:[12,7,4],v:[1.1,-.6,.2],size:[.026,.026],col:'#ff8ab8',col2:'#ffc8dc',k:.7,kind:'square',sway:.6,blend:'normal'});
    const birds=new THREE.Group();g.add(birds);for(let i=0;i<5;i++){const b=MK(new THREE.BoxGeometry(.5,.05,.08),lamMat({color:0x2a0a24}),i*1.6,Math.sin(i*1.7)*.6,i%2*.8,birds);b.userData.i=i;}
    return {update(f){for(const l of lan){l.m.rotation.z=Math.sin(f*.03+l.ph)*.08;}birds.position.set(((f*.08)%160)-80,15,-60);birds.children.forEach(b=>b.rotation.z=Math.sin(f*.3+b.userData.i)*.35);},lamps};
  },
  fx3(){for(const l of STAGE.built.lamps)lightReq(l[0],l[1],l[2]+.3,[255,180,90],1.5*DIMK,6);}
};

/* ---------- IRONWORKS ---------- */
STAGES.foundry={id:'foundry',name:'IRONWORKS',city:'FURNACE ROW, NIGHT SHIFT',rim:[255,130,40],rimDir:1,outline:[22,8,4],wind:0,music:'foundry',reflect:.1,
  env:{rays:{p:[4.6,.6,-7.6],c:'#ff8a30',k:.8},streak:.6,grade:{lift:[0,.015,.035],gain:[1.08,.98,.88],gam:[1,1,1],sat:1.08,con:1.08},sun:'#ffc898',sunPos:[-3,8,6],sunK:2,sky:'#9a6a4a',ground:'#1a0c08',skyK:1.2,fog:['#1a0804',.024],rimK:1.3},
  build(){
    const g=STAGE_BUILDING.g,r=mulberry(77);
    skyDome(['#060302','#1a0804','#3a1206','#6a2408'],{h:[-.2,0,.1,.3]});
    const steel=stdMat({color:0x2a1a14,roughness:.6,metalness:.5}),steel2=stdMat({color:0x1a0c08,roughness:.7,metalness:.4});
    /* back wall, furnaces with glowing mouths, chimneys, pipes */
    box(80,16,1,steel2,0,0,-13);
    const mouthT=ctex(64,64,(x,w,h)=>{const gr=x.createRadialGradient(w/2,h*.7,2,w/2,h*.7,w*.7);gr.addColorStop(0,'#fff0c0');gr.addColorStop(.35,'#ffa030');gr.addColorStop(1,'#5a1000');x.fillStyle=gr;x.fillRect(0,0,w,h);});
    const furn=[];
    for(const x of [-10,-3.5,3.5,10]){box(4.4,5,3,steel,x,0,-11);const mm=MK(new THREE.PlaneGeometry(2.4,2),glowMat(0xffffff,1.7,{map:mouthT}),x,1.6,-9.49);furn.push({m:mm,x,ph:r()*9});
      cyl(.6,.7,9,steel2,x+1,5,-11.5,10);glowCard(x,1.6,-9.3,5,'#ff7020',.32);}
    const pipes=[];for(let i=0;i<4;i++)pipes.push({g:CYLG,x:0,y:6.4+i*.7,z:-12.2+i*.2,sx:.22,sy:80,sz:.22,rz:Math.PI/2});merged(steel2,pipes);
    /* catwalk with a crowd */
    const cw=[{g:BOXG,x:0,y:3.2,z:-6.2,sx:40,sy:.12,sz:1.4},{g:BOXG,x:0,y:4.25,z:-5.6,sx:40,sy:.06,sz:.06},{g:BOXG,x:0,y:3.8,z:-5.6,sx:40,sy:.04,sz:.04}];
    for(let x=-20;x<=20;x+=2.5)cw.push({g:CYLG,x,y:1.6,z:-6.6,sx:.08,sy:3.2,sz:.08},{g:CYLG,x,y:3.75,z:-5.6,sx:.03,sy:1,sz:.03});
    merged(steel,cw,{cast:true});
    const crowd=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.2,.5,3,8),lamMat({color:0x120804}),26),cm=new THREE.Matrix4(),cro=[];
    for(let i=0;i<26;i++){const x=-15+i*1.2+vr(-.2,.2);cro.push({x,ph:r()*TAU,s:.9+r()*.3});}g.add(crowd);
    /* the ladle pouring iron, and the glowing pool */
    const lad=new THREE.Group();lad.position.set(3.4,5.6,-7.8);g.add(lad);
    const lg=new THREE.LatheGeometry([new THREE.Vector2(0,-.9),new THREE.Vector2(.9,-.8),new THREE.Vector2(1.2,0),new THREE.Vector2(1.3,.7),new THREE.Vector2(1.2,.75)],16);
    MK(lg,stdMat({color:0x3a1c10,roughness:.6,metalness:.5,side:THREE.DoubleSide}),0,0,0,lad);const iron=MK(new THREE.CircleGeometry(1.15,20),glowMat('#ffb040',3),0,.6,0,lad);iron.rotation.x=-Math.PI/2;
    for(const s of [-1,1])cyl(.03,.03,6,steel2,s*1.25,.5,0,4,lad);
    const pourM=glowMat('#ffd070',2.2,{transparent:true});const pour=MK(new THREE.CylinderGeometry(.06,.09,1,8,1,true),pourM,0,0,0);
    const pool=MK(new THREE.CircleGeometry(1.1,24),glowMat('#ff9a30',3),4.6,.03,-7.6);pool.rotation.x=-Math.PI/2;glowCard(4.6,.4,-7.4,4,'#ff8020',.9);
    cyl(1.3,1.1,.5,steel,4.6,0,-7.6,18);
    /* chains, warning lamps */
    for(const x of [-6.5,-5.9,7.2])cyl(.025,.025,7,steel2,x,3.2,-1.6,4);
    const amber=[];for(let i=0;i<3;i++){const x=-8+i*8,m=MK(SPHG,glowMat('#ffb020',3),x,4.5,-5.5);m.scale.setScalar(.14);amber.push({m,x});}
    /* floor: steel plate, hazard stripes in front */
    const dp=ctex(256,256,(x,w,h)=>{x.fillStyle='#3a2a22';x.fillRect(0,0,w,h);x.fillStyle='#4e3a30';for(let j=0;j<8;j++)for(let i=0;i<8;i++){x.save();x.translate(i*32+16+(j%2)*16,j*32+16);x.rotate(j%2?.6:-.6);x.fillRect(-9,-2,18,4);x.restore();}
      x.strokeStyle='#1a120e';x.lineWidth=2;x.strokeRect(1,1,w-2,h-2);},{repeat:[30,12]});
    floorMesh(mirrorize(stdMat({map:dp,roughness:.5,metalness:.55,color:0xc0a090}),{k:.28,rough:2,pud:.3}),80,30,-16);
    const hz=ctex(128,16,(x,w,h)=>{x.fillStyle='#14100a';x.fillRect(0,0,w,h);x.fillStyle='#ffc21a';for(let i=-1;i<9;i++){x.beginPath();x.moveTo(i*16,h);x.lineTo(i*16+8,0);x.lineTo(i*16+16,0);x.lineTo(i*16+8,h);x.fill();}},{repeat:[40,1]});
    const hzg=new THREE.PlaneGeometry(80,.5);hzg.rotateX(-Math.PI/2);const hzm=MK(hzg,stdMat({map:hz,roughness:.6,depthWrite:false}),0,.008,1.9);hzm.renderOrder=11;
    const hzb=MK(hzg.clone(),stdMat({map:hz,roughness:.6,depthWrite:false}),0,.008,-5.2);hzb.renderOrder=11;
    field(Math.round(300*FXK()),{seed:9,b0:[-12,0,-10],b1:[12,8,3],v:[0,1.3,0],size:[.02,.02],col:'#ffb040',col2:'#ff6010',k:3,kind:'square',sway:.4});
    return {update(f){
      const tilt=.5+.25*Math.sin(f*.01);lad.rotation.z=-tilt*.55;
      const lip=new THREE.Vector3(1.25,.7,0).applyMatrix4(lad.matrixWorld);const len=Math.max(.2,lip.y);pour.position.set(lip.x+.05,lip.y/2,lip.z);pour.scale.set(1,len,1);
      pool.material.color.copy(pool.material.userData.base).multiplyScalar(DIMK*(.85+.15*Math.sin(f*.3)));
      for(const fu of furn)fu.m.material.color.copy(fu.m.material.userData.base).multiplyScalar(DIMK*(.8+.2*Math.sin(f*.05+fu.ph)));
      const e=Math.min(1,EXCITE);for(let i=0;i<cro.length;i++){const c=cro[i],b=Math.abs(Math.sin(f*(.08+e*.12)+c.ph))*(.02+e*.12);cm.makeScale(c.s,c.s,c.s);cm.setPosition(c.x,3.26+.45*c.s+b,-6.3);crowd.setMatrixAt(i,cm);}
      crowd.instanceMatrix.needsUpdate=true;
      for(let i=0;i<amber.length;i++){const on=((f+i*20)>>4)%2;amber[i].m.visible=!!on;}
      STAGE.built.lip=lip;
    },amber,furn};
  },
  fx3(B){const S=STAGE.built;lightReq(4.6,1.2,-6.6,[255,140,40],6*DIMK,10);
    for(const fu of S.furn)lightReq(fu.x,1.6,-8.6,[255,110,30],2*DIMK,7);
    for(let i=0;i<S.amber.length;i++)if(S.amber[i].m.visible)lightReq(S.amber[i].x,4.5,-5.2,[255,170,0],1.5,5);
    if(VR()<.7*FXK()){const x=4.6+vr(-.3,.3);fxp({k:'dot',x,y:.1,vx:vr(-2,2),vy:vr(1.5,4),g:9,life:vr(14,28),max:28,col:VR()<.5?[255,240,160]:[255,140,40],s:.03,_z:-7.4+vr(-.4,.4),_vz:vr(-1,1)});}}
};

/* ---------- ORBIT NINE ---------- */
STAGES.orbit={id:'orbit',name:'ORBIT NINE',city:'400 KM ABOVE THE PACIFIC',rim:[90,190,255],rimDir:-1,outline:[4,8,22],wind:.3,music:'orbit',reflect:.32,
  env:{rays:{p:[110,45,-190],c:'#d8e8ff',k:.75},streak:.8,grade:{lift:[0,.008,.03],gain:[.96,1,1.08],gam:[1,1,1],sat:1.1,con:1.06},sun:'#d8e8ff',sunPos:[-5,7,7],sunK:1.7,sky:'#5a7aff',ground:'#0a1020',skyK:1,fog:null,rimK:1.3},
  build(){
    const g=STAGE_BUILDING.g,r=mulberry(9);
    skyDome(['#000005','#02030c','#050a1a','#0a1028'],{h:[-.3,0,.2,.6]});starsPts(1400,9,{size:1.4});
    glowCard(90,60,-220,180,'#8a3cc8',.35);const osun=MK(new THREE.CircleGeometry(6,32),glowMat('#fff6e0',3.2,{fog:false}),110,45,-190);osun.lookAt(0,1,6);glowCard(110,45,-188,60,'#ffe8c0',.8);
    /* the Earth, with clouds and an atmosphere rim */
    const et=ctex(512,256,(x,w,h)=>{x.fillStyle='#0c3a8a';x.fillRect(0,0,w,h);const rr=mulberry(3);
      for(let i=0;i<70;i++){x.fillStyle=rr()<.5?'#2a6a3a':'#5a7a40';x.beginPath();x.ellipse(rr()*w,h*.2+rr()*h*.6,10+rr()*40,6+rr()*20,rr()*3,0,TAU);x.fill();}
      for(let i=0;i<160;i++){x.fillStyle=`rgba(255,255,255,${.25+rr()*.5})`;x.beginPath();x.ellipse(rr()*w,rr()*h,4+rr()*26,1+rr()*5,rr()*.4,0,TAU);x.fill();}});
    const earth=MK(new THREE.SphereGeometry(130,48,32),new THREE.MeshLambertMaterial({map:et,fog:false}),-60,-100,-200);
    const atm=MK(new THREE.SphereGeometry(134,48,32),new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,side:THREE.BackSide,
      vertexShader:`varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 vN,vV;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.);gl_FragColor=vec4(vec3(.35,.7,1.6)*f*.85,1.);}`}),-60,-100,-200);
    /* deck and window frame */
    const deck=ctex(256,256,(x,w,h)=>{x.fillStyle='#1c2436';x.fillRect(0,0,w,h);x.strokeStyle='#0c111c';x.lineWidth=4;x.strokeRect(2,2,w-4,h-4);x.strokeRect(w*.25,h*.25,w*.5,h*.5);
      x.fillStyle='#2a3450';for(let i=0;i<6;i++)x.fillRect(12+i*40,10,6,6);},{repeat:[40,15]});
    floorMesh(mirrorize(stdMat({map:deck,roughness:.28,metalness:.5,color:0xb0c0e0}),{k:.5,rough:.9}),80,30,-16);
    const gl2=ctex(64,64,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='rgba(47,230,255,1)';x.fillRect(0,0,w,1.5);x.fillRect(0,0,1.5,h);},{repeat:[60,22]});
    const gg=new THREE.PlaneGeometry(80,30);gg.rotateX(-Math.PI/2);gg.translate(0,0,-1);const gm=MK(gg,glowMat(0xffffff,.55,{map:gl2,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),0,.01,0);gm.renderOrder=12;
    const frame=stdMat({color:0x0e1220,roughness:.45,metalness:.7}),edge=stdMat({color:0x2a3450,roughness:.4,metalness:.7});
    const fr=[{g:BOXG,x:0,y:.7,z:-8.4,sx:80,sy:1.4,sz:.6},{g:BOXG,x:0,y:8.4,z:-8.4,sx:80,sy:1.2,sz:.8}];
    for(let x=-36;x<=36;x+=7.2)fr.push({g:BOXG,x,y:4.5,z:-8.4,sx:.5,sy:9,sz:.7});
    merged(frame,fr,{recv:true});
    const leds=[];const ledMat=[glowMat('#2fe6ff',3),glowMat('#7dff6a',3),glowMat('#ff3b5c',3),glowMat('#ffd23f',3)];const ledg=new THREE.SphereGeometry(.04,6,4);
    for(let i=0;i<60;i++){const m=MK(ledg,ledMat[i%4],-30+i+r()*.4,.9+r()*.4,-8.08);leds.push({m,ph:r()*99});}
    /* holo screens with bar graphs */
    const scr=[];for(const x of [-6.5,6.5]){const t=ctex(96,56,()=>{},{nearest:true});const m=MK(new THREE.PlaneGeometry(2.8,1.6),glowMat(0xffffff,1.7,{map:t,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),x,3.4,-6.8);m.renderOrder=41;scr.push({t,x});}
    /* drones */
    const drones=[];for(let i=0;i<5;i++){const d=new THREE.Group();g.add(d);MK(SPHG,stdMat({color:0x2a3450,metalness:.6,roughness:.4}),0,0,0,d).scale.setScalar(.22);
      const eye=MK(SPHG,glowMat(i%2?'#2fe6ff':'#ff3b5c',3),0,0,.2,d);eye.scale.setScalar(.06);drones.push({d,x:-12+i*6+r()*2,y:2.4+r()*1.6,z:-5.5-r()*1.5,p:r()*TAU});}
    /* trusses and solar panels outside */
    const tr=[];for(let i=0;i<10;i++){tr.push({g:BOXG,x:20+i*3,y:2+i*.6,z:-40-i,sx:.2,sy:.2,sz:12});}tr.push({g:BOXG,x:34,y:6,z:-45,sx:30,sy:.3,sz:.3});merged(edge,tr);
    const sp=stdMat({color:0x1a3a8a,roughness:.3,metalness:.8,emissive:0x061030});for(let i=0;i<4;i++)box(6,.08,3.4,sp,30+i*6.5,5.8,-46);
    const sat=new THREE.Group();g.add(sat);box(1,1,1,edge,0,0,0,sat);box(4,.05,1,sp,0,.5,0,sat);
    return {update(f){
      earth.rotation.y=f*.00025;
      for(const l of leds)l.m.visible=((f+l.ph)>>3)%5!==0;
      for(const d of drones)d.d.position.set(d.x+Math.sin(f*.01+d.p)*.6,d.y+Math.sin(f*.03+d.p)*.15+Math.min(1,EXCITE)*Math.abs(Math.sin(f*.2+d.p))*.12,d.z);
      sat.position.set(((f*.04)%200)-100,22,-80);sat.rotation.y=f*.01;
      if(f%4===0)for(const s of scr){const x=s.t.userData.ctx,w=96,h=56;x.clearRect(0,0,w,h);x.fillStyle='rgba(47,230,255,.15)';x.fillRect(0,0,w,h);x.strokeStyle='rgba(47,230,255,.8)';x.strokeRect(.5,.5,w-1,h-1);
        for(let i=0;i<8;i++){const bh=(Math.sin(f*.05+i+s.x)*.5+.5)*h*.6;x.fillStyle='rgba(125,255,106,.85)';x.fillRect(4+i*11,h-4-bh,8,bh);}txt3(x,'ORBIT 9',3,3,'rgba(47,230,255,1)');s.t.needsUpdate=true;}
    },scr};
  },
  fx3(){for(const s of STAGE.built.scr)lightReq(s.x,3.4,-6.2,[47,230,255],2.2*DIMK,7);}
};

/* ---------- THE CORE ---------- */
STAGES.core={id:'core',name:'THE CORE',city:'INSIDE THE MACHINE',rim:[80,230,255],rimDir:1,outline:[0,10,20],wind:.6,music:'boss',reflect:.36,
  env:{rays:{p:[0,5.2,-22],c:'#60d0ff',k:1},streak:.9,grade:{lift:[0,.015,.035],gain:[.94,1.02,1.1],gam:[1,1,1],sat:1.12,con:1.06},sun:'#a0f0ff',sunPos:[-4,8,7],sunK:1.4,sky:'#2a80c0',ground:'#000810',skyK:.9,fog:['#000a14',.02],rimK:1.5},
  build(){
    const g=STAGE_BUILDING.g,r=mulberry(13);
    skyDome(['#000207','#00040c','#001020','#002038'],{h:[-.2,0,.15,.5]});
    /* the floor: a glowing grid that scrolls toward you */
    const fmat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uDim:{value:1},uEx:{value:0},tMir:MIRU.tMir,uTexMat:MIRU.uTexMat,uMirOn:MIRU.uMirOn},transparent:false,
      vertexShader:`uniform mat4 uTexMat;varying vec3 vW;varying vec4 vMir;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vMir=uTexMat*w;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform float uT,uDim,uEx,uMirOn;uniform sampler2D tMir;varying vec3 vW;varying vec4 vMir;
        void main(){vec2 q=vec2(vW.x,vW.z+uT*.6)*.8;vec2 fw=max(fwidth(q),vec2(1e-4));vec2 gq=abs(fract(q-.5)-.5)/fw;float l=1.-min(min(gq.x,gq.y)*.7,1.);
        l*=1.-smoothstep(.12,.45,max(fw.x,fw.y));
        float fade=exp(-max(0.,-vW.z)*.05)*exp(-abs(vW.x)*.03);vec3 c=vec3(.0,.008,.018)+vec3(.1,.7,1.)*l*1.1*fade*uDim;
        float rr=length(vW.xz*vec2(1.,1.4)),wave=fract(uT*.4);c+=vec3(.2,.9,1.)*uEx*(1.-wave)*(1.-smoothstep(0.,.25,abs(rr-wave*14.)))*fade;if(uMirOn>.5)c+=textureLod(tMir,vMir.xy/vMir.w,.6).rgb*.5;gl_FragColor=vec4(c,1.);}`});
    const fg=new THREE.PlaneGeometry(80,40);fg.rotateX(-Math.PI/2);fg.translate(0,0,-12);const fm=MK(fg,fmat);fm.renderOrder=10;STAGE_BUILDING.floors.push(fm);
    /* rings of light dots around a glowing core */
    const core=MK(new THREE.SphereGeometry(1.6,32,20),glowMat('#80f0ff',1.5),0,5.2,-22);glowCard(0,5.2,-21,16,'#2fa0ff',.6);
    const rings=[];for(let k=0;k<4;k++){const n=48+k*24,R=4+k*2.6,P=[];for(let i=0;i<n;i++){const a=i/n*TAU;P.push(Math.cos(a)*R,Math.sin(a)*R*.42,0);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));const pm=new THREE.PointsMaterial({color:new THREE.Color('#2fe6ff').multiplyScalar(2.4),size:k?2.6:3.2,sizeAttenuation:false,depthWrite:false,transparent:true,blending:THREE.AdditiveBlending});
      pm.userData.base=pm.color.clone();STAGE_BUILDING.emi.push(pm);const pts=new THREE.Points(geo,pm);pts.position.set(0,5.2,-22);pts.rotation.x=.25;g.add(pts);rings.push(pts);}
    /* data rain in the back */
    field(Math.round(260*FXK()),{seed:14,b0:[-26,0,-34],b1:[26,16,-12],v:[0,-3.2,0],size:[.02,.35],col:'#2fe6ff',k:2,kind:'streak',follow:true});
    /* two screens with the original's scrolling INSERT COIN */
    const scr=[];for(const [x,ry] of [[-6.6,.35],[6.6,-.35]]){box(3.6,2,.15,stdMat({color:0x02101c,roughness:.4}),x,2.6,-7.2).rotation.y=ry;
      const t=ctex(120,28,()=>{},{nearest:true});const m=MK(new THREE.PlaneGeometry(3.4,.8),glowMat(0xffffff,2.2,{map:t,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),x,3.6,-7.1);m.rotation.y=ry;m.renderOrder=41;
      const fr=MK(new THREE.PlaneGeometry(3.5,1.9),glowMat('#2fe6ff',.35,{transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,wireframe:true}),x,3.6,-7.11);fr.rotation.y=ry;scr.push({t,x});}
    /* pillars of light */
    for(const x of [-12,12]){const m=MK(new THREE.CylinderGeometry(.08,.08,30,8,1,true),glowMat('#2fe6ff',2.5,{transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),x,15,-9);m.renderOrder=40;}
    return {update(f){
      fmat.uniforms.uT.value=f/60;fmat.uniforms.uDim.value=DIMK;fmat.uniforms.uEx.value=EXCITE>.5?Math.min(1,EXCITE-.5)*1.2:0;
      rings.forEach((p,k)=>p.rotation.z=f*.004*(k%2?1:-1)*(1+k*.3));
      core.scale.setScalar(1+.05*Math.sin(f*.08));
      if(f%2===0)for(const s of scr){const x=s.t.userData.ctx,msg='VOLTFIST  INSERT COIN  ',off=(f>>1)%(msg.length*6);x.clearRect(0,0,120,28);txt5(x,msg+msg,2-off,10,'#2fe6ff');s.t.needsUpdate=true;}
    },scr};
  },
  fx3(){lightReq(0,4,-12,[47,200,255],6*DIMK,16);for(const s of STAGE.built.scr)lightReq(s.x,3.4,-6.4,[47,230,255],1.6*DIMK,6);}
};
