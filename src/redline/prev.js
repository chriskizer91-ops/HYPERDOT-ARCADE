const lerp=(a,b,t)=>a+(b-a)*t,PI=Math.PI,TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
eval(require('fs').readFileSync('geo.js','utf8')+require('fs').readFileSync('plans.js','utf8')+';global.PLANS=PLANS;global.circuitGeom=circuitGeom;global.SEG=SEG;');
const out=[];const CK=+(process.argv[2]||1.6);
for(const p of PLANS){const G=circuitGeom(p.p);let mx=0;for(const c of G.curve)mx=Math.max(mx,Math.abs(c));
  const N=G.N,vl=new Float32Array(N);for(let i=0;i<N;i++){const c=Math.abs(G.curve[i]);vl[i]=Math.min(1,Math.sqrt(CK/(Math.max(1e-3,c)*(1-.28))))}
  const BR=.55,ds=1/62;for(let it=0;it<2;it++)for(let i=N-1;i>=0;i--){const nx=vl[(i+1)%N];vl[i]=Math.min(vl[i],Math.sqrt(nx*nx+2*BR*ds))}
  let t=0,mn=1;for(let i=0;i<N;i++){t+=1/(62*Math.max(.2,vl[i]));mn=Math.min(mn,vl[i]);}
  console.error(p.name,'N',N,'len',G.len.filter((v,i)=>p.p[i].s!=null).map(v=>v.toFixed(0)).join(','),'close',G.closeErr.toFixed(2),'turn',G.turn.toFixed(1),'maxcurve',mx.toFixed(2),'lap s',t.toFixed(1),'min v',mn.toFixed(2));
  out.push({name:p.name,pts:G.pts.map(q=>[+q[0].toFixed(2),+q[1].toFixed(2)]),y:Array.from(G.y).map(v=>+(v/SEG).toFixed(1)),curve:Array.from(G.curve).map(c=>+c.toFixed(2)),vl:Array.from(vl).map(v=>+v.toFixed(3)),tun:Array.from(G.tun)});}
require('fs').writeFileSync('prev.json',JSON.stringify(out));
