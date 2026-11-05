// The real machine logic, no graphics: the attract pilot plays N credits. node test/autoplay.js [credits] [demoStrength lo]
const fs=require('fs'),vm=require('vm'),path=require('path');const SRC=path.join(__dirname,'..');
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const stub=`Math.random=mulberry(+(process.env.SEED||7));const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;
const SFX=new Proxy({},{get:()=>()=>{}});const say=()=>{},hudPop=()=>{},setTrack=()=>{},store={get:(k,d)=>d,set(){}};const CAB={id:'claw3d'};const ARC={score(){},over(){},post(){}};
function aimInput(){} function screenToWorld(){return null;}
const IDX=JSON.parse(fs.readFileSync(path.join(SRC,'models','index.json')));const PLUSH={};
for(const id of ['frog','hedgehog','toadstool','fox','redpanda','owl','moth','hare']){const b=fs.readFileSync(path.join(SRC,'models',id+'.bin'));PLUSH[id]={id,size:IDX[id].size,model:decodePlush(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}`;
const code=['01_models.js','10_phys.js','11_claw.js','20_machine.js'].map(f=>fs.readFileSync(path.join(SRC,'js',f),'utf8')).join('\n');
const body=`
setMachine('wild');clawReset();fillMachine();for(let t=0;t<300;t++)physTick(null);
const N=+(process.argv[2]||20);let credits=0,wins=0,lifted=0,t0=Date.now(),ticks=0,lastC=0;const got={};
S.mode='title';S.demo=true;S.credit=0;newCredit();
const lo=+(process.argv[3]||0);
let prevPh='';
while(credits<N&&ticks<60*60*20){worldTick(1/60,null,null);ticks++;
  if(M.ph==='roll'&&M.t<1/59&&lo>0){M.S=CL.S=lo+(1-lo)*Math.random();}
  if(M.ph==='result'&&prevPh!=='result'){credits++;if(M.wins.length){wins++;for(const b of M.wins)got[b.T.id]=(got[b.T.id]||0)+1;}if(M.maxLift>.4)lifted++;}
  if(ticks%600===0)console.log("t",ticks/60,"s ph",M.ph,"credit",S.credit,"plush",BOD.length,"awake",BOD.filter(b=>!b.sleep).length,"ms/tick",((Date.now()-t0)/ticks).toFixed(1),"gx",CL.gx.toFixed(2),"tx",GT.tx);
  prevPh=M.ph;}
console.log('credits',credits,'wins',wins,'('+Math.round(wins/credits*100)+'%)','lifted high',lifted,'won:',JSON.stringify(got),'ms/tick',((Date.now()-t0)/ticks).toFixed(2),'plush now',BOD.length);
`;
const ctx={process,console,fs,path,SRC,mulberry,Float64Array,Float32Array,Int32Array,Uint16Array,Uint8Array,Int8Array,DataView,Math,JSON,Date,Proxy,Set,Map,Array,Object};
vm.createContext(ctx);vm.runInContext('(function(){"use strict";'+stub+code+body+'\n})()',ctx);
