(()=>{const G=__game,out=[];G.ff(3);for(let r=0;r<3;r++)G.bench(60);
for(let r=0;r<4;r++){G.PROF.on=true;G.PROF.acc={};const b=G.bench(90);const o={};for(const k in G.PROF.acc)o[k]=+(G.PROF.acc[k]/90).toFixed(2);G.PROF.on=false;out.push([+b.tick.toFixed(2),+b.render.toFixed(2),o.bodies,o.text,o.overlay,o.commit,o.t_phys]);}
return JSON.stringify(out);})()
