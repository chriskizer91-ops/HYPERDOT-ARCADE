/* =====================================================================================
   3. SOUND — all synthesized. A real table is mostly three sounds: the blower's hum and
      hiss under everything, the hard plastic clack of mallet on puck, and the puck's tack
      off the rails. Then the drop into the goal and the rattle down the return chute.
   ===================================================================================== */
const SFX={
  select(){tone(990,now(),.05,'square',.045);},
  confirm(){const t=now();tone(880,t,.06,'square',.06);tone(1320,t+.06,.18,'square',.06,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.05);tone(440,t+.06,.1,'square',.05);},
  /* mallet on puck: a hard, hollow plastic clack; a hard hit adds a body thump */
  clack(k){const t=now(),v=clamp(k,.08,1);
    noise(t,.025+.03*v,.1+.32*v,rnd(2600,3600),1400,'bandpass',0,.06+.1*v,1.8);
    tone(rnd(1500,1900),t,.035,'triangle',.05+.1*v,AU.sfx,rnd(900,1100));
    if(v>.35)tone(rnd(190,230),t,.06,'sine',.12*v,AU.sfx,110);},
  /* puck off the rail: a short tack with a little ring in the aluminium */
  rail(k){const t=now(),v=clamp(k,.06,1);
    noise(t,.02+.02*v,.06+.2*v,rnd(3800,4800),2000,'bandpass',0,.08,2.2);
    tone(rnd(2650,2850),t,.09+.08*v,'sine',.018+.035*v,AU.sfx,0,0,.1);tone(rnd(4050,4250),t,.06,'sine',.01+.02*v);
    if(v>.5)tone(150,t,.05,'sine',.07*v,AU.sfx,90);},
  post(k){const t=now(),v=clamp(k,.1,1);noise(t,.03,.12+.2*v,5200,2400,'bandpass',0,.1,3);tone(3300,t,.18,'sine',.04*v,AU.sfx,0,0,.2);tone(5100,t,.12,'sine',.02*v);},
  puck(k){const t=now(),v=clamp(k,.1,1);noise(t,.02,.08+.18*v,4200,2200,'bandpass',0,.05,2);tone(2400,t,.03,'triangle',.05*v,AU.sfx,1600);},
  /* the goal: the puck drops into the slot with a thunk and rattles down the chute */
  drop(){const t=now();tone(150,t,.12,'sine',.22,AU.sfx,62);noise(t,.08,.18,900,180,'lowpass',0,.2);
    let d=.09;for(let i=0;i<6;i++){noise(t+d,.018,.07*(1-i/7),rnd(2200,3000),1200,'bandpass',0,.05,2);tone(rnd(700,900),t+d,.025,'triangle',.03*(1-i/7));d+=.11-i*.012;}},
  /* the scoreboard's horn: bright for your goal, a low one when you're scored on */
  hornWin(){const t=now();for(const f of [523.25,659.25,783.99]){tone(f,t+.12,.55,'sawtooth',.045,AU.sfx,0,3400,.35,.01);}
    [0,4,7,12].forEach((n,i)=>tone(mtof(72+n),t+.12+i*.07,.14,'square',.04,AU.sfx,0,0,.2));},
  hornLose(){const t=now();tone(196,t+.1,.5,'sawtooth',.06,AU.sfx,147,900,.25);tone(98,t+.1,.5,'square',.035,AU.sfx,73,500);},
  serve(){const t=now();tone(240,t,.05,'sine',.12,AU.sfx,140);noise(t,.03,.06,1800,700,'bandpass');},
  beep(hi){tone(hi?1320:880,now(),hi?.28:.12,'square',.05,AU.sfx,0,0,.15);},
  whoosh(){noise(now(),.5,.06,300,2400,'bandpass',0,.2,1);},
  frenzy(){const t=now();for(let i=0;i<6;i++)tone(mtof(76+(i%2?7:0)),t+i*.07,.08,'square',.04,AU.sfx,0,2600);tone(mtof(88),t+.45,.4,'square',.035,AU.sfx,0,0,.4);},
  ticket(){const t=now();for(let i=0;i<3;i++)tone(1600+i*200,t+i*.05,.05,'square',.03);},
  win(){const t=now();[0,4,7,12,16,19,24].forEach((n,i)=>tone(mtof(67+n),t+i*.08,.3,'square',.045,AU.sfx,0,3200,.35));tone(mtof(91),t+.6,.7,'square',.04,AU.sfx,0,0,.5);},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};
{const lim={clack:.03,rail:.03,post:.05,puck:.04,drop:.3,ticket:.04};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}

/* the blower: looped noise through a lowpass (the rush of air), a thin hiss from the holes, and the motor's hum.
   It spins up when a match starts and winds down at the end. The puck's own glide adds a faint hiss. */
const AIRV={on:false,g:null};
function airInit(){
  if(AIRV.g||!AU.ctx)return;const c=AU.ctx;try{
    const mk=(type,f,q)=>{const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;s.playbackRate.value=.97+Math.random()*.06;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(AU.sfx);s.start();return {fl,g};};
    const rush=mk('lowpass',380,.7),hiss=mk('bandpass',6200,.8),glide=mk('highpass',5200,.6);
    const o=c.createOscillator();o.type='triangle';o.frequency.value=118;const og=c.createGain();og.gain.value=0;o.connect(og);og.connect(AU.sfx);o.start();
    Object.assign(AIRV,{g:1,rush,hiss,glide,o,og});}catch(e){}
}
let AIRL=0;
function airTick(dt,want,glide){
  airInit();if(!AIRV.g)return;
  AIRL+=((want?1:0)-AIRL)*Math.min(1,dt*(want?1.4:.9));
  const t=now(),m=AU.muted||ARC.muted?0:1,l=AIRL;
  AIRV.rush.g.gain.setTargetAtTime(m*.07*l,t,.05);AIRV.rush.fl.frequency.setTargetAtTime(160+260*l,t,.08);
  AIRV.hiss.g.gain.setTargetAtTime(m*.012*l*l,t,.05);
  AIRV.og.gain.setTargetAtTime(m*.011*l,t,.05);AIRV.o.frequency.setTargetAtTime(48+70*l,t,.1);
  AIRV.glide.g.gain.setTargetAtTime(m*clamp(glide,0,1)*.028*l,t,.03);
}

const LEADCH='123456789abcdefg';
const TRACKS={
  /* the attract loop: neon synth over a four-on-the-floor */
  title:{bpm:122,root:45,scale:'minor',prog:[0,5,3,4],bass:'R.RO.R.RR.RO.FO.',lead:'5.5.4.3-1---3.4.5.7.8-7.5-4-3---',kick:'x...x...x...x...',snare:'....x.......x...',hat:'.x.x.x.x.x.x.x.x',arp:'16',pad:1,lv:.026},
  /* during a match: a low, steady groove so the clacks carry */
  play:{bpm:104,root:43,scale:'dorian',prog:[0,0,3,4],bass:'R...R..OR...R.F.',lead:'',kick:'x.....x.x.......',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.x.',pad:1,lv:0},
  /* match point: the same key, more drive */
  tense:{bpm:118,root:43,scale:'dorian',prog:[0,3,4,5],bass:'R.RO.RR.R.RO.RF.',lead:'',kick:'x...x...x...x...',snare:'....x.......x..x',hat:'xxx.xxx.xxx.xxx.',arp:'8',pad:1,lv:0},
  over:{bpm:86,root:45,scale:'major',prog:[0,5,3,4],bass:'R.......R...O...',lead:'3---5---4-3-2---1-------........',kick:'x.......x.......',snare:'........x.......',hat:'..x...x...x...x.',pad:1,lv:.028}
};
function musicLevel(play){if(AU.mus&&AU.ctx)AU.mus.gain.setTargetAtTime(play?.13:.26,now(),.4);}
