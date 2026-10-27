/* ===================== ships: every hull is built from placed primitives ===================== */
const MT={
  hull:mat('#c9ccd6'),hull2:mat('#8a90a0'),dark:mat('#3a3e4c'),black:mat('#1c1e26'),glass:mat('#2a6a9a'),amber:mat('#e8952a'),blue:mat('#2e6ad0'),
  red:mat('#b8262a'),red2:mat('#e0423a'),gun:mat('#55596a'),yellow:mat('#e0b020'),olive:mat('#6a7044'),bone:mat('#b0a890'),purple:mat('#5a3478'),rust:mat('#8a5434'),
  rock1:mat('#7a6c5e'),rock2:mat('#5e5a58'),rock3:mat('#8a7a64'),ice:mat('#9ab4c8'),
  eng:mat('#7ad8ff',{emi:1}),engE:mat('#9aff6a',{emi:1}),engR:mat('#ff7a3a',{emi:1}),win:mat('#ffd890',{emi:1}),winC:mat('#8ae8ff',{emi:1}),eyeR:mat('#ff3a2a',{emi:1}),
  shieldE:mat('#5af0ff',{emi:1}),core:mat('#ff6a2a',{emi:1,glow:1.15}),coreW:mat('#fff0c0',{emi:1}),beamE:mat('#b0ff6a',{emi:1}),
  torp:mat('#ff4a3a',{emi:1}),mis:mat('#e8eaf0'),gold:mat('#d8b050')
};
const PI=Math.PI,HP=PI/2;
function build(fn){const M=mesh(),mats=[];const m=k=>{let i=mats.indexOf(MT[k]);if(i<0){mats.push(MT[k]);i=mats.length-1;}return i;};fn(M,m);return bake(M,mats);}
const MESH={};
/* ---- the player's LANCE and the allied SPARROW share a frame ---- */
function lanceFrame(M,m,c1,c2,engm){
  add(M,gFrustum(1.15,.9,.32,.34,.1),m(c1),{s:[1,1,6.2],p:[0,0,.6]});
  add(M,gFrustum(.62,.38,.3,.18,-.05),m('glass'),{s:[1,1,1.6],p:[0,.95,2.2]});
  add(M,gFrustum(1.4,.7,1.1,.55),m(c2),{s:[1,1,1.8],p:[0,-.1,-4.3]});
  add(M,gFrustum(2.6,.14,.8,.07,0,1.6),m(c1),{s:[1,1,3.2],p:[3.6,-.15,-1.2],r:[0,HP,0],mx:1});
  add(M,gFrustum(.5,.12,.2,.05,.0,.9),m(c2),{s:[1,1,1.2],p:[4.2,-.05,-.4],r:[0,HP,0],mx:1});
  add(M,gCyl(6,.22,.18),m('gun'),{s:[1,1,2.4],p:[6.8,-.15,.4],mx:1});
  add(M,gCyl(8,.75,.62),m('dark'),{s:[1,1,1.1],p:[1.05,-.1,-5.6],mx:1});
  add(M,gCyl(8,.56,.56,true),m(engm),{s:[1,1,.08],p:[1.05,-.1,-6.75],mx:1});
  add(M,gFrustum(.12,.9,.06,.4,.4),m(c2),{s:[1,1,1.4],p:[0,1.1,-4.6],r:[-.3,0,0]});
}
MESH.lance=build((M,m)=>lanceFrame(M,m,'hull','amber','eng'));
MESH.sparrow=build((M,m)=>lanceFrame(M,m,'hull2','blue','eng'));
/* ---- DART: the enemy line fighter, a ball cockpit between forward prongs ---- */
MESH.dart=build((M,m)=>{
  add(M,gSphere(0),m('dark'),{s:[1.5,1.3,2.0]});
  add(M,gFrustum(.36,.5,.1,.16,-.1),m('gun'),{s:[1,1,2.6],p:[1.7,0,2.0],mx:1});
  add(M,gFrustum(.12,2.2,.06,1.0,.6),m('black'),{s:[1,1,1.8],p:[2.6,.2,-.6],r:[0,0,.25],mx:1});
  add(M,gFrustum(.12,1.6,.06,.7,-.4),m('red'),{s:[1,1,1.2],p:[2.75,-1.6,-.9],r:[0,0,-.4],mx:1});
  add(M,gFrustum(.45,.3,.22,.15),m('eyeR'),{s:[1,1,.3],p:[0,.1,1.95]});
  add(M,gCyl(6,.55,.45),m('engE'),{s:[1,1,.12],p:[0,0,-2.0]});
});
MESH.ace=build((M,m)=>{
  add(M,gSphere(0),m('red'),{s:[1.5,1.3,2.0]});
  add(M,gFrustum(.36,.5,.1,.16,-.1),m('black'),{s:[1,1,2.8],p:[1.7,0,2.1],mx:1});
  add(M,gFrustum(.12,2.4,.06,1.1,.7),m('red2'),{s:[1,1,2.0],p:[2.7,.2,-.6],r:[0,0,.25],mx:1});
  add(M,gFrustum(.12,1.7,.06,.7,-.4),m('black'),{s:[1,1,1.3],p:[2.85,-1.7,-.9],r:[0,0,-.4],mx:1});
  add(M,gFrustum(.45,.3,.22,.15),m('eyeR'),{s:[1,1,.3],p:[0,.1,1.95]});
  add(M,gCyl(6,.55,.45),m('engR'),{s:[1,1,.12],p:[0,0,-2.0]});
});
/* ---- WASP: a long needle with four small blades ---- */
MESH.wasp=build((M,m)=>{
  add(M,gFrustum(.8,.8,.15,.15),m('yellow'),{s:[1,1,5.2],p:[0,0,.4]});
  add(M,gFrustum(.9,.9,.8,.8),m('black'),{s:[1,1,1.0],p:[0,0,-4.3]});
  for(const a of [.785,2.356,-.785,-2.356])add(M,gFrustum(.08,1.6,.04,.5,0,0),m(a>0?'black':'yellow'),{s:[1,1,1.6],p:[Math.cos(a)*2,Math.sin(a)*2,-2.6],r:[0,0,a-HP]});
  add(M,gFrustum(.3,.3,.18,.18),m('eyeR'),{s:[1,1,.2],p:[0,.45,2.6]});
  add(M,gCyl(6,.7,.7),m('engE'),{s:[1,1,.1],p:[0,0,-5.35]});
});
/* ---- HAMMER: a slab bomber with twin torpedo pods ---- */
MESH.hammer=build((M,m)=>{
  add(M,gFrustum(3.2,1.2,2.2,.9,-.2),m('olive'),{s:[1,1,5]});
  add(M,gFrustum(1.2,.8,.7,.5,.2),m('dark'),{s:[1,1,1.6],p:[0,1.2,2.4]});
  add(M,gFrustum(.7,.32,.5,.24),m('glass'),{s:[1,1,.6],p:[0,1.3,4.1]});
  add(M,gCyl(8,1.1,.9),m('gun'),{s:[1,1,4.2],p:[3.9,-.4,-.2],mx:1});
  add(M,gCone(8),m('red'),{s:[.9,.9,1.2],p:[3.9,-.4,5.1],mx:1});
  add(M,gCyl(8,.9,.9),m('engE'),{s:[1,1,.1],p:[3.9,-.4,-4.5],mx:1});
  add(M,gFrustum(1.5,.12,.6,.06,0,1),m('olive'),{s:[1,1,2.2],p:[6.2,-.3,-1.6],r:[0,HP,0],mx:1});
});
/* ---- VIPER: the enemy ace, crescent wings and a long black spine ---- */
MESH.viper=build((M,m)=>{
  add(M,gFrustum(1.0,.8,.2,.25,.1),m('black'),{s:[1,1,7.5],p:[0,0,.5]});
  add(M,gFrustum(.5,.32,.22,.14),m('eyeR'),{s:[1,1,1.1],p:[0,.72,3.4]});
  for(let i=0;i<4;i++){const a=.35+i*.28;add(M,gFrustum(1.5-i*.25,.14,1.0-i*.2,.08),m(i%2?'red':'black'),{s:[1,1,1.1],p:[2.0+i*1.9,-.1+i*.2,1.2-i*1.5],r:[0,HP-a*.4,0],mx:1});}
  add(M,gFrustum(.14,1.6,.06,.5,.4),m('red'),{s:[1,1,2],p:[0,1.3,-5],r:[-.4,0,0]});
  add(M,gCyl(8,.9,.8),m('dark'),{s:[1,1,1.6],p:[1.1,0,-6.4],mx:1});
  add(M,gCyl(8,.72,.72),m('engR'),{s:[1,1,.1],p:[1.1,0,-8.05],mx:1});
});
MESH.missile=build((M,m)=>{add(M,gCyl(6,.18,.12),m('mis'),{s:[1,1,1.2]});add(M,gCone(6),m('red2'),{s:[.13,.13,.3],p:[0,0,1.45]});add(M,gFrustum(.05,.5,.03,.2),m('gun'),{s:[1,1,.4],p:[0,0,-1],mx:0});});
MESH.torp=build((M,m)=>{add(M,gSphere(0),m('torp'),{s:[.9,.9,1.8]});add(M,gCyl(6,.4,.3),m('dark'),{s:[1,1,.8],p:[0,0,-2]});});
/* ---- asteroids: six lumpy icospheres ---- */
MESH.rocks=[];for(let i=0;i<6;i++)MESH.rocks.push(build((M,m)=>add(M,gSphere(1,.38,i*7.3+1),m(['rock1','rock2','rock3','rock1','ice','rock2'][i]))));
/* ---- capital ships: hull boxes double as collision volumes ---- */
function capBuild(fn){const boxes=[];const M=mesh(),mats=[];const m=k=>{let i=mats.indexOf(MT[k]);if(i<0){mats.push(MT[k]);i=mats.length-1;}return i;};
  const box=(p,s,k,col=true,prim)=>{add(M,prim||PRIM.box,m(k),{p,s});if(col)boxes.push({c:p,h:s});};
  const win=(x0,x1,y,z,step,k='win',side=1)=>{for(let x=x0;x<x1;x+=step)add(M,PRIM.box,m(k),{p:[x,y,z],s:[step*.3,.5,.3]});};
  fn(M,m,box,win,boxes);const mesh2=bake(M,mats);mesh2.boxes=boxes;return mesh2;}
MESH.freighter=capBuild((M,m,box)=>{
  box([0,0,0],[4,4,40],'hull2');box([0,6,30],[6,4,8],'dark');add(M,PRIM.box,m('winC'),{p:[0,7,38.2],s:[4,.8,.3]});
  for(let i=0;i<6;i++)for(const [x,y] of [[-9,0],[9,0],[0,9],[0,-9]]){if(y>0&&i>4)continue;box([x,y,-26+i*10],[4.4,4.4,4.4],['rust','blue','olive','hull2','yellow'][(i+x+y+50)%5]);}
  box([0,0,-46],[9,7,6],'dark');for(const x of [-5,5])add(M,gCyl(8,3,3),m('eng'),{p:[x,0,-52.3],s:[1,1,.3]});
});
MESH.carrier=capBuild((M,m,box,win,boxes)=>{
  box([0,0,0],[60,14,300],'hull2');box([0,-16,60],[45,4,200],'dark');box([0,16,-40],[52,3,240],'hull');
  box([40,40,-60],[10,24,40],'hull');box([40,66,-70],[14,4,22],'dark');add(M,PRIM.box,m('winC'),{p:[40,66,-47.7],s:[11,1.4,.4]});
  add(M,gFrustum(60,14,22,8),m('hull2'),{p:[0,0,330],s:[1,1,30]});boxes.push({c:[0,0,330],h:[42,11,30]});
  for(let i=0;i<6;i++){box([(i%3-1)*36,(i<3?-1:1)*8,-312],[14,8,12],'dark');add(M,gCyl(10,11,11),m('eng'),{p:[(i%3-1)*36,(i<3?-1:1)*8,-325],s:[1,1,.6]});}
  for(let z=-250;z<280;z+=34){add(M,PRIM.box,m('win'),{p:[60.4,4,z],s:[.3,1,8]});add(M,PRIM.box,m('win'),{p:[-60.4,4,z],s:[.3,1,8]});add(M,PRIM.box,m('win'),{p:[60.4,-6,z+16],s:[.3,1,5]});add(M,PRIM.box,m('win'),{p:[-60.4,-6,z+16],s:[.3,1,5]});}
  for(let z=-260;z<260;z+=26)add(M,PRIM.box,m('amber'),{p:[0,19.2,z],s:[1.2,.2,5]});
});
/* frigate MALICE: mount points for its subsystems are returned with the mesh */
MESH.frigate=capBuild((M,m,box,win,boxes)=>{
  add(M,gFrustum(34,12,6,5,-2),m('dark'),{p:[0,0,40],s:[1,1,150]});boxes.push({c:[0,0,0],h:[26,11,120]},{c:[0,0,150],h:[12,7,40]});
  box([0,16,-40],[18,6,60],'gun');box([0,26,-70],[10,6,20],'black');box([0,-14,-30],[22,4,70],'gun');
  for(const x of [-22,22]){box([x,0,-128],[10,9,22],'black');add(M,gCyl(10,7,7),m('engE'),{p:[x,0,-151],s:[1,1,.6]});}
  for(let z=-90;z<100;z+=30){add(M,PRIM.box,m('eyeR'),{p:[26.3,-2,z],s:[.3,.8,6]});add(M,PRIM.box,m('eyeR'),{p:[-26.3,-2,z],s:[.3,.8,6]});}
  add(M,gFrustum(3,30,1,16,-6),m('red'),{p:[0,12,-110],s:[1,1,20],r:[-.2,0,0]});
});
MESH.frigate.mounts={turrets:[[16,13,60],[-16,13,60],[14,23,-20],[-14,23,-20],[0,-19,30],[0,-19,-60]],gen:[0,33,-70],bridge:[0,28,-30],engines:[[-22,0,-128],[22,0,-128]]};
/* LEVIATHAN: a twelve-hundred-metre dagger */
MESH.levi=capBuild((M,m,box,win,boxes)=>{
  add(M,gFrustum(90,26,10,6,-6),m('dark'),{p:[0,0,200],s:[1,1,420]});boxes.push({c:[0,0,-100],h:[72,24,300]},{c:[0,-2,300],h:[42,14,200]},{c:[0,-4,520],h:[16,8,100]});
  box([0,34,-120],[24,10,240],'gun');box([0,52,-260],[16,10,60],'black');
  box([0,-30,-80],[60,6,200],'gun');
  for(const x of [-60,0,60]){box([x,0,-438],[22,18,22],'black');add(M,gCyl(12,15,15),m('engE'),{p:[x,0,-462],s:[1,1,.8]});}
  for(let z=-380;z<420;z+=40){add(M,PRIM.box,m('beamE'),{p:[84-(z+220)*.12,-6,z],s:[.6,.9,10]});add(M,PRIM.box,m('beamE'),{p:[-84+(z+220)*.12,-6,z],s:[.6,.9,10]});}
  for(let z=-340;z<60;z+=24)add(M,PRIM.box,m('eyeR'),{p:[0,44.4,z],s:[3,.3,4]});
  add(M,gCyl(10,9,6),m('black'),{p:[0,-6,640],s:[1,1,30]});
});
MESH.levi.mounts={gens:[[78,25,-210],[-78,25,-210],[54,25,120],[-54,25,120]],
  turrets:[[40,30,-300],[-40,30,-300],[36,30,-40],[-36,30,-40],[28,22,200],[-28,22,200],[0,-38,-200],[0,-38,40],[60,-30,-260],[-60,-30,-260],[16,12,420],[-16,12,420]],
  vents:[[0,45,-200],[0,45,-90],[0,45,20]],core:[0,-44,-120],beam:[0,-6,672],hangars:[[82,-10,-60],[-82,-10,-60]]};
/* subsystems */
MESH.turretBase=build((M,m)=>{add(M,gCyl(8,4,3.2),m('gun'),{s:[1,1,1.4],r:[HP,0,0],p:[0,1.2,0]});add(M,gSphere(0),m('dark'),{s:[3,2,3],p:[0,2.6,0]});});
MESH.turretGun=build((M,m)=>{add(M,gCyl(6,.55,.45),m('black'),{s:[1,1,3.2],p:[1.1,0,3.4],mx:1});add(M,gFrustum(1.8,1.1,1.4,.8),m('red'),{s:[1,1,1.6],p:[0,0,.6]});});
MESH.gen=build((M,m)=>{add(M,gCyl(10,7,6),m('gun'),{s:[1,1,2],r:[HP,0,0],p:[0,2,0]});add(M,gSphere(1),m('shieldE'),{s:[5.5,4,5.5],p:[0,5,0]});add(M,gCyl(10,8.2,8.2),m('dark'),{s:[1,1,.6],r:[HP,0,0],p:[0,3.4,0]});});
MESH.bridge=build((M,m)=>{add(M,PRIM.box,m('black'),{s:[9,6,7],p:[0,6,0]});add(M,PRIM.box,m('win'),{s:[8,1,.3],p:[0,8,7.1]});add(M,PRIM.box,m('dark'),{s:[11,1.5,9],p:[0,12,0]});add(M,gCyl(6,.4,.2),m('gun'),{s:[1,1,6],r:[HP,0,0],p:[4,18,-2]});});
MESH.engineSys=build((M,m)=>{add(M,gCyl(10,8,8),m('engR'),{s:[1,1,.8],p:[0,0,-23]});add(M,PRIM.box,m('gun'),{s:[11,10,3],p:[0,0,-20]});});
MESH.vent=build((M,m)=>{add(M,PRIM.box,m('black'),{s:[12,2,10],p:[0,1,0]});for(let i=0;i<4;i++)add(M,PRIM.box,m('core'),{s:[9,.6,1.2],p:[0,2.4,-6+i*4]});});
MESH.core=build((M,m)=>{add(M,gSphere(1),m('core'),{s:13});for(let i=0;i<6;i++){const a=i/6*TAU;add(M,PRIM.box,m('black'),{s:[1.5,15,1.5],p:[Math.cos(a)*13,0,Math.sin(a)*13]});}add(M,gCyl(12,16,16),m('dark'),{s:[1,1,1.5],r:[HP,0,0],p:[0,12,0]});});
MESH.beamEm=build((M,m)=>{add(M,gCyl(10,8,5),m('gun'),{s:[1,1,14]});add(M,gSphere(0),m('beamE'),{s:5,p:[0,0,15]});});
MESH.beacon=build((M,m)=>{add(M,gCyl(6,1.5,.5),m('gun'),{s:[1,1,12],r:[HP,0,0]});add(M,PRIM.box,m('dark'),{s:[4,1.5,4],p:[0,-12,0]});add(M,gSphere(0),m('eyeR'),{s:1.6,p:[0,13,0]});
  for(const a of [0,2.1,4.2])add(M,gFrustum(.3,3,.15,1),m('hull2'),{s:[1,1,4],p:[Math.cos(a)*4,-8,Math.sin(a)*4],r:[0,a,0]});});

/* ===================== ship classes ===================== */
const SHIPS={
  lance:{name:'LANCE',mesh:'lance',hp:100,sh:100,vmin:25,vmax:165,boost:320,turn:[1.75,1.4,2.7],grip:2.6,r:6,guns:[[6.8,-.15,2.4],[-6.8,-.15,2.4]],bolt:{spd:1300,dmg:10,rate:.1,life:1.25},score:0},
  sparrow:{name:'SPARROW',mesh:'sparrow',hp:260,sh:0,vmin:40,vmax:160,boost:0,turn:[1.25,1.05,2.4],grip:2.4,r:6,guns:[[6.8,-.15,2.4],[-6.8,-.15,2.4]],bolt:{spd:1200,dmg:6,rate:.2,life:1.2},acc:.022,score:0},
  dart:{name:'DART',mesh:'dart',hp:40,sh:0,vmin:50,vmax:150,boost:0,turn:[1.15,1.0,2.2],grip:2.2,r:5,guns:[[1.7,0,4.4],[-1.7,0,4.4]],bolt:{spd:1100,dmg:3.5,rate:.24,life:1.2},acc:.03,score:200},
  wasp:{name:'WASP',mesh:'wasp',hp:24,sh:0,vmin:60,vmax:185,boost:0,turn:[1.55,1.3,3],grip:2.6,r:4.5,guns:[[0,.5,4.5]],bolt:{spd:1200,dmg:3,rate:.18,life:1.1},acc:.032,score:250},
  hammer:{name:'HAMMER',mesh:'hammer',hp:100,sh:0,vmin:40,vmax:105,boost:0,turn:[.7,.6,1.4],grip:1.8,r:8,guns:[[3.9,-.4,6]],bolt:{spd:1000,dmg:5,rate:.5,life:1.2},acc:.05,score:400,torp:1},
  ace:{name:'RED KNIFE',mesh:'ace',hp:130,sh:0,vmin:60,vmax:175,boost:0,turn:[1.55,1.3,3],grip:2.6,r:5,guns:[[1.7,0,4.6],[-1.7,0,4.6]],bolt:{spd:1250,dmg:4,rate:.18,life:1.2},acc:.022,score:1500,miss:1},
  viper:{name:'VIPER',mesh:'viper',hp:700,sh:220,vmin:70,vmax:190,boost:0,turn:[1.75,1.45,3.3],grip:2.8,r:9,guns:[[2,0,5],[-2,0,5]],bolt:{spd:1300,dmg:4,rate:.14,life:1.2},acc:.018,score:12000,miss:1}
};
