/* =====================================================================================
   11. THE TABLE — built like an arcade table, in metres, centred on the origin.
       - The deck: glossy, with a grid of air holes (drawn by its shader, so they stay sharp),
         the markings, a light show that ripples out on a goal, and true reflections.
       - The rails: brushed aluminium over a black rubber bumper. The goal is a slot cut into
         the foot of each end rail; the puck slides in under the rail and drops down a lit chute.
       - An LED strip runs along the top of the rails in each player's colour.
       - The cabinet: gloss black with neon side art, chrome trim, a plinth with underglow.
       - Overhead, a two-faced LED scoreboard hangs on cables.
       - The room: blacklight carpet, a neon sign and a few glowing cabinets in the haze.
       Two looks: CLASSIC (white deck, red puck) and NEON (black deck, glowing lines and puck).
   ===================================================================================== */
const SCENE=new THREE.Scene(),CAM3=new THREE.PerspectiveCamera(50,1,.05,60);
const U={uT:{value:0}};
const THEMES={
  classic:{deck:[.72,.77,.84],lineK:0,refl:.22,rough:.46,env:.28,puck:'#e3172a',puck2:'#ffc21a',puckE:0,holes:.55,amb:.32,spot:1},
  neon:{deck:[.012,.012,.02],lineK:2.6,refl:.5,rough:.3,env:.5,puck:'#d8fbff',puck2:'#fff07a',puckE:2.4,holes:.0,amb:.3,spot:.45}
};
let THEME=store.get('hd-'+CAB.id+'-theme','classic');if(!THEMES[THEME])THEME='classic';
const P1COL='#2fd8ff',P2COL='#ff2f8a';     /* player 1 is always ice blue; player 2 in two-player is hot pink */
const lin=h=>{const c=new THREE.Color(h);return c;};   /* THREE.Color from a hex: sRGB in, linear inside */
function canvasTex(w,h,draw,o={}){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=o.srgb===false?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=o.aniso||4;
  if(o.repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}if(o.nearest){t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;}return t;}

/* ---------- shapes: a rounded rectangle, and the half-rings that make the rail's foot ---------- */
function rrPath(path,hw,hl,r,hole){
  /* counter-clockwise (in shape x,y) from the middle of the -y edge; holes go clockwise */
  const pts=[];const arc=(cx,cy,a0,a1)=>{const n=10;for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}};
  pts.push([0,-hl]);arc(hw-r,-hl+r,-Math.PI/2,0);arc(hw-r,hl-r,0,Math.PI/2);arc(-hw+r,hl-r,Math.PI/2,Math.PI);arc(-hw+r,-hl+r,Math.PI,1.5*Math.PI);
  if(hole)pts.reverse();path.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)path.lineTo(pts[i][0],pts[i][1]);path.closePath();return path;
}
function ringShape(ihw,ihl,ir,ohw,ohl,or){const s=rrPath(new THREE.Shape(),ohw,ohl,or);s.holes.push(rrPath(new THREE.Path(),ihw,ihl,ir,true));return s;}
/* one side's half of the rail foot, from goal post to goal post round that side (sx = -1 left, +1 right) */
function footShape(sx,gw,ihw,ihl,ir,ohw,ohl,or){
  const side=(hw,hl,r)=>{const p=[[gw,-hl]];const n=10;
    for(let i=0;i<=n;i++){const a=-Math.PI/2+Math.PI/2*i/n;p.push([hw-r+Math.cos(a)*r,-hl+r+Math.sin(a)*r]);}
    for(let i=0;i<=n;i++){const a=Math.PI/2*i/n;p.push([hw-r+Math.cos(a)*r,hl-r+Math.sin(a)*r]);}
    p.push([gw,hl]);return p;};
  const inner=side(ihw,ihl,ir),outer=side(ohw,ohl,or).reverse(),all=inner.concat(outer).map(([x,y])=>[x*sx,y]);
  if(sx<0)all.reverse();const s=new THREE.Shape();s.moveTo(all[0][0],all[0][1]);for(let i=1;i<all.length;i++)s.lineTo(all[i][0],all[i][1]);s.closePath();return s;
}
/* extrude a shape upward from y0 to y1 (shape y becomes world -z) */
function upExtrude(shape,y0,y1,bevel){
  const o={depth:y1-y0-(bevel?bevel*2:0),bevelEnabled:!!bevel,curveSegments:10};if(bevel){Object.assign(o,{bevelThickness:bevel,bevelSize:bevel*.7,bevelSegments:3,bevelOffset:-bevel*.7});}
  const gm=new THREE.ExtrudeGeometry(shape,o);gm.rotateX(-Math.PI/2);gm.translate(0,y0+(bevel||0),0);gm.computeVertexNormals();return gm;
}

/* ---------- LED dot screens (the scoreboard): sampled once per dot, round dots, HDR ---------- */
function ledScreen(cols,rows,wM,hM,gain){
  const c=document.createElement('canvas');c.width=cols;c.height=rows;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const tex=new THREE.CanvasTexture(c);tex.minFilter=tex.magFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.colorSpace=THREE.NoColorSpace;
  const mat=new THREE.ShaderMaterial({uniforms:{tMap:{value:tex},uGrid:{value:new THREE.Vector2(cols,rows)},uGain:{value:gain||2.4},uFl:{value:0}},
    vertexShader:`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D tMap;uniform vec2 uGrid;uniform float uGain;uniform float uFl;varying vec2 vU;
      void main(){vec2 cell=vU*uGrid,id=floor(cell),f=fract(cell)-.5;vec3 s=texture2D(tMap,(id+.5)/uGrid).rgb;float d=length(f),fw=fwidth(cell.x);
        float dm=1.-smoothstep(.36-fw,.44+fw,d),hot=1.-smoothstep(0.,.4,d);vec3 led=pow(s,vec3(2.2))*uGain*(.75+.5*hot);
        gl_FragColor=vec4((led+vec3(.025,.02,.035)+uFl*vec3(.3))*dm+vec3(.004,.003,.006)*(1.-dm),1.);}`});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(wM,hM),mat);
  return {c,g,tex,mat,mesh,w:cols,h:rows,up(){tex.needsUpdate=true;}};
}

/* ---------- materials ---------- */
const MAT={};
let ENV=null;
function makeEnv(){
  /* a small neon room, blurred into the reflections on chrome, gloss paint and plastic */
  const es=new THREE.Scene(),add=(w,h,x,y,z,ry,rx,col,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(k),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);es.add(m);};
  const box=new THREE.Mesh(new THREE.BoxGeometry(14,6,14),new THREE.MeshBasicMaterial({color:new THREE.Color('#0a0812'),side:THREE.BackSide}));box.position.y=2;es.add(box);
  add(2.6,1.6,0,4.9,0,0,Math.PI/2,'#fff1dc',9);                         /* the lamp over the table */
  add(10,.25,0,3.2,-6.9,0,0,'#ff2f9a',5);add(10,.25,0,3.2,6.9,0,0,'#2fe6ff',5);
  add(10,.2,-6.9,2.4,0,Math.PI/2,0,'#8a4bff',4);add(10,.2,6.9,2.4,0,Math.PI/2,0,'#ff8a2e',3);
  add(3,1.2,-4,1.6,-6.8,0,0,'#3a2a80',2);add(3,1.2,4,1.6,-6.8,0,0,'#802a5a',2);
  const pm=new THREE.PMREMGenerator(R);ENV=pm.fromScene(es,.03).texture;pm.dispose();
}
function makeMats(){
  makeEnv();SCENE.environment=ENV;SCENE.environmentIntensity=.55;
  MAT.body=new THREE.MeshPhysicalMaterial({color:'#0c0a14',roughness:.32,metalness:0,clearcoat:1,clearcoatRoughness:.1});
  MAT.alu=new THREE.MeshStandardMaterial({color:'#cdd3de',metalness:1,roughness:.3});
  MAT.chrome=new THREE.MeshStandardMaterial({color:'#f2f4fa',metalness:1,roughness:.12});
  MAT.rubber=new THREE.MeshStandardMaterial({color:'#121116',roughness:.82});
  MAT.dark=new THREE.MeshStandardMaterial({color:'#050407',roughness:.9});
  MAT.plinth=new THREE.MeshStandardMaterial({color:'#08070c',roughness:.6,metalness:.2});
}

/* ---------- the deck: a standard material with the holes, the markings, the light show and the mirror added ---------- */
const MIR={rt:null,cam:new THREE.PerspectiveCamera(),tm:new THREE.Matrix4(),plane:new THREE.Plane(new THREE.Vector3(0,1,0),-TB.DECK)};
const DU={tMir:{value:null},uMirM:{value:MIR.tm},uRefl:{value:.2},uMirOn:{value:0},uMarks:{value:null},uDeck:{value:new THREE.Color()},uLineK:{value:0},uHoles:{value:.5},
  uRip:{value:[new THREE.Vector4(0,0,-9,0),new THREE.Vector4(0,0,-9,0),new THREE.Vector4(0,0,-9,0)]},uRipC:{value:[new THREE.Color(),new THREE.Color(),new THREE.Color()]},
  uGlow:{value:new THREE.Vector4(0,0,0,0)},uGlowC:{value:new THREE.Color()},uT:U.uT,uMirPx:{value:new THREE.Vector2(1,1)}};
let DECK3=null;
function makeMarks(){
  /* the printed lines: centre line, centre circle and logo, the goal creases, face-off spots. 1 px = 1 mm */
  return canvasTex(1000,2000,(g,w,h)=>{
    g.clearRect(0,0,w,h);const red='#e8203c',blue='#2a64ff';
    const line=(c,lw,f)=>{g.strokeStyle=c;g.lineWidth=lw;g.beginPath();f();g.stroke();};
    line(red,10,()=>{g.moveTo(0,h/2);g.lineTo(w,h/2);});
    line(blue,7,()=>g.arc(w/2,h/2,150,0,TAU));
    line(blue,4,()=>g.arc(w/2,h/2,128,0,TAU));
    for(const y of [0,h]){line(red,7,()=>g.arc(w/2,y,210,y?Math.PI:0,y?TAU:Math.PI));line(red,3,()=>g.arc(w/2,y,236,y?Math.PI:0,y?TAU:Math.PI));}
    for(const y of [h*.25,h*.75])line(blue,6,()=>{g.moveTo(0,y);g.lineTo(w,y);});
    g.fillStyle=red;for(const y of [h*.25,h*.75])for(const x of [w*.25,w*.75]){g.beginPath();g.arc(x,y,14,0,TAU);g.fill();}
    g.fillStyle=blue;g.beginPath();g.arc(w/2,h/2,14,0,TAU);g.fill();
    /* the logo in the centre circle */
    g.save();g.translate(w/2,h/2);g.fillStyle='rgba(42,100,255,.9)';g.font='italic 700 64px "Chakra Petch","Arial Narrow",sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText('HYPERDOT',0,-26);g.fillStyle='rgba(232,32,60,.9)';g.font='italic 700 38px "Chakra Petch","Arial Narrow",sans-serif';g.fillText('AIR HOCKEY',0,30);g.restore();
  },{aniso:8});
}
function makeDeck(){
  const mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.4,metalness:0,envMapIntensity:.3});
  mat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,DU);
    sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
      uniform mat4 uMirM;varying vec4 vMir;varying vec2 vTP;`).replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vMir=uMirM*modelMatrix*vec4(transformed,1.);vTP=(modelMatrix*vec4(transformed,1.)).xz;`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D tMir;uniform float uRefl;uniform float uMirOn;uniform sampler2D uMarks;uniform vec3 uDeck;uniform float uLineK;uniform float uHoles;
      uniform vec4 uRip[3];uniform vec3 uRipC[3];uniform vec4 uGlow;uniform vec3 uGlowC;uniform float uT;uniform vec2 uMirPx;
      varying vec4 vMir;varying vec2 vTP;
      vec3 marksAt(vec2 p){vec2 uv=vec2(p.x/${(2*TB.HW).toFixed(3)}+.5,.5-p.y/${(2*TB.HL).toFixed(3)});return texture2D(uMarks,uv).rgb*texture2D(uMarks,uv).a;}
      float holeAt(vec2 p){vec2 q=p/.025+.5,f=fract(q)-.5;float fw=fwidth(q.x);float d=length(f)*.025,r=.0021;
        return (1.-smoothstep(r-fw*.012,r+fw*.012,d))*(1.-smoothstep(.16,.42,fw));}`)
    .replace('#include <map_fragment>',`
      vec4 mk=texture2D(uMarks,vec2(vTP.x/${(2*TB.HW).toFixed(3)}+.5,.5-vTP.y/${(2*TB.HL).toFixed(3)}));
      vec3 base=uDeck;base=mix(base,mk.rgb,mk.a*(1.-step(.5,uLineK)));
      float hole=holeAt(vTP);base*=1.-hole*uHoles;
      diffuseColor.rgb*=base;`)
    .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      totalEmissiveRadiance+=pow(mk.rgb,vec3(1.6))*mk.a*uLineK;
      totalEmissiveRadiance+=vec3(.25,.6,1.)*hole*uLineK*.05;
      for(int i=0;i<3;i++){vec4 r=uRip[i];float age=uT-r.z;if(age>0.&&age<2.2){float d=length(vTP-r.xy),rad=age*1.6,w=.06+age*.05;
        float ring=exp(-pow((d-rad)/w,2.))*(1.-age/2.2)*r.w;totalEmissiveRadiance+=uRipC[i]*ring*(1.+uLineK*.5);}}
      {float d=length(vTP-uGlow.xy);totalEmissiveRadiance+=uGlowC*uGlow.z*exp(-d*d/(uGlow.w*uGlow.w));}`)
    .replace('#include <opaque_fragment>',`#include <opaque_fragment>
      if(uMirOn>.5){vec2 m=vMir.xy/vMir.w;vec3 rc=texture2D(tMir,m).rgb*.4+(texture2D(tMir,m+uMirPx*vec2(1.5,.5)).rgb+texture2D(tMir,m-uMirPx*vec2(1.5,.5)).rgb+texture2D(tMir,m+uMirPx*vec2(-.5,1.5)).rgb+texture2D(tMir,m-uMirPx*vec2(-.5,1.5)).rgb)*.15;
        vec3 V=normalize(cameraPosition-vec3(vTP.x,${TB.DECK.toFixed(3)},vTP.y));float fr=.55+.45*pow(1.-clamp(V.y,0.,1.),3.);
        gl_FragColor.rgb+=rc*uRefl*fr*(1.-hole*.8);}`);
  };
  const gm=new THREE.PlaneGeometry(2*TB.HW+.02,2*TB.HL+.02,1,1);gm.rotateX(-Math.PI/2);
  DECK3=new THREE.Mesh(gm,mat);DECK3.position.y=TB.DECK;DECK3.receiveShadow=true;SCENE.add(DECK3);
  DU.uMarks.value=makeMarks();
}
/* ---------- the planar mirror: the scene seen from under the deck, clipped at the deck ---------- */
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3();
function mirrorSize(){const q=QP[QL];if(MIR.rt){MIR.rt.dispose();MIR.rt=null;}if(!q.refl)return;
  MIR.rt=new THREE.WebGLRenderTarget(Math.max(2,VW*q.refl|0),Math.max(2,VH*q.refl|0),{type:HDR_OK?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});
  DU.tMir.value=MIR.rt.texture;DU.uMirPx.value.set(1/MIR.rt.width,1/MIR.rt.height);}
function renderMirror(cam){
  if(!MIR.rt){DU.uMirOn.value=0;return;}
  const D=TB.DECK,mc=MIR.cam;cam.updateMatrixWorld();
  if(cam.position.y<D+.05){DU.uMirOn.value=0;return;}
  mc.position.set(cam.position.x,2*D-cam.position.y,cam.position.z);
  _v1.set(0,0,-1).applyQuaternion(cam.quaternion).add(cam.position);_v1.y=2*D-_v1.y;
  _v2.set(0,1,0).applyQuaternion(cam.quaternion);_v2.y=-_v2.y;mc.up.copy(_v2);mc.lookAt(_v1);
  mc.near=cam.near;mc.far=cam.far;mc.projectionMatrix.copy(cam.projectionMatrix);mc.updateMatrixWorld();mc.matrixWorldInverse.copy(mc.matrixWorld).invert();
  MIR.tm.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1);MIR.tm.multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse);
  DECK3.visible=false;const room=ROOM3.visible;ROOM3.visible=false;
  R.clippingPlanes=[MIR.plane];R.setRenderTarget(MIR.rt);R.render(SCENE,mc);R.clippingPlanes=[];
  DECK3.visible=true;ROOM3.visible=room;DU.uMirOn.value=1;
}

/* ---------- the rails, the goal slots, the LED strip ---------- */
const RL={sideW:.07,endW:.095,h:.052,slot:.024};
const LEDU={uT:U.uT,uC0:{value:lin(P1COL)},uC1:{value:lin(P2COL)},uFl0:{value:0},uFl1:{value:0},uK:{value:1},uChase:{value:0}};
const CHUTE=[];
function makeRails(){
  const HW=TB.HW,HL=TB.HL,RC=TB.RC,ohw=HW+RL.sideW,ohl=HL+RL.endW,orr=RC+RL.sideW*.9,gw=TB.GW/2;
  const D=TB.DECK;
  /* the aluminium top band, all the way round */
  const top=new THREE.Mesh(upExtrude(ringShape(HW,HL,RC,ohw,ohl,orr),D+RL.slot,D+RL.h,.006),MAT.alu);top.castShadow=true;top.receiveShadow=true;SCENE.add(top);
  /* the rubber foot on each side, stopping at the goal posts */
  for(const sx of [-1,1]){const f=new THREE.Mesh(upExtrude(footShape(sx,gw,HW,HL,RC,ohw,ohl,orr),D-.002,D+RL.slot+.001),MAT.rubber);f.receiveShadow=true;SCENE.add(f);}
  /* the goal chutes: dark boxes behind each slot with a light strip at the back */
  for(const sz of [-1,1]){
    const box=new THREE.Mesh(new THREE.BoxGeometry(TB.GW+.004,.09,RL.endW-.004),MAT.dark);box.position.set(0,D-.045+RL.slot-.002,sz*(HL+RL.endW/2));SCENE.add(box);
    const lm=new THREE.MeshBasicMaterial({color:new THREE.Color(sz>0?P1COL:P2COL).multiplyScalar(2)});
    const strip=new THREE.Mesh(new THREE.PlaneGeometry(TB.GW-.01,.012),lm);strip.position.set(0,D+.008,sz*(HL+RL.endW-.012));strip.rotation.y=sz>0?Math.PI:0;SCENE.add(strip);
    const lip=new THREE.Mesh(new THREE.PlaneGeometry(TB.GW,RL.endW-.01),MAT.dark);lip.rotation.x=-Math.PI/2;lip.position.set(0,D-.004,sz*(HL+RL.endW/2));SCENE.add(lip);
    CHUTE.push({lm,base:new THREE.Color(sz>0?P1COL:P2COL),sz});
  }
  /* the LED strip along the top of the rail, just outside the playfield */
  const ledG=upExtrude(ringShape(HW+.006,HL+.006,RC+.006,HW+.017,HL+.017,RC+.017),D+RL.h+.0005,D+RL.h+.0025);
  const ledM=new THREE.ShaderMaterial({uniforms:LEDU,vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uT;uniform vec3 uC0;uniform vec3 uC1;uniform float uFl0;uniform float uFl1;uniform float uK;uniform float uChase;varying vec3 vP;
      void main(){float s=atan(vP.z/${TB.HL.toFixed(2)},vP.x/${TB.HW.toFixed(2)});float near=step(0.,vP.z);vec3 c=mix(uC1,uC0,near);
        float dots=.55+.45*smoothstep(.55,1.,fract(s*9.-uT*(1.+uChase*5.)));float fl=mix(uFl1,uFl0,near);
        float strobe=fl*(.5+.5*step(.5,fract(uT*9.)));gl_FragColor=vec4(c*(dots*1.6*uK+strobe*6.)+vec3(strobe*1.5),1.);}`});
  SCENE.add(new THREE.Mesh(ledG,ledM));
}
/* ---------- the cabinet under the deck, and its plinth ---------- */
let UNDERGLOW=null;
function sideArt(end,pl){
  return canvasTex(1024,256,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#120a24');gr.addColorStop(1,'#05040a');g.fillStyle=gr;g.fillRect(0,0,w,h);
    /* speed stripes */
    const st=(x,c,wd)=>{g.fillStyle=c;g.beginPath();g.moveTo(x,h);g.lineTo(x+wd,h);g.lineTo(x+wd+120,0);g.lineTo(x+120,0);g.closePath();g.fill();};
    if(!end){for(let i=0;i<5;i++){st(40+i*26,i%2?'#ff2f8a':'#2fd8ff',12);st(w-300+i*26,i%2?'#2fd8ff':'#ff2f8a',12);}
      g.save();g.translate(w/2,h/2+6);g.transform(1,0,-.22,1,0,0);
      g.font='700 112px "Chakra Petch","Arial Narrow",sans-serif';g.textAlign='center';g.textBaseline='middle';
      g.shadowColor='#ff2f8a';g.shadowBlur=24;g.fillStyle='#ffe9f6';g.fillText('AIR HOCKEY',0,0);g.shadowBlur=0;
      g.strokeStyle='#ff2f8a';g.lineWidth=3;g.strokeText('AIR HOCKEY',0,0);g.restore();
      g.font='600 26px "Chakra Petch",sans-serif';g.fillStyle='#7fe9ff';g.textAlign='center';g.fillText('H Y P E R D O T   A R C A D E',w/2,h-22);}
    else{const c=pl?'#ff2f8a':'#2fd8ff';g.fillStyle=c;g.fillRect(0,18,w,10);g.fillRect(0,h-28,w,10);
      g.font='700 54px "Chakra Petch",sans-serif';g.textAlign='center';g.fillStyle='#fff';g.shadowColor=c;g.shadowBlur=18;g.fillText(pl?'PLAYER 2':'PLAYER 1',w*.26,h/2+18);g.shadowBlur=0;
      /* the puck return, the start button */
      g.fillStyle='#000';g.beginPath();g.roundRect(w*.47,h*.36,w*.2,h*.36,24);g.fill();g.strokeStyle='#6a6080';g.lineWidth=5;g.stroke();
      g.fillStyle=c;g.beginPath();g.arc(w*.84,h/2,40,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.65)';g.beginPath();g.arc(w*.84-10,h/2-12,12,0,TAU);g.fill();
      g.font='600 20px "Chakra Petch",sans-serif';g.fillStyle='#c8c0e0';g.fillText('PUCK RETURN',w*.57,h*.86);}
  });
}
function makeCabinet(){
  const HW=TB.HW,HL=TB.HL,ohw=HW+RL.sideW+.012,ohl=HL+RL.endW+.012,orr=TB.RC+RL.sideW,D=TB.DECK;
  const body=new THREE.Mesh(upExtrude(rrPath(new THREE.Shape(),ohw,ohl,orr),.24,D-.002,.01),MAT.body);body.castShadow=true;body.receiveShadow=true;SCENE.add(body);
  const trim=new THREE.Mesh(upExtrude(ringShape(ohw-.004,ohl-.004,orr-.004,ohw+.006,ohl+.006,orr+.006),D-.03,D-.012),MAT.chrome);SCENE.add(trim);
  const plinth=new THREE.Mesh(upExtrude(rrPath(new THREE.Shape(),ohw-.09,ohl-.12,.1),0,.245),MAT.plinth);SCENE.add(plinth);
  /* art panels */
  const art=sideArt(false),artM=new THREE.MeshStandardMaterial({map:art,emissiveMap:art,emissive:new THREE.Color(1,1,1),emissiveIntensity:.55,roughness:.35});
  for(const sx of [-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(2*(ohl-orr)-.04,.42),artM);m.position.set(sx*(ohw+.0015),.52,0);m.rotation.y=sx*Math.PI/2;SCENE.add(m);}
  for(const [sz,pl] of [[1,0],[-1,1]]){const t=sideArt(true,pl),mm=new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:new THREE.Color(1,1,1),emissiveIntensity:.6,roughness:.35});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(2*(ohw-orr)+.06,.36),mm);m.position.set(0,.52,sz*(ohl+.0015));m.rotation.y=sz>0?0:Math.PI;SCENE.add(m);}
  /* the underglow on the carpet */
  const ug=canvasTex(256,512,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.55);gr.addColorStop(0,'rgba(140,90,255,1)');gr.addColorStop(.55,'rgba(110,60,255,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.save();g.scale(1,2);g.fillRect(0,0,w,h/2);g.restore();});
  UNDERGLOW=new THREE.Mesh(new THREE.PlaneGeometry(2.0,3.1),new THREE.MeshBasicMaterial({map:ug,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(.5,.4,1).multiplyScalar(1.3)}));
  UNDERGLOW.rotation.x=-Math.PI/2;UNDERGLOW.position.y=.004;SCENE.add(UNDERGLOW);
  const ugl=new THREE.Mesh(upExtrude(ringShape(ohw-.095,ohl-.125,.1,ohw-.085,ohl-.115,.11),.23,.238),new THREE.MeshBasicMaterial({color:new THREE.Color(.6,.35,1).multiplyScalar(3)}));SCENE.add(ugl);
}
/* ---------- the scoreboard over the table ---------- */
const BOARD={scr:null,y:TB.DECK+1.32,grp:new THREE.Group()};
function makeBoard(){
  const SCENE=BOARD.grp;
  const y=BOARD.y,box=new THREE.Mesh(new THREE.BoxGeometry(1.04,.34,.16),MAT.body);box.position.y=y;box.castShadow=false;SCENE.add(box);
  BOARD.scr=ledScreen(112,32,.96,.274,2.5);
  for(const sz of [1,-1]){const m=BOARD.scr.mesh.clone();m.position.set(0,y,sz*.081);m.rotation.y=sz>0?0:Math.PI;SCENE.add(m);}
  const fr=new THREE.Mesh(new THREE.BoxGeometry(1.08,.025,.17),MAT.chrome);fr.position.y=y+.18;SCENE.add(fr);const fr2=fr.clone();fr2.position.y=y-.18;SCENE.add(fr2);
  for(const sx of [-.42,.42]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,2.4,6),MAT.chrome);c.position.set(sx,y+1.37,0);SCENE.add(c);}
  const neon=new THREE.Mesh(new THREE.BoxGeometry(1.1,.008,.008),new THREE.MeshBasicMaterial({color:new THREE.Color(P1COL).multiplyScalar(3)}));neon.position.set(0,y-.2,.085);SCENE.add(neon);
  const neon2=neon.clone();neon2.material=new THREE.MeshBasicMaterial({color:new THREE.Color(P2COL).multiplyScalar(3)});neon2.position.z=-.085;SCENE.add(neon2);
  BOARD.neon=[neon,neon2];
}
/* ---------- puck and mallets ---------- */
const PUCK3=[],MAL3=[],BLOBS=[];
let PUCKTOP=null;
function puckTop(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=10;g.beginPath();g.arc(w/2,h/2,w*.36,0,TAU);g.stroke();
  g.fillStyle='rgba(0,0,0,.3)';g.font='700 66px "Chakra Petch",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('HD',w/2,h/2+3);
  g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.arc(w*.33,h*.3,w*.06,0,TAU);g.fill();});}
function makePuckMesh(col){
  const r=TB.RP,h=.011,prof=[[0,0],[r-.002,0],[r,.002],[r,h-.002],[r-.002,h],[r*.8,h],[r*.78,h-.0015],[0,h-.0015]].map(([x,y])=>new THREE.Vector2(x,y));
  const gm=new THREE.LatheGeometry(prof,40);
  const mat=new THREE.MeshPhysicalMaterial({color:col,roughness:.28,clearcoat:.7,clearcoatRoughness:.15,emissive:new THREE.Color(col),emissiveIntensity:0});
  const g=new THREE.Group(),m=new THREE.Mesh(gm,mat);m.castShadow=true;g.add(m);
  const cap=new THREE.Mesh(new THREE.CircleGeometry(r*.79,40),new THREE.MeshPhysicalMaterial({color:col,map:PUCKTOP,roughness:.25,clearcoat:.8,emissive:new THREE.Color(col),emissiveIntensity:0,emissiveMap:PUCKTOP}));
  cap.rotation.x=-Math.PI/2;cap.position.y=h-.0014;g.add(cap);
  const glow=new THREE.Mesh(new THREE.TorusGeometry(r+.0005,.0016,6,40),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(4)}));glow.rotation.x=Math.PI/2;glow.position.y=h*.5;glow.visible=false;g.add(glow);
  g.userData={mat,cap,glow,h};return g;
}
function makeMalletMesh(col){
  const r=TB.RM,prof=[[0,.001],[r-.004,.001],[r,.005],[r,.013],[r-.003,.018],[r*.62,.022],[.022,.03],[.0155,.045],[.0155,.056]].map(([x,y])=>new THREE.Vector2(x,y));
  const g=new THREE.Group();
  const mat=new THREE.MeshPhysicalMaterial({color:col,roughness:.22,clearcoat:1,clearcoatRoughness:.06,sheen:0});
  const body=new THREE.Mesh(new THREE.LatheGeometry(prof,48),mat);body.castShadow=true;g.add(body);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.0225,32,16),mat);knob.position.y=.07;knob.scale.y=.86;knob.castShadow=true;g.add(knob);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r-.001,.0022,8,48),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(2.5)}));ring.rotation.x=Math.PI/2;ring.position.y=.0135;g.add(ring);
  const felt=new THREE.Mesh(new THREE.CircleGeometry(r-.004,32),MAT.rubber);felt.rotation.x=Math.PI/2;felt.position.y=.0008;g.add(felt);
  g.userData={mat,ring,knob};return g;
}
function setMalletColor(i,col){const u=MAL3[i].userData,c=new THREE.Color(col);u.mat.color.copy(c);u.ring.material.color.copy(c).multiplyScalar(2.5);}
let BLOBTEX=null;
function blob(size,k){const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:BLOBTEX,transparent:true,depthWrite:false,opacity:k,color:0x000000}));
  m.rotation.x=-Math.PI/2;m.position.y=TB.DECK+.0006;m.renderOrder=1;SCENE.add(m);return m;}
function makePieces(){
  PUCKTOP=puckTop();
  BLOBTEX=canvasTex(64,64,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);},{srgb:false});
  for(let i=0;i<3;i++){const p=makePuckMesh(i?'#ffc21a':'#e3172a');p.visible=false;SCENE.add(p);PUCK3.push(p);BLOBS.push(blob(.13,.5));}
  for(let i=0;i<2;i++){const m=makeMalletMesh(i?P2COL:P1COL);SCENE.add(m);MAL3.push(m);BLOBS.push(blob(.18,.6));}
}
/* ---------- the room ---------- */
const ROOM3=new THREE.Group();
function makeRoom(){
  SCENE.add(ROOM3);SCENE.fog=new THREE.FogExp2(new THREE.Color('#0a0714'),.075);SCENE.background=new THREE.Color('#06040c');
  /* blacklight carpet: confetti shapes that glow */
  const cp=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#0b0820';g.fillRect(0,0,w,h);const r=mulberry(9),C=['#ff2f8a','#2fd8ff','#ffd23f','#8a4bff','#5aff7a'];
    for(let i=0;i<90;i++){const x=r()*w,y=r()*h,c=C[i%5],s=6+r()*10,k=r()*5|0;g.save();g.translate(x,y);g.rotate(r()*TAU);g.fillStyle=c;g.strokeStyle=c;g.lineWidth=2.5;g.globalAlpha=.55;
      if(k===0){g.beginPath();g.moveTo(0,-s);g.lineTo(s*.9,s*.6);g.lineTo(-s*.9,s*.6);g.closePath();g.stroke();}
      else if(k===1){g.beginPath();g.arc(0,0,s*.6,0,TAU);g.stroke();}
      else if(k===2){g.beginPath();g.moveTo(-s,0);for(let j=0;j<=4;j++)g.lineTo(-s+j*s/2,(j%2?-1:1)*s*.4);g.stroke();}
      else if(k===3){g.fillRect(-2,-s*.7,4,s*1.4);g.fillRect(-s*.7,-2,s*1.4,4);}
      else{g.beginPath();g.arc(0,0,2.5,0,TAU);g.fill();}g.restore();}},{repeat:true,aniso:8});
  cp.repeat.set(7,7);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({map:cp,emissiveMap:cp,emissive:new THREE.Color(1,1,1),emissiveIntensity:.2,roughness:.95,color:new THREE.Color(.55,.55,.6)}));
  fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;ROOM3.add(fl);
  /* walls: dark, with a neon sign and some glowing cabinets */
  const wm=new THREE.MeshStandardMaterial({color:'#0e0a18',roughness:.8});
  for(const [x,z,ry] of [[0,-6.5,0],[0,6.5,Math.PI],[-6.5,0,Math.PI/2],[6.5,0,-Math.PI/2]]){const w=new THREE.Mesh(new THREE.PlaneGeometry(13,4.2),wm);w.position.set(x,2.1,z);w.rotation.y=ry;ROOM3.add(w);}
  const sign=canvasTex(1024,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.font='italic 700 150px "Chakra Petch",sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.shadowColor='#ff2f8a';g.shadowBlur=30;g.strokeStyle='#ff6ab8';g.lineWidth=10;g.strokeText('AIR HOCKEY',w/2,h/2);g.shadowBlur=0;g.strokeStyle='#fff0f8';g.lineWidth=3;g.strokeText('AIR HOCKEY',w/2,h/2);});
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1.1),new THREE.MeshBasicMaterial({map:sign,transparent:true,color:new THREE.Color(3,3,3),depthWrite:false}));sg.position.set(0,2.75,-6.45);ROOM3.add(sg);
  const cabCols=['#2fd8ff','#ff8a2e','#8a4bff','#5aff7a','#ff2f8a','#ffd23f'];
  for(let i=0;i<6;i++){const side=i<3?-1:1,k=i%3,x=side*6.0,z=-3.6+k*2.6;
    const cab=new THREE.Mesh(new THREE.BoxGeometry(.75,1.85,.8),new THREE.MeshStandardMaterial({color:'#100c1c',roughness:.5}));cab.position.set(x,.925,z);ROOM3.add(cab);
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(.56,.42),new THREE.MeshBasicMaterial({color:new THREE.Color(cabCols[i]).multiplyScalar(1.6)}));
    scr.position.set(x-side*.41,1.3,z);scr.rotation.y=-side*Math.PI/2;ROOM3.add(scr);
    const mq=new THREE.Mesh(new THREE.PlaneGeometry(.66,.14),new THREE.MeshBasicMaterial({color:new THREE.Color(cabCols[(i+2)%6]).multiplyScalar(2.2)}));mq.position.set(x-side*.41,1.72,z);mq.rotation.y=-side*Math.PI/2;ROOM3.add(mq);}
  for(const [c,z] of [['#ff2f8a',-6.4],['#2fd8ff',6.4]]){const t=new THREE.Mesh(new THREE.BoxGeometry(12,.04,.04),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(3)}));t.position.set(0,3.9,z);ROOM3.add(t);}
}
/* ---------- lights ---------- */
const LT={};
function makeLights(){
  LT.hemi=new THREE.HemisphereLight(new THREE.Color('#7a74c0'),new THREE.Color('#140a1e'),.4);SCENE.add(LT.hemi);
  const s=new THREE.SpotLight(new THREE.Color('#fff2e0'),15,0,.62,.6,2);s.position.set(0,TB.DECK+2.25,.15);s.target.position.set(0,TB.DECK,0);SCENE.add(s);SCENE.add(s.target);
  s.castShadow=true;s.shadow.bias=-.0003;s.shadow.normalBias=.012;s.shadow.camera.near=1;s.shadow.camera.far=4;LT.spot=s;
  LT.pink=new THREE.PointLight(new THREE.Color('#ff3a9a'),9,0,2);LT.pink.position.set(-2.6,2.4,-2.2);SCENE.add(LT.pink);
  LT.cyan=new THREE.PointLight(new THREE.Color('#38d8ff'),9,0,2);LT.cyan.position.set(2.6,2.4,2.4);SCENE.add(LT.cyan);
  LT.goal=new THREE.PointLight(new THREE.Color('#ffffff'),0,1.2,2);LT.goal.position.set(0,TB.DECK+.25,0);SCENE.add(LT.goal);
  LT.puck=[];for(let i=0;i<3;i++){const l=new THREE.PointLight(new THREE.Color('#ffffff'),0,.7,2);SCENE.add(l);LT.puck.push(l);}
}
function shadowQuality(){const q=QP[QL],s=LT.spot;if(!s)return;R.shadowMap.enabled=q.shadow>0;s.castShadow=q.shadow>0;
  if(q.shadow>0&&s.shadow.mapSize.x!==q.shadow){s.shadow.mapSize.set(q.shadow,q.shadow);if(s.shadow.map){s.shadow.map.dispose();s.shadow.map=null;}}
  SCENE.traverse(m=>{if(m.material)m.material.needsUpdate=true;});}
function applyTheme(){
  const th=THEMES[THEME];DU.uDeck.value.setRGB(th.deck[0],th.deck[1],th.deck[2]);DU.uLineK.value=th.lineK;DU.uRefl.value=th.refl;DU.uHoles.value=th.holes;
  DECK3.material.roughness=th.rough;DECK3.material.envMapIntensity=th.env;LT.hemi.intensity=th.amb;LT.spot.intensity=15*th.spot;
  for(let i=0;i<3;i++){const u=PUCK3[i].userData,c=new THREE.Color(i?th.puck2:th.puck);u.mat.color.copy(c);u.mat.emissive.copy(c);u.mat.emissiveIntensity=th.puckE*.5;
    u.cap.material.color.copy(c);u.cap.material.emissive.copy(c);u.cap.material.emissiveIntensity=th.puckE*.35;u.glow.visible=th.puckE>0;u.glow.material.color.copy(c).multiplyScalar(5);
    LT.puck[i].color.copy(c);}
}
function worldInit(){
  SCENE.add(BOARD.grp);makeMats();makeRoom();makeDeck();makeRails();makeCabinet();makeBoard();makePieces();makeLights();applyTheme();shadowQuality();mirrorSize();
}
function worldResize(){mirrorSize();}
function worldQuality(){shadowQuality();mirrorSize();}
