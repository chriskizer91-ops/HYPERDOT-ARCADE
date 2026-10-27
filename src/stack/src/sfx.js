/* sound effects: a lamp board is a box of relays, so most sounds are mechanical. Rate-limited below. */
const SFX={
  select(){tone(990,now(),.05,'square',.04);},
  confirm(){const t=now();tone(880,t,.06,'square',.05);tone(1320,t+.06,.18,'square',.05,AU.sfx,0,0,.2);},
  back(){const t=now();tone(660,t,.06,'square',.045);tone(440,t+.06,.1,'square',.045);},
  /* a relay closing: bright contact click, a softer second click a few ms later (contact bounce) and the armature's low thock */
  relay(v=1){const t=now();noise(t,.010,.11*v,6200,2400,'bandpass',0,.03,2.4);noise(t+.006+Math.random()*.004,.006,.05*v,5200,2000,'bandpass',0,0,2.4);tone(150*rnd(.92,1.08),t,.035,'sine',.07*v,AU.sfx,60);},
  /* the marquee flasher: a tiny cam-switch tick */
  chase(){noise(now(),.006,.026,7200,3200,'bandpass',0,0,3);},
  /* the moving row steps: a sharper relay tick that climbs in pitch with the row */
  step(r=1){const t=now();noise(t,.008,.085,4300+r*130,1900,'bandpass',0,0,2.2);tone(1050+r*45,t,.012,'square',.016,AU.sfx,0,2600);},
  /* the STOP: a heavy contactor slamming shut */
  clunk(){const t=now();noise(t,.045,.3,2600,180,'lowpass',0,.08);tone(92,t,.17,'sine',.32,AU.sfx,36);noise(t+.009,.01,.12,5200,2100,'bandpass',0,0,2);},
  /* a row lands: a note that climbs the scale with height, so the tower plays a rising tune */
  land(r=1){const t=now(),n=mtof(57+sdeg(TRACKS.play,r-1));tone(n,t,.16,'square',.05,AU.sfx,0,2800,.2);tone(n*2,t+.03,.24,'triangle',.04,AU.sfx,0,0,.25);},
  perfect(){const t=now();for(const [f,v,dd] of [[1568,.06,1.1],[1568*2.76,.022,.55],[1568*5.4,.01,.3],[2093,.035,.9]])tone(f,t,dd,'sine',v,AU.sfx,0,0,.35);},
  /* overhanging lamps let go */
  fall(){const t=now();tone(760,t,.44,'triangle',.05,AU.sfx,140);noise(t,.3,.03,3200,600,'bandpass',0,.12,4);},
  /* a falling lamp hits the stack and the glass goes */
  tink(){const t=now();tone(rnd(3000,3800),t,.07,'sine',.045,AU.sfx,0,0,.2);tone(rnd(5200,6100),t,.04,'sine',.02);noise(t,.03,.045,9000,5000,'highpass');},
  /* the arcade loser buzzer: two detuned saws beating at 6 Hz into a hard low-pass */
  buzz(){const t=now();tone(98,t,.85,'sawtooth',.13,AU.sfx,92,1100);tone(104,t,.85,'sawtooth',.12,AU.sfx,97,1100);tone(49,t,.85,'square',.05,AU.sfx,0,400);},
  /* an alarm bell: a struck-bar partial set re-struck at 20 Hz */
  bell(dur=1){const t=now();for(let k=0;k*.05<dur;k++){const tt=t+k*.05,a=.035*(1-k*.05/dur*.6);tone(2480,tt,.09,'triangle',a,AU.sfx,0,0,.15);tone(2480*2.32,tt,.05,'sine',a*.4);}},
  fanfare(){const t=now();[0,4,7,12,7,12,16].forEach((n,i)=>tone(mtof(67+n),t+i*.085,.26,'square',.045,AU.sfx,0,3200,.3));},
  siren(){const t=now();for(let k=0;k<3;k++){tone(520,t+k*.5,.25,'sine',.06,AU.sfx,1150);tone(1150,t+k*.5+.25,.25,'sine',.06,AU.sfx,520);}},
  tock(hi){tone(hi?1500:1060,now(),.03,'square',.035,AU.sfx,0,2600);},
  /* collect: the coin-door bell plus a register ka-ching */
  take(){const t=now();noise(t,.06,.12,6000,1500,'bandpass',0,.1,1.5);[0,7,12,19].forEach((n,i)=>tone(mtof(76+n),t+.05+i*.06,.5,'sine',.05,AU.sfx,0,0,.35));},
  /* the ticket dispenser: a feed click and a soft motor tick per ticket */
  ticket(){const t=now();noise(t,.014,.07,3400,1600,'bandpass',0,0,2);tone(820,t,.015,'square',.016,AU.sfx,0,1800);},
  /* a whole board's worth of filaments switching on at once: the transformer groans */
  thunk(){const t=now();tone(55,t,.55,'sine',.3,AU.sfx,40);noise(t,.09,.2,1200,100,'lowpass',0,.15);},
  whoosh(){noise(now(),.5,.05,500,5200,'bandpass',0,.2,1.6);},
  boom(k=1){const t=now();noise(t,.3*k+.15,.3,2400,60,'lowpass',0,.3);tone(90,t,.28*k,'sine',.35,AU.sfx,28);},
  crackle(){const t=now();for(let i=0;i<7;i++)noise(t+.05+i*.035+Math.random()*.02,.012,.05,8000,4000,'highpass');},
  win(){const t=now();[0,4,7,12,16].forEach((n,i)=>tone(mtof(72+n),t+i*.09,.32,'square',.05,AU.sfx,0,0,.3));},
  lose(){const t=now();[12,7,3,0].forEach((n,i)=>tone(mtof(60+n),t+i*.22,.4,'sawtooth',.05,AU.sfx,0,1500,.3));}
};
{const lim={step:.012,chase:.035,relay:.022,ticket:.03,tink:.035,tock:.1,boom:.08,fall:.05};const last={};for(const k of Object.keys(SFX)){const f=SFX[k],m=lim[k]||.02;SFX[k]=(...a)=>{const t=now();if(t-(last[k]||-9)<m)return;last[k]=t;f(...a);};}}
