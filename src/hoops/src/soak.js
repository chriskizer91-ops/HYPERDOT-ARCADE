// Soak: the bot plays N complete games through the real tick() (title -> intro -> 3 rounds -> tallies -> results -> attract ...).
// Skill varies per game. Measures tick() and render() separately (render = scene + LED-buffer flush; no present()).
(()=>{
  const G=__game,S=G.S,N=__N__,res=[],modes={},rt={};const TK=[];let ticks=0,tsum=0,tmax=0,inOver=false,errs=0,stuck=0,lastMode='',sameFor=0;
  S.bot=true;G.attract();
  const skills=[.3,.45,.6,.75,.9];let gi=0;G.AI.skill=skills[0];
  while(res.length<N&&ticks<N*9000){
    const t0=performance.now();try{G.tick(1/60);}catch(e){errs++;if(errs<3)console.error('tick',e&&e.stack);}const dt=performance.now()-t0;ticks++;tsum+=dt;if(dt>tmax)tmax=dt;TK.push(dt);
    G.endInput&&G.endInput();
    if(ticks%23===0){const m=S.mode==='title'?'title:'+S.pi:S.mode;const r0=performance.now();try{G.render();}catch(e){errs++;if(errs<3)console.error('render',e&&e.stack);}const d=performance.now()-r0;(rt[m]=rt[m]||[]).push(d);}
    modes[S.mode]=(modes[S.mode]||0)+1;
    if(S.mode===lastMode)sameFor++;else{sameFor=0;lastMode=S.mode;}if(sameFor>60*70)stuck++;
    if(S.mode==='over'&&!inOver){inOver=true;res.push({skill:G.AI.skill,sc:S.score,bk:S.baskets,sh:S.shots,tk:S.tickets,best:S.best,r:S.R.map(r=>r.baskets),k:Object.assign({},S.kinds)});gi++;G.AI.skill=skills[gi%skills.length];}
    if(S.mode!=='over')inOver=false;
  }
  const st={};for(const m in rt){const a=rt[m].sort((x,y)=>x-y);st[m]={n:a.length,p50:+a[Math.floor(a.length*.5)].toFixed(2),avg:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2),p95:+a[Math.floor(a.length*.95)].toFixed(2),max:+a[a.length-1].toFixed(2)};}
  TK.sort((x,y)=>x-y);return JSON.stringify({games:res.length,ticks,tickP50:+TK[TK.length>>1].toFixed(3),tickP99:+TK[Math.floor(TK.length*.99)].toFixed(3),tickAvg:+(tsum/ticks).toFixed(3),tickMax:+tmax.toFixed(2),errs,stuck,parts:G.PART.length,render:st,res});
})()
