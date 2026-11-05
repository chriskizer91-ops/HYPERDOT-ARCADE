/* =====================================================================================
   32. THE CABINETS AND CLAWS — one builder per machine, from Christopher's pictures:
   Sugar Claw: a mint and pink 1950s candy-shop cabinet, rounded like an old fridge, striped awning, a cloud sign.
   Wildwood: a forest cabin, green paint and oak posts, a shingle roof, brass lanterns, a prize hatch.
   Titan: a huge red and gold carnival machine, an arched marquee and chasing bulbs.
   Each builds in its machine's own coordinates: the case floor is y=0, the room floor is y=-hb.
   ===================================================================================== */
const CABS={};
/* labels and ornaments painted on canvases */
function labelTex(txt,o){return ctex(o.w||512,o.h||128,(g,w,h)=>{
  if(o.bg){g.fillStyle=o.bg;if(o.r){g.beginPath();g.roundRect(4,4,w-8,h-8,o.r);g.fill();}else g.fillRect(0,0,w,h);}
  if(o.border){g.strokeStyle=o.border;g.lineWidth=o.bw||8;g.beginPath();g.roundRect(10,10,w-20,h-20,o.r||8);g.stroke();}
  g.font=o.font||'bold 80px Georgia';g.textAlign='center';g.textBaseline='middle';
  if(o.shadow){g.fillStyle=o.shadow;g.fillText(txt,w/2+3,h/2+5);}g.fillStyle=o.col||'#fff';g.fillText(txt,w/2,h/2+4);
  if(o.extra)o.extra(g,w,h);});}
function star(g,x,y,r,col){g.fillStyle=col;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();}
function pines(g,x0,x1,yb,hgt,n,col){g.fillStyle=col;for(let i=0;i<n;i++){const x=x0+(x1-x0)*(i+.5)/n,hh=hgt*(.75+.25*((i*7)%3)/2);g.beginPath();
  for(let k=0;k<3;k++){const w=hh*(.42-k*.1),y=yb-hh*k*.3;g.moveTo(x-w,y);g.lineTo(x,y-hh*.55);g.lineTo(x+w,y);}g.fill();g.fillRect(x-hh*.04,yb,hh*.08,hh*.12);}}
function woodTex(base,dark){return ctex(256,256,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const R=mulberry(5);
  for(let i=0;i<60;i++){const y=R()*h;g.strokeStyle=dark;g.globalAlpha=.08+R()*.18;g.lineWidth=1+R()*2.5;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=16)g.lineTo(x,y+Math.sin(x*.03+i)*3);g.stroke();}g.globalAlpha=1;},true);}
/* ---------- lights you can see: bulbs (small glowing spheres) and glows (soft halos, also over the painted bulbs of a marquee) ---------- */
function addBulbs(E,list,o){
  const n=list.length;if(!n)return;
  const pos=new Float32Array(n*3),col=new Float32Array(n*3);list.forEach((b,i)=>{pos.set(b.p,i*3);col.set(b.c,i*3);});
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));pg.setAttribute('color',new THREE.BufferAttribute(col,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:o.glow,map:MAT.glowTex,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
  pts.renderOrder=7;pts.frustumCulled=false;E.G.add(pts);
  let inst=null;
  if(o.r){inst=new THREE.InstancedMesh(new THREE.SphereGeometry(o.r,10,8),new THREE.MeshBasicMaterial({color:'#ffffff'}),n);const m=new THREE.Matrix4(),c=new THREE.Color();
    list.forEach((b,i)=>{m.makeTranslation(b.p[0],b.p[1],b.p[2]);inst.setMatrixAt(i,m);inst.setColorAt(i,c.setRGB(b.c[0],b.c[1],b.c[2]));});E.G.add(inst);}
  E.bulbs.push({list,pts,col,inst,o});
}
/* the painted bulbs of a marquee picture, mapped onto its plane (centre, width, height) */
function marqueeGlows(E,id,cx,cy,cz,w,h,o){const L=(MBULBS[id]||[]).map((b,i)=>{const warm=b[2]===1||o.warm;return {p:[cx+(b[0]-.5)*w,cy+(.5-b[1])*h,cz],c:warm?[1,.62,.25]:[1,.92,.7],m:o.mode,ph:i,k:b[2]};});
  addBulbs(E,L,{glow:o.glow});}
function animCabs(dt){
  const t=S.t||performance.now()/1000;
  for(const id in GFX.mg){const E=GFX.mg[id];if(!E.G.visible)continue;
    for(const B of E.bulbs){const L=B.list,col=B.col,ca=B.pts.geometry.attributes.color;let any=false;
      for(let i=0;i<L.length;i++){const b=L[i];let v=1;
        if(b.m==='chase'){const win=S.lamp==='win'&&S.winT<3,step=Math.floor(t*(win?14:7));v=((step+i)%3===0)?1.25:win?.6:.32;}
        else if(b.m==='twinkle')v=.72+.28*Math.sin(t*2.2+b.ph*1.7);
        else if(b.m==='edison')v=.86+.1*Math.sin(t*13+b.ph*3)+.05*Math.sin(t*31+b.ph);
        col[i*3]=b.c[0]*v;col[i*3+1]=b.c[1]*v;col[i*3+2]=b.c[2]*v;any=true;}
      if(any)ca.needsUpdate=true;
      if(B.inst){const c=new THREE.Color();for(let i=0;i<L.length;i++)B.inst.setColorAt(i,c.setRGB(col[i*3]*1.6+.25,col[i*3+1]*1.6+.25,col[i*3+2]*1.6+.25));B.inst.instanceColor.needsUpdate=true;}}
    for(const f of E.anim)f(t,dt);}
}
/* ---------- inside every case: floor, back painting, glass, the prize chute, the gantry rails ---------- */
function caseInside(E,k,o){
  const C=CASE,W=C.x1-C.x0,D=C.z1-C.z0,H=C.top,U=UNIT,id=MC.id;
  const fab=texOf('fab/'+o.fab,true,true);if(fab)fab.repeat.set(o.rep[0],o.rep[1]);
  k.plane(W,D,STD(o.floor,1,0,{map:fab}),0,0,0,{rx:-Math.PI/2});
  const wall=texOf('mach/'+id+'_wall');k.plane(W,H,new THREE.MeshStandardMaterial({map:wall,color:o.wallTint||'#ffffff',emissiveMap:wall,emissive:new THREE.Color('#ffffff'),emissiveIntensity:o.wallGlow||.35,roughness:.9}),0,H/2,C.z0-.002*U);
  k.plane(D,H,MAT.glass,C.x0,H/2,0,{ry:Math.PI/2,ro:5,recv:false});k.plane(D,H,MAT.glass,C.x1,H/2,0,{ry:-Math.PI/2,ro:5,recv:false});
  k.plane(W,H-.02*U,MAT.glass,0,H/2+.01*U,C.z1+.004*U,{ro:6,recv:false});
  k.box(W,.02*U,D,o.ceil,0,H+.01*U,0);
  /* the prize chute: a clear box in the front-left corner over a dark shaft */
  const cw=C.cx-C.x0,cd=C.z1-C.cz;
  k.plane(cd,C.ch,MAT.acrylic,C.cx,C.ch/2,(C.cz+C.z1)/2,{ry:Math.PI/2,ro:4,recv:false});k.plane(cw,C.ch,MAT.acrylic,(C.x0+C.cx)/2,C.ch/2,C.cz,{ro:4,recv:false});
  const rt=.012*U;k.box(rt,rt,cd,o.rim,C.cx,C.ch,(C.cz+C.z1)/2);k.box(cw,rt,rt,o.rim,(C.x0+C.cx)/2,C.ch,C.cz);
  k.plane(cw,cd,MAT.hole,(C.x0+C.cx)/2,.002*U,(C.cz+C.z1)/2,{rx:-Math.PI/2});
  for(const x of [C.x0+.02*U,C.x1-.02*U])k.box(.025*U,.03*U,D,o.rail,x,CS.GY+.025*U,0,{cast:true,recv:false});
}
/* the joystick and button on the control deck move with you */
function deckControls(E,x1,x2,y,z,o){
  const g=new THREE.Group();g.position.set(x1,y,z);E.G.add(g);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(o.r*1.4,o.r*1.6,o.r*.4,18),o.baseM);base.position.y=o.r*.2;g.add(base);
  const st=new THREE.Group();st.position.y=o.r*.3;g.add(st);
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(o.r*.28,o.r*.32,o.len,10),MAT.chrome);sh.position.y=o.len/2;st.add(sh);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(o.r,18,14),o.ballM);ball.position.y=o.len;ball.castShadow=true;st.add(ball);
  const bg=new THREE.Group();bg.position.set(x2,y,z);E.G.add(bg);
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(o.br*1.3,o.br*1.35,o.br*.4,22),o.ringM);ring.position.y=o.br*.2;bg.add(ring);
  const btn=new THREE.Mesh(new THREE.SphereGeometry(o.br,20,12,0,TAU,0,Math.PI/2),o.btnM);btn.scale.y=.6;btn.position.y=o.br*.3;bg.add(btn);
  E.stick=st;E.btn=btn;E.btnY=o.br*.3;
}
/* ======================= SUGAR CLAW ======================= */
CABS.sugar=function(E){
  const C=CASE,W=C.x1-C.x0,D=C.z1-C.z0,H=C.top,U=UNIT,hb=MC.hb,k=new Kit(E.G);
  const mint=STD('#9fd9bf',.38),pink=STD('#f2a2bf',.4),cream=STD('#f7eedb',.5),white=STD('#fbf6f0',.5);
  const pinkD=new THREE.MeshStandardMaterial({color:'#f2a2bf',roughness:.45,side:THREE.DoubleSide}),whiteD=new THREE.MeshStandardMaterial({color:'#fbf6f0',roughness:.5,side:THREE.DoubleSide});
  const ow=W+.12,od=D+.12,fz=od/2;MC.frame={w:ow+.16,y0:-hb,y1:H+.36};
  caseInside(E,k,{fab:'minky',rep:[3,2.4],floor:'#f7c6d8',ceil:white,rim:MAT.chrome,rail:MAT.chrome,wallGlow:.1,wallTint:'#b8a8b0'});
  /* the lower body: rounded like an old fridge; candy-swirl panels on the sides */
  k.add(rbox(ow,hb-.075,od,.05,.012),mint,0,-.005-(hb-.075)/2,0,0,0,0,{cast:true});
  const side=texOf('mach/sugar_side'),sideM=STD('#ffffff',.55,0,{map:side});
  for(const s of [-1,1])k.plane(od*.78,(hb-.075)*.78,sideM,s*(ow/2+.002),-.005-(hb-.075)/2,0,{ry:s*Math.PI/2});
  for(const s of [-1,1])for(const z of [-1,1])k.add(new THREE.SphereGeometry(.042,14,10),cream,s*(ow/2-.05),-hb+.035,z*(od/2-.05),0,0,0,{sy:.65,cast:true});
  k.box(ow-.04,.014,.014,MAT.chrome,0,-hb+.08,fz+.002);
  /* the control deck, cream with a chrome edge */
  k.add(rbox(ow-.02,.2,.045,.05,.008),cream,0,-.025,C.z1+.08,-Math.PI/2,0,0,{cast:true});k.box(ow-.08,.012,.012,MAT.chrome,0,-.025,C.z1+.18);
  deckControls(E,-.08,.12,0,C.z1+.1,{r:.016,len:.05,baseM:MAT.chrome,ballM:STD('#ff8ab8',.3),br:.018,ringM:MAT.chrome,btnM:STD('#e8343c',.25,0,{emissive:new THREE.Color('#ff2020'),emissiveIntensity:.25})});
  /* the prize door and the coin door */
  k.add(rbox(.2,.16,.02,.035,.005),cream,-.13,-.36,fz+.01);k.box(.15,.105,.006,STD('#9a3c66',.8),-.13,-.36,fz+.021);
  k.plane(.14,.035,new THREE.MeshStandardMaterial({map:labelTex('✦ PRIZE ✦',{w:512,h:128,bg:'#f7eedb',r:30,col:'#e0588e',font:'bold 78px "Arial Rounded MT Bold",Arial,sans-serif'}),roughness:.6}),-.13,-.255,fz+.003);
  k.box(.085,.15,.01,MAT.chrome,.15,-.34,fz+.005);k.box(.008,.04,.004,MAT.black,.15,-.31,fz+.012);
  k.plane(.06,.016,new THREE.MeshStandardMaterial({map:labelTex('INSERT COIN',{w:512,h:128,bg:'#d8dce4',col:'#222',font:'bold 64px Arial'}),roughness:.5}),.15,-.37,fz+.0115);
  /* the case frame: mint posts, a chrome frame round the glass */
  for(const sx of [-1,1])for(const sz of [-1,1])k.cyl(.024,.024,H,mint,sx*(W/2+.02),H/2,sz*(D/2+.02),{cast:true});
  for(const sx of [-1,1])k.cyl(.007,.007,H,MAT.chrome,sx*(W/2+.002),H/2,C.z1+.008);
  k.box(W,.012,.012,MAT.chrome,0,.006,C.z1+.008);
  /* the cap, the striped awning, the sign */
  k.add(rbox(ow,.09,od,.04,.01),mint,0,H+.045,0,0,0,0,{cast:true});k.box(ow-.04,.01,.01,MAT.chrome,0,H+.002,fz+.004);
  const n=9,sw=(ow+.04)/n,L=.11,ph=Math.atan2(.07,.1);
  for(let i=0;i<n;i++){const x=-(ow+.04)/2+sw*(i+.5),m=i%2?whiteD:pinkD;k.box(sw,.006,L,m,x,H+.045,fz+.055,{rx:ph,cast:true});
    k.add(new THREE.CircleGeometry(sw/2,12,Math.PI,Math.PI),m,x,H+.045-Math.sin(ph)*L/2,fz+.055+Math.cos(ph)*L/2+.002);}
  const sgW=.6,sgH=sgW/3,sy=H+.09+sgH/2+.02,sz=.06;
  k.add(rbox(sgW+.04,sgH+.04,.035,.06,.008),mint,0,sy,sz,0,0,0,{cast:true});
  const mq=texOf('mach/sugar_marquee');k.plane(sgW,sgH,new THREE.MeshStandardMaterial({map:mq,emissiveMap:mq,emissive:new THREE.Color('#ffffff'),emissiveIntensity:.75,roughness:.5}),0,sy,sz+.0185);
  marqueeGlows(E,'sugar',0,sy,sz+.021,sgW,sgH,{mode:'twinkle',glow:.016});
  /* a soft light panel on the ceiling */
  k.plane(W*.6,D*.4,new THREE.MeshBasicMaterial({color:'#fff6ea'}),0,H-.0005,0,{rx:Math.PI/2});
  k.flush();MC.light='#fff0e0';MC.lightI=11;
};
/* ======================= WILDWOOD ======================= */
CABS.wild=function(E){
  const C=CASE,W=C.x1-C.x0,D=C.z1-C.z0,H=C.top,U=UNIT,hb=MC.hb,k=new Kit(E.G);
  const oakT=woodTex('#b9844c','#5a3518'),paint=STD('#22392a',.55),paintD=STD('#1a2c20',.6),oak=STD('#ffffff',.6,0,{map:oakT}),dark=STD('#2a1d14',.7),brass=STD('#d2a957',.3,1,{envMapIntensity:1.8});
  const ow=W+.12,od=D+.12,fz=od/2;MC.frame={w:1.32,y0:-hb,y1:H+.52};
  caseInside(E,k,{fab:'felt',rep:[5,4],floor:'#4a6a34',ceil:dark,rim:brass,rail:brass,wallGlow:.35});
  /* the lower cabinet: green paint, oak trim, the forest panels on the sides, a skirt with pine trees */
  k.box(ow,hb-.16,od,paint,0,-.02-(hb-.16)/2,0,{cast:true});
  k.box(ow+.02,.1,od+.02,paintD,0,-hb+.11,0);
  const skirt=new THREE.MeshStandardMaterial({map:ctex(1024,96,(g,w,h)=>{g.fillStyle='#1a2c20';g.fillRect(0,0,w,h);pines(g,w*.3,w*.7,h*.8,h*.7,7,'#c9a45a');}),roughness:.7});
  k.plane(ow,.1,skirt,0,-hb+.11,fz+.012);
  k.box(ow+.02,.03,od+.02,oak,0,-.032,0);
  const side=texOf('mach/wild_side'),sideM=STD('#ffffff',.65,0,{map:side});const ph=(hb-.2)*.92,pw=ph*.667;
  for(const s of [-1,1]){k.plane(pw,ph,sideM,s*(ow/2+.002),-.06-ph/2-.02,0,{ry:s*Math.PI/2});
    for(const [dy,dz,w,h] of [[ph/2,0,pw+.04,.025],[-ph/2,0,pw+.04,.025],[0,pw/2,.025,ph],[0,-pw/2,.025,ph]])k.box(.012,h,w,oak,s*(ow/2+.006),-.08-ph/2+dy,dz);}
  for(const sx of [-1,1])for(const sz of [-1,1])k.cyl(.022,.03,.06,brass,sx*(ow/2-.01),-hb+.03,sz*(od/2-.01),{cast:true});
  /* the prize hatch (left, under the chute) and the coin door */
  const px=(C.x0+C.cx)/2;
  for(const [dx,dy,w,h] of [[0,.115,.27,.035],[0,-.115,.27,.035],[-.12,0,.035,.26],[.12,0,.035,.26]])k.box(w,h,.03,oak,px+dx,-.5+dy,fz+.012);
  k.box(.205,.195,.012,STD('#0c0806',.95),px,-.5,fz+.004);k.box(.2,.012,.08,oak,px,-.6,fz-.03);
  k.plane(.22,.07,new THREE.MeshStandardMaterial({map:labelTex('PRIZE',{w:512,h:160,bg:'#1a2c20',border:'#c9a45a',bw:6,r:14,col:'#e7c56e',font:'bold 92px Georgia',shadow:'#000',extra:(g,w,h)=>{pines(g,30,110,h*.75,60,2,'#c9a45a');pines(g,w-110,w-30,h*.75,60,2,'#c9a45a');}}),roughness:.6}),px,-.33,fz+.003);
  k.box(.2,.3,.02,paintD,.2,-.48,fz+.01);k.box(.04,.09,.012,brass,.2,-.44,fz+.026);k.box(.006,.05,.004,MAT.black,.2,-.44,fz+.033);
  k.plane(.12,.035,new THREE.MeshStandardMaterial({map:labelTex('INSERT COIN',{w:512,h:150,bg:'#c9a45a',col:'#1a1208',font:'bold 70px Georgia'}),roughness:.5,metalness:.3}),.2,-.56,fz+.021);
  /* oak corner posts with brass caps, top bands */
  for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*(W/2+.03),z=sz*(D/2+.03);k.box(.055,H+hb-.04,.055,oak,x,(H+.06-hb+.06)/2,z,{cast:true});
    k.box(.07,.02,.07,brass,x,H+.1,z);k.box(.065,.018,.065,brass,x,0,z);}
  for(const z of [C.z0-.03,C.z1+.03])k.box(ow,.04,.05,oak,0,H+.07,z);
  k.box(ow,.06,od,paint,0,H+.03,0);
  /* the control shelf */
  k.box(ow,.06,.26,dark,0,-.06,C.z1+.16,{cast:true});k.box(ow,.02,.02,oak,0,-.03,C.z1+.29);
  deckControls(E,-.12,.12,-.03,C.z1+.17,{r:.022,len:.06,baseM:brass,ballM:brass,br:.032,ringM:dark,btnM:STD('#2dc85a',.3,0,{emissive:new THREE.Color('#1aff6a'),emissiveIntensity:.55})});
  /* the roof: two shingle slopes, a gable front with carved pines, the sign, two lanterns */
  const shT=ctex(256,256,(g,w,h)=>{g.fillStyle='#2b1c13';g.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=0;c<6;c++){const x=c*w/6+(r%2)*w/12,y=r*h/8;g.fillStyle=['#3a2618','#33210f','#41291a'][(r*3+c)%3];g.fillRect(x+1,y+1,w/6-2,h/8-2);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,y+h/8-3,w/6,3);}},true);
  shT.repeat.set(3,2);const shM=STD('#ffffff',.8,0,{map:shT});
  const ex=ow/2+.1,ey=H+.12,ry=.36,rl=Math.hypot(ex,ry),ra=Math.atan2(ry,ex),rd=od+.26;
  for(const s of [-1,1])k.box(rl,.035,rd,shM,s*ex/2,ey+ry/2+.015,0,{rz:-s*ra,cast:true});
  k.box(.05,.05,rd,dark,0,ey+ry+.02,0);
  const gable=new THREE.Shape();gable.moveTo(-ex+.04,0);gable.lineTo(ex-.04,0);gable.lineTo(0,ry-.02);gable.closePath();
  const gg=new THREE.ShapeGeometry(gable),gu=gg.attributes.uv;for(let i=0;i<gu.count;i++){const x=gg.attributes.position.getX(i),y=gg.attributes.position.getY(i);gu.setXY(i,(x+ex)/(2*ex),1-y/ry);}
  const gT=ctex(512,180,(g,w,h)=>{g.fillStyle='#1d3324';g.fillRect(0,0,w,h);pines(g,w*.33,w*.67,h*.42,h*.36,5,'#c9a45a');});
  k.add(gg,new THREE.MeshStandardMaterial({map:gT,roughness:.7}),0,ey,fz+.11);
  k.box(ow+.04,.12,.04,oak,0,H+.06,fz+.06);
  for(const s of [-1,1])k.box(.04,.12,od,oak,s*(ow/2+.02),H+.06,0);
  const sgW=.7,sgH=sgW/3,sy=ey+.02,sz=fz+.14;
  const mq=texOf('mach/wild_marquee');k.plane(sgW,sgH,new THREE.MeshStandardMaterial({map:mq,emissiveMap:mq,emissive:new THREE.Color('#ffffff'),emissiveIntensity:.7,roughness:.6}),0,sy,sz+.012);
  k.box(sgW+.03,sgH+.03,.02,dark,0,sy,sz,{cast:true});
  for(const s of [-1,1])k.box(.012,.1,.012,brass,s*.2,sy+sgH/2+.05,sz-.01);
  marqueeGlows(E,'wild',0,sy,sz+.015,sgW,sgH,{mode:'edison',glow:.045,warm:true});
  const lan=[];
  for(const s of [-1,1]){const x=s*(sgW/2+.075),y=sy+.03,z=sz+.02;
    k.box(.09,.01,.01,brass,s*(sgW/2+.03),y+.07,z-.02);k.cyl(.03,.012,.02,brass,x,y+.06,z);k.cyl(.034,.034,.012,brass,x,y-.05,z);
    k.box(.05,.09,.05,new THREE.MeshStandardMaterial({color:'#ffcf7a',emissive:new THREE.Color('#ffaa44'),emissiveIntensity:1.6,roughness:.3}),x,y,z);
    for(const dx of [-1,1])for(const dz of [-1,1])k.box(.006,.095,.006,brass,x+dx*.025,y,z+dz*.025);
    lan.push({p:[x,y,z+.03],c:[1,.62,.25],m:'edison',ph:s+3});}
  addBulbs(E,lan,{glow:.16});
  /* Edison bulbs hanging inside the top of the case */
  const eb=[];for(let i=0;i<5;i++){const x=C.x0+.1+i*(W-.2)/4;k.cyl(.002,.002,.05,MAT.black,x,H-.025,C.z1-.05);eb.push({p:[x,H-.06,C.z1-.05],c:[1,.7,.36],m:'edison',ph:i});}
  addBulbs(E,eb,{r:.016,glow:.09});
  k.flush();MC.light='#ffdcae';MC.lightI=14;
};
/* ======================= TITAN ======================= */
CABS.titan=function(E){
  const C=CASE,W=C.x1-C.x0,D=C.z1-C.z0,H=C.top,U=UNIT,hb=MC.hb,k=new Kit(E.G);
  const red=STD('#b5121b',.32,0,{envMapIntensity:1.3}),redD=STD('#7a0c12',.45),gold=STD('#d8a844',.28,1,{envMapIntensity:1.6}),black=STD('#0d0b0f',.5);
  const ow=W+.2,od=D+.2,fz=od/2;MC.frame={w:ow+.25,y0:-hb,y1:H+1.02};
  caseInside(E,k,{fab:'velvet',rep:[4,3],floor:'#561016',ceil:STD('#1a1418',.6),rim:MAT.chrome,rail:MAT.steel,wallGlow:.3});
  /* the lower cabinet: red lacquer, gold edges, scrollwork, a gold base on chrome feet */
  k.box(ow,hb-.14,od,red,0,-.02-(hb-.14)/2,0,{cast:true});
  k.box(ow+.04,.06,od+.04,gold,0,-hb+.11,0);k.box(ow+.04,.04,od+.04,gold,0,-.03,0);
  for(const sx of [-1,1])for(const sz of [-1,1]){k.box(.03,hb-.14,.03,gold,sx*ow/2,-.02-(hb-.14)/2,sz*od/2);
    k.cyl(.035,.035,.03,MAT.chrome,sx*(ow/2-.06),-hb+.015,sz*(od/2-.06));k.cyl(.012,.012,.07,MAT.chrome,sx*(ow/2-.06),-hb+.06,sz*(od/2-.06));}
  const scroll=new THREE.MeshStandardMaterial({map:ctex(512,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#e8bf5a';g.lineWidth=9;g.lineCap='round';
      for(const s of [-1,1]){g.save();g.translate(w/2,h/2);g.scale(s,1);g.beginPath();g.moveTo(20,0);g.bezierCurveTo(80,-70,170,-70,200,-10);g.bezierCurveTo(220,40,160,60,140,20);g.stroke();
        g.beginPath();g.moveTo(20,0);g.bezierCurveTo(90,60,180,70,215,30);g.stroke();g.restore();}star(g,w/2,h/2,34,'#f2d27a');}),transparent:true,alphaTest:.4,roughness:.35,metalness:.6});
  const px=(C.x0+C.cx)/2;
  /* PRIZE door under the chute */
  k.box(.62,.44,.03,gold,px,-.38,fz+.012);k.box(.56,.38,.02,redD,px,-.38,fz+.024);
  k.plane(.5,.32,new THREE.MeshStandardMaterial({map:labelTex('PRIZE',{w:512,h:330,col:'#f2cd6a',font:'bold 120px Georgia',shadow:'#4a0006',extra:(g,w,h)=>{star(g,w/2,h*.8,34,'#f2cd6a');star(g,60,h*.3,20,'#f2cd6a');star(g,w-60,h*.3,20,'#f2cd6a');}}),transparent:true,roughness:.4}),px,-.38,fz+.035);
  k.box(.02,.06,.02,MAT.chrome,px+.25,-.38,fz+.04);
  k.box(.16,.3,.02,black,.62,-.38,fz+.01);k.box(.05,.1,.012,MAT.chrome,.62,-.34,fz+.024);k.box(.008,.05,.004,MAT.black,.62,-.34,fz+.031);
  k.plane(.36,.18,scroll,.2,-.38,fz+.003);
  const side=texOf('mach/titan_side'),sideM=STD('#ffffff',.5,0,{map:side});const sh=hb-.24,swd=sh*.667;
  for(const s of [-1,1])for(const z of [-od/4,od/4]){k.plane(swd,sh,sideM,s*(ow/2+.002),-.06-sh/2-.02,z,{ry:s*Math.PI/2});k.box(.012,sh+.04,swd+.04,gold,s*(ow/2+.001),-.08-sh/2,z);}
  /* the control deck, to the right of the chute */
  const dx0=C.cx+.05,dx1=ow/2,dw=dx1-dx0,dc=(dx0+dx1)/2;
  k.box(dw,.07,.34,red,dc,-.045,C.z1+.2,{cast:true});k.box(dw,.025,.02,gold,dc,-.02,C.z1+.37);
  deckControls(E,dc-dw*.22,dc+dw*.22,-.01,C.z1+.2,{r:.04,len:.13,baseM:black,ballM:MAT.chrome,br:.06,ringM:gold,btnM:STD('#ffcf40',.2,1,{emissive:new THREE.Color('#ff9a10'),emissiveIntensity:.35})});
  /* the case frame: red posts with gold edges; a header; chrome edges round the glass */
  const pw=.1;for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*(W/2+pw/2),z=sz*(D/2+pw/2);k.box(pw,H+.02,pw,red,x,H/2,z,{cast:true});k.box(pw+.01,.03,pw+.01,gold,x,.01,z);}
  for(const sx of [-1,1])k.box(.012,H,.012,MAT.chrome,sx*(W/2+.004),H/2,C.z1+.01);
  k.box(ow+.02,.16,od+.02,red,0,H+.08,0,{cast:true});k.box(ow+.04,.025,od+.04,gold,0,H+.012,0);k.box(ow+.04,.025,od+.04,gold,0,H+.16,0);
  /* LED bars on the ceiling inside */
  for(const z of [-D*.25,D*.2])k.box(W*.85,.012,.03,new THREE.MeshBasicMaterial({color:'#fff8f0'}),0,H-.008,z);
  /* the arched marquee */
  const mw=1.7,mh=mw/2,my=H+.17+mh/2-.02,mz=fz-.04;
  const mq=texOf('mach/titan_marquee');k.plane(mw,mh,new THREE.MeshStandardMaterial({map:mq,emissiveMap:mq,emissive:new THREE.Color('#ffffff'),emissiveIntensity:.7,roughness:.4,transparent:true,alphaTest:.35}),0,my,mz);
  marqueeGlows(E,'titan',0,my,mz+.006,mw,mh,{mode:'chase',glow:.09});
  for(const s of [-1,1]){k.add(new THREE.ConeGeometry(.035,.12,12),gold,s*(mw/2-.04),H+.24,mz,0,0,0,{});k.add(new THREE.SphereGeometry(.03,12,10),gold,s*(mw/2-.04),H+.31,mz);}
  /* chasing bulbs up both front posts and along the header */
  const B=[],nP=20;
  for(const sx of [-1,1])for(let i=0;i<nP;i++){const y=.05+i*(H-.08)/(nP-1);B.push({p:[sx*(W/2+pw/2),y,C.z1+pw+.012],c:i%2?[1,.62,.22]:[1,.95,.78],m:'chase',ph:i});}
  for(let i=0;i<24;i++){const x=-ow/2+.06+i*(ow-.12)/23;B.push({p:[x,H+.085,fz+.022],c:i%2?[1,.62,.22]:[1,.95,.78],m:'chase',ph:i});}
  addBulbs(E,B,{r:.017,glow:.075});
  k.flush();MC.light='#fff2e2';MC.lightI=16;
};
/* ======================= THE CLAWS ======================= */
/* a prong: one rigid curved strip from its hinge, through the elbow, to the hook's tip, built at opening 0 in the
   prong's own frame (x out from the centre, y up the claw, z along the hinge) and turned about z by the opening */
function prongGeo(w,t,taper){
  const L1=CS.L1,L2=CS.L2,A0=CS.A0,a2=A0-CS.HOOK,d1=[Math.sin(A0),-Math.cos(A0)],d2=[Math.sin(a2),-Math.cos(a2)],E=[d1[0]*L1,d1[1]*L1],T=[E[0]+d2[0]*L2,E[1]+d2[1]*L2];
  const pts=[[0,0],[E[0]*.5,E[1]*.5],[E[0]*.93+d2[0]*L2*.1,E[1]*.93+d2[1]*L2*.1],[E[0]+d2[0]*L2*.55,E[1]+d2[1]*L2*.55],T].map(p=>new THREE.Vector3(p[0],p[1],0));
  const cv=new THREE.CatmullRomCurve3(pts,false,'centripetal'),N=26,R=10,pos=[],idx=[];
  for(let i=0;i<=N;i++){const u=i/N,P=cv.getPoint(u),Tg=cv.getTangent(u),nx=-Tg.y,ny=Tg.x,s=lerp(1,taper,u);
    for(let j=0;j<R;j++){const a=j/R*TAU;pos.push(P.x+nx*Math.cos(a)*t*s,P.y+ny*Math.cos(a)*t*s,Math.sin(a)*w*s);}}
  for(let i=0;i<N;i++)for(let j=0;j<R;j++){const a=i*R+j,b=i*R+(j+1)%R,c=a+R,d=b+R;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  g.tip=T;return g;
}
function buildRig(E,id){
  const U=UNIT,G=E.G,r={E,id,prong:[],tips:[]};const st={sugar:{w:.0055,t:.0022,head:'dome'},wild:{w:.0105,t:.0042,head:'bell'},titan:{w:.026,t:.0105,head:'block'}}[id];
  const metal=id==='wild'?STD('#d2a957',.3,1,{envMapIntensity:1.8}):MAT.chrome;
  r.cable=new THREE.Mesh(new THREE.CylinderGeometry(.0022*Math.sqrt(U),.0022*Math.sqrt(U),1,6).translate(0,.5,0),MAT.cable);r.cable.castShadow=true;G.add(r.cable);
  /* the coiled cord beside the cable, stretching as the cable pays out */
  const hel=[];for(let i=0;i<=360;i++){const a=i/360*TAU*26;hel.push(new THREE.Vector3(Math.cos(a)*.006*U,i/360,Math.sin(a)*.006*U));}
  r.coil=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hel),360,.0016*U,5,false),MAT.cord);G.add(r.coil);
  r.head=new THREE.Group();G.add(r.head);const RH=CS.RH,add=(geo,m,y,o={})=>{const ms=new THREE.Mesh(geo,m);ms.position.y=y;if(o.sy)ms.scale.y=o.sy;ms.castShadow=true;r.head.add(ms);return ms;};
  if(st.head==='dome'){add(new THREE.SphereGeometry(RH*.85,22,12,0,TAU,0,Math.PI/2),MAT.chrome,.012);add(new THREE.CylinderGeometry(RH*.85,RH*.8,.02,22),MAT.chrome,.002);
    add(new THREE.CylinderGeometry(RH*.9,RH*.9,.008,22),STD('#ff8ab8',.35),.006);add(new THREE.CylinderGeometry(RH*.25,RH*.3,.012,12),MAT.chrome,.012+RH*.85);}
  else if(st.head==='bell'){const rb=new THREE.CylinderGeometry(RH*.62,RH*.9,.055,24,1);add(rb,new THREE.MeshStandardMaterial({color:'#e8ecf2',roughness:.2,metalness:1,flatShading:true,envMapIntensity:2.4}),.012);
    add(new THREE.CylinderGeometry(RH*.95,RH*.95,.012,24),STD('#d2a957',.3,1,{envMapIntensity:1.8}),-.018);add(new THREE.SphereGeometry(RH*.35,14,10),MAT.chrome,.045);}
  else{const redM=STD('#c0141c',.3,.2);add(new THREE.CylinderGeometry(RH*.92,RH*.98,.15,8),redM,.04);add(new THREE.CylinderGeometry(RH*.7,RH*.92,.03,8),redM,.13);
    add(new THREE.CylinderGeometry(RH*.85,RH*.85,.035,24),MAT.chrome,-.05);add(new THREE.CylinderGeometry(RH*.3,RH*.35,.07,14),MAT.chrome,.17);
    const bolt=new THREE.SphereGeometry(.009,8,6);for(let i=0;i<8;i++){const a=(i+.5)/8*TAU;for(const y of [.0,.08]){const b=new THREE.Mesh(bolt,MAT.chrome);b.position.set(Math.cos(a)*RH*.96,y,Math.sin(a)*RH*.96);r.head.add(b);}}}
  const pg=prongGeo(st.w,st.t,id==='titan'?.85:.6),kn=new THREE.CylinderGeometry(st.t*1.7,st.t*1.7,st.w*2.4,12).rotateX(Math.PI/2);
  const tipG=id==='titan'?new THREE.CapsuleGeometry(st.t*1.5,st.t*2.5,4,10):new THREE.SphereGeometry(st.t*1.25,10,8),tipM=id==='titan'?MAT.rubber:metal;
  for(let s=0;s<3;s++){const g=new THREE.Group();g.matrixAutoUpdate=false;G.add(g);
    const p=new THREE.Mesh(pg,metal);p.castShadow=true;g.add(p);const kk=new THREE.Mesh(kn,MAT.chrome);g.add(kk);
    const tp=new THREE.Mesh(tipG,tipM);tp.position.set(pg.tip[0],pg.tip[1],0);if(id==='titan')tp.rotation.z=CS.A0-CS.HOOK;tp.castShadow=true;g.add(tp);r.prong.push(g);}
  /* the gantry: a beam across at the carriage's depth, the carriage */
  const C=CASE,W=C.x1-C.x0,bm=id==='wild'?STD('#d2a957',.3,1,{envMapIntensity:1.8}):MAT.steel;
  r.beam=new THREE.Mesh(new THREE.BoxGeometry(W-.02*U,.025*U,.03*U),bm);r.beam.castShadow=true;G.add(r.beam);
  r.car=new THREE.Mesh(new THREE.BoxGeometry(.07*U,.05*U,.06*U),id==='titan'?STD('#c0141c',.3,.2):id==='wild'?STD('#2a1d14',.7):MAT.chrome);r.car.castShadow=true;G.add(r.car);
  drawRig(r);return r;
}
const _v=new THREE.Vector3(),_u=new THREE.Vector3(0,1,0),_q=new THREE.Quaternion(),_mb=new THREE.Matrix4(),_mr=new THREE.Matrix4();
function placeSeg(m,ax,ay,az,bx,by,bz){_v.set(bx-ax,by-ay,bz-az);const l=_v.length()||1e-6;m.position.set(ax,ay,az);_q.setFromUnitVectors(_u,_v.multiplyScalar(1/l));m.quaternion.copy(_q);m.scale.set(1,l,1);}
function drawRig(r){
  clawFrame();const U=UNIT,E=r.E,top=CS.GY+.02*U;
  r.beam.position.set(0,CS.GY+.025*U,CL.gz);r.car.position.set(CL.gx,CS.GY+.035*U,CL.gz);
  const tx=CL.hx+CL.ux*CS.cab,ty=CL.hy+CL.uy*CS.cab,tz=CL.hz+CL.uz*CS.cab;placeSeg(r.cable,tx,ty,tz,CL.gx,top,CL.gz);
  const o=.016*U;placeSeg(r.coil,tx+o,ty,tz,CL.gx+o,top,CL.gz);r.coil.scale.set(1,Math.max(.02,r.coil.scale.y),1);
  r.head.position.set(CL.hx,CL.hy,CL.hz);_v.set(CL.ux,CL.uy,CL.uz);r.head.quaternion.setFromUnitVectors(_u,_v);
  for(let s=0;s<3;s++){const g=r.prong[s],vis=s<CS.npr;g.visible=vis;if(!vis)continue;const p=s*3,h=s*9;
    _mb.set(PE[p],CL.ux,PK[p],PG[h],PE[p+1],CL.uy,PK[p+1],PG[h+1],PE[p+2],CL.uz,PK[p+2],PG[h+2],0,0,0,1);
    _mr.makeRotationZ(CL.ph[s]);g.matrix.multiplyMatrices(_mb,_mr);g.matrixWorldNeedsUpdate=true;}
  /* the joystick leans with the carriage, the button goes down when you drop */
  if(E.stick&&E===GFX.mg[MC.id]){const vx=CL.gvx/(GT.vm||.3),vz=CL.gvz/(GT.vmz||.24);E.stick.rotation.z=-clamp(vx,-1,1)*.38;E.stick.rotation.x=clamp(vz,-1,1)*.38;
    E.btn.position.y=E.btnY-((M.ph==='drop'&&M.t<.35)||TS.B?E.btnY*.6:0);}
  const cs=GFX.clawSpot,P=MPOS[r.id];if(cs){cs.intensity=M.beam*3*U*U;cs.distance=1.2*U;cs.position.set(CL.hx+P[0],CL.hy-.02*U+P[1],CL.hz+P[2]);cs.target.position.set(CL.hx+P[0],P[1],CL.hz+P[2]);}
}
