// Physics harness (no graphics): node test/ptest.js pile|grab   — env: N, S, T, SEED
const fs=require('fs'),vm=require('vm'),path=require('path');
const SRC=path.join(__dirname,'..');
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const pre=`Math.random=mulberry(+(process.env.SEED||1));const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;`;
const code=['01_models.js','10_phys.js','11_claw.js'].map(f=>fs.readFileSync(path.join(SRC,'js',f),'utf8')).join('\n');
const body=fs.readFileSync(path.join(__dirname,'ptest_body.js'),'utf8');
const ctx={process,console,require,mulberry,fs,path,SRC,Float64Array,Float32Array,Int32Array,Uint16Array,Uint8Array,Int8Array,DataView,Math,JSON,Date};
vm.createContext(ctx);
vm.runInContext('(function(){"use strict";'+pre+code+'\n'+body+'\n})()',ctx);
