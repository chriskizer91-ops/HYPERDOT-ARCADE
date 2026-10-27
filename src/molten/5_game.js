/* =====================================================================================
   CABINET, MUSIC, SOUND
   ===================================================================================== */
const CAB={id:'molten',title:'MOLTEN',tickets:true};
const TRACKS={
  title:{bpm:84,root:38,scale:'phryg',prog:[0,1,0,5],bass:'R.......R...O...',lead:'5-------6---5---3-------2---1---',kick:'x...............',snare:'................',hat:'................',anv:'X.......x.......',pad:1,lv:.022},
  s0:{bpm:112,root:40,scale:'minor',prog:[0,5,3,4],bass:'R..R..R.R..RO.F.',lead:'1-3-5---4-3-1---5-6-5-3-2-------',kick:'x.......x..x....',snare:'....x.......x...',hat:'..x...x...x...x.',anv:'X...x...X...x.x.',chn:'..x...x.x...x...',pad:1,lv:.026},
  s1:{bpm:98,root:43,scale:'dorian',prog:[0,3,5,4],bass:'R.......R..R....',lead:'8---7---5---6-5-3---------2-1---',kick:'x.......x.......',snare:'........x.......',hat:'x.x.x.x.x.x.x.x.',anv:'X...............',arp:'16',pad:1,lv:.022},
  s2:{bpm:120,root:38,scale:'phryg',prog:[0,1,5,0],bass:'R.R.O.R.R.R.O.F.',lead:'1-2-1---5-6-5---3-2-1-2-1-------',kick:'x..x..x.x..x..x.',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.x.',anv:'X..x..X...x..x..',chn:'x...x...x...x...',pad:1,lv:.024},
  s3:{bpm:108,root:41,scale:'harm',prog:[0,5,3,4],bass:'R..RO..RR..RO.F.',lead:'5-6-5-3-2---1---3-5-6-8-7-------',kick:'x.....x...x.....',snare:'....x.......x..x',hat:'..x...x...x...x.',anv:'X.....x...X.....',chn:'....x.......x...',pad:1,lv:.025},
  boss:{bpm:138,root:38,scale:'harm',prog:[0,0,5,4],bass:'RRR.RRR.RRO.RRF.',lead:'1-2-3---5---3-2-7---5---6-5-4-3-',kick:'x..x..x...x..x..',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.xx',anv:'X..x..X..x..X.x.',chn:'x.x.x.x.x.x.x.x.',pad:1,lv:.027},
  win:{bpm:104,root:43,scale:'major',prog:[0,4,5,3],bass:'R...R.O.R...R.F.',lead:'5-3-5-8---7-8-9-8-------5-6-7---',kick:'x.......x.......',snare:'....x.......x...',hat:'..x...x...x...x.',anv:'X.......X.......',arp:'8',pad:1,lv:.03},
  over:{bpm:66,root:40,scale:'minor',prog:[0,5,3,4],bass:'R.......R.......',lead:'5-------4-------3-------2-------',kick:'x...............',snare:'................',hat:'................',pad:1,lv:.016}
};
const SFXT={};
function rl(k,ms){const t=performance.now();if(SFXT[k]&&t-SFXT[k]<ms)return false;SFXT[k]=t;return true;}
/* struck ice rings like glass: a few inharmonic sine partials with a fast decay */
function glass(t,f,vol,d){[[1,1],[2.32,.5],[4.25,.3],[6.8,.16]].forEach(([k,a])=>tone(f*k,t,d*(1.2-k*.1),'sine',vol*a,AU.sfx,0,0,.3,.001));}
const SFX={
  move(){tone(660,now(),.04,'square',.05);},
  confirm(){const t=now();anvil(t,76,.07);tone(990,t+.05,.12,'square',.05,0,0,0,.2);},
  back(){tone(440,now(),.08,'square',.05,0,330);},
  beep(){tone(880,now(),.12,'square',.07);},
  go(){const t=now();anvil(t,79,.1);anvil(t+.12,86,.08);},
  tick(){if(!rl('tk',40))return;tone(1500,now(),.02,'square',.03);},
  heartbeat(h){const t=now(),k=1+(100-h)/60;tone(62,t,.14,'sine',.2*k,0,40);tone(55,t+.17,.16,'sine',.15*k,0,36);if(h<35)noise(t,.06,.05,600,200,'lowpass');},
  bombDrop(){const t=now();tone(1200,t,.5,'sine',.05,0,380);},
  boom(){const t=now();noise(t,1.1,.7,2400,60,'lowpass',0,.5);tone(80,t,.5,'sine',.5,0,28);tone(46,t+.02,.7,'sine',.35,0,24);noise(t+.15,.8,.18,5000,1500,'bandpass',0,.3);},
  freeze(){const t=now();glass(t,1900,.06,.9);noise(t,.5,.15,7000,3000,'highpass');},
  shatter(k=1){if(!rl('sh',30))return;const t=now();glass(t,1300+Math.random()*900,.045*k,.5);noise(t,.18,.14*k,9000,2500,'highpass');noise(t+.03,.35,.12*k,3500,900,'bandpass',0,.2);},
  kill(c){const t=now(),f=[523,587,659,784,880,988,1175,1319][Math.min(7,c-1)];this.shatter(1);tone(f,t+.04,.16,'square',.035,0,0,2600,.25);},
  cast(){const t=now();tone(500,t,.5,'triangle',.04,0,1400,0,.3);noise(t,.5,.08,2000,6000,'bandpass',0,.3,3);},
  summon(){const t=now();[392,466,587].forEach((f,i)=>glass(t+i*.08,f*2,.03,.6));},
  roar(){const t=now();for(const f of [55,58.3,82.4]){tone(f,t,1.6,'sawtooth',.09,0,f*.7,700,.4,.2);}noise(t,1.6,.22,900,150,'lowpass',0,.4);},
  breath(){const t=now();noise(t,1.5,.2,1800,5000,'bandpass',0,.4,.7);},
  stomp(){const t=now();tone(48,t,.4,'sine',.45,0,26);noise(t,.5,.3,500,60,'lowpass');noise(t+.2,1.2,.07,8000,4000,'highpass',0,.3);},
  coreCrack(){if(!rl('cc',90))return;const t=now();glass(t,900+Math.random()*300,.05,.7);},
  bossDie(){const t=now();for(let i=0;i<10;i++)glass(t+i*.07,600+i*170,.04,1);noise(t,2.5,.4,3000,100,'lowpass',0,.6);tone(40,t,1.5,'sine',.4,0,20);},
  spawn(){if(!rl('sp',400))return;const t=now();noise(t,.9,.07,400,1400,'bandpass',0,.3,4);glass(t+.1,2400,.015,.4);},
  warn(){tone(1600,now(),.06,'square',.045);tone(1600,now()+.09,.06,'square',.04);},
  wave(){const t=now();anvil(t,64,.06);anvil(t+.25,64,.05);},
  splat(k){if(!rl('spl',55))return;noise(now(),.08,.06*k,900,200,'lowpass');},
  clear(){const t=now();[523,659,784,1047].forEach((f,i)=>{anvil(t+i*.11,72+i*4,.05);tone(f,t+i*.11,.3,'square',.04,0,0,2400,.3);});},
  lose(){const t=now();[523,466,392,311].forEach((f,i)=>tone(f,t+i*.2,.3,'triangle',.07,0,0,0,.3));glass(t,700,.05,1.6);},
  fed(){if(!rl('fd',600))return;const t=now();tone(110,t,.5,'sine',.08,0,220,0,.3);}
};
/* continuous layers — most of them are the simulation made audible: the count of cells that
   boiled, crusted or splashed this tick drives the hiss, the crackle and the splatter */
const AMB={on:false,hiss:0,crk:0,bub:0,bore:0};
function ambInit(){
  const c=AU.ctx;if(!c||AMB.on)return;AMB.on=true;
  const gain=v=>{const g2=c.createGain();g2.gain.value=v;return g2;},filt=(type,f,q)=>{const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1;return fl;};
  const nsrc=()=>{const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;s.start(0,Math.random());return s;},osc=(t,f)=>{const o=c.createOscillator();o.type=t;o.frequency.value=f;o.start();return o;};
  /* the pour: low noise through a resonant band, amplitude-modulated into glugs */
  AMB.pn=nsrc();AMB.pf=filt('bandpass',260,2.2);AMB.pg=gain(0);AMB.pm=gain(.5);AMB.plfo=osc('sine',7);const ld=gain(.5);AMB.plfo.connect(ld);ld.connect(AMB.pm.gain);
  AMB.pn.connect(AMB.pf);AMB.pf.connect(AMB.pm);AMB.pm.connect(AMB.pg);AMB.pg.connect(AU.sfx);
  /* furnace roar */
  AMB.fn=nsrc();AMB.ff=filt('lowpass',220,1);AMB.fg=gain(0);AMB.fn.connect(AMB.ff);AMB.ff.connect(AMB.fg);AMB.fg.connect(AU.sfx);AMB.fo=osc('sawtooth',46);const fo2=filt('lowpass',160,1);AMB.fo.connect(fo2);fo2.connect(AMB.fg);
  /* steam hiss */
  AMB.hn=nsrc();AMB.hf=filt('highpass',3400,.7);AMB.hg=gain(0);AMB.hn.connect(AMB.hf);AMB.hf.connect(AMB.hg);AMB.hg.connect(AU.sfx);const hr=gain(.3);AMB.hg.connect(hr);hr.connect(AU.rev);
  /* the cavern: a deep drone and moving air */
  AMB.d1=osc('sine',41);AMB.d2=osc('sine',41.6);AMB.dg=gain(0);AMB.d1.connect(AMB.dg);AMB.d2.connect(AMB.dg);AMB.dg.connect(AU.sfx);
  AMB.wn=nsrc();AMB.wf=filt('bandpass',500,.5);AMB.wg=gain(0);AMB.wn.connect(AMB.wf);AMB.wf.connect(AMB.wg);AMB.wg.connect(AU.sfx);
  /* borer drill */
  AMB.bo=osc('sawtooth',62);AMB.bf=filt('bandpass',180,3);AMB.bg=gain(0);AMB.bo.connect(AMB.bf);AMB.bf.connect(AMB.bg);AMB.bg.connect(AU.sfx);
}
function ambUpdate(){
  if(!AU.ctx)return;if(!AMB.on)ambInit();if(!AMB.on)return;
  const t=AU.ctx.currentTime,live=!S.paused&&!AU.muted,set=(p,v,k)=>p.setTargetAtTime(v,t,k||.06);
  set(AMB.pg.gain,live?CR.flow*.16:0);set(AMB.plfo.frequency,6+Math.sin(t*1.7)*1.5);set(AMB.pf.frequency,220+CR.flow*80+Math.sin(t*3)*30);
  set(AMB.fg.gain,live&&CR.refill?.09:0,.12);
  set(AMB.hg.gain,live?Math.min(.13,AMB.hiss*.004):0,.08);
  set(AMB.dg.gain,live?.045:0,.5);set(AMB.wg.gain,live?.012+(ST.amb<0?.02:0):0,.5);set(AMB.wf.frequency,400+Math.sin(t*.13)*200);
  set(AMB.bg.gain,live?Math.min(.05,AMB.bore*.01):0,.1);
}
/* per tick: turn simulation events into sound */
function sonify(){
  AMB.hiss+=((EV.boil*1.2+EV.quench*.06+EV.hiss*.8)-AMB.hiss)*.15;AMB.bore=(AMB.bore||0)*.9+(EV.bore||0);
  if(AU.ctx&&!AU.muted&&!S.paused){
    const c=AU.ctx,t0=c.currentTime;
    /* crusting lava crackles: a few tiny clicks scattered over the next frame */
    AMB.crk+=EV.solid*.05;let nc=0;while(AMB.crk>=1&&nc<3){AMB.crk-=1;nc++;noise(t0+Math.random()*.016,.004+Math.random()*.006,.05+Math.random()*.05,2000+Math.random()*5000,1500,'bandpass',0,0,4);}
    if(AMB.crk>4)AMB.crk=4;
    if(EV.land>6&&rl('land',70))SFX.splat(Math.min(1,EV.land/30));
    /* fat lava pools burp */
    if(LAVAC.n>120&&Math.random()<.02)tone(rnd(70,110),t0,.18,'sine',.06,0,45);
  }
  for(const k in EV)EV[k]=0;
}

/* =====================================================================================
   INPUT SNAPSHOT + ARCADE BRIDGE
   ===================================================================================== */
const MB={bomb:false};
cv.addEventListener('mousedown',e=>{if(e.button===2){MB.bomb=true;}});
let PTRMODE=false,PTRX=-1;
function readCtl(){
  const o={x:0,y:0,a:false,b:false,start:false,ok:false,back:false,pause:false,u:false,d:false,l:false,r:false,tx:null};
  if(K('ArrowLeft')||K('KeyA'))o.x-=1;if(K('ArrowRight')||K('KeyD'))o.x+=1;if(K('ArrowUp')||K('KeyW'))o.y-=1;if(K('ArrowDown')||K('KeyS'))o.y+=1;
  if(K('Space')||K('KeyJ')||K('KeyZ'))o.a=true;if(K('ShiftLeft')||K('ShiftRight')||K('KeyK')||K('KeyX'))o.b=true;
  if(TS.on&&(TS.x||TS.y)){o.x=TS.x;o.y=TS.y;}if(TS.A)o.a=true;if(TS.B)o.b=true;
  for(const p of pads()){
    const b=k=>!!(p.buttons[k]&&p.buttons[k].pressed),lx=p.axes[0]||0,ly=p.axes[1]||0;
    if(Math.abs(lx)>.15)o.x=lx;if(Math.abs(ly)>.5)o.y=ly;if(b(14))o.x=-1;if(b(15))o.x=1;if(b(12))o.y=-1;if(b(13))o.y=1;
    if(b(0)||b(7)||b(5))o.a=true;if(b(1)||b(2)||b(6)||b(4))o.b=true;if(b(9))o.start=true;if(b(0))o.ok=true;if(b(1))o.back=true;
  }
  o.x=clamp(o.x,-1,1);o.u=o.y<-.5;o.d=o.y>.5;o.l=o.x<-.5;o.r=o.x>.5;
  /* the pointer steers the crucible directly; any key or stick input hands control back */
  if(Math.abs(o.x)>.1)PTRMODE=false;
  if(PTR.on&&(PTR.down||Math.abs(PTR.x-PTRX)>.5)){PTRMODE=true;PTRX=PTR.x;}
  if(PTRMODE&&PTR.on)o.tx=clamp(PTR.x,0,W);
  o.pourP=PTR.down&&(PTR.y>GAL-2||!PTR.touch);
  if(MB.bomb){o.b=true;}
  o.ok=o.ok||K('Enter')||K('Space')||K('KeyJ')||TS.A;o.back=o.back||K('Escape')||K('Backspace');o.pause=K('Escape')||K('KeyP')||o.start;
  return o;
}
function endInputFrame(){LATCH.clear();PTR.pressed=false;PTR.released=false;MB.bomb=false;}
const ARC={muted:false,last:0,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:CAB.id},data||{}),'*');}catch(e){}},
  score(s){const t=performance.now();if(t-this.last>250){this.last=t;this.post('score',{score:s});}},
  over(score,tickets){this.post('over',{score,tickets:CAB.tickets?Math.max(0,Math.round(tickets||0)):0});},
  exit(){this.post('exit');}
};
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){audioInit();APP_start();}
  else if(m.cmd==='pause')setPause(true);
  else if(m.cmd==='resume')setPause(false);
  else if(m.cmd==='attract')APP_attract();
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
window.HYPERDOT_GAME={id:CAB.id,title:CAB.title,tickets:CAB.tickets,version:1};

/* =====================================================================================
   GAME STATE AND FLOW
     title (the logo is cast in molten iron) <-> demo (the autopilot defends a stage)
     intro (the heart ignites) -> play (waves) -> clear (tally) -> next intro ... -> ending
     play -> frozen (the heart goes cold) -> continue? -> over
   ===================================================================================== */
const S={mode:'title',t:0,clock:0,tick:0,score:0,hi:parseInt(store.get('hd-molten-hi','0'),10)||0,stage:0,demo:true,paused:false,menuI:0,pauseI:0,how:-1,
  msgs:[],big:null,pops:[],combo:0,comboT:0,stats:null,shake:0,flash:0,newHi:false,tickets:0,attractN:0,wt:0,wi:0,q:[],warn:[],tally:null,count:0,over:false,cont:0,clearT:0,titleN:0};
function newStats(){return {kills:0,steam:0,entomb:0,bomb:0,best:0,poured:0,fed:0};}
function stageSetup(i,demo){
  ST=STAGES[i];S.stage=i;S.demo=demo;
  genCave(ST);EN.length=0;BOMBS.length=0;LIGHTS.length=0;BOSS.on=false;BOSS.dead=false;heartReset();crReset(true);
  S.wt=0;S.wi=0;S.q=[];S.warn=[];S.stats=newStats();S.combo=0;S.comboT=0;S.msgs.length=0;S.big=null;S.pops.length=0;S.clearT=0;
  Object.assign(SU,{uTint:ST.tint,uBackA:ST.backA,uBackB:ST.backB,uCryst:ST.cryst,uIce:ST.ice});
  lavaCentroid();
}
function APP_attract(){S.mode='title';S.t=0;S.paused=false;S.how=-1;S.menuI=0;S.over=false;$('pauseBtn').textContent='Pause';titleSetup();setTrack('title');}
function startDemo(){stageSetup(S.attractN%4,true);S.attractN++;S.mode='demo';S.t=0;HEART.ign=1;setTrack(ST.tr);}
function APP_start(){S.score=0;S.cont=0;S.over=false;S.newHi=false;S.paused=false;$('pauseBtn').textContent='Pause';startStage(0);SFX.confirm();ARC.score(0);}
function startStage(i){stageSetup(i,false);S.mode='intro';S.t=0;setTrack(ST.tr);}
function setPause(on){if(S.mode!=='play'&&S.mode!=='intro')on=false;S.paused=on;S.pauseI=0;$('pauseBtn').textContent=on?'Resume':'Pause';}
/* ---------- scoring ---------- */
function addScore(n){S.score+=n;if(!S.demo)ARC.score(Math.floor(S.score));}
function flashMsg(text,col,dur){S.msgs.push({text,col:col||'#ffffff',t:0,dur:dur||1.1});if(S.msgs.length>3)S.msgs.shift();}
function bigMsg(text,col,sub){S.big={text,col,sub,t:0};}
function pop(x,y,text,col){S.pops.push({x,y,text,col,t:0});if(S.pops.length>10)S.pops.shift();}
const HOW_KILL={heart:['SEARED','#ffd040',1],steam:['STEAMED','#e8f4ff',1.5],entomb:['ENTOMBED','#ffb060',2],bomb:['BLASTED','#ff8040',1],lava:['SEARED','#ffd040',1],pool:['MELTED','#ff9a30',1],heat:['MELTED','#ff9a30',1]};
function onKill(e){
  if(S.demo&&S.mode!=='demo')return;
  S.combo=S.comboT>0?S.combo+1:1;S.comboT=1.8;const m=Math.min(8,S.combo),h=HOW_KILL[e.src]||HOW_KILL.heat,pts=Math.round(e.D.score*m*h[2]/10)*10;
  if(!S.demo){addScore(pts);S.stats.kills++;if(e.src==='steam')S.stats.steam++;if(e.src==='entomb')S.stats.entomb++;if(e.src==='bomb')S.stats.bomb++;S.stats.best=Math.max(S.stats.best,m);
    if(S.stats.kills%14===0&&CR.bombs<3){CR.bombs++;flashMsg('SLAG BOMB +1','#ff9a40',1);}}
  pop((e.x0+e.x1)/2,e.y0-3,(h[2]>1||e.src==='bomb'?h[0]+' ':'')+pts,m>3?'#ff5ad8':h[1]);
  if(m>1)flashMsg('MELT CHAIN x'+m,m>5?'#ff5ad8':m>3?'#ffd040':'#9fe8ff',.9);
  SFX.kill(m);
}
function onBossKilled(){if(S.demo)return;addScore(25000);pop(BOSS.x,BOSS.y-60,'25000','#ffffff');bigMsg('THE KING IS WATER','#9fe8ff','25000');S.stats.kills++;}
function finalize(){
  S.over=true;S.tickets=Math.round(S.score/2500);
  if(S.score>S.hi){S.hi=Math.floor(S.score);store.set('hd-molten-hi',S.hi);S.newHi=true;}else S.newHi=false;
  ARC.over(Math.floor(S.score),S.tickets);
}
function heartFroze(){S.mode='frozen';S.t=0;S.count=9.99;setTrack('over');SFX.lose();bigMsg('THE FORGE IS COLD','#bfefff');}
function gameOver(){finalize();S.mode='over';S.t=0;setTrack('over');}
function startTally(){
  const hb=Math.round(HEART.heat)*100,perfect=HEART.heat>=90?5000:0,cb=S.stats.best*500;
  S.tally={rows:[['FORGE HEAT',Math.round(HEART.heat)+'%',hb],['RIME MELTED',S.stats.kills+'',0],['BEST CHAIN','x'+S.stats.best,cb],['STEAMED  ENTOMBED',S.stats.steam+'  '+S.stats.entomb,0],['IRON POURED',fmt(CR.poured)+'',0],['FORGE AT FULL HEAT',perfect?'YES':'NO',perfect]],
    shown:0,pay:hb+cb+perfect,paid:0,t:0};
  S.mode='tally';S.t=0;setTrack('win');SFX.clear();
}
function nextStage(){
  if(S.stage>=STAGES.length-1){finalize();S.mode='ending';S.t=0;setTrack('win');return;}
  const keep=Math.min(100,HEART.heat+35);startStage(S.stage+1);HEART.heat=keep;
}
/* ---------- the wave director ---------- */
function waveStep(dt){
  S.wt+=dt;const wv=ST.waves;
  while(S.wi<wv.length&&wv[S.wi][0]<=S.wt){const [t,type,side,tun,count,gap]=wv[S.wi++];
    for(let k=0;k<count;k++){const sd=side||(k%2?1:-1);S.q.push({t:S.wt+1.6+k*gap,type,side:sd,tun});}
    S.warn.push({side:side||0,tun,t:0,type});if(type!=='KING')SFX.warn();}
  for(let k=S.q.length-1;k>=0;k--){const q=S.q[k];if(q.t<=S.wt){S.q.splice(k,1);spawnEnemy(q.type,q.side,q.tun);if(q.type!=='KING')SFX.spawn();}}
  for(const w of S.warn)w.t+=dt;S.warn=S.warn.filter(w=>w.t<2.4);
}
function stageDone(){return S.wi>=ST.waves.length&&S.q.length===0&&EN.length===0&&!BOSS.on;}
/* ---------- the autopilot: plays the demo and the soak tests ---------- */
const AP={pour:false,refill:false,hard:false};
function autopilot(){
  const o={tx:FURN_X,x:0,pour:false,bomb:false};
  const fallT=y=>Math.sqrt(2*Math.max(6,y-21)/GRAV);
  const aimFor=(x,y,vx)=>{const t=fallT(y);return x+vx*t;};
  let best=null,bs=-1e9;
  for(const e of EN){const cx=(e.x0+e.x1)/2,cy=(e.y0+e.y1)/2;
    let s=500-Math.abs(cx-HX)*1.2-Math.max(0,HEART.y0-e.y1)*.4+(e.t==='rime'?40:0)+(e.t==='caller'?150:0)+(e.latched?400:0);
    if(e.t==='wisp')s=cy<90?700-cy*2:120;if(e.inRock)s-=300;if(cx<10||cx>W-10)s-=250;
    /* only worth pouring on if the stream can reach it: no rock between the gallery and its head */
    if(e.t!=='wisp'){const x=Math.round(cx);let cov=0;for(let y=GAL;y<e.y0;y++){const m=M[y*W+x];if(m===ROCK||m===BED||m===CRYST)cov+=4;else if(KIND[m]===1||KIND[m]===2)cov+=.34;}if(cov>5){s-=500;e.covered=true;}else e.covered=false;}
    if(s>bs){bs=s;best=e;}}
  /* a covered Rimeback near the heart: blast the cap open */
  for(const e of EN)if(e.covered&&(e.t==='rime'||e.latched)&&Math.abs((e.x0+e.x1)/2-HX)<40&&CR.bombs>0){const tx=(e.x0+e.x1)/2;o.tx=tx;if(Math.abs(CR.x-tx)<3)o.bomb=true;AP.pour=false;return o;}
  if(bs<0)best=null;
  /* the King planted beside the heart drains it steadily: he outranks everything but a clinging Rimeback or a wisp at the ladle */
  const kingUrgent=BOSS.on&&BOSS.dying<=0&&BOSS.x<=BOSS.stopX+1&&!(best&&((best.latched&&best.t!=='shard')||(best.t==='wisp'&&best.yc<60)));
  if(BOSS.on&&(!best||bs<450||kingUrgent)){const tx=aimFor(BOSS.x,BOSS.y-40,BOSS.x>BOSS.stopX?-2:0);o.tx=tx;o.pour=Math.abs(CR.x-tx)<6&&CR.fill>6;
    if(CR.bombs>0&&Math.abs(CR.x-BOSS.x)<10&&BOSS.x<W-30)o.bomb=true;}
  else if(best){const cx=(best.x0+best.x1)/2,vx=best.D.fly?best.vx:best.latched?0:best.dir*best.D.sp;
    const tx=aimFor(cx,best.y0,vx);o.tx=tx;o.pour=Math.abs(CR.x-tx)<(AP.pour?7:4)&&CR.fill>6&&!best.inRock;
    if(best.t==='rime'&&CR.bombs>0&&Math.abs(CR.x-(cx+vx*fallT(best.y0)))<3&&!best.inRock)o.bomb=true;}
  else{o.tx=FURN_X;if(HEART.heat<80&&CR.fill>300&&Math.abs(CR.x-FURN_X)<8){o.tx=FURN_X+14;o.pour=Math.abs(CR.x-o.tx)<4;}}
  if(CR.fill<45)AP.refill=true;if(CR.fill>CR.cap*.7)AP.refill=false;if(CR.fill<25)AP.hard=true;if(CR.fill>CR.cap*.45)AP.hard=false;
  if((AP.refill&&!(best&&(best.latched||best.t==='wisp'&&best.yc<60)))||AP.hard){o.pour=false;o.tx=FURN_X;}
  o.tx+=Math.sin(S.clock*.7)*1.5;AP.pour=o.pour;
  return o;
}
/* ---------- one 60 Hz tick of the world ---------- */
const PERF={sim:0,n:0};
function worldStep(dt,ctl,live){
  S.clock+=dt;S.tick++;if(S.shake>0)S.shake=Math.max(0,S.shake-dt*2.2);if(S.flash>0)S.flash=Math.max(0,S.flash-dt*2.5);
  if(S.comboT>0){S.comboT-=dt;if(S.comboT<=0)S.combo=0;}
  for(const m of S.msgs)m.t+=dt;S.msgs=S.msgs.filter(m=>m.t<m.dur);if(S.big){S.big.t+=dt;if(S.big.t>2.8)S.big=null;}
  for(const p of S.pops)p.t+=dt;S.pops=S.pops.filter(p=>p.t<1.1);
  for(const l of LIGHTS)l.t+=dt;for(let k=LIGHTS.length-1;k>=0;k--)if(LIGHTS[k].t>LIGHTS[k].dur)LIGHTS.splice(k,1);
  const t0=performance.now();
  simMove();simMove();const t1=performance.now();simHeat();const t2=performance.now();
  crStep(dt,ctl||{x:0,pour:false},live);if(ctl&&ctl.bomb&&live)dropBomb();
  stepParticles(dt);bombStep(dt);const t3=performance.now();
  enemyStep(dt,live);bossStep(dt,live);heartStep(dt,live);const t4=performance.now();
  PERF.mv=(PERF.mv||0)*.95+(t1-t0)*.05;PERF.ht=(PERF.ht||0)*.95+(t2-t1)*.05;PERF.pt=(PERF.pt||0)*.95+(t3-t2)*.05;PERF.en=(PERF.en||0)*.95+(t4-t3)*.05;
  if(S.tick%20===0)lavaCentroid();
  if(S.mode==='title')titleStep(dt);
  PERF.sim+=(performance.now()-t0-PERF.sim)*.05;PERF.n++;
  sonify();
}
