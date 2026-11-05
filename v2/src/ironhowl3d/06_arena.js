/* ===================== the arena in 3D: ground, walls and gates, buildings, skyline, breakable props, water =====================
   Built from WORLD (same layout as the original). Static light from lamps is painted into a light map on the ground. */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function canTex(c,o={}){const t=new T.CanvasTexture(c);t.colorSpace=o.lin?T.NoColorSpace:T.SRGBColorSpace;t.wrapS=t.wrapT=o.clamp?T.ClampToEdgeWrapping:T.RepeatWrapping;t.anisotropy=o.aniso||4;
  t.minFilter=o.near?T.NearestFilter:T.LinearMipmapLinearFilter;t.magFilter=o.near?T.NearestFilter:T.LinearFilter;t.generateMipmaps=!o.near;return t;}
/* world-space UVs: windows, panels and stripes stay the same size on every box, instanced or not */
function hookWorldUV(mat,tile,o={}){
  const roof=o.roof||[0,0,0];
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uTile={value:new T.Vector2(tile[0],tile[1])};sh.uniforms.uRoof={value:new T.Vector3(...roof)};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 uTile;varying float vRoof;')
      .replace('#include <project_vertex>',`#include <project_vertex>
  {vec4 fwp=vec4(transformed,1.0);vec3 fn=objectNormal;
  #ifdef USE_INSTANCING
  fwp=instanceMatrix*fwp;fn=mat3(instanceMatrix)*fn;
  #endif
  fwp=modelMatrix*fwp;fn=normalize(mat3(modelMatrix)*fn);
  vec2 fuv=abs(fn.x)>.5?vec2(fwp.z*sign(fn.x),fwp.y):vec2(-fwp.x*sign(fn.z),fwp.y);
  vRoof=abs(fn.y);
  #ifdef USE_MAP
  vMapUv=fuv/uTile;
  #endif
  #ifdef USE_EMISSIVEMAP
  vEmissiveMapUv=fuv/uTile;
  #endif
  }`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uRoof;varying float vRoof;')
      .replace('#include <map_fragment>','#include <map_fragment>\nif(vRoof>.5)diffuseColor.rgb=uRoof;')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(vRoof>.5)totalEmissiveRadiance=vec3(0.);');
  };
  mat.customProgramCacheKey=()=>'wuv'+tile.join(',')+roof.join(',');
}
function boxAt(x0,y0,x1,y1,z0,z1){const g=new T.BoxGeometry(x1-x0,z1-z0,y1-y0);g.translate((x0+x1)/2,(z0+z1)/2,(y0+y1)/2);return g;}
const ARENA={grp:null,own:[],lamps:[],inst:{},M4:new T.Matrix4(),Q4:new T.Quaternion(),V3:new T.Vector3(),S3:new T.Vector3(),flick:0,
  keep(o){this.own.push(o);return o;},
  clear(){WETU.length=0;if(this.grp)scene.remove(this.grp);for(const o of this.own)if(o.dispose)o.dispose();this.own=[];this.grp=new T.Group();scene.add(this.grp);this.inst={};this.lamps=[];},
  add(m,cast,recv){m.castShadow=!!cast;m.receiveShadow=recv!==false;this.grp.add(m);return m;},
  build(Wd){
    this.clear();const th=Wd.th,dock=th.id==='docks',r=mulberry(Wd.seed*3+1),K=this.keep.bind(this);
    THEME3.set(th);
    /* ---------- ground: concrete slabs, paint, stains, puddles; lamp light painted into a light map ---------- */
    const PPU=QN==='low'?12:16,AW=WW*PPU,AH=WH*PPU,[gc,x]=mkCanvas(AW,AH),gx=v=>v*PPU;
    x.fillStyle=th.out;x.fillRect(0,0,AW,AH);
    x.fillStyle=rgba(th.g0);x.fillRect(gx(IN0-1),gx(IN0-1),gx(INX-IN0+2),gx(INY-IN0+2));
    for(let sx=IN0;sx<INX;sx+=3)for(let sy=IN0;sy<INY;sy+=3){if(r()<.55){x.fillStyle=rgba(mixC(th.g0,th.g1,r()));x.fillRect(gx(sx),gx(sy),gx(3),gx(3));}}
    x.strokeStyle=th.seam;x.lineWidth=Math.max(1,PPU*.08);for(let v=IN0;v<=INX;v+=3){x.beginPath();x.moveTo(gx(v),gx(IN0));x.lineTo(gx(v),gx(INY));x.stroke();}
    for(let v=IN0;v<=INY;v+=3){x.beginPath();x.moveTo(gx(IN0),gx(v));x.lineTo(gx(INX),gx(v));x.stroke();}
    for(let i=0;i<34;i++){x.fillStyle=`rgba(0,0,0,${.1+r()*.18})`;x.beginPath();x.ellipse(gx(IN0+r()*(INX-IN0)),gx(IN0+r()*(INY-IN0)),gx(.4+r()*1.6),gx(.3+r()*1.1),r()*3,0,TAU);x.fill();}
    x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=Math.max(1,PPU*.05);for(let i=0;i<36;i++){let px=gx(IN0+r()*(INX-IN0)),py=gx(IN0+r()*(INY-IN0));x.beginPath();x.moveTo(px,py);for(let k=0;k<7;k++){px+=(r()-.5)*gx(1.4);py+=(r()-.5)*gx(1.4);x.lineTo(px,py);}x.stroke();}
    const puddles=[];for(let i=0;i<(dock?18:9);i++)puddles.push([IN0+r()*(INX-IN0),IN0+r()*(INY-IN0),.8+r()*2.2,.4+r()*1.1,r()*3]);
    for(const p of puddles){x.fillStyle=dock?'rgba(14,22,40,.45)':'rgba(26,20,16,.5)';x.beginPath();x.ellipse(gx(p[0]),gx(p[1]),gx(p[2]),gx(p[3]),p[4],0,TAU);x.fill();}
    /* drains and manholes */
    for(let i=0;i<6;i++){const dx=gx(IN0+3+r()*(INX-IN0-6)),dy=gx(IN0+3+r()*(INY-IN0-6));x.fillStyle='rgba(10,10,12,.7)';x.fillRect(dx,dy,gx(.8),gx(.8));x.strokeStyle='rgba(120,120,120,.35)';x.lineWidth=1;for(let k=1;k<5;k++){x.beginPath();x.moveTo(dx+gx(.16*k),dy);x.lineTo(dx+gx(.16*k),dy+gx(.8));x.stroke();}}
    const cx=gx(WW/2),cy=gx(WH/2);x.strokeStyle=th.paint;x.lineWidth=Math.max(1,PPU*.16);x.beginPath();x.arc(cx,cy,gx(4.2),0,TAU);x.stroke();
    x.lineWidth=Math.max(1,PPU*.07);x.beginPath();x.arc(cx,cy,gx(3.7),0,TAU);x.stroke();
    x.fillStyle=th.id==='docks'?th.paint2:'#b4aea2';const hw=gx(.25),hh=gx(1.4);x.fillRect(cx-gx(.9),cy-hh,hw*2,hh*2);x.fillRect(cx+gx(.9)-hw*2,cy-hh,hw*2,hh*2);x.fillRect(cx-gx(.9),cy-gx(.22),gx(1.8),gx(.44));
    x.fillStyle=th.paint;for(let v=IN0+2;v<INX-2;v+=2.4){if(Math.abs(v-WW/2)<5)continue;x.fillRect(gx(v),gx(WH/2)-gx(.06),gx(1.2),gx(.12));}
    for(let v=IN0+2;v<INY-2;v+=2.4){if(Math.abs(v-WH/2)<5)continue;x.fillRect(gx(WW/2)-gx(.06),gx(v),gx(.12),gx(1.2));}
    for(const gt of Wd.gates){const L=gt.dy?[gt.x-2.4,gt.y-.5,4.8,1]:[gt.x-.5,gt.y-2.4,1,4.8];for(let i=0;i<8;i++){x.fillStyle=i%2?'#151210':th.paint;if(gt.dy)x.fillRect(gx(L[0]+i*.6),gx(L[1]),gx(.6),gx(L[3]));else x.fillRect(gx(L[0]),gx(L[1]+i*.6),gx(L[2]),gx(.6));}}
    x.save();x.filter=`blur(${Math.round(PPU*.35)}px)`;
    for(const p of Wd.props){if(p.kind==='sky'||p.kind==='lamp')continue;x.fillStyle='rgba(0,0,0,.42)';x.fillRect(gx(p.x0-.2),gx(p.y0-.2),gx(p.x1-p.x0+.4),gx(p.y1-p.y0+.4));}
    x.restore();
    {const img=x.getImageData(0,0,AW,AH),d=img.data;for(let i=0;i<d.length;i+=4){const k=.9+r()*.2;d[i]*=k;d[i+1]*=k;d[i+2]*=k;}x.putImageData(img,0,0);}
    const tG=K(canTex(gc,{clamp:true,aniso:8}));
    const [rc,rx]=mkCanvas(WW*4,WH*4);rx.fillStyle=dock?'rgb(0,96,0)':'rgb(0,215,0)';rx.fillRect(0,0,rc.width,rc.height);
    for(let i=0;i<120;i++){rx.fillStyle=dock?`rgba(0,${150+r()*60|0},0,.5)`:`rgba(0,${200+r()*55|0},0,.5)`;rx.fillRect(r()*rc.width,r()*rc.height,4+r()*12,4+r()*12);}
    for(const p of puddles){rx.fillStyle='rgb(0,22,0)';rx.beginPath();rx.ellipse(p[0]*4,p[1]*4,p[2]*4,p[3]*4,p[4],0,TAU);rx.fill();}
    const tR=K(canTex(rc,{lin:true,clamp:true}));
    const [lc,lx]=mkCanvas(WW*8,WH*8);this.lmc=[lc,lx];
    const tL=K(canTex(lc,{clamp:true}));this.tL=tL;
    const gMat=K(new T.MeshStandardMaterial({map:tG,roughnessMap:tR,roughness:1,metalness:0,lightMap:tL,lightMapIntensity:dock?5.2:4.2,envMapIntensity:dock?1.1:.25}));
    const gGeo=K(new T.PlaneGeometry(WW,WH));gGeo.rotateX(-Math.PI/2);gGeo.translate(WW/2,0,WH/2);
    hookWet(gMat);const gm=this.add(new T.Mesh(gGeo,gMat),false,true);gm.layers.set(1);
    this.paintLights();
    /* surroundings: dark ground (and the harbour on the docks) */
    const oMat=K(new T.MeshStandardMaterial({color:new T.Color(...linRGB(th.out).map(v=>v*1.6+.004)),roughness:dock?.55:.95,metalness:0}));
    const oGeo=K(new T.PlaneGeometry(320,dock?(WH+1.2+140):320));oGeo.rotateX(-Math.PI/2);oGeo.translate(WW/2,-.02,dock?(WH+1.2-(WH+1.2+140)/2):WH/2);
    hookWet(oMat);const om=this.add(new T.Mesh(oGeo,oMat),false,true);om.layers.set(1);
    if(dock)this.water();
    this.towers(Wd,th,r);
    /* ---------- walls with panel seams, a top cap and red warning lights ---------- */
    const [wc,wx]=mkCanvas(256,128);wx.fillStyle=th.wallF;wx.fillRect(0,0,256,128);
    for(let i=0;i<500;i++){wx.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:255},${r()<.5?0:255},.035)`;wx.fillRect(r()*256,r()*128,2+r()*6,2+r()*6);}
    wx.fillStyle='rgba(0,0,0,.45)';wx.fillRect(0,0,3,128);wx.fillRect(127,0,2,128);wx.fillStyle='rgba(255,255,255,.06)';wx.fillRect(4,0,2,128);
    wx.fillStyle='rgba(0,0,0,.3)';wx.fillRect(0,120,256,8);for(let i=0;i<6;i++){wx.fillStyle='rgba(0,0,0,.25)';wx.fillRect(20+i*40,40+r()*60,2,10+r()*30);}
    const tW=K(canTex(wc));
    const wMat=K(new T.MeshStandardMaterial({map:tW,roughness:.85,metalness:.05}));hookWorldUV(wMat,[3,1.5],{roof:linRGB(th.wallT)});
    const capMat=K(new T.MeshStandardMaterial({color:new T.Color(...linRGB(th.wallT)),roughness:.6,metalness:.3}));
    const warn=[];
    for(const p of Wd.props){if(p.kind!=='wall')continue;
      this.add(new T.Mesh(K(boxAt(p.x0,p.y0,p.x1,p.y1,0,p.h)),wMat),true,true);
      this.add(new T.Mesh(K(boxAt(p.x0-.08,p.y0-.08,p.x1+.08,p.y1+.08,p.h,p.h+.14)),capMat),true,true);
      if(p.h>2){const lx=p.x1-p.x0>p.y1-p.y0;const n=Math.floor((lx?p.x1-p.x0:p.y1-p.y0)/6);for(let i=0;i<n;i++){const t=(i+.5)/n;warn.push([lx?lerp(p.x0,p.x1,t):(p.x0+p.x1)/2,lx?(p.y0+p.y1)/2:lerp(p.y0,p.y1,t),p.h+.2]);}}}
    {const g=K(new T.BoxGeometry(.18,.12,.18)),m=K(new T.MeshBasicMaterial({color:0xffffff,fog:false}));const im=new T.InstancedMesh(g,m,Math.max(1,warn.length));im.count=warn.length;
      warn.forEach((w,i)=>{this.M4.makeTranslation(w[0],w[2],w[1]);im.setMatrixAt(i,this.M4);im.setColorAt(i,new T.Color(3,.25,.15));});this.add(im);this.inst.warn={im,list:warn};}
    /* ---------- gates: striped pillars, beacons, and a gantry over the far three ---------- */
    {const [hc,hx]=mkCanvas(64,64);hx.fillStyle='#e2a420';hx.fillRect(0,0,64,64);hx.fillStyle='#151210';for(let i=-64;i<64;i+=16){hx.beginPath();hx.moveTo(i,64);hx.lineTo(i+8,64);hx.lineTo(i+72,0);hx.lineTo(i+64,0);hx.fill();}
      const tH=K(canTex(hc));const hMat=K(new T.MeshStandardMaterial({map:tH,roughness:.6,metalness:.3}));hookWorldUV(hMat,[1.2,1.2],{roof:[.06,.05,.04]});
      const beam=K(new T.MeshStandardMaterial({color:0x2a2a30,roughness:.5,metalness:.7}));
      const bulbs=[];
      for(const gt of Wd.gates){const ax=gt.dy?1:0,ay=gt.dx?1:0;
        for(const s of [-1,1]){const px=gt.x+ax*s*2.75,py=gt.y+ay*s*2.75;this.add(new T.Mesh(K(boxAt(px-.35,py-.35,px+.35,py+.35,0,4.2)),hMat),true,true);bulbs.push([px,py,4.35]);}
        if(gt.dy!==-1)this.add(new T.Mesh(K(boxAt(gt.x-ax*3.1-ay*.25,gt.y-ay*3.1-ax*.25,gt.x+ax*3.1+ay*.25,gt.y+ay*3.1+ax*.25,3.7,4.1)),beam),true,true);}
      const g=K(new T.SphereGeometry(.16,10,8)),m=K(new T.MeshBasicMaterial({color:0xffffff,fog:false}));const im=new T.InstancedMesh(g,m,bulbs.length);
      bulbs.forEach((b,i)=>{this.M4.makeTranslation(b[0],b[2],b[1]);im.setMatrixAt(i,this.M4);im.setColorAt(i,new T.Color(4,.3,.15));});this.add(im);this.inst.bulbs={im,list:bulbs};}
    /* ---------- buildings: lit windows, roof clutter, a door; neon signs on the docks ---------- */
    const fac=this.facade(th,r);
    const bMat=K(new T.MeshStandardMaterial({map:fac.map,emissiveMap:fac.emi,emissive:0xffffff,emissiveIntensity:dock?2.2:1.8,roughness:.75,metalness:.15}));hookWorldUV(bMat,[6.4,7.2],{roof:[.03,.03,.035]});
    const roofM=K(new T.MeshStandardMaterial({color:0x3a3a40,roughness:.8,metalness:.4}));
    this.neons=[];
    for(const p of Wd.props){if(p.kind!=='bldg')continue;
      const m=this.add(new T.Mesh(K(boxAt(p.x0,p.y0,p.x1,p.y1,0,p.h)),bMat),true,true);
      const tint=linRGB(th.bF[p.c%3]).map(v=>Math.min(1,v*5+.25));m.material=bMat;
      const rr=mulberry((p.seed*1e6)|0),w=p.x1-p.x0,d=p.y1-p.y0;
      this.add(new T.Mesh(K(boxAt(p.x0-.05,p.y0-.05,p.x1+.05,p.y1+.05,p.h,p.h+.22)),roofM),true,true);
      for(let i=0;i<3;i++){const vx=p.x0+w*(.15+rr()*.6),vy=p.y0+d*(.2+rr()*.5),vw=.6+rr()*.7;this.add(new T.Mesh(K(boxAt(vx,vy,vx+vw,vy+vw*.7,p.h,p.h+.35+rr()*.4)),roofM),true,true);}
      const dx=(p.x0+p.x1)/2;this.add(new T.Mesh(K(boxAt(dx-w*.09,p.y1,dx+w*.09,p.y1+.06,0,Math.min(2.2,p.h*.35))),roofM),false,true);
      if(p.neon){const c=p.neon.col,nm=K(new T.MeshBasicMaterial({color:new T.Color(c[0]*4,c[1]*4,c[2]*4),fog:false}));
        const mesh=this.add(new T.Mesh(K(boxAt(p.x0+w*.15,p.y1,p.x1-w*.15,p.y1+.12,p.h*.62,p.h*.62+.28)),nm));this.neons.push({mesh,mat:nm,col:c,c:p.c});}}
    /* ---------- skyline: the original's backdrop row plus a city that rings the arena ---------- */
    this.skyline(Wd,th,r,fac);
    /* ---------- breakable props ---------- */
    this.props(Wd,th);
    this.lampPosts(Wd,th);
  },
  /* window facade texture and its glow map */
  facade(th,r){
    const K=this.keep.bind(this),[c,x]=mkCanvas(256,256),[e,ex]=mkCanvas(256,256);
    x.fillStyle='#4a4c54';x.fillRect(0,0,256,256);ex.fillStyle='#000';ex.fillRect(0,0,256,256);
    for(let i=0;i<900;i++){x.fillStyle=`rgba(0,0,0,${r()*.12})`;x.fillRect(r()*256,r()*256,2+r()*8,2+r()*8);}
    const wc=th.win;
    for(let gy=0;gy<4;gy++){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,gy*64+58,256,6);
      for(let gx=0;gx<4;gx++){const on=r()<.42,X=gx*64+12,Y=gy*64+14,w=40,h=32,k=.55+r()*.45;
        x.fillStyle='#16181e';x.fillRect(X-2,Y-2,w+4,h+4);
        x.fillStyle=on?`rgb(${wc[0]*k|0},${wc[1]*k|0},${wc[2]*k|0})`:'#22262e';x.fillRect(X,Y,w,h);
        if(on){ex.fillStyle=`rgb(${wc[0]*k*.8|0},${wc[1]*k*.8|0},${wc[2]*k*.8|0})`;ex.fillRect(X,Y,w,h);if(r()<.4){ex.fillStyle='rgba(0,0,0,.6)';ex.fillRect(X,Y,w*(.3+r()*.4),h);}}
        x.fillStyle='rgba(0,0,0,.5)';x.fillRect(X+w/2-1,Y,2,h);}}
    return {map:K(canTex(c)),emi:K(canTex(e))};
  },
  skyline(Wd,th,r,fac){
    const K=this.keep.bind(this),list=[];
    for(const p of Wd.props)if(p.kind==='sky')list.push([p.x0,p.y0,p.x1,p.y1,p.h,.5]);
    const far=(x0,x1,y0,y1,hmin,hmax,n,k)=>{for(let i=0;i<n;i++){const w=4+r()*8,d=4+r()*8,x=x0+r()*(x1-x0),y=y0+r()*(y1-y0);list.push([x,y,x+w,y+d,hmin+r()*(hmax-hmin),k]);}};
    far(-30,90,-34,-10,8,26,26,.35);far(-36,-8,-10,WH+20,6,20,12,.32);far(WW+4,WW+34,-10,WH+20,6,20,12,.32);
    if(th.id!=='docks')far(-20,80,WH+8,WH+30,4,12,10,.3);
    const g=K(new T.BoxGeometry(1,1,1));g.translate(0,.5,0);
    const m=K(new T.MeshStandardMaterial({map:fac.map,emissiveMap:fac.emi,emissive:0xffffff,emissiveIntensity:th.id==='docks'?1.6:1.2,roughness:.85,metalness:.1}));hookWorldUV(m,[6.4,7.2],{roof:[.02,.02,.025]});
    const im=new T.InstancedMesh(g,m,list.length),c=new T.Color();
    list.forEach((b,i)=>{this.M4.compose(this.V3.set((b[0]+b[2])/2,0,(b[1]+b[3])/2),this.Q4.identity(),this.S3.set(b[2]-b[0],b[4],b[3]-b[1]));im.setMatrixAt(i,this.M4);c.setRGB(b[5],b[5],b[5]*1.1);im.setColorAt(i,c);});
    this.add(im,true,true);
    /* rooftop beacons */
    const bl=list.filter(b=>b[4]>9);const bg=K(new T.SphereGeometry(.22,8,6)),bm=K(new T.MeshBasicMaterial({color:0xffffff,fog:false}));const bi=new T.InstancedMesh(bg,bm,Math.max(1,bl.length));bi.count=bl.length;
    bl.forEach((b,i)=>{this.M4.makeTranslation((b[0]+b[2])/2,b[4]+.3,(b[1]+b[3])/2);bi.setMatrixAt(i,this.M4);bi.setColorAt(i,new T.Color(5,.4,.2));});this.add(bi);this.inst.beacons={im:bi,n:bl.length};
  },
  /* floodlight towers at the corners: lattice masts, lamp banks, and long beams through the haze */
  towers(Wd,th,r){
    const K=this.keep.bind(this),dock=th.id==='docks',col=dock?[.75,.88,1.1]:[1.15,.82,.5];
    const spots=[[IN0-5,IN0-4.5],[INX+5,IN0-4.5],[IN0-7,INY+6],[INX+7,INY+6]];
    const mast=K(new T.MeshStandardMaterial({color:0x2a2c32,roughness:.5,metalness:.8}));
    const lampM=K(new T.MeshBasicMaterial({color:new T.Color(col[0]*5,col[1]*5,col[2]*5),fog:false}));
    const beamG=K(new T.CylinderGeometry(.9,7.5,1,24,1,true).translate(0,-.5,0).rotateX(-Math.PI/2));
    const beamM=K(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false,uniforms:{uC:{value:new T.Color(...col)},uK:{value:dock?.05:.045}},
      vertexShader:`varying float vZ;varying vec3 vN;varying vec3 vV;void main(){vZ=-position.z;vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform vec3 uC;uniform float uK;varying float vZ;varying vec3 vN;varying vec3 vV;void main(){float a=(1.-smoothstep(.0,1.,vZ))*smoothstep(0.,.04,vZ)*pow(abs(dot(vN,vV)),1.6)*uK;gl_FragColor=vec4(uC*a,1.);}`}));
    this.beams=[];
    for(const [tx,ty] of spots){
      const h=15,g=K(new T.CylinderGeometry(.22,.35,h,6));g.translate(0,h/2,0);const m=new T.Mesh(g,mast);m.position.set(tx,0,ty);this.add(m,true,false);
      for(let k=1;k<6;k++){const b=new T.Mesh(K(new T.BoxGeometry(1.6,.08,.08)),mast);b.position.set(tx,k*2.6,ty);b.rotation.y=k*1.1;this.add(b,false,false);}
      const aim=Math.atan2(WH/2-ty,WW/2-tx),head=new T.Group();head.position.set(tx,h+.6,ty);head.rotation.y=-aim+Math.PI/2;
      const frame=new T.Mesh(K(new T.BoxGeometry(3.2,1.7,.4)),mast);head.add(frame);
      for(let i=0;i<3;i++)for(let j=0;j<2;j++){const L=new T.Mesh(K(new T.BoxGeometry(.8,.62,.08)),lampM);L.position.set(-1.05+i*1.05,-.38+j*.76,.22);head.add(L);}
      head.rotation.x=.55;this.grp.add(head);
      /* the beam: from the lamp bank down toward the middle of the arena */
      const dx=WW/2-tx,dy=WH/2-ty,dist=Math.hypot(dx,dy)*.82,len=Math.hypot(dist,h);const bm=new T.Mesh(beamG,beamM);bm.position.set(tx,h+.4,ty);
      bm.lookAt(tx+dx/Math.hypot(dx,dy)*dist,0,ty+dy/Math.hypot(dx,dy)*dist);bm.scale.set(1,1,len);bm.renderOrder=6;this.grp.add(bm);this.beams.push(bm);
      WORLD.lamps.push({kind:'flood',cx:tx+dx/Math.hypot(dx,dy)*dist*.75,cy:ty+dy/Math.hypot(dx,dy)*dist*.75,rad:11,col:col.map(v=>v*.55),dead:false});
    }
    this.paintLights();
  },
  water(){
    const K=this.keep.bind(this);
    const g=K(new T.PlaneGeometry(320,160,1,1));g.rotateX(-Math.PI/2);g.translate(WW/2,-.9,INY+1.2+80);
    const m=K(new T.ShaderMaterial({uniforms:{uT:{value:0},uCam:{value:new T.Vector3()}},vertexShader:`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform float uT;uniform vec3 uCam;varying vec3 vW;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 p=vW.xz;float r=n(p*vec2(.6,2.2)+vec2(0,uT*.6))*.6+n(p*vec2(1.7,5.)-vec2(uT*.3,uT*1.1))*.4;
float d=length(vW-uCam);vec3 c=vec3(.004,.012,.03);
float q=smoothstep(.62,.95,r);float band=sin(vW.x*.21)*.5+.5;
c+=mix(vec3(.05,.5,.9),vec3(.9,.1,.5),band)*q*.55*exp(-(vW.z-${(INY+1.2).toFixed(1)})*.06);
c+=vec3(.02,.05,.09)*r;
c=mix(c,vec3(.006,.012,.03),smoothstep(30.,110.,d));gl_FragColor=vec4(c,1.);}`}));
    this.waterMat=m;this.add(new T.Mesh(g,m),false,false).layers.set(1);
    /* the quay edge */
    const e=K(new T.MeshStandardMaterial({color:0x1a1e26,roughness:.8,metalness:.2}));this.add(new T.Mesh(K(boxAt(-60,INY+1.0,WW+60,INY+1.35,-1,.02)),e),false,true);
    const bol=K(new T.CylinderGeometry(.18,.22,.5,10)),bm=K(new T.MeshStandardMaterial({color:0x2a2e38,roughness:.5,metalness:.7}));
    for(let i=0;i<8;i++){const mm=new T.Mesh(bol,bm);mm.position.set(4+i*7.4,.25,INY+1.18);this.add(mm,true,true);}
  },
  /* ---------- breakable props, instanced by kind ---------- */
  props(Wd,th){
    const K=this.keep.bind(this),P=Wd.props,c=new T.Color();
    /* shipping containers: corrugated sides, door ends */
    const [sc,sx]=mkCanvas(512,128);sx.fillStyle='#c8c8c8';sx.fillRect(0,0,512,128);
    for(let i=0;i<512;i+=12){sx.fillStyle='rgba(0,0,0,.28)';sx.fillRect(i,0,5,128);sx.fillStyle='rgba(255,255,255,.18)';sx.fillRect(i+6,0,2,128);}
    sx.fillStyle='rgba(0,0,0,.45)';sx.fillRect(0,0,512,7);sx.fillRect(0,121,512,7);
    for(let i=0;i<40;i++){sx.fillStyle=`rgba(80,40,20,${Math.random()*.25})`;sx.fillRect(Math.random()*512,Math.random()*128,4+Math.random()*30,2+Math.random()*24);}
    sx.fillStyle='rgba(255,255,255,.75)';sx.font='bold 22px monospace';sx.fillText('HYPR '+(100000+Math.random()*899999|0),26,40);
    const [ec,ex]=mkCanvas(128,128);ex.fillStyle='#c0c0c0';ex.fillRect(0,0,128,128);ex.fillStyle='rgba(0,0,0,.4)';ex.fillRect(62,0,4,128);
    for(const xx of [18,44,82,108]){ex.fillStyle='rgba(30,30,30,.6)';ex.fillRect(xx,8,4,112);ex.fillStyle='rgba(30,30,30,.7)';ex.fillRect(xx-3,56,10,8);}
    ex.strokeStyle='rgba(0,0,0,.5)';ex.lineWidth=4;ex.strokeRect(2,2,124,124);
    const [tc,tx]=mkCanvas(256,64);tx.fillStyle='#c4c4c4';tx.fillRect(0,0,256,64);for(let i=0;i<256;i+=10){tx.fillStyle='rgba(0,0,0,.22)';tx.fillRect(i,0,4,64);}tx.fillStyle='rgba(0,0,0,.4)';tx.fillRect(0,0,256,4);tx.fillRect(0,60,256,4);
    for(let i=0;i<20;i++){tx.fillStyle=`rgba(70,40,20,${Math.random()*.3})`;tx.fillRect(Math.random()*256,Math.random()*64,6+Math.random()*30,4+Math.random()*20);}
    const tS=K(canTex(sc)),tE=K(canTex(ec)),tT=K(canTex(tc));
    const mS=K(new T.MeshStandardMaterial({map:tS,roughness:.55,metalness:.45})),mE=K(new T.MeshStandardMaterial({map:tE,roughness:.55,metalness:.45})),mT=K(new T.MeshStandardMaterial({map:tT,roughness:.6,metalness:.45}));
    const conts=P.filter(p=>p.kind==='cont');
    if(conts.length){const g=K(new T.BoxGeometry(6,2.6,2.5));const im=new T.InstancedMesh(g,[mE,mE,mT,mT,mS,mS],conts.length);
      conts.forEach((p,i)=>{p.ii=i;p.base=linRGB(th.cont[p.c]).map(v=>v*1.25+.01);this.setCont(im,p,0);});this.add(im,true,true);this.inst.cont={im,list:conts};}
    /* crates: planks with a cross brace */
    const [cc,cx]=mkCanvas(128,128);cx.fillStyle='#8a6438';cx.fillRect(0,0,128,128);for(let i=0;i<128;i+=16){cx.fillStyle='rgba(0,0,0,.25)';cx.fillRect(0,i,128,2);for(let k=0;k<4;k++){cx.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?40:200},0,.05)`;cx.fillRect(Math.random()*128,i+3,30,10);}}
    cx.strokeStyle='#5a3e20';cx.lineWidth=14;cx.strokeRect(7,7,114,114);cx.beginPath();cx.moveTo(10,10);cx.lineTo(118,118);cx.stroke();cx.fillStyle='rgba(20,10,0,.8)';for(const [a,b] of [[12,12],[116,12],[12,116],[116,116]])cx.fillRect(a-2,b-2,4,4);
    const crates=P.filter(p=>p.kind==='crate');
    if(crates.length){const g=K(new T.BoxGeometry(1.15,1.1,1.15)),m=K(new T.MeshStandardMaterial({map:K(canTex(cc)),roughness:.85,metalness:0}));const im=new T.InstancedMesh(g,m,crates.length);
      crates.forEach((p,i)=>{p.ii=i;const k=.8+(p.seed*.4);p.base=[k,k*.95,k*.9];this.M4.compose(this.V3.set((p.x0+p.x1)/2,.55,(p.y0+p.y1)/2),this.Q4.setFromAxisAngle(this.V3.clone().set(0,1,0),(p.seed-.5)*.25),this.S3.set(1,1,1));im.setMatrixAt(i,this.M4);im.setColorAt(i,c.setRGB(...p.base));});
      this.add(im,true,true);this.inst.crate={im,list:crates};}
    /* jersey barriers with hazard chevrons */
    const [jc,jx]=mkCanvas(64,256);jx.fillStyle='#9a988f';jx.fillRect(0,0,64,256);for(let i=0;i<300;i++){jx.fillStyle=`rgba(0,0,0,${Math.random()*.1})`;jx.fillRect(Math.random()*64,Math.random()*256,3,3);}
    for(let i=0;i<256;i+=32){jx.fillStyle=(i/32)%2?'#1a1814':'#e2a420';jx.fillRect(18,i,28,32);}
    const sh=new T.Shape();sh.moveTo(-.35,0);sh.lineTo(.35,0);sh.lineTo(.35,.12);sh.lineTo(.22,.3);sh.lineTo(.15,.95);sh.lineTo(-.15,.95);sh.lineTo(-.22,.3);sh.lineTo(-.35,.12);sh.lineTo(-.35,0);
    const bars=P.filter(p=>p.kind==='barrier');
    if(bars.length){const g=K(new T.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false}));g.translate(0,0,-.5);g.rotateY(Math.PI/2);
      const tJ=K(canTex(jc));tJ.repeat.set(1,1);
      const m=K(new T.MeshStandardMaterial({map:tJ,roughness:.85,metalness:0}));const im=new T.InstancedMesh(g,m,bars.length);
      bars.forEach((p,i)=>{p.ii=i;p.base=[1,1,1];this.setBar(im,p,1);});this.add(im,true,true);this.inst.bar={im,list:bars};}
    /* barrels: red ones explode, blue ones don't */
    const mkB=(base,band)=>{const [bc,bx]=mkCanvas(128,64);bx.fillStyle=base;bx.fillRect(0,0,128,64);for(const y of [14,48]){bx.fillStyle='rgba(0,0,0,.35)';bx.fillRect(0,y,128,3);bx.fillStyle='rgba(255,255,255,.15)';bx.fillRect(0,y+3,128,1);}
      if(band){bx.fillStyle='#ffd228';bx.fillRect(0,24,128,16);bx.fillStyle='#1a1814';for(let i=0;i<128;i+=16)bx.fillRect(i+4,27,6,10);}
      for(let i=0;i<30;i++){bx.fillStyle=`rgba(60,30,10,${Math.random()*.3})`;bx.fillRect(Math.random()*128,Math.random()*64,2+Math.random()*10,2+Math.random()*6);}return K(canTex(bc));};
    for(const [kind,col,band] of [[0,'#c82e1e',1],[1,'#2878c8',0]]){const list=P.filter(p=>p.kind==='barrel'&&p.c===kind);if(!list.length)continue;
      const g=K(new T.CylinderGeometry(.45,.45,1.05,16,1)),m=K(new T.MeshStandardMaterial({map:mkB(col,band),roughness:.5,metalness:.3})),mt=K(new T.MeshStandardMaterial({color:col,roughness:.5,metalness:.35}));
      const im=new T.InstancedMesh(g,[m,mt,mt],list.length);list.forEach((p,i)=>{p.ii=i;p.base=[1,1,1];this.M4.makeTranslation(p.cx,.525,p.cy);im.setMatrixAt(i,this.M4);im.setColorAt(i,c.setRGB(1,1,1));});
      this.add(im,true,true);this.inst['barrel'+kind]={im,list};}
  },
  setCont(im,p,crushed){
    const horiz=p.x1-p.x0>p.y1-p.y0,ang=horiz?0:Math.PI/2,cx=(p.x0+p.x1)/2,cy=(p.y0+p.y1)/2;
    if(!crushed){this.M4.compose(this.V3.set(cx,1.3,cy),this.Q4.setFromAxisAngle(new T.Vector3(0,1,0),ang),this.S3.set(1,1,1));}
    else{const e=new T.Euler((p.seed-.5)*.2,ang+(p.seed-.5)*.3,(p.seed-.5)*.25);this.M4.compose(this.V3.set(cx,.55,cy),this.Q4.setFromEuler(e),this.S3.set(.96,.42,.86));}
    im.setMatrixAt(p.ii,this.M4);const k=crushed?.22:p.hp<p.max*.5?.62:1,f=p.hit>0?1.8:1;im.setColorAt(p.ii,new T.Color(p.base[0]*k*f,p.base[1]*k*f,p.base[2]*k*f));
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
  },
  setBar(im,p,sy){const horiz=p.x1-p.x0>p.y1-p.y0,len=horiz?p.x1-p.x0:p.y1-p.y0;
    this.M4.compose(this.V3.set((p.x0+p.x1)/2,0,(p.y0+p.y1)/2),this.Q4.setFromAxisAngle(new T.Vector3(0,1,0),horiz?0:Math.PI/2),this.S3.set(len,sy,horiz?(p.y1-p.y0)/.7:(p.x1-p.x0)/.7));
    im.setMatrixAt(p.ii,this.M4);im.setColorAt(p.ii,new T.Color(1,1,1));im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;},
  lampPosts(Wd,th){
    const K=this.keep.bind(this),list=Wd.props.filter(p=>p.kind==='lamp');this.lamps=list;if(!list.length)return;
    const n=list.length;
    const pole=new T.InstancedMesh(K(new T.CylinderGeometry(.07,.1,1,8).translate(0,.5,0)),K(new T.MeshStandardMaterial({color:0x44464e,roughness:.5,metalness:.8})),n);
    const arm=new T.InstancedMesh(K(new T.BoxGeometry(1,1,1).translate(.5,0,0)),K(new T.MeshStandardMaterial({color:0x44464e,roughness:.5,metalness:.8})),n);
    const headM=K(new T.MeshStandardMaterial({color:0x202024,roughness:.4,metalness:.6,emissive:0xffffff,emissiveIntensity:1}));
    headM.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance=vColor.rgb*3.5;');};
    const headI=new T.InstancedMesh(K(new T.BoxGeometry(.46,.14,.26)),headM,n);
    const cg=K(new T.CylinderGeometry(.14,2.3,4.0,20,1,true).translate(0,-2.0,0));
    const cm=K(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false,uniforms:{uC:{value:new T.Color(...th.lamp)}},
      vertexShader:`varying float vY;varying vec3 vN;varying vec3 vV;
#include <common>
void main(){vY=position.y;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform vec3 uC;varying float vY;varying vec3 vN;varying vec3 vV;void main(){float a=smoothstep(-4.,0.,vY)*pow(1.-abs(dot(vN,vV)),1.2)*.16;gl_FragColor=vec4(uC*a,1.);}`}));
    const cone=new T.InstancedMesh(cg,cm,n);
    list.forEach((p,i)=>{p.ii=i;p.fall=null;});
    for(const im of [pole,arm,headI])this.add(im,true,true);this.add(cone);cone.renderOrder=6;
    this.inst.lamp={pole,arm,head:headI,cone,list,col:th.lamp};
    for(const p of list)this.setLamp(p);
  },
  setLamp(p){
    const L=this.inst.lamp,i=p.ii,M=this.M4,base=new T.Vector3(p.cx,0,p.cy);
    let q=new T.Quaternion();if(p.fall){const t=clamp(p.fall.t/.7,0,1),e=t*t;q.setFromAxisAngle(p.fall.ax,e*(Math.PI/2-.08));}
    M.compose(base,q,new T.Vector3(1,4.2,1));L.pole.setMatrixAt(i,M);
    const top=new T.Vector3(0,4.2,0).applyQuaternion(q).add(base);
    const qa=q.clone();M.compose(top.clone().add(new T.Vector3(0,-.03,0).applyQuaternion(q)),qa,new T.Vector3(.45,.06,.06));L.arm.setMatrixAt(i,M);
    const hp=new T.Vector3(.45,-.04,0).applyQuaternion(q).add(top);M.compose(hp,q,new T.Vector3(1,1,1));L.head.setMatrixAt(i,M);
    const on=!p.dead,col=L.col;L.head.setColorAt(i,on?new T.Color(col[0],col[1],col[2]):new T.Color(0,0,0));
    if(on){M.compose(hp.clone().add(new T.Vector3(0,-.06,0)),new T.Quaternion(),new T.Vector3(1,1,1));}else M.makeScale(0,0,0);L.cone.setMatrixAt(i,M);
    for(const k of ['pole','arm','head','cone']){L[k].instanceMatrix.needsUpdate=true;if(L[k].instanceColor)L[k].instanceColor.needsUpdate=true;}
  },
  /* the light map: lamp pools, red gate lamps and neon, minus anything that's been shot out */
  paintLights(){
    const [c,x]=this.lmc,s=8,th=WORLD.th;x.globalCompositeOperation='source-over';x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='lighter';
    for(const L of WORLD.lamps){if(L.dead)continue;const col=L.col||(L.gate?[1.1,.2,.15]:th.lamp),rad=(L.rad||(L.gate?3.2:7.5))*s,k=(L.gate?.9:1.25)*(L.kind==='neon'?.8:1)*(L.kind==='lamp'?1.15:1);
      const gr=x.createRadialGradient(L.cx*s+(L.gate?0:.45*s),L.cy*s,0,L.cx*s,L.cy*s,rad);
      const cc=a=>`rgba(${c255(col[0]*k*200)},${c255(col[1]*k*200)},${c255(col[2]*k*200)},${a})`;if(L.kind==='flood'){gr.addColorStop(0,cc(.5));gr.addColorStop(.5,cc(.25));gr.addColorStop(1,cc(0));x.fillStyle=gr;x.beginPath();x.arc(L.cx*s,L.cy*s,rad,0,TAU);x.fill();continue;}gr.addColorStop(0,cc(1));gr.addColorStop(.35,cc(.55));gr.addColorStop(.7,cc(.16));gr.addColorStop(1,cc(0));
      x.fillStyle=gr;x.beginPath();x.arc(L.cx*s,L.cy*s,rad,0,TAU);x.fill();}
    x.globalCompositeOperation='source-over';this.tL.needsUpdate=true;
  },
  lampOff(p){const ang=Math.atan2(p.cy-PLY.y,p.cx-PLY.x)+rnd(-.5,.5);p.fall={t:0,ax:new T.Vector3(Math.sin(ang),0,-Math.cos(ang)).normalize(),dir:ang,landed:false};this.paintLights();this.setLamp(p);},
  wreck(p){
    const I=this.inst;
    if(p.kind==='cont'&&I.cont)this.setCont(I.cont.im,p,1);
    else if(p.kind==='crate'&&I.crate){this.M4.makeScale(0,0,0);I.crate.im.setMatrixAt(p.ii,this.M4);I.crate.im.instanceMatrix.needsUpdate=true;FX.planks(p);}
    else if(p.kind==='barrier'&&I.bar)this.setBar(I.bar.im,p,.32);
    else if(p.kind==='barrel'){const B=I['barrel'+p.c];if(B){this.M4.compose(this.V3.set(p.cx,.14,p.cy),this.Q4.setFromEuler(new T.Euler(rnd(-.3,.3),0,rnd(-.3,.3))),this.S3.set(1.12,.26,1.12));B.im.setMatrixAt(p.ii,this.M4);B.im.setColorAt(p.ii,new T.Color(.15,.12,.1));B.im.instanceMatrix.needsUpdate=true;B.im.instanceColor.needsUpdate=true;}}
  },
  update(dt){
    if(!WORLD)return;const I=this.inst;
    for(const k of ['cont','crate','bar','barrel0','barrel1']){const B=I[k];if(!B)continue;let dirty=false;
      for(const p of B.list){if(p.hit>0){p.hit--;p.wasHit=1;dirty=true;}else if(p.wasHit){p.wasHit=0;dirty=true;}
        if(!dirty||p.dead&&k!=='cont')continue;
        if(k==='cont')this.setCont(B.im,p,p.dead);else{const f=p.hit>0?1.8:p.hp<p.max*.5?.7:1;B.im.setColorAt(p.ii,new T.Color(p.base[0]*f,p.base[1]*f,p.base[2]*f));}}
      if(dirty&&B.im.instanceColor)B.im.instanceColor.needsUpdate=true;}
    if(I.lamp)for(const p of I.lamp.list){if(!p.fall||p.fall.landed)continue;p.fall.t+=dt;this.setLamp(p);
      if(p.fall.t>=.7){p.fall.landed=true;const d=p.fall.dir;shakeIt(.12);dustAt(p.cx+Math.cos(d)*3.6,p.cy+Math.sin(d)*3.6,10,.4);sparks(p.cx+Math.cos(d)*4.1,p.cy+Math.sin(d)*4.1,.3,12,[255,220,140]);}}
    if(I.warn&&FRAME%8===0){const im=I.warn.im;I.warn.list.forEach((w,i)=>{const on=((FRAME>>4)+i)%3===0;im.setColorAt(i,on?new T.Color(4,.3,.15):new T.Color(.25,.03,.02));});if(im.instanceColor)im.instanceColor.needsUpdate=true;}
    if(I.bulbs&&FRAME%6===0){const im=I.bulbs.im;I.bulbs.list.forEach((b,i)=>{const on=((FRAME>>3)+(i>>1))%2===0;im.setColorAt(i,on?new T.Color(5,.35,.15):new T.Color(.4,.04,.02));});im.instanceColor.needsUpdate=true;}
    if(I.beacons&&FRAME%10===0&&I.beacons.n){const im=I.beacons.im;for(let i=0;i<I.beacons.n;i++){const on=((FRAME/10|0)+i*3)%7<2;im.setColorAt(i,on?new T.Color(6,.5,.25):new T.Color(.5,.05,.03));}im.instanceColor.needsUpdate=true;}
    for(const n of this.neons){const on=((FRAME>>3)+n.c)%11!==0;const k=on?4:1.2;n.mat.color.setRGB(n.col[0]*k,n.col[1]*k,n.col[2]*k);}
    if(this.waterMat){this.waterMat.uniforms.uT.value=G.t;this.waterMat.uniforms.uCam.value.copy(camera.position);}
  }
};
/* ---------- per-theme look: sky, fog, key light, fill, environment reflections ---------- */
const THEME3={
  sky:null,env:null,
  set(th){
    const dock=th.id==='docks';
    const fogC=dock?new T.Color(.01,.016,.04):new T.Color(.045,.024,.03);
    scene.fog=new T.Fog(fogC,dock?34:36,dock?115:118);
    hemi.color.setRGB(...(dock?[.32,.42,.85]:[.62,.5,.62]));hemi.groundColor.setRGB(...(dock?[.05,.06,.1]:[.16,.1,.07]));hemi.intensity=dock?.62:.6;HEMIK=hemi.intensity;
    /* the key light (with the shadows) is the big floodlight on the north-west tower at the yard, north-east at the docks */
    sun.color.setRGB(...(dock?[.7,.82,1]:[1,.74,.46]));sun.intensity=dock?1.7:2.3;SUNDIR=dock?[.5,.78,-.38]:[-.52,.74,-.42];GRADE.set(dock);
    head.color.setRGB(...(dock?[.62,.78,1]:[1,.85,.62]));
    if(!this.sky){const g=new T.SphereGeometry(200,32,16);this.skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{uH:{value:new T.Color()},uTop:{value:new T.Color()},uSun:{value:new T.Vector3()},uSC:{value:new T.Color()},uStars:{value:0},uT:{value:0}},
      vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.9999;}`,
      fragmentShader:`uniform vec3 uH,uTop,uSC,uSun;uniform float uStars,uT;varying vec3 vD;
float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
void main(){float y=clamp(vD.y,0.,1.);vec3 c=mix(uH,uTop,pow(y,.55));float s=max(0.,dot(vD,normalize(uSun)));c+=uSC*(pow(s,8.)*.6+pow(s,90.)*3.);
vec3 q=floor(vD*260.);float st=step(.9975,h(q))*uStars*smoothstep(.05,.4,vD.y)*(.6+.4*sin(uT*2.+h(q+1.)*30.));c+=vec3(st);gl_FragColor=vec4(c,1.);}`});
      this.sky=new T.Mesh(g,this.skyMat);this.sky.renderOrder=-10;this.sky.frustumCulled=false;scene.add(this.sky);}
    const u=this.skyMat.uniforms;
    if(dock){u.uH.value.setRGB(.03,.05,.13);u.uTop.value.setRGB(.002,.003,.012);u.uSC.value.setRGB(.05,.08,.2);u.uStars.value=1;}
    else{u.uH.value.setRGB(.26,.07,.04);u.uTop.value.setRGB(.008,.006,.022);u.uSC.value.setRGB(.9,.35,.12);u.uStars.value=.7;}
    u.uSun.value.set(dock?.3:-.9,.06,dock?-.9:.15);
    scene.background=null;
    this.mkEnv(dock);
  },
  /* a small studio of coloured panels, blurred into reflections for every metal surface */
  mkEnv(dock){
    if(!OK3D)return;
    const es=new T.Scene(),g=new T.SphereGeometry(10,24,12),m=new T.ShaderMaterial({side:T.BackSide,uniforms:{a:{value:new T.Color()},b:{value:new T.Color()}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 a,b;varying vec3 vP;void main(){float y=normalize(vP).y;gl_FragColor=vec4(mix(b,a,smoothstep(-.3,.6,y)),1.);}'});
    m.uniforms.a.value.setRGB(...(dock?[.05,.08,.18]:[.35,.18,.12]));m.uniforms.b.value.setRGB(...(dock?[.01,.01,.02]:[.05,.03,.025]));
    es.add(new T.Mesh(g,m));
    const pan=(x,y,z,w,h,c)=>{const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(...c),side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);es.add(p);};
    if(dock){pan(-6,3,4,3,1,[.15,1.6,2.6]);pan(6,2,-3,4,1,[2.6,.35,1.3]);pan(0,8,0,6,6,[.12,.16,.32]);pan(4,1,6,2,1,[.15,1.8,1.8]);}
    else{pan(-7,2,3,6,2,[1.8,.9,.35]);pan(0,8,0,6,6,[.3,.22,.28]);pan(6,2,-4,3,1,[.9,.55,.25]);}
    const pm=new T.PMREMGenerator(renderer);if(this.env)this.env.dispose();this.env=pm.fromScene(es,.02).texture;pm.dispose();
    scene.environment=this.env;g.dispose();m.dispose();
  }
};
