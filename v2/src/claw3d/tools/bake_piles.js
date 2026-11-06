// Settles each machine's pile ahead of time, so the page doesn't have to while it loads.
// node tools/bake_piles.js [variants]  -> JSON on stdout: {machine:[{t:[type ids], q:base64 Float32 (4 per toy), p:base64 Float32 (3 per ball)}]}
// build.py runs this and packs the result into the page as PILES. Each variant uses its own random seed.
const fs=require('fs'),vm=require('vm'),path=require('path');const SRC=path.join(__dirname,'..');
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const stub=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;
const SFX=new Proxy({},{get:()=>()=>{}});const say=()=>{},hudPop=()=>{},setTrack=()=>{},store={get:(k,d)=>d,set(){}};const CAB={id:'claw3d'};const ARC={score(){},over(){},post(){}};
function aimInput(){} function screenToWorld(){return null;} function showBusy(){return false;} function showQueue(){} function gameOver(){}
const IDX=JSON.parse(fs.readFileSync(path.join(SRC,'models','index.json')));const PLUSH={};
for(const id in IDX){const b=fs.readFileSync(path.join(SRC,'models',id+'.bin'));PLUSH[id]={id,size:IDX[id].size,model:decodePlush(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}`;
const code=['01_models.js','10_phys.js','11_claw.js','12_rings.js','20_machine.js'].map(f=>fs.readFileSync(path.join(SRC,'js',f),'utf8')).join('\n');
const body=`
const NV=+(process.argv[2]||3),out={};const b64=a=>Buffer.from(new Float32Array(a).buffer).toString('base64');
for(const id of MORDER){out[id]=[];
  for(let v=0;v<NV;v++){Math.random=mulberry(1000+v*37+id.length);setMachine(id);clearPhys();clawReset();fillMachine();
    for(let t=0;t<420;t++)physTick(null);
    const t=[],q=[],p=[];for(const b of BOD){if(b.state!=='pit')continue;t.push(b.T.id);q.push(...b.q);for(let i=b.i0;i<b.i0+b.n;i++)p.push(PX[i],PY[i],PZ[i]);}
    out[id].push({t,q:b64(q),p:b64(p)});}}
process.stdout.write(JSON.stringify(out));
`;
const ctx={process,console,fs,path,SRC,mulberry,Buffer,Float64Array,Float32Array,Int32Array,Uint16Array,Uint8Array,Int8Array,DataView,ArrayBuffer,Math,JSON,Date,Proxy,Set,Map,Array,Object};
vm.createContext(ctx);vm.runInContext('(function(){"use strict";'+stub+code+'\n'+body+'\n})()',ctx);
