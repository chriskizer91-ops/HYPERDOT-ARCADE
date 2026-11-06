// Every machine's real logic, no graphics.
//   node test/machines.js pile  <machine>            settle the full case: time per tick, heights, how many sleep
//   node test/machines.js grip  <machine> [S list]   one plush on an empty floor, aimed perfectly, 30 tries per strength
//   node test/machines.js play  <machine> [credits]  the demo pilot plays with the machine's real strength roll
// env: SEED, T (plush ids for grip), N (tries)
const fs=require('fs'),vm=require('vm'),path=require('path');const SRC=path.join(__dirname,'..');
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const stub=`Math.random=mulberry(+(process.env.SEED||7));const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;
const SFX=new Proxy({},{get:()=>()=>{}});const say=()=>{},hudPop=()=>{},setTrack=()=>{},store={get:(k,d)=>d,set(){}};const CAB={id:'claw3d'};const ARC={score(){},over(){},post(){}};
function aimInput(){} function screenToWorld(){return null;} function showBusy(){return false;} function showQueue(){} function gameOver(){S.mode='over';}
const IDX=JSON.parse(fs.readFileSync(path.join(SRC,'models','index.json')));const PLUSH={};
for(const id in IDX){const b=fs.readFileSync(path.join(SRC,'models',id+'.bin'));PLUSH[id]={id,size:IDX[id].size,model:decodePlush(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}`;
const code=['01_models.js','10_phys.js','11_claw.js','12_rings.js','20_machine.js'].map(f=>fs.readFileSync(path.join(SRC,'js',f),'utf8')).join('\n');
const body=`
const MODE=process.argv[2]||'pile',MID=process.argv[3]||'wild';
setMachine(MID);clawReset();
const ms=f=>{const t=Date.now();f();return Date.now()-t;};
if(MODE==='pile'){
  fillMachine();console.log(MID,'bodies',BOD.length,'balls',NP);
  for(let s=0;s<6;s++){const t=ms(()=>{for(let k=0;k<60;k++)physTick(null);});
    console.log(' t',s+1,'s  ms/tick',(t/60).toFixed(2),' asleep',BOD.filter(b=>b.sleep).length+'/'+BOD.length,' top',Math.max(...BOD.map(b=>b.y1)).toFixed(3),' lowest centre',Math.min(...BOD.map(b=>b.cy)).toFixed(3));}
  const lost=BOD.filter(b=>b.cx<CASE.cx&&b.cz>CASE.cz).length;console.log(' in the chute area',lost,' heights',BOD.map(b=>b.cy.toFixed(2)).join(' '));
}
function run(sec,f){for(let t=0;t<sec*60;t++){f&&f();gantryTick(1/60);physTick(CLAWSTEP);clawTelemetry();}}
function grip(id,Sv){
  BOD.slice().forEach(kill);NP=0;clawReset();CL.S=Sv;const T=CAST[id];
  const x=(CASE.x1*.35),z=CASE.z0*.3,b=spawn(T,x,T.size*.5,z,rnd(-3,3));setupGrid();run(1.5);
  GT.tx=b.cx+rnd(-.01,.01)*UNIT;GT.tz=b.cz+rnd(-.01,.01)*UNIT;run(4);
  CL.motor=-1;run(.3);let slackT=0;
  for(let t=0;t<60*5;t++){CL.winch=Math.min(MC.wd,Math.max(CL.winch,0)+.04*Math.sqrt(UNIT));gantryTick(1/60);physTick(CLAWSTEP);const vy=(CL.hy-CL.oy)/HS;if(CL.slack>.008*UNIT&&vy>-.12*UNIT)slackT++;else slackT=0;if(slackT>4||CL.L>=CS.LMAX)break;}
  CL.winch=0;CL.L=Math.min(CL.L,Math.hypot(CL.hx-CL.gx,CL.hy-CS.GY,CL.hz-CL.gz)+.004*UNIT);
  if(process.env.V)console.log('    landed: claw',CL.hx.toFixed(2),CL.hy.toFixed(2),CL.hz.toFixed(2),'body',b.cx.toFixed(2),b.cy.toFixed(2),b.cz.toFixed(2),'box y',b.y0.toFixed(2),b.y1.toFixed(2));
  CL.motor=1;run(1);
  for(let t=0;t<60*6;t++){CL.winch=-Math.min(MC.wu,.06*UNIT+(CL.L-CS.LMIN)*3);gantryTick(1/60);physTick(CLAWSTEP);if(CL.L<=CS.LMIN+.0005)break;}
  CL.winch=0;run(.4);const top=b.cy;if(process.env.V)console.log('    after lift: claw',CL.hx.toFixed(2),CL.hy.toFixed(2),CL.hz.toFixed(2),'body',b.cx.toFixed(2),b.cy.toFixed(2),b.cz.toFixed(2),'box y',b.y0.toFixed(2),b.y1.toFixed(2),'prongs',Array.from(CL.ph).slice(0,CS.npr).map(v=>v.toFixed(2)).join('/'),'contacts',b.pc);
  let low=9;GT.tx=CS.home[0];GT.tz=CS.home[1];GT.carry=true;run(5,()=>{if(b.state==='pit')low=Math.min(low,b.cy);});GT.carry=false;const car=b.state==='pit'?b.cy:-1,cx=b.cx,cz=b.cz;CL.motor=-1;run(2);
  if(process.env.V)console.log('   ',id,'S',Sv,'hooked',b.rg?b.rg.hook:'-','rings',RINGHOOKS,'top',top.toFixed(3),'carried',car.toFixed(3),'lowest in carry',low.toFixed(3),'at',cx.toFixed(2),cz.toFixed(2),'end',b.state,b.cy.toFixed(3),'squeeze',b.comp.toFixed(2));
  return {won:b.state!=='pit'||b.cy<-.06*UNIT,top};
}
if(MODE==='grip'){
  const Ss=(process.argv[4]||'.3,.5,.7,1').split(',').map(Number),ids=(process.env.T||MC.cast.map(c=>c.id).join(',')).split(','),N=+(process.env.N||10);
  console.log(MID,'grip test: one plush, perfect aim,',N,'tries each');
  for(const id of ids){const row=[];for(const Sv of Ss){let w=0,held=0;for(let k=0;k<N;k++){const r=grip(id,Sv);if(r.won)w++;else if(r.top>CASE.ch+.05*UNIT)held++;}row.push('S'+Sv+': won '+w+'/'+N+(held?' ('+held+' dropped late)':''));}
    console.log(' ',id.padEnd(9),row.join(' | '));}
}
/* aim: a full case, a player who aims well (within E cm) at one chosen plush, at a given strength */
if(MODE==='aim'){
  const Sv=+(process.argv[4]||.5),N=+(process.env.N||8),E=+(process.env.E||2)/100*UNIT,ids=(process.env.T||MC.cast.map(c=>c.id).join(',')).split(',');
  fillMachine();for(let t=0;t<300;t++)physTick(null);saveWorld();
  console.log(MID,'good aim (within',(E*100).toFixed(1),'cm) at strength',Sv);
  for(const id of ids){let w=0,any=0;
    for(let k=0;k<N;k++){loadWorld(MID);S.mode='play';S.demo=true;S.credit=0;newCredit();const b=BOD.find(o=>o.T.id===id);if(!b)continue;
      AI.tgt=b;M.S=CL.S=Sv;let prev='',done=false,tk=0;
      while(!done&&tk<60*60){
        if(M.ph==='aimX'){if(M.t<1/59){AI.err=0;}GT.tx=clamp(b.cx+rnd(-E,E),CASE.x0+CS.edge,CASE.x1-CS.edge);GT.tz=M.zLock;if(Math.abs(CL.gx-GT.tx)<.006*UNIT&&Math.abs(CL.gvx)<.02*UNIT)lockAxis();}
        else if(M.ph==='aimZ'){GT.tz=clamp(b.cz+rnd(-E,E),CASE.z0+CS.edge,CASE.z1-CS.edge);GT.tx=M.xLock;if(Math.abs(CL.gz-GT.tz)<.006*UNIT&&Math.abs(CL.gvz)<.02*UNIT)lockAxis();}
        const ph=M.ph;if(ph!=='aimX'&&ph!=='aimZ')worldTick(1/60,null,null);else{gantryTick(1/60);M.t+=1/60;physTick(CLAWSTEP);clawTelemetry();}
        tk++;if(M.ph==='result'){done=true;if(M.wins.length)any++;if(M.wins.some(o=>o.T.id===id))w++;}}}
    console.log(' ',id.padEnd(8),'won it',w+'/'+N,' won something',any+'/'+N);}
}
if(MODE==='chute'){  /* drop each toy straight into the chute: does it go down? */
  fillMachine();for(let t=0;t<300;t++)physTick(null);saveWorld();
  for(const c of MC.cast){loadWorld(MID);const C=CASE,b=BOD.find(o=>o.T.id===c.id);if(!b)continue;
    const dx=(C.x0+C.cx)/2-b.cx,dz=(C.cz+C.z1)/2-b.cz,dy=C.ch+.12*UNIT-b.cy+b.T.size*.5;
    for(let i=b.i0;i<b.i0+b.n;i++){PX[i]+=dx;PY[i]+=dy;PZ[i]+=dz;OX[i]=PX[i];OY[i]=PY[i];OZ[i]=PZ[i];}wake(b);
    const tr=[];for(let t=0;t<240;t++){physTick(null);if(t%40===0)tr.push(b.cy.toFixed(2));}
    console.log(' ',c.id.padEnd(8),'centre height over 4 s:',tr.join(' '),' final',b.cy.toFixed(2),b.cy<-.06*UNIT?'WENT DOWN':'STUCK','box',(b.x1-b.x0).toFixed(2),(b.z1-b.z0).toFixed(2),'chute',(C.cx-C.x0).toFixed(2),(C.z1-C.cz).toFixed(2));}
}
if(MODE==='play'){
  fillMachine();for(let t=0;t<300;t++)physTick(null);
  const N=+(process.argv[4]||30);let credits=0,wins=0,ticks=0,byRing=0,closer=0;const got={},t0=Date.now();
  S.mode='play';S.demo=true;S.credit=0;AI.anyT=true;newCredit();let prev='',restockUntil=0;
  const real=()=>{const [lo,hi]=MC.roll;return lo+(hi-lo)*Math.pow(Math.random(),.85);};
  while(credits<N&&ticks<60*60*60){
    /* a game is MC.credits credits; between games the machine restocks, as the real one does */
    if(ticks<restockUntil){S.mode='title';}else S.mode='play';
    worldTick(1/60,null,null);ticks++;
    if(M.ph==='roll'&&prev!=='roll'){M.S=CL.S=real();}
    if(M.ph==='roll'&&prev!=='roll'){for(const b of BOD)if(b.rg)b.rg.was=0;}
    if(M.ph==='result'&&prev!=='result'){if(!M.wins.length&&MC.fixed&&M.d0){let g=0;for(const b of BOD){const d0=M.d0.get(b.id);if(d0!=null)g=Math.max(g,d0-chuteDist(b));}if(g>.12*UNIT)closer++;}credits++;if(credits%MC.credits===0)restockUntil=ticks+60*(MC.stock>10?12:4);if(M.wins.length){wins++;if(M.wins.some(b=>b.rg&&b.rg.was))byRing++;for(const b of M.wins)got[b.T.id]=(got[b.T.id]||0)+1;}}
    prev=M.ph;}
  console.log(MID,'rings hooked',RINGHOOKS,'wins with a ring',byRing,'closer',closer,'credits',credits,'wins',wins,'('+Math.round(wins/credits*100)+'%)','won:',JSON.stringify(got),'ms/tick',((Date.now()-t0)/ticks).toFixed(2),'sim minutes',(ticks/3600).toFixed(1),'in case now',BOD.length);
}
`;
const ctx={process,console,fs,path,SRC,mulberry,Float64Array,Float32Array,Int32Array,Uint16Array,Uint8Array,Int8Array,DataView,ArrayBuffer,Math,JSON,Date,Proxy,Set,Map,Array,Object};
vm.createContext(ctx);vm.runInContext('(function(){"use strict";'+stub+code+'\n'+body+'\n})()',ctx);
