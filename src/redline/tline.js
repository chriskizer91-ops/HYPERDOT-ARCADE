const fs=require('fs');
const stub=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2,PI=Math.PI,smooth=t=>t*t*(3-2*t);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}`;
eval(stub+fs.readFileSync('2_track.js','utf8')+`;global.out=[];for(let ci=0;ci<5;ci++){const T=buildCircuit(ci);let t=0;for(const s of T.segs)t+=1/(62*Math.max(.2,s.vlim));
 const sp=T.segs.reduce((a,s)=>a+s.spr.length,0);console.error(T.C.name,'N',T.N,'lap',t.toFixed(1),'start',T.startI,'props',sp,'corners',T.corners.map(c=>c.v.toFixed(2)).join(' '));
 out.push({name:T.C.name,curve:T.segs.map(s=>+s.curve.toFixed(2)),line:T.segs.map(s=>+s.line.toFixed(3)),v:T.segs.map(s=>+s.vlim.toFixed(3)),map:T.map.map(p=>[+p[0].toFixed(4),+p[1].toFixed(4)])});}
 const H=buildHighway();console.error('highway N',H.N);`);
fs.writeFileSync('tline.json',JSON.stringify(out));
