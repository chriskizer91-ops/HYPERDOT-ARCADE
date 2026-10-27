setRes(2);resize();addEventListener('resize',resize);
const TH={seed:5,base:[6,5,14],c1:[70,30,110],c2:[30,90,140],band:vnorm([.2,1,.3])};
SUN.dir=vnorm([-.6,.4,.7]);AMBC=[34,28,64];bakeSky(TH);
PLANET.on=true;PLANET.dir=vnorm([.5,-.15,1]);PLANET.ar=.32;
let T=0;
const list=[['lance',[-24,6,60]],['sparrow',[-8,6,60]],['dart',[8,6,60]],['wasp',[24,6,60]],['hammer',[-20,-10,70]],['ace',[0,-10,70]],['viper',[22,-10,70]],['missile',[-30,-2,40]],['torp',[-26,-2,40]],['beacon',[30,-2,50]]];
window.__view=function(t,which){T=t;g.setTransform(1,0,0,1,0,0);
  setView([0,0,0],qid(),W/2,H/2,(W/2)/Math.tan(40*D2R));drawSky();
  const q=qmul(qaxis([0,1,0],T*.8),qaxis([1,0,0],.35));
  if(which==='cap'){const qc=qmul(qaxis([0,1,0],-.8+T*.1),qaxis([1,0,0],.25));drawMesh(MESH.frigate,[0,-20,420],qc);drawMesh(MESH.carrier,[-500,80,1400],qmul(qaxis([0,1,0],1.2),qaxis([1,0,0],.1)));drawMesh(MESH.freighter,[180,40,350],qaxis([0,1,0],2));
    const m=MESH.frigate.mounts;for(const p of m.turrets){const w=vadd([0,-20,420],qrot(qc,p));drawMesh(MESH.turretBase,w,qc);drawMesh(MESH.turretGun,vadd(w,qrot(qc,[0,3,0])),qc);}
    drawMesh(MESH.gen,vadd([0,-20,420],qrot(qc,m.gen)),qc);drawMesh(MESH.bridge,vadd([0,-20,420],qrot(qc,m.bridge)),qc);}
  else if(which==='levi'){const qc=qmul(qaxis([0,1,0],-1.1+T*.1),qaxis([1,0,0],.2));const P=[0,-60,1500];drawMesh(MESH.levi,P,qc);const m=MESH.levi.mounts;
    for(const p of m.gens)drawMesh(MESH.gen,vadd(P,qrot(qc,p)),qc,{s:2.2});for(const p of m.turrets){const w=vadd(P,qrot(qc,p));drawMesh(MESH.turretBase,w,qc,{s:1.6});drawMesh(MESH.turretGun,vadd(w,qrot(qc,[0,4.6,0])),qc,{s:1.6});}
    for(const p of m.vents)drawMesh(MESH.vent,vadd(P,qrot(qc,p)),qc,{s:1.6});drawMesh(MESH.core,vadd(P,qrot(qc,m.core)),qc,{s:1.3});drawMesh(MESH.beamEm,vadd(P,qrot(qc,m.beam)),qc);}
  else if(which==='rocks'){for(let i=0;i<6;i++)drawMesh(MESH.rocks[i],[(i-2.5)*60,0,260],qmul(qaxis([0,1,0],T+i),qaxis([1,0,0],i)),{s:22});}
  else for(const [k,p] of list)drawMesh(MESH[k],p,q,{s:k==='missile'||k==='torp'?2:1});
  sunFlare();
  acx.putImageData(AIMG,0,0);g.drawImage(ac,0,0);present();return TRIS;};
