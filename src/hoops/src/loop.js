const UIP={};
const inGame=()=>!S.demo&&(S.mode==='play'||S.mode==='buzz'||S.mode==='intro'||S.mode==='tally');
function setPause(on){if(!inGame())on=false;S.paused=on;$('pauseBtn').textContent=on?'Resume':'Pause';if(on){S.charging=false;S.drag=false;}}
/* cut-scene sound cues fire as the scene clock crosses them (the scenes themselves are pure functions of time) */
function introCues(){
  const t=S.st,cues=[[.1,()=>SFX.whoosh()],[.52,()=>SFX.stamp()],[1.3,()=>SFX.pop()],[1.85,()=>SFX.dmd()],[2.55,()=>{SFX.cheer(.5);SFX.stamp();}]];
  while(S.cue<cues.length&&t>=cues[S.cue][0]){cues[S.cue][1]();S.cue++;}
  if(t>1){const k=Math.min(SUBS[S.round-1].length,Math.floor((t-1)*30));if(k>S.typed){S.typed=k;SFX.type();}}
}
function tallyCues(){
  const r=S.R[S.round-1];if(!r)return;const v=tallyVals(S.st,r);for(let i=0;i<4;i++)if(v[i]!==S.shown[i]){S.shown[i]=v[i];SFX.blip(v[i]+i*3);}
  if(S.cue===0&&S.st>3){S.cue=1;SFX.stamp();if(r.baskets>=PAR[S.round-1]){SFX.cheer(.7);SFX.win();}else SFX.aww();}
}
function overTick(dt,e,tap){
  S.st+=dt;const o=S.ov;
  if(S.st>1.6&&!o.done){
    if(o.sc<S.score){const p=o.sc|0;o.sc=Math.min(S.score,o.sc+Math.max(25,S.score/1.1)*dt);if((o.sc|0)!==p)SFX.blip(o.sc|0);}
    else if(o.bk<S.baskets){const p=o.bk|0;o.bk=Math.min(S.baskets,o.bk+Math.max(20,S.baskets/.8)*dt);if((o.bk|0)!==p)SFX.tick();if(p<40&&o.bk>=40)SFX.streak(4);}
    else if(o.tk<S.tickets){const p=o.tk|0;o.tk=Math.min(S.tickets,o.tk+(S.tickets>60?40:12)*dt);if((o.tk|0)!==p)SFX.ticket();}
    else{o.done=true;o.doneT=S.st;if(S.newHi){SFX.hiscore();SFX.cheer(1);}else SFX.win();}
  }
  if((e.ok||tap)&&S.st>1.2){if(!o.done){o.sc=S.score;o.bk=S.baskets;o.tk=S.tickets;}else APP_attract();}
  else if(o.done&&(S.st-o.doneT>20||(S.bot&&S.st-o.doneT>1)))APP_attract();
}
function tick(dt){
  const c=readCtl(),e={};for(const k of ['ok','back','pause','a','b']){e[k]=c[k]&&!UIP[k];UIP[k]=c[k];}
  if(LATCH.has('KeyM')){LATCH.delete('KeyM');toggleSound();}   // consumed: a catch-up frame runs several ticks before LATCH clears
  const pd=PE.d!==S.pd,pu=PE.u!==S.pu,tap=pd;S.pd=PE.d;S.pu=PE.u;S.t+=dt;   // one-shot pointer edges
  if(S.paused){if(e.pause||tap)setPause(false);else if(e.b){setPause(false);ARC.over(S.score,0);APP_attract();}crowdTick(dt);return;}
  if(e.pause&&inGame()){setPause(true);return;}
  fxTick(dt);
  const m=S.mode;
  if(m==='title')titleTick(dt,c,e,tap);
  else if(m==='intro'){S.st+=dt;introCues();if(S.st>3||((e.ok||tap||S.bot)&&S.st>.6))beginRound(S.round);}
  else if(m==='play'){playTick(dt,c,e,S.bot,pd,pu);if(S.time<=0)roundEnd();}
  else if(m==='buzz'){S.st+=dt;playTick(dt,c,e,false,false,false);let fly=0;for(const b of BALLS)if(b.st==='fly')fly++;if((!fly&&S.st>1.4)||S.st>4){if(S.round<3)toTally();else toResults();}}
  else if(m==='tally'){S.st+=dt;tallyCues();if(S.st>4.6||((e.ok||tap||S.bot)&&S.st>.8))startIntro(S.round+1);}
  else if(m==='over')overTick(dt,e,tap);
  crowdTick(dt);
}