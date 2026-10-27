(()=>{const G=__game,out=[],rt=[];let bad=[];
const skills=[.006,.012,.018,.025,.035,.05];
for(let g=0;g<30;g++){
  G.setRes(g%3);
  G.attract();G.ff(2+Math.random()*6);           // some attract / demo between games
  G.PERF.tk=0;G.PERF.tn=0;G.PERF.tmax=0;
  G.AUTO.on=true;G.BOT.sig=skills[g%skills.length];G.BOT.hes=.15;G.BOT.go=Math.random()<.5?1:0;
  G.start();let simT=0,n=0;
  while(G.S.mode==='play'&&n<20000){G.ff(.1);simT+=.1;n++;
    if(n%3===0){const t0=performance.now();G.render();rt.push(performance.now()-t0);}
    const T=G.temp();for(let i=0;i<T.length;i+=97)if(!(T[i]>=.1&&T[i]<1.1)){bad.push('temp '+T[i]);break;}}
  const S=G.S,R=G.RES;
  if(S.mode!=='over')bad.push('game '+g+' stuck in '+S.mode+'/'+S.ph);
  if(!(S.tickets>=5&&S.tickets<=575))bad.push('tickets '+S.tickets);
  out.push({g,res:G.dims().join('x'),sig:G.BOT.sig,go:G.BOT.go,out:S.outcome,rows:S.row-1,tk:S.tickets,score:S.score,t:+simT.toFixed(1),tick:+(G.PERF.tk/G.PERF.tn).toFixed(3),tmax:+G.PERF.tmax.toFixed(2)});
  G.AUTO.on=false;G.ff(1.0);G.KEY.Space=true;G.LATCH.add('Space');G.ff(.05);G.KEY.Space=false;G.ff(.3);   // skip the count
  G.LATCH.add('Space');G.KEY.Space=true;G.ff(.05);G.KEY.Space=false;G.ff(.2);
  if(G.S.mode!=='title')bad.push('results did not return to title: '+G.S.mode);
}
rt.sort((a,b)=>a-b);
return JSON.stringify({games:out,bad,render:{n:rt.length,avg:+(rt.reduce((a,b)=>a+b,0)/rt.length).toFixed(3),p95:+rt[Math.floor(rt.length*.95)].toFixed(3),max:+rt[rt.length-1].toFixed(3)}});})()
