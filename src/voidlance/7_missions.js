/* ===================== campaign: six missions ===================== */
const THEMES=[
  {sky:{seed:5,base:[6,4,14],c1:[80,30,120],c2:[30,90,150],band:vnorm([.2,1,.3])},sun:vnorm([-.55,.32,.77]),sunC:[255,236,210],amb:[34,26,62],
    planet:{dir:vnorm([.62,-.22,.75]),ar:.36,axis:vnorm([.25,1,.1]),pal:[[196,120,64],[236,186,118],[150,70,44]],atm:[255,170,110],seed:2}},
  {sky:{seed:11,base:[3,8,12],c1:[20,90,110],c2:[60,120,170],band:vnorm([1,.4,.2])},sun:vnorm([.6,.45,.66]),sunC:[230,245,255],amb:[24,40,58],
    planet:{dir:vnorm([-.5,-.35,.8]),ar:.42,axis:vnorm([.1,1,.3]),pal:[[150,190,210],[220,236,245],[90,130,170]],atm:[170,220,255],seed:7}},
  {sky:{seed:23,base:[10,6,4],c1:[120,60,24],c2:[150,90,40],band:vnorm([.1,1,-.4])},sun:vnorm([.2,.25,.95]),sunC:[255,200,150],amb:[50,30,24],size:.07,
    planet:null},
  {sky:{seed:31,base:[10,3,6],c1:[130,24,40],c2:[70,40,120],band:vnorm([.5,1,0])},sun:vnorm([-.7,.5,.5]),sunC:[255,220,200],amb:[48,22,40],
    planet:{dir:vnorm([.4,.15,.9]),ar:.24,axis:vnorm([0,1,.2]),pal:[[60,110,200],[120,170,230],[40,70,140]],atm:[120,180,255],seed:4}},
  {sky:{seed:41,base:[3,4,12],c1:[30,40,120],c2:[90,40,140],band:vnorm([-.3,1,.5])},sun:vnorm([.5,.6,-.6]),sunC:[210,220,255],amb:[26,30,64],
    planet:{dir:vnorm([-.3,-.4,.86]),ar:.5,axis:vnorm([.3,1,0]),pal:[[110,60,150],[170,120,200],[70,40,110]],atm:[200,150,255],seed:9}},
  {sky:{seed:53,base:[3,8,6],c1:[40,110,60],c2:[110,40,130],band:vnorm([0,1,.6])},sun:vnorm([-.3,.7,.65]),sunC:[245,255,240],amb:[28,44,40],
    planet:{dir:vnorm([.55,-.1,.83]),ar:.55,axis:vnorm([-.2,1,.2]),pal:[[90,140,90],[170,200,150],[50,80,60]],atm:[170,255,190],seed:12}}
];
function useTheme(i){const T=THEMES[i];SUN.dir=T.sun;SUN.col=T.sunC;SUN.size=T.size||.035;AMBC=T.amb;SUNC=T.sunC;bakeSky(T.sky);
  if(T.planet){PLANET.on=true;Object.assign(PLANET,T.planet);}else PLANET.on=false;}
/* ---------- spawning ---------- */
function wing(type,team,n,center,dir,gap){const q=qlook(dir,[0,1,0]),r=qR(q),u=qU(q),out=[];
  for(let i=0;i<n;i++){const k=Math.ceil(i/2)*(i%2?1:-1);out.push(mkShip(type,team,vadd(center,vadd(vmul(r,k*gap),vadd(vmul(dir,-Math.abs(k)*gap*.7),vmul(u,rnd(-.3,.3)*gap)))),q));}return out;}
function inbound(type,n,dist,o={}){const P=PL||{pos:[0,0,0],q:qid()},f=qF(P.q);let d=o.dir||vnorm(vadd(vmul(f,o.ahead??.6),vrand(1)));const c=vadd(o.at||P.pos,vmul(d,dist));
  const ws=wing(type,'e',n,c,vnorm(vsub(o.at||P.pos,c)),o.gap||40);for(const w of ws){w.wave=o.wave;if(o.tgt)w.ai.tgt=o.tgt;}return ws;}
function wingmen(){const J=mkShip('sparrow','a',toWorld(PL,[-40,-6,-34]),PL.q,{name:'JUNO',call:'JUNO'});J.ai.form=[-40,-6,-34];
  const R=mkShip('sparrow','a',toWorld(PL,[44,6,-40]),PL.q,{name:'RIX',call:'RIX'});R.ai.form=[44,6,-40];return [J,R];}
function capHealth(C,hp,onDie){C.hpC=hp;C.maxC=hp;C.torpable=true;C.capHit=d=>{if(C.dead||C.dying)return;C.hpC-=d;C.flash=.12;if(C.hpC<=0){C.hpC=0;capDeath(C,4);if(onDie)onDie(C);}};}
function capDeath(C,dur){
  C.dying=true;for(const s of C.subs)if(!s.dead){s.dead=true;fxExplode(s.pos,s.r*2,true);}
  const n=Math.round(dur*5);for(let i=0;i<n;i++)setTimeout0(()=>{const B=pick(C.mesh.boxes),p=toWorld(C,[B.c[0]+rnd(-1,1)*B.h[0],B.c[1]+rnd(-1,1)*B.h[1],B.c[2]+rnd(-1,1)*B.h[2]]);fxExplode(p,rnd(20,46)*(C.r>500?1.6:1),true);},i/n*dur);
  setTimeout0(()=>{fxExplode(C.pos,C.r*.35,true);FX.push({k:'flash',p:C.pos.slice(),t:0,T:.8,r:C.r*1.2});FX.push({k:'ring',p:C.pos.slice(),t:0,T:2.2,r:C.r*2.4,ax:qU(C.q)});for(let i=0;i<40;i++)chunk(vadd(C.pos,vrandIn(C.r*.5)),C.vel,pick(C.mesh.mats),rnd(4,14));C.dead=true;SFX.capboom();G.shake=1;},dur);
}
function addTurrets(C,list,s,hp,flakEvery,dmgK){list.forEach((p,i)=>mkSub(C,'turret',p,{hp,s,r:5*s,flak:flakEvery<0?i%3!==0:i%flakEvery===0,name:'TURRET',range:1300,dmgK:dmgK||1}));}
function alive(list){return list.filter(e=>!e.dead&&!e.dying).length;}
function mmss(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
/* ---------- mission definitions ---------- */
const MISSIONS=[
{name:'FIRST LIGHT',sub:'PATROL',music:'battle',holo:'dart',brief:['A RAIDER PATROL IS PROBING THE FLEET.','LAUNCH FROM HALCYON WITH JUNO AND RIX.','BREAK THE PATROL BEFORE IT REACHES THE CARRIER.','THE LEAD PIP SHOWS WHERE TO SHOOT.'],
 start(M){
  const CV=mkCap('carrier','a',[0,-70,-900],qid(),{name:'HALCYON'});capHealth(CV,2400,()=>missionFail('HALCYON WAS LOST'));addTurrets(CV,[[30,22,200],[-30,22,200],[30,22,-200],[-30,22,-200]],1.2,9999,99);for(const s of CV.subs)s.noTarget=true;M.protect=CV;
  PL=mkShip('lance','a',[0,0,0],qid(),{isPlayer:true});M.wm=wingmen();M.center=[0,0,800];M.radius=4200;M.wave=0;M.cv=CV;
  radio('CMD','Voidlance One, Halcyon. You are clear of the deck.');radio('CMD','Raider patrol inbound. Engage at will.');
  M.next=5;M.obj=()=>['DESTROY THE RAIDERS','WAVE '+M.wave+'/3   '+alive(M.ws||[])+' LEFT','HALCYON '+Math.round(CV.hpC/CV.maxC*100)+'%'];},
 update(M,dt){
  if(M.next>0){M.next-=dt;if(M.next<=0){M.wave++;
    if(M.wave===1)M.ws=inbound('dart',4,2400,{ahead:1});
    else if(M.wave===2){M.ws=inbound('dart',5,2200,{dir:vnorm([1,.15,.4])}).concat(inbound('hammer',1,2600,{dir:vnorm([1,.1,.2])}));radio('JUNO','More coming in from starboard. One bomber.');}
    else{M.ws=inbound('dart',4,2200,{dir:vnorm([-1,-.1,.3])}).concat(inbound('wasp',2,2400,{dir:vnorm([-1,.2,.5])}));radio('RIX','Wasps! Fast ones, watch your six.');}}}
  else if(M.ws&&alive(M.ws)===0){if(M.wave>=3)missionWin();else{M.next=4;radio(M.wave===1?'RIX':'JUNO',M.wave===1?'Splash. That is the first group.':'Clear. Last group on radar.');}}
 }},
{name:'CONVOY',sub:'ESCORT',music:'battle',holo:'hammer',brief:['THREE FREIGHTERS ARE RUNNING FOR THE JUMP POINT.','HAMMER BOMBERS WILL TRY TO TORPEDO THEM.','SHOOT THE TORPEDOES DOWN. THEY ARE SLOW.','KEEP ONE FREIGHTER ALIVE UNTIL THE JUMP.'],
 start(M){
  M.fr=[[-260,0,0],[0,50,-220],[280,-30,40]].map((p,i)=>{const C=mkCap('freighter','a',p,qid(),{name:'FREIGHTER '+'ABC'[i]});C.vel=[0,0,32];capHealth(C,1500,()=>{radio('CMD','We lost freighter '+'ABC'[i]+'!');});return C;});
  PL=mkShip('lance','a',[0,20,-500],qid(),{isPlayer:true});M.wm=wingmen();M.center=[0,0,2400];M.radius=4600;M.T=165;M.ws=[];M.waves=[8,38,70,104,136];
  radio('CMD','Convoy, you are clear to run. Voidlance, keep them breathing.');
  M.obj=()=>['PROTECT THE CONVOY   '+alive(M.fr)+'/3','JUMP IN '+mmss(M.T-M.t)];},
 update(M,dt){
  M.center=vadd(M.fr[0].pos,[0,0,600]);
  if(M.waves.length&&M.t>=M.waves[0]){const k=5-M.waves.length;M.waves.shift();const tg=pick(M.fr.filter(f=>!f.dead));const d=vnorm(vadd([rnd(-1,1),rnd(-.3,.3),rnd(.2,1)],[0,0,0]));
    M.ws=M.ws.concat(inbound('hammer',2+(k>2?1:0),2600,{dir:d,at:tg?tg.pos:PL.pos})).concat(inbound('dart',3+(k>1?1:0),2300,{dir:vnorm(vadd(d,vrand(.6))),at:tg?tg.pos:PL.pos}));
    radio(pick(['JUNO','RIX']),pick(['Bombers inbound!','Contacts, high and fast!','Here they come again.']));}
  if(alive(M.fr)===0)missionFail('THE CONVOY WAS DESTROYED');
  if(M.t>=M.T&&!M.result){M.saved=alive(M.fr);for(const f of M.fr)if(!f.dead){FX.push({k:'flash',p:f.pos.slice(),t:0,T:.6,r:300});f.dead=true;}radio('CMD','Convoy has jumped. Good work, Voidlance.');missionWin(M.fr.filter(f=>f.hpC>0).length*5000);}
 }},
{name:'THE BELT',sub:'AMBUSH',music:'battle2',holo:'beacon',brief:['RAIDERS ARE TRACKING THE FLEET FROM AN ASTEROID BELT.','THREE RELAY BEACONS ARE HIDDEN IN THE ROCKS.','DESTROY THEM. EXPECT WASPS.','BIG ROCKS HURT. SHOOT THEM APART OR FLY AROUND.'],
 start(M){
  const C=[0,0,1900];M.center=C;M.radius=3600;
  for(let i=0;i<78;i++){const p=vadd(C,[rnd(-1700,1700),rnd(-320,320),rnd(-1500,1500)]);if(vdist(p,[0,0,0])<350)continue;const r=Math.random()<.2?rnd(60,120):rnd(12,46);mkRock(p,r);}
  M.bc=[[-600,60,1300],[700,-80,2100],[50,140,2900]].map((p,i)=>{for(const o of ENT)if(o.kind==='rock'&&vdist(o.pos,p)<o.r+60)o.dead=true;return ent({kind:'beacon',team:'e',pos:p,q:qid(),vel:[0,0,0],r:14,hp:220,max:220,mesh:MESH.beacon,name:'RELAY '+(i+1),objective:true});});
  PL=mkShip('lance','a',[0,0,0],qid(),{isPlayer:true});M.wm=wingmen();M.ws=[];M.got=0;
  radio('CMD','Three relays somewhere in that rock. Light them up.');
  M.obj=()=>M.got<3?['DESTROY RELAY BEACONS   '+M.got+'/3',alive(M.ws)?alive(M.ws)+' HOSTILES':'']:['SURVIVE THE AMBUSH',alive(M.ws)+' HOSTILES'];},
 onKill(M,e){if(e.kind==='beacon'){M.got++;const k=M.got;
    if(k===1){M.ws=M.ws.concat(inbound('wasp',3,1600));radio('RIX','Relay down. And that woke something up.');}
    else if(k===2){M.ws=M.ws.concat(inbound('wasp',3,1600)).concat(inbound('dart',2,1900));radio('JUNO','Second relay gone. More wasps!');}
    else{M.ws=M.ws.concat(inbound('wasp',4,1700)).concat(inbound('dart',2,1900));radio('CMD','All relays down. Clear the ambush and come home.');M.final=1;}}},
 update(M,dt){if(M.final&&alive(M.ws)===0)missionWin();if(!M.got&&M.t>40&&!M.hint){M.hint=1;radio('JUNO','Relays show yellow on radar. Follow the diamonds.');}}},
{name:'BROADSIDE',sub:'STRIKE',music:'battle2',holo:'frigate',brief:['THE RAIDER FRIGATE MALICE IS CLOSING ON HALCYON.','ITS BRIDGE IS SHIELDED. KILL THE GENERATOR FIRST.','FLAK TURRETS BURST NEAR YOU. KEEP MOVING.','KILL ITS ENGINES TO STOP ITS ADVANCE.'],
 start(M){
  const CV=mkCap('carrier','a',[0,-90,-1300],qid(),{name:'HALCYON'});capHealth(CV,2600,()=>missionFail('HALCYON WAS LOST'));M.cv=CV;addTurrets(CV,[[30,22,200],[-30,22,200]],1.2,9999,99);for(const s of CV.subs)s.noTarget=true;
  const F=mkCap('frigate','e',[500,20,2900],qaxis([0,1,0],PI-.15),{name:'MALICE'});F.vel=vmul(qF(F.q),14);M.F=F;const mm=MESH.frigate.mounts;
  addTurrets(F,mm.turrets,1.3,120,2);
  M.gen=mkSub(F,'gen',mm.gen,{hp:650,s:1.6,r:6,name:'SHIELD GENERATOR',objective:true});
  M.br=mkSub(F,'bridge',mm.bridge,{hp:950,s:1,r:14,name:'BRIDGE',objective:true});M.br.shielded=()=>!M.gen.dead;
  M.eng=mm.engines.map(p=>mkSub(F,'engine',p,{hp:420,s:1,r:12,name:'ENGINE'}));
  PL=mkShip('lance','a',[0,0,-500],qid(),{isPlayer:true});M.wm=wingmen();M.center=[200,0,900];M.radius=4400;M.ws=inbound('dart',3,2000,{at:F.pos,dir:vnorm([0,.3,-1])});M.next=45;
  radio('CMD','Malice is closing. Take out the shield generator on top.');
  M.obj=()=>[M.gen.dead?'DESTROY THE BRIDGE':'DESTROY THE SHIELD GENERATOR',M.gen.dead?'BRIDGE '+Math.round(M.br.hp/M.br.max*100)+'%':'GENERATOR '+Math.round(M.gen.hp/M.gen.max*100)+'%','HALCYON '+Math.round(CV.hpC/CV.maxC*100)+'%'];},
 onKill(M,e){if(e===M.gen){radio('JUNO','Generator down! The bridge is open!');}if(M.eng.includes(e)&&M.eng.every(x=>x.dead)){M.F.vel=[0,0,0];radio('RIX','Engines gone. She is dead in the water.');}
  if(e===M.br){radio('CMD','Malice is breaking up. Outstanding!');capDeath(M.F,5);missionWin(3000*(M.eng.filter(x=>x.dead).length+1),6);}},
 update(M,dt){
  M.next-=dt;if(M.next<=0&&!M.F.dying){M.next=40;if(alive(M.ws)<8){M.ws=M.ws.concat(inbound('dart',3,600,{at:M.F.pos,dir:vrand(1)}));radio('RIX','Malice is launching fighters.');}}
  const d=vdist(M.F.pos,M.cv.pos);if(!M.F.dying&&d<1700){M.F.vel=[0,0,0];M.bt=(M.bt||0)-dt;if(M.bt<=0){M.bt=.5;const a=toWorld(M.F,[rnd(-20,20),5,60]),b=toWorld(M.cv,[rnd(-40,40),rnd(-10,10),rnd(-200,200)]);BOLTS.push({p:a,prev:a.slice(),v:vmul(vnorm(vsub(b,a)),900),life:2.2,team:'e',dmg:0,owner:M.F,col:TEAMC.e,big:1,capShot:M.cv});M.cv.capHit(14);}
    if(!M.warned){M.warned=1;radio('CMD','Malice is in range and firing on Halcyon! Hurry!');}}
 }},
{name:'RED KNIVES',sub:'DUEL',music:'boss',holo:'viper',brief:['THE RED KNIVES ARE THE RAIDERS BEST PILOTS.','THEIR LEADER VIPER FLIES A HEAVY SHIELDED ACE.','THEY FIRE MISSILES. TURN HARD OR BOOST TO SHAKE THEM.','KILL VIPER AND THE REST WILL BREAK.'],
 start(M){
  PL=mkShip('lance','a',[0,0,0],qid(),{isPlayer:true});M.wm=wingmen();M.center=[0,0,1200];M.radius=4400;
  M.ws=inbound('ace',4,2300,{ahead:1,gap:60});M.k=0;
  radio('VIPER','Little lance. Fly home while you still can.');
  M.obj=()=>M.V?['DESTROY VIPER','VIPER '+Math.round((M.V.hp+M.V.sh)/(M.V.max+M.V.shMax)*100)+'%']:['DESTROY THE RED KNIVES   '+M.k+'/4'];},
 onKill(M,e){if(e.type==='ace'&&!M.V){M.k++;if(M.k===2){M.V=inbound('viper',1,2200)[0];M.V.agg=1.2;radio('VIPER','Enough. I will do this myself.');}}
  if(e===M.V){radio('JUNO','Viper is down! The knives are scattering!');for(const a of M.ws)if(!a.dead){a.ai.st='extend';a.ai.t=99;a.ai.ext=vnorm(vsub(a.pos,PL.pos));setTimeout0(()=>{if(!a.dead){a.dead=true;}},6);}missionWin(8000,4);}},
 update(M,dt){const V=M.V;if(V&&!V.dead){if(!M.h50&&V.hp<V.max*.5){M.h50=1;M.ws=M.ws.concat(inbound('ace',2,1800));radio('VIPER','Knives, to me!');}
   if(V.sh<=0&&!M.shd){M.shd=1;radio('RIX','Her shield is down. Pour it on!');}
   if(!V.dead&&V.sh<V.shMax){V.shT-=dt;if(V.shT<=0)V.sh=Math.min(V.shMax,V.sh+dt*10);}}
  if(G.incoming&&!M.mw){M.mw=1;radio('JUNO','Missile on you! Turn hard or boost!');}}},
{name:'LEVIATHAN',sub:'FINAL',music:'boss',holo:'levi',brief:['THE LEVIATHAN HAS COME FOR HALCYON.','ITS MAIN BEAM FIRES ABOUT ONCE A MINUTE.','BREAK THE FOUR SHIELD GENERATORS, THEN THE VENTS.','THEN THE CORE BENEATH. KILL THE BEAM EMITTER TO SAVE THE CARRIER.'],
 start(M){
  const CV=mkCap('carrier','a',[0,-120,-1700],qid(),{name:'HALCYON'});capHealth(CV,100,()=>missionFail('HALCYON WAS LOST'));M.cv=CV;addTurrets(CV,[[30,22,200],[-30,22,200],[30,22,-200],[-30,22,-200]],1.2,9999,99);for(const s of CV.subs)s.noTarget=true;
  const L=mkCap('levi','e',[100,60,2600],qaxis([0,1,0],PI),{name:'LEVIATHAN'});L.vel=vmul(qF(L.q),5);M.L=L;const mm=MESH.levi.mounts;
  addTurrets(L,mm.turrets,1.6,180,-1,.8);
  M.gens=mm.gens.map((p,i)=>mkSub(L,'gen',p,{hp:450,s:2.2,r:7.5,name:'GENERATOR '+(i+1),objective:true}));
  M.vents=mm.vents.map((p,i)=>{const v=mkSub(L,'vent',p,{hp:450,s:1.7,r:7,name:'VENT '+(i+1),objective:true});v.shielded=()=>M.gens.some(x=>!x.dead);return v;});
  M.core=mkSub(L,'core',mm.core,{hp:1800,s:1.3,r:13,name:'CORE',objective:true});M.core.shielded=()=>M.vents.some(x=>!x.dead);
  M.em=mkSub(L,'beam',mm.beam,{hp:1300,s:1,r:12,name:'BEAM EMITTER'});M.em.charge=0;
  PL=mkShip('lance','a',[0,0,-900],qid(),{isPlayer:true});M.wm=wingmen();M.center=[0,0,800];M.radius=4800;M.ws=[];M.hang=12;M.beamT=50;M.beam={on:0,a:[0,0,0],b:[0,0,0]};
  radio('CMD','All wings, the Leviathan. Generators first. Go!');
  M.obj=()=>{const g=M.gens.filter(x=>x.dead).length,v=M.vents.filter(x=>x.dead).length;const ph=g<4?'DESTROY THE SHIELD GENERATORS   '+g+'/4':v<3?'DESTROY THE REACTOR VENTS   '+v+'/3':'DESTROY THE CORE   '+Math.round(M.core.hp/M.core.max*100)+'%';
    return [ph,M.em.dead?'BEAM EMITTER DESTROYED':(M.beamT<=5?'BEAM CHARGING':'BEAM IN '+mmss(M.beamT)),'HALCYON '+Math.round(CV.hpC)+'%'];};},
 onKill(M,e){if(M.gens.includes(e)){const n=M.gens.filter(x=>x.dead).length;radio(pick(['JUNO','RIX']),n<4?'Generator down. '+(4-n)+' to go.':'Shields are down! Hit the vents along the spine!');}
  if(M.vents.includes(e)){const n=M.vents.filter(x=>x.dead).length;if(n===3)radio('CMD','The core is exposed beneath the hull. Finish it!');}
  if(e===M.em){M.beam.on=0;radio('RIX','Beam emitter is scrap! Halcyon is safe from that thing.');}
  if(e===M.core){radio('CMD','She is going up! All wings clear the blast!');capDeath(M.L,7);missionWin(25000+Math.round(M.cv.hpC)*200,8.5);}},
 update(M,dt){
  const L=M.L;if(L.dying)return;
  if(vdist(L.pos,M.cv.pos)<1900)L.vel=[0,0,0];
  M.hang-=dt;if(M.hang<=0){M.hang=24;if(alive(M.ws)<9){for(const hp of MESH.levi.mounts.hangars)M.ws=M.ws.concat(wing('dart','e',2,toWorld(L,hp),qR(L.q).map(v=>v*Math.sign(hp[0])),30));radio('RIX','More darts from the hangars.');}}
  if(!M.em.dead){M.beamT-=dt;M.em.charge=M.beamT<5?clamp(1-M.beamT/5,0,1):0;
    if(M.beamT<=5&&!M.chg){M.chg=1;SFX.charge();SFX.alarm();radio('CMD','Beam charging! Hit the emitter at the bow!');}
    if(M.beamT<=0){M.beam.on=3;M.beamT=55;M.chg=0;SFX.beam();M.cv.capHit(20);G.shake=Math.min(1,G.shake+.5);}}
  if(M.beam.on>0){M.beam.on-=dt;M.beam.a=vadd(M.em.pos,vmul(qF(L.q),18));M.beam.b=toWorld(M.cv,[0,0,120]);if(FRAME%3===0)fxExplode(vadd(M.beam.b,vrand(40)),30,false);}
 }}
];
/* ---------- mission flow ---------- */
let HPK=1;
function startMission(i){
  clearWorld();SAID.clear();G.mi=i;useTheme(i);const def=MISSIONS[i];
  const M={def,t:0,center:[0,0,0],radius:5000,obj:()=>[],result:null,endT:0};G.M=M;
  def.start(M);M.onKill=(e,byP)=>{if(def.onKill)def.onKill(M,e,byP);};
  const P=PL;P.shMax=100+35*(G.up.shield||0);P.sh=P.shMax;P.max=100+30*(G.up.hull||0);P.hp=P.max;P.missiles=8+4*(G.up.pods||0);P.maxMiss=P.missiles;P.thr=.6;
  Object.assign(PLS,{lockT:0,locked:false,tgt:null,missCD:0,energy:maxEnergy(),boostE:100,autoT:0});
  G.stats={shots:0,hits:0,kills:0,t0:G.score};G.mult=1;G.slow=1;G.slowT=0;G.fence=false;
  setTrack(def.music);msg('MISSION '+(i+1),def.name,3,GR.cyan);
}
function missionWin(bonus,delay){const M=G.M;if(M.result)return;M.result='win';M.bonus=bonus||0;M.endT=delay||3.5;SFX.clear();msg('MISSION COMPLETE','',2.6,GR.green);}
function missionFail(why){const M=G.M;if(M.result)return;M.result='fail';M.why=why;M.endT=3;SFX.lose();msg('MISSION FAILED',why,3,GR.red);}
function updMission(dt){
  const M=G.M;if(!M)return;M.t+=dt;if(!M.result)M.def.update(M,dt);
  if(PL&&PL.dead&&!M.result){M.result='fail';M.why='YOUR SHIP WAS DESTROYED';M.endT=3.2;msg('MISSION FAILED',M.why,3,GR.red);SFX.lose();}
  if(M.result){M.endT-=dt;if(M.endT<=0&&!M.closed){M.closed=1;endMission(M.result==='win');}}
}
