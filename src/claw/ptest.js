// Physics harness: node ptest.js [mode]   (runs the PHYS section as a strict script inside an IIFE, like the page)
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(__dirname+'/src/phys.js','utf8');
const phys=src.slice(src.indexOf('//#PHYS-BEGIN'),src.indexOf('//#PHYS-END'));
const pre=`function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
Math.random=mulberry(+(process.env.SEED||1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;`;
const harness=fs.readFileSync(__dirname+'/ptest_body.js','utf8');
vm.runInThisContext('(function(process,console,require){"use strict";'+pre+phys+harness+'\n})')(process,console,require);
